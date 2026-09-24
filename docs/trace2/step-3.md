# Step 3 — docs and records

The documentation and the backlog register. This step does not bump a version, change a
manifest, tag or publish. The version moves when the batch
releases.

## Objective

Document the trace bound where a consumer will find it, and record in the register that
`docs/backlog.md` A12 is closed. Carry over the four entries the A12 work opened that are still
open.

## Files

- `modules/eval-core/README.md`
- `README.md`
- `modules/eval-signals/src/lib/eval-signal.ts`, `eval-signal.spec.ts`, `eval-signal.memory.spec.ts`
- `CHANGELOG.md`
- `docs/backlog.md`

## What it does

- **`modules/eval-core/README.md`**: the paragraph beginning "It bounds time, not memory" is
  corrected, and a new § "Bounding the trace" follows it.
- **Root `README.md`**: adds the `traceTruncated` line under `console.table(state.result.trace)`.
- **`eval-signals`**: three comments said the trace "is drained by nothing", and they are
  corrected. One of them is JSDoc on the exported `createEvalSignal`.
- **`CHANGELOG.md`**: the eval-core Added / Changed / Upgrading notes go under `[Unreleased]`,
  together with a line about the eval-signals comment change.
- **`docs/backlog.md`**:
  - A12 is retired: index row and entry.
  - A15, A16, A17 and A19 are filed, with index rows and entries.
  - A8's paragraph about "the trace" is updated to say the trace is now bounded.

## Notes

- **No `[eval-core 0.6.0]` heading and no peer-range entry.** The brief rules out a version and a
  manifest change, so the notes go under `[Unreleased]`, with a line about the eval-signals
  comments.
- **No other register entry changes**: the brief names only A12, A15, A16, A17 and A19. A8 is the
  one exception. Left alone, it would keep saying one state "can hold hundreds of thousands of
  trace items", which becomes false once A12 is retired.
- **A12's *Fixed* line** points at `docs/trace2/` and at the probe record in
  `trace-bound.spec.ts`'s header.
- **"0.6.0" appears in** the `maxIterations` JSDoc, the three eval-signals comments, A15 and A17.
  `eval-core` is at 0.5.0, and this change adds published API, so the release that carries it is
  the next minor. The register's own status fields say "unreleased" and give no number.

## Left for the release, not recorded here

`eval-signals` and `eval-forms` declare `@zvenigora/ng-eval-core` `>=0.3.0 <0.6.0`. A release of
this change as 0.6.0 falls outside that range. Both ranges need widening to `<0.7.0`. This branch
does not widen them, because the brief rules out manifest changes. Widening them is part of the
batch release.

## What was checked

- `npx nx run-many -t lint test build --skip-nx-cache` passed for all 3 projects, all targets:
  1059 / 129 / 251. The READMEs' code fragments run under `eval-core`'s README-execution gate
  (F4), which is part of that test run.
- No link added by this step points at a file or entry missing from this branch. Checked by
  grepping the diff against `master`.
