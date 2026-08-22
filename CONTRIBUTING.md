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

Please follow the code style of the rest of the project.
This is enforced via ESLint, whose config is [here](.eslintrc.json).
You can run `npm run lint` before committing to ensure your code does not violate the code style,
or -- better -- install an ESLint plugin for your editor, to see issues inline as you edit code.

Here are the rules in the ESLint file with some commentary about what they are (since JSON does not allow comments):

| Rule | Code | What it does |
| ---- | ---- | ------------ |
| [semi](https://eslint.org/docs/rules/semi) | `"semi": 1` | Mandatory semicolons |
| [no-dupe-args](https://eslint.org/docs/rules/no-dupe-args) | `"no-dupe-args": 1` | no duplicate parameter names in function declarations or expressions |
| [no-dupe-keys](https://eslint.org/docs/rules/no-dupe-keys) | `"no-dupe-keys": 1` | no duplicate keys in object literals |
| [no-unreachable](https://eslint.org/docs/rules/no-unreachable) | `"no-unreachable": 1` | no unreachable code after `return`, `throw`, `continue`, and `break` statements. |
| [valid-typeof](https://eslint.org/docs/rules/valid-typeof) | `"valid-typeof": 1` | enforces comparing typeof expressions to valid string literals |
| [curly](https://eslint.org/docs/rules/curly) | `"curly": 1` | No block statements without curly braces |
| [no-useless-call](https://eslint.org/docs/rules/no-useless-call) | `"no-useless-call": 1` | No useless `function.call()` or `.apply()` when it can be replaced with a regular function call |
| [brace-style](https://eslint.org/docs/rules/brace-style) | `"brace-style": [1,"stroustrup"]` | Stroustrup variant of _one true brace style_: `{` on the same line, `}` on its own line, `else`/`catch`/`finally` on separate lines |
| [no-mixed-spaces-and-tabs](https://eslint.org/docs/rules/no-mixed-spaces-and-tabs) | `"no-mixed-spaces-and-tabs": [1,"smart-tabs"]` | Tabs for indentation, spaces for alignment, no mixed spaces and tabs otherwise |
| [spaced-comment](https://eslint.org/docs/rules/spaced-comment) | `"spaced-comment": [1,"always",{"block":{"exceptions":["*"]}}]` | Mandatory space after `//` and `/*` |
| [arrow-spacing](https://eslint.org/docs/rules/arrow-spacing) | `"arrow-spacing": 1` | Spacing around `=>` |
| [comma-spacing](https://eslint.org/docs/rules/comma-spacing) | `"comma-spacing": 1` | Enforce spacing after comma, and not before |
| [keyword-spacing](https://eslint.org/docs/rules/keyword-spacing) | `"keyword-spacing": 1` | Spacing around keywords |

<!--
Table rows generated via running this in the console:
let r = {...}; // rules
let o = []; for (let i in r) {
    o.push(`| [${i}](https://eslint.org/docs/rules/${i}) | \`"${i}": ${JSON.stringify(r[i])}\` |  |`)
}; copy(o.join("\n"));
-->

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

`<type>` Must be `build | ci | docs | feat | fix | perf | refactor | test`
This field is used to control the semantic versioning of the release following a merge of the commit

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
   add the matching entry to the root `CHANGELOG.md`, naming which package the entry is for
   — there is one changelog for all three, while versions are per package.
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
4. Tag the release and push the tag. The format is `{projectName}@{version}` over the **Nx
   project name**, matching `release.releaseTag.pattern` in `nx.json`. Tag only the packages
   this release actually publishes:

   ```bash
   git tag -a "eval-core@0.3.1" -m "eval-core 0.3.1" <commit>
   git push origin "eval-core@0.3.1"
   ```

   The commit must be the one the published artifact was built from, since `eval-signals` and
   `eval-forms` resolve their next version from these tags.

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

Versioning and tagging through `nx release` now resolve correctly — each project reads its
own `{projectName}@{version}` tag. **Publishing through it does not, for `eval-core`.**

`modules/eval-signals/project.json` and `modules/eval-forms/project.json` each carry a
`release.version` block (`currentVersionResolver: "git-tag"`,
`manifestRootsToUpdate: ["dist/{projectRoot}"]`) and an `nx-release-publish` target with
`packageRoot: "dist/{projectRoot}"`. `modules/eval-core/project.json` carries neither, so it
falls back to the project root for both. Concretely:

- it resolves its current version from `modules/eval-core/package.json` rather than from the
  `eval-core@0.3.0` tag, which is therefore ignored;
- it writes a bumped version into that **tracked source** manifest, while the other two write
  into their gitignored `dist/` manifests;
- it would publish from `modules/eval-core`, which holds source and no build output.

The right version comes out today only because the source manifest happens to be accurate.
Until `eval-core` gains the same two blocks, publish by hand from `dist/` as above.
