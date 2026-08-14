---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/signals/phase-3-plan.md`
Target library: `@zvenigora/ng-eval-signals` (`modules/eval-signals`)
Requested step: $ARGUMENTS

`eval-core` is a **dependency, not a work area**: the plan is scoped to add nothing to it
(§ 2). Its lint and test targets run below as the regression gate that catches a step which
reached into it anyway. If a step genuinely needs a core change, that is a stop-and-replan
condition, not a wider step.

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
npx nx run-many -t lint test -p eval-signals eval-core
```

If a target fails before you have changed anything, stop and report — with one
exception, recorded in the plan's § 1.1: until step 1 lands, `eval-signals:lint` fails on
two `@nx/dependency-checks` errors and `eval-signals:build:production` fails with
`failed to get symbol for entrypoint`, both because the library has no source yet. Those two
are the baseline for step 1 and are expected to be red *only* then. Any other pre-existing
failure must be understood before it is buried under new work.

### 2. Read and restate

Read the plan document and locate the requested step. Then report back, without
editing anything:

- The step's objective in one sentence.
- Every file it says to create or edit, marked **new** or **edit**.
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
npx nx run-many -t lint test -p eval-signals eval-core
npx nx run eval-signals:build:production
```

All must be clean. The build target is not optional here the way it was for `eval-core`:
this library's entry point is new, and ng-packagr is the only gate that catches an empty or
type-only barrel. § 1's exception applies to both commands above until step 1 lands:
`eval-signals:lint` is expected red on its two `@nx/dependency-checks` errors, and
`eval-signals:build:production` on `failed to get symbol for entrypoint` — both for the
no-source-yet reason recorded in the plan's § 1.1. The `eval-core` rows are the
regression gate for § 2 — if they move, the step touched core.

If a pre-existing spec now fails, that is a regression in this step, not a stale test.
Report it; do not edit the spec to match the new behaviour.

### 5. Report

Before writing your report, invoke the `code-reviewer` subagent on this step's changes. Include its findings in your report. If it raises anything Critical, stop and surface it rather than closing out the step.

Finish with:

- Each exit criterion from the plan, marked met or not met, with the evidence.
- The files changed, and a one-line reason for each.
- Anything you noticed but deliberately did not fix.
- A suggested commit message in the repo's Angular format.

Do not commit. Do not start the next step.
