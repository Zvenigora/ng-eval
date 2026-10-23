import { AnyNode } from 'acorn';
import { EvalContext, EvalKnownOptions, EvalMemberWrite, EvalNodeHookEvent, EvalState } from '../classes/eval';
import { Context, Registry, fromContext } from '../classes/common';
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

  /**
   * A logical assignment that short-circuits gives its target's value and does
   * nothing more: its right side is not evaluated, and nothing is written.
   *
   * Up to 0.13.2 the right side was evaluated and the target written back in
   * every case (`docs/backlog.md` A45, part 1): `a ||= f()` with `a` truthy
   * called `f`, and a write policy refused a short-circuited member write that
   * JavaScript never makes. The value was already JavaScript's, since the
   * operator was applied to the two values, so each case asserts the effects:
   * the right side's call count and the writes, recorded where they land.
   *
   * 28 of these 64 cases compare against the same expression run natively,
   * beside the evaluator: the 16 identifier and 8 member value rows (result,
   * target afterwards and the right side's call count), the 3 policy rows that
   * do not throw (result), and the getter row (result, getter and setter
   * counts). The 24 recorder rows check the writes against each row's
   * short-circuit flag, which the value rows confirm natively. The other 12
   * check values written in the case: the policy's refusal, the read and node
   * hooks, the arrow rows, `const`, `TRUE` under `caseInsensitive`, and the
   * `fetch` pin.
   *
   * A member target is still evaluated twice when the operator does not
   * short-circuit; that is part 2.
   */
  describe('a logical assignment that short-circuits (A45 part 1)', () => {

    /**
     * Parses at ES2021, where logical assignment arrives. `EvalService`'s own
     * `ecmaVersion: 2020` refuses it at the parse, so it reaches this visitor
     * only through a caller's parser options.
     */
    const programOf = (source: string): AnyNode =>
      parse(source, { ecmaVersion: 2021, extractExpressions: false }) as AnyNode;

    type Operator = '||=' | '&&=' | '??=';

    /** The right side, `f()`, counting its calls. */
    const rightSide = () => {
      const f = Object.assign(() => { f.calls += 1; return 7; }, { calls: 0 });
      return f;
    };

    /** The assignment run natively on `a`: its result, `a` afterwards, and `f`'s calls. */
    const nativeIdentifier = (initial: unknown, operator: Operator) => {
      const f = rightSide();
      let a = initial;
      let result: unknown;
      switch (operator) {
        case '||=': result = (a ||= f()); break;
        case '&&=': result = (a &&= f()); break;
        case '??=': result = (a ??= f()); break;
      }
      return { result, after: a, calls: f.calls };
    };

    /** The assignment run natively on `o.a`. */
    const nativeMember = (initial: unknown, operator: Operator) => {
      const f = rightSide();
      const o: { a: unknown } = { a: initial };
      let result: unknown;
      switch (operator) {
        case '||=': result = (o.a ||= f()); break;
        case '&&=': result = (o.a &&= f()); break;
        case '??=': result = (o.a ??= f()); break;
      }
      return { result, after: o.a, calls: f.calls };
    };

    /**
     * Each operator on a left side it short-circuits on and one it does not.
     * `0` and `''` are there for `??=`: falsy, and not nullish.
     */
    const ROWS: [Operator, string, unknown, boolean][] = [
      ['||=', '1', 1, true],
      ['||=', '0', 0, false],
      ['&&=', '0', 0, true],
      ['&&=', '1', 1, false],
      ['??=', '0', 0, true],
      ['??=', "''", '', true],
      ['??=', 'null', null, false],
      ['??=', 'undefined', undefined, false],
    ];

    /**
     * Records every write that reaches the context - a binding through `set`,
     * a member through the policy's consultation - and allows it.
     */
    class RecordingContext extends EvalContext {

      readonly sets: unknown[] = [];
      readonly asked: unknown[] = [];

      override set(key: unknown, value: unknown): void {
        this.sets.push(key);
        super.set(key, value);
      }

      override checkMemberWrite(write: EvalMemberWrite): void {
        this.asked.push(write.key);
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

    /** `{ a: initial }`, recording each property write that reaches it. */
    const recordingObject = (initial: unknown) => {
      const writes: PropertyKey[] = [];
      const o = new Proxy({ a: initial } as Record<string, unknown>, {
        set: (target, key, value, receiver) => {
          writes.push(key);
          return Reflect.set(target, key, value, receiver);
        },
      });
      return { o, writes };
    };

    const caught = (run: () => unknown): unknown => {
      try {
        run();
      } catch (error) {
        return error;
      }
      throw new Error('expected a throw');
    };

    describe.each<[string, EvalKnownOptions]>([
      ['case-sensitive', {}],
      ['caseInsensitive', { caseInsensitive: true }],
    ])('%s', (_mode, options) => {

      const run = (source: string, context: EvalContext): unknown =>
        evaluate(programOf(source), EvalState.fromContext(context, options));

      describe('an identifier target', () => {

        it.each(ROWS)('a %s f() on a = %s', (operator, _label, initial, shortCircuits) => {
          const expected = nativeIdentifier(initial, operator);
          expect(expected.calls).toBe(shortCircuits ? 0 : 1);

          const f = rightSide();
          const context = EvalContext.fromContext({ a: initial, f }, options);

          expect(run(`a ${operator} f()`, context)).toBe(expected.result);
          expect(context.get('a')).toBe(expected.after);
          expect(f.calls).toBe(expected.calls);
        });

        it.each(ROWS)('a %s f() on a = %s writes only when it does not short-circuit',
          (operator, _label, initial, shortCircuits) => {
            const context = new RecordingContext(fromContext({ a: initial, f: rightSide() }, options), options);

            run(`a ${operator} f()`, context);

            expect(context.sets).toEqual(shortCircuits ? [] : ['a']);
            expect(context.asked).toEqual([]);
          });

        it('should report a read of a and none of b for a short-circuited a ||= b', () => {
          const read = (a: number): unknown[] => {
            const state = EvalState.fromContext(EvalContext.fromContext({ a, b: 2 }, options), options);
            const keys: unknown[] = [];
            state.hooks.onRead(event => keys.push(event.key));
            evaluate(programOf('a ||= b'), state);
            return keys;
          };

          expect(read(1)).toEqual(['a']);
          // The setup can tell the two apart: one that does not short-circuit reads b.
          expect(read(0)).toEqual(['a', 'b']);
        });
      });
    });

    describe('a member target', () => {

      const run = (source: string, context: EvalContext): unknown =>
        evaluate(programOf(source), EvalState.fromContext(context, {}));

      it.each(ROWS)('o.a %s f() on o.a = %s', (operator, _label, initial, shortCircuits) => {
        const expected = nativeMember(initial, operator);
        expect(expected.calls).toBe(shortCircuits ? 0 : 1);

        const f = rightSide();
        const o: Record<string, unknown> = { a: initial };
        const context = EvalContext.fromContext({ o, f }, {});

        expect(run(`o.a ${operator} f()`, context)).toBe(expected.result);
        expect(o['a']).toBe(expected.after);
        expect(f.calls).toBe(expected.calls);
      });

      it.each(ROWS)('o.a %s f() on o.a = %s writes, and asks the policy, only when it does not short-circuit',
        (operator, _label, initial, shortCircuits) => {
          const { o, writes } = recordingObject(initial);
          const context = new RecordingContext(fromContext({ o, f: rightSide() }, {}), {});

          run(`o.a ${operator} f()`, context);

          expect(writes).toEqual(shortCircuits ? [] : ['a']);
          expect(context.asked).toEqual(shortCircuits ? [] : ['a']);
          expect(context.sets).toEqual([]);
        });

      describe('under a policy that refuses what the walk did not create', () => {

        it.each<[string, unknown, Operator]>([
          ['o.a ||= 9', 1, '||='],
          ['o.a &&= 9', 0, '&&='],
          ['o.a ??= 9', 0, '??='],
        ])('%s on o.a = %p does not throw, and leaves o.a', (source, initial, operator) => {
          const expected = nativeMember(initial, operator);
          const o: Record<string, unknown> = { a: initial };
          const context = new PolicedContext(fromContext({ o }, {}), {});

          expect(run(source, context)).toBe(expected.result);
          expect(o['a']).toBe(initial);
        });

        // The setup can refuse: the same policy refuses one that does not short-circuit.
        it('should refuse o.a ||= 9 on o.a = 0, leaving o.a', () => {
          const o: Record<string, unknown> = { a: 0 };
          const context = new PolicedContext(fromContext({ o }, {}), {});

          const error = caught(() => run('o.a ||= 9', context));

          expect((error as Error).message).toBe('policy refused a write to "a"');
          expect(o['a']).toBe(0);
        });
      });
    });

    describe('the node hook that closes it', () => {

      /** Every 'after' event an AssignmentExpression closes with, for `a ||= f()`. */
      const afterEvents = (a: number) => {
        const f = rightSide();
        const state = EvalState.fromContext(EvalContext.fromContext({ a, f }, {}), {});
        const events: EvalNodeHookEvent[] = [];
        state.hooks.on('after', 'AssignmentExpression', event => events.push(event));
        evaluate(programOf('a ||= f()'), state);
        return { events, calls: f.calls };
      };

      // A dropped `afterVisitor` is not a missing event: `exit` flushes the
      // frame when the enclosing statement closes, synthesised, with
      // `completed: false` and no value. So the case asserts both. Red with
      // the short-circuit's `afterVisitor` dropped (e), at `completed`; with no
      // early return (d), at the count; and with the right side evaluated
      // first (a), at the call count.
      it('should close a short-circuited a ||= f() once, completed, with the value of a', () => {
        const { events, calls } = afterEvents(1);

        expect(events.length).toBe(1);
        expect(events[0].completed).not.toBe(false);
        expect(events[0].value).toBe(1);
        expect(calls).toBe(0);
      });

      // The arm that tells the two apart, on the path the fix leaves alone: no
      // probe reds it.
      it('should close a ||= f() that does not short-circuit once, completed, with the value of f()', () => {
        const { events, calls } = afterEvents(0);

        expect(events.length).toBe(1);
        expect(events[0].completed).not.toBe(false);
        expect(events[0].value).toBe(7);
        expect(calls).toBe(1);
      });
    });

    describe('the write path, not reached', () => {

      /** `{ g }`, an accessor holding `held`, counting its reads and writes. */
      const accessor = (held: unknown) => {
        const counts = { getter: 0, setter: 0 };
        const o = {
          get g(): unknown { counts.getter += 1; return held; },
          set g(value: unknown) { counts.setter += 1; held = value; },
        };
        return { o, counts };
      };

      // Red under the write kept (b) and no early return (d): both reach
      // `evaluateMember`, which reads the getter a second time, and write.
      it('should read o.g once and write nothing for o.g ||= 1, the getter truthy', () => {
        const native = accessor(5);
        const nativeResult = (native.o.g ||= 1);
        expect(native.counts).toEqual({ getter: 1, setter: 0 });

        const { o, counts } = accessor(5);
        const context = EvalContext.fromContext({ o }, {});

        expect(evaluate(programOf('o.g ||= 1'), EvalState.fromContext(context, {}))).toBe(nativeResult);
        expect(counts).toEqual(native.counts);
      });

      // Red under (b) and (d): `assignToBinding` refuses the `const`. It is not
      // run natively, since TypeScript refuses the assignment at compile time.
      it('should give 1 for const c = 1; c ||= 2, without the const refusal', () => {
        const context = EvalContext.fromContext({}, {});

        expect(evaluate(programOf('const c = 1; c ||= 2'), EvalState.fromContext(context, {}))).toBe(1);
      });

      // Red under (b) and (d): `assignToBinding` refuses a case variant of a
      // literal under `caseInsensitive` (`docs/backlog-retired.md` A46).
      it('should give true for TRUE ||= 1 under caseInsensitive, without the read-only refusal', () => {
        const options = { caseInsensitive: true };
        const context = EvalContext.fromContext({}, options);

        expect(evaluate(programOf('TRUE ||= 1'), EvalState.fromContext(context, options))).toBe(true);
        expect([...(context.original as Registry<unknown, unknown>).keys]).toEqual([]);
      });
    });

    describe('inside an arrow body', () => {

      it.each<[string, Context, unknown, number]>([
        ['(p => (p ||= f(), p))(1)', {}, 1, 0],
        ['(p => (p ||= f(), p))(0)', {}, 7, 1],
        ['(() => (o.a ??= f(), o.a))()', { o: { a: 0 } }, 0, 0],
        ['(() => (o.a ??= f(), o.a))()', { o: { a: null } }, 7, 1],
      ])('%s on %p leaves no scope and a balanced value stack', (source, data, result, calls) => {
        const f = rightSide();
        const context = EvalContext.fromContext({ ...data, f }, {});
        const state = EvalState.fromContext(context, {});

        expect(evaluate(programOf(source), state)).toBe(result);

        expect(f.calls).toBe(calls);
        expect(context.scopes.length).toBe(0);
        // `evaluate` pops exactly one: anything left is a value nothing popped.
        expect(state.result.stack.length).toBe(0);
      });
    });

    /**
     * A pin of existing behaviour, not a test of this fix: the funnel refuses
     * the function as the left side pushes it, before the short-circuit test,
     * so the row passed before the fix and no probe reds it.
     *
     * A logical assignment reads its target's value, in JavaScript as here, so
     * the funnel refuses a listed function there as it does `fetch || 1`: the
     * value pushed is the function. Part 2 does not change this row: it removes
     * the read from `=` only.
     *
     * jsdom has no global `fetch`, so the listed function is one bound under
     * the listed name, which the funnel refuses by its name, `"bound fetch"`.
     * The message names the node, so it reads `fetch` either way.
     */
    it('should refuse fetch ||= 1 with the funnel\'s message, as fetch || 1 is', () => {
      const listed = function fetch(): void { return undefined; }.bind(null);
      expect(listed.name).toBe('bound fetch');
      const run = (source: string, context: EvalContext): unknown =>
        evaluate(programOf(source), EvalState.fromContext(context, {}));
      const message = 'Access to dangerous function "fetch" is blocked for security reasons';

      expect((caught(() => run('fetch || 1', EvalContext.fromContext({ fetch: listed }, {}))) as Error).message)
        .toBe(message);

      const context = EvalContext.fromContext({ fetch: listed }, {});
      expect((caught(() => run('fetch ||= 1', context)) as Error).message).toBe(message);
      expect(context.get('fetch')).toBe(listed);
    });
  });
});
