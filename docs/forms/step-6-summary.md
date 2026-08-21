# Phase 4 — Step 6 Summary: Docs, worked example, and release

**Date**: August 20, 2026
**Plan**: [`phase-4-plan.md`](./phase-4-plan.md) § 4, Step 6
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1 → **0.1.0**)
**Commits**: `a0dddb0` (the step), `d77c3a7` (two findings carried out of the closing plan)
**Status**: complete — Phase 4 closed. `eval-forms` lint clean, 6 suites / 109 tests,
`build:production` clean with both entry points; `eval-core` unchanged at 41 suites /
717 tests, `eval-signals` unchanged at 5 suites / 97 tests

---

## 1. What was built

The library got its documentation and its version. Nothing in `eval-core`, `eval-signals`,
or `eval-forms`' own `src/` changed — this step added one spec and wrote prose.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `modules/eval-forms/README.md` | edit | The real README, replacing the step-1 stub. All six clauses the plan enumerates, plus coercion, error policy, validation, reactivity and lifetime |
| `docs/forms/worked-example.md` | new | A flat-`FormGroup` checkout form, §§ 1–8, run as one continuous program |
| `reactive/src/lib/readme-examples.spec.ts` | new | 13 cases executing the runnable blocks of both documents |
| `modules/eval-forms/package.json` | edit | 0.0.1 → 0.1.0 |
| `CHANGELOG.md` | edit | The `eval-forms 0.1.0` entry, with the return-shape change as its own ⚠️ bullet |
| `ROADMAP.md` | edit | Phase 4 done + three narrowings; Phase 6 for `/signals`; suggested order; the transcribed-snippets amendment; the throwing-subscriber follow-up |
| `phase-4-plan.md` | edit | Step 6's file list, the amended exit criterion, the gate's soundness condition, § 8.4's phase number |

### The deliberate break, and what it cost

The plan's exit criterion inherited `ROADMAP.md`'s "executing the documented examples *by
hand*, which is a review practice rather than a gate, and it stays that way." Step 6 broke
it, on instruction, and the break is the most consequential thing in the step.

`ROADMAP.md` had **considered and rejected** exactly this for `eval-core`, with a good
argument: a transcription is a copy, not a reader; it gates "the API behaves as documented",
which the suite already does; and *"anyone turning those fragments into a runnable test
declares the missing bindings without noticing."* The counter-argument is not that the
rejection is wrong — it is right about all three — but that the practice it defends has a
record: two non-running snippets shipped in Phase 1, three more found in Phase 3, each
caught only by a later session that happened to be reviewing documentation. Nothing makes
that session happen.

The gate found **two real defects in this step's own documents**, and the second is the one
worth keeping:

1. The `{ emitEvent: false }` block printed a stale `'CA'` after a suppressed write. A
   `computed()` that has never been read has nothing cached, so a first read *after* the
   write returns `'US'`. The block was false as printed; the fix was to show the prior read,
   and to say why it is load-bearing.
2. The worked example's § 6 printed `false` for `state.visible` — a rule its own § 4 had
   already driven to `true`. **The gate did not catch this one**, because the first draft
   split the document into a case apiece behind a resetting `beforeEach`, where `false` is
   the correct value. Found in review.

---

## 2. Design questions settled during the step

- **A per-block harness is not a weaker gate; it is the rejected thing.** This is the step's
  main finding and it is now a condition in the plan rather than a war story. A document
  whose sections run in sequence is one program, and its printed values are claims about
  inherited state. Splitting it into a case per block executes a *different* program — one
  where every block starts pristine — and reports green for a document that is wrong as
  written. "Declares the missing bindings without noticing" and "resets the state without
  noticing" are the same sentence, reached through the fixture instead of the preamble. The
  rule: one case per continuous program, split only where the document declares a fresh
  start.
- **"Self-contained" was the wrong claim and it was mine.** The justification for breaking
  the exit criterion was that the *documents* were completed rather than the spec padded.
  Review showed that was true of the README's reactivity blocks and false of the worked
  example's §§ 4–8, which refer to `form`, `binding` and `injector` bare. The fix was not to
  finish making it true — an `injector` genuinely has to come from somewhere — but to
  replace a blanket claim with an enumeration: the docstring, the plan and `ROADMAP.md` now
  each list exactly what the spec supplies that the documents do not print. A blanket claim
  is how an unlisted substitution hides.
- **Which blocks the gate can honestly cover.** The `html`, `json` and `interface` blocks
  execute nothing, and padding them into something that did would assert against code the
  README does not contain. Both documents and the CHANGELOG now say "the runnable examples"
  rather than "the snippets" — the overstatement was caught in review, and it is the same
  class of error as the gate's own subject.
- **Where the recompute claim can be measured.** The README's "recomputes when `country`
  changes and not when any other control does" had no gate through `bindFieldProperties`:
  an outer `computed()` cannot see an inner recompute that produces the same value, so the
  obvious counter cannot discriminate. It is measurable after all, by putting the counter
  where it sits *inside* the recompute — `onError` fires once per throwing evaluation, so a
  rule that reads its key and then throws (`'country + missing.fn()'`) turns "did this
  recompute" into a number. Probed: a rule reading the second key gives 3 against the
  expected 2 and the case reddens.
- **The version bump's file, and the worked example's location.** Both were implied rather
  than named by the plan, and both are now in its step-6 list. `ROADMAP.md`'s Phase 4 exit
  criteria lists "a worked example" separately from "README", which is what settled it as a
  document rather than a fenced block.
- **Phase numbering.** `/signals` is Phase 6, which § 9.1 had already assumed — "Phase 6
  decides whether it lives in the core or in the adapter". § 8.4's informal "the most likely
  Phase 6 feature", written before the number had a claimant, was corrected in the same
  edit rather than left pointing at a different phase than it meant.

---

## 3. Deviations from the plan's literal sketch

- **The exit criterion itself was amended**, which is the step's largest deviation and was
  approved before any file was written. "By hand" is replaced by the committed spec for the
  covered blocks and retained for the rest — the uncovered blocks are still read, because
  nothing automates that.
- **Two files were added that the plan's list did not name**: `worked-example.md` (named
  only as "a worked example") and `readme-examples.spec.ts`. Both are now in the list.
- **`modules/eval-forms/package.json` was edited** though the plan said only "version to
  0.1.0" without naming a file.
- **`ROADMAP.md` took two edits beyond the three the plan asked for**: the amendment to its
  own "considered and rejected: executing transcribed snippets" section, which would
  otherwise have contradicted the repo, and the throwing-subscriber follow-up. The second is
  a finding, not a plan item — see § 5.1.
- **No other deviation.** No library source was touched, no exported symbol changed, and
  every step 1–5 assertion is untouched.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-forms:lint` | clean |
| `eval-forms:test` | 6 suites / 109 tests (was 5 / 96) |
| `eval-forms:build:production` | clean; both entry points, `dist` manifest at 0.1.0, `reactive/package.json` present |
| Root `npm run build` | clean, 3 projects |
| `eval-signals:lint` / `:test` | clean / 5 suites / 97 tests, unchanged |
| `eval-core:lint` / `:test` | clean / 41 suites / 717 tests, unchanged |

### Probes

Named, not counted. Each was run against the working tree and reverted.

| Inversion | Cases that went red |
| :--- | :--- |
| `toText` maps every falsy value to `''` | **one** — `README - Coercion › should answer the toText lines`, on `0` and `false` |
| `bindFieldProperties`' `onError` default flipped to `'throw'` | **one** — `worked example › S 7 - the default swallows a rule that throws` |
| The recompute-counter rule reads the second key (`'country + orderTotal + missing.fn()'`) | **one** — the per-key case, expected 2 received 3. This is the probe that proves the counter measures recomputes rather than nothing |
| A throwing next-handler in `rxjs@7.8.2` (a standalone script, not a spec) | n/a — the measurement that disproved the README sentence: `closed: false`, observers 1, both emissions delivered, error re-reported asynchronously |

### Review

`code-reviewer` reported **two Critical, four Warning and five Note**. Every one was real,
every one was verified before being acted on, and all eleven are addressed.

The two Criticals were the § 6 continuity defect above and a README paragraph asserting that
a throw in the `group.events` subscriber unsubscribes it — which I re-measured
independently rather than accepting, because it contradicts a premise the shipped code
comments rest on. The measurement confirmed the reviewer: the claim is false on both axes.
The README now states the limitation without the mechanism.

Two of the Warnings and three of the Notes were vacuous or under-specified assertions in the
new spec — `toBeDefined()` on a record written unconditionally, a bare `toThrow()` where the
README names `SignalContextWriteError`, and an empty-control case that any non-resolving
mirror would also have passed. All tightened. Worth recording against the file's own
purpose: a gate over documentation is not exempt from the rule it exists to enforce, and
three of its first-draft cases would have reported coverage they did not have.

One Warning was answered rather than adopted as written: the suggested recompute count
"through `bindFieldProperties`" is not implementable in the obvious way, and the version
that works measures the recompute from inside via `onError`. The suggestion was right about
the gap and wrong about the mechanism, which is the distinction worth keeping.

---

## 5. Open items carried forward

### 5.1 Written into `ROADMAP.md` after the step

- **The throwing-subscriber premise** is a named follow-up, not a plan note, because the
  plan closes with the phase and nothing reads a closed plan. Four sites state it:
  `control-source.ts:165`, `field-schema.ts:199`, `control-source.spec.ts:409` — whose own
  comment then records a measurement inconsistent with it — and `phase-4-plan.md:1438`,
  which attributes it to a § 3.5.5 that does not contain it. It is not a comment fix: the
  premise justifies enforcement being construction-time only, so correcting it means
  deciding that question again on the real behaviour and recording which ground it then
  rests on. No spec pins what actually happens when the diff throws; the entry asks for one.
- **The transcribed-snippets rejection** now records what changed and what did not. It is
  reopened for `eval-forms` only, it does not supersede the documented-symbol drift gate,
  and the drift gate is still worth building and still unbuilt.

### 5.2 Noticed, not fixed

- **The gate covers `eval-forms` only.** `eval-core`'s and `eval-signals`' READMEs — the two
  with the five-defect history that motivated it — are still on the by-hand practice. Doing
  them is a change to those packages and outside this phase.
- **Nothing keeps the spec and the documents in step but a human.** A block edited without
  its case being updated goes unnoticed in both directions. That is the drift gate's job
  and the drift gate does not exist.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing; carried unchanged from [`step-1-summary.md`](./step-1-summary.md) § 5.2
  through every step of this phase.

### 5.3 Still carried from earlier phases

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive`; `EvalService.simpleEval` never draining `_activeStates`; the arrow-scope
leak's escaped-closure path, and its uncontained form on the unshipped `/signals` path
(§ 9.1), which is now Phase 6's stated precondition rather than a plan aside. All are
`eval-core` / `eval-signals` and § 2 forbade fixing them from here.

---

## 6. Phase 4, closed

Six steps, one commit each, plus a retrospect apiece and this step's follow-up — one
published surface. What shipped is narrower than
`ROADMAP.md:169` promised in three named ways — `disabled` deferred, field values only, flat
forms — and each narrowing is recorded with its reason and is additive when it arrives.
Nothing was added to `eval-core` or `eval-signals` in any step, which the unchanged 717 and
97 test counts have asserted at every gate since step 1.
