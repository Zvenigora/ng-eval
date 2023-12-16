import { TaggedTemplateExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';

export const taggedTemplateExpressionVisitor = (node: TaggedTemplateExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.tag, st);
  const tag = popVisitorResult(node, st) as (...args: unknown[]) => unknown;

  const quasiExpressions = node.quasi.expressions.map((expression) => {
    callback(expression, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  const quasi = node.quasi.quasis.map((templateElement) => {
    return templateElement.value.cooked;
  });

  const value = tag.apply(st.context, [quasi, ...quasiExpressions]);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
