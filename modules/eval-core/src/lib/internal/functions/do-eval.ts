import { EvalState } from "../classes/eval";
import * as walk from 'acorn-walk';
import { getDefaultVisitors, popVisitorResult } from "../visitors";
import { AnyNode } from "acorn";

export const doEval = (node: AnyNode | undefined, state: EvalState)
  : unknown | undefined => {

  if (node) {

    const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

    walk.recursive(node, state, visitors);

    const value = popVisitorResult(node, state)

    return value;
  }

  return undefined;
}

export const doEvalAsync = (ast: AnyNode | undefined, state: EvalState)
  : Promise<unknown | undefined> => {

  const promise = new Promise<unknown | undefined>((resolve) => {
    const value = doEval(ast, state);
    resolve(value);
  });
  return promise;
}
