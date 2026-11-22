import {
  RULE_PROBLEM_CODES,
  compileRule,
  compiledRuleInternals,
  type CompileRuleOptions,
  type RuleProblem,
} from './compile-rule';

/**
 * `compileRule`: the Phase 12 plan's § 3.4, step 3's exit criteria.
 *
 * Each rejection is a row of `REJECTIONS`: the rule, the one problem it gives
 * (code, path and message, [SR18](../../../../docs/standing-rules.md#sr18)),
 * and the nearest rule that compiles. A row asserts the whole problem list,
 * so a rejection that also reports a second problem, or none, is red.
 */

const problemsOf = (rule: unknown, options?: CompileRuleOptions): readonly RuleProblem[] =>
  compileRule(rule, options).problems;

const compiles = (rule: unknown, options?: CompileRuleOptions): boolean => {
  const result = compileRule(rule, options);
  return result.ok && result.problems.length === 0;
};

/** A rule whose calculation `y` holds `value`, after `x`. */
const calc = (value: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'r',
  calculations: [
    { name: 'x', value: '1' },
    { name: 'y', value },
  ],
  ...extra,
});
const Y = 'calculations[1].value';

const DECLARED: CompileRuleOptions = {
  functions: ['twice'],
  effects: { setValue: {}, setVisible: {} },
};
const COLON: CompileRuleOptions = { colonIdentifiers: true };

interface Rejection {
  readonly title: string;
  readonly rule: unknown;
  readonly options?: CompileRuleOptions;
  readonly problem: RuleProblem;
  readonly valid: unknown;
  /** The options the valid rule compiles under, when they differ. */
  readonly validOptions?: CompileRuleOptions;
}

const p = (code: string, path: string, message: string): RuleProblem => ({ code, path, message });

const CALC_ONLY = 'calc is read only as calc.<name> or calc?.<name>, and here it is';
const AWAIT = 'It holds an await, and this release runs no rule asynchronously.';
const THIS = 'It reads this, which reaches the run\'s own bindings: write the name instead.';
const ITEM = 'An effect item is one call of a declared effect, such as setValue(\'a\', 1), with ' +
  'statements on or off, and';
const LABELLED = (label: string): string =>
  `It parses as a statement labelled ${label}, which never evaluates. A colon-joined name needs ` +
  'the colonIdentifiers option, and no space around the colon.';
const PREFIX = (name: string, first: string, dot: string): string =>
  `"${name}" is one colon-joined identifier, whose first segment is the reserved name ${first}: ` +
  `a member of ${first} is written with a dot, ${dot}.`;

const REJECTIONS: readonly Rejection[] = [
  // --- Structure ---------------------------------------------------------
  {
    title: 'a rule that is not an object',
    rule: [],
    problem: p('invalid-field', '', 'A rule is an object.'),
    valid: { id: 'r' },
  },
  {
    title: 'a missing id',
    rule: {},
    problem: p('missing-field', 'id', 'A rule has an id.'),
    valid: { id: 'r' },
  },
  {
    title: 'an empty id',
    rule: { id: '' },
    problem: p('invalid-field', 'id', 'id is a non-empty string.'),
    valid: { id: 'order discount, v2' },
  },
  {
    title: 'a field the format does not list',
    rule: { id: 'r', descripton: 'x' },
    problem: p('unknown-field', 'descripton', '"descripton" is not a field of a rule.'),
    valid: { id: 'r', description: 'x' },
  },
  {
    title: 'a description that is not a string',
    rule: { id: 'r', description: 3 },
    problem: p('invalid-field', 'description', 'description is a string.'),
    valid: { id: 'r', description: '3' },
  },
  {
    title: 'a flag that is not a boolean',
    rule: { id: 'r', active: 'yes' },
    problem: p('invalid-field', 'active', 'active is a boolean.'),
    valid: { id: 'r', active: true },
  },
  {
    title: 'a section that is not an array',
    rule: { id: 'r', calculations: { name: 'x', value: '1' } },
    problem: p('invalid-field', 'calculations', 'calculations is an array.'),
    valid: { id: 'r', calculations: [{ name: 'x', value: '1' }] },
  },
  {
    title: 'a field a calculation does not have',
    rule: { id: 'r', calculations: [{ name: 'x', value: '1', vaule: '2' }] },
    problem: p('unknown-field', 'calculations[0].vaule', '"vaule" is not a field of a calculation.'),
    valid: { id: 'r', calculations: [{ name: 'x', value: '1' }] },
  },
  {
    title: 'a calculation with no value',
    rule: { id: 'r', calculations: [{ name: 'x' }] },
    problem: p('missing-field', 'calculations[0].value', 'A calculation has a value.'),
    valid: { id: 'r', calculations: [{ name: 'x', value: '1' }] },
  },
  {
    title: 'a calculation name that is not an identifier',
    rule: { id: 'r', calculations: [{ name: 'order-total', value: '1' }] },
    problem: p(
      'invalid-name',
      'calculations[0].name',
      'A calculation\'s name is an identifier, [A-Za-z_$][A-Za-z0-9_$]*, and "order-total" is not.'
    ),
    valid: { id: 'r', calculations: [{ name: 'orderTotal', value: '1' }] },
  },
  {
    title: 'a decision name with a colon',
    rule: { id: 'r', decisions: [{ name: 'Q1:1', cases: [{ value: 'a' }] }] },
    options: COLON,
    problem: p(
      'invalid-name',
      'decisions[0].name',
      'A decision\'s name is an identifier, [A-Za-z_$][A-Za-z0-9_$]*, and "Q1:1" is not.'
    ),
    valid: { id: 'r', decisions: [{ name: 'Q1', cases: [{ value: 'a' }] }] },
  },
  {
    title: 'a calculation and a decision with the same name',
    rule: {
      id: 'r',
      calculations: [{ name: 'offer', value: '1' }],
      decisions: [{ name: 'offer', cases: [{ value: 'a' }] }],
    },
    problem: p('duplicate-name', 'decisions[0].name', '"offer" names a calculation too.'),
    valid: {
      id: 'r',
      calculations: [{ name: 'amount', value: '1' }],
      decisions: [{ name: 'offer', cases: [{ value: 'a' }] }],
    },
  },
  {
    title: 'two decisions with the same name',
    rule: {
      id: 'r',
      decisions: [
        { name: 'offer', cases: [{ value: 'a' }] },
        { name: 'offer', cases: [{ value: 'b' }] },
      ],
    },
    problem: p('duplicate-name', 'decisions[1].name', '"offer" names an earlier decision too.'),
    valid: {
      id: 'r',
      decisions: [
        { name: 'offer', cases: [{ value: 'a' }] },
        { name: 'banner', cases: [{ value: 'b' }] },
      ],
    },
  },
  {
    title: 'a case after a case with no if',
    rule: { id: 'r', decisions: [{ name: 'd', cases: [{ value: 'a' }, { if: 'f', value: 'b' }] }] },
    problem: p(
      'unreachable-case',
      'decisions[0].cases[1]',
      'This case is never reached: decisions[0].cases[0] has no if, and always matches.'
    ),
    valid: { id: 'r', decisions: [{ name: 'd', cases: [{ if: 'f', value: 'b' }, { value: 'a' }] }] },
  },
  {
    title: 'a case whose value is not a label',
    rule: { id: 'r', decisions: [{ name: 'd', cases: [{ value: { label: 'a' } }] }] },
    problem: p(
      'invalid-field',
      'decisions[0].cases[0].value',
      'A case\'s value is a label: a string, a finite number or a boolean, never an expression.'
    ),
    valid: { id: 'r', decisions: [{ name: 'd', cases: [{ value: 'a' }] }] },
  },
  {
    title: 'an output naming no decision',
    rule: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ value: 'apply' }] }],
      outputs: [{ on: { decision: 'ofer', is: 'apply' }, items: [] }],
    },
    problem: p('unknown-decision', 'outputs[0].on.decision', 'No decision is named "ofer".'),
    valid: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ value: 'apply' }] }],
      outputs: [{ on: { decision: 'offer', is: 'apply' }, items: [] }],
    },
  },
  {
    title: 'an output is that no case has, as one label',
    rule: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ value: 'apply' }] }],
      outputs: [{ on: { decision: 'offer', is: 'clear' }, items: [] }],
    },
    problem: p('unknown-label', 'outputs[0].on.is', 'No case of the decision "offer" has the label "clear".'),
    valid: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ value: 'apply' }] }],
      outputs: [{ on: { decision: 'offer', is: 'apply' }, items: [] }],
    },
  },
  {
    title: 'an output is that no case has, in a list',
    rule: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ if: 'a', value: 'apply' }, { value: 1 }] }],
      outputs: [{ on: { decision: 'offer', is: ['apply', '1'] }, items: [] }],
    },
    problem: p('unknown-label', 'outputs[0].on.is[1]', 'No case of the decision "offer" has the label "1".'),
    valid: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ if: 'a', value: 'apply' }, { value: 1 }] }],
      outputs: [{ on: { decision: 'offer', is: ['apply', 1] }, items: [] }],
    },
  },
  {
    title: 'an output is that is an empty list',
    rule: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ value: 'apply' }] }],
      outputs: [{ on: { decision: 'offer', is: [] }, items: [] }],
    },
    problem: p(
      'invalid-field',
      'outputs[0].on.is',
      'on.is is a label or a non-empty array of labels: strings, finite numbers or booleans.'
    ),
    valid: {
      id: 'r',
      decisions: [{ name: 'offer', cases: [{ value: 'apply' }] }],
      outputs: [{ on: { decision: 'offer', is: ['apply'] }, items: [] }],
    },
  },
  {
    title: 'a trigger with no event',
    rule: { id: 'r', triggers: [{ match: { keys: ['order:total'] } }] },
    problem: p('missing-field', 'triggers[0].event', 'A trigger has an event.'),
    valid: { id: 'r', triggers: [{ event: 'valueChanged', match: { keys: ['order:total'] } }] },
  },
  {
    title: 'a match that is not an object',
    rule: { id: 'r', filter: { match: ['EU'] } },
    problem: p('invalid-field', 'filter.match', 'A match is an object.'),
    valid: { id: 'r', filter: { match: { region: ['EU'] } } },
  },
  {
    title: 'a pattern holding a value JSON cannot write',
    rule: { id: 'r', filter: { match: { region: ['EU', undefined] } } },
    problem: p(
      'invalid-field',
      'filter.match.region[1]',
      'A pattern holds null, strings, finite numbers, booleans, arrays and objects.'
    ),
    valid: { id: 'r', filter: { match: { region: ['EU', null] } } },
  },

  // --- Parsing ------------------------------------------------------------
  {
    title: 'an expression that does not parse',
    rule: calc('x +'),
    problem: p('parse-error', Y, 'It does not parse: Unexpected token (1:3)'),
    valid: calc('x + 1'),
  },
  {
    title: 'an empty expression',
    rule: calc('  '),
    problem: p('empty-expression', Y, 'The expression is empty.'),
    valid: calc('0'),
  },
  {
    title: 'an expression that is not a string',
    rule: calc(1 as unknown as string),
    problem: p('invalid-field', Y, 'An expression field is a string.'),
    valid: calc('1'),
  },
  {
    title: 'two statements, with statements off',
    rule: calc('a; b'),
    problem: p('not-one-expression', Y, 'It is not one expression: 2 statements. Statements are off for this field.'),
    valid: calc('b'),
  },
  {
    title: 'a block-bodied arrow function, with statements off (finding 9)',
    rule: calc('(() => { 1 })()'),
    problem: p(
      'statement-not-allowed',
      Y,
      'It holds a BlockStatement inside the expression, and statements are off for this field.'
    ),
    valid: calc('(() => { 1 })()'),
    validOptions: { statements: true },
  },
  {
    title: 'a statement eval-core does not evaluate, with statements on',
    rule: calc('while (a) {}'),
    options: { statements: true },
    problem: p(
      'unsupported-statement',
      Y,
      'It holds a WhileStatement, which eval-core does not evaluate: Unsupported statement type: WhileStatement'
    ),
    valid: calc('for (let i = 0; i < 2; i++) {}'),
  },

  // --- await, async, import (finding 10) ----------------------------------
  {
    title: 'await f()',
    rule: calc('await f()'),
    problem: p('async-expression', Y, AWAIT),
    valid: calc('f()'),
  },
  {
    title: 'a + await f()',
    rule: calc('a + await f()'),
    problem: p('async-expression', Y, AWAIT),
    valid: calc('a + f()'),
  },
  {
    title: 'an async arrow function with no await',
    rule: calc('(async () => 1)()'),
    problem: p('async-expression', Y, 'It holds an async function, and this release runs no rule asynchronously.'),
    valid: calc('(() => 1)()'),
  },
  {
    title: 'import("x")',
    rule: calc('import("x")'),
    problem: p('async-expression', Y, 'It holds an import(…), which can only fail when it runs.'),
    valid: calc('load("x")'),
  },

  // --- this (finding 15) ---------------------------------------------------
  {
    title: 'this.calc.x in a calculation',
    rule: calc('this.calc.x'),
    problem: p('this-expression', Y, THIS),
    valid: calc('calc.x'),
  },
  {
    title: 'this["calc"].x in a calculation',
    rule: calc('this["calc"].x'),
    problem: p('this-expression', Y, THIS),
    valid: calc('calc.x'),
  },
  {
    title: 'this.setVisible("a", true) in a calculation',
    rule: calc('this.setVisible("a", true)'),
    options: DECLARED,
    problem: p('this-expression', Y, THIS),
    valid: { ...calc('1'), outputs: [] , onInit: ['setVisible("a", true)'] },
  },
  {
    title: 'this.fact in a filter',
    rule: { id: 'r', filter: { when: 'this.fact' } },
    problem: p('this-expression', 'filter.when', THIS),
    valid: { id: 'r', filter: { when: 'fact' } },
  },

  // --- calc (finding 12) ----------------------------------------------------
  {
    title: 'calc as the object of a computed member',
    rule: calc('calc["x"]'),
    problem: p('reserved-name', Y, `${CALC_ONLY} the object of a computed member.`),
    valid: calc('calc.x'),
  },
  {
    title: 'calc as a value',
    rule: calc('(c => c.x)(calc)'),
    problem: p('reserved-name', Y, `${CALC_ONLY} read as a value.`),
    valid: calc('(c => c)(calc.x)'),
  },
  {
    title: 'calc as an assignment target',
    rule: calc('calc = 5'),
    problem: p('reserved-name', Y, `${CALC_ONLY} assigned.`),
    valid: calc('5'),
  },
  {
    title: 'calc bound by an arrow function',
    rule: calc('(calc => 1)(2)'),
    problem: p('reserved-name', Y, `${CALC_ONLY} bound.`),
    valid: calc('(c => 1)(2)'),
  },
  {
    title: 'calc.x as an assignment target',
    rule: calc('calc.x = 1'),
    problem: p(
      'reserved-name',
      Y,
      `${CALC_ONLY} the object of a written member: a calculation assigns calc.<name>, and no expression does.`
    ),
    valid: calc('calc.x == 1'),
  },

  // --- labels, run, error, event --------------------------------------------
  {
    title: 'labels, read',
    rule: calc('labels.r.offer'),
    problem: p(
      'reserved-name',
      Y,
      'labels is a reserved name, and nothing reads it in this release; here it is read as a value.'
    ),
    valid: calc('label.r.offer'),
  },
  {
    title: 'run, read',
    rule: calc('run.total'),
    problem: p(
      'reserved-name',
      Y,
      'run is a reserved name, and nothing reads it in this release; here it is read as a value.'
    ),
    valid: calc('runs.total'),
  },
  {
    title: 'error outside an onError item',
    rule: calc('error.message'),
    problem: p('reserved-name', Y, 'error is a reserved name, read only in an onError item.'),
    valid: { id: 'r', onError: ['setValue("e", error.message)'] },
    validOptions: DECLARED,
  },
  {
    title: 'error bound in an onError item',
    rule: { id: 'r', onError: ['setValue("e", (error => 1)(2))'] },
    options: DECLARED,
    problem: p('reserved-name', 'onError[0]', 'error is read, never bound, assigned or deleted; here it is bound.'),
    valid: { id: 'r', onError: ['setValue("e", (e => 1)(2))'] },
  },
  {
    title: 'event as an assignment target',
    rule: calc('event = 1'),
    problem: p('reserved-name', Y, 'event is read, never bound, assigned or deleted; here it is assigned.'),
    valid: calc('event == 1'),
  },
  {
    title: 'event bound',
    rule: calc('(event => 1)(2)'),
    problem: p('reserved-name', Y, 'event is read, never bound, assigned or deleted; here it is bound.'),
    valid: calc('(e => 1)(event)'),
  },
  {
    title: 'event deleted',
    rule: calc('delete event'),
    problem: p('reserved-name', Y, 'event is read, never bound, assigned or deleted; here it is deleted.'),
    valid: calc('event === undefined'),
  },

  // --- A reserved first segment, under colonIdentifiers (§ 8 q16) -----------
  {
    title: 'calc:discount as a value',
    rule: calc('calc:discount'),
    options: COLON,
    problem: p('reserved-prefix', Y, PREFIX('calc:discount', 'calc', 'calc.discount')),
    valid: { id: 'r', calculations: [{ name: 'discount', value: '1' }, { name: 'y', value: 'calc.discount' }] },
  },
  {
    title: 'event:name as a value',
    rule: calc('event:name'),
    options: COLON,
    problem: p('reserved-prefix', Y, PREFIX('event:name', 'event', 'event.name')),
    valid: calc('event.name'),
  },
  {
    title: 'calc:discount as a binding',
    rule: calc('(calc:discount => 1)(2)'),
    options: COLON,
    problem: p('reserved-prefix', Y, PREFIX('calc:discount', 'calc', 'calc.discount')),
    valid: calc('(order:discount => 1)(2)'),
  },
  {
    title: 'event:name as a binding',
    rule: calc('(event:name => 1)(2)'),
    options: COLON,
    problem: p('reserved-prefix', Y, PREFIX('event:name', 'event', 'event.name')),
    valid: calc('(order:name => 1)(2)'),
  },
  {
    title: 'calc:discount as an assignment target',
    rule: calc('calc:discount = 1'),
    options: COLON,
    problem: p('reserved-prefix', Y, PREFIX('calc:discount', 'calc', 'calc.discount')),
    valid: calc('order:discount == 1'),
  },
  {
    title: 'event:name as an assignment target',
    rule: calc('event:name = 1'),
    options: COLON,
    problem: p('reserved-prefix', Y, PREFIX('event:name', 'event', 'event.name')),
    valid: calc('order:name == 1'),
  },
  {
    title: 'calc:discount with colonIdentifiers off: not one expression',
    rule: calc('calc:discount'),
    problem: p('not-one-expression', Y, LABELLED('calc')),
    valid: calc('order:discount'),
    validOptions: COLON,
  },

  // --- Declared names (§ 8 q6, finding 7) -----------------------------------
  {
    title: 'a declared function bound, by a default',
    rule: calc('((twice = 1) => 1)()'),
    options: DECLARED,
    problem: p('declared-name', Y, 'twice is a declared function, and here it is bound.'),
    valid: calc('((t = 1) => 1)()'),
  },
  {
    title: 'a declared function as an assignment target',
    rule: calc('twice = 5'),
    options: DECLARED,
    problem: p('declared-name', Y, 'twice is a declared function, and here it is assigned.'),
    valid: calc('twice(5)'),
  },
  {
    title: 'a declared effect as an assignment target',
    rule: { id: 'r', onInit: ['setValue("a", setVisible = 1)'] },
    options: DECLARED,
    problem: p('declared-name', 'onInit[0]', 'setVisible is a declared effect, and here it is assigned.'),
    valid: { id: 'r', onInit: ['setValue("a", 1)'] },
  },
  {
    title: 'a declared function deleted',
    rule: calc('delete twice'),
    options: DECLARED,
    problem: p('declared-name', Y, 'twice is a declared function, and here it is deleted.'),
    valid: calc('twice(1)'),
  },
  {
    title: 'a declared effect deleted',
    rule: calc('delete setVisible'),
    options: DECLARED,
    problem: p('declared-name', Y, 'setVisible is a declared effect, and here it is deleted.'),
    valid: calc('twice(1)'),
  },

  // --- Effect items (§ 8 q20, finding 14) ------------------------------------
  {
    title: 'an effect called in a calculation',
    rule: calc('setValue("a", 1)'),
    options: DECLARED,
    problem: p(
      'effect-outside-item',
      Y,
      'setValue is a declared effect, called only as an effect item, setValue(…), and here it is named outside one.'
    ),
    valid: calc('twice(1)'),
  },
  {
    title: 'an effect named in a decision',
    rule: { id: 'r', decisions: [{ name: 'd', cases: [{ if: 'setVisible', value: 'a' }] }] },
    options: DECLARED,
    problem: p(
      'effect-outside-item',
      'decisions[0].cases[0].if',
      'setVisible is a declared effect, called only as an effect item, setVisible(…), and here it is named outside one.'
    ),
    valid: { id: 'r', decisions: [{ name: 'd', cases: [{ if: 'twice', value: 'a' }] }] },
  },
  {
    title: 'an effect called in a filter',
    rule: { id: 'r', filter: { when: 'setVisible("a") || 1' } },
    options: DECLARED,
    problem: p(
      'effect-outside-item',
      'filter.when',
      'setVisible is a declared effect, called only as an effect item, setVisible(…), and here it is named outside one.'
    ),
    valid: { id: 'r', filter: { when: 'twice("a") || 1' } },
  },
  {
    title: 'an effect called in an item\'s argument',
    rule: { id: 'r', onInit: ['setValue(setVisible("a"))'] },
    options: DECLARED,
    problem: p(
      'effect-outside-item',
      'onInit[0]',
      'setVisible is a declared effect, called only as an effect item, setVisible(…), and here it is named inside an item\'s call.'
    ),
    valid: { id: 'r', onInit: ['setValue(twice("a"))'] },
  },
  {
    title: 'two effects joined by &&',
    rule: { id: 'r', onInit: ['setValue("a") && setVisible("b")'] },
    options: DECLARED,
    problem: p('invalid-effect-item', 'onInit[0]', `${ITEM} this is a LogicalExpression.`),
    valid: { id: 'r', onInit: ['setValue("a")', 'setVisible("b")'] },
  },
  {
    title: 'an effect passed as a value',
    rule: { id: 'r', onInit: ['[1, 2].map(setValue)'] },
    options: DECLARED,
    problem: p('invalid-effect-item', 'onInit[0]', `${ITEM} this calls something other than a name.`),
    valid: { id: 'r', onInit: ['setValue(1)', 'setValue(2)'] },
  },
  {
    title: 'an item calling a function that is not an effect',
    rule: { id: 'r', onInit: ['twice(1)'] },
    options: DECLARED,
    problem: p('invalid-effect-item', 'onInit[0]', `${ITEM} this calls twice, which is not a declared effect.`),
    valid: { id: 'r', onInit: ['setValue(twice(1))'] },
  },
  {
    title: 'an item holding statements, with statements on (§ 8 q20)',
    rule: { id: 'r', onInit: ['let x = 1; setValue(x)'] },
    options: { ...DECLARED, statements: true },
    problem: p('invalid-effect-item', 'onInit[0]', `${ITEM} this is not one expression.`),
    valid: { id: 'r', onInit: ['setValue(1)'] },
  },

  // --- calc reads ------------------------------------------------------------
  {
    title: 'a calc. name no calculation assigns',
    rule: calc('calc.z'),
    problem: p('unknown-calculation', Y, 'calc.z is read, and no calculation assigns it.'),
    valid: calc('calc.x'),
  },
  {
    title: 'a calc. name assigned later in the same section',
    rule: { id: 'r', calculations: [{ name: 'y', value: 'calc.x' }, { name: 'x', value: '1' }] },
    problem: p('read-before-assignment', 'calculations[0].value', 'calc.x is read before any calculation assigns it.'),
    valid: { id: 'r', calculations: [{ name: 'x', value: '1' }, { name: 'y', value: 'calc.x' }] },
  },
  {
    title: 'calc?.x assigned later in the same section',
    rule: { id: 'r', calculations: [{ name: 'y', value: 'calc?.x' }, { name: 'x', value: '1' }] },
    problem: p('read-before-assignment', 'calculations[0].value', 'calc.x is read before any calculation assigns it.'),
    valid: { id: 'r', calculations: [{ name: 'x', value: '1' }, { name: 'y', value: 'calc?.x' }] },
  },
  {
    title: 'a calc. name read by its own first assignment',
    rule: { id: 'r', calculations: [{ name: 'x', value: 'calc.x + 1' }] },
    problem: p('read-before-assignment', 'calculations[0].value', 'calc.x is read before any calculation assigns it.'),
    valid: { id: 'r', calculations: [{ name: 'x', value: '0' }, { name: 'x', value: 'calc.x + 1' }] },
  },
  {
    title: 'a calc. name read in a filter',
    rule: { id: 'r', filter: { when: 'calc.x' }, calculations: [{ name: 'x', value: '1' }] },
    problem: p('read-before-assignment', 'filter.when', 'calc.x is read before any calculation assigns it.'),
    valid: {
      id: 'r',
      calculations: [{ name: 'x', value: '1' }],
      decisions: [{ name: 'd', cases: [{ if: 'calc.x', value: 'a' }] }],
    },
  },
  {
    title: 'a calc. name read in an onInit item',
    rule: { id: 'r', onInit: ['setValue(calc.x)'], calculations: [{ name: 'x', value: '1' }] },
    options: DECLARED,
    problem: p('read-before-assignment', 'onInit[0]', 'calc.x is read before any calculation assigns it.'),
    valid: { id: 'r', onInit: ['setValue(1)'], calculations: [{ name: 'x', value: '1' }] },
  },
  {
    title: 'a calc. name read in an onError item',
    rule: { id: 'r', onError: ['setValue(calc.x)'], calculations: [{ name: 'x', value: '1' }] },
    options: DECLARED,
    problem: p(
      'calculation-in-on-error',
      'onError[0]',
      'An onError item reads no calc. name in this release, and this one reads calc.x.'
    ),
    valid: { id: 'r', onError: ['setValue(error.message)'], calculations: [{ name: 'x', value: '1' }] },
  },

  // --- Names eval-core refuses (finding 11) ------------------------------------
  {
    title: 'a calculation named toString',
    rule: { id: 'r', calculations: [{ name: 'toString', value: '1' }] },
    problem: p(
      'refused-name',
      'calculations[0].name',
      'eval-core refuses the read calc.toString: Access to dangerous property "toString" is blocked for security reasons'
    ),
    valid: { id: 'r', calculations: [{ name: 'discount', value: '1' }] },
  },
  {
    title: 'a function declared as fetch',
    rule: { id: 'r' },
    options: { functions: ['fetch'] },
    problem: p(
      'refused-name',
      'options.functions[0]',
      'eval-core refuses a call of "fetch": Function call blocked for security reasons: fetch'
    ),
    valid: { id: 'r' },
    validOptions: { functions: ['load'] },
  },
  {
    title: 'an effect declared as eval',
    rule: { id: 'r' },
    options: { effects: { eval: {} } },
    problem: p(
      'refused-name',
      'options.effects.eval',
      'eval-core refuses a call of "eval": Function call blocked for security reasons: eval'
    ),
    valid: { id: 'r' },
    validOptions: { effects: { setValue: {} } },
  },

  // --- Declarations (§ 8 q6, M10) ----------------------------------------------
  {
    title: 'a function declared as calc',
    rule: { id: 'r' },
    options: { functions: ['calc'] },
    problem: p('invalid-declaration', 'options.functions[0]', 'A function cannot be declared as "calc": calc is a reserved name.'),
    valid: { id: 'r' },
    validOptions: { functions: ['calculate'] },
  },
  {
    title: 'a name declared as a function and as an effect',
    rule: { id: 'r' },
    options: { functions: ['notify'], effects: { notify: {} } },
    problem: p(
      'invalid-declaration',
      'options.effects.notify',
      '"notify" is declared at options.functions[0] too: a name is one function or one effect.'
    ),
    valid: { id: 'r' },
    validOptions: { functions: ['format'], effects: { notify: {} } },
  },
  {
    title: 'a name the parser does not read as one identifier',
    rule: { id: 'r' },
    options: { functions: ['math.max'] },
    problem: p(
      'invalid-declaration',
      'options.functions[0]',
      'A function\'s name is one identifier, as the parser reads it, and "math.max" is not.'
    ),
    valid: { id: 'r' },
    validOptions: { functions: ['max'] },
  },
  {
    title: 'a function whose first segment is reserved, under colonIdentifiers',
    rule: { id: 'r' },
    options: { functions: ['event:fire'], colonIdentifiers: true },
    problem: p(
      'invalid-declaration',
      'options.functions[0]',
      'A function cannot be declared as "event:fire": its first segment is the reserved name event.'
    ),
    valid: { id: 'r' },
    validOptions: { functions: ['events:fire'], colonIdentifiers: true },
  },
];

describe('compileRule: one row per rejection (§ 3.4)', () => {
  it.each(REJECTIONS.map((row) => [row.title, row] as const))('%s', (_title, row) => {
    const result = compileRule(row.rule, row.options);
    expect(result.ok).toBe(false);
    expect(result.rule).toBeUndefined();
    expect(result.problems).toEqual([row.problem]);
  });

  it.each(REJECTIONS.map((row) => [row.title, row] as const))(
    'the nearest valid rule compiles: %s',
    (_title, row) => {
      expect(problemsOf(row.valid, row.validOptions ?? row.options)).toEqual([]);
    }
  );

  it('gives every code the source can give, in some row', () => {
    // A code in the list that no row gives is either dead or untested.
    const given = new Set(REJECTIONS.map((row) => row.problem.code));
    expect(RULE_PROBLEM_CODES.filter((code) => !given.has(code))).toEqual([]);
  });
});

describe('compileRule returns every problem, and throws for none (§ 8 q17)', () => {
  it('returns three independent problems together, in a value', () => {
    const rule = {
      id: 'r',
      descripton: 'x',
      calculations: [{ name: 'y', value: 'calc.z' }],
      decisions: [{ name: 'd', cases: [{ value: 'a' }, { value: 'b' }] }],
    };
    let result: ReturnType<typeof compileRule> | undefined;
    expect(() => (result = compileRule(rule))).not.toThrow();
    expect(result?.problems).toEqual([
      p('unknown-field', 'descripton', '"descripton" is not a field of a rule.'),
      p('unknown-calculation', 'calculations[0].value', 'calc.z is read, and no calculation assigns it.'),
      p(
        'unreachable-case',
        'decisions[0].cases[1]',
        'This case is never reached: decisions[0].cases[0] has no if, and always matches.'
      ),
    ]);
  });

  it('returns a handle that publishes the id and nothing else', () => {
    const result = compileRule({ id: 'orderDiscount', calculations: [{ name: 'x', value: '1' }] });
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    expect(Object.keys(result.rule ?? {})).toEqual(['id']);
    expect(result.rule?.id).toBe('orderDiscount');
    expect(Object.isFrozen(result.rule)).toBe(true);
  });

  it('compiles to a step list that names no section (§ 8 q5)', () => {
    const result = compileRule({
      id: 'r',
      calculations: [{ name: 'x', value: '1' }],
      decisions: [{ name: 'd', cases: [{ value: 'a' }] }],
      outputs: [{ on: { decision: 'd', is: 'a' }, items: [] }],
    });
    const compiled = result.ok ? compiledRuleInternals(result.rule) : undefined;
    expect(compiled?.steps.map((step) => step.kind)).toEqual(['assign', 'decide', 'emit']);
    expect(compiledRuleInternals({ id: 'r' } as never)).toBeUndefined();
  });
});

describe('compileRule\'s options (§ 8 q21)', () => {
  const ORDER = { id: 'r', calculations: [{ name: 'x', value: 'Order.Total > 100' }] };

  it('throws for caseInsensitive, naming it and saying names are compared as written', () => {
    expect(() => compileRule(ORDER, { caseInsensitive: true } as CompileRuleOptions)).toThrow(
      'compileRule: unknown option "caseInsensitive". The options are statements, colonIdentifiers, ' +
      'functions and effects. This release compares every name as written, and caseInsensitive is not supported.'
    );
  });

  it('throws for maxIterations, naming it', () => {
    expect(() => compileRule(ORDER, { maxIterations: 10 } as CompileRuleOptions)).toThrow(
      'compileRule: unknown option "maxIterations". The options are statements, colonIdentifiers, functions and effects.'
    );
  });

  it('does not throw for the four it defines', () => {
    expect(
      compileRule(ORDER, { statements: false, colonIdentifiers: false, functions: [], effects: {} }).ok
    ).toBe(true);
    // The rule the caseInsensitive row refuses, compiling with no options:
    // without the throw, the option would pass unread.
    expect(compiles(ORDER)).toBe(true);
  });

  it('throws for an option of the wrong type, naming it', () => {
    expect(() => compileRule(ORDER, { statements: 'yes' } as unknown as CompileRuleOptions)).toThrow(
      'compileRule: the option statements is a boolean'
    );
    expect(() => compileRule(ORDER, { functions: 'twice' } as unknown as CompileRuleOptions)).toThrow(
      'compileRule: the option functions is an array of names'
    );
    expect(() => compileRule(ORDER, { effects: { notify: true } } as unknown as CompileRuleOptions)).toThrow(
      'compileRule: the effect "notify" is declared by an object'
    );
  });

  it('throws for an own option key it does not define, a symbol or a non-enumerable one (step 4 ninth review, M-1)', () => {
    expect(() => compileRule(ORDER, { [Symbol('s')]: 1 } as unknown as CompileRuleOptions)).toThrow(
      'compileRule: unknown option "Symbol(s)". The options are statements, colonIdentifiers, functions and effects.'
    );
    const hidden = Object.defineProperty({}, 'maxIterations', { value: 10, enumerable: false });
    expect(() => compileRule(ORDER, hidden as CompileRuleOptions)).toThrow(
      'compileRule: unknown option "maxIterations". The options are statements, colonIdentifiers, functions and effects.'
    );
  });

  it('throws for an effect named by a symbol, and declares a non-enumerable one (step 4 tenth review, M-1)', () => {
    expect(() => compileRule(ORDER, { effects: { [Symbol('e')]: {} } } as unknown as CompileRuleOptions)).toThrow(
      new TypeError("compileRule: the effect Symbol(e) is named by a symbol; an effect's name is a string")
    );
    const hidden = Object.defineProperty({ shown: {} }, 'notify', { value: {}, enumerable: false });
    const result = compileRule(ORDER, { effects: hidden });
    expect(result.ok ? compiledRuleInternals(result.rule)?.effects : undefined).toEqual(['shown', 'notify']);
  });

  it('throws for a symbol or a non-enumerable key in an effect\'s declaration (step 4 ninth review, M-1)', () => {
    expect(() =>
      compileRule(ORDER, { effects: { notify: { [Symbol('k')]: 1 } } } as unknown as CompileRuleOptions)
    ).toThrow('compileRule: the effect "notify" declares "Symbol(k)", which this release does not define.');
    const hidden = Object.defineProperty({}, 'key', { value: 1, enumerable: false });
    expect(() => compileRule(ORDER, { effects: { notify: hidden } } as unknown as CompileRuleOptions)).toThrow(
      'compileRule: the effect "notify" declares "key", which this release does not define.'
    );
  });

  it('throws for a key in an effect\'s declaration, which this release does not define', () => {
    expect(() =>
      compileRule(ORDER, { effects: { notify: { key: 1 } } } as unknown as CompileRuleOptions)
    ).toThrow(
      'compileRule: the effect "notify" declares "key", which this release does not define. ' +
      'An effect\'s declaration is an empty object.'
    );
  });
});

describe('description and meta (§ 8 q19)', () => {
  it.each([
    ['an object', { owner: 'pricing', tags: ['eu'] }],
    ['an array', [1, 'two']],
    ['a string', 'see ticket 42'],
  ])('compiles a rule whose meta is %s', (_kind, meta) => {
    expect(problemsOf({ id: 'r', description: 'Order discount', meta })).toEqual([]);
  });
});

describe('statements (§ 8 q20)', () => {
  it('compiles a calculation holding a let with statements on, and refuses the same in an item', () => {
    const options = { ...DECLARED, statements: true };
    expect(problemsOf({ id: 'r', calculations: [{ name: 'x', value: 'let x = 1; setValue(x)' }] }, options))
      .toEqual([
        p(
          'effect-outside-item',
          'calculations[0].value',
          'setValue is a declared effect, called only as an effect item, setValue(…), and here it is named outside one.'
        ),
      ]);
    expect(problemsOf({ id: 'r', calculations: [{ name: 'x', value: 'let x = 1; twice(x)' }] }, options))
      .toEqual([]);
  });

  it('lets the rule\'s statements override the compile option', () => {
    expect(problemsOf({ id: 'r', statements: true, calculations: [{ name: 'x', value: 'let a = 1; a' }] }))
      .toEqual([]);
    expect(
      problemsOf({ id: 'r', statements: false, calculations: [{ name: 'x', value: 'let a = 1; a' }] }, { statements: true })
    ).toEqual([
      p('not-one-expression', 'calculations[0].value', 'It is not one expression: 2 statements. Statements are off for this field.'),
    ]);
  });
});

describe('the never-assigned check', () => {
  it('compiles a read of a name assigned only under a when', () => {
    expect(
      problemsOf({
        id: 'r',
        calculations: [
          { name: 'x', when: 'flag', value: '1' },
          { name: 'y', value: 'calc.x' },
        ],
      })
    ).toEqual([]);
  });

  it('compiles a read in an output, after every calculation', () => {
    expect(
      problemsOf(
        {
          id: 'r',
          calculations: [{ name: 'discount', value: '1' }],
          decisions: [{ name: 'd', cases: [{ value: 'a' }] }],
          outputs: [{ on: { decision: 'd', is: 'a' }, items: ['setValue("d", calc.discount)'] }],
        },
        DECLARED
      )
    ).toEqual([]);
  });

  // The forms of M5 (finding 12): calc's one use is the object of a
  // non-computed member read. `null` is a form that compiles.
  const NOT_A_READ = `${CALC_ONLY}`;
  it.each([
    ['calc.x', null],
    ['calc?.x', null],
    ['calc.x.y', null],
    ['calc.x()', null],
    ['calc?.x ?? 1', null],
    ['obj.calc', null],
    ['({ calc: 1 })', null],
    ['calc["x"]', `${NOT_A_READ} the object of a computed member.`],
    ['calc?.["x"]', `${NOT_A_READ} the object of a computed member.`],
    ['calc[k]', `${NOT_A_READ} the object of a computed member.`],
    ['calc', `${NOT_A_READ} read as a value.`],
    ['typeof calc', `${NOT_A_READ} read as a value.`],
    ['({ calc })', `${NOT_A_READ} read as a value.`],
    ['[...calc]', `${NOT_A_READ} read as a value.`],
    ['({ ...calc })', `${NOT_A_READ} read as a value.`],
    ['calc = 5', `${NOT_A_READ} assigned.`],
    ['[calc] = [1]', `${NOT_A_READ} assigned.`],
    ['calc => 1', `${NOT_A_READ} bound.`],
    ['([calc]) => 1', `${NOT_A_READ} bound.`],
    ['(a = calc) => 1', `${NOT_A_READ} read as a value.`],
    ['calc.x = 1', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['calc.x += 1', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['calc.x++', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['delete calc.x', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['delete calc?.x', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['delete calc', `${NOT_A_READ} deleted.`],
    ['(({ [calc.x]: v }) => v)(o)', null],
    ['[calc.x] = [1]', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['({ a: calc.x } = o)', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['({ ...calc.x } = o)', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['({ a, ...calc.x } = o)', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
    ['({ [k]: calc.x } = o)', `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`],
  ])('%s', (text, message) => {
    expect(problemsOf(calc(text))).toEqual(message === null ? [] : [p('reserved-name', Y, message)]);
  });

  it('with statements on: let calc = 1; 1', () => {
    expect(problemsOf(calc('let calc = 1; 1'), { statements: true })).toEqual([
      p('reserved-name', Y, `${NOT_A_READ} bound.`),
    ]);
  });

  it('with statements on: for (calc.x of list) {}, which eval-core does not evaluate either', () => {
    expect(problemsOf(calc('for (calc.x of list) {}'), { statements: true })).toEqual([
      p(
        'unsupported-statement',
        Y,
        'It holds a ForOfStatement, which eval-core does not evaluate: Unsupported statement type: ForOfStatement'
      ),
      p('reserved-name', Y, `${NOT_A_READ} the object of a written member: a calculation assigns calc.<name>, and no expression does.`),
    ]);
  });
});

describe('the name probes (finding 11)', () => {
  it('compiles a calculation named discount and a function and an effect declared as setValue\'s peers', () => {
    // The contrast rows to the refused names above.
    expect(
      problemsOf(
        { id: 'r', calculations: [{ name: 'discount', value: '1' }] },
        { functions: ['twice'], effects: { setValue: {} } }
      )
    ).toEqual([]);
  });
});

describe('colonIdentifiers (§ 8 q12, q16; finding 28)', () => {
  it.each(['order:calc', 'order:calc:x', 'calcs:x', 'obj.calc:x', 'Calc:x', 'labels2:x'])(
    'compiles %s: only the first segment of an identifier is read',
    (text) => {
      expect(problemsOf(calc(text), COLON)).toEqual([]);
    }
  );

  it.each(['Q1:1', 'Q2:12 > 3', 'Q1:1 > 3 && calc.x == 1', 'flag ? (Q1:1) : Q2:12'])(
    'compiles the first host\'s form %s as a calculation',
    (text) => {
      expect(problemsOf(calc(text), COLON)).toEqual([]);
    }
  );

  it('refuses a colon-joined name bare in a consequent, with eval-core\'s message', () => {
    expect(problemsOf(calc('flag ? Q1:1 : 0'), COLON)).toEqual([
      p(
        'parse-error',
        Y,
        'It does not parse: Unexpected token: a colon-joined name in the consequent of a conditional ' +
        'needs parentheses: (Q1:1) (1:12)'
      ),
    ]);
  });

  it('is off when the option is absent: a colon-joined fact is not one expression', () => {
    // The leg (SR19): one identifier with the option, a label without it.
    expect(problemsOf(calc('order:total + 1'))).toEqual([p('not-one-expression', Y, LABELLED('order'))]);
    expect(problemsOf(calc('order:total + 1'), COLON)).toEqual([]);
    const compiled = compileRule(calc('order:total + 1'), COLON);
    expect(compiled.ok && compiledRuleInternals(compiled.rule)?.colonIdentifiers).toBe(true);
  });

  it('reads CALC.x as an unknown fact, not as calc.x: names are compared as written (§ 8 q3)', () => {
    const rule = { id: 'r', calculations: [{ name: 'y', value: 'CALC.x' }] };
    expect(problemsOf(rule)).toEqual([]);
    expect(problemsOf({ id: 'r', calculations: [{ name: 'y', value: 'calc.x' }] })).toEqual([
      p('unknown-calculation', 'calculations[0].value', 'calc.x is read, and no calculation assigns it.'),
    ]);
  });
});

describe('outputs, triggers and onError', () => {
  it('matches an output on one label and on a list', () => {
    expect(
      problemsOf(
        {
          id: 'r',
          decisions: [{ name: 'tier', cases: [{ if: 'a', value: 'gold' }, { if: 'b', value: 2 }, { value: false }] }],
          outputs: [
            { on: { decision: 'tier', is: 'gold' }, items: ['setValue("t", 1)'] },
            { on: { decision: 'tier', is: [2, false] }, items: ['setValue("t", 2)'] },
          ],
        },
        DECLARED
      )
    ).toEqual([]);
  });

  it('compiles triggers and onError items, which nothing runs in this release (§ 8 q2)', () => {
    const result = compileRule(
      {
        id: 'orderDiscount',
        triggers: [{ event: 'valueChanged', match: { keys: ['order:total', 'customer:tier'] } }],
        onError: ['setValue("error", error.message)'],
      },
      { ...DECLARED, colonIdentifiers: true }
    );
    expect(result.problems).toEqual([]);
    const compiled = result.ok ? compiledRuleInternals(result.rule) : undefined;
    expect(compiled?.triggers.map((trigger) => trigger.event)).toEqual(['valueChanged']);
    expect(compiled?.onError.map((item) => item.path)).toEqual(['onError[0]']);
  });

  it('compiles the design\'s § 2.9 rule', () => {
    expect(
      problemsOf(
        {
          id: 'orderDiscount',
          name: 'Order discount by tier',
          active: true,
          triggers: [{ event: 'valueChanged', match: { keys: ['order:total', 'customer:tier'] } }],
          filter: { match: { region: ['EU', 'UK'] }, when: 'customer:active' },
          calculations: [
            { name: 'eligible', value: 'order:total >= 100' },
            { name: 'discount', value: '0' },
            { name: 'discount', when: 'calc.eligible', value: 'order:total * 0.1' },
          ],
          decisions: [
            {
              name: 'offer',
              cases: [
                { if: 'customer:tier == \'gold\' && calc.eligible', value: 'apply' },
                { value: 'clear' },
              ],
            },
          ],
          outputs: [
            {
              on: { decision: 'offer', is: 'apply' },
              items: ['setValue(\'order:discount\', calc.discount)', 'setVisible(\'discount:banner\', true)'],
            },
            {
              on: { decision: 'offer', is: 'clear' },
              items: ['setValue(\'order:discount\', 0)', 'setVisible(\'discount:banner\', false)'],
            },
          ],
        },
        { ...DECLARED, colonIdentifiers: true }
      )
    ).toEqual([]);
  });
});

describe('the step 3 follow-up (the review of d42d2cf)', () => {
  it.each([
    ['(({ [event]: v }) => v)(o)', {}],
    ['(({ [twice]: v }) => v)(o)', DECLARED],
    ['(({ [key]: v, ...rest }) => rest)(o)', {}],
  ])('reads a computed key of an object pattern, %s, and binds nothing by it', (text, options) => {
    expect(problemsOf(calc(text), options)).toEqual([]);
  });

  it('still refuses a reserved or declared name as an object pattern\'s value', () => {
    expect(problemsOf(calc('(({ a: event }) => 1)(o)'))).toEqual([
      p('reserved-name', Y, 'event is read, never bound, assigned or deleted; here it is bound.'),
    ]);
    expect(problemsOf(calc('(({ [k]: twice }) => 1)(o)'), DECLARED)).toEqual([
      p('declared-name', Y, 'twice is a declared function, and here it is bound.'),
    ]);
  });

  it('reports every value of a pattern JSON cannot write, not the first alone', () => {
    expect(problemsOf({ id: 'r', filter: { match: { a: Infinity, b: { c: Number.NaN } } } })).toEqual([
      p('invalid-field', 'filter.match.a', 'A pattern holds null, strings, finite numbers, booleans, arrays and objects.'),
      p('invalid-field', 'filter.match.b.c', 'A pattern holds null, strings, finite numbers, booleans, arrays and objects.'),
    ]);
  });

  it('reads a pattern\'s array by index, so a hole is reported', () => {
    const holed: unknown[] = ['EU'];
    holed[2] = 'UK';
    expect(problemsOf({ id: 'r', filter: { match: { region: holed } } })).toEqual([
      p('invalid-field', 'filter.match.region[1]', 'A pattern holds null, strings, finite numbers, booleans, arrays and objects.'),
    ]);
  });

  it('reports a pattern JSON nests 20,000 deep at its 65th level, and does not throw', () => {
    const match = JSON.parse(`{"a":${'['.repeat(20_000)}1${']'.repeat(20_000)}}`) as unknown;
    let result: ReturnType<typeof compileRule> | undefined;
    expect(() => (result = compileRule({ id: 'r', filter: { match } }))).not.toThrow();
    expect(result?.problems).toEqual([
      p(
        'invalid-field',
        `filter.match.a${'[0]'.repeat(63)}`,
        'A pattern nests at most 64 arrays and objects, the match itself the first: this one is deeper.'
      ),
    ]);
  });

  it('reports a pattern holding more than 100,000 values on its paths, a shared diamond among them', () => {
    let diamond: unknown = 'gold';
    for (let level = 0; level < 40; level++) {
      diamond = { l: diamond, r: diamond };
    }
    expect(problemsOf({ id: 'r', triggers: [{ event: 'e', match: { tier: diamond } }] })).toEqual([
      p(
        'invalid-field',
        'triggers[0].match',
        'A pattern holds at most 100,000 values, counting the match itself and a value once on each path to it: this one holds more.'
      ),
    ]);
  });

  it('reports a JSON match with 2,000 values past the depth bound, under keys 300 long, once', () => {
    const key = (i: number) => JSON.stringify(String(i).padStart(300, 'k'));
    let text = `{${Array.from({ length: 2_000 }, (_, i) => `"c${i}":[1]`).join(',')}}`;
    for (let i = 62; i >= 0; i--) {
      text = `{${key(i)}:${text}}`;
    }
    const problems = problemsOf({ id: 'r', filter: { match: JSON.parse(text) as unknown } });
    expect(problems).toHaveLength(1);
    expect(problems[0]?.code).toBe('invalid-field');
    expect(problems[0]?.path).toMatch(/\.c0$/);
  });

  it('reports a JSON match of 20,000 infinities under keys 1,000 long as 101 problems, each path bounded', () => {
    const key = (i: number) => JSON.stringify(String(i).padStart(1_000, 'k'));
    let text = `{${Array.from({ length: 20_000 }, (_, i) => `"c${i}":1e999`).join(',')}}`;
    for (let i = 59; i >= 0; i--) {
      text = `{${key(i)}:${text}}`;
    }
    const problems = problemsOf({ id: 'r', filter: { match: JSON.parse(text) as unknown } });
    expect(problems).toHaveLength(101);
    expect(problems[100]).toEqual(
      p('invalid-field', 'filter.match', 'A match lists at most 100 of its problems: this one has more.')
    );
    expect(Math.max(...problems.map((problem) => problem.path.length))).toBeLessThan(60 * 72);
  });

  it('copies a value two paths share once, and shares it in the compiled pattern', () => {
    const shared = { tier: 'gold' };
    const result = compileRule({ id: 'r', filter: { match: { a: shared, b: [shared] } } });
    const match = result.ok ? compiledRuleInternals(result.rule)?.filter.match : undefined;
    expect(match?.['a']).toEqual({ tier: 'gold' });
    expect(match?.['a']).not.toBe(shared);
    expect(match?.['a']).toBe((match?.['b'] as readonly unknown[])[0]);
  });

  it.each([
    ['a calculation', calc(`a${'.b'.repeat(50_000)}`), Y],
    ['an effect item', { id: 'r', onInit: [`setValue(a${'.b'.repeat(50_000)})`] }, 'onInit[0]'],
  ])('reports %s nested past the stack as a parse error, and does not throw', (_kind, rule, path) => {
    let result: ReturnType<typeof compileRule> | undefined;
    expect(() => (result = compileRule(rule, DECLARED))).not.toThrow();
    expect(result?.problems).toEqual([
      p('parse-error', path, 'It is nested too deeply to check: the call stack ran out.'),
    ]);
  });

  it('checks a member chain 500 long', () => {
    expect(problemsOf(calc(`a${'.b'.repeat(500)}`))).toEqual([]);
    expect(problemsOf({ id: 'r', onInit: [`setValue(a${'.b'.repeat(500)})`] }, DECLARED)).toEqual([]);
  });

  it('reports a cyclic pattern as a problem, and does not throw', () => {
    const match: Record<string, unknown> = { region: 'EU' };
    match['self'] = match;
    let result: ReturnType<typeof compileRule> | undefined;
    expect(() => (result = compileRule({ id: 'r', triggers: [{ event: 'e', match }] }))).not.toThrow();
    expect(result?.problems).toEqual([
      p(
        'invalid-field',
        'triggers[0].match.self',
        'A pattern holds no cycle: this value is an object or array that contains it.'
      ),
    ]);
  });

  it('does not repeat a decision\'s own problem as an output\'s unknown-decision', () => {
    expect(
      problemsOf({
        id: 'r',
        decisions: [{ name: 'a b', cases: [{ value: 'x' }] }],
        outputs: [{ on: { decision: 'a b', is: 'x' }, items: [] }],
      })
    ).toEqual([
      p('invalid-name', 'decisions[0].name', 'A decision\'s name is an identifier, [A-Za-z_$][A-Za-z0-9_$]*, and "a b" is not.'),
    ]);
    expect(
      problemsOf({
        id: 'r',
        calculations: [{ name: 'd', value: '1' }],
        decisions: [{ name: 'd', cases: [{ value: 'x' }] }],
        outputs: [{ on: { decision: 'd', is: 'x' }, items: [] }],
      })
    ).toEqual([p('duplicate-name', 'decisions[0].name', '"d" names a calculation too.')]);
    // A name no decision has, problem or not, is still reported.
    expect(
      problemsOf({
        id: 'r',
        decisions: [{ name: 'a b', cases: [{ value: 'x' }] }],
        outputs: [{ on: { decision: 'ab', is: 'x' }, items: [] }],
      }).map((problem) => problem.code)
    ).toEqual(['invalid-name', 'unknown-decision']);
  });
});
