# A33 and A34 — the lookup cache's miss and the parse memo's options, decided by measurement (`@zvenigora/ng-eval-core`)

**Date**: October 31, 2026
**Revision**: 1 — the plan, its measurements and decisions; step 1.

Two `eval-core` entries recorded in 0.12.0 with the same instruction, "measure it if this is
fixed": [A33](../backlog.md#a33), the case-insensitive property cache keeping a miss across a
same-count key swap, and [A34](../backlog.md#a34), the parse fingerprint's memo not seeing options
written in place. Each had one candidate fix whose cost was on a hot path. This plan records the
prototypes, the decision rules written before any timed run ([SR28](../standing-rules.md#sr28)),
the runs, and what they decided: **A33 is fixed; A34 is decided a documented limit.** Both ship in
`eval-core` 0.15.1, a patch. `eval-signals` and `eval-forms` do not release: their peer range,
`>=0.15.0 <0.16.0`, takes the patch ([SR42](../standing-rules.md#sr42) does not apply).

## 0. Failure modes carried forward

- **A fix that is free on the path it touches and not on the path next to it.** A33's candidates
  differ only on a cached miss, so a hit path, unchanged in code, is timed as the control (§ 1.3).
- **A void run read as a verdict.** A34's first run was void on its deciding path and was rerun
  once, as the rules require, though its candidate already failed there (§ 1.4).
- **A documented limit nobody reads.** A34's limit was written only in an internal doc comment.
  "Documented" here means the JSDoc a consumer's editor shows and the README, each with a witness
  ([SR21](../standing-rules.md#sr21)).

## 1. Current state

### 1.1 What exists today

- `getCachedCaseInsensitiveProperty` (`modules/eval-core/src/lib/internal/visitors/property-lookup-cache.ts`)
  keeps, per object, its answers by lower-cased key and its own-key count. A cached miss stands
  while the count is unchanged. Every `caseInsensitive` member read and member write calls it
  (`member-expression.ts`, the read path and `resolveMemberWriteKey`). On a cached miss it already
  calls `Object.getOwnPropertyNames(obj)` to compare the count.
- `parseFingerprint` (`modules/eval-core/src/lib/actual/services/parse-fingerprint.ts`) remembers a
  digest per pair of option objects by identity, in `ParserService`'s memo and in
  `CompilerService`'s. Its doc comment states the limit; the getter's JSDoc, `parse`'s `@param
  options`, `defaultParserOptions` and the README do not.
- No spec pins either symptom. `parser.service.spec.ts`'s "criterion 6" (two `simpleEval` calls
  build the fingerprint once) is the memo's one behavioural row.

### 1.2 The prototypes

Pinned under `D:\repo.2026\ng-eval-base\a33-prototype\` with SHA-256 ([SR32](../standing-rules.md#sr32)),
`SHA256SUMS.txt` beside them. Each is the whole source file at 509b007 with one change.

| Candidate | File | SHA-256 | The change |
| :--- | :--- | :--- | :--- |
| **B1** | `property-lookup-cache.B1.ts` | `6B586068…5DBDDD8` | The entry keeps the own-key names it was made from, not their count; a cached miss stands only while `sameNames(entry.keys, ownKeys)` — same length, each name `===` |
| B2 | `property-lookup-cache.B2.ts` | `782AE5D2…148084A5` | Misses are not cached; every miss scans |
| V | `parse-fingerprint.V.ts` | `0EDC5C4E…2555258A` | A memo entry keeps a snapshot of both objects' keys and values (`for…in`), checked on every lookup; a difference rebuilds the digest |

B1 is the fix A33's entry names. Its comparison runs on a path that already lists the names, so it
adds `n` identity comparisons to an `O(n)` path; the stored array is the one the miss path already
built. Names equal in order mean the same names, so any miss stays a miss: the comparison is sound,
not a heuristic. V is the "comparison on each lookup" A34's entry names; freezing, its other
option, refuses writes consumers can make today and does not reach a caller's own options object,
so it was not prototyped.

### 1.3 Measurements run for this plan

All on the Claude-side sandbox, Linux, Node 26.4.0, production bundles (fesm2022) built from 509b007
and the three candidates, one process at a time, bundles under the git-ignored `dist/a33a34-bench/`.

- **Probe rows** (`probe.mjs`, `B47F2781…610369EF`), each entry's measured symptom, through
  `EvalService` and `ParserService`, on each bundle:

  | Row | A (509b007) | B1 | B2 | V |
  | :--- | :--- | :--- | :--- | :--- |
  | A33: `x = { a: 1, b: 2 }`, `x.C` | `undefined` | `undefined` | `undefined` | — |
  | A33: after `delete x.a; x.c = 3`, `x.C` | **`undefined`** | `3` | `3` | — |
  | A33: the same, `x.c` | `3` | `3` | `3` | — |
  | A33: `y.CONSTRUCTOR`, before and after an own `constructor` swapped in | refused, refused | refused, refused | refused, refused | — |
  | A34 (a): getter's object, `extractExpressions = false` in place, `parse('k + 1')` again | **`BinaryExpression`** | — | — | `Program` |
  | A34 (a): then `parse('k + 2', { extractExpressions: true })` | **`Program`** | — | — | `BinaryExpression` |
  | A34 (c): `o` written to 2022 + `allowAwaitOutsideFunction`, then `parse('await p', { ecmaVersion: 2020 })` | **`AwaitExpression`** | — | — | `SyntaxError` |
  | A34 (b): `defaultParserOptions` written and written back, `simpleEval('await p')` | **a promise** | — | — | `SyntaxError` |

  Every A row reproduces its entry; every candidate flips it. `probe-V.json` was made before the
  probe's line that writes `undefined` out, so its A33 rows are absent; its A34 rows are the same.

- **Timings** (`bench.mjs`, `DF839B13…71FD75F7`; `run.sh`; `analyse.py`), A45 § 3.8's loop: warm-up
  20,000; 15 rounds of N, N sized so a round is about 0.2 s; the process's figure is its median
  round; 12 rotations, odd A, A′, B…, even reversed; per rotation `(X − A) / A`.
  - A33 paths, `caseInsensitive`, context `{ x: 50 own keys k0…k49, a: 100 numbers }`: **hit50**
    `x.K25` (a cached hit; code unchanged in every candidate), **miss50** `x.zz`, **arrmiss**
    `a.map` (a miss on 101 own names, then the prototype).
  - A34 paths: **simpleEval** `EvalService.simpleEval('a + 1', { a: 1 })` (deciding), **parse**
    `ParserService.parse('a + 1')` (reported).

### 1.4 The measurements

**The rules**, `decision-rules.md` (`AA71002A…D89D442B4`), written 2026-11-01 02:38 UTC, before any
timed run: void if the A/A regresses or exceeds ±3% on a path, rerun once; "regresses" is a median
over +3% with at least 10 of 12 positive. A33: neither B may regress on hit50; B1 ships if its
miss50 and arrmiss medians are each ≤ +10%; B2 instead if each of its medians is ≤ +10% and within
2 points of B1's; neither, no code fix. A34: V ships if its simpleEval median is ≤ +5%; otherwise
no code fix, a documented limit.

**Run 1** (`results-run1.jsonl`, `572ADAA3…2C2E4637`), 216 processes. Medians of 12 deltas, positives:

| Path | A's µs | A′ | B1 | B2 |
| :--- | ---: | :--- | :--- | :--- |
| hit50 | 7.37 | −1.6%, 3/12 | −1.0%, 4/12 | −1.4%, 5/12 |
| miss50 | 60.4 | +1.3%, 8/12 | **+1.6%, 8/12** | +345.9%, 12/12 |
| arrmiss | 11.7 | +0.4%, 7/12 | **+1.4%, 8/12** | +3668.2%, 12/12 |
| simpleEval | 5.65 | **+4.8%, 8/12 — void** | — | — |
| parse | 3.21 | +1.3%, 8/12 | — | — |

A33 is valid on all three paths and decided: **B1 ships**. B2 shows what the miss cache is for: a
`caseInsensitive` miss without it scans every own name with `equalIgnoreCase`, 4.5× and 38× the
cost. A34's run was void on simpleEval, its A/A outside ±3%.

**A34's rerun** (`run2.sh`, `results-a34-rerun.jsonl`, `B96ECD89…1C1B2601`), 72 processes:

| Path | A's µs | A′ | V |
| :--- | ---: | :--- | :--- |
| simpleEval | 5.62 | +0.9%, 8/12 | **+7.0%, 12/12** |
| parse | 3.19 | −0.9%, 6/12 | +3.4%, 10/12 |

Valid, and decided: V's +7.0%, about 0.4 µs on every `simpleEval`, is over +5%. **No code fix;
A34 is a documented limit.** It is no worse than before A26's fix, as the entry records, and
nothing in the repository writes into either object.

## 2. Decisions — recorded, not reopened

- **D1. A33 is fixed by B1**, as pinned, by § 1.4's rule.
- **D2. A34 is a documented limit**, by § 1.4's rule. Not freezing: a breaking refusal that does
  not cover a caller's options object.
- **D3. Documented where a consumer reads**: the `parserOptions` getter's JSDoc, `parse`'s
  `@param options`, `defaultParserOptions`' JSDoc, and one README sentence beside the setter's, each
  claim with a witness row (SR21). The internal comments keep their text and point at the retired
  entry.
- **D4. One release, `eval-core` 0.15.1**, a patch: a fix and documentation, no API change. The
  `.d.ts` changes by the three JSDoc blocks only; the step diffs it against 0.15.0's tarball.

## 3. Design

### 3.1 A33 (step 2)

`property-lookup-cache.ts` becomes `property-lookup-cache.B1.ts`, with its doc comments rewritten:
the entry's comment ("its own-key count") names the own-key names, and the function's drops "Not
caught: …" for the rule as it now is — a miss stands while the object's own names are the ones it
was made from, in order. No other file changes in `src/`.

### 3.2 A34 (step 3)

No code. Three JSDoc blocks and one README sentence, each saying the same thing in its place: the
parse cache remembers an options object by identity, so a value written into it — the object the
getter returns, an object passed to `parse` again, or `defaultParserOptions` — is not seen, and a
text parsed before keeps its earlier reading; replace the object instead. `parseFingerprint`'s and
`CompilerService`'s comments re-point from `docs/backlog.md` to `docs/backlog-retired.md` A34.

## 4. Work breakdown

One step per session behind the `/step` gate. Gate counts at the plan commit: `eval-core` 3288,
`eval-signals` 449, `eval-forms` 386.

### Step 1 — This plan and its records

- **Edit**: this document, new; `docs/README.md`, a link to it (doc-links fails on a file under
  `docs/` it does not link); `docs/backlog.md` — A33's and A34's Status and index rows gain
  "Scheduled — the `[A33 plan](a33/plan.md)`, step 2" and "…, step 3", and "Work in flight" names
  this plan as active; `CLAUDE.md`, its two "No plan is active" sentences; and
  `.claude/skills/step/SKILL.md`, retargeted to this plan.
- **Criterion**: doc-links 0 dangling; the prototype hashes in § 1.2 and § 1.3 match
  `SHA256SUMS.txt` in the pinned folder; the step skill's § 1 names this plan.

### Step 2 — A33: the miss is re-validated by name

- **Characterisation first** ([SR15](../standing-rules.md#sr15)): in
  `property-lookup-cache.spec.ts`, "should find a property added in the same interval as another is
  deleted, after a cached miss" — the unit row; in `eval.service.case-variant-guard.spec.ts` the
  caller's row, through `simpleEval` with `caseInsensitive` ([SR40](../standing-rules.md#sr40)):
  `x.C` after the swap reads `3`; and the `y.CONSTRUCTOR` row, refused before and after an own
  `constructor` is swapped in. Each asserts a value or the refusal's message, never a bare throw
  ([SR18](../standing-rules.md#sr18)).
- **Predicted, then probed** ([SR16](../standing-rules.md#sr16)): on today's code the two swap rows
  are red and the `CONSTRUCTOR` row green; with B1, all three green. Probe P2-1: B1 with
  `sameNames` reduced to the length test turns the two swap rows red and leaves the third green.
- **Edit**: `property-lookup-cache.ts` (§ 3.1); the two specs; `CHANGELOG.md` `[Unreleased]`
  `### Fixed`; `CLAUDE.md`'s "Security-relevant code" paragraph, which states A33's limit and that
  a repeated miss "skips comparing" the names; A33 retired to `backlog-retired.md` with the runs
  above as its evidence.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): the dying claim is "a cached miss can outlive
  it" and its kin; grep `own-key count`, `same interval as another is deleted` and `outlive`, and
  decide every hit. Design records keep theirs ([SR6](../standing-rules.md#sr6)).
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)).

### Step 3 — A34: documented where a consumer reads

- **Witness rows** (SR21), in `parser.service.spec.ts`: a value written into the getter's object is
  not seen for a text parsed before; the same change made by setting a new object is seen, for that
  text and a new one. Both green on today's code, since they pin today's behaviour as the documented
  contract (Status "Covered" until retirement).
- **Edit**: the getter's JSDoc, `parse`'s `@param options`, `defaultParserOptions`' JSDoc; the
  README sentence after the setter's ("Setting `ParserService.parserOptions` to a new object…"); the
  two internal comments re-pointed; `CHANGELOG.md` `[Unreleased]` `### Documentation`; A34 retired,
  "decided: documented", with § 1.4 as its evidence.
- **Claim → witness** (SR21), written in the step: each of the four new sentences against the
  row that fails if it is false. The step names the wrong implementation each row catches
  ([SR20](../standing-rules.md#sr20)): a cache keyed by text alone passes the "seen through the
  setter" row for a new text and fails it for a text parsed before.

### Step 4 — Release commit, `eval-core` 0.15.1

CONTRIBUTING's Releasing: `build(release):` with the version, the CHANGELOG heading under npm's
expected UTC date, the register "pending publish", Work in flight; the release commit's file list
checked against 95932e6's, the last core-only release; the `.d.ts` diffed against 0.15.0's tarball
(D4); § 8 q1 decided first.

### Step 5 — Post-publish record

Mikhail publishes `eval-core` 0.15.1; the annotated tag at the release commit; `docs(release):`
with the register history row and the publication status.

### Step 6 — Retrospect

§ 10, and any rule this plan's process earned.

## 5. Public API surface

Unchanged. Three JSDoc blocks change in the `.d.ts`.

## 6. Verification gates

[SR8](../standing-rules.md#sr8) after every step, on the committed tree. Counts rise by step 2's
three rows and step 3's two in `eval-core`; `eval-signals` and `eval-forms` unchanged.

## 7. Risks

- **A key re-ordered without being added or removed.** Integer-like keys sort first in
  `getOwnPropertyNames`, so adding `'2'` and deleting `'1'` changes the order as well as the names;
  B1 treats any difference as a change and re-scans, which costs a scan, never a wrong answer.
- **Timing on one machine.** The decisions rest on the sandbox (Linux, 2 cores); A53's episodes do
  not occur there. A rerun on Mikhail's machine would pin to the performance cores (SR28 as amended).

## 8. Open questions

- **q1. Does 0.15.1's A33 claim need a downstream row ([SR24](../standing-rules.md#sr24))?**
  `caseInsensitive` reaches `eval-signals` and both `eval-forms` adapters. The defect needs an
  object written in place between two reads; a signal re-evaluates only when a tracked signal
  changes, so the step first measures whether any downstream entry point reaches it, and adds a row
  where one does. Decided in step 4, before the release commit.

## 9. Contract after this lands

*Written by step 6.*

## 10. Retrospect

*Written by step 6.*
