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
 * They are two specs rather than one because they cover two functions that
 * never call each other: the throw is in `evaluateMemberExpression` and the
 * binding is in `evaluateObjectPattern`.
 *
 * **`evaluateObjectPattern` no longer pushes a scope**, and this file changed
 * shape with it. Until the A11 repair it pushed the argument and walked
 * `Property.value` as an *expression* against it; the value is now bound as a
 * pattern against the source property, so nothing reads a scope and nothing
 * pushes one. The three cases below that asserted the pop now assert its
 * absence - which is the stronger claim, and the one that keeps the scope-stack
 * accounting in `CLAUDE.md` honest now that `arrow-function-expression.ts` is
 * the only pusher left.
 *
 * The semantics of `{ k: v }` are covered by `pattern.destructuring.spec.ts`,
 * through both of the routes a consumer actually writes.
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
     * A `MemberExpression` in the value position, which the repair made
     * *reachable*: `Property.value` is now handed to `evaluatePattern`, so it
     * lands on the same rejecting branch the first spec above enters directly.
     * Before the repair this node was walked as an expression and evaluated.
     */
    const throwingValue = (): AnyNode => nodeOf('o.b');

    it('should bind the value name against the source property', () => {
      // **This assertion used to read `{ k: 'SHADOW' }`, and that was the
      // defect, not the intent.** The test's stated subject was the scope pop;
      // the equality arm quietly ratified A11's swap - the argument was pushed
      // as a scope, the identifier `arg` resolved against it, and the *key* `k`
      // was bound to the result. JavaScript binds the name `arg` to the
      // source's `k`, and the source here has no `k`, so `arg` binds
      // `undefined`. The key `k` is not a binding name at all.
      const context = EvalContext.fromContext({ arg: 'SOURCE' });
      const state = EvalState.fromContext(context, {});
      const pattern = objectPatternOver(nodeOf('arg'));

      expect(evaluatePattern(pattern, state, callback, { arg: 'SHADOW' }))
        .toEqual({ arg: undefined });

      expect(context.get('arg')).toBe('SOURCE');
    });

    it('should push no scope while binding', () => {
      /**
       * **Observed mid-walk, not merely balanced afterwards.** A computed key
       * is the one thing in an object pattern still walked as an expression,
       * so a function called from there runs at the exact point the old code
       * held a pushed scope. `depth` reports `scopes.length` at call time; a
       * balanced push/pop would still read `1` here, so this discriminates
       * where an after-the-fact `scopes.length` check cannot.
       */
      const depths: number[] = [];
      const context: EvalContext = EvalContext.fromContext({
        keyOf: () => { depths.push(context.scopes.length); return 'k'; },
      });
      const state = EvalState.fromContext(context, {});

      const pattern = {
        type: 'ObjectPattern',
        start: 0,
        end: 0,
        properties: [{
          type: 'Property',
          start: 0,
          end: 0,
          method: false,
          shorthand: false,
          computed: true,
          kind: 'init',
          key: nodeOf('keyOf()'),
          value: { type: 'Identifier', start: 0, end: 0, name: 'bound' },
        }],
      } as unknown as ObjectPattern;

      expect(evaluatePattern(pattern, state, callback, { k: 'VALUE' }))
        .toEqual({ bound: 'VALUE' });

      expect(depths).toEqual([0]);
      expect(context.scopes.length).toBe(0);
    });

    it('should leave no scope when a binding target throws', () => {
      const context = EvalContext.fromContext({ o: { b: 1 } });
      const state = EvalState.fromContext(context, {});
      const pattern = objectPatternOver(throwingValue());

      expect(() => evaluatePattern(pattern, state, callback, { k: 1 }))
        .toThrow('MemberExpression is not supported as a binding target.');

      expect(context.scopes.length).toBe(0);
    });

    it('should reject a blocklisted source key', () => {
      // The blocklist moved to the *source key* with the repair, and applies
      // whatever the source is - here there is no source property at all.
      const state = EvalState.fromContext({}, {});
      const pattern = {
        type: 'ObjectPattern',
        start: 0,
        end: 0,
        properties: [{
          type: 'Property',
          start: 0, end: 0, method: false, shorthand: false, computed: false,
          kind: 'init',
          key: { type: 'Identifier', start: 0, end: 0, name: 'constructor' },
          value: { type: 'Identifier', start: 0, end: 0, name: 'c' },
        }],
      } as unknown as ObjectPattern;

      expect(() => evaluatePattern(pattern, state, callback, undefined))
        .toThrow('Access to dangerous property "constructor" is blocked for security reasons');
    });
  });
});
