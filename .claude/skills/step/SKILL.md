---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Bash(git grep *) Bash(git ls-files *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/documentation/phase-11-plan.md`
Target: `@zvenigora/ng-eval-forms` — Phase 11, its README by entry point (F28)
Requested step: $ARGUMENTS

**The plan adds no rules of its own** (its § 0). Its § 3.1 fixes D1–D6, and no step reopens them.

**The plan changes `eval-forms` only**, and only its documents, one spec's bound and title and its
version. `eval-core` and `eval-signals` change in nothing:

- **Step 1 is the plan and its records**, with the README's Development sentence and its
  `[Unreleased]` line. *Done.*
- **Step 2 is the reorder**: `modules/eval-forms/README.md`, the `/reactive`
  `readme-examples.spec.ts`'s `from`, its count case's title and its comment lines, and the
  CHANGELOG's `[Unreleased]`. No heading's text or level changes, and the `/signals` spec is not
  edited. *Done.*
- **Step 3 is the release commit**, `eval-forms` 0.7.1. *Done.*
- **Step 4 is the post-publish record**, which touches no file under `modules/` unless npm's
  publish date differs from the CHANGELOG's.

A file outside the step's list is a stop-and-replan, not a wider step. A `package.json` in the diff
before step 3 is a stop-and-replan.

**The counts every step holds**, the gate at 8e6a617 with step 1's edits, which compile nothing and
move no block, heading or import a README spec reads: `eval-core` 3134, `eval-signals` 444,
`eval-forms` 380, as at 0d305a3. Every step moves them 0 / 0 / 0.

**The standing rules load with `CLAUDE.md`** (`docs/standing-rules.md`), and the plan's § 0, where
it has one, adds to them; read it first. Each step's file list in the plan's § 4 is its scope, and it
is not the same list every step ([SR3](../../../docs/standing-rules.md#sr3)). A README or CHANGELOG
under `modules/<name>/` ships in that package's tarball, as its code does, and every step says where
it ships, in its § 2 restatement ([SR11](../../../docs/standing-rules.md#sr11)). The gate cannot see
a stale sentence or a plain-text mention; the sweep can ([SR25](../../../docs/standing-rules.md#sr25)).

## Current state

- Branch: !`git branch --show-current`
- Working tree: !`git status --short`

## Standing instructions for this session

These apply for the rest of the session, not just the first response: do exactly the one step
requested, and end the session after it ([SR2](../../../docs/standing-rules.md#sr2)); report what is
wrong nearby rather than fixing it ([SR3](../../../docs/standing-rules.md#sr3)).

## Procedure

### 1. Establish a green baseline

If the working tree above is not clean, stop and report what is uncommitted. Do not
start work on top of unrelated changes.

Then run:

```sh
npx nx run-many -t lint test
```

This is the baseline, not the gate, and unfiltered on purpose ([SR8](../../../docs/standing-rules.md#sr8)).

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
- Every file it says to create, edit or delete, marked **new**, **edit** or **delete**.
- **Which category the step is in** — ships in no package, ships in a package's next release, or
  the release — and, if the second, the `[Unreleased]` line the plan gives it.
- Its stated exit criteria, verbatim.
- Anything in the step you find ambiguous, or that disagrees with what the code
  actually looks like now.

**Then stop and wait for my confirmation.** Do not proceed to step 3 in the same
response.

### 3. Implement

After I confirm:

- Touch only the files identified in step 2. If the work genuinely requires a file
  not on that list, stop and ask first.
- Tests and probes follow [SR13](../../../docs/standing-rules.md#sr13)–[SR19](../../../docs/standing-rules.md#sr19)
  and [SR30](../../../docs/standing-rules.md#sr30); probes are pinned and reverted by
  [SR32](../../../docs/standing-rules.md#sr32).

### 4. Verify

```sh
npx nx run-many -t lint test build --skip-nx-cache --output-style=static
```

This is the gate ([SR8](../../../docs/standing-rules.md#sr8)), run once. All must be clean, with the
same exception § 1 allows and on the same terms, and the test rows move exactly as the plan says
([SR10](../../../docs/standing-rules.md#sr10)). The report gives doc-links' file and link counts, and
release-tags' row and tag counts.

`build` is in it because a green `test` run is not a type-check
([SR9](../../../docs/standing-rules.md#sr9)), and it is the only gate on an empty or type-only
barrel, which ng-packagr rejects and nothing else notices. `build` is **not** in § 1's baseline, so
confirm a build failure in a project the step did not touch is pre-existing before reporting it as a
regression.

Then the check a green build cannot make: the scope gate.

**Nothing moved outside the step's file list** ([SR3](../../../docs/standing-rules.md#sr3)); an edit
to a document or a comment moves no test row at all. Every path must be on the step's list or be the
plan document itself; anything else, report and stop. The check is `git status --porcelain`, not
`git diff --name-status HEAD`, which lists no untracked file, and a file a step creates is untracked
until it is staged: a new file, wanted or stray, would pass unseen.

```sh
git status --porcelain
```

Then the step's **one-off checks**, the commands its criteria name. They are not in the gate, so
the report gives each command and its output.

### 5. Report

Before writing your report, invoke the `code-reviewer` subagent on this step's changes, as
[SR33](../../../docs/standing-rules.md#sr33) requires, and include its findings. If it raises anything
Critical, stop and surface it rather than closing out the step. A step that changes no file under
`modules/` or `tools/` runs it where the plan or the prompt says; when it does not, its report gives the step's
one-off checks instead, and says that the reviewer was not run and why.

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
