---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Bash(git grep *) Bash(git ls-files *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/a45/plan.md`
Target: `@zvenigora/ng-eval-core` — A45 part 2 and A44, assignment targets as JavaScript evaluates them
Requested step: $ARGUMENTS

**Read the plan's § 0 first.** It collects the failure modes carried forward from the earlier plans,
and every step's criteria cite them by number.

**Each step's file list in the plan's § 4 is its scope, and it is not the same list every step.** The
plan changes `eval-core` only. `eval-signals` and `eval-forms` are witnesses until the release:

- **Step 1 is one new spec**, `internal/visitors/assignment-target.spec.ts`, and no other file under
  `modules/`. Its probes apply the plan's M4 prototype in two stages and revert it.
- **Steps 2 and 3 are `eval-core`'s visitors**: the files each step lists under
  `modules/eval-core/src/lib/internal/visitors/`, the spec's marked rows, `update-expression.spec.ts`
  in step 3, and `modules/eval-core/CHANGELOG.md`'s `[Unreleased]`.
- **Step 4 is timing**: no file but the plan. Its harness runs one process at a time, never beside
  another nx or Jest run.
- **Step 5 is documents**: `SECURITY.md`, `modules/eval-core/README.md` with its CHANGELOG line, the
  register, and link targets.
- **Steps 6 and 7 are the release** and the post-publish record.

A file outside the step's list, or under `eval-signals` or `eval-forms` before step 6, is a
stop-and-replan, not a wider step. A deliberate widening at a step's confirmation gate, recorded with
its reason, is not a replan. A `package.json` in the diff before step 6 is a stop-and-replan.

**The counts the steps start from**, the gate at db287da: `eval-core` 2880, `eval-signals` 443,
`eval-forms` 380. `eval-core` reaches 3064 at step 1 and 3100 at step 3 (the plan's Revision 3); the
other two do not move. Step 1's spec holds 18 cases: they match their recorded values, not the native
run.

**Step state**: no step has run. Step 1 is next.

**All three packages are published**, and a README or CHANGELOG under `modules/<name>/` ships in that
package's tarball, as its code does. So a change is in one of three categories:

- **Ships in no package**: documents outside `modules/`, and specs. Its CHANGELOG line, if any, is
  the root `CHANGELOG.md`'s Workspace section.
- **Ships in a package's next release**: a shipped file changed, with an `[Unreleased]` line in that
  package's own `modules/<name>/CHANGELOG.md` in the same commit. A change to an exported symbol's
  shape is a breaking release (`CLAUDE.md`, "Public API discipline").
- **The release**: the versions bumped, and each `[Unreleased]` moved under its new version.

**Every step says which of those three it is, in its § 2 restatement.**

The lint and test targets below cover project boundaries: a step that edits another project moves
its row. They do **not** cover a stale sentence or a mention the doc-links gate cannot see — a
plain-text path, a line citation in a comment. Reading the diff, and running the step's one-off
checks, is what covers that.

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
- Follow the testing rules in CLAUDE.md. A README case mirrors its block by hand, so its probe
  is a wrong *library* implementation, reverted after the run (the Phase 10 plan's § 6.1).
- Never weaken or delete an existing assertion to make something pass. A removal the plan lists,
  with its reason and its measured count, is approved by confirming that step. Nothing else is
  removed.
- A case that reads a document is probed by breaking the document (the Phase 10 plan's § 6.1).
  Each probe is reverted.
- The A35 plan's two probe rules (`docs/a35/plan.md`, "§ 1.2 Standing rules, from Revision 16" —
  the plan numbers two § 1.2s) hold for any case a step adds: a
  refusal it asserts is matched by the message that names its layer, and every option the case's
  code path reads, `caseInsensitive` included, gets a leg, not only the default.

### 4. Verify

```sh
npx nx run-many -t lint test build --skip-nx-cache --output-style=static
```

All must be clean, with the same exception § 1 allows and on the same terms. The test rows move
exactly as the plan says for the step, from the counts it records; every other row is unchanged. A
row that moves anywhere else is a regression or a scope breach, not a count to correct. The root
project's `test` target is the doc-links and release-tags gate: the report gives doc-links' file and
link counts, and release-tags' row and tag counts.

`build` is in this list because a green `test` run is not a type-check: Jest compiles per
file through `tsconfig.spec` and `build:production` through `tsconfig.lib.prod`, and three
published packages is three chances for the difference to matter. It also stays the only
gate on an empty or type-only barrel, which ng-packagr rejects and nothing else notices.
All three projects default to the production configuration, so this covers what
`nx run eval-forms:build:production` used to cover on its own. `build` is **not** in § 1's
baseline, so confirm a build failure in a project the step did not touch is pre-existing
before reporting it as a regression.

Then the check a green build cannot make: the scope gate.

**Nothing moved outside the step's file list.** A green suite is weak evidence for this: an edit
to a document or a comment moves no test row at all.

```sh
git diff --name-status HEAD
```

Every path must be on the step's own file list in the plan's § 4, or be the plan document itself.
Anything else is a **stop-and-replan**, not a judgement call — and so is a rename (`R`) or a delete
(`D`) the plan does not list, or a `package.json` outside a release step. Report it and stop.

Then the step's **one-off checks**, the commands its criteria name. They are not in the gate, so
the report gives each command and its output.

If a pre-existing spec now fails, that is a regression in this step, not a stale test.
Report it; do not edit the spec to match the new behaviour.

### 5. Report

Before writing your report, invoke the `code-reviewer` subagent on this step's changes. Include its findings in your report. If it raises anything Critical, stop and surface it rather than closing out the step. A step that changes no file under `modules/` may skip it only where the plan says so; its report then gives the step's one-off checks instead, and says that the reviewer was not run and why.

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
