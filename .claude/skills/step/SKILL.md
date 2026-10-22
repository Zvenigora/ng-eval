---
name: step
description: Execute exactly one numbered step of the active plan document, with a confirmation gate and verification against the step's exit criteria.
argument-hint: [step-number]
disable-model-invocation: true
allowed-tools: Bash(npx nx *) Bash(git status *) Bash(git diff *) Bash(git branch *) Bash(git grep *) Bash(git ls-files *) Read Grep Glob Edit Write
---

# Execute one plan step

Plan document: `docs/documentation/phase-10-plan.md`
Target: the repository's documents — no library code
Requested step: $ARGUMENTS

**Phase 10 resumed at its step 3, and steps 1–7 are done.** The phase was paused after step 2 while
the A35 plan (`docs/a35/plan.md`, complete) ran to its end, so that `eval-core` 0.13.0 shipped first.
The plan was written before that pause, so the restatement checks its counts and line citations
against the tree and reports each one that has moved.

**Each step's file list in the plan's § 4 is its scope, and it is not the same list every step.**
Phase 10 restructures the documentation. It reaches the three projects only through READMEs,
CHANGELOGs, specs and comment lines, at named steps and nowhere else:

- **Step 1 is documents only** — the ten stale files of D3 deleted, the three links into them
  re-pointed, the `qs` reason moved to F16. No file under `modules/`. *Done.*
- **Step 2 is `SECURITY.md`** — rewritten to what the code does (D7), and three cases in
  `modules/eval-core/src/public-api.spec.ts` that resolve every identifier it names. *Done.*
- **Step 3 is `eval-core`** — its README absorbs the root README's API sections; seven
  `readme-examples.spec.ts` cases; `export-list.spec.ts` comments; its CHANGELOG's `[Unreleased]`.
  *Done.*
- **Step 4 is all three packages' READMEs** — the `eval-signals` and `eval-forms` openings, their
  CHANGELOGs' `[Unreleased]`, one peer-range case in each project's `src/public-api.spec.ts`, and spec
  **comment** lines. *Done.*
- **Step 5 is the root README** — the landing page; `eval-core`'s `public-api.spec.ts` and
  `export-list.spec.ts` lose their root-README cases and gain the D5 case (plan § 4, step 5, which
  lists and flags those removals); comment lines in `eval-core` and `eval-signals` specs. It also
  fixes F22 (plan Revision 4): eight F10 allowlist entries out of `export-list.spec.ts`, and the
  F10 docblock's count pinned by a case or stripped of its figure, chosen at the step's gate. Its
  gate stripped the figure, added F22's reverse case, and added F23's `eval-core` README line with
  its `[Unreleased]` line (plan Revision 6). *Done.*
- **Step 6 is documents only** — `docs/README.md`, `CONTRIBUTING.md`, `ROADMAP.md`, `CLAUDE.md`, the
  register (F19). No file under `modules/`. Its gate widened it to two `eval-forms`
  `readme-examples.spec.ts` files, comment lines only, and answered the plan's § 8 q1 (plan
  Revision 7). *Done.*
- **Step 7 is the release commit** — `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1, as
  docs-only patches: the three `package.json` versions and the three CHANGELOGs. No README, no peer
  range and no `.d.ts` moves. *Done* (plan Revision 8).
- **Step 8 is the post-publish record**, after the maintainer publishes and tags: the register, the
  phase's retrospect, and the phase closed in `CLAUDE.md`, `ROADMAP.md`, `docs/README.md` and this
  skill.

A file under `modules/` outside steps 2–5, step 7 and step 8's CHANGELOG dates, or under a project a
step does not name, is a stop-and-replan (plan § 2), not a wider step. That is the default for
planned scope. A deliberate widening at a step's confirmation gate, recorded with its reason, is not
a replan; step 6's was one. Three more are stop-and-replans in every step:

- **A non-spec `.ts` file with a change outside its comment lines.** This phase changes no library
  code (plan § 5).
- **A rename (`R`) anywhere, or a delete (`D`) outside step 1's ten.** Nothing under `docs/` moves
  (plan § 3.2, D2).
- **A `package.json` in the diff**, outside step 7. No version moves in steps 1–6 (plan § 3.9), and
  step 7 moves the three `version` fields and nothing else in them. A spec may read one; none may
  edit one.

**All three packages are published**, and a README or CHANGELOG under `modules/<name>/` ships in that
package's tarball — so a change is in one of three categories:

- **Ships in no package** — steps 1, 2, 6 and 8, and step 5 apart from F23's line. Their CHANGELOG
  line, if any, is the root `CHANGELOG.md`'s Workspace section (plan § 3.9). `SECURITY.md` is in no
  tarball.
- **Ships in a package's next release, with no code change** — step 3 (`eval-core`), step 4
  (`eval-signals`, `eval-forms`) and step 5's F23 line (`eval-core`): a README rewrite, with an
  `[Unreleased]` line in that package's own `modules/<name>/CHANGELOG.md` in the same commit. No
  bump in those steps: they are released at step 7.
- **The release** — step 7: three docs-only patches, each `[Unreleased]` moved under its new
  version, with every `.d.ts` byte-identical to the published one.

A change to an exported symbol's shape or to a shipped path's behaviour is not in this phase at
all: finding one is a stop-and-replan.

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
- **Which category the step is in** — ships in no package, or ships in a package's next release —
  and, if the second, the `[Unreleased]` line the plan gives it (plan § 3.9).
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
  is a wrong *library* implementation, reverted after the run (plan § 6.1).
- Never weaken or delete an existing assertion to make something pass. Step 5's removals of the
  root-README cases are the one exception: the plan lists each, with its reason and its measured
  count, and confirming that step approves them. Nothing else is removed.
- A case that reads a document is probed by breaking the document (plan § 6.1): `SECURITY.md`'s
  identifiers, a quoted range, the root README's D5. Each probe is reverted.
- **A new document is marked intent-to-add, `git add -N <path>`, before the gate runs.**
  `tools/doc-links.mjs` reads `git ls-files`, so an untracked file is skipped silently: its links go
  unchecked and the file count does not move, with every gate green. An intent-to-add file is
  listed and checked, and nothing is staged. Until doc-links reports an untracked `.md` itself, this
  is the guard ([F25](../../../docs/backlog.md#f25), Part 3).
- The A35 plan's two probe rules (`docs/a35/plan.md`, "§ 1.2 Standing rules, from Revision 16" —
  the plan numbers two § 1.2s) hold for any case a step adds: a
  refusal it asserts is matched by the message that names its layer, and every option the case's
  code path reads, `caseInsensitive` included, gets a leg, not only the default.

### 4. Verify

```sh
npx nx run-many -t lint test build --skip-nx-cache --output-style=static
```

All must be clean, with the same exception § 1 allows and on the same terms. The test rows move
exactly as the plan's § 4 table says: `eval-core` +3 at step 2, +7 at step 3, +1 at step 4 and −5 at
step 5 (−3 with F22's reverse case, as its gate chose; plan Revision 6); `eval-signals` and `eval-forms` +1 each at step 4; every other row unchanged in every step. A
row that moves anywhere else is a regression or a scope breach, not a count to correct. The plan's
absolute totals were measured before the A35 plan; at its resumption (4f99112) the gate stood at
2596 / 438 / 375, and the deltas apply from there: 2603 after step 3 (plan Revision 4),
2604 / 439 / 376 after step 4 (plan Revision 5), and 2601 / 439 / 376 after step 5 (plan
Revision 6). The root project's `test` target is the doc-links
gate: its file and link counts move as the same table says, and the report gives both figures.

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
to a document or a comment moves no test row at all, and that is most of what this phase edits.

```sh
git diff --name-status HEAD
```

Every path must be on the step's own file list in the plan's § 4, or be the plan document itself.
Anything else is a **stop-and-replan**, not a judgement call — and so is any `R` line, a `D` line
outside step 1's ten, a `package.json`, or a non-spec `.ts` file changed outside its comment lines.
Report it and stop.

Then the step's **one-off checks**, the commands its criteria name — the mention grep, the heading
listing, step 3's peer-sentence comparison (a case from step 4 on), the index completeness check.
They are not in the gate, so the report gives each command and its output.

If a pre-existing spec now fails, that is a regression in this step, not a stale test.
Report it; do not edit the spec to match the new behaviour.

### 5. Report

Before writing your report, for steps 2–5, invoke the `code-reviewer` subagent on this step's changes. Include its findings in your report. If it raises anything Critical, stop and surface it rather than closing out the step. Step 1 changes no file under `modules/`, so none of its checklists applies; its report gives the step's one-off checks instead, and says that the reviewer was not run and why. Step 6's gate widened it into `eval-forms` comment lines, step 7 edits the package manifests and CHANGELOGs, and step 8 may correct a CHANGELOG heading's date, so the reviewer runs for all three.

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
