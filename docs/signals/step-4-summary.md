# Phase 3 — Step 4 Summary: Lifetime and cleanup

**Date**: August 15, 2026
**Plan**: [`phase-3-plan.md`](./phase-3-plan.md) § 4, Step 4
**Target package**: `@zvenigora/ng-eval-signals` (`modules/eval-signals`, v0.0.1)
**Commit**: `49db353`
**Status**: complete — lint clean, `eval-signals` 5 suites / 93 tests, `eval-core` unchanged
at 41 suites / 717 tests, production build clean

---

## 1. What was built

`destroy()` finished, the two producers made to agree, and the arrow-scope leak contained.
Nothing in `eval-core` was touched.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `src/lib/eval-signal.ts` | edit | `DestroyRef` registration + release; the destroy-time version bump; the `destroyed` guard on `invalidate()`; the scope-depth guard in `evaluate()` |
| `src/lib/eval-signal.memory.spec.ts` | **new** | 6 cases: state freshness and retention, per-recompute hook lifecycle, three `DestroyRef` cases, the containment |
| `src/lib/eval-signal.spec.ts` | edit | +3 destroy cases: reads `undefined` on destroy, `invalidate()` inert, the producer pairing |
| `src/lib/eval-signal.service.ts` | edit | doc comment only — a **sanctioned deviation**, § 3 below |
| `src/lib/signal-context.spec.ts` | edit | the pinned scope-leak limitation re-scoped; every assertion unchanged |
| `docs/signals/phase-3-plan.md` | edit | § 3.8.1 – 3.8.3; step 4's bullets and exit criteria corrected; step 6 gains two README items |

No API was added. `EvalSignal`, `EvalSignalOptions` and `EvalSignalService` keep the shapes
step 3 published; what changed is behaviour behind `destroy()` and `invalidate()`, and the
documentation of both. § 5's surface list is untouched, and `src/lib/` gained no new
`eval-core` import — `DestroyRef` is `@angular/core`.

### Behaviour worth recording

- **`options.injector` resolves services; it does not scope lifetime.** The rule the step
  exists to establish (§ 3.8.1). Reading a supplied injector as a lifetime scope would
  register a teardown callback on the **root** injector — `EvalSignalService.create` passes
  exactly that — once per signal ever created, retained for the life of the application.
  Fourth instance of § 3.2.2's accumulator pattern, and the third to arrive disguised as the
  cleanup mechanism.
- **Angular 22 has no non-throwing "am I in an injection context" predicate.**
  `isInInjectionContext` is absent from the public typings *and* from the runtime export list
  (checked, not assumed); only `assertInInjectionContext`, which throws. So the ambient
  context is inferred from the branch that already calls `inject(CompilerService)` — if that
  did not throw, a context exists. The alternative, `try { inject(DestroyRef) } catch {}`,
  loses on two counts: it swallows unrelated errors, and it would auto-register in the one
  case the rule above says the consumer has taken ownership.
- **`destroy()` bumps the version once, and that is what makes the two producers agree.**
  Not in the plan, and required. As step 3 shipped it, a destroyed signal kept serving its
  cached value until some dependency happened to move, and only then flipped to `undefined` —
  so the destroyed value depended on *which* producer got there first, which is precisely
  what the plan asked step 4 to eliminate. With the bump, a destroyed signal reads `undefined`
  from that moment, neither producer can change it again, and `invalidate()` is inert in
  substance rather than by convention. It also weakens no existing assertion: step 3's
  `describe('destroy')` case still passes verbatim.
- **A `DestroyRef` cannot be stubbed.** An explicit `{ provide: DestroyRef, useValue }` loses
  to the injector's intrinsic one, through both `Injector.create` and
  `createEnvironmentInjector` — probed rather than assumed, after the first draft of the
  release spec failed for that reason.
- **Releasing a `DestroyRef` registration has no behavioural surface.** `destroy()` is
  idempotent, so a callback the injector still holds does nothing observable when it fires;
  the difference is retention alone. Hence the one assertion in this step that counts a
  private (`_onDestroyHooks`), in the style of `eval-core`'s memory spec counting
  `_activeStates`.
- **The teardown wrapper clears its handle before calling `destroy()`.** `R3Injector.destroy`
  iterates `_onDestroyHooks`; an injector-driven teardown that turned around and spliced that
  array mid-iteration could skip another consumer's hook. A hand-called `destroy()` still
  removes it.

---

## 2. Design questions settled during the step

- **The scope-leak containment (§ 3.8.3), and the surface question that decided it.** Asked
  first, as instructed: 0.3.0 *does* expose a public read and truncate — `EvalContext.scopes`
  (live `Stack` getter), `Stack.length`, `EvalContext.pop()`. So snapshot/restore was
  available and the choice was not forced down to rebuild-per-recompute (a § 3.2 reversal) or
  document-and-accept.
- **Where it lives — § 3.2.2 versus the option's own wording.** § 3.2.2 says containment lives
  "at the adapter… the `EvalContext` it constructs, which it is free to subclass". That worked
  for writes because `set` **is** the seam. There is none here: the leak is the *absence* of a
  `pop`, and a context subclass gets no signal for "the walk ended". Only the caller of
  `call()` knows the boundary. Resolved: § 3.2.2's "at the adapter" is a claim about which
  library owns the fix, not which file.
- **`invalidate()` after `destroy()` (§ 3.8.2), settled with one addition to what was
  confirmed.** The no-op stands and nothing is reversed — but the reasoning "a destroyed
  signal already reads `undefined`" was only true after some producer moved. Making it true
  unconditionally is the destroy-time bump above. Recorded so it stops being a live choice.
- **The exit criterion's own probe was vacuous.** "A `createState` count that does not move"
  cannot distinguish an inert `invalidate()` from step 3's fall-through: after `destroy()`
  the compiled callback is gone, so `evaluate()` returns before building a state under both.
  Replaced with an `equal` comparator spy, which a `computed` invokes only when it has
  actually re-run. Confirmed by probe — see § 4.

---

## 3. Deviations from the plan's literal sketch

- **`eval-signal.service.ts` was added as a fifth file, agreed mid-step.** § 3.8.1 is this
  step's decision and it is what falsified the file's doc comment: the class doc claimed the
  two styles "differ in where the injector comes from and in nothing else", and `create()`'s
  that it "adds one thing… which is the injector". Both are now wrong. The class doc's own
  worked example — a component field initializer through the service — is exactly the case
  that silently loses auto-teardown, so it gained an `ngOnDestroy`. Deferring to step 6 was
  rejected: the text ships in `dist/`'s `.d.ts` (verified present after the build) and is what
  a consumer reads on IDE hover, which a README never reaches.
- **"After `destroy()`, the read hook is unregistered, hook bookkeeping is reset" was
  corrected rather than satisfied.** Step 3 unsubscribes the tracker in a `finally` *inside*
  each recompute, so nothing is registered by the time `destroy()` runs and an assertion there
  would pass against an implementation that does nothing. The real invariant — the
  unsubscribe happens **per recompute** — is asserted where it happens, across N of them.
- **"Reach the states through a read hook's `event.state` under `trackDependencies: true`" is
  not reachable**: that combination throws by design (§ 3.4), and the factory's own tracker is
  not visible from a spec. The documented escape hatch — the same tracker on a registry the
  caller owns — reaches the same events, and is what the spec uses.
- **The pinned limitation was re-scoped, not replaced.** `signal-context.spec.ts` keeps every
  assertion; its *claim* narrowed from "the context is poisoned for its whole life" to "on
  this path", with the containment's own case cross-referenced.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-signals:lint` | clean |
| `eval-signals:test` | 5 suites / 93 tests |
| `eval-signals:build:production` | clean → `dist/modules/eval-signals` |
| `eval-core:lint` | clean, unchanged |
| `eval-core:test` | 41 suites / 717 tests, unchanged |
| Published `.d.ts` | § 5's list unchanged; the corrected service doc present |

### Probes

**Named, not counted** — the convention this step adopted, and the reason for it is in the
last row but one. A count cannot show that the case making the claim was among the failures.

| Inversion | Cases that went red |
| :--- | :--- |
| Scope-depth restore removed | `the arrow-scope containment › should contain a throwing arrow function's scope to the recompute that made it` |
| `off()` dropped from the tracker `finally` | `the read-hook registration › should install and remove its hook once per recompute…`; `trackDependencies › should register the read hook on the state it owns, and remove it again` (step 3's) |
| `unregisterDestroy?.()` dropped from `destroy()` | `DestroyRef › should release its registration when destroyed by hand` |
| Destroy-time version bump removed | `destroy › should read undefined from the moment it is destroyed`; `destroy › should make invalidate() inert once destroyed`; `DestroyRef › should destroy itself with the injection context that created it` — **and not the pairing case**, which is how its vacuity surfaced |
| `destroyed` guard removed from `invalidate()` | `destroy › should make invalidate() inert once destroyed`, on the `equal` assertion alone — the `createState` assertion in the same test stayed green, which is the vacuity of the plan's stated probe, demonstrated |
| `DestroyRef` also taken from `options.injector` | `DestroyRef › should not take its lifetime from an injector passed as an option` |
| State hoisted out of the recompute | `one EvalState per recompute › should hand each recompute a state of its own…`; `the read-hook registration › should install and remove its hook…`; plus 6 step-2/3 cases (`recompute for the one key…`, `compile once across many recomputes`, `build a distinct EvalState for each recompute`, and all three `invalidate` cases) |
| Destroy-time bump removed, **after** the pairing case was fixed | the three above **plus** `destroy › should leave the same value whichever producer moves after destroy` |

### Review

`code-reviewer` returned no Critical. Three Warnings; two fixed in the step, one escalated to
a file change:

- **The pairing case was vacuous** — both signals shared one source, so `c.set` dirtied both
  computeds and drove both down the dependency-change arm; the two producers it existed to
  compare were never distinct. Fixed with independent sources and re-probed (last row above).
  This is the finding that produced the CLAUDE.md addition in § 5.2.
- **The containment comment overstated its reach** — an arrow function that *escapes* the walk
  pushes its scope when the consumer later calls it, after `evaluate()`'s `finally` has run,
  so that leak is still permanent. Behaviour unchanged; the claim was wrong. Corrected in the
  code comment, § 3.8.3 and step 6's README bullet.
- **The service's doc comment** — § 3 above.

Two Notes acted on: the `EvalHooks.prototype` spy now restores through `afterEach` rather than
only on the success path, and the `_activeStates` contrast carries a pointer to the deferred
`eval-core` defect it pins.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.8.3 gained the escaped-closure gap.** The guard covers a leak made *during* the walk.
  An arrow function that escapes and throws when called later is outside any recompute, and is
  not separately containable at that boundary by construction. Step 6's README carries it.
- **§ 3.8.2 gained the destroy-time bump's one side effect**: destroying a signal dirties it,
  so a still-live second consumer sees it flip to `undefined` at teardown rather than keeping
  the last value. Designed semantics, worth knowing because the teardown that triggers it is
  usually a component's, not the second reader's.
- **Step 6's README list gained two limitations**: auto-teardown is not universal (§ 3.8.1),
  and the arrow-scope guard covers `createEvalSignal` rather than a raw context (§ 3.8.3).

### 5.2 Noticed, not fixed

- **`CLAUDE.md` gained the setup half of the vacuity rule** (not a plan item). All four vacuous
  tests this phase failed the same way — the *setup* made the discriminating condition
  unreachable, not the assertion weak. The existing rule said break the implementation and
  confirm the test fails; the missing halves are "check the setup can produce both outcomes"
  and "read **which** tests went red rather than that the suite did".
- **`EvalService.simpleEval` adds every state to `_activeStates` and never removes it.**
  Pre-existing `eval-core`, already in `ROADMAP.md`'s deferred defects. This step *uses* it as
  a contrast probe, which means a future fix turns this library's suite red at one named line;
  the comment there says so.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing and confined to `eval-core` — confirmed by running each project separately.

### 5.3 Still carried from earlier steps

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive` because `getKey` does not consult `lookups` (§ 3.6.4), a member-target write
(`user.name = 'Bob'`) bypassing the read-only policy because it never reaches `EvalContext.set`
(§ 3.6.4, § 8 q6), and async deferred to step 5. The arrow-function scope leak is no longer
carried whole — it is contained at the recompute boundary and its two remaining paths are
documented above.
