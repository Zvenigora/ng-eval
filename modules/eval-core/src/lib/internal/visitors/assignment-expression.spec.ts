import { AnyNode } from 'acorn';
import { EvalContext, EvalState } from '../classes/eval';
import { Registry } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * An identifier assignment under `caseInsensitive` writes the key `getKey`
 * matched, and the name as written when it matched nothing.
 *
 * `getKey` gives `undefined` when `get` finds nothing - a name absent from the
 * context, or one bound to `undefined` - and up to 0.13.1 that `undefined` was
 * the key written (`docs/backlog-retired.md` A43): the string `"undefined"` on
 * a plain object, the value `undefined` in a `Registry`. Each case asserts the
 * store's whole key list, which catches the stray key in either form.
 *
 * `update-expression.spec.ts` holds the same cases for `x++`.
 */
describe('assignmentExpressionVisitor', () => {

  /** Parses to the whole `Program`, the way `EvalService` does. */
  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

  const options = { caseInsensitive: true };

  /** A context, and the store its writes land in. */
  interface Shape {
    label: string;
    make: (data: Record<string, unknown>) => { context: EvalContext; keys: () => unknown[] };
  }

  const SHAPES: Shape[] = [
    {
      label: 'a plain object, copied into a Registry by fromContext',
      make: data => {
        const context = EvalContext.fromContext(data, options);
        const registry = context.original as Registry<unknown, unknown>;
        return { context, keys: () => [...registry.keys] };
      },
    },
    {
      label: 'a case-insensitive Registry',
      make: data => {
        const registry = new Registry<unknown, unknown>(Object.entries(data), options);
        return { context: EvalContext.fromContext(registry, options), keys: () => [...registry.keys] };
      },
    },
    {
      label: 'a plain object the context holds as it is',
      make: data => {
        const context = new EvalContext(data, options);
        return {
          context,
          keys: () => {
            expect(Object.prototype.hasOwnProperty.call(data, 'undefined')).toBe(false);
            return Object.keys(data);
          },
        };
      },
    },
  ];

  describe('under caseInsensitive, a name get finds nothing for (A43)', () => {

    describe.each(SHAPES)('$label', shape => {

      it.each<[string, string, Record<string, unknown>, unknown, string, unknown]>([
        ['x = 1', '{ x: undefined }', { x: undefined }, 1, 'x', 1],
        ['x += 1', '{ x: undefined }', { x: undefined }, NaN, 'x', NaN],
        ['y = 1', '{}', {}, 1, 'y', 1],
      ])('%s on %s writes the name as written', (source, _label, data, result, intended, written) => {
        const { context, keys } = shape.make({ ...data });

        expect(evaluate(programOf(source), EvalState.fromContext(context, options))).toBe(result);

        expect(context.get(intended)).toBe(written);
        expect(keys()).toEqual([intended]);
      });
    });

    // Not the plain object held as it is: its context matches no case variant,
    // for a read either.
    describe.each(SHAPES.slice(0, 2))('$label', shape => {

      it('should still write the matched spelling of a case variant', () => {
        const { context, keys } = shape.make({ Foo: 1 });

        expect(evaluate(programOf('foo = 2'), EvalState.fromContext(context, options))).toBe(2);

        expect(context.get('Foo')).toBe(2);
        expect(keys()).toEqual(['Foo']);
      });
    });
  });
});
