import { UpdateExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { safeSetProperty } from './prototype-pollution-guard';
import { assignToBinding } from './variable-declaration';

const updateOperators = {
  '++': (value: number) => { return value + 1; },
  '--': (value: number) => { return value - 1; },
};

export const updateExpressionVisitor = (node: UpdateExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (node.argument.type === 'Identifier') {
    const key = st.options?.caseInsensitive
    ? st.context.getKey(node.argument.name)
    : node.argument.name;
    const value = st.context?.get(key);
    const newValue = updateOperators[node.operator](value as number);
    // The same redirection as `assignment-expression.ts`, and the site that
    // matters for `for (let i = 0; …; i++)`: without it every loop counter this
    // library runs would be written into the consumer's context object, and
    // left there.
    assignToBinding(st, key, newValue, node.argument.name);
    pushVisitorResult(node, st, node.prefix ? newValue : value);
  } else if (node.argument.type === 'MemberExpression') {
    const [object, property, value] = evaluateMember(node.argument, st, callback);
    const newValue = updateOperators[node.operator](value as number);
    
    // Use safe property assignment to prevent prototype pollution
    safeSetProperty(object, property, newValue);
    
    pushVisitorResult(node, st, node.prefix ? newValue : value);
  }

  afterVisitor(node, st);
}
