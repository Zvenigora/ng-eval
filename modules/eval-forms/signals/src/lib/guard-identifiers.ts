import type { parse } from '@zvenigora/ng-eval-core';
import { simple } from 'acorn-walk';

/**
 * Throws if the expression names an identifier that is an own property of
 * `Object.prototype` (plan S 3.8).
 *
 * **The failure this prevents is silent and truthy.** `createSignalContext`
 * builds its context on an empty `original` object, and `EvalContext.get`
 * consults `original` *before* `lookups` - so an identifier like
 * `constructor` resolves off the prototype and never reaches the model
 * resolver at all. A function is truthy, so `toVisible` says visible and
 * `evalVisible(p.city, 'constructor')` renders the field with no data, no
 * error and nothing logged (Q10, Q11). It is not GHSA-pj3p-xpg7-h7gw's
 * case-variant bypass: the behaviour is identical with and without
 * `caseInsensitive`, and `CONSTRUCTOR` resolves `undefined` in both.
 *
 * **The subject is the expression, not the field name** - which is what makes
 * this the same answer `/reactive` gives (`field-schema.ts:172-178`) on a
 * different input. There the field names arrive in the library's own
 * `FieldSchema[]`; here the paths are compile-time `p.city` tokens and the
 * library never sees a name it could validate. What it does see, at
 * registration, is the expression. A model key nobody names harms nobody, so
 * the expression is the complete subject and this check inherits none of the
 * growing-key-set problem a scan of the model would have.
 *
 * **The predicate is normative and any list of names is illustrative**
 * (S 3.8.1, revision 18 item 2). `Object.getOwnPropertyNames(Object.prototype)`
 * is twelve names: the seven a form author might plausibly type -
 * `constructor`, `toString`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`,
 * `propertyIsEnumerable`, `toLocaleString` - plus `__proto__` and the four
 * `__define*` / `__lookup*` accessors. Hard-coding the seven would satisfy
 * every other criterion of this step, which is why one of the other five is
 * asserted.
 *
 * **Deliberately over-rejecting** (S 3.8.1). An arrow's own frame is
 * genuinely safe - `EvalContext.get` resolves `scopes` at step 1 and
 * `original` at step 2, so a bound `valueOf` shadows the prototype and
 * resolves correctly - and `'[1].map(valueOf => valueOf)'` is refused anyway.
 * The scope-aware alternative is a second copy of `eval-core`'s frame logic,
 * tracking two scope-pushing visitors this library does not own, that fails
 * by *under*-rejecting when it drifts. The costs are asymmetric: a named
 * error at registration, whose fix is renaming a parameter, against a field
 * that always renders in production.
 *
 * **`acorn-walk`'s `simple`, borrowed rather than hand-rolled** (S 0.1) - the
 * same package `eval-core` walks with. Two of its properties are load-bearing
 * rather than incidental, and both are pinned by specs:
 *
 * - its base walker descends into `node.property` only when `node.computed`,
 *   so `user.constructor` is **not** seen as an `Identifier`. That is
 *   `eval-core`'s prototype-pollution guard's business and the stated upper
 *   bound of this one;
 * - `base.Function` walks parameters under the `"Pattern"` override, which
 *   `simple` suppresses, so a **binding** is never visited while a
 *   **reference** is. `'[1].map(valueOf => 1)'` therefore registers.
 *
 * A hand-rolled scan over every node would reject both, which is the
 * difference the borrow is checked at.
 *
 * @param expression the source, named in the message so an author can tell
 * which of a schema's rules to fix
 * @param node the AST the registrar has just parsed. Typed
 * `ReturnType<typeof parse>` rather than `AnyNode`: `eval-core` publishes
 * `AnyNodeTypes` and not `AnyNode`, so spelling it out would force
 * `import type { AnyNode } from 'acorn'` - an undeclared dependency whose
 * shortest fix is the `acorn` peer S 3.8 rejects.
 */
export const guardIdentifiers = (expression: string, node: ReturnType<typeof parse>): void => {

  // `parse`'s declared return is `Program | AnyNode | undefined` and `simple`
  // takes a `Node`, so the narrowing is forced by the signature rather than
  // by a case this package can reach: `prepare` passes `defaultParserOptions`,
  // which sets `extractExpressions: false`, and `parse` then returns the
  // `Program` unconditionally. `undefined` is `extractExpression`'s answer
  // when a program's body is not exactly one `ExpressionStatement` - `'a; b'`
  // as much as the empty program - so a caller passing different options
  // could produce it.
  //
  // **No spec covers this branch, and skipping the walk is still right if one
  // ever reaches it**: nothing to walk is nothing to reject, and the caller
  // hands the same value to `compile`, whose `evaluate` already answers
  // `undefined` for a falsy node. The guard changes no contract by declining.
  if (node === undefined) {
    return;
  }

  simple(node, {
    Identifier(identifier) {
      if (Object.prototype.hasOwnProperty.call(Object.prototype, identifier.name)) {
        throw new Error(
          `Expression '${expression}': identifier '${identifier.name}' is a member of ` +
          `Object.prototype and cannot be resolved reliably: it reads the prototype's ` +
          `value whenever the model holds no such key, so the rule sees a function - ` +
          `which is truthy - rather than the absence it was written for. Rename the ` +
          `model key, or the parameter that binds it.`
        );
      }
    },
  });
};
