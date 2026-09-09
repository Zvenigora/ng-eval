# Track 3, step 3 — the README-execution gate for `eval-signals`

Executed 2026-09-08 against [`docs/gates/plan.md`](plan.md) § 4 step 3. Covers the
`eval-signals` half of [`docs/backlog.md`](../backlog.md) [F4](../backlog.md#f4); the
`eval-core` half is step 4's decision.

## 1. What changed

| File | Change |
| ---- | ------ |
| `modules/eval-signals/src/lib/readme-examples.spec.ts` | **new** — seven cases over the README's nine `ts` blocks |
| `modules/eval-signals/README.md` | the § 1.3 defect fixed, and three other fragments completed |
| `docs/backlog.md` | F4 marked half done, with what shipped and the limit it keeps |
| `docs/gates/step-3-summary.md` | this file |

## 2. The rule for which fragments were completed

Criteria 1 and 4 of the step pull in different directions on the same block — one permits a
block to be *named as not covered*, the other says a fragment's fix goes into the README. Stated
as a rule so the next reader does not re-derive it block by block:

> **A fragment is completable when the missing bindings are ones the document already implies.
> It is not covered when completing it would mean inventing an example the document does not
> make.**

Applied:

| Block | Verdict | Why |
| --- | --- | --- |
| `## Quick start` (two blocks) | executed, **one case** | already a program |
| `## Dependency introspection` | **completed** — gains `price` / `quantity` / `shipping` | the block names all three; the document implies them |
| `## Contexts that are not signal-backed` | **completed** — gains `plainObject`, and the two reads the prose describes | "a plain object you own" is the document's own sentence |
| `## Writes are not supported` | **completed** — gains `count` | the expression `'count = 5'` implies it |
| `## Using the adapter directly` | **completed** — gains `price`, `quantity`, `evalService` | the section is *about* holding an `EvalService` |
| `## Lifetime` | executed as printed | already a complete class |
| `## Options` | **not covered** | an options illustration: `user`, `isDeepEqual` and `injector` would each be an invented example. Every option it names is covered by `eval-signal.spec.ts` |
| `## Async expressions` | **half covered** | the first statement is this library's claim and is executed; the `resource(…)` composition documents Angular's API, and a runnable version would be a `resource` example this document does not make |

The two `sh` blocks — `npm install` and the three `nx` targets — are not covered.

**Four blocks moved in the document, one of them for a defect and three for completeness.** None
of the completions changed a printed value that was already there; they added declarations and,
in two cases, the reads the surrounding prose describes.

## 3. The defect, and the one the plan did not name

**Predicted (§ 1.3), and fixed in the README.** `## Dependency introspection` printed `// 30`
against bare `price` / `quantity` / `shipping` the document never declared. Under the one-program
reading — where `## Quick start` has already set `quantity` to 4 — the true value is 40 and the
printed one is wrong; under a fresh-start reading it is right, but only by conceding the per-block
reset that hides this class of error. The block now declares its own three signals, so it is a
fresh start in fact.

**Not predicted: `// 40  — not recomputed` is a behavioural claim its printed value cannot
carry.** A signal that *did* recompute after `shipping.set(0)` also produces 40, so asserting the
printed value alone would report coverage of the library's headline claim while discriminating
nothing — the same shape as a spec asserting `disabled()` where the claim is about
`disabledReasons()`. The case asserts a recompute count beside it, using the
`jest.spyOn(compiler, 'createState')` idiom `eval-signal.spec.ts` already uses (one call per
recompute by design). It is listed as substitution 6 in the docstring, with its reason, so a
later reader does not read the extra assertion as drift from the README.

## 4. Confirmed load-bearing — and what the probe shows the gate cannot do

**The pairing probe.** The README's `// 30` was changed to `// 31` and transcribed into the case,
as a transcription would. Red, named:

```
● documented examples › Dependency introspection › should report what the last recompute read
  Expected: 31
  Received: 30
```

So a wrong documented value cannot be transcribed into a passing test — the assertion is bound to
the library, not to itself. Both edits were reverted.

**What that same probe shows about the limit.** Changing the README *alone* turns nothing red;
the spec does not read the markdown. This gate catches the library drifting from what a case
transcribed, not the README drifting from the case. Nothing keeps those in step but a human,
which is F4's own stated limitation and is restated in the docstring rather than solved. The
drift gate built in step 2 is the other half and covers a different thing again — the symbols a
README *imports*.

**Two further arms, because the transcription probe cannot reach the file's two
non-transcription assertions.** Both were run against the library and reverted:

| Arm | Inversion | Red case |
| --- | --- | --- |
| Recompute counter (substitution 6) | `resolve` in `signal-context.ts` made to call every signal in the source, i.e. subscribe to all of them | **only** `Quick start › should recompute for a key the expression read and not for one it did not`, on `Expected number of calls: 2, Received: 3`. **The printed `40` was still `40`** — which is precisely why the count is there |
| Post-destroy `undefined` (substitution 7) | the `version.update` bump removed from `destroy()` (`eval-signal.ts:398`) | `Lifetime › should evaluate through the service and tear down in ngOnDestroy` — `Received: 30`, the stale value the un-dirtied `computed` keeps serving |

The first arm is the one worth keeping: it is the case where a value assertion and a behavioural
assertion disagree about whether anything is wrong, and the value assertion says nothing is.

## 5. The one-program condition, demonstrated on both halves

`docs/gates/plan.md` § 4 step 3 asks for a demonstration rather than an assertion, and the green
half is the one that matters: a red arrangement B only shows the block is state-dependent, while
a green arrangement A is the Phase 4 trap itself — a resetting fixture reporting success on a
document that is wrong as written.

Run on a throwaway spec with the block restored to its bare identifiers, deleted before the diff:

| Arrangement | Result |
| --- | --- |
| **A — per-block resetting fixture** (fresh `price` / `quantity` / `shipping` per block) | **GREEN** on the wrong `// 30` |
| **B — one program** (the Quick start's fields, after its `quantity.set(4)`) | **RED**: `Expected: 30, Received: 40` |

Both materialised, so the condition has a real subject in this file and needed no substitute.

## 6. Exit criteria

| Criterion | Status |
| --- | --- |
| All 9 `ts` blocks accounted for — executed, or named in the docstring as not covered with the reason | **Met** — 7 executed across 7 cases, `## Options` and the `resource(…)` half named with reasons; the 2 `sh` blocks named too |
| § 1.3's `Dependency introspection` defect fixed in the README, not worked around | **Met** (§ 3) |
| Every substitution enumerated, explicitly including `../public-api` and the component instance | **Met** — **eight**. Items 6, 7 and 8 are one class, a value asserted that the block does not print: the recompute counts, the Lifetime block's `30` and post-destroy `undefined`, and the async block's resolved value. Review found 7 and 8 missing from a list whose enumeration is the only defence risk 3 has |
| Where another block was a genuine fragment, the fix went into the README, and the summary says which moved and why | **Met** (§ 2) — three completed, under a stated rule |
| Confirmed load-bearing: change one printed value, observe the paired case fail, named | **Met** (§ 4) |
| The one-program condition demonstrated on the block that can falsify it | **Met**, both halves (§ 5) |
| `nx run-many -t lint test` green | **Met**, and `build` with it |

## 7. Noticed, not fixed

- **`## Options`'s three undeclared names are the one place this README still reads as a
  fragment.** Completing it is a documentation-authoring call — it needs an example user object
  and a deep-equality function — and it is out of this step's scope under § 2's rule. If
  someone later wants that section runnable, it is a small piece of original authoring, not a
  gate change.
- **The async section's `resource(…)` block stays ungated**, which means the "put the read in
  `params`" advice — the part with a real failure mode behind it — is prose only. Gating it
  needs a `resource` example the document does not currently make.
- **`inject(EvalService)` in the completed adapter block names a symbol from a second package,
  and this README shows imports only in its Quick start.** Left as an inline comment naming the
  package rather than an import line, deliberately: step 2's drift gate checks this README
  against `@zvenigora/ng-eval-signals` only, so an `@zvenigora/ng-eval-core` import line here
  would be scanned by nothing. Adding one would buy documentation completeness and zero
  coverage — and would quietly create the first unscanned import line in a gated file. If a
  later step wants that import printed, it should extend the gate in the same commit.

  **Recorded as [F11](../backlog.md#f11)** rather than left here, and cross-linked from both
  [F3](../backlog.md#f3) and [F4](../backlog.md#f4): a limit a reader meets only in a step
  summary is a limit nobody meets. With [F10](../backlog.md#f10) it is the second coverage bound
  this track found from inside the work rather than from planning.
