# A8 — `EvalService._activeStates` retains every state until `ngOnDestroy`

Plan for [`docs/backlog.md`](../backlog.md) [A8](../backlog-retired.md#a8), the register's founding
entry, with [A17](../backlog-retired.md#a17) and [B3](../backlog-retired.md#b3) carried in the same method.
Drafted against `c0c385b`.

**Two steps, and this document executes only the first.** Step 1 is piece 1: the states
`simpleEval` and `simpleEvalAsync` build, plus A17 and B3. Step 2 is piece 2, the states
`createState` hands back. It is an ownership decision this plan frames and does not make. § 3
argues for the split.

[A20](../backlog-retired.md#a20) is a precondition that has been met, not a sibling of this fix. Before
A20's fix, `_activeContexts` held every context with a `type`, and it would have kept those
contexts alive after any fix here.

## 1. What the tree says

### 1.1 Every write and read of `_activeStates`

All four are in
[`eval.service.ts`](../../modules/eval-core/src/lib/actual/services/eval.service.ts), as of
`c0c385b`:

| Line | Use |
| ---- | --- |
| 17 | declaration, a strong `Set<EvalState>` |
| 42 | `add`, in `createState`, for every state it builds |
| 54 | iterated by `ngOnDestroy`'s drain loop |
| 92 | `clear()`, at the end of `ngOnDestroy` |

No line reads an entry except the destroy loop. `simpleEval` (`:108`) and `simpleEvalAsync`
(`:163`) build their states through `this.createState`, so they reach line 42. `eval` and
`evalAsync` take a state from the caller and add nothing. Outside the file, three specs read the
field (§ 1.3).

### 1.2 What the destroy drain does to each kind of state

The drain runs four calls per state inside one `try`, in this order: `stack.clear()`,
`clearTrace()`, `hooks.clear()` (only under `hasHooks`), then `resetHookBookkeeping()`. The
`catch` calls `console.warn` and moves on to the next state.

| State | Who can still reach it at destroy | What the drain changes |
| ----- | --------------------------------- | ---------------------- |
| Built by `createState`, still held by the caller | the caller | Everything. The trace drain ([A12](../backlog-retired.md#a12)) and the hook clear exist for this case, and both are pinned |
| Built by `createState`, dropped by the caller | only the set | Nothing anyone can observe. The drain empties an object that only the drain can reach, and `clear()` then releases it. **This is piece 2** |
| Built by `simpleEval`, call returned | only the set, unless it escaped (§ 1.4) | Nothing, unless it escaped. **This is piece 1** |
| Built by `simpleEvalAsync`, promise pending | the set and the async frame | It drains a state that a walk has yet to finish with: see § 1.5 |
| Built by `simpleEvalAsync`, promise settled | only the set, unless it escaped | As for `simpleEval` |

**An adopted `EvalHooks` is the one caller-owned object this drain changes.** A registry that
the caller passed as `options.hooks` is cleared whichever method built the state. That includes
a registry passed to `simpleEval`, whose state the caller never saw.

### 1.3 The specs that read the field, and what each becomes

A8's entry lists three.

1. **`eval.service.memory-leaks.spec.ts:78-91`** *(as of `c0c385b`; replaced by this step, so
   not linked)*, "should track and clean up active states". It calls `simpleEval` on a `Registry`, then
   asserts the set is non-empty, then empty after destroy. **After step 1 it goes red at `:85`**,
   because `simpleEval` leaves nothing in the set. Its first assertion pins the defect. Its
   second is about destroy, and the other drain cases cover that better. It becomes criterion
   **1.6** below, which reads the same field and asserts the reverse on four paths, with a
   `createState` control.
2. **A20's `contexts passed in are not retained` block.** Its `collect` helper clears the set
   before the GC. Its control case, "should still retain the context through A8's state set",
   asserts that the set keeps a context alive. **The control goes through `createState`, so
   step 1 leaves it green.** A8's entry says a fix turns it red. That is true of step 2, not of
   step 1. The hand-clearing splits along the same line:
   - cases 1 and 3 pass contexts to `createState`. They still need the clear, and keep it;
   - cases 2 and 4 pass contexts to `simpleEval`. After step 1 they pass without the clear, so
     they stop holding A8 out and run with the set intact. That turns them from "the service
     keeps no context of its own" into "the service keeps no `simpleEval` state", which is
     criteria **1.1** and **1.2**.
   The control is left as it is, and its comment is changed to name step 2. It is step 2's red
   spec.
3. **`eval-signal.memory.spec.ts:80-114`** *(`:80-112` as of `c0c385b`, and `:80-114` as of
   `10dd98f`. Replaced by step 2, so no longer linked.)*, the count of 5. It first asserts that the set stays at `0` while a signal recomputes five
   times. That is a **behaviour** of `eval-signals`: the factory builds its states through
   `CompilerService`, never `EvalService`. It then runs five `simpleEval` calls and asserts
   `5`. That is a **symptom**, A8 itself, used as a contrast to show that the `0` is not
   vacuous. The comment says so: "It also pins an `eval-core` defect".
   **After step 1 the count is `0` and the spec goes red at `:111` (`:113` now).** The contrast is then gone,
   and a zero next to a zero proves nothing. The comment above it already describes the
   contrast as five evaluations "driven the way § 3.8 originally proposed — through
   `EvalService.createState`", but the code drives `simpleEval`. So the fix is to make the code
   match the comment: `createState` plus `eval`, five times. **The count stays 5, and it is still
   a symptom.** It now pins piece 2, and step 2 turns it red at the same line. The comment is
   changed to say that. A more lasting form would assert behaviour directly, for example a spy
   showing that `EvalService.createState` is never called. That choice depends on piece 2's
   answer, so step 2 makes it.

`grep` finds no other reader of the field, and no other spec whose result depends on destroy
draining a `simpleEval` state. The gate confirms both.

### 1.4 Does anything observe a `simpleEval` state after the call returns?

Yes, in three ways. None of them runs through the service.

- **An escaped closure.** `arrow-function-expression.ts` pushes a closure that calls
  `evaluate(node.body, st)` with the walk's own state. If the arrow function is the result, or
  is written into the context, or is handed to a context function that stores it, the state
  lives as long as that closure does. Today, destroy drains such a state. The closure still works
  afterwards: its trace is empty and its adopted registry is cleared. After step 1, destroy leaves
  it alone. Its trace, at most `maxTraceItems`, stays with the closure, and its hooks go on
  firing. Either way the caller's closure keeps the state alive. The service is not what
  retains it.
- **A hook the caller supplied.** Each event carries `event.state`, and a callback can store it.
  The callback was registered **before** the state existed, so it cannot close over the state
  directly. It can only put it somewhere, and that somewhere belongs to the caller.
  `createDependencyTracker`'s `reads` array is the library's own example. Today destroy clears
  the adopted registry. That drops the callback, and with it any storage that only the callback
  held. It does **not** release storage the caller also holds, such as `tracker.reads`. After
  step 1, destroy does not touch a registry that only `simpleEval` states adopted. **This is a
  change to published text.** Both the `hooks` JSDoc in
  [`eval-options.ts`](../../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts),
  which ships in the `.d.ts`, and the eval-core README say destroy clears "the registries of the
  states it created". Step 1 narrows both to "the states `createState` handed back". § 2.2
  weighs what that costs.
- **An error.** A hook error under `onHookError: 'throw'` rejects `simpleEvalAsync` with the
  original error. `simpleEval` rethrows `new Error(message)` instead ([A5](../backlog.md#a5)).
  Only the caller holds that error, and it points at no state.

The registry itself holds no reference to a state. The walk bases and the open-node stack live
on the state (`hookBookkeeping`), not on `EvalHooks`.

### 1.5 The async form: settle first, and rejection

`evaluateAsync` walks synchronously up to its first `await`, then writes to the state again
after the promise settles: `result.stop()`, then `setSuccess` or `setFailure`, and
`hooks.unwindTo` on rejection. **The async frame keeps the state alive for as long as the
promise it awaits is reachable, whether or not the set does.** So removing the state from the
set once the synchronous part returns frees nothing that could otherwise be freed, and it loses
nothing either. Waiting for the promise to settle would change neither result. *(Corrected
during the step. The draft said "until the promise settles". A promise that never settles and
whose resolvers nobody can reach is collectable with its frame and the state. Under the old set,
that state was kept until destroy.)*

Removing it early is also the better behaviour when destroy races a pending call. Today, destroy
drains the pending state mid-flight. It clears the trace, and clears the hooks, so the rejection
path's `unwindTo` is skipped because `hasHooks` is now false. After step 1, destroy does not
touch it, and the promise settles exactly as it would have.

**On rejection there is nothing to clean up.** The state leaves the set in a `finally` around the
synchronous call, before the promise has a result. A version that removes it in `.then` would
keep every rejected call's state until destroy. Criterion 1.5 excludes that version.

## 2. Step 1 — piece 1, A17, B3

### 2.1 Design

**Piece 1.** `simpleEval` and `simpleEvalAsync` keep calling `this.createState`, then remove
the state from the set in a `finally` around their own walk. For the async form, the `finally`
wraps the synchronous `evaluateAsync(...)` call, not the promise. About ten lines.

*Why not a private builder that skips the `add`:* `createState` is a public, overridable method
on a published class, and today `simpleEval` dispatches through it. A subclass that overrides
`createState`, for example to supply default options, would silently stop affecting
`simpleEval`. Adding and then removing keeps `createState` as the one construction point.
Criterion 1.8 pins that.

For the length of a synchronous call the state is in the set, so a destroy that re-enters from
a hook or a context function still drains it, as it does today. That is not a retention: the set
releases it when the call returns.

**A17.** Reorder the drain: first the state's own structures, then the caller-reachable ones.
The new order is `stack.clear()`, `resetHookBookkeeping()`, `hooks.clear()`, `clearTrace()`.

- *Internal* means the library's working structures, which no caller has a documented reason to
  hold. The value stack's array is private. `resetHookBookkeeping` reassigns a field and does
  not mutate the array a caller may hold (`hookErrors` hands out the live one, and the existing
  spec pins that reset replaces it rather than emptying it).
- *Caller-owned*: the adopted registry (`options.hooks`), and the trace, whose published getter
  hands out the live array. That makes **two**, as the entry now says.
- **Of the two, the hook clear goes first.** A17 names it as the drain that matters for
  retention. A frozen trace is the caller's own view of a state the caller holds, and a trace
  left uncleared costs only the caller. The reverse exposure remains, and it is accepted: a
  registry whose `clear` throws (for example a frozen one) still skips `clearTrace` for that
  state. Protecting both would need a `try` per drain. The entry lists that option, and the brief
  chose the reorder.
- A caller who freezes the **state** defeats every drain. That is out of scope.

**B3.** The `catch` stays, since one state's throw must not stop the others (criterion 3.3).
The `console.warn` in it is deleted, and the `catch` becomes silent, with a comment explaining
why. The `isDevMode()` carve-out does not qualify. After the reorder, the only drains that can
throw are the caller's, and the only thing a throw costs is the caller's own object (its frozen
trace, or its hostile registry). The carve-out is for a misuse that fails silently **and harms
something the caller could not have caught**. B3's other site,
[`parser.service.ts:67`](../../modules/eval-core/src/lib/actual/services/parser.service.ts#L67),
is in a `setInterval` callback, not in `ngOnDestroy`, so it stays in B3.

### 2.2 Narrowing the registry clear: a trade, with a small cost

*(Corrected during the step, from the code-reviewer's finding. The draft was titled "why
narrowing the registry clear is not a gap", and argued that the clear protected nothing on the
`simpleEval` path. That is false, and § 1.4 above had already conceded as much.)*

The published reason for clearing an adopted registry is that "a registry outliving the service
cannot keep those states and their AST nodes reachable". A registry reaches a state only through
a callback that holds it. On the `createState` path the caller can write
`hooks.on('after', '*', () => state)`, because the state exists before the registration. The
existing spec "should clear a caller-owned registry that outlives the service" is exactly that
shape, and step 1 leaves it untouched.

On the `simpleEval` path, the state does not exist when the callbacks are registered. A callback
can still reach it, by storing `event.state` in storage that only the callback can reach. Two
examples: `let last; hooks.on('after', '*', (e) => { last = e.state; })`, or
`createDependencyTracker().install(hooks)` with the tracker's handle dropped, since its `reads`
holds the events. Both build the chain registry → callback → storage → state → context. That is
the same shape the clear breaks on the `createState` path. Before this step, destroy broke it.
**After this step, the chain lasts as long as the caller keeps the registry.** That is a real,
small loss.

**It is the price of the fix, not something to fix.** Keeping the clear for `simpleEval` states
would mean the service keeps those states, or their registries, until destroy. That is A8 again,
or A20. The cost falls only on a caller who keeps a registry past the service, and whose hooks
store their events where only the hooks can reach them. That caller can call `hooks.clear()`,
and `CHANGELOG.md`'s *Upgrading* says so. Every other published destroy behaviour applies only to
`createState` states and is unchanged.

### 2.3 Exit criteria

The criteria are fixed here, before code. Each case names the wrong implementation it excludes.
The probes in § 2.5 run every wrong implementation against every case, and the result is read
case by case.

**Piece 1.** Cases 1.1–1.5 use A20's instrument: a context built inside a closure that returns
only a `WeakRef` to it, a macrotask yield, and a forced full GC. They **leave `_activeStates`
intact**. Because a state holds its context, "the context is collected" implies "no state that
the service holds refers to it".

- **1.1** `simpleEval('a + 1', registry)` three times, each → `11`. The registry is collected.
  This is A20's case 2 with the hand-clear removed. *Excludes:* today's code.
- **1.2** `simpleEval('a + 1', new EvalContext({ a: 10 }, {}))` → `11`. The context is collected.
  This is A20's case 4, the same way. It is the shape `eval-signals` documents,
  `simpleEval(expr, createSignalContext(...))`. *Excludes:* today's code.
- **1.3** `simpleEval` whose walk throws (a context function that throws). The call throws, and
  the registry is collected. *Excludes:* removing the state only on the success path, after
  `evaluate` returns, rather than in a `finally`.
- **1.4** `simpleEvalAsync('a + 1', registry)`, awaited → `11`. The registry is collected.
  *Excludes:* fixing `simpleEval` and not `simpleEvalAsync`.
- **1.5** `simpleEvalAsync` whose promise **rejects** (a context function that returns
  `Promise.reject(...)`). It rejects, and the registry is collected. *Excludes:* removing the
  state in a fulfilment handler (`promise.then(() => delete)`), and fixing only the sync form.
- **1.6** *(deterministic; replaces `:78-91`)* After a `simpleEval`, a throwing `simpleEval`,
  an awaited `simpleEvalAsync` and a rejected `simpleEvalAsync`, the set's size is `0`. After
  one `createState` it is `1`, and after destroy it is `0`. *Excludes:* all four wrong
  implementations above, without depending on the GC. It also excludes piece 2 decided in
  passing: a `createState` that stops tracking fails the `1`.
- **1.7** A registry passed to `simpleEval` as `options.hooks`, with a hook registered, is
  **not** cleared by destroy: `isEmpty` is `false`, and the hook still fires on a later
  evaluation. *Excludes:* today's code, and keeping the clear by tracking adopted registries on
  the service, which would be A20's retention on a new field.
- **1.8** `simpleEval` still builds its state through `createState`: a spy on the instance's
  `createState` is called once. *Excludes:* a private builder that bypasses the public method
  (§ 2.1).

**Unchanged, and each must stay green:** A20's cases 1 and 3, with their hand-clear, and the
control, which still observes a `createState` state keeping its context. Every drain case on
`createState` states: trace, hooks, the caller-owned registry, bookkeeping, and no registry
allocated. A21's five cases. Both "destroyed service throws" cases. *These exclude:* dropping
the `add` in `createState`, which is piece 2 decided in passing (the control and the drain cases
go red), and a builder that skips the destroyed check (the throw cases go red).

**A17**, test-first. Each case uses a `createState` state with a hook registered, a non-empty
trace, and `Object.freeze(state.result.trace)`. Freezing an empty array would not make
`length = 0` throw, so the fixture asserts the trace is non-empty first. After destroy, the trace
is **still** non-empty, which shows that the drain threw.

- **3.1** The hooks were cleared (`isEmpty`, `!isActive`). *Excludes:* today's order, and a
  reorder that puts the caller-owned drains last but the trace before the hooks.
- **3.2** The bookkeeping was reset (`hookErrors` is empty, and the open-node stack is empty).
  *Excludes:* today's order, and a reorder that moves the hook clear ahead of the trace but
  leaves bookkeeping last.
- **3.3** With two states, the first frozen and the second not, destroy does not throw, and the
  second state's trace is drained. *Excludes:* removing the `catch` along with B3's `warn`.
  *(The probe showed that this wrong implementation turns 3.1–3.4 red, not 3.3 alone. Destroy
  throws, so every case with a frozen trace fails. 3.3 is the case that states the behaviour.)*

**B3.**

- **3.4** Destroy with a frozen trace does not call `console.warn`. The spy is installed and
  restored within the case. *Excludes:* today's code, and a warn guarded by `isDevMode()`, since
  Jest runs in dev mode. *(Corrected during the step. The draft's proof that the `catch` ran was
  "the trace is still non-empty after destroy". Probe W4, where `createState` stops tracking,
  left 3.4 green, because a state the drain never reaches also keeps its trace. The case now
  spies on the state's `clearTrace` and asserts that its one call threw. That observes the
  `catch` running whatever the drain order is, and W4 turns it red.)*

**Gate:** `npx nx run-many -t lint test build`, all three projects.

### 2.4 Scope and files

- `modules/eval-core/src/lib/actual/services/eval.service.ts`: piece 1, the reorder, and the
  silent `catch`.
- `modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts`: `:78-91`
  replaced by 1.6. A20's `gc` and `collect` lifted one `describe` up so the A8 cases share them.
  A20's cases 2 and 4 stay where they are as 1.1 and 1.2, with `collect(ref, false)` and a
  comment naming the criterion. *(Corrected during the step. The draft moved them into the A8
  block. That churns A20's numbering for no gain.)* A20's docblock now says the hand-clear is for
  `createState` only. The control's comment re-aimed at step 2. New cases 1.3–1.8 in an A8
  `describe`, and 3.1–3.4 in an A17/B3 `describe`.
- `modules/eval-signals/src/lib/eval-signal.memory.spec.ts`: the contrast is driven through
  `createState`, as its comment says, and the comment is re-aimed at step 2.
- `modules/eval-core/src/lib/internal/classes/eval/eval-options.ts`: the `hooks` JSDoc is
  narrowed (§ 1.4).
- `modules/eval-core/README.md`: the same sentence.
- `CHANGELOG.md`, `[Unreleased]`: A8's `simpleEval` half under *Fixed*, saying the contexts
  passed to `simpleEval` / `simpleEvalAsync` are now collectable, as A8's entry asks. A17 under
  *Fixed*. The registry narrowing and B3 under *Changed*. A20's existing line, "every other
  context is still retained", is narrowed to `createState`.
- `docs/backlog.md`: A8 (piece 1 fixed, piece 2 open, the three specs as found), A17 (fixed, and
  the residual exposure), B3 (one site left), A20 (the control is step 2's, and the retained
  contexts are `createState`'s only). Also their index rows, and the line citations into
  `eval.service.ts` that this change moves: A8's, B3's, and A5's four `EvalService` rows.
- `docs/a8/plan.md`: this file.

**Category:** fix. No exported symbol changes shape. Destroy's reach narrows, and the change
rides with the `[Unreleased]` block already bound for `eval-core`'s next minor. No bump and no
manifest.

### 2.5 What was checked

- **Red first.** Against `c0c385b` with the new specs in place, ten cases failed, each on its
  target assertion: 1.1–1.7, 3.1, 3.2 and 3.4. 1.8 and 3.3 passed, as expected, because they pin
  behaviour today's code already has: `simpleEval` dispatches through `createState`, and the
  `catch` is per state. The `eval-signals` contrast, re-driven through `createState`, stayed at
  5, since that half is unchanged.
- **Probes** of the finished code, one at a time, each reverted before the next. The table lists
  every case that went red in the memory spec. Every case not listed stayed green.

  | Wrong implementation | Red |
  | -------------------- | --- |
  | W0: piece 1 reverted (no `delete` in either form) | 1.1–1.7 |
  | W1: sync fixed, async still tracks | 1.4, 1.5, 1.6 |
  | W2: async removes in a fulfilment handler | 1.5, 1.6 |
  | W3: sync removes on the success path only | 1.3, 1.6 |
  | W4: `createState` stops tracking (piece 2 decided in passing) | 1.6; A20's control; five drain cases (the caller-held trace, A21's case 1, registered hooks, the caller-owned registry, bookkeeping); 3.1–3.3, and 3.4 after its correction. Also `eval-signal.memory.spec.ts:113` |
  | W5: a private builder that bypasses `createState`, keeping the destroyed check | 1.8 |
  | W5′: the same without the destroyed check | 1.8, and both "destroyed service" cases |
  | W6: the registry clear kept, by tracking adopted registries on the service | 1.7 |
  | X0: today's drain order | 3.1, 3.2 |
  | X1: caller-owned last, trace before hooks | 3.1 |
  | X2: hooks before trace, bookkeeping still last | 3.2 |
  | Y0: the `console.warn` restored | 3.4 |
  | Y1: the warn behind `isDevMode()` | 3.4 |
  | Y2: the `catch` removed with the warn | 3.1–3.4 |
  | I: the instrument, with `gc()` not called | every retention case: A20's 1–5 and A8's 1.3–1.5 |

  Every row matches its criterion's *Excludes*, with two exceptions, both corrected above. Y2
  reaches more cases than 3.3, and before 3.4's correction W4 left 3.4 green. 1.6 is the
  deterministic backstop. It goes red under W0–W4 without depending on the GC, so a GC that
  misbehaved would still leave one case per wrong implementation standing. Six rows are caught
  by one case only: W5 by 1.8, W6 by 1.7, X1 by 3.1, X2 by 3.2, and Y0 and Y1 by 3.4. Each of
  those cases is the only thing between its wrong implementation and a green suite.
- **Case 1.3 was flaky, and the flake was in its fixture, not in the fix.** Found after the
  first commit, when a later gate run failed 1.3 alone, `deref()` returning the registry. The
  gate failed twice in seven `run-many` runs. It never failed alone: 24 isolated runs of the
  spec at 8-way concurrency passed, and so did six serial runs of the full suite. It reproduced
  only when four full-suite runs competed with each other, failing 4 times in 32. With a
  temporary assertion added before the collect, the service's set was **empty** in every failure.
  The fixture was `expect(() => service.simpleEval('boom()', registry)).toThrow('boom')`. The
  errors thrown through that call capture a stack frame of the arrow, whose closure holds the
  registry. Something on Jest's path then kept one of those errors alive under load. A variant
  with no closure over the registry, which catches the error itself and keeps only its message,
  passed all 20 contended runs in which the original failed twice. 1.3 now uses that form. As
  1.3, it then passed 64 more contended runs, 40 and then 24. Re-probed after the change: W0
  and W3 still turn 1.3 red. The mechanism holding the error was not identified, only located on
  the test side of the boundary. *(Corrected after the step's first commit.)*
- **The sweep for the same shape.** The instrument is used in one spec only, and every case that
  uses it was checked for an arrow over its target handed to `toThrow` / `rejects.toThrow`, or
  any closure over the target kept past `collect`. A20's six cases are clear: none throws, and
  each builds its target in a function that returns only the `WeakRef`. 1.4 is clear. **1.5 had
  the shape**: its rejection is an error created by a function called on the registry, handed to
  `rejects.toThrow`. It never failed, but under this hazard passing proves little, so it now
  uses 1.3's form. Re-probed: W2 still turns it red. A19's technique note records the hazard and
  the fix.
- **Three contended runs reported fewer than 1078 tests.** The first reading said "and no
  failure". That was wrong: the filter that produced it matched only `● … › …` lines. Reproduced
  with every log kept, under the same condition of four concurrent full `eval-core` suites, 40
  runs:
  - 39 ran 59 of 59 suites and 1078 tests, and exited 0.
  - One ran 1012 and **exited 1**. Jest reported it: `Test Suites: 1 failed, 58 passed`, and
    `eval.service.case-insesitive.spec.ts` "failed to run" with 66 tests. The cause was ts-jest's
    resolver getting `UNKNOWN: unknown error, stat '…/visitor-result.ts'` from Windows while it
    loaded the visitors barrel. A repo-wide `grep` was also reading the tree at the time.

  **So a suite that fails to load is not silent.** Jest names it and the process exits non-zero,
  so `nx run-many` would fail the task. A green gate still means every suite ran. The three
  original short runs fit this, but their logs were deleted before they were read, so that
  cannot be proven. This is a transient filesystem error, under concurrent file access that the
  gate does not create. It is not worker teardown, so it is not [F7](../backlog.md#f7), and it
  gets no entry of its own.
- **Stability.** The memory spec ran ten times in a row on Node 26.4.0, and passed 38 of 38 each
  time. This step adds three GC cases (1.3–1.5) and moves two (1.1, 1.2) onto a harder
  condition, with the set intact, on A20's instrument. *(Corrected after the first commit. This
  said "the failure mode is still binary: the collector either frees an unreachable object or it
  does not". That holds for the collector, and not for the case as a whole. The flake recorded
  above is the other failure mode: a fixture that makes the target reachable some of the time.
  Ten isolated runs cannot see it. It shows only under contention.)*
- **Gate:** `npx nx run-many -t lint test build --skip-nx-cache`, green for all three projects.
  eval-core has 1078 tests: 1069, minus the replaced `:78-91`, plus ten. eval-signals has 129 and
  eval-forms 251, both unchanged.
- **Code-reviewer**, before commit. It found no defect in the code or specs, and confirmed that
  the registry-clear sentence shipped in `eval-core@0.5.0`, so the narrowing is a published
  change. It found these documentation faults, all fixed in this commit:
  - § 2.2's "not a gap" was false, with a counterexample (corrected above, and in § 3);
  - two older `[Unreleased]` entries still said destroy drains "each state it created";
  - the A8 entry still said `simpleEval` retains, and miscounted its cases;
  - § 1.5 overstated what the pending async frame holds.

  It also found that `CLAUDE.md`'s `console.*` paragraph still counts two service-layer calls.
  There is one now. This step does not edit that paragraph, and leaves it to the user.

## 3. The split

**Piece 1 sized:** about ten lines of production code in two methods, and the answer to "who
owns it" is forced: the caller never receives the state. The tests are deterministic (1.6–1.8,
3.x) or use A20's proven GC instrument (1.1–1.5). The one published consequence, the registry
narrowing, falls out of § 1.4 and needs no design choice.

**Piece 2 sized:** unknown, and that is the argument. A `createState` state is handed back, so
the caller holds it and may drop it. Something has to decide whether the service keeps a claim
on it, and every candidate costs something published:

| Option | What it keeps | What it costs |
| ------ | ------------- | ------------- |
| (a) The caller owns it, and the service stops tracking | nothing at destroy | The published registry clear, and the unreleased trace drain, for exactly the path where `hooks.on(..., () => state)` is possible. A21 kept the clear deliberately |
| (b) Weak tracking: `WeakRef`s, pruned by `FinalizationRegistry` or by a sweep | every drain, for any state still reachable. A registry that captures a state keeps it reachable, so the clear still fires where it matters | A `WeakRef` and a registration per `createState` (performance gate). ES2021 runtime APIs in shipped code, under a peer range of Angular ≥ 19. Pruning whose timing is not deterministic. Tests that are GC-only |
| (c) An explicit release: `releaseState(state)` or `state.dispose()` | today's behaviour for callers who call it | New public API, and nothing for callers who do not call it |
| (d) A bounded set (LRU) | an arbitrary subset | Destroy's drain silently skips live states. Rejected |

(b) looks closest to right, because it keeps every published promise for every state that is
still reachable. But it is a runtime-API decision, a performance decision and an ownership
decision together. Bundling those with piece 1 is how a day becomes a week.

**The split is stable in what it fixes. It is not guaranteed to be stable in what it gives up.**
Under (a), `simpleEval` states are untracked anyway. Under (c), the caller has no handle to
release. Under (b), tracking `simpleEval` states weakly would **restore** the registry clear for
exactly § 2.2's stash case: a state that a hook stored stays reachable through the registry, so
its `WeakRef` would still dereference at destroy. So step 2 may choose to reopen that one
narrowing, at the price of a `WeakRef` per `simpleEval` call on the hot path. *(Corrected during
the step. The draft said step 2 could not reopen step 1, on the strength of § 2.2's "not a gap",
which was also corrected.)* Either way, the retention step 1 removes stays removed: a
`simpleEval` state that nothing else reaches is collectable under every option.

**Against splitting:** A8 stays open, with two specs still pinning its `createState` half (A20's
control, and `eval-signals`' contrast). That is acceptable. `simpleEval` is the per-call growth
the entry was filed for: every call retained a state. A `createState` caller holds the state on
purpose, and leaks only the ones it drops.

## 4. Step 2 — piece 2, not planned here

*Settled 2026-09-25.* [`step-2-decision.md`](step-2-decision.md) answers each point below and
chose (a): the caller owns the state, and the service stops tracking it.
[`step-2-plan.md`](step-2-plan.md) implemented it. The bullets are left as the question was put.

Left as a question, with § 3's table as its starting point. Its plan has to settle:

- which of (a)–(c) applies, and whether the unreleased trace drain and the published registry
  clear survive it. Under (b), also whether to extend weak tracking to `simpleEval` states and
  restore their registry clear (§ 3);
- if (b), the runtime baseline for `WeakRef` / `FinalizationRegistry` under the peer range and
  SSR, the performance cost per `createState` under `performance.spec.ts`, and how pruning is
  tested;
- what happens to A20's control case and to `eval-signals`' contrast, which both go red under
  any option that stops retention, and whether the contrast becomes a behavioural assertion
  (§ 1.3, item 3).
