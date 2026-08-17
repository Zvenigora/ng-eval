import { EvalContext, EvalOptions } from '@zvenigora/ng-eval-core';
import { SignalContextSource, createSignalContext } from '@zvenigora/ng-eval-signals';

/**
 * Composes one `EvalContext` for one field, out of two live sources.
 *
 * The mechanism is **two lookups, not a joined record** (plan S 3.4.2). The
 * field half is a `createSignalContext` over `fieldSource`; the form half is a
 * second resolver pushed onto the same context's `lookups`. Both close over
 * their source and read it at resolve time, so a key added to either after
 * construction resolves - there is no third object to keep in sync, and no
 * write-through to N contexts.
 *
 * `EvalContext.get` walks `lookups` in order and takes the first
 * non-`undefined`, so the field half is consulted first.
 *
 * One context per field, never one shared across fields (plan S 3.4.1):
 * `get` resolves `scopes` and `original` *before* `lookups`, so anything left
 * on a shared context - an arrow function's leaked scope, say - would be read
 * ahead of every other field's source key of the same name, for the life of
 * the form.
 *
 * **Resolution is live; appearance is not reactive.** An expression that read
 * a then-missing key subscribed to nothing, so the owner of the source calls
 * `invalidate()` when the *key set* changes. A change to a *value* is
 * Angular's job and needs nothing.
 *
 * @param formSource - The form-wide keys, shared by every field of the form.
 * @param fieldSource - The field-local keys. These win on a name collision.
 * @param options - Passed to `createSignalContext`; configures this context
 *                  and its resolver, not the walk. `caseInsensitive` currently
 *                  corrects **field** keys only - see the note in the body.
 */
export const createFieldContext = (
  formSource: SignalContextSource,
  fieldSource: SignalContextSource,
  options?: EvalOptions
): EvalContext => {

  const context = createSignalContext(fieldSource, options);

  // An own-property read, so a server-supplied field name cannot resolve off
  // `Object.prototype` through this half. No test reaches that guard: `get`
  // consults `original` before `lookups`, and an inherited name resolves there
  // first (upstream, and out of this phase's scope to fix) - so it is here on
  // the argument, not on a red test.
  //
  // Unlike the field half it does not unwrap signals, honour `caseInsensitive`
  // or run `warnOnNestedSignals`. **That is a step-1 limitation, not a settled
  // design** - S 3.4.2 records the one-line composition that would fix all
  // four at once, and why step 3's shape decides whether it must.
  context.lookups.push((key) =>
    Object.prototype.hasOwnProperty.call(formSource, key as PropertyKey)
      ? formSource[key as string]
      : undefined
  );

  return context;
};
