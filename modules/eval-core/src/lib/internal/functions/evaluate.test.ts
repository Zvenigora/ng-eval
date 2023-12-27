import { AnyNode, ecmaVersion } from 'acorn';
import { EvalState } from '../classes/eval';
import { evaluate, evaluateAsync } from './evaluate';
import { parse } from './parse';


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

  it('#eval asyncFunc(one, two) should return 3', async () => {
    const context = {
      one: 1,
      two: 2,
      asyncFunc: async (a: number, b: number) => { return await (a+b); }
    };

    const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: true };

    const expr = 'asyncFunc(one, two)';
    const node = parse(expr, options);
    const state = EvalState.fromContext(context);

    const value = await evaluateAsync(node, state);
    expect(value).toBe(1 + 2);

  });

});
