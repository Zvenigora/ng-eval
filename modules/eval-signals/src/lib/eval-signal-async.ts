import { DestroyRef, PendingTasks, Signal, computed, inject, signal, untracked } from '@angular/core';
import { CompilerService, EvalContext, EvalState, call, callAsync, compile,
  createDependencyTracker, defaultParserOptions, parse } from '@zvenigora/ng-eval-core';
import type { stateCallbackAsync } from '@zvenigora/ng-eval-core';
import { EvalSignal, EvalSignalOptions } from './eval-signal';
import { SignalContextSource, SignalContextWriteError, createSignalContext } from './signal-context';
import { match } from './source-key';
import { assertTrackingCompatible, respellRoots } from './track-dependencies';

/**
 * Where an {@link EvalSignalAsync} is: a subset of the strings Angular's
 * `ResourceStatus` has used since 20, meaning what they mean there. Declared
 * here rather than imported - at 19 that type is an `enum`, and it is
 * experimental until 22.
 *
 * - `'loading'`: a run is pending; the value reads `undefined`.
 * - `'resolved'`: the current run resolved; the value is its result.
 * - `'error'`: the current run rejected; the value is per `onError`.
 * - `'idle'`: destroyed; the value reads `undefined` for good.
 *
 * There is no `'reloading'`: a new run discards the previous outcome.
 */
export type EvalSignalStatus = 'idle' | 'loading' | 'resolved' | 'error';

/**
 * An {@link EvalSignal} whose value is the resolved result of the latest run.
 */
export interface EvalSignalAsync<T> extends EvalSignal<T> {

  /**
   * Where the current run is - see {@link EvalSignalStatus}. Reading it starts
   * a run, as reading the value does: both are views of one run.
   */
  readonly status: Signal<EvalSignalStatus>;
}

/**
 * {@link EvalSignalOptions}, and what only an async run has.
 */
export interface EvalSignalAsyncOptions extends EvalSignalOptions {

  /**
   * The name under which each run's `AbortSignal` is visible to its walk.
   * Unset by default, and then no run has one.
   *
   * Every run gets an `AbortController` of its own, aborted when a newer run
   * supersedes it - at the first read after a change - and on `destroy()`;
   * settling does not abort it. The expression passes the signal on:
   * `load(id, abort)`. Only the walk sees the name: a closure the promise
   * calls later resolves it like any other.
   *
   * The binding is a scope pushed for the walk, first in the context's
   * resolution order, so it shadows a source key of the same name. A record
   * source holding one - matched as the signal context matches keys, by case
   * only under `caseInsensitive` - is refused at construction, and so is a
   * name no expression could read. A caller-built `EvalContext` cannot be
   * checked, so keeping the name free there is the caller's job. The name is
   * never reported in `dependencies`.
   */
  abortSignalKey?: string;
}

/** How a run settled. */
type Outcome =
  | { readonly resolved: true; readonly value: unknown }
  | { readonly resolved: false; readonly error: unknown };

/**
 * One evaluation, from the walk to its settlement.
 *
 * The outcome lives here, on its own run, and the signal reaches a run only
 * while it is current - so a superseded run, and the value it resolved to,
 * is held by nothing the signal keeps (Phase 5 S 3.4). A shared slot holding the
 * last outcome, even one tagged with its run, would hold the last settled
 * run's value past its supersede, until the next run settled.
 */
interface Run {
  outcome?: Outcome;

  /** Aborted when the run is superseded or the signal destroyed. */
  controller?: AbortController;

  /**
   * Holds the application unstable until the run settles, is superseded or
   * the signal is destroyed, whichever comes first.
   */
  release?: () => void;
}

/**
 * Refuses an `abortSignalKey` no expression could read (Phase 5 S 3.6), by
 * asking `eval-core` rather than keeping a list here.
 *
 * The key must parse, as the evaluator parses, to one identifier of exactly
 * that name - which refuses a character an identifier cannot hold, and a
 * reserved word. Then it is evaluated once with the key pushed as a scope, as
 * a run pushes it, and must find what was pushed: a name the identifier guard
 * refuses throws there. The state is built from `caseInsensitive` alone, the
 * one option the guard reads, so a consumer's hooks never see a walk that
 * never happened.
 */
const assertReadableKey = (key: string, caseInsensitive: boolean): void => {

  const refuse = (reason: string): Error => new Error(
    `Cannot bind the run's AbortSignal under 'abortSignalKey' "${key}": ${reason}`
  );

  let program: ReturnType<typeof parse>;

  try {
    program = parse(key, defaultParserOptions);
  } catch {
    throw refuse('it is not an identifier, so no expression could name it.');
  }

  const statement = program?.type === 'Program' && program.body.length === 1
    ? program.body[0]
    : undefined;

  if (statement?.type !== 'ExpressionStatement'
    || statement.expression.type !== 'Identifier'
    || statement.expression.name !== key) {
    throw refuse('it is not an identifier, so no expression could name it.');
  }

  const sentinel = {};
  const options = { caseInsensitive };
  const context = new EvalContext({}, options);
  context.push({ [key]: sentinel });

  let found: unknown;

  try {
    found = call(compile(program), EvalState.fromContext(context, options));
  } catch (error) {
    throw refuse(`the evaluator refuses to read it (${error instanceof Error ? error.message : String(error)}).`);
  }

  if (found !== sentinel) {
    throw refuse('an expression naming it would not read the binding.');
  }
};

/**
 * Creates a `Signal` whose value is `expression` evaluated over `source` and
 * resolved, as `evaluateAsync` resolves it.
 *
 * ```ts
 * const user = createEvalSignalAsync('loadUser(id)', { id, loadUser });
 *
 * user();         // undefined, while the run is pending
 * user.status();  // 'loading', then 'resolved' or 'error'
 * ```
 *
 * The walk runs inside a `computed()` and finishes before `evaluateAsync`
 * returns its promise, so every read it makes is tracked per key, exactly as
 * {@link createEvalSignal} tracks it. A read made after resolution - inside a
 * `.then` the expression set up - is not.
 *
 * **A run starts at the first read after a change**, not at the change: a
 * changed key marks the run stale, and reading `value` or `status` starts the
 * next one. Until a run settles the signal reads `undefined` and `'loading'`,
 * even for an expression with no promise in it, which settles a microtask
 * later. A run that has been superseded settles into nothing: its value, or
 * its rejection, is discarded.
 *
 * A rejection reaches `onError` with its existing contract: `'throw'`
 * rethrows it on every read until a new run starts, `'undefined'` reads
 * `undefined`, and a mapper is called once per rejected run. A failure of the
 * walk itself rejects the run like any other, so it surfaces at settlement
 * too. {@link SignalContextWriteError} bypasses `onError` in every mode, as on
 * the sync path.
 *
 * **Each run holds the application unstable** through `PendingTasks` until it
 * settles, is superseded or the signal is destroyed, so `whenStable()` - and
 * server rendering - waits for the value. A superseded run that never settles
 * holds nothing. With `abortSignalKey` set, each run also has an `AbortSignal`
 * of its own - see {@link EvalSignalAsyncOptions.abortSignalKey}.
 *
 * Everything else - one compile, a fresh `EvalState` per run on one shared
 * `EvalContext`, `trackDependencies`, `invalidate()`, `destroy()` and its
 * lifetime rule - is {@link createEvalSignal}'s, and documented there.
 * `dependencies` reports the last run *started*, whose reads are complete
 * when it starts.
 *
 * @param expression - A JavaScript expression.
 * @param source - A record whose values may be signals, or a pre-built
 *                 `EvalContext` the caller owns.
 * @param options - See {@link EvalSignalAsyncOptions}.
 * @returns A `Signal` carrying the latest run's resolved value, and its
 *          `status`.
 */
export function createEvalSignalAsync(
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalAsyncOptions
): EvalSignalAsync<unknown> {

  let compiler: CompilerService;
  let pendingTasks: PendingTasks;

  // The same fork as `createEvalSignal`, for its reasons: lifetime comes from
  // the ambient injection context and never from `options.injector`.
  // `PendingTasks` is resolved beside `CompilerService` (Phase 5 S 3.2), so a
  // signal made through `EvalSignalService` holds the application's own
  // stability.
  let destroyRef: DestroyRef | null = null;

  if (options?.injector) {
    compiler = options.injector.get(CompilerService);
    pendingTasks = options.injector.get(PendingTasks);
  } else {
    compiler = inject(CompilerService);
    pendingTasks = inject(PendingTasks);
    destroyRef = inject(DestroyRef, { optional: true });
  }

  const evalOptions = options?.eval;
  const onError = options?.onError ?? 'throw';
  const trackDependencies = options?.trackDependencies ?? false;
  const abortSignalKey = options?.abortSignalKey;

  assertTrackingCompatible(trackDependencies, evalOptions);

  if (abortSignalKey !== undefined) {
    assertReadableKey(abortSignalKey, !!evalOptions?.['caseInsensitive']);

    // By the signal context's own rule, on keys alone: `getKey` would read an
    // `undefined` value as no key at all, and the binding shadows the key
    // whatever it holds.
    const held = source instanceof EvalContext
      ? undefined
      : match(source, abortSignalKey, !!evalOptions?.['caseInsensitive']);

    if (held !== undefined) {
      throw new Error(
        `Cannot bind the run's AbortSignal under 'abortSignalKey' "${abortSignalKey}": `
        + `the source already has a key "${held}", which the binding would shadow in every run.`
      );
    }
  }

  let context: EvalContext | undefined = source instanceof EvalContext
    ? source
    : createSignalContext(source, evalOptions);

  const caseInsensitive = !!evalOptions?.['caseInsensitive']
    || !!context.options['caseInsensitive'];

  let compiled: stateCallbackAsync | undefined = compiler.compileAsync(expression);
  let dependencies: ReadonlySet<string> = new Set<string>();

  const version = signal(0);

  // Bumped by the settle handler of the current run, and by nothing else. The
  // outcome itself is on the run; this only tells `value` and `status` to
  // look again.
  const settled = signal(0);

  // The run the settle handler compares against: `run`'s latest value, kept
  // here because the handler fires outside any reactive context and must not
  // read `run` - that would start a run.
  let current: Run | undefined;
  let destroyed = false;

  /**
   * Releases a run's pending task and, on a supersede or `destroy()`, aborts
   * its controller. Settlement releases without aborting. Whichever of the
   * three comes first releases, and a later call finds no task to release; a
   * supersede or `destroy()` drops the controller too, so a superseded run
   * keeps neither alive.
   *
   * Untracked, because a supersede happens inside `run`: `abort()` calls the
   * consumer's listeners synchronously, and inside the `computed` a signal one
   * read would become a dependency of the walk, and a write would throw.
   */
  const retire = (of: Run, abort: boolean): void => {
    const { controller, release } = of;

    of.release = undefined;
    if (abort) {
      of.controller = undefined;
    }

    untracked(() => {
      release?.();
      if (abort) {
        controller?.abort();
      }
    });
  };

  const settle = (of: Run, outcome: Outcome): void => {
    // A superseded run, or any run after `destroy()`, writes nothing - so a
    // late settlement neither changes the value nor recomputes it.
    if (!destroyed && of === current) {
      of.outcome = outcome;
      settled.update((count) => count + 1);
    }

    retire(of, false);
  };

  const start = (): Run | undefined => {
    if (!compiled || !context) {
      return undefined;
    }

    const fn = compiled;
    const ctx = context;
    const state = compiler.createState(ctx, evalOptions);
    const controller = abortSignalKey === undefined ? undefined : new AbortController();

    // The supersede, before the walk (Phase 5 S 3.4): this read started a new
    // run, so the one it replaces is aborted, and released if it has not
    // settled. First, so that a listener that writes an input this walk reads
    // is seen by it - Angular's `resource()` aborts before it loads, too. The
    // new run's task is added before the old one's is released, so the count
    // never touches zero between the two and lets the application stabilise.
    const started: Run = { controller, release: untracked(() => pendingTasks.add()) };
    const previous = current;
    current = started;

    // Restored in the `finally` below, around the synchronous call: the walk
    // ends before the promise is returned, so the depth is already back when
    // `callAsync` returns - and restoring at settlement instead would let a
    // run started before an earlier one settles walk on its leak (Phase 5
    // S 3.5).
    // Retained for `createEvalSignal`'s reason: `EvalContext.push` and `pop`
    // are public. Taken before the old run is retired, so the restore also
    // pops anything one of its abort listeners pushed.
    const depth = ctx.scopes.length;
    let promise: Promise<unknown>;

    try {
      if (previous) {
        retire(previous, true);
      }

      // After the depth snapshot, so the loop below pops it with anything a
      // consumer function stranded, and a closure the promise calls later no
      // longer sees it (Phase 5 S 3.6).
      if (controller && abortSignalKey !== undefined) {
        ctx.push({ [abortSignalKey]: controller.signal });
      }

      if (!trackDependencies) {
        promise = callAsync(fn, state);
      } else {
        const tracker = createDependencyTracker();
        const off = tracker.install(state.hooks);

        try {
          promise = callAsync(fn, state);
        } finally {
          // At the start of the run, not at its settlement: its reads are
          // complete here, and a read a `.then` makes later is one Angular
          // does not track either.
          off();
          dependencies = caseInsensitive
            ? respellRoots(tracker.dependencies, tracker.reads)
            : tracker.dependencies;
        }
      }
    } finally {
      while (ctx.scopes.length > depth) {
        ctx.pop();
      }
    }

    // On every run, superseded or not, so no rejection goes unhandled. A walk
    // that threw arrives here too: `evaluateAsync` rejects with it.
    promise.then(
      (value) => settle(started, { resolved: true, value }),
      (error) => settle(started, { resolved: false, error })
    );

    return started;
  };

  // The walk, tracked. No signal is written here: `settled` is written by the
  // handler a microtask later, outside any reactive context.
  const run = computed((): Run | undefined => {
    version();
    return start();
  });

  const read = (): unknown => {
    // `settled` before `run`, unconditionally, as `version` is read in
    // `createEvalSignal`.
    settled();

    const outcome = run()?.outcome;

    if (!outcome) {
      return undefined;
    }

    if (outcome.resolved) {
      return outcome.value;
    }

    const error = outcome.error;

    if (error instanceof SignalContextWriteError) {
      throw new SignalContextWriteError(error.key, expression, error, error.kind);
    }
    if (onError === 'undefined') {
      return undefined;
    }
    if (typeof onError === 'function') {
      return onError(error);
    }
    throw error;
  };

  const value = options?.equal
    ? computed(read, { equal: options.equal })
    : computed(read);

  const status = computed((): EvalSignalStatus => {
    settled();

    const latest = run();

    if (!latest) {
      return 'idle';
    }
    if (!latest.outcome) {
      return 'loading';
    }
    return latest.outcome.resolved ? 'resolved' : 'error';
  });

  let unregisterDestroy: (() => void) | undefined;

  const invalidate = (): void => {
    if (destroyed) {
      return;
    }

    version.update((count) => count + 1);
  };

  const destroy = (): void => {
    if (destroyed) {
      return;
    }

    destroyed = true;

    // The current run is aborted whether or not it has settled, and released
    // if it has not (Phase 5 S 3.4) - between a depth snapshot and a restore,
    // as `start()` retires a run, so a scope one of its abort listeners pushed
    // on the context is popped (Phase 5 S 3.5).
    const last = current;
    const ctx = context;
    const depth = ctx?.scopes.length ?? 0;

    compiled = undefined;
    context = undefined;
    current = undefined;
    dependencies = new Set<string>();

    try {
      if (last) {
        retire(last, true);
      }
    } finally {
      while (ctx && ctx.scopes.length > depth) {
        ctx.pop();
      }
    }

    // As in `createEvalSignal`: makes `run` stale, so the next read finds no
    // run and reads `undefined` / `'idle'` from now on.
    version.update((count) => count + 1);

    // And recomputes it here, rather than at a read that may never come: a
    // `computed` holds its last value until it recomputes, so `run` would keep
    // the current run - and what it resolved to - for the life of a signal
    // nothing reads again. `start()` finds `compiled` cleared and walks
    // nothing.
    untracked(run);

    unregisterDestroy?.();
    unregisterDestroy = undefined;
  };

  unregisterDestroy = destroyRef?.onDestroy(() => {
    unregisterDestroy = undefined;
    destroy();
  });

  const evalSignal = Object.assign(value, { invalidate, destroy, status }) as EvalSignalAsync<unknown>;

  Object.defineProperty(evalSignal, 'dependencies', {
    get: () => dependencies,
    enumerable: true,
    configurable: true,
  });

  return evalSignal;
}
