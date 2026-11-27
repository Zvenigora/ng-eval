import type { CompiledRule } from './compile-rule';
import { evaluateRule, internalsOf } from './evaluate-rule';
import type { RuleDecisionCase } from './rule';
import { describeShape } from './rule-context';
import type { RuleEffect, RuleInput, RuleResult } from './rule-result';

/**
 * `runRuleTest`: the Phase 12 plan's step 6, its shapes and 12.6b's decisions,
 * each of which a row of `rule-test.spec.ts` holds.
 */

/**
 * A test of one rule, stored apart from it (the design's § 2.7): `ruleId`, the
 * `id` of the rule it tests; `given`, the input `evaluateRule` takes without
 * its functions, which `runRuleTest` takes as its third argument; and
 * `expect`, what the run gives. Any other own key of the test, of `given` or
 * of `expect` throws, a symbol or a non-enumerable one included, and so does a
 * field any of them inherits: a misspelt expectation would otherwise pass.
 */
export interface RuleTest {
  readonly ruleId: string;
  readonly given: {
    readonly facts: Readonly<Record<string, unknown>>;
    readonly event?: unknown;
  };
  /**
   * `calc` and `labels` are compared at the names they list, and no other;
   * `effects` as the whole list; `skipped`, whether the filter skipped the run.
   */
  readonly expect: {
    readonly calc?: Readonly<Record<string, unknown>>;
    readonly labels?: Readonly<Record<string, RuleDecisionCase['value']>>;
    readonly effects?: readonly RuleEffect[];
    readonly skipped?: boolean;
  };
}

/**
 * Where a run first differs from its test. `path` names where, such as
 * `calc.total`, `labels.tier`, `effects[1].args[0]`, `skipped` or `status`, and
 * `message` is for a person. `actual` is absent where the result holds no such
 * own enumerable name, or no such index, an array holding the indices below its
 * length; `expected` is absent where the result holds an own enumerable name or
 * an index the test does not, and at `status`. Absent is not an own key. Frozen.
 */
export interface RuleTestDifference {
  readonly path: string;
  readonly message: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

/**
 * What `runRuleTest` gives: whether the test passed, the run's result, and,
 * when it did not pass, the first difference; `difference` is absent when it
 * passed. Frozen.
 */
export interface RuleTestResult {
  readonly passed: boolean;
  readonly result: RuleResult;
  readonly difference?: RuleTestDifference;
}

const CALLER = 'runRuleTest';
const TEST_KEYS: readonly string[] = ['ruleId', 'given', 'expect'];
const GIVEN_KEYS: readonly string[] = ['facts', 'event'];
const EXPECT_KEYS: readonly string[] = ['calc', 'labels', 'effects', 'skipped'];

const isRecord = (value: unknown): value is object =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * One object of the test's shape, checked as `evaluateRule` checks its input:
 * every own key, a symbol or a non-enumerable one included, is one the shape
 * defines; a field it inherits throws; and each field is read once, as an own
 * property, an own field whose value is `undefined` being absent.
 */
const fieldsOf = (
  value: unknown,
  name: string,
  shape: string,
  keys: readonly string[],
  hint: (key: string) => string
): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new TypeError(`${CALLER} takes ${name} as an object, ${shape}: this is ${describeShape(value)}.`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) {
      throw new TypeError(`${CALLER}'s ${name} has no field ${String(key)}: ${hint(String(key))}.`);
    }
  }
  for (const key of keys) {
    if (key in value && !Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`${CALLER}'s ${name} inherits its field ${key}: give each field as an own property.`);
    }
  }
  const fields: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const field = (value as Record<string, unknown>)[key];
      if (field !== undefined) {
        fields[key] = field;
      }
    }
  }
  return fields;
};

/** An optional field of `expect`, checked by its type alone: its contents are compared, not checked. */
const checkExpectField = (fields: Record<string, unknown>, key: string, ok: boolean, what: string): void => {
  if (Object.prototype.hasOwnProperty.call(fields, key) && !ok) {
    throw new TypeError(`${CALLER}'s expect.${key} is ${what}: this is ${describeShape(fields[key])}.`);
  }
};

/** A name as a path segment: `.total` for an identifier, `["unit price"]` for any other. */
const segment = (key: string): string =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;

type Side = { readonly value: unknown } | undefined;

const difference = (path: string, expected: Side, actual: Side): RuleTestDifference => {
  const message =
    actual === undefined
      ? `The result has no ${path}, which the test expects.`
      : expected === undefined
        ? `The result has ${path}, which the test does not expect.`
        : `${path} is not the value the test expects.`;
  return Object.freeze({
    path,
    message,
    ...(expected === undefined ? {} : { expected: expected.value }),
    ...(actual === undefined ? {} : { actual: actual.value }),
  });
};

/** An own enumerable string key, which `Object.keys` lists. */
const listed = (value: object, key: string): boolean => Object.prototype.propertyIsEnumerable.call(value, key);

/**
 * The expectation's names, in its order, each against the result's: a name
 * the result does not list is a difference whose `actual` is absent. The
 * result's other names are not compared here.
 */
const compareNames = (expected: object, actual: object, path: string): RuleTestDifference | undefined => {
  for (const key of Object.keys(expected)) {
    const want = (expected as Record<string, unknown>)[key];
    if (!listed(actual, key)) {
      return difference(`${path}${segment(key)}`, { value: want }, undefined);
    }
    const found = compareValues(want, (actual as Record<string, unknown>)[key], `${path}${segment(key)}`);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

/**
 * Two values: an array with an array by its length and items, index by index
 * up to the longer one's length, an index one side lacks being absent on that
 * side; a non-null non-array object with another by its own enumerable string
 * keys and their values, the expectation's in its order, then the result's
 * others, whose `expected` is absent; and anything else by `===`. A value's
 * prototype and class are not compared, and a name it inherits is not one of
 * its keys. A value of the result is read as it is compared, so a getter runs
 * then, and what it throws passes through. It recurses once per level both
 * sides share, so a comparison nested deeper than the stack allows throws a
 * `RangeError` (A69).
 */
const compareValues = (expected: unknown, actual: unknown, path: string): RuleTestDifference | undefined => {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index++) {
      const at = `${path}[${index}]`;
      if (index >= actual.length) {
        return difference(at, { value: expected[index] }, undefined);
      }
      if (index >= expected.length) {
        return difference(at, undefined, { value: actual[index] });
      }
      const found = compareValues(expected[index], actual[index], at);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  if (isRecord(expected) && isRecord(actual)) {
    const found = compareNames(expected, actual, path);
    if (found !== undefined) {
      return found;
    }
    for (const key of Object.keys(actual)) {
      if (!listed(expected, key)) {
        return difference(`${path}${segment(key)}`, undefined, { value: (actual as Record<string, unknown>)[key] });
      }
    }
    return undefined;
  }
  return expected === actual ? undefined : difference(path, { value: expected }, { value: actual });
};

/** The first difference, in the shapes' order: the status, `skipped`, `calc`, `labels`, then `effects`. */
const compare = (expected: Record<string, unknown>, result: RuleResult): RuleTestDifference | undefined => {
  if (result.status === 'failed') {
    return Object.freeze({ path: 'status', message: 'The run failed, so the test fails.', actual: result.status });
  }
  if (Object.prototype.hasOwnProperty.call(expected, 'skipped')) {
    const skipped = result.status === 'skipped';
    if (expected['skipped'] !== skipped) {
      return difference('skipped', { value: expected['skipped'] }, { value: skipped });
    }
  }
  for (const key of ['calc', 'labels'] as const) {
    if (Object.prototype.hasOwnProperty.call(expected, key)) {
      const found = compareNames(expected[key] as object, result[key], key);
      if (found !== undefined) {
        return found;
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(expected, 'effects')) {
    return compareValues(expected['effects'], result.effects, 'effects');
  }
  return undefined;
};

/**
 * Runs a test of a rule through `evaluateRule`, and compares what the run
 * gives with what the test expects, the first difference ending it. A run that
 * failed fails the test; `skipped` is whether the filter skipped the run;
 * `calc` and `labels` are compared at the names the test lists, and `effects`
 * as the whole list: an array by its length and items, a non-null non-array
 * object by its own enumerable string keys and their values, and anything else
 * by `===`, a value's prototype and class not compared. The run's effects are
 * recorded, as `evaluateRule` records them, and not performed.
 *
 * @param rule what `compileRule` returned as `rule`
 * @param test the rule's `id`, the facts and the event, and the expectations
 * @param functions the declared functions' implementations, by name, given to
 *   `evaluateRule` as its input's
 * @returns whether the test passed, the run's result, and the first
 *   difference when it did not pass
 * @throws TypeError, in this order: for a rule `compileRule` did not return;
 *   for a test, a `given` or an `expect` that is not an object, or that has an
 *   own key its shape does not define, a symbol or a non-enumerable one
 *   included, or inherits a field it defines; for an `expect` whose `calc` or
 *   `labels` is not an object, whose `effects` is not an array, or whose
 *   `skipped` is not a boolean; and for a test whose `ruleId` is not the rule's
 *   `id`, an `undefined` field being absent. What `evaluateRule` throws, and
 *   what a value of the result throws as it is compared, passes through; a
 *   comparison nested deeper than the stack allows throws a `RangeError`.
 */
export const runRuleTest = (
  rule: CompiledRule,
  test: RuleTest,
  functions?: RuleInput['functions']
): RuleTestResult => {
  const internals = internalsOf(rule, CALLER);
  const fields = fieldsOf(test, 'test', '{ ruleId, given, expect }', TEST_KEYS, () => 'it takes ruleId, given and expect');
  const given = fieldsOf(fields['given'], 'given', '{ facts, event? }', GIVEN_KEYS, (key) =>
    key === 'functions'
      ? `pass the functions as ${CALLER}'s third argument`
      : 'it takes facts and event'
  );
  const expected = fieldsOf(fields['expect'], 'expect', '{ calc?, labels?, effects?, skipped? }', EXPECT_KEYS, () =>
    'it takes calc, labels, effects and skipped'
  );
  checkExpectField(expected, 'calc', isRecord(expected['calc']), 'an object of values by name');
  checkExpectField(expected, 'labels', isRecord(expected['labels']), 'an object of labels by name');
  checkExpectField(expected, 'effects', Array.isArray(expected['effects']), 'an array of effects');
  checkExpectField(expected, 'skipped', typeof expected['skipped'] === 'boolean', 'a boolean');
  const ruleId = fields['ruleId'];
  if (ruleId !== internals.id) {
    const named = typeof ruleId === 'string' ? JSON.stringify(ruleId) : describeShape(ruleId);
    throw new TypeError(
      `${CALLER} takes a test of the rule it is given: the test's ruleId is ${named}, and the rule's id is ${JSON.stringify(internals.id)}.`
    );
  }
  const input = {
    ...given,
    ...(functions === undefined ? {} : { functions }),
  } as unknown as RuleInput;
  const result = evaluateRule(rule, input);
  const found = compare(expected, result);
  return Object.freeze(
    found === undefined ? { passed: true, result } : { passed: false, result, difference: found }
  );
};
