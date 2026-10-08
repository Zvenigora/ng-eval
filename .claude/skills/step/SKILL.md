---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/signals/phase-5-plan.md`
Target library: `@zvenigora/ng-eval-signals` (`modules/eval-signals`)
Requested step: $ARGUMENTS

**Each step's file list in the plan's § 4 is its scope, and it is not the same list every step.**
Phase 5 builds an async signal in `eval-signals`, but two of its four steps reach elsewhere, by
design and nowhere else:

- **Step 1 is `eval-core`, test-only** — one new spec pinning that the walk ends before an async
  entry point returns its promise. A non-spec file under `modules/eval-core/` at *any* step is a
  stop-and-replan (plan § 2), not a wider step.
- **Step 4 touches `eval-forms`' manifest and changelog** — the peer-range patch the
  `eval-signals` bump forces (plan § 3.8) — and nothing else in that project.

Steps 2 and 3 are `eval-signals` and `docs/` only. Every other project's lint and test targets run
below as the regression gate that catches a step which reached into one anyway.

**All three packages are published**, and `eval-signals` is consumed by `eval-forms` — so a change
can be in one of two categories:

- **Additive** work — a new exported symbol, a new member of a type nothing implements — is in scope
  whenever the plan calls for it. Phase 5's surface (plan § 5) is all additive.
- A change to an **existing exported symbol's shape**, or to the behaviour of an already-shipped
  path, is a versioned release of that package: it needs an explicit callout in the step's report, a
  version bump, and an entry in that package's own `modules/<name>/CHANGELOG.md`
  (`## [0.5.0] - <npm's publish date, UTC>`). The plan has none; finding one is a stop-and-replan.

**Every step says which of those two it is, in its § 2 restatement**, and whether it ships in a
package at all — step 1 ships in none. The bumps land once, in step 4 (plan § 3.8); steps 2 and 3
add to `eval-signals` unreleased.

The lint and test targets below cover project boundaries: a step that edits another project moves
its row. They do **not** cover the second category — a widened signature or a changed behaviour
inside `eval-signals` leaves every row green. Reading the diff is what covers that.

## Current state

- Branch: !`git branch --show-current`
- Working tree: !`git status --short`

## Standing instructions for this session

These apply for the rest of the session, not just the first response.

- Do exactly the one step requested. **Do not begin the next step**, even if it looks
  small, related, or already half-done. Ending the session is the correct outcome.
- Do not "improve" code outside the step's stated file list. If you notice something
  wrong nearby, report it at the end instead of fixing it.
- If the step as written turns out to be wrong or impossible, stop and say so. Do not
  improvise a replacement design.

## Procedure

### 1. Establish a green baseline

If the working tree above is not clean, stop and report what is uncommitted. Do not
start work on top of unrelated changes.

Then run:

```sh
npx nx run-many -t lint test
```

Unfiltered on purpose. A project named in `-p` that does not exist yet is **silently
dropped**, not an error, so a stale project list reads as a pass while covering less than
it names.

If a target fails before you have changed anything, stop and report — unless the plan's
baseline section records it as an expected pre-existing failure *and* the step you are on
is one it covers. Any other pre-existing failure must be understood before it is buried
under new work.

**A Jest worker-teardown warning is a regression now, not a known intermittent.** `A worker
process has failed to exit gracefully` used to fire under multi-target `nx run-many`, when a
worker missed `jest-worker`'s fixed 500 ms exit window while three projects' pools contended for
the cores. `jest.preset.js` sets `maxWorkers: 1`, so Jest runs every test file in band and starts
no worker (`docs/backlog-retired.md` F7). If the warning appears, something has turned workers
back on: a raised `maxWorkers`, or a `workerIdleMemoryLimit`, which forces them. Find it and
report it before going on. In band, a spec that leaks a handle shows instead as `Jest did not
exit one second after the test run has completed`.

### 2. Read and restate

Read the plan document and locate the requested step. Then report back, without
editing anything:

- The step's objective in one sentence.
- Every file it says to create or edit, marked **new** or **edit**.
- **Which category the step is in** — additive, or a versioned change to an already-shipped
  path — and, if the second, what the plan says about the bump and the `CHANGELOG.md` entry.
- Its stated exit criteria, verbatim.
- Anything in the step you find ambiguous, or that disagrees with what the code
  actually looks like now.

**Then stop and wait for my confirmation.** Do not proceed to step 3 in the same
response.

### 3. Implement

After I confirm:

- Touch only the files identified in step 2. If the work genuinely requires a file
  not on that list, stop and ask first.
- Follow the testing rules in CLAUDE.md: new behaviour is written test-first; a pure
  refactor is gated by the existing suite instead, with new specs added after it is
  green.
- Never weaken or delete an existing assertion to make something pass.

### 4. Verify

```sh
npx nx run-many -t lint test build --skip-nx-cache --output-style=static
```

All must be clean, with the same exception § 1 allows and on the same terms. The `eval-core`
row is the regression gate for the plan's § 2 — this phase changes no `eval-core` source, so its
count moves only by step 1's new cases. The `eval-forms` row is the downstream witness: it consumes
`eval-signals` at its published surface, so a step that alters an existing `eval-signals` path shows
up there before it shows up in a consumer's build — and at step 4 its `lint` is what proves the peer
range was widened (plan § 3.8).

`build` is in this list because a green `test` run is not a type-check: Jest compiles per
file through `tsconfig.spec` and `build:production` through `tsconfig.lib.prod`, and three
published packages is three chances for the difference to matter. It also stays the only
gate on an empty or type-only barrel, which ng-packagr rejects and nothing else notices.
All three projects default to the production configuration, so this covers what
`nx run eval-forms:build:production` used to cover on its own. `build` is **not** in § 1's
baseline, so confirm a build failure in a project the step did not touch is pre-existing
before reporting it as a regression.

Then the check a green build cannot make, which for this phase is the scope gate itself.

**Nothing moved outside the step's file list.** A green suite is weak evidence for this: an edit
to another project that keeps that project's own suite green moves no row at all, and the second
category above moves none by construction.

```sh
git diff --name-only HEAD
```

Every path must be on the step's own file list in the plan's § 4, or be the plan document itself.
Anything else is a **stop-and-replan**, not a judgement call — and a non-spec file under
`modules/eval-core/`, or anything under `modules/eval-forms/` other than step 4's `package.json`
and `CHANGELOG.md`, most of all. Report it and stop.

**Inside `eval-signals`, a `public-api.ts`, an `index.ts` or a `package.json` in the diff is not a
stop condition** — steps 2 and 3 add exports, and step 4 bumps the version. What they are instead
is the trigger for the categories' checklist: the report says which category the step is in, and
where the callout, the bump and the `CHANGELOG.md` entry are — or that the plan puts them in
step 4.

If a pre-existing spec now fails, that is a regression in this step, not a stale test.
Report it; do not edit the spec to match the new behaviour.

### 5. Report

Before writing your report, invoke the `code-reviewer` subagent on this step's changes. Include its findings in your report. If it raises anything Critical, stop and surface it rather than closing out the step.

**Expect a permission prompt for that invocation, and approve it.** The `allowed-tools` above
deliberately does not name the subagent tool: its token is not the same in every build — `Task`
in the ones this skill has run under, `Agent` in others — and a grant naming the wrong one
grants nothing while reading like a grant. A prompt that arrives is the honest version of that.

Finish with:

- Each exit criterion from the plan, marked met or not met, with the evidence.
- The files changed, and a one-line reason for each.
- Anything you noticed but deliberately did not fix.
- A suggested commit message in the repo's Angular format.

Do not commit. Do not start the next step.
