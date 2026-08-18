# Phase 4 — Step 3 Summary: The mirror, and the five traps

**Date**: August 18, 2026
**Plan**: [`phase-4-plan.md`](./phase-4-plan.md) § 4, Step 3
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1)
**Commit**: `77e0b31`
**Status**: complete — `eval-forms` lint clean, 3 suites / 48 tests, `build:production` clean
with both entry points; `eval-core` unchanged at 41 suites / 717 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

`createControlSource` stopped being a snapshot and became a mirror. The signature it
shipped with in step 1 is unchanged, which is what that step's shape decision bought.
Nothing in `eval-core` or `eval-signals` was touched.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `reactive/src/lib/control-source.ts` | edit | per-key instance channels, the `group.events` diff, the accessor-backed record |
| `reactive/src/lib/control-source.spec.ts` | edit | 18 cases: traps 1 (2), 3 (1), 4 (4), 5 (6), reactivity (2), step 1's three |
| `package.json` | edit | `rxjs` peer dependency |
| `phase-4-plan.md` | edit | § 3.5.3, § 3.5.5, § 5, step 3's file list and exit criteria |

No published symbol changed shape. `createControlSource` still takes
`(FormGroup, { injector })` and still returns `SignalContextSource`, so § 5's surface is
untouched and no version bump is owed.

### The mechanism, in one paragraph

Per key: a `Subject<AbstractControl>` holding the current instance, `switchMap`ped to that
instance's `valueChanges` with `startWith` at both levels, `toSignal`ed once with the
explicit injector, and terminated by a second `Subject<void>` through a trailing
`takeUntil`. The record's entry for that key is an enumerable **accessor** that reads the
signal — recording the dependency — and then answers with `channel.control.value`. On each
`group.events` emission the key → instance map is diffed against `group.controls`: a
changed instance is pushed down the channel, a vanished one closes it.

### Behaviour worth recording

- **`switchMap` completes only when its *inner* completes, and `valueChanges` never does.**
  So completing the instance channel does not release a removed control's subscription —
  the dead control keeps its subscriber. This is why each key carries a separate `released`
  subject with a trailing `takeUntil`. Found by the removal spec going red, not by reading
  the operator's documentation.
- **A throw inside the `switchMap` project function does not escape `sync()`.** It is
  routed to that key's own subscriber, so the diff loop survives. This mattered for the
  prototype-key case: the damage is a key that is never *released*, not a mirror that stops
  diffing — and the first assertion written for it was vacuous because it asserted the
  latter.
- **`toSignal`'s `injector` and the `group.events` subscription are two lifetimes, not
  one.** `toSignal` unregisters itself from its own `DestroyRef` whether or not anything
  else was scoped, so every per-control assertion stays green with `takeUntilDestroyed`
  deleted.
- **After teardown, an *addition* and a *scoped-out subscriber* are indistinguishable.** An
  unscoped subscriber still runs but throws NG0205 off the destroyed injector before
  subscribing, so the record gains no key and the control gains no observer — exactly what
  not running produces. A **replacement** takes the branch that touches no injector, and
  that is the one that discriminates.
- **`Object.defineProperty` is a genuine improvement over step 1's `source[name] = …`** for
  a control named `__proto__`: the assignment form would have set the record's prototype.
- **`warnOnNestedSignals` is safe against accessors.** It reads property *descriptors* and
  skips anything without a `value`, so no getter is invoked at context-construction time
  and no spurious dependency is recorded.
- **`FormGroup` keeps the caller's object literal and warns only on keys containing a dot.**
  So `constructor` is a legal field name, and after `removeControl` a bare `controls[name]`
  read resolves `Object`.

---

## 2. Design questions settled during the step

Both were **defects in the plan**, corrected in the plan before any code was written.

- **§ 3.5.5: one entry per *key*, not one per control instance.** "Per control, never per
  group" is trap 1's *granularity* and says nothing about lifetime; read as one lifetime it
  reintroduces trap 5's failure one layer up, because every property that had already read
  the key keeps tracking the dead control's signal. A spec re-evaluating with a bare
  `simpleEval` cannot see it — the record is fresh, so it passes. The recompute-count
  criterion is what catches it, and probe C isolates it to exactly two cases.
- **§ 3.5.3's `invalidate()` hatch is false against a signal-valued record.** The mirrored
  signal is *itself* the stale thing, so `invalidate()` re-runs the walk and resolves the
  same cached value. Measured both ways before amending: signal-valued reads `true` after
  the invalidate, accessor-backed reads `false`. The record therefore holds live values
  behind accessors — which is § 3.4.2's own "a getter-backed record is the only shape that
  obviously works", with the addition that makes it *track*: read the signal for the
  dependency, answer with the control. This settles the shape question § 3.4.2 explicitly
  deferred to § 3.5, and it does **not** reopen the A/B fork: B's defects were a form key
  holding `signal(undefined)` and uncorrected `caseInsensitive`, neither repaired by this
  particular record happening to hold no signals.
- **A control-set change under `{ emitEvent: false }` has no hatch**, unlike a value
  change. `sync` never runs, the channel still points at the dead instance, and there is
  nothing for a re-run to recover. Pinned in the JSDoc and § 3.5.3 rather than fixed.
- **`removeControl` / `addControl` need `invalidate()`, and it works.** A key-set change is
  § 3.4.2 rule 2's case, so the value stands until the owner invalidates — and after the
  invalidate, reactivity resumes on the *live* ticker without a second one. Pinned by a
  spec so step 4's binding inherits a contract rather than a surprise.

---

## 3. Deviations from the plan's literal sketch

- **Two files were added to step 3's list**, both recorded in the plan.
  `control-source.spec.ts` was implied rather than listed — every exit criterion of the
  step is a spec. `package.json` was not foreseen: this is the first step in which any of
  the three libraries imports rxjs *directly*, and `@nx/dependency-checks` fails until the
  manifest says so. Pinned `^7.8.0` (the workspace's version) rather than Angular's looser
  `^7.4.0` floor, on instruction.
- **Trap 1's probe was predicted to produce two failures; it produced eight.** The plan
  names the pairing to expect — the trap 1 case and the negative reactivity case — and both
  are in the set. The other six are the step 1 disabled-control case and every per-control
  subscription assertion, which a group mirror also loses. The prediction is right about
  what it names and understates the blast radius; recorded here rather than amended,
  because the named pair is what the probe was for.
- **No other deviation.** Step 1's three assertions survive verbatim apart from bracket
  access forced by `noPropertyAccessFromIndexSignature` on an index-signature-typed group.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-forms:lint` | clean |
| `eval-forms:test` | 3 suites / 48 tests |
| `eval-forms:build:production` | clean; `dist/modules/eval-forms/reactive/package.json` present |
| `eval-signals:lint` / `:test` | clean / 5 suites / 97 tests, unchanged |
| `eval-core:lint` / `:test` | clean / 41 suites / 717 tests, unchanged |
| Import list (§ 3.4.5) | core's `@angular/core` list still empty; `@angular/forms`, `@angular/core`, `rxjs` confined to `reactive/src/lib/` |

### Probes

Named, not counted.

| Inversion | Cases that went red |
| :--- | :--- |
| Mirror built the group way (`group.valueChanges`, `group.value`) | **eight**, including both `trap 1` cases and `reactivity › should not recompute for a control the expression never named` — the pairing § 3.5.1 predicts — plus `should include a disabled control` and every per-control subscription case |
| Tear down and rebuild every key on each `group.events` emission | all four `trap 5` cases, including `› should follow the new instance through a property built before it` |
| Fresh `toSignal` per instance, diff otherwise correct | `trap 5 › should follow the new instance through a property built before it`; `› should release exactly the replaced control and touch no other` — **two**, which isolates § 3.5.5's amended defect exactly |
| Record holds the `toSignal` signal instead of an accessor | `trap 3 › should leave the property stale, and restore it on invalidate` — measured in a standalone probe before the plan was amended |
| `close()` completing the instance channel only, without `released` | `trap 5 › should release only the removed control` |
| Bare `live[name]` instead of the own-property read | `trap 5 › should keep diffing after a control named off Object.prototype is removed` |
| `takeUntilDestroyed` deleted from the `group.events` subscription | `trap 4 › should stop diffing the control set once that injector is destroyed` |

Two assertions were **rewritten because their first form was vacuous**, and both came from
the review rather than from a probe — see § 4.1. The prototype-key case originally asserted
that diffing survived, which is true under both implementations; the teardown case
originally asserted through an addition, which is indistinguishable under both. Each was
re-probed after rewriting.

### Review

`code-reviewer` reported **no Critical findings**. Three substantive findings, all closed —
but two needed correcting first, so what was verified differs from what was reported:

- **Bare `live[name]` prototype read — real, fixed.** The stated consequence ("diffing dies
  permanently") is wrong: the throw lands in that key's own subscriber. The suggested
  assertion passed against the broken code; the discriminating one is that the key is never
  released.
- **`group.events` lifetime unasserted — real, fixed.** Confirmed by deleting
  `takeUntilDestroyed` and watching all 45 stay green. The suggested spec also passed
  against the broken code, for the NG0205-before-subscribing reason above.
- **"Removal freezes properties permanently" — not a defect.** `invalidate()` recovers
  after removal *and* after re-add. The supporting quote — step 5's "a field removed and
  re-added works" — is revision 1's criterion, which § 3.7 explicitly replaced with the
  churn assertion. Closed with a spec pinning the real behaviour rather than a code change.

Minors applied inside the step's files: an NG0203 matcher on the no-injector case (a bare
`toThrow()` did not assert what its comment claimed), `channels.set` moved after everything
that can throw, and three comment/JSDoc corrections.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.5.5 records the one-entry-per-key mechanism**, why the per-instance reading is a
  defect rather than a looser spelling, why removal needs a second channel, and the
  measured table behind the accessor-backed record.
- **§ 3.5.3 records that a control-set change under `{ emitEvent: false }` has no hatch.**
- **Step 3's exit criteria** gained the two review-driven cases, with the note that the
  teardown one must be asserted through a replacement rather than an addition.
- **§ 5's import list gained `rxjs` (`/reactive` only)**, and the pre-existing drift where
  `SignalContextSource` is imported in both entry points while the list names only the core.
- **Trap 5's "subscription object is identity-equal" was replaced** with what a plain record
  actually exposes: observer counts on the real controls, and accessor identity.

### 5.2 Noticed, not fixed

- **`toSignal` opens with `assertNotInReactiveContext`.** Step 4/5 code that mutates the
  control set from inside an `effect()` will throw out of `open()`. Belongs in § 3.7 before
  step 4 writes the binding.
- **The diff runs several times per interaction, not once.** `AbstractControl.events` emits
  value, status, pristine, touched and reset events, so an interaction costs several O(N)
  diffs. No narrower signal is available — Angular's collection-change callback is private.
  Nothing per-node is touched, so § 6's perf gate is unaffected. The comment now says so.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing; carried from [`step-1-summary.md`](./step-1-summary.md) § 5.2 unchanged.

### 5.3 Still carried from earlier phases

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive`; `EvalService.simpleEval` never draining `_activeStates`; the arrow-scope
leak's escaped-closure path, and its uncontained form on the unshipped `/signals` path
(§ 9.1). All are `eval-core` / `eval-signals` and § 2 forbids fixing them from here. The
`createSignalContext` liveness this library depends on remains unpinned upstream and pinned
here by step 2's characterization block — and step 3 leans on it harder, since the mirror's
key set now changes at runtime.
