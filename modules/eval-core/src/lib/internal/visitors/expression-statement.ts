import { ExpressionStatement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';

/**
 * Evaluates an expression statement: its completion value is its expression's.
 *
 * A pass-through, and registered rather than left to `acorn-walk`'s base walker
 * for two reasons. The base walker fires no hooks, so a statement would be
 * invisible to a consumer watching the walk; and § 3.1's rule that every
 * statement visitor pushes exactly one value would have an exception whose only
 * justification is that this one happens to be cheap.
 */
export const expressionStatementVisitor = (node: ExpressionStatement, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.expression, st);

  const value = popVisitorResult(node, st);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
