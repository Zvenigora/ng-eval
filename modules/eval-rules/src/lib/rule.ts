/**
 * The rule format, as TypeScript types: the Phase 12 plan's § 3.2, which is
 * the design's § 2.1 and § 2.9 field by field. JSON is canonical; these types
 * describe what `compileRule` accepts, and it checks every field again at run
 * time, since a rule usually arrives as text.
 *
 * Every expression field is a string of `eval-core` expression text. A label,
 * a case's `value`, is a constant: a string, a finite number or a boolean.
 */

/**
 * One rule. Only `id` is required; a missing section is an empty one.
 *
 * `name`, `description` and `meta` are carried and never read. `triggers` and
 * `onError` are checked and compiled, and nothing runs them in this release
 * (the plan's § 8 q2).
 */
export interface Rule {
  /** Any non-empty string; it need not be an identifier. */
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  /** The host's own data about the rule, any JSON value. */
  readonly meta?: unknown;
  /** `false` makes every evaluation of the rule do nothing. Default `true`. */
  readonly active?: boolean;
  /** A decision that matches no case is an error. Default `false`. */
  readonly strict?: boolean;
  /**
   * Overrides the compile option for this rule's filter, calculations and
   * decisions. An effect item is one call whatever this is.
   */
  readonly statements?: boolean;
  /** Expression-level detail in the trace. Default `false`. */
  readonly debug?: boolean;
  readonly triggers?: readonly RuleTrigger[];
  readonly filter?: RuleFilter;
  /** Effect items. */
  readonly onInit?: readonly string[];
  readonly calculations?: readonly RuleCalculation[];
  readonly decisions?: readonly RuleDecision[];
  readonly outputs?: readonly RuleOutput[];
  /** Effect items, which may read `error`. */
  readonly onError?: readonly string[];
}

/** What starts a rule: a host-defined event name, and a pattern on its payload. */
export interface RuleTrigger {
  readonly event: string;
  readonly match?: { readonly [key: string]: unknown };
}

/** Whether the rule applies: a pattern on the facts, then an expression. */
export interface RuleFilter {
  readonly match?: { readonly [key: string]: unknown };
  readonly when?: string;
}

/** A guarded assignment of `calc.<name>`. The first one creates the name. */
export interface RuleCalculation {
  /** An identifier, `[A-Za-z_$][A-Za-z0-9_$]*`. */
  readonly name: string;
  readonly when?: string;
  readonly value: string;
}

/** A flat list of cases; the first whose `if` is truthy gives the label. */
export interface RuleDecision {
  /** An identifier, `[A-Za-z_$][A-Za-z0-9_$]*`. */
  readonly name: string;
  /** Overrides the rule's `strict` for this decision. */
  readonly strict?: boolean;
  readonly cases: readonly RuleDecisionCase[];
}

/** A case. One with no `if` always matches, and must be the last. */
export interface RuleDecisionCase {
  readonly if?: string;
  /** A label: a constant, never an expression. */
  readonly value: string | number | boolean;
}

/** Effect items, evaluated in order when a decision's label is one of `is`. */
export interface RuleOutput {
  readonly on: {
    readonly decision: string;
    readonly is: string | number | boolean | readonly (string | number | boolean)[];
  };
  /** Each item is one call of a declared effect. */
  readonly items: readonly string[];
}
