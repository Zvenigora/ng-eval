# Phase 3 Plan — `@zvenigora/ng-eval-signals` (new module)

**Date**: August 12, 2026
**Revision**: 2 — amended before step 1. Four changes: per-recompute state lifetime settled
(§ 3.3.1, reversing a § 3.8 bullet); the tracker never touches a consumer-owned hook registry
(§ 3.4); a **step 0** that puts `eval-signals` in front of CI on its own; and § 8's first
open question settled as a dev-mode nested-signal scan (§ 3.2.1).
**Target package**: `@zvenigora/ng-eval-signals` (`modules/eval-signals`, v0.0.1 scaffold)
**Depends on**: `@zvenigora/ng-eval-core` 0.3.0 (Phase 1 hooks) — see
[`phase-1-plan.md`](../side-effects/phase-1-plan.md) § 9 and § 9.1
**Source**: [`ROADMAP.md`](../../ROADMAP.md) § Phase 3
**Objective**: Ship a second publishable library that turns an expression plus a context
into an Angular `Signal`, re-evaluating only when something the expression actually read
has changed.

---

## 1. Current state of the code

### 1.1 What exists today

The library is **scaffolded but empty**. `8a264e5` ("chore: update dependencies and add new
package configurations") added the project; nothing has been written into it.

| Element | File | State |
| :--- | :--- | :--- |
| Nx project | `modules/eval-signals/project.json` | `name: eval-signals`, `tags: ["scope:signals"]`, `prefix: "lib"`, build/test/`nx-release-publish` targets |
| Entry point | `modules/eval-signals/src/index.ts` | **empty file** |
| Package manifest | `modules/eval-signals/package.json` | `@zvenigora/ng-eval-signals@0.0.1`; peers `@angular/common ^22.0.0`, `@angular/core ^22.0.0`; **no** peer on `ng-eval-core` |
| Path mapping | `tsconfig.base.json` | `"@zvenigora/ng-eval-signals": ["./modules/eval-signals/src/index.ts"]` — already present |
| Boundary rule | `eslint.config.mjs` (root) | `scope:signals` → `onlyDependOnLibsWithTags: ['scope:core', 'scope:signals']` — already present |
| Package README | `modules/eval-signals/README.md` | Nx generator placeholder, 7 lines |
| Test setup | `modules/eval-signals/src/test-setup.ts` | `setupZoneTestEnv` from `jest-preset-angular` — same as `eval-core` |

Baseline measured on this branch before any Phase 3 work (`phase3-signals`, clean tree):

| Target | Result |
| :--- | :--- |
| `npx nx run eval-signals:lint` | **fails** — 2 × `@nx/dependency-checks`: `@angular/common` and `@angular/core` "not used by eval-signals project" |
| `npx nx run eval-signals:test` | passes (`passWithNoTests`, 0 suites) |
| `npx nx run eval-signals:build:production` | **fails** — `Internal error: failed to get symbol for entrypoint` (empty `src/index.ts`) |
| `npx nx run eval-core:lint` | clean |
| `npx nx run eval-core:test` | 41 suites / **717 tests** green |

Two of the three targets are red *before* Phase 3 starts. That is not a defect to
investigate — both failures are "there is no code yet" — but it does mean **step 1 cannot
be a pure configuration step**: it has to ship a real exported symbol, or the build target
stays red and the plan has no green baseline to measure later steps against.

### 1.2 Findings that shape the design

1. **Angular already does dependency tracking, and it does it better than the read hook
   can.** A `computed()` tracks every signal read during the *synchronous* execution of its
   computation, at any call depth. `evaluate()` is a synchronous `walk.recursive`
   ("Sync vs. async" in CLAUDE.md), so an evaluation driven from inside a `computed()` runs
   entirely within that reactive context. If a context read resolves by *calling a signal*,
   Angular records the dependency itself — exactly, per key, with no path strings and no
   identity heuristics. This is the single most important finding in this document and § 3.1
   is built on it.

2. **It dissolves § 9.1's "must solve".** Phase 1 § 9.1 marks bare identifiers as the one
   read shape Phase 3 *must* engineer around: their `target` is `st.context`, and
   `EvalContext.fromContext` builds a fresh `EvalContext` per evaluation for a plain-object
   caller, so `(target, key)` is not a usable cross-run dependency key. Under finding 1 that
   problem does not arise — Phase 3 never keys a dependency on `(target, key)`, because it
   never computes the dependency set. The `EvalReadEvent` stream stays useful for
   *introspection* (§ 3.4) and as the fallback for non-signal contexts (§ 3.5), and both
   uses tolerate the limits § 9.1 records.

3. **`EvalContext.lookups` is a public, tested, lazy resolution hook.** `EvalContext.get`
   resolves `scopes` → `original` → `priorScopes` → `lookups`, and `lookups` is a plain
   array of `(key, thisArg?, options?) => unknown` reached through a public getter.
   `eval.service.lookup.spec.ts` registers one with `evalContext.lookups.push(lookup)` — so
   this is a supported extension point, not an internal reached around. A lookup runs **per
   read, at read time**, which is what tracking requires.

4. **The plain-object route is lazy in the default case and eager under
   `caseInsensitive`.** `getContextValue` reads `context[key]` for a plain object, so an
   accessor property (`Object.defineProperty(obj, k, { get })`) would also unwrap lazily.
   But `fromContext` (`internal/classes/common/context.ts:20`) copies a plain object into a
   `Registry` when `caseInsensitive` is set, and `Registry.fromObject` uses
   `Object.entries(object)` — which **invokes every getter** at `EvalContext` construction
   time. Under `caseInsensitive` an accessor-backed context would therefore read every
   signal on every state creation: every key becomes a dependency of the `computed()`,
   whether the expression names it or not, and values are computed that nothing asked for.
   This rules the accessor route out as the primary mechanism (§ 3.2).

5. **`get` treats `undefined` as "not found" and falls through.** A signal holding
   `undefined` resolves to `undefined` and `get` continues down the chain. This does **not**
   affect tracking — the lookup already called the signal, so the read is registered — but
   it does mean a signal-backed key bound to `undefined` cannot shadow a same-named key
   earlier in the resolution order. Documented, not worked around.

6. **A `computed()` may not write signals.** Angular throws (`NG0600`) on a signal write
   inside a reactive computation. The evaluator supports `AssignmentExpression` and
   `UpdateExpression`, so `createEvalSignal('count = count + 1', …)` would either throw at
   the signal boundary or silently write a plain property, depending on how the adapter
   handles writes. § 3.6 settles this: **the adapter's keys are read-only**, and an
   assignment to one throws with a message naming the library rather than surfacing an
   Angular error code from inside a `TypeError`.

7. **The one deferred read point is `arrow-function-expression.ts`.** CLAUDE.md records that
   `evaluate()` is re-entrant and the re-entry is *deferred*: an arrow function's body walks
   when the closure is called, which may be after the outer walk returned. Calls made
   *during* the walk (`list.map(x => x.n)`) are inside the reactive context and track
   normally. A closure that escapes the evaluation and is called later reads **outside** any
   reactive context, so those reads are not tracked and the signal will not recompute for
   them. This is a real limitation of the design, it is inherent to Angular's tracking model
   rather than to this library, and it is documented rather than engineered around.

8. **`evaluateAsync` cannot be a `computed()`.** It returns a `Promise`, and its awaiting
   happens after the synchronous walk — so any read that resolves through a promise is
   already outside the reactive turn. A synchronous `computed()` over an async evaluation
   would produce a `Signal<Promise<unknown>>`, which is not what a consumer wants. § 3.7
   scopes the async story to its own step and its own primitive.

9. **`CompilerService` already memoizes parsing.** `compile(expression)` caches by
   expression string with LRU + 10-minute TTL and returns a `stateCallback` that closes over
   the AST. Phase 3 compiles once per signal and calls the callback per recompute; it does
   not need a cache of its own, and it should not add one.

10. **`@nx/dependency-checks` is enabled for this project's `package.json`.** It is what
    makes the current lint red. Every package the source imports must appear in
    `package.json`, which means `@zvenigora/ng-eval-core` becomes a declared peer dependency
    the moment the first import lands. The rule is also the reason the manifest cannot list
    `@angular/common` speculatively.

11. **Root scripts and CI only run `eval-core`.** `npm run build|test|lint` are aliases for
    the three `eval-core` targets, and `.github/workflows/node.js.yml` runs `npm run build`
    and `npm test`. Until those become `nx run-many`, **CI will not build or test
    `eval-signals` at all** — every gate in § 6 would be local-only.

12. **The scaffold's Angular peer range is narrower than `eval-core`'s.**
    `eval-core` declares `@angular/core >=19.0.0`; the scaffold declares `^22.0.0`. Nothing
    in this design needs an API newer than `signal`/`computed`/`untracked`/`DestroyRef`
    (Angular 16) or `isSignal` (Angular 17), so the narrow range would exclude consumers the
    core library supports, for no benefit. Aligning it is a step-1 edit.

---

## 2. Scope

### In scope
- A signal-aware context adapter: a context whose reads resolve *through* signals, so an
  evaluation performed inside a reactive computation is tracked by Angular natively.
- `createEvalSignal()` — expression + context → `Signal`, compiled once, recomputed on
  dependency change.
- An escape hatch for contexts that are **not** signal-backed: explicit invalidation.
- Dependency introspection built on Phase 1's `createDependencyTracker()`, for debugging and
  for the non-signal case.
- Lifetime: unsubscription, `DestroyRef` integration, and a memory-leak spec mirroring
  `eval.service.memory-leaks.spec.ts`.
- Package metadata, README, worked example, CHANGELOG entry, root README cross-links.

### Out of scope (deliberately deferred)
- **Any change to `eval-core`.** Phase 1 shipped the contract this phase consumes, and § 3.1
  needs nothing further from it. **If a step turns out to require a core change, that is a
  signal to stop and revise this plan, not to widen the step** — see § 8, open question 3.
- **Async evaluation as a `Signal`** — finding 1.2.8. Scoped to step 5, which may conclude
  "defer to Phase 5" rather than ship a primitive.
- **Forms integration** (Phase 4), statements (Phase 2).
- **Writing back through the context** — § 3.6.
- **A signal-per-property deep adapter** for nested objects. `a.b.c` tracks at whichever
  level holds the signal; making every nested property individually reactive is a proxy
  design with its own equality and identity questions, and no consumer has asked for it.

---

## 3. Design

### 3.1 The reactivity model: Angular tracks, the tracker introspects

```
computed(() => {
  ┌─────────────────────────────────────────────────────────┐
  │ evalService.eval('a.b + c', state)   ← synchronous walk  │
  │   identifierVisitor → EvalContext.get('a')               │
  │     → lookups[0]('a') → source.a()   ← SIGNAL READ       │──▶ tracked by Angular
  │   memberExpressionVisitor → obj['b'] ← plain property    │
  └─────────────────────────────────────────────────────────┘
})
```

The whole design is that arrow. The evaluator is not made reactive; it is *run inside*
something reactive, and the only change is that a context read ends in a signal call.

Three consequences, all of which are the point:

- **Dependency granularity is per context key, exactly.** Reading `c` and not `d` subscribes
  to `c` and not `d`, because that is what the walk did. No path strings, no `target`
  identity, no cross-run key stability problem (finding 1.2.2).
- **Recomputation is Angular's, not ours.** Memoization, glitch-freedom, equality checks,
  and interop with `effect`/templates/`toObservable` come from `computed()`.
- **Phase 1's dependency tracker is no longer load-bearing for correctness.** It becomes a
  diagnostic (`dependencies`, § 3.4) and the driver of the non-signal fallback (§ 3.5).
  This is a demotion of the Phase 1 built-in relative to what § 9 anticipated, and it is
  worth stating plainly: § 9 was written before it was clear that the *walk* could be placed
  inside the reactive context. Nothing in Phase 1 is wasted — the read hook is what makes
  the introspection and the fallback possible — but the tracker is not the mechanism.

### 3.2 The context adapter — decided: a `lookups` resolver

`createSignalContext(source)` returns an `EvalContext` whose reads resolve through a
registered `EvalLookup` that unwraps signals:

```ts
// src/lib/signal-context.ts  (new, step 1)
export type SignalContextSource = Record<string, unknown>;   // values may be Signal<unknown>

export const createSignalContext = (
  source: SignalContextSource,
  options?: EvalOptions
): EvalContext => {
  const context = new EvalContext({}, options ?? {});
  context.lookups.push((key) => {
    const value = resolve(source, key, !!options?.caseInsensitive);
    return isSignal(value) ? value() : value;   // ← the read Angular records
  });
  return context;
};
```

**Why `lookups` and not the two alternatives.**

| Route | Lazy per read? | Correct under `caseInsensitive`? | Core change needed? | Verdict |
| :--- | :---: | :---: | :---: | :--- |
| `EvalContext.lookups` resolver | Yes | Yes — the adapter receives the raw key and does its own matching | No | **Chosen** |
| Accessor properties on a plain object | Yes by default, **no** under `caseInsensitive` | No — `Registry.fromObject`'s `Object.entries` reads every getter at construction (finding 1.2.4) | No | Rejected |
| Subclass `EvalContext`, override `get` | Yes | Yes | No, but relies on `get` being an extension point it was not designed as | Fallback only |

The chosen route also satisfies § 9.1's *other* advice for free: it hands the caller one
`EvalContext` constructed once per signal and reused across recomputes, which is the
"require an `EvalContext` be constructed once per signal" branch § 9.1 offers — so the read
events a consumer introspects have a stable `target` as a side effect of the design rather
than as extra machinery.

**Three properties of `lookups` that have to be accepted with it:**

- **Lookups run last.** A key present in `original` never reaches the resolver. The adapter
  therefore owns the whole context: `original` is `{}` and *everything* — signals and plain
  values alike — resolves through the lookup. A consumer mixing a pre-built `EvalContext`
  with signal keys must know that a name present in both resolves to the plain one. The
  adapter documents this and the spec pins it.
- **`getKey` does not consult lookups.** This is a known `eval-core` defect
  (`ROADMAP.md` § "Deferred defects"), and its consequence here is bounded: `EvalReadEvent.key`
  reports the source spelling rather than the corrected one for lookup-resolved keys under
  `caseInsensitive`. That degrades the *diagnostic* dependency set (§ 3.4) and nothing else —
  tracking is Angular's and does not read `key`. Recorded in the README's limitations, not
  fixed here (§ 2, out of scope).
- **`getThis` returns the lookup function** as the `this` argument for a lookup-resolved
  key. Pre-existing `eval-core` behaviour, and it means a *bare* context function called as
  `f()` sees the resolver as `this`. Methods called as `obj.m()` are unaffected — the member
  path supplies the object. Step 1 asserts the bare-call case so the behaviour is pinned
  rather than discovered.

#### 3.2.1 The nested-signal shape — dev-mode detection

**Settled here rather than in step 2** (it was § 8's first open question), because it
changes step 1's file list.

```ts
{ user: signal({ name: 'a' }) }     // tracks at `user` — the supported shape
{ user: { name: signal('a') } }     // tracks nothing, silently
```

The second shape resolves `user` to a plain object through the lookup, and the member hop
then reads `name` off it and gets **the signal function itself** — never called, never
tracked, and pushed as the expression's value. There is no error and no missing value a
consumer would notice: the signal simply never updates, and `'user.name'` renders as
`function computed(…)`. It is the most likely way a first attempt fails, and the failure
gives no clue where to look.

**Decision: `createSignalContext` scans one level into each plain-object value at
construction and reports any nested signal it finds, in dev mode only.**

- Construction-time, so the cost is paid once per signal rather than per read, and nothing
  is added to the read path — § 3.4's reason for keeping `trackDependencies` off by default
  applies here too.
- One level, because that is where the shape is a *mistake* rather than a choice: a signal
  three levels down in caller data the expression never names is not worth a warning.
- Detection, not correction. Unwrapping nested signals automatically would make
  `user.name` track — and would also mean the adapter silently rewrites the consumer's data
  shape, and that `typeof` checks inside an expression disagree with the source object.

**Known blind spots**, to be documented rather than chased: a signal inside an array, a
`Map`, or a class instance; a signal behind a getter (calling it to look would be a side
effect at construction time); and a signal that only appears in the source *after*
construction.

**How it reports — settled: `console.warn` behind `isDevMode()`.**

This needed a decision because CLAUDE.md bans `console.*` in library code. The carve-out is
now recorded there, worded narrowly enough that it licenses this case and not a habit.

The alternative was an optional `onDiagnostic?: (message: string) => void` on
`EvalSignalOptions`, silent when unset. It loses on the one criterion that matters here:
a consumer who writes `{ user: { name: signal('a') } }` **does not know the trap exists**,
so will not pass a callback. A diagnostic only the informed can receive is not a diagnostic
— it would be reachable by exactly the consumers who did not need it.

Throwing was the third option and is wrong on the merits: the shape is legal, and an
expression that never names the nested key is unaffected by it.

Two requirements on step 1's implementation:

- **`isDevMode()` from `@angular/core`, not `ngDevMode`.** `isDevMode` is public API and
  works under Jest without ambient declarations; `ngDevMode` is a build-time global that a
  library cannot rely on being defined in a consumer's toolchain.
- **The spec asserts the production path is silent**, not only that the dev path warns.
  Testing that dev mode warns leaves a warning that fires unconditionally — the more likely
  defect of the two — indistinguishable from a correct implementation.

### 3.3 `createEvalSignal` — the primary API

```ts
// src/lib/eval-signal.ts  (new, step 2)
export function createEvalSignal(
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalOptions
): EvalSignal<unknown>;

export interface EvalSignal<T> extends Signal<T> {
  /** Paths read on the last recompute; empty unless `trackDependencies` is set. */
  readonly dependencies: ReadonlySet<string>;
  /** Forces the next read to re-evaluate. For contexts that are not signal-backed. */
  invalidate(): void;
  /** Drops hook registrations and the compiled callback. Idempotent. */
  destroy(): void;
}

export interface EvalSignalOptions {
  /** Forwarded to eval-core (`caseInsensitive`, `hooks`, `onHookError`, …). */
  eval?: EvalOptions;
  /** `computed()` equality. Default `Object.is`. */
  equal?: ValueEqualityFn<unknown>;
  /** What the signal does when evaluation throws. Default `'throw'`. */
  onError?: 'throw' | 'undefined' | ((error: unknown) => unknown);
  /** Collect the read-hook dependency set on each recompute. Default `false`. */
  trackDependencies?: boolean;
  /** For use outside an injection context, like `toSignal`'s. */
  injector?: Injector;
}
```

Shape decisions, each with its reason:

- **`createEvalSignal`, not `evalSignal`.** The name is the one `ROADMAP.md` § Phase 3 uses,
  and `create*` matches the two Phase 1 built-ins (`createDependencyTracker`,
  `createTimingHook`) rather than Angular's bare-verb style.
- **`injector` option rather than mandatory injection context.** `computed()` itself needs
  no injection context; `inject(EvalService)` does, and `DestroyRef` integration (§ 3.8)
  does. Accepting an optional `Injector` is exactly `toSignal`'s contract, so the ergonomics
  are already familiar. An `EvalSignalService` (step 3) covers the DI-first style.
- **`onError` defaults to `'throw'`.** A `computed()` that throws caches the error and
  rethrows it on each read until a dependency changes — Angular's own behaviour, and the
  honest default. `'undefined'` and a mapper cover consumers rendering into a template where
  a throw is worse than a blank.
- **`equal` is passed straight to `computed()`.** An expression yielding an object literal
  (`'{ a: x }'`) produces a fresh object per recompute, so `Object.is` never dedupes and
  every downstream consumer re-runs. Consumers that care supply a structural comparator; the
  README says so rather than the library guessing.
- **`dependencies` is a plain getter, not a `Signal`.** Making it reactive would tempt a
  consumer to read it inside another `computed()`, subscribing to the *introspection* of a
  computation. It is a debugging surface; it reads what the last recompute recorded.

#### 3.3.1 One `EvalState` per recompute — decided

A signal recomputes hundreds of times over its life. **`EvalState` is not built to be reused
that many times**, and the reason is `EvalResult`:

| Per-run storage | Drained by | Behaviour across N recomputes on one state |
| :--- | :--- | :--- |
| `result.stack` | `evaluate`'s own `popVisitorResult` | Balanced — returns to empty |
| `result.trace` | **nothing** | Grows by one entry **per node, per run**, and each entry holds that node's `value` |
| `result._error` / `_errorMessage` | **nothing** | `setSuccess` does not clear them: one failed run leaves a stale error visible after every later success |
| hook bookkeeping | `resetHookBookkeeping()` | Fine — but it reaches none of the above |

The trace is the serious one, and it is a retention leak rather than only growth: every
intermediate value the expression ever produced stays reachable for the life of the state.

**What 0.3.0 offers.** Checked before choosing, per the amendment. There is no reset on
`EvalResult` — `_stack` and `_trace` are private with getters only, and
`resetHookBookkeeping()` is explicit that it covers errors, the open-node stack and timings,
nothing else. Two in-surface drains exist: `result.stack.clear()` (`EvalService.ngOnDestroy`
uses it) and truncating `result.trace`, which is writable only because `EvalTrace extends
Array` — mutability incidental to the base class, not an API for resetting. Neither clears
the stale error fields.

**Decision: build a fresh `EvalState` per recompute, through
`CompilerService.createState(context, options)`.** No `eval-core` change, so § 2 stands.

- `CompilerService` does not override `createState`, so it is `BaseEval.createState` →
  `EvalState.fromContext` — a state the services do not retain.
- The expensive, identity-bearing part is **not** rebuilt: `EvalContext.fromContext` returns
  the instance unchanged when handed an `EvalContext`, so the adapter built once in § 3.2 —
  with its lookup, its `priorScopes`, and its stable identity — is reused across every
  recompute. What is rebuilt is an `EvalResult`, a `Stack` and an `EvalTrace`: three
  allocations against a walk that was going to allocate per node anyway.
- Every one of the four rows above becomes empty-by-construction, including the two that no
  published method can clear.

**It must not be `EvalService.createState`.** That override adds each state to a private
`Set<EvalState>` that is strong and is drained only in `ngOnDestroy` — so routing a state
per recompute through it accumulates every state a signal ever had for the life of the root
singleton, which is the leak this decision exists to avoid, arriving by another door. This
**reverses** the constraint § 3.8 originally stated; § 3.8 now records the reversal and why
the service's tracking is an asset for one long-lived state and a liability for many
short-lived ones.

### 3.4 Dependency introspection (`trackDependencies`)

Off by default, and the default matters: turning it on registers a read hook, which per the
`eval-core` README's "Cost" note turns on key resolution and path reconstruction at every
read site for the whole walk. A consumer who does not read `dependencies` should not pay it.

When on, the signal installs a `createDependencyTracker()` on the state's `hooks` and
exposes the resulting set. Under § 3.3.1 each recompute has its own state and therefore its
own registry, so the tracker is installed per recompute and **no `reset()` is needed** — a
fresh registry cannot carry the previous run's reads.

**The registry the tracker goes on is always one this library owns.** A caller's `EvalHooks`
passed through `options.eval.hooks` is theirs, and it never receives the tracker. This is
Phase 1 § 3.6's rule resurfacing one layer up: options configure the registry a state owns,
never an adopted one, because installing into a consumer's registry leaves a hook firing on
every later evaluation they run through it, with an unsubscribe they were never handed.

**`EvalState` makes owning-and-adopting mutually exclusive, so the conflict is an error, not
a merge.** `EvalState`'s constructor calls `adoptHooks(options)` unconditionally and
*by reference*: pass `hooks` and `state.hooks` **is** the caller's object. There is no state
that has both the caller's registry and one of ours, so:

> `trackDependencies: true` together with `options.eval.hooks` **throws** — at
> `createEvalSignal` time, not at the first recompute, so it fails where it was written.

The error names both options and points at the escape hatch, which costs the consumer
nothing: install `createDependencyTracker()` on your own registry and read it yourself —
that is what the built-in is for, and it is the same tracker this library would have used.

Silently mutating the caller's registry is the outcome this rules out. It is worth being
explicit about why the alternative "register, then unsubscribe after the recompute" is also
rejected: the window is short but the registry is still theirs, and during it their
`onHookError` policy governs our tracker's errors — under `'throw'`, our diagnostic breaks
their evaluation.

Two limitations are inherited whole from Phase 1 and are documented rather than re-solved:

- computed members (`obj[expr]`) contribute nothing, having no reconstructible path;
- names collide — once `item` has been an arrow parameter anywhere in the expression, a
  genuine `item.x` elsewhere is dropped.

Plus the one this design adds: under `caseInsensitive`, lookup-resolved keys report their
*source* spelling (§ 3.2).

None of these affect what the signal recomputes on. They affect what it *reports* having
read, and the README says so in those words.

### 3.5 Contexts that are not signal-backed

The ROADMAP's second design question — "how context mutations become signal writes" — has a
two-part answer.

**Preferred: they are signal writes.** The consumer holds `signal()`s and puts them in the
source; mutation is `set`/`update`, and the recompute follows from § 3.1.

**Fallback: `invalidate()`.** For a plain object the consumer already owns and does not want
to convert, the signal carries a private version `signal(0)` read at the top of every
recompute; `invalidate()` bumps it. This is coarse by construction — it re-evaluates
regardless of *what* changed — and that is the honest trade for a context with no reactive
surface. `dependencies` (§ 3.4) is what a consumer uses to decide whether an invalidation
was warranted.

Explicitly **not** built: watching a plain object for mutation (proxies, dirty-checking,
`structuredClone` diffing). Each is a semantics decision the consumer is better placed to
make, and all three are expensive per recompute.

### 3.6 Writes and assignment — decided: read-only

The adapter's resolver has no write path. `AssignmentExpression` / `UpdateExpression`
against a lookup-resolved key currently falls through `setContextValue` to the empty
`original`, which would write a property nobody reads — a silent no-op, the worst of the
options.

**Decision: the adapter detects a write to a signal-backed key and throws** a library-owned
error naming the expression and the key. Reasons, in order:

1. Inside a `computed()` a successful signal write is illegal anyway (finding 1.2.6): the
   consumer would trade a clear library error for `NG0600`.
2. A write from inside a derivation is a design error in the consumer's code regardless of
   Angular — a derived value that mutates its own inputs does not have a stable value.
3. A silent no-op is undiagnosable; the current fall-through gives exactly that.

Step 2 owns this, because it is the step where an evaluation is first run inside a
`computed()` and therefore the first step where the failure is reachable.

### 3.7 Async — its own step, possibly its own phase

`createEvalSignalAsync` is **not** a `computed()` (finding 1.2.8). Two candidate shapes, to
be decided in step 5 with a spike rather than here:

| Shape | Fits Angular | Peer-dep cost | Note |
| :--- | :--- | :--- | :--- |
| `resource()` / `rxResource()` | Yes, idiomatic | `resource` is Angular **19+** and was experimental there | Would pin the peer range to the version the API stabilised in |
| `signal(undefined)` + an `effect` that runs `evalAsync` and `set`s | Yes | None beyond Angular 16 | Manual; needs its own staleness handling |

Two properties hold whichever wins, and they are what makes this a separate step rather than
a variation of step 2: reads inside an async evaluation resolve during the *synchronous*
walk, so tracking still works for the walk itself — but any read that only happens after an
`await` is untracked, and there is currently no such read in the evaluator (there is no
`await` point inside any visitor). If Phase 2 or a later change introduces one, this
conclusion changes.

Step 5 is allowed to conclude **"defer"**, recording the decision in this document and in
`ROADMAP.md`, and Phase 3 ships sync-only. That is a legitimate outcome, not a failure of
the step.

### 3.8 Lifetime and cleanup

Three things can outlive a signal and must not:

- **Hook registrations.** `trackDependencies` registers a read hook on a state. Under
  § 3.3.1 that registration dies with the state it was made on, one recompute later, so
  `destroy()` has nothing to unsubscribe in the normal case — it drops the tracker reference
  and the retained `dependencies` set. The unsubscribe is still taken and called, because
  "the state is unreachable" is a property of the current design rather than a guarantee,
  and an unsubscribe that is never needed costs a closure.
- **The `EvalState` and its context.** **This bullet reverses what revision 1 said**, on the
  evidence in § 3.3.1. It read: build states through `EvalService.createState` so that
  `ngOnDestroy` cleans them up. That is right for *one long-lived* state and wrong here.
  Under § 3.3.1 there is a state per recompute, and `EvalService`'s tracking `Set` is strong
  and drains only in `ngOnDestroy` — so the cleanup mechanism becomes the accumulator. The
  states this library builds are unreachable the moment their recompute returns, and need no
  cleanup: **build them through `CompilerService.createState`** (untracked, inherited from
  `BaseEval`). What is long-lived is the `EvalContext` from § 3.2, and this library owns and
  drops that itself.
- **The `computed()` itself.** A `computed` holds its producers; when the source signals
  outlive the consumer, dropping the reference is the whole of the cleanup. `destroy()` is
  therefore mostly about the first two, and `DestroyRef` (when an injector is available)
  calls it automatically.

Step 4 owns this and mirrors `eval.service.memory-leaks.spec.ts`, which is the existing
pattern for asserting it.

---

## 4. Work breakdown

Each step is one commit and one PR, leaves both projects green, and is executed in its own
session (CLAUDE.md, "Working from a plan").

### Step 0 — Put `eval-signals` in front of CI, and nothing else

Finding 1.2.11: CI runs `npm run build` and `npm test`, both aliases for `eval-core` targets,
so the workflow is blind to `eval-signals` today. Landing that fix on its own means a
workflow failure afterwards is unambiguously the script change and not the first real code.

- **Edit**: root `package.json` — `test` becomes `nx run-many -t test`.
- **Edit**: `.claude/skills/step/SKILL.md` — § 4's "all must be clean" gets the same
  until-step-1 exception § 1 already carries, so the per-step procedure stops contradicting
  the § 1.1 baseline it is measured against.
- **Exit**: the GitHub workflow passes, having run both projects' `test` targets, and the
  step leaves every root script green.

**Only `test` moves here, and the other two are held back for the same reason.**
`eval-signals:build:production` and `eval-signals:lint` both fail today (§ 1.1 — empty
entry point, and two `@nx/dependency-checks` errors), so flipping either script in this step
would leave it red until step 1 lands. For `build` that would turn the workflow red on
`master` and the step's own exit criterion could not be met; for `lint` the workflow is
indifferent — CI runs `npm run build --if-present` and `npm test`, not `npm run lint` — but
it would still land a knowingly-red root script, which CLAUDE.md's Git section forbids
committing on. Step 1 flips both, in the same step that gives the entry point something to
export and puts the real peers in the manifest.

That costs this step nothing. Its objective is CI coverage of `eval-signals`, and the `test`
flip achieves all of it: `test` is the only one of the three that CI runs *and* that can
already pass on both projects. `run-many` is proven in CI here, on that target, and the
scripts converge in step 1.

### Step 1 — Package skeleton and the signal-aware context

- **Edit**: `modules/eval-signals/package.json` — peers `@angular/core >=19.0.0` (finding
  1.2.12) and `@zvenigora/ng-eval-core ^0.3.0`; drop `@angular/common` unless the source
  actually imports it (finding 1.2.10 will fail lint either way round if this is guessed);
  add `description` / `keywords` / `author` / `license` / `homepage` / `repository` matching
  `eval-core`'s manifest.
- **Edit**: `modules/eval-signals/project.json` — `prefix: "zvenigora"`, and
  `modules/eval-signals/eslint.config.mjs` selector prefixes to match. Cosmetic today (this
  library ships no components), and free now.
- **New**: `modules/eval-signals/src/public-api.ts` — the barrel, mirroring `eval-core`'s
  `src/index.ts` → `public-api.ts` shape.
- **Edit**: `modules/eval-signals/src/index.ts` — `export * from './public-api';`
- **New**: `modules/eval-signals/src/lib/signal-context.ts` — `createSignalContext`,
  `SignalContextSource` (§ 3.2).
- **New**: `modules/eval-signals/src/lib/nested-signal-check.ts` — the one-level
  construction-time scan of § 3.2.1, reporting via `console.warn` behind `isDevMode()`.
  Co-located with `signal-context.ts` rather than inlined, so the scan is unit-testable
  without building a context.
- **New**: `modules/eval-signals/src/lib/signal-context.spec.ts` and
  `nested-signal-check.spec.ts` — test-first.
- **Edit**: root `package.json` — `build` and `lint` become `nx run-many -t build` /
  `nx run-many -t lint`, the two flips step 0 deferred until the entry point and the
  manifest could satisfy them. All three root scripts are `run-many` from here on.
  **Note that `build` stops naming a configuration.** It was
  `nx run eval-core:build:production`; `nx run-many -t build` runs each project's
  *default* configuration instead. Both `project.json`s currently set
  `defaultConfiguration: "production"`, so the behaviour is unchanged — but that is now a
  coincidence the root script depends on rather than intent it states. A project added
  later without that key, or one that changes it, silently downgrades what CI builds.
  Accepted for now because `run-many` cannot take a per-project configuration; the fix if
  it ever bites is to make the default explicit in each `project.json`, not to unwind the
  `run-many`.
- **Edit**: `modules/eval-signals/README.md` — replace the generator placeholder with a
  minimal real one; the full README is step 6.
- **Exit**:
  - `eval-signals` **lint, test and build:production all green** — all three, since two are
    red at baseline (§ 1.1);
  - `eval-core` untouched: 41 suites / 717 tests, lint clean;
  - a spec proves an evaluation run inside `computed()` over a signal-backed context
    **recomputes when a signal the expression read changes**, and — the load-bearing half —
    **does not recompute when a signal it did not read changes**. Break the unwrap
    (`return value` instead of `value()`) and confirm the first assertion fails; without
    that probe the test passes on a context that is not reactive at all.
  - the `getThis` bare-call behaviour of § 3.2 is pinned by an assertion, whatever it turns
    out to be;
  - the nested-signal scan (§ 3.2.1) reports `{ user: { name: signal('a') } }` and stays
    silent for `{ user: signal({ name: 'a' }) }`, for a signal at the top level, and for a
    plain nested object. Assert on a captured `console.warn`, not on "does not throw" — the
    silent cases are the ones that go vacuous, since a scan that never reports anything
    passes three of those four;
  - **and it is silent when `isDevMode()` is false**, asserted by stubbing it — otherwise a
    warning that fires unconditionally passes the whole set above.

### Step 2 — `createEvalSignal`

- **New**: `src/lib/eval-signal.ts` — the factory, `EvalSignal`, `EvalSignalOptions` (§ 3.3).
  Compiles once through `CompilerService.compile` (finding 1.2.9); builds a **fresh state per
  recompute** through `CompilerService.createState` (§ 3.3.1, § 3.8); `computed()` calls
  `CompilerService.call`.
- **New**: `src/lib/eval-signal.spec.ts` — test-first. Recompute on change; **no** recompute
  when an unread signal changes; **no** recompute on a second read with nothing changed
  (memoization); `compile` called once across N recomputes; a distinct state per recompute
  (§ 3.3.1) — assert it directly here, since step 4 asserts only its consequence; `equal`
  honoured; each `onError` mode.
- **Edit**: `src/public-api.ts` — export the factory and its types.
- **Also in this step**: the read-only write policy of § 3.6, with its own spec case — this
  is the first step where an evaluation runs inside a `computed()`, so it is the first step
  where the failure is reachable.
- **Exit**: the above spec green; a signal built over a 3-key context and an expression
  naming 1 key recomputes for that key alone.

### Step 3 — DI surface and the non-signal fallback

- **New**: `src/lib/eval-signal.service.ts` — `EvalSignalService`, `providedIn: 'root'`,
  injecting `EvalService` / `CompilerService` and exposing `create(...)` for the DI-first
  style. The free function keeps working outside an injection context via
  `options.injector`.
- **Edit**: `src/lib/eval-signal.ts` — `invalidate()` and the private version signal (§ 3.5);
  `trackDependencies` and the `dependencies` getter (§ 3.4).
- **New / Edit**: specs — `invalidate()` forces exactly one recompute and no more;
  `dependencies` matches the keys the expression names; `trackDependencies: false` registers
  **no** read hook (assert on `state.hasHooks` / the absence of read dispatch, not on an
  empty set — an empty set is what a registered-but-unread tracker also returns).
- **New spec case — the registry-ownership rule of § 3.4**, three assertions:
  `trackDependencies: true` plus `options.eval.hooks` **throws at `createEvalSignal`**, with
  a message naming both options; either one alone does not throw; and after the throw the
  caller's registry has **no** read hook (`hooks.hasReadHooks === false`) — the assertion
  that actually pins "never silently mutate a consumer-owned registry", which the throw
  alone does not.
- **Exit**: both styles (free function and service) covered; the default path provably
  registers no read hook; a consumer-supplied registry provably comes back untouched.

### Step 4 — Lifetime and cleanup

- **Edit**: `src/lib/eval-signal.ts` — `destroy()`; `DestroyRef` registration when an
  injector is available (§ 3.8).
- **New**: `src/lib/eval-signal.memory.spec.ts` — mirroring
  `eval-core`'s `eval.service.memory-leaks.spec.ts`: after `destroy()`, the read hook is
  unregistered, hook bookkeeping is reset, and a destroyed signal does not re-evaluate.
- **New spec case — nothing accumulates across recomputes** (§ 3.3.1). Recompute N times
  and assert that no state's `result.trace` holds more than one walk's worth of entries.
  Reach the states through a read hook's `event.state` under `trackDependencies: true`, and
  assert the same run yields **N distinct** states. Both halves are needed: the trace bound
  alone would also pass on a reused state whose trace someone truncates, and the distinctness
  alone says nothing about growth.
- **Exit**: destroying a signal releases its hook registration; `destroy()` is idempotent;
  N recomputes leave N short-lived states, none of them retained and none of them grown.

### Step 5 — Async (or a recorded deferral)

- Spike the two shapes in § 3.7, decide, and **write the decision into this document before
  writing code** (CLAUDE.md: plan changes are written into the plan first).
- If shipped: `createEvalSignalAsync` + spec + public-api export.
- If deferred: § 3.7 records why, `ROADMAP.md` gains the entry, and this step's commit is
  documentation only.
- **Exit**: either the primitive with tests, or the deferral recorded in both documents.

### Step 6 — Docs, example, and release

- **New**: `modules/eval-signals/README.md` (full) — following the `eval-core` README's
  structure; a worked example; a limitations section carrying, in the consumer's words: the
  deferred-arrow-call gap (finding 1.2.7), the `caseInsensitive` key-spelling limit (§ 3.2),
  the `dependencies` limits (§ 3.4), and the read-only write policy (§ 3.6).
- **Edit**: root `README.md` § "Related Packages" — add the new library.
- **Edit**: `CHANGELOG.md` — a `0.1.0` entry for `@zvenigora/ng-eval-signals`.
- **Edit**: `ROADMAP.md` — Phase 3 marked done, pointing here; § "Suggested order" updated.
- **Edit**: `modules/eval-signals/package.json` — version to `0.1.0`.
- **Decide**: whether `eval-signals`' `project.json` `release` block (absent on `eval-core`)
  is what the workspace wants, or whether the two should match. Publishing is out of this
  plan's scope, but an inconsistency discovered at release time is worse than one settled
  here.
- **Exit**: `npx nx run-many -t lint test build` green across both projects; every symbol the
  new README imports is exported from the package (checked by hand — the automated version
  of this check is the deferred tooling item in `ROADMAP.md`).

---

## 5. Public API surface added

```ts
// from @zvenigora/ng-eval-signals
export { createSignalContext, type SignalContextSource,
         createEvalSignal, type EvalSignal, type EvalSignalOptions,
         EvalSignalService };
// + createEvalSignalAsync, pending step 5
```

Nothing is added to `@zvenigora/ng-eval-core`. Its 0.3.0 surface is consumed as published:
`CompilerService` (`compile`, `createState`, `call`), `EvalContext`, `EvalOptions`,
`EvalState`, `EvalHooks`, `createDependencyTracker`, and the `EvalReadEvent` types.

`EvalService` is deliberately **not** on that list after § 3.3.1: this library compiles and
calls, and the one thing it wanted `EvalService` for — `createState` with `ngOnDestroy`
cleanup — is the thing § 3.8 now rejects. If step 2 finds it needs `EvalService` after all,
that is a signal to re-read § 3.3.1 rather than to add the import quietly.

**This section governs what `src/lib/` imports, not what specs import.** Recorded in step 1,
where the distinction first bites: step 1's reactivity spec drives the walk through
`EvalService.simpleEval` because `createEvalSignal` does not exist yet, and § 3.1's own
diagram is written in those terms. A spec exercising the integration § 3.1 describes puts
nothing in the published surface — `dist/`'s `.d.ts` and `package.json` peers are what this
section constrains. Step 2 should not re-litigate this: the rule to enforce is "no
`EvalService` import under `src/lib/`", and the lint gate that would catch a violation is
`@nx/dependency-checks` on the manifest, which specs do not affect.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Lint (new) | `npx nx run eval-signals:lint` | 0 errors — **red at baseline**, green from step 1 |
| Tests (new) | `npx nx run eval-signals:test` | Green; ≥1 suite from step 1 |
| Build (new) | `npx nx run eval-signals:build:production` | Clean → `dist/modules/eval-signals` — **red at baseline** |
| Lint (core) | `npx nx run eval-core:lint` | Unchanged, clean |
| Tests (core) | `npx nx run eval-core:test` | Unchanged: 41 suites / 717 tests |
| Perf (core) | `internal/performance.spec.ts` | Unchanged — this plan adds nothing to a per-node path |
| Boundaries | covered by `eval-signals:lint` | `scope:signals` → `scope:core` allowed; the reverse rejected |

Run **all** of these after every step, not just the new project's. The `eval-core` rows are
what catch a step that quietly reached into core against § 2.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
| :--- | :---: | :--- |
| Tracking silently does not work — the spec passes because the assertion would pass without reactivity | **High** | Step 1's exit criteria require the negative case (an unread signal changing does **not** recompute) and a break-the-implementation probe. This is the single most likely way this phase ships something that looks finished and is not |
| `lookups` running last surprises a consumer who also populates `original` | Medium | The adapter owns the whole context; documented in § 3.2, asserted in step 1 |
| A consumer's expression calls a closure after the evaluation returns and expects tracking (finding 1.2.7) | Medium | Documented as a limitation in step 6's README; inherent to Angular's model |
| `resource()` pins the peer range above `>=19` (§ 3.7) | Medium | Step 5 may defer; the sync API carries no such constraint |
| `@nx/dependency-checks` fails on a transitive `acorn` type leaking through `EvalState` into the emitted `.d.ts` | Medium | Surfaces at step 1's build gate; resolve by declaring the peer, not by loosening the rule |
| CI keeps passing while `eval-signals` is broken | Medium | Root scripts move to `run-many` in **step 0** — before any code lands, so a workflow failure afterwards is the script change and nothing else |
| A reused `EvalState` accumulates trace entries across recomputes, retaining every intermediate value | **High if not designed for** | § 3.3.1: a fresh state per recompute, through the untracked `CompilerService.createState`. Step 4 asserts both halves — N distinct states, none grown |
| The tracker is installed on a registry the consumer owns | Medium | § 3.4: the combination throws at construction; step 3 asserts the caller's registry comes back with no read hook |
| Scope creep into `eval-core` | Medium | § 2 makes it a stop-and-replan condition; the § 6 core rows detect it |

---

## 8. Open questions

1. ~~**Does `createSignalContext` accept nested signals?**~~ **Settled in § 3.2.1** — a
   one-level, construction-time scan that reports the shape rather than correcting it, via
   `console.warn` behind `isDevMode()`. Nothing outstanding: the CLAUDE.md carve-out that
   licenses the `console.warn` is recorded in that file's Conventions section.
2. **Should `dependencies` include non-signal keys?** They are read but can never invalidate.
   Reporting them is honest about what the expression touched; omitting them is honest about
   what the signal depends on. Decide in step 3, and say which in the README.
3. **Does anything here justify fixing `EvalContext.getKey`?** (`ROADMAP.md` deferred
   defect.) On this design, **no** — see § 3.2's second bullet; it degrades a diagnostic and
   nothing else. Recorded so that the question is answered rather than rediscovered.
4. **`EvalSignalService` vs. free function — is the service earning its place?** It exists
   for the DI-first style and to avoid `options.injector` boilerplate. If step 3 finds it is
   a one-line pass-through with no state, say so and drop it rather than shipping a wrapper.

---

## 9. Downstream contract for Phase 4

What `@zvenigora/ng-eval-forms` can rely on after this lands:

1. `createEvalSignal(expr, source)` gives a `Signal` that recomputes exactly when a
   signal-backed context key the expression read changes — which is what a per-field
   `visible` / `text` / `disabled` property is.
2. Contexts are cheap to compose: a field's context is the form's source plus that field's
   own keys, and `createSignalContext` takes a plain record.
3. `destroy()` is the whole of a field's teardown; a form destroying its fields does not
   need to reach into `eval-core` state.
4. **Not** provided: writing back through an expression (§ 3.6). A form binding that assigns
   to a control does it through the form API, not through the evaluator.
