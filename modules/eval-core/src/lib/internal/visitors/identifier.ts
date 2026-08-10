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

/**
 * Reports a resolved identifier read to the hook layer.
 *
 * The key is the one the context actually matched, so a case-insensitive
 * lookup reports the corrected spelling; `getKey` returns undefined for a name
 * the context does not hold - a literal-registry resolution, or a miss - and
 * the source name stands in. The path is always the source spelling, since it
 * is reconstructed statically.
 */
const emitRead = (node: Identifier, st: EvalState, value: unknown) => {
  const key = st.context?.getKey(node.name) ?? node.name;

  st.hooks.dispatchRead({
    kind: 'identifier',
    node,
    state: st,
    key,
    target: st.context,
    path: node.name,
    value
  });
}

export const identifierVisitor = (node: Identifier, st: EvalState) => {

  if (st.options?.caseInsensitive) {
    return identifierVisitorCaseInsensitive(node, st);
  }

  beforeVisitor(node, st);

  const context = st.context;

  const isThis = node.name === 'this';

  const value = isThis
    ? st.context
    : context?.get(node.name);

  // `this` resolves to the context object itself rather than to a key within
  // it, so it is not a read: reporting it would have a dependency tracker
  // record the whole context and re-fire on every change to it.
  if (st.hasHooks && !isThis) {
    emitRead(node, st, value);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

const identifierVisitorCaseInsensitive = (node: Identifier, st: EvalState) => {

  beforeVisitor(node, st);

  const context = st.context;

  const isThis = !!equalIgnoreCase(node.name, 'this');

  const value = isThis
    ? st.context
    : context?.get(node.name) ?? literals.get(node.name);

  if (st.hasHooks && !isThis) {
    emitRead(node, st, value);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
