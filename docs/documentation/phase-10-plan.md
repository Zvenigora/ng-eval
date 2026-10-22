# Phase 10 Plan — documentation restructure

**Date**: October 14, 2026
**Revision**: 8 — step 7, in its own commit. Corrected in place: M9's `eval-forms` citation is
`:36-37`, since "strict CSP" is on `:37`. The confirmation gate fixed:
- the three CHANGELOG headings' date, 2026-10-22: UTC had turned over, and that is the date npm
  records. Step 8 checks it against `npm view`;
- one commit, for the reason "Why one commit" gives, which `@nx/dependency-checks` does not force;
- `eval-core`'s F23 bullet, reworded, with "no behaviour change" explicit.

**Revision**: 7 — step 6, in its own commit. Corrected in place:
- § 1.1's `docs/` figures. `docs/` held 49 tracked files when step 6 began, not 48: `docs/a35/plan.md`
  arrived with the A35 plan during the pause. So it holds 50 with `docs/README.md`, and 51 with the
  retrospect;
- § 3.7's completed tracks gain `a35/`. Without that row, criterion 1 could not be met;
- finding 13's measurements, dated as the plan commit's, beside step 6's: the check at `:244`,
  `CLAUDE.md:322`, three links to `#f19`, and its index row at `:345`;
- the Retires line's link to F19, re-pointed to `backlog-retired.md` as F19 retired.

The confirmation gate answered § 8 q1 and fixed four more things:
- **q1**: step 7 exists. It is the release commit for `eval-core` 0.13.1, `eval-signals` 0.6.1 and
  `eval-forms` 0.6.1, docs-only patches. Step 8 is the post-publish record, the phase's retrospect
  and its close. The two mirror the A35 plan's steps 10 and 11. Step 6 therefore writes no summary,
  and Phase 10 stays active. Step 7's scope is what M9 measured in the published tarballs' READMEs;
- **the step widens** to two `eval-forms` `readme-examples.spec.ts` files, comment lines only. Five
  of finding 12's live lines described `ROADMAP.md` passages that ef5ac2b had moved to the register
  on 2026-09-07, so they were false before the condensing. Criterion 6's remedy, re-pointing, needed
  those files. `.claude/skills/step/SKILL.md`'s "no file under `modules/`" is a default for planned
  scope, not a bar on a deliberate widening at a gate (§ 2);
- **§ 6.1 applied to the new text**: `docs/README.md` links each document without counting them, and
  `ROADMAP.md`'s shipped column names the packages and links the register's Publication status
  table, which `tools/release-tags.mjs` checks, rather than restating versions;
- **§ 8 q4 is [F25](../backlog.md#f25)**, queued after the phase with F21 and F24.

**Revision**: 6 — step 5, in its own commit. Corrected in place:
- step 5's `readme-examples.spec.ts` citations, `:25-35` and `:108-109`, which step 3's docblock edits
  had moved to `:31-40` and `:127-128`;
- criterion 5's "8 lines today", 10 at 059bcd0: step 3 added two, both already past tense;
- step 5's "only witness" for the multi-line reader, which holds, though the package README has two
  multi-line imports. Its cases do not discriminate them, as criterion 2's probe measured;
- the ten links to F22 and F23, re-pointed to `backlog-retired.md` as both retired.

The confirmation gate added F23's `eval-core` README line to the step, with its `[Unreleased]`
line, so that F23 retires rather than narrowing: the step ships that one correction in `eval-core`'s
next release, and nothing else in any package (§ 3.9, § 4's table, step 5's file list and category).
It also fixed three readings:
- F22's count loses its figure, and F22's optional reverse case is added, so the net is −3;
- the D5 case requires every fence to be `sh`, not only no `javascript` fence, and finds an
  `@zvenigora/` import or require, fenced or not, in the forms its docblock lists (widened by the
  step's review);
- `.claude/skills/step/SKILL.md` marks step 5 done, outside the file list as steps 3 and 4 did.

A second instruction, before the commit, added three things:
- a leg in `readme-examples.spec.ts`' built-ins case pinning the new sentence's second half, so that
  F23 retires with no recorded gap. That file's edit is no longer comments only;
- [F24](../backlog.md#f24), the downstream copies' missing reverse case, queued after the phase;
- § 6.1's rule on a claim that is false now against a gap that is only latent, with F23 and F24 as
  its two sides.

**Revision**: 5 — step 4, in its own commit. Corrected in place, each a citation that had moved
since the plan's commit:
- finding 5: the five `eval-signals` comment lines, now four lower, and where the `eval-forms`
  README documents `ExpressionRules`;
- § 3.2's absolute links, and § 3.5's and § 8 q2's anchor citations, measured now against the
  READMEs as published in `eval-signals` 0.6.0 and `eval-forms` 0.6.0, at f7f27f7;
- § 3.5's quoted `eval-forms` floor sentence, which 0.6.0 rewrote to 0.13.0;
- § 8 q3, pinned to the published READMEs it is about. Its `eval-core` lines, `:5`, `:9`, `:11` and
  `:15`, are right for 0.13.0 and stay; step 3 rewrote the repository's copy, which is not
  published yet. Its `eval-signals` `:397` is `:399`, its `eval-forms` `:844` is `:848`, and 0.6.0
  prints the `#a24` link as well.

The confirmation gate strengthened criterion 2 and fixed three readings:
- `## Install` must quote every peer with its range, and a span's peer is the exact text before
  its first space. "Names every key" by substring was satisfied by `acorn-walk` for `acorn`, and by
  a span with no range. Each case's probes are fixed in the criterion;
- the `eval-forms` README's `acorn-walk ^8.3.0` in `## Versions` is `eval-core`'s range, which the
  case read as `eval-forms`' own. The sentence is reworded to name `eval-core`'s manifest. *Before
  the commit*, § 6.1 was applied to it: no case checked the range against `eval-core`'s manifest, so
  the sentence states no range;
- `eval-forms`' "a sandboxed evaluator" is reworded, against its new `## Security`. A sweep of the
  tracked documents for the same language opened [F23](../backlog-retired.md#f23). *Before the commit*, a
  second sweep for totality words widened F23 to every claim of a guarantee. Its root README lines
  are scheduled into step 5. One line of `eval-core`'s README is not scheduled: it says an
  expression over an empty context cannot use JavaScript's built-ins, when a value's own methods
  stay callable.

Also before the commit: § 6.1 gains the rule that every new check has a probe proving it can fail,
with its three instances. And `.claude/skills/step/SKILL.md` marks step 4 done, outside the step's
file list as step 3's commit did.

**Revision**: 4 — step 3, in its own commit, run after the pause for the A35 plan (`eval-core` 0.12.1
and 0.13.0). The plan was written before that pause. Corrected in place:
- the totals in § 4 and § 6: the gate stood at 2596 / 438 / 375 when the phase resumed (4f99112),
  not 2448, so step 3 ends at 2603 and the phase at 2599;
- the root README's line ranges in § 3.4 from `:213` on, one lower since A37 added
  `SequenceExpression` to its node list;
- step 3's `CLAUDE.md:427-428`, cited by its heading instead, since the line had moved twice;
- the release candidates in § 3.9 and § 8 q1: 0.12.1 is the published A35 partial-hardening release,
  so the candidates are now 0.13.1 / 0.6.1 / 0.6.1, inside the ranges 0.13.0 / 0.6.0 / 0.6.0 declare.

The confirmation gate added four things:
- a restriction note on `ThisExpression` in the moved node list, since 0.13.0 allows `this` only as
  the object of a member access;
- GHSA-qrqj-3445-3rjx in `eval-core`'s `## Security` paragraph, with a link to `SECURITY.md`'s
  documented limits rather than a restatement of them;
- the `sh` and `json` block counts in the F13 count case, so the spec docblock's account of the
  blocks that are not `javascript` is pinned;
- `docs/a35/plan.md` in `CLAUDE.md`'s list of completed plans.

Three of criterion 3's probes could not fail against the root blocks as printed, so those blocks
changed their examples, never their claims (§ 3.4's rule):
- W2: an identifier resolves through the context's own options, so the case-insensitive block
  gains a member read;
- W4: `await` flattens a promise at the top of the result, so each async block gains a nested one;
- W5: the state block's options were the defaults, so it sets `caseInsensitive: true`.

Each was measured; the step's outcome gives the counts. They are the instance § 6.1's new standing
rule cites: an example that survives its probe is strengthened, not excused. The step's review opened
[F22](../backlog-retired.md#f22), widened before the commit to the F10 docblock's count, and scheduled into
step 5, which already edits `export-list.spec.ts`.

**Revision**: 3 — step 2, in its own commit. § 3.10's rule is corrected in four places, each because
`SECURITY.md`'s advisory sections, which criterion 4 keeps byte-identical, name what the first rule
could not resolve:
- the tokenizer skips a span that is one hyphenated word;
- the member route reads object types only;
- a source route resolves top-level declarations under `modules/eval-core/src/lib/`;
- the allowlist gains three reasons, `js-member`, `package-name` and `regex-text`.

The confirmation gate fixed:
- the sandbox route's exact refusal message;
- the file-name skip's matching rule;
- the source route's scope;
- `js-global` and `js-member` as reasons, never routes;
- the stale case's no-code-route check;
- the `fetch` and `__proto__` probes, with their single-route precondition.

The step opened F20.

The step's code review found four warnings, each fixed in the step:
- the member route also admitted the default library's members, so three blocklisted names had a
  second route;
- criterion 5's source links were missing for the budget and the write policies;
- `SECURITY.md` quoted one refusal message where object literals and spreads have their own;
- the documented limits omitted the `call` / `apply` / `bind` route past the call sandbox. Widened
  before the commit to the whole class, it opened A35: dangerous function values callable past the
  name-based call sandbox, by an alias, `call` / `apply` / `bind`, or a native callback.

It also corrected `new`'s checks and one "supported syntax" pointer, and made the tokenizer read an
unclosed fence.

**Revision**: 2 — step 1, in its own commit. Finding 8 and § 3.3's `repository-audit.md` row are
corrected: the reason that file gave for the `qs` override, prototype pollution, is wrong. The override
was added for GHSA-6rw7-vpxm-498p / CVE-2025-15284, a denial of service, and F16 records that
advisory, a later one the override's floor does not exclude, the dependency chain, the lockfile's
version and an `npm audit` run. The confirmation gate fixed that paragraph's content and added three
things: the new lines carry no link, so criterion 2's count is exact; the permalink uses the full
SHA; and step 1 gets an outcome line.

**Revision**: 1 — initial plan.
**Target**: the repository's documents. Shipped files touched: `modules/eval-core/README.md` (step 3,
and one sentence in step 5),
`modules/eval-signals/README.md` and `modules/eval-forms/README.md` (step 4), and each package's
`CHANGELOG.md` with them. Specs touched: comment lines in all three projects; test cases in `eval-core`
(steps 2, 3, 4 and 5) and in `eval-signals` and `eval-forms` (step 4).
**Also touches**: no library code. No exported symbol and no `.d.ts` changes. No version changes in
steps 1–6; step 7 bumps the three versions as docs-only patches (§ 8 q1, answered in Revision 7).
**Retires**: [BL-F19](../backlog-retired.md#f19), in step 6; [BL-F22](../backlog-retired.md#f22), opened by step 3's
review, in step 5; [BL-F23](../backlog-retired.md#f23), opened by step 4's sweeps, in step 5 if its
`eval-core` README line has been fixed by then, and otherwise narrowed there to that line.
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
| `docs/` | — | 55 tracked files (54 `.md` and one `.txt`): design records, the register, two worked examples, and eight of D3's ten files | 48 after step 1 (counting this plan), 49 with `docs/README.md`, 50 with the retrospect. *Corrected in step 6* (Revision 7): 49 when step 6 began, since the A35 plan added `docs/a35/plan.md`; 50 with `docs/README.md`, 51 with the retrospect |

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
   *Corrected in step 4* (Revision 5): at 938111c the five `eval-signals` lines are `:1255`, `:1274`,
   `:1304`, `:1350` and `:1383`, four lower. `ExpressionRules` is documented at `:176`, in the table
   under `## How it fits together`, and `### Constructed, not computed` is at `:557`.
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
   document that gives a reason, "the transitive `qs` prototype-pollution vulnerability". Every other
   override (`nx`'s three, `postcss`, `less` and `@hono/node-server`) is recorded in
   [F16](../backlog.md#f16).
   *Corrected in step 1* (Revision 2): that reason is wrong. The range and the date match
   GHSA-6rw7-vpxm-498p / CVE-2025-15284, a denial of service fixed in 6.14.1, and not any
   prototype-pollution advisory; the last of those in `qs` was fixed in 6.10.3 in 2022. F16 now records
   the advisory, and a later one the override's floor does not exclude.
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
    *Measured again in step 6* (Revision 7), at b1a9863: the check is at `:244`, having moved again while
    F19 was open; `CLAUDE.md:322` still cites `:188`; and three links point at `#f19`, the index row
    (now `docs/backlog.md:345`), "Work in flight" and this document's Retires line, as criterion 5
    says. The figures above are the plan commit's.
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
| M9 | What the npm pages say (*added at step 6's gate*, Revision 7) | `npm pack` of `eval-core` 0.13.0, `eval-signals` 0.6.0 and `eval-forms` 0.6.0 into an empty scratch directory outside the repository, extracted, and each `package/README.md` read and grepped | Step 7's "What the release fixes" |

---

## 2. Scope

### In scope

- D1–D7 (§ 3.1), as steps 1–6.
- The docs-only patch releases of the three packages, and their post-publish record, as steps 7 and
  8 (§ 8 q1, answered in Revision 7).
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
- **Releases**, other than step 7's three docs-only patches. § 8 q1, answered at step 6's gate
  (Revision 7).
- **A gate on `docs/README.md`'s completeness.** § 8 q4. Step 6 runs the check once and reports it.
  The decision is [F25](../backlog.md#f25), queued after the phase.
- **Library code.** A change to any non-spec `.ts` file other than in a comment line is a
  stop-and-replan. That includes exporting anything new from an internal module for a spec to read.

**A file under `modules/` outside a step's planned list** is a stop-and-replan by default, and
`.claude/skills/step/SKILL.md` says so for steps 1 and 6. That default bounds planned scope. It does
not bar a deliberate widening at a step's confirmation gate, recorded there with its reason, within
the limits above: comment lines or specs, and no library code. Step 6's two `eval-forms` comment
files are the instance (Revision 7).

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
| Absolute links from shipped READMEs | **7**, to 5 files | `modules/eval-forms/README.md:57` (`forms/phase-6-plan.md`), `:159` and `:862` (`forms/worked-example.md`), `:620` and `:864` (`forms/worked-example-signals.md`); `modules/eval-signals/README.md:357` (`signals/phase-5-plan.md`) and `:399` (`backlog.md#a24`). *Corrected in step 4* (Revision 5): lines as published in 0.6.0, at f7f27f7; they were `:155`, `:858`, `:616`, `:860`, `:355` and `:397` |

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
| `docs/repository-audit.md` | 129 | 64fa3ab, 2026-08-02 | **That the `qs` override has a reason at all** (finding 8). The reason it gives, prototype pollution, is wrong, and step 1 records the right one (Revision 2). The rest describes one project with 511 tests at 0.2.4 | step 1: a paragraph in [F16](../backlog.md#f16) | plain text `docs/a8/step-2-plan.md:364` (design record); `modules/eval-core/CHANGELOG.md:848` (stays) |

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
| ESTree nodes supported, destructuring, statements, "How statements differ from JavaScript" (`:213-298`) | New `## Supported syntax`, as prose, with `### ESTree nodes supported` and `### How statements differ from JavaScript` under it. Its two CHANGELOG anchors become absolute (finding 11) | 0 |
| Options › Case-insensitive evaluation (`:299-317`) | New `### Case-insensitive evaluation` under `## Options` | **+1** |
| Per-node timing, Evaluation hooks, Iteration budget (`:318-329`) | Already in the package README. These are the pointers to it | 0 |
| Evaluation with state (`:330-356`) | New `### Evaluation with state` under `## Options`. `console.table(...)` becomes a read of `state.result.trace` with its value printed | **+1** |
| Evaluation with scope (`:357-394`) | `### Scopes` (exists) | 0 |
| Packages in This Repo (`:395-414`) | The landing page, and each package README's `## Sibling packages` (§ 3.5) | — |
| Related Packages (`:415-425`) | The landing page | — |
| Security (`:426-456`) | The landing page links the rewritten `SECURITY.md` (step 2) and its reviewed external advisories. The "2025 Update" bullets are dropped: "complete prototype pollution prevention" is false (B6, GHSA-jh43-xc7j-93c2) | — |
| Documentation Structure (`:457-465`) | Dropped. Step 1 removes its two rows that would dangle, and the landing page's own links replace it | — |
| Contributing, Code of Conduct, License (`:466-480`); the Copilot footer (`:483`) | The landing page; the footer is dropped | — |

*Corrected in step 3* (Revision 4): the ranges from `:213` on are measured at 4f99112, and each now
runs to the line before the next row's heading, its trailing blank included. Every heading from
`:236` on sits one line further down than at this plan's commit, because A37 added
`SequenceExpression` to the node list. Every heading after the Documentation Structure table sits two
lines further up as well, for the two rows step 1 removed from it. `:1-211` are unchanged.

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

1. `# @zvenigora/<package>`, then what the package is, with no heading before `## Install`.
   *Corrected in step 4* (Revision 5): this said "in one paragraph". `eval-signals` opens with two
   paragraphs and `eval-forms` with a paragraph, an example block and a paragraph. The step keeps
   both openings, since the plan names no content to delete.
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
- the `## Install` section names every key of `peerDependencies`. *Strengthened at step 4's gate*
  (Revision 5): it quotes a `` `<peer> <range>` `` span for every key, and a span's peer is the exact
  text before its first space, so `acorn-walk` does not stand in for `acorn`, nor a bare
  `` `@angular/core` `` for its range.

`eval-signals`' `:20` abbreviates `>=19.0.0` to `>=19` (finding 9), so the case is red against it until
step 4 writes the range verbatim. What the case does not see: a range written in prose without its
package name, such as `eval-forms`' "The `eval-core` floor is 0.13.0, since 0.6.0" (*corrected in
step 4*: it read 0.12.0 at this plan's commit). Its docblock says so. So a package README states
no sibling's range (step 4): quoted as a span it is checked against the wrong manifest, and quoted
any other way it is not checked at all. `eval-forms`' `## Versions` says that `eval-core` declares
`acorn-walk` as a peer, without its range.

**Headings that must not change**, because a count case finds its blocks by them:
``## Quick start — Reactive Forms (`/reactive`)``, ``## Signal Forms — `/signals` `` and
`Expressions are validated too`. The published anchors into these READMEs that other files use stay
as well: `eval-signals`' `#async-expressions` (`eval-forms` README `:848`, `ROADMAP.md:267`; *corrected
in step 6*: the condensing removed the ROADMAP link, and the anchor stays gated by the same README's
own `:547`), and
`eval-forms`' `#caseinsensitive-per-registration` (`docs/forms/worked-example-signals.md:240`) and
`#two-things-that-are-not-available-here` (`docs/backlog-retired.md:3675`). *Corrected in step 4*
(Revision 5): `:848` as published in 0.6.0, and `:3675` at 938111c; they were `:844` and `:3182`.

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
   trace bound and reset, as step records without a plan). *Corrected in step 6* (Revision 7): and
   `a35/`, the A35 plan, which completed during the pause.
6. **Gates**: the gate command, and what each gate checks: `tools/doc-links.mjs`,
   `tools/release-tags.mjs`, the four `readme-examples.spec.ts`, the export-list and public-api specs
   (F3, F10, F11, F13, and this phase's `SECURITY.md`, peer-range and D5 cases), and
   `internal/performance.spec.ts`.
7. **Consumer documents kept here**: the two worked examples, marked as consumer documentation linked
   from the root README and `eval-forms`' README. D2 is why they stay under `docs/`.
8. **Conventions**: design records stay as written; their line citations refer to the commit that wrote
   them; `git show <commit>:<file>` reads that code.

It links every tracked file under `docs/` except itself. Step 6 checks that once (§ 8 q4).
*Fixed at step 6's gate* (Revision 7), by § 6.1: the index links without counting, so it states none
of the counts this list uses to describe it.

**`ROADMAP.md`, condensed:**

- The header paragraph and "Modules vs. new repositories" stay unchanged.
- `## Phases` becomes one table: phase, subject, what shipped (packages and versions), plan, and
  retrospect, which is the phase's own summary where it has one (Phases 2, 5 and 9, and 10 when done)
  or else its last step summary (Phase 1 `side-effects/step-4-summary.md`, Phase 3
  `signals/step-4-summary.md`, Phase 4 `forms/step-6-summary.md`, Phase 6
  `forms/phase-6-step-7-summary.md`). Rows run in the order the phases ran: 1, 3, 4, 6, 2, 5, 9, 10.
  Phase 10's row replaces the entry this plan's commit added.
  *Fixed at step 6's gate* (Revision 7), by § 6.1: "what shipped" names the packages, and the
  table links the register's Publication status table for the versions. Its tags are checked by
  `tools/release-tags.mjs`, and a version restated here would be checked by nothing.
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
| 5 | no package; `eval-core` for F23's line (*added at step 5's gate*) | Root `CHANGELOG.md`, Workspace › Changed: the repository README is a landing page, with no `javascript` block and no quoted peer range. And `modules/eval-core/CHANGELOG.md` `[Unreleased]` › Changed: the README no longer says an expression over an empty context cannot use JavaScript's built-ins; no code change |
| 6 | no package | Root `CHANGELOG.md`, Workspace › Added: `docs/README.md`; › Changed: `ROADMAP.md` condensed |
| 7 | `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1 (*added in Revision 7*) | Each package's `[Unreleased]` moved under its new heading; `eval-core`'s F23 bullet reworded against what 0.13.0's README said (step 7) |
| 8 | no package | None: the post-publish commit corrects a heading's date only where npm's differs |

**No version changes in steps 1–6.** No `package.json` is edited, and no `.d.ts` changes. Whether the
three README changes are released as docs-only patches is § 8 q1. If they are, the manifests show
that no peer range needs to move. *Answered at step 6's gate* (Revision 7): they are, at step 7,
with no peer range moved. `eval-core` 0.13.1 is inside `eval-signals`' and `eval-forms`'
`>=0.13.0 <0.14.0`, and `eval-signals` 0.6.1 is inside `eval-forms`' `>=0.6.0 <0.7.0`. *Corrected in
step 3* (Revision 4): this named 0.12.1 and 0.5.2 against the ranges of 0.5.1 and 0.5.0. 0.12.1 is
now the published A35 partial-hardening release, and the manifests moved with 0.13.0.

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
     name is not refused. *Corrected after step 2's review* (Revision 3): the checks refuse a name,
     not a value. A dangerous function value reachable from the context is callable whenever the
     call does not name it: under an alias; through `call`, `apply` or `bind`; or as a callback a
     native function makes, such as `map`, `Reflect.apply` or `then`. The expression's author chooses
     the route, not only the host. The section states the host's mitigation
     ([A35](../backlog-retired.md#a35)).
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
  read: source files and specs are cited as links. A code span is skipped whole if it is a path or a
  file name, meaning it holds a path separator or ends in `.ts`, `.md`, `.json` or `.mjs`, not
  merely that it contains a dot (*fixed at step 2's gate*). So is a span that is one hyphenated
  lower-case word, such as `acorn-walk`, `eval-core` or `jse-eval`: an identifier cannot hold a
  hyphen, so such a span is a package or file name (*corrected in step 2*, Revision 3).
- **A token resolves** if it is any of:
  - an export of any of the five entry points in `SPECIFIER_ENTRY`;
  - a property, instance or static, of an exported class, interface or type. This includes
    `EvalKnownOptions`' keys, which are the `EvalOptions` keys. **Object types only** (*corrected in
    step 2*, Revision 3). An exported union of string literals, such as `EvalReadKind`, has `String`'s
    methods as its apparent properties, and reading those let 310 member names in, `toUpperCase` and
    `charAt` among them. **And the packages' own declarations only** (*corrected after step 2's
    review*): a property declared only in the default library or under `node_modules`, and a class's
    static `prototype`, does not count. `EvalTrace` extends `Array` and `SignalContextWriteError`
    extends `Error`, so without this, `toString`, `toLocaleString` and `prototype` resolved by this
    route as well as by the guard's. The case then stayed green with `toString` removed from the
    guard. The route does not check which object a member is on;
  - **a top-level declaration** — a function, a `const`, a class, an interface or a type alias,
    exported or not — of a non-spec `.ts` file under `modules/eval-core/src/lib/`, read by parsing the
    file, so a name that appears there only inside a string literal is not one (*added in step 2*,
    Revision 3, with its scope fixed at the gate). The advisory sections, which criterion 4 keeps
    unchanged, name `isDangerousProperty` and `isDangerousPrimitiveProperty`, internal functions that
    no export list holds. This route checks them against the code where an allowlist entry would not;
  - a name the guard refuses or may refuse, meaning `isDangerousProperty`,
    `isDangerousPrimitiveProperty` or `mayMatchDangerousProperty` returns true for it. A blocked name
    the document lists is then checked against the guard itself;
  - a callee the call sandbox refuses. A call to it, with a benign stand-in function bound under that
    name in the context, must throw the sandbox's own refusal,
    `Function call blocked for security reasons: <name>`. Any other throw — "Cannot call undefined or
    null function", "Value is not a function", the guard's refusal — does not resolve it (*fixed at
    step 2's gate*);
  - an entry in the case's allowlist, with one reason from a fixed set: `js-global`, `js-member` (a
    method of a built-in prototype), `package-name` (a package named in a single-word span),
    `regex-text` (an anchor or a flag in a regular expression quoted as text), `attack-input` (the
    reviewed advisory's proof-of-concept) or `example-binding`. The middle three were *added in step
    2* (Revision 3): the unchanged advisory sections name `acorn`, `jsep`, `toUpperCase`, `$`,
    `constructor$` and `i`, which no route resolves and the first set of reasons did not describe.
- **`js-global` and `js-member` are allowlist reasons, never runtime routes** (*fixed at step 2's
  gate*). A route that resolved a name because it is in `globalThis`, or on a built-in prototype,
  would give a probe target a second route: `fetch` is a global in Node, and `__proto__` and
  `constructor` are on `Object.prototype`.
- **Three cases**, all in `public-api.spec.ts`:
  - every token resolves;
  - every allowlist entry still occurs in `SECURITY.md`, as F10 checks its allowlist against the
    exports, and resolves by no code route, so the allowlist cannot mask a probe (*fixed at step 2's
    gate*);
  - a fixture case that pins how the other two read the document: the tokenizer, with strings and
    comments stripped, members kept, keywords skipped, paths, file names and hyphenated words skipped,
    `service.secureEval` read as tokens, and an unclosed fence read to the end of the document; the
    member route reading the packages' own object types only; the source
    route reading declarations, not string literals, with `fetch` as the live instance; the sandbox
    route resolving only on its own refusal, with a name absent from the context not resolving; and
    each probe target resolving by exactly one route.

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
| 5 | The root README becomes a landing page; F22, F23 | D1, D5 | no package; `eval-core` for F23's line | **−5**, measured (M8), or −3 if F22's count gets a case; **−3** as run, with F22's reverse case instead (Revision 6) / 0 / 0 | 0 files; the root README's links reported |
| 6 | Maintainer index, ROADMAP condensed, F19 | D1, D6 | no package | 0 / 0 / 0 | +1 file; reported. The retrospect moved to step 8 (Revision 7) |
| 7 | Release commit: `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1 (*written in Revision 7*) | § 8 q1 | all three, docs-only patches | 0 / 0 / 0 | 0 files; reported |
| 8 | Post-publish record, the retrospect, and the phase closed (*written in Revision 7*) | § 8 q1 | no package | 0 / 0 / 0 | +1 file, the retrospect; reported |

From the gate's 2448 at this plan's commit, `eval-core` ends at 2454 if every step lands as planned:
+3, +7, +1, then −5.

*Corrected in step 3* (Revision 4): the A35 plan ran between steps 2 and 3 and added its own cases, so
the gate stood at **2596 / 438 / 375** when the phase resumed at 4f99112. The deltas are unchanged.
Step 3 ends at 2603, step 4 at 2604 / 439 / 376, and step 5, and so the phase, at 2599.
*Measured at step 5* (Revision 6): 2601 / 439 / 376, since F22's reverse case made step 5's delta −3.
Steps 6, 7 and 8 move no row, so the phase ends there.

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
     its criteria. *Fixed at the confirmation gate* (Revision 2): the reason F16 states is the verified
     one, not the audit's, with the contents the gate listed.
  - Tests unchanged in all three projects. The gate is green. `git diff --name-only` lists the files
    above and this document.
- **Category**: documents only. Ships in no package.
- **Outcome** — done 2026-10-14, under Revision 2. The ten files are deleted: ten `D` lines and no
  `R`. Run before the link edits, doc-links reported exactly criterion 2's three dangling lines. After
  them it reported 334 files and 1356 links, 9 and 4 fewer than at the plan's commit, with 0 dangling;
  the new lines carry no link. The mention grep lists only criterion 3's set: the design record's two
  lines, `eval-core`'s 0.2.3 CHANGELOG line, the permalink, F16, the root CHANGELOG line and this
  document. The gate is green at 2448 / 438 / 375, with each count unchanged.

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
     - *Added at the gate*: make the call sandbox accept a callee `SECURITY.md` names as refused, by
       removing `fetch` from `DANGEROUS_FUNCTIONS`; and, separately, make the guard accept a blocked
       property it names, by removing `__proto__` from both `DANGEROUS_PROPERTY_NAMES` and
       `DANGEROUS_PRIMITIVE_PROPERTY_NAMES`. Before each, the target resolves by exactly one route,
       the source route included. In each, the identifier case lists exactly that name. Each break is
       reverted, and the report reads every case that failed.
  3. **The anchor survives.** The doc-links gate is green, and it checks `README.md:438`'s link to
     `SECURITY.md#reviewed-external-advisories`, since the root README is unchanged until step 5.
     *Wrong*: retitle the heading, and the gate reports `README.md:438`.
  4. **The advisories are intact.** The diff of the "Advisories for ng-eval" and "Reviewed External
     Advisories" sections is empty, or touches links only; the report shows it.
  5. **Every protection cites its source and spec as links**, all resolved by the gate.
  - `eval-core` +3, all in `public-api.spec.ts`; `eval-signals` and `eval-forms` unchanged. The gate is
    green. `git diff --name-only` lists the files above and this document.
  - *Added in the step* (Revision 3): `docs/backlog.md` gains [F20](../backlog.md#f20), with its index
    row. `CODE_OF_CONDUCT.md`'s enforcement contact is an address of the upstream `jse-eval` author.
    It was found looking for a reporting channel, and left unedited by instruction, since its fix is a
    contact the maintainer chooses. It also gains [A35](../backlog-retired.md#a35), with its index row:
    dangerous function values callable past the name-based call sandbox, by an alias, `call` /
    `apply` / `bind`, or a native callback. It was found by the step's review, measured route by route,
    and listed in `SECURITY.md` as a limit with the host's mitigation. A candidate direction is
    recorded, not decided, and a fix ships as `eval-core` 0.12.1.
- **Category**: a document and a spec. Ships in no package: `SECURITY.md` is in no tarball.
- **Outcome** — done 2026-10-14, under Revision 3.
  - **Criterion 1**: both greps list nothing. No "complete" or "comprehensive" is left.
  - **Criterion 4**: the two advisory sections are byte-identical to the previous commit's, 108 lines
    with the trailing blank.
  - **Criterion 5**: every protection links its source and its spec, 9 of each, 18 relative links,
    each resolved by the gate. Six of the sources were added after the review: the budget's
    `for-statement.ts` and `eval-state.ts`, and the write policies' four.
  - **doc-links**: 334 files and 1383 links, 27 more than at step 1. `SECURITY.md` went from 2
    relative links to 23, which is 21 more: the 18 to sources and specs, plus A25, A33 and A35. The
    other six are A35's and F20's index rows, C5's link in A35, and this document's link to F20 and
    two to A35.
  - **Reporting**: it names the published author contact, since private vulnerability reporting was
    still disabled when checked.
  - **Limits, measured against the built bundle**:
    - with `eval` bound as `run`, `run("1 + 1")` is 2;
    - `(f => f(f))(f => f(f))` ends in a `RangeError` whatever `maxIterations` is, and a `for` loop
      stops at it;
    - `eval.call(null, "1+1")`, `.apply` and `.bind` each give 2 where `eval("1+1")` is refused;
    - `Function.call(null, "return 7")()` is 7;
    - `host.call(null)` runs a host function `host()` is refused for;
    - as callbacks, `["1+1"].map(eval)` is `[2]`, `Reflect.apply(eval, null, ["1+1"])` is 2, and
      `Promise.resolve("1+1").then(eval)` resolves to 2;
    - an object literal's key and a spread refuse with their own messages, now quoted.
  - **The allowlist** holds 28 entries: 9 `js-global`, 5 `js-member`, 2 `package-name`, 3
    `regex-text`, 2 `attack-input` and 7 `example-binding`. `isDangerousProperty` and
    `isDangerousPrimitiveProperty` resolve by the source route, and so does `resolve`.
  - **Probes**, each reverted, run on the final spec. They ran before the A35 limit was widened,
    which added four allowlist entries (`Promise`, `Reflect`, `map`, `then`) and no route:
    - `service.secureEval(…)` restored: the identifier case alone, listing `secureEval`,
      `secureOptions` and `service`.
    - The `SecurityOptions` block restored: the identifier case alone, listing `SecurityOptions`, its
      seven members, `secureEval`, `secureOptions`, `service`, and the type words `boolean`, `number`
      and `string`.
    - `maxIteration`: the identifier case alone, listing it alone.
    - `RangeError` removed: the stale-allowlist case alone.
    - The heading retitled: doc-links reports `README.md:438` alone.
    - `fetch` removed from the sandbox: 2 of `eval-core`'s 2451 cases. The identifier case lists
      exactly `fetch`, and the fixture case fails its live-instance precondition. No other spec pins
      that refusal, so the new case is its only witness.
    - `__proto__` removed from the guard: 95 cases in 10 suites. The identifier case lists exactly
      `__proto__`, and the fixture case fails `codeRoutes('__proto__')`. The other 93 are the guard's
      own specs.
    - *Added after the review*: `toString` removed from the guard, run on `public-api.spec.ts`. The
      identifier case lists exactly `toString`, and the fixture case fails `codeRoutes('toString')`.
      Before the member route was narrowed, this probe left the case green.
  - **The review's notes**:
    - `isDangerousPrimitiveProperty` adds no name the full set lacks.
    - The source route resolves 225 internal names.
    - `eval` resolves as a member of `EvalService`, so the sandbox route checks 12 of the 14 callee
      names, `import` being a keyword.

  The gate is green at 2451 / 438 / 375.

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
  - `CLAUDE.md`, the Conventions bullet on what new evaluator features need, and
    `.claude/agents/code-reviewer.md:218`: "the README's 'ESTree Nodes Supported' list" names
    `modules/eval-core/README.md`. *Corrected in step 3* (Revision 4): the bullet was cited as
    `:427-428`, and had moved to `:430-431` by the time the phase resumed. *Added at the gate*: the
    same edit gives `CLAUDE.md`'s list of completed plans a row for `docs/a35/plan.md`.
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
- **Outcome** — done 2026-10-20, under Revision 4.
  - **Criterion 1**, the root's 11 blocks, each to the package block and case that carry it:
    - `:75`, the bare import: not carried (§ 3.4: each section imports what it uses);
    - `:84`, Parsing: `### Parsing`, the Parsing case;
    - `:119` and `:131`, Evaluation and the built-ins: `### Evaluation — EvalService`, the
      Evaluation and built-ins cases;
    - `:151`, Compilation: `### Compilation — CompilerService`, the Compilation case;
    - `:167` and `:181`: `### Async evaluation and compilation`, the two async cases;
    - `:205`, Discovery: `### Discovery`, the Discovery case;
    - `:306`, Case-insensitive: `### Case-insensitive evaluation`, its case;
    - `:333`, Evaluation with state: `### Evaluation with state`, its case;
    - `:360`, Evaluation with scope: `### Scopes`, the Scopes case.

    The root's `json` block is under `### Parsing`, asserted whole by the Parsing case, and its
    unlabelled install fence is `## Install`'s `sh` block.
    - The prose rows: the node list, destructuring, statements and divergences are under
      `## Supported syntax`; the not-a-sandbox note is under `## Security`; the Options sentence
      opens `## Options`; the three pointer rows already had their sections.
    - The rows § 3.4 sends to the landing page are step 5's.
  - **Criterion 2**: `README_JAVASCRIPT_BLOCKS` is 25. *Wrong*, left at 18: the count case alone
    fails, receiving 25 lines. The gate added `sh` and `json`, 1 each, to the same case, with a
    check that no fence of another language exists:
    - relabelling `sh` as `bash` fails it at the `sh` count;
    - a stray `ts` fence fails it at the other-language check, naming `README.md:11 (ts)`.
  - **Criterion 3**, each probe reverted, read case by case against the whole file:
    - **W1** (`simpleEval` over `{}`): 6 failures. They are the three named (Evaluation, built-ins,
      case-insensitive), plus three existing cases that also pass `simpleEval` a context (Scopes,
      the empty-completion sentinel, colon-joined names).
    - **W2** (the walk's options without `caseInsensitive`, the context's kept): 1 failure, the
      case-insensitive case. The state case, whose only case-insensitive read is an identifier,
      stays green, which shows the added member read is the load-bearing line.
    - **W3** (`simpleCall` without its context): 1 failure, the Compilation case.
    - **W4** (`evaluateAsync` without `awaitAllPromises`): 2 failures, both async cases. Each
      failed at its nested line. The top-level `toBe(3)` passed under W4, since `await` flattens
      a promise at the top of the result.
    - **W5** (`createState` dropping its options): 5 failures. They are the state case, the
      case-insensitive case (which goes through `createState`), and three existing cases: timing,
      the iteration budget, and an owned registry's policy. With the state case put back to the
      root's `{ caseInsensitive: false }` and `a`, it stayed green under W5, measured.
    - The Parsing sentence's `Program` legs, added after the review: `CompilerService` with
      `extractExpressions` on fails the Parsing case alone, and so does `DiscoveryService`.
  - **Criterion 4**: green. *Wrong*, `CompilerServise` imported by the Compilation block: 3
    failures in the two files that run them, F11's case once in each and "imports no identifier
    the package does not export".
  - **Criterion 5**: F10 is green. The README names 21 of the 60 exports in code spans, where it
    named 14, measured through a temporary case since removed. Eight of the 21 are still
    allowlisted, which leaves the free-functions sentence ungated; the review found it, and it is
    [F22](../backlog-retired.md#f22).
  - **Criterion 6**: `grep -c "repository README"` gives 0. The `##` headings run `Install`,
    `Sibling packages`, `Security`, `Exported entry points`, `Supported syntax`, `Options`. The
    four peer ranges match the manifest byte for byte, by a one-off script.
  - **Criterion 7**: the `ParserOptions` sentence is under `### Parsing` and asserted by the
    Parsing case; the eight free functions are named in code spans under `## Exported entry points`.
  - **doc-links**: 346 files and 1568 links, 7 more than the 1561 at 4f99112. All seven are links to
    F22, which the review opened: its index row and its "Work in flight" mention, and five in this
    document — the Revision 4 header, the Retires line, § 6.1's standing rule, step 5's file list,
    and this outcome.
    The README's links are absolute, and change no count; no same-file anchor moved the count.
  - **The review** found no Critical. Its five warnings, each fixed in the step:
    - this outcome, which was missing;
    - a sentence in `### Evaluation with state` that said hooks and the trace bound need the
      state-first style, against the same README;
    - the retarget of `.claude/skills/step/SKILL.md` and `CLAUDE.md` in this diff (see below);
    - § 3.9 and § 8 q1's release candidates;
    - the F10 entries, recorded as F22.

    Its notes were also taken: the opening's "reads only what that context holds", the
    `eval-signals` line's qualifier, the AST-node argument of `compile` and `extract`, the
    Parsing case's other two services, two unlisted substitutions, the spec docblock's account
    of the examples this step changed, and § 3.4's line-shift note.
  - **Outside the file list**: `.claude/skills/step/SKILL.md` and `CLAUDE.md`'s two active-plan
    sentences, retargeted to this plan before the step at the maintainer's instruction. They are
    a `chore`, and are committed separately or named in this step's commit body.

  The gate is green at 2603 / 438 / 375.

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
    `modules/eval-signals/src/lib/eval-signal-async.spec.ts` (`:1255`, `:1274`, `:1304`, `:1350`,
    `:1383`; *corrected in step 4*, from `:1251`, `:1270`, `:1300`, `:1346`, `:1379`),
    `modules/eval-forms/src/export-list.spec.ts` (`:25`, `:359`) and
    `modules/eval-forms/signals/src/public-api.spec.ts` (`:8`).
  - A `readme-examples.spec.ts` count only if the opening moves a block in or out of a counted scope.
    The report says which, and why; § 3.5 is written so that none does.
  - `docs/backlog.md`: "Work in flight", and [F23](../backlog-retired.md#f23), opened by the step's sweep
    (*added at the gate*). This document: the outcome.
- **Exit criteria**:
  1. **One shape.** A one-off command prints each package README's `##` headings in order, and the
     first three are `Install`, `Sibling packages` and `Security` in all three READMEs. *Wrong*: swap
     two of them in one README, and the listing shows it.
  2. **Quoted ranges equal the manifests.** The three peer-range cases are green. *Wrong*, once per
     package, each reverted: edit one range in the README, and that package's case fails, naming the
     peer and both ranges. Then edit the same range in `package.json` instead, and the case fails
     again. Against `eval-signals`' current `:20`, before the step rewrites it, the case is red.
     *Strengthened at the gate* (Revision 5): `## Install` quotes a `` `<peer> <range>` `` span for
     every key, the peer matched exactly before the span's first space, and each package's probes
     are fixed, each reverted, each failing that package's case alone:
     - `eval-core`: `js-sha256`'s `^0.12.0` edited inside the README span, a range with spaces; the
       same edit in `package.json`; `acorn ^8.11.2` removed from the Install sentence, which a
       substring reader passes on `acorn-walk`.
     - `eval-signals`: red against today's `:20`; `@zvenigora/ng-eval-core`'s range edited in the
       README; the same edit in `package.json`; one peer removed from Install.
     - `eval-forms`: red before the step, by the Install assertion; `"rxjs": "^7.8.0"` edited in
       `## Versions`' block, the fenced reading; a range edited in the Install sentence, the span
       reading; the same edit in `package.json`; one peer removed from Install.
     - `eval-forms`' `## Versions` quotes `eval-core`'s `acorn-walk` range. *The pair*: that range
       edited leaves the case green, and `eval-forms`' own edited turns it red. *Superseded before
       the commit*: the sentence states no range (§ 3.5), so its probe is a range put back.
     The `package.json` probes are temporary, and the diff carries no manifest.
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
- **Outcome** — done 2026-10-20, under Revision 5. The gate is green at 2604 / 439 / 376, from
  2603 / 438 / 375.
  - **Criterion 1**: the first three `##` headings are `Install`, `Sibling packages` and `Security`
    in all three READMEs. *Wrong*, `eval-signals`' second and third swapped: the listing shows
    `Install|Security|Sibling packages` for that README alone.
  - **Criterion 2**: the three cases are green. Each probe below was run against its project's whole
    suite and reverted. Every one failed exactly one case, its package's peer-range case, which
    named the peer and both ranges, or the missing key:
    - `eval-core`, 1 of 2604 each: `js-sha256`'s span edited in the README; the same edit in
      `package.json`; `acorn ^8.11.2` removed from Install, reported as `acorn` missing.
    - `eval-signals`, 1 of 439 each: `:20`'s `>=19` restored; `@zvenigora/ng-eval-core`'s range
      edited in the README; the same edit in `package.json`; that peer removed from Install.
    - `eval-forms`, 1 of 376 each: `"rxjs"` edited in `## Versions`' block; `rxjs` edited in the
      Install span; the same edit in `package.json`, which the case reported at both lines; and
      `acorn-walk` removed from Install. Before the step's README edits, the case was red on the
      Install assertion alone, with all six peers missing. That run was of the spec file only.
    - *The pair*: `eval-core`'s `acorn-walk` range edited in `## Versions`' reworded sentence
      leaves all 376 green. `eval-forms`' own, edited in Install, fails the case. The same edit in
      the sentence's original wording, `` `acorn-walk ^8.4.0` `` as one span, fails it too. The
      rewording is what discriminates.
    - *Then the range removed* (§ 6.1). The reworded sentence still stated `eval-core`'s range,
      `` `acorn-walk` at `^8.3.0` ``, and nothing checked it against `eval-core`'s manifest. It now
      says `eval-core` "declares `acorn-walk` as a peer as well". Two probes, each reverted:
      - **R1**, `` `acorn-walk ^8.4.0` `` put back as a span: 1 failure of 376, the case;
      - **R2**, put back as `` `acorn-walk` at `^8.4.0` ``: all 376 green. That is the form the
        docblock lists as unseen, so this case cannot keep a range out of prose.

      As a one-off check, `grep -n "acorn-walk" modules/eval-forms/README.md` shows a range only at
      `:21` and `:92`, in the Install span and the `## Versions` block. Both are checked.
  - **Criterion 3**: `grep -c "repository README"` gives 0 in each of the three.
  - **Criterion 4**: the grep lists nothing. *Wrong*, `README.md:555` restored in
    `src/export-list.spec.ts`'s `:359` comment: it lists that line.
  - **Criterion 5**: no `readme-examples.spec.ts` is in the diff, and its seven constants are green.
    The three counted headings and the three published anchors are present.
  - **The sweeps** for guarantee-implying language, at the gate's instruction and then before the
    commit. F23 records their commands, their counts and the classes they were read into.
    - **Fixed in this step**: `eval-forms`' "a sandboxed evaluator, safe under a strict CSP".
    - **Live, outside this step's files**:
      - twelve root README lines: `:3`, `:10`, `:11`, `:17`, `:24`, `:129`, `:428`, `:431-433`,
        `:435` and `:447`;
      - `eval-core`'s README `:81`. Measured against the built package, it overclaims: `Math` and
        `parseInt` are out of reach, but `'abc'.toUpperCase()` and `[3, 1, 2].map(…)` run.

      These are [F23](../backlog-retired.md#f23). Its root README part is scheduled into step 5, and its
      `eval-core` line is not scheduled.
    - **Kept as written**: design records, and one published `eval-core` CHANGELOG entry (F23
      names them).
    - **Not claims**: every other hit.
  - **doc-links**: 346 files and 1578 links, 10 more than 1568:
    - 2 to `#f23` in the register;
    - 5 to F23 in this document: the Revision 5 header, the Retires line, step 4's file list,
      step 5's, and this outcome;
    - 1 to the A35 plan, in § 6.1's new rule;
    - `#security` and `#versions` in the `eval-forms` README.

    The READMEs' other new links are absolute and leave the count unchanged.
  - **§ 3.5 item 1** is corrected to "no heading before `## Install`", as the gate read it. Each
    README keeps its opening text, and `eval-forms` keeps its example block, which no count reads.
  - **The review** found no Critical. It raised one warning, fixed in the step: the reader's span
    pattern crossed blank lines. One stray backtick then inverted the pairing for the rest of the
    file, and hid every later span.
    - The pattern now ends a span at a blank line, as CommonMark does, in all three copies.
    - The probe was a stray backtick in `eval-signals`' Sibling packages paragraph, with
      `` `@angular/core >=18.0.0` `` in the next one. Under the old pattern all 439 stayed green;
      under the new one the case failed, 1 of 439, naming the span.
    - From the notes: fences now open on three or more backticks or tildes and close on the same
      character. *Probe*: `## Versions`' block fenced with `~~~` and `rxjs` edited inside it fails
      the case, 1 of 376.
    - The docblocks list a span with no space after its peer as unseen.
    - The `eval-forms` Install sentence no longer says `## Versions` gives a reason for every
      floor: `rxjs` has none.
    - This section's "one paragraph" is corrected, two comments lose literal backslashes, and three
      reflows are tidied.
    - **The sibling range in `## Versions`** is removed from the README, not checked across
      manifests (above).
    - **`.claude/skills/step/SKILL.md`** marks step 4 done. That is outside this step's file list,
      as step 3's retarget was, at the maintainer's instruction, and the commit body names it.
  - **§ 6.1** gains the rule that every new check needs a probe proving it can fail, with three
    instances.

### Step 5 — The root README becomes a landing page (D1 as amended, D5)

- **Edit**:
  - `README.md`: § 3.6 in full, and § 3.4's landing-page rows.
  - `modules/eval-core/src/public-api.spec.ts`: the four root-README cases below removed; the D5 case
    added (the root README holds no `javascript` fence and imports nothing from `@zvenigora/`); the
    docblock rewritten to say what the file checks now.
  - `modules/eval-core/src/export-list.spec.ts`: the F11 `it.each` loses `'README.md'`. The comments at
    `:186-188` and `:473-475`, which describe the root README's multi-line imports, are re-pointed: the
    fixture case at `:472` is now the multi-line reader's only witness. *Corrected in step 5*
    (Revision 6): the package README holds two multi-line imports as well (`:179`, `:219`), but its
    cases check only that what they import is exported, so a reader that drops them leaves those
    cases green. "Only witness" holds in that sense, and criterion 2's probe measured it.
  - The same file, for [F22](../backlog-retired.md#f22) (*scheduled here in step 3*, Revision 4, since this is
    the later step that edits it):
    - the eight F10 allowlist entries the package README now names come out (`EvalState`, `call`,
      `callAsync`, `compile`, `compileAsync`, `evaluate`, `extract` and `parse`);
    - the F10 docblock's "twenty-one of the sixty" either gets a permanent case or loses its figure.
      § 6.1's standing rule applies, as it did to step 3's `sh` / `json` pin. Which one is fixed at
      this step's confirmation gate. A case added to `export-list.spec.ts` runs twice (finding 3), so
      the case option moves `eval-core` by +2 and the step's net from −5 to −3.
  - `docs/backlog.md` and `docs/backlog-retired.md`: F22 retired and moved, and its index row
    re-pointed.
  - [F23](../backlog-retired.md#f23)'s root README part (*scheduled here in step 4*, Revision 5): the step
    re-runs F23's two sweeps over the landing page and reports what they list. The lines F23 names
    are in rows § 3.4 already drops. F23 retires only if its `eval-core` README line has been fixed
    as well. Otherwise the step narrows it to that line.
  - *Added at this step's gate* (Revision 6): F23's `eval-core` README line, so that F23 retires
    rather than narrowing. `modules/eval-core/README.md`, the sentence under
    `### Evaluation — EvalService` (`:81`), names the globals and says a value's own methods stay
    callable; `modules/eval-core/CHANGELOG.md` gains its `[Unreleased]` line. *Added before the
    commit*, at a second instruction: the built-ins case in `readme-examples.spec.ts` gains a leg for
    the sentence's second half, and `docs/backlog.md` gains [F24](../backlog.md#f24).
  - `modules/eval-core/src/lib/readme-examples.spec.ts`: the docblock's root-README paragraphs
    (`:31-40`, `:127-128`; *corrected in step 5*: they were cited as `:25-35` and `:108-109`, and
    step 3's docblock edits moved them), put in the past tense. Comments only.
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
     names. It lists 8 lines today, in four files. *Corrected in step 5* (Revision 6): it listed 10
     at 059bcd0, in the same four files; step 3 added `readme-examples.spec.ts`' `:65` and `:314`,
     both already past tense.
  6. **F22 is fixed.** F10 is green with the eight entries removed. *Wrong*: delete the package
     README's free-functions sentence, and F10's documented-or-allowlisted case fails, naming the
     functions it held. The docblock's count is either pinned by a case, which fails when the figure
     is edited, or carries no figure. *Added in step 3* (Revision 4), before this step's gate.
  - `eval-core` −5, or −3 if F22's count gets a case; `eval-signals` and `eval-forms` unchanged.
    doc-links: the root README goes from 36
    checked links (after step 1) to the number the step reports. The gate is green.
    `git diff --name-only` lists the files above and this document.
- **Category**: documents, and specs. Ships in no package. *Amended at the gate* (Revision 6): it
  ships in `eval-core`'s next release for F23's one README correction, with its `[Unreleased]` line,
  and in no package otherwise.
- **Outcome** — done 2026-10-21, under Revision 6. The gate is green at 2601 / 439 / 376, from
  2604 / 439 / 376. Per file, `public-api.spec.ts` runs 27 cases, from 30, and `export-list.spec.ts`
  20, from 20: F11's root row out, the reverse case in. Every probe below was run against
  `eval-core`'s whole suite and reverted.
  - **Criterion 1**: the D5 case is green. Three probes, one per leg:
    - a `javascript` block in the root README fails it alone, 1 of 2601;
    - the same block labelled `ts` fails it alone, naming `README.md:40 (ts)`;
    - an `import { EvalService } from '@zvenigora/ng-eval-core'` line in prose, outside any fence,
      fails it alone, naming `README.md:40`.
  - **Criterion 2**: `IMPORT_PATTERN`'s `[^}]*` made `[^}\n]*` fails 2 of 2601, the two-line fixture
    case once in each file that runs it, and nothing else. The package README's two multi-line
    imports were dropped by that reader with every case over them green.
  - **Criterion 3**: the landing page links the three package READMEs and CHANGELOGs, `SECURITY.md`
    with `#advisories-for-ng-eval`, `#reviewed-external-advisories` and `#reporting-a-vulnerability`,
    all relative, the root `CHANGELOG.md`, both worked examples, `CONTRIBUTING.md`,
    `CODE_OF_CONDUCT.md` and `LICENSE`. The range grep lists nothing. *Wrong*: `` `acorn ^8.11.2` ``
    quoted in the packages paragraph, and the grep lists `README.md:28`.
  - **Criterion 4**: each § 3.4 row is placed:
    - on the landing page: the credits, "Why ng-eval?", the not-a-sandbox note, the packages, the
      related packages, security as links, contributing, the code of conduct and the license;
    - in `eval-core`'s README since step 3: install, every API section, the supported syntax and
      the options;
    - in each package README's `## Sibling packages` since steps 3 and 4: the packages;
    - dropped for § 3.4's reasons: the banner, the table of contents, the bare import block, the
      "2025 Update" security bullets with their best practices, the documentation-structure table
      and the Copilot footer.
  - **Criterion 5**: the grep lists 9 lines in four files, read one by one:
    - past tense: `readme-examples.spec.ts` `:31`, `:67`, `:129` and `:316` (`:67` and `:316` are
      step 3's two, unchanged); `public-api.spec.ts` `:11`; `eval-signals`' `public-api.spec.ts`
      `:9`;
    - present tense, naming the root README as the landing page and not as a documentation source:
      `public-api.spec.ts` `:14` and `:45`, which describe the D5 case, and `:638`, the D5 case's
      `describe` title, a code line.
  - **Criterion 6**: F10 is green with the eight entries out. *Wrong*: the free-functions sentence
    deleted fails 2 of 2601, F10's documented-or-allowlisted case in each file, naming `EvalState`,
    `callAsync`, `compile`, `compileAsync`, `evaluate` and `extract`; `call` and `parse` are named
    elsewhere in the README. The docblock carries no figure. *The reverse case*: `parse` put back on
    the allowlist fails 2 of 2601, the new case in each file, naming `parse`.
  - **F23**: retired whole. Both sweeps over the finished landing page list one line each, `:7`, the
    not-a-sandbox note: "sandbox" is its disclaimer, and "every" is in "every function in the
    context runs with the host's privileges", which says what the host exposes. The `eval-core`
    README sentence was measured against the built package; the retired entry gives the results.
    Both its halves are pinned in the built-ins case. *Wrong*: `callMember` refusing a member call
    whose receiver is a string or an array fails 85 of 2601 across 15 files. In
    `readme-examples.spec.ts` it fails the built-ins case at its new `'abc'.toUpperCase()` line, and
    the hooks case at its own `list.map`. Against the case before the leg, the built-ins case stays
    green under the same probe.
  - **F24** is opened and queued after the phase, with F21. It is the latent side of § 6.1's new
    rule, as F23's sentence is the false-now side.
  - **doc-links**: 346 files and 1571 links, 7 fewer than 1578, with 22 in `.ts` comments, from 21:
    - the root README, 36 to 17 (−19);
    - `backlog-retired.md` +2, the links to this plan from F3's note and from F22's entry;
    - `eval-core`'s CHANGELOG +1, to F23;
    - `public-api.spec.ts` +1, to F3, in its docblock;
    - `docs/backlog.md` +4, for F24: its index row, "Work in flight", and its entry's links to F21
      and F22;
    - this document +4: F24 in Revision 6 and in step 5's file list, and § 6.1's citations of F23
      and F24.

    The fourteen links to F22 and F23, ten here and four in the register, were re-pointed and leave
    the count unchanged.
  - **The review** found no Critical. Its three warnings, each fixed in the step:
    - the D5 case read imports a line at a time, with `'` and `"` only and no `(` after `import`, so
      it missed a dynamic `import(…)`, a backtick-quoted `require`, and a `from` whose specifier
      starts the next line. It now reads the whole text. *Probes*: a dynamic import in prose, and a
      static import split after `from`, each fail the case alone, 1 of 2601, naming its line;
    - the D5 case read a fence only at up to three spaces in, so a fence in a blockquote or a nested
      list item went unseen. It now admits any indentation and any `>` prefix, and reports a false
      fence rather than miss a real one. *Probe*: `> ```js` in a blockquote fails the case alone,
      1 of 2601, naming `README.md:40 (js)`;
    - "Work in flight" still named Revision 5.

    From its notes: the −3 conditional in `.claude/skills/step/SKILL.md`, § 4's table and § 6's gate
    table now say the reverse case gave it; the F10 docblock says three cases hold the list, not
    two; `export-list.spec.ts`' header no longer calls the three copies byte-similar, since only
    this one has the reverse case; and "Why ng-eval?" is an `##` heading. The downstream copies'
    allowlists were measured against their READMEs by the review: `eval-signals` has one entry and
    `eval-forms` none, and neither is named, so nothing is masked there today.

### Step 6 — The maintainer index, the condensed ROADMAP, and F19

- **New**: `docs/README.md` (§ 3.7). `docs/documentation/phase-10-summary.md`, the phase's one
  retrospect, unless § 8 q1 has added step 7, which then writes it. *Fixed at the gate* (Revision 7):
  q1 added steps 7 and 8, and step 8 writes it, so this step writes no summary.
- **Edit**:
  - `CONTRIBUTING.md`: a pointer to `docs/README.md` before `## Prerequisites`.
  - `ROADMAP.md`: § 3.7.
  - `CLAUDE.md`: F19's fix, which names `isDangerousProperty(foundKey)` in `member-expression.ts` by
    symbol; and Phase 10 recorded as complete, or left active if step 7 is pending.
  - `docs/backlog.md` and `docs/backlog-retired.md`: F19 retired and moved, and its index row
    re-pointed; "Work in flight".
  - `CHANGELOG.md` (root): § 3.9's lines.
  - This document: the outcome, including any links to `#f19` that the gate lists once F19 has moved.
- **Added at the gate** (Revision 7):
  - `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts` (`:41`, `:48`, `:109`) and
    `modules/eval-forms/signals/src/lib/readme-examples.spec.ts` (`:56`, `:61`), comment lines only,
    re-pointed to F3 in `docs/backlog-retired.md`. *Why*: they are five of finding 12's 15 live lines,
    and they quote three `ROADMAP.md` passages, "review practice rather than a gate", the "deferred
    documented-symbol drift gate" and the rejection of transcribed snippets. ef5ac2b moved all three
    to the register on 2026-09-07, and the drift gate is F3, built and retired. So the five were false
    before this step, criterion 6 offers re-pointing as the remedy, and § 6.1 fixes a false claim in the
    open step. Specs ship in no tarball, so the category is unchanged (§ 2's note on planned scope).
  - `docs/backlog.md`: [F25](../backlog.md#f25), from § 8 q4, with its index row.
  - This document: § 8 q1 answered, and steps 7 and 8 written.
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
- **Category**: documents. Ships in no package. *At the gate* (Revision 7): and comment lines in two
  `eval-forms` specs, which ship in no package either.
- **Probes fixed at the gate**, by § 6.1, one per new check, each reverted:
  - **P1a**: the `trace2/` row dropped from `docs/README.md`, and criterion 1's check lists its three
    files;
  - **P1b**, the other direction: `a8/plan.md` linked as `./a8/plan.md#a8`, and the check still lists
    nothing, so it does not over-report a link written another way;
  - **P2**: the `CONTRIBUTING.md` pointer moved below `## Prerequisites`, and criterion 2's line-order
    check reports it;
  - **P3a**: one retrospect path in `ROADMAP.md`'s table misspelled, and doc-links lists that line;
  - **P3b**: one word edited in the Phase 7 and Phase 8 section or in "Deferred work", and the one-off
    diff of those sections against b1a9863 is not empty;
  - **P4**: `CLAUDE.md` citing `:244`, the current line and so the realistic wrong fix, and also
    `:211`; the grep lists each;
  - **P5**: F19 moved before any link is re-pointed, and doc-links lists exactly the three links.
- **Outcome** — done 2026-10-21, under Revision 7. The gate is green at 2601 / 439 / 376, unchanged
  from step 5. release-tags: 38 rows, 48 tags, 0 failing. Every probe below was run and reverted.
  - **Criterion 1**: the check lists none of the 49 tracked files besides the index.
    - **P1a**: it lists exactly `trace2/step-1.md`, `step-2.md` and `step-3.md`.
    - **P1b**: it lists nothing.
    
    The check's rules are in [F25](../backlog.md#f25).
  - **Criterion 2**: `CONTRIBUTING.md` links `docs/README.md` at `:3`, and its first `##` is at `:7`.
    - **P2**: the link at `:5` and the first `##` at `:3`, and the check fails.
    - `docs/README.md`'s "Consumer documents kept here" marks the two worked examples.
  - **Criterion 3**: the table has one row per completed phase, seven, plus Phase 10's in flight.
    Every plan and retrospect link is resolved by the gate.
    - **P3a**: `statements/summary.md` misspelled, and doc-links lists `ROADMAP.md:62` alone.
    - The header with "Modules vs. new repositories", the Phase 7 and Phase 8 section and "Deferred
      work" are unchanged against b1a9863: 46, 16 and 14 lines.
    - **P3b**: one word in "Deferred work", and the check reports that section changed.

    Facts that were only in a removed section, and where each went:
    - Phase 9's ordering, "numbered after the two reserved phases, and run ahead of them: it was
      the one with a consumer waiting": the paragraph under the table.
    - The last relative link to `eval-core`'s `#040---2026-09-15`, in the Phase 2 section, and
      `#async-expressions`' link at `ROADMAP.md:267`. The first is recorded in F25's Part 2; the
      second anchor stays gated by `eval-signals`' README `:547` (§ 3.5).
    - Each phase's original framing: superseded proposals that its plan answered. They are in the
      file at b1a9863, which the paragraph names.

    Every other removed claim was found in its plan, its summary, a package README or the
    register. That covers the Phase 1 contract and its hooks' synchronous dispatch, Phase 2's
    completion record and its exclusions, Phase 3's tracking finding, Phase 4's three narrowings,
    Phase 5's shape and `await` correction, Phase 6's narrowings and its Angular 22 floor, the gates
    track's place ahead of Phase 2 (`gates/plan.md:7`), and the error-identity group.

    *From the review*: the Publication status table starts at Phase 2's releases, so the versions of
    Phases 1, 3, 4 and 6 are not in it. `ROADMAP.md`, `docs/README.md` and the root CHANGELOG now say
    so, and point to each package CHANGELOG's "Phase N of the roadmap" entry.
  - **Criterion 4**: `git grep -n "member-expression.ts:[0-9]" CLAUDE.md` lists nothing.
    - **P4**: with `:244` cited it lists `CLAUDE.md:323`, and with `:211` the same line.
  - **Criterion 5**: F19's entry is in `backlog-retired.md` between F18 and F22, and its index row
    points there.
    - **P5**: with F19 moved and nothing re-pointed, doc-links lists exactly three:
      `docs/backlog.md:125` ("Work in flight"), `:352` (the index row) and this document's `:137`
      (the Retires line, before Revision 7's header moved it).
    - All three are re-pointed, and the gate is green.
  - **Criterion 6**, the 15 lines, re-read against the condensed file:
    - `CLAUDE.md`'s two are true. They say what `ROADMAP.md` has left, Phases 7 and 8, and that
      deferred work is not in it.
    - `docs/backlog.md`'s eight: six are history or still true. The two in E1 are also kept, but the
      sentences after them said no one had reserved Phase 7, which has been false since `ROADMAP.md`
      reserved it. Those sentences are corrected (the review's W5).
    - The five in `eval-forms`' specs were false before the step, and are re-pointed to F3 by the
      gate's widening.
  - **doc-links**: 347 files, one more, and 1622 links, 51 more than 1571, with 0 dangling and 22 in
    `.ts` comments. `.claude/skills/step/SKILL.md` adds one, its link to F25 Part 3; the rest:
    - `docs/README.md` +69;
    - `ROADMAP.md` −35: the phase sections' links out, the table's and the package CHANGELOGs' in;
    - `CONTRIBUTING.md` +1;
    - `docs/backlog.md` +6: F25's index row, its entry's four links, and two in "Work in flight",
      less the one in F19's moved entry;
    - `backlog-retired.md` +2: F19's entry;
    - this document +7, all to F25: in Revision 7, § 2, step 6's additions, this outcome, step 8,
      § 8 q4 and § 9. The Retires line's link to F19 was re-pointed and changes no count.
  - **M9**, reproduced by the review in its own scratch directory: 393 / 605 / 868 lines, and 2 / 1 / 1
    "repository README" lines.
  - **The review** found no Critical and five warnings, each fixed in the step:
    - **W1**: the Publication status table's coverage, above;
    - **W2**: this outcome, which was missing, and `SKILL.md`'s place outside the list, below;
    - **W3**: three stale lines in `.claude/skills/step/SKILL.md`. "Steps 1–4 are done"; the
      `modules/` rule, which would have stopped step 8's CHANGELOG dates; and a "two categories" list
      with no place for the release;
    - **W4**: step 8 now records the release in F23's index row and status line;
    - **W5**: E1, above.

    Its notes were taken as well:
    - F25's Part 2 now says the last relative `#040` link went with this step;
    - § 3.5 and § 8 q2's `ROADMAP.md:267` are marked removed;
    - ef5ac2b is dated 2026-09-07, as git and the register have it;
    - "Suggested order" was done *or reserved*;
    - § 2 and § 3.9 no longer read q1 as open;
    - step 7 says what it leaves stale for step 8;
    - step 8 recounts the tag sentence from `git tag -l` (it counts 45 where release-tags reports
      48, missing the three tags of 2026-08-22), names F25's rules, and says what "Active plan"
      reads;
    - `docs/README.md` gives § 3.8's permalink rule.

    One note was not taken: citing F4 alone in `reactive/…/readme-examples.spec.ts`' first comment,
    since the gate fixed the re-pointing to F3. The comment names both: the practice F3 left in
    place, which F4 records.
  - **Outside the file list**: `.claude/skills/step/SKILL.md`, marking step 6 done, writing steps 7
    and 8 into its outline, and W3's corrections. Steps 3–5 edited it outside their lists the same
    way, and the commit body names it. `docs/README.md` was marked intent-to-add (`git add -N`),
    since doc-links reads `git ls-files`, and an untracked index would have gone unchecked.
  - *Added before the commit*, at the maintainer's instruction: `SKILL.md` requires that mark on a
    new document before the gate, and F25 gains it as Part 3, that doc-links should report an
    untracked `.md` rather than skip it.

### Step 7 — Release commit: `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1

*Written by Revision 7, at step 6's gate, which answered § 8 q1. It mirrors the A35 plan's step 10,
less the peer-range changes this release does not have.*
- **What the release fixes, measured (M9).** The npm pages show the READMEs of `eval-core` 0.13.0,
  `eval-signals` 0.6.0 and `eval-forms` 0.6.0. Each was extracted from its tarball and read:
  - `eval-core` 0.13.0, 393 lines. `:9` says the full documentation "is in the
    [repository README](https://github.com/zvenigora/ng-eval#readme)", and `:15` that the repository
    README "walks through each of these in full". Both have been false since step 5: the link lands
    on the landing page, which documents no API. **It does not carry F23's overclaim.** That sentence
    came into the package README with step 3's move, from the root README, so no `eval-core` tarball
    has printed it. 0.13.0 has no `## Install` and no peer sentence.
  - `eval-signals` 0.6.0, 605 lines. `:9-11` say "Expression syntax, security, and the evaluator's own
    options are documented in the repository README", linking the same `#readme`. That has been false
    since step 5. `:20` abbreviates `@angular/core >=19.0.0` to `>=19` (finding 9).
  - `eval-forms` 0.6.0, 868 lines. `:14-16` carry the same sentence and link. `:36-37` call `eval-core`
    "a sandboxed evaluator with no `eval`, safe under a strict CSP", which is F23's class. Step 4 fixed
    it in the repository.

  The repository's three READMEs carry none of these, so the release ships them as they stand. No
  README is edited in this step.
- **Why one commit.** It is not forced, as the A35 plan's was. `@nx/dependency-checks` resolves each
  declared range against the workspace's own version. `eval-core` 0.13.1 is inside both downstream
  manifests' `>=0.13.0 <0.14.0`, and `eval-signals` 0.6.1 is inside `eval-forms`' `>=0.6.0 <0.7.0`.
  It is one commit because the three are one docs-only release from one tree, so each Publication
  status row names one commit, as Phase 9's and the A35 plan's releases do.
- **No peer range moves.** Nothing in these releases needs 0.13.1 or 0.6.1, so no floor rises. Each
  README's peer sentence, and the case that checks it (step 4), stay as they are.
- **`eval-core` 0.13.1.** Bump `modules/eval-core/package.json`, and move `[Unreleased]` under
  `## [0.13.1] - <date>`. The F23 bullet is reworded. M9 shows that 0.13.0's README never said an
  expression over an empty context cannot use the built-ins, so "the README no longer says" describes
  a change no reader of the published package saw. The entry says instead that the evaluation section
  brought in from the repository README states the built-ins precisely, citing F23.
- **`eval-signals` 0.6.1** and **`eval-forms` 0.6.1.** Bump each `package.json`, and move
  `[Unreleased]` under the new heading. Their bullets already describe the change against 0.6.0's
  READMEs, as M9 measured.
- **Edit**: the three `modules/<name>/package.json` and the three `modules/<name>/CHANGELOG.md`;
  `docs/backlog.md`, "Work in flight"; this document, the outcome. `.claude/skills/step/SKILL.md`
  marks the step done, as steps 3–6 did. `CLAUDE.md`'s "at its step 7" and `docs/README.md`'s
  "Steps 1–6 are done" are left for step 8, which closes the phase in both, as the A35 plan's step
  10 left its own for step 11.
- **Exit criteria**:
  1. The gate is green on the release commit, with **counts unchanged from step 6, exactly:
     2601 / 439 / 376**. Any movement is a stop condition, since no file this step edits is compiled
     or tested.
  2. **All five built `.d.ts` files are byte-identical to the published tarballs' of 0.13.0, 0.6.0
     and 0.6.0, by SHA-256.** `package.json` is reported separately, and only its `version` differs
     from the published manifest. A mismatch anywhere is a stop-and-report. *Wrong* (P7a): the same
     comparison against `eval-core` 0.11.1's tarball, whose `.d.ts` lacks 0.12.0's two additions,
     reports a mismatch. (0.12.0 and 0.12.1 are not probes: the register records 0.12.1's and
     0.13.0's `.d.ts` as byte-identical to the version before.)
  3. **Each built README is the repository's, and none carries what M9 found.** `cmp` of
     `dist/modules/<name>/README.md` against `modules/<name>/README.md` is silent for all three.
     `grep -c "repository README"` gives 0 in each built README. The built `eval-signals` README has
     no `` `@angular/core >=19` `` span, and the built `eval-forms` README no "sandboxed evaluator".
     *Wrong* (P7b): the same three greps over the published tarballs' READMEs give 2, 1 and 1 for
     "repository README", and find the span and the sentence, as M9 measured.
  4. Each CHANGELOG's `[Unreleased]` is moved under its new version, with an empty `[Unreleased]`
     kept above it and `eval-core`'s F23 bullet reworded as above.
  5. Then CONTRIBUTING's Releasing steps 3–5, by the maintainer: publish in the order `eval-core` →
     `eval-signals` → `eval-forms`, confirm each with `npm view`, and tag `eval-core@0.13.1`,
     `eval-signals@0.6.1` and `eval-forms@0.6.1` at this commit. The tags are **annotated**, with
     `git tag -a` as step 5 writes it: the A35 plan's step 11 found its tags pushed lightweight first.
  - Tests 0 / 0 / 0. doc-links: files unchanged, links reported.
- **Category**: the release, three docs-only patches. No `.d.ts` changes and no peer range moves.
- **Outcome** — done 2026-10-21, under Revision 8. The gate is green at 2601 / 439 / 376, unchanged
  from step 6. The three manifests move `version` and nothing else, and each CHANGELOG's
  `[Unreleased]` moves under `## [<version>] - 2026-10-22`, with an empty one kept above it.
  - **Criterion 2**: the five built `.d.ts` files match the published tarballs' by SHA-256: `eval-core`
    `4f11d36f…`, `eval-signals` `743ce484…`, and `eval-forms` `9cdb2816…`, `/reactive` `f2570daa…`
    and `/signals` `3a9cf281…`. Each built `package.json` differs from the published manifest in
    `version` only.
    - **P7a**: against `eval-core` 0.11.1's tarball, `c0ed0733…`, a mismatch.
  - **Criterion 3**: `cmp` of each built README against the repository's is silent. "repository
    README" counts 0 / 0 / 0, the `eval-signals` span 0, the `eval-forms` sentence 0.
    - **P7b**: over the published tarballs' READMEs, 2 / 1 / 1, the span 1, the sentence 1.
  - **Criterion 4**: the F23 bullet says the evaluation section brought in from the repository README
    states the built-ins precisely, over the default, empty context, with no code change and no
    behaviour change.
  - **The review** found no Critical and two warnings, each fixed in the step:
    - **W1**: the reworded bullet had dropped the empty-context condition the README states;
    - **W2**: "Work in flight" still gave the plan as Revision 7.

    Its two notes were taken: this outcome is dated by the local commit date, as earlier ones are,
    and `SKILL.md`'s line carries the revision.
  - **doc-links**: 347 files, unchanged, and 1622 links, unchanged, with 0 dangling. The F23 link
    moves under 0.13.1 and nothing adds one.
  - **Criterion 5** is the maintainer's, and outstanding at this commit.

### Step 8 — Post-publish record, the retrospect, and the phase closed

*Written by Revision 7. It mirrors the A35 plan's step 11, and closes the phase.*
- **After the maintainer publishes and tags** all three (CONTRIBUTING's Releasing step 6):
  - **New**: `docs/documentation/phase-10-summary.md`, the phase's one retrospect.
  - `docs/backlog.md`: three Publication status rows; the tag sentence, recounted from `git tag -l`
    rather than raised by three, since it counts 45 where `tools/release-tags.mjs` reports 48 at
    b1a9863; one Register history row counted as that section describes; and "Work in flight";
  - `docs/backlog.md` and `docs/backlog-retired.md`: the release in F23's index row and status line,
    `eval-core` 0.13.1, since its README line is the one register fix that ships in it, as the A35
    plan's step 11 recorded its releases;
  - `CLAUDE.md`: the three published versions; Phase 10 complete, with this plan in the list of
    completed plans and what it is the reference for; the active-plan sentences;
  - `.claude/skills/step/SKILL.md`: retargeted, since no plan is then active;
  - `ROADMAP.md`: Phase 10's row is no longer in flight, and links its retrospect;
  - `docs/README.md`: this plan moves from "Active plan" to the completed phases, with its summary,
    and "Active plan" says that none is active and that the next one is listed there when written;
  - each `CHANGELOG.md`: the heading's date, only where npm's differs;
  - this document: the outcome.
- **Exit criteria**:
  1. The gate is green, with counts unchanged at 2601 / 439 / 376. `tools/release-tags.mjs` is green:
     every Publication status row's tag exists at the commit it names, and the three new rows name
     step 7's. *Wrong* (P8a): a new row naming another commit, and release-tags fails on that row.
  2. **The tags are annotated.** `git cat-file -t` gives `tag` for each of the three. *Wrong* (P8b): a
     lightweight scratch tag gives `commit`, and is deleted.
  3. **The npm pages are fixed.** M9 run again on the three new versions: `grep -c "repository
     README"` gives 0 in each extracted README. *Wrong* (P8c): M9's own counts for 0.13.0, 0.6.0 and
     0.6.0, which are 2, 1 and 1.
  4. **The index is still complete.** A check applying [F25](../backlog.md#f25)'s rules, the ones step
     6's one-off check applied, lists nothing, with the summary linked. *Wrong*: the summary left
     unlinked, and the check lists it.
  5. **The phase is closed wherever it is named.** `CLAUDE.md`, `ROADMAP.md`, `docs/README.md`, "Work in
     flight" and `.claude/skills/step/SKILL.md` each call Phase 10 complete. The report quotes the line
     in each.
  - Tests 0 / 0 / 0. doc-links: +1 file, the summary; links reported.
- **Category**: the release's docs-only post-publish commit. Ships in no package.

---

## 5. Public API surface

None. No exported symbol, no `.d.ts` and no `package.json` changes in steps 1–6. A diff that touches a
non-spec `.ts` file is out of scope (§ 2). Step 7 changes three manifests' `version` and nothing else
in them, and its criterion 2 holds every `.d.ts` byte-identical to the published one (Revision 7).

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | Baseline, then +3 at step 2, +7 at step 3, +1 at step 4 and −5 at step 5 (−3 as run, Revision 6); no other change. The baseline was 2448 at this plan's commit, and 2596 when the phase resumed at 4f99112 (Revision 4): 2596 → 2603 at step 3 |
| `eval-signals` / `eval-forms` tests | (in the above) | +1 each at step 4; unchanged in every other step |
| Steps 6–8 | (in the above) | 2601 / 439 / 376 in every one, exactly (Revision 7) |
| The release (step 7) | SHA-256 of each built `.d.ts` against the published tarball's | Byte-identical, all five |
| Docs | the root `test` target (`tools/doc-links.mjs`, `tools/release-tags.mjs`) | Green. doc-links' file and link counts move as § 4's table says |
| Scope | `git diff --name-status` | Exactly the step's file list. No `R`. A `D` only in step 1, and only for D3's ten |
| No library change | the diff's `.ts` files | Spec files, or comment lines only |
| One-off checks | the commands each step names | Reported in the step, not added to the gate |

### 6.1 The spec discipline for documentation

- **Standing rule: a documented example is strong enough that the wrong implementation of its claim
  fails its case.** An example that survives the probe is strengthened, not excused: it gains the
  line, the value or the option that lets the wrong implementation show. The criterion is never
  narrowed to match. *Added in step 3* (Revision 4), from three instances in that step's criterion 3.
  Each was measured as surviving its probe as the root README printed it:
  - **W2**: an identifier resolves through the context's own options, so the case-insensitive block
    gained a member read;
  - **W4**: `await` flattens a promise at the top of the result, so each async block gained a nested
    one;
  - **W5**: the state block's options were the defaults, so it sets `caseInsensitive: true`.

  The same rule covers a count a document or docblock states: it is pinned by a case, as step 3
  pinned the `sh` and `json` counts, or it loses its figure ([F22](../backlog-retired.md#f22), step 5). It
  covers any figure the case does not read, such as a sibling package's range (step 4, § 3.5).
- **Standing rule: every new check needs a probe that proves it can fail.** A check that cannot
  fail reports coverage it does not have, and it can fail to fail for a reason unrelated to its
  claim. The probe breaks what the check claims to catch, and the report reads which cases went
  red. *Added in step 4* (Revision 5), from three instances:
  - **The `caseInsensitive` fixture on a `TypeError`** ([A35 plan](../a35/plan.md), § 1.2,
    "Standing rules, from Revision 16"). Under `caseInsensitive`, `fromContext` copies the data into
    a `Registry`, so the fixture's assignment onto `original` inserted nothing. Seven
    native-writer cases had been passing on a `TypeError` from `Object.assign(undefined, …)`, not on
    any refusal. A bare `toThrow()` could not tell the two apart.
  - **W2, W4 and W5** (step 3, criterion 3, and the rule above): three README examples that passed
    under the wrong implementation of their own claim.
  - **The span pattern crossing blank lines** (step 4's review). The peer-range reader's
    `` /`([^`]+)`/g `` let one stray backtick invert span pairing for the rest of a README, so
    every later range went unchecked. A stray backtick with a wrong range after it left all 439
    `eval-signals` cases green; the pattern that ends a span at a blank line fails the case.
- **Standing rule: a claim that is false now is fixed in the step that is open; a gap that is only
  latent gets a register entry and a schedule.** A false claim misleads every reader until it is
  fixed, so the open step fixes it, even where that widens the step at its gate. A latent gap misleads
  no one yet, so it is recorded with its measurements and scheduled into a step that already edits its
  files, or queued after the phase when none does. *Added in step 5* (Revision 6), from its two
  sides:
  - **False now**: `modules/eval-core/README.md:81`, under `### Evaluation — EvalService`
    ([F23](../backlog-retired.md#f23)), said an expression over an empty context cannot use
    JavaScript's built-ins, while a value's own methods stay callable. Step 5 fixed it, and pinned
    both halves of the new sentence in the built-ins case, by two additions at its gate.
  - **Latent**: `eval-signals`' and `eval-forms`' copies of `export-list.spec.ts` lack F22's reverse
    case ([F24](../backlog.md#f24)). `eval-signals`' one allowlist entry is not in its README, and
    `eval-forms`' allowlist is empty, so nothing is masked today. No later step edits either project,
    so it is queued after the phase.
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
| npm pages lag the repository | **Certain** until step 7's releases are published; since step 5 they send readers to a page that no longer documents the API (M9) | Step 7, criterion 3; step 8, criterion 3 |
| `docs/README.md` stops listing a new document | Medium after Phase 10 | Step 6, criterion 1, once; § 8 q4 |

---

## 8. Open questions

Each question is stated here and decided elsewhere.

1. **Docs-only patch releases at the end.** Steps 3 and 4 change files that ship:
   `modules/eval-core/README.md` and its CHANGELOG, and the `eval-signals` and `eval-forms` READMEs and
   CHANGELOGs. The candidates are `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms` 0.6.1, each
   with a `.d.ts` byte-identical to the version before it, and § 3.9 shows that no peer range needs to
   move. **Until they are published**, the npm pages show the READMEs of `eval-core` 0.13.0,
   `eval-signals` 0.6.0 and `eval-forms` 0.6.0. *Corrected in step 3* (Revision 4): this named
   0.12.1 / 0.5.2 / 0.5.1 and the READMEs of 0.12.0 / 0.5.1 / 0.5.0, all from before the A35 plan
   released 0.12.1 and 0.13.0 / 0.6.0 / 0.6.0. Each of those says the full documentation, or the
   expression syntax and security, is in the repository README, and links its `#readme`. After step 5
   that link lands on the landing page, which links each package README on GitHub. That is one hop more
   than the npm page promises, and the page describes documentation its target no longer holds. *To
   decide*: which packages are released, when (after step 6, or after step 4 for the two downstream
   packages), and whether step 7 exists.
   **Answered at step 6's gate** (Revision 7): all three, after step 6, as `eval-core` 0.13.1,
   `eval-signals` 0.6.1 and `eval-forms` 0.6.1. Step 7 is the release commit, and step 8 the
   post-publish record and the phase's close. M9 measured what the published READMEs say, and step
   7's scope is fixed by it.
2. **`eval-forms`' README, at 864 lines.** Splitting it into files per entry point, or reordering it,
   is out of this phase: D6 rules out guide files, and step 4 changes only its opening. *Constraints*,
   whatever the answer: the two adapters' count cases find their blocks by three headings (§ 3.5); its
   anchors are linked from `docs/forms/worked-example-signals.md:240`, `docs/backlog-retired.md:3675`
   (`:3182` at this plan's commit, *corrected in step 4*) and `ROADMAP.md:267` (the last through
   `eval-signals`; removed by step 6's condensing); two of its absolute links point at the worked
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
     (`eval-forms` `:848`).

   *Corrected in step 4* (Revision 5): these lines are the READMEs as published, in `eval-core`
   0.13.0, `eval-signals` 0.6.0 and `eval-forms` 0.6.0, all at f7f27f7. The `eval-core` lines are
   right for 0.13.0. Step 3 has since rewritten the repository's copy, which drops both `#readme`
   links and is not yet published. `eval-forms` `:848` was `:844` at this plan's commit.

   *The case that forces the question*: `modules/eval-signals/README.md:399` (`:397` at this plan's
   commit) links `docs/backlog.md#a24`. Retiring A24 moves its entry to `backlog-retired.md`, which is
   the register's own convention, and that anchor stops existing on `master` while 0.5.0, 0.5.1 and
   0.6.0 still print it.
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

   **Moved to the register at step 6's gate** (Revision 7): both parts are
   [F25](../backlog.md#f25), queued after the phase with F21 and F24. It records step 6's check, its
   rules and its probes, for whoever builds the gate.

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
   (§ 8 q4, now [F25](../backlog.md#f25)). Releases are provided by step 7, as docs-only patches
   (§ 8 q1, Revision 7).
