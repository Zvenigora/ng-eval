import { TaggedTemplateExpression, TemplateLiteral } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { callMember, safeCall } from './call-expression';
import { evaluateMember } from './member-expression';
import { consultMethodWrite } from './member-write-policy';
import { exemptFromFunnel } from './dangerous-values';
import { guardedReceiver } from './context-receiver';

/**
 * Each template site's template object, by its `TemplateLiteral` node.
 *
 * A module-level weak collection keyed by an AST node and never cleared, as
 * `dangerous-values.ts`' `exemptNodes` is, and keyed by an object as
 * `property-lookup-cache.ts` is: an entry lives exactly as long as its node,
 * and nothing one node holds can be read for another. What it does not do,
 * beside that cache: it has no clear and no statistics, and is never
 * invalidated, since a node's strings do not change - for an AST its caller
 * leaves alone; one that rewrites a node's `quasis` after a first evaluation
 * keeps the old object, as `exemptNodes` keeps its marks. The object is shared
 * by every walk of the node, over any state and context, and through a
 * `ParserService`'s parse cache by every consumer of that service - in an
 * application, the root singleton - parsing the same text with the same
 * options. That is safe because the object is frozen and holds only the
 * template's own strings.
 */
const templateObjects = new WeakMap<TemplateLiteral, readonly (string | undefined)[]>();

/**
 * The site's template object, as JavaScript builds it: the cooked strings,
 * an invalid escape's cooked string `undefined`, with a non-enumerable `raw`
 * of the uncooked strings, both frozen, and the same object every time the
 * site runs (`docs/backlog-retired.md` A38). Up to 0.14.1 it was a plain array
 * of the cooked strings, built on every evaluation, with no `raw`.
 *
 * Not added to `st.createdObjects`: the walk did not create it for the
 * expression to hold, as `EvalMemberWrite.createdByEvaluation` defines
 * created, so a write policy is asked about it as about any other object.
 */
const templateObject = (quasi: TemplateLiteral): readonly (string | undefined)[] => {
  let strings = templateObjects.get(quasi);

  if (!strings) {
    const cooked = quasi.quasis.map((element) => element.value.cooked ?? undefined);
    const raw = Object.freeze(quasi.quasis.map((element) => element.value.raw));
    // Not writable, enumerable or configurable, as JavaScript defines it.
    Object.defineProperty(cooked, 'raw', { value: raw });
    strings = Object.freeze(cooked);
    templateObjects.set(quasi, strings);
  }

  return strings;
};

/**
 * The tag's arguments: the template object, then the value of each of its
 * expressions, evaluated in order.
 */
const templateArguments = (node: TaggedTemplateExpression, st: EvalState,
  callback: walk.WalkerCallback<EvalState>): unknown[] => {

  const values = node.quasi.expressions.map((expression) => {
    callback(expression, st);
    return popVisitorResult(node, st);
  });

  return [templateObject(node.quasi), ...values];
};

/**
 * Calls the tag as a call calls its callee (`call-expression.ts`): past the
 * context's write policy, then through the call sandbox.
 *
 * - A member tag goes through `callMember`, as a member call does: `obj.m`
 *   is called with `obj` as `this` - or a prior scope's `thisArg` - and checked
 *   under the property name, a computed key included. Its own
 *   `MemberExpression` is evaluated by `evaluateMember`, not visited, so it
 *   raises no `before` or `after` node-hook events and leaves no trace entry,
 *   as a member callee does. Its read event still fires.
 * - Any other tag is called with a guarded view of the context as `this`, as
 *   a bare call is (`context-receiver.ts`), and checked under its
 *   identifier's name, or none. Up to 0.12.1 that was the context itself.
 *
 * The tag is evaluated before the template's expressions, as in JavaScript;
 * a call evaluates its arguments first.
 *
 * Up to 0.12.0 the tag was applied directly, with the context as `this` and no
 * check at all, so `` Function`return 7`() `` ran (`docs/backlog-retired.md`
 * A36).
 */
export const taggedTemplateExpressionVisitor = (node: TaggedTemplateExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  if (node.tag.type === 'MemberExpression') {
    const member = evaluateMember(node.tag, st, callback);
    const args = templateArguments(node, st, callback);
    const value = callMember(st, member, args, false);
    pushVisitorResult(node, st, value);
  } else {
    // As a call's callee: the tag's own value is checked by `safeCall`.
    exemptFromFunnel(node.tag);
    callback(node.tag, st);
    const tag = popVisitorResult(node, st);
    const args = templateArguments(node, st, callback);
    const tagName = node.tag.type === 'Identifier' ? node.tag.name : undefined;

    const created = st.createdObjects;
    if (created) {
      consultMethodWrite(st, created, tag, st.context, args);
    }
    // A bare tag's `this` is a guarded view, as a bare call's is
    // (`context-receiver.ts`); the write policy above keeps the real context.
    const value = safeCall(tag, guardedReceiver(st.context), args, false, tagName);
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}
