---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/gates/plan.md`
Target: **all three libraries**, and specs only — see the constraint below
Requested step: $ARGUMENTS

**This track's scope rule is not the previous phases'**, and the difference is why this
section is more than a retarget. Phases 3, 4 and 6 each named one library as the work area
and made reaching into another a stop-and-replan. This track has no single work area:
`docs/gates/plan.md` steps 2, 3 and 4 add specs to `eval-core` and `eval-signals`, and step 1
edits `eval-signals`' and `eval-forms`' `project.json`. Applying the old rule here would make
step 3 a stop-and-replan on its own file list.

**The constraint that replaces it is about the kind of file, not the project.** All three
libraries are work areas; in all three, this track may add or edit only:

- `*.spec.ts` / `*.test.ts`
- `project.json`
- `README.md`, and documents under `docs/`

**A non-spec file under `src/lib/`, `reactive/` or `signals/` in the diff is a
stop-and-replan condition** — that is § 6 gate 1 of the plan, and it is the whole reason this
track is safe to run ahead of Phase 2. So is anything that changes a `public-api.ts`, an
`index.ts`, or a `package.json` under `modules/` (§ 6 gate 2): all three packages are
published, and this track ships no exported symbol, no version bump and no `CHANGELOG.md`
entry (§ 5).

The lint and test targets below run for all three projects and are the regression gate. They
do **not** cover the constraint above — adding a spec and editing a source file both leave the
suite green. Reading the diff is what covers it.

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

All must be clean, with the same exception § 1 allows and on the same terms. All three
projects are work areas for this track, so no row here is a scope gate on its own — the
scope gate is the diff check below.

`build` is in this list because a green `test` run is not a type-check: Jest compiles per
file through `tsconfig.spec` and `build:production` through `tsconfig.lib.prod`, and three
published packages is three chances for the difference to matter. It also stays the only
gate on an empty or type-only barrel, which ng-packagr rejects and nothing else notices.
All three projects default to the production configuration, so this covers what
`nx run eval-forms:build:production` used to cover on its own. `build` is **not** in § 1's
baseline, so confirm a build failure in a project the step did not touch is pre-existing
before reporting it as a regression.

Then the check a green build cannot make, which for this track is the scope gate itself.

**No non-spec source file moved, in any of the three projects.** This is § 6 gates 1 and 2 of
the plan, and it is the property that lets this track run ahead of Phase 2 without a version
bump. A green suite does not show it: adding a spec and editing the source it covers both
leave `lint test build` clean.

```sh
git diff --name-only HEAD
```

Every path must be a `*.spec.ts` / `*.test.ts`, a `project.json`, a `README.md`, or a file
under `docs/`. A path under `src/lib/`, `reactive/` or `signals/` that is not a spec — or any
`public-api.ts`, `index.ts` or `package.json` under `modules/` — is a **stop-and-replan**, not
a judgement call. Report it and stop.

The one edit this rule deliberately permits is a `README.md`: `docs/gates/plan.md` § 1.5 has
steps 3 and 4 completing a documented fragment in the **document** rather than padding a spec
around it. Say in the report which blocks moved and why.

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
