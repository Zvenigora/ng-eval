# Trace surface — decide A15, A16 and A19

Plan and step in one, for [`docs/backlog.md`](../backlog.md) [A15](../backlog.md#a15),
[A16](../backlog-retired.md#a16) and [A19](../backlog.md#a19). Drafted against `ee6b43d`.

## Objective

Close the three open questions [A12](../backlog-retired.md#a12)'s trace work left open. Two are
decisions recorded in the register. One ships a JSDoc change. The same commit adds one line to
`CLAUDE.md` separating a corrected criterion from an amended one.

## What the tree says

**How a decided-and-declined entry is recorded.** The vocabulary table has five statuses, and
none of them means "decided". **Retired** is "no longer live". [D7](../backlog.md#d7) is accepted
and documented, and it stays **Open, documented** because a later phase may revisit it. So an
entry that is decided but has live reopen conditions stays Open, with a qualifier. An entry is
Retired only when nothing is left to watch. A15 and A19 follow D7. A16 is Retired: the defect was
that the fields are misleading, and the JSDoc removes that.

**A15's deciding paragraph rests on a false premise.** It says the cap breaks the trace /
`after`-hook correspondence "above 10,000 pushes in one walk, a size nothing in this workspace
reaches". The shipped bound is per state (the `maxTraceItems` docblock says "Per state, not per
walk"), so it bites across walks. The documented `createState` + repeated `eval` style reaches it
after about 500 walks. The entry's own staleness paragraph relies on that. The margin narrows
from "unreachable" to "hundreds of walks against one". The ordering holds, so the conclusion
holds. One thing is new since A12 shipped: four documented symbols, the README and the
`[Unreleased]` changelog now state the per-state span. Declining is what the release is about to
publish.

**A16's fields were never set by anything.** `eval-trace.ts` has one commit in its history,
`c1d6c05`, which declared them. The only writer of an `EvalTraceItem` is `EvalTrace.add`, and it
sets neither field.

**A19's plain-Node row is from one machine.** CI runs Node 24 and 26, which are two V8s.

**The brief named the wrong class for the `CLAUDE.md` line.** It named criteria that refer only
to real things and still cannot be met in the tree their own step produces. A21's criterion ("a
service-built context is *still* drained") named a drain that never existed, which is a different
class: a criterion whose referent does not exist. The line is written for that class. The remedy
previously prescribed for it was "halt and amend", so the line says the step does not halt.

## Decisions

- **A15: declined in general.** The per-walk reset bounds nothing the cap does not. It moves the
  hook-correspondence break from "after hundreds of walks" to "on the second". It would redefine
  four documented symbols. `clearTrace()` is the opt-in remedy. It reopens on a frozen-trace
  report, or on a decision to unify the per-state accumulators' lifetimes.
- **A16: documented as reserved.** The cheapest option, and it keeps the other two open.
  Populating needs a meaning first, and costs the per-node path. Dropping is a breaking release
  for no gain.
- **A19: not built now.** The defect would bring back the old trace's allocation but not its
  retention, and it costs 16% wall clock. The instrument is unproven on CI's two Node versions.
  The gate is a new kind of target, built for one line. It is reversed by a second
  allocation-shaped invariant, or by a dist target built for another reason. If it is reversed,
  it is filed as an F-series track and not built here. Until then the regression is unguarded,
  and the entry says so.

## Scope and files

- `CLAUDE.md`: one bullet under "Working from a plan"
- `docs/backlog.md`: A15, A16 and A19, and their three index rows
- `modules/eval-core/src/lib/internal/classes/eval/eval-trace.ts`: JSDoc on `start` and `end`
- `CHANGELOG.md`: `[Unreleased]`, `### Changed`, one line
- `docs/trace-surface/plan.md`: this file

**Category:** docs. The JSDoc ships in the `.d.ts`, and no exported shape changes, so there is no
bump and no manifest change. [F15](../backlog-retired.md#f15)'s peer ranges belong to the batch release.

## Exit criteria

1. `CLAUDE.md` carries the corrected-not-amended rule, and says weakening a satisfiable
   criterion stays forbidden.
2. A15 and A19 are **Open** with a dated "decided" qualifier and their reopen conditions, and are
   not Retired. A16 is **Retired** with its reason. Each index row matches its entry.
3. A15's corrected sentence is marked as a correction and quotes the original.
4. After `build:production`, `dist/modules/eval-core` contains the new `start` docblock in a
   `.d.ts`. The CHANGELOG line is under `[Unreleased]`.
5. Every citation of A15, A16 or A19 outside the register still reads true.
6. The gate is `npx nx run-many -t lint test build`, all three projects.

## What was checked

- **Citations (criterion 5), with the rows that reconcile:**

  | Site | Says | After |
  | ---- | ---- | ----- |
  | `eval-result.ts:205` (`clearTrace`) | the span is deliberate, A15 | true |
  | `trace-bound.spec.ts:187`, `:284` | per-walk reset decided out, A15 | true |
  | `trace-bound.spec.ts:53` | build-and-discard undetected, filed as A19, "still true" | true |
  | `trace-bound.spec.ts:322` | no `WeakRef` probe, A19 | true |
  | `docs/trace2/step-1.md:5` | no per-walk reset, A15 | true |
  | `docs/trace2/step-2.md`, `step-3.md` | A15/A16/A19 carried over | historical, true |
  | `eval-trace.ts` (new) | A16 | true |

- **Code-reviewer:** no Critical findings, and four Warnings, all fixed. A19's first ground
  argued per walk, which the A15 correction in this same change rules out. It now argues
  allocation without retention. A19 cited [F8](../backlog.md#f8) for a shape F8 does not have.
  It also offered a manual re-run the tree cannot supply, and a reversal trigger that nothing can
  fire. All three are gone, and the entry now says plainly that the regression is unguarded. The
  `CLAUDE.md` bullet did not say how it relates to the gate exception above it, or to the "halt
  and amend" remedy. The JSDoc said "per-node timing" for totals per node type. Notes taken: F4
  cited as A16's Retired precedent, `evaluateRule` named beside `eval-signals` in A15, and
  `trace2/step-1.md` added to the table above.
- **Criterion 4:** after `build:production`, both docblocks are in
  `dist/modules/eval-core/types/zvenigora-ng-eval-core.d.ts`, on `EvalTraceItem`.
- **Gate:** `npx nx run-many -t lint test build --skip-nx-cache` passes for all three projects.
  eval-core has 1064 tests, eval-signals 129 and eval-forms 251, the same counts as after A21.
- **Scope effect on other entries:** none. A17 names `clearTrace` as a caller-owned drain, and
  that is unchanged. No F-series entry is filed, because A19 was not reversed.
