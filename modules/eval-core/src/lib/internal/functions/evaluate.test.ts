import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { evaluate } from './evaluate';


describe('evaluate', () => {
  let state: EvalState;

  beforeEach(() => {
    state = {} as EvalState;
  });

  it('evaluate: should return undefined if node is undefined', () => {
    const result = evaluate(undefined, state);
    expect(result).toBeUndefined();
  });

  it('evaluate: should evaluate the node and return the value', () => {
    const node: AnyNode = {
      "type": "Literal",
      "start": 0,
      "end": 1,
      "value": 1,
      "raw": "1"
    };
    const state = EvalState.fromContext({});
    const result = evaluate(node, state);
    expect(result).toBeDefined(); // Replace with your expected value
  });

});
