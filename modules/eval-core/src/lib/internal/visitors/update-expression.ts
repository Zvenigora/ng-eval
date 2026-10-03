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

const updateOperators = {
  '++': (value: number) => { return value + 1; },
  '--': (value: number) => { return value - 1; },
};

export const updateExpressionVisitor = (node: UpdateExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // `(a)++` under `preserveParens` arrives wrapped (`docs/backlog-retired.md` A2).
  const target = unwrapParentheses(node.argument);

  if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (target.type === 'Identifier') {
    const key = st.options?.caseInsensitive
    ? st.context.getKey(target.name)
    : target.name;
    const value = st.context?.get(key);
    const newValue = updateOperators[node.operator](value as number);
    // The same redirection as `assignment-expression.ts`, and the site that
    // matters for `for (let i = 0; …; i++)`: without it every loop counter this
    // library runs would be written into the consumer's context object, and
    // left there.
    assignToBinding(st, key, newValue, target.name);
    pushVisitorResult(node, st, node.prefix ? newValue : value);
  } else if (target.type === 'MemberExpression') {
    const [object, property, value] = evaluateMember(target, st, callback);
    const newValue = updateOperators[node.operator](value as number);

    // The same consultation as `assignment-expression.ts`'s member branch.
    const created = st.createdObjects;
    if (created) {
      consultMemberWrite(st, created, object, property);
    }

    // Use safe property assignment to prevent prototype pollution
    safeSetProperty(object, property, newValue);

    pushVisitorResult(node, st, node.prefix ? newValue : value);
  } else {
    // Without this the visitor reached `afterVisitor` having pushed nothing,
    // and every node downstream popped its neighbour's value. Pushes nothing:
    // `evaluate`'s `catch` closes the open nodes.
    throw new Error(`Unsupported update target: ${target.type}`);
  }

  afterVisitor(node, st);
}
