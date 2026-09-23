# Step 1 — the bound

A replay of `backlog-A12` at `ea23794`, not a new design. The decisions were settled there: the
10,000 default, a head cap rather than a ring buffer, no truncation marker, the `enterWalk` read,
no per-walk reset. This step writes them again. It does not argue them again.

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
  restores the unbounded behaviour, and both values are honoured as given. The same step replaces
  the `maxIterations` docblock with ea23794's corrected text. That text says a 100,000-iteration
  loop is *not* stopped by the budget.
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

## Where this differs from ea23794, and why

- **Citations of `docs/trace/…` were redirected.** That directory is on `backlog-A12` and not on
  this branch, so each citation would have pointed at a file that does not exist here. Changed:
  - `eval-state.ts` `DEFAULT_MAX_TRACE_ITEMS`: "Sized in `docs/trace/plan.md` § 3.4 rather than
    picked" now reads "Sized rather than picked". The sizing argument follows in the same comment.
  - `visitor-result.ts` header: the "`docs/trace/plan.md` § 8.3, answered here" clause is removed.
  - `trace-bound.spec.ts`: the plan § 1.1 / § 3.1 / step-1 citations now point at
    `docs/backlog.md` A12 or A15. The probe header names the summaries' location as branch
    `backlog-A12`.
- **The spec's probe-record header comes from `0488865`, not `ea23794`.** The header was added one
  commit after ea23794 and exists only in that commit's version of the file. This step keeps the
  step-1 table from it. Step 2 adds the step-2 table.
- **Deferred to step 2**, as the brief splits the work: `@internal` on `EvalState.maxTraceItems`,
  and the `clearTrace` `describe`.
- **A forward reference for one commit.** The `maxTraceItems` JSDoc is copied verbatim from
  ea23794, and it names `EvalResult.clearTrace()`, which step 2 adds. It is backticked prose and
  not a `{@link}`, so it compiles. It is accurate once step 2 lands.

## What was checked

- `npx nx run-many -t lint test build --skip-nx-cache` passed for all 3 projects, all targets.
  Test counts: eval-core 1057, eval-signals 129, eval-forms 251. ea23794 had 1059 for eval-core,
  and the difference is the two cases step 2 adds.
- The Jest "worker failed to exit gracefully" warning fired once. That is `docs/backlog.md` F7,
  and the entry asks that single runs not be added to it, so it is not added.
- The probes were carried over, not re-run. Every assertion is character-for-character the same
  as in ea23794's spec. Only comments changed, as listed above.
