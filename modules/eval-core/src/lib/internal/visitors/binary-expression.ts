import { BinaryExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const binaryExpressionVisitor = (node: BinaryExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.left, st);

  const left = popVisitorResult(node, st) as number;

  callback(node.right, st);

  const right = popVisitorResult(node, st) as number;

  const value =
    node.operator === '+' ? left + right :
    node.operator === '-' ? left - right :
    node.operator === '*' ? left * right :
    node.operator === '/' ? left / right :
    node.operator === '%' ? left % right :
    node.operator === '**' ? left ** right :
    node.operator === '<<' ? left << right :
    node.operator === '>>' ? left >> right :
    node.operator === '>>>' ? left >>> right :
    node.operator === '&' ? left & right :
    node.operator === '^' ? left ^ right :
    node.operator === '|' ? left | right :
    node.operator === '==' ? left == right :
    node.operator === '!=' ? left != right :
    node.operator === '===' ? left === right :
    node.operator === '!==' ? left !== right :
    node.operator === '<' ? left < right :
    node.operator === '<=' ? left <= right :
    node.operator === '>' ? left > right :
    node.operator === '>=' ? left >= right :
    node.operator === 'in' ? (left as unknown as string) in (right as unknown as object):
    node.operator === 'instanceof' ? (left as unknown as object) instanceof (right  as unknown as ()=> unknown):
    node.operator === '??' ? left ?? right :
    undefined;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
