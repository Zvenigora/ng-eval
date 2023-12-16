import { Identifier } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const identifierVisitor = (node: Identifier, st: EvalState) => {

  beforeVisitor(node, st);

  const context = st.context;

  const value = context?.get(node.name);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
