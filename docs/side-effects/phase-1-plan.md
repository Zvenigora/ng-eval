# Phase 1 Plan — Generic Evaluation Hooks / Side Effects (`eval-core`)

**Date**: August 9, 2026
**Revision**: 2
**Target package**: `@zvenigora/ng-eval-core` (`modules/eval-core`, v0.2.5)
**Source**: [`ROADMAP.md`](../../ROADMAP.md) § Phase 1
**Objective**: Turn the currently hard-coded, timing-only `beforeVisitor` / `afterVisitor`
calls into a public, user-registerable hook API, and ship a dependency-tracking recorder
built on it — the prerequisite for Phase 3 (signals) and Phase 4 (forms).

---

## 1. Current state of the code

### 1.1 What exists today

| Element | File | Notes |
| :--- | :--- | :--- |
| `beforeVisitor(node, st)` | `internal/visitors/before-visitor.ts` | Reads `st.options['trackTime']`; calls `console.time('before: ' + type)`, returns `performance.now()` |
| `afterVisitor(node, st)` | `internal/visitors/after-visitor.ts` | Same body, prefix `'after: '` |
| Call sites | 19 visitor files | Every visitor opens with `beforeVisitor(node, st)` and closes each return path with `afterVisitor(node, st)` |
| `EvalState` | `internal/classes/eval/eval-state.ts` | Holds `context`, `result`, `options`, `isAsync` — all read-only getters |
| `EvalTrace` | `internal/classes/eval/eval-trace.ts` | Already records `{type, expression, value}` per `pushVisitorResult` |
| `RecursiveVisitorState` | `internal/interfaces/recursive-visitors.ts` | Unused interface that *already* sketches `beforeVisitors` / `afterVisitors` as `RegistryType<AnyNodeTypes, fn>` |

### 1.2 Findings that shape the design

1. **The chokepoints already exist.** All 19 visitors call `beforeVisitor` / `afterVisitor`.
   Turning those two functions into dispatchers gives full node coverage without editing a
   single visitor body. This is the single most important constraint-turned-advantage.

2. **`beforeVisitor`/`afterVisitor` are not public API.** `src/public-api.ts` exports
   `actual/services`, `internal/interfaces`, `internal/functions`,
   `internal/classes/common`, `internal/classes/eval` — **not** `internal/visitors`.
   Their signatures can change freely; only in-repo callers are affected.

3. **`trackTime` is effectively dead.** It appears in no README section and is only ever set
   to `false` in `context.test.ts`. It also has a latent bug: `after-visitor.ts` calls
   `console.time` (not `console.timeEnd`), so timers are never closed, and every call site
   discards the returned `performance.now()`. It is also **untyped**: the `trackTime`
   declaration on `EvalOptions` is commented out (`eval-options.ts:11`, `23-27`), so the live
   read in `before-visitor.ts:7` is an untyped string index, and no test exercises the option
   when it is `true`. Porting it to a built-in hook is a chance to fix this without breaking
   any documented behavior.

4. **Async evaluation is synchronous inside the walk.** `evaluateAsync` (`functions/evaluate.ts:110`)
   calls `walk.recursive(...)` synchronously and only awaits at the end via
   `awaitAllPromises`. There is no `await` point inside any visitor. **Therefore hooks cannot
   be async** without redesigning the walker — that decision is forced by the code, not
   preference (see § 3.3).

5. **The real dependency signal is not on the node.** `identifierVisitor` resolves
   `context?.get(node.name)`, and `evaluateMember` (`visitors/member-expression.ts:34`)
   resolves the effective key — possibly case-corrected via `st.context.getKey(key)`, possibly
   from a computed expression. A `Identifier`/`MemberExpression` after-hook sees the AST node
   but **not** the key that was actually read. Phase 3/4 need the resolved key, so node hooks
   alone are insufficient — hence the second hook kind in § 3.5.

6. **State is per-evaluation, services are singletons.** `EvalService` is
   `providedIn: 'root'` and tracks `_activeStates` for cleanup. Hooks must therefore live on
   `EvalState`, never in module-level globals, or concurrent evaluations would cross-talk.

7. **`afterVisitor` does not run when a visitor throws.** The convention established
   across all 19 visitors is bare `beforeVisitor(node, st); … afterVisitor(node, st);`
   with no `try`/`finally`. That was sound when nothing between the two could throw, but
   is no longer true: `evaluateBinaryOperation` (`visitors/binary-expression.ts`) throws on
   several paths — `in` against a null right operand, `in` against a non-object left
   operand, `instanceof` against a non-callable right operand, and an unsupported operator.
   `prototype-pollution-guard.ts` and `call-expression.ts` throw as well.

   Today this is invisible, because the hooks do nothing but mismatched `console.time`
   calls. Once they dispatch user callbacks it becomes a correctness bug: a tracing hook
   loses the closing event, and a dependency tracker's per-node bookkeeping is left
   unbalanced, for every failed evaluation. **This must be solved in the same step that
   introduces dispatch, not after** — see § 3.8.

8. **A competing, already-published hook model exists.** `RecursiveVisitorState` and
   `RecursiveVisitorResult` (`internal/interfaces/recursive-visitors.ts`) declare
   `beforeVisitors` / `afterVisitors` as `RegistryType<AnyNodeTypes, fn>`. Nothing
   implements them — every real visitor takes `EvalState` — but they are reachable from
   `src/public-api.ts` via `internal/interfaces`, so they are public API and cannot simply
   be deleted. Phase 1 must state their fate explicitly rather than shipping a second,
   contradictory hook vocabulary alongside `EvalHooks`. Related: `RecursiveAggregateVisitor`
   (same file) types its `node` parameter as `AggregateType`, an intersection no value can
   satisfy; it should be `AggregateType[keyof AggregateType]`.

---

## 2. Scope

### In scope
- A hook registry type + dispatcher replacing the bodies of `before-visitor.ts` / `after-visitor.ts`.
- Attaching hooks to an evaluation (`EvalState`, `EvalOptions`, `EvalService` entry points).
- A `read` hook kind emitted at the two context-resolution points (identifier + member).
- A built-in `createDependencyTracker()` recorder built on the read hook.
- Re-implementing `trackTime` as a built-in timing hook.
- Tests, README section, and this doc's follow-ups.

### Out of scope (deliberately deferred)
- **Short-circuiting / value-rewriting hooks** (a before-hook returning a replacement value).
  Powerful (memoization, sandbox policy) but requires editing all 19 visitor bodies to honor
  the return value. Design note left in § 8 so the return type doesn't foreclose it.
- **Async hooks** — blocked by finding 1.2.4.
- Statement nodes (Phase 2), signals (Phase 3), forms (Phase 4).

---

## 3. Design

### 3.1 Shape: one dispatcher, keyed registry, wildcard support

A single `EvalHooks` object per evaluation, holding listeners keyed by
`AnyNodeTypes | '*'` per phase.

```ts
// internal/classes/eval/eval-hooks.ts  (new)
import { AnyNode } from 'acorn';
import { AnyNodeTypes } from '../../interfaces';

export type EvalHookPhase = 'before' | 'after';

export interface EvalNodeHookEvent {
  readonly phase: EvalHookPhase;
  readonly node: AnyNode;
  readonly state: EvalState;
  /** Value pushed by the visitor; only present on 'after'. */
  readonly value?: unknown;
}

export type EvalNodeHook = (event: EvalNodeHookEvent) => void;
export type Unsubscribe = () => void;
```

Rationale for keyed-with-wildcard over per-node-type-only or single-dispatcher-only
(the roadmap's open question):

- Tracing/logging consumers want *every* node → `'*'` avoids registering 40+ callbacks.
- Dependency tracking wants exactly `Identifier` / `MemberExpression` → paying a dispatch
  cost on every `Literal` is waste; keying avoids it.
- A `Map<string, EvalNodeHook[]>` lookup plus one wildcard array covers both with a single
  data structure. It also matches the shape already sketched in `RecursiveVisitorState`.

### 3.2 Registration API

```ts
export class EvalHooks {
  /** Register a node hook. `type` may be a concrete node type or '*'. */
  on(phase: EvalHookPhase, type: AnyNodeTypes | '*', hook: EvalNodeHook): Unsubscribe;

  /** Register a context-read hook (see § 3.5). */
  onRead(hook: EvalReadHook): Unsubscribe;

  /** Remove one hook / all hooks for a key / everything. */
  off(phase: EvalHookPhase, type: AnyNodeTypes | '*', hook?: EvalNodeHook): void;
  clear(): void;

  /** Errors collected under the 'collect' policy (§ 3.4). */
  readonly errors: readonly EvalHookError[];

  get isEmpty(): boolean;
}
```

`on()` returns an unsubscribe closure (idiomatic Angular/RxJS-adjacent, and it makes
`ngOnDestroy` cleanup trivial for consumers) **and** `off()` exists for symmetry with
imperative callers.

### 3.3 Sync only — and why

Hooks are `(event) => void`. A hook returning a `Promise` is **not** awaited.

This is forced by finding 1.2.4: `evaluateAsync` walks the tree synchronously and only
awaits the final value. Making hooks awaitable would require converting `walk.recursive`
into an async traversal — a rewrite of the evaluation core well beyond Phase 1, and one that
would regress the sync `evaluate()` path.

**Documented escape hatch**: a hook that needs async work pushes a promise onto its own
queue and the caller awaits it after `evalAsync(...)` resolves. This is called out explicitly
in the README so nobody discovers it by surprise.

Guard: the dispatcher checks `typeof result?.then === 'function'` and records a
`EvalHookError` ("async hook returned a promise; it will not be awaited") under the active
error policy. Cheap, and it converts a silent footgun into a visible one.

### 3.4 Error policy: collect by default

```ts
export type EvalHookErrorPolicy = 'collect' | 'throw' | 'ignore';   // default: 'collect'
```

- `'collect'` (default) — the hook's throw is caught, wrapped as
  `{ phase, nodeType, error }`, appended to `hooks.errors`, and evaluation continues.
- `'throw'` — rethrown; it propagates out of the visitor into `evaluate()`'s catch, which
  already calls `state.result.setFailure(error)`. Opt-in for strict consumers.
- `'ignore'` — swallowed silently. For hot paths where even collecting is unwanted.

Rationale (the roadmap's third open question): a hook is an **observer**. A logging or
metrics callback throwing must not turn a working expression into a failed evaluation —
that would make hooks strictly more dangerous than the code they observe. But silently
swallowing hides real bugs in Phase 3/4's dependency tracker, where a dropped read means
wrong reactivity, not just a lost log line. `'collect'` is the only default that is both
non-breaking and non-silent.

### 3.5 Read hooks — the actual Phase 3/4 prerequisite

Per finding 1.2.5, node hooks cannot report *which key was read*. Add a second, narrow
hook kind emitted at the two places where a context read actually resolves:

```ts
export type EvalReadKind = 'identifier' | 'member';

export interface EvalReadEvent {
  readonly kind: EvalReadKind;
  readonly node: AnyNode;
  readonly state: EvalState;
  /** The key as resolved against the context (case-corrected when caseInsensitive). */
  readonly key: string | number | symbol;
  /** The object the key was read from — the context, an EvalScope, or a plain object. */
  readonly target: unknown;
  /** Dotted path when statically reconstructible (`a.b.c`), else undefined. */
  readonly path?: string;
  readonly value: unknown;
}

export type EvalReadHook = (event: EvalReadEvent) => void;
```

Emission points (exactly two, both already isolated):

| Point | File / line | Emits |
| :--- | :--- | :--- |
| Identifier resolution | `visitors/identifier.ts` — both the sensitive and case-insensitive branches | `kind: 'identifier'`, `key: node.name`, `target: st.context` |
| Member resolution | `visitors/member-expression.ts` `evaluateMember` — at each of the three `return` branches (context / `EvalScope` / plain object) | `kind: 'member'`, the resolved `contextKey`/`key`, `target: object` |

`path` is reconstructed statically by walking `node.object` while it is a non-computed
`MemberExpression`/`Identifier` chain; for computed members (`obj[expr]`) the *resolved* key
is still exact, so `path` is emitted as `undefined` and consumers fall back to
`target` + `key` identity. This limitation is documented, not hidden — Phase 3 will need to
decide whether identity-based tracking is enough or whether it wants path strings.

### 3.6 Attachment to an evaluation

Hooks live on `EvalState`, created lazily:

```ts
// eval-state.ts
private _hooks?: EvalHooks;
public get hooks(): EvalHooks { return (this._hooks ??= new EvalHooks(this._options)); }
public get hasHooks(): boolean { return !!this._hooks && this._hooks.isActive; }
```

**Decision — `hasHooks` latches; it is not `!isEmpty`.** `EvalHooks` gains an `isActive`
getter, backed by a flag that `on()` sets and only `clear()` resets. `isEmpty` stays as
shipped and keeps its literal meaning (no hook registered *right now*); `isActive` is the
dispatch guard.

Rationale: § 3.7 makes `hasHooks` the guard on both dispatchers, and § 3.8 puts `enter` and
`exit` inside that guard. A guard that changes value mid-walk therefore desynchronizes the
open-node stack, in both directions:

- the last hook unsubscribes inside a `before` handler → the node was entered, but
  `afterVisitor` now returns early and never calls `exit()`; every ancestor's `exit()` is
  skipped too, and the stack never drains;
- the first hook is registered mid-walk → `before` was skipped, so no `enter` ran, but the
  matching `after` calls `exit()` and pops an *ancestor's* entry.

Neither is exotic: self-unsubscribing and one-shot hooks are ordinary consumer idioms, and
step 1's spec already exercises a hook that unsubscribes itself mid-dispatch. Latching costs
one boolean and keeps the default path untouched — a state on which no hook was ever
registered still reads `false`. The residual case, `clear()` called *during* a walk, is
documented as unsupported rather than defended against: it is the one way to unlatch, and
step 6 only calls it from `ngOnDestroy`.

Three ways in, matching the three existing usage styles:

1. **State-first** (`eval`, `evalAsync`, `compile`+`call`):
   ```ts
   const state = evalService.createState(context, options);
   state.hooks.on('after', 'Identifier', e => …);
   evalService.eval('a + b', state);
   ```
2. **Options-first** (`simpleEval`, which builds the state internally). `EvalOptions` is a
   *union* — `Record<string, unknown> | { caseInsensitive: false }` (`eval-options.ts:5`) —
   so carrying `options.hooks` needs no type change, but the union does **not** index
   directly: a read must go through the same `as Record<string, unknown>` cast that
   `before-visitor.ts:6` already performs. `BaseEval.createState` → `EvalState.fromContext`
   casts, then reads `options['hooks']` and adopts it if it is an `EvalHooks`. Also reads
   `options['onHookError']` for the § 3.4 policy.
3. **Built-ins**: `options.trackTime` registers the timing hook pair (§ 4, step 5).

Because `compile()` binds only the node (`evaluate.bind(null, node)`) and takes the state at
call time, compiled expressions get hooks for free — no change to `compile.ts`.

### 3.7 Zero-cost when unused

The dispatcher must not regress `internal/performance.spec.ts`. New `beforeVisitor`:

```ts
export const beforeVisitor = (node: AnyNode, st: EvalState) => {
  if (!st.hasHooks) return;          // one boolean field read, no options lookup
  dispatch('before', node, st);
};
```

This is *cheaper* than today's body, which does an options cast plus a
`options['trackTime']` property lookup on every node. Inside `dispatch`, the keyed lookup
runs only when at least one hook is registered.

`hasHooks` here is the **latching** form settled in § 3.6, not `!hooks.isEmpty`. The guard
wraps `enter`/`exit` as well as the hooks themselves, so it has to hold the same value for
the whole walk or the open-node stack desynchronizes.

### 3.8 Balanced dispatch across throws

Per finding 1.2.7, a visitor that throws skips its `afterVisitor` call. Adding
`try`/`finally` to all 19 visitors would fix it, but would forfeit the property that makes
step 3 a safe refactor — that no visitor body changes. Instead, the dispatcher tracks
depth itself and reconciles at the one place the error is already caught.

```ts
// eval-hooks.ts  — signatures as shipped in step 1
private readonly _open: { node: AnyNode; state: EvalState }[] = [];

/** Called by beforeVisitor's dispatcher, after the hooks fire. */
enter(node: AnyNode, state: EvalState): void { this._open.push({ node, state }); }

/** Called by afterVisitor's dispatcher, before the hooks fire. */
exit(): void { this._open.pop(); }

/** Depth of the open-node stack; captured as a mark before a walk. */
get depth(): number { return this._open.length; }

/**
 * Fire `after` for every node open above `mark`, innermost first, marked
 * incomplete. Invoked from evaluate()'s existing catch. Idempotent.
 */
unwindTo(mark: number, error: unknown): void { … }

/** Drains the whole stack. Equivalent to unwindTo(0, error). */
unwind(error: unknown): void { this.unwindTo(0, error); }
```

`enter` takes the state because `EvalNodeHookEvent.state` is required and `unwind` has no
state parameter, so each open node carries its own. `exit` takes no node: the pop is
positional, and the popped entry already carries the node an unwound event needs.

**Decision — unwinding is mark-based, not absolute.** `evaluate()` captures
`const mark = state.hooks.depth` before `walk.recursive` and its catch calls
`state.hooks.unwindTo(mark, error)`. `unwind(error)` stays as the drain-everything form for
callers that own the whole walk.

Rationale: `evaluate()` is re-entrant, and the re-entry is *deferred*.
`arrow-function-expression.ts:17` calls `evaluate(node.body, st)` with the **same state**,
inside the closure it pushes as the arrow function's value:

```ts
const fn = (...arrowArgs: unknown[]) => {
  …
  const value = evaluate(node.body, st);   // same st, its own try/catch
  …
};
```

That closure runs whenever the arrow function is *called* — during the outer walk, after it
has finished, many times, or never. It is the only such re-entry in any visitor, and it has
its own `try`/`catch`. So an absolute `unwind(error)` from the nested `evaluate` drains the
outer walk's open nodes too.

Usually that is invisible, because the nested throw propagates and the outer nodes really
are abandoned — and the second `unwind` is a no-op, which is what idempotency buys. It goes
wrong when a host function **swallows** the throw: a context-supplied `safeMap(x => x.foo)`
catches, the outer walk continues, and every enclosing node now receives a synthesised
`completed: false` event followed later by its real `completed: true` one — while the stack
is left empty, so a genuinely fatal error later unwinds nothing. That is precisely the
invariant this section exists to guarantee, so the fix belongs here rather than in a caller.

A mark is one integer read per `evaluate()` call, costs nothing on the no-hooks path (it
sits inside the same guard), and makes each `evaluate()` responsible for exactly the nodes
it opened.

`EvalNodeHookEvent` gains two fields so consumers can distinguish the paths:

```ts
/** False when this `after` event was synthesised during error unwinding. */
readonly completed: boolean;
/** The error that aborted evaluation; only present when `completed` is false. */
readonly error?: unknown;
```

`value` is absent on an unwound event — the visitor never pushed one.

Properties this gives us:

- Every `before` is matched by exactly one `after`, on every path.
- No visitor body changes. The new call sites are both in `evaluate()`: the mark capture
  before `walk.recursive`, and `unwindTo(mark, error)` in its existing catch.
- Cost on the no-hooks path is unchanged, because `enter`/`exit` run inside the
  `if (!st.hasHooks) return;` guard already specified in § 3.7.
- `unwind` is idempotent, so the sync and async entry points can both call it without
  coordinating.

Ordering note: `exit` pops *before* the `after` hooks fire, so a hook that itself throws
cannot corrupt the open stack. Hook errors continue to be handled by the § 3.4 policy.

---

## 4. Work breakdown

Each step is independently reviewable and leaves the suite green.

### Step 1 — `EvalHooks` core (no wiring)
- **New**: `internal/classes/eval/eval-hooks.ts` — types, `EvalHooks` class, `EvalHookError`,
  error-policy handling, promise-return guard, and the open-node stack with
  `enter` / `exit` / `unwind` per § 3.8.
- **New**: `internal/classes/eval/eval-hooks.spec.ts` — registration, wildcard vs keyed,
  unsubscribe, `off`/`clear`, all three error policies, promise-return detection, and
  unwinding: nested opens flush innermost-first with `completed: false`, `unwind` is
  idempotent, and a throwing hook during unwind still drains the stack.
- **Edit**: `internal/classes/eval/public-api.ts` — export the new symbols (this makes them
  public automatically via `src/public-api.ts` → `./lib/internal/classes/eval`).
- **Exit**: new spec green; no other file changed; lint clean.

### Step 2 — Attach hooks to `EvalState`
- **Edit**: `eval-state.ts` — lazy `_hooks`, `hooks` getter, `hasHooks` getter; adopt
  `options['hooks']` / `options['onHookError']` in `fromContext`. `EvalOptions` is a union
  (§ 3.6), so both reads go through an `as Record<string, unknown>` cast — the same one
  `before-visitor.ts:6` performs — not a direct index on `EvalOptions`.
- **Edit**: `eval-hooks.ts` — add the latching `isActive` getter settled in § 3.6: a private
  flag set by `on()`, reset only by `clear()`. `isEmpty` is unchanged and keeps its shipped
  meaning. `hasHooks` reads `isActive`, **not** `!isEmpty`.
- **Edit**: `eval-hooks.spec.ts` — `isActive` false on a fresh instance, true after `on()`,
  still true after the last hook is removed via unsubscribe / `off` (the latch), false again
  after `clear()`; `isEmpty` still tracks live registrations independently.
- **Edit**: `internal/classes/eval/public-api.ts` — nothing new to export; `isActive` is a
  getter on the already-exported `EvalHooks`.
- **Edit**: `eval-state.spec.ts` — hooks default absent, `hasHooks === false` until a hook is
  registered, `hasHooks` stays true once a hook has been registered and then removed
  (the § 3.6 latch), adoption from options, isolation between two states from the same
  service.
- **Exit**: existing `eval-state.spec.ts` untouched-and-passing plus new cases.

### Step 3 — Convert `beforeVisitor` / `afterVisitor` into dispatchers
- **Edit**: `visitors/before-visitor.ts`, `visitors/after-visitor.ts` — bodies replaced per
  § 3.7 and § 3.8; `trackTime` logic removed (moves to step 5). This also retires the
  mismatched `console.time` calls, so the duplicate-label warnings the library currently
  emits to consumers stop here rather than in step 5.
- **Signature change**: return type `number | undefined` → `void`. Safe per finding 1.2.2;
  all 19 call sites already discard the value, so **no visitor body changes**.
- **Edit**: `internal/functions/evaluate.ts` — capture `const mark = state.hooks.depth`
  before `walk.recursive`, and have the existing catch call
  `state.hooks.unwindTo(mark, error)` before `state.result.setFailure(error)`. Two new call
  sites in one function; this is what keeps finding 1.2.7 out of the visitors. Both sit
  behind the `hasHooks` guard, so the no-hooks path is untouched. The mark is **not**
  optional: `evaluate()` is re-entered with the same state from
  `arrow-function-expression.ts:17`, and an absolute `unwind` there drains the outer walk's
  open nodes (§ 3.8).
- **Edit**: `eval-hooks.ts` — add `depth` and `unwindTo(mark, error)` per § 3.8; `unwind`
  becomes `unwindTo(0, error)`.
- **Edit**: `eval-hooks.spec.ts` — `unwindTo` leaves nodes below the mark open, and a
  nested drain to a mark does not disturb the outer frame.
- **`after` phase value**: `afterVisitor` is called after `pushVisitorResult`, so the pushed
  value is `st.result.stack.peek()` (`internal/classes/common/stack.ts:39`, non-destructive)
  — read it there to populate `event.value` rather than changing 19 call signatures. Guard
  with a length check; an empty stack yields `value: undefined`, not a throw.
- **New**: `visitors/hooks.spec.ts` —
  - a `'*'` hook fires once per node for a representative expression, and the fired type
    sequence matches `state.result.trace` types;
  - **every `before` is matched by exactly one `after`**, asserted as a counter that returns
    to zero;
  - the same balance holds when evaluation throws — drive this with an expression that trips
    `evaluateBinaryOperation` (e.g. `'x' in null`) and with a prototype-pollution guard
    rejection, asserting the unwound events carry `completed: false`;
  - `logical-expression.ts`'s four exit paths each produce exactly one `after`;
  - the mark holds under re-entry: an arrow function whose body throws, invoked by a
    context-supplied host function that **swallows** the throw, leaves the enclosing nodes
    open and still balanced — no enclosing node receives both a `completed: false` and a
    `completed: true` event (§ 3.8).
- **Exit**: full existing suite green (the load-bearing regression gate for this step);
  before/after counts balanced on both the success and throw paths; `trackTime: true` no
  longer writes to `console`.

### Step 4 — Read hooks
- **Edit**: `internal/classes/eval/eval-hooks.ts` — add `EvalReadKind`, `EvalReadEvent`,
  `EvalReadHook` (§ 3.5), the read-hook registry, `onRead()`, and the emit method the
  visitors call. Step 1 deliberately shipped node hooks only, so this step is where the
  read side of `EvalHooks` is built.
- **Edit**: `internal/classes/eval/public-api.ts` — export `EvalReadHook`, `EvalReadEvent`,
  `EvalReadKind` (§ 5). Read hooks reach the barrel here, not in step 1.
- **Edit**: `internal/classes/eval/eval-hooks.spec.ts` — `onRead` registration,
  unsubscribe, and error policy, matching the node-hook cases.
- **Edit**: `visitors/identifier.ts` (2 branches), `visitors/member-expression.ts`
  (3 return branches in `evaluateMember`) — emit `EvalReadEvent`; guard each with
  `if (st.hasHooks)` so the non-hook path is a single boolean check.
- **New**: `visitors/read-hooks.spec.ts` — identifier reads, dotted member paths, computed
  members (`path === undefined`, `key` exact), case-insensitive key correction reported as
  the *corrected* key, scope reads via `EvalScope`, global-scope reads.
- **Exit**: read events cover every path exercised by `eval.service.scope.spec.ts` and
  `eval.service.case-insesitive.spec.ts`.

### Step 5 — Built-in hooks
- **New**: `internal/classes/eval/hooks/timing-hook.ts` — replaces `trackTime`, fixing the
  `console.time`/`console.timeEnd` mismatch and actually using the `performance.now()`
  readings (per-node-type totals on the returned handle instead of raw `console` output).
- **New**: `internal/classes/eval/hooks/dependency-tracker.ts` —
  `createDependencyTracker()` returning `{ install(hooks): Unsubscribe, dependencies: ReadonlySet<string>, reads: EvalReadEvent[], reset() }`.
  This is the roadmap's named exit criterion and Phase 3's input.
- **Edit**: `internal/classes/eval/eval-options.ts` — restore the typed
  `trackTime?: boolean` declaration, currently commented out (`eval-options.ts:11`,
  `23-27`). There is no existing contract to preserve: the live read is an untyped string
  index and the only in-repo setter sets it to `false` (finding 1.2.3), so this step
  **defines** the option rather than porting it.
- **Edit**: `eval-state.ts` / `EvalHooks` construction — register the timing hook when
  `options.trackTime` is truthy, reading it through the restored declaration.
- **Edit**: `README.md` — document `trackTime` under `## Options`; it appears in no README
  section today.
- **New**: the first test that exercises `trackTime: true` — the timing hook pair is
  registered, per-node-type totals are produced on the returned handle, and nothing is
  written to `console`.
- **New**: specs for both; the tracker spec asserts `a.b + c` yields `{a, a.b, c}` and that a
  re-evaluation after `reset()` reproduces the same set.
- **Exit**: `trackTime: true` no longer leaks unclosed `console.time` labels; tracker specs green.

### Step 6 — Lifecycle & docs
- **Edit**: `eval.service.ts` `ngOnDestroy` — call `state.hooks.clear()` alongside the
  existing stack/context cleanup, so a long-lived hook closure cannot pin a destroyed state.
- **Edit**: `eval.service.memory-leaks.spec.ts` — assert hooks are cleared on destroy, and
  that `clearErrors()` releases the collected errors.
- **Edit**: `internal/classes/eval/eval-hooks.ts` — add `clearErrors()`. `clear()`
  deliberately retains `errors` (they record what already happened), so under the
  state-first style — `compile()` plus repeated `call()` on one state — the array grows
  without bound, and a thrown value can close over consumer objects that `ngOnDestroy`
  therefore cannot release. Carried over from step 1; see `step-1-summary.md` § 4.3 for the
  reasoning behind `clear()`'s retention.
- **Edit**: `internal/classes/eval/eval-hooks.ts` / `public-api.ts` — resolve
  `ASYNC_HOOK_MESSAGE`: it is exported from the module and referenced by an `{@link}` in the
  class docs, but is not re-exported from the barrel, so the link dangles for consumers.
  Either export it (additive, and matching on it is what a consumer inspecting
  `hooks.errors` would want — add it to § 5) or drop the `{@link}`. Carried over from
  step 1; see `step-1-summary.md` § 4.3.
- **Edit**: `README.md` — new `### Evaluation hooks` subsection under `## Options`
  (after `### Evaluation with scope`), plus a line in `### ESTree nodes supported:`' vicinity
  is *not* needed — hooks are node-agnostic.
- **Edit**: `ROADMAP.md` — mark Phase 1 done, link this document.
- **Edit**: `modules/eval-core/package.json` — bump `0.2.5` → `0.3.0` (additive public API).
- **Edit**: `internal/interfaces/recursive-visitors.ts` — mark `RecursiveVisitorState` and
  `RecursiveVisitorResult` `@deprecated`, pointing at `EvalHooks`. They stay exported, so
  the release remains purely additive; removal is a follow-up for the next breaking version.
  Without this the package ships two contradictory hook vocabularies (finding 1.2.8) — and
  contradictory in a concrete, checkable way: the legacy `beforeVisitors`/`afterVisitors`
  entries are typed to return `number | undefined`, while `EvalNodeHook` mandates `void`
  (§ 3.3, § 8). Shipping both would publish two incompatible hook shapes from one barrel
  export.
- **Edit**: `CHANGELOG.md` — entry describing the new hook API and the `trackTime` fix, and
  noting the deprecation.

---

## 5. Public API surface added

```ts
// from @zvenigora/ng-eval-core
export { EvalHooks, type EvalHookPhase, type EvalNodeHook, type EvalNodeHookEvent,
         type EvalReadHook, type EvalReadEvent, type EvalReadKind,
         type EvalHookError, type EvalHookErrorPolicy, type Unsubscribe,
         createDependencyTracker, createTimingHook };
```

Everything else stays internal. No existing exported symbol changes shape; `EvalState` gains
two getters. **This is a purely additive release.**

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Lint | `npx nx run eval-core:lint` | 0 errors, 0 warnings |
| Unit tests | `npx nx run eval-core:test` | All pre-existing suites still pass, plus ~6 new spec files |
| Build | `npx nx run eval-core:build:production` | Clean build to `dist/modules/eval-core` |
| Perf | `internal/performance.spec.ts` | No regression on the no-hooks path (§ 3.7 makes it strictly cheaper) |

Run the full suite after **every** step, not just at the end — step 3 touches the shared
path of all 19 visitors and is where a regression would surface.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
| :--- | :---: | :--- |
| Step 3 regresses a visitor's early-return path (`logical-expression.ts` has 4 `afterVisitor` exits) | Low | Signature unchanged from the caller's perspective; the step-3 spec asserts one `after` per exit path and a net-zero balance counter |
| Unwinding fires `after` for a node whose visitor partially completed, confusing a consumer | Medium | `completed: false` and the absent `value` make the path explicit; documented in the README's hooks section with a worked example |
| `Stack.peek()` throws or mutates on an empty stack, breaking `after` value retrieval | Low | `peek()` exists and is non-destructive; step 3 guards with a length check |
| Hook closures retain contexts → memory leak, contradicting `eval.service.memory-leaks.spec.ts` | Medium | Step 6 clears hooks in `ngOnDestroy`; unsubscribe returned from every `on()` |
| Read-hook emission in `evaluateMember` misses a branch (3 returns + the dangerous-property throw) | Medium | Step 4 spec drives all three branches; the throw path intentionally emits nothing |
| Consumers expect awaitable hooks | Medium | Documented sync-only contract + runtime promise-return warning (§ 3.3) |
| Scope creep into Phase 2 statement nodes | Low | Hooks are node-type-keyed; new statement visitors in Phase 2 get hook support for free by calling the same dispatchers |

---

## 8. Deferred design note — short-circuiting hooks

A `before` hook that returns a replacement value would let consumers implement memoization,
access policy, or mocking. It is **not** in Phase 1 because every one of the 19 visitors
would need to honor the return value and skip its own body — a change to the evaluation
contract, not an addition to it.

To keep the door open, `EvalNodeHook` returns `void` (not `never`, not `unknown`) in Phase 1.
A future `EvalInterceptor` kind can be added as a separate registry with its own dispatch
point, without touching `EvalNodeHook`'s signature or any existing consumer.

---

## 9. Downstream contract for Phase 3 / 4

What Phase 3 (`@zvenigora/ng-eval-signals`) can rely on after this lands:

1. `EvalState.hooks.onRead(cb)` fires once per resolved context read, with the
   **post-case-correction** key and the target object identity.
2. `createDependencyTracker()` yields a stable dependency set per evaluation, resettable
   between runs.
3. Hooks are sync, so a tracker can be installed, an expression evaluated, and the dependency
   set read back in the same synchronous turn — which is exactly what wrapping a `computed()`
   requires.
4. Hook registration is per-`EvalState`, so one signal's tracking never bleeds into another's
   even though `EvalService` is a root singleton.

Open question handed to Phase 3 (not resolvable here): whether identity-based dependency keys
(`target` + `key`) are sufficient, or whether computed-member expressions need full path
strings. § 3.5 provides the former exactly and the latter best-effort.

Not resolved here, logged to `ROADMAP.md` rather than absorbed into Phase 1:
`popVisitorResult` cannot detect stack underflow, because `Stack.pop()` returns `undefined`
on an empty stack and `undefined` is a legal evaluated value. `getDefaultVisitors()` also has
no default branch, so an unregistered node type (`FunctionExpression`, `SequenceExpression`,
`SpreadElement`, `YieldExpression`) falls through to acorn-walk's base handler, recurses, and
pushes nothing — the parent then pops a sibling's value. A length check throwing
`Stack underflow at ${node.type}` would convert every future desync from a wrong answer into
a test failure. This is a natural prerequisite for Phase 2, where new statement visitors
multiply the ways a push can be missed.
