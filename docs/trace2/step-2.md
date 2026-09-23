# Step 2 — the reset

A replay of `backlog-A12` at `ea23794`. That branch settled `clearTrace` emptying the array in
place, and no per-walk reset. This step does not reopen either.

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

## Where this differs from ea23794, and why

- **Citations in `trace-bound.spec.ts` were redirected**, for the same reason as step 1. In the
  `clearTrace` case, "plan § 4 step 2, criterion 1" is removed, because the three legs are
  explained right there in the case. The reason for no `WeakRef` probe, "(§ 4 step 2)", now
  points at `docs/backlog.md` A19, which argues it.
- **`clearTrace`'s docblock** cited `docs/trace/plan.md` § 3.1 for why the trace spans walks. It now
  cites `docs/backlog.md` A15, the entry that makes that argument on this branch. A15 lands in
  step 3, so for one commit this is a forward reference.
- **The probe header's opening sentence says "Fifteen wrong implementations" again**, as it does
  in `0488865`, now that both tables are present.

## What was checked

- `npx nx run-many -t lint test build --skip-nx-cache` passed for all 3 projects, all targets.
  Test counts: eval-core 1059, eval-signals 129, eval-forms 251. ea23794's gate recorded the same
  three counts.
- The probes were carried over, not re-run. The new assertions are character-for-character the
  same as ea23794's. The tree now differs from ea23794 only in the comment citations listed here
  and in step 1.
