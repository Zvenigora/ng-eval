// A **value** import, and it has to stay one: `instanceof` needs the
// constructor, not the type. `field-context.ts` already imports a value from
// this package, so this adds no dependency edge.
//
// **The compiler enforces the form, and the plan said otherwise** - S 3.4 and
// S 8.1 both call a type-only import here a change that "would compile and the
// guard would silently never fire". Measured in step 3: `import type` is
// **TS1361** at `applyErrorPolicy`'s `instanceof`, so it fails
// `build:production` and gate 7, and under ts-jest's transpile path the elided
// binding is a `ReferenceError` inside the `catch` that reddens *both* policy
// arms. Loud at every gate, in other words - see the plan's revision 13.
//
// The failure mode that *is* silent is a different one and no import syntax
// prevents it: two resolved copies of `@zvenigora/ng-eval-signals` give two
// distinct constructors, and `instanceof` is then false for an error the other
// copy threw. That is what the write-error arm of `evaluate-rule.spec.ts`
// covers by throwing across the real package boundary rather than
// constructing the error itself.
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';

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
 * **{@link applyErrorPolicy} ships beside this type as of Phase 6** (its
 * S 3.4). Through Phase 4 only the type shipped, because the helper would have
 * had no caller: on the `/reactive` path - the only path Phase 4 shipped -
 * `createEvalSignal` applies the three cases internally, and shipping an
 * unexercised code path is what S 9.1 declined to do for the scope-leak
 * containment. The `/signals` adapter is that caller **from step 4**, where
 * the registrars stop being stubs; `/reactive` does not use the helper at all.
 */
export type ExpressionErrorPolicy =
  | 'throw'
  | 'undefined'
  | ((error: unknown) => unknown);

/**
 * Runs one rule under one {@link ExpressionErrorPolicy}, with the one error
 * that must never be routed through it taken out first.
 *
 * ```ts
 * applyErrorPolicy(() => evaluateRule(compiled, context, options), onError)
 * ```
 *
 * **`SignalContextWriteError` re-throws in every mode, including a handler
 * function** (plan S 3.4, 1.2.11). On `/reactive` that bypass came free -
 * `createEvalSignal` re-throws it regardless of `onError` (`eval-signal.ts:353`)
 * - and that behaviour lives *inside* `createEvalSignal`, which the `/signals`
 * path never calls. It does not travel with the type, so it is re-implemented
 * here or it does not exist. An assigning expression is illegal on every
 * recompute with every dataset, so under this module's default of
 * `'undefined'` it would otherwise render as a permanently blank field with
 * nothing in the console.
 *
 * **The `instanceof` needs the constructor, so the import of that class is a
 * *value* import** - see the note above it, and the plan's revision 13, for
 * why that form is protected by the compiler rather than by this spec.
 * `evaluate-rule.spec.ts`'s write-error arm asserts on the **class** rather
 * than on a message because what it covers is the bypass's *behaviour* across
 * a real package boundary, which no compiler check reaches.
 *
 * **It lives in the core while `/signals`' choke point does not, and the pair
 * is not inconsistent** (S 3.4.1). The discriminator is what the symbol grants
 * a caller who reaches it: `evaluateRule` published *is* a second path to the
 * walk, which S 9.1 requires there be only one of, while this is a pure
 * function over an error and a policy that takes no context, holds no compiled
 * callback and cannot reach a walk. Publishing it grants a caller nothing they
 * could not write in four lines, and buys the thing duplication would lose -
 * one implementation of the write-error bypass for both adapters, which cannot
 * then drift into disagreeing about the one error that must never be
 * swallowed.
 *
 * **It re-throws the error it caught; `/reactive` re-wraps.** `createEvalSignal`
 * throws a *new* `SignalContextWriteError` carrying the offending expression
 * string, which it has and this path does not - a `LogicFn` holds a compiled
 * callback, not the source text. So the same misuse surfaces a different
 * object at each entry point: wrapped with the expression under `/reactive`,
 * the original here. Stated rather than hidden; it is the one thing a consumer
 * catching this error across both adapters would notice.
 *
 * @param run - The rule invocation. On `/signals` this is the choke point,
 *              never a bare walk: containment is inside `run`, so a throw is
 *              contained before this function decides what to do about it.
 * @param policy - Defaults to `'undefined'`, per {@link ExpressionErrorPolicy}.
 *                 Resolving the default *here* is what makes an absent policy
 *                 mean `'undefined'` rather than inheriting `eval-signals`'
 *                 opposite one.
 */
export const applyErrorPolicy = <T>(
  run: () => T,
  policy: ExpressionErrorPolicy = 'undefined'
): T | undefined => {

  try {
    return run();
  } catch (error) {
    if (error instanceof SignalContextWriteError) {
      throw error;
    }

    if (policy === 'throw') {
      throw error;
    }

    if (policy === 'undefined') {
      return undefined;
    }

    return policy(error) as T | undefined;
  }
};
