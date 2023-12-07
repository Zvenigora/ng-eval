import { Literal } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';

export const literalVisitor = (node: Literal, st: EvalState) => {

  beforeVisitor(node, st);

  const value = node.value;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
