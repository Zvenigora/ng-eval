import { AnyNode } from 'acorn';
import { EvalContext, EvalKnownOptions, EvalState } from '../classes/eval';
import { Context, Registry, fromContext } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * A binding write to a name the evaluator resolves to a built-in value is
 * refused when nothing else binds it: `undefined` in both modes, and under
 * `caseInsensitive` any spelling of `undefined`, `null`, `true` or `false`.
 *
 * Up to 0.13.1 a write to `undefined` landed on the context like any other
 * key, and `identifier.ts` reads the context before its literals, so every
 * later evaluation on that context read the written value
 * (`docs/backlog-retired.md` A46); A43's fallback would have done the same for
 * a case variant of a literal. It is refused only where all four hold: no
 * pushed scope binds the name, the context does not resolve it, the name is
 * one of those, and the context's `set` is `EvalContext`'s own - a class that
 * overrides `set` decides these writes itself. A key the context resolves to a
 * value other than `undefined` stays writable. A case variant of `undefined`
 * is refused under a case-sensitive walk too, when the store the write lands
 * in compares keys case-insensitively.
 *
 * Each refusal asserts its message and the context's whole key list, which a
 * write that landed before the throw would change.
 */
describe('read-only names', () => {

  /** Parses to the whole `Program`, the way `EvalService` does. */
  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

  const refusal = (name: string): string => `Assignment to read-only name "${name}".`;

  /** The store a context's writes land in, as a key list. */
  const keysOf = (context: EvalContext): unknown[] => {
    const original = context.original;
    return original instanceof Registry
      ? [...(original as Registry<unknown, unknown>).keys]
      : Object.keys(original as object);
  };

  const caught = (run: () => unknown): unknown => {
    try {
      run();
    } catch (error) {
      return error;
    }
    throw new Error('expected a throw');
  };

  /** Refuses every key write with an error of its own, as a signal context does. */
  class RefusingContext extends EvalContext {
    override set(): void {
      throw new Error('this context refuses key writes');
    }
  }

  /**
   * Resolves no key, through an overridden `getKey`, and keeps `EvalContext`'s
   * own `set`. With `EvalContext`'s own `getKey` a name a pushed scope binds is
   * always resolved, since the scopes come first and count by presence, so the
   * scope condition is implied by the resolution one. Only a context like this
   * one separates them.
   */
  class UnresolvingContext extends EvalContext {
    override getKey(): undefined {
      return undefined;
    }
  }

  /** Records every key write and makes it. */
  class RecordingContext extends EvalContext {
    readonly writes: unknown[] = [];
    override set(key: unknown, value: unknown): void {
      this.writes.push(key);
      super.set(key, value);
    }
  }

  describe.each<[string, EvalKnownOptions]>([
    ['case-sensitive', {}],
    ['caseInsensitive', { caseInsensitive: true }],
  ])('%s', (_mode, options) => {

    const contextOf = (data: Context = {}): EvalContext => EvalContext.fromContext(data, options);

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, options));

    /** `undefined` still reads as itself, and an unset name still equals it. */
    const expectUndefinedIntact = (context: EvalContext) => {
      expect(run('undefined', context)).toBeUndefined();
      expect(run('x === undefined', context)).toBe(true);
    };

    // The assignment visitor and the update visitor are `assignToBinding`'s
    // two callers; `undefined += 1` is the assignment's compound path.
    const refusedInBoth: string[] = ['undefined = 1', 'undefined++', '--undefined', 'undefined += 1'];

    it.each(refusedInBoth)('should refuse %s, writing nothing', source => {
      const context = contextOf();

      const error = caught(() => run(source, context));

      expect((error as Error).message).toBe(refusal('undefined'));
      expect(keysOf(context)).toEqual([]);
      expect(context.scopes.length).toBe(0);
      expectUndefinedIntact(context);
    });

    it('should let a parameter shadow undefined, and leak nothing', () => {
      const context = contextOf();

      expect(run('(undefined => (undefined = 2, undefined))(1)', context)).toBe(2);

      expect(keysOf(context)).toEqual([]);
      expectUndefinedIntact(context);
    });

    it('should let a parameter shadow undefined where getKey resolves nothing', () => {
      const context = new UnresolvingContext(fromContext({}, options), options);

      expect(run('(undefined => (undefined = 2, undefined))(1)', context)).toBe(2);

      expect(keysOf(context)).toEqual([]);
    });

    it('should defer to a context class whose set refuses on its own', () => {
      const context = new RefusingContext(fromContext({}, options), options);

      const error = caught(() => run('undefined = 1', context));

      expect((error as Error).message).toBe('this context refuses key writes');
    });

    // The recorded limit (`docs/backlog-retired.md` A46): a class that
    // overrides `set` decides these writes itself, so one that only records
    // and calls `super.set` lets `undefined` be rebound on it.
    it('should leave the write to a context class that overrides set, even one that calls super', () => {
      const context = new RecordingContext(fromContext({}, options), options);

      expect(run('undefined = 1', context)).toBe(1);

      expect(context.writes).toEqual(['undefined']);
      expect(run('undefined', context)).toBe(1);
    });
  });

  describe('case-sensitive', () => {

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, {}));

    it.each<[string, string, unknown]>([
      ['TRUE = 0', 'TRUE', 0],
      ['NULL = 1', 'NULL', 1],
      ['UNDEFINED = 1', 'UNDEFINED', 1],
    ])('should allow %s: an ordinary name in this mode', (source, name, value) => {
      const context = EvalContext.fromContext({}, {});

      expect(run(source, context)).toBe(value);

      expect(keysOf(context)).toEqual([name]);
      expect(run(name, context)).toBe(value);
      expect(run('undefined', context)).toBeUndefined();
    });

    // A key held as `undefined` resolves to nothing, as A43 counts it, so a
    // read of it already gives the literal and the write would rebind it.
    it('should refuse undefined = 1 where the host holds undefined as undefined', () => {
      const data: Record<string, unknown> = { undefined: undefined };
      const context = EvalContext.fromContext(data, {});

      const error = caught(() => run('undefined = 1', context));

      expect((error as Error).message).toBe(refusal('undefined'));
      expect(Object.keys(data)).toEqual(['undefined']);
      expect(data['undefined']).toBeUndefined();
    });
  });

  // The split the README warns of: `caseInsensitive` on the context, so its
  // original is a case-insensitive `Registry`, and not on the walk.
  describe('a case-insensitive store, walked case-sensitively', () => {

    const contextOf = (): EvalContext => EvalContext.fromContext({}, { caseInsensitive: true });

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, {}));

    it.each<[string, string]>([
      ['UNDEFINED = 1', 'UNDEFINED'],
      ['Undefined++', 'Undefined'],
    ])('should refuse %s, writing nothing', (source, name) => {
      const context = contextOf();

      const error = caught(() => run(source, context));

      expect((error as Error).message).toBe(refusal(name));
      expect(keysOf(context)).toEqual([]);
      expect(run('undefined', context)).toBeUndefined();
    });

    it('should allow TRUE = 0: an ordinary name to a case-sensitive walk', () => {
      const context = contextOf();

      expect(run('TRUE = 0', context)).toBe(0);

      expect(keysOf(context)).toEqual(['TRUE']);
    });
  });

  describe('caseInsensitive', () => {

    const options = { caseInsensitive: true };

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(programOf(source), EvalState.fromContext(context, options));

    it.each<[string, string, string, unknown]>([
      ['UNDEFINED = 1', 'UNDEFINED', 'UNDEFINED', undefined],
      ['Undefined++', 'Undefined', 'UNDEFINED', undefined],
      ['TRUE = 0', 'TRUE', 'TRUE', true],
      ['NULL = 1', 'NULL', 'NULL', null],
      ['FALSE = 1', 'FALSE', 'FALSE', false],
      ['False += 1', 'False', 'FALSE', false],
    ])('should refuse %s, writing nothing', (source, name, read, value) => {
      const context = EvalContext.fromContext({}, options);

      const error = caught(() => run(source, context));

      expect((error as Error).message).toBe(`Assignment to read-only name "${name}".`);
      expect([...(context.original as Registry<unknown, unknown>).keys]).toEqual([]);
      expect(run(read, context)).toBe(value);
      expect(run('x === undefined', context)).toBe(true);
    });

    it('should let a parameter shadow a case variant of a literal', () => {
      const context = EvalContext.fromContext({}, options);

      expect(run('(TRUE => (TRUE = 5, TRUE))(1)', context)).toBe(5);

      expect([...(context.original as Registry<unknown, unknown>).keys]).toEqual([]);
      expect(run('TRUE', context)).toBe(true);
    });

    // Each reads the parameter back, so a write that went nowhere fails.
    it.each<[string]>([
      ['(undefined => (UNDEFINED = 2, undefined))(1)'],
      ['(TRUE => (True = 2, TRUE))(1)'],
    ])('should write the parameter for %s, a case variant the parameter scope matches', (source) => {
      const context = EvalContext.fromContext({}, options);

      expect(run(source, context)).toBe(2);

      expect(context.scopes.length).toBe(0);
      expect([...(context.original as Registry<unknown, unknown>).keys]).toEqual([]);
    });

    it('should write a name the host holds: getKey resolves it', () => {
      const context = EvalContext.fromContext({ TRUE: 1 }, options);

      expect(run('TRUE = 2', context)).toBe(2);

      expect(context.get('TRUE')).toBe(2);
      expect([...(context.original as Registry<unknown, unknown>).keys]).toEqual(['TRUE']);
    });

    // A name a lookup answers is resolved by the context, so the write is
    // allowed. It lands on the context's own store, which is read before the
    // lookups, so later reads see the written value, not the lookup's.
    it('should write undefined when a lookup resolves it, and read the write back', () => {
      const context = EvalContext.fromContext({}, options);
      context.lookups.push(key => (key === 'undefined' ? 7 : undefined));

      expect(run('undefined', context)).toBe(7);

      expect(run('undefined = 1', context)).toBe(1);

      expect([...(context.original as Registry<unknown, unknown>).keys]).toEqual(['undefined']);
      expect(run('undefined', context)).toBe(1);
    });
  });
});
