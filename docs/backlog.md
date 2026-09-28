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
drained only at `ngOnDestroy`** ([A8](#a8)). It was found in Phase 1, carried forward in six
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
- **Retiring an entry**: mark it, keep it, give the reason and the evidence. Do not delete. A
  retired entry with its reason tells the next reader the question was asked and answered; a
  gap tells them nothing, and they will re-derive it.
- **A step that fixes an entry** updates that entry in the same commit.

**The convention above is not enough, and there is evidence rather than a worry.** The commit
that created this file added two links from `ROADMAP.md` to a § "Phase 2 preconditions" that it
never wrote — a dangling cross-reference, shipped in the commit whose stated subject was that
dangling cross-references are how [A8](#a8) hid for five phases, and caught within the same
session by reading the links back. That is the fourth time in this project a check has caught
its own author inside a session of being written; the first three became
[`docs/forms/phase-6-plan.md`](forms/phase-6-plan.md) §§ 0.2.1–0.2.3. It argues for a
**mechanical link check** over this file's cross-references rather than a rule telling people
to be careful — see [`docs/gates/plan.md`](gates/plan.md) § 8.4, where the question of whether
step 2's machinery should cover it is open.

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
release, not a free change.

| Package | Version | Notes |
| ------- | ------- | ----- |
| `@zvenigora/ng-eval-core` | 0.6.0 | [A8](#a8)/[A12](#a12)/[A20](#a20)/[A21](#a21)/[B3](#b3) fixes — [A8](#a8) is the headline, and the only one withdrawing published behaviour (`EvalService.ngOnDestroy` no longer drains). Tagged `eval-core@0.6.0` at f26f987, published 2026-09-26 |
| `@zvenigora/ng-eval-signals` | 0.1.3 | Peer range widened to `>=0.3.0 <0.7.0`; also updates the `createEvalSignal` / `EvalSignalService` JSDoc (ships in the `.d.ts`) for `eval-core` 0.6.0. Tagged `eval-signals@0.1.3` at f26f987, published 2026-09-26 |
| `@zvenigora/ng-eval-forms` | 0.2.3 | Peer range widened to `>=0.3.0 <0.7.0`; the range is the whole of the release. Tagged `eval-forms@0.2.3` at f26f987, published 2026-09-26 |
| `@zvenigora/ng-eval-core` | 0.5.0 | A11 fix: object destructuring binding. Tagged `eval-core@0.5.0` 2026-09-17, at `016a313` |
| `@zvenigora/ng-eval-core` | 0.4.0 | Phase 2, statements. Tagged `eval-core@0.4.0` 2026-09-16, at `7935a78` — [F8](#f8) |
| `@zvenigora/ng-eval-signals` | 0.1.2 | The `eval-core` 0.5.0 ([A11](#a11)) release: peer range only. Tagged `eval-signals@0.1.2` 2026-09-17, at `016a313` — [F8](#f8) |
| `@zvenigora/ng-eval-signals` | 0.1.1 | Phase 2 step 7: peer range only. Tagged `eval-signals@0.1.1` 2026-09-16, at `7935a78` — [F8](#f8) |
| `@zvenigora/ng-eval-forms` | 0.2.2 | The `eval-core` 0.5.0 ([A11](#a11)) release: peer range only. Tagged `eval-forms@0.2.2` 2026-09-17, at `016a313` — [F8](#f8) |
| `@zvenigora/ng-eval-forms` | 0.2.1 | Phase 2 step 7: peer range only. Tagged `eval-forms@0.2.1` 2026-09-16, at `7935a78`; `@0.2.0` tagged the same day — [F8](#f8) |

**Every published version now carries a tag** — the nine above (three at f26f987, three at `016a313`,
three at `7935a78`) plus seven written retroactively for pre-Phase-2 versions, all on the remote.

---

## Index

| ID | Entry | Package | Kind | Status |
| -- | ----- | ------- | ---- | ------ |
| [A1](#a1) | `await-expression.ts` downgrades a sync throw to a promise rejection | core | fix | Open |
| [A2](#a2) | `update-expression.ts` desyncs the value stack under `preserveParens` | core | fix | Open — standalone, [not a Phase 2 precondition](#phase-2-preconditions) |
| [A11](#a11) | `evaluateObjectPattern` resolves the *value* name against the argument — renaming **and** nested destructuring bind the wrong key | core | fix | **Retired — fixed, `eval-core` 0.5.0, 2026-09-17** |
| [A13](#a13) | An object rest element binds the whole source, not the remainder | core | fix | **Retired — fixed, `eval-core` 0.5.0, 2026-09-17**; found measuring [A11](#a11) |
| [A14](#a14) | A computed key in an object pattern is not evaluated — the identifier's spelling is used as the key | core | fix | **Retired — fixed, `eval-core` 0.5.0, 2026-09-17**; found by a spec written for [A11](#a11) |
| [A12](#a12) | `EvalResult.trace` grows per loop iteration — the iteration budget bounds time, not memory | core | fix / decision | **Retired — fixed 2026-09-23, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987 |
| [A19](#a19) | A12's fix shipped behind an exit criterion that could not detect its own named wrong implementation | core | decision | Open, **decided 2026-09-24: the Node-against-`dist` gate is not built now**; the entry lists what reverses it |
| [A15](#a15) | The per-walk trace reset, weighed and declined | core | decision | Open, **decided 2026-09-24: declined in general**; the entry lists what reopens it |
| [A16](#a16) | `EvalTraceItem.start` / `end` are declared and never set | core | decision | **Retired — documented as reserved 2026-09-24, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987 |
| [A17](#a17) | `EvalService.ngOnDestroy` drains under one `try`, so one throw skips the rest | core | fix | **Retired — fixed 2026-09-24, never released**; drains reordered, caller-owned last — [`docs/a8/plan.md`](a8/plan.md) step 1. **Subject gone 2026-09-25**: [A8](#a8)'s step 2 removed the drain before it shipped |
| [A20](#a20) | `EvalService._activeContexts` grows with every distinct `Registry` context | core | fix | **Retired — fixed 2026-09-24, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987; the field deleted — [`docs/a20/plan.md`](a20/plan.md). Contexts passed to `createState` released 2026-09-25 by [A8](#a8)'s step 2, which deleted the control case |
| [A21](#a21) | `EvalService.ngOnDestroy` empties the caller's own `Registry` contexts | core | fix | **Retired — fixed 2026-09-23, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987 — [`docs/a21/plan.md`](a21/plan.md). Its decision to keep the hook-registry clear **reversed 2026-09-25** by [A8](#a8)'s step 2 |
| [A22](#a22) | Five memory-leaks cases assert nothing about memory | core | test gap | **Retired — consolidated 2026-09-26**: one "destroy does not throw" guard kept, on the async case; the other four retitled to what they test |
| [A3](#a3) | `import-expression.ts` has a dead `afterVisitor` | core | fix | **Retired — fixed 2026-09-26**; ships with the next `eval-core` release — the FESM bundle loses the one line |
| [A4](#a4) | `EvalContext.getKey` — no namespace correction, and diverges from `get` | core | fix | Open, Covered — **wider than it reads; [A10](#a10) argues it is one defect with A10** |
| [A10](#a10) | `getKey`'s scopes step reports every key present against a plain-object scope | core | fix | Open — **latent, not live**; blocks any fix to [A4](#a4) |
| [A5](#a5) | Service-layer entry points discard the error they caught — **12 sites, 4 services** | core | fix | Open |
| [A6](#a6) | `safeCall` destroys the class of any error thrown through a call | core | fix | Open |
| [A7](#a7) | `EvalContext.getThis` reads `_original` in its `priorScopes` loop | core | fix | Open |
| [A8](#a8) | `EvalService._activeStates` grows unboundedly | core | fix | **Retired — fixed 2026-09-25, released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987, in two steps: `simpleEval`'s states ([`docs/a8/plan.md`](a8/plan.md)), then the set deleted ([`docs/a8/step-2-plan.md`](a8/step-2-plan.md)). Withdraws the published destroy-time registry clear |
| [A9](#a9) | The arrow-scope leak's root cause — no `try`/`finally` at either push site | core | fix | **Retired — fixed**, Phase 2 step 0; released in `eval-core` 0.4.0 |
| [B1](#b1) | The `!isPrimitive` carve-out in `member-expression.ts` | core | decision → fix | Open, Covered |
| [B2](#b2) | `pattern.ts:83` logs the whole `EvalState` | core | fix | **Retired — fixed**, Phase 2 step 0; released in `eval-core` 0.4.0 |
| [B3](#b3) | Two service-layer `console.*` calls reach the published bundle | core | decision | Open — **one left**, `parser.service.ts`. The `ngOnDestroy` warn was decided and deleted by [A8](#a8)'s step 1, and its silent `catch` went with the drain in step 2; the third went with [A21](#a21)'s fix |
| [B4](#b4) | `eval-core.component.ts` is dead generator scaffold | core | fix | **Retired — fixed 2026-09-26**; no published artifact changed — the bundle and `.d.ts` are byte-identical |
| [C1](#c1) | A member-target write escapes the read-only policy | signals | decision | Open, Covered |
| [C2](#c2) | Detect a write violation at construction, not first recompute | signals | decision | Open |
| [C3](#c3) | Whether `eval-signals` should work around [A4](#a4) locally | signals | decision | Open — **decision point passed unrecorded** |
| [D1](#d1) | The throwing-subscriber premise is false in both halves | forms | fix + decision | Open, Premise retired |
| [D2](#d2) | Should `/reactive` reject prototype-shadowed identifiers too? | forms | decision, breaking | Open |
| [D3](#d3) | Per-registration `caseInsensitive` reaches one of three levers | forms | decision | Open, Covered |
| [D4](#d4) | A top-level model key holding a signal is returned un-called | forms | fix or doc | Open, partly documented |
| [D5](#d5) | Two dead lookups run ahead of ours on every resolution | forms | fix (perf) | Open |
| [D6](#d6) | `/signals` diverged from upstream on non-string keys — filed as "the `typeof` guard is unfalsifiable", measured false | forms | fix | **Retired — fixed 2026-09-26**; ships with the next `eval-forms` release |
| [D7](#d7) | `toSignal`'s `assertNotInReactiveContext` throws out of the mirror | forms | accepted | Open, documented |
| [D8](#d8) | `warnOnNestedSignals` runs once, at construction | forms | accepted | Open, documented |
| [D9](#d9) | § 3.4.3's precedence rule is untested end to end | forms | test gap | **Retired — premise false: covered end to end since 7fbef49; the `caseInsensitive` pair added 2026-09-27, test only** |
| [D10](#d10) | `applyErrorPolicy` has no runnable README block | forms | docs | **Retired — fixed**, and it created [F3](#f3)'s third gate's subject |
| [D11](#d11) | `/signals` has no worked example | forms | docs | Open |
| [D12](#d12) | ~20 specs discard the binding and never call `destroy()` | forms | test hygiene | Open |
| [E1](#e1) | Form-state keys across both adapters | forms | phase | Open — **no phase reserved** |
| [E2](#e2) | Arrays — `applyEach` at `/signals`, `FormArray` at `/reactive` | forms | phase | Open |
| [E3](#e3) | `dependencies` introspection at form scale | forms | phase | Open |
| [E4](#e4) | Short-circuiting / value-rewriting hooks | core | phase | Open, by design |
| [E5](#e5) | The options-first style cannot read `hookErrors` | core | decision | Open, Premise retired |
| [E6](#e6) | `exit` has no mark to bound its scan | core | fix | **Retired — fixed, Phase 2 step 1**; released in `eval-core` 0.4.0; its "Phase 2 makes it reachable" premise was wrong |
| [F1](#f1) | No `configurations.ci` on the `test` target — **two projects, not one** | signals, forms | fix + decision | **Retired — fixed, no thresholds** |
| [F2](#f2) | One `CHANGELOG.md` for three independently-versioned packages | repo | decision | Open |
| [F3](#f3) | Documented-symbol drift gate — **three packages, four READMEs** | core, signals, forms | fix | **Retired — built and green** |
| [F4](#f4) | README-execution gate for `eval-core` and `eval-signals` | core, signals | fix / decide-then-drop | **Retired** — both package READMEs gated; root **assessed and dropped** |
| [F5](#f5) | The `js-sha256` peer range is locked to a dead minor | core | decision | Open |
| [F6](#f6) | CONTRIBUTING's "Code style" describes a config that never existed here | repo | decision (editorial) | **Retired — fixed 2026-09-26**; the table replaced by a paragraph pointing at the four flat configs |
| [F7](#f7) | Intermittent Jest worker-teardown warning — **no established locus**, possibly Nx/Jest rather than a library | — | fix? | Open — locus corrected 2026-09-09; **not reproducible per project** |
| [F8](#f8) | The release tag step has no forcing function, and ships with a silencer | repo | fix | **Premise retired 2026-09-16** — all ten missing tags written and pushed, so the arrears are cleared; the mechanism is untouched and the entry is live |
| [F9](#f9) | No gate on document cross-references — the register's own dangling links | repo | fix | Open — deferred by [plan](gates/plan.md) § 8.4; **first concrete instance recorded 2026-09-13** |
| [F10](#f10) | The drift gate covers documented-**and-imported** symbols only | core, signals, forms | fix | Open — the gap [F3](#f3) leaves |
| [F11](#f11) | A gated README can only import from its own specifier | core, signals, forms | fix | Open — bounds [F3](#f3) and [F4](#f4) |
| [F12](#f12) | The downstream peer ranges exclude `eval-core` 0.4.0 — **and fail both downstream `lint` targets** | signals, forms | fix | **Retired — fixed, Phase 2 step 7**; both ranges widened, and `lint`'s cache inputs with them |
| [F13](#f13) | Nothing gates the README block count `readme-examples.spec.ts` claims | core, signals, forms | test gap | **Retired — fixed 2026-09-27**, test only; all four specs gated. The gate's first run found `eval-core`'s count wrong a third time |
| [F14](#f14) | Six sites cite the retired `^0.3.0` range, two of them in published READMEs | signals, forms | fix (comments, docs) | **Retired — fixed, Phase 2 step 8**; filed as four sites, was six |
| [F15](#f15) | The downstream peer ranges exclude `eval-core` 0.6.0 — **latent until the bump, then both downstream `lint` targets fail** | signals, forms | fix (release coordination) | **Retired — fixed and released 2026-09-26**; both ranges widened to `>=0.3.0 <0.7.0`, and both packages released: `eval-signals` 0.1.3 and `eval-forms` 0.2.3, tagged f26f987 |
| [F16](#f16) | Workspace dependency advisories — 9 moderate on the workspace's Angular 22.0.8, and a **temporary `smol-toml` override under `nx`** | repo | fix | Open — **part 1 retired 2026-09-27**: `nx` 23.2.1, Angular 22.1.8 / 22.1.9, `npm audit` 0 at every severity. Part 2, the override, is live until a stable `nx` depends on `smol-toml >= 1.7.1` |
| [R1](#r1) | `ASYNC_HOOK_MESSAGE`'s dangling `{@link}` | core | — | **Retired — fixed** |
| [R2](#r2) | `model-source.spec.ts`'s "registrars are stubs" comment | forms | — | **Retired — fixed** |
| [R3](#r3) | `eval-core` missing its `release.version` blocks | core | — | **Retired — superseded** |
| [R4](#r4) | Two false cross-references asserting [A8](#a8) was tracked | repo | — | **Retired — corrected** |

---

## Phase 2 preconditions

Four entries are named preconditions for Phase 2 (statements). They are **not** equally
binding, and the difference decides where each one goes. The test is: *does Phase 2 make this
worse, or is it merely nearby?*

| Entry | What Phase 2 does to it | Where it goes |
| ----- | ----------------------- | ------------- |
| [A9](#a9) | **Multiplies the construct.** Block scoping means a scope per block per iteration, so a `for` body that throws on iteration 3 leaks three scopes. And five new visitors copy whatever idiom the two existing sites set | **Phase 2 step 0** |
| [B2](#b2) | **Makes it reachable.** Destructuring declarations and assignment destructuring give a `MemberExpression` a legal binding target, and the branch has a whole-`EvalState` `console.log` in it | **Phase 2 step 0** |
| [E6](#e6) | ~~**Makes it reachable, but through the design itself.** Loop completion — "skip the rest of the block" — is exactly the unmatched-`after` shape `exit` cannot bound~~ — **wrong, corrected in step 1**: skipping a subtree never enters it, so nothing is left open; only abrupt completion produces the shape, and that is out of Phase 2's scope | **A design section of Phase 2's plan**, not a step ahead of it — held, and the bound landed in step 1 anyway |
| [A2](#a2) | **Nothing.** None of its three members — `(a)++`, `[a, b] = arr`, `({m} = o)` — is more reachable after Phase 2 than before; Phase 2 adds no path into either write visitor's chain | **Standalone fix, whenever** |

**Step 0 is [A9](#a9) + [B2](#b2), one session.** Both are small, both are strictly-before, and
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

**[E6](#e6) is a constraint on the design, not a queue item.** Bounding `exit`'s scan with a
mark and choosing the completion-value mechanism are one decision seen twice. Discharging it
ahead of the plan would mean designing the mark without knowing what it has to bound.

> **Held, and it paid.** The completion mechanism the plan chose (§ 3.1, a value-stack discipline
> with no abrupt completion) is what established that Phase 2 does **not** make E6 reachable — the
> opposite of what E6's own entry claimed. Designing the mark ahead of that would have bounded it
> against a short-circuit mechanism this phase never built. The bound shipped in step 1 regardless,
> on the "leaving the trap armed under seven new visitors" argument rather than on reachability.

**[A2](#a2) is not a precondition and should not wait.** The argument for pulling it early was
precedent — statement dispatchers are the same `if`/`else if`-over-node-types shape and would
copy the silent fall-through. That is a reason to fix it, not a reason to put it in step 0: its
fix is a `ParenthesizedExpression` visitor, which is a new node type with registration, a
co-located spec and a README row — feature-shaped work in a step whose whole value is being
small and strictly-before. "Correct before imitated" is served by the fix *existing*, not by it
living in step 0. It is a real wrong-value bug with a real route to it, so it should land on its
own schedule regardless of whether Phase 2 ever starts.

---

# A. `eval-core` — visitor, context and service defects

Recorded rather than fixed: each is a **behavioral** change, and the phase that surfaced it was
scoped to be additive.

[A1](#a1)–[A3](#a3) came out of the Phase 1 hook work
([`side-effects/phase-1-plan.md`](side-effects/phase-1-plan.md)) and are in the visitors.
[A4](#a4) is in `EvalContext` and was surfaced by Phase 1 step 4's read hooks. [A5](#a5) and
[A7](#a7) were surfaced by Phase 3 step 2 ([`signals/phase-3-plan.md`](signals/phase-3-plan.md))
— the first consumer to reuse one `EvalContext` across many evaluations, which is what makes
several of these visible at all. [A6](#a6) was surfaced by Phase 6 step 3. [A8](#a8) and
[A9](#a9) were never recorded in the roadmap at all.

**Identity-checked `exit`** (§ 3.8 of the Phase 1 plan) means the hook layer stays balanced in
spite of [A1](#a1) and [A2](#a2), so neither is urgent — but neither is gone either ([A3](#a3)
is, retired 2026-09-26), and the value stack
is a separate stack that is not protected by it. Do not read balanced hook events as evidence
that a visitor is correctly bracketed.

<a id="a1"></a>
## A1 — `await-expression.ts` downgrades a synchronous throw to a promise rejection

**Package** core · **Kind** fix · **Status** Open

`awaitVisitor` wraps `callback(node.argument, st)` in a `try`/`catch` inside a `Promise`
executor ([`await-expression.ts:36-79`](../modules/eval-core/src/lib/internal/visitors/await-expression.ts#L36-L79)),
so a child that throws synchronously — a prototype-pollution guard rejection, for instance —
does not propagate. It becomes a rejected promise that only surfaces when something awaits it,
and the visitor continues to its own `pushVisitorResult`. In the async path a security rejection
therefore arrives as a rejected value rather than a throw, and in the sync path it may never be
observed at all.

This is also the visitor that makes [A9](#a9)'s class of defect quiet: it swallows a child's
throw between its own `beforeVisitor` and `afterVisitor`, so it looks healthy to the hook layer
while the **value** stack is silently one entry out, and every downstream node reads the wrong
operand.

Fixing it means moving the `callback` out of the executor, which changes what `evalAsync` throws
and when — a breaking change for anyone catching the current shape, so it needs its own step and
a version bump.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md).
*Verified*: source read, 2026-09-06.

<a id="a2"></a>
## A2 — Three silent fall-throughs in the two write visitors, one shape

**Package** core · **Kind** fix · **Status** Open

**Widened 2026-09-10 from one member to three**, while planning Phase 2. The entry previously
described `(a)++` alone, which read as a single exotic bug behind a non-default parser option. It is
one instance of a shape that appears **twice in the code and three times in behaviour**, and two of
the three need no option at all.

The shape: an `if`/`else if` chain over the node types a write visitor knows how to handle, with
**no final `else`** — so an unhandled type reaches `afterVisitor` having pushed nothing, and every
node downstream of it pops its neighbour's value.

| # | Expression | Needs an option? | What happens today |
| - | ---------- | ---------------- | ------------------ |
| 1 | `(a)++` | `preserveParens: true` | `argument.type === 'ParenthesizedExpression'`; neither branch of [`update-expression.ts:19-37`](../modules/eval-core/src/lib/internal/visitors/update-expression.ts#L19-L37) matches. Pushes nothing |
| 2 | `[a, b] = arr` | **no** | `left.type === 'ArrayPattern'`; neither branch of [`assignment-expression.ts:46-63`](../modules/eval-core/src/lib/internal/visitors/assignment-expression.ts#L46-L63) matches |
| 3 | `({m} = o)` | **no** | `left.type === 'ObjectPattern'`; same chain, same fall-through |

*Measured 2026-09-10*, against the built package: 2 and 3 both return `undefined`, throw nothing,
and leave the context **unchanged** — destructuring assignment is silently a no-op, which is a wrong
answer on the default path rather than an untidy bracket.

**Why this is one entry and not three.** The fix is one decision — what a write visitor does with a
target it does not handle — applied at two sites. Handling `ParenthesizedExpression` alone leaves
the two default-path members live; adding a `default:` that throws fixes all three and changes what
`[a, b] = arr` does from "nothing" to "a diagnostic", which is the behavioural half that needs a
version bump. Implementing destructuring assignment properly is a third, larger option and is the
only one that makes 2 and 3 *work* rather than *report*.

**Phase 2 deliberately left this alone** ([`statements/phase-2-plan.md`](statements/phase-2-plan.md)
§ 1.7 and § 8.4): that phase reviews the same fall-through shape in five new statement dispatchers
and requires a throwing `default:` in each, so fixing one of these three in passing would be
arbitrary rather than principled. It is unblocked and lands whenever someone picks it up.

**Confirmed at the close of Phase 2, by measurement rather than by reading the diff.** Step 6 ran
all three against the pre-phase tree and against 0.4.0: `[a, b] = arr` and `({m} = o)` both return
`undefined` with the context unchanged and **nothing stranded**, identically before and after; `(a)++`
needs `preserveParens` and its chain in `update-expression.ts` is untouched. The check is worth
naming because step 3 *did* edit both write visitors — the identifier branch of
`assignment-expression.ts` now routes through `assignToBinding`, and `update-expression.ts` with it
— so "the phase did not touch these files" would have been false while "the phase did not change
these three behaviours" is true. The two-statement form `[a, b] = arr; a` now runs through `Program`
and still returns the unchanged `a`, which is the one of the three the statement work could most
plausibly have disturbed.

**"One shape" is a claim about these three, and [A11](#a11) is the reason to say so out loud.**
A11 is a fourth silent wrong answer in the same layer — renaming destructuring binds the wrong key
to the wrong value — and it is *not* this shape: no chain is fallen through, a branch matches and
computes the wrong thing. This entry's title reads like a register of the family and is not one, so
a reader looking for "the silent-wrong-result entry for `pattern.ts` and the write visitors" must
read both. Found Phase 2 step 3, 2026-09-13.

**A11 is fixed as of `eval-core` 0.5.0, and the point above outlived it — twice over.** Repairing
A11 turned up [A13](#a13) and [A14](#a14) in the same function, both of the branch-matches-and-
computes-the-wrong-thing shape and neither reachable from this entry's chain-with-no-`else`. So the
family now has three retired members that this entry never covered, and its warning stands: the
three members *here* are one shape, and "silent wrong answer in the pattern layer" is a larger set
than any one entry registers.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md) (member 1);
[`statements/phase-2-plan.md` § 1.7](statements/phase-2-plan.md) (members 2 and 3).
*Verified*: source read, 2026-09-06; members 2 and 3 measured against `dist/`, 2026-09-10.

<a id="a11"></a>
## A11 — `evaluateObjectPattern` binds the key from the pattern and the value from the *wrong name*

**Package** core · **Kind** fix · **Status** **Retired — fixed, `eval-core` 0.5.0, 2026-09-17.**
`Property.value` is bound as a pattern against the source property instead of being walked as an
expression against the source object. Covered by
[`pattern.destructuring.spec.ts`](../modules/eval-core/src/lib/internal/visitors/pattern.destructuring.spec.ts),
every shape below through both routes. See [A13](#a13) and [A14](#a14), which the repair's own
specs found in the same function

**The entry's own fixture was the unlucky case, and that is worth carrying forward.** The table
below measures `{ a: b }` over a source holding **both** `a` and `b`, which makes the defect read as
"binds `a` to `src.b`" — a wrong *value*. That is the special case. The general rule is that the
value name resolves to **nothing**, so the ordinary symptom was `undefined` on both sides:
`({a: x, b: y}) => x` bound neither `x` nor `y` and left `a` and `b` holding `undefined`, because
neither `x` nor `y` was a source key. A wrong value needs the renamed-*to* name to exist on the
source as well. This matters twice over — it is why most consumers saw nothing rather than something
wrong, and it is why a fixture carrying the renamed-to name cannot discriminate the fix: the old code
would find that name and return a plausible value either way.

**Found Phase 2 step 3**, while routing binding writes through the pollution guard. Renaming
destructuring — `{ a: b }` — is wrong in **both** halves, and has been for as long as the binder has
existed.

[`evaluateObjectPattern`](../modules/eval-core/src/lib/internal/visitors/pattern.ts) takes the
binding name from `Property.key`, then pushes the argument as a scope and evaluates `Property.value`
through `callback` **as an expression**. For `{ a: b }` that resolves the identifier `b` against the
argument. So it binds `a` to `arg.b`, where JavaScript binds `b` to `arg.a`. Both names are wrong at
once, which is why the shorthand form works and hides it: `{ a }` has `key` and `value` both naming
`a`, so resolving the wrong one lands on the right answer.

*Measured 2026-09-13*, against `src` = `{ a: 'VALUE_OF_A', b: 'VALUE_OF_B' }`:

| Expression | JavaScript | This library |
| ---------- | ---------- | ------------ |
| `(({a: b}) => b)(src)` | `'VALUE_OF_A'` | **`undefined`** — `b` is not bound at all |
| `(({a: b}) => a)(src)` | `ReferenceError` | **`'VALUE_OF_B'`** — `a` is bound, to the wrong value |
| `let { a: b } = src; b` | `'VALUE_OF_A'` | **`undefined`** |
| `let { a: b } = src; a` | `ReferenceError` | **`'VALUE_OF_B'`** |

**Nested destructuring is the same branch and a second symptom.** `Property.value` of type
`ObjectPattern` is handed to `callback` just as an `Identifier` is, so acorn-walk's base walker
descends it as a pattern, pushes nothing, and `popVisitorResult` binds the *outer* key to
`undefined`. *Measured 2026-09-13* against `src` = `{ a: { b: 'B', c: 'C' } }`:

| Expression | JavaScript | This library |
| ---------- | ---------- | ------------ |
| `let { a: { b } } = src; b` | `'B'` | **`undefined`** — nothing named `b` is bound |
| `let { a: { b } } = src; a` | `ReferenceError` | **`undefined`** — `a` is bound, to nothing |

**The value stack does not desync**, checked specifically because it is the failure that would make
this urgent: `let { a: { b } } = src; 1` returns `1` with 0 stranded and `scopes.length` 0, and the
same pattern under a pending operand stays balanced. So this is a wrong *answer*, not corruption,
which is why it is filed rather than fixed in flight.

**Reachable from arrow parameters, i.e. shipped since before Phase 1**, with no option required.
Phase 2 step 3 widens *what* reaches it — declarations are a second route to the same code — without
changing the defect.

**Read this beside [A2](#a2), and re-read A2's framing when you do.** A2 is titled "one shape"
and its claim is that three instances share a single fix: an `if`/`else if` chain over node types
with no final `else`. This is a fourth silent wrong answer in the same *layer* and it is **not** that
shape — nothing falls through a chain here; a branch matches and computes the wrong thing. Two
consequences:

- A2's "one shape, one decision, two sites" reasoning is about A2's three members and does not
  extend to cover this. A reader who takes A2 as the register of silent-wrong-results in the pattern
  and write layer will not find this one in it.
- Step 3 did add a throwing `default:` to both of `pattern.ts`'s `switch` statements, and it does
  **not** reach this: the wrong binding is produced by a case that matched.

**The near miss worth recording.** Step 3's own divergence note (plan § 3.6.6) named
`let { a = 1 } = o` as reaching `evaluatePattern`'s fall-through. It does not — a default in an
object pattern is `Property.value` of type `AssignmentPattern`, handed to `callback` by the same
branch described above. The guard placed where node types are *enumerated* missed the path that
reaches the node through a `callback`, and the example the plan used to justify the guard was on
that path. Caught because the spec written for it failed; it would otherwise have shipped a
`default:` that covered two of the three forms it was written for.

**The repair, and the two entries it produced.** `Property.value` is now handed to
`evaluatePattern` with the *source property* as its argument, so an `Identifier` binds that name,
and a nested `ObjectPattern` or `ArrayPattern` recurses — one change covering renaming, nesting,
deep renaming and both key spellings at once. Two consequences worth reading before touching the
function again:

- **The scope push is gone.** `evaluateObjectPattern` pushed the source so the value could resolve
  against it; that push *was* the defect's mechanism, not a safety measure, and nothing reads a
  scope once the value is a binding target. `pattern.ts` is therefore no longer one of the visitors
  [A9](#a9)'s `finally` idiom applies to. Checking that also found `CLAUDE.md`'s "only two visitors
  push scopes" had been wrong since Phase 2 — which added three — and it is now corrected there
  with the reason rather than a new number.
- **The blocklist moved to the source key**, checked before the read. `safeGetProperty` returns
  early for a non-object target *before* it tests the key, so relying on it would have quietly
  dropped the existing `(({ valueOf: v }) => v)(o)` rejection when `o` is unbound. Caught by that
  spec failing.

*Recorded*: this entry, 2026-09-13.
*Verified*: measured against the working tree at Phase 2 step 3, 2026-09-13; re-measured against the
built **0.4.0** bundle 2026-09-16, all six rows reproducing, and fixed 2026-09-17.

<a id="a13"></a>
## A13 — An object rest element binds the whole source, not the remainder

**Package** core · **Kind** fix · **Status** **Retired — fixed, `eval-core` 0.5.0, 2026-09-17.**
Opened and closed in the same change

`evaluateRestElement` was handed `arg` itself from `evaluateObjectPattern`'s `RestElement` branch,
so a key a sibling property had already taken stayed on the rest record. *Measured against the built
0.4.0 bundle, 2026-09-16*, `src` = `{ a: 'A_VAL', b: 'B_VAL' }`:

| Expression | JavaScript | 0.4.0 |
| ---------- | ---------- | ----- |
| `(({a, ...r}) => r.a)(src)` | `undefined` | **`'A_VAL'`** |
| `(({a, ...r}) => r.b)(src)` | `'B_VAL'` | `'B_VAL'` |

Array rest was correct — `evaluatePatterns` slices, so `[p, ...t]` never saw this. Both routes,
same as [A11](#a11).

**The one shape in this family whose wrong answer was a real value.** Every other row of A11 and
[A14](#a14) returned `undefined`, which a consumer notices. This returned the source's own property,
so an expression reading `r.a` worked and kept working, and nothing would have surfaced it. That is
why it carries the migration note's only "you may have been relying on this" line.

*Recorded*: found while measuring [A11](#a11) against the built bundle, 2026-09-16 — not by reading
the function, which had been read several times.
*Verified*: fixed by excluding the keys taken by sibling properties, **by their source name** rather
than their binding name, so `{ a: x, ...r }` removes `a`. Covered by `pattern.destructuring.spec.ts`.

<a id="a14"></a>
## A14 — A computed key in an object pattern is not evaluated

**Package** core · **Kind** fix · **Status** **Retired — fixed, `eval-core` 0.5.0, 2026-09-17.**
Opened and closed in the same change

`{ [keyName]: q }` parses with `Property.key` an **`Identifier`** and `computed: true`. The key
branch tested `key.type === 'Identifier'` before it tested `computed`, so it took the identifier's
**spelling** and read `src.keyName` where JavaScript reads `src[keyName]`.

**Hidden the same way [A11](#a11) was hidden by shorthand.** The literal computed form
`{ ["a"]: q }` takes the `Literal` branch, and a literal's value *is* the key — so the wrong branch
produced the right answer, and the only form that exposes it is a computed key that is not a
literal.

*Recorded*: 2026-09-17. **Found by a spec written for [A11](#a11)**, not by inspection: the
computed-key case used a decoy context where `keyName` resolved to `'a'` in the enclosing scope and
to `'DECOY'` on the source, so each way of getting it wrong produced a different value. A fixture
without the decoy passes over this defect, and the first version of that spec — asserting only
`{ ["a"]: q }` — did exactly that.
*Verified*: `computed` is tested first; the key is walked through `callback`, which runs **before**
the source property is read and with no scope pushed, so it resolves in the enclosing scope as
JavaScript does. Both arms covered in `pattern.destructuring.spec.ts`.

<a id="a3"></a>
## A3 — `import-expression.ts` has a dead `afterVisitor`

**Package** core · **Kind** fix (cosmetic) · **Status** **Retired — fixed 2026-09-26**; ships with
the next `eval-core` release

`importExpressionVisitor` called it after an unconditional throw
([`import-expression.ts:12`](../modules/eval-core/src/lib/internal/visitors/import-expression.ts#L12)),
so the line could never run. Nothing broke.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md).
*Verified*: source read, 2026-09-06.

*Fixed* 2026-09-26: the line deleted, and its `afterVisitor` import with it, which lint then
reported unused. Nothing else in the visitor changed. **The published artifact does change**: the
built `fesm2022` bundle, compared against a build of the parent commit, differs by exactly that
one line (and its source map with it); the `.d.ts` is byte-identical. Test counts unchanged.

<a id="a4"></a>
## A4 — `EvalContext.getKey` cannot case-correct a namespace, and does not resolve through the same chain as `get`

**Package** core · **Kind** fix · **Status** Open, Covered

Two related gaps in one method
([`eval-context.ts:233-259`](../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L233-L259)),
both surfaced by Phase 1 step 4's read hooks, which report `getKey`'s answer as the key that was
read.

**The namespace gap.** `getKey` searches `scopes`, then `original`, then **inside** each prior
scope's `context` — but never a scope's `namespace`. An `EvalScope` resolves its namespace in
`EvalScope.get`, which `getKey` has no counterpart for. So with a scope namespaced `dog`, the
expression `Dog.Says()` reports an uncorrected `'Dog'` for the identifier while the member hop
correctly reports `says`. **Covered** by `internal/visitors/read-hooks.spec.ts`; a fix must
update that spec deliberately.

**The divergence from `get`.** `getKey` omits the `lookups` loop that `get` runs, so a key
resolved by an `EvalLookup` reports its spelling uncorrected. And the two disagree about absent
values: `get` treats `undefined` as "not found" and continues to prior scopes and lookups, while
`getKey` returns the first spelling it finds. Under `caseInsensitive` the reported key can
therefore come from a *different source* than the value did.

**Confirmed to reach further than "a diagnostic" — Phase 3 step 2.** The `lookups` divergence
also strips the key off a library-owned error. `assignment-expression.ts:49` and
`update-expression.ts:22` resolve their target through `getKey` **before** writing, so under
`caseInsensitive` a key that lives only in `lookups` — which is every key of a
`@zvenigora/ng-eval-signals` context — comes back `undefined`, and any error raised from the
write names `'undefined'` instead of the key:

```
Cannot assign to 'undefined' in expression 'COUNT = 5': the keys of a signal context are read-only.
```

Both gaps are behavioral changes to an exported method. They matter most to dependency tracking,
which keys on what `getKey` returns. See [C3](#c3) for the question of whether `eval-signals`
should contain this locally, which was assigned to a step and never answered.

**A third divergence was found in Phase 2 step 1 and is filed as [A10](#a10), which argues it is the
same defect as this one.** If that reading holds, this entry is bigger than it looks: the fix has to
reach `getKeyValue` in `visitors/utils.ts` as well as `eval-context.ts`, and — the part that matters
for sequencing — **A10 sits in front of both gaps above**, so a fix to either that leaves A10 in
place does nothing whenever a scope is pushed, which since step 1 is every evaluation.

*Recorded*: [`side-effects/step-4-summary.md` § 5.2](side-effects/step-4-summary.md);
[`signals/phase-3-plan.md` § 3.6.4 gap 2](signals/phase-3-plan.md).
*Verified*: source read, 2026-09-06 — no `lookups` loop, no namespace check. The
`get`/`getKey` disagreement was then *measured* 2026-09-13 under [A10](#a10)'s probe, which
caught this entry's own third paragraph in the act: with `caseInsensitive` on, a
case-sensitive `Registry` original and a key spelled `A`, `get` returns `undefined` while
`getKey` returns `'a'` — the reported key coming from a different source than the value, exactly
as written here.

<a id="a10"></a>
## A10 — `getKey`'s scopes step reports **every** key as present against a plain-object scope

**Package** core · **Kind** fix · **Status** Open — **latent, not live.** Both halves of that
status matter; see "Why it is harmless today" before sizing this

**The shape — the sibling of the defect Phase 2 step 1 fixed, one method over.** Step 1 closed
`EvalContext.get`'s scopes step reading a plain record by *value*, which walked the prototype chain
and let an empty scope answer for `toString` and `constructor`. `getKey` has the matching fault and
did not get the matching fix: its scopes step calls `getContextKey`, which for a plain object calls
[`getKeyValue`](../modules/eval-core/src/lib/internal/visitors/utils.ts), and `getKeyValue` under
`caseInsensitive: false` returns `[key, obj[key]]` **without asking whether the object holds the
key at all**. Any name matches. Since step 1 a scope is pushed on every evaluation, so the first
step of `getKey`'s resolution order now answers for everything, always.

*Measured* 2026-09-13 against the built package, a plain-object scope pushed on an `EvalContext`
whose original is a `Registry` holding `a`:

| key | `get` | `getKey` |
| --- | ----- | -------- |
| `zzz-never-bound` | `undefined` | **`'zzz-never-bound'`** |
| `toString` | `undefined` | **`'toString'`** |
| `a` | `'A'` | `'a'` |
| *control, no scope pushed* | `undefined` | `undefined` |

The control is what shows the scopes step is the culprit rather than a later one.

**Why it is harmless today, and this half is not a footnote.** Nothing resolves and nothing leaks:

- With `caseInsensitive: false` there is no correction to get wrong. `getKey` returns the key **as
  written**, which is the same string every later step would have returned for that input, so no
  consumer reads a spelling it would not otherwise have read.
- Under `caseInsensitive` the case cannot arise. `fromContext` copies a plain record into a
  `Registry` when the flag is set, and a `Registry` is Map-backed and answers `undefined` for an
  unbound name — measured in the same probe. So the shape exists only on the path where it costs
  nothing.

So this is **not** the security-shaped defect its sibling was. Its sibling let an
`Object.prototype` member become the *value* of an expression, ahead of `original`, `priorScopes`
and `lookups`; this one hands back a string the caller already had. Anyone reading "same shape as
the fix in step 1" and scheduling it as urgent has read half the entry.

**What would make it bite**, and why it should be fixed *with* [A4](#a4) rather than on its own
schedule: it sits **in front of** every step a fix to A4 would add. A4's namespace gap is repaired
by teaching `getKey` to correct through a scope's `namespace`; its `lookups` divergence by adding a
fourth step. Both come after the scopes step — which now returns truthy for every key on every
evaluation. **A fix to A4 that leaves this in place is a fix that silently does nothing**, and it
would pass a suite that tests it with no scope pushed.

**One defect or two: one.** [A4](#a4)'s title is already "does not resolve through the same chain
as `get`", and this is a third way the same method answers a step of that chain differently —
namespace and `lookups` are about *which sources* are consulted, absent values about *what counts as
found*, and this about *presence within a source*. The root is shared and structural: `getKey` is a
parallel re-implementation of `get`'s resolution order rather than a derivation of it, so every
change to `get` widens the gap without anyone touching `getKey`. Phase 2 step 1 is the
demonstration — `get`'s scopes step became own-key presence, `getKey`'s did not, and no one edited
`getKey`. Filing it separately would invite three patches where the repair is one chain answering
two questions, which is the shape `get`/`getFromScopes`/`hasInScopes` were given in step 1 and is
the precedent to copy.

It is filed under its own ID rather than folded into A4's prose so that the "harmless today"
finding has somewhere to live and cannot be lost in a longer entry — not because it is independent
work.

*Recorded*: Phase 2 step 1, from the review of the `get` fix.
*Verified*: **measured**, 2026-09-13, on `dist/modules/eval-core` — table above.

<a id="a5"></a>
## A5 — Every service-layer entry point discards the error it caught

**Package** core · **Kind** fix · **Status** Open

Each catches and `throw new Error(error.message)`. That replaces the thrown object: its **type**,
its `cause`, its stack and any property it carried are gone, and the caller receives a bare
`Error` whose only surviving information is the message string.

**Twelve sites across four services.** The roadmap entry this replaces named six methods in two
services; that was an undercount, corrected here on 2026-09-06 by grepping
`throw new Error(error.message)` across `modules/`:

| Service | Method | Line | Named in the old entry? |
| ------- | ------ | ---- | ----------------------- |
| `EvalService` | `simpleEval` | [81](../modules/eval-core/src/lib/actual/services/eval.service.ts#L81) | yes |
| `EvalService` | `eval` | [108](../modules/eval-core/src/lib/actual/services/eval.service.ts#L108) | yes |
| `EvalService` | `simpleEvalAsync` | [138](../modules/eval-core/src/lib/actual/services/eval.service.ts#L138) | **no** |
| `EvalService` | `evalAsync` | [165](../modules/eval-core/src/lib/actual/services/eval.service.ts#L165) | **no** |
| `CompilerService` | `compile` | [181](../modules/eval-core/src/lib/actual/services/compiler.service.ts#L181) | **no** |
| `CompilerService` | `simpleCall` | [205](../modules/eval-core/src/lib/actual/services/compiler.service.ts#L205) | yes |
| `CompilerService` | `call` | [231](../modules/eval-core/src/lib/actual/services/compiler.service.ts#L231) | yes |
| `CompilerService` | `compileAsync` | [291](../modules/eval-core/src/lib/actual/services/compiler.service.ts#L291) | **no** |
| `CompilerService` | `simpleCallAsync` | [316](../modules/eval-core/src/lib/actual/services/compiler.service.ts#L316) | yes |
| `CompilerService` | `callAsync` | [342](../modules/eval-core/src/lib/actual/services/compiler.service.ts#L342) | yes |
| `DiscoveryService` | `extract` | [47](../modules/eval-core/src/lib/actual/services/discovery.service.ts#L47) | **no — service not mentioned** |
| `ParserService` | `parse` | [130](../modules/eval-core/src/lib/actual/services/parser.service.ts#L130) | **no — service not mentioned** |

The blast radius is double what was written down, and it includes the **parser**, so a syntax
error loses its type and position properties the same way an evaluation error does.

`evaluate` / `evaluateAsync` do not do this — they rethrow the original untouched — so the loss
is entirely in the service wrappers, and the free `call` / `callAsync` from `internal/functions`
are the same functions without it.

Consequences, in order of how quietly they fail:

- A caller cannot select an error by type. `instanceof` against any custom error class is false
  after one of these calls, so the only discriminator left is matching the message — which
  couples the caller to wording and breaks silently when it changes.
- A `catch` block cannot re-raise with context, because `cause` is already gone.
- Stack traces point at the service method rather than at the visitor that threw.

Rethrowing the original object, or wrapping it with `cause` set, are both candidates; the second
preserves the current type for callers who already depend on getting an `Error`. Behavioural
across twelve exported methods, so it needs its own step and a version bump.

Phase 3 routes around it rather than waiting: `createEvalSignal` calls the free `call(fn, state)`
so `SignalContextWriteError` survives to the factory
([`signals/phase-3-plan.md` § 3.6.3](signals/phase-3-plan.md)). That routing does **not** save
[A6](#a6).

*Recorded*: [`signals/phase-3-plan.md` § 3.6.3](signals/phase-3-plan.md).
*Verified*: grep + source read, 2026-09-06.

<a id="a6"></a>
## A6 — `safeCall` destroys the class of any error thrown *through* a call

**Package** core · **Kind** fix · **Status** Open

[A5](#a5) one layer down, and on a path no caller can route around. `safeCall` catches whatever
the callee threw and re-raises ``new Error(`Function call error: ${error.message}`)``
([`call-expression.ts:124-129`](../modules/eval-core/src/lib/internal/visitors/call-expression.ts#L124-L129)),
so an error crossing a call frame arrives as a bare `Error` carrying only a decorated message.
Same consequences as [A5](#a5)'s — but calling the free `call(fn, state)` does not help, because
this wrapper is inside the walk itself.

**Surfaced by Phase 6 step 3, which is where it stops being abstract.** `applyErrorPolicy`
([`error-policy.ts`](../modules/eval-forms/src/lib/error-policy.ts)) guarantees that
`SignalContextWriteError` is re-thrown rather than routed through the consumer's error policy —
a write violation is illegal on every recompute with every dataset, so swallowing it under the
default of `'undefined'` hands the consumer a permanently blank field for a bug in the rule's own
syntax. That guarantee holds for a top-level assignment and **fails for an assignment nested
inside a call**: `[1].map(x => (country = "CA"))` reaches `applyErrorPolicy` as a plain `Error`,
fails the `instanceof`, and is policy-routed to `undefined`. Measured in step 3 with a temporary
probe.

The blast radius is wider than that one class: **no** custom error type survives a call frame
anywhere in the evaluator. Fixing it means re-throwing the original object — or wrapping it with
`cause` set, which needs `eval-core`'s `lib` rather than the two downstream ones — and it is a
behavioural change to what escapes a call.

*Recorded*: [`forms/phase-6-plan.md` § 3.4](forms/phase-6-plan.md);
[`forms/phase-6-step-3-summary.md`](forms/phase-6-step-3-summary.md); `eval-forms`' README.
*Verified*: source read, 2026-09-06.

<a id="a7"></a>
## A7 — `EvalContext.getThis` reads the wrong object in its `priorScopes` loop

**Package** core · **Kind** fix · **Status** Open

[`eval-context.ts:209-213`](../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L209-L213)
calls `getContextValue(this._original, key)` inside the loop over `this._priorScopes`, where it
should read `scope`. So the loop re-tests the original context on every iteration: it can only
ever succeed for a key `_original` already holds — in which case the preceding block has returned
— and it therefore returns a prior scope's `thisArg` for no key, and never returns one for a key
a prior scope actually supplies.

Bounded today because `getThis` has exactly one call site in the evaluator,
`member-expression.ts:97`, and a bare call takes a different path — `call-expression.ts` passes
`st.context` as `thisArg` and never consults `getThis` at all (pinned by
`modules/eval-signals/src/lib/signal-context.spec.ts`). Surfaced incidentally while auditing
`set`'s callers in Phase 3 step 2. Cosmetic to fix, behavioural in effect; it needs a spec
written against the corrected behaviour rather than the current one.

*Recorded*: [`signals/phase-3-plan.md`](signals/phase-3-plan.md), Phase 3 step 2.
*Verified*: source read, 2026-09-06.

<a id="a8"></a>
## A8 — `EvalService._activeStates` grows unboundedly

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-25, released 2026-09-26**, both
halves; `eval-core` 0.6.0, tagged f26f987, under `CHANGELOG.md`'s `[eval-core 0.6.0]`

**This entry is why this file exists.** See [R4](#r4) for the cross-references that hid it.

**Fixed in two steps.**

- **Step 1** ([`docs/a8/plan.md`](a8/plan.md), 2026-09-24) made `simpleEval` and
  `simpleEvalAsync` remove their state from the set when the call returned. That included a walk
  that throws and a promise that rejects.
- **Step 2** ([`docs/a8/step-2-plan.md`](a8/step-2-plan.md), 2026-09-25) deleted the set.
  `EvalService` now keeps no state and no context. `ngOnDestroy` marks the service destroyed and
  drains nothing. Who owns a state that `createState` hands back was an ownership decision, taken
  in [`docs/a8/step-2-decision.md`](a8/step-2-decision.md). It compared three options: the caller
  owns the state, weak tracking, and an explicit release. It chose the first.

**Step 2 withdrew a published promise.** From 0.3.0 to 0.5.0, destroy cleared the hook
registries of the states `createState` built, including the caller's `options.hooks`. Withdrawing
it reverses [A21](#a21)'s decision to keep the clear. It also removes the drain that
[A17](#a17) reordered and the `catch` that [B3](#b3) silenced.

**Coverage.** Step 1's cases 1.1–1.5, 1.7 and 1.8 and step 2's 2.1–2.9 cover it, in
`eval.service.memory-leaks.spec.ts` and `eval-signal.memory.spec.ts`. Every wrong implementation
each plan names was run against every case, and the results were read case by case. The tables
are in `plan.md` § 2.5 and `step-2-plan.md` § 6. Step 2's 2.10 pins the destroyed flag, not
retention. It was added after that run, from the code-reviewer's finding, and was probed against
P5 alone.

*The rest of this entry is the defect as recorded, with the notes each step added.*

Step 1 carried [A17](#a17) and [B3](#b3)'s `ngOnDestroy` site too, as this entry asked. It also
narrowed one published sentence. Destroy clears an adopted hook registry only for states that
`createState` handed back, because it no longer reaches a `simpleEval` state. That is a trade
with a small cost. A hook that stores `event.state` where only the hook can reach it now keeps
that state for as long as the caller keeps the registry, and no longer only until destroy. The
plan's § 2.2 weighs it. *Step 2 declined weak tracking, which could have reopened this. It
extended the same trade to `createState` states instead, so destroy clears no registry at all.*

`EvalService.createState` adds every state it builds to a strong `Set` (`eval.service.ts:45`),
and nothing removes an entry except `simpleEval`'s and `simpleEvalAsync`'s own. The set is
drained only in `ngOnDestroy` (`:53`). *(Both lines as of `10dd98f`. Step 2 deleted both, so
they are no longer linked.)* `EvalService` is `providedIn: 'root'`, so that is application
teardown.

*(Until step 1. Then true of every `createState` state the caller dropped, until step 2.)* Every `simpleEval` /
`simpleEvalAsync` call therefore retains its `EvalState` — and with it the
AST, the value stack, the trace and anything a hook closure captured — for the life of the
application. The cost grows with uptime and with call volume, which is the profile of a
long-running form or dashboard: exactly this repository's stated audience.

**"The trace" became a much larger term in Phase 2 step 5, and [A12](#a12)'s fix shrank it
again.** It used to be bounded by the expression's node count; with `for` loops registered, one
retained state could hold hundreds of thousands of trace items. **As of A12's fix — released 2026-09-26,
`eval-core` 0.6.0 — it is bounded by `maxTraceItems`, default 10,000**, so a
retained state holds ~0.5 MB of trace rather than ~34 MB, and `EvalService.ngOnDestroy` now
clears it *(until step 2, which removed that drain with the set)*. The two entries still compound, just by two orders of magnitude less: A12 is how much
one state can hold, A8 is why it is never released. **A8 is unchanged by that fix** — the `Set`
still grows, every `simpleEval` still retains its state *(until step 1; `createState`'s did
until step 2)*, and the trace is only one of the things a retained state keeps.

**It compounds two other entries.** [`phase-1-plan.md:1095`](side-effects/phase-1-plan.md)
records that because the `Set` is strong, frames abandoned on the open-node stack keep their AST
nodes alive "for the life of the service, which is exactly the retention `ngOnDestroy` is called
to prevent". And a leaked scope from [A9](#a9) sits on a context those retained states reference.

**Covered, in a way a fix must plan for.** *(As found by step 1, 2026-09-24: the first spec was
replaced. The second went red only in its `simpleEval` cases, and its control stayed green
because it goes through `createState`. The third went red at its count and was re-driven through
`createState`, which is what its comment always described, so it stays at 5. The control and
that count were step 2's red specs. The plan's § 1.3 has each. Step 2 deleted the first and
replaced the second, as the notes below say.)* Three specs read the private
field:

- `eval.service.memory-leaks.spec.ts:84-90` *(as of `c0c385b`; replaced by step 1, so no longer
  linked)* asserts the set is non-empty before `ngOnDestroy` and empty after — so it pins the current
  behaviour in both directions. *Step 1:* it fed the set through `simpleEval`, went red at its
  first assertion, and was replaced by the plan's criterion 1.6, which asserts the reverse.
- The same file's `contexts passed in are not retained (A20)` block *(added 2026-09-24 by
  [A20](#a20)'s fix)*. Its `collect` helper clears the set by hand before forcing a GC, and its
  control case, "should still retain the context through A8's state set", asserts that a
  context **is** still retained when the set is left alone. A fix turns the control red. It is
  deleted then, together with the clear in `collect`. *Step 1:* its two `simpleEval` cases now
  run with the set intact. The control goes through `createState`, stayed green, and (`:288`) is
  step 2's to turn red. `collect` keeps its clear for the two `createState` cases. *Step 2:* the
  control and the clear were deleted, as planned. Every case now runs on the service as it is,
  and a positive control (2.3), a context whose state the test holds, replaced the old one.
- `eval-signal.memory.spec.ts:80-114` uses it as a **contrast probe** in a different library: it
  is the reason `createEvalSignal` builds its states through `CompilerService` instead. A fix turns
  that spec red at one named line, and the comment above it says so. *Step 1:* it drove
  `simpleEval` and went to `0`. Its comment said `createState`, so it now drives `createState`,
  and it stays at `5` until step 2 (`:113`). That count is a symptom. The behaviour it guards is
  the `0` above it. *Step 2:* with no field to read, the case was replaced by a behavioural one
  (2.9). Each recompute's state is caught as a `WeakRef`, and all five must be collected except
  one the test holds. It is not a spy on `EvalService.createState`, which would pin a choice whose
  reason had gone. *(Line numbers here are as of `10dd98f`, and are no longer linked.)*

So a fix is not one file. It is: drain the set at the end of each evaluation (or make it weak),
update the `eval-core` specs that pin non-drainage, and update the `eval-signals` contrast probe
whose whole point is that the two paths differ.

**A8 now also holds every context passed in.** *(Added 2026-09-24, by [A20](#a20)'s fix.)* A
state holds its context, so each context passed to `createState`, `simpleEval` or
`simpleEvalAsync` stays reachable through the state in this set until destroy. `_activeContexts`
held the same objects for the same lifetime, which is why deleting it changed nothing a consumer
can observe, except for a `caseInsensitive` context, where the state holds a copy. **So this fix is the one that makes contexts collectable, and its `CHANGELOG.md`
entry should say so.** A20's control case observes that retention. The `eval-signals`
documented pattern, `simpleEval(expr, createSignalContext(...))`, is the case worth naming:
each signal context passed that way is kept, with the signal sources its lookup closure reads.
*Step 1 released every context passed to `simpleEval` and `simpleEvalAsync`, that pattern's
included, and its `CHANGELOG.md` entry says so. Step 2 released every context passed to
`createState`, once the caller drops the state.*

**The step that fixes this carries [B3](#b3) and [A17](#a17) too.** *(Step 1 carried both.)* All three are in
`ngOnDestroy`, and B3 already asks to be revisited with A8. **[A20](#a20) and [A21](#a21) are the
same method's siblings**, filed 2026-09-23. Both are fixed, and neither needed this fix. A21 was
fixed in `c86b586`. A20 deleted `_activeContexts` ([`docs/a20/plan.md`](a20/plan.md)). *(Corrected
2026-09-24, twice. It first said "A20 should ride with this fix". Then it said A20's fix stood
alone. The code change does stand alone, but the benefit depends on this fix: before A20's fix,
the second set would have kept every context alive even after this set was fixed.)*

*Recorded*: originated [`side-effects/phase-1-plan.md:1095`](side-effects/phase-1-plan.md) and
[`side-effects/step-2-summary.md` § 4.2](side-effects/step-2-summary.md); stated as its own item
in [`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md); carried forward in all six
`docs/forms/step-*-summary.md` § 5.3 tails.
*Verified*: source read, 2026-09-06. Step 1: red first and probed, 2026-09-24
([`docs/a8/plan.md`](a8/plan.md) § 2.5). Step 2: red first and probed, 2026-09-25
([`docs/a8/step-2-plan.md`](a8/step-2-plan.md) § 6).

<a id="a9"></a>
## A9 — The arrow-scope leak's root cause: no `try`/`finally` at either push site

**Package** core · **Kind** fix · **Status** **Retired — fixed** — Phase 2 step 0, 2026-09-11; released in
`eval-core` 0.4.0

**Fixed.** Both sites now push, then open a `try` whose `finally` pops. The rest of this entry is
the record of what the defect was and why it took five phases to get a home; it is no longer
work. What the fix closes and what it does not:

- The **escaped-closure residual** below is closed. It was the part no downstream containment
  could reach, because the arrow's push happens when the closure is *called*, which may be after
  any recompute boundary has run its own `finally`. A pop that travels with the push does not
  care when the call happens.
- The two downstream containments — `eval-signals`' snapshot-and-restore around each recompute,
  `eval-forms`' `evaluateRule` choke point — are **redundant but not removable**, and step 0 did
  not touch them. Both unwind with `while (scopes.length > depth) { pop() }`, so with the leak
  closed the loop body simply never runs: no double-pop, no new failure mode. They stay because
  both packages declare `"@zvenigora/ng-eval-core": "^0.3.0"`, a range that still admits the
  **leaking** 0.3.0 — so a consumer on `eval-signals` 0.1.0 + `eval-core` 0.3.0 is a supported
  installation that the guard is still load-bearing for. Removal is gated on raising both peer
  ranges, which is a breaking release of two packages. They also remain the downstream backstop
  for the three push sites Phase 2 still adds.
- **Step 0 left the branch red, on purpose; step 0b closed it.** Two pre-existing downstream specs
  pinned the leak as known behaviour and failed because it is fixed — `eval-signals`'
  `signal-context.spec.ts:248` and `eval-forms`' `field-schema.spec.ts:347`. Editing either from a
  step scoped to `eval-core` is what § 2 forbids, so the handling was
  [`statements/phase-2-plan.md`](statements/phase-2-plan.md) **step 0b**, which also covered three
  containment specs that had gone vacuous and four downstream comments that had gone false. The
  second of those mattered most: those specs are the downstream detector for a missing `finally`
  at the push sites steps 1, 2 and 5 add. **Done, 2026-09-12** — all three restored, and all
  three driven now through `EvalContext.push` / `pop` rather than through the fixed defect,
  since a public push on a published class is the one route no visitor fix can close. The red
  sets, named rather than counted, from whole-suite runs:
  - `evaluate-rule.ts`'s unwind loop removed → **exactly 2**: `evaluateRule` *should unwind a
    stranded scope to the caller's depth mark, not to zero* and *should resolve its own source
    key when the same rule is invoked again after a strand*.
  - the same loop changed to drain to zero rather than to the mark → **exactly 1**: the
    depth-mark case. This is what makes the caller-pushed `marker` scope load-bearing rather
    than decorative.
  - `eval-signal.ts`'s unwind loop removed → **exactly 1**: *should contain a scope stranded
    through the published push to the recompute that made it*.
  - step 0's own `finally` reverted in `arrow-function-expression.ts` → **exactly 2**, both in
    `signal-context.spec.ts`, and **zero** in `eval-forms` — which is the measurement behind
    the escaped-closure note below.
- **What step 0b found about `field-schema.spec.ts` § 3.4.1** — recorded because the plan
  anticipated the opposite outcome and reserved a backlog entry for it. That block asserted
  "one `EvalContext` per field" *through* the leak, and with the leak gone its surviving case
  passed under a single shared context (measured, by hoisting `createFieldContext` out of
  `bindFieldProperties`' loop). The property is **not** ungated: a replacement observable was
  found that needs no defect at all. An arrow's parameter scope is on its field's context
  *legitimately* for the duration of the body, so a form control whose value is a function,
  called as that body, opens a window in which another field can be read — it resolves against
  the shared scope or not, and that is the discrimination. The case carries a positive control
  (the same window read through the *owning* field, which must see the pushed binding) so that
  a run in which no scope was pushed cannot pass it silently.
- **The escaped-closure claim is now gated, and was briefly not.** This entry, the plan and two
  containment docblocks all assert the escaped-closure residual is closed. Step 0b's review found
  nothing asserting it: `arrow-function-expression.spec.ts` drives the arrow as an IIFE *inside*
  the walk in all its cases, and the one place in the repository that stored an escaped closure,
  called it after the walk returned and made it throw was `field-schema.spec.ts`'s leak case —
  retired earlier in 0b because the leak it observed was gone. `signal-context.spec.ts` gained a
  case for it (*should contain the scope of an arrow that escapes the walk and throws when
  called*), confirmed red when step 0's `finally` is reverted. Worth keeping as a pattern: the
  step that *removes* the last observation of a path is the step most likely to be the one
  newly asserting something about it.
- **Two stale comments left outside 0b's closed file list**, recorded here rather than edited,
  because the list is what § 2's exception is scoped to and widening it from inside the step is
  the condition the plan calls stop-and-replan. Both are present-tense claims that step 0
  falsified, of exactly the class 0b was convened to remove, and nothing in `run-many` flags
  either:
  - `modules/eval-signals/README.md` § "The arrow-scope guard covers `createEvalSignal`, not a
    raw context" — all three of its clauses are now false, and the third ("an arrow function
    that escapes the walk and throws when you call it later" still leaks) is contradicted by a
    comment 0b itself wrote in `eval-signal.ts`. This is **published prose in a shipped
    package**, so it is the most visible of the family. `readme-examples.spec.ts` does not
    reach it: that gate runs snippets, it does not check what surrounding prose asserts.
  - `modules/eval-forms/src/lib/field-context.ts` — motivates one-context-per-field with "an
    arrow function's leaked scope, say". Hedged rather than false, but its `/reactive` twin in
    `field-schema.ts` was rewritten in 0b to drop that framing, so the shared core and the
    adapter now explain the same decision differently.

  Also noted and not acted on: `.claude/agents/code-reviewer.md` carries
  `pattern.ts:110-113` for the scope push, which step 0 moved. Repository tooling, not a
  library, and outside every list this phase has.
- It is a **behavioural change to a published path**, carried by Phase 2's `0.4.0` bump: on a
  reused `EvalContext`, a throwing arrow body used to leave a scope that shadowed a source key of
  the same name for the life of that context, and no longer does.

**Where the detectors are.** `arrow-function-expression.spec.ts` (three cases, on a *reused*
`EvalContext` — a fixture building its context inline cannot observe this) and `pattern.spec.ts`'s
`ObjectPattern` fixture. Reverting each `finally` separately was run, and the red sets are
disjoint: the arrow revert reddens the three arrow cases and no pattern case; the pattern revert
reddens the two `ObjectPattern` cases and no arrow case.

**The idiom, for the three push sites Phase 2 still adds.** The `try` opens on the line *after*
the push, never around it. Both sites write `st.context?.push(...)`, so a `try` opened one line
early pairs a `finally` pop with a push the optional chain had skipped — and, at the arrow site,
swallows a throw from `evaluatePatterns` into a pop as well. Neither failure is visible to any
suite. Recorded in [`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 4 step 0.

---

The defect, as it stood:

The third stack invariant in `CLAUDE.md`: exactly one `st.context.pop()` per
`st.context.push()`, on every exit path including the ones an exception takes. Only two visitors
pushed scopes and **neither used `try`/`finally`**, so a body that threw skipped the pop:

- [`arrow-function-expression.ts:16-18`](../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L16-L18)
- [`pattern.ts:110-113`](../modules/eval-core/src/lib/internal/visitors/pattern.ts#L110-L113)

**Why this outlives the walk.** The value stack and the open-node stack are on `EvalState`, which
`evaluate` builds per walk and discards. The scope stack is on `EvalContext`, and one
`EvalContext` can back any number of evaluations. A leaked scope therefore outlives the walk, and
every later evaluation on that context reads it first — scopes are step 1 of `EvalContext.get`'s
resolution order. Nothing drains it. One throwing arrow body permanently shadows a source key of
the same name.

**Recorded everywhere as a containment, nowhere as a defect.** This is the entry's history and
the reason it had no home:

| Where | What it says |
| ----- | ------------ |
| `CLAUDE.md` | States the invariant and both sites. Not a work item |
| [`signals/phase-3-plan.md` § 3.8.3](signals/phase-3-plan.md) | `eval-signals` snapshots `scopes.length` and pops back in a `finally` around each recompute |
| [`forms/phase-4-plan.md` § 9.1](forms/phase-4-plan.md) | Warns the `/signals` path would not inherit that containment |
| `ROADMAP.md` Phase 5 | Names it as an open question for `callAsync` |
| `ROADMAP.md` Phase 6 | Named it as the phase's one correctness precondition |

Two libraries now carry workarounds for three lines of core, and each workaround is a correct
implementation that a tidying edit can silently disable.

**Premise retired — the Phase 6 half is discharged.** Phase 6 built the choke point
(`evaluateRule`), so the `/signals` precondition is met and `ROADMAP.md`'s Phase 6 section should
not be read as pending work. What is *not* discharged is the core defect, and the containments
remain partial: the **escaped-closure residual** survives all of them. `arrow-function-expression`
pushes its parameter scope when the closure is *called*, not when it is visited, so
`createEvalSignal('x => x.foo()', ctx)` hands the consumer a function whose push — and skipped pop
— happen after the recompute's `finally` has run. That leak is permanent on the shared context
and is not containable at a recompute boundary by construction: there is no recompute in progress
when it happens.

**Fixing it in `eval-core` is the only thing that closes the residual**, and `phase-3-plan.md`
§ 3.8.3 says so in as many words while ruling it out of *that* phase's scope. Phase 2 step 0 is
that fix.

*Recorded*: `CLAUDE.md`; [`signals/phase-3-plan.md` § 3.8.3](signals/phase-3-plan.md);
[`forms/phase-4-plan.md` § 9.1](forms/phase-4-plan.md).
*Verified*: source read, 2026-09-06 — no `try` at either site. Measured on the built package,
[`statements/phase-2-plan.md` § 1.3](statements/phase-2-plan.md): `scopes.length` **1** after a
throwing arrow body, and the later read returning the shadowed `'SHADOW'` rather than `'SOURCE'`.
*Fixed*: 2026-09-11, Phase 2 step 0, with both reverts probed separately.

---

<a id="a12"></a>
## A12 — `EvalResult.trace` grows per loop iteration, so the iteration budget bounds time and not memory

**Package** core · **Kind** fix / decision · **Status** **Retired — fixed 2026-09-23, released 2026-09-26**;
`eval-core` 0.6.0, tagged f26f987, recorded under [`CHANGELOG.md`](../CHANGELOG.md)'s
`[eval-core 0.6.0]`. **Created by Phase 2 step 5**, found in its review

**Fixed.** `maxTraceItems` bounds the trace, defaulting to 10,000; `EvalResult.traceTruncated`
and `tracePushCount` report what the bound cost; `EvalResult.clearTrace()` is the only reset,
and `EvalService.ngOnDestroy` calls it. *(Until [A8](#a8)'s step 2, 2026-09-25. That step
removed the destroy drain before it shipped, because the service no longer keeps the states it
drained. `clearTrace()` is now called by nothing in the library, and a caller who wants a trace
emptied calls it.)* The rest of this entry is the record of what the defect was and what
measuring it produced.

**The measurements stand as three figures, not one, and none corrects another.** This entry's
original "roughly 45 MB" was taken **without** a forced collection and says so. A measurement
with one, 2026-09-17, gave **34.4 MB**. The same conditions gave **34.2 MB** two days later. The 45 is a different
measurement, not a wrong one; the 34.4 and the 34.2 are the same measurement on two days.

**What the fix did not close, and it is not in this entry.** Exit criterion 6 of the step that
shipped the bound could not detect its own named wrong implementation — see [A19](#a19). That is
a defect in a criterion rather than in the trace, which is why it has its own entry.

`pushVisitorResult` appended to `st.result.trace` on **every** push, unguarded, and
`EvalResult.start()` did not reset the trace — the array is built once in the constructor and
accumulated for the life of the state.

Before Phase 2 step 5 the trace was bounded by the expression's **node count**. With
`ForStatement` registered it became bounded by **iterations × nodes**, a different order of
quantity from a fixed expression — and it is now bounded by `maxTraceItems`. Measured against
`dist/` after `build:production`, on the code that step shipped:

| source | trace items |
| ------ | ----------- |
| `for (let i = 0; i < 100000; i++) { i }`, `maxIterations: Infinity` | **700,007** |
| `for (;;) { i }`, default budget, to the throw | **300,000** |
| `for (let i = 0; i < 1000; i++) { i }` three times on one state | 7,007 → 14,014 → 21,021 |

Roughly 45 MB of heap for the first, though heap deltas measured without a forced collection are
soft; the **item counts are the firm number** and are what a fix would have to bound.

**Two things made this worth an entry rather than a shrug.** The trace **survived the throw** —
where the budget *did* stop a loop, as in the `for (;;)` row, the runaway case paid the whole
allocation and *then* raised, so the budget converted a hang into a large allocation plus an
error rather than into a cheap error. And [A8](#a8) keeps every `EvalService`-created state in a
strong `Set` for the life of the application, so under `simpleEval` that memory is retained. A8
already said a retained state keeps "the trace"; what it could not anticipate was that one
expression could put ~700 k items in one.

**`maxIterations: Infinity` was the sharp edge.** The plan's § 3.4 offers it as "a caller may
raise it, or set `Infinity` and own the consequence", and the consequence it had in mind was a
hang. With the trace unbounded the consequence was an out-of-memory instead. That is no longer
so: `maxTraceItems` bounds the trace whatever the budget does, and the option's docblock now
says that rather than the warning it used to carry.

**Not fixed in step 5, and the reason is scope rather than difficulty.** Capping or per-run
resetting `EvalTrace` changes what `EvalResult.trace` contains on an already-published path —
a versioned-release decision, and one that belongs with whoever decides what the trace is *for*
(it is the dependency-tracking channel `eval-signals` and `eval-forms` were built against). Step 5's
file list does not admit `eval-result.ts` or `visitor-result.ts`, and widening it under a
performance observation is the move this register exists to prevent.

> **Two of this entry's own reasons for deferring were measured false before the fix** (2026-09-19,
> by grepping all three packages for readers of the trace and reading both READMEs), and both are
> quoted above, so a reader working from the deferral reasoning should stop here.
>
> - **The trace is not the dependency-tracking channel.** That is `createDependencyTracker`
>   installed on `EvalHooks`, consuming `read` events. **No library code in any of the three
>   packages reads the trace** — every non-spec hit outside `eval-core` is a doc comment. The
>   deferral rested on a downstream owner who does not exist.
> - **Nothing documents accumulate-across-runs.** The root README's example is `createState` +
>   **one** `eval`, and the package README mentioned the accumulation only to call it a wart.
>   What *is* documented as per-state running totals is `nodeTimings`, a different accumulator.
>
> Neither changes the deferral's *conclusion* — step 5 was right not to widen its file list —
> but both were load-bearing in the argument for it, and they are the kind of claim a retired
> entry carries forward unchallenged.

**Options, for whoever takes it**: a cap with a documented truncation marker; a
`trace: false` option; resetting per `evaluate` in `start()` (which changes the documented
accumulate-across-runs behaviour the `createState` + repeated `eval` style relies on); or
recording loop bodies once rather than per iteration. None is obviously right, which is why this
is filed rather than guessed at.

*Found*: 2026-09-14, Phase 2 step 5 review.
*Measured*: 2026-09-14 against the built package, numbers above, re-run independently of the
review that raised it; re-measured against the built 0.5.0 bundle **2026-09-17, all three item
counts reproducing exactly** (700,007 / 300,000 / 7,007 → 14,014 → 21,021), and **2026-09-19,
the 700,007 row only**, with the heap at 34.2 MB. Attributed per date rather than to both,
because only the first run covers all three.
*Recorded*: this entry; [`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts)'s
`maxIterations` docblock; cross-referenced from [A8](#a8).
*Fixed*: first implemented 2026-09-19 in two steps, each probed — ten wrong implementations
against the bound and five against `clearTrace()`. The probe record, with which cases went red
under each, is the header of
[`trace-bound.spec.ts`](../modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts).
Default path measured unchanged at 598 → 588 ns/walk; the 100k loop 98 → 49 ms and 34.2 →
0.6 MB. Replayed onto this line 2026-09-23 as three steps, recorded in
[`docs/trace2/`](trace2/step-1.md).

---

<a id="a15"></a>
## A15 — The per-walk trace reset, weighed and declined

**Package** core · **Kind** decision · **Status** Open, **decided 2026-09-24: declined in
general**, not only for the [A12](#a12) fix. Not Retired, because the reopen conditions at the end
are live, the same way [D7](#d7) is kept. Opened 2026-09-19, when the [A12](#a12) fix weighed
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
[A12](#a12)'s fix bounds its **total** with `maxTraceItems`; it does not change that span. A reset
on the outermost walk entry — gated on `walkDepth` 0→1, beside the iteration budget's refill —
was weighed as part of that fix and declined. This entry is the argument, so the question reads
as answered rather than missed.

**Declined because it bounds nothing the cap does not.** A head cap bounds `trace.length` however
many walks run on a state; the reset bounds only the per-walk contribution and leaves the headline
case — **one** walk, 700,007 items — untouched. It also does nothing for the [A8](#a8)-compounded
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

<a id="a16"></a>
## A16 — `EvalTraceItem.start` and `end` are declared and never set

**Package** core · **Kind** decision · **Status** **Retired — decided and documented 2026-09-24,
released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987. Recorded under
[`CHANGELOG.md`](../CHANGELOG.md)'s `[eval-core 0.6.0]`. Opened
2026-09-19, deliberately not decided by the [A12](#a12) fix

**Decided 2026-09-24, by [`docs/trace-surface/plan.md`](trace-surface/plan.md): documented as
reserved.** Both fields now have JSDoc saying nothing sets them. It points at `expression` for
source text and at `EvalState.nodeTimings` for timing. Each field keeps its type. The three
options, with their costs:

- **Document as reserved** (chosen). Two docblocks that ship in the `.d.ts`, and one
  `CHANGELOG.md` line. No shape change, so no bump of its own; it rides the next release. It
  closes neither other option: filling an optional field later is additive, and dropping it later
  is the same breaking change it is today.
- **Populate.** The declaration carries no meaning to populate *with*, so a meaning has to be
  chosen first. Source offsets would add two properties to every kept item, written on the
  per-node push path that `performance.spec.ts` gates. Timestamps would add a clock read per push.
  That is the timing hook's job, and it sits behind `trackTime` for that reason. Either is a
  feature nobody has asked for.
- **Drop.** Breaking for code that assigns them, such as a consumer building `EvalTraceItem`
  literals for a test double. That needs a breaking release, and it gains nothing a reader of
  the JSDoc does not already have.

**Why Retired, when [D7](#d7) and [A15](#a15) stay Open.** D7 accepts a defect that stands. The
defect here was two fields that look like a timing facility and are not one, and the JSDoc is
what removes it. Nothing is left pending and there is no reopen condition to watch. That is
[F4](#f4)'s root README precedent, decided, dropped and Retired. Populating them would be a new
feature, and it would get its own entry.

[`eval-trace.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-trace.ts)'s
`EvalTraceItem` declares `start?: number` and `end?: number`. **Nothing in any of the three
packages ever assigns either** — grepped, not assumed. `EvalTrace.add` sets `type`, `value` and
optionally `expression`, and no other writer exists.

Both are optional, so nothing breaks either way: a consumer reading them gets `undefined`, which
is what the type already promises. Removing them from an exported interface **is** a breaking
change for a consumer who assigns them; keeping them costs nothing but leaves two fields that look
like a timing facility and are not one.

**Not decided by the A12 fix, and the reason is the register's own.** It is a published-surface
question with no connection to memory, and riding it along inside a bounding change is exactly
what [A12](#a12)'s own deferral paragraph declined to do with the bound itself. Whoever decides it
should decide it as a surface question: drop them in a major, populate them, or document them as
reserved.

*Recorded*: this entry; the A12 fix listed it as out of scope.
*Verified*: grepped across all three packages 2026-09-17 — `EvalTrace.add` is the only writer of
an `EvalTraceItem`, and it sets neither field. Re-grepped 2026-09-24 with the same result.
`eval-trace.ts` has one commit in its history, `c1d6c05` (2024-01-11), which declared both
fields, so `add` has never set them. `git log -G "trace\.(push|add)\(" -- modules` returns
`c1d6c05` and `e6192cd`, and both write through `add`, so no other writer has ever existed.
*Fixed*: 2026-09-24, the docblocks in `eval-trace.ts`. After `build:production` they are present
in the built `.d.ts`.

---

<a id="a17"></a>
## A17 — `EvalService.ngOnDestroy` drains under one `try`, so one throw skips the rest

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-24, and never
released**: [A8](#a8)'s step 2 removed the drain before it shipped, so no `CHANGELOG.md` entry
describes this fix — opened 2026-09-19, found reviewing the [A12](#a12) fix's
`clearTrace()` change

**Its subject is gone. The drain it reordered was then removed by [A8](#a8)'s step 2, on
2026-09-25, before either change shipped.** The service no longer keeps any state, so
`ngOnDestroy` has nothing to drain, and the three cases below were deleted with it. The entry
stays retired: there is no drain left to fail.

**Fixed** by [A8](#a8)'s step 1 ([`docs/a8/plan.md`](a8/plan.md) § 2.1), using the second option
below. The order is now the value stack, the hook bookkeeping, the hook registry, and then the
trace. The state's own structures go first, then the two caller-owned drains, with the one that
matters for retention ahead of the other. Three cases in `eval.service.memory-leaks.spec.ts`
freeze the trace and destroy. Two of them failed against the old order. Each probe order turned
exactly its own case red: trace before hooks, and bookkeeping left last. The third case pins the
per-state `catch`, which [B3](#b3)'s change had to keep.

*(The next paragraph describes the drain as step 1 left it. It lapsed with the drain in step
2.)* **One exposure remains, by choice.** A registry whose `clear` throws, for example a frozen one,
still skips the trace drain for that state. The two caller-owned drains cannot both come last.
The hook clear goes first because it is the one this entry says matters. A `try` per drain
would close this too. It was not chosen, because the throw can only come from the caller's own
object and costs only that object.

*The rest of this entry is the defect as recorded.*

[`eval.service.ts`](../modules/eval-core/src/lib/actual/services/eval.service.ts)'s `ngOnDestroy`
drains each state inside **one** `try`/`catch`: the value stack, then the trace, then the hook
registry, then the hook bookkeeping. *(Four since [A21](#a21)'s fix, 2026-09-23, which deleted a
fifth, the context drain, between the trace and the hook registry.)* A throw from any of them lands in the single
`catch`, which logs and moves to the next **state** — so every drain *after* the throwing one is
skipped for that state.

**The order makes it worse than it sounds.** The hook-registration drop is last but one, and the
method's own comment identifies it as the drain that matters most for retention: a registry the
caller still holds keeps every state its closures captured reachable. A throw in an earlier drain
silently costs exactly that.

**Two of the four drains call into objects the caller owns**, which is where a throw comes
from. *(Corrected twice. It first said three, counting `state.context.clear()`. The first
correction, 2026-09-23, dropped it to two on the ground that the call never runs, because
`EvalContext` has no `clear` method. That was nearly right. The call did run for a caller's
`EvalContext` subclass that declared one, and [A21](#a21)'s spec observed it. A21's fix then
deleted the call, so two stands.)* `hooks.clear()` has carried that exposure since
before the trace work — [`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts)'s
`hooks` docblock says an adopted registry is "adopted as-is and never cloned" and that this
method empties it *(it no longer says the second, since [A8](#a8)'s step 2)*. `clearTrace()` (`eval-core` 0.6.0) is the second: `EvalResult.trace` is a
published getter handing out the live array, so a consumer who `Object.freeze`d it makes
`this._trace.length = 0` a `TypeError` under module strict mode.

**Not a defect in the change that surfaced it** — it is a property of the method, and it predates
that change. Filed here rather than in a step summary because the next person to touch
`ngOnDestroy` will look here.

**Options**: a `try` per drain; or order the drains so the caller-owned calls come last; or keep
one `try` and document that a hostile caller can skip the rest. The second is the cheapest and
does not change the method's shape — but note it has to move `hooks.clear()` too, and that is
the drain this entry calls the one that matters, so "order the caller-owned calls last" and
"protect the hook drop" are the same requirement rather than two.

*Recorded*: this entry.
*Verified*: source read 2026-09-19. Not exploited — no probe was written, and the frozen-array
route is reasoned from `trace`'s published getter rather than demonstrated. **Demonstrated
2026-09-24** by the fix's cases 3.1 and 3.2, which freeze the trace and failed against the old
order ([`docs/a8/plan.md`](a8/plan.md) § 2.5).

---

<a id="a19"></a>
## A19 — A12's fix shipped behind a criterion that could not detect its own wrong implementation

**Package** core · **Kind** decision · **Status** Open, **decided 2026-09-24: the gate is not
built now**. Not Retired, because the conditions that would reverse it are live, the same way
[D7](#d7) is kept. Opened 2026-09-20. **Feasibility answered 2026-09-23**: no in-repo detector
*for this allocation-shaped defect* exists under the current Jest setup, and a
Node-against-`dist` target would be one. *(Narrowed 2026-09-24. This said "no in-repo detector"
without the qualifier. A GC-forcing retention detector does work in Jest; see "What Jest can
do" below.)* The fix it guarded is [A12](#a12), and that is done

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
3. **It is a new kind of target**, in [F3](#f3)'s and [F4](#f4)'s class. It would need its own
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

**What Jest can do: detect retention.** *(Added 2026-09-24, by [A20](#a20)'s fix.)* The
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
[A8](#a8)'s step 1, [`docs/a8/plan.md`](a8/plan.md) § 2.5.)* One case built its target in the
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
row against the real `EvalResult`. That target is a new kind of gate, a project closer to [F3](#f3)
and [F4](#f4) than to this entry. What remains open here is whether to build it. *(Answered
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

<a id="a20"></a>
## A20 — `EvalService._activeContexts` grows with every distinct `Registry` context

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-24, released 2026-09-26**;
`eval-core` 0.6.0, tagged f26f987, under `CHANGELOG.md`'s `[eval-core 0.6.0]` — recorded 2026-09-23, found while sizing [A8](#a8). **Rescoped 2026-09-24 by [A21](#a21)'s
fix**: wider, because every `EvalContext` enters the set too, and simpler, because the set can
now be deleted

**Fixed** by [`docs/a20/plan.md`](a20/plan.md). The field, both `add`s and the `clear()` are
deleted. The service keeps no reference of its own to a context passed in, and since [A8](#a8)'s
step 2 it keeps no state that could hold one either. Five cases in
`eval.service.memory-leaks.spec.ts` show each context kind being collected by a forced GC, and all
five went red against the old code. The instrument is a `WeakRef`, with `gc` reached through
`v8.setFlagsFromString` and `vm`, so [A19](#a19)'s "Jest has no `global.gc`" is no obstacle for
a retention-shaped defect. A19's own conclusion is unaffected: its defect is shaped by
allocation, not retention. A19's "What Jest can do" records the technique and that distinction.

**The probes found the plan's own criterion backwards.** The draft said case 4, an
`EvalContext`, excluded "narrowing the set to `Registry` instances". Running that
implementation turned cases 1–3 red and left case 4 **green**: a set narrowed to registries
still holds registries. Case 4's real target is the opposite fix, one scoped to A20's title,
which exempts registries and keeps tracking everything else. The plan was corrected in the same
commit. **The practice is worth keeping, not the instance.** It surfaced only because every
wrong implementation was run against every case, and the result was read per case. The suite
did go red under that probe, so "the named wrong implementation makes the suite fail" would
have passed the draft. The same approach found that case 2 is not uniquely load-bearing: its
probe also turns case 4 red. This is `CLAUDE.md`'s "read **which** tests went red", applied to
the criteria and not only to the specs.

**For most contexts, the fix changes nothing a consumer can observe yet.** The plan found this,
and the entry had missed it. A state holds its context, and [A8](#a8)'s `_activeStates` holds
every state `createState` builds. The two sets filled in the same call and drained in the same
`ngOnDestroy`. So almost every context this set held was also reachable through a state, for the
same lifetime. Four of the specs therefore drop A8's references by hand, and a control case
leaves them in place and observes the retention. For these contexts, the benefit arrives with
A8's fix. Without this fix, A8's fix would have left every context that has a `type` alive. A8
records this now, and the control case is the spec its fix turns red. *(Narrowed 2026-09-24 by
A8's step 1, [`docs/a8/plan.md`](a8/plan.md). A8 was split. Its first step released
`simpleEval`'s states, so the two `simpleEval` cases here now run with A8's set intact. The
control goes through `createState`, so it stayed green, and it is A8's step 2 that turns it red.
Contexts passed to `createState` are the ones still waiting.)* *(Closed 2026-09-25 by A8's step 2,
[`docs/a8/step-2-plan.md`](a8/step-2-plan.md). That step deleted `_activeStates`, so every context
passed to `createState` is now collectable once the caller drops the state. The benefit this
paragraph waited for has arrived. **The control case is deleted**, and so is `collect`'s
hand-clear. It was replaced by a positive control, the step's 2.3: a context whose state the test
still holds is not collected. That is what shows the other cases are not vacuous, now that
nothing is held out by hand. Cases 1 and 3 run on the service as it is, as the step's 2.1 and
2.2.)*

**The exception is observable now: `caseInsensitive`.** The plan's draft missed it and the
code-reviewer found it. Under `caseInsensitive`, `fromContext` copies a plain object into a new
`Registry`, and the state holds the copy. `'type' in context` added the caller's object itself.
So a plain object or class instance with a `type`, evaluated case-insensitively, was kept by this
set alone until destroy. It is now collectable with A8 unchanged. The fifth case shows that
without holding anything out, and it is what the `CHANGELOG.md` line is for. A second exception
is contrived: a registry nested under a wrapper's `context` key, where the caller later replaces
the key.

*The rest of this entry is the defect as recorded.*

[A8](#a8)'s shape, on a different field. `EvalService.createState` adds a context to a second
strong `Set`, `_activeContexts`
([`eval.service.ts`](../modules/eval-core/src/lib/actual/services/eval.service.ts)), whenever the
context has a `type` property. `Registry` declares `type = 'Registry'`, so every `Registry` passed
to `createState`, or to `simpleEval` / `simpleEvalAsync` (which call it), is added. A plain
object nested under a `context` key is added too, if it has a `type`. Nothing removes an entry
before `ngOnDestroy`.

**Every `EvalContext` is added too.** *(Added 2026-09-24. The paragraph above names only
registries.)* `EvalContext` declares `type = 'EvalContext'`, so passing one in is enough. That
includes the pattern `eval-signals` documents, `simpleEval(expr, createSignalContext(...))`
([`signal-context.ts`](../modules/eval-signals/src/lib/signal-context.ts)). Each signal context
passed that way is retained, together with its lookup closure and the signal source that closure
reads, until destroy. It also covers `eval-forms`' field contexts, if a caller passes them to
`EvalService`. Observed by A21's case 5, where the context loop called `clear` on an `EvalContext`
subclass, which therefore had to be in the set.

**It grows per *distinct* registry, not per call, unlike A8.** A `Set` dedupes by identity.
Measured against the built bundle: three `simpleEval` calls on one `Registry` left the set at 1,
and a second `Registry` took it to 2. So the growth is in the number of distinct registries an
application creates over its life, and each one is kept with everything it holds. That is less
urgent than A8's per-call growth, and the same defect.

**Never mentioned in this register before today**, although it sits four lines below A8's field
and the two share a method. This is the second time this service's state tracking has hidden a
leak.

**Fix — superseded 2026-09-24. Delete the field, independently of A8.** *Previously*: "The same
shape as A8's. Adopting A8's 'don't keep `simpleEval`'s state' approach should carry
`simpleEval`'s contexts with it." That would have left every `createState` caller's contexts
retained. After [A21](#a21)'s fix (`c86b586`), `_activeContexts` has no use but being emptied in
`ngOnDestroy`. Nothing reads its entries, so it is pure retention. Deleting the field, both
`add`s and the `clear()` fixes every path at once, and it does not need to ride with A8.
**One spec changes with it:**
`eval.service.memory-leaks.spec.ts:76-89` *(as of `cffae78`; deleted by this entry's fix, so no
longer linked)*,
"should track and clean up active contexts", reads the private field and pins that it is
non-empty before destroy. It goes when the field goes. A21's five cases do not read the field and
stay as they are.

*Recorded*: this entry.
*Verified*: source read, and measured 2026-09-23 by a script outside the repository against
`dist/modules/eval-core` built from this branch: set size 1 after three calls on one registry, 2
after a second registry.

---

<a id="a21"></a>
## A21 — `EvalService.ngOnDestroy` empties the caller's own `Registry` contexts

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-23, released 2026-09-26**;
`eval-core` 0.6.0, tagged f26f987 — recorded the same day, found while sizing [A8](#a8). **This destroyed the caller's data. It was not a leak**

**Fixed** by [`docs/a21/plan.md`](a21/plan.md). `ngOnDestroy` no longer calls `clear()` on any
context the caller supplied. It still drops its references, and still drains each state's
stack, trace, hooks and bookkeeping *(until [A8](#a8)'s step 2, which removed that drain: see
the reversal below)*. **The fix removed code and recorded nothing new.** Every
entry in `_activeContexts` was already caller-owned by construction, because `createState` adds
its argument and never what `fromContext` builds from it. So the service-built context the brief
assumed was being drained never was. The plan has the argument. The fix deleted two drains: the
`_activeContexts` loop, and `state.context.clear()` in the per-state loop. The second fired on a
caller's `EvalContext` subclass that declared `clear`, which that loop cleared a second time. Five
cases in `eval.service.memory-leaks.spec.ts` reproduce the table below and went red against the
old code. [A20](#a20)'s retention is untouched, but its fix becomes simpler. A20 says how.

**One caller-owned object is still cleared, on purpose: an `EvalHooks` registry adopted through
`options.hooks`.** It has the same shape as this defect, and the fix considered it and kept it.
This is not a gap A21 missed. It is published behaviour: the `hooks` JSDoc in
[`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts) says
clearing is "the one thing the library does *to* an adopted registry". The eval-core README says
the same, and `eval.service.memory-leaks.spec.ts`'s "should clear a caller-owned registry that
outlives the service" pins it. It also has a reason that contexts lack. A hook's closure usually
captures the state it observes, so a registry that outlives the service keeps dead states and
their AST reachable. And those registrations cannot be dropped selectively. A context holds the
caller's data, which the service has no business emptying. Reversing the hooks behaviour would be
a published change and would need its own entry.

**Reversed 2026-09-25, by [A8](#a8)'s step 2.** Destroy no longer clears any registry.
A21 was right with what it knew then. What changed its premise was A8's step 1, which came after
it. Step 1 released `simpleEval`'s states when the call returned, so destroy could no longer reach
a registry passed only to `simpleEval`. **The clear then depended on the entry point**: the same
registry was cleared if the caller had used `createState`, and not if they had used `simpleEval`.
Step 2 had to decide who owns a `createState` state. It chose the caller, and the service now
keeps no state at all ([`docs/a8/step-2-decision.md`](a8/step-2-decision.md)). That resolves the
asymmetry in the direction A21 itself took for contexts: destroy changes nothing the caller
passed in, whichever method they passed it to.

A21's reason for keeping the clear is still true. A hook's closure usually captures the state it
observes. But what it keeps alive is reachable from a registry the caller holds, and the caller
can release that registry with the unsubscribe `on` returns, or with `hooks.clear()`. The
reversal is a published change, and it has its own record, though not a new entry: A8's step 2
carries it, with `CHANGELOG.md`'s *Changed* and *Upgrading* entries. The spec named above was
inverted to "should not clear a caller-owned registry that outlives the service" (step 2's 2.7).

*The rest of this entry is the defect as recorded.*

`ngOnDestroy` walks [A20](#a20)'s `_activeContexts` and calls `.clear()` on each entry. Those are
objects the caller supplied and may still hold. `Registry.clear()` empties the registry, so when
the root `EvalService` is destroyed, every `Registry` an application ever evaluated against is
emptied under it.

**Observed, not inferred.** Measured 2026-09-23 against `dist/modules/eval-core` built from this
branch:

| Path | Before `ngOnDestroy` | After |
| ---- | -------------------- | ----- |
| `createState(registry)`, then `eval('a * 2', state)` | `20`; `registry.get('a')` is `10` | `registry.get('a')` is `undefined`, and `has('a')` is `false` |
| `simpleEval('a + 1', registry)` three times | `registry.get('a')` is `10` | `undefined` |
| `createState({ a: 10 })`, a plain object | — | `obj.a` is still `10`; untouched |

**It fires on the documented `createState` path, not only through `simpleEval`.** So **A8's
retention fix does not fix this.** Dropping `simpleEval`'s contexts from the set leaves every
`createState` caller's registry registered, and emptied at destroy. The fix here is to stop
clearing objects the caller owns, not to stop keeping them.

**Filed apart from [A20](#a20) on purpose.** One is retention and the other is data loss. They
differ in urgency and in fix, and filing both under one title is how [A8](#a8) spent a year inside
a commit called "Memory Leak Fixes (5/6)".

**What was not measured.** Whether any real consumer destroys the root injector while holding a
registry it goes on using. That happens in tests, in SSR per request, and in micro-frontend
teardown, but it was not observed in any consumer, and nothing in this repository's downstream
libraries passes a `Registry` to `EvalService`.

*Recorded*: this entry.
*Verified*: observed 2026-09-23 by a script outside the repository, as tabled above.

---

<a id="a22"></a>
## A22 — Five memory-leaks cases assert nothing about memory

**Package** core · **Kind** test gap · **Status** **Retired — consolidated 2026-09-26** —
recorded 2026-09-25, found by the code-reviewer on [A8](#a8)'s step 2

**Consolidated, not removed.** "`ngOnDestroy` does not throw" still guards something: a drain
reintroduced without its per-state `catch`, which is [A17](#a17)'s history. Five copies spread
across unrelated cases were noise. **One is kept**, in "should handle repeated async
evaluations, then destroy without throwing". None of the five used hooks or an adopted registry.
All five evaluate against a `Registry`. The async case is the only one whose states are written
again when the promise settles, the shape [A8](#a8)'s plan (§ 1.5) found a racing drain could
corrupt. So it is the richest state shape the five exercise.

The other four lost their destroy calls. Three were retitled to what they test:

| Was | Now |
| --- | --- |
| "should handle repeated evaluations without memory accumulation" | "should evaluate repeatedly against a changing registry" |
| "should clean up complex nested object evaluations" | "should read a deeply nested object" |
| "should handle large arrays without memory leaks" | "should read the length of a large array" |

The fourth, "should handle objects with many properties", kept its title and lost a comment
calling it a memory-leak test. The `describe` "Repeated Operations Memory Stability" became
"Repeated Operations".

**What the kept guard adds is narrow.** Probed with an `ngOnDestroy` that throws every time: 436
of 1074 `eval-core` cases failed, because TestBed's teardown destroys the service. So the kept
case earns its place only against a drain that throws on some state shapes and not others.
A17's own case, a drain reaching caller-owned objects, needs no new fixture: 2.4–2.8
(`docs/a8/step-2-plan.md`) each destroy with a caller-held state or registry. A drain that
mutates it breaks their assertions, and step 2's probe table shows this for P0 and P2. A drain
that throws on it fails their unguarded `ngOnDestroy()` call.

*The rest of this entry is the gap as recorded.*

Five cases in `eval.service.memory-leaks.spec.ts` sit under "Repeated Operations Memory
Stability" and "Large Data Handling":

- repeated evaluations;
- repeated async evaluations;
- complex nested objects;
- large arrays;
- objects with many properties.

Each evaluates, checks the result, and then calls `service.ngOnDestroy()`. Three do it inside
`expect(...).not.toThrow()`, and two do it bare, under `// Should clean up without issues`. Their
titles say "without memory accumulation" and "without memory leaks". **Nothing in them observes
memory.** Their result assertions are real, and duplicate what other specs cover. The destroy call
was always weak evidence: `ngOnDestroy`'s drain swallowed every throw in a per-state `catch`.
Since A8's step 2, `ngOnDestroy` is a single assignment, so that part now tests nothing at all.

**Not changed by that step, on purpose.** `CLAUDE.md` forbids weakening or deleting an existing
assertion without asking. Nor was this one of the cases the step's brief named. Options:

- retitle them, and drop the destroy call and its claim;
- replace them with retention cases on A20's `WeakRef` instrument;
- delete them as duplicates of the result assertions elsewhere.

*Recorded*: this entry. *Verified*: source read, 2026-09-25, at the working tree of A8's step 2
(`eval.service.memory-leaks.spec.ts:430-510`).

---

# B. `eval-core` — security and hygiene

<a id="b1"></a>
## B1 — The primitive carve-out in `member-expression.ts`

**Package** core · **Kind** decision, then fix · **Status** Open, Covered

Surfaced while checking GHSA-pj3p-xpg7-h7gw (reported against the sibling `jse-eval`) against
this repo. The advisory itself does not apply — see [`SECURITY.md`](../SECURITY.md), "Reviewed
External Advisories" — but the check walked the surrounding guard and found this.

**Status: not exploitable as far as probed. Not cleared.** No escalation was found; that is not
the same as none existing, and the probing was one session's worth against one threat model.

**What it is.** Both dangerous-property checks in the member visitor
([`:144`](../modules/eval-core/src/lib/internal/visitors/member-expression.ts#L144) and
[`:188`](../modules/eval-core/src/lib/internal/visitors/member-expression.ts#L188)) are gated on
`!isPrimitive`, so when the receiver is a string, number or boolean the blocklist is skipped
entirely. `"abc".constructor` therefore returns the real `String` function.

**Why deleting the gate is not the fix.** The blocklist holds `toString`, `valueOf` and
`hasOwnProperty`, which are ordinary reads on a primitive. Enforcing it there would refuse
`s.toString()`. Worse, simply removing `!isPrimitive` does not narrow the carve-out at all — it
removes primitive member access outright, because `safeGetProperty` returns `undefined` for any
target that is not an object or a function *before* it consults the blocklist, so
`s.toUpperCase` becomes `undefined` rather than blocked (confirmed by probe). A fix has to keep a
primitive read path and enforce a subset of the blocklist on it.

**Probe results, so nobody re-derives them.** Against `{ s: 'abc', n: 1, b: true }`:

- `s.constructor` → the `String` function. Likewise `n.constructor` → `Number`,
  `b.constructor` → `Boolean`.
- `s.constructor.call` → `Function.prototype.call`, and it is callable —
  `s.constructor.call(null, "hi")` → `"hi"`. This is the one hop past the constructor that is not
  on the blocklist. `this` is the `String` function, so it yields a string.
- `s.constructor.constructor` → **throws**. So does `s.constructor.prototype`,
  `s.constructor.__proto__`, `s.constructor.call.constructor`, `s.trim.constructor` and
  `s.sub.constructor`.
- Every escalation tried dead-ends at hop 2, and by the same mechanism: the receiver is then a
  plain function, not a primitive, so the read goes through `safeGetProperty`, which does enforce
  the blocklist.
- A second, independent barrier sits behind that one: the case-insensitive lookup block is gated
  on `typeof obj === 'object'`, and functions are not. So no case variant reopens the chain —
  `s.constructor.CONSTRUCTOR`, `s.constructor.PROTOTYPE` and `s.trim.CONSTRUCTOR` all resolve to
  `undefined` under `caseInsensitive: true`. This barrier is incidental rather than designed,
  which is a reason not to lean on it.

**Covered, not fixed.** `eval.service.primitive-carve-out.spec.ts` pins the boundary in both
directions. Confirmed load-bearing: skipping the carve-out reddens the first two blocks,
extending it to function receivers reddens the third. A fix is expected to change its first
`describe` block and leave the other two intact.

Behavioural — anything reading `s.constructor` today starts throwing.

*Recorded*: [`SECURITY.md:432`](../SECURITY.md).
*Verified*: source read, 2026-09-06.

<a id="b2"></a>
## B2 — `pattern.ts:83` logs the whole `EvalState`

**Package** core · **Kind** fix · **Status** **Retired — fixed** — Phase 2 step 0, 2026-09-11; released in
`eval-core` 0.4.0

**Fixed.** The call is gone and the throw now reads
`` `${pattern.type} is not supported as a binding target.` `` — the node type being the only part
of the old argument list a caller could act on. Deleting it left `st`, `callback` and `arg`
unused, so `evaluateMemberExpression` is down to its one remaining parameter; it is
module-private and both call sites are in `pattern.ts`, so nothing outside the file moved. **Not
behavioural** — the branch is unreachable, per the three checks below, which is why the count of
`console.*` reaching the bundle drops from four to three without a consumer seeing anything.

Detector: `pattern.spec.ts`'s `MemberExpression` fixture, which asserts the message *and* spies
on `console.log`. Reverting both halves reddens that one case and nothing else.

**The remaining three are [B3](#b3)**, and this entry closing does not close that one.

---

The defect, as it stood:

`eval-core` has ~20 `console.*` calls in source. Most are unreachable and tree-shaken; **four
reach the published FESM bundle**, verified by building and grepping
`dist/modules/eval-core/fesm2022/`. This entry was one of them; the other three are [B3](#b3).

[`pattern.ts:83`](../modules/eval-core/src/lib/internal/visitors/pattern.ts#L83) is
`console.log(pattern, st, callback, arg)`, inside `evaluateMemberExpression`, guarded by
`if (pattern.type === 'MemberExpression')`, and the *next* line is
`throw new Error('evaluateMemberExpression is not implemented.')`. So it is not per-node work:
`performance.spec.ts` is not the gate for it and there is no cost to recover.

**It is currently unreachable**, which is what decides its priority. Three checks:

- `evaluateMemberExpression` is reached only through `evaluatePatterns` / `evaluatePattern`, and
  the only caller of either inside the library is `arrow-function-expression.ts:15`, on an arrow
  function's parameter list.
- A `MemberExpression` is not a valid binding target in a parameter list, so acorn rejects every
  form of it — `(a.b) => 1`, `({x: a.b}) => 1`, `([a.b]) => 1`, `({...a.b}) => 1` — with
  `Assigning to rvalue`, at `ecmaVersion` 2020 (this library's default), 2022 and `latest`.
- Neither function is exported from the built package, so a consumer cannot call them directly to
  route around the parser.

*Were* it reachable it would be a **disclosure**, not a hygiene item: the second argument is
`st`, the whole `EvalState` — the call would dump the caller's entire evaluation context to the
console of any application whose user wrote that pattern.

**Phase 2 is what makes it live.** Statement support brings destructuring declarations
(`let [a, b] = c`, `let {x} = o`) and assignment destructuring, where a `MemberExpression` target
*is* legal — `[a.b] = arr` parses. If that work routes through `pattern.ts`, this branch becomes
reachable with a state dump already in it. **Delete it ahead of any code that widens what reaches
these functions**, not as a floating cleanup.

Scope: delete the call and fold anything worth keeping into the throw's message; the node type is
the only part a caller could act on. Not behavioural — the one call that could expose anything
cannot currently run.

*Verified*: source read, 2026-09-06. *Fixed*: 2026-09-11, Phase 2 step 0.

<a id="b3"></a>
## B3 — Two service-layer `console.*` calls reach the published bundle

**Package** core · **Kind** decision · **Status** Open — **one, since 2026-09-24**; two since
2026-09-23

| Site | Call |
| ---- | ---- |
| [`parser.service.ts:67`](../modules/eval-core/src/lib/actual/services/parser.service.ts#L67) | `console.debug('Parser cache cleared…')` |
| ~~`eval.service.ts:89`~~ | ~~`console.warn('Error cleaning up EvalState:', error)`~~ *(deleted 2026-09-24, below)* |

**The `ngOnDestroy` site is decided: deleted, and the `catch` is now silent.** [A8](#a8)'s
step 1 did it, as the last paragraph here asked ([`docs/a8/plan.md`](a8/plan.md) § 2.1). It did
not qualify for the `isDevMode()` carve-out. After [A17](#a17)'s reorder, only the two drains
that reach a caller's object can throw: a frozen trace, or a registry whose `clear` throws. A
throw costs only that object. The carve-out is for a misuse that harms something the caller
could not have caught. The `catch` stays so that one state cannot stop the rest being drained.
One case asserts that no warning is logged. It failed against the old warn, and against a warn
guarded by `isDevMode()`, since Jest runs in dev mode. **`parser.service.ts:67` is still open.**
It is in a `setInterval` callback, not `ngOnDestroy`, so the A8 step left it alone.

**The silent `catch` is gone too, removed 2026-09-25 by [A8](#a8)'s step 2 before it shipped.**
That step deleted the drain loop it sat in: the service keeps no state, so `ngOnDestroy` drains
nothing and nothing in it can throw. The case asserting no warning was deleted with the loop,
since nothing is left that could log. What ships is the same for this entry: `ngOnDestroy` does
not call `console.*`. The count below is unchanged.

The third, `console.warn('Error cleaning up Context:', error)`, guarded `ngOnDestroy`'s loop that
cleared each tracked context. [A21](#a21)'s fix deleted that loop, since it emptied the caller's
registries, and the call went with it. That was not clean-up in passing: the call had nothing
left to guard.

**How the published bundle's count moved.** *(Moved here 2026-09-25 from `CLAUDE.md`, which now
keeps only the rule, the current count and where the calls are tracked.)* Four calls survived
tree-shaking when this register was opened. [B2](#b2)'s `pattern.ts:83` state dump was the
fourth, and Phase 2 step 0 deleted it: three. A21's fix deleted the context loop's warn: two.
A8's step 1 deleted `ngOnDestroy`'s remaining warn: one, `parser.service.ts:67`. Counted
2026-09-25 in the built `fesm2022` bundle, not in source. Source then held thirteen calls, and
tree-shaking removes the rest. [B4](#b4)'s deletion of the dead component took one of them,
`eval-core.component.ts:7`, which was never in the bundle: **twelve** in source since 2026-09-26
(eleven in `memory-manager.ts`, one in `parser.service.ts`), by grep, and still one in the bundle.

*As recorded, before the `ngOnDestroy` site was decided above; it now applies to
`parser.service.ts:67` alone.* Decide whether these become the `isDevMode()` carve-out
(`CLAUDE.md`, Conventions), a no-op, or stay. Not behavioural. Note the `eval.service.ts` call sits inside `ngOnDestroy`'s cleanup
loop, which is the same method [A8](#a8) touches — if A8 is fixed, revisit it in the same
step rather than separately.

<a id="b4"></a>
## B4 — `eval-core.component.ts` is dead generator scaffold

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-26**; no published artifact
changed

`modules/eval-core/src/lib/eval-core/` held an empty `EvalCoreComponent` plus a stray `ngEval()`
that parsed `"1 + 1"` and logged the result. Nothing imported it but its own spec, and it was
**not** in the FESM bundle, so this was dead source rather than a published-surface problem. It
carried a template, a stylesheet and a spec with it — four files.

*Fixed* 2026-09-26: the directory deleted, all four files. *Verified*:
`grep -rn "EvalCoreComponent\|ngEval\b\|eval-core.component" modules/` finds nothing; `eval-core`'s
tests went from 1074 to 1073 in 58 suites, down exactly the spec's one case and one suite. **The
"not in the bundle" claim held**: the built `fesm2022` bundle, its source map and the `.d.ts` are
byte-identical to a build of the parent commit, and neither build names the component, `ngEval` or
its selector. The `console.log` at `eval-core.component.ts:7` went with it — see [B3](#b3) for the
source count.

---

# C. `eval-signals`

None of these three was ever recorded in `ROADMAP.md`.

<a id="c1"></a>
## C1 — A member-target write escapes the read-only policy

**Package** signals · **Kind** decision · **Status** Open, Covered

The most serious unlisted behavioural entry in the repository.

`assignment-expression.ts` and `update-expression.ts` each have a second branch,
`node.left.type === 'MemberExpression'`, which writes with `safeSetProperty(object, key, value)`
and never touches the `EvalContext`. Reproduced end-to-end:

```ts
createEvalSignal('user.name = "Bob"', { user: signal({ name: 'Ada' }) })
// no throw, returns 'Bob', and user() is now { name: 'Bob' }
createEvalSignal('user.n++', { user: signal({ n: 1 }) })
// no throw, and user() is now { n: 2 }
```

This is a write *through* a signal-backed key rather than *to* one, which is why § 3.6's wording
("a write to a signal-backed key") does not reach it. Two things make it a genuine open problem
rather than a wording nicety: it is a mutation performed from inside a `computed()`, and it lands
in **data this library does not own** — the object the consumer's signal holds — so it is **not
containable at the `EvalContext`** the way every other instance of this shape is.

**The chokepoint framing, added 2026-09-11 while planning Phase 2.** `eval-signals` enforces its
read-only policy in exactly one place: it subclasses `EvalContext` and overrides `set` to throw
([`signal-context.ts:112-117`](../modules/eval-signals/src/lib/signal-context.ts#L112-L117)). So
`EvalContext.set` is the **single policy chokepoint**, and this entry is definitionally *the class of
write that never enters it* — `safeSetProperty` writes the resolved object directly and no context
method is called. That is a harder question than "stop this write": there is nothing to override,
and the three mechanisms below are each an attempt to *reach* a write that bypasses the chokepoint
rather than to tighten one that passes through it.

Two consequences worth having recorded. A fix that adds a check to `EvalContext` cannot work, by
construction. And the sibling defect — [`statements/phase-2-plan.md` § 1.4](statements/phase-2-plan.md),
an identifier write reaching the caller's object because `set` consults no scope — is *not* this
entry: it goes **through** the chokepoint and lands on the wrong target, which is why Phase 2 can fix
it and cannot fix this one. Phase 2 § 3.2 preserves the chokepoint deliberately: its `setInScope`
returns false unless a pushed scope already binds the key, so every write that targets the source
still reaches `set`.

Three candidate mechanisms, none costed:

- a static AST check at `createEvalSignal` — shares its cost with [C2](#c2), catches it before the
  first read, but the guard then does not exist for `createSignalContext` used standalone;
- freezing or wrapping the resolved value — per-read cost, and it changes what an expression
  observes;
- documenting it as a limitation, the way the escaping-closure residual of [A9](#a9) is.

**Covered**: the runtime behaviour is pinned by spec, so whichever way this goes, the change is
visible.

*Recorded*: [`signals/phase-3-plan.md` § 3.6.4 gap 1](signals/phase-3-plan.md) and
[§ 8 q6](signals/phase-3-plan.md).

<a id="c2"></a>
## C2 — Detect a write violation at construction rather than at first recompute

**Package** signals · **Kind** decision · **Status** Open

Because the violation is *static* (`count = 5` is illegal on every recompute with every dataset),
it could be found by inspecting the AST for `AssignmentExpression` / `UpdateExpression` nodes at
`createEvalSignal` time and failing there, instead of on the first read. Strictly earlier and
strictly more informative.

It is **not** a replacement for the runtime throw: the `EvalContext.set` override is the
correctness guarantee and covers a context reached by any route, including `createSignalContext`
used standalone with `EvalService`.

Cost: it needs the AST, and § 5 currently admits only `CompilerService.compile`, which returns a
`stateCallback` closed over the AST rather than the AST itself.

Decide with [C1](#c1) — the static-check mechanism is one of C1's three candidates, so deciding
C2 alone forecloses the cheaper half of C1.

*Recorded*: [`signals/phase-3-plan.md` § 8 q5](signals/phase-3-plan.md).

<a id="c3"></a>
## C3 — Whether `eval-signals` should work around [A4](#a4) locally

**Package** signals · **Kind** decision · **Status** Open — **decision point passed unrecorded**

A containment for [A4](#a4)'s `lookups` divergence exists entirely inside this library: override
`getKey` on the adapter's subclass to fall back to the source, reusing `resolve()`.

It was **not** taken in Phase 3 step 2, for a stated reason: `getKey` also feeds
`EvalReadEvent.key`, which is what step 3's `dependencies` set reports, so changing it there would
silently change step 3's output. § 8 q3 was therefore **reopened and assigned to step 3**, "with
the two consumers on the table together".

**Step 3 never recorded an answer.** [`signals/step-3-summary.md` § 5.3](signals/step-3-summary.md)
carries it forward under "still carried from earlier steps", and all six Phase 4 summaries inherit
that phrasing. There is no settlement in the plan's step 3 section either. The decision point
passed and the question is still open — logged here so it is not inherited a seventh time.

*Recorded*: [`signals/phase-3-plan.md` § 8 q3](signals/phase-3-plan.md).

---

# D. `eval-forms`

<a id="d1"></a>
## D1 — The throwing-subscriber premise is false in both halves

**Package** forms · **Kind** fix + decision · **Status** Open, Premise retired

**The premise.** Four places in `eval-forms` state that a throw inside the `group.events`
subscriber "unsubscribes it and silently ends all diffing for the life of the form".

**It is false in both halves**, measured against this repo's `rxjs@7.8.2` with the same pipeline
shape `createControlSource` uses — a `Subject` exposed through `asObservable()`, piped through
`takeUntil`, with a function next-handler:

```
next(1) returned normally to the caller
closed after 1st throw: false | handler calls: 1 | observers: 1
closed after 2nd throw: false | handler calls: 2 | observers: 1
ASYNC UNHANDLED: boom  (x2)
```

RxJS 7's `ConsumerObserver` catches the handler's throw and re-reports it through
`reportUnhandledError`, **asynchronously**. The subscription stays open, later emissions are still
delivered, and in an Angular application the error reaches the unhandled-error path. So the
failure is *loud and non-fatal*, not *silent and terminal* — the opposite of the premise on both
axes.

**The four sites**, all stating it as established fact, all verified still present 2026-09-06:

- [`control-source.ts:165`](../modules/eval-forms/reactive/src/lib/control-source.ts#L165) — the
  own-property read in `sync`.
- [`field-schema.ts:199`](../modules/eval-forms/reactive/src/lib/field-schema.ts#L199) —
  `validate`'s group loop.
- [`control-source.spec.ts:409`](../modules/eval-forms/reactive/src/lib/control-source.spec.ts#L409)
  — the prototype-name removal case. This comment **already measured something that does not fit
  it**: it goes on to record that "the throw lands in that key's own subscriber and not back in
  `sync`, so the diff loop itself survives". The contradiction was sitting in one comment and was
  not read as one.
- [`forms/phase-4-plan.md:1438`](forms/phase-4-plan.md) — and it cites "§ 3.5.5" as the source,
  which does **not** contain the claim. The citation is what made it look settled.

**This is not a comment fix.** The premise is load-bearing for a shipped design decision:
enforcement is construction-time only, and `validate` is not re-run for a control added later,
*because* throwing from the diff was held to be unavailable. If a throw there is merely reported
and diffing continues, that argument no longer decides the question, and the alternatives reopen —
reject a late `addControl` from the diff, surface it through a channel the consumer can observe,
or keep the current behaviour on a different and stated ground (a throw cannot un-add the control,
and it fires far from the call that caused it, which may well still be decisive).

Scope: correct the four sites; decide the question again on the real behaviour and record which
ground it now rests on; and add a spec that pins what actually happens when the diff throws, since
none exists — the case above pins the *symptom* the guard prevents, not the subscriber's fate.
Behavioural if the decision changes, documentation-only if it does not.

<a id="d2"></a>
## D2 — Should `/reactive` reject prototype-shadowed identifiers in expressions too?

**Package** forms · **Kind** decision, **breaking** · **Status** Open

**The asymmetry, as it now ships.** `@zvenigora/ng-eval-forms/signals` walks every expression at
registration and throws on any `Identifier` whose name is an own property of `Object.prototype` —
`constructor`, `toString`, `valueOf`, `hasOwnProperty` and the other eight. `/reactive` does not:
its two **prototype-name** checks (`reactive/src/lib/field-schema.ts:172-178` over the schema's
field names, `:214-220` over the group's controls) inspect **names**, never expressions — and
neither do the other two construction-time rejections that entry point makes. So
`{ name: 'city', visible: 'constructor' }` throws under `/signals` and, under `/reactive`, binds
cleanly and renders a field that has no data — because the identifier resolves off
`Object.prototype`, a function is truthy, and truthy means visible.

One authored rule string, two behaviours, and the silent one is the unsafe one. Shipped knowingly
because the alternative was leaving both entry points silently wrong.

**Why it is not a bug fix.** `/reactive` is released and an expression that registers today would
start throwing. That needs three things a docs step cannot supply: a phase, a major-version
decision, and a migration note for a consumer whose form genuinely has a field named
`constructor`.

**What a phase would have to settle:**

- **Where the check runs.** `/signals` guards between `parse` and `compile` inside its own
  registrar. `/reactive` compiles inside `bindFieldProperties`, so the natural site is there —
  a fifth construction-time rejection beside the four the README documents.
- **Whether the residual is acceptable at both.** A *member* expression — `user.constructor` — is
  `eval-core`'s prototype-pollution guard and not this check's business at either entry point, and
  [B1](#b1)'s carve-out applies. A check that rejects the bare identifier and passes the member
  access is the same shape at both, and is worth stating rather than discovering. **The answer
  here has to be the same sentence at both entry points**, which is what ties this entry to
  [B1](#b1).
- **Whether the deliberate over-rejection ports.** `/signals` rejects a name an expression *binds*
  itself — `'[1].map(valueOf => valueOf)'` throws — because a scope-aware guard would be a second
  copy of `eval-core`'s frame logic. The same reasoning applies unchanged at `/reactive`, but it
  is a false positive that a released entry point would be *acquiring* rather than shipping with.
- **The migration note.** The fix for a real `constructor` field is renaming the model key, which
  a consumer may not control if the schema arrives from a server. Whether that is a rename, an
  escape hatch, or an accepted break is the substance of the decision.

Scope if taken: the guard is already written and module-private to `/signals`
(`signals/src/lib/guard-identifiers.ts`), so the mechanism is a **move** rather than a design. The
work is the version decision, the migration note, and the `acorn-walk` peer already being
declared.

*Recorded*: [`forms/phase-6-plan.md` § 3.8 and § 3.8.1](forms/phase-6-plan.md);
[`forms/phase-6-step-6-summary.md` § 4.4](forms/phase-6-step-6-summary.md).

**Numbering note.** The roadmap entry this replaces called this "a Phase 8 question", while
`eval-forms`' README and `CHANGELOG.md` both say only "a later major". No Phase 7 or Phase 8
section exists in `ROADMAP.md` — see [E1](#e1). The consumer-facing wording is deliberately
vaguer; this file is the single source for the commitment.

<a id="d3"></a>
## D3 — Per-registration `caseInsensitive` reaches one of three levers

**Package** forms · **Kind** decision · **Status** Open, Covered

`ExpressionRuleOptions` arrives twice: at `createExpressionRules(model, options)` and at each
`rules.evalVisible(path, expression, options)`. **The rule is registration wins, per key** —
`rule?.eval ?? factory?.eval`, resolved independently.

**That rule is exact for `onError` and partial for `eval.caseInsensitive`, and the gap is a wrong
answer rather than a missing feature.** The memo has one lifetime — per factory — so
`createModelSource(model, options?.eval)` runs once and `readProperty`'s `caseInsensitive` is fixed
there. A registration supplying a different one moves exactly **one of the three** places it has
to reach:

| Place | Built from | Reached by a per-registration `eval.caseInsensitive`? |
| ----- | ---------- | ---------------------------------------------------- |
| the walk's options — `evaluateRule`'s third argument | the resolved per-rule options | **yes** — corrects *property* names |
| the rule's context — `createFieldContext({}, {}, options)` | the **factory's** `eval` | **no** — inert either way, both sources are `{}` |
| the factory's memo — `readProperty` | the same factory parameter | **no** — and this is the resolver that answers every identifier here |

So `rules.evalVisible(p.city, 'Country === "US"', { eval: { caseInsensitive: true } })` against a
factory built without it, and a model holding `country`, resolves `Country` to `undefined` while
correcting every *property* name in the same expression. One expression, two casing rules, no
error.

**Decision taken in Phase 6: no throw, documented, fix deferred.** Rejecting a divergent
registration was the alternative and was rejected on two grounds: it enumerates one key of an open
set (`EvalOptions` is `Record<string, unknown>`, so any later option with factory reach recreates
the gap), and it fires at the wrong time with the wrong blast radius (registration runs inside the
schema body during `form()`, so the throw takes down the entire form over one rule's casing, and
it is unreachable through `onError`).

**The real fix makes the gap unreachable rather than loud.** Two shapes, and the count above
decides which is cheaper: move `caseInsensitive` onto `createExpressionRules`' own signature, where
it already effectively lives — **the cheaper one, since two of the three levers are already
factory-bound** — or key the memo on `(key, caseInsensitive)` and give up "one computed per key per
factory". Both change something § 3.6 or § 5 of the Phase 6 plan states.

**Covered** by a characterisation case in `rules.spec.ts`: this is behaviour that is wrong and
shipping, so the spec records the limitation and goes red if a later change to the memo's lifetime
silently reverses it.

*Recorded*: [`forms/phase-6-plan.md` § 3.5.3](forms/phase-6-plan.md).

<a id="d4"></a>
## D4 — A top-level model key holding a signal is returned un-called

**Package** forms · **Kind** fix or doc · **Status** Open, partly documented

Upstream's lookup is `resolve(...)` then `isSignal(value) ? value() : value`
([`signal-context.ts:200`](../modules/eval-signals/src/lib/signal-context.ts#L200)); this adapter's
is `keySignal(key)()` with no `isSignal` step
([`model-source.ts:131-146`](../modules/eval-forms/signals/src/lib/model-source.ts#L131-L146)). So
`model = signal({ ready: signal(false) })` resolves `ready` to a truthy function here and to
`false` through `/reactive`.

Near-unreachable for Signal Forms, whose models are plain data.

**Partly discharged.** [`README.md:661`](../modules/eval-forms/README.md#L661) documents the shape,
but attributes it to "the member visitor" — which is the *nested* read mechanism
(`{ user: { name: signal('a') } }`), not this one. For a top-level key no member visitor is
involved: `keySignal('ready')()` returns the inner signal function directly. The README also does
not state the `/reactive` divergence, which is the part a consumer moving between adapters would
hit. Either correct the attribution and add the divergence, or add the `isSignal` step.

*Recorded*: [`forms/phase-6-step-2-summary.md` § 5.2](forms/phase-6-step-2-summary.md).

<a id="d5"></a>
## D5 — Two dead lookups run ahead of ours on every resolution

**Package** forms · **Kind** fix (perf) · **Status** Open

`createFieldContext({}, {}, …)` pushes two resolvers over empty records, and under
`caseInsensitive` each allocates an `Object.keys({})` per key **per node**. Plan-mandated (Phase 6
§ 5 authorises `createFieldContext`, not `createSignalContext`), construction is per rule per
`form()`, and the cost is small.

The only per-node-cost entry in this file, so it is the only one `internal/performance.spec.ts` is
the gate for.

*Recorded*: [`forms/phase-6-step-2-summary.md` § 5.2](forms/phase-6-step-2-summary.md).

<a id="d6"></a>
## D6 — `/signals` diverged from upstream on non-string keys

**Package** forms · **Kind** fix · **Status** **Retired — fixed 2026-09-26**; ships with the next
`eval-forms` release

*Filed as* "The `typeof key === 'string'` guard is unfalsifiable by the suite". The guard was
falsifiable; the suite just had no case that reached it.

`/signals`' model lookup (`model-source.ts`, in `createRuleContext`) passed a string key to the memo
and resolved anything else `undefined`. A non-string does reach it: `this` evaluates to the context
itself, and `member-expression.ts` hands the context a computed key raw, so `this[42]` asks the
lookup for the number `42`. Upstream's `resolve` (`eval-signals`' `signal-context.ts:127-144`)
finds it — `hasOwnProperty` coerces the number to `"42"` — and runs its case-variant fallback for
strings only, so it never throws. `/reactive` inherits that lookup. So `this[42]` against a model
holding `"42"` gave the value through `/reactive` and `createSignalContext`, and `undefined` through
`/signals`.

*Fixed* 2026-09-26: a number key resolves through `keySignal(String(key))`, so `this[42]` and
`this["42"]` read one memo entry and agree with upstream; string keys are unchanged; anything else
still resolves `undefined`. `readProperty` keeps `key: string`. **One divergence is kept, not
matched**: upstream would find a *symbol*-keyed own property on its source, and `/signals` resolves
every symbol `undefined`. The comment at the lookup says so. *Covered*: `model-source.spec.ts`,
"non-string keys", four cases, each comparing `/signals`' result with `createSignalContext` walked by
`eval-core` over the same values, and naming the value too. The memo-sharing case counts `model()`
reads through a `Proxy` on the model signal — one per memo entry — with a two-key calibration arm
that reads 2. Probed:

| Implementation | number key held | same, `caseInsensitive` | absent, `caseInsensitive` | one memo entry |
| -------------- | --------------- | ----------------------- | ------------------------- | -------------- |
| the original guard | **red** (`undefined`) | **red** (`undefined`) | green | **red** (value differs from upstream) |
| bare cast, no `String()` | green | green | **red** (`TypeError`) | **red** (2 reads, not 1) |

The rest of the `eval-forms` suite stayed green under both probes. *Changelog*: `[Unreleased]`.

*The premise as filed, **measured false** 2026-09-26*: "Removing it changes no observable:
`readProperty(model, 42, …)` returns `undefined` anyway and a `Map` entry under a non-string key is
unreadable." `readProperty`'s `hasOwnProperty` finds `"42"` from `42`, and its case-variant fallback
calls `key.toLowerCase()` without checking the type. Measured through the walk, with the guard and
with it replaced by a cast:

| `this[42]`, model | with the guard | cast, no guard |
| ----------------- | -------------- | -------------- |
| holds `"42"` | `undefined` | `"forty-two"` |
| lacks `"42"`, `caseInsensitive` | `undefined` | throws `TypeError: key.toLowerCase is not a function` |

The suite of 251 stayed green under the cast, so "unfalsifiable *by the suite*" was true. What made
the guard look like belt and braces was the gap in the suite, not the code.

*Recorded*: [`forms/phase-6-step-2-summary.md` § 5.2](forms/phase-6-step-2-summary.md).

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
direct consequence of choosing a live source. Related to [D4](#d4), which is the same diagnostic
failing to reach `/signals` for a different reason.

*Recorded*: [`forms/phase-4-plan.md` § 3.5.6](forms/phase-4-plan.md).

<a id="d9"></a>
## D9 — § 3.4.3's precedence rule is untested end to end

**Package** forms · **Kind** test gap · **Status** **Retired — premise false: covered end to end
since 7fbef49; the `caseInsensitive` pair added 2026-09-27, test only**

**The premise was false when it was filed.** `field-context.spec.ts`'s `precedence` block, added by
`7fbef49` (Phase 4 step 2, 2026-08-17), already walked the rule end to end. It builds
`createFieldContext` with a non-empty field source and evaluates it through `eval-core`'s
`simpleEval`. "Should resolve a colliding key to the field" asserts that the field wins a collision,
and "should resolve a form key through the pushed lookup" asserts a form-only key over a non-empty
field source. "End to end" in the step-4 note meant *through a `/reactive` binding*, which no path
produces, and not *through the evaluator*, which was covered. The probe below shows those older
cases were load-bearing.

**Added 2026-09-27**: the one leg the older cases did not reach, `caseInsensitive` with the key
spelled differently from the expression. `field-context.spec.ts`, "precedence under
`caseInsensitive`", two cases. In the collision the *form* holds the expression's exact spelling
and the field does not, so the field wins by layer and not by exact match. Both cases carry a
calibration arm without the option, which shows the spelling differs enough that only the
correction finds the key. No published artifact changed.

**Two layers of three.** The third, an `Object.prototype` name resolving through the empty
`original` ahead of both sources, is upstream's (`eval-signals`' `createSignalContext` and
`eval-core`'s `EvalContext.get`), as `field-context.ts`'s own comment records. It is named here and
not tested.

*Probed* by installing the form half first (the two `createSignalContext` calls in
`field-context.ts` swapped), against the whole `eval-forms` suite, then reverted:

| Case | Since | form half first |
| ---- | ----- | --------------- |
| should resolve a colliding key to the field | `7fbef49` | **red** (`"form"`) |
| should show the form value once the field key is removed | `7fbef49` | **red** (`"form"`, on the first assertion) |
| should give precedence back to the field when its value appears | `7fbef49` | **red** (`"form"` after the field value appears) |
| should fall through to the form value for a field key holding undefined | `7fbef49` | green: the form wins it under either order |
| key in both sources → field, `caseInsensitive` | 2026-09-27 | **red** (`"form"`, on the main assertion; calibration arm green) |
| key only in the form source → form, `caseInsensitive` | 2026-09-27 | green |

Nothing else in the suite moved: 4 red of 257.

**The entry as it stood:**

**Status** Open, Premise retired

The three-layer precedence rule (field keys win) has no end-to-end coverage.

**Premise retired — the prediction was wrong.** Phase 4 step 4 recorded that this "stays so until a
phase has a consumer for a field-local key — the `/signals` adapter is the likely one, and it is
additive: a second argument that stops being `{}`."

`/signals` shipped and did **not** discharge it. It calls `createFieldContext({}, {}, options)`
([`model-source.ts`](../modules/eval-forms/signals/src/lib/model-source.ts)) — both sources empty,
deliberately, because the class is what it wants and not the sources. So the second argument never
stopped being `{}`, no consumer for a field-local key exists, and the gap is unchanged with no
candidate phase behind it.

Whoever closes this writes the fixture rather than waiting for a consumer to arrive.

*Recorded*: [`forms/step-4-summary.md` § 5.2](forms/step-4-summary.md).

<a id="d10"></a>
## D10 — `applyErrorPolicy` has no runnable README block

**Package** forms · **Kind** docs · **Status** **Retired — fixed**,
[`docs/gates/plan.md`](gates/plan.md) step 5, 2026-09-09

> **What shipped.** A `ts` block in `modules/eval-forms/README.md`'s
> [When a rule fails](../modules/eval-forms/README.md) section showing the default, an explicit
> `'undefined'`, a mapping function, the no-throw path — and the **rethrow**, which is the half
> a reader would not predict: every other failure is policed, a `SignalContextWriteError` is
> not. Two cases in `reactive/src/lib/readme-examples.spec.ts`, the file
> [`plan.md`](gates/plan.md) § 4 step 5 names because `applyErrorPolicy` is the shared core's
> surface and that spec already reaches it through the published specifier.
>
> **It also discharged a deferral that resolved as designed.** The block is the **first** import
> through the bare `@zvenigora/ng-eval-forms` specifier in any README, which is what
> [F3](#f3)'s third `eval-forms` gate had been waiting for: step 2 declined to build it because
> a gate over a specifier no README imports asserts over the empty set, recorded the obligation
> in the `/reactive` gate's docstring rather than leaving it implicit, and step 5 built it once
> the subject existed — `modules/eval-forms/src/public-api.spec.ts`. Probed: renaming
> `applyErrorPolicy` reddens it with `modules/eval-forms/README.md:339 imports
> { applyErrorPolicy } … which it does not export`.
>
> **One thing the block does not print**, and it is [F11](#f11)'s second instance:
> `SignalContextWriteError` belongs to `@zvenigora/ng-eval-signals` and neither `eval-forms`
> entry point re-exports it, so the block names its package in a comment rather than printing an
> import line no gate would scan. The class is still execution-gated — the spec imports and
> constructs it — but not drift-gated, which is exactly the hole F11 describes.

Only a "How it fits together" row — so the one symbol the 0.2.0 release adds to the *released
primary* surface is documented but not example-gated. Consistent with `createFieldContext` and
`ExpressionErrorPolicy`, which are also table-only, so this is the existing convention rather than a
new gap; worth revisiting if the core's surface grows.

*Recorded*: [`forms/phase-6-step-7-summary.md` § 4.4](forms/phase-6-step-7-summary.md).

<a id="d11"></a>
## D11 — `/signals` has no worked example

**Package** forms · **Kind** docs · **Status** Open

[`docs/forms/worked-example.md`](forms/worked-example.md) is `/reactive`'s, and the Phase 6 plan
asked for no counterpart. The quick start plus five caveat blocks cover the API; a whole-form
narrative is the thing `/reactive` has and `/signals` does not.

**Deliberately left out of [`docs/gates/plan.md`](gates/plan.md)** (§ 2, out of scope): it is
~200 lines of original narrative authoring rather than a gate, and gating it afterwards would add
a sixth step to a plan whose value is being small. It belongs with whoever next has a reason to
document `/signals` end to end.

*Recorded*: [`forms/phase-6-step-7-summary.md` § 4.4](forms/phase-6-step-7-summary.md).

<a id="d12"></a>
## D12 — ~20 specs discard the binding and never call `destroy()`

**Package** forms · **Kind** test hygiene · **Status** Open

They get collected at TestBed teardown through the `DestroyRef` net, which is an improvement and
**also means the suite would not notice a leak on the un-destroyed path**. Pre-existing style.

*Recorded*: [`forms/step-5-summary.md` § 5.2](forms/step-5-summary.md).

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

<a id="e5"></a>
## E5 — The options-first style cannot read `hookErrors`

**Package** core · **Kind** decision · **Status** Open, Premise retired

With errors on the state, the options-first style (`simpleEval(expr, ctx, { hooks })`) has no way
to read them: the consumer holds the `EvalHooks` but never sees the `EvalState` that
`BaseEval.createState` built. The state-first style is unaffected. It argues for an `onHookError`
*callback* form of the option, or for `simpleEval` to surface the state.

**Premise retired.** Phase 1 deferred the design explicitly: "neither is worth designing before
Phase 3 shows which style consumers actually use." Phase 3, Phase 4 and Phase 6 have all shipped,
and **all three consume state-first** — `createEvalSignal` calls the free `call(fn, state)`, and
`eval-forms` routes everything through `evaluateRule`. The blocking condition is discharged and the
evidence it was waiting for exists.

So this is now an ordinary decision with an answer available, not a wait. Nobody went back to it
because the deferral was recorded in a plan document's § 3.6 rather than anywhere a later phase
would read.

*Recorded*: [`side-effects/phase-1-plan.md` § 3.6](side-effects/phase-1-plan.md), line 476.

<a id="e6"></a>
## E6 — `exit` has no mark to bound its scan

**Package** core · **Kind** fix · **Status** **Retired — fixed** — Phase 2 step 1, 2026-09-12; released
in `eval-core` 0.4.0. The premise that Phase 2 makes it reachable was **wrong**, and is corrected
below

`EvalHooks.exit` could not distinguish "absent from this walk" from "absent from the stack", so a
node open only in an *enclosing* walk fell into case 2 and the flush crossed the walk boundary.

**Unreachable today** — it needs an `afterVisitor` with no matching `beforeVisitor` in the same
frame, which no visitor produces.

> **Premise corrected in execution, and the fix landed anyway.** This entry said "Phase 2 is what
> makes it reachable", on the reasoning that statement support "needs a way to short-circuit — skip
> the rest of the block". **It does not, under the design Phase 2 chose.** Skipping a subtree does
> not produce an unmatched `after`: an untaken `if` branch or a `for` body that never runs is never
> *entered*, so nothing is left open. Only an **abrupt** completion that abandons a
> partially-walked child does, and `break` / `continue` / `return` are out of Phase 2's scope
> ([`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 2). So the phase that makes this
> reachable is the abrupt-completion phase, not Phase 2 — which is also why that phase cannot
> inherit this entry's reasoning as a reason to hurry.
>
> *Measured* before the fix, driving the published `EvalHooks` directly — enter two nodes, take the
> mark `evaluate` takes, enter a third, then close the **first**: the open stack drained from depth
> **3 to 0** past a mark of **2**, synthesising **two** `completed: false` events for frames
> belonging to the enclosing walk, which a consumer reads as ordinary completions; the nested walk's
> own `unwindTo(mark)` then had nothing left to unwind. A control with a node never opened stayed a
> no-op.
>
> **Fixed in Phase 2 step 1** rather than deferred to the phase that needs it, for three reasons in
> order of weight: the failure is silent when it happens; the abrupt-completion phase will be
> written against seven new statement visitors as precedent, and leaving the trap armed under them
> is how a residual becomes a defect; and the mechanism already existed one level up (`depth` and
> `unwindTo`). `evaluate` and `evaluateAsync` now record their mark on
> `EvalHookBookkeeping.walkBases` — where `exit`, called from a visitor, can see it — and **both** of
> `exit`'s routes respect it: the `lastIndexOf` scan and the identity fast path. The fast path needs
> it independently: when a nested walk has opened nothing yet, the top of the stack *is* the
> enclosing walk's node, so a scan-only bound leaves the boundary crossable by the cheap route and
> the measurement above does not see it, because that sequence opens a third node first. A node open
> only in an enclosing walk now falls into case 3 by either route — pop nothing, emit nothing.
>
> *Covered*: `eval-hooks.spec.ts`, "the walk base bound". Reverting the bound turns the scan case
> and the fast-path case red and leaves the never-opened control green; bounding the scan alone
> turns only the fast-path case red.

Note this is orthogonal to per-state isolation and neither subsumes the other: per-state isolation
handles *sharing across evaluations*; marks handle *nested walks within one evaluation* — the
re-entrant `evaluate()` in `arrow-function-expression.ts:17`, which uses the very same state and so
is invisible to per-state isolation by construction.

*Recorded*: [`side-effects/step-3-summary.md` § 5.2](side-effects/step-3-summary.md);
[`side-effects/phase-1-plan.md` § 3.8](side-effects/phase-1-plan.md).

---

# F. Tooling and docs

<a id="f1"></a>
## F1 — No `configurations.ci` on the `test` target

**Package** signals **and** forms · **Kind** fix + decision · **Status** **Retired — fixed and
decided**, [`docs/gates/plan.md`](gates/plan.md) step 1, 2026-09-07

`modules/eval-core/project.json` gave its `test` target a `configurations.ci` block
(`ci: true`, `coverage: true`). Neither `modules/eval-signals/project.json` nor
`modules/eval-forms/project.json` had any `configurations` on `test` at all, so any CI job that
started asking for coverage per project would get it from one and not the others.

> **Premise corrected in execution: the failure was silent, not loud.** This entry said
> "`nx test <project> --configuration=ci` does not exist for two of three libraries", which
> implies the command fails. **It does not.** Measured with the block stashed and
> `--skip-nx-cache`: the command exits **0**, runs the full suite, and quietly emits no
> coverage — Nx ignores an unknown configuration rather than rejecting it. So a CI job asking
> for per-project coverage would have gone **green with no coverage** on two of three projects
> and reported nothing. That is worse than the entry described, and it is why the fix's exit
> criterion is "coverage is emitted" rather than "the command stops erroring".

**The entry this replaces named `eval-signals` only** — it was written in Phase 3 step 6, before
`eval-forms` existed, and nobody widened it when Phase 4 shipped a third project with the same gap.
Corrected here 2026-09-06 by reading all three `project.json` files.

Today's workflow runs `npm test` — plain `nx run-many -t test` — so nothing was red and nothing
was missing coverage that had previously been reported.

**Fixed**: both projects now carry the same block, and
`nx run-many -t test --configuration=ci` writes `coverage/modules/<project>/` for all three.

**Decided: no thresholds, not yet — and the baselines are why.** Measured 2026-09-07:

| Project | Statements | Branches | Functions | Lines |
| ------- | ---------- | -------- | --------- | ----- |
| `eval-core` | 82.44% | **67.95%** | 79.43% | 81.51% |
| `eval-signals` | 100% | 99.13% | 100% | 100% |
| `eval-forms` | 98.66% | 95.72% | 97.61% | 98.53% |

The spread settles it. A single workspace-wide threshold is either trivially met by the two
newer packages or immediately blocking for `eval-core`, whose branch coverage is 31 points below
its siblings'. Per-project thresholds would work, but setting three numbers from today's figures
draws three arbitrary lines that get lowered the first time one blocks somebody — and CI does
not run `--configuration=ci` at all today
([`.github/workflows/node.js.yml`](../.github/workflows/node.js.yml) runs plain `npm test`), so
adopting thresholds also means changing the workflow. That is a second decision with a second
owner.

**What would reopen it**: a decision to gate CI on coverage, which should be taken together with
the workflow change and per-project numbers rather than one workspace figure. `eval-core`'s 68%
branch coverage is the interesting number and is worth its own look — it is the package with the
`ROADMAP`-deferred defects, and low branch coverage is where an unfixed branch hides.

<a id="f2"></a>
## F2 — One `CHANGELOG.md` for three independently-versioned packages

**Package** repo · **Kind** decision · **Status** Open

There is one `CHANGELOG.md` at the workspace root and three packages that version separately. The
heading convention answers it well enough to read the file unambiguously: a release of a non-core
package is titled with the package name, `## [eval-signals 0.1.0]`, while `eval-core` keeps the bare
`## [0.3.0]` form its history already used.

Two things make it worth logging:

- **`eval-core`'s entries are the implicit case.** A bare `## [0.3.0]` means "eval-core" only by
  convention, and only because it got there first. Nothing enforces it.
- **It has already drifted from npm.** The changelog carries `## [0.2.3]`, `## [0.2.4]` and
  `## [0.2.5]` entries for `eval-core`; the registry's version list runs
  `0.1.102 … 0.2.1, 0.2.2, 0.3.0`. Those three were changelogged and never published. A reader
  treating the file as a release history is misled today, and the manual procedure has no step that
  would catch it. (Verified still present 2026-09-06.)

The fix is not obviously "split into three files". `nx release changelog` can maintain per-project
changelogs — but adopting it means adopting the full `nx release` flow, which is separately unmade
(see CONTRIBUTING, "Why publishing is still manual"), and it would have to be reconciled with the
existing single file rather than starting clean. Deciding that is the work.

Related: [F8](#f8), which is the same class of drift reaching the git tags.

<a id="f3"></a>
## F3 — Documented-symbol drift gate

**Package** core, signals **and** forms · **Kind** fix · **Status** **Retired — built, green,
and probed**, [`docs/gates/plan.md`](gates/plan.md) step 2, 2026-09-07

> **What shipped.** Five gate specs — four in step 2 and the fifth in step 5, see limit 2 —
> `modules/eval-core/src/public-api.spec.ts`,
> `modules/eval-signals/src/public-api.spec.ts`, and one per `eval-forms` entry point under
> `reactive/src/` and `signals/src/` — over an export-list reader built with the TypeScript
> compiler API, so type-only exports resolve (§ 1.1's `ExpressionRules` is asserted directly).
> The reader is triplicated, one copy per project, because `allow: []` on
> `@nx/enforce-module-boundaries` permits no cross-project helper import and § 6 gate 1 permits
> no non-spec file; see [`docs/gates/plan.md`](gates/plan.md) § 8.1 for what retires that.
>
> **The published/unpublished check found its five symbols on the first run**, exactly as § 3.2
> predicted: `ParserService`, `DiscoveryService`, `EvalContext`, `EvalScope` and
> `EvalScopeOptions` were exported, documented in the root `README.md`, and absent from
> `modules/eval-core/README.md`. All five are now documented in the package README — no
> exception list exists anywhere in the gate.
>
> **Three limits, all deliberate, and the first is the one to read before relying on this
> entry being closed.**
>
> 1. **Only identifiers inside an `import { … } from '@zvenigora/…'` statement are checked** —
>    which does **not** include this entry's own motivating example. `trackTime` is an
>    `EvalOptions` key, not an exported symbol, and appears in no import statement in any
>    README; the gate would have stayed green through the Phase 1 step 6 divergence described
>    below. What it catches is that divergence's *shape* for the subset that is imported by
>    name — which is how it found five real instances on its first run.
>
>    **The exported surface this leaves unwatched is [F10](#f10)**, opened rather than folded in
>    here: three `/reactive` symbols are documented in `modules/eval-forms/README.md` and named
>    in no import, so renaming them keeps every gate green. That is a coverage gap with its own
>    fix, not a caveat on this mechanism.
>
>    **[F11](#f11) is the same shape one axis over**: each gate checks its README against **one**
>    specifier, so an import line naming a *different* `@zvenigora/…` package in a gated file is
>    scanned by nothing. Step 3 hit it for real and left an import out of
>    `modules/eval-signals/README.md` rather than print an unchecked one. F10 bounds which
>    symbols are checked; F11 bounds which specifiers. Both were found from inside the work, and
>    together they are what "the READMEs are gated" is entitled to mean.
> 2. ~~No gate covers the bare `@zvenigora/ng-eval-forms` specifier~~ — **discharged in step 5,
>    2026-09-09.** Step 2 declined that gate because no README imported through the bare
>    specifier, so it would have asserted over the empty set, and recorded the obligation here
>    and in `reactive/src/public-api.spec.ts`'s docstring rather than leaving it implicit.
>    [D10](#d10) created the subject — `modules/eval-forms/README.md:339` is now the first such
>    import — and the gate is `modules/eval-forms/src/public-api.spec.ts`. **All three
>    `eval-forms` entry points are gated**; nothing is owed here.
> 3. Nothing detects a **fifth** README that no gate reads; that is the plan's risk 7, a stated
>    refusal rather than an unfilled slot.

Not a defect in shipped behaviour; a gap in what the suite can catch.

**Assert that every symbol a README imports from `@zvenigora/ng-eval-core` is actually exported from
it.** Scan the fenced code blocks in **both** `README.md` and `modules/eval-core/README.md`, collect
the identifiers named in `import { … } from '@zvenigora/ng-eval-core'`, and assert each resolves
against the public API.

Scanning both is the point. The divergence Phase 1 step 6 had to correct was exactly a
published/unpublished split: `trackTime` was documented only in the root `README.md`, which ships
nowhere, so the one file a consumer installing the package can read was the one file the
documentation was not in. It also catches the higher-frequency case: a public symbol renamed or
removed while a README goes on naming it.

This is an **export-surface** assertion, so a `public-api.spec.ts` beside `src/public-api.ts` is its
natural home. **No such spec exists anywhere in the repo** (verified 2026-09-06), so this creates
one; the published surface has no direct test today, which is a second reason to add it.

> **Two findings from planning**, both in [`docs/gates/plan.md`](gates/plan.md). A runtime export
> list (`Object.keys` over a namespace import) is **blind to interfaces and type aliases**, and the
> READMEs document those today — `modules/eval-forms/README.md:555` names `ExpressionRules`, which
> is an `export interface`. So the obvious implementation false-fails on correct code on day one
> (§ 1.1), and the plan reads the export list with the TypeScript compiler API instead (§ 3.1).
> Separately, this entry is **scoped to `eval-core`** because it was written when that was the only
> package; there are now four READMEs and three packages (§ 1.4, § 3.2) — the same under-scoping
> [F1](#f1) carried.

**Deliberately excluded**: a block-count assertion ("the README contains N snippets"). It fires on
every legitimate addition, so its steady-state behaviour is to train people to bump the number
rather than investigate the failure.

### Considered and rejected: executing transcribed snippets

The larger version — mirroring each documented snippet as a test and asserting the output the README
prints — was written and run during Phase 1 step 6 (eight tests, all green) and then deleted.

A transcription is a **copy, not a reader**. It gates "the API behaves as documented", which the
suite already does; what it cannot gate is what the README actually says. The decisive evidence is
that **neither defect step 5 found would have been caught by it.** Both were missing declarations in
fragments — `### Compilation` passing an `options` it never declared, `### Evaluation with scope`
using an unconstructed `evalContext` — and a transcription is written to work. Anyone turning those
fragments into a runnable test declares the missing bindings without noticing.

That argument was later **reopened for `eval-forms` only** — see [F4](#f4), which is the narrower,
code-running gate and does **not** supersede this one.

<a id="f4"></a>
## F4 — README-execution gate for `eval-core` and `eval-signals`

**Package** core, signals · **Kind** fix (signals) / decide-then-maybe-drop (core) · **Status**
**Retired — three states, no pending work**, [`docs/gates/plan.md`](gates/plan.md) steps 3 and 4,
2026-09-08

> **Where each file landed.** The verdict is per file, not per package, because the two
> `eval-core` READMEs fail differently — the plan's binary was amended to allow it rather than
> the answer fitted to the form.
>
> | File | State |
> | ---- | ----- |
> | `modules/eval-signals/README.md` | **Gated** — step 3, `src/lib/readme-examples.spec.ts`, 7 cases over 9 `ts` blocks |
> | `modules/eval-core/README.md` | **Gated** — step 4, `src/lib/readme-examples.spec.ts`, 9 cases over **12** `javascript` blocks |
> | `README.md` (root) | **Assessed and dropped** — step 4, on the fragments |
>
> **The root README is a decision, not an omission**, and nothing here should be read as work
> still queued on it. Measured with the TypeScript parser: **0 of its 11 `javascript` blocks are
> runnable as printed and 9 do not parse at all** — a bare `...` line and
> `private service: EvalService;` outside a class body.
>
> The ground is **volume and ownership**: gating it means rewriting the opening style of 9 of 11
> blocks, a whole-file documentation rewrite [`plan.md`](gates/plan.md) § 8.3 keeps open as its
> own question; 2 of those 9 additionally carry interior `...` elisions that stand in for prose
> and cannot be completed without deleting what the document prints. Gating it *without*
> rewriting it would put the whole program into the substitution list of every case — F3's
> "considered and rejected" shape, where the transcription declares the missing bindings and
> nobody notices. **Not** because a fragment style makes gating impossible: the spec never
> consumes the README's opening line either way. See
> [`step-4-summary.md`](gates/step-4-summary.md) § 3, which corrects a first draft that gave
> "subtractive" as the reason — true of 2 of the 9 blocks, not of the file.
>
> **The package README was the opposite case**: 8 of 12 blocks parsed and needed only bindings
> the document already implied. The other 4 carried the same `private service:` shape — **three
> of them added by step 2 itself**, which recorded that they changed nothing; see
> [`step-4-summary.md`](gates/step-4-summary.md) § 2 and the correction in
> [`step-2-summary.md`](gates/step-2-summary.md) § 4. All four now open `const service =
> inject(X);`.

> **The `eval-signals` half shipped**, as
> `modules/eval-signals/src/lib/readme-examples.spec.ts`: seven cases over the README's nine `ts`
> blocks, with the two not covered named in the docstring and the reason given for each.
>
> **It found the defect the plan predicted, and a limit of value-transcription the plan did not
> name.** The defect: `Dependency introspection` printed `// 30` against identifiers the document
> never declared — fixed in the README, which now declares its own three signals. The limit,
> which is a property of the gate rather than an error in the document: `## Quick start`'s
> `// 40  — not recomputed` is a **behavioural** claim its printed value cannot discriminate,
> since a signal that *did* recompute produces 40 as well. The case asserts a recompute count
> beside it, listed as a substitution because the README prints no such number — and probed:
> made the resolver subscribe to every key and **only** that case went red, on the count, with
> the printed `40` still `40`.
>
> **The one-program condition was demonstrated, not asserted** — both halves. With the block
> restored to its bare identifiers and bound to the Quick start's fields, a per-block resetting
> fixture reported **green** on the wrong `// 30` while the one-program arrangement reported
> **red** (40 ≠ 30). The green half is the one that reproduces the Phase 4 trap, and it
> materialised.
>
> **The limit this gate keeps**, restated because it is easy to read a green suite as more:
> nothing connects a case to the block it mirrors except a human. Editing a printed value in the
> README alone does not turn anything red; what the gate catches is the *library* drifting from
> what a case transcribed. See [`docs/gates/step-3-summary.md`](gates/step-3-summary.md) § 4.
>
> **[F11](#f11) bounds this gate too**, and step 3 is where it surfaced: an execution spec
> substitutes its import line (§ 1.2), and the drift gate checks only the README's own
> specifier, so a **cross-package** import in a gated README is neither resolved nor run. That
> is why `## Using the adapter directly` names `EvalService`'s package in a comment instead of
> printing an import for it. With [F10](#f10), these are the two coverage limits this track
> found from inside the work rather than from planning.

`readme-examples.spec.ts` exists for `eval-forms/reactive` **and** `eval-forms/signals`, and for
neither other package (verified 2026-09-06). The five defects that justify the gate are in the other
two: two shipped in `eval-core`'s documentation in Phase 1, three in `eval-signals`' in Phase 3. So
the package with no record of a non-running snippet is the one gated, and the two with the record
are still on the review practice that missed them five times — each caught only by a later session
that happened to be reviewing documentation, and nothing makes that session happen.

Two pieces of work, not one.

**The soundness condition carries across unchanged: one case per continuous program, not one per
block.** A document whose sections run in sequence is one program, and its printed values are claims
about the state each block inherits. A per-block harness behind a resetting `beforeEach` executes a
*different* program and reports green for a document that is wrong as written. Phase 4 step 6 hit
this for real: a first draft split the worked example into a case apiece, went green, and hid a
`false` that § 4 had already driven to `true`. Split only where the document itself declares a fresh
start — `modules/eval-core/README.md` does exactly that between its `trackTime` section and its
hooks section, and does **not** between the `trackTime` blocks, whose second reads a `state` the
first declared.

**`eval-signals` is the easier of the two** and should go first. Its README is already written in
whole-unit blocks — a component class, then a sequence of reads and `set` calls against it — which
is the shape the gate wants.

> **Premise retired, 2026-09-07.** This entry also argued that "`eval-forms`' spec already imports
> `SignalContextWriteError` from it, so a consumer-shaped import through the published specifier is
> known to work from a spec folder." **Measured false for the case that matters.** That import
> works because it crosses *projects*; a spec inside `modules/eval-signals/` importing
> `@zvenigora/ng-eval-signals` is an `@nx/enforce-module-boundaries` error — *"Projects should use
> relative imports to import from other files within the same project"* — and the root
> `eslint.config.mjs` sets `allow: []`, so there is no exemption to reach for. The gate must import
> `../public-api`, which is a substitution against what the README prints and must be enumerated in
> the docstring. The conclusion (do `eval-signals` first) stands on its README's shape alone; see
> [`docs/gates/plan.md`](gates/plan.md) § 1.2 and § 1.3.

**Two further findings from planning**, both in [`docs/gates/plan.md`](gates/plan.md): this
README's blocks are one continuous program that reads `this.` outside any class body, so the spec
must supply a component instance (§ 1.3); and F3 and F4 read the same files, so a step that
completes `eval-core`'s fragments moves F3's input (§ 1.5).

**`eval-core` is the harder case, and it may not be gateable as written.** Its snippets are
fragments: `private service: EvalService;` followed by `...`, in both READMEs — and the two Phase 1
defects were *exactly* that shape. Fragments needing invented preamble are the condition under which
this gate stops being sound. Phase 4's answer was to complete the **document** rather than pad the
spec, but there the fragments were a handful of blocks; here it would mean rewriting the prevailing
style of both files, and the injected-service opening is load-bearing documentation in an Angular
library rather than an omission to be tidied away. So `eval-core`'s step decides that first, and the
drop rule applies without apology: **if it fights, it is dropped and the reason reported**, rather
than a harness built to prop it up. Whatever preamble a surviving spec does supply is **enumerated
in its docstring** — a blanket "self-contained" claim is how an unlisted substitution hides.

Both are narrower than [F3](#f3) and neither supersedes it: they run code, they do not read markdown.

<a id="f5"></a>
## F5 — The `js-sha256` peer range is locked to a dead minor

**Package** core · **Kind** decision · **Status** Open

`modules/eval-core/package.json:20` declares `js-sha256: ^0.10.1` as a peer. Because the package is
still `0.x`, a caret range there is locked to the **minor**, so `^0.10.1` admits `0.10.x` and nothing
else. Upstream has since published `0.11.0`, `0.11.1`, `0.12.0` and `1.0.0`, and `1.0.0` is `latest`
— so every version a consumer would naturally reach for is outside the declared range.

The peer is real, not vestigial. There is exactly one call site —
`modules/eval-core/src/lib/internal/classes/common/cache.ts:53`, which hashes a `namespace:value`
template string into a cache key.

**What a consumer sees.** A clean `npm install` is fine: npm's automatic peer installation picks
`0.10.1`. The failure is the *other* order — a consumer whose tree already contains `js-sha256@1`
gets an `ERESOLVE overriding peer dependency` warning naming `@zvenigora/ng-eval-core`, and npm keeps
their version, so the library runs against a major it never declared. A warning rather than an error.

**The decision.** Widening to `^0.10.1 || ^0.11.0 || ^0.12.0 || ^1.0.0` needs the `sha256` call
signature checked against `1.0.0` first. The alternative is to stop depending on a hash library for
what is a cache key: the value is never persisted, compared across processes, or relied on for
integrity, so a non-cryptographic hash computed in-repo would remove a peer dependency from the
published surface entirely, and the one call site makes that a contained change. Either way it alters
an exported package's `peerDependencies`, so it needs a `CHANGELOG.md` entry and a version bump.

<a id="f6"></a>
## F6 — CONTRIBUTING's "Code style" describes a config that never existed here

**Package** repo · **Kind** decision (editorial) · **Status** **Retired — fixed 2026-09-26**; the
table replaced by a paragraph that points at the configs

*Fixed* 2026-09-26, taking the second option below: the dead link and the thirteen-rule table
are gone, and "Code style" is now one paragraph naming the four `eslint.config.mjs` files, the
`@nx` flat presets each layer spreads, the three rules the configs add themselves (module
boundaries by scope tag, the `zvenigora` selector prefixes, `@nx/dependency-checks`), and
`npm run lint`. Each claim was checked against the four configs, the `tags` in each
`project.json` and the root `package.json`'s `lint` script before it was written. It
deliberately does not enumerate the rule set, for the reason the last paragraph gives. *Verified*:
`CONTRIBUTING.md` no longer mentions `.eslintrc.json`; every file it names exists; lint green.

*As recorded:*

`CONTRIBUTING.md:42` linked to `.eslintrc.json`. That file does not exist —
Phase 1's tooling work replaced it with flat config, and the workspace now has four:
`eslint.config.mjs` at the root and one per module. The link is dead.

The thirteen-rule table beneath it is the larger problem, because it reads as authoritative and is
not. **None of its thirteen rules appear in any of the four configs** — not `semi`, `curly`,
`brace-style`, `spaced-comment`, `no-dupe-keys` or any of the rest. What the configs actually enforce
is a different kind of thing: the `@nx` flat presets, `@nx/enforce-module-boundaries` with the
`scope:core` / `scope:signals` / `scope:forms` tag constraints, the `zvenigora` selector prefixes, and
`@nx/dependency-checks`.

Misleading rather than merely stale, because two rows tell a contributor to write code the repository
does not contain:

- `brace-style: [1, "stroustrup"]` requires `else` on its own line. `eval-core`'s sources have 57
  occurrences of `} else` and none of the Stroustrup form.
- `no-mixed-spaces-and-tabs: [1, "smart-tabs"]` is described as "tabs for indentation". No file under
  `modules/eval-core/src` is tab-indented; 109 are space-indented.

The decision is what should replace it. Enumerating the real rule set reproduces the same drift one
migration later, and most of it is inherited from presets rather than chosen here. Pointing at
`eslint.config.mjs` and saying "run `npm run lint`" is honest and much shorter, but loses the
commentary the section was written to provide. That choice is the work.

<a id="f7"></a>
## F7 — An intermittent Jest worker-teardown warning with no established locus

**Package** — · **Kind** fix, **possibly not a library defect at all** · **Status** Open —
**locus corrected 2026-09-09**, previously recorded as an `eval-core` property

**What it is, as measured today.** `A worker process has failed to exit gracefully` appears
**intermittently under `nx run-many`, and does not reproduce for any project run on its own.**
Measured on this tree, 2026-09-09, every run with `--skip-nx-cache`:

| Command | Warnings |
| ------- | -------- |
| `nx test eval-core` (with and without the new spec) | **0**, twice |
| `nx test eval-signals` (with and without the new spec) | **0**, twice |
| `nx test eval-forms` | **0** |
| `nx run-many -t test --parallel=1` | **0** |
| `nx run-many -t test --output-style=stream` | **0** |
| `nx run-many -t lint test build` | **2** on one run, then **0** on the next three |
| two `nx run-many` invocations racing each other | **0** and **0** |

So it fired twice in roughly a dozen runs, in a multi-target parallel run, and every attempt to
pin it since — including the same command, and including deliberately loading the machine —
came back clean.

**New observation, Phase 2 step 5, 2026-09-14: it fired once under `nx run-many -t lint test`, a
command the table above records as untested rather than as zero.** One firing, on the step's
baseline run; all targets stayed green; two later `nx run-many -t lint test build` runs in the same
session came back clean. It was **not** captured with `--output-style=stream`, so the emitting task
is still unattributed and this adds no locus.

**Recorded rather than folded into the table, because one firing overturns nothing** — the table's
rows are repeated measurements and this is a single observation of a command they do not cover. What
it does establish is that the symptom is not specific to the three-target form: `lint test` is
enough, so the common factor remains *multi-target `run-many`* rather than `build`. The entry's
locus has already been corrected once on the strength of a claim nobody re-ran; a second wrong
claim inherited from a single run is exactly what that correction was about, so this stays a dated
note beside the table and not a row in it.

> **What this replaces.** The entry said: "Confined to `eval-core` — confirmed by running each
> project separately." **That does not hold today**: run separately, `eval-core` is the *quietest*
> of the three, at zero. Either the attribution was made under conditions this tree no longer
> reproduces, or a single clean per-project run was read as confirmation of a locus. The claim
> travelled through twelve summaries without anyone re-running it, which is the same failure the
> entry itself is about.

**Say what it now is, not only what it is not.** These are two different investigations and only
the first is a library defect:

- **"`eval-core` leaks a handle"** — a timer or listener a spec leaves behind. This is what the
  entry used to assert. **The evidence against it is that a leak of that kind is deterministic**:
  it would fire on `nx test eval-core` alone, every time. It does not fire there at all.
- **"Something about parallel execution surfaces a Jest worker that misses its exit window"** —
  which is where the observations actually point, and which **may be no package's defect**. Under
  `run-many` several Jest instances contend for the same cores; a worker that has finished its
  work but does not exit within Jest's grace period is force-exited and reported exactly like a
  leak. That is a **tooling and scheduling question — Nx's task parallelism against Jest's worker
  teardown** — not an expression evaluator's.

**What this means for the timebox.** [`docs/gates/plan.md`](gates/plan.md) § 4 step 5 opens F7
with `nx test eval-core --detectOpenHandles`. **That command is aimed at a run that does not
exhibit the symptom**, so it will report nothing and the box will be spent proving the absence of
a leak nobody has evidence for. Amended there to say so.

**The honest recommendation is that step 5 should not spend its box here.** F7's own drop rule —
"if it is not identified within the step, stop, write what was ruled out, and leave it open" — is
already satisfied by this entry: the measurements above *are* what was ruled out, and they were
cheap because they were run against a symptom rather than a suspect. What would change that is a
**reproduction**, not another hunt: if someone catches it firing, capture the run with
`--output-style=stream` so the emitting task is attributed, and record the command and the
machine. Until then there is no locus to investigate, and an unattributed intermittent warning in
a build tool is not work this repository owes anyone.

**Not closed, and deliberately not.** It is real, it has been seen repeatedly across phases, and
"cannot reproduce today" is not "does not happen". What changed is that the entry no longer names
a package that the evidence does not support.

**Carried in twelve step summaries and never once promoted to an entry**, from
[`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md) through
[`forms/phase-6-step-6-summary.md` § 4.3](forms/phase-6-step-6-summary.md), each time as
"pre-existing; carried unchanged". Twelve sessions noticed it and none owned it, which is [A8](#a8)'s
failure mode in a lower-stakes register: a note that travels forward is not a note that gets acted on.

~~Most likely an open handle — a timer or a listener a spec leaves behind. `--detectOpenHandles` is
the first step.~~ **Superseded by the measurements above**: `--detectOpenHandles` on a run that
does not warn reports nothing, and "most likely an open handle" was a guess that hardened into a
locus over twelve restatements.

<a id="f8"></a>
## F8 — The release tag step has no forcing function, and ships with a silencer

**Package** repo · **Kind** fix · **Status** **Premise retired 2026-09-16** — the ten missing tags
were written and pushed, so the arrears this entry opened on are cleared. **The mechanism is
untouched and the entry is live**; read the closing note before planning against it. Opened
2026-09-06 as "`eval-forms@0.2.0` is untagged, and CLAUDE.md describes a pre-Phase-6 repo", which
is what the two headed sections below are still about

Two drifts between what the repository says about itself and what it is, both found 2026-09-06.

**The missing tag.** `CLAUDE.md` states each published package carries a `<name>@<version>` git tag.
`git tag --list` has `eval-core@0.3.0`, `eval-forms@0.1.0` and `eval-signals@0.1.0`. There is **no
`eval-forms@0.2.0`**, although `modules/eval-forms/package.json` says `0.2.0` and `CHANGELOG.md`
carries a dated `## [eval-forms 0.2.0] - 2026-09-06` entry. Either the tag was missed or 0.2.0 has not
actually been published; the release procedure has no step that distinguishes those, which is the same
gap [F2](#f2) describes reaching the changelog.

**`CLAUDE.md` described the repo as it was before Phase 6 — corrected 2026-09-06, this half is
done.** It had said that `docs/forms/phase-6-plan.md` "does not exist yet" and that writing it was
Phase 6's first deliverable (the file exists and runs to 3,420 lines); that `eval-forms` was
"Published at 0.1.0, by Phase 4" with the `/signals` entry point "designed and not built"; and
that Phases 1, 3 and 4 were the complete set. All three are now accurate, the "active plan"
pointer says there is none, and its three pointers into `ROADMAP.md`'s moved sections now cite
backlog IDs.

That half mattered more than an ordinary stale doc: `CLAUDE.md` is loaded into every session's
context, so each new session started from a description of the repository one phase behind, and
the "active plan" pointer aimed at a document the same file said did not exist.

**Open: the tag, and whether 0.2.0 is actually on npm.** — *the tag half is done; see the closing
note. Whether each version is on npm is untouched by tagging and remains unanswered.*

**Widened by Phase 2, 2026-09-16 — it is now three missing tags, not one.** The phase released
`eval-core` **0.4.0** (step 6) and, in step 7, `eval-signals` **0.1.1** and `eval-forms` **0.2.1**.
None of the three is tagged, so `git tag --list` still ends at the same three tags it had before
Phase 2 opened while three `package.json`s have moved past them.

The entry's original question — *was the tag missed, or was the version never published?* — is now
asked of four versions at once, and Phase 2 cannot answer it for its own three: this branch is
unmerged and nothing has been published from it.

**The mechanism, checked rather than guessed — and it is not "nobody wrote the procedure down".**
That was the natural reading and it is wrong:

- **The procedure is specified.** [`CONTRIBUTING.md`](../CONTRIBUTING.md) step 4 says to tag and
  push, gives the `{projectName}@{version}` format, gives the `git tag -a` command, and states the
  constraint that the commit must be the one the artifact was built from.
- **It was followed, once per package.** `eval-core@0.3.0`, `eval-forms@0.1.0` and
  `eval-signals@0.1.0` all exist. This is not a step nobody has ever performed.
- **All three `project.json`s read those tags** — `currentVersionResolver: "git-tag"` — so the
  tags are load-bearing input to the next release's version, exactly as CONTRIBUTING says.
- **And every release since has skipped it**: `eval-forms@0.2.0` from Phase 6, and Phase 2's
  `eval-core@0.4.0`, `eval-signals@0.1.1`, `eval-forms@0.2.1`. Four consecutive releases across
  two phases.

**So what is missing is not a writer but a forcing function — and there is an active silencer.**
`fallbackCurrentVersionResolver: "disk"` means a missing tag never fails anything: the resolver
falls back to the manifest, the next release computes a plausible version, and the configuration
that was supposed to depend on tags keeps working without them. A step that is documented,
manual, unenforced, and whose omission is *masked by design* will be skipped, and was — four times.

That is a sharper finding than "remember to tag", and it points at a different fix. Options, in
rough order of cost: have the release procedure fail loudly when the tag it is about to read does
not exist (drop or condition the disk fallback); or add the tag write to whatever runs the publish,
so the two cannot separate; or gate it, in the shape [F3](#f3) and [F4](#f4) took — a check that
every version in a `modules/*/package.json` has a corresponding tag. The last is the only one that
catches the four already missing.

**The tag backlog is empty as of 2026-09-16, and nothing above it changed.** Ten tags were written
and pushed: seven retroactively — `eval-core@0.1.104`, `@0.1.105`, `@0.1.106`, `@0.1.107`, `@0.2.1`,
`@0.2.2` and `eval-forms@0.2.0` — and three for the versions released this week, `eval-core@0.4.0`,
`eval-signals@0.1.1` and `eval-forms@0.2.1`. All sixteen tags in the repository are on the remote,
and every version in the three `modules/*/package.json` manifests and every released version in
`CHANGELOG.md` now resolves to one.

**That closes the arrears, not the entry.** The three current versions were tagged *because the gap
was noticed during the release*, not because anything required it — the same manual, unenforced step
this entry is about, performed once more by a reader who happened to be looking. The diagnosis above
stands **unchanged**: the procedure is specified in [`CONTRIBUTING.md`](../CONTRIBUTING.md) step 4,
it is understood, and it has no forcing function. `fallbackCurrentVersionResolver: "disk"` is still
set in all three `project.json`s and still means a missing tag fails nothing. **The three candidate
fixes are unchanged and none has been adopted** — with one clause now spent: the gate was the only
option that caught the versions already missing, and those have been caught by hand instead, so it
would now be adopted to stop the *next* omission rather than to clear a backlog. The next release
skips the step exactly as easily as the last four did.

**The three release tags point at `7935a78`, Phase 2's closing commit, and the artifacts were built
from `615cd49`.** Recorded so the deviation is findable rather than read later as a discrepancy:
`615cd49` is the `npm audit fix` that follows it and touches **`package-lock.json` only** (one file,
+73/−103), so the published bundles are byte-identical either way and no consumer is affected.
CONTRIBUTING step 4 nonetheless says the commit must be the one the artifact was built from, and
these three are one commit behind it. The seven retroactive tags are not part of this: each points
at its own historic commit and is correct.

<a id="f10"></a>
## F10 — The drift gate covers documented-**and-imported** symbols, not documented ones

**Package** core, signals **and** forms · **Kind** fix · **Status** Open — the coverage gap
[F3](#f3) leaves behind, opened 2026-09-08

[F3](#f3) is retired and its gate is green, and it now reads — including in its own title — as
"documented symbols do not drift". **What it actually asserts is that documented *and imported*
symbols do not drift.** The gate scans `import { … } from '@zvenigora/…'` statements, so an
exported symbol a README documents by any other means is outside it entirely.

This is a gap in coverage, not a caveat on the mechanism, which is why it is here rather than in
F3's limits list: F3's three limits describe what its gate deliberately does not attempt; this
describes a class of exported surface that no gate in the repository watches.

**Measured today**, in `modules/eval-forms/README.md`:

| Symbol | Exported from | Documented at | In an `import`? |
| ------ | ------------- | ------------- | --------------- |
| `createControlSource` | `/reactive` | `:159`, the API table | no |
| `FormBinding` | `/reactive` | `:156` and `:497`, prose and table | no |
| `FieldSchema` | `/reactive` | `:157` table, `:177` interface block | no |

All three are real published surface, all three are documented well enough that a consumer will
use them, and renaming any of them leaves every gate green. `bindFieldProperties` sits in the
same table and *is* covered — only because a different section happens to import it.

**Two shapes of fix, and they are not the same size.**

- **Cheap and partial**: scan for the symbols' *names* as they appear in prose or tables, not
  only in import statements. This finds these three, and it false-fails the first time a README
  legitimately names a symbol that was removed on purpose, or names a word that is also a
  symbol. That is close to the shape [F3](#f3) § 1.1 rejected, and it should not be adopted
  without an answer to it.
- **Sound and larger**: assert the other direction — every symbol in a package's export list is
  documented *somewhere* in that package's README. That is a real completeness gate rather than
  a drift gate, and it starts red: `eval-core` exports 74 names and its README names a small
  fraction of them, so adopting it means deciding what "documented" means for an internal type
  alias. That decision is the actual work here, and it is why this is an entry rather than a
  step someone can pick up in an hour.

Whoever takes it should also rename F3's summary line, or leave it retired and let this entry
carry the claim — but the two should not both stand as written.

<a id="f11"></a>
## F11 — A gated README can only import from its own specifier

**Package** core, signals **and** forms · **Kind** fix · **Status** Open — the second coverage
limit Track 3 found from inside the work, opened 2026-09-08

Each drift gate built in [F3](#f3) checks one README against **one** specifier's export list:
`modules/eval-signals/README.md` against `@zvenigora/ng-eval-signals`, `eval-forms`' against
`/reactive` and `/signals` separately, and so on. **An import line naming a different
`@zvenigora/…` package in that same file is scanned by nothing** — not by that file's gate, which
filters on its own specifier, and not by the other package's gate, which reads only its own
README.

This is not hypothetical and the track walked into it in step 3. Completing
`## Using the adapter directly` in `modules/eval-signals/README.md` required an `EvalService`,
which is `@zvenigora/ng-eval-core` surface. The block names it in a comment rather than an
`import` line **for this reason**: printing the import would have added the first unscanned
import line to a gated file, buying documentation completeness and zero coverage. That is a
defensible call for one block and a bad general rule — cross-package examples are exactly what a
three-package workspace's documentation should contain.

**It bounds [F4](#f4) as well as F3.** An execution spec substitutes its imports anyway (§ 1.2),
so a cross-package import line is unchecked in both directions: nothing verifies the symbol
exists, and nothing runs the line as printed.

**The fix is small and its cost is a decision, not code.** Each gate takes the set of specifiers
appearing in its README rather than a single constant, and resolves each against that specifier's
own export list — the reader in `export-list.spec.ts` already maps all five specifiers, so the
machinery exists. What has to be decided first is **which gate owns a cross-package line**: the
README's own package, which is where the failure should be reported, or the exporting package,
which is where a rename happens. Owning it in the README's package means a rename in `eval-core`
turns `eval-signals`' suite red, which is the right report and a cross-project coupling this
workspace has so far avoided in its test targets.

Related: [F10](#f10), the other limit of the same shape — the gate covers documented-**and-
imported** symbols, so an exported symbol named only in prose is unwatched. F10 is about which
*symbols* are checked; this is about which *specifiers*. Together they bound what "the READMEs
are gated" is entitled to mean.

<a id="f9"></a>
## F9 — No gate on document cross-references

**Package** repo · **Kind** fix · **Status** Open — considered and deferred by
[`docs/gates/plan.md`](gates/plan.md) § 8.4, step 2, 2026-09-07

Nothing resolves a `](path#anchor)` link in this repository's documents against the filesystem or
against the target's headings. The evidence for wanting one is this register's own history: the
commit that created it shipped **two links to a section it had not written** — in the commit
arguing that dangling cross-references are how [A8](#a8) stayed invisible for five phases
([R4](#r4)). The documents here cite each other heavily and by anchor, so the failure is
available on every edit.

**Why it was deferred rather than folded into step 2**, now that the machinery exists and can be
compared rather than guessed at:

- **It shares almost nothing with the drift gate.** The part that was the unknown — the
  TypeScript export-list reader — is no use to a link checker, which needs `fs` and a
  heading-to-anchor slugifier. What would be shared is the markdown scan, which is nine lines.
  "The same shape of scan over the same files" turned out to be the weakest half of the argument.
- **It is a different claim.** F3 guards the public API surface; this guards document integrity.
  Folding it into `public-api.spec.ts` would put two unrelated claims behind one name, and the
  first person to see that spec red would learn nothing from its name.
- **Its scope is wider than anything in Track 3** (the documentation gates,
  [`docs/gates/plan.md`](gates/plan.md)) — `docs/` is 20+ files against four READMEs —
  and it has no natural project to live in, which is the same constraint that settled § 8.1.

**Not deferred on cost.** One cold export-list read measures 344 ms (`eval-core`) and 210–235 ms
for each other entry, so the gate this would join is well under a second in total.

**First concrete instance, 2026-09-13 — and it is the argument this entry was missing.** Until now
the case rested on [R4](#r4), two links to a section that was never written: a *broken* reference,
which a reader notices. This one is worse, because nothing about it looks broken.

[`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 2 excluded work with the row
*"Everything in `docs/backlog.md` Track 1 / Track 2 — not this phase's subject"*. **This register
has no Track 1 and no Track 2.** All three Tracks were a sequencing suggestion made in
conversation — 1 the error-identity group ([A4](#a4), [A5](#a5), [A6](#a6), [A7](#a7), [C3](#c3)),
2 the write policy ([C1](#c1), [C2](#c2)), 3 the documentation gates — and only the third was ever
written down. The plan then cited all three as though the reader could look them up.

Provenance, and each step of it is ordinary:

1. **It entered through the commit that introduced the plan** — `2177df1`, which `git log -S "Track 1"`
   identifies as the only commit in this repository's history to add the phrase. Not inherited from
   an older layout, not left behind by a rename: written new, in a document being written carefully.
2. **It was repeated as fact.** The reference was read and summarised downstream, including in this
   session's own reporting, as though it named a structure — which is how a phrase gets a second
   citation without ever acquiring a first.
3. **It survived because a phrase that looks like a citation is not one.** "Track 1 / Track 2" has
   the shape of a reference to a document that has sections, in a row whose whole job was to
   exclude work. It is not a `](#anchor)` link, so no link checker of the kind proposed above
   would have resolved it either — see the scope note below.
4. **Half the family resolves, which is what made the other half invisible.** "Track 3" *is*
   recorded here — glossed beside the document list at the top of this file, and the title of every
   [`docs/gates/`](gates/plan.md) document. A reader who spot-checks the label finds it. One member
   of a label family resolving lends the others the appearance of resolving, and the check stops
   there.

**What this instance changes about the gate.** The failure mode is not a dead link but a **live
reference to a structure that does not exist**, and the proposed checker resolves paths and
anchors — it would have caught this only if the plan had written the exclusion as a link, which is
itself the lesson: *a document that excludes work should name the entries, because a named entry is
checkable and a label is not.* So this instance argues for two things rather than one — the link
checker as specified, and a convention that scope rows cite IDs. The second is free and is applied
in the plan, where the row now names A4–A7, C3, C1 and C2 directly.

**Corrected**: the § 2 row names the entries, with the provenance recorded beside it. `CLAUDE.md`
was checked and never carried the phrase.

**What it would take**, for whoever picks it up: resolve every `](relative/path)` against the
filesystem, and every `#anchor` against the headings of the target file, over `docs/**/*.md` plus
the four READMEs. The anchor half is the one with a real decision in it — this repository writes
some anchors as explicit `<a id="…">` tags and relies on generated heading slugs elsewhere, so a
checker must handle both or it will false-fail on correct links, which is the shape
[F3](#f3) § 1.1 rejected.

<a id="f12"></a>
## F12 — The downstream peer ranges exclude `eval-core` 0.4.0 — **Retired, fixed**

**Package** signals, forms · **Kind** fix (release coordination) · **Status** **Retired — fixed,
Phase 2 step 7, 2026-09-16.** Created by step 6 the day before

**Fixed.** Both ranges widened to `">=0.3.0 <0.5.0"` — `eval-signals` **0.1.1**, `eval-forms`
**0.2.1**, both patch releases carrying nothing but the manifest field. `>=0.3.0` rather than
`^0.4.0` deliberately: see [`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 7.1. The
short version is that dropping 0.3.0 would have been a breaking release bought for a retirement it
does not deliver — the containments stay either way, on the public `EvalContext.push`/`pop` route,
which no peer range touches.

`eval-forms`' `"@zvenigora/ng-eval-signals": "^0.1.0"` needed no change: it already admits 0.1.1.

**The cache half is fixed too, and was the more general defect** — see the entry's last section.
`nx.json`'s `lint` target gained `"^production"` to its `inputs`.

---

**The entry as it stood, kept because the measurements are the reason the fix took the shape it
did:**

`modules/eval-signals/package.json:19` and `modules/eval-forms/package.json:22` both declare
`"@zvenigora/ng-eval-core": "^0.3.0"` as a peer dependency. `^0.3.0` resolves to `>=0.3.0 <0.4.0`,
so **`eval-core` 0.4.0 is excluded by both**. A consumer who upgrades `eval-core` while holding
`eval-signals` 0.1.0 or `eval-forms` 0.2.0 gets a peer-dependency conflict.

**It also breaks this repository's own lint, which is how it was found.** `@nx/dependency-checks`
fails both downstream `lint` targets the moment `modules/eval-core/package.json` reads `0.4.0`:

```
The version specifier does not contain the installed version of
"@zvenigora/ng-eval-core" package: 0.4.0   @nx/dependency-checks
```

Isolated by measurement, not inference: with `eval-core` at `0.3.0` `nx run-many -t lint` is green
for all three projects; at `0.4.0` `eval-signals:lint` and `eval-forms:lint` fail and nothing else
changes. **So `eval-core` 0.4.0 cannot be committed with a green lint run until the ranges widen**,
which is a `CONTRIBUTING.md` precondition for committing at all — and the fix is in two files that
Phase 2's scope gate ([plan § 6](statements/phase-2-plan.md) gate 1) makes a stop-and-replan.
Phase 2 step 6 therefore ends with this open rather than working around it.

**It was cached out of sight for most of step 6.** `nx run-many -t lint test build` reported green
after the bump because both `lint` results were replayed from cache; only `--skip-nx-cache`
surfaced it. That is worth recording next to [F7](#f7): a cache hit on a target whose input is
another project's `package.json` is a way for a gate to report a pass it did not run. Whether the
inputs for these `lint` targets are configured wrongly is a second question this entry does not
settle.

**It was configured wrongly, and step 7 settled it — one line.** `nx.json`'s `lint` target declared
`inputs: ["default", <the two eslint configs>]`, and `default` is `{projectRoot}/**/*` plus an empty
`sharedGlobals` — so **nothing from any dependency**. `@nx/dependency-checks` reads a *sibling
project's* manifest, so `eval-signals:lint`'s correctness depended on a file its cache key did not
cover. Adding **`"^production"`** to that `inputs` array brings every dependency's non-spec files,
`package.json` included, into the key.

*Measured both ways, because "the cache was stale" is not by itself a diagnosis:*

| | cached `nx run-many -t lint` after setting `eval-core` to an **inadmissible** `0.6.0` |
| --- | --- |
| **without** `^production` | **`Successfully ran target lint for 3 projects`** — green, replayed, wrong |
| **with** `^production` | fails both downstream projects, naming `0.6.0` |

The first row is step 6's incident reproduced exactly, on demand.

**`lint` was the only target with this gap**, checked rather than assumed: `build` and
`@nx/angular:package` already declared `["production", "^production"]`, `@nx/jest:jest` already
declared `["default", "^production", …]`, and no `project.json` in this repository overrides
`inputs` for any target. So there is no residual entry to open — this is the whole of the class.

**The cost, stated rather than discovered later**: `lint` now cache-misses whenever any
*dependency's* non-spec files change, so an `eval-core` source edit invalidates `eval-signals:lint`
and `eval-forms:lint` as well as its own. That is more misses than before and is the correct
trade — the alternative is a gate that reports passes it did not run, which is what this entry is.

**Not an incompatibility.** Both libraries' suites run against this repository's `eval-core` source
on every build and are green at 0.4.0 — including the two behavioural changes that reach them, A9's
scope-pop repair and the § 3.2 write relaxation. What is stale is the declared range, not the code.

**Why it is recorded rather than fixed here.** Widening the range is an edit to
`modules/eval-signals/` and `modules/eval-forms/`, which Phase 2's scope gate makes a
stop-and-replan (plan § 6 gate 1), and a peer-range change is itself a release of those packages —
so it needs a version, a `CHANGELOG.md` heading and a tag each, which is a release decision and not
a step-6 tidy-up. It is noted in the 0.4.0 entry so a consumer meets it in the changelog rather
than in their installer.

**What it would take**: `^0.3.0` → `>=0.3.0 <0.5.0` (or `^0.4.0`, if dropping 0.3.0 support is
intended — it is not obviously wrong, since neither package needs anything 0.4.0 added), a patch
bump of each, and an entry per package. [F2](#f2) — one `CHANGELOG.md` for three packages — is the
thing that makes "an entry per package" awkward, and [F8](#f8) is the missing-tag half.

<a id="f14"></a>
## F14 — Four downstream comments cite a peer range that no longer exists, and one repeats A9's necessary-vs-sufficient error

**Package** signals, forms · **Kind** fix (comments, and **published documentation**) · **Status**
**Retired — fixed, Phase 2 step 8, 2026-09-16.** Created by step 7 the same day

**Fixed, at six sites — and it was filed as four.** Step 8 checked the count rather than trusting
it and found `^0.3.0` asserted in **both published READMEs** as well as the four comments:

| File | Line | What it said | |
| ---- | ---- | ------------ | - |
| `eval-signals/README.md` | 20 | "Peer dependencies: … `@zvenigora/ng-eval-core ^0.3.0`" | fixed |
| `eval-forms/README.md` | 70 | a `peerDependencies` block quoting `"@zvenigora/ng-eval-core": "^0.3.0"` | fixed |

**The two the entry missed were the consumer-facing ones, and this entry had them the wrong way
round.** A comment misleads a maintainer reading the source; a README ships in the npm tarball. Both
asserted a range the manifest did not have, in the direction that says `eval-core` 0.4.0 is
*unsupported* — the exact confusion `eval-signals` 0.1.1 and `eval-forms` 0.2.1 were released to
remove, restated in the document a consumer reads first. **A count written from memory in an entry
that was itself about a stale claim**, which is [F13](#f13)'s subject arriving in the register
rather than in a spec docblock.

Step 8's file list was amended in the plan before either README was touched, rather than absorbed by
analogy — a README is neither a comment nor a manifest. `eval-forms`' block duplicates five other
ranges; all five were checked against the manifest and were already correct.

These are **worse than the four comments they were filed behind**, and the entry had them the wrong
way round. A comment misleads a maintainer reading the source; a README ships in the npm tarball and
is the first thing a consumer reads. Both now state a range the manifest does not have — and state
it in the direction that tells a reader `eval-core` 0.4.0 is *unsupported*, which is precisely the
confusion `eval-signals` 0.1.1 and `eval-forms` 0.2.1 were released to remove. `eval-forms`' block
also reproduces the manifest verbatim, so it reads as authoritative.

**Not fixed by step 8**, whose sanctioned list is the four comment sites and explicitly no other
downstream path ([plan § 8](statements/phase-2-plan.md#step-8--f14s-four-comment-sites)). A README
is neither a comment nor a manifest, so it falls outside that list rather than inside it by
analogy — and a published documentation change is the sort of thing this phase has twice decided is
worth its own sanction. It needs one.

**What it would take**: re-spell both to `>=0.3.0 <0.5.0`. `eval-forms`' block should be checked
against the whole manifest while it is open, since it duplicates five other ranges that can drift
the same way — which is the argument for the block citing the manifest rather than copying it.

---

**The four comment sites, fixed by step 8, 2026-09-16:**

Step 7 widened both peer ranges from `^0.3.0` to `>=0.3.0 <0.5.0` ([F12](#f12)). Four downstream
comments name the old range by its literal spelling:

| File | Line | What it says |
| ---- | ---- | ------------ |
| `eval-signals/src/lib/eval-signal.ts` | 339 | "`package.json` declares `"@zvenigora/ng-eval-core": "^0.3.0"`, and that range admits the *leaking* 0.3.0" |
| `eval-signals/src/lib/eval-signal.memory.spec.ts` | 233 | the same claim, in the docblock of a containment spec |
| `eval-forms/signals/src/lib/evaluate-rule.ts` | 50 | the same claim |
| `eval-forms/signals/src/lib/evaluate-rule.spec.ts` | 44 | "leaking `eval-core` under the `^0.3.0` peer range" |

**Stale in spelling, not in substance — which is why this is low and not urgent.** Every one of
them reasons that the range *admits the leaking 0.3.0*, and `>=0.3.0 <0.5.0` still does. Had step 7
chosen `^0.4.0` these would have become outright false; under the range actually chosen they cite a
string that no longer appears in the manifest while their argument survives intact.

**One of them is more than a spelling**, and it is the same defect this backlog's
[A9](#a9)-adjacent planning note carried: `evaluate-rule.ts:53` says *"Removal is gated on raising
the peer range, which is a breaking release."* That reads as a **sufficient** condition and is only
a **necessary** one — `EvalContext.push` / `pop` are public methods on a published class, so a
scope can be stranded at any `eval-core` version and the containment stays load-bearing however the
range moves. A reader who raises the range and then deletes the guard on the strength of that
sentence removes a live protection. The same sentence in
[`statements/phase-2-plan.md`](statements/phase-2-plan.md) step 0b **was** corrected in place by
step 7; this copy of it was not, because it lives in downstream source.

**Why step 7 did not fix it.** Step 7's sanctioned file list is the two `package.json`s and
nothing else under either package — not a source file, not a spec (plan § 6 gate 1). Reaching into
four source files to edit comments is 0b's exception, not step 7's, and the two were written to be
disjoint on purpose. Fixing this is a comment-only change to four files and wants its own sanction.

**What it would take**: re-spell the range in all four, and rewrite `evaluate-rule.ts:53` to state
both retention reasons — the peer range still admitting 0.3.0, **and** the public `push`/`pop`
route, noting that only the second is durable. Plan § 4 step 0b's reworded containment criterion
has the wording to copy.

<a id="f13"></a>
## F13 — Nothing gates the README block count `readme-examples.spec.ts` claims

**Package** core, signals, forms · **Kind** test gap · **Status** **Retired — fixed 2026-09-27**,
test only; all four specs gated. Recorded Phase 2 step 6, 2026-09-15

*Fixed* 2026-09-27. In all four specs, `eval-core`, `eval-signals`, `eval-forms/signals` and
`eval-forms/reactive`, the docblock's count is now a named constant that the docblock cites rather
than restates. A new case in each reads the document from disk and counts the blocks the docblock
says it counts:

| Spec | Counts | Constant |
| ---- | ------ | -------- |
| `eval-core` | ` ```javascript ` fences, whole file | `README_JAVASCRIPT_BLOCKS` = 16 |
| `eval-signals` | ` ```ts ` and ` ```sh ` fences, whole file | `README_TS_BLOCKS` = 9, `README_SH_BLOCKS` = 2 |
| `eval-forms/signals` | every fence under `## Signal Forms — /signals`, and under `### Expressions are not validated` | `README_SIGNALS_BLOCKS` = 5, `README_ASYMMETRY_BLOCKS` = 1 |
| `eval-forms/reactive` | ` ```ts ` fences from `## Quick start — Reactive Forms (/reactive)` up to, not including, `## Signal Forms — /signals`; and ` ```ts ` fences in `docs/forms/worked-example.md`, whole file | `README_REACTIVE_TS_BLOCKS` = 10, `WORKED_EXAMPLE_TS_BLOCKS` = 11 |

A fence opens on three or more backticks or tildes at **any** indentation, so the fence inside
`eval-core`'s `onHookError` bullet, which a `^```` scan misses, is counted. Headings are read only
outside blocks. The reader is copied into each spec, because no spec may import out of another
project (`export-list.spec.ts`) or across entry points by a relative path. Every docblock said it
"does not read the markdown", and each now says it reads the markdown only to count blocks.
`/signals`' docblock names no fence language, so its count takes every language in its two
sections. Today every block there is `ts`.

**`/reactive`'s scope was decided for this gate.** Its docblock had stated none: it covered "the
`/reactive` `ts` blocks that are runnable, and the shared core's two `Coercion` blocks", which
matches no heading boundary. It is now the heading range above, and it takes in the two shared-core
sections between them, `## Coercion` and `## When a rule fails`. The docblock lists the 10 README
blocks so they add up. 7 are executed there. `### Expressions are not validated` is executed by
the `/signals` spec, as its docblock says. Two are not covered: `interface FieldSchema`, a
declaration, and `## Lifetime`'s block. That block is a fragment with a free `schema` and `form`
and an elided `// …`, and what it claims, that `destroy()` releases and is idempotent, is executed
by the Quick start case and the worked example's § 8. All 11 worked-example blocks are executed.
§ 1's form runs as constructed inside § 3's service, which is where the document says it is built.
Named out of scope: the README's intro block, `## Versions`, the `sh` blocks, and `html` in both
files.

**The gate's first run found `eval-core`'s count wrong a third time.** The docblock claimed 14
blocks and full coverage, and the README held 16: `f660c0d` (A12's documentation, 2026-09-23) added
the two `### Bounding the trace` blocks with no case. This is the failure the entry predicted, a
block added without a case under a green suite. Both blocks are covered now, as two cases
because the second re-declares `state`. So `eval-core` went from 1073 to 1076: those two and the
count case. [F3](#f3) excluded a block-count assertion from the *drift* gate because the fix it
invites is bumping the number. Here the first failure was investigated, and the fix was cases.

**What is gated is the count, not the case-to-block mapping**, which stays prose in each
docblock. A mapping gate is not worth building. Its useful form executes each block as printed,
which is [F3](#f3)'s "considered and rejected" case: a transcription is written to work, so it would
not have caught the fragment defects that motivated the gates. Its cheap form checks that each case
cites a heading that exists, fires on every edit that moves a heading, and gates almost nothing.

*Probed* on working copies of the documents, each probe reverted:

| Probe | `eval-core` | `eval-signals` | `eval-forms/signals` |
| ----- | ----------- | -------------- | -------------------- |
| (a) indented fence added in a list item, counted scope | **red**, 17 ≠ 16 | **red**, `ts` 10 ≠ 9 | **red**, section 6 ≠ 5 |
| (b) one counted block deleted | **red**, 15 ≠ 16 (the indented `EvalHooks` fence) | **red**, `ts` 8 ≠ 9 (`## Options`, counted and uncovered) | **red**, section 4 ≠ 5 (the Reuse block) |
| (b′) the other constant's block deleted | — | **red**, `sh` 1 ≠ 2 | **red**, asymmetry 0 ≠ 1 |
| (c) block added in an uncounted language or section | green (a ` ```ts ` block) | green (a ` ```json ` block) | green (` ```ts ` blocks just before `## Signal Forms — /signals` and under `## What is not here`, the H2 after its section)¹ |

| Probe | `README_REACTIVE_TS_BLOCKS` | `WORKED_EXAMPLE_TS_BLOCKS` |
| ----- | --------------------------- | -------------------------- |
| (a) indented ` ```ts ` fence added in a list item | **red**, 11 ≠ 10 (a bullet under `## When a rule fails`) | **red**, 12 ≠ 11 (a bullet under "What this example deliberately does not show") |
| (b) one counted block deleted | **red**, 9 ≠ 10 (`### The key set is not reactive`, covered) | **red**, 10 ≠ 11 (§ 8) |
| (c) block added outside the count | green (a ` ```ts ` block just before the `/reactive` H2, and an indented ` ```html ` block inside the range) | green (a ` ```json ` block) |

In every red run only the targeted count went red, and the `/signals` counts stayed green in each
`/reactive` probe. Where a case executes the deleted block, as in `eval-core`'s `EvalHooks` case,
`/signals`' two Reuse cases and its asymmetry case, `/reactive`'s key-set case and the worked
example's §§ 4–8 case, that case stayed green. That measures this entry's premise directly.

¹ Run before `/reactive` was gated. The first of those two blocks now sits inside `/reactive`'s
range and would redden `README_REACTIVE_TS_BLOCKS`, which is correct: it is the last section before
`## Signal Forms — /signals`.

---

**The entry as it stood:**

Each `readme-examples.spec.ts` opens with a docblock asserting how many fenced blocks its README
holds and which case covers each. The number is **hand-transcribed**, and nothing compares it to
the file. `eval-core`'s has now been wrong twice — the plan's "8" and step 2's corrected "11", both
short by the indented fence inside the `onHookError` bullet — and corrected three times, step 6's
raise from 12 to 14 being the third.

The failure is quiet in exactly the way the gates track was built to prevent: a block added to a
README without a case still leaves a green suite and a docblock claiming full coverage, which is
[F3](#f3)'s own motivating shape one layer over. `grep -c '```javascript'` is the whole measurement.

**Distinct from [F10](#f10) and [F11](#f11)**, which bound what the *drift* gate sees. This one is
about the *execution* gate ([F4](#f4)) and is not covered by either: F10 is about symbols named but
not imported, F11 about the specifier a gated block may import from, and neither counts blocks.

**What it would take**: scan each gated README for its fence count and assert it against a constant
the spec already states, so the count moves deliberately. The root `README.md` stays out — it was
assessed and dropped by [F4](#f4), and 0 of its 11 blocks are runnable as printed.

**Re-measured 2026-09-16 and both counts are correct** — `eval-core`'s docblock claims 14
`javascript` blocks and the README holds 14 (13 at line start, plus the indented `onHookError`
fence a `^```` scan misses); `eval-signals`' claims 9 `ts` and 2 `sh` and the README holds 9 and 2.
**That is this entry's premise holding, not the gap closing.** Nothing was added that compares
either number to its file: the fence-reading specs in the repository —
`export-list.spec.ts` and `public-api.spec.ts`, in all three packages — read their READMEs for
symbol drift and count no blocks. The counts are correct today because someone re-ran them today,
which is the same standing this entry's numbers had the last two times they were right and then
silently were not. Dated because "correct" with no date reads as "fixed" to the next reader, and
[F7](#f7) is what that costs: a claim nobody re-ran travelled through twelve summaries and had to
have its locus corrected out from under it.

<a id="f15"></a>
## F15 — The downstream peer ranges exclude `eval-core` 0.6.0 — **Retired, fixed**

**Package** signals, forms · **Kind** fix (release coordination) · **Status** **Retired — fixed
by the 0.6.0 release preparation, 2026-09-26**; released the same day in `eval-signals` 0.1.3
and `eval-forms` 0.2.3, tagged f26f987. Recorded
2026-09-23 by the [A12](#a12) replay

**Fixed.** Both ranges widened to `">=0.3.0 <0.7.0"` in the same commit that bumps `eval-core` to
0.6.0, and **both downstream packages bumped**: `eval-signals` **0.1.3**, `eval-forms` **0.2.3**.
That settles the question this entry left open, and 0.5.0's precedent settled it the same way. A
widening without a bump would pass the workspace gate, but it would leave consumers on
`eval-signals` 0.1.2 and `eval-forms` 0.2.2, whose published manifests declare `<0.6.0` and
exclude the new `eval-core`. So publishing `eval-core` 0.6.0 forces both patches. `eval-signals`
0.1.3 also carries two JSDoc corrections that ship in its `.d.ts`. `eval-forms` 0.2.3 carries the
range alone. The lower bound stays `>=0.3.0`, for [F12](#f12)'s reason.

Both packages' READMEs quoted the range too, and both still said `<0.5.0`, because 0.1.2 and
0.2.2 widened the manifests and not the READMEs. That is [F14](#f14)'s class again. The same
commit brings both to `<0.7.0`.

The lint failure this entry predicted was not reproduced: the widening went in with the bump, so
no commit ever held the failing state.

---

**The entry as it stood:**

`modules/eval-signals/package.json` and `modules/eval-forms/package.json` both declare
`"@zvenigora/ng-eval-core": ">=0.3.0 <0.6.0"`. The A12 fix adds four published symbols to
`eval-core` (`CHANGELOG.md`, `[Unreleased]`). The repository has never shipped API in a patch, so
that fix ships in **0.6.0**, and both ranges exclude 0.6.0.

**This is [F12](#f12)'s shape, and the failure will look the same.** `@nx/dependency-checks` is
`'error'` in all three projects' `eslint.config.mjs`. At the moment `modules/eval-core/package.json`
reads `0.6.0`, it fails `eval-signals:lint` and `eval-forms:lint` with *"The version specifier does
not contain the installed version"*. **No green state exists between the bump and the widening**,
and `CONTRIBUTING.md` requires a green lint before any commit. F12 measured this exact case: its
second table sets `eval-core` to an inadmissible `0.6.0` and records both downstream projects
failing, naming `0.6.0`. That table measured the `<0.5.0` ranges of the time. This entry has not
re-measured against `<0.6.0`, because doing so means editing a manifest.

**The fix.** Widen both ranges to `>=0.3.0 <0.7.0`, **in the same commit as the bump or in an
earlier one**. Before the bump the widening is harmless: 0.5.0 falls within both the old range and
the new. After the bump it is required. 0.5.0 followed this pattern: `eval-signals` 0.1.2 and
`eval-forms` 0.2.2 widened in the same change as the bump.

**`nx run-many -t lint` is what catches it.** That gate is reliable now and was not in F12's time.
F12 found the failure only under `--skip-nx-cache`, because `lint`'s cache key did not cover a
sibling project's manifest. F12 then added `"^production"` to `nx.json`'s `lint` inputs, so a
cached run now misses and re-lints when `eval-core`'s `package.json` changes. **CI does not catch
it**, because CI runs no `lint` target ([`CLAUDE.md`](../CLAUDE.md), § Commands). The local
`run-many` gate is the only one.

**Not settled here: whether the widening bumps the two downstream packages.** Both have been done,
and each has its own evidence:

- **Widen without a bump.** Done 2026-09-20: both ranges went to `>=0.3.0 <0.7.0` with
  `eval-core` at 0.6.0, neither downstream version moved, and `nx run-many -t lint test build`
  passed for all three projects without the cache. The argument: a widening forced by another
  package's bump is not worth a release on its own. What it shows is that the workspace gate
  accepts it, not that consumers are served by it.
- **Bump both.** [F12](#f12)'s fix shipped patch releases 0.1.1 and 0.2.1, tagged 2026-09-16.
  That is the only one of the two that has actually been published.

That choice belongs to whoever runs the release.

*Recorded*: this entry; `docs/trace2/step-3.md` § "Left for the release", which is where it was
noted first and where a release would not look.
*Verified*: both manifests read 2026-09-23, `>=0.3.0 <0.6.0`; `@nx/dependency-checks` is
`'error'` in `modules/eval-signals/eslint.config.mjs` and `modules/eval-forms/eslint.config.mjs`;
`nx.json`'s `lint` inputs include `"^production"`. The lint failure itself is inferred from
F12's measurement, not reproduced here.

<a id="f16"></a>
## F16 — Workspace dependency advisories

**Package** repo · **Kind** fix · **Status** Open — **part 1 retired 2026-09-27**, part 2 open.
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

*Recorded*: this entry; `package.json` `overrides.nx`.
*Verified*: `npm audit --package-lock-only`, 2026-09-26. Before the override: 12 high, 9 moderate.
After: 0 high, 0 critical, 9 moderate, as listed above. Again 2026-09-27, after part 1: 0 at every
severity.

---

# Retired

Kept with their reasons. A retired entry tells the next reader the question was asked and answered.

<a id="r1"></a>
## R1 — `ASYNC_HOOK_MESSAGE`'s dangling `{@link}` — **Retired, fixed**

`eval-hooks.ts:37` carries an `{@link ASYNC_HOOK_MESSAGE}` that did not resolve for consumers because
the symbol was not exported. Carried as open through three side-effects step summaries, assigned to
Phase 1 step 6.

**Fixed.** `ASYNC_HOOK_MESSAGE` is exported from
[`eval/public-api.ts:12`](../modules/eval-core/src/lib/internal/classes/eval/public-api.ts#L12) and
reaches `src/public-api.ts` through the barrel. Verified 2026-09-06.

<a id="r2"></a>
## R2 — `model-source.spec.ts`'s "registrars are stubs" comment — **Retired, fixed**

A comment at `model-source.spec.ts:76-77` said "this step's registrars are stubs" in the present
tense — false from Phase 6 step 4 onward, and false for all three registrars after step 5. Deferred by
step 5 **into step 6's file list** rather than fixed in place, on the disposition that the next step to
work in the area owes the comment.

**Fixed.** Step 6 did it; no occurrence of `stub` remains in that file. Verified 2026-09-06.

Worth keeping as a record because it is the deferral pattern that *worked*: handed to a named step
whose file list already included the file, rather than to a phase.

<a id="r3"></a>
## R3 — `eval-core` missing its `release.version` blocks — **Retired, superseded**

Phase 3 step 6 decided deliberately that `eval-signals` would keep its `release.version` and
`nx-release-publish` config while `eval-core` was left alone. **The circumstance that decision rested
on is gone**, and it was not overturned on review.

Leaving `eval-core` without a `release.version` block was sound while the workspace versioned
**fixed**: a fixed group resolves one current version for every project and overrides each project's
own resolution, so `eval-core`'s resolver was never consulted for anything that survived.

Independent versioning removed the mask, and the divergence became three live behaviours:
`eval-core` read its version from `modules/eval-core/package.json` instead of its `eval-core@0.3.0`
tag; it wrote bumps into that **tracked source** manifest while its siblings wrote into gitignored
`dist/` ones; and `nx-release-publish` fell back to the project root, so publishing would have handed
npm `modules/eval-core` — source, with no build output in it.

**All three projects now carry the same blocks** (`currentVersionResolver: "git-tag"`,
`fallbackCurrentVersionResolver: "disk"`, `manifestRootsToUpdate: ["dist/{projectRoot}"]`, and
`nx-release-publish` with `packageRoot: "dist/{projectRoot}"`). Verified 2026-09-06.

The **CI test configuration** half of that step-6 divergence is untouched by this and is [F1](#f1).

<a id="r4"></a>
## R4 — Two false cross-references asserting [A8](#a8) was tracked — **Retired, corrected**

Two places stated that `EvalService._activeStates` was already recorded in `ROADMAP.md`'s deferred
defects. It never was, in any revision.

- [`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md) — "Pre-existing `eval-core`, already
  in `ROADMAP.md`'s deferred defects."
- `eval-signal.memory.spec.ts:99` — a comment citing `(ROADMAP.md, "Deferred defects")` beside
  the assertion that pins the behaviour. *(No longer linked. The line had already drifted, and
  [A8](#a8)'s step 2 replaced that case, comment and all, on 2026-09-25.)*

Six further documents — every `docs/forms/step-*-summary.md` § 5.3 tail — carried the item forward
without repeating the claim, which is why the item stayed visible while remaining untracked.

**Corrected 2026-09-06**: both sites now point at `docs/backlog.md`, [A8](#a8). Retired here rather
than deleted because the failure mode is the reason this file exists, and the next person tempted to
write "already tracked in X" without opening X should be able to read what it cost.
