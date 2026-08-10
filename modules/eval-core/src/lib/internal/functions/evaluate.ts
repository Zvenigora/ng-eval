import { EvalState } from '../classes/eval';
import * as walk from 'acorn-walk';
import { getDefaultVisitors, popVisitorResult } from '../visitors';
import { AnyNode } from 'acorn';

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
    const mark = state.hasHooks ? state.hooks.depth(state) : 0;

    try {
      const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

      walk.recursive(node, state, visitors);

      const value = popVisitorResult(node, state)

      state.result.stop();

      state.result.setSuccess(value);

      return value;
    } catch (error) {
      state.result.stop();
      // A visitor that throws skips its afterVisitor, so close whatever this
      // walk left open. Unwinding to the mark rather than to the bottom is what
      // stops a nested evaluate - the arrow-function body runs on this same
      // state - from draining the enclosing walk's open nodes.
      if (state.hasHooks) {
        state.hooks.unwindTo(mark, error, state);
      }
      state.result.setFailure(error);
      throw error;
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
  const mark = state.hasHooks ? state.hooks.depth(state) : 0;

  try {
    const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

    walk.recursive(ast, state, visitors);

    let value = popVisitorResult(ast, state);

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
