import { UpdateExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';

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
    st.context?.set(key, newValue);
    pushVisitorResult(node, st, node.prefix ? newValue : value);
  } else if (node.argument.type === 'MemberExpression') {
    callback(node.argument, st);
    const [ , property, value] = evaluateMember(node.argument, st, callback);
    const newValue = updateOperators[node.operator](value as number);
    st.context?.set(property, newValue);
    pushVisitorResult(node, st, node.prefix ? newValue : value);
  }

  afterVisitor(node, st);
}
