# Phase 4 — Step 1 Summary: Two entry points, the manifest, and a green build

**Date**: August 17, 2026
**Plan**: [`phase-4-plan.md`](./phase-4-plan.md) § 4, Step 1
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1)
**Commit**: `5e26f14`
**Status**: complete — `eval-forms` lint clean, 2 suites / 11 tests, `build:production`
clean with both entry points; `eval-core` unchanged at 41 suites / 717 tests,
`eval-signals` unchanged at 5 suites / 97 tests; root `npm run build` green

---

## 1. What was built

The mechanism, not the library. Two entry points wired end to end, the manifest corrected,
and the smallest real runtime symbol at each — enough that ng-packagr, Nx, Jest and
`@nx/dependency-checks` have all been made to agree before any adapter is written. Nothing
in `eval-core` or `eval-signals` was touched.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `package.json` | edit | the four peers of § 3.3.1; `@angular/common` dropped; metadata matching the other two manifests |
| `project.json`, `eslint.config.mjs` | edit | `prefix: "lib"` → `"zvenigora"`, selectors to match |
| `src/index.ts`, `src/public-api.ts` | edit / **new** | the primary barrel |
| `src/lib/field-context.ts` | **new** | `createFieldContext` — composition only |
| `src/lib/field-context.spec.ts` | **new** | 7 cases, incl. the `/reactive` subpath import |
| `reactive/ng-package.json` | **new** | the secondary entry point, against `ng-entrypoint.schema.json` |
| `reactive/src/public-api.ts` | **new** | the secondary barrel |
| `reactive/src/lib/control-source.ts` | **new** | `createControlSource` — final signature, snapshot behaviour |
| `reactive/src/lib/control-source.spec.ts` | **new** | 4 cases, incl. the primary-package import |
| `tsconfig.lib.json`, `tsconfig.spec.json` | edit | `include` widened for `reactive/`, and `exclude` too (finding 1.2.6's missing half) |
| `tsconfig.base.json` | edit | the `/reactive` subpath mapping |
| `README.md` | edit | minimal real content; the full one is step 6 |
| `phase-4-plan.md` | edit | § 3.4.2, § 3.4.3, step 1's exit criteria, § 6.1 |

Published surface added: `createFieldContext` (primary), `createControlSource`
(`/reactive`). Both `.d.ts` files were read after the build and contain exactly that —
nothing leaked across the entry-point boundary.

### Behaviour worth recording

- **`@nx/enforce-module-boundaries` exempts a self-import that crosses entry points.** It
  calls `belongsToDifferentEntryPoint`. A `src/lib/` spec importing
  `@zvenigora/ng-eval-forms` is an error; the same spec importing
  `@zvenigora/ng-eval-forms/reactive` is clean. So each entry point's `paths` mapping is
  provable — from the *other* entry point's spec folder. This was nearly recorded backwards;
  see § 3.
- **`@nx/dependency-checks` counts type-only imports.** All four peers are declared with
  `import type` and lint is clean. This matters for `/signals`, which will add more
  type-only upstream imports.
- **`@typescript-eslint/no-unused-vars` is a *warning* here, not an error**, so `nx lint`
  exits 0 either way — the repo's edit hook is what enforces zero warnings. And no
  `argsIgnorePattern` is configured anywhere in this workspace, so `_options` silences
  nothing. `void options;` in `control-source.ts` is load-bearing, not cosmetic.
- **`EvalService` rewraps thrown errors as `new Error(error.message)`**, so
  `SignalContextWriteError`'s class identity does not survive `simpleEval`. The message
  does. `eval-signals`' own spec splits the same way; this library now matches it.
- **Jest reaches `reactive/**` with no config change.** The Nx preset's `testMatch` is
  unanchored and its resolver reads the root `tsconfig` `paths`. `jest.config.ts` was on
  standby as a sanctioned deviation and was not needed.

---

## 2. Design questions settled during the step

- **The form half does not unwrap signals, and that is a limitation rather than a
  decision.** An earlier draft of § 3.4.2 written during this step claimed the asymmetry
  was *forced* by § 3.4.5's empty-`@angular/core` rule. It is not: the resolver can be
  borrowed from upstream rather than rewritten. § 3.4.2 now carries both candidates, the
  measured table that separates them, and the three conditions under which the shipped one
  could still win. Step 1 deliberately pins neither in a spec.
- **`undefined` fall-through is independent of that decision.** Both compositions were run
  over the same fixtures: a field key holding `undefined` *or* `signal(undefined)` falls
  through to the form value under both, and the fall-through is reactive under both. § 3.4.3
  gained the finding — including that its third assertion, written to separate the joined
  record from the two lookups, does **not** separate the fork that is now open, so step 2
  needs a fourth assertion on the form half.
- **The `hasOwnProperty` guard on the form half is unreachable by test.** `get` consults
  `original` before `lookups`, so an inherited name resolves there first. The guard ships
  on the argument with a comment saying so; writing a spec for it would have been vacuous.

---

## 3. Deviations from the plan's literal sketch

- **The subpath-import exit criterion was struck and then restored.** The same-entry-point
  form of the import does fail, exactly as the criterion's first attempt showed. That single
  red probe was over-generalised into "no in-repo spec can exercise either mapping", the
  criterion was struck, and a `dist/`-only proof put in its place. Three of the four
  combinations had not been tested; two were clean. Caught in review, reverted, and the
  criterion is met as originally written. The `dist/` check was kept **alongside** it — the
  spec proves the `paths` mapping, the `dist/` check proves the ng-packagr wiring.
- **No other deviation.** Every file in the commit is on step 1's edit/new list.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-forms:lint` | clean — **red at baseline** (2 × `@nx/dependency-checks`) |
| `eval-forms:test` | 2 suites / 11 tests |
| `eval-forms:build:production` | clean; `dist/modules/eval-forms/reactive/package.json` present, primary `exports["./reactive"]` names the same emitted pair — **red at baseline** |
| Root `npm run build` | green over 3 projects — the CI obligation of finding 1.2.1 |
| `eval-signals:lint` / `:test` | clean / 5 suites / 97 tests, unchanged |
| `eval-core:lint` / `:test` | clean / 41 suites / 717 tests, unchanged |
| Boundaries | narrowed probe below |

### Probes

Named, not counted — the convention `docs/signals/step-4-summary.md` adopted.

| Inversion | Cases that went red |
| :--- | :--- |
| Form-half lookup removed | `createFieldContext › should resolve a form key through the pushed lookup`; `› should resolve both halves within one expression`; `› should take its form half from the /reactive adapter`; `createControlSource › should feed the form half of a field context` |
| Field half wrapping `formSource` instead of `fieldSource` | `› should resolve a field key through the field half`; `› should resolve both halves within one expression`; `› should build a separate context per call`; and 2 more — **a different set**, which is what shows the two halves are genuinely distinguished rather than sharing a fixture |
| `createControlSource` returning `group.value` | `createControlSource › should include a disabled control`, alone — the only fixture where a disabled control makes the two implementations differ |
| `scope:forms` narrowed to `['scope:core']` | `A project tagged with "scope:forms" can only depend on libs tagged with "scope:core"` on `field-context.ts:2` **and** `control-source.ts:3` — the type-only import is caught too. Root config restored byte-identical (`git diff --quiet`) |

The narrowed probe was run without a reverse probe, per step 1's own warning: an
`eval-signals`-imports-forms file present at the same time reports a circular dependency
instead of the tag violation.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.4.2 gained the two candidates, a measured comparison table, and the three
  conditions B must meet to win.** Step 2 opens with a near-decision, not a fork. Row 2 of
  that table is the deciding one: under B a form key holding `signal(undefined)` resolves to
  the signal *function*, which is truthy, so `visible: "country"` renders a field visible
  precisely when its value is absent.
- **§ 3.4.3 gained the `undefined` × § 3.4.2 interaction**: the rule survives both
  candidates unchanged, the fall-through is reactive under both, and step 2 needs a fourth
  assertion because the third no longer discriminates. Plus a step-6 README note — a field
  has precedence *while its value is present*, not permanently.
- **Step 1's exit criteria gained the four-way boundary table** and the step-4 consequence:
  `bindFieldProperties` must import `createFieldContext` as `@zvenigora/ng-eval-forms`, not
  relatively, or ng-packagr duplicates the core into both FESM bundles.

### 5.2 Noticed, not fixed

- **`createControlSource`'s record shape is unsettled** and § 3.5 still owes the answer.
  Candidate A makes both shapes *safe*; it does not choose between them.
- **The `hasOwnProperty` guard is untestable from here** — § 2's ownership rule, § 3.4.3's
  third precedence layer. Recorded in code and in § 3.4.3 already.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing; carried from `docs/signals/step-4-summary.md` § 5.2 unchanged.

### 5.3 Still carried from earlier phases

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive`; `EvalService.simpleEval` never draining `_activeStates`; the arrow-scope
leak's escaped-closure path. All three are `eval-core` / `eval-signals` and § 2 forbids
fixing them from here. The `createSignalContext` liveness this library depends on is still
unpinned upstream — § 1.3's last row — and step 2 carries the characterization spec for it.
