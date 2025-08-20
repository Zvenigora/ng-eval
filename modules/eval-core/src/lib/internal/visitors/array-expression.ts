import { AnyNode, ArrayExpression, Expression, SpreadElement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
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

  // Pre-allocate array with known length for better performance
  const itemCount = items.length;
  const elements: unknown[] = new Array(itemCount);
  let actualLength = 0;

  for (let i = 0; i < itemCount; i++) {
    const element = items[i];
    
    if (element === null || typeof element === 'undefined') {
      elements[actualLength++] = element;
    } else if (element.type === 'SpreadElement') {
      callback(element, st);
      const values = popVisitorResult(node, st) as unknown[];
      
      // Expand the array if needed for spread elements
      if (values && Array.isArray(values)) {
        for (const value of values) {
          elements[actualLength++] = value;
        }
      }
    } else {
      callback(element, st);
      const value = popVisitorResult(node, st);
      elements[actualLength++] = value;
    }
  }

  // Trim array to actual size if it changed due to spread elements
  if (actualLength !== itemCount) {
    elements.length = actualLength;
  }

  return elements;
}
