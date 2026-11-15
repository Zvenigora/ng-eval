# The demo application — design session 1: questionnaire and outputs

The result of one grilling session, on 2026-11-15, for Phase 19 of
[`ROADMAP.md`](../../ROADMAP.md): a demo application for the three published libraries, built so
that `eval-rules` and `eval-template` can join it. It is **not a plan** and nothing here is built.
It is the record to review, and the input to Phase 19's plan, [`plan.md`](plan.md).

- "Settled" means the maintainer answered the question. Every decision here is settled; this
  record makes no reading of its own.
- A statement here about the repository is a row of [§ 6](#6-facts-found-about-the-repository), or
  it says it was not verified. What the plan must measure before it relies on it is
  [§ 4](#4-left-for-the-plan).
- On 2026-11-15, after the session, the maintainer decided the seven questions the plan had
  raised from its measurements, its [§ 8](plan.md#8-questions), P1 to P7 here. Two amend an answer
  of the session, Q11 and Q20. § 2 is written to them, and [§ 5](#5-the-questionnaire) lists them
  last.
- The form follows the `eval-template` record,
  [`docs/eval-template/design-session.md`](../eval-template/design-session.md).

## 1. What was asked, and what it became

The request was a demo application for `eval-core`, `eval-signals` and `eval-forms`, extensible to
`eval-rules` and `eval-template`, with two purposes: a showcase of features with code samples, and
examples of use cases. Its form, a playground or code snippets, was open. So was its hosting,
ideally free. The published libraries were not to gain packages because of it.

| Asked | Found | Became |
| :--- | :--- | :--- |
| A playground or code snippets | These libraries evaluate strings at runtime, so an editable expression costs almost nothing. Editing and recompiling the Angular host code in the browser is the expensive kind of playground | Both, from one building block: the expression and the data are editable and the host code is shown read-only (Q3, Q20) |
| No extra packages in the libraries | Each library ships its own manifest, and lint reads imports against it. The root manifest is not what a consumer installs | The demo's packages go in the root `devDependencies` only (Q4) |
| Free hosting | The repository is public, and GitHub Pages is free for a public repository | GitHub Pages, deployed by hand (Q5, Q16) |
| Extensible to the two planned libraries | A separate repository could not show a library before it publishes | An application in this repository, built from the workspace's source, with one route folder per library (Q4, Q8, Q9) |

## 2. The design as agreed — Phase 19, the demo application

### 2.1 Purpose and visitor

The primary visitor is an Angular developer deciding whether to adopt the libraries, who arrives
from npm or a README and has a few minutes (Q1). Every page answers what a feature does and what
the visitor writes to get it. An existing user is served second, by the same pages; the READMEs
remain the reference.

The demo is a showcase and a set of use-case examples. Of the four things "test bed" can mean, it
takes two and leaves two (Q2):

- **Taken: a smoke case per example.** It pins the demo, so that an example cannot rot unnoticed.
- **Taken: a consumer build.** The demo's production build compiles the libraries as an
  application does. It compiles the workspace's source, not the built packages, so it does not
  check the packaging (Q8).
- **Left out: a maintainer workbench**, such as a page that reproduces a reported defect.
- **Left out: a benchmark page.**

The two left out are revisited after a release or two, if they then make sense. No library claim,
in a README, a CHANGELOG or a plan, cites the demo as its witness
([SR21](../standing-rules.md#sr21)): witnesses stay in the library's specs.

### 2.2 Where it lives and what it builds from

- An Nx application, project `demo`, at `apps/demo`, never published (Q4, Q22). It is an
  application, not a sixth package.
- Its extra packages go in the root `devDependencies` only. No library manifest changes (Q4).
- It imports the libraries through the existing path aliases, the workspace's source, for both
  `serve` and `build` (Q8).
- It joins the gate ([SR8](../standing-rules.md#sr8)) and CI as any Nx project does, so a broken
  demo turns the gate red (Q4).

### 2.3 The building block

One "live example" block makes up every page (Q3, Q11, Q12, Q20):

- **An example is one small standalone component in its own file.** It receives its expression and
  its data from the page: by `inject()`, with the page creating it again on an edit (P1, which
  amended Q20's inputs). For a forms example what it receives is the field schema.
- **The page shows that file's text**, never a copied snippet. The build copies the file, and the
  page fetches it (P2, which amended Q11's raw-text import). The whole file is shown, with no
  region markers in the first version.
- **Beside it, two editable boxes** hold the current values: "expression" and "data". Data and
  schemas are edited as JSON text. An example whose context needs functions defines them in its
  file (Q22).
- **The result is live.** An error is shown as the message it carries, in place of the result
  (Q22).
- **Every code block has a copy-to-clipboard button** (Q12).
- **No TypeScript is compiled in the browser.** There is no StackBlitz and no WebContainer (Q3).

A free-form "try an expression" page for `eval-core` is the same block with nothing fixed.

### 2.4 The site's organisation

Two top-level sections (Q9):

- **Features**, grouped by library. Each group is one lazy-loaded route folder, so a new library is
  one folder and one navigation entry, with no change to the shell.
- **Use cases**, outside the grouping, since a realistic one may combine several libraries.

Routing is hash routing in the first version (Q17), so an address reads
`/ng-eval/#/features/core/scopes`. A fallback page or prerendering may replace it later.

### 2.5 The first version

Capped at the shell, the building block, the free-form page, twelve feature pages and three use
cases (Q10). Each feature page mirrors a section its package's README already has, and links to it
for the contract (Q14).

| Group | Feature pages |
| :--- | :--- |
| core | Evaluate and compile · Scopes and case-insensitive lookup · Hooks and trace |
| signals | Expression to `Signal` · Dependency introspection · Async expressions |
| forms, `/reactive` | The field schema quick start · When a rule fails · Schema and expression validation at bind |
| forms, `/signals` | The three registrars and their polarity · Reusing a schema function · The error policy |

The three use cases (Q15):

1. **A form driven by configuration.** The field list arrives as JSON, each field with the
   expressions `eval-forms` defines, as it would from a server. Those are `visible` and `text` at
   both adapters, and `disabled` at `/signals` only. `eval-forms`.
2. **Formula fields.** An order whose totals, discounts and tax are formulas stored as strings
   beside the data, recomputing as the visitor types. `eval-signals`.
3. **A filter the user writes.** A data table and a box for an expression such as
   `price > 100 && category == 'books'`, compiled once and run per row. `eval-core`.

Left for later pages: statements, async evaluation in `eval-core`, colon-joined names, the
iteration budget and coercion. After the first version a page is one commit, with no plan
([SR1](../standing-rules.md#sr1)).

### 2.6 Look, and what the site does not do

- No component library: no Angular Material and no Tailwind. Plain CSS, a plain `<textarea>` for
  editing, and one small syntax highlighter for the read-only code (Q12). A code editor may replace
  the textarea later without changing an example.
- The site title is "ng-eval". It follows the visitor's light or dark setting and works at phone
  width (Q22).
- No analytics, no cookies and no tracking (Q22).
- **No expression in the address**, and so no "share this link", in the first version (Q13). A
  visitor typing their own expression is a trusted author. A link that carries one lets a stranger
  choose what evaluates in another visitor's browser. It is a later decision of its own, read
  against [`SECURITY.md`](../../SECURITY.md).
- **No page about security** (Q22). The site links to `SECURITY.md`, and the free-form page shows
  a refusal's own message when one occurs.

### 2.7 Hosting

GitHub Pages, at `zvenigora.github.io/ng-eval/`, built by a GitHub Actions workflow (Q5).

- **The workflow runs only when the maintainer starts it**, and builds from `master` (Q16). The
  demo builds from source, so a deploy on every push would show behaviour that an install from npm
  does not yet give.
- **The footer shows each package's version and the commit** the site was built from (Q16).
- Enabling Pages in the repository's settings is a one-time step, taken when the workflow exists.
- **The link to the site** goes in the root README and the repository's homepage field as soon as
  the site is live, and in each package README at that package's next ordinary release. No release
  is made only to add the link (Q19).

### 2.8 The process the demo runs under

A reduced set of the standing rules, to be written as one rule in the plan's § 0 (Q18):

- **Applies:** the gate ([SR8](../standing-rules.md#sr8)), commits only when asked
  ([SR34](../standing-rules.md#sr34)), files changed through Edit and Write
  ([SR36](../standing-rules.md#sr36)), and no `eslint-disable`.
- **Does not apply:** the `code-reviewer` before each commit, which
  [SR33](../standing-rules.md#sr33) requires for `modules/` and `tools/` only; a probe for each
  check ([SR15](../standing-rules.md#sr15)); and the claim-to-witness table
  ([SR21](../standing-rules.md#sr21)).
- **In exchange, a page states only what its example does**, and links to the README section that
  holds the contract. It states no limit and no guarantee of its own. This restriction is what the
  exemption rests on.
- **A smoke case is a Jest component test**, one per example. There is no browser end-to-end
  runner.

### 2.9 Order, and the two planned libraries

- **Phase 19 runs before Phases 12 and 17**, as a thin first version (Q7). The order between
  Phases 12 and 17 stays the maintainer's, and open.
- **Each of those plans gets one added step, before its release step**: three feature pages and
  one use case for its library (Q21). The demo is a library's first real consumer, and an awkward
  shape found before 0.1.0 publishes is still free to change.
- **That step is written when the phase starts**, as a revision of its plan. Neither
  [`eval-rules/plan.md`](../eval-rules/plan.md) nor
  [`eval-template/plan.md`](../eval-template/plan.md) changes now.

## 3. What this session fixed for Phase 20

Phase 20, the customer documentation, keeps its own design session (Q6). It reopens
[Phase 11's § 3.1](../documentation/phase-11-plan.md) D1, one README per package and no guide
file, and this session did not decide that. It fixed two things only:

1. **The demo is a plain Angular application, not a documentation generator.** Live examples need
   Angular 22 running.
2. **The site leaves room for a guide section**, which Phase 20 may fill or leave empty.

## 4. Left for the plan

None of these was measured in this session, and the plan measures each before it relies on it
([SR22](../standing-rules.md#sr22)).

| Point | What the plan must find |
| :--- | :--- |
| The raw-text import | How a component file's text is imported at build time under the application builder, and that the text shown is the file that ran |
| The highlighter | Which one, and its size in the built site |
| The library source under the application's configuration | That all five entry points compile cleanly when an application compiles them, at the strictness each library sets for itself |
| The lint boundary | A tag for the demo that may depend on all three scopes, with nothing permitted to depend on it |
| The base address | The base href and asset paths under `/ng-eval/` on Pages, with hash routing |
| The root manifest | The packages the application adds to the root `devDependencies`, installed without `--force` ([SR37](../standing-rules.md#sr37)), as a listed file of one step ([SR3](../standing-rules.md#sr3)) |
| The smoke cases | That Jest renders an example of each of the four groups, the `/signals` forms group included |
| The step list | About six to eight steps (Q10), with their exit criteria |

## 5. The questionnaire

All settled on 2026-11-15. Q2 was asked twice: the maintainer asked what a test bed would be, and
the second asking named four meanings.

**One correction, made after the session.** Q14 and Q15 as asked described the forms pages as
showing "visible, disabled and required" expressions. `eval-forms` has no `required` property, and
its `/reactive` adapter has no `disabled`: the properties are `visible` and `text` at both
adapters, and `disabled` at `/signals` only ([§ 6](#6-facts-found-about-the-repository)). The
pages and the use case show those, and § 2.5 is written to them. The maintainer's answers stand,
since neither chose a property.

| Q | Question | Answer |
| :--- | :--- | :--- |
| Q1 | Who the demo is for | An Angular developer deciding whether to adopt; existing users second |
| Q2 | Is it a test bed | A smoke case per example and a consumer build, for now. No maintainer workbench and no benchmark page; revisited in later releases if it makes sense |
| Q3 | A playground or snippets | The expression and the data are editable on every example; the host code is read-only; no TypeScript compiled in the browser |
| Q4 | Where it lives | An Nx application at `apps/demo` in this repository, never published, its packages in the root `devDependencies` |
| Q5 | Hosting | GitHub Pages, by a GitHub Actions workflow |
| Q6 | The boundary with Phase 20 | This session designs Phase 19 only, and fixes the two points of § 3 |
| Q7 | Order against Phases 12 and 17 | The demo first, thin, covering the three published libraries |
| Q8 | Source or built packages | The workspace's source, through the path aliases, for `serve` and `build` |
| Q9 | The site's organisation | Features by library, one lazy-loaded folder each; use cases outside the grouping |
| Q10 | The first version's size | The shell, the block, the free-form page, about twelve feature pages and three use cases; later pages one commit each, with no plan |
| Q11 | The code shown | The example's own file, imported as raw text at build time. Amended by P2 |
| Q12 | Look and dependencies | No component library; plain CSS, a `<textarea>`, one highlighter; a copy-to-clipboard button on each code block |
| Q13 | An expression in the address | None in the first version |
| Q14 | The feature pages | The twelve of § 2.5, and the free-form page |
| Q15 | The use cases | The three of § 2.5 |
| Q16 | When the site deploys | Only when the maintainer starts the workflow, from `master`, with versions and the commit in the footer |
| Q17 | Routing on Pages | Hash routing in the first version |
| Q18 | The process for `apps/demo` | The reduced set of § 2.8, with pages that state no limit and no guarantee |
| Q19 | Where the link appears | The root README and the repository's homepage at once; each package README at its next ordinary release |
| Q20 | An example file's shape | The expression and the data are inputs; the whole file is shown beside two boxes that hold the current values. Amended by P1 |
| Q21 | How Phases 12 and 17 take their demo work | One added step each, before the release step, three feature pages and one use case, written when the phase starts |
| Q22 | The defaults | Project `demo` at `apps/demo`, title "ng-eval"; light and dark, phone width; no analytics, cookies or tracking; no security page; JSON for data and schemas; an error shown as its message |
| Q23 | What the session produces | This record, its link in [`docs/README.md`](../README.md), and the roadmap entry changed. The plan is a separate session, and nothing is committed until asked |
| P1 | How an example receives what the visitor typed | By `inject()`, and the page creates the example again on an edit. The libraries' factories compile in a field initializer, where an input has no value |
| P2 | How the page gets the file's text | The build copies the file, and the page fetches it |
| P3 | The highlighter | highlight.js |
| P4 | `isolatedModules`, which `eval-core`'s source does not compile under | Off for the demo; `eval-core`'s 26 re-exports recorded in the register, not scheduled |
| P5 | zone.js | The demo runs without it |
| P6 | The first deploy | The plan's last step; the maintainer enables Pages and starts the workflow |
| P7 | The project's files | Written by hand, not by the Nx generator |

## 6. Facts found about the repository

Read on 2026-11-15, at 5386d86.

| Fact | Where |
| :--- | :--- |
| The repository is public, and GitHub Pages is not enabled for it | The GitHub API: the repository's visibility, and no Pages site |
| Each library has its own manifest, with peer dependencies and no dependency of the root's | `modules/eval-forms/package.json`, read; the other two by `CLAUDE.md` |
| The root manifest lists no application builder | `package.json`: `@nx/angular`, `ng-packagr` and `@angular/cli` are there, `@angular/build` is not. Whether one is installed transitively was not checked |
| The workspace has generator defaults for an Angular application: CSS, ESLint, Jest, no end-to-end runner | `nx.json`, `generators` |
| The five entry points have path aliases | `tsconfig.base.json`, `paths` |
| Lint boundaries are by `scope:` tag, three scopes today | `eslint.config.mjs` |
| CI runs `npm run build` and `npm test`, both `nx run-many` with no project filter, and no lint | `.github/workflows/node.js.yml`, `package.json` |
| The package READMEs have a section for each of the twelve feature pages' subjects | The three READMEs' headings |
| `eval-forms` defines `visible` and `text` at `/reactive`, and `visible`, `text` and `disabled` at `/signals`; it has no `required` | `modules/eval-forms/README.md`, "Entry points" and "The field schema" |

Not verified: the sites named to the maintainer as examples of a test bed and of a showcase were
named from memory and not opened in the session, so none is cited here.
