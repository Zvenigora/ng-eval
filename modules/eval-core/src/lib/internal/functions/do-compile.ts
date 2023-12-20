import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { doEval, doEvalAsync } from './do-eval';

export type stateCallback = (state: EvalState) => unknown;
export type stateCallbackAsync = (state: EvalState) => Promise<unknown | undefined>;

/**
 * Compiles the given node and returns a function that can be used to evaluate it.
 *
 * @param node The node to compile.
 * @returns A function that takes an `EvalState` and returns the result of evaluating the node.
 */
export const doCompile = (node: AnyNode | undefined): stateCallback => {

  return doEval.bind(null, node);
}

/**
 * Compiles the given node asynchronously.
 *
 * @param node - The node to compile.
 * @returns A function that takes an `EvalState` object and returns a `Promise` that resolves to the compiled result.
 */
export const doCompileAsync = (node: AnyNode | undefined): stateCallbackAsync => {

  return doEvalAsync.bind(null, node);
}


export const doCall = (fn: stateCallback, state: EvalState): unknown | undefined => {
  const value = fn(state);
  return value;
}

export const doCallAsync = (fn: stateCallbackAsync, state: EvalState): Promise<unknown | undefined> => {
  const promise = fn(state);
  return promise;
}
