# Phase 1 — Step 2 Summary: Attach hooks to `EvalState`

**Date**: August 9, 2026
**Plan**: [`phase-1-plan.md`](./phase-1-plan.md) § 4, Step 2
**Target package**: `@zvenigora/ng-eval-core` (`modules/eval-core`, v0.2.5)
**Commit**: `248d385`
**Status**: complete — lint clean, 37 suites / 573 tests green, production build clean

---

## 1. What was built

The hook registry is now reachable from an evaluation, and the two things that belong to a
single run — the open-node stack and the collected errors — were moved off the registry and
onto the state. Still nothing dispatches: `beforeVisitor` / `afterVisitor` are untouched and
remain step 3.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `internal/classes/eval/eval-state.ts` | edit | lazy `hooks`, `hasHooks`, `hookErrors`, `@internal` `hookBookkeeping`, by-reference adoption of `options['hooks']` |
| `internal/classes/eval/eval-hooks.ts` | edit | latching `isActive`; `_open` / `_errors` removed; `depth` / `unwindTo` added; `exit` / `unwind` take a state; `errors` getter removed |
| `internal/classes/eval/eval-state.spec.ts` | edit | +16 cases (hooks defaults, the latch, adoption, isolation) |
| `internal/classes/eval/eval-hooks.spec.ts` | edit | +19 cases; step 1's assertions relocated to the state |
| `docs/side-effects/phase-1-plan.md` | edit | § 3.6 / § 4 / § 5 amendments settled during the step |

`internal/classes/eval/public-api.ts` is listed as an edit by the plan but is **unchanged**,
correctly — the plan's own bullet says there is nothing new to export, and every added
member is a getter or method on an already-exported class.

### API added

```ts
class EvalState {
  get hooks(): EvalHooks;                        // lazy; adopted from options['hooks']
  get hasHooks(): boolean;                       // the dispatch guard; reads hooks.isActive
  get hookErrors(): readonly EvalHookError[];    // per-run, live array
  get hookBookkeeping(): EvalHookBookkeeping;    // @internal — EvalHooks is its only writer
}

class EvalHooks {
  get isActive(): boolean;                       // latches on first on(), reset only by clear()
  depth(state): number;                          // method, not a getter — see § 2
  unwindTo(mark, error, state): void;
  unwind(error, state): void;                    // was unwind(error)
  exit(state): void;                             // was exit()
  // removed: get errors()
}
```

`EvalHookBookkeeping` is exported from its module so the `@internal` getter's return type is
nameable, but is deliberately absent from the barrel. Verified in the emitted
`dist/modules/eval-core/types/zvenigora-ng-eval-core.d.ts`: declared at the top level,
present in neither export list.

### Behaviour worth recording

- **`hasHooks` latches.** Merely reading `state.hooks` does not turn it on — registering
  does. It stays true after the last hook is removed. Only `clear()` unlatches. The guard
  wraps `enter` / `exit` as well as the hooks, so a value that changed mid-walk would
  desynchronize the open stack in both directions.
- **Adoption is by reference and never clones**, so the unsubscribe closures the caller
  already holds keep working against the registry that is actually being dispatched.
- **One `EvalHooks` can drive several `EvalState`s** without cross-talk. Both the open
  stacks and the error lists are per-state, asserted directly and through
  `service.createState` with a shared options object.
- **`hookErrors` returns the live array.** An earlier draft returned a shared module-level
  empty array until the first collection; see § 2.

---

## 2. Deviations from the plan's literal sketch

All were raised before implementing and confirmed. Items 1–3 and 6 are now written into the
plan, so the plan and the code agree.

| Deviation | Reason |
| :--- | :--- |
| Adoption happens in the `EvalState` **constructor**, not `fromContext` | The constructor is public and takes `options` directly, and `fromContext` delegates to it. One line covers both paths instead of leaving direct construction inconsistent. § 3.6 and step 2's bullet were reworded to match. |
| `depth` is a method `depth(state)`, not the getter § 3.8 sketches | A getter cannot take the state whose stack it measures, and the stack is no longer the registry's. |
| State-last parameter order throughout (`exit(state)`, `unwindTo(mark, error, state)`, `unwind(error, state)`) | Matches `enter(node, state)` as step 1 shipped it. |
| `depth` / `unwindTo` added **here** rather than in step 3 | Step 1 shipped only `enter` / `exit` / `unwind`; § 3.8's mark-based form was settled after that step's review. Step 2's bullet names all five as state-backed, so they had to exist by the end of this step. Step 3's file list was corrected — it still claimed it would add them. |
| Both moved members sit behind **one** `@internal` accessor rather than two members | Keeps the addition to `EvalState`'s surface to a single name and groups the two things that share a lifetime. The module-private `WeakMap` alternative was rejected because it turns `eval-hooks.ts`'s type-only import of `EvalState` into a runtime one, closing a cycle that ng-packagr would build without complaint and that fails at class-evaluation time. Recorded in § 3.6. |
| `options['onHookError']` is honoured only when no registry is adopted | The policy is registration-side state read by `EvalHooks`'s own constructor. An adopted registry carries the policy its owner built it with, and the state must not retro-fit a different one onto an object it does not own. |
| `public-api.ts` left unchanged despite being listed as an edit | Nothing new to export. |

---

## 3. Verification

| Gate | Result |
| :--- | :--- |
| `npx nx run eval-core:lint` | 0 errors, 0 warnings; no `eslint-disable` added |
| `npx nx run eval-core:test` | 37 suites / 573 tests (baseline 37 / 544, so +29 tests in the two existing spec files) |
| `npx nx run eval-core:build:production` | clean; new members present in the emitted `.d.ts`, `EvalHookBookkeeping` correctly unexported |
| `internal/performance.spec.ts` | unaffected — nothing dispatches yet, and the no-hooks state allocates no bookkeeping |

**Exit criteria.** Both met. `eval-state.spec.ts`'s pre-existing case is byte-identical and
passing — the file's import block did change, since the new cases need `EvalHooks`,
`EvalService` and an acorn parse helper. Step 1's `eval-hooks.spec.ts` coverage is preserved:
all 39 of its `it` / `describe` titles are still present, the title-set diff is purely
additive, and `expect(` count went 72 → 107. Every modified line there is a receiver swap
(`hooks.errors` → `state.hookErrors`) or an added `state` argument — none weakened, none
deleted.

---

## 4. Open items carried into later steps

Both were raised by review of this step, and both are now written into the plan rather than
left here — this section records that they originated in step 2.

### 4.1 `dispatch('before')` emits before it enters (step 3)

Under `onHookError: 'throw'` the rethrow escapes `emit`, so `enter` never runs: hooks ahead
of the throwing one have already seen `before`, but the node is not on the open stack and
`unwindTo` cannot synthesise its `completed: false` event. One unmatched `before` per
throwing-hook node, on the exact path § 3.8 exists to guarantee.

Pre-existing from step 1 and currently unreachable — nothing dispatches. Step 3 makes it
live. Now settled in § 3.8 as a principle rather than an ordering: **bookkeeping mutates
before user code on both edges**, because `emit` can throw and a node missing from the open
stack cannot be unwound. Step 3's `eval-hooks.ts` bullet carries the fix and the assertion.

### 4.2 Nothing drains the open-node stack any more (step 6)

Step 1's `clear()` drained `_open`; step 2 moved the stack onto the state, so `clear()`
cannot reach it and nothing else does. A `clear()` mid-walk — the case § 3.6 documents as
unsupported, and the one `ngOnDestroy` performs — abandons frames on the state permanently.
`EvalService._activeStates` (`eval.service.ts:18`) is a strong `Set`, so those frames keep
their AST nodes alive for the life of the service: precisely the retention `ngOnDestroy` is
called to prevent. A later drain-everything `unwind(error, state)` would also emit
`completed: false` for nodes from a walk that ended long ago.

Step 6's `clearHookErrors()` must therefore reset the whole bookkeeping record, not just the
errors — which also means the name no longer fits. Written into step 6.

### 4.3 Smaller items

- **`hookErrors` sentinel, fixed in this step.** The first draft returned a module-level
  shared empty array until the first collection. Two problems: `readonly` is compile-time
  only, so one cast would poison every state in the process; and a reference taken before
  evaluating would silently never fill, while a later re-read would be populated — a wrong
  answer for exactly the state-first style the plan tells consumers to use. Now returns the
  live array, at the cost of one lazy allocation on first read.
- **`depth(state)` and `exit(state)` allocate as a side effect of a read**, via the lazy
  `hookBookkeeping` getter. Once per state, and step 3 keeps the mark capture inside the
  `hasHooks` guard, so there is no hot-path cost — but a read-shaped method that allocates
  is a trap if that guard is ever dropped.
- **Exported-symbol shape changed**: `EvalHooks.errors` removed, `exit` and `unwind` gained
  a required parameter. Permissible because nothing since step 1 is published (still
  `0.2.5`) and § 5 settles it; CHANGELOG and bump remain step 6's.
- **Still carried from step 1**: `ASYNC_HOOK_MESSAGE`'s `{@link}` dangles for consumers
  (step 6), and the options-first style still cannot read `hookErrors` (§ 3.6, deferred to
  Phase 3).
