# Phase 10 Plan — documentation restructure

**Date**: October 14, 2026
**Revision**: 1 — initial plan.
**Target**: the repository's documents. Shipped files touched: `modules/eval-core/README.md` (step 3),
`modules/eval-signals/README.md` and `modules/eval-forms/README.md` (step 4), and each package's
`CHANGELOG.md` with them. Specs touched: comment lines in all three projects; test cases in `eval-core`
(steps 2, 3, 4 and 5) and in `eval-signals` and `eval-forms` (step 4).
**Also touches**: no library code. No exported symbol, no `.d.ts` and no version changes, unless § 8
q1 adds a release step.
**Retires**: [BL-F19](../backlog.md#f19), in step 6.
**Source**: the request of 2026-10-14, which fixed decisions D1–D6 and proposed the step shape that § 4
adjusts. A second request the same day, before any step had run, added D7 and amended D1 (§ 3.1).
**Objective**: two entry pages, a consumer landing page and a maintainer index, over documents that are
each true where they stand, with nothing under `docs/` moved.

**Conclusion, stated first so the rest reads as its argument**: delete ten stale documents after an
audit that finds two facts worth keeping (§ 3.3). Rewrite `SECURITY.md` to what the code does, and gate
the identifiers it names (§ 3.10). Make `modules/eval-core/README.md` the whole of `eval-core`'s
documentation, with every `javascript` block executed (§ 3.4). Give the three package READMEs one
opening, with their quoted peer ranges gated against their manifests (§ 3.5), **before** the root
README stops documenting the API, so that no shipped README points at documentation that has gone. Then
turn the root README into a landing page with no `javascript` block and no quoted range (§ 3.6), and
add `docs/README.md` as the maintainers' index, with `ROADMAP.md` condensed beside it (§ 3.7). Nothing
ships in a package until § 8 q1 is answered. Three package READMEs change, so the npm pages lag the
repository until then.

---

## 1. Current state

### 1.1 What exists today

Measured at 6c5488c, the commit before this plan.

| Document | Lines | Role today | After Phase 10 |
| :--- | ---: | :--- | :--- |
| `README.md` | 484 | `eval-core`'s API documentation in 11 `javascript` blocks, 1 `json` block and 1 unlabelled install fence; a "Recent Major Improvements (2025)" banner; the three packages; security; a "Documentation Structure" table whose rows link `IMPROVEMENTS.md` and `PERFORMANCE.md`. 38 checked links | The landing page (step 5) |
| `modules/eval-core/README.md` | 393 | Ships in the tarball. Names the exports and documents the options. Says the full documentation is in the repository README (`:9`, `:15`). 18 `javascript` blocks, all executed | The package's whole documentation (step 3) |
| `modules/eval-signals/README.md` | 593 | Ships. Says expression syntax, security and the evaluator's options are in the repository README (`:11`) | Opening aligned (step 4) |
| `modules/eval-forms/README.md` | 864 | Ships. The same pointer (`:16`) | Opening aligned (step 4). Restructuring it is § 8 q2 |
| `SECURITY.md` | 578 | The security document. 13 fenced blocks (12 `typescript`, 1 `js`). Linked from the root README and from `eval-core`'s README, each time at `#reviewed-external-advisories` | Rewritten (step 2) |
| `ROADMAP.md` | 508 | One section per phase, a "Suggested order" and a "Deferred work" pointer. 63 checked links | Gains a Phase 10 entry with this plan; condensed (step 6) |
| `CONTRIBUTING.md` | 200 | Setup, code style, the release procedure | Gains the pointer to `docs/README.md` (step 6) |
| `CHANGELOG.md` | 80 | Lists the three package changelogs, and holds workspace changes that ship in no package | One line per step that ships in no package |
| `docs/` | — | 55 tracked files (54 `.md` and one `.txt`): design records, the register, two worked examples, and eight of D3's ten files | 48 after step 1 (counting this plan), 49 with `docs/README.md`, 50 with the retrospect |

The suites that read these documents:

| Spec | Reads | Count it holds |
| :--- | :--- | :--- |
| `modules/eval-core/src/lib/readme-examples.spec.ts` | `modules/eval-core/README.md` | `README_JAVASCRIPT_BLOCKS = 18` |
| `modules/eval-signals/src/lib/readme-examples.spec.ts` | `modules/eval-signals/README.md` | `README_TS_BLOCKS = 14`, `README_SH_BLOCKS = 2` |
| `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts` | `modules/eval-forms/README.md`, between the headings ``## Quick start — Reactive Forms (`/reactive`)`` and ``## Signal Forms — `/signals` ``; `docs/forms/worked-example.md` | `README_REACTIVE_TS_BLOCKS = 11`, `WORKED_EXAMPLE_TS_BLOCKS = 11` |
| `modules/eval-forms/signals/src/lib/readme-examples.spec.ts` | `modules/eval-forms/README.md`, blocks under ``Signal Forms — `/signals` `` and under `Expressions are validated too`; `docs/forms/worked-example-signals.md` | `README_SIGNALS_BLOCKS = 6`, `README_ASYMMETRY_BLOCKS = 1`, `WORKED_EXAMPLE_TS_BLOCKS = 10` |
| `modules/eval-core/src/public-api.spec.ts` | the root `README.md` **and** the package README | 6 cases of its own, 4 of which need the root README to import from `@zvenigora/ng-eval-core`. Nothing imports this file |
| `modules/eval-core/src/export-list.spec.ts` | both READMEs (F11, `it.each(['README.md', 'modules/eval-core/README.md'])`); the package README (F10) | 20 cases, each run twice (finding 3) |

So there are four `readme-examples.spec.ts` files, not three: `eval-forms` has one per adapter. The
baseline test counts are whatever the gate reports at this plan's commit, and step 1's green-baseline
run (`.claude/skills/step/SKILL.md` § 1) records them. Before this plan, `tools/doc-links.mjs` reported
342 files and 1349 links (21 in `.ts` comments) with 0 dangling, and `tools/release-tags.mjs` reported
34 rows and 44 tags with 0 failing.

### 1.2 Findings that shape the plan

Each finding cites the measurement in § 1.3 that produced it, or the file and line that shows it. A
line in `CLAUDE.md` is cited as it stands at this plan's commit, which adds one line above both
citations.

1. **Seven of the root README's eleven `javascript` blocks exist nowhere else** (M3). Three are already
   in the package README: Parsing, Discovery, and Scope (as `### Scopes`, with `thisArg` changed since
   A7). One is the bare import line. Seven are not there: two under Evaluation, one under Compilation,
   two under Async evaluation and compilation, one under Case-insensitive evaluation and one under
   Evaluation with state. The prose under "ESTree nodes supported", the statement list and "How
   statements differ from JavaScript" is in the root and nowhere else either.
2. **`public-api.spec.ts`'s published/unpublished case cannot witness step 3** (M3). The root README
   imports seven names from the package: `ParserService`, `EvalService`, `CompilerService`,
   `DiscoveryService`, `EvalContext`, `EvalScope` and `EvalScopeOptions`. The package README imports
   all seven already, so the case is green before step 3 and after it. What does discriminate step 3
   is that its new blocks' imports resolve (§ 4, step 3, criterion 4).
3. **`public-api.spec.ts` runs `export-list.spec.ts`'s cases a second time** (M5). It imports the
   helpers, and Jest registers the imported file's `describe` blocks with it: `export-list.spec.ts`
   alone runs 20 cases, and `public-api.spec.ts` runs 26, its own 6 plus the same 20. So removing one
   case from `export-list.spec.ts` lowers `eval-core`'s count by two. No spec imports any
   `public-api.spec.ts`, so a case added to one counts once.
4. **Four sentences in the shipped READMEs say the repository README documents something**
   (`modules/eval-core/README.md:9` and `:15`, `modules/eval-signals/README.md:11`,
   `modules/eval-forms/README.md:16`). All four become false at the commit that turns the root README
   into a landing page, unless they have been re-pointed first. That ordering problem is why § 4 moves
   the header alignment ahead of the landing page.
5. **Nine live comment lines cite package README lines that have already moved** (M6). They are stale
   now, before any step runs. `eval-signals`' `eval-signal-async.spec.ts:1251`, `:1270`, `:1300`,
   `:1346` and `:1379` cite `README.md:400-401`, `:395-398`, `:402-407`, `:381-383` and
   `:357-358`/`:389`; the text they name is now six lines lower, at `:401-404` onwards. `eval-forms`'
   `src/export-list.spec.ts:25` and `:359`, and `signals/src/public-api.spec.ts:8`, place
   `ExpressionRules` at `README.md:555`, but it is at `:172`, and `:555` is the
   `### Constructed, not computed` heading. `eval-core`'s `public-api.spec.ts:65` places the root
   README's two-line import at `README.md:291-292`, but it is at `:360-361`. They are the same class as
   [F18](../backlog-retired.md#f18) and F19. Step 4 re-points the eight in `eval-signals` and
   `eval-forms` by heading, as F18 did by symbol, since it edits the READMEs they cite. The ninth goes
   with the case that carries it, in step 5.
6. **The F10 allowlist's docblock count is stale** (M4). `export-list.spec.ts:535-536` says the package
   README "names twelve of the fifty-nine" exports. Measured, it names 14 of 60: `ASYNC_HOOK_MESSAGE`,
   `CompilerService`, `DiscoveryService`, `EMPTY_COMPLETION`, `EvalContext`, `EvalHooks`, `EvalScope`,
   `EvalScopeOptions`, `EvalService`, `ParserService`, `createDependencyTracker`, `evaluateAsync`, `parse`
   and `provideColonIdentifiers`. Step 3 raises the number further.
7. **`SECURITY.md` documents an API that does not exist** (M7). Its § 6 defines a `SecurityOptions`
   interface and calls `service.secureEval(expression, context, secureOptions)`. Its §§ 2 and 4 call
   `executeWithTimeout` and `safeExecuteFunction`. No `.ts` file under `modules/` declares any of the
   four. It claims "35/35 security tests passing" (`:7`, `:59`). Its § 9 lists "Complete protection"
   against prototype pollution directly above its own advisory GHSA-jh43-xc7j-93c2, which records the
   bypass. Its "Advisories for ng-eval" and "Reviewed External Advisories" sections (`:422-528`) are
   current. Step 2 rewrites the rest (D7).
8. **The `qs` override's reason is recorded only in a file D3 deletes** (M7). The root `package.json`
   overrides `qs` to `^6.14.1`, added by 2b655a7 on 2026-01-02. `docs/repository-audit.md` is the only
   document that says why: the transitive `qs` prototype-pollution advisory in the dev toolchain. Every
   other override (`nx`'s three, `postcss`, `less` and `@hono/node-server`) is recorded in
   [F16](../backlog.md#f16).
9. **Nothing gates a quoted peer range** (M7). No spec reads a `peerDependencies` field.
   `modules/eval-signals/README.md:20` and `modules/eval-forms/README.md:66-71` quote ranges today, and
   Phase 9 step 7 found the first of these at its confirmation gate rather than through a failing check.
   `:20` abbreviates `@angular/core >=19.0.0` to `>=19`. D1 as amended keeps ranges off the landing
   page, and step 4 gates the ones the package READMEs quote.
10. **Two maintainer files name "the README's" node list** (M6). `CLAUDE.md:427-428` and
    `.claude/agents/code-reviewer.md:218` require a new visitor to add "an entry in the README's
    'ESTree Nodes Supported' list". That list is the root README's `### ESTree nodes supported:`, which
    step 3 moves.
11. **The package READMEs link to other files by absolute URL only** (M3). None of the three has a
    relative cross-file link; their relative links are same-file anchors. The root README's two links to
    `eval-core` CHANGELOG headings (`#050---2026-09-17`, `#040---2026-09-15`) are relative and checked.
    Carried into the package README under its convention, they become absolute and leave the gate.
12. **Nothing links into a `ROADMAP.md` heading** (M6). 0 anchored links point there. 121 lines in 26
    files mention the file by name: 100 lines in 19 design records and in `backlog-retired.md`, 6 in
    the three package CHANGELOGs, and 15 in 4 live files (`CLAUDE.md` 2, `docs/backlog.md` 8, and the
    two `eval-forms` `readme-examples.spec.ts` comments 3 and 2). Condensing it therefore dangles no
    link. A recorded mention of a section that is removed then refers to the file at the commit it was
    written against, as a line citation in a design record does. Step 6 reads the 15 live lines.
13. **BL-F19 is unchanged since it was recorded.** `isDangerousProperty(foundKey)` is at
    `member-expression.ts:211`, and `CLAUDE.md:314` cites `:188`. The entry's recorded fix is to cite the
    symbol, not the new line, "so the citation does not move again with the next edit above it". One
    link points at `#f19`: its index row, `docs/backlog.md:260`.
14. **Step 5's test count, measured: −5** (M8). Four root-README cases leave `public-api.spec.ts`, and
    one leaves `export-list.spec.ts`, which runs twice. The D5 case is added to `public-api.spec.ts`,
    which nothing imports, so it runs once. § 4, step 5 lists each case.

### 1.3 Measurements run for this plan

M1–M7 were scratch scripts outside the repository, read-only, run at 6c5488c. M8 edited three tracked
files in the working tree, ran the suite, and restored the three from the commit. Nothing from any of
them is committed.

| ID | Question | Method | Result |
| :--- | :--- | :--- | :--- |
| M1 | Gate baselines | `node tools/doc-links.mjs`, `node tools/release-tags.mjs` | 342 files, 1349 links (21 in `.ts` comments), 0 dangling; 34 rows, 44 tags, 0 failing |
| M2 | D2: what binds `docs/` paths | A script that applies `doc-links.mjs`'s own rules for a checked link, plus a `docs/<tracked path>` scan outside links | § 3.2 |
| M3 | What the root README holds, and where else it is | Fence scan of both READMEs; their `import` lines; their links | Findings 1, 2 and 11 |
| M4 | What the package README documents | `export-list.spec.ts`'s `exportedNames` and `documentedNames`, re-implemented over the TypeScript API | 60 exports, 14 named in code spans; the root README names 1 (`call`) |
| M5 | How many cases the README specs run | `nx test eval-core --testPathPatterns=public-api.spec`, and then `export-list.spec` | 26 and 20 |
| M6 | Citations and mentions | `git grep` for each D3 name, for `README.md:<n>`, for `ROADMAP.md#`, for `SECURITY.md#` and for "the README's" | § 3.3 and findings 5, 10 and 12 |
| M7 | Claims checked against code and manifests | `git grep` over `modules/**/*.ts` for each named symbol; the four `package.json`s; `call-expression.ts`, `prototype-pollution-guard.ts` and `eval-options.ts` read | Findings 7–9; § 3.3; § 3.10 |
| M8 | Step 5's count | Step 5's edits to `public-api.spec.ts` and `export-list.spec.ts` applied, then `nx test eval-core --skip-nx-cache`: once against the current root README, then once against a root README with no `javascript` block; then the per-file counts | 2448 → 2443. Against the current root README, 1 failure, the D5 case alone. Against the stub, all green: `public-api.spec.ts` 22, `export-list.spec.ts` 19 |

---

## 2. Scope

### In scope

- D1–D7 (§ 3.1), as steps 1–6.
- The two facts the D3 audit keeps (§ 3.3), at the destinations it names.
- The stale line citations of finding 5, in the step that edits each README they cite, or removes the
  case that carries one.
- BL-F19 (finding 13), in step 6.
- Three new kinds of case: `SECURITY.md`'s identifiers (step 2), each package README's quoted peer
  ranges (step 4), and D5 (step 5).
- `CLAUDE.md`'s active-plan sentence and `ROADMAP.md`'s Phase 10 entry, in this plan's own commit; and
  the sentences that name the root README's node list (step 3).

### Out of scope

- **Moving or renaming anything under `docs/`.** D2 decides this, and § 3.2 records why.
- **Restructuring `eval-forms`' README** beyond its opening. § 8 q2.
- **Guide files** (D6).
- **Releases.** § 8 q1. Step 7 is held on it.
- **A gate on `docs/README.md`'s completeness.** § 8 q4. Step 6 runs the check once and reports it.
- **Library code.** A change to any non-spec `.ts` file other than in a comment line is a
  stop-and-replan. That includes exporting anything new from an internal module for a spec to read.

---

## 3. Design

### 3.1 The decisions — recorded, not reopened

- **D1. Two document groups, defined by entry pages rather than by folders.** The consumer entry is the
  root `README.md`, rewritten as a landing page: what ng-eval is, the three packages, install, links to
  each package README, the worked examples, `SECURITY.md` and the CHANGELOGs. The maintainer entry is
  `CONTRIBUTING.md`, which points to a new `docs/README.md` index covering the backlog pair, the
  completed plans as design records with their summaries, the gates, and the worked examples marked as
  consumer documents. `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md` and `CHANGELOG.md`
  stay at the root.
  *Amended by the second request, before any step*: the landing page quotes **no** peer ranges. It
  links to the package READMEs, and the header-alignment step adds, per package, a case asserting that
  every peer range its README quotes equals its `package.json`'s `peerDependencies` (§ 3.5).
- **D2. No file under `docs/` moves or is renamed.** § 3.2 gives the reason, with counts.
- **D3. The stale documents are deleted after a per-file audit**: `IMPROVEMENTS.md`, `PERFORMANCE.md`,
  `docs/common-classes.md`, `docs/eval-classes.md`, `docs/eval-functions.md`, `docs/eval-visitors.md`,
  `docs/services.md`, `docs/steps.txt`, `docs/remediation-plan.md` and `docs/repository-audit.md`.
  § 3.3 is the audit. The published `eval-core` CHANGELOG line that names two of them
  (`modules/eval-core/CHANGELOG.md:848`, under 0.2.3, which was never published to npm) stays as
  written.
- **D4. `eval-core`'s API documentation moves from the root README into
  `modules/eval-core/README.md`**, rewritten so that every `javascript` block runs. It is executed by
  `readme-examples.spec.ts` (with `README_JAVASCRIPT_BLOCKS` changed to match) and covered by the
  export-list and public-api cases. The README's opening paragraph, which says the full documentation
  is in the repository README, changes accordingly. The README ships, so the change gets an
  `[Unreleased]` line in `eval-core`'s CHANGELOG.
- **D5. The root README contains no `javascript` block.**
- **D6. No separate guide files in this phase.**
- **D7. `SECURITY.md` is rewritten to what is true, in its own step**, after the deletions and before
  the `eval-core` README step. It covers the threat model, the protections that exist (the
  prototype-pollution guard, including the resolved-key re-check and the primitive carve-out; call
  sandboxing; the iteration budget), the documented limits, the reviewed external advisories, and
  reporting. It drops `secureEval`, `SecurityOptions`, `executeWithTimeout`, `safeExecuteFunction` and
  every "complete" or "comprehensive" protection claim. The anchor `#reviewed-external-advisories`
  survives, because the published `eval-core` README links it. Ships in no package (§ 3.10).

### 3.2 D2 — why nothing under `docs/` moves

Every count here comes from M2. A checked link is one that `tools/doc-links.mjs` resolves. A plain-text
mention is a `docs/<tracked path>` outside any markdown link, which the gate does not see.

| What binds a `docs/` path | Count | Where |
| :--- | ---: | :--- |
| Checked links into `docs/` | **1081**, to 41 distinct files | 900 from 43 files under `docs/`; 61 from 3 root `.md` files; 100 from the three package CHANGELOGs (`eval-core` 56, `eval-forms` 29, `eval-signals` 15), all three of which ship in their tarballs; 20 from `.ts` comment lines in 13 files |
| Plain-text path mentions | **405** | 198 in `.ts` comment lines in 77 files; 135 under `docs/` in 33 files; 31 in 4 root `.md` files; 10 in the package READMEs and CHANGELOGs; 24 in 4 other tracked files (`.claude/`, `tools/`, `jest.preset.js`); 7 in `.ts` code lines in 6 files, all of them test titles |
| Paths read at runtime | **3** | `eval-forms/reactive/src/lib/readme-examples.spec.ts:715` reads `docs/forms/worked-example.md`, `eval-forms/signals/src/lib/readme-examples.spec.ts:719` reads `docs/forms/worked-example-signals.md`, and `tools/release-tags.mjs:20` reads `docs/backlog.md` |
| Absolute links from shipped READMEs | **7**, to 5 files | `modules/eval-forms/README.md:57` (`forms/phase-6-plan.md`), `:155` and `:858` (`forms/worked-example.md`), `:616` and `:860` (`forms/worked-example-signals.md`); `modules/eval-signals/README.md:355` (`signals/phase-5-plan.md`) and `:397` (`backlog.md#a24`) |

A move would cost three things that a step cannot buy back:

- **The 1081 links are the cheap part.** The gate lists every one of them, and each could be re-pointed.
- **The 405 mentions are the expensive part.** Nothing finds them, and 135 of them sit in design
  records, whose text `CLAUDE.md` keeps as written. A moved file would leave each of those mentions
  naming a path that no longer exists, with no check to say so. That is the failure that hid
  [A8](../backlog-retired.md#a8) for five phases, as the register's preamble records.
- **The 7 absolute links are in tarballs already on npm.** They point at `master`. A move breaks them
  for every published version that carries them, and no later release can rewrite those versions.

So the index (D1) gives `docs/` its structure, and the paths stay where they are.

### 3.3 D3 — the per-file audit

Each row records what the file still says truly that no other document says, and where that fact goes.
"Inbound" lists the references from outside the ten files; references among the ten are deleted with
them.

| File | Lines | Last commit | Still true and stated nowhere else | Goes to | Inbound |
| :--- | ---: | :--- | :--- | :--- | :--- |
| `IMPROVEMENTS.md` | 528 | ba970ac, 2025-08-20 | Nothing. Its "511/511 tests" and "complete protection" are contradicted by B6. Its recommended `Function call error:` rewrap was removed in 0.7.0 (A6). Its visitor-result cache is disabled (`CLAUDE.md`, A32). Its `SecurityOptions` and `ParserOptionsExtended` never existed | nothing | link `README.md:461`; plain text `docs/a8/step-2-plan.md:368` (design record) |
| `PERFORMANCE.md` | 276 | ba970ac, 2025-08-20 | Nothing. The property-lookup cache is in `CLAUDE.md` and A31. The disabled visitor-result cache is in `CLAUDE.md` and A32. It imports `getPropertyLookupCacheStats` and `getVisitorResultCacheStats` from the package, but both live in `internal/visitors`, which `public-api.ts` does not re-export. `service.dispose()` exists on no service | nothing | link `README.md:462`; plain text `docs/a8/step-2-plan.md:368` (design record) |
| `docs/common-classes.md` | 16 | 811b2cb, 2026-10-04 | A `Cache` key is a SHA-256 hash (`cache.ts:53`), and a `Registry`'s case sensitivity follows its options. Its "`BaseContext`: a simple class" is false: it is a type alias | nothing. F10 allowlists these exports as `building-block`, meaning usable and deliberately undocumented, and documenting them is outside D4 | link `docs/backlog-retired.md:2116` (B5's record, "`Queue`'s line in `docs/common-classes.md`") |
| `docs/eval-classes.md` | 51 | bccc049, 2024-01-18 | **`ParserOptions`' defaults**: `ecmaVersion` 2020 and `cacheSize` 100, with `extractExpressions` `true` for `ParserService` and `false` for the three services. This is why `service.parse('1 + foo')` is a `BinaryExpression` while the services parse a `Program`. Its account of `extractExpressions`, "store them in the expressions property", is false. Its `EvalResult.startDate` and `endDate` are private fields. The rest of its members are in their classes' documentation comments, which ship | step 3: one sentence under `modules/eval-core/README.md`'s `### Parsing` | none |
| `docs/eval-functions.md` | 120 | 2e33172, 2023-12-27 | **The free functions are the services' DI-free forms**: `parse`, `extract`, `evaluate`, `evaluateAsync`, `compile`, `call`, `compileAsync` and `callAsync`, usable without an injector over `EvalState.fromContext(...)`. Its imports name a package `'ng-eval'`, which does not exist | step 3: one sentence under the package README's exported-entry-points section, naming them in code spans. Prose only, so no block is added | none |
| `docs/eval-visitors.md` | 21 | 2462613, 2023-12-29 | Nothing. Its 18 node types are a subset of the root README's list, which step 3 moves. Its title is "Eval Classes" | nothing | none |
| `docs/services.md` | 106 | 9e836b1, 2024-01-09 | Nothing. It gives `ParserService`'s `extractExpressions` default as `false`, when it is `true`. Its `compilerService.call(fn, context, options)` is wrong: `call` takes a state, and `simpleCall` takes a context. Its imports name `'ng-eval'` | nothing | none |
| `docs/steps.txt` | 99 | 2462613, 2023-12-29 | Nothing: generator commands from 2023 and a to-do list | nothing | none (the two below, deleted with it) |
| `docs/remediation-plan.md` | 181 | 64fa3ab, 2026-08-02 | Nothing. Its ERR-1 to ERR-4 are fixed (no `@angular/common` peer, and `inject()` in every service), and HYG-1 is done (`scripts/debug/`). Its HYG-2, "review `docs/steps.txt`", is marked COMPLETED while the file is still there, and this phase finishes it | nothing | plain text `modules/eval-core/CHANGELOG.md:848` (stays, D3) |
| `docs/repository-audit.md` | 129 | 64fa3ab, 2026-08-02 | **The `qs` override's reason** (finding 8). The rest describes one project with 511 tests at 0.2.4 | step 1: one sentence in [F16](../backlog.md#f16) | plain text `docs/a8/step-2-plan.md:364` (design record); `modules/eval-core/CHANGELOG.md:848` (stays) |

**So, outside the ten files**: 3 checked links (`README.md:461` and `:462`, `docs/backlog-retired.md:2116`)
and 3 plain-text mentions on 3 lines. The mentions are 2 lines of `docs/a8/step-2-plan.md`, which is a
design record, and 1 published CHANGELOG line. No live document mentions any of the ten in plain text.

### 3.4 D4 — where each root section goes

| Root README (lines) | Goes to | `javascript` blocks |
| :--- | :--- | ---: |
| Title, tagline, "Recent Major Improvements (2025)" (`:1-26`) | Dropped. Its "511/511 tests" and "complete prototype pollution prevention" claims are stale, the latter contradicted by B6 | 0 |
| Credits (`:29-32`), "Why ng-eval?" (`:38-40`) | The landing page (step 5) | — |
| "JavaScript expression parsing and evaluation" and the IMPORTANT note that this is not a sandbox (`:34-36`) | The package README's `## Security` (§ 3.5), and the landing page | — |
| Table of contents (`:42-59`) | Dropped | — |
| Usage / Install (`:62-78`) | The package README's `## Install`, as an `sh` block, with the peer line from the manifest. The bare import block is not carried: each section imports what it uses | 0 (the root has 1 here) |
| Parsing (`:82-114`) | `### Parsing` (exists). It gains the AST `json` block, which its case asserts with `toEqual`, and § 3.3's `ParserOptions` defaults sentence | 0 |
| Evaluation (`:116-147`) | New `### Evaluation — EvalService`, holding the `simpleEval` block and the built-ins block. The built-ins block gains a line that uses what it adds, so its case asserts both halves of the sentence above it | **+2** |
| Compilation (`:149-160`) | New `### Compilation — CompilerService` | **+1** |
| Async evaluation and compilation (`:163-200`) | New `### Async evaluation and compilation` | **+2** |
| Discovery (`:202-211`) | `### Discovery` (exists) | 0 |
| ESTree nodes supported, destructuring, statements, "How statements differ from JavaScript" (`:213-296`) | New `## Supported syntax`, as prose, with `### ESTree nodes supported` and `### How statements differ from JavaScript` under it. Its two CHANGELOG anchors become absolute (finding 11) | 0 |
| Options › Case-insensitive evaluation (`:298-315`) | New `### Case-insensitive evaluation` under `## Options` | **+1** |
| Per-node timing, Evaluation hooks, Iteration budget (`:317-327`) | Already in the package README. These are the pointers to it | 0 |
| Evaluation with state (`:329-354`) | New `### Evaluation with state` under `## Options`. `console.table(...)` becomes a read of `state.result.trace` with its value printed | **+1** |
| Evaluation with scope (`:356-392`) | `### Scopes` (exists) | 0 |
| Packages in This Repo (`:394-412`) | The landing page, and each package README's `## Sibling packages` (§ 3.5) | — |
| Related Packages (`:414-423`) | The landing page | — |
| Security (`:425-454`) | The landing page links the rewritten `SECURITY.md` (step 2) and its reviewed external advisories. The "2025 Update" bullets are dropped: "complete prototype pollution prevention" is false (B6, GHSA-jh43-xc7j-93c2) | — |
| Documentation Structure (`:456-465`) | Dropped. Step 1 removes its two rows that would dangle, and the landing page's own links replace it | — |
| Contributing, Code of Conduct, License (`:467-480`); the Copilot footer (`:484`) | The landing page; the footer is dropped | — |

**`README_JAVASCRIPT_BLOCKS`: 18 → 25.** The seven new blocks get seven new cases, by the spec's existing
rule that a block which re-declares its bindings starts a new case. If the step merges two blocks that
share their bindings, it corrects both numbers in this document and says so.

**The rewrite's rules**, which are the ones `docs/gates/plan.md` step 4 applied to the package README's
first twelve blocks: `private service: X;` and a bare `...` become `const service = inject(X);`. A
block that cannot run as printed changes its example, never its claim. Every value the case supplies
and the block does not print is added to the spec's numbered substitution list. The promise example's
`setTimeout(…, 1000)` is one such change, made so that the case does not wait a second.

### 3.5 One opening for the three package READMEs, and their quoted ranges gated

Every package README opens the same way, and each line of the opening is the package's own:

1. `# @zvenigora/<package>`, then what the package is, in one paragraph with no heading.
2. `## Install`: one `sh` install line, then a sentence naming **every** peer in the package's manifest
   with its range verbatim. For `eval-core` today these are `@angular/core >=19.0.0`, `acorn ^8.11.2`,
   `acorn-walk ^8.3.0` and `js-sha256 ^0.10.1 || ^0.11.0 || ^0.12.0 || ^1.0.0`.
3. `## Sibling packages`: the other two packages, each with one line and an absolute link to its
   README; the source repository's link; and, in `eval-signals` and `eval-forms`, the statement that
   expression syntax and the evaluator's options are documented in `eval-core`'s README. This replaces
   the four "repository README" sentences of finding 4.
4. `## Security`: one paragraph. ng-eval is not a sandbox. Absolute links to `SECURITY.md` and to its
   reviewed external advisories. `eval-core` keeps its GHSA-pj3p-xpg7-h7gw sentence.

The package's own sections follow, in their current order. This is a change of structure only. Step 3
writes `eval-core`'s opening in this shape, since D4 rewrites that README anyway, and step 4 brings the
other two into line with it. `eval-forms`' `## When *not* to use this library`, `## Entry points` and
`## Versions` follow the opening unchanged. Its `## Versions` keeps its manifest block and its reasons,
and the `## Install` peer sentence points to it.

**The quoted ranges are gated (D1, as amended).** Step 4 adds one case per package, in that package's
`src/public-api.spec.ts` (for `eval-forms`, the core entry point's), which no spec imports. Each reads
the package README and the package's `package.json`, and asserts two things:

- every code span of the form `` `<peer> <range>` ``, and every `"<peer>": "<range>"` line in a fenced
  block, anywhere in the README, where `<peer>` is a key of `peerDependencies`, carries exactly the
  manifest's range;
- the `## Install` section names every key of `peerDependencies`.

`eval-signals`' `:20` abbreviates `>=19.0.0` to `>=19` (finding 9), so the case is red against it until
step 4 writes the range verbatim. What the case does not see: a range written in prose without its
package name, such as `eval-forms`' "The `eval-core` floor is 0.12.0". Its docblock says so.

**Headings that must not change**, because a count case finds its blocks by them:
``## Quick start — Reactive Forms (`/reactive`)``, ``## Signal Forms — `/signals` `` and
`Expressions are validated too`. The published anchors into these READMEs that other files use stay
as well: `eval-signals`' `#async-expressions` (`eval-forms` README `:844`, `ROADMAP.md:267`), and
`eval-forms`' `#caseinsensitive-per-registration` (`docs/forms/worked-example-signals.md:240`) and
`#two-things-that-are-not-available-here` (`docs/backlog-retired.md:3182`).

### 3.6 The landing page (D1 as amended, D5)

In order: what ng-eval is, with the not-a-sandbox sentence; the three packages as a table (package,
what it does, a link to its README, a link to its CHANGELOG), with **no** peer range quoted, since
each package README carries its own, gated by step 4; install; the two worked examples,
[`docs/forms/worked-example.md`](../forms/worked-example.md) and
[`docs/forms/worked-example-signals.md`](../forms/worked-example-signals.md); security, meaning
`SECURITY.md`, GHSA-jh43-xc7j-93c2 and a **relative** link to `SECURITY.md#reviewed-external-advisories`,
which keeps that anchor under the gate; the root `CHANGELOG.md`; credits; related packages; contributing
(`CONTRIBUTING.md`); the code of conduct; the license.

**No `javascript` block (D5).** An `sh` install block is allowed. Every link is relative, so the gate
checks it.

### 3.7 The maintainer index and the condensed ROADMAP

**`docs/README.md`**, reached from `CONTRIBUTING.md`'s opening:

1. **Who it is for**: maintainers and agents. Consumers start at the root README.
2. **The register**: `backlog.md`, the live register with its index of every entry; and
   `backlog-retired.md`. Cite entries by `BL-<ID>`.
3. **Active plan**: this document, while it is in flight.
4. **Completed phases, as design records**: one row per phase (1–6, 9), each with its plan, every
   summary, and what it is the reference for, in the words of `CLAUDE.md`'s list (for example, Phase
   3's § 9 as the downstream contract and § 3.2.2 as the construct-once finding).
5. **Completed tracks** that were not phases: `a8/` (plan, step 2 plan, step 2 decision), `a20/`,
   `a21/`, `gates/` (plan, four step summaries, retrospect), `trace-surface/`, and `trace2/` (A12's
   trace bound and reset, as step records without a plan).
6. **Gates**: the gate command, and what each gate checks: `tools/doc-links.mjs`,
   `tools/release-tags.mjs`, the four `readme-examples.spec.ts`, the export-list and public-api specs
   (F3, F10, F11, F13, and this phase's `SECURITY.md`, peer-range and D5 cases), and
   `internal/performance.spec.ts`.
7. **Consumer documents kept here**: the two worked examples, marked as consumer documentation linked
   from the root README and `eval-forms`' README. D2 is why they stay under `docs/`.
8. **Conventions**: design records stay as written; their line citations refer to the commit that wrote
   them; `git show <commit>:<file>` reads that code.

It links every tracked file under `docs/` except itself. Step 6 checks that once (§ 8 q4).

**`ROADMAP.md`, condensed:**

- The header paragraph and "Modules vs. new repositories" stay unchanged.
- `## Phases` becomes one table: phase, subject, what shipped (packages and versions), plan, and
  retrospect, which is the phase's own summary where it has one (Phases 2, 5 and 9, and 10 when done)
  or else its last step summary (Phase 1 `side-effects/step-4-summary.md`, Phase 3
  `signals/step-4-summary.md`, Phase 4 `forms/step-6-summary.md`, Phase 6
  `forms/phase-6-step-7-summary.md`). Rows run in the order the phases ran: 1, 3, 4, 6, 2, 5, 9, 10.
  Phase 10's row replaces the entry this plan's commit added.
- `### Phase 7 and Phase 8 — reserved, not yet specified` and `## Deferred work` stay as they are.
- "Suggested order" is dropped: every item in it is done, and the table's order replaces it. Its
  closing paragraph on the error-identity group is history recorded in A4–A7 and C3.
- Before a phase's section goes, its text is checked against its plan and summary. Anything stated only
  in `ROADMAP.md` stays in the row or goes to the register, and the step's report lists each such fact,
  as § 3.3 does.

### 3.8 Links and mentions: what is re-pointed and what stays as written

- **A live document** (any `.md` that is not a design record or a published CHANGELOG entry, and any
  `.ts` comment) is re-pointed by the step that moves its target.
- **A design record's plain text stays as written**, per `CLAUDE.md`. A design record's **link** to a
  deleted file cannot stay, because the gate fails on it. It becomes a permalink to the file at the
  last commit that touched it, which keeps the record's meaning. The one case is
  `docs/backlog-retired.md:2116`, to `https://github.com/Zvenigora/ng-eval/blob/811b2cb/docs/common-classes.md`.
  811b2cb is B5's own fix, the commit the entry describes, and it is on `origin/master`.
- **A published CHANGELOG entry stays as written**, except a relative link, which may be re-based as the
  root CHANGELOG's split did.
- **A line citation in a live comment cites a heading or a symbol**, not a line (finding 5; F18; F19).

### 3.9 Changelogs and versions

| Step | Ships in | CHANGELOG line |
| :--- | :--- | :--- |
| 1 | no package | Root `CHANGELOG.md`, Workspace › Removed: the ten documents, audited first, and where the two kept facts went |
| 2 | no package | Root `CHANGELOG.md`, Workspace › Changed: `SECURITY.md` rewritten to what the code does, its fictional API and completeness claims removed, and its identifiers gated by a case |
| 3 | `eval-core`, at its next release | `modules/eval-core/CHANGELOG.md` `[Unreleased]` › Changed: the package README is the whole documentation, every `javascript` block executed; the repository README no longer documents the API; no code change |
| 4 | `eval-signals` and `eval-forms`, at their next release | Each package's `[Unreleased]` › Changed: the README opens with Install, Sibling packages and Security, and its peer ranges are quoted verbatim; expression syntax is documented in `eval-core`'s README; no code change. `eval-core`'s opening is step 3's, so its `[Unreleased]` line already covers it |
| 5 | no package | Root `CHANGELOG.md`, Workspace › Changed: the repository README is a landing page, with no `javascript` block and no quoted peer range |
| 6 | no package | Root `CHANGELOG.md`, Workspace › Added: `docs/README.md`; › Changed: `ROADMAP.md` condensed |

**No version changes in steps 1–6.** No `package.json` is edited, and no `.d.ts` changes. Whether the
three README changes are released as docs-only patches is § 8 q1. If they are, the manifests show
that no peer range needs to move. `eval-core` 0.12.1 is inside `eval-signals`' `>=0.11.0 <0.13.0` and
`eval-forms`' `>=0.12.0 <0.13.0`, and `eval-signals` 0.5.2 is inside `eval-forms`' `>=0.5.1 <0.6.0`.

### 3.10 `SECURITY.md` (D7) — what it says, and how its identifiers are checked

**The document, in order.** Each protection names the source that implements it and the spec that pins
it, as relative links, which the doc-links gate checks.

1. **Threat model.** The expression text is the untrusted input. The context, and every function in it,
   is chosen by the host and runs with the host's privileges. An expression reaches only what the
   context holds. ng-eval is not a sandbox.
2. **Protections that exist** (M7):
   - **The prototype-pollution guard.** An exact-match blocklist (`isDangerousProperty`). Identifiers,
     `this.k` and members of an `EvalScope` in the context are refused before any lookup (B6,
     GHSA-jh43-xc7j-93c2). Member reads and writes go through `safeGetProperty` and `safeSetProperty`
     in the member, assignment, update and object visitors. Binding names are refused as well. Under
     `caseInsensitive`, the **resolved-key re-check** refuses the key the lookup matched,
     `isDangerousProperty(foundKey)` in `member-expression.ts`, pinned by
     `eval.service.case-variant-guard.spec.ts`. The **primitive carve-out**
     (`isDangerousPrimitiveProperty`) refuses seven names on a string, number or boolean receiver, and
     leaves `toString` and its kin readable, pinned by `eval.service.primitive-carve-out.spec.ts`.
   - **Call sandboxing** (`call-expression.ts`). A callee whose written name is one of fourteen refused
     names is refused, as is `Function` by identity, and so is a non-native function whose source text
     matches one of six patterns. The section says what this does not do: a native function passes the
     source check, and the name check reads the name as written, so a host function under another
     name is not refused.
   - **The iteration budget**: `maxIterations`, 100,000 per evaluation by default, shared by every
     `for` loop in the expression.
   - **The write policies**, one sentence each: `EvalContext.checkMemberWrite`; `eval-signals`'
     read-only contexts and their `SignalContextWriteError`; and `eval-forms`' `guardIdentifiers`.
3. **Documented limits**: only limits the step verifies against the code or the register. These
   include: not a sandbox; `CallExpression` and `ArrowFunctionExpression` marked potentially unsafe in
   the package README; the budget bounding `for` loops only; and the open register entries that bear on
   security, cited by ID.
4. **Advisories for ng-eval** and **Reviewed External Advisories**: kept, with their headings verbatim,
   so `#reviewed-external-advisories` survives, and their text unchanged apart from links.
5. **Reporting**: the channel the repository actually has. The step checks whether GitHub private
   vulnerability reporting is enabled (`gh api repos/Zvenigora/ng-eval/private-vulnerability-reporting`)
   and names that channel, or else the maintainer contact the repository publishes. It does not keep
   an "email the maintainers" with no address.

Removed: §§ 1–8 and 10 as they stand, "Conclusion", and the Copilot footer, which carry the four
fictional names, "35/35" and every "complete" and "comprehensive" claim.

**How the identifiers are checked — a case, not a one-off.** The case lives in
`modules/eval-core/src/public-api.spec.ts`, which already reads documents against export lists and
which nothing imports. **Why a case**: the defect being removed is a document drifting from the export
list. This repository gates that kind of drift (F3, F10) rather than reviewing for it, and the
register's preamble records why. This instance survived from 2025-08-20 through every phase. Its cost
is small: after step 5, `SECURITY.md` is linked from the landing page, from all three package openings,
and from the published `eval-core` npm page. A one-off check would prove the rewrite once and nothing
after it. The case's own cost is an allowlist with a stale check, which is F10's shape.

The rule:

- **Tokens**: every identifier in `SECURITY.md`'s code spans and fenced blocks, member names after `.`
  included, after removing string literals, comments and JavaScript keywords. Link targets are not
  read: source files and specs are cited as links.
- **A token resolves** if it is any of:
  - an export of any of the five entry points in `SPECIFIER_ENTRY`;
  - a property, instance or static, of an exported class, interface or type. This includes
    `EvalKnownOptions`' keys, which are the `EvalOptions` keys;
  - a name the guard refuses or may refuse, meaning `isDangerousProperty`,
    `isDangerousPrimitiveProperty` or `mayMatchDangerousProperty` returns true for it. A blocked name
    the document lists is then checked against the guard itself;
  - a callee the call sandbox refuses, confirmed by evaluating a call to a harmless function bound
    under that name and seeing it refused;
  - an entry in the case's allowlist, with one reason from a fixed set: `js-global`, `attack-input`
    (the reviewed advisory's proof-of-concept) or `example-binding`.
- **Three cases**, all in `public-api.spec.ts`: every token resolves; every allowlist entry still
  occurs in `SECURITY.md`, as F10 checks its allowlist against the exports; and a fixture case for
  the tokenizer (strings and comments stripped, members kept, keywords skipped).

---

## 4. Work breakdown

Each step is one commit, leaves all three projects and the workspace root green, and runs in its own
session (`CLAUDE.md`, "Working from a plan"). In a criterion, "wrong" names the change the step's
executor makes to show that the criterion goes red. The report gives the failure count for each and
reads which cases failed. A "one-off check" is a command the step runs and reports; it is not added
to the gate.

**The order differs from the one first proposed, in two places.** `SECURITY.md` is its own step, step 2
(D7). The header alignment (proposed last) runs as step 4, before the landing page (now step 5). The
landing page makes the downstream READMEs' "repository README" sentences false (finding 4). In the
proposed order, either the landing step would have edited those sentences and the alignment step edited
them again, or the shipped READMEs would have pointed at documentation that had gone for two commits.
Running the alignment first costs nothing, because it depends only on step 3.

| Step | Subject | Decisions | Ships in | `eval-core` / `eval-signals` / `eval-forms` tests | doc-links |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Retire the stale documents | D3, D2 | no package | 0 / 0 / 0 | −9 files; −4 links, plus any the step's new lines add |
| 2 | `SECURITY.md`, rewritten and gated | D7 | no package | **+3** / 0 / 0 | 0 files; `SECURITY.md`'s source and spec links added, reported |
| 3 | `eval-core`'s README absorbs the root's API sections | D4 | `eval-core` | **+7** / 0 / 0 | 0 files; links change only by same-file anchors |
| 4 | One opening for the package READMEs, and their ranges gated | D1 | `eval-signals`, `eval-forms` | **+1** / **+1** / **+1** | 0 files; reported |
| 5 | The root README becomes a landing page | D1, D5 | no package | **−5**, measured (M8) / 0 / 0 | 0 files; the root README's links reported |
| 6 | Maintainer index, ROADMAP condensed, F19 | D1, D6 | no package | 0 / 0 / 0 | +1 file (+2 with the retrospect); reported |
| 7 | *Held on § 8 q1*: docs-only patch releases | — | per q1 | 0 | — |

From the gate's 2448 at this plan's commit, `eval-core` ends at 2454 if every step lands as planned:
+3, +7, +1, then −5.

### Step 1 — Retire the stale documents

- **Delete**: the ten files of D3.
- **Edit**:
  - `README.md`: the two "Documentation Structure" rows for `IMPROVEMENTS.md` and `PERFORMANCE.md`.
    Nothing else; step 5 rewrites the file.
  - `docs/backlog-retired.md:2116`: the link becomes the permalink of § 3.8.
  - `docs/backlog.md`: [F16](../backlog.md#f16) gains the `qs` override's reason (§ 3.3); "Work in
    flight" moves to step 2 next.
  - `CHANGELOG.md` (root): § 3.9's line.
  - This document: the step's outcome.
- **Exit criteria**:
  1. **Gone.** `git ls-files` lists none of the ten, and `git diff --name-status` shows exactly ten
     `D` lines and no `R` line.
  2. **No dangling link.** `tools/doc-links.mjs` is green, with 9 fewer files and 4 fewer links than at
     this plan's commit, plus whatever links the step's new lines add, which the report counts.
     *Wrong*: delete without the three link edits. The gate reports `README.md:461`, `README.md:462`
     and `docs/backlog-retired.md:2116`, three lines.
  3. **No live mention.** `git grep -n -E` over the ten names lists only: `docs/a8/step-2-plan.md:364`
     and `:368` (a design record); `modules/eval-core/CHANGELOG.md:848` (D3); the permalink; and the
     files that record the deletion, namely this document, `.claude/skills/step/SKILL.md`, the root
     CHANGELOG line, and F16 if it names its source. *Wrong*: leave one "Documentation Structure" row,
     and it appears in the listing as well as failing criterion 2.
  4. **The audit's step 1 row is done**: F16 states the `qs` override's reason. Step 3's two rows are
     its criteria.
  - Tests unchanged in all three projects. The gate is green. `git diff --name-only` lists the files
    above and this document.
- **Category**: documents only. Ships in no package.

### Step 2 — `SECURITY.md`, rewritten and gated (D7)

- **Edit**:
  - `SECURITY.md`: § 3.10's document.
  - `modules/eval-core/src/public-api.spec.ts`: § 3.10's three cases, their tokenizer and allowlist,
    and the docblock's account of what the file checks. The helpers live in this file, not in
    `export-list.spec.ts`, so nothing they add runs twice (finding 3).
  - `CHANGELOG.md` (root): § 3.9's line. `docs/backlog.md`: "Work in flight". This document: the
    outcome.
- **Exit criteria**:
  1. **The fiction is gone.**
     `git grep -n -E "secureEval|SecurityOptions|executeWithTimeout|safeExecuteFunction" -- SECURITY.md`
     lists nothing. `git grep -n -i -E "complete|comprehensive" -- SECURITY.md` lists only lines the
     report quotes, each with the reason it is not a protection claim.
  2. **Every API identifier in `SECURITY.md` resolves** against an export list, is an `EvalOptions`
     key, or is one of § 3.10's other resolutions. This is checked by § 3.10's case, which is green.
     Run each wrong implementation against the whole file and read the results case by case:
     - restore `` `service.secureEval(expression, context, secureOptions)` `` to the prose: the case
       lists `secureEval` and `secureOptions`;
     - restore § 6's `SecurityOptions` block: the case lists `SecurityOptions` and those of its members
       that nothing exports;
     - misspell `maxIterations` as `maxIteration` in the document: the case lists it;
     - remove from the document a name the allowlist holds: the stale-allowlist case fails.
  3. **The anchor survives.** The doc-links gate is green, and it checks `README.md:438`'s link to
     `SECURITY.md#reviewed-external-advisories`, since the root README is unchanged until step 5.
     *Wrong*: retitle the heading, and the gate reports `README.md:438`.
  4. **The advisories are intact.** The diff of the "Advisories for ng-eval" and "Reviewed External
     Advisories" sections is empty, or touches links only; the report shows it.
  5. **Every protection cites its source and spec as links**, all resolved by the gate.
  - `eval-core` +3, all in `public-api.spec.ts`; `eval-signals` and `eval-forms` unchanged. The gate is
    green. `git diff --name-only` lists the files above and this document.
- **Category**: a document and a spec. Ships in no package: `SECURITY.md` is in no tarball.

### Step 3 — `eval-core`'s README absorbs the root's API sections (D4)

- **Edit**:
  - `modules/eval-core/README.md`: § 3.4's rows marked "package README"; § 3.5's opening, which
    replaces the paragraphs at `:5-15`; and § 3.3's two sentences.
  - `modules/eval-core/src/lib/readme-examples.spec.ts`: seven cases, `README_JAVASCRIPT_BLOCKS` from 18
    to 25, the Parsing case's assertion of the AST block, the coverage table, the substitution list,
    and the docblock's "There are no `sh` or `json` blocks in this file", which becomes false.
  - `modules/eval-core/src/export-list.spec.ts`: the F10 docblock's count sentence (`:534-537`, finding
    6), measured again after the rewrite; comments only.
  - `modules/eval-core/CHANGELOG.md`: § 3.9's `[Unreleased]` line.
  - `CLAUDE.md:427-428` and `.claude/agents/code-reviewer.md:218`: "the README's 'ESTree Nodes Supported'
    list" names `modules/eval-core/README.md`.
  - `docs/backlog.md`: "Work in flight". This document: the outcome.
- **Not edited**: the root `README.md`, which keeps its sections until step 5, so that the two copies
  overlap for two commits rather than leaving a gap.
- **Exit criteria**:
  1. **Every root block is accounted for.** The report maps each of the root's 11 `javascript` blocks
     to the package block and case that carry it, or to § 3.4's reason for not carrying it (the import
     block). Each § 3.4 prose row is mapped to the heading that carries it.
  2. **The count.** `README_JAVASCRIPT_BLOCKS` is 25, and the F13 count case is green. *Wrong*: leave it
     at 18, and the count case fails, naming the 25 lines it found.
  3. **Each new case tests its block's claim.** Run each wrong implementation against the whole file and
     read the results case by case:
     - W1, `simpleEval` evaluating over an empty context, whatever context it is handed: the Evaluation,
       built-ins and case-insensitive cases fail.
     - W2, the walk's options losing `caseInsensitive`: the case-insensitive case fails.
     - W3, `simpleCall` building its state without the context: the Compilation case fails.
     - W4, `simpleEvalAsync` and `simpleCallAsync` returning before `awaitAllPromises`: both async cases
       fail.
     - W5, `createState` ignoring its options: the state case fails.
  4. **The new blocks' imports resolve.** `public-api.spec.ts`'s "imports no identifier the package does
     not export" and the F11 case are green. *Wrong*: one block importing `CompilerServise`. Both cases
     fail, and the F11 case fails twice (finding 3).
  5. **F10 is green**, and its docblock's count is the one the step measures.
  6. **The opening.** `grep -c "repository README" modules/eval-core/README.md` gives 0, where it was 2.
     The first three `##` headings are `Install`, `Sibling packages` and `Security`, and the peer
     sentence names all four manifest peers verbatim (a one-off check here; step 4's case gates it from
     then on).
  7. **§ 3.3's two rows** are present in the package README: the `ParserOptions` defaults under
     `### Parsing`, and the free functions named in code spans.
  - `eval-core` +7; `eval-signals` and `eval-forms` unchanged. doc-links: files unchanged; links change
    only by same-file anchors, and the report counts them. The gate is green. `git diff --name-only`
    lists the files above and this document.
- **Category**: documentation and specs. It ships in `eval-core`'s next release, through its README
  and CHANGELOG. The `.d.ts` is unchanged.

### Step 4 — One opening for the package READMEs, and their quoted ranges gated

- **Edit**:
  - `modules/eval-signals/README.md` and `modules/eval-forms/README.md`: § 3.5's opening. The
    "repository README" sentences (`:11`, `:16`) become `## Sibling packages`' pointer to `eval-core`'s
    README. `eval-signals`' peer sentence quotes `@angular/core >=19.0.0` verbatim.
  - The peer-range case (§ 3.5), one per package: `modules/eval-core/src/public-api.spec.ts`,
    `modules/eval-signals/src/public-api.spec.ts` and `modules/eval-forms/src/public-api.spec.ts`.
  - `modules/eval-signals/CHANGELOG.md` and `modules/eval-forms/CHANGELOG.md`: § 3.9's `[Unreleased]`
    lines.
  - Finding 5's line citations into these two READMEs, re-pointed by heading, in comment lines only:
    `modules/eval-signals/src/lib/eval-signal-async.spec.ts` (`:1251`, `:1270`, `:1300`, `:1346`,
    `:1379`), `modules/eval-forms/src/export-list.spec.ts` (`:25`, `:359`) and
    `modules/eval-forms/signals/src/public-api.spec.ts` (`:8`).
  - A `readme-examples.spec.ts` count only if the opening moves a block in or out of a counted scope.
    The report says which, and why; § 3.5 is written so that none does.
  - `docs/backlog.md`: "Work in flight". This document: the outcome.
- **Exit criteria**:
  1. **One shape.** A one-off command prints each package README's `##` headings in order, and the
     first three are `Install`, `Sibling packages` and `Security` in all three READMEs. *Wrong*: swap
     two of them in one README, and the listing shows it.
  2. **Quoted ranges equal the manifests.** The three peer-range cases are green. *Wrong*, once per
     package, each reverted: edit one range in the README, and that package's case fails, naming the
     peer and both ranges. Then edit the same range in `package.json` instead, and the case fails
     again. Against `eval-signals`' current `:20`, before the step rewrites it, the case is red.
  3. **No pointer to the repository README.** `grep -c "repository README" modules/*/README.md` gives
     0 in each, where it was 0, 1 and 1 after step 3.
  4. **No line citation into these READMEs from a live comment.**
     `` git grep -n -E 'README\.md:[0-9]|at `:[0-9]+`' -- modules/eval-signals modules/eval-forms ``
     lists nothing, where it lists 8 lines today, the 8 of finding 5. *Wrong*: leave one, and it is
     listed.
  5. **Counts unchanged.** Every count constant in the three `readme-examples.spec.ts` files that read
     these READMEs is unchanged and green, and the headings and anchors § 3.5 names are unchanged.
  - Tests: +1 in each project. No `public-api.spec.ts` is imported by another spec, so each case runs
    once. The gate is green. `git diff --name-only` lists the files above and this document.
- **Category**: documentation, specs, and comments in specs. It ships in `eval-signals`' and
  `eval-forms`' next releases, through their READMEs and CHANGELOGs. No `.d.ts` changes.

### Step 5 — The root README becomes a landing page (D1 as amended, D5)

- **Edit**:
  - `README.md`: § 3.6 in full, and § 3.4's landing-page rows.
  - `modules/eval-core/src/public-api.spec.ts`: the four root-README cases below removed; the D5 case
    added (the root README holds no `javascript` fence and imports nothing from `@zvenigora/`); the
    docblock rewritten to say what the file checks now.
  - `modules/eval-core/src/export-list.spec.ts`: the F11 `it.each` loses `'README.md'`. The comments at
    `:186-188` and `:473-475`, which describe the root README's multi-line imports, are re-pointed: the
    fixture case at `:472` is now the multi-line reader's only witness.
  - `modules/eval-core/src/lib/readme-examples.spec.ts`: the docblock's root-README paragraphs
    (`:25-35`, `:108-109`), put in the past tense. Comments only.
  - `modules/eval-signals/src/public-api.spec.ts`: the docblock's `:7-10`, comments only.
  - `docs/backlog-retired.md`: F3's retired entry records that the published/unpublished case was
    removed, and why.
  - `CHANGELOG.md` (root): § 3.9's line. `docs/backlog.md`: "Work in flight". This document: the outcome.
- **The cases this step removes, and the one it adds**, measured by M8, not derived:

  | Case | File | Tests | Reason |
  | :--- | :--- | ---: | :--- |
  | `README.md › scans a non-empty identifier set containing EvalService` (the root row of `describe.each`) | `public-api.spec.ts` | −1 | Goes red: under D5 the root README imports nothing, so its floor cannot hold |
  | `README.md › imports no identifier the package does not export` (the root row of `describe.each`) | `public-api.spec.ts` | −1 | Vacuous: it asserts over an empty import set |
  | `scans the identifiers carried by the root README two-line imports` | `public-api.spec.ts` | −1 | Goes red once the root README has no imports. The multi-line reader stays covered by `export-list.spec.ts`'s "scans an import statement that spans two lines", which runs in both files. Its stale `README.md:291-292` citation (finding 5) goes with it |
  | `documents every exported root-README symbol in the package README too` | `public-api.spec.ts` | −1 | Vacuous: the root set is empty. Its relation, that nothing is documented only in the unpublished README, is discharged by step 3. Recorded in F3's retired entry |
  | F11, `every @zvenigora import resolves against its own specifier › README.md` | `export-list.spec.ts` | −2 | Vacuous over the root README's empty import set. Counted twice, because `public-api.spec.ts` imports `export-list.spec.ts` (finding 3) |
  | **Added**: the D5 case | `public-api.spec.ts` | +1 | Holds D5. It runs once, because no spec imports `public-api.spec.ts` |
  | **Net** | | **−5** | M8: 2448 → 2443; `public-api.spec.ts` 26 → 22, `export-list.spec.ts` 20 → 19 |

  **Flagged as `CLAUDE.md` requires**: each removal encodes the root README's imports, which D5 removes
  by decision. None encodes library behaviour. Approving this step at its confirmation gate approves
  these removals.
- **Exit criteria**:
  1. **D5 holds.** The D5 case is green. *Wrong*: keep one `javascript` block in the root README, and
     the D5 case fails, and nothing else does. M8 measured this: 1 failure of 2443.
  2. **The multi-line reader is still tested.** *Wrong*: `IMPORT_PATTERN`'s `[^}]*` made `[^}\n]*`, and
     `export-list.spec.ts`'s two-line fixture case fails in both files that run it. The report gives the
     count and reads which cases failed.
  3. **D1's list is present, and no range is quoted.** The report ticks each link: three package
     READMEs, `SECURITY.md` and its `#reviewed-external-advisories` (relative, so the gate keeps
     checking the anchor), three package CHANGELOGs and the root one, both worked examples,
     `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and `LICENSE`. `git grep -n -E "(>=|\^)[0-9]" -- README.md`
     lists nothing. *Wrong*: quote one range, and it is listed.
  4. **Nothing is lost.** Every root section is on the landing page, in a package README (steps 3 and
     4), or dropped for § 3.4's stated reason.
  5. **No live comment calls the root README a documentation source.**
     `git grep -n -i -E "root .?README" -- 'modules/*.ts'` lists only the past-tense lines the step
     names. It lists 8 lines today, in four files.
  - `eval-core` −5; `eval-signals` and `eval-forms` unchanged. doc-links: the root README goes from 36
    checked links (after step 1) to the number the step reports. The gate is green.
    `git diff --name-only` lists the files above and this document.
- **Category**: documents, and specs. Ships in no package.

### Step 6 — The maintainer index, the condensed ROADMAP, and F19

- **New**: `docs/README.md` (§ 3.7). `docs/documentation/phase-10-summary.md`, the phase's one
  retrospect, unless § 8 q1 has added step 7, which then writes it.
- **Edit**:
  - `CONTRIBUTING.md`: a pointer to `docs/README.md` before `## Prerequisites`.
  - `ROADMAP.md`: § 3.7.
  - `CLAUDE.md`: F19's fix, which names `isDangerousProperty(foundKey)` in `member-expression.ts` by
    symbol; and Phase 10 recorded as complete, or left active if step 7 is pending.
  - `docs/backlog.md` and `docs/backlog-retired.md`: F19 retired and moved, and its index row
    re-pointed; "Work in flight".
  - `CHANGELOG.md` (root): § 3.9's lines.
  - This document: the outcome, including any links to `#f19` that the gate lists once F19 has moved.
- **Exit criteria**:
  1. **The index is complete.** A one-off check lists every tracked file under `docs/` that
     `docs/README.md` does not link, apart from itself, and the list is empty. *Wrong*: drop the
     `trace2/` row, and the check lists its three files.
  2. **The maintainer path holds.** `CONTRIBUTING.md` links `docs/README.md` before its first `##`, and
     `docs/README.md` marks the two worked examples as consumer documents.
  3. **The ROADMAP has one row per completed phase**, each with a plan link and a retrospect link, all
     checked by the gate. The Phase 7 and Phase 8 section and "Deferred work" are unchanged. The report
     lists each fact that was only in a removed section, and where it went.
  4. **F19 is fixed by its own recorded fix.** `git grep -n "member-expression.ts:[0-9]" CLAUDE.md` lists
     nothing. *Wrong*: cite `:211`, and the grep lists it. This is the fix F19 itself rejects, because
     the citation would move again with the next edit above it.
  5. **F19 is retired the register's way.** The entry is in `backlog-retired.md`, its index row points
     there, and the gate is green after re-pointing what it listed. Three links point at `#f19` at this
     plan's commit: the index row and "Work in flight" in `docs/backlog.md`, and this document's header.
  6. **The live mentions of `ROADMAP.md` still hold.** Each of finding 12's 15 live lines is true of the
     condensed file, or the step re-points it and the report says so.
  - Tests unchanged in all three projects. The gate is green. `git diff --name-only` lists the files
    above and this document.
- **Category**: documents. Ships in no package.

### Step 7 — *held on § 8 q1*: docs-only patch releases

Not planned until q1 is answered. If it is answered yes, this section is written then: the packages,
their bumps, their CHANGELOG headings, the `.d.ts` comparison against the published tarballs, and the
post-publish Publication status rows, following CONTRIBUTING's Releasing procedure.

---

## 5. Public API surface

None. No exported symbol, no `.d.ts` and no `package.json` changes in steps 1–6. A diff that touches a
non-spec `.ts` file is out of scope (§ 2).

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | Baseline, then +3 at step 2, +7 at step 3, +1 at step 4 and −5 at step 5; no other change |
| `eval-signals` / `eval-forms` tests | (in the above) | +1 each at step 4; unchanged in every other step |
| Docs | the root `test` target (`tools/doc-links.mjs`, `tools/release-tags.mjs`) | Green. doc-links' file and link counts move as § 4's table says |
| Scope | `git diff --name-status` | Exactly the step's file list. No `R`. A `D` only in step 1, and only for D3's ten |
| No library change | the diff's `.ts` files | Spec files, or comment lines only |
| One-off checks | the commands each step names | Reported in the step, not added to the gate |

### 6.1 The spec discipline for documentation

- **A README case mirrors its block by hand**, and only the block count is read from the file. So the
  probe for a case is a wrong *library* implementation, which shows that the case tests the claim. A
  wrong README cannot show it, since nothing but the count reads the file. (Step 3, criterion 3.)
- **A case that reads a document is probed by breaking the document**: `SECURITY.md`'s identifiers
  (step 2), the quoted ranges (step 4) and D5 (step 5). Each of those reads the file, so a wrong
  document is exactly what it must catch.
- **A case that a decision makes vacuous is removed, not kept green.** A root-README case over an empty
  import set would pass on any reader at all (step 5).
- **A count is held to the file by its existing F13 case**, and a heading that bounds a counted range is
  part of that case's contract (§ 3.5).

---

## 7. Risks

| Risk | Likelihood | Mitigation — the criterion that fails |
| :--- | :---: | :--- |
| A shipped README points at documentation that has gone | Certain in the proposed order | The reordering (§ 4); step 4, criterion 3 |
| A moved root block stops running, or never ran | Medium: 9 of the root's 11 blocks did not parse as printed (gates step 4) | Step 3, criteria 2 and 3 |
| A root fact is lost in the move | Medium | Step 3, criterion 1; step 5, criterion 4 |
| A deleted file is still mentioned somewhere the gate does not look | Low: measured at zero live mentions (§ 3.3) | Step 1, criterion 3 |
| `SECURITY.md` names an API that does not exist | Certain today (finding 7) | Step 2, criterion 2, and the case from then on |
| The rewrite loses the anchor the published `eval-core` README links | Medium | Step 2, criterion 3; step 5, criterion 3 keeps it gated |
| A quoted peer range drifts from its manifest | **High** over time (finding 9) | Step 4's cases, from step 4 on; the landing page quotes none |
| The `SECURITY.md` case's allowlist grows to excuse anything | Low | Its stale-entry case; a reason from a fixed set per entry |
| npm pages lag the repository | **Certain** until q1 is answered | § 8 q1 |
| `docs/README.md` stops listing a new document | Medium after Phase 10 | Step 6, criterion 1, once; § 8 q4 |

---

## 8. Open questions

Each question is stated here and decided elsewhere.

1. **Docs-only patch releases at the end.** Steps 3 and 4 change files that ship:
   `modules/eval-core/README.md` and its CHANGELOG, and the `eval-signals` and `eval-forms` READMEs and
   CHANGELOGs. The candidates are `eval-core` 0.12.1, `eval-signals` 0.5.2 and `eval-forms` 0.5.1, each
   with a `.d.ts` byte-identical to the version before it, and § 3.9 shows that no peer range needs to
   move. **Until they are published**, the npm pages show the READMEs of `eval-core` 0.12.0,
   `eval-signals` 0.5.1 and `eval-forms` 0.5.0. Each of those says the full documentation, or the
   expression syntax and security, is in the repository README, and links its `#readme`. After step 5
   that link lands on the landing page, which links each package README on GitHub. That is one hop more
   than the npm page promises, and the page describes documentation its target no longer holds. *To
   decide*: which packages are released, when (after step 6, or after step 4 for the two downstream
   packages), and whether step 7 exists.
2. **`eval-forms`' README, at 864 lines.** Splitting it into files per entry point, or reordering it,
   is out of this phase: D6 rules out guide files, and step 4 changes only its opening. *Constraints*,
   whatever the answer: the two adapters' count cases find their blocks by three headings (§ 3.5); its
   anchors are linked from `docs/forms/worked-example-signals.md:240`, `docs/backlog-retired.md:3182` and
   `ROADMAP.md:267` (the last through `eval-signals`); two of its absolute links point at the worked
   examples under `docs/` (§ 3.2); and step 4's peer-range case reads its `## Install` and its
   `## Versions` block.
3. **Do the published absolute links bind those files' paths, and their anchors, permanently?** Every
   one is in a README inside a tarball already on npm, and every one points at `master`, so it resolves
   against whatever `master` holds and not against the version that shipped it.
   - Into `docs/`: the 7 of § 3.2.
   - Into the root: `SECURITY.md`, and `SECURITY.md#reviewed-external-advisories`
     (`modules/eval-core/README.md:11`); the repository's `#readme` (`eval-core` `:9` and `:15`,
     `eval-signals` `:11`, `eval-forms` `:16`); the repository itself (`eval-core` `:5`, `eval-signals`
     `:9`, `eval-forms` `:14`).
   - Into the package folders: `modules/eval-core#readme` (`eval-signals` `:3`),
     `modules/eval-signals#readme` (`eval-forms` `:18`), `modules/eval-signals#async-expressions`
     (`eval-forms` `:844`).

   *The case that forces the question*: `modules/eval-signals/README.md:397` links
   `docs/backlog.md#a24`. Retiring A24 moves its entry to `backlog-retired.md`, which is the register's
   own convention, and that anchor stops existing on `master` while 0.5.0 and 0.5.1 still print it.
   Steps 2–5 keep every one of these working (§ 3.5, § 3.10). The question is whether they must do so
   permanently. The package CHANGELOGs' 100 relative links (§ 3.2) ship as well but resolve nowhere
   inside a tarball, so they bind only inside the repository, through the gate.
4. **What the decisions do not cover**, found while measuring:
   - **`docs/README.md`'s completeness.** Step 6 checks it once. *To decide*: whether
     `tools/doc-links.mjs` should fail on a tracked `docs/` file that the index does not link.
   - **Two CHANGELOG anchors leave the gate** (finding 11). Under the package README's absolute-link
     convention, the moved links to `eval-core` CHANGELOG headings are no longer checked. *To decide*:
     accept that, or allow relative links in the package README, which resolve on GitHub but not
     necessarily on npm.

---

## 9. Downstream contract

What a reader can rely on once this plan has landed:

1. **A consumer starts at the root `README.md`.** It names the three packages and their install lines,
   and links each package README, `SECURITY.md`, the CHANGELOGs and the worked examples. It holds no
   `javascript` block, which a case enforces, and quotes no peer range.
2. **Each package README is that package's whole documentation**, and the three open the same way
   (§ 3.5). `eval-core`'s documents its whole API, and every `javascript` block in it is executed. Every
   peer range a package README quotes equals its manifest, which a case per package enforces.
3. **`SECURITY.md` describes the protections the code has, and no others.** Every API identifier it
   names resolves, which a case enforces, and `#reviewed-external-advisories` is where it was.
4. **A maintainer starts at `CONTRIBUTING.md`, then `docs/README.md`**, which links every document
   under `docs/`.
5. **Every path under `docs/` that existed before Phase 10 still exists**, except D3's eight.
6. **Design records read as written.** Their plain text is untouched. The one link that had to change
   is a permalink to the commit it described.
7. **Not provided**: guide files; a restructured `eval-forms` README (§ 8 q2); a gate on the index
   (§ 8 q4); releases (§ 8 q1).
