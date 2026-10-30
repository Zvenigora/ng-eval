import { ArrowFunctionExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { walkWithoutResult } from '../functions/evaluate';
import { evaluatePatterns } from '.';
import { contextPop, contextPush } from './context-method';

export const arrowFunctionExpressionVisitor = (node: ArrowFunctionExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const fn = (...arrowArgs: unknown[]) => {
    const newContext = evaluatePatterns(node.params, st, callback, arrowArgs);

    // The scope stack lives on EvalContext, not on the per-walk EvalState, and
    // one EvalContext can back any number of evaluations - so a scope this
    // closure fails to pop outlives the walk and is read first by every later
    // evaluation on the same context. The body is a re-entrant walk, which
    // rethrows, so the pop needs `finally`.
    //
    // The `try` opens *after* the push, never around it. `contextPush` skips
    // an absent context, as the optional chain it replaced did: bringing it
    // inside would pair a `finally` pop with a push that never happened, and
    // would swallow a throw from evaluatePatterns into a pop as well.
    //
    // Both take the method from the context's class (`context-method.ts`).
    // This site is the one an expression could reach twice over: a planted
    // own `push` would be invoked here with the real context as its `this`,
    // and - since this closure's body is a re-entrant walk that pushes
    // again - a plant that evaluates anything recurses until the stack is
    // gone, leaving a reused context unusable (`docs/backlog.md` A42).
    contextPush(st.context, newContext, st.options);
    try {
      // `walkWithoutResult`, not `evaluate`: the body's walk records nothing
      // on `st.result`, which describes the entry-point walk alone - during
      // that walk and after it, however often this closure is called
      // (`docs/backlog-retired.md` A27).
      return walkWithoutResult(node.body, st);
    } finally {
      contextPop(st.context);
    }
  }

  // A new function per evaluation of this node, so recorded under a
  // member-write policy - `EvalContext.checkMemberWrite`.
  st.createdObjects?.add(fn);

  pushVisitorResult(node, st, fn);

  afterVisitor(node, st);
}


