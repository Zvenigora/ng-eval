# Phase 11 Plan — `eval-forms`' README by entry point

**Date**: October 27, 2026
**Revision**: 1 — initial plan.
**Target**: `modules/eval-forms/README.md`, reordered in place, with a contents list, and the
`/reactive` count case that bounds its blocks by heading. Shipped files touched:
`modules/eval-forms/README.md` and `modules/eval-forms/CHANGELOG.md` (steps 1 and 2),
`modules/eval-forms/package.json` (step 3). One spec touched:
`modules/eval-forms/reactive/src/lib/readme-examples.spec.ts`, two strings — the count case's `from`
and its title — and comment lines (step 2, § 1.2 finding 6).
**Also touches**: no library code. No exported symbol and no `.d.ts` changes. `eval-core` and
`eval-signals` change in nothing (D5).
**Retires**: [F28](../backlog.md#f28), in step 4.
**Source**: the request of 2026-10-27, which fixed D1–D6 and the four steps, on a read-only inventory
of the three package READMEs taken the same day at 8e6a617 (§ 1.3).
**Objective**: one `eval-forms` README that a reader of one adapter can read without the other's
sections in the way: the package's sections, then what both adapters share, then `/reactive`, then
`/signals`, each fact stated once, with a contents list over it.

**Conclusion, stated first so the rest reads as its argument**: keep every package's one README and
add no guide file (D1), because a file outside a package's root folder does not ship and a `docs/`
path a published README prints binds for as long as that version is installed. Reorder `eval-forms`'
README by entry point, every heading keeping its exact text (D2), so that every anchor any document
links still resolves and the four headings specs read by text still match. Move the two `/reactive`-only
passages out of the shared sections, and state the two facts the README states twice once, in
`/reactive`'s copy, which `/signals` links. Give that README alone a contents list (D3), and leave the repetition across packages
alone (D4). Ship it as `eval-forms` 0.7.1, docs-only (D5). No test row moves in any step.

---

## 0. Rules this plan adds

None. The standing rules ([`standing-rules.md`](../standing-rules.md)) govern every step. The
retrospect (step 4) promotes any rule the phase earns, and says so if it earns none.

---

## 1. Current state

### 1.1 What exists today

| File | Lines | Ships | This plan |
| :--- | ---: | :--- | :--- |
| `modules/eval-core/README.md` | 671 | `eval-core`'s tarball | Untouched (D4, D5) |
| `modules/eval-signals/README.md` | 627 | `eval-signals`' tarball | Untouched (D4, D5) |
| `modules/eval-forms/README.md` | 893 | `eval-forms`' tarball, the one README for all three of its entry points | Reordered (D2), with a contents list (D3) |

Each tarball ships `README.md`, `LICENSE`, `CHANGELOG.md` (each `ng-package.json`'s only asset), the
`fesm2022` bundles and `types/*.d.ts`, and nothing else (M2). `eval-forms`' secondary entry points have
no README (`modules/eval-forms/reactive/` and `signals/` hold none), and no secondary
`ng-package.json` declares an asset, so nothing but each entry point's `package.json` is built into
its `dist/` folder, and those two the build's `.npmignore` excludes (M2). Each packed README is
byte-identical to the repository's at 8e6a617.

No README has a contents list. Each points at the other two from `## Sibling packages`
(`eval-core` `:15-16`, `eval-signals` `:25`, `:28`, `eval-forms` `:28`, `:31`), by the `#readme` URLs
that `tools/published-links.txt:34`, `:35` and `:37` bind.

### 1.2 Findings that shape the plan

1. **`eval-forms`' README is ordered by history, not by entry point** (M1). Between `:125` and `:593`
   it holds `/reactive`'s sections and three shared ones interleaved:

   | Section, at 8e6a617 | Class | Evidence |
   | :--- | :--- | :--- |
   | `## Quick start — Reactive Forms (/reactive)` `:125-185` | `/reactive` | imports `/reactive` `:135` |
   | `## How it fits together` `:186-209` | shared | rows tagged `/reactive` `:190-194`, core `:195-199`, `/signals` `:200-203` |
   | `## The field schema` `:210-226` | `/reactive` | `FieldSchema` is `/reactive`'s (`:192`) |
   | `### It is validated when you bind` `:227-262` | `/reactive` | `bindFieldProperties` `:230`; `addControl` `:251` |
   | `### Expressions are validated too` `:263-303` | `/reactive` API; its subject is that both entry points agree | block `:272`; `/signals` named `:266`, `:286`, `:295` |
   | `## What an expression can name` `:304-323` | `/reactive` | "the form's controls" `:306`; "the `/reactive` binding passes `{}`" `:320` |
   | `### An empty control reads as absent` `:324-336` | `/reactive` | `FormControl` `:327` |
   | `### Colon-joined names` `:337-379` | `/reactive` | `bindFieldProperties` `:342`, `:360` |
   | `## Coercion` `:380-410` | shared, but for `:408-409` | `toVisible` / `toText` are core's (`:196`); `/signals` links it at `:666` |
   | `## When a rule fails` `:411-483` | shared, but for `:452-454` | imports the bare specifier `:432`; "in either adapter" `:450` |
   | `## Reactivity, and its two holes` and its two `###` `:484-559` | `/reactive` | `valueChanges` `:486` |
   | `## Lifetime` and `### Constructed, not computed` `:560-593` | `/reactive` | `/signals` calls it "`/reactive`" at `:672` |

   The README's own map at `:127-130` agrees: everything to Lifetime is `/reactive` "except for three
   sections that cover both". `## Signal Forms — /signals` and its seven `###` (`:594-855`) are
   `/signals` only. `## What is not here` (`:856-876`) covers both adapters.
2. **Two passages in shared sections are `/reactive` only.** `:408-409` says a *destroyed* property
   still answers `false` / `''`, and only `/reactive` has `destroy()` (`:672-673`). `:452-454` says a
   parse error "throws from `bindFieldProperties` itself", which is `/reactive`'s function, and that
   "the binding releases everything it had already built before rethrowing", which is `/reactive`'s
   binding. The parse error itself is both adapters' (§ 8 q1); the release is not.
3. **Two facts are stated twice inside the README**, once on each adapter's side:
   - `:279-282` and `:722-725`: an identifier resolved off `Object.prototype` "to a *function*, a
     function is truthy", and since `eval-core` 0.11.0 the evaluator refuses it per evaluation, under
     `onError`. `grep -c "a function is truthy"` gives 2.
   - `:288-294` and `:741-750`: a rule that binds such a name itself never evaluated, because
     `eval-core` "refuses to bind" those names and throws `Access to dangerous property …` every time.
     `grep -c "refuses to bind"` gives 2.
4. **Repetition across packages exists, and D4 keeps it**: the `## Security` paragraph (`eval-forms`
   `:40-48`, `eval-signals` `:37-44`, `eval-core` `:22`); the sources sentence (`eval-forms` `:35`,
   `eval-signals` `:32-33`, `eval-core` `:18`); `provideColonIdentifiers`' two lines (`eval-forms`
   `:351-352`, `eval-core` `:222-223`); the write guard (`eval-forms` `:460-474`, `eval-signals`
   `:262-301`); what bypasses `onError` (`eval-forms` `:450-458`, `eval-signals` `:118-121`).
5. **`## Development` understates the `/reactive` spec's coverage — false now** (SR31). `:884-887`
   say the spec under `reactive/src/lib/` covers "the `/reactive` blocks, the shared core's two
   Coercion blocks and the worked example". It also executes `## When a rule fails`'
   `applyErrorPolicy` block, in two cases (`reactive/src/lib/readme-examples.spec.ts:71-72`,
   `:348-362` and `:364-375`). Its last sentence names the template and manifest blocks as the ones
   not covered; no case executes three `ts` blocks either — the opening rule (`:6`), `interface
   FieldSchema` (`:212`) and the Lifetime fragment (`:565`), as the spec's docblock says (`:88-96`,
   `:104-107`) — nor the `sh` blocks.
6. **The reorder makes the `/reactive` spec's docblock false.** It says the counted range starts at
   the Quick start (`reactive/src/lib/readme-examples.spec.ts:26-28`, `:56-58`), that the range
   "holds two of the shared core's sections as well", `## Coercion` and `## When a rule fails`
   (`:58-61`), and lists the blocks it executes "in document order" with the Quick start first
   (`:63-74`). After the reorder the range opens with the shared group, and Coercion's and When a
   rule fails' blocks come first. The cases and constants stay; the comment lines are corrected in
   step 2. The `/signals` spec's comments, which call `### Expressions are validated too` a
   `/reactive` section (`signals/src/lib/readme-examples.spec.ts:24`, `:33-34`), stay true: that
   section does not move (§ 3.2).
7. **The directional words stay true under this order** (M3). The three in `### Expressions are
   validated too` were re-read for it: `:265` "`bindFieldProperties` also refuses" follows
   `### It is validated when you bind` (`:227-262`), which still precedes it; `:281` "the field-name
   check above" is `:242-249`, still above; `:290` "both are refused above" is the same check, and
   `:251-256` for a control added later. Moving the three shared sections ahead of the Quick start
   moves none of the text these words point across. The other hits stay true too: `:99`, `:110`,
   `:231`, `:237` ("See below", within one section), `:246`, `:251`, `:254`, `:261`, `:318`
   (`The field schema` still precedes `What an expression can name`), `:596`, `:664`, `:733`,
   `:793`; `:127`, `:130` and `:159` are rewritten or checked in step 2. Of the shared group's three
   `ts` blocks, `:384` names `toVisible` and `:397` `toText`, which share one row of
   `## How it fits together` (`:196`), still ahead of them; `:431` imports both of its names. None names what the Quick
   start introduces (`:133-159`), which they will now precede.
8. **Every inbound anchor survives if every heading keeps its text** (M1). Anchors are heading slugs,
   which ignore the level (`tools/doc-links.mjs:115-141`). Into `eval-forms`' README, from outside it:
   `docs/forms/worked-example-signals.md:240` (`#caseinsensitive-per-registration`),
   `docs/backlog-retired.md:4329` (`#two-things-that-are-not-available-here`), `docs/gates/plan.md:56`
   (`#reuse-a-schema-function-not-a-schema-value`), and whole-file links at `README.md:24`,
   `docs/forms/worked-example.md:228`, `docs/backlog-retired.md:4522` and the CHANGELOG's `:443`,
   `:467`. Of these only the file binds (`tools/published-links.txt:35`); no published README links an
   `eval-forms` heading. The README links its own headings 24 times (`:22`, `:67`, `:127-130`, `:198`,
   `:199`, `:207`, `:208`, `:221`, `:239`, `:240`, `:296`, `:666`, `:672`, `:753`, `:833`, `:853`,
   `:860`, `:869`, `:886`).
9. **Three readers find `eval-forms` blocks by heading, and one moves** (M1):
   - `reactive/src/lib/readme-examples.spec.ts:700-701` counts `ts` fences between the exact lines
     `## Quick start — Reactive Forms (`/reactive`)` and `## Signal Forms — `/signals``, and holds 11
     (`:30`): `:132`, `:161`, `:212`, `:269`, `:348`, `:384`, `:397`, `:431`, `:500`, `:529`, `:565`.
     After the reorder the shared group precedes the Quick start, so `from` moves to its first heading,
     `## How it fits together`, and the range holds the same 11.
   - `signals/src/lib/readme-examples.spec.ts:710` counts every fence whose heading stack includes
     `Signal Forms — `/signals``, 6 (`:22`), and `:714` those under `Expressions are validated too`,
     1 (`:25`). Neither depends on the level or the position of its heading.
   - The peer-range case reads `## Install` by name (`modules/eval-forms/src/public-api.spec.ts:153`),
     and the fenced pairs of `## Versions` (`:89-94`) from any section.

   Whole-file readers do not see order: the import floors (`src/public-api.spec.ts:50`,
   `reactive/src/public-api.spec.ts:43`, `signals/src/public-api.spec.ts:37`), F11
   (`src/export-list.spec.ts:507`) and F10 (`:548`).

### 1.3 Measurements run for this plan

At 8e6a617, read-only, on 2026-10-27:

- **M1** — a heading reader that skips fences as the specs' `fencedBlocks` does: every heading of the
  three READMEs with its range, its blocks by language and line, its `@zvenigora/` imports and its
  links. The tables in § 1.2 are its output.
- **M2** — `npm pack` of `@zvenigora/ng-eval-core@0.14.0`, `ng-eval-signals@0.7.0` and
  `ng-eval-forms@0.7.0`: their file lists, their READMEs (each `git diff --no-index` empty against
  master) and their CHANGELOGs' README links.
- **M3** — `grep` of `eval-forms`' README for `above`, `below`, `later`, `earlier`, `from here`,
  `truthy` and `refuses to bind`: 22 lines, each decided in finding 7 or finding 3.
- **M4** — whether `/signals` throws a parse error past `onError`: read in
  `modules/eval-forms/signals/src/lib/rules.ts`, witnessed by an existing case, and probed. § 8 q1
  gives the result.

---

## 2. Scope

### In scope

- D1–D6 (§ 3.1), as steps 1–4.
- Finding 5, in step 1, as SR31 requires of a claim false now.
- Finding 6's comment lines in the `/reactive` spec, in step 2, with the move that makes them false.
- The plan's own records: `ROADMAP.md`'s Phase 11 row, `docs/README.md`'s Active plan, `CLAUDE.md`'s
  active-plan sentences, `.claude/skills/step/SKILL.md` and F28's register row and entry, in step 1;
  closed in step 4.

### Out of scope, recorded

- **A contents list in `eval-core`'s or `eval-signals`' README.** D3 gives one to `eval-forms` only.
- **Any split**: a guide file, a README per entry point, or a section moved to another file (D1).
- **Anything under `docs/` moving or being renamed** ([Phase 10 plan](phase-10-plan.md) D2, § 3.2).
- **Repetition across the three READMEs** (D4, finding 4).
- **A changed heading text** in `eval-forms`' README. Each is an anchor (finding 8), and four are read
  by text by specs (finding 9).
- **Library code.** A change to any non-spec `.ts` file other than in a comment line is a
  stop-and-replan.
- **A new case.** Every step moves the rows 0 / 0 / 0 ([SR10](../standing-rules.md#sr10)).

---

## 3. Design

### 3.1 The decisions — fixed by the request, not reopened

- **D1. No split: each package keeps one README, and there are no guide files.** A README in a
  secondary entry point's folder does not ship today: `modules/eval-forms/reactive/ng-package.json`
  and `signals/ng-package.json` declare no assets, so the build writes only each one's `package.json`
  to its `dist/` folder, which the build's `.npmignore` then excludes, and the 0.7.0 tarball holds no
  `reactive/` or `signals/` path (M2). Shipping one would take an asset declared for it, and npm
  would still show only the root README on the package's page. A guide under `docs/`, linked from a published README, binds its
  path for as long as that version stays on npm, and resolves against `master` rather than the
  installed version (`tools/published-links.txt:3-14`).
- **D2. `eval-forms`' README reorders by entry point**: the package's sections, then the shared ones —
  How it fits together, Coercion, When a rule fails — then `/reactive`, from the Quick start to
  Constructed, not computed, then `/signals`, then What is not here and Development. **Every heading
  keeps its exact text and its level.** `### Expressions are validated too` stays where it is, under
  `## The field schema` in `/reactive`. The `/reactive`-only lines leave the shared sections:
  `:408-409` into `/reactive`'s Lifetime, and `:452-454`'s release clause beside
  `bindFieldProperties`. Each fact is stated once within the README: of `:279-282` / `:722-725` and
  `:288-294` / `:741-750`, the copy in `### Expressions are validated too` stays and the `/signals`
  side links it. `:127-130` is rewritten to the new order. Evidence: finding 1's table, findings 2
  and 3.
  `Expressions are validated too` is not in the shared group although its subject is that both
  entry points agree: its block calls `bindFieldProperties` with the Quick start's `injector`, so
  there it would precede the names it uses, and its three directional words would point at a check
  that then followed it (finding 7).
- **D3. A contents list, in `eval-forms`' README only**, grouped package / shared / `/reactive` /
  `/signals`. Evidence: no README has one (§ 1.1).
- **D4. Repetition across packages stays**; each README stands alone on npm. Evidence: finding 4, and
  each README is the only document its tarball carries (M2).
- **D5. Release: `eval-forms` 0.7.1, a docs-only patch.** `eval-core` and `eval-signals` are
  unchanged. Evidence: only `eval-forms`' shipped files change.
- **D6. This file**, `docs/documentation/phase-11-plan.md`, beside Phase 10's plan, which deferred
  the question (its D6 and § 8 q2).

### 3.2 The order after step 2

Levels and texts as they stand at 8e6a617, unchanged. "From" is the source range there.

| # | Heading | From | Group |
| ---: | :--- | :--- | :--- |
| — | `# @zvenigora/ng-eval-forms`, its intro, then the contents list (§ 3.5) | `:1-13` | package |
| 1 | `## Install` | `:14-25` | package |
| 2 | `## Sibling packages` | `:26-37` | package |
| 3 | `## Security` | `:38-49` | package |
| 4 | `## When *not* to use this library` | `:50-68` | package |
| 5 | `## Entry points` | `:69-81` | package |
| 6 | `## Versions` | `:82-124` | package |
| 7 | `## How it fits together` | `:186-209` | shared |
| 8 | `## Coercion` | `:380-407`, `:410` | shared |
| 9 | `## When a rule fails`, its parse-error item adapter-neutral (§ 3.3) | `:411-483`, but for `:453-454`'s release clause | shared |
| 10 | `## Quick start — Reactive Forms (`/reactive`)` | `:125-185`, its `:127-130` rewritten | `/reactive` |
| 11 | `## The field schema` | `:210-226` | `/reactive` |
| 12 | `### It is validated when you bind`, gaining the release clause | `:227-262` | `/reactive` |
| 13 | `### Expressions are validated too`, where it is | `:263-303` | `/reactive` |
| 14 | `## What an expression can name` | `:304-323` | `/reactive` |
| 15 | `### An empty control reads as absent` | `:324-336` | `/reactive` |
| 16 | `### Colon-joined names` | `:337-379` | `/reactive` |
| 17 | `## Reactivity, and its two holes` | `:484-492` | `/reactive` |
| 18 | `### `{ emitEvent: false }` freezes a value` | `:493-523` | `/reactive` |
| 19 | `### The key **set** is not reactive` | `:524-559` | `/reactive` |
| 20 | `## Lifetime`, gaining `:408-409` | `:560-581` | `/reactive` |
| 21 | `### Constructed, not computed` | `:582-593` | `/reactive` |
| 22 | `## Signal Forms — `/signals`` and its seven `###`, in today's order | `:594-855` | `/signals` |
| 23 | `## What is not here` | `:856-876` | package |
| 24 | `## Development` | `:877-893` | package |

Of the sections, only items 7–9 move: the three shared ones go ahead of the Quick start, and every
other section keeps its order relative to the rest. Two passages move as well (§ 3.3). The `/signals` spec's match on `Expressions are validated too`
(`signals/src/lib/readme-examples.spec.ts:714`) reads the heading stack by text, and the heading
neither moves nor changes.

**What the reactive count's range then holds**: `## How it fits together` up to `## Signal Forms`,
items 7–21. Its `ts` fences are the shared group's three (`:384`, `:397`, `:431`) and `/reactive`'s
eight (`:132`, `:161`, `:212`, `:269`, `:348`, `:500`, `:529`, `:565`): 11, the same fences.
`## How it fits together` holds none, so a `from` at `## Coercion` would count the same 11; the count
cannot tell the two apart, and step 2's criterion 2 checks the order instead.

### 3.3 The two moves (finding 2)

- **`:408-409`** ("The coercion sits in front of the signal … a **destroyed** property still answers
  `false` / `''`") moves to `## Lifetime`, after `:573-574` ("It is idempotent, and it releases the
  whole mirror"), with a link to `#coercion` for the rule it applies. `## Coercion` ends at
  `:406`.
- **`:452-454`** ("A parse error throws from `bindFieldProperties` itself …, and the binding releases
  everything it had already built before rethrowing") splits. The parse error is both adapters'
  (§ 8 q1), so the item stays in `## When a rule fails` and becomes adapter-neutral: a rule that does
  not parse throws at registration, whatever the policy — from `bindFieldProperties` at `/reactive`,
  and from `form()` at `/signals`, where the schema body runs. Only the release clause, "the binding
  releases everything it had already built before rethrowing", moves, into
  `### It is validated when you bind` after its table (`:233-240`): it is `/reactive`'s binding. The
  lead at `:450`, "Two things are **not** routed through `options.onError`, in either adapter",
  stays as written, true of both items.

### 3.4 Each fact once (finding 3)

The copy kept is the one in `### Expressions are validated too`, `:279-282` and `:288-294`, in
`/reactive`, which already precedes `/signals` and already links it at `:295-296`.

- **`/signals`' `### Prototype-shadowed identifiers are rejected`, `:722-725`**: replaced by one
  sentence linking `#expressions-are-validated-too` for what the
  identifier resolved to before the check and since `eval-core` 0.11.0. "The fix is to rename the
  model key" stays: it is `/signals`' remedy for an expression that *reads* such a name.
- **Its third bound, `:741-750`**: the bound itself stays, with its four example strings and its two
  `/signals`-only histories (`:746-749`, the 0.2.x "over-rejection" wording, and the name bound and
  never read). The reason, `:743-746` ("the expression could never evaluate, because
  `@zvenigora/ng-eval-core` refuses to bind any of these names … on every evaluation"), becomes a link
  to the kept copy. Its remedy, "Rename the binding" (`:749-750`), stays: the kept copy gives the
  same remedy for the same case (`:294-295`), and a reader of `/signals` needs it where the bound is.
- **The kept copy's directional words** stay as written: they stay true (finding 7).

After step 2, `grep -c "a function is truthy"` and `grep -c "refuses to bind"` each give 1.

### 3.5 The contents list (D3)

After the intro's last paragraph (`:10-12`), before `## Install`, under no heading of its own, so that
the README's heading set is exactly today's. A lead line, then four groups in this order, each listing
its headings in document order, `###` nested under their `##`:

- **The package**: Install, Sibling packages, Security, When not to use this library, Entry points,
  Versions; and, at the end of the file, What is not here and Development.
- **Shared by both adapters**: How it fits together, Coercion, When a rule fails.
- **`/reactive`**: items 10–21 of § 3.2.
- **`/signals`**: item 22 and its seven `###`.

Every `##` and `###` is listed: 17 and 14, as at 8e6a617, 31 links. Each is a same-file anchor, so doc-links resolves
every one, and a heading whose text changes after this phase fails the gate at its contents line
even where nothing else links it. That is the list's second use, and the reason it lists the `###`.

### 3.6 `:127-130`, rewritten

Today it maps the old order from inside the Quick start. After step 2 the contents list maps the
document, so the paragraph says only what the Quick start's reader needs: the sections from here to
Constructed, not computed (`#constructed-not-computed`) are `/reactive`'s; the shared ones are above
it, from How it fits together (`#how-it-fits-together`); Signal Forms has its own section below
(`#signal-forms--signals`). It links three anchors where it linked five, so its link count is
reported.

### 3.7 The CHANGELOG lines

Under `## [Unreleased]` in `modules/eval-forms/CHANGELOG.md`, `### Changed`:

- Step 1: "**The README's Development section names both shared sections whose blocks the `/reactive`
  spec executes**, Coercion and When a rule fails; it named Coercion only. It also names every block no
  case executes, where it named the template and manifest blocks only. Documentation only."
- Step 2: "**The README is ordered by entry point**, with a contents list: the package's sections,
  then the ones both adapters share, then `/reactive`, then `/signals`. Every heading keeps its text,
  so every link into it still resolves. Two passages about `/reactive` alone moved out of the shared
  sections, When a rule fails says where each adapter throws a rule that does not parse, and two
  facts stated on both adapters' sides are stated once. Documentation only."

Step 3 moves both under `## [0.7.1] - <date>`, npm's UTC publish date.

---

## 4. Work breakdown

Each step is one commit, leaves the three projects and the workspace root green, and runs in its own
session ([SR2](../standing-rules.md#sr2)). In a criterion, *wrong* names the change the step's executor
makes to show that the criterion can go red ([SR15](../standing-rules.md#sr15),
[SR16](../standing-rules.md#sr16)); the report gives the failure count for each and reads which cases
failed. A one-off check is a command the step runs and reports; it is not added to the gate.

| Step | Subject | Decisions | Ships in | `eval-core` / `eval-signals` / `eval-forms` tests | Reviewer ([SR33](../standing-rules.md#sr33)) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | This plan, its records, and finding 5 | D6 | `eval-forms`' next release, for the README line; the rest no package | 0 / 0 / 0 | Runs: `modules/` |
| 2 | The reorder and the contents list | D2, D3, D4 | `eval-forms`' next release | 0 / 0 / 0 | Runs: `modules/` |
| 3 | Release commit: `eval-forms` 0.7.1 | D5 | the release, docs-only | 0 / 0 / 0 | Runs: `modules/` |
| 4 | Post-publish record, retrospect, F28 retired, phase closed | D5 | no package | 0 / 0 / 0 | Only if a CHANGELOG date changes |

The counts every step holds are the gate's at this plan's commit: `eval-core` 3134, `eval-signals`
444, `eval-forms` 380, measured by step 1's gate on 2026-10-28, and equal to those the step skill
recorded at 0d305a3.

### Step 1 — This plan, its records, and finding 5

- **New**: this document.
- **Edit**:
  - `ROADMAP.md`: a Phase 11 row in the phases table — subject "`eval-forms`' README by entry point",
    shipped in `@zvenigora/ng-eval-forms`, a docs-only patch, this plan, retrospect "§ 10, when
    written" — and the sentence after the table, which says none is in flight.
  - `docs/README.md`: "Active plan" links this plan. Without the link doc-links fails, "not linked
    from the index" (`tools/doc-links.mjs:252-255`).
  - `CLAUDE.md`: the two "No plan is active" sentences name this plan as active. Phase 10's plan did
    the same in its own commit (`phase-10-plan.md`, § 2, In scope).
  - `.claude/skills/step/SKILL.md`: retargeted to this plan — its header lines, its "no plan is
    active" paragraph replaced by this plan's projects per step (`eval-forms` only; step 4 none) and
    the counts step 1 records. Its § 4 scope gate becomes `git status --porcelain`, with the reason:
    `git diff --name-status HEAD` lists no untracked file, and a step's new file is one, as this
    document is in step 1. Found by step 1's code review; fixed here under
    [SR31](../standing-rules.md#sr31), since it is false now and the file is on this step's list.
  - `docs/backlog.md`: F28's index row and its entry's status line to "Open — in flight as Phase
    11"; the "Work in flight" sentence that calls F28 "not scheduled". The status keeps its leading
    Open: "In flight" is not in the register's Status vocabulary, and its Register history counts an
    entry live only if its status starts with Open.
  - `modules/eval-forms/README.md`: `:884-893`, so that the `/reactive` spec is said to cover the
    shared core's Coercion **and** When a rule fails blocks, and the last sentence names every block
    no case executes (finding 5). Widened at the step from `:884-887` by the code review's finding,
    under [SR31](../standing-rules.md#sr31): the not-covered sentence was false in the same way.
  - `modules/eval-forms/CHANGELOG.md`: § 3.7's step 1 line.
- **Exit criteria**:
  1. The gate is green, rows unchanged from the baseline the step records, exactly. Any movement is
     a stop condition: no file this step edits is compiled, and the README edit moves no block,
     heading or import that a spec reading the README counts or matches.
  2. **The plan is indexed.** doc-links is green. *Wrong*: the "Active plan" link removed; doc-links
     fails with `docs/README.md: docs/documentation/phase-11-plan.md — not linked from the index`.
  3. **The Development sentence is true, and its witness can fail** ([SR21](../standing-rules.md#sr21),
     [SR30](../standing-rules.md#sr30)). Claim → witness: "the spec under `reactive/src/lib/` covers
     the shared core's When a rule fails block" → `reactive/src/lib/readme-examples.spec.ts`,
     `README - When a rule fails` › `should answer the applyErrorPolicy lines`. *Wrong* (a wrong
     library, SR30): `applyErrorPolicy` returning the error instead of `undefined` under `'undefined'`;
     that case goes red, and the report names every other case that does. The not-covered sentence
     → the spec's docblock (`:88-96`, `:104-107`), which lists the same blocks; no case witnesses a
     block's absence, and the count case (`:698-714`) pins how many `ts` blocks there are.
  4. **The phase is in flight wherever it is named.** `ROADMAP.md`, `docs/README.md`, `CLAUDE.md`,
     `SKILL.md` and F28's row and entry each name Phase 11 as active; the report quotes each line.
     Red: nothing — read by hand.
  5. `git status --porcelain` lists exactly this step's eight files: seven ` M`, and this document as
     `??`, since `git diff --name-status HEAD` does not list an untracked file. Staged, it is the one
     `A`.
  - Tests 0 / 0 / 0. doc-links: +1 file; links reported.
- **Category**: ships in `eval-forms`' next release, the README line and its `[Unreleased]` line; the
  rest in no package.

### Step 2 — The reorder and the contents list

- **Edit**:
  - `modules/eval-forms/README.md`: § 3.2's order, § 3.3's moves, § 3.4's single statements, § 3.5's
    contents list, § 3.6's paragraph. No heading's text or level changes.
  - `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts`: `:700`'s `from` becomes
    `lines.indexOf('## How it fits together')`; the case title at `:698` and the docblocks at `:26-28`
    and `:56-74` say "shared and `/reactive`", from the shared group to `/signals`, and list the
    executed blocks in the new document order (finding 6). `README_REACTIVE_TS_BLOCKS` stays 11.
  - `modules/eval-forms/CHANGELOG.md`: § 3.7's step 2 line.
  - `.claude/skills/step/SKILL.md` marks step 1 and step 2 done; this document, the outcome.
- **Not edited**: `modules/eval-forms/signals/src/lib/readme-examples.spec.ts`. Its comments and its
  matched texts stay true, since `### Expressions are validated too` does not move (finding 6).
- **Exit criteria**:
  1. **The gate is green with rows unchanged**, the `/reactive` count holding 11 and the `/signals`
     counts 6 and 1, the `README_ASYMMETRY_BLOCKS` match (`signals/src/lib/readme-examples.spec.ts:714`)
     still finding its one block. *Wrong* (P2a): `from` left at the Quick start; the count case goes
     red with the 8 `/reactive` fences. *Wrong* (P2b): `from` at `## When a rule fails`; it goes red
     with 9. *Wrong* (P2c), on a scratch edit of the README: `Expressions are validated too` renamed;
     the `/signals` `README_ASYMMETRY_BLOCKS` case goes red with 0, and doc-links fails at each link
     to its anchor, the contents line among them. *Recorded, not probed*: `from` at `## Coercion`
     counts the same 11 as the correct `from`, because `## How it fits together` holds no `ts` fence
     (§ 3.2); the count cannot distinguish the two, and criterion 2's order check covers it.
  2. **The heading sequence is § 3.2's, and the heading set is today's.** One-off check: M1's reader
     over the README lists the headings in order, and the sorted list of their texts equals 8e6a617's,
     32 with the title. Red: the check, and doc-links for any heading the contents list links.
     *Wrong*: one heading's text changed; the check lists it.
  3. **Every anchor resolves.** doc-links green, including finding 8's three external anchors and the
     contents list's 31. Red: doc-links.
  4. **The moves landed once.** One-off check: "a **destroyed**" occurs once, under `## Lifetime`;
     "releases everything it had already built" once, under `### It is validated when you bind`.
     *Wrong*: a copy left in place; the count gives 2.
  5. **Each fact once.** `grep -c "a function is truthy"` gives 1 and `grep -c "refuses to bind"` gives
     1, each in `### Expressions are validated too`; the `/signals` side links it. *Wrong*: today's
     file gives 2 and 2.
  6. **No directional word is false.** M3's grep rerun; each hit is listed with its decision, as
     finding 7 lists them ([SR25](../standing-rules.md#sr25)'s form). Red: nothing — read by hand.
  7. **No shared block names what the Quick start introduces.** Each of the three `ts` blocks now
     ahead of the Quick start — `toVisible`'s and `toText`'s under `## Coercion`, `applyErrorPolicy`'s
     under `## When a rule fails` — is read for its free names, the identifiers it uses and neither
     declares nor imports, beside the names the Quick start introduces (`OrderFormService`, `form`,
     `binding`, `injector`, `bindFieldProperties` and its Angular imports). The claim → witness table
     gives each block's free names; expected `toVisible`, `toText` and none, the first two named in
     one row of `## How it fits together` (`:196`), which precedes them. Red: nothing — read by hand. *Wrong*: the same
     reading of `### Expressions are validated too`'s block (`:269`) lists `FormGroup`, `FormControl`,
     `bindFieldProperties` and `injector`, which is why that section stays where it is (D2).
  8. **Claim → witness table** ([SR21](../standing-rules.md#sr21)) for every sentence the step writes
     or rewrites in the README: § 3.6's paragraph; `## When a rule fails`' parse-error item, witnessed
     at `/reactive` by `reactive/src/lib/readme-examples.spec.ts` `should throw from the bind itself
     for an expression that does not parse` and at `/signals` by `signals/src/lib/rules.spec.ts`
     `should throw a SyntaxError at registration with neither` (§ 8 q1); the moved release clause, by
     `reactive/src/lib/field-schema.spec.ts`' case at `:945-955` and
     `field-schema.teardown-throw.spec.ts`; and § 3.4's link sentences. A sentence that only points at
     another section names that section's witness. A sentence with no witness is rewritten or removed
     ([SR31](../standing-rules.md#sr31)).
  9. `git status --porcelain` lists exactly this step's files.
  - Tests 0 / 0 / 0. doc-links: 0 files; links +31 for the contents list, with § 3.3's `#coercion`
    link in Lifetime and § 3.4's and § 3.6's changes counted and reported.
- **Category**: ships in `eval-forms`' next release, with § 3.7's line.

### Step 3 — Release commit: `eval-forms` 0.7.1

- **Edit**: `modules/eval-forms/package.json`, `version` only; `modules/eval-forms/CHANGELOG.md`,
  `[Unreleased]` moved under `## [0.7.1] - <date>` with an empty `[Unreleased]` above it;
  `docs/backlog.md`, "Work in flight", where Phase 11 gets a paragraph of its own — released as
  `eval-forms` 0.7.1, awaiting publish — in place of the clause after F27's; `SKILL.md` marks the
  step done; this document, the outcome.
- **No peer range moves.** Nothing in 0.7.1 needs a newer `eval-core` or `eval-signals`, so the
  README's Install sentence and the peer-range case are unchanged.
- **Exit criteria**:
  1. The gate is green, rows unchanged, exactly.
  2. **The three built `.d.ts` are byte-identical to 0.7.0's**, by SHA-256 against
     `npm pack @zvenigora/ng-eval-forms@0.7.0`. The built `package.json` differs from the published
     manifest in `version` only. *Wrong* (P3a): the same comparison against 0.4.1's tarball, before
     0.5.0 added `colonIdentifiers` to `ExpressionRuleOptions`, reports a mismatch.
  3. **The built README is the repository's, and not 0.7.0's.** `cmp` of
     `dist/modules/eval-forms/README.md` against `modules/eval-forms/README.md` is silent. *Wrong*
     (P3b): `cmp` against 0.7.0's packed README reports a difference.
  4. Then CONTRIBUTING's Releasing steps 3–5, by the maintainer: publish `dist/modules/eval-forms`
     alone, confirm it with `npm view`, and tag `eval-forms@0.7.1` at this commit, annotated
     (`git tag -a`).
  - Tests 0 / 0 / 0. doc-links: files unchanged; links reported.
- **Category**: the release, one docs-only patch. No `.d.ts` change, no peer range moved.

### Step 4 — Post-publish record, retrospect, F28 retired, phase closed

- **After the maintainer publishes and tags** (CONTRIBUTING's Releasing step 6):
  - `docs/backlog.md`: a Publication status row; the tag sentence, recounted from `git tag -l`; a
    Register history row counted as that section describes; "Work in flight"; F28's index row pointed
    at `backlog-retired.md`.
  - `docs/backlog-retired.md`: F28, retired, with its reason and its release.
  - `CLAUDE.md`: `eval-forms` published at 0.7.1; Phase 11 complete, with this plan in the list of
    completed plans and what it is the reference for; no plan active.
  - `ROADMAP.md`: Phase 11's row complete, its retrospect this plan's § 10.
  - `docs/README.md`: this plan moves from "Active plan" to the completed phases; "Active plan" says
    none.
  - `.claude/skills/step/SKILL.md`: names no plan, as before step 1, with the counts at this commit.
  - `modules/eval-forms/CHANGELOG.md`: the heading's date, only if npm's differs.
  - `docs/standing-rules.md`: only if § 10 promotes a rule; § 0 adds none.
  - This document: the outcome, and § 10, the retrospect.
- **Exit criteria**:
  1. The gate is green, rows unchanged. `tools/release-tags.mjs` is green and the new row names step
     3's commit. *Wrong* (P4a): the row naming another commit; release-tags fails on that row.
  2. **The tag is annotated.** `git cat-file -t eval-forms@0.7.1` gives `tag`. *Wrong* (P4b): a
     lightweight scratch tag gives `commit`, and is deleted.
  3. **The npm page is the repository's README.** `npm pack @zvenigora/ng-eval-forms@0.7.1`; its
     README is byte-identical to the repository's. *Wrong* (P4c): 0.7.0's differs.
  4. **F28 is retired and nothing dangles.** doc-links green: every link to `#f28` re-pointed, the
     index row in `backlog.md` kept. Red: doc-links.
  5. **The phase is closed wherever step 1 opened it.** The report quotes the line in each of
     `CLAUDE.md`, `ROADMAP.md`, `docs/README.md`, "Work in flight" and `SKILL.md`.
  - Tests 0 / 0 / 0. doc-links: files unchanged; links reported.
- **Category**: the release's post-publish commit. Ships in no package, unless the CHANGELOG date
  changes, which is then recorded as a correction to the published entry.

---

## 5. Public API surface

None. No exported symbol, no `.d.ts`, and in steps 1, 2 and 4 no `package.json` changes. Step 3 changes
`eval-forms`' `version` and nothing else, and its criterion 2 holds the three `.d.ts` byte-identical to
0.7.0's.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` ([SR8](../standing-rules.md#sr8)) | Green, every step |
| Tests | (in the above) | 0 / 0 / 0 in every step, from step 1's baseline ([SR10](../standing-rules.md#sr10)) |
| The README's blocks | `reactive/…/readme-examples.spec.ts` count case; `signals/…/readme-examples.spec.ts` count cases | 11; 6 and 1, in every step |
| Docs | the root `test` target (`tools/doc-links.mjs`, `tools/release-tags.mjs`) | Green; counts reported |
| The release (step 3) | SHA-256 of each built `.d.ts` against 0.7.0's tarball | Byte-identical, all three |
| Scope | `git status --porcelain` | Exactly the step's file list, untracked files included ([SR3](../standing-rules.md#sr3)) |
| No library change | the diff's `.ts` files | Spec files only: two strings and comment lines, in step 2 |

---

## 7. Risks

| Risk | What goes red |
| :--- | :--- |
| A heading's text changes in the move, and an anchor dangles | doc-links, at the contents list's line for every heading and at each link of finding 8; the cases for the four headings specs read by text |
| The `/reactive` count's `from` left where it was, or moved to the wrong heading | the count case, with 8 or 9 (P2a, P2b); a `from` at `## Coercion` only step 2's criterion 2 (§ 3.2) |
| A shared block now precedes the names it uses | nothing in the gate; step 2's criterion 7, read by hand |
| A sentence that was true in the old order is false in the new one | nothing in the gate; criterion 6's sweep |
| A `/reactive`-only passage left in a shared section, or a fact left stated twice | criteria 4 and 5's greps, one-off |
| The `When a rule fails` lead claims more for `/signals` than is witnessed | `signals/src/lib/rules.spec.ts` `should throw a SyntaxError at registration with neither`, if `/signals` stops throwing the parse error at registration (§ 8 q1) |
| The npm page lags the repository between steps 2 and 4 | nothing; it is the release's purpose, and step 4's criterion 3 checks it ends |

---

## 8. Open questions

None open.

1. **Does `/signals` throw a parse error past `onError`?** *Closed before step 1: it does.* `:450`
   says two things are not routed through `onError` "in either adapter", and the first is a parse
   error, documented only as `bindFieldProperties`' (`:452-454`).
   - **The code**: `modules/eval-forms/signals/src/lib/rules.ts:221-231` parses, guards and compiles
     in `prepare`, when a registrar is called, outside the closure that `applyErrorPolicy` wraps
     (`:233-234`). A registrar runs in the schema body, which `form()` runs.
   - **The witness**: `signals/src/lib/rules.spec.ts:710-718`, `should throw a SyntaxError at
     registration with neither`, registers `'x + Q1:1 > 0'` through `createExpressionRules(model)`,
     with no options, so under the default `'undefined'` policy (`src/lib/error-policy.ts:30`), and
     expects building the form to throw `SyntaxError`, `Unexpected token (1:6)`.
   - **The probe** ([SR32](../standing-rules.md#sr32), reverted by hand): the parse, guard and compile
     moved inside the returned closure. Run on 2026-10-28 over `rules.spec.ts`: 2 of 31 red, that case
     ("Received function did not throw") and `should let a registration turn a factory's
     colonIdentifiers off for that rule`, which asserts the same registration-time throw; 29 green.

   Consequence (§ 3.3): the lead stays as written, and the parse-error item becomes adapter-neutral.
   Steps 1–4 hold 0 / 0 / 0.

---

## 9. Contract after this lands

1. **Each package has one README, and it is the package's whole documentation.** No guide file exists,
   and none ships.
2. **`eval-forms`' README is ordered by entry point**, under a contents list that links every `##` and
   `###`: package, shared, `/reactive`, `/signals`, then What is not here and Development.
3. **Its headings are those of 0.7.0, word for word and level for level**, so every anchor any
   document or published README links into it resolves.
4. **Within that README each fact is stated once**; across the three READMEs, repetition is kept so
   that each stands alone (D4).
5. **The `/reactive` count case reads from the first shared heading to `/signals`**, and its 11 fences
   are the shared group's and `/reactive`'s.
6. **Not provided**: contents lists in `eval-core`'s and `eval-signals`' READMEs; any split; any move
   under `docs/`.

---

## 10. Retrospect

Written in step 4.
