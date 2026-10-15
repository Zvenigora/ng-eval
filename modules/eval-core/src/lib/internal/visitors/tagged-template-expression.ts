import { TaggedTemplateExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { callMember, safeCall } from './call-expression';
import { evaluateMember } from './member-expression';
import { consultMethodWrite } from './member-write-policy';

/**
 * The tag's arguments: the template's cooked strings, then the value of each
 * of its expressions, evaluated in order.
 */
const templateArguments = (node: TaggedTemplateExpression, st: EvalState,
  callback: walk.WalkerCallback<EvalState>): unknown[] => {

  const values = node.quasi.expressions.map((expression) => {
    callback(expression, st);
    return popVisitorResult(node, st);
  });

  const strings = node.quasi.quasis.map((templateElement) => templateElement.value.cooked);

  return [strings, ...values];
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
 * - Any other tag is called with the context as `this`, as a bare call is,
 *   and checked under its identifier's name, or none.
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
    callback(node.tag, st);
    const tag = popVisitorResult(node, st);
    const args = templateArguments(node, st, callback);
    const tagName = node.tag.type === 'Identifier' ? node.tag.name : undefined;

    const created = st.createdObjects;
    if (created) {
      consultMethodWrite(st, created, tag, st.context, args);
    }
    const value = safeCall(tag, st.context, args, false, tagName);
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}
