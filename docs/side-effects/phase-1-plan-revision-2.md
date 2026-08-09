# Phase 1 plan — revision 2 (August 8, 2026)

Amendments arising from a fresh-context review of the visitor infrastructure.
Apply each block to `docs/side-effects/phase-1-plan.md` at the location given.
Sections not listed here are unchanged.

---

## A. Append to § 1.2 "Findings that shape the design"

> 7. **`afterVisitor` does not run when a visitor throws.** The convention established
>    across all 19 visitors is bare `beforeVisitor(node, st); … afterVisitor(node, st);`
>    with no `try`/`finally`. That was sound when nothing between the two could throw, but
>    is no longer true: `evaluateBinaryOperation` (`visitors/binary-expression.ts`) throws on
>    several paths — `in` against a null right operand, `in` against a non-object left
>    operand, `instanceof` against a non-callable right operand, and an unsupported operator.
>    `prototype-pollution-guard.ts` and `call-expression.ts` throw as well.
>
>    Today this is invisible, because the hooks do nothing but mismatched `console.time`
>    calls. Once they dispatch user callbacks it becomes a correctness bug: a tracing hook
>    loses the closing event, and a dependency tracker's per-node bookkeeping is left
>    unbalanced, for every failed evaluation. **This must be solved in the same step that
>    introduces dispatch, not after** — see § 3.8.
>
> 8. **A competing, already-published hook model exists.** `RecursiveVisitorState` and
>    `RecursiveVisitorResult` (`internal/interfaces/recursive-visitors.ts`) declare
>    `beforeVisitors` / `afterVisitors` as `RegistryType<AnyNodeTypes, fn>`. Nothing
>    implements them — every real visitor takes `EvalState` — but they are reachable from
>    `src/public-api.ts` via `internal/interfaces`, so they are public API and cannot simply
>    be deleted. Phase 1 must state their fate explicitly rather than shipping a second,
>    contradictory hook vocabulary alongside `EvalHooks`. Related: `RecursiveAggregateVisitor`
>    (same file) types its `node` parameter as `AggregateType`, an intersection no value can
>    satisfy; it should be `AggregateType[keyof AggregateType]`.

---

## B. New § 3.8, inserted after § 3.7 "Zero-cost when unused"

> ### 3.8 Balanced dispatch across throws
>
> Per finding 1.2.7, a visitor that throws skips its `afterVisitor` call. Adding
> `try`/`finally` to all 19 visitors would fix it, but would forfeit the property that makes
> step 3 a safe refactor — that no visitor body changes. Instead, the dispatcher tracks
> depth itself and reconciles at the one place the error is already caught.
>
> ```ts
> // eval-hooks.ts
> private readonly _open: AnyNode[] = [];
>
> /** Called by beforeVisitor's dispatcher, after the hooks fire. */
> enter(node: AnyNode): void { this._open.push(node); }
>
> /** Called by afterVisitor's dispatcher, before the hooks fire. */
> exit(node: AnyNode): void { this._open.pop(); }
>
> /**
>  * Fire `after` for every node still open, innermost first, marked incomplete.
>  * Invoked from evaluate()'s existing catch. Idempotent.
>  */
> unwind(error: unknown): void { … }
> ```
>
> `EvalNodeHookEvent` gains two fields so consumers can distinguish the paths:
>
> ```ts
> /** False when this `after` event was synthesised during error unwinding. */
> readonly completed: boolean;
> /** The error that aborted evaluation; only present when `completed` is false. */
> readonly error?: unknown;
> ```
>
> `value` is absent on an unwound event — the visitor never pushed one.
>
> Properties this gives us:
>
> - Every `before` is matched by exactly one `after`, on every path.
> - No visitor body changes; the only new call site is `evaluate()`'s existing catch.
> - Cost on the no-hooks path is unchanged, because `enter`/`exit` run inside the
>   `if (!st.hasHooks) return;` guard already specified in § 3.7.
> - `unwind` is idempotent, so the sync and async entry points can both call it without
>   coordinating.
>
> Ordering note: `exit` pops *before* the `after` hooks fire, so a hook that itself throws
> cannot corrupt the open stack. Hook errors continue to be handled by the § 3.4 policy.

---

## C. New Step 0, inserted before Step 1 in § 4

> ### Step 0 — Pre-work: fix the unusable published type
> - **Edit**: `internal/interfaces/recursive-visitors.ts` — `RecursiveAggregateVisitor.node`
>   from `AggregateType` to `AggregateType[keyof AggregateType]`.
> - Independent of the hook work; no other file depends on it. Landing it first keeps it out
>   of the Phase 1 diffs.
> - **Exit**: build and full suite green. Commit as
>   `fix(eval-core): correct RecursiveAggregateVisitor node type`.

---

## D. Replace Step 1's first bullet and exit criterion in § 4

> - **New**: `internal/classes/eval/eval-hooks.ts` — types, `EvalHooks` class, `EvalHookError`,
>   error-policy handling, promise-return guard, and the open-node stack with
>   `enter` / `exit` / `unwind` per § 3.8.
> - **New**: `internal/classes/eval/eval-hooks.spec.ts` — registration, wildcard vs keyed,
>   unsubscribe, `off`/`clear`, all three error policies, promise-return detection, and
>   unwinding: nested opens flush innermost-first with `completed: false`, `unwind` is
>   idempotent, and a throwing hook during unwind still drains the stack.
> - **Exit**: new spec green; no other file changed; lint clean.

---

## E. Replace Step 3 in § 4

> ### Step 3 — Convert `beforeVisitor` / `afterVisitor` into dispatchers
> - **Edit**: `visitors/before-visitor.ts`, `visitors/after-visitor.ts` — bodies replaced per
>   § 3.7 and § 3.8; `trackTime` logic removed (moves to step 5). This also retires the
>   mismatched `console.time` calls, so the duplicate-label warnings the library currently
>   emits to consumers stop here rather than in step 5.
> - **Signature change**: return type `number | undefined` → `void`. Safe per finding 1.2.2;
>   all 19 call sites already discard the value, so **no visitor body changes**.
> - **Edit**: `internal/functions/evaluate.ts` — the existing catch calls
>   `state.hooks.unwind(error)` before `state.result.setFailure(error)`. One new call site;
>   this is what keeps finding 1.2.7 out of the visitors.
> - **`after` phase value**: `afterVisitor` is called after `pushVisitorResult`, so the pushed
>   value is `st.result.stack.peek()` (`internal/classes/common/stack.ts:39`, non-destructive)
>   — read it there to populate `event.value` rather than changing 19 call signatures. Guard
>   with a length check; an empty stack yields `value: undefined`, not a throw.
> - **New**: `visitors/hooks.spec.ts` —
>   - a `'*'` hook fires once per node for a representative expression, and the fired type
>     sequence matches `state.result.trace` types;
>   - **every `before` is matched by exactly one `after`**, asserted as a counter that returns
>     to zero;
>   - the same balance holds when evaluation throws — drive this with an expression that trips
>     `evaluateBinaryOperation` (e.g. `'x' in null`) and with a prototype-pollution guard
>     rejection, asserting the unwound events carry `completed: false`;
>   - `logical-expression.ts`'s four exit paths each produce exactly one `after`.
> - **Exit**: full existing suite green (the load-bearing regression gate for this step);
>   before/after counts balanced on both the success and throw paths; `trackTime: true` no
>   longer writes to `console`.

---

## F. Add to Step 6 in § 4

> - **Edit**: `internal/interfaces/recursive-visitors.ts` — mark `RecursiveVisitorState` and
>   `RecursiveVisitorResult` `@deprecated`, pointing at `EvalHooks`. They stay exported, so
>   the release remains purely additive; removal is a follow-up for the next breaking version.
>   Without this the package ships two contradictory hook vocabularies (finding 1.2.8).
> - **Edit**: `CHANGELOG.md` — note the deprecation alongside the new API and the
>   `trackTime` fix.

---

## G. Replace the first two rows of § 7 "Risks"

> | Risk | Likelihood | Mitigation |
> | :--- | :---: | :--- |
> | Step 3 regresses a visitor's early-return path (`logical-expression.ts` has 4 `afterVisitor` exits) | Low | Signature unchanged from the caller's perspective; the step-3 spec asserts one `after` per exit path and a net-zero balance counter |
> | Unwinding fires `after` for a node whose visitor partially completed, confusing a consumer | Medium | `completed: false` and the absent `value` make the path explicit; documented in the README's hooks section with a worked example |
> | `Stack.peek()` throws or mutates on an empty stack, breaking `after` value retrieval | Low | `peek()` exists and is non-destructive; step 3 guards with a length check |

---

## H. Add to § 9's open questions

> Not resolved here, logged to `ROADMAP.md` rather than absorbed into Phase 1:
> `popVisitorResult` cannot detect stack underflow, because `Stack.pop()` returns `undefined`
> on an empty stack and `undefined` is a legal evaluated value. `getDefaultVisitors()` also has
> no default branch, so an unregistered node type (`FunctionExpression`, `SequenceExpression`,
> `SpreadElement`, `YieldExpression`) falls through to acorn-walk's base handler, recurses, and
> pushes nothing — the parent then pops a sibling's value. A length check throwing
> `Stack underflow at ${node.type}` would convert every future desync from a wrong answer into
> a test failure. This is a natural prerequisite for Phase 2, where new statement visitors
> multiply the ways a push can be missed.
