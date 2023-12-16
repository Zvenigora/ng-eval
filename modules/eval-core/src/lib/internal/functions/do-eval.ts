import { EvalState } from "../classes/eval";
import * as walk from 'acorn-walk';
import { getDefaultVisitors, popVisitorResult } from "../visitors";

export const doEval = (state: EvalState): unknown | undefined => {
  if (state.ast) {

    const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

    walk.recursive(state.ast, state, visitors);

    const value = popVisitorResult(state.ast, state)

    return value;
  }

  return undefined;
}
