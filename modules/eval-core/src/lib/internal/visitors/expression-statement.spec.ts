import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

describe('expressionStatementVisitor', () => {

  it('should pass its expression value through', () => {
    const state = EvalState.fromContext({ a: 10 }, {});

    expect(evaluate(programOf('2 + 3 * a'), state)).toBe(32);
    expect(state.result.stack.length).toBe(0);
  });

  it('should pop exactly one value per statement in a list', () => {
    // Three statements, three pops, one push. A visitor that pushed without
    // popping would still return 3 - `Stack.pop` returns the last value pushed
    // - and would strand two, which is what this counts.
    const state = EvalState.fromContext({}, {});

    expect(evaluate(programOf('1; 2; 3'), state)).toBe(3);
    expect(state.result.stack.length).toBe(0);
  });

  it('should pass through a value of undefined as a value', () => {
    // Not the empty completion: the expression produced `undefined`, which is
    // the distinction the sentinel exists for.
    const state = EvalState.fromContext({ noop: () => undefined }, {});

    expect(evaluate(programOf('noop()'), state)).toBeUndefined();
    expect(state.result.stack.length).toBe(0);
  });

  it('should be visible to hooks rather than handled by the base walker', () => {
    // The reason it is registered at all: the base walker fires no hooks, so a
    // statement would be invisible to a consumer watching the walk.
    const state = EvalState.fromContext({ a: 'A' }, {});
    const seen: string[] = [];
    state.hooks.on('before', 'ExpressionStatement', (e) => seen.push(e.node.type));

    evaluate(programOf('a; a'), state);

    expect(seen).toEqual(['ExpressionStatement', 'ExpressionStatement']);
  });

  it('should leave nothing open when its expression throws', () => {
    const state = EvalState.fromContext({ boom: () => { throw new Error('boom'); } }, {});
    state.hooks.on('after', '*', () => undefined);

    expect(() => evaluate(programOf('boom()'), state)).toThrow('boom');

    expect(state.hookBookkeeping.open).toEqual([]);
  });
});
