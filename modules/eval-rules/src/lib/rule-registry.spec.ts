import type { CompileRuleResult } from './compile-rule';
import { evaluateRule } from './evaluate-rule';
import { RuleRegistry, type RuleRegistryOptions } from './rule-registry';

// The Phase 12 plan's step 6, its last two exit criteria and 12.6c's
// decisions: `RuleRegistry`, at the entry point a caller uses (SR40). Each test
// builds its own registry (SR43). A reuse is asserted with `toBe` against the
// result first returned (SR41), and a row that asserts a throw asserts its type
// and its message (SR18). The probes and the rows each turns red are the plan's
// step 6 record, 12.6c.

/** A rule's JSON text: one calculation, `v`, whose value is `value`. */
const ruleText = (id: string, value = '1'): string =>
  JSON.stringify({ id, calculations: [{ name: 'v', value }] });

/** The same rule as `ruleText(id)`, written with other whitespace: another text. */
const respaced = (id: string): string => JSON.stringify(JSON.parse(ruleText(id)), null, 2);

/** A rule with only an `id`, for the rows that fill a registry. */
const bareText = (id: string): string => JSON.stringify({ id });

/** A rule whose calculation does not parse: a result with problems. */
const brokenText = (id: string): string => ruleText(id, '1 +');

/** What the compiled rule's calculation `v` gives. */
const valueOf = (result: CompileRuleResult): unknown => {
  if (!result.ok) {
    throw new Error(`the fixture does not compile: ${JSON.stringify(result.problems)}`);
  }
  return evaluateRule(result.rule, { facts: {} }).calc['v'];
};

const thrown = (attempt: () => unknown): unknown => {
  try {
    attempt();
  } catch (error) {
    return error;
  }
  throw new Error('it did not throw');
};

/** An error of exactly this class and this message. */
const throwsExactly = (attempt: () => unknown, type: typeof Error, message: string): void => {
  const error = thrown(attempt);
  expect((error as object).constructor).toBe(type);
  expect((error as Error).message).toBe(message);
};

/** Compiles ids `0` to `count - 1`, in order, and returns each result by its id. */
const fill = (registry: RuleRegistry, count: number): CompileRuleResult[] =>
  Array.from({ length: count }, (_, index) => registry.compile(bareText(String(index))));

describe('RuleRegistry: a reuse', () => {
  it('returns the same result for the same id and text', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    expect(first.ok).toBe(true);
    expect(registry.compile(ruleText('a'))).toBe(first);
  });

  it('compiles a changed text under the same id, and does not return the old result', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a', '1'));
    const second = registry.compile(ruleText('a', '2'));
    expect(second).not.toBe(first);
    expect(valueOf(second)).toBe(2);
  });

  it('reuses the result stored with the same version, the text not compared', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a', '1'), 'v1');
    const second = registry.compile(ruleText('a', '2'), 'v1');
    expect(second).toBe(first);
    expect(valueOf(second)).toBe(1);
  });

  it('compiles under another version', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a', '1'), 'v1');
    const second = registry.compile(ruleText('a', '2'), 'v2');
    expect(second).not.toBe(first);
    expect(valueOf(second)).toBe(2);
  });

  it('does not reuse an entry stored with a version for a request without one, of the same text', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'), 'v1');
    expect(registry.compile(ruleText('a'))).not.toBe(first);
  });

  it('does not reuse an entry stored without a version for a request with one, of the same text', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    expect(registry.compile(ruleText('a'), 'v1')).not.toBe(first);
  });

  it('takes the empty string as a version', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'), '');
    expect(registry.compile(respaced('a'), '')).toBe(first);
  });

  it('keys by the parsed rule\'s own id as a string: a rule whose id is the number 1 leaves the entry of "1" alone', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('1'));
    const numbered = registry.compile(JSON.stringify({ id: 1 }));
    expect(numbered.ok).toBe(false);
    expect(registry.compile(ruleText('1'))).toBe(first);
  });
});

describe('RuleRegistry: maxEntries and recency', () => {
  it('holds 500 ids by default', () => {
    const registry = new RuleRegistry();
    const results = fill(registry, 500);
    results.forEach((result, index) => expect(registry.compile(bareText(String(index)))).toBe(result));
  });

  it('evicts the least recently used id at the 501st', () => {
    const registry = new RuleRegistry();
    const results = fill(registry, 500);
    registry.compile(bareText('500'));
    for (let index = 1; index < 500; index++) {
      expect(registry.compile(bareText(String(index)))).toBe(results[index]);
    }
    expect(registry.compile(bareText('0'))).not.toBe(results[0]);
  });

  it('keeps an id read before the 501st, and evicts the next least recently used', () => {
    const registry = new RuleRegistry();
    const results = fill(registry, 500);
    expect(registry.compile(bareText('0'))).toBe(results[0]);
    registry.compile(bareText('500'));
    expect(registry.compile(bareText('0'))).toBe(results[0]);
    for (let index = 2; index < 500; index++) {
      expect(registry.compile(bareText(String(index)))).toBe(results[index]);
    }
    expect(registry.compile(bareText('1'))).not.toBe(results[1]);
  });

  it('holds one rule under maxEntries: 1', () => {
    const registry = new RuleRegistry({ maxEntries: 1 });
    const a = registry.compile(ruleText('a'));
    const b = registry.compile(ruleText('b'));
    expect(registry.compile(ruleText('b'))).toBe(b);
    expect(registry.compile(ruleText('a'))).not.toBe(a);
  });
});

describe('RuleRegistry: a result with problems', () => {
  it('is not stored: a second request reports its problems again, in another result', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(brokenText('a'));
    const second = registry.compile(brokenText('a'));
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(second).not.toBe(first);
    expect(second.problems).toEqual(first.problems);
    expect(first.problems.length).toBeGreaterThan(0);
  });

  it('removes the id\'s stored result', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    expect(registry.compile(brokenText('a')).ok).toBe(false);
    const again = registry.compile(ruleText('a'));
    expect(again.ok).toBe(true);
    expect(again).not.toBe(first);
  });

  it('is not frozen', () => {
    const result = new RuleRegistry().compile(brokenText('a'));
    expect(Object.isFrozen(result)).toBe(false);
    expect(Object.isFrozen(result.problems)).toBe(false);
  });
});

describe('RuleRegistry: the stored result', () => {
  it('is frozen, and so are its problems', () => {
    const result = new RuleRegistry().compile(ruleText('a'));
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.problems)).toBe(true);
  });
});

describe('RuleRegistry: the compile options', () => {
  const statementsText = JSON.stringify({ id: 's', calculations: [{ name: 'v', value: 'let a = 2; a' }] });

  it('applies them to every compile: statements on, then off', () => {
    const on = new RuleRegistry({ compile: { statements: true } });
    expect(on.compile(statementsText).ok).toBe(true);
    expect(on.compile(statementsText.replace('"s"', '"t"')).ok).toBe(true);
    const off = new RuleRegistry().compile(statementsText);
    expect(off.ok).toBe(false);
    expect(off.problems.map((problem) => problem.code)).toEqual(['not-one-expression']);
  });

  it('copies them at construction: a later change to the caller\'s functions changes no compile', () => {
    const functions = ['f'];
    const registry = new RuleRegistry({ compile: { functions } });
    functions.push('calc');
    expect(registry.compile(ruleText('a')).ok).toBe(true);
  });

  it('contrast: a function declared as calc at construction is a problem of every compile', () => {
    const result = new RuleRegistry({ compile: { functions: ['f', 'calc'] } }).compile(ruleText('a'));
    expect(result.problems).toEqual([
      {
        code: 'invalid-declaration',
        path: 'options.functions[1]',
        message: 'A function cannot be declared as "calc": calc is a reserved name.',
      },
    ]);
  });

  it('throws what compileRule throws for them, with compileRule\'s message', () => {
    throwsExactly(
      () => new RuleRegistry({ compile: { caseInsensitive: true } as never }),
      Error,
      'compileRule: unknown option "caseInsensitive". The options are statements, colonIdentifiers, functions and ' +
        'effects. This release compares every name as written, and caseInsensitive is not supported.'
    );
    throwsExactly(
      () => new RuleRegistry({ compile: { statements: 1 } as never }),
      TypeError,
      'compileRule: the option statements is a boolean'
    );
  });

  it('throws compileRule\'s TypeError for compile options that are not an object', () => {
    throwsExactly(
      () => new RuleRegistry({ compile: 5 as never }),
      TypeError,
      'compileRule: the options are an object'
    );
  });
});

describe('RuleRegistry: the constructor\'s options', () => {
  const plain = 'RuleRegistry takes its options as a plain object, { compile?, maxEntries? }: this is';

  it('throws a TypeError for options that are not a plain object', () => {
    throwsExactly(() => new RuleRegistry(new Map() as never), TypeError, `${plain} an instance of Map.`);
    throwsExactly(() => new RuleRegistry(null as never), TypeError, `${plain} null.`);
    throwsExactly(() => new RuleRegistry([] as never), TypeError, `${plain} an array.`);
    throwsExactly(() => new RuleRegistry(5 as never), TypeError, `${plain} a number.`);
  });

  it('contrast: takes options with a null prototype, and reads their maxEntries', () => {
    const options = Object.assign(Object.create(null) as Record<string, unknown>, { maxEntries: 1 });
    const registry = new RuleRegistry(options as RuleRegistryOptions);
    const a = registry.compile(ruleText('a'));
    expect(registry.compile(ruleText('a'))).toBe(a);
    registry.compile(ruleText('b'));
    expect(registry.compile(ruleText('a'))).not.toBe(a);
  });

  it('throws a TypeError for an own key it does not define, naming it and the two', () => {
    throwsExactly(
      () => new RuleRegistry({ maxEntrys: 5 } as never),
      TypeError,
      'RuleRegistry\'s options have no field maxEntrys: they are compile and maxEntries.'
    );
  });

  it('throws a TypeError for a symbol key', () => {
    throwsExactly(
      () => new RuleRegistry({ [Symbol('extra')]: 1 } as never),
      TypeError,
      'RuleRegistry\'s options have no field Symbol(extra): they are compile and maxEntries.'
    );
  });

  it('throws a TypeError for a non-enumerable own key', () => {
    const options = Object.defineProperty({}, 'hidden', { value: 1, enumerable: false });
    throwsExactly(
      () => new RuleRegistry(options as never),
      TypeError,
      'RuleRegistry\'s options have no field hidden: they are compile and maxEntries.'
    );
  });

  it('throws a TypeError for a maxEntries that is not an integer from 1', () => {
    const message = (shown: string): string => `RuleRegistry's option maxEntries is an integer from 1: this is ${shown}.`;
    throwsExactly(() => new RuleRegistry({ maxEntries: 0 }), TypeError, message('0'));
    throwsExactly(() => new RuleRegistry({ maxEntries: -1 }), TypeError, message('-1'));
    throwsExactly(() => new RuleRegistry({ maxEntries: 1.5 }), TypeError, message('1.5'));
    throwsExactly(() => new RuleRegistry({ maxEntries: Infinity }), TypeError, message('Infinity'));
    throwsExactly(() => new RuleRegistry({ maxEntries: NaN }), TypeError, message('NaN'));
    throwsExactly(() => new RuleRegistry({ maxEntries: '5' as never }), TypeError, message('a string'));
  });

  it('takes an own field whose value is undefined as absent', () => {
    const registry = new RuleRegistry({ compile: undefined, maxEntries: undefined });
    const a = registry.compile(ruleText('a'));
    registry.compile(ruleText('b'));
    expect(registry.compile(ruleText('a'))).toBe(a);
  });

  it('reads each field once, as does compileRule each of its options', () => {
    const reads = { compile: 0, maxEntries: 0, statements: 0 };
    const compile = Object.defineProperty({}, 'statements', {
      enumerable: true,
      get: () => {
        reads.statements++;
        return true;
      },
    });
    const options = Object.defineProperties({}, {
      compile: {
        enumerable: true,
        get: () => {
          reads.compile++;
          return compile;
        },
      },
      maxEntries: {
        enumerable: true,
        get: () => {
          reads.maxEntries++;
          return 2;
        },
      },
    });
    const registry = new RuleRegistry(options as RuleRegistryOptions);
    registry.compile(ruleText('a'));
    registry.compile(ruleText('b'));
    expect(reads).toEqual({ compile: 1, maxEntries: 1, statements: 1 });
  });
});

describe('RuleRegistry.compile: its arguments', () => {
  it('throws a TypeError for a text that is not a string, and changes no entry', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    const message = (shown: string): string =>
      `RuleRegistry.compile takes a rule's JSON text as a string: this is ${shown}.`;
    throwsExactly(() => registry.compile(5 as never), TypeError, message('a number'));
    throwsExactly(() => registry.compile(undefined as never), TypeError, message('undefined'));
    expect(registry.compile(ruleText('a'))).toBe(first);
  });

  it('throws a TypeError for a version that is given and is not a string, and changes no entry', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    const message = (shown: string): string =>
      `RuleRegistry.compile takes a version as a string, or none: this is ${shown}.`;
    throwsExactly(() => registry.compile(ruleText('a'), 1 as never), TypeError, message('a number'));
    throwsExactly(() => registry.compile(ruleText('a'), null as never), TypeError, message('null'));
    expect(registry.compile(ruleText('a'))).toBe(first);
  });

  it('lets JSON.parse\'s SyntaxError through, and keeps the entry', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    const expected = thrown(() => JSON.parse('{ "id": "a"'));
    throwsExactly(() => registry.compile('{ "id": "a"'), SyntaxError, (expected as Error).message);
    expect(registry.compile(ruleText('a'))).toBe(first);
  });
});

describe('RuleRegistry.invalidate', () => {
  it('removes the id\'s entry, and returns undefined', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    expect(registry.invalidate('a')).toBeUndefined();
    const again = registry.compile(ruleText('a'));
    expect(again.ok).toBe(true);
    expect(again).not.toBe(first);
  });

  it('of an id it does not hold, returns undefined and keeps the other entries', () => {
    const registry = new RuleRegistry();
    const first = registry.compile(ruleText('a'));
    expect(registry.invalidate('b')).toBeUndefined();
    expect(registry.compile(ruleText('a'))).toBe(first);
  });

  it('throws a TypeError for an id that is not a string', () => {
    throwsExactly(
      () => new RuleRegistry().invalidate(5 as never),
      TypeError,
      'RuleRegistry.invalidate takes a rule\'s id as a string: this is a number.'
    );
  });
});
