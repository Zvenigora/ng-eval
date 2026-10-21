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

One row per phase, in the order the phases ran. A phase's plan is its design record and the
reference for its library; its retrospect is the phase's own summary where it has one, and
otherwise its last step summary. From Phase 2's release on, which versions each phase shipped in,
and what each version carries, is the register's
[Publication status](docs/backlog.md#publication-status) table, whose tags `npm test` checks.
Phases 1, 3, 4 and 6 shipped before that table began: each one's release is the entry that opens
"Phase N of the roadmap" in its package's CHANGELOG
([`eval-core`](modules/eval-core/CHANGELOG.md), [`eval-signals`](modules/eval-signals/CHANGELOG.md),
[`eval-forms`](modules/eval-forms/CHANGELOG.md)). [`docs/README.md`](docs/README.md) lists every
summary of every phase.

| Phase | Subject | Shipped in | Plan | Retrospect |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Generic evaluation hooks / side effects | `@zvenigora/ng-eval-core` | [`side-effects/phase-1-plan.md`](docs/side-effects/phase-1-plan.md) | [`side-effects/step-4-summary.md`](docs/side-effects/step-4-summary.md) |
| 3 | `@zvenigora/ng-eval-signals`, a new module | `@zvenigora/ng-eval-signals` | [`signals/phase-3-plan.md`](docs/signals/phase-3-plan.md) | [`signals/step-4-summary.md`](docs/signals/step-4-summary.md) |
| 4 | `@zvenigora/ng-eval-forms`, a new module, with its `/reactive` entry point | `@zvenigora/ng-eval-forms` | [`forms/phase-4-plan.md`](docs/forms/phase-4-plan.md) | [`forms/step-6-summary.md`](docs/forms/step-6-summary.md) |
| 6 | The `/signals` entry point of `eval-forms` | `@zvenigora/ng-eval-forms` | [`forms/phase-6-plan.md`](docs/forms/phase-6-plan.md) | [`forms/phase-6-step-7-summary.md`](docs/forms/phase-6-step-7-summary.md) |
| 2 | Statement support: `let`, `if`, `for` | `@zvenigora/ng-eval-core` | [`statements/phase-2-plan.md`](docs/statements/phase-2-plan.md) | [`statements/summary.md`](docs/statements/summary.md) |
| 5 | Async expression signals | `@zvenigora/ng-eval-signals`, with `@zvenigora/ng-eval-forms` for its peer range | [`signals/phase-5-plan.md`](docs/signals/phase-5-plan.md) | [`signals/phase-5-summary.md`](docs/signals/phase-5-summary.md) |
| 9 | Colon-joined identifiers | `@zvenigora/ng-eval-core`, with `@zvenigora/ng-eval-signals` and `@zvenigora/ng-eval-forms` | [`colon-identifiers/phase-9-plan.md`](docs/colon-identifiers/phase-9-plan.md) | [`colon-identifiers/phase-9-summary.md`](docs/colon-identifiers/phase-9-summary.md) |
| 10 | Documentation restructure, repository-wide — **in flight** | All three, as docs-only patches at its step 7 | [`documentation/phase-10-plan.md`](docs/documentation/phase-10-plan.md) | Written at its step 8 |

Phase 9 is numbered after the two reserved phases below and ran ahead of them: it was the one with
a consumer waiting. Until Phase 10 condensed this file, each phase had a section here with its
original framing; they are in `ROADMAP.md` at b1a9863.

### Phase 7 and Phase 8 — reserved, not yet specified

Both numbers have been cited by shipped documents and neither has ever been a section here,
which is how [BL-E1](docs/backlog.md#e1) and [BL-D2](docs/backlog-retired.md#d2) came to be "deferred
to a phase" that does not exist. Reserved now so the citations resolve:

- **Phase 7 — form-state keys across both adapters** (`touched` / `dirty` / `valid`).
  Cited by [`docs/forms/phase-6-plan.md`](docs/forms/phase-6-plan.md) § 8.2. The brief and the
  two candidate shapes are [BL-E1](docs/backlog.md#e1). Not costed.
- **Phase 8 — should `/reactive` reject prototype-shadowed identifiers in expressions too?**
  Cited by [`docs/forms/phase-6-step-7-summary.md`](docs/forms/phase-6-step-7-summary.md).
  **Answered without a phase**: `eval-forms` 0.3.0 refuses them at `/reactive` with `/signals`'
  own guard, and [BL-D2](docs/backlog-retired.md#d2) records why no migration was needed. The
  number stays reserved so the citation resolves; it holds no work.

Neither is scheduled. A phase becomes real when it gets a plan document, per `CLAUDE.md`.

## Deferred work

Everything recorded-and-not-done lives in **[`docs/backlog.md`](docs/backlog.md)**: two
`eval-core` decisions; the `eval-signals` write-policy gaps; the `eval-forms` asymmetries,
accepted limitations and doc debt; the features deferred to phases not yet specified; and the
tooling and documentation gaps.

It moved out of this file on 2026-09-06. Until then these were nine sections here, six plan
and step documents under `docs/`, and several code comments — and the most serious entry
([`BL-A8`](docs/backlog-retired.md#a8), an unbounded retention in `EvalService`) was in none of them
while two documents asserted it was in this one. Read that entry's preamble before adding a
deferral anywhere other than the backlog.

Entries are cited by stable ID — `BL-A8`, not a line number.
