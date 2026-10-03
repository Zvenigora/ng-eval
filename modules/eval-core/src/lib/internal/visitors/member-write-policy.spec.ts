import { AnyNode } from 'acorn';
import { EvalContext, EvalMemberWrite, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * `EvalContext.checkMemberWrite`: a context that implements it is asked about
 * every member write before it happens, and told whether the target is an
 * object the same state's literals created. One that does not implement it -
 * `EvalContext` itself - is never asked, and its states record nothing.
 *
 * The policy here is the one `eval-signals` builds on: refuse any member write
 * whose target the walk did not create. It records what it was asked, so a
 * row can tell "refused" from "never consulted" - a context that threw on
 * every write would pass the refusal rows and fail the allowed ones, and one
 * never consulted would fail the refusal rows.
 *
 * Parsed to the whole `Program`, as `EvalService` does, so `let` and blocks
 * are available.
 */
describe('member-write policy', () => {

  class RefusedWrite extends Error {
    constructor(readonly key: unknown) {
      super(`refused: ${String(key)}`);
    }
  }

  class PolicedContext extends EvalContext {

    readonly writes: EvalMemberWrite[] = [];

    override checkMemberWrite(write: EvalMemberWrite): void {
      this.writes.push(write);
      if (!write.createdByEvaluation) {
        throw new RefusedWrite(write.key);
      }
    }
  }

  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020 }) as AnyNode;

  const dataOf = () => ({ o: { a: 1, n: 1, inner: { z: 0 } } });

  const run = (source: string, context: EvalContext): unknown =>
    evaluate(programOf(source), EvalState.fromContext(context));

  describe('opted in', () => {

    describe('a target the walk did not create', () => {

      it('should refuse an assignment, write nothing, and report the write', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run('o.a = 2', context)).toThrow(RefusedWrite);

        expect(data.o.a).toBe(1);
        expect(context.writes).toEqual([
          { target: data.o, key: 'a', createdByEvaluation: false },
        ]);
        expect(context.writes[0].target).toBe(data.o);
      });

      it('should refuse a compound assignment', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run('o.a += 5', context)).toThrow(RefusedWrite);

        expect(data.o.a).toBe(1);
      });

      it('should refuse a computed key, naming the evaluated key', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run('let k = "a"; o[k] = 2', context)).toThrow(RefusedWrite);

        expect(data.o.a).toBe(1);
        expect(context.writes.map(w => w.key)).toEqual(['a']);
      });

      it('should refuse a postfix and a prefix update', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run('o.n++', context)).toThrow(RefusedWrite);
        expect(() => run('--o.n', context)).toThrow(RefusedWrite);

        expect(data.o.n).toBe(1);
        expect(context.writes.map(w => w.key)).toEqual(['n', 'n']);
      });

      it('should refuse a write made inside an arrow body', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run('[o].map(u => (u.a = 2))', context)).toThrow(RefusedWrite);

        expect(data.o.a).toBe(1);
      });

      it('should refuse a write through a binding the walk declared', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        // The binding is the walk's; the object it names is not.
        expect(() => run('let u = o; u.a = 2', context)).toThrow(RefusedWrite);

        expect(data.o.a).toBe(1);
      });

      it('should refuse a write one level into a spread copy', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        // A spread copies one level: `c` is the walk's, `c.inner` is still the
        // caller's.
        expect(() => run('let c = { ...o }; c.inner.z = 1', context)).toThrow(RefusedWrite);

        expect(data.o.inner.z).toBe(0);
      });

      it('should pop the scopes of the block the refusal left', () => {
        const context = new PolicedContext(dataOf(), {});

        expect(() => run('{ let y = 1; o.a = y }', context)).toThrow(RefusedWrite);

        expect(context.scopes.length).toBe(0);
      });
    });

    describe('a target a literal on the same state created', () => {

      it('should allow assignment to an object literal', () => {
        const context = new PolicedContext(dataOf(), {});

        expect(run('let x = {}; x.a = 1; x.a', context)).toBe(1);

        expect(context.writes).toEqual([
          { target: expect.any(Object), key: 'a', createdByEvaluation: true },
        ]);
      });

      it('should allow assignment and update on an array literal', () => {
        const context = new PolicedContext(dataOf(), {});

        expect(run('let a = []; a[0] = 5; a[0]++; a[0]', context)).toBe(6);

        expect(context.writes.map(w => w.createdByEvaluation)).toEqual([true, true]);
      });

      it('should allow a write to a regex literal', () => {
        const context = new PolicedContext(dataOf(), {});

        // `lastIndex`, the write a regex is usually given. Until A23's fix this
        // row wrote `r.tag` instead: `safeSetProperty` defined rather than
        // assigned, and refused a non-configurable property like `lastIndex`
        // whatever the policy said.
        expect(run('let r = /a/g; r.lastIndex = 3; r.lastIndex', context)).toBe(3);

        expect(context.writes.map(w => w.createdByEvaluation)).toEqual([true]);
      });

      it('should allow a write to a spread copy, leaving the source alone', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(run('let c = { ...o }; c.a = 3; c.a', context)).toBe(3);

        expect(data.o.a).toBe(1);
      });

      it('should allow a write inside an arrow body to a literal created outside it', () => {
        const context = new PolicedContext(dataOf(), {});

        expect(run('let x = { n: 1 }; [1, 2].map(v => (x.n += v)); x.n', context)).toBe(4);
      });

      it('should allow a write outside to a literal an arrow body created', () => {
        const context = new PolicedContext(dataOf(), {});

        // The array is `map`'s and is not recorded; each element is the arrow
        // body's object literal, walked on the same state, and is.
        expect(run('let r = [1, 2].map(v => ({ n: v })); r[1].n = 9; r[1].n', context)).toBe(9);
      });
    });

    describe('a rest value or an arrow function the walk created', () => {

      it.each([
        ['an array rest', 'let [first, ...rest] = [1, 2, 3]; rest[0] = 9; rest[0]', 9],
        ['an object rest', 'let { a, ...others } = { a: 1, b: 2 }; others.b = 5; others.b', 5],
        ['a parameter rest', '((...xs) => (xs[0] = 7, xs[0]))(1, 2)', 7],
        ['an arrow function', 'let fn = x => x; fn.tag = 1; fn.tag', 1],
      ])('should allow a write to %s', (_label, source, expected) => {
        const context = new PolicedContext(dataOf(), {});

        expect(run(source, context)).toBe(expected);

        expect(context.writes.map(w => w.createdByEvaluation)).toEqual([true]);
      });

      it('should allow a write to an object rest of the caller\'s data, leaving the source alone', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(run('let { a, ...others } = o; others.n = 5; others.n', context)).toBe(5);

        expect(data.o.n).toBe(1);
      });

      it('should refuse a write one level into a rest, as into a spread', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run('let { a, ...others } = o; others.inner.z = 1', context)).toThrow(RefusedWrite);
        expect(() => run('((...xs) => (xs[0].a = 2))(o)', context)).toThrow(RefusedWrite);

        expect(data.o.inner.z).toBe(0);
        expect(data.o.a).toBe(1);
      });

      it('should bind a rest of a string without recording it', () => {
        const context = new PolicedContext(dataOf(), {});

        // `args.slice(i)` of a string is a string, which a `WeakSet` rejects.
        expect(run('let [h, ...t] = "abc"; t', context)).toBe('bc');
      });
    });

    describe('a call\'s result', () => {

      it.each([
        ['map', 'let m = [1, 2].map(v => v * 2); m[0] = 0; m[0]'],
        ['filter', 'let f = [3, 1, 2].filter(v => v > 1); f[0] = 9; f[0]'],
        ['slice', 'let t = [1, 2].slice(); t[0] = 0; t[0]'],
        ['concat', 'let c = [1].concat([2]); c[0] = 5; c[0]'],
        ['split', 'let s = "a,b".split(","); s[0] = "c"; s[0]'],
      ])('should refuse a write to what %s returned, though it is new', (_label, source) => {
        const context = new PolicedContext(dataOf(), {});

        expect(() => run(source, context)).toThrow(RefusedWrite);

        expect(context.writes).toEqual([
          { target: expect.any(Array), key: 0, createdByEvaluation: false },
        ]);
      });

      it('should refuse a write to a call result that is the caller\'s own data', () => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        // Why no call result counts as created: this one is `o` itself.
        expect(() => run('[o].find(u => true).a = 2', context)).toThrow(RefusedWrite);

        expect(data.o.a).toBe(1);
        expect(context.writes[0].target).toBe(data.o);
      });

      it('should allow a write once the result is spread into a literal', () => {
        const context = new PolicedContext(dataOf(), {});

        expect(run('let m = [...[1, 2].map(v => v)]; m[0] = 9; m[0]', context)).toBe(9);
      });
    });
  });

  describe('not opted in', () => {

    it('should leave checkMemberWrite undefined on EvalContext', () => {
      expect(EvalContext.prototype.checkMemberWrite).toBeUndefined();
    });

    it('should hold no record on a state over an EvalContext, and let the write land', () => {
      const data = dataOf();
      const state = EvalState.fromContext(new EvalContext(data, {}));

      expect(state.createdObjects).toBeUndefined();

      expect(evaluate(programOf('let x = {}; x.a = 1; o.a = 2; o.n++; x.a'), state)).toBe(1);

      expect(state.createdObjects).toBeUndefined();
      expect(data.o.a).toBe(2);
      expect(data.o.n).toBe(2);
    });

    it('should hold no record on a state over a plain object', () => {
      expect(EvalState.fromContext(dataOf()).createdObjects).toBeUndefined();
    });

    it('should hold a record on a state over a context that opts in', () => {
      const state = EvalState.fromContext(new PolicedContext(dataOf(), {}));

      expect(state.createdObjects).toBeInstanceOf(WeakSet);
    });
  });
});
