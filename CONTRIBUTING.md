# Contributing Guide

## Prerequisites

This project requires **npm >= 11**. Node 24 and 26 ship npm 11 and 12 respectively and work out of the box.

Node 22 is supported at runtime but bundles npm 10, which cannot read the lockfile. If you are using Node 22, upgrade npm first:

```bash
npm i -g npm@11
```

Without this upgrade, `npm ci` fails with `EUSAGE`, reporting three packages as missing from
the lock file:

```
npm error code EUSAGE
npm error
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error
npm error Missing: @types/node@26.2.0 from lock file
npm error Missing: yaml@2.9.0 from lock file
npm error Missing: undici-types@8.3.0 from lock file
```

The lock file is **not** out of sync — `lockfileVersion: 3` records those three in a form
npm 10 does not resolve, and npm 11 installs from the same file without complaint. Running
`npm install` as the message advises would rewrite the lock file to work around a client that
is simply too old, so upgrade npm instead.

npm 10 also prints an `EBADENGINE` warning about the `engines` field just above this. That is
only a warning and not the failure; the `EUSAGE` error is.

## Set Up

Run `npm install`


## Code style

Please follow the code style of the surrounding code. Linting is ESLint flat config:
[`eslint.config.mjs`](eslint.config.mjs) at the root, and one per module that extends it —
[`modules/eval-core/eslint.config.mjs`](modules/eval-core/eslint.config.mjs),
[`modules/eval-signals/eslint.config.mjs`](modules/eval-signals/eslint.config.mjs) and
[`modules/eval-forms/eslint.config.mjs`](modules/eval-forms/eslint.config.mjs). Most rules come
from the `@nx` flat presets (`flat/base`, `flat/typescript` and `flat/javascript` at the root,
`flat/angular` and `flat/angular-template` in each module) rather than being chosen here. What
the configs add is `@nx/enforce-module-boundaries`, which uses the `scope:core` /
`scope:signals` / `scope:forms` project tags so that `eval-core` depends on neither downstream
library and `eval-signals` does not depend on `eval-forms`; the `zvenigora` prefix for component
and directive selectors; and `@nx/dependency-checks` over each module's `package.json`. Read the
config files for the exact rule set, and run `npm run lint` before committing — it lints all
three projects.

## Commit Messages

Commit messages MUST be in the [angular commit-message format](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format)
Which can be summarized as:
```
<type>(<scope>): <short summary>
<BLANK LINE>
<body, explaining motivation for the change>
<BLANK LINE>
<footer, optional>
```

`<type>` Must be `build | chore | ci | docs | feat | fix | perf | refactor | test`

`chore` is for changes that ship to no consumer — repository tooling such as the agent and skill definitions under `.claude/`.

Nothing parses this field. Versions are bumped by hand (see Releasing below), so the type is a convention for whoever reads the log rather than a release trigger.

## Releasing

**Publishing is manual, from `dist/`** — see "Why publishing is still manual" below before
reaching for `nx release publish`. Versions are **independent per package**, not one shared
number.

All three packages publish to the public npm registry under the `@zvenigora` scope:

| Package | Source | Built to |
| ------- | ------ | -------- |
| `@zvenigora/ng-eval-core` | `modules/eval-core` | `dist/modules/eval-core` |
| `@zvenigora/ng-eval-signals` | `modules/eval-signals` | `dist/modules/eval-signals` |
| `@zvenigora/ng-eval-forms` | `modules/eval-forms` | `dist/modules/eval-forms` |

### Procedure

1. Bump the `version` field in the package's own `modules/<name>/package.json` by hand, and
   add the matching entry to that package's own `modules/<name>/CHANGELOG.md`, moving its
   `[Unreleased]` items under the new version's heading. Each package has its own changelog,
   as it has its own version. The root `CHANGELOG.md` only lists the three, and records
   workspace changes that ship in no package.
2. Run the full gate — `npm run lint`, `npm test`, `npm run build`. Publishing an unbuilt or
   stale `dist/` is the failure this ordering exists to prevent, and a green `npm test` is
   **not** a type-check: only `build` runs `tsconfig.lib`.
3. Publish from the built directory, never from `modules/`:

   ```bash
   npm publish dist/modules/eval-core
   npm publish dist/modules/eval-signals
   npm publish dist/modules/eval-forms
   ```

   No `--registry` or `--access` flag should be needed. If either is, treat it as a
   configuration bug and fix the configuration rather than passing the flag — see below.
4. Confirm the registry lists the version you just published, before tagging it:

   ```bash
   npm view @zvenigora/ng-eval-core versions
   ```

   A changelog heading does not prove a publish. Five `eval-core` versions were
   changelogged and never published, and nothing caught it until the changelog was checked
   against this list ([F2](docs/backlog-retired.md#f2)). If the version is missing, do not tag it.
5. Tag the release and push the tag. The format is `{projectName}@{version}` over the **Nx
   project name**, matching `release.releaseTag.pattern` in `nx.json`. Tag only the packages
   this release actually publishes:

   ```bash
   git tag -a "eval-core@0.3.1" -m "eval-core 0.3.1" <commit>
   git push origin "eval-core@0.3.1"
   ```

   The commit must be the one the published artifact was built from, since `eval-signals` and
   `eval-forms` resolve their next version from these tags.
6. Record the release in a docs-only commit: a row per published package in
   `docs/backlog.md`'s Publication status, and one row for the release in its Register history,
   counted as that section describes. Dates in the Publication status rows, the Register history
   and the CHANGELOG headings are npm's publish date in UTC; if it differs from the heading
   written at release time, the post-publish commit corrects the heading.

### Why no flags are needed

Two things were previously supplied on the command line and are now configuration:

- **Registry.** The repo `.npmrc` used to redirect the whole `@zvenigora` scope to GitHub
  Packages (`@zvenigora:registry=https://npm.pkg.github.com/` plus a `${GITHUB_TOKEN}` auth
  line). Nothing in `.github/workflows/` published there, so those two lines were removed;
  `.npmrc` now names the public npm registry only. While they were present, any
  `@zvenigora/*` resolution — publish or install — went to GitHub Packages and failed `401`
  without a token.
- **Access.** A *scoped* package defaults to `restricted` on its **first** publish, which is
  why both new packages needed `--access public`. `modules/eval-signals/package.json` and
  `modules/eval-forms/package.json` now carry `"publishConfig": { "access": "public" }`, and
  ng-packagr copies it verbatim into the built manifest. `eval-core` does not need it — it
  has been public since `0.1.102`, its earliest version on the registry, and access is sticky
  once set, so its `0.3.0` publish needed no flag. `npm access get status @zvenigora/<name>`
  reports `public` for all three.

### Versioning is independent, per package

`nx.json` sets `release.projectsRelationship: "independent"` and
`release.releaseTag.pattern: "{projectName}@{version}"`. The three packages version and tag
separately, which is what their versions already require — `0.3.0`, `0.1.0`, `0.1.0` are not
one number, and the **fixed** default this workspace used to inherit could not express them.
It resolved a single version for the whole group, proposed a `patch` that *downgraded*
`eval-core` from `0.3.0` to `0.2.4`, and then aborted on a `preserveMatchingDependencyRanges`
error against `eval-signals`' `^0.3.0` peer range.

Two details worth knowing before editing that config:

- `{projectName}` interpolates the **Nx project name**, not the npm name — tags read
  `eval-core@0.3.0`, not `@zvenigora/ng-eval-core@0.3.0`.
- Nx 22 moved `releaseTagPattern` into a nested `releaseTag.pattern`. The flat key is
  rejected in Nx 23, so use the nested form.

The pre-`0.3.0` tags `v0.1.0`, `v0.2.2` and `v0.2.3` predate this and are left alone; they
are whole-repo tags in a scheme no longer in use.

### Why publishing is still manual

All three projects are now configured the same way. Each `modules/*/project.json` carries a
`release.version` block (`currentVersionResolver: "git-tag"`,
`fallbackCurrentVersionResolver: "disk"`, `manifestRootsToUpdate: ["dist/{projectRoot}"]`)
and an `nx-release-publish` target with `packageRoot: "dist/{projectRoot}"`, so every project
resolves its version from its own tag and both versions and publishes point at `dist/`.

`eval-core` was the exception until recently, and the shape of that bug is worth keeping in
mind if these blocks are ever edited: with no `release` block it resolved from its **source**
manifest and ignored its tag, wrote bumps into a tracked file rather than `dist/`, and would
have published `modules/eval-core` — a directory holding source and no build output.

What remains unadopted is the **full `nx release` flow**, not any single piece of it. That
command bundles versioning, changelog generation, a release commit, tagging and publishing
into one run. The changelogs are no longer in its way: since 2026-09-28 each package keeps
its own `modules/<name>/CHANGELOG.md`, the per-project layout `nx release changelog`
maintains ([F2](docs/backlog-retired.md#f2)). They are still written by hand, and adopting the flow
would mean reconciling its generated entries with them. What is not settled is the flow
itself: no release has yet been cut through it end to end. The manual procedure above is the
one that has actually been exercised, so it stays the documented path until that changes.
