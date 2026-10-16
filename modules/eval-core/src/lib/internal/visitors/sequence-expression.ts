import { SequenceExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';

/**
 * Evaluates a sequence, `(a, b, c)`: each expression in order, the value the
 * last one's.
 *
 * Registered rather than left to `acorn-walk`'s base walker, which walked the
 * expressions and popped none of them, so every value but the last stayed on
 * the stack: `(0, 1)` left one entry and `((1, 2), 3)` two, a reused state
 * accumulated them, and no hook saw the node (`docs/backlog-retired.md` A37).
 * Each value is popped as it arrives, so the visitor leaves exactly one.
 */
export const sequenceExpressionVisitor = (node: SequenceExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  let value: unknown;
  for (const expression of node.expressions) {
    callback(expression, st);
    value = popVisitorResult(node, st);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
