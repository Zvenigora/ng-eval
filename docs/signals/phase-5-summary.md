# Phase 5 — retrospect

Four steps, 2026-10-07 to 2026-10-09, against [`phase-5-plan.md`](phase-5-plan.md). The phase's
one retrospect, and step 4's record (§ 5); the plan holds each step's outcome in its § 4.

## 1. What shipped

| Step | Commit | What |
| ---- | ------ | ---- |
| 1 | `9d5715d` | `eval-core`, test only: `evaluate.async-walk.spec.ts` pins that the walk has ended when any of the six async entry points returns its promise, and that a walk which threw has already recorded it |
| 2 | `cce76ae` | `createEvalSignalAsync`, `EvalSignalAsync`, `EvalSignalStatus` and `EvalSignalService.createAsync`: the value, its status, `onError`, staleness, `destroy()`, `invalidate()`, `dependencies` and the scope-depth restore |
| 3 | `dafe5f3` | `EvalSignalAsyncOptions.abortSignalKey` — an `AbortController` per run, aborted on supersede and `destroy()`, its key checked at construction — and stability through `PendingTasks` |
| — | `01f2e44` | § 8 q1, run outside this workspace: the three async spec files pass at Angular 19.2.25, 20.3.33 and 21.2.25, with the library unmodified |
| 4 | this commit | the README, both CHANGELOGs, `eval-signals` 0.5.0 and `eval-forms` 0.4.1, [BL-C6](../backlog-retired.md#c6) retired |

**The release is additive.** Four exports and one method; no shipped symbol changes shape, no
shipped path changes behaviour, and no peer range narrows — the `>=19` floor holds, which is what
§ 3.2 chose two `computed`s and a `signal` over `resource()` and an `effect` to keep. The built
`.d.ts` differs from 0.4.0's by those additions and their comments; `eval-forms` 0.4.1 is its peer
range, with all three `.d.ts` files byte-identical to 0.4.0's. Nothing in `eval-core`'s source
changed.

## 2. What the plan got wrong, and what caught it

Every revision after the first was found inside a step and landed in that step's commit.
Each narrowed or reordered the design, or tightened what pins it, and none touched `eval-core`'s
source or widened the release.

| Revision | Found by | What was wrong |
| -------- | -------- | -------------- |
| 2 | step 1's review (P7) | `state.result.isError` at return is evidence in one direction only: an arrow's nested walk writes the same result. § 3.4's synchronous failure path was removed; every outcome comes from settlement |
| 3 | step 2, its probes and its review | § 3.2's sketch kept the last outcome in a slot shared between runs, holding a superseded run's value; one pushed scope is popped by `program.ts` in place of the `Program`'s own, so a stranding fixture needs two; only zone.js's hook reports an unhandled rejection here; `destroy()` must recompute `run` to drop the current run |
| 4 | step 3's gate and review | `getKey` misses a key holding `undefined`, so the collision check uses the signal context's own `match`; the supersede walked before it aborted, so a listener's write to a walked input went unseen |
| 5 | step 4's gate, a probe and its review | `equal` keeps the last value only when nothing read the signal while the run was pending, and a promise's resolved value comes back by identity rather than rebuilt (§ 3.7); the README's `resource` composition had been left out of execution whole, which is how C6 went unseen; the README's prose claims rested on a throwaway spec, so the file list gains the spec that pins them, and the JSDoc's "a microtask later" |

**Step 3's ordering defect is the one to remember.** Every criterion it was gated on was green
with the wrong order. A `computed` marks itself clean after computing, so a write made during
the computation is lost. That is invisible to any case that reads once and asserts. It took a
review that asked what an abort listener could *do*, and an emulation with Angular's own
primitives, to show it; the cases that pin it were added beside the criteria rather than
amending them.

**The § 8 q1 matrix found nothing, and that was its job.** It was a precondition rather than a
hope because the plan's `>=19` claim rested on one Angular version's measurements. It passed
106 / 106 at each version with two test-API substitutions at 19, and its three wrong
implementations failed the identical cases by name at all four versions, so the floor stands on
evidence instead of on the typings.

## 3. What the phase deliberately did not do

- **`await` in an expression** — § 3.1. A suspending walker would still lose tracking after its
  first `await`. Operand-position use is two signals, and the README shows it.
- **`reloading` / stale-while-revalidate, an `error` signal, a synchronous first value** — § 8 q2–q4,
  each with the condition that reopens it.
- **Any `eval-core` source change.** The defects the plan's probes surfaced there are recorded,
  not fixed: [A24](../backlog.md#a24) (an `async` arrow's `await` is a pass-through, which the
  README now states), [A25](../backlog.md#a25) (`awaitVisitor`'s timer, key and error mutation)
  and [A26](../backlog.md#a26) (the parse cache ignores options).

Opened along the way and still live: [A27](../backlog.md#a27) (step 1),
[C7](../backlog-retired.md#c7), [F17](../backlog.md#f17) and [F18](../backlog-retired.md#f18) (step 2), and
[A28](../backlog-retired.md#a28) (step 3). Closed: [C6](../backlog-retired.md#c6), by step 4.

## 4. What is left after this commit

The release itself: publishing `eval-signals` 0.5.0 and `eval-forms` 0.4.1, confirming them on the
registry, tagging, and the post-publish commit with their Publication status rows and the Register
history row — [`CONTRIBUTING.md`](../../CONTRIBUTING.md), Releasing, steps 3–6. That commit also
updates `CLAUDE.md`'s "Published at" line, which still reads 0.4.0 for `eval-signals`, and its
list of complete phases, which does not yet include 5.

## 5. Step 4's record

| File | Change |
| ---- | ------ |
| `modules/eval-signals/README.md` | "Async expressions" rewritten — the primitive, the status table, `onError`, two signals instead of `await`, what is resolved, cancellation, stability, the sync path with both `resource` spellings, the tested versions — and "Before you use it"'s async bullet |
| `modules/eval-signals/src/lib/readme-examples.spec.ts` | four cases for four new blocks, the Angular 19 block left out with its reason, the count 10 → 14 |
| `modules/eval-signals/src/lib/eval-signal-async.spec.ts` | a `README: Async expressions` describe: five cases for the README's prose claims, each naming the lines it pins — added after the review |
| `modules/eval-signals/src/lib/eval-signal-async.ts` | the JSDoc's "settles a microtask later" → "after a few microtasks", as the README says — added after the review |
| `modules/eval-signals/package.json`, `CHANGELOG.md` | 0.5.0 |
| `modules/eval-forms/package.json`, `CHANGELOG.md` | 0.4.1, `@zvenigora/ng-eval-signals` `>=0.4.0 <0.6.0` |
| `modules/eval-forms/README.md` | the quoted peer range, and "Anything asynchronous" — added to the file list at the confirmation gate |
| `ROADMAP.md` | Phase 5 done; "Suggested order" |
| `docs/backlog.md`, `docs/backlog-retired.md` | C6 retired; A24 notes the README; "Work in flight" |
| `docs/signals/phase-5-plan.md` | Revision 5: each step's outcome, the gate's corrections and the review's two files, § 3.7 narrowed, C6's links re-pointed |
| `docs/signals/phase-5-summary.md` | this file |

**Probes**, each reverted:

| Probe | Result |
| ----- | ------ |
| `eval-signals` bumped to 0.5.0 with `eval-forms`' range left at `<0.5.0` | `eval-forms:lint` red, 1 error: `@nx/dependency-checks` at `modules/eval-forms/package.json:23` ([F12](../backlog-retired.md#f12)'s mechanism). Green once widened |
| The README `resource` case with the read moved from `params` into `loader` | 1 of 13 red, that case, on the reload: `{ id: 7 }` where `{ id: 8 }` was expected |
| A throwaway spec through the factory, deleted, for the README's prose claims — pinned since by the five cases above, after the review found them resting on it | `equal` keeps the previous object with `status()` read across a run, and not with the value read while it was pending; a promise's resolved value returned by identity, a source object rebuilt; `loadUser(id).name` and `(async () => (await loadUser(id)).name)()` resolve to `undefined`; a read inside `.then` is not tracked; `'abort-signal'`, `'new'`, `'constructor'`, `'__proto__'` and a source key holding `undefined` refused; `[load(1), { b: load(2) }]` resolved at both depths; `'1 + 1'` reads `undefined` / `'loading'` first |
| P1 — `equal` not forwarded to the value's `computed` | 1 of 421 red: the `equal` case, and nothing else |
| P2 — the value keeps the last settled outcome while a run is pending | 10 of 421 red: the `equal` case (its pending read) and the `.then` case (its control's pending read), with eight existing cases — criteria 1, 8 and 10, step 3's settled-run abort, the third retention arm, the service case and two README cases |
| P3 — the signal context's resolver reads every source signal | 7 of 421 red: the `.then` case (`role` became a dependency), with criterion 1's negative half, three `createEvalSignal` reactivity cases, one `createSignalContext` case and the Quick start case |
| P4 — the walk wrapped in `untracked` | 23 of 421 red: the `equal` case (no run starts) and the `.then` case (its control), with twenty-one existing cases |

The other three README cases pin `eval-core`'s resolution — a resolved value returned by identity
and a walked object rebuilt, the resolution boundary, and a member read off a promise in operand
position — observationally. No code in this package decides them, so no probe of it applies.

**One reading of the confirmation gate was corrected in writing.** It asked the spec's coverage
list to say that the Angular 19 spelling is verified by § 8 q1's matrix. The matrix ran
`eval-signal-async.spec.ts`, `eval-signal-async.memory.spec.ts` and `eval-signal.service.spec.ts`,
none of which calls `resource()`, so the list says what does verify it: 19.2.25's published
typings, which is C6's own evidence.
