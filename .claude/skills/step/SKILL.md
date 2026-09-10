---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/statements/phase-2-plan.md`
Target library: `@zvenigora/ng-eval-core` (`modules/eval-core`)
Requested step: $ARGUMENTS

`eval-signals` and `eval-forms` are **dependencies, not work areas**: Phase 2 adds statement
support to the evaluator they both consume, and consumes neither of them. Their lint and test
targets run below as the regression gate that catches a step which reached into one anyway. If
a step genuinely needs a change in either, that is a stop-and-replan condition, not a wider
step.

**`eval-core` is published, at `0.3.0`, and it is the package the other two are built on** —
which is a third category the two above leave no slot for: *same project, already shipped, and
every consumer downstream of it*.

- **Additive** work — a new visitor, its registration in `recursive-visitors.ts`, a new node
  type — is in scope whenever the plan calls for it.
- A change to an **existing exported symbol's shape**, or to the behaviour of an
  already-shipped path, is a versioned release of that package: it needs an explicit callout
  in the step's report, a version bump, and an entry in the root `CHANGELOG.md` under a
  heading naming the package (`## [eval-core 0.4.0]`).

**Every step says which of those two it is, in its § 2 restatement.** Step 0 is the case that
proves the requirement is needed: `docs/backlog.md` A9's `try`/`finally` changes what a
throwing arrow body leaves on a reused `EvalContext`, and B2 deletes a `console.log` from the
shipped bundle. Both
are behavioural changes to a published package and neither is additive, in the package the
other two depend on — and a phase that reads its own first step as cleanup has already skipped
the callout. Whether the bump lands per step or once at the end of the phase is the plan
document's call; saying which category the step is in is this skill's requirement either way.

The lint and test targets below cover the first rule: `eval-signals` and `eval-forms` are
separate Nx projects, so a step that edits one moves a row. They do **not** cover the third
category — a widened signature or a changed behaviour inside `eval-core` leaves every row
green. Reading the diff is what covers that.

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

**One known intermittent is not a failure and not yours.** A Jest worker-teardown warning fired
twice in roughly a dozen runs, both times under a multi-target `nx run-many` — `-t lint test
build`, § 4's command rather than this one — and zero times for any project run alone or for
`run-many -t test`. The table is `docs/backlog.md` F7, which is where the measurements live;
the entry is open, with no reproduction and a corrected locus that is no longer `eval-core`.
Targets stay green through it. Re-run the command; if it recurs, capture it with
`--output-style=stream` so the emitting task is attributed, note that in the report, and carry
on with the step.

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
npx nx run-many -t lint test build
```

All must be clean, with the same exception § 1 allows and on the same terms. The
`eval-signals` and `eval-forms` rows are the regression gate for the plan's scope section — if
either moves, the step touched a dependency. They are also this phase's downstream witness:
both libraries consume `eval-core` at its published surface, so a statement change that alters
an existing path shows up there before it shows up in a consumer's build.

`build` is in this list because a green `test` run is not a type-check: Jest compiles per
file through `tsconfig.spec` and `build:production` through `tsconfig.lib.prod`, and three
published packages is three chances for the difference to matter. It also stays the only
gate on an empty or type-only barrel, which ng-packagr rejects and nothing else notices.
All three projects default to the production configuration, so this covers what
`nx run eval-forms:build:production` used to cover on its own. `build` is **not** in § 1's
baseline, so confirm a build failure in a project the step did not touch is pre-existing
before reporting it as a regression.

Then the check a green build cannot make, which for this phase is the scope gate itself.

**Nothing moved outside `eval-core`.** A green suite is weak evidence for this: an edit to
`eval-signals` or `eval-forms` that keeps that project's own suite green moves no row at all,
and the third category above moves none by construction.

```sh
git diff --name-only HEAD
```

Every path must be under `modules/eval-core/`, under `docs/`, or the root `CHANGELOG.md`. A
path under `modules/eval-signals/` or `modules/eval-forms/` is a **stop-and-replan**, not a
judgement call — a `public-api.ts`, an `index.ts` or a `package.json` there most of all.
Report it and stop.

**Inside `eval-core` those same three filenames are not a stop condition**, and that split is
the whole difference from the previous track's rule: a `package.json` version bump is an
expected output of this phase, and the plan may export a type. What they are instead is the
trigger for the third category's checklist. When one of them is in the diff, the report says
which category the step is in and where the callout, the bump and the `CHANGELOG.md` entry
are — or why the plan defers them to a later step.

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
