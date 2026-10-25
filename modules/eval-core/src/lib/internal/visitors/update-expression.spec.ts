import { AnyNode } from 'acorn';
import { EvalContext, EvalKnownOptions, EvalMemberWrite, EvalState, createDependencyTracker } from '../classes/eval';
import { Context, Registry, fromContext } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * An update converts its operand to a number once, as JavaScript does, and
 * uses that one conversion for the value it writes and for its result.
 *
 * Up to 0.13.1 the new value was `value + 1` or `value - 1` on the operand as
 * read, so `++` concatenated on a string or an object, and a postfix update
 * gave the operand unconverted (`docs/backlog-retired.md` A41). A postfix
 * update of a listed function therefore wrote first and was refused by the
 * funnel after, leaving the write behind (A40).
 *
 * Every expected value here comes from the same update run natively, beside
 * the evaluator, rather than from a table typed by hand. Every case runs in
 * both modes, and the operand is read back through the context, since
 * `caseInsensitive` copies the data into a `Registry` and the caller's object
 * is then not the one written. The matrix's sources are spelled as the data
 * spells them. Under `caseInsensitive` the member matrix runs again spelled
 * `OBJ.X`, whose write reaches the matched `x`: up to 0.13.3 it created a new
 * key `X` beside it (`docs/backlog.md` A44).
 */
describe('updateExpressionVisitor', () => {

  /** Parses to the whole `Program`, the way `EvalService` does. */
  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

  /**
   * Records every write that reaches the context - a binding through `set`,
   * a member through the policy's consultation - and allows it. A case that
   * expects a throw to write nothing asserts this stays empty, since writing
   * the operand back unchanged leaves the target looking untouched.
   */
  class RecordingContext extends EvalContext {

    readonly writes: unknown[] = [];

    override set(key: unknown, value: unknown): void {
      this.writes.push(key);
      super.set(key, value);
    }

    override checkMemberWrite(write: EvalMemberWrite): void {
      this.writes.push(write.key);
    }
  }

  /** The policy `eval-signals` builds on: refuse what the walk did not create. */
  class PolicedContext extends EvalContext {

    override checkMemberWrite(write: EvalMemberWrite): void {
      if (!write.createdByEvaluation) {
        throw new Error(`policy refused a write to "${String(write.key)}"`);
      }
    }
  }

  type Form = 'x++' | 'x--' | '++x' | '--x';

  const FORMS: Form[] = ['x++', 'x--', '++x', '--x'];

  /** The update run natively: its result, and the operand afterwards. */
  const nativeUpdate = (operand: unknown, form: Form): { result: unknown; after: unknown } => {
    let x = operand as number;
    let result: unknown;
    switch (form) {
      case 'x++': result = x++; break;
      case 'x--': result = x--; break;
      case '++x': result = ++x; break;
      case '--x': result = --x; break;
    }
    return { result, after: x };
  };

  /** What the native update throws on `operand`. */
  const nativeError = (operand: unknown): unknown => {
    let x = operand as number;
    try {
      x++;
    } catch (error) {
      return error;
    }
    throw new Error(`${String(x)}++ did not throw natively`);
  };

  const caught = (run: () => unknown): unknown => {
    try {
      run();
    } catch (error) {
      return error;
    }
    throw new Error('expected a throw');
  };

  /**
   * Factories, so the native run and the evaluator's never share an operand.
   * `BigInt(5)` rather than `5n`: the spec build targets es2016.
   */
  const OPERANDS: [string, () => unknown][] = [
    ['"a"', () => 'a'],
    ['"5"', () => '5'],
    ['{}', () => ({})],
    ['[2]', () => [2]],
    ['null', () => null],
    ['undefined', () => undefined],
    ['true', () => true],
    ['5', () => 5],
    ['5n', () => BigInt(5)],
  ];

  /** An identifier target `x`, or a member target `obj.x`. */
  interface Target {
    label: string;
    source: (form: string) => string;
    data: (operand: unknown) => Context;
    read: (context: EvalContext) => unknown;
  }

  const TARGETS: Target[] = [
    {
      label: 'an identifier',
      source: form => form,
      data: operand => ({ x: operand }),
      read: context => context.get('x'),
    },
    {
      label: 'a member',
      source: form => form.replace('x', 'obj.x'),
      data: operand => ({ obj: { x: operand } }),
      read: context => (context.get('obj') as Record<string, unknown>)['x'],
    },
  ];

  /** A `valueOf` that counts its calls. */
  const counted = () => {
    const operand = { calls: 0, valueOf() { operand.calls += 1; return 5; } };
    return operand;
  };

  describe.each<[string, EvalKnownOptions]>([
    ['case-sensitive', {}],
    ['caseInsensitive', { caseInsensitive: true }],
  ])('%s', (_mode, options) => {

    const contextOf = (data: Context): EvalContext =>
      EvalContext.fromContext(data, options);

    const recordingOf = (data: Context): RecordingContext =>
      new RecordingContext(fromContext(data, options), options);

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, options));

    describe.each(TARGETS)('$label', target => {

      describe('the case matrix', () => {

        const rows = OPERANDS.flatMap(([label, operand]) =>
          FORMS.map(form => [target.source(form), label, form, operand] as const));

        it.each(rows)('%s on %s', (_source, _label, form, operand) => {
          const expected = nativeUpdate(operand(), form);
          const context = contextOf(target.data(operand()));

          const result = run(target.source(form), context);

          expect(result).toBe(expected.result);
          expect(target.read(context)).toBe(expected.after);
        });
      });

      it('should convert once, calling valueOf exactly once in each form', () => {
        const calls = FORMS.map(form => {
          const operand = counted();
          run(target.source(form), contextOf(target.data(operand)));
          return operand.calls;
        });

        expect(calls).toEqual([1, 1, 1, 1]);
      });

      it('should throw on a Symbol before writing, leaving the Symbol', () => {
        const symbol = Symbol('s');
        const expected = nativeError(symbol) as Error;
        const context = recordingOf(target.data(symbol));

        const error = caught(() => run(target.source('x++'), context));

        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).message).toBe(expected.message);
        expect(target.read(context)).toBe(symbol);
        expect(context.writes).toEqual([]);
      });

      it('should throw from a valueOf before writing, leaving the operand', () => {
        const operand = { valueOf(): number { throw new Error('boom'); } };
        const context = recordingOf(target.data(operand));

        const error = caught(() => run(target.source('x++'), context));

        expect((error as Error).message).toBe('boom');
        expect(target.read(context)).toBe(operand);
        expect(context.writes).toEqual([]);
      });
    });

    describe('a listed function as the operand (A40)', () => {

      const listed = globalThis.eval;

      it('should give NaN for tools.eval++ and write NaN, as JavaScript does', () => {
        const context = contextOf({ tools: { eval: listed } });

        expect(run('tools.eval++', context)).toBe(nativeUpdate(listed, 'x++').result);
        expect((context.get('tools') as Record<string, unknown>)['eval']).toBe(NaN);
      });

      it('should give NaN for e++ and write NaN, as JavaScript does', () => {
        const context = contextOf({ e: listed });

        expect(run('e++', context)).toBe(nativeUpdate(listed, 'x++').result);
        expect(context.get('e')).toBe(NaN);
      });

      // The prefix form, which has overwritten a listed function since before
      // 0.13.0, with a string up to 0.13.1 (`docs/backlog-retired.md` A41).
      it('should give NaN for ++tools.eval and write NaN, as JavaScript does', () => {
        const context = contextOf({ tools: { eval: listed } });

        expect(run('++tools.eval', context)).toBe(nativeUpdate(listed, '++x').result);
        expect((context.get('tools') as Record<string, unknown>)['eval']).toBe(NaN);
      });
    });

    describe('a write policy', () => {

      it('should refuse tools.x++ with the policy\'s message, leaving tools.x', () => {
        const tools = { x: 1 };
        const context = new PolicedContext(fromContext({ tools }, options), options);

        const error = caught(() => run('tools.x++', context));

        expect((error as Error).message).toBe(`policy refused a write to "x"`);
        expect((context.get('tools') as Record<string, unknown>)['x']).toBe(1);
      });
    });

    /**
     * An identifier update reports the read of its operand, which up to 0.13.3
     * it did not (`docs/a45/plan.md` D9). A loop counter is bound by the scope
     * `for-statement.ts` pushes, so each read the update reports is flagged
     * `scoped`, and a dependency tracker drops it. The update's reads are told
     * from the test's `i < 2` by the node's position.
     */
    describe('the read of an identifier update (D9)', () => {

      it('should report each read of a for loop\'s i++, flagged scoped, and no dependency', () => {
        const source = 'for (let i = 0; i < 2; i++) {}';
        const operandAt = source.indexOf('i++');
        const updateReads: boolean[] = [];
        const tracker = createDependencyTracker();
        const state = EvalState.fromContext(contextOf({}), options);
        state.hooks.onRead(event => {
          if (event.node.start === operandAt) {
            updateReads.push(event.scoped === true);
          }
        });
        tracker.install(state.hooks);

        evaluate(programOf(source), state);

        expect(updateReads).toEqual([true, true]);
        expect([...tracker.dependencies]).toEqual([]);
      });
    });
  });

  /**
   * A member update spelled as a case variant writes to the key the lookup
   * matched, as the read of it does (`docs/backlog.md` A44). The member matrix
   * again, under `caseInsensitive` only, since case-sensitive `OBJ` is another
   * name. The native run is the same update spelled as the data spells it, and
   * the object's own keys are asserted whole, so a write that also created `X`
   * goes red.
   */
  describe('under caseInsensitive, a case variant of the member (A44)', () => {

    const options = { caseInsensitive: true };

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, options));

    const rows = OPERANDS.flatMap(([label, operand]) =>
      FORMS.map(form => [form.replace('x', 'OBJ.X'), label, form, operand] as const));

    it.each(rows)('%s on %s writes the matched key', (source, _label, form, operand) => {
      const expected = nativeUpdate(operand(), form);
      const obj: Record<string, unknown> = { x: operand() };
      const context = EvalContext.fromContext({ obj }, options);

      const result = run(source, context);

      expect(result).toBe(expected.result);
      expect((context.get('obj') as Record<string, unknown>)['x']).toBe(expected.after);
      expect(Object.keys(obj)).toEqual(['x']);
    });
  });

  /**
   * `getKey` gives `undefined` when `get` finds nothing, and up to 0.13.1 that
   * was the key written (`docs/backlog-retired.md` A43). The same cases as
   * `assignment-expression.spec.ts`, for an update; each asserts the store's
   * whole key list, which catches the stray key as the string `"undefined"` or
   * as the value.
   */
  describe('under caseInsensitive, a name get finds nothing for (A43)', () => {

    const options = { caseInsensitive: true };

    const SHAPES: { label: string; make: (data: Context) => { context: EvalContext; keys: () => unknown[] } }[] = [
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

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, options));

    describe.each(SHAPES)('$label', shape => {

      it.each<[string, string, Context, string]>([
        ['x++', '{ x: undefined }', { x: undefined }, 'x'],
        ['y++', '{}', {}, 'y'],
      ])('%s on %s writes the name as written', (source, _label, data, intended) => {
        const { context, keys } = shape.make({ ...data });

        expect(run(source, context)).toBe(NaN);

        expect(context.get(intended)).toBe(NaN);
        expect(keys()).toEqual([intended]);
      });
    });

    // Not the plain object held as it is: its context matches no case variant,
    // for a read either.
    describe.each(SHAPES.slice(0, 2))('$label', shape => {

      it('should still write the matched spelling of a case variant', () => {
        const { context, keys } = shape.make({ Foo: 1 });

        expect(run('foo++', context)).toBe(1);

        expect(context.get('Foo')).toBe(2);
        expect(keys()).toEqual(['Foo']);
      });
    });
  });
});
