/**
 * A member write - `o.k = v`, `o.k += v`, `o.k++` - as an `EvalContext` that
 * polices member writes is asked about it, through
 * `EvalContext.checkMemberWrite`, before the write happens.
 */
export interface EvalMemberWrite {

  /**
   * The object about to receive the write: the value of the member
   * expression's object, `o` in `o.k = v`. Not necessarily an object - a
   * write to a primitive's member reaches the policy too, ahead of the
   * prototype-pollution guard that would refuse it.
   */
  readonly target: unknown;

  /**
   * The property about to be written, as the member visitor resolved it: a
   * computed key evaluated, and under `caseInsensitive` corrected to the
   * spelling the target holds.
   */
  readonly key: unknown;

  /**
   * Whether the walk on the **same `EvalState`** created {@link target} for
   * the expression to hold. Created means one of:
   *
   * - an object or array literal, spread included (`{ ...o }` is new, though
   *   what it copies is not), or a regex literal, which is a new `RegExp` on
   *   each evaluation;
   * - a rest value: `...rest` in an array or object pattern, or an arrow
   *   function's rest parameter;
   * - the function an arrow-function expression evaluates to.
   *
   * It covers an arrow-function body, which re-enters the walk on that state,
   * and an earlier `eval` on a state the caller reuses.
   *
   * **A call's result and a `new` result are never created**, even when they
   * are new - `[1].map(f)` is - because either can hand back an existing
   * object: `[o].find(x => true)` returns `o`.
   */
  readonly createdByEvaluation: boolean;
}
