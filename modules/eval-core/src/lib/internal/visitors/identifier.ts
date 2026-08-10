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
 *
 * `scoped` marks a read of a name bound by a scope pushed *during this walk* -
 * an arrow-function parameter. It is asked of `EvalContext.hasInScopes`, which
 * tests for the binding rather than for its value: a parameter bound to
 * `undefined` is still a parameter, and reading the flag off the resolved value
 * would make it vary with the data rather than with the expression.
 *
 * It is deliberately *not* set for `priorScopes`: those hold caller-registered,
 * long-lived objects and are real dependencies, so the discriminator is
 * lifetime rather than `instanceof EvalScope`. The property is omitted rather
 * than set to false, so absent reads as "not scoped" the same way it does at
 * the member emission sites.
 *
 * The scope stack is empty for any expression without an arrow function, and
 * `Stack.asArray` allocates, so the common case is short-circuited on length.
 */
const emitRead = (node: Identifier, st: EvalState, value: unknown) => {
  const key = st.context?.getKey(node.name) ?? node.name;
  const scoped = !!st.context
    && st.context.scopes.length > 0
    && st.context.hasInScopes(node.name);

  st.hooks.dispatchRead({
    kind: 'identifier',
    node,
    state: st,
    key,
    target: st.context,
    path: node.name,
    value,
    ...(scoped ? { scoped: true } : {})
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
  if (st.hasHooks && st.hooks.hasReadHooks && !isThis) {
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

  if (st.hasHooks && st.hooks.hasReadHooks && !isThis) {
    emitRead(node, st, value);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
