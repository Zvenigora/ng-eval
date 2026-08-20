# Phase 4 — Step 5 Summary: Lifetime and teardown at form scale

**Date**: August 20, 2026
**Plan**: [`phase-4-plan.md`](./phase-4-plan.md) § 4, Step 5
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1)
**Commit**: `9fd548d`
**Status**: complete — `eval-forms` lint clean, 5 suites / 96 tests, `build:production`
clean with both entry points; `eval-core` unchanged at 41 suites / 717 tests,
`eval-signals` unchanged at 5 suites / 97 tests

---

## 1. What was built

The binding of step 4 gained a lifetime. Nothing in `eval-core` or `eval-signals` was
touched, and `control-source.ts` was not touched either — which the plan said it would have
to be, and was wrong about.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `reactive/src/lib/field-schema.ts` | edit | `FormBinding`, the child injector, the `DestroyRef` net, the guarded `destroy()`, the catch-and-release |
| `reactive/src/lib/field-schema.spec.ts` | edit | 12 new cases in a `teardown (plan S 3.7)` block; three helpers; three corrected comments |
| `reactive/src/lib/field-schema.teardown-throw.spec.ts` | new | one case: the signals a *throwing* bind had already created |
| `phase-4-plan.md` | edit | § 3.7, § 5, step 4's superseded signature, step 5's file list and criteria, step 6's README and CHANGELOG clauses |

**One published symbol changed shape**: `bindFieldProperties` returns `FormBinding` —
`{ fields: Record<string, FieldProperties>; destroy(): void }` — rather than the bare
record. Nested rather than a `destroy` key written onto the record, because the record's
keys are *field names*, `destroy` is a legal one, and § 0's premise is that those names
arrive from a server. Called out per CLAUDE.md; the `CHANGELOG.md` entry and the version
bump are step 6's, and step 6's bullet now names this change so the deferral cannot
evaporate into "adds the `/reactive` adapter".

### The mechanism, in one paragraph

`bindFieldProperties` opens a child `EnvironmentInjector` under the caller's and scopes the
**mirror** to it, so one `scope.destroy()` releases both of `createControlSource`'s
long-lived subscriptions — the per-key `toSignal` chains and the `group.events` diff. The
**signals** are not scoped to it: they are built with `options.injector` and destroyed by
hand, in creation order, which is what makes the exit criterion a count of N × M rather
than "the form's destroy ran". A `try`/`catch` around the mirror and the loop calls the
same `destroy()` and rethrows. `destroy()` is guarded against a second call, releases its
own `DestroyRef` registration first, and destroys the scope in a `finally`.

### Behaviour worth recording

- **`R3Injector.destroy()` opens with `assertNotDestroyed` and throws NG0205 on a second
  call.** This is why the idempotence guard is load-bearing here and was not under the
  rejected alternative — see § 2.
- **`createEnvironmentInjector` does not register the child with its parent's destroy
  hooks.** `EnvironmentNgModuleRefAdapter` builds an `R3Injector` and never calls
  `parent.onDestroy`, so a child's lifetime is *detached*, not merely shorter. Measured:
  `owner.destroy()` left every control's observer count at 1.
- **`DestroyRef.onDestroy` returns a working unregister handle**, so the net under
  `destroy()` costs nothing after the binding is torn down by hand.
- **`createEvalSignal` uses its injector only to resolve `CompilerService`** and registers
  no teardown against it. So the injector it is handed is a *resolution* decision, not a
  lifetime one — and the scope's parent, `caller.get(EnvironmentInjector)`, is an
  **ancestor** of a node injector, which is why passing the scope would silently skip
  providers the caller declared.
- **An `EvalSignal` nobody can read is externally indistinguishable from a destroyed one.**
  No subscriptions, no registration, and a signal only recomputes when read. This is true,
  and it is not the same claim as "no observation is available" — see § 2.
- **`AbstractControl.events` is `_events.asObservable()`**, so the wrapper carries no
  observer count and the private subject is the only direct view of the second
  subscription.
- **A leaked `DestroyRef` hook surfaces at TestBed teardown.** Observed while probing: a
  broken `catch` that destroyed the scope without releasing the registration produced
  NG0205 during `tearDownTestingModule`, attributed to whichever test ran it.

---

## 2. Design questions settled during the step

- **The plan's premise that releasing the mirror needs a handle from `createControlSource`
  was wrong**, and the decisive argument was not convenience. Both shapes work; only one
  makes a *stated exit criterion* discriminating. "A form destroyed twice does not throw"
  is vacuous against a release handle — `EvalSignal.destroy` is idempotent by contract and
  re-running a drained channel map does nothing, so the criterion passes against a binding
  with no guard at all. Against a child injector it throws NG0205, so the guard is
  load-bearing. Secondary: one injector destroys everything rather than two paths that can
  drift, and a throw mid-loop leaves a destroyed scope however far the loop got. Amended in
  § 3.7 before any code was written, together with step 3's measurement that already proved
  it — `control-source.spec.ts`'s two injector-destroy cases.
- **"Shorter lifetime" was the wrong phrase and hid a regression.** The amendment's own
  sentence — "a child injector is the same assertion with a shorter lifetime" — is false in
  the way that matters: the child is detached, so step 4's behaviour of releasing the mirror
  when the caller's injector died was silently lost. Found in review, not by a probe, and
  the suite could not see it because every case either calls `destroy()` or leaks by design.
  Corrected in § 3.7 and fixed with a `DestroyRef` registration.
- **The `inject(EnvironmentInjector)` fallback solves one arm and opens the other.**
  It exists so a caller who omits the required `injector` still gets NG0203 naming the
  injection context rather than a `TypeError` naming nothing — the assertion
  `field-schema.spec.ts` has held since step 4. *Inside* an injection context that same
  fallback **succeeds**, handing back a working binding parented at the ambient injector
  with no auto-teardown and no diagnostic, which is the precise silent variation § 3.7
  makes `injector` required to prevent. Rejected by name instead, and the NG0203 case now
  proves something stronger than it did: the throw moved ahead of `createControlSource`, so
  a caller with no injector opens **zero** subscriptions.
- **The signal half of the throwing-bind criterion has an observation, and the first draft
  said it did not.** A throwing bind returns no handle and a signal nobody reads never
  recomputes, so no *behavioural* route exists — but instrumenting the `createEvalSignal`
  factory holds the object before the throw loses it. Carried "by construction" until the
  review disproved the premise; now asserted, and measured to fail on exactly the defect it
  names.

---

## 3. Deviations from the plan's literal sketch

- **A spec file was added that step 5's list forbade.** The list, as amended at the start of
  the step, said `field-schema.ts` and its spec "and those two only". The throwing-bind
  criterion's signal half needs `jest.mock`, which is hoisted to the top of the file it
  appears in — so putting it in `field-schema.spec.ts` would route all forty-odd of that
  file's cases through a mocked barrel to serve one. Its own file instead, with the
  passthrough shape this workspace already uses in `eval-signals`'
  `nested-signal-check.spec.ts`. The list was amended to name it and the reason.
- **Three fixes went beyond "add teardown"**, all of them repairs to divergences this step
  introduced against step 4 rather than improvements to neighbouring code: the `DestroyRef`
  registration, the missing-injector guard, and the signals resolving through
  `options.injector`. Each is recorded in § 3.7.
- **`{ fields, destroy }` reached ~20 pre-existing cases through a two-line helper**
  (`bindFields`, typed with `Parameters<typeof bindFieldProperties>`) rather than a
  rewrite at every call site. No assertion changed; the nesting itself is asserted once, in
  the teardown block, against a field literally named `destroy`.
- **No other deviation.** `control-source.ts`, its spec, and every step 1–4 assertion are
  untouched.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-forms:lint` | clean |
| `eval-forms:test` | 5 suites / 96 tests (was 4 / 83) |
| `eval-forms:build:production` | clean; `FormBinding` present in the `reactive` typings |
| `eval-signals:lint` / `:test` | clean / 5 suites / 97 tests, unchanged |
| `eval-core:lint` / `:test` | clean / 41 suites / 717 tests, unchanged |
| Import list (§ 3.4.5) | core's `@angular/core` list still empty; `@angular/forms`, `@angular/core`, `rxjs` still confined to `reactive/src/lib/` |

### Probes

Named, not counted. Every one was run against the working tree and reverted.

| Inversion | Cases that went red |
| :--- | :--- |
| Destroy only the first field (`created.slice(0, 2)`) | **three** — the N × M count, the second-destroy count, and `should reach a field nothing ever read`. The subscription cases correctly stayed green: different path. Re-run after `destroy()` was rewritten; same three |
| `destroyed` guard removed | **two** — both double-destroy cases, with `NG0205: Injector has already been destroyed` |
| Catch-and-release removed | **one** — `should leave nothing live when the bind itself throws`, expected 0 observers, received 1 |
| Catch releases the scope but leaks the signals | **one** — the factory-instrumented case, `0` destroy calls against `2` signals, while the subscription case above stayed green. The two halves fail independently, which is why they are two cases |
| Mirror built on `options.injector` instead of the scope | **six**, including the behavioural `should stop diffing the control set once the binding is destroyed` |
| No `DestroyRef` registration (the state the step shipped its first draft in) | **one** — `should release the mirror when the injector it was given is destroyed`: 1 observer before, 1 after |
| No missing-injector guard (same draft) | **one** — `should require the injector inside an injection context too`: did not throw at all |

### Review

`code-reviewer` reported **no Critical findings** and three Warnings, **all three real and
all three fixed** — the detached scope, the in-context injector hole, and the observation
route for the throwing-bind criterion.

Worth recording against steps 3 and 4, where a real finding twice shipped with a suggested
assertion that passed against the broken code: **this time every suggested check held up**,
and each was verified before being adopted rather than after. The two behaviour findings
were reproduced as failing specs first — 1-then-1 observers, and no throw at all — and the
proposed factory instrumentation was measured against the exact defect it names before the
file was kept. The one correction owed in the other direction is a framing note: the
reviewer's own `_events` case is not redundant, but the state its comment described —
`group.events` alive while the per-control chains are dead — is unreachable by any change
to `field-schema.ts`, because `createControlSource` takes one injector for both.

Notes applied inside the step's files: `scope.destroy()` moved into a `finally` so a signal
whose `destroy` throws cannot strand the mirror behind an already-set guard; the
`FormBinding.destroy` JSDoc rewritten, since it claimed the opposite of what the code then
did; two spec comments corrected where they overstated what they proved.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.7 records the child-injector mechanism**, the corrected "detached, not shorter"
  premise, the `DestroyRef` net, and why the signals resolve through the caller's injector.
- **§ 5 records the `FormBinding` shape change** and the field-named-`destroy` argument for
  nesting it.
- **Step 6's README bullet gained § 3.7's "constructed, not computed"** — `toSignal` opens
  with `assertNotInReactiveContext`, step 5 confirmed it cannot discharge it (teardown is a
  call the consumer makes; the constraint is on construction), and it gets no spec because
  the only available assertion pins a message this library does not own. Carried from
  [`step-3-summary.md`](./step-3-summary.md) § 5.2, where it was first noticed.
- **Step 6's CHANGELOG bullet must name the return-shape change** rather than leaving it
  inside a generic entry.
- **Step 4's signature block is marked superseded** on its return type only, so the shape
  change has a before as well as an after.

### 5.2 Noticed, not fixed

- **The ~20 pre-existing cases that discard the binding never call `destroy()`.** They now
  get collected at TestBed teardown through the `DestroyRef` net, which is an improvement
  and also means the suite would not notice a leak on the un-destroyed path. Pre-existing
  style; not something this step should have changed.
- **There is no `step-4-summary.md`.** Step 4 shipped as `146b40c` without a retrospect, so
  its findings — the eager-compile parse error, the coercion's placement, the escaping-arrow
  context fixture — live only in the plan and in `field-schema.spec.ts`'s comments.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing; carried from [`step-1-summary.md`](./step-1-summary.md) § 5.2 unchanged.

### 5.3 Still carried from earlier phases

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive`; `EvalService.simpleEval` never draining `_activeStates`; the arrow-scope
leak's escaped-closure path, and its uncontained form on the unshipped `/signals` path
(§ 9.1). All are `eval-core` / `eval-signals` and § 2 forbids fixing them from here. The
`createSignalContext` liveness this library depends on remains unpinned upstream and pinned
here by step 2's characterization block.
