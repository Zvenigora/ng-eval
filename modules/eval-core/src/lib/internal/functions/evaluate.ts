import { EMPTY_COMPLETION, EvalState } from '../classes/eval';
import * as walk from 'acorn-walk';
import { getDefaultVisitors, popVisitorResult } from '../visitors';
import { AnyNode } from 'acorn';

/**
 * Applies § 3.1's rule 4: the empty-completion sentinel never leaves an
 * evaluation's return value.
 *
 * It is converted here, at the walk boundary, rather than in the `Program`
 * visitor. `arrow-function-expression.ts` calls `evaluate` on a
 * `BlockStatement` for a block-bodied arrow, so a conversion sited in `Program`
 * would let `x => { }` hand the sentinel straight to a consumer. Converting
 * where the walk ends covers both entry points by construction.
 */
const completionValue = (value: unknown): unknown =>
  value === EMPTY_COMPLETION ? undefined : value;

/**
 * The merged visitor table every walk dispatches through: this library's
 * visitors laid over `acorn-walk`'s base walker, built once.
 *
 * **`walk.recursive` merges per call, and the merge is not cheap.** Handed a
 * `funcs` object it calls `walk.make(funcs, base)`, which allocates an object
 * and copies every entry onto it - once per `evaluate`, not once per node.
 * Measured on the built bundle, walking a single `Literal`, which visits one
 * node and so is almost entirely this fixed cost:
 *
 * | visitor entries | per-call merge | merged once |
 * | --------------- | -------------- | ----------- |
 * | 19 (before statements) | 0.422 us | - |
 * | 22 (with statements)   | 1.045 us | 0.226 us |
 *
 * Three more entries more than doubled it, which is a cliff rather than a
 * slope - the copy crosses a threshold where the engine stops treating the
 * result as a fast-property object. Merging once removes the whole class of
 * problem: it is faster than the pre-statement baseline, and it stops the
 * remaining statement visitors of this phase from making it worse again.
 *
 * `{}` is still passed as `funcs` at the call sites so that `make` has nothing
 * to copy; the per-walk object is then an empty `Object.create(DEFAULT_VISITORS)`
 * and every lookup is a prototype hit.
 *
 * Frozen, and lazily built, for two different reasons:
 *
 * - **Frozen** because this table is shared by every walk in the process -
 *   `EvalService` is `providedIn: 'root'` - so a visitor that wrote to it would
 *   reach every later evaluation, including other consumers'. Nothing writes to
 *   it today; freezing is what keeps that true, turning a silent cross-walk
 *   mutation into a throw. `getDefaultVisitors()` still returns a **fresh,
 *   mutable** object to anyone who calls it, so no caller loses anything.
 * - **Lazily** because a module-level `const` deadlocks the flattened bundle:
 *   `arrow-function-expression.ts` imports `evaluate`, so this module is
 *   initialised first and `getDefaultVisitors()` at module scope reads that
 *   visitor before its binding exists. Measured, not guessed - the built
 *   package threw `Cannot access 'arrowFunctionExpressionVisitor' before
 *   initialization` on import.
 */
let defaultVisitors: walk.RecursiveVisitors<EvalState> | undefined;

const mergedVisitors = (): walk.RecursiveVisitors<EvalState> =>
  (defaultVisitors ??= Object.freeze(walk.make<EvalState>(getDefaultVisitors())));

/**
 * Evaluates the given node and returns the result.
 *
 * @param node The node to evaluate.
 * @param state The evaluation state.
 * @returns The result of the evaluation.
 */
export const evaluate = (node: AnyNode | undefined, state: EvalState)
  : unknown | undefined => {

  if (node) {

    state.result.start();

    // Captured inside the `if (node)` block on purpose: callers reach the early
    // return above with a bare state that has no hooks to read. Do not hoist.
    //
    // The mark is recorded on the state as well as held here, so that
    // `EvalHooks.exit` - called from a visitor, which has no route to this
    // local - can tell a node open in this walk from one open only in an
    // enclosing walk. Pushed under the same guard the mark is read under, and
    // the local `hooked` keeps the pair symmetric if a hook is registered
    // mid-walk.
    const hooked = state.hasHooks;
    const mark = hooked ? state.hooks.pushWalkBase(state) : 0;

    // Unguarded, unlike the walk base above: the iteration budget refills on
    // the outermost entry whether or not hooks are registered. See
    // `EvalState.walkDepth` on why these are two fields and not one.
    state.enterWalk();

    try {
      walk.recursive(node, state, {}, mergedVisitors());

      const value = completionValue(popVisitorResult(node, state))

      state.result.stop();

      state.result.setSuccess(value);

      return value;
    } catch (error) {
      state.result.stop();
      // A visitor that throws skips its afterVisitor, so close whatever this
      // walk left open. Unwinding to the mark rather than to the bottom is what
      // stops a nested evaluate - the arrow-function body runs on this same
      // state - from draining the enclosing walk's open nodes.
      // Reads `state.hasHooks` rather than the `hooked` local captured above,
      // and the difference is deliberate but narrow: if a hook was registered
      // *during* this walk then `hooked` is false, no base was pushed, `mark`
      // is 0, and this unwinds the whole stack - including an enclosing walk's
      // frames, which is the boundary crossing the walk base exists to stop.
      // Left as it was rather than tightened here, because narrowing it would
      // change what a mid-walk registration observes on an already-published
      // path, which is not this step's to decide.
      if (state.hasHooks) {
        state.hooks.unwindTo(mark, error, state);
      }
      state.result.setFailure(error);
      throw error;
    } finally {
      // Both in a `finally`: a walk that threw still has to restore the
      // enclosing walk's bound and depth, or every later evaluation on this
      // state carries this one's nesting.
      state.exitWalk();
      if (hooked) {
        state.hooks.popWalkBase(state);
      }
    }
  }

  return undefined;
}

/**
 * Converts a rejection value to a proper Error object
 */
const ensureError = (rejection: unknown): Error => {
  if (rejection instanceof Error) {
    return rejection;
  }
  
  if (typeof rejection === 'string') {
    return new Error(rejection);
  }
  
  if (rejection === null) {
    return new Error('Promise rejected with null');
  }
  
  if (rejection === undefined) {
    return new Error('Promise rejected with undefined');
  }
  
  if (typeof rejection === 'object') {
    return new Error(`Promise rejected with object: ${JSON.stringify(rejection)}`);
  }
  
  return new Error(`Promise rejected with value: ${String(rejection)}`);
};

/**
 * Recursively awaits all promises in a value structure
 */
const awaitAllPromises = async (value: unknown): Promise<unknown> => {
  if (!value || typeof value !== 'object') {
    return value;
  }
  
  // If it's a promise, await it and handle rejections
  if ('then' in value) {
    try {
      return await (value as Promise<unknown>);
    } catch (rejection) {
      throw ensureError(rejection);
    }
  }
  
  // If it's an array, recursively await all elements
  if (Array.isArray(value)) {
    return Promise.all(value.map(item => awaitAllPromises(item)));
  }
  
  // If it's an object, recursively await all properties
  if (value.constructor === Object) {
    const result: Record<string, unknown> = {};
    const promises = Object.entries(value).map(async ([key, val]) => {
      result[key] = await awaitAllPromises(val);
    });
    await Promise.all(promises);
    return result;
  }
  
  return value;
};

/**
 * Asynchronously evaluates the given abstract syntax tree (AST) using the provided evaluation state.
 * @param ast The abstract syntax tree to evaluate.
 * @param state The evaluation state.
 * @returns A promise that resolves to the evaluated value or undefined.
 */
export const evaluateAsync = async (ast: AnyNode | undefined, state: EvalState)
  : Promise<unknown | undefined> => {

  if (!ast) {
    return undefined;
  }

  state.result.start();

  // Captured after the `!ast` early return above, for the same reason the sync
  // entry point captures inside its `if (node)` block. Do not hoist.
  const hooked = state.hasHooks;
  const mark = hooked ? state.hooks.pushWalkBase(state) : 0;

  state.enterWalk();

  try {
    let value: unknown;

    // The walk bookkeeping is released here rather than in a `finally` on the
    // outer try, because the walk ends here: everything below this block is
    // promise resolution on an already-finished traversal. Holding the walk
    // base and the depth across the `await` would leave an independent
    // evaluation that interleaved on this state looking like a nested walk -
    // and § 3.4's budget refills only on the outermost entry.
    try {
      walk.recursive(ast, state, {}, mergedVisitors());

      value = completionValue(popVisitorResult(ast, state));
    } finally {
      state.exitWalk();
      if (hooked) {
        state.hooks.popWalkBase(state);
      }
    }

    // Enhanced promise handling - recursively await all promises
    try {
      value = await awaitAllPromises(value);
    } catch (promiseError) {
      // Ensure proper error handling for promise rejections
      const error = ensureError(promiseError);
      state.result.stop();
      state.result.setFailure(error);
      throw error;
    }

    state.result.stop();
    state.result.setSuccess(value);
    
    return value;
  } catch (error) {
    state.result.stop();
    // The walk here is synchronous too, so it strands open nodes on a throw
    // exactly as the sync entry point does. This catch also receives the
    // rethrow from the awaitAllPromises handler above; in that case the walk
    // had already closed every node it opened, the depth is back at the mark,
    // and unwindTo correctly synthesises nothing.
    if (state.hasHooks) {
      state.hooks.unwindTo(mark, error, state);
    }
    state.result.setFailure(error);
    throw error;
  }
}
