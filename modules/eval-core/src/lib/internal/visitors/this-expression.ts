import { ThisExpression } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { refuseThisValue } from './this-position';

export const thisExpressionVisitor = (node: ThisExpression, st: EvalState) => {

  beforeVisitor(node, st);

  // Only a member's object pushes the context; anywhere else `this` is
  // refused (`this-position.ts`).
  refuseThisValue(node);

  const value = st.context;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
