# Step 3 — docs and records

A replay of `backlog-A12` at `ea23794`, covering the documentation and the backlog register. It
does not bump a version, change a manifest, tag or publish. The version moves when the batch
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
  replaced with ea23794's corrected paragraph and the new § "Bounding the trace". The text is
  verbatim.
- **Root `README.md`**: adds the `traceTruncated` line under `console.table(state.result.trace)`.
  Verbatim.
- **`eval-signals`**: three comments said the trace "is drained by nothing", and they are
  corrected. One of them is JSDoc on the exported `createEvalSignal`. Verbatim.
- **`CHANGELOG.md`**: the eval-core Added / Changed / Upgrading notes go under `[Unreleased]`,
  together with a line about the eval-signals comment change.
- **`docs/backlog.md`**:
  - A12 is retired: index row and entry.
  - A15, A16, A17 and A19 are carried over from ea23794, with index rows and entries.
  - A8's paragraph about "the trace" is updated to say the trace is now bounded.

## Where this differs from ea23794, and why

- **No `[eval-core 0.6.0]` heading, no A18, no peer-range entry.** The brief rules out a version,
  a manifest change and A18. ea23794's 0.6.0 section therefore goes under `[Unreleased]` without
  its "prepared, unreleased" preamble and without the A18 pointer. ea23794's `[Unreleased]`
  entry about widening the peer ranges describes a manifest change this branch does not make, so
  only its note about the eval-signals comments is kept.
- **The rest of ea23794's register changes are not carried**: the "Work in flight" rewrite, the
  "Publication status" table, and the F7 additions. They describe the `backlog-A12` track and its
  0.6.0 release, not the fix, and the brief names only A12, A15, A16, A17 and A19. A8 is the one
  exception. Leaving A8 alone would keep it saying one state "can hold hundreds of thousands of
  trace items", which becomes false once A12 is retired. The A8 update is ea23794's paragraph
  with its A18 clause removed.
- **The entries' links into `docs/trace/` were redirected.** That directory exists only on
  `backlog-A12`. Each citation now names that branch as plain text, not as a relative link that
  would be dead on this branch (the dangling-link problem F9 records). A12's *Fixed* line points
  at `docs/trace2/` and at the probe record in `trace-bound.spec.ts`'s header.
- **"0.6.0" stays where ea23794's verbatim text says it**: the `maxIterations` JSDoc, the three
  eval-signals comments, A15 and A17. `eval-core` is at 0.5.0, and this change adds published API,
  so the release that carries it is the next minor. The register's own status fields say
  "unreleased" and give no number.

## Left for the release, not recorded here

`eval-signals` and `eval-forms` declare `@zvenigora/ng-eval-core` `>=0.3.0 <0.6.0`. A release of
this change as 0.6.0 falls outside that range. ea23794 widened both ranges to `<0.7.0`. This
branch does not, because the brief rules out manifest changes. Widening them is part of the batch
release.

## What was checked

- `npx nx run-many -t lint test build --skip-nx-cache` passed for all 3 projects, all targets:
  1059 / 129 / 251. The READMEs' code fragments run under `eval-core`'s README-execution gate
  (F4), which is part of that test run.
- No link added by this step points at A18 or into `docs/trace/`. Checked by grepping the diff
  against `master`. The `docs/trace/` mentions that remain are plain text naming branch
  `backlog-A12`.
