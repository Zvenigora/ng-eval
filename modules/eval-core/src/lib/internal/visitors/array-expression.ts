import { AnyNode, ArrayExpression, Expression, SpreadElement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const arrayExpressionVisitor = (node: ArrayExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const elements = evaluateArray(node, node.elements, st, callback);

  pushVisitorResult(node, st, elements);

  afterVisitor(node, st);
}

export const evaluateArray = (node: AnyNode,
  items: Array<Expression | SpreadElement | null>,
  st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  const elements = [];

  for (const element of items) {
    if (element === null || typeof element === 'undefined') {
      elements.push(element);
    } else if (element.type === 'SpreadElement') {
      callback(element, st);
      const values = popVisitorResult(node, st) as unknown[];
      elements.push(...values);
    } else {
      callback(element, st);
      const value = popVisitorResult(node, st);
      elements.push(value);
    }
  }

  return elements;
}
