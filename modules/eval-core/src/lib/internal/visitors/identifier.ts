import { Identifier } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { Registry } from '../public-api';
import { equalIgnoreCase } from './utils';
import { isDangerousProperty, mayMatchDangerousProperty } from './prototype-pollution-guard';

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

/**
 * Refuses an identifier whose name is on the prototype-pollution blocklist,
 * before any lookup, with the member visitor's error.
 *
 * An identifier is resolved against the context, and `EvalContext.get` reads a
 * plain object there - the original, or a scope - with a bare property access.
 * So up to 0.10.x a name on the blocklist resolved to what the context inherits
 * from `Object.prototype` (`docs/backlog-retired.md` B6): the blocklist guarded
 * member access to the objects an expression holds, and the context is not one
 * of them. Every kind of context is refused alike, including those - a
 * `Registry`, a signal context's source - that hold such a name only as a key
 * of their own.
 */
const refuseDangerousName = (node: Identifier) => {
  if (isDangerousProperty(node.name)) {
    throw new Error(`Access to dangerous property "${node.name}" is blocked for security reasons`);
  }
}

/**
 * Under `caseInsensitive`, refuses an identifier whose lookup matched a key on
 * the blocklist - `CONSTRUCTOR` over a context holding `constructor` - as the
 * member visitor re-checks `foundKey` for another object.
 *
 * The matched key is asked of `getKey`, which answers the key `get` resolves,
 * and only for a name `mayMatchDangerousProperty` lets through. Any other name
 * cannot match a blocklisted key, and an identifier must not pay a second
 * resolution for nothing: the performance spec's read-emission guard asserts
 * that, with no read hook, `getKey` is not called per identifier.
 */
const refuseDangerousMatch = (node: Identifier, st: EvalState) => {
  if (!st.context || !mayMatchDangerousProperty(node.name)) {
    return;
  }
  const matched = st.context.getKey(node.name);
  if (isDangerousProperty(matched)) {
    throw new Error(`Access to dangerous property "${String(matched)}" is blocked for security reasons`);
  }
}

export const identifierVisitor = (node: Identifier, st: EvalState) => {

  if (st.options?.caseInsensitive) {
    return identifierVisitorCaseInsensitive(node, st);
  }

  beforeVisitor(node, st);

  refuseDangerousName(node);

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

  refuseDangerousName(node);

  const context = st.context;

  const isThis = !!equalIgnoreCase(node.name, 'this');

  if (!isThis) {
    refuseDangerousMatch(node, st);
  }

  const value = isThis
    ? st.context
    : context?.get(node.name) ?? literals.get(node.name);

  if (st.hasHooks && st.hooks.hasReadHooks && !isThis) {
    emitRead(node, st, value);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
