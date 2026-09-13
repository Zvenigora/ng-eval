import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { getDefaultVisitors } from '../visitors';
import { evaluate, evaluateAsync, parse } from '.';

const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

const run = (source: string) =>
  evaluate(programOf(source), EvalState.fromContext({ a: 10 }, {}));

/**
 * The merged visitor table is built once and shared by every walk in the
 * process - `EvalService` is `providedIn: 'root'`, so one mutated entry would
 * reach every later evaluation, including another consumer's. These pin the
 * two things that keep the sharing safe.
 */
describe('the shared visitor table', () => {

  it('should evaluate the same way on repeated walks', () => {
    expect(run('2 + 3 * a')).toBe(32);
    expect(run('2 + 3 * a')).toBe(32);
    expect(run('1; 2; 3')).toBe(3);
    expect(run('2 + 3 * a')).toBe(32);
  });

  it('should hand every caller of getDefaultVisitors its own mutable copy', () => {
    // The cached table is built *from* this and is never this object, so a
    // caller that mutates what it gets cannot reach the shared one.
    const first = getDefaultVisitors();
    const second = getDefaultVisitors();

    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(false);
  });

  it('should not let a mutated getDefaultVisitors result change evaluation', () => {
    // The discriminating case for the caching: if `evaluate` still called
    // `getDefaultVisitors()` per walk *and* something had cached that object,
    // this would corrupt every later walk. It must be inert.
    const stolen = getDefaultVisitors();
    stolen['BinaryExpression'] = () => { throw new Error('poisoned'); };

    expect(run('2 + 3 * a')).toBe(32);
  });

  it('should walk the same table from the async entry point', async () => {
    // Both entry points were changed, so both need pinning - a caching fix
    // applied to one of them is the shape this catches.
    const state = EvalState.fromContext({ a: 10 }, {});

    await expect(evaluateAsync(programOf('1; 2 + 3 * a'), state)).resolves.toBe(32);
    expect(state.result.stack.length).toBe(0);
  });

  it('should stay correct across a nested walk on the same state', () => {
    // `arrow-function-expression.ts` re-enters `evaluate`, so the inner walk
    // takes the shared table too.
    expect(run('(x => x + 1)(1)')).toBe(2);
    expect(run('2 + 3 * a')).toBe(32);
  });
});
