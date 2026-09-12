import { ArrowFunctionExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { evaluate } from '../functions';
import { evaluatePatterns } from '.';

export const arrowFunctionExpressionVisitor = (node: ArrowFunctionExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const fn = (...arrowArgs: unknown[]) => {
    const newContext = evaluatePatterns(node.params, st, callback, arrowArgs);

    // The scope stack lives on EvalContext, not on the per-walk EvalState, and
    // one EvalContext can back any number of evaluations - so a scope this
    // closure fails to pop outlives the walk and is read first by every later
    // evaluation on the same context. The body is re-entrant `evaluate`, which
    // rethrows, so the pop needs `finally`.
    //
    // The `try` opens *after* the push, never around it. `push` is optionally
    // chained: bringing it inside would pair a `finally` pop with a push that
    // the same optional chain had skipped, and would swallow a throw from
    // evaluatePatterns into a pop as well.
    st.context?.push(newContext);
    try {
      return evaluate(node.body, st);
    } finally {
      st.context?.pop();
    }
  }

  pushVisitorResult(node, st, fn);

  afterVisitor(node, st);
}


