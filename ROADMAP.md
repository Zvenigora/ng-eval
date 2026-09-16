# Roadmap

This document tracks planned functional additions to ng-eval and how they should be
distributed across packages/repositories.

**Deferred work is not in this file.** Defects recorded rather than fixed, decisions logged
rather than made, and gaps in what the suite can catch all live in
[`docs/backlog.md`](docs/backlog.md), which is the single register for them. This file plans
**phases** — new capability, in order. See "Deferred work" at the end.

## Modules vs. new repositories

**Recommendation: add new Nx libraries under `modules/` in this repo, not new repositories.**

The workspace is already an Nx monorepo (`modules/eval-core`, `nx.json`, per-project
`ng-packagr` builds) with room for more libraries — that structure gives most of the
benefit people usually split repos for, without the cost:

- **Independent publishing is already solved.** Each `modules/*` lib gets its own
  `package.json` and is built/published separately (`@zvenigora/ng-eval-core` today).
  A consumer who only wants the evaluator never pulls in Angular Forms or Signals
  peer dependencies just because they live in the same repo.
- **Boundaries can be enforced without repo separation.** Nx module-boundary lint
  rules (tags on each `project.json`) can forbid `eval-core` from depending on the
  new libs, while still allowing atomic PRs that touch both sides of an API during
  co-design.
- **The early phases below require lock-step changes.** The hook/dependency-tracking
  API that signals and forms will consume doesn't exist yet — it will change shape
  as those two consumers are built against it. That's painful across repos (constant
  version bumps just to keep them buildable) and trivial in one repo (one PR, one CI run).
- **Shared tooling is free here.** ESLint config, Jest preset, TS base config, and
  CI already apply workspace-wide; three new repos would each need to bootstrap and
  maintain their own.

Reconsider splitting a module into its own repository later if any of these become
true: a different maintainer/team takes ownership of it, it needs a release cadence
that's decoupled from core, or its CI/build cost starts materially slowing down the
shared workspace. None of that applies yet.

### Proposed layout

| Package | Module dir | Depends on | Purpose |
|---|---|---|---|
| `@zvenigora/ng-eval-core` | `modules/eval-core` (existing) | — | Parsing, evaluation engine, visitors |
| `@zvenigora/ng-eval-signals` | `modules/eval-signals` (new) | `eval-core` | Reactive/signal-backed expression evaluation |
| `@zvenigora/ng-eval-forms` | `modules/eval-forms` (new) | `eval-core`, `eval-signals` | Expression-driven dynamic form metadata |

## Phases

### ✅ Phase 1 — Generic evaluation hooks / side effects (`eval-core`) — **done**

Shipped in `@zvenigora/ng-eval-core` **0.3.0**. Design, findings, and the step-by-step
execution record are in [`docs/side-effects/phase-1-plan.md`](docs/side-effects/phase-1-plan.md);
§ 9 of that document is the contract Phase 3 and 4 build on, and § 9.1 is required reading
before treating a read event's `target` as a dependency key. Consumer documentation is the
"Evaluation hooks" section of the [package README](modules/eval-core/README.md#evaluation-hooks).

What landed: `EvalHooks`, a node-type-keyed registry with wildcard support, reached through
`EvalState.hooks`; `before`/`after` node hooks dispatched by every visitor; `onRead` hooks
carrying the *resolved* (case-corrected) key, which is what dependency tracking needs;
`createDependencyTracker()` and `createTimingHook()` as built-ins; a collect-by-default hook
error policy read back from `EvalState.hookErrors`. Hooks are synchronous by contract — the
walk is synchronous even under `evaluateAsync` — and observers only: § 8 records why
short-circuiting hooks were deliberately deferred.

The original plan for this phase follows, for the record.

Generalize the existing (currently timing-only) `beforeVisitor`/`afterVisitor` hooks
in `modules/eval-core/src/lib/internal/visitors/{before,after}-visitor.ts` into a
public, user-registerable hook API: callbacks invocable per node type (or globally)
during evaluation, with access to `EvalState`.

This is the prerequisite for Phase 3 and 4, not just a nice-to-have: both dynamic
forms and dynamic signals need to know *which identifiers/members an expression read*
so they can re-run it when a dependency changes. That's naturally built as a hook
that records reads during `identifierVisitor`/`memberExpressionVisitor` execution.

Key design questions:
- Hook granularity: per-node-type callbacks vs. a single dispatcher with node type as arg.
- Sync vs. async hooks (evaluation already has sync/async code paths — see
  `evaluate.ts` / `evaluateAsync`).
- Whether hook errors abort evaluation or are swallowed/logged.

Exit criteria: public API to register/unregister hooks; a "record dependencies read
during evaluation" example built on it; tests; docs.

### ✅ Phase 2 — Statement support: `let`, `if`, `for` (`eval-core`) — **done**

**Shipped in `@zvenigora/ng-eval-core` 0.4.0.** Seven visitors — `Program`,
`ExpressionStatement`, `EmptyStatement`, `BlockStatement`, `VariableDeclaration`, `IfStatement`
and `ForStatement` — under the completion-value convention of
[`docs/statements/phase-2-plan.md`](docs/statements/phase-2-plan.md) § 3.1. The plan is the design
record; [`docs/statements/summary.md`](docs/statements/summary.md) is the retrospect, and the
[CHANGELOG](CHANGELOG.md) carries the migration note.

**Two things the sketch below got wrong, both recorded because they shaped the phase**:

- **No completion record was needed.** The sketch anticipated "a sentinel/completion value bubbled
  through `EvalState`". With abrupt completion (`break`, `continue`, `return`, `throw`) out of
  scope, nothing needs to bubble: an `if` that takes no branch simply pushes `EMPTY_COMPLETION` and
  returns. Per-walk mutable state on `EvalState` would also have collided with the re-entrant
  `evaluate()` in `arrow-function-expression.ts`. The stack discipline has no such coupling.
- **Statements were not unsupported — they were silently mis-evaluated.** The sketch reads as
  though statements did nothing. They were walked as expressions: `throw 1` evaluated to `1` and
  threw nothing, `if (a) { 1 } else { 2 }` walked **both** branches and returned the wrong one. That
  made the phase a behavioural release rather than an additive one, which is the whole shape of its
  CHANGELOG entry.

**Left out deliberately**: `while`, `do`/`while`, `for...of`, `for...in`, `switch`, `try`, labels,
function and class declarations, `var`, and everything implying abrupt completion. All now throw
`Unsupported statement type: <type>` instead of returning an accidental value.

Opened along the way: [A11](docs/backlog.md#a11), [A12](docs/backlog.md#a12),
[F12](docs/backlog.md#f12) and [F13](docs/backlog.md#f13). Resolved:
[A9](docs/backlog.md#a9) and [B2](docs/backlog.md#b2) **Fixed** in step 0,
[E6](docs/backlog.md#e6) **Retired — fixed** in step 1.

<details>
<summary>The original sketch, kept for the record</summary>

Acorn already parses full `Program`s with statements — `parse.ts` calls `acorn.parse`
and only *narrows* to a single expression when `extractExpressions` is set
(`extractExpression()` in `parse.ts`). The evaluator itself, however, only ever
walks a single `Expression` node; there are currently no visitors for `Program`
(as a statement list), `VariableDeclaration`, `IfStatement`, `ForStatement`, or
`BlockStatement`.

This is a bigger step than adding one more expression visitor, because statements
introduce **control flow** that the current visitor-returns-a-value model
(`walk.recursive` + `popVisitorResult`) doesn't have a place for yet:

- `if`/`for` need a way to short-circuit ("skip the rest of the block") — likely a
  sentinel/completion value bubbled through `EvalState`, similar in spirit to how
  `eval-result.ts`/`eval-trace.ts` already track execution state.
- `for`/`let` need block-scoped bindings. `EvalScope` (`eval-scope.ts`) currently
  models a flat set of prior scopes with `get`/`set`, not nested lexical block
  scopes — introducing a scope per block/iteration needs design, not just a new
  visitor.
- Decide initial scope of `for`: classic `for (let i = ...)` first; `for...of` /
  `for...in` can follow once the loop-completion mechanism exists.

**This phase opens with a step 0**, because statements widen two paths that already carry
defects. See [`docs/backlog.md`](docs/backlog.md#phase-2-preconditions) § "Phase 2
preconditions" for the argument and for why two further entries are *not* preconditions.

- **Step 0 — [BL-A9](docs/backlog.md#a9) and [BL-B2](docs/backlog.md#b2), one session.** A9 is
  the missing `try`/`finally` at both scope-push sites: block scoping means a scope per block
  per iteration, so a `for` body that throws leaks one per iteration, and the five new visitors
  below would copy whatever idiom the two existing sites set. B2 is a `console.log` of the whole
  `EvalState` sitting in a branch that destructuring declarations make reachable.
- **[BL-E6](docs/backlog.md#e6) is a design constraint of this phase, not a step ahead of it.**
  Bounding `exit`'s scan with a mark and choosing the loop-completion mechanism are one
  decision; this phase's plan document owns both.

Exit criteria: `VariableDeclaration` (`let`/`const`), `IfStatement`, `BlockStatement`,
classic `ForStatement` visitors; multi-statement `Program` evaluation; tests mirroring
the existing per-visitor test style; README "ESTree Nodes Supported" updated.

</details>

### ✅ Phase 3 — `@zvenigora/ng-eval-signals` (new module) — **done**

Shipped as `@zvenigora/ng-eval-signals` **0.1.0**. Design, findings and the step-by-step
execution record are in [`docs/signals/phase-3-plan.md`](docs/signals/phase-3-plan.md);
consumer documentation is the [package README](modules/eval-signals/README.md).

What landed: `createEvalSignal(expression, source, options?)`, which compiles once and
returns a `Signal` recomputing exactly when a signal-backed key the expression **read**
changes; `createSignalContext`, the context adapter that resolves reads through signals via
`lookups`; `EvalSignalService` for callers outside an injection context; `EvalSignal`'s
`dependencies` introspection (built on Phase 1's `createDependencyTracker`), `invalidate()`
for sources with no reactive surface, and `destroy()` with ambient-only `DestroyRef`
teardown; and `SignalContextWriteError`, the read-only write policy. Nothing was added to
`eval-core`, which is consumed at its published 0.3.0 surface.

The design finding worth carrying forward: **Angular already does the dependency tracking**.
The walk is synchronous, so an evaluation driven from inside a `computed()` records each
context read natively, per key — this library never computes a dependency set to decide when
to recompute, and the tracker is introspection only.

The original framing follows, unchanged.

Wrap compiled expressions as Angular `signal()`/`computed()` values that
automatically re-evaluate when their tracked dependencies (per Phase 1) change,
instead of requiring the caller to manually re-run `simpleEval` on every change.

Depends on Phase 1's dependency-tracking hook. Doesn't need Phase 2 (statements) —
signals only need expression evaluation, not `let`/`if`/`for`.

Key design questions:
- What "dynamic creation of signals" means concretely: a factory
  `createEvalSignal(expr, context)` returning a `Signal<unknown>`? A directive?
- How context mutations become signal writes/updates (context is currently a plain
  object/`Registry`, not signal-based — see `context.ts`).
- Angular version/peer-dep constraints (signals require a minimum Angular version;
  check against this repo's current Angular 22 devDependency).

Exit criteria: public factory API, a worked example, tests, and a README for the
new package following the existing `modules/eval-core/README.md` pattern.

**Async evaluation as a signal is not part of this phase** — its step 5 deferred it
to Phase 5 below, on the evidence in
[`docs/signals/phase-3-plan.md`](docs/signals/phase-3-plan.md) § 3.7.

### ✅ Phase 4 — `@zvenigora/ng-eval-forms` (new module) — **done**

Shipped in `@zvenigora/ng-eval-forms` **0.1.0**, as two entry points from one package:
the core (`@zvenigora/ng-eval-forms`) and the Reactive Forms adapter
(`@zvenigora/ng-eval-forms/reactive`). Design, findings and the step record are in
[`docs/forms/phase-4-plan.md`](docs/forms/phase-4-plan.md); consumer documentation is the
[package README](modules/eval-forms/README.md) and the
[worked example](docs/forms/worked-example.md).

What landed: `bindFieldProperties`, which validates a field schema, mirrors a flat
`FormGroup` per control, and returns a `FormBinding` of `EvalSignal`s that recompute per
key; `createControlSource` and `createFieldContext` as the two halves of that on their own;
`toVisible` / `toText` and an `ExpressionErrorPolicy` defaulting to `'undefined'` rather
than `'throw'`, because the rule's author may be an end user. Nothing was added to
`eval-core` or `eval-signals`.

**Three narrowings against the exit criteria below**, each a narrowing of *scope* and not of
design — all three are additive when they arrive, and none of them is claimed complete:

1. **`disabled` is deferred**, though the opening paragraph of this phase lists it.
   `disable()` emits on `valueChanges` by default, so a rule naming its own field re-enters
   its own input and whether that converges depends on the expression; it is also a write
   back into the form rather than derived state, and it removes the value from the parent
   aggregate. It is a better fit for the `/signals` entry point in Phase 6, where Angular
   owns the semantics — see [`docs/forms/phase-4-plan.md`](docs/forms/phase-4-plan.md)
   § 3.6.
2. **Expressions name field *values* only.** "Expressions over form state" in the opening
   sentence reads wider than what shipped: `touched` / `dirty` / `valid` / `status` are not
   addressable. The shape they should take is unresolved rather than merely unbuilt (plan
   § 3.5.6, open question 8.2), and real conditional-visibility rules read sibling values.
3. **Flat forms only.** The worked example, and the library, cover a `FormGroup` of
   `FormControl`s; `FormArray` and nested `FormGroup` are rejected at bind time rather than
   documented as unsupported (open question 8.5). A `FormArray` raises a per-row naming
   problem the current two-level context composition has no third level for.

The original plan for this phase follows, for the record.

Expression-driven dynamic form metadata: field properties like `visible`, `text`,
`disabled`, `required` defined as expressions over form/context state and kept
up to date reactively.

Depends on Phase 3 (each dynamic field property is naturally an `eval-signal`) and
therefore transitively on Phase 1. Building this directly on raw hooks without
Phase 3 would mean re-deriving the same dependency-tracking-to-reactivity plumbing
signals already provides.

Key design questions:
- Integration point: Angular Reactive Forms (`FormGroup`/`FormControl`) vs. a
  standalone schema-driven renderer.
- Which field properties ship first — `visible` and `text` (from the original ask)
  are good candidates since they're pure derived state; validators are more
  involved (they affect form validity, not just presentation) and can follow.

Exit criteria: schema shape for a dynamic field, `visible`/`text` support wired to
Reactive Forms, a worked example, tests, README.

### Phase 5 — Async expression signals (`eval-signals`)

Deferred out of Phase 3 by its step 5, with the reasoning and the evidence in
[`docs/signals/phase-3-plan.md`](docs/signals/phase-3-plan.md) § 3.7. `eval-core` has had an
async evaluation path since before Phase 1 (`evaluateAsync` / `compileAsync` / `callAsync`)
that Phase 3 does not surface as a signal: it returns a `Promise`, so an **unwrapped** async
signal cannot be a `computed()` (Phase 3, finding 1.2.8), and a driver that is not a
`computed()` reopens the tracking model the whole signals library rests on.

**Nothing is blocked on it.** Phase 4's field properties are derived state, not async work.
And a consumer who only needs the promise already has it: for a promise-returning expression
the sync `createEvalSignal` carries the promise as its value, to unwrap in their own
application at their own Angular floor rather than one this library imposes. The working
composition is `resource({ params: () => evalSig(), loader: ({ params }) => params })` — the
signal is read in `params`, because a `resource`'s loader body runs `untracked` and a read
there yields a resource that never reloads; `toSignal` and `rxResource` take an `Observable`
and need `from(promise)` first. Three gaps remain, and they are why this is an escape hatch
rather than the feature: no `await` inside an expression, no resolution of promises nested in
a result, and `onError` never sees a rejection.

Key design questions, all inherited from § 3.7 and none costed:

- Shape: `resource()` / `rxResource()` versus `signal()` plus an `effect`. The first is
  idiomatic and pins the peer range to `resource`'s stable floor, above the `>=19` that
  `eval-signals` deliberately shares with `eval-core`; the second is manual and carries no
  such cost.
- Whether per-key tracking survives the shape at all. Angular tracks the *synchronous* walk,
  and `resource`'s loader runs outside the reactive context by design.
- First-read value; staleness and out-of-order resolution; how a rejection reaches
  `onError`, whose current contract is a `computed`'s rethrow-on-read; cancellation at
  `destroy()`; and what `dependencies` reports with more than one run in flight.
- **Where the arrow-scope containment goes.** `eval-signals` restores the context's scope
  depth in a `finally` around a *synchronous* `call` (phase-3 plan § 3.8.3); under `callAsync`
  the correct restore point depends on where the walk ends relative to the promise. This is
  the one open question with a correctness consequence — the context is reused for the life of
  the signal, so an uncontained leak permanently shadows a source key. Fixing
  [BL-A9](docs/backlog.md#a9) in `eval-core` would remove the question rather than answer it.
- The spec harness: every reactivity assertion in `eval-signals` is a recompute count around a
  synchronous read, and effects are scheduled.
- Three gaps the sync path leaves for it to close: an expression cannot use `await`, promises
  nested inside a result are resolved only by `evaluateAsync`, and a rejection bypasses
  `onError`. The first is a parser-options question rather than evaluator work — `awaitVisitor`
  is written and registered, and what throws is `defaultParserOptions`' `ecmaVersion: 2020`
  with acorn's `allowAwaitOutsideFunction` off below 2022.

Depends on Phase 3. Exit criteria: those questions answered in a plan document of its own,
then either the primitive with tests, README and CHANGELOG entries, or a second recorded
decision not to ship it.

### ✅ Phase 6 — the `/signals` entry point (`eval-forms`) — **done**

Shipped in `@zvenigora/ng-eval-forms` **0.2.0**, as a second entry point,
`@zvenigora/ng-eval-forms/signals`. Design, findings and the step-by-step execution record
are in [`docs/forms/phase-6-plan.md`](docs/forms/phase-6-plan.md); consumer documentation is
the `/signals` section of the [package README](modules/eval-forms/README.md).

What landed: `createExpressionRules(model, options?)`, a factory rather than free functions —
Angular's `LogicFn` cannot recover the source a rule closes over, so the model must be bound
at registration — returning `evalVisible`, `evalText` and `evalDisabled` for use inside a
`schema()` body; `TEXT`, the metadata key `evalText` writes through and
`field().metadata(TEXT)` reads back; `evalDisabled`'s **static** `reason?` parameter, since
Angular's `when` treats a truthy string as both "disabled" and "the reason"; a
prototype-shadowed-identifier guard enforced at registration, the mirror image of
`/reactive`'s construction-time name check; and, on the already-released surface,
`acorn-walk ^8.3.0` as a declared peer (no new install for an existing consumer, since
`eval-core`'s own peers already place it) and `applyErrorPolicy` in the core, which rethrows
`SignalContextWriteError` regardless of policy.

**Narrowings, all documented in the README**: `/signals` and `/reactive` now deliberately
disagree about one authored string — `visible: "constructor"` throws under `/signals` and
renders cleanly under `/reactive` — logged as [BL-D2](docs/backlog.md#d2) for a later major
rather than resolved here; a schema **value** shared across models silently renders form B
against form A's data, so reuse must go through a schema *function* of the rules;
`caseInsensitive` is in practice a factory-wide option, not a per-registration one
([BL-D3](docs/backlog.md#d3)); the nested-signal diagnostic from `eval-signals` does not reach
this entry point; the form's key set is not enumerable from upstream; the identifier guard
over-rejects a name an expression binds itself; the `SignalContextWriteError` bypass does not
survive a call frame ([BL-A6](docs/backlog.md#a6)); and there is no `destroy()` at `/signals`
— Angular owns the field tree's lifetime and the rules die with the schema.

The original plan for this phase follows, unchanged.

The second adapter of `@zvenigora/ng-eval-forms`: the same runtime-string rules, driving
**Angular's Signal Forms** (`@angular/forms/signals`) instead of Reactive Forms. Designed on
paper in [`docs/forms/phase-4-plan.md`](docs/forms/phase-4-plan.md) § 9 and deliberately not
built in Phase 4. There is no `modules/eval-forms/signals/` yet; what Phase 4 put in place
is the arrangement that makes adding one non-breaking — the shared core at the *primary*
entry point and the adapter at a subpath, so a second adapter is a new subpath rather than a
move of every exported symbol.

The whole adapter is a translation from a string to a `LogicFn`, and § 9's sketch is the
shape. Four things make it a phase rather than an afternoon:

- **The source comes from the consumer's model signal, not from `ctx.valueOf`.**
  `RootFieldContext.valueOf` takes a `SchemaPath` — a compile-time token — and there is no
  string → `SchemaPath` mapping, which is the whole problem this library exists for. This is
  why the Phase 4 core accepts a plain `SignalContextSource` rather than anything
  forms-shaped.
- **`text` goes through `createMetadataKey`**, Signal Forms' own per-field derived data,
  rather than a second mechanism beside it. `visible` inverts to `hidden`.
- **`disabled` becomes available**, and is the reason it is deferred rather than dropped in
  Phase 4: none of the three problems that block it under Reactive Forms exists where
  Angular owns the semantics.
- **`applyErrorPolicy` is written here**, against the `ExpressionErrorPolicy` type Phase 4
  shipped. It has no caller until this adapter exists, and Phase 4 declined to ship an
  unexercised path.

**Precondition, from § 9.1 — the arrow-scope leak is uncontained on this path.** This
adapter does not go through `createEvalSignal`, so it does not inherit its
snapshot-and-restore of the context's scope depth; a context reused across `LogicFn`
invocations — which one-context-per-field is — carries a leaked scope forward, and scopes
resolve *ahead* of the adapter's own resolver, so one throwing arrow body shadows a source
key of the same name for every later rule on that field. Containment is three lines of
published surface (`scopes.length` before, `pop()` in a `finally`), and it works only if
**every** rule routes through one evaluate helper — a rule reaching for `call(fn, state)`
directly bypasses it silently. This phase decides whether that choke point lives in the core
or in the adapter; it does not get to skip the decision. The escaped-closure residual
survives either way and is not this phase's to solve.

> **Discharged.** Phase 6 built the choke point (`evaluateRule`), so this precondition is met.
> The `eval-core` defect it contains is still open as [BL-A9](docs/backlog.md#a9), and the
> escaped-closure residual survives — see that entry rather than reading this paragraph as
> pending work.

Also note: `peerDependencies` are per package, so shipping this cannot narrow the manifest.
`/signals` requires **Angular 22**; the loud failure for a 19–21 consumer importing it is
inherited from Angular's own `exports` map (`Cannot find module '@angular/forms/signals'`),
and narrowing the declared range to `>=22` would break every Reactive Forms consumer on
19–21 without adding a diagnostic.

Depends on Phase 4, and on nothing else. Exit criteria: the § 9 sketch turned into a plan
document of its own with § 9.1's choke point decided; the adapter with tests, README and
CHANGELOG entries; the `/signals` row of the package README's entry-point table no longer
saying "designed but not built".

### Phase 7 and Phase 8 — reserved, not yet specified

Both numbers have been cited by shipped documents and neither has ever been a section here,
which is how [BL-E1](docs/backlog.md#e1) and [BL-D2](docs/backlog.md#d2) came to be "deferred
to a phase" that does not exist. Reserved now so the citations resolve:

- **Phase 7 — form-state keys across both adapters** (`touched` / `dirty` / `valid`).
  Cited by [`docs/forms/phase-6-plan.md`](docs/forms/phase-6-plan.md) § 8.2. The brief and the
  two candidate shapes are [BL-E1](docs/backlog.md#e1). Not costed.
- **Phase 8 — should `/reactive` reject prototype-shadowed identifiers in expressions too?**
  Cited by [`docs/forms/phase-6-step-7-summary.md`](docs/forms/phase-6-step-7-summary.md). The
  question, what a phase would have to settle, and why it is breaking are
  [BL-D2](docs/backlog.md#d2). `eval-forms`' README and `CHANGELOG.md` deliberately say only
  "a later major" — this file is the single source for the phase number.

Neither is scheduled. A phase becomes real when it gets a plan document, per `CLAUDE.md`.

## Deferred work

Everything recorded-and-not-done lives in **[`docs/backlog.md`](docs/backlog.md)**: the
`eval-core` visitor, context and service defects; the primitive carve-out and the `console`
calls; the `eval-signals` write-policy gaps; the `eval-forms` asymmetries and doc debts; the
features deferred to phases not yet specified; and the tooling and documentation gaps.

It moved out of this file on 2026-09-06. Until then these were nine sections here, six plan
and step documents under `docs/`, and several code comments — and the most serious entry
([`BL-A8`](docs/backlog.md#a8), an unbounded retention in `EvalService`) was in none of them
while two documents asserted it was in this one. Read that entry's preamble before adding a
deferral anywhere other than the backlog.

Entries are cited by stable ID — `BL-A8`, not a line number.

## Suggested order

1. ~~Phase 1 (hooks)~~ — **done**, shipped in 0.3.0; unblocks 3 and 4.
2. ~~Phase 3 (signals)~~ — **done**, shipped in `eval-signals` 0.1.0; unblocks 4.
3. ~~Phase 4 (forms)~~ — **done**, shipped in `eval-forms` 0.1.0; unblocks 6.
4. ~~Phase 6 (`/signals` entry point)~~ — **done**, shipped in `eval-forms` 0.2.0.
5. The documentation and CI gates — [BL-F3](docs/backlog.md#f3),
   [BL-F4](docs/backlog.md#f4), [BL-F1](docs/backlog.md#f1), [BL-F7](docs/backlog.md#f7),
   [BL-D10](docs/backlog.md#d10) / [BL-D11](docs/backlog.md#d11). Not a phase and not new
   capability, but ordered here deliberately: no version bump, no behavioural change, blocks
   nothing — and F3 and F4 build gates every later phase inherits, so Phase 2 should start
   behind them rather than adding to a queue in front of them.
6. ~~Phase 2 (statements)~~ — **done**, shipped in `eval-core` 0.4.0. Opened with the step 0
   above ([BL-A9](docs/backlog.md#a9), [BL-B2](docs/backlog.md#b2)), both now fixed.
7. Phase 5 (async signals) — depends on Phase 3, and nothing depends on it. Deferred
   out of Phase 3 deliberately rather than left undone; it was ordered after Phase 2 because
   the sync primitive already composes with `resource` for the promise case, and because
   [BL-A9](docs/backlog.md#a9) — Phase 2's step 0 — retires one of its open questions
   outright. **A9 is now fixed, so that question is answered before Phase 5 opens.**
   [BL-F12](docs/backlog.md#f12) is the nearer piece of `eval-signals` work: its peer range
   excludes `eval-core` 0.4.0, and Phase 5 releases that package anyway.
8. Phase 7 / Phase 8 — reserved above, neither costed nor scheduled.

Unscheduled and independent of all of the above: [BL-A2](docs/backlog.md#a2), a wrong-value
bug with a real route to it, which lands whenever someone picks it up; and the `eval-core`
error-identity minor ([BL-A5](docs/backlog.md#a5), [BL-A6](docs/backlog.md#a6),
[BL-A4](docs/backlog.md#a4), [BL-A7](docs/backlog.md#a7), [BL-C3](docs/backlog.md#c3)), which
wants appetite for a version bump.
