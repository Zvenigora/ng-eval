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

### Added
- **The standing rules, in one place**, 2026-10-27. `docs/standing-rules.md` holds the process and
  verification rules for all three libraries as SR1–SR38, each with its origin and what goes red when
  it is broken, and a table resolving the older plans' rule numbers. `CLAUDE.md` imports it, and
  `CLAUDE.md`, the `step` skill, the `code-reviewer`, `CONTRIBUTING.md` and `docs/README.md` cite it
  in place of their copies, which had drifted. `docs/backlog.md` F27.
- **`tools/release-tags.mjs` fails on a lightweight release tag**, 2026-10-26. Every
  `eval-core@`, `eval-signals@` and `eval-forms@` tag, whether a Publication status row names it or
  not, must be annotated: a lightweight one fails, named once, and the message gives the
  `git tag -a` form. The `v*` tags from before the `<project>@<version>` names are lightweight and are
  not checked. The summary line says `all annotated`. `docs/backlog.md` F26.
- **`tools/doc-links.mjs` checks the index, untracked documents and published links**, 2026-10-23.
  It scans untracked files git does not ignore and names them, resolves absolute links into the
  repository's tree at `master`, resolves every link a published README prints, listed in the new
  `tools/published-links.txt`, and fails on a file under `docs/` that `docs/README.md` does not link.
  A published link binds its target: a moved file leaves a stub, and a retired backlog entry's
  anchor stays on its index row. `docs/backlog.md` F25.
- **`docs/README.md`, the maintainers' index**, 2026-10-21. It links every document under `docs/`:
  the backlog register, the plan in flight, each completed phase's plan with its summaries and what
  it is the reference for, the completed tracks, the gates and what each checks, and the two worked
  examples, marked as consumer documents. `CONTRIBUTING.md` points to it before its first section.
  Nothing under `docs/` moved. Whether a gate keeps the index complete is `docs/backlog.md` F25.
  Phase 10 step 6.

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
- **`CODE_OF_CONDUCT.md` names this project's maintainer**, 2026-10-22. Its enforcement contact was
  an email address of the upstream `jse-eval` author, carried over with the file. Reports now go to
  the maintainer's GitHub account, [@Zvenigora](https://github.com/Zvenigora), or, when they must
  stay private, through GitHub's abuse reporting, which reaches GitHub's Trust & Safety team rather
  than this project. No email address is published. `docs/backlog.md` F20.
- **`eval-signals`' and `eval-forms`' export-list gates check both directions**, 2026-10-22. Each
  copy of `export-list.spec.ts` now fails on an allowlist entry its package README names in a code
  span, as `eval-core`'s has since F22, so an entry can no longer excuse a name the README documents
  and mask the deletion of its mention. `docs/backlog.md` F24.
- **Dependency security, 2026-09-30**: `npm audit` 22 → 0. Angular 22.2.1 (framework) / 22.2.0
  (CLI and devkit), `jest-preset-angular` 17.0.1, `axios` and a higher `brace-expansion` floor
  under `overrides.nx`, in-range updates of `brace-expansion`, `undici` and `fast-uri`, and the
  unused `verdaccio` removed. `ng-packagr` stays at 22.1.1 so the published `.d.ts` files do not
  change. `docs/backlog.md` F16.
- **Dependency security, 2026-10-10**: `npm audit` 26 → 25, clearing the one critical.
  `handlebars` 4.7.9 → 4.7.10, inside `ts-jest`'s `^4.7.9`, for GHSA-p8wg-vrv2-v86f,
  GHSA-8r5x-fm3f-whwj (both critical) and GHSA-xw65-4hp5-5hc7. The 25 left are `sprintf-js`'s,
  which has no patched version. `docs/backlog.md` F16, part 4.
- **Dependency security, 2026-10-23**: `npm audit` 11 → 0, all high. Angular 22.2.3 (framework) /
  22.2.4 (CLI and devkit) for `@modelcontextprotocol/server` 2.3.1, and `nx` 23.3.0 for
  `follow-redirects` 1.16.1, with `axios` gone from the tree. `overrides.nx` loses `brace-expansion`,
  `smol-toml` and `axios`, which `nx` 23.3.0 no longer needs, and gains `undici` `^7.29.1`, since
  23.3.0 pins `undici` 7.29.0; it is nested under `nx` so that `jsdom`'s `undici` 8 is untouched.
  `sprintf-js` was no longer reported before the change. No `.d.ts` changed. `docs/backlog.md` F21,
  and F16 part 2.
- **Dependency security, 2026-10-26**: `npm audit` 2 → 0, one high and one moderate, from seven
  advisories. `undici` 8.11.2 → 8.12.3, inside `jsdom`'s `^8.9.0`, for GHSA-xjj6-f33q-929c (high),
  GHSA-4qv8-2p9j-2685 and GHSA-f72v-6w45-q472; `fast-uri` 3.1.8 → 3.1.9, inside `ajv`'s `^3.0.1`, for
  GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr, GHSA-xhq7-xmqj-769h and GHSA-333x-w4r6-6crp. Both are
  dev-only. `overrides.nx.undici`'s floor rises from `^7.29.1` to `^7.30.1`, since all three `undici`
  advisories cover 7.x below 7.30.1; `nx`'s `undici` was already 7.30.1 and stays there, so the
  lockfile changes in the two updated entries alone. Dependabot showed five of the seven as open
  alerts; it had auto-dismissed the two `undici` moderates. `docs/backlog.md` F16.
- **Dependency security, 2026-10-29**: `overrides.qs`'s floor rises from `^6.14.1` to `^6.14.2`, so
  it excludes GHSA-w7fw-mjwx-w883, which covers `qs` up to 6.14.1. The lockfile already resolved
  6.16.1 and did not change: a lockfile-only install and a clean `npm ci` left it byte-identical, and
  audit reports nothing for `qs`. `deepmerge` 4.3.1, under `jest-config`, is recorded, not fixed:
  GHSA-gcqx-w48m-w2h4 covers every release from 4.2.0, 4.3.1 is the latest, and it is dev-only.
  `npm audit` stays at 11 low, all from it. `docs/backlog.md` F16.
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
- **`ROADMAP.md` condensed**, 2026-10-21. The phases are one table, in the order they ran, each row
  with its subject, the packages it shipped in, its plan and its retrospect. Versions from Phase 2's
  release on are in the register's Publication status table, which the file links; the four earlier
  phases' releases are each package CHANGELOG's "Phase N of the roadmap" entry. The "Suggested order"
  list, every item of which was done or is reserved in the section kept below it, is dropped. The header, "Modules vs. new repositories", the reserved
  Phases 7 and 8 and "Deferred work" are unchanged. Each phase's former section is in the file at
  b1a9863. Phase 10 step 6.
- **The repository README is a landing page**, 2026-10-21, with no `javascript` block and no quoted
  peer range. It says what ng-eval is and that it is not a sandbox, then links the three package
  READMEs and CHANGELOGs, install, the two worked examples, `SECURITY.md` and its advisories, this
  file, credits, related packages, contributing, the code of conduct and the license. The API
  documentation it held is in `modules/eval-core/README.md` since Phase 10 step 3, and each
  package's peer ranges are in its own README, checked against its manifest. Gone with the old
  page: the "Recent Major Improvements (2025)" banner and the "2025 Update" security list, whose
  claims of complete and comprehensive protection the code does not make good. A case in
  `modules/eval-core/src/public-api.spec.ts` fails on any fence in the README but `sh`, a fence in
  a blockquote or a list item included, and on a static or dynamic import or a `require` of
  `@zvenigora/`. Phase 10 step 5.
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
