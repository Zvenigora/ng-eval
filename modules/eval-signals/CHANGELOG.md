# Changelog — `@zvenigora/ng-eval-signals`

All notable changes to `@zvenigora/ng-eval-signals` are documented in this file. The other two packages in this repository keep their own, listed in the [root changelog](../../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.3] - 2026-09-26

Released because `eval-core` 0.6.0 falls outside 0.1.2's declared peer range, so installing it
beside 0.1.2 raises a peer-dependency conflict. Two JSDoc corrections that ship in the `.d.ts`
ride with the range. No exported symbol's shape and no behaviour of this package changes.

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.6.0:
  `>=0.3.0 <0.6.0` → `>=0.3.0 <0.7.0`. The lower bound is unchanged, so 0.3.0 to 0.5.0 remain
  supported. The README's peer-dependency line now states the new range. It had said
  `>=0.3.0 <0.5.0` since 0.1.1, because 0.1.2 widened the manifest and not the README.
- **The JSDoc on `createEvalSignal` and on `EvalSignalService` now describes `eval-core` 0.6.0.**
  Both ship in this package's `.d.ts`. Documentation only.
  - `createEvalSignal` said `EvalResult.trace` "is drained by nothing". `eval-core` 0.6.0 adds
    `EvalResult.clearTrace()`, so it now says the trace is drained by nothing *this library
    calls*, and that `clearTrace()` is opt-in and uncalled here. A fresh `EvalState` per
    recompute is still what bounds the trace, and the factory is unchanged.
  - `EvalSignalService` said `EvalService` "tracks every state it builds in a strong `Set`
    drained only on destroy". `eval-core` 0.6.0 removes that set
    ([A8](../../docs/backlog-retired.md#a8)). It now says `EvalService` kept its states until destroy up to
    0.5.0 and keeps none from 0.6.0, and that what the factory needs is compile-once, which is
    `CompilerService`.

---

## [0.1.2] - 2026-09-17

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.5.0:
  `>=0.3.0 <0.5.0` → `>=0.3.0 <0.6.0`. Manifest only — no code, no exported symbol and no
  behaviour of this package changes. The lower bound is unchanged, so 0.3.0 and 0.4.0 remain
  supported.

---

## [0.1.1] - 2026-09-16

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.4.0:
  `"@zvenigora/ng-eval-core": "^0.3.0"` → `">=0.3.0 <0.5.0"`. `^0.3.0` resolves to
  `>=0.3.0 <0.4.0`, so installing `eval-core` 0.4.0 beside `eval-signals` 0.1.0 raised a
  peer-dependency conflict. **0.3.0 remains supported** — the range widens rather than moves, so no
  working installation stops working.

Nothing else changed: no source file, no export, no behaviour. This library works against both
`eval-core` 0.3.0 and 0.4.0, and its suite runs against both. The two `eval-core` 0.4.0 changes that
reach it are described under that release — A9's scope-pop repair, and the write relaxation, which
makes `(x => (x = 5))(1)` return `5` instead of throwing `SignalContextWriteError`. **Both are
`eval-core` behaviour, visible through this library rather than changed by it**, which is why this
is a patch.

The depth-mark unwind at this library's recompute boundary is **retained**, for two reasons the
release does not retire: the widened range still admits the leaking `eval-core` 0.3.0, and
`EvalContext.push` / `pop` are public methods on a published class, so a scope can be stranded with
no visitor involved at all. The second reason holds at any peer range.

---

## [0.1.0] - 2026-08-15

Phase 3 of the [roadmap](../../ROADMAP.md): the first release of `@zvenigora/ng-eval-signals`, which turns an expression plus a context of signals into an Angular `Signal`. Design and rationale in `docs/signals/phase-3-plan.md`; consumer documentation in the [package README](README.md). Requires `@angular/core >=19` and `@zvenigora/ng-eval-core ^0.3.0`.

### Added
- **`createEvalSignal(expression, source, options?)`**: The primary API. Compiles the expression once and returns an `EvalSignal` that recomputes when a signal-backed key the expression **read** changes — `shipping.set(0)` does not recompute `'price * quantity'`. The tracking is Angular's own rather than this library's: the walk is synchronous and a context read ends in a signal call, so running it inside a `computed()` records the dependency natively, per key. Each recompute gets a fresh `EvalState` while the `EvalContext` is built once and reused, which is what makes per-key tracking possible.
- **`createSignalContext(source, options?)`**: The context adapter on its own, for callers driving `EvalService` directly. Builds an `EvalContext` whose reads resolve through signals via a `lookups` resolver. Warns in dev mode about one-level nested signals (`{ user: { name: signal('a') } }`), a shape that tracks nothing.
- **`EvalSignalService`**: The DI-first entry point, for callers outside an injection context where the free function would throw `NG0203`. It supplies an injector and forwards everything else unchanged.
- **`EvalSignal.dependencies`**: Behind `trackDependencies`, the dotted paths the last recompute read, built on `eval-core` 0.3.0's `createDependencyTracker()`. A plain getter rather than a signal, so reading it neither triggers a recompute nor subscribes to one. Off by default because a registered read hook costs key resolution at every read site. Combining it with your own `eval.hooks` registry throws at construction rather than installing a hook into a registry the library does not own.
- **`EvalSignal.invalidate()`**: The escape hatch for a source with no reactive surface. Coarse by design and collapsing — three calls between two reads produce one recompute.
- **`EvalSignal.destroy()`**: Drops the compiled callback, the context and the recorded dependencies, and releases the `DestroyRef` registration. Idempotent; a destroyed signal reads `undefined` from that moment rather than from the next dependency change, and `invalidate()` afterwards is a no-op. Auto-teardown comes from the **ambient** injection context only: `options.injector` — which `EvalSignalService.create` always supplies — resolves services and does not scope lifetime, so those signals must be destroyed by hand.
- **`EvalSignalOptions`**: `eval` (forwarded to both the context and the walk, so `caseInsensitive` is set once), `equal`, `onError` (`'throw'` | `'undefined'` | mapper), `trackDependencies`, `injector`.
- **`SignalContextWriteError`**: The keys of a signal context are read-only; an assignment throws this, naming the key and the expression. It bypasses `onError` in every mode — an illegal assignment is a static property of the expression, not a runtime failure to render around.

### Notes
- **No async primitive.** An expression that calls an async function yields a signal carrying the **promise**, which composes with `resource({ params: () => sig(), loader: ({ params }) => params })` — the read must go in `params`, since a loader body runs untracked. `createEvalSignalAsync` is deferred to Phase 5; see the roadmap and the README's limitations.
- **Known limits**, all documented in the README: closures that escape an evaluation are not tracked, a member write (`user.name = 'x'`) bypasses the read-only policy, `SignalContextWriteError.key` is `undefined` under `caseInsensitive`, and nested signals are tracked only at the level that holds the signal.
- Nothing was added to `@zvenigora/ng-eval-core`, which is consumed at its published 0.3.0 surface.
