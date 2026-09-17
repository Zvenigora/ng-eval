# Changelog

All notable changes to the `@zvenigora/ng-eval` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The repository publishes more than one package, and they version independently. From `eval-signals 0.1.0` onward a heading names its package; bare version headings below it are `@zvenigora/ng-eval-core`, which is the only package that had shipped until then.

---

## [Unreleased]

### Fixed
- **Dependency Security**: Bumped the transitive `fast-uri` dependency (pulled in by `ajv`,
  used by the lint/build tooling) from 3.1.5 to 3.1.7, resolving 4 high-severity Dependabot
  advisories — [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp),
  [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc),
  [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), and
  [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8). `ajv`'s own
  declared range (`^3.0.1`) already permitted the patched version, so only
  `package-lock.json` needed updating — no published package's runtime dependencies are
  affected.

---

## [eval-core 0.5.0] - 2026-09-17

### Fixed

- **Object destructuring now binds the names JavaScript binds.** `evaluateObjectPattern` took
  the binding name from the pattern's **key** and then resolved the pattern's **value** as an
  *expression* against the source object. For `{ a: b }` that resolved the identifier `b`
  against the source and bound the name `a` to whatever came back — both halves wrong at once,
  where JavaScript binds `b` to `src.a`. Shorthand `{ a }` hid it, because `key` and `value`
  both name `a`, so resolving the wrong one landed on the right answer.

  Affected, through **both** arrow parameters and `let`/`const` declarations:

  | Pattern | before | now |
  | ------- | ------ | --- |
  | `{ a: b }` — read `b` | `undefined` | the source's `a` |
  | `{ a: b }` — read `a` | the source's `b`, when it had one | not bound |
  | `{ a: x, b: y }` | neither bound | both bound |
  | `{ a: { b } }` | nothing bound | the inner `b` |
  | `{ a: { b: z } }` | nothing bound | the inner `b` |
  | `{ "a": q }` | `undefined` | the source's `a` |
  | `{ ["a"]: q }` | `undefined` | the source's `a` |

  **Most consumers saw `undefined` rather than a wrong value.** The wrong-value case needs the
  renamed-*to* name to exist on the source as well — `{ a: b }` over a source carrying both
  `a` and `b` — and otherwise the value name resolves to nothing. If you inverted a rename to
  work around this, remove the inversion.

  Shorthand `{ a }` and array patterns were correct and are unchanged. Defaults (`{ a = 1 }`)
  continue to throw `AssignmentPattern is not supported as a binding target.`

- **A computed key is now evaluated.** `{ [keyName]: q }` parses with `key` an `Identifier`,
  and the branch order tested `Identifier` before `computed` — so the key was taken to be the
  *name it is spelled with* and the source was read at `src.keyName` instead of at
  `src[keyName]`. The literal form `{ ["a"]: q }` hid it, a `Literal`'s value being its own
  key. Computed keys are evaluated in the enclosing scope, as in JavaScript.

- **An object rest element now binds the remainder.** `{ a, ...r }` bound the **whole** source
  to `r`, leaving a key a sibling property had already taken: `(({a, ...r}) => r.a)(src)` was
  the source's `a` and is now `undefined`. Keys are excluded by their **source** name, so
  `{ a: x, ...r }` removes `a`. Array rest was already correct. This is the one item here
  whose old answer was a real value rather than `undefined`, so it is the one a consumer may
  have been reading without knowing.

### Changed

- **`evaluateObjectPattern` no longer pushes a scope.** It pushed the source so the value
  could be resolved against it, which was the defect above; the value is now bound as a
  pattern and nothing reads a scope. No consumer-visible behaviour depends on this, but it
  means `pattern.ts` is no longer one of the visitors the `BL-A9` push/pop idiom applies to.

- **The prototype-pollution blocklist now applies to the source key on the way in.**
  `{ __proto__: p }` and `{ constructor: { x } }` are rejected before the source property is
  read, rather than at the binding write — which is what keeps the guard in front of a nested
  pattern, where a plain read would have handed `Function` to the recursion. The rejection and
  its message are unchanged for every form that already threw.

### Upgrading

`0.5.0` is a minor rather than a patch because expression **results change** on the paths
above: a consumer on `^0.4.0` does not receive it unattended, and should re-run their own
expression tests when they take it. The two downstream packages widen their peer range to
admit it in the same change — `eval-signals 0.1.2` and `eval-forms 0.2.2` below — which is
what `@nx/dependency-checks` requires of a workspace release, and neither carries any other
change.

---

## [eval-forms 0.2.2] - 2026-09-17

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.5.0:
  `>=0.3.0 <0.5.0` → `>=0.3.0 <0.6.0`. Manifest only — no code, no exported symbol and no
  behaviour of this package changes. The lower bound is unchanged, so 0.3.0 and 0.4.0 remain
  supported.

---

## [eval-signals 0.1.2] - 2026-09-17

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.5.0:
  `>=0.3.0 <0.5.0` → `>=0.3.0 <0.6.0`. Manifest only — no code, no exported symbol and no
  behaviour of this package changes. The lower bound is unchanged, so 0.3.0 and 0.4.0 remain
  supported.

---

## [eval-signals 0.1.1] - 2026-09-16

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.4.0:
  `"@zvenigora/ng-eval-core": "^0.3.0"` → `">=0.3.0 <0.5.0"`. `^0.3.0` resolves to
  `>=0.3.0 <0.4.0`, so installing `eval-core` 0.4.0 beside `eval-signals` 0.1.0 raised a
  peer-dependency conflict. **0.3.0 remains supported** — the range widens rather than moves, so no
  working installation stops working.

Nothing else changed: no source file, no export, no behaviour. This library works against both
`eval-core` 0.3.0 and 0.4.0, and its suite runs against both. The two `eval-core` 0.4.0 changes that
reach it are described under that release — A9's scope-pop repair, and the write relaxation, which
makes `(x => (x = 5))(1)` return `5` instead of throwing `SignalContextWriteError`. **Both are
`eval-core` behaviour, visible through this library rather than changed by it**, which is why this
is a patch.

The depth-mark unwind at this library's recompute boundary is **retained**, for two reasons the
release does not retire: the widened range still admits the leaking `eval-core` 0.3.0, and
`EvalContext.push` / `pop` are public methods on a published class, so a scope can be stranded with
no visitor involved at all. The second reason holds at any peer range.

---

## [eval-forms 0.2.1] - 2026-09-16

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.4.0:
  `"@zvenigora/ng-eval-core": "^0.3.0"` → `">=0.3.0 <0.5.0"`, for the reason given under
  `eval-signals` 0.1.1. **0.3.0 remains supported.**

The `"@zvenigora/ng-eval-signals": "^0.1.0"` range is **unchanged** and needs no change: `^0.1.0`
resolves to `>=0.1.0 <0.2.0`, which already admits `eval-signals` 0.1.1.

Nothing else changed — no source file, no export, no behaviour, and all three entry points
(`@zvenigora/ng-eval-forms`, `/reactive`, `/signals`) are untouched. `/signals` still requires
Angular 22; `/reactive` still works from Angular 19. The depth-mark unwind in `evaluateRule` is
retained, for the same two reasons given under `eval-signals` 0.1.1.

---

## [eval-core 0.4.0] - 2026-09-15

Phase 2 of the [roadmap](ROADMAP.md): **statement support**. `let` and `const` declarations,
blocks, `if`/`else` and the classic three-part `for` now evaluate as statements, with JavaScript's
completion-value semantics. Design, measurements and the questions it settles are in
`docs/statements/phase-2-plan.md`; the retrospect is in `docs/statements/summary.md`.

**Read the Changed section before upgrading.** Statements were never *unsupported* — they were
walked as expressions and silently mis-evaluated, so this release changes what a dozen already-working
expressions return, and rejects a dozen more that used to return a value. If your expressions are
single expressions (`a + b * c`, `user.name`, `items.filter(…)`), nothing here reaches you.

### Added

- **Seven statement node types**: `Program`, `ExpressionStatement`, `EmptyStatement`,
  `BlockStatement`, `VariableDeclaration` (`let` / `const`), `IfStatement` and `ForStatement`.
  Blocks introduce a scope; declarations bind into it and do not write the caller's context object.
- **`EMPTY_COMPLETION`**, exported. A statement that produces no value — a declaration, an `if`
  that takes no branch, a `for` that runs zero iterations — pushes this sentinel rather than
  `undefined`, because JavaScript's completion-value semantics keep the last *non-empty* value and
  empty is not `undefined`. It never leaves an evaluation's return value, but an `after` hook on a
  statement node fires before the conversion and **will** see it, so it is exported for identity
  comparison on the precedent of `ASYNC_HOOK_MESSAGE`. See the
  [package README](modules/eval-core/README.md#statements-and-the-empty-completion-sentinel).
- **`maxIterations`** on `EvalOptions`, defaulting to **100,000** iterations per evaluation.
  Exceeding it raises `Iteration budget exhausted after <n> iterations`. The budget is per
  outermost `eval` call and shared by every loop in the expression. It bounds **time, not memory**:
  `result.trace` grows per pushed value and that allocation is paid before the throw.
- **`EvalContext.setInScope`**, and `EvalContext.scopeHolding` promoted from private — a write
  needs the scope, not a yes/no, because `const` kinds are keyed by scope.
- `EvalHooks.pushWalkBase` / `popWalkBase` / `walkBase`, and `EvalState.walkDepth` / `enterWalk` /
  `exitWalk` / `iterationsRemaining` / `chargeIteration` / `declareConst` / `isConstBinding`. These
  are `@internal`-tagged: supported for this library's own use, not part of the contract. They are
  nonetheless reachable on published classes, so they are listed rather than hidden.

### Changed

**Every row below was transcribed from `statement-semantics.spec.ts` and the step-6 audit, both
run against 0.3.0 and 0.4.0 — not from the design document.**

Expressions that returned a value and now return a **different** value:

| Expression | 0.3.0 | 0.4.0 |
| ---------- | ----- | ----- |
| `let x = 1` | `1` | `undefined` |
| `let x = 1; x + 1` | `NaN` | `2` |
| `const y = 2; y` | `undefined` | `2` |
| `if (a) { 1 } else { 2 }`, `a` truthy | `2` | `1` |
| `if (a) { 1 }`, `a` falsy | `1` | `undefined` |
| `for (let i = 0; i < 3; i++) { i }` | `NaN` | `2` |
| `let [p, q] = arr` | the array | `undefined`, and `p` / `q` are now bound |

Expressions that returned a value and now **throw**:

| Expression | 0.3.0 | 0.4.0 |
| ---------- | ----- | ----- |
| `while (false) { 1 }` | `1` | `Unsupported statement type: WhileStatement` |
| `do { 1 } while (false)` | `1` | `Unsupported statement type: DoWhileStatement` |
| `for (const k in o) { k }` | `undefined` | `Unsupported statement type: ForInStatement` |
| `for (const v of arr) { v }` | `undefined` | `Unsupported statement type: ForOfStatement` |
| `switch (1) { case 1: 2 }` | `2` | `Unsupported statement type: SwitchStatement` |
| `try { 1 } catch (e) { 2 }` | `2` | `Unsupported statement type: TryStatement` |
| `throw 1` | `1`, throwing nothing | `Unsupported statement type: ThrowStatement` |
| `x: 1` | `1` | `Unsupported statement type: LabeledStatement` |
| `break` / `continue` in a loop body | `undefined` | `Unsupported statement type: …` |
| `function f() { return 1 }` | `1` | `Unsupported statement type: FunctionDeclaration` |
| `class C {}` | `undefined` | `Unsupported statement type: ClassDeclaration` |
| `var x = 1` | `1` | `Unsupported variable declaration kind: var` |
| `const y = 1; y = 2; y` | `2` | `Assignment to constant variable "y".` |
| `let { a = 1 } = o; a` | `undefined` | `AssignmentPattern is not supported as a binding target.` |
| `(toString => toString)(1)` | `1` | `Access to dangerous property "toString" is blocked…` |

**The messages above are the ones raised at the top level.** A throw from inside a called arrow
function is re-wrapped, so `(toString => toString)(1)` is caught as
`Function call error: Access to dangerous property "toString" is blocked for security reasons`, and
an unsupported statement inside a block-bodied arrow as
`Function call error: Unsupported statement type: …`. Match on a substring rather than on the start
of the message.

The last row is the widest of them: binding writes now share the prototype-pollution blocklist with
every other write site, so all thirteen blocked names are rejected as **arrow function parameters**
too — a form that has nothing to do with declarations. Only `__proto__` is an actual write vector;
the rest is kept wide so that "is this name blocked?" does not depend on which visitor reached it.

**This is a change of kind, not only of coverage.** Before 0.4.0 an unsupported statement was handed
to `acorn-walk`'s base walker, which walked the subtree as an expression and left whatever it pushed
on the value stack — which is why `throw 1` evaluated to `1` and threw nothing. There is now an
explicit dispatcher whose `default` raises.

Expressions whose **value is unchanged** and whose stranded-value count is not — listed because the
values above make it reasonable to assume otherwise:

| Expression | 0.3.0 | 0.4.0 |
| ---------- | ----- | ----- |
| `1 + 2` | `3`, 0 stranded | unchanged |
| `1; 2; 3` | `3`, **2 stranded** | `3`, 0 stranded |
| `a; b` | `'B'`, **1 stranded** | `'B'`, 0 stranded |
| `{ 1; 2 }` | `2`, **1 stranded** | `2`, 0 stranded |
| `(x => { 1 })(0)`, `(x => { 1; 2 })(0)`, `(x => { })(0)` | `1` / `2` / `undefined` | unchanged |
| `(x => { if (true) { 1 } })(0)` | `1` | `1` |

A "stranded" value is one the walk pushed that nothing popped, visible as `result.stack.length` after
an evaluation returns. It was never read, so the value was right by accident; it is now right by rule.

Other behavioural changes on already-shipped paths:

- **A write to a bare identifier consults the scope stack before the caller's context object.**
  `(x => (x = 99))(1)` used to write `99` into the caller's own context and leave the arrow's
  parameter untouched; it now writes the parameter. This is what makes `for`'s `i++` work.
- **A block-bodied arrow's body goes through the statement dispatcher.** Completion values are
  unchanged for every supported form (the table above), but an unsupported statement inside a block
  body now throws where the base walker previously evaluated it:
  `(x => { while (false) { 1 } })(0)` was `1`. In the other direction,
  `(x => { let y = 1; y })(0)` was `undefined` and is now `1`.
- **`EvalHooks.exit` bounds its scan to the current walk**, so a nested walk can no longer flush
  frames belonging to the walk that contains it.
- **A throwing arrow body no longer strands a scope on a reused `EvalContext`.** Both scope-push
  sites now pop in a `finally`. Before this, one throwing evaluation left a scope that shadowed a
  source key for the life of the context — and a context is reused by design in
  `@zvenigora/ng-eval-signals`. `docs/backlog.md` A9.
- **`result.trace` and the `after`-hook stream gain `Program` and `ExpressionStatement` entries on
  every evaluation**, including single-expression ones. Code that counts hook events or trace
  entries sees two more per walk.
- The visitor table is built once and frozen at first use rather than merged per `evaluate` call.
  Every evaluation is faster; the table is process-wide shared state.

### Fixed

- `pattern.ts` no longer writes the whole `EvalState` to the console on a destructuring path
  (`docs/backlog.md` B2). Three `console.*` calls remain in the published bundle, tracked as B3.

### Upgrading alongside `eval-signals` and `eval-forms`

**Upgrade both downstream packages with it**: `eval-signals` **0.1.1** and `eval-forms` **0.2.1**,
released alongside this one and documented above. `eval-signals` 0.1.0 and `eval-forms` 0.2.0
declare `"@zvenigora/ng-eval-core": "^0.3.0"`, which resolves to `>=0.3.0 <0.4.0` and therefore
**excludes** this release; installing 0.4.0 beside either of them raises a peer-dependency
conflict. The two patch releases widen the range and change nothing else.

Neither package was ever *incompatible* with 0.4.0 — both suites run against this evaluator on
every build and are green — so what the conflict reported was a declared range that had not caught
up. Both continue to support `eval-core` 0.3.0.

### `@zvenigora/ng-eval-signals` — one relaxation, no release

`eval-signals` is **not** re-released and its version is unchanged at 0.1.0; this is what its
existing code does once it resolves `eval-core` 0.4.0.

A signal context rejects writes to its keys with `SignalContextWriteError`. Because writes now
consult the scope stack first, **a write to a binding the expression itself created no longer
throws** — it mutates nothing the consumer owns. Measured, with `count` a signal in the source:

| Expression | with `eval-core` 0.3.0 | with `eval-core` 0.4.0 |
| ---------- | ---------------------- | ---------------------- |
| `count = 5` | throws `SignalContextWriteError` | **unchanged** — still throws |
| `(x => (x = 5))(1)` | throws `SignalContextWriteError` | `5` |
| `let count = 5; count` | n/a — statements did not evaluate | `5`, and the source's `count` is still `1` |

The read-only guarantee is intact: it covers the keys of the signal context, and an expression's own
bindings were never among them. This is a prerequisite for `for`'s `i++` to work inside a signal.

---

## [eval-forms 0.2.0] - 2026-09-06

Phase 6 of the [roadmap](ROADMAP.md): a third entry point, `@zvenigora/ng-eval-forms/signals`, driving Angular [Signal Forms](https://angular.dev/guide/forms/signals) field properties from **string** expressions resolved at runtime — the same proposition as `/reactive`, against Angular's schema-and-model API rather than `FormGroup`. Design, measurements and the questions it settles are in `docs/forms/phase-6-plan.md`; consumer documentation in the [package README](modules/eval-forms/README.md). **`/signals` requires Angular 22 or later.** `/reactive` is unchanged and the shared core changes only additively — one new export, `applyErrorPolicy`, called out below; both still work from Angular 19.

**Two things in this release reach a consumer who never imports `/signals`**, and they are named first because everything else lands behind an entry point that has no consumers yet — a reader skimming for "does this affect me" would otherwise reasonably conclude the released surface was untouched. They are the `peerDependencies` addition and `applyErrorPolicy`, both below.

### Added
- **⚠️ `acorn-walk ^8.3.0` in `peerDependencies`** — a manifest change to a published package, and the first of the two things that reach an existing consumer. **It imposes no new install**: a consumer of this package already peer-depends on `@zvenigora/ng-eval-core`, whose own peers include `acorn-walk ^8.3.0`, so npm 7+ has already placed it, and a strict consumer who satisfied `eval-core`'s peers by hand needs nothing further. It is declared because `/signals` imports `acorn-walk`'s `simple` directly, and an undeclared import resolves today by accident of hoisting and would not resolve at all under pnpm's isolated layout. `acorn` itself is deliberately **not** declared: this package imports no `acorn` symbol, and `acorn-walk` depends on it directly, so an `acorn` peer would be surface with no caller.
- **⚠️ `applyErrorPolicy(run, policy?)`** (core, at the primary entry point) — the second, and the only new export on the already-released surface. Runs `run` under an `ExpressionErrorPolicy` and **rethrows a `SignalContextWriteError` whatever the policy says**, because an expression that assigns is statically illegal on every recompute with every dataset and swallowing it under the default policy hands you a silent blank for a bug in the rule itself. It lives in the core rather than in `/signals` so that `/reactive`'s eventual version cannot drift from it and the two end up disagreeing about the one error that must never be swallowed. Deferred from 0.1.0's release notes as "a matching helper deferred to the `/signals` phase, which is its only caller" — it is still that caller's only use, but it is a permanent addition to a package at 0.1.0 and is called out as one.
- **`createExpressionRules(model, options?)`** (`/signals`): the primary API. A **factory**, not free functions, because Angular's `LogicFn` cannot recover the source — a rule on `p.city` evaluating `country === "US"` has no route to `country` from inside the callback, so the model must be closed over at registration. Returns `evalVisible`, `evalText` and `evalDisabled`, called from inside a `schema()` body beside Angular's own rules.
- **`disabled`, which `/reactive` does not ship.** Under Reactive Forms it means calling `control.disable()` — a write back into the form, an emission on `valueChanges` that re-enters a rule naming its own field, and a value removed from the parent aggregate. Under Signal Forms it is a schema rule over derived state and none of the three exists. `evalDisabled` takes a **static** `reason?: string`, never expression-derived: Angular's `when` returns `boolean | string` and a truthy string is *both* "disabled" and "the reason", so forwarding an expression's value raw would disable a field on the string `'false'` **with the reason `"false"`**.
- **`TEXT`** (`/signals`): the metadata key `evalText` writes through and `field().metadata(TEXT)` reads back. `text` has no dedicated Signal Forms primitive the way `hidden` and `disabled` do, so it is Angular's own `metadata` mechanism rather than a second one beside it.
- **`ExpressionRules` / `ExpressionRuleOptions`** (`/signals`): the three registrars' shape, and `{ eval?, onError? }` accepted at the factory and per registration, **registration winning per key** with no deep merge.
- **Prototype-shadowed identifiers are rejected at registration** (`/signals`). An expression naming an own property of `Object.prototype` — `constructor`, `toString`, `valueOf` and the nine others — throws, naming the expression and the identifier. Without it the identifier resolves off the prototype to a *function*, a function is truthy, and `evalVisible` renders precisely the field that has no data with nothing logged. The subject is the **expression**, not the field name: `/signals`' paths are compile-time tokens and the library never sees a name it could validate, which is the mirror image of `/reactive`'s construction-time name check.

### Notes
- **⚠️ `/reactive` and `/signals` now disagree about one authored string, deliberately.** `visible: "constructor"` throws under `/signals` and, under `/reactive`, binds cleanly and renders a data-less field — `/reactive` validates field and control *names*, never expressions. Closing the gap would make an expression that registers today start throwing, which is a breaking change to a released entry point, so it is logged as a question for a later major in [`ROADMAP.md`](ROADMAP.md) and is **not** decided here. Documented in the README from **both** sections, because the reader who does not know is the one reading `/reactive`'s.
- **Limitations at `/signals`, all documented in the README**: a schema **value** shared across models silently renders form B against form A's data, so the supported reuse shape is a schema *function* of the rules, called per form; `caseInsensitive` is in practice a **factory** option, since a per-registration value reaches the walk but not the factory's key memo or its context, and one expression then obeys two casing rules; the nested-signal diagnostic from `@zvenigora/ng-eval-signals` does not reach this entry point at all; the form's key set is not enumerable from upstream, deliberately; the identifier guard over-rejects a name an expression *binds* itself, deliberately; and the `SignalContextWriteError` bypass does **not** survive a call frame, so an assignment nested inside a call is routed by `onError` like any other failure and appears as a blank field.
- **There is no `destroy()` at `/signals`, and nothing to call one on.** No `EvalSignal` is created and nothing registers with a `DestroyRef`: Angular owns the field tree's lifetime and the rules die with the schema. This is the one place the two adapters differ in obligation rather than in API.
- **`readme-examples.spec.ts` now exists under both adapters**, executing this release's documented `/signals` examples as well as `/reactive`'s. It still runs the code rather than reading the markdown, and template and manifest blocks remain uncovered.
- Nothing was added to `@zvenigora/ng-eval-core` or `@zvenigora/ng-eval-signals`; both are consumed at their published surfaces.

---

## [eval-forms 0.1.0] - 2026-08-20

Phase 4 of the [roadmap](ROADMAP.md): the first release of `@zvenigora/ng-eval-forms`, which drives Angular form field properties from **string** expressions resolved at runtime — for schemas served by an API, authored in a form-builder UI, or versioned separately from the application. Design and rationale in `docs/forms/phase-4-plan.md`; consumer documentation in the [package README](modules/eval-forms/README.md), with a [worked example](docs/forms/worked-example.md). Requires `@angular/core >=19`, `@angular/forms >=19`, `rxjs ^7.8`, `@zvenigora/ng-eval-core ^0.3.0` and `@zvenigora/ng-eval-signals ^0.1.0`.

**If your conditions are known at compile time and you are on Angular 22, use Angular's own Signal Forms schema instead.** This library exists for the cases where the rule is not knowable when the application is compiled; the README says so first, before the API.

### Added
- **Two entry points, both shipped from one package.** `@zvenigora/ng-eval-forms` is the shared core and imports nothing from `@angular/core` or `@angular/forms`; `@zvenigora/ng-eval-forms/reactive` is the Angular Reactive Forms adapter. A `/signals` entry point for Signal Forms is designed (plan § 9) and not built — placing `/reactive` at the primary entry point now would have made adding it a breaking move of every symbol.
- **`bindFieldProperties(schema, group, options)`** (`/reactive`): the primary API. Validates the schema, mirrors the `FormGroup`, and returns a `FormBinding` — one `EvalSignal` per rule, recomputing when a control the rule actually *named* changes. `options.injector` is **required**: every signal it creates is built with an explicit injector and therefore takes no `DestroyRef` registration of its own, so an optional one would silently vary when teardown runs.
- **`FieldSchema`** (`/reactive`): `{ name, visible?, text? }`, and deliberately not a schema *language*. A field need not name a control.
- **`FormBinding`** (`/reactive`): `{ fields: Record<string, FieldProperties>; destroy(): void }`. One `destroy()` releases every property signal and both halves of the mirror; it is idempotent, and a `DestroyRef` registration on the caller's injector is the net under it rather than a substitute for calling it.
- **`FieldProperties`** (`/reactive`): `{ visible?: EvalSignal<boolean>; text?: EvalSignal<string> }` — `EvalSignal` rather than `Signal`, because both extra members are reachable API here: `invalidate()` is the documented hatch for a `{ emitEvent: false }` write and for a control-set change, and `destroy()` is what teardown counts.
- **`createControlSource(group, options)`** (`/reactive`): the mirror on its own, for callers composing contexts by hand. One subscription **per control, never to the group** — a disabled control is excluded from its parent's aggregate value and there is no `rawValueChanges`, so a group-backed mirror would lose a field the moment anything disabled it. The returned record holds live values behind accessors and must be passed by reference; `{ ...source }` flattens it and silently freezes every property built over the copy.
- **`createFieldContext(formSource, fieldSource, options?)`** (core): composes one `EvalContext` per field from a form-wide and a field-local source, as two live lookups rather than a joined record — so a key added to either source after construction resolves, with nothing to keep in sync.
- **`toVisible` / `toText`** (core): the two coercions. `visible` is JavaScript truthiness, so the string `'false'` is **visible**; `text` is `String(value)` with `null` and `undefined` mapping to `''`, so `0` stringifies to `'0'` rather than blanking.
- **`ExpressionErrorPolicy`** (core): `'throw' | 'undefined' | ((error) => unknown)`. **The default is `'undefined'` — the opposite of `eval-signals`' default**, because the expression's author may be an end user rather than the developer, and the right response to a bad rule is a field that does not render. A matching `applyErrorPolicy` helper is deferred to the `/signals` phase, which is its only caller.
- **Construction-time schema validation.** A duplicate field name, a non-string rule, a name that is a member of `Object.prototype`, and a control that is not a `FormControl` all throw from `bindFieldProperties`. The prototype check is the one no other layer can make: `FormGroup` accepts a control named `constructor`, and an expression naming it reads the prototype's value — a function, which is truthy — so `visible` would render precisely the field that has no data, with no error anywhere.

### Changed
- **⚠️ `bindFieldProperties` returns `FormBinding`, not a bare `Record<string, FieldProperties>`.** The only shape change to an exported symbol in this release, and it is called out rather than folded into "adds the `/reactive` adapter" — nothing has been published, so no released shape breaks, but the entry exists so the change is found by reading. `destroy()` is nested under `fields` rather than written onto the record because the record's keys are *field names*, `destroy` is a legal one, and those names arrive from a server: a flat shape would put a silent collision between the consumer's data and this library's API in the one case where the consumer controls the names least.

### Notes
- **Limitations, all documented in the README**: a `{ emitEvent: false }` write freezes a property until `invalidate()` (the observable is the only signal there is); the *key set* is not reactive, so `addControl` / `removeControl` needs one `invalidate()` on the rules that name the affected key; those same methods called with `{ emitEvent: false }` suppress `group.events` and have **no** hatch; an empty `FormControl` is indistinguishable from an absent key; and the binding must be constructed outside a reactive context, since `toSignal` opens with `assertNotInReactiveContext`.
- **Deferred deliberately**: `disabled` (it writes back into the form, it emits on `valueChanges` so a rule naming its own field re-enters its own input, and it removes the value from the parent aggregate); `required` and validators; form-state keys (`touched` / `dirty` / `valid`); `FormArray` and nested `FormGroup`, which are rejected at bind time rather than left to misbehave.
- **`peerDependencies` are per package, not per entry point**, so the manifest declares one range at the floor. `/reactive` works from Angular 19; when `/signals` ships it will need Angular 22, and an older consumer importing it gets `Cannot find module '@angular/forms/signals'` from Angular's own `exports` map. Narrowing the manifest to `>=22` would add no diagnostic and would break every Reactive Forms consumer on 19–21.
- **`readme-examples.spec.ts` executes the runnable examples** in the README and the worked example, so a documented example that stops working fails the suite. Template and manifest blocks are not covered, and it is narrower than the documented-symbol drift gate the roadmap still defers: it runs the code, it does not read the markdown.
- Nothing was added to `@zvenigora/ng-eval-core` or `@zvenigora/ng-eval-signals`; both are consumed at their published surfaces.

---

## [eval-signals 0.1.0] - 2026-08-15

Phase 3 of the [roadmap](ROADMAP.md): the first release of `@zvenigora/ng-eval-signals`, which turns an expression plus a context of signals into an Angular `Signal`. Design and rationale in `docs/signals/phase-3-plan.md`; consumer documentation in the [package README](modules/eval-signals/README.md). Requires `@angular/core >=19` and `@zvenigora/ng-eval-core ^0.3.0`.

### Added
- **`createEvalSignal(expression, source, options?)`**: The primary API. Compiles the expression once and returns an `EvalSignal` that recomputes when a signal-backed key the expression **read** changes — `shipping.set(0)` does not recompute `'price * quantity'`. The tracking is Angular's own rather than this library's: the walk is synchronous and a context read ends in a signal call, so running it inside a `computed()` records the dependency natively, per key. Each recompute gets a fresh `EvalState` while the `EvalContext` is built once and reused, which is what makes per-key tracking possible.
- **`createSignalContext(source, options?)`**: The context adapter on its own, for callers driving `EvalService` directly. Builds an `EvalContext` whose reads resolve through signals via a `lookups` resolver. Warns in dev mode about one-level nested signals (`{ user: { name: signal('a') } }`), a shape that tracks nothing.
- **`EvalSignalService`**: The DI-first entry point, for callers outside an injection context where the free function would throw `NG0203`. It supplies an injector and forwards everything else unchanged.
- **`EvalSignal.dependencies`**: Behind `trackDependencies`, the dotted paths the last recompute read, built on `eval-core` 0.3.0's `createDependencyTracker()`. A plain getter rather than a signal, so reading it neither triggers a recompute nor subscribes to one. Off by default because a registered read hook costs key resolution at every read site. Combining it with your own `eval.hooks` registry throws at construction rather than installing a hook into a registry the library does not own.
- **`EvalSignal.invalidate()`**: The escape hatch for a source with no reactive surface. Coarse by design and collapsing — three calls between two reads produce one recompute.
- **`EvalSignal.destroy()`**: Drops the compiled callback, the context and the recorded dependencies, and releases the `DestroyRef` registration. Idempotent; a destroyed signal reads `undefined` from that moment rather than from the next dependency change, and `invalidate()` afterwards is a no-op. Auto-teardown comes from the **ambient** injection context only: `options.injector` — which `EvalSignalService.create` always supplies — resolves services and does not scope lifetime, so those signals must be destroyed by hand.
- **`EvalSignalOptions`**: `eval` (forwarded to both the context and the walk, so `caseInsensitive` is set once), `equal`, `onError` (`'throw'` | `'undefined'` | mapper), `trackDependencies`, `injector`.
- **`SignalContextWriteError`**: The keys of a signal context are read-only; an assignment throws this, naming the key and the expression. It bypasses `onError` in every mode — an illegal assignment is a static property of the expression, not a runtime failure to render around.

### Notes
- **No async primitive.** An expression that calls an async function yields a signal carrying the **promise**, which composes with `resource({ params: () => sig(), loader: ({ params }) => params })` — the read must go in `params`, since a loader body runs untracked. `createEvalSignalAsync` is deferred to Phase 5; see the roadmap and the README's limitations.
- **Known limits**, all documented in the README: closures that escape an evaluation are not tracked, a member write (`user.name = 'x'`) bypasses the read-only policy, `SignalContextWriteError.key` is `undefined` under `caseInsensitive`, and nested signals are tracked only at the level that holds the signal.
- Nothing was added to `@zvenigora/ng-eval-core`, which is consumed at its published 0.3.0 surface.

---

## [0.3.0] - 2026-08-10

Phase 1 of the [roadmap](ROADMAP.md): a generic evaluation hook API, the prerequisite for the planned `eval-signals` and `eval-forms` libraries. Design and rationale in `docs/side-effects/phase-1-plan.md`; consumer documentation in the [package README](modules/eval-core/README.md#evaluation-hooks).

### Added
- **Evaluation Hooks (`EvalHooks`)**: A node-type-keyed hook registry with wildcard (`'*'`) support, reached through `EvalState.hooks`. `on('before' | 'after', type, hook)` fires around each visitor body and returns an unsubscribe; every one of the 19 visitors dispatches through it. Registration is per-`EvalState`, so hooks never leak between evaluations even though `EvalService` is `providedIn: 'root'`.
- **Read Hooks (`onRead`)**: Fire once per resolved context read, reporting the key **as the context resolved it** — case-corrected under `caseInsensitive`, and exact for computed members — which the AST node alone cannot provide. Events carry `kind`, `key`, `target`, `value`, a best-effort dotted `path`, and `scoped`, which flags a read that resolved to a scope pushed *during* the evaluation (an arrow-function parameter) rather than a real dependency.
- **Built-in hooks**: `createDependencyTracker()` yields a resettable dependency set per evaluation, filtering scoped reads and any path rooted at one; `createTimingHook()` accumulates per-node-type timings.
- **`trackTime` option**: Accumulates per-node-type timings on the state, read back as `EvalState.nodeTimings`. Note this registers a hook, so it makes the walk dispatch per node; `EvalResult.duration` remains the free walk-level total.
- **Hook error policy**: `onHookError` selects `'collect'` (default — a faulty hook cannot break the evaluation it observes), `'throw'`, or `'ignore'`. Collected errors are read from `EvalState.hookErrors`. `ASYNC_HOOK_MESSAGE` is exported so a hook that returned an un-awaited promise can be told apart from an error the hook itself threw.
- **`EvalState` members**: `hooks`, `hasHooks`, `hookErrors`, `nodeTimings`, and `resetHookBookkeeping()`.
- **`EvalContext` queries**: `getFromScopes()` and `hasInScopes()`.

### Changed
- **⚠️ `EvalHookError.phase` widened to `EvalHookPhase | 'read'`**: **The one non-additive change in this release.** Read hooks report errors through the same channel as node hooks, so the phase is no longer just `'before' | 'after'`. Nothing shipped before this version, so no released shape is broken — but a `switch (e.phase)` written against the two-value type will not be exhaustive, and this note is here so that is discovered by reading rather than at runtime. Everything else in this release is purely additive.
- **Hook dispatch is balanced across throws**: `before`/`after` stay paired on every exit path, including the ones an exception takes. A synthesised `after` carries `completed: false` and no `value`, from two distinct sources — the unwinder, which supplies the `error`, and an enclosing visitor closing without its child, which supplies **no** error on an evaluation that may still succeed. **Presence of `error` is the discriminator**, not `completed === false`.
- **`ngOnDestroy` releases hook state**: `EvalService` now clears each tracked state's hook registrations and resets its hook bookkeeping, so a long-lived caller-owned registry cannot pin destroyed states or their AST nodes. This covers the states `EvalService.createState` produced — the ones the service tracks. States built elsewhere (`CompilerService.createState`, or `EvalState.fromContext` directly) are not tracked and are not cleared, so this is not a general guarantee about every state in an application.

### Deprecated
- **`RecursiveVisitorState` and `RecursiveVisitorResult`**: Superseded by `EvalHooks` / `EvalState` / `EvalResult`. Nothing in the library implements them, and shipping them beside the new API would publish two contradictory hook vocabularies: their `beforeVisitors` / `afterVisitors` entries are typed to return `number | undefined` — the last trace of a timing stub the library no longer has — while `EvalNodeHook` mandates `void`. Both remain exported so this release stays additive; removal is a follow-up for the next breaking version.

---

## [0.2.5] - 2026-08-03

### Changed
- **Nx Monorepo Upgrade**: Migrated Nx tooling from **v22.1.3** to **v23.1.1**, bringing Angular to **v22.0.8**, TypeScript to **v6.0.3**, and Jest to **v30.3.0**. Ran the full `nx migrate` flow (47 automatic codemods) plus the migrations Nx deferred to manual review.
- **ESLint v9 Flat Config**: Converted `.eslintrc.json`/`.eslintignore` to `eslint.config.mjs` at the root and in `eval-core`, replacing the generator's `FlatCompat` shims with flat-native config (the Angular inline-template shim was fully redundant with `@nx/eslint-plugin`'s `flat/angular` preset).
- **Inferred Nx Targets**: Converted the `eval-core` project's `lint` and `test` targets from the deprecated `@nx/eslint:lint` / `@nx/jest:jest` executors to Nx's inferred targets (`@nx/eslint/plugin`, `@nx/jest/plugin` registered in `nx.json`), removing the executor deprecation warnings scheduled for Nx v24.
- **Angular Change Detection**: Applied Angular v22's `change-detection-eager` migration, adding an explicit `ChangeDetectionStrategy.Eager` to `EvalCoreComponent` to preserve its pre-v22 default behavior.

### Fixed
- **Jest `isolatedModules`**: Removed from `eval-core`'s `tsconfig.spec.json` after confirming it broke typecheck (TS1205 on re-exported types) and isn't needed for this single-project workspace.

---

## [0.2.4] - 2026-08-02

### Note
- Version bump with no recorded changelog entry at the time; folded into the [0.2.5] migration work above.

---

## [0.2.3] - 2026-08-01

### Added
- **Repository Audit & Remediation Plan**: Comprehensive documentation detailing codebase audit (`docs/repository-audit.md`) and remediation execution steps (`docs/remediation-plan.md`).
- **Archive Script**: Command script (`ng-eval-archive.cmd`) for project archiving (`2026-01-02`).

### Fixed
- **Dependency Security**: Added package overrides for `qs` dependency resolving security vulnerabilities in `package-lock.json` (`2026-01-02`).
- **Angular Peer Dependencies**: Cleaned up `peerDependencies` in `@zvenigora/ng-eval-core` by removing unused `@angular/common` dependency (`2026-08-01`).
- **Angular Dependency Injection**: Refactored `CompilerService`, `DiscoveryService`, and `EvalService` to use Angular's modern `inject()` functional dependency injection paradigm (`@angular-eslint/prefer-inject`).
- **Repository Hygiene**: Removed loose root debug scripts (`debug-ast.js`, `debug-proto.js`, `debug-prototype.js`) and cleaned up stale notes.

---

## [0.2.2] - 2025-11-30

### Changed
- **Angular Framework Upgrade**: Upgraded Angular framework and dependencies to **v20.x** (v20.1.2 / Angular 20).
- **Nx Monorepo Upgrade**: Updated Nx tooling to **v22.x** (`22.0.0-beta.6`).
- **ESLint & Guidelines**: Updated ESLint rules and guidelines for Nx workspace compatibility (`AGENTS.md`).

### Fixed
- **Repository URL**: Standardized repository URL format across `package.json`.

---

## [0.2.1] - 2025-11-30

### Added
- **Angular 19 Support**: Updated peer dependencies across packages to officially support Angular 19+ (`>=19.0.0`).
- **Nx Tooling**: Upgraded build tooling to **Nx 21.4.0** and **Angular 19.2.14** (`2025-08-20`).

### Fixed
- **ESLint Compliance**: Resolved ESLint errors following the Angular 19 migration.
- **Documentation**: Enhanced README descriptions and added automated attribution notes.

---

## [0.2.0] - 2025-08-20

### Added
- **LRU Property Lookup Caching**: Implemented LRU cache for property lookups, optimizing lookup performance from $O(n)$ to $O(1)$.
- **Enhanced Visitors**: Refactored `MemberExpressionVisitor` with cached property lookups and case-insensitive resolution.
- **Security Hardening**:
  - Comprehensive prototype pollution prevention (`__proto__`, `constructor`, `prototype` protections).
  - Call expression execution security and strict scope boundary enforcement.
  - Enhanced binary expression type safety and arithmetic error handling.
  - Safe, guarded asynchronous expression evaluation and stack error tracking.
- **Memory Management**: Cross-platform memory manager compatibility and leak fixes.
- **Performance Test Suite**: Added benchmark validation test suite ensuring 100% regression-free performance across all 511 unit tests.

---

## [0.1.102] - 2024-01-03

### Added
- **Expression Support**: Added support for arrow function expressions, update expressions, assignment expressions, object expressions, template literals, tagged templates, `new` expressions, `this` binding, logic expressions, arrays, and unary operations (`2023-12`).
- **AST Parsing & Caching**: Added caching mechanisms to `ParserService` utilizing `js-sha256` hashing and Acorn parser integration (`2023-12-02`).
- **Evaluation State & Trace**: Introduced `EvalState`, `EvalContext`, `EvalOptions`, `EvalResult`, and evaluation trace logging.
- **Case-Insensitive Evaluation**: Added optional case-insensitive property lookup support across scope registries.
- **Documentation**: Documented visitor pattern, evaluation functions, core services, and common AST model classes (`docs/`).

---

## [0.1.0] - 2023-11-26

### Added
- **Initial Commit**: Core `@zvenigora/ng-eval-core` library initialization and basic AST evaluation engine (`2023-11-26`).
- **Angular Integration**: Basic Angular services and Angular plugin integration setup.
- **Public API**: Initial release of scope, parser, and visitor architecture.
