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

### Fixed
- **Dependency security, 2026-09-30**: `npm audit` 22 → 0. Angular 22.2.1 (framework) / 22.2.0
  (CLI and devkit), `jest-preset-angular` 17.0.1, `axios` and a higher `brace-expansion` floor
  under `overrides.nx`, in-range updates of `brace-expansion`, `undici` and `fast-uri`, and the
  unused `verdaccio` removed. `ng-packagr` stays at 22.1.1 so the published `.d.ts` files do not
  change. `docs/backlog.md` F16.
- **eval-core's tests no longer print ts-jest's TS151001 advice** once per worker. It is silenced
  in `modules/eval-core/jest.config.ts`; the reason is in the comment there.

### Changed
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
