import { BinaryExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
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
    // node.operator === 'in' ? left in right :
    // node.operator === 'instanceof' ? left instanceof right :
    // node.operator === '??' ? left ?? right :
    // node.operator === '&&' ? left && right :
    // node.operator === '||' ? left || right :
    // node.operator === '??=' ? left ??= right :
    // node.operator === '&&=' ? left &&= right :
    // node.operator === '||=' ? left ||= right :
    // node.operator === '??' ? left ?? right :
    undefined;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
