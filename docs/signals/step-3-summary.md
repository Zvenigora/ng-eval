# Phase 3 — Step 3 Summary: DI surface and the non-signal fallback

**Date**: August 14, 2026
**Plan**: [`phase-3-plan.md`](./phase-3-plan.md) § 4, Step 3
**Target package**: `@zvenigora/ng-eval-signals` (`modules/eval-signals`, v0.0.1)
**Commit**: `a6b18e8`
**Status**: complete — lint clean, `eval-signals` 4 suites / 83 tests, `eval-core` unchanged
at 41 suites / 717 tests, production build clean

---

## 1. What was built

Three things the factory deliberately withheld in step 2, plus the DI-first entry point.
Nothing in `eval-core` was touched, and nothing under `src/lib/` imports `EvalService`.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `src/lib/eval-signal.service.ts` | **new** | `EvalSignalService`, `providedIn: 'root'`, injecting `Injector` alone; `create()` forwards its arguments and defaults `options.injector` |
| `src/lib/eval-signal.ts` | edit | private version signal + `invalidate()`; `trackDependencies` option, `dependencies` getter, per-recompute tracker install/unsubscribe; the registry-conflict throw |
| `src/public-api.ts` | edit | export the service — § 5 named it public and the barrel did not reach it |
| `src/lib/eval-signal.spec.ts` | edit | +14 cases: invalidate (4), trackDependencies (7), registry ownership (4, one replacing nothing) |
| `src/lib/eval-signal.service.spec.ts` | **new** | 5 cases, none of them inside an injection context |
| `docs/signals/phase-3-plan.md` | edit | step-3 bullet corrected; the internal-state assertion route recorded |

### API added

```ts
export interface EvalSignal<T> extends Signal<T> {
  readonly dependencies: ReadonlySet<string>;   // new
  invalidate(): void;                           // new
  destroy(): void;                              // step 2
}

export interface EvalSignalOptions {
  trackDependencies?: boolean;                  // new, default false
  // eval / equal / onError / injector — step 2
}

@Injectable({ providedIn: 'root' })
export class EvalSignalService {
  create(expression, source, options?): EvalSignal<unknown>;
}
```

Purely additive. The published `.d.ts` now matches § 5 exactly, minus `createEvalSignalAsync`
(step 5).

### Behaviour worth recording

- **The version signal is read *before* `evaluate()` can throw, and that placement is the
  whole feature.** A `computed` caches an error and re-throws it on every read until a
  producer *that run recorded* changes. Over a plain-object source there are no signal
  producers at all, so a recompute that threw and recorded no version read is permanently
  poisoned — `invalidate()` could never recover it. Moving `version()` three lines down,
  below `evaluate()`, leaves every success-path assertion green.
- **`hasReadHooks` reads `false` after a recompute even with tracking on.** The unsubscribe
  runs in `finally`, inside the recompute. So the post-hoc assertion for *registration* is
  `state.hasHooks` (which latches on first registration and never clears) plus a spy on
  `EvalHooks.prototype.onRead`; `hasReadHooks` is the assertion for *removal*. The first
  draft of that spec asserted `hasReadHooks === true` and failed, which is how this surfaced.
- **`state.hooks` constructs an empty registry on first access.** `hasHooks` must therefore
  be asserted *before* the spec touches `state.hooks`, or the second assertion passes for the
  wrong reason.
- **The conflict check reads `options.eval.hooks` through a cast**, exactly as
  `EvalState.adoptHooks` does: `EvalOptions` is a union whose `{ caseInsensitive: false }`
  arm has no index signature, so `evalOptions?.['hooks']` is `TS7053`. `instanceof EvalHooks`
  immediately after narrows the `unknown` back, and it also makes the check faithful — a
  non-`EvalHooks` value is not adopted by `EvalState` either, so there is no conflict to
  report.
- **`Object.assign` cannot carry `dependencies`.** It copies a getter's current value, which
  would freeze the set at the empty one it holds before the first recompute. The getter is
  installed with `Object.defineProperty` after the assign.
- **The tracker's retained value does not retain the walk.** `dependencies` holds
  `tracker.dependencies`, a bare `Set<string>`; it does not close over the tracker, so
  `tracker.reads` — which holds the state, the shared context as `target`, the AST nodes and
  every read value — is garbage the moment the recompute returns.

---

## 2. Design questions settled during the step

- **The service injects `Injector` and nothing else.** The plan's bullet said
  `EvalService` / `CompilerService`; it predates § 3.3.1's finding that
  `EvalService.createState` is the accumulator leak, and § 5 — the later text — states the
  enforceable rule. `CompilerService` went with it for a different reason: the service exists
  to supply an injection context, the factory resolves `CompilerService` off the injector it
  is handed, and a second injection would be a field nothing reads. Confirmed with the user
  before implementing; the plan bullet was corrected in the same commit so the conflict
  cannot survive to step 4.
- **`create()` defaults `injector` to the service's own.** Not in the plan, and required: a
  method on a root-provided service is routinely called outside an injection context, which
  is the exact case the service exists for and the exact case that throws `NG0203` without
  the default. A caller-supplied `options.injector` still wins.
- **`public-api.ts` was added to the step's file list.** A symbol § 5 names as public that
  the barrel does not re-export is not public — the barrel names modules, not a directory.

---

## 3. Deviations from the plan's literal sketch

- The plan suggested asserting "no read hook" on `state.hasHooks` **or** the absence of read
  dispatch; the states turned out to be reachable from the spec through step 2's
  `createState` spy, so `hasHooks` is asserted literally on the state the factory built. The
  weaker form — a registry passed in through `options.eval.hooks` — is kept as well, but only
  as the registry-ownership assertion it actually is.
- Two spec cases were added after review that the plan did not list: `invalidate()` recovering
  a signal whose last recompute threw, and a negative recompute assertion for the *tracking*
  path. Both are step-3 assertions rather than step-4 work.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-signals:lint` | clean |
| `eval-signals:test` | 4 suites / 83 tests |
| `eval-signals:build:production` | clean → `dist/modules/eval-signals` |
| `eval-core:lint` | clean, unchanged |
| `eval-core:test` | 41 suites / 717 tests, unchanged |
| Published `.d.ts` | `EvalSignalService`, `SignalContextWriteError`, `createEvalSignal`, `createSignalContext` + 3 types — § 5's list exactly |

### Probes

Every new invariant was confirmed load-bearing by breaking the implementation:

| Inversion | Failures |
| :--- | :--- |
| `trackDependencies` default flipped to `true` | 3 |
| `version()` read removed from `compute` | 3 |
| `version()` moved below `evaluate()` | 1 — the throw-recovery case alone |
| Service's injector default removed | 3, all `NG0203` |
| Conflict throw disabled | 2 |
| Conflict branch installs the tracker, *then* throws | 1 — the "registry untouched" assertion alone |
| Tracking path reads a key the expression never named | 1 — the over-subscription case alone |

The last three matter most: each isolates an assertion that would otherwise have been
indistinguishable from a passing implementation of a weaker rule.

### Review

`code-reviewer` returned no Critical. Two Warnings and one Minor were acted on in the step:

- the `version()` placement had no assertion (Warning 1) — the throw-recovery case;
- `trackDependencies: true` had positive coverage only (Warning 2) — the over-subscription
  case. The reviewer traced the emission path and confirmed there is no live defect:
  `member-expression.ts`'s `getThis`, the one call that iterates `lookups`, sits outside the
  `hasReadHooks` guard and so runs identically with tracking off;
- `NO_DEPENDENCIES` was a module-level `Set` handed to every consumer through a public getter
  (Minor 3). `ReadonlySet` is a compile-time claim only, so one cast-and-mutate would have
  corrupted what every signal in the application reports. Now allocated per signal.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.4's reason for "no `reset()`" was wrong** and is corrected: the operative half is the
  fresh *tracker*, not the fresh registry. A hoisted tracker accumulates across however many
  fresh registries it is installed on, and the hoist is the plausible optimisation — the
  wrong reason made it look safe.
- **Step 6 gains the `dependencies`-is-empty ambiguity**: tracking off, tracking on but never
  recomputed (the `computed` is lazy), and tracking on with nothing read all report the same
  empty set, and one of the three is the consumer's own missing option. A README item rather
  than an `isDevMode()` diagnostic, since every branch is diagnosable from what the consumer
  passed.
- **Step 4 gains `invalidate()`-after-`destroy()`, decided rather than emergent**: a no-op —
  no version bump, no recompute, no value change. Not a throw, because `destroy()` is
  idempotent and teardown order is not the consumer's to control; not the current
  fall-through, because that makes the one method meaning "re-evaluate" the thing that flips
  a destroyed signal from its last good value to `undefined`. It is now in step 4's **exit
  criteria**, paired with the dependency-change case: step 4 owns `destroy()` and must make
  both producers agree, and if it chooses "both `undefined`" this decision is reversed in
  writing.

### 5.2 Noticed, not fixed

- **`CLAUDE.md` gained one line** (not a plan item): a green `test` run is not a type-check.
  Jest compiles through `tsconfig.spec` and accepted the `EvalOptions` index read that
  `build:production` rejected with `TS7053`. This is the second step in a row where the build
  caught something the suite could not.

### 5.3 Still carried from earlier steps

Unchanged by this step: the arrow-function scope leak on the shared `EvalContext` (§ 3.2,
step 4 decides the containment), `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive` because `getKey` does not consult `lookups` (§ 3.6.4), a member-target
write (`user.name = 'Bob'`) bypassing the read-only policy because it never reaches
`EvalContext.set` (§ 3.6.4, § 8 q6), and async deferred to step 5.
