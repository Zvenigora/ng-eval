# Backlog

The single register of deferred work in this repository: defects recorded rather than fixed,
decisions logged rather than made, and gaps in what the suite can catch. If it was noticed and
not done, it is here.

[`ROADMAP.md`](../ROADMAP.md) plans **phases** — new capability, in order. This file holds
everything else. Neither duplicates the other, and an entry that grows into a phase moves out
of here and is marked retired with a pointer.

## Why this file exists

Until 2026-09-06 these entries lived in nine sections of `ROADMAP.md`, in six plan and step
documents under `docs/`, and in code comments — and several lived in none of them.

The failure that produced this file: **`EvalService._activeStates` grows unboundedly and is
drained only at `ngOnDestroy`** ([A8](backlog-retired.md#a8)). It was found in Phase 1, carried forward in six
step summaries across two later phases, and pinned by two specs. One summary and one spec
comment stated it was "already in `ROADMAP.md`'s deferred defects". It was not, in any
revision. Five phases of sessions read a pointer to an entry that did not exist, and each
concluded someone else was tracking it.

So: one file, stable IDs, and every entry states where it is recorded and what verified it.
An entry with a wrong cross-reference is worse than no entry, because it stops the next
reader looking.

## Using this file

- **IDs are stable.** Cite `BL-A8`, not a line number. Line numbers into this file will rot the
  way the citations into `ROADMAP.md` did.
- **Adding an entry**: give it the next free ID in its group, fill every column of the index,
  and say what verified it. "Noticed while reading" is a legitimate answer; leaving it blank is
  not.
- **Two files.** Live entries are here; retired ones are in `docs/backlog-retired.md`, in their
  original order and section. **The index below covers both**, and a retired row links there.
- **Retiring an entry**: mark it, give the reason and the evidence, then move it to
  `backlog-retired.md` and point its index row there. Do not delete. A retired entry with its
  reason tells the next reader the question was asked and answered; a gap tells them nothing,
  and they will re-derive it. Then run `node tools/doc-links.mjs`: every inbound link to the
  moved entry now dangles, so the gate lists each one to re-point. **A published README's link
  binds** ([F25](backlog-retired.md#f25) Part 4): if `tools/published-links.txt` lists the entry's
  anchor, as it lists `#a24`, the index row keeps it, `<a id="…"></a>` in its first cell, and the
  gate fails at that list's line until it does.
- **A step that fixes an entry** updates that entry in the same commit.

**The convention above is not enough, and there is evidence rather than a worry.** The commit
that created this file added two links from `ROADMAP.md` to a § "Phase 2 preconditions" that it
never wrote — a dangling cross-reference, shipped in the commit whose stated subject was that
dangling cross-references are how [A8](backlog-retired.md#a8) hid for five phases, and caught within the same
session by reading the links back. That is the fourth time in this project a check has caught
its own author inside a session of being written; the first three became
[`docs/forms/phase-6-plan.md`](forms/phase-6-plan.md) §§ 0.2.1–0.2.3. It argues for a
**mechanical link check** over this file's cross-references rather than a rule telling people
to be careful. [`docs/gates/plan.md`](gates/plan.md) § 8.4 deferred it, and it was built
2026-09-28 as `tools/doc-links.mjs`, which retired [F9](backlog-retired.md#f9).

### Work in flight

**The A35 plan is complete**: [`docs/a35/plan.md`](a35/plan.md), at Revision 16, steps 1 to 11 and
U3. `eval-core` 0.12.1 and 0.13.0 are published, with `eval-signals` 0.6.0 and `eval-forms` 0.6.0;
[A35](backlog-retired.md#a35), [A39](backlog-retired.md#a39) and [A42](backlog-retired.md#a42) are
fixed, retired and released. U3, the one advisory, is published as
[GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx),
a repository advisory, and listed in `SECURITY.md`. It is not yet in GitHub's global Advisory
Database, pending GitHub's review, so no Dependabot alert fires from it yet; a CVE is requested, and
its ID lands in `SECURITY.md`'s CVE column when assigned.
- Step 1 fixed [A36](backlog-retired.md#a36), released in 0.12.1, and its review opened [A38](#a38).
- Step 2 refuses a dangerous function by its value at the call, `new` and tag sites, released in
  0.12.1. That is [A35](backlog-retired.md#a35) at the callee.
- Step 3 fixed [A37](backlog-retired.md#a37), released in 0.12.1: a sequence leaves one value on the
  stack.
- Step 4, the funnel, refuses a dangerous function at every read the walk makes, released in 0.12.1.
  Its review found a route the funnel cannot see, through `this`, opened as
  [A39](backlog-retired.md#a39). It also opened [A40](backlog-retired.md#a40).
- Step 5 rewrote `SECURITY.md` for 0.12.1. It leads with the mitigations, Node's flag among them as
  measured. The refusals are protections, stated as defense in depth, and the route through `this`
  and a host container are limits beside them. A35 stays open. The step opened
  [A41](backlog-retired.md#a41).
- Step 6 released `eval-core` 0.12.1, tagged at 7cc8d30 and published 2026-10-17. No advisory is
  published for it.
- **Shape (i) is chosen.** 0.12.1 shipped steps 1–4 as partial hardening, with A39 as a stated limit
  (steps 5 and 6). One advisory follows 0.13.0.
- Step 7 closed the value route: `this` only as the object of a member access.
- Step 8 closed the receiver: every receiver the evaluator resolves from the context is a guarded
  view, never the context. Its first run stopped at R4, a receiver the design could not see
  (Revision 13), and it completed under the plan's § 8 q7 option (a).
- Step 9 made both routes protections in `SECURITY.md` and retired A35 and A39. A host container
  stays a limit. Its timing gate found the cached view regressed bare calls ~45% on a fresh context,
  and the view is now built per call and retained by nothing. Its code review found that the view
  took its two methods off the context instance, where an expression can shadow them — and then
  that the view was never the only caller: the evaluator invoked a plant itself, which reversed a
  closure claim already given. Under the plan's Revision 16 the step grew a third fix, the root
  cause: a write whose target is an `EvalContext` is refused by class
  ([A42](backlog-retired.md#a42)), the methods the evaluator calls are taken from the class, and a
  context reached as data is refused.
- Step 10 released `eval-core` 0.13.0, `eval-signals` 0.6.0 and `eval-forms` 0.6.0 in one commit,
  every downstream floor raised to the 0.13 line. Tagged at f7f27f7 and published 2026-10-20.
- Step 11 recorded the release. The three tags were first pushed lightweight and were recreated
  annotated at the same commit, as CONTRIBUTING's step 5 has them.
- U3 published the advisory, 2026-10-21 (UTC), covering `eval-core` `<= 0.12.1` and both downstream
  packages `< 0.6.0`. Its follow-up commit recorded it here, on the retired entries and in
  `SECURITY.md`, and opened [F21](backlog-retired.md#f21).

**Phase 10, the documentation restructure, is complete**: its [plan](documentation/phase-10-plan.md),
at Revision 8, and its retrospect,
[`documentation/phase-10-summary.md`](documentation/phase-10-summary.md), are design records, and it
shipped as `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms` 0.6.1, docs-only patches tagged
at 5b9c859 and published 2026-10-22. It was paused after its step 2 while the A35 plan ran to its
end, so that 0.13.0, which closes the route through `this`, shipped first.
- Step 1 is done: the ten stale documents are deleted, and the `qs` override's reason is in F16.
- Step 2 is done: `SECURITY.md` is rewritten to what the code does, and a case in `eval-core`'s
  `public-api.spec.ts` resolves every identifier it names. That step opened A35, from its review,
  and F20.
- Step 3 is done: `eval-core`'s README is the package's whole documentation, with the root
  README's API sections moved into it and every `javascript` block executed. The root README keeps
  its copy until step 5. It shipped in `eval-core` 0.13.1. Its review opened
  [F22](backlog-retired.md#f22), scheduled into step 5.
- Step 4 is done: the `eval-signals` and `eval-forms` READMEs open as `eval-core`'s does, with
  Install, Sibling packages and Security, and a case in each project's `public-api.spec.ts` checks
  every peer range its README quotes against its manifest. It shipped in `eval-signals` 0.6.1 and
  `eval-forms` 0.6.1. Its sweeps for language that claims a guarantee opened
  [F23](backlog-retired.md#f23): the root README's lines were scheduled into step 5, and one line
  of `eval-core`'s README was not scheduled.
- Step 5 is done: the root README is a landing page, with no code and no quoted peer range, and a
  case in `eval-core`'s `public-api.spec.ts` keeps it that way. The root-README cases that a README
  with no code makes vacuous or red are removed. It retired F22 and F23, and opened [F24](backlog-retired.md#f24),
  queued after the phase. F23's `eval-core` README line was
  added to the step at its gate, so the step shipped that one correction in `eval-core` 0.13.1, and
  nothing else.
- Step 6 is done: [`docs/README.md`](README.md) is the maintainers' index, reached from
  `CONTRIBUTING.md`, and `ROADMAP.md` is condensed to one table of the phases. It retired
  [F19](backlog-retired.md#f19), and opened [F25](backlog-retired.md#f25) from the plan's § 8 q4, queued after the
  phase with F21 and F24.
- Step 7 is done: the release commit for `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms`
  0.6.1, docs-only patches with no peer range moved. Every built `.d.ts` is byte-identical to the
  published 0.13.0 / 0.6.0 / 0.6.0 tarball's, and every built README is the repository's.
- Step 8 is done: the three are published, in the order `eval-core` → `eval-signals` → `eval-forms`,
  and tagged annotated at 5b9c859. Each published README is the repository's, and none sends its
  reader to the repository README. The step recorded the release, wrote the retrospect, and widened
  [F25](backlog-retired.md#f25) with the plan's § 8 q3, which the phase left undecided.

**Nothing is in flight, no plan is active, and nothing is queued.** [A45](#a45)'s part 2 waits on a
plan. [F20](backlog-retired.md#f20), [F21](backlog-retired.md#f21),
[F24](backlog-retired.md#f24) and [F25](backlog-retired.md#f25) are fixed, and ship in no package; F21's toolchain bump left one
`overrides.nx` entry, `undici`, which [F16](#f16) part 2 holds.

`eval-core` 0.13.3 is released alone, a patch, tagged at 021d5e4 and published 2026-10-23. It
carries A45 part 1 only. Its `.d.ts` is SHA-256-identical to 0.13.2's, and it is inside
`eval-signals`' and `eval-forms`' `>=0.13.0 <0.14.0`, so neither downstream package released.

The A40/A41 batch is released as `eval-core` 0.13.2, alone, a patch, tagged at dc4302d and
published 2026-10-22. It carries [A40](backlog-retired.md#a40), [A41](backlog-retired.md#a41),
[A43](backlog-retired.md#a43) and [A46](backlog-retired.md#a46), and opened [A44](#a44), A45 and
[A47](#a47). Its `.d.ts` is byte-identical to 0.13.1's, and no peer range moved, so neither
downstream package released.

Phase 9, colon-joined identifiers, is complete: its
[plan](colon-identifiers/phase-9-plan.md), at Revision 9, and its retrospect,
[`colon-identifiers/phase-9-summary.md`](colon-identifiers/phase-9-summary.md), are design records,
and it shipped as `eval-core` 0.12.0, `eval-signals` 0.5.1 and `eval-forms` 0.5.0, tagged at
3466c80. It fixed [A26](backlog-retired.md#a26), opened [A34](#a34) and narrowed [D13](#d13). The
corpus stays synthetic until real expressions arrive as data; the plan's § 8 q1, q2 and q4 wait on
them. `eval-core` 0.11.1, with the [A29](backlog-retired.md#a29) and
[A31](backlog-retired.md#a31) fixes, is published and tagged at 7ee65fc. Phase 5 is complete: its
[plan](signals/phase-5-plan.md), at Revision 5, and its retrospect,
[`signals/phase-5-summary.md`](signals/phase-5-summary.md), are design records, and it shipped as
`eval-signals` 0.5.0 and `eval-forms` 0.4.1, tagged at 577c4f0. The track before it,
"Track 3" ([`docs/gates/plan.md`](gates/plan.md)), is closed; its retrospect is
[`docs/gates/summary.md`](gates/summary.md).

### Status vocabulary

| Status | Meaning |
| ------ | ------- |
| **Open** | Live, nothing done, no workaround |
| **Contained** | The defect stands; a downstream workaround bounds its blast radius. Not a fix — the containment is somebody else's code, and it can be removed by a tidying edit |
| **Covered** | Pinned by a spec that asserts **current** behaviour. A fix must deliberately update that spec |
| **Premise retired** | The entry is live, but a claim it rested on has been measured false or answered. The work may have changed shape — read the entry before planning against it |
| **Retired** | No longer live. Kept with its reason |

### Publication status

All three packages are published to npm, so every behavioural entry below is a versioned
release, not a free change. Each package's release notes are in its own
`modules/<name>/CHANGELOG.md`. The root `CHANGELOG.md` points at them ([F2](backlog-retired.md#f2)).

| Package | Version | Notes |
| ------- | ------- | ----- |
| `@zvenigora/ng-eval-core` | 0.13.3 | [A45](#a45) part 1 fix: a logical assignment that short-circuits evaluates nothing more — `a \|\|= f()` with `a` truthy does not call `f`, nothing is written, and a write policy or a refusal on the write path is not reached. Logical assignment is ES2021 and the default parser options, at `ecmaVersion: 2020`, refuse it at the parse, so the fix reaches only a caller whose own parser options set `ecmaVersion` to 2021 or later. A45's part 2 stays open. A patch: the `.d.ts` is SHA-256-identical to 0.13.2's, and the manifest differs in `version` only. Peer ranges unchanged; `eval-signals` 0.6.x and `eval-forms` 0.6.x admit it with `>=0.13.0 <0.14.0`, and neither releases. Tagged `eval-core@0.13.3` at 021d5e4, published 2026-10-23 (npm: 02:54 UTC) |
| `@zvenigora/ng-eval-core` | 0.13.2 | The A40/A41 batch. [A41](backlog-retired.md#a41) fix: an update converts its operand to a number once, natively, before anything is written, so `"5"++` gives `5` and writes `6` and a BigInt updates; [A40](backlog-retired.md#a40) closes with it, a postfix update of a listed function giving `NaN` and writing `NaN` where it threw after writing. [A43](backlog-retired.md#a43) fix: under `caseInsensitive`, an identifier write to a name the context resolves to nothing writes that name, not the key `undefined`. [A46](backlog-retired.md#a46) fix: a write that would rebind `undefined`, or under `caseInsensitive` a spelling of a literal, throws `Assignment to read-only name`, unless a scope binds the name or the context resolves it to a value other than `undefined`; a context class that overrides `set` decides these writes itself. `SECURITY.md` is corrected: the refusal of `obj.fetch = 1` is the read's, and no write path refuses overwriting a listed function. The README's `AssignmentExpression` row gains the new throw, and states a limit of `caseInsensitive` on `new EvalContext`. A patch: the `.d.ts` is SHA-256-identical to 0.13.1's, and the manifest differs in `version` only. Peer ranges unchanged; `eval-signals` 0.6.x and `eval-forms` 0.6.x admit it with `>=0.13.0 <0.14.0`, and neither releases. Tagged `eval-core@0.13.2` at dc4302d, published 2026-10-22 (npm: 23:27 UTC) |
| `@zvenigora/ng-eval-core` | 0.13.1 | Phase 10 ([plan](documentation/phase-10-plan.md)): the package README is the package's whole documentation. The repository README's API sections are moved into it, every `javascript` block in it is executed by a case, it opens with Install, Sibling packages and Security, and every peer range it quotes is checked against the manifest. Its evaluation section states the built-ins precisely ([F23](backlog-retired.md#f23)). 0.13.0's README sent its reader to the repository README, which has documented no API since Phase 10's step 5. A docs-only patch: the `.d.ts` is byte-identical to 0.13.0's, and the manifest differs in `version` only. Peer ranges unchanged; `eval-signals` 0.6.x and `eval-forms` 0.6.x admit it with `>=0.13.0 <0.14.0`. Tagged `eval-core@0.13.1` at 5b9c859, published 2026-10-22 (npm: 00:36 UTC) |
| `@zvenigora/ng-eval-signals` | 0.6.1 | Phase 10 ([plan](documentation/phase-10-plan.md)): the README opens as `eval-core`'s does, with Install, Sibling packages and Security, and quotes each peer range verbatim, where 0.6.0 abbreviated `@angular/core`'s; a case checks every quoted range against the manifest. It points to `eval-core`'s README for expression syntax and the evaluator's options, where 0.6.0 pointed to the repository README. A docs-only patch: the `.d.ts` is byte-identical to 0.6.0's, and the manifest differs in `version` only. Peer ranges unchanged; `eval-forms` 0.6.x admits it with `>=0.6.0 <0.7.0`. Tagged `eval-signals@0.6.1` at 5b9c859, published 2026-10-22 (npm: 00:40 UTC) |
| `@zvenigora/ng-eval-forms` | 0.6.1 | Phase 10 ([plan](documentation/phase-10-plan.md)): the README opens as the other two do, Install quotes each peer range verbatim, and a case checks every quoted range against the manifest. It points to `eval-core`'s README in place of the repository README, and no longer calls the evaluator sandboxed, which is [F23](backlog-retired.md#f23)'s class. A docs-only patch: all three `.d.ts` files are byte-identical to 0.6.0's, and the manifest differs in `version` only. Peer ranges unchanged. Tagged `eval-forms@0.6.1` at 5b9c859, published 2026-10-22 (npm: 00:42 UTC) |
| `@zvenigora/ng-eval-core` | 0.13.0 | The [A35 plan](a35/plan.md)'s second release, which closes the route through `this` in both halves. [A39](backlog-retired.md#a39) fix: `this` evaluates only as the object of a member access and throws anywhere else; every receiver the evaluator resolves from the context — a bare call's, a bare tag's, `this.fn()`'s for a key the context resolves — is a guarded view on which `push` and `pop` act on the real context and every other read throws. [A42](backlog-retired.md#a42) fix: a write whose target is an `EvalContext` is refused by class, the methods the evaluator calls are taken from the class, and a context reached as data is refused. With them [A35](backlog-retired.md#a35)'s last route is closed. A host container, a context the host nests in the data or returns behind a promise, the trace after `this.k` and a host-built AST reusing one `this` node stay documented limits in every version. A minor carrying breaking changes: the `.d.ts` is byte-identical to 0.12.1's. Peer ranges unchanged. Admitted only by `eval-signals` 0.6.0 and `eval-forms` 0.6.0; every earlier one excludes it by its own range. The advisory follows this release (the plan's § 5 U3). Tagged `eval-core@0.13.0` at f7f27f7, published 2026-10-20 (npm: 20:52 UTC) |
| `@zvenigora/ng-eval-signals` | 0.6.0 | `eval-core` 0.13.0's [A39](backlog-retired.md#a39) fix, forwarded: a source function's `this` is a guarded view of the `EvalContext` rather than the context, so `push` and `pop` still reach it and nothing else does, and `this` evaluates only as a member's object. The two `signal-context` pins that asserted the receiver's identity are rewritten to the guard's contract; the suite stays at 438. A breaking minor with no shipped code changed: the `.d.ts` is byte-identical to 0.5.1's. Peer range on `eval-core` moved to `>=0.13.0 <0.14.0` — the floor rises, since the forwarded contract exists only in 0.13.0. Tagged `eval-signals@0.6.0` at f7f27f7, published 2026-10-20 (npm: 20:55 UTC) |
| `@zvenigora/ng-eval-forms` | 0.6.0 | `eval-core` 0.13.0's [A39](backlog-retired.md#a39) fix, forwarded at both entry points: a rule cannot reach its evaluation context through `this`, and a function the context holds receives a guarded view. The three [D5](backlog-retired.md#d5) pins take the rule's context where it is built rather than through `this`; the suite stays at 375. A breaking minor with no shipped code changed: all three `.d.ts` files are byte-identical to 0.5.0's. Peer ranges raised: `eval-core` to `>=0.13.0 <0.14.0`, and `eval-signals` to `>=0.6.0 <0.7.0`, since every earlier `eval-signals` requires `eval-core` below 0.13.0. Tagged `eval-forms@0.6.0` at f7f27f7, published 2026-10-20 (npm: 20:57 UTC) |
| `@zvenigora/ng-eval-core` | 0.12.1 | The [A35 plan](a35/plan.md)'s first release: partial hardening that does not close every route, with `SECURITY.md` leading with the mitigations. [A36](backlog-retired.md#a36) fix: a tagged template's tag goes through the call sandbox and the write policy, and a member tag's `this` is its object. [A35](backlog-retired.md#a35), which 0.12.1 left open: a dangerous function value is refused by its value at the call, `new` and tag sites, and at every other read the walk makes but `typeof`'s operand. Two routes past the walk's own values stayed open in 0.12.1, a container the host provides and a route through `this` ([A39](backlog-retired.md#a39)), the second closed in 0.13.0. [A37](backlog-retired.md#a37) fix: a sequence leaves one value on the stack and shows one node to hooks. Every published version to 0.12.0 is affected. A patch although a read of a dangerous function now throws: the `.d.ts` is byte-identical to 0.12.0's. Peer ranges unchanged; `eval-signals` 0.5.1 (`>=0.11.0 <0.13.0`) and `eval-forms` 0.5.0 (`>=0.12.0 <0.13.0`) admit it. No advisory is published for it: one follows 0.13.0. Tagged `eval-core@0.12.1` at 7cc8d30, published 2026-10-17 (npm: 13:49 UTC) |
| `@zvenigora/ng-eval-core` | 0.12.0 | Phase 9 ([plan](colon-identifiers/phase-9-plan.md)): `ParserOptions.colonIdentifiers` and `provideColonIdentifiers()`, opt-in — a colon-joined name such as `Q1:1:3` parses as one `Identifier` whose `name` is the key; with the option off, the default, a parse is acorn's own. `CompilerService` keys a compiled string on the options its parse uses. [A26](backlog-retired.md#a26) fix: `ParserService` serves a cached AST only to a parse whose parse-relevant options match the one that cached it, and a parse carrying an acorn callback or `program` bypasses the cache; every published version to 0.11.1 is affected. A minor: no exported symbol changes shape, and the `.d.ts` differs from 0.11.1 by the two additions, their `EnvironmentProviders` import, documentation comments and a private member each on `ParserService` and `CompilerService`. Peer ranges unchanged, `acorn ^8.11.2` included, tested at 8.11.2 (the plan's § 8 q3). `eval-signals` 0.5.1 and `eval-forms` 0.5.0 admit it; `eval-signals` 0.4.0–0.5.0 and `eval-forms` 0.4.x declare `>=0.11.0 <0.12.0` and do not. Tagged `eval-core@0.12.0` at 3466c80, published 2026-10-14 (npm: 01:06 UTC) |
| `@zvenigora/ng-eval-signals` | 0.5.1 | Phase 9 ([plan](colon-identifiers/phase-9-plan.md)): `createEvalSignalAsync`'s `abortSignalKey` refusal says the key must be a plain identifier, and that a colon-joined name is refused even under `eval-core`'s `colonIdentifiers`; what is refused is unchanged. A patch: the `.d.ts` differs from 0.5.0 in the `abortSignalKey` documentation comment only. Peer range on `eval-core` widened to `>=0.11.0 <0.13.0`, which admits 0.12.0; the floor is unchanged, since nothing here needs 0.12. Tagged `eval-signals@0.5.1` at 3466c80, published 2026-10-14 (npm: 01:09 UTC) |
| `@zvenigora/ng-eval-forms` | 0.5.0 | Phase 9 ([plan](colon-identifiers/phase-9-plan.md)): `/signals`' `ExpressionRuleOptions.colonIdentifiers`, and `/reactive` follows `eval-core`'s `provideColonIdentifiers()`, its bind-time check parsing a rule as its compile does. [D13](#d13) narrowed: a rule that parses as a top-level label, which rendered blank, is refused at registration at both entry points. A breaking minor: the three `.d.ts` files differ from 0.4.1's by `ExpressionRuleOptions.colonIdentifiers` and documentation comments. Peer ranges raised: `eval-core` to `>=0.12.0 <0.13.0`, which adds the option `/signals` passes it, and `eval-signals` to `>=0.5.1 <0.6.0`, since every earlier `eval-signals` requires `eval-core` below 0.12.0. Tagged `eval-forms@0.5.0` at 3466c80, published 2026-10-14 (npm: 01:13 UTC) |
| `@zvenigora/ng-eval-core` | 0.11.1 | [A29](backlog-retired.md#a29) fix: `CompilerService` compiles an AST on every call and caches none, so two ASTs of one type and span no longer share a compiled function; a string is cached as before. [A31](backlog-retired.md#a31) fix: the case-insensitive property cache is keyed by the object itself, so under `caseInsensitive` a member read no longer resolves another object's spelling, and a case variant of a blocked name is refused rather than read as `undefined`; a regression table pins the 15 spellings refused after a colliding entry. Both caches came in with 0.2.1, so every version from it to 0.11.0 is affected. [A28](backlog-retired.md#a28): `scoped`'s documentation comments say every scope on the stack counts. A patch: the `.d.ts` differs from 0.11.0 in documentation comments only. Peer ranges unchanged; `eval-signals` 0.4.0–0.5.0 and `eval-forms` 0.4.x already admit it with `>=0.11.0 <0.12.0`, so their users get both fixes on install. Tagged `eval-core@0.11.1` at 7ee65fc, published 2026-10-10 (npm: 23:40 UTC) |
| `@zvenigora/ng-eval-signals` | 0.5.0 | Phase 5 ([plan](signals/phase-5-plan.md)): `createEvalSignalAsync`, `EvalSignalAsync`, `EvalSignalAsyncOptions`, `EvalSignalStatus` and `EvalSignalService.createAsync`. A minor, additions only: the `.d.ts` differs from 0.4.0 by those and their documentation comments. Peer ranges unchanged. Tested at Angular 19.2, 20.3, 21.2 and 22.2 (the plan's § 8 q1). [C6](backlog-retired.md#c6) retired by its README, which gives the `resource` composition for Angular 19 too. Tagged `eval-signals@0.5.0` at 577c4f0, published 2026-10-10 (npm: 02:07 UTC) |
| `@zvenigora/ng-eval-forms` | 0.4.1 | Peer range on `eval-signals` widened to `>=0.4.0 <0.6.0`, which admits 0.5.0; no code changes. A patch: all three `.d.ts` files byte-identical to 0.4.0's. The README's "Anything asynchronous" bullet names `eval-signals`' `createEvalSignalAsync`, and its quoted peer range follows the manifest. Tagged `eval-forms@0.4.1` at 577c4f0, published 2026-10-10 (npm: 02:15 UTC) |
| `@zvenigora/ng-eval-core` | 0.11.0 | [B6](backlog-retired.md#b6) fix, advisory [GHSA-jh43-xc7j-93c2](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-jh43-xc7j-93c2), as in 0.10.1: an identifier, `this.k` or a member of an `EvalScope` in the context refuses a name on the prototype-pollution blocklist before any lookup. [C4](backlog-retired.md#c4)/[C5](backlog-retired.md#c5): a context that implements `checkMemberWrite` is also asked before a built-in method writes into what it is handed, called directly or through `call`, `apply` or `bind`. [B5](backlog-retired.md#b5): seventeen unused exports removed. A breaking minor: the `.d.ts` loses the seventeen, gains `EvalMemberWrite.method`, and otherwise differs from 0.10.1 in documentation comments only. Peer ranges unchanged. Tagged `eval-core@0.11.0` at 776885a, published 2026-10-07 (npm: 00:59 UTC) |
| `@zvenigora/ng-eval-signals` | 0.4.0 | [C4](backlog-retired.md#c4) fix: a built-in method that would write into anything the expression did not create throws `SignalContextWriteError` with `kind` `'method'`, called directly or through `call`, `apply` or `bind` ([C5](backlog-retired.md#c5)); what it created stays writable. A breaking minor: `kind` and the constructor's `kind` parameter widen to `'key' \| 'member' \| 'method'`, and the `.d.ts` otherwise differs from 0.3.0 in documentation comments only. Peer range `>=0.11.0 <0.12.0`, which brings `eval-core`'s [B6](backlog-retired.md#b6) fix. Tagged `eval-signals@0.4.0` at 776885a, published 2026-10-07 (npm: 01:47 UTC) |
| `@zvenigora/ng-eval-forms` | 0.4.0 | [C4](backlog-retired.md#c4) by consequence: a rule's call of a built-in method that would write into the form's data throws `SignalContextWriteError` with `kind` `'method'`, in both adapters, called directly or through `call`, `apply` or `bind` ([C5](backlog-retired.md#c5)). A breaking minor with no code change: `/reactive`'s and `/signals`' `.d.ts` are byte-identical to 0.3.1's, and the core entry point's differs in `guardIdentifiers`'s documentation comment only. Peer ranges: `eval-core` `>=0.11.0 <0.12.0`, which brings its [B6](backlog-retired.md#b6) fix to rule evaluation, and `eval-signals` `>=0.4.0 <0.5.0`. Tagged `eval-forms@0.4.0` at 776885a, published 2026-10-07 (npm: 01:58 UTC) |
| `@zvenigora/ng-eval-core` | 0.10.1 | [B6](backlog-retired.md#b6) fix, advisory [GHSA-jh43-xc7j-93c2](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-jh43-xc7j-93c2): a security patch on the 0.10 line. An identifier, `this.k` or a member of an `EvalScope` in the context refuses a name on the prototype-pollution blocklist before any lookup, and under `caseInsensitive` a matched key that is one; a context key with such a name can no longer be read. Every published version to 0.10.0 is affected. A patch: the `.d.ts` is byte-identical to 0.10.0, and the peer ranges are unchanged; `eval-signals` 0.3.0 and `eval-forms` 0.3.x admit it. Tagged `eval-core@0.10.1` at d77fa16, published 2026-10-07 (npm: 00:45 UTC) |
| `@zvenigora/ng-eval-forms` | 0.3.1 | [D5](backlog-retired.md#d5) fix: a rule's context carries no dead lookups, so each identifier makes one resolver call at both entry points, where `/signals` made three and `/reactive` two. [D3](backlog-retired.md#d3) fix: a per-registration `caseInsensitive` reaches the rule's context and the key memo as well as the walk. The README's `/signals` section links a worked example, [`docs/forms/worked-example-signals.md`](forms/worked-example-signals.md) ([D11](backlog-retired.md#d11)). A patch: the `.d.ts` differs from 0.3.0 in three documentation comments only. Peer ranges unchanged. Tagged `eval-forms@0.3.1` at 3d56994, published 2026-10-04 (npm: 19:04 UTC) |
| `@zvenigora/ng-eval-core` | 0.10.0 | An opt-in member-write policy: `EvalContext.checkMemberWrite?`, an optional method, and the new `EvalMemberWrite`; a context that does not implement it is unchanged. Fixes: a regex literal is a new `RegExp` on each evaluation, a hole in an array pattern keeps its position, and a member write assigns, so setters run ([A23](backlog-retired.md#a23)). A minor: the `.d.ts` changes by additions only — those two and `EvalState`'s `createdObjects` getter, marked `@internal` — besides documentation comments. Tagged `eval-core@0.10.0` at 0c3299e, published 2026-10-04 (npm: 02:01 UTC) |
| `@zvenigora/ng-eval-signals` | 0.3.0 | [C1](backlog-retired.md#c1) fix: a member write into anything the expression did not create throws `SignalContextWriteError`; what it created stays writable. A breaking minor. Adds `SignalContextWriteError.kind`, `'key'` or `'member'`, through an optional fourth constructor parameter; the `.d.ts` otherwise differs from 0.2.1 in documentation comments only. Peer range `>=0.10.0 <0.11.0`: the guard needs `EvalContext.checkMemberWrite`. Tagged `eval-signals@0.3.0` at 0c3299e, published 2026-10-04 (npm: 02:04 UTC) |
| `@zvenigora/ng-eval-forms` | 0.3.0 | [C1](backlog-retired.md#c1) by consequence: a rule's member write into the form's data throws `SignalContextWriteError`, in both adapters. [D2](backlog-retired.md#d2) fix: `/reactive` refuses an identifier off `Object.prototype` at bind time, as `/signals` does. [D1](backlog-retired.md#d1) fix: a control added later under such a name, or a nested `FormGroup` or `FormArray` added or swapped in later, is refused rather than mirrored, and reported once. A breaking minor. Adds `guardIdentifiers` at the core entry point; the `.d.ts` otherwise differs from 0.2.7 in documentation comments only. Peer ranges: `eval-core` `>=0.10.0 <0.11.0`, `eval-signals` `>=0.3.0 <0.4.0`. Tagged `eval-forms@0.3.0` at 0c3299e, published 2026-10-04 (npm: 02:12 UTC) |
| `@zvenigora/ng-eval-core` | 0.9.0 | [B1](backlog-retired.md#b1) fix: a string, number or boolean receiver is refused `constructor`, `__proto__`, `prototype` and the four accessor definers; `toString` and its five kin stay readable. A breaking minor with no exported symbol changing shape — the `.d.ts` is byte-identical to 0.8.0 — but an expression that read one of those seven names off a primitive now throws. Tagged `eval-core@0.9.0` at eb403c0, published 2026-10-03 (npm: 00:58 UTC) |
| `@zvenigora/ng-eval-signals` | 0.2.1 | Peer range widened to `>=0.3.0 <0.10.0`; no code in the package changes. `.d.ts` byte-identical to 0.2.0. Tagged `eval-signals@0.2.1` at eb403c0, published 2026-10-03 (npm: 01:01 UTC) |
| `@zvenigora/ng-eval-forms` | 0.2.7 | Peer range widened: `eval-core` to `>=0.3.0 <0.10.0`; `eval-signals` stays `>=0.1.0 <0.3.0`, which admits 0.2.1. No code changes; `.d.ts` byte-identical to 0.2.6. Tagged `eval-forms@0.2.7` at eb403c0, published 2026-10-03 (npm: 01:04 UTC) |
| `@zvenigora/ng-eval-core` | 0.8.0 | [A4](backlog-retired.md#a4)/[A10](backlog-retired.md#a10) fix: `EvalContext.getKey` resolves through `get`'s own chain. A breaking minor with no exported symbol changing shape — the `.d.ts` differs from 0.7.0 in documentation comments only — but `getKey`'s answers change, and with them read-hook keys and, under `caseInsensitive`, the key the write visitors assign to. Tagged `eval-core@0.8.0` at c56f987, published 2026-10-02 (npm: 12:31 UTC) |
| `@zvenigora/ng-eval-signals` | 0.2.0 | [C3](backlog-retired.md#c3) fix: under `caseInsensitive` a source key is named as the source spells it, in `getKey`, `SignalContextWriteError.key` and the first segment of `dependencies`. A breaking minor; the `.d.ts` differs from 0.1.4 in two JSDoc blocks only. Peer range widened to `>=0.3.0 <0.9.0`. Tagged `eval-signals@0.2.0` at c56f987, published 2026-10-02 (npm: 12:36 UTC) |
| `@zvenigora/ng-eval-forms` | 0.2.6 | Peer ranges widened: `eval-core` to `>=0.3.0 <0.9.0`, `eval-signals` from `^0.1.0` to `>=0.1.0 <0.3.0`. No code changes; `.d.ts` byte-identical to 0.2.5. Tagged `eval-forms@0.2.6` at c56f987, published 2026-10-02 (npm: 12:41 UTC) |
| `@zvenigora/ng-eval-core` | 0.7.0 | [A1](backlog-retired.md#a1)/[A2](backlog-retired.md#a2)/[A5](backlog-retired.md#a5)/[A6](backlog-retired.md#a6)/[A7](backlog-retired.md#a7) fixes and the [E5](backlog-retired.md#e5) README note. A breaking minor with no exported symbol changing shape — the `.d.ts` differs from 0.6.1 in documentation comments only — but caught errors are rethrown rather than rewrapped, three silent outcomes now throw, and `thisArg` is applied. `LICENSE` now ships in the package. Tagged `eval-core@0.7.0` at 724d831, published 2026-10-01 (npm: 23:07 UTC) |
| `@zvenigora/ng-eval-signals` | 0.1.4 | Peer range widened to `>=0.3.0 <0.8.0`; no code in the package changes. The `.d.ts` differs from 0.1.3 by the one `ɵprov` line Angular 22.1 generates; `LICENSE` and `CHANGELOG.md` now ship in the package. Tagged `eval-signals@0.1.4` at 724d831, published 2026-10-01 (npm: 23:09 UTC) |
| `@zvenigora/ng-eval-forms` | 0.2.5 | Peer range widened to `>=0.3.0 <0.8.0`. `.d.ts` byte-identical to 0.2.4; `LICENSE` now ships in the package. Tagged `eval-forms@0.2.5` at 724d831, published 2026-10-01 (npm: 23:10 UTC) |
| `@zvenigora/ng-eval-core` | 0.6.1 | [F5](backlog-retired.md#f5)/[B3](backlog-retired.md#b3) fixes: the `js-sha256` peer range widened to admit 1.0.0, and the parser-cache `console.debug` deleted. No symbol added or changed; `CHANGELOG.md` now ships in the package. Tagged `eval-core@0.6.1` at 587ebf1, published 2026-09-30 (npm: 04:06 UTC) |
| `@zvenigora/ng-eval-forms` | 0.2.4 | [D6](backlog-retired.md#d6)/[D4](backlog-retired.md#d4) fixes: `/signals` resolves number keys and calls a top-level signal value, as `createSignalContext` does. `.d.ts` byte-identical to 0.2.3; `CHANGELOG.md` now ships in the package. Tagged `eval-forms@0.2.4` at 587ebf1, published 2026-09-30 (npm: 04:05 UTC) |
| `@zvenigora/ng-eval-core` | 0.6.0 | [A8](backlog-retired.md#a8)/[A12](backlog-retired.md#a12)/[A20](backlog-retired.md#a20)/[A21](backlog-retired.md#a21)/[B3](backlog-retired.md#b3) fixes — [A8](backlog-retired.md#a8) is the headline, and the only one withdrawing published behaviour (`EvalService.ngOnDestroy` no longer drains). Tagged `eval-core@0.6.0` at f26f987, published 2026-09-26 |
| `@zvenigora/ng-eval-signals` | 0.1.3 | Peer range widened to `>=0.3.0 <0.7.0`; also updates the `createEvalSignal` / `EvalSignalService` JSDoc (ships in the `.d.ts`) for `eval-core` 0.6.0. Tagged `eval-signals@0.1.3` at f26f987, published 2026-09-26 |
| `@zvenigora/ng-eval-forms` | 0.2.3 | Peer range widened to `>=0.3.0 <0.7.0`; the range is the whole of the release. Tagged `eval-forms@0.2.3` at f26f987, published 2026-09-26 |
| `@zvenigora/ng-eval-core` | 0.5.0 | A11 fix: object destructuring binding. Tagged `eval-core@0.5.0` 2026-09-17, at `016a313` |
| `@zvenigora/ng-eval-core` | 0.4.0 | Phase 2, statements. Tagged `eval-core@0.4.0` 2026-09-16, at `7935a78` — [F8](backlog-retired.md#f8) |
| `@zvenigora/ng-eval-signals` | 0.1.2 | The `eval-core` 0.5.0 ([A11](backlog-retired.md#a11)) release: peer range only. Tagged `eval-signals@0.1.2` 2026-09-17, at `016a313` — [F8](backlog-retired.md#f8) |
| `@zvenigora/ng-eval-signals` | 0.1.1 | Phase 2 step 7: peer range only. Tagged `eval-signals@0.1.1` 2026-09-16, at `7935a78` — [F8](backlog-retired.md#f8) |
| `@zvenigora/ng-eval-forms` | 0.2.2 | The `eval-core` 0.5.0 ([A11](backlog-retired.md#a11)) release: peer range only. Tagged `eval-forms@0.2.2` 2026-09-17, at `016a313` — [F8](backlog-retired.md#f8) |
| `@zvenigora/ng-eval-forms` | 0.2.1 | Phase 2 step 7: peer range only. Tagged `eval-forms@0.2.1` 2026-09-16, at `7935a78`; `@0.2.0` tagged the same day — [F8](backlog-retired.md#f8) |

**587ebf1 is not the release commit.** The versions were bumped in 01a2c30, and CI on it was red:
[D12](backlog-retired.md#d12)'s injector-path memory cases were timing-dependent. The test-only
587ebf1 removed them, CI went green on it, and it is what was built, tagged and published. Between
the two commits only that spec and two backlog files changed, so neither package's build differs.

**d77fa16 is not on master.** 0.10.1 was built from the `security-0.10.1` branch, cut from 0.10.0's
0c3299e, so it carries B6's fix and none of 0.11.0's other changes. Master has the fix as 1a6ebdc,
and 776885a copied the [0.10.1] CHANGELOG section from d77fa16.

**Every published version now carries a tag** — the forty-three above (one at 021d5e4, one at dc4302d, three at 5b9c859, three at f7f27f7, one at 7cc8d30, three at 3466c80, one at 7ee65fc, two at 577c4f0, three at 776885a, one at d77fa16, one at 3d56994, three at 0c3299e, three at eb403c0, three at c56f987, three at 724d831, two at 587ebf1, three at f26f987,
three at `016a313`, three at `7935a78`) plus ten for versions before this table: seven written
retroactively on 2026-09-16, and three at their own release on 2026-08-22 (`eval-core@0.3.0`,
`eval-signals@0.1.0`, `eval-forms@0.1.0`). That is fifty-three, the count `tools/release-tags.mjs`
reports, all annotated and all on the remote. `git tag -l` lists three more, `v0.1.0`, `v0.2.2`
and `v0.2.3`: lightweight tags from before the `<project>@<version>` names.

### Register history

How the live count has moved from one release to the next. The register opened on 2026-09-07
(`ef5ac2b`) with 46 entries, 42 of them live; R1–R4 were recorded already retired.

| Release | Tag commit | Published | Live before | Opened | Closed | Live after |
| ------- | ---------- | --------- | ----------: | ------ | ------ | ---------: |
| `eval-core` 0.4.0, `eval-signals` 0.1.1, `eval-forms` 0.2.1 | `7935a78` | 2026-09-16 | 42 | 9: A10, A11, A12, F9–F14 | 9: A9, B2, D10, E6, F1, F3, F4, F12, F14 | 42 |
| `eval-core` 0.5.0, `eval-signals` 0.1.2, `eval-forms` 0.2.2 | `016a313` | 2026-09-17 | 42 | 2: A13, A14 | 3: A11, A13, A14 | 41 |
| `eval-core` 0.6.0, `eval-signals` 0.1.3, `eval-forms` 0.2.3 | `f26f987` | 2026-09-26 | 41 | 8: A15–A17, A19–A22, F15 | 8: A8, A12, A16, A17, A20–A22, F15 | 41 |
| `eval-core` 0.6.1, `eval-forms` 0.2.4 | `587ebf1` | 2026-09-30 | 41 | 1: F16 | 12: A3, B3, B4, D4, D6, D9, D12, F2, F5, F6, F9, F13 | 30 |
| `eval-core` 0.7.0, `eval-signals` 0.1.4, `eval-forms` 0.2.5 | `724d831` | 2026-10-01 | 30 | 0 | 6: A1, A2, A5, A6, A7, E5 | 24 |
| `eval-core` 0.8.0, `eval-signals` 0.2.0, `eval-forms` 0.2.6 | `c56f987` | 2026-10-02 | 24 | 0 | 3: A4, A10, C3 | 21 |
| `eval-core` 0.9.0, `eval-signals` 0.2.1, `eval-forms` 0.2.7 | `eb403c0` | 2026-10-03 | 21 | 0 | 1: B1 | 20 |
| `eval-core` 0.10.0, `eval-signals` 0.3.0, `eval-forms` 0.3.0 | `0c3299e` | 2026-10-04 | 20 | 2: A23, C4 | 6: A23, C1, C2, D1, D2, F11 | 16 |
| `eval-forms` 0.3.1 | `3d56994` | 2026-10-04 | 16 | 1: B5 | 5: D3, D5, D11, F8, F10 | 12 |
| `eval-core` 0.10.1 and 0.11.0, `eval-signals` 0.4.0, `eval-forms` 0.4.0 | `776885a` | 2026-10-07 | 12 | 2: B6, C5 | 5: F7, B5, C4, B6, C5 | 9 |
| `eval-signals` 0.5.0, `eval-forms` 0.4.1 | `577c4f0` | 2026-10-10 | 9 | 9: A24–A28, C6, C7, F17, F18 | 1: C6 | 17 |
| `eval-core` 0.11.1 | `7ee65fc` | 2026-10-10 | 17 | 6: A29–A32, D13, F19 | 5: A28, C7, F18, A29, A31 | 18 |
| `eval-core` 0.12.0, `eval-signals` 0.5.1, `eval-forms` 0.5.0 | `3466c80` | 2026-10-14 | 18 | 2: A33, A34 | 1: A26 | 19 |
| `eval-core` 0.12.1 | `7cc8d30` | 2026-10-17 | 19 | 8: A35–A41, F20 | 2: A36, A37 | 25 |
| `eval-core` 0.13.0, `eval-signals` 0.6.0, `eval-forms` 0.6.0 | `f7f27f7` | 2026-10-20 | 25 | 1: A42 | 3: A35, A39, A42 | 23 |
| `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1 | `5b9c859` | 2026-10-22 | 23 | 5: F21–F25 | 3: F19, F22, F23 | 25 |
| `eval-core` 0.13.2 | `dc4302d` | 2026-10-22 | 25 | 5: A43–A47 | 4: A40, A41, A43, A46 | 26 |
| `eval-core` 0.13.3. A45 part 1 closed with it, a part, so A45 stays live; F20 and F24 ship in no package | `021d5e4` | 2026-10-23 | 26 | 0 | 2: F20, F24 | 24 |
| *Unreleased*. F21 and F25 ship in no package | — | — | 24 | 0 | 2: F21, F25 | 22 |
| **Since the register opened** | | | **42** | **61** | **81** | **22** |

**How a row is counted.** Each row compares the index at the previous row's commit (the first, at
`ef5ac2b`) with the index at that release's tag commit. *Live* is a Status that starts with Open,
Contained, Covered or Premise retired, as in the vocabulary above. *Opened* is every ID new to the
index. *Closed* is every ID that was live, or newly opened, and is not live at the tag, so an entry
opened and closed between two releases counts in both columns, and *before + opened − closed =
after* holds on every row. A closure counts in the interval it was recorded in, which is not
always the release that shipped it: a test-only or documentation closure ships in no package, and
0.6.1's twelve include several of those.

**Adding a row.** Each release's post-publish commit adds its row, counted the same way
([`CONTRIBUTING.md`](../CONTRIBUTING.md), Releasing). The last row's *Live after* should equal the
count of live rows in the index at that commit; if it does not, the row is wrong. An *Unreleased*
row counts what has moved since the last release's tag; the next release's post-publish commit
makes it that release's row, with its tag commit and date.

---

## Index

| ID | Entry | Package | Kind | Status |
| -- | ----- | ------- | ---- | ------ |
| [A1](backlog-retired.md#a1) | `await-expression.ts` downgrades a sync throw to a promise rejection | core | fix | **Retired — fixed 2026-09-30**; released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831 |
| [A2](backlog-retired.md#a2) | `update-expression.ts` desyncs the value stack under `preserveParens` | core | fix | **Retired — fixed 2026-09-30**; released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831. Parentheses unwrapped, any other target throws |
| [A11](backlog-retired.md#a11) | `evaluateObjectPattern` resolves the *value* name against the argument — renaming **and** nested destructuring bind the wrong key | core | fix | **Retired — fixed, `eval-core` 0.5.0, 2026-09-17** |
| [A13](backlog-retired.md#a13) | An object rest element binds the whole source, not the remainder | core | fix | **Retired — fixed, `eval-core` 0.5.0, 2026-09-17**; found measuring [A11](backlog-retired.md#a11) |
| [A14](backlog-retired.md#a14) | A computed key in an object pattern is not evaluated — the identifier's spelling is used as the key | core | fix | **Retired — fixed, `eval-core` 0.5.0, 2026-09-17**; found by a spec written for [A11](backlog-retired.md#a11) |
| [A12](backlog-retired.md#a12) | `EvalResult.trace` grows per loop iteration — the iteration budget bounds time, not memory | core | fix / decision | **Retired — fixed 2026-09-23, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987 |
| [A19](#a19) | A12's fix shipped behind an exit criterion that could not detect its own named wrong implementation | core | decision | Open, **decided 2026-09-24: the Node-against-`dist` gate is not built now**; the entry lists what reverses it |
| [A15](#a15) | The per-walk trace reset, weighed and declined | core | decision | Open, **decided 2026-09-24: declined in general**; the entry lists what reopens it |
| [A16](backlog-retired.md#a16) | `EvalTraceItem.start` / `end` are declared and never set | core | decision | **Retired — documented as reserved 2026-09-24, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987 |
| [A17](backlog-retired.md#a17) | `EvalService.ngOnDestroy` drains under one `try`, so one throw skips the rest | core | fix | **Retired — fixed 2026-09-24, never released**; drains reordered, caller-owned last — [`docs/a8/plan.md`](a8/plan.md) step 1. **Subject gone 2026-09-25**: [A8](backlog-retired.md#a8)'s step 2 removed the drain before it shipped |
| [A20](backlog-retired.md#a20) | `EvalService._activeContexts` grows with every distinct `Registry` context | core | fix | **Retired — fixed 2026-09-24, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987; the field deleted — [`docs/a20/plan.md`](a20/plan.md). Contexts passed to `createState` released 2026-09-25 by [A8](backlog-retired.md#a8)'s step 2, which deleted the control case |
| [A21](backlog-retired.md#a21) | `EvalService.ngOnDestroy` empties the caller's own `Registry` contexts | core | fix | **Retired — fixed 2026-09-23, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987 — [`docs/a21/plan.md`](a21/plan.md). Its decision to keep the hook-registry clear **reversed 2026-09-25** by [A8](backlog-retired.md#a8)'s step 2 |
| [A22](backlog-retired.md#a22) | Five memory-leaks cases assert nothing about memory | core | test gap | **Retired — consolidated 2026-09-26**: one "destroy does not throw" guard kept, on the async case; the other four retitled to what they test |
| [A3](backlog-retired.md#a3) | `import-expression.ts` has a dead `afterVisitor` | core | fix | **Retired — fixed 2026-09-26**; released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1 — the FESM bundle loses the one line |
| [A4](backlog-retired.md#a4) | `EvalContext.getKey` — no namespace correction, and diverges from `get` | core | fix | **Retired — fixed 2026-10-01**, with [A10](backlog-retired.md#a10) as one defect; released 2026-10-02 in `eval-core` 0.8.0, tagged c56f987. `getKey` and `get` share one resolver |
| [A10](backlog-retired.md#a10) | `getKey`'s scopes step reports every key present against a plain-object scope | core | fix | **Retired — fixed 2026-10-01**, with [A4](backlog-retired.md#a4); released 2026-10-02 in `eval-core` 0.8.0, tagged c56f987 |
| [A5](backlog-retired.md#a5) | Service-layer entry points discard the error they caught — **12 sites, 4 services** | core | fix | **Retired — fixed 2026-09-30**; released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831. The original is rethrown |
| [A6](backlog-retired.md#a6) | `safeCall` destroys the class of any error thrown through a call | core | fix | **Retired — fixed 2026-09-30**; released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831. The original is rethrown; the "Function call error: " prefix is gone |
| [A7](backlog-retired.md#a7) | `EvalScopeOptions.thisArg` is documented and never applied — `getThis`'s `priorScopes` loop is dead, and `ns.fn()` never reaches it | core | decision, then fix | **Retired — decided and fixed 2026-09-30**; released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831. `thisArg` is the receiver for a method reached through a scope; a bare namespace still evaluates to the scope's object |
| [A8](backlog-retired.md#a8) | `EvalService._activeStates` grows unboundedly | core | fix | **Retired — fixed 2026-09-25, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987, in two steps: `simpleEval`'s states ([`docs/a8/plan.md`](a8/plan.md)), then the set deleted ([`docs/a8/step-2-plan.md`](a8/step-2-plan.md)). Withdraws the published destroy-time registry clear |
| [A9](backlog-retired.md#a9) | The arrow-scope leak's root cause — no `try`/`finally` at either push site | core | fix | **Retired — fixed**, Phase 2 step 0; released in `eval-core` 0.4.0 |
| [A23](backlog-retired.md#a23) | `safeSetProperty` defines the property instead of assigning it — setters never run, non-configurable properties cannot be written | core | decision, then fix | **Retired — decided and fixed 2026-10-03**; released 2026-10-04 in `eval-core` 0.10.0, tagged 0c3299e: a member write assigns, after the same refusals, so setters run |
| [A24](#a24) | An `await` is a pass-through — inside an `async` arrow it hands the walk a promise as an operand, and the arrow returns no promise | core | decision, then fix | Open — opened 2026-10-07 by the Phase 5 plan; the `eval-signals` README states it since 0.5.0 |
| [A25](#a25) | `awaitVisitor`'s timeout race — an uncleared 30 s timer per `await`, an undocumented `__awaitTimeout` key, and the caller's error mutated | core | fix | Open — opened 2026-10-07 by the Phase 5 plan |
| [A26](backlog-retired.md#a26) | The parse cache ignores parser options | core | fix | **Retired — fixed 2026-10-10**, as step 1 of the [Phase 9 plan](colon-identifiers/phase-9-plan.md); released 2026-10-14 in `eval-core` 0.12.0, tagged 3466c80. Keyed on the text and a fingerprint of the parse-relevant options; a callback or `program` bypasses the cache. `CompilerService`'s string cache is that plan's step 3. Affected every published `eval-core` to 0.11.1 |
| [A27](#a27) | A nested `evaluate` writes the enclosing walk's `EvalResult` — and `start()` clears nothing, so a reused state shows the last run's outcome | core | decision | Open — recorded, not scheduled; opened 2026-10-08 by Phase 5 step 1 |
| [A28](backlog-retired.md#a28) | `scoped` is documented as a scope pushed during this walk; the code asks the whole scope stack | core | docs | **Retired — fixed 2026-10-10**, documentation comments only; released 2026-10-10 in `eval-core` 0.11.1, tagged 7ee65fc. The `.d.ts` differs in four JSDoc blocks: every scope on the stack counts, whoever pushed it |
| [A29](backlog-retired.md#a29) | `CompilerService` keys a compiled AST by type, start, end and `toString()` — two ASTs of one type and span share a compiled function | core | fix | **Retired — fixed 2026-10-10**; released 2026-10-10 in `eval-core` 0.11.1, tagged 7ee65fc. An AST is compiled on every call and never cached; a string is cached as before. Affected `eval-core` 0.2.1–0.11.0 |
| [A30](#a30) | `ParserService.parserOptions` reaches `EvalService`, `CompilerService` and `DiscoveryService` for no acorn option | core | decision | Open — opened 2026-10-10 by the Phase 9 plan |
| [A31](backlog-retired.md#a31) | The case-insensitive property cache keys an object by its key count and first five keys — objects sharing them share answers, process-wide | core | fix | **Retired — fixed 2026-10-10**; released 2026-10-10 in `eval-core` 0.11.1, tagged 7ee65fc. Keyed by the object itself, a cached key re-checked as the object's own; a colliding entry no longer turns a case-variant refusal into `undefined`. Affected `eval-core` 0.2.1–0.11.0 |
| [A32](#a32) | The disabled visitor result cache keys a node without its operands — `a + b` and `c + d` share an entry | core | decision | Open — opened 2026-10-10 by A29's fix; latent, nothing calls it |
| [A33](#a33) | The case-insensitive property cache keeps a miss while the own-key count is unchanged — a key added as another is deleted reads `undefined` by a case variant | core | fix | Open — opened 2026-10-10, after the `eval-core` 0.11.1 tag; a limit [A31](backlog-retired.md#a31)'s fix documents in a code comment. No refusal is skipped |
| [A34](#a34) | The parse fingerprint's memo does not see options written in place — a write into `parserOptions`, a reused per-call object or `defaultParserOptions` keeps the old fingerprint | core | fix | Open — opened 2026-10-10 by [A26](backlog-retired.md#a26)'s fix, Phase 9 step 1; no worse than the text-only key it replaced |
| [A35](backlog-retired.md#a35) | A dangerous function value reachable from the context is callable past the name-based call sandbox — by an alias, through `call` / `apply` / `bind`, and as a native callback (`map`, `Reflect.apply`, `then`); `eval("1+1")` is refused, `["1+1"].map(eval)` is `[2]` | core | decision, security | **Retired — fixed 2026-10-18**, as steps 2, 4, 7 and 8 of the [A35 plan](a35/plan.md). Steps 2 and 4 released 2026-10-17 in `eval-core` 0.12.1, tagged 7cc8d30, as partial hardening; steps 7 and 8, which close its last route, [A39](backlog-retired.md#a39), released 2026-10-20 in `eval-core` 0.13.0, tagged f7f27f7; advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx). A host container stays a documented limit |
| [A36](backlog-retired.md#a36) | A tagged template's tag is called with no sandbox check — `` Function`return 7`() `` gives 7 with `Function` under its own name | core | fix, security | **Retired — fixed 2026-10-15**, as step 1 of the [A35 plan](a35/plan.md); released 2026-10-17 in `eval-core` 0.12.1, tagged 7cc8d30; advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx). A tag is called as a callee is, through the call sandbox and the write policy; a member tag shares the member call's path, so its `this` is its object. Affected every published `eval-core` to 0.12.0 |
| [A37](backlog-retired.md#a37) | `SequenceExpression` has no visitor: `(0, 1)` leaves a value on the stack | core | fix | **Retired — fixed 2026-10-15**, as step 3 of the [A35 plan](a35/plan.md); released 2026-10-17 in `eval-core` 0.12.1, tagged 7cc8d30. A sequence leaves one value on the stack, and raises one `before` and one `after` event and one trace entry; no evaluated value changes. Affected every published `eval-core` to 0.12.0 |
| [A38](#a38) | A tag's strings array is not JavaScript's: not frozen, no `raw` — so `` String.raw`a\nb` `` throws — a new array per evaluation, and not recorded as created | core | fix | Open — opened 2026-10-15 by the code review of the A35 plan's step 1. Fidelity, not security; not in 0.12.1 |
| [A39](backlog-retired.md#a39) | Evaluating `this` lets native code reach a dangerous function the host placed in the context, past the funnel; mechanism and probes in the advisory | core | fix, security | **Retired — fixed 2026-10-18**, as steps 7 and 8 of the [A35 plan](a35/plan.md): `this` only as a member's object, and a guarded view as every receiver the evaluator resolves from the context. Released 2026-10-20 in `eval-core` 0.13.0, tagged f7f27f7; advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx) |
| [A40](backlog-retired.md#a40) | A postfix update of a listed function writes, then the funnel refuses the old value — the failed evaluation leaves its write behind | core | fix | **Retired — fixed 2026-10-22**, as a consequence of [A41](backlog-retired.md#a41)'s fix; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. The operand converts to `NaN` before the write, so `tools.eval++` gives `NaN` and writes `NaN`, as JavaScript does, and nothing throws |
| [A41](backlog-retired.md#a41) | An update does not convert its operand to a number: `x++` on `"5"` writes `"51"`, on `{}` writes `"[object Object]1"`, and a postfix update gives the operand as read | core | fix | **Retired — fixed 2026-10-22**; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. The operand is converted once, natively, before anything is written: `"5"++` gives `5` and writes `6`, and a BigInt updates |
| [A42](backlog-retired.md#a42) | `this.k = v` lands on the `EvalContext` instance, where nothing reads it back — but it shadows the class's own members, so the evaluator invoked what an expression planted, and it persists on a reused context | core | fix, security | **Retired — fixed 2026-10-19**, in the [A35 plan](a35/plan.md)'s step 9 under its Revision 16. The write is refused by class, the methods the evaluator calls are taken from the class, and a context reached as data is refused. Released 2026-10-20 in `eval-core` 0.13.0, tagged f7f27f7; referenced in advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx) as additionally fixed, not its subject. Its first characterisation — "not a route to the context itself" — was measured wrong and corrected |
| [A43](backlog-retired.md#a43) | Under `caseInsensitive`, an identifier write to a name the context resolves to nothing — absent, or bound to `undefined` — writes the key `undefined` | core | fix | **Retired — fixed 2026-10-22**, opened the same day by the [A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. Both write sites fall back to the name as written, as `identifier.ts` does; `getKey` is unchanged |
| [A44](#a44) | Under `caseInsensitive`, a member write to a case variant creates a new key: `OBJ.X = 2`, `OBJ.X += 1` and `OBJ.X++` on `{ x: 1 }` leave `{ x: 1, X: 2 }` | core | fix | Open — opened 2026-10-22 by the A40/A41 batch's `caseInsensitive` matrix; predates it. The update spec's `caseInsensitive` leg avoids case-variant spellings because of it, and its fix adds those rows |
| [A45](#a45) | An assignment evaluates its target as an operand and its right side unconditionally — a short-circuited `\|\|=` called its right side and wrote (part 1, fixed), a member target is evaluated twice, and `obj.fetch = 1` is refused at the read | core | fix | Open — opened 2026-10-22 by the A40/A41 batch. **Part 1 retired 2026-10-22**: a logical assignment that short-circuits evaluates nothing more and writes nothing; released 2026-10-23 in `eval-core` 0.13.3, tagged 021d5e4. Part 2 needs a plan: it reopens Phase 1's decision that assignment targets emit read events. Fidelity; no refusal skipped, since every deviation adds one |
| [A46](backlog-retired.md#a46) | An expression can rebind `undefined` on a reused context — `undefined = 1`, then `x === undefined` is `false` — and under `caseInsensitive` a case variant of `undefined`, `null`, `true` or `false` | core | fix, decision | **Retired — fixed 2026-10-22**; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. Such a write throws `Assignment to read-only name`, unless a scope binds the name or the context resolves it; a context class that overrides `set` decides these writes itself. `NaN` and `Infinity` are outside the set, since the evaluator resolves neither |
| [A47](#a47) | An arrow's parameter scope is pushed without the walk's options, so under `caseInsensitive` `(x => X)(1)` is `undefined`, and `X = 5` in the body can land on the consumer's context | core | fix | Open — opened 2026-10-22 by the A40/A41 batch's code review; predates it. The other three scope pushers pass the options. Not scheduled |
| [B1](backlog-retired.md#b1) | The `!isPrimitive` carve-out in `member-expression.ts` | core | decision → fix | **Retired — fixed 2026-10-02**; released 2026-10-03 in `eval-core` 0.9.0, tagged eb403c0. A primitive receiver is refused `constructor`, `__proto__`, `prototype` and the four accessor definers; `toString` and its five kin stay readable |
| [B2](backlog-retired.md#b2) | `pattern.ts:83` logs the whole `EvalState` | core | fix | **Retired — fixed**, Phase 2 step 0; released in `eval-core` 0.4.0 |
| [B3](backlog-retired.md#b3) | Two service-layer `console.*` calls reach the published bundle | core | decision | **Retired — fixed 2026-09-29**; released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1. The last one, `parser.service.ts`'s cache-timer `console.debug`, deleted: none in the bundle, eleven in source, all `memory-manager.ts` |
| [B4](backlog-retired.md#b4) | `eval-core.component.ts` is dead generator scaffold | core | fix | **Retired — fixed 2026-09-26**; no published artifact changed — the bundle and `.d.ts` are byte-identical |
| [B5](backlog-retired.md#b5) | `eval-core` exports seventeen symbols nothing uses — two `@deprecated` since Phase 1, their removal deferred in a plan and nowhere else | core | decision, then fix | **Retired — decided and fixed 2026-10-04**; released 2026-10-07 in `eval-core` 0.11.0, tagged 776885a: all seventeen removed, a breaking minor; the CHANGELOG names a replacement for the three that have one |
| [B6](backlog-retired.md#b6) | A bare identifier reads an inherited `Object.prototype` member: `constructor` is `Object`, and `constructor.assign(__proto__, …)` pollutes `Object.prototype` | core | fix, security | **Retired — fixed 2026-10-05**; released 2026-10-07 in `eval-core` 0.10.1, tagged d77fa16, and 0.11.0, tagged 776885a; advisory [GHSA-jh43-xc7j-93c2](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-jh43-xc7j-93c2): an identifier and `this.k` refuse a blocklisted name before any lookup, and under `caseInsensitive` a blocklisted matched key; a member of an `EvalScope` held in the context refuses the name. Affected: every published version to 0.10.0, first tag `eval-core@0.1.104` |
| [C1](backlog-retired.md#c1) | A member-target write escapes the read-only policy | signals | decision | **Retired — decided and fixed 2026-10-03**; released 2026-10-04 in `eval-signals` 0.3.0, with `eval-core` 0.10.0, tagged 0c3299e: a signal expression may write into what it created and not into anything it was given or got back from a call |
| [C2](backlog-retired.md#c2) | Detect a write violation at construction, not first recompute | signals | decision | **Retired — decided 2026-10-03**: no construction-time check; [C1](backlog-retired.md#c1)'s runtime guard is the guarantee and fires on the first read |
| [C3](backlog-retired.md#c3) | Whether `eval-signals` should work around [A4](backlog-retired.md#a4) locally | signals | decision | **Retired — decided and fixed 2026-10-01**; released 2026-10-02 in `eval-signals` 0.2.0, tagged c56f987: under `caseInsensitive` a source key is named as the source spells it, in `getKey`, write errors and the first segment of `dependencies` |
| [C4](backlog-retired.md#c4) | A mutating method call escapes the member-write policy | signals | accepted, then fix | **Retired — fixed 2026-10-04**; released 2026-10-07 in `eval-core` 0.11.0, `eval-signals` 0.4.0 and `eval-forms` 0.4.0, tagged 776885a: `eval-core` asks the policy before a built-in method that writes into what it is handed, matched by identity; `eval-signals` refuses one with `kind` `'method'`; `eval-forms` by consequence |
| [C5](backlog-retired.md#c5) | A built-in mutator reached through `call`, `apply` or `bind` escapes C4's check | signals | fix | **Retired — fixed 2026-10-05**; released 2026-10-07 in `eval-core` 0.11.0, with `eval-signals` 0.4.0 and `eval-forms` 0.4.0 by consequence, tagged 776885a: a method reached through `call` or `apply` is asked about as a direct call, with the `this` they pass, and `bind` is asked when it binds |
| [C6](backlog-retired.md#c6) | The README's `resource` composition does not compile at Angular 19, inside the peer range | signals | docs | **Retired — fixed 2026-10-09**, docs and tests only, by the Phase 5 plan's step 4; ships in the `eval-signals` 0.5.0 README: both spellings, the `params` one executed by `readme-examples.spec.ts` |
| [C7](backlog-retired.md#c7) | Phase 3's scope-containment case discriminates only through its depth assertion — its end-to-end read passes with the guard disabled | signals | test gap | **Retired — fixed 2026-10-10**, test only: the fixture pushes twice, so the end-to-end read goes red with the guard disabled |
| [D1](backlog-retired.md#d1) | The throwing-subscriber premise is false in both halves | forms | fix + decision | **Retired — decided and fixed 2026-10-03**; released 2026-10-04 in `eval-forms` 0.3.0, tagged 0c3299e: a late prototype-named control is not mirrored and is reported once, out of band, after the rest of the emission |
| [D2](backlog-retired.md#d2) | Should `/reactive` reject prototype-shadowed identifiers too? | forms | decision, breaking | **Retired — decided and fixed 2026-10-03**; released 2026-10-04 in `eval-forms` 0.3.0, tagged 0c3299e: yes, with `/signals`' own guard, shared from the core; no form that worked could have named one |
| [D3](backlog-retired.md#d3) | Per-registration `caseInsensitive` reaches one of three levers | forms | decision | **Retired — decided and fixed 2026-10-03**; released 2026-10-04 in `eval-forms` 0.3.1, tagged 3d56994. The memo is keyed on the key and `caseInsensitive` together, and each rule context is built from its registration's options, so a registration's value reaches all three levers |
| [D4](backlog-retired.md#d4) | A top-level model key holding a signal is returned un-called | forms | fix or doc | **Retired — fixed 2026-09-29**; released 2026-09-30 in `eval-forms` 0.2.4, tagged 587ebf1. `/signals` unwraps it as upstream does, and the README bullet is corrected |
| [D5](backlog-retired.md#d5) | Two dead lookups run ahead of ours on every resolution | forms | fix (perf) | **Retired — fixed 2026-10-03**; released 2026-10-04 in `eval-forms` 0.3.1, tagged 3d56994. A rule context's lookups are exactly the live ones at both entry points: one resolver call per identifier, where `/signals` made three and `/reactive` two |
| [D6](backlog-retired.md#d6) | `/signals` diverged from upstream on non-string keys — filed as "the `typeof` guard is unfalsifiable", measured false | forms | fix | **Retired — fixed 2026-09-26**; released 2026-09-30 in `eval-forms` 0.2.4, tagged 587ebf1 |
| [D7](#d7) | `toSignal`'s `assertNotInReactiveContext` throws out of the mirror | forms | accepted | Open, documented |
| [D8](#d8) | `warnOnNestedSignals` runs once, at construction | forms | accepted | Open, documented |
| [D9](backlog-retired.md#d9) | § 3.4.3's precedence rule is untested end to end | forms | test gap | **Retired — premise false: covered end to end since 7fbef49; the `caseInsensitive` pair added 2026-09-27, test only** |
| [D10](backlog-retired.md#d10) | `applyErrorPolicy` has no runnable README block | forms | docs | **Retired — fixed**, and it created [F3](backlog-retired.md#f3)'s third gate's subject |
| [D11](backlog-retired.md#d11) | `/signals` has no worked example | forms | docs | **Retired — fixed 2026-10-03**, docs and tests only: [`docs/forms/worked-example-signals.md`](forms/worked-example-signals.md), every ` ```ts ` block executed and counted; released 2026-10-04 in `eval-forms` 0.3.1, tagged 3d56994 — the example ships in no package, the README's link to it does |
| [D12](backlog-retired.md#d12) | ~20 specs discard the binding and never call `destroy()` | forms | test hygiene | **Retired — fixed 2026-09-28, test only**; `destroy()`'s release path is pinned by `field-schema.memory.spec.ts`, the net's by `field-schema.spec.ts`'s subscription count. Injector-path memory cases removed 2026-09-29: timing-dependent |
| [D13](#d13) | A rule whose top-level statement `eval-core` refuses registers in both adapters and renders blank under the default policy | forms | decision, then fix | Open, narrowed — opened 2026-10-10 by the Phase 9 plan; a top-level label refused at registration since its step 6, released 2026-10-14 in `eval-forms` 0.5.0, tagged 3466c80. A label in a top-level block, `{ L: 1 }`, and every other such statement remain |
| [E1](#e1) | Form-state keys across both adapters | forms | phase | Open — **no phase reserved** |
| [E2](#e2) | Arrays — `applyEach` at `/signals`, `FormArray` at `/reactive` | forms | phase | Open |
| [E3](#e3) | `dependencies` introspection at form scale | forms | phase | Open |
| [E4](#e4) | Short-circuiting / value-rewriting hooks | core | phase | Open, by design |
| [E5](backlog-retired.md#e5) | The options-first style cannot read `hookErrors` | core | decision | **Retired — decided 2026-09-30: closed with documentation**; no API. The README names the two routes, state-first or `onHookError: 'throw'` |
| [E6](backlog-retired.md#e6) | `exit` has no mark to bound its scan | core | fix | **Retired — fixed, Phase 2 step 1**; released in `eval-core` 0.4.0; its "Phase 2 makes it reachable" premise was wrong |
| [F1](backlog-retired.md#f1) | No `configurations.ci` on the `test` target — **two projects, not one** | signals, forms | fix + decision | **Retired — fixed, no thresholds** |
| [F2](backlog-retired.md#f2) | One `CHANGELOG.md` for three independently-versioned packages | repo | decision | **Retired — decided 2026-09-28**: one `modules/<name>/CHANGELOG.md` per package; `nx release` still unadopted. `eval-core` had five changelogged versions npm never received |
| [F3](backlog-retired.md#f3) | README-import drift gate — every `@zvenigora/…` import a README prints is exported — **three packages, four READMEs** | core, signals, forms | fix | **Retired — built and green**. Whether every export is documented is [F10](backlog-retired.md#f10)'s |
| [F4](backlog-retired.md#f4) | README-execution gate for `eval-core` and `eval-signals` | core, signals | fix / decide-then-drop | **Retired** — both package READMEs gated; root **assessed and dropped** |
| [F5](backlog-retired.md#f5) | The `js-sha256` peer range is locked to a dead minor | core | decision | **Retired — decided and fixed 2026-09-29**; released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1. Range widened to `^0.10.1 \|\| ^0.11.0 \|\| ^0.12.0 \|\| ^1.0.0`, tested at 0.10.1 and 1.0.0 |
| [F6](backlog-retired.md#f6) | CONTRIBUTING's "Code style" describes a config that never existed here | repo | decision (editorial) | **Retired — fixed 2026-09-26**; the table replaced by a paragraph pointing at the four flat configs |
| [F7](backlog-retired.md#f7) | Intermittent Jest worker-teardown warning — **no established locus** when filed; it was Jest's fixed 500 ms worker-exit window, missed under `run-many`'s contention | — | fix | **Retired — fixed 2026-10-04**; ships in no package. `jest.preset.js` sets `maxWorkers: 1`, so Jest runs every test file in band and starts no worker to force-exit |
| [F8](backlog-retired.md#f8) | The release tag step has no forcing function, and ships with a silencer | repo | fix | **Retired — fixed 2026-10-04**; ships in no package. The disk fallback is removed from all three `project.json`s, and `tools/release-tags.mjs`, in the root `test` target, fails on a Publication status row whose tag is missing or at another commit |
| [F9](backlog-retired.md#f9) | No gate on document cross-references — the register's own dangling links | repo | fix | **Retired — fixed 2026-09-28**; `tools/doc-links.mjs`, the workspace root's `test` target, so `npm test` and CI run it. Deferred 2026-09-07 by [plan](gates/plan.md) § 8.4 |
| [F10](backlog-retired.md#f10) | The drift gate covers documented-**and-imported** symbols only | core, signals, forms | fix | **Retired — fixed 2026-10-04**, test only: every export is named in a code span of its package's README or allowlisted with one of five reasons, and every allowlist entry is still exported |
| [F11](backlog-retired.md#f11) | A gated README can only import from its own specifier | core, signals, forms | fix | **Retired — fixed 2026-10-03**; ships in no package: every `@zvenigora/…` import in a gated README resolves against its own specifier, owned by the README's package |
| [F12](backlog-retired.md#f12) | The downstream peer ranges exclude `eval-core` 0.4.0 — **and fail both downstream `lint` targets** | signals, forms | fix | **Retired — fixed, Phase 2 step 7**; both ranges widened, and `lint`'s cache inputs with them |
| [F13](backlog-retired.md#f13) | Nothing gates the README block count `readme-examples.spec.ts` claims | core, signals, forms | test gap | **Retired — fixed 2026-09-27**, test only; all four specs gated. The gate's first run found `eval-core`'s count wrong a third time |
| [F14](backlog-retired.md#f14) | Six sites cite the retired `^0.3.0` range, two of them in published READMEs | signals, forms | fix (comments, docs) | **Retired — fixed, Phase 2 step 8**; filed as four sites, was six |
| [F15](backlog-retired.md#f15) | The downstream peer ranges exclude `eval-core` 0.6.0 — **latent until the bump, then both downstream `lint` targets fail** | signals, forms | fix (release coordination) | **Retired — fixed and released 2026-09-26**; both ranges widened to `>=0.3.0 <0.7.0`, and both packages released: `eval-signals` 0.1.3 and `eval-forms` 0.2.3, tagged f26f987 |
| [F16](#f16) | Workspace dependency advisories — 9 moderate on the workspace's Angular 22.0.8, and a **temporary override under `nx`**, now `undici`'s; beside it, the **`qs` override**, whose `^6.14.1` floor does not exclude GHSA-w7fw-mjwx-w883 (fixed 6.14.2) | repo | fix | Open — **part 2's `brace-expansion`, `smol-toml` and `axios` overrides retired 2026-10-23** with `nx` 23.3.0 ([F21](backlog-retired.md#f21)); part 2 now holds `overrides.nx.undici` only, until a stable `nx` stops pinning `undici` below 7.29.1. **Part 1 retired 2026-09-27**: `nx` 23.2.1, Angular 22.1.8 / 22.1.9, `npm audit` 0 at every severity. Part 2, the override, is live until a stable `nx` depends on `smol-toml >= 1.7.1`. **Re-audited 2026-09-30: 22 (14 high, 8 moderate)**, none reaching a published package; **fixed the same day**: Angular 22.2.1 / 22.2.0, two more `overrides.nx` entries, `verdaccio` removed, `npm audit` 0. **`qs` recorded 2026-10-14**: the override was added for GHSA-6rw7-vpxm-498p, not prototype pollution; raising its floor is held here. **Re-audited 2026-10-20 at 7741395**: `qs` resolves 6.16.0, past both advisories, and audit reports nothing for it |
| [F17](#f17) | An unhandled rejection reaches no channel a spec would normally watch — only zone.js's `unhandledPromiseRejectionHandler` hook sees it | repo | test gap | Open — opened 2026-10-08 by Phase 5 step 2 |
| [F18](backlog-retired.md#f18) | `eval-signal.ts` line citations in `eval-forms` comments and completed plans are stale | forms, repo | docs | **Retired — fixed 2026-10-10** in live source; completed records kept as written, per `CLAUDE.md`. The three `eval-forms` comments cite symbols; `applyErrorPolicy`'s ships in the core `.d.ts` |
| [F19](backlog-retired.md#f19) | `CLAUDE.md` cites the resolved-key re-check as `member-expression.ts:188`; it was at `:211`, and is at `:244` | repo | docs | **Retired — fixed 2026-10-21** by Phase 10 step 6: `CLAUDE.md` cites `isDangerousProperty(foundKey)` in `member-expression.ts` by symbol, as the entry's fix recorded |
| [F20](backlog-retired.md#f20) | `CODE_OF_CONDUCT.md`'s enforcement contact is an address of the upstream `jse-eval` author, not this repository's maintainer | repo | docs | **Retired — fixed 2026-10-22**, in no package: reports go to the maintainer's GitHub account, or privately through GitHub's abuse reporting; no address |
| [F21](backlog-retired.md#f21) | Build-tooling advisories: 32 findings (11 high, 21 moderate) from `@modelcontextprotocol/server` via `@angular/cli`, `follow-redirects` via `nx`, and `sprintf-js` via the jest chain — none in a published package | repo | fix | **Retired — fixed 2026-10-23**, in no package: Angular 22.2.3 / 22.2.4 and `nx` 23.3.0, `npm audit` 11 high → 0. `nx` 23.3.0 pins `undici` 7.29.0, so a nested `overrides.nx.undici` replaces the old three ([F16](#f16) part 2); `sprintf-js` was no longer reported at the 4246308 baseline |
| [F22](backlog-retired.md#f22) | `eval-core`'s F10 block, ungated in two places: eight allowlist entries its README now documents, so the free-functions sentence can be deleted with F10 green; and the docblock's "twenty-one of the sixty", which no case checks | core | fix (test) | **Retired — fixed 2026-10-21** by Phase 10 step 5: the eight entries removed, the figure dropped, and a case that fails on an allowlisted name the README names |
| [F23](backlog-retired.md#f23) | Live documents claim guarantees the library does not give: twelve root README lines ("secure", "complete prototype pollution prevention", "function sandboxing", "prevents injection attacks"), and `eval-core`'s README saying an expression over an empty context "cannot use JavaScript's built-in functions", when a value's own methods stay callable | repo, core | docs | **Retired — fixed 2026-10-21** by Phase 10 step 5: the landing page keeps none of the twelve lines, and the `eval-core` README names the globals and says a value's own methods stay callable, with an `[Unreleased]` line. The README line released 2026-10-22 in `eval-core` 0.13.1, tagged 5b9c859; the root README part ships in no package |
| [F24](backlog-retired.md#f24) | The `eval-signals` and `eval-forms` copies of `export-list.spec.ts` have no reverse case, so an allowlist entry the README documents would mask its mention's deletion, as F22 found in `eval-core` | signals, forms | test gap | **Retired — fixed 2026-10-22**, in no package: each copy has F22's helper and case, which fails in that project alone on an allowlisted name its README documents |
| [F25](backlog-retired.md#f25) | Four documentation checks Phase 10 left undecided: no gate fails when `docs/README.md` stops linking a tracked `docs/` file; two links into `eval-core`'s CHANGELOG headings left the doc-links gate when they became absolute; doc-links silently skips an untracked `.md`; and whether a published README's absolute link binds its target path and anchor for good | repo | decision | **Retired — decided and fixed 2026-10-23**, in no package: a published link binds, and `tools/doc-links.mjs` checks the index, names and checks untracked files, and resolves absolute links into the tree and every link in `tools/published-links.txt` |
| [R1](backlog-retired.md#r1) | `ASYNC_HOOK_MESSAGE`'s dangling `{@link}` | core | — | **Retired — fixed** |
| [R2](backlog-retired.md#r2) | `model-source.spec.ts`'s "registrars are stubs" comment | forms | — | **Retired — fixed** |
| [R3](backlog-retired.md#r3) | `eval-core` missing its `release.version` blocks | core | — | **Retired — superseded** |
| [R4](backlog-retired.md#r4) | Two false cross-references asserting [A8](backlog-retired.md#a8) was tracked | repo | — | **Retired — corrected** |

---

## Phase 2 preconditions

Four entries are named preconditions for Phase 2 (statements). They are **not** equally
binding, and the difference decides where each one goes. The test is: *does Phase 2 make this
worse, or is it merely nearby?*

| Entry | What Phase 2 does to it | Where it goes |
| ----- | ----------------------- | ------------- |
| [A9](backlog-retired.md#a9) | **Multiplies the construct.** Block scoping means a scope per block per iteration, so a `for` body that throws on iteration 3 leaks three scopes. And five new visitors copy whatever idiom the two existing sites set | **Phase 2 step 0** |
| [B2](backlog-retired.md#b2) | **Makes it reachable.** Destructuring declarations and assignment destructuring give a `MemberExpression` a legal binding target, and the branch has a whole-`EvalState` `console.log` in it | **Phase 2 step 0** |
| [E6](backlog-retired.md#e6) | ~~**Makes it reachable, but through the design itself.** Loop completion — "skip the rest of the block" — is exactly the unmatched-`after` shape `exit` cannot bound~~ — **wrong, corrected in step 1**: skipping a subtree never enters it, so nothing is left open; only abrupt completion produces the shape, and that is out of Phase 2's scope | **A design section of Phase 2's plan**, not a step ahead of it — held, and the bound landed in step 1 anyway |
| [A2](backlog-retired.md#a2) | **Nothing.** None of its three members — `(a)++`, `[a, b] = arr`, `({m} = o)` — is more reachable after Phase 2 than before; Phase 2 adds no path into either write visitor's chain | **Standalone fix, whenever** |

**Step 0 is [A9](backlog-retired.md#a9) + [B2](backlog-retired.md#b2), one session.** Both are small, both are strictly-before, and
neither needs Phase 2's design settled: A9 is a `try`/`finally` at two sites plus specs proving
the pop survives a throw, B2 is a deletion. The cost asymmetry is what makes them step 0 rather
than cleanup — fixing A9 first sets the idiom the five new visitors copy; fixing it afterwards
means auditing seven sites, by which time the two originals have been read as precedent.

**Done, 2026-09-11.** Both entries are Fixed. Two things the estimate got wrong are worth keeping,
because they are the failure modes this register exists for.

*The criterion could not be met as written.* The plan asked for **one** spec to cover both of
`pattern.ts`'s repairs, and one cannot — the throw and the scope push are in two functions that
never call each other, so the `MemberExpression` fixture throws having executed no push and its
`scopes.length` assertion would have passed against the unfixed code. Two fixtures; the criterion
was amended in the plan rather than satisfied as written.

*"Strictly-before and small" was true of the code and false of the blast radius.* "B2 is a
deletion" held. "A9 is a `try`/`finally` at two sites plus specs" held for `eval-core` — and then
two downstream suites went red, because both libraries had **pinned the leak as known behaviour**
rather than only working around it. Nothing in this register or the plan predicted that: A9's own
entry tracked the *containments* and not the *specs describing them*. The work is
[`statements/phase-2-plan.md`](statements/phase-2-plan.md) step 0b, which the plan had to sanction
because § 2 makes a downstream edit a stop-and-replan. The general lesson, for the entries still
open here: an entry that records "two libraries carry workarounds for this" is also recording that
those libraries have tests asserting the defect, and closing it moves both.

**[E6](backlog-retired.md#e6) is a constraint on the design, not a queue item.** Bounding `exit`'s scan with a
mark and choosing the completion-value mechanism are one decision seen twice. Discharging it
ahead of the plan would mean designing the mark without knowing what it has to bound.

> **Held, and it paid.** The completion mechanism the plan chose (§ 3.1, a value-stack discipline
> with no abrupt completion) is what established that Phase 2 does **not** make E6 reachable — the
> opposite of what E6's own entry claimed. Designing the mark ahead of that would have bounded it
> against a short-circuit mechanism this phase never built. The bound shipped in step 1 regardless,
> on the "leaving the trap armed under seven new visitors" argument rather than on reachability.

**[A2](backlog-retired.md#a2) is not a precondition and should not wait.** The argument for pulling it early was
precedent — statement dispatchers are the same `if`/`else if`-over-node-types shape and would
copy the silent fall-through. That is a reason to fix it, not a reason to put it in step 0: its
fix is a `ParenthesizedExpression` visitor, which is a new node type with registration, a
co-located spec and a README row — feature-shaped work in a step whose whole value is being
small and strictly-before. "Correct before imitated" is served by the fix *existing*, not by it
living in step 0. It is a real wrong-value bug with a real route to it, so it should land on its
own schedule regardless of whether Phase 2 ever starts.

> **Landed 2026-09-30, for `eval-core` 0.7.0, and not as a new visitor.** Unwrapping the
> parentheses inside the two write visitors was enough — `acorn-walk`'s base walker already passes
> through `ParenthesizedExpression` for a value — and a throwing default closed the two
> destructuring members.

---

# A. `eval-core` — visitor, context and service defects

Recorded rather than fixed: each is a **behavioral** change, and the phase that surfaced it was
scoped to be additive.

[A1](backlog-retired.md#a1)–[A3](backlog-retired.md#a3) came out of the Phase 1 hook work
([`side-effects/phase-1-plan.md`](side-effects/phase-1-plan.md)) and are in the visitors.
[A4](backlog-retired.md#a4) is in `EvalContext` and was surfaced by Phase 1 step 4's read hooks. [A5](backlog-retired.md#a5) and
[A7](backlog-retired.md#a7) were surfaced by Phase 3 step 2 ([`signals/phase-3-plan.md`](signals/phase-3-plan.md))
— the first consumer to reuse one `EvalContext` across many evaluations, which is what makes
several of these visible at all. [A6](backlog-retired.md#a6) was surfaced by Phase 6 step 3. [A8](backlog-retired.md#a8) and
[A9](backlog-retired.md#a9) were never recorded in the roadmap at all. [A23](backlog-retired.md#a23) was surfaced by
[C1](backlog-retired.md#c1)'s fix. [A24](#a24), [A25](#a25) and [A26](backlog-retired.md#a26) were surfaced by the Phase 5 plan's probes
([`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 1.3), which keeps all three out of its scope
(§ 3.1). [A29](backlog-retired.md#a29) and [A30](#a30) were surfaced by the Phase 9 plan's probes
([`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) § 1.3), which needs neither.
[A31](backlog-retired.md#a31) and [A32](#a32) were found by A29's fix, grepping for other keys built
from an object's shape. [A33](#a33) is a limit A31's fix left, and documented in the code; [A34](#a34)
is one A26's fix left, documented the same way. [A44](#a44)–[A47](#a47) were found by the
[A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch: A44 by its
`caseInsensitive` matrix, A45 while correcting `SECURITY.md`'s account of an assignment, and
[A46](backlog-retired.md#a46) and A47 by its code review. A46 is fixed and retired, and ships with
the batch in `eval-core` 0.13.2.

**Identity-checked `exit`** (§ 3.8 of the Phase 1 plan) means the hook layer stays balanced in
spite of [A1](backlog-retired.md#a1) and [A2](backlog-retired.md#a2), so neither was urgent — [A3](backlog-retired.md#a3)
is retired 2026-09-26 and A1 and A2 2026-09-30, and the value stack
is a separate stack that is not protected by it. Do not read balanced hook events as evidence
that a visitor is correctly bracketed.

<a id="a15"></a>
## A15 — The per-walk trace reset, weighed and declined

**Package** core · **Kind** decision · **Status** Open, **decided 2026-09-24: declined in
general**, not only for the [A12](backlog-retired.md#a12) fix. Not Retired, because the reopen conditions at the end
are live, the same way [D7](#d7) is kept. Opened 2026-09-19, when the [A12](backlog-retired.md#a12) fix weighed
the reset and declined it

**Decided 2026-09-24, by [`docs/trace-surface/plan.md`](trace-surface/plan.md): no per-walk
reset.** The argument below was written for the A12 fix. It was re-checked against the bound
that shipped. Its first ground holds. Its deciding ground holds with its margin corrected (see
the correction note under it). One new ground was added:

- **The per-state span is now documented contract, not an accident.** A12 wrote it into
  `maxTraceItems`' docblock ("Per state, not per walk"), into `traceTruncated`'s ("Latches"), into
  `tracePushCount`'s ("over this state's life"), and into `clearTrace`'s, which cites this entry
  as the reason the span is deliberate. The package README's "Bounding the trace" and
  `CHANGELOG.md`'s `[eval-core 0.6.0]` upgrading note say it too. So a reset would now redefine
  four symbols, not one getter. That is still free until `eval-core`'s next minor ships, and a
  behaviour change to a published contract after it. **The decision had to come before that
  release, because the release publishes the contract.**

`EvalResult.trace` spans every evaluation run on one state rather than restarting per walk.
[A12](backlog-retired.md#a12)'s fix bounds its **total** with `maxTraceItems`; it does not change that span. A reset
on the outermost walk entry — gated on `walkDepth` 0→1, beside the iteration budget's refill —
was weighed as part of that fix and declined. This entry is the argument, so the question reads
as answered rather than missed.

**Declined because it bounds nothing the cap does not.** A head cap bounds `trace.length` however
many walks run on a state; the reset bounds only the per-walk contribution and leaves the headline
case — **one** walk, 700,007 items — untouched. It also does nothing for the [A8](backlog-retired.md#a8)-compounded
case, since `simpleEval` builds a fresh state per call and every retained state has exactly one
walk on it.

**The case *for* it is staleness, and it is real.** Under a cap alone a long-lived state saturates:
once `trace.length` reaches the bound the trace holds the **first** N pushes and never updates
again. For a form re-evaluating per keystroke at ~20 nodes a rule, a 10,000 bound freezes within a
few hundred evaluations and the consumer's `console.table` then shows a session's opening minute
forever. Cap-alone converts an unbounded diagnostic into a bounded stale one.

**What decided it** was neither of those. The reset makes the trace / `after`-hook correspondence
— pinned by `hooks.spec.ts` — conditional above **one walk**, which the documented
`createState` + repeated `eval` style reaches on its second call. The cap makes the same
correspondence conditional above 10,000 pushes **on one state**. No library code in this
workspace reaches that across walks: `eval-signals` builds a fresh state per recompute, and
`eval-forms/signals`' `evaluateRule` builds one per call. (One walk with a loop still reaches
it, which is A12's headline case.) The documented
style reaches it after about 500 walks at ~20 nodes each, which is the staleness paragraph's own
arithmetic. That leaves hundreds of walks of headroom against one. `EvalResult.clearTrace()`
(0.6.0) is the opt-in remedy for the staleness, so the case for imposing it is weaker again.

*(Corrected 2026-09-24. This read "above 10,000 pushes in one walk, a size nothing in this
workspace reaches. Two orders of magnitude of headroom against none." The shipped bound is per
state, not per walk. `maxTraceItems`' docblock says so, and this entry's staleness paragraph
depends on it. So the cap bites across walks too, and the documented consumer style does reach
it. The margin narrows. The ordering does not change, so the conclusion stands.)*

**What would reopen it**: a consumer report of a frozen trace, or a decision to give
`nodeTimings` and the trace one lifetime rather than two — the coherence objection is really about
*all* the per-state accumulators, and deciding it for one is what the A12 fix declined to do. Once
`eval-core`'s next minor ships, reopening it means a behaviour change to a published contract.

Two further costs were weighed at the time. A reset changes every consumer's trace silently and
unconditionally, where the cap bites only above a line and reports it. And the choice is
reversible in one direction only: shipping the cap leaves the reset available later, while
shipping the reset and regretting it takes a second behavioural change to undo.

*Recorded*: this entry.
*Verified*: the 700,007-item single walk was **measured** 2026-09-17 against the built 0.5.0
bundle (`016a313`). The hook-stream side was **read, not measured** — the correspondence is pinned
by `hooks.spec.ts`'s two assertions, and that hooks fire per node with no bound is derived from
the dispatcher rather than counted.

---

<a id="a19"></a>
## A19 — A12's fix shipped behind a criterion that could not detect its own wrong implementation

**Package** core · **Kind** decision · **Status** Open, **decided 2026-09-24: the gate is not
built now**. Not Retired, because the conditions that would reverse it are live, the same way
[D7](#d7) is kept. Opened 2026-09-20. **Feasibility answered 2026-09-23**: no in-repo detector
*for this allocation-shaped defect* exists under the current Jest setup, and a
Node-against-`dist` target would be one. *(Narrowed 2026-09-24. This said "no in-repo detector"
without the qualifier. A GC-forcing retention detector does work in Jest; see "What Jest can
do" below.)* The fix it guarded is [A12](backlog-retired.md#a12), and that is done

**Decided 2026-09-24, by [`docs/trace-surface/plan.md`](trace-surface/plan.md): the
Node-against-`dist` gate is not built now.** This is a decision with its reversal conditions,
not a deferral.

*The case for building it.* It is the only detector this entry found. The defect it detects is
the one this repository treats as worst: a regression the whole suite passes. CI already runs
`build` before `test`. The finding also generalises: any allocation-shaped invariant needs the
same harness, so this gate would be the expensive one and later ones would be cheap.

*The case against, which decides it:*

1. **The defect is minor if it lands.** Build-and-discard costs allocation churn and nothing
   else: 57 ms against 49 on the 700,007-push walk, and 0.6 MB either way. Memory stays bounded
   and every result is unchanged. It is not rare. The bound is per state, so a reused state
   saturates after a few hundred walks ([A15](#a15)), and every push after that takes the
   discard branch. But a discarded item costs what a kept item cost before the bound existed.
   The regression brings back the pre-A12 trace's allocation rate but not its retention, and
   retention was A12's defect.
2. **The instrument is unproven where the gate would run.** The plain-Node row was measured on
   one machine, against a copy of the guard. CI runs Node 24 and 26
   (`.github/workflows/node.js.yml`). Those are two V8s, and the counts depend on their GC
   scheduling. Eight local runs of 0–1 against 6–15 is a wide margin, but it is not evidence of a
   margin on a CI runner. A threshold gate that flakes gets its threshold loosened or its target
   skipped, and then it guards nothing.
3. **It is a new kind of target**, in [F3](backlog-retired.md#f3)'s and [F4](backlog-retired.md#f4)'s class. It would need its own
   target, a `dependsOn` on `build`, and a threshold someone maintains, all for one guard line.

*What would reverse it.* Any one of these:

- a second allocation-shaped invariant that needs the same instrument, which splits the harness
  cost;
- a Node-against-`dist` target built for another reason, which turns this into a case added to
  that target rather than a gate built for it.

If it is reversed, the gate is filed as its own F-series entry and built as a separate track. It
is not built under this entry.

*Until then, the regression is unguarded, and nothing in the tree can detect it.* The early
return before construction in `EvalResult.addTraceBounded` is protected only by review and by
`trace-bound.spec.ts`'s probe header, which names this entry. The plain-Node measurement cannot
be re-run from the tree. Its scripts were never committed, and this entry describes the fixture
without supplying it. The same fact rules out a third reversal trigger, "the regression found
after merge": nothing would find it.

The A12 fix's first step shipped under an exit criterion, number 6, that read:
*"Retention is bounded, not just the count — [a] `WeakRef` probe over a capped walk,
showing an intermediate object pushed past the cap is collectable. Wrong implementation: building
each item and discarding it, which caps `length` while allocating exactly as much."*

**The property does not exclude the wrong implementation.** Build-and-discard constructs the
trace item and drops it, so the traced object is collectable under it *exactly as* under the
real guard. Measured blind: **0.6 MB either way**. It is invisible to the specs too — probed
directly, with build-and-discard in place **all ten of the step's cases passed**. The wall clock
sees it at 16% (49 ms against 57), which is barely above noise for a nursery-local object that
dies immediately.

**A `WeakRef` probe is constructible and would not help.** A minting function in the context —
`make: () => { const o = {}; refs.push(new WeakRef(o)); return o; }`, called past the bound —
yields weak handles with no surviving strong reference. It would not discriminate, because
**retention-shaped detectors cannot see an allocation-shaped defect**. That is the finding, and
it generalises past this criterion.

**The instrument that would see it is GC-event counting**: `perf_hooks`
`PerformanceObserver` over `entryTypes: ['gc']`, which needs **no `--expose-gc`** — and that
last point reopens a question the A12 fix closed. Criterion 6 was ruled an out-of-repo measurement
because Jest has no `global.gc`; a GC-event observer does not need it, so an **in-repo**
detector may be possible after all. Untried. *(Tried 2026-09-23; see below. And the premise
was weaker than it looked: Jest has no `global.gc`, but a spec can obtain `gc` itself. See "What
Jest can do". That would not have saved criterion 6, which failed on shape, not on tooling.)*

**Measured 2026-09-23: the observer tells the two apart in plain Node and in neither Jest
environment.** The fixture was a 700,007-push walk against a cap of 10,000, run once with the real
guard's logic and once with build-and-discard, counting `gc` entries per walk:

| Environment | Real guard | Build-and-discard | Discriminates |
| ----------- | ---------- | ----------------- | ------------- |
| Plain Node, 8 runs | 0–1 | 6–15 | **Yes, every run** |
| Jest, `jsdom` (the Nx preset's environment), 5 runs | 2, then 0 | 1, then 0 | **No** |
| Jest, `node` environment, 5 runs | 0 | 0–2 | **No** |

**The cause of the Jest result is unknown.** There are two candidates, and neither was isolated:
- the JIT eliminating the discarded object by escape analysis in Jest's module wrapper and not in
  plain Node;
- `PerformanceObserver` delivering `gc` entries differently inside Jest's `vm` context.

**The measurement's own limit.** All three rows ran against a **copy of the guard's logic** — a
push function over a plain array — not against the real `EvalResult.addTraceBounded`. So the
plain-Node row shows the instrument can see the defect's shape. It does not show it sees the
defect in the shipped code.

**What Jest can do: detect retention.** *(Added 2026-09-24, by [A20](backlog-retired.md#a20)'s fix.)* The
conclusion below is about the defect in this entry, and it should not be quoted as "GC-based
detection is impossible in Jest". A spec can force a full collection itself:
`v8.setFlagsFromString('--expose-gc')`, then `vm.runInNewContext('gc')`, then
`setFlagsFromString('--no-expose-gc')` straight away so that contexts Jest builds later get no
`gc` global. Pair that with a `WeakRef` to an object built in a closure, yield a macrotask, call
`gc()` and `deref()`. The result is a retention detector that runs in-repo under the `jsdom`
preset. It is in use in `eval.service.memory-leaks.spec.ts`, in the block `contexts passed in
are not retained (A20)`. Its `collect` helper is the pattern to copy, and
[`docs/a20/plan.md`](a20/plan.md) records the probes: remove the `gc()` call and the cases that
expect a collection go red. It ran green on Node 24.5 and 26.4.

**It has a known failure mode: the fixture can keep the target alive.** *(Added 2026-09-25, from
[A8](backlog-retired.md#a8)'s step 1, [`docs/a8/plan.md`](a8/plan.md) § 2.5.)* One case built its target in the
closure and then asserted the throw with `expect(() => service.simpleEval(..., registry)).toThrow()`.
That arrow closes over the target. The errors thrown through it capture a stack frame of the
arrow, and under load something on Jest's path kept one of those errors alive, so `deref()`
returned the target. The failure was intermittent, 4 in 32 contended full-suite runs, with the
code under test holding nothing. It never appeared in isolated runs. **So inside the closure
that builds the target: catch the error yourself, keep only what the assertion needs (its
message, say), and let no closure over the target outlive that function.** A green run proves
little here. Contention is what exposes the leak.

**It does not answer this entry's question**, and that is the distinction that matters.
Criterion 6 and the build-and-discard regression are **allocation-shaped**. Build-and-discard
releases the object exactly as the real guard does, so a retention detector passes on both, as
the `WeakRef` finding above says. A20 was **retention-shaped**: an object kept that should have
been released. That is the one thing a `WeakRef` sees. So the instrument works, but it does not
reopen this entry. The decision at the top, to build no Node-against-`dist` gate for now,
stands on its own three reasons. None of them was "Jest cannot force a GC".

**Conclusion.** No in-repo detector *for this defect* is possible under the current Jest setup.
*(Narrowed 2026-09-24, as above.)* A target that runs
Node against `dist/` after `build:production` would be one, subject to confirming the plain-Node
row against the real `EvalResult`. That target is a new kind of gate, a project closer to [F3](backlog-retired.md#f3)
and [F4](backlog-retired.md#f4) than to this entry. What remains open here is whether to build it. *(Answered
2026-09-24: not now. See the decision at the top of this entry.)*

**What is actually at risk.** Nothing shipped: the guard returns *before* constructing an item,
confirmed by reading and by the wall clock. The risk is a future edit reintroducing
build-and-discard with the whole suite green — the trace bounded, the counters correct, and the
allocation back.

**This is `phase-2-plan.md` § 0.1's failure inside a plan** — a criterion naming a property
rather than a detector — which survived drafting, a revision, two review passes and the
code-reviewer.

*Recorded*: this entry, which carries the reasoning and the measurements; the probe table is
the header of [`trace-bound.spec.ts`](../modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts).
*Verified*: probed 2026-09-19 — build-and-discard against step 1's ten cases, zero red; heap
0.6 MB against 0.6 MB; 49 ms against 57 ms. GC-event counting probed 2026-09-23 from scripts
outside the repository, against a copy of the guard's logic, in the three environments tabled
above.

**Observed 2026-10-07: the GC-forcing detector's known failure mode, once on CI.** Case 1.5 of
[`eval.service.memory-leaks.spec.ts`](../modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts)
failed on the Node 24 job for the post-publish commit of the 0.10.1 / 0.11.0 release, and
passed on the re-run and on Node 26. It found the registry still reachable after one macrotask
and one `gc()`. Not reproduced in 20 runs elsewhere: 12 of the file alone under CPU load, and 8
of the whole suite in band. Its `collect` helper now gives the collector up to five rounds. A
retention planted in `simpleEvalAsync` still fails exactly 1.4 and 1.5, so the rounds tolerate a
short-lived reference without masking a kept one.

---

<a id="a24"></a>
## A24 — An `await` is a pass-through: inside an `async` arrow it hands the walk a promise as an operand

**Package** core · **Kind** decision, then fix · **Status** Open. Opened 2026-10-07 by the Phase 5
plan

`awaitVisitor` pushes a promise — its operand raced against a timer ([A25](#a25)) — and the walk
carries on with that promise as the value. Nothing waits for it. Only promises left in the result
tree are resolved, by `evaluateAsync`, after the walk; the sync entry points resolve nothing. So an
`await` gives the right answer only where its value reaches the result unchanged.

**Reachable today at default parser options.** Top-level `await` is a `SyntaxError` there, but an
`async` arrow parses at `ecmaVersion: 2020`, and the arrow visitor builds a plain closure that
ignores `async`. Measured 2026-10-07:

| Expression | `simpleEval` | `simpleEvalAsync` |
| :--- | :--- | :--- |
| `(async () => await p)()`, `p` resolving to 2 | a promise | `2` |
| `(async () => (await p) * 10)()` | `NaN` | `NaN` |
| `(async () => await p + await q)()` | `"[object Promise][object Promise]"` | — |
| `(async () => (await u).name)()`, `u` resolving to `{ name }` | — | `undefined` |
| `(async () => 1)()` | `1`, not a promise | — |

The same table at top level, with `allowAwaitOutsideFunction` set, is the Phase 5 plan's § 1.2
finding 2. Up to `eval-signals` 0.4.0 its README offered the `async`-arrow form as the way to use
`await` in an expression, and `eval-signal.spec.ts:998-1012` pins it in tail position, where it is
right. **Since 0.5.0 the README says what this entry does**: under "Async expressions", in "Two
signals instead of `await`", an `async` arrow's `await` is a pass-through, right only as the
arrow's result, with `(async () => (await loadUser(id)).name)()` as `undefined` and a second
signal as the tracked way to use a resolved value.

**Two ways out, and leaving it is not one of them**, since it ships silent wrong answers:

- **Refuse**: an `await` that is not in a result position throws, at parse or at walk time, and an
  `async` arrow either does the same or returns a promise. A behavioural `eval-core` release.
- **Implement**: a suspending walk. The Phase 5 plan costs it (§ 3.1, option A) as a rewrite of the
  walker and every visitor, and finds that it still loses Angular's tracking for every read after the
  first `await`.

**Why not Phase 5**: that plan keeps `await` out of its async signal (§ 3.1, option C), and this path
exists whatever Phase 5 decides. Its step 4 rewrote the README line above to say the `await` is a
pass-through — documentation of the defect, not a fix, so the entry stays Open.

*Recorded*: this entry; the evidence is [`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 1.2
findings 2 and 3.
*Verified*: measured 2026-10-07 at d080707, with a throwaway spec deleted the same day (that plan's
§ 1.3, P1 and P1c).

<a id="a25"></a>
## A25 — `awaitVisitor`'s timeout race: an uncleared timer, an undocumented key, a mutated error

**Package** core · **Kind** fix · **Status** Open. Opened 2026-10-07 by the Phase 5 plan

Three defects in `await-expression.ts`, reached wherever `awaitVisitor` runs — an `async` arrow at
default options ([A24](#a24)), or an AST the caller parsed with `allowAwaitOutsideFunction`:

- **A 30 s timer per `await`, never cleared** (`:14-20`, `:56-59`). Each evaluation of the node races
  its operand against a `setTimeout`, and nothing clears it when the operand settles first. Measured:
  one `setTimeout(…, 30000)` and no `clearTimeout`. Under Angular's zone the timer outlives the
  evaluation — `NgZone.hasPendingMacrotasks` was `true` after the result had settled and `false` only
  once the timeout elapsed — so an application waiting for stability, server rendering included,
  waits out 30 s per `await` evaluated. The race does not cancel the operand either.
- **An undocumented context key** (`:50-53`). The timeout is read from
  `context.original['__awaitTimeout']`, documented nowhere and sitting in the consumer's own data
  namespace. Measured from a plain-object context and from an `EvalContext`'s `original`.
- **The caller's error is mutated** (`:67-69`). On a rejection that is an `Error` — the caller's own
  object, by identity — `" at position …"` is appended to its `message`, once per evaluation that sees
  it: a shared error read `boom at position 0-12 at position 0-12` after two.

**A fix has a pinned spec to move.** `eval.service.await.spec.ts:82` asserts the suffix
(`'later at position 0-17'`), so a fix that stops mutating decides where the position goes — a
wrapping error with `cause`, say — and updates that assertion deliberately, raising it first as
CLAUDE.md requires.

**Why not Phase 5**: its async signal keeps `await` out (plan § 3.1), so it reaches this visitor only
through an `async` arrow, exactly as the sync path does today. It adds no reach.

*Recorded*: this entry; [`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 1.2 finding 4.
*Verified*: measured 2026-10-07 at d080707, with a throwaway spec deleted the same day (that plan's
§ 1.3, P2 and P2b).

<a id="a27"></a>
## A27 — A nested `evaluate` writes the enclosing walk's `EvalResult`

**Package** core · **Kind** decision · **Status** Open — recorded, not scheduled. Opened 2026-10-08
by Phase 5 step 1

The arrow-function visitor calls `evaluate(node.body, st)` on the walk's own state
(`arrow-function-expression.ts:29`), and `evaluate` ends in `setSuccess` or `setFailure` on
`st.result`. So every call of an arrow overwrites the enclosing walk's flags and error, mid-walk. The
sync entry points write their own outcome when the outer walk ends, so their flags are right on
return; `evaluateAsync` writes its outcome only after its `await`, so between return and settlement
`state.result` describes the last nested walk to finish.

Measured (Phase 5 plan § 1.3, P7): `load(safe(() => fail()))`, where `safe` catches what its argument
throws, has `isError` `true` and `error` the thrown object when `callAsync` returns, and resolves to
`0`. A succeeding walk that called an arrow reports `isSuccess` `true` at return.

**Related: `EvalResult.start()` clears nothing.** It records a start time and leaves the previous
run's flags and error in place, and `setSuccess` does not clear `error` either. Measured 2026-10-08,
on one state reused across `evaluateAsync` runs: after a run that rejected, a run that resolves to
`20` reads `isError` `true`, and the first run's error, at return; once it settles, `isSuccess` is
`true` and `error` is still the first run's. The sync path shows the second half on a fresh state:
`safe(() => fail())` returns `0` with `isSuccess` `true` and `error` the throw `safe` caught.

**Not scheduled, and nothing downstream needs it.** `eval-signals` does not read `state.result` at
return: the Phase 5 plan's § 3.4 settles every outcome, a walk failure included, through the
promise. Whether a nested walk gets its own result, and whether `start()` resets one, is a behaviour
change on a published path — what `state.result` reports mid-walk and between return and
settlement — so it is a decision before it is a fix.

*Recorded*: this entry; [`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 1.2 finding 1 and
§ 8 q5.
*Verified*: measured 2026-10-08 against the gate-built `eval-core` bundle, by scripts outside the
repo — P7 in that plan's § 1.3, and the reused-state and sync-path cases above. `eval-core`'s source
is the same at cc0761e and 9d5715d.

<a id="a30"></a>
## A30 — `ParserService.parserOptions` reaches the services for no acorn option

**Package** core · **Kind** decision · **Status** Open. Opened 2026-10-10 by the Phase 9 plan

`EvalService`, `CompilerService` and `DiscoveryService` parse through `BaseEval.parse`, which passes
their own options per call — `defaultParserOptions`, or a copy of it (`base-eval.ts:41`). Those carry
all of acorn's `defaultOptions`, 23 keys in all, and `ParserService.parse` lets a per-call key win
(`parser.service.ts:123`). So a value set through `ParserService`'s public `parserOptions` setter is
overridden, on every service path, for every key acorn defines; it reaches only callers of
`ParserService.parse` itself.

Measured: with the setter carrying `allowAwaitOutsideFunction: true`, `preserveParens: true` and
`colonIdentifiers: true`, the options `simpleEval` handed `acorn.parse` held `null`, `false` — the
defaults — and `true`; `simpleEval('await q')` still threw.

**The decision**: whether the setter is meant to configure the services. If it is, the services'
per-call options should stop restating acorn's defaults; if not, its JSDoc should say it configures
direct `ParserService.parse` calls only. Either way the Phase 9 plan relies on the half that works —
a key `defaultParserOptions` does not carry reaches every service — and on `defaultParserOptions`
never carrying `colonIdentifiers` (§ 1.2 finding 4).

*Recorded*: this entry; [`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) § 1.2
finding 4.
*Verified*: measured 2026-10-10 at af81e24 by spying on `acorn.parse`, with a throwaway spec deleted the
same day (that plan's § 1.3, P6).

<a id="a32"></a>
## A32 — The disabled visitor result cache keys a node by a subset of it

**Package** core · **Kind** decision · **Status** Open. Opened 2026-10-10 by [A29](backlog-retired.md#a29)'s
fix

`visitor-result-cache.ts` keys a node by `generateNodeHash` — its type, its `name`, `value`,
`operator` or property name if it has one, and its start — and a context by a hash of its JSON, or for
an `EvalContext` its size and `Date.now()`. A node's operands are not in its key, so `a + b` and
`c + d` both hash as `BinaryExpression_+_0`. Measured: `setCachedVisitorResult` for `a + b` over
`{ a: 1, b: 2, c: 3, d: 4 }`, then `getCachedVisitorResult` for `c + d` over the same context, read `3`.

**Latent, not live.** Both call sites are commented out (`binary-expression.ts:163`,
`member-expression.ts:52`), and the module is imported only by `performance.spec.ts`, which asserts the
cache stays empty. `CLAUDE.md` says not to re-enable it without making the key include the context;
the node half of the key is a second reason, recorded nowhere until now.

**The decision**: delete the module and the spec's two references to it, or redesign both halves of
the key before anything calls it. Nothing calls it today.

*Recorded*: this entry, by the grep the A29 fix ran for other keys built from an object's shape.
*Verified*: measured 2026-10-10 at d839072 with a throwaway spec, deleted before A29's commit.

<a id="a33"></a>
## A33 — The case-insensitive property cache keeps a miss across a same-count key swap

**Package** core · **Kind** fix · **Status** Open. Opened 2026-10-10, after the `eval-core` 0.11.1
tag, from a limit [A31](backlog-retired.md#a31)'s fix documents

Since A31's fix, `getCachedCaseInsensitiveProperty` keeps an object's answers until its own-key count
changes, and returns a cached miss while the count is unchanged (`property-lookup-cache.ts:59-65`). A
key added in the same interval as another is deleted leaves the count as it was, so the miss outlives
the new key: under `caseInsensitive`, a case variant of it is not found. The function's doc comment
says so (`property-lookup-cache.ts:37-38`): "Not caught: a key added in the same interval as another is
deleted, which leaves the count as it was, so a cached miss can outlive it."

Measured: over `x = { a: 1, b: 2 }`, `x.C` reads `undefined`, as it should. After `delete x.a` and
`x.c = 3`, `x.C` still reads `undefined`, while `x.c` reads `3`. Adding `c` without the delete changes
the count, and `x.C` reads `3`.

**Impact: a wrong `undefined`, never a skipped refusal.** On a cached miss the member visitor falls
back to the key as written, then to the prototype's names (`member-expression.ts:190-208`), so the read
returns `undefined` for the new key unless the spelling as written exists. The resolved-key re-check
(`member-expression.ts:211`) runs on whatever key that fallback reads: with an own `constructor`
swapped in the same way, `x.CONSTRUCTOR` was refused before the swap and after it.

**Fix**: compare the own key names, not only their count, on every cached miss. The miss path already
lists them (`property-lookup-cache.ts:57`); the cost is a stored copy per object and the comparison,
on the path A31's measurements timed at 1.5 µs for a miss on a 50-key object. Measure it if this is
fixed.

*Recorded*: this entry; the doc comment at `property-lookup-cache.ts:35-38`, written by A31's fix
(8ace46d).
*Verified*: measured 2026-10-10 at 7ee65fc through `EvalService.simpleEval` with `caseInsensitive:
true`, with a throwaway spec deleted the same day.

<a id="a34"></a>
## A34 — The parse fingerprint's memo does not see options written in place

**Package** core · **Kind** fix · **Status** Open. Opened 2026-10-10 by [A26](backlog-retired.md#a26)'s
fix, Phase 9 step 1

A26's fix keys `ParserService`'s cache on a fingerprint of the parse-relevant options, built once per
pair of option objects, the service's `parserOptions` and the call's, and remembered by identity
(`parse-fingerprint.ts`, `parseFingerprint`). A change made by writing into one of those objects keeps
the old fingerprint. Three kinds of object are open to it: the one the `parserOptions` getter returns,
written in place rather than replaced through the setter; an options object a direct
`ParserService.parse` caller passes again after writing into it; and the exported
`defaultParserOptions`, which `EvalService` and `CompilerService` pass on every parse.
`parseFingerprint`'s doc comment says so.

Measured: (a) after `ParserService.parse('k + 1')`, a `BinaryExpression`, and
`parserOptions.extractExpressions = false` written in place, `parse('k + 1')` was still a
`BinaryExpression` and `parse('k + 2')` a `Program`. That `Program` is cached under the old
fingerprint, so a caller whose own options produce that fingerprint is served it:
`parse('k + 2', { extractExpressions: true })` returned the `Program`, where
`parse('k + 3', { extractExpressions: true })` returned a `BinaryExpression`. (b) With
`defaultParserOptions` written in place to `ecmaVersion: 2022` and `allowAwaitOutsideFunction: true`,
`EvalService.simpleEval('await p')` returned a promise; with both values written back, it still did.
The permissive AST stays cached under the default fingerprint, which is A26's own symptom. (c) With
`o = { ecmaVersion: 2020 }`, `parse('await p', o)` threw a `SyntaxError`; with `o` written in place to
`ecmaVersion: 2022` and `allowAwaitOutsideFunction: true`, `parse('await p', o)` was an
`AwaitExpression`, and so was `parse('await p', { ecmaVersion: 2020 })`, which shares `o`'s old
fingerprint.

**No worse than before A26's fix**: with the text-only key, every read above gives the same answer.
Cached text is served with the old options, and new text is parsed with the new ones. Nothing in this
repository writes into either object (`git grep`).

**A second memo, since Phase 9 step 3.** `CompilerService` keys a compiled string on the same
fingerprint, over `ParserService.parserOptions` and its own per-call options, in a memo of its own, so
a write in place into either leaves a string it compiled before serving the old function. Read, not
measured. No worse than before either: its key was the text alone, and ignored every change.

**Fix, if ever**: freeze the options the service stores, or validate the memo cheaply, for instance
by comparing a stored copy of the values on each lookup. Freezing `defaultParserOptions` or the
getter's object would refuse a write a consumer can make today; a comparison runs on every parse,
on the path the memo exists to keep cheap. Measure it if this is fixed.

*Recorded*: this entry; `parseFingerprint`'s doc comment, written by A26's fix.
*Verified*: measured 2026-10-10 on A26's fix, uncommitted on 6e7fafb, through `ParserService.parse`
and `EvalService.simpleEval`, with throwaway specs deleted the same day; (c) after the step's review
found the per-call case.

<a id="a38"></a>
## A38 — A tag's strings array is not JavaScript's

**Package** core · **Kind** fix · **Status** Open. Opened 2026-10-15 by the code review of the A35
plan's step 1

`tagged-template-expression.ts` passes a tag a plain array of the template's cooked strings, and
builds it again on every evaluation (`templateArguments`). JavaScript passes the call site's
template object instead. That object is frozen, carries a frozen `raw` array of the uncooked strings,
and is the same object every time the site runs. Measured 2026-10-15 against `dist/modules/eval-core`
built from step 1's tree, beside the same tags run natively:

| Property | JavaScript | The evaluator |
| :--- | :--- | :--- |
| Frozen | `true` | `false` |
| `raw`, for `` f`a\nb` `` | `["a\\nb"]`, frozen | `undefined` |
| `` String.raw`a\nb` ``, with `String` bound | `"a\\nb"` | throws `TypeError: Cannot convert undefined or null to object` |
| One site run twice, `` let g = () => f`x`; g() === g() `` | `true` | `false` |

**Not recorded as created.** The walk builds the array but never adds it to `st.createdObjects`. A
write policy is therefore told the walk did not create it. A policy that refuses such targets, as
`eval-signals`' does, refuses a built-in that writes into its first argument when it is used as a tag.
Measured under such a policy:
- `` Object.assign`x` `` is refused, and the policy was asked with `createdByEvaluation: false`;
- `Object.assign(["x"])` is allowed, asked with `true`.

JavaScript freezes the array, so a write into it fails there too. Whether the array counts as
created is part of the fix.

**Fidelity, not security.** No check is skipped: a tag still goes through the call sandbox and the
write policy ([A36](backlog-retired.md#a36)). **It is not in 0.12.1.**

**A direction, not a decision**: build the array from `value.cooked`, and its `raw` from
`value.raw`, freezing both. The fix also has to settle two questions:
- whether one parsed node keeps one array, as a JavaScript call site does;
- what a write policy is told about the array.

*Recorded*: this entry. The policy rows were also the step's code review's N1.
*Verified*: measured 2026-10-15 with a throwaway script outside the repository. It called
`evaluate(parse(…), EvalState.fromContext(…))` against the built bundle, used a subclass of
`EvalContext` whose `checkMemberWrite` refuses what the walk did not create, and ran the same tags
natively beside it.

<a id="a44"></a>
## A44 — Under `caseInsensitive`, a member write to a case variant creates a new key

**Package** core · **Kind** fix · **Status** Open. Opened 2026-10-22 by the
[A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch, whose `caseInsensitive` case
matrix found it. It predates that batch

Under `caseInsensitive`, a member read matches a case variant of the property, and a member write
does not. The write uses the property as the expression spells it, so a case variant creates a new
key beside the one the read matched. Measured 2026-10-22 against the production bundle built from
the batch's tree, under `caseInsensitive`, the context a plain object:

| Expression | On `{ obj: { x: 1 } }` | `obj` afterwards |
| :--- | :--- | :--- |
| `OBJ.X = 2` | gives `2` | `{ x: 1, X: 2 }` |
| `OBJ.X += 1` | gives `2`, from the matched `x` | `{ x: 1, X: 2 }` |
| `OBJ.X++` | gives `1`, from the matched `x` | `{ x: 1, X: 2 }` |
| `obj.X = 2` | gives `2` | `{ x: 1, X: 2 }` |

The root identifier is not the cause, since `obj.X = 2` does the same; an identifier write corrects
its key ([A43](backlog-retired.md#a43) is its case where nothing matches). The read and the write of
one compound assignment or update therefore reach different keys.

**What it holds back.** `update-expression.spec.ts`'s `caseInsensitive` leg spells every source as
the data spells it, `x` and `obj.x`, because a case-variant spelling of the member rows fails on this
entry and not on the update. The fix adds those rows: the matrix again, with the property spelled as
a case variant.

**Related, and documented rather than recorded.** A plain object handed to `new EvalContext`, with
`caseInsensitive` on the context and on the walk, matches no case variant at all, for a read either:
measured the same day, `2 + 3 * A` on `{ a: 10 }` gives `NaN`, where `EvalContext.fromContext`, a
plain object handed to the walk and a case-insensitive `Registry` each give `32`. The `eval-core`
README now says so.

*Recorded*: this entry.
*Verified*: found by the A40/A41 batch's matrix, and measured 2026-10-22 with a throwaway script
outside the repository, against the production bundle: `OBJ.X = 2`, `OBJ.X += 1` and `OBJ.X++`
through a temporary spec, and the table above through `evaluate(parse(…), EvalState.fromContext(…))`.

<a id="a45"></a>
## A45 — An assignment evaluates its target as an operand and its right side unconditionally

**Package** core · **Kind** fix · **Status** Open — **part 1 retired 2026-10-22**, part 2 open.
Opened 2026-10-22 by the [A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch

`assignment-expression.ts` evaluates `node.left` as an operand and `node.right` after it, then applies
the operator to the two values. For a member target it then evaluates the target a second time,
through `evaluateMember`, to find the object and key it writes. Up to 0.13.2 it did that, and wrote,
in every case. JavaScript evaluates a member target's object and key once, reads the target's value
only for a compound or logical operator, skips the right side when a logical assignment
short-circuits, and then writes nothing.

Measured 2026-10-22 against the production bundle built from the batch's tree, through
`evaluate(parse(…), EvalState.fromContext(…))`, beside the same expressions run natively. The table
was one; its short-circuit and policy rows are part 1's now, and the rest are part 2's.

**Two parts, and the first is fixed.** Part 1 is a logical assignment that short-circuits; part 2 is
the target evaluated as an operand, and twice for a member.

**1. A logical assignment that short-circuits — Retired 2026-10-22, fixed.** Released
2026-10-23 in `eval-core` 0.13.3, tagged 021d5e4.

| Expression | Up to 0.13.2 | Now | JavaScript |
| :--- | :--- | :--- | :--- |
| `a \|\|= f()`, `a` truthy | `f` called once | `f` not called | `f` not called |
| `a &&= f()`, `a` falsy | `f` called once | `f` not called | `f` not called |
| `a ??= f()`, `a` not nullish | `f` called once | `f` not called | `f` not called |
| the same three on a member target, `o.a` | `f` called once each | `f` not called | `f` not called |
| `o.g \|\|= 1`, the getter truthy | getter 2, setter 1 | getter 1, setter 0 | getter 1, setter 0 |
| `o.a \|\|= 9`, `o.a &&= 9`, `o.a ??= 9`, each short-circuiting, under a policy that refuses what the walk did not create | refused, `o.a` unchanged | no write, so nothing to refuse | no write, so nothing to refuse |

The value of every short-circuited row was already JavaScript's: the evaluator computed the operator
on the two values and wrote back the value the target already held. What differed was effects: a
right side that should not run ran, and a logical assignment always wrote, so a write policy refused
a short-circuited one that JavaScript would not write.

The fix is `logical-expression.ts`'s rule, applied once the left value is popped: for `||=` on a
truthy value, `&&=` on a falsy one and `??=` on one that is not nullish, the visitor pushes that
value and returns. The right side is not evaluated, and `evaluateMember`, the policy,
`assignToBinding` and `safeSetProperty` are not reached. The `o.g ||= 1` row follows from that
without being aimed at: its second read was `evaluateMember`'s, which only the write path calls. A
logical assignment that does not short-circuit still reads a member target twice; that is part 2.

Logical assignment is ES2021, and `EvalService` parses at `ecmaVersion: 2020`, which refuses it at
the parse. It reaches the visitor only through a caller's own parser options, as `parse` with
`ecmaVersion: 2021` does.

*Verified*: `assignment-expression.spec.ts`, "a logical assignment that short-circuits (A45 part 1)",
64 cases. 28 compare against the same expression run natively: the 16 identifier value rows, each
operator short-circuiting and not in both modes, and the 8 member value rows, for the result, the
target afterwards and the right side's call count; the 3 policy rows above that do not throw, for
the result; and the `o.g ||= 1` row, for the result and the getter and setter counts. The 24
recorder rows check the writes, through a context's `set`, a recording policy and a proxy on the
member's object, against each row's short-circuit flag, which the value rows confirm natively. The
other 12 check values written in the case: the policy's refusal of a write that does not
short-circuit; the read hooks of `a ||= b` and the `'after'` node hook of `a ||= f()`, each
short-circuiting and not; the value stack and the scopes after the expression runs in an arrow body;
`const c = 1; c ||= 2`, which gives `1`; `TRUE ||= 1` under `caseInsensitive`, which gives `true`;
and `fetch ||= 1`, refused by the funnel as `fetch || 1` is, a pin of existing behaviour that passed
before the fix and does not discriminate it. Each probe was applied alone and reverted, and its
failures read case by case:
- the right side evaluated once, before the test: 17 red, every short-circuiting call-count row, the
  read hook rows, the two short-circuiting arrow rows and the short-circuiting node hook row;
- the write kept on a short-circuit: 18 red, the short-circuiting recorder rows, the three policy
  rows, and the getter, `const` and `TRUE` rows;
- `??=` tested as falsy: 14 red, every `??=` row on `0` or `''`;
- no early return, falling through to the old path: 35 red, the unfixed code's set and the four rows
  added since, each on its first effect assertion: call count, writes, the policy's refusal, the
  read of `b`, the getter count, a write path's refusal, or a second `'after'` event. The values stay
  right, since `evaluate` pops the top value and the stray one sits under it;
- since that probe reds the arrow rows before their stack assertion, one more: a second push of the
  value on the short-circuit path, 2 red, the two short-circuiting arrow rows, at the stack
  assertion. Nothing else in the spec sees a stray push;
- the short-circuit path's `afterVisitor` dropped: 1 red, the short-circuiting node hook row, at
  `completed`. Its event count stays 1, since `exit` flushes the open frame when the enclosing
  statement closes, synthesised and without a value; the row asserts both.

The node hook row that does not short-circuit is the arm that tells the two apart, on the path the
fix leaves alone; no probe reds it. The `o.g ||= 1` row was first measured after the fix through a
temporary spec, deleted after, and is now the spec's getter row.

**2. A target evaluated as an operand — Open; needs a plan: it reopens Phase 1's decision that
assignment targets emit read events
([`side-effects/phase-1-plan.md`](side-effects/phase-1-plan.md):274-280).**

| Expression | The evaluator | JavaScript |
| :--- | :--- | :--- |
| `o.g = 1`, `g` an accessor | getter 2, setter 1 | getter 0, setter 1 |
| `o.g += 1` | getter 2, setter 1 | getter 1, setter 1 |
| `o.g &&= 1`, the getter truthy | getter 2, setter 1 | getter 1, setter 1 |
| `getObj().x = 1` | `getObj` called twice | once |
| `obj.fetch = 1` and `fetch = 1`, `fetch` the listed function | throws `Access to dangerous function "fetch" is blocked for security reasons`; the function stays | writes `1` |

The `o.g &&= 1` row was measured 2026-10-22 with part 1's fix, through the same temporary spec; it
is the double read on a logical assignment that does not short-circuit. What differs is effects, in
two kinds:
- **a member target is evaluated twice**: its getter and its object expression run twice, and the
  write reaches whatever the second evaluation yields;
- **the funnel refuses an assignment over a listed function**, since the target is read as an
  operand even for `=`. That refusal is the read's, not the write's. No write path refuses
  overwriting a listed function: `++obj.fetch` has overwritten one since before 0.13.0, and
  `obj.fetch++` does from [A40](backlog-retired.md#a40)'s fix, with `NaN`, and no function value
  reaches anything. `SECURITY.md` states it.

**Fidelity; no refusal skipped.** Every extra evaluation passes through the same visitors as the
first, so each extra read and call is checked as the first is, and the table's deviations add a
refusal, the funnel's at an `=` target, rather than skip any.

**A direction, not a decision**: evaluate a member target's object and key once, and read its value
only for a compound or logical operator. That is the decision Phase 1 made the other way: `a.b = 1`
reports a read of `a.b`, by design. It costs three things, which is why it needs a plan:
- **`evaluateMember`'s split, on the M19 hot path.** `evaluateMember` resolves the object and key
  and reads the value in one call, for every member read, a call's callee and an update's operand as
  well as an assignment's target. Resolving without reading splits it, on the member read the
  [A35 plan](a35/plan.md)'s M19 measured nearest the performance line.
- **Node hooks and trace.** The target is walked as an operand, `callback(node.left)`, so a node
  hook sees it enter and exit and the trace records its value. Not walking it changes both, for
  every consumer that watches them.
- **`SECURITY.md`.** It removes the funnel's refusal of `obj.fetch = 1` and `fetch = 1`, which would
  then write as an update does. "Reads that only inspect the value throw too" changes with it, and
  which release can carry it is part of the fix.

`fetch ||= 1` is not part 2's: a logical assignment reads its target's value in JavaScript too, so
the funnel's refusal there stays, as it does for `fetch || 1`. Part 1's spec pins it.

**Logical assignment is unreachable downstream today**, because `CompilerService`, `/reactive` and
`/signals` pass `defaultParserOptions`, at `ecmaVersion: 2020`, on every call. Whoever raises the
default `ecmaVersion` to 2021, or writes into `defaultParserOptions` in place (the route
[A34](#a34) records), has to revisit the downstream sites that call a `SignalContextWriteError`
"illegal on every recompute with every dataset": a short-circuit makes that write error depend on
the data. `git grep` on 2026-10-22 finds three in source (`eval-signal.ts` and `error-policy.ts`
twice), four in specs (`eval-signal.spec.ts`, `field-schema.spec.ts`, `rules.spec.ts` and
`evaluate-rule.spec.ts`), and one in `eval-forms`' README; that package's CHANGELOG says it of a
released version.

*Recorded*: this entry; `SECURITY.md`, "Reads that only inspect the value throw too".
*Verified*: noticed in the A40/A41 batch, while correcting `SECURITY.md`'s account of why
`obj.fetch = 1` throws. Measured 2026-10-22 with a throwaway script outside the repository, against
the production bundle with the Angular compiler loaded, each row run natively beside it.

<a id="a47"></a>
## A47 — An arrow's parameter scope is pushed without the walk's options, so it is case-sensitive under `caseInsensitive`

**Package** core · **Kind** fix · **Status** Open. Opened 2026-10-22 by the code review of the
[A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch (its N1). It predates that
batch. Not scheduled

`arrow-function-expression.ts:35` pushes the parameter scope as `contextPush(st.context, newContext)`,
without `st.options`. So under `caseInsensitive` the scope is a plain record, read by exact key, while
the context and every other scope are case-insensitive. The other three scope pushers pass the
options: `program.ts:50`, `block-statement.ts:54` and `for-statement.ts:81` each call
`contextPush(st.context, {}, st.options)`, and `block-statement.ts`'s comment says why: `fromContext`
copies a plain record into a `Registry` only when the option reaches it.

Measured 2026-10-22 against the production bundle, under `caseInsensitive`, through
`EvalContext.fromContext(…, { caseInsensitive: true })`:

| Expression | Context | Result | Context afterwards | JavaScript, read case-insensitively |
| :--- | :--- | :--- | :--- | :--- |
| `(x => X)(1)` | `{}` | `undefined` | unchanged | `1` |
| `(x => (X = 5, x))(1)` | `{ x: 10 }` | `5`: the parameter was written | `x` still `10` | `5` |
| `(x => (X = 5, x))(1)` | `{}` | `1`: the parameter was not written | `X` holds `5` | `5`, and the context unchanged |
| `{ let x = 1; X }` | `{}` | `1` | unchanged | `1` |

The second row writes the parameter only by way of the context: `getKey` corrects `X` to `x` through
the context, and `assignToBinding` then finds `x` in the parameter scope. With nothing to correct it
against, the third row writes the consumer's context. Before
[A43](backlog-retired.md#a43)'s fallback it wrote the key `undefined` there. The last row is the
contrast: a block scope, pushed with the options, matches the case variant. Every row leaves the
scope stack empty.

**Fidelity**: an arrow body reads and writes its own parameters case-sensitively in a mode that
promises otherwise, and a write can land on the consumer's context instead of the parameter.

**Since [A46](backlog-retired.md#a46), a literal-named parameter is the exception.** A case-variant
write to one, `(undefined => (UNDEFINED = 2))(1)` or `(TRUE => (True = 2))(1)`, throws
`Assignment to read-only name` instead of rebinding the literal on the consumer's context, the third
row's outcome before A46. `read-only-names.spec.ts` pins the throw. This entry's fix turns it into a
parameter write, and moves that pinned row.

*Recorded*: this entry.
*Verified*: found by the batch's code review. Re-measured 2026-10-22 with a throwaway script outside
the repository, against the production bundle with the Angular compiler loaded.

---

# B. `eval-core` — security and hygiene

[B1](backlog-retired.md#b1)–[B6](backlog-retired.md#b6) are retired.

---

# C. `eval-signals`

[C1](backlog-retired.md#c1)–[C7](backlog-retired.md#c7) are retired. None of the seven entries was
ever recorded in `ROADMAP.md`.

---

# D. `eval-forms`

<a id="d7"></a>
## D7 — `toSignal`'s `assertNotInReactiveContext` throws out of the mirror

**Package** forms · **Kind** accepted · **Status** Open, documented

`bindFieldProperties` throws if called inside an `effect()` or `computed()`, with an error naming
`toSignal` and nothing naming this library. First noticed in Phase 4 step 3, **confirmed
undischargeable in step 5**, and now a README line. Kept here because "accepted and documented" is
a state a later phase may want to revisit, not a closed question.

*Recorded*: [`forms/step-3-summary.md` § 5.2](forms/step-3-summary.md),
[`forms/step-4-summary.md` § 5.2](forms/step-4-summary.md).

<a id="d8"></a>
## D8 — `warnOnNestedSignals` runs once, at construction

**Package** forms · **Kind** accepted · **Status** Open, documented

A nested-signal value added to a source *afterwards* gets no dev-mode diagnostic, so the one misuse
`eval-signals` detects for us goes undetected on exactly the path Phase 4 chose (a live source).
Small — the shape is a developer mistake in the *source*, not in a server-supplied schema — but a
direct consequence of choosing a live source. Related to [D4](backlog-retired.md#d4), which was
filed as the same diagnostic failing to reach `/signals` for a different reason. D4's top-level
case is fixed. The nested case, where the diagnostic does not reach `/signals`, is unchanged and
documented in the package README.

*Recorded*: [`forms/phase-4-plan.md` § 3.5.6](forms/phase-4-plan.md).

<a id="d13"></a>
## D13 — A rule whose top-level statement `eval-core` refuses registers, and renders blank

**Package** forms · **Kind** decision, then fix · **Status** Open, narrowed. Opened 2026-10-10 by the
Phase 9 plan; its step 6 refuses a top-level label, released 2026-10-14 in `eval-forms` 0.5.0, tagged
3466c80

Both adapters accept any rule that parses: `/signals`' `prepare` parses, guards identifiers and
compiles; `/reactive`'s `validate` does the same before `createEvalSignal` compiles. Neither asks
whether `eval-core` will evaluate the statements it parsed, and `dispatchStatement` throws
`Unsupported statement type` for everything outside its six (`dispatch-statement.ts:66`) — a label, a
`while`, a `switch` — on every evaluation. Under the default `onError: 'undefined'` that is a blank
field, with nothing reported.

Measured for a label, which is what a legacy rule starting with a colon name parses as: `/reactive`
bound `visible: 'Q1:1 == 1'` and read `visible()` `false` and `text()` `''`; `/signals` registered
`evalVisible(p.city, 'Q1:1 == 1')` and the field read `hidden()` `true`. The other statement types take
the same path by construction.

**Phase 9 step 6 closed the top-level label case**, released 2026-10-14 in `eval-forms` 0.5.0:
`guardIdentifiers` refuses a `LabeledStatement` among the program's own statements, at both entry
points, since a forgotten `colonIdentifiers` switch is exactly that shape (that plan's § 3.8). A label
nested in a function body is left alone, since the function may never be called.

**What remains.** A label inside a top-level block — `{ L: 1 }`, or `{a:b}` with the switch off —
still registers and renders blank: the block always runs and the label in it throws, but only the
program's own statements are checked. So does every other statement `eval-core` refuses. **The rest
is the decision**: refusing every unsupported top-level statement at registration needs
`eval-core`'s list of supported statements, which it does not publish, and a copy in this package
would drift — the problem the Phase 5 plan's § 3.6 solved for `abortSignalKey` by asking `eval-core`
instead of copying its list.

*Recorded*: this entry; [`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) § 1.2
finding 10; narrowed by that plan's step 6 (Revision 8).
*Verified*: measured 2026-10-10 at af81e24 for a label, through both adapters, with a throwaway spec
deleted the same day (that plan's § 1.3, F1). The refusal and its bound are pinned by
`modules/eval-forms/signals/src/lib/guard-identifiers.spec.ts`, through both adapters with the switch
on and off: a top-level label refused, a label in a function body and one in a top-level block
`{ L: 1 }` registered, both reading blank.

---

# E. Deferred to phases that are not yet defined

<a id="e1"></a>
## E1 — Form-state keys across both adapters

**Package** forms · **Kind** phase · **Status** Open — **no phase reserved**

`touched` / `dirty` / `pristine` need `control.events` with a `TouchedChangeEvent` /
`PristineChangeEvent` filter (`forms.d.ts:2691`, available at the `>=19` floor); `status` / `valid`
need `statusChanges` (`forms.d.ts:2711`). The mechanism exists at `/signals` and does not at
`/reactive`.

**Settled out of scope twice, on the same ground:** an expression must mean the same thing at both
entry points, and `visible: "touched"` working under `/signals` while silently resolving
`undefined` under `/reactive` is worse than the key being unsupported at both. Shipping it at one
adapter would ship the asymmetry.

**The shape is unresolved**, which is the other reason. A flat `Record` cannot hold per-field state
without either nesting signals — which `warnOnNestedSignals` correctly reports as a mistake — or
collapsing all state into one `signal({...})`, which destroys the per-key tracking the whole design
rests on. The two candidates are a namespaced flat key per state per field (`email$touched`) or the
single signal; neither is costed.

**Recorded three times before it was reserved.** Phase 4 § 3.5.6 and § 8 q2, Phase 6 § 8.2 and its
§ 2 out-of-scope list all defer it and Phase 6 names it "a Phase 7 candidate covering both adapters
together" — while stating that registering Phase 7 in `ROADMAP.md` was "a separate docs change, not
this phase's". No phase made it. `ROADMAP.md` now reserves the number, in its "Phase 7 and Phase 8"
section, and points here: this entry holds the brief.

*Recorded*: [`forms/phase-4-plan.md` § 3.5.6](forms/phase-4-plan.md) and § 8 q2;
[`forms/phase-6-plan.md` § 8.2](forms/phase-6-plan.md).

<a id="e2"></a>
## E2 — Arrays

**Package** forms · **Kind** phase · **Status** Open

The same unsolved problem at both adapters, reached from two directions:

- **`/signals`** — `applyEach` and `ItemFieldContext` exist, and a per-row rule would read
  `ctx.index`. Phase 6 § 8.4 calls the shape "obvious" and leaves it as **the only one of its six
  open questions still open**.
- **`/reactive`** — a `FormArray` of N rows is N × the field count of contexts under Phase 4
  § 3.4.1's rule, and it raises a naming problem the flat case does not have: an expression inside
  row 3 that says `quantity` means *this row's* `quantity`, which needs a per-row scope the current
  field/form two-level composition has no third level for.

Additive when it comes — a third source in the join, not a change to the two that exist. Settling
it without a consumer driving the shape would be speculative.

*Recorded*: [`forms/phase-6-plan.md` § 8.4](forms/phase-6-plan.md);
[`forms/phase-4-plan.md` § 8 q5](forms/phase-4-plan.md).

<a id="e3"></a>
## E3 — `dependencies` introspection at form scale

**Package** forms · **Kind** phase · **Status** Open

`EvalSignal` exposes it, and a form binding could use it to answer "which fields does this rule
depend on" for a form-builder UI — described in the Phase 4 plan as "plausibly the most valuable
thing this library could surface for its actual audience". It is also off by default for a good
reason (Phase 3 § 3.4).

Never in `ROADMAP.md`. Its own cross-reference has already been renumbered once for going stale:
it originally read "the most likely Phase 6 feature", written before Phase 6 had a claimant.

*Recorded*: [`forms/phase-4-plan.md` § 8 q4](forms/phase-4-plan.md).

<a id="e4"></a>
## E4 — Short-circuiting / value-rewriting hooks

**Package** core · **Kind** phase · **Status** Open, by design

A `before` hook that returns a replacement value would let consumers implement memoization, access
policy, or mocking. Not in Phase 1 because every one of the 19 visitors would need to honour the
return value and skip its own body — a change to the evaluation contract, not an addition to it.

**The door is deliberately held open**: `EvalNodeHook` returns `void` (not `never`, not `unknown`),
so a future `EvalInterceptor` kind can be added as a separate registry with its own dispatch point,
without touching `EvalNodeHook`'s signature or any existing consumer. Kept here so that property is
not lost in a tidying edit.

*Recorded*: [`side-effects/phase-1-plan.md` § 8](side-effects/phase-1-plan.md).

---

# F. Tooling and docs

<a id="f16"></a>
## F16 — Workspace dependency advisories

**Package** repo · **Kind** fix · **Status** Open — **part 1 retired 2026-09-27**, part 2 open,
narrowed 2026-10-23 to the `undici` override, and the `qs` override held. A re-audit 2026-09-30 found
22 new findings, and they were fixed the same day (below).
Recorded 2026-09-26, by the commit that cleared the Dependabot high alert

**None of this reaches a consumer.** Every package below is a root workspace dependency. No
`modules/*/package.json` depends on `nx` or `smol-toml`. The published peer ranges
(`@angular/core >=19.0.0` in all three, plus `@angular/forms >=19.0.0` in `eval-forms`) admit the
patched Angular versions and do not pin the vulnerable ones. So the work here is on the workspace's
own toolchain, and no release is needed for it.

**Four parts, and they are unrelated.** The third, recorded 2026-10-06, and the fourth, recorded
2026-10-10, are the last two sections below.

**1. The 9 Angular moderates — Retired 2026-09-27, fixed.** `npx nx migrate 23.2.1` moved `nx`
and every `@nx/*` package from 23.1.1 to 23.2.1, and with them the whole Angular set, each pinned
exactly in the root `package.json`:

| Packages | Before | After |
| -------- | ------ | ----- |
| The eight framework packages, `@angular/compiler-cli`, `@angular/language-service` | 22.0.8 | 22.1.8 |
| `@angular/cli`, `@angular-devkit/build-angular` / `core` / `schematics`, `@schematics/angular`, and the nested `@angular/build` | 22.0.9 | 22.1.9 |
| `ng-packagr` | 22.0.2 | 22.1.1 |
| `angular-eslint` and the three `@angular-eslint/*` | 22.1.0 (`angular-eslint` was `^22.0.0`) | 22.5.0 |
| `zone.js` | 0.16.2 | 0.16.3 |

The two version lines are Angular's own. The framework and the CLI tooling carry separate patch
counters, and 22.1.8 and 22.1.9 are the latest of each in the 22.1 line. Both are past both
advisories below. `npm audit --package-lock-only` then reported **0 at every severity**. The three
migrations 23.2.1 ships (`nx` `23-2-0-set-cache-on-executor-target-defaults` and `@nx/js`'s two
pnpm cache migrations) ran and changed nothing. No Angular migration applied between 22.0 and
22.1. The gate kept its counts (1076 / 131 / 261), and `dist/`'s declarations changed only in
Angular-generated `ɵprov` metadata.

Two things the next `nx migrate` here will hit, since part 2 is likely removed by one:

- **The upgrade still did not resolve under a plain `npm install`.** Moving the whole set together
  was necessary, as predicted below, but it was not sufficient. `npm install` failed `ERESOLVE`
  against the locked 22.0.x peer set, first on the `@angular-eslint/*` peers and, with those
  uninstalled, on `@angular/animations` as below. It went through with `npm install --force`. The
  result was then checked: a plain `npm install` on it left `package-lock.json` byte-identical,
  and `npm ls --all` reported no `invalid` entry that the 22.0.x tree did not already have (`vite`'s
  optional peers `@types/node` and `yaml`).
- **On Windows, `nx migrate` can silently bump only `nx`.** It resolves its own installed version by
  testing whether `nx/package.json`'s resolved path `startsWith` the workspace root, case
  sensitively. When `NX_WORKSPACE_ROOT_PATH` spells the drive `d:` and Node resolves it as `D:`, the
  test fails and the whole `@nx/*` package group is skipped, with no warning. Correcting the variable's case
  fixed it.

*As recorded 2026-09-26:* **The moderates that remain: 9, all Angular framework packages at
22.0.8.** Two advisories account for all of them:

| Advisory | Reported on | Patched in |
| -------- | ----------- | ---------- |
| GHSA-p297-fm68-3q8c (`HttpTransferCache` information leak) | `@angular/common` | 22.1.1 |
| GHSA-hh8m-fm6v-7cvg (host-binding sanitization bypass) | `@angular/core`, `@angular/compiler` | 22.1.0 |

Audit flags the other six only as dependents of those three: `@angular/animations`,
`@angular/compiler-cli`, `@angular/forms`, `@angular/platform-browser`,
`@angular/platform-browser-dynamic` and `@angular/router`. The eight framework packages are in the
root `package.json`'s `dependencies`, pinned exactly at `22.0.8`, and `@angular/compiler-cli` is a
`devDependency` pinned at `22.0.8` too.

**Bumping the eight framework packages alone does not resolve.** Measured 2026-09-26 on npm 12.0.1:

```sh
npm install --package-lock-only --save-exact \
  @angular/animations@22.2.0 @angular/common@22.2.0 @angular/compiler@22.2.0 \
  @angular/core@22.2.0 @angular/forms@22.2.0 @angular/platform-browser@22.2.0 \
  @angular/platform-browser-dynamic@22.2.0 @angular/router@22.2.0
```

It exits 1 with `ERESOLVE could not resolve`. The resolver reports `Found:
@angular/animations@22.0.8`, held as a `peerOptional` of `@angular/platform-browser@22.0.8`, which
`@angular-devkit/build-angular@22.0.9` and its nested `@angular/build@22.0.9` both reach through
`peerOptional @angular/platform-browser@"^22.0.0"`. The conflicting peer is
`@angular/core@22.2.0`, required exactly by `@angular/animations@22.2.0`. The command left out
`@angular/compiler-cli`, `@angular/language-service`, `@angular/cli` and the devkit packages, which
are all still at 22.0.x. What the measurement shows is that the eight-package bump does not resolve
on its own. It was not re-run with those packages included, so it does not show which set does.
The expected fix is a workspace Angular minor upgrade that moves the framework, `@angular/cli` and
the devkit packages together, not a lockfile edit. `npm audit fix --force` proposes
per-package bumps to 22.2.0 and warns they fall outside the stated dependency range. It was
not run.

**2. The `smol-toml` override is temporary.** GHSA-7w5x-hrqm-74c2 (`smol-toml <=1.7.0`, DoS on
malformed TOML) was the only high: 12 `npm audit` findings from one advisory (one Dependabot
alert), and the other 11 were `nx`/`@nx/*` flagged as its dependents. `smol-toml` enters only
through `nx`, which pins it exactly (`1.6.1` in both 23.1.1 and 23.2.1, the latest stable on
2026-09-26), so upgrading `nx` would not have fixed it.
`package.json` therefore carries `"smol-toml": "^1.7.1"` inside `overrides.nx`, beside the existing
`brace-expansion` override. That resolved to 1.9.0.

**Remove the override** once a stable `nx` depends on `smol-toml >= 1.7.1`. The 23.3.0 prereleases
already do. The lockfile will keep recording `nx`'s own declared `"smol-toml": "1.6.1"` under
`node_modules/nx` while the override is in place. That line is `nx`'s manifest copied into the
lockfile, not an installed version. `node_modules/smol-toml` is the entry to check.

**Still live on 23.2.1.** Re-checked 2026-09-27, after part 1 moved the workspace onto `nx`
23.2.1. `nx` still declares `"smol-toml": "1.6.1"`, and `node_modules/smol-toml` resolves to 1.9.0
under the override. Both overrides in `overrides.nx` stay.

**The three overrides retired 2026-10-23; part 2 now holds `undici` alone.** `nx` 23.3.0 declares
`smol-toml` 1.9.0 and `brace-expansion` 5.0.12 and has no `axios` dependency, so
[F21](backlog-retired.md#f21)'s toolchain bump removed `brace-expansion`, `smol-toml` and `axios`
from `overrides.nx`, and the tree resolves the same `smol-toml` 1.9.0 and `brace-expansion` 5.0.12
without them. But 23.3.0 pins `undici` at exactly `7.29.0`, which carries two high advisories
(GHSA-rfgv-xxqx-mfg5, GHSA-w293-vg96-wgc3) among ten against `<7.29.1`, and 24.0.0 pins the same. So
`overrides.nx` is now `{ "undici": "^7.29.1" }`, which resolves 7.30.1. It is **nested under `nx`**
because the tree's other `undici` is `jsdom`'s 8.11.2, which a top-level override would force down a
major. **Remove it** once a stable `nx` no longer pins `undici` below 7.29.1. As with `smol-toml`, the
lockfile keeps `nx`'s declared `"undici": "7.29.0"` under `node_modules/nx`;
`node_modules/nx/node_modules/undici` is the entry to check.

**Moving the Angular set, and `nx`, without `--force`** — the method of 2026-10-23, which replaces
the `npm install --force` the rounds before it used (part 1 and 2026-09-30's fix, below). The
framework packages peer on each other at exact versions, so a plain `npm install` fails `ERESOLVE`
against the locked set. Naming every package in one `npm install`, or uninstalling and reinstalling
them, fails the same way, since they stay in the tree as `jest-preset-angular`'s peers. What works:
delete the lockfile entries of the packages being moved that are still locked at the old version,
reinstall at exact versions (`npm install --save-exact`, `-D` for the devDependencies), and prove
the result with a clean `npm ci` and an unchanged lockfile. Pass a multi-package `npm install` from a
POSIX shell: PowerShell's `npm` shim joins an array into one argument. And **rename `allowScripts`'
`nx@<version>` key with `nx`**, or npm blocks the new version's postinstall.

**Re-audited 2026-09-30: 22 findings, 14 high and 8 moderate, none critical.** The lockfile's
only change since part 1's 0 is [F5](backlog-retired.md#f5)'s `js-sha256` 0.10.1 → 1.0.0, which
is not flagged, so these are advisories published since. Nothing was fixed. Each row is
one vulnerable package, with every advisory audit reports against it and the root `package.json`
entry that brings it in. The last column is the findings audit adds for packages that only depend
on it:

| Package (resolved) | Advisories | Patched in | Root dependency | Flagged as dependents |
| ------------------ | ---------- | ---------- | --------------- | --------------------- |
| `@angular/router` 22.1.8 | GHSA-ff3f-86qr-9cv3 (high; SSR DoS via numeric URL matrix parameters) | 22.2.0 | itself, in `dependencies` | — |
| `webpack-dev-middleware` 8.0.3 | GHSA-g84c-rxfj-3j2c (high; path traversal via a non-slash-terminated `publicPath`) | 8.3.0 | `@angular-devkit/build-angular` 22.1.9 (dev) | `@angular-devkit/build-angular` |
| `axios` 1.18.1 | Twelve, 7 high and 5 moderate: GHSA-c29m-xwm3-cm6r, -mghh-pgcx-3jjj, -x97p-jq2g-jp4f, -3pq3-5fj3-cg6v, -542g-h47m-68v8, -m8m8-qj5v-23w3, -r4gj-5m52-g5wh (high); GHSA-vh66-26gq-q6x8, -9fr6-4gfg-395g, -j8rh-479h-cp32, -4hqw-qxg8-jxx2, -44g4-m2mj-wpvx (moderate) | 1.20.0 | `nx` 23.2.1 (dev), which pins `axios` 1.18.1 exactly | `nx`, `@nx/workspace`, `@nx/js`, `@nx/angular`, `@nx/eslint`, `@nx/eslint-plugin`, `@nx/jest`, `@nx/web` |
| `brace-expansion` 1.1.18, 2.1.4, 5.0.9 | GHSA-qhr7-859c-m2p7 (high), GHSA-6j4f-fj2g-mc7p (high), GHSA-q2hr-2g5m-vwhr (moderate) | 1.1.21 / 2.1.7 / 5.0.12 for all three | 1.1.18: `eslint`, `jest`, `postcss-url` (all dev), each through `minimatch` 3.1.5. 2.1.4: `jest`, through `glob` 10.5.0. 5.0.9: `nx` (dev), and `@nx/jest` through `minimatch` 10.2.5 | — (counted in `nx`'s chain above) |
| `undici` 8.10.0 | Eleven, 3 high, 5 moderate and 3 low: GHSA-rfgv-xxqx-mfg5, -w293-vg96-wgc3, -vp8m-p9jh-q5pm (high); GHSA-3wwx-pv8p-q78v, -pmjh-fq2x-6v4x, -3xpg-4rpp-hhhm, -2jfj-6hjv-fm6j, -rx4f-c7p8-82vq (moderate); GHSA-r53p-7pc4-xj5r, -2gqq-gqf2-x968, -8436-99hf-9mmv (low) | 8.10.2 | `jest-preset-angular` 17.0.0 (dev), through `jsdom` 30.0.1 | — |
| `fast-uri` 3.1.7 | GHSA-hrr3-gc8f-f4qj (moderate) | 3.1.8 | `@angular-devkit/core` 22.1.9 (dev), through `ajv` 8.20.0 | — |
| `js-yaml` 5.2.2 | GHSA-r3ph-w7gj-g6xm (moderate) | above 5.4.0 | `verdaccio` 6.9.2 (dev), through `@verdaccio/config` 8.2.1 | `verdaccio`, `@verdaccio/config`, `@verdaccio/auth`, `@verdaccio/middleware`, `@verdaccio/signature`, `verdaccio-audit` |

Seven packages and their 15 dependents make the 22. The other copies in the tree, `js-yaml` 4.3.2 /
3.15.2 and `webpack-dev-middleware` 7.4.5, are not flagged. `smol-toml` is not flagged either.

**`brace-expansion` GHSA-q2hr also covers the version `overrides.nx` pins.** The override is
`"brace-expansion": "^5.0.9"`, and `nx` 23.2.1 declares exactly `5.0.9`. Both resolve to the root
`node_modules/brace-expansion` 5.0.9. The other two advisories cover it as well, but GHSA-q2hr's
range (`>=4.0.0 <5.0.12`) reaches furthest, so the override's floor would have to reach 5.0.12 to
clear all three. `nx` 23.2.1 is still `latest`, and it still pins `axios` 1.18.1 and
`brace-expansion` 5.0.9, so an `nx` upgrade fixes neither today. Audit's `--force` remedy for both
is `nx` 22.6.5, a major downgrade. Audit says a plain `npm audit fix` covers `undici`, `fast-uri`
and `js-yaml`. That was not run.

**None of the 22 reaches a published package.** The three source manifests declare no
`dependencies`. The published 0.6.1 / 0.1.3 / 0.2.4 manifests each carry only `tslib ^2.3.0`,
which ng-packagr adds and audit does not flag. None of their peers is flagged either: `@angular/core`,
`@angular/forms`, `rxjs`, `acorn`, `acorn-walk`, `js-sha256`, and the two `@zvenigora` packages.
`@angular/router` is a workspace dependency and no package's peer.

**Fixed 2026-09-30, the same day, with no release.** One commit, toolchain only:

| Change | Clears |
| ------ | ------ |
| The eight framework packages, `@angular/compiler-cli` and `@angular/language-service` 22.1.8 → 22.2.1; `@angular/cli`, the three `@angular-devkit/*` and `@schematics/angular` 22.1.9 → 22.2.0 (the nested `@angular/build` with them); `jest-preset-angular` 17.0.0 → 17.0.1 | `@angular/router` GHSA-ff3f; `webpack-dev-middleware` through the devkit |
| `overrides.nx` gains `"axios": "^1.20.0"`, and its `brace-expansion` floor rises from `^5.0.9` to `^5.0.12` | `axios`'s twelve; `brace-expansion` on `nx`'s copy |
| `npm update brace-expansion undici fast-uri`, inside each dependent's declared range | the other `brace-expansion` copies, `undici`, `fast-uri` |
| `verdaccio` removed from `devDependencies` | `js-yaml` and its six `verdaccio` findings. Nothing in the repository referenced `verdaccio` but `package.json`: no local-registry target, no config |

`npm audit --package-lock-only` then reported **0 at every severity**. Three things for whoever does
this next:

- **`ng-packagr` stays at 22.1.1, deliberately.** 22.2.x rewrites every published `.d.ts`: inline
  `export interface`, `import("…")` types, double quotes. As far as it was read the result is
  equivalent, but it would change every type file of the next release for no consumer's benefit.
  22.1.1's peer range already admits `@angular/compiler-cli` 22.2, and `ng-packagr` is not in the
  audit. With it held, every `.d.ts` in `dist/` is byte-identical to what npm has for eval-core 0.6.1
  and eval-forms 0.2.4. eval-signals differs from its 0.1.3 by one `ɵprov` line, the Angular 22.1
  change 0.6.1's CHANGELOG describes, which shipped in eval-signals 0.1.4, released 2026-10-01, tagged 724d831. The bundles differ only in
  Angular's `version` stamps.
- **The Angular move hits the same `ERESOLVE` as part 1**: the locked peer set cannot move one
  package at a time. This round used `npm install --force`; the method since 2026-10-23 is in part 2
  above — delete the moved packages' lockfile entries, reinstall at exact versions, and prove it with
  a clean `npm ci` and an unchanged lockfile. This round's `npm ci` passed on Node 24 with npm 11.
- **Part 2 is unchanged.** `nx` is still 23.2.1 and still pins `smol-toml` 1.6.1, so its override
  stays, now beside two others with the same removal condition: drop each once a stable `nx` stops
  pinning a vulnerable version.

**3. The unused application-build packages — removed 2026-10-06, with no release.** A re-audit
found 48, 10 high and 38 moderate, from six advisories: `braces` GHSA-vfj7-8cjw-p6xm (high),
`compression` GHSA-vc2v-76pw-4v95 (high), `probe-image-size` GHSA-gjj5-9665-rwrc (high),
`source-map-js` GHSA-68fv-2mgg-jv7q (high), `postcss-selector-parser` GHSA-rj75-hqrm-r3gf
(moderate) and `sprintf-js` GHSA-hp3w-g68c-fv3c (moderate). The first two reached the tree only
through `@angular-devkit/build-angular`, by way of `http-proxy-middleware` and
`webpack-dev-server`, and `postcss-selector-parser` only through `postcss-preset-env` 7.5.0. Nothing
in the repository used either package or `webpack-dev-server`: every `build` target runs
`@nx/angular:package`, which is `ng-packagr`, no config or import names them, and `@nx/angular`
23.2.1 declares `build-angular` only as an optional peer. So one commit removed
`@angular-devkit/build-angular` and `postcss-preset-env` from `devDependencies`, and the
`webpack-dev-server` and `uuid` overrides from `overrides`. `webpack-dev-server` was never a direct
dependency, only an override. `uuid`'s only consumer was `sockjs`, under `webpack-dev-server`,
which is what `3067559` added it for. The `less` and `postcss` overrides and the `postcss`
devDependency stay, because `ng-packagr` 22.1.1 depends on `less ^4.2.0` and `postcss ^8.4.47`
itself. `@hono/node-server`'s override was already matching nothing, before this commit and after
it. `npm update` then moved two packages, each inside every dependent's range: `source-map-js`, a
dependency of `postcss`, `sass` and `jsdom`'s `css-tree`, from 1.2.1 to 1.2.2, and
`probe-image-size`, an optional dependency of `less`, from 7.3.0 to 7.4.0, which declares the same
dependencies. The removal had taken away `probe-image-size`'s paths through `build-angular`,
`less-loader`, `@angular/build` and `vite`, but not `ng-packagr` > `less` 4.8.1, and `less`'s
`^7.2.3` admits 7.4.0. The lockfile lost 570 entries, gained none, and changed those two versions.
`npm install` needed no `--force`, and a clean `npm ci` from the result, under npm 12.0.1 and again
under npm 11.21.0, left the lockfile byte-identical.

Audit then found **25, all moderate**, from one advisory: **`sprintf-js` 1.0.3 (`<=1.1.3`), and the
24 dependents audit flags with it**: the links of the chain below, the jest packages above it,
`ts-jest`, `jest-preset-angular` and four `@nx/*`. Every chain reaches it through `@jest/transform`
or `babel-jest` > `babel-plugin-istanbul` > `@istanbuljs/load-nyc-config` > `js-yaml` 3.15.2 >
`argparse` 1.0.10 > `sprintf-js`. **It has no patched version**: 1.1.3 is the latest published, and
the advisory covers it. It reaches only istanbul's config loader: `@istanbuljs/load-nyc-config` is
the only consumer of `js-yaml` 3, and the tree's other `js-yaml`, 4.3.2 under `@eslint/eslintrc`,
uses `argparse` 2. Audit's `--force` remedy is `ts-jest` 27.0.3, a major downgrade.

Dependabot had four open alerts the same day: #331 `postcss-selector-parser`, #332 `compression`,
#333 `source-map-js` and #334 `sprintf-js`. The lockfile after this commit no longer has the first
three. `braces` and `probe-image-size` were audit findings with no alert. Part 2 is unchanged,
still waiting on `nx`.

**4. `handlebars` — updated 2026-10-10, with no release.** A re-audit found 26: 1 critical and 25
moderate. The 25 are part 3's `sprintf-js` chain, unchanged. The critical is `handlebars` 4.7.9,
with three advisories against `4.0.0 - 4.7.9`, all JavaScript injection: GHSA-p8wg-vrv2-v86f
(critical; own-property check bypass), GHSA-8r5x-fm3f-whwj (critical; AST type confusion in
`compile`, a bypass of CVE-2026-33937's fix) and GHSA-xw65-4hp5-5hc7 (moderate; unsafe inline
embedding of precompiled templates). It is dev-only, and `ts-jest` is its only consumer: the root
`devDependency` `ts-jest` 29.4.9 and the `ts-jest` 29.4.12 nested under `jest-preset-angular`
17.0.1 each declare `handlebars ^4.7.9`, deduped to one copy. `npm update handlebars` moved it to
4.7.10, inside that range, with `package.json` unchanged. The lockfile changed in the `handlebars`
entry alone: its `version`, `resolved` and `integrity`, and the `minimist` range in its
`dependencies`, `^1.2.5` to `^1.2.8`, which is 4.7.10's published manifest. The installed `minimist`
was already 1.2.8, and its own entry did not change. A clean `npm ci` left the lockfile
byte-identical. Audit then found **25, all moderate**: part 3's `sprintf-js`, which still has no
patched version. Dependabot's alerts #335–#337 are the three advisories, in the order above, open
until this reaches the default branch. Parts 2 and 3 are unchanged.

**The `qs` override — recorded 2026-10-14, by Phase 10 step 1.** It predates this entry.
`package.json`'s `overrides.qs` is `^6.14.1`, added by 2b655a7 on 2026-01-02 for GHSA-6rw7-vpxm-498p /
CVE-2025-15284: moderate, an `arrayLimit` bypass in bracket notation, a denial of service by memory
exhaustion, affecting `qs <6.14.1` and fixed in 6.14.1. `docs/repository-audit.md`, the only document
that gave a reason for the override and deleted by the same step, called it a prototype-pollution
advisory. The range and the date say otherwise. A later advisory, GHSA-w7fw-mjwx-w883 /
CVE-2026-2391, is **not** excluded by the override's floor: low, an `arrayLimit` bypass in comma
parsing, also a denial of service, affecting `>=6.7.0 <=6.14.1`, fixed in 6.14.2 and published
2026-02-12. `^6.14.1` admits 6.14.1. `qs` is dev-only, reached through `@nx/angular` → `@nx/web` →
`http-server` → `union` → `qs`, where `union` declares `qs ^6.4.0`, and the lockfile resolves 6.16.0.
On 2026-10-14, `npm audit` (npm 12.0.1, Node 26.4.0) reported 25 moderate, part 3's `sprintf-js`
chain, and nothing for `qs`. Raising the floor is outside Phase 10, and this entry holds it.

**`qs` re-audited 2026-10-20, at 7741395**, the line this paragraph has owed since Phase 10 step 1:
the lockfile resolves `node_modules/qs` to **6.16.0**, past GHSA-6rw7-vpxm-498p / CVE-2025-15284
(fixed 6.14.1) and GHSA-w7fw-mjwx-w883 / CVE-2026-2391 (fixed 6.14.2) both, and
`npm audit --package-lock-only` reports nothing for `qs`. The floor still admits 6.14.1, so raising it
stays held here; the installed tree is clear of both. The 32 findings that audit did report are
[F21](backlog-retired.md#f21).

*Recorded*: this entry; `package.json` `overrides.nx` and `overrides.qs`.
*Verified*: `npm audit --package-lock-only`, 2026-09-26. Before the override: 12 high, 9 moderate.
After: 0 high, 0 critical, 9 moderate, as listed above. Again 2026-09-27, after part 1: 0 at every
severity. Again 2026-09-30, npm 12.0.1: 14 high, 8 moderate, as tabled above; traced with
`npm ls <package> --package-lock-only --all`, and the published manifests read with `npm view`.
Again after the fix, 2026-09-30, npm 11 on Node 24: 0 at every severity; clean `npm ci`, and the gate
green at 1076 / 131 / 266. Again 2026-10-06, npm 12.0.1 on Node 26.4.0, before part 3: 48 (10 high,
38 moderate); after it, 2026-10-07: 25 moderate, as listed under part 3. Traced through the
lockfile's dependency entries; clean `npm ci` under npm 12.0.1 and 11.21.0, and the gate green at
2007 / 312 / 343; Dependabot's open alerts read with `gh api`. Again 2026-10-10, npm 12.0.1 on
Node 26.4.0, before part 4: 26 (1 critical, 25 moderate); after it: 25 moderate. Traced with
`npm ls handlebars` and the lockfile's `ts-jest` entries; clean `npm ci`, the gate green at
2023 / 421 / 343, and the three alerts read with `gh api`. The `qs` paragraph, 2026-10-14: both
advisories read with `gh api advisories/<id>` for their CVE, range and fix, the chain with `npm ls qs`,
the lockfile's `node_modules/qs` and `node_modules/union` entries read, and 2b655a7's diff of
`package.json`. Again for `qs`, 2026-10-20 at 7741395, npm 12.0.1 on Node 26.4.0: the lockfile's
`node_modules/qs` entry read, 6.16.0, and `npm audit --package-lock-only --json` checked for a `qs`
finding, none. Part 2 narrowed 2026-10-23, in [F21](backlog-retired.md#f21)'s commit, parent
4246308, npm 12.0.1 on Node 26.4.0: `npm audit --package-lock-only --json` 0 at every severity;
`npm ls smol-toml brace-expansion axios undici --package-lock-only --all` gives `smol-toml` 1.9.0 and
`brace-expansion` 5.0.12 under `nx` with no override, no `axios`, and `undici` 7.30.1 under `nx` and
8.11.2 under `jsdom`; the lockfile's `node_modules/nx` entry read for its declared `"undici":
"7.29.0"`; `npm view nx@23.3.0 dependencies` and `nx@24.0.0`'s read for their pins; a clean `npm ci`
left the lockfile unchanged, and the gate green at 2880 / 443 / 380. `qs` is unchanged.

<a id="f17"></a>
## F17 — An unhandled rejection reaches no channel a spec would normally watch

**Package** repo · **Kind** test gap · **Status** Open. Opened 2026-10-08 by Phase 5 step 2

Every project's `test-setup.ts` loads zone.js (`setupZoneTestEnv`), and every `tsconfig.spec.json`
compiles at `target: es2016`, so `async` functions are down-levelled and a promise in a spec is a
`ZoneAwarePromise`. For one rejected with no handler, the window's `unhandledrejection`, Node's
`process` `unhandledRejection` and zone.js's console report all stay silent: the zone.js handler that
would forward to the window is not installed, and `ignoreConsoleErrorUncaughtError` is `true`. zone.js
still collects the rejection, and after the microtask drain calls the function under
`Zone.__symbol__('unhandledPromiseRejectionHandler')` if one is set. Nothing else sees it.

So **any spec that relies on an unhandled rejection failing the run is vacuous**: the run never
fails. Phase 3's comment in `eval-signal.spec.ts`, in "should not route a rejection through onError"
(`:1029`), awaits a rejection "rather than leaving the runtime to report it", which assumes such a
report. Phase 5's criterion 5 observes through the hook, beside a permanent control — a plain promise
rejected with no handler must be recorded, by identity — so its cases cannot go silently vacuous
([`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 6.1).

Measured in `eval-signals` only. `eval-core` and `eval-forms` load the same setup at the same target,
so it holds there by construction, not by measurement.

*Recorded*: this entry; that plan's § 6.1.
*Verified*: measured 2026-10-08 in Phase 5 step 2, by throwaway specs in `eval-signals`, since deleted:
a plain `new Promise` rejected with no handler reached none of the three channels; zone.js's
`uncaughtPromiseErrors` queue held it until the macrotask, and a function set under the hook was
called with it. Then by criterion 5's own cases: a wrong implementation that left superseded runs'
rejections unhandled turned both red through the hook, with the control green.
