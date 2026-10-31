import { AnyNode, AwaitExpression, ModuleDeclaration, Statement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { unwrapParentheses } from './utils';

// The refusal names `await` and the rule (`docs/backlog-retired.md` A24).
const AWAIT_POSITION_MESSAGE = 'Unsupported await position: an await is evaluated only as the result of the expression - the whole expression, an arrow function\'s expression body, or the last statement of a program or of an arrow function\'s block body.';

const asAwait = (node: AnyNode): AwaitExpression | undefined => {
  const inner = unwrapParentheses(node);
  return inner.type === 'AwaitExpression' ? inner : undefined;
};

const lastStatementAwait = (body: (Statement | ModuleDeclaration)[]): AwaitExpression | undefined => {
  const last = body[body.length - 1];
  return last?.type === 'ExpressionStatement' ? asAwait(last.expression) : undefined;
};

/**
 * The one `await` a walk rooted at `root` accepts, the one whose value is the
 * walk's result: the root itself; or the expression of the last statement of
 * a `Program`, or of an arrow function's `BlockStatement` body when
 * `arrowBody` is set. Read off the root one level deep, so nothing is
 * traversed, and computed per walk, so nothing is stored: the same node is
 * accepted as one walk's root and refused as another's operand
 * (`docs/backlog-retired.md` A24).
 *
 * Under `preserveParens` the root and the last statement's expression are
 * unwrapped first, as the assignment and update visitors unwrap their
 * targets, so `(await p)` is accepted where `await p` is. Only those two
 * places are unwrapped: a parenthesised operand, `((await p)) * 10`, is still
 * an operand, and the walk refuses it.
 *
 * @param root The node the walk starts at.
 * @param arrowBody Whether the walk is an arrow function's body.
 * @returns The accepted `await`, or `undefined`.
 */
export const acceptedAwait = (root: AnyNode, arrowBody: boolean): AwaitExpression | undefined => {
  const rootAwait = asAwait(root);
  if (rootAwait) {
    return rootAwait;
  }
  if (!arrowBody && root.type === 'Program') {
    return lastStatementAwait(root.body);
  }
  if (arrowBody && root.type === 'BlockStatement') {
    return lastStatementAwait(root.body);
  }
  return undefined;
};

export const awaitVisitor = (node: AwaitExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>, accepted = false) => {

  // Above `beforeVisitor`, as the `var` kind check is: the refusal reads the
  // node's position and nothing else, so a refused `await` fires no hook and
  // leaves no trace entry. The default table's entry refuses every `await`;
  // a walk that has an accepted one passes `accepted` for it alone
  // (`functions/evaluate.ts`).
  if (!accepted) {
    throw new Error(AWAIT_POSITION_MESSAGE);
  }

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

