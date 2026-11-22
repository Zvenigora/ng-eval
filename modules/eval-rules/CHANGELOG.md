# Changelog — `@zvenigora/ng-eval-rules`

All notable changes to `@zvenigora/ng-eval-rules` are documented in this file. The other packages in this repository keep their own, listed in the [root changelog](../../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **The rule format and `compileRule`.** `Rule` and its parts are the format, as TypeScript types,
  and `defineRule` types a rule written in TypeScript. `compileRule(rule, options?)` checks a rule,
  parses each of its expression fields once, and returns either the compiled rule or every problem
  it found, each with a `code`, a `path` and a `message`; the README lists the codes. A `match`'s
  walk stops at the first of two bounds it meets: at its 101st problem it gives its first 100 and
  one saying there are more; past 100,000 values it gives the size problem alone. For a rule
  JSON can write, it throws for none of them, only for the caller's options: one it does not
  define, `caseInsensitive` among them, a symbol or a non-enumerable one included, one of the
  wrong type, an effect named by a symbol, and a key in an effect's declaration. The package peers
  `acorn-walk ^8.3.0`. Phase 12 step 3.
- **Evaluation: `evaluateRule` and `evaluateInit`.** `evaluateRule(rule, input)` runs a compiled
  rule against a `RuleInput` of `facts`, `event` and `functions`, the declared functions'
  implementations, and returns a `RuleResult`: a `RuleStatus`, `'inactive'`, `'skipped'`,
  `'completed'` or `'failed'`, documented as open; the calculations and the labels, frozen; the
  `RuleEffect` records, each an effect's name and its arguments by reference, recorded and not
  performed; and the `error` a failed run threw. A failed run keeps no effect. `evaluateInit`
  runs the `onInit` items under the same filter. Either throws for a rule `compileRule` did not
  return; and, for an active rule, before any field runs, for an input that is `null`, an array or
  not an object, an input with an own key it does not define, a symbol or a non-enumerable one
  included, a field the input inherits, facts that are not a plain object, whose
  prototype is `Object.prototype`, `functions` that is an array or not an object (absent or `null`
  is none), a declared function with no implementation, and an implementation with no declaration
  or that is not a function. A throw from the facts as the filter's `match` reads them is thrown too, the caller's,
  where the same throw in a field fails the run. An inactive rule runs nothing else and checks nothing else.
  The run refuses a write at two places, and promises nothing about the facts beyond them: an
  assignment or update, to a fact or to a member of an object the expression did not create; and a
  call the expression itself makes, directly or through `call`, `apply` or `bind`, of a built-in in
  `eval-core`'s table of writers into such an object: `Array`'s `copyWithin`, `fill`, `pop`,
  `push`, `reverse`, `shift`, `sort`, `splice` or `unshift`, the typed arrays' `copyWithin`,
  `fill`, `reverse`, `set` or `sort`, `Map`'s and `WeakMap`'s `set` and `delete`, `Map`'s and
  `Set`'s `clear`, `Set`'s and `WeakSet`'s `add` and `delete`, a `Date`'s setters, or, where the
  host supplies `Object`, its `assign`, `defineProperty`, `defineProperties`, `setPrototypeOf`,
  `freeze`, `seal` or `preventExtensions`. Either throws where the write is made, and nothing is
  written there. The throw goes where any throw goes: one that leaves a field fails the run, code
  the host supplied may catch it on the way, and one from a function the run gave out, called after
  the run, reaches that caller ([E10](../../docs/backlog.md#e10)). `delete` deletes nothing, and an
  assignment to `event` is refused at compile. An assignment or update whose target is a name
  on `eval-core`'s blocklist of dangerous names is refused too, in the same way, bare (`constructor = 1`) or as a member key of a given
  object, a created one or a primitive (`o.__proto__ = 1`, `({})[["__proto__"]] = {}`,
  `s.toString = 1`); which error it throws is not promised. Other routes write, and the run completes: a table
  built-in that native code calls, as `[1].forEach(list.push, list)` calls `push`; a built-in
  outside the table, such as `getOrInsert` and `getOrInsertComputed` on a `Map` or a `WeakMap`,
  `test`, `exec`, `match` and `replace`, which move or reset a global or sticky regex's
  `lastIndex`, `RegExp#compile`, a `DataView`'s setters, `ArrayBuffer#transfer`,
  `transferToFixedLength` and `resize`, and an array iterator's `next`; and a function the host
  supplies, which is the host's code, such as one among the functions, a fact's own method, or
  `Reflect`, `Atomics` or `Error.captureStackTrace`, which no expression reaches unless the host
  supplies it, among the facts, as the event, or from one of its functions. The register
  keeps the known routes ([A64](../../docs/backlog.md#a64)). A function a field gives, such as an
  arrow among the calculations, runs later against the facts alone: called after the run, its
  `calc`, `event` and declared functions name the facts' own ([E10](../../docs/backlog.md#e10)). A
  field whose value is an instance of `Promise` fails the run, the promise its error's `cause`.
  The `eval-core` peer is `>=0.16.1 <0.17.0`: 0.16.1 checks a computed key as the name it converts
  to, which the sentences above rely on ([A65](../../docs/backlog-retired.md#a65)).
  Phase 12 step 4.
