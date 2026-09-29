# A8 step 2 — `EvalService` stops tracking the states `createState` hands back

Plan and step in one, for [`docs/backlog.md`](../backlog.md) [A8](../backlog-retired.md#a8)'s second
half. It implements option (a) from [`step-2-decision.md`](step-2-decision.md), as decided on
2026-09-25. Drafted against `10dd98f`.

**Both costs the decision flags are accepted:**

- The registry clear, published in the `hooks` JSDoc and the README from 0.3.0 to 0.5.0, is
  withdrawn.
- [A21](../backlog-retired.md#a21)'s decision to keep that clear is reversed.

## 1. Objective

`EvalService` holds no reference to anything a caller passes it or is handed back.
`createState` keeps its destroyed check and returns what `BaseEval` builds. `ngOnDestroy` sets
the destroyed flag and does nothing else. After this step, a state from `createState` and its
context become collectable as soon as the caller drops them. That closes A8.

## 2. What the tree says, as of `10dd98f`

- **One field and one loop.** `_activeStates` is declared at `eval.service.ts:17`, added to at
  `:45`, removed from in `simpleEval`'s and `simpleEvalAsync`'s `finally` at `:131` and `:194`,
  and drained and cleared by `ngOnDestroy` at `:53-105`. Nothing else in `src/` reads it.
- **Nothing downstream relies on the drain. This was checked, not assumed.** In production code
  (not specs), `EvalService` appears in `eval-signals` and `eval-forms` only in comments:
  `eval-signal.service.ts:45` and `:47`, `eval-signal.ts:177-178` and `:360`, and
  `signal-context.ts:186`. The eval-core symbols those two libraries import are listed below.
  None of them is `EvalService`, and no production file in either library calls `.clear()` on a
  registry.

  | File | Imports from `@zvenigora/ng-eval-core` |
  | ---- | -------------------------------------- |
  | `eval-signals/.../eval-signal.ts` | `CompilerService`, `EvalContext`, `EvalHooks`, `EvalOptions`, `call`, `createDependencyTracker`, type `stateCallback` |
  | `eval-signals/.../eval-signal.service.ts` | `EvalContext` |
  | `eval-signals/.../signal-context.ts` | `EvalContext`, `EvalOptions` |
  | `eval-forms/.../field-context.ts` | `EvalContext`, `EvalOptions` |

  `eval-signals` builds its states at `eval-signal.ts:290`, through `compiler.createState`, on a
  `CompilerService` taken from the injector at `:223` / `:225`. `CompilerService` does not
  override `createState`, so it is `BaseEval`'s: `EvalState.fromContext` and nothing more.
  `CompilerService.ngOnDestroy` clears only its own compilation cache. `eval-forms` builds no
  states: it reaches evaluation through `eval-signals`.
- **Specs.** `plan.md` § 2.5's probe W4 ("`createState` stops tracking") listed what goes red:
  1.6, A20's control, five drain cases, and 3.1–3.4. Every one of them is inverted or deleted
  below. So is `eval-signal.memory.spec.ts:80-114`, which reads the field.

## 3. Design

**`eval.service.ts`.** Delete the field, the `add`, both of step 1's inner `try` / `finally`
blocks, and the drain loop. `simpleEval` and `simpleEvalAsync` still build their state through
`this.createState`, so criterion 1.8 stands for `plan.md` § 2.1's reason. `ngOnDestroy` becomes
one assignment. The class, `createState` and `ngOnDestroy` JSDoc say what is and is not kept.

**The A17 order and B3's silent `catch` are deleted with the loop.** Both existed to make the
drain safe. There is no drain, so there is nothing to order and nothing that can throw.

**The destroyed flag stays.** `OnDestroy` is still implemented, and later calls to
`simpleEval`, `simpleEvalAsync` and `createState` still throw. `eval` and `evalAsync` do not
check the flag, now or before.

## 4. Exit criteria

These are fixed here, before the specs change. Each names the wrong implementation it excludes.
§ 6 runs every wrong implementation against every case, and reads the result case by case.

**Retention.** These use A20's instrument: a target built in a closure that returns only a
`WeakRef`, a macrotask, and a forced full GC. `collect` loses its hand-clear and its
`dropStates` parameter.

- **2.1** A registry passed to `createState`, one `eval`, the state dropped: the registry is
  collected. This is A20's case 1, now without the hand-clear. *Excludes:* P0 (today's code) and
  P1 (tracking kept, drain removed).
- **2.2** A registry nested under a `context` key, passed to `createState`: collected. This is
  A20's case 3, the same way. *Excludes:* P0 and P1.
- **2.3** *(the positive control; replaces A20's control)* 2.1's fixture, but the test holds the
  state past `collect`: the registry is **not** collected. *Excludes:* J, an instrument that
  reports everything collected. Without this case, 2.1 and 2.2 cannot tell a working collector
  from a broken fixture.

**Destroy touches nothing the caller holds.** These are deterministic, and each inverts a spec
that pinned the drain.

- **2.4** A caller-held state with a trace bounded at 3 and 7 pushes keeps its trace length,
  `traceTruncated` and `tracePushCount` across destroy. This inverts A12's "should drain a
  caller-held state's trace". *Excludes:* P0 and P2 (a drain kept through weak tracking).
- **2.5** A21's case 1: the registry is intact, **and** the state's trace is unchanged.
  *Excludes:* P0 and P2.
- **2.6** Hooks registered on a held state's own registry survive destroy: `isActive`,
  `!isEmpty`, `hasReadHooks`, and a later `eval` still fires them. This inverts "should clear
  registered hooks". *Excludes:* P0 and P2. *(Corrected during the step. The draft also said P7,
  the registry clear kept by tracking adopted registries. The probe left 2.6 green: its registry
  is the state's own, which `options.hooks` tracking never sees. 2.7 and 1.7 are what catch
  P7.)*
- **2.7** A caller-owned `options.hooks` registry whose hook captures the state (`() => state`)
  is not cleared by destroy. This inverts "should clear a caller-owned registry that outlives the
  service", and is the withdrawn promise's own fixture. *Excludes:* P0, P2, and P7 (the registry
  clear kept by tracking adopted registries).
- **2.8** A held state's hook bookkeeping, meaning collected `hookErrors` and a frame left open,
  survives destroy. This inverts "should reset hook bookkeeping". *Excludes:* P0 and P2.

**`eval-signals`.**

- **2.9** *(replaces the `_activeStates` count at `eval-signal.memory.spec.ts:80-114`)* Five
  recomputes of a signal, each state caught by a caller-registry read hook as a `WeakRef`, and
  the third also held strongly by the test. After `collect`, four are collected and the third is
  not. It is a behavioural statement, and it holds whichever service builds the states. It is
  **not** a spy on `EvalService.createState`, which would pin a choice whose reason this step
  removes. *Excludes:* S1 (the factory keeps its states), S2 (the instrument without `gc()`),
  and S3 (the control not held).

**Unchanged, and each must stay green:**

- step 1's 1.1–1.5, 1.7 and 1.8;
- A20's cases 2, 4 and 5;
- A21's cases 2–5;
- both "destroyed service" cases (*excluding* P4, the flag not set, and P5, the `createState`
  override removed);
- the two `resetHookBookkeeping` cases;
- `eval-signals`' first memory case.

**Deleted, each with its reason:**

- **1.6** reads the field. Its piece-1 exclusions, W0–W3, now all reduce to "the service
  tracks", which 2.1 and 2.2 catch.
- **A20's control** is superseded by 2.1 and 2.3.
- **3.1–3.4 and their `describe`**: the drain, its order and its `catch` no longer exist.
**Narrowed, not deleted:**

- **"should not build a hook registry for a state that never used hooks"** loses its
  after-destroy half, which pinned the drain's `hasHooks` guard. With no drain, that half has no
  code under test. Its before-destroy half stays: a hookless `eval` leaves the registry
  unallocated. That half tests the walk's own guards, and nothing else in the suite observes it.
  *(Corrected during the step, from the code-reviewer's finding. The draft deleted the whole
  case as having "no code under test", which was true of one half only. Probe K below confirms
  it is the only case guarding that allocation.)*

**Added:**

- **2.10** `createState` and `simpleEvalAsync` throw after destroy. The new `ngOnDestroy` JSDoc
  promises that of all three entry points, and the two existing cases reach the flag through
  `simpleEval` only. *Excludes:* P4 and P5. *(Added during the step, from the code-reviewer's
  finding.)*

The `CHANGELOG.md` `[Unreleased]` entries that described those drains are rewritten under § 5.

**Test-first.** 2.1, 2.2 and 2.4–2.8 are written first and run against `10dd98f`, where each
must go red on its target assertion. 2.3 and 2.9 pin behaviour that is already true, so their
proof is the probes in § 6.

**GC fixtures follow A19's technique note.** Build the target in a function that returns only
the `WeakRef`, hold no closure over it past `collect`, and catch any error yourself. None of the
new cases throws.

**Gate:** `npx nx run-many -t lint test build`, all three projects.

## 5. Scope and files

**Code and specs**

- `modules/eval-core/src/lib/actual/services/eval.service.ts`: § 3.
- `modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts`: § 4.
- `modules/eval-signals/src/lib/eval-signal.memory.spec.ts`: 2.9, and the first case's comment
  on the destroy drain.

**Published text**

- `modules/eval-core/src/lib/internal/classes/eval/eval-options.ts`: the `hooks` JSDoc, which
  ships in the `.d.ts`. The promise is removed.
- `modules/eval-core/README.md`: the same paragraph.
- `modules/eval-signals/src/lib/eval-signal.ts`: `createEvalSignal`'s JSDoc says 0.6.0 "drains
  the trace in `EvalService.ngOnDestroy`". It ships in the `.d.ts`.
- `modules/eval-signals/src/lib/eval-signal.service.ts`: the class JSDoc describes the strong
  `Set`. It ships in the `.d.ts`.

**Comments**

- `modules/eval-signals/src/lib/eval-signal.spec.ts:122`.
- `modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts:69`, the probe table. That row
  records what a probe found then, so it gets a note, not a rewrite.

**Records**

- `CHANGELOG.md` `[Unreleased]`: rewrite the lead, *Changed*, *Upgrading* and *Fixed*, so that
  nothing announces a drain that does not ship.
- `docs/backlog.md`: A8 is retired as fixed. A12 (destroy no longer calls `clearTrace`), A17 (its
  subject is gone), A20 (its control deleted, and `createState` contexts released), A21 (the
  reversal) and B3 (its `catch` gone) are updated, with their index rows.
- `docs/a8/plan.md` § 4 and `docs/a8/step-2-decision.md`: pointers to this document.
- `docs/a21/plan.md`: a one-line pointer where it says the registry clear stays.

**Category:** fix, riding the unreleased minor. No exported symbol changes shape. One published
behaviour, the registry clear, is withdrawn, and *Upgrading* calls it out.

## 6. What was checked

**Red first.** With the specs changed and `eval.service.ts` still at `10dd98f`, seven cases
failed, each on its target assertion:

| Case | What the old code did |
| ---- | --------------------- |
| 2.1, 2.2 | kept the registry, so `deref()` returned it |
| 2.4 | emptied the trace to 0, where 3 was expected |
| 2.5 | emptied the trace to 0, where 1 was expected |
| 2.6 | cleared the registry, so `isActive` was `false` |
| 2.7 | cleared the registry, so `isEmpty` was `true` |
| 2.8 | reset the bookkeeping, so `hookErrors` was empty |

2.3 and 2.9 passed, as expected. They pin behaviour that was already true.

**Probes.** Each wrong implementation was run, one at a time, through a temporary switch in
`eval.service.ts` (P) or in a spec (I, J, S2, S3), or through an edit to `eval-signal.ts` (S1).
Each ran against the **full** `eval-core` and `eval-signals` suites, and the failures were read
by case name. Every probe was reverted before the next, and `git grep` found no probe marker
afterwards. The table lists every case that went red. Every case not listed stayed green.

| Probe | Wrong implementation | Red |
| ----- | -------------------- | --- |
| none | the finished code, through the switch | nothing: 1072 and 129 passed |
| P0 | `10dd98f`: tracked, drained at destroy, `simpleEval` untracked in a `finally` | 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8 |
| P1 | tracking kept and never drained, `simpleEval` states included | 2.1, 2.2, and step 1's 1.1–1.5 |
| P2 | weak tracking with every drain kept: the decision's (b), `simpleEval` tracked too | 2.4–2.8, and 1.7 |
| P4 | destroy does not set the flag | both "destroyed service" cases *(run before 2.10 existed)* |
| P5 | `createState` loses its destroyed check | both "destroyed service" cases, and 2.10 *(2.10 checked after it was added, on the memory spec)* |
| P6 | `simpleEval` bypasses `createState`, through a private builder with the check | 1.8 |
| P7 | the registry clear kept, by tracking adopted `options.hooks` registries strongly | 1.7, 2.7 |
| I | `eval-core`'s instrument with `gc()` not called | every retention case: 2.1, 2.2, 1.1–1.5, and A20's `caseInsensitive` case. 2.3 stayed green |
| J | `collect` reports every target collected | 2.3 alone |
| S1 | `createEvalSignal` keeps every state it builds | 2.9 alone, on the liveness array |
| S2 | `eval-signals`' instrument with `gc()` not called | 2.9: four `true`s where `false` was expected |
| S3 | 2.9's third state not held | 2.9, at the third element alone |
| K | `identifier.ts` drops `st.hasHooks &&` from its read guard, so a hookless walk touches `state.hooks` | "should not build a hook registry" alone, across both suites |

Every row matches its criterion's *Excludes*, with one exception, corrected in § 4: the draft
also credited 2.6 with P7. Five rows are caught by one case only: J by 2.3, P6 by 1.8, S1 and S3
by 2.9, and K by the narrowed registry case. P2 turning 1.7 red is what `step-2-decision.md` § 2.2.1 predicted for weak tracking
that also tracks `simpleEval`.

**Every service probe left all 129 `eval-signals` cases green.** That is expected, not a gap. No
`eval-signals` production code calls `EvalService` (§ 2), so this is the same evidence
confirmed at runtime. 2.9's subject is the signal factory, and only S1–S3 reach it.

**Case counts.** `eval-core` went from 1078 to 1074. Six cases were deleted: 1.6, A20's control,
and 3.1–3.4. Two were added: 2.3 and 2.10. `eval-signals` stayed at 129, with one case replaced
by another. *(The probe table above ran at 1072, before the review restored the registry case
and added 2.10.)*

**Gate:** `npx nx run-many -t lint test build --skip-nx-cache` passed for all three projects:
`eval-core` 1074 tests in 59 suites, `eval-signals` 129 in 8, and `eval-forms` 251 in 19, which
is unchanged. It ran twice, once before the code-reviewer and once after its fixes. The first run
had `eval-core` at 1072.

**Stability.** Each memory spec ran ten times in isolation, and both passed every time. Because
step 1's flake appeared only under contention (`plan.md` § 2.5), the full `eval-core` suite also
ran as four concurrent copies, three rounds in a row. All 12 runs ran 1072 of 1072 tests with
none failing. That was before the review added two deterministic cases, neither of which uses the
collector. Two more contended rounds after those fixes also passed: 8 runs, each 1074 of 1074. The new GC cases are 2.1–2.3, and 2.9 in `eval-signals`. Each builds its target in
a function that returns only `WeakRef`s. None throws, and none hands its target to a Jest
matcher.

**Code-reviewer**, before commit. It found the code change correct: every exit of the old and new
`simpleEval` / `simpleEvalAsync` traced, the destroyed check still reached, no exported shape
changed. It found two blocking faults and eleven lesser ones. All are fixed in this commit except
the last, which is recorded:

- **Blocking:**
  - *A deleted case covered live behaviour.* The registry case's pre-destroy half tests the
    walk's own guards, and nothing else does. It was restored, and probe K confirms it (§ 4,
    "Narrowed").
  - ***Upgrading* withdrew a trace reset that never shipped.** 0.5.0's destroy cleared the stack,
    the context, the hooks and the bookkeeping, never the trace, and `clearTrace()` is new in this
    release. The paragraph now names the bookkeeping. Two neighbouring sentences in `CHANGELOG.md`
    that said only the registry change asks anything of the caller were fixed with it. The error
    came from the draft in `step-2-decision.md` § 2.1, which now carries a correction note.
- **Published JSDoc:**
  - `EvalState.resetHookBookkeeping` (`eval-state.ts`, in the `.d.ts`) still said "`EvalService`
    holds its states in a strong `Set`". The sweep's search terms missed it. The clause is
    removed.
  - `EvalSignalService`'s JSDoc said "`EvalService` no longer keeps them", but it ships under an
    `eval-core` peer range that admits versions that do. It now says "from 0.6.0".
- **Stale records:**
  - four line links in [A5](../backlog.md#a5) into `eval.service.ts`, re-pointed to the moved
    `throw` sites;
  - three sentences in A8's entry still in the present tense;
  - two in [A17](../backlog-retired.md#a17)'s, now marked as history;
  - a comment in the memory spec saying `ngOnDestroy` abandons frames;
  - `plan.md`'s link to the replaced `eval-signals` case, and R4's link to a line that no longer
    exists, both unlinked;
  - `plan.md` § 1.3.3, which does not exist and is § 1.3, item 3, in `plan.md` and in the
    decision document;
  - 2.9's docblock, which said no local reaches a state while `held` does.
- **Coverage:** `createState` and `simpleEvalAsync` after destroy were untested, although the
  new JSDoc promises it. That is 2.10.
- **Not fixed, recorded as [A22](../backlog-retired.md#a22):** five older cases whose only destroy-related
  claim, "`ngOnDestroy` does not throw", became vacuous when `ngOnDestroy` became one assignment.
  They predate the step, and `CLAUDE.md` asks before deleting or weakening an assertion.

### Records found, and what each became

The sweep was a `git grep` over the repository for `ngOnDestroy`, `_activeStates`, the state
set, "until destroy", "kept until", "still kept", "still retained" and "drain", then a reading
of each hit.

**Changed**

- `eval.service.ts`: the JSDoc for the class, `createState` and `ngOnDestroy`.
- `eval-options.ts`: the `hooks` JSDoc, which ships in the `.d.ts`. The promise is removed, and
  it says what to do instead.
- `modules/eval-core/README.md`: the paragraph under the adopted-registry example, likewise.
- `eval-signal.ts`: `createEvalSignal`'s JSDoc, which ships in the `.d.ts`. It no longer cites a
  destroy-time trace drain.
- `eval-signal.service.ts`: the class JSDoc, which ships in the `.d.ts`. It no longer describes
  the strong `Set` as current.
- `eval-signal.spec.ts:122`, and two comments in `eval-signal.memory.spec.ts` (the first case's,
  and the one on the `DestroyRef` count).
- `trace-bound.spec.ts`'s probe table: a note that the drain was later removed.
- `eval.service.memory-leaks.spec.ts`: the docblocks for the A21, A20 and A8 blocks, and 1.7's
  comment.
- `CHANGELOG.md` `[Unreleased]`:
  - **Lead:** now names A8, A20, A21 and B3, and says one documented behaviour is withdrawn.
  - ***Changed*:**
    - the destroy trace-drain bullet is removed;
    - the `eval-signals` comments bullet is rewritten;
    - the `simpleEval`-only registry bullet is replaced by a ⚠️ bullet that withdraws the
      registry clear;
    - B3's bullet is rewritten, since there is no drain left to throw.
  - ***Upgrading*:**
    - the lifecycle bullet is rewritten;
    - the registry paragraph is rewritten, quoting the 0.3.0–0.5.0 JSDoc sentence and saying
      what to do instead;
    - the "evaluate through `createState` + `eval` instead" bullet is removed, because it
      recommended the path this step removes;
    - a paragraph is added for a `createState` state kept past the root injector.
  - ***Fixed*:**
    - A21's bullet drops "each state it still holds is still drained";
    - A20's bullet drops "a context passed to `createState` is still retained";
    - A8's bullet is rewritten to cover both halves;
    - **A17's bullet is removed**, because the behaviour it announced does not ship.
- `docs/backlog.md`:
  - the index rows for A8, A17, A20, A21 and B3;
  - A8, retired as fixed, with its line citations into the deleted code unlinked;
  - A12, where destroy no longer calls `clearTrace`;
  - A17, whose subject is gone;
  - A20, whose control was deleted and whose `createState` contexts are now released;
  - A21, which records the reversal and its cause;
  - B3, whose `catch` is gone.
- `docs/a8/plan.md` § 4, `docs/a8/step-2-decision.md`, and `docs/a21/plan.md`'s objective:
  pointers to the decision and to this plan.
- **Added after the code-reviewer:**
  - `eval-state.ts`: `resetHookBookkeeping`'s JSDoc, which ships in the `.d.ts`;
  - `docs/backlog.md`: A5's four line links, R4's link, a new entry [A22](../backlog-retired.md#a22) with
    its index row, and the remaining stale sentences in A8 and A17;
  - `docs/a8/plan.md`: § 1.3's `eval-signals` link and the § 1.3.3 citation;
  - `docs/a8/step-2-decision.md`: a correction note on its draft *Upgrading*.

**Found and left as they are**

- `docs/a20/plan.md`. It already says the control "is deleted then, along with the
  `_activeStates` clear in the setup", which is what happened.
- Completed design records that describe the code as it was when they were written:
  `docs/trace2/step-2.md` (the step that added the trace drain; A12's entry carries the note),
  `docs/side-effects/phase-1-plan.md` and `step-2-summary.md`, `docs/signals/phase-3-plan.md`
  §§ 3.3.1, 3.8 and 5 and `step-4-summary.md`, the six `docs/forms/step-*-summary.md`, and
  `docs/repository-audit.md:61`. None is a downstream contract: `phase-3-plan.md` § 9 does not
  mention the drain.
- `docs/backlog.md`'s preamble, which is the history of why the register exists.
- Unrelated hits:
  - `SECURITY.md` and `PERFORMANCE.md` sketch a `MemoryManager`, and `IMPROVEMENTS.md` describes
    `ParserService`;
  - the `ngOnDestroy` in both downstream READMEs, `docs/forms/worked-example.md` and the
    `readme-examples` specs is a consumer component's own;
  - "drain" in `CLAUDE.md` and `.claude/agents/code-reviewer.md` is the scope stack, and in
    `eval-hooks.ts` it is the open-node stack.
