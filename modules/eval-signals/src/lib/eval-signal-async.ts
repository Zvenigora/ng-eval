import { DestroyRef, Signal, computed, inject, signal, untracked } from '@angular/core';
import { CompilerService, EvalContext, callAsync, createDependencyTracker } from '@zvenigora/ng-eval-core';
import type { stateCallbackAsync } from '@zvenigora/ng-eval-core';
import { EvalSignal, EvalSignalOptions } from './eval-signal';
import { SignalContextSource, SignalContextWriteError, createSignalContext } from './signal-context';
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
}

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
 * Everything else - one compile, a fresh `EvalState` per run on one shared
 * `EvalContext`, `trackDependencies`, `invalidate()`, `destroy()` and its
 * lifetime rule - is {@link createEvalSignal}'s, and documented there.
 * `dependencies` reports the last run *started*, whose reads are complete
 * when it starts.
 *
 * @param expression - A JavaScript expression.
 * @param source - A record whose values may be signals, or a pre-built
 *                 `EvalContext` the caller owns.
 * @param options - See {@link EvalSignalOptions}.
 * @returns A `Signal` carrying the latest run's resolved value, and its
 *          `status`.
 */
export function createEvalSignalAsync(
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalOptions
): EvalSignalAsync<unknown> {

  let compiler: CompilerService;

  // The same fork as `createEvalSignal`, for its reasons: lifetime comes from
  // the ambient injection context and never from `options.injector`.
  let destroyRef: DestroyRef | null = null;

  if (options?.injector) {
    compiler = options.injector.get(CompilerService);
  } else {
    compiler = inject(CompilerService);
    destroyRef = inject(DestroyRef, { optional: true });
  }

  const evalOptions = options?.eval;
  const onError = options?.onError ?? 'throw';
  const trackDependencies = options?.trackDependencies ?? false;

  assertTrackingCompatible(trackDependencies, evalOptions);

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

  const settle = (of: Run, outcome: Outcome): void => {
    // A superseded run, or any run after `destroy()`, writes nothing - so a
    // late settlement neither changes the value nor recomputes it.
    if (destroyed || of !== current) {
      return;
    }

    of.outcome = outcome;
    settled.update((count) => count + 1);
  };

  const start = (): Run | undefined => {
    if (!compiled || !context) {
      return undefined;
    }

    const fn = compiled;
    const ctx = context;
    const state = compiler.createState(ctx, evalOptions);

    // Restored in the `finally` below, around the synchronous call: the walk
    // ends before the promise is returned, so the depth is already back when
    // `callAsync` returns - and restoring at settlement instead would let a
    // run started before an earlier one settles walk on its leak (Phase 5
    // S 3.5).
    // Retained for `createEvalSignal`'s reason: `EvalContext.push` and `pop`
    // are public.
    const depth = ctx.scopes.length;
    let promise: Promise<unknown>;

    try {
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

    const started: Run = {};
    current = started;

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
    compiled = undefined;
    context = undefined;
    current = undefined;
    dependencies = new Set<string>();

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
