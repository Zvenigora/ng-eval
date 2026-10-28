# Standing rules

The process and verification rules that hold for all three libraries, in one place. `CLAUDE.md`
imports this file, so every session loads it; the `code-reviewer`, which does not see the import, reads it first.

- **Cite a rule as a link**, `[SR16](docs/standing-rules.md#sr16)` from the root, rather than
  restating it: restated copies drifted, which is why this file exists ([F27](backlog-retired.md#f27)).
- **IDs are never renumbered or reused.** A retired rule keeps its entry, with its reason.
- **A plan's § 0 lists only the rules it adds**; its retrospect commit promotes those that stand. Older
  plans number their own rules, and [the table at the end](#old-numberings) maps them. Each rule gives
  its statement, its *Origin*, where it was earned and the detail stays, and *Red*, what fails.

## Plans and steps

- <a id="sr1"></a>**SR1 — A plan only for a multi-commit item.** A plan document is for one item that
  needs more than one commit, under `docs/<item>/`. A one-commit item, or a batch of independent ones
  however many commits it runs to, gets none: its exit criteria live in the prompt, and its register
  entry records what verified it. *Origin*: none recorded. *Red*: nothing — held by review.
- <a id="sr2"></a>**SR2 — One step, done by its criteria, or stopped.** Execute one numbered step per
  session and do not begin the next, however small. A step is done when its stated exit criteria are
  met, not when the code looks finished. If it turns out to be wrong, stop and say so rather than
  improvise a replacement design. *Origin*: none recorded. *Red*: nothing — held by review.
- <a id="sr3"></a>**SR3 — The file list is the scope.** A file outside the step's list, a project it
  does not name, an unlisted rename or delete, or a `package.json` outside a release step is a
  stop-and-replan, unless widened at the confirmation gate with its reason. Something wrong nearby is
  reported, not fixed. *Origin*: [Phase 10 § 6](documentation/phase-10-plan.md#6-verification-gates).
  *Red*: nothing — `git diff --name-status HEAD`, read by hand.
- <a id="sr4"></a>**SR4 — A plan correction lands in the step that finds it**: in that step's commit,
  with the reason in its body and the report, never in a commit of its own or drafted ahead; scope,
  file list, chores, cross-references and stale prose are editable in place. The step
  cannot amend the exit criteria fixed at its gate, but one naming something that does not exist is
  corrected, recorded, and does not halt the step; one that can be met is never weakened.
  *Origin*: none recorded. *Red*: nothing — held by review.
- <a id="sr5"></a>**SR5 — Deferred work goes in the register.** Anything noticed and not done goes in
  `docs/backlog.md` by stable ID, never carried forward in a commit body or a plan, and a step that fixes an entry
  updates it in the same commit. A retired entry moves to `docs/backlog-retired.md`; its index row
  stays, with any anchor a published README links. *Origin*: [the register](backlog.md#why-this-file-exists).
  *Red*: doc-links, on a link a retirement left dangling or a published anchor lost.
- <a id="sr6"></a>**SR6 — Design records stay as written.** A completed plan or summary is not updated
  to match the code, and its line citations refer to the commit that wrote it; the one edit allowed
  turns a link that would dangle into a permalink at the target's last commit. A live document cites a
  heading or a symbol, not a line, and names the document with a section number, as two plans have a
  § 9. *Origin*: [Phase 10 § 3.8](documentation/phase-10-plan.md#38-links-and-mentions-what-is-re-pointed-and-what-stays-as-written).
  *Red*: doc-links, on the dangling link.
- <a id="sr7"></a>**SR7 — One retrospect per track**, no per-step summaries in new work. *Origin*: none. *Red*: nothing.

## The gate and what ships

- <a id="sr8"></a>**SR8 — The gate** is `npx nx run-many -t lint test build --skip-nx-cache
  --output-style=static`, run once after every step and before every commit. Its root `test` target
  runs doc-links and release-tags; `npm run lint`, `npm test` and `npm run build` run the same targets
  cached, and the `step` skill's `lint test` run is its baseline, not the gate. Never filter it with
  `-p`, which drops a missing project silently, and never run it in parallel with another nx or Jest
  run: parallel runs hung the maintainer's machine, RAM and disk exhausted. *Origin*:
  [Phase 10 § 6](documentation/phase-10-plan.md#6-verification-gates). *Red*: it is the gate; a `-p`
  or a parallel run — nothing, held by review.
- <a id="sr9"></a>**SR9 — A green `test` is not a type-check.** Jest compiles each spec file through
  `tsconfig.spec.json` and is more permissive than the build. The gate's `build` runs each project's
  default `production` configuration, through `tsconfig.lib.prod.json`, which extends
  `tsconfig.lib.json` and changes no type-checking option. *Origin*:
  [Phase 3 step 3](signals/step-3-summary.md#52-noticed-not-fixed), `TS7053`. *Red*: `build`.
- <a id="sr10"></a>**SR10 — Test rows move as the plan says**, from the counts it records; any other
  movement is a regression or a scope breach, not a count to correct, and a pre-existing spec that now
  fails is a regression, not a stale test. *Origin*:
  [Phase 10 § 6](documentation/phase-10-plan.md#6-verification-gates). *Red*: nothing — read by hand.
- <a id="sr11"></a>**SR11 — Every change states where it ships**: in no package (documents outside
  `modules/`, specs, tooling); in a package's next release, with an `[Unreleased]` line in its own
  `modules/<name>/CHANGELOG.md` in the same commit; or as the release, by
  [CONTRIBUTING's Releasing](../CONTRIBUTING.md#releasing), whose headings carry npm's publish date in
  UTC. *Origin*: none recorded. *Red*: nothing — held by review.
- <a id="sr12"></a>**SR12 — A changed shape is a breaking release.** All three packages are published,
  so changing an exported symbol's shape needs an explicit callout, a version bump and an entry in that
  package's own CHANGELOG. Prefer additive changes. *Origin*: none recorded. *Red*: nothing in the gate:
  `export-list.spec.ts` and `public-api.spec.ts` catch an undocumented export, not a changed shape.

## Tests and probes

- <a id="sr13"></a>**SR13 — Test-first for behaviour; equivalence for a refactor.** New behaviour is
  written test-first. A pure refactor is gated by the existing suite, gains specs once green, and has
  its equivalence argued path by path. *Origin*: none recorded. *Red*: nothing — held by review.
- <a id="sr14"></a>**SR14 — Never weaken an assertion to pass.** Never weaken or delete one to make a
  change pass; if it encodes wrong behaviour, flag it and ask. A case a decision makes vacuous is
  removed, not kept green, with its reason and count, approved at the step's confirmation gate or in a
  one-commit item's prompt. *Origin*:
  [Phase 10 § 6.1](documentation/phase-10-plan.md#61-the-spec-discipline-for-documentation). *Red*:
  nothing — held by review.
- <a id="sr15"></a>**SR15 — Every check gets a probe.** A check that would pass without the code it
  tests is worse than none. Every new check, and every existing assertion a change relies on as its
  witness, gets a probe that breaks what it claims to catch and is seen to fail; [SR16](#sr16) says how.
  *Origin*: [Phase 1 step 3](side-effects/step-3-summary.md#2-the-critical-found-mid-step-positional-popping).
  *Red*: nothing — held by review.
- <a id="sr16"></a>**SR16 — Probes are applied alone and read case by case.** Apply each alone, against
  every case, and revert it; read which cases went red, and predict them from what the probe changes,
  not from which step owns the rows. A probe that removes a whole call cannot show which test inside it
  carries the load, so probe each test. *Origin*:
  [A45 § 10.2](a45/plan.md#102-each-corrected-prediction-and-why-it-was-wrong). *Red*: nothing.
- <a id="sr17"></a>**SR17 — Check the setup separately.** Before writing an assertion, describe the
  setup in which the invariant is false and confirm the fixture can reach it. The usual vacuous shapes:
  a hook never registered, a guard whose absence changes nothing for one callback,
  `expect(x).not.toThrow()` for a behavioural claim, and one fixture shared by both arms of a comparison. *Origin*: [Phase 3 step 4](signals/step-4-summary.md#probes). *Red*: nothing.
- <a id="sr18"></a>**SR18 — A refusal case asserts its message.** A refusal's message names its layer,
  and a case expecting a refusal asserts that message, never a bare `toThrow()`, since the cheapest
  green is a setup that fails first. A message two layers share is a gap unless some row's side effect
  separates them. *Origin*: [the A35 plan's second § 1.2](a35/plan.md#12-standing-rules-from-revision-16).
  *Red*: nothing — held by review.
- <a id="sr19"></a>**SR19 — Every option and store shape gets a leg.** Every option the code path
  reads, `caseInsensitive` included, and every store shape it accepts gets a leg, not only the default.
  Re-check the fixture under each leg, and assert the caller's own object beside the store: under
  `caseInsensitive`, `fromContext` copies a plain context into a `Registry`. *Origin*:
  [the A35 plan's second § 1.2](a35/plan.md#12-standing-rules-from-revision-16). *Red*: nothing.

## Claims and measurements

- <a id="sr20"></a>**SR20 — A criterion names its wrong implementation.** A criterion naming a
  property states the implementation that would satisfy it while being wrong, including one written to
  correct another. *Origin*:
  [Phase 2 § 0.1](statements/phase-2-plan.md#01-a-rule-this-document-applies-to-specs-and-did-not-apply-to-itself).
  *Red*: nothing — held by review.
- <a id="sr21"></a>**SR21 — Every claim names what goes red.** Every risk, exit criterion and published
  claim names the assertion, or the grep with its count, that fails when it is violated, not a section;
  a public-API entry names its barrel line, the gate reading its `.d.ts`, and an import that compiles.
  A check no case witnesses gets a row or goes, and a changed sentence in a README, `SECURITY.md` or a
  CHANGELOG gets a claim → witness table. *Origin*:
  [Phase 6 § 0.2.1](forms/phase-6-plan.md#021-the-third-failure-mode--an-answer-attached-to-nothing-that-can-fail).
  *Red*: nothing — held by review.
- <a id="sr22"></a>**SR22 — A mechanism question is measured**, by the smallest thing that answers it,
  on the artifact the claim is about: the production bundle for values and timings, the gate for
  counts, never a neighbouring tool. Code the plan does not own is the clearest case, not the limit,
  and a value written by hand for a spec is a prediction until it runs. *Origin*:
  [Phase 6 § 0.2](forms/phase-6-plan.md#02-mechanism-questions-are-settled-by-measurement-not-by-review);
  the hand-written value, [A45 § 10.2](a45/plan.md#102-each-corrected-prediction-and-why-it-was-wrong). *Red*: nothing.
- <a id="sr23"></a>**SR23 — A measurement supports only what its arms distinguish.** Before citing one,
  name the arm or row that would have shown the claim's negation; with none, it has not been made.
  *Origin*: [A45 § 10.1](a45/plan.md#101-twice-the-measured-rows-did-not-exercise-the-change). *Red*: nothing.
- <a id="sr24"></a>**SR24 — A release claim is measured on its own rows.** Before stating what a past
  release did, or that a downstream surface is unchanged, list the defects the release fixes and run
  one row of each through that surface. *Origin*:
  [A45 § 10.1](a45/plan.md#101-twice-the-measured-rows-did-not-exercise-the-change). *Red*: nothing.
- <a id="sr25"></a>**SR25 — The kill-list sweep.** When a claim dies, quote it verbatim, grep the whole
  repository for its most distinctive three to five words, and decide every hit: rewritten, deleted,
  or kept and marked as history. Record the sweep with its greps: the gate sees links, not plain-text
  mentions. *Origin*:
  [Phase 6 § 0.2.2](forms/phase-6-plan.md#022-the-kill-list-check--did-the-old-claim-actually-die).
  *Red*: doc-links, for a link only.
- <a id="sr26"></a>**SR26 — Probe decay.** A step that makes a wrong implementation reachable — a stub
  gains a body, a parameter is read, a helper gains a caller — re-runs the probes of every earlier step
  whose subject that code is, and owes the coverage. *Origin*:
  [Phase 6 § 0.2.3](forms/phase-6-plan.md#023-probe-decay--a-gate-can-stop-discriminating-without-being-edited).
  *Red*: nothing — held by review.
- <a id="sr27"></a>**SR27 — Characterise before a change nothing pins.** Run a behavioural change's
  prototype against the suites first. If nothing goes red, a characterisation spec of today's behaviour
  comes first, its marks are the criterion, and the prototype is their probe. *Origin*:
  [A45 § 10.1](a45/plan.md#101-twice-the-measured-rows-did-not-exercise-the-change). *Red*: nothing.
- <a id="sr28"></a>**SR28 — A timing is paired, signed and sized by time.** It pairs within each
  rotation of one run, counts the signs, carries an A/A control and meets a decision rule stated in
  advance. Its processes run one at a time, and a long run is sized by elapsed time, not by rounds
  ([A53](backlog.md#a53)). *Origin*:
  [A45 § 3.8](a45/plan.md#38-performance--the-decision-rule-stated-in-advance). *Red*: nothing.
- <a id="sr29"></a>**SR29 — Reuse a mechanism, and list what it does not do.** Prefer one the
  repository already exercises, and say what makes a case different where it deviates. Reusing one,
  list what it does not do; removing one, what it did incidentally. *Origin*:
  [Phase 6 § 0.1](forms/phase-6-plan.md#01-the-mechanism-reuse-constraint--borrow-it-or-say-what-makes-this-different).
  *Red*: nothing — held by review.
- <a id="sr30"></a>**SR30 — Documentation specs.** A documented example is strong enough that the wrong
  implementation of its claim fails its case, and a count a document states is pinned by a case or
  loses its figure. A README case mirrors its block by hand, so its probe is a wrong library; a case
  that reads a document is probed by breaking the document. *Origin*:
  [Phase 10 § 6.1](documentation/phase-10-plan.md#61-the-spec-discipline-for-documentation). *Red*:
  the `readme-examples.spec.ts` counts and `public-api.spec.ts`' document cases, for what they read.
- <a id="sr31"></a>**SR31 — False now, or latent.** A claim false now is fixed in the open commit, even
  where that widens it at its gate; a gap only latent gets a register entry, with its measurements and
  a schedule. *Origin*:
  [Phase 10 § 6.1](documentation/phase-10-plan.md#61-the-spec-discipline-for-documentation). *Red*:
  nothing — held by review.

## Hygiene

- <a id="sr32"></a>**SR32 — Probes are pinned and reverted cleanly.** A prototype a later step re-runs
  is pinned as patch files outside the repository, SHA-256 checked before each apply, never rebuilt
  from a description. Revert a patch with `git apply -R` and a probe edit by hand, since `git restore`
  on a directory restores its tracked specs too; never probe by mutating shared AST state, such as
  `markThisPositional`'s marks (A45 step 3). *Origin*: [A45 § 10.3](a45/plan.md#103-process-traps). *Red*: nothing.
- <a id="sr33"></a>**SR33 — Review before commit.** The `code-reviewer` runs before every commit — a
  plan step, a one-commit item, or an item of a batch — that changes a file under `modules/` or
  `tools/`; anything else runs it where the plan or the prompt says. A Critical finding stops the
  commit, and findings on the open commit's own change are folded in, amended while it is unpushed.
  *Origin*: none recorded. *Red*: nothing — held by review.
- <a id="sr34"></a>**SR34 — Commit when asked, after a green gate.** Commit or push only when asked;
  commit only after a green [gate](#sr8), one plan step to a commit, in the format of
  [CONTRIBUTING's Commit Messages](../CONTRIBUTING.md#commit-messages). *Origin*: none recorded.
  *Red*: nothing — held by review.
- <a id="sr35"></a>**SR35 — Every push is verified**: afterwards, `git ls-remote origin
  refs/heads/master` prints the hash just pushed. *Origin*: none recorded. *Red*: nothing.
- <a id="sr36"></a>**SR36 — Files change through Edit and Write**, never `sed -i`, `>` redirection,
  `Set-Content` or any other shell command, which bypass formatting and lint automation.
  *Origin*: none recorded. *Red*: nothing.
- <a id="sr37"></a>**SR37 — Dependencies move without `--force`.** Never run `npm audit fix --force` or
  `npm install --force`. The Angular set and `nx` move by [F16](backlog.md#f16)'s method: delete the
  moving packages' lockfile entries, reinstall at exact versions, prove it by a clean `npm ci` with the
  lockfile unchanged, and rename `allowScripts`' `nx@<version>` key with `nx`. *Origin*: F16.
  *Red*: nothing — the `npm ci` proof is run by hand.
- <a id="sr38"></a>**SR38 — No personal email** address in any file of the repository. *Origin*:
  [F20](backlog-retired.md#f20). *Red*: nothing — held by review.

## Old numberings

Design records keep their own numbering ([SR6](#sr6)); this resolves it.

| Old rule | SR |
| :--- | :--- |
| [A45 plan § 0](a45/plan.md#0-failure-modes-carried-forward) rules 1–7 | SR20, SR22, SR23, SR25, SR21, SR18, SR19 |
| A45 plan § 0 rules 8–13 | SR16; SR15 and SR30; SR27; SR28; SR29; SR24 |
| [Phase 2 § 0.1](statements/phase-2-plan.md#01-a-rule-this-document-applies-to-specs-and-did-not-apply-to-itself) | SR20 |
| Phase 6 § 0.1, the mechanism-reuse constraint | SR29 |
| Phase 6 § 0.2: measurement; arms; "grep for the claim" | SR22; SR23; SR25 |
| Phase 6 § 0.2.1, § 0.2.2, § 0.2.3 | SR21, SR25, SR26 |
| The A35 plan's second § 1.2: the refusal message; the option leg | SR18; SR19 |
| Phase 10 § 6.1: the strong example; every new check's probe; false now or latent | SR30; SR15; SR31 |
| Phase 10 § 6.1: the README mirror; the document probe; vacuous removal; the F13 count | SR30; SR30; SR14; SR30 |
</content>
