import { ArrowFunctionExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { doEval } from '../functions';
import { evaluatePatterns } from '.';

export const arrowFunctionExpressionVisitor = (node: ArrowFunctionExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const fn = (...arrowArgs: unknown[]) => {
    const newContext = evaluatePatterns(node.params, st, callback, arrowArgs);
    st.context?.push(newContext);
    const value = doEval(node.body, st);
    st.context?.pop();
    return value;
  }

  pushVisitorResult(node, st, fn);

  afterVisitor(node, st);
}


