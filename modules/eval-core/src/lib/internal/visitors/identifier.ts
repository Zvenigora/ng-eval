import { Identifier } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { Registry } from '../public-api';
import { equalIgnoreCase } from './utils';

const literals: Registry<string, unknown>= Registry.fromObject({
  'undefined': undefined,
  'null': null,
  'true': true,
  'false': false,
}, { caseInsensitive: true });

export const identifierVisitor = (node: Identifier, st: EvalState) => {

  if (st.options?.caseInsensitive) {
    return identifierVisitorCaseInsensitive(node, st);
  }

  beforeVisitor(node, st);

  const context = st.context;

  const value = node.name === 'this'
    ? st.context
    : context?.get(node.name);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

const identifierVisitorCaseInsensitive = (node: Identifier, st: EvalState) => {

  beforeVisitor(node, st);

  const context = st.context;

  const value = equalIgnoreCase(node.name, 'this')
    ? st.context
    : context?.get(node.name) ?? literals.get(node.name);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
