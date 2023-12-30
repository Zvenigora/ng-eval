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
export const evaluateAsync = (ast: AnyNode | undefined, state: EvalState)
  : Promise<unknown | undefined> => {

  const promise = new Promise<unknown | undefined>((resolve) => {
    const value = evaluate(ast, state);
    resolve(value);
  });
  return promise;
}
