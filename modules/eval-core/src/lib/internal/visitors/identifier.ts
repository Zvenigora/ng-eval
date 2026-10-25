import { Identifier } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { equalIgnoreCase } from './utils';
import { isDangerousProperty, mayMatchDangerousProperty } from './prototype-pollution-guard';
import { refuseThisValue } from './this-position';
import { literals } from './literal-names';

/**
 * Reports a resolved identifier read to the hook layer.
 *
 * The key is the one the context actually matched, so a case-insensitive
 * lookup reports the corrected spelling; `getKey` returns undefined for a name
 * the context does not hold - a literal-registry resolution, or a miss - and
 * the source name stands in. The path is always the source spelling, since it
 * is reconstructed statically.
 *
 * `scoped` marks a read of a name bound by any scope on the context's scope
 * stack when the name is read, whoever pushed it: an arrow-function
 * parameter, a declaration in the lexical scope `program.ts`,
 * `block-statement.ts` or `for-statement.ts` pushes, or a binding the caller
 * pushed with `EvalContext.push` before the walk - which is how `eval-signals`
 * binds a run's `AbortSignal` under `abortSignalKey`, and why that key never
 * reaches its `dependencies`. It is asked of `EvalContext.hasInScopes`, which
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
 * The scope stack is empty only for a walk that does not start at a `Program`
 * and has nothing pushed by its caller: `program.ts` pushes a scope at the root
 * of every walk through `EvalService`. `Stack.asArray` allocates, so that empty
 * case is short-circuited on length.
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

/**
 * The `caseInsensitive` read of a name: the context, then the literals
 * registry for a name `get` finds nothing for. Only `undefined` falls through,
 * so a key holding `null` reads as `null`. Up to 0.13.3 the fallback was
 * `??`, which turned that `null` into `undefined` (`docs/backlog.md` A52).
 */
const readCaseInsensitive = (node: Identifier, st: EvalState): unknown => {
  const found = st.context?.get(node.name);
  return found === undefined ? literals.get(node.name) : found;
}

/**
 * An identifier target's checks, which the visitor makes before any lookup: a
 * name on the blocklist, `this` written as a name - a host-built one, or under
 * `caseInsensitive` any spelling of it - and under `caseInsensitive` a name
 * whose lookup matched a blocklisted key. A target is never a member's object,
 * so `refuseThisValue` refuses every `this` that reaches it - unless a
 * host-built AST reused one `this` node as a member's object, visited first,
 * the mark-reuse limit `this-position.ts` describes. No target path evaluates
 * `this` to the context, so that node is written as a key named `this`.
 *
 * Every identifier target is checked here and by nothing else: `=`'s, which
 * reads nothing, and through {@link readIdentifierTarget} a compound or logical
 * operator's and an update's (`docs/a45/plan.md` D8, D11). Without it,
 * `constructor = 1` would write an own `constructor` onto the context, as
 * `constructor++` did up to 0.13.3.
 */
export const refuseIdentifierTarget = (node: Identifier, st: EvalState): void => {
  refuseDangerousName(node);

  const caseInsensitive = !!st.options?.caseInsensitive;

  if (caseInsensitive ? !!equalIgnoreCase(node.name, 'this') : node.name === 'this') {
    refuseThisValue(node);
  }

  if (caseInsensitive) {
    refuseDangerousMatch(node, st);
  }
}

/**
 * An assignment or update target's read, for a compound or logical operator
 * and for `++` and `--`: the visitor's own checks and read, with no push and
 * no node hooks, since the target is read and not walked (`docs/backlog.md`
 * A45, part 2). The checks are {@link refuseIdentifierTarget}'s, so a refused
 * target reads nothing. Then it reads the name as the visitor does, and
 * reports the read: up to 0.13.3 an identifier update reported none.
 */
export const readIdentifierTarget = (node: Identifier, st: EvalState): unknown => {
  refuseIdentifierTarget(node, st);

  const value = st.options?.caseInsensitive
    ? readCaseInsensitive(node, st)
    : st.context?.get(node.name);

  if (st.hasHooks && st.hooks.hasReadHooks) {
    emitRead(node, st, value);
  }

  return value;
}

export const identifierVisitor = (node: Identifier, st: EvalState) => {

  if (st.options?.caseInsensitive) {
    return identifierVisitorCaseInsensitive(node, st);
  }

  beforeVisitor(node, st);

  refuseDangerousName(node);

  const context = st.context;

  const isThis = node.name === 'this';

  // `this` written as a name, which only a host-built AST holds here, is
  // refused outside a member's object, as the `this` visitor refuses it
  // (`this-position.ts`).
  if (isThis) {
    refuseThisValue(node);
  }

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

  const isThis = !!equalIgnoreCase(node.name, 'this');

  // `This` is refused outside a member's object, as `this` is
  // (`this-position.ts`).
  if (isThis) {
    refuseThisValue(node);
  } else {
    refuseDangerousMatch(node, st);
  }

  const value = isThis
    ? st.context
    : readCaseInsensitive(node, st);

  if (st.hasHooks && st.hooks.hasReadHooks && !isThis) {
    emitRead(node, st, value);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
