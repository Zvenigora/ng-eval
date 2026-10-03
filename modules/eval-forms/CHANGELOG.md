# Changelog — `@zvenigora/ng-eval-forms`

All notable changes to `@zvenigora/ng-eval-forms` are documented in this file. The other two packages in this repository keep their own, listed in the [root changelog](../../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.2.7] - 2026-10-02

Released because `eval-core` 0.9.0 falls outside 0.2.6's declared peer range. No code in this
package changes.

### Changed
- **Peer range widened.** `@zvenigora/ng-eval-core`: `>=0.3.0 <0.9.0` → `>=0.3.0 <0.10.0`. The
  lower bound is unchanged. `@zvenigora/ng-eval-signals` stays `>=0.1.0 <0.3.0`, which already
  admits 0.2.1. The `peerDependencies` block quoted in the README shows the new range.
- **With `eval-core` 0.9.0, a rule expression that reads `constructor`, `__proto__`,
  `prototype` or one of the four accessor definers off a string, number or boolean is refused
  by `eval-core`**, as a member read off an object already was. Nothing in this package reads
  one of those names off a primitive, so its own behaviour is unchanged, and the README's bound
  — a member expression is `eval-core`'s guard's business — still describes it.

---

## [0.2.6] - 2026-10-02

Released because `eval-core` 0.8.0 and `eval-signals` 0.2.0 both fall outside 0.2.5's declared
peer ranges. No code in this package changes.

### Changed
- **Peer ranges widened.** `@zvenigora/ng-eval-core`: `>=0.3.0 <0.8.0` → `>=0.3.0 <0.9.0`.
  `@zvenigora/ng-eval-signals`: `^0.1.0` → `>=0.1.0 <0.3.0`, since on a `0.x` version `^0.1.0`
  stops short of 0.2.0. Both lower bounds are unchanged. The `peerDependencies` block quoted in
  the README shows the new ranges.
- **With `eval-core` 0.8.0 and `eval-signals` 0.2.0, a write error under `caseInsensitive` names
  the key.** It named `'undefined'`. Through `createFieldContext`, a field-half key is named as
  the field source spells it (`NAME = 1` over `{ name }` → `'name'`); a form-half key as the
  expression wrote it (`COUNTRY = 1` → `'COUNTRY'`), because the form half is resolved by a
  borrowed lookup rather than by the field context's own source. A `/signals` rule names the key
  as written. `applyErrorPolicy` rethrows the error as before; only `key` and the message differ.
  `/reactive` builds its field contexts case-sensitively and is unaffected.
  Measured on eval-core 0.7.0 / eval-signals 0.1.4: both keys named 'undefined'.
  [A4](../../docs/backlog-retired.md#a4), [C3](../../docs/backlog-retired.md#c3).

---

## [0.2.5] - 2026-10-01

Released because `eval-core` 0.7.0 falls outside 0.2.4's declared peer range. No exported symbol
changes, and the `.d.ts` files are byte-identical to 0.2.4's.

### Changed
- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.7.0:
  `>=0.3.0 <0.7.0` → `>=0.3.0 <0.8.0`. The lower bound is unchanged, so 0.3.0 to 0.6.1 remain
  supported. The `peerDependencies` block quoted in the README shows the new range. The
  `"@zvenigora/ng-eval-signals": "^0.1.0"` range is unchanged: it already admits 0.1.4.
- **With `eval-core` 0.7.0, a write nested inside a call is rethrown by `applyErrorPolicy`, in
  every mode.** `[1].map(x => (country = 'CA'))` now reaches it as `SignalContextWriteError`,
  like a direct assignment, where it arrived as a plain `Error` and was routed by the policy —
  under the default `'undefined'`, a blank field with nothing in the console. `/reactive` gets the
  same through `createEvalSignal`'s own bypass. The README's "When a rule fails" no longer
  describes this as the guarantee's one boundary, and says the boundary returns with an
  `eval-core` older than 0.7.0. [A6](../../docs/backlog-retired.md#a6).
- **`LICENSE` ships in the package** for the first time.

---

## [0.2.4] - 2026-09-30

**Two `/signals` fixes that bring its model lookup into line with `createSignalContext`,
[D6](../../docs/backlog-retired.md#d6) and [D4](../../docs/backlog-retired.md#d4).** A patch: no
exported symbol changes, and the `.d.ts` files are byte-identical to 0.2.3's. `/reactive` and the
shared core entry point are unchanged. The peer ranges are unchanged, and
`>=0.3.0 <0.7.0` already admits `eval-core` 0.6.1.

### Fixed
- **eval-forms `/signals`, number keys**: `this[42]` against a model holding `"42"` resolved
  `undefined`, where `/reactive` and `createSignalContext` resolve the value. A number key now
  resolves as its string spelling, through the same memo entry as `this["42"]`, with or without
  `caseInsensitive`. A symbol key still resolves `undefined`.
  [D6](../../docs/backlog-retired.md#d6).
- **eval-forms `/signals`, a top-level key holding a signal**: `{ ready: signal(false) }`
  resolved `ready` to the signal function itself, which is truthy whatever it holds, where
  `createSignalContext` resolves it to `false`. The value is now called, as upstream does, and a
  rule naming `ready` re-runs when that signal changes. A plain function value is still returned
  uncalled. The README's note on the nested-signal diagnostic now separates this top-level case
  from the nested one, which is unchanged. [D4](../../docs/backlog-retired.md#d4).

### Changed
- **Built with Angular 22.1.** Unlike `eval-core`, this package's `.d.ts` carries no `ɵprov`
  declaration, so the upgrade changes none of its types.
- **`CHANGELOG.md` now ships in the package**, beside `README.md`. Its links into the repository's
  `docs/` resolve on GitHub, not on npm.

---

## [0.2.3] - 2026-09-26

Released because `eval-core` 0.6.0 falls outside 0.2.2's declared peer range, so installing it
beside 0.2.2 raises a peer-dependency conflict. The range is the whole of the release.

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.6.0:
  `>=0.3.0 <0.6.0` → `>=0.3.0 <0.7.0`. Manifest only — no code, no exported symbol and no
  behaviour of this package changes, and all three entry points (`@zvenigora/ng-eval-forms`,
  `/reactive`, `/signals`) are untouched. The lower bound is unchanged, so 0.3.0 to 0.5.0 remain
  supported. The `peerDependencies` block quoted in the README now shows the new range. It had
  shown `>=0.3.0 <0.5.0` since 0.2.1, because 0.2.2 widened the manifest and not the README.

The `"@zvenigora/ng-eval-signals": "^0.1.0"` range is unchanged: it already admits 0.1.3.

---

## [0.2.2] - 2026-09-17

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.5.0:
  `>=0.3.0 <0.5.0` → `>=0.3.0 <0.6.0`. Manifest only — no code, no exported symbol and no
  behaviour of this package changes. The lower bound is unchanged, so 0.3.0 and 0.4.0 remain
  supported.

---

## [0.2.1] - 2026-09-16

### Changed

- **Peer range widened** to admit `@zvenigora/ng-eval-core` 0.4.0:
  `"@zvenigora/ng-eval-core": "^0.3.0"` → `">=0.3.0 <0.5.0"`, for the reason given under
  `eval-signals` 0.1.1. **0.3.0 remains supported.**

The `"@zvenigora/ng-eval-signals": "^0.1.0"` range is **unchanged** and needs no change: `^0.1.0`
resolves to `>=0.1.0 <0.2.0`, which already admits `eval-signals` 0.1.1.

Nothing else changed — no source file, no export, no behaviour, and all three entry points
(`@zvenigora/ng-eval-forms`, `/reactive`, `/signals`) are untouched. `/signals` still requires
Angular 22; `/reactive` still works from Angular 19. The depth-mark unwind in `evaluateRule` is
retained, for the same two reasons given under `eval-signals` 0.1.1.

---

## [0.2.0] - 2026-09-06

Phase 6 of the [roadmap](../../ROADMAP.md): a third entry point, `@zvenigora/ng-eval-forms/signals`, driving Angular [Signal Forms](https://angular.dev/guide/forms/signals) field properties from **string** expressions resolved at runtime — the same proposition as `/reactive`, against Angular's schema-and-model API rather than `FormGroup`. Design, measurements and the questions it settles are in `docs/forms/phase-6-plan.md`; consumer documentation in the [package README](README.md). **`/signals` requires Angular 22 or later.** `/reactive` is unchanged and the shared core changes only additively — one new export, `applyErrorPolicy`, called out below; both still work from Angular 19.

**Two things in this release reach a consumer who never imports `/signals`**, and they are named first because everything else lands behind an entry point that has no consumers yet — a reader skimming for "does this affect me" would otherwise reasonably conclude the released surface was untouched. They are the `peerDependencies` addition and `applyErrorPolicy`, both below.

### Added
- **⚠️ `acorn-walk ^8.3.0` in `peerDependencies`** — a manifest change to a published package, and the first of the two things that reach an existing consumer. **It imposes no new install**: a consumer of this package already peer-depends on `@zvenigora/ng-eval-core`, whose own peers include `acorn-walk ^8.3.0`, so npm 7+ has already placed it, and a strict consumer who satisfied `eval-core`'s peers by hand needs nothing further. It is declared because `/signals` imports `acorn-walk`'s `simple` directly, and an undeclared import resolves today by accident of hoisting and would not resolve at all under pnpm's isolated layout. `acorn` itself is deliberately **not** declared: this package imports no `acorn` symbol, and `acorn-walk` depends on it directly, so an `acorn` peer would be surface with no caller.
- **⚠️ `applyErrorPolicy(run, policy?)`** (core, at the primary entry point) — the second, and the only new export on the already-released surface. Runs `run` under an `ExpressionErrorPolicy` and **rethrows a `SignalContextWriteError` whatever the policy says**, because an expression that assigns is statically illegal on every recompute with every dataset and swallowing it under the default policy hands you a silent blank for a bug in the rule itself. It lives in the core rather than in `/signals` so that `/reactive`'s eventual version cannot drift from it and the two end up disagreeing about the one error that must never be swallowed. Deferred from 0.1.0's release notes as "a matching helper deferred to the `/signals` phase, which is its only caller" — it is still that caller's only use, but it is a permanent addition to a package at 0.1.0 and is called out as one.
- **`createExpressionRules(model, options?)`** (`/signals`): the primary API. A **factory**, not free functions, because Angular's `LogicFn` cannot recover the source — a rule on `p.city` evaluating `country === "US"` has no route to `country` from inside the callback, so the model must be closed over at registration. Returns `evalVisible`, `evalText` and `evalDisabled`, called from inside a `schema()` body beside Angular's own rules.
- **`disabled`, which `/reactive` does not ship.** Under Reactive Forms it means calling `control.disable()` — a write back into the form, an emission on `valueChanges` that re-enters a rule naming its own field, and a value removed from the parent aggregate. Under Signal Forms it is a schema rule over derived state and none of the three exists. `evalDisabled` takes a **static** `reason?: string`, never expression-derived: Angular's `when` returns `boolean | string` and a truthy string is *both* "disabled" and "the reason", so forwarding an expression's value raw would disable a field on the string `'false'` **with the reason `"false"`**.
- **`TEXT`** (`/signals`): the metadata key `evalText` writes through and `field().metadata(TEXT)` reads back. `text` has no dedicated Signal Forms primitive the way `hidden` and `disabled` do, so it is Angular's own `metadata` mechanism rather than a second one beside it.
- **`ExpressionRules` / `ExpressionRuleOptions`** (`/signals`): the three registrars' shape, and `{ eval?, onError? }` accepted at the factory and per registration, **registration winning per key** with no deep merge.
- **Prototype-shadowed identifiers are rejected at registration** (`/signals`). An expression naming an own property of `Object.prototype` — `constructor`, `toString`, `valueOf` and the nine others — throws, naming the expression and the identifier. Without it the identifier resolves off the prototype to a *function*, a function is truthy, and `evalVisible` renders precisely the field that has no data with nothing logged. The subject is the **expression**, not the field name: `/signals`' paths are compile-time tokens and the library never sees a name it could validate, which is the mirror image of `/reactive`'s construction-time name check.

### Notes
- **⚠️ `/reactive` and `/signals` now disagree about one authored string, deliberately.** `visible: "constructor"` throws under `/signals` and, under `/reactive`, binds cleanly and renders a data-less field — `/reactive` validates field and control *names*, never expressions. Closing the gap would make an expression that registers today start throwing, which is a breaking change to a released entry point, so it is logged as a question for a later major in [`ROADMAP.md`](../../ROADMAP.md) and is **not** decided here. Documented in the README from **both** sections, because the reader who does not know is the one reading `/reactive`'s.
- **Limitations at `/signals`, all documented in the README**: a schema **value** shared across models silently renders form B against form A's data, so the supported reuse shape is a schema *function* of the rules, called per form; `caseInsensitive` is in practice a **factory** option, since a per-registration value reaches the walk but not the factory's key memo or its context, and one expression then obeys two casing rules; the nested-signal diagnostic from `@zvenigora/ng-eval-signals` does not reach this entry point at all; the form's key set is not enumerable from upstream, deliberately; the identifier guard over-rejects a name an expression *binds* itself, deliberately; and the `SignalContextWriteError` bypass does **not** survive a call frame, so an assignment nested inside a call is routed by `onError` like any other failure and appears as a blank field.
- **There is no `destroy()` at `/signals`, and nothing to call one on.** No `EvalSignal` is created and nothing registers with a `DestroyRef`: Angular owns the field tree's lifetime and the rules die with the schema. This is the one place the two adapters differ in obligation rather than in API.
- **`readme-examples.spec.ts` now exists under both adapters**, executing this release's documented `/signals` examples as well as `/reactive`'s. It still runs the code rather than reading the markdown, and template and manifest blocks remain uncovered.
- Nothing was added to `@zvenigora/ng-eval-core` or `@zvenigora/ng-eval-signals`; both are consumed at their published surfaces.

---

## [0.1.0] - 2026-08-20

Phase 4 of the [roadmap](../../ROADMAP.md): the first release of `@zvenigora/ng-eval-forms`, which drives Angular form field properties from **string** expressions resolved at runtime — for schemas served by an API, authored in a form-builder UI, or versioned separately from the application. Design and rationale in `docs/forms/phase-4-plan.md`; consumer documentation in the [package README](README.md), with a [worked example](../../docs/forms/worked-example.md). Requires `@angular/core >=19`, `@angular/forms >=19`, `rxjs ^7.8`, `@zvenigora/ng-eval-core ^0.3.0` and `@zvenigora/ng-eval-signals ^0.1.0`.

**If your conditions are known at compile time and you are on Angular 22, use Angular's own Signal Forms schema instead.** This library exists for the cases where the rule is not knowable when the application is compiled; the README says so first, before the API.

### Added
- **Two entry points, both shipped from one package.** `@zvenigora/ng-eval-forms` is the shared core and imports nothing from `@angular/core` or `@angular/forms`; `@zvenigora/ng-eval-forms/reactive` is the Angular Reactive Forms adapter. A `/signals` entry point for Signal Forms is designed (plan § 9) and not built — placing `/reactive` at the primary entry point now would have made adding it a breaking move of every symbol.
- **`bindFieldProperties(schema, group, options)`** (`/reactive`): the primary API. Validates the schema, mirrors the `FormGroup`, and returns a `FormBinding` — one `EvalSignal` per rule, recomputing when a control the rule actually *named* changes. `options.injector` is **required**: every signal it creates is built with an explicit injector and therefore takes no `DestroyRef` registration of its own, so an optional one would silently vary when teardown runs.
- **`FieldSchema`** (`/reactive`): `{ name, visible?, text? }`, and deliberately not a schema *language*. A field need not name a control.
- **`FormBinding`** (`/reactive`): `{ fields: Record<string, FieldProperties>; destroy(): void }`. One `destroy()` releases every property signal and both halves of the mirror; it is idempotent, and a `DestroyRef` registration on the caller's injector is the net under it rather than a substitute for calling it.
- **`FieldProperties`** (`/reactive`): `{ visible?: EvalSignal<boolean>; text?: EvalSignal<string> }` — `EvalSignal` rather than `Signal`, because both extra members are reachable API here: `invalidate()` is the documented hatch for a `{ emitEvent: false }` write and for a control-set change, and `destroy()` is what teardown counts.
- **`createControlSource(group, options)`** (`/reactive`): the mirror on its own, for callers composing contexts by hand. One subscription **per control, never to the group** — a disabled control is excluded from its parent's aggregate value and there is no `rawValueChanges`, so a group-backed mirror would lose a field the moment anything disabled it. The returned record holds live values behind accessors and must be passed by reference; `{ ...source }` flattens it and silently freezes every property built over the copy.
- **`createFieldContext(formSource, fieldSource, options?)`** (core): composes one `EvalContext` per field from a form-wide and a field-local source, as two live lookups rather than a joined record — so a key added to either source after construction resolves, with nothing to keep in sync.
- **`toVisible` / `toText`** (core): the two coercions. `visible` is JavaScript truthiness, so the string `'false'` is **visible**; `text` is `String(value)` with `null` and `undefined` mapping to `''`, so `0` stringifies to `'0'` rather than blanking.
- **`ExpressionErrorPolicy`** (core): `'throw' | 'undefined' | ((error) => unknown)`. **The default is `'undefined'` — the opposite of `eval-signals`' default**, because the expression's author may be an end user rather than the developer, and the right response to a bad rule is a field that does not render. A matching `applyErrorPolicy` helper is deferred to the `/signals` phase, which is its only caller.
- **Construction-time schema validation.** A duplicate field name, a non-string rule, a name that is a member of `Object.prototype`, and a control that is not a `FormControl` all throw from `bindFieldProperties`. The prototype check is the one no other layer can make: `FormGroup` accepts a control named `constructor`, and an expression naming it reads the prototype's value — a function, which is truthy — so `visible` would render precisely the field that has no data, with no error anywhere.

### Changed
- **⚠️ `bindFieldProperties` returns `FormBinding`, not a bare `Record<string, FieldProperties>`.** The only shape change to an exported symbol in this release, and it is called out rather than folded into "adds the `/reactive` adapter" — nothing has been published, so no released shape breaks, but the entry exists so the change is found by reading. `destroy()` is nested under `fields` rather than written onto the record because the record's keys are *field names*, `destroy` is a legal one, and those names arrive from a server: a flat shape would put a silent collision between the consumer's data and this library's API in the one case where the consumer controls the names least.

### Notes
- **Limitations, all documented in the README**: a `{ emitEvent: false }` write freezes a property until `invalidate()` (the observable is the only signal there is); the *key set* is not reactive, so `addControl` / `removeControl` needs one `invalidate()` on the rules that name the affected key; those same methods called with `{ emitEvent: false }` suppress `group.events` and have **no** hatch; an empty `FormControl` is indistinguishable from an absent key; and the binding must be constructed outside a reactive context, since `toSignal` opens with `assertNotInReactiveContext`.
- **Deferred deliberately**: `disabled` (it writes back into the form, it emits on `valueChanges` so a rule naming its own field re-enters its own input, and it removes the value from the parent aggregate); `required` and validators; form-state keys (`touched` / `dirty` / `valid`); `FormArray` and nested `FormGroup`, which are rejected at bind time rather than left to misbehave.
- **`peerDependencies` are per package, not per entry point**, so the manifest declares one range at the floor. `/reactive` works from Angular 19; when `/signals` ships it will need Angular 22, and an older consumer importing it gets `Cannot find module '@angular/forms/signals'` from Angular's own `exports` map. Narrowing the manifest to `>=22` would add no diagnostic and would break every Reactive Forms consumer on 19–21.
- **`readme-examples.spec.ts` executes the runnable examples** in the README and the worked example, so a documented example that stops working fails the suite. Template and manifest blocks are not covered, and it is narrower than the documented-symbol drift gate the roadmap still defers: it runs the code, it does not read the markdown.
- Nothing was added to `@zvenigora/ng-eval-core` or `@zvenigora/ng-eval-signals`; both are consumed at their published surfaces.
