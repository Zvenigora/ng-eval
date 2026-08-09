# Phase 1 — Step 1 Summary: `EvalHooks` core (no wiring)

**Date**: August 9, 2026
**Plan**: [`phase-1-plan.md`](./phase-1-plan.md) § 4, Step 1
**Target package**: `@zvenigora/ng-eval-core` (`modules/eval-core`, v0.2.5)
**Status**: complete — lint clean, 37 suites / 544 tests green, production build clean

---

## 1. What was built

The per-evaluation hook registry that the rest of Phase 1 dispatches into. Nothing in the
evaluator calls it yet; `beforeVisitor` / `afterVisitor` are untouched, and wiring is
step 3 by design.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `internal/classes/eval/eval-hooks.ts` | new | `EvalHooks` class, hook/event types, `EvalHookError`, error-policy handling, promise-return guard, open-node stack |
| `internal/classes/eval/eval-hooks.spec.ts` | new | 33 tests |
| `internal/classes/eval/public-api.ts` | edit | exports the seven symbols § 5 assigns to this step |

### API added

```ts
export class EvalHooks {
  constructor(options?: EvalOptions);              // reads options['onHookError']

  on(phase, type: AnyNodeTypes | '*', hook): Unsubscribe;
  off(phase, type: AnyNodeTypes | '*', hook?): void;
  clear(): void;

  dispatch(phase, node, state, value?): void;      // fires hooks; maintains the open stack
  enter(node, state): void;                        // called by the 'before' dispatcher
  exit(): void;                                    // called by the 'after' dispatcher
  unwind(error): void;                             // flushes open nodes, innermost first

  get errors(): readonly EvalHookError[];
  get isEmpty(): boolean;
}
```

Exported from the barrel: `EvalHooks`, `EvalHookPhase`, `EvalNodeHook`, `EvalNodeHookEvent`,
`EvalHookError`, `EvalHookErrorPolicy`, `Unsubscribe`. Purely additive — no existing
exported symbol changes shape. `ASYNC_HOOK_MESSAGE` is exported from the module but
deliberately not from the barrel.

### Behaviour worth recording

- **Dispatch order** is keyed hooks first, wildcard second.
- **`enter` / `exit` sit outside** `emit`'s `registry.size === 0` fast path, so a consumer
  that registers only `after` hooks still gets its nodes opened and unwound.
- **`invokeAll` iterates a copy** of the hook array. This is load-bearing, not defensive:
  a hook that unsubscribes itself mid-dispatch would otherwise cause the next hook to be
  skipped.
- **`clear()`** empties both registries and the open-node stack but retains collected
  errors — they are a record of what already happened.

---

## 2. Deviations from the plan's literal sketch

All four were reviewed and endorsed; none changes the design.

| Deviation | Reason |
| :--- | :--- |
| `exit()` takes no `node` parameter | § 3.8's own body ignores the argument, and an unused parameter fails lint. The pop is positional; the popped entry carries its own node. |
| `enter(node, state)` captures the state | `EvalNodeHookEvent.state` is required and § 3.8's `unwind(error)` has no state parameter, so the state is captured per open node. Keeps step 3's call site `state.hooks.unwind(error)` exactly as written. |
| `'throw'` policy downgraded to `'collect'` **while unwinding only** | Step 1's own spec bullet requires "a throwing hook during unwind still drains the stack". Scoped via an `unwinding` flag rather than mutating `_policy`, so it cannot leak into a later dispatch. |
| Read hooks (`onRead`, `EvalReadEvent`, `EvalReadKind`) not included | Step 1's deliverable and spec lists do not mention them; step 4 covers read hooks. § 3.2 sketches `onRead` as part of the eventual class API, not this step's. Step 4 will reopen this file and `public-api.ts`. |

---

## 3. Verification

| Gate | Result |
| :--- | :--- |
| `npx nx run eval-core:lint` | 0 errors, 0 warnings; no `eslint-disable` added |
| `npx nx run eval-core:test` | 37 suites / 544 tests (baseline 36 / 511, so +1 suite / +33 tests; no pre-existing spec disturbed) |
| `npx nx run eval-core:build:production` | clean; hook symbols present in the emitted `.d.ts` |
| `internal/performance.spec.ts` | unaffected — nothing dispatches yet |

---

## 4. Open items carried into later steps

Raised by review of this step, **not defects in it**. Both concern designs the plan
currently specifies verbatim, so they need a plan amendment before step 3 starts.

### 4.1 `unwind()` drains unconditionally, but `evaluate()` re-enters itself (step 3)

Step 3 places `state.hooks.unwind(error)` in `evaluate()`'s existing catch. But `evaluate`
is re-entered mid-walk with the **same state** at
`visitors/arrow-function-expression.ts:17`:

```ts
const value = evaluate(node.body, st);   // same st, own try/catch
```

Normally harmless — the nested throw propagates and the outer nodes really are abandoned,
and the second `unwind` is a no-op because `unwind` is idempotent. The failure case is a
host function that *swallows* the throw from an arrow body (e.g. a context-supplied
`safeMap(x => x.foo)`). The nested catch then drains the entire outer open stack while the
outer walk is still live: every enclosing node receives a synthetic `completed: false`
event followed later by its real `completed: true` one, and the stack is left empty so a
later genuine failure unwinds nothing. That is exactly the § 3.8 invariant this work
exists to guarantee.

Proposed fix, to be written into § 3.8 / step 3 first: add `get depth(): number` and
`unwindTo(depth, error)`, with `unwind(error)` becoming `unwindTo(0, error)`. Step 3 then
captures `const mark = state.hooks.depth` before `walk.recursive` and unwinds to `mark`.

### 4.2 `hasHooks` can flip mid-evaluation and desynchronize the open stack (steps 2–3)

§ 3.7 specifies `if (!st.hasHooks) return;` in both dispatchers, and § 3.6 defines
`hasHooks` as `!!this._hooks && !this._hooks.isEmpty`. Any registration change during a
walk then breaks pairing:

- the last hook unsubscribes inside a `before` handler → that node was entered, but
  `afterVisitor` now returns early and never calls `exit()`; every ancestor's `exit()` is
  skipped too;
- the first hook is registered during a walk → `before` was skipped (no `enter`), but
  `after` calls `exit()` and pops an *ancestor's* entry.

Self-unsubscribing and one-shot hooks are natural consumer idioms — the former is already
exercised in this step's spec. Proposed fix: make `hasHooks` sticky per evaluation, i.e.
latch it true for the remainder of a walk once any hook has been registered, so `enter` and
`exit` are always paired while the walk runs.

### 4.3 Smaller items

- **No `clearErrors()`** — `errors` grows without bound under the state-first style
  (`compile` + repeated `call` on one state), and `clear()` deliberately does not release
  it. Either add `clearErrors()` or have step 6's memory-leak spec assert the retention is
  intentional.
- **One `EvalHooks` per evaluation is assumed but not enforced.** Step 2 adopts
  `options['hooks']`; the natural idiom `const options = { hooks }` reused across two
  `simpleEval` calls shares one open-node stack and one error list. Consider cloning rather
  than adopting in step 2.
- **`ASYNC_HOOK_MESSAGE` has a `{@link}`** but is not reachable from the barrel. Either
  export it (additive, worth a line in § 5) or drop the link.
- **Two allocations per node on the hooks-enabled path** (`{ node, state }` per `enter`,
  plus the hook-array copy per dispatch). The no-hooks path that `performance.spec.ts`
  gates is unaffected.
