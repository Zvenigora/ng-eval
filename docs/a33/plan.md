# A33 and A34 — the lookup cache's miss and the parse memo's options, decided by measurement (`@zvenigora/ng-eval-core`)

**Date**: October 31, 2026
**Revision**: 6 — step 6, the retrospect. The plan is complete.

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
| 4 | The release commit, `eval-core` 0.15.1 | `package.json`, `CHANGELOG.md`, the register, the skill, this document; `eval-signal.spec.ts`, the row § 8 q1 adds (*corrected in step 4*: "a downstream row if § 8 q1 adds one") | 0 / **+1** / 0 (*corrected in step 4*: "0 / 0 / 0, unless q1 adds a row") | the release; the row no package |
| 5 | The post-publish record | the register, `CLAUDE.md`, the tag, the skill, this document | 0 / 0 / 0 | no package |
| 6 | Retrospect | this document's § 9 and § 10, `docs/standing-rules.md` if a rule stands, `CLAUDE.md`, `docs/README.md`, the register, the skill; `docs/backlog-retired.md`, A31's dated note (*widened in step 6*: the prompt asks for it) | 0 / 0 / 0 | no package |

From 3288 / 449 / 386, `eval-core` is at 3297 after step 2 and 3303 after step 3 (*corrected in
step 3*: 3299), and `eval-signals` at 450 after step 4.

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

- **Outcome** (2026-11-01):
  - **The pin**: `a33-prototype-add7.zip` (`2EF46152…D884C5`) extracted beside the rest, its five
    hashes appended to `SHA256SUMS.txt` (`text-only-key.patch` `6E529EFD…60370188`); `sha256sum -c`
    61 of 61.
  - **Step 3's missing probe** (*a correction to step 3's probe set*, [SR4](../standing-rules.md#sr4)):
    V leaves W6's own line green by design, so no probe had turned it red. `text-only-key.patch`, a
    `parseFingerprint` that returns `'text-only'` on every call, applied alone with its hash checked
    first, every `eval-core` case read, reverted with `git apply -R`: **77 red of 3303**, in four
    files.
    - Predicted, and red: W6 at its own line, `parse('k + 1', {})` a `BinaryExpression` (line 271);
      `parser.service.spec.ts`' criterion 3 setter row; `compiler.service.spec.ts`' two criterion 3
      setter rows. W1–W5 green, as predicted.
    - Not predicted, and red, 73 existing rows that pin A26's key, which the patch undoes: the rest
      of `parser.service.spec.ts`' A26 block, twelve (criterion 1, criterion 2's two, the
      key-present-as-`undefined` row, criterion 4's seven and criterion 6), its A30 block's seven
      ((b), (c) and (d)) and its Phase 9 step 3 criterion 2; `compiler.service.spec.ts`' callback
      row, uncached; 51 of the 96 rows of `colon-identifiers.spec.ts`' case table, all through
      `ParserService.parse`, the free parse having no cache, 18 at the option-on read
      after the option-off ones (line 292) and 33 at the option-off read after it (line 295); and `readme-examples.spec.ts`' "should parse an expression into an
      ESTree AST". Some of the 73 are red because the patch also returns before the callback bypass,
      not only because the key is the text. The prediction came from the sandbox's
      `a34doc-T.json` and `a34doc2-T.json`, which run only the A34 rows and the setter's, not from
      what the probe changes ([SR16](../standing-rules.md#sr16)): a text-only key is the key A26
      replaced, and every A26 row pins it.
    - `git apply -R` left the file with CRLF endings where it had LF (`core.autocrlf` is `true`):
      no content diff, but `git status` listed it. Restored to HEAD's bytes with
      `git -c core.autocrlf=false checkout --` on that one file, its SHA-256 then equal to the
      blob's.
  - **§ 8 q1, decided: one downstream row.** In `eval-signal.spec.ts`' "forwarding options.eval to
    both halves", D1, "should find a property added in the same interval as another is deleted,
    under a single caseInsensitive (eval-core A33)": `x = { a: 1, b: 2 }`, a plain value in the
    source, and `n = signal(1)`; `[x.C, n]` under `{ eval: { caseInsensitive: true } }` is
    `[undefined, 1]`; after `delete x['a']; x['c'] = 3; n.set(2)`, `[3, 2]`. Green, `eval-signals`
    450 of 450. P2-1, `sameNames` reduced to the length test, applied alone by hand and reverted by
    hand: 1 red of 450, D1 at its last line, received `undefined`, as predicted; the file's
    SHA-256 after the revert equals the blob's. The row ships in no package.
  - **The `.d.ts`** (D4): `npm pack @zvenigora/ng-eval-core@0.15.0` into a folder outside the
    repository, against the production build of this tree: four hunks, all JSDoc, no declaration —
    `defaultParserOptions`' block added, the `parserOptions` getter's and `parse`'s `@param
    options` changed, and `generateCacheKey`'s reference re-pointed to `docs/backlog-retired.md`
    A34. The README differs by the passage step 3 appended to the setter's paragraph, and nothing
    else.
  - **The release**, by CONTRIBUTING's Releasing, its files checked against 95932e6's four
    (`modules/eval-core/package.json`, `modules/eval-core/CHANGELOG.md`, `docs/backlog.md`,
    `docs/backlog-retired.md`), with this document, the skill and `eval-signal.spec.ts`:
    `package.json` 0.15.0 → 0.15.1, no other `package.json` changed, since `>=0.15.0 <0.16.0` takes
    it; the CHANGELOG's `[Unreleased]` moves under `## [0.15.1] - 2026-11-02`, npm's UTC date at
    release time, which step 5 corrects if npm's differs, with a lead paragraph in 0.14.1's form;
    A33's and A34's Status lines and index rows say "released in `eval-core` 0.15.1, pending
    publish"; the *Unreleased* history row names the release; Work in flight records the step. A54's
    entry states no 0.15.1 status, and is unchanged.
  - **The code review**: no Critical. I1, the CHANGELOG lead's "A33's lower bound is not measured:
    the count rule dates from 0.11.1", read as if releases before 0.11.1 were unaffected, while the
    cache before A31's fix (8ace46d's parent) kept a miss while the own-key count and the first five
    own names were unchanged, a narrower form of the same defect, read from the code and not
    measured. The clause is dropped; the sentence keeps "not measured", as the retired entry does.
    M1, the case table's row count, and M2, the q1 measurement's arm, P2-1, corrected here and in
    § 8; M3, Work in flight names the Publication status row among step 5's records.
  - **The gate**: `eval-core` 3303, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling;
    release-tags 51 rows, 61 tags.

### Step 5 — Post-publish record

Mikhail publishes `eval-core` 0.15.1; the annotated tag at the release commit; `docs(release):`
with the register history row and the publication status.

- **Outcome** (2026-11-01):
  - **Published**: `npm view @zvenigora/ng-eval-core@0.15.1 version` is 0.15.1, and npm's `time`
    gives 2026-11-02T01:49:38.704Z, so the CHANGELOG heading's 2026-11-02 stands and no file under
    `modules/` changes.
  - **The tag**: `eval-core@0.15.1`, written by the maintainer, is annotated (`git cat-file -t` is
    `tag`, tag object 6fd39ad, message `eval-core 0.15.1`, in `eval-core@0.14.1`'s form) and peels to
    9e88d1848a9619e587d253b3080c25599510f510, the release commit; `git ls-remote --tags origin`
    lists it, peeling to the same.
  - **The files**, 34bebbd's list: `docs/backlog.md`, the Publication status row, first, in the
    0.14.1 row's form; the *Unreleased* history row made 0.15.1's, at 9e88d18 and 2026-11-02, its
    counts unchanged, and no new *Unreleased* row, since nothing has moved since the tag; A33's and
    A34's index rows, released 2026-11-02 and tagged 9e88d18; the tag paragraph, fifty-two rows and
    sixty-two tags, one at 9e88d18; and Work in flight, Revision 5, step 6 next.
    `docs/backlog-retired.md`, A33's and A34's Status lines. `CLAUDE.md`, `eval-core`'s "Published
    at". The skill and this document.
  - **Code review**: not run. The step changes no file under `modules/` or `tools/`
    ([SR33](../standing-rules.md#sr33)), and neither this plan nor the request asks for it.
  - **The gate**: `eval-core` 3303, `eval-signals` 450, `eval-forms` 386, unchanged; doc-links 0
    dangling; release-tags 52 rows, 62 release tags, all annotated, 0 failing.

### Step 6 — Retrospect

§ 10, and any rule this plan's process earned.

- **Outcome** (2026-11-02):
  - **The rules**: [SR19](../standing-rules.md#sr19), [SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16), [SR28](../standing-rules.md#sr28) and [SR32](../standing-rules.md#sr32) amended; [SR43](../standing-rules.md#sr43) and [SR44](../standing-rules.md#sr44) added. Their texts are in `docs/standing-rules.md`, and § 10.6 weighs each candidate. None was declined.
  - **The records**: `docs/README.md`, `CLAUDE.md` and the skill name no active plan, and the register's Work in flight says this plan is complete. A31's entry gains the dated note, *Noted 2026-11-01*, for the aside step 2 added. This document: § 9, § 10, and this Outcome.
  - **Code review**: not run. The step changes no file under `modules/` or `tools/` ([SR33](../standing-rules.md#sr33)).
  - **The gate**: `eval-core` 3303, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; release-tags 52 rows, 62 tags, all annotated.

## 5. Public API surface

Unchanged. Three JSDoc blocks change in the `.d.ts`, the private `generateCacheKey`'s among them,
and one is added, on `defaultParserOptions`.

## 6. Verification gates

[SR8](../standing-rules.md#sr8) after every step, on the committed tree. Counts rise by step 2's
nine rows and step 3's six in `eval-core` (*corrected in step 2*: three; *in step 3*: two), to 3297
and 3303, and by step 4's one in `eval-signals`, to 450; `eval-forms` unchanged (*corrected in
step 4*: "`eval-signals` and `eval-forms` unchanged").

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
  where one does. **Decided in step 4: one `eval-signals` row.** A plain object in a
  `createEvalSignal` source is read in place, so a recompute driven by another signal reaches the
  stale miss: measured at 13c8475 through Jest with P2-1 standing in for 0.15.0's count rule
  (`zz-a33-reach.result.txt`, both rows `undefined`), and pinned as D1 (step 4's Outcome). The same
  measurement's second route, an object in a signal re-set to itself with `equal: () => false`, is
  not pinned. `eval-forms` is not measured; nothing claims it.

## 9. Contract after this lands

Written by step 6, from the code at 9e88d18 and the measurements in § 1. `eval-core` 0.15.1 provides
items 1 to 5. `eval-signals` reaches items 1 to 4 through its `caseInsensitive` option, and item 6 is
its one row, D1, which ships in no package. `eval-forms` is not measured, and nothing here claims it.

1. **A cached miss stands only while the object's own names are the ones it was made from.** The
   names are kept in order and compared with `===`. Any difference, a key added in the same interval
   as another is deleted included, makes the object's answers afresh (`property-lookup-cache.ts`;
   R1–R3). The stored array is the one the miss path already built.
2. **A cached hit stands while its key is still an own property of the object**, checked without a
   scan. A key deleted or renamed since is scanned for again. A hit is not compared with the names, so
   a blocked own name added before it in own-name order is not seen, and a fresh lookup's refusal of it
   is skipped. That is [A54](../backlog.md#a54), open and not scheduled, and this contract does not
   cover it.
3. **The cache's retained memory.** An entry keeps its names array for as long as its object lives,
   where a lookup that was not a cached hit used to drop it after the call. Measured on the production
   bundles (§ 1.4): about 8 to 9 bytes more per own name; one array of 1,000,000 numbers, 2.25 MB to
   32.76 MB at `v.map`; 1,000 arrays of 1,000 numbers, 2.79 MB to 10.49 MB; 10,000 objects of 50 keys,
   2.71 MB to 6.98 MB. Recorded, not designed out (D1, § 7). The hit path is unchanged.
4. **An options object is remembered by identity, so a value written into it is not reliably seen.**
   The parse cache, and `CompilerService`'s cache of compiled strings, key each pair of options objects,
   the parser's and a call's, by identity, and a reading made for a pair holds for that pair. So a value
   written into the getter's object, into an object passed to `parse`, or into `defaultParserOptions`
   may not reach a later parse made through a pair seen before the write. A parse through a new
   call-options object sees it (W6). Replace the object rather than write into it: the setter takes a
   new one, and a new object through the setter is seen (the setter rows, criterion 3). What happens to
   a text evicted from the cache is not part of this contract. The retired entry gives it from the code,
   unmeasured, and no row pins it.
5. **The witnesses.** W1 to W3 and W6 are in `parser.service.spec.ts`, W4 in `compiler.service.spec.ts`
   and W5 in `eval.service.spec.ts`; the setter rows are the contrast. The wording is in the getter's
   JSDoc, `parse`'s `@param options`, `defaultParserOptions`' JSDoc and the README's sentence after the
   setter's. The README's code span for `defaultParserOptions` is pinned by F10, in `export-list.spec.ts`
   and `public-api.spec.ts`.
6. **`eval-signals`: D1.** A `createEvalSignal` over a plain object in its source, under
   `caseInsensitive`, finds a property added as another is deleted, after a recompute driven by another
   signal (`eval-signal.spec.ts`; P2-1 turns it red, received `undefined`). The same measurement's
   second route, an object re-set to itself with `equal: () => false`, is not pinned (§ 8 q1).

## 10. Retrospect

Written in step 6, 2026-11-02 ([SR7](../standing-rules.md#sr7)). Like the A24 plan's, it keeps what a
later plan can reuse. Each step's outcome in § 4 says what that step did.

### 10.1 What shipped

`eval-core` 0.15.1, a patch, at 9e88d18: A33 fixed, A34 documented, and `eval-signals`' D1 as one row
in no package. The tag is `eval-core@0.15.1`, annotated (object 6fd39ad), and npm's time is
2026-11-02T01:49:38.704Z, so the CHANGELOG's date stood. `eval-signals` and `eval-forms` do not
release: `>=0.15.0 <0.16.0` takes the patch.

- **Closed**: [A33](../backlog-retired.md#a33) and [A34](../backlog-retired.md#a34). **Opened**:
  [A54](../backlog.md#a54), by step 2's review, open and not scheduled. The register's history row reads
  19 live at 9e88d18, one opened, four closed (F30, A53, A33, A34), 16 after.
- **The rows**: 3288 / 449 / 386 to 3303 / 450 / 386. `eval-core` gained 9 in step 2 and 6 in step 3;
  `eval-signals` gained 1 in step 4.
- **The `.d.ts`**: four JSDoc hunks and no declaration, against 0.15.0's tarball (D4).
- **Release tags**: 52 rows and 62 tags at the gate, all annotated.

### 10.2 Plan corrections, by step and revision

The revision is the step's number: each step's commit is the revision it wrote.

- **Revision 1, step 1.** The step skill's state rule could not read this plan. It reads state from § 4's
  table and the last recorded Outcome, and Revision 1 had neither, so step 2 was requested by number.
  Step 2 added both.
- **Revision 2, step 2.** § 1.1 named `resolveMemberWriteKey`, which the code does not have; the read path
  and `resolveMemberTarget` do. § 1.3's "all six refused" and "refused, refused" were true only of names a
  plain object's prototype holds, so no arm there could show a skipped refusal (SR23); `crit.mjs` replaces
  that claim. The row counts in § 4 and § 6 said three for step 2 and two for step 3, where the steps add
  nine and six. The file list was widened for `SECURITY.md`, `docs/README.md`, the A24 plan's link, and
  A54's opening. The characterisation rows went from three to nine, with R6r, R6w, R7r and R7w split out
  after the review. § 1.4 gained the memory measurement, and § 7 its risk.
- **Revision 3, step 3.** The witness rows went from two to six: the setter's row is a contrast, not a
  witness for the documented claim. The CHANGELOG section is `### Changed`, placed before `### Fixed`,
  since this CHANGELOG has no `### Documentation`. The documented contract changed from "is not seen" to
  "not reliably seen" after the review. W3 was reshaped and W6 added. § 3.2 and D4 went from two changed
  JSDoc blocks to three, plus the added one, because the private `generateCacheKey`'s comment is emitted.
  `export-list.spec.ts` was widened for the allowlist entry.
- **Revision 4, step 4.** § 4's step 4 row said "0 / 0 / 0, unless q1 adds a row"; the row landed, so it
  reads +1. `eval-signal.spec.ts` was widened for it. § 8 q1's measurement arm was corrected (M2), the case
  table's row count was corrected (M1), and Work in flight's step-5 records were named (M3). The
  reviewer's I1 dropped a lower-bound clause (§ 10.4).
- **Revision 5, step 5.** The post-publish record's own Outcome is its only change. Its CHANGELOG date stood.
- **Revision 6, step 6.** This revision. § 4's step 6 row was widened to `docs/backlog-retired.md` for A31's
  dated note, which the prompt asked for ([SR3](../standing-rules.md#sr3)).

### 10.3 Each probe prediction that missed, and why

| Probe | Predicted | Red | What the prediction left out |
| :--- | :--- | :--- | :--- |
| P2-2, the read path's re-check never true | R4, R6r, R7r red; R5, R6w, R7w green | 26: R4; R5; R6r and R7r; the guard spec's five advisory-chain and fifteen colliding-entry rows; two `eval.service.colon-identifiers.spec.ts` refusals. R6w and R7w green | R5's first line is the read that caches the miss, and only the read path refuses it. `read-guard.mjs` asserted no refusal before the swap, so its P22 result had the write's refusal alone. The prediction named the pinning rows and did not count them |
| P2-3, `resolveMemberTarget`'s check never true | R5, R6w, R7w green | One more: `assignment-target.spec.ts`'s `o.CONSTRUCTOR = f()`, whose check runs before the right side | An existing row pins the same check's position, and was not read |
| P2-3b, P2-3 and `safeSetProperty`'s check never true | R5, R6w, R7w red; R6r, R7r green | 8: those three and five existing rows, two in `assignment-target.spec.ts` and three in `variable-declaration.spec.ts` | The existing rows that pin the same write mechanism, its `__proto__` binding rows and its scope balance |
| V, the memo validated by value | W1–W5 red | W1–W5 red, and W6 red at its own W1 read; F10's two rows also turned red, which the outcome attributes to the README's new code span | W6's first assertion is W1's read, which caches the text. Under V, `parse('k + 1', {})` is a `Program` too, so V's red there is no evidence about W6's claim (SR23) |
| The text-only patch, a key that is the text alone (step 4) | W6, criterion 3's setter row, and compiler's two setter rows: 4 | 77 | The prediction came from `a34doc-T.json` and `a34doc2-T.json`, which run only the A34 and setter rows, not from the probe's mechanism. A text-only key is the key A26 replaced, and 73 existing rows pin A26's key: twelve in `parser.service.spec.ts`' A26 block, seven in its A30 block, one Phase 9 criterion 2 row, the compiler callback row, 51 of `colon-identifiers.spec.ts`' 96 cases, and `readme-examples.spec.ts`' AST row. Some of the 73 also come from the patch returning before the callback bypass, a second mechanism |

P2-1 matched its prediction, and F10's probe was predicted as red and was.

Most of the misses are predictions made from the rows the step wrote, not from the rows that pin the
mechanism, which [SR16](../standing-rules.md#sr16) already says to derive. The text-only patch was the
clearest case: its prediction read the A34 rows, not the probe's mechanism. Two misses are of another
kind. P2-2's R5 first line is the read that caches the state its second line tests, so the row's later
assertion depended on the earlier one's state, which [SR43](../standing-rules.md#sr43) now names. V's red
at W6 is the same shape, a later assertion's red at an earlier line, which is no evidence for its own claim.

### 10.4 Reviewer findings that changed dictated text

- **Step 2, Critical.** "No refusal was skipped, before or after" was false in the CHANGELOG line, the
  register row and the retired entry. The characterisation and the guard scripts tried only names a plain
  object's prototype holds, which the prototype scan refuses with or without a stale miss, so no arm could
  show the negation ([SR23](../standing-rules.md#sr23)). The claim was rewritten everywhere; R6 and R7 were
  added. Measured: 5 red of 3295 on the old cache, the fixed one 3295 of 3295. Candidate
  [SR19](../standing-rules.md#sr19), amended.
- **Step 2, I-1 (third review).** With the write first, the unfixed write made a sibling key, so the
  read re-scanned and was refused either way; the read could not fail on the unfixed code. The cause was
  one fixture shared by a write and a read in one row, the read's outcome depending on the write's state.
  R6 and R7 were split into R6r, R6w, R7r and R7w, each with its own object, miss and swap. Candidate
  [SR43](../standing-rules.md#sr43), new.
- **Step 2, the memory (the review's Important).** The names array now lives as long as its object. Recorded,
  not designed out (§ 1.4, § 7).
- **Step 2, second review (no Critical).** Two sentences were corrected: the memory sentence named only
  objects a miss was answered for, and "the prototype does not hold" read as inherited names where the
  fallback reads the immediate prototype's own names only.
- **Step 3, Critical.** The wording "is not seen for a text parsed or compiled before, and a text parsed
  after the write is cached as if the options had not changed" was false. The memo holds one digest per
  pair, so a new call-options object builds its digest from the written values, and `parse('k + 1', {})`
  is a `Program` after the write. The wording became "not reliably seen", everywhere, and W6 pins the
  contrast. The cause: the claim came from the mechanism (an identity-keyed memo) without measuring the
  new-object path that contradicts it. Candidate [SR44](../standing-rules.md#sr44), new.
- **Step 3, Important.** W3 and W5 each began with a parse that threw, so nothing was cached before the
  write. The table gave W3 the "parsed before" claim, and W3 was reshaped. W5's claim is "parsed after",
  which W2 and W5 witness, so it stood.
- **Step 3, re-review.** I-a: the retired entry said that a string `CompilerService` evicts sees the write.
  It is compiled again through `ParserService.parse` and the same pair, so it sees the write only when that
  parse does. Corrected. I-b: the getter's JSDoc said a text evicted since sees the write, and no row
  witnessed it. The clause was dropped rather than witnessed, since it would have published the cache's
  eviction policy. Candidate [SR44](../standing-rules.md#sr44), which leaves unpromised paths unstated.
  M-a: V's red on W6 is at W1's read, which is no evidence about W6 (§ 10.3).
- **Step 4, code review, I1.** The CHANGELOG lead said "A33's lower bound is not measured: the count rule
  dates from 0.11.1", which read as if releases before 0.11.1 were unaffected. The cache before A31's fix
  kept a miss while the count and first five names matched, which the review read from the code. The clause
  was dropped, and the sentence keeps "not measured", as the retired entry does.

### 10.5 Process traps

- **The step skill's state rule.** It reads a plan's state from § 4's table and the last recorded Outcome,
  and Revision 1 had neither. The skill's note now says what a plan's step 1 records and when § 4 carries its
  table.
- **`core.autocrlf`.** The maintainer's checkout sets it to `true`. `git apply -R` in step 4 left the probed
  file with CRLF endings where HEAD has LF: no content diff, but `git status` listed it. It was restored with
  `git -c core.autocrlf=false checkout --` on that one file, and its hash checked against the blob's. [SR32](../standing-rules.md#sr32)
  is amended to say so.
- **The confirmation gate was skipped at step 5, not the SR8 gate.** Step 5 ran the SR8 gate, and its
  Outcome's counts are from that run. What was skipped is the step skill's confirmation gate: the prompt's
  full scope was taken as the confirmation, though it did not say so. The rule this records: a prompt that
  pre-answers a `/step` gate says so explicitly, and one that does not is not an answer. Step 5's text
  stays as written ([SR6](../standing-rules.md#sr6)).

### 10.6 Rules weighed

Each candidate was weighed against the failures in §§ 10.2–10.5. The rule texts are in
`docs/standing-rules.md`, in the file's form, each with its *Origin* and *Red*.

| Candidate | Decision | Reason | *Origin* in this plan |
| :--- | :--- | :--- | :--- |
| SR19: a refusal row's fixtures include a blocked name the object's prototype holds and one it does not, and a null-prototype object | **Amend SR19** | The store shape and the name class were the legs the refusal rows lacked. SR19 already asks for every shape and option; the step 2 Critical came from missing exactly these | § 10.4, step 2 Critical |
| New SR43: a row's later assertion does not depend on state an earlier one changed; probes read one arm per case | **Promote, SR43** | SR17 names one fixture shared by both arms of a comparison, not sequence within one row. The shape recurred three times here: I-1's read after its write, W3 and W5's throws leaving nothing cached, and V's red at W6's W1 read | § 10.3, P2-2 and V; § 10.4, I-1 and step 3, Important |
| SR28: a change to a cache states its retained memory in the decision rule | **Amend SR28** | SR23 already says to name the arm that would show the claim's negation, but the timing rule had no memory arm, so the cost was measured after the decision | § 1.4, the memory; § 10.4, step 2, the memory |
| New SR44: a documented limit states the contract that holds on every path; the paths that contradict a stronger wording are measured first | **Promote, SR44** | SR31 fixes a claim false now; SR44 stops one being written false. Step 3's Critical was written from the mechanism, not from a measured path | § 10.4, step 3 Critical and re-review I-b |
| SR15: a contrast row's probe is its own wrong implementation, not the change's probe | **Amend SR15** | W6 is green under the change's probe by design, so only the text-only patch turned it red, found at step 4 | § 10.2, Revision 4; § 10.3, the text-only patch |
| SR16: a probe changes only the mechanism its row claims; the prediction names the existing rows that pin the same mechanism | **Amend SR16** | The text-only patch's 73 unpredicted rows came from predicting off the A34 rows, and the patch changed a second mechanism as well | § 10.3, the text-only patch |
| SR32: after a revert, `git status` shows the file clean; under `core.autocrlf`, restore it with `git -c core.autocrlf=false checkout --` | **Amend SR32** | `git apply -R` left a CRLF file that `git status` listed, with no content change | § 10.5, `core.autocrlf` |

Nothing was declined. Each new or amended rule names the rule it overlaps: SR43 says how it differs from
SR17's shape, SR28 relies on SR23's arm, and SR44 says what it adds to SR31, so no two rules hold one check.
