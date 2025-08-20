import { LogicalExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const logicalExpressionVisitor = (node: LogicalExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.left, st);
  const left = popVisitorResult(node, st);

  // For && operator: if left is falsy, return left (don't evaluate right)
  if (node.operator === '&&' && !left) {
    pushVisitorResult(node, st, left);
    afterVisitor(node, st);
    return;
  }

  // For || operator: if left is truthy, return left (don't evaluate right)
  if (node.operator === '||' && left) {
    pushVisitorResult(node, st, left);
    afterVisitor(node, st);
    return;
  }

  // For ?? operator: if left is not null/undefined, return left (don't evaluate right)
  if (node.operator === '??' && left !== null && left !== undefined) {
    pushVisitorResult(node, st, left);
    afterVisitor(node, st);
    return;
  }

  // Evaluate right operand
  callback(node.right, st);
  const right = popVisitorResult(node, st);

  // Return the appropriate value based on operator
  let value: unknown;
  switch (node.operator) {
    case '&&':
      value = left && right;
      break;
    case '||':
      value = left || right;
      break;
    case '??':
      value = left ?? right;
      break;
    default:
      throw new Error(`Unsupported logical operator: ${node.operator}`);
  }

  pushVisitorResult(node, st, value);
  afterVisitor(node, st);
}
