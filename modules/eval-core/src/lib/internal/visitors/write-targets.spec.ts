import { AnyNode, UpdateExpression } from 'acorn';
import { EvalState } from '../classes/eval';
import { Context } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * `docs/backlog-retired.md` A2: both write visitors chose a branch by target
 * type with no final `else`, so a target neither branch handled reached
 * `afterVisitor` having pushed nothing. Three expressions took that path:
 * `(a)++` under `preserveParens`, and destructuring assignment, `[a, b] = arr`
 * and `({m} = o)`, which needs no option at all and silently did nothing.
 *
 * A parenthesised target is now unwrapped, and any other target throws an
 * error naming its node type, before either side is evaluated and without
 * pushing anything.
 *
 * Parsed to the whole `Program`, the way `EvalService` does, so a row that
 * walks nothing cannot pass by returning `undefined` (see
 * `statement-semantics.spec.ts`'s preamble).
 */
describe('write targets', () => {

  const programOf = (source: string, preserveParens = false): AnyNode =>
    parse(source, { ecmaVersion: 2020, preserveParens }) as AnyNode;

  const stateOf = (context: Context): EvalState => EvalState.fromContext(context);

  describe('a parenthesised target, under preserveParens', () => {

    it('should increment through (a)++', () => {
      const context = { a: 1 };
      const state = stateOf(context);

      const value = evaluate(programOf('(a)++', true), state);

      expect(value).toBe(1);
      expect(context.a).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should unwrap nested parentheses and a prefix operator', () => {
      const context = { a: 1 };
      const state = stateOf(context);

      const value = evaluate(programOf('--((a))', true), state);

      expect(value).toBe(0);
      expect(context.a).toBe(0);
      expect(state.result.stack.length).toBe(0);
    });

    it('should increment a member through (o.x)++', () => {
      const context = { o: { x: 5 } };
      const state = stateOf(context);

      const value = evaluate(programOf('(o.x)++', true), state);

      expect(value).toBe(5);
      expect(context.o.x).toBe(6);
    });

    it('should assign through (a) = 7', () => {
      const context = { a: 1 };
      const state = stateOf(context);

      const value = evaluate(programOf('(a) = 7', true), state);

      expect(value).toBe(7);
      expect(context.a).toBe(7);
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('a target neither visitor handles', () => {

    const snapshot = () => ({ a: 1, b: 2, m: 3, arr: [10, 20], o: { m: 30 } });

    it('should throw for [a, b] = arr, naming the node type, and change nothing', () => {
      const context = snapshot();
      const state = stateOf(context);

      expect(() => evaluate(programOf('[a, b] = arr'), state))
        .toThrow('Unsupported assignment target: ArrayPattern');

      expect(context).toEqual(snapshot());
      expect(state.result.stack.length).toBe(0);
    });

    it('should throw for ({m} = o), naming the node type, and change nothing', () => {
      const context = snapshot();
      const state = stateOf(context);

      expect(() => evaluate(programOf('({m} = o)'), state))
        .toThrow('Unsupported assignment target: ObjectPattern');

      expect(context).toEqual(snapshot());
      expect(state.result.stack.length).toBe(0);
    });

    it('should evaluate neither side before throwing', () => {
      // A right-hand side with an effect: a fall-through placed after the
      // operands would have run it, and the context would differ.
      const calls: string[] = [];
      const context = { ...snapshot(), f: () => { calls.push('f'); return [1, 2]; } };
      const state = stateOf(context);

      expect(() => evaluate(programOf('[a, b] = f()'), state))
        .toThrow('Unsupported assignment target: ArrayPattern');

      expect(calls).toEqual([]);
    });

    it('should throw for an update target other than an identifier or member', () => {
      // Acorn rejects every such source, so the node is built by hand: the
      // throwing default is what an AST from anywhere else would reach.
      const context = snapshot();
      const state = stateOf(context);
      const node = parse('a++', { ecmaVersion: 2020, extractExpressions: true }) as UpdateExpression;
      (node as { argument: unknown }).argument = { type: 'ArrayPattern', elements: [], start: 0, end: 1 };

      expect(() => evaluate(node, state))
        .toThrow('Unsupported update target: ArrayPattern');

      expect(context).toEqual(snapshot());
      expect(state.result.stack.length).toBe(0);
    });
  });
});
