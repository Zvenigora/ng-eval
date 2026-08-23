# Phase 6 Plan — the `/signals` entry point (`@zvenigora/ng-eval-forms/signals`)

**Date**: August 23, 2026
**Revision**: 1 — initial plan, written against `13bec97`. Five of the six questions raised
while drafting were settled before this was committed and are recorded as decisions in § 8;
§ 8.4 (arrays) is the one still open. Two placement calls go opposite ways and § 3.4.1
states the discriminator, because the pair reads as inconsistent otherwise.
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`), **published at
0.1.0**. This phase adds a third entry point to a released package; it does not create a
library.
**Depends on**: `@zvenigora/ng-eval-core` 0.3.0 and `@zvenigora/ng-eval-signals` 0.1.0,
both consumed as published — and on `@zvenigora/ng-eval-forms` 0.1.0's own shared core,
which is the new constraint this phase has and no previous phase did.
**Source**: [`ROADMAP.md`](../../ROADMAP.md) § Phase 6, and
[`phase-4-plan.md`](phase-4-plan.md) § 9 / § 9.1 — the design on paper.
**Angular floor**: `@angular/forms/signals` requires **Angular 22**. Verified against the
installed `@angular/forms` 22.0.8, whose `exports` map carries `./signals` and
`./signals/compat`.
**Objective**: Translate a runtime string into a Signal Forms `LogicFn`, so the same rules
`/reactive` drives through `FormGroup` drive `hidden`, `text` and `disabled` through
Angular's own schema — without going through `createEvalSignal`, and therefore without
inheriting its scope containment.

---

## 0. What this entry point is for, stated once

[`phase-4-plan.md`](phase-4-plan.md) § 0 states the library's premise and it is unchanged:
the condition is a **string, resolved at runtime**, for forms served by an API, authored in
a builder UI, or versioned separately from the application.

What changes here is who owns the reactivity. On `/reactive` this library builds the
reactive graph itself — a mirror per control, an `EvalSignal` per rule, a `destroy()` the
consumer calls. On `/signals` Angular owns all of it. The adapter's whole job is to hand
Angular a closure:

```ts
hidden(p.country, (ctx) => !toVisible(evaluate('country === "US"', ctx)));
```

Everything else in this plan follows from one property of that line: **Angular decides when
it runs, how often, and in what reactive context.** We supply a function; we do not supply a
`computed()`, we do not own a `DestroyRef`, and we cannot count our own recomputes.

**If a consumer's conditions are known at compile time, they should write the `LogicFn`
themselves and not install this.** Same sentence as § 0 of Phase 4, and it matters more
here, because on this path the thing we replace is four words of TypeScript.

---

## 1. Current state of the code

### 1.1 What exists today

`modules/eval-forms/` ships two entry points, both released in 0.1.0:

| Entry point | Files | Exported |
| ----------- | ----- | -------- |
| `@zvenigora/ng-eval-forms` | `src/lib/{coercion,error-policy,field-context}.ts` | `toVisible`, `toText`, `createFieldContext`, `ExpressionErrorPolicy` |
| `@zvenigora/ng-eval-forms/reactive` | `reactive/src/lib/{control-source,field-schema}.ts` | `createControlSource`, `bindFieldProperties`, `FieldSchema`, `FieldProperties`, `FormBinding` |

There is no `modules/eval-forms/signals/`. The build produces
`dist/modules/eval-forms/fesm2022/zvenigora-ng-eval-forms.mjs` (7,096 bytes) and
`…-reactive.mjs` (25,748 bytes), with an `exports` map carrying `.` and `./reactive`.

`applyErrorPolicy` **does not exist**. `error-policy.ts` ships the `ExpressionErrorPolicy`
type and its own docblock says the helper is deferred to this phase, which is its only
caller.

### 1.2 Findings that shape the design

Each verified against the installed Angular 22.0.8 type definitions
(`node_modules/@angular/forms/types/`), not from recollection. Line numbers are
`_structure-chunk.d.ts` unless stated.

**1.2.1 `LogicFn` is exactly what § 9 assumed.** `:723`:

```ts
type LogicFn<TValue, TReturn, TPathKind extends PathKind = PathKind.Root> =
  (ctx: FieldContext<TValue, TPathKind>) => TReturn;
```

Synchronous, one argument, no injection context promised. This is the whole integration
surface, and it is compatible with `eval-core`'s synchronous walk without adaptation.

**1.2.2 `valueOf` still takes a compile-time token — § 9's premise holds.** `RootFieldContext`
(`:779`) exposes `valueOf<PValue>(p: SchemaPath<PValue, SchemaPathRules>): PValue` at `:787`.
A `SchemaPath` is produced by the schema builder, not addressable by string. So a rule that
names `country` as text cannot reach `ctx.valueOf`, exactly as § 9 said.

**1.2.3 But `FieldContext` carries three runtime-addressable members § 9 did not account
for.** `:781-794`:

- `readonly value: Signal<TValue>` — the current field's value, reactive.
- `readonly state: ReadonlyFieldState<TValue>` — see 1.2.4.
- `readonly fieldTree: ReadonlyFieldTree<TValue>` — the current field's node.
- `readonly pathKeys: Signal<readonly string[]>` — the keys from root to here.

`ChildFieldContext` (`:802`) adds `key: Signal<string>`; `ItemFieldContext` (`:811`) adds
`index: Signal<number>`.

**1.2.4 Every form-state key Phase 4 deferred is a `Signal` here.** `ReadonlyFieldState`
exposes `value`, `controlValue`, `disabled`, `readonly`, `required`, `touched`, `dirty`,
`hidden`, `valid`, `invalid`, `pending`, `submitting`, `errors`, `errorSummary`,
`disabledReasons`, `name`, `keyInParent`, `min`/`max`/`minLength`/`maxLength`/`pattern` —
all `Signal<…>`. [`ROADMAP.md`](../../ROADMAP.md) narrowing 2 called form-state keys
"unresolved rather than merely unbuilt" for `/reactive`, where they are not signal-backed.
**On this path they are.** That does not put them in scope (§ 2), but it changes the reason:
here it is a scope decision, not a mechanism gap.

**1.2.5 `FieldTree` is string-indexable and iterable at runtime.** `:208` makes a
`FieldTree` callable — `field()` returns the `FieldState` — and `:224` defines `Subfields`
as a mapped type **plus** `[Symbol.iterator](): Iterator<[string, MaybeFieldTree<…>]>`. So
from a `FieldTree` node one can enumerate `[key, childNode]` pairs at runtime and call each
child to get its state. This is a second candidate source, and § 3.2 is the fork it opens.

**1.2.6 `form()` does not copy the model.** `:1860`,
`form<TModel>(model: WritableSignal<TModel>): FieldTree<TModel>`, documented as using "the
given model as the source of truth" and not maintaining its own copy. So the model signal
and the field tree are two views of one thing, which is what makes § 3.2's fork a genuine
choice rather than a correctness question.

**1.2.7 `hidden`, `disabled` and `readonly` all take a `LogicFn`; `disabled` also takes a
string.** From `signals.d.ts`:

```ts
declare function hidden<TValue, TPathKind>(path, logic: LogicFn<TValue, boolean, TPathKind>): void;
declare function disabled<TValue, TPathKind>(path, logic?: string | LogicFn<TValue, boolean | string, TPathKind>): void;
declare function readonly<TValue, TPathKind>(path, logic?: LogicFn<TValue, boolean, TPathKind>): void;
```

`disabled`'s `boolean | string` return is a **reason**, surfaced through
`state.disabledReasons`. Noted because a rule returning the string `'false'` disables the
field with reason `"false"` — the `toVisible` truthiness trap (Phase 4 § 3.6) in a new shape.

**1.2.8 `text` has a real home: `createMetadataKey` + `metadata`.** `:966` and `:978`:

```ts
declare function createMetadataKey<TWrite>(): MetadataKey<Signal<TWrite | undefined>, TWrite, TWrite | undefined>;
declare function createMetadataKey<TWrite, TAcc>(reducer: MetadataReducer<TAcc, TWrite>): MetadataKey<Signal<TAcc>, TWrite, TAcc>;
declare function metadata<TValue, TKey, TPathKind>(path, key: TKey, logic: LogicFn<TValue, MetadataSetterType<TKey>, TPathKind>): TKey;  // :855
```

So `text` is `metadata(p.x, TEXT, logicFn)` with `TEXT = createMetadataKey<string>()`, read
back off the field's state. No parallel mechanism, per Phase 4 § 3.2's failure mode.

**1.2.9 The containment primitives are all published and none of them is Angular.** From
`dist/modules/eval-core/types/zvenigora-ng-eval-core.d.ts`:

- `declare const call: (fn: stateCallback, state: EvalState) => unknown | undefined` (`:1851`)
- `static fromContext(context?, options?, isAsync?): EvalState` on `EvalState`
- `get scopes(): Readonly<Stack<Context>>` and `pop(): void` on `EvalContext`
- `get length(): number` on `Stack`

All four are value exports of the FESM. **`createState` is not** — it is a method on
`BaseEval`, so `CompilerService.createState` drags in Angular DI, while
`EvalState.fromContext` does not. That single fact is what makes § 3.3's core placement
buildable at all, and § 9's sketch (`compiler.createState(context)`) is therefore not the
only shape available.

**1.2.10 `createEvalSignal`'s write-error bypass does not travel with the type.**
`modules/eval-signals/src/lib/eval-signal.ts:353` re-throws `SignalContextWriteError`
regardless of `onError`. That behaviour lives **inside `createEvalSignal`**, which this path
never calls. `applyErrorPolicy` must re-implement it or a write violation becomes a blank
field — see § 3.4.

### 1.3 What this plan relies on beyond `phase-4-plan.md` § 9

§ 9 is a sketch, not a contract, and this plan departs from it in three places. Stated here
so the departures are found by reading rather than by diffing:

1. **§ 9's sketch calls `compiler.createState(context)`.** This plan uses
   `EvalState.fromContext` where the choke point does not otherwise need Angular (1.2.9).
2. **§ 9 assumes the source must come from the model signal.** 1.2.5 opens a second route;
   § 3.2 decides between them.
3. **§ 9 does not mention `readonly`.** 1.2.7 shows it is available on the same terms as
   `hidden`. It is out of scope (§ 2) but for a scope reason, not an absence.

Beyond § 9, this plan relies on these published-but-unpromised behaviours, the same way
Phase 4 § 1.3 had to:

- `EvalContext.scopes.length` and `EvalContext.pop()` behave as a stack (1.2.9).
- `EvalState.fromContext` short-circuits on identity for an `EvalContext`, per
  [`CLAUDE.md`](../../CLAUDE.md) "Context resolution", so one context backs many states.
- `createSignalContext`'s `lookups` resolver unwraps signals on read — the property
  `createFieldContext` already composes on.

---

## 2. Scope

### In scope

- A third entry point, `@zvenigora/ng-eval-forms/signals`, shipped from the same package.
- A **single choke point** for the walk, with scope containment inside it (§ 3.3) — the
  precondition [`phase-4-plan.md`](phase-4-plan.md) § 9.1 states.
- `applyErrorPolicy`, written against the shipped `ExpressionErrorPolicy`, with the
  `SignalContextWriteError` bypass (§ 3.4).
- A source adapter turning the consumer's form into a `SignalContextSource` (§ 3.2).
- `hidden`, `text` and `disabled` as string-driven rules (§ 3.5).
- README entry-point table row, CHANGELOG entry, and a minor release.

### Out of scope (deliberately deferred)

- **Any change to `eval-core` or `eval-signals`.** Consumed as published;
  [`.claude/skills/step/SKILL.md`](../../.claude/skills/step/SKILL.md) makes a step that
  needs one a stop-and-replan condition. The § 6 gate rows detect a step that reached in.
- **Any change to `/reactive`'s behaviour or to an existing exported symbol's shape.**
  This is the constraint no previous phase had: 0.1.0 is on npm. Additive work on the shared
  core is in scope when a section here calls for it; a shape change is a stop-and-replan.
- **`readonly`, `required`, and validators.** Available (1.2.7) and not built. `required`
  and validators affect validity rather than presentation, which
  [`ROADMAP.md`](../../ROADMAP.md) already defers; `readonly` is new surface with no
  demonstrated demand.
- **Form-state keys in the expression context** (`touched`, `dirty`, `valid`, …). 1.2.4
  shows the mechanism exists here and § 3.2's route B would reach it. **Settled out of scope
  in § 8.2, and recorded as a Phase 7 candidate covering both adapters together**: an
  expression must mean the same thing at both entry points, and `visible: "touched"` working
  under `/signals` while silently resolving `undefined` under `/reactive` is worse than the
  key being unsupported at both. Shipping it here would be shipping the asymmetry.
- **Arrays and nested objects.** `applyEach` and `ItemFieldContext` exist; per-row naming is
  the same unsolved problem as Phase 4's `FormArray` (open question 8.4).
- **Async.** Phase 5, unchanged.
- **Write-back.** [`phase-3-plan.md`](../signals/phase-3-plan.md) § 9.4; § 3.4 keeps it loud.

---

## 3. Design

### 3.1 Where the seam sits

Phase 4 § 3.1 put the shared core at the primary entry point and adapters at subpaths, and
made the core's `@angular/core` import list empty. Both still hold: **measured 0 `@angular/core`
imports in `modules/eval-forms/src/`** at `13bec97`.

The division for this phase:

| Concern | Lives in | Why |
| ------- | -------- | --- |
| `toVisible`, `toText`, `createFieldContext`, `ExpressionErrorPolicy` | core (shipped) | Already published; both adapters use them |
| `applyErrorPolicy` | **core** | Pure function over a shipped type, no Angular — § 3.4 |
| The walk choke point | **adapter** | § 3.3, on a measurement |
| `CompilerService`, `form()`, `hidden`/`metadata`/`disabled` | adapter | Angular DI and `@angular/forms/signals` |
| The source adapter | adapter | § 3.2 |

### 3.2 The source — model signal or field tree

§ 9 assumed the source is built from the `WritableSignal` model the consumer passed to
`form()`. 1.2.5 opens a second route: the root `FieldTree`, which is string-indexable and
iterable at runtime.

| | **A — model signal** | **B — root `FieldTree`** |
| --- | --- | --- |
| What the adapter takes | `WritableSignal<TModel>` | `FieldTree<TModel>` (what `form()` returned) |
| Key → value | `() => model()[key]` | `() => tree[key]()!.value()` |
| Reactive | yes, one signal read | yes, `state.value` is a `Signal` |
| Key set | whatever the model object has | enumerable via `[Symbol.iterator]` |
| Reaches form state (1.2.4) | no | **yes** — `tree[key]()!.touched()` etc. |
| Extra coupling | none beyond `WritableSignal` | the whole `FieldTree` shape |
| Available before `form()` returns | yes | **no** — the schema runs *during* `form()` |

**The last row is decisive and it is a sequencing fact, not a preference.** A schema function
runs while `form()` is constructing the tree, so a rule registered inside the schema cannot
close over `form()`'s return value — it does not exist yet. B would need the source to be
built lazily and read on first `LogicFn` invocation, which is possible but puts a
construction-order hazard on the hot path for a capability (form state) that § 2 puts out of
scope anyway.

**Decision: A, the model signal.** B is not refuted — it is the route form-state keys would
take if § 8.2's Phase 7 candidate is ever built, and this table is where that work starts.

`model()` is read **inside** the resolver, not at construction, so the key set is live in
the same sense `createFieldContext` already is: a key added to the model object resolves on
the next read. Appearance is still not reactive in the `EvalContext` sense — an expression
that read a then-missing key subscribed to nothing — but reading `model()` subscribes to the
model signal itself, so a whole-object replacement (`model.set({…})`) *does* recompute
every rule. That is a difference from `/reactive` worth a spec.

### 3.3 The choke point — core or adapter, measured

[`phase-4-plan.md`](phase-4-plan.md) § 9.1 states the precondition and explicitly leaves the
placement to this phase. It is not settled here by argument. Both placements were built
against a realistic helper and the difference measured.

**The helper, as built for the measurement** — the shape both placements share:

```ts
export const evaluateRule = (
  compiled: CompiledRule,
  context: EvalContext,
  options?: EvalOptions
): unknown => {
  const depth = context.scopes.length;
  const state = EvalState.fromContext(context, options);
  try {
    return call(compiled, state);
  } finally {
    while (context.scopes.length > depth) {
      context.pop();
    }
  }
};
```

Placed at `modules/eval-forms/src/lib/evaluate-rule.ts` and exported from
`src/public-api.ts`, then built with `nx run eval-forms:build:production` and compared
against the unmodified baseline. The probe was reverted; the numbers are what it produced.

| Measurement | Core placement | Adapter placement | Separates? |
| ----------- | -------------- | ----------------- | ---------- |
| `@angular/core` imports in `modules/eval-forms/src/` | **0** | 0 (core untouched) | **no** |
| `/reactive` FESM size | 25,748 B — **unchanged** | 25,748 B | **no** |
| Occurrences of the helper in `/reactive`'s FESM | **0** | 0 | **no** |
| Primary FESM size | 7,096 → **7,487 B** (+391) | 7,096 B | marginal |
| Symbol in the primary entry point's published `.d.ts` | **`declare const evaluateRule` added** | absent | **yes** |
| Can the choke point be module-private? | **no** | **yes** | **yes** |

**Three of the four hypotheses that looked like discriminators are not.** In particular the
one that motivated the question — that a core-placed helper would be dead weight in
`/reactive`'s bundle — is false: ng-packagr compiles each entry point separately and the
helper does not appear in `/reactive`'s FESM at all, at zero bytes. Anyone re-deriving this
by reasoning will get it wrong, which is why it is a table.

**What does separate them is the published surface, twice over.**

- Barrels re-export whole modules (`export * from './lib/…'`), so a helper in the core
  reachable from `src/public-api.ts` **is published**, permanently, on an entry point
  already released at 0.1.0. The measurement shows `declare const evaluateRule` appearing in
  `dist/modules/eval-forms/types/zvenigora-ng-eval-forms.d.ts`.
- In the adapter it can live at `signals/src/lib/evaluate-rule.ts` and simply not be listed
  in `signals/src/public-api.ts` — **module-private to the entry point**, changeable by any
  later phase without a release.

That second row is the one that matters for the invariant itself. § 9.1's requirement is
that there be no second path to the walk. A public `evaluateRule` guarantees a second path
*by existing*: any consumer can call it with a hand-built `EvalContext`, and the containment
guarantee becomes a documented API this package owes forever. Module-private, the set of
callers is the set of files in `signals/src/lib/`, which is checkable by grep in one
directory.

**Decision: the adapter.** Neither placement can stop a rule inside the adapter from
importing `call` directly — that is equivalent, and § 6's grep is the gate for it either
way. What is not equivalent is who else can reach the walk, and how permanent the answer is.

**What would have flipped it:** if `/reactive` needed the same containment, the core
placement would win on duplication. It does not — `/reactive` goes through
`createEvalSignal`, which contains scopes itself, which is § 9.1's own revision note.

### 3.4 `applyErrorPolicy`, and the error that must not be caught

`applyErrorPolicy` is written this phase against the shipped `ExpressionErrorPolicy`
(`'throw' | 'undefined' | ((error: unknown) => unknown)`), default `'undefined'`.

It goes in the **core**, unlike the choke point, and the difference is deliberate: it is a
pure function over a type the core already publishes, with no Angular and no `EvalContext`,
and both adapters could reasonably use it. § 3.3's decisive argument does not apply — there
is no invariant that a second caller would break.

**It must re-throw `SignalContextWriteError` in every mode** (1.2.10). On `/reactive` this
came free from `createEvalSignal`; here it does not exist unless written. The failure it
prevents: an assigning expression is illegal on every recompute with every dataset — a bug
in the rule's syntax — and a default of `'undefined'` would render it as a permanently blank
field with nothing in the console.

```ts
export const applyErrorPolicy = <T>(run: () => T, policy: ExpressionErrorPolicy = 'undefined'): T | undefined => {
  try {
    return run();
  } catch (error) {
    if (error instanceof SignalContextWriteError) throw error;   // never policy-routed
    if (policy === 'throw') throw error;
    if (policy === 'undefined') return undefined;
    return policy(error) as T | undefined;
  }
};
```

**This makes the core import a value from `eval-signals`, and that is the point rather than
a cost.** `SignalContextWriteError` is a class; `instanceof` needs the constructor, not the
type. `field-context.ts` already imports `createSignalContext` from the same package, so
there is no new dependency edge — and the value import **is** the enforcement that
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s
`/signals` Critical item 2 asks for. A type-only import would compile and the guard would
silently never fire, so the import's form is load-bearing: a step that "tidies" it to
`import type` disables the bypass with a green suite. Step 3's exit criterion is what
catches that.

#### 3.4.1 Why this is the opposite call from § 3.3, which it superficially contradicts

Two placement decisions in one plan, going opposite ways, and the pair reads as inconsistent
unless the discriminator is stated. It is not "core by default" or "adapter by default" — it
is **what the symbol grants a caller who reaches it**.

- `evaluateRule` **is a second path to the walk.** Publishing it hands any consumer the
  ability to run an expression against a hand-built `EvalContext`, which is precisely the
  thing § 9.1 requires there be only one of. The published surface *is* the bypass, so
  keeping it module-private is the invariant, not tidiness.
- `applyErrorPolicy` is a pure function over an error and a policy. It takes no
  `EvalContext`, holds no compiled callback and cannot reach a walk. Publishing it grants a
  caller nothing they could not write themselves in four lines, so it costs nothing — and
  it buys the thing duplication would lose: **one implementation of the write-error bypass
  for both adapters.** In the adapter, `/reactive`'s eventual version drifts from
  `/signals`', and the two would disagree about the one error that must never be swallowed.

So: a symbol whose reachability is itself the risk stays private; a symbol whose only risk
is divergence goes in the core where there can be exactly one of it.

### 3.5 Which properties ship

| This library | Registers | Coercion | Note |
| ------------ | --------- | -------- | ---- |
| `evalVisible` | `hidden(p.x, ctx => !toVisible(…))` | `toVisible` (shipped) | Inverted — § 3.5.1 |
| `evalText` | `metadata(p.x, TEXT, ctx => toText(…))` | `toText` (shipped) | `TEXT = createMetadataKey<string>()` (1.2.8) |
| `evalDisabled` | `disabled(p.x, ctx => …)` | `toVisible`'s rule | 1.2.7 — Angular's returns `boolean \| string` |

#### 3.5.1 Naming — `eval<Property>`, registering Angular's own rule

Settled here rather than deferred, because it interacts with
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s `/signals`
item 4: use Angular's own primitives, do not build a second mechanism beside them. Naming is
where that goes wrong first, since these functions sit in a consumer's schema literally
beside `hidden`, `disabled`, `required` and `metadata`:

```ts
const s = schema<Model>((p) => {
  required(p.email);                              // Angular's
  hidden(p.state, ctx => !ctx.valueOf(p.isUs));   // Angular's, a closure
  evalVisible(p.city, 'country === "US"');        // ours, a string
});
```

Three rules, and each earns its place:

1. **One call per Angular rule, never an aggregate.** A single
   `evalRules(p.x, { visible, text, disabled })` was the alternative and is rejected: it
   would register three different Angular primitives behind one name, hiding which one each
   property maps to. That is item 4's failure mode expressed as an API — a consumer reading
   the schema could no longer see that `text` *is* `metadata` and `visible` *is* `hidden`.
2. **The `eval` prefix, for provenance and collision-safety.** The prefix says the argument
   is a string evaluated at runtime rather than a closure, which is the one thing a reader
   must know at the call site. A bare `visible` would not collide with Angular's exports
   today, but `hidden`, `disabled`, `readonly` and `required` are all taken, and a library
   whose names sit in someone else's namespace should not bet on the remainder staying free.
3. **Named after the property, not after Angular's rule — so the expression ports.**
   `evalVisible` registers `hidden`. That mismatch is deliberate: § 8.2's principle is that
   an expression means the same thing at both entry points, and `/reactive` already ships
   `visible`. Naming ours `evalHidden` would mirror Angular but force the consumer to invert
   the expression when moving a schema between adapters — the same rule string producing the
   opposite result, which is exactly the class of bug § 8.2 exists to prevent.

   **The inversion therefore lives inside `evalVisible`**, once, next to `toVisible`, rather
   than in every consumer's expression. It is worth a loud line in the README precisely
   because `evalVisible` and `hidden` will appear adjacent in real schemas with opposite
   polarity.

`evalDisabled` has no such tension: `/reactive` does not ship `disabled` at all, and
Angular's polarity is already the one an author expects.

`disabled` is the property Phase 4 deferred *to here*, and none of the three problems that
blocked it under Reactive Forms exists: it does not emit on a value stream, it does not
remove the value from a parent aggregate, and it is declarative rather than a write.

**The one new decision is its return type.** `boolean | string` means a truthy string is
both "disabled" and "the reason". A rule returning `'false'` would disable the field with
the reason `"false"` — the same truthiness trap `toVisible` documents. `evalDisabled` coerces
to `boolean` by `toVisible`'s rule and does **not** surface reasons (§ 8.3): passing the
string through is free to implement and would make that trap a documented feature. Real
Angular capability is being dropped, and § 8.3 records the shape that would bring it back.

### 3.6 Lifetime — there is nothing to destroy, and that is the finding

Phase 4 § 3.7 is N × M `EvalSignal`s and a `destroy()` the consumer calls. Here:

- No `EvalSignal` is created. No `DestroyRef` registration, no `destroy()`.
- Angular owns the `FieldTree`'s lifetime and the `LogicFn`s die with the schema.

What the adapter **does** retain is one `EvalContext` per field, plus one compiled callback
per rule, held in whatever structure registers the rules. That structure is closed over by
the `LogicFn`s, so it lives exactly as long as the schema does — which is correct and needs
no teardown API. § 6 requires the plan to be able to state the count and lifetime from the
diff; that is the whole statement.

**One context per field, never one shared across fields**, for Phase 4 § 3.4.1's reason,
which is stronger here: § 3.3's containment bounds a leak to one walk, but a shared context
would put field A's leak in front of field B's source key for the life of the form.

### 3.7 The Angular 22 boundary

`peerDependencies` are per package, so the manifest cannot narrow to `>=22` without breaking
`/reactive` consumers on 19–21. The loud failure for a 19–21 consumer importing `/signals` is
inherited from Angular's own `exports` map (`Cannot find module '@angular/forms/signals'`).

**The checkable invariant is confinement**: `@angular/forms/signals` must be imported only
under `modules/eval-forms/signals/`. The workspace is on 22.0.8, so a leak into the shared
core or `/reactive` compiles green here and fails in the consumer's build. § 6 makes it a
grep.

---

## 4. Work breakdown

Each step leaves `eval-core`, `eval-signals` and `eval-forms` green on lint, test and build.

### Step 1 — The entry point, the manifest, and a green build

The unproven-mechanism step, exactly as Phase 4 step 1 was — and its findings apply
verbatim, so this step should re-read them rather than rediscover them.

- **New**: `modules/eval-forms/signals/ng-package.json` —
  `{ "lib": { "entryFile": "src/public-api.ts" } }` against `ng-entrypoint.schema.json`.
- **New**: `modules/eval-forms/signals/src/public-api.ts`.
- **New**: the smallest real runtime symbol — a type-only barrel does not satisfy
  ng-packagr. `signals/src/lib/text-key.ts` exporting
  `export const TEXT = createMetadataKey<string>();` is the natural one: it is real, it is
  needed by step 4, and it forces the `@angular/forms/signals` import to exist so the § 6
  confinement grep has something to pass on.
- **Edit**: `modules/eval-forms/tsconfig.lib.json` — widen `include` to reach `signals/`
  **and** widen `exclude` with `signals/**/*.spec.ts` and `signals/**/*.test.ts` in the same
  edit. Phase 4 step 1's finding: `include` widened alone pulls the specs into the library
  compilation where `types: []` leaves `describe` undeclared.
- **Edit**: `modules/eval-forms/tsconfig.spec.json` — same widening for specs.
- **Edit**: `tsconfig.base.json` — add
  `"@zvenigora/ng-eval-forms/signals": ["./modules/eval-forms/signals/src/public-api.ts"]`.
- **New**: a co-located spec, test-first.
- **Exit**:
  - all three projects green on lint, test and build;
  - `dist/modules/eval-forms/package.json`'s `exports` map has a `./signals` key whose
    `types` and `default` name emitted files, and
    `dist/modules/eval-forms/signals/package.json` names the same pair;
  - **a spec imports through `@zvenigora/ng-eval-forms/signals`** — and per Phase 4 step 1's
    verified table, that spec must live under *another* entry point's folder, because
    `@nx/enforce-module-boundaries` rejects a package-name self-import within one entry
    point and permits it across;
  - `/reactive`'s FESM is byte-identical to its 25,748-byte baseline. Nothing in this step
    touches it, and that is the cheapest possible check that the shared core did not move.

### Step 2 — The source adapter

- **New**: `signals/src/lib/model-source.ts` — § 3.2 decision A, `WritableSignal<TModel>`
  → `SignalContextSource`, reading `model()` inside the resolver.
- **New**: co-located spec, test-first, including the negative case: a key the expression
  never named changes and the rule does **not** re-run.
- **Exit**: the source composes with the shipped `createFieldContext` and resolves a key;
  the recompute-count harness of § 6.1 exists and is used here first.

### Step 3 — The choke point and the error policy

The two Critical items, together because § 3.3's containment is only testable through a
walk and § 3.4's bypass is only testable through the same walk.

- **New**: `signals/src/lib/evaluate-rule.ts` — module-private, **not** listed in
  `signals/src/public-api.ts` (§ 3.3).
- **New**: `src/lib/error-policy.ts` gains `applyErrorPolicy` (§ 3.4) — the one additive
  change to the published core this phase makes.
- **Exit**: a throwing arrow body leaves `context.scopes.length` at its pre-walk value,
  asserted directly; a second rule on the same field resolves its own source key afterwards;
  an assigning expression throws `SignalContextWriteError` **through** a `'undefined'`
  policy; `grep -rn "call(" modules/eval-forms/signals/` has exactly one hit.

### Step 4 — `evalVisible` and `evalText`

- **New**: `signals/src/lib/rules.ts` — the two registrars, naming per § 3.5.1.
- **Exit**: an end-to-end spec builds a real `form()` with a schema, changes the model, and
  asserts `field().hidden()` and the `TEXT` metadata signal follow — plus the negative case,
  a model key the expression never named. One assertion must pin that `evalVisible` inverts,
  i.e. that a *true* expression yields `hidden() === false`; without it the polarity is
  untested and a sign flip is invisible.

### Step 5 — `evalDisabled`

- **Edit**: `signals/src/lib/rules.ts`.
- **Exit**: as step 4, plus a spec pinning that a rule yielding the string `'false'`
  disables the field (§ 3.5's trap), so the behaviour is recorded rather than discovered.

### Step 6 — Docs, README and release

- **Edit**: `modules/eval-forms/README.md` — the `/signals` row stops saying "designed but
  not built"; the Angular 22 requirement stated at the entry-point table, not only in prose.
- **Edit**: root `CHANGELOG.md` — `## [eval-forms 0.2.0]`, naming the package.
- **Edit**: `modules/eval-forms/package.json` — version only.
- **Exit**: `readme-examples.spec.ts` covers the new examples; all gates green.

---

## 5. Public API surface added

At `@zvenigora/ng-eval-forms/signals`:

| Symbol | Shape |
| ------ | ----- |
| `createModelSource` | `<T>(model: WritableSignal<T>, options?: EvalOptions) => SignalContextSource` |
| `TEXT` | `MetadataKey<Signal<string \| undefined>, string, string \| undefined>` |
| `evalVisible` | `(path, expression: string, options?) => void` — registers Angular's `hidden`, inverted (§ 3.5.1) |
| `evalText` | `(path, expression: string, options?) => void` — registers `metadata(path, TEXT, …)` |
| `evalDisabled` | `(path, expression: string, options?) => void` — registers Angular's `disabled` |

At `@zvenigora/ng-eval-forms` (primary, **additive to a released entry point**):

| Symbol | Shape |
| ------ | ----- |
| `applyErrorPolicy` | `<T>(run: () => T, policy?: ExpressionErrorPolicy) => T \| undefined` |

**Not exported, deliberately**: `evaluateRule` (§ 3.3). Nothing else in `signals/src/lib/`
is exported unless it appears above.

**Imported from `eval-core`**: `EvalContext`, `EvalOptions`, `EvalState`, `call`,
`CompilerService`. From `eval-signals`: `SignalContextSource`, `SignalContextWriteError`.
Anything beyond these two lists is a finding.

---

## 6. Verification gates

Every step: `npx nx run-many -t lint test build`, unfiltered. Plus:

1. **`/signals` shipped**: `dist/modules/eval-forms/package.json` `exports` has `./signals`
   with `types` and `default` naming emitted files; `signals/package.json` agrees.
2. **Angular 22 confinement**: every `@angular/forms/signals` hit under
   `modules/eval-forms/` is inside `modules/eval-forms/signals/`.
3. **One path to the walk**: exactly one `call(` in `modules/eval-forms/signals/`, in
   `evaluate-rule.ts`.
4. **`/reactive` unmoved**: its FESM stays at 25,748 bytes until step 6, and its specs stay
   green throughout.
5. **Published core surface**: `dist/modules/eval-forms/types/zvenigora-ng-eval-forms.d.ts`
   gains `applyErrorPolicy` and **nothing else**.

### 6.1 Specs go through the end-to-end path

As Phase 4 § 6.1, with one substitution that is not optional. **Reactivity is asserted by
counting rule invocations around a real `form()`, never by inspecting the adapter's API** —
and the `/reactive` harness does not port, because there is no `EvalSignal` whose recomputes
can be counted (§ 3.6). The count is of `LogicFn` invocations, or of Angular's own
re-derivation read back through `field().hidden()`.

Both vacuity probes from
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md) apply: break the
unwrap, and make the resolver over-subscribe. A spec suite that survives both has no
reactivity coverage regardless of what it reports.

---

## 7. Risks

| # | Risk | Mitigation |
| - | ---- | ---------- |
| 1 | A rule reaches the walk without `evaluateRule`, silently voiding containment | § 6 gate 3 — one `call(` in the directory |
| 2 | `applyErrorPolicy` swallows `SignalContextWriteError` via a type-only import (§ 3.4) | Step 3 exit criterion asserts the re-throw through a `'undefined'` policy |
| 3 | `@angular/forms/signals` leaks into the core or `/reactive`; green here, broken for a 19–21 consumer | § 6 gate 2 |
| 4 | An additive core change alters `/reactive` behaviour; no gate row moves because it is one project | § 6 gates 4 and 5, plus reading the diff |
| 5 | Signal Forms is new; an API used here changes in 22.x | Everything relied on is tagged `@publicApi 22.0` (1.2.1–1.2.8); pin nothing, re-verify at step 4 |
| 6 | The escaped-closure residual — an arrow that outlives the walk pushes and pops outside any frame | Unsolved in both libraries, not this phase's; stated so it is not mistaken for a regression |

---

## 8. Open questions

Five were raised in revision 1's draft and settled before it was committed; the reasoning is
kept because each is a decision a later phase could reasonably want to revisit. One remains
open and is marked as such.

**8.1 — Where `applyErrorPolicy` lives. Settled: the core.** The `instanceof
SignalContextWriteError` value import is not a cost to be minimised — it *is* the
enforcement the reviewer's `/signals` Critical item 2 asks for, and a type-only import would
disable it silently. In the core there is one implementation for both adapters; in the
adapter, `/reactive`'s eventual version drifts from `/signals`', and the two end up
disagreeing about the one error that must never be swallowed. § 3.4.1 records why this is the
opposite placement call from § 3.3 and what actually separates the two cases: `evaluateRule`
published *is* a second path to the walk, while `applyErrorPolicy` cannot reach a walk at
all.

**8.2 — Form-state keys (`touched`, `dirty`, `valid`, …). Settled: out of scope, and a
Phase 7 candidate covering both adapters together.** The mechanism exists here (1.2.4) and
does not exist at `/reactive`, so shipping it now would ship an asymmetry:
`visible: "touched"` would work under `/signals` and silently resolve `undefined` under
`/reactive`, which is worse than the key being unsupported at both. An expression must mean
the same thing at both entry points. **Phase 7 is not yet in
[`ROADMAP.md`](../../ROADMAP.md)** — adding it is a separate docs change, not this phase's.

**8.3 — Should `disabled` surface its reason? Settled: no, this phase.** Angular's `disabled`
accepts `boolean | string`, the string becoming a reason on `state.disabledReasons` (1.2.7).
`evalDisabled` coerces to boolean by `toVisible`'s rule. Passing the string through is free
in implementation and re-introduces the `'false'` trap as a *feature* — a rule yielding the
string `'false'` would disable the field with reason `"false"`. Revisit only with a schema
shape that separates the two, not by widening the return type.

**8.4 — Arrays. Still open, and the only one.** `applyEach` and `ItemFieldContext` exist, and
a per-row rule would read `ctx.index` (1.2.3). Unlike Phase 4's `FormArray`, the shape is
obvious. § 2 leaves it out; whether it earns a step in *this* phase rather than a later one
is a scope call I have not made. Step 4 is where it would attach.

**8.5 — Naming. Settled: `evalVisible` / `evalText` / `evalDisabled`.** § 3.5.1 carries the
three rules and the argument: one call per Angular rule rather than an aggregate, an `eval`
prefix for provenance and collision-safety, and naming after the property rather than
Angular's rule so an expression ports between adapters unchanged — which puts the
`visible`/`hidden` inversion inside the library instead of in every consumer's expression.

**8.6 — Version. Settled: 0.2.0.** A new entry point is additive but not a patch.
