# Track 3 — retrospect

Five steps, 2026-09-07 to 2026-09-09, against [`plan.md`](plan.md). Covers
[`docs/backlog.md`](../backlog.md) [F1](../backlog.md#f1), [F3](../backlog.md#f3),
[F4](../backlog.md#f4), [F7](../backlog.md#f7) and [D10](../backlog.md#d10).

This document doubles as step 5's record; the step was small enough that a separate
`step-5-summary.md` would have been padding, and steps 1–4 have their own.

## 1. What shipped

| | |
| --- | --- |
| **F1** | `configurations.ci` on `eval-signals` and `eval-forms`, matching `eval-core`; coverage baselines recorded; thresholds decided **not yet**, with the ground |
| **F3** | The documented-symbol drift gate: a TypeScript-compiler-API export-list reader, one copy per project, behind **five** gate specs — `eval-core`, `eval-signals`, and one per `eval-forms` entry point |
| **F4** | README-execution gates for `eval-signals` (9 `ts` blocks, 7 cases) and `eval-core`'s package README (12 `javascript` blocks, 10 cases); the root `README.md` **assessed and dropped** |
| **F7** | Locus corrected: not an `eval-core` property, and possibly not a library defect. Left open, with the measurements |
| **D10** | `applyErrorPolicy`'s block and its two cases — which created the subject for F3's third `eval-forms` gate |

Opened along the way: [F9](../backlog.md#f9) (document cross-references, deferred with the
comparison that settled it), [F10](../backlog.md#f10) (the gate covers documented-**and-imported**
symbols), [F11](../backlog.md#f11) (a gated README can only import from its own specifier).

**Nothing shipped to npm.** No exported symbol, no manifest, no version bump — the property that
let the track run ahead of Phase 2, and § 6 gates 1 and 2 held on every step's diff.

## 2. The findings the gates produced, which is the point of having built them

- **Five symbols were exported, documented in the root README, and missing from the package
  README** — `ParserService`, `DiscoveryService`, `EvalContext`, `EvalScope`,
  `EvalScopeOptions`. F3's motivating shape, found on the gate's first run, fixed in the package
  README with no exception list anywhere.
- **`eval-signals`' `Dependency introspection` block printed a value that was wrong** under the
  one-program reading. The plan predicted it; step 3 fixed it in the document.
- **A printed value cannot carry a behavioural claim.** `// 40 — not recomputed` is satisfied by
  a signal that *did* recompute. Step 3 added a recompute count beside it and probed the
  difference: with the resolver made to subscribe to every key, only that assertion went red —
  the printed `40` was still `40`.
- **Two of `eval-core`'s hook cases asserted what the type system already guaranteed** until
  review caught them, and one of them exercised the opposite of the situation its block
  documents.

## 3. A deferral that resolved as designed

Worth naming because this repository has more of the other kind.

Step 2 gated two of `eval-forms`' three entry points and **declined the third**: no README
imported from the bare `@zvenigora/ng-eval-forms`, so the gate would have asserted over the empty
set — the shape § 1.5's floor exists to reject. It did not leave that implicit. The obligation
went into the `/reactive` gate's docstring *and* into F3, naming D10 as the thing that would
create the subject.

Step 5 built it, for exactly that reason, two days later. The deferral was recorded where the
next person would meet it, it named its own trigger, and the trigger fired. That is what a
deferral is supposed to do.

## 4. The mechanism this track kept catching, in itself

**F7 is the clearest instance, and it is this track's own subject turned inward.** The entry said
the Jest worker warning was "confined to `eval-core` — confirmed by running each project
separately". Re-measured: run separately, `eval-core` warns **zero** times, as do the other two;
the warning fired twice in about a dozen runs, only under multi-target `run-many`, and would not
recur. The claim travelled through **twelve** step summaries, each restating it as "pre-existing;
carried unchanged" — because re-running it was nobody's step.

[A8](../backlog.md#a8) failed the same way through **five phases** — carried in six step
summaries — invisible while two documents claimed it was tracked. That is the reason
`docs/backlog.md` exists. (Six is the summary count, not the phase count; the register's own
preamble owns both numbers, and getting them the wrong way round here would have been this
paragraph's subject happening to this paragraph.)

**And this track added a third instance of its own.** Step 2 recorded that the three blocks it
added to `eval-core`'s README "change the inventory without changing the question". They did not
parse; the file went from one unparseable block to four, in the exact shape step 4 then had to
judge — and step 4's drop would have looked better-supported than it was. It was caught because
step 4's criterion said **re-count rather than quoting this line**. Step 4 then put a fresh wrong
count into the plan itself, and review caught that.

### The tension, stated rather than resolved

**The register makes entries findable. It does nothing about entries being copied forward
unverified — and stable IDs make a wrong claim more citable, not less.** F7's locus travelled
twelve documents partly *because* it had a home to be cited from: `F7` is easier to carry
forward than a paragraph, and carrying it forward looks like diligence.

The only mechanism in this track that caught anything was a **criterion forbidding a quoted
number** — step 4's "re-count rather than quoting this line". That is a per-criterion discipline
written by one plan author for one step, not a register feature, and nothing generalises it. The
register and the discipline are not substitutes: the first makes a claim easy to find, the second
is the only thing that makes anyone check it.

**This suggests two changes to how backlog entries are written. Neither is built here** — this
track ships gates, not a register format, and building it would be the sixth step the plan
declined to grow:

1. **A locus claim carries the command that produced it.** F7 said "confirmed by running each
   project separately" without the command or its output; the corrected entry carries a table of
   commands and counts. A claim you cannot re-run is a claim nobody will re-run.
2. **A measured claim carries the date it was measured.** "Confined to `eval-core`" may have been
   true when written. Without a date, a reader cannot tell a fact from a fossil, and the cheapest
   response to both is to copy it forward.

Whoever picks this up should note that it is a *format* change to a register whose preamble
already argues about how entries earn their place — so it belongs with that argument, not bolted
on by the next phase that trips over an entry.

## 5. What the gates do not cover

Stated together, because "the READMEs are gated" is now easy to over-read:

- **Only imported identifiers** ([F10](../backlog.md#f10)). `createControlSource`, `FieldSchema`
  and `FormBinding` are exported, documented in prose and tables, and named in no import — a
  rename passes every gate.
- **Only a README's own specifier** ([F11](../backlog.md#f11)). A cross-package import line in a
  gated README is scanned by nothing. Two documents now name a package in a comment rather than
  print such a line — `eval-signals`' `inject(EvalService)` and `eval-forms`'
  `SignalContextWriteError` — which is honest but is a workaround, not a fix.
- **Nothing keeps a case and the block it mirrors in step but a human.** Editing a printed value
  in a README turns nothing red; the execution gates catch the *library* drifting from what a
  case transcribed. That is F4's own limitation, restated in every docstring rather than solved.
- **The root `README.md` is ungated**, by decision — see [F4](../backlog.md#f4) and
  [`step-4-summary.md`](step-4-summary.md) § 3 — and it is the file where two of the five
  motivating defects shipped.
- **A fifth README that no gate reads** would be noticed by nothing. That is the plan's risk 7, a
  stated refusal rather than an unfilled slot: the mitigation would be a gate over the gates, and
  that regress terminates nowhere useful.

## 6. Step 5's own record

| File | Change |
| ---- | ------ |
| `modules/eval-forms/README.md` | the `applyErrorPolicy` block, showing the default, a mapping function, the no-throw path and the rethrow |
| `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts` | two cases for it |
| `modules/eval-forms/src/public-api.spec.ts` | **new** — F3's third `eval-forms` gate, now that a README imports through the bare specifier |
| `docs/backlog.md` | D10 retired; F7 confirmed corrected in `9cbc197`; F1, F3 and F4 confirmed already updated by their own steps |
| `docs/gates/summary.md` | this file |

**Probes**, both reverted:

| Inversion | Red cases |
| --- | --- |
| The `SignalContextWriteError` rethrow removed from `applyErrorPolicy` | **7 across 4 files** — the new `documented examples › README - When a rule fails › should rethrow a write violation from applyErrorPolicy whatever the policy says`; the `/signals` README spec's `assignment boundary` case; `applyErrorPolicy over evaluateRule`'s two re-throw cases; and `createExpressionRules › the error policy…`'s three `bypassing onError` cases |
| `applyErrorPolicy` renamed at its declaration | the new gate's `imports no identifier the shared core does not export`, naming `modules/eval-forms/README.md:339`; plus the reader's own `returns a value export` in all three files that import the helper, and a compile failure in the two new README cases |

**The first arm was re-run unfiltered to produce that list, and the first draft of this table
understated it** — a `--testPathPatterns=readme-examples` run showed 2 of the 7. § 6 gate 3 asks
which cases went red, and a filtered probe answers a narrower question than the one being asked.

**The figure § 8.1 said would be watched moved, and is recorded rather than left.** Eight files
now build a compiler program — five gate specs and three helper copies, up from seven — because
step 5 added the third `eval-forms` gate. Measured, the five gate suites run in about 3 s
together, so the ~8 s in [`step-2-summary.md`](step-2-summary.md) § 3.1 still stands as the
baseline and nothing is triggered. It is noted because a retrospect that closes a track without
moving a number the track said it would watch is how the number stops being watched.

**F7 required no work in this step.** Its exit criterion — "updated with what was eliminated and
left open" — was met by `9cbc197`, which corrected the locus and amended the plan's starting
command. The step confirms it rather than re-opening it, and § 4 above is where the finding
landed.

**Exit criteria**: F7 updated with what was eliminated ✅; `applyErrorPolicy` has a runnable block
— **but for its cross-package `SignalContextWriteError` binding, which the block names in a
comment rather than an unscanned import line (F11), and which the spec supplies** — and a case,
and the drift gate covers the symbol it imports ✅; D10 and F7 updated in
`docs/backlog.md`, F1/F3/F4 confirmed ✅; this retrospect ✅; `nx run-many -t lint test` green,
with `build` ✅.
