# Changelog — `@zvenigora/ng-eval-signals`

All notable changes to `@zvenigora/ng-eval-signals` are documented in this file. The other two packages in this repository keep their own, listed in the [root changelog](../../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.4.0] - 2026-10-04

**A built-in method that would write into what the expression was given is refused —
[C4](../../docs/backlog-retired.md#c4).** A breaking minor: such a call throws where it used to
mutate the caller's data, and `SignalContextWriteError.kind` widens to `'method'`. The `eval-core`
floor rises to 0.11.0, which asks about the call. The `.d.ts` differs from 0.3.0 in `kind`'s type
and the constructor's `kind` parameter, both widened, and in documentation comments.

### Breaking
- **A built-in method that would write into anything the expression did not create throws
  `SignalContextWriteError` — [C4](../../docs/backlog-retired.md#c4).** `user.tags.push("x")`,
  `user.tags.sort()`, `splice`, `reverse`, `fill` and the rest of `Array`'s mutators, the typed
  arrays' own, `Map#set`, `Set#add` and their removers, a `Date`'s setters, and `Object.assign`
  with `Object`'s other mutators each mutated `user()` from inside a `computed()`, and now throw,
  in every `onError` mode. What the expression created is still writable, as for a member write:
  `[...user.tags].sort()` and `let t = [...user.tags]; t.push("x"); t` work. Needs `eval-core`
  0.11.0, which asks about the call.
- **`SignalContextWriteError.kind` is `'key' | 'member' | 'method'`**, so a `switch` over it that
  was exhaustive is not any more.

### Added
- **`kind` `'method'`**, with `key` naming the method as `eval-core` does,
  `'Array.prototype.push'`, and a message that names it and what to use instead: `toSorted`,
  `toReversed`, `toSpliced`, `with`, or a spread into a literal. `Cannot call
  Array.prototype.sort in expression 'user.tags.sort()': a signal expression may write only into
  objects it created. Use toSorted instead, which returns a sorted copy.`
- **Still not caught**, and documented in the README under "Writes are not supported": `test` and
  `exec` on a regex you supplied, which advance its `lastIndex`; a method you wrote; and a
  built-in reached through `call`, `apply` or `bind` ([C5](../../docs/backlog.md#c5)).

### Changed
- **Peer range `@zvenigora/ng-eval-core` `>=0.11.0 <0.12.0`**, from `>=0.10.0 <0.11.0`: 0.10.x
  never asks about a method call, so under it the guard above would not run.

---

## [0.3.0] - 2026-10-04

**A signal expression may write into what it created, and not into anything it was given —
[C1](../../docs/backlog-retired.md#c1).** A breaking minor: an expression that wrote a member of a
signal value now throws, and the `eval-core` floor rises to 0.10.0, which the guard needs.

### Breaking
- **A member write into anything the expression did not create throws
  `SignalContextWriteError`.** `user.name = "Bob"`, `user.n++`, `let u = user; u.name = "Bob"`
  and `[user].map(u => (u.name = "Bob"))` each wrote into the object `user()` holds, from inside a
  `computed()`. Each now throws and writes nothing, with `kind` `'member'`, `key` the property
  name, and the message `Cannot assign to member 'name' in expression '…': a signal expression
  may write only into objects it created.` It bypasses `onError` in every mode, as a key write
  does. What the expression created stays writable — object, array and regex literals, rest
  values, arrow functions — so `let o = {}; o.a = 1` works, and so does writing into
  `{ ...user }`. A call's result counts as given even when it is new: spread it into a literal
  first. The guard is the context's, so it holds for `createSignalContext` used standalone too.
- **Peer range: `@zvenigora/ng-eval-core` `>=0.3.0 <0.10.0` → `>=0.10.0 <0.11.0`.** The guard
  needs `EvalContext.checkMemberWrite`; on an older `eval-core` nothing would ask the context, and
  member writes would land silently. The README's peer-dependency line states the new range.

### Added
- **`SignalContextWriteError.kind`**, `'key'` or `'member'`: which rule refused the write. It is
  an optional fourth constructor parameter defaulting to `'key'`, so every existing construction
  is unchanged.

### Known limitation
- **A mutating method is not caught** — [C4](../../docs/backlog-retired.md#c4). `user.tags.push("x")`,
  `splice`, `sort`, `Map#set` and their kin write from native code, so no member write is made
  and the guard is never asked: the call mutates `user()`. Documented in the README, under
  "Writes are not supported".

---

## [0.2.1] - 2026-10-03

Released because `eval-core` 0.9.0 falls outside 0.2.0's declared peer range. No code in this
package changes.

### Changed
- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.9.0:
  `>=0.3.0 <0.9.0` → `>=0.3.0 <0.10.0`. The lower bound is unchanged. The README's
  peer-dependency line states the new range.
- **With `eval-core` 0.9.0, an expression that reads `constructor`, `__proto__`, `prototype` or
  one of the four accessor definers off a string, number or boolean is refused** — over a
  signal holding `'abc'`, `name.constructor` now throws where it returned `String`. Nothing in
  this package reads one of those names off a primitive, so its own behaviour is unchanged.

---

## [0.2.0] - 2026-10-02

**Under `caseInsensitive`, a source key is named as the source spells it —
[C3](../../docs/backlog-retired.md#c3).** A breaking minor: no exported symbol changes shape, but
`EvalSignal.dependencies` and `SignalContextWriteError.key` report different strings. The peer
range widens to admit `eval-core` 0.8.0.

### Breaking
- **`dependencies` spells a path's first segment as the source does.**
  `createEvalSignal('COUNT + 1', { count }, { eval: { caseInsensitive: true }, trackDependencies: true })`
  reports `count`, where it reported `COUNT`. Only the first segment — the key of the context —
  is respelled; later segments are property names inside a value and stay as written, so
  `'user.NAME'` reports `user.NAME`. Without `caseInsensitive` nothing changes.
- **A write error names the source's key.** Under `caseInsensitive`, `COUNT = 5` over
  `{ count }` throws `SignalContextWriteError` with `key` `'count'` and a message naming
  `'count'`. 0.1.x named `'undefined'`; `eval-core` 0.8.0 under 0.1.x would name `'COUNT'`.
- **`getKey` on a `createSignalContext` context answers a source key with the source's
  spelling**, under `caseInsensitive`. A pushed scope still shadows the source, and a prior scope
  or a lookup you add keeps `eval-core`'s answer — which on `eval-core` 0.7.x and older is still
  that version's.

### Changed
- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.8.0:
  `>=0.3.0 <0.8.0` → `>=0.3.0 <0.9.0`. The lower bound is unchanged, so 0.3.0 to 0.7.0 remain
  supported, and the three changes above do not depend on 0.8.0: they rest on `get`'s resolution
  order and the dependency tracker's `reads`, both unchanged since 0.3.0. The README's
  peer-dependency line states the new range.
- `EvalSignal.dependencies` and `SignalContextWriteError.key` document the above, and the
  README's `trackDependencies` section says what is reported under `caseInsensitive`.

---

## [0.1.4] - 2026-10-01

Released because `eval-core` 0.7.0 falls outside 0.1.3's declared peer range. No exported
symbol's shape changes, and no code in this package behaves differently; what `eval-core` 0.7.0
changes reaches through it as described below.

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.7.0:
  `>=0.3.0 <0.7.0` → `>=0.3.0 <0.8.0`. The lower bound is unchanged, so 0.3.0 to 0.6.1 remain
  supported — which is also why `createEvalSignal` still calls the free `call` and still unwinds
  a stranded scope itself. The README's peer-dependency line now states the new range.
- **With `eval-core` 0.7.0, `this.fn()` over a `createSignalContext` context receives the
  context.** Every source key is resolved by the context's lookup, and `EvalContext.getThis` used
  to report that lookup function as the receiver; it now answers `undefined` for a lookup-resolved
  key, so the call falls back to the context, as a bare `fn()` already did.
  [A7](../../docs/backlog-retired.md#a7).
- **With `eval-core` 0.7.0, a write nested inside a call bypasses `onError`.**
  `[1].map(x => (country = 'CA'))` reaches `createEvalSignal` as `SignalContextWriteError` and is
  rethrown in every mode, like a direct assignment. It used to arrive as a plain `Error` and be
  routed by `onError`. [A6](../../docs/backlog-retired.md#a6).
- **Built with Angular 22.1 or later.** The `.d.ts` declares `EvalSignalService.ɵprov` as
  `ɵɵInjectableDeclaration<any>`, where 0.1.3, built with Angular 22.0, declared it with the
  service's own type. This is Angular's generated injection metadata, not this package's API, and
  that one line is the whole `.d.ts` difference from 0.1.3.
- **`LICENSE` and `CHANGELOG.md` ship in the package** for the first time.

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
