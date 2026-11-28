# Release history, by plan

Which release each completed phase and track shipped as, and what each plan document is the
reference for. It was two passages of `CLAUDE.md` until 2026-11-14, and moved here so that
`CLAUDE.md`, which every session loads, keeps the facts about the code and not the history of the
work. This file is not loaded with it: open it when a question is about what shipped where, or
about which plan to read.

Two other documents hold the same ground, and win where they differ:

- The versions themselves, each with its date and tag, are the register's
  [Publication status](backlog.md#publication-status) table, which `npm test` checks against the
  tags.
- Every plan, with its summaries, is indexed in [`README.md`](README.md), and the phases in
  [`ROADMAP.md`](../ROADMAP.md).

A release step or a retrospect adds its line here, not to `CLAUDE.md`. `CLAUDE.md` keeps only the
version each package is published at, and which plan is active.

## What shipped, in order

Phases 1, 2, 3, 4, 5, 6, 9, 10, 11 and 19 are complete, and their plan documents are design records
rather than active work. So are the tracks below.

| Phase or track | Subject | Shipped as | Plan |
| :--- | :--- | :--- | :--- |
| Phase 3 | `@zvenigora/ng-eval-signals`, a new module | `eval-signals` 0.1.0 | [`signals/phase-3-plan.md`](signals/phase-3-plan.md) |
| Phase 6 | The `/signals` entry point of `eval-forms` | `eval-forms` 0.2.0 | [`forms/phase-6-plan.md`](forms/phase-6-plan.md) |
| Phase 2 | Statements | `eval-core` 0.4.0 | [`statements/phase-2-plan.md`](statements/phase-2-plan.md) |
| Phase 5 | The async signal | `eval-signals` 0.5.0 | [`signals/phase-5-plan.md`](signals/phase-5-plan.md) |
| Phase 9 | Colon-joined identifiers | `eval-core` 0.12.0, `eval-signals` 0.5.1 and `eval-forms` 0.5.0 | [`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) |
| The A35 plan | Dangerous function values past the call sandbox, with A36 and A37 | `eval-core` 0.12.1 and 0.13.0; its advisory is GHSA-qrqj-3445-3rjx | [`a35/plan.md`](a35/plan.md) |
| Phase 10 | The documentation restructure | `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms` 0.6.1, docs-only patches | [`documentation/phase-10-plan.md`](documentation/phase-10-plan.md) |
| The A45 plan | A45 part 2 and A44: assignment targets as JavaScript evaluates them | `eval-core` 0.14.0, `eval-signals` 0.7.0 and `eval-forms` 0.7.0 | [`a45/plan.md`](a45/plan.md) |
| Phase 11 | `eval-forms`' README by entry point ([F28](backlog-retired.md#f28)) | `eval-forms` 0.7.1, a docs-only patch | [`documentation/phase-11-plan.md`](documentation/phase-11-plan.md) |
| The A24 plan | The await track: A25, A24 and D13 | `eval-core` 0.15.0, `eval-signals` 0.8.0 and `eval-forms` 0.8.0 | [`a24/plan.md`](a24/plan.md) |
| The A33 plan | The case-insensitive lookup cache's miss, A33, and the options a parse remembers, A34 | `eval-core` 0.15.1, a patch | [`a33/plan.md`](a33/plan.md) |
| The A48 plan | Member reads and writes that miss the data, and a getter's throw: A48, A50, A51, A55 and F29 fixed, and A49 decided a documented limit | `eval-core` 0.16.0 with `eval-signals` 0.9.0 and `eval-forms` 0.9.0 | [`a48/plan.md`](a48/plan.md) |
| Phase 19 | The demo application at `apps/demo` | No package: the site at `zvenigora.github.io/ng-eval/`, first deployed 2026-11-18 | [`demo/plan.md`](demo/plan.md) |
| A64's track | A write policy asked about a table built-in handed as an argument to a function the walk did not create; [A64](backlog.md#a64) stays open, not scheduled | `eval-core` 0.16.2, a security patch, published 2026-11-26 | None: two commits, ed8dc0c and 47f4634, recorded in A64's entry |

Phases 1 and 4 have no row: `CLAUDE.md` did not record their versions. Phases 1, 3, 4 and 6
shipped before the Publication status table began, and each one's release is the entry that opens
"Phase N of the roadmap" in its package's CHANGELOG, as [`ROADMAP.md`](../ROADMAP.md) says.

## The design records, and what each is the reference for

The completed plans are design records, not work in progress, and each remains the reference for
its library: they record findings about this codebase that are not obvious from reading files in
isolation.

- [`side-effects/phase-1-plan.md`](side-effects/phase-1-plan.md) — Phase 1, the hook contract
  (its § 9 and § 9.1).
- [`statements/phase-2-plan.md`](statements/phase-2-plan.md) — Phase 2, statements.
- [`signals/phase-3-plan.md`](signals/phase-3-plan.md) — Phase 3; its § 9 is the downstream
  contract `eval-forms` is entitled to rely on, and § 3.2.2 the construct-once finding.
- [`forms/phase-4-plan.md`](forms/phase-4-plan.md) — Phase 4; its § 9 designs Phase 6 and § 9.1
  states Phase 6's one correctness precondition.
- [`signals/phase-5-plan.md`](signals/phase-5-plan.md) — Phase 5, the async signal; its § 3.4 is
  the value and status contract, and § 9 the downstream one.
- [`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) — Phase 9,
  colon-joined identifiers; its § 3.4 is the grammar, § 3.5 the acorn plugin and the internals it
  relies on, and § 9 the downstream contract. Its § 8 q1, q2 and q4 are open, waiting on real
  expressions arriving as corpus data, and say so; q5 is decided — not provided in Phase 9 — and
  reopens only on the condition the plan states.
- [`a35/plan.md`](a35/plan.md) — the A35 track, dangerous function values past the call sandbox,
  with A36, A37, A39 and A42, shipped as `eval-core` 0.12.1 and 0.13.0; its § 3.1 is the identity
  set, § 3.3 the funnel, § 3.4 what stays open, and § 9 the contract after it landed. It numbers
  two § 1.2s: the second, "Standing rules, from Revision 16", holds the two probe rules that are
  now [SR18](standing-rules.md#sr18) and [SR19](standing-rules.md#sr19).
- [`documentation/phase-10-plan.md`](documentation/phase-10-plan.md) — Phase 10, the
  documentation restructure, shipped as `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms`
  0.6.1, docs-only; its § 3.2 is why nothing under `docs/` moves, § 3.5 the package READMEs' one
  opening and their gated peer ranges, § 3.10 `SECURITY.md`'s identifier check, § 6.1 the spec
  discipline for documentation, and § 9 the contract after it landed. Its § 8 q3 was decided
  after the phase, as [F25](backlog-retired.md#f25) Part 4: a published absolute link binds its
  target.
- [`a45/plan.md`](a45/plan.md) — the A45 track, A45 part 2 and A44, assignment targets as
  JavaScript evaluates them, with A52, shipped as `eval-core` 0.14.0, `eval-signals` 0.7.0 and
  `eval-forms` 0.7.0; its § 0 collects thirteen rules, now standing rules
  ([the map](standing-rules.md#old-numberings)), § 3 is the design, § 9 the contract after it
  landed, and § 10 the retrospect. Its § 8 q2–q4 are pointers to A48–A51; the A48 plan fixed A48,
  A50 and A51 in its steps 2 to 4, and decided A49 a documented limit in step 5.
- [`documentation/phase-11-plan.md`](documentation/phase-11-plan.md) — Phase 11, `eval-forms`'
  README by entry point, shipped as `eval-forms` 0.7.1, docs-only; its § 3.1 is D1–D6, why each
  package keeps one README and no guide file exists, § 3.2 the README's order, § 3.5 its contents
  list, § 9 the contract after it landed — its headings are 0.7.0's word for word — and § 10 the
  retrospect.
- [`a24/plan.md`](a24/plan.md) — the A24 track, the await track: A25, A24 and D13, shipped as
  `eval-core` 0.15.0, `eval-signals` 0.8.0 and `eval-forms` 0.8.0. Its § 3.2 is the
  accepted-position design: the accepted `await` is read off each walk's root and carried in that
  walk's visitor table, never on `st` or a node. § 3.3 is the statement table that
  `findUnsupportedStatement` and the evaluator share, § 9 the contract after it landed, and § 10
  the retrospect. Its § 0's two rules are now [SR40](standing-rules.md#sr40) and
  [SR41](standing-rules.md#sr41).
- [`a33/plan.md`](a33/plan.md) — the A33 and A34 track: the case-insensitive lookup cache's miss
  re-validated by name, and the options a parse remembers by identity, documented. Shipped as
  `eval-core` 0.15.1. Its § 3.1 is the B1 design, § 9 the contract after it landed, and § 10 the
  retrospect; its § 8 q1 is decided by one `eval-signals` row, D1.
- [`a48/plan.md`](a48/plan.md) — member reads and writes that miss the data, and a getter's
  throw: A55, A48, A50 and A51 fixed, A49 decided a documented limit, F29's cases. Shipped as
  `eval-core` 0.16.0 with `eval-signals` 0.9.0 and `eval-forms` 0.9.0. Its § 9 maps the published
  entries to their witnesses, and § 10 is the retrospect, whose twelve review stops are SR45's
  origin.
- [`demo/plan.md`](demo/plan.md) — Phase 19, the demo application at `apps/demo`, shipped in no
  package. Its § 9 says how a page is added, how a new library joins the demo, and how the site is
  deployed; § 3 is the design of the first version, § 1.3 the measurements on its prototype, and
  § 10 the retrospect, which promoted § 0's D-1 and D-2 as SR49 and SR50.

Their open questions are settled unless the document says otherwise. They stay as written, and
their line citations, and those in their summaries, refer to the code at the commits that wrote
them ([SR6](standing-rules.md#sr6)): `git log` on the document finds that commit, and
`git show <commit>:<file>` the code a citation names. Two of them number a § 9 and a § 9.1 on
unrelated subjects.

## Plans written and not released

Phase 12's is active, steps 1 to 6 done; no step of Phase 17's has run.

- [`eval-rules/plan.md`](eval-rules/plan.md) — Phase 12, `@zvenigora/ng-eval-rules` 0.1.0: active.
- [`eval-template/plan.md`](eval-template/plan.md) — Phase 17, `@zvenigora/ng-eval-template`
  0.1.0.

Each plan's first lines give its revision and what is open in it.
