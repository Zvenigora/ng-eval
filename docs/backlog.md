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

- **Reading.** Never read this file whole, nor `docs/backlog-retired.md`: each is many times what
  one entry needs. `git grep -n -E '^#{1,2} ' docs/backlog.md` lists the headings with their
  lines, and an entry runs from its heading to the next. `git grep -n -F '[A54](' docs/backlog.md`
  finds an entry's index row and every link to it; a live row's link starts `(#`, and a retired
  one's `(backlog-retired.md#`. A plan or a prompt names an entry by its ID or its anchor,
  `backlog.md#a54`, and a session reads that entry, its index row and this section, not the rest.
- **IDs are stable.** Cite `BL-A8`, not a line number. Line numbers into this file will rot the
  way the citations into `ROADMAP.md` did.
- **Adding an entry**: give it the next free ID in its group, fill every column of the index,
  and say what verified it. "Noticed while reading" is a legitimate answer; leaving it blank is
  not.
- **Two files.** Live entries are here; retired ones are in `docs/backlog-retired.md`, in their
  original order and section. **The index below covers both**, and a retired row links there.
- **Two more files hold the register's own records**, moved out of this one on 2026-11-15 so that
  its preamble and its entries are read without them.
  [`backlog-in-flight.md`](backlog-in-flight.md) is "Work in flight": which plans have run against
  the register, and what each fixed, opened and released.
  [`backlog-history.md`](backlog-history.md) is the Register history: the live count from one
  release to the next, whose *Unreleased* row moves when an entry opens or closes. A plan or a
  prompt written before that date that names `docs/backlog.md` for either means that file.
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
| `@zvenigora/ng-eval-core` | 0.16.2 | [A64](#a64) fix, a security patch: a write policy is asked about a table built-in handed as an argument to a function the walk did not create. A64 stays open, not scheduled. |
| `@zvenigora/ng-eval-core` | 0.16.1 | [A65](backlog-retired.md#a65) fix, a security patch: a computed member key that is an expression and evaluates to anything but a string, number or symbol is converted to its property key before the dangerous-name check, and the access uses that key, so `o[["constructor"]]` and `o[["__proto__"]]` are refused as `o["constructor"]` and `o["__proto__"]` are. Every published version up to 0.16.0 is affected: up to 0.12.0 the route reached the `Function` constructor and ran code, and from 0.12.1 it wrote into `Object.prototype`. A patch: the `.d.ts` and the README are byte-identical to 0.16.0's and `package.json` differs only in its version; `eval-signals` 0.9.0 and `eval-forms` 0.9.0 admit it through `>=0.16.0 <0.17.0`. Tagged `eval-core@0.16.1` at 188c0d9, published 2026-11-22 (npm: 01:56 UTC) |
| `@zvenigora/ng-eval-core` | 0.16.0 | The [A48 plan](a48/plan.md): a member read lets a getter's throw reach the caller, and member reads and writes change under `caseInsensitive`, through `this` to a `Registry`, and to an `EvalScope`. [A55](backlog-retired.md#a55) fix: a member read lets a getter's or a proxy `get` trap's throw reach the caller, in both case modes, where case-sensitively it caught the throw and gave `undefined`; the CHANGELOG gives the paths under `caseInsensitive`, some of which already threw. [A48](backlog-retired.md#a48) fix: under `caseInsensitive` a member read tests a key with `in`, so `c.g` and its compound forms call an inherited getter once, where they called it twice, and a proxy's `has` trap is called for a key no own property matches; a key a proxy answers by its `get` trap alone is searched for a case variant on the target's prototype. [A50](backlog-retired.md#a50) fix: a write through `this` to a `Registry` that is the context's original reaches its map, for a key it holds, where it set an own property on the instance. [A51](backlog-retired.md#a51) fix: a member write to an `EvalScope` is refused, with `Write to an evaluation scope is blocked` unless the blocklist or a write policy refuses it first, where it set an own property on the instance. [A49](backlog-retired.md#a49) decided, a documented limit: how many times an expression calls a getter on the context or on a scope's object, or a lookup, is not part of the contract. Timed against 0.15.1 on seven paths by the plan's § 3.7, with no regression on any. A minor carrying breaking changes by behaviour: the `.d.ts` differs from 0.15.1's in two JSDoc blocks, `EvalContext`'s `lookups` and `getThis`, and in no declaration. Admitted only by `eval-signals` 0.9.0 and `eval-forms` 0.9.0; every earlier one excludes it by its own range. Tagged `eval-core@0.16.0` at 7d9d488, published 2026-11-08 (npm: 15:49 UTC) |
| `@zvenigora/ng-eval-signals` | 0.9.0 | `eval-core` 0.16.0, forwarded. Over a context holding an object whose inherited getter `t` throws, a `createEvalSignal` over `x.t` throws the getter's error on read under the default `onError`, in both case modes, and a function policy receives it, where it read `undefined`; `'undefined'` still reads `undefined`. Under `caseInsensitive` a signal over `c.g + 1` calls an inherited getter `g` once, where it called it twice. Over a record, or a context `createSignalContext` built, the write guard refuses a member write first, as before, so A50's `this.k = 5` and A51's `ns.k = 5` throw `SignalContextWriteError`; over an `EvalContext` the caller built, both reach the signal as they reach `eval-core`. The A48 plan's step 6 rows witness the reads and the record path, in no package; the caller's-context path was measured through `createEvalSignal`. A breaking minor with no shipped code changed: the `.d.ts` is byte-identical to 0.8.0's. Peer range on `eval-core` moved to `>=0.16.0 <0.17.0` — the floor rises, since the forwarded behaviour exists only in 0.16.0. Tagged `eval-signals@0.9.0` at 7d9d488, published 2026-11-08 (npm: 16:00 UTC) |
| `@zvenigora/ng-eval-forms` | 0.9.0 | `eval-core` 0.16.0, forwarded at both entry points over a signal context from `eval-signals`. At `/reactive`, over a control whose value has an inherited getter `t` that throws, a `text` rule `user.t` throws under `'throw'` and hands a function policy its error, where it rendered `''` under every policy; the default still renders `''`. `eval-core`'s other member read changes reach a rule's reads too, the `caseInsensitive` ones at `/signals` only, since `/reactive` takes no evaluation options; its member write changes do not, since the signal context's write guard refuses a member write first. Step 6's three `/reactive` rows witness the getter's throw; no row witnesses it at `/signals` ([F31](#f31)). A breaking minor with no shipped code changed: all three `.d.ts` files are byte-identical to 0.8.0's. Peer ranges raised: `eval-core` to `>=0.16.0 <0.17.0`, and `eval-signals` to `>=0.9.0 <0.10.0`, since every earlier `eval-signals` requires `eval-core` below 0.16.0. Tagged `eval-forms@0.9.0` at 7d9d488, published 2026-11-08 (npm: 16:05 UTC) |
| `@zvenigora/ng-eval-core` | 0.15.1 | [A33](backlog-retired.md#a33) fix: under `caseInsensitive` a property added in the same interval as another is deleted is found by a case variant of its name, where after `delete x.a; x.c = 3` the lookup cache's earlier miss stood while the own-key count was unchanged, so `x.C` read `undefined` and `x.C = 9` made a second own key `C` beside `c`; a cached miss now stands only while the object's own names are those it was made from. The same miss skipped a refusal, of a case variant of a blocked own name that is not an own property of the object's immediate prototype, which read `undefined` and wrote a sibling key; it is refused now, and the blocked value was never returned or written. [A34](backlog-retired.md#a34) documented, a limit: `ParserService.parserOptions`' and `parse`'s JSDoc, a new JSDoc on `defaultParserOptions` and the README say an options object is remembered by identity, and to replace one rather than write into it. Measured downstream by one `eval-signals` row, in no package: a `createEvalSignal` over a plain object in its source, under `caseInsensitive`, finds the added property after a recompute driven by another signal, and reads `undefined` with 0.15.0's count rule restored. A patch: the `.d.ts` differs from 0.15.0's in four JSDoc hunks and no declaration. Peer ranges unchanged; `eval-signals` 0.8.0 and `eval-forms` 0.8.0 admit it with `>=0.15.0 <0.16.0`, and neither releases. Tagged `eval-core@0.15.1` at 9e88d18, published 2026-11-02 (npm: 01:49 UTC) |
| `@zvenigora/ng-eval-core` | 0.15.0 | The [A24 plan](a24/plan.md): an `await` gives JavaScript's answer or throws. [A25](backlog-retired.md#a25) fix: an `await` passes its operand through, with no race, no 30 000 ms timer, no `__awaitTimeout` key and no suffix on the caller's error, so on the sync path `(async () => await p)()` is `p` and an `Error` rejection reaches `evalAsync`'s caller by identity. [A24](backlog-retired.md#a24) fix: an `await` is evaluated only where its value is the result — the whole expression, an arrow's expression body, or the last statement of a program or an arrow's block body — and refused anywhere else, `(async () => (await p) * 10)()` included, where it gave `NaN`. [D13](backlog-retired.md#d13)'s first half: `findUnsupportedStatement`, exported, reports the first statement evaluation would refuse, from the table the evaluator reads. [A27](backlog-retired.md#a27) fix: an arrow's nested walk writes nothing to `state.result`, `start()` resets the outcome, and each setter writes every outcome field. [A38](backlog-retired.md#a38) fix: a tag receives JavaScript's frozen template object, with a frozen `raw`, one per parsed site. A minor carrying breaking changes by behaviour: the `.d.ts` differs from 0.14.1's in code by `findUnsupportedStatement`'s declaration, its `acorn` types and the export list, and otherwise in JSDoc only. Peer ranges unchanged. Admitted only by `eval-signals` 0.8.0 and `eval-forms` 0.8.0; every earlier one excludes it by its own range. Tagged `eval-core@0.15.0` at 67486ab, published 2026-10-31 (npm: 21:47 UTC) |
| `@zvenigora/ng-eval-signals` | 0.8.0 | `eval-core` 0.15.0's `await` change, forwarded: an `await` anywhere but the result is refused, so the async signal over `(async () => (await loadUser(id)).name)()` reads `status()` `'error'` and a `createEvalSignal` over it throws on read under the default `onError`; an accepted `await` reads its operand itself on the sync path; a rejection behind one arrives as raised, an `Error` by identity and `'x'` as `Error('x')`; and no `await` arms a timer. The README's `await` paragraph is rewritten to the accepted positions, the refusal and the two-signal form, its A24 link following the entry to `backlog-retired.md`. [F30](backlog-retired.md#f30)'s five rows, committed after the release commit and in no package, witness these claims, so the suite is at 449. A breaking minor with no shipped code changed: the `.d.ts` is byte-identical to 0.7.0's. Peer range on `eval-core` moved to `>=0.15.0 <0.16.0` — the floor rises, since the forwarded behaviour exists only in 0.15.0. Tagged `eval-signals@0.8.0` at 67486ab, published 2026-10-31 (npm: 22:02 UTC) |
| `@zvenigora/ng-eval-forms` | 0.8.0 | [D13](backlog-retired.md#d13)'s second half: a rule holding a statement `eval-core` does not evaluate is refused at registration at both entry points, wherever the statement sits, through `guardIdentifiers` asking `eval-core`'s `findUnsupportedStatement`; up to 0.7.1 only a top-level label was refused, and the rest threw when reached, a blank under the default `onError`. A label keeps its message; any other statement's names the rule and quotes `eval-core`'s. Reverses the Phase 9 plan's § 3.8. `eval-core` 0.15.0's other changes reach a rule too. A breaking minor: the core `.d.ts` differs from 0.7.1's in `guardIdentifiers`' JSDoc and the `/reactive` one in `bindFieldProperties`' `@param schema`, documentation only; the `/signals` one is byte-identical. Peer ranges raised: `eval-core` to `>=0.15.0 <0.16.0`, since `findUnsupportedStatement` exists only there, and `eval-signals` to `>=0.8.0 <0.9.0`, since every earlier `eval-signals` requires `eval-core` below 0.15.0. Tagged `eval-forms@0.8.0` at 67486ab, published 2026-10-31 (npm: 22:09 UTC) |
| `@zvenigora/ng-eval-core` | 0.14.1 | [A47](backlog-retired.md#a47) fix: under `caseInsensitive` an arrow's parameters are matched case-insensitively, so `(x => X)(1)` gives `1`, a case-variant write in the body reaches the parameter and not the caller's context, and `(TRUE => (True = 2))(1)` writes the parameter where it threw. Three changes are documentation only: [A32](backlog-retired.md#a32)'s disabled visitor result cache is deleted, so the bundle loses comment lines and no code; [A30](backlog-retired.md#a30)'s JSDoc says what `ParserService.parserOptions` configures; and `contextPush`'s docblock is corrected ([F27](backlog-retired.md#f27)). Measured downstream on the production bundles: an `eval-signals` signal over `(x => X)(1)` and `{ x: 10 }` under `caseInsensitive` gives `1` and records no dependency, where 0.14.0 gave `10` and recorded `x`, and an `eval-forms` `/signals` text rule likewise gives `'1'` and does not follow `x`, where 0.14.0 gave `'10'`, then `'20'`. A patch: the `.d.ts` differs from 0.14.0's in A30's JSDoc only. Peer ranges unchanged; `eval-signals` 0.7.0 and `eval-forms` 0.7.x admit it with `>=0.14.0 <0.15.0`, and neither releases. Tagged `eval-core@0.14.1` at 95932e6, published 2026-10-30 (npm: 02:42 UTC) |
| `@zvenigora/ng-eval-forms` | 0.7.1 | Phase 11 ([plan](documentation/phase-11-plan.md)): the README is ordered by entry point — the package's sections, then those both adapters share, then `/reactive`, then `/signals` — under a contents list that links every `##` and `###`, and every heading keeps 0.7.0's text and level. Two passages about `/reactive` alone left the shared sections, When a rule fails says where each adapter throws a rule that does not parse, and two facts stated on both adapters' sides are stated once. Its Development section names both shared sections whose blocks the `/reactive` spec executes, and every block no case executes. [F28](backlog-retired.md#f28) decided by it. A docs-only patch: all three `.d.ts` files are byte-identical to 0.7.0's, and the manifest differs in `version` only. Peer ranges unchanged. Tagged `eval-forms@0.7.1` at 69c3e0e, published 2026-10-29 (npm: 00:50 UTC) |
| `@zvenigora/ng-eval-core` | 0.14.0 | The [A45 plan](a45/plan.md): an assignment evaluates its target as JavaScript does. [A45](backlog-retired.md#a45) part 2 fix: a member target's object and key are evaluated once, before the right side; `=` reads no value and walks no further than the object and a computed key, so `fetch = 1` and `obj.fetch = 1` write `1` where they were refused at the read; a compound or logical operator reads its target once, and that value still passes the funnel; read events follow the reads, so `a.b = 1` reports `a` and `x = 1` nothing, which reopened Phase 1's decision for assignment targets. An `=` target's blocklist checks run before the right side. An identifier update is refused a blocklisted name and `this` written as a name, and reports one read of its operand. [A44](backlog-retired.md#a44) fix: under `caseInsensitive` a member write or update reaches the key the read matched. [A52](backlog-retired.md#a52) fix: under `caseInsensitive` an identifier holding `null` reads as `null`. What stays beyond JavaScript's reads is held under [A48](backlog-retired.md#a48) and [A49](backlog-retired.md#a49). A minor carrying breaking changes by behaviour: the `.d.ts` is byte-identical to 0.13.3's. Peer ranges unchanged. Admitted only by `eval-signals` 0.7.0 and `eval-forms` 0.7.0; every earlier one excludes it by its own range. Tagged `eval-core@0.14.0` at 0d305a3, published 2026-10-26 (npm: 00:29 UTC) |
| `@zvenigora/ng-eval-signals` | 0.7.0 | `eval-core` 0.14.0's assignment-target change, forwarded: with `trackDependencies`, `count = 5` records nothing, and, case-sensitive, it is no longer recomputed when `count` changes; `user.name = "Bob"` records `user` alone; `x++` records `x`. Each throws `SignalContextWriteError` on every recompute, as before. Under `caseInsensitive` `count = 5` still recomputes, since resolving the key reads it ([A49](backlog-retired.md#a49)); a source holding `null` reads as `null` ([A52](backlog-retired.md#a52)); and a case-variant member write's error names the key the target holds, `name` for `user.NAME = "Bob"` ([A44](backlog-retired.md#a44)), with one case added for it, so the suite is at 444. A breaking minor with no shipped code changed: the `.d.ts` is byte-identical to 0.6.1's. Peer range on `eval-core` moved to `>=0.14.0 <0.15.0` — the floor rises, since the forwarded behaviour exists only in 0.14.0. Tagged `eval-signals@0.7.0` at 0d305a3, published 2026-10-26 (npm: 00:32 UTC) |
| `@zvenigora/ng-eval-forms` | 0.7.0 | `eval-core` 0.14.0's assignment-target change, forwarded at both entry points: a case-sensitive rule that only assigns to a key, `count = 5`, is not recomputed when that key changes. On `/signals` under `caseInsensitive` it still is ([A49](backlog-retired.md#a49)), a model key holding `null` reads as `null` ([A52](backlog-retired.md#a52)), and a case-variant member write's error names the key the target holds ([A44](backlog-retired.md#a44)). The README's three recompute sentences say "reads" where they said "named". A breaking minor with no shipped code changed: all three `.d.ts` files are byte-identical to 0.6.1's. Peer ranges raised: `eval-core` to `>=0.14.0 <0.15.0`, and `eval-signals` to `>=0.7.0 <0.8.0`, since every earlier `eval-signals` requires `eval-core` below 0.14.0. Tagged `eval-forms@0.7.0` at 0d305a3, published 2026-10-26 (npm: 00:34 UTC) |
| `@zvenigora/ng-eval-core` | 0.13.3 | [A45](backlog-retired.md#a45) part 1 fix: a logical assignment that short-circuits evaluates nothing more — `a \|\|= f()` with `a` truthy does not call `f`, nothing is written, and a write policy or a refusal on the write path is not reached. Logical assignment is ES2021 and the default parser options, at `ecmaVersion: 2020`, refuse it at the parse, so the fix reaches only a caller whose own parser options set `ecmaVersion` to 2021 or later. A45's part 2 stays open. A patch: the `.d.ts` is SHA-256-identical to 0.13.2's, and the manifest differs in `version` only. Peer ranges unchanged; `eval-signals` 0.6.x and `eval-forms` 0.6.x admit it with `>=0.13.0 <0.14.0`, and neither releases. Tagged `eval-core@0.13.3` at 021d5e4, published 2026-10-23 (npm: 02:54 UTC) |
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
| `@zvenigora/ng-eval-forms` | 0.5.0 | Phase 9 ([plan](colon-identifiers/phase-9-plan.md)): `/signals`' `ExpressionRuleOptions.colonIdentifiers`, and `/reactive` follows `eval-core`'s `provideColonIdentifiers()`, its bind-time check parsing a rule as its compile does. [D13](backlog-retired.md#d13) narrowed: a rule that parses as a top-level label, which rendered blank, is refused at registration at both entry points. A breaking minor: the three `.d.ts` files differ from 0.4.1's by `ExpressionRuleOptions.colonIdentifiers` and documentation comments. Peer ranges raised: `eval-core` to `>=0.12.0 <0.13.0`, which adds the option `/signals` passes it, and `eval-signals` to `>=0.5.1 <0.6.0`, since every earlier `eval-signals` requires `eval-core` below 0.12.0. Tagged `eval-forms@0.5.0` at 3466c80, published 2026-10-14 (npm: 01:13 UTC) |
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

**Every published version now carries a tag** — the fifty-seven above (one at 52fced7, one at 188c0d9, three at 7d9d488, one at 9e88d18, three at 67486ab, one at 95932e6, one at 69c3e0e, three at 0d305a3, one at 021d5e4, one at dc4302d, three at 5b9c859, three at f7f27f7, one at 7cc8d30, three at 3466c80, one at 7ee65fc, two at 577c4f0, three at 776885a, one at d77fa16, one at 3d56994, three at 0c3299e, three at eb403c0, three at c56f987, three at 724d831, two at 587ebf1, three at f26f987,
three at `016a313`, three at `7935a78`) plus ten for versions before this table: seven written
retroactively on 2026-09-16, and three at their own release on 2026-08-22 (`eval-core@0.3.0`,
`eval-signals@0.1.0`, `eval-forms@0.1.0`). That is sixty-seven, the count `tools/release-tags.mjs`
reports, all annotated and all on the remote. The check tests that they are annotated since
[F26](backlog-retired.md#f26): it reads each release tag's object type, fails on a lightweight one,
and says `all annotated` in its summary line. `git tag -l` lists three more, `v0.1.0`, `v0.2.2`
and `v0.2.3`: lightweight tags from before the `<project>@<version>` names, which it does not check.

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
| <a id="a24"></a>[A24](backlog-retired.md#a24) | An `await` is a pass-through — inside an `async` arrow it hands the walk a promise as an operand, and the arrow returns no promise | core | decision, then fix | **Retired — decided and fixed 2026-10-30**, as step 4 of the [A24 plan](a24/plan.md); released 2026-10-31 in `eval-core` 0.15.0, tagged 67486ab. An `await` is accepted only at the walk's root, as an arrow's concise body, or as the expression of the final statement of a program or an arrow's block body, and refused anywhere else with a message naming `await` and the rule. Opened 2026-10-07 by the Phase 5 plan; the `eval-signals` README states the pass-through since 0.5.0, and its 0.8.0 rewrites that paragraph |
| [A25](backlog-retired.md#a25) | `awaitVisitor`'s timeout race — an uncleared 30 s timer per `await`, an undocumented `__awaitTimeout` key, and the caller's error mutated | core | fix | **Retired — decided and fixed 2026-10-30**, as step 3 of the [A24 plan](a24/plan.md); released 2026-10-31 in `eval-core` 0.15.0, tagged 67486ab. No race, no timer, no key, no suffix: the operand passes through, so a rejection reaches the caller as it was raised, an `Error` by identity, while `evaluateAsync` still converts any other. Opened 2026-10-07 by the Phase 5 plan |
| [A26](backlog-retired.md#a26) | The parse cache ignores parser options | core | fix | **Retired — fixed 2026-10-10**, as step 1 of the [Phase 9 plan](colon-identifiers/phase-9-plan.md); released 2026-10-14 in `eval-core` 0.12.0, tagged 3466c80. Keyed on the text and a fingerprint of the parse-relevant options; a callback or `program` bypasses the cache. `CompilerService`'s string cache is that plan's step 3. Affected every published `eval-core` to 0.11.1 |
| [A27](backlog-retired.md#a27) | A nested `evaluate` writes the enclosing walk's `EvalResult` — and `start()` clears nothing, so a reused state shows the last run's outcome | core | decision | **Retired — decided and fixed 2026-10-30**; released 2026-10-31 in `eval-core` 0.15.0, tagged 67486ab. An arrow's body walks without writing `state.result`, `start()` resets the outcome but not the trace, and each setter writes every outcome field. Opened 2026-10-08 by Phase 5 step 1 |
| [A28](backlog-retired.md#a28) | `scoped` is documented as a scope pushed during this walk; the code asks the whole scope stack | core | docs | **Retired — fixed 2026-10-10**, documentation comments only; released 2026-10-10 in `eval-core` 0.11.1, tagged 7ee65fc. The `.d.ts` differs in four JSDoc blocks: every scope on the stack counts, whoever pushed it |
| [A29](backlog-retired.md#a29) | `CompilerService` keys a compiled AST by type, start, end and `toString()` — two ASTs of one type and span share a compiled function | core | fix | **Retired — fixed 2026-10-10**; released 2026-10-10 in `eval-core` 0.11.1, tagged 7ee65fc. An AST is compiled on every call and never cached; a string is cached as before. Affected `eval-core` 0.2.1–0.11.0 |
| [A30](backlog-retired.md#a30) | `ParserService.parserOptions` reaches `EvalService`, `CompilerService` and `DiscoveryService` for no acorn option | core | decision | **Retired — decided 2026-10-29: documented**; released 2026-10-30 in `eval-core` 0.14.1, tagged 95932e6, documentation only. The setter configures direct `ParserService.parse` calls, and its JSDoc says so |
| [A31](backlog-retired.md#a31) | The case-insensitive property cache keys an object by its key count and first five keys — objects sharing them share answers, process-wide | core | fix | **Retired — fixed 2026-10-10**; released 2026-10-10 in `eval-core` 0.11.1, tagged 7ee65fc. Keyed by the object itself, a cached key re-checked as the object's own; a colliding entry no longer turns a case-variant refusal into `undefined`. Affected `eval-core` 0.2.1–0.11.0 |
| [A32](backlog-retired.md#a32) | The disabled visitor result cache keys a node without its operands — `a + b` and `c + d` share an entry | core | decision | **Retired — decided and deleted 2026-10-29**; released 2026-10-30 in `eval-core` 0.14.1, tagged 95932e6, comments only: no code reached the bundle |
| [A33](backlog-retired.md#a33) | The case-insensitive property cache keeps a miss while the own-key count is unchanged — a key added as another is deleted reads `undefined` by a case variant | core | fix | **Retired — fixed 2026-11-01**, as step 2 of the [A33 plan](a33/plan.md); released 2026-11-02 in `eval-core` 0.15.1, tagged 9e88d18. A cached miss stands only while the object's own names are those it was made from, in order. The stale miss also skipped a refusal, of a blocked own name that is not an own property of the object's immediate prototype — `prototype` on a plain object, every blocked name but `constructor` on an instance of a class that declares none of them, any on a null-prototype one — which read `undefined` and wrote a sibling key; the blocked value was neither returned nor written. Opened 2026-10-10, after the `eval-core` 0.11.1 tag |
| [A34](backlog-retired.md#a34) | The parse fingerprint's memo does not see options written in place — a write into `parserOptions`, a reused per-call object or `defaultParserOptions` keeps the old fingerprint | core | fix | **Retired — decided 2026-11-01: a documented limit**, as step 3 of the [A33 plan](a33/plan.md); released 2026-11-02 in `eval-core` 0.15.1, tagged 9e88d18, documentation only. The getter's and `parse`'s JSDoc, a new JSDoc on `defaultParserOptions` and the README say an options object is remembered by identity, and to replace one rather than write into it. Opened 2026-10-10 by [A26](backlog-retired.md#a26)'s fix, Phase 9 step 1 |
| [A35](backlog-retired.md#a35) | A dangerous function value reachable from the context is callable past the name-based call sandbox — by an alias, through `call` / `apply` / `bind`, and as a native callback (`map`, `Reflect.apply`, `then`); `eval("1+1")` is refused, `["1+1"].map(eval)` is `[2]` | core | decision, security | **Retired — fixed 2026-10-18**, as steps 2, 4, 7 and 8 of the [A35 plan](a35/plan.md). Steps 2 and 4 released 2026-10-17 in `eval-core` 0.12.1, tagged 7cc8d30, as partial hardening; steps 7 and 8, which close its last route, [A39](backlog-retired.md#a39), released 2026-10-20 in `eval-core` 0.13.0, tagged f7f27f7; advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx). A host container stays a documented limit |
| [A36](backlog-retired.md#a36) | A tagged template's tag is called with no sandbox check — `` Function`return 7`() `` gives 7 with `Function` under its own name | core | fix, security | **Retired — fixed 2026-10-15**, as step 1 of the [A35 plan](a35/plan.md); released 2026-10-17 in `eval-core` 0.12.1, tagged 7cc8d30; advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx). A tag is called as a callee is, through the call sandbox and the write policy; a member tag shares the member call's path, so its `this` is its object. Affected every published `eval-core` to 0.12.0 |
| [A37](backlog-retired.md#a37) | `SequenceExpression` has no visitor: `(0, 1)` leaves a value on the stack | core | fix | **Retired — fixed 2026-10-15**, as step 3 of the [A35 plan](a35/plan.md); released 2026-10-17 in `eval-core` 0.12.1, tagged 7cc8d30. A sequence leaves one value on the stack, and raises one `before` and one `after` event and one trace entry; no evaluated value changes. Affected every published `eval-core` to 0.12.0 |
| [A38](backlog-retired.md#a38) | A tag's strings array is not JavaScript's: not frozen, no `raw` — so `` String.raw`a\nb` `` throws — a new array per evaluation, and not recorded as created | core | fix | **Retired — fixed 2026-10-30**; released 2026-10-31 in `eval-core` 0.15.0, tagged 67486ab. A tag receives JavaScript's template object: frozen, a frozen `raw`, one per parsed site, cached by node; not recorded as created. Opened 2026-10-15 by the code review of the A35 plan's step 1 |
| [A39](backlog-retired.md#a39) | Evaluating `this` lets native code reach a dangerous function the host placed in the context, past the funnel; mechanism and probes in the advisory | core | fix, security | **Retired — fixed 2026-10-18**, as steps 7 and 8 of the [A35 plan](a35/plan.md): `this` only as a member's object, and a guarded view as every receiver the evaluator resolves from the context. Released 2026-10-20 in `eval-core` 0.13.0, tagged f7f27f7; advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx) |
| [A40](backlog-retired.md#a40) | A postfix update of a listed function writes, then the funnel refuses the old value — the failed evaluation leaves its write behind | core | fix | **Retired — fixed 2026-10-22**, as a consequence of [A41](backlog-retired.md#a41)'s fix; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. The operand converts to `NaN` before the write, so `tools.eval++` gives `NaN` and writes `NaN`, as JavaScript does, and nothing throws |
| [A41](backlog-retired.md#a41) | An update does not convert its operand to a number: `x++` on `"5"` writes `"51"`, on `{}` writes `"[object Object]1"`, and a postfix update gives the operand as read | core | fix | **Retired — fixed 2026-10-22**; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. The operand is converted once, natively, before anything is written: `"5"++` gives `5` and writes `6`, and a BigInt updates |
| [A42](backlog-retired.md#a42) | `this.k = v` lands on the `EvalContext` instance, where nothing reads it back — but it shadows the class's own members, so the evaluator invoked what an expression planted, and it persists on a reused context | core | fix, security | **Retired — fixed 2026-10-19**, in the [A35 plan](a35/plan.md)'s step 9 under its Revision 16. The write is refused by class, the methods the evaluator calls are taken from the class, and a context reached as data is refused. Released 2026-10-20 in `eval-core` 0.13.0, tagged f7f27f7; referenced in advisory [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx) as additionally fixed, not its subject. Its first characterisation — "not a route to the context itself" — was measured wrong and corrected |
| [A43](backlog-retired.md#a43) | Under `caseInsensitive`, an identifier write to a name the context resolves to nothing — absent, or bound to `undefined` — writes the key `undefined` | core | fix | **Retired — fixed 2026-10-22**, opened the same day by the [A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. Both write sites fall back to the name as written, as `identifier.ts` does; `getKey` is unchanged |
| [A44](backlog-retired.md#a44) | Under `caseInsensitive`, a member write to a case variant creates a new key: `OBJ.X = 2`, `OBJ.X += 1` and `OBJ.X++` on `{ x: 1 }` leave `{ x: 1, X: 2 }` | core | fix | **Retired — fixed 2026-10-24**, as step 3 of the [A45 plan](a45/plan.md); released 2026-10-26 in `eval-core` 0.14.0, tagged 0d305a3. A member write and update reach the key the read matched; a key that matches nothing is written as spelled. The update spec's `caseInsensitive` matrix runs again spelled `OBJ.X` |
| [A45](backlog-retired.md#a45) | An assignment evaluates its target as an operand and its right side unconditionally — a short-circuited `\|\|=` called its right side and wrote (part 1), a member target is evaluated twice, and `obj.fetch = 1` is refused at the read | core | fix | **Retired — fixed 2026-10-24**. Part 1 retired 2026-10-22, released 2026-10-23 in `eval-core` 0.13.3, tagged 021d5e4. Part 2 fixed in steps 2 and 3 of the [A45 plan](a45/plan.md), released 2026-10-26 in `eval-core` 0.14.0, tagged 0d305a3: a member target's object and key are evaluated once, `=` reads nothing, a compound or logical operator reads once, and read events follow the reads, which reopened Phase 1's decision. A breaking minor by behaviour |
| [A46](backlog-retired.md#a46) | An expression can rebind `undefined` on a reused context — `undefined = 1`, then `x === undefined` is `false` — and under `caseInsensitive` a case variant of `undefined`, `null`, `true` or `false` | core | fix, decision | **Retired — fixed 2026-10-22**; released 2026-10-22 in `eval-core` 0.13.2, tagged dc4302d. Such a write throws `Assignment to read-only name`, unless a scope binds the name or the context resolves it; a context class that overrides `set` decides these writes itself. `NaN` and `Infinity` are outside the set, since the evaluator resolves neither |
| [A47](backlog-retired.md#a47) | An arrow's parameter scope is pushed without the walk's options, so under `caseInsensitive` `(x => X)(1)` is `undefined`, and `X = 5` in the body can land on the consumer's context | core | fix | **Retired — fixed 2026-10-28**; released 2026-10-30 in `eval-core` 0.14.1, tagged 95932e6. The parameter scope is pushed with the walk's options, as the other three scope pushers push theirs. Opened 2026-10-22 by the A40/A41 batch's code review; predated it |
| [A48](backlog-retired.md#a48) | Under `caseInsensitive`, a member read calls a prototype accessor twice: `c.g` reads its getter twice, and so does `c.g++` | core | fix | **Retired — fixed 2026-11-05**, as step 2 of the [A48 plan](a48/plan.md); released 2026-11-08 in `eval-core` 0.16.0, tagged 7d9d488. The key is tested with `in`, as a write tests it, and read once, so the read and the write agree on the key; a proxy's `has` trap is now called. Opened 2026-10-23 by the [A45 plan](a45/plan.md), Revision 2 (§ 8 q2); predated it |
| [A49](backlog-retired.md#a49) | The context branch reads what it tests: `getThis` reads the value and `getKey` calls lookups, so `this.g = 1` calls a getter on the context | core | fix | **Retired — decided 2026-11-06: a documented limit**, as step 5 of the [A48 plan](a48/plan.md); released 2026-11-08 in `eval-core` 0.16.0, tagged 7d9d488, documentation only. Opened 2026-10-23 by the [A45 plan](a45/plan.md), Revision 2 (§ 8 q3); predated it |
| [A50](backlog-retired.md#a50) | `this.k = v` writes an own property onto a `Registry` that is the context's original, beside its map, so a later read is unchanged: the `caseInsensitive` copy of a plain context, or a host's `Registry` in either mode | core | fix | **Retired — fixed 2026-11-06**, as step 3 of the [A48 plan](a48/plan.md); released 2026-11-08 in `eval-core` 0.16.0, tagged 7d9d488. The write goes through the map, as `k = v` does, and a later read sees it; under `caseInsensitive` it stays in the copy. Opened 2026-10-23 by the [A45 plan](a45/plan.md), Revision 2 (§ 8 q4); predated it. Corrected 2026-11-03 for a host `Registry`, and 2026-11-06 for a prior scope's `thisArg` |
| [A51](backlog-retired.md#a51) | A member write to an `EvalScope` held as a value lands on the instance, never through `EvalScope.set`, and can replace its `_context` and `_options` | core | fix | **Retired — fixed 2026-11-06**, as step 4 of the [A48 plan](a48/plan.md); released 2026-11-08 in `eval-core` 0.16.0, tagged 7d9d488. A write to the instance is refused, after the right side and a write policy. Opened 2026-10-23 by the [A45 plan](a45/plan.md), Revision 2 (§ 8 q4); predated it |
| [A52](backlog-retired.md#a52) | Under `caseInsensitive`, an identifier holding `null` reads as `undefined`: `x === null` is `false`, and `x += 1` writes `NaN` | core | fix | **Retired — fixed 2026-10-24**, as step 2 of the [A45 plan](a45/plan.md) (its D10); released 2026-10-26 in `eval-core` 0.14.0, tagged 0d305a3. The literals fallback is taken only for `undefined`, in one read the visitor and the target read share. Opened 2026-10-23 by the plan's Revision 2; predated it |
| [A53](backlog-retired.md#a53) | Under `caseInsensitive`, on one machine (Windows, Node 26.4.0), almost every process of the A45 plan's timing harness, 175 of 180, slows 5–9× about 2.7 s into its timed loop, in both bundles and on every path; a cloud run on Linux did not | core | decision, then fix | **Retired — decided 2026-10-31: a limit of the harness on one machine, not the library**; ships in no package. The slowdown is an episode that reaches a case-sensitive process too and none pinned to the performance cores; none on Linux with Node 26.4.0. [SR28](standing-rules.md#sr28) amended |
| [A54](#a54) | Under `caseInsensitive`, a cached hit outlives an earlier own name that also matches — a case variant keeps answering a later own name, and a fresh lookup's refusal of the earlier one is skipped | core | fix | Open — opened 2026-11-01 by the code review of the [A33 plan](a33/plan.md)'s step 2; present in `eval-core` 0.15.0 and unchanged by A33's fix. The blocked value is neither returned nor written. Not scheduled |
| [A55](backlog-retired.md#a55) | `safeGetProperty` swallows a getter's or a proxy trap's throw and reads `undefined`; under `caseInsensitive` an inherited getter is read twice first | core | fix | **Retired — fixed 2026-11-05**, as step 2 of the [A48 plan](a48/plan.md); released 2026-11-08 in `eval-core` 0.16.0, tagged 7d9d488. A getter's or a proxy `get` trap's throw reaches the caller in both modes, a destructuring read's too; a null or undefined object still reads `undefined`. Opened 2026-11-03 by the plan's step 1; predated it |
| [A56](#a56) | `this.k = v` writes to the receiver `getThis` answers, while `this.k` reads what `k` reads: a global prior scope's `thisArg` takes the write, and the scope keeps its `k` | core | decision, then fix | Covered — opened 2026-11-03 by the [A48 plan](a48/plan.md)'s step 1, which pins it (`eval.service.scope-this.spec.ts`, W1–W10) and corrects the README; predates it. Not scheduled |
| [A57](#a57) | Under `caseInsensitive`, `fromContext`'s copy of a plain object holds its own enumerable string-keyed properties only: a class instance's methods and accessors, and non-enumerable and symbol-keyed properties, are not read | core | decision, then fix | Covered — opened 2026-11-03 by the [A48 plan](a48/plan.md)'s step 1, which pins it (`eval.service.case-insesitive.spec.ts`, Q1–Q8); predates it. Not scheduled |
| [A58](#a58) | `eval-core` does not read as the context an object that is not an instance of this realm's `Object`, one with a null prototype or one made in another realm: `fromContext` does not copy it, its names read `undefined`, and a write to them does not reach it | core | fix | Covered — opened 2026-11-04 by the [A48 plan](a48/plan.md)'s step 1, which pins it (`eval.service.case-insesitive.spec.ts`, Q9 and Q10) and states it in the README; predates it. Not scheduled |
| [A59](#a59) | A member read consults a proxy beyond its `get` trap: its `getPrototypeOf` at the class checks in both modes, and under `caseInsensitive` its `ownKeys` at the lookup cache and its `has`, after which a key a proxy answers but `in` misses is searched for a case variant, read or refused | core | fix | Covered — opened 2026-11-05 by the [A48 plan](a48/plan.md)'s step 3, which pins it (`member-read.spec.ts`); predates it in part. Not scheduled |
| [A60](#a60) | A member write to a `Registry` that is the context, reached as a value in the host's own data, can shadow the method the evaluator calls on it: `self.get = 1` makes every later `k` throw | core | fix | Open — opened 2026-11-06 by the [A48 plan](a48/plan.md)'s step 4, from its step 3's measurement; predates it. Not scheduled |
| [A61](#a61) | A native function the host places in the context, `Object.assign`, `Reflect.set` or `Object.defineProperty`, writes an `EvalScope` held as a value, its fields included, past A51's refusal of a member write | core | fix | Open — opened 2026-11-06 by the [A48 plan](a48/plan.md)'s step 5, from step 4's code review; predates it. Not scheduled |
| [A62](#a62) | Evaluation time and memory are not bounded: a regular expression that backtracks, in a literal or built from a string, and a large allocation, each run inside one built-in call, which neither the iteration budget nor the call stack reaches | core | decision | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its finding 9 |
| [A63](#a63) | No published package of the workspace loads in plain Node as installed: each throws at import, `ParserService` needing the JIT compiler, unless `@angular/compiler` was imported first | core | decision | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its finding 25 (M14) |
| [A64](#a64) | `eval-core` asks a write policy only at an expression's own assignments and updates and its own calls of the built-ins in its table of writers, so three kinds of route write: a table built-in that native code calls (`[1].forEach(t.push, t)`), a built-in outside the table that changes what it is handed (`getOrInsert` on a `Map` or a `WeakMap`, a regex's `lastIndex`, `RegExp#compile`, a `DataView`'s setters, `ArrayBuffer#transfer` and `resize`, an array iterator's `next`), and a function the host supplies (`Reflect.set`, `Atomics.store`); each writes what an expression was given under `eval-signals`', `eval-forms`' and `eval-rules`' contexts | core, signals, forms, rules | fix | Open — Not scheduled (SR48). Opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 4, from its second code review (I-A); its first commit, 2026-11-25, corrected the published packages' sentences false on 0.16.1 ([SR31](standing-rules.md#sr31)) and opened [A67](#a67); the fix's code commit, the same day, asks about a table built-in handed as an argument to a function the walk did not create: the direct-argument case is closed; the rest of the first kind and the other two kinds are open |
| [A65](backlog-retired.md#a65) | A computed member key that is not a string, number or symbol passed the dangerous-name blocklist unconverted and was converted at the access: `o[["constructor"]]` read `Object`. Up to 0.12.0 a route to code execution, and from 0.12.1 to writes into `Object.prototype` | core | fix, security | **Retired — fixed 2026-11-21**; released 2026-11-22 in `eval-core` 0.16.1, tagged 188c0d9. Opened and retired by its post-publish commit |
| [A66](#a66) | `eval-core` 0.16.1's CHANGELOG leaves out two consequences of its key conversion: an object literal's computed key that is not a string or number now creates the property, where 0.16.0 dropped it; and a read hook and a write policy receive the converted key, where they received the array | core | docs | Open — opened 2026-11-22 by 0.16.1's post-publish commit, from 188c0d9's code review; for `eval-core`'s next release |
| [A67](#a67) | A write of a name on `eval-core`'s blocklist of dangerous names is refused with `eval-core`'s own `Error` before the context is asked, for a bare name and for a member key on an object or array, so `eval-signals`' and `eval-forms`' write bypass, which matches `SignalContextWriteError` by class, routes it through `onError` like a runtime failure: under `'undefined'`, `eval-forms`' default, `o.constructor = 1` renders a blank. Nothing is written | core, signals, forms | fix | Open — not scheduled ([SR48](standing-rules.md#sr48)): a refused write, nothing written, and the READMEs say so. Opened 2026-11-25 by [A64](#a64)'s first commit, from its sweep |
| [A68](#a68) | With a read hook installed, a fact's getter read by bare name runs twice per read: `fact + 1` calls it twice and `fact + fact` four times, against once and twice without the hook; a member read, `obj.fact + 1`, calls it once either way | core | fix | Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-26 by the [Phase 12 plan](eval-rules/plan.md)'s step 5, from its second commit's review (M-2) |
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
| [D13](backlog-retired.md#d13) | A rule whose top-level statement `eval-core` refuses registers in both adapters and renders blank under the default policy | forms, core | decision, then fix | **Retired — decided 2026-10-30, fixed 2026-10-31**, as steps 5 and 6 of the [A24 plan](a24/plan.md); released 2026-10-31 in `eval-core` 0.15.0 and `eval-forms` 0.8.0, tagged 67486ab. `eval-core`'s `findUnsupportedStatement` reports the first statement evaluation would refuse, from the table the evaluator reads, and both `eval-forms` adapters refuse such a rule at registration wherever the statement sits, a label with its `colonIdentifiers` hint. Reverses the Phase 9 plan's § 3.8. Opened 2026-10-10 by the Phase 9 plan; a top-level label refused since its step 6, released 2026-10-14 in `eval-forms` 0.5.0, tagged 3466c80 |
| [E1](#e1) | Form-state keys across both adapters | forms | phase | Open — **no phase reserved** |
| [E2](#e2) | Arrays — `applyEach` at `/signals`, `FormArray` at `/reactive` | forms | phase | Open |
| [E3](#e3) | `dependencies` introspection at form scale | forms | phase | Open |
| [E4](#e4) | Short-circuiting / value-rewriting hooks | core | phase | Open, by design |
| [E5](backlog-retired.md#e5) | The options-first style cannot read `hookErrors` | core | decision | **Retired — decided 2026-09-30: closed with documentation**; no API. The README names the two routes, state-first or `onHookError: 'throw'` |
| [E6](backlog-retired.md#e6) | `exit` has no mark to bound its scan | core | fix | **Retired — fixed, Phase 2 step 1**; released in `eval-core` 0.4.0; its "Phase 2 makes it reachable" premise was wrong |
| [E7](#e7) | The parts of the rule design that no phase has: a converter from an earlier rule format, `parallel` and `fanOut`, a rule as a `computed`, timer and route event sources | rules | phase | Open — **no phase reserved**; not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its § 3.3 |
| [E8](#e8) | What `eval-rules` 0.1.0 refuses and a later minor can admit: `caseInsensitive`, facts that are a class instance or a `Registry`, and `maxIterations` as an option | rules | decision | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its § 8 q3, q7, q15 and q21 |
| [E9](#e9) | `compileRule`'s sets of names and its duplicate check are keyed on strings as long as a rule's names and keys, which V8 hashes by length past 16,383 characters: calculations named, or unknown fields keyed, 17,000 characters compile superlinearly in their count | rules | decision | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 3 third follow-up, from 6997575's code review (N-a) |
| [E10](#e10) | A function a rule's field gives, such as an arrow among the calculations, runs after the run against the facts alone: its `calc`, `event` and declared functions name the facts' own | rules | decision | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 4, from its second code review (M-1) |
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
| [F16](#f16) | Workspace dependency advisories — 9 moderate on the workspace's Angular 22.0.8, and a **temporary override under `nx`**, now `undici`'s; beside it, the **`qs` override**, whose floor `^6.14.2` excludes GHSA-w7fw-mjwx-w883 since 2026-10-29; and **`deepmerge`** 4.3.1, under `jest-config`, GHSA-gcqx-w48m-w2h4 with no patched release | repo | fix | Open — **part 2's `brace-expansion`, `smol-toml` and `axios` overrides retired 2026-10-23** with `nx` 23.3.0 ([F21](backlog-retired.md#f21)); part 2 now holds `overrides.nx.undici` only, until a stable `nx` no longer pins `undici` below 7.30.1. **Part 1 retired 2026-09-27**: `nx` 23.2.1, Angular 22.1.8 / 22.1.9, `npm audit` 0 at every severity. Part 2, the override, is live until a stable `nx` depends on `smol-toml >= 1.7.1`. **Re-audited 2026-09-30: 22 (14 high, 8 moderate)**, none reaching a published package; **fixed the same day**: Angular 22.2.1 / 22.2.0, two more `overrides.nx` entries, `verdaccio` removed, `npm audit` 0. **`qs` recorded 2026-10-14**: the override was added for GHSA-6rw7-vpxm-498p, not prototype pollution; raising its floor is held here. **Re-audited 2026-10-20 at 7741395**: `qs` resolves 6.16.0, past both advisories, and audit reports nothing for it. **Re-audited 2026-10-26 at f78fca2: 2 (1 high, 1 moderate)**, seven `undici` and `fast-uri` advisories, dev-only; **fixed the same day** in range: `undici` 8.12.3, `fast-uri` 3.1.9, and `overrides.nx.undici`'s floor raised to `^7.30.1`, `npm audit` 0. **2026-10-29**: the `qs` floor raised to `^6.14.2`, the lockfile unchanged; `deepmerge` recorded, 11 low, dev-only, open until a release past 4.3.1 or a `jest-config` without it. **Re-audited 2026-10-31 at cc40f9e: 50 (1 high, 48 moderate, 1 low)**, four advisories, dev-only; `follow-redirects` **lifted the same day** in range to 1.16.2, the lockfile alone; `minimatch` and `glob` recorded, no patched release in their dependents' ranges, open beside `deepmerge`. **Re-audited 2026-11-22 at 252f618: 33 moderate**, from `glob` and `minimatch`; held open by them and by part 2's `undici` override, `deepmerge` no longer reported and no longer holding it |
| [F17](#f17) | An unhandled rejection reaches no channel a spec would normally watch — only zone.js's `unhandledPromiseRejectionHandler` hook sees it | repo | test gap | Open — opened 2026-10-08 by Phase 5 step 2 |
| [F18](backlog-retired.md#f18) | `eval-signal.ts` line citations in `eval-forms` comments and completed plans are stale | forms, repo | docs | **Retired — fixed 2026-10-10** in live source; completed records kept as written, per `CLAUDE.md`. The three `eval-forms` comments cite symbols; `applyErrorPolicy`'s ships in the core `.d.ts` |
| [F19](backlog-retired.md#f19) | `CLAUDE.md` cites the resolved-key re-check as `member-expression.ts:188`; it was at `:211`, and is at `:244` | repo | docs | **Retired — fixed 2026-10-21** by Phase 10 step 6: `CLAUDE.md` cites `isDangerousProperty(foundKey)` in `member-expression.ts` by symbol, as the entry's fix recorded |
| [F20](backlog-retired.md#f20) | `CODE_OF_CONDUCT.md`'s enforcement contact is an address of the upstream `jse-eval` author, not this repository's maintainer | repo | docs | **Retired — fixed 2026-10-22**, in no package: reports go to the maintainer's GitHub account, or privately through GitHub's abuse reporting; no address |
| [F21](backlog-retired.md#f21) | Build-tooling advisories: 32 findings (11 high, 21 moderate) from `@modelcontextprotocol/server` via `@angular/cli`, `follow-redirects` via `nx`, and `sprintf-js` via the jest chain — none in a published package | repo | fix | **Retired — fixed 2026-10-23**, in no package: Angular 22.2.3 / 22.2.4 and `nx` 23.3.0, `npm audit` 11 high → 0. `nx` 23.3.0 pins `undici` 7.29.0, so a nested `overrides.nx.undici` replaces the old three ([F16](#f16) part 2); `sprintf-js` was no longer reported at the 4246308 baseline |
| [F22](backlog-retired.md#f22) | `eval-core`'s F10 block, ungated in two places: eight allowlist entries its README now documents, so the free-functions sentence can be deleted with F10 green; and the docblock's "twenty-one of the sixty", which no case checks | core | fix (test) | **Retired — fixed 2026-10-21** by Phase 10 step 5: the eight entries removed, the figure dropped, and a case that fails on an allowlisted name the README names |
| [F23](backlog-retired.md#f23) | Live documents claim guarantees the library does not give: twelve root README lines ("secure", "complete prototype pollution prevention", "function sandboxing", "prevents injection attacks"), and `eval-core`'s README saying an expression over an empty context "cannot use JavaScript's built-in functions", when a value's own methods stay callable | repo, core | docs | **Retired — fixed 2026-10-21** by Phase 10 step 5: the landing page keeps none of the twelve lines, and the `eval-core` README names the globals and says a value's own methods stay callable, with an `[Unreleased]` line. The README line released 2026-10-22 in `eval-core` 0.13.1, tagged 5b9c859; the root README part ships in no package |
| [F24](backlog-retired.md#f24) | The `eval-signals` and `eval-forms` copies of `export-list.spec.ts` have no reverse case, so an allowlist entry the README documents would mask its mention's deletion, as F22 found in `eval-core` | signals, forms | test gap | **Retired — fixed 2026-10-22**, in no package: each copy has F22's helper and case, which fails in that project alone on an allowlisted name its README documents |
| [F25](backlog-retired.md#f25) | Four documentation checks Phase 10 left undecided: no gate fails when `docs/README.md` stops linking a tracked `docs/` file; two links into `eval-core`'s CHANGELOG headings left the doc-links gate when they became absolute; doc-links silently skips an untracked `.md`; and whether a published README's absolute link binds its target path and anchor for good | repo | decision | **Retired — decided and fixed 2026-10-23**, in no package: a published link binds, and `tools/doc-links.mjs` checks the index, names and checks untracked files, and resolves absolute links into the tree and every link in `tools/published-links.txt` |
| [F26](backlog-retired.md#f26) | `tools/release-tags.mjs` does not check that a release tag is annotated: it resolves each tag with `git rev-list -n 1`, which accepts a lightweight tag, so the register's "all annotated" is checked by nothing | repo | fix | **Retired — fixed 2026-10-26**, in no package: every `eval-core@`, `eval-signals@` and `eval-forms@` tag must be a tag object, with or without a row, and a lightweight one fails, named once; the `v*` tags are not checked |
| [F27](backlog-retired.md#f27) | The process and verification rules were copied across `CLAUDE.md`, the `step` skill, the `code-reviewer`, `CONTRIBUTING.md` and four plans' rule sections, and the copies had drifted: twenty divergences, among them three different gate commands | repo, core | docs | **Retired — fixed 2026-10-27**: [`docs/standing-rules.md`](standing-rules.md), SR1–SR38, imported by `CLAUDE.md`; the copies cite it. In no package, but for `contextPush`'s docblock, released 2026-10-30 in `eval-core` 0.14.1, tagged 95932e6, documentation only |
| [F28](backlog-retired.md#f28) | The consumer documents Phase 10 left out: whether the package READMEs split into guides, where a guide lives and whether it ships; `eval-forms`' README, at 893 lines, by entry point first | repo, core, signals, forms | decision | **Retired — decided 2026-10-27, released 2026-10-29** as Phase 11: one README per package and no guide files; `eval-forms`' ordered by entry point, with a contents list, in `eval-forms` 0.7.1, docs-only |
| [F29](backlog-retired.md#f29) | The README's "a rule that does not parse throws at registration, whatever the policy" is witnessed at both adapters under the default policy only; a function policy, the other one that swallows an error, is unwitnessed | forms | test gap | **Retired — fixed 2026-11-07**, as step 6 of the [A48 plan](a48/plan.md); tests only, ships in no package. Opened 2026-10-28 by Phase 11 step 2's code review |
| [F30](backlog-retired.md#f30) | `eval-signals` 0.8.0's `await` claims — the sync signal's throw on a refused `await` and its operand by identity, the async signal resolving an accepted one, a rejection as raised — are measured through the package once, and witnessed by no row of it | signals | test gap | **Retired — fixed 2026-10-31**, in no package: five rows, `eval-signals` 444 → 449, committed after the release commit 67486ab and before the publish. Opened the same day by the A24 plan's step 7a code review |
| [F31](#f31) | `eval-core` 0.16.0's A55 at `eval-forms`' `/signals` — a rule over a getter that throws now sees its throw under `'throw'` or a function policy — is witnessed by no row; `/reactive`'s three rows witness it there | forms | test gap | Open — opened 2026-11-08 by the [A48 plan](a48/plan.md)'s step 9, from step 8's code review |
| [F32](#f32) | `eval-core`'s barrels re-export 26 types without `export type`, so its source does not compile under `isolatedModules` (`TS1205`); an application that compiles the source, as the demo does, turns the option off | core | fix | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-15 by the [Phase 19 plan](demo/plan.md)'s step 1, from its M2 |
| [F33](#f33) | Two of `eval.service.memory-leaks.spec.ts`' collector cases have failed in a full gate, (1.5) once and the positive control (2.3) twice, and each passed on the next, with no edit | core | test gap | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-18 by the [Phase 19 plan](demo/plan.md)'s step 8, from the reviewing chat's gates |
| [F34](#f34) | `tools/doc-links.mjs` exits with an unhandled `ENOENT` on a tracked file deleted from the working tree and not staged, where it reports a dangling link once the deletion is staged | repo | fix | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-18 by the [Phase 19 plan](demo/plan.md)'s step 8, noticed at its step 3 |
| [F35](#f35) | `eval-rules`' and `eval-signals`' `test-setup.ts` do not type-check under their spec configs: `tsc` reports `TS2353` for `errorOnUnknownElements`, which ts-jest never sees | rules, signals | fix | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 4; noticed at its step 3 |
| [F36](#f36) | A case of the demo's `dependencies.example.spec.ts` reaches Jest's 5 s timeout under a full gate's load and passes on the next run | demo | test gap | Open, not scheduled ([SR48](standing-rules.md#sr48)) — opened 2026-11-22 by 0.16.1's post-publish commit, from two step 4 reports |
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
[C1](backlog-retired.md#c1)'s fix. [A24](backlog-retired.md#a24), [A25](backlog-retired.md#a25) and [A26](backlog-retired.md#a26) were surfaced by the Phase 5 plan's probes
([`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 1.3), which keeps all three out of its scope
(§ 3.1). [A29](backlog-retired.md#a29) and [A30](backlog-retired.md#a30) were surfaced by the Phase 9 plan's probes
([`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) § 1.3), which needs neither;
A30 was decided by documenting what the setter configures.
[A31](backlog-retired.md#a31) and [A32](backlog-retired.md#a32) were found by A29's fix, grepping for other keys built
from an object's shape; A32 was decided by deleting the cache. [A33](backlog-retired.md#a33) is a limit A31's fix left, fixed by the
[A33 plan](a33/plan.md); [A34](backlog-retired.md#a34) is one A26's fix left, decided by the same plan a documented limit. [A44](backlog-retired.md#a44)–[A47](backlog-retired.md#a47) were found by the
[A40](backlog-retired.md#a40) and [A41](backlog-retired.md#a41) batch: A44 by its
`caseInsensitive` matrix, A45 while correcting `SECURITY.md`'s account of an assignment, and
[A46](backlog-retired.md#a46) and A47 by its code review. A46 is fixed and retired, and ships with
the batch in `eval-core` 0.13.2. A47 is fixed and retired, released 2026-10-30 in `eval-core` 0.14.1, tagged 95932e6.

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

<a id="a54"></a>
## A54 — Under `caseInsensitive`, a cached hit outlives an earlier own name that also matches

**Package** core · **Kind** fix · **Status** Open. Opened 2026-11-01 by the code review of the
[A33 plan](a33/plan.md)'s step 2. Present in `eval-core` 0.15.0 and unchanged by
[A33](backlog-retired.md#a33)'s fix. Not scheduled

A found key is reused while it is still an own key of the object (`property-lookup-cache.ts`, the
hit path), with no scan. A fresh lookup answers the first own name, in own-name order, that matches.
So after `y = { Prototype: 1 }` and a read of `y.PROTOTYPE`, then `y.prototype = 7; delete
y.Prototype; y.Prototype = 1`, which leaves the order `prototype, Prototype`, `y.PROTOTYPE` reads `1`
and `y.PROTOTYPE = 2` writes `Prototype`, where on a fresh object of that order the read and the
write are both refused "prototype" (measured, `arms-A.json` and `arms-B1.json`), and `Prototype`
keeps its value.

**Impact: a skipped refusal**, as A33's was. The blocked property's value is neither returned nor
written: `prototype` stays `7`.

**Fix**, if ever: re-validate a hit as A33's fix re-validates a miss, which costs the hit its O(1);
measure it ([SR28](standing-rules.md#sr28)).

*Recorded*: this entry.
*Verified*: measured 2026-11-01 on the production bundles of 0.15.0's code and of A33's fix, with
`i3m3.mjs` and `arms.mjs`, pinned in the A33 plan's prototype folder, and by the reviewer.

<a id="a56"></a>
## A56 — `this.k = v` writes to the receiver, while `this.k` reads what `k` reads

**Package** core · **Kind** decision, then fix · **Status** Covered. Opened 2026-11-03 by the [A48 plan](a48/plan.md), step 1 (its
§ 1.4, finding 6), which pins it. It predates that plan. Not scheduled

A read of `this.k` resolves `k` through the context's chain, as the identifier does: pushed scopes,
the original, then prior scopes. A write, `this.k = v`, goes to the receiver `EvalContext.getThis`
answers: the original when it holds `k`, else the `thisArg` of the first prior scope that holds it,
pushed scopes not consulted. With no receiver, the write's target is the context, which
[A42](backlog-retired.md#a42) refuses. Measured 2026-11-03 on the production bundle of 3bbc296
(`s2.mjs`, `s3.mjs`, `s4.mjs`, `a56.mjs` and `rows-s1.mjs`, pinned in the plan's supplements), on a context whose own
object does not hold `k` and a global prior scope `{ k: 10 }`:

| The scope | `this.k = 2` | Then `k` and `this.k` |
| :--- | :--- | :--- |
| `thisArg: { k: 't' }` | `2`; `thisArg.k` is `2`; the scope keeps `10` | `10` and `10` |
| no `thisArg` | refused, `Write to the evaluation context is blocked for security reasons` | `10` and `10` |

Both case modes alike. A namespaced
prior scope answers its own name the same way: `this.cat = 2` writes its `thisArg.cat` (`namespace`).
Two global scopes: the first that holds `k` decides, so a `thisArg` on a scope
that does not hold it is not used, and `k` held by a scope without one is refused. When the
context's own object holds `k` the write goes there, case-sensitively to the caller's object and
under `caseInsensitive` to the copy, into its map since [A50](backlog-retired.md#a50)'s fix. In `(k => (this.k = 5, k))(1)` over
`{ k: 0 }`, the read sees the parameter, `1`, while the write goes to the original's `k`. Over
`{ k: undefined }`, `this.k = 1` is refused while `k = 1` writes, since `getThis` tests the value.

"Holds" is a value other than `undefined`, for the original and a prior scope alike (`s3.mjs`, the
`holds` rows): a scope `{ k: undefined }` is passed over for the next that holds `k`, and a caller's
`{ k: undefined }` leaves the write to the scope's `thisArg`. A `k` the expression binds itself,
with `let`, `const` or an arrow parameter, is what `this.k` and `k` read first, and `this.k = v` never
writes it (`s3.mjs`, the `bound` rows): `let k = 1; this.k = 2; this.k` is `1`, while `thisArg.k`
becomes `2` and the scope keeps `10`. A host `Registry` passed as the context, and a prior scope
backed by a `Registry`, behave as plain objects do ([SR19](standing-rules.md#sr19); the `shape` rows).
A scope the caller pushes with `EvalContext.push` is read by `k` and `this.k` before the prior scope,
while `this.k = 2` still writes `thisArg.k` (`s4.mjs`, the `pushed` rows).

Under `caseInsensitive`, a `K` spelled otherwise than `k` turns the write into a refusal or moves it
(`s5.mjs`, the `variant` rows): with `let K = 1`, `(K => …)(1)` or a pushed `{ K: 'p' }` beside a
global scope `{ k: 10 }` with a `thisArg`, `this.k = 2` is refused, `Write to the evaluation context
is blocked for security reasons`; over a case-insensitive `Registry` scope holding `K`, it writes
`thisArg.K` and leaves `thisArg.k`. Case-sensitively the binding or scope holding `K` does not hold
`k`, and the write goes to `thisArg.k`.

When `thisArg` is an object the context's reads also reach, the write is read back (`s6.mjs`, the
`thisarg-read` rows): case-sensitively, with the caller's own object as `thisArg`, `this.k = 2` writes
`caller.k`, and `k` and `this.k` then read `2`, where they read `10` before; under `caseInsensitive`
they still read `10`, the caller's object being behind the copy. An earlier prior scope's object as
`thisArg` reads back `2` in both modes when it is a plain object; a `Registry` there takes an own `k`
beside its map and is not read back, `k` and `this.k` reading `10`, as for any `Registry` `thisArg`
but the context's original, which since [A50](backlog-retired.md#a50)'s fix is written through its
map and read back, in both modes, the copy under `caseInsensitive` included (measured 2026-11-06 on
0.15.1, 0dc9c15, 6086872 and the plan's step 4 code, `s12.mjs`, its `A56` and `THISARG` rows; on
0.15.1 and 0dc9c15 the original took an own `k` as well). A `thisArg` that is `null` is refused as the context, one that
is frozen fails as strict JavaScript would, and a number is refused, `Cannot set property on
non-object: number` (`thisarg-odd`).

The README's `### Scopes` said "Only the call's receiver changes", false for a write through `this`;
the plan's step 1 scoped it to a namespace ([SR31](standing-rules.md#sr31)), leaving a write through
`this` unpromised ([SR44](standing-rules.md#sr44)), and pins the entry's behaviour with
`eval.service.scope-this.spec.ts`' W1–W10, so the entry is Covered.

**Fix**, if ever: a write through `this` resolved through the same chain as the read. It changes what
a published path writes, so it is a decision with its own plan.

*Recorded*: this entry; the [A48 plan](a48/plan.md) § 1.4. *Verified*: the rows above, and W1–W10 with their probes,
P1-1 to P1-3, P1-9 to P1-14, P1-16 and P1-17, and for the scope's `k` after a write, P2-11 (the plan's
step 2); for a `Registry` `thisArg`, `assignment-target.spec.ts`' `Y` rows, those of another
`Registry` held under this ID, and their probes P3-2, P3-12 and P4-6 (step 4).

<a id="a57"></a>
## A57 — Under `caseInsensitive`, `fromContext`'s copy holds own enumerable string-keyed properties only

**Package** core · **Kind** decision, then fix · **Status** Covered. Opened 2026-11-03 by the [A48 plan](a48/plan.md), step 1 (its
§ 1.4, finding 7), which pins it. It predates that plan. Not scheduled

Under `caseInsensitive`, `fromContext` (`classes/common/context.ts`) copies a plain object into a
case-insensitive `Registry` with `Registry.fromObject`, which takes `Object.entries`. Measured
2026-11-03 on the production bundle of 3bbc296 (`s2.mjs`, the `A57` rows), each beside the same object
read case-sensitively, where the object itself is the context:

| The object holds | Case-sensitive | `caseInsensitive`, through the copy |
| :--- | :--- | :--- |
| an own enumerable getter `g` | `g` read at each read | read once, when the copy is made; `g` and `this.g` read that value |
| a class instance's inherited accessor `g` and method `m` | `g` is `7`, `m()` is `'m'` | `g` and `this.g` are `undefined`; `m()` throws `Cannot call undefined or null function` |
| a class instance's own field `own` | `1` | `1` |
| a non-enumerable property `h` | `3` | `undefined` |
| a symbol-keyed property, read as `this[s]` | `2` | `undefined` |

Names that differ only in case collapse into one entry, the last listed winning: over `{ k: 1, K: 2 }`
both `k` and `K` read `2` (`s4.mjs`, the `collapse` rows). An identifier assignment to one of the copy's
names, `k = 5`, changes the copy and not the caller's object; a later `k`
reads `5`. Where the expression binds `k` itself, with `let` or an arrow parameter, the assignment
changes that binding and neither the copy nor the object (`s3.mjs`, the `bound` rows). A write
through `this`, `this.k = 5`, changes the copy's map and not the caller's object, so a later `k`
reads `5`, since [A50](backlog-retired.md#a50)'s fix, 2026-11-06; up to then it landed on the copy's
instance beside its map, and a later `k` read `1` (`s4.mjs`, the `copy-this` rows; the
[A48 plan](a48/plan.md)'s supplement 11, `a50.mjs`). An identifier write while the caller has pushed a
scope that holds `k` changes that scope, and after `pop()` the copy still reads `1` (`s5.mjs`, the
`pushed-write` rows). On every one of these paths, and for `this.k += 5` and `k++`, the caller's object
is left as it was (`s5.mjs`, the `this-write` rows). The copy is
shallow, so `user.name = "x"` writes into the caller's own `user`.
`simpleEval` over a plain object under `caseInsensitive` copies it the same way. A `Registry` and an
`EvalContext` are taken as they are, not copied, and a `Map` is copied as an object, its entries not
read (`s6.mjs`, the `copies` rows).

The README's `### Scopes` says only that `fromContext` "copies the object into a case-insensitive
store", of a plain object, with [A58](#a58)'s exception; what the copy holds, and where a write to
one of its names goes, are left unpromised ([SR44](standing-rules.md#sr44)): each wording of them drew a
counter-example (the [A48 plan](a48/plan.md) § 4.1). The plan's step 1 pins them with
`eval.service.case-insesitive.spec.ts`' Q1–Q8, so the entry is Covered.

A write reaches the caller's object when the caller has given the evaluation that object a second way
(`s7.mjs`, the `alias` rows): pushed with `EvalContext.push` without `caseInsensitive`, the pushed
object itself is written by `k = 5` (with it, the push makes a second copy, and the caller's `k` stays
`1`); and a caller `{ k: undefined }` that is also a global scope's `thisArg` takes `this.k = 2`.

**Fix**, if ever: a copy, or a case-insensitive view, that reads through to the object. It changes
what every `caseInsensitive` evaluation over a class instance reads, and how often a getter runs, so
it is a decision with its own plan; [A49](backlog-retired.md#a49)'s getter count changes with it.

*Recorded*: this entry; the [A48 plan](a48/plan.md) § 1.4. *Verified*: the rows above, and Q1–Q8 with their probes,
P1-4 to P1-8, P1-15 and P1-20.

<a id="a58"></a>
## A58 — `eval-core` does not read an object outside this realm's `Object` as the context

**Package** core · **Kind** fix · **Status** Covered. Opened 2026-11-04 by the [A48 plan](a48/plan.md), step 1 (its
§ 4.1, the third review's I-c, widened by the fifth's), which pins it. It predates that plan. Not
scheduled

`fromContext`, `getContextValue`, `setContextValue` and `EvalContext`'s own reads and writes test the
context with `instanceof Object`, which an object that is not an instance of this realm's `Object`
fails: one made by `Object.create(null)`, or one made in another realm, an iframe's or
`vm.runInNewContext('({ k: 1 })')`'s. Measured
2026-11-04 on the production bundle of 3bbc296 (`s5.mjs`, the `null-proto` rows), over such an
object holding `k: 1`:

| Expression | Case-sensitive and `caseInsensitive` |
| :--- | :--- |
| `EvalContext.fromContext(o, options)` | `o` itself, not copied; a plain object is copied under `caseInsensitive` |
| `k`, `this.k`, `K` | `undefined`; `k` too through `simpleEval(…, o)` |
| `k = 5` | `5`; `o.k` stays `1` |
| `this.k = 5` | refused, `Write to the evaluation context is blocked for security reasons` |
| `d.k`, the object held as a value under `d` | `1` |

An object made in another realm gives the same rows (`s7.mjs`, the `realm` rows).

The same holds behind the context. Measured 2026-11-05 on the production bundle of bdaa542 (`a58.mjs`,
pinned in the plan's supplement 8), such an object as a global prior scope, or as a scope the caller
pushes with `EvalContext.push`, is passed over in both modes: `k` and `this.k` read `undefined`, where
a plain object in its place answers `1`. With such a pushed scope, `k = 5` writes past it, to the
caller's object case-sensitively and to the copy under `caseInsensitive`, and the scope keeps `k: 1`.

So a dictionary made with `Object.create(null)`, or an object from another realm, cannot serve as the
context, in either mode, while it reads as a value. [SR19](standing-rules.md#sr19) names a
null-prototype object as a fixture shape; no row held one as the context. The README says so from the
plan's step 1 ([SR31](standing-rules.md#sr31)), pinned by `eval.service.case-insesitive.spec.ts`' Q9 and
Q10, so the entry is Covered.

**Fix**: the context tests take any non-null object, as `safeSetProperty` already does, and the
`caseInsensitive` copy takes such an object like a plain one. It changes what a published
path reads, so it ships in a minor with its rows rewritten.

*Recorded*: this entry; the [A48 plan](a48/plan.md) § 4.1. *Verified*: the rows above, and Q9 and Q10 with their
probes, P1-18 and P1-19; since the plan's step 2 each of Q9's and Q10's assertions is a case of its own in
each mode, and P2-10 probes the contrast, `d.k`.

<a id="a59"></a>
## A59 — A member read consults a proxy beyond its `get` trap, and acts on what the other traps answer

**Package** core · **Kind** fix · **Status** Covered. Opened 2026-11-05 by the [A48 plan](a48/plan.md),
step 3, at the maintainer's decision, gathering what its steps 2 and 3 measured and recorded without an
entry. It predates the plan in part. Not scheduled

JavaScript's `px.k` calls a proxy's `get` trap and nothing else. The evaluator's member read calls
more, in three places, and two of them change what is read:

- **`getPrototypeOf`, in both modes.** The evaluator's own class checks, its `instanceof` tests before
  every member read, call it, and its throw reaches the caller before any read: `px.k` over a proxy whose `getPrototypeOf` trap throws throws that value,
  where JavaScript reads `px.k`. A revoked proxy throws at this call, `Cannot perform 'getPrototypeOf'
  on a proxy that has been revoked`, where JavaScript names `get`. Outside every `catch`, unchanged by
  [A55](backlog-retired.md#a55)'s fix.
- **`ownKeys`, under `caseInsensitive`.** The lookup cache lists the object's own names, so a proxy
  whose `ownKeys` trap throws throws from `px.k`; case-sensitively `px.k` reads `1`. Also outside the
  `catch`.
- **`has`, then a case-variant search, under `caseInsensitive`.** Since [A48](backlog-retired.md#a48)'s
  fix, a key no own name matches is tested with `in`, so a proxy's `has` trap is called; a throw from
  it, or from a searched prototype's `ownKeys`, is caught and the key read as written. For a proxy with
  no `has` trap, `in` answers from its target, so a key the proxy answers by `get` but its target does
  not hold is searched for a case variant on the target's prototype, as `=` already searched it: the
  variant is read, `px.getx` over an instance whose prototype has a method `getX` reads the answer for
  `getX`, and `px.getx += 1` reads and writes `getX`; or refused when it is a blocked name, so over `{}`
  `px.tostring` throws `Access to dangerous property "toString" is blocked for security reasons`. Up to
  0.15.1 the read tested the key by reading it, read it as spelled, twice, and never searched. The
  CHANGELOG states this under `### Breaking` for 0.16.0.

A member write calls `getPrototypeOf` as well, in both modes, and the plan's steps 3 and 4 each add
one call: since [A50](backlog-retired.md#a50)'s fix, `writeMemberTarget`'s `instanceof Registry` on a
target that is the context's original, reached through the context, and since
[A51](backlog-retired.md#a51)'s, `safeSetProperty`'s `instanceof EvalScope` on every target it writes.
Counting a whole expression's calls on the production bundles of 0dc9c15, 6086872 and step 4's code
(`s12.mjs`, its `A59` rows, the plan's supplement 12), case-sensitively over a proxy original
`{ k: 1 }`: `this.k = 5` makes 3, 4 and 5, and `this.k += 5` and `this.k++` 5, 6 and 7; over a proxy
held as a value, `px.k = 5` and `px.k += 5` make 3, 3 and 4, and the read `px.k` 2 on each.
JavaScript's `px.k = 5`, `px.k += 5` and `px.k` call none. Under `caseInsensitive` a proxy context is
copied, so the original is not the proxy.

Measured 2026-11-05: on the production bundle of bdaa542 with P55 and P48 (`q1.mjs`, the
[A48 plan](a48/plan.md)'s supplement 8), and on published 0.15.1, 0dc9c15 and 0dc9c15 with P50
(`a50.mjs`, the `GETONLY` rows, its supplement 11). Pinned by `member-read.spec.ts`: § 8 q1's
`getPrototypeOf` and `ownKeys` rows and the revoked proxy, and the five rows of a proxy whose `get`
trap answers every key, each beside a native run; so the entry is Covered.

A fix is a decision, not yet made: the class checks could read the prototype without trapping, or
skip it for an object they cannot match; the `caseInsensitive` lookup could test a proxy by `get`, as
up to 0.15.1, at the cost of [A48](backlog-retired.md#a48)'s double read; or the behaviour could be
documented as a limit. The README states none of it ([SR44](standing-rules.md#sr44)).

*Recorded*: this entry; the [A48 plan](a48/plan.md) § 8 q1 and § 4, Steps 2 to 4.
*Verified*: the scripts above, each pinned with its output, and `member-read.spec.ts`' rows, red under
the plan's probes P2-7, P2-15 and P3-8. The write's counts are the script's alone, pinned by no row.

<a id="a60"></a>
## A60 — A member write to a `Registry` that is the context can shadow the method the evaluator calls on it

**Package** core · **Kind** fix · **Status** Open. Opened 2026-11-06 by the [A48 plan](a48/plan.md),
step 4, at the maintainer's decision, from what its step 3 measured. It predates that plan. Not
scheduled

The evaluator reads a `Registry` that is the context by calling its methods: `get` to read a name,
`set` to write one. A host that also holds that `Registry` in its own data lets an expression reach
it as a value, and a member write to a value is written as to any object, an own property, which
[A50](backlog-retired.md#a50)'s fix keeps so. An own property named for a method shadows it. Over
`new Registry([['k', 1]])` passed as the context and holding itself as `self`:

| Expression | Then |
| :--- | :--- |
| `self.get = 1` or `this.self.get = 1` | every later `k` and `this.k` on that `EvalContext` throws `context.get is not a function`; under `caseInsensitive` so does `k = 5` |
| `self.set = 1` | every later `k = 5` throws `registry.set is not a function` |
| `self.has = 1`, `self.getKey = 1` | `k`, `this.k` and `k = 5` as before |

Both case modes alike but where the table says. Another `Registry` held as a value, `r.get = 1`,
takes the own property and breaks nothing, since the evaluator calls no method on it. Measured
2026-11-06 on 0.15.1, 0dc9c15, 6086872 and the plan's step 4 code (`shadow.mjs`, the output in its
supplements 11 and 12), the same on each.

It is [A51](backlog-retired.md#a51)'s shape for a `Registry`. A51's refusal is of an `EvalScope`, by
class, and the plan's step 4 left it there: refusing a write to a `Registry` reached as a value would
reverse A50's decision that such a write lands as on any object (`assignment-target.spec.ts`' `H`
rows, `self.k = 5`).

A fix is a decision, not yet made: the evaluator could call `Registry`'s methods from its prototype
rather than looking them up on the instance, so an own property cannot shadow them; a member write
could refuse the names of those methods on a `Registry` that is the context; or the behaviour could
be documented as a limit. The README states none of it ([SR44](standing-rules.md#sr44)).

*Recorded*: this entry; the [A48 plan](a48/plan.md) § 4, Steps 3 and 4. *Verified*: `shadow.mjs`,
pinned with its output on each bundle above. No row pins it.

<a id="a61"></a>
## A61 — A native function in the context writes an `EvalScope` held as a value, past A51's refusal

**Package** core · **Kind** fix · **Status** Open. Opened 2026-11-06 by the [A48 plan](a48/plan.md),
step 5, at the maintainer's decision, from step 4's code review. It predates that plan. Not scheduled

[A51](backlog-retired.md#a51)'s fix refuses a member write to an `EvalScope`, in `safeSetProperty`.
A native function that writes its argument does not go through that path. A host that places an
`EvalScope` in the context as a value, `ns`, and also a writing native, lets an expression write the
scope's fields. Measured 2026-11-06 on 0.15.1 and the plan's step 4 code, the same on each and in
both case modes (`assign.mjs`, its output in the plan's supplement 15), over a global scope holding
`k: 1`:

| Expression, the host's data holding | Then |
| :--- | :--- |
| `Object.assign(ns, { _context: 9 })`, `Object` | the scope's context replaced |
| `assign(ns, { _context: 9 })`, `Object.assign` as `assign` | the same |
| `Reflect.set(ns, "_context", 9)`, `Reflect` | the same |
| `Object.defineProperty(ns, "type", { value: 9 })`, `Object` | the scope's `type` replaced |
| `Object.assign(ns, { k: 5 })`, `Object` | an own `k` on the instance, which `ns.k` never reads back |

The evaluator refuses these natives on an `EvalContext` (`refuseContextMethodWrite`, the
[A35 plan](a35/plan.md)), where they are a second line: an expression cannot obtain the context as
a value at all. An `EvalScope` it can, when the host places one. A host's own function given the
scope, `put(ns, "_context", 9)`, writes it too; that is the host's code, and no check in the
evaluator reaches it.

A fix is a decision, not yet made: `refuseContextMethodWrite` could treat an `EvalScope` as it treats
an `EvalContext`; or the README could say that a scope placed in the context is the host's object,
written by whatever the host also places there. The README states none of it
([SR44](standing-rules.md#sr44)).

*Recorded*: this entry; the [A48 plan](a48/plan.md) § 4, Step 5. *Verified*: `assign.mjs`, pinned
with its output on each bundle above. No row pins it.

<a id="a62"></a>
## A62 — Evaluation time and memory are not bounded

**Package** core · **Kind** decision · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its finding 9

`eval-core` bounds two things in an evaluation: every `for` iteration is charged against one
budget, `maxIterations`, 100,000 per outermost walk by default, and the call stack ends unbounded
recursion with a `RangeError`. It evaluates no `while` and no `do`, so no loop is endless.
Neither bound reaches the time or the memory one built-in call takes. `/^(a+)+$/.test(big)`, over a
26-character fact, ran for between 165 ms and 1,548 ms in Revision 3's run and between 193 ms and
1,386 ms in step 1's, and `big.match("^(a+)+$")` did the same with no regular expression literal in
the text, so no check of the text can refuse the form. An unpinned run on 31 characters took 50 s.
`"a".repeat(50000000)` allocated at once. Evaluation is synchronous, so a caller cannot interrupt
it. The rule design treats rule text as untrusted
([`eval-rules/design-session.md`](eval-rules/design-session.md) Q54), so a library that evaluates
it meets this.

**Verified** by the Phase 12 plan's M3, `m3-statements.mjs` in the prototype its
[§ 1.3](eval-rules/plan.md#13-mechanism-questions-measured) pins, on the `eval-core` 0.16.0 bundle
`71936aeb…7f051264`, in both runs. The times are single runs in one process, not timings under
[SR28](standing-rules.md#sr28); the claim is that they are unbounded, not how long they take. The
50 s figure is unpinned. No row pins it.

**What is published.** `SECURITY.md` says the budget counts loop iterations, not time or depth, and
that a host function's time is not counted; it does not name a built-in's. No sentence is false.
`eval-rules` 0.1.0's README states the limit (its plan's step 7), and its release commit gives
`SECURITY.md` the built-in's case (step 9).

**Not scheduled**, by SR48: it is not a way past a documented guard, since no README or
`SECURITY.md` says time is bounded; no published sentence is false; it blocks no plan; and no
consumer has reported it. **What reopens it**: a consumer's report; a host that runs untrusted text
on a server, where one request can hold a thread; or a later phase of `eval-rules` or
`eval-template` that needs a time bound. **The fix** is a decision, not costed: a time budget
cannot interrupt a built-in already running, so the candidates are refusing a regular expression
built at run time, running evaluation in a worker the host can terminate, or documentation alone.

*Recorded*: the [Phase 12 plan](eval-rules/plan.md) § 1.2 finding 9 and § 3.3;
[`eval-rules/design-session.md`](eval-rules/design-session.md) § 6 item 1 and Q60.

<a id="a63"></a>
## A63 — No published package loads in plain Node as installed

**Package** core · **Kind** decision · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its finding 25

With `eval-core` 0.16.0, `eval-signals` 0.9.0 and `eval-forms` 0.9.0 installed from the npm
registry, `import '@zvenigora/ng-eval-core'` in plain Node throws `The injectable 'ParserService'
needs to be compiled using the JIT compiler, but '@angular/compiler' is not available`, and so do
the two packages that import it; `@angular/forms` throws the same for its own `PlatformLocation`.
The bundles are partially compiled, for an Angular build to finish. With `@angular/compiler`
imported first, every entry point loads: the injector-free functions evaluate an expression, a
`let` with a `for`, and a colon-joined name; `EvalService`, `createEvalSignal`,
`bindFieldProperties` and `createExpressionRules` run over an environment injector built with no
platform, which needs a token that is not public API, and two timers of the injector's services
keep the process alive until `injector.destroy()`. No README of the three promises Node, and none
documents the import.

**Verified** by the Phase 12 plan's M14, `node-consumer/node-load.mjs` in two arms, one process
each, over the packages its pinned `package-lock.json` installs with Angular 22.2.6
([§ 1.3](eval-rules/plan.md#13-mechanism-questions-measured)). Step 1 did not run it again: its
claim is about the packages a consumer installs, not the gate's bundle. No row pins it, since the
gate runs Jest's Angular preset, not plain Node.

**Not scheduled**, by SR48: no published sentence promises Node, it is no route past a guard, it
blocks no plan, since `eval-rules` 0.1.0 requires an Angular build (its plan's § 8 q23), and no
consumer has reported it. **What reopens it**: a consumer's report; a host of `eval-rules` or
`eval-template` that renders or evaluates on a server; or a phase that promises Node. **The fix**
is a decision, not costed: document the import, or give the injector-free functions an entry
point with no injectable. Whether either changes a `.d.ts` is measured then
([SR12](standing-rules.md#sr12)).

*Recorded*: the [Phase 12 plan](eval-rules/plan.md) § 1.2 finding 25, § 3.7 and § 8 q23.

<a id="a64"></a>
## A64 — A write policy is asked only at an expression's own writes and its own calls of the table's built-ins

**Package** core, signals, forms, rules · **Kind** fix · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)): the shipped text states where a policy is asked and that a write by any other route is not asked about, so the routes below are outside a documented guard, not past one. Its own track ended 2026-11-25 with the fix's commit (47f4634), which closes the first kind's direct-argument case, released in `eval-core` 0.16.2, published 2026-11-26. What reopens it: a route measured past a sentence the packages ship.

A context's `checkMemberWrite` is asked at two places: before an assignment or update to a
member, and before a call the expression itself makes, directly or through `call`, `apply` or
`bind`, of a built-in in `MUTATING_BUILT_INS`, in `member-write-policy.ts`. That table, which
`eval-core`'s 0.11.0 CHANGELOG lists, holds `Array`'s and the typed arrays' mutators; `set` and
`delete` on a `Map` or a `WeakMap`; `clear` on a `Map` or a `Set`; `add` and `delete` on a `Set` or
a `WeakSet`; a `Date`'s setters; and `Object`'s writers. Every other route is not asked about,
under every policy. Three kinds are known; no sweep of the specification has been made, so no
list below is complete.

- **A built-in of the table that native code calls.** `consultMethodWrite` asks about the function
  the expression's own call node calls. `[1].forEach(t.push, t)` calls `forEach`, which is not in
  the table, and `forEach` then calls `push` with no question asked. Measured under all three
  contexts: `push` handed to `forEach` or `map`, and `Map#set` and a `Date`'s `setUTCFullYear`
  handed to `forEach`. Measured under `eval-rules` and `eval-signals`, from step 4's fifth and
  sixth reviews: `push` handed to `filter`, `some`, `every`, `find`, `findIndex`, `findLast`,
  `flatMap`, a `Map`'s `forEach` or, where the host supplies `Array`, `Array.from`; and, where it
  supplies `Object`, `Object.freeze` handed to `forEach` and `Object.assign` handed to `reduce` or
  to `sort` as its comparator, which `sort`, itself in the table, calls on an array the expression
  created. Other methods that take a callback are not measured. Found by step 4's fourth review
  (C-1). Asked, as a direct argument, since the fix's code commit, below.
- **A built-in outside the table that changes what it is handed.** `getOrInsert` and
  `getOrInsertComputed` on a `Map` or a `WeakMap`, which insert; `test` and `exec`, which move a
  global or sticky regex's `lastIndex`, and `match` and `replace`, which reset it on a global
  regex, sticky or not, and move it on a sticky one that is not global; `RegExp#compile`, which
  rewrites the regex; a `DataView`'s setters, which write its buffer; `ArrayBuffer#transfer` and
  `transferToFixedLength`, which detach the buffer, and `resize`; and an array iterator's `next`,
  which advances it. Found by step 4's second review (I-A).
- **A function the host supplies.** It is the host's code, and no expression reaches one unless the
  host supplies it: among the facts or the context, or under `eval-rules` also as the event or from
  one of its functions (step 4's tenth review, I-2). Measured under `eval-rules` and `eval-signals`, from
  step 4's sixth review: `Reflect.set` and `Reflect.deleteProperty` on a given object;
  `Reflect.apply` with `push` and a given array, since `consultMethodWrite` follows `call`, `apply`
  and `bind` but not `Reflect.apply`; `Atomics.store` on a given typed array; and
  `Error.captureStackTrace`, which adds `stack` to a given object.

The expression is the untrusted input `SECURITY.md` names, so each is a way past three documented
guards: `eval-signals`' write refusal over what an expression was given, open since its 0.4.0,
`eval-forms`' over a control's value, and `eval-rules`' over the facts. `lastIndex` was already
named, in both adapters' READMEs, as not caught. The step that opened this states the contract in
`eval-rules`' own text, its CHANGELOG, `rule-context.ts` and its plan's § 3.5 note: where the
policy is asked ([SR44](standing-rules.md#sr44)), and that other routes write.

**The sentences false now in the published packages are this entry's first commit**
([SR31](standing-rules.md#sr31)), before the fix itself and before the Phase 12 plan's step 5.
Step 4's pins six to nine wrote and reviewed them inside the step, and each review found another
copy or another class. So they move here, to one commit that audits them together. The known set:
- `SECURITY.md`'s two write-policy bullets, which say the policy is asked before a built-in writes
  into what it is handed.
- `eval-signals`' README ("Two things this does not catch") and `eval-forms`' README ("Not
  caught"), which list two routes of the many.
- The JSDoc of `EvalContext.checkMemberWrite`, of `EvalMemberWrite` and its `method`, and of
  `eval-signals`' `SignalContextWriteError`, its `kind` and its `checkMemberWrite`, which ship in
  each package's types.
- From step 4's ninth review: the sentences that promise `SignalContextWriteError` for a write
  that `eval-core`'s blocklist of dangerous names refuses first, with its own `Error`. That covers
  a bare name (`constructor = 1`) and a member key (`o.__proto__ = 1`, `o.prototype = 1`). The
  sentences are in `eval-signals`' README and `eval-signal.ts`, and in `eval-forms`' README, where
  `applyErrorPolicy` rethrows by class, so the default renders a blank.

Step 4's pins six to nine hold measured drafts of each correction (`ng-eval-12.4f` to
`ng-eval-12.4i`). The commit sweeps every shipped README, `SECURITY.md` and `modules/*/src`'s
JSDoc for each error class it names and each "refuses", "throws" and "not caught". It checks
each hit against `refuseDangerousName` and `resolveMemberTarget`, which run first, and
against what they let through to the context: on a string, number or boolean receiver, the six
names a primitive keeps readable, `toString`, `valueOf`, `toLocaleString`, `hasOwnProperty`,
`isPrototypeOf` and `propertyIsEnumerable`, so a write of one fails with the context's own error,
not `eval-core`'s (measured under `eval-rules` by step 4's eleventh pin, `bl3.log`; the adapters'
by the sweep). Up to `eval-core` 0.16.0 a key that was not a string passed too
([A65](backlog-retired.md#a65)); the drafts predate 0.16.1, so the sweep reads them against it. Each
package's `[Unreleased]` section gets a documentation line ([SR11](standing-rules.md#sr11)). The
npm READMEs of `eval-signals` 0.9.0 and `eval-forms` 0.9.0 keep the old sentences until each
package's next release. The
[Phase 17 plan](eval-template/plan.md)'s § 3.5 note "What the render keeps on every path" states
the same contract for a template; its step 1 reads this entry.

**Verified** on step 4's sixth to tenth pins, in the reviewing chat's sandbox on Node 26.4.0, by
one scratch spec per package (`gap-rules.log`, `gap-signals.log` and `gap-forms.log`) and scripts
over the built bundles for the fifth and sixth reviews' routes (`cb2.log`, `cb3.log`, `cb4.log`),
all in step 4's tenth pack: under each context `set` on a given `Map` or `WeakMap` and `push` on a
given array, called directly, were refused, and so, under `eval-rules` and `eval-signals`, were
`push` through `call` and `Object.assign` into a given object; each route above changed the given
value under the contexts it names. `eval-rules`' `evaluate-rule.spec.ts` pins some as rows whose
run completes: ten rows over nine outside built-ins (`test`, `exec`, `replace` and `match` on a regex's
`lastIndex`, `RegExp#compile`, a `DataView`'s setter, `ArrayBuffer#transfer` and `resize`, an
array iterator's `next`), three callers (`push`, `Map#set` and `Object.freeze` handed to
`forEach`), and two host functions (`Reflect.set`, `Atomics.store`); the rest are measured only
in the logs. Probe S45 turns the first group red, S47 the second, and S46 the `Atomics` row; the
`Reflect.set` row is red only under broad probes, S10, S30 and S31, none aimed at it.

Reported by step 4's seventh review and not measured here: `push` handed to `findLastIndex`, a
`Set`'s `forEach` or a typed array's `forEach`; `replaceAll` resetting a global regex's
`lastIndex`; `FinalizationRegistry#register`; `SharedArrayBuffer#grow`; the iterator helpers
(`toArray`, `drop().next()`) advancing a given iterator; and `Atomics.add`.

**The first commit, 2026-11-25**, corrected the published sentences false on 0.16.1, and states
four things only, where it ships: where the policy is asked; that nothing is written where it
refuses; that a write by any other route is not asked about; and that an assignment or update of
a name on the blocklist is refused where it is made, with which error not promised (`eval-core`
may refuse a write itself first). It also corrected "a call's result is never created", false
since `eval-core` 0.10.0 and `eval-signals` 0.3.0: what the expression made itself stays created
when a call hands it back. The detail is here, measured on Node 26.4.0 and `eval-core` 0.16.1 by
the scratch specs and logs in `ng-eval-a64.9.zip`:
- **Which class answers a blocklisted write** (`a64-signals.log`; eight write forms of the 13
  names, bare and as a member key on ten receivers, 4,264 runs a context). Under the plain context
  every write that is made throws `eval-core`'s `Error`; `||=` and `??=` complete (288), all on
  the six names a primitive keeps readable, because they short-circuit and write nothing; on an
  object the read is refused first. Under `eval-signals`' context a bare name, and a member key on
  an object or array, throw `eval-core`'s `Error`; on a string, number or boolean receiver the six
  readable names throw `SignalContextWriteError` (864).
- **Where it ends up** (`a64-signals-onerror.log`, `a64-forms-signals.log`,
  `a64-forms-reactive.log`; 2,665 writes each). `createEvalSignal` under `onError: 'undefined'`
  reads a blank for 1,945 and throws `SignalContextWriteError` for 720. Under `eval-forms`'
  default, `guardIdentifiers` refuses 12 of the 13 bare names at registration (60), 1,885 render a
  blank and 720 throw. No run changed the given object's keys or prototype or the array's length.
- **Under `caseInsensitive`** (`a64-ci.log`, `a64-ci2.log`, `a64-ci3.log`): any spelling of `this`
  as a bare name throws `eval-core`'s `Error`; a case variant of a blocklisted member key does too
  where the case-insensitive lookup finds the name among the receiver's own keys or its immediate
  prototype's own names (`{}`, an array's `constructor`, a `Map`), and otherwise reaches the
  context, or, on an arrow or array the expression created, writes an own key in that spelling.
- **Call results** (`a64-m5.log`, `a64-ci2.log`): a literal, a rest value or an arrow that a call
  hands back stays created; a new value native code returns (`slice`, `Object.entries`) counts as
  given.
- **Scopes** (`a64-abort.log`): a bare name a run's scope binds is written there, not refused; a
  run's `abortSignalKey` is such a scope.
That is [A67](#a67). Rows (18): `eval-core`'s `member-write-policy.spec.ts` (1, the call result);
`eval-signals`' `eval-signal.spec.ts` (12: the A67 class rows, the `caseInsensitive` rows and
contrast, the call-result rows, a parameter), `signal-context.spec.ts` (1, the short-circuit) and
`eval-signal-async.spec.ts` (1, the `abortSignalKey`); `eval-forms`' `field-schema.spec.ts` (2)
and `evaluate-rule.spec.ts` (1). Each is red under one of the pack's probes S1 to S15.

It took nine pins: each of the first seven was stopped by its review, nearly always on a sentence
that the pin before had added, claiming more than its witness ran. The eighth cut the shipped text
to the four statements above and moved the detail here; its review, under a stop rule that needs a
measured counterexample, stopped it once, on `createEvalSignal`'s "the context's keys are
read-only", false over a caller-built `EvalContext`, which no policy guards (a probe run on the
gate's bundles). The ninth scoped that sentence, and two README headings with the same cause, to
a signal context. Lesson: correct a false sentence with the least text that is true, and keep the
detail in the register.

**The fix's code commit, 2026-11-25**, closes the first kind's direct-argument case: a table
built-in among a call's arguments, to a function the walk did not create. It does so by argument
rather than by a sweep of the built-ins that call what they are handed: a call
the expression makes to a function the walk did not create is asked about each argument that is a
built-in of the table, after the call's own question, with no target (`eval-core` `[Unreleased]`,
`### Security`). A function the walk made is not asked about for its arguments, since its own
calls are asked. Measured under `eval-signals`' signal context on Node 26.4.0 by
`a64-fix-signals.log` in `ng-eval-a64-fix-1.zip`: 17 routes, `push` on a given array handed to
`forEach`, `map`, `filter`, `some`, `every`, `find`, `findIndex`, `findLast`, `findLastIndex`,
`flatMap`, a `Map`'s, a `Set`'s and a typed array's `forEach` and, where the host supplies
`Array`, `Array.from`; `Object.freeze` handed to `forEach`; and `Object.assign` handed to `reduce`
and to `sort` as its comparator. Each was refused with `SignalContextWriteError`, the given value
unchanged, and each wrote under a plain context. Rows (12): `eval-core`'s
`member-write-policy.methods.spec.ts`; and `eval-rules`' `evaluate-rule.spec.ts`' three callback
rows above now assert the refusal. Turning off the argument check turns 9 of the 12 and the three
`eval-rules` rows red; removing the exemption turns the other two opted-in rows red.
- **Still open**: a `new` expression's arguments are not asked about; and a table built-in that
  reaches native code other than as an argument of the expression's own call. Measured by the
  review on the gate's `eval-core` bundle, Node 26.4.0, with a policy that refuses what the walk
  did not create, over a given `a` of `[3,1,2]` (`review/probe.log` in the same pack):
  `[a.push, a].reduce([].forEach.bind([1]))` gives `a = [3,1,2,1,0,"arr"] | asked = []`, and
  `[[a.push, a]].reduce([].forEach.apply.bind([].forEach), [1])` gives
  `a = [3,1,2,1,0,"arr"] | asked = []`.
  - `sort` with a comparator from `bind`: `[[a.push, a], [1]].sort([].forEach.apply.bind([].forEach))`
    writes `a`. Reported by the fix's delta review (`review/r3.mjs` to `r5.mjs` in
    `ng-eval-a64-fix-1.zip`); no log was pinned, so it is not measured here.
- **Unchanged**: the outside built-ins and the host's functions, the second and third kinds above.
- **The adapters.** Their READMEs, `signal-context.ts` and their `[Unreleased]` lines no longer
  name the native-call route. Their peers still admit `eval-core` 0.16.1, where it writes, so they
  state neither outcome. An adapter release that raises its floor to `>=0.16.2` may state it as
  refused. The npm READMEs of `eval-signals` 0.9.0 and `eval-forms` 0.9.0 still carry the old
  sentence until each package's next release.
- `eval-rules`' `eval-core` peer rose to `>=0.16.2` in `eval-core` 0.16.2's release commit.

**Left from the eighth and ninth pins' reviews, for the next touch** (Minors; none measured
false):
- "asked only at the expression's own writes and calls" (both adapters' READMEs) can be read as
  every own call being asked; the routes listed after it are own calls. Narrower: "its own
  writes, and its own calls of the table's built-ins".
- `eval-forms`' "refused where it is made": `guardIdentifiers` refuses 12 of the 13 bare names
  when the rule is registered (`a64-forms-reactive.log`, `a64-forms-signals.log`).
- `eval-signal.spec.ts`' "…on a primitive reach the context under caseInsensitive" does not
  depend on the option (`a64-ci.log`: the same without it); its title claims more (SR19).
- `eval-signals`' CHANGELOG has no line telling a caller who passes their own `EvalContext` that
  the read-only guarantee never covered them.
- `createEvalSignal`'s JSDoc never says that a record `source` is wrapped in a signal context,
  which a caller-built `EvalContext` is not.
- "both adapters' READMEs", in the first Minor above: its wording is verbatim only in
  `eval-signals`' README.
- The adapters' READMEs name no native-call route after the fix's deletion, though their next
  release still admits `eval-core` 0.16.1, where `[1].forEach(user.tags.push, user.tags)` writes,
  and the routes under "Still open" write on any; "among the known ones" keeps the sentence true,
  but a consumer loses the one warning that applies on every `eval-core` the range admits.
- For a handed built-in (`target: undefined`) the refusal advises "Spread it into an array literal
  and change the copy instead" (`rule-context.ts`, `signal-context.ts`): there is no "it" to
  spread; the remedy is not to pass the built-in.
- Over-asking (`review/probe2.log`): `(f => 0).bind(null)(a.push)` and `[1].includes(a.push)` are
  refused, and complete under a plain context; consistent with "a function the walk did not
  create", a note for whoever widens the exemption.
- `EvalMemberWrite.target`'s JSDoc says it is undefined for a handed built-in, but not that a
  policy deciding by target identity should read `undefined` as unknown, or it allows the call.
- eval-rules' CHANGELOG and `rule-context.ts` give `reduce` as the only example of a table
  built-in reaching native code other than as an argument; the general clause covers `sort`
  too (the fix's delta review).
- eval-core's `[Unreleased]` Security heading "handed as an argument to a function…" can be
  read as covering a `new` expression, whose arguments are not asked about; no counterexample
  (the fix's delta review).
- Row (k) of `member-write-policy.methods.spec.ts` (no policy, the write completes) is a
  contrast row; no mutation of `consultMethodWrite` turns it red (`probe47.log` in
  `ng-eval-v47f4634-probes.zip`).

**The fix**, its own track, measured then. For the outside built-ins: widen the table, or keep a
second one beside it as `REFLECT_WRITERS` is, since the table is what a published policy is asked
about; decide `next`, which reading a given iterator needs, and `lastIndex`, which
`pattern.test(value)` moves; sweep the specification for the rest. For native calls: the
direct-argument case is done, by the code commit above. One option for the rest, not a decision:
refuse a table built-in wherever the walk reads it as a value, other than as a callee or the
receiver of `call`, `apply` or `bind`, as [A35](backlog-retired.md#a35) does for dangerous
functions. It covers both routes measured under "Still open"; it is not yet measured as a whole.
Then patch releases of
`eval-core`, and of `eval-signals` and `eval-forms`, whose READMEs list what is caught.
`eval-rules` takes it before or with its 0.1.0.

*Recorded*: the [Phase 12 plan](eval-rules/plan.md) § 3.5's note and "Step 4, as written".

<a id="a66"></a>
## A66 — `eval-core` 0.16.1's CHANGELOG leaves out two consequences of its key conversion

**Package** core · **Kind** docs · **Status** Open. Opened 2026-11-22 by 0.16.1's post-publish commit, from 188c0d9's code review; for `eval-core`'s next release

[A65](backlog-retired.md#a65)'s fix converts a computed key before every check. Two consequences
hold in 0.16.1 and are not in its `[0.16.1]` CHANGELOG section:

- **An object literal's computed key that is not a string or number creates the property**, as in
  JavaScript: `({ [null]: 1 })` is `{ null: 1 }`, `({ [1n]: 1 })` is `{ "1": 1 }`, `({ [true]: 1 })`
  is `{ true: 1 }`, and `({ [k]: 1 })` with `k` the array `["a"]` is `{ a: 1 }`. 0.16.0 gave `{}` for
  each: the property was dropped. The section's "`{ [["a"]]: 1 }` is `{ a: 1 }`" is true, and does
  not say that this changed. `toPropertyKey`'s JSDoc says a literal key is not passed through it,
  which holds in a member access and not in an object literal, where every computed key is; that
  JSDoc is internal and does not ship.
- **A read hook and a write policy receive the converted key.** For `o[["a"]]` a read hook's
  `EvalReadEvent.key` was the array `["a"]`, outside its declared `string | number | symbol`, and
  is `"a"`; for `o[["a"]] = 1` a write policy's `EvalMemberWrite.key` was `["a"]` and is `"a"`. The
  section names only `SignalContextWriteError.key`.

**Verified** by the reviewing chat on the build of 188c0d9's tree, against 0.16.0's published
bundle: `m1.mjs` and `m2.mjs`, with their logs, in `ng-eval-0.16.1-record.zip`.

**Not corrected in 0.16.1**: neither is false on a path the shipped section names, so they wait
for the next release, as 0.16.0's M1 and M2 did (bf01f87).

**The fix**: a line for each in `eval-core`'s next CHANGELOG section, saying it changed in 0.16.1;
the JSDoc qualified to a member access; and a row for each, an object literal's non-string key and
the key a read hook and a write policy receive.

<a id="a67"></a>
## A67 — A blocklisted name's write is routed through `onError`, so `'undefined'` renders a blank

**Package** core, signals, forms · **Kind** fix · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)): the write is refused and nothing is written, and the READMEs say so. Opened 2026-11-25 by [A64](#a64)'s first commit, from its sweep

`eval-core` refuses an assignment or update of a name on its blocklist of dangerous names
(`prototype` and `Object.prototype`'s twelve own names) with its own `Error`, before a
context is asked: a bare name in `identifier.ts`'s `refuseIdentifierTarget`, and a member key
in `resolveMemberTarget` for an assignment and in `evaluateMember` for a compound, logical
or update target, except on a string, number or boolean receiver, where it refuses
only seven and lets the six a primitive keeps readable reach the context. Under
`caseInsensitive` it also refuses any spelling of `this` as a bare name, `THIS = 1`, with its
own `Error`, and a case variant of a blocklisted name as a member key where its case-insensitive
lookup finds the name among the receiver's own keys or its immediate prototype's own names:
`o.CONSTRUCTOR = 1` on a plain object, an array or a map. On a primitive, a null-prototype
object, a function, an object whose dangerous name is further up the chain, `a.HASOWNPROPERTY`
on an array, or an own key spelled alike, the variant reaches the context and throws
`SignalContextWriteError`; a bare variant, `CONSTRUCTOR = 1`, does too (`a64-ci.log`,
`a64-ci2.log`). A case variant is not always refused: written into an arrow or an array the
expression created, where the lookup finds no dangerous name, `f.CONSTRUCTOR = 1` and
`a.HASOWNPROPERTY = 1` write an own key in that spelling, and nothing reaches
`Object.prototype`; on a created object, an array's `constructor` or a regex the variant is
refused (`a64-ci3.log`). `eval-signals`' `createEvalSignal` and `eval-forms`'
`applyErrorPolicy` take a `SignalContextWriteError` out of `onError` by class, because a
write violation is static and a blank would hide a bug in the expression. `eval-core`'s
`Error` is not that class, so it is routed like a runtime failure: under `'undefined'`, which
is `eval-forms`' default, `o.constructor = 1` renders a blank and `s.toString = 1` throws.
`guardIdentifiers` refuses twelve of the bare names when an `eval-forms` rule is registered,
all but `prototype`.

**Verified** by A64's first commit's measurements (`ng-eval-a64.9.zip`, A64's entry has the
counts), and pinned as today's behaviour by its rows: `eval-signals`' "a write of a blocklisted name
(A67)" and the 0.16.1 row for `o[["__proto__"]] = 1`; `/reactive`'s blank row and its contrast;
`/signals`' "should route a write eval-core's blocklist refuses through the policy (A67)".

**Not scheduled**: nothing is written, so it is not a route past a guard; the sentences that said
otherwise were A64's first commit. A blank for a static error is what the bypass exists to
prevent, so the fix is the bypass's, not the README's.

**The fix**, when scheduled: give the refusal a class the bypass can match, from `eval-core` (a
subclass of `Error` with the same message, which a consumer matching on `Error` still catches), or
check the name in the adapters' contexts first. Either changes what `onError` receives, so it is a
minor for `eval-signals` and `eval-forms`, and their rows above flip.

<a id="a68"></a>
## A68 — With a read hook installed, a fact's getter read by bare name runs twice per read

**Package** core · **Kind** fix · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-26 by the [Phase 12 plan](eval-rules/plan.md)'s step 5, from its second commit's review (M-2)

Measured at `a6f0b27` (`ng-eval-12.5c.zip`'s `getter.log`): a counting getter on a plain object,
read through bare `call` on an `EvalState` built from it with `maxTraceItems` 0, once without a
read hook and once with `createDependencyTracker().install(state.hooks)`; and the same field
through `eval-rules`' `evaluateRule`, which at `a6f0b27` installed a tracker on every field's
state; from step 5's fifth commit it installs one only under the rule's `debug`, so a rule without
it calls the getter once.

| Field | Getter calls, hook off | Hook on | `evaluateRule` |
| :--- | ---: | ---: | ---: |
| `fact + 1` | 1 | 2 | 2 |
| `fact + fact` | 2 | 4 | 4 |
| `obj.fact + 1`, the getter on `obj` | 1 | 1 | 1 |

A fix leaves `eval-rules`' row on a field's read hook removed after the run
(`rule-trace.spec.ts`, step 5's second commit's review, I-2) without its witness, since
that row counts the second call: the fix gives it another.

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

<a id="e7"></a>
## E7 — The parts of the rule design that no phase has

**Package** rules · **Kind** phase · **Status** Open — **no phase reserved**; not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its § 3.3

The rule design ([`eval-rules/design-session.md`](eval-rules/design-session.md)) names four things
that none of Phases 12 to 16 builds, and `ROADMAP.md` sends them here:

- **A converter from an earlier rule format.** The maintainer's earlier engine is the first host.
  Its expressions compile as written under `colonIdentifiers` (the plan's finding 28), but a
  colon-joined name bare in a conditional's consequent, `flag ? Q1:1 : 0`, is `eval-core`'s parse
  error and needs `(Q1:1)`, and nothing rewrites a rule.
- **`parallel` and `fanOut`**, two workflow nodes beside Phase 14's `sequence` and `branch`.
- **A rule as a `computed`**: a rule's result as an Angular signal that re-evaluates when a fact
  it read changes, beside Phase 15's event source.
- **Timer and route event sources**, beside Phase 15's value-change source.

Each needs a design decision before a plan. None is a defect.

*Recorded*: the [Phase 12 plan](eval-rules/plan.md) § 3.3; `ROADMAP.md`, "Phases 12 to 16".

<a id="e8"></a>
## E8 — What `eval-rules` 0.1.0 refuses and a later minor can admit

**Package** rules · **Kind** decision · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-18 by the [Phase 12 plan](eval-rules/plan.md)'s step 1, from its § 8 q3, q7, q15 and q21

Three refusals that the plan's P-1 made ("where the design leaves a reading open, 0.1.0 ships the
stricter one"), each of which a later minor can lift without a breaking release (the plan's § 3.8):

- **`caseInsensitive`.** `compileRule` throws for the option, and every name is compared as
  written (q3, q21). The maintainer wants it in a later minor. What it costs is the plan's
  finding 21: the facts copied into a `Registry` on every run.
- **Facts that are a class instance, a `Registry`, or an object whose prototype is another
  object.** `evaluateRule` refuses any facts object whose prototype is not `Object.prototype` (q7).
  `eval-core` reads all three, so the refusal is what they cost today (finding 26).
- **`maxIterations` as an option.** A field runs under `eval-core`'s default budget, and
  `compileRule` throws for the option (q15, q21).

**Not scheduled**, by SR48: none is a defect, and the maintainer schedules a minor. **What reopens
each**: a host that needs it, or the maintainer scheduling it; `caseInsensitive` is already wanted.

*Recorded*: the [Phase 12 plan](eval-rules/plan.md) § 3.3, § 3.8 and § 8.

<a id="e9"></a>
## E9 — `compileRule` is superlinear in long names and keys

**Package** rules · **Kind** decision · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 3 third follow-up, from 6997575's code review (N-a)

A rule's names, a calculation's or a decision's, have no bound on their length, and `compileRule`
keys its sets on them: the names assigned, the names probed, and its duplicate check, whose key
holds each problem's message, which quotes a name. V8 hashes a string longer than 16,383
characters by its length alone, so a set of such strings of one length compares them one by one.
Calculations named 17,000 characters, each reading the next before it is assigned, took 198, 502
and 1,755 ms for 250, 500 and 1,000 of them on 6997575 in the reviewing sandbox. Hashing the
duplicate check's keys in the library (FNV-1a into a map by number) left them superlinear, 514,
1,042 and 2,878 ms, so the check is not the whole cost, and that change was not kept. The rules
measured are 8.5 to 34 MB of JSON. Unknown fields too, by the second review of the third
follow-up: `unknown-field` quotes a field's key as it is, in its path and its message, so 250, 500,
1,000 and 2,000 unknown keys 17,000 characters long took 70, 251, 1,064 and 4,145 ms on that
follow-up's second pin. A bound on names would not reach them; showing a key as a `match`'s path
does, cut to 64 code units, would.

**Verified** by `names-6997575.log`, `names-fnv.log` and `unknown-12.3g.log` in the third
follow-up's pack (`m-names.spec.ts`, `m-unknown.spec.ts`), the sandbox's times, one run each and not by
[SR28](standing-rules.md#sr28)'s paired method. No row pins it: only time shows it.

**Not scheduled**, by SR48: no published sentence promises a cost, it is no route past a guard,
it blocks no plan, and it needs names or keys thousands of characters long. **What reopens it**: a host
that compiles rules it does not write, or a report. **The fix** is a decision: a bound on a name's
length, refused as a problem (P-1), with an unknown key shown cut, which keeps every key short; or
keys the library hashes in every set. Either is measured then.

*Recorded*: the [Phase 12 plan](eval-rules/plan.md) Revision 7, "The fourth review".

<a id="e10"></a>
## E10 — A function a rule's field gives runs, after the run, against the facts alone

**Package** rules · **Kind** decision · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 4, from its second code review (M-1)

A calculation's value may be a function, such as `() => calc.k`, and `evaluateRule` returns it in
`calc` as it returns any value; so may a nested value, or an effect's argument. Called after the
run, it resolves its names in the context as it is then: the run's last unwind has popped the
run's scope, so `calc`, `event` and a declared function name the facts' own, or nothing. Its
member writes are still refused. With facts holding `calc: { k: 'facts' }` and a calculation `k`
of `"run"`, the arrow gives `'facts'`; with the last unwind removed it gives `'run'`.

**Verified** by `evaluate-rule.spec.ts`' row "pops its scope when the run ends", which probe S43
(no `close()`) turns red, in step 4's fifth pack.

**Not scheduled**, by SR48: the README states it, it reads only what the host gave and writes
nothing it was given, so it is no route past a guard, it blocks no plan, and no consumer has
reported it. **What reopens it**: a host that keeps a result's function, or a report. **The fix**
is a decision: a field whose value is a function fails the run, as a `Promise` does, which leaves a
nested function and an argument; or the run's scope kept for the function, which outlives the run.

*Recorded*: the [Phase 12 plan](eval-rules/plan.md), "Step 4, as written".

---

# F. Tooling and docs

<a id="f16"></a>
## F16 — Workspace dependency advisories

**Package** repo · **Kind** fix · **Status** Open — **part 1 retired 2026-09-27**, part 2 open,
narrowed 2026-10-23 to the `undici` override. A re-audit 2026-09-30 found 22 new findings, and they
were fixed the same day (below). A re-audit 2026-10-26 found 2, from seven `undici` and `fast-uri`
advisories, fixed in range the same day (below). On 2026-10-29 the `qs` override's floor was raised,
and `deepmerge`, which has no patched release, was recorded; it held the entry open with `undici`.
A re-audit 2026-10-31 found 50, from four advisories: `follow-redirects` was lifted in range the same
day (below), and `minimatch` and `glob`, which have no patched release in range, were recorded; they
held the entry open with `deepmerge` and `undici`. A re-audit 2026-11-22 found 33, from `glob` and
`minimatch` (below): the entry is held open by `glob` and `minimatch` and by part 2's `undici`
override, and `deepmerge`, which that re-audit no longer reports, no longer holds it. Recorded
2026-09-26, by the commit that cleared the
Dependabot high alert

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
major. Its floor rose to `^7.30.1` on 2026-10-26 (the re-audit below), since three later advisories
cover 7.x below 7.30.1. **Remove it** once a stable `nx` no longer pins `undici` below 7.30.1. As with `smol-toml`, the
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

**Re-audited 2026-10-26 at f78fca2: 2 findings, 1 high and 1 moderate, from seven advisories.** The
lockfile had not changed since F21's 0 on 2026-10-23, so these are advisories published since, all
seven on 2026-10-23. Neither package has a dependent audit flags:

| Package (resolved) | Advisories | Patched in | Root dependency | Flagged as dependents |
| ------------------ | ---------- | ---------- | --------------- | --------------------- |
| `undici` 8.11.2 | Three: GHSA-xjj6-f33q-929c (high; DoS by an unhandled error on excessive content-encodings); GHSA-4qv8-2p9j-2685 (moderate; DoS by unbounded memory in the EventSource parser), GHSA-f72v-6w45-q472 (moderate; Subresource Integrity bypass via non-lowercase algorithm tokens) | 8.12.2 | `jest-preset-angular` 17.0.1 (dev), through `jsdom` 30.0.1, which declares `^8.9.0` | — |
| `fast-uri` 3.1.8 | Four: GHSA-w74x-v6f9-j3xg (moderate; scheme spoofing via percent-encoded scheme decoding), GHSA-wjr9-j795-jxcr (moderate; host confusion via unchecked WHATWG host canonicalization, `>=3.1.3`); GHSA-xhq7-xmqj-769h (low; path equivalence in relative reference normalization), GHSA-333x-w4r6-6crp (low; scheme injection via an unescaped first-segment colon) | 3.1.9 | `@angular-devkit/core` 22.2.4 (dev), through `ajv` 8.20.0, which declares `^3.0.1` | — |

`nx`'s own `undici`, 7.30.1 under part 2's override, is not flagged: all three `undici` advisories
reach the 7.x line too, and each is fixed there in 7.30.1 (GHSA-xjj6 `>=7.18.0 <7.30.1`, GHSA-4qv8
`>=7.0.0 <7.30.1`, GHSA-f72v `>=7.15.0 <7.30.1`). The override's floor, `^7.29.1`, still admitted
7.29.1 to 7.30.0, every one of them covered, though the lockfile's 7.30.1 is past them all, so the
fix below raises it.

**Dependabot showed five open alerts, not seven.** #349 is GHSA-xjj6 and #343–#346 the four
`fast-uri` advisories, all `package-lock.json`, `development` scope: 1 high, 2 moderate and 2 low.
The two `undici` moderates are alerts #348 (GHSA-4qv8) and #347 (GHSA-f72v), created with #349 and
`auto_dismissed`, so the open list omits them. Audit shows every alert; Dependabot shows no advisory
audit does not.

**Fixed 2026-10-26, the same day, with no release.** One commit, toolchain only:

| Change | Clears |
| ------ | ------ |
| `npm update undici fast-uri`, inside each dependent's declared range: `undici` 8.11.2 → 8.12.3 and `fast-uri` 3.1.8 → 3.1.9 | all seven |
| `overrides.nx.undici`'s floor `^7.29.1` → `^7.30.1` | none in the tree; the floor no longer admits an `nx` `undici` the three `undici` advisories cover |

No new override, no `--force`, and nothing else moved. `package.json` changed in that floor alone.
The lockfile changed in two entries only, `node_modules/undici` and `node_modules/fast-uri`, each in
its `version`, `resolved` and `integrity`; the floor left it byte-identical, since `nx`'s nested
`undici` already resolved 7.30.1 and stays there. Part 2's removal condition moves with the floor, to
a stable `nx` that no longer pins `undici` below 7.30.1. `npm audit --package-lock-only` then reported
**0 at every severity**.

**The `qs` override is not changed here.** Its floor, `^6.14.1`, still admits 6.14.1, which
GHSA-w7fw-mjwx-w883 covers (fixed in 6.14.2); the lockfile resolves 6.16.0, and audit reports nothing
for `qs`. Raising that floor stays held, as recorded under 2026-10-14 and 2026-10-20 above.

**The `qs` floor raised 2026-10-29, with no release.** `overrides.qs` is now `^6.14.2`, which excludes
GHSA-w7fw-mjwx-w883 / CVE-2026-2391 (`>=6.7.0 <=6.14.1`, fixed 6.14.2) as well as
GHSA-6rw7-vpxm-498p, the advisory it was added for. `package.json` changed in that floor alone.
Proved on npm 12.0.1 and Node 26.4.0, with no `--force`:

| Check | Result |
| :--- | :--- |
| `npm install --package-lock-only --ignore-scripts`, then `git diff --exit-code package-lock.json` | exit 0, the lockfile byte-identical |
| a clean `npm ci`, then the same diff | exit 0, the lockfile byte-identical |
| `node_modules/qs`'s version, and `npm ls qs` | 6.16.1, one copy, reached through `@nx/angular` → `@nx/web` → `http-server` → `union` |
| `npm audit --package-lock-only` | no `qs` line; 11 low, all `deepmerge`'s (below), as before the change |

The lockfile has resolved 6.16.1, past both advisories, since [F21](backlog-retired.md#f21)'s
toolchain bump (5b5a937, 2026-10-23). The floor now stops it from admitting a covered version too. The first `npm ci` failed `EPERM` on a native
binding that the editor's ESLint server held open, with the lockfile untouched; the clean run that
passed was made with the editor's servers released.

**`deepmerge` recorded 2026-10-29: no patched release.** Dependabot alert #350, opened after the
2026-10-26 fix, is GHSA-gcqx-w48m-w2h4: `deepmerge` `>= 4.2.0, <= 4.3.1`, prototype poisoning of the
objects `mergeObject()` returns, `development` scope, with no first patched version. `npm audit`
reports it as 11 low: `deepmerge` and ten packages flagged as its dependents. Its chain, by `npm ls
deepmerge`, is one deduped copy of 4.3.1:

- `@nx/jest` 23.3.0 → `jest-config` 30.5.2 → `deepmerge`;
- `jest` 30.3.0 → `@jest/core` 30.3.0 and `jest-cli` 30.3.0 → `jest-config` 30.3.0 → `deepmerge`.

**There is no fix to take.** 4.3.1 is the latest release (`npm view deepmerge version`, and its only
dist-tag). Audit flags `jest-config`, `@jest/core`, `jest-cli` and `jest` from 25.2.0-alpha.86, so
the only jest that avoids it predates 25.2. The remedy `npm audit fix --force` offers is
`@nx/eslint` 22.6.5, a major downgrade it calls a breaking change. It was not run.

**Nothing published depends on it.** `eval-core`'s `package.json` declares no `dependencies`, and
`eval-signals`' and `eval-forms`' declare peers only: Angular, `rxjs`, `acorn`, `acorn-walk`,
`js-sha256` and the two `@zvenigora` packages, none of them flagged. `deepmerge` is reached only by
the test runner's config loader.

**What reopens it**: a `deepmerge` release past 4.3.1, or a `jest-config` that no longer depends on
it. Either clears the 11 findings by an update in range. Until then it holds this entry open beside
part 2's `undici` override.

**2026-11-22**: `deepmerge` no longer holds this entry open; the re-audit of that date, below, no
longer reports it.

**Re-audit 2026-10-31.** Dependabot reported 3 alerts on the push of cc40f9e: 1 high, 1 moderate and
1 low. `npm audit --package-lock-only` at cc40f9e reported 50 findings, 1 high, 48 moderate and
1 low, from four root advisories, all `development` scope:

| Package (installed) | Advisory | Dependabot | Under |
| :--- | :--- | :--- | :--- |
| `follow-redirects` 1.16.1 | GHSA-mrwp-f3q8-3g9p (high; cross-realm `sensitiveHeaders` arrays are discarded, and custom credentials can follow redirects), `>=1.16.0 <=1.16.1` | #351 | `@nx/angular` → `@nx/web` → `http-server` → `http-proxy`, which declares `^1.0.0` |
| `minimatch` 3.1.5, 9.0.9, 10.2.5 | GHSA-g3hv-75wg-m249 (moderate; denial of service via globparts amplification), `<11.0.1` | #353 | 3.1.5: `eslint` and its `@eslint/config-array` and `@eslint/eslintrc`, `postcss-url`, and `jest` 30.3.0's `test-exclude` 6.0.0. 9.0.9: `glob` 10.5.0. 10.2.5: `nx`, `@nx/devkit`, `@nx/jest`, `typescript-eslint`'s `typescript-estree`, `glob` 13.0.6 and `test-exclude` 7.0.2 |
| `glob` 10.5.0, 13.0.6 | GHSA-3g3m-2fjr-6pw4 (moderate; `AbortSignal` cancellation bypass allows filesystem traversal after the timeout), `>=9.0.0 <=14.0.1` | #352, `auto_dismissed` | 10.5.0: `jest` 30.3.0's `@jest/reporters`, `jest-config` and `jest-runtime`, and `ts-jest`'s `test-exclude` 7.0.2. 13.0.6: `@nx/jest`'s `jest-config`, `@jest/reporters` and `jest-runtime`. `glob` 7.2.3, under `test-exclude` 6.0.0, is outside the range and flagged through `minimatch` only |
| `deepmerge` 4.3.1 | GHSA-gcqx-w48m-w2h4 (low), recorded above | #350 | as above |

So Dependabot's one moderate is `minimatch`'s: `glob`'s alert was created with it and
`auto_dismissed`, as two `undici` alerts were on 2026-10-26. `deepmerge` now counts 1 low, not 11:
its ten dependents are flagged moderate through `minimatch` or `glob` as well, and audit counts each
package once, at its highest severity.

**`follow-redirects` lifted in range to 1.16.2 by the lockfile alone.** `npm update
follow-redirects` changed `node_modules/follow-redirects`' `version`, `resolved` and `integrity` and
nothing else; `package.json` is unchanged, and there is no override. A clean `npm ci` left the
lockfile as the update wrote it. Audit then reported 49, 48 moderate and 1 low, 0 high, from the other
three roots.

**`minimatch` and `glob` recorded: no patched release in the ranges the tree's dependents accept; npm
proposes only semver-major changes.** `minimatch` is patched only in 11.0.1 and later (11.0.3 is the
latest), while its dependents declare `^3.0.4`, `^3.1.1`, `^3.1.5`, `^9.0.4`, `^10.2.2` and `nx`'s
exact `10.2.5`. `glob` is patched past 14.0.1 (14.0.3 is the latest), while its dependents declare
`^7.1.4`, `^10.4.1`, `^10.5.0` and `^13.0.6`. Every fix `npm audit` offers is one it marks
`isSemVerMajor`: `typescript-eslint` 8.14.0, `@nx/angular`, `@nx/workspace` and `@nx/eslint-plugin`
18.3.5, `jest` 29.7.0, `jest-preset-angular` 14.6.2, `postcss-url` 5.0.2 and `eslint-config-prettier`
6.15.0, and none for the `angular-eslint` packages. None was taken.

**None of the four reaches a consumer**, as this entry's opening argues: each is reached only through
root workspace dev dependencies, the lint, test and build toolchain, and no
`modules/*/package.json` depends on any package in their chains. **What reopens them**: a release
of the dependents above whose range admits a patched `minimatch` or `glob`. Until then they hold this
entry open with `deepmerge` and part 2's `undici` override.

**Re-audit 2026-11-22.** `npm audit --package-lock-only` at 252f618, npm 12.0.1 on Node 26.4.0,
reported 33 findings, all moderate, from two root advisories: `glob` 9.0.0–14.0.1
(GHSA-3g3m-2fjr-6pw4) and `minimatch` 7.0.0–11.0.0 (GHSA-g3hv-75wg-m249); the rest are their
dependents. It reported no low, and `deepmerge` is no longer reported. `npm ls deepmerge
--package-lock-only` still gives one deduped `deepmerge` 4.3.1, under `jest-config` 30.5.2
(`@nx/jest`) and 30.3.0 (`jest`'s `@jest/core` and `jest-cli`), each of which declares `^4.3.1` in
the lockfile; the audit no longer reports it.

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
left the lockfile unchanged, and the gate green at 2880 / 443 / 380. `qs` is unchanged. Again
2026-10-26 at f78fca2, npm 12.0.1 on Node 26.4.0: `npx -y npm@12 audit --package-lock-only --json`
before, 1 high and 1 moderate, the seven advisories tabled above; `npm ls undici fast-uri
--package-lock-only --all` for the chains, and the lockfile's `jsdom`, `ajv` and `nx` entries read for
`^8.9.0`, `^3.0.1` and `"undici": "7.29.0"`; Dependabot's alerts read with `gh api`, open and in every
state, and all seven advisories with `gh api advisories/<id>` for their ranges and dates. After the
update: audit 0 at every severity; `npm ls` gives `undici` 8.12.3 under `jsdom`, `fast-uri` 3.1.9
under `ajv`, and `undici` 7.30.1 under `nx`; `git diff package.json` empty; `node_modules` deleted and
a clean `npm ci`, after which the lockfile's diff was the update's six lines changed, unchanged. After
the floor, on top of that lockfile (452707e): `npm install`, then `node_modules` deleted and a clean
`npm ci`, with `git diff 452707e -- package-lock.json` empty after each; `npm ls undici
--package-lock-only --all` gives 7.30.1 under `nx` and 8.12.3 under `jsdom`; audit 0 at every
severity; the gate green at 3134 / 444 / 380, with doc-links and release-tags green. Again
2026-10-31 at cc40f9e, npm 12.0.1 on Node 26.4.0: `npm audit --package-lock-only --json` before,
50 (1 high, 48 moderate, 1 low), its four root advisories read from the `via` objects; `npm ls
<package> --all` for each root's installed versions and chain; the lockfile's dependency entries
read for the ranges declared on `minimatch`, `glob` and `follow-redirects`, and `npm view` for each
one's latest; Dependabot's alerts #350–#353 read with `gh api`. After `npm update follow-redirects`:
`git diff package.json` empty, the lockfile's diff that one entry's three lines, unchanged by a clean
`npm ci`; `npm ls follow-redirects --all` gives 1.16.2; audit 49 (48 moderate, 1 low), with no
`follow-redirects` finding.

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

<a id="f31"></a>
## F31 — A55 at `eval-forms`' `/signals` is witnessed by no row

**Package** forms · **Kind** test gap · **Status** Open. Opened 2026-11-08 by the [A48 plan](a48/plan.md)'s step 9, from step 8's code review (its M3)

`eval-core` 0.16.0's [A55](backlog-retired.md#a55) fix lets a member read's getter throw reach the
caller. At `/reactive` three rows in `field-schema.spec.ts` witness it through a rule: over a
control whose value has an inherited getter `t` that throws, a `text` rule `user.t` renders `''`
under the default policy, throws under `'throw'` and hands a function policy its error. At
`/signals` no row runs a rule over a getter that throws. `/signals` evaluates a rule with
`eval-core` over a context from `createSignalContext`, and `applyErrorPolicy` is its only `catch`,
so the behaviour should be the same, but that is read from the code, not measured. `eval-forms`
0.9.0's CHANGELOG states the change at `/reactive` only.

**The fix**: a row at `/signals`, a rule over a getter that throws under each policy, red on
0.15.1's `eval-core` code, and a clause in the next `eval-forms` CHANGELOG if it ships with a
release.

<a id="f32"></a>
## F32 — `eval-core`'s barrels do not compile under `isolatedModules`

**Package** core · **Kind** fix · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-15 by the [Phase 19 plan](demo/plan.md)'s step 1, from its M2

`eval-core`'s barrels re-export 26 types with `export { … }`, not `export type { … }`. Under
`isolatedModules: true` TypeScript refuses each of them: `TS1205`, "Re-exporting a type when
'isolatedModules' is enabled requires using 'export type'". `eval-core` does not set the option, so
its own build, lint and tests never meet the error. `eval-signals` and `eval-forms` set it and do
not meet it either, because their builds read `eval-core`'s built declarations, not its source.
What meets it is a project that compiles `eval-core`'s source under the option. The demo
application of Phase 19 is designed to compile the source, as its prototype does, and a new
Angular application sets the option by default.

**Verified** by step 1's M2 run, on Windows and Node 26.4.0, over the prototype the plan's
[§ 1.3](demo/plan.md#13-mechanism-questions-measured) pins by its hash. With `isolatedModules: true`
in its `tsconfig.json` and `.angular` deleted, the application build fails with 26 errors. All 26
are `TS1205`, and all are in four of `eval-core`'s barrels under `src/lib/internal/`:

| Barrel | Errors |
| :--- | ---: |
| `classes/eval/public-api.ts` | 18 |
| `interfaces/public-api.ts` | 4 |
| `classes/common/public-api.ts` | 2 |
| `functions/public-api.ts` | 2 |

None is in `eval-signals` or `eval-forms`. With `isolatedModules: false` the same build is green
and `tsc --noEmit` prints nothing (the plan's M3).

**Not scheduled**, by SR48. It is none of the four things that rule fixes: no security route, no
published sentence that is false, no blocker of the active plan, since the demo sets
`isolatedModules: false` (the plan's [§ 8](demo/plan.md#8-questions) P4), and no consumer's report.
A consumer of the published package never compiles the barrels: the package holds the built
bundle and declarations. For the same reason no README states it. No row pins it, since a row
would need a second compile of the source under the option; the M2 run is its record.

**What reopens it**: a consumer reports it; the demo can no longer set `isolatedModules: false`,
which makes it a blocker of the active plan; or `eval-core`'s own build gains the option, or
`verbatimModuleSyntax`.

**The fix**: `export type` on each of the 26 re-exports. Whether the built `.d.ts` changes is
measured then, not assumed here ([SR12](standing-rules.md#sr12)).

<a id="f33"></a>
## F33 — One collector case has failed once and another twice, and each passed on the next gate

**Package** core · **Kind** test gap · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-18 by the [Phase 19 plan](demo/plan.md)'s step 8, from the reviewing chat's gates

`eval.service.memory-leaks.spec.ts` asks the collector whether a context is still reachable: its
`collect` runs `gc()` in up to five macrotasks and reads a `WeakRef`. One of its cases has failed
once in a full gate ([SR8](standing-rules.md#sr8)) and another twice, and each passed on the next,
with no edit. All three runs were in the reviewing chat's Linux sandbox, on trees that changed no
`eval-core` file:

| Case | When | Next gate |
| :--- | :--- | :--- |
| `should not retain a state whose simpleEvalAsync promise rejected (1.5)` | The measurements for the Phase 19 plan's step 2 | Green |
| `should still see a context whose state the caller holds (2.3)`, the positive control | The first gate of the fix-up 72585db, 2026-11-18 | Green |
| `should still see a context whose state the caller holds (2.3)`, the positive control | The full gate's first run on the Phase 12 plan's step 4 pin 12.4n, 2026-11-22, Node 26.4.0, run alone with nothing else running; the step changed no `eval-core` file | Green, run alone on the same tree |

The failure messages were not kept. `collect`'s own comment records an earlier one: a single round
lost to a short-lived reference once on CI under Node 24, which is why it now runs five.

The 2026-11-22 run's message was kept, in `m4n/gate-first-crlf-timeout.log` in the 12.4n pack,
outside the repository:

```text
● EvalService - Memory Leak Prevention › Context and State Cleanup › contexts passed in are not retained (A20) › should still see a context whose state the caller holds (2.3)
    thrown: "Exceeded timeout of 5000 ms for a test.
```

It is the failure message the fix below asks to record, so that half of the fix is done. What
reopens the entry, red on two gates of one tree or red in CI, is not met: (2.3) is red twice now,
but on two trees, and each red was followed by green on the same tree. On 2026-11-21 an earlier sandbox gate, on pin 12.4f, timed out "an eval-core
memory-retention case" while a probe sweep ran beside it; the case was not recorded by name, so it
is not a row.

**Not scheduled**, by SR48: it is a test's reliability, and no consumer meets it. Meanwhile a prompt
that runs the gate says that one of these cases red once is read by its `●` line and the gate run
again, with no edit, and red twice is a stop.

**What reopens it**: either case red on two gates of one tree, or red in CI.

**The fix** is test-only, and fits with [F31](#f31)'s if both run: record the failure message the
next time, then decide whether `collect` waits differently or the positive control holds its
reference differently. No row's subject changes.

<a id="f34"></a>
## F34 — doc-links exits with `ENOENT` on a tracked file deleted and not staged

**Package** repo · **Kind** fix · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-18 by the [Phase 19 plan](demo/plan.md)'s step 8; noticed at its step 3

`tools/doc-links.mjs` lists the files it reads with git, and reads each with `readFileSync`. A file
git still tracks but that is gone from the working tree, deleted without `git rm`, makes that read
throw, and the script exits 1 with Node's stack trace: `Error: ENOENT: no such file or directory`,
at `tools/doc-links.mjs` line 219. It names the file, and no link. Once the deletion is staged, the
same tree gives the gate's ordinary report: each link to the file dangles, named by file and line.

**Verified** at 72585db by the reviewing chat, on Linux and Node 22.23.5: with
`docs/demo/design-session.md` deleted by `rm`, the script printed the trace and exited 1; after
`git rm` of the same file it reported `docs/demo/plan.md:4` and `:140` among 4 dangling links.

**Not scheduled**, by SR48: the gate still fails, so nothing false passes, and the message names the
file. A step that deletes a file does so with `git rm`, and the prompts say so.

**What reopens it**: a deletion the trace hides, or a change to `tools/doc-links.mjs` for another
reason, which takes this with it ([SR33](standing-rules.md#sr33) runs the reviewer there).

**The fix**: skip a listed file that does not exist, or report it as deleted and not staged, and
then check the links to it as the staged case does.

<a id="f35"></a>
## F35 — Two `test-setup.ts` files do not type-check under their spec configs

**Package** rules, signals · **Kind** fix · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-20 by the [Phase 12 plan](eval-rules/plan.md)'s step 4; noticed at its step 3

`modules/eval-rules/src/test-setup.ts` and `modules/eval-signals/src/test-setup.ts` pass
`errorOnUnknownElements` and `errorOnUnknownProperties` to `jest-preset-angular` 17.0.1's
`setupZoneTestEnv`, and `tsc -p <project>/tsconfig.spec.json --noEmit` reports `TS2353` at line 4
of each: `'errorOnUnknownElements' does not exist in type 'SetupOptions'`. `SetupOptions` extends
`@angular/core/testing`'s `TestEnvironmentOptions`, which declares both, so the type is not
resolved there under those configs. `eval-forms`' identical file reports nothing, under a spec
config whose `moduleResolution` is `bundler`, and neither does the demo's. The gate does not see
it: ts-jest does not type-check, and lint runs no `tsc`. Whether the two options take effect under
Jest is not measured.

**Verified** on step 4's fifth pin by the reviewing chat: `tsc` on the four spec configs (`tsc-spec.log` in
step 4's fifth pack). The runs print other errors too, which this entry does not examine.

**Not scheduled**, by SR48: nothing ships from a test setup, no sentence states it, it is no route
past a guard, and it blocks no plan. **What reopens it**: a step that type-checks the specs, or a
test that relies on the two options. **The fix**: the two spec configs' module resolution, as
`eval-forms`' is, measured then.

<a id="f36"></a>
## F36 — The demo's `dependencies.example.spec.ts` times out under a full gate's load

**Package** demo · **Kind** test gap · **Status** Open, not scheduled ([SR48](standing-rules.md#sr48)). Opened 2026-11-22 by 0.16.1's post-publish commit, from two Phase 12 step 4 reports of 2026-11-21

A case of `apps/demo`'s `dependencies.example.spec.ts` reached Jest's 5 s timeout in a full gate on
the maintainer's machine twice: once while the code-reviewer ran scripts beside the gate, and once
under the gate's own load. Each time it passed on the next run, with no edit. The prompts since
have the gate re-run once when that case alone fails, and the reviewer runs after the gate.

On 2026-11-22 it timed out a third time on the maintainer's machine (Windows, Node 26.4.0, npm
12.0.1), in the full gate's first run for the commit that recorded F33's failure message, run alone:
`● the dependencies page, zoneless › dependencies: shows the value and the keys read, and new ones
after the expression changes`, with `thrown: "Exceeded timeout of 5000 ms for a test.`. The re-run,
alone, on the same tree, was green. It meets what reopens the entry, below, on both counts: a gate
run with nothing else running, and a third timeout.

**Not measured** by the reviewing chat: its gates, run alone, have not timed it out.

**Not scheduled**, by SR48: the timeout fails the gate, so nothing false passes, and the re-run
tells it from a failure.

**What reopens it**: a timeout in a gate run with nothing else running, or a third one.

**The fix**: time the case alone and under the gate's load, then lighten it or raise its timeout,
with the reason beside it.
