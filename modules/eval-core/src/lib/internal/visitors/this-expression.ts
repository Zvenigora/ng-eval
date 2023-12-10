import { ThisExpression } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const thisExpressionVisitor = (node: ThisExpression, st: EvalState) => {

  beforeVisitor(node, st);

  const value = st.context;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
