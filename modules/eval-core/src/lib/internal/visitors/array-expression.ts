import { ArrayExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const arrayExpressionVisitor = (node: ArrayExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const elements = node.elements.map((element) => {
    if (element === null || typeof element === 'undefined') {
      return element;
    }
    callback(element, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  pushVisitorResult(node, st, elements);

  afterVisitor(node, st);
}
