---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/forms/phase-6-plan.md`
Target library: `@zvenigora/ng-eval-forms` (`modules/eval-forms`), the `/signals` entry point
Requested step: $ARGUMENTS

`eval-core` and `eval-signals` are **dependencies, not work areas**: the plan is scoped to
add nothing to either, and this library consumes both as published. Their lint and test
targets run below as the regression gate that catches a step which reached into one anyway.
If a step genuinely needs a change in either, that is a stop-and-replan condition, not a
wider step.

**`eval-forms` itself is published, at `0.1.0`** — which no previous phase had to work
against. The primary entry point and `/reactive` are a released surface with consumers, and
that is a third category the two above leave no slot for: *same project, already shipped,
additive only*.

- **Additive** work on the shared core at the primary entry point is in scope when the plan
  calls for it. `docs/forms/phase-4-plan.md` § 9.1's choke point may land there; deciding
  that is this phase's job.
- A change to an **existing exported symbol's shape**, or to `/reactive`'s behaviour, is a
  stop-and-replan condition on the same terms as reaching into a dependency. It is a
  breaking release of a package that is on npm.

The regression gate above does not cover this one. `eval-core` and `eval-signals` are
separate Nx projects, so reaching into either moves a row; the other two eval-forms entry
points are the **same** project as the one being worked on, and a widened core signature
moves nothing. Reading the diff is what covers it.

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
npx nx run-many -t lint test build
```

All must be clean, with the same exception § 1 allows and on the same terms. The
`eval-core` and `eval-signals` rows are the regression gate for the plan's scope section —
if either moves, the step touched a dependency.

`build` is in this list because a green `test` run is not a type-check: Jest compiles per
file through `tsconfig.spec` and `build:production` through `tsconfig.lib.prod`, and three
published packages is three chances for the difference to matter. It also stays the only
gate on an empty or type-only barrel, which ng-packagr rejects and nothing else notices.
All three projects default to the production configuration, so this covers what
`nx run eval-forms:build:production` used to cover on its own. `build` is **not** in § 1's
baseline, so confirm a build failure in a project the step did not touch is pre-existing
before reporting it as a regression.

Then two checks a green build cannot make.

**The `/signals` subpath actually shipped.** ng-packagr discovers a secondary entry point
by finding its `ng-package.json`; omit that file, or put it at the wrong level, and there
is no error — the subpath is simply absent from `dist/` and the build is green. Phase 4's
step 1 proved the check that catches this, so run the same one:

- Read `dist/modules/eval-forms/package.json` and confirm its `exports` map has a
  `./signals` key whose `types` and `default` name emitted files.
- Read `dist/modules/eval-forms/signals/package.json` and confirm it names the same pair.

That proves the ng-packagr wiring. It does not prove the `tsconfig.base.json` `paths`
mapping, which is what a spec importing through `@zvenigora/ng-eval-forms/signals` proves —
neither substitutes for the other, and per step 1's finding that spec must live under
*another* entry point's folder or `@nx/enforce-module-boundaries` rejects the self-import.

**The Angular 22 import stays confined to `/signals`.** `@angular/forms/signals` needs
Angular 22, the package manifest declares `>=19`, and it cannot narrow without breaking
every `/reactive` consumer on 19–21. The workspace is on Angular 22, so `build:production`
compiles that import wherever it appears and the failure lands in a 19–21 consumer's build
instead of ours. Grep `@angular/forms/signals` across `modules/eval-forms/` and confirm
every hit is under `modules/eval-forms/signals/`.

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
