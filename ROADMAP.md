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

## Suggested order

1. Phase 1 (hooks) — unblocks 3 and 4, useful standalone (e.g. tracing/logging use cases).
2. Phase 3 (signals) — depends only on Phase 1.
3. Phase 4 (forms) — depends on Phase 3.
4. Phase 2 (statements) — independent track, can run in parallel with 1/3/4 since
   nothing else in this roadmap depends on `let`/`if`/`for`.
