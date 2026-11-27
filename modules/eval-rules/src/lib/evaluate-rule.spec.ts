import * as vm from 'node:vm';
import { EvalContext, Registry } from '@zvenigora/ng-eval-core';
import { compileRule, type CompileRuleOptions, type CompiledRule } from './compile-rule';
import { evaluateInit, evaluateRule } from './evaluate-rule';
import { RuleWriteError } from './rule-context';
import type { RuleInput } from './rule-result';

// The Phase 12 plan's step 4: one row per numbered line of § 3.5, at
// `evaluateRule`, the entry point a caller uses (SR40). Each test builds its
// own rule and facts (SR43).

const compiled = (rule: unknown, options?: CompileRuleOptions): CompiledRule => {
  const result = compileRule(rule, options);
  if (!result.ok) {
    throw new Error(`the fixture does not compile: ${JSON.stringify(result.problems)}`);
  }
  return result.rule;
};

const EFFECTS = { effects: { setValue: {}, setVisible: {} } } as const;

/** A rule of one calculation, `x`. */
const calcRule = (value: string, options?: CompileRuleOptions): CompiledRule =>
  compiled({ id: 'r', calculations: [{ name: 'x', value }] }, options);

const failedWith = (
  input: { rule: CompiledRule; input: RuleInput },
  message: string,
  evaluate: typeof evaluateRule = evaluateRule
): void => {
  const result = evaluate(input.rule, input.input);
  expect(result.status).toBe('failed');
  expect((result.error as Error).message).toBe(message);
  expect(result.effects).toEqual([]);
};

describe('evaluateRule, § 3.5 line 1: an inactive rule', () => {
  it("gives 'inactive', and runs nothing, the input's checks included", () => {
    let calls = 0;
    const rule = compiled(
      { id: 'r', active: false, calculations: [{ name: 'x', value: 'count()' }] },
      { functions: ['count'] }
    );
    const result = evaluateRule(rule, { facts: null as never });
    expect(result).toEqual({
      status: 'inactive',
      calc: {},
      labels: {},
      effects: [],
      trace: { rule: 'r', entries: [] },
    });
    expect(evaluateRule(rule, { facts: {}, functions: { count: () => ++calls } }).status).toBe('inactive');
    expect(calls).toBe(0);
  });

  it("gives 'inactive' from evaluateInit too, its input unchecked (step 4 second review, M-2)", () => {
    let calls = 0;
    const rule = compiled(
      { id: 'r', active: false, onInit: ['setValue("a", count())'] },
      { functions: ['count'], ...EFFECTS }
    );
    expect(evaluateInit(rule, { facts: null as never })).toEqual({
      status: 'inactive',
      calc: {},
      labels: {},
      effects: [],
      trace: { rule: 'r', entries: [] },
    });
    expect(evaluateInit(rule, { facts: {}, functions: { count: () => ++calls } }).status).toBe('inactive');
    expect(calls).toBe(0);
  });
});

describe('evaluateRule, § 3.5 line 2: the input is checked, and a failure throws', () => {
  // M13's admitted shapes (finding 26), but for one: what `structuredClone`
  // returns. No Jest environment builds it in the test's realm: jsdom has no
  // `structuredClone`, and the node environment's is the host realm's, whose
  // result the check refuses as of another realm, which it is there. In a
  // browser and in Node it is the caller's realm, and M13 measured it read.
  it.each([
    ['a literal', () => ({ a: 1 })],
    ['what JSON.parse returns', () => JSON.parse('{"a":1}') as unknown],
    ['a frozen object', () => Object.freeze({ a: 1 })],
    ['a Proxy over a plain object', () => new Proxy({ a: 1 }, {})],
    ['an object with an own getter', () => ({ get a() { return 1; } })],
  ])('reads %s as the facts', (_shape, facts) => {
    const result = evaluateRule(calcRule('a + 1'), { facts: facts() as Record<string, unknown> });
    expect(result.status).toBe('completed');
    expect(result.calc).toEqual({ x: 2 });
  });

  class Customer {
    a = 1;
  }
  // M13's refused shapes, each named by the message (finding 26).
  it.each([
    ['null', () => null, 'null'],
    ['undefined', () => undefined, 'undefined'],
    ['a number', () => 1, 'a number'],
    ['a string', () => 'a', 'a string'],
    ['an array', () => [1], 'an array'],
    ['a function', () => () => 1, 'a function'],
    ['a null-prototype object', () => Object.assign(Object.create(null), { a: 1 }), 'an object with a null prototype'],
    [
      'an object of another realm',
      () => vm.runInNewContext('({ a: 1 })'),
      "an object of another realm, whose prototype is not this realm's Object.prototype",
    ],
    ['a Map', () => new Map([['a', 1]]), 'an instance of Map'],
    ['a Date', () => new Date(0), 'an instance of Date'],
    ['a class instance', () => new Customer(), 'an instance of Customer'],
    ['a Registry', () => new Registry({ a: 1 }), 'an instance of Registry'],
    ['an object whose prototype is another object', () => Object.create({ a: 1 }), 'an object whose prototype is another object'],
    ['an EvalContext', () => new EvalContext({ a: 1 }, {}), 'an EvalContext'],
  ])('refuses %s as the facts, before any field runs, naming the shape', (_shape, facts, named) => {
    let calls = 0;
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'count()' }] }, { functions: ['count'] });
    expect(() => evaluateRule(rule, { facts: facts() as never, functions: { count: () => ++calls } })).toThrow(
      new TypeError(
        `evaluateRule takes facts that are a plain object, whose prototype is Object.prototype: these are ${named}.`
      )
    );
    expect(calls).toBe(0);
  });

  it('throws for a declared function with no implementation, before any field runs', () => {
    let calls = 0;
    const rule = compiled(
      { id: 'r', calculations: [{ name: 'x', value: 'count()' }, { name: 'y', value: 'other()' }] },
      { functions: ['count', 'other'] }
    );
    expect(() => evaluateRule(rule, { facts: {}, functions: { count: () => ++calls } })).toThrow(
      new TypeError('The function other was declared to compileRule, and has no implementation.')
    );
    expect(calls).toBe(0);
  });

  it('throws for an implementation with no declaration, before any field runs', () => {
    let calls = 0;
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'count()' }] }, { functions: ['count'] });
    expect(() =>
      evaluateRule(rule, { facts: {}, functions: { count: () => ++calls, extra: () => 0 } })
    ).toThrow(new TypeError('The function extra has an implementation, and was not declared to compileRule.'));
    expect(calls).toBe(0);
  });

  it('throws for a symbol or a non-enumerable implementation with no declaration (step 4 ninth review, M-1)', () => {
    expect(() => evaluateRule(calcRule('1'), { facts: {}, functions: { [Symbol('f')]: () => 1 } as never })).toThrow(
      new TypeError('The function Symbol(f) has an implementation, and was not declared to compileRule.')
    );
    const hidden = Object.defineProperty({}, 'g', { value: () => 1, enumerable: false });
    expect(() => evaluateRule(calcRule('1'), { facts: {}, functions: hidden })).toThrow(
      new TypeError('The function g has an implementation, and was not declared to compileRule.')
    );
  });

  it('reads each implementation once, and calls what it read (step 4 twelfth review, a note)', () => {
    let reads = 0;
    const functions = {
      get count(): unknown {
        reads += 1;
        return reads === 1 ? () => 7 : 'not a function';
      },
    };
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'count()' }] }, { functions: ['count'] });
    const result = evaluateRule(rule, { facts: {}, functions });
    expect(result.status).toBe('completed');
    expect(result.calc['x']).toBe(7);
    expect(reads).toBe(1);
  });

  it('throws for an implementation that is not a function', () => {
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'count()' }] }, { functions: ['count'] });
    expect(() => evaluateRule(rule, { facts: {}, functions: { count: 1 } as never })).toThrow(
      new TypeError('The implementation of count is a number, not a function.')
    );
  });

  it('throws for an input that is not an object, and for a key it does not define', () => {
    const rule = calcRule('1');
    expect(() => evaluateRule(rule, undefined as never)).toThrow(
      new TypeError('evaluateRule takes an input object, { facts, event?, functions? }: this is undefined.')
    );
    for (const [input, shape] of [
      [null, 'null'],
      [[{ facts: {} }], 'an array'],
      [() => ({ facts: {} }), 'a function'],
    ] as const) {
      expect(() => evaluateRule(rule, input as never)).toThrow(
        new TypeError(`evaluateRule takes an input object, { facts, event?, functions? }: this is ${shape}.`)
      );
    }
    expect(() => evaluateRule(rule, { facts: {}, context: {} } as never)).toThrow(
      new TypeError("evaluateRule's input has no field context: it takes facts, event and functions.")
    );
  });

  it('throws for an own key it does not define, a symbol or a non-enumerable one (step 4 ninth review, M-1)', () => {
    const rule = calcRule('1');
    expect(() => evaluateRule(rule, { facts: {}, [Symbol('s')]: 1 } as never)).toThrow(
      new TypeError("evaluateRule's input has no field Symbol(s): it takes facts, event and functions.")
    );
    const hidden = Object.defineProperty({ facts: {} }, 'context', { value: {}, enumerable: false });
    expect(() => evaluateRule(rule, hidden)).toThrow(
      new TypeError("evaluateRule's input has no field context: it takes facts, event and functions.")
    );
  });

  it('throws for a field the input inherits, each field being read as its own property (step 4 ninth and tenth reviews, M-1)', () => {
    expect(() => evaluateRule(calcRule('1'), Object.create({ facts: {} }) as RuleInput)).toThrow(
      new TypeError("evaluateRule's input inherits its field facts: give each field as an own property.")
    );
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'count()' }] }, { functions: ['count'] });
    const inherits = Object.assign(Object.create({ functions: { count: () => 1 } }) as object, { facts: {} });
    expect(() => evaluateRule(rule, inherits as RuleInput)).toThrow(
      new TypeError("evaluateRule's input inherits its field functions: give each field as an own property.")
    );
    const event = Object.assign(Object.create({ event: 5 }) as object, { facts: {} });
    expect(() => evaluateRule(calcRule('event'), event as RuleInput)).toThrow(
      new TypeError("evaluateRule's input inherits its field event: give each field as an own property.")
    );
    expect(() => evaluateInit(calcRule('event'), event as RuleInput)).toThrow(
      new TypeError("evaluateInit's input inherits its field event: give each field as an own property.")
    );
    // The contrast: the same fields, own, are read.
    expect(evaluateRule(calcRule('event'), { facts: {}, event: 5 }).calc['x']).toBe(5);
  });

  it.each([
    ['a number', 1],
    ['an array', [() => 1]],
    ['a function', () => 1],
  ])('throws for functions that are %s (step 4 sixth review, I-1)', (shape, functions) => {
    expect(() => evaluateRule(calcRule('1'), { facts: {}, functions: functions as never })).toThrow(
      new TypeError(`evaluateRule's functions are an object of implementations by name: these are ${shape}.`)
    );
  });

  it('reads functions that are null or absent as none (step 4 sixth review, I-1)', () => {
    expect(evaluateRule(calcRule('1'), { facts: {}, functions: null as never }).status).toBe('completed');
    expect(evaluateRule(calcRule('1'), { facts: {} }).status).toBe('completed');
  });

  it('throws for a rule compileRule did not return (step 3 review, N3)', () => {
    const refused = compileRule({ id: '' });
    expect(() => evaluateRule(refused.rule as never, { facts: {} })).toThrow(
      new TypeError('evaluateRule takes a rule compileRule returned: this is undefined.')
    );
    expect(() => evaluateRule({ id: 'r' } as never, { facts: {} })).toThrow(
      new TypeError('evaluateRule takes a rule compileRule returned: this is a plain object.')
    );
  });
});

describe('evaluateRule, § 3.5 line 3: one context, one pushed scope', () => {
  it('answers calc, event and a function from the run, not from facts of those names (finding 6)', () => {
    const rule = compiled(
      {
        id: 'r',
        calculations: [
          { name: 'x', value: '"rule"' },
          { name: 'y', value: 'calc.x' },
          { name: 'e', value: 'event' },
          { name: 't', value: 'twice(2)' },
        ],
      },
      { functions: ['twice'] }
    );
    const result = evaluateRule(rule, {
      facts: { calc: { x: 'facts' }, event: 'facts', twice: 'facts' },
      event: 'the event',
      functions: { twice: (n: number) => n * 2 },
    });
    expect(result.calc).toEqual({ x: 'rule', y: 'rule', e: 'the event', t: 4 });
  });

  it("pops its scope when the run ends: a function a field gave reads the facts' names after it (E10)", () => {
    const obj: Record<string, unknown> = {};
    const result = evaluateRule(
      compiled({
        id: 'r',
        calculations: [
          { name: 'k', value: '"run"' },
          { name: 'f', value: '() => calc.k' },
          { name: 'h', value: '() => event' },
          { name: 'g', value: '() => (obj.z = 1)' },
        ],
      }),
      { facts: { calc: { k: 'facts' }, event: 'facts', obj }, event: 'the event' }
    );
    expect(result.status).toBe('completed');
    expect((result.calc['f'] as () => unknown)()).toBe('facts');
    expect((result.calc['h'] as () => unknown)()).toBe('facts');
    expect(() => (result.calc['g'] as () => unknown)()).toThrow(
      "Cannot assign to member 'z': a rule's expression may write only into objects it created."
    );
    expect(obj).toEqual({});
  });

  it('binds a host function as given, and records an effect by its declared name', () => {
    const seen: unknown[] = [];
    const rule = compiled(
      { id: 'r', onInit: ['setValue("a", tag(1))'] },
      { functions: ['tag'], ...EFFECTS }
    );
    const tag = (n: number): string => {
      seen.push(n);
      return `t${n}`;
    };
    const result = evaluateInit(rule, { facts: {}, functions: { tag } });
    expect(seen).toEqual([1]);
    expect(result.effects).toEqual([{ name: 'setValue', args: ['a', 't1'] }]);
  });
});

describe('evaluateRule, § 3.5 line 4: a state per field, and an unwind after each', () => {
  it('replaces a calc value and does not mutate it: a later push is refused, a spread copy is not (finding 16)', () => {
    const pushed = compiled({
      id: 'r',
      calculations: [
        { name: 'list', value: '[3, 1, 2]' },
        { name: 'more', value: 'calc.list.push(4)' },
      ],
    });
    failedWith(
      { rule: pushed, input: { facts: {} } },
      'Cannot call Array.prototype.push: a rule\'s expression may write only into objects it created. ' +
        'Spread it into an array literal and change the copy instead.'
    );
    const copied = compiled({
      id: 'r',
      calculations: [
        { name: 'list', value: '[3, 1, 2]' },
        { name: 'sorted', value: '[...calc.list].sort()' },
      ],
    });
    expect(evaluateRule(copied, { facts: {} }).calc).toEqual({ list: [3, 1, 2], sorted: [1, 2, 3] });
  });

  // The budget is `eval-core`'s per outermost walk, and a field is one walk:
  // measured in step 4, one state shared by every field still gave each its own.
  it('gives each field its own iteration budget, a field being one walk (finding 9)', () => {
    const loop = 'let s = 0; for (let i = 0; i < 60000; i++) { s = s + 1 }; s';
    const rule = compiled(
      { id: 'r', calculations: [{ name: 'a', value: loop }, { name: 'b', value: loop }] },
      { statements: true }
    );
    expect(evaluateRule(rule, { facts: {} }).calc).toEqual({ a: 60000, b: 60000 });
  });

  // Measured in step 4: after one `this.push`, `eval-core`'s walk pops the top
  // scope, the host's, and an empty one of its own stays, which no read sees;
  // so the host pushes twice, and the scope left answers `a`.
  it('keeps a scope a host function strands from the next field (finding 22)', () => {
    const rule = compiled(
      { id: 'r', calculations: [{ name: 'x', value: 'strand()' }, { name: 'y', value: 'a' }] },
      { functions: ['strand'] }
    );
    const result = evaluateRule(rule, {
      facts: { a: 'fact' },
      functions: {
        strand(this: { push(scope: object): void }): number {
          this.push({ a: 'stranded' });
          this.push({});
          return 1;
        },
      },
    });
    expect(result.calc).toEqual({ x: 1, y: 'fact' });
  });

  it("fails a run whose host function pops the rule's own scope", () => {
    const rule = compiled(
      { id: 'r', calculations: [{ name: 'x', value: 'unwind()' }, { name: 'y', value: 'calc.x' }] },
      { functions: ['unwind'] }
    );
    failedWith(
      {
        rule,
        input: {
          facts: {},
          functions: {
            unwind(this: { pop(): void }): number {
              this.pop();
              return 1;
            },
          },
        },
      },
      "The field calculations[0].value popped the rule's own scope: a host function popped below the depth it was called at."
    );
  });

  it("fails a run whose host function pops the rule's scope and pushes another: the depth alone is not the test", () => {
    const rule = compiled(
      { id: 'r', calculations: [{ name: 'x', value: 'swap()' }, { name: 'y', value: 'calc.x' }] },
      { functions: ['swap'] }
    );
    failedWith(
      {
        rule,
        input: {
          facts: {},
          functions: {
            // The walk pushes a scope of its own around the call and pops the
            // top after it: two pops reach the rule's, two pushes restore the depth.
            swap(this: { pop(): void; push(scope: object): void }): number {
              this.pop();
              this.pop();
              this.push({ calc: { x: 'forged' } });
              this.push({});
              return 1;
            },
          },
        },
      },
      "The field calculations[0].value popped the rule's own scope: a host function popped below the depth it was called at."
    );
  });

  it('shares nothing between two runs of one compiled rule: a calc value of the first is absent in the second', () => {
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', when: 'flag', value: '1' }] });
    expect(evaluateRule(rule, { facts: { flag: true } }).calc).toEqual({ x: 1 });
    expect(evaluateRule(rule, { facts: { flag: false } }).calc).toEqual({});
  });
});

describe('evaluateRule, what the run keeps: where a write into the facts is refused (M2, SR19, SR44)', () => {
  // M2's forms, as step 1's pack records them (`m2-writes.txt`), with its
  // fixture's names; the forms § 3.4 refuses before a run (`this`, a member
  // of calc, `delete calc.x`) are compile-rule.spec.ts' rows.
  const facts = (): Record<string, unknown> => ({
    fact: 0,
    Object,
    JSON,
    Array,
    obj: { k: 0 },
    nested: { deep: { k: 0 } },
    list: [3, 1, 2],
    m: new Map([['a', 1]]),
    s: new Set([1]),
    d: new Date(0),
  });
  const snapshot = (value: Record<string, unknown>) => ({
    fact: value['fact'],
    obj: value['obj'],
    k: (value['obj'] as { k: number }).k,
    keys: Object.keys(value['obj'] as object),
    frozen: Object.isFrozen(value['obj']),
    deep: (value['nested'] as { deep: { k: number } }).deep.k,
    list: [...(value['list'] as number[])],
    m: [...(value['m'] as Map<string, number>)],
    s: [...(value['s'] as Set<number>)],
    d: (value['d'] as Date).getTime(),
  });
  const event = (): Record<string, unknown> => ({ name: 'e', payload: { k: 0 } });
  const member = (key: string) =>
    `Cannot assign to member '${key}': a rule's expression may write only into objects it created. ` +
    'A calculation gives a new value; it does not change an old one.';
  const method = (name: string, advice: string) =>
    `Cannot call ${name}: a rule's expression may write only into objects it created.${advice}`;
  const READ_ONLY = (name: string) => `Cannot assign to '${name}': a rule's facts are read-only.`;
  const SPREAD_ARRAY = ' Spread it into an array literal and change the copy instead.';
  const SPREAD_LITERAL = ' Spread it into a literal and change the copy instead.';
  const copy = (name: string) => ` Use ${name} instead, which returns a changed copy.`;

  it.each([
    ['fact = 2', READ_ONLY('fact')],
    ['fact += 1', READ_ONLY('fact')],
    ['fact++', READ_ONLY('fact')],
    ['newName = 2', READ_ONLY('newName')],
    ['obj.k = 2', member('k')],
    ['obj.k += 1', member('k')],
    ['obj.k++', member('k')],
    ['obj["k"] = 3', member('k')],
    ['obj.added = 1', member('added')],
    ['nested.deep.k = 2', member('k')],
    ['list[0] = 9', member('0')],
    ['list.length = 0', member('length')],
    ['list.push(2)', method('Array.prototype.push', SPREAD_ARRAY)],
    ['list.sort()', method('Array.prototype.sort', copy('toSorted'))],
    ['list.reverse()', method('Array.prototype.reverse', copy('toReversed'))],
    ['list.splice(0)', method('Array.prototype.splice', copy('toSpliced'))],
    ['list.fill(0)', method('Array.prototype.fill', SPREAD_ARRAY)],
    ['list.pop()', method('Array.prototype.pop', SPREAD_ARRAY)],
    ['list.copyWithin(0, 1)', method('Array.prototype.copyWithin', SPREAD_ARRAY)],
    ['list.unshift(0)', method('Array.prototype.unshift', SPREAD_ARRAY)],
    ['list.shift()', method('Array.prototype.shift', SPREAD_ARRAY)],
    ['m.set("b", 2)', method('Map.prototype.set', SPREAD_LITERAL)],
    ['m.delete("a")', method('Map.prototype.delete', SPREAD_LITERAL)],
    ['m.clear()', method('Map.prototype.clear', SPREAD_LITERAL)],
    ['s.add(2)', method('Set.prototype.add', SPREAD_LITERAL)],
    ['d.setTime(5)', method('Date.prototype.setTime', '')],
    ['Object.assign(obj, { k: 9 })', method('Object.assign', SPREAD_LITERAL)],
    ['Object.defineProperty(obj, "k", { value: 9 })', method('Object.defineProperty', SPREAD_LITERAL)],
    ['Object.freeze(obj)', method('Object.freeze', SPREAD_LITERAL)],
    ['Object.setPrototypeOf(obj, null)', method('Object.setPrototypeOf', SPREAD_LITERAL)],
    ['list.push.call(list, 9)', method('Array.prototype.push', SPREAD_ARRAY)],
    ['list.push.apply(list, [9])', method('Array.prototype.push', SPREAD_ARRAY)],
    ['(o => o.k = 5)(obj)', member('k')],
    // A copy the host's built-in makes is not one the walk created (M2).
    ['list.slice().sort()', method('Array.prototype.sort', copy('toSorted'))],
    ['list.concat([9]).push(1)', method('Array.prototype.push', SPREAD_ARRAY)],
    ['list.map(x => x).push(1)', method('Array.prototype.push', SPREAD_ARRAY)],
    ['JSON.parse("[1]").push(2)', method('Array.prototype.push', SPREAD_ARRAY)],
    ['list.filter(x => x > 1).reverse()', method('Array.prototype.reverse', copy('toReversed'))],
    // `eval-core`'s own refusals, which leave the facts as they were.
    ['Array.prototype.push.call(list, 9)', 'Access to dangerous property "prototype" is blocked for security reasons'],
    ['[fact] = [5]', 'Unsupported assignment target: ArrayPattern'],
    ['({ fact } = { fact: 5 })', 'Unsupported assignment target: ObjectPattern'],
    ['[obj.k] = [5]', 'Unsupported assignment target: ArrayPattern'],
    ['({ k: obj.k } = { k: 5 })', 'Unsupported assignment target: ObjectPattern'],
  ])('refuses %s, with its message, and the facts are as they were', (text, message) => {
    const given = facts();
    const before = snapshot(given);
    failedWith({ rule: calcRule(text), input: { facts: given } }, message);
    expect(snapshot(given)).toEqual(before);
    expect(snapshot(given).obj).toBe(before.obj);
  });

  it.each([
    ['event.payload.k = 2', member('k')],
    ['event.name = "x"', member('name')],
  ])('refuses %s: the event is read-only too', (text, message) => {
    const given = event();
    const before = JSON.stringify(given);
    failedWith({ rule: calcRule(text), input: { facts: {}, event: given } }, message);
    expect(JSON.stringify(given)).toBe(before);
  });

  it('runs the right-hand side once before it refuses the write (M2)', () => {
    let ran = 0;
    const rule = calcRule('fact = rhs()', { functions: ['rhs'] });
    const given = facts();
    const result = evaluateRule(rule, {
      facts: given,
      functions: {
        rhs: () => {
          ran += 1;
          return 9;
        },
      },
    });
    expect((result.error as Error).message).toBe(READ_ONLY('fact'));
    expect(ran).toBe(1);
    expect(given['fact']).toBe(0);
  });

  it.each([
    ['[1, 2].push(3)', 3],
    ['({ a: 1 }).a = 2', 2],
    ['[3, 1, 2].sort()', [1, 2, 3]],
    ['[...list].sort()', [1, 2, 3]],
    ['Object.assign({}, obj).k = 2', 2],
    ['list.toSorted()', [1, 2, 3]],
    ['list.toReversed()', [2, 1, 3]],
    ['list.with(0, 9)', [9, 1, 2]],
    ['list.toSpliced(0, 1)', [1, 2]],
    ['(n => n = 5)(fact)', 5],
    ['(o => o.k = 5)({ k: 1 })', 5],
  ])('completes %s, which writes only into what it created, and the facts are as they were', (text, value) => {
    const given = facts();
    const before = snapshot(given);
    const result = evaluateRule(calcRule(text), { facts: given });
    expect(result.status).toBe('completed');
    expect(result.calc['x']).toEqual(value);
    expect(snapshot(given)).toEqual(before);
  });

  it.each(['delete obj.k', 'delete fact'])('does not refuse %s, which deletes nothing (finding 8)', (text) => {
    const given = facts();
    const before = snapshot(given);
    expect(evaluateRule(calcRule(text), { facts: given }).status).toBe('completed');
    expect(snapshot(given)).toEqual(before);
  });

  it("writes through a host function, which is the host's code, as the CHANGELOG says (step 4 review, I-2)", () => {
    const order = { n: 0 };
    const rule = calcRule('bump(order)', { functions: ['bump'] });
    const result = evaluateRule(rule, {
      facts: { order },
      functions: {
        bump: (o: { n: number }) => {
          o.n += 1;
          return o.n;
        },
      },
    });
    expect(result.status).toBe('completed');
    expect(order.n).toBe(1);
  });

  it("writes through a fact's own method that changes this, which is the host's code too", () => {
    const counter = {
      n: 0,
      inc(): number {
        this.n += 1;
        return this.n;
      },
    };
    expect(evaluateRule(calcRule('counter.inc()'), { facts: { counter } }).status).toBe('completed');
    expect(counter.n).toBe(1);
  });

  it('writes through Reflect when the host supplies it, among the facts, as the event or from a function (finding 17; step 4 tenth review, I-2)', () => {
    const given: Record<string, unknown> = { ...facts(), Reflect };
    expect(evaluateRule(calcRule('Reflect.set(obj, "k", 9)'), { facts: given }).status).toBe('completed');
    expect((given['obj'] as { k: number }).k).toBe(9);
    const viaEvent = facts();
    expect(evaluateRule(calcRule('event.R.set(obj, "k", 8)'), { facts: viaEvent, event: { R: Reflect } }).status).toBe('completed');
    expect((viaEvent['obj'] as { k: number }).k).toBe(8);
    const viaFunction = facts();
    const reflect = compiled({ id: 'r', calculations: [{ name: 'x', value: 'reflect().set(obj, "k", 7)' }] }, { functions: ['reflect'] });
    expect(evaluateRule(reflect, { facts: viaFunction, functions: { reflect: () => Reflect } }).status).toBe('completed');
    expect((viaFunction['obj'] as { k: number }).k).toBe(7);
    expect(evaluateRule(calcRule('Reflect.set(obj, "k", 9)'), { facts: facts() }).status).toBe('failed');
  });

  it('writes through Atomics when the host supplies it, as through Reflect', () => {
    const ta = new Int32Array(2);
    expect(evaluateRule(calcRule('Atomics.store(ta, 0, 9)'), { facts: { ta, Atomics } }).status).toBe('completed');
    expect(ta[0]).toBe(9);
    expect(evaluateRule(calcRule('Atomics.store(ta, 0, 7)'), { facts: { ta } }).status).toBe('failed');
    expect(ta[0]).toBe(9);
  });

  // ES2024's resizable buffer, which the spec config's lib does not declare.
  const Resizable = ArrayBuffer as unknown as new (length: number, options: { maxByteLength: number }) => ArrayBuffer;

  // A64: eval-core asks a policy only about the built-ins in its table, so
  // these complete and change the fact, as the CHANGELOG says. A64's fix turns
  // each into a failed run. `Map#getOrInsert` is not a row: Node 24, which CI
  // runs, does not have it; the pack's gap-rules.log measures it on Node 26.
  it.each<[string, string, () => Record<string, unknown>, (facts: Record<string, unknown>) => unknown, unknown]>([
    ['a /g regex\'s test', 're.test("aa")', () => ({ re: /a/g }), (f) => (f['re'] as RegExp).lastIndex, 1],
    ['a /y regex\'s exec', 're.exec("aa")[0]', () => ({ re: /a/y }), (f) => (f['re'] as RegExp).lastIndex, 1],
    [
      'replace, which resets a /g regex',
      '"aa".replace(re, "b")',
      () => {
        const re = /a/g;
        re.lastIndex = 1;
        return { re };
      },
      (f) => (f['re'] as RegExp).lastIndex,
      0,
    ],
    ['replace, which moves a /y regex', '"aa".replace(re, "b")', () => ({ re: /a/y }), (f) => (f['re'] as RegExp).lastIndex, 1],
    [
      'match, which resets a /g regex',
      '"aa".match(re).length',
      () => {
        const re = /a/g;
        re.lastIndex = 1;
        return { re };
      },
      (f) => (f['re'] as RegExp).lastIndex,
      0,
    ],
    ['RegExp#compile', 're.compile("b").source', () => ({ re: /a/ }), (f) => (f['re'] as RegExp).source, 'b'],
    [
      "a DataView's setter",
      'dv.setUint8(0, 9)',
      () => ({ dv: new DataView(new ArrayBuffer(4)) }),
      (f) => (f['dv'] as DataView).getUint8(0),
      9,
    ],
    ['ArrayBuffer#transfer', 'buf.transfer().byteLength', () => ({ buf: new ArrayBuffer(4) }), (f) => (f['buf'] as ArrayBuffer).byteLength, 0],
    [
      'ArrayBuffer#resize',
      'buf.resize(8)',
      () => ({ buf: new Resizable(4, { maxByteLength: 8 }) }),
      (f) => (f['buf'] as ArrayBuffer).byteLength,
      8,
    ],
    [
      "an iterator's next",
      'it.next().value',
      () => ({ it: [1, 2, 3][Symbol.iterator]() }),
      (f) => (f['it'] as Iterator<number>).next().value,
      2,
    ],
  ])('does not refuse %s, a built-in eval-core does not ask about (A64)', (_name, text, make, read, after) => {
    const given = make();
    expect(evaluateRule(calcRule(text), { facts: given }).status).toBe('completed');
    expect(read(given)).toEqual(after);
  });

  // A64: a built-in of the table handed to a function the rule did not create
  // is asked about, with no target, since forEach may call it; so the run
  // fails, and the fact is as it was.
  it.each<[string, string, () => Record<string, unknown>, (facts: Record<string, unknown>) => unknown, unknown, string]>([
    [
      'push, which forEach calls',
      '[2].forEach(list.push, list)',
      () => ({ list: [1] }),
      (f) => f['list'],
      [1],
      "Cannot call Array.prototype.push: a rule's expression may write only into objects it created. " +
        'Spread it into an array literal and change the copy instead.',
    ],
    [
      'Map#set, which forEach calls',
      '[1].forEach(m.set, m)',
      () => ({ m: new Map() }),
      (f) => (f['m'] as Map<number, number>).size,
      0,
      "Cannot call Map.prototype.set: a rule's expression may write only into objects it created. " +
        'Spread it into a literal and change the copy instead.',
    ],
    [
      'Object.freeze, which forEach calls',
      '[o].forEach(Object.freeze)',
      () => ({ o: { a: 1 }, Object }),
      (f) => Object.isFrozen(f['o']),
      false,
      "Cannot call Object.freeze: a rule's expression may write only into objects it created. " +
        'Spread it into a literal and change the copy instead.',
    ],
  ])('refuses %s with a fact as its target (A64)', (_name, text, make, read, after, message) => {
    const given = make();
    const result = evaluateRule(calcRule(text), { facts: given });
    expect(result.status).toBe('failed');
    expect(result.error).toBeInstanceOf(RuleWriteError);
    expect((result.error as Error).message).toBe(message);
    expect(read(given)).toEqual(after);
  });

  // eval-core's blocklist of dangerous names, under eval-core 0.16.1, which
  // converts a computed key first: every assignment, compound assignment and
  // update of a listed name is refused where it is made, bare or into a given
  // object, a created one or a primitive, and the throw goes where any throw
  // goes: out of a field it fails the run (these rows), host code may catch it
  // (the rows after the contrast), and after the run it reaches the caller
  // (E10; the row on a field's arrow called after the run shows this for a
  // member write, not a listed name), with
  // eval-core's own `Error` or, for the six
  // names a primitive keeps readable, with `RuleWriteError`; the CHANGELOG
  // promises no class. A `delete` is not among them: on a primitive, the six
  // names read, so `delete s.toString` completes, deleting nothing (step 4
  // ninth to eleventh reviews, I-1, I-3; the thirteenth pin's `bl4.log`, 4,771
  // runs; the logical assignments are refused at compile).
  // Each row's error is one of its target's two guards', by its message
  // (SR18): the blocklist's, and for a bare name the identifier policy's
  // (`set`), for a member the member policy's; which one is not promised. The
  // table's probes: S60 (the blocklist and the identifier policy off) for a
  // bare name; S61 (the blocklist and the member policy off) for a given
  // object's key; S58 (the blocklist off) for a created object's; S57 (0.16.0's
  // unconverted key) for an array key into a created object; S59 (the member
  // policy and eval-core's refusal of a write to a primitive off) for a
  // primitive's.
  const dangerous = (name: string): string => `Access to dangerous property "${name}" is blocked for security reasons`;
  const readOnly = (name: string): string => `Cannot assign to '${name}': a rule's facts are read-only.`;
  const unwritable = (name: string): string =>
    `Cannot assign to member '${name}': a rule's expression may write only into objects it created. ` +
    'A calculation gives a new value; it does not change an old one.';
  it.each<[string, string, 'name' | 'member', Record<string, unknown>]>([
    ['constructor = 1', 'constructor', 'name', {}],
    ['constructor++', 'constructor', 'name', {}],
    ['o.__proto__ = { z: 1 }', '__proto__', 'member', { o: {} }],
    ['o[["prototype"]] = 1', 'prototype', 'member', { o: {} }],
    ['o.__proto__ -= 1', '__proto__', 'member', { o: {} }],
    ['({}).__defineGetter__ = 1', '__defineGetter__', 'member', {}],
    ['({})[["__proto__"]] = { z: 1 }', '__proto__', 'member', {}],
    ['({})[["constructor"]]++', 'constructor', 'member', {}],
    ['s.toString = 1', 'toString', 'member', { s: 'a' }],
    ['"a".valueOf = 1', 'valueOf', 'member', {}],
    ['(1)[["hasOwnProperty"]] = 1', 'hasOwnProperty', 'member', {}],
    ['s.toString += "x"', 'toString', 'member', { s: 'a' }],
  ])('fails the run for %s, a name on eval-core\'s blocklist, and writes nothing (step 4 ninth to twelfth reviews, I-1, I-3, M-3)', (text, name, guard, given) => {
    const result = evaluateRule(calcRule(text), { facts: given });
    expect(result.status).toBe('failed');
    expect([dangerous(name), guard === 'name' ? readOnly(name) : unwritable(name)]).toContain((result.error as Error).message);
    expect(result.effects).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'z')).toBe(false);
    // The given objects, each the row's own: their prototype and keys as given.
    // A prototype check sees a write only of an object, so the `__proto__`
    // rows write `{ z: 1 }`; `o.__proto__ -= 1` would write `NaN`, which
    // JavaScript ignores, and its check is the status. Probe S66 makes the
    // write before the refusal, so these lines are the ones that go red.
    for (const value of Object.values(given)) {
      if (typeof value === 'object' && value !== null) {
        expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
        expect(Object.keys(value)).toEqual([]);
      }
    }
  });

  // The contrast's probe is S62, which refuses every array key.
  it('completes a write of a name off the blocklist into an object it created, the contrast (I-1)', () => {
    expect(evaluateRule(calcRule('({})[["k"]] = 1'), { facts: {} }).status).toBe('completed');
  });

  // A refused write throws where it is made, and nothing is written there;
  // code the host supplied may catch the throw on its way out of the field
  // (step 4's twelfth and thirteenth reviews, I-1; the fourteenth pin's
  // `catch.log`). Each leg: the run completes, the caught error is one of its
  // target's guards', and the facts are as given. The uncaught contrast
  // fails. Probe S64 (a caught refusal still fails the run) reaches the five
  // legs whose guard is the rules context's. Of the two blocklist legs, S60
  // reddens the bare name's and S61 the member key's, each at its
  // `toBeInstanceOf(Error)`, and S66 the member key's at its prototype line;
  // S58, the blocklist alone off, reddens neither, since each leg's other
  // guard still refuses (`ng-eval-12.5a.zip`'s probe logs).
  const attempt = (f: () => unknown): unknown => {
    try {
      return f();
    } catch (error) {
      return error;
    }
  };
  it.each<[string, string, string | string[]]>([
    ['a member, caught by one of its functions', 'attempt(() => (obj.z = 1))', unwritable('z')],
    ['a blocklisted member key', 'attempt(() => (o.__proto__ = { z: 1 }))', [dangerous('__proto__'), unwritable('__proto__')]],
    ['a fact', 'attempt(() => (obj = 1))', readOnly('obj')],
    ['a blocklisted bare name', 'attempt(() => (constructor = 1))', [dangerous('constructor'), readOnly('constructor')]],
    ['a table writer', 'attempt(() => list.push(1))', "Cannot call Array.prototype.push: a rule's expression may write only into objects it created."],
    ['a member, caught by a fact\'s method', 'tools.attempt(() => (obj.z = 1))', unwritable('z')],
    ['a member, caught by the event\'s method', 'event.attempt(() => (obj.z = 1))', unwritable('z')],
  ])('completes when a function the host supplied catches a refused write to %s, and nothing is written (step 4 twelfth review, I-1)', (_name, text, message) => {
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: text }] }, { functions: ['attempt'] });
    const given = { obj: {}, o: {}, list: [] as unknown[], tools: { attempt } };
    const result = evaluateRule(rule, { facts: given, event: { attempt }, functions: { attempt } });
    expect(result.status).toBe('completed');
    expect(result.calc['x']).toBeInstanceOf(Error);
    // The table writer's message goes on with what to call instead; a
    // blocklisted target's is either of its two guards', which is not promised.
    const caught = (result.calc['x'] as Error).message;
    expect(Array.isArray(message) ? message.includes(caught) : caught.startsWith(message)).toBe(true);
    expect(given.obj).toEqual({});
    expect(Object.getPrototypeOf(given.o)).toBe(Object.prototype);
    expect(given.list).toEqual([]);
  });

  it('fails the run for the same write uncaught, the contrast (step 4 twelfth review, I-1)', () => {
    const given = { obj: {} };
    const result = evaluateRule(calcRule('obj.z = 1'), { facts: given });
    expect(result.status).toBe('failed');
    expect((result.error as Error).message).toBe(unwritable('z'));
    expect(given.obj).toEqual({});
  });
});

describe('evaluateRule, § 3.5 line 5: the filter', () => {
  const filtered = (filter: unknown): CompiledRule =>
    compiled({ id: 'r', filter, calculations: [{ name: 'x', value: '1' }] });

  it("gives 'skipped' for a match that misses, and runs no calculation", () => {
    const result = evaluateRule(filtered({ match: { tier: 'gold' } }), { facts: { tier: 'silver' } });
    expect(result).toEqual({
      status: 'skipped',
      calc: {},
      labels: {},
      effects: [],
      trace: { rule: 'r', entries: [] },
    });
    expect(evaluateRule(filtered({ match: { tier: 'gold' } }), { facts: { tier: 'gold' } }).calc).toEqual({ x: 1 });
  });

  it("gives 'skipped' for a when that is falsy", () => {
    expect(evaluateRule(filtered({ when: 'total > 100' }), { facts: { total: 5 } }).status).toBe('skipped');
    expect(evaluateRule(filtered({ when: 'total > 100' }), { facts: { total: 500 } }).status).toBe('completed');
  });

  it('matches a 16-level pattern over an order whose items name it, reading each item once per level', () => {
    let reads = 0;
    const order: Record<string, unknown> = { id: 'o1' };
    order['items'] = [0, 1].map(() => ({
      get order(): unknown {
        reads += 1;
        return order;
      },
    }));
    let match: unknown = { id: 'no such id' };
    for (let level = 0; level < 16; level++) {
      match = { items: [{ order: match }] };
    }
    const rule = filtered({ match: { order: match } });
    expect(evaluateRule(rule, { facts: { order } }).status).toBe('skipped');
    expect(reads).toBe(32);
  });

  it("matches against the facts, through a Proxy's traps", () => {
    const facts = new Proxy({ tier: 'gold' }, {});
    expect(evaluateRule(filtered({ match: { tier: 'gold' } }), { facts }).status).toBe('completed');
  });

  it("throws what the facts throw as the match reads them: that is the caller's, as line 2's are", () => {
    const facts = {
      get tier(): string {
        throw new Error('the host fact threw');
      },
    };
    expect(() => evaluateRule(filtered({ match: { tier: 'gold' } }), { facts })).toThrow('the host fact threw');
  });

  it("fails the run for a when that throws: line 10's rule begins at when", () => {
    const rule = compiled({ id: 'r', filter: { when: 'boom()' } }, { functions: ['boom'] });
    failedWith(
      {
        rule,
        input: {
          facts: {},
          functions: {
            boom: () => {
              throw new Error('when threw');
            },
          },
        },
      },
      'when threw'
    );
  });
});

describe('evaluateRule, § 3.5 line 6: each calculation in order', () => {
  it('runs when, then value, in order; a falsy when leaves the name unset', () => {
    const rule = compiled({
      id: 'r',
      calculations: [
        { name: 'a', value: '2' },
        { name: 'b', when: 'calc.a > 5', value: '"big"' },
        { name: 'c', value: 'calc.a * 3' },
      ],
    });
    const result = evaluateRule(rule, { facts: {} });
    expect(result.calc).toEqual({ a: 2, c: 6 });
    expect('b' in result.calc).toBe(false);
  });

  it('gives a frozen, null-prototype calc', () => {
    const result = evaluateRule(calcRule('1'), { facts: {} });
    expect(Object.isFrozen(result.calc)).toBe(true);
    expect(Object.getPrototypeOf(result.calc)).toBeNull();
  });
});

describe('evaluateRule, § 3.5 line 7: each decision in order', () => {
  const decisions = (strict: boolean | undefined, decisionStrict?: boolean): CompiledRule =>
    compiled({
      id: 'r',
      ...(strict === undefined ? {} : { strict }),
      decisions: [
        {
          name: 'tier',
          ...(decisionStrict === undefined ? {} : { strict: decisionStrict }),
          cases: [
            { if: 'total > 100', value: 'gold' },
            { if: 'total > 10', value: 'silver' },
          ],
        },
      ],
    });

  it('labels by the first truthy if', () => {
    expect(evaluateRule(decisions(undefined), { facts: { total: 500 } }).labels).toEqual({ tier: 'gold' });
    expect(evaluateRule(decisions(undefined), { facts: { total: 50 } }).labels).toEqual({ tier: 'silver' });
  });

  it('labels by a case with no if, which always matches', () => {
    const rule = compiled({
      id: 'r',
      decisions: [{ name: 'tier', cases: [{ if: 'total > 100', value: 'gold' }, { value: 'basic' }] }],
    });
    expect(evaluateRule(rule, { facts: { total: 1 } }).labels).toEqual({ tier: 'basic' });
  });

  it('leaves the label unset when no case matches, by default', () => {
    const result = evaluateRule(decisions(undefined), { facts: { total: 1 } });
    expect(result.status).toBe('completed');
    expect(result.labels).toEqual({});
  });

  it('fails the run when no case matches under strict: on the rule, and on the decision alone', () => {
    const message = 'The decision tier matched no case, and it is strict.';
    failedWith({ rule: decisions(true), input: { facts: { total: 1 } } }, message);
    failedWith({ rule: decisions(undefined, true), input: { facts: { total: 1 } } }, message);
  });

  it('lets a decision turn strict off, on a strict rule, and on, on a lenient one', () => {
    expect(evaluateRule(decisions(true, false), { facts: { total: 1 } }).status).toBe('completed');
    expect(evaluateRule(decisions(false, true), { facts: { total: 1 } }).status).toBe('failed');
  });
});

describe('evaluateRule, § 3.5 line 8: each output in order', () => {
  const outputs = (): CompiledRule => compiled(
    {
      id: 'r',
      decisions: [
        { name: 'tier', cases: [{ if: 'total > 100', value: 'gold' }, { value: 'basic' }] },
        { name: 'region', cases: [{ if: 'false', value: 'UK' }, { value: 'EU' }] },
      ],
      outputs: [
        { on: { decision: 'tier', is: 'gold' }, items: ['setValue("a", 1)', 'setVisible("b", true)'] },
        { on: { decision: 'region', is: ['EU', 'UK'] }, items: ['setValue("c", 3)'] },
        { on: { decision: 'tier', is: 'basic' }, items: ['setValue("d", 4)'] },
      ],
    },
    EFFECTS
  );

  it('runs the items of each matching output, items and outputs in array order, each one call', () => {
    expect(evaluateRule(outputs(), { facts: { total: 500 } }).effects).toEqual([
      { name: 'setValue', args: ['a', 1] },
      { name: 'setVisible', args: ['b', true] },
      { name: 'setValue', args: ['c', 3] },
    ]);
    expect(evaluateRule(outputs(), { facts: { total: 5 } }).effects).toEqual([
      { name: 'setValue', args: ['c', 3] },
      { name: 'setValue', args: ['d', 4] },
    ]);
  });

  it('runs no item for a decision with no label', () => {
    const rule = compiled(
      {
        id: 'r',
        decisions: [{ name: 'tier', cases: [{ if: 'false', value: 'gold' }] }],
        outputs: [{ on: { decision: 'tier', is: 'gold' }, items: ['setValue("a", 1)'] }],
      },
      EFFECTS
    );
    expect(evaluateRule(rule, { facts: {} }).effects).toEqual([]);
  });

  it('records an argument by reference: an object among them is the host\'s own (§ 8 q9)', () => {
    const order = { id: 7 };
    const rule = compiled({ id: 'r', onInit: ['setValue("order", order)'] }, EFFECTS);
    const [effect] = evaluateInit(rule, { facts: { order } }).effects;
    expect(effect?.args[1]).toBe(order);
  });
});

describe('evaluateRule, § 3.5 line 9: a run that completes', () => {
  it("gives 'completed', its calc, its labels and its effects, frozen", () => {
    const rule = compiled(
      {
        id: 'r',
        calculations: [{ name: 'total', value: 'price * 2' }],
        decisions: [{ name: 'tier', cases: [{ if: 'calc.total > 10', value: 'gold' }] }],
        outputs: [{ on: { decision: 'tier', is: 'gold' }, items: ['setValue("total", calc.total)'] }],
      },
      EFFECTS
    );
    const result = evaluateRule(rule, { facts: { price: 6 } });
    expect(result).toEqual({
      status: 'completed',
      calc: { total: 12 },
      labels: { tier: 'gold' },
      effects: [{ name: 'setValue', args: ['total', 12] }],
      trace: {
        rule: 'r',
        entries: [
          { kind: 'field', path: 'calculations[0].value', value: 12, at: expect.any(Number) },
          { kind: 'field', path: 'decisions[0].cases[0].if', value: true, at: expect.any(Number) },
          { kind: 'matched', path: 'decisions[0].cases[0]' },
          { kind: 'field', path: 'outputs[0].items[0]', value: undefined, at: expect.any(Number) },
        ],
      },
    });
    expect('error' in result).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.effects)).toBe(true);
    expect(Object.isFrozen(result.labels)).toBe(true);
  });
});

describe('evaluateRule, § 3.5 line 10: a throw, or a promise, fails the run', () => {
  it('keeps no effect when the last item throws, though earlier items recorded effects', () => {
    const rule = compiled(
      {
        id: 'r',
        calculations: [{ name: 'x', value: '1' }],
        decisions: [{ name: 'd', cases: [{ value: 'go' }] }],
        outputs: [{ on: { decision: 'd', is: 'go' }, items: ['setValue("a", 1)', 'setValue("b", boom())'] }],
      },
      { functions: ['boom'], ...EFFECTS }
    );
    const error = new Error('the last item threw');
    const result = evaluateRule(rule, {
      facts: {},
      functions: {
        boom: () => {
          throw error;
        },
      },
    });
    expect(result.status).toBe('failed');
    expect(result.error).toBe(error);
    expect(result.effects).toEqual([]);
    expect(result.calc).toEqual({ x: 1 });
    expect(result.labels).toEqual({ d: 'go' });
  });

  it("fails a run whose field gives a Promise, naming the field (§ 8 q14)", () => {
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'load()' }] }, { functions: ['load'] });
    failedWith(
      { rule, input: { facts: {}, functions: { load: () => Promise.resolve(1) } } },
      "The field calculations[0].value gave a Promise: this release does not await a field's value."
    );
  });

  it("gives the Promise as the error's cause, so a host can handle a rejection in the same turn", async () => {
    const rejected = Promise.reject(new Error('the load failed'));
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'load()' }] }, { functions: ['load'] });
    const result = evaluateRule(rule, { facts: {}, functions: { load: () => rejected } });
    const cause = (result.error as { cause?: unknown }).cause;
    expect(cause).toBe(rejected);
    await expect(cause).rejects.toThrow('the load failed');
  });

  it("fails a run whose field gives an async function's result, and one whose field gives a Promise subclass", () => {
    class Later<T> extends Promise<T> {}
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'load()' }] }, { functions: ['load'] });
    const message = "The field calculations[0].value gave a Promise: this release does not await a field's value.";
    failedWith({ rule, input: { facts: {}, functions: { load: async () => 1 } } }, message);
    failedWith({ rule, input: { facts: {}, functions: { load: () => Later.resolve(1) } } }, message);
  });

  it('fails a run whose filter when, or a case if, gives a Promise', () => {
    const when = compiled({ id: 'r', filter: { when: 'load()' } }, { functions: ['load'] });
    failedWith(
      { rule: when, input: { facts: {}, functions: { load: () => Promise.resolve(true) } } },
      "The field filter.when gave a Promise: this release does not await a field's value."
    );
    const decision = compiled(
      { id: 'r', decisions: [{ name: 'd', cases: [{ if: 'load()', value: 'a' }] }] },
      { functions: ['load'] }
    );
    failedWith(
      { rule: decision, input: { facts: {}, functions: { load: () => Promise.resolve(true) } } },
      "The field decisions[0].cases[0].if gave a Promise: this release does not await a field's value."
    );
  });

  it("does not fail a run for a Promise among an effect's arguments: it is the sink's to await", () => {
    const pending = Promise.resolve(1);
    const rule = compiled({ id: 'r', onInit: ['setValue("a", load())'] }, { functions: ['load'], ...EFFECTS });
    const result = evaluateInit(rule, { facts: {}, functions: { load: () => pending } });
    expect(result.status).toBe('completed');
    expect(result.effects[0]?.args[1]).toBe(pending);
  });

  it('fails a run whose host function runs out of stack: a throw in a field (step 3, N-2)', () => {
    const deep = (): number => deep() + 1;
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'deep()' }] }, { functions: ['deep'] });
    const result = evaluateRule(rule, { facts: {}, functions: { deep } });
    expect(result.status).toBe('failed');
    expect(result.error).toBeInstanceOf(RangeError);
  });

  it('completes with a thenable that is not a Promise in calc: the test is instanceof Promise (finding 27)', () => {
    const thenable = { then: (): void => undefined };
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'load()' }] }, { functions: ['load'] });
    const result = evaluateRule(rule, { facts: {}, functions: { load: () => thenable } });
    expect(result.status).toBe('completed');
    expect(result.calc['x']).toBe(thenable);
  });

  it("completes with a Promise of another realm in calc, which instanceof Promise does not call one (finding 27)", () => {
    const foreign = vm.runInNewContext('Promise.resolve(1)') as unknown;
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'load()' }] }, { functions: ['load'] });
    const result = evaluateRule(rule, { facts: {}, functions: { load: () => foreign } });
    expect(result.status).toBe('completed');
    expect(result.calc['x']).toBe(foreign);
  });
});

describe('evaluateInit', () => {
  it('runs the onInit items in order under the filter, and gives no calc and no label', () => {
    const rule = compiled(
      {
        id: 'r',
        filter: { match: { tier: 'gold' } },
        onInit: ['setVisible("banner", false)', 'setValue("a", 1)'],
        calculations: [{ name: 'x', value: '1' }],
      },
      EFFECTS
    );
    expect(evaluateInit(rule, { facts: { tier: 'gold' } })).toEqual({
      status: 'completed',
      calc: {},
      labels: {},
      effects: [
        { name: 'setVisible', args: ['banner', false] },
        { name: 'setValue', args: ['a', 1] },
      ],
      trace: {
        rule: 'r',
        entries: [
          { kind: 'field', path: 'onInit[0]', value: undefined, at: expect.any(Number) },
          { kind: 'field', path: 'onInit[1]', value: undefined, at: expect.any(Number) },
        ],
      },
    });
    expect(evaluateInit(rule, { facts: { tier: 'silver' } }).status).toBe('skipped');
  });

  it("gives 'inactive' for an inactive rule, and checks its input as evaluateRule does", () => {
    const inactive = compiled({ id: 'r', active: false, onInit: ['setValue("a", 1)'] }, EFFECTS);
    expect(evaluateInit(inactive, { facts: {} }).status).toBe('inactive');
    const active = compiled({ id: 'r', onInit: ['setValue("a", 1)'] }, EFFECTS);
    expect(() => evaluateInit(active, { facts: [] as never })).toThrow(
      new TypeError('evaluateInit takes facts that are a plain object, whose prototype is Object.prototype: these are an array.')
    );
  });

  it('keeps no effect when an item throws', () => {
    const rule = compiled(
      { id: 'r', onInit: ['setValue("a", 1)', 'setValue("b", boom())'] },
      { functions: ['boom'], ...EFFECTS }
    );
    failedWith(
      {
        rule: rule,
        input: {
          facts: {},
          functions: {
            boom: () => {
              throw new Error('init threw');
            },
          },
        },
      },
      'init threw',
      evaluateInit
    );
  });
});
