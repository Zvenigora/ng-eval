import { AnyNode } from 'acorn';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

describe('emptyStatementVisitor', () => {

  it('should exist so that a stray semicolon is not an unsupported statement', () => {
    // Its whole reason for being: the dispatcher's default throws, so without
    // this visitor `a;;b` would raise rather than evaluate.
    const state = EvalState.fromContext({ a: 'A', b: 'B' }, {});

    expect(evaluate(programOf('a;;b'), state)).toBe('B');
    expect(state.result.stack.length).toBe(0);
  });

  it('should produce nothing, so an earlier value survives it', () => {
    const state = EvalState.fromContext({ a: 'A' }, {});

    expect(evaluate(programOf('a;;'), state)).toBe('A');
  });

  it('should push the sentinel rather than undefined', () => {
    // Read by identity off the hook event, which is the only place the
    // sentinel is observable from outside: `evaluate` converts it at the walk
    // boundary. An implementation pushing `undefined` here passes the two
    // assertions above and fails this one - and would make `a; noop()` and
    // `a; ;` indistinguishable once blocks land.
    const state = EvalState.fromContext({ a: 'A' }, {});
    const seen: unknown[] = [];
    state.hooks.on('after', 'EmptyStatement', (e) => seen.push(e.value));

    evaluate(programOf('a;;'), state);

    expect(seen).toEqual([EMPTY_COMPLETION]);
    expect(seen[0]).not.toBeUndefined();
  });

  it('should push exactly one value, popped by its enclosing statement list', () => {
    const state = EvalState.fromContext({}, {});

    expect(evaluate(programOf(';;;'), state)).toBeUndefined();
    expect(state.result.stack.length).toBe(0);
  });
});
