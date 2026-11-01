# A33 and A34 — the lookup cache's miss and the parse memo's options, decided by measurement (`@zvenigora/ng-eval-core`)

**Date**: October 31, 2026
**Revision**: 3 — step 3.

Two `eval-core` entries recorded in 0.12.0 with the same instruction, "measure it if this is
fixed": [A33](../backlog-retired.md#a33), the case-insensitive property cache keeping a miss across a
same-count key swap, and [A34](../backlog-retired.md#a34), the parse fingerprint's memo not seeing options
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
  (`member-expression.ts`, the read path and `resolveMemberTarget`; *corrected in step 2*: this
  said `resolveMemberWriteKey`, a name the code does not have). On a cached miss it already
  calls `Object.getOwnPropertyNames(obj)` to compare the count. Step 2 replaced the count with the
  names (§ 3.1).
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

- **Write and guard legs** (*added in step 2*, [SR4](../standing-rules.md#sr4)), on the bundles of
  509b007 (A) and B1, and the guard's on three probe bundles built the same way, pinned beside the
  rest with their nine results:

  | Script | SHA-256 | Rows | A | B1 |
  | :--- | :--- | :--- | :--- | :--- |
  | `write-probe.mjs` | `D2A20ED0…3A0361` | a miss cached by a read, the swap, then `w.C = 9` | `9`; keys `b,c,C`, `w.c` `3` | `9`; keys `b,c`, `w.c` `9` |
  | | | the same, then `u.C += 1` | `NaN`; keys `b,c,C`, `u.c` `3` | `4`; keys `b,c`, `u.c` `4` |
  | | | § 7's reorder: `n.B` over `{ 1: 'one', b: 2 }`, before and after `delete n[1]; n[2] = 'two'` | `2`, `2` | `2`, `2` |
  | `write-guard.mjs` | `1CA310CC…8BFFDA` | `y.CONSTRUCTOR = 1`, `y.__PROTO__ = 1`, `y.Constructor += 1`, each before and after the swap | all six refused | the same |
  | `read-guard.mjs` | `08F40219…9CA291` | `y.CONSTRUCTOR` before and after the swap; then `y.CONSTRUCTOR = 1`; `y.constructor` | refused, refused; refused; `7` | the same |

  `read-guard.mjs` on the probe bundles: with the read path's resolved-key re-check never true
  (`read-guard-P22.json`), `Object` before the swap and `7` after, the write still refused; with
  `resolveMemberTarget`'s never true (`-P23`), all refused, the write by `safeSetProperty`; with
  `safeSetProperty`'s check never true as well (`-P23B`), the write succeeds and `y.constructor` is
  `1`. So on the write path the miss did more than read `undefined`: it made a second own key.

  *Corrected in step 2*, after its code review ([SR23](../standing-rules.md#sr23)): "all six
  refused" and "refused, refused" are true of the names these scripts tried, and those are only
  names a plain object's prototype holds, so the prototype scan refused them with or without a
  stale miss. No arm could show a skipped refusal. `crit.mjs` (`A9528415…16E6AB8`) tries those that
  can: an own `prototype` swapped into a plain object, and an own `constructor` into one made by
  `Object.create(null)` and into one made by `Object.create({})`, each read and written through its
  variant after a cached miss, with `__defineGetter__` on a plain object as the control the
  prototype holds. With no miss cached, every one is refused on A. After a miss and the swap, on A
  the three read `undefined` and the write made a sibling key (`b,prototype,PROTOTYPE`), the blocked
  value neither returned nor written; on B1 all are refused, keys `b,prototype`. The control is
  refused on both (`crit-A.json`, `crit-B1.json`). On the probe bundles: P2-1's equals A's; P2-2's
  reads `7` where B1 refuses, the write still refused; P2-3's equals B1's; P2-3b's writes `1`.

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

**Memory** (*added in step 2*, from its code review), made after the decision and outside its rule:
the rule had no memory arm, so no run under it could have shown this cost
([SR23](../standing-rules.md#sr23)). `mem.mjs` (`34E33B26…8178A`) evaluates one `caseInsensitive`
miss per value through the exported `evaluate`, and reads the heap still held after two `gc()`
calls; `mem-results.jsonl` (`9DE76513…3FE5EA`) holds its lines in pairs, A then B1:

| Values | Expression | A, MB | B1, MB | A, bytes per name | B1, bytes per name |
| :--- | :--- | ---: | ---: | ---: | ---: |
| one array of 1,000,000 numbers | `v.map` | 2.25 | 32.76 | 2.4 | 34.4 |
| 1,000 arrays of 1,000 numbers | `v.map` | 2.79 | 10.49 | 2.9 | 11.0 |
| 10,000 objects of 50 keys | `v.zz` | 2.71 | 6.98 | 5.7 | 14.6 |

B1 holds about 8 to 9 bytes more per own name, an array of 1,000 elements' index names included, and
about 32 per index name of an array of a million. No arm lies between the two, and why the large
array's names cost more was not measured. The cost is recorded, not designed out (D1, § 7).

## 2. Decisions — recorded, not reopened

- **D1. A33 is fixed by B1**, as pinned, by § 1.4's rule, its memory cost recorded (§ 7;
  *corrected in step 2*).
- **D2. A34 is a documented limit**, by § 1.4's rule. Not freezing: a breaking refusal that does
  not cover a caller's options object.
- **D3. Documented where a consumer reads**: the `parserOptions` getter's JSDoc, `parse`'s
  `@param options`, `defaultParserOptions`' JSDoc, and one README sentence beside the setter's, each
  claim with a witness row (SR21). The internal comments keep their text and point at the retired
  entry.
- **D4. One release, `eval-core` 0.15.1**, a patch: a fix and documentation, no API change. The
  `.d.ts` changes by JSDoc blocks only, three changed and one added (*corrected in step 3*: "the
  three JSDoc blocks"; the private `generateCacheKey`'s comment is emitted too, and its re-point
  changes it); the step diffs it against 0.15.0's tarball.

## 3. Design

### 3.1 A33 (step 2)

`property-lookup-cache.ts` becomes `property-lookup-cache.B1.ts`, with its doc comments rewritten:
the entry's comment ("its own-key count") names the own-key names, and the function's drops "Not
caught: …" for the rule as it now is — a miss stands while the object's own names are the ones it
was made from, in order. No other file changes in `src/`.

### 3.2 A34 (step 3)

No code. Two public JSDoc blocks changed and one added (*corrected in step 3*: "Three JSDoc blocks",
where `defaultParserOptions` had none; with `generateCacheKey`'s re-pointed comment, three change in
the `.d.ts`), and one README sentence, each saying the same thing in its place: a value written into
an options object — the one the getter returns, one passed to `parse` again, or
`defaultParserOptions` — is not reliably seen, since the parse cache remembers options objects by
identity; replace the object instead. The getter's JSDoc and the retired entry give the mechanism
(*corrected in step 3*: this said a written value "is not seen, and a text parsed before keeps its
earlier reading", which a new call-options object makes false, as the step's code review measured). `parseFingerprint`'s and
`CompilerService`'s comments re-point from `docs/backlog.md` to `docs/backlog-retired.md` A34.

## 4. Work breakdown

One step per session behind the `/step` gate. Gate counts at the plan commit: `eval-core` 3288,
`eval-signals` 449, `eval-forms` 386.

**The table** (*added in step 2*, [SR4](../standing-rules.md#sr4)): the step skill reads a plan's
state from its § 4 table and the last step with a recorded **Outcome**, and Revision 1 had neither,
so step 2 was requested by number.

| Step | Subject | Files | Rows: `eval-core` / `eval-signals` / `eval-forms` | Ships in |
| :--- | :--- | :--- | :--- | :--- |
| 1 | This plan and its records | `docs/a33/plan.md` (new), `docs/README.md`, `docs/backlog.md`, `CLAUDE.md`, `.claude/skills/step/SKILL.md` | 0 / 0 / 0 | no package |
| 2 | A33: the miss is re-validated by name | `property-lookup-cache.ts`, `property-lookup-cache.spec.ts`, `eval.service.case-variant-guard.spec.ts`, `CHANGELOG.md`, `CLAUDE.md`, the register, the skill, this document; `SECURITY.md`, `docs/README.md` and the A24 plan, A33's links (*widened in step 2*) | **+9** / 0 / 0 | `eval-core` 0.15.1; `SECURITY.md` no package |
| 3 | A34: documented where a consumer reads | `parser.service.ts`, `parser-options.ts`, `README.md`, `parse-fingerprint.ts` and `compiler.service.ts`' comments, `parser.service.spec.ts`, `compiler.service.spec.ts`, `eval.service.spec.ts`, `CHANGELOG.md`, the register, the skill, this document; `docs/README.md` and the Phase 9 plan and summary, A34's links (*corrected in step 3*); `export-list.spec.ts`, an allowlist entry (*widened in step 3*) | **+6** / 0 / 0 | `eval-core` 0.15.1 |
| 4 | The release commit, `eval-core` 0.15.1 | `package.json`, `CHANGELOG.md`, the register, the skill, this document; a downstream row if § 8 q1 adds one | 0 / 0 / 0, unless q1 adds a row | the release |
| 5 | The post-publish record | the register, `CLAUDE.md`, the tag, the skill, this document | 0 / 0 / 0 | no package |
| 6 | Retrospect | this document's § 9 and § 10, `docs/standing-rules.md` if a rule stands, `CLAUDE.md`, `docs/README.md`, the register, the skill | 0 / 0 / 0 | no package |

From 3288 / 449 / 386, `eval-core` is at 3297 after step 2 and 3303 after step 3 (*corrected in
step 3*: 3299).

### Step 1 — This plan and its records

- **Edit**: this document, new; `docs/README.md`, a link to it (doc-links fails on a file under
  `docs/` it does not link); `docs/backlog.md` — A33's and A34's Status and index rows gain
  "Scheduled — the `[A33 plan](a33/plan.md)`, step 2" and "…, step 3", and "Work in flight" names
  this plan as active; `CLAUDE.md`, its two "No plan is active" sentences; and
  `.claude/skills/step/SKILL.md`, retargeted to this plan.
- **Criterion**: doc-links 0 dangling; the prototype hashes in § 1.2 and § 1.3 match
  `SHA256SUMS.txt` in the pinned folder; the step skill's § 1 names this plan.
- **Outcome** (2026-11-01): committed as cdceae4. Besides this document, `docs/README.md`'s
  "Active plan" holds the `a33/` row in place of "None"; the register's "Nothing is in flight." is
  deleted, false once this plan was active ([SR31](../standing-rules.md#sr31)); `CLAUDE.md` and the
  step skill name this plan. Found after it: the skill's step-state rule could not read this plan,
  which had no § 4 table and no recorded Outcome. Step 2's correction adds both.

### Step 2 — A33: the miss is re-validated by name

- **Characterisation first** ([SR15](../standing-rules.md#sr15), [SR27](../standing-rules.md#sr27)),
  nine rows written and run before `property-lookup-cache.ts` is touched (*corrected in step 2*: this
  named three, a unit row, a caller's row and a `y.CONSTRUCTOR` row, and no write leg; R6r, R6w,
  R7r and R7w were added after the code reviews). In
  `property-lookup-cache.spec.ts`, after "should find a property added after a cached miss", through
  `simpleEval` with `caseInsensitive` ([SR40](../standing-rules.md#sr40)):
  - R1, "should find a property added in the same interval as another is deleted, after a cached
    miss": over `o = { a: 1, b: 2 }`, `o.C` is `undefined`; after `delete o.a; o.c = 3`, `o.C` is `3`.
  - R2, "should write a case variant to a key added in the same interval as another is deleted": the
    same swap after a read of `w.C`; `w.C = 9` is `9`, `Object.keys(w)` is `['b', 'c']` and `w.c`
    is `9`, the caller's own object ([SR19](../standing-rules.md#sr19)).
  - R3, "should update a case variant of a key added in the same interval as another is deleted":
    the same with `u.C += 1`, `4`; keys `['b', 'c']`, `u.c` `4`.

  In `eval.service.case-variant-guard.spec.ts`, beside "should block on the resolved key rather than
  on the lowercased source key":
  - R4, the read: over `y = { a: 1, b: 2 }`, `y.CONSTRUCTOR` refused; `delete y.a` and an own
    enumerable, writable, configurable `constructor` of `7` defined; `y.CONSTRUCTOR` refused again.
  - R5, the write: the same swap, then `y.CONSTRUCTOR = 1` refused, and `y.constructor` still `7`.
  - R6r and R6w, a blocked own name that is not an own property of the immediate prototype, each
    its own object, its own cached miss and its own swap (*corrected in step 2*, the third review's
    I-1): over a plain `{ a: 1, b: 2 }`, `y.PROTOTYPE` reads `undefined`, no refusal, since the
    prototype holds no `prototype`; `delete y.a` and an own `prototype` of `7` defined as R4's. R6r
    then reads, `y.PROTOTYPE` refused; R6w writes, `y.PROTOTYPE = 1` refused, with no read after.
    Each asserts `Object.keys(y)` is `['b', 'prototype']` and `y.prototype` still `7`.
  - R7r and R7w, the same over `Object.assign(Object.create(null), { a: 1, b: 2 })`, with
    `constructor`.

  Every refusal asserts its message, `Access to dangerous property "<name>" is blocked for security
  reasons` ([SR18](../standing-rules.md#sr18)). Predicted, from 509b007's bundle
  (`write-probe-A.json`, `read-guard-A.json`, `crit-A.json`, `arms-A.json`): R1, R2, R3, R6r, R6w,
  R7r and R7w red, R4 and R5 green.
- **The fix** (§ 3.1): `property-lookup-cache.ts` made to the pinned B1, `git diff --no-index
  --ignore-cr-at-eol` against it printing nothing, and then its doc comments rewritten. Expected:
  every row green, and every other case.
- **Probes** ([SR16](../standing-rules.md#sr16)), each applied alone and reverted by hand, every
  `eval-core` case read; predicted from bundles built the same way (`read-guard-P22`, `-P23`,
  `-P23B.json`, and `arms-*.json` for the four new rows):
  - P2-1: `sameNames` reduced to the length test → R1, R2, R3 and the four new rows red; R4, R5
    green.
  - P2-2: the read path's resolved-key re-check, `if (!isPrimitive && foundKey &&
    isDangerousProperty(foundKey))`, never true → R4, R6r, R7r red, with the guard spec's existing
    rows that pin it; R5, R6w, R7w green.
  - P2-3: `resolveMemberTarget`'s `if (foundKey && isDangerousProperty(foundKey))` never true → R5,
    R6w, R7w green: `safeSetProperty` refuses with the same message.
  - P2-3b: P2-3, and `safeSetProperty`'s `isDangerousProperty(key)` never true → R5, R6w, R7w red,
    the write succeeding; R6r, R7r green. The write refusals are witnessed by the two layers
    together, not by either alone.
- **Edit**: `property-lookup-cache.ts` (§ 3.1); the two specs; `CHANGELOG.md` `[Unreleased]`
  `### Fixed`; `CLAUDE.md`'s "Security-relevant code" paragraph, which states A33's limit and that
  a repeated miss "skips comparing" the names; A33 retired to `backlog-retired.md` with the runs
  above as its evidence; the skill's counts; this document. *Widened in step 2*
  ([SR3](../standing-rules.md#sr3)): `SECURITY.md`, whose "Open register entry that bears on this"
  bullet named A33, and now names A54; `docs/README.md`'s and the A24 plan's links to A33,
  re-pointed; and A54 opened in `docs/backlog.md`.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): the dying claim is "a cached miss can outlive
  it" and its kin; grep `own-key count`, `same interval as another is deleted`, `outlive`,
  `skips comparing` and `cached miss can hide`, and decide every hit. Design records keep theirs
  ([SR6](../standing-rules.md#sr6)).
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)).
- **Outcome** (2026-11-01):
  - **Characterisation**, on cdceae4's code: R1 red, `undefined`; R2 red, a third key; R3 red,
    `NaN`; R4 and R5 green. `eval-core` 3290 of 3293. As predicted.
  - **The fix**: the diff against B1 printed nothing before the doc comments were rewritten; R1–R5
    green, `eval-core` 3293 of 3293.
  - **The code review's Critical.** The CHANGELOG line, the index row and the retired entry said "No
    refusal was skipped, before or after", and it was false. The guard scripts, and R4 and R5, tried
    only names a plain object's prototype holds, which the prototype scan refuses with or without a
    stale miss, so no arm could show the negation ([SR23](../standing-rules.md#sr23)). A blocked own
    name that is not an own property of the immediate prototype read `undefined` after the swap and
    a write made a sibling key. The claim is rewritten everywhere it was written, and R6 and R7 pin
    it. Then, with R6 and R7 run against cdceae4's cache code, restored by hand and reverted: 5 red
    of 3295, R1, R2, R3, R6 and R7, R6 and R7 at their read after the swap. With the fix, 3295 of
    3295. (R6 and R7 were later reordered, then split; below.)
  - **The second review**: no Critical. Two sentences corrected in place: the memory sentence named
    only objects a miss was answered for, where every lookup that is not a cached hit keeps the
    names; and "the prototype does not hold" read as inherited names, where the fallback reads the
    immediate prototype's own names only, so an instance of a class that declares none of the
    blocked names was affected for every blocked name but `constructor`, as the review measured.
    The stats JSDoc and § 1.4's unmeasured mechanism, made precise.
    - **I3 → [A54](../backlog.md#a54)**: a cached *hit* is reused while its key is still own, so a
      blocked own name added before it in own-name order is never seen, and a fresh lookup's
      refusal is skipped. Unchanged code, so opened, not fixed ([SR5](../standing-rules.md#sr5)),
      measured by `i3m3.mjs` (`C68CA5B7…BD5F4EF1`): the same on A and B1, `1` read and `2` written
      to `Prototype`, `prototype` still `7`. `SECURITY.md`'s "Open register entry that bears on
      this" bullet comes back, naming A54.

      | Claim | Witness |
      | :--- | :--- |
      | A54 is the open entry that bears on the list | doc-links, on `docs/backlog.md#a54`, which dangles when A54 retires unless the line is re-pointed; A54's index row reads `Open` |

    - **M3, R6 and R7 reordered**: the write first, then the read. Measured (`i3m3-*.json`): red on
      A and under P2-1, the write landing as a sibling key; red under P2-2, the read giving `7`, and
      under P2-3b, the write going through; green on B1 and under P2-3. Run in the suite, the same
      sets.
  - **The third review** (on the delta): no Critical.
    - **I-1, the reorder's cost.** With the write first, the unfixed write made a sibling key, so
      the key count changed and the read after it re-scanned and was refused either way; under the
      fix the write had already re-cached a found key, so the read was a cached hit. The read could
      not fail on the unfixed code: the write half had a witness and the read half none
      ([SR17](../standing-rules.md#sr17): one fixture shared by both arms). R6 and R7 are split into
      R6r, R6w, R7r and R7w, each its own object, its own cached miss and its own swap, +2 rows.
      Measured first by `arms.mjs` (`13CB0092…55EA0DB6`; `arms-*.json`).
    - **M-1 to M-4**, folded where each phrase was written: "an instance of a class that declares
      none of them", since a class declaring `toString` owns it on its prototype; "about 8 to 9
      bytes per own name", the object arm being 8.95; "a member access with a string key"; and A54's
      fresh-object write, now measured (`arms-A.json`, `arms-B1.json`: refused, `Prototype` kept).
  - **The memory**, the review's Important: the names array now lives as long as its object.
    Recorded, not designed out (D1, § 1.4, § 7).
  - **The probes**, measured, with all nine rows. On cdceae4's code restored by hand, 7 red of 3297:
    R1, R2, R3, and the four new rows at their line after the swap. With the fix, 3297 of 3297:

    | Probe | Red | Against the prediction |
    | :--- | :--- | :--- |
    | P2-1 | 7: R1, R2, R3, R6r, R6w, R7r, R7w | as predicted |
    | P2-2 | 26: R4; R5; R6r and R7r, the read giving `7`; the guard spec's five advisory-chain rows and its fifteen colliding-entry rows; `eval.service.colon-identifiers.spec.ts`' two criterion 7 refusals of `obj.CONSTRUCTOR`. R6w, R7w green | R5 red, predicted green |
    | P2-3 | 1: `assignment-target.spec.ts`' `o.CONSTRUCTOR = f()`, the check before the right side; R5, R6w, R7w green | as predicted, and one existing row |
    | P2-3b | 8: R5, R6w and R7w, the write succeeding; `assignment-target.spec.ts`' two `o.CONSTRUCTOR` rows; three in `variable-declaration.spec.ts`, its `__proto__` binding rows and its scope-balance row. R6r, R7r green | as predicted, and five existing rows |

    P2-2's miss: R5's first line is the read that caches the miss, and it asserts that read's
    refusal, which only the read path makes; `read-guard.mjs` asserted no refusal before the swap,
    so its P22 result had the write's refusal alone. The row is kept as written.
  - **Kill-list**, `git grep -n -i` on the final tree, this list's own lines aside:
    - `own-key count`, 14: the new CHANGELOG line, the five rows' comments, and A33's title and its
      entry as it stood, each naming the old rule as old; § 1.1, marked as replaced, and § 3.1 and
      this step's text, which quote it; A31's entry, 0.11.1's CHANGELOG line, the module's header and
      the spec's header, history of the shape key. Kept.
    - `same interval as another is deleted`, 10: the CHANGELOG line, R1–R3's names and this step's
      text, all the fixed behaviour's; A33's entry as it stood; A31's entry, which now points at A33.
      Kept.
    - `outliv`, 69: three on the miss, A31's (pointed at A33) and two in A33's entry as it stood,
      kept; this step's two lines; the rest are about scopes, registries, timers and closures.
    - `skips comparing`, 2, both this step's text quoting `CLAUDE.md`'s sentence, which is
      rewritten.
    - `cached miss can hide`, 3: `SECURITY.md`'s bullet is replaced by A54's; the A24 plan's two, a
      design record, kept with its link re-pointed ([SR6](../standing-rules.md#sr6)); this step's
      text.
    - The review's dead claim, "No refusal was skipped, before or after", by `-E 'no refusal|skipped
      refusal|refusal (is|was) skipped'`, 12 lines: the CHANGELOG line, the index row and the retired
      entry's *Fixed* text no longer hold it, rewritten; the entry as it stood keeps its "never a
      skipped refusal", with the *Corrected* note after it saying it was false; the A24 plan's two,
      a design record, kept; this document's four, § 1.3's correction, R6, the Outcome and its P2-2
      note; the retired entry's P2-2 note; and three unrelated, the A45 plan's, the A45 entry's
      "Fidelity" and the Phase 9 plan's.
    - `by identity`, for `CLAUDE.md`'s sentence on the names, rewritten to "with `===`"; the 107
      other hits are about objects, promises and functions.

### Step 3 — A34: documented where a consumer reads

*Corrected in step 3* ([SR4](../standing-rules.md#sr4)): this step named two witness rows, both in
`parser.service.spec.ts`, the second the setter's, which "criterion 3" already pins. Each documented
claim needs its own row, so there are six, four of them in `parser.service.spec.ts`, and the
setter's existing rows are a contrast. The CHANGELOG section was `### Documentation`, which this
CHANGELOG does not use; 0.14.1's documentation lines are under `### Changed`, placed before
`### Fixed` as in every other entry. After the code review, below, the documented contract is "not
reliably seen", W3 is reshaped and W6 is added. *Widened in step 3* ([SR3](../standing-rules.md#sr3)):
`modules/eval-core/src/export-list.spec.ts`. The README's new sentence names `defaultParserOptions`
in a code span, which documents it, so its `function-form` allowlist entry comes off, as the spec's
own comment prescribes: "A name the README documents comes off the list". Nothing else in the spec
changes, and no row count moves.

- **Witness rows first** ([SR21](../standing-rules.md#sr21)), green on today's code, since they pin
  the documented contract. Each in its file's style, a fresh root injector per case, its value
  asserted exactly. Measured first on the production bundle of ede0c6b by `a34doc.mjs`
  (`25ABF1EA…C046796C`, pinned beside the rest, `a34doc-A.json`):
  - W1, `parser.service.spec.ts`, the getter's object written in place is not seen for a text
    parsed before with no call options: `parse('k + 1')` a `BinaryExpression`; `parserOptions.extractExpressions = false`;
    `parse('k + 1')` still a `BinaryExpression`.
  - W2, the same file, a text parsed after such a write is cached as if the options were unchanged:
    after the same write, `parse('k + 2')` a `Program`, and `parse('k + 2', { extractExpressions:
    true })` served that `Program`, while `parse('k + 3', { extractExpressions: true })` is a
    `BinaryExpression`, the control.
  - W3, the same file, a caller's own options object passed again after a write (*reshaped after
    the code review*, measured by `a34doc2.mjs`, `B3B1CB64…35C87872`, `a34doc2-A.json`):
    `o = { extractExpressions: true }`; `parse('k + 4', o)` a `BinaryExpression`;
    `o.extractExpressions = false`; `parse('k + 4', o)` still a `BinaryExpression`. It was an
    `await p` row whose first parse threw, so nothing was cached before the write and the row
    witnessed only the "parsed after" half.
  - W4, `compiler.service.spec.ts`, in "the string key under the parse fingerprint", a write into
    `ParserService`'s options object reaches no string compiled before: `before = compile('Q1:1 ==
    1')` throws `Unsupported statement type: LabeledStatement` when called;
    `parserOptions.colonIdentifiers = true` written in place; `compile('Q1:1 == 1')` is `before`, and
    still throws; `compile('Q1:1 == 2')` called with `{ 'Q1:1': 2 }` is `true`. The setter's rows
    beside it ("criterion 3") are the contrast.
  - W5, `eval.service.spec.ts`, `defaultParserOptions` written and written back: `simpleEval('await
    p', { p: 1 })` throws `Unexpected token (1:6)`; `ecmaVersion` 2022 and `allowAwaitOutsideFunction`
    written in; `simpleEval('await q', { q: 1 })` is `1`; both written back; `await q` still `1`, and
    `await r` throws again. `defaultParserOptions` restored in a `finally`: it is a module-level export
    every later spec reads.
  - W6, `parser.service.spec.ts`, the contrast (*added after the code review*, `a34doc2-A.json`):
    after `parse('k + 1')` and `parserOptions.extractExpressions = false` written in place,
    `parse('k + 1')` a `BinaryExpression`, and `parse('k + 1', {})` a `Program`.
- **Probes** ([SR15](../standing-rules.md#sr15)), each applied alone and reverted by hand:
  - V: `parse-fingerprint.ts` made to the pinned V's code (`0EDC5C4E…2555258A`), the doc comment
    left re-pointed. Predicted from `a34doc-V.json`, `a34doc2-V.json` and `probe-V.json`: W1–W5 red,
    W6 and the setter's existing rows green.
  - F10: the code span around `defaultParserOptions` dropped from the new README sentence.
    Predicted: "names every export in a code span of the package README, or allowlists it" red,
    naming `defaultParserOptions`.
- **Edit** ([SR36](../standing-rules.md#sr36)): the getter's JSDoc and `parse`'s `@param options`
  (`parser.service.ts`); a new JSDoc on `defaultParserOptions` (`parser-options.ts`); the README
  sentence after the setter's ("…while a function already compiled keeps the reading it was compiled
  with."), with no link, since the README is published; `parse-fingerprint.ts`' and
  `compiler.service.ts`' references re-pointed to `docs/backlog-retired.md` A34, their text kept;
  `CHANGELOG.md` `[Unreleased]` `### Changed`; A34 retired, "decided: a documented limit", with
  § 1.4 and W1–W6 as its evidence, every inbound `#a34` link re-pointed (design records the link
  only, [SR6](../standing-rules.md#sr6)); `export-list.spec.ts`' `defaultParserOptions` allowlist
  entry removed (*widened in step 3*).
- **Claim → witness** ([SR21](../standing-rules.md#sr21)) and the wrong implementations
  ([SR20](../standing-rules.md#sr20)), in the Outcome.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `` backlog.md` A34 ``, `backlog.md#a34`,
  `Not caught`.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)).
- **Outcome** (2026-11-01):
  - **The pins**: `a33-prototype-add5.zip` (`D235C1D1…59C7818`) and, after the code review,
    `a33-prototype-add6.zip` (`666FD41F…3F31F58B73`), each extracted beside the rest, their six
    hashes appended to `SHA256SUMS.txt`; `sha256sum -c` 56 of 56.
  - **The rows**, written before any documentation: W1–W5 green on ede0c6b's code, as measured;
    `eval-core` 3302 of 3302. After the review, W3 reshaped and W6 added, all six green; 3303 of
    3303.
  - **The first probe of V**, on the five rows, every `eval-core` case read: 5 red of 3302, W1–W5
    and nothing else, as predicted.
  - **The code review's Critical.** The first wording said a written value "is not seen for a text
    parsed or compiled before, and a text parsed after the write is cached as if the options had not
    changed", in the getter's JSDoc, `parse`'s and `defaultParserOptions`', the README, the CHANGELOG
    and the retired entry. That was false now ([SR31](../standing-rules.md#sr31)). The memo holds one
    digest per pair of objects, so a parse through a new call-options object builds its digest from
    the written values: after the write, `parse('k + 1', {})` is a `Program`. A text evicted from the
    cache is also parsed again with the written values. Rewritten everywhere as "not reliably seen",
    with the mechanism in the getter's JSDoc and the retired entry; W6 pins the contrast. The
    review's Important: W3 and W5 each began with a parse that threw, so neither cached a text before
    the write, and the table gave them the "parsed before" claim; W3 is reshaped. Its Minors: the
    `.d.ts` changes in three blocks, plus one added, since the private `generateCacheKey`'s comment
    is emitted (D4, § 3.2, § 5); `### Changed` placed before `### Fixed`; `defaultParserOptions`'
    JSDoc names `ParserService`'s copy; and "the values it held before" is gone with the rewording.
  - **The re-review of the delta**: no Critical. I-a: the retired entry said a string `CompilerService`
    evicts sees the write, but it is compiled again through `ParserService.parse` and the same pair,
    so it sees the write only if that parse does; corrected. I-b: the getter's JSDoc said "a parse …
    of a text evicted since, sees the write", and no row witnessed it. The clause is dropped rather
    than witnessed: it would have published the cache's eviction policy, and "not reliably seen"
    covers eviction without it. The retired entry keeps eviction in its mechanism paragraph, marked
    read from the code, not measured; it is not published, so no row is owed. No W7, and `eval-core`
    stays at 3303. M-a: V's red on W6 is at W1's read, which W6 repeats, so it is no evidence about
    W6's claim ([SR23](../standing-rules.md#sr23)); the table and the retired entry say so. M-b: the
    README's and the CHANGELOG's "the reading it made before the write", whose "it" was the later
    parse, become "a text's reading from before the write".
  - **The probes**, every `eval-core` case read, each reverted by hand:

    | Probe | Red | Against the prediction |
    | :--- | :--- | :--- |
    | V | W1–W5, each at its own claim's line: W1 at the second `parse('k + 1')`; W2 at the served `toBe`; W3 at the second `parse('k + 4', o)`; W4 at `toBe(before)`; W5 at the written-back `await q`, which threw. W6 at W1's read, which it repeats; its own line is green under V ([SR23](../standing-rules.md#sr23)). Also F10's "allowlists no name the package README names", twice, once in each file that runs it; that came from the README's new code span, not from the probe | W6 red, predicted green |
    | F10 | 2: "names every export in a code span of the package README, or allowlists it", naming `defaultParserOptions`, in `export-list.spec.ts` and in `public-api.spec.ts`, which imports its cases | as predicted, run twice |

    W6's miss: its first assertion after the write is W1's read, and `a34doc2-V.json`'s
    `X_no_call_options` is a `Program` under V, so the row's own measurement predicted it red. V's
    red there is no evidence about W6's claim, since `parse('k + 1', {})` is a `Program` under V as
    well; that line is witnessed against the text-only key. The row is kept as written. After the V
    probe, `parse-fingerprint.ts`' diff is the one re-pointed line.
  - **Claim → witness**:

    | Claim | Where it is written | Witness |
    | :--- | :--- | :--- |
    | A later parse or compile may keep the reading made before the write | the getter's JSDoc; `parse`'s and `defaultParserOptions`' JSDoc; the README; the CHANGELOG | W1, W3 |
    | A text parsed after the write may be cached as if nothing had changed | the same | W2, W5 |
    | A string compiled before the write keeps its reading | the getter's JSDoc ("`CompilerService`'s cache of compiled strings"); the README | W4 |
    | Not reliably: a new call-options object sees the write | the getter's JSDoc; the README's "not reliably seen"; the retired entry | W6 |
    | A new object through the setter is seen, of a text seen before as of a new one | the getter's JSDoc ("through the setter"); the README's sentence before | `parser.service.spec.ts`' and `compiler.service.spec.ts`' "criterion 3" rows |
    | `defaultParserOptions` is documented in the README | the README's code span | F10's two rows, by the F10 probe |

    The wrong implementations: a memo validated by value, V, fails W1–W5, as the probe shows; a cache
    keyed by the text alone fails W6, at `parse('k + 1', {})`, and the setter's rows, which pin that a
    text parsed before is re-parsed after the setter.
  - **Kill-list**, `git grep -n` on the final tree: `` backlog.md` A34 ``, none, the two code
    comments re-pointed; `backlog.md#a34`, none. Besides the index row, Work in flight and the
    A-section summary, rewritten with the retirement, the eleven links doc-links listed are
    re-pointed: `docs/README.md`'s Active plan row; this document's opening; two in
    `backlog-retired.md`, A26's and A45's entries; Work in flight's Phase 9 paragraph in
    `backlog.md`; two in the Phase 9 plan and two in its summary, design records, the link only; and
    two in the CHANGELOG's 0.12.0 entry, the link only. `Not caught`, 6: A33's entry as it stood,
    kept as history, and five unrelated, in the Phase 5 plan and the three CHANGELOGs. The A-section
    summary's "A33 is a limit A31's fix left, and documented in the code" was false since step 2,
    and is rewritten in the sentence A34's link sat in ([SR31](../standing-rules.md#sr31)). The
    review's dead claim, by `not seen for a text`, `remember an options object by identity`, `is
    remembered by identity`, `values it held before` and `keeps its earlier reading`: W1's and W3's
    names narrowed to their setups, "with no call options" and "a text it parsed"; the rest are this
    document's and the retired entry's quotations of the old wording, the retired entry's mechanism,
    and A34's index row, which states the mechanism, kept.

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

Unchanged. Three JSDoc blocks change in the `.d.ts`, the private `generateCacheKey`'s among them,
and one is added, on `defaultParserOptions`.

## 6. Verification gates

[SR8](../standing-rules.md#sr8) after every step, on the committed tree. Counts rise by step 2's
nine rows and step 3's six in `eval-core` (*corrected in step 2*: three; *in step 3*: two), to 3297
and 3303; `eval-signals` and `eval-forms` unchanged.

## 7. Risks

- **A key re-ordered without being added or removed.** Integer-like keys sort first in
  `getOwnPropertyNames`, so adding `'2'` and deleting `'1'` changes the order as well as the names;
  B1 treats any difference as a change and re-scans, which costs a scan, never a wrong answer.
- **Timing on one machine.** The decisions rest on the sandbox (Linux, 2 cores); A53's episodes do
  not occur there. A rerun on Mikhail's machine would pin to the performance cores (SR28 as amended).
- **The names array lives as long as its object** (*added in step 2*, from its code review). The
  entry keeps the array `getOwnPropertyNames` built, where the miss path used to drop it after each
  call, for every object a `caseInsensitive` lookup has given an entry: about 8 to 9 bytes per own name,
  and about 32 per index name of an array of a million elements (§ 1.4). Freed
  with the object. Recorded, not designed out: a cap on the names kept leaves A33, its skipped
  refusals included, standing above it; not caching misses is B2's cost, about 4 µs per name per
  miss (§ 1.4, run 1); and before the fix every miss already allocated the same array, transiently.

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
