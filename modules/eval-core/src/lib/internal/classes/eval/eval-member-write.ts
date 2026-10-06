/**
 * A member write - `o.k = v`, `o.k += v`, `o.k++` - as an `EvalContext` that
 * polices member writes is asked about it, through
 * `EvalContext.checkMemberWrite`, before the write happens.
 *
 * Since 0.11.0 the same question is asked before a call of a built-in method
 * that writes into an object it is handed - `a.push(x)`, `m.set(k, v)`,
 * `Object.assign(o, p)` - with {@link method} naming it.
 */
export interface EvalMemberWrite {

  /**
   * The object about to receive the write: the value of the member
   * expression's object, `o` in `o.k = v`. Not necessarily an object - a
   * write to a primitive's member reaches the policy too, ahead of the
   * prototype-pollution guard that would refuse it.
   *
   * For a method call, the object the method writes into: its receiver, `a`
   * in `a.push(x)` - the context itself for a bare call, `p(x)`, and the
   * `this` passed through `call`, `apply` or `bind`, `a` in
   * `[].push.call(a, x)` - or, for `Object`'s mutators, the first argument,
   * `o` in `Object.assign(o, p)`.
   */
  readonly target: unknown;

  /**
   * The property about to be written, as the member visitor resolved it: a
   * computed key evaluated, and under `caseInsensitive` corrected to the
   * spelling the target holds.
   *
   * Undefined for a method call, which may write any number of properties.
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

  /**
   * The built-in method about to make the write, when a call makes it rather
   * than an assignment or an update, which leave this undefined. Named as the
   * specification names it: `'Array.prototype.push'`,
   * `'%TypedArray%.prototype.sort'`, `'Map.prototype.set'`,
   * `'Date.prototype.setFullYear'`, `'Object.assign'`.
   *
   * The method is recognised by identity, not by the name it was called by: a
   * method of the caller's own named `push` is not asked about, and
   * `Array.prototype.push` reached under another name is. Reached through
   * `Function.prototype.call`, `apply` or `bind`, it is asked about as a
   * direct call of it, and `bind` is asked when it binds, since the bound
   * function is new and would not be recognised when called. The methods are
   * those of `Array` and the typed arrays that reorder, fill or resize them;
   * `Map`, `Set`, `WeakMap` and `WeakSet`'s adders and removers; `Date`'s
   * setters; and `Object`'s `assign`, `defineProperty`, `defineProperties`,
   * `setPrototypeOf`, `freeze`, `seal` and `preventExtensions`.
   *
   * Since 0.11.0.
   */
  readonly method?: string;
}
