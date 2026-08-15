import { Injector, Signal, ValueEqualityFn, computed, inject, signal } from '@angular/core';
import { CompilerService, EvalContext, EvalHooks, EvalOptions,
  call, createDependencyTracker } from '@zvenigora/ng-eval-core';
import type { stateCallback } from '@zvenigora/ng-eval-core';
import { SignalContextSource, SignalContextWriteError, createSignalContext } from './signal-context';

/**
 * A `Signal` whose value is an expression evaluated over a signal context.
 */
export interface EvalSignal<T> extends Signal<T> {

  /**
   * The dotted paths the **last recompute** read; empty unless
   * `trackDependencies` was set.
   *
   * A plain getter rather than a `Signal`, deliberately: making it reactive
   * would invite reading it inside another `computed()`, which subscribes a
   * computation to the *introspection* of a computation. This is a debugging
   * surface - it reports what the last recompute recorded, and reading it
   * neither triggers one nor waits for one.
   *
   * What it reports is not what the signal recomputes on. Three limits apply,
   * two inherited from `eval-core`'s tracker - a computed member (`obj[expr]`)
   * has no reconstructible path and contributes nothing, and a name that has
   * been an arrow parameter anywhere in the expression is dropped everywhere
   * in it - plus one this library adds: under `caseInsensitive`, a
   * lookup-resolved key reports its *source* spelling. None of them affect
   * reactivity, which is Angular's and is per signal, not per path.
   */
  readonly dependencies: ReadonlySet<string>;

  /**
   * Forces the next read to re-evaluate.
   *
   * For a source that is not signal-backed: a plain object the consumer owns
   * and does not want to convert has no reactive surface, so nothing can tell
   * the signal it changed. This is coarse by construction - it re-evaluates
   * regardless of *what* changed, or whether anything did - and that is the
   * honest trade. {@link dependencies} is what a consumer uses to decide
   * whether an invalidation was warranted.
   *
   * Calls collapse: three between two reads produce one recompute, since what
   * they bump is a signal the computation reads rather than a queue it
   * replays.
   */
  invalidate(): void;

  /**
   * Drops the compiled callback, the context and the recorded
   * {@link dependencies}.
   *
   * **Incomplete until step 4**, which owns lifetime and cleanup. There are
   * still no hook registrations to unsubscribe: `trackDependencies` installs
   * its tracker on the state built for one recompute and removes it before
   * that recompute returns, so nothing outlives the walk. `DestroyRef`
   * integration is step 4's. It is idempotent now and must stay so.
   *
   * A destroyed signal does not evaluate again; a read that would have
   * recomputed yields `undefined`.
   */
  destroy(): void;
}

/**
 * Options for {@link createEvalSignal}.
 */
export interface EvalSignalOptions {

  /**
   * Forwarded to `eval-core`.
   *
   * When the factory builds the context, this reaches **both** halves - the
   * resolver, which corrects identifier keys, and the walk's own options,
   * which is what corrects property names. Setting `caseInsensitive` once is
   * therefore correct everywhere. When `source` is already an `EvalContext`
   * the caller owns the context half and it reaches the walk only.
   */
  eval?: EvalOptions;

  /**
   * `computed()` equality. Default `Object.is`.
   *
   * An expression yielding an object or array literal produces a fresh value
   * per recompute, so the default never dedupes and every downstream consumer
   * re-runs. Supply a structural comparator if that matters.
   */
  equal?: ValueEqualityFn<unknown>;

  /**
   * What the signal does when evaluation throws. Default `'throw'`, which is
   * Angular's own behaviour for a `computed()`: the error is cached and
   * re-thrown on each read until a dependency changes.
   *
   * Two things are **not** routed through this. A
   * {@link SignalContextWriteError} bypasses it in every mode - see
   * {@link createEvalSignal}. And a *parse* error does not reach it at all:
   * the expression is compiled once, eagerly, so a malformed one throws from
   * `createEvalSignal` itself rather than producing a signal that fails on
   * read.
   */
  onError?: 'throw' | 'undefined' | ((error: unknown) => unknown);

  /**
   * Collect the read-hook dependency set on each recompute, readable as
   * {@link EvalSignal.dependencies}. Default `false`.
   *
   * **The default is not a shrug.** Turning this on registers a read hook,
   * and a registered read hook turns on key resolution and path
   * reconstruction at *every* read site for the whole walk - a cost a
   * consumer who never reads `dependencies` should not pay.
   *
   * Setting this together with `eval.hooks` **throws**, at this call rather
   * than at the first recompute. An `EvalState` dispatches through the
   * registry it adopted, and a caller's registry is theirs: installing into
   * it would leave a hook firing on every later evaluation they run through
   * it, with an unsubscribe they were never handed. The escape hatch is the
   * same tracker this library would have used - install
   * `createDependencyTracker()` on your own registry and read it yourself.
   */
  trackDependencies?: boolean;

  /** For use outside an injection context, like `toSignal`'s. */
  injector?: Injector;
}

/**
 * Creates a `Signal` that evaluates `expression` over `source`.
 *
 * The signal recomputes exactly when a signal-backed key the expression read
 * changes. That is Angular's own tracking rather than this library's: the
 * walk is synchronous and the context resolves a read by *calling* a signal,
 * so running it inside a `computed()` records the dependency natively, per
 * key, exactly as the walk performed it.
 *
 * ```ts
 * const total = createEvalSignal('price * quantity', {
 *   price: signal(10),
 *   quantity: signal(3),
 * });
 * ```
 *
 * The expression is compiled once. Each recompute gets a **fresh
 * `EvalState`** - `EvalResult.trace` is drained by nothing and would retain
 * every intermediate value the expression ever produced, and a failed run's
 * error fields survive a later success. The `EvalContext` is the opposite: it
 * is built once and reused, which is what makes per-key tracking possible at
 * all.
 *
 * Reads that happen after the walk returns are not tracked, because they are
 * outside the reactive context - an arrow function that escapes the
 * evaluation and is called later is the one way to hit this. It is inherent
 * to Angular's model rather than to this library.
 *
 * The context's keys are read-only: an assignment throws
 * {@link SignalContextWriteError}, and that error bypasses `onError` in every
 * mode. A write violation is a *static* property of the expression - illegal
 * on every recompute with every dataset - while `onError` exists so a
 * *runtime* failure can render a blank rather than break. Routing one through
 * the other would hand a consumer who set `'undefined'` for the ordinary
 * reason a silent blank for a bug in their own code.
 *
 * @param expression - A JavaScript expression.
 * @param source - A record whose values may be signals, or a pre-built
 *                 `EvalContext` the caller owns.
 * @param options - See {@link EvalSignalOptions}.
 * @returns A `Signal` carrying the expression's value.
 */
export function createEvalSignal(
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalOptions
): EvalSignal<unknown> {

  const compiler = options?.injector
    ? options.injector.get(CompilerService)
    : inject(CompilerService);

  const evalOptions = options?.eval;
  const onError = options?.onError ?? 'throw';
  const trackDependencies = options?.trackDependencies ?? false;

  // Checked against `EvalState`'s own rule rather than against presence: it
  // adopts `hooks` only when the value is an `EvalHooks`, so anything else
  // leaves the state building a registry of its own and there is no conflict
  // to report. Raised here, at the call the consumer wrote, because at the
  // first recompute it would surface on whatever line happens to read the
  // signal.
  //
  // Cast for the read, as `EvalState.adoptHooks` does and for its reason:
  // `EvalOptions` is a union, and `hooks` exists on neither arm by name - the
  // `caseInsensitive` arm has no index signature to reach it through. The
  // `instanceof` immediately after is what narrows the `unknown` back.
  const adoptedHooks = (evalOptions as Record<string, unknown> | undefined)?.['hooks'];

  if (trackDependencies && adoptedHooks instanceof EvalHooks) {
    throw new Error(
      `Cannot combine 'trackDependencies' with 'eval.hooks': an EvalState `
      + `dispatches through the registry it adopted, so tracking would have to `
      + `install a read hook on a registry this library does not own - one that `
      + `would keep firing on every later evaluation you run through it. `
      + `Install createDependencyTracker() on your own registry and read it `
      + `from there instead; it is the same tracker this option would have used.`
    );
  }

  // The union fork is the whole of the difference between the two paths. A
  // pre-built context was constructed by the caller with the options they
  // chose, and the factory must not rewrite them - so it is passed straight
  // through, and the forwarding covers the evaluation half only.
  let context: EvalContext | undefined = source instanceof EvalContext
    ? source
    : createSignalContext(source, evalOptions);

  let compiled: stateCallback | undefined = compiler.compile(expression);
  // Per signal rather than one shared module-level empty set: `ReadonlySet` is
  // a compile-time claim only, and that set would be handed out through the
  // public getter by every signal that has not recomputed yet and every
  // destroyed one - so a single cast-and-mutate from any consumer would
  // corrupt what all of them report, for the life of the process.
  let dependencies: ReadonlySet<string> = new Set<string>();

  // The escape hatch for a source with no reactive surface (S 3.5). Read at
  // the top of every recompute, so `invalidate` is a producer alongside
  // whatever signals the expression itself touched.
  const version = signal(0);

  const evaluate = (): unknown => {
    if (!compiled || !context) {
      return undefined;
    }

    // `EvalContext.fromContext` short-circuits on identity, so the context -
    // with its lookup, its priorScopes and its stable identity - survives
    // this untouched. What is rebuilt is an `EvalResult`, a `Stack` and an
    // `EvalTrace`, against a walk that allocates per node anyway.
    const state = compiler.createState(context, evalOptions);

    // The free `call`, deliberately, and not `CompilerService.call`: that one
    // catches and rethrows `new Error(error.message)`, which would destroy
    // the `SignalContextWriteError` type the branch below selects on and
    // leave nothing but a message to match.
    if (!trackDependencies) {
      return call(compiled, state);
    }

    // Per recompute, on a registry this state owns and nobody else sees.
    // That is also why no `reset()` is needed - and the operative half is the
    // fresh *tracker*, not the fresh registry: a tracker hoisted out of this
    // closure to save an allocation would accumulate across recomputes on
    // however many registries.
    const tracker = createDependencyTracker();
    const off = tracker.install(state.hooks);

    try {
      return call(compiled, state);
    } finally {
      // Taken and called even though the state is unreachable from here on:
      // "the registration dies with the state" is a property of the current
      // design rather than a guarantee, and an unsubscribe that is never
      // needed costs a closure. Recorded in `finally` so a failed recompute
      // still reports what it managed to read before it threw - the case a
      // consumer is most likely to be debugging.
      off();
      dependencies = tracker.dependencies;
    }
  };

  const compute = (): unknown => {
    // Unconditionally, and before the guard in `evaluate`: a version read
    // that happened only on some paths would leave `invalidate()` working
    // for some expressions and silently not for others.
    version();

    try {
      return evaluate();
    } catch (error) {
      if (error instanceof SignalContextWriteError) {
        throw new SignalContextWriteError(error.key, expression, error);
      }
      if (onError === 'undefined') {
        return undefined;
      }
      if (typeof onError === 'function') {
        return onError(error);
      }
      throw error;
    }
  };

  const value = options?.equal
    ? computed(compute, { equal: options.equal })
    : computed(compute);

  const invalidate = (): void => {
    version.update((current) => current + 1);
  };

  const destroy = (): void => {
    compiled = undefined;
    context = undefined;
    dependencies = new Set<string>();
  };

  const evalSignal = Object.assign(value, { invalidate, destroy }) as EvalSignal<unknown>;

  // `defineProperty` rather than a member of the object above: `Object.assign`
  // copies a getter's *current value*, which would freeze `dependencies` at
  // the empty set it holds before the first recompute.
  Object.defineProperty(evalSignal, 'dependencies', {
    get: () => dependencies,
    enumerable: true,
    configurable: true,
  });

  return evalSignal;
}
