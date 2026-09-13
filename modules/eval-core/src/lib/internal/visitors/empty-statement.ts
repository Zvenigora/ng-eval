import { EmptyStatement } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';

/**
 * Evaluates an empty statement: it produces nothing, so it pushes
 * {@link EMPTY_COMPLETION} and an enclosing statement list keeps whatever
 * preceded it.
 *
 * One line of behaviour, and it exists because the statement dispatcher's
 * `default` throws: without it `a;;b` and `if (x) ;` would start raising
 * "unsupported statement type", which is a divergence from JavaScript nobody
 * chose.
 */
export const emptyStatementVisitor = (node: EmptyStatement, st: EvalState) => {

  beforeVisitor(node, st);

  pushVisitorResult(node, st, EMPTY_COMPLETION);

  afterVisitor(node, st);
}
