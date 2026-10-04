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
  moved entry now dangles, so the gate lists each one to re-point.
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

Nothing is in flight. The last track, "Track 3" ([`docs/gates/plan.md`](gates/plan.md)), is
closed; its retrospect is [`docs/gates/summary.md`](gates/summary.md).

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

**Every published version now carries a tag** — the twenty-four above (one at 3d56994, three at 0c3299e, three at eb403c0, three at c56f987, three at 724d831, two at 587ebf1, three at f26f987,
three at `016a313`, three at `7935a78`) plus seven written retroactively for pre-Phase-2 versions,
all on the remote.

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
| **Since the register opened** | | | **42** | **23** | **53** | **12** |

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
count of live rows in the index at that commit; if it does not, the row is wrong.

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
| [B1](backlog-retired.md#b1) | The `!isPrimitive` carve-out in `member-expression.ts` | core | decision → fix | **Retired — fixed 2026-10-02**; released 2026-10-03 in `eval-core` 0.9.0, tagged eb403c0. A primitive receiver is refused `constructor`, `__proto__`, `prototype` and the four accessor definers; `toString` and its five kin stay readable |
| [B2](backlog-retired.md#b2) | `pattern.ts:83` logs the whole `EvalState` | core | fix | **Retired — fixed**, Phase 2 step 0; released in `eval-core` 0.4.0 |
| [B3](backlog-retired.md#b3) | Two service-layer `console.*` calls reach the published bundle | core | decision | **Retired — fixed 2026-09-29**; released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1. The last one, `parser.service.ts`'s cache-timer `console.debug`, deleted: none in the bundle, eleven in source, all `memory-manager.ts` |
| [B4](backlog-retired.md#b4) | `eval-core.component.ts` is dead generator scaffold | core | fix | **Retired — fixed 2026-09-26**; no published artifact changed — the bundle and `.d.ts` are byte-identical |
| [B5](backlog-retired.md#b5) | `eval-core` exports seventeen symbols nothing uses — two `@deprecated` since Phase 1, their removal deferred in a plan and nowhere else | core | decision, then fix | **Retired — decided and fixed 2026-10-04**, unreleased: all seventeen removed, a breaking minor for `eval-core` 0.11.0; the CHANGELOG names a replacement for the three that have one |
| [C1](backlog-retired.md#c1) | A member-target write escapes the read-only policy | signals | decision | **Retired — decided and fixed 2026-10-03**; released 2026-10-04 in `eval-signals` 0.3.0, with `eval-core` 0.10.0, tagged 0c3299e: a signal expression may write into what it created and not into anything it was given or got back from a call |
| [C2](backlog-retired.md#c2) | Detect a write violation at construction, not first recompute | signals | decision | **Retired — decided 2026-10-03**: no construction-time check; [C1](backlog-retired.md#c1)'s runtime guard is the guarantee and fires on the first read |
| [C3](backlog-retired.md#c3) | Whether `eval-signals` should work around [A4](backlog-retired.md#a4) locally | signals | decision | **Retired — decided and fixed 2026-10-01**; released 2026-10-02 in `eval-signals` 0.2.0, tagged c56f987: under `caseInsensitive` a source key is named as the source spells it, in `getKey`, write errors and the first segment of `dependencies` |
| [C4](#c4) | A mutating method call escapes the member-write policy | signals | accepted | Open, documented |
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
| [F16](#f16) | Workspace dependency advisories — 9 moderate on the workspace's Angular 22.0.8, and a **temporary `smol-toml` override under `nx`** | repo | fix | Open — **part 1 retired 2026-09-27**: `nx` 23.2.1, Angular 22.1.8 / 22.1.9, `npm audit` 0 at every severity. Part 2, the override, is live until a stable `nx` depends on `smol-toml >= 1.7.1`. **Re-audited 2026-09-30: 22 (14 high, 8 moderate)**, none reaching a published package; **fixed the same day**: Angular 22.2.1 / 22.2.0, two more `overrides.nx` entries, `verdaccio` removed, `npm audit` 0 |
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
[C1](backlog-retired.md#c1)'s fix.

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

---

# B. `eval-core` — security and hygiene

[B1](backlog-retired.md#b1)–[B5](backlog-retired.md#b5) are retired.

---

# C. `eval-signals`

[C1](backlog-retired.md#c1)–[C3](backlog-retired.md#c3) are retired. None of the four entries was
ever recorded in `ROADMAP.md`.

<a id="c4"></a>
## C4 — A mutating method call escapes the member-write policy

**Package** signals · **Kind** accepted · **Status** Open, documented

[C1](backlog-retired.md#c1)'s fix refuses a member write whose target the expression did not
create, and it is asked about every write the two write visitors make. A method that mutates its
receiver writes from native code instead: the call visitor calls it, and no write visitor runs. So
`user.tags.push("x")` over `{ user: signal({ tags: ['a'] }) }` returns `2` and leaves `user().tags`
as `['a', 'x']`, mutated from inside a `computed()` — and so do `splice`, `sort`, `reverse`,
`fill`, `Map#set`, `Set#add` and their kin. Pinned as current behaviour in `signal-context.spec.ts`
and `eval-signal.spec.ts`, and a paragraph in the package README's "Writes are not supported".

Closing it would need the call visitor to know which methods mutate their receiver — a list per
built-in type, which the call sandbox does not keep — or the value frozen or wrapped before the
call, which is C1's rejected second mechanism. Kept here because "accepted and documented" is a
state a later phase may want to revisit, not a closed question.

*Recorded*: C1's decision, 2026-10-03.

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

**Recorded three times, reserved nowhere.** Phase 4 § 3.5.6 and § 8 q2, Phase 6 § 8.2 and its § 2
out-of-scope list all defer it and Phase 6 names it "a Phase 7 candidate covering both adapters
together" — while stating that registering Phase 7 in `ROADMAP.md` was "a separate docs change, not
this phase's". Nobody made it. This entry is the reservation until someone does.

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

**Package** repo · **Kind** fix · **Status** Open — **part 1 retired 2026-09-27**, part 2 open. A
re-audit 2026-09-30 found 22 new findings, and they were fixed the same day (below).
Recorded 2026-09-26, by the commit that cleared the Dependabot high alert

**None of this reaches a consumer.** Every package below is a root workspace dependency. No
`modules/*/package.json` depends on `nx` or `smol-toml`. The published peer ranges
(`@angular/core >=19.0.0` in all three, plus `@angular/forms >=19.0.0` in `eval-forms`) admit the
patched Angular versions and do not pin the vulnerable ones. So the work here is on the workspace's
own toolchain, and no release is needed for it.

**Two parts, and they are unrelated.**

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
- **The Angular move still needed `npm install --force`**, for the same `ERESOLVE` as part 1: the
  locked 22.1.8 peer set cannot move one package at a time. A clean `npm ci` from the result,
  without `--force`, is the check that the lockfile installs normally. It did, on Node 24 with
  npm 11.
- **Part 2 is unchanged.** `nx` is still 23.2.1 and still pins `smol-toml` 1.6.1, so its override
  stays, now beside two others with the same removal condition: drop each once a stable `nx` stops
  pinning a vulnerable version.

*Recorded*: this entry; `package.json` `overrides.nx`.
*Verified*: `npm audit --package-lock-only`, 2026-09-26. Before the override: 12 high, 9 moderate.
After: 0 high, 0 critical, 9 moderate, as listed above. Again 2026-09-27, after part 1: 0 at every
severity. Again 2026-09-30, npm 12.0.1: 14 high, 8 moderate, as tabled above; traced with
`npm ls <package> --package-lock-only --all`, and the published manifests read with `npm view`.
Again after the fix, 2026-09-30, npm 11 on Node 24: 0 at every severity; clean `npm ci`, and the gate
green at 1076 / 131 / 266.
