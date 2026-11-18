# Phase 19 Plan — the demo application, first version

**Status: Revision 2, steps 1 to 6 done; step 7 is next.** The design is
[`design-session.md`](design-session.md), one session and questions Q1 to Q23. This plan does not
restate it: it cites a decision by its Q number, and adds what a plan needs: measurements, scope,
steps, exit criteria, and what goes red.

A statement here about how the build, the libraries' source or Jest behaves is a row of
[§ 1.3](#13-mechanism-questions-measured), run on a prototype pinned in the ignored `tmp/` folder,
or it says it is a prediction. Step 1 checked the prototype's hash and ran six of the rows again;
its Outcome, in [§ 4](#step-1--this-plan-its-records-and-the-measurements), has each result.

**No question is open.** [§ 8](#8-questions) held seven readings Revision 1 made by its rule P-1,
on points the measurements raised after the session had ended. The maintainer decided all seven
on 2026-11-15, each as Revision 1 read it, and [§ 2](#2-decisions--recorded-not-reopened) holds
the decisions. Two of them amend an answer of the session, Q11 and Q20, and the design record
says so at each. An eighth, P8, the builder's version, was decided on 2026-11-16, at step 2.

**Revision 2** wrote the decisions in. It changed no measurement, no step and no exit criterion.

This phase ships **in no package**. It adds one Nx application, `apps/demo`, and a site on GitHub
Pages.

## 0. Rules the plan adds

- **P-1 — A reading is marked, and waits.** Where a measurement raised a question the session did
  not ask, this plan states its reading, marks it in [§ 8](#8-questions), and no step runs on it
  until the maintainer has decided it.
- **D-1 — The demo's process** (Q18). For a file under `apps/demo`, these apply: the gate
  ([SR8](../standing-rules.md#sr8)), commits only when asked ([SR34](../standing-rules.md#sr34)),
  Edit and Write ([SR36](../standing-rules.md#sr36)), and no `eslint-disable`. These do not: the
  `code-reviewer` before a commit ([SR33](../standing-rules.md#sr33)), a probe for each check
  ([SR15](../standing-rules.md#sr15)), and the claim-to-witness table
  ([SR21](../standing-rules.md#sr21)). In exchange, a page states only what its example does and
  links the README section that holds the contract; it states no limit and no guarantee. A step
  that changes a file outside `apps/demo` follows the standing rules for that file. *Red*: nothing
  — held by review. The retrospect weighs it for promotion.
- **D-2 — A build read as a measurement starts from a deleted cache.** The application builder
  keeps `.angular/cache`, and after a `tsconfig` change it printed the previous run's errors
  ([§ 1.3](#13-mechanism-questions-measured), M4). Delete `.angular` before a build whose result
  is cited. *Red*: nothing — held by review.

## 1. Current state

### 1.1 What exists today

- Three published libraries under `modules/`, and no application. The root manifest lists no
  application builder, and none is installed (M1). This is the state the plan was written from:
  step 2 added the application and the builder.
- `nx.json` has generator defaults for an Angular application. `tsconfig.base.json` has path
  aliases for all five entry points. Lint boundaries are by `scope:` tag.
- CI runs `npm run build` and `npm test`, both `nx run-many` with no project filter, so a new
  project joins both, and the gate.
- The repository is public and GitHub Pages is not enabled for it.

### 1.2 Findings that shape the plan

1. **`eval-core`'s source does not compile under `isolatedModules`.** Its barrels re-export
   26 types without `export type` (M2). `eval-signals` and `eval-forms` set the option and never
   meet this, because their builds read `eval-core`'s built declarations. An application that
   compiles the source does meet it. A new Angular application sets the option by default, so the
   demo turns it off (M3), and the barrels get a register entry ([§ 8](#8-questions) P4).
2. **The three factories compile where a required input cannot be read.** `createEvalSignal`,
   `bindFieldProperties` and `createExpressionRules` are called from a field initializer, as their
   READMEs show them, and they compile the expression there. A signal input has no value yet at
   that point. So an example cannot take its expression as an input and still look like the
   README's code. It can take it by `inject()`, and the page recreates the example when the
   visitor edits (M9, M12; [§ 8](#8-questions) P1).
3. **A component file's text can be shown two ways, and one needs a suppressed error.** The
   builder copies the file as an asset, byte for byte (M6). It also inlines it through an import
   attribute, but TypeScript rejects that import of a `.ts` file, so it needs `@ts-expect-error`
   (M7), and Jest was not tried on it. The asset copy needs neither
   ([§ 8](#8-questions) P2).
4. **The libraries run without zone.js.** The libraries' own specs run under Jest's zone
   environment. Four prototype cases, one per group, pass under the zoneless one (M9), which is
   what an Angular 22 application is by default ([§ 8](#8-questions) P5).
5. **An untagged project may not import the libraries.** Lint refuses it (M10), so the demo needs
   its own tag and a constraint in the root lint configuration.
6. **`eval-forms` has no `required` property, and `/reactive` has no `disabled`.** The session's
   questions named both. The pages show `visible` and `text` at both adapters and `disabled` at
   `/signals`, and the design record carries the correction.

### 1.3 Mechanism questions, measured

The prototype is `tmp/demo-proto`: 20 files, not counting `node_modules`, `dist`, the cache, the
lockfile and the logs. Its hash is
`3eef781b1949cceb953dec5c5a132a9b26542549f2357aa7e04b9d27414d4c3a`: the SHA-256 of the files'
`sha256sum -b` lines, sorted by path, as this command prints it from Git Bash in the prototype's
folder:

```sh
find . -type f -not -path './node_modules/*' -not -path './dist/*' -not -path './.angular/*' -not -name 'package-lock.json' -not -name '*.log' -print0 | LC_ALL=C sort -z | xargs -0 sha256sum -b | sha256sum
```

The command separates the paths by a null byte, so it covers a path that holds a space. The count
of files the `find` lists, 20, is still read beside the hash. Step 1 ran the command without
`-print0`, `-z` and `-0`: `xargs` then splits a path at a space, `sha256sum` fails on each half,
and the hash printed is the other files'. It found a twenty-first file that way, a zip in a folder
named with a space, which was not the prototype's; it was moved out before the measurements ran.
Over the 20 files the two commands print the same hash, and step 2 ran this one.

`tmp/` is ignored by git, so the prototype is outside the tracked tree but inside the working
folder, and step 1 left it there. It installed `@angular/build` 22.2.4
with `--legacy-peer-deps`, so that the compiler and TypeScript resolved to the workspace's own
copies, and ran the builder through the Angular CLI, not through Nx.

| # | Question | Result |
| :--- | :--- | :--- |
| M1 | Is an application builder installed? | No. `@angular/build` and `@angular-devkit/build-angular` are absent. `@angular/build` 22.2.4 exists, and its required peers are ones the workspace has |
| M2 | Does the libraries' source compile under an application's default options? | No, under `isolatedModules: true`: 26 errors, all `TS1205`, all in `eval-core`'s barrels. None in the other two |
| M3 | And with `isolatedModules: false`? | Yes. The production build is green, and `tsc --noEmit` prints nothing, with the libraries' other strict options on and the base `lib` |
| M4 | Is a build after a `tsconfig` change trustworthy? | Not from a warm cache: the 26 errors were printed again until `.angular` was deleted |
| M5 | What does the build emit for Pages? | `dist/browser/`. Its `index.html` holds `<base href="/ng-eval/">`; script, style and chunk references are relative; the lazy route is `import("./chunk-….js")` |
| M6 | Is a copied example file the file that ran? | Yes, for all four: each `source/*.example.ts` has the SHA-256 of its source. Revision 1 compared one, `core-eval.example.ts`, and step 1 the four |
| M7 | Does `with { loader: 'text' }` work on a `.ts` file? | In a development build, yes: the text is inlined and the component still compiles. TypeScript needs `@ts-expect-error` on the import. Not tried under Jest |
| M8 | What does a highlighter cost? | Baseline 510.91 kB raw, 130.86 kB estimated transfer. highlight.js, core with three languages: +31.81 kB, +10.70 kB. Prism with two: +21.58 kB, +7.05 kB, with three "not ESM" warnings and no types of its own. The pinned tree holds the highlight.js state only, so that is the arm step 1 built again: 542.72 kB raw, 141.56 kB transfer. The baseline's figures are read from `build3.log`, SHA-256 `0f5c9c7336b07b5ad827377ade716c9ddac0808506bae4ffee5ba59c01a3ea12`, and Prism's, 532.49 kB and 137.91 kB, from `build6.log`, SHA-256 `374e8542b0866c39b052d31e61f6bf7d85ac2f406a5cd54f3bf1835181ec91b8`. The prototype's hash does not cover the logs |
| M9 | Do the libraries work without zone.js? | Four Jest cases pass under the zoneless environment, one per group. Each asserts a value, changes a source, and asserts the new value |
| M10 | May an untagged project import a library? | No: "A project without tags matching at least one constraint cannot depend on any libraries", on each of the four example files |
| M11 | Does the builder need an install script? | No. Four were blocked (`@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract`), and the build and the tests were green |
| M12 | Can an example read its expression by `inject()` in a field initializer? | Yes, at all three factories: M9's cases construct them so |

**Not measured, so predictions**, each an exit criterion of the step that first relies on it:

- Nx running the builder as the `demo` project's target. Nx does not see a project under `tmp/`.
  **Measured by step 2**: its criteria 1 and 4.
- The builder installed in the root without `--force`, and a clean `npm ci` after it. **Measured
  by step 2**: its criterion 2, at 22.2.5 (P8).
- The lint constraint for the demo's tag, in both directions. **Measured by step 2**: its
  criterion 5 and two probes. The constraint is what lets the demo import the libraries. An import
  of the demo from a library is refused by the rule's other checks, and no probe reached a tag.
- The site in a browser, at any address. Step 2's criterion 6 saw the shell at the dev server's
  address; the Pages address is step 8's.
- Recreating an example on each edit, and what a parse error does to the page. **Measured by
  step 3**: the block's two cases.
- The versions and the commit in the footer.
- The Pages workflow, and CI on Ubuntu.

## 2. Decisions — recorded, not reopened

The session's 23 answers, by Q number, are in [`design-session.md`](design-session.md). Seven
more were decided on 2026-11-15, from [§ 8](#8-questions):

- **P1.** An example reads what the visitor typed by `inject()`, and the page creates it again on
  an edit. This amends Q20, which said inputs.
- **P2.** The page fetches the example's file, which the build copied, and does not inline it.
  This amends Q11, which said imported as raw text.
- **P3.** The highlighter is highlight.js.
- **P4.** The demo sets `isolatedModules: false`. `eval-core`'s 26 re-exports get a register
  entry, not scheduled.
- **P5.** The demo runs without zone.js.
- **P6.** The first deploy is step 8 of this plan.
- **P7.** The project's files are written by hand, not by the Nx generator.

One more was decided on 2026-11-16, at step 2:

- **P8.** The builder is `@angular/build` 22.2.5 exactly, not the 22.2.4 the prototype measured.

## 3. Design of the first version

### 3.1 In scope

The shell, the live-example block, the free-form page, twelve feature pages, three use cases, the
look, the footer, and the Pages workflow with its first deploy (Q10, Q14, Q15).

### 3.2 The project

- `apps/demo`, project `demo`, tag `scope:demo`, written by hand
  ([§ 8](#8-questions) P7). Targets: `build` with `@angular/build:application`, `serve` with
  `@angular/build:dev-server`, and the inferred `lint` and `test`.
- Its `tsconfig.json` carries the libraries' strict options with `isolatedModules: false` (M3).
- The root `eslint.config.mjs` gains one constraint: `scope:demo` may depend on `scope:core`,
  `scope:signals` and `scope:forms`. No constraint names `scope:demo` as a permitted dependency.
- Jest runs under `setupZonelessTestEnv`, and the application provides no zone (P5).
- Its Jest settings are `eval-core`'s: `tsconfig.spec.json` with `module: preserve` and
  `moduleResolution: bundler`, and `jest.config.ts` with `diagnostics: { ignoreCodes: [151001] }`.
  With `isolatedModules: false` (P4), ts-jest type-checks the demo's specs, as it does
  `eval-core`'s and no other library's, so the demo takes the settings of the one library that
  type-checks in Jest. The prototype's `commonjs` with `bundler` ran M9 green, and nothing measured
  it red. `eval-signals`' and `eval-forms`' `commonjs` with `node10` is the one measured red: under
  it `@angular/core/testing` does not resolve (`TS2307`), which those two never see, because
  `isolatedModules: true` turns the check off.
- The build's `baseHref` is `/ng-eval/`, and routing uses `withHashLocation()` (Q17, M5).
- The root `devDependencies` gain `@angular/build` at 22.2.5 exactly (P8), in step 2, and the
  highlighter in step 3. No manifest under `modules/` changes (Q4).

### 3.3 An example, and the block around it

- **An example is one file, `<name>.example.ts`**, a standalone component. It reads what the
  visitor typed by `inject(EXPRESSION)` or `inject(DATA)`, in a field initializer, and otherwise
  is the README's code (P1).
- **The block** holds the editable boxes, creates the example with an injector that provides the
  current values, and creates it again when a value changes. A value the example cannot be
  constructed from, such as an expression that does not parse, shows the error's message in place
  of the example, and the page stays alive (Q22).
- **The source view** fetches the example's file from `source/`, where the build copied it, and
  shows it highlighted, with a copy button (P2, P3, Q12).
- **The registry** lists every example: its component, its file name, its default values, and the
  README section it links. The routes and the navigation are built from it.

### 3.4 What keeps it honest

Under D-1 these are the only checks the demo adds, and each is a Jest case:

| Check | Red when |
| :--- | :--- |
| A smoke case per example: a value, a change, the new value | An example stops working |
| Registry coverage: every `*.example.ts` on disk is in the registry | An example file is added without an entry, so without a page |
| README links: each registry entry's section is a heading of its README | A README heading is renamed and a page's link dies |
| The block: an edit recreates the example; a parse error shows its message | The block breaks every page at once |

The README-link case reads the README files from disk. doc-links does not see a link inside a
template or a string.

### 3.5 Out of scope, and where it goes

A maintainer workbench and a benchmark page (Q2), an expression in the address (Q13), a security
page (Q22), a code editor in place of the textarea (Q12), clean addresses (Q17), a guide section's
content (Q6), and the pages Q14 left for later. None is a defect, so none gets a register entry;
the design record holds them.

## 4. Work breakdown

One step per session and per commit ([SR2](../standing-rules.md#sr2),
[SR34](../standing-rules.md#sr34)), and the gate after each ([SR8](../standing-rules.md#sr8)). The
three libraries' test counts do not move in any step ([SR10](../standing-rules.md#sr10)); step 1
reads the baseline from the gate. The demo's count is recorded in each step's Outcome. No file
under `modules/` is in any step's list: one changing is a stop ([SR3](../standing-rules.md#sr3)).
Every step's list also holds this document.

| Step | Subject | Files | Demo cases added |
| :--- | :--- | :--- | :--- |
| 1 | This plan, its records, and the measurements | `docs/demo/`, `docs/README.md`, `ROADMAP.md`, `CLAUDE.md`, `docs/backlog.md`, `docs/backlog-history.md`, the `step` skill | — |
| 2 | The project, empty and green | `apps/demo/` (new), the root `package.json`, `package-lock.json`, `eslint.config.mjs`, `CLAUDE.md`, `CONTRIBUTING.md`, the root `CHANGELOG.md`, `docs/README.md` | 1 |
| 3 | The block, the registry and the free-form page | `apps/demo/`, the root `package.json`, `package-lock.json`, `CLAUDE.md`, `docs/README.md` | The block's, the two registry cases, 1 smoke |
| 4 | Feature pages: core and signals | `apps/demo/`, `CLAUDE.md`, `docs/README.md` | 6 smoke, 1 nav |
| 5 | Feature pages: forms, both adapters | `apps/demo/`, `CLAUDE.md`, `docs/README.md`, `ROADMAP.md` | 6 smoke |
| 6 | The three use cases | `apps/demo/`, `CLAUDE.md`, `docs/README.md` | 3 smoke; the nav case gains the headings |
| 7 | The look, the footer and the workflow | `apps/demo/`, `.github/workflows/pages.yml` (new) | The footer's |
| 8 | The first deploy, the links and the retrospect | The root `README.md`, `CHANGELOG.md`, this document's § 9 and § 10, `docs/standing-rules.md` if D-1 is promoted, `docs/release-history.md`, `CLAUDE.md`, `ROADMAP.md` | — |

### Step 1 — This plan, its records, and the measurements

- Check the prototype's hash, delete its cache (D-2), and run M2, M3, M5, M6, M8 and M9 again.
- Open the register entry for `eval-core`'s barrels (P4), as the next free F ID.
- Retarget the `step` skill, and name this plan active in `CLAUDE.md` and `docs/README.md`.
- Read the three libraries' test counts from the gate, and record them here.

Exit: the measurements agree with [§ 1.3](#13-mechanism-questions-measured), or the row is
corrected in this commit ([SR4](../standing-rules.md#sr4)); the gate is green; doc-links lists no
dangling link.

- **Outcome** (2026-11-15). The six rows ran on Windows and Node 26.4.0, each build from a deleted
  `.angular` (D-2), and every one agrees with [§ 1.3](#13-mechanism-questions-measured). The
  prototype's hash was the pinned one before the runs and after them, over 20 files.
  - **M2**: 26 errors, all `TS1205`, all in `eval-core`'s barrels under `src/lib/internal/`:
    `classes/eval/public-api.ts` 18, `interfaces/public-api.ts` 4, `classes/common/public-api.ts` 2
    and `functions/public-api.ts` 2.
  - **M3**: the production build is green, and `tsc --noEmit -p tsconfig.app.json` prints nothing.
  - **M5**: `dist/browser/index.html` holds `<base href="/ng-eval/">`; its script, stylesheet and
    preloaded chunk are referenced by file name alone; `main-Q2IMXDAI.js` holds one
    `import("./chunk-2M6PBCKP.js")`.
  - **M6**: four of four copied files have their source's SHA-256.
  - **M8**: 542.72 kB raw and 141.56 kB transfer, the highlight.js arm. `build3.log` and
    `build6.log` hold the row's other two figures.
  - **M9**: 4 passed.
  - **Corrected in this commit** ([SR4](../standing-rules.md#sr4)), no result among them: § 1.3
    gives the hash in full with its command, and says what the command does not cover; M6's row
    says four were compared, where one had been; M8's row names the arm that was built again and
    the two logs, each by its SHA-256 ([SR47](../standing-rules.md#sr47)); row 1's file list gains
    `docs/backlog-history.md`, since the Register history left `docs/backlog.md` on 2026-11-15.
  - **The register**: [F32](../backlog.md#f32) opened for the 26 re-exports, not scheduled
    ([SR48](../standing-rules.md#sr48)); live entries 18 → 19.
  - **The records**: the `step` skill names this plan, and `CLAUDE.md`, `docs/README.md` and
    `ROADMAP.md` name it active, with rows for Phases 17 and 19 in `ROADMAP.md`'s table.
  - **The gate**, green: `eval-core` 3533, `eval-signals` 462, `eval-forms` 391, the baseline every
    later step starts from. doc-links: 373 files, 3077 links, 0 dangling. release-tags: 55 rows,
    65 release tags, all annotated, 0 failing.

### Step 2 — The project, empty and green

The project of [§ 3.2](#32-the-project), with a shell, a home page and one case.

Exit, each with what shows it:

1. `npx nx show projects` lists `demo`, and the gate is green with its `lint`, `test` and `build`.
2. The builder was installed without `--force`, and a clean `npm ci` leaves the lockfile
   unchanged ([SR37](../standing-rules.md#sr37)).
3. `git status --porcelain modules/` prints nothing, and the libraries' counts equal step 1's.
4. `dist/apps/demo/browser/index.html` holds `<base href="/ng-eval/">`.
5. The demo imports all five entry points and its lint is green. One probe, reverted: an import
   of the demo from `eval-core` turns `eval-core`'s lint red. D-1 exempts the demo's checks, not
   the libraries' boundary.
6. `nx serve demo` shows the shell in a browser.

If Nx cannot run the builder for a project compiled from the libraries' source, stop: the
alternatives, the `@nx/angular:application` executor or a build against `dist/`, are a replan,
since the second reverses Q8.

- **Outcome** (2026-11-16). Run on Windows, Node 26.4.0. The step's prompt carried the reviewing
  chat's measurements from a Linux sandbox at 63bdf4c, pinned in `ng-eval-19.2-measurements.zip`,
  SHA-256 `deddf836bc80dae8c7fc94f96fb443e0310b16e7e3bc1bc67837665ff76e9014`, which the maintainer
  holds ([SR47](../standing-rules.md#sr47)). Nothing was applied from it, and every result below
  that it also holds agrees with it.
  - **The version, and P8.** `@angular/build` 22.2.5 exactly, where Revision 2 said 22.2.4. The
    maintainer decided it on relaying the prompt: 22.2.4 pins vite 8.3.0, on which `npm audit`
    lists six advisories, one of them high, all in the dev server, and 22.2.5 pins vite 8.3.5.
    § 1.3's rows stay as written: the prototype measured 22.2.4.
  - **The install.** `npm install --save-dev --save-exact @angular/build@22.2.5`, with no other
    flag, exit 0. The lockfile gained 124 package entries and lost none, and the root manifest
    changed by one line. Its git blob went from `fa944c92235231fe90fc3870cb5ed0d37942a08a` to
    `de628a06b75be0ef2564d7278a72a18bbb248400`, the sandbox's blob. A clean `npm ci` exit 0 left it
    at that blob.
  - **The warnings**, at the install and at `npm ci` alike. `npm warn ERESOLVE overriding peer
    dependency`, twice, for `@emnapi/core` and `@emnapi/runtime` under
    `@oxc-parser/binding-wasm32-wasi`, an optional dependency of the builder. One install script
    blocked, `msgpackr-extract@3.0.7`; `allowScripts` is unchanged (M11). No `npm error`.
  - **The audit.** `npm audit --package-lock-only` lists `deepmerge` GHSA-gcqx-w48m-w2h4, `glob`
    GHSA-3g3m-2fjr-6pw4 and `minimatch` GHSA-g3hv-75wg-m249, the three [F16](../backlog.md#f16)
    holds, and nothing on vite.
  - **Criterion 1**, met. `npx nx show projects` lists `demo`, and the gate is green with its
    `lint`, `test` and `build`. Neither `nx.json` nor `tsconfig.base.json` changed.
  - **Criterion 2**, met: the install and the two blobs above.
  - **Criterion 3**, met. `git status --porcelain modules/` prints nothing, and the gate has
    `eval-core` 3533, `eval-signals` 462 and `eval-forms` 391.
  - **Criterion 4**, met. From a deleted `.angular` and `dist` (D-2),
    `dist/apps/demo/browser/index.html` holds `<base href="/ng-eval/">`. The same build with
    `--excludeTaskDependencies` is green with no `dist/modules`, and gives the same output names,
    `main-PCE7FPE5.js` and `styles-6GXROV53.css`: the demo compiles the libraries' source (Q8).
    `tsc --noEmit` prints nothing for `tsconfig.app.json` and for `tsconfig.spec.json`.
  - **Criterion 5**, met as written, and its explanation corrected. `home.ts` imports a value
    from each of the five entry points and uses it, `toText` from the `eval-forms` root, and the
    demo's lint is green. Two probes ran, each alone and reverted by hand. A relative import of
    `apps/demo/src/app/home` in `modules/eval-core/src/index.ts` turns `eval-core`'s lint red with
    "Projects cannot be imported by a relative or absolute path, and must begin with a npm scope".
    That is the rule's own check and not a tag: in the sandbox the same import through a temporary
    path alias gave "Circular dependency between "eval-core" and "demo" detected", so no probe
    reached a tag rule. Taking the `scope:demo` constraint out turns the demo's lint red with "A
    project without tags matching at least one constraint cannot depend on any libraries", on each
    of the five imports. So the constraint is what lets the demo import the libraries, and the
    rule's other checks are what refuse an import of the demo.
  - **Criterion 6**, met. The maintainer ran `npx nx serve demo` and sent the page at
    `http://localhost:4200/ng-eval/` as a screenshot: the `home` link, the heading, and the five
    sections, each under its entry point's name.
  - **No zone.** `project.json` has no `polyfills` entry, the build emits no `polyfills-*.js`, and
    `grep -c "Zone already loaded"` gives 0 for the one script, though `zone.js` is in the root
    manifest.
  - **Corrected in this commit** ([SR4](../standing-rules.md#sr4)). P8, in § 2, § 3.2 and § 8.
    § 1.3's hash command is the null-separated one, which covers a path that holds a space and
    prints the same hash over the same 20 files; step 1's Outcome describes the command it ran, and
    stays. § 3.2 names the demo's Jest settings and the three that were weighed. Criterion 5's
    explanation, above. Row 2's file list gains `docs/README.md`, for the gate's sentence and the
    active-plan sentence. § 1.3 marks three predictions as measured, and says what criterion 6 saw.
  - **The sweep** ([SR25](../standing-rules.md#sr25)), by `git grep -n -i -E 'all three
    projects|three projects|fourth project|no application'`. Rewritten: `CLAUDE.md`'s Commands,
    `CONTRIBUTING.md`'s Code style and its "All three projects are now configured the same way",
    and `docs/README.md`'s Gates. Kept as history: completed plans, step summaries, dated
    CHANGELOG lines, the `step` skill's account of the worker warning, and § 1.1 here, now marked.
    Left, outside this step's list: `docs/eval-rules/plan.md`'s two mentions of "the three
    projects" in its step 1, which that step corrects, and a spec comment under `modules/`.
  - **The demo's count**: 1.
  - **The gate**, green: `eval-core` 3533, `eval-signals` 462, `eval-forms` 391, `demo` 1.
    doc-links: 379 files, 3084 links, 0 dangling. release-tags: 55 rows, 65 release tags, all
    annotated, 0 failing.
  - **The gate's time** is the sandbox's, not this machine's
    ([SR28](../standing-rules.md#sr28)), read from the zip named above: nx's Run duration was
    1m 5s and 1m 6s without the `demo` project, and 1m 12s, 1m 12s and 1m 13s with it, with
    `eval-core`'s `test` the critical path in all five.

### Step 3 — The block, the registry and the free-form page

[§ 3.3](#33-an-example-and-the-block-around-it) and [§ 3.4](#34-what-keeps-it-honest), with the
free-form page as the block's first user. Adds the highlighter.

Exit: the four checks of § 3.4 exist and are green; the built `source/` holds one file per
`*.example.ts`, each with its source's SHA-256; the copy button's case reads back the text the
view shows.

- **Outcome** (2026-11-16). Run on Windows, Node 26.4.0. The step's prompt carried the reviewing
  chat's measurements, pinned in `ng-eval-19.3-measurements.zip`, SHA-256
  `6ad8eb2ef66daec4228c0370221519e99b6bd062144bea85fe8de57de15c6873`, which the maintainer holds
  ([SR47](../standing-rules.md#sr47)). Nothing was applied from it; the prompt quoted its lockfile
  blob and its build figures, and each is compared below.
  - **The install.** `npm install --save-dev --save-exact highlight.js@11.12.0`, with no other
    flag, exit 0. The lockfile gained one package entry, `node_modules/highlight.js`, and lost
    none, and the root manifest changed by one line in `devDependencies`. Its git blob went from
    `de628a06b75be0ef2564d7278a72a18bbb248400` to `cddbc46f7f736669d616ca360bda2643d2c2ae15`, the
    sandbox's blob. A clean `npm ci` exit 0 left it at that blob, and printed step 2's two
    `npm warn ERESOLVE overriding peer dependency`. One install script blocked at both,
    `msgpackr-extract@3.0.7`; `allowScripts` is unchanged. No `npm error`. The prototype's
    manifest has highlight.js 11.11.1; the pin is 11.12.0.
  - **The audit.** `npm audit --package-lock-only` lists `glob` GHSA-3g3m-2fjr-6pw4 and `minimatch`
    GHSA-g3hv-75wg-m249, two of the three [F16](../backlog.md#f16) holds. `deepmerge`
    GHSA-gcqx-w48m-w2h4 is not listed.
  - **The highlighter.** `highlight.ts` registers the `typescript` language on
    `highlight.js/lib/core`, once, and the source view renders `[innerHTML]` of
    `hljs.highlight(text, { language: 'typescript' }).value`, with no `bypassSecurityTrust*` and no
    theme stylesheet. The copy case finds a `span` in the code element and no `console.warn` call:
    the sanitizer kept the spans and warned of nothing.
  - **The Jest mapping.** Under the demo's Jest a language's default import is undefined: its
    `lib/languages/*.js` sets `module.exports` and no `.default`, and the demo does not set
    `esModuleInterop`, though tsc passes. Read with `node`:
    `require('highlight.js/lib/languages/typescript').default` is undefined, and `lib/core.js`'s
    `.default` is the object. `jest.config.ts` maps `highlight.js/lib/languages/*` to
    `es/languages/*.js`, which export a default, and its `transformIgnorePatterns` lets Jest
    transform those files; a comment there gives the reason. `esModuleInterop` stays unset, since
    it changes how `eval-core`'s source compiles in the demo's Jest.
  - **The layout**, under `src/app`. `example-tokens.ts` holds `EXPRESSION` and `DATA`;
    `registry.ts` the entry type, the list and the `ENTRY` token; `routes.ts` a route per entry,
    each providing its entry to `page.ts`, with `''` and `'**'` redirecting to `try`; `app.ts` the
    navigation, from the entries' titles. `block.ts` creates the example by
    `ViewContainerRef.createComponent`, from the boxes' `(input)` handler and once after the
    entry's `load` resolves, and calls the new ref's `detectChanges()` in the same `try`; a throw
    clears the container and shows its message. `source-view.ts` fetches `source/<file>` through
    `SOURCE_FETCH`, whose default is `fetch`, checks `response.ok`, and copies by
    `navigator.clipboard.writeText`. The block and the source view each hold a `PendingTasks`
    task until their promise settles, so `whenStable` waits for the load and the fetch. The
    free-form entry is `try/core-eval.example.ts`, the prototype's example reading
    `inject(EXPRESSION)` and `inject(DATA)`, with `2 + 3 * a` and `{ "a": 10 }`. `home.ts` and
    `home.spec.ts` are deleted.
  - **Q9's lazy folder per group is a lazy chunk per example.** Each entry's `load` is a dynamic
    `import()` of its component, so the build gives each example its own chunk; the one this step
    adds is `chunk-22HTLO2C.js`, named `core-eval-example`, 186.40 kB raw and 44.93 kB transfer.
  - **The build** (D-2), from a deleted `.angular` and `dist`, by
    `npx nx build demo --excludeTaskDependencies`: green, with no warning. Initial files
    `chunk-BCTB2LHD.js`, `main-BH3WRTS2.js` and `styles-6GXROV53.css`; Initial total 262.61 kB raw,
    75.67 kB transfer. The sandbox's figures, +29.63 kB raw and +9.85 kB transfer over 502.80 kB
    and 127.25 kB, do not compare with these: step 2's home page put all five entry points in the
    initial bundle, and here `eval-core` is in the lazy chunk, the other entry points in no file,
    and highlight.js in `main`.
  - **The copies.** `dist/apps/demo/browser/source/` holds one file, `try/core-eval.example.ts`,
    for the one `*.example.ts` under `src/app`, and both have the SHA-256
    `571db0e591b5838276e58845fb698acfa2dd1e65bb52520f247ba8ffbde61fbe`.
  - **The type-check.** `npx tsc --noEmit -p` prints nothing for `tsconfig.app.json` and for
    `tsconfig.spec.json`.
  - **The exit**, met. The four checks of [§ 3.4](#34-what-keeps-it-honest) exist and are green:
    the smoke case in `try/core-eval.example.spec.ts`, the block's two cases in `block.spec.ts`,
    and the registry's two in `registry.spec.ts`. The built `source/` holds one file per
    `*.example.ts`, each with its source's SHA-256, above. The copy case in `source-view.spec.ts`
    reads back the code element's `textContent`, which is the file's text with LF line endings.
  - **Found in review, before the commit.** The HTML parser turns CRLF into LF when `[innerHTML]`
    is set, so on a checkout with `core.autocrlf` on, where the example file holds CRLF, the copy
    case was red: the text copied kept CRLF, and the text shown did not. It was green here only
    because the step wrote the file with LF, and CI checks out LF. Measured in the reviewing
    chat's sandbox by converting the file. `source-view.ts` now replaces CRLF with LF in the
    fetched text, so the text copied is the text shown, and the spec compares the code element
    with the file read from disk after the same replacement. The case is green with either line
    ending.
  - **`modules/` and `tools/`**: `git status --porcelain modules/ tools/` prints nothing. No
    `code-reviewer` ran (D-1): no file under either changed.
  - **Corrected in this commit** ([SR4](../standing-rules.md#sr4)). Row 3's file list gains
    `CLAUDE.md` and `docs/README.md`, for the active-plan sentence. § 1.3 marks a prediction as
    measured.
  - **The sweep** ([SR25](../standing-rules.md#sr25)), by `git grep -n -E 'steps 1 and 2 (are
    )?done|step 3 is next'`. Rewritten: `CLAUDE.md`'s two active-plan sentences,
    `docs/README.md`'s Active plan, and this document's status line. Kept as history: two lines
    of `docs/a45/plan.md`, a completed plan, on its own steps.
  - **The demo's count**: 6. Step 2's case went with `home.ts`; the smoke case, the block's two,
    the registry's two and the copy case are this step's.
  - **The gate**, green: `eval-core` 3533, `eval-signals` 462, `eval-forms` 391, `demo` 6.
    doc-links: 389 files, 3089 links, 0 dangling. release-tags: 55 rows, 65 release tags,
    all annotated, 0 failing.

### Steps 4, 5 and 6 — The pages

Step 4 adds the six core and signals pages of Q14, step 5 the six forms pages, step 6 the three
use cases of Q15. A page is an example file, a registry entry, and a smoke case.

Exit, for each: one smoke case per page added, green; the registry cases green without an edit to
them; each page's prose states what its example does and links its README section, with no limit
and no guarantee (D-1), read by the maintainer at the step's confirmation.

Step 5's pages show `visible` and `text` at `/reactive`, and `visible`, `text` and `disabled` at
`/signals` ([§ 1.2](#12-findings-that-shape-the-plan) finding 6).

- **Step 4's Outcome** (2026-11-17). Run on Windows, Node 26.4.0. The step's prompt carried the
  reviewing chat's measurements on `f644932`, pinned in `ng-eval-19.4-measurements.zip`, SHA-256
  `e6f4cf522c93831b061380e250daa806fbf280d9dddfb8fed3cc2a320e29bfd2`, which the maintainer holds
  ([SR47](../standing-rules.md#sr47)); the hash was checked before the step. It is a measuring rig,
  not this step's code, and nothing was applied from it. The prompt quoted its smoke values, and
  each case below reads them.
  - **The pages.** Six registry entries after `try`, in this order, each file under `src/app`:
    `features/core/evaluate` (`x + y`, CompilerService's README section),
    `features/core/scopes` (`CAT.action(ARGS, cat.NUM, "times")`), `features/core/hooks`
    (`2 + 3 * a`), `features/signals/signal` and `features/signals/dependencies`
    (`price * quantity`), and `features/signals/async` (`loadUser(id)`). Each example reads
    `inject(EXPRESSION)` and `inject(DATA)` in field initializers, as `try/core-eval.example.ts`
    does, and is otherwise its README section's code. The scopes and hooks examples run the
    README's statements in the constructor, after the field initializers: the scope push and the
    hook registration come before the evaluation. A context that needs functions defines them in
    the example's file: the README's `cat` object, and `loadUser` over two users, Ada and Grace,
    resolving after a 10 ms `setTimeout`. The hooks example pushes
    `event.path ?? String(event.key)`, since `event.key` is `string | number | symbol`.
  - **The prose.** `RegistryEntry` gains `readonly summary: string`, and `page.ts` renders it as a
    `<p>` between the title and the README link, as-is, backticks included. Each of the seven
    entries, `try`'s included, has the text the prompt gave; a page has no other prose.
  - **The navigation**, found by the reviewing chat's measurement, before the step. The link
    array `['/', entry.path]` encoded the slashes inside a nested path, giving
    `/features%2Fcore%2Fhooks`, and a click landed on `try` through the `'**'` redirect: Angular
    splits `/` only in a link array's first command. `app.ts` now binds `'/' + entry.path`.
    `app.spec.ts` renders `App` under `provideRouter(routes)` and reads every navigation link's
    `href` as `'/' + ` its entry's path, in registry order. It does not navigate, since a page's
    source view would call `fetch`.
  - **The smoke cases**, one per example in `<name>.example.spec.ts` beside it, shaped as
    `try/core-eval.example.spec.ts`: a value, a change, the new value. evaluate: 3 and 3, then
    `{ "x": 10, "y": 2 }` gives 12 and 12. scopes: `Mister Whiskers says meow 3 times`, then
    `cat.NAME` gives `Miss Kitty`. hooks: 32, the reads `["a"]` and 7 trace lines, then
    `{ "a": 20 }` gives 62. signal: 30, then the button gives 40. dependencies: 30 and
    `price, quantity`, then `price * quantity + shipping` gives 35 and
    `price, quantity, shipping`. async: after `whenStable`, `resolved` and `Ada`, then
    `{ "id": 2 }` gives `resolved` and `Grace`, with real timers, since the async signal holds a
    `PendingTasks` task while a run is pending. Each spec copies the two helpers, but the signal
    spec copies `entryAt` only: its change is a click, so a copied `typeInto` would be unused,
    and lint has no `eslint-disable` here. The registry's two cases are green, and
    `registry.spec.ts` is unedited.
  - **The type-check.** `npx tsc --noEmit -p` prints nothing for `tsconfig.app.json` and for
    `tsconfig.spec.json`.
  - **The build** (D-2), from a deleted `.angular` and `dist`, by
    `npx nx build demo --excludeTaskDependencies`: green, with no warning. Initial files
    `main-XNEXTBQX.js` and `styles-6GXROV53.css`; Initial total 266.66 kB raw, 74.73 kB transfer.
    One lazy chunk per example, by name: `core-eval-example` (`chunk-jTIVcbD1.js`, 525 bytes),
    `evaluate-example` (`chunk-Cl7-9omf.js`, 783 bytes), `scopes-example` (`chunk-DgKPhOi8.js`,
    829 bytes), `hooks-example` (`chunk-BmiBMeFz.js`, 1.06 kB), `signal-example`
    (`chunk-DfBlL-LI.js`, 836 bytes), `dependencies-example` (`chunk-Dm1Z1Hpe.js`, 902 bytes) and
    `async-example` (`chunk-D10DAG_2.js`, 3.75 kB). `eval-core`, which step 3 found in
    `core-eval-example`'s chunk, is now in a shared unnamed lazy chunk, `chunk-BKxpoGEF.js`,
    187.18 kB raw and 45.57 kB transfer, beside three smaller unnamed ones.
  - **The copies.** `dist/apps/demo/browser/source/` holds the seven `*.example.ts`, one per file
    under `src/app`, each with its source's SHA-256:
    `try/core-eval.example.ts` `571db0e591b5838276e58845fb698acfa2dd1e65bb52520f247ba8ffbde61fbe`,
    `features/core/evaluate.example.ts`
    `aa1a9057da10b218b5d0615a6ed1ee03d25bacd2e4ba3ed9bf652b67b5b672ac`,
    `features/core/scopes.example.ts`
    `5a8fe9d7a1c98d2153c432dd39caf9f3d591fefd62abbe6017427e489bd4af7f`,
    `features/core/hooks.example.ts`
    `3959cdb1c4777c7f773976382c8562e29f0e2637c21bfe80f99b2f52fe5c3293`,
    `features/signals/signal.example.ts`
    `590beb6b9dccb1cc51677cd7b105015efd9b32871cb886a6138c9d19f4080b65`,
    `features/signals/dependencies.example.ts`
    `99cd4a8c249491cbd32dc3aafd7559cbc147e998eba323f66290ca9f5c86b11f` and
    `features/signals/async.example.ts`
    `14d9741640a06c3309b3e7097d0e12ebb004cb27f9d2861191164502f1e3fc84`. Every new file was
    written with LF line endings.
  - **`modules/` and `tools/`**: `git status --porcelain modules/ tools/` prints nothing. No
    `code-reviewer` ran (D-1): no file under either changed.
  - **Corrected in this commit** ([SR4](../standing-rules.md#sr4)). Row 4's file list gains
    `CLAUDE.md` and `docs/README.md`, for the active-plan sentence, and its cases read
    "6 smoke, 1 nav".
  - **The sweep** ([SR25](../standing-rules.md#sr25)), by
    `git grep -n -E 'steps 1 to 3|step 4 is next'`. Rewritten: `CLAUDE.md`'s two active-plan
    sentences, `docs/README.md`'s Active plan, and this document's status line. The grep finds
    nothing in `docs/a45/plan.md`, which is left alone.
  - **The demo's count**: 13. Step 3's six, the six smoke cases and the navigation case.
  - **The gate**, green: `eval-core` 3533, `eval-signals` 462, `eval-forms` 391, `demo` 13.
    doc-links: 402 files, 3092 links, 0 dangling. release-tags: 55 rows,
    65 release tags, all annotated, 0 failing.
- **Step 5's Outcome** (2026-11-17). Run on Windows, Node 26.4.0, by Claude Sonnet 5.5. The step's
  prompt carried the reviewing chat's measurements on `e748863`, pinned in
  `ng-eval-19.5-measurements.zip`, SHA-256
  `215dffb426ab818d3c552c12b2f1de79227c10a844ca11fe0dc4eac97ce3b9c4`, which the maintainer holds
  ([SR47](../standing-rules.md#sr47)). It is a measuring rig, not this step's code, and nothing was
  applied from it; this session did not open it. The prompt quoted its smoke values, which each case
  below reads, and its attribution of the initial bundle's growth, which this session did not
  measure again.
  - **The pages.** Six registry entries after `features/signals/async`, in this order, each file
    under `src/app`, each example reading `inject(EXPRESSION)` and `inject(DATA)` in field
    initializers and otherwise its README section's code, with its README link at
    `modules/eval-forms/README.md`. `features/forms-reactive/quick-start` (`QuickStartExample`,
    `country === 'US'`, anchor `quick-start--reactive-forms-reactive`),
    `features/forms-reactive/rule-fails` (`RuleFailsExample`, `customer.name.toUpperCase()`, anchor
    `when-a-rule-fails`), `features/forms-reactive/validation` (`ValidationExample`, `constructor`,
    anchor `it-is-validated-when-you-bind`), `features/forms-signals/registrars`
    (`RegistrarsExample`, `country === 'US'`, anchor
    `the-three-registrars-and-their-polarity`), `features/forms-signals/schema-function`
    (`SchemaFunctionExample`, `country === 'US'`, anchor
    `reuse-a-schema-function-not-a-schema-value`) and `features/forms-signals/error-policy`
    (`ErrorPolicyExample`, `customer.name.toUpperCase()`, anchor `when-a-rule-fails`, the section
    covering both adapters). The titles are Q14's, and the summaries and the default data are the
    prompt's, as the maintainer reads them at the confirmation.
  - **The examples.** At `/reactive` each takes `Injector`, binds with `bindFieldProperties` in a
    field initializer with `{ injector }`, and destroys every binding in `ngOnDestroy`. The quick
    start builds the README's `FormGroup` (`country`, `state`) from the data, imports
    `ReactiveFormsModule`, and renders an `input.country`, an `input.state` inside
    `@if (binding.fields['state'].visible?.())`, and an `<output>` of the value. `rule-fails` and
    `validation` build one `FormControl` per key of the data. `rule-fails` binds
    `[{ name: 'label', text: expression }]` three times, with the default, `onError: () => '—'` and
    `onError: 'throw'`, and its `read(binding)` is `JSON.stringify` of the text value or the caught
    error's message. `validation` binds `[{ name: 'city', visible: expression }]` with no
    `try`/`catch`, so a throw reaches the block. At `/signals` each builds a `signal` model,
    `createExpressionRules(model)`, `schema()` and `form()` in field initializers. `registrars` is
    the README's three registrations, with the expression as `evalVisible`'s, and a button that sets
    the model to the US and a total of 120. `schema-function` is the README's `makeSchema`, over
    models from the data's `a` and `b`. `error-policy`'s model is `customer` from the data and three
    empty string fields, with three `evalText` registrations of the expression and a `read(key)`
    shaped as `rule-fails`'s.
  - **The smoke cases**, one per example in `<name>.example.spec.ts` beside it, shaped as step 4's,
    and each green on its first run against the prompt's values. Each copies `entryAt`, and
    `typeInto` only where a box is typed into: `quick-start` and `registrars` copy `entryAt` only,
    with step 4's comment, since their change is the example's own input or button.
    quick-start: output `false` and no `input.state`; typing `US` into `input.country` (value and
    an `input` event) gives `true` and an `input.state`. rule-fails and error-policy: `""`, `"—"`
    and `Cannot call undefined or null function`, then `{ "customer": { "name": "Ada" } }` gives
    `"ADA"` three times. validation: no `demo-validation`, and a `p.error` matching
    `/^Expression 'constructor': identifier 'constructor' is a member of Object\.prototype/`; then
    `country === 'US'` gives no `p.error` and output `false`. registrars: `true`, `Standard`,
    `true`, `ZIP is US-only`; the button gives `false`, `Free shipping`, `false` and an empty
    string. schema-function: a `false` and b `true`; then `country === 'CA'` gives a `true` and
    b `false`. `registry.spec.ts` is unedited, and its two cases are green over the thirteen entries.
  - **The type-check.** `npx tsc --noEmit -p` exits 0 for `tsconfig.app.json` and for
    `tsconfig.spec.json`; the workspace's output filter prints `TypeScript: No errors found`, and
    no diagnostic.
  - **The build** (D-2), from a deleted `.angular` and `dist`, by
    `npx nx build demo --excludeTaskDependencies`: green, with no warning. Initial files
    `main-CESFZMBZ.js` and `styles-6GXROV53.css`; Initial total 287.35 kB raw, 80.18 kB transfer,
    up from step 4's 266.66 kB and 74.73 kB. The reviewing chat's rig gave 287.35 kB and
    80.20 kB, and its pinned file attributes main's +20.7 kB to `@angular/core` (+15.8 kB, core
    code the forms pages use, kept in `main`) and the summaries (+3.8 kB). The six new named
    lazy chunks: `quick-start-example` (`chunk-Dp8DEh3A.js`, 1.34 kB), `rule-fails-example`
    (`chunk-CKS2FzYX.js`, 1.52 kB), `validation-example` (`chunk-DuQMy_t1.js`, 905 bytes),
    `registrars-example` (`chunk-DZ0iENoV.js`, 1.60 kB), `schema-function-example`
    (`chunk-X-czTRn_.js`, 993 bytes) and `error-policy-example` (`chunk-Dh3rkiEg.js`, 1.34 kB).
    The unnamed lazy chunk that holds `eval-core` is `chunk-Bfy_7kKG.js`, 181.63 kB raw and
    44.49 kB transfer, beside five smaller unnamed ones.
  - **The copies.** `dist/apps/demo/browser/source/` holds thirteen files, the seven of step 4 and
    six new, each with its source's SHA-256 (the seven are step 4's, unchanged):
    `features/forms-reactive/quick-start.example.ts`
    `e62c8802a9a42c86cba0e010100d97baffea4907a4eab042d9f69d349c5e029a`,
    `features/forms-reactive/rule-fails.example.ts`
    `36a4f8cd3f99fc6f51adbe4ff23029dce90850bc0c5418d48bf74b6ff3f4c83f`,
    `features/forms-reactive/validation.example.ts`
    `8565da9c9ca79d79f87e83414128b37f370e944798162a1d9de1a2007bdb9929`,
    `features/forms-signals/registrars.example.ts`
    `5557ddf17cb63868e741751ca22416cf007f1ca02450f065a2b25419985a169f`,
    `features/forms-signals/schema-function.example.ts`
    `a581af6ccce4e4eaa81d14d7eaddc07372b3ffbb2d47d5bf82600f4c2b17da8a` and
    `features/forms-signals/error-policy.example.ts`
    `bd372de63c1f5cec58a85ab43d0bcf939611e3ba638753f7da7f340c23b3e9ea`. Every new file was
    written with LF line endings.
  - **`modules/` and `tools/`**: `git status --porcelain modules/ tools/` prints nothing. No
    `code-reviewer` ran (D-1): no file under either changed.
  - **Corrected in this commit** ([SR4](../standing-rules.md#sr4)). Row 5's file list gains
    `CLAUDE.md`, `docs/README.md` and `ROADMAP.md`, for the active-plan sentences, and for three
    progress sentences that were false now ([SR31](../standing-rules.md#sr31)): `docs/README.md`'s
    `demo/` row said "step 1 done and step 2 next" and "Nothing is built yet", and `ROADMAP.md`'s
    two lines said "step 1 done" and "step 1 done, step 2 next". They now say "active", or nothing.
  - **The sweep** ([SR25](../standing-rules.md#sr25)), by
    `git grep -n -E 'steps 1 to 4|step 5 is next|step 1 done|step 2 next|Nothing is built yet'`.
    Rewritten: `CLAUDE.md`'s two active-plan sentences, `docs/README.md`'s Active plan and its
    `demo/` row, `ROADMAP.md`'s two lines, and this document's status line. Kept as history
    ([SR6](../standing-rules.md#sr6)): `docs/a24/plan.md` and `docs/a48/plan.md`, completed plans
    on their own steps, `docs/backlog-in-flight.md`'s line on Phase 11, and
    `docs/documentation/phase-10-plan.md`.
  - **The demo's count**: 19. Step 4's thirteen and the six smoke cases.
  - **The gate**, green: `eval-core` 3533, `eval-signals` 462, `eval-forms` 391, `demo` 19.
    doc-links: 414 files, 3097 links, 0 dangling. release-tags: 55 rows,
    65 release tags, all annotated, 0 failing.
- **Step 6's Outcome** (2026-11-17). Run on Windows, Node 26.4.0, by Claude Sonnet 5.5. The step's
  prompt carried the reviewing chat's measurements on `2928845`, pinned in
  `ng-eval-19.6-measurements.zip`, SHA-256
  `0d81003f844e57296bd38300078730488635d67ad28ec8c77a1762fbb2a59a21`, which the maintainer holds
  ([SR47](../standing-rules.md#sr47)); the hash was checked before the step. It is a measuring rig,
  not this step's code, and nothing was applied from it; this session did not open it. The prompt
  gave the code and the values the cases read, and each case below reads them.
  - **The pages.** Three registry entries after `features/forms-signals/error-policy`, in this
    order, each file under `src/app`: `use-cases/configured-form` (`ConfiguredFormExample`, anchor
    `the-field-schema` in `modules/eval-forms/README.md`), `use-cases/formula-fields`
    (`FormulaFieldsExample`, anchor `how-it-fits-together` in `modules/eval-signals/README.md`) and
    `use-cases/row-filter` (`RowFilterExample`, `price > 100 && category == 'books'`, anchor
    `compilation--compilerservice` in `modules/eval-core/README.md`). `RegistryEntry.expression` is
    now `string | null`. The first two have `expression: null`, since neither reads an expression:
    the block wraps its Expression label in `@if (entry().expression !== null)`, and sets the
    expression signal to `entry.expression ?? ''`, so the data box is the only textarea, at index
    0, on those two pages. The titles, the summaries and the default data are the prompt's.
  - **The examples.** `configured-form` is at `/reactive` only: `FieldSchema` is the JSON shape,
    which `/signals` has none of, so `disabled` stays on the registrars page. It builds one
    `FormControl` per field of the data, binds the list with `bindFieldProperties` and
    `{ injector }`, destroys the binding in `ngOnDestroy`, and renders a label per field, shown
    while the field's `visible` rule is true, with its `text` rule or its name. `formula-fields`
    makes one `createEvalSignal` per formula, in order, from a copy of the source, so a formula
    reads only the two inputs and those before it. Its values are shown with `toFixed(2)`, since
    `DecimalPipe` throws on a string during change detection, outside the block's `try`.
    `row-filter` compiles once with `CompilerService.compile`, and calls the result with
    `simpleCall` once per row.
  - **The navigation** (design § 2.4). `app.ts` renders the free-form page's link, then a
    Features section of four groups, titled from each path's folder (`core`, `signals`,
    `forms, /reactive`, `forms, /signals`), then a Use cases section. `app.spec.ts` keeps its
    `href` check, in registry order, and now also reads `nav h2` as `Features`, `Use cases` and
    `nav h3` as the four group titles.
  - **The smoke cases**, one per example in `<name>.example.spec.ts` beside it, shaped as step 5's,
    each green on its first run against the prompt's values. Each copies `entryAt`; `row-filter`
    alone copies `typeInto`, and the other two carry step 5's comment, since their change is the
    example's own input. configured-form: one textarea; the labels as
    `<class>: <text>` are `country: country` and `zip: Postal code`; typing `US` into
    `label.country input` gives `country: country`, `state: State` and `zip: ZIP code`.
    formula-fields: one textarea; `dd.subtotal`, `dd.discount`, `dd.tax` and `dd.total` read
    `100.00`, `10.00`, `11.70` and `101.70`; typing `2` into `input.quantity` gives `50.00`,
    `0.00`, `6.50` and `56.50`. row-filter: `2 of 5 rows`, and the first cell of each row `Dune`
    and `Encyclopedia`; the expression `price > 100` gives `3 of 5 rows`, `Dune`, `Desk lamp` and
    `Encyclopedia`. `registry.spec.ts` is unedited, and its two cases are green over the sixteen
    entries.
  - **The type-check.** `npx tsc --noEmit -p` exits 0 for `tsconfig.app.json` and for
    `tsconfig.spec.json`.
  - **The build** (D-2), from a deleted `.angular` and `dist`, by
    `npx nx build demo --excludeTaskDependencies`: green, with no warning. Initial files
    `main-GOOYQO7A.js` and `styles-6GXROV53.css`; Initial total 292.79 kB raw, 81.68 kB transfer,
    up from step 5's 287.35 kB and 80.18 kB, which this session did not attribute. It is the
    figure the reviewing chat's rig gave, 292.79 kB and 81.68 kB. The three new named lazy chunks:
    `configured-form-example` (`chunk-C-0tSrOk.js`, 1.45 kB), `formula-fields-example`
    (`chunk-Bxny2Tvb.js`, 1.59 kB) and `row-filter-example` (`chunk-D1jmXym-.js`, 1.16 kB), the
    sizes the rig gave. The largest unnamed lazy chunk, `chunk-6oBH9k32.js`, is 181.63 kB raw and
    44.48 kB transfer.
  - **The copies.** `dist/apps/demo/browser/source/` holds sixteen files, the thirteen of step 5
    and three new under `use-cases/`, each equal to its source, whose SHA-256 is:
    `use-cases/configured-form.example.ts`
    `744eb7c38b2db9fecbd96fb50661217e3f639672c2a94593c7c145c794f9d78e`,
    `use-cases/formula-fields.example.ts`
    `646babbf5909c700ca39d9c7f994a9148f89479adde938e5ca05c0e62719025f` and
    `use-cases/row-filter.example.ts`
    `7e409bff8f1a9fb38c7db36ba12b03710a1bbd80193843626d73ad2f43377828`. Every new file was
    written with LF line endings.
  - **`modules/` and `tools/`**: `git status --porcelain modules/ tools/` prints nothing. No
    `code-reviewer` ran (D-1): no file under either changed.
  - **Corrected in this commit** ([SR4](../standing-rules.md#sr4)). Row 6's file list gains
    `CLAUDE.md` and `docs/README.md`, for the active-plan sentences, and its cases read
    "3 smoke; the nav case gains the headings".
  - **The sweep** ([SR25](../standing-rules.md#sr25)), by
    `git grep -n -E 'steps 1 to 5|step 6 is next|step [1-5] done|step [2-6] (is )?next|Nothing is built yet'`.
    Rewritten: `CLAUDE.md`'s two active-plan sentences, `docs/README.md`'s Active plan, and this
    document's status line. Kept ([SR6](../standing-rules.md#sr6)): the completed plans' records
    (`docs/a24/plan.md`, `docs/a33/plan.md`, `docs/a45/plan.md`, `docs/a48/plan.md`,
    `docs/colon-identifiers/phase-9-plan.md`, `docs/documentation/phase-10-plan.md` and
    `phase-11-plan.md`), this document's own earlier Outcomes, which quote their greps, and three
    unrelated "steps 1 to 5": `docs/eval-rules/plan.md`, `docs/statements/summary.md` and
    `modules/eval-core/src/lib/internal/visitors/dispatch-statement.ts`, which this step does not
    touch.
  - **The demo's count**: 22. Step 5's nineteen and the three smoke cases.
  - **The gate**, green: `eval-core` 3533, `eval-signals` 462, `eval-forms` 391, `demo` 22.
    doc-links: 420 files, 3101 links, 0 dangling. release-tags: 55 rows,
    65 release tags, all annotated, 0 failing.

### Step 7 — The look, the footer and the workflow

- Light and dark by the visitor's setting, and a layout that works at phone width (Q22).
- The footer shows each package's version and the commit (Q16). How the build receives them is
  decided here, by measurement: a relative import of a library's manifest may be refused by the
  lint boundary.
- `.github/workflows/pages.yml`: started by hand only, it installs, builds the `demo` project and
  publishes `dist/apps/demo/browser`.

Exit: the site read in a browser in both settings and at phone width; the footer's case green; the
workflow file present, with `workflow_dispatch` as its only trigger.

### Step 8 — The first deploy, the links and the retrospect

The maintainer enables Pages and starts the workflow (P6). Then the root README and the
repository's homepage get the link (Q19), and the root `CHANGELOG.md` gets its line.

Exit: `zvenigora.github.io/ng-eval/` serves the site; a feature page loaded by its full address
renders after a reload; a source view shows its file; the footer shows the commit that was
deployed. § 9 and § 10 are written, D-1 is weighed for promotion, and `CLAUDE.md` names no plan
active.

## 5. Public API surface added

None. No library changes.

## 6. Verification gates

The gate of [SR8](../standing-rules.md#sr8), which from step 2 includes the `demo` project, and
the four checks of [§ 3.4](#34-what-keeps-it-honest). Steps 7 and 8 add what a person reads in a
browser, since no gate sees the look or the live site.

## 7. Risks

| Risk | What shows it |
| :--- | :--- |
| Nx cannot run the builder over the libraries' source | Step 2's criterion 1, and its stop |
| The demo's build slows the gate and CI | The gate's time, read at step 2 and at step 6 |
| A demo-only package reaches a library manifest | `@nx/dependency-checks`, in each library's lint |
| A library imports the demo | Step 2's criterion 5 |
| An example rots | Its smoke case |
| A page's prose makes a claim | Nothing in the gate: the maintainer's reading in steps 4 to 6, and D-1 |
| The demo grows into a long track | The cap of Q10: twelve pages and three use cases, and a later page is one commit |
| The site shows behaviour npm does not have | The deploy is by hand, after a release, and the footer names the commit (Q16) |

## 8. Questions

P1 to P7 were decided on 2026-11-15. Each was Revision 1's reading (P-1), written so that "yes"
accepted it, and the maintainer accepted all seven. The third column is the reading as decided.
P8 was raised by the sandbox measurements made for step 2's prompt, and decided on 2026-11-16.

| # | Question | Decision |
| :--- | :--- | :--- |
| P1 | Should an example read its expression by `inject()`, and the page recreate it on an edit? This amends Q20, which said inputs | Yes. The factories compile in a field initializer, where an input has no value (finding 2). With `inject()`, the code shown is the README's code plus one call |
| P2 | Should the page fetch the example's file, copied by the build, and not inline it? This amends Q11's "imported as raw text" | Yes. The copy is byte for byte and needs no suppressed error (finding 3). The cost is one request per source view |
| P3 | Should the highlighter be highlight.js? | Yes. It costs 3.65 kB more in transfer than Prism, and brings its own types and no build warning (M8) |
| P4 | Should the demo set `isolatedModules: false`, and `eval-core`'s 26 re-exports get a register entry that is not scheduled? | Yes. A consumer of the published package never compiles the barrels, so the entry is below the fix bar ([SR48](../standing-rules.md#sr48)) |
| P5 | Should the demo run without zone.js? | Yes. It is Angular 22's default and the four groups pass under it (M9). It also makes the demo the libraries' first zoneless consumer |
| P6 | Should the first deploy be step 8 of this plan, which needs the maintainer to enable Pages and start the workflow? | Yes. A workflow that has never run is a prediction, and the links of Q19 wait on a live site |
| P7 | Should the project's files be written by hand, and not by the Nx generator? | Yes. The generator edits the root manifest and `nx.json` beyond a step's file list. The prototype's files are the starting point |
| P8 | Should the builder be `@angular/build` 22.2.5 exactly, and not 22.2.4? | Yes. 22.2.4 pins vite 8.3.0, on which `npm audit` lists six advisories, one of them high (GHSA-587h-7wmj-h5pm), all in the dev server. 22.2.5 pins vite 8.3.5, and the audit stays at the three advisories [F16](../backlog.md#f16) holds |

## 9. Contract after this lands

Written by step 8: how a page is added, and how a new library joins the demo, for the demo steps
of Phases 12 and 17 (Q21).

## 10. Retrospect

Written by step 8.
