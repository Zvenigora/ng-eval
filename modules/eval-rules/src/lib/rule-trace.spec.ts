import { compileRule, type CompileRuleOptions, type CompiledRule } from './compile-rule';
import { evaluateRule } from './evaluate-rule';
import type { RuleTraceEntry } from './rule-trace';

// The Phase 12 plan's step 5, its first three exit criteria: the trace § 3.6
// describes, at `evaluateRule`, the entry point a caller uses (SR40). Each test
// builds its own rule and facts (SR43). A timing differs between two runs, so
// `at` is asserted only by bounds no run misses: a number, a gap of at least a wait
// between two fields, and at most the run's own time.

const compiled = (rule: unknown, options?: CompileRuleOptions): CompiledRule => {
  const result = compileRule(rule, options);
  if (!result.ok) {
    throw new Error(`the fixture does not compile: ${JSON.stringify(result.problems)}`);
  }
  return result.rule;
};

const EFFECTS = { effects: { setValue: {} } } as const;

/** The field entries of a trace, by path. */
const fields = (entries: readonly RuleTraceEntry[]): Map<string, Extract<RuleTraceEntry, { kind: 'field' }>> =>
  new Map(
    entries.flatMap((entry) => (entry.kind === 'field' ? [[entry.path, entry] as const] : []))
  );

const field = (path: string, value: unknown, namesRead: readonly string[]): RuleTraceEntry => ({
  kind: 'field',
  path,
  value,
  namesRead,
  at: expect.any(Number) as number,
});

describe('the trace, § 3.6: one entry per field evaluated, in order', () => {
  it('holds the paths, the values, a skipped calculation, the matched cases and the names read, whole', () => {
    const rule = compiled(
      {
        id: 'trace-fixture',
        filter: { when: 'order.total > 0' },
        calculations: [
          { name: 'big', when: 'order.total > 1000', value: '"yes"' },
          { name: 'total', value: 'order.total * 2' },
        ],
        decisions: [
          {
            name: 'tier',
            cases: [
              { if: 'calc.total > 1000', value: 'gold' },
              { if: 'customer.vip', value: 'vip' },
              { value: 'basic' },
            ],
          },
          { name: 'band', cases: [{ if: 'calc.total > 500', value: 'high' }, { value: 'low' }] },
        ],
        outputs: [{ on: { decision: 'tier', is: 'vip' }, items: ['setValue("tier", calc.total)'] }],
      },
      EFFECTS
    );
    const result = evaluateRule(rule, { facts: { order: { total: 60 }, customer: { vip: true } } });
    expect(result.status).toBe('completed');
    expect(result.trace).toStrictEqual({
      rule: 'trace-fixture',
      entries: [
        field('filter.when', true, ['order', 'order.total']),
        field('calculations[0].when', false, ['order', 'order.total']),
        { kind: 'skipped', path: 'calculations[0].value' },
        field('calculations[1].value', 120, ['order', 'order.total']),
        field('decisions[0].cases[0].if', false, []),
        field('decisions[0].cases[1].if', true, ['customer', 'customer.vip']),
        { kind: 'matched', path: 'decisions[0].cases[1]' },
        field('decisions[1].cases[0].if', false, []),
        { kind: 'matched', path: 'decisions[1].cases[1]' },
        field('outputs[0].items[0]', undefined, []),
      ],
    });
    expect(Object.isFrozen(result.trace)).toBe(true);
    expect(Object.isFrozen(result.trace.entries)).toBe(true);
    for (const entry of result.trace.entries) {
      expect(Object.isFrozen(entry)).toBe(true);
      if (entry.kind === 'field') {
        expect(Object.isFrozen(entry.namesRead)).toBe(true);
      }
    }
  });

  it("holds a field's value by reference: an object a field gave is that object", () => {
    const list = [1, 2];
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'list' }] });
    const result = evaluateRule(rule, { facts: { list } });
    expect(fields(result.trace.entries).get('calculations[0].value')?.value).toBe(list);
  });

  it("keeps a failed run's entries so far, the field that threw with its error and no value", () => {
    const thrown = new Error('the host threw');
    const rule = compiled(
      {
        id: 'r',
        calculations: [
          { name: 'a', value: 'base + 1' },
          { name: 'b', value: 'boom()' },
          { name: 'c', value: 'base + 2' },
        ],
      },
      { functions: ['boom'] }
    );
    const result = evaluateRule(rule, {
      facts: { base: 1 },
      functions: {
        boom: () => {
          throw thrown;
        },
      },
    });
    expect(result.status).toBe('failed');
    expect(result.trace.entries).toStrictEqual([
      field('calculations[0].value', 2, ['base']),
      { kind: 'field', path: 'calculations[1].value', error: thrown, namesRead: [], at: expect.any(Number) },
    ]);
    expect((result.trace.entries[1] as { error?: unknown }).error).toBe(thrown);
    expect('value' in result.trace.entries[1]).toBe(false);
  });

  it('gives the Promise a field gave as its value, by identity, in a run it fails', () => {
    const promise = Promise.resolve(1);
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'later()' }] }, { functions: ['later'] });
    const result = evaluateRule(rule, { facts: {}, functions: { later: () => promise } });
    expect(result.status).toBe('failed');
    expect(result.trace.entries).toHaveLength(1);
    const entry = result.trace.entries[0] as { value?: unknown; error?: unknown };
    expect(entry.value).toBe(promise);
    expect('error' in entry).toBe(false);
  });

  // Step 5's second commit's review, M-1: two sentences no row turned red.
  it("measures each at from the run's start to the field's start", () => {
    // `wait` returns only once 20 ms have passed on the clock `at` reads, so the
    // second field starts at least 20 ms after the first: an `at` read when a
    // field ends, or from a clock of each field's own, gives less.
    const wait = (): number => {
      const end = performance.now() + 20;
      let spins = 0;
      while (performance.now() < end) {
        spins += 1;
      }
      return spins;
    };
    const rule = compiled(
      { id: 'r', calculations: [{ name: 'a', value: 'wait()' }, { name: 'b', value: '1' }] },
      { functions: ['wait'] }
    );
    const result = evaluateRule(rule, { facts: {}, functions: { wait } });
    expect(result.status).toBe('completed');
    const [first, second] = result.trace.entries as Extract<RuleTraceEntry, { kind: 'field' }>[];
    expect(typeof first.at).toBe('number');
    expect(typeof second.at).toBe('number');
    expect(second.at - first.at).toBeGreaterThanOrEqual(20);
  });

  it("measures at from the run's start, not from the clock's origin", () => {
    // `before` is the time since this Jest process's clock began; an `at` read
    // on that clock alone is at least it, and one from the run's start is at
    // most the run's own time.
    const rule = compiled({ id: 'r', calculations: [{ name: 'a', value: '1' }] });
    const before = performance.now();
    const result = evaluateRule(rule, { facts: {} });
    const after = performance.now();
    expect(result.status).toBe('completed');
    const [first] = result.trace.entries as Extract<RuleTraceEntry, { kind: 'field' }>[];
    expect(first.at).toBeLessThanOrEqual(after - before);
  });

  it("gives a decision that matches no case its cases' if entries and no 'matched' entry", () => {
    const rule = compiled({
      id: 'r',
      decisions: [
        {
          name: 'tier',
          strict: false,
          cases: [
            { if: 'total > 100', value: 'gold' },
            { if: 'total > 10', value: 'silver' },
          ],
        },
      ],
    });
    const result = evaluateRule(rule, { facts: { total: 1 } });
    expect(result.status).toBe('completed');
    expect(result.labels).toEqual({});
    expect(result.trace.entries).toStrictEqual([
      field('decisions[0].cases[0].if', false, ['total']),
      field('decisions[0].cases[1].if', false, ['total']),
    ]);
  });
});

describe("a field's read hook, removed as its walk ends (step 5's second commit's review, I-2)", () => {
  it('reads a fact once per read when a function a field gave is called after the run', () => {
    // `ng-eval-12.5c.zip`'s `hook.log`: with the hook left on the field's state, each later call
    // of the arrow reaches its tracker, and `eval-core` reads a fact by bare name
    // twice under a read hook (A68), so the getter counts 2 per call. If A68 is
    // fixed, the count is 1 either way and this row stops telling them apart
    // (SR26): the barrel mock of hook.log is the witness that does not need it.
    let reads = 0;
    const facts = {};
    Object.defineProperty(facts, 'fact', {
      enumerable: true,
      get: () => {
        reads += 1;
        return 2;
      },
    });
    const rule = compiled({ id: 'r', calculations: [{ name: 'f', value: 'x => x + fact' }] });
    const result = evaluateRule(rule, { facts });
    expect(result.status).toBe('completed');
    expect(reads).toBe(0);
    const f = result.calc['f'] as (x: number) => number;
    expect(f(1)).toBe(3);
    expect(reads).toBe(1);
    expect(f(2)).toBe(4);
    expect(reads).toBe(2);
  });
});

describe('the names read, § 3.6 as finding 19 has them', () => {
  it('holds each prefix of a member path, in the order the field first read each', () => {
    // `tier` is read first and sorts last: the order is the reads', not the names'.
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'tier + customer.address.city' }] });
    const result = evaluateRule(rule, { facts: { customer: { address: { city: 'Oslo' } }, tier: 'gold' } });
    expect(fields(result.trace.entries).get('calculations[0].value')?.namesRead).toStrictEqual([
      'tier',
      'customer',
      'customer.address',
      'customer.address.city',
    ]);
  });

  it('holds a name the facts do not hold, which reads undefined', () => {
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'missing + 1' }] });
    const result = evaluateRule(rule, { facts: { other: 1 } });
    expect(result.calc['x']).toBeNaN();
    expect(fields(result.trace.entries).get('calculations[0].value')?.namesRead).toStrictEqual(['missing']);
  });

  it('holds no calc name, no function and no effect, which the run binds (finding 6)', () => {
    const rule = compiled(
      {
        id: 'r',
        calculations: [
          { name: 'a', value: '2' },
          { name: 'b', value: 'twice(calc.a) + fact' },
        ],
        decisions: [{ name: 'd', cases: [{ value: 'on' }] }],
        outputs: [{ on: { decision: 'd', is: 'on' }, items: ['setValue("b", calc.b)'] }],
      },
      { functions: ['twice'], ...EFFECTS }
    );
    const result = evaluateRule(rule, { facts: { fact: 1 }, functions: { twice: (n: number) => n * 2 } });
    expect(result.calc).toEqual({ a: 2, b: 5 });
    const byPath = fields(result.trace.entries);
    expect(byPath.get('calculations[1].value')?.namesRead).toStrictEqual(['fact']);
    expect(byPath.get('outputs[0].items[0]')?.namesRead).toStrictEqual([]);
  });

  // Step 5's second commit's review, I-1: the legs m5b's namesread.log
  // measured. Step 5's third commit cut the sentence to the contract, which
  // states none of these but `event`; they stay pinned as behaviour. Each test
  // builds its own rule.
  it('holds a computed member\'s object only, and a function the facts hold, read by its name', () => {
    const computed = evaluateRule(compiled({ id: 'r', calculations: [{ name: 'x', value: 'customer["tier"]' }] }), {
      facts: { customer: { tier: 'g' } },
    });
    expect(fields(computed.trace.entries).get('calculations[0].value')?.namesRead).toStrictEqual(['customer']);
    const called = evaluateRule(compiled({ id: 'r', calculations: [{ name: 'x', value: 'fmt(tier)' }] }), {
      facts: { fmt: (t: string) => `<${t}>`, tier: 'g' },
    });
    expect(called.calc['x']).toBe('<g>');
    expect(fields(called.trace.entries).get('calculations[0].value')?.namesRead).toStrictEqual(['tier', 'fmt']);
  });

  it('leaves out event, and a fact named as an arrow parameter the field binds', () => {
    const event = evaluateRule(compiled({ id: 'r', calculations: [{ name: 'x', value: 'event.kind' }] }), {
      facts: {},
      event: { kind: 'k' },
    });
    expect(event.calc['x']).toBe('k');
    expect(fields(event.trace.entries).get('calculations[0].value')?.namesRead).toStrictEqual([]);
    const shadowed = evaluateRule(
      compiled({ id: 'r', calculations: [{ name: 'x', value: 'list.map(tier => tier)[0] + tier' }] }),
      { facts: { list: [1], tier: 'g' } }
    );
    expect(shadowed.calc['x']).toBe('1g');
    expect(fields(shadowed.trace.entries).get('calculations[0].value')?.namesRead).toStrictEqual(['list']);
  });

  it('leaves out what a function an earlier field gave reads when a later field calls it', () => {
    const rule = compiled({
      id: 'r',
      calculations: [
        { name: 'f', value: 'x => x + fact' },
        { name: 'y', value: 'calc.f(1)' },
      ],
    });
    const result = evaluateRule(rule, { facts: { fact: 2 } });
    expect(result.calc['y']).toBe(3);
    const byPath = fields(result.trace.entries);
    expect(byPath.get('calculations[0].value')?.namesRead).toStrictEqual([]);
    expect(byPath.get('calculations[1].value')?.namesRead).toStrictEqual([]);
  });
});

describe("eval-core's own trace of a field, under the rule's debug only (finding 23)", () => {
  it('carries none with debug off', () => {
    const rule = compiled({ id: 'r', calculations: [{ name: 'x', value: 'a + 1' }] });
    const entry = evaluateRule(rule, { facts: { a: 1 } }).trace.entries[0];
    expect(entry.kind).toBe('field');
    expect('evalTrace' in entry).toBe(false);
    expect('evalTraceTruncated' in entry).toBe(false);
  });

  it('carries it with debug on, and its truncation flag on a field that pushes more than 10,000 values', () => {
    // `list.map(x => x + 1)` over 5,000 items pushes 15,006 values and
    // completes under eval-core's default iteration budget, which charges `for`
    // loops only (m5b's truncate.log). The small field after it is the
    // contrast: a state per field, so its flag is its own.
    const list = Array.from({ length: 5000 }, (_, i) => i);
    const rule = compiled({
      id: 'r',
      debug: true,
      calculations: [
        { name: 'big', value: 'list.map(x => x + 1).length' },
        { name: 'small', value: 'a + 1' },
      ],
    });
    const result = evaluateRule(rule, { facts: { list, a: 1 } });
    expect(result.status).toBe('completed');
    const byPath = fields(result.trace.entries);
    const big = byPath.get('calculations[0].value');
    expect(big?.evalTraceTruncated).toBe(true);
    expect(big?.evalTrace).toHaveLength(10000);
    const small = byPath.get('calculations[1].value');
    expect(small?.evalTraceTruncated).toBe(false);
    expect(small?.evalTrace?.map((item) => [item.type, item.value])).toStrictEqual([
      ['Identifier', 1],
      ['Literal', 1],
      ['BinaryExpression', 2],
      ['ExpressionStatement', 2],
      ['Program', 2],
    ]);
    expect(Object.isFrozen(small?.evalTrace)).toBe(true);
  });

  it('completes, under debug, a run whose later field calls a function an earlier field gave', () => {
    // The arrow's body re-enters the walk on the state of the field that made
    // it, and pushes to that state's trace: the entry holds a copy of it.
    const rule = compiled({
      id: 'r',
      debug: true,
      calculations: [
        { name: 'f', value: 'x => x + 1' },
        { name: 'y', value: 'calc.f(1)' },
      ],
    });
    const result = evaluateRule(rule, { facts: {} });
    expect(result.status).toBe('completed');
    expect(result.calc['y']).toBe(2);
  });
});
