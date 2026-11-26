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
| `@zvenigora/ng-eval-rules` | `modules/eval-rules` (planned) | `eval-core`; `eval-signals` for its `/signals` entry point only | A rule engine: rules stored as JSON, evaluated as expressions |
| `@zvenigora/ng-eval-template` | `modules/eval-template` (planned) | `eval-core` | Text templates: macros in text, each an expression |

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
| 10 | Documentation restructure, repository-wide | All three, as docs-only patches | [`documentation/phase-10-plan.md`](docs/documentation/phase-10-plan.md) | [`documentation/phase-10-summary.md`](docs/documentation/phase-10-summary.md) |
| 11 | `eval-forms`' README by entry point | `@zvenigora/ng-eval-forms`, a docs-only patch | [`documentation/phase-11-plan.md`](docs/documentation/phase-11-plan.md) | [Its § 10](docs/documentation/phase-11-plan.md#10-retrospect) |
| 12 | `@zvenigora/ng-eval-rules`, a new module: pure rule evaluation | Not shipped: planned as `@zvenigora/ng-eval-rules` 0.1.0 | [`eval-rules/plan.md`](docs/eval-rules/plan.md), steps 1 to 4 done | — |
| 17 | `@zvenigora/ng-eval-template`, a new module: the pure template compiler | Not shipped: planned as `@zvenigora/ng-eval-template` 0.1.0 | [`eval-template/plan.md`](docs/eval-template/plan.md), no step run | — |
| 19 | A demo application at `apps/demo` | Ships in no package: an application at `apps/demo` and the site at [`zvenigora.github.io/ng-eval`](https://zvenigora.github.io/ng-eval/) | [`demo/plan.md`](docs/demo/plan.md) | [Its § 10](docs/demo/plan.md#10-retrospect) |

Phases 1 to 11 and 19 are complete, Phase 19 the last of them. Phase 11 shipped as `eval-forms` 0.7.1 and
retired [F28](docs/backlog-retired.md#f28). Phase 12's plan is active: steps 1 to 4 done, A64's
track done, `eval-core` 0.16.2 released, pending publish, then step 5.

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

### Phases 12 to 16 — `@zvenigora/ng-eval-rules`

A rule engine over `eval-core`: a rule is a fixed pipeline of calculations, decisions and outputs,
stored as JSON, whose effects are recorded by evaluation and performed afterwards by the host. The
design, with its 61 questions, is
[`docs/eval-rules/design-session.md`](docs/eval-rules/design-session.md). One phase per release:

| Phase | Release | Subject | State |
| :--- | :--- | :--- | :--- |
| 12 | 0.1.0 | Pure rule evaluation: the format, `compileRule`, the result with its trace, the tests runner, the registry cache | [Plan](docs/eval-rules/plan.md), active: steps 1 to 4 done, A64's track done, `eval-core` 0.16.2 released, pending publish, then step 5 |
| 13 | 0.2.0 | The engine: rule sets, events, the sink, batch commit, the queue and the loop guard | Designed, no plan |
| 14 | 0.3.0 | Workflows: the node-kind registry, `sequence`, `branch`, async commit and cancellation | Designed, no plan |
| 15 | 0.4.0 | The `/signals` entry point: a value-change event source | Designed, no plan |
| 16 | 0.5.0 | The async rule run: `await` in a calculation | Designed, no plan |

Phases 15 and 16 do not depend on each other and may swap. What the design defers outright — a
converter from an earlier rule format, `parallel` and `fanOut`, a rule as a `computed`, timer and
route event sources — is in the register, [E7](docs/backlog.md#e7), opened by Phase 12's step 1.

### Phases 17 and 18 — `@zvenigora/ng-eval-template`, and `eval-forms`' template and styling properties

Text with expression macros in it, `{{count}} pens` or `{{#if vip}}<b>Gold</b>{{#else}}Standard{{/if}}`,
where every expression is `eval-core`'s and the delimiters are the host's. The design, with its 45
questions, is [`docs/eval-template/design-session.md`](docs/eval-template/design-session.md). One
phase per release, as above:

| Phase | Release | Subject | State |
| :--- | :--- | :--- | :--- |
| 17 | `@zvenigora/ng-eval-template` 0.1.0 | The pure template compiler: `compileTemplate` and `renderTemplate`, value macros, `#if` and `#switch` blocks, escaped output | [Plan](docs/eval-template/plan.md), no step run |
| 18 | An `eval-forms` minor | A template property at both adapters, and the `class` and `style` properties | Agreed in outline, no design |

Neither displaces Phase 12, whose plan is active, and the order of Phases 17 and 18 after it is
not decided; Phase 19, which ran before all three, is complete. Phase 18 needs Phase 17. What the design leaves out of 0.1.0 — named macros, loops, pipes, statements and `await`
in a macro — goes to the register when Phase 17's step 1 runs, not here.

### Phase 19 and Phase 20 — a demo application, and documentation in two sets

Reserved on 2026-11-14, at the maintainer's request. Phase 19 was designed on 2026-11-15; Phase 20
has no design session, no plan and no schedule.

- **Phase 19 — a demo application**: complete, its site live at
  [`zvenigora.github.io/ng-eval`](https://zvenigora.github.io/ng-eval/) since 2026-11-18, and its
  [plan](docs/demo/plan.md) a design record. A showcase of
  features and a set of use-case examples for an Angular developer deciding whether to adopt the
  libraries. It is an Nx application at `apps/demo`, not a sixth package, built from the
  workspace's source and hosted on GitHub Pages. The design, with its 23 questions, is
  [`docs/demo/design-session.md`](docs/demo/design-session.md). It ran before Phases 12 and 17,
  and each of those plans gains a demo step before its release step, written when its phase
  starts, by the plan's [§ 9](docs/demo/plan.md#9-contract-after-this-lands).
- **Phase 20 — documentation in two sets**, one for customers and one for maintainers. The
  maintainer set exists: [`docs/`](docs/README.md), `CLAUDE.md` and `CONTRIBUTING.md`. The
  customer set is today the root README, the package READMEs, their CHANGELOGs and `SECURITY.md`.
  A guide outside the READMEs reverses [Phase 11's § 3.1](docs/documentation/phase-11-plan.md) D1,
  one README per package and no guide files ([F28](docs/backlog-retired.md#f28)), so its design
  session reopens that decision before anything else. Phase 19's session fixed two points for it:
  the demo is a plain Angular application, not a documentation generator, and the site leaves
  room for a guide section.

A phase becomes real when it gets a plan document, as above.

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
