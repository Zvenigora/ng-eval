import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { doEval } from './do-eval';


describe('doEval', () => {
  let state: EvalState;

  beforeEach(() => {
    state = {} as EvalState;
  });

  it('should return undefined if node is undefined', () => {
    const result = doEval(undefined, state);
    expect(result).toBeUndefined();
  });

  it('should evaluate the node and return the value', () => {
    const node: AnyNode = {
      "type": "Literal",
      "start": 0,
      "end": 1,
      "value": 1,
      "raw": "1"
    };
    const state = EvalState.fromContext({});
    const result = doEval(node, state);
    expect(result).toBeDefined(); // Replace with your expected value
  });

});
