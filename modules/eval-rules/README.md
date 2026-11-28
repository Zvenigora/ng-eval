# @zvenigora/ng-eval-rules

Rules for [`@zvenigora/ng-eval-core`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-core#readme)
expressions: a rule compiled once and evaluated to a result.

**This package is not published.** It is at version 0.0.0 while it is built, and its first release
will be 0.1.0.

## Install

```sh
npm install @zvenigora/ng-eval-rules @zvenigora/ng-eval-core
```

Peer dependencies: `@zvenigora/ng-eval-core >=0.16.2 <0.17.0` and `acorn-walk ^8.3.0`.
`@angular/core` is not one: this package imports nothing from it, and it is `eval-core`'s peer.

## Sibling packages

- [`@zvenigora/ng-eval-core`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-core#readme)
  — the expression evaluator a rule's expressions run on. Its README documents the expression
  syntax.
- [`@zvenigora/ng-eval-signals`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-signals#readme)
  — an expression over a context of signals as an Angular `Signal`, which recomputes exactly when a
  key the expression read has changed.
- [`@zvenigora/ng-eval-forms`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-forms#readme)
  — Angular form field properties driven by expressions that arrive as strings at runtime, for
  Reactive Forms and Signal Forms.

The sources for all four are in the [@zvenigora/ng-eval](https://github.com/zvenigora/ng-eval)
repository.

## Security

**ng-eval is not a sandbox.** An expression reaches whatever its context holds, and every function
in the context runs with the host's privileges.
[`SECURITY.md`](https://github.com/zvenigora/ng-eval/blob/master/SECURITY.md) covers the threat
model, the protections the code has, and where they stop.

**Rule text is untrusted.** A rule's expressions are `eval-core` expressions, and `SECURITY.md`
applies to them as to any; what a run is given reaches them as the facts, the event and the
functions. **The functions are the boundary**: each is the host's own code and runs with the
host's privileges, whatever arguments a rule passes it, so give a rule only the functions you
would let its author call.

## Quick start

A rule is data, whose fields hold `eval-core` expressions as strings. `compileRule` checks a rule
and compiles it once, and `evaluateRule` runs the compiled rule against facts.

```ts
import { compileRule, evaluateRule } from '@zvenigora/ng-eval-rules';

const compiled = compileRule(
  {
    id: 'order-discount',
    filter: { match: { order: { status: 'open' } }, when: 'order.total > 0' },
    calculations: [
      { name: 'discount', value: 'order.total >= 100 ? 10 : 0' },
      { name: 'net', value: 'order.total - order.total * calc.discount / 100' },
    ],
    decisions: [
      { name: 'tier', cases: [{ if: 'calc.net >= 500', value: 'gold' }, { value: 'standard' }] },
    ],
    outputs: [{ on: { decision: 'tier', is: 'gold' }, items: ['notify("vip", order.id)'] }],
  },
  { effects: { notify: {} } },
);
if (!compiled.ok) {
  throw new Error(compiled.problems.map((problem) => problem.message).join('\n'));
}

const result = evaluateRule(compiled.rule, {
  facts: { order: { id: 7, status: 'open', total: 600 } },
});
result.status;  // 'completed'
result.calc;    // { discount: 10, net: 540 }
result.labels;  // { tier: 'gold' }
result.effects; // [{ name: 'notify', args: ['vip', 7] }]

evaluateRule(compiled.rule, {
  facts: { order: { id: 8, status: 'paid', total: 600 } },
}).status; // 'skipped'
```

The first order matches the filter, so the calculations run in order, the decision takes the
label of its first case whose `if` is truthy, and the output, on that label, runs its item.
`notify` is declared to `compileRule` as an effect, so its call is recorded in `effects` and not
performed: performing it is the host's. The second order's `status` does not match the filter,
and the run is skipped.

## The rule format

A rule can be written in JSON and arrive as text, or be written in TypeScript and typed by
`defineRule`. Only `id` is required, and a section that is absent is empty. Every expression
field is a string of `eval-core` expression text, and a field the table does not list is a
problem, `unknown-field`.

| Field | Type | In a run |
| :--- | :--- | :--- |
| `id` | A non-empty string | Any text: it need not be an identifier |
| `name`, `description` | Strings | Not read |
| `meta` | Any JSON value | Not read: the host's own data about the rule |
| `active` | A boolean, default `true` | `false` makes every evaluation of the rule do nothing |
| `strict` | A boolean, default `false` | A decision that matches no case fails the run |
| `statements` | A boolean | Overrides the compile option; an effect item is one call whatever it is |
| `debug` | A boolean, default `false` | The trace's expression-level detail |
| `triggers` | `{ event, match? }[]` | Checked and compiled; nothing runs them in this release |
| `filter` | `{ match?, when? }` | `match` against the facts, and `when`; a miss of either skips the rule |
| `onInit` | Effect items | Run by `evaluateInit` |
| `calculations` | `{ name, when?, value }[]` | In order: `when`, if present, then `value`, which becomes `calc.<name>`; a falsy `when` skips its `value` |
| `decisions` | `{ name, strict?, cases: { if?, value }[] }[]` | In order: the label is the `value` of the first case whose `if` is truthy or absent; with none, the decision has no label |
| `outputs` | `{ on: { decision, is }, items }[]` | In order: when the decision's label is one of `is`, the items run |
| `onError` | Effect items, which may read `error` | Checked and compiled; nothing runs them in this release |

A calculation's and a decision's `name` is an identifier, `[A-Za-z_$][A-Za-z0-9_$]*`, and a
decision's is neither a calculation's nor another decision's. A case's `value` is a label, a
constant and not an expression: a string, a finite number or a boolean. A case with no `if`
always matches, so it is the last: a case after it is `unreachable-case`. A decision's `strict`
overrides the rule's. An output's `is` is one label or a non-empty list of labels, each the
label of a case of its decision.

An expression reads a fact by its name, a calculation's value as `calc.<name>`, the event as
`event`, and a declared function by its name; Problem codes lists what `compileRule` refuses. An
effect item is one call of a declared effect, which the run records.

A `match` is a pattern with no operators. A scalar matches a value `===` to it. An array is
any-of: it matches a value that one of its elements matches, and an array that holds such a
value. An object matches an object that is not an array and has, as its own properties, every
key the pattern names, each matching, whatever other keys it has. A `match` holds only values
JSON can write, and no `NaN` or infinity.

## Compilation — `compileRule`

`compileRule` checks a rule and compiles it, and `defineRule` types a rule written in TypeScript.
The format's types are `Rule`, `RuleTrigger`, `RuleFilter`, `RuleCalculation`, `RuleDecision`,
`RuleDecisionCase` and `RuleOutput`; `compileRule` takes a `CompileRuleOptions` and returns a
`CompileRuleResult`, which holds a `CompiledRule` or a list of `RuleProblem` values.

```ts
import { compileRule, defineRule } from '@zvenigora/ng-eval-rules';
```

## Problem codes

For a rule JSON can write, `compileRule` does not throw for the rule's problems: it returns every
problem it finds, each with a `code`, a `path` such as `decisions[0].cases[1].if`, and a `message`.
A `match`'s walk stops at the first of two bounds it meets: at its 101st problem it gives its first
100 and one saying there are more; past 100,000 values it gives the size problem alone, whatever it had
found. In a `match`'s path a
key shows as `.key` when it is an ASCII identifier of at most 64 UTF-16 code units, and otherwise
in brackets, quoted as JSON: `filter.match["Q1:1"]`. A longer key is cut to its first 64 code
units and `…` before it is quoted.
A rule built in code runs its own getters and proxy traps as `compileRule` reads it, and one may
throw. A `match` is checked and copied in one reading, so the rule compiled holds what was checked.
The list of codes is open: a later release may add one, so a host handles a code it does not know.

| Code | The problem |
| :--- | :--- |
| `invalid-field` | A field holds a value of the wrong kind; a `match` nests more than 64 arrays and objects, itself the first, or holds more than 100,000 values, counting itself and a value once on each path to it; a `match`'s walk stopped at its 101st problem, the last saying so |
| `missing-field` | A required field is absent |
| `unknown-field` | A field the format does not list |
| `invalid-name` | A calculation's or a decision's name is not an identifier |
| `duplicate-name` | A decision's name is a calculation's or another decision's |
| `invalid-declaration` | A declared function or effect has a reserved name, is declared twice, or is not one identifier |
| `refused-name` | `eval-core` refuses to read a calculation's name or to call a declared name |
| `parse-error` | An expression does not parse, or is nested too deeply to check |
| `empty-expression` | An expression is empty |
| `not-one-expression` | With statements off, a field is not one expression |
| `statement-not-allowed` | With statements off, a statement sits inside the expression |
| `unsupported-statement` | With statements on, a statement `eval-core` does not evaluate |
| `async-expression` | An `await`, an async function or an `import(…)` |
| `this-expression` | A `this` |
| `reserved-name` | A reserved name used as the format does not allow |
| `reserved-prefix` | With `colonIdentifiers`, a name whose first segment is a reserved name |
| `declared-name` | A declared function or effect bound, assigned or deleted |
| `unknown-calculation` | A `calc.` name no calculation assigns |
| `read-before-assignment` | A `calc.` name read before every calculation that assigns it |
| `calculation-in-on-error` | An `onError` item reads a `calc.` name |
| `invalid-effect-item` | An effect item is not one call of a declared effect |
| `effect-outside-item` | A declared effect named anywhere but as an item's call |
| `unknown-decision` | An output names no decision |
| `unknown-label` | An output's `is` holds a label no case of its decision has |
| `unreachable-case` | A case after a case with no `if` |

## Evaluation — `evaluateRule` and `evaluateInit`

`evaluateRule(rule, input)` runs a compiled rule against a `RuleInput` of `facts`, `event` and
`functions`, and returns a `RuleResult`: a `RuleStatus`, the calculations and labels, a
`RuleEffect` for each effect the rule called, which it records and does not perform, and the
run's trace. A run that
fails keeps no effect. `evaluateInit` runs a rule's `onInit` items the same way. For an active
rule, either throws, before any field runs, for an input that is `null`, an array or not an
object, an own key of the input that `RuleInput` does not name, a symbol or a non-enumerable one
included, a field the input inherits, facts that are not a plain object, `functions`
that is an array or not an object (absent or `null` is none), a declared function with no
implementation, and an implementation with no declaration or that is not a function, and passes
on what the facts throw as the filter's `match` reads them; either throws for a rule `compileRule`
did not return, active or not; an inactive rule runs nothing else and checks nothing else. A
function a field gives, such as an arrow among the calculations, runs later against the
facts alone: called after the run, its `calc`, `event` and declared functions name the facts' own
([E10](https://github.com/zvenigora/ng-eval/blob/master/docs/backlog.md#e10)).

## Testing — `runRuleTest`

`runRuleTest(rule, test, functions?)` runs a `RuleTest`, `{ ruleId, given, expect }`, through
`evaluateRule`, with `functions` as the input's, and returns a `RuleTestResult`: whether the test
passed, the run's `RuleResult`, and the first difference, a `RuleTestDifference`, when it did not.
It throws for a rule `compileRule` did not return; for a test of another rule; for a test, a
`given` or an `expect` that is `null`, an array or not an object, holds an own key `RuleTest` does
not define, a symbol or a non-enumerable one included, or inherits a field; and for an `expect`
whose `calc` or `labels` is not such an object, whose `effects` is not an array or whose `skipped`
is not a boolean, an `undefined` field being absent. It checks nothing those fields hold, and
leaves `given` to `evaluateRule`, which checks no input of an inactive rule. What `evaluateRule`
throws, and what a value of the result throws as it is compared, passes through. It compares
values to a depth of 100, a name of `calc` or an item of `effects` being at depth 1, and throws a
`RangeError` where it reaches a value the test and the result both hold deeper than that, a cycle
included.

## Caching — `RuleRegistry`

`RuleRegistry` caches compiled rules by `id`. `new RuleRegistry(options?)` takes a
`RuleRegistryOptions`, `{ compile?, maxEntries? }`: `compile`, the `CompileRuleOptions`
every compile uses, checked and copied when the registry is constructed, so a later change
to that object changes nothing; `maxEntries`, the most rules it holds, an integer from 1,
500 by default. `registry.compile(text, version?)` takes a rule's JSON text and returns
what `compileRule(JSON.parse(text), compile)` returns. It returns the stored result, the
same object, when it holds one for the rule's `id` stored with the same `version`, or,
without a `version`, stored without one from the same text. A `version` is the caller's
promise that the text is the same: the text is not compared. A reuse makes the entry the
most recently used. Any other request compiles: a result with no problems is stored, frozen,
in place of the id's entry, and the least recently used entry is evicted past
`maxEntries`; a result with problems is not stored, and removes the id's entry.
`registry.invalidate(id)` removes the id's entry, if there is one. The constructor throws a
`TypeError` for options that are not a plain object, that hold an own key other than
`compile` and `maxEntries`, a symbol or a non-enumerable one included, or whose
`maxEntries` is not an integer from 1, an `undefined` field being absent, and throws what
`compileRule` throws for the `compile` options, with `compileRule`'s message.
`registry.compile` throws a `TypeError` for a `text` that is not a string or a `version`
that is given and is not one, and lets `JSON.parse`'s error through; neither changes an
entry. `registry.invalidate` throws a `TypeError` for an `id` that is not a string.
