import { LogicalExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const logicalExpressionVisitor = (node: LogicalExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.left, st);

  const left = popVisitorResult(node, st) as boolean;

  if (node.operator === '&&' && !left) {
    pushVisitorResult(node, st, left);
    afterVisitor(node, st);
    return;
  } else if (node.operator === '||' && left) {
    pushVisitorResult(node, st, true);
    afterVisitor(node, st);
    return;
  }

  callback(node.right, st);

  const right = popVisitorResult(node, st) as number;

  const value =
    node.operator === '&&' ? left && right :
    node.operator === '||' ? left || right :
    undefined;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
