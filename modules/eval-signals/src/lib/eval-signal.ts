import { Injector, Signal, ValueEqualityFn, computed, inject } from '@angular/core';
import { CompilerService, EvalContext, EvalOptions, call } from '@zvenigora/ng-eval-core';
import type { stateCallback } from '@zvenigora/ng-eval-core';
import { SignalContextSource, SignalContextWriteError, createSignalContext } from './signal-context';

/**
 * A `Signal` whose value is an expression evaluated over a signal context.
 */
export interface EvalSignal<T> extends Signal<T> {

  /**
   * Drops the compiled callback and the context.
   *
   * **Incomplete until step 4**, which owns lifetime and cleanup. Today there
   * is nothing else to release - the hook registrations that will need
   * unsubscribing arrive with `trackDependencies` in step 3, and `DestroyRef`
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

  // The union fork is the whole of the difference between the two paths. A
  // pre-built context was constructed by the caller with the options they
  // chose, and the factory must not rewrite them - so it is passed straight
  // through, and the forwarding covers the evaluation half only.
  let context: EvalContext | undefined = source instanceof EvalContext
    ? source
    : createSignalContext(source, evalOptions);

  let compiled: stateCallback | undefined = compiler.compile(expression);

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
    return call(compiled, state);
  };

  const compute = (): unknown => {
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

  const destroy = (): void => {
    compiled = undefined;
    context = undefined;
  };

  return Object.assign(value, { destroy });
}
