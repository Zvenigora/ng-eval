# Phase 6 — Step 2 Summary: the source adapter

**Date**: August 31, 2026
**Plan**: [`phase-6-plan.md`](./phase-6-plan.md) § 4, Step 2
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.1.0), the `/signals`
entry point
**Commits**: `fd4a8d1` (plan, revision 11), `9562546` (code), `1291f4a` (plan, revision 12)
**Status**: complete — all three projects green on lint, test and build; `eval-forms` 10 suites
/ 133 tests (from 8 / 113), `eval-core` unchanged at 43 suites / 735 tests, `eval-signals`
unchanged at 5 suites / 97 tests

**Filename**: `step-2-summary.md` is Phase 4's, so Phase 6's summaries carry the phase in the
name. Phase 6 step 1 wrote none; this is the first.

---

## 1. What was built

The source half of the adapter, and nothing that runs a walk. Two modules, both real exports of
their own file and both absent from `signals/src/public-api.ts`.

| File | Kind | Contents |
| ---- | ---- | -------- |
| `signals/src/lib/model-source.ts` | new | `readProperty`, the private `Map` memo, `keySignal`, `createRuleContext`; exports `createModelSource` and the `ModelSource` type |
| `signals/src/lib/rules.ts` | new | `createExpressionRules`, `ExpressionRules`, `ExpressionRuleOptions`; one `createModelSource` call, three registrar stubs that throw |
| `signals/src/lib/model-source.spec.ts` | new | criteria 1–5, the upstream-agreement gate, and § 6.1's third harness |
| `signals/src/lib/rules.model-source-count.spec.ts` | new | the delegating `jest.mock('./model-source')` counting `createModelSource` |

`signals/src/public-api.ts` was **not** edited, and that is a decision rather than an
oversight — gate 6 puts the three factory symbols on the published surface from step 4 on. See
§ 3.

### Behaviour worth recording

**The read is what subscribes, and it happens even when the key resolves to `undefined`.** This
is the whole of why resolution lives *inside* the `computed`. `EvalContext.get` treats
`undefined` as absent at every step, so an expression naming a key the model does not yet hold
resolves to nothing — but `keySignal(key)()` has been called inside Angular's derivation, so
the rule is subscribed and re-runs when the model gains the key. A record that simply lacked
the key reads nothing, subscribes to nothing, and is frozen for the life of the form.

**Per-key propagation survives even though every `computed` reads the whole model.** Angular's
`computed` memoises on `Object.is`, so a write to `zip` re-evaluates each computed's property
read and propagates only from `zip`'s. Asserted in both the case-sensitive and the
`caseInsensitive` arm, the second because that is the path where `readProperty` scans
`Object.keys(model())` and where over-subscription is the obvious objection. It costs work
inside a memoised derivation, not a dependency — the computed was reading the whole model
object before the scan existed.

**`createFieldContext` is used for its class, not its sources.** Both sources are `{}`. What it
supplies is a context whose `set` throws `SignalContextWriteError`, which is the error step 3's
`applyErrorPolicy` must re-throw rather than swallow under a default of `'undefined'`. A
hand-built `EvalContext` would silently accept an assigning expression, and the lookup-count
assertion would not notice — so that property now has its own case.

---

## 2. Design questions settled during the step

**Where the third resolver sits is observable; "both sources are empty" is not.**
`createSignalContext` closes over its source and the returned `EvalContext` exposes no accessor
for it, so the plan's earlier "both sources asserted empty" named nothing a spec could see. The
two observables that do work are `lookups.length === 3` and a `pop()`: removing the third
lookup makes every model key resolve `undefined`, which is what proves the first two are empty.
Probe 2 (§ 4) confirmed the pop is load-bearing rather than decorative — it is one of the three
cases that go red when the record is put back into the field source.

**`readProperty` is a re-implementation, so agreement needs a gate rather than a sentence.**
`resolve` is module-private in `eval-signals` and cannot be called, and § 0.1 requires that be
said plainly. The docblock says it; a spec now checks it, comparing `createModelSource`'s
context against a real `createSignalContext` over the same record across six key spellings and
both option arms. It is the **only** case that catches insertion-order drift — flipping `find`
to reverse order reddens it and nothing else.

**The `pending(source, registrar)` stub shape is forced by lint, and the parameter order is the
load-bearing part.** `@typescript-eslint/no-unused-vars` runs at max-warnings 0 with no ignore
pattern, so the `const source` binding needs a consumer. Its default `args: 'after-used'` then
lets the *parameter* go unread as long as something after it is used — so `source` survives
only because `registrar` follows it. Swapping the two fails lint. Commented, and it dissolves
in step 4 when the parameter is actually read.

---

## 3. Deviations from the plan's literal sketch

**None in the code.** The § 3.2.1 sketch was followed as written, including the unannotated
resolver parameter (`EvalLookup` is contravariant under `strict`, so `(key: string) => …` does
not compile) and the `options?.['caseInsensitive']` index read.

**One thing the plan left open was decided by gate 6 rather than by the step's own file list.**
Step 2's bullets say `model-source.ts` is not listed in `signals/src/public-api.ts` and are
silent about `rules.ts`; gate 6 says the three factory symbols reach the emitted `.d.ts` "from
step 4 on". The barrel was therefore left untouched. Confirmed against the build output:
`zvenigora-ng-eval-forms-signals.d.ts` declares exactly `TEXT`.

**`ExpressionRuleOptions` is defined a step before it is published**, because
`createExpressionRules` needs `options?.eval` now. Additive and unpublished, so no shape is at
risk.

**The per-rule `options?` parameter shape is this step's invention within § 5's outline.** § 5
says each registrar is `(path, expression: string, options?) => void` and that `evalDisabled`
takes an extra `{ reason?: string }`, without saying what the others' options are. They are
typed `ExpressionRuleOptions` (and `& { reason?: string }` for `evalDisabled`). Step 4 owns the
merge semantics and may change this freely — nothing is published.

---

## 4. Verification

`npx nx run-many -t lint test build` green for all three projects, run after every change.

Gates, at their step-2 expected values:

| Gate | Result |
| ---- | ------ |
| 1 `/signals` shipped | `exports` has `./signals` → `types/…-signals.d.ts` + `fesm2022/…-signals.mjs`, both emitted; `dist/…/signals/package.json` names the same pair |
| 2 Angular 22 confinement | every non-spec `@angular/forms/signals` hit is under `signals/` |
| 3 One path to the walk | zero `EvalState.fromContext`, zero `new EvalState` — the expected value before step 3 |
| 4 `/reactive` unmoved | FESM 25,748 bytes |
| 6 `/signals` published surface | `.d.ts` declares exactly `TEXT` |
| 7 Unpublished sources type-check | no output — added by revision 12 during this step, see § 5.1 |

Gate 5 does not apply until step 3.

### Probes

Four, all named rather than reported as counts.

**Criterion 3's break — revision 2's shape** (seed the memo from `Object.keys(model())`, return
`undefined` for anything else). Two cases red, and the required one is among them:

- `resolution › should resolve a key absent at construction once the model gains it`
- `resolution › should resolve a case-variant key absent at construction once it arrives` (Q4b)

**Criterion 5's break — revision 3's shape** (the memo *is* the record `createFieldContext`
hands to `createSignalContext`, entries read the model exactly, a miss is written back under
the spelling the expression used). Three red:

- `resolution › should resolve a case-variant key bound to undefined once it gains a value` —
  **Q4 itself**
- `resolution › should resolve a case-variant key absent at construction once it arrives` (Q4b)
- `createRuleContext › should resolve every model key through the third lookup and nothing
  without it` — the pop criterion firing correctly, because the record is no longer empty

Green under that break, as Q3's boundary predicts: the case-variant **first** read, and the
case-sensitive late key. Revision 3 was right in the case it was defended on.

**The finding worth carrying**: `should still resolve a case-variant key after a write` also
stays green under revision 3's shape, even though it is a second-read case. The model holds a
*value* at construction, so upstream's scan resolves it and the third resolver never runs — no
write-back under `Country` ever happens. **The freeze needs the first read to fall through**,
which is why Q4's fixture binds the key to `undefined`. A second-read spec over a populated
model would not have caught it, and "assert on the second read" is therefore not by itself the
rule that catches Q4.

**The agreement spec's own vacuity probe**: flipping `readProperty`'s `find` to reverse
insertion order reddens `should agree with upstream resolve on the same keys,
caseInsensitive=true` and nothing else.

**And one probe that is not about a spec**: `const probeTypeError: number = 'not a number'` in
`createModelSource`'s body, against which `nx run eval-forms:build:production --skip-nx-cache`
is **green**. That is § 5.1.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

**Revision 11** — neither new file is type-checked by `build:production`. ng-packagr compiles
from the entry file, not from `tsconfig.lib.json`'s `include`, and gate 6 keeps both off the
barrel until step 4. Measured, not inferred, by the probe above. **Step 4's barrel edit is where
two steps of source first meets `tsconfig.lib.prod.json`, so step 4 should expect to find
things** — Phase 3 step 3's `TS7053` is the precedent for what surfaces at exactly that
transition.

**Revision 12** — § 6 gains **gate 7**, closing that hole from step 2 rather than deferring it:
`npx tsc -p modules/eval-forms/tsconfig.lib.prod.json --noEmit`, filtered to
`^modules/eval-forms/`, expecting no output. `tsc` honours `include` where ng-packagr does not.
**The filter is part of the row, not a convenience**: unfiltered, the command exits non-zero on
38 pre-existing `TS1205` errors in `eval-core` sources reached through `paths`, none of them in
this package — and a gate with 38 standing hits is the one revision 10 spent gate 3 removing.
Calibrated against `^modules/eval-core/`, where the same grep returns all 38.

### 5.2 Noticed, not fixed

- **A top-level model key holding a signal is returned un-called.** Upstream's lookup is
  `resolve(...)` then `isSignal(value) ? value() : value`; this adapter's is `keySignal(key)()`
  with no `isSignal` step. So `model = signal({ ready: signal(false) })` resolves `ready` to a
  truthy function here and to `false` through `/reactive`. Near-unreachable for Signal Forms,
  whose models are plain data — one sentence for step 7's README caveat, beside the
  nested-signal-diagnostic note that already covers the neighbouring case.
- **The `typeof key === 'string'` guard is unfalsifiable by the suite**, and its docblock
  overstates the harm: removing it changes no observable, since `readProperty(model, 42, …)`
  returns `undefined` anyway and a `Map` entry under a non-string key is unreadable. Belt and
  braces, kept, but not "the revision-3 defect in a second costume".
- **Two dead lookups run ahead of ours on every resolution.** `createFieldContext({}, {}, …)`
  pushes two resolvers over empty records, and under `caseInsensitive` each allocates an
  `Object.keys({})` per key per node. Plan-mandated (§ 5 authorises `createFieldContext`, not
  `createSignalContext`), construction is per rule per `form()`, and the cost is small.

### 5.3 For step 3 specifically

- **`onError` must be resolved explicitly, not passed through.** `error-policy.ts:18-21` records
  that forwarding an *absent* policy inherits `'throw'`; `ExpressionRuleOptions` documents the
  default here as `'undefined'`. `applyErrorPolicy` needs `options?.onError ?? 'undefined'` at
  the call site, and the two defaults being opposites is the whole reason.
- **Gate 3 flips from zero to exactly one** at step 3, and the one hit must be **inside**
  `evaluateRule`'s body. Hoisted to module scope it is still one hit, while one `EvalState`
  reused across invocations shares the value stack, the open-node stack and `result.trace`
  between derivations — a different defect wearing this gate's pass.
- **§ 3.8's prototype-shadowing exposure is live but is step 6's.** `original` is `{}`, and
  `EvalContext.get` consults it before `lookups`, so an identifier naming an own property of
  `Object.prototype` never reaches this step's resolver. Not a step-2 regression.
