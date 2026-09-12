import { AnyNode, MemberExpression, ObjectPattern } from 'acorn';
import * as walk from 'acorn-walk';
import { EvalContext, EvalState } from '../classes/eval';
import { evaluatePattern, getDefaultVisitors } from '.';
import { parse } from '../functions';

/**
 * Both specs below enter by a **direct call** to `evaluatePattern`, which is
 * not the idiomatic route and is not a choice.
 *
 * `evaluateMemberExpression` and `evaluateObjectPattern` are reached only
 * through `evaluatePatterns` / `evaluatePattern`, whose only caller inside the
 * library is `arrow-function-expression.ts` - on an arrow function's parameter
 * list. Acorn rejects a `MemberExpression` as a binding target in a parameter
 * list in every form (`(a.b) => 1`, `({x: a.b}) => 1`, `([a.b]) => 1`,
 * `({...a.b}) => 1`), at every `ecmaVersion`, so an evaluation-driven spec
 * cannot enter either branch and would report green over nothing.
 *
 * They are two specs rather than one because the two repairs live in two
 * functions that never call each other: the throw is in
 * `evaluateMemberExpression` and the scope push is in `evaluateObjectPattern`.
 * A `MemberExpression` fixture throws having executed no push, so asserting
 * `scopes.length` on it says nothing about the pop.
 */

/**
 * Parses a single expression down to its root node, the way the services do.
 */
const nodeOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

/**
 * Dispatches a node to its registered visitor, the way `walk.recursive` does
 * for a visitor's own `callback` argument.
 */
const callback: walk.WalkerCallback<EvalState> = (node, st) => {
  walk.recursive(node as AnyNode, st, getDefaultVisitors());
};

/**
 * An `ObjectPattern` with one non-shorthand property over the given value
 * node. Hand-built because acorn will not produce one: the value positions
 * these specs need are binding targets it rejects.
 */
const objectPatternOver = (value: AnyNode): ObjectPattern => ({
  type: 'ObjectPattern',
  start: 0,
  end: 0,
  properties: [{
    type: 'Property',
    start: 0,
    end: 0,
    method: false,
    shorthand: false,
    computed: false,
    kind: 'init',
    key: { type: 'Identifier', start: 0, end: 0, name: 'k' },
    value,
  }],
} as unknown as ObjectPattern);

describe('evaluatePattern', () => {

  describe('the MemberExpression branch', () => {

    it('should throw naming the node type, without logging', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const state = EvalState.fromContext({ a: { b: 1 } }, {});
      const pattern = nodeOf('a.b') as MemberExpression;

      try {
        expect(() => evaluatePattern(pattern, state, callback, 'ARG'))
          .toThrow('MemberExpression is not supported as a binding target.');

        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('the ObjectPattern branch', () => {

    /**
     * `evaluateObjectPattern` pushes the argument as a scope, walks the
     * property's value, then pops. A value node whose visitor throws puts the
     * exception *between* the push and the pop, which is the only arrangement
     * that makes the pop observable. `o.__proto__` throws from
     * `member-expression.ts`'s prototype-pollution guard.
     */
    const throwingValue = (): AnyNode => nodeOf('o.__proto__');

    it('should pop the scope it pushed when the property value throws', () => {
      const context = EvalContext.fromContext({ o: { b: 1 } });
      const state = EvalState.fromContext(context, {});
      const pattern = objectPatternOver(throwingValue());

      const before = context.scopes.length;

      expect(() => evaluatePattern(pattern, state, callback, { arg: 1 }))
        .toThrow('dangerous property');

      expect(context.scopes.length).toBe(before);
    });

    it('should not leave a pushed scope shadowing a source key afterwards', () => {
      const context = EvalContext.fromContext({ o: { b: 1 }, arg: 'SOURCE' });
      const state = EvalState.fromContext(context, {});
      const pattern = objectPatternOver(throwingValue());

      expect(() => evaluatePattern(pattern, state, callback, { arg: 'SHADOW' }))
        .toThrow('dangerous property');

      expect(context.get('arg')).toBe('SOURCE');
    });

    it('should pop the scope it pushed when the property value does not throw', () => {
      const context = EvalContext.fromContext({ arg: 'SOURCE' });
      const state = EvalState.fromContext(context, {});
      const pattern = objectPatternOver(nodeOf('arg'));

      expect(evaluatePattern(pattern, state, callback, { arg: 'SHADOW' }))
        .toEqual({ k: 'SHADOW' });

      expect(context.scopes.length).toBe(0);
      expect(context.get('arg')).toBe('SOURCE');
    });
  });
});
