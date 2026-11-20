# @zvenigora/ng-eval-rules

Rules for [`@zvenigora/ng-eval-core`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-core#readme)
expressions: a rule compiled once and evaluated to a result.

**This package is not published.** It is at version 0.0.0 while it is built, and its first release
will be 0.1.0. Until then this file is a stub: it names what the package exports so far, and lists
the problem codes.

## Install

The package is not on npm yet. Its peer dependencies are `acorn-walk ^8.3.0` and
`@zvenigora/ng-eval-core >=0.16.0 <0.17.0`.

## What it exports

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
100 and one saying there are more; past 100,000 values it gives that problem alone, whatever it had
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

## Security

**ng-eval is not a sandbox.** An expression reaches whatever its context holds, and every function
in the context runs with the host's privileges.
[`SECURITY.md`](https://github.com/zvenigora/ng-eval/blob/master/SECURITY.md) covers the threat
model, the protections the code has, and where they stop.
