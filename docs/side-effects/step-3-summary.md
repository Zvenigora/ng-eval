# Phase 1 — Step 3 Summary: Convert `beforeVisitor` / `afterVisitor` into dispatchers

**Date**: August 9, 2026
**Plan**: [`phase-1-plan.md`](./phase-1-plan.md) § 4, Step 3
**Target package**: `@zvenigora/ng-eval-core` (`modules/eval-core`, v0.2.5)
**Commit**: `7e69adf`
**Status**: complete — lint clean, 38 suites / 612 tests green, production build clean

---

## 1. What was built

Hooks now fire. The two bracket functions every visitor already calls became the dispatch
point, guarded so the no-hooks path stays cheaper than the `trackTime` lookup it replaced,
and the `before`/`after` pairing is now guaranteed on the throw path as well as the success
path. No visitor body was changed.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `internal/visitors/before-visitor.ts` | edit | `hasHooks` guard + `dispatch('before', …)`; `trackTime` / `console.time` removed; returns `void` |
| `internal/visitors/after-visitor.ts` | edit | same, plus the length-guarded `st.result.stack.peek()` read that populates `event.value` |
| `internal/functions/evaluate.ts` | edit | mark capture before `walk.recursive` and `unwindTo(mark, error, state)` in the catch — in **both** `evaluate` and `evaluateAsync` |
| `internal/classes/eval/eval-hooks.ts` | edit | `before` edge reordered to `enter`→`emit`; `exit(state, node)` made identity-checked; `EvalNodeHookEvent.error` doc corrected |
| `internal/classes/eval/eval-hooks.spec.ts` | edit | +164/−0; 10 new cases (identity exit, no-op at mark, nested drain, bookkeeping ordering) |
| `internal/visitors/hooks.spec.ts` | **new** | 29 cases; the first spec in `visitors/` |
| `docs/side-effects/phase-1-plan.md` | edit | § 3.8 and § 4 amendments settled during the step |
| `ROADMAP.md` | edit | new "Deferred defects in the visitor layer" section |

### API changed

```ts
// internal/visitors — not on the published surface (src/public-api.ts does not
// re-export internal/visitors), so the widening is not a breaking release.
beforeVisitor(node, st): void        // was number | undefined
afterVisitor(node, st): void         // was number | undefined

class EvalHooks {
  exit(state, node): void            // was exit(state) — now identity-checked
}
```

`internal/classes/eval/public-api.ts` is untouched: `dispatch` / `exit` are members of the
already-exported `EvalHooks`, and no new symbol was introduced.

### Behaviour worth recording

- **The no-hooks path is a single boolean field read.** `st.hasHooks` is
  `!!_hooks && _hooks.isActive` — no options cast, no property lookup, and it never
  lazily constructs an `EvalHooks`. The mark captures in `evaluate` / `evaluateAsync` sit
  behind the same guard, so `state.hooks` (which *would* construct) is unreachable without
  hooks, and `hookBookkeeping`'s lazy `{ open: [], errors: [] }` is never allocated.
- **`event.value` is read positionally**, from the top of `st.result.stack` at the moment
  `afterVisitor` runs. Correct for every visitor that pushes immediately before calling it,
  which is all of them on their reachable paths — but it is *not* keyed to the node, and
  the doc comment now says so.
- **Unwinding is bounded by a mark, and the mark is per-`evaluate()`-call.** The re-entry
  at `arrow-function-expression.ts:17` runs on the same state, so an absolute `unwind`
  there would drain the enclosing walk's frames whenever a host function swallows the
  nested throw.
- **`unwindTo` is a no-op when depth is already at the mark** (`open.length > mark`). This
  is what makes `evaluateAsync`'s second failure mode — `awaitAllPromises` rejecting after
  a walk that *succeeded* — synthesise zero events rather than inventing `completed: false`
  for nodes that genuinely completed. Asserted directly, not inferred from balance, since
  balance would also hold if a spurious pair were emitted.
- **`trackTime` is now inert.** The mismatched `console.time` / `console.time` pair (both
  edges called `time`, neither called `timeEnd`) is gone, so the duplicate-label warnings
  the library emitted to consumers stop here. `EvalOptions.trackTime` is re-defined and
  re-implemented as a built-in hook in step 5.

---

## 2. The Critical found mid-step: positional popping

Raised by review after the first implementation was green, confirmed by probe, and fixed
within the step on the user's instruction. It is recorded here because the *class* of bug
matters more than the instance.

`await-expression.ts:37-78` wraps `callback(node.argument, st)` in a `try`/`catch` inside a
`Promise` executor: a child that throws synchronously is converted to a rejection and the
visitor **continues** to its own `pushVisitorResult` / `afterVisitor`. The child is
therefore still open when the parent closes. With the positional `exit()` step 1 shipped,
the parent's `after` popped the *child's* frame.

Measured on `call(async () => await obj.__proto__)`, before the fix:

```
before: CallExpression, ArrowFunctionExpression, Identifier, AwaitExpression,
        MemberExpression, Identifier
after:  ArrowFunctionExpression, Identifier, Identifier, AwaitExpression, CallExpression
depth after a SUCCESSFUL walk: 1        (should be 0)
leftover open: CallExpression
```

Two failures, both of them exactly what § 3.8 exists to prevent: `MemberExpression` got a
`before` and **no `after` at all**, and one frame leaked onto the `EvalState` permanently —
surviving into every later evaluation on that state, so a subsequent genuine failure would
unwind a node from an earlier successful walk. Under `evaluateAsync` the stale frame was
then drained by the new `unwindTo`, giving `CallExpression` both a `completed: true` and a
`completed: false` event.

**Fix — `exit(state, node)` matches by identity**, per the three-case table now in § 3.8:

| Case | Stack | Action |
| :--- | :--- | :--- |
| 1 | top **is** `node` | pop it (one reference compare) |
| 2 | `node` open below the top | flush the frames above it as `completed: false`, innermost first, then pop `node` |
| 3 | `node` not open at all | pop nothing, emit nothing |

Case 3 is load-bearing: the naive "pop until you find it" walks to the bottom when the node
is absent, synthesising an event for every genuinely-open enclosing frame and leaving a
later real failure with nothing to unwind. The scan uses `lastIndexOf`, not `indexOf` —
the same AST node can legitimately be open several times, since an arrow-function body is
re-walked on every call, and the innermost occurrence is the frame actually being closed.

Case-2 events carry **no `value`** (the node never pushed one) and **no `error`** (nothing
threw — the frames are closed because an enclosing visitor moved on). Presence of `error`
is therefore how a consumer tells `unwindTo` frames from `exit` frames, and
`EvalNodeHookEvent.error`'s doc was corrected to say so. They are emitted under the collect
policy even for a `'throw'`-policy consumer: a rethrow would escape the flush loop before
it finished popping, re-creating the leak.

**Why this over fixing `await-expression.ts`.** Rewriting the visitor was the other
candidate and is the better *eventual* fix, but it changes what `evalAsync` throws and
when — behavioral, and outside Phase 1. Identity checking makes § 3.8's guarantee hold *for*
visitors that do not follow the bracketing convention, rather than assuming they all do,
which is the weaker claim the positional form was quietly making. Cost is one reference
comparison on the ordinary path, inside the `hasHooks` guard.

The fix was confirmed load-bearing by forcing `exit` back to a positional pop: **7 tests
fail**.

---

## 3. Deviations from the plan's literal sketch

All raised before implementing and confirmed; all are now written into the plan.

| Deviation | Reason |
| :--- | :--- |
| `evaluateAsync` gets a mark and an unwind too — four call sites in one file, not two in one function | Step 3's bullet named only `evaluate`, but § 3.8 says both entry points call it. `evaluateAsync` runs the same synchronous walk in its own `try`/`catch`; omitting it would strand the open stack on any `evalAsync` throw, and the step's own "balanced on the throw path" criterion would hold only for the sync path. Its inner `awaitAllPromises` catch rethrows into the outer one, so the outer catch is the only site needed. |
| `state.hooks.depth(state)`, not `state.hooks.depth` | Step 3's prose carried § 3.8's original getter form; step 2 shipped it as a method because the stack lives on the state. |
| Mark captured **inside** `evaluate`'s `if (node)` block | `evaluate.test.ts:11` drives the `node === undefined` case with a bare `{} as EvalState`, which has no `hasHooks` to read. A "do not hoist" comment marks both capture sites. |
| `exit` became identity-checked | § 2 above. Not in the step as written; added after review, plan amended first. |
| "19 call sites" corrected to 19 visitor *files* | Actual: 20 `beforeVisitor` and 23 `afterVisitor` calls — `identifier.ts` holds two visitor functions, `logical-expression.ts` has four `after` exits. Does not change the work; the widening is safe at all 43. |
| `ROADMAP.md` edited, though not in the step's file list | Three visitor-layer defects surfaced that are behavioral fixes and out of scope. Added to the step's file list rather than left as a drive-by. |

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `npx nx run eval-core:lint` | 0 errors, 0 warnings; no `eslint-disable` added |
| `npx nx run eval-core:test` | 38 suites / 612 tests (baseline 37 / 573, so +1 suite and +39 tests) |
| `npx nx run eval-core:build:production` | clean |
| `internal/performance.spec.ts` | green — the guard is strictly cheaper than the options lookup it replaced |

**Exit criteria.** All three met.

- *Full existing suite green* — 612/612. `eval-hooks.spec.ts` is **+164/−0**: no assertion
  relocated, weakened or deleted.
- *Before/after balanced on the success and throw paths* — asserted at two levels. Unit:
  one case per row of the § 3.8 table. Integration: the wildcard type sequence matches
  `state.result.trace`, an `afterCounts()` map proves no node receives two `after` events,
  and the throw paths are driven by `'x' in null`, a prototype-pollution rejection, the
  arrow re-entrancy case with a swallowing host function, and the `AwaitExpression` case
  from § 2 — including that it strands nothing into the *next* evaluation on the same state.
- *`trackTime: true` no longer writes to `console`* — spied on `console.time` and
  `console.timeEnd`, asserted neither is called.

Per-exit coverage was made explicit where the plan called for it: `logical-expression.ts`'s
four exits are four separate table-driven cases, and `identifier.ts`'s two visitor
functions are covered individually (the case-sensitive branch and the case-insensitive one).

---

## 5. Open items carried forward

### 5.1 Recorded in `ROADMAP.md`, not fixed

All three are behavioral changes, hence out of Phase 1's additive scope. Identity-checked
`exit` means the *hook* layer stays balanced in spite of all of them — that is containment,
not repair.

- **`await-expression.ts` downgrades a synchronous throw to a promise rejection.** A
  prototype-pollution guard rejection inside an `await` argument does not propagate; it
  becomes a rejected promise that surfaces only when something awaits it. Fixing it means
  moving the `callback` out of the `Promise` executor, which changes what `evalAsync`
  throws and when.
- **`update-expression.ts` desynchronizes the value stack under `preserveParens`.** The
  `if`/`else if` chain falls through silently for an argument that is neither `Identifier`
  nor `MemberExpression`, pushing nothing but still calling `afterVisitor`. `ParserOptions`
  is `Partial<acorn.Options> & {…}`, so a consumer can pass `preserveParens: true`, and
  `(a)++` then parses with `argument.type === 'ParenthesizedExpression'` — verified against
  the acorn in this repo. This is a wrong-result bug with a real route to it, not a tidiness
  item, and it deserves a proper fix rather than triage.
- **`import-expression.ts` has a dead `afterVisitor`**, after an unconditional throw.
  Cosmetic.

### 5.2 Written into the plan

- **§ 3.8 — the guarantee is one-directional.** Every `before` gets exactly one `after`, but
  an `after` can arrive with no `before`: case 3 declines to pop, yet `dispatch` still emits
  the node's own `completed: true` event. Consumers pairing events must key on the node.
- **§ 3.8 — `exit` has no mark to bound its scan.** It cannot distinguish "absent from this
  walk" from "absent from the stack", so a node open only in an *enclosing* walk would fall
  into case 2 and the flush would cross the walk boundary. Unreachable today — it needs an
  `afterVisitor` with no matching `beforeVisitor` in the same frame, which no visitor does —
  but step 4 adds emission points to `identifier.ts` and `member-expression.ts`, so it is
  worth not making reachable by accident.
- **Step 6 — `recursive-visitors.ts:13-14`** is now the last published trace of the
  `number | undefined` timing-stub signature this step deleted. Nothing implements
  `RecursiveVisitorState`, so the `@deprecated` text is the only place that can be recorded.

### 5.3 Still carried from earlier steps

Unchanged by this step: nothing drains the open-node stack (step 6, from step 2 § 4.2),
`ASYNC_HOOK_MESSAGE`'s `{@link}` dangles for consumers (step 6, from step 1), and the
options-first style cannot read `hookErrors` (§ 3.6, deferred to Phase 3).
