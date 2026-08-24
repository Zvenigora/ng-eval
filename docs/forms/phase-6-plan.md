# Phase 6 Plan — the `/signals` entry point (`@zvenigora/ng-eval-forms/signals`)

**Date**: August 23, 2026
**Revision**: 2 — amended after review, before step 1. Nine changes; four are design
reversals and the rest are corrections of fact or of a gate.

Load-bearing, in dependency order:

1. **§ 3.2.1 is new: the registrars are produced by a factory**, `createExpressionRules(model,
   options?)`. Revision 1 specified them as free functions `(path, expression, options?)`
   with no parameter carrying the source — and a `LogicFn` cannot recover it, because
   `RootFieldContext` has no root or parent handle. The rules could not have reached a
   sibling value at all.
2. **§ 3.2's source is a snapshot record of per-key `computed`s**, and revision 1's live
   key set is **withdrawn**. Its notation `() => model()[key]` was not merely shorthand: a
   bare function in a `SignalContextSource` is passed through *untouched*
   (`signal-context.ts:198-201`), so the expression would have compared a function object and
   frozen silently — the exact failure `field-context.ts:66-72` already records.
3. **§ 6.1 stops offering two harnesses as equivalent.** The `field().hidden()` read-back
   cannot see over-subscription, because Angular's value equality masks a re-derivation that
   returns the same boolean. It proves wiring and polarity; only a `LogicFn` invocation count
   proves reactivity, and the negative case now requires it by name.
4. **§ 1.2.7 cited `@deprecated` overloads.** `hidden`, `disabled` and `readonly` each ship
   a `{ when: … }` config overload tagged `@publicApi 22.0` and a positional overload tagged
   `@deprecated`. Revision 1 quoted the second of each pair and § 7 risk 5 then claimed
   everything relied on was `@publicApi`. § 7 records how that happened.
5. **§ 3.1 drops `CompilerService`.** `parse`, `compile` and `defaultParserOptions` are all
   published free functions, so the whole string → callback → walk chain needs no Angular
   DI — which means the registrars work at module scope, where `inject()` would have thrown
   NG0203.

Also: § 4 step 1 gains the `tsconfig.spec.json` edit without which its test target cannot
pass (§ 4, C5); § 6 gate 3's grep is widened past `call(`; § 3.6 answers what happens to a
reusable schema; § 8.3 is revisited and **re-affirmed on corrected grounds**.

**Revision**: 1 — initial plan, written against `13bec97`.
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
hidden(p.country, { when: (ctx) => !toVisible(evaluate('country === "US"', ctx)) });
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

**1.2.3 But `FieldContext` carries four runtime-addressable members § 9 did not account
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

**1.2.7 `hidden`, `disabled` and `readonly` each ship two overloads, and only the config one
is supported.** From `signals.d.ts` — the `@publicApi 22.0` tag sits on the first of each
pair, `@deprecated` on the second:

```ts
// supported — signals.d.ts:32-34, :66-68, :92-94
declare function hidden<TValue, TPathKind>(path, config: { when: LogicFn<TValue, boolean, TPathKind> }): void;
declare function disabled<TValue, TPathKind>(path, config?: { when?: string | LogicFn<TValue, boolean | string, TPathKind> }): void;
declare function readonly<TValue, TPathKind>(path, config?: { when?: LogicFn<TValue, boolean, TPathKind> }): void;

// @deprecated "Passing a function directly to `hidden` is deprecated. Use `{ when: ... }` instead."
declare function hidden<TValue, TPathKind>(path, logic: LogicFn<TValue, boolean, TPathKind>): void;
```

Two details that matter downstream. **`hidden`'s `when` is required** while `disabled`'s and
`readonly`'s are optional — the whole config is optional there, since `disabled(p.x)`
disables unconditionally. And **`disabled`'s `boolean | string` return is a reason**,
surfaced through `state.disabledReasons` as `DisabledReason { fieldTree, message? }`
(`_structure-chunk.d.ts:118`). A rule returning the string `'false'` therefore disables the
field with reason `"false"` — the `toVisible` truthiness trap (Phase 4 § 3.6) in a new shape.

**The config overload does *not* separate the condition from the reason**: `when` is one
field carrying both. That is why § 8.3's re-affirmation does not rest on it.

`metadata` (`_structure-chunk.d.ts:855`) has no deprecated counterpart, so `evalText` is
unaffected.

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

**1.2.10 The whole string → walk chain is published as free functions, so no Angular DI is
needed anywhere.** Extending 1.2.9's search past `call`:

```ts
declare const parse: (expr: string, options: ParserOptions) => Program | AnyNode | undefined;  // :1804
declare const compile: (node: AnyNode | undefined) => stateCallback;                            // :1836
declare const defaultParserOptions: ParserOptions;                                              // :1427
```

All three are in the FESM's export list. `CompilerService` adds only an LRU over
`parse` + `compile` (10-minute TTL, 200 entries) and its `simpleCall`; this adapter compiles
once per rule at registration and holds the callback, so the cache has nothing to do. § 3.1
therefore drops the service entirely — which also removes an injection-context requirement
the plan never had a story for, and which `inject()` would have turned into NG0203 for a
module-scope schema.

**1.2.11 `createEvalSignal`'s write-error bypass does not travel with the type.**
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
| `parse` + `compile` (at registration), `hidden`/`metadata`/`disabled` | adapter | `@angular/forms/signals` |
| The source adapter and the rule factory | adapter | § 3.2, § 3.2.1 |

**`CompilerService` is not used** (1.2.10). The chain is `parse(expr, defaultParserOptions)`
→ `compile(ast)` at registration, then `EvalState.fromContext` + `call` per invocation, all
free functions. The adapter therefore requires **no injection context**, which is what makes
§ 3.2.1's factory callable from module scope.

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

#### 3.2.1 The registration shape, and the source it binds

These are one decision, not two. The shape determines what can hold the source; what holds
the source determines what the source can be; and that determines what a reactivity spec is
able to assert. Revision 1 settled them separately and got all three wrong.

**No subsection is numbered 3.2.2 here.** `docs/signals/phase-3-plan.md` § 3.2.2 is this
repo's construct-once finding, cited from `CLAUDE.md` and from the code-reviewer, and a
second § 3.2.2 in a sibling plan is the ambiguity § 9.1 already suffers from.

##### The shape — a factory, because a `LogicFn` cannot recover the source

Revision 1 specified the registrars as free functions `(path, expression, options?)`. That
cannot work, and the reason is 1.2.2 and 1.2.3 together: `RootFieldContext` exposes the
*current* field's node plus three compile-time-token accessors, and **no root or parent
handle**. A rule on `p.city` evaluating `country === "US"` has no route to `country` from
inside the `LogicFn`. The source must be closed over at registration or it is unreachable.

```ts
const rules = createExpressionRules(model);            // binds the model, builds the source
const s = schema<Model>((p) => {
  required(p.email);                                   // Angular's
  rules.evalVisible(p.city, 'country === "US"');       // ours
});
const f = form(model, s);
```

This preserves § 3.5.1's naming argument intact — the three registrars are still three
separate functions, one per Angular rule, and destructuring keeps `evalVisible` at the call
site. It is not the aggregate § 3.5.1 rejects: that was one call registering three different
Angular primitives, and this is one factory returning three registrars.

**The factory is per-form, and that is what bounds the context lifetime.** It closes over one
model, so it cannot be shared by two forms with different models. A module-scope schema stays
possible as a function of the rules —
`const makeSchema = (rules) => schema<Model>(p => …)` — which keeps construction per-form
without giving up reuse. § 3.6 states the resulting counts.

##### The source — a snapshot of per-key `computed`s

**Revision 1's `() => model()[key]` was wrong, not shorthand.** `SignalContextSource` is
`Record<string, unknown>` and its resolver is `isSignal(value) ? value() : value`
(`modules/eval-signals/src/lib/signal-context.ts:198-201`), with the type's own docblock
saying functions are "passed through untouched." A bare arrow therefore resolves to the
**function object** — truthy, never called, never tracked — which is precisely the silent
freeze `modules/eval-forms/src/lib/field-context.ts:66-72` already records for the form half.

What the factory builds instead, once, from `Object.keys(model())`:

```ts
const source: SignalContextSource = {};
for (const key of Object.keys(model())) {
  source[key] = computed(() => (model() as Record<string, unknown>)[key]);
}
```

**Per-key propagation survives even though every `computed` reads the whole model.** Angular's
`computed` memoises on `Object.is` by default, so a write to `zip` re-evaluates each
computed's property read and propagates only from `zip`'s. A rule naming only `country` reads
only `country`'s computed, so it does not re-run. That is what makes § 4's negative case
satisfiable at all — and it is the one mechanism in this plan the whole reactivity story
rests on, so step 2 asserts it directly rather than inferring it.

The cost is O(keys) cheap property reads per model write, not O(rules), and it is the reason
this is a snapshot rather than a `Proxy`.

**The key set is frozen at factory time, and revision 1's claim that it is live is
withdrawn.** A `Proxy` returning memoised computeds would restore liveness, at the price of
implementing `has`, `ownKeys` and `getOwnPropertyDescriptor` to satisfy `resolve`'s
`hasOwnProperty` and `Object.keys` (`signal-context.ts:133,142`) and
`findNestedSignals`'s `Object.keys` (`nested-signal-check.ts:47`). It is not worth it here:
**a Signal Forms schema addresses fields by compile-time path (`p.city`)**, so a key the
model gains at runtime has no path that could name it. That is the opposite of `/reactive`,
where `addControl` is the documented dynamic-form operation and liveness earns its keep.

Recorded as a limitation for the README, in the same place `/reactive`'s key-set caveat
lives.

### 3.3 The choke point — core or adapter, measured

[`phase-4-plan.md`](phase-4-plan.md) § 9.1 states the precondition and explicitly leaves the
placement to this phase. It is not settled here by argument. Both placements were built
against a realistic helper and the difference measured.

**The helper, as built for the measurement** — the shape both placements share:

```ts
export const evaluateRule = (
  compiled: stateCallback,        // eval-core's own published type (§ 5)
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

**It must re-throw `SignalContextWriteError` in every mode** (1.2.11). On `/reactive` this
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

| This library | Registers (config overload, 1.2.7) | Coercion | Note |
| ------------ | --------------------------------- | -------- | ---- |
| `evalVisible` | `hidden(p.x, { when: ctx => !toVisible(…) })` | `toVisible` (shipped) | Inverted — § 3.5.1 |
| `evalText` | `metadata(p.x, TEXT, ctx => toText(…))` | `toText` (shipped) | `TEXT = createMetadataKey<string>()` (1.2.8) |
| `evalDisabled` | `disabled(p.x, { when: ctx => … })` | `toVisible`'s rule | § 3.5.2 for the reason |

#### 3.5.1 Naming — `eval<Property>`, registering Angular's own rule

Settled here rather than deferred, because it interacts with
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s `/signals`
item 4: use Angular's own primitives, do not build a second mechanism beside them. Naming is
where that goes wrong first, since these functions sit in a consumer's schema literally
beside `hidden`, `disabled`, `required` and `metadata`:

```ts
const s = schema<Model>((p) => {
  required(p.email);                              // Angular's
  hidden(p.state, { when: ctx => !ctx.valueOf(p.isUs) });   // Angular's, a closure
  rules.evalVisible(p.city, 'country === "US"');            // ours, a string
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
the reason `"false"` — the same truthiness trap `toVisible` documents.

#### 3.5.2 The disabled reason — a static option, not the expression's return

§ 8.3 deferred this in revision 1 pending "a schema shape that separates the two." The
review suggested Angular's non-deprecated config overload is that shape. **It is not**:
`disabled`'s config is a single field, `{ when?: string | LogicFn<…, boolean | string> }`
(1.2.7), so the reason still arrives as the *return value* of the same function that decides
the condition. Checked before acting on it.

What does separate them is ours to build, and it costs one option:

```ts
rules.evalDisabled(p.zip, 'country !== "US"', { reason: 'ZIP is US-only' });
// registers: disabled(p.zip, { when: ctx => truthy ? 'ZIP is US-only' : false })
```

The expression stays boolean and is coerced by `toVisible`'s rule; the reason is authored
separately as a static string and is never expression-derived. **That is what kills the
trap** — a rule yielding `'false'` disables the field with the *authored* reason, not with
the reason `"false"`, because the string never comes from the expression.

**Taken, rather than deferred again.** It is three lines in the registrar, adds no Angular
surface beyond the `disabled` call already being made, and recovers capability that would
otherwise be silently dropped at the entry point where Angular owns the semantics. A
*dynamic* reason — the string coming from a second expression — stays out: it reopens the
trap and needs its own coercion rule.

### 3.6 Lifetime — there is nothing to destroy, and that is the finding

Phase 4 § 3.7 is N × M `EvalSignal`s and a `destroy()` the consumer calls. Here:

- No `EvalSignal` is created. No `DestroyRef` registration, no `destroy()`.
- Angular owns the `FieldTree`'s lifetime and the `LogicFn`s die with the schema.

What the adapter **does** retain, per `createExpressionRules` call: **one source record**
(§ 3.2.1), **one `EvalContext` per field named by a rule**, and **one compiled callback per
rule**. All three are closed over by the `LogicFn`s.

**Their lifetime is the factory's, and the factory is per-form** (§ 3.2.1) — which is the
answer to the reusable-schema hazard rather than an accident. A module-scope
`const s = schema<M>(p => …)` that closed over registration-time contexts would share them
across every `form()` built from it, and then field A's leaked scope in instance 1 would sit
ahead of field A's source key in instance 2, permanently. § 3.3's `finally` does not bound
that: it contains a leak *per walk*, not per form. Because the factory binds one model it
cannot be shared by two forms, so the hazard is structurally unreachable — and
`makeSchema = (rules) => schema<M>(p => …)` keeps schema reuse without reintroducing it.

That is the count-and-lifetime statement § 6 asks the reviewer to be able to make from the
diff. It needs no teardown API: nothing here registers with a `DestroyRef`, and everything
becomes garbage with the form.

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
- **Edit**: `modules/eval-forms/tsconfig.spec.json` — the same `include` widening for specs,
  **and `moduleResolution: "bundler"`**, replacing the `node10` it sets at `:6`.

  Without the second half this step cannot pass its own test target, and the library build
  hides it: `tsconfig.lib.json` inherits `bundler` from `modules/eval-forms/tsconfig.json:6`,
  while `tsconfig.spec.json` overrides it to `node10`. `@angular/forms` publishes `./signals`
  **only** through its `exports` map — there is no `signals/` directory to fall back to — so
  the spec program cannot resolve it. Measured against this workspace's own `node_modules`:

  | `moduleResolution` | Result |
  | ------------------ | ------ |
  | `node10` | `TS2307: Cannot find module '@angular/forms/signals' … there are types at 'types/signals.d.ts', but this result could not be resolved under your current 'moduleResolution' setting` |
  | `bundler` | clean |

  **This is the step's mechanism risk**: it changes resolution for *every* eval-forms spec,
  not only the new ones, so the whole existing suite is the gate on it. It is compatible with
  the `module: "commonjs"` already set there. `modules/eval-signals/tsconfig.spec.json:6`
  carries the same `node10`, so a cross-project spec would hit it too — out of scope here,
  worth knowing.
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

- **New**: `signals/src/lib/model-source.ts` — § 3.2.1's snapshot of per-key `computed`s
  from a `WritableSignal<TModel>`.
- **New**: `signals/src/lib/rules.ts` — `createExpressionRules(model, options?)`, returning
  the three registrars. Step 2 ships the factory and the source; the registrars may be stubs
  that throw until steps 4–5, but the factory's construction is real, because that is what
  fixes the context count and lifetime of § 3.6.
- **New**: co-located specs, test-first.
- **Exit**:
  - the source composes with the shipped `createFieldContext`, as the **form half**
    (first argument); the field half is `{}`, matching `phase-4-plan.md:1910`, since a
    Signal Forms field has no per-field key set of its own;
  - **per-key propagation is asserted directly**: writing a key the expression does not name
    leaves the named key's `computed` un-notified. This is the mechanism § 3.2.1 says the
    whole reactivity story rests on, and it is asserted here rather than inferred from a
    rule's behaviour two steps later;
  - the `LogicFn`-invocation harness of § 6.1 exists and is used here first.

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

- **Edit**: `signals/src/lib/rules.ts` — the two registrars, naming per § 3.5.1, registering
  Angular's **config** overloads per 1.2.7.
- **Exit**:
  - an end-to-end spec builds a real `form()` with a schema, writes the model, and asserts
    `field().hidden()` and the `TEXT` metadata signal follow — the **wiring and polarity**
    harness of § 6.1;
  - one assertion pins that `evalVisible` **inverts**: a *true* expression yields
    `hidden() === false`. Without it a sign flip is invisible, and § 3.5.1 put the inversion
    inside the library precisely so no consumer's expression carries it;
  - the negative case uses the **`LogicFn`-invocation count** and nothing else (§ 6.1):
    writing a model key the expression never named leaves the count unchanged.

### Step 5 — `evalDisabled`

- **Edit**: `signals/src/lib/rules.ts`, adding the `reason` option of § 3.5.2.
- **Exit**: as step 4, plus two specs that exist because of the trap — a rule yielding the
  string `'false'` **disables** the field, and it does so with the *authored* reason where
  one was supplied, never with `"false"`. Both record behaviour rather than leave it to be
  discovered.

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
| `createExpressionRules` | `<T>(model: WritableSignal<T>, options?: ExpressionRuleOptions) => ExpressionRules` — § 3.2.1 |
| `ExpressionRules` | `{ evalVisible, evalText, evalDisabled }`, each `(path, expression: string, options?) => void` |
| `ExpressionRuleOptions` | `{ eval?: EvalOptions; onError?: ExpressionErrorPolicy }` |
| `TEXT` | `MetadataKey<Signal<string \| undefined>, string, string \| undefined>` |

`evalVisible` registers Angular's `hidden` inverted (§ 3.5.1); `evalText` registers
`metadata(path, TEXT, …)`; `evalDisabled` registers `disabled` and takes an extra
`{ reason?: string }` (§ 3.5.2). All three use the **config** overloads (1.2.7).

`createModelSource` is **not** exported. Revision 1 listed it; it has no caller outside the
factory, and § 3.2.1 makes the factory the only supported way to build one.

At `@zvenigora/ng-eval-forms` (primary, **additive to a released entry point**):

| Symbol | Shape |
| ------ | ----- |
| `applyErrorPolicy` | `<T>(run: () => T, policy?: ExpressionErrorPolicy) => T \| undefined` |

**Not exported, deliberately**: `evaluateRule` (§ 3.3). Nothing else in `signals/src/lib/`
is exported unless it appears above.

**Imported from `eval-core`**: `EvalContext`, `EvalOptions`, `EvalState`, `call`, `parse`,
`compile`, `defaultParserOptions`, `stateCallback`. From `eval-signals`:
`SignalContextSource`, `SignalContextWriteError`. From `@angular/core`: `computed`,
`WritableSignal`, `Signal`. Anything beyond these lists is a finding.

**`CompilerService` is deliberately absent** (1.2.10) — revision 1 listed it, and with it an
`inject()` this plan never gave an injection-context story for. § 3.3's helper takes a
`stateCallback`, `eval-core`'s own published type; revision 1 invented `CompiledRule`, which
is a symbol nobody exports.

---

## 6. Verification gates

Every step: `npx nx run-many -t lint test build`, unfiltered. Plus:

1. **`/signals` shipped**: `dist/modules/eval-forms/package.json` `exports` has `./signals`
   with `types` and `default` naming emitted files; `signals/package.json` agrees.
2. **Angular 22 confinement**: every `@angular/forms/signals` hit under
   `modules/eval-forms/` is inside `modules/eval-forms/signals/`. Specs are excluded from
   this grep — `src/lib/field-context.spec.ts` legitimately imports `@angular/core`, and a
   grep that fires on it teaches the reader to ignore the gate.
3. **One path to the walk**, and the grep must cover every published entrance, not just
   `call`. `eval-core` also exports free `evaluate` (`:1819`), `evaluateAsync` (`:1826`) and
   `compile` (`:1836`), and `CompilerService` publishes `simpleCall` (`:1918`) — which does
   what `evaluateRule` does **minus the containment**, and which a case-sensitive `call(`
   does not match. The gate is
   `\b(call|simpleCall|simpleCallAsync|evaluate|evaluateAsync|simpleEval)\s*\(` plus any use
   of `EvalService` or `CompilerService`, over non-spec files under
   `modules/eval-forms/signals/`. Expected: exactly one hit, `call(` in `evaluate-rule.ts`.
   `compile(` is expected in `rules.ts` and is registration, not a walk — it produces a
   callback and does not run one.
4. **`/reactive` unmoved**: its FESM stays at 25,748 bytes **through step 6** — nothing in
   this phase, including step 6's README and version bump, touches its bundle — and its
   specs stay green throughout.
5. **Published core surface**: `dist/modules/eval-forms/types/zvenigora-ng-eval-forms.d.ts`
   gains `applyErrorPolicy` and **nothing else**.

### 6.1 Specs go through the end-to-end path

As Phase 4 § 6.1, with one substitution that is not optional: the `/reactive` harness does
not port, because there is no `EvalSignal` whose recomputes can be counted (§ 3.6).

**There are two harnesses here and they are not interchangeable.** Revision 1 offered them
as alternatives, which would have let the weaker one stand in for the stronger:

| Harness | Proves | Does **not** prove |
| ------- | ------ | ------------------ |
| Read back `field().hidden()` / the `TEXT` signal after a model write | The rule is registered with Angular, its value reaches the field's state, and the polarity is right — **wiring**, end to end | Anything about tracking |
| Count `LogicFn` invocations across a model write | The rule ran, or did not — **reactivity** | Nothing about the value it produced |

The read-back **cannot see over-subscription at all**: Angular's value equality means a
re-derivation returning the same boolean is indistinguishable from no re-derivation, so a
source that re-runs every rule on every keystroke passes it unchanged. It is a wiring
harness, not a reactivity harness, and describing it as one is how the over-subscription
probe gets defeated by its own setup.

**So: the negative case — a key the expression never named changes, and the rule must not
re-run — is asserted by `LogicFn` invocation count, and by nothing else.** Positive cases may
use either, and should use both where the value matters.

Both vacuity probes from
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md) apply: break the
unwrap, and make the resolver over-subscribe. A spec suite that survives both has no
reactivity coverage regardless of what it reports — and after the table above, only the
invocation count can fail the second one.

---

## 7. Risks

| # | Risk | Mitigation |
| - | ---- | ---------- |
| 1 | A rule reaches the walk without `evaluateRule`, silently voiding containment | § 6 gate 3 — one `call(` in the directory |
| 2 | `applyErrorPolicy` swallows `SignalContextWriteError` via a type-only import (§ 3.4) | Step 3 exit criterion asserts the re-throw through a `'undefined'` policy |
| 3 | `@angular/forms/signals` leaks into the core or `/reactive`; green here, broken for a 19–21 consumer | § 6 gate 2 |
| 4 | An additive core change alters `/reactive` behaviour; no gate row moves because it is one project | § 6 gates 4 and 5, plus reading the diff |
| 5 | Signal Forms is new; an API used here changes in 22.x | Each symbol's **own docblock** checked, per overload — see below |
| 6 | The escaped-closure residual — an arrow that outlives the walk pushes and pops outside any frame | Unsolved in both libraries, not this phase's; stated so it is not mistaken for a regression |
| 7 | A reusable module-scope schema shares contexts across form instances (§ 3.6) | Structurally unreachable: the factory binds one model. Step 2's construction is where that is fixed |
| 8 | `compile()` drifts into the `LogicFn` body, re-parsing per derivation | Step 4 exit counts parse/compile calls across N invocations of one rule. `CompilerService`'s LRU would have masked it; § 3.1 drops the service, so there is no cache to hide behind |

**Risk 5's mitigation in revision 1 was false, and how it went wrong is worth recording.**
It read "everything relied on is tagged `@publicApi 22.0` (1.2.1–1.2.8)". What was actually
verified was the **export list** — every name present in `signals.d.ts`'s `export {…}` — and
the **type shapes** of the signatures. What was not read was the **docblock immediately above
each overload**. `hidden`, `disabled` and `readonly` each ship two overloads whose signatures
both type-check; the `@publicApi 22.0` tag sits on the config one and `@deprecated` on the
positional one, and revision 1 cited the positional one for all three. A name being exported
and a signature compiling are both true of a deprecated overload. The check that
distinguishes them is reading the comment, per symbol, per overload.

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

**8.3 — Should `disabled` surface its reason? Revisited in revision 2. Settled: yes, as a
static option (§ 3.5.2).** Revision 1 deferred it pending "a schema shape that separates the
two", and the review proposed Angular's non-deprecated config overload as that shape.
**That premise does not hold** — `disabled`'s config is a single field,
`{ when?: string | LogicFn<…, boolean | string> }` (1.2.7), so the reason still arrives as
the return value of the function that decides the condition. Checked before acting on it.

The shape that does separate them is ours: a static `reason?: string` on `evalDisabled`,
never expression-derived, with the expression staying boolean. § 3.5.2 has it. So revision 1's
stated precondition is now met — by a different mechanism than the one proposed — and the
capability is recovered rather than dropped. A *dynamic* reason remains out.

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
