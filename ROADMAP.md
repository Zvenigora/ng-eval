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

### Phase 1 — Generic evaluation hooks / side effects (`eval-core`)

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

## Deferred defects in the visitor and context layers

Surfaced by the Phase 1 hook work (`docs/side-effects/phase-1-plan.md`) and recorded
rather than fixed: each is a **behavioral** change, and Phase 1 is scoped to be additive.
Identity-checked `exit` (§ 3.8 of the plan) means the hook layer now stays balanced in
spite of the three visitor defects below, so none of them is urgent — but none of them is
gone either. The fourth entry is in `EvalContext` rather than the visitors, and was
surfaced by step 4's read hooks.

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

## Suggested order

1. Phase 1 (hooks) — unblocks 3 and 4, useful standalone (e.g. tracing/logging use cases).
2. Phase 3 (signals) — depends only on Phase 1.
3. Phase 4 (forms) — depends on Phase 3.
4. Phase 2 (statements) — independent track, can run in parallel with 1/3/4 since
   nothing else in this roadmap depends on `let`/`if`/`for`.
