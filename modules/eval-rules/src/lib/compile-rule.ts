import {
  EvalState,
  call,
  compile,
  defaultParserOptions,
  extractExpression,
  findUnsupportedStatement,
  parse,
  type ParserOptions,
  type stateCallback,
} from '@zvenigora/ng-eval-core';
import { full, fullAncestor } from 'acorn-walk';
import {
  type InvalidPatternValue,
  MAX_PATTERN_DEPTH,
  MAX_PATTERN_PROBLEMS,
  MAX_PATTERN_VALUES,
  checkPattern,
  isPlainObject,
} from './pattern';

/**
 * `compileRule`: the Phase 12 plan's § 3.4. It checks a rule, parses each of
 * its expression fields once, and returns either the compiled rule or every
 * problem it found, each with a `code`, a `path` and a `message`; a `match`'s
 * walk stops at the first of two bounds it meets, its 101st problem (its
 * first 100, and one saying there are more) or 100,000 values (the size
 * problem alone), by `checkPattern` (§ 8 q17 as amended). It throws
 * for neither (§ 8 q17). What it throws for is the caller's own code: an
 * option it does not define, or an option of the wrong type (§ 8 q21).
 *
 * Every check here reads a tree and runs no expression of the rule, so none
 * of them stands in a write's path. The one thing that runs is `eval-core`
 * itself, on a text this function writes: the name probes, which ask
 * `eval-core` whether it will read `calc.<name>` and call `<name>()`, so that
 * its own guard decides, and its own list is not copied here (finding 11).
 */

/**
 * Every `code` a `RuleProblem` can carry. The list is open: a later release
 * may add a code, and a host handles one it does not know. The README lists
 * each, and a spec fails on a code here that the README lacks.
 */
export const RULE_PROBLEM_CODES = [
  'invalid-field',
  'missing-field',
  'unknown-field',
  'invalid-name',
  'duplicate-name',
  'invalid-declaration',
  'refused-name',
  'parse-error',
  'empty-expression',
  'not-one-expression',
  'statement-not-allowed',
  'unsupported-statement',
  'async-expression',
  'this-expression',
  'reserved-name',
  'reserved-prefix',
  'declared-name',
  'unknown-calculation',
  'read-before-assignment',
  'calculation-in-on-error',
  'invalid-effect-item',
  'effect-outside-item',
  'unknown-decision',
  'unknown-label',
  'unreachable-case',
] as const;

type RuleProblemCode = (typeof RULE_PROBLEM_CODES)[number];

/**
 * One thing wrong with a rule. A consumer reads it and does not build one.
 *
 * `code` is stable from 0.1.0, from a list documented as open; `path` names
 * the field, as `decisions[0].cases[1].if`, or a declaration, as
 * `options.functions[0]`; `message` is for a person.
 */
export interface RuleProblem {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

declare const compiledRuleBrand: unique symbol;

/**
 * A rule `compileRule` accepted: a handle that publishes the rule's `id`.
 * What `compileRule` built is not a field of it.
 */
export interface CompiledRule {
  readonly id: string;
  readonly [compiledRuleBrand]: true;
}

/**
 * What `compileRule` returns: the compiled rule and no problem, or no rule and
 * at least one problem. `ok` tells the two apart.
 */
export type CompileRuleResult =
  | { readonly ok: true; readonly rule: CompiledRule; readonly problems: readonly RuleProblem[] }
  | { readonly ok: false; readonly rule?: undefined; readonly problems: readonly RuleProblem[] };

/**
 * The options `compileRule` defines. Any other key throws, a symbol or a
 * non-enumerable one included.
 *
 * `functions` declares the names of the host's functions, whose
 * implementations `evaluateRule` takes; `effects` declares the effect
 * functions, which this library records. An effect's declaration is an empty
 * object in this release.
 */
export interface CompileRuleOptions {
  /** Statements in a filter, a calculation and a decision. Default `false`. */
  readonly statements?: boolean;
  /** `eval-core`'s colon-joined names, such as `Q1:1`. Default `false`. */
  readonly colonIdentifiers?: boolean;
  readonly functions?: readonly string[];
  /**
   * From each effect's name to its declaration, an object (§ 8 q6), so that
   * Phase 13's `key(args)` has a place. Every own key names an effect, a
   * non-enumerable one included, and a symbol throws. Empty in this release:
   * a key in a declaration throws, as an unknown option does.
   */
  readonly effects?: Readonly<Record<string, Readonly<Record<string, never>>>>;
}

/** A field's text, parsed once and compiled. */
export interface CompiledExpression {
  readonly path: string;
  readonly text: string;
  readonly run: stateCallback;
}

/** A case's label: a string, a finite number or a boolean. */
export type RuleLabel = string | number | boolean;

/**
 * The rule as a step list (the design's Q48, § 8 q5): the compiled form names
 * no section. Internal; step 4's evaluation reads it.
 */
export type CompiledStep =
  | {
      readonly kind: 'assign';
      readonly name: string;
      readonly when?: CompiledExpression;
      readonly value: CompiledExpression;
    }
  | {
      readonly kind: 'decide';
      readonly name: string;
      readonly strict: boolean;
      readonly cases: readonly { readonly if?: CompiledExpression; readonly label: RuleLabel }[];
    }
  | {
      readonly kind: 'emit';
      readonly decision: string;
      readonly labels: readonly RuleLabel[];
      readonly items: readonly CompiledExpression[];
    };

/** What a `CompiledRule` stands for. Internal. */
export interface CompiledRuleInternals {
  readonly id: string;
  readonly active: boolean;
  readonly debug: boolean;
  readonly colonIdentifiers: boolean;
  readonly functions: readonly string[];
  readonly effects: readonly string[];
  readonly filter: {
    readonly match?: Readonly<Record<string, unknown>>;
    readonly when?: CompiledExpression;
  };
  readonly onInit: readonly CompiledExpression[];
  readonly steps: readonly CompiledStep[];
  readonly onError: readonly CompiledExpression[];
  readonly triggers: readonly {
    readonly event: string;
    readonly match?: Readonly<Record<string, unknown>>;
  }[];
}

const internals = new WeakMap<CompiledRule, CompiledRuleInternals>();

/** The compiled form behind a handle, or `undefined` for any other object. */
export const compiledRuleInternals = (rule: CompiledRule): CompiledRuleInternals | undefined =>
  internals.get(rule);

// ---------------------------------------------------------------------------
// The format's fields (§ 3.2)
// ---------------------------------------------------------------------------

const RULE_FIELDS = [
  'id', 'name', 'description', 'meta', 'active', 'strict', 'statements', 'debug',
  'triggers', 'filter', 'onInit', 'calculations', 'decisions', 'outputs', 'onError',
] as const;
const TRIGGER_FIELDS = ['event', 'match'] as const;
const FILTER_FIELDS = ['match', 'when'] as const;
const CALCULATION_FIELDS = ['name', 'when', 'value'] as const;
const DECISION_FIELDS = ['name', 'strict', 'cases'] as const;
const CASE_FIELDS = ['if', 'value'] as const;
const OUTPUT_FIELDS = ['on', 'items'] as const;
const ON_FIELDS = ['decision', 'is'] as const;

const OPTIONS = ['statements', 'colonIdentifiers', 'functions', 'effects'] as const;

/** A calculation's or a decision's name: `calc.<name>` parses under either parser. */
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Names a rule cannot bind (§ 3.4): `calc` is its calculations, `event` what
 * the run was given, `error` what an `onError` item reads, and `labels` and
 * `run` are kept for Phase 14.
 */
const RESERVED = new Set(['calc', 'event', 'error', 'labels', 'run']);

/** A pattern's problem, by the reason `checkPattern` gives. */
const PATTERN_MESSAGES: Readonly<Record<InvalidPatternValue['reason'], string>> = {
  value: 'A pattern holds null, strings, finite numbers, booleans, arrays and objects.',
  cycle: 'A pattern holds no cycle: this value is an object or array that contains it.',
  depth:
    `A pattern nests at most ${MAX_PATTERN_DEPTH} arrays and objects, the match itself the first: ` +
    `this one is deeper.`,
  size:
    `A pattern holds at most ${MAX_PATTERN_VALUES.toLocaleString('en-US')} values, counting the match ` +
    `itself and a value once on each path to it: this one holds more.`,
  more: `A match lists at most ${MAX_PATTERN_PROBLEMS} of its problems: this one has more.`,
};

// ---------------------------------------------------------------------------
// compileRule
// ---------------------------------------------------------------------------

/**
 * Checks a rule and compiles it.
 *
 * @param rule the rule, as JSON or as a `defineRule` literal
 * @param options the compile options; any key it does not define throws
 * @returns the compiled rule, or every problem found; a `match`'s walk stops at the first of two
 *   bounds it meets: at its 101st problem it gives its first 100 and one saying there are more;
 *   past 100,000 values it gives the size problem alone
 */
export const compileRule = (rule: unknown, options?: CompileRuleOptions): CompileRuleResult => {
  const settings = readOptions(options);
  const compiler = new RuleCompiler(settings);
  const compiled = compiler.compile(rule);
  if (compiler.problems.length > 0 || compiled === undefined) {
    return { ok: false, problems: [...compiler.problems] };
  }
  const handle = Object.freeze({ id: compiled.id }) as CompiledRule;
  internals.set(handle, compiled);
  return { ok: true, rule: handle, problems: [] };
};

interface Settings {
  readonly statements: boolean;
  readonly colonIdentifiers: boolean;
  readonly functions: readonly string[];
  readonly effects: readonly string[];
}

/** The options, checked. A mistake here is the caller's code, so it throws. */
const readOptions = (options: CompileRuleOptions | undefined): Settings => {
  if (options === undefined) {
    return { statements: false, colonIdentifiers: false, functions: [], effects: [] };
  }
  if (!isPlainObject(options)) {
    throw new TypeError('compileRule: the options are an object');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== 'string' || !(OPTIONS as readonly string[]).includes(key)) {
      throw new Error(
        `compileRule: unknown option "${String(key)}". The options are statements, colonIdentifiers, ` +
        `functions and effects.` +
        (key === 'caseInsensitive'
          ? ' This release compares every name as written, and caseInsensitive is not supported.'
          : '')
      );
    }
  }
  const flag = (key: 'statements' | 'colonIdentifiers'): boolean => {
    const value = options[key];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new TypeError(`compileRule: the option ${key} is a boolean`);
    }
    return value ?? false;
  };
  const functions = options['functions'] ?? [];
  if (!Array.isArray(functions) || functions.some((name) => typeof name !== 'string')) {
    throw new TypeError('compileRule: the option functions is an array of names');
  }
  const effects = options['effects'] ?? {};
  if (!isPlainObject(effects)) {
    throw new TypeError('compileRule: the option effects is an object, from each name to its declaration');
  }
  const names = Reflect.ownKeys(effects);
  for (const name of names) {
    if (typeof name !== 'string') {
      throw new TypeError(`compileRule: the effect ${String(name)} is named by a symbol; an effect's name is a string`);
    }
    const declaration: unknown = (effects as Record<string, unknown>)[name];
    if (!isPlainObject(declaration)) {
      throw new TypeError(`compileRule: the effect "${name}" is declared by an object`);
    }
    const keys = Reflect.ownKeys(declaration);
    if (keys.length > 0) {
      throw new Error(
        `compileRule: the effect "${name}" declares "${String(keys[0])}", which this release does not define. ` +
        `An effect's declaration is an empty object.`
      );
    }
  }
  return {
    statements: flag('statements'),
    colonIdentifiers: flag('colonIdentifiers'),
    functions: [...functions],
    effects: names as string[],
  };
};

/** Where a field sits, for the checks that depend on it. */
interface Site {
  readonly path: string;
  /** An effect item: one call of a declared effect. */
  readonly item: boolean;
  /** An `onError` item, which reads `error` and no `calc.` name. */
  readonly onError: boolean;
  /** Statements allowed (never for an item). */
  readonly statements: boolean;
  /** The calculation names assigned before this field. */
  readonly assigned: ReadonlySet<string>;
}

type Role = 'binding' | 'assignment target' | 'deleted' | 'value';

class RuleCompiler {
  readonly problems: RuleProblem[] = [];
  private readonly reported = new Set<string>();
  private readonly parserOptions: ParserOptions;
  private readonly functions: ReadonlySet<string>;
  private readonly effects: ReadonlySet<string>;
  /** Every calculation name some calculation assigns. */
  private allAssigned: ReadonlySet<string> = new Set();
  /**
   * The names of decisions that have a problem of their own, which an output
   * naming one does not repeat as `unknown-decision`.
   */
  private readonly rejectedDecisions = new Set<string>();

  constructor(private readonly settings: Settings) {
    this.parserOptions = {
      ...defaultParserOptions,
      // An `await` then parses, so it is refused with a message of its own
      // rather than the parse error any malformed text shares (finding 10).
      allowAwaitOutsideFunction: true,
      ...(settings.colonIdentifiers ? { colonIdentifiers: true } : {}),
    };
    this.functions = new Set(settings.functions);
    this.effects = new Set(settings.effects);
  }

  private problem(code: RuleProblemCode, path: string, message: string): void {
    const key = `${code}\u0000${path}\u0000${message}`;
    if (!this.reported.has(key)) {
      this.reported.add(key);
      this.problems.push({ code, path, message });
    }
  }

  compile(rule: unknown): CompiledRuleInternals | undefined {
    this.declarations();

    if (!isPlainObject(rule)) {
      this.problem('invalid-field', '', 'A rule is an object.');
      return undefined;
    }
    this.unknownFields(rule, RULE_FIELDS, '', 'a rule');

    const id = own(rule, 'id');
    if (id === undefined) {
      this.problem('missing-field', 'id', 'A rule has an id.');
    } else if (typeof id !== 'string' || id === '') {
      this.problem('invalid-field', 'id', 'id is a non-empty string.');
    }
    for (const key of ['name', 'description'] as const) {
      const value = own(rule, key);
      if (value !== undefined && typeof value !== 'string') {
        this.problem('invalid-field', key, `${key} is a string.`);
      }
    }
    const flags: Record<string, boolean | undefined> = {};
    for (const key of ['active', 'strict', 'statements', 'debug'] as const) {
      const value = own(rule, key);
      if (value !== undefined && typeof value !== 'boolean') {
        this.problem('invalid-field', key, `${key} is a boolean.`);
      } else {
        flags[key] = value;
      }
    }
    const statements = flags['statements'] ?? this.settings.statements;
    const strict = flags['strict'] ?? false;

    const triggers = this.section(rule, 'triggers');
    const onInit = this.section(rule, 'onInit');
    const calculations = this.section(rule, 'calculations');
    const decisions = this.section(rule, 'decisions');
    const outputs = this.section(rule, 'outputs');
    const onError = this.section(rule, 'onError');

    const calculationNames = this.calculationNames(calculations);
    this.allAssigned = new Set(calculationNames.filter((name): name is string => name !== undefined));
    const none = new Set<string>();

    const compiledTriggers = this.triggers(triggers);
    const filter = this.filter(own(rule, 'filter'), statements);
    const compiledOnInit = onInit.map((item, index) =>
      this.item(item, `onInit[${index}]`, none, false)
    );

    const steps: CompiledStep[] = [];
    const assigned = new Set<string>();
    calculations.forEach((entry, index) => {
      const path = `calculations[${index}]`;
      if (!isPlainObject(entry)) {
        this.problem('invalid-field', path, 'A calculation is an object.');
        return;
      }
      this.unknownFields(entry, CALCULATION_FIELDS, path, 'a calculation');
      const site = { item: false, onError: false, statements, assigned: new Set(assigned) };
      const when = own(entry, 'when') === undefined
        ? undefined
        : this.expression(own(entry, 'when'), { ...site, path: `${path}.when` });
      const value = own(entry, 'value') === undefined
        ? this.missing(`${path}.value`, 'A calculation has a value.')
        : this.expression(own(entry, 'value'), { ...site, path: `${path}.value` });
      const name = calculationNames[index];
      if (name !== undefined) {
        assigned.add(name);
        if (value !== undefined) {
          steps.push({ kind: 'assign', name, ...(when ? { when } : {}), value });
        }
      }
    });

    const labelsByDecision = new Map<string, readonly RuleLabel[]>();
    decisions.forEach((entry, index) => {
      const step = this.decision(entry, `decisions[${index}]`, statements, strict, labelsByDecision);
      const name = isPlainObject(entry) ? own(entry, 'name') : undefined;
      if (step === undefined && typeof name === 'string') {
        this.rejectedDecisions.add(name);
      }
      if (step) {
        steps.push(step);
      }
    });

    outputs.forEach((entry, index) => {
      const step = this.output(entry, `outputs[${index}]`, labelsByDecision);
      if (step) {
        steps.push(step);
      }
    });

    const compiledOnError = onError.map((item, index) =>
      this.item(item, `onError[${index}]`, none, true)
    );

    this.refusedCalculationNames(calculations, calculationNames);

    if (this.problems.length > 0) {
      return undefined;
    }
    return {
      id: id as string,
      active: flags['active'] ?? true,
      debug: flags['debug'] ?? false,
      colonIdentifiers: this.settings.colonIdentifiers,
      functions: this.settings.functions,
      effects: this.settings.effects,
      filter,
      onInit: compiledOnInit as CompiledExpression[],
      steps,
      onError: compiledOnError as CompiledExpression[],
      triggers: compiledTriggers,
    };
  }

  // -------------------------------------------------------------------------
  // Structure
  // -------------------------------------------------------------------------

  private unknownFields(
    entry: Record<string, unknown>,
    known: readonly string[],
    path: string,
    what: string
  ): void {
    for (const key of Object.keys(entry)) {
      if (!known.includes(key)) {
        this.problem('unknown-field', join(path, key), `"${key}" is not a field of ${what}.`);
      }
    }
  }

  private section(rule: Record<string, unknown>, key: string): readonly unknown[] {
    const value = own(rule, key);
    if (value === undefined) {
      return [];
    }
    if (!Array.isArray(value)) {
      this.problem('invalid-field', key, `${key} is an array.`);
      return [];
    }
    return value;
  }

  private missing(path: string, message: string): undefined {
    this.problem('missing-field', path, message);
    return undefined;
  }

  /** Each calculation's name, or `undefined` where it has none that is valid. */
  private calculationNames(calculations: readonly unknown[]): (string | undefined)[] {
    return calculations.map((entry, index) => {
      if (!isPlainObject(entry)) {
        return undefined;
      }
      const path = `calculations[${index}].name`;
      const name = own(entry, 'name');
      if (name === undefined) {
        return this.missing(path, 'A calculation has a name.');
      }
      if (typeof name !== 'string' || !IDENTIFIER.test(name)) {
        this.problem(
          'invalid-name',
          path,
          `A calculation's name is an identifier, [A-Za-z_$][A-Za-z0-9_$]*, and ${describe(name)} is not.`
        );
        return undefined;
      }
      return name;
    });
  }

  private triggers(triggers: readonly unknown[]): CompiledRuleInternals['triggers'] {
    const compiled: { event: string; match?: Readonly<Record<string, unknown>> }[] = [];
    triggers.forEach((entry, index) => {
      const path = `triggers[${index}]`;
      if (!isPlainObject(entry)) {
        this.problem('invalid-field', path, 'A trigger is an object.');
        return;
      }
      this.unknownFields(entry, TRIGGER_FIELDS, path, 'a trigger');
      const event = own(entry, 'event');
      if (event === undefined) {
        this.problem('missing-field', `${path}.event`, 'A trigger has an event.');
      } else if (typeof event !== 'string' || event === '') {
        this.problem('invalid-field', `${path}.event`, 'A trigger\'s event is a non-empty string.');
      }
      const match = this.pattern(own(entry, 'match'), `${path}.match`);
      if (typeof event === 'string' && event !== '') {
        compiled.push({ event, ...(match ? { match } : {}) });
      }
    });
    return compiled;
  }

  private filter(filter: unknown, statements: boolean): CompiledRuleInternals['filter'] {
    if (filter === undefined) {
      return {};
    }
    if (!isPlainObject(filter)) {
      this.problem('invalid-field', 'filter', 'filter is an object.');
      return {};
    }
    this.unknownFields(filter, FILTER_FIELDS, 'filter', 'a filter');
    const match = this.pattern(own(filter, 'match'), 'filter.match');
    const when = own(filter, 'when') === undefined
      ? undefined
      : this.expression(own(filter, 'when'), {
          path: 'filter.when', item: false, onError: false, statements, assigned: new Set(),
        });
    return { ...(match ? { match } : {}), ...(when ? { when } : {}) };
  }

  /** A pattern, checked and copied, or `undefined`. */
  private pattern(pattern: unknown, path: string): Readonly<Record<string, unknown>> | undefined {
    if (pattern === undefined) {
      return undefined;
    }
    if (!isPlainObject(pattern)) {
      this.problem('invalid-field', path, 'A match is an object.');
      return undefined;
    }
    const checked = checkPattern(pattern, path);
    // A pattern's problems skip the duplicate check: each is a value of its
    // own, met once on its path, and the match's own path, its prefix, is no
    // other pattern's. Two keys longer than 64 code units and alike in their
    // first 64 show as one path, and both are reported. Through the check, a set of long keys of one length, which V8 hashes alike, made
    // compiling quadratic (7e10e5a's review); only time shows it, so no row
    // does (6997575's review, M-c).
    for (const value of checked.problems) {
      this.problems.push({ code: 'invalid-field', path: value.path, message: PATTERN_MESSAGES[value.reason] });
    }
    return checked.copy as Readonly<Record<string, unknown>> | undefined;
  }

  private decision(
    entry: unknown,
    path: string,
    statements: boolean,
    ruleStrict: boolean,
    labelsByDecision: Map<string, readonly RuleLabel[]>
  ): CompiledStep | undefined {
    if (!isPlainObject(entry)) {
      this.problem('invalid-field', path, 'A decision is an object.');
      return undefined;
    }
    this.unknownFields(entry, DECISION_FIELDS, path, 'a decision');

    let name: string | undefined;
    const rawName = own(entry, 'name');
    if (rawName === undefined) {
      this.missing(`${path}.name`, 'A decision has a name.');
    } else if (typeof rawName !== 'string' || !IDENTIFIER.test(rawName)) {
      this.problem(
        'invalid-name',
        `${path}.name`,
        `A decision's name is an identifier, [A-Za-z_$][A-Za-z0-9_$]*, and ${describe(rawName)} is not.`
      );
    } else if (this.allAssigned.has(rawName)) {
      this.problem('duplicate-name', `${path}.name`, `"${rawName}" names a calculation too.`);
    } else if (labelsByDecision.has(rawName)) {
      this.problem('duplicate-name', `${path}.name`, `"${rawName}" names an earlier decision too.`);
    } else {
      name = rawName;
    }

    const strictValue = own(entry, 'strict');
    if (strictValue !== undefined && typeof strictValue !== 'boolean') {
      this.problem('invalid-field', `${path}.strict`, 'strict is a boolean.');
    }

    const rawCases = own(entry, 'cases');
    let cases: readonly unknown[] = [];
    if (rawCases === undefined) {
      this.missing(`${path}.cases`, 'A decision has cases.');
    } else if (!Array.isArray(rawCases)) {
      this.problem('invalid-field', `${path}.cases`, 'cases is an array.');
    } else {
      cases = rawCases;
    }

    const compiled: { if?: CompiledExpression; label: RuleLabel }[] = [];
    const labels: RuleLabel[] = [];
    let fallback: string | undefined;
    cases.forEach((entryCase, index) => {
      const casePath = `${path}.cases[${index}]`;
      if (!isPlainObject(entryCase)) {
        this.problem('invalid-field', casePath, 'A case is an object.');
        return;
      }
      this.unknownFields(entryCase, CASE_FIELDS, casePath, 'a case');
      if (fallback !== undefined) {
        this.problem(
          'unreachable-case',
          casePath,
          `This case is never reached: ${fallback} has no if, and always matches.`
        );
      }
      const condition = own(entryCase, 'if');
      const compiledIf = condition === undefined
        ? undefined
        : this.expression(condition, {
            path: `${casePath}.if`, item: false, onError: false, statements, assigned: this.allAssigned,
          });
      if (condition === undefined && fallback === undefined) {
        fallback = casePath;
      }
      const label = own(entryCase, 'value');
      if (label === undefined) {
        this.missing(`${casePath}.value`, 'A case has a value, its label.');
      } else if (!isLabel(label)) {
        this.problem(
          'invalid-field',
          `${casePath}.value`,
          'A case\'s value is a label: a string, a finite number or a boolean, never an expression.'
        );
      } else {
        labels.push(label);
        if (condition === undefined || compiledIf !== undefined) {
          compiled.push({ ...(compiledIf ? { if: compiledIf } : {}), label });
        }
      }
    });

    if (name === undefined) {
      return undefined;
    }
    labelsByDecision.set(name, labels);
    return {
      kind: 'decide',
      name,
      strict: typeof strictValue === 'boolean' ? strictValue : ruleStrict,
      cases: compiled,
    };
  }

  private output(
    entry: unknown,
    path: string,
    labelsByDecision: ReadonlyMap<string, readonly RuleLabel[]>
  ): CompiledStep | undefined {
    if (!isPlainObject(entry)) {
      this.problem('invalid-field', path, 'An output is an object.');
      return undefined;
    }
    this.unknownFields(entry, OUTPUT_FIELDS, path, 'an output');

    let decision: string | undefined;
    let matchLabels: RuleLabel[] | undefined;
    const on = own(entry, 'on');
    if (on === undefined) {
      this.missing(`${path}.on`, 'An output has an on.');
    } else if (!isPlainObject(on)) {
      this.problem('invalid-field', `${path}.on`, 'on is an object.');
    } else {
      this.unknownFields(on, ON_FIELDS, `${path}.on`, 'an output\'s on');
      const named = own(on, 'decision');
      const known = typeof named === 'string' ? labelsByDecision.get(named) : undefined;
      if (named === undefined) {
        this.missing(`${path}.on.decision`, 'An output\'s on names a decision.');
      } else if (typeof named !== 'string') {
        this.problem('invalid-field', `${path}.on.decision`, 'on.decision is a string.');
      } else if (known === undefined) {
        if (!this.rejectedDecisions.has(named)) {
          this.problem('unknown-decision', `${path}.on.decision`, `No decision is named "${named}".`);
        }
      } else {
        decision = named;
      }
      const is = own(on, 'is');
      if (is === undefined) {
        this.missing(`${path}.on.is`, 'An output\'s on has an is, a label or a list of labels.');
      } else if (Array.isArray(is)) {
        if (is.length === 0 || !is.every(isLabel)) {
          this.problem(
            'invalid-field',
            `${path}.on.is`,
            'on.is is a label or a non-empty array of labels: strings, finite numbers or booleans.'
          );
        } else {
          matchLabels = [...is];
          is.forEach((label, index) => this.label(label, known, named, `${path}.on.is[${index}]`));
        }
      } else if (!isLabel(is)) {
        this.problem(
          'invalid-field',
          `${path}.on.is`,
          'on.is is a label or a non-empty array of labels: strings, finite numbers or booleans.'
        );
      } else {
        matchLabels = [is];
        this.label(is, known, named, `${path}.on.is`);
      }
    }

    const rawItems = own(entry, 'items');
    let items: readonly unknown[] = [];
    if (rawItems === undefined) {
      this.missing(`${path}.items`, 'An output has items.');
    } else if (!Array.isArray(rawItems)) {
      this.problem('invalid-field', `${path}.items`, 'items is an array.');
    } else {
      items = rawItems;
    }
    const compiled = items.map((item, index) =>
      this.item(item, `${path}.items[${index}]`, this.allAssigned, false)
    );

    if (decision === undefined || matchLabels === undefined) {
      return undefined;
    }
    return {
      kind: 'emit',
      decision,
      labels: matchLabels,
      items: compiled as CompiledExpression[],
    };
  }

  private label(
    label: RuleLabel,
    known: readonly RuleLabel[] | undefined,
    decision: unknown,
    path: string
  ): void {
    if (known !== undefined && !known.includes(label)) {
      this.problem(
        'unknown-label',
        path,
        `No case of the decision "${String(decision)}" has the label ${JSON.stringify(label)}.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Declarations and name probes (§ 3.4, finding 11, § 8 q6)
  // -------------------------------------------------------------------------

  /** The declared function and effect names, each checked and probed. */
  private declarations(): void {
    const seen = new Map<string, string>();
    const check = (name: string, path: string, kind: 'function' | 'effect'): void => {
      const earlier = seen.get(name);
      if (earlier !== undefined) {
        this.problem(
          'invalid-declaration',
          path,
          `"${name}" is declared at ${earlier} too: a name is one function or one effect.`
        );
        return;
      }
      seen.set(name, path);
      const reserved = this.reservedOf(name);
      if (reserved !== undefined) {
        this.problem(
          'invalid-declaration',
          path,
          `A ${kind} cannot be declared as "${name}": ` +
          (reserved === name
            ? `${name} is a reserved name.`
            : `its first segment is the reserved name ${reserved}.`)
        );
        return;
      }
      // One parse per name, which both reads the name as the parser does and
      // gives the probe its text.
      let node: ReturnType<typeof parse>;
      try {
        node = parse(`${name}()`, this.declarationOptions());
      } catch {
        node = undefined;
      }
      const callee = calleeOf(node);
      if (callee !== name) {
        this.problem(
          'invalid-declaration',
          path,
          `A ${kind}'s name is one identifier, as the parser reads it, and ${describe(name)} is not.`
        );
        return;
      }
      const refused = refusal(() =>
        call(compile(node), EvalState.fromContext({ [name]: () => undefined }))
      );
      if (refused !== undefined) {
        this.problem('refused-name', path, `eval-core refuses a call of "${name}": ${refused}`);
      }
    };
    this.settings.functions.forEach((name, index) =>
      check(name, `options.functions[${index}]`, 'function')
    );
    this.settings.effects.forEach((name) => check(name, `options.effects.${name}`, 'effect'));
  }

  private declarationOptions(): ParserOptions {
    return {
      ...defaultParserOptions,
      ...(this.settings.colonIdentifiers ? { colonIdentifiers: true } : {}),
    };
  }

  /** Each distinct calculation name `eval-core` will not read as `calc.<name>`. */
  private refusedCalculationNames(
    calculations: readonly unknown[],
    names: readonly (string | undefined)[]
  ): void {
    const probed = new Set<string>();
    names.forEach((name, index) => {
      if (name === undefined || probed.has(name) || !isPlainObject(calculations[index])) {
        return;
      }
      probed.add(name);
      const refused = refusal(() =>
        call(
          compile(parse(`calc.${name}`, { ...defaultParserOptions })),
          EvalState.fromContext({ calc: Object.create(null) })
        )
      );
      if (refused !== undefined) {
        this.problem(
          'refused-name',
          `calculations[${index}].name`,
          `eval-core refuses the read calc.${name}: ${refused}`
        );
      }
    });
  }

  /** The reserved name `name` is or starts with, as `eval-core` would parse it. */
  private reservedOf(name: string): string | undefined {
    if (RESERVED.has(name)) {
      return name;
    }
    if (this.settings.colonIdentifiers) {
      const first = name.split(':')[0];
      if (first !== name && RESERVED.has(first)) {
        return first;
      }
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Expressions
  // -------------------------------------------------------------------------

  /** A filter's, a calculation's or a case's expression. */
  private expression(text: unknown, site: Site): CompiledExpression | undefined {
    const program = this.parse(text, site.path);
    if (program === undefined) {
      return undefined;
    }
    return this.withinStack(site.path, () => this.checkExpression(program, text as string, site));
  }

  private checkExpression(program: ProgramNode, text: string, site: Site): CompiledExpression | undefined {
    const before = this.problems.length;
    if (site.statements) {
      const unsupported = findUnsupportedStatement(program);
      if (unsupported !== undefined) {
        this.problem(
          'unsupported-statement',
          site.path,
          unsupported.statement.type === 'LabeledStatement'
            ? labelMessage(unsupported.statement.label.name)
            : `It holds a ${unsupported.statement.type}, which eval-core does not evaluate: ` +
              `${unsupported.message}`
        );
      }
      this.walk(program, site, undefined, false);
    } else {
      const expression = extractExpression(program);
      if (expression === undefined) {
        this.notOneExpression(program, site.path, 'not-one-expression', 'Statements are off for this field.');
        this.walk(program, site, undefined, false);
      } else {
        this.statementBelow(expression, site.path);
        this.walk(expression, site, undefined, false);
      }
    }
    if (this.problems.length > before) {
      return undefined;
    }
    return { path: site.path, text, run: compile(program) };
  }

  /** An effect item: one call of a declared effect, statements on or off (§ 8 q20). */
  private item(
    text: unknown,
    path: string,
    assigned: ReadonlySet<string>,
    onError: boolean
  ): CompiledExpression | undefined {
    const site: Site = { path, item: true, onError, statements: false, assigned };
    const program = this.parse(text, path);
    if (program === undefined) {
      return undefined;
    }
    return this.withinStack(path, () => this.checkItem(program, text as string, site));
  }

  private checkItem(program: ProgramNode, text: string, site: Site): CompiledExpression | undefined {
    const path = site.path;
    const before = this.problems.length;
    const expression = extractExpression(program);
    const shape = itemShape(expression, this.effects);
    if (shape !== undefined) {
      this.problem(
        'invalid-effect-item',
        path,
        `An effect item is one call of a declared effect, such as setValue('a', 1), with ` +
        `statements on or off, and ${shape}.`
      );
      // Still read for every other problem; the effects in it are this one.
      this.walk(expression ?? program, site, undefined, true);
    } else {
      const call = expression as CallNode;
      this.statementBelow(call, path);
      this.walk(call, site, call.callee, false);
    }
    if (this.problems.length > before) {
      return undefined;
    }
    return { path, text, run: compile(program) };
  }

  /**
   * A field's checks, run past its parse, or `undefined` with a problem when
   * they run out of stack. The parser reports its own overflow as a parse
   * error, and so does this, by the same test of the message as acorn's
   * `catchStackOverflow`: a text the parser reads within the stack, a member
   * chain or a sum 2,000 long among them, can still run the checks' walks out
   * of it. Any other error is thrown, since it is this library's.
   */
  private withinStack(
    path: string,
    check: () => CompiledExpression | undefined
  ): CompiledExpression | undefined {
    try {
      return check();
    } catch (error) {
      if (!isStackOverflow(error)) {
        throw error;
      }
      this.problem(
        'parse-error',
        path,
        'It is nested too deeply to check: the call stack ran out.'
      );
      return undefined;
    }
  }

  /** The text parsed once, or `undefined` with the problem recorded. */
  private parse(text: unknown, path: string): ProgramNode | undefined {
    if (typeof text !== 'string') {
      this.problem('invalid-field', path, 'An expression field is a string.');
      return undefined;
    }
    let node: ReturnType<typeof parse>;
    try {
      node = parse(text, this.parserOptions);
    } catch (error) {
      this.problem('parse-error', path, `It does not parse: ${messageOf(error)}`);
      return undefined;
    }
    if (node === undefined || node.type !== 'Program') {
      // `extractExpressions: false` always gives a program; kept honest.
      this.problem('parse-error', path, 'It does not parse to a program.');
      return undefined;
    }
    // A blank text, or one holding only comments, parses to an empty program.
    if (node.body.length === 0) {
      this.problem('empty-expression', path, 'The expression is empty.');
      return undefined;
    }
    return node;
  }

  private notOneExpression(
    program: ProgramNode,
    path: string,
    code: RuleProblemCode,
    tail: string
  ): void {
    const first = program.body[0];
    this.problem(
      code,
      path,
      first.type === 'LabeledStatement'
        ? labelMessage(first.label.name)
        : `It is not one expression: ${program.body.length > 1 ? `${program.body.length} statements` : `a ${first.type}`}. ${tail}`
    );
  }

  /** With statements off, a statement anywhere below the expression (finding 9). */
  private statementBelow(expression: AnyNode, path: string): void {
    let first: AnyNode | undefined;
    full(expression, (node) => {
      if (/(?:Statement|Declaration)$/.test(node.type) && (first === undefined || node.start < first.start)) {
        first = node;
      }
    });
    if (first !== undefined) {
      this.problem(
        'statement-not-allowed',
        path,
        `It holds a ${first.type} inside the expression, and statements are off for this field.`
      );
    }
  }

  /**
   * One walk of the tree for the checks that read names and node types:
   * `this`, the async forms, the reserved names, the declared names and the
   * `calc.` reads.
   *
   * `fullAncestor` reports each node once, with the type it was dispatched
   * under: a binding or an assignment target reaches it as a
   * `VariablePattern`, while the node's own `type` stays `Identifier`
   * (finding 20), so the role is read from the dispatch type, not
   * `node.type`. It does not descend into a non-computed member's property
   * or a non-computed key, so `obj.calc` and `{ calc: 1 }` name no `calc`.
   *
   * @param callee the one place a declared effect may be named: an item's callee
   * @param itemReported the item's shape is already a problem, which covers
   * the effects named in it
   */
  private walk(root: AnyNode, site: Site, callee: AnyNode | undefined, itemReported: boolean): void {
    fullAncestor(root, (node, _state, ancestors, type) => {
      switch (node.type) {
        case 'ThisExpression':
          this.problem(
            'this-expression',
            site.path,
            'It reads this, which reaches the run\'s own bindings: write the name instead.'
          );
          return;
        case 'AwaitExpression':
          this.problem('async-expression', site.path, 'It holds an await, and this release runs no rule asynchronously.');
          return;
        case 'ImportExpression':
          this.problem('async-expression', site.path, 'It holds an import(…), which can only fail when it runs.');
          return;
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
        case 'FunctionDeclaration':
          if (node.async) {
            this.problem('async-expression', site.path, 'It holds an async function, and this release runs no rule asynchronously.');
          }
          return;
        case 'ForOfStatement':
          if (node.await) {
            this.problem('async-expression', site.path, 'It holds a for await, and this release runs no rule asynchronously.');
          }
          return;
        case 'Identifier':
          this.identifier(node, ancestors, type === 'VariablePattern', site, callee, itemReported);
          return;
        default:
          return;
      }
    });
  }

  private identifier(
    node: IdentifierNode,
    ancestors: readonly AnyNode[],
    pattern: boolean,
    site: Site,
    callee: AnyNode | undefined,
    itemReported: boolean
  ): void {
    const name = node.name;
    const parent = ancestors[ancestors.length - 2];
    const role: Role = pattern
      ? patternRole(ancestors)
      : parent?.type === 'UnaryExpression' && parent.operator === 'delete'
        ? 'deleted'
        : isWritten(node, ancestors, ancestors.length - 1)
          ? 'assignment target'
          : 'value';

    if (this.settings.colonIdentifiers && name.includes(':')) {
      const first = name.slice(0, name.indexOf(':'));
      if (RESERVED.has(first)) {
        const rest = name.slice(first.length + 1);
        this.problem(
          'reserved-prefix',
          site.path,
          `"${name}" is one colon-joined identifier, whose first segment is the reserved name ` +
          `${first}: a member of ${first} is written with a dot, ${first}.${rest}.`
        );
      }
      return;
    }

    switch (name) {
      case 'calc':
        this.calc(node, ancestors, role, site);
        return;
      case 'labels':
      case 'run':
        this.problem(
          'reserved-name',
          site.path,
          `${name} is a reserved name, and nothing reads it in this release; here it is ${roleText(role)}.`
        );
        return;
      case 'error':
        if (!site.onError) {
          this.problem('reserved-name', site.path, 'error is a reserved name, read only in an onError item.');
        } else if (role !== 'value') {
          this.problem('reserved-name', site.path, `error is read, never bound, assigned or deleted; here it is ${roleText(role)}.`);
        }
        return;
      case 'event':
        if (role !== 'value') {
          this.problem('reserved-name', site.path, `event is read, never bound, assigned or deleted; here it is ${roleText(role)}.`);
        }
        return;
      default:
        break;
    }

    const effect = this.effects.has(name);
    if (effect || this.functions.has(name)) {
      if (role !== 'value') {
        this.problem(
          'declared-name',
          site.path,
          `${name} is a declared ${effect ? 'effect' : 'function'}, and here it is ${roleText(role)}.`
        );
      } else if (effect && node !== callee && !itemReported) {
        this.problem(
          'effect-outside-item',
          site.path,
          `${name} is a declared effect, called only as an effect item, ${name}(…), and here it is ` +
          `named ${site.item ? 'inside an item\'s call' : 'outside one'}.`
        );
      }
    }
  }

  /**
   * `calc` has one use: the object of a non-computed member read,
   * `calc.name` or `calc?.name` (finding 12). The name read is checked
   * against the calculations assigned before this field.
   */
  private calc(node: IdentifierNode, ancestors: readonly AnyNode[], role: Role, site: Site): void {
    const parent = ancestors[ancestors.length - 2];
    const member =
      role === 'value' &&
      parent !== undefined &&
      parent.type === 'MemberExpression' &&
      parent.object === node &&
      !parent.computed &&
      parent.property.type === 'Identifier'
        ? parent
        : undefined;
    if (member === undefined) {
      const what =
        role !== 'value'
          ? roleText(role)
          : parent?.type === 'MemberExpression' && parent.object === node && parent.computed
            ? 'the object of a computed member'
            : 'read as a value';
      this.problem(
        'reserved-name',
        site.path,
        `calc is read only as calc.<name> or calc?.<name>, and here it is ${what}.`
      );
      return;
    }
    if (isWritten(member, ancestors, ancestors.length - 2)) {
      this.problem(
        'reserved-name',
        site.path,
        'calc is read only as calc.<name> or calc?.<name>, and here it is the object of a written ' +
        'member: a calculation assigns calc.<name>, and no expression does.'
      );
      return;
    }
    const name = (member.property as IdentifierNode).name;
    if (site.onError) {
      this.problem(
        'calculation-in-on-error',
        site.path,
        `An onError item reads no calc. name in this release, and this one reads calc.${name}.`
      );
    } else if (!this.allAssigned.has(name)) {
      this.problem('unknown-calculation', site.path, `calc.${name} is read, and no calculation assigns it.`);
    } else if (!site.assigned.has(name)) {
      this.problem(
        'read-before-assignment',
        site.path,
        `calc.${name} is read before any calculation assigns it.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Tree helpers. Nodes are typed through `acorn-walk`'s signatures and
// `eval-core`'s `parse`, so this package imports nothing from `acorn`.
// ---------------------------------------------------------------------------

type AnyNode = Parameters<Parameters<typeof full>[1]>[0];
type ProgramNode = Extract<NonNullable<ReturnType<typeof parse>>, { type: 'Program' }>;
type IdentifierNode = Extract<AnyNode, { type: 'Identifier' }>;
type CallNode = Extract<AnyNode, { type: 'CallExpression' }>;

/**
 * Why an item's expression is not one call of a declared effect, or
 * `undefined` when it is.
 */
const itemShape = (expression: AnyNode | undefined, effects: ReadonlySet<string>): string | undefined => {
  if (expression === undefined) {
    return 'this is not one expression';
  }
  if (expression.type !== 'CallExpression') {
    return `this is a ${expression.type}`;
  }
  if (expression.optional) {
    return 'this is an optional call';
  }
  if (expression.callee.type !== 'Identifier') {
    return 'this calls something other than a name';
  }
  if (!effects.has(expression.callee.name)) {
    return `this calls ${expression.callee.name}, which is not a declared effect`;
  }
  return undefined;
};

/**
 * Whether the node at `ancestors[index]` is written: an assignment's target,
 * an update's or a `delete`'s operand, a `for … in` or `for … of` target, or
 * an element of a destructuring pattern.
 */
const isWritten = (node: AnyNode, ancestors: readonly AnyNode[], index: number): boolean => {
  const parent = ancestors[index - 1];
  if (parent === undefined) {
    return false;
  }
  switch (parent.type) {
    // `delete calc?.x`: the chain stands between the member and the delete.
    case 'ChainExpression':
      return isWritten(parent, ancestors, index - 1);
    case 'AssignmentExpression':
      return parent.left === node;
    case 'UpdateExpression':
      return true;
    case 'UnaryExpression':
      return parent.operator === 'delete';
    case 'ForInStatement':
    case 'ForOfStatement':
      return parent.left === node;
    case 'ArrayPattern':
    case 'RestElement':
      return true;
    // `acorn-walk` visits an object pattern's property value, a computed key
    // and a rest element's argument with no visit of the `Property` or the
    // `RestElement` between, so the pattern is the parent of all three. A
    // computed key is read; the other two are written.
    case 'ObjectPattern':
      return !parent.properties.some(
        (property) => property.type === 'Property' && property.computed && property.key === node
      );
    case 'AssignmentPattern':
      return parent.left === node;
    default:
      return false;
  }
};

/** A name in a pattern is a binding, or the target of an assignment. */
const patternRole = (ancestors: readonly AnyNode[]): Role => {
  let index = ancestors.length - 1;
  let child = ancestors[index];
  for (index--; index >= 0; index--) {
    const parent = ancestors[index];
    switch (parent.type) {
      case 'ArrayPattern':
      case 'ObjectPattern':
      case 'RestElement':
        child = parent;
        continue;
      case 'AssignmentPattern':
        if (parent.left !== child) {
          return 'binding';
        }
        child = parent;
        continue;
      case 'AssignmentExpression':
        return parent.left === child ? 'assignment target' : 'binding';
      case 'ForInStatement':
      case 'ForOfStatement':
        return parent.left === child ? 'assignment target' : 'binding';
      default:
        return 'binding';
    }
  }
  return 'binding';
};

const roleText = (role: Role): string =>
  role === 'binding'
    ? 'bound'
    : role === 'assignment target'
      ? 'assigned'
      : role === 'deleted'
        ? 'deleted'
        : 'read as a value';

const labelMessage = (label: string): string =>
  `It parses as a statement labelled ${label}, which never evaluates. A colon-joined name needs ` +
  `the colonIdentifiers option, and no space around the colon.`;

/** The callee's name when `node` is a program of one call of a name with no arguments. */
const calleeOf = (node: ReturnType<typeof parse>): string | undefined => {
  if (node === undefined || node.type !== 'Program') {
    return undefined;
  }
  const expression = extractExpression(node);
  return expression?.type === 'CallExpression' &&
    !expression.optional &&
    expression.arguments.length === 0 &&
    expression.callee.type === 'Identifier'
    ? expression.callee.name
    : undefined;
};

/** `eval-core`'s message, when running `probe` throws. */
const refusal = (probe: () => unknown): string | undefined => {
  try {
    probe();
    return undefined;
  } catch (error) {
    return messageOf(error);
  }
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const own = (entry: Record<string, unknown>, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(entry, key) ? entry[key] : undefined;

const join = (path: string, key: string): string => (path === '' ? key : `${path}.${key}`);

const describe = (value: unknown): string =>
  typeof value === 'string' ? JSON.stringify(value) : `a ${value === null ? 'null' : typeof value}`;

/** A stack overflow, by the test acorn's `catchStackOverflow` applies to the message. */
const isStackOverflow = (error: unknown): boolean =>
  error instanceof Error &&
  (/\bstack\b.*\b(exceeded|overflow)\b/i.test(error.message) || /\btoo much recursion\b/i.test(error.message));

const isLabel = (value: unknown): value is RuleLabel =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

