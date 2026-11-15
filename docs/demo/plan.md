# Phase 19 Plan — the demo application, first version

**Status: Revision 2, ready for step 1.** No step has run. The design is
[`design-session.md`](design-session.md), one session and questions Q1 to Q23. This plan does not
restate it: it cites a decision by its Q number, and adds what a plan needs: measurements, scope,
steps, exit criteria, and what goes red.

A statement here about how the build, the libraries' source or Jest behaves is a row of
[§ 1.3](#13-mechanism-questions-measured), run on a prototype pinned in the ignored `tmp/` folder,
or it says it is a prediction. Step 1 checks the prototype's hash and runs it again.

**No question is open.** [§ 8](#8-questions) held seven readings Revision 1 made by its rule P-1,
on points the measurements raised after the session had ended. The maintainer decided all seven
on 2026-11-15, each as Revision 1 read it, and [§ 2](#2-decisions--recorded-not-reopened) holds
the decisions. Two of them amend an answer of the session, Q11 and Q20, and the design record
says so at each.

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
  application builder, and none is installed (M1).
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
lockfile and the logs. The SHA-256 of their sorted `sha256sum` listing is `3eef781b…414d4c3a`.
`tmp/` is ignored by git, so the prototype is outside the tracked tree but inside the working
folder; step 1 moves it if the maintainer wants it elsewhere. It installed `@angular/build` 22.2.4
with `--legacy-peer-deps`, so that the compiler and TypeScript resolved to the workspace's own
copies, and ran the builder through the Angular CLI, not through Nx.

| # | Question | Result |
| :--- | :--- | :--- |
| M1 | Is an application builder installed? | No. `@angular/build` and `@angular-devkit/build-angular` are absent. `@angular/build` 22.2.4 exists, and its required peers are ones the workspace has |
| M2 | Does the libraries' source compile under an application's default options? | No, under `isolatedModules: true`: 26 errors, all `TS1205`, all in `eval-core`'s barrels. None in the other two |
| M3 | And with `isolatedModules: false`? | Yes. The production build is green, and `tsc --noEmit` prints nothing, with the libraries' other strict options on and the base `lib` |
| M4 | Is a build after a `tsconfig` change trustworthy? | Not from a warm cache: the 26 errors were printed again until `.angular` was deleted |
| M5 | What does the build emit for Pages? | `dist/browser/`. Its `index.html` holds `<base href="/ng-eval/">`; script, style and chunk references are relative; the lazy route is `import("./chunk-….js")` |
| M6 | Is a copied example file the file that ran? | Yes, for the one compared: `source/core-eval.example.ts` has the SHA-256 of its source. All four were copied |
| M7 | Does `with { loader: 'text' }` work on a `.ts` file? | In a development build, yes: the text is inlined and the component still compiles. TypeScript needs `@ts-expect-error` on the import. Not tried under Jest |
| M8 | What does a highlighter cost? | Baseline 510.91 kB raw, 130.86 kB estimated transfer. highlight.js, core with three languages: +31.81 kB, +10.70 kB. Prism with two: +21.58 kB, +7.05 kB, with three "not ESM" warnings and no types of its own |
| M9 | Do the libraries work without zone.js? | Four Jest cases pass under the zoneless environment, one per group. Each asserts a value, changes a source, and asserts the new value |
| M10 | May an untagged project import a library? | No: "A project without tags matching at least one constraint cannot depend on any libraries", on each of the four example files |
| M11 | Does the builder need an install script? | No. Four were blocked (`@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract`), and the build and the tests were green |
| M12 | Can an example read its expression by `inject()` in a field initializer? | Yes, at all three factories: M9's cases construct them so |

**Not measured, so predictions**, each an exit criterion of the step that first relies on it:

- Nx running the builder as the `demo` project's target. Nx does not see a project under `tmp/`.
- The builder installed in the root without `--force`, and a clean `npm ci` after it.
- The lint constraint for the demo's tag, in both directions.
- The site in a browser, at any address.
- Recreating an example on each edit, and what a parse error does to the page.
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
- The build's `baseHref` is `/ng-eval/`, and routing uses `withHashLocation()` (Q17, M5).
- The root `devDependencies` gain `@angular/build` at 22.2.4 exactly, in step 2, and the
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
| 1 | This plan, its records, and the measurements | `docs/demo/`, `docs/README.md`, `ROADMAP.md`, `CLAUDE.md`, `docs/backlog.md`, the `step` skill | — |
| 2 | The project, empty and green | `apps/demo/` (new), the root `package.json`, `package-lock.json`, `eslint.config.mjs`, `CLAUDE.md`, `CONTRIBUTING.md`, the root `CHANGELOG.md` | 1 |
| 3 | The block, the registry and the free-form page | `apps/demo/`, the root `package.json`, `package-lock.json` | The block's, the two registry cases, 1 smoke |
| 4 | Feature pages: core and signals | `apps/demo/` | 6 smoke |
| 5 | Feature pages: forms, both adapters | `apps/demo/` | 6 smoke |
| 6 | The three use cases | `apps/demo/` | 3 smoke |
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

### Step 3 — The block, the registry and the free-form page

[§ 3.3](#33-an-example-and-the-block-around-it) and [§ 3.4](#34-what-keeps-it-honest), with the
free-form page as the block's first user. Adds the highlighter.

Exit: the four checks of § 3.4 exist and are green; the built `source/` holds one file per
`*.example.ts`, each with its source's SHA-256; the copy button's case reads back the text the
view shows.

### Steps 4, 5 and 6 — The pages

Step 4 adds the six core and signals pages of Q14, step 5 the six forms pages, step 6 the three
use cases of Q15. A page is an example file, a registry entry, and a smoke case.

Exit, for each: one smoke case per page added, green; the registry cases green without an edit to
them; each page's prose states what its example does and links its README section, with no limit
and no guarantee (D-1), read by the maintainer at the step's confirmation.

Step 5's pages show `visible` and `text` at `/reactive`, and `visible`, `text` and `disabled` at
`/signals` ([§ 1.2](#12-findings-that-shape-the-plan) finding 6).

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

All decided on 2026-11-15. Each was Revision 1's reading (P-1), written so that "yes" accepted
it, and the maintainer accepted all seven. The third column is the reading as decided.

| # | Question | Decision |
| :--- | :--- | :--- |
| P1 | Should an example read its expression by `inject()`, and the page recreate it on an edit? This amends Q20, which said inputs | Yes. The factories compile in a field initializer, where an input has no value (finding 2). With `inject()`, the code shown is the README's code plus one call |
| P2 | Should the page fetch the example's file, copied by the build, and not inline it? This amends Q11's "imported as raw text" | Yes. The copy is byte for byte and needs no suppressed error (finding 3). The cost is one request per source view |
| P3 | Should the highlighter be highlight.js? | Yes. It costs 3.65 kB more in transfer than Prism, and brings its own types and no build warning (M8) |
| P4 | Should the demo set `isolatedModules: false`, and `eval-core`'s 26 re-exports get a register entry that is not scheduled? | Yes. A consumer of the published package never compiles the barrels, so the entry is below the fix bar ([SR48](../standing-rules.md#sr48)) |
| P5 | Should the demo run without zone.js? | Yes. It is Angular 22's default and the four groups pass under it (M9). It also makes the demo the libraries' first zoneless consumer |
| P6 | Should the first deploy be step 8 of this plan, which needs the maintainer to enable Pages and start the workflow? | Yes. A workflow that has never run is a prediction, and the links of Q19 wait on a live site |
| P7 | Should the project's files be written by hand, and not by the Nx generator? | Yes. The generator edits the root manifest and `nx.json` beyond a step's file list. The prototype's files are the starting point |

## 9. Contract after this lands

Written by step 8: how a page is added, and how a new library joins the demo, for the demo steps
of Phases 12 and 17 (Q21).

## 10. Retrospect

Written by step 8.
