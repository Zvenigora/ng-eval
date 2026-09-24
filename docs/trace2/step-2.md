# Step 2 — the reset

Two decisions were settled before this step: `clearTrace` empties the array in place (its
docblock says why), and there is no per-walk reset (`docs/backlog.md` A15). This step does not
reopen either.

## Objective

Give a caller who reuses one state a way to reset the trace, and make
`EvalService.ngOnDestroy` drain the trace along with everything else it already drains. Before
this, `ngOnDestroy` cleared the value stack, the context and the hooks, and skipped the trace, the
largest thing on the result. A caller holding a state through `createState` kept that trace
after destroy.

## Files

- `modules/eval-core/src/lib/internal/classes/eval/eval-result.ts`
- `modules/eval-core/src/lib/actual/services/eval.service.ts`
- `modules/eval-core/src/lib/internal/classes/eval/eval-state.ts`
- `modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts`
- `modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts`

## What it does

- **`EvalResult.clearTrace()`** empties the trace by setting `length = 0` on the same array, and
  resets `tracePushCount` and `traceTruncated`. Its docblock explains why this is the opposite
  choice from `EvalState.resetHookBookkeeping`, which replaces its record instead.
- **`EvalService.ngOnDestroy`** calls `state.result?.clearTrace()` right after it clears the value
  stack, inside the existing per-state `try`. That placement is the one `docs/backlog.md` A17
  records as a hazard: a throw here skips the drains that follow. A17 is carried over in step 3,
  not fixed here.
- **`EvalState.maxTraceItems`** is tagged `@internal`.
- **`trace-bound.spec.ts`** gains the `clearTrace` `describe`: one case with three legs (fill,
  clear, trace again). It also gains the step-2 table in the probe header.
- **`eval.service.memory-leaks.spec.ts`** gains the destroy-drain case. The test keeps a
  reference to the state, uses a cap of 3 against 7 pushes, and checks that the trace is
  non-empty before destroy, since that is the precondition for the test to mean anything.

## Notes

- **The `clearTrace` case explains its three legs in place.** Its reason for having no `WeakRef`
  probe cites `docs/backlog.md` A19.
- **`clearTrace`'s docblock cites `docs/backlog.md` A15** for why the trace spans walks. A15
  lands in step 3, so for one commit this is a forward reference.
- **The probe header's opening sentence says "Fifteen wrong implementations"**, now that both
  tables are present.

## What was checked

- `npx nx run-many -t lint test build --skip-nx-cache` passed for all 3 projects, all targets.
  Test counts: eval-core 1059, eval-signals 129, eval-forms 251.
- The probes were not re-run. They were run 2026-09-19 against the same assertions, character
  for character.
