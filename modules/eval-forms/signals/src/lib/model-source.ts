import { Signal, WritableSignal, computed } from '@angular/core';
import { EvalContext, EvalOptions } from '@zvenigora/ng-eval-core';
import { createFieldContext } from '@zvenigora/ng-eval-forms';

/**
 * Resolves one key against the model object, preferring an exact match.
 *
 * **This is a re-implementation of `eval-signals`' own `resolve`
 * (`signal-context.ts:127-144`), not a borrow, and the plan requires that be
 * said plainly rather than recorded as reuse** (plan S 0.1, S 3.2.1).
 * `resolve` is module-private there and cannot be called. The two must agree
 * on the same rule - exact match first, then the first key differing only in
 * case, in insertion order - and if upstream's ever changes, this is the
 * second copy that does not know.
 */
const readProperty = (
  model: Record<string, unknown>,
  key: string,
  caseInsensitive: boolean
): unknown => {

  if (Object.prototype.hasOwnProperty.call(model, key)) {
    return model[key];
  }

  if (!caseInsensitive) {
    return undefined;
  }

  const lowered = key.toLowerCase();
  const match = Object.keys(model).find((candidate) => candidate.toLowerCase() === lowered);
  return match === undefined ? undefined : model[match];
};

/**
 * What one `createExpressionRules` factory holds: a private memo of per-key
 * `computed`s, and the contexts built off it (plan S 3.2.1, S 3.6).
 *
 * Module-private to the `/signals` entry point - a real export of this
 * module, absent from `signals/src/public-api.ts`, changeable by a later
 * phase without a release (S 5).
 */
export interface ModelSource {

  /**
   * One `computed` per key, per **factory**. Exported so the memo can be
   * compared by identity: the memo itself is private and the resolver returns
   * a *value*, so comparing two resolved values passes with or without it.
   */
  keySignal: (key: string) => Signal<unknown>;

  /**
   * S 3.6's one context per rule per `form()`, built off the shared memo.
   */
  createRuleContext: () => EvalContext;
}

/**
 * Builds the `/signals` adapter's source over the model signal a consumer
 * passed to `form()`.
 *
 * **The property read happens *inside* the `computed`, and that is the whole
 * design** (plan S 3.2.1). Two earlier shapes are withdrawn and both failed
 * in ways worth naming, because each looks correct until a second read:
 *
 * - A bare `() => model()[key]` in a `SignalContextSource` record resolves to
 *   the **function object** - truthy, never called, never tracked - because
 *   upstream's resolver unwraps signals and passes functions through
 *   untouched. That is the silent freeze `src/lib/field-context.ts:60-64`
 *   already records for the `/reactive` form half.
 * - A record whose entries are memoised `computed`s, written back as the
 *   expression spelled the key, becomes an **exact** match on the second read
 *   under `caseInsensitive` and shadows the model's own key for the life of
 *   the form. Measured as Q4: the first read resolves and every read after it
 *   is frozen.
 *
 * With resolution inside the computed there is nothing left for a record to
 * hold, so both `createFieldContext` sources are `{}` and the resolver
 * pushed onto `lookups` answers every key.
 *
 * **The read is what subscribes, and it happens even when the key resolves to
 * `undefined`.** `EvalContext.get` treats `undefined` as absent at every step,
 * so an expression naming a key the model does not hold yet resolves to
 * nothing - but `keySignal(key)()` has been *called* inside Angular's
 * derivation, so the rule is subscribed. When the model gains the key, the
 * computed's value changes and the rule re-runs. A record that simply lacked
 * the key would read nothing, subscribe to nothing, and stay frozen.
 *
 * **Per-key propagation survives even though every `computed` reads the whole
 * model.** Angular's `computed` memoises on `Object.is`, so a write to `zip`
 * re-evaluates each computed's property read and propagates only from
 * `zip`'s. The cost per model write is O(keys some expression actually
 * reads), not O(rules) and not O(model keys), because `computed` is lazy and
 * a key nothing names is never evaluated.
 *
 * **What is limited**, for the README beside `/reactive`'s key-set caveat -
 * and neither item is resolution, since every key an expression can name
 * resolves at any spelling `caseInsensitive` allows, whether or not the model
 * held it when the form was built:
 *
 * - The nested-signal diagnostic does not reach this adapter.
 *   `findNestedSignals` only reports a key whose value `isPlainObject`, and
 *   every value here is a `computed`. A model property holding a signal is
 *   read un-called by the member visitor and nothing warns.
 * - Enumeration of the form's keys is not available upstream, because the
 *   memo is deliberately private. That is the fix rather than a cost: the
 *   record being enumerable by upstream's `resolve` is precisely what
 *   produced Q4's freeze.
 *
 * @param model - The `WritableSignal` the consumer passes to `form()`.
 *                `form()` does not copy it, so the model signal and the field
 *                tree are two views of one thing.
 * @param options - Configures this source and the contexts it builds, not the
 *                  walk. As upstream, `caseInsensitive` corrects identifier
 *                  keys here but not *property* names.
 */
export const createModelSource = <TModel extends object>(
  model: WritableSignal<TModel>,
  options?: EvalOptions
): ModelSource => {

  // Index access, not dotted: `EvalOptions` is an index signature and
  // `noPropertyAccessFromIndexSignature` is set in all three libraries.
  const caseInsensitive = !!options?.['caseInsensitive'];

  // A `Map`, deliberately, and **not** the record `createFieldContext` hands
  // to `createSignalContext` - see Q4 in the docblock above. Nothing upstream
  // can see it, so no memo entry can ever shadow a model key.
  const memo = new Map<string, Signal<unknown>>();

  const keySignal = (key: string): Signal<unknown> => {
    let cached = memo.get(key);

    if (!cached) {
      // Created inside Angular's reactive consumer, on the first read of any
      // key. That is allowed - `computed()` needs no injection context and is
      // not `effect()`. The inner computed becomes the active consumer for
      // its own body, so `model()` is attributed there and the outer consumer
      // records the inner one as a dependency, which is what makes the
      // per-key propagation above hold.
      cached = computed(() => readProperty(model() as Record<string, unknown>, key, caseInsensitive));
      memo.set(key, cached);
    }

    return cached;
  };

  const createRuleContext = (): EvalContext => {

    // `createFieldContext` is still what builds the context - not for its
    // sources, which are both empty, but for its **class**. It returns a
    // context whose `set` throws `SignalContextWriteError`, which is the
    // error the error policy must re-throw rather than swallow. A hand-built
    // `EvalContext` would silently accept an assigning expression.
    const context = createFieldContext({}, {}, options);

    // The resolver's parameter is deliberately unannotated. `EvalLookup` is
    // `(key: unknown, …) => unknown` and a parameter position is
    // contravariant under `strict`, so `(key: string) => …` does not compile;
    // upstream writes it the same way for the same reason. The `typeof`
    // narrowing is therefore not defensive padding - without it a non-string
    // key would be coerced into the memo as a spurious entry.
    context.lookups.push((key) => (typeof key === 'string' ? keySignal(key)() : undefined));

    return context;
  };

  return { keySignal, createRuleContext };
};
