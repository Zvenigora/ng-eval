# Maintainer documentation

This is the index of `docs/`, for maintainers and for agents working in the repository. A consumer of
the packages starts at the [root README](../README.md) instead, which links each package's README.

Nothing under `docs/` moves or is renamed: published READMEs and design records name these paths, and
most of those mentions are plain text that no check can follow ([Phase 10 plan](documentation/phase-10-plan.md)
§ 3.2). This page gives the folder its structure instead. A file that must move anyway, and that a
published README links ([`tools/published-links.txt`](../tools/published-links.txt)), leaves a stub at
its old path that links the new one ([F25](backlog-retired.md#f25) Part 4).

## The register

- [`backlog.md`](backlog.md) — everything recorded and not done: defects left unfixed, decisions
  logged rather than made, and gaps in what the suite can catch. Its index lists every entry, live and
  retired, and its Publication status table lists every version published from Phase 2's release on,
  with its tag. Read its
  preamble before recording a deferral anywhere else.
- [`backlog-retired.md`](backlog-retired.md) — the retired entries, each kept with its reason and its
  evidence.

Cite an entry by its ID, `BL-A8` or A8, never by a line number. Retiring an entry moves it to
`backlog-retired.md`, and the doc-links gate lists the inbound links to re-point. If a published
README links the entry's anchor, as `eval-signals`' links `#a24`, its index row in `backlog.md` keeps
that anchor, `<a id="…"></a>` in the first cell.

## Active plan

None. The next plan is linked here when it is written.

## Completed phases

Each plan is a design record and the reference for its library. Its line citations, and those in its
summaries, refer to the code at the commit that wrote them.

| Phase | Plan | Summaries | The reference for |
| :--- | :--- | :--- | :--- |
| 1, evaluation hooks | [`side-effects/phase-1-plan.md`](side-effects/phase-1-plan.md) | [step 1](side-effects/step-1-summary.md), [step 2](side-effects/step-2-summary.md), [step 3](side-effects/step-3-summary.md), [step 4](side-effects/step-4-summary.md) | The hook contract, its § 9 and § 9.1 |
| 2, statements | [`statements/phase-2-plan.md`](statements/phase-2-plan.md) | [retrospect](statements/summary.md) | Statements, under the completion-value convention of its § 3.1 |
| 3, `eval-signals` | [`signals/phase-3-plan.md`](signals/phase-3-plan.md) | [step 3](signals/step-3-summary.md), [step 4](signals/step-4-summary.md) | Its § 9, the downstream contract `eval-forms` is entitled to rely on, and § 3.2.2, the construct-once finding |
| 4, `eval-forms` | [`forms/phase-4-plan.md`](forms/phase-4-plan.md) | [step 1](forms/step-1-summary.md), [step 2](forms/step-2-summary.md), [step 3](forms/step-3-summary.md), [step 4](forms/step-4-summary.md), [step 5](forms/step-5-summary.md), [step 6](forms/step-6-summary.md) | Its § 9, which designs Phase 6, and § 9.1, Phase 6's one correctness precondition |
| 5, the async signal | [`signals/phase-5-plan.md`](signals/phase-5-plan.md) | [retrospect](signals/phase-5-summary.md) | Its § 3.4, the value and status contract, and § 9, the downstream one |
| 6, `eval-forms`' `/signals` | [`forms/phase-6-plan.md`](forms/phase-6-plan.md) | [step 2](forms/phase-6-step-2-summary.md), [step 3](forms/phase-6-step-3-summary.md), [step 4](forms/phase-6-step-4-summary.md), [step 5](forms/phase-6-step-5-summary.md), [step 6](forms/phase-6-step-6-summary.md), [step 7](forms/phase-6-step-7-summary.md) | The Signal Forms adapter, and the choke point that discharges Phase 4's § 9.1 |
| 9, colon-joined identifiers | [`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) | [retrospect](colon-identifiers/phase-9-summary.md) | Its § 3.4, the grammar, § 3.5, the acorn plugin and the internals it relies on, and § 9, the downstream contract. Its § 8 q1, q2 and q4 are open |
| 10, the documentation restructure | [`documentation/phase-10-plan.md`](documentation/phase-10-plan.md) | [retrospect](documentation/phase-10-summary.md) | Its § 3.2, why nothing under `docs/` moves; § 3.5, the package READMEs' one opening and their gated peer ranges; § 3.10, `SECURITY.md`'s identifier check; § 6.1, the spec discipline for documentation; and § 9, the contract after it landed. Its § 8 q3 was decided after the phase, as [F25](backlog-retired.md#f25) Part 4 |

Phases 7 and 8 are reserved in [`ROADMAP.md`](../ROADMAP.md) and have no plan.

## Completed tracks

Work on one register entry, or a group of them, that needed more than one commit and was not a phase.

| Track | Documents | Subject |
| :--- | :--- | :--- |
| `a8/` | [plan](a8/plan.md), [step 2 plan](a8/step-2-plan.md), [step 2 decision](a8/step-2-decision.md) | [A8](backlog-retired.md#a8): `EvalService` retained every state it created until `ngOnDestroy` |
| `a20/` | [plan](a20/plan.md) | [A20](backlog-retired.md#a20): `EvalService._activeContexts` deleted |
| `a21/` | [plan](a21/plan.md) | [A21](backlog-retired.md#a21): `EvalService.ngOnDestroy` no longer clears caller-owned contexts |
| `a35/` | [plan](a35/plan.md) | [A35](backlog-retired.md#a35), with A36, A37, A39 and A42: dangerous function values past the call sandbox. Its § 3.1 is the identity set, § 3.3 the funnel, § 3.4 what stays open, and § 9 the contract after it landed. The second of its two § 1.2s holds the two probe rules the `step` skill repeats |
| `a45/` | [plan](a45/plan.md) | [A45](backlog-retired.md#a45) part 2 and [A44](backlog-retired.md#a44), with [A52](backlog-retired.md#a52): assignment targets as JavaScript evaluates them, released as `eval-core` 0.14.0, `eval-signals` 0.7.0 and `eval-forms` 0.7.0. Its § 0 collects thirteen rules, nine carried forward from earlier plans and four its own; § 1.4 holds the measurements, § 9 the contract after it landed, and § 10 the retrospect |
| `gates/` | [plan](gates/plan.md), [step 1](gates/step-1-summary.md), [step 2](gates/step-2-summary.md), [step 3](gates/step-3-summary.md), [step 4](gates/step-4-summary.md), [retrospect](gates/summary.md) | The documentation and CI gates |
| `trace-surface/` | [plan](trace-surface/plan.md) | The trace surface: A15, A16 and A19 decided |
| `trace2/` | [step 1, the bound](trace2/step-1.md), [step 2, the reset](trace2/step-2.md), [step 3, docs and records](trace2/step-3.md) | [A12](backlog-retired.md#a12): the trace bound and its reset, as step records without a plan |

## Gates

The gate is `npx nx run-many -t lint test build --skip-nx-cache --output-style=static`, run after every
step. `static` keeps successful tasks' output, which is where the test counts are read.

- [`tools/doc-links.mjs`](../tools/doc-links.mjs) — every relative link in a `*.md`, and in a comment
  line of a `*.ts`, resolves to a file and, where it names one, an anchor; untracked files git does
  not ignore are checked and named. So does every absolute link into the tree at `master`, and every
  link a published README prints, listed in [`tools/published-links.txt`](../tools/published-links.txt),
  which a package README's links must be in. And this page links every file under `docs/`
  ([F25](backlog-retired.md#f25)).
- [`tools/release-tags.mjs`](../tools/release-tags.mjs) — every row of the register's Publication
  status table has its `<project>@<version>` tag, at the commit the row names.
- The `readme-examples.spec.ts` files — each documented block runs, and the blocks a README holds are
  counted against the cases that run them ([F13](backlog-retired.md#f13)):
  [`eval-core`](../modules/eval-core/src/lib/readme-examples.spec.ts),
  [`eval-signals`](../modules/eval-signals/src/lib/readme-examples.spec.ts),
  [`eval-forms/reactive`](../modules/eval-forms/reactive/src/lib/readme-examples.spec.ts) and
  [`eval-forms/signals`](../modules/eval-forms/signals/src/lib/readme-examples.spec.ts).
- Each project's `export-list.spec.ts` and `public-api.spec.ts` — a README imports only what its
  package exports ([F3](backlog-retired.md#f3), [F11](backlog-retired.md#f11)), and every export is
  documented or allowlisted with a reason ([F10](backlog-retired.md#f10)). Phase 10 added three more
  in them: `SECURITY.md`'s identifiers resolve, each package README's quoted peer ranges equal its
  manifest, and the root README holds no code.
- [`internal/performance.spec.ts`](../modules/eval-core/src/lib/internal/performance.spec.ts) — the
  default path, with no hooks and no tracing, does not regress.

## Consumer documents kept here

These two are for consumers, not maintainers. The root README and `eval-forms`' README link them, and
published READMEs link them by absolute URL, which is why they stay under `docs/`.

- [`forms/worked-example.md`](forms/worked-example.md) — `eval-forms` with Reactive Forms.
- [`forms/worked-example-signals.md`](forms/worked-example-signals.md) — `eval-forms` with Signal Forms.

## Conventions

- **Design records stay as written.** A completed plan or summary is not updated to match the code.
  A link in one that would dangle becomes a permalink to the target at the last commit that touched
  it.
- **Their line citations refer to the commit that wrote them.** `git log` on the document finds that
  commit, and `git show <commit>:<file>` reads the code a citation names.
- **A live document cites a heading or a symbol**, not a line.
- **One retrospect per track**, and no per-step summaries in new work.
