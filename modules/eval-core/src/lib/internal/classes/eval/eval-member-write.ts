/**
 * A member write - `o.k = v`, `o.k += v`, `o.k++` - as an `EvalContext` that
 * polices member writes is asked about it, through
 * `EvalContext.checkMemberWrite`, before the write happens.
 *
 * Since 0.11.0 the same question is asked before a call the expression makes
 * of a built-in method in `eval-core`'s table of writers that writes into an
 * object it is handed - `a.push(x)`, `m.set(k, v)`, `Object.assign(o, p)` -
 * with {@link method} naming it. A write by any other route is not asked
 * about (`docs/backlog.md` A64).
 */
export interface EvalMemberWrite {

  /**
   * The object about to receive the write: the value of the member
   * expression's object, `o` in `o.k = v`. Not necessarily an object - a
   * write to a primitive's member reaches the policy too, ahead of the guard
   * that refuses a write into a primitive; the walk's own checks may refuse a
   * write before the policy is asked.
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
   * **A call and a `new` do not make their result created**, even when it is
   * new - `[1].map(f)`'s array is - because either can hand back an existing
   * object: `[o].find(x => true)` returns `o`. What the expression made
   * itself, a literal, a rest value or an arrow, stays created when a call
   * hands it back: in `(() => ({}))().x = 1` the literal is, so the write is
   * allowed.
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
   * `Array`'s `copyWithin`, `fill`, `pop`, `push`, `reverse`, `shift`,
   * `sort`, `splice` and `unshift`; the typed arrays' `copyWithin`, `fill`,
   * `reverse`, `set` and `sort`;
   * `set` and `delete` on a `Map` or a `WeakMap`, `clear` on a `Map` or a
   * `Set`, and `add` and `delete` on a `Set` or a `WeakSet`; `Date`'s setters;
   * and `Object`'s `assign`, `defineProperty`, `defineProperties`,
   * `setPrototypeOf`, `freeze`, `seal` and `preventExtensions`, each when the
   * expression's own call calls it. No other built-in is: not `getOrInsert` on
   * a `Map` or a `WeakMap`, which inserts (`docs/backlog.md` A64).
   *
   * Since 0.11.0.
   */
  readonly method?: string;
}
