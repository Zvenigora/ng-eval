# Phase 12 Plan — `@zvenigora/ng-eval-rules` 0.1.0, pure rule evaluation (new module)

**Status: Revision 4, ready for step 1.** No step has run. The plan and the design sessions were
committed at this revision, ahead of step 1, at the maintainer's request. Revision 3 measured
[§ 1.3](#13-mechanism-questions-measured)'s rows on the built 0.16.0 bundle, and Revision 4 added
two, with eight scripts pinned outside the repository ([SR32](../standing-rules.md#sr32),
[SR47](../standing-rules.md#sr47)). A statement here about how `eval-core` behaves is a row of
§ 1.3, or it says it is a prediction. Step 1 checks the hashes, re-runs the scripts on the bundle
its gate builds, and reads [§ 2](#2-decisions--recorded-not-reopened) against the rows. No
question is open: all twenty-three of [§ 8](#8-questions-all-decided) were decided by the
maintainer on 2026-11-12, and § 3 and § 4 are written to the decisions.

The design is [`design-session.md`](design-session.md), three sessions and questions Q1 to Q61.
This plan does not restate it: it cites a decision by its Q number and section, and adds only
what a plan needs: scope, steps, exit criteria, and what goes red.

This phase ships **one release, 0.1.0**: a rule compiled once and evaluated to a result, with no
engine, no events and no commit. The later slices of the design are Phases 13 to 16 in
[`ROADMAP.md`](../../ROADMAP.md), each with a plan of its own when it starts. What they need from
the shapes this phase publishes is [§ 3.8](#38-what-phases-13-to-16-need-from-010s-shapes).

**Revision 4** wrote the maintainer's decisions into § 2, § 3 and § 4, and measured what four of
them rest on (M13, M14; findings 25 to 28):

- **No published package of this workspace loads in plain Node as installed.** Each throws at
  import unless `@angular/compiler` was imported first; with it, all three load and evaluate. So
  0.1.0 promises an Angular build and nothing about Node (finding 25, § 8 q23).
- **An `EvalContext` given as the facts reads nothing**, when the run is built as § 3.5 builds it.
  Revision 3's § 8 q7 had it "walked without this library's write guard", unmeasured. The shape
  is refused either way (finding 26).
- **`instanceof Promise` misses a thenable and a promise of another realm** (finding 27): a
  README limit, with a contrast row.
- **The reserved-first-segment rule refuses `event:name` and `error:message`**, with the other
  three prefixes. The maintainer's earlier rule engine writes colon-joined names in every
  expression, and the maintainer has said what they are: an identifier and an index, `Q1:1` or
  `Q2:12`, never one of the five prefixes. The rule flags none of them, and each read its fact
  on the run this library builds (finding 28).

It also adds § 8's questions 17 to 23, which Revision 3 had left to later gates.

**Revision 3** ran every row of § 1.3, Revision 2's "Pre-measured" column included, and read the
parts of `eval-core` the draft leaned on and had not opened. It found seven things the draft had
wrong or had not seen, and each changed § 3 or § 4:

- **No loop is endless.** `eval-core` charges every `for` iteration against a budget of 100,000
  per evaluation, and evaluates no `while` and no `do`. `(() => { for (;;) {} })()` threw
  `Iteration budget exhausted` after 24 ms. Revision 2's finding 9, and the design's § 6 item 1,
  had an endless loop. Evaluation time is still unbounded, by another route: a regular expression
  that backtracks ([§ 1.2](#12-findings-that-shape-the-plan) finding 9).
- **`this` reaches the run's scope.** `this.calc` is the run's whole `calc` object, and
  `this.setVisible('a', true)` in a calculation records an effect. Neither names an identifier,
  so every reserved-name check of Revision 2 missed both. `compileRule` rejects `this`
  (finding 15).
- **A null-prototype facts object reads nothing**, in either case mode: every fact is `undefined`,
  with no error. `evaluateRule` refuses the shape (finding 18, § 8 q7).
- **`EvalState.declareConst` is not published API.** Its source marks it `@internal`. Revision 2
  had it as the run-time line if § 8 q6 is declined (finding 7).
- **A Publication status row for an unknown package fails `release-tags.mjs`**; Revision 2 had it
  "not checked". Step 2's probe asserts the message, since a row with no tag fails before the
  change too (finding 5).
- **An output's `is` is one label or a list** in the design's § 2.1. Revision 2's § 3.2 had one
  label.
- **The package needs `acorn-walk`.** Every compile check is a walk of a tree, and `eval-core`
  exports no walker that reports a node's parent (finding 20).

It also adds findings 15 to 24, § 8's questions 13 to 16, and § 4's table, which the `step`
skill reads a plan's state from.

**Revision 2** read the draft's statements about `eval-core` against its source and ran the ones
that shape the design, unpinned. It found that a fact named `calc` shadows an `EvalScope`
namespace (finding 6), that a pushed binding can be reassigned without reaching `set`
(finding 7), that `delete` is not refused and deletes nothing (finding 8), and that a
block-bodied arrow function is one expression (finding 9). It added findings 10 to 14, § 3.2,
§ 3.8 and § 8's questions 6 to 12.

## 0. Rules the plan adds

- **P-1. Where the design leaves a reading open, 0.1.0 ships the stricter one.** A rejection can
  be lifted in a later minor; an acceptance cannot be withdrawn without a breaking release
  ([SR12](../standing-rules.md#sr12)). Each use of this rule is marked **P-1** where it is made,
  so the retrospect can count what was later lifted. *Red*: nothing — held by review.

## 1. Current state

### 1.1 What exists today

- Three published libraries, `eval-core` 0.16.0, `eval-signals` 0.9.0 and `eval-forms` 0.9.0. No
  `modules/eval-rules`, no `scope:rules` tag, no path in `tsconfig.base.json`.
- `eval-forms`' `/signals` entry registers one expression per field property
  (`createExpressionRules`). It has no notion of a rule as a unit; this library is a layer beside
  it, and neither depends on the other.
- `eval-core` exports everything a walk outside Angular DI needs: `parse`, `extractExpression`,
  `compile`, `call`, `EvalState`, `EvalContext`, `fromContext`, `findUnsupportedStatement`,
  `createDependencyTracker`, `EvalHooks`. `eval-forms`' `evaluateRule` is the pattern: one
  `EvalState` per walk around a reused `EvalContext`, with a depth-mark unwind of the scope stack
  in a `finally`.

### 1.2 Findings that shape the plan

Findings 1 to 5 are the draft's, 6 to 14 Revision 2's, 15 to 24 Revision 3's and 25 to 28
Revision 4's. Each names the
row of [§ 1.3](#13-mechanism-questions-measured) it is read from. Finding 3 is a prediction, and
says so.

1. **A read-only context is an existing mechanism** (M2). `eval-signals`' signal context
   subclasses `EvalContext` and overrides `set`, which refuses an identifier write, and
   `checkMemberWrite`, which refuses a member write and a mutating built-in unless the walk
   created the target. This library writes the same two overrides on a subclass of its own
   ([SR29](../standing-rules.md#sr29)); it cannot import `eval-signals`' class, since its main
   entry depends on `eval-core` only. Of 72 write forms, the two overrides refused 47, in both
   case modes. What the mechanism does not do: it does not stop a registered function from
   writing, which is the host's own code; it is not asked about a pushed scope's binding
   (finding 7), about `delete` (finding 8), or about `Reflect`'s writers (finding 17); and it
   refuses more than a write to a fact (finding 16).
2. **An `await` is accepted only as the whole expression** (`eval-core` 0.15.0). 0.1.0 has no
   async runner, so `compileRule` rejects any `await`. Finding 10 says how. Phase 16 lifts that for
   a calculation's `value`.
3. **`eval-core` is an Angular library**, and its package peers `@angular/core`. The draft had
   this package peer it too. Its main entry imports nothing from `@angular/core`, and each
   project's lint runs `@nx/dependency-checks`, whose `checkObsoleteDependencies` is on by default
   and reports a declared dependency the source never imports, as `The "…" package is not used by
   "…" project`. That is a prediction: step 2 measures it. If lint reports it, the peer is
   dropped, since a consumer already has `@angular/core` as `eval-core`'s own peer.
4. **A peer range here is bounded above.** Both downstream packages declare
   `>=0.16.0 <0.17.0`, and the workspace lint reads the range against the workspace version
   ([SR42](../standing-rules.md#sr42)).
5. **`release-tags.mjs` names its packages**, read from the script and not yet run. Without an
   entry in its `PROJECT` map, a Publication status row for a fourth package fails as "is not a
   package this workspace publishes", and the package's tags are not required to be annotated.
   So a probe row with no tag fails before the map changes and after it, with two messages, and
   step 2's probe asserts the second ([SR18](../standing-rules.md#sr18)). `CONTRIBUTING.md`'s
   Releasing names the three packages in a table and in its publish commands.
6. **`calc` cannot be an `EvalScope` namespace** (M1). `EvalContext.get` resolves the original
   before the prior scopes, so with the facts `{ calc: { x: 'facts' } }` the expression `calc.x`
   read `'facts'`. A scope pushed with `EvalContext.push` resolves first: over facts named `calc`,
   `twice` and `event`, the run's three bindings answered. So the run pushes **one scope** holding
   `calc`, `event`, the host's functions and the effect recorders, and pops it in a `finally` to a
   depth mark. What a pushed scope does that a namespace does not: a read hook flags each of its
   reads `scoped`, so `createDependencyTracker` leaves them out of `dependencies` (M6). That is
   the wanted result: the trace's "facts read" then holds facts only.
7. **A pushed binding is not behind `set`** (M2). An identifier write goes to the innermost scope
   that binds the name, through `setInScope`, and reaches `set` only when no scope binds it. So
   `calc = 5`, `event = 1`, `twice = 5` and `setVisible = twice` all landed, with the overrides in
   place, and the fields after them read the new value. All four targets are identifiers, which a
   tree shows without evaluating it, so the first line is `compileRule`: an assignment to a
   reserved name is always visible to it (finding 12), and one to a function's name is visible
   when the names are declared at compile time (§ 8 q6). q6 is decided that way (§ 2), so that
   is the whole mechanism, and no run-time line is written, since no row at `evaluateRule` could
   reach one ([SR21](../standing-rules.md#sr21)). Had it been declined, the function names would
   be unknown until a run, and `EvalState.declareConst(scope, key)` is the only line found: declared on each walk's
   state for each key of the pushed scope, all four writes threw
   `Assignment to constant variable`, in both case modes. But `eval-core` marks `declareConst`
   `@internal`, "Not part of the published API", so a published package would rest on a method
   `eval-core` has not promised. A frozen scope object is not a mechanism either way: under
   `caseInsensitive`, `push` copies the object into a `Registry`, and the write lands on the
   copy.
8. **`delete` is not refused, and deletes nothing** (M2). The unary visitor evaluates the operand
   and gives `undefined` for `delete`: `delete obj.k`, `delete fact` and `delete calc.x` each left
   their target as it was. The contract is therefore "the facts are unchanged", not "the write is
   refused" ([SR44](../standing-rules.md#sr44)).
9. **One expression can hold statements, and no loop in it is endless** (M3). `extractExpression`
   separates one expression from several statements and from an empty text. It does not see inside
   an arrow function: `(() => { for (;;) {} })()` is one `CallExpression`, and
   `findUnsupportedStatement` reports nothing in it. But `eval-core` bounds what it evaluates:
   every `for` iteration is charged against 100,000 per outermost walk, shared by an arrow
   function called many times in that walk, and `while`, `do` and `return` are not evaluated at
   all. A block-bodied arrow function therefore gives the value of its last statement, and can
   return nothing early. With statements off, `compileRule` still rejects a statement below the
   root (P-1): the design has "a single expression", and the form adds only a `let` and a `for`.
   **What bounds a field, then**: the iteration budget, once per field, since a field is one
   walk; and the call stack, since `(f => f(f))(f => f(f))` threw a `RangeError`. **What does
   not**: `/^(a+)+$/.test(big)` over a 26-character fact took between 165 ms and 1,548 ms, and
   `big.match("^(a+)+$")` did the same with no regular expression literal in the text, so
   `compileRule` cannot reject the form. (An unpinned run on 31 characters took 50 s.)
   `"a".repeat(50000000)` allocated at once. The README states that evaluation time and memory
   are not bounded, and the register gets the entry.
10. **`await` under the default parser options is a parse error** (M9), `Unexpected token`, the
    message any malformed text gets ([SR18](../standing-rules.md#sr18): a message two layers share
    is a gap). And an async arrow function parses under the defaults: `(async () => await f())()`
    is one expression, whose value is a promise. So `compileRule` parses with
    `allowAwaitOutsideFunction` and rejects, by a walk of the tree and with a message of its own,
    an `AwaitExpression`, an async function, and an `import(…)`, which parses as one expression
    and can only fail at run time. `(async () => 1)()` evaluated to `1`, not to a promise, so the
    `async` keyword is the test, not the value. A promise a host function returns is not visible
    to a tree: § 8 q14.
11. **A name can be writable and unreadable** (M10). `eval-core`'s guard refuses the read
    `calc.toString`, and `calc.constructor`, `calc.valueOf`, `calc.hasOwnProperty`,
    `calc.isPrototypeOf`, `calc.__proto__`, `calc.prototype` and `calc.__defineGetter__`; its
    identifier guard refuses a function registered as `toString` or `constructor`; and its call
    sandbox refuses a call of one registered as `fetch`, `eval`, `Function`, `setTimeout` or
    `require`, by name. No list is exported. `compileRule` therefore asks `eval-core`: for each
    calculation name it evaluates `calc.<name>` once over a throwaway object, and for each declared
    function name `<name>()` over a no-op, and reports `eval-core`'s own message as the problem.
    That reuses the guard instead of copying its list ([SR29](../standing-rules.md#sr29)), and
    follows the installed `eval-core` when its list grows. Fifty read probes, parse included,
    took about 1 ms. **What the probe does not see**: the sandbox also reads a function's source
    text. A host implementation whose text holds `globalThis`, `eval (` or `.__proto__` was
    refused, as `Function call blocked for security reasons: <name>`; the source lists three more
    patterns, not run here. The no-op passes, so this surfaces as a failed run (§ 8 q13). The engine's own writes are outside the guard: `calc` and
    the result's `labels` are null-prototype objects, so a name such as `__proto__` could not set
    a prototype even if a check missed it.
12. **Not every read of `calc` is `calc.<name>`** (M5). `calc?.x` is a `ChainExpression`,
    `calc[name]` is a computed member, and `calc` alone is a value: `(c => c.x)(calc)` reads a
    variable no check of the tree can name. So the never-assigned check holds only if `calc` has
    one allowed use, the object of a non-computed member read, `calc.name` or `calc?.name`. Every
    other use of the identifier is a compile error: a computed member, a bare value, the object of
    an assigned, updated or deleted member, an assignment target, an arrow function's parameter of
    that name, and with statements on a declaration of it. Of 40 forms, the prototype of the rule
    rejected 18, and accepted `obj.calc`, `({ calc: 1 })` and `calc:x`, which do not name the
    identifier. The same rule closes finding 7 for `calc` at compile time. It does not close
    finding 15, and `calc:x` is rejected by a rule of its own (finding 28).
13. **An unknown name reads `undefined`** (M5, M6). `missing + 1` is `NaN`, with no error, and in
    the case-sensitive mode `Calc.x` is `undefined`, since `Calc` is only an unknown fact. So is
    `calc:x` under `colonIdentifiers`: one identifier, a fact nobody has. A call of an unknown
    function throws `Cannot call undefined or null function`. A mistyped fact is silent by
    `eval-core`'s design; the README states it as a limit.
14. **An effect function is a value** (M4). A nested call records the inner effect first, since a
    call's arguments are evaluated before its callee; `a(…) && b(…)` records both only when the
    recorder returns a truthy value; `setVisible.call(null, 'a')` records; and
    `[1, 2].map(setValue)` records one effect per element, each with `map`'s three arguments, the
    array among them. The design's § 1 has "one effect item per call". § 3.4 takes that literally
    (P-1), which needs the effect names at compile time ([§ 8](#8-questions-all-decided) q6). Of 18 forms
    of an item, the prototype of the rule accepted four: a plain call, the same in parentheses,
    and two whose arguments call a host function. Under `caseInsensitive` it accepted a fifth,
    `SetValue("x")`, which is the declared `setValue` there.
15. **`this` reaches the run's scope** (M12). `eval-core` reads `this.k` through
    `EvalContext.get`, whose first step is the scope stack. So `this.calc` evaluated to the run's
    whole `calc` object, `this["calc"].x` read a calculation by a computed key, and
    `this.setVisible("a", true)` recorded an effect, as did `this["setVisible"]("a", true)`. None
    names the identifier `calc` or `setVisible`, so findings 12 and 14's rules accept all four,
    in any field. `this.fact` equals `fact`, and is not reported as a fact read (finding 19).
    `this.calc = 5` and `this.fact = 2` are refused by `checkMemberWrite`; a bare `this` is
    refused by `eval-core`. `compileRule` rejects a `this` anywhere (P-1): it adds nothing a rule
    cannot write without it.
16. **A copy a built-in makes is not the walk's** (M2). `checkMemberWrite`'s
    `createdByEvaluation` is true for an array or object literal of the expression, and for a
    spread into one. It is false for what `slice`, `concat`, `map`, `filter` or `JSON.parse`
    returns. So `list.slice().sort()` was refused, and `[...list].sort()` was not. The same holds
    for a `calc` value: an array one field created is not the next field's, so a later field's
    `calc.made.push(9)` and `calc.made.slice().sort()` were both refused. That is what makes a
    `calc` value replaceable and not mutable (§ 3.5), and it is a limit the README states, with
    the two forms that work: a spread into a literal, and the copying methods, of which
    `toSorted`, `toReversed`, `with` and `toSpliced` each ran.
17. **`Reflect`'s writers are not asked about** (M2). With `Reflect` among the facts,
    `Reflect.set(obj, "k", 9)` wrote the fact, with the overrides in place, while
    `Object.assign(obj, …)`, `Object.defineProperty` and `Object.freeze` were refused. That is a
    recorded bound of `eval-core`'s policy ([C4](../backlog-retired.md#c4)): no expression reaches
    `Reflect` unless the host supplies it. A function the host supplies is the host's (§ 3.5), so
    this is a README sentence and not a row to close.
18. **Not every object is read as facts** (M1). `eval-core` reads a context that is an instance
    of this realm's `Object` ([A58](../backlog.md#a58)). A null-prototype facts object read
    `undefined` for the key it holds, in both case modes, with no error. A class instance read
    its own field and a getter of its prototype; under `caseInsensitive` the getter read
    `undefined`, since the copy into a `Registry` holds own enumerable properties only
    ([A57](../backlog.md#a57)), and it called an own getter once, before any field ran.
    `evaluateRule` therefore says which shape it takes, and refuses the rest with a message
    (§ 8 q7). Finding 26 measures the check that does it.
19. **What the dependency tracker calls a read** (M6). For `customer.address.city` it reports
    three paths: `customer`, `customer.address` and `customer.address.city`. A computed member
    reports its object only: `customer["tier"]` gave `customer`. An unknown name is reported:
    `missing + 1` gave `missing`. A function-valued member is left out, a pushed binding is left
    out (finding 6), and a read through `this` is left out. Under `caseInsensitive` a path is
    spelled as the rule wrote it, `CUSTOMER.TIER`, not as the facts hold it; `eval-signals`
    respells with a helper it does not export. One `EvalHooks` and one tracker served every field
    of a run, reset before each. § 3.6 publishes the set under a name that claims no more than
    this.
20. **The compile checks need a walker `eval-core` does not export.** Findings 9, 10, 12, 14 and
    15 each read a tree. `eval-core` exports `extract`, which finds nodes of one type, and
    `findUnsupportedStatement`; neither reports a node's parent, which finding 12's rule needs.
    `eval-forms` peers `acorn-walk ^8.3.0` for the same purpose, and types a tree as
    `ReturnType<typeof parse>` so as not to import `acorn`. This package does both. Two facts
    about `acorn-walk`'s `ancestor` that the prototype met: it does not descend into a
    non-computed member's property or a non-computed property's key, which is why `obj.calc` is
    not a use of `calc`; and it reports a binding under the type `VariablePattern` while the
    node's own `type` stays `Identifier`, so the two visitors differ by which was called, not by
    `node.type`.
21. **`caseInsensitive` has to be passed three times** (M8): to the context, for a fact read by a
    case variant; to `push`, for `CALC.x`; and to each field's state, for `calc.X` and
    `obj.INNER`. Each alone answered only its own rows. Building the context then copies the
    facts: 2.1 µs over 10 facts and 60.6 µs over 1,000, per run, against at most 0.1 µs without
    the option. Those are single runs, figures for § 8 q3 and not timings under
    [SR28](../standing-rules.md#sr28).
22. **`eval-core` pops its own scopes; the unwind is for the host** (M7). After each of seven
    fields that threw, in an arrow function, a nested one, a `let` and a `for` among them, the
    scope stack was at its starting depth with no unwind by the caller. What strands a scope is a host
    function: a bare call's `this` is a view of the context that forwards `push` and `pop`, and a
    host function that called `this.push({ a: 'stranded' })` left the depth at 2, so the next
    field read `a` from the stranded scope. The depth-mark unwind after each field removes it,
    and that row is its witness.
23. **`eval-core` records its own trace on every state**, up to 10,000 values, whether or not
    anything reads it: that is its README's statement, and no row here measures it. A state per
    field makes that per field. This library reads it only under `debug` (§ 3.6), so it sets
    `maxTraceItems: 0` on a field's state otherwise; whether that saves anything is step 5's arm. The other options a caller could want forwarded,
    `maxIterations` among them, are § 8 q15.
24. **Counting parses has a mechanism already** (M11). `eval-forms`'
    `rules.invocation-count.spec.ts` counts calls of `eval-core`'s `parse` and `compile` with a
    delegating `jest.mock` of the barrel. It notes the two constraints: the counter object is
    declared before the mocks under a name starting `mock`, and `jest.mock` hoists to file scope,
    so the counting rows need a spec file of their own.
25. **No published package of this workspace loads in plain Node as installed** (M14). With the
    three packages installed from the registry, an import of `@zvenigora/ng-eval-core` threw
    `The injectable 'ParserService' needs to be compiled using the JIT compiler, but
    '@angular/compiler' is not available`, and so did the two packages that import it;
    `@angular/forms` threw the same for its own `PlatformLocation`. The bundles are partially
    compiled, for an Angular build to finish. With `@angular/compiler` imported first, every entry
    point loaded: the injector-free functions this library is planned on evaluated an expression,
    a `let` with a `for`, and a colon-joined name; `EvalService`, `createEvalSignal`,
    `bindFieldProperties` and `createExpressionRules` ran over an environment injector built with
    no platform, which needs a token that is not public API. Two timers of the injector's services
    kept the process alive until `injector.destroy()`; the injector-free rows left none. No README
    of the three promises Node. So this package's README says an Angular build is required, and
    promises nothing about Node (§ 8 q23); what a Node host needs is a register entry.
26. **The facts check, measured** (M13). `Object.getPrototypeOf(facts) === Object.prototype`, on a
    non-null object, admitted six of 19 shapes: a literal, what `JSON.parse` and `structuredClone`
    return, a frozen object, a `Proxy` over a plain object, and an object with an own getter. It
    refused the rest. Of those, `eval-core` reads nothing from a null-prototype object, an object
    of another realm, an array, a `Map`, a `Date` or a function, so the refusal loses nothing; and
    it reads a class instance, a `Registry` and `Object.create({ a: 1 })`, which is what the
    refusal costs today and a later minor can admit. An `EvalContext` passed as the facts read
    `undefined`, since this library wraps the facts in a context of its own.
27. **`instanceof Promise` is not "is a promise"** (M13). It is true for a promise, an async
    function's result and a subclass, and false for a thenable, for a function with a `then`, and
    for a promise of another realm. § 8 q14's rule therefore fails a run for the first three and
    lets the others through as values. The README states the rule by the test it runs
    ([SR45](../standing-rules.md#sr45)), and step 4 pins a thenable with a contrast row
    ([SR44](../standing-rules.md#sr44)).
28. **The reserved first segment, measured** (M13). Over 29 texts under `colonIdentifiers`, the
    rule of § 8 q16 flagged 16 identifiers, a binding, an assignment target, a call and a template
    literal's among them, and none of `order:calc`, `order:calc:x`, `Calc:x`, `calcs:x` or
    `obj.calc:x`. Two texts never reach it: `({ calc:x })` and `flag ? calc:x : 2` are parse
    errors of `eval-core`'s, each with a message that says what to write. With the option off,
    `calc:discount` parses, as a labelled statement, so it is "not one expression" and not a parse
    error. **What the rule costs**: `event:name`, `error:message`, `run:x` and `labels:x` are
    refused with `calc:x`, so a host whose facts are named under one of the five prefixes cannot
    write them (§ 7). **The first host's names are not among them.** The maintainer's earlier
    engine names a fact by an identifier and an index, `Q1:1` or `Q2:12`, the form Phase 9 was
    built for, and no expression of it holds `calc:`, `labels:`, `run:`, `error:` or `event:`.
    Eight texts in that form were flagged nowhere, and each gave its value over facts keyed
    `Q1:1`, `Q2:12`, `VP14:0` and `Q1:01`, beside `calc.x` and a host function. Two things such a
    rule meets are `eval-core`'s, documented in its README, and are not this library's to change:
    in a conditional's consequent a colon-joined name needs parentheses, `flag ? (Q1:1) : Q2:12`;
    and a segment is text, so `Q1:01` and `Q1:1` are two facts.

### 1.3 Mechanism questions, measured

Each row is answered by a script under `D:\repo.2026\ng-eval-base\eval-rules-prototype\`, run
against the `eval-core` 0.16.0 bundle in the repository's `dist/`, built 2026-11-08, SHA-256
`71936AEB…7F051264`, on Node 26.4.0. Which tree built that bundle was not checked, which is why
step 1 runs the scripts again. Each script runs both case modes, with a mode check: a key read by
a case variant ([SR19](../standing-rules.md#sr19)). The bundle is partially compiled, so a script loads
`@angular/compiler` before it, by a path into the repository's `node_modules`: a bare specifier
resolves against the script's own folder. The folder's `SHA256SUMS.txt` has 21 lines. M14 is the
exception to the bundle: it runs on the three packages as the npm registry serves them,
installed under `node-consumer/` by a pinned `package-lock.json`, with `@angular/core`,
`@angular/forms` and `@angular/compiler` 22.2.6.

| Script | SHA-256 | Result | SHA-256 |
| :--- | :--- | :--- | :--- |
| `scripts/lib.mjs` | `614C50E6…5B6CD18F` | — | — |
| `scripts/m1-binding.mjs` | `99242766…676D58A0` | `results/m1-binding.txt` | `995D8B5B…8694B8F7` |
| `scripts/m2-writes.mjs` | `E9378B92…A1B938DD` | `results/m2-writes.txt` | `5EE492E1…EF228051` |
| `scripts/m3-statements.mjs` | `5486F82D…58161F3E` | `results/m3-statements.txt` | `32B1FF3B…AA7038F6` |
| `scripts/m4-recorders.mjs` | `4E0C1494…672153AA` | `results/m4-recorders.txt` | `A33E54B0…8416F8E5` |
| `scripts/m6-deps.mjs` | `3DD117DE…B95BBC3C` | `results/m6-deps.txt` | `C7E5913A…FB8346AB` |
| `scripts/m9-await-names-this.mjs` | `D4DF2167…A99DB7C5` | `results/m9-await-names-this.txt` | `E560F5BB…48339A8E` |
| `scripts/m13-shape-and-colon.mjs` | `0BA89810…88ED93EE` | `results/m13-shape-and-colon.txt` | `B8E8C068…68E18BC6` |
| `node-consumer/node-load.mjs`, arm `none` | `36166AEC…BDE38ACF` | `results/node-load-none.txt` | `6FC4773E…9DD801F0` |
| `node-consumer/node-load.mjs`, arm `compiler` | the same | `results/node-load-compiler.txt` | `9A6AAC43…60D921A5` |
| `node-consumer/package-lock.json` | `2CDF2D5A…C085C2C8` | — | — |

`lib.mjs` is a prototype of § 3.5's run: a subclass of `EvalContext` with the two overrides, the
facts as its original, one pushed scope, and one state per field with the depth-mark unwind. A
script that prints a time ran once in one process. Such a figure answers a design question; it
is not a timing under [SR28](../standing-rules.md#sr28), and none is published.

| # | Question | Answer | Script |
| :--- | :--- | :--- | :--- |
| M1 | How is `calc.x` bound so that a fact cannot shadow it, with an unassigned name reading `undefined`? | A namespace scope is shadowed by a fact named `calc`. A pushed scope is not, and `calc.missing` is `undefined`. A value the library writes into `calc` between two fields is read by the second. Under `caseInsensitive` the pushed scope is a `Registry` copy holding the same null-prototype `calc`. Findings 6 and 18 | `m1-binding` |
| M2 | Which writes are refused, and what do the others do? | Of 72 forms, in each mode: 47 refused by the two overrides; 5 by `eval-core` itself, four destructuring assignments and `Array.prototype.push.call`; 20 not refused. Of the 20: three `delete`s change nothing; five land on a binding of the run's scope; `Reflect.set` writes a fact; seven write a value the walk created or an arrow function's own parameter; four are copying methods, which write nothing. In the three refused rows whose right side is a call, the call ran before the refusal ([SR46](../standing-rules.md#sr46)). Findings 1, 7, 8, 16 and 17 | `m2-writes` |
| M3 | Can a field be told apart as one expression, is that enough with statements off, and what bounds a field? | `extractExpression` gives the expression for `a + 1` and nothing for `a; b`, `let x = 1; x`, an empty text and `{ a: 1 }`. A block-bodied arrow function is one expression, and a walk of its tree finds the `BlockStatement`. The iteration budget, the call stack, and the two forms neither bounds: finding 9 | `m3-statements` |
| M4 | In what order do calls record, and what else can an expression do with a recorder? | Finding 14. With a recorder that returns `undefined`, `a(…) && b(…)` records `a` only | `m4-recorders` |
| M5 | Which forms read `calc`? | Finding 12, 40 forms. `CALC.x` and `Calc.x` read the run's value under `caseInsensitive` and an unknown fact without it | `m4-recorders` |
| M6 | Does `createDependencyTracker` report the facts one field read, and only those? | `order:total > 100 && customer.tier == "gold" && calc.x > 1 && twice(fact)` gave `order:total`, `customer`, `customer.tier`, `fact`: no `calc`, no `twice`. What else it reports and leaves out: finding 19. With no hooks on the state, nothing is collected and the value is the same | `m6-deps` |
| M7 | Does the scope stack return to its starting depth after a field that throws? | Yes, by `eval-core`'s own `finally` blocks, in seven throwing forms. A host function's `this.push` is what strands a scope: finding 22 | `m6-deps`, `m9-await-names-this` |
| M8 | Do `colonIdentifiers` and `caseInsensitive` reach the parse, the walk and the pushed scope as this library passes them? | `order:total + 1` is not one expression without `colonIdentifiers`, and a `BinaryExpression` over one identifier with it. `caseInsensitive`, leg by leg, and what the copy costs: finding 21 | `m6-deps` |
| M9 | What does an `await` do at compile time? | Finding 10. With `allowAwaitOutsideFunction`, `for await` parses and `findUnsupportedStatement` names its `ForOfStatement`; a fact named `await` no longer parses | `m9-await-names-this` |
| M10 | Which names can a rule or a host not use? | Finding 11. A function bound as `calc`, `event`, `labels`, `run` or `error` is callable, so a declaration under a reserved name has to be a compile error of this library's own. `FETCH()` calls a function bound as `FETCH`: the sandbox reads the name as written | `m9-await-names-this` |
| M11 | Can a spec count calls of `eval-core`'s `parse`? | Yes, by a mechanism the repository has: finding 24. No script | — |
| M12 | What does `this` reach? | Finding 15. A read of `this.original`, `this.scopes` or `this.push` is `undefined`, so an expression reaches the scope's bindings and the facts through `this`, and nothing else of the context | `m9-await-names-this` |
| M13 | Which facts does § 8 q7's check admit, what does `instanceof Promise` call a promise, and which texts does § 8 q16's rule flag? | Findings 26, 27 and 28: six of 19 shapes admitted; three of seven values; 16 identifiers over 29 texts, and none over eight in the maintainer's `Q1:1` form, each of which gave its fact's value. Case-sensitive only, since 0.1.0 has no other mode | `m13-shape-and-colon` |
| M14 | Do the three published packages load and evaluate in plain Node? | Finding 25. Arm `none`: the five entry points of the three packages, and `@angular/forms`, threw at import. Arm `compiler`: all loaded, and every row gave its value | `node-load`, two arms |

What step 1 still owes: the hashes checked with `sha256sum -c`; and each script run again on the
bundle the step's gate builds, with any row that differs written here as a plan correction
([SR4](../standing-rules.md#sr4)). M14 is not re-run on that bundle: its claim is about the
packages a consumer installs. No script measures finding 3 or finding 5, which are step 2's.

## 2. Decisions — recorded, not reopened

From the design sessions, by question. The "Default" rows of the questionnaire were agreed in
blocks; § 8 q4 lists the ones this phase depends on, and its decision confirms them.

| Decision | Q |
| :--- | :--- |
| A rule is a fixed pipeline: `calculations → decisions → outputs`, with `filter`, `triggers`, `onInit`, `onError` | Q1, Q21, Q30, Q47, Q59 |
| Calculations are guarded assignments in order; the first creates the variable; read as `calc.name` | Q7, Q33, Q34 |
| Decisions are flat, first match wins, values are constant labels; `strict` per rule and per decision | Q8, Q26, Q28 |
| Outputs match one decision's labels and hold effect items, evaluated in array order | Q32 |
| Effects are recorded, never performed, by evaluation; the context is read-only outside `calc.` | Q43, Q47 |
| Every expression field is a plain expression; statements by a compile option, off by default | Q35, Q60 |
| A filter is `{ match?, when? }`; a pattern is a subset match with arrays as any-of | Q36, and the unnumbered filter row |
| Labels are read by nothing inside a rule | Q10, Q51 |
| `compileRule` returns every problem at once, each with a path; evaluation never parses | Q11 |
| JSON is canonical; `defineRule` is a typed helper | Q4 |
| Tests are stored beside the rule and never commit | Q18 |
| The cache is keyed by id, reused for the same text or version, bounded at 500 | Q55 |
| Plain functions, no Angular DI; `modules/eval-rules`; from 0.1.0 | Q39 |

Q60 set an endless loop under `statements: true` aside, "not guarded for now". Finding 9 answers
it without a decision: `eval-core` guards it.

From this plan's § 8, decided by the maintainer on 2026-11-12. Each is as its question
recommended, except q2: its question argued for leaving both fields out, and the decision keeps
them. q1, q4 and q5 had no recommendation to follow; each confirms what the plan already did.

| Decision | § 8 |
| :--- | :--- |
| One phase per release: Phases 13 to 16, each with a plan of its own when it starts | q1 |
| `triggers` and `onError` are in the 0.1.0 format, validated and parsed, and run by nothing until Phase 13. So 0.1.0 publishes `onError`'s compile rules, and § 3.4 keeps them strict | q2 |
| No `caseInsensitive` in 0.1.0. Every name is compared as written, and the option is a register entry | q3 |
| The Default rows this phase depends on stand: Q18, Q19, Q20 as revised by Q55, Q26, Q39, Q43, Q47 and Q48 | q4 |
| Q48's step list is internal. 0.1.0 builds no step-kind registry and keeps the compiled form free of the section names | q5 |
| `CompileRuleOptions` declares the names, `functions: string[]` and `effects: Record<string, {}>`. `evaluateRule` takes the implementations, and throws for a declared function that is missing and for one given with no declaration. The recorders are this library's | q6 |
| A filter's `match` is matched against the facts, and there is no `context` input. `facts` is an object whose prototype is `Object.prototype`; any other is refused with a message | q7 |
| A recorder returns `undefined` | q8 |
| A recorded argument is the value the expression produced, by reference | q9 |
| `RuleStatus` is documented as an open union. A timeout folds into `'failed'` unless Phase 16 finds a reason not to | q10 |
| A rule's `id` is any non-empty string. A decision's `name` is an identifier | q11 |
| A host function is bound as the host gave it, with no closure of this library's around it. `eval-core`'s refusal of a call by the function's source text stands, and the README states it as a limit with the message a host sees | q13 |
| A field whose value is an instance of `Promise` fails the run, with a message that names the field. An effect's argument may be one | q14 |
| A caller sets `colonIdentifiers` and no other `eval-core` option. A field runs under the default iteration budget | q15 |
| Under `colonIdentifiers`, an identifier whose first colon-joined segment is a reserved name is a compile error | q16 |

Decided the same day, after the table above. Two rest on a reading of the maintainer's words,
and say so; step 1's gate confirms both.

| Decision | § 8 |
| :--- | :--- |
| `colonIdentifiers` is an option, off by default, as in `eval-core` and both siblings. The maintainer's earlier rule engine writes colon-joined names in every expression, so its host turns the option on | q12 |
| `compileRule` does not throw for a rule with problems: it returns a value that holds every problem | q17 |
| A `RuleProblem` carries a stable `code` beside its `path` and `message` | q18 |
| A rule may carry `description`, a string, and `meta`, any JSON value; both are ignored. Every other unknown field stays a problem | q19 |
| `statements` applies to the expressions of a filter, a calculation and a decision. An effect item is one call of a declared effect in both settings: an effect is the rule's handler for an output | q20 |
| `compileRule` throws for an option it does not define, `caseInsensitive` among them. `caseInsensitive` is to be supported in a later minor, which is additive | q21, with q3 |
| A test is stored apart from its rule and holds the inputs and the expectations, and no function. `runRuleTest` takes the host's implementations as an argument of its own. The second sentence is this plan's reading of "rule tests are separated to test the rules providing the expectations" | q22 |
| 0.1.0 requires an Angular build and promises nothing about plain Node. The maintainer's rule was "if the other libraries work in Node, promise it; otherwise no". They do not as installed, and do with one import no README of theirs documents (finding 25); this plan reads that as "otherwise" (P-1) | q23 |

## 3. Design of 0.1.0

A paragraph that cites a question of § 8 cites a decision, recorded in § 2.

### 3.1 In scope

- The rule format, as TypeScript types and as JSON: [§ 3.2](#32-the-formats-fields).
- `compileRule(rule, options?)`: validation and one parse per field. It returns the compiled rule
  or every problem, and does not throw for a rule (§ 8 q17).
- `evaluateRule(compiled, input)`: filter, calculations, decisions, outputs. Returns a result.
- `evaluateInit(compiled, input)`: the `onInit` items. Returns a result.
- The result: `calc`, `labels`, `effects`, `status`, `error`, `trace`.
- `runRuleTest(compiled, test, functions?)` (§ 8 q22), and `RuleRegistry`.
- `defineRule`.

### 3.2 The format's fields

`compileRule` rejects an unknown field, so this table is the published format. It is the design's
[§ 2.1](design-session.md#21-a-rule) and [§ 2.9](design-session.md#29-one-rule-in-the-format-proposal),
field by field. "Compiled only" is validated, parsed, and run by nothing in 0.1.0 (§ 8 q2).

| Field | Type | In 0.1.0 |
| :--- | :--- | :--- |
| `id` | A non-empty string | Required. Any text: it need not be an identifier (§ 8 q11) |
| `name` | A string | Carried, not read |
| `description` | A string | Carried, not read (§ 8 q19) |
| `meta` | Any JSON value | Carried, not read: the host's own data about the rule (§ 8 q19) |
| `active` | A boolean, default `true` | Run |
| `strict` | A boolean, default `false` | Run |
| `statements` | A boolean, overriding the compile option | Run, for the expressions of a filter, a calculation and a decision; never for an effect item (§ 8 q20) |
| `debug` | A boolean, default `false` | Run: the trace's expression-level detail |
| `triggers` | `{ event, match? }[]` | Compiled only |
| `filter` | `{ match?, when? }` | Run |
| `onInit` | Effect items | Run by `evaluateInit` |
| `calculations` | `{ name, when?, value }[]` | Run |
| `decisions` | `{ name, strict?, cases: { if?, value }[] }[]` | Run |
| `outputs` | `{ on: { decision, is }, items }[]` | Run |
| `onError` | Effect items | Compiled only |

Not in the format: the design's `log` flag, which has no logger to address until Phase 13 and is
added with it (P-1), and a `version`, which the caller gives the registry beside the rule.

A calculation's and a decision's `name` is an identifier, `[A-Za-z_$][A-Za-z0-9_$]*`, with no
colon, so that `calc.<name>` parses under either parser. A case's `value` is a label: a string, a
number or a boolean. An output's `is` is one label or a non-empty array of labels, and matches
when the decision's label is `===` to one of them.

### 3.3 Out of scope, and where it goes

| Not in 0.1.0 | Goes to |
| :--- | :--- |
| The engine: rule sets, `emit`, the queue, the loop guard, the sink, batch commit, `init()`, `load()`, conflict keys, the `onError` callback, the logger | Phase 13 |
| Acting on `triggers` and `onError` | Phase 13 |
| `sequence`, `branch`, the `kind` registry, `run` exports, reading `labels.<ruleId>.<decision>`, async commit | Phase 14 |
| The `/signals` entry point | Phase 15 |
| `await` in a calculation; the async runner | Phase 16 |
| The `onStep` debugger | The first phase that needs it |
| A converter from an earlier format; `parallel`, `fanOut`; a rule as a `computed`; timer and route sources; a bound on evaluation time and memory (finding 9); `caseInsensitive`, which the maintainer wants in a later minor (§ 8 q3, q21); facts that are a class instance or a `Registry` (§ 8 q7); `maxIterations` as an option (§ 8 q15); running outside an Angular build (§ 8 q23) | The register ([SR5](../standing-rules.md#sr5)) |

### 3.4 What `compileRule` rejects

Each is a `RuleProblem`: a `code`, stable from 0.1.0 and documented as an open list, so that a
host tells problems apart without matching text (§ 8 q18); a path such as
`decisions[0].cases[1].if`; and a message. All are returned together, in a value: `compileRule`
gives the compiled rule or the problems, and throws for neither (§ 8 q17). Every rejection here
runs before any evaluation, so none of them stands in a write's path
([SR46](../standing-rules.md#sr46)); the run-time refusals are § 3.5's.

**What `compileRule` throws for** is the caller's own code, not the rule: an option it does not
define (§ 8 q21). The message names the option, and for `caseInsensitive` says that this release
compares every name as written. A sibling library's caller who passes the option out of habit
would otherwise have it ignored, and a rule that reads `Order.Total` over `order.total` would
give `undefined` with no error.

- A structural error: a missing `id`, a section that is not an array, a field § 3.2 does not list,
  a `description` that is not a string, a name that is not an identifier.
- An expression that does not parse, and an empty one.
- With statements off, a field that is not one expression, and a statement anywhere below it
  (finding 9, P-1).
- An `await`, an async function and an `import(…)`, anywhere (finding 10).
- **A `this`, anywhere** (finding 15, P-1).
- **The reserved names**, each compared as written, since 0.1.0 has no `caseInsensitive`
  (§ 8 q3):
  - `calc`, in any position but the object of a non-computed member read (finding 12);
  - `labels` and `run`, in any position: nothing reads either until Phase 14 (P-1);
  - `error`, outside an `onError` item;
  - `event`, as a binding or an assignment target;
  - under `colonIdentifiers`, any of the five as the first segment of a colon-joined identifier,
    in any position: `calc:discount` is one identifier, an unknown fact, where `calc.discount`
    was meant (finding 13, § 8 q16, P-1). The parser gives the joined text as the identifier's
    name (M8), so the check reads the text before the first colon.
- A read of `calc.<name>` that no calculation assigns, or one in a field that comes before every
  assignment of that name. The order is `filter`, `onInit`, `calculations`, `decisions`,
  `outputs`, so a filter and an `onInit` item read no `calc.` name at all. In an `onError` item a
  `calc.` read is rejected too (P-1): which calculations had run when a rule failed is Phase 13's
  to decide.
- A calculation name, or a declared function name, that `eval-core` refuses (finding 11), with
  `eval-core`'s message.
- **A declaration this library cannot bind** (§ 8 q6): a function or an effect declared under a
  reserved name; a name declared as both; a name the parser does not read as one identifier.
- A calculation and a decision with the same name; two decisions with the same name.
- An output whose `on.decision` names no decision, or whose `is` holds a label no case of that
  decision has.
- A decision case after a case with no `if`.
- **An effect item that is not one call of a declared effect function**, with statements on or
  off (§ 8 q20), and a declared effect function anywhere else: in a calculation, a decision, a
  filter, an argument, or as a value (finding 14, P-1, § 8 q6). A declared function's or effect's name as a binding or an assignment
  target (finding 7).

### 3.5 The evaluation, in order

For one `evaluateRule(compiled, { facts, event?, functions? })`:

1. `active: false` gives `status: 'inactive'`, and nothing else runs.
2. The input is checked, and a failure here throws, since it is the caller's error and not the
   rule's: facts of a shape this release does not read (finding 18, § 8 q7); a declared function
   with no implementation, and an implementation with no declaration (§ 8 q6).
3. One context is built for the run: this library's subclass of `EvalContext` over the facts,
   whose `set` and `checkMemberWrite` refuse, and **one pushed scope** holding `calc`, a fresh
   null-prototype object; `event`; the declared functions, each bound as the host gave it
   (§ 8 q13); and one recorder per declared effect. It is popped in a `finally`, to the depth the
   run started at.
4. Each field below is one walk on a state of its own, followed by an unwind of the scope stack to
   the run's depth (finding 22). A state per field is what makes a `calc` value replaceable and
   not mutable (finding 16), and what gives each field its own iteration budget (finding 9). No
   state declares a binding `const`: with the names declared at compile time (§ 8 q6), § 3.4
   rejects every write to one before a run exists (finding 7).
5. The filter: `match` against the facts (§ 8 q7), then `when`. A miss gives
   `status: 'skipped'`.
6. Each calculation in order: `when` if present, then `value`; this library, not the expression,
   writes `calc[name]`.
7. Each decision in order: its cases in order, first truthy `if` wins; a case with no `if` always
   matches. No match leaves the label unset, or throws under `strict`.
8. Each output in order whose `on` matches: its items in order, each one call, which appends
   `{ name, args }` to the effect list.
9. `status: 'completed'`.
10. A throw anywhere from step 5's `when` on gives `status: 'failed'`, the `error`, the trace so
    far, and an **empty** effect list. So does a field whose value is an instance of `Promise`
    (§ 8 q14). A thenable that is not one, and a promise of another realm, is a value like any
    other (finding 27).

`evaluateInit` runs steps 1 to 5 and the `onInit` items, with step 10's rule.

**What the run keeps on every path** ([SR44](../standing-rules.md#sr44)): the caller's facts
object, and every object reachable from it, is not written by an expression of the rule, unless
through a function the host supplied, among the facts or among the functions (finding 17). What
it does not promise: that a write is refused (`delete` is not, finding 8); that a refused write's
right side did not run (it did, M2); and a recorded argument is the value the expression
produced, so an object among the arguments is the host's own object, not a copy (§ 8 q9).

A recorder returns `undefined` (§ 8 q8). Under § 3.4's item rule nothing reads its return value.

What reaches `eval-core` from the caller is `colonIdentifiers`, to the parse, and nothing else
(§ 8 q15): a field runs under `eval-core`'s default iteration budget. `colonIdentifiers` is off
unless the caller sets it, as in `eval-core` and both siblings (§ 8 q12). It is a compile option,
so a compiled rule carries it and `evaluateRule` takes none.

### 3.6 The trace

A tree: the rule, then one entry per field evaluated, in order, each with its path, its value or
error, and the names it read. A skipped calculation records "when was false". A decision records
which case matched. With `debug` on the rule, an entry also carries `eval-core`'s own trace for
that field, and whether `eval-core` truncated it at its bound (finding 23). Timings come from one
clock read per field.

"The names it read" is `createDependencyTracker`'s set, and the README describes it as
finding 19 does: each prefix of a member path, an unknown name too, and no `calc` name, function
or effect. The entry's field is named for what it holds, not `facts`.

It needs a read hook on every walk, so every node of every field dispatches hooks, `debug` on or
off. Step 5 measures that cost against a decision rule written before the run. **If the rule
fails, the names read move under `debug`**, and that is decided in step 5, before the shape is
published: `RuleTraceEntry` is bound from 0.1.0.

### 3.7 The package

`modules/eval-rules`, tag `scope:rules`, depending on `scope:core` only. Its peers are
`@zvenigora/ng-eval-core >=0.16.0 <0.17.0`; `acorn-walk ^8.3.0`, as `eval-forms` declares it
(finding 20); and `@angular/core >=19.0.0` if step 2's lint accepts a peer the source does not
import (finding 3). It imports nothing from `acorn`. Its `tsconfig.json` is `eval-signals`' own,
so its `lib` is `es2020`: `Object.hasOwn`, `Array.prototype.at` and `ErrorOptions` do not compile
here. One barrel, `src/public-api.ts`, is the whole surface, pinned by `export-list.spec.ts` and
`public-api.spec.ts` as in the other two.

`evaluateRule` is also the name of a module-private function in `eval-forms`' `/signals`. That one
is not exported, so no consumer sees two.

The package is built as the other three are, a partially compiled bundle for an Angular build.
Its README says so and promises nothing about plain Node (§ 8 q23): `eval-core`, which it
imports, does not load there as installed (finding 25). This library's own source declares no
injectable, so what a Node host would need is `eval-core`'s to provide, and the register entry
says that.

### 3.8 What Phases 13 to 16 need from 0.1.0's shapes

A later phase adds; it cannot change what this one published. Each row is checked at the step 1
gate, and again in step 7 before the version is set.

| Later need | What 0.1.0 must already be | Where |
| :--- | :--- | :--- |
| Phase 13: an effect function registered with a `key(args)` | A declaration that can gain a property: a map from name to an object, not a list of names | § 8 q6 |
| Phase 13: the engine reads a compiled rule's triggers and its `onError` items | Nothing public. The engine ships in this package, so `CompiledRule` publishes its `id` and no compiled field | § 5 |
| Phase 13: `emit(event)` decides what an expression reads as `event` | An `event` passed through as given and typed `unknown`: 0.1.0 names no field of it | § 3.5 |
| Phase 13: the trace flags a conflict, and a batch "failed, state unknown" | Trace entries a consumer reads and does not build, so a new optional field is additive | § 5 |
| Phases 14 and 16: a cancelled or timed-out run | `RuleStatus` documented as open: a consumer handles a value it does not know. A member added to a closed union breaks an exhaustive `switch` | § 8 q10 |
| Phase 13: `onError` items read `error`; Phase 14: `run` and `labels` | The three names reserved now, so no 0.1.0 rule can hold a fact under them | § 3.4 |
| Phase 14: a node is `{ kind, id, … }` | A rule with an `id` and no `kind`. An optional `kind: 'rule'` is additive, since 0.1.0 rejects the field | § 3.2 |
| Phase 14: a `branch` guard reads `labels.<ruleId>.<decision>` | An `id` that can be written there, or a decision that it need not be | § 8 q11 |
| Phase 16: `await` in a calculation's `value` | A rejection, which a later minor lifts | § 3.4 |
| Phase 16: a calculation whose value is a promise is awaited | A failed run today, not a promise stored in `calc` that a later release would start to await | § 8 q14 |
| Phase 15: a `/signals` entry with an optional `eval-signals` peer | Nothing. The entry, its tag's wider constraint and its peer arrive with it | — |
| A later minor: `caseInsensitive`, wider facts, `maxIterations` | Each refused today, so adding it is additive: `compileRule` throws for the option, no 0.1.0 rule compiles two names that differ by case into one, and no 0.1.0 run reads a class instance | § 8 q3, q7, q15, q21 |
| A later minor: a new kind of problem | A `code` list documented as open, so a host handles a code it does not know | § 8 q18 |
| A later minor: a new rule field | An unknown field rejected today, and `meta` for what the host wants to carry meanwhile | § 8 q19 |

## 4. Work breakdown

One step per session and per commit ([SR2](../standing-rules.md#sr2),
[SR34](../standing-rules.md#sr34)); the gate after each ([SR8](../standing-rules.md#sr8)); the
`code-reviewer` before each commit from step 2 on ([SR33](../standing-rules.md#sr33)). Behaviour
is written test-first ([SR13](../standing-rules.md#sr13)), and every new check gets a probe, applied
alone and read case by case ([SR15](../standing-rules.md#sr15),
[SR16](../standing-rules.md#sr16)). The three existing projects' test counts do not move in any
step ([SR10](../standing-rules.md#sr10)); step 1 reads the baseline from the gate.

The `step` skill reads a plan's state from this table and from the last step with a recorded
**Outcome**: each step's section ends with that bullet, written in the step's own commit. Every
step's list also holds this document and the skill, whose recorded counts move with the gate's.
The three existing projects' rows are 0 / 0 / 0 in every step; `eval-rules`' count starts at
step 2 and is recorded in each Outcome, since no step's rows are counted in advance.

| Step | Subject | Files | Ships in |
| :--- | :--- | :--- | :--- |
| 1 | This plan, its records, and the measurements | `docs/eval-rules/plan.md`, `docs/eval-rules/design-session.md`, `docs/README.md`, `ROADMAP.md`, `CLAUDE.md`, the skill, `docs/backlog.md` | No package |
| 2 | The project, empty and green | `modules/eval-rules/` (new), `tsconfig.base.json`, `eslint.config.mjs`, `tools/release-tags.mjs`, `.claude/agents/code-reviewer.md`, `CLAUDE.md`, the root `README.md` and `CHANGELOG.md`, `tools/published-links.txt` | No package: `eval-rules` is at 0.0.0 and unpublished until step 7 |
| 3 | The format and `compileRule` | `rule.ts`, `compile-rule.ts`, `pattern.ts`, `define-rule.ts`, their specs, the barrel and its two specs, `package.json`, `README.md`, `CHANGELOG.md` | `eval-rules` 0.1.0 |
| 4 | Evaluation | `rule-context.ts`, `evaluate-rule.ts`, `rule-result.ts`, their specs, the barrel and its specs, `CHANGELOG.md` | `eval-rules` 0.1.0 |
| 5 | The trace, and the cost of building it | `rule-trace.ts`, its spec, `performance.spec.ts`, `evaluate-rule.ts`, `rule-result.ts`, `CHANGELOG.md` | `eval-rules` 0.1.0 |
| 6 | The tests runner and the registry | `rule-test.ts`, `rule-registry.ts`, their specs, the barrel and its specs, `CHANGELOG.md` | `eval-rules` 0.1.0 |
| 7 | The README, and the release commit | `modules/eval-rules/README.md`, `readme-examples.spec.ts`, `CHANGELOG.md`, `package.json`, `SECURITY.md`, `CONTRIBUTING.md`, `tools/published-links.txt`, the root `README.md` and `CHANGELOG.md` | The release, `eval-rules` 0.1.0 |
| 8 | The post-publish record | `docs/backlog.md`, `ROADMAP.md`, `CLAUDE.md` | No package |
| 9 | The retrospect | This document's § 9 and § 10, `docs/standing-rules.md` if a rule is promoted, `CLAUDE.md`, `ROADMAP.md` | No package |

### Step 1 — This plan, its records, and the measurements

**Files**: `docs/eval-rules/plan.md`, `docs/eval-rules/design-session.md`, `docs/README.md`,
`ROADMAP.md`, `CLAUDE.md`, `.claude/skills/step/SKILL.md`, `docs/backlog.md`.

- Read § 2's decisions once more against the rows run on the gate's bundle: a decision a row now
  contradicts goes back to the maintainer, and is not adjusted in place. Confirm, at the
  confirmation gate, the two § 2 marks as this plan's reading, q22 and q23.
- Check the prototype's hashes, run its scripts on the bundle the gate builds, and write any row
  that differs into § 1.3.
- Correct § 3 where a measurement contradicts it.
- Open the register entries § 3.3's last row names.
- Point `design-session.md`'s Q60 row and its § 6 item 1 at finding 9, which answers both.
- Point `CLAUDE.md` and the `step` skill at this plan as the active one.
- Record the gate's baseline counts for the three projects.

**Exit criteria**: § 2's two readings are confirmed or corrected; `sha256sum -c` is clean, and
every row of § 1.3 but M14's has been run on the gate's bundle; doc-links is green; the gate is
green with the three projects' counts unchanged.

**The wrong implementation** ([SR20](../standing-rules.md#sr20)): an answer read from `eval-core`'s
source or its README instead of a pinned run, and a row copied from this revision without
running its script on the gate's bundle. Each row therefore names its script, and each result
file's second line names the bundle it ran on.

### Step 2 — The project, empty and green

**Files**: `modules/eval-rules/` (`package.json`, `project.json`, `ng-package.json`,
`eslint.config.mjs`, `jest.config.ts`, the four `tsconfig` files, `README.md`, `CHANGELOG.md`,
`LICENSE`, `src/index.ts`, `src/public-api.ts`, `src/test-setup.ts`, `src/export-list.spec.ts`,
`src/public-api.spec.ts`), `tsconfig.base.json`, `eslint.config.mjs`, `tools/release-tags.mjs`,
`.claude/agents/code-reviewer.md`, `CLAUDE.md`, the root `README.md` and `CHANGELOG.md`, and
`tools/published-links.txt` if the README prints a link into the repository.

The package is at version `0.0.0` and exports one constant, so the barrel specs have something to
pin. Nothing is published. The README is a stub that passes the two README gates the barrel specs
bring with them: `## Install` quotes each peer with the manifest's range, and the one export is
named in a code span.

**Exit criteria**
- The gate runs four library projects, and `eval-rules`' build emits a `.d.ts`.
- An import of `@zvenigora/ng-eval-signals` in `modules/eval-rules/src` fails lint. *Probe*: add
  one, see `@nx/enforce-module-boundaries` go red, remove it.
- `export-list.spec.ts` fails on an export it does not list. *Probe*: add an unlisted export.
- `release-tags.mjs` knows the package. *Probe*: a scratch Publication row for `eval-rules` with
  no tag fails it with the missing-tag message, not with "is not a package this workspace
  publishes", which the same row gives before the map changes (finding 5). The row is not
  committed.
- Finding 3 is measured: lint is run once with the `@angular/core` peer and once without, and the
  manifest keeps the form that is green. The result is written into finding 3
  ([SR4](../standing-rules.md#sr4)). The `acorn-walk` peer is declared in step 3, with the first
  import of it, since an unused peer is what finding 3 predicts lint refuses.

**The wrong implementation**: a project the gate does not run. `nx run-many` skips a project with
no matching target silently, so the criterion counts projects in the gate's output, not its colour.

### Step 3 — The format and `compileRule`

**Files**: `src/lib/rule.ts` (the types), `src/lib/compile-rule.ts`, `src/lib/pattern.ts`,
`src/lib/define-rule.ts`, their specs, `src/public-api.ts`, the two barrel specs, `package.json`
and the README's `## Install` (the `acorn-walk` peer), `CHANGELOG.md` (an `[Unreleased]` line,
[SR11](../standing-rules.md#sr11)).

**Exit criteria**
- One row per rejection of § 3.4, asserting the message and the path
  ([SR18](../standing-rules.md#sr18)), and one row per rejection showing the nearest valid rule
  compiles.
- A rule with three independent errors returns three, in a value, and `compileRule` does not
  throw for it (§ 8 q17). *Wrong implementation*: return on the first; and a throw that carries
  the list. *Probe*: an early return in the collector; the three-error row goes red.
- Every problem carries a `code`, and each rejection's row asserts its code beside its message
  and path. One case reads the README's list of codes and fails on a code the source can give
  that the list lacks ([SR30](../standing-rules.md#sr30)). *Wrong implementation*: one code for
  every structural error, under which a host cannot tell an unknown field from a missing `id`.
- An option `compileRule` does not define throws, with the option's name in the message:
  `caseInsensitive`, and `maxIterations` (§ 8 q21). The four it defines do not. *Wrong
  implementation*: a test for `caseInsensitive` alone. *Probe*: remove the check; a rule reading
  `Order.Total` then compiles under `{ caseInsensitive: true }`, which the row shows.
- A rule holding `description` and `meta` compiles, with `meta` an object, an array and a
  string; `descripton` is a problem at that path, and so is a `description` that is not a string
  (§ 8 q19). *Wrong implementation*: accepting any unknown field.
- With statements on, an effect item holding `let x = 1; setValue(x)` is a problem, and a
  calculation holding the same `let` compiles (§ 8 q20). *Wrong implementation*: one statements
  switch for every field.
- The never-assigned check has rows for: a name assigned later in the same section, a name
  assigned only under a `when`, a name read in an output, and each form of M5. *Wrong
  implementation*: a check by name set alone, which accepts a read before every assignment; and a
  check of `MemberExpression` alone, which misses `calc?.x`.
- The `this` rejection has rows for `this.calc.x`, `this["calc"].x` and
  `this.setVisible("a", true)` in a calculation, and `this.fact` in a filter. *Wrong
  implementation*: the identifier rules alone, which accept all four (finding 15). *Probe*: remove
  the `this` check; all four compile.
- A binding of a reserved or declared name is a problem whose message says it is a binding:
  `calc => 1`, `(twice = 1) => 1`. *Wrong implementation*: one visitor for both dispatch types,
  reading `node.type`, which reports a binding as a value (finding 20).
- The statement rejection has a row for a block-bodied arrow function with statements off, and
  the same text compiling with them on. *Wrong implementation*: `extractExpression` alone, which
  accepts it (finding 9).
- The `await` rejection asserts its own message for `await f()`, `a + await f()`, an async
  arrow function with no `await`, and `import("x")`. *Wrong implementation*: the parse error,
  whose message a malformed text shares.
- The name probes: a calculation named `toString` and a declared function named `fetch` are each
  a problem carrying `eval-core`'s message, and `discount` and `setValue` are not. *Probe*: skip
  the probe; both rows go red, and the contrast rows stay green by design, so each contrast row is
  probed by a probe that rejects every name ([SR15](../standing-rules.md#sr15)).
- A function declared as `calc`, and a name declared as a function and as an effect, are each a
  problem (M10).
- Under `colonIdentifiers`, `calc:discount` and `event:name` are each a problem that names the
  dot form, as a value, a binding and an assignment target, and `order:calc`, `order:calc:x`,
  `calcs:x` and `obj.calc:x` compile, since only the first segment of an identifier is read
  (§ 8 q16, finding 28). *Wrong implementation*: a test for the reserved name anywhere in the
  text; and one visitor for `Identifier` alone, which misses the binding (finding 20). With
  `colonIdentifiers` off the same text is not one expression, and the row asserts that message
  instead. `colonIdentifiers` is off when the option is absent (§ 8 q12): a row with no options.
- The first host's form compiles and reads its fact (finding 28): `Q1:1`, `Q2:12 > 3`,
  `Q1:1 > 3 && calc.x == 1` and `flag ? (Q1:1) : Q2:12`, each as a calculation whose value step
  4 then asserts over facts keyed `Q1:1` and `Q2:12`. `flag ? Q1:1 : 0` is a problem carrying
  `eval-core`'s message, which names the parentheses. *Wrong implementation*: a first-segment
  rule that flags any colon-joined name.
- An output's `is` as one label and as a list; a list holding a label no case has is a problem
  at that element's path.
- The pattern matcher reads own properties only: `{ "constructor": { "name": "Object" } }` does
  not match `{}`, and a pattern key `__proto__`, which `JSON.parse` makes an own property, matches
  nothing inherited. Rows for a scalar, an any-of array, an array target, a nested object, and a
  key the target lacks.
- A leg for `colonIdentifiers` ([SR19](../standing-rules.md#sr19)): a colon-joined fact parses
  as one identifier with it, and is not one expression without it. There is no `caseInsensitive`
  leg, since no code path of this library reads the option (§ 8 q3); one row pins that, `CALC.x`
  compiling as a read of an unknown fact and not of `calc.x`.
- The `onError` items and the `triggers` compile and are run by nothing (§ 8 q2): a rule holding
  both compiles; an `onError` item reads `error` and no `calc.` name; a trigger with no `event`
  is a problem.
- Each field is parsed once by `compileRule`: the count finding 24's mechanism reads equals the
  number of fields, in a spec file of its own. Step 4 owns the other half, that evaluation adds
  none.

### Step 4 — Evaluation

**Files**: `src/lib/rule-context.ts`, `src/lib/evaluate-rule.ts`, `src/lib/rule-result.ts`, their
specs, the barrel and its specs, `CHANGELOG.md`.

`RuleResult` has no `trace` in this step; step 5 adds it, and nothing is published between them.

**Exit criteria**
- One row per numbered line of § 3.5, at `evaluateRule`, the entry point a caller uses
  ([SR40](../standing-rules.md#sr40)).
- Each refused write of M2 that § 3.4 lets compile is refused, with its message asserted, and
  `delete` leaves the facts as they were. The caller's own facts object is asserted unchanged
  beside each ([SR19](../standing-rules.md#sr19)). *Probe*: remove each override alone.
- The facts' shapes (§ 8 q7, finding 26): each of M13's 13 refused shapes is refused with a
  message that names the shape, before any field runs, and each of its six admitted shapes is
  read, the frozen object and the `Proxy` among them. *Wrong implementation*: passing the object
  on, under which a null-prototype object's facts read `undefined` and the rule completes
  (finding 18); a test by `instanceof Object`, which admits the class instance; and a test by
  `typeof`, which admits the array.
- A declared function with no implementation, and an implementation with no declaration, each
  throw before any field runs (§ 8 q6).
- A fact named `calc` does not answer `calc.x`. *Wrong implementation*: the namespace scope of
  finding 6. *Probe*: bind `calc` as a prior scope.
- `evaluateRule` parses nothing: the count is zero across a run, in the counting spec file.
- A rule that throws in its last output item returns an empty effect list, although earlier items
  recorded effects. *Wrong implementation*: returning the list as built. *Probe*: return it.
- Two runs of one compiled rule share nothing: a `calc` value of the first is absent in the
  second. Each assertion has a fixture of its own ([SR43](../standing-rules.md#sr43)).
- A scope a host function strands does not reach the next field: a function that calls
  `this.push({ a: 'stranded' })`, then a field that reads the fact `a` (finding 22). *Probe*:
  remove the unwind after each field; the second field reads `'stranded'`.
- A `calc` value is replaced and not mutated: `calc.list.push(1)` in a later field is refused,
  and `[...calc.list].sort()` is not (finding 16). *Wrong implementation*: one `EvalState` for the
  whole rule, under which the array is "created by the walk" and the push lands.
- A field whose value is a promise fails the run, with a message that names the field
  (§ 8 q14). A promise passed through as an effect's argument does not. A calculation whose
  value is a thenable that is not a `Promise` completes, with the thenable in `calc`: the
  contrast row that keeps the README to "an instance of `Promise`" (finding 27,
  [SR44](../standing-rules.md#sr44)).
- Effect order: items in array order, outputs in array order.
- `strict` on the rule, off on one decision, and the reverse.

### Step 5 — The trace, and the cost of building it

**Files**: `src/lib/rule-trace.ts`, its spec, `src/lib/performance.spec.ts`, `evaluate-rule.ts`,
`rule-result.ts`, `CHANGELOG.md`.

**Exit criteria**
- The trace of one fixture rule is asserted whole, not by length: paths, values, the matched
  case, "when was false", the names read. Each timing is asserted as a number and nothing more,
  since it is the one part of a trace that differs between two runs.
- The names read hold no `calc` name and no function name (finding 6). *Probe*: bind `calc` as a
  prior scope; the row goes red. They hold each prefix of a member path, and an unknown name
  (finding 19): a row for each, so the README's description has a witness.
- `debug` off carries no per-field `eval-core` trace; `debug` on does, with its truncation flag
  on a field that pushes more than 10,000 values.
- A timing, by [SR28](../standing-rules.md#sr28): the rule evaluated with the trace against the
  same fields evaluated bare through `call`, paired within each rotation, with an A/A control and
  a decision rule written into this section **before** the run, and a memory arm for the trace's
  retained size. Its arms: the read hook on and off; the context built per run; `maxTraceItems`
  at `0` and at `eval-core`'s default (finding 23). The figure is published nowhere until it has
  been measured on the production bundle ([SR22](../standing-rules.md#sr22)).
- § 3.6's decision is made: the names read stay on every run, or move under `debug`, by the rule
  written before the run.

### Step 6 — The tests runner and the registry

**Files**: `src/lib/rule-test.ts`, `src/lib/rule-registry.ts`, their specs, the barrel and its
specs, `CHANGELOG.md`.

A registry is constructed with its compile options and holds one set. What a compile gives
depends on them, so a registry that took options per call and keyed by id and text would hand a
rule compiled with statements on to a caller who asked for them off. That is
[A34](../backlog-retired.md#a34)'s shape, in a cache this library owns.

A test is stored apart from its rule and holds the inputs and the expectations, and no function;
a rule may call a declared one (§ 8 q6). So `runRuleTest` takes the host's implementations as a
third argument, by name, as `evaluateRule`'s input does (§ 8 q22).

**Exit criteria**
- A test of a rule that calls a declared function passes with the implementation given as the
  third argument, and throws as `evaluateRule` does when it is missing. *Wrong implementation*: a
  runner that stubs a missing function, under which a test passes on a value no host computes.
- A test passes, and fails naming the first difference, for each of `calc`, `labels`, `effects`
  and `skipped`. *Wrong implementation*: a comparison that passes when `expect` names a key the
  result lacks.
- The registry returns the **same** compiled object for the same id and text, asserted with
  `toBe` ([SR41](../standing-rules.md#sr41)); a different text under the same id compiles again;
  a `version` match reuses without comparing text, which the README states as the caller's
  promise ([SR44](../standing-rules.md#sr44)); the 501st id evicts the least recently used, and a
  read refreshes recency. *Probe*: key by id alone; the changed-text row goes red.
- A rule that does not compile is not cached as compiled: a second request for it reports its
  problems again.

### Step 7 — The README, and the release commit

**Files**: `modules/eval-rules/README.md`, `src/lib/readme-examples.spec.ts`, `CHANGELOG.md`,
`package.json`, `SECURITY.md`, `CONTRIBUTING.md`, `tools/published-links.txt`, the root
`README.md` and `CHANGELOG.md`.

- The README opens as the other three do, documents the format, the two functions, the result,
  the limits, and states that rule text is untrusted and the registered functions are the
  boundary.
- Its limits, each scoped to the fixture its witness runs:
  - an unknown name reads `undefined` (finding 13);
  - a fact held under a reserved name, or under a declared function's, is not reachable from a
    rule (finding 6), and under `colonIdentifiers` neither is one whose name starts with a
    reserved name and a colon (§ 8 q16);
  - evaluation time and memory are not bounded, with the regular expression as the example and
    the iteration budget as what is (finding 9);
  - a copy a built-in makes cannot be changed in place, with the two forms that can
    (finding 16);
  - a function the host supplies, among the facts or the functions, can write, `Reflect` among
    them (finding 17);
  - `eval-core` refuses a call of a host function by its source text (finding 11, § 8 q13);
  - which objects are read as facts, an object of another realm not among them (finding 26);
  - a refused write's right side has run (M2);
  - an effect's argument is the host's own object;
  - a promise is not awaited, and a field whose value is an instance of `Promise` fails the
    run; a thenable that is not one is a value (§ 8 q14, finding 27);
  - names are compared as written, and `compileRule` throws for `caseInsensitive` (§ 8 q21);
  - an effect item is one call, whatever `statements` is (§ 8 q20);
  - an Angular build is required, and nothing is promised about plain Node (§ 8 q23);
  - a `version` match is the caller's promise.
- Every example has a case that fails under the wrong library ([SR30](../standing-rules.md#sr30)).
- A claim → witness table for every sentence of the README and the CHANGELOG entry
  ([SR21](../standing-rules.md#sr21)), each sentence scoped to the fixture its witness runs
  ([SR45](../standing-rules.md#sr45)).
- § 3.8 is read again, row by row, against the `.d.ts` the build emits.
- The version becomes 0.1.0 and the CHANGELOG heading is dated by
  [CONTRIBUTING's Releasing](../../CONTRIBUTING.md#releasing), whose table and publish commands
  gain the fourth package.

**Exit criteria**: the gate green on the committed tree; the README counts pinned; the review
finds no shipped sentence wider than its witnesses.

### Step 8 — The post-publish record

**Files**: `docs/backlog.md` (the Publication status row), `ROADMAP.md`, `CLAUDE.md`.

After the publish and the annotated `eval-rules@0.1.0` tag: the row, at the release commit.
**Exit criterion**: `release-tags.mjs` green with the row present.

### Step 9 — The retrospect

**Files**: this plan's § 9 and § 10, `docs/standing-rules.md` if a rule is promoted, `CLAUDE.md`,
`.claude/skills/step/SKILL.md`, `ROADMAP.md`.

One retrospect for the track ([SR7](../standing-rules.md#sr7)). It counts P-1's uses, and says
which a later phase has already asked to lift.

## 5. Public API surface added

All from `@zvenigora/ng-eval-rules`. Names are proposals until step 3 writes them; from 0.1.0
their shapes are bound ([SR12](../standing-rules.md#sr12)). A result, a trace and a problem are
objects a consumer reads and does not build, and the README says so: that is what lets a later
phase add an optional field to one. A `CompiledRule` is a handle: it publishes the rule's `id`,
and what `compileRule` built is not a public field of it (§ 3.8).

| Symbol | Kind | Step |
| :--- | :--- | :--- |
| `Rule`, `RuleFilter`, `RuleTrigger`, `RuleCalculation`, `RuleDecision`, `RuleDecisionCase`, `RuleOutput` | Types | 3 |
| `compileRule`, `CompileRuleResult`, `CompiledRule`, `CompileRuleOptions`, `RuleProblem` | Function and types | 3 |
| `defineRule` | Function | 3 |
| `evaluateRule`, `evaluateInit`, `RuleInput`, `RuleResult`, `RuleEffect`, `RuleStatus` | Functions and types | 4 |
| `RuleTrace`, `RuleTraceEntry` | Types | 5 |
| `runRuleTest`, `RuleTest`, `RuleTestResult` | Function and types | 6 |
| `RuleRegistry` | Class | 6 |

Shapes § 2 has fixed:

- `CompileRuleOptions` holds `statements` and `colonIdentifiers`, both off by default,
  `functions: string[]` and `effects: Record<string, {}>`. Any other key throws.
- `compileRule` returns a `CompileRuleResult`: the compiled rule and no problem, or no rule and
  at least one problem. It is a value a consumer reads and narrows.
- A `RuleProblem` is `{ code, path, message }`, its `code` from a list documented as open.
- `RuleInput` holds `facts`, `event` and `functions`, the implementations by name, and no
  `context`.
- `RuleStatus` is `'inactive' | 'skipped' | 'completed' | 'failed'`, documented as open.
- A `RuleEffect` is `{ name, args }`, its arguments by reference.
- `runRuleTest(compiled, test, functions?)`, and a `RuleTest` that holds no function.

Left to step 3, which writes the types: the field that tells the two forms of a
`CompileRuleResult` apart, and the spelling of each `code`. Neither is a decision § 8 holds; the
step's gate shows both before they are exported.

## 6. Verification gates

The gate of [SR8](../standing-rules.md#sr8), unfiltered, after every step. From step 2 it runs
four library projects and the root. A green `test` is not a type-check
([SR9](../standing-rules.md#sr9)): the specs' use of the public types is compiled by `build` only
through the barrel, so a type exported wrongly is caught by `public-api.spec.ts`' import, not by
Jest.

## 7. Risks

| Risk | What goes red |
| :--- | :--- |
| A write reaches the host's facts through a path M2 did not list | Step 4's refusal rows, by the path; a path with no row is a gap, recorded |
| A field rebinds `calc`, `event` or a function for the fields after it | Step 3's reserved-name and function-name rows, at compile time. No run-time line stands behind them (§ 3.5) |
| A field reaches the run's scope without naming an identifier | Step 3's four `this` rows. No other route was found; M12 lists what was tried |
| A fact shadows `calc` or a function | Step 4's shadow row |
| Facts of a shape `eval-core` does not read complete a rule on `undefined` | Step 4's shape rows |
| A shape published in 0.1.0 cannot carry what a later phase needs | Nothing in the gate. Held by § 3.8, read at step 1's gate and in step 7 |
| The never-assigned check rejects a valid rule | Step 3's "nearest valid rule compiles" rows |
| The never-assigned check accepts a read it cannot see | Step 3's M5 rows and its `this` rows; the bare-value rejection is what makes the check complete |
| A name `eval-core` starts refusing after 0.1.0 | The name probe follows the installed `eval-core`, so the rule fails at compile, with the message. No row can witness a future list |
| A host function `eval-core` refuses by its source text | Nothing at compile. The run fails with `eval-core`'s message, and the README states the limit |
| A consumer's build rewrites a recorder's source into a text `eval-core` refuses | Nothing in the gate, which runs the source and this package's own bundle |
| The trace costs more than the evaluation | Step 5's timing, by its decision rule, and § 3.6's fallback |
| A scope stranded on the run's context | Step 4's stranded-scope row |
| A host names a fact under `calc:`, `labels:`, `run:`, `error:` or `event:` | `compileRule` returns the problem, with step 3's message. Not the first host's case: the maintainer's names are `Q1:1` and the like, which step 3's legacy-form rows compile (finding 28) |
| A rule of the earlier engine holds a colon-joined name bare in a conditional's consequent, `flag ? Q1:1 : 0` | `compileRule` returns `eval-core`'s parse error at the field's path, which says to write `(Q1:1)`. Step 3's row asserts it. Nothing rewrites the rule: a converter from an earlier format is a register entry (§ 3.3) |
| A host forgets `colonIdentifiers`, which is off by default | `compileRule` returns "not one expression" for each colon-joined field, at its path; step 3's leg row. It is never silent |
| A host expects `caseInsensitive`, as the siblings accept it | `compileRule` throws; step 3's unknown-option row |
| A host imports the package in plain Node | Nothing in the gate, which runs Jest's Angular preset. The import throws `eval-core`'s JIT message (finding 25), and the README states the requirement |
| A shipped sentence wider than its witnesses | Held by review, [SR45](../standing-rules.md#sr45) |

## 8. Questions, all decided

Questions 1 to 5 are the draft's, 6 to 12 Revision 2's, 13 to 16 Revision 3's and 17 to 23
Revision 4's, which Revision 3 had left to later gates without a number. Each of 6 to 23 is a
published shape § 3 could not settle from the design. **All are decided**, by the maintainer on
2026-11-12: they stay here with their reasons, and § 2 holds the decisions. None is open.

1. **The later slices are Phases 13 to 16**, numbered here and in `ROADMAP.md`. Is one phase per
   release the granularity wanted, or one plan for the engine and workflows together?
   *Decided*: one phase per release.
2. **`onError` and `triggers` in 0.1.0** are validated and compiled, and run by nothing. The
   alternative is to leave both out of the 0.1.0 types and add them in Phase 13, which is additive
   too, and publishes nothing unused. P-1 argues for the alternative: this phase would otherwise
   fix `onError`'s compile rules before the phase that runs it has decided them. Revision 3 adds a
   second argument: nothing public reads the compiled form of either (§ 3.8). *Decided*: both
   stay in the format, compiled only. A rule written for the engine, the design's § 2.9 example
   among them, then compiles in 0.1.0. What the decision costs is what the question named: Phase
   13 inherits § 3.4's rules for an `onError` item, and can lift a rejection but not add one.
3. **`caseInsensitive`** is carried through as an option because both sibling libraries carry it.
   What it costs here, measured: the option is passed in three places and each alone is wrong
   (finding 21); the facts are copied into a `Registry` on each run, and the copy drops a
   prototype's getters (finding 18); the names read are spelled as the rule wrote them
   (finding 19); reserved names and name clashes are compared by case; and `Calc.x` means two
   things in the two modes (finding 13). *Decided, as recommended*: not in 0.1.0; it is additive
   later.
4. **The Default rows this phase depends on**: Q18 (tests), Q19 (the trace), Q20 as revised by
   Q55 (the cache), Q26 (`strict`), Q39 (the package), Q43 (evaluate, then commit), Q47 (read-only
   context, no `conditions`) and Q48 (sections compiled to a step list). *Decided*: they stand.
5. **Q48's step list** is internal. This plan does not build a step-kind registry; it only keeps
   the compiled form free of the section names. Is that enough for 0.1.0? *Decided*: it is.
6. **Where functions and effects are declared.** The draft took both at `evaluateRule`. Then
   `compileRule` cannot reject a call of an unknown function, an effect call outside an item, an
   effect function used as a value, or a name `eval-core` refuses, and each surfaces only when a
   run reaches it; and the one run-time line found against a rebound function is not published
   API (finding 7). *Decided, as recommended*: `CompileRuleOptions` declares the **names**, as
   `functions: string[]` and `effects: Record<string, {}>`, a map so that Phase 13's `key(args)`
   has a place; `evaluateRule` takes the host functions' **implementations**, and throws for a
   declared one that is missing and for one given with no declaration, before any field runs. The
   recorders are this library's.
7. **What a filter's `match` is matched against, and what `facts` may be.** The design's § 2.1
   says "the context", and its § 2.3 calls the facts "the context object"; the draft's
   `evaluateRule` took a `context` beside the facts. *Decided, as recommended*: the facts, and no
   `context` input. And `facts` is an object whose prototype is `Object.prototype` (P-1), refused
   otherwise with a message. That refuses a null-prototype object, which `eval-core` would read
   as empty (finding 18); an `EvalContext` the caller built, the entry path
   [SR40](../standing-rules.md#sr40) names; and a class instance and a `Registry`, which
   `eval-core` reads today and a later minor can admit. Revision 3 wrote here that an
   `EvalContext` "would be walked without this library's write guard"; measured, it reads
   nothing (finding 26), and is refused for that.
8. **What a recorder returns.** The draft had `true`, "a convenience and not a contract". In a
   published package what a caller can observe is the contract, whatever the plan calls it.
   *Decided, as recommended*: `undefined`, with § 3.4's item rule, under which no expression can
   read it.
9. **A recorded argument is the host's own object.** A copy would cost on every effect, and no
   copy is general: `structuredClone` throws on a function. *Decided, as recommended*: by
   reference, stated as a limit.
10. **`RuleStatus` is `'inactive' | 'skipped' | 'completed' | 'failed'`.** Phase 14's
    cancellation and Phase 16's timeout may want a fifth. *Decided, as recommended*: document the
    union as open, and fold a timeout into `'failed'` unless Phase 16 finds a reason not to.
11. **A rule's `id`.** Phase 14 reads `labels.<ruleId>.<decision>`, which needs an identifier,
    and a rule stored in a database may be keyed by a number or a GUID. Accepting any string now
    cannot be narrowed later. *Decided, as recommended*: any non-empty string in 0.1.0, with Phase 14
    reading a label by a computed member where the id is not an identifier; a decision's `name`
    is an identifier either way.
12. **`colonIdentifiers`' default.** Every rule in the design is written with colon-joined names,
    and the option is off by default in `eval-core` and in both siblings. A default cannot change
    after 0.1.0 without a breaking release. No recommendation: it turns on how the first host
    names its facts. *Decided*: off by default, set by the option, as in `eval-core` and both
    siblings. The first host is the maintainer's, whose earlier rule engine writes colon-joined
    names in every expression; it sets the option once, on its registry.
13. **A host function `eval-core` refuses by its source text** (finding 11). This library could
    bind each implementation inside a closure of its own, whose text `eval-core` would read
    instead; a wrapped function that mentions `globalThis` was called. That would switch off a
    check of `eval-core`'s for every host function, silently. *Decided, as recommended*: bind the
    implementation as given, and state the limit with the message a host will see.
14. **A field whose value is a promise.** A host function may return one, and no tree shows it.
    Left alone, the promise is stored in `calc`, and a decision that reads it takes the truthy
    branch. Phase 16 awaits a calculation's value, so storing one now is behaviour a later
    release would change. *Decided, as recommended*: a field whose value is an instance of `Promise` fails
    the run, with a message that names the field (P-1). An effect's argument may be one: it is
    the sink's to await.
15. **Which `eval-core` options a caller can set.** `maxIterations` is the one with a use: a host
    may want a lower budget than 100,000 per field, or `Infinity`. Every option forwarded is a
    published field of `CompileRuleOptions` or of the input. *Decided, as recommended*: none but
    `colonIdentifiers` in 0.1.0 (P-1); `maxIterations` is additive when a host asks.
16. **`calc:name`, the colon for the dot.** Under `colonIdentifiers` it is one identifier, an
    unknown fact, and reads `undefined` with no error (finding 13). The design writes facts with
    colons and variables with a dot, so the slip is likely. *Decided, as recommended*: under
    `colonIdentifiers`, an identifier whose first segment is a reserved name is a compile error
    (P-1). It costs a host nothing unless it names a fact `calc:…`. Revision 4 measured the rule
    and found that sentence too narrow: the cost is a fact under any of the five prefixes,
    `event:` and `error:` among them (finding 28, § 7). The maintainer then confirmed the
    decision with the cost in view: the earlier engine's names are an identifier and an index,
    `Q1:1` or `Q2:12`, and none starts with one of the five.
17. **What `compileRule` gives for a rule with problems**: a value holding them, or a throw. The
    design's "returns all problems at once" reads as the first, and a throw carries one message.
    *Decided*: it does not throw; it returns the problems.
18. **Whether a `RuleProblem` carries a stable `code`** beside its `path` and `message`. Without
    one a host tells problems apart by matching text, and the text becomes a contract.
    *Decided*: yes.
19. **A free-form field on a rule**, given that an unknown field is an error. A stored rule
    usually has a description, and a host may keep data of its own beside it. *Decided*:
    `description`, a string, and `meta`, any JSON value, both ignored; every other unknown field
    stays a problem, so a misspelt field is still caught.
20. **Whether `statements` applies to an effect item.** *Decided*: no. Statements are for the
    expressions of a rule's conditions and calculations; an effect is the rule's handler for an
    output, and an item is one call of a declared effect in both settings (§ 3.4).
21. **An option `compileRule` does not define.** Both sibling libraries accept `caseInsensitive`,
    and a caller who passes it here would have it ignored, with a rule's names then read as
    written and no error anywhere. *Decided*: `compileRule` throws in 0.1.0. `caseInsensitive`
    is to be supported in a later minor, which is additive, since the option is refused today.
22. **Where `runRuleTest` takes the host's function implementations.** *Decided*: the
    maintainer's answer was "rule tests are separated to test the rules providing the
    expectations". This plan reads it as: a test is data stored apart from its rule, so the
    implementations are an argument of their own. Step 1's gate confirms the reading.
23. **Whether 0.1.0 promises to run in plain Node.** *Decided*, by the maintainer's rule: "do
    other libraries work in Node? If yes, we can make such the promise, otherwise no". Measured
    (finding 25): as installed, none loads; with `@angular/compiler` imported first, all three
    load and evaluate; no README of theirs documents that import. This plan reads that as
    "otherwise" (P-1): no promise in 0.1.0, and a register entry. Step 1's gate confirms it.

## 9. Contract after this lands

Written by step 9.

## 10. Retrospect

Written by step 9.
