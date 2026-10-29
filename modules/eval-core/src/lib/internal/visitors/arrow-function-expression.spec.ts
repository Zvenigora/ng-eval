import { AnyNode } from 'acorn';
import { EvalContext, EvalKnownOptions, EvalState, createDependencyTracker } from '../classes/eval';
import { Context, Registry } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * Parses a single expression down to its root node, the way the services do.
 */
const nodeOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

/**
 * Evaluates against an `EvalContext` the caller owns.
 *
 * `EvalState.fromContext` routes through `EvalContext.fromContext`, which
 * short-circuits on identity - so every call here walks on the *same* context
 * instance, which is the whole point of these specs. A fixture that builds its
 * context inline cannot observe the defect: the scope stack lives on
 * `EvalContext`, not on the per-walk `EvalState`, so a leak only becomes
 * visible on the next evaluation to reuse the context.
 */
const runOn = (source: string, context: EvalContext): unknown =>
  evaluate(nodeOf(source), EvalState.fromContext(context, {}));

/**
 * A context whose `boom` throws and whose `x` is the source binding an arrow
 * parameter named `x` shadows while its scope is pushed.
 */
const shadowingContext = (): EvalContext => EvalContext.fromContext({
  x: 'SOURCE',
  boom: () => { throw new Error('boom'); },
  ok: () => 'fine',
});

describe('arrowFunctionExpressionVisitor scope discipline', () => {

  describe('when the arrow body throws', () => {

    it('should pop the parameter scope it pushed', () => {
      const context = shadowingContext();

      expect(() => runOn(`(x => boom())('SHADOW')`, context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
    });

    it('should not shadow a source key on a later evaluation against the same context', () => {
      const context = shadowingContext();

      expect(() => runOn(`(x => boom())('SHADOW')`, context)).toThrow('boom');

      expect(runOn('x', context)).toBe('SOURCE');
    });

    it('should leave no residue after repeated throws', () => {
      const context = shadowingContext();

      for (let i = 0; i < 3; i++) {
        expect(() => runOn(`(x => boom())('SHADOW')`, context)).toThrow('boom');
      }

      expect(context.scopes.length).toBe(0);
      expect(runOn('x', context)).toBe('SOURCE');
    });
  });

  describe('when the arrow body returns normally', () => {

    it('should pop the parameter scope it pushed', () => {
      const context = shadowingContext();

      expect(runOn(`(x => ok())('SHADOW')`, context)).toBe('fine');

      expect(context.scopes.length).toBe(0);
      expect(runOn('x', context)).toBe('SOURCE');
    });

    it('should still resolve the parameter from the pushed scope while the body runs', () => {
      const context = shadowingContext();

      expect(runOn(`(x => x)('SHADOW')`, context)).toBe('SHADOW');

      expect(context.scopes.length).toBe(0);
    });
  });
});

/**
 * The parameter scope is pushed with the walk's options, as the three lexical
 * scope pushers push theirs, so under `caseInsensitive` a parameter is matched
 * case-insensitively and a case-variant write reaches the parameter. Up to
 * 0.14.0 it was a plain record read by exact key: `(x => X)(1)` read
 * `undefined`, and `X = 5` in the body landed on the caller's context unless
 * the context itself corrected `X` to `x` (`docs/backlog-retired.md` A47).
 */
describe('arrowFunctionExpressionVisitor parameter scope and caseInsensitive', () => {

  /** A store's entries as `[key, value]` pairs, a `Registry`'s or an object's. */
  const entriesOf = (store: unknown): [unknown, unknown][] =>
    store instanceof Registry
      ? [...(store as Registry<unknown, unknown>).entries]
      : Object.entries(store as object);

  /**
   * Walks `source` on what a leg hands `EvalState.fromContext`, and returns
   * the value with the context the walk ran on.
   */
  const walk = (source: string, input: Context | EvalContext, options: EvalKnownOptions) => {
    const state = EvalState.fromContext(input, options);
    const value = evaluate(nodeOf(source), state);
    return { value, context: state.context as EvalContext };
  };

  describe('under caseInsensitive', () => {

    const options = { caseInsensitive: true };

    /**
     * The three store shapes a caller may hand the walk, each with the object
     * the caller keeps. `fromContext` copies a plain object into a `Registry`
     * under `caseInsensitive`, on the first leg and inside the third, so the
     * caller's own object and `context.original` are asserted apart.
     */
    describe.each<[string, (data: Record<string, unknown>) => { own: Context; input: Context | EvalContext }]>([
      ['a plain object', data => ({ own: data, input: data })],
      ['a Registry', data => {
        const own = Registry.fromObject(data, options) as Context;
        return { own, input: own };
      }],
      ['an EvalContext built by fromContext', data => ({ own: data, input: EvalContext.fromContext(data, options) })],
    ])('over %s', (_, legOf) => {

      it('should read a parameter by a case variant: (x => X)(1) is 1', () => {
        const { own, input } = legOf({});

        const { value, context } = walk('(x => X)(1)', input, options);

        expect(value).toBe(1);
        expect(context.scopes.length).toBe(0);
        expect(entriesOf(own)).toEqual([]);
        expect(entriesOf(context.original)).toEqual([]);
      });

      // Before the fix the context answered `X` with its own `x`, 10, and a
      // dependency tracker recorded `X` as a dependency on the context.
      it('should read the parameter, not the context key it shadows, and record no dependency', () => {
        const { own, input } = legOf({ x: 10 });
        const state = EvalState.fromContext(input, options);
        const tracker = createDependencyTracker();
        tracker.install(state.hooks);

        const value = evaluate(nodeOf('(x => X)(1)'), state);

        const context = state.context as EvalContext;
        expect(value).toBe(1);
        expect([...tracker.dependencies]).toEqual([]);
        expect(context.scopes.length).toBe(0);
        expect(entriesOf(own)).toEqual([['x', 10]]);
        expect(entriesOf(context.original)).toEqual([['x', 10]]);
      });

      it('should write a parameter by a case variant, leaving an empty context empty', () => {
        const { own, input } = legOf({});

        const { value, context } = walk('(x => (X = 5, x))(1)', input, options);

        expect(value).toBe(5);
        expect(context.scopes.length).toBe(0);
        expect(entriesOf(own)).toEqual([]);
        expect(entriesOf(context.original)).toEqual([]);
      });

      it('should write a parameter by a case variant, leaving the context key that it shadows', () => {
        const { own, input } = legOf({ x: 10 });

        const { value, context } = walk('(x => (X = 5, x))(1)', input, options);

        expect(value).toBe(5);
        expect(context.scopes.length).toBe(0);
        expect(entriesOf(own)).toEqual([['x', 10]]);
        expect(entriesOf(context.original)).toEqual([['x', 10]]);
      });

      it('should read a destructured parameter by a case variant: (({ a }) => A)({ a: 4 }) is 4', () => {
        const { own, input } = legOf({});

        const { value, context } = walk('(({ a }) => A)({ a: 4 })', input, options);

        expect(value).toBe(4);
        expect(context.scopes.length).toBe(0);
        expect(entriesOf(own)).toEqual([]);
        expect(entriesOf(context.original)).toEqual([]);
      });
    });
  });

  // The same sources case-sensitively: a case variant is another name, so it
  // resolves to nothing and a write to it lands on the caller's own object.
  describe('with caseInsensitive off, over a plain object', () => {

    const options = {};

    it('should not read a parameter by a case variant: (x => X)(1) is undefined', () => {
      const own = {};

      const { value, context } = walk('(x => X)(1)', own, options);

      expect(value).toBeUndefined();
      expect(context.scopes.length).toBe(0);
      expect(context.original).toBe(own);
      expect(entriesOf(own)).toEqual([]);
    });

    it('should write a case variant to the context, not to the parameter', () => {
      const own = {};

      const { value, context } = walk('(x => (X = 5, x))(1)', own, options);

      expect(value).toBe(1);
      expect(context.scopes.length).toBe(0);
      expect(context.original).toBe(own);
      expect(entriesOf(own)).toEqual([['X', 5]]);
    });

    it('should write a case variant to the context beside the key the parameter shadows', () => {
      const own = { x: 10 };

      const { value, context } = walk('(x => (X = 5, x))(1)', own, options);

      expect(value).toBe(1);
      expect(context.scopes.length).toBe(0);
      expect(context.original).toBe(own);
      expect(entriesOf(own)).toEqual([['x', 10], ['X', 5]]);
    });

    it('should not read a destructured parameter by a case variant', () => {
      const own = {};

      const { value, context } = walk('(({ a }) => A)({ a: 4 })', own, options);

      expect(value).toBeUndefined();
      expect(context.scopes.length).toBe(0);
      expect(context.original).toBe(own);
      expect(entriesOf(own)).toEqual([]);
    });
  });

  // The split the README warns of: `caseInsensitive` on the context alone. The
  // scope follows the walk's options, not the context's, so it stays exact and
  // the context answers `X` with its own `x`.
  describe('over a case-insensitive EvalContext, walked case-sensitively', () => {

    it('should not read a parameter by a case variant: the context answers it', () => {
      const own = { x: 10 };

      const { value, context } = walk('(x => X)(1)', EvalContext.fromContext(own, { caseInsensitive: true }), {});

      expect(value).toBe(10);
      expect(context.scopes.length).toBe(0);
      expect(entriesOf(own)).toEqual([['x', 10]]);
      expect(entriesOf(context.original)).toEqual([['x', 10]]);
    });
  });
});
