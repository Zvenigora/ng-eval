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
 * **Precedence is value-dependent, not permanent.** A field key wins while
 * its value is *present*: `EvalContext.get` treats `undefined` as absent at
 * every step, and the field resolver returns `undefined` both for "no such
 * key" and for "key bound to `undefined`" - so an empty `FormControl`, which
 * is the common case rather than an exotic one, falls through to the form
 * value. Documented as a limitation (plan S 3.4.3): distinguishing the two
 * would need a sentinel threaded through `EvalContext.get`, which is
 * `eval-core`'s and out of this phase's scope.
 *
 * @param formSource - The form-wide keys, shared by every field of the form.
 * @param fieldSource - The field-local keys. These win on a name collision,
 *                      while their value is not `undefined`.
 * @param options - Passed to `createSignalContext` for **both** halves;
 *                  configures this context and its resolvers, not the walk.
 *                  As upstream, `caseInsensitive` corrects identifier keys
 *                  here but not *property* names - the member visitor reads
 *                  those off the state's options, so the same options must
 *                  also reach `simpleEval` / `createState`.
 */
export const createFieldContext = (
  formSource: SignalContextSource,
  fieldSource: SignalContextSource,
  options?: EvalOptions
): EvalContext => {

  const context = createSignalContext(fieldSource, options);

  // The form half **borrows upstream's resolver rather than rewriting it**
  // (S 3.4.2, candidate A, settled in step 2). The second context is
  // discarded and only its closure survives, so this is still one
  // `EvalContext` per field and the field half is still consulted first.
  //
  // The deciding reason is row 2 of S 3.4.2's measured table, and it is that
  // the hand-written read is *wrong*, not merely thinner: it returns a signal
  // un-called, so a form key holding `signal(undefined)` resolves to the
  // signal **function**, which is truthy - and `visible: "country"` then
  // renders a field precisely when its value is absent, silently, on an empty
  // control. That is every form's first render. Recorded here because the
  // alternative was rejected on correctness and stays rejected even once
  // S 3.5 names a mechanism that keeps a plain-value record live.
  //
  // Borrowing also brings own-property semantics - so a server-supplied field
  // named `constructor` cannot resolve off `Object.prototype` *through this
  // half*, which is a narrower claim than it looks and no test reaches it:
  // `get` consults `original` before `lookups`, and `getContextValue` reads a
  // plain object as a bare property access, so an inherited name resolves
  // there first and never arrives here (S 3.4.3's third layer, upstream and
  // out of this phase's scope). It also brings `caseInsensitive` correction
  // and `warnOnNestedSignals` over the form source, with no import beyond the
  // one already here.
  //
  // The scan is the one cost: `createSignalContext` runs
  // `warnOnNestedSignals` unconditionally, so a form of N fields scans the
  // same form source N times and, in dev mode, would warn N times under
  // *upstream's* symbol name for a call this library made. Construction-time
  // only - no per-node or per-recompute path is touched.
  context.lookups.push(...createSignalContext(formSource, options).lookups);

  return context;
};
