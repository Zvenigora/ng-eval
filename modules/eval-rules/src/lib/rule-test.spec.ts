import { compileRule, type CompileRuleOptions, type CompiledRule } from './compile-rule';
import { runRuleTest, type RuleTest } from './rule-test';

// The Phase 12 plan's step 6, its first two exit criteria and 12.6b's
// decisions: `runRuleTest`, at the entry point a caller uses (SR40). Each test
// builds its own rule and facts (SR43). A row that asserts a throw asserts its
// type and its message (SR18), and a difference is asserted whole, so an
// `expected` or an `actual` that should be absent is seen to be no own key.
// The probes and the rows each turns red are the plan's step 6 record, 12.6b.

const compiled = (rule: unknown, options?: CompileRuleOptions): CompiledRule => {
  const result = compileRule(rule, options);
  if (!result.ok) {
    throw new Error(`the fixture does not compile: ${JSON.stringify(result.problems)}`);
  }
  return result.rule;
};

const EFFECTS = { effects: { setValue: {} } } as const;

/** A rule with a filter, two calculations, two decisions and an output of two items. */
const orderRule = (): CompiledRule =>
  compiled(
    {
      id: 'order',
      filter: { when: 'order.open' },
      calculations: [
        { name: 'total', value: 'order.price * order.quantity' },
        { name: 'summary', value: '({ total: calc.total, items: order.items, "unit price": order.price })' },
      ],
      decisions: [
        { name: 'tier', cases: [{ if: 'calc.total > 100', value: 'gold' }, { value: 'basic' }] },
        { name: 'size', cases: [{ if: 'order.quantity > 5', value: 'bulk' }, { value: 'single' }] },
      ],
      outputs: [
        {
          on: { decision: 'tier', is: 'gold' },
          items: ['setValue("tier", "gold")', 'setValue("total", calc.total, order.items)'],
        },
      ],
    },
    EFFECTS
  );

/** Facts the order rule completes on: a total of 120, `gold` and `single`. */
const openOrder = (): Record<string, unknown> => ({
  order: { open: true, price: 30, quantity: 4, items: ['a', 'b', 'c'] },
});

const orderTest = (expected: RuleTest['expect'], facts = openOrder()): RuleTest => ({
  ruleId: 'order',
  given: { facts },
  expect: expected,
});

const thrown = (attempt: () => unknown): unknown => {
  try {
    attempt();
  } catch (error) {
    return error;
  }
  throw new Error('it did not throw');
};

/** A `TypeError` with exactly this message. */
const typeError = (attempt: () => unknown, message: string): void => {
  const error = thrown(attempt);
  expect(error).toBeInstanceOf(TypeError);
  expect((error as Error).message).toBe(message);
};

describe('runRuleTest: a test that passes', () => {
  it('passes when calc, labels, effects and skipped match, and has no difference', () => {
    const outcome = runRuleTest(
      orderRule(),
      orderTest({
        calc: { total: 120, summary: { total: 120, items: ['a', 'b', 'c'], 'unit price': 30 } },
        labels: { tier: 'gold' },
        effects: [
          { name: 'setValue', args: ['tier', 'gold'] },
          { name: 'setValue', args: ['total', 120, ['a', 'b', 'c']] },
        ],
        skipped: false,
      })
    );
    expect(outcome.passed).toBe(true);
    expect(outcome.result.status).toBe('completed');
    expect(Object.keys(outcome)).toEqual(['passed', 'result']);
  });

  it('contrast: does not compare a calc name the test does not list', () => {
    expect(runRuleTest(orderRule(), orderTest({ calc: { total: 120 } })).passed).toBe(true);
  });

  it('contrast: does not compare a label the test does not list', () => {
    expect(runRuleTest(orderRule(), orderTest({ labels: { tier: 'gold' } })).passed).toBe(true);
  });
});

describe('runRuleTest: calc, the first difference', () => {
  it('fails at the first calc name whose value differs', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ calc: { total: 121 } }));
    expect(outcome.passed).toBe(false);
    expect(outcome.difference).toEqual({
      path: 'calc.total',
      message: 'calc.total is not the value the test expects.',
      expected: 121,
      actual: 120,
    });
  });

  it('fails at a calc name the test lists and the result lacks, with no actual', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ calc: { total: 120, discount: 0 } }));
    expect(outcome.passed).toBe(false);
    expect(outcome.difference).toEqual({
      path: 'calc.discount',
      message: 'The result has no calc.discount, which the test expects.',
      expected: 0,
    });
    expect(Object.keys(outcome.difference ?? {})).toEqual(['path', 'message', 'expected']);
  });

  it('fails at a key a nested result object has and the test does not, with no expected', () => {
    const outcome = runRuleTest(
      orderRule(),
      orderTest({ calc: { summary: { items: ['a', 'b', 'c'], 'unit price': 30 } } })
    );
    expect(outcome.difference).toEqual({
      path: 'calc.summary.total',
      message: 'The result has calc.summary.total, which the test does not expect.',
      actual: 120,
    });
    expect(Object.keys(outcome.difference ?? {})).toEqual(['path', 'message', 'actual']);
  });

  it('names a key that is not an identifier by its JSON string', () => {
    const outcome = runRuleTest(
      orderRule(),
      orderTest({ calc: { summary: { total: 120, items: ['a', 'b', 'c'], 'unit price': 31 } } })
    );
    expect(outcome.difference).toEqual({
      path: 'calc.summary["unit price"]',
      message: 'calc.summary["unit price"] is not the value the test expects.',
      expected: 31,
      actual: 30,
    });
  });

  it('descends into a nested array: calc.summary.items[2]', () => {
    const outcome = runRuleTest(
      orderRule(),
      orderTest({ calc: { summary: { total: 120, items: ['a', 'b', 'x'], 'unit price': 30 } } })
    );
    expect(outcome.difference).toEqual({
      path: 'calc.summary.items[2]',
      message: 'calc.summary.items[2] is not the value the test expects.',
      expected: 'x',
      actual: 'c',
    });
  });
});

describe('runRuleTest: labels, the first difference', () => {
  it('fails at the first label that differs, in the test\'s order', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ labels: { size: 'single', tier: 'basic' } }));
    expect(outcome.difference).toEqual({
      path: 'labels.tier',
      message: 'labels.tier is not the value the test expects.',
      expected: 'basic',
      actual: 'gold',
    });
  });

  it('fails at a label the result lacks, with no actual', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ labels: { colour: 'red' } }));
    expect(outcome.difference).toEqual({
      path: 'labels.colour',
      message: 'The result has no labels.colour, which the test expects.',
      expected: 'red',
    });
  });

  it('compares calc before labels: with both wrong, the difference is calc\'s', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ calc: { total: 1 }, labels: { tier: 'basic' } }));
    expect(outcome.difference?.path).toBe('calc.total');
  });
});

describe('runRuleTest: effects, the whole list', () => {
  const both = (second: readonly unknown[]): RuleTest['expect'] => ({
    effects: [
      { name: 'setValue', args: ['tier', 'gold'] },
      { name: 'setValue', args: second },
    ],
  });

  it('fails at effects[1].args[1], deep in an effect', () => {
    const outcome = runRuleTest(orderRule(), orderTest(both(['total', 121, ['a', 'b', 'c']])));
    expect(outcome.difference).toEqual({
      path: 'effects[1].args[1]',
      message: 'effects[1].args[1] is not the value the test expects.',
      expected: 121,
      actual: 120,
    });
  });

  it('fails at an effect the test lists and the result lacks, with no actual', () => {
    const third = { name: 'setValue', args: ['done'] };
    const outcome = runRuleTest(
      orderRule(),
      orderTest({ effects: [...(both(['total', 120, ['a', 'b', 'c']]).effects ?? []), third] })
    );
    expect(outcome.difference).toEqual({
      path: 'effects[2]',
      message: 'The result has no effects[2], which the test expects.',
      expected: third,
    });
  });

  it('fails at an effect the result has and the test does not list, with no expected', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ effects: [{ name: 'setValue', args: ['tier', 'gold'] }] }));
    expect(outcome.difference).toEqual({
      path: 'effects[1]',
      message: 'The result has effects[1], which the test does not expect.',
      actual: outcome.result.effects[1],
    });
    expect(outcome.difference?.actual).toBe(outcome.result.effects[1]);
  });
});

describe('runRuleTest: skipped, whether the filter skipped the run', () => {
  const closedOrder = (): Record<string, unknown> => ({ order: { open: false, price: 30, quantity: 4 } });

  it('passes skipped: true for a run the filter skipped', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ skipped: true }, closedOrder()));
    expect(outcome.result.status).toBe('skipped');
    expect(outcome.passed).toBe(true);
  });

  it('fails skipped: false for a run the filter skipped', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ skipped: false }, closedOrder()));
    expect(outcome.difference).toEqual({
      path: 'skipped',
      message: 'skipped is not the value the test expects.',
      expected: false,
      actual: true,
    });
  });

  it('fails skipped: true for a run that completed', () => {
    const outcome = runRuleTest(orderRule(), orderTest({ skipped: true }));
    expect(outcome.difference).toEqual({
      path: 'skipped',
      message: 'skipped is not the value the test expects.',
      expected: true,
      actual: false,
    });
  });

  it('passes skipped: false for a run that completed', () => {
    expect(runRuleTest(orderRule(), orderTest({ skipped: false })).passed).toBe(true);
  });
});

describe('runRuleTest: the status', () => {
  it('fails a run that failed at status, the status its actual, with no expected', () => {
    // A write to a fact is refused, and the refusal fails the run.
    const rule = compiled({ id: 'fails', calculations: [{ name: 'x', value: 'count = 1' }] });
    const outcome = runRuleTest(rule, { ruleId: 'fails', given: { facts: { count: 0 } }, expect: {} });
    expect(outcome.result.status).toBe('failed');
    expect(outcome.difference).toEqual({ path: 'status', message: 'The run failed, so the test fails.', actual: 'failed' });
    expect(Object.keys(outcome.difference ?? {})).toEqual(['path', 'message', 'actual']);
  });

  it('contrast: an inactive rule passes an empty expectation', () => {
    const rule = compiled({ id: 'off', active: false, calculations: [{ name: 'x', value: '1' }] });
    const outcome = runRuleTest(rule, { ruleId: 'off', given: { facts: {} }, expect: {} });
    expect(outcome.result.status).toBe('inactive');
    expect(outcome.passed).toBe(true);
  });

  it('an inactive rule fails an expectation of calc.x at calc.x, with no actual', () => {
    const rule = compiled({ id: 'off', active: false, calculations: [{ name: 'x', value: '1' }] });
    const outcome = runRuleTest(rule, { ruleId: 'off', given: { facts: {} }, expect: { calc: { x: 1 } } });
    expect(outcome.difference).toEqual({
      path: 'calc.x',
      message: 'The result has no calc.x, which the test expects.',
      expected: 1,
    });
  });
});

describe('runRuleTest: functions, the third argument', () => {
  const counting = (): CompiledRule =>
    compiled({ id: 'fn', calculations: [{ name: 'n', value: 'double(2)' }] }, { functions: ['double'] });

  it('passes a rule that calls a declared function, with its implementation as the third argument', () => {
    const outcome = runRuleTest(
      counting(),
      { ruleId: 'fn', given: { facts: {} }, expect: { calc: { n: 4 } } },
      { double: (value: number) => value * 2 }
    );
    expect(outcome.passed).toBe(true);
  });

  it('without the implementation, throws what evaluateRule throws', () => {
    typeError(
      () => runRuleTest(counting(), { ruleId: 'fn', given: { facts: {} }, expect: { calc: { n: 4 } } }),
      'The function double was declared to compileRule, and has no implementation.'
    );
  });
});

describe('runRuleTest commits nothing', () => {
  const recording = (): CompiledRule =>
    compiled(
      {
        id: 'rec',
        calculations: [{ name: 'x', value: '1' }],
        decisions: [{ name: 'd', cases: [{ value: 'yes' }] }],
        outputs: [{ on: { decision: 'd', is: 'yes' }, items: ['setValue("x", calc.x)'] }],
      },
      { ...EFFECTS, functions: ['audit'] }
    );

  it('records a declared effect in result.effects', () => {
    const outcome = runRuleTest(
      recording(),
      { ruleId: 'rec', given: { facts: {} }, expect: { effects: [{ name: 'setValue', args: ['x', 1] }] } },
      { audit: () => undefined }
    );
    expect(outcome.passed).toBe(true);
    expect(outcome.result.effects).toEqual([{ name: 'setValue', args: ['x', 1] }]);
  });

  it('never calls a declared function the rule does not call', () => {
    const audit = jest.fn();
    runRuleTest(recording(), { ruleId: 'rec', given: { facts: {} }, expect: {} }, { audit });
    expect(audit).not.toHaveBeenCalled();
  });
});

describe('runRuleTest: a value of the result is read as it is compared', () => {
  it("throws the error a result value's getter throws", () => {
    const error = new Error('the getter');
    const box = {
      get bad(): number {
        throw error;
      },
    };
    const rule = compiled({ id: 'box', calculations: [{ name: 'b', value: 'box' }] });
    expect(
      thrown(() => runRuleTest(rule, { ruleId: 'box', given: { facts: { box } }, expect: { calc: { b: { bad: 1 } } } }))
    ).toBe(error);
  });
});

describe('runRuleTest: a comparison nested deeper than the stack allows (A69)', () => {
  it('throws a RangeError for a cyclic expectation against a cyclic fact under the same key', () => {
    // The comparison recurses once per level both sides share, so a fact that
    // holds itself, against an expectation that holds itself, never ends. A
    // depth bound with its own error, A69's candidate fix, turns this row red.
    const loop: Record<string, unknown> = {};
    loop['self'] = loop;
    const expected: Record<string, unknown> = {};
    expected['self'] = expected;
    const rule = compiled({ id: 'loop', calculations: [{ name: 'l', value: 'loop' }] });
    expect(() =>
      runRuleTest(rule, { ruleId: 'loop', given: { facts: { loop } }, expect: { calc: { l: expected } } })
    ).toThrow(RangeError);
  });
});

describe('runRuleTest: frozen', () => {
  it('freezes the result and the difference', () => {
    const failing = runRuleTest(orderRule(), orderTest({ calc: { total: 1 } }));
    expect(Object.isFrozen(failing)).toBe(true);
    expect(Object.isFrozen(failing.difference)).toBe(true);
    expect(Object.isFrozen(runRuleTest(orderRule(), orderTest({})))).toBe(true);
  });
});

describe('runRuleTest: check 1, the rule', () => {
  it('throws for null, naming runRuleTest', () => {
    typeError(
      () => runRuleTest(null as unknown as CompiledRule, orderTest({})),
      'runRuleTest takes a rule compileRule returned: this is null.'
    );
  });

  it('throws for an object compileRule did not return', () => {
    typeError(
      () => runRuleTest({ id: 'order' } as unknown as CompiledRule, orderTest({})),
      'runRuleTest takes a rule compileRule returned: this is a plain object.'
    );
  });
});

describe('runRuleTest: check 2, the shape of the test, its given and its expect', () => {
  it('throws for a test, a given or an expect that is not an object', () => {
    typeError(
      () => runRuleTest(orderRule(), null as unknown as RuleTest),
      'runRuleTest takes test as an object, { ruleId, given, expect }: this is null.'
    );
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 'order', given: [], expect: {} } as unknown as RuleTest),
      'runRuleTest takes given as an object, { facts, event? }: this is an array.'
    );
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 'order', given: { facts: {} }, expect: 'all' } as unknown as RuleTest),
      'runRuleTest takes expect as an object, { calc?, labels?, effects?, skipped? }: this is a string.'
    );
  });

  it('throws for an own key the test does not define', () => {
    typeError(
      () => runRuleTest(orderRule(), { ...orderTest({}), rule: 'order' } as unknown as RuleTest),
      "runRuleTest's test has no field rule: it takes ruleId, given and expect."
    );
  });

  it('throws for a symbol key of expect', () => {
    const expected = { calc: { total: 120 }, [Symbol('extra')]: true };
    typeError(
      () => runRuleTest(orderRule(), orderTest(expected)),
      "runRuleTest's expect has no field Symbol(extra): it takes calc, labels, effects and skipped."
    );
  });

  it('throws for a non-enumerable key of given', () => {
    const given = Object.defineProperty({ facts: openOrder() }, 'extra', { value: 1, enumerable: false });
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 'order', given, expect: {} }),
      "runRuleTest's given has no field extra: it takes facts and event."
    );
  });

  it('throws for functions in given, and says to pass them as the third argument', () => {
    const given = { facts: openOrder(), functions: {} };
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 'order', given, expect: {} }),
      "runRuleTest's given has no field functions: pass the functions as runRuleTest's third argument."
    );
  });

  it('throws for a field the test, its given or its expect inherits', () => {
    const test = Object.create({ ruleId: 'order' }) as Record<string, unknown>;
    test['given'] = { facts: openOrder() };
    test['expect'] = {};
    typeError(
      () => runRuleTest(orderRule(), test as unknown as RuleTest),
      "runRuleTest's test inherits its field ruleId: give each field as an own property."
    );
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 'order', given: Object.create({ facts: openOrder() }), expect: {} }),
      "runRuleTest's given inherits its field facts: give each field as an own property."
    );
    typeError(
      () => runRuleTest(orderRule(), orderTest(Object.create({ skipped: false }))),
      "runRuleTest's expect inherits its field skipped: give each field as an own property."
    );
  });

  it('reads each field once, and uses the value it read', () => {
    let reads = 0;
    const given = {
      get facts(): Record<string, unknown> {
        reads++;
        return reads === 1 ? openOrder() : { order: { open: false } };
      },
    };
    const outcome = runRuleTest(orderRule(), { ruleId: 'order', given, expect: { skipped: false } });
    expect(reads).toBe(1);
    expect(outcome.passed).toBe(true);
  });

  it('reads an own field whose value is undefined as absent', () => {
    const outcome = runRuleTest(orderRule(), {
      ruleId: 'order',
      given: { facts: openOrder(), event: undefined },
      expect: { calc: undefined, labels: undefined, effects: undefined, skipped: undefined },
    });
    expect(outcome.passed).toBe(true);
  });
});

describe('runRuleTest: check 3, the type of each field of expect', () => {
  const wrong = (expected: Record<string, unknown>): RuleTest => orderTest(expected as RuleTest['expect']);

  it('throws for a calc, labels, effects or skipped of the wrong type', () => {
    typeError(
      () => runRuleTest(orderRule(), wrong({ calc: 5 })),
      "runRuleTest's expect.calc is an object of values by name: this is a number."
    );
    typeError(
      () => runRuleTest(orderRule(), wrong({ labels: [] })),
      "runRuleTest's expect.labels is an object of labels by name: this is an array."
    );
    typeError(
      () => runRuleTest(orderRule(), wrong({ effects: {} })),
      "runRuleTest's expect.effects is an array of effects: this is a plain object."
    );
    typeError(
      () => runRuleTest(orderRule(), wrong({ skipped: 'yes' })),
      "runRuleTest's expect.skipped is a boolean: this is a string."
    );
  });
});

describe("runRuleTest: check 4, the test's ruleId", () => {
  it("throws for a ruleId that is not the rule's id, naming both", () => {
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 'other', given: { facts: openOrder() }, expect: {} }),
      'runRuleTest takes a test of the rule it is given: the test\'s ruleId is "other", and the rule\'s id is "order".'
    );
  });

  it('throws for a ruleId that is not a string', () => {
    typeError(
      () => runRuleTest(orderRule(), { ruleId: 7, given: { facts: openOrder() }, expect: {} } as unknown as RuleTest),
      'runRuleTest takes a test of the rule it is given: the test\'s ruleId is a number, and the rule\'s id is "order".'
    );
  });
});

describe('runRuleTest: the checks run in order, 1 to 4', () => {
  it('checks the rule before the test', () => {
    typeError(
      () => runRuleTest(null as unknown as CompiledRule, null as unknown as RuleTest),
      'runRuleTest takes a rule compileRule returned: this is null.'
    );
  });

  it('checks the shape before the ruleId, and given before expect', () => {
    typeError(
      () =>
        runRuleTest(orderRule(), {
          ruleId: 'other',
          given: { facts: openOrder(), extra: 1 },
          expect: { extra: 1 },
        } as unknown as RuleTest),
      "runRuleTest's given has no field extra: it takes facts and event."
    );
  });

  it("checks expect's types before the ruleId", () => {
    typeError(
      () =>
        runRuleTest(orderRule(), {
          ruleId: 'other',
          given: { facts: openOrder() },
          expect: { skipped: 'yes' },
        } as unknown as RuleTest),
      "runRuleTest's expect.skipped is a boolean: this is a string."
    );
  });
});
