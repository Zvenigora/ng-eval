import { AnyNode } from 'acorn';
import { EvalContext, EvalState } from '../classes/eval';
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
