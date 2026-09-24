# Step 1 — the bound

Not a new design. The decisions were settled before this step: the 10,000 default, a head cap
rather than a ring buffer, no truncation marker, the `enterWalk` read, no per-walk reset. Each is
argued in its own docblock, and the reset in `docs/backlog.md` A15. This step implements them. It
does not argue them again.

## Objective

Bound `EvalResult.trace` with a `maxTraceItems` evaluation option, so that a loop's trace stops
growing as iterations × nodes (`docs/backlog.md` A12). The step also reports what the bound
dropped.

## Files

- `modules/eval-core/src/lib/internal/classes/eval/eval-options.ts`
- `modules/eval-core/src/lib/internal/classes/eval/eval-state.ts`
- `modules/eval-core/src/lib/internal/classes/eval/eval-result.ts`
- `modules/eval-core/src/lib/internal/visitors/visitor-result.ts`
- `modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts` (new)

## What it does

- **`EvalKnownOptions.maxTraceItems`** defaults to 10,000. `0` disables tracing and `Infinity`
  restores the unbounded behaviour, and both values are honoured as given. The same step corrects
  the `maxIterations` docblock, which now says a 100,000-iteration loop is *not* stopped by the
  budget.
- **`EvalState`** has a `readMaxTraceItems` function, a `_maxTraceItems` field and a
  `maxTraceItems` getter. The field is filled in `enterWalk` at depth 1, next to the
  iteration-budget refill. That means the walk's own options are re-read on each outermost walk.
- **`EvalResult`** gains `traceTruncated` (it latches once set), `tracePushCount` (it counts pushes
  rather than entries kept), and `addTraceBounded(node, value, limit)`, which is `@internal`.
  **`EvalTrace` is not changed.**
- **`visitor-result.ts`**: both push sites (`pushVisitorResult` and `pushVisitorResultAsync`) now
  call `addTraceBounded` with `st.maxTraceItems` instead of calling `trace.add` directly. The value
  stack is not bounded.
- **`trace-bound.spec.ts`** holds ten cases in four `describe`s, plus the header recording the
  step-1 probes.

## Notes

- **Comments cite `docs/backlog.md`, not a plan document.** `DEFAULT_MAX_TRACE_ITEMS` reads
  "Sized rather than picked", with the sizing argument in the same comment.
- **The spec's probe-record header** holds the step-1 table. Step 2 adds the step-2 table.
- **Deferred to step 2**, as the brief splits the work: `@internal` on `EvalState.maxTraceItems`,
  and the `clearTrace` `describe`.
- **A forward reference for one commit.** The `maxTraceItems` JSDoc names
  `EvalResult.clearTrace()`, which step 2 adds. It is backticked prose and not a `{@link}`, so it
  compiles. It is accurate once step 2 lands.

## What was checked

- `npx nx run-many -t lint test build --skip-nx-cache` passed for all 3 projects, all targets.
  Test counts: eval-core 1057, eval-signals 129, eval-forms 251. Step 2's two cases bring
  eval-core to 1059.
- The Jest "worker failed to exit gracefully" warning fired once. That is `docs/backlog.md` F7,
  and the entry asks that single runs not be added to it, so it is not added.
- The probes were not re-run. They were run 2026-09-19 against the same assertions, character
  for character.
