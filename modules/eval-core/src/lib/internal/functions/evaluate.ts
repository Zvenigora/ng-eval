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

    try {
      const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

      walk.recursive(node, state, visitors);

      const value = popVisitorResult(node, state)

      state.result.stop();

      state.result.setSuccess(value);

      return value;
    } catch (error) {
      state.result.stop();
      state.result.setFailure(error);
      throw error;
    }
  }

  return undefined;
}

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

  try {
    const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

    walk.recursive(ast, state, visitors);

    let value = popVisitorResult(ast, state);

    // If the result is a promise, await it
    if (value && typeof value === 'object' && 'then' in value) {
      try {
        value = await (value as Promise<unknown>);
      } catch (promiseError) {
        state.result.stop();
        state.result.setFailure(promiseError);
        throw promiseError;
      }
    }

    state.result.stop();
    state.result.setSuccess(value);
    
    return value;
  } catch (error) {
    state.result.stop();
    state.result.setFailure(error);
    throw error;
  }
}
