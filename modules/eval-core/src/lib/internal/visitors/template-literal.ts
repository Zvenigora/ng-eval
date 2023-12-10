import { TemplateLiteral } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';

export const templateLiteralVisitor = (node: TemplateLiteral, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const expressions = node.expressions.map((expression) => {
    callback(expression, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  const value = node.quasis.reduce((accumulator, templateElement, index) => {
    accumulator += templateElement.value.cooked;
    if (!templateElement.tail) {
      accumulator += expressions[index] ?? '';
    }
    return accumulator;
  }, '');

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

