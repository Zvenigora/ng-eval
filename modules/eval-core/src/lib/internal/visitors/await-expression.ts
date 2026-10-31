import { AwaitExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const awaitVisitor = (node: AwaitExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // Outside any `Promise` executor, and uncaught here, as in every other
  // visitor: a synchronous throw from the operand propagates synchronously, and
  // `evaluate`'s `catch` unwinds the open nodes. Inside an executor it became a
  // rejected promise, which the sync entry points returned instead of throwing
  // while the walk carried on with the operand still open
  // (`docs/backlog-retired.md` A1).
  callback(node.argument, st);

  const value = popVisitorResult(node, st);

  // Passed through unchanged: nothing races it, wraps it, reads a timeout
  // for it or rewrites its rejection (`docs/backlog-retired.md` A25). A
  // promise that reaches the result is resolved there by `evaluateAsync`.
  pushVisitorResult(node, st, value);

  afterVisitor(node, st);

}

