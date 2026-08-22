# Roadmap

This document tracks planned functional additions to ng-eval and how they should be
distributed across packages/repositories.

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

### Phase 2 — Statement support: `let`, `if`, `for` (`eval-core`)

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

Exit criteria: `VariableDeclaration` (`let`/`const`), `IfStatement`, `BlockStatement`,
classic `ForStatement` visitors; multi-statement `Program` evaluation; tests mirroring
the existing per-visitor test style; README "ESTree Nodes Supported" updated.

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
  the signal, so an uncontained leak permanently shadows a source key.
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

### Phase 6 — the `/signals` entry point (`eval-forms`)

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

Also note: `peerDependencies` are per package, so shipping this cannot narrow the manifest.
`/signals` requires **Angular 22**; the loud failure for a 19–21 consumer importing it is
inherited from Angular's own `exports` map (`Cannot find module '@angular/forms/signals'`),
and narrowing the declared range to `>=22` would break every Reactive Forms consumer on
19–21 without adding a diagnostic.

Depends on Phase 4, and on nothing else. Exit criteria: the § 9 sketch turned into a plan
document of its own with § 9.1's choke point decided; the adapter with tests, README and
CHANGELOG entries; the `/signals` row of the package README's entry-point table no longer
saying "designed but not built".

## Deferred defects in the visitor, context and service layers

Recorded rather than fixed: each is a **behavioral** change, and the phase that surfaced it
was scoped to be additive. Identity-checked `exit` (§ 3.8 of the Phase 1 plan) means the
hook layer now stays balanced in spite of the three visitor defects below, so none of them
is urgent — but none of them is gone either.

The first three came out of the Phase 1 hook work (`docs/side-effects/phase-1-plan.md`) and
are in the visitors. The remaining three are not: `getKey` is in `EvalContext` and was
surfaced by Phase 1 step 4's read hooks, while the service-layer error wrapper and
`getThis` were surfaced by Phase 3 step 2 (`docs/signals/phase-3-plan.md`) — the first
consumer to reuse one `EvalContext` across many evaluations, which is what makes several of
these visible at all.

- **`await-expression.ts` downgrades a synchronous throw to a promise rejection.**
  `awaitVisitor` wraps `callback(node.argument, st)` in a `try`/`catch` inside a `Promise`
  executor, so a child that throws synchronously — a prototype-pollution guard rejection,
  for instance — does not propagate. It becomes a rejected promise that only surfaces when
  something awaits it, and the visitor continues to its own `pushVisitorResult`. In the
  async path a security rejection therefore arrives as a rejected value rather than a
  throw, and in the sync path it may never be observed at all. Fixing it means moving the
  `callback` out of the executor, which changes what `evalAsync` throws and when — a
  breaking change for anyone catching the current shape, so it needs its own step and a
  version bump.

- **`update-expression.ts` desynchronizes the value stack under `preserveParens`.**
  `updateExpressionVisitor`'s `if`/`else if` chain handles `Identifier` and
  `MemberExpression` arguments and falls through silently for anything else — pushing
  nothing, but still calling `afterVisitor`. `ParserOptions` is
  `Partial<acorn.Options> & {…}` (`internal/interfaces/parser-types.ts:3`), so a consumer
  may pass `preserveParens: true`, and `(a)++` then parses with
  `argument.type === 'ParenthesizedExpression'` (verified against the acorn in this repo).
  The result is a wrong value for every node downstream of it, not merely an untidy
  bracket. This one is a real defect with a real route to it and deserves a proper fix —
  a `ParenthesizedExpression` visitor, or unwrapping the argument here — rather than
  triage. It is listed here only because it is out of Phase 1's scope.

- **`import-expression.ts` has a dead `afterVisitor`.** `importExpressionVisitor` calls it
  after an unconditional throw, so the line can never run. Cosmetic; tidy when that visitor
  is next touched.

  For both: under identity-checked `exit` (§ 3.8 of the Phase 1 plan) a violation of the
  bracketing convention now produces a visible `completed: false` event instead of a silent
  stack desync, so the *hook* layer stays balanced either way. That is containment, not a
  fix — the value stack is a separate stack and is not protected by it.

- **`EvalContext.getKey` cannot case-correct a namespace, and does not resolve through the
  same chain as `get`.** Two related gaps in one method
  (`internal/classes/eval/eval-context.ts:159`), both surfaced by step 4's read hooks, which
  report `getKey`'s answer as the key that was read.

  *The namespace gap.* `getKey` searches `scopes`, then `original`, then **inside** each
  prior scope's `context` — but never a scope's `namespace`. An `EvalScope` resolves its
  namespace in `EvalScope.get`, which `getKey` has no counterpart for. So with a scope
  namespaced `dog`, the expression `Dog.Says()` reports an uncorrected `'Dog'` for the
  identifier while the member hop correctly reports `says`. Pinned as current behaviour by
  `internal/visitors/read-hooks.spec.ts`; a fix must update that spec deliberately.

  *The divergence from `get`.* `getKey` omits the `lookups` loop that `get` runs, so a key
  resolved by an `EvalLookup` reports its spelling uncorrected. And the two disagree about
  absent values: `get` treats `undefined` as "not found" and continues to prior scopes and
  lookups, while `getKey` returns the first spelling it finds. Under `caseInsensitive` the
  reported key can therefore come from a *different source* than the value did — a context
  key whose value is `undefined` shadows the spelling of a prior scope's key that actually
  supplied the value.

  Both are behavioral changes to an exported method, so they are out of Phase 1's additive
  scope. They matter most to Phase 3: dependency tracking keys on what `getKey` returns, and
  § 9.1 of the Phase 1 plan already tells Phase 3 not to trust `target` identity for bare
  identifiers. An uncorrected or mis-sourced key compounds that.

  *Confirmed to reach further than "a diagnostic" — Phase 3 step 2.* The `lookups`
  divergence also strips the key off a library-owned error. `assignment-expression.ts:49`
  and `update-expression.ts:22` resolve their target through `getKey` **before** writing, so
  under `caseInsensitive` a key that lives only in `lookups` — which is every key of a
  `@zvenigora/ng-eval-signals` context — comes back `undefined`, and any error raised from
  the write names `'undefined'` instead of the key. See `docs/signals/phase-3-plan.md`
  § 3.6.4.

- **Every service-layer entry point discards the error it caught.** `EvalService.simpleEval`,
  `EvalService.eval`, and `CompilerService.call` / `simpleCall` / `callAsync` /
  `simpleCallAsync` all catch and `throw new Error(error.message)`. That replaces the thrown
  object: its **type**, its `cause`, its stack and any property it carried are gone, and the
  caller receives a bare `Error` whose only surviving information is the message string.

  `evaluate` / `evaluateAsync` do not do this — they rethrow the original untouched — so the
  loss is entirely in the service wrapper, and the free `call` / `callAsync` from
  `internal/functions` are the same functions without it.

  Consequences, in order of how quietly they fail:

  - A caller cannot select an error by type. `instanceof` against any custom error class is
    false after one of these calls, so the only discriminator left is matching the message —
    which couples the caller to wording and breaks silently when it changes.
  - A `catch` block cannot re-raise with context, because `cause` is already gone.
  - Stack traces point at the service method rather than at the visitor that threw.

  Fixing it is a behavioural change to six exported methods — anything catching the current
  bare `Error` keeps working, but code that branches on the message would want revisiting —
  so it needs its own step and a version bump. Rethrowing the original object, or wrapping it
  with `cause` set, are both candidates; the second preserves the current type for callers
  who already depend on getting an `Error`.

  Phase 3 routes around it rather than waiting: `createEvalSignal` calls the free
  `call(fn, state)` so `SignalContextWriteError` survives to the factory
  (`docs/signals/phase-3-plan.md` § 3.6.3). **Phase 3 step 3 hits it again immediately** —
  `EvalSignalService` is the DI-first face of that same factory — and Phase 4 will inherit
  the constraint wholesale.

- **`EvalContext.getThis` reads the wrong object in its `priorScopes` loop.**
  `internal/classes/eval/eval-context.ts:203` calls
  `getContextValue(this._original, key)` inside the loop over `this._priorScopes`, where it
  should read `scope`. So the loop re-tests the original context on every iteration: it can
  only ever succeed for a key `_original` already holds — in which case the preceding block
  has returned — and it therefore returns a prior scope's `thisArg` for no key, and never
  returns one for a key a prior scope actually supplies.

  Bounded today because `getThis` has exactly one call site in the evaluator,
  `member-expression.ts:97`, and a bare call takes a different path — `call-expression.ts`
  passes `st.context` as `thisArg` and never consults `getThis` at all (pinned by
  `modules/eval-signals/src/lib/signal-context.spec.ts`). Surfaced incidentally while
  auditing `set`'s callers in Phase 3 step 2. Cosmetic to fix, behavioural in effect; it
  needs a spec written against the corrected behaviour rather than the current one.

## Deferred security hardening — the primitive carve-out in `member-expression.ts`

Surfaced while checking GHSA-pj3p-xpg7-h7gw (reported against the sibling `jse-eval`)
against this repo. The advisory itself does not apply — see `SECURITY.md`, "Reviewed
External Advisories" — but the check walked the surrounding guard and found this.

**Status: not exploitable as far as probed. Not cleared.** No escalation was found; that is
not the same as none existing, and the probing was one session's worth against one threat
model. Treat it as an open hardening item.

**What it is.** Both dangerous-property checks in the member visitor
(`member-expression.ts:144` and `:188`) are gated on `!isPrimitive`, so when the receiver is
a string, number or boolean the blocklist is skipped entirely. `"abc".constructor`
therefore returns the real `String` function — a reference to a global constructor leaking
out of the sandbox. It is the only place the guard is deliberately not applied.

**Why it is there, and why deleting the gate is not the fix.** The blocklist holds
`toString`, `valueOf` and `hasOwnProperty`, which are ordinary reads on a primitive.
Enforcing it there would refuse `s.toString()`. Worse, simply removing `!isPrimitive` does
not narrow the carve-out at all — it removes primitive member access outright, because
`safeGetProperty` returns `undefined` for any target that is not an object or a function
*before* it consults the blocklist, so `s.toUpperCase` becomes `undefined` rather than
blocked (confirmed by probe). A fix has to keep a primitive read path and enforce a subset
of the blocklist on it.

**Probe results, so nobody re-derives them.** Against `{ s: 'abc', n: 1, b: true }`:

- `s.constructor` → the `String` function. Likewise `n.constructor` → `Number`,
  `b.constructor` → `Boolean`.
- `s.constructor.call` → `Function.prototype.call`, and it is callable —
  `s.constructor.call(null, "hi")` → `"hi"`. This is the one hop past the constructor that
  is not on the blocklist. `this` is the `String` function, so it yields a string.
- `s.constructor.constructor` → **throws**. So does `s.constructor.prototype`,
  `s.constructor.__proto__`, `s.constructor.call.constructor`, `s.trim.constructor` and
  `s.sub.constructor`.
- Every escalation tried dead-ends at hop 2, and by the same mechanism: the receiver is then
  a plain function, not a primitive, so the read goes through `safeGetProperty`, which does
  enforce the blocklist.
- A second, independent barrier sits behind that one: the case-insensitive lookup block is
  gated on `typeof obj === 'object'`, and functions are not. So no case variant reopens the
  chain either — `s.constructor.CONSTRUCTOR`, `s.constructor.PROTOTYPE` and
  `s.trim.CONSTRUCTOR` all resolve to `undefined` under `caseInsensitive: true` rather than
  being case-corrected. This barrier is incidental rather than designed, which is a reason
  not to lean on it.

**Covered, not fixed.** `eval.service.primitive-carve-out.spec.ts` pins the boundary in both
directions — what the carve-out permits, why it exists, and where the escalations stop — so
narrowing *or* widening it fails a test rather than passing silently. Confirmed
load-bearing: skipping the carve-out reddens the first two blocks, extending it to function
receivers reddens the third. The spec is a record of current behaviour, not an endorsement:
a fix is expected to change its first `describe` block and leave the other two intact.

Fixing it is a behavioural change — anything reading `s.constructor` today starts throwing —
so it needs its own step and a version bump.

## Correction owed — the throwing-subscriber premise in `eval-forms`

Raised while closing Phase 4 step 6, and recorded here rather than only in
[`docs/forms/phase-4-plan.md`](docs/forms/phase-4-plan.md) because that plan is now closed
and nothing reads a closed plan.

**The premise.** Four places in `eval-forms` state that a throw inside the `group.events`
subscriber "unsubscribes it and silently ends all diffing for the life of the form".

**It is false in both halves**, measured against this repo's `rxjs@7.8.2` with the same
pipeline shape `createControlSource` uses — a `Subject` exposed through `asObservable()`,
piped through `takeUntil`, with a function next-handler:

```
next(1) returned normally to the caller
closed after 1st throw: false | handler calls: 1 | observers: 1
closed after 2nd throw: false | handler calls: 2 | observers: 1
ASYNC UNHANDLED: boom  (x2)
```

RxJS 7's `ConsumerObserver` catches the handler's throw and re-reports it through
`reportUnhandledError`, **asynchronously**. The subscription stays open, later emissions are
still delivered, and in an Angular application the error reaches the unhandled-error path.
So the failure is *loud and non-fatal*, not *silent and terminal* — the opposite of the
premise on both axes.

**The four sites**, all stating it as established fact:

- [`modules/eval-forms/reactive/src/lib/control-source.ts:165`](modules/eval-forms/reactive/src/lib/control-source.ts#L165)
  — the own-property read in `sync`.
- [`modules/eval-forms/reactive/src/lib/field-schema.ts:199`](modules/eval-forms/reactive/src/lib/field-schema.ts#L199)
  — `validate`'s group loop.
- [`modules/eval-forms/reactive/src/lib/control-source.spec.ts:409`](modules/eval-forms/reactive/src/lib/control-source.spec.ts#L409)
  — the prototype-name removal case. Note this comment **already measured something that
  does not fit it**: it goes on to record that "the throw lands in that key's own subscriber
  and not back in `sync`, so the diff loop itself survives". The contradiction was sitting in
  one comment and was not read as one.
- [`docs/forms/phase-4-plan.md:1438`](docs/forms/phase-4-plan.md#L1438) — and it cites
  "§ 3.5.5" as the source, which does **not** contain the claim. The citation is what made
  it look settled.

**This is not a comment fix, which is why it is a roadmap entry.** The premise is load-bearing
for a shipped design decision: enforcement is construction-time only, and `validate` is not
re-run for a control added later, *because* throwing from the diff was held to be
unavailable. If a throw there is merely reported and diffing continues, that argument no
longer decides the question, and the alternatives reopen — reject a late `addControl` from
the diff, surface it through a channel the consumer can observe, or keep the current
behaviour on a different and stated ground (a throw cannot un-add the control, and it fires
far from the call that caused it, which may well still be decisive).

Scope: correct the four sites; decide the question again on the real behaviour and record
which ground it now rests on; and add a spec that pins what actually happens when the diff
throws, since none exists — the case above pins the *symptom* the guard prevents, not the
subscriber's fate. Behavioural if the decision changes, documentation-only if it does not.

## Deferred tooling — `eval-signals` has no CI test configuration

Surfaced in Phase 3 step 6, while settling the `project.json` divergence between the two
libraries. That step decided the **release** blocks deliberately (`eval-signals` keeps its
`release.version` + `nx-release-publish` config, `eval-core` is left alone — see the phase-3
plan's step 6). This is the other divergence, and it is a real gap rather than a style
difference.

`modules/eval-core/project.json` gives its `test` target a `configurations.ci` block
(`ci: true`, `coverage: true`); `modules/eval-signals/project.json` gives its `test` target no
`configurations` at all (its `build` target has the usual two). So
`nx test eval-signals --configuration=ci` does not exist, and any CI job that
starts asking for coverage per project gets it from one library and not the other. Today's
workflow runs `npm test` — plain `nx run-many -t test` — so nothing is red and nothing is
missing coverage that was previously reported; that is why it was logged rather than fixed
inside a documentation step.

Fixing it is a few lines of `project.json` plus a decision about whether coverage thresholds
should gate CI for either library, which is the part worth deciding rather than copying.

## Deferred tooling — documented-symbol drift gate

Not a defect in shipped behaviour; a gap in what the suite can catch. Raised while closing
Phase 1 step 6, after the step-5 retrospective had found two documented snippets that did
not run as printed.

**Assert that every symbol a README imports from `@zvenigora/ng-eval-core` is actually
exported from it.** Scan the fenced code blocks
in **both** `README.md` and `modules/eval-core/README.md`, collect the identifiers named in
`import { … } from '@zvenigora/ng-eval-core'`, and assert each resolves against the public
API.

Scanning both is the point, not thoroughness for its own sake. The divergence this step had
to correct was exactly a published/unpublished split: `trackTime` was documented only in the
root `README.md`, which ships nowhere, so the one file a consumer installing the package can
read was the one file the documentation was not in. A symbol documented only in the
unpublished README is a gap, and comparing the two sets surfaces it structurally instead of
depending on someone noticing. It also catches the higher-frequency case: a public symbol
renamed or removed while a README goes on naming it.

This is an **export-surface** assertion, so a `public-api.spec.ts` beside `src/public-api.ts`
is its natural home. No such spec exists yet, so this creates one; the published surface has
no direct test today, which is a second reason to add it.

Deliberately excluded: a **block-count assertion** ("the README contains N snippets; update
this spec if that changes"). It fires on every legitimate addition, so its steady-state
behaviour is to train people to bump the number rather than investigate the failure, which
costs more than the one gap it closes.

### Considered and rejected: executing transcribed snippets

The larger version of this — mirroring each documented snippet as a test and asserting the
output the README prints — was written and run during step 6 (eight tests, all green) and
then deleted rather than kept.

A transcription is a **copy, not a reader**. It gates "the API behaves as documented", and
the 711-test suite already does that; what it cannot gate is what the README actually says,
because nothing connects the two. It would report a documentation guarantee it does not
have — the failure mode CLAUDE.md names, arrived at from the documentation side.

The decisive evidence is that **neither defect step 5 found would have been caught by it.**
Both were missing declarations in fragments — `### Compilation` passing an `options` it never
declared, `### Evaluation with scope` using an unconstructed `evalContext` — and a
transcription is written to work. Anyone turning those fragments into a runnable test
declares the missing bindings without noticing, and the test passes on code the README
cannot. The two defects were found by executing the documented examples *by hand*, which is
a review practice rather than a gate, and it stays that way.

**Reopened for `eval-forms` only, in Phase 4 step 6, and the reason is *when* the practice
fires rather than whether it works.** `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts`
executes that package's runnable README examples and its worked example. The argument above
is right that hand-execution is what found the Phase 1 and Phase 3 defects — five of them
across the two phases — and the addition is that it found each of them *after* the snippet
had been written and reviewed, on a later session that happened to be reviewing
documentation. Nothing makes that session happen. A gate that covers the runnable subset
runs on every session, and the two are additive rather than alternatives.

Two things keep it honest, and both answer the objection above directly. Where a documented
block was a fragment, the fix went into the **document** — the README's reactivity blocks
each declare their own form and binding for that reason — rather than into the spec; what
the spec still supplies (an `injector`, and the service handles the worked example refers
to bare) is enumerated in its own docstring instead of being left for a reader to discover.
And it earned its place twice on the way in: the `{ emitEvent: false }` block printed a
stale value that a never-yet-read `computed()` does not produce, and a first draft that
split the worked example into a case apiece hid a wrong printed value behind a resetting
fixture — the second found in review rather than by the gate, which is the limit worth
knowing about.

It does **not** supersede the drift gate above and is strictly narrower than it: it runs
code, it does not read markdown, and nothing but a human keeps the two in step. The drift
gate is still worth building, and still unbuilt.

## Deferred tooling — the README-execution gate for `eval-core` and `eval-signals`

The gate described immediately above exists for **`eval-forms` only**, and the five defects
that justify it are in the other two packages: two shipped in `eval-core`'s documentation in
Phase 1, three were found in `eval-signals`' in Phase 3. So the package with no record of a
non-running snippet is the one now gated, and the two packages with the record are still on
the review practice that missed them five times — each caught only by a later session that
happened to be reviewing documentation, and nothing makes that session happen. That is the
whole case for doing this, restated per package; the argument is not repeated here.

Two pieces of work, not one, because the two packages are not equally tractable.

**The soundness condition carries across unchanged: one case per continuous program, not
one per block.** A document whose sections run in sequence is one program, and its printed
values are claims about the state each block inherits. A per-block harness behind a
resetting `beforeEach` executes a *different* program — one in which every block starts
pristine — and reports green for a document that is wrong as written. That is not a weaker
gate; it is the thing this section rejected, reached through the fixture instead of the
preamble. Phase 4 step 6 hit it for real: a first draft split the worked example into a case
apiece, went green, and hid a `false` that § 4 had already driven to `true`. Split only where
the document itself declares a fresh start — `modules/eval-core/README.md` does exactly that
between its `trackTime` section and its hooks section, and does not between the `trackTime`
blocks, whose second reads a `state` the first declared.

**`eval-signals` is the easier of the two** and should go first. Its README is already
written in whole-unit blocks — a component class, then a sequence of reads and `set` calls
against it — which is the shape the gate wants, and `eval-forms`' spec already imports
`SignalContextWriteError` from it, so a consumer-shaped import through the published
specifier is known to work from a spec folder.

**`eval-core` is the harder case, and it may not be gateable as written.** Its snippets are
fragments: `private service: EvalService;` followed by `...`, in both `README.md` and
`modules/eval-core/README.md` — and the two Phase 1 defects were *exactly* that shape,
`### Compilation` passing an `options` it never declared and `### Evaluation with scope`
using an unconstructed `evalContext`. Fragments needing invented preamble are the condition
under which this gate stops being sound: anyone turning them into runnable cases supplies
the missing bindings without noticing, and the spec then passes on code the README cannot
run, which is how those two shipped in the first place. Phase 4's answer was to complete the
**document** rather than pad the spec, but there the fragments were a handful of blocks; here
it would mean rewriting the prevailing style of both files, and the injected-service opening
is load-bearing documentation in an Angular library rather than an omission to be tidied
away. So `eval-core`'s step decides that first, and the plan's own drop rule applies without
apology: if it fights, it is dropped and the reason reported, rather than a harness built to
prop it up. Whatever preamble a surviving spec does supply is **enumerated in its docstring**
— a blanket "self-contained" claim is how an unlisted substitution hides.

Both are still narrower than the documented-symbol drift gate above and neither supersedes
it: they run code, they do not read markdown.

## Suggested order

1. ~~Phase 1 (hooks)~~ — **done**, shipped in 0.3.0; unblocks 3 and 4.
2. ~~Phase 3 (signals)~~ — **done**, shipped in `eval-signals` 0.1.0; unblocks 4.
3. ~~Phase 4 (forms)~~ — **done**, shipped in `eval-forms` 0.1.0; unblocks 6.
4. Phase 6 (`/signals` entry point) — depends on Phase 4, which is now in place. It is
   next of the forms work, and the only phase with a stated correctness precondition
   (§ 9.1's choke point) rather than only open questions.
5. Phase 2 (statements) — independent track, can run in parallel with any of the others
   since nothing else in this roadmap depends on `let`/`if`/`for`.
6. Phase 5 (async signals) — depends on Phase 3, and nothing depends on it. Deferred
   out of Phase 3 deliberately rather than left undone; it is ordered last because
   the sync primitive already composes with `resource` for the promise case.
