import { ConditionalExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const conditionalExpressionVisitor = (node: ConditionalExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.test, st);

  const test = popVisitorResult(node, st) as boolean;

  if (test) {
    callback(node.consequent, st);
  } else {
    callback(node.alternate, st);
  }

  const value = popVisitorResult(node, st) as number;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
