import { AnyNode } from 'acorn';
import { EvalContext, EvalMemberWrite, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * `EvalContext.checkMemberWrite` for a write a **call** makes: a built-in
 * method that mutates the object it is handed - its receiver, or for
 * `Object`'s mutators its first argument. The call visitor asks before the
 * call, with `method` naming the built-in and `key` undefined, since a method
 * may write any number of properties.
 *
 * Matched by identity: `a.push` is asked about because it *is*
 * `Array.prototype.push`, not because it is spelled `push` - so a caller's own
 * method named `push` is not asked about, and `Array.prototype.push` reached
 * under another name is.
 *
 * The policy is the one `member-write-policy.spec.ts` uses: refuse whatever
 * the walk did not create, and record every question, so a row can tell
 * "refused" from "never asked".
 *
 * `Object` is supplied in the context here. Up to 0.10.x an expression could
 * also reach it without that, through an inherited `constructor` on the
 * context's own object; since 0.11.0 that identifier, and `this.constructor`,
 * are refused (`docs/backlog-retired.md` B6).
 */
describe('member-write policy: built-in mutating methods', () => {

  class RefusedWrite extends Error {
    constructor(readonly write: EvalMemberWrite) {
      super(`refused: ${String(write.method ?? write.key)}`);
    }
  }

  class PolicedContext extends EvalContext {

    readonly writes: EvalMemberWrite[] = [];

    override checkMemberWrite(write: EvalMemberWrite): void {
      this.writes.push(write);
      if (!write.createdByEvaluation) {
        throw new RefusedWrite(write);
      }
    }
  }

  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020 }) as AnyNode;

  const run = (source: string, context: EvalContext): unknown =>
    evaluate(programOf(source), EvalState.fromContext(context));

  const dataOf = () => {
    const key = {};
    return {
      a: [3, 1, 2],
      t: new Int8Array([3, 1, 2]),
      m: new Map([['k', 1]]),
      s: new Set([1]),
      wm: new WeakMap([[key, 1]]),
      ws: new WeakSet([key]),
      d: new Date(0),
      o: { n: 1 } as Record<string, unknown>,
      key,
      Object,
    };
  };

  type Data = ReturnType<typeof dataOf>;

  /** Everything a refused call could have changed, in a comparable shape. */
  const stateOf = (data: Data) => ({
    a: [...data.a],
    t: [...data.t],
    m: [...data.m],
    s: [...data.s],
    wm: data.wm.has(data.key),
    ws: data.ws.has(data.key),
    d: data.d.getTime(),
    o: { ...data.o },
    oProto: Object.getPrototypeOf(data.o),
    oExtensible: Object.isExtensible(data.o),
  });

  const DATE_SETTERS = Object.getOwnPropertyNames(Date.prototype)
    .filter((name) => name.startsWith('set'));

  const ROWS: ReadonlyArray<readonly [string, keyof Data, string]> = [
    ['a.copyWithin(0, 1)', 'a', 'Array.prototype.copyWithin'],
    ['a.fill(0)', 'a', 'Array.prototype.fill'],
    ['a.pop()', 'a', 'Array.prototype.pop'],
    ['a.push(4)', 'a', 'Array.prototype.push'],
    ['a.reverse()', 'a', 'Array.prototype.reverse'],
    ['a.shift()', 'a', 'Array.prototype.shift'],
    ['a.sort()', 'a', 'Array.prototype.sort'],
    ['a.splice(0, 1)', 'a', 'Array.prototype.splice'],
    ['a.unshift(0)', 'a', 'Array.prototype.unshift'],
    ['t.copyWithin(0, 1)', 't', '%TypedArray%.prototype.copyWithin'],
    ['t.fill(0)', 't', '%TypedArray%.prototype.fill'],
    ['t.reverse()', 't', '%TypedArray%.prototype.reverse'],
    ['t.set([9])', 't', '%TypedArray%.prototype.set'],
    ['t.sort()', 't', '%TypedArray%.prototype.sort'],
    ['m.set("j", 2)', 'm', 'Map.prototype.set'],
    ['m.delete("k")', 'm', 'Map.prototype.delete'],
    ['m.clear()', 'm', 'Map.prototype.clear'],
    ['s.add(2)', 's', 'Set.prototype.add'],
    ['s.delete(1)', 's', 'Set.prototype.delete'],
    ['s.clear()', 's', 'Set.prototype.clear'],
    ['wm.set(key, 2)', 'wm', 'WeakMap.prototype.set'],
    ['wm.delete(key)', 'wm', 'WeakMap.prototype.delete'],
    ['ws.add({})', 'ws', 'WeakSet.prototype.add'],
    ['ws.delete(key)', 'ws', 'WeakSet.prototype.delete'],
    ...DATE_SETTERS.map((name) => [`d.${name}(1)`, 'd', `Date.prototype.${name}`] as const),
    ['Object.assign(o, { n: 2 })', 'o', 'Object.assign'],
    ['Object.defineProperty(o, "n", { value: 2 })', 'o', 'Object.defineProperty'],
    ['Object.defineProperties(o, { n: { value: 2 } })', 'o', 'Object.defineProperties'],
    ['Object.setPrototypeOf(o, null)', 'o', 'Object.setPrototypeOf'],
    ['Object.freeze(o)', 'o', 'Object.freeze'],
    ['Object.seal(o)', 'o', 'Object.seal'],
    ['Object.preventExtensions(o)', 'o', 'Object.preventExtensions'],
  ];

  describe('opted in', () => {

    it('should build the Date rows from every setter the runtime has', () => {
      // The rows are built from the runtime's own `Date.prototype`, so a setter
      // the implementation's table missed is a red row rather than a row nobody
      // wrote. Fifteen are standard; V8 adds Annex B's `setYear`.
      expect(DATE_SETTERS).toContain('setFullYear');
      expect(DATE_SETTERS.length).toBeGreaterThanOrEqual(15);
    });

    it.each(ROWS)('should refuse %s on what it was given, write nothing, and name the method',
      (source, target, method) => {
        const data = dataOf();
        const before = stateOf(data);
        const context = new PolicedContext(data, {});

        expect(() => run(source, context)).toThrow(RefusedWrite);

        expect(stateOf(data)).toEqual(before);
        expect(context.writes).toEqual([
          { target: data[target], key: undefined, createdByEvaluation: false, method },
        ]);
        expect(context.writes[0].target).toBe(data[target]);
      });

    it.each([
      ['an array literal', 'let a = []; a.push(1); a', [1]],
      ['a spread copy of what it was given', 'let c = [...a]; c.sort(); c', [1, 2, 3]],
      ['a spread copy, in one expression', '[...a].push(9)', 4],
      ['an array rest', 'let [h, ...r] = a; r.reverse(); r', [2, 1]],
      ['an object literal, through Object.assign', 'Object.assign({}, o, { m: 2 })', { n: 1, m: 2 }],
      ['an object literal, frozen', 'Object.isFrozen(Object.freeze({ n: 1 }))', true],
    ])('should allow a mutating method on %s', (_label, source, expected) => {
      const data = dataOf();
      const before = stateOf(data);
      const context = new PolicedContext(data, {});

      expect(run(source, context)).toEqual(expected);

      expect(stateOf(data)).toEqual(before);
      expect(context.writes.length).toBeGreaterThan(0);
      expect(context.writes.every((write) => write.createdByEvaluation)).toBe(true);
    });

    it('should not ask about a method of the caller\'s own that is named push', () => {
      // Identity, not name: this `push` is the caller's code, and what it does
      // is the caller's business. Matching by name would refuse it.
      const list = {
        items: [] as number[],
        push(value: number) { this.items.push(value); return this.items.length; },
      };
      const context = new PolicedContext({ list }, {});

      expect(run('list.push(1)', context)).toBe(1);

      expect(list.items).toEqual([1]);
      expect(context.writes).toEqual([]);
    });

    it('should not ask about a non-mutating built-in, whatever it is called', () => {
      const data = dataOf();
      const context = new PolicedContext(data, {});

      expect(run('[a.slice(), a.concat([4]), m.get("k"), s.has(1), d.getTime(), Object.keys(o)]', context))
        .toEqual([[3, 1, 2], [3, 1, 2, 4], 1, true, 0, ['n']]);

      expect(context.writes).toEqual([]);
    });

    it('should ask about a built-in reached under another name, with the context as its receiver', () => {
      // A bare call's receiver is the context itself, so this `push` would
      // write into the `EvalContext` - not into `a`, and not into anything the
      // walk created.
      const data = dataOf();
      const context = new PolicedContext(data, {});

      expect(() => run('let p = a.push; p(4)', context)).toThrow(RefusedWrite);

      expect(data.a).toEqual([3, 1, 2]);
      expect(context.writes).toEqual([
        { target: context, key: undefined, createdByEvaluation: false, method: 'Array.prototype.push' },
      ]);
    });

    it('should refuse a mutating method on a call\'s result, though it is new', () => {
      // As for a member write: a call can hand back the caller's own object.
      const context = new PolicedContext(dataOf(), {});

      expect(() => run('a.slice().push(4)', context)).toThrow(RefusedWrite);

      expect(context.writes.map((write) => write.createdByEvaluation)).toEqual([false]);
    });

    it('should refuse one made inside an arrow body', () => {
      const data = dataOf();
      const context = new PolicedContext(data, {});

      expect(() => run('[a].map(x => x.push(4))', context)).toThrow(RefusedWrite);

      expect(data.a).toEqual([3, 1, 2]);
    });

    it('should not ask about test on a caller\'s global regex, which advances its lastIndex', () => {
      // A bound, not a gap the policy closes: refusing `test` and `exec` would
      // break `pattern.test(value)`, the commonest rule there is.
      const pattern = /a/g;
      const context = new PolicedContext({ pattern }, {});

      expect(run('pattern.test("aa")', context)).toBe(true);

      expect(pattern.lastIndex).toBe(1);
      expect(context.writes).toEqual([]);
    });

    it('should pop the scopes of the block the refusal left', () => {
      const context = new PolicedContext(dataOf(), {});

      expect(() => run('{ let y = 1; a.push(y) }', context)).toThrow(RefusedWrite);

      expect(context.scopes.length).toBe(0);
    });

    /**
     * `docs/backlog-retired.md` C5. Through `Function.prototype.call`, `apply`
     * or `bind`, the function the call visitor calls is one of those three, so
     * the built-in is asked about as a direct call of it: for `call` and
     * `apply` with the `this` they pass as its receiver, and for `bind` when it
     * binds, about the bound `this` - the bound function is new, and no table
     * could recognise it later.
     */
    describe('through Function.prototype.call, apply or bind', () => {

      const PUSH = { key: undefined, createdByEvaluation: false, method: 'Array.prototype.push' };

      it.each([
        ['call', '[].push.call(a, 4)'],
        ['apply', '[].push.apply(a, [4])'],
        ['bind', '[].push.bind(a)'],
        ['bind, then a call', '[].push.bind(a)(4)'],
      ])('should refuse a mutator on a given array through %s, and write nothing', (_label, source) => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run(source, context)).toThrow(RefusedWrite);

        expect(data.a).toEqual([3, 1, 2]);
        expect(context.writes).toEqual([{ target: data.a, ...PUSH }]);
        expect(context.writes[0].target).toBe(data.a);
      });

      it.each([
        ['call', 'let c = [...a]; [].push.call(c, 4); c'],
        ['apply', 'let c = [...a]; [].push.apply(c, [4]); c'],
        ['bind', 'let c = [...a]; [].push.bind(c)(4); c'],
      ])('should allow a mutator on a copy through %s', (_label, source) => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(run(source, context)).toEqual([3, 1, 2, 4]);

        expect(data.a).toEqual([3, 1, 2]);
        expect(context.writes).toEqual([{ target: expect.any(Array), ...PUSH, createdByEvaluation: true }]);
      });

      it.each([
        ['call through call', '[].push.call.call([].push, a, 4)'],
        ['call through apply', '[].push.call.apply([].push, [a, 4])'],
        ['bind through call', '[].push.bind.call([].push, a)'],
        ['call, bound', '[].push.call.bind([].push, a)'],
      ])('should follow %s to the mutator it reaches', (_label, source) => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run(source, context)).toThrow(RefusedWrite);

        expect(data.a).toEqual([3, 1, 2]);
        expect(context.writes).toEqual([{ target: data.a, ...PUSH }]);
      });

      it.each([
        ['call', 'Object.assign.call(null, o, { n: 2 })'],
        ['apply', 'Object.assign.apply(null, [o, { n: 2 }])'],
        ['bind', 'Object.assign.bind(null, o)'],
      ])('should ask about Object\'s first argument through %s', (_label, source) => {
        const data = dataOf();
        const context = new PolicedContext(data, {});

        expect(() => run(source, context)).toThrow(RefusedWrite);

        expect(data.o).toEqual({ n: 1 });
        expect(context.writes).toEqual([
          { target: data.o, key: undefined, createdByEvaluation: false, method: 'Object.assign' },
        ]);
      });

      it('should not ask about a non-mutating built-in or the caller\'s own method through them', () => {
        const data = dataOf();
        const list = { items: [] as number[], push(value: number) { this.items.push(value); return 1; } };
        const context = new PolicedContext({ ...data, list }, {});

        expect(run('[[].slice.call(a), [].concat.apply([], [a]), list.push.call(list, 5), [].indexOf.bind(a)(1)]', context))
          .toEqual([[3, 1, 2], [3, 1, 2], 1, 1]);

        expect(list.items).toEqual([5]);
        expect(context.writes).toEqual([]);
      });
    });
  });

  describe('not opted in', () => {

    it('should let a mutating method run on what the context holds', () => {
      const data = dataOf();
      const state = EvalState.fromContext(new EvalContext(data, {}));

      expect(evaluate(programOf('a.push(4); m.set("j", 2); Object.assign(o, { n: 2 }); a'), state))
        .toEqual([3, 1, 2, 4]);

      expect(state.createdObjects).toBeUndefined();
      expect(data.m.get('j')).toBe(2);
      expect(data.o['n']).toBe(2);
    });
  });
});
