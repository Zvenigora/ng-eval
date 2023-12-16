import { AssignmentExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';

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

  const func = assignmentOperators[node.operator];

  if (!func) {
    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  } else if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (node.left.type === 'Identifier') {
    const key = node.left.name;
    const value = func(left, right);
    st.context.set(key, value);
    pushVisitorResult(node, st, value);
  } else if (node.left.type === 'MemberExpression') {
    const [object, key, ] = evaluateMember(node.left, st, callback);
    const value = func(left, right);
    (object as Record<string, unknown>)[key as string | number] = value;
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}

