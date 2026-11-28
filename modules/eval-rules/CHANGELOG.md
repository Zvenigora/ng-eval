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
  `freeze`, `seal` or `preventExtensions`, or handed as an argument to a function the rule did not
  create. Either throws where the write is made, and nothing is
  written there. The throw goes where any throw goes: one that leaves a field fails the run, code
  the host supplied may catch it on the way, and one from a function the run gave out, called after
  the run, reaches that caller ([E10](../../docs/backlog.md#e10)). `delete` deletes nothing, and an
  assignment to `event` is refused at compile. An assignment or update whose target is a name
  on `eval-core`'s blocklist of dangerous names is refused too, in the same way, bare (`constructor = 1`) or as a member key of a given
  object, a created one or a primitive (`o.__proto__ = 1`, `({})[["__proto__"]] = {}`,
  `s.toString = 1`); which error it throws is not promised.
  Other routes write, and the run completes: a table built-in that reaches native code other
  than as an argument of the rule's own call, as an element of an array that `reduce` walks;
  a built-in
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
  The `eval-core` peer is `>=0.16.2 <0.17.0`: 0.16.1 checks a computed key as the name it converts
  to ([A65](../../docs/backlog-retired.md#a65)), and 0.16.2 asks about a table built-in handed as
  an argument ([A64](../../docs/backlog.md#a64)), which the sentences above rely on.
  Phase 12 step 4.
- **The run's trace: `RuleTrace` and `RuleTraceEntry`.** A `RuleResult` holds a `trace` on every
  status: the rule's `id` as its `rule`, and its `entries` in the order the run reached them. An
  inactive rule's trace has no entries, and a failed run's holds the entries up to the failure,
  the entry of the field that threw included. An entry's `kind` is `'field'`, `'skipped'` or
  `'matched'`, documented as open, and its `path` names a field as `compileRule` names it, such as
  `calculations[0].value` or `decisions[0].cases[1].if`. A `'field'` entry is a field the run
  evaluated: its `value`, absent when it threw, or its `error`; its `at`, the milliseconds from the
  run's start to the field's start, by `performance.now()`; and, under the rule's `debug` only, its
  `namesRead`, what `eval-core`'s dependency tracker reports for the field's own walk, in
  first-read order, such as `customer`, `customer.address` and `customer.address.city` for
  `customer.address.city` read from the facts, and `missing` for `missing + 1` over facts that do
  not hold it, and no name the run binds, `calc`, `event`, a declared function or an effect;
  `evalTrace`, `eval-core`'s trace of the field; and `evalTraceTruncated`, whether `eval-core`
  stopped it at its first 10,000 values. A `'skipped'` entry names the `value` of a calculation
  whose `when` was falsy, after the `when`'s entry; a `'matched'` entry names the case a decision
  matched, after its `if`'s entry, or alone for a case with no `if`, and a decision that matches no
  case has none.
  Each entry and array is frozen, and a value is by reference, as an effect's arguments are. A
  trace is a value a host reads and does not build, so a later release can add an optional member
  or a kind. Phase 12 step 5.
- **The tests runner: `runRuleTest`.** `runRuleTest(rule, test, functions?)` runs a
  `RuleTest`, `{ ruleId, given, expect }`, through `evaluateRule`, with `functions` as its
  input's, and returns a frozen `RuleTestResult`: `passed`, the run's `result`, and, when the
  test did not pass, the first `difference`, `{ path, message, expected?, actual? }`. A run
  that failed fails the test; `skipped` is whether the filter skipped the run; `calc` and
  `labels` are compared at the names the test lists, and `effects` as the whole list. An array
  is compared with an array by its length and items, a non-null non-array object with another
  by its own enumerable string keys and their values, and anything else by `===`: a value's
  prototype and class are not compared, and a name it inherits is not one of its keys. It
  throws for a rule `compileRule` did not return; for a test whose `ruleId` is not the rule's
  `id`; for a test, a `given` or an `expect` that is `null`, an array or not an object, holds
  an own key it does not define, a symbol or a non-enumerable one included, or inherits a
  field; and for an `expect` whose `calc` or `labels` is not such an object, whose `effects`
  is not an array or whose `skipped` is not a boolean, an `undefined` field being absent. It
  checks nothing those fields hold, and leaves `given` to `evaluateRule`, which checks no
  input of an inactive rule. What `evaluateRule` throws, and what a value of the result throws
  as it is compared, passes through. It compares values to a depth of 100, a name of `calc` or
  an item of `effects` being at depth 1, and throws a `RangeError` where it reaches a value the
  test and the result both hold deeper than that, a cycle included. Phase 12 step 6.
- **The registry: `RuleRegistry`.** `RuleRegistry` caches compiled rules by `id`, under one set
  of compile options. `new RuleRegistry(options?)` takes a `RuleRegistryOptions`,
  `{ compile?, maxEntries? }`: `compile`, the `CompileRuleOptions` every compile uses, checked
  and copied when the registry is constructed, so a later change to that object changes nothing;
  `maxEntries`, the most rules it holds, an integer from 1, 500 by default.
  `registry.compile(text, version?)` takes a rule's JSON text and returns what
  `compileRule(JSON.parse(text), compile)` returns. It returns the stored result, the same
  object, when it holds one for the rule's `id` stored with the same `version`, or, without a
  `version`, stored without one from the same text. A `version` is the caller's promise that the
  text is the same: the text is not compared. A reuse makes the entry the most recently used.
  Any other request compiles: a result with no problems is stored, frozen, in place of the id's
  entry, and the least recently used entry is evicted past `maxEntries`; a result with problems
  is not stored, and removes the id's entry. `registry.invalidate(id)` removes the id's entry, if
  there is one. The constructor throws a `TypeError` for options that are not a plain object,
  that hold an own key other than `compile` and `maxEntries`, a symbol or a non-enumerable one
  included, or whose `maxEntries` is not an integer from 1, an `undefined` field being absent,
  and throws what `compileRule` throws for the `compile` options, with `compileRule`'s message.
  `registry.compile` throws a `TypeError` for a `text` that is not a string or a `version` that
  is given and is not one, and lets `JSON.parse`'s error through; neither changes an entry.
  `registry.invalidate` throws a `TypeError` for an `id` that is not a string. Phase 12 step 6.
