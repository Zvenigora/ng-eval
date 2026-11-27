import { EvalState, call, createDependencyTracker, type EvalContext } from '@zvenigora/ng-eval-core';
import {
  compiledRuleInternals,
  type CompiledExpression,
  type CompiledRule,
  type CompiledRuleInternals,
  type RuleLabel,
} from './compile-rule';
import { matchesPattern } from './pattern';
import { checkFacts, createRuleContext, describeShape } from './rule-context';
import type { RuleEffect, RuleInput, RuleResult, RuleStatus } from './rule-result';
import type { RuleTrace, RuleTraceEntry } from './rule-trace';

/**
 * `evaluateRule` and `evaluateInit`: the Phase 12 plan's § 3.5, each numbered
 * line of which a row of `evaluate-rule.spec.ts` holds.
 */

const INPUT_KEYS: ReadonlySet<string> = new Set(['facts', 'event', 'functions']);

/**
 * A run's own failure, as opposed to what an expression threw: a promise, a
 * strict decision, or a scope a host function popped. For a promise, its
 * `cause` is the promise, so a host can still handle a rejection: it reads
 * the result in the same turn, before the rejection is unhandled.
 */
class RuleRunError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RuleRunError';
    Object.setPrototypeOf(this, RuleRunError.prototype);
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', { value: cause, configurable: true, writable: true });
    }
  }
}

/** The input, checked: § 3.5 line 2. */
interface CheckedInput {
  readonly facts: Record<string, unknown>;
  readonly event: unknown;
  readonly functions: Readonly<Record<string, unknown>>;
}

/** The compiled form behind a handle, or a `TypeError` for any other value (N3, step 3's review). */
const internalsOf = (rule: unknown, caller: string): CompiledRuleInternals => {
  const internals =
    typeof rule === 'object' && rule !== null ? compiledRuleInternals(rule as CompiledRule) : undefined;
  if (internals === undefined) {
    throw new TypeError(`${caller} takes a rule compileRule returned: this is ${describeShape(rule)}.`);
  }
  return internals;
};

/**
 * The input's checks, before any field runs (§ 3.5 line 2): a failure is the
 * caller's error, not the rule's, so it throws. The input is an object of the
 * three keys `RuleInput` names (P-1, as `compileRule` throws for an option it
 * does not define): every own key is checked, a symbol or a non-enumerable one
 * included, and a field it inherits throws, so each is read as an own
 * property (P-1, step 4's ninth and tenth reviews, M-1); the facts are a plain
 * object (§ 8 q7); and the functions are exactly the declared ones, each a
 * function, every own key of them checked (§ 8 q6).
 */
const checkInput = (internals: CompiledRuleInternals, input: unknown, caller: string): CheckedInput => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${caller} takes an input object, { facts, event?, functions? }: this is ${describeShape(input)}.`);
  }
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !INPUT_KEYS.has(key)) {
      throw new TypeError(`${caller}'s input has no field ${String(key)}: it takes facts, event and functions.`);
    }
  }
  for (const key of INPUT_KEYS) {
    if (key in input && !Object.prototype.hasOwnProperty.call(input, key)) {
      throw new TypeError(`${caller}'s input inherits its field ${key}: give each field as an own property.`);
    }
  }
  const own = (key: string): unknown =>
    Object.prototype.hasOwnProperty.call(input, key) ? (input as Record<string, unknown>)[key] : undefined;
  const facts = checkFacts(own('facts'), caller);
  const functions = own('functions') ?? {};
  if (typeof functions !== 'object' || functions === null || Array.isArray(functions)) {
    throw new TypeError(
      `${caller}'s functions are an object of implementations by name: these are ${describeShape(functions)}.`
    );
  }
  const implementations = functions as Readonly<Record<string, unknown>>;
  // Each implementation is read once, checked and copied in that reading: a
  // host getter that answers differently later cannot change what the run
  // calls (step 4's twelfth review, a note).
  const copied: Record<string, unknown> = {};
  for (const name of internals.functions) {
    if (!Object.prototype.hasOwnProperty.call(implementations, name)) {
      throw new TypeError(`The function ${name} was declared to compileRule, and has no implementation.`);
    }
    const implementation = implementations[name];
    if (typeof implementation !== 'function') {
      throw new TypeError(`The implementation of ${name} is ${describeShape(implementation)}, not a function.`);
    }
    copied[name] = implementation;
  }
  const declared = new Set(internals.functions);
  for (const name of Reflect.ownKeys(implementations)) {
    if (typeof name !== 'string' || !declared.has(name)) {
      throw new TypeError(`The function ${String(name)} has an implementation, and was not declared to compileRule.`);
    }
  }
  return { facts, event: own('event'), functions: copied };
};

const result = (
  status: RuleStatus,
  calc: Record<string, unknown>,
  labels: Record<string, RuleLabel>,
  effects: readonly RuleEffect[],
  trace: RuleTrace,
  error?: { readonly thrown: unknown }
): RuleResult =>
  Object.freeze({
    status,
    calc: Object.freeze(calc),
    labels: Object.freeze(labels),
    effects: Object.freeze(effects),
    trace,
    ...(error === undefined ? {} : { error: error.thrown }),
  });

/** A trace of the entries given, frozen with them. */
const traceOf = (rule: string, entries: RuleTraceEntry[]): RuleTrace =>
  Object.freeze({ rule, entries: Object.freeze(entries) });

const nothing = (): Record<string, never> => Object.create(null) as Record<string, never>;

/** One run's state: the context, its pushed scope, and what the fields give. */
class Run {
  readonly calc: Record<string, unknown> = Object.create(null);
  readonly labels: Record<string, RuleLabel> = Object.create(null);
  readonly effects: RuleEffect[] = [];
  /** The trace's entries, in the order the run reached them (§ 3.6). */
  readonly entries: RuleTraceEntry[] = [];
  /** The run's start, the one clock read each entry's `at` is measured from. */
  private readonly start = performance.now();
  private readonly context: EvalContext;
  private readonly scope: Record<string, unknown>;
  private readonly depth: number;
  private readonly fieldDepth: number;

  constructor(
    private readonly internals: CompiledRuleInternals,
    input: CheckedInput
  ) {
    this.context = createRuleContext(input.facts);
    // § 3.5 line 3: one pushed scope holding `calc`, `event`, the host's
    // functions as given (§ 8 q13) and one recorder per effect. A scope pushed
    // with `push` answers before the facts, which a namespace does not
    // (finding 6). It is a plain object, not a null-prototype one: `eval-core`
    // reads a context only when it is an instance of this realm's `Object`
    // (finding 18), and a null-prototype scope read as empty. `calc` itself is
    // null-prototype: it is read by member, which any object answers.
    const scope: Record<string, unknown> = {};
    scope['calc'] = this.calc;
    scope['event'] = input.event;
    for (const name of internals.functions) {
      scope[name] = input.functions[name];
    }
    for (const name of internals.effects) {
      scope[name] = this.recorder(name);
    }
    this.scope = scope;
    this.depth = this.context.scopes.length;
    this.context.push(scope);
    this.fieldDepth = this.context.scopes.length;
  }

  /** A recorder appends `{ name, args }` and returns `undefined` (§ 8 q8, q9). */
  private recorder(name: string): (...args: unknown[]) => undefined {
    const effects = this.effects;
    return (...args: unknown[]): undefined => {
      effects.push(Object.freeze({ name, args: Object.freeze(args) }));
      return undefined;
    };
  }

  /**
   * One field: one walk on a state of its own (§ 3.5 line 4), then an unwind
   * of the scope stack to the run's depth, since a host function can strand a
   * scope (finding 22). A state per field is what makes a `calc` value
   * replaceable and not mutable (finding 16). The trace `eval-core` records
   * on every state is kept only under `debug` (finding 23). A value that is
   * an instance of `Promise` fails the run (§ 8 q14).
   *
   * Its trace entry (§ 3.6) is written in the `finally`, so a field that
   * throws has one too: one clock read for `at`, and one dependency tracker on
   * the field's state, installed before the walk, for the names it read
   * (finding 19), and removed as the walk ends, before the entry: a function the
   * field gave re-enters the walk on this state when it is called later, and
   * would otherwise keep the hook and its tracker reading. `eval-core`'s trace
   * is copied, not frozen in place, for the same reason: that later walk
   * pushes to that array.
   */
  field(expression: CompiledExpression): unknown {
    const at = performance.now() - this.start;
    const debug = this.internals.debug;
    const state = EvalState.fromContext(this.context, debug ? {} : { maxTraceItems: 0 });
    const tracker = createDependencyTracker();
    const off = tracker.install(state.hooks);
    let value: unknown;
    let outcome: { readonly value: unknown } | { readonly error: unknown } | undefined;
    try {
      value = call(expression.run, state);
      outcome = { value };
    } catch (thrown) {
      outcome = { error: thrown };
      throw thrown;
    } finally {
      off();
      while (this.context.scopes.length > this.fieldDepth) {
        this.context.pop();
      }
      this.entries.push(
        Object.freeze({
          kind: 'field' as const,
          path: expression.path,
          ...outcome,
          namesRead: Object.freeze([...tracker.dependencies]),
          at,
          ...(debug
            ? {
                evalTrace: Object.freeze(Array.from(state.result.trace)),
                evalTraceTruncated: state.result.traceTruncated,
              }
            : {}),
        })
      );
    }
    // By identity, not depth alone: a host function that pops and pushes
    // leaves the depth as it was and the rule's scope gone. `asArray` lists
    // the stack top first.
    const stack = this.context.scopes.asArray();
    if (stack.length < this.fieldDepth || stack[stack.length - this.fieldDepth] !== this.scope) {
      throw new RuleRunError(
        `The field ${expression.path} popped the rule's own scope: a host function popped below the depth it was called at.`
      );
    }
    if (value instanceof Promise) {
      throw new RuleRunError(
        `The field ${expression.path} gave a Promise: this release does not await a field's value.`,
        value
      );
    }
    return value;
  }

  /**
   * § 3.5 lines 6 to 8: the step list, in order. A `'matched'` entry's path
   * (§ 3.6) is the case's own, which `compileRule` gave it.
   */
  steps(): void {
    for (const step of this.internals.steps) {
      switch (step.kind) {
        case 'assign':
          if (step.when === undefined || this.field(step.when)) {
            this.calc[step.name] = this.field(step.value);
          } else {
            this.entries.push(Object.freeze({ kind: 'skipped' as const, path: step.value.path }));
          }
          break;
        case 'decide': {
          const matched = step.cases.find((each) => each.if === undefined || !!this.field(each.if));
          if (matched !== undefined) {
            this.entries.push(Object.freeze({ kind: 'matched' as const, path: matched.path }));
            this.labels[step.name] = matched.label;
          } else if (step.strict) {
            throw new RuleRunError(`The decision ${step.name} matched no case, and it is strict.`);
          }
          break;
        }
        case 'emit':
          if (
            Object.prototype.hasOwnProperty.call(this.labels, step.decision) &&
            step.labels.includes(this.labels[step.decision] as RuleLabel)
          ) {
            for (const item of step.items) {
              this.field(item);
            }
          }
          break;
      }
    }
  }

  /** The `onInit` items, in order. */
  init(): void {
    for (const item of this.internals.onInit) {
      this.field(item);
    }
  }

  /** Pops the run's scope, and whatever a host function left above it, to the depth the run started at. */
  close(): void {
    while (this.context.scopes.length > this.depth) {
      this.context.pop();
    }
  }
}

/**
 * Runs a rule: lines 2 to 10 of § 3.5 once `active` is checked. The filter's
 * `match` reads the facts before line 10's rule begins, so a throw from the
 * facts themselves, a getter or a `Proxy`'s trap, is the caller's and is
 * thrown, as line 2's are; from `when` on, a throw gives `'failed'`, the
 * `error`, and an empty effect list.
 */
const run = (internals: CompiledRuleInternals, input: CheckedInput, body: (run: Run) => void): RuleResult => {
  const state = new Run(internals, input);
  const trace = (): RuleTrace => traceOf(internals.id, state.entries);
  try {
    if (internals.filter.match !== undefined && !matchesPattern(internals.filter.match, input.facts)) {
      return result('skipped', state.calc, state.labels, [], trace());
    }
    try {
      if (internals.filter.when !== undefined && !state.field(internals.filter.when)) {
        return result('skipped', state.calc, state.labels, [], trace());
      }
      body(state);
    } catch (thrown) {
      return result('failed', state.calc, state.labels, [], trace(), { thrown });
    }
    return result('completed', state.calc, state.labels, state.effects, trace());
  } finally {
    state.close();
  }
};

/**
 * Evaluates a rule `compileRule` accepted, against facts, and records its
 * effects without performing them (§ 3.5).
 *
 * @param rule what `compileRule` returned as `rule`
 * @param input the facts, the event, and the declared functions' implementations
 * @returns the run's status, its calculations and labels, its effects in
 *   order, its trace, and the error a failed run threw
 * @throws TypeError for a rule `compileRule` did not return; and, for an
 *   active rule, before any field runs, for an input that is `null`, an array
 *   or not an object, an own key of the input `RuleInput` does not name, a
 *   field the input inherits, facts
 *   that are not a plain object, `functions` that is an array or not an object,
 *   a declared function with no implementation, and an implementation with no
 *   declaration or that is not a function; and whatever the facts throw as the
 *   filter's `match` reads them. An inactive rule's input is not checked.
 */
export const evaluateRule = (rule: CompiledRule, input: RuleInput): RuleResult => {
  const internals = internalsOf(rule, 'evaluateRule');
  if (!internals.active) {
    return result('inactive', nothing(), nothing(), [], traceOf(internals.id, []));
  }
  return run(internals, checkInput(internals, input, 'evaluateRule'), (state) => state.steps());
};

/**
 * Runs a rule's `onInit` items: lines 1 to 5 of § 3.5, then the items in
 * order, under line 10's rule. Its result holds no calculation and no label.
 *
 * @param rule what `compileRule` returned as `rule`
 * @param input the facts, the event, and the declared functions' implementations
 * @returns the run's status, its effects in order, its trace, and the error a
 *   failed run threw
 * @throws TypeError as {@link evaluateRule} does
 */
export const evaluateInit = (rule: CompiledRule, input: RuleInput): RuleResult => {
  const internals = internalsOf(rule, 'evaluateInit');
  if (!internals.active) {
    return result('inactive', nothing(), nothing(), [], traceOf(internals.id, []));
  }
  return run(internals, checkInput(internals, input, 'evaluateInit'), (state) => state.init());
};
