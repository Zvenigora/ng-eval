# Track 3, step 1 — the CI test configuration, and the coverage decision

Executed 2026-09-07 against [`docs/gates/plan.md`](plan.md) § 4 step 1. Covers
[`docs/backlog.md`](../backlog.md) [F1](../backlog.md#f1), now retired.

## 1. What changed

| File | Change |
| ---- | ------ |
| `modules/eval-signals/project.json` | `test` target gains `configurations.ci` = `{ ci: true, coverage: true }` |
| `modules/eval-forms/project.json` | the same block |
| `docs/backlog.md` | F1 retired: the fix, the decision, the baselines, and a corrected premise |
| `docs/gates/plan.md` | step 1's first exit criterion corrected — see § 3 |

Both blocks are byte-identical to `eval-core`'s, which was the point: the divergence was
accidental rather than considered, so the symmetric answer needs no argument.

## 2. The finding — F1's premise was wrong, and the gap was worse than recorded

F1 said `nx test <project> --configuration=ci` "does not exist for two of three libraries",
and the plan's exit criterion inherited that as "the command errored before this step and does
not after".

**It does not error.** Measured with the two blocks stashed:

```
$ npx nx test eval-signals --configuration=ci --skip-nx-cache
...
NX   Successfully ran target test for project eval-signals
EXITCODE=0
```

Nx ignores an unknown configuration rather than rejecting it. The suite ran, exited 0, and
emitted no coverage.

**Why this matters more than a wording fix.** "Does not exist" implies a CI job asking for
per-project coverage would fail loudly and get fixed. What would actually have happened is a
**green run with no coverage**, on two of three projects, reporting nothing — the failure mode
this repository keeps finding and keeps under-recording. F1 described a loud gap and the gap
was silent.

**The first attempt at this measurement was itself wrong**, which is worth recording. Running
the stashed command without `--skip-nx-cache` returned `Cache: 1/1 hit (100%)` and exit 0 —
a cached result from the *plain* `nx test eval-signals` earlier in the session, because with no
`ci` configuration to resolve the two invocations have the same inputs. That looks exactly like
"it works fine", for the wrong reason. The cache hit was the tell; a run whose duration is 13 ms
has not run a test suite.

## 3. The exit criterion was corrected rather than worked around

Plan § 4 step 1's first criterion now reads "**emit coverage** — `coverage/modules/<project>/`
is written where it was not before", with the correction and its measurement recorded inline.

This is a criterion change during execution, so it is flagged rather than folded in: the
original was **unsatisfiable**, not merely awkward — nothing errored before, so "errored before
and does not after" could never be observed. The replacement discriminates on the thing the
entry actually cares about, and it is strictly stronger: exit status was never going to
distinguish the two states, and coverage output does.

## 4. Exit criteria

| Criterion | Status |
| --------- | ------ |
| Both commands run and emit coverage where they did not before | **Met.** `coverage/modules/eval-signals/` and `coverage/modules/eval-forms/` are written; neither existed before. Confirmed by deleting `coverage/` and re-running |
| The three baseline coverage numbers are in the step summary | **Met** — § 5 |
| F1 records the threshold decision and its ground; Retired if nothing is left open | **Met.** Retired, with what would reopen it |
| `nx run-many -t lint test` green | **Met** — § 6 |

## 5. The baselines

`npx nx run-many -t test --configuration=ci --skip-nx-cache`, 2026-09-07:

| Project | Statements | Branches | Functions | Lines |
| ------- | ---------- | -------- | --------- | ----- |
| `eval-core` | 82.44% | **67.95%** | 79.43% | 81.51% |
| `eval-signals` | 100% | 99.13% | 100% | 100% |
| `eval-forms` | 98.66% | 95.72% | 97.61% | 98.53% |

**Decision: no thresholds, not yet.** The spread is the argument. A single workspace-wide
threshold is either trivially met by the two newer packages or immediately blocking for
`eval-core`, 31 branch-coverage points below its siblings. Per-project numbers would work but
would be three arbitrary lines drawn from today's figures, and CI does not run
`--configuration=ci` at all — `.github/workflows/node.js.yml` runs plain `npm test` — so
adopting thresholds also means changing the workflow. Second decision, second owner.

`eval-core`'s 68% branch coverage is the number worth remembering. It is the package carrying
the visitor and service defects in § A of the register, and an unfixed branch is exactly what
low branch coverage hides. Not this step's to act on.

## 6. Verification

```
npx nx run-many -t lint test    →  lint, test for 3 projects — green
```

`build` was not run: this step changed two `project.json` `test` targets and no TypeScript, so
there is no `tsconfig.lib.prod` surface for it to cover. Steps 2–5 add source files and will run
it per the skill's § 4.

**Diff check** (`git diff --name-only`), against the skill's file-kind rule: two `project.json`
files, two documents under `docs/`. No non-spec file under `src/lib/`, `reactive/` or `signals/`;
no `public-api.ts`, `index.ts` or `package.json` under `modules/`. Clean.

## 7. Noticed, not fixed

- **The `coverage/` output is gitignored** (`.gitignore:30`), so the baselines above live only
  in this document. If thresholds are ever adopted, the numbers will want a machine-readable
  home rather than a table in a step summary.
- **`eval-core`'s Jest run still warns "a worker process has failed to exit gracefully"** —
  [F7](../backlog.md#f7), step 5's, and it appeared in this step's baseline as it has in the
  previous twelve.
- **Nx silently accepting an unknown `--configuration` is general**, not specific to `test`. Any
  future `--configuration=<typo>` on any target in this workspace will run the default and
  report success. Not worth an entry on its own, but it is the reason § 2's finding was
  invisible for two phases.

## 8. For step 2 specifically

- **The register now has a Retired entry with a live decision inside it** (F1's "what would
  reopen it"). That shape is new; if it recurs, the status vocabulary may want a term between
  Retired and Open rather than a paragraph doing the work.
- **`--skip-nx-cache` is required for any measurement whose subject is the command's
  configuration**, not just its output. Step 2's rename probes are exactly that shape: renaming
  an export changes the input hash so the cache should miss, but the four-arm probe should
  confirm a real run rather than trusting it — a 13 ms "pass" is the tell.
