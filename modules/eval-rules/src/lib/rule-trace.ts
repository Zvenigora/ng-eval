import type { EvalTraceItem } from '@zvenigora/ng-eval-core';

/**
 * What a run reached, in order: a value a host reads and does not build, so a
 * later release can add an optional member to it, or a kind of entry.
 *
 * `rule` is the rule's `id`. `entries` holds one entry for each thing the run
 * reached, in the order it reached them: an inactive rule's trace has none, and
 * a failed run's holds the entries up to the failure, the entry of the field
 * that threw included. The trace and its arrays are frozen.
 */
export interface RuleTrace {
  readonly rule: string;
  readonly entries: readonly RuleTraceEntry[];
}

/**
 * One entry of a {@link RuleTrace}, told apart by its `kind`. Open: a later
 * release may add a kind, so a host passes over a kind it does not know.
 *
 * `path` names a field as `compileRule` names it: `filter.when`,
 * `calculations[0].when`, `calculations[0].value`, `decisions[0].cases[1].if`,
 * `outputs[0].items[0]`, `onInit[0]`.
 *
 * - `'field'`: a field the run evaluated. `value` is what it gave, and is
 *   absent when it threw; `error` is what it threw, and is absent when it gave
 *   a value. `at` is the time from the run's start to the field's start, in
 *   milliseconds, by `performance.now()`. Under the rule's `debug`, and only
 *   then: `namesRead`, what `eval-core`'s dependency tracker reports for the
 *   field's own walk, in the order the field first read each name (for
 *   `customer.address.city` read from the facts, `customer`,
 *   `customer.address` and `customer.address.city`; for `missing + 1` over
 *   facts that do not hold `missing`, `missing`), holding no name the run
 *   binds: `calc`, `event`, a declared function or an effect; `evalTrace`,
 *   `eval-core`'s trace of the field, its items as `eval-core` recorded them;
 *   and `evalTraceTruncated`, whether `eval-core` stopped it at its bound, its
 *   first 10,000 values.
 * - `'skipped'`: a calculation whose `when` was falsy, so that its `value` did
 *   not run. `path` is that `value`'s, `calculations[0].value`, and the entry
 *   follows the `when`'s own.
 * - `'matched'`: the case a decision matched. `path` is the case's,
 *   `decisions[0].cases[1]`, and the entry follows its `if`'s, or stands alone
 *   for a case with no `if`. A decision that matches no case has no such entry.
 *
 * Each entry is frozen, and so is each array in it. A value is by reference,
 * as an effect's arguments are: an object a field gave is that object, not a
 * copy.
 */
export type RuleTraceEntry =
  | {
      readonly kind: 'field';
      readonly path: string;
      readonly value?: unknown;
      readonly error?: unknown;
      readonly namesRead?: readonly string[];
      readonly at: number;
      readonly evalTrace?: readonly EvalTraceItem[];
      readonly evalTraceTruncated?: boolean;
    }
  | {
      readonly kind: 'skipped';
      readonly path: string;
    }
  | {
      readonly kind: 'matched';
      readonly path: string;
    };
