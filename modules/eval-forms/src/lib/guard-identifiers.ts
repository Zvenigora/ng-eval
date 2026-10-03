import type { parse } from '@zvenigora/ng-eval-core';
import { simple } from 'acorn-walk';

/**
 * Throws if the expression names an identifier that is an own property of
 * `Object.prototype` (plan S 3.8). Both adapters call it, before compiling: the
 * `/signals` registrars between `parse` and `compile`, and `/reactive`'s
 * `bindFieldProperties` in the validation pass that checks field and control
 * names. Shared here, beside `applyErrorPolicy`, so the two cannot drift into
 * disagreeing about one authored string - which until 0.3.0 they did, since
 * the guard was `/signals`' alone (`docs/backlog-retired.md` D2).
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
 * **The subject is the expression.** `/reactive` also checks *names* - its
 * schema's fields and its group's controls (`field-schema.ts`), which arrive
 * in the library's own hands. `/signals` never sees a name it could validate:
 * its paths are compile-time `p.city` tokens. What both see is the
 * expression. A key nobody names harms nobody, so the expression is the
 * complete subject and this check inherits none of the growing-key-set problem
 * a scan of the model would have.
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
 * **A name the expression binds itself is refused when it is read, and that
 * refuses nothing that worked.** `'[1].map(valueOf => valueOf)'` throws here.
 * S 3.8.1 called this a deliberate over-rejection, on the ground that the
 * arrow's own frame shadows the prototype and would resolve correctly; it
 * would not. `eval-core` refuses to bind any of these names - an arrow
 * parameter or a `let` - and throws `Access to dangerous property` on every
 * evaluation (measured 2026-10-03, `docs/backlog-retired.md` D2), so the
 * expression never produced a value. What this guard changes is *when* it
 * fails: at registration, naming the identifier, rather than at every
 * evaluation, where a default policy renders a blank.
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
 *   **reference** is. `'[1].map(valueOf => 1)'` therefore registers - and
 *   then fails at every evaluation, on `eval-core`'s refusal to bind the name.
 *
 * A hand-rolled scan over every node would reject both, which is the
 * difference the borrow is checked at.
 *
 * @param expression the source, named in the message so an author can tell
 * which of a schema's rules to fix
 * @param node the AST the caller has just parsed. Typed
 * `ReturnType<typeof parse>` rather than `AnyNode`: `eval-core` publishes
 * `AnyNodeTypes` and not `AnyNode`, so spelling it out would force
 * `import type { AnyNode } from 'acorn'` - an undeclared dependency whose
 * shortest fix is the `acorn` peer S 3.8 rejects.
 */
export const guardIdentifiers = (expression: string, node: ReturnType<typeof parse>): void => {

  // `parse`'s declared return is `Program | AnyNode | undefined` and `simple`
  // takes a `Node`, so the narrowing is forced by the signature rather than
  // by a case this package can reach: both callers - `/signals`' `prepare` and
  // `/reactive`'s `validate` - pass `defaultParserOptions`, which sets
  // `extractExpressions: false`, and `parse` then returns the
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
