/**
 * What a field property does when its expression throws at runtime.
 *
 * - `'throw'` - rethrow, matching `eval-signals`' own default.
 * - `'undefined'` - the property resolves `undefined`, which `toVisible`
 *   reads as not visible and `toText` reads as `''`.
 * - a function - called with the error; its return value becomes the
 *   property's value.
 *
 * **The default here is `'undefined'`, the opposite of `eval-signals`'**, and
 * the consumer is the reason (plan S 3.4.4). An expression that fails in
 * `eval-signals` was written by the developer reading the stack trace. An
 * expression that fails here may have been typed into a form builder by an
 * end user, and the right response to "the admin wrote a bad rule" is a field
 * that does not render, not an application that throws on every change
 * detection pass. Consumers who want the strict behaviour pass `'throw'`.
 *
 * Resolving that default is a real step and not a formality: `createEvalSignal`
 * does `options?.onError ?? 'throw'`, so forwarding an *absent* policy verbatim
 * inherits `'throw'` - the opposite of this default. The `/reactive` binding
 * substitutes its own before the call.
 *
 * The union is structurally identical to `EvalSignalOptions['onError']`
 * **deliberately**: `/reactive` resolves the default here and forwards the
 * value to `createEvalSignal` with no mapping between the two unions, which is
 * where two near-identical types would drift apart.
 *
 * `SignalContextWriteError` is **not** routed through this, in either adapter,
 * matching `phase-3-plan.md` S 3.6.3. A write violation is static - illegal on
 * every recompute with every dataset - and swallowing it under a default of
 * `'undefined'` would hand every consumer a silent blank for a bug in the
 * rule's own syntax. `createEvalSignal` already bypasses `onError` for it.
 *
 * **Only the type ships in this phase.** A matching `applyErrorPolicy` helper
 * would have no caller: on the `/reactive` path - the only path Phase 4 ships
 * - `createEvalSignal` applies the three cases internally. Its sole consumer
 * is the `/signals` adapter, which is on paper only (S 9), so the helper is
 * deferred to that phase and will be written against this type. Shipping an
 * unexercised code path is what S 9.1 declines to do for the scope-leak
 * containment, and the rule applies to both or to neither.
 */
export type ExpressionErrorPolicy =
  | 'throw'
  | 'undefined'
  | ((error: unknown) => unknown);
