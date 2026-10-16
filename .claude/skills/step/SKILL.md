---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Bash(git grep *) Bash(git ls-files *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/a35/plan.md`
Target library: `@zvenigora/ng-eval-core` (`modules/eval-core`). The release shape is pending (plan
§ 2, § 8 q5): (i) 0.12.1, then 0.13.0; or (ii) 0.13.0 alone. It is settled before any release step,
and before step 5.
Requested step: $ARGUMENTS

**Phase 10 (`docs/documentation/phase-10-plan.md`) is paused after its step 2.** This skill runs the
A35 plan until its first release and that release's post-publish commit have landed: step 6 under
shape (i), step 9 under shape (ii). It is then retargeted. Which runs next, Phase 10's step 3 or this
plan's step 7, is settled with the release shape.

**Each step's file list in the plan's § 4 is its scope, and it is not the same list every step.**
The A35 plan closes the call sandbox's gaps in `eval-core`, at named steps and nowhere else:

- **Step 1 is A36**: the tag call through the call's own path. It touches
  `tagged-template-expression.ts`, `call-expression.ts` (the member branch as the internal
  `callMember`, and `safeCall` exported, which stays internal), and a new spec.
- **Step 2 is K1 and the identity set**. It touches:
  - the new internal `dangerous-values.ts`;
  - `isFunctionSafe` and `isConstructorSafe`;
  - a new `eval.service.dangerous-values.spec.ts`;
  - T11 and T12 in `tagged-template-expression.spec.ts`;
  - `member-write-policy.ts`'s stale comment.
- **Step 3 is A37**: a `SequenceExpression` visitor, its registration and spec, and the root
  README's node list.
- **Step 4 is the funnel**: `pushVisitorResult`, the callee and `typeof` marks, and the spec's value
  routes. Its objective is narrowed to the walk's own values (plan Revision 6). It is implemented
  and verified in the working tree, and not committed.
- **Step 5 is documents, under shape (i) only**: `SECURITY.md` for 0.12.1, with the mitigations
  first. The funnel is a protection; the route through `this` and a host container are limits. It
  touches no library file, and does not retire A35.
- **Step 6 is the 0.12.1 release, under shape (i) only**: `modules/eval-core/package.json` and its
  CHANGELOG, then CONTRIBUTING's Releasing steps. Publishing and tagging are the maintainer's (plan
  § 5).
- **Step 7 is A39**: what `this` evaluates to, a breaking change for 0.13.0. It is specified once
  the plan's § 8 q4 is decided from its measurement, and its scope is fixed at its gate.
- **Step 8 is documents**: `SECURITY.md`'s `this` limit becomes a protection, and A39 and A35 are
  retired. Under shape (ii) it also carries step 5's text.
- **Step 9 is the 0.13.0 release.** Each downstream package widens its peer range in a release of its
  own, which is planned with step 7.

Stop-and-replans in every step:

- **A file under `modules/eval-signals/` or `modules/eval-forms/`**, through step 8. Their code does
  not change, and their suites run as the downstream witnesses, with their counts unchanged. Step 9's
  downstream releases are planned with step 7.
- **A non-spec `.ts` change outside `modules/eval-core/src/lib/internal/visitors/`** in steps 1–4, and
  any non-spec `.ts` change in steps 5, 6 and 8. Step 7's scope is fixed at its gate.
- **A change to a published barrel, or anything else that alters the built `.d.ts`.**
  - The published barrels are `modules/eval-core/src/public-api.ts` and the barrels it re-exports.
  - The internal visitors barrel, `internal/visitors/public-api.ts`, is not one of them:
    `src/public-api.ts` does not re-export it, and `export-list.spec.ts` pins that.
  - Every change in steps 1–4 is internal (plan § 4, step 6, criterion 2). Step 7's surface change
    is fixed at its gate.
- **A `package.json` change outside the release steps, 6 and 9.**
- **An existing assertion that would have to change, in steps 1–4.** Option (a) keeps every one (plan
  § 2). If one fails, the design is wrong, not the assertion. Step 7 changes what `this` evaluates
  to, and its gate names the assertions it changes.

**The steps fall into three categories:**
- **A change on a published path**: steps 1–4, in the first release. Steps 1, 2 and 4 each add an
  `[Unreleased]` › Security line to `modules/eval-core/CHANGELOG.md` with the change, and step 3 a
  › Fixed line. Step 7, a breaking change, goes into 0.13.0.
- **Documents**: steps 5 and 8, which ship in no package.
- **A release**: steps 6 and 9. A version moves only in a release step.

**Every step says which of these it is, in its § 2 restatement.**

The lint and test targets below cover project boundaries. They do **not** cover a refusal that
fires for the wrong reason, which only the plan's probes do (each fix removed, read case by case),
or a change in timing. `performance.spec.ts` is the timing gate in every step, and step 4 adds its
own timing line against step 3's bundle (plan § 4, step 4, criterion 4).

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
- Every file it says to create, edit or delete, marked **new**, **edit** or **delete**.
- **Which category the step is in**: a change on a published path (steps 1–4 and 7, each with its
  `[Unreleased]` line), documents (steps 5 and 8), or a release (steps 6 and 9).
- Its stated exit criteria, verbatim.
- Anything in the step you find ambiguous, or that disagrees with what the code
  actually looks like now.

**Then stop and wait for my confirmation.** Do not proceed to step 3 in the same
response.

### 3. Implement

After I confirm:

- Touch only the files identified in step 2. If the work genuinely requires a file
  not on that list, stop and ask first.
- Follow the testing rules in CLAUDE.md. New behaviour is written test-first: the route cases
  before the fix, each red for the reason it names.
- Never weaken or delete an existing assertion to make something pass. This plan changes none
  (option (a)). An existing case that fails means the design is wrong: stop and report.
- Each fix is probed by removing it, one at a time, as the step's criteria list. Read which cases
  fail, and revert each probe.

### 4. Verify

```sh
npx nx run-many -t lint test build --skip-nx-cache --output-style=static
```

All must be clean, with the same exception § 1 allows and on the same terms. The test rows move
exactly as the plan's § 4 table says. `eval-core` moves +10 at step 1, +21 at step 2, +6 at step 3 and
+21 at step 4. Step 7's count is set at its gate. `eval-signals` and `eval-forms` are unchanged in
every step. A row that moves anywhere else is
a regression or a scope breach, not a count to correct. `performance.spec.ts` stays green and
untouched; it is the gate. Step 4 also runs the plan's timing harness on its own bundle against step
3's, and its line, fixed at that step's confirmation gate, is a stop: a red ends the step
(plan § 4, step 4, criterion 4).

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
to another project that keeps that project's own suite green moves no row at all.

```sh
git diff --name-status HEAD
```

Every path must be on the step's own file list in the plan's § 4, or be the plan document itself.
Anything else is a **stop-and-replan**, not a judgement call — and so is anything the list at the
top names. Report it and stop.

Then the step's **probes**, the fixes its criteria name, each removed alone and reverted. The
report gives each probe's failure count and names the cases that failed.

If a pre-existing spec now fails, that is a regression in this step, not a stale test.
Report it; do not edit the spec to match the new behaviour.

### 5. Report

Before writing your report, for steps 1–4, 6, 7 and 9, invoke the `code-reviewer` subagent on this step's changes. Include its findings in your report. If it raises anything Critical, stop and surface it rather than closing out the step. Steps 5 and 8 change no file under `modules/` except, possibly, `public-api.spec.ts`'s allowlist. Their reports give those steps' checks instead, and say whether the reviewer was run and why.

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
