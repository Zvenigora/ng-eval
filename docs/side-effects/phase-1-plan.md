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

  get isEmpty(): boolean;

  /** Dispatch guard; latches on first registration (§ 3.6). */
  get isActive(): boolean;
}
```

Errors collected under the 'collect' policy (§ 3.4) are **not** held here. Step 1 shipped
them as `EvalHooks.errors`; § 3.6 moves them to `EvalState`, because an `EvalHooks` may be
shared across evaluations and errors belong to one run.

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
  `{ phase, nodeType, error }`, appended to `state.hookErrors` (§ 3.6 — the list lives on
  the state, not on the shareable hooks object), and evaluation continues.
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
| Identifier resolution | `visitors/identifier.ts` — both the sensitive and case-insensitive branches | `kind: 'identifier'`, `key: st.context.getKey(node.name) ?? node.name`, `target: st.context` |
| Member resolution | `visitors/member-expression.ts` `evaluateMember` — at each of the three `return` branches (context / `EvalScope` / plain object) | `kind: 'member'`, the resolved `contextKey` / `foundKey` / `key`, `target: object` |

The identifier key is the **corrected** one, not `node.name`: § 9.1 is the contract Phase 3
builds against and it promises the post-case-correction key. `getKey` returns `undefined`
for a name the context does not hold, and the source spelling stands in — see the
literal-registry and namespace notes below. The member branches follow the same rule: the
context branch reports `contextKey`, and the plain-object branch reports the `foundKey` its
case-insensitive lookup matched. `evaluateMember`'s **return tuple is unchanged** — only the
event carries the corrected key, so no caller of `evaluateMember` shifts behaviour.

`path` is reconstructed statically by walking `node.object` while it is a non-computed
`MemberExpression`/`Identifier` chain; for computed members (`obj[expr]`) the *resolved* key
is still exact, so `path` is emitted as `undefined` and consumers fall back to
`target` + `key` identity. This limitation is documented, not hidden — Phase 3 will need to
decide whether identity-based tracking is enough or whether it wants path strings. `path`
is the **source spelling** and is therefore not case-corrected even when `key` is.

Four consequences of these emission points, all intended:

- **`this` emits nothing.** An identifier that resolves to the context object itself
  (`node.name === 'this'`, or any case-variant under `caseInsensitive` — `This.Three` is a
  live parse, since acorn only produces a `ThisExpression` for the lowercase keyword) is not
  a read *of a key*. Emitting `key: 'this'`, `value: st.context` would have a tracker record
  a dependency on the whole context and re-fire on every change to it. `This.Three` still
  yields a member event with key `three`, which is the real dependency.
- **Literal-registry resolutions do emit.** Under `caseInsensitive`, `TrUe` / `Undefined` /
  `null` resolve off the module-private `literals` registry rather than the context. They
  are still reported, with the source spelling as the key, because `getKey` cannot correct a
  name the context does not hold. Under-reporting a read is the worse failure mode; a
  consumer that does not want constants can filter them.
- **Assignment and update targets emit read events.** `evaluateMember` is called from
  `call-expression.ts`, `assignment-expression.ts` and `update-expression.ts` as well as
  from `memberExpressionVisitor`, so `a.b = 1` reports a read of `a.b`. This is correct
  rather than a wart: resolving the assignment target genuinely reads `a` from the context,
  and a tracker that filtered it would miss a real dependency on the object being written
  to. Emitting inside `evaluateMember` is also what makes the step's exit criterion
  reachable — `eval.service.scope.spec.ts`'s `cat.action(args, cat.num, "times")` resolves
  its callee through the call-expression path, not through the member visitor.
- **A namespace identifier is not case-corrected.** `EvalContext.getKey` searches *inside*
  each prior scope's context, never its `namespace`, so `Dog.Says()` reports `key: 'Dog'`
  while the member hop reports the corrected `says`. Fixing this means teaching `getKey`
  about namespaces, which is a behavioural change to an exported method and out of scope
  here. Pinned by `read-hooks.spec.ts`; it wants its own step and a `ROADMAP.md` entry
  alongside step 3's deferred visitor defects.

**Reachability of the `EvalScope` branch.** `evaluateMember`'s second branch
(`object instanceof EvalScope`) is *not* reachable from `eval.service.scope.spec.ts` or
`eval.service.global-scope.spec.ts`: a namespaced `EvalScope.get` returns its wrapped
`context` object, never the scope itself, so those expressions land in the plain-object
branch. The branch is reached only when a context *value* is itself an `EvalScope`.
`visitors/read-hooks.spec.ts` hand-builds such a context to cover it, and carries a comment
saying so, since the namespaced cases would otherwise look like redundant duplicates of it.

**Target identity is stable only for caller-owned objects.** § 9.1 promises "the target
object identity", and that holds for member reads: a plain context is re-wrapped into a
fresh `Registry` per evaluation under `caseInsensitive`, but the entries still reference the
caller's objects, so `foo.bar` reports the same `context.foo` on every run. It does **not**
hold for identifier reads, whose target is `st.context` — a new `EvalContext` per evaluation
whenever the caller passes a plain object rather than reusing an `EvalContext`. Phase 3
therefore cannot key a dependency on `(target, key)` alone for bare identifiers across runs;
it needs the key (plus the caller's own context identity), or it needs callers to reuse one
`EvalContext`. Asserted both ways in `read-hooks.spec.ts`.

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
   → the `EvalState` **constructor** casts, then reads `options['hooks']` and adopts it if
   it is an `EvalHooks`. The read sits in the constructor rather than in `fromContext`
   because the constructor is public and takes `options` directly, so putting it there
   makes both construction paths behave identically for one line of code.

   **`options['onHookError']` is honoured only when no registry is adopted.** The policy is
   registration-side state: `EvalHooks` reads it in its own constructor, so an adopted
   registry carries whatever policy the caller built it with. `EvalState` must not
   retro-fit a different one onto an object it does not own.

   *Failure mode to document, not to defend against*: passing **both** `hooks` and
   `onHookError` in the same options object silently ignores the latter. The caller's
   registry keeps its own policy — most often the `'collect'` default — so a consumer who
   asked for `'throw'` gets collection instead, and only notices because their evaluation
   did not fail. The fix is to pass the policy where it belongs,
   `new EvalHooks({ onHookError: 'throw' })`. Step 6's README hooks section must name this
   pairing explicitly.
3. **Built-ins**: `options.trackTime` registers the timing hook pair (§ 4, step 5).

Because `compile()` binds only the node (`evaluate.bind(null, node)`) and takes the state at
call time, compiled expressions get hooks for free — no change to `compile.ts`.

**Decision — `options['hooks']` is adopted as-is. It is not cloned.**

Cloning was considered and rejected:

- It would **break the unsubscribe closures returned by `on()`**. The consumer registers
  against their own object and holds the returned closure; dispatch would run from a copy.
  Calling the closure would remove the hook from the original registry and silently leave
  the live copy firing. A cleanup function that appears to work and does nothing is worse
  than no cleanup function, and it defeats the `ngOnDestroy` ergonomic that § 3.2 is built
  around.
- It would **override the caller's intent**. Passing the same `EvalHooks` to two
  evaluations is an explicit request for the same callbacks to observe both. Silently
  giving each run a private copy answers a question the caller did not ask.

**The principle that makes adoption safe: `EvalHooks` holds *registration*; `EvalState`
holds *per-run bookkeeping*.** An `EvalHooks` is a consumer-owned object that lives as long
as the consumer wants it to — across many evaluations, if they say so. It therefore may
hold only things whose lifetime is the consumer's: the listener registries and the error
policy. Anything whose lifetime is a single evaluation belongs on the state.

By that rule, **two things move off `EvalHooks` and onto `EvalState`**:

1. **The open-node stack** (`_open`). Shared across two evaluations it is outright
   corrupting — interleaved runs push and pop each other's frames, and § 3.8's
   every-`before`-matched invariant fails. This is the concrete form of the cross-talk
   hazard finding § 1.2.6 exists to prevent, arriving through the options object rather
   than through a module-level global.
2. **The collected errors** (`_errors`). Less dramatic, but the same category: a shared
   hooks object would accumulate one evaluation's errors into the next one's list, so a
   consumer could not tell which run produced what, and the list would grow for the
   lifetime of their object rather than the run. Errors describe what happened during *an
   evaluation*, so they belong to the evaluation.

Mechanically the errors move is the cheaper of the two: every `handleError` call site
already receives the event, and `EvalNodeHookEvent.state` is required, so the write can be
redirected to `event.state` with no signature change. The stack move is what forces
`enter` / `exit` / `unwindTo` to take the state.

**Decision — the two moved members live behind one `@internal` accessor, and the state owns
the storage.** `EvalState` exposes a single `hookBookkeeping` getter returning
`{ open: AnyNode[]; errors: EvalHookError[] }`, lazily created, rather than two separate
members. One accessor keeps the additions to `EvalState`'s surface to a single name, and
groups the two things that share a lifetime — a run — so that any later per-run field has
an obvious home.

The alternative was to keep both in a module-private `WeakMap<EvalState, …>` inside
`eval-hooks.ts`, leaving `EvalState` untouched. **Rejected: it inverts the import graph into
a runtime cycle.** `eval-state.ts` already needs a *value* import of `eval-hooks.ts` — the
lazy `hooks` getter calls `new EvalHooks(...)` and adoption does an `instanceof` check. If
the storage moved into `eval-hooks.ts`, then `EvalState.hookErrors` would have to call into
that module to read the map, making the return edge a value import too, while
`eval-hooks.ts` imports `EvalState`. Today that second edge is `import type` and erases
completely. Turning it into a real one gives ng-packagr a genuine circular dependency
between two modules in the same entry point — the class of defect that shows up as an
`undefined` at class-evaluation time depending on which module the bundler reaches first,
not as a build error.

So: **the state owns the storage; the hooks type-import the state.** Keep the import graph
acyclic. This is also why `depth` is a method taking the state rather than the getter § 3.8
sketches — the stack it measures is no longer the registry's to read.

**Known limitation this creates.** With errors on the state, the options-first style
(`simpleEval(expr, ctx, { hooks })`) has no way to read them: the consumer holds the
`EvalHooks` but never sees the `EvalState` that `BaseEval.createState` built. The
state-first style is unaffected — `state.hookErrors` is right there. Recorded rather than
solved: it argues for an `onHookError` *callback* form of the option, or for
`simpleEval` to surface the state, and neither is worth designing before Phase 3 shows
which style consumers actually use. Step 6's README section must say plainly that reading
hook errors requires the state-first style.

**This is orthogonal to the mark-based `unwindTo` of § 3.8, and neither subsumes the
other.** Per-state isolation handles *sharing across evaluations* — two runs that must not
see each other's bookkeeping. Marks handle *nested walks within one evaluation* — the
re-entrant `evaluate()` call in `arrow-function-expression.ts:17`, which uses the very same
state and so is invisible to per-state isolation by construction. Fixing either one alone
leaves the other's failure mode intact.

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
exit(): void { this._open.pop(); }   // step 3 replaces this with exit(state, node) — see below

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
state parameter, so each open node carries its own.

**Decision — `exit` pops by identity, not by position.** `exit(state, node)` takes the node
the visitor is closing and reconciles the stack against it. Three cases, all three
specified:

| Case | Stack | Action |
| :--- | :--- | :--- |
| 1 | top **is** `node` | Pop it. The ordinary path; one array `pop`. |
| 2 | `node` is present *below* the top | Synthesise an `after` with `completed: false` for each frame above `node`, innermost first, then pop `node` itself. |
| 3 | `node` is **not on the stack** | Pop nothing. Return without touching the stack or emitting. |

Case 3 is not defensive padding — it is what stops a stray `exit` from draining the whole
stack. Without it the natural implementation ("pop until you find it") walks to the bottom
when the node is absent, synthesising a `completed: false` event for every genuinely-open
enclosing frame and leaving the state empty, so a later real failure unwinds nothing. An
`exit` for a node that was never entered is a no-op, because the only honest answer to
"close this node" when the node was never opened is to do nothing. The case is reachable
whenever the `hasHooks` guard flips mid-walk, and cheap to hold: it is the not-found branch
of the same scan case 2 already needs.

Note what case 3 does *not* suppress: `exit` declines to pop, but `dispatch` still emits
the node's own `completed: true` event afterwards. The guarantee this section makes is
therefore **one-directional** — every `before` gets exactly one `after`, but an `after` can
arrive with no `before`. Consumers that pair events must key on the node, not assume a
matched sequence.

**The scan takes the innermost occurrence — `lastIndexOf`, not `indexOf`.** The same AST
node can legitimately be open more than once on one state: an arrow-function body is
re-walked on every call, so a recursive arrow has each body node open once per live
recursion level. Taking the outermost match would flush every enclosing level as
`completed: false` on the first case-2 hit. The innermost match is the frame the visitor
currently returning actually opened.

Residual limit, recorded rather than fixed: `exit` has no mark, so it cannot tell "absent
from this walk" from "absent from the stack". A node open only in an *enclosing* walk falls
into case 2, and the flush crosses the walk boundary. That needs an `afterVisitor` with no
matching `beforeVisitor` in the same frame, which no visitor does today — but step 4 adds
emission points to `identifier.ts` and `member-expression.ts`, so it is worth not making
reachable by accident.

The synthesised events from case 2 carry **no `value`** — the node never pushed one that
`afterVisitor` could read — and **no `error`**, because there is no error: nothing threw,
the frames are being closed because an enclosing visitor moved on without them. `error` is
therefore genuinely optional on the unwound path, not merely typed as optional, and
`EvalNodeHookEvent.error` keeps its documented meaning of "the error that aborted
evaluation" rather than being stuffed with a synthetic placeholder. Consumers distinguish
the two unwind sources by whether `error` is present: `unwindTo` supplies one, `exit` does
not.

**Case 2's events are emitted under the collect policy even for a consumer who chose
`'throw'`.** That is required, not lenient: `handleError` rethrows out of `emit`, so a
throwing hook would escape the flush loop before it finished popping — abandoning the
frames it had not reached yet and re-creating the exact leak the identity check exists to
prevent. A `'throw'`-policy consumer sees these in `state.hookErrors` instead. Note this is
a *different* justification from the same downgrade inside `unwindTo`: there the argument is
that evaluation has already failed and the original error is the one worth propagating,
which is not true here — nothing threw, and the evaluation may well succeed.

Rationale for identity over position: a positional pop is only correct if every visitor
brackets its body exactly — one `afterVisitor` per `beforeVisitor`, on every path. Most do.
`await-expression.ts:37-78` does not: it catches a child's *synchronous* throw, converts it
to a promise rejection, and continues to its own `pushVisitorResult`/`afterVisitor`, so the
child is still open when the parent closes. Under a positional pop the parent's `exit` then
closes the *child's* frame, the child never receives an `after` at all, and one frame leaks
onto the `EvalState` permanently — surviving into every later evaluation on that state, so
a subsequent genuine failure unwinds a node from an earlier successful walk. Measured on
`call(async () => await obj.__proto__)`: six `before` events, five `after` events, and
`depth(state) === 1` after a walk that *succeeded*.

That is the general shape of the hazard, not a single bug: positional popping is what turns
one badly-bracketed visitor into a silent, cascading misattribution across every node
around it. Identity checking is what makes this section's guarantee hold *for* visitors
that do not follow the convention, instead of assuming they all do — which is the weaker
claim the positional form was actually making. It costs one reference comparison against
the top of the stack on the ordinary path, inside the `hasHooks` guard, and it converts a
silent desync into a `completed: false` event a consumer can see.

**Decision — unwinding is mark-based, not absolute.** `evaluate()` captures
`const mark = state.hooks.depth(state)` before `walk.recursive` and its catch calls
`state.hooks.unwindTo(mark, error, state)`. `unwind(error, state)` stays as the
drain-everything form for callers that own the whole walk.

**Both entry points do this, not just the sync one.** `evaluateAsync` performs the same
synchronous `walk.recursive` inside its own `try`/`catch`, so it captures its own mark and
unwinds to it in its catch. Omitting it would leave a throw under `evalAsync` with the
walk's open nodes stranded on the state — unmatched `before` events, and a stack that a
later evaluation on the same state would inherit.

`evaluateAsync` has a *second* failure mode the sync path does not: `awaitAllPromises` can
reject after the walk itself completed successfully. By then every node the walk opened has
already been closed by its own `afterVisitor`, so `depth(state)` is back at the mark and
`unwindTo` finds nothing above it. **`unwindTo` is a no-op whenever depth is already at (or
below) the mark** — its loop condition is `open.length > mark` — so that path synthesises
zero events rather than inventing `completed: false` events for nodes that genuinely
completed. This is the reason the guard is a depth comparison and not a "did we fail?"
flag, and it is asserted directly rather than inferred from before/after balance, which
would also hold if a spurious pair were emitted.

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

**Marks are orthogonal to the per-state isolation settled in § 3.6.** That decision moves
the open-node stack onto `EvalState`, so two evaluations sharing one `EvalHooks` cannot
corrupt each other's frames. It does nothing here: the re-entrant call at
`arrow-function-expression.ts:17` passes the **same state**, so both walks address the same
stack no matter where that stack lives. Isolation is about *sharing across evaluations*;
marks are about *nesting within one*. Both are required — neither substitutes for the
other. Note also that once the stack lives on the state, `depth` and `unwindTo` read and
write the state's stack rather than the hooks object's; the mark semantics are unchanged.

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

**Decision — bookkeeping mutates before user code on both edges.** `dispatch` updates the
open-node stack *first* and calls `emit` *second*, on `before` and on `after` alike:

```ts
// before: enter, then emit          // after: exit, then emit
this.enter(node, state);             this.exit(state, node);
this.emit({ phase: 'before', … });   this.emit({ phase: 'after', … });
```

The reason is that **`emit` can throw**. Under `onHookError: 'throw'` (§ 3.4) a hook's
error is rethrown out of `emit`, so anything sequenced after it does not run. On the
`before` edge that means `enter` is skipped: hooks registered ahead of the throwing one have
already been told the node was entered, but the node is not on the open stack, so the
`unwindTo(mark, error)` in `evaluate()`'s catch has nothing to synthesise a matching
`completed: false` event from. The result is one unmatched `before` per throwing-hook node —
on precisely the error path this section exists to guarantee. A node that is missing from
the open stack cannot be unwound, so it must be on the stack before any user code gets a
chance to prevent it from getting there.

Step 1 shipped the `before` edge in the other order (`emit` then `enter`) and step 2 left it
alone; nothing dispatched yet, so it was unreachable. Step 3 makes it live and must correct
it.

**This makes the two edges consistent, not asymmetric** — the shared rule is
*bookkeeping first, user code second*. That is worth stating explicitly because the two
edges look like they are justified differently, and the earlier text here justified only
one of them: `exit` pops first so that a throwing `after` hook cannot corrupt the stack,
whereas `enter` pushes first so that a throwing `before` hook cannot leave the stack
incomplete. Those read as two different arguments — "don't corrupt" and "don't omit" — but
they are the same argument seen from either side of the stack: hook code runs only once the
stack already tells the truth about this node. Anyone re-deriving the ordering from the
`after` edge alone would conclude that `before` should emit first, which is the mistake step
1 made.

Hook errors continue to be handled by the § 3.4 policy in both cases.

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
  `options['hooks']` in the **constructor**, which `fromContext` delegates to, so both
  construction paths behave alike (§ 3.6). `options['onHookError']` is honoured only on the
  lazy path — an adopted registry keeps the policy it was constructed with. `EvalOptions` is a union
  (§ 3.6), so both reads go through an `as Record<string, unknown>` cast — the same one
  `before-visitor.ts:6` performs — not a direct index on `EvalOptions`.
- **Edit**: `eval-hooks.ts` — add the latching `isActive` getter settled in § 3.6: a private
  flag set by `on()`, reset only by `clear()`. `isEmpty` is unchanged and keeps its shipped
  meaning. `hasHooks` reads `isActive`, **not** `!isEmpty`.
- **Edit**: `eval-hooks.ts` — **move per-run bookkeeping onto `EvalState`** per § 3.6, since
  an adopted `EvalHooks` may be shared across evaluations. This reopens step 1's file and
  spec; that is expected, and it is why the move is worth doing before step 3 wires
  anything up.
  - `_open` moves to `EvalState`. `enter` / `exit` / `depth` / `unwindTo` / `unwind` read
    and write the state's stack, so `exit` and `unwind` regain a state parameter; `enter`
    no longer needs to store one per entry, because the stack it pushes onto is already the
    state's. `depth` and `unwindTo` do not exist yet — step 1 shipped only
    `enter` / `exit` / `unwind`, and § 3.8's mark-based form was settled after that step's
    review — so **this step adds them**; step 3 is their first caller. `depth` lands as a
    method `depth(state)`, not the getter § 3.8 sketches, because a getter cannot take the
    state whose stack it measures. Parameter order is state-last throughout, matching the
    `enter(node, state)` step 1 shipped.
  - Both moved members sit behind the single `@internal` `hookBookkeeping` accessor settled
    in § 3.6, which also records why the module-private `WeakMap` alternative was rejected.
  - `_errors` moves to `EvalState`, exposed as `hookErrors`. `EvalHooks.errors` is removed.
    This one is nearly free: every `handleError` call site already receives the event, and
    `EvalNodeHookEvent.state` is required, so the write redirects to `event.state` with no
    signature change.
  - What stays on `EvalHooks`: the two registries, the latch flag, and the error policy —
    registration only.
- **Edit**: `eval-state.ts` — `hookErrors` getter backed by a lazily created array, plus the
  open-node stack the hook methods now operate on.
- **Edit**: `eval-hooks.spec.ts` — `isActive` false on a fresh instance, true after `on()`,
  still true after the last hook is removed via unsubscribe / `off` (the latch), false again
  after `clear()`; `isEmpty` still tracks live registrations independently. Existing cases
  are rewritten to read errors from the state and to pass a state to `unwind`; **assertions
  are relocated, not weakened** — every case step 1 covers must still be covered.
  - **New case**: one `EvalHooks` driving two `EvalState`s does not mix their open stacks or
    their errors — the § 3.6 isolation property, asserted directly.
- **Edit**: `internal/classes/eval/public-api.ts` — nothing new to export; `isActive` is a
  getter on the already-exported `EvalHooks`, and `hookErrors` is a getter on the already-
  exported `EvalState`.
- **Edit**: `eval-state.spec.ts` — hooks default absent, `hasHooks === false` until a hook is
  registered, `hasHooks` stays true once a hook has been registered and then removed
  (the § 3.6 latch), adoption from options **by reference** (the same object the caller
  passed, not a copy — a hook registered on the caller's object after `fromContext` still
  fires), and isolation between two states from the same service.
- **Exit**: existing `eval-state.spec.ts` untouched-and-passing plus new cases; step 1's
  `eval-hooks.spec.ts` coverage preserved after the relocation.

### Step 3 — Convert `beforeVisitor` / `afterVisitor` into dispatchers
- **Edit**: `visitors/before-visitor.ts`, `visitors/after-visitor.ts` — bodies replaced per
  § 3.7 and § 3.8; `trackTime` logic removed (moves to step 5). This also retires the
  mismatched `console.time` calls, so the duplicate-label warnings the library currently
  emits to consumers stop here rather than in step 5.
- **Signature change**: return type `number | undefined` → `void`. Safe per finding 1.2.2;
  the value is already discarded everywhere, so **no visitor body changes**. The count is
  19 visitor *files* — 20 `beforeVisitor` and 23 `afterVisitor` calls, because
  `identifier.ts` holds two visitor functions and `logical-expression.ts` has four `after`
  exits.
- **Edit**: `internal/functions/evaluate.ts` — capture `const mark = state.hooks.depth(state)`
  before `walk.recursive`, and have the existing catch call
  `state.hooks.unwindTo(mark, error, state)` before `state.result.setFailure(error)`. This
  applies to **both** entry points in the file, `evaluate` and `evaluateAsync` — four new
  call sites in one file. `evaluateAsync` runs the same synchronous walk inside its own
  `try`/`catch`, so leaving it out would let a throw under `evalAsync` strand the open-node
  stack, and this step's "balanced on the throw path" exit criterion would hold only for the
  sync entry point (§ 3.8). This is what keeps finding 1.2.7 out of the visitors. All four
  sit behind the `hasHooks` guard, so the no-hooks path is untouched. The mark is **not**
  optional: `evaluate()` is re-entered with the same state from
  `arrow-function-expression.ts:17`, and an absolute `unwind` there drains the outer walk's
  open nodes (§ 3.8). The capture goes **inside** the existing `if (node)` block, not at the
  top of the function: `evaluate.test.ts` drives the `node === undefined` case with a bare
  `{} as EvalState`, which has no `hasHooks` to read.
- **Edit**: `eval-hooks.ts` — reorder the `before` edge of `dispatch` to `enter` *then*
  `emit`, mirroring the `after` edge, per § 3.8's bookkeeping-before-user-code rule. Without
  it a `before` hook that throws under `onHookError: 'throw'` leaves its node off the open
  stack and therefore unmatchable by `unwindTo`. This is the step that makes the defect
  reachable, because it is the step that starts dispatching.
  (`depth` and `unwindTo(mark, error, state)` are **already done** — step 2 added them along
  with the move of the open-node stack onto `EvalState`; `unwind` is already
  `unwindTo(0, error, state)`.)
- **Edit**: `eval-hooks.ts` — change `exit(state)` to `exit(state, node)` and pop by
  **identity** per the three-case table in § 3.8, so a visitor that does not bracket its
  body exactly cannot make the parent close the child's frame. `await-expression.ts` is
  such a visitor and the reason this is in step 3 rather than deferred: without it the
  step's own "every before matched by exactly one after" exit criterion is false on
  `call(async () => await obj.__proto__)`. `dispatch`'s `after` edge is the only caller.
- **Edit**: `ROADMAP.md` — new "Deferred defects in the visitor layer" section recording,
  without fixing, the three visitor-layer defects this step surfaced but is not scoped to
  change (§ 3.8's rationale names the first of them). Behavioral fixes, so they need their
  own steps.
- **Edit**: `eval-hooks.spec.ts` — one case per row of the § 3.8 table: top-is-node pops
  and emits nothing extra; a node below the top flushes the frames above it as
  `completed: false` with **no `value` and no `error`** before popping; a node absent from
  the stack pops nothing and leaves the enclosing frames open.
- **Edit**: `eval-hooks.spec.ts` — `unwindTo` leaves nodes below the mark open, and a
  nested drain to a mark does not disturb the outer frame. Plus the ordering fix above: a
  `before` hook that throws under the `'throw'` policy still leaves its node open
  (`depth(state)` incremented), so a following `unwindTo` emits its `completed: false`
  event — the assertion step 2's `should rethrow a hook error under the throw policy` case
  does not currently pin.
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
    `completed: true` event (§ 3.8);
  - identity-checked `exit` under a visitor that swallows a child's throw:
    `call(async () => await obj.__proto__)` ends with `depth(state) === 0`, every `before`
    matched, and the `MemberExpression`'s `after` carrying `completed: false`. This is the
    case a positional pop got wrong, so it is asserted end-to-end and not only at the
    `EvalHooks` unit level.
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

  **Superseded by step 5's `hasReadHooks`.** `hasHooks` is true when *any* hook is
  registered, so this guard makes a consumer with only `before`/`after` hooks pay
  `getKey()` per identifier and `readPath()` plus an object literal per member — work whose
  result it can never observe. Harmless while nothing registers hooks from options; a live
  regression the moment step 5's `trackTime` latches `hasHooks` for the whole walk. Step 5
  narrows all five guards to `st.hasHooks && st.hooks.hasReadHooks`.
- **New**: `visitors/read-hooks.spec.ts` — identifier reads, dotted member paths, computed
  members (`path === undefined`, `key` exact), case-insensitive key correction reported as
  the *corrected* key, scope reads via `EvalScope`, global-scope reads.
- **Exit**: read events cover every path exercised by `eval.service.scope.spec.ts` and
  `eval.service.case-insesitive.spec.ts`.

### Step 5 — Built-in hooks

**Do this first.** The read guard has to be narrowed *before* the timing hook lands, not
after: `trackTime` is what turns step 4's over-broad guard from harmless into a measurable
regression, and § 3.7's promise is that work added to a per-node path stays off the paths
that cannot use it.

- **Edit**: `internal/classes/eval/eval-hooks.ts` — add `hasReadHooks`:

  ```ts
  public get hasReadHooks(): boolean {
    return this._read.length > 0;
  }
  ```

  **Non-latching, unlike `isActive`.** § 3.6 latches the node guard because it wraps the
  open-node stack, so a value that changed mid-walk would leave `enter` and `exit`
  unpaired. That argument does not transfer: `dispatchRead` touches no bookkeeping, so a
  read guard that flips mid-walk can only drop read events — it can never unbalance
  anything. A one-shot or self-unsubscribing read hook is therefore safe, and the guard can
  tell the truth about the current registration count instead of about history.
- **Edit**: `visitors/identifier.ts`, `visitors/member-expression.ts` — narrow all five
  emission guards from `if (st.hasHooks)` to `if (st.hasHooks && st.hooks.hasReadHooks)`.
  Reading `st.hooks` is safe behind `st.hasHooks`, which is false whenever the lazy
  registry has not been constructed, so the accessor cannot construct one.
- **Edit**: `internal/performance.spec.ts` — **the gate for the above.** Step 4 pinned only
  the `hasHooks === false` case, so nothing currently catches the expensive one. Add a case
  that registers node hooks *only* and asserts the read path stays off: under
  `caseInsensitive`, `getKey` reaches `getContextKey`, which materialises the whole key set
  per scope and scans it linearly, once per identifier node. A spy on a read hook cannot
  see this — the cost is incurred before any read hook would be called — so assert it
  against the walk's timing or by counting `getKey` invocations, not by counting events.
- **New**: `internal/classes/eval/hooks/timing-hook.ts` — replaces `trackTime`, fixing the
  `console.time`/`console.timeEnd` mismatch and actually using the `performance.now()`
  readings (per-node-type totals on the returned handle instead of raw `console` output).
- **New**: `internal/classes/eval/hooks/dependency-tracker.ts` —
  `createDependencyTracker()` returning `{ install(hooks): Unsubscribe, dependencies: ReadonlySet<string>, reads: EvalReadEvent[], reset() }`.
  This is the roadmap's named exit criterion and Phase 3's input.
- **Edit**: `internal/classes/eval/eval-options.ts` — restore the typed
  `trackTime?: boolean` declaration, currently commented out (`eval-options.ts:11`,
  `23-27`). There is no existing contract to preserve: **step 3 deleted the only reads**
  (they were untyped string indexes in `before-visitor.ts` / `after-visitor.ts`), and the
  one in-repo setter sets it to `false` (finding 1.2.3). So between step 3 and this step the
  option is inert, and this step **defines** it rather than porting it.
- **Edit**: `eval-state.ts` / `EvalHooks` construction — register the timing hook when
  `options.trackTime` is truthy, reading it through the restored declaration.

  **Decision — `trackTime: true` opts into full-walk dispatch, and that cost is accepted.**
  Registering from options means the registry is constructed **eagerly** in the `EvalState`
  constructor, not lazily on first access; `isActive` latches on that registration, so
  `hasHooks` is true before the walk starts and stays true for its whole duration. Every
  node therefore dispatches. This is not the § 3.7 guarantee being eroded — § 3.7 protects
  the *default* path, and a caller who asks to time every node has asked for per-node work.
  There is no cheaper shape that keeps the feature: per-node-type totals cannot be derived
  without visiting each node, and the one genuinely cheaper measurement — a single
  walk-level total — already exists for free as `EvalResult.duration`
  (`eval-result.ts:97-104`), on every evaluation, hooks or not. `trackTime` is therefore
  only worth shipping as the per-node-type breakdown, and the README must say plainly that
  turning it on makes the walk dispatch-per-node.

  What that caller has *not* asked for is read-event construction. `hasReadHooks` is what
  keeps the accepted cost to the thing actually requested: with only the timing hook
  registered, `hasHooks` is true for the whole walk but no `getKey` or `readPath` runs.
- **Edit**: `README.md` — document `trackTime` under `## Options`; it appears in no README
  section today.
- **New**: the first test that exercises `trackTime: true` — the timing hook pair is
  registered, per-node-type totals are produced on the returned handle, and nothing is
  written to `console`.
- **New**: specs for both; the tracker spec asserts `a.b + c` yields `{a, a.b, c}` and that a
  re-evaluation after `reset()` reproduces the same set.
- **Exit**: `trackTime: true` no longer leaks unclosed `console.time` labels; tracker specs
  green; `internal/performance.spec.ts` green **including** the new node-hooks-only case —
  registering `before`/`after` hooks must not run a single `getKey` or `readPath`.

### Step 6 — Lifecycle & docs
- **Edit**: `eval.service.ts` `ngOnDestroy` — call `state.hooks.clear()` alongside the
  existing stack/context cleanup, so a long-lived hook closure cannot pin a destroyed state.
- **Edit**: `eval.service.memory-leaks.spec.ts` — assert hooks are cleared on destroy, and
  that `clearHookErrors()` releases the collected errors **and the open-node stack**.
- **Edit**: `eval-state.ts` — add `clearHookErrors()`. Step 2 moves the error list onto the
  state (§ 3.6), and `hooks.clear()` cannot reach it: under the state-first style —
  `compile()` plus repeated `call()` on one state — the list grows for the life of the
  state, and a thrown value can close over consumer objects that `ngOnDestroy` therefore
  cannot release. Carried over from step 1, where the list lived on `EvalHooks` and
  `clear()` deliberately retained it; see `step-1-summary.md` § 4.3 for that reasoning.

  **It must reset the whole bookkeeping record, not just the errors** — both fields of
  `hookBookkeeping`, so the open-node stack is dropped too. Step 1's `clear()` did drain
  the stack; step 2 moved the stack onto the state, so `clear()` can no longer reach it and
  *nothing* drains it any more. A `clear()` mid-walk — the case § 3.6 documents as
  unsupported, and the one `ngOnDestroy` performs — therefore abandons frames on the state
  permanently. `EvalService._activeStates` (`eval.service.ts:18`) is a strong `Set`, so
  those frames keep their AST nodes alive for the life of the service, which is exactly the
  retention `ngOnDestroy` is called to prevent. A caller who later uses the drain-everything
  `unwind(error, state)` also gets `completed: false` events for nodes belonging to a walk
  that ended long ago.

  Given that, `clearHookErrors()` is the wrong name for what it has to do; consider
  `resetHookBookkeeping()` and adjust § 5 to match. Raised by the step-2 review.
- **Edit**: `internal/classes/eval/eval-hooks.ts` / `public-api.ts` — resolve
  `ASYNC_HOOK_MESSAGE`: it is exported from the module and referenced by an `{@link}` in the
  class docs, but is not re-exported from the barrel, so the link dangles for consumers.
  Either export it (additive, and matching on it is what a consumer inspecting
  `state.hookErrors` would want — add it to § 5) or drop the `{@link}`. Carried over from
  step 1; see `step-1-summary.md` § 4.3.
- **Edit**: `README.md` — new `### Evaluation hooks` subsection under `## Options`
  (after `### Evaluation with scope`), plus a line in `### ESTree nodes supported:`' vicinity
  is *not* needed — hooks are node-agnostic. This subsection is the only place the following
  are written down for consumers, so none of them may be dropped:
  - the sync-only contract and the promise-return warning (§ 3.3);
  - `completed: false` events, with a worked example — and **both** of their sources, which
    step 3 made distinct (§ 3.8). `unwindTo` synthesises them when evaluation actually
    failed, and supplies the `error`. `exit` synthesises them when an enclosing visitor
    closed without its child having closed, and supplies **no** `error` — on an evaluation
    that may well succeed, as `call(async () => await obj.__proto__)` does. Presence of
    `error` is the discriminator, and a consumer that treats `completed: false` as "this
    evaluation failed" will be wrong on the second kind;
  - that `trackTime: true` registers a hook and so makes the walk dispatch per node
    (step 5);
  - that reading `hookErrors` requires the state-first style (§ 3.6);
  - that passing **both** `hooks` and `onHookError` silently ignores `onHookError`, because
    an adopted registry keeps the policy it was constructed with — pass it to
    `new EvalHooks({ onHookError: … })` instead (§ 3.6). Step 2 settled and implemented this
    behaviour but could not document it here: the subsection does not exist until this step.
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

  **The deprecation note must say what those two lines now are.** Step 3 widened the real
  `beforeVisitor` / `afterVisitor` to `void`, so `recursive-visitors.ts:13-14` is the *last
  published trace* of the timing-stub return type that step deleted — a signature no
  function in the library has any more. Nothing implements `RecursiveVisitorState`, so a
  reader who finds it has no way to discover that from the code; the `@deprecated` text is
  the only place it can be recorded. Raised by the step-3 review.
- **Edit**: `CHANGELOG.md` — entry describing the new hook API and the `trackTime` fix, and
  noting the deprecation. It must also record the **one non-additive change in the
  release**: step 4 widened `EvalHookError.phase` from `EvalHookPhase` to
  `EvalHookPhase | 'read'`. Free at the time — nothing ships before the `0.3.0` bump, so
  there is no released shape to break — but the entry is what stops it being discovered
  later by a consumer whose `switch (e.phase)` over `'before' | 'after'` silently stops
  being exhaustive. Everything else in § 5 is purely additive; this is the exception, and
  it is the reason the release notes cannot just say "additive".

---

## 5. Public API surface added

```ts
// from @zvenigora/ng-eval-core
export { EvalHooks, type EvalHookPhase, type EvalNodeHook, type EvalNodeHookEvent,
         type EvalReadHook, type EvalReadEvent, type EvalReadKind,
         type EvalHookError, type EvalHookErrorPolicy, type Unsubscribe,
         createDependencyTracker, createTimingHook };
```

Everything else stays internal. `EvalState` gains `hooks`, `hasHooks` and `hookErrors`
getters plus `clearHookErrors()` (§ 3.6, step 6). `EvalState.hookBookkeeping` and its
`EvalHookBookkeeping` type are `@internal` (§ 3.6): the type is declared in the emitted
`.d.ts` but deliberately absent from the barrel's export list, so it is not part of this
surface.

**Additive with one exception, both free at `0.3.0`.** `EvalHooks.errors`, shipped in step 1,
is *moved* rather than deprecated; and step 4 *widened* `EvalHookError.phase` from
`EvalHookPhase` to `EvalHookPhase | 'read'`, since a read is neither node phase and
reporting one as `'before'`/`'after'` would mislead the error log. Both are free because
nothing between step 1 and the `0.3.0` bump is published — but the widening is the one
change in this release that would be breaking against a shipped version, so it is called
out in the step 6 `CHANGELOG.md` entry rather than left to be discovered.

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
   **post-case-correction** key. See § 9.1 for exactly what `target` is and is not.
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

### 9.1 What `target` is, and what it is not

Step 4's implementation showed the original flat promise — "the target object identity" —
to be false in three of four cases. It is restated here as four separate guarantees rather
than patched, because Phase 3 has to build different machinery for each.

**Two of these Phase 3 must solve. Two it can accept.**

| Read shape | `target` | Stable across evaluations? | Verdict |
| :--- | :--- | :--- | :--- |
| Member against a caller-owned object (`foo.bar`) | the object the key was read from | **Yes** | Rely on it |
| Bare identifier (`foo`) | `st.context` | **No** — unless the caller reuses an `EvalContext` | **Must solve** |
| Optional member on a nullish base (`unknown?.x`) | a synthetic `{}` | **No** — fresh every time | Acceptable |
| Arrow-function parameter (`item` in `list.map(item => …)`) | `st.context` | n/a — it is not a dependency at all | **Must solve** |

**Member reads against caller-owned objects — rely on it.** A plain context is copied into a
fresh `Registry` per evaluation under `caseInsensitive`, but the entries still reference the
caller's objects, so `foo.bar` reports the same `context.foo` on every run. This is the case
identity-based keying was designed for and it holds.

**Bare identifiers — Phase 3 must solve this.** Their target is `st.context`, and
`EvalContext.fromContext` builds a *new* `EvalContext` per evaluation whenever the caller
passes a plain object; it returns the same instance only when the caller passes an
`EvalContext`. So `(target, key)` is not a usable dependency key for `a` across two
evaluations of the same expression. Two ways out, and Phase 3 picks one:
either key identifier reads on `key` alone plus the *caller's* context identity (which
Phase 3 owns, since it is the thing wrapping `computed()`), or require an `EvalContext` be
constructed once per signal and reused — which it will likely want anyway to hold
`priorScopes`. **This is the single most load-bearing correction in § 9.**

**Optional chaining on a nullish base — acceptable.** `evaluateMember` substitutes
`obj || {}`, so the event carries an object that never existed in the caller's data and
differs on every run. Tracking cannot match it — and does not need to: the read resolved to
`undefined` off a base that was itself absent, so there is no object whose change could
invalidate it. `path` still reconstructs (`'unknown.x'`), so a path-keyed tracker degrades
gracefully. Worth documenting to consumers, not worth engineering around.

**Arrow-function parameters — Phase 3 must filter these.** `arrow-function-expression.ts:16`
pushes the parameters as a scope on the *same* `EvalContext`, so a read of `item` inside
`list.map(item => item.name)` is **shape-identical** to a read of a real context key:
`kind: 'identifier'`, `target: st.context`, `path: 'item'`. A tracker that does not filter
will register loop variables as dependencies, and `path` strings from different arrow
bodies collide with each other and with same-named context keys. Nothing in the event marks
a read as scope-local today. Phase 3 either filters on its own knowledge of which names are
bound (it parses the expression anyway), or a later `eval-core` step adds a `scoped: true`
flag to `EvalReadEvent` — additive, and the cheaper fix if more than one consumer needs it.

One further limit, orthogonal to identity: **a namespace identifier is not case-corrected.**
`EvalContext.getKey` searches inside each prior scope's context but never its `namespace`,
so `Dog.Says()` reports `key: 'Dog'` while the member hop reports the corrected `says`.
Logged in `ROADMAP.md`.

Not resolved here, logged to `ROADMAP.md` rather than absorbed into Phase 1:
`popVisitorResult` cannot detect stack underflow, because `Stack.pop()` returns `undefined`
on an empty stack and `undefined` is a legal evaluated value. `getDefaultVisitors()` also has
no default branch, so an unregistered node type (`FunctionExpression`, `SequenceExpression`,
`SpreadElement`, `YieldExpression`) falls through to acorn-walk's base handler, recurses, and
pushes nothing — the parent then pops a sibling's value. A length check throwing
`Stack underflow at ${node.type}` would convert every future desync from a wrong answer into
a test failure. This is a natural prerequisite for Phase 2, where new statement visitors
multiply the ways a push can be missed.
