import { Signal, WritableSignal, computed, isSignal } from '@angular/core';
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
   * One `computed` per key and casing rule, per **factory**. Exported so the
   * memo can be compared by identity: the memo itself is private and the
   * resolver returns a *value*, so comparing two resolved values passes with
   * or without it. `caseInsensitive` defaults to the source's own setting.
   */
  keySignal: (key: string, caseInsensitive?: boolean) => Signal<unknown>;

  /**
   * S 3.6's one context per rule per `form()`, built off the shared memo,
   * under the options it is handed - the registration's resolved `eval` -
   * or the source's own when it is handed none.
   */
  createRuleContext: (options?: EvalOptions) => EvalContext;
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
 * pushed onto `lookups` - the only one there - answers every key.
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
 *   every value here is a `computed`. A *nested* property holding a signal -
 *   `{ user: { name: signal('a') } }` - is read un-called by the member
 *   visitor and nothing warns. A top-level key holding one is called, as
 *   upstream's lookup does.
 * - Enumeration of the form's keys is not available upstream, because the
 *   memo is deliberately private. That is the fix rather than a cost: the
 *   record being enumerable by upstream's `resolve` is precisely what
 *   produced Q4's freeze.
 *
 * @param model - The `WritableSignal` the consumer passes to `form()`.
 *                `form()` does not copy it, so the model signal and the field
 *                tree are two views of one thing.
 * @param options - The default for the contexts this source builds, used when
 *                  `createRuleContext` is handed none; configures them, not
 *                  the walk. As upstream, `caseInsensitive` corrects
 *                  identifier keys here but not *property* names.
 */
export const createModelSource = <TModel extends object>(
  model: WritableSignal<TModel>,
  options?: EvalOptions
): ModelSource => {

  // `Map`s, deliberately, and **not** the record `createFieldContext` hands
  // to `createSignalContext` - see Q4 in the docblock above. Nothing upstream
  // can see them, so no memo entry can ever shadow a model key.
  //
  // Two of them, one per casing rule, because a registration's
  // `caseInsensitive` reaches the memo: `Country` read case-insensitively is
  // `country`'s value and read exactly is nothing, so one key can need two
  // computeds. Up to 0.3.0 there was one map and every entry took the
  // factory's rule, so a registration's own setting reached the walk and not
  // the identifiers (`docs/backlog-retired.md` D3). Still one memo per
  // factory: both maps live and die with this source.
  const exact = new Map<string, Signal<unknown>>();
  const folded = new Map<string, Signal<unknown>>();

  // Index access, not dotted: `EvalOptions` is an index signature and
  // `noPropertyAccessFromIndexSignature` is set in all three libraries.
  const keySignal = (
    key: string,
    caseInsensitive = !!options?.['caseInsensitive']
  ): Signal<unknown> => {
    const memo = caseInsensitive ? folded : exact;
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

  const createRuleContext = (ruleOptions: EvalOptions | undefined = options): EvalContext => {

    // The rule's own casing, so its identifiers resolve through the memo
    // under the same rule its walk applies to property names.
    const caseInsensitive = !!ruleOptions?.['caseInsensitive'];

    // `createFieldContext` is still what builds the context - not for its
    // sources, which are both empty, but for its **class**. It returns a
    // context whose `set` throws `SignalContextWriteError`, which is the
    // error the error policy must re-throw rather than swallow. A hand-built
    // `EvalContext` would silently accept an assigning expression.
    const context = createFieldContext({}, {}, ruleOptions);

    // Its two lookups go, so the one pushed below is the only one. Each runs
    // over one of those empty records and can never answer, but `get` stops
    // only at an answer, so both ran ahead of ours on every identifier - and
    // under `caseInsensitive` each allocated an `Object.keys({})` per read
    // (`docs/backlog-retired.md` D5). Removed here rather than never built,
    // because `createFieldContext` is public and stays as it is.
    context.lookups.splice(0);

    // The resolver's parameter is deliberately unannotated. `EvalLookup` is
    // `(key: unknown, …) => unknown` and a parameter position is
    // contravariant under `strict`, so `(key: string) => …` does not compile;
    // upstream writes it the same way for the same reason.
    //
    // The narrowing decides which keys reach the memo, and it matches
    // upstream's `resolve` for both kinds an expression can produce. A string
    // passes as is. A number - `this[42]` is how a walk hands a lookup one,
    // since `this` is the context and a computed key arrives raw - is spelled
    // as the string JavaScript's own property access coerces it to, so
    // `this[42]` and `this["42"]` share one memo entry and resolve as upstream
    // does. Passed raw it would make a second entry under the number, and
    // under `caseInsensitive` throw from `toLowerCase`. Anything else - a
    // symbol - resolves `undefined`, where upstream would find a symbol-keyed
    // own property (`docs/backlog.md` `BL-D6`).
    //
    // A value that is itself a signal is called, as upstream's lookup does
    // (`isSignal(value) ? value() : value`), so `{ ready: signal(false) }`
    // resolves `ready` to `false` rather than to a truthy function. The call
    // happens in the rule's own derivation, so the rule tracks the inner
    // signal as well as the key's computed (`docs/backlog.md` `BL-D4`).
    context.lookups.push((key) => {
      const name = typeof key === 'string' ? key : typeof key === 'number' ? String(key) : undefined;
      const value = name === undefined ? undefined : keySignal(name, caseInsensitive)();
      return isSignal(value) ? value() : value;
    });

    return context;
  };

  return { keySignal, createRuleContext };
};
