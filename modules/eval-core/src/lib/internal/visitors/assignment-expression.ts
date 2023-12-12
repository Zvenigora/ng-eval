import { AssignmentExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalContext, EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

const assignmentOperators = {
  '=': (left: number, value: number) => { return left = value; },
  '+=': (left: number, value: number) => { return left += value; },
  '-=': (left: number, value: number) => { return left -= value; },
  '*=': (left: number, value: number) => { return left *= value; },
  '/=': (left: number, value: number) => { return left /= value; },
  '%=': (left: number, value: number) => { return left %= value; },
  '**=': (left: number, value: number) => { return left **= value; },
  '<<=': (left: number, value: number) => { return left <<= value; },
  '>>=': (left: number, value: number) => { return left >>= value; },
  '>>>=': (left: number, value: number) => { return left >>>= value; },
  '&=': (left: number, value: number) => { return left &= value; },
  '^=': (left: number, value: number) => { return left ^= value; },
  '|=': (left: number, value: number) => { return left |= value; },
  '&&=': (left: number, value: number) => { return left &&= value; },
  '||=': (left: number, value: number) => { return left ||= value; },
  '??=': (left: number, value: number) => { return left ??= value; },
};




export const assignmentExpressionVisitor = (node: AssignmentExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.left, st);

  const left = popVisitorResult(node, st) as number;

  callback(node.right, st);

  const right = popVisitorResult(node, st) as number;

  const key = node.left.type === 'Identifier' ? node.left.name
    // : node.left.type === 'MemberExpression' ? node.left.property.name
    : undefined;

  const func = assignmentOperators[node.operator];

  if (!func) {
    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  } else if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (st.context) {
    const value = func(left, right);
    st.context.set(key, value);
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}

