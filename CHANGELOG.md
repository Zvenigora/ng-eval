# Changelog

Each published package keeps its own changelog, beside its source:

| Package | Changelog |
| ------- | --------- |
| `@zvenigora/ng-eval-core` | [`modules/eval-core/CHANGELOG.md`](modules/eval-core/CHANGELOG.md) |
| `@zvenigora/ng-eval-signals` | [`modules/eval-signals/CHANGELOG.md`](modules/eval-signals/CHANGELOG.md) |
| `@zvenigora/ng-eval-forms` | [`modules/eval-forms/CHANGELOG.md`](modules/eval-forms/CHANGELOG.md) |

Until 2026-09-28 all three shared this file, and a heading named its package. Every entry moved
to its package's file with its text unchanged. What changed is the heading, which lost that
prefix, the relative links, which were re-based to the new location, and five `eval-core` headings,
which gained "(not published to npm)". This file now holds only changes that ship in no package.

---

## Workspace (not published)

Workspace tooling: nothing here reaches a consumer, so nothing here is versioned.

### Removed
- **Ten stale documents**, 2026-10-14: `IMPROVEMENTS.md`, `PERFORMANCE.md`,
  `docs/common-classes.md`, `docs/eval-classes.md`, `docs/eval-functions.md`,
  `docs/eval-visitors.md`, `docs/services.md`, `docs/steps.txt`, `docs/remediation-plan.md` and
  `docs/repository-audit.md`. Each was audited first, in § 3.3 of the Phase 10 plan
  (`docs/documentation/phase-10-plan.md`). Most of what they said was false or stated elsewhere. Two
  facts are kept for `eval-core`'s README (Phase 10 step 3). The `qs` override's reason, corrected
  from the audit's "prototype pollution" to the denial-of-service advisory it was added for, moved to
  `docs/backlog.md` F16. Phase 10 step 1.
- **`@angular/animations` and `@angular/platform-browser-dynamic`**, 2026-09-30: both deprecated
  in Angular 22.2 and imported nowhere in the repository, leftovers of the workspace scaffold. No
  published package depended on either.

### Fixed
- **Dependency security, 2026-09-30**: `npm audit` 22 → 0. Angular 22.2.1 (framework) / 22.2.0
  (CLI and devkit), `jest-preset-angular` 17.0.1, `axios` and a higher `brace-expansion` floor
  under `overrides.nx`, in-range updates of `brace-expansion`, `undici` and `fast-uri`, and the
  unused `verdaccio` removed. `ng-packagr` stays at 22.1.1 so the published `.d.ts` files do not
  change. `docs/backlog.md` F16.
- **Dependency security, 2026-10-10**: `npm audit` 26 → 25, clearing the one critical.
  `handlebars` 4.7.9 → 4.7.10, inside `ts-jest`'s `^4.7.9`, for GHSA-p8wg-vrv2-v86f,
  GHSA-8r5x-fm3f-whwj (both critical) and GHSA-xw65-4hp5-5hc7. The 25 left are `sprintf-js`'s,
  which has no patched version. `docs/backlog.md` F16, part 4.
- **eval-core's tests no longer print ts-jest's TS151001 advice** once per worker. It is silenced
  in `modules/eval-core/jest.config.ts`; the reason is in the comment there.
- **The README drift gates check every `@zvenigora/…` import**, 2026-10-03 — `docs/backlog.md`
  F11. Each project's gate resolved one README against its own specifier only, so a
  cross-package import line was checked by nothing. Each `export-list.spec.ts` now resolves
  every `@zvenigora/…` import in its project's READMEs against that specifier's own export list,
  through `tsconfig.base.json`'s paths, and fails one the workspace does not map. The
  `eval-signals` README's `EvalService`, printed as a comment because of this gap, is now an
  import line.
- **Every export is documented, or listed with a reason**, 2026-10-04 — `docs/backlog.md` F10.
  The drift gates checked only what a README imports, so an export documented any other way, or
  not at all, was watched by nothing. Each `export-list.spec.ts` now requires every export of its
  package to be named in a code span of that package's README, or to be in an allowlist in the
  spec with one of five reasons, and every allowlisted name to be still exported. `eval-core`
  allowlists 64 of its 76 exports, `eval-signals` 1 of 7, and `eval-forms` none of 15.
- **A missing release tag fails `npm test`**, 2026-10-04 — `docs/backlog.md` F8.
  `tools/release-tags.mjs`, beside `tools/doc-links.mjs` in the root `test` target, requires a
  `<project>@<version>` tag for every row of the register's Publication status table, at the
  commit the row names, and fails rather than skips in a checkout with no tags. CI's checkout now
  fetches them (`fetch-depth: 0`), and the three `project.json`s lose
  `fallbackCurrentVersionResolver: "disk"`, so `nx release version` no longer falls back to the
  manifest when a tag is missing.
- **Jest runs without worker processes**, 2026-10-04 — `docs/backlog.md` F7. `jest.preset.js`
  sets `maxWorkers: 1` for all three projects, so Jest runs each test file in band and starts no
  worker. The intermittent `A worker process has failed to exit gracefully` warning was
  `jest-worker` killing a worker that missed its fixed 500 ms exit window while `nx run-many` ran
  three projects' pools at once, each sized for the whole machine. The gate went from 41.5 s with
  the warning once to 19.3 s with none, on 20 cores.

### Changed
- **`SECURITY.md` rewritten to what the code does**, 2026-10-14. It covers the threat model; the
  protections that exist, each with its source and the spec that pins it (the prototype-pollution
  guard with its resolved-key re-check and primitive carve-out, call sandboxing, the iteration
  budget, the write policies); the documented limits, each measured; the advisories, unchanged; and
  reporting. Gone: the `SecurityOptions` interface, `secureEval`, `executeWithTimeout` and
  `safeExecuteFunction`, none of which existed, the "35/35 tests" count, and every claim of complete
  or comprehensive protection. A case in `modules/eval-core/src/public-api.spec.ts` now fails on any
  identifier the document names in code that the code does not have. Phase 10 step 2.
- **Each package now carries a copy of the root `LICENSE`** (`modules/*/LICENSE`), which
  ng-packagr includes by default, so the next release of each package ships it. Earlier releases
  declared `"license": "MIT"` in the manifest and shipped no file. ng-packagr refuses an asset
  outside the project root, so a copy is the only way short of a build script; keep the four
  files identical.
- **Dependency Security**: Bumped the transitive `fast-uri` dependency (pulled in by `ajv`,
  used by the lint/build tooling) from 3.1.5 to 3.1.7, resolving 4 high-severity Dependabot
  advisories — [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp),
  [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc),
  [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), and
  [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8). `ajv`'s own
  declared range (`^3.0.1`) already permitted the patched version, so only
  `package-lock.json` needed updating — no published package's runtime dependencies are
  affected.
