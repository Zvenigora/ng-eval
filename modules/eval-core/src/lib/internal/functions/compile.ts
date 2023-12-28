import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { evaluate, evaluateAsync } from './evaluate';

export type stateCallback = (state: EvalState) => unknown;
export type stateCallbackAsync = (state: EvalState) => Promise<unknown | undefined>;

/**
 * Compiles the given node and returns a function that can be used to evaluate it.
 *
 * @param node The node to compile.
 * @returns A function that takes an `EvalState` and returns the result of evaluating the node.
 */
export const compile = (node: AnyNode | undefined): stateCallback => {

  return evaluate.bind(null, node);
}

/**
 * Compiles the given node asynchronously.
 *
 * @param node - The node to compile.
 * @returns A function that takes an `EvalState` object and returns a `Promise` that resolves to the compiled result.
 */
export const compileAsync = (node: AnyNode | undefined): stateCallbackAsync => {

  return evaluateAsync.bind(null, node);
}

/**
 * Calls the provided function with the given state and returns the result.
 *
 * @param fn The function to be called.
 * @param state The state to be passed to the function.
 * @returns The result of calling the function.
 */
export const call = (fn: stateCallback, state: EvalState): unknown | undefined => {
  const value = fn(state);
  return value;
}

/**
 * Calls an asynchronous function with the given state and returns a promise that resolves to the result.
 * @param fn The asynchronous function to call.
 * @param state The state to pass to the function.
 * @returns A promise that resolves to the result of the function.
 */
export const callAsync = (fn: stateCallbackAsync, state: EvalState): Promise<unknown | undefined> => {
  const promise = fn(state);
  return promise;
}
