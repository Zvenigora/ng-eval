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
| `@zvenigora/ng-eval-core` | 0.3.0 | tagged `eval-core@0.3.0` |
| `@zvenigora/ng-eval-signals` | 0.1.0 | tagged `eval-signals@0.1.0` |
| `@zvenigora/ng-eval-forms` | 0.2.0 | **no `eval-forms@0.2.0` tag exists** — see [F8](#f8) |

---

## Index

| ID | Entry | Package | Kind | Status |
| -- | ----- | ------- | ---- | ------ |
| [A1](#a1) | `await-expression.ts` downgrades a sync throw to a promise rejection | core | fix | Open |
| [A2](#a2) | `update-expression.ts` desyncs the value stack under `preserveParens` | core | fix | Open — standalone, [not a Phase 2 precondition](#phase-2-preconditions) |
| [A3](#a3) | `import-expression.ts` has a dead `afterVisitor` | core | fix | Open |
| [A4](#a4) | `EvalContext.getKey` — no namespace correction, and diverges from `get` | core | fix | Open, Covered |
| [A5](#a5) | Service-layer entry points discard the error they caught — **12 sites, 4 services** | core | fix | Open |
| [A6](#a6) | `safeCall` destroys the class of any error thrown through a call | core | fix | Open |
| [A7](#a7) | `EvalContext.getThis` reads `_original` in its `priorScopes` loop | core | fix | Open |
| [A8](#a8) | `EvalService._activeStates` grows unboundedly | core | fix | Open, Covered |
| [A9](#a9) | The arrow-scope leak's root cause — no `try`/`finally` at either push site | core | fix | Contained, Premise retired — **[Phase 2 step 0](#phase-2-preconditions)** |
| [B1](#b1) | The `!isPrimitive` carve-out in `member-expression.ts` | core | decision → fix | Open, Covered |
| [B2](#b2) | `pattern.ts:83` logs the whole `EvalState` | core | fix | Open — **[Phase 2 step 0](#phase-2-preconditions)** |
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
| [D10](#d10) | `applyErrorPolicy` has no runnable README block | forms | docs | Open |
| [D11](#d11) | `/signals` has no worked example | forms | docs | Open |
| [D12](#d12) | ~20 specs discard the binding and never call `destroy()` | forms | test hygiene | Open |
| [E1](#e1) | Form-state keys across both adapters | forms | phase | Open — **no phase reserved** |
| [E2](#e2) | Arrays — `applyEach` at `/signals`, `FormArray` at `/reactive` | forms | phase | Open |
| [E3](#e3) | `dependencies` introspection at form scale | forms | phase | Open |
| [E4](#e4) | Short-circuiting / value-rewriting hooks | core | phase | Open, by design |
| [E5](#e5) | The options-first style cannot read `hookErrors` | core | decision | Open, Premise retired |
| [E6](#e6) | `exit` has no mark to bound its scan | core | fix | Open — **[Phase 2 design constraint](#phase-2-preconditions)** |
| [F1](#f1) | No `configurations.ci` on the `test` target — **two projects, not one** | signals, forms | fix + decision | Open |
| [F2](#f2) | One `CHANGELOG.md` for three independently-versioned packages | repo | decision | Open |
| [F3](#f3) | Documented-symbol drift gate | core | fix | Open |
| [F4](#f4) | README-execution gate for `eval-core` and `eval-signals` | core, signals | fix / decide-then-drop | Open |
| [F5](#f5) | The `js-sha256` peer range is locked to a dead minor | core | decision | Open |
| [F6](#f6) | CONTRIBUTING's "Code style" describes a config that never existed here | repo | decision (editorial) | Open |
| [F7](#f7) | `eval-core`'s Jest run warns about a worker process | core | fix | Open — **12 summaries, never an entry** |
| [F8](#f8) | `eval-forms@0.2.0` is untagged; CLAUDE.md describes a pre-Phase-6 repo | repo | fix | Open |
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
| [E6](#e6) | **Makes it reachable, but through the design itself.** Loop completion — "skip the rest of the block" — is exactly the unmatched-`after` shape `exit` cannot bound | **A design section of Phase 2's plan**, not a step ahead of it |
| [A2](#a2) | **Nothing.** `(a)++` under `preserveParens` is no more reachable after Phase 2 than before | **Standalone fix, whenever** |

**Step 0 is [A9](#a9) + [B2](#b2), one session.** Both are small, both are strictly-before, and
neither needs Phase 2's design settled: A9 is a `try`/`finally` at two sites plus specs proving
the pop survives a throw, B2 is a deletion. The cost asymmetry is what makes them step 0 rather
than cleanup — fixing A9 first sets the idiom the five new visitors copy; fixing it afterwards
means auditing seven sites, by which time the two originals have been read as precedent.

**[E6](#e6) is a constraint on the design, not a queue item.** Bounding `exit`'s scan with a
mark and choosing the completion-value mechanism are one decision seen twice. Discharging it
ahead of the plan would mean designing the mark without knowing what it has to bound.

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
## A2 — `update-expression.ts` desynchronizes the value stack under `preserveParens`

**Package** core · **Kind** fix · **Status** Open

`updateExpressionVisitor`'s `if`/`else if` chain handles `Identifier` and `MemberExpression`
arguments and falls through silently for anything else — pushing nothing, but still calling
`afterVisitor`
([`update-expression.ts:19-37`](../modules/eval-core/src/lib/internal/visitors/update-expression.ts#L19-L37)).
`ParserOptions` is `Partial<acorn.Options> & {…}` (`internal/interfaces/parser-types.ts:3`), so a
consumer may pass `preserveParens: true`, and `(a)++` then parses with
`argument.type === 'ParenthesizedExpression'` (verified against the acorn in this repo).

The result is a wrong value for every node downstream of it, not merely an untidy bracket. This
one is a real defect with a real route to it and deserves a proper fix — a
`ParenthesizedExpression` visitor, or unwrapping the argument here — rather than triage.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md).
*Verified*: source read, 2026-09-06.

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

*Recorded*: [`side-effects/step-4-summary.md` § 5.2](side-effects/step-4-summary.md);
[`signals/phase-3-plan.md` § 3.6.4 gap 2](signals/phase-3-plan.md).
*Verified*: source read, 2026-09-06 — no `lookups` loop, no namespace check.

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

**Package** core · **Kind** fix · **Status** Contained, Premise retired

The third stack invariant in `CLAUDE.md`: exactly one `st.context.pop()` per
`st.context.push()`, on every exit path including the ones an exception takes. Only two visitors
push scopes and **neither uses `try`/`finally`**, so a body that throws skips the pop:

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
§ 3.8.3 says so in as many words while ruling it out of *that* phase's scope.

*Recorded*: `CLAUDE.md`; [`signals/phase-3-plan.md` § 3.8.3](signals/phase-3-plan.md);
[`forms/phase-4-plan.md` § 9.1](forms/phase-4-plan.md).
*Verified*: source read, 2026-09-06 — no `try` at either site.

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

**Package** core · **Kind** fix · **Status** Open — **[Phase 2 step 0](#phase-2-preconditions)**

`eval-core` has ~20 `console.*` calls in source. Most are unreachable and tree-shaken; **four
reach the published FESM bundle**, verified by building and grepping
`dist/modules/eval-core/fesm2022/`. This entry is one of them; the other three are [B3](#b3).

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

*Verified*: source read, 2026-09-06.

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

**Package** forms · **Kind** docs · **Status** Open

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

**Package** core · **Kind** fix · **Status** Open — **[Phase 2 design constraint](#phase-2-preconditions)**

`EvalHooks.exit` cannot distinguish "absent from this walk" from "absent from the stack", so a node
open only in an *enclosing* walk would fall into case 2 and the flush would cross the walk boundary.

**Unreachable today** — it needs an `afterVisitor` with no matching `beforeVisitor` in the same
frame, which no visitor produces.

**Phase 2 is what makes it reachable.** Statement support needs a way to short-circuit — "skip the
rest of the block" — which is an early exit out of a statement list, and that is exactly the shape
that produces an unmatched `after`. Phase 1 step 3 already wrote that it is "worth not making
reachable by accident"; Phase 2 is the accident it anticipated.

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

**Package** signals **and** forms · **Kind** fix + decision · **Status** Open

`modules/eval-core/project.json` gives its `test` target a `configurations.ci` block
(`ci: true`, `coverage: true`). Neither `modules/eval-signals/project.json` nor
`modules/eval-forms/project.json` has any `configurations` on `test` at all. So
`nx test <project> --configuration=ci` does not exist for two of three libraries, and any CI job
that starts asking for coverage per project gets it from one and not the others.

**The entry this replaces named `eval-signals` only** — it was written in Phase 3 step 6, before
`eval-forms` existed, and nobody widened it when Phase 4 shipped a third project with the same gap.
Corrected here 2026-09-06 by reading all three `project.json` files.

Today's workflow runs `npm test` — plain `nx run-many -t test` — so nothing is red and nothing is
missing coverage that was previously reported.

Fixing it is a few lines of `project.json` per project plus a decision about whether coverage
thresholds should gate CI, which is the part worth deciding rather than copying.

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

**Package** core · **Kind** fix · **Status** Open

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

**Package** core, signals · **Kind** fix (signals) / decide-then-maybe-drop (core) · **Status** Open

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
## F7 — `eval-core`'s Jest run warns about a worker process

**Package** core · **Kind** fix · **Status** Open

`A worker process has failed to exit gracefully` on `eval-core:test`. Confined to `eval-core` —
confirmed by running each project separately — and present in the baseline of every phase since
Phase 3.

**Carried in twelve step summaries and never once promoted to an entry**, from
[`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md) through
[`forms/phase-6-step-6-summary.md` § 4.3](forms/phase-6-step-6-summary.md), each time as
"pre-existing; carried unchanged". Twelve sessions noticed it and none owned it, which is [A8](#a8)'s
failure mode in a lower-stakes register: a note that travels forward is not a note that gets acted on.

Most likely an open handle — a timer or a listener a spec leaves behind. `--detectOpenHandles` is the
first step.

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
