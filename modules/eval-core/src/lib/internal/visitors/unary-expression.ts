import { UnaryExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const unaryExpressionVisitor = (node: UnaryExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.argument, st);

  const argument = popVisitorResult(node, st) as number;

  const value =
    node.operator === '-' ? -argument :
    node.operator === '+' ? +argument :
    node.operator === '~' ? ~argument :
    node.operator === '!' ? !argument :
    undefined;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
