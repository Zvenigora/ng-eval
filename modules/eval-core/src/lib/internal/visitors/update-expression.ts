import { UpdateExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { safeSetProperty } from './prototype-pollution-guard';
import { consultMemberWrite } from './member-write-policy';
import { assignToBinding } from './variable-declaration';
import { unwrapParentheses } from './utils';

export const updateExpressionVisitor = (node: UpdateExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // `(a)++` under `preserveParens` arrives wrapped (`docs/backlog-retired.md` A2).
  const target = unwrapParentheses(node.argument);

  if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (target.type === 'Identifier') {
    // The fallback `assignment-expression.ts` takes, for the same reason
    // (`docs/backlog-retired.md` A43).
    const key = st.options?.caseInsensitive
    ? st.context.getKey(target.name) ?? target.name
    : target.name;
    const value = st.context?.get(key);
    // The update run natively on a copy of the operand. JavaScript converts
    // the operand to a numeric once, then adds or subtracts, and a postfix
    // update gives that converted old value. `value + 1` on the operand as
    // read concatenated a string or an object, gave a postfix result
    // unconverted, and threw on a BigInt (`docs/backlog-retired.md` A41).
    // Running the operator itself is the conversion, BigInt included, which
    // `Number()` or a unary `+` is not. It runs before the write, here and in
    // the member branch, so an operand that cannot convert - a Symbol, a
    // throwing `valueOf` - throws with nothing written.
    let updated = value as number;
    const old = node.operator === '++' ? updated++ : updated--;
    // The same redirection as `assignment-expression.ts`, and the site that
    // matters for `for (let i = 0; …; i++)`: without it every loop counter this
    // library runs would be written into the consumer's context object, and
    // left there.
    assignToBinding(st, key, updated, target.name);
    pushVisitorResult(node, st, node.prefix ? updated : old);
  } else if (target.type === 'MemberExpression') {
    const [object, property, value] = evaluateMember(target, st, callback);
    // As in the identifier branch: one native conversion, before the write.
    let updated = value as number;
    const old = node.operator === '++' ? updated++ : updated--;

    // The same consultation as `assignment-expression.ts`'s member branch.
    const created = st.createdObjects;
    if (created) {
      consultMemberWrite(st, created, object, property);
    }

    // Use safe property assignment to prevent prototype pollution
    safeSetProperty(object, property, updated);

    pushVisitorResult(node, st, node.prefix ? updated : old);
  } else {
    // Without this the visitor reached `afterVisitor` having pushed nothing,
    // and every node downstream popped its neighbour's value. Pushes nothing:
    // `evaluate`'s `catch` closes the open nodes.
    throw new Error(`Unsupported update target: ${target.type}`);
  }

  afterVisitor(node, st);
}
