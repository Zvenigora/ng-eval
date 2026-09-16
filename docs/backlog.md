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

[`docs/gates/plan.md`](gates/plan.md) — "Track 3", the documentation and CI gates — plans
[F1](#f1), [F3](#f3), [F4](#f4), [F7](#f7) and [D10](#d10) as five steps. It ships no exported
symbol and bumps no version, and it is ordered ahead of Phase 2 because F3 and F4 build gates
every later phase inherits. [D11](#d11) was deliberately left out of it; that entry says why.

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
| `@zvenigora/ng-eval-core` | 0.4.0 | Phase 2, statements. **No `eval-core@0.4.0` tag exists yet** — [F8](#f8) |
| `@zvenigora/ng-eval-signals` | 0.1.1 | Phase 2 step 7: peer range only. **No `eval-signals@0.1.1` tag exists yet** — [F8](#f8). 0.1.0 is tagged |
| `@zvenigora/ng-eval-forms` | 0.2.1 | Phase 2 step 7: peer range only. **Neither `eval-forms@0.2.0` nor `@0.2.1` is tagged** — [F8](#f8) |

**Phase 2 released all three.** `eval-core` 0.4.0 is the phase; the two patch releases carry one
manifest field each and no code ([F12](#f12)). Three of these five versions want tags and none has
one, which is [F8](#f8)'s subject and now its size.

---

## Index

| ID | Entry | Package | Kind | Status |
| -- | ----- | ------- | ---- | ------ |
| [A1](#a1) | `await-expression.ts` downgrades a sync throw to a promise rejection | core | fix | Open |
| [A2](#a2) | `update-expression.ts` desyncs the value stack under `preserveParens` | core | fix | Open — standalone, [not a Phase 2 precondition](#phase-2-preconditions) |
| [A11](#a11) | `evaluateObjectPattern` resolves the *value* name against the argument — renaming **and** nested destructuring bind the wrong key | core | fix | Open — **live on the default path**; found Phase 2 step 3 |
| [A12](#a12) | `EvalResult.trace` grows per loop iteration — the iteration budget bounds time, not memory | core | fix / decision | Open — **created by Phase 2 step 5**; 700 k items for a 100 k-iteration loop |
| [A3](#a3) | `import-expression.ts` has a dead `afterVisitor` | core | fix | Open |
| [A4](#a4) | `EvalContext.getKey` — no namespace correction, and diverges from `get` | core | fix | Open, Covered — **wider than it reads; [A10](#a10) argues it is one defect with A10** |
| [A10](#a10) | `getKey`'s scopes step reports every key present against a plain-object scope | core | fix | Open — **latent, not live**; blocks any fix to [A4](#a4) |
| [A5](#a5) | Service-layer entry points discard the error they caught — **12 sites, 4 services** | core | fix | Open |
| [A6](#a6) | `safeCall` destroys the class of any error thrown through a call | core | fix | Open |
| [A7](#a7) | `EvalContext.getThis` reads `_original` in its `priorScopes` loop | core | fix | Open |
| [A8](#a8) | `EvalService._activeStates` grows unboundedly | core | fix | Open, Covered |
| [A9](#a9) | The arrow-scope leak's root cause — no `try`/`finally` at either push site | core | fix | **Fixed**, Phase 2 step 0 |
| [B1](#b1) | The `!isPrimitive` carve-out in `member-expression.ts` | core | decision → fix | Open, Covered |
| [B2](#b2) | `pattern.ts:83` logs the whole `EvalState` | core | fix | **Fixed**, Phase 2 step 0 |
| [B3](#b3) | Three service-layer `console.*` calls reach the published bundle | core | decision | Open |
| [B4](#b4) | `eval-core.component.ts` is dead generator scaffold | core | fix | Open |
| [C1](#c1) | A member-target write escapes the read-only policy | signals | decision | Open, Covered |
| [C2](#c2) | Detect a write violation at construction, not first recompute | signals | decision | Open |
| [C3](#c3) | Whether `eval-signals` should work around [A4](#a4) locally | signals | decision | Open — **decision point passed unrecorded** |
| [D1](#d1) | The throwing-subscriber premise is false in both halves | forms | fix + decision | Open, Premise retired |
| [D2](#d2) | Should `/reactive` reject prototype-shadowed identifiers too? | forms | decision, breaking | Open |
| [D3](#d3) | Per-registration `caseInsensitive` reaches one of three levers | forms | decision | Open, Covered |
| [D4](#d4) | A top-level model key holding a signal is returned un-called | forms | fix or doc | Open, partly documented |
| [D5](#d5) | Two dead lookups run ahead of ours on every resolution | forms | fix (perf) | Open |
| [D6](#d6) | The `typeof key === 'string'` guard is unfalsifiable by the suite | forms | decision | Open |
| [D7](#d7) | `toSignal`'s `assertNotInReactiveContext` throws out of the mirror | forms | accepted | Open, documented |
| [D8](#d8) | `warnOnNestedSignals` runs once, at construction | forms | accepted | Open, documented |
| [D9](#d9) | § 3.4.3's precedence rule is untested end to end | forms | test gap | Open, Premise retired |
| [D10](#d10) | `applyErrorPolicy` has no runnable README block | forms | docs | **Retired — fixed**, and it created [F3](#f3)'s third gate's subject |
| [D11](#d11) | `/signals` has no worked example | forms | docs | Open |
| [D12](#d12) | ~20 specs discard the binding and never call `destroy()` | forms | test hygiene | Open |
| [E1](#e1) | Form-state keys across both adapters | forms | phase | Open — **no phase reserved** |
| [E2](#e2) | Arrays — `applyEach` at `/signals`, `FormArray` at `/reactive` | forms | phase | Open |
| [E3](#e3) | `dependencies` introspection at form scale | forms | phase | Open |
| [E4](#e4) | Short-circuiting / value-rewriting hooks | core | phase | Open, by design |
| [E5](#e5) | The options-first style cannot read `hookErrors` | core | decision | Open, Premise retired |
| [E6](#e6) | `exit` has no mark to bound its scan | core | fix | **Retired — fixed, Phase 2 step 1; its "Phase 2 makes it reachable" premise was wrong** |
| [F1](#f1) | No `configurations.ci` on the `test` target — **two projects, not one** | signals, forms | fix + decision | **Retired — fixed, no thresholds** |
| [F2](#f2) | One `CHANGELOG.md` for three independently-versioned packages | repo | decision | Open |
| [F3](#f3) | Documented-symbol drift gate — **three packages, four READMEs** | core, signals, forms | fix | **Retired — built and green** |
| [F4](#f4) | README-execution gate for `eval-core` and `eval-signals` | core, signals | fix / decide-then-drop | **Retired** — both package READMEs gated; root **assessed and dropped** |
| [F5](#f5) | The `js-sha256` peer range is locked to a dead minor | core | decision | Open |
| [F6](#f6) | CONTRIBUTING's "Code style" describes a config that never existed here | repo | decision (editorial) | Open |
| [F7](#f7) | Intermittent Jest worker-teardown warning — **no established locus**, possibly Nx/Jest rather than a library | — | fix? | Open — locus corrected 2026-09-09; **not reproducible per project** |
| [F8](#f8) | **Four** untagged published versions; CLAUDE.md half done | repo | fix | Open — **widened by Phase 2**: `eval-core@0.4.0`, `eval-signals@0.1.1`, `eval-forms@0.2.1` join `eval-forms@0.2.0`; systematic, not a slip |
| [F9](#f9) | No gate on document cross-references — the register's own dangling links | repo | fix | Open — deferred by [plan](gates/plan.md) § 8.4; **first concrete instance recorded 2026-09-13** |
| [F10](#f10) | The drift gate covers documented-**and-imported** symbols only | core, signals, forms | fix | Open — the gap [F3](#f3) leaves |
| [F11](#f11) | A gated README can only import from its own specifier | core, signals, forms | fix | Open — bounds [F3](#f3) and [F4](#f4) |
| [F12](#f12) | The downstream peer ranges exclude `eval-core` 0.4.0 — **and fail both downstream `lint` targets** | signals, forms | fix | **Retired — fixed, Phase 2 step 7**; both ranges widened, and `lint`'s cache inputs with them |
| [F13](#f13) | Nothing gates the README block count `readme-examples.spec.ts` claims | core, signals, forms | test gap | Open — the count has been wrong twice |
| [F14](#f14) | Six sites cite the retired `^0.3.0` range, two of them in published READMEs | signals, forms | fix (comments, docs) | **Retired — fixed, Phase 2 step 8**; filed as four sites, was six |
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
spite of [A1](#a1)–[A3](#a3), so none is urgent — but none is gone either, and the value stack
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

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md) (member 1);
[`statements/phase-2-plan.md` § 1.7](statements/phase-2-plan.md) (members 2 and 3).
*Verified*: source read, 2026-09-06; members 2 and 3 measured against `dist/`, 2026-09-10.

<a id="a11"></a>
## A11 — `evaluateObjectPattern` binds the key from the pattern and the value from the *wrong name*

**Package** core · **Kind** fix · **Status** Open — live on the default path

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

*Recorded*: this entry, 2026-09-13.
*Verified*: measured against the working tree at Phase 2 step 3, 2026-09-13.

<a id="a3"></a>
## A3 — `import-expression.ts` has a dead `afterVisitor`

**Package** core · **Kind** fix (cosmetic) · **Status** Open

`importExpressionVisitor` calls it after an unconditional throw
([`import-expression.ts:13-15`](../modules/eval-core/src/lib/internal/visitors/import-expression.ts#L13-L15)),
so the line can never run. Nothing breaks. Tidy when that visitor is next touched.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md).
*Verified*: source read, 2026-09-06.

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
| `EvalService` | `simpleEval` | [135](../modules/eval-core/src/lib/actual/services/eval.service.ts#L135) | yes |
| `EvalService` | `eval` | [162](../modules/eval-core/src/lib/actual/services/eval.service.ts#L162) | yes |
| `EvalService` | `simpleEvalAsync` | [190](../modules/eval-core/src/lib/actual/services/eval.service.ts#L190) | **no** |
| `EvalService` | `evalAsync` | [217](../modules/eval-core/src/lib/actual/services/eval.service.ts#L217) | **no** |
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

**Package** core · **Kind** fix · **Status** Open, Covered

**This entry is why this file exists.** See [R4](#r4) for the cross-references that hid it.

`EvalService.createState` adds every state it builds to a strong `Set`
([`eval.service.ts:41`](../modules/eval-core/src/lib/actual/services/eval.service.ts#L41)), and
nothing removes an entry. The set is drained only in `ngOnDestroy`
([`:99`](../modules/eval-core/src/lib/actual/services/eval.service.ts#L99)). `EvalService` is
`providedIn: 'root'`, so that is application teardown.

Every `simpleEval` / `simpleEvalAsync` call therefore retains its `EvalState` — and with it the
AST, the value stack, the trace and anything a hook closure captured — for the life of the
application. The cost grows with uptime and with call volume, which is the profile of a
long-running form or dashboard: exactly this repository's stated audience.

**"The trace" became a much larger term in Phase 2 step 5** — see [A12](#a12). It used to be
bounded by the expression's node count; with `for` loops registered, one retained state can hold
hundreds of thousands of trace items. The two entries compound: A12 is how much one state can hold,
A8 is why it is never released.

**It compounds two other entries.** [`phase-1-plan.md:1095`](side-effects/phase-1-plan.md)
records that because the `Set` is strong, frames abandoned on the open-node stack keep their AST
nodes alive "for the life of the service, which is exactly the retention `ngOnDestroy` is called
to prevent". And a leaked scope from [A9](#a9) sits on a context those retained states reference.

**Covered, in a way a fix must plan for.** Two specs read the private field:

- [`eval.service.memory-leaks.spec.ts:97-103`](../modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts#L97-L103)
  asserts the set is non-empty before `ngOnDestroy` and empty after — so it pins the current
  behaviour in both directions.
- [`eval-signal.memory.spec.ts:79-102`](../modules/eval-signals/src/lib/eval-signal.memory.spec.ts#L79-L102)
  uses it as a **contrast probe** in a different library: it is the reason `createEvalSignal`
  builds its states through `CompilerService` instead. A fix turns that spec red at one named
  line, and the comment above it says so.

So a fix is not one file. It is: drain the set at the end of each evaluation (or make it weak),
update the `eval-core` spec that pins non-drainage, and update the `eval-signals` contrast probe
whose whole point is that the two paths differ.

*Recorded*: originated [`side-effects/phase-1-plan.md:1095`](side-effects/phase-1-plan.md) and
[`side-effects/step-2-summary.md` § 4.2](side-effects/step-2-summary.md); stated as its own item
in [`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md); carried forward in all six
`docs/forms/step-*-summary.md` § 5.3 tails.
*Verified*: source read, 2026-09-06.

<a id="a9"></a>
## A9 — The arrow-scope leak's root cause: no `try`/`finally` at either push site

**Package** core · **Kind** fix · **Status** **Fixed** — Phase 2 step 0, 2026-09-11

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

**Package** core · **Kind** fix / decision · **Status** Open — **created by Phase 2 step 5**, found
in its review

`pushVisitorResult` appends to `st.result.trace` on **every** push
([`visitor-result.ts:7`](../modules/eval-core/src/lib/internal/visitors/visitor-result.ts#L7)),
unguarded, and `EvalResult.start()` does not reset the trace — the array is built once in the
constructor and accumulates for the life of the state.

Before this step the trace was bounded by the expression's **node count**. With `ForStatement`
registered it is bounded by **iterations × nodes**, which is a different order of quantity from a
fixed expression. Measured against `dist/` after `build:production`, on the code this step ships:

| source | trace items |
| ------ | ----------- |
| `for (let i = 0; i < 100000; i++) { i }`, `maxIterations: Infinity` | **700,007** |
| `for (;;) { i }`, default budget, to the throw | **300,000** |
| `for (let i = 0; i < 1000; i++) { i }` three times on one state | 7,007 → 14,014 → 21,021 |

Roughly 45 MB of heap for the first, though heap deltas measured without a forced collection are
soft; the **item counts are the firm number** and are what a fix would have to bound.

**Two things make this worth an entry rather than a shrug.** The trace **survives the throw** — the
runaway case pays the whole allocation and *then* raises, so the budget converts a hang into a
large allocation plus an error rather than into a cheap error. And [A8](#a8) keeps every
`EvalService`-created state in a strong `Set` for the life of the application, so under `simpleEval`
that memory is retained. A8 already says a retained state keeps "the trace"; what it could not
anticipate is that one expression can now put ~700 k items in one.

**`maxIterations: Infinity` is the sharp edge.** The plan's § 3.4 offers it as "a caller may raise
it, or set `Infinity` and own the consequence", and the consequence it had in mind was a hang. With
the trace unbounded the consequence is an out-of-memory instead. The option's docblock now says so;
that is documentation, not a fix.

**Not fixed in step 5, and the reason is scope rather than difficulty.** Capping or per-run
resetting `EvalTrace` changes what `EvalResult.trace` contains on an already-published path —
a versioned-release decision, and one that belongs with whoever decides what the trace is *for*
(it is the dependency-tracking channel `eval-signals` and `eval-forms` were built against). Step 5's
file list does not admit `eval-result.ts` or `visitor-result.ts`, and widening it under a
performance observation is the move this register exists to prevent.

**Options, for whoever takes it**: a cap with a documented truncation marker; a
`trace: false` option; resetting per `evaluate` in `start()` (which changes the documented
accumulate-across-runs behaviour the `createState` + repeated `eval` style relies on); or
recording loop bodies once rather than per iteration. None is obviously right, which is why this
is filed rather than guessed at.

*Found*: 2026-09-14, Phase 2 step 5 review.
*Measured*: 2026-09-14 against the built package, numbers above, re-run independently of the
review that raised it.
*Recorded*: this entry; [`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts)'s
`maxIterations` docblock; cross-referenced from [A8](#a8).

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

**Package** core · **Kind** fix · **Status** **Fixed** — Phase 2 step 0, 2026-09-11

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
## B3 — Three service-layer `console.*` calls reach the published bundle

**Package** core · **Kind** decision · **Status** Open

| Site | Call |
| ---- | ---- |
| [`parser.service.ts:67`](../modules/eval-core/src/lib/actual/services/parser.service.ts#L67) | `console.debug('Parser cache cleared…')` |
| [`eval.service.ts:96`](../modules/eval-core/src/lib/actual/services/eval.service.ts#L96) | `console.warn('Error cleaning up EvalState:', error)` |
| [`eval.service.ts:108`](../modules/eval-core/src/lib/actual/services/eval.service.ts#L108) | `console.warn('Error cleaning up Context:', error)` |

Decide whether these become the `isDevMode()` carve-out (`CLAUDE.md`, Conventions), a no-op, or
stay. Not behavioural. Note the two `eval.service.ts` calls sit inside `ngOnDestroy`'s cleanup
loop, which is the same method [A8](#a8) touches — if A8 is fixed, revisit these in the same
step rather than separately.

<a id="b4"></a>
## B4 — `eval-core.component.ts` is dead generator scaffold

**Package** core · **Kind** fix · **Status** Open

[`modules/eval-core/src/lib/eval-core/`](../modules/eval-core/src/lib/eval-core/) holds an empty
`EvalCoreComponent` plus a stray `ngEval()` that parses `"1 + 1"` and logs the result. Nothing
imports it but its own spec, and it is **not** in the FESM bundle, so this is dead source rather
than a published-surface problem. It carries a template, a stylesheet and a spec with it — four
files.

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
## D6 — The `typeof key === 'string'` guard is unfalsifiable by the suite

**Package** forms · **Kind** decision · **Status** Open

Removing it changes no observable: `readProperty(model, 42, …)` returns `undefined` anyway and a
`Map` entry under a non-string key is unreadable. Belt and braces, kept — but its docblock
overstates the harm, and by `CLAUDE.md`'s own rule an assertion that cannot fail is worth less than
no assertion. Either make the docblock honest about what it is, or find the case that falsifies it.

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

**Package** forms · **Kind** test gap · **Status** Open, Premise retired

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

**Package** core · **Kind** fix · **Status** **Fixed — Phase 2 step 1, 2026-09-12**; the premise
that Phase 2 makes it reachable was **wrong**, and is corrected below

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

**Package** repo · **Kind** decision (editorial) · **Status** Open

[`CONTRIBUTING.md:42`](../CONTRIBUTING.md#L42) links to `.eslintrc.json`. That file does not exist —
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
## F8 — `eval-forms@0.2.0` is untagged, and CLAUDE.md describes a pre-Phase-6 repo

**Package** repo · **Kind** fix · **Status** Open

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

**Open: the tag, and whether 0.2.0 is actually on npm.**

**Widened by Phase 2, 2026-09-16 — it is now three missing tags, not one.** The phase released
`eval-core` **0.4.0** (step 6) and, in step 7, `eval-signals` **0.1.1** and `eval-forms` **0.2.1**.
None of the three is tagged, so `git tag --list` still ends at the same three tags it had before
Phase 2 opened while three `package.json`s have moved past them.

The entry's original question — *was the tag missed, or was the version never published?* — is now
asked of four versions at once, and Phase 2 cannot answer it for its own three: this branch is
unmerged and nothing has been published from it. What Phase 2 does establish is that the gap is
**systematic rather than a one-off slip**, which is how the entry read at one instance. Three
consecutive releases across two phases produced zero tags, so nothing in the procedure produces
them and no gate notices — the same shape as [F3](#f3) and [F4](#f4) before those were built, and
the argument for a release checklist rather than four individual corrections.

`CONTRIBUTING.md` documents version bumps by hand; whether it documents tagging, and whether
`nx release` is meant to be doing it (each `project.json` carries a `release.version` block with
`currentVersionResolver: "git-tag"`, which **reads** tags it may be relying on something else to
write), is the first thing to check. A resolver that falls back to disk when no tag exists will
silently keep working while the tags it was configured to read go missing.

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

**Package** core, signals, forms · **Kind** test gap · **Status** Open — recorded Phase 2 step 6,
2026-09-15

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
- [`eval-signal.memory.spec.ts:99`](../modules/eval-signals/src/lib/eval-signal.memory.spec.ts#L99) —
  a comment citing `(ROADMAP.md, "Deferred defects")` beside the assertion that pins the behaviour.

Six further documents — every `docs/forms/step-*-summary.md` § 5.3 tail — carried the item forward
without repeating the claim, which is why the item stayed visible while remaining untracked.

**Corrected 2026-09-06**: both sites now point at `docs/backlog.md`, [A8](#a8). Retired here rather
than deleted because the failure mode is the reason this file exists, and the next person tempted to
write "already tracked in X" without opening X should be able to read what it cost.
