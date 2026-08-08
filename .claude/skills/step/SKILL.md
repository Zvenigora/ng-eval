---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/side-effects/phase-1-plan.md`
Requested step: $ARGUMENTS

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
npx nx run eval-core:lint
npx nx run eval-core:test
```

If either fails before you have changed anything, stop and report. A pre-existing
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
npx nx run eval-core:lint
npx nx run eval-core:test
```

Both must be clean. For any step that changes the published API surface, also run:

```sh
npx nx run eval-core:build:production
```

If a pre-existing spec now fails, that is a regression in this step, not a stale test.
Report it; do not edit the spec to match the new behaviour.

### 5. Report

Finish with:

- Each exit criterion from the plan, marked met or not met, with the evidence.
- The files changed, and a one-line reason for each.
- Anything you noticed but deliberately did not fix.
- A suggested commit message in the repo's Angular format.

Do not commit. Do not start the next step.
