# Phase 9 — retrospect

Seven steps, 2026-10-10 to 2026-10-13, against [`phase-9-plan.md`](phase-9-plan.md). The phase's
one retrospect, and step 7's record (§ 5); the plan holds each step's outcome in its § 4.

## 1. What shipped

| Step | Commit | What |
| ---- | ------ | ---- |
| — | `adfc7af` | [A29](../backlog-retired.md#a29), fixed on its own before any step: `CompilerService` caches strings only, so step 3 had one key to rewrite (Revision 2) |
| 1 | `56e2049` | [A26](../backlog-retired.md#a26): `ParserService` keys its AST cache on a fingerprint of the parse-relevant options; [A34](../backlog.md#a34) opened for the memo's limit |
| 2 | `0718796` | `ParserOptions.colonIdentifiers` and the grammar, an acorn plugin with five overrides, chosen per parse |
| 3 | `cf8fb1c` | `provideColonIdentifiers()`, read by `ParserService` at construction, and `CompilerService`'s string key on the same fingerprint |
| 4 | `3ac8d1a` | the corpus: `colon-identifiers.corpus.json` and its runner, 114 synthetic cases, test only |
| 5 | `001232a` | `eval-signals`: the `abortSignalKey` refusal says "plain identifier"; colon keys pinned through both factories |
| 6 | `1e3ee21` | `eval-forms`: `/signals`' `colonIdentifiers` rule option, `/reactive`'s check parsed as its compile parses, a top-level label refused at both entry points |
| — | — | § 8 q3, re-run 2026-10-13 at `1e3ee21` outside this workspace: green at `acorn` 8.11.2, with 8.18.0 as the control |
| 7 | this commit | READMEs, CHANGELOGs, `eval-core` 0.12.0, `eval-signals` 0.5.1, `eval-forms` 0.5.0 |

**`eval-core` 0.12.0 is a minor and additive.** `ParserOptions.colonIdentifiers` and
`provideColonIdentifiers()` are new, and A26's fix changes behaviour no caller could rely on: a
cached AST went to whichever caller asked first. With the option off, which is the default
everywhere, a parse is acorn's own. The built `.d.ts` differs from 0.11.1 by the two additions, their
`EnvironmentProviders` import, documentation comments, and a private member each on `ParserService`
and `CompilerService`. **`eval-signals` 0.5.1 is a patch**: one message and its JSDoc, and an
`eval-core` range widened to `<0.13.0`. **`eval-forms` 0.5.0 is a breaking minor**: a rule that
parses as a top-level label, which rendered blank, now fails to bind or register; its `eval-core`
floor rises to 0.12.0, and its `eval-signals` floor to 0.5.1, since every earlier `eval-signals`
requires `eval-core` below 0.12.0.

## 2. What the plan got wrong, and what caught it

Every revision after the first was found inside a step, or just before one, and landed in that
step's commit. None widened the design; most tightened what pins it.

| Revision | Found by | What was wrong |
| -------- | -------- | -------------- |
| 2 | A29's fix | `CompilerService` cached an AST under a key every node shared, so step 3's "string key beside the AST branch" had no AST branch left to sit beside |
| 3 | step 1 | retiring A26 dangled the links to it in three documents, which the doc-links gate fails on; § 3.2's key and cost were corrected to the code and its measurement |
| 4 | step 2's gate and review | "the hint only in the two cases" needed the hint scoped to a level's statement, and a semicolon acorn inserts at a line break is a statement boundary no token marks — a fifth override, `parseStatement`; the gate added rows and W7, W8 |
| 5 | step 3 | a bare `inject()` in `ParserService`'s published no-argument constructor throws `NG0203` outside a context; criterion 1's "today's error" existed for one row of four; the null-fingerprint row was unreachable as the gate wrote it |
| 6 | step 4's gate | legacy expressions arrive rewritten to JavaScript, so the corpus's `outOfScope` kind had nothing to catch (§ 8 q6 settled) |
| 7 | step 5 | the message is published behaviour, so its CHANGELOG line lands with it, not at the release |
| 8 | step 6's gate and review | the label refusal's wording, the order in which `/reactive` resolves `ParserService`, and D13 narrowed rather than left |
| 9 | step 7's gate and review | § 8 q3's re-run and its `--no-cache` method note; the three `readme-examples.spec.ts` files step 7's new blocks need; two stale `CLAUDE.md` sentences and `eval-signals`' quoted peer range; § 3.10's `eval-forms` range on `eval-signals`, `>=0.4.0`, which admitted versions that cannot be installed beside `eval-core` 0.12, narrowed to `>=0.5.1`; § 8 q5 recorded as decided, not open |

**Step 2's inserted-semicolon case is the one to remember.** Criterion 3 said the hint appears
only in the two cases § 3.4 names, and every row the table held agreed. It took the review asking
what ends a conditional with no token — `x = a?b:c` then a line break — to find a hint offered
for a colon that was not the name's. The rows that pin it were added beside the table rather than
amending it, and the one case the fix cannot reach, the leftover colon on its own line, is pinned
as a known limit instead of being argued away.

**§ 8 q3 found nothing at runtime, and one thing in the types.** It was a precondition because
the plugin overrides acorn internals, not its documented API. All three packages' suites were
green at 8.11.2. The one failure was a spec helper's type against 8.11.2's narrower `AnyNode`, and
it showed only under `--no-cache`: Jest's transform cache had served the spec type-checked against
the installed acorn. Step 7 widened the helper's parameter type, so a future run needs no
`// @ts-nocheck`.

## 3. What the phase deliberately did not do

- **Structure in a colon name** — no ranges, no segment access. `Q1:1:3` is an opaque key (§ 2).
- **A source rewrite** — every position acorn reports is the author's (§ 3.5).
- **A per-signal parser option in `eval-signals`** — § 8 q5, decided: not provided in Phase 9,
  and reopened only by a consumer that mixes colon and non-colon parsing in one application.
- **Every unsupported top-level statement refused** — only a label; the rest is
  [D13](../backlog.md#d13), open, because `eval-core` does not publish its list of supported
  statements.
- **[A30](../backlog-retired.md#a30)** — `ParserService.parserOptions` reaching the services for no acorn
  option — recorded by the plan's probes, not needed by it, open.

**Open questions that wait on data.** § 8 q1 (colon names in consequents), q2 (compact object
literals) and q4 (keyword or non-ASCII prefixes) stay open: the corpus holds only synthetic cases,
and its counts say nothing about legacy expressions. Each is settled by real expressions arriving
as corpus data, in their rewritten JavaScript form; q1 counts by the expression's shape, not by the
error text (§ 8 q1).

Opened along the way and still live: [A34](../backlog.md#a34) (step 1), with its second memo (step
3). Narrowed: [D13](../backlog.md#d13) (step 6). Closed: [A26](../backlog-retired.md#a26) (step 1)
and, before step 1, [A29](../backlog-retired.md#a29).

## 4. What is left after this commit

The release itself: publishing `eval-core` 0.12.0, `eval-signals` 0.5.1 and `eval-forms` 0.5.0,
confirming them on the registry, tagging, and the post-publish commit with their Publication status
rows and the Register history row — [`CONTRIBUTING.md`](../../CONTRIBUTING.md), Releasing, steps
3–6. That commit also:

- corrects the three CHANGELOG headings, dated 2026-10-13, to npm's publish date in UTC if it
  differs;
- updates `CLAUDE.md`'s "Published at" lines;
- brings the backlog's release status up to date: A26's index row says "ships in" and its retired
  entry "not yet released"; and the rows and retired entries of [A28](../backlog-retired.md#a28),
  [A29](../backlog-retired.md#a29) and [A31](../backlog-retired.md#a31) still say "not yet
  released", though `eval-core` 0.11.1 released them at `7ee65fc`. Step 7 left them to it, since
  that commit writes release status anyway;
- turns [D13](../backlog.md#d13)'s "ships in `eval-forms` 0.5.0" into "released … tagged".

Step 4's record asked for the `Jest did not exit one second after the test run has completed`
message to be rechecked once the corpus was in. Step 7's gate runs, each with the corpus, did not
print it.

## 5. Step 7's record

| File | Change |
| ---- | ------ |
| `modules/eval-core/README.md` | "Colon-joined names" completed: the rule, what does not join, the consequent and the object key, one executed block, and paths as dotted segments |
| `modules/eval-core/src/lib/readme-examples.spec.ts` | the new block asserted in the section's case, since it continues the first block's `service`; the count 17 → 18 — added at the gate |
| `modules/eval-core/src/lib/internal/functions/colon-identifiers.spec.ts` | `sx` takes `AnyNode \| VariableDeclarator`, so the spec type-checks at `acorn` 8.11.2 (§ 8 q3) |
| `modules/eval-signals/README.md` | the `abortSignalKey` bullet says "plain identifier" and names the colon case; a colon-joined name is one segment of a path; the quoted peer range — added at the gate |
| `modules/eval-forms/README.md` | the quoted peer range and the floor's reason; one executed block each in `/reactive`'s and `/signals`' colon sections |
| `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts`, `signals/src/lib/readme-examples.spec.ts` | a case each for the two blocks; the counts 10 → 11 and 5 → 6 — added at the gate |
| `modules/eval-forms/reactive/src/lib/field-schema.ts` | `bindFieldProperties`' `@param schema` names the `guardIdentifiers` checks |
| `modules/*/package.json`, `CHANGELOG.md` | 0.12.0, 0.5.1, 0.5.0; peer ranges per § 3.10 |
| `ROADMAP.md` | Phase 9 done; "Suggested order" |
| `CLAUDE.md` | the plan named as a design record; the two sentences that called it planned and active — added at the gate |
| `docs/backlog.md` | A26's and D13's "ships in"; "Work in flight" |
| `docs/colon-identifiers/phase-9-plan.md` | Revision 9: q3's re-run and its fix, the gate's corrections, each step's outcome |
| `docs/colon-identifiers/phase-9-summary.md` | this file |

**Probes**, each reverted:

| Probe | Result |
| ----- | ------ |
| The three versions bumped, both downstream ranges left at `<0.12.0` | `eval-signals:lint` and `eval-forms:lint` red, 1 error each: `@nx/dependency-checks` on the `@zvenigora/ng-eval-core` specifier (finding 14). Green once widened |
| `colon-identifiers.spec.ts` type-checked against `acorn` 8.11.2's `acorn.d.ts`, outside the workspace, before and after `sx`'s change | 4 errors before, all at the helper's `VariableDeclarator` lines; 0 after; 0 against the installed 8.18.0 both times |
