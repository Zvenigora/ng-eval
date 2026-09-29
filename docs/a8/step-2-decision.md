# A8 step 2 — who owns a state that `createState` hands back

The decision [`plan.md`](plan.md) § 3 frames and § 4 leaves open, for
[`docs/backlog.md`](../backlog.md) [A8](../backlog-retired.md#a8)'s second half. Drafted against
`10dd98f`, the commit that finished step 1.

**Decided 2026-09-25: (a), with both flagged costs accepted.**
[`step-2-plan.md`](step-2-plan.md) implemented it.

**This document decides. It does not implement.** No code, spec or register entry changes with
it, apart from one line in A8's entry saying that it exists. The measurements in § 3 and § 4 ran
against a throwaway prototype of `eval.service.ts`. The prototype was reverted, and § 7 records
how it was built.

## 0. Recommendation

**(a): the caller owns the state, and `EvalService` stops tracking it.** `ngOnDestroy` keeps its
destroyed flag and drains nothing.

The main reason: every retention the destroy drain guards against runs through an object the
caller already holds, such as the state itself or a registry the caller passed in, and the caller
can release that object through public API today. The service is the only party in the picture
that keeps anything the caller does not. (a) is the one option under which it keeps nothing at
all, and under which destroy's effect is deterministic.

(b) keeps more of the published promise. But § 4 shows that it makes destroy's effect on a
caller-owned registry depend on whether the collector has run yet. (c) withdraws nothing, but it
leaves A8 open on the default path, and its new method would exist only to undo a retention the
service creates for no purpose of its own.

The cost of (a) is real, and it is published. It withdraws a registry-clear promise that
`eval-core` has shipped since 0.3.0 (§ 2.1). That needs an explicit *Upgrading* entry in the
unreleased minor, and it is step 1's § 2.2 trade extended from `simpleEval` to `createState`.

(d), a bounded set, stays rejected for the reason § 3 gives: destroy would silently skip live
states.

## 1. What has moved since `plan.md` § 3

### 1.1 (b)'s runtime baseline: the cost is gone

§ 3 listed "ES2021 runtime APIs in shipped code, under a peer range of Angular ≥ 19" as a cost of
(b). It is not one, for two independent reasons.

**Angular 19's own browser policy covers both APIs.** Angular 19 supports a rolling window:
"Chrome: 2 most recent versions; Firefox: latest and ESR; Edge: 2 most recent major versions;
Safari: 2 most recent major versions; iOS: 2 most recent major versions; Android: 2 most recent
major versions" ([v19.angular.dev/reference/versions](https://v19.angular.dev/reference/versions)).
At 19.0.0's release in November 2024, that window's oldest members were Safari and iOS 17 and
Firefox ESR 115. Per `@mdn/browser-compat-data` 8.1.3:

| Runtime | `WeakRef` and `FinalizationRegistry` since | `??=` since |
| ------- | ------------------------------------------ | ----------- |
| Chrome / Edge | 84 | 85 |
| Firefox | 79 | 79 |
| Safari | 14.1 | 14 |
| iOS Safari | 14.5 | 14 |
| Samsung Internet | 14.0 | 14.0 |
| Node | 14.6.0 | 15.0.0 |

**`eval-core` already requires an ES2021 runtime, and has since 0.3.0.** The published
`@zvenigora/ng-eval-core@0.5.0` tarball's `fesm2022` bundle contains `??=` five times, in
`EvalState`'s getters and in `mergedVisitors` (the tarball's lines 2008–4294). `??=` is ES2021
*syntax*, not an API. An engine without it cannot parse the module at all, so it fails at import,
before any of that code runs. `git grep` finds `??=` in shipped source at
`eval-core@0.3.0` and at every tag since. From the table, the only runtimes that can load
`eval-core` today but lack `WeakRef` are Safari 14.0 and iOS 14.0–14.4. Both are outside Angular
19's window by three majors.

**SSR.** Angular 19 requires Node `^18.19.1 || ^20.11.1 || ^22.0.0`, and CI runs 24.x and 26.x.
All of them are past 14.6.

**Types.** `eval-core` compiles with `lib: ["dom", "es2022"]`, which includes
`es2021.weakref`. A private field's type is not emitted into the `.d.ts`: the build prints
`private _activeStates;` (line 2206 of the built typings). So the two downstream libraries, whose
`lib` stops at `es2020`, would never see the type.

Two notes for accuracy. Angular 19.0.0's own `core.mjs` does not use `WeakRef`: it has only a
`setAlternateWeakRefImpl` stub. So the guarantee comes from the policy and from our own bundle,
not from Angular's use of the API. And Angular 19 is past end of life
([angular.dev/reference/releases](https://angular.dev/reference/releases): "v2 to v19 are no
longer supported"). The peer range still admits it.

### 1.2 (b)'s test cost: "collectable" yes, "pruned" depends on the design, and (b) needs it

**"Collectable" is testable.** A20's instrument works in Jest. Step 1 found and fixed the
closure hazard behind the flake in case 1.3 (`plan.md` § 2.5, [A19](../backlog.md#a19)'s
technique note). A state dropped under (b) is a case of exactly the kind the instrument already
answers.

**"Pruned", under `FinalizationRegistry`, is testable only as "eventually, on V8".** The
language does not require cleanup callbacks ever to run: MDN's *FinalizationRegistry* notes
that a conforming implementation "is not required to call cleanup callbacks". V8 posts them as a
task after a GC. Measured in Jest on Node 26.4.0: after 1,000 dropped `createState` states, a
macrotask and `gc()`, the set held **1,000**. One further macrotask later it held **0**. So a
test would be "`gc()`, then poll a few ticks for the size to drop". That passes on V8 today, but
it adds a second step, beyond the instrument's, that nothing guarantees.

**"Pruned", under a sweep, is as testable as "collectable".** In this design there is no
`FinalizationRegistry`. `createState` drops dead `WeakRef`s whenever the set crosses a threshold,
and the threshold doubles with the live count, so the sweep is amortised O(1). Measured: after
`gc()` and a macrotask, the next crossing took the set from **1,001 to 101**, and the 101 were
the states still live in that job. That needs nothing beyond what A20's cases already assume.

**(b) does need "pruned", not only "collectable".** Consider the wrong implementation "a
`WeakRef` per state, never pruned". It passes every "collectable" case, because the states are
collected. Meanwhile it grows the set by one `WeakRef` shell per `createState`, for the life of
the service. That is A8's shape, at a fraction of the size. Only a "pruned" case excludes it. So
if (b) is chosen, it should prune by sweep, not by `FinalizationRegistry`, and the pruning case
should use the sweep's deterministic threshold.

## 2. The three candidates, each at its strongest

The table compares destroy's contract for each kind of state. **0.5.0** is what shipped, in the
`hooks` JSDoc (in the `.d.ts`), the README, and 0.3.0's *"`ngOnDestroy` releases hook state"*.
**[Unreleased]** is what `CHANGELOG.md` now says after A12, A17, A21 and step 1.

| State at destroy | 0.5.0 | [Unreleased] | (a) | (b) | (c) |
| ---------------- | ----- | ------------ | --- | --- | --- |
| From `createState`, caller holds it | kept; stack, registry, bookkeeping drained (not the trace) | kept; all four drained, caller-owned last, silently | untouched | all four drained | all four drained, unless released earlier |
| From `createState`, caller dropped it | kept until destroy, then drained | the same | collectable; destroy never sees it | collectable; drained **only if not yet collected** | kept until destroy unless released |
| Its adopted `options.hooks` registry | cleared | cleared | **not cleared** | cleared if the state is reachable; **GC-dependent** if the caller dropped it (§ 4) | cleared, at release or at destroy |
| From `simpleEval` / `simpleEvalAsync` | kept and drained | not kept; registry not cleared | the same | the same (§ 2.2.1: extension declined) | the same |

### 2.1 (a): the caller owns it

**The case.** A `createState` state is handed to the caller. Everything the destroy drain touches
is either that state, which the caller holds, or an `EvalHooks` registry, which the caller passed
in and holds. So everything the drain releases is reachable from the caller's own objects.
Everything it does can also be done with public API: `state.result.clearTrace()`,
`state.result.stack.clear()`, `state.resetHookBookkeeping()`, `state.hooks.clear()`, or the
unsubscribe that `on` returns. The one thing only the service can release is its own reference,
and under (a) that reference does not exist.

That completes a direction this repository has already taken twice.
[A21](../backlog-retired.md#a21) decided that destroy "has no business emptying" a caller's context.
Step 1 decided that a `simpleEval` registry is the caller's to clear (§ 2.2). After step 1,
whether destroy clears your registry depends on **which entry point you used**. (a) removes that
asymmetry: destroy does nothing to anything you passed in, whichever method you passed it to. (b)
replaces the asymmetry with one that depends on the collector's timing (§ 4). (c) keeps it.

(a) is the smallest change in code. It deletes the field, the `add`, both of step 1's `delete`s
and the drain loop. The A17 ordering and the B3 `catch` go with the loop, because they existed
only to make that loop safe. The contract (a) leaves is one sentence: **`EvalService` holds no
reference to anything you pass it or anything it hands you.** Nothing about it depends on the
collector. That is also how `CompilerService` already behaves, and it is why `eval-signals` builds
its states there (`eval-signal.service.ts`, and
[`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.3.1).

**What `ngOnDestroy` promises after it.** Only that later calls throw `EvalService has been
destroyed`. It is still worth implementing `OnDestroy` for that. Compared with **0.5.0**, the
registry clear, the stack clear and the bookkeeping reset are withdrawn for `createState` states,
which are the only ones 0.5.0's promise still covered after step 1. Compared with
**[Unreleased]**, the trace drain (A12), the A17 reorder and the silent `catch` (B3) have never
shipped, and would now never ship. Their `[Unreleased]` entries are rewritten rather than
released.

**A20's control and `eval-signals`' contrast.** Both go red. A20's control ("should still retain
the context through A8's state set") inverts: it becomes A20's case 1 with the hand-clear
removed, and `collect`'s `dropStates` parameter and its `clear()` go too. The instrument then
needs a new positive control to show that it can still see retention. The natural one is a
context whose state the test itself still holds, which must **not** be collected. That, plus
`plan.md` § 2.5's probe I (the instrument with `gc()` not called), keeps it honest.
`eval-signal.memory.spec.ts:80-114` reads a field that no longer exists, so it fails at `:92` as a
`TypeError`, not at `:113`. **The contrast should become a behavioural assertion, but not the spy
`plan.md` § 1.3, item 3, floated.** A spy asserting "`EvalService.createState` is never called" would pin
a design choice whose reason (a) removes, since `EvalService` would no longer retain. The
behaviour `phase-3-plan.md` § 3.8 cares about is that a signal's recomputes leave no state behind. That is
assertable directly: a read hook stores a `WeakRef` to each `event.state`, then a GC, then all
five are `undefined`. The positive control is the same as A20's. This holds whichever service
built the states.

**Published cost.** No exported symbol changes shape. What changes:

- the `hooks` JSDoc (it ships in the `.d.ts`), the README's paragraph at `:279`, and
  `ngOnDestroy`'s own JSDoc ("Clean up resources to prevent memory leaks");
- `eval-signals`' `EvalSignalService` class JSDoc (also in its `.d.ts`), which describes
  `EvalService`'s strong `Set`. That becomes a documentation-only change in `eval-signals`' next
  release, like the three corrected comments already under `[Unreleased]`;
- specs that pin the withdrawn behaviour. `plan.md` § 2.5's probe W4 ("`createState` stops
  tracking") is (a) with the field left in place, and it lists them: 1.6; A20's control; five
  drain cases (the caller-held trace, A21's case 1, registered hooks, the caller-owned registry,
  bookkeeping); and 3.1–3.4. **These encode published behaviour, and `CLAUDE.md` says to flag
  such a spec and ask before changing it. This document is that flag.** Under (a), the
  implementing step inverts the ones that describe destroy's reach, for example "should **not**
  clear a caller-owned registry that outlives the service". It deletes the ones that describe a
  drain that no longer exists (3.1–3.4).
- [A21](../backlog-retired.md#a21)'s recorded decision to keep the registry clear "deliberately" is
  reversed. Its reason, that a hook's closure usually captures the state it observes, is true, but
  what it keeps alive is the caller's registry.

The *Upgrading* note would replace the current hook-registry paragraph and its two bullets. The
second bullet, "evaluate through `createState` + `eval` instead", recommends the path (a) takes
away:

> **If you relied on `EvalService.ngOnDestroy()` to clear an `EvalHooks` registry you passed
> through `options.hooks`**, it no longer does, whichever method you passed it to
> (A8). 0.3.0 to 0.5.0 documented that it cleared the registries of the
> states `createState` created. Destroy now changes nothing you passed in or were handed back. It
> only marks the service destroyed. You are affected only if the registry outlives the root
> injector **and** a hook on it keeps a state: `hooks.on('after', '*', () => state)`, one that
> stores `event.state`, or a `createDependencyTracker` installed on it. Release it in the
> teardown that owns it: call the unsubscribe that `on` / `onRead` returned, or `hooks.clear()`.
> If you keep a state past the root injector and relied on destroy to empty it, call
> `state.result.clearTrace()`.

*(Corrected by the implementing step. That last sentence was wrong: 0.5.0's destroy never
cleared the trace, and `clearTrace()` ships in the same release. It reset the hook bookkeeping
and cleared the value stack. `CHANGELOG.md` says that instead.)*

### 2.2 (b): weak tracking

**The case.** It keeps every published promise, for every state anything can still reach. That
includes the one that matters for retention: when a registry's closure captures a state, the
state is reachable through the registry, so its `WeakRef` dereferences at destroy and the clear
fires. That case is **deterministic**, and was measured so (§ 4, third row). It also ends the
retention: a dropped state is collectable, with its context. § 1.1 removed the runtime cost, and
§ 1.2 showed that a sweep makes pruning testable with the instrument this repository already
trusts. The per-call cost in § 3 is invisible to the performance gate.

**What `ngOnDestroy` promises after it.** Every drain, for every `createState` state that has not
been collected. Compared with **0.5.0** and **[Unreleased]**, it is the same for any state the
caller holds, and for any state a hook on the registry holds. For a dropped state, "kept, then
drained" becomes "collectable, and drained if it has not been collected yet". The trace drain and
the stack clear on an unreachable state are unobservable either way. **The registry clear is
not** (§ 4). The honest wording therefore has to mention the collector, and the `[Unreleased]`
lines "States from `createState` are still kept" and "A context passed to `createState` is still
retained" become false and are rewritten.

**A20's control and `eval-signals`' contrast.** The control goes red, and inverts as under (a).
Measured: it and 1.6 were the only reds under the prototype, and 1.6 was red only because it read
the old field. Under (b) 1.6 is restated on the new field and stays deterministic, since the set
holds one entry in the job that called `createState`. The contrast **stops measuring anything**.
A `WeakRef` keeps its target alive until the end of the job that created it, so five
`createState`s in one synchronous test leave a size of 5, whatever the retention. It must become
the behavioural assertion described under (a). The `EvalSignalService` JSDoc changes as under
(a).

**Published cost.** No shape change. It adds about 30 lines: the `WeakRef` set, the sweep, and a
`WeakMap` from state to ref so that `simpleEval` can untrack (§ 3). It rewrites the same
`[Unreleased]` lines, and its documentation must state a GC-dependent behaviour. *Upgrading*:

> **States from `createState` are no longer kept until the root injector is destroyed**
> (A8). Destroy still drains every one it can reach: one you hold, or one
> a hook on its registry holds. That includes clearing an `options.hooks` registry. **A registry
> adopted only by states you have dropped may or may not be cleared, depending on whether they
> have been garbage-collected.** If your hooks must survive, or must not, do not leave it to
> destroy.

#### 2.2.1 Extending weak tracking to `simpleEval`, to restore the stash case: **no**

§ 3 notes that under (b), weakly tracking `simpleEval` states would restore the registry clear
for § 2.2's stash case, where a hook stores `event.state`. That is true, and measured: in that
case the state is reachable through the registry, so the clear fires deterministically. But the
cost falls on every **other** `simpleEval` call that takes `options.hooks`:

- **Step 1's published narrowing becomes GC-dependent rather than reversed.** Under the
  prototype's two "track `simpleEval` too" modes, criterion **1.7** went red: a destroy in the
  same job as the call cleared a registry whose hooks held nothing. After a GC, the same destroy
  would have left it alone. The `[Unreleased]` sentence "a registry passed only to `simpleEval` is
  not cleared" can currently be stated plainly. After this extension it could not be stated at
  all.
- It restores a clear for one shape of misuse that the caller can fix with `hooks.clear()`, and
  step 1 already accepted that trade in writing.

Cost is not the reason. Measured, tracking `simpleEval` weakly is *cheaper* per call than
untracking it (§ 3), because untracking has to find the ref. The extension is declined for its
behaviour, not its price.

### 2.3 (c): explicit release

**The case, in its strongest form:** `EvalService.releaseState(state)`. It runs the four drains
now, in the A17 order, removes the state from the set, and is idempotent. It is not
`state.dispose()`, which could not reach the service's set without the state knowing its service.
It is the only option that **withdraws nothing**: destroy keeps 0.5.0's promise, word for word,
for every state not released. It is deterministic, and testable without the collector: release,
then assert the set's size and the drains. It matches the teardown idiom this repository's other
two packages already publish, `EvalSignal.destroy()` and `FormBinding.destroy()`. It is additive,
so it rides the unreleased minor without an *Upgrading* warning.

**What `ngOnDestroy` promises after it.** Exactly what 0.5.0 and **[Unreleased]** say, for
unreleased states. Released states are drained at release and are not seen again.

**A20's control and `eval-signals`' contrast.** Both stay green. They are still true, because an
unreleased `createState` state is still kept. Each gains a released twin: the context is
collected, and the count reaches 0. The contrast stays a symptom, not a behaviour. The
`EvalSignalService` JSDoc stays true.

**Published cost.** One new public method on a published class, with its README section. **A8
stays open on the default path**: a caller who never calls `releaseState` keeps every dropped
state until destroy, as now, so the register cannot retire A8 and it moves to "Contained" at best.
*Upgrading*:

> **`EvalService.releaseState(state)`** drains a state from `createState` now and lets the service
> forget it. Without it, the state and its context are kept until the root injector is
> destroyed, as before.

**Why it loses.** The caller who would call `releaseState` is the caller who already manages the
state's lifetime, and can do everything the method does with public API, except remove the
service's own reference. So the method's only unique effect is to undo a retention that serves no
one. The caller who drops states without thinking gets nothing, and that is the caller A8 was
filed for.

## 3. The measured cost of (b)

**Against `performance.spec.ts`: nothing measurable, because the gate cannot resolve it.** Its
one timing assertion is 100 `simpleEval`s under 5,000 ms. The benchmark case took **9–12 ms** in
five runs of each prototype mode, strong included: a margin of about 400×.

**The per-call cost, measured on the built `fesm2022` bundle in Node 26.4.0.** Each figure is the
median, in ns, of three runs' medians. Each run was nine repetitions of 20,000 calls, each on a
fresh service after a macrotask and `gc()`. *Pristine* is `10dd98f` itself. *Strong* is the
prototype with today's behaviour, and matches pristine, so the prototype's branching costs
nothing measurable.

| Mode | `createState`, dropped | `createState` + `eval('a + 1')` | `simpleEval('a + 1')` | `simpleEval`, the perf-spec expression |
| ---- | ---------------------: | ------------------------------: | --------------------: | -------------------------------------: |
| pristine | 210 | 933 | 1,009 | 128,027 |
| strong | 223 | 964 | 1,000 | 131,146 |
| (b), `FinalizationRegistry`, `simpleEval` untracked | 477 (+267) | 1,165 (+25%) | 1,299 (+29%) | 134,563 |
| (b), sweep, `simpleEval` untracked | 371 (+161) | 1,110 (+19%) | 1,222 (+21%) | 133,874 |
| (b), `FinalizationRegistry`, `simpleEval` tracked | 354 | 1,094 | 1,044 (+3%) | 133,093 |
| (b), sweep, `simpleEval` tracked | 292 | 1,077 | 1,065 (+6%) | 132,610 |

The last column is noise for every mode: its per-run medians range from 129k to 150k. Its
distribution is also bimodal (minimum about 18k, median about 130k) in *every* mode, pristine
included. That was not investigated: it is unrelated to tracking.

**"Only explicit `createState` calls are tracked" holds for retention, not for cost.** Since step
1, `simpleEval` still builds its state through `this.createState`. Criterion 1.8 pins this, for
`plan.md` § 2.1's reason: a subclass that overrides `createState` must keep affecting `simpleEval`.
So under (b), every `simpleEval` pays for a `WeakRef`, then for undoing it: a `WeakMap` lookup, a
`Set` delete, and an `unregister` under `FinalizationRegistry`. On the smallest walk that is
+210–290 ns, or 21–29%. On a realistic expression it is below noise. The only way to spare
`simpleEval` would be to bypass the tracking half of `createState`, which step 1 rejected.

**Does that change the answer? No.** The cost is modest and, where it is relative rather than
absolute, confined to trivial expressions. The recommendation does not rest on it. It removes one
premise, that (b) costs `simpleEval` nothing. And it inverts § 3's framing of the `simpleEval`
extension: keeping step 1's narrowing under (b) costs more per call than giving it up (§ 2.2.1).

## 4. (b) makes destroy's effect on a caller-owned registry depend on the collector

This was found by the prototype, and none of `plan.md`'s §§ 1–4 anticipated it. Each fixture
builds a state through `createState` with `{ hooks }`, runs one `eval`, and drops the state inside
an IIFE. The caller keeps the registry. Result: is the registry empty after `ngOnDestroy()`?

| Fixture | strong (today) | (b), `FinalizationRegistry` | (b), sweep |
| ------- | :------------: | :-------------------------: | :--------: |
| Hook holds nothing; destroy in the same job | cleared | cleared | cleared |
| Hook holds nothing; macrotask, `gc()`, then destroy | cleared | **not cleared** | **not cleared** |
| Hook captures the state (`() => state`); macrotask, `gc()`, then destroy | cleared | cleared | cleared |

The third row is the case the clear exists for, and (b) keeps it deterministic. The second row is
the problem. A caller who shares one registry between a `createState` state it has finished with
and anything else finds that destroy empties it, or doesn't, depending on whether a GC ran in
between. In that row, clearing has **no** retention benefit, since the registry holds nothing that
reaches the state. So when it happens, it is pure loss to the caller: A21's kind of harm, arriving
at random. 0.5.0 inflicted that harm every time, and documented it ("do not share one registry
with a state whose lifetime is meant to outlast the service"). (a) never inflicts it. (b)
inflicts it only sometimes, and whether it does depends on the collector, which no spec can pin
as a single behaviour.

No design of (b) avoids this without either dropping the registry clear, and then (b) keeps only
drains that nobody can observe, or holding the registry strongly, which is A20's retention on a
new field.

## 5. Comparison

| | (a) caller owns | (b) weak | (c) release |
| - | --------------- | -------- | ----------- |
| A8 fixed on the default path | yes | yes | **no** |
| Published promise withdrawn | the registry clear, stack and bookkeeping for `createState` states | none for reachable states; GC-dependent for dropped ones | none |
| Destroy deterministic | yes (it does nothing) | **no** (§ 4) | yes |
| Retention tests | collector (A20's instrument), plus a positive control | collector, plus a sweep case for pruning | deterministic |
| Per-call cost | −1 `Set.add` / `delete` | +160–270 ns per `createState`; +210–290 ns per `simpleEval` | none |
| Code | deletes about 50 lines | adds about 30 | adds about 20, plus README |
| New public API | none | none | `releaseState` |

(b)'s advantage over (a) is the registry clear for a state that some other object still reaches.
Every such chain begins at an object the caller holds past the root injector, and the caller can
break it with one public call. (b) pays for that convenience in the currency this repository
values least to spend: a behaviour that depends on the collector's timing, which specs cannot pin
and documentation can only describe. (c) keeps every promise, but leaves the defect in place for
exactly the callers who will never read about the method.

## 6. If (a) is chosen: what the implementing step carries

This is not a plan. It lists what the plan must cover, so that the decision is taken knowing its
reach.

- `eval.service.ts`: delete `_activeStates`, its `add`, step 1's two `delete`s and `finally`s,
  and the drain loop. Keep `_isDestroyed` and the throw. Rewrite the JSDoc for `createState`,
  `ngOnDestroy` and the class.
- `eval-options.ts`: the `hooks` JSDoc (in the `.d.ts`). `modules/eval-core/README.md` `:279`.
- `eval.service.memory-leaks.spec.ts`: the W4 list in § 2.1. Invert A20's control and add a
  held-state positive control. Delete `collect`'s hand-clear, 1.6's set reads, and 3.1–3.4 with
  their `describe`.
- `eval-signal.memory.spec.ts:80-114`: the behavioural form in § 2.1. `eval-signal.service.ts`'s
  class JSDoc.
- `CHANGELOG.md` `[Unreleased]`: the trace-drain line, A17's *Fixed* entry, B3's *Changed* entry,
  the A20/A21/step-1 lines that say `createState` states are kept, and the *Upgrading* paragraph
  in § 2.1. A `[eval-signals …]` note for its JSDoc.
- `docs/backlog.md`: A8 retired as fixed. A17 superseded, since its drain no longer exists. B3's
  `ngOnDestroy` site gone. A20's and A21's notes about "until A8's step 2". `CLAUDE.md`'s
  architecture text is unaffected: it does not describe the set.
- **Category:** fix, riding the unreleased minor. No shape change. One withdrawn published
  behaviour, called out under *Upgrading*.

If (b) is chosen instead, it additionally needs: a sweep rather than a `FinalizationRegistry`
(§ 1.2), a pruning criterion that excludes "never pruned", § 4's second row written into the
`hooks` JSDoc, and 2.2.1's "no" recorded. If (c) is chosen, A8's status becomes "Contained", with
the default path still open.

## 7. What was checked

- **Runtime baseline**: v19.angular.dev's versions page (the browser table, and Node for 19.x);
  angular.dev's releases page (19 is past end of life); `@mdn/browser-compat-data` 8.1.3 for all
  three features; `npm pack @zvenigora/ng-eval-core@0.5.0`, and `grep` of its `fesm2022`;
  `git grep '??='` at `eval-core@0.3.0`, `@0.4.0` and `@0.5.0`; `npm pack @angular/core@19.0.0`,
  and `grep` for `WeakRef`; `.github/workflows/node.js.yml`; the built `.d.ts`.
- **Prototype**: `eval.service.ts` edited in the worktree to five modes selected at
  construction. *strong* is today's behaviour. There were two pruning designs, each with
  `simpleEval` untracked (step 1 kept) or tracked. A throwaway probe spec sat beside it. Under each
  mode, `eval.service.memory-leaks.spec.ts` was run and the red cases read by name (§ 2.2,
  § 2.2.1). So were the probe's GC-dependence and pruning cases (§ 1.2, § 4), five timed runs of
  `performance.spec.ts` (§ 3), and a Node benchmark against a production build of each mode
  (§ 3). Both files were then reverted with `git checkout` and deleted, `dist` was rebuilt from
  `10dd98f`, and the pristine row was measured last. `git status` was clean afterwards.
- **Not checked**: browsers. No `WeakRef` code ran outside V8, and the `FinalizationRegistry`
  timing in § 1.2 is V8's, not the language's. Also not checked: the bimodal timing in § 3's last
  column.
