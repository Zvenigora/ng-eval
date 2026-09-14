import { VariableDeclaration, VariableDeclarator } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { evaluatePattern } from './pattern';
import { isDangerousProperty } from './prototype-pollution-guard';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';
import { Context } from '../classes/common';
// Direct, not through the `common` barrel, which does not re-export it -
// `eval-context.ts` reaches for the same helper the same way.
import { setContextValue } from '../classes/common/context';

/**
 * The scope a declaration binds into: the innermost one on the stack.
 *
 * Read back from the stack rather than kept as a reference by whoever pushed
 * it, and that is the load-bearing half. `EvalContext.push` routes through
 * `fromContext`, which **copies** a plain record into a `Registry` when
 * `caseInsensitive` is set - so the object a visitor handed to `push` is not
 * always the object on the stack, and a binding written through the pre-push
 * record would be written into something nothing ever reads. It is also the
 * object `EvalState.declareConst` keys on, so both sides have to agree about
 * which one it is.
 *
 * Every route into a declaration pushes one first - `Program` for the top level,
 * `BlockStatement` for a block - so the absent case means the caller walked a
 * bare declaration node. Throwing is the answer rather than falling back to
 * `EvalContext.set`, which would write the caller's own context object: a `let`
 * that mutates the consumer's data is the behaviour this step exists to remove,
 * and doing it on an unsupported entry path would be the one place it survived.
 */
const bindingScope = (st: EvalState): Context => {

  const scope = st.context && st.context.scopes.length > 0
    ? st.context.scopes.peek()
    : undefined;

  if (!scope) {
    throw new Error('A variable declaration requires an enclosing scope.');
  }

  return scope;
}

/**
 * Binds one declarator's names into `scope`.
 *
 * The names come from `evaluatePattern`, which is the binder arrow-function
 * parameters already use - `Identifier` for the plain form, and the
 * `ObjectPattern` / `ArrayPattern` / `RestElement` forms for the destructuring
 * ones. Reusing it is what makes `let [p, q] = arr` work without a second
 * pattern implementation, and what makes a form it does not implement throw
 * (`AssignmentPattern`, i.e. `let { a = 1 } = o`) rather than bind nothing.
 *
 * The keys are re-checked against the pollution blocklist even though
 * `evaluatePattern` already wrote them through `safeSetProperty`. One line for
 * a guard that cannot be reasoned away from this call site: the record arrives
 * as a `BaseContext`, and the binder's own coverage of it is a property of
 * `pattern.ts` rather than of this module's contract with it.
 *
 * The write itself dispatches through `setContextValue`, not through
 * `safeSetProperty`. `safeSetProperty` finishes with `Object.defineProperty`,
 * which suits the plain records `pattern.ts` builds and **not** a scope: a
 * `caseInsensitive` scope is a Map-backed `Registry`, and defining a property
 * on the instance inserts nothing into its map. The binding would be written
 * and then not found, silently, for that option only.
 */
const bindDeclarator = (declarator: VariableDeclarator,
  value: unknown,
  kind: string,
  scope: Context,
  st: EvalState,
  callback: walk.WalkerCallback<EvalState>): void => {

  const bindings = evaluatePattern(declarator.id, st, callback, value);

  for (const key of Object.keys(bindings)) {
    if (isDangerousProperty(key)) {
      throw new Error(`Access to dangerous property "${key}" is blocked for security reasons`);
    }

    setContextValue(scope, key, bindings[key]);

    if (kind === 'const') {
      st.declareConst(scope, key);
    }
  }
}

/**
 * Evaluates a variable declaration: `let` and `const`, in the plain and
 * destructuring forms.
 *
 * Pushes {@link EMPTY_COMPLETION} on every exit path - a declaration produces no
 * completion value in JavaScript, and the sentinel rather than `undefined` is
 * what keeps `let x = 1` from winning over an earlier statement's value inside a
 * block. Pops one value per declarator that has an initialiser, and none for one
 * that does not, which is the arithmetic § 3.1's table states for this visitor.
 *
 * **No hoisting.** A binding exists from the point its declaration is reached,
 * so a read before it resolves the enclosing context rather than raising a
 * temporal-dead-zone error. An uninitialised `let` binds `undefined` and still
 * *shadows*, because `EvalContext.get` resolves a pushed scope by presence
 * rather than by value.
 *
 * **`var` is rejected here, not by the statement dispatcher.** The dispatcher
 * switches on node *type*, and `var x = 1` is a `VariableDeclaration` exactly as
 * `let x = 1` is - so registering this visitor is what stopped `var` reaching the
 * throwing `default:`. Function-scoped hoisting is a second scoping model beside
 * block scoping and is out of scope for this phase, so the rejection had to move
 * rather than disappear.
 *
 * No scope is pushed here: a declaration binds into the scope its enclosing
 * statement list already pushed, so there is no `try`/`finally` to pair and
 * nothing this visitor can leave behind on `EvalContext`.
 */
export const variableDeclarationVisitor = (node: VariableDeclaration, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  // Above `beforeVisitor`, deliberately. Four paths through this visitor throw,
  // and three of them have to throw from inside the bracket - they need the
  // walk to have started. This one reads `node.kind` and nothing else, so
  // rejecting before the hook dispatch keeps the most reachable of the four
  // from opening a frame it never closes. The others are covered the way every
  // throwing visitor in this library is: `evaluate`'s `catch` unwinds the open
  // nodes to its walk base.
  if (node.kind !== 'let' && node.kind !== 'const') {
    throw new Error(`Unsupported variable declaration kind: ${node.kind}`);
  }

  beforeVisitor(node, st);

  const scope = bindingScope(st);

  for (const declarator of node.declarations) {

    let value: unknown = undefined;

    if (declarator.init) {
      callback(declarator.init, st);
      value = popVisitorResult(node, st);
    }

    bindDeclarator(declarator, value, node.kind, scope, st, callback);
  }

  pushVisitorResult(node, st, EMPTY_COMPLETION);

  afterVisitor(node, st);
}

/**
 * Assigns to `key`, preferring a binding the evaluation itself created.
 *
 * The shared write path for `assignment-expression.ts` and
 * `update-expression.ts`. It lives in this module rather than one of its own on
 * the precedent `dispatchStatement` set in `program.ts`: the `const` kinds it
 * enforces are recorded here, and two importers is not yet a utility module. A
 * third is when it earns one.
 *
 * Order matters, and both steps are one lookup:
 *
 * 1. `scopeHolding` finds the innermost pushed scope that **binds** the key, or
 *    nothing. This is the same pass `EvalContext.get` resolves through, which is
 *    why it is asked of the context rather than re-walked here.
 * 2. A `const` in that scope is rejected before anything is written.
 * 3. Otherwise `setInScope` writes it - and when no scope bound the key at all,
 *    `set` does, which is the fallback `eval-signals` overrides to enforce its
 *    read-only policy. Routing around it would disable that policy silently.
 *
 * **The scope is resolved twice - here, and again inside `setInScope` - and that
 * is a cost, not a free abstraction.** `scopeHolding` goes through
 * `Stack.asArray()`, which copies and reverses, so each pass allocates. An
 * identifier write therefore costs two short scans plus two small arrays where
 * the pre-Phase-2 `set` cost none.
 *
 * Kept because `setInScope` is the single place that knows how to write a scope
 * - a `Registry` under `caseInsensitive`, a plain record otherwise - and
 * writing directly from here would put that dispatch in two modules, which is
 * the one mistake in this area that is silent when made wrong. The honest
 * alternative is to let `setInScope` take an already-resolved scope; that widens
 * a signature this phase has published and is step 5's call, not this step's,
 * because step 5 is where the cost multiplies: `for (let i = 0; i < n; i++)`
 * runs this path once per iteration, on top of the `get` in the test and the
 * `get` in the update. Recorded in the plan's step 5 rather than left here.
 */
export const assignToBinding = (st: EvalState, key: unknown, value: unknown, name: string): void => {

  if (!st.context) {
    throw new Error(`Context is not set.`);
  }

  const scope = st.context.scopeHolding(key);

  if (!scope) {
    st.context.set(key, value);
    return;
  }

  if (st.isConstBinding(scope, key)) {
    throw new Error(`Assignment to constant variable "${name}".`);
  }

  st.context.setInScope(key, value);
}
