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

### Phase 3 — `@zvenigora/ng-eval-signals` (new module)

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

### Phase 4 — `@zvenigora/ng-eval-forms` (new module)

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

## Suggested order

1. ~~Phase 1 (hooks)~~ — **done**, shipped in 0.3.0; unblocks 3 and 4.
2. Phase 3 (signals) — depends only on Phase 1, so it is now unblocked and is next.
3. Phase 4 (forms) — depends on Phase 3.
4. Phase 2 (statements) — independent track, can run in parallel with 1/3/4 since
   nothing else in this roadmap depends on `let`/`if`/`for`.
5. Phase 5 (async signals) — depends on Phase 3, and nothing depends on it. Deferred
   out of Phase 3 deliberately rather than left undone; it is ordered last because
   the sync primitive already composes with `resource` for the promise case.
