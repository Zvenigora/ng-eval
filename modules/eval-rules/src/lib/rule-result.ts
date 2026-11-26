import type { RuleDecisionCase } from './rule';
import type { RuleTrace } from './rule-trace';

/**
 * How a run ended. Open: a later release may add one, so a host handles a
 * status it does not know (§ 8 q10).
 *
 * - `'inactive'`: the rule's `active` is `false`, and nothing ran.
 * - `'skipped'`: the filter's `match` or `when` did not match.
 * - `'completed'`: the run reached its end, nothing it ran failing it: a
 *   falsy `when` skips its field's `value`, a decision stops at its first
 *   match, and an `on` that does not match runs no item.
 * - `'failed'`: a field threw or gave a `Promise`, a strict decision matched
 *   no case, or a host function popped the rule's own scope; the result holds
 *   the `error`, and no effect. For a `Promise`, the error's `cause` is it.
 */
export type RuleStatus = 'inactive' | 'skipped' | 'completed' | 'failed';

/**
 * One call of a declared effect, recorded and not performed: the effect's
 * name, and its arguments by reference (§ 8 q9), so an object among them is
 * the host's own, not a copy.
 */
export interface RuleEffect {
  readonly name: string;
  readonly args: readonly unknown[];
}

/**
 * What `evaluateRule` and `evaluateInit` take. `facts` is a plain object,
 * whose prototype is `Object.prototype` (§ 8 q7); `event`, any value, is what
 * a rule reads as `event`; `functions` holds the implementations of the
 * functions `compileRule` was told of, by name, each bound as given
 * (§ 8 q6, q13). For an active rule, any other own key throws, a symbol or a
 * non-enumerable one included, and so does a field the input inherits; an
 * inactive rule's input is not checked.
 */
export interface RuleInput {
  readonly facts: Readonly<Record<string, unknown>>;
  readonly event?: unknown;
  readonly functions?: Readonly<Record<string, (...args: never[]) => unknown>>;
}

/**
 * What a run gives: a value a host reads and does not build, so a later
 * release can add an optional field to it.
 *
 * `calc` holds each calculation's value by name, and `labels` each decision's
 * label by name, as far as the run went: an unmatched decision has none.
 * Both are frozen, with null prototypes. `effects` holds the recorded effect
 * calls in order, and is empty unless the run completed. `trace` is the
 * {@link RuleTrace} of the run, on every status: an inactive rule's has no
 * entries, and a failed run's holds the entries up to the failure. `error` is
 * what a failed run threw, and absent otherwise.
 */
export interface RuleResult {
  readonly status: RuleStatus;
  readonly calc: Readonly<Record<string, unknown>>;
  readonly labels: Readonly<Record<string, RuleDecisionCase['value']>>;
  readonly effects: readonly RuleEffect[];
  readonly trace: RuleTrace;
  readonly error?: unknown;
}
