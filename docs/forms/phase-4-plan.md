# Phase 4 Plan — `@zvenigora/ng-eval-forms` (new module)

**Date**: August 16, 2026
**Revision**: 2 — amended after review, before step 1. Eleven changes, none of them a
design reversal, all from a review of revision 1 against the sources it cites. Three
are load-bearing: § 3.4.2's live key set is now **two lookups** rather than a joined
record, because a joined record is a third object and mutating the form source would
not have reached it — the mechanism did not deliver the property the section claimed
(and § 3.4.3's precedence rule changes shape with it); `applyErrorPolicy` is **deferred**
to the `/signals` phase, since `createEvalSignal` owns the whole policy internally and
the helper had no caller on the `/reactive` path at all, which is § 9.1's own
unexercised-path rule applied consistently; and § 3.5 gains a **fifth mirroring trap** —
a control *instance* swapped under an existing key by `setControl` / `addControl` leaves
the mirror subscribed to the dead control, which is the operation this library's § 0
premise is built on and which step 5's exit criterion sat directly on.

**Revision**: 1 — initial plan, written against the scaffold commit `898cd00`.
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1 scaffold)
**Depends on**: `@zvenigora/ng-eval-core` 0.3.0 (Phase 1 hooks) and
`@zvenigora/ng-eval-signals` 0.1.0 (Phase 3) — see
[`phase-3-plan.md`](../signals/phase-3-plan.md) § 9, the four-clause contract, **plus the
six published-but-unpromised behaviours enumerated in § 1.3**. Revision 1 claimed § 9
"and nothing beyond it" and then depended on six things beyond it; § 1.3 is that claim
replaced by an honest list.
**Source**: [`ROADMAP.md`](../../ROADMAP.md) § Phase 4
**Objective**: Ship a third publishable library that turns **runtime string expressions**
into reactive form field state, for Angular Reactive Forms in this phase and for Angular
Signal Forms in a follow-on, over one shared core and two secondary entry points.

---

## 0. What this library is for, stated once

Angular 22 ships Signal Forms (`@angular/forms/signals`, `@publicApi 22.0`) with a
declarative schema that already expresses conditional `disabled`, `hidden`, `readonly`,
`required` and arbitrary per-field `metadata`. Every one of those rules takes a
`LogicFn<TValue, TReturn> = (ctx: FieldContext<TValue>) => TReturn` — **a TypeScript
closure, compiled into the application bundle.**

What this library adds is one thing: **the condition is a string, resolved at runtime.**
That distinguishes exactly the cases where the rule is not knowable when the application
is compiled —

- form definitions served by an API (the classic dynamic / low-code form),
- rules authored by an admin or end user in a form-builder UI,
- rules stored in a database and versioned independently of the application release.

Against the naive alternative for those cases — `new Function(…)` — it adds what
`eval-core` already is: the sandbox, CSP-safety with no `eval`, prototype-pollution
blocking, dependency introspection and case-insensitive resolution.

**If a consumer's conditions are known at compile time and they are on Angular 22, they
should use Signal Forms' schema and not this library.** That sentence belongs in the
README. A library that is coy about when not to use it is how a competing schema gets
shipped by accident.

---

## 1. Current state of the code

### 1.1 What exists today

The library is **scaffolded but empty**, by `898cd00` ("chore(eval-forms): scaffold the
library ahead of the Phase 4 plan"). Nothing has been written into it.

| Element | File | State |
| :--- | :--- | :--- |
| Nx project | `modules/eval-forms/project.json` | `name: eval-forms`, `tags: ["scope:forms"]`, `prefix: "lib"`, build/test/`nx-release-publish` targets |
| Entry point | `modules/eval-forms/src/index.ts` | **empty file** |
| Package manifest | `modules/eval-forms/package.json` | `@zvenigora/ng-eval-forms@0.0.1`; peers `@angular/common ^22.0.0`, `@angular/core ^22.0.0`; **no** peer on either upstream library; no metadata |
| Path mapping | `tsconfig.base.json:20` | `"@zvenigora/ng-eval-forms": ["./modules/eval-forms/src/index.ts"]` — present; **no mapping for any subpath** |
| Boundary rule | `eslint.config.mjs` (root) | `scope:forms` → `onlyDependOnLibsWithTags: ['scope:core', 'scope:signals', 'scope:forms']` — already present |
| Package README | `modules/eval-forms/README.md` | Nx generator placeholder, 7 lines |
| Test setup | `modules/eval-forms/src/test-setup.ts` | `setupZoneTestEnv` from `jest-preset-angular` — same as the other two |

Baseline measured on this branch (`phase4-forms`, clean tree) on 2026-08-16:

| Target | Result |
| :--- | :--- |
| `npx nx run eval-forms:lint` | **fails** — 2 × `@nx/dependency-checks`: `@angular/common` and `@angular/core` "not used by eval-forms project" |
| `npx nx run eval-forms:test` | passes (`passWithNoTests`, 0 suites) |
| `npx nx run eval-forms:build:production` | **fails** — `Internal error: failed to get symbol for entrypoint` (empty `src/index.ts`) |
| `npx nx run eval-signals:lint` | clean |
| `npx nx run eval-signals:test` | 5 suites / **97 tests** green |
| `npx nx run eval-core:lint` | clean |
| `npx nx run eval-core:test` | 41 suites / **717 tests** green |

Two of eval-forms' three targets are red before Phase 4 starts. As in Phase 3, both
failures are "there is no code yet" rather than defects — but the consequence here is
sharper than it was there, and it is finding 1.2.1.

### 1.2 Findings that shape the design

**1.2.1 — The scaffold has already made this branch's CI red, and only step 1 can fix it.**
Phase 3's step 1 moved the root scripts to `nx run-many -t build | test | lint`, so
`npm run build` now builds *every* project with a build target — including
`eval-forms`, whose build fails. CI runs `npm run build --if-present` and `npm test`
(`.github/workflows/node.js.yml:34-35`). `898cd00` is on `phase4-forms` only, so `master`
is green and stays green; this branch is not.

This is the reverse of Phase 3's problem. There, the root scripts did not cover the new
project and a **step 0** was needed to put it in front of CI before any code landed. Here
coverage already exists and the scaffold walked into it. So there is **no step 0 in this
phase**, and step 1 carries a hard obligation Phase 3's step 1 only shared by convention:
it must leave the root `build` script green, which means the primary entry point has to
export a real runtime symbol in that same step.

**1.2.2 — Signal Forms is stable, and the ROADMAP's framing predates it.**
Measured from the installed package rather than from documentation:
`@angular/forms@22.0.8` declares three entry points in its `exports` map — `.`,
`./signals`, `./signals/compat`. `types/signals.d.ts` carries `@publicApi 22.0` on
`form`, `schema`, `apply`/`applyWhen`/`applyEach`, `disabled`, `hidden`, `readonly`,
`required`, `validate`, `validateAsync`/`validateHttp`/`validateTree`, the limit
validators, `debounce`, `submit`, and `metadata` / `createMetadataKey` /
`createManagedMetadataKey`. None of it is marked experimental — the only `@experimental`
tags in that entry point are on WebMCP members, none of which this plan names. (The tags
themselves live in `types/_structure-chunk.d.ts`; `types/signals.d.ts` is largely a
re-export barrel. Citations below name the chunk where that is where the symbol is
declared.)

[`ROADMAP.md:165`](../../ROADMAP.md) frames the integration question as "Angular Reactive
Forms (`FormGroup`/`FormControl`) vs. a standalone schema-driven renderer". That is now a
false dichotomy: there is a third option, it is Angular's own, and it is better than any
schema this library would write. § 3.1 and § 3.2 are the consequence.

**1.2.3 — Signal Forms' logic rules are plain functions, so its adapter needs no
reactivity of its own.**
`LogicFn<TValue, TReturn> = (ctx: FieldContext<TValue>) => TReturn`
(`node_modules/@angular/forms/types/_structure-chunk.d.ts:723`). Angular invokes it inside
its own reactive graph. An evaluation performed in that function body is tracked natively,
per key, by the same mechanism [`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.1
describes — no `computed()` of ours, and therefore **no `destroy()` of ours**.

Reactive Forms is the opposite: nothing drives a recompute, so each property must be a
`computed()` we own, with a lifetime we own.

That asymmetry is not at the source end, where both adapters produce a
`SignalContextSource`. It is at the **lifetime** end. It is the single most important
finding in this plan, because building the Reactive adapter first makes
"an `EvalSignal` per property, in the shared core" the path of least resistance at every
step — and that shape is wrong for the other half of the library. § 3.4 turns it into a
constraint and step 2 turns it into an exit criterion.

**1.2.4 — `createSignalContext` resolves against a *live* source, so the key set is not
frozen after all.**
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md) item 2 records
that a per-field context's key set is "frozen at construction", so a field registered
afterwards resolves `undefined` for ever. Reading the implementation, that is a property
of **spreading**, not of `createSignalContext`:
`modules/eval-signals/src/lib/signal-context.ts` pushes a lookup closure that calls
`resolve(source, key, caseInsensitive)` on *every* read, and `resolve` does a live
`hasOwnProperty` / `Object.keys` against whatever object it was handed. Hand it a record
you keep mutating and later keys resolve.

The half that genuinely does not work is **reactivity**, not resolution: an expression
that read a missing key recorded no signal dependency, so nothing recomputes when the key
appears. § 3.4.2 takes the live view and pairs it with an explicit invalidation
requirement; the reviewer checklist item is narrowed rather than dismissed.

**1.2.5 — `toSignal(control.valueChanges, { initialValue: control.value })` type-checks,
and has five traps that each produce a silent freeze.**
`AbstractControl.valueChanges: Observable<TValue>`
(`node_modules/@angular/forms/types/forms.d.ts:2703`); the `initialValue` overload of
`toSignal` returns `Signal<T | U>` where `U extends T`
(`node_modules/@angular/core/types/rxjs-interop.d.ts:157-161`).
So mirroring is available and is the answer to reviewer item 1; `invalidate()` reverts to
being the escape hatch for plain objects — and, per trap 3, for one Reactive Forms case
too. All five traps are § 3.5, in the design section rather than a footnote, because each
one fails the way this reviewer checklist is built around: a property that simply stops
updating, with no error.

**1.2.6 — The scaffold's tsconfigs cannot see a secondary entry point.**
`modules/eval-forms/tsconfig.lib.json` includes `["src/**/*.ts"]` and
`tsconfig.spec.json` includes `["src/**/*.spec.ts", …]`. The ng-packagr convention places
a secondary entry point at `<lib-root>/<name>/`, i.e. `modules/eval-forms/reactive/` —
**outside both**. Step 1 edits both `include` arrays. This is cheap and known now; it is
recorded because it is the kind of thing that reads as an inexplicable build failure
mid-step.

**1.2.7 — ng-packagr supports secondary entry points natively; the risk is Nx-side.**
`ng-packagr@22.0.2` ships `ng-entrypoint.schema.json` ("JSON Schema for secondary
entrypoint `ng-package.json` description file") and
`src/lib/ng-package/discover-packages.js:131` is literally
`function secondaryEntryPoint(primary, userPackage)`, reached by globbing
`**/ng-package.json` beneath the primary. So the mechanism will not fight ng-packagr, and
the two-packages fallback the brief allowed for is not needed on those grounds.

What is unproven **in this workspace** is everything around it: the `tsconfig.base.json`
subpath mapping, `@nx/dependency-checks` reading one manifest for two entry points, the
Jest resolution of the subpath, and finding 1.2.6. That is why it gets its own step with
its own exit criteria rather than being folded into the first adapter.

**1.2.8 — `visible` and Signal Forms' `hidden` have opposite polarity.**
[`ROADMAP.md:155`](../../ROADMAP.md) names the property `visible`; Angular's rule is
`hidden(path, logic)`. The `/signals` adapter negates. Trivial, and exactly the sort of
thing that ships inverted if it is not written down before either side exists.

### 1.3 What this plan relies on beyond `phase-3-plan.md` § 9

Revision 1's header said § 9 "and nothing beyond it", and then this plan depended on six
things beyond it. Each is real published behaviour, verified against the source; the
exposure is that § 9 is the *stated* contract, so anything not in it is one refactor away
from silent breakage — and § 2 forbids fixing that from here.

| Relied on | Where | Verified at | Pinned upstream? |
| :--- | :--- | :--- | :--- |
| `createEvalSignal` accepts a pre-built `EvalContext` as `source` | § 3.4.1, step 4 — the whole design | `eval-signal.ts:197` | Yes, by `eval-signals` specs |
| `invalidate()` and its collapse-and-no-op-after-destroy semantics | § 3.4.2, § 3.5.3 | `eval-signal.ts` | Yes |
| `SignalContextWriteError` bypasses `onError` in every mode | § 3.4.4 | `eval-signal.ts:353-355` | Yes |
| An explicit `injector` ⇒ **no** `DestroyRef` registration | § 3.7 | `eval-signal.ts:216-221` | Yes |
| `createEvalSignal`'s scope-leak snapshot-and-restore | § 7, § 9.1 | `eval-signal.ts:294, 325-341` | Yes |
| **`createSignalContext` resolves against a live source** | § 1.2.4, § 3.4.2 | `signal-context.ts:198-201`, `:127-144` | **No** |
| `createSignalContext` installs its resolver into the returned context's public `lookups`, and that resolver is self-contained — it closes over the source and ignores the `context` / `options` arguments `EvalLookup` passes it | § 3.4.2, candidate A — added in step 2 | `signal-context.ts:198-201` | **No upstream**, but pinned by *our* specs: the form-half cases go red if resolution relocates to `original` |

Only the last is unpinned: liveness is not in § 9, not in `createSignalContext`'s JSDoc,
and not asserted by any eval-signals spec — there is no mutate-after-construction case
there at all. A future upstream change that memoized `Object.keys` for the
case-insensitive path would break a documented README rule of this library with no red
test in either project. **Step 2 therefore carries a characterization spec for it**, in
eval-forms, labelled as characterizing undocumented upstream behaviour. That is the
available substitute for amending someone else's contract from inside § 2's scope rule.

---

## 2. Scope

### In scope

- A new publishable library `@zvenigora/ng-eval-forms` with **two** entry points shipped
  in this phase: the primary (the shared core) and `/reactive`.
- Runtime string expressions producing the `visible` and `text` field properties for
  Angular Reactive Forms, kept up to date reactively (§ 3.6).
- A field schema, **at the `/reactive` entry point only** (§ 3.2).
- The context composition, error policy and coercion rules that both adapters share
  (§ 3.4).
- A worked example, a README, and the release of 0.1.0.
- The `/signals` entry point **on paper only** (§ 9), as the thing step 2's constraint is
  checked against.

### Out of scope (deliberately deferred)

- **Any change to `eval-core` or `eval-signals`.** They are consumed as published.
  [`.claude/skills/step/SKILL.md`](../../.claude/skills/step/SKILL.md) makes a step that
  needs one a stop-and-replan condition, not a wider step. The § 6 gate rows for both
  projects are what detect a step that reached in anyway.
- **The `/signals` entry point as shipped code.** § 3.3 explains why the *mechanism*
  cannot wait even though the adapter can.
- **`disabled` and `required`.** § 3.6 gives the evidenced reason; both are write-back
  properties in Reactive Forms and one of them re-enters its own input.
- **Validators.** [`ROADMAP.md:169`](../../ROADMAP.md) already defers them: they affect
  form validity, not presentation.
- **Form *state* keys** (`touched`, `dirty`, `valid`, `status`) in the expression context.
  § 3.5.6 records the mechanism and why values-only is enough for this phase.
- **`FormArray` and nested `FormGroup`.** Flat forms only — settled in open question 8.5
  before step 1, because § 3.4.1's context count assumes it and step 4 would otherwise have
  to improvise a third level of scope for per-row names.
- **Async expressions.** Phase 5, and nothing here needs it — field properties are derived
  state ([`ROADMAP.md:183`](../../ROADMAP.md)).
- **Writing back through an expression.** [`phase-3-plan.md`](../signals/phase-3-plan.md)
  § 9.4 does not provide it and this library does not add it.

---

## 3. Design

### 3.1 One library, two entry points, and where the seam sits

Two packages were rejected. The context composition, the error policy, the value coercion
and the schema-independent notion of "a rule is an expression bound to a field property"
are the same whichever forms API is underneath; two packages would duplicate all of it to
vary the adapter. One library, with the adapters behind secondary entry points, keeps the
unused adapter out of a consumer's bundle — which is the only thing two packages would
have bought.

But the seam is **not** "everything except a function that produces a
`SignalContextSource`". Finding 1.2.3 puts a second difference at the lifetime end, and
the layering follows from it:

```
@zvenigora/ng-eval-forms              core: context composition, error policy, coercion
                                      NO computed(). NO destroy(). NO @angular/forms.
        |                                   |
        v                                   v
  /reactive                           /signals   (follow-on phase, § 9)
  mirrors control state into           reads FieldContext, calls the core
  signals, wraps the core in           inside Angular's own LogicFn
  createEvalSignal (one per            no computed(), no destroy()
  field × property), owns teardown
```

**Compilation belongs to the adapter, not the core.** This is a change from the shape
sketched during brainstorming ("compiled expression + context composition + error
policy"), forced by a fact about the dependency: `createEvalSignal(expression, source,
options)` compiles internally and offers no overload taking a pre-compiled
`stateCallback`. `/reactive` must therefore hand it the expression *string*, so a core
that had already compiled would either compile twice or push `/reactive` off
`createEvalSignal` and onto a hand-rolled `computed()` — reimplementing the
fresh-state-per-recompute, scope-leak containment, `onError` and teardown machinery
[`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.3 and § 3.8 already got right. Adding
that overload to `eval-signals` is out of scope (§ 2).

So the core owns **composition and policy**; `/reactive` compiles via `createEvalSignal`,
`/signals` compiles via `CompilerService.compile` once and calls inside the `LogicFn`.
The core gets smaller than sketched, which strengthens rather than weakens the constraint
in § 3.4.

### 3.2 `/reactive` will be much larger than `/signals`, and that is correct

Reactive Forms has **no declarative conditional-state layer at all**. Everything —
the schema, the mirroring, the per-property signals, the teardown — has to exist here.
Signal Forms has a good one, so its adapter is a thin translation from a string to a
`LogicFn` plus a `createMetadataKey` for `text`.

**This asymmetry is a correct reflection of the two host APIs, not an imbalance to fix.**
It follows directly from § 0: under Signal Forms the *only* thing this library adds is
the runtime string. Any attempt to balance the two entry points means shipping, at
`/signals`, a schema that competes with Angular's — which is not a trade-off but a defect,
because Angular's is typed, path-checked and integrated and ours could not be.

Recorded here so that a later reader who notices `/signals` is "underdeveloped" finds the
reason before acting on it. The `/signals` entry point is finished when a string can drive
`hidden`, `disabled`, `readonly` and a `text` metadata key. It is not finished by
acquiring a schema.

### 3.3 Secondary entry points — the mechanism, and one thing it cannot do

Layout, following the ng-packagr convention confirmed in finding 1.2.7:

```
modules/eval-forms/
  package.json              one manifest for the whole package
  ng-package.json           primary:   entryFile src/index.ts
  src/                      the core
  reactive/
    ng-package.json         secondary: entryFile src/public-api.ts
    src/                    the /reactive adapter
```

`dist/modules/eval-forms/reactive/` gets its own generated `package.json` with its own
`exports` wiring; consumers write `@zvenigora/ng-eval-forms/reactive`. In-repo, the
subpath needs an explicit `tsconfig.base.json` `paths` entry — `tsconfig.spec.json` sets
`moduleResolution: "node10"`, which will not read an `exports` map off a source folder,
and `paths` is resolution-strategy-independent.

**Both entry points ship in step 1, before either has real content**, even though only
`/reactive` is built in this phase. If `/reactive` were placed at the primary entry point
now, adding `/signals` later would force a breaking move of every exported symbol. The
mechanism is the risk (finding 1.2.7), so the mechanism is what gets proven first.

#### 3.3.1 `peerDependencies` are per package, not per entry point

**This is a correction to record prominently, because the obvious "fix" for it is
inert.**

A secondary entry point cannot declare its own dependency range. There is one
`package.json` for `@zvenigora/ng-eval-forms` and its `peerDependencies` apply to every
entry point. So this library **cannot** declare "`/reactive` needs `@angular/forms >=19`,
`/signals` needs `>=22`". The manifest declares one range, and it is the lower one:

```json
"peerDependencies": {
  "@angular/core": ">=19.0.0",
  "@angular/forms": ">=19.0.0",
  "@zvenigora/ng-eval-core": "^0.3.0",
  "@zvenigora/ng-eval-signals": "^0.1.0"
}
```

The loud failure we want for an Angular 19 consumer importing `/signals` still happens,
but it is **inherited from upstream module resolution, not declared by us**:
`@angular/forms@19` has no `./signals` entry in its `exports` map, so the *adapter's own
import* fails to resolve at build time with `Cannot find module
'@angular/forms/signals'`. That is loud, early, and correct — and it is a property of
Angular's packaging that we get for free.

Nobody should later "fix" the missing per-entry-point range by narrowing the manifest to
`>=22`. That would not add a diagnostic; it would break every Reactive Forms consumer on
19–21, who are the population this library's peer floor exists for. The version story is:
**one range, at the floor, and a README sentence saying `/signals` requires Angular 22.**

Two smaller manifest notes, both consequences of the same rule:

- `@angular/forms` is a peer of the whole package even though the **core imports nothing
  from it** (§ 3.4). Only `/reactive` does. `@nx/dependency-checks` is satisfied by any
  import anywhere in the project, so this is consistent — but it means the core's
  independence from `@angular/forms` is *not* enforced by the manifest and needs the
  import check in step 2's exit criteria instead.
- **No `rxjs` peer.** `toSignal(control.valueChanges, …)` needs no rxjs operator import,
  only the `Observable` `@angular/forms` already returns. § 3.5.6's deferral of state keys
  is what keeps it that way — filtering `control.events` would introduce `filter` and with
  it an rxjs peer.

Per the memory note recorded while scaffolding: **step 1 carries one more manifest peer
than Phase 3's step 1 did**, because this library depends on both upstreams where
`eval-signals` depended only on `eval-core`. Listing them from the plan rather than
copying Phase 3's step is what avoids leaving lint red for a reason that looks like the
baseline.

### 3.4 The shared core

Three things, and deliberately nothing else.

#### 3.4.1 Context composition — one `EvalContext` per field

```ts
createFieldContext(
  formSource: SignalContextSource,
  fieldSource: SignalContextSource,
  options?: EvalOptions
): EvalContext
```

One context per field, never one shared across fields. Reviewer item 3 is the reason and
it is not hypothetical: `EvalContext.get` resolves `scopes` and `original` **before**
`lookups`, so anything left on a context is read first by everything that follows, and a
shared context would let field A's arrow-function scope leak shadow field B's source key
of the same name for the life of the form.

The count is therefore **N fields × 1 context**, with each context's lifetime equal to its
field's — and **not** N × M (one per property), because the properties of one field
resolve against the same names. Any step whose diff changes that count states the new
number and why.

**Measured in step 4: the argument above is narrower on the `/reactive` path than it
reads.** `createEvalSignal` marks the scope depth before each walk and drains back to it
in a `finally` ([`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.8.3), so an
arrow-function leak *made during a recompute* never survives it — however the arrow's body
fails. The only leak that reaches a sibling field is the one § 3.8.3 names as uncontained:
an arrow that escapes the walk and is called later, which through this library needs a
function sitting in the form's own values. The rule stands unchanged, for three reasons
that do not depend on the leak being common: § 3.8.3 is containment rather than a fix,
`/signals` need not route through `createEvalSignal` at all, and one object per field is
not a cost worth trading for. Step 4's spec asserts it through the escaped-arrow case,
which is the only form that discriminates.

#### 3.4.2 The key set is live, and reactivity is what needs the escape hatch

**The mechanism is two lookups, not a joined record.** Revision 1 said "a single mutable
joined record that the core owns"; that does not work, and the reason is worth keeping
because it is easy to re-derive wrongly. A joined record is a **third object**. Mutating
`formSource` afterwards does not reach it, so liveness would need a write-through — to
**N** records, since § 3.4.1 mandates one context per field — and `createFieldContext`
returns an `EvalContext` and retains no handle any caller could write through.

What actually delivers it:

```ts
const context = createSignalContext(fieldSource, options);  // field half — live already
context.lookups.push((key) => resolveFrom(formSource, key)); // form half — also live
```

`EvalContext.lookups` is a public mutable array and `EvalContext.get` walks it in order,
first non-`undefined` winning — which is exactly how `createSignalContext` installs its
own resolver in the first place. Both halves close over their source and read it at
resolve time, so neither needs a write-through and there is nothing to keep in sync.

**`resolveFrom` above is shorthand in the snippet, not a specified function.** Recorded
during step 1, so step 2 does not inherit a phantom symbol it thinks it must match. What
step 1 ships is an own-property read on `formSource` — `Object.prototype.hasOwnProperty`,
returning `undefined` when absent — and that is all. Case-insensitive correction and the
`undefined`-precedence rule of § 3.4.3 are step 2's, and step 2 is free to name and shape
the helper however it likes.

Two properties of that read are worth stating, because both are consequences of rules
elsewhere in this plan rather than choices:

- **Own-property, not a bare read.** A bare `formSource[key]` would resolve a
  server-supplied field named `constructor` or `toString` off `Object.prototype`. This
  half is the one place that is containable from here; § 7's risk row covers the `original`
  half, which is upstream and is not.
- **The form half does not unwrap signals; the field half does — and this is a step-1
  limitation, not a settled design.** Both parameters are typed `SignalContextSource`,
  whose documented contract is that signals unwrap on read, so the form half currently
  understates its own type.

  **Step 2 must settle it, and it is not free to defer.** Unwrapping needs `isSignal`, and
  § 3.4.5 makes the core's `@angular/core` import list empty — but that does *not* force
  the asymmetry, which is what an earlier draft of this note wrongly claimed. The
  resolver can be borrowed from upstream instead of rewritten:

  ```ts
  context.lookups.push(...createSignalContext(formSource, options).lookups);
  ```

  The second context is discarded and only its closure survives, so it is still one
  `EvalContext` per field (§ 3.4.1) and the field half is still consulted first. It
  brings unwrapping, `hasOwnProperty` semantics, `caseInsensitive` correction and
  `warnOnNestedSignals` over the form source — all four of which the hand-written read
  lacks — with no new import.

  **What makes this urgent is step 3, not tidiness.** If `createControlSource` comes to
  hold `Signal`s per control (`toSignal(control.valueChanges, …)`, which is § 3.5's
  wording), a non-unwrapping form half returns the signal *function* un-called:
  `country === 'US'` compares a function to a string, yields `false` on every recompute,
  records no dependency, and throws nothing. That is the silent freeze this library's
  whole review checklist is built around, reaching **every form-wide key of every field**.
  The alternative — the record holding plain values — needs § 3.5 to say what re-reads
  those values per recompute, because `createEvalSignal` owns the `computed()` and no
  adapter code runs inside it.

  Step 2 therefore decides one of: adopt the borrowed resolver above, or keep the plain
  read and have § 3.5 specify the mechanism that keeps the record's values live. **Step 1
  deliberately pins neither**, so that whichever step 2 chooses, no assertion has to be
  deleted to get there.

  **This is not a blank fork. Candidate A leads, and the burden is on B.** A costs one
  line, adds no import, keeps the § 3.4.5 rule intact, keeps one `EvalContext` per field
  (the second context is discarded and only its closure survives), and keeps the field
  half first. It also closes four gaps at once that B leaves open — measured, not
  reasoned, by running both compositions side by side over the same fixtures:

  | Form-half behaviour | A (borrowed) | B (plain read, as shipped in step 1) |
  | :--- | :--- | :--- |
  | key holding `signal('CA')` | `'CA'` | the **signal function**, un-called |
  | key holding `signal(undefined)` | `undefined` | the signal function — and therefore **truthy** |
  | `caseInsensitive: true`, key `Country`, read as `country` | `'CA'` | `undefined` |
  | `warnOnNestedSignals` over the form source | runs | never runs |

  Row 2 is the one that decides it. Under B a `visible: "country"` rule on an *empty*
  mirrored control evaluates a function in boolean position, which is truthy — so the
  field renders **visible when its value is absent**, silently, on the most ordinary
  input a form has.

  **What would have to be true for B to win**, stated so step 2 can check it rather than
  re-argue it. All three, not any one:

  1. **§ 3.5's record holds live plain values, never `Signal`s** — and § 3.5 says *what
     re-reads them on each recompute*. `createEvalSignal` owns the `computed()` and no
     `/reactive` code runs inside it, so this needs a named mechanism (a getter-backed
     record is the only shape that obviously works) and not an assertion that the values
     "stay fresh".
  2. **The `/signals` adapter also never puts a `Signal` in the form source.** § 9's
     sketch has not been written against this constraint, and if it needs signals there,
     B forces the two adapters apart at the one seam § 3.4.5 exists to keep shared.
  3. **`caseInsensitive` is either implemented a second time on the form half, or
     documented as field-only.** § 3.4.3's precedence rule assumes both halves agree on
     what a key *is*; today they do not, and B has to close that itself.

  If any of the three fails, take A. Note that A does not settle § 3.5's shape for
  free — it makes both shapes *safe*, which is a different and weaker claim, and § 3.5
  still owes a decision on whether the record holds signals or values.

  **Settled in step 2: A, and the reason is row 2 — not condition 1 failing.** The
  distinction matters because it decides whether the fork can reopen. Condition 1 is
  *unmet* today (§ 3.5 has not named a liveness mechanism for a plain-value record), and
  if that were the reason, B would come back the moment step 3 named one. It is not the
  reason. **B is wrong, not merely unsupported**: a form key holding `signal(undefined)`
  resolves to the signal *function*, which is truthy, so a `visible: "country"` rule
  renders its field precisely when the value is absent — and an empty control is every
  form's first render, on every form. No liveness mechanism § 3.5 could later name repairs
  that, because the defect is in what the lookup *returns*, not in when it is read. The
  fork is closed on correctness and stays closed.

  Measured, not reasoned: reverting the form half to B against step 2's shipped specs
  turns exactly four cases red — the two form-half unwrapping cases, the `caseInsensitive`
  correction case, and the `LogicFn`-shaped tracking case, which under B compares a
  function to a string and yields `false` on every recompute. Rows 1–3 of the table above,
  plus the silent-freeze consequence the table predicts. The precedence and live-key-set
  cases stay green under both, exactly as § 3.4.3's point 3 says they must.

  One cost comes with A and is recorded so step 4 does not meet it as a mystery:
  `createSignalContext` runs `warnOnNestedSignals` unconditionally, so **the form source
  is scanned once per field** — N scans of the same record for a form of N fields, and in
  dev mode N identical warnings attributed to `createSignalContext`, a function the
  consumer never called. Construction-time only; nothing per-node or per-recompute, so
  § 6's perf gate is untouched.

Finding 1.2.4's liveness is what makes this work, and § 1.3 records that it is
published-but-unpromised: it is not in
[`phase-3-plan.md`](../signals/phase-3-plan.md) § 9, not in `createSignalContext`'s
JSDoc, and not pinned by any eval-signals spec. Step 2 therefore carries a
**characterization spec** for it — an eval-forms spec asserting the upstream behaviour
directly, labelled as characterizing undocumented behaviour rather than as testing our
own. § 2 forbids fixing that upstream; a red test here is the available substitute.

What liveness does **not** do is trigger a recompute: an expression that read a
then-missing key subscribed to nothing, so nothing tells it the key now exists. The
stated rule is therefore two-part, and both halves go in the README:

1. **Resolution is live.** A field registered later is visible to contexts already built.
2. **Appearance is not reactive.** The owner of the form source calls `invalidate()` on
   the affected properties when the *key set* changes — as opposed to when a *value*
   changes, which is Angular's job and needs nothing.

For `/reactive`, "the owner" is this library: the form binding knows when it registers a
field, so it invalidates. A consumer only reaches for `invalidate()` for a plain-object
source they own — which is exactly [`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.5's
case, restored to that scope by mirroring (finding 1.2.5), with the one Reactive Forms
exception in § 3.5.4.

#### 3.4.3 Precedence — field keys win

When a field-local key and a form key share a name, **the field wins**. It is the more
specific scope, and the collision that actually occurs — a field named `value`, `name` or
`index` against a form-level key of the same name — is one where the local meaning is what
the expression author intended. Under § 3.4.2's two lookups this falls out of installation
order: the field resolver is pushed first and `get` takes the first non-`undefined`.

**Which forces a decision revision 1 did not make: `undefined` is not "field wins".**
`EvalContext.get` treats `undefined` as absent at every step, and `createSignalContext`'s
`resolve` returns `undefined` both for "no such key" and for "key bound to `undefined`".
So a field key holding `undefined` — **an empty `FormControl`, which is the common case,
not an exotic one** — falls through to the form lookup and the *form* value wins. Under
the rejected joined-record mechanism it would have shadowed the form value instead. The
two mechanisms disagree, so this is stated rather than inherited:

> A field key resolves the field's value whenever that value is not `undefined`. A field
> key holding `undefined` is indistinguishable from an absent one, and the form value
> shows through.

Documented as a limitation rather than fixed. Fixing it means distinguishing "absent" from
"present and `undefined`" through a resolver whose only channel is a return value, which
would need a sentinel threaded through `EvalContext.get` — `eval-core`'s, and out of scope
(§ 2).

Step 2's spec asserts **three** things, not the two revision 1 listed: the collision
resolves to the field; removing the field key makes the form key visible again (which is
what distinguishes "field wins" from "the form source was never consulted"); and a field
key bound to `undefined` resolves the *form* value, which is the only half that
discriminates between the two candidate mechanisms.

**Checked against § 3.4.2's open decision, because step 2's precedence spec rests on this
rule and the decision lands in the same step.** Both compositions were run over the same
fixtures. Three results, and the third changes what step 2 has to write:

1. **The rule survives unchanged under both candidates.** A field key holding plain
   `undefined` falls through to the form value; so does one holding `signal(undefined)`,
   because the field half unwraps *before* `get` applies its `!== undefined` test. The
   quoted rule above needs no amendment, and it does not depend on the § 3.4.2 answer.
2. **The fall-through is reactive, and that is also independent of § 3.4.2.** A field
   signal moving `undefined → 'field'` flips precedence back to the field, under both
   candidates, because the field half *read the signal* on the way to returning
   `undefined` and so recorded the dependency. Precedence here is therefore
   **value-dependent and time-varying** — a property the one-line rule does not convey,
   and worth a README sentence in step 6: a field does not "have" precedence, it has it
   *while its value is present*.
3. **The third assertion no longer discriminates the fork that is actually open.** It was
   written to separate the joined record from the two lookups, and it still does that.
   It does **not** separate § 3.4.2's A from B — both produce the identical fall-through
   on all three fixtures. The cases that separate A from B are all on the *form* half, and
   step 2 needs at least one of them or it will ship whichever it happened to write:

   > a **form** key bound to a signal resolves that signal's *value* — not the signal
   > function. Under B it comes back un-called, and `signal(undefined)` then reads as
   > **truthy** in boolean position.

   That is a fourth assertion, not a replacement for the third.

One consequence for coercion (§ 3.6) worth carrying: under A an empty field and a missing
field are still indistinguishable, so `visible` sees `undefined` from both. `toVisible`'s
treatment of `undefined` is therefore load-bearing on the most ordinary input a form has,
not an edge case — and it is the same `undefined` whichever candidate wins.

**A third precedence layer sits above both, and it is not ours.** `createSignalContext`
builds its context on an empty `original`, and `EvalContext.get` consults `original`
*before* `lookups`. `getContextValue` reads a plain object as a bare property access, so
`toString`, `valueOf`, `constructor` and `hasOwnProperty` resolve off `Object.prototype`
and shadow **both** sources. `signal-context.ts` documents this for `eval-signals`, where
it is a curiosity because a developer wrote the key names.

Here it is not a curiosity. § 0's whole premise is that field names arrive from an API or
a form-builder UI, so a server-supplied schema containing a field named `constructor`
resolves to `Object` and every rule reading it is silently wrong. This is the strongest
argument for validating schemas at construction (open question 3) and is recorded there as
such: reject prototype-shadowing field names with a real error, at the point the schema
arrives, where the diagnostic can name the field.

#### 3.4.4 Error policy

```ts
type ExpressionErrorPolicy = 'throw' | 'undefined' | ((error: unknown) => unknown);
```

Structurally identical to `EvalSignalOptions['onError']`, deliberately: `/reactive`
resolves the default here and then forwards the value to `createEvalSignal` with no
mapping between the unions, which is a place two identical types would drift apart.

**The type ships; the helper does not.** Revision 1 also had the core export an
`applyErrorPolicy`. It has no caller: `createEvalSignal` applies `'throw'` /
`'undefined'` / the function itself, internally, and bypasses for
`SignalContextWriteError` on its own — so on the `/reactive` path, the only path this
phase ships, the helper would never run. Its sole consumer is § 9's unshipped `/signals`
sketch. That is exactly the case § 9.1 declines to build the scope containment for, and
the rule applies to both or to neither: **`applyErrorPolicy` is deferred to the `/signals`
phase**, and the core ships `ExpressionErrorPolicy` as a type. `/signals` will implement
the three cases in its own `try`/`catch` against that type.

**Resolving the default is a real step, not a formality.** `createEvalSignal` does
`options?.onError ?? 'throw'`, so forwarding an *absent* policy verbatim yields `'throw'`
— the opposite of this section's `'undefined'`. `/reactive` substitutes its own default
before the call. Step 4's error criterion is what catches a binding that forwards
`undefined` and inherits `eval-signals`' default by accident.

**A *parse* error is not covered by this type at all, and it is the likeliest bad rule
there is.** Measured in step 4: `createEvalSignal` compiles eagerly, so
`visible: 'country ==='` throws `Error('Unexpected token (1:11)')` from the factory itself
rather than producing a signal that fails on read — `EvalSignalOptions.onError`'s own docs
say so. `ExpressionErrorPolicy` therefore cannot reach it in any mode, including
`'undefined'`. That matters more here than upstream, because § 0's premise is a rule typed
into a form builder by an end user and a syntax slip is the commonest way such a rule is
bad: the paragraph below argues for a field that does not render rather than an application
that throws, and for this one case the library throws. Recorded rather than fixed in this
phase — the fix belongs with step 5's teardown, since a bind that throws part-way through
must also release what it already built. § 6's README states it.

Default `'undefined'` here, not `'throw'` — the opposite of `eval-signals`' default, and
the reason is the consumer. An expression that fails in `eval-signals` was written by the
developer reading the stack trace. An expression that fails here may have been authored by
an end user in a form builder (§ 0), and the appropriate response to "the admin typed a
bad rule" is a field that does not render, not an application that throws on every change
detection pass. Consumers who want the strict behaviour pass `'throw'`.

`SignalContextWriteError` is **not** routed through this, in either adapter, matching
[`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.6.3. A write violation is static — it
is illegal on every recompute with every dataset — and swallowing it under a default of
`'undefined'` would hand every consumer a silent blank for a bug in the rule's *syntax*.

#### 3.4.5 The constraint, stated as a rule

**The core imports nothing from `@angular/core`, nothing from `@angular/forms`, and
`createSignalContext` / `SignalContextSource` / `SignalContextWriteError` and nothing else
from `@zvenigora/ng-eval-signals`.**

Stated as an **import list, not as a list of forbidden identifiers**. Revision 1 said "no
`computed()`, no `destroy()`, no `DestroyRef`" and made that a grep, which is porous: a
core that memoized its resolvers in a `signal()` and recomputed in an `effect()` passes
that grep, passes an import check that does not constrain `@angular/core`, and passes the
`LogicFn`-shaped spec. `linkedSignal`, `toSignal` and `resource` are the same hole. The
enforceable form of "the core owns no reactivity" is that **its `@angular/core` import
list is empty** — one line of a diff, and it admits no near-misses.

It is a rule and not a preference because of finding 1.2.3: `/signals` needs the core with
none of those, and `/reactive` being built first makes every one of them locally
convenient. Step 2 turns it into an exit criterion a reviewer checks from the diff.

### 3.5 The `/reactive` adapter — mirroring, and the five traps

```ts
createControlSource(
  group: FormGroup,
  options: { injector: Injector }
): SignalContextSource
```

One `toSignal` **per control**, producing a flat record of `Signal<value>` under the field
names, which is exactly the `SignalContextSource` shape
[`phase-3-plan.md`](../signals/phase-3-plan.md) § 9.2 promises is cheap to compose.

**It takes the `FormGroup`, not a `Record<string, AbstractControl>`** — trap 5 is why, and
the signature ships in that shape from step 1 even though the diffing behind it does not
arrive until step 3. A step 1 that shipped the `Record` would have step 3 rewrite the
symbol and its spec, and the rewrite is the kind that leaves a stale caller behind.

Four of the following five are specs in step 3; trap 2 is a second reason for trap 1's
decision and § 3.5.2 says why it gets no spec of its own. All five are in the design
section because each one, left unhandled, produces a property frozen at its first value —
the failure mode [`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)
is built around.

#### 3.5.1 Trap 1 — per control, never per group, and our own rules are why

A disabled control is **excluded from its parent's aggregate value**
(`node_modules/@angular/forms/types/forms.d.ts:3025`: `enable()` "means the control is
included in … the aggregate value of its parent"), and there is no `rawValueChanges`
observable to go with `getRawValue()`.

So a group-level mirror has a failure that is specific to *this library*: `disabled` is a
property we compute, so the moment our own rule disables a field, that field's value
**disappears from the context every other field's rules resolve against**. A rule reading
`country` silently sees `undefined` because a different rule disabled `country`. A
control's own `valueChanges` keeps emitting regardless of its enabled state, so per-control
mirroring does not have this failure.

This is the subtlest of the five and it survives `disabled` being deferred (§ 3.6): a
consumer may disable a control themselves for any reason.

#### 3.5.2 Trap 2 — the parent's value lags its children

`forms.d.ts:2703` documents it directly: on a child's `valueChanges`, "the value of a
parent control … is updated later, so accessing a value of a parent control … from the
callback of this event might result in getting a value that has not been updated yet".

A group-level mirror is therefore not merely coarse, it is *ordering-dependent*. A second,
independent reason for the same decision as trap 1 — worth stating separately, because a
future reader who solves trap 1 with `getRawValue()` on a group would reintroduce this one.

#### 3.5.3 Trap 3 — `{ emitEvent: false }` defeats the mirror silently

`setValue`, `patchValue`, `reset`, `enable` and `disable` all accept it, and
`forms.d.ts:3018` is explicit: "When false, no events are emitted." A consumer who uses it
gets a frozen property, no error, and no way to tell it from a rule that is simply wrong.

There is no fix available from this side — the observable is the only signal there is.
So: `invalidate()` remains reachable on `/reactive` properties, documented as the hatch
for **this specific case**, and the README says so next to the mirroring description. This
is a narrow reopening of the reviewer item 1 correction, not a retreat from it — mirroring
is still the mechanism, and `invalidate()` covers the one hole mirroring cannot see.

**And it covers a stale *value*, not a suppressed *control-set* change.** Recorded in
step 3, because the two look like one case and only one of them has a hatch.
`invalidate()` works above because § 3.5.5's accessor re-reads the control, so re-running
the walk recovers whatever the control now holds. `setControl` / `addControl` /
`removeControl` under `{ emitEvent: false }` suppress `group.events` instead, so the diff
never runs and the channel still points at the *dead instance* — there is nothing for a
re-run to recover, in the same structural sense that rules out a signal-valued record. A
suppressed `addControl` leaves the key absent from the record entirely. Pinned as current
behaviour in `createControlSource`'s JSDoc; step 6's README inherits it.

#### 3.5.4 Trap 4 — `toSignal` has a lifetime, and it must be the form's

`toSignal` takes its `DestroyRef` from the ambient injection context unless given
`injector` or `manualCleanup`
(`node_modules/@angular/core/types/rxjs-interop.d.ts:124` and `:132`). A form built outside an
injection context — which is routine, since form construction often happens in a service —
throws NG0203 with no explanation pointing at this library.

`createControlSource` therefore takes an explicit `injector` and passes it through, and the
subscription's lifetime is the form binding's. This makes the mirror a **second** teardown
path alongside the per-property `EvalSignal.destroy()`, and § 3.7 counts both.

#### 3.5.5 Trap 5 — a control *instance* replaced under an existing key

`FormGroup.setControl`, `addControl` and `removeControl` replace the control **object**.
A mirror that subscribed to instances holds a subscription to the *dead* control: its
signal freezes at that control's last value, nothing throws, and every property reading
that field is stale for the life of the binding.

This is the trap that matters most for this library specifically. § 0's premise is
server-driven and runtime-authored form definitions, so adding and removing controls is
not an edge case — it is the operation the library exists to serve. And step 5's exit
criterion is literally "a field removed and re-added works", which sits directly on it.

**The decision is to listen, not to hand out a hatch.** `createControlSource` takes the
`FormGroup`, holds a key → instance map, and on each `group.events` emission diffs the map
against `group.controls`: for every key whose instance changed or vanished it releases the
old subscription and subscribes the new one, leaving untouched keys' subscriptions
untouched.

The consistency argument is what settles it against a `rebind()` the consumer calls:

> Every other escape hatch in this design exists because **Angular gives us no signal**.
> `{ emitEvent: false }` genuinely does not emit (trap 3). A plain-object key-set change
> genuinely has no observer (§ 3.4.2). Here `group.events` *does* fire. A manual hatch
> would be the first one in this design that exists because we chose not to listen — and
> it would put the headline use case behind a call the consumer will forget, producing
> exactly the silent freeze this catalogue exists to prevent.

Two consequences carried forward. § 3.7's subscription count stops being a constant: it is
N *live* subscriptions with churn over the binding's life, and the discriminating
assertion is the churn, not the total. And step 5's "removed and re-added" criterion is
replaced by one that can fail — see step 5.

**One signal per *key*, not one per control instance — and the naive reading of the
paragraph above is a defect, not merely a looser spelling.** Amended during step 3, and
worth stating at length because the two readings are one word apart and only one of them
works.

§ 3.5.1's "per control, never per group" is about trap 1's *granularity*: one mirrored
value per field rather than one aggregate for the form. It says nothing about *lifetime*,
and reading the two as a single requirement produces this: on each instance replacement,
call `toSignal` again on the new control and write the fresh signal into the record under
the same key. That passes the value assertion and reintroduces trap 5's own failure one
layer up. `createEvalSignal` owns a `computed()` that recorded its dependency on the
signal it read — the *dead* control's. Replacing the record entry does not reach that
`computed()`, which keeps reading a signal nothing will ever update again. Every property
that had already evaluated the key is frozen at the dead control's last value, for the
life of the binding: exactly the silent freeze trap 5 exists to prevent, reintroduced by
trap 5's own fix, and reaching further than the original because it now survives a
correctly-implemented diff.

It is also a defect a spec can easily miss, which is why the exit criteria below say what
they say. A spec that re-evaluates with a bare `simpleEval` reads the record afresh, finds
the new signal, and passes — the stale `computed()` is the thing that was never asked. The
**recompute-count** criterion is what catches it, because the count is taken over a signal
built before the replacement.

So the mechanism is: **one stable entry per key, for the life of that key**, fed by a
per-key *instance channel* — the current control pushed into a `Subject`, `switchMap`ped to
that control's value stream, and `toSignal`ed once. The channel is also point 1's
completion channel, and it is what makes a per-key release possible at all:
`toSignal(obs, { injector })` takes its cleanup from that injector's `DestroyRef` and hands
back no per-subscription handle, so releasing one control's subscription while the injector
lives has to happen *inside* the stream. `switchMap` unsubscribes the previous inner
subscription when the channel emits the replacement — one unsubscribe and one subscribe per
replacement, untouched keys untouched, and the record entry never rebuilt. All four of the
assertions below fall out of that single mechanism rather than being arranged separately.

**Removal needs a second channel, and completing the first one does not do it.** Written
down because it looks like it should: `switchMap` completes only once its *inner* completes
too, and `valueChanges` never completes, so a key whose instance channel is merely
completed keeps its subscriber on a control the group no longer holds. So each key also
carries a `released` subject with a `takeUntil` at the end of its pipe, and removal emits on
it. Measured during step 3 — the removal spec's `observers(removed) === 0` is what failed
against the completing-only version, and it is the assertion that keeps this from being
re-derived wrongly. A key *added* gets a new channel pair, a new `toSignal` and a new record
entry; only a genuinely new key ever creates one.

**And the record holds live *values*, not the signals — which § 3.4.2 left to this section
to settle, and trap 3 is what settles it.** Measured during step 3, both shapes run over
the same fixture:

| after `setValue('CA', { emitEvent: false })`, then `invalidate()` | property reads |
| :--- | :--- |
| record holds the `toSignal` signal | `'US'` — **still stale** |
| record holds a value behind an accessor that reads the signal, then `control.value` | `'CA'` |

§ 3.5.3 says `invalidate()` is the documented hatch for exactly this case. It is not one
against a signal-valued record, and the reason is structural rather than incidental: the
mirrored signal is *itself* the thing that went stale, so a downstream recompute reads the
same cached value it read before. `invalidate()` on the property re-runs the walk; the walk
resolves the key to a signal nothing has updated; the answer does not move. No amount of
invalidating reaches a value the mirror never observed.

The shape that works is § 3.4.2's own words — "a getter-backed record is the only shape
that obviously works" — with the one addition that makes it *track*: each key is an
enumerable accessor that **reads the per-key change-signal for the dependency and then
returns `channel.control.value` for the answer**. The signal read is what a `computed()`
records, so per-key reactivity is unchanged; reading the control rather than the signal is
what makes the answer current whenever anything re-runs the walk, `invalidate()` included.

Three consequences worth stating so they are not rediscovered:

- **The signal's own value is never read.** It is a change ticker. Its emissions must still
  carry the control's value, because `toSignal` dedupes with `Object.is` and a stream that
  emitted a constant would tick once and never again.
- **The inner stream needs the control's current value on subscribe** (`startWith`), or a
  replaced instance produces no emission until its first edit and every property reading
  that key stays at the dead control's value — trap 5's failure surviving trap 5's fix by a
  second route.
- **§ 3.4.2's A/B fork does not reopen.** B's defects were a form key holding
  `signal(undefined)` resolving truthy, and `caseInsensitive` going uncorrected. The second
  is untouched by anything here, and the first is not repaired by this record merely
  happening to hold no signals — the `/signals` adapter's source (§ 9) and step 4's
  *field* source are both free to. A costs one line and stays.

#### 3.5.6 Form state keys are deferred, and the mechanism is recorded

Expressions in this phase name **field values only**. `touched` / `dirty` / `pristine`
need `control.events` with a `TouchedChangeEvent` / `PristineChangeEvent` filter
(`forms.d.ts:2691`, available at the `>=19` floor); `status` / `valid` need
`statusChanges` (`forms.d.ts:2711`).

Deferred for two reasons, neither of them difficulty. First, the shape is unresolved: a
flat `Record` cannot hold per-field state without either nesting signals — which
`warnOnNestedSignals` correctly reports as a mistake
([`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.2.1) — or collapsing all state into
one `signal({...})`, which destroys the per-key tracking the whole design rests on.
Second, real conditional-visibility rules read sibling *values*
(`country === 'US'`), not touched state, so values-only meets § 0's use case in full.
Recorded as open question 8.2 rather than designed here.

One cost of § 3.4.2's liveness lands here and is inherited rather than introduced:
`warnOnNestedSignals` runs **once**, at construction. A nested-signal value added to a
source afterwards gets no dev-mode diagnostic, so the one misuse `eval-signals` detects
for us goes undetected on exactly the path this plan chose. Small — the shape is a
developer mistake in the *source*, not in a server-supplied schema — but it is a direct
consequence of choosing a live source and belongs on the record.

### 3.6 Which properties ship — `visible` and `text`

Matching [`ROADMAP.md:169`](../../ROADMAP.md), and both are pure derived state the
template reads. `visible` coerces to boolean by JavaScript truthiness, stated in the
README; `text` coerces via `String(value)` with `null`/`undefined` mapping to `''`.

**`disabled` is deferred, with a reason rather than a shrug.** Applying it means calling
`control.disable()`, which is three distinct problems at once:

1. It is a **write back into the form**, adjacent to
   [`phase-3-plan.md`](../signals/phase-3-plan.md) § 9.4's "not provided". Not identical —
   § 9.4 forbids writing *through the evaluator*, and this would be the form binding using
   the form API, which § 9.4 explicitly permits — but it is the first property that is not
   purely derived, and it deserves its own design rather than a ride on `visible`'s.
2. `disable()` **emits on `valueChanges`** by default (`forms.d.ts:3016-3018`), and the
   value it emits feeds the very source the rule read. A rule whose expression names its
   own field re-enters. Whether that converges depends on the expression, which means the
   library would be shipping a loop whose termination is the consumer's problem.
3. It removes the value from the parent aggregate — trap 1, now triggered by us.

A fourth constraint applies to `/reactive` whenever it does arrive, and is recorded now so
the later phase inherits it rather than rediscovering it: **a `control.disable()` driven by
a reactive read belongs in an `effect`, never in a `computed` body.** It is a write to
state outside the reactive graph, which is exactly what `effect` is for and what a
`computed` forbids — and the current per-property shape (§ 3.7) is `computed`-backed
throughout, so `disabled` is not merely one more entry in the property list. It is the
first property that changes the shape.

Under Signal Forms none of the three problems above exists: `disabled` is declarative there
and Angular owns the semantics. So `disabled` is a good candidate for the `/signals` entry point in a
later phase **even though it is deferred here**, and § 9 lists it. That asymmetry is
another instance of § 3.2 and is fine.

`required` is deferred with the validators, per [`ROADMAP.md:169`](../../ROADMAP.md).

### 3.7 Lifetime and teardown at form scale

A form of N fields with M properties each creates:

- **N** `EvalContext`s (§ 3.4.1),
- **N × M** `EvalSignal`s, each holding either a `DestroyRef` registration or — under the
  explicit `injector` option, which every one of these takes — **none at all**, in which
  case `destroy()` is ours to call (`eval-signal.ts`, `EvalSignal.destroy` docs),
- **N live** `toSignal` subscriptions (§ 3.5.4) — a *live* count, not a total, because
  trap 5 churns them: one release and one subscribe per control instance replaced, over
  the binding's whole life.

So there are two teardown paths, both owned by the form binding, and reviewer item 4's
questions are the exit criteria of step 5: exactly one destroy per signal created;
teardown reaches every property of every field, not only the rendered ones; and it
survives a form destroyed twice.

**The churn is the assertion, and "a field removed and re-added works" is not.** That
criterion — revision 1's — passes against a binding that tears down and re-subscribes
*everything* on every group event, which is both wasteful and a different design from the
one § 3.5.5 specifies. The discriminating form is per-instance: replacing one control
produces **exactly one** unsubscribe and **exactly one** subscribe, and every untouched
control's subscription object is the same object it was before. Step 5 states it that way.

The `injector`-means-no-auto-teardown behaviour is the trap here. Every `EvalSignal` this
library creates is created outside a component's injection context (a form binding is
constructed in a service or a factory), so **none of them auto-destroy** and all N × M are
ours. A spec that only checks "the form's `destroy()` runs" would pass on a binding that
destroys the first field and leaks the rest; the assertion is a count.

**The binding is constructed, not computed, and `toSignal` enforces it.** `toSignal` opens
with `assertNotInReactiveContext`, so `bindFieldProperties` — which reaches
`createControlSource`'s `open()` for every control, and again for every control *added*
later — throws out of that call if it runs inside an `effect()` or a `computed()`. Carried
here from step 3 because step 4 is where it becomes reachable: `createControlSource` is
called by the library, `bindFieldProperties` is called by the consumer. It stays a note
rather than a defect because the binding is built once, in a service or a factory, which
is the same premise the `injector` requirement above rests on — but a consumer who wires
it into an `effect()` gets an error naming `toSignal` and nothing naming this library.

**One mirror per form, not per field.** `bindFieldProperties` calls `createControlSource`
once and hands the same source to all N `createFieldContext` calls. Per field would make
the live count of the third bullet N², and would run trap 5's O(N) diff N times per
`group.events` emission — on a signal that already fires several times per interaction
(§ 3.5.5). The N contexts of § 3.4.1 are per field; the mirror underneath them is not.

---

## 4. Work breakdown

Each step is one commit and one PR, leaves all three projects green, and is executed in
its own session (CLAUDE.md, "Working from a plan"). There is no step 0 — finding 1.2.1.

### Step 1 — Two entry points, the manifest, and a green build

The unproven-mechanism step (finding 1.2.7), and the one that must restore this branch's
CI (finding 1.2.1).

- **Edit**: `modules/eval-forms/package.json` — the four peers of § 3.3.1
  (`@angular/core >=19.0.0`, `@angular/forms >=19.0.0`,
  `@zvenigora/ng-eval-core ^0.3.0`, `@zvenigora/ng-eval-signals ^0.1.0`); **drop
  `@angular/common`** unless something actually imports it; add
  `description`/`keywords`/`author`/`license`/`homepage`/`repository` matching the other
  two manifests. Two upstream peers, not one — see § 3.3.1's closing note.
- **Edit**: `modules/eval-forms/project.json` — `prefix: "zvenigora"`, and
  `modules/eval-forms/eslint.config.mjs` selector prefixes to match, as Phase 3 step 1 did.
- **New**: `modules/eval-forms/src/public-api.ts`; **edit** `src/index.ts` to
  `export * from './public-api';`
- **New**: `modules/eval-forms/reactive/ng-package.json` — `{ "lib": { "entryFile":
  "src/public-api.ts" } }` against `ng-entrypoint.schema.json`.
- **New**: `modules/eval-forms/reactive/src/public-api.ts`.
- **Edit**: `modules/eval-forms/tsconfig.lib.json` and `tsconfig.spec.json` — widen
  `include` to reach `reactive/` (finding 1.2.6), **and widen `tsconfig.lib.json`'s
  `exclude` in the same edit** with `reactive/**/*.spec.ts` and `reactive/**/*.test.ts`.
  Finding 1.2.6 spotted the `include` half only. `include` widened alone pulls the
  secondary entry point's specs into the *library* compilation, where `types: []` leaves
  `describe` and `it` undeclared — a build failure that reads as unrelated to the
  entry-point work this step exists to prove.
- **Edit**: `tsconfig.base.json` — add
  `"@zvenigora/ng-eval-forms/reactive": ["./modules/eval-forms/reactive/src/public-api.ts"]`.
- **New**: the smallest real runtime symbol at each entry point, because a type-only
  barrel does not satisfy ng-packagr — `src/lib/field-context.ts` exports
  `createFieldContext` as a **composition-only** stub (the two lookups of § 3.4.2, no
  `undefined`-precedence rule and no characterization spec yet, both of which are step 2);
  `reactive/src/lib/control-source.ts` exports `createControlSource`, value only.

  **`createControlSource` ships its final signature here — `(group: FormGroup, { injector })`
  — with the trap 5 diffing deferred to step 3.** Shipping the `Record<string,
  AbstractControl>` shape now would have step 3 rewrite the symbol *and* its spec, and a
  signature rewrite is the kind that leaves a stale caller behind. Taking the group and
  reading `group.controls` once costs this step nothing.

  The stub must genuinely **import from `@zvenigora/ng-eval-signals`** — the boundary probe
  below has nothing to fail on otherwise, and a probe with nothing to fail on is the
  vacuity this plan's own § 1.1 memory warns about.
- **New**: co-located specs for both, test-first.
- **Edit**: `modules/eval-forms/README.md` — minimal real content; the full README is
  step 6.
- **Exit**:
  - `eval-forms` **lint, test and build:production all green** — all three, since two are
    red at baseline (§ 1.1);
  - `dist/modules/eval-forms/reactive/` exists and contains its own generated
    `package.json`; the root `npm run build` is green, which is the CI obligation of
    finding 1.2.1;
  - `eval-core` (41 / 717) and `eval-signals` (5 / 97) unmoved, both lints clean;
  - **a spec imports through `@zvenigora/ng-eval-forms/reactive`**, the consumer subpath,
    not a relative path — this is the only assertion that proves the mapping rather than
    the file;

    **Clarified during step 1, because the obvious attempt fails and the obvious
    conclusion from that failure is wrong.** `@nx/enforce-module-boundaries` rejects a
    package-name import that resolves back into the **same entry point** — "Projects
    should use relative imports to import from other files within the same project" — and
    the root config's `allow: []` admits no exception. That is not a reason to abandon the
    criterion: the rule calls `belongsToDifferentEntryPoint`
    (`@nx/eslint-plugin/dist/src/rules/enforce-module-boundaries.js:262-268`) and exempts a
    self-import that crosses entry points. Verified all four combinations by probe:

    | Spec location | Import | Result |
    | :--- | :--- | :--- |
    | `src/lib/` | `@zvenigora/ng-eval-forms` | error |
    | `reactive/src/lib/` | `@zvenigora/ng-eval-forms/reactive` | error |
    | `src/lib/` | `@zvenigora/ng-eval-forms/reactive` | **clean** |
    | `reactive/src/lib/` | `@zvenigora/ng-eval-forms` | **clean** |

    So each entry point's mapping is proven **from the other entry point's spec folder**,
    which is what step 1 does. Jest resolves both through the nx preset's
    `@nx/jest/plugins/resolver`, which reads the root `tsconfig` `paths` — so this
    exercises the `tsconfig.base.json` entry this step added, which the `dist/` check
    below does not.

    Consequence for **step 4**: `bindFieldProperties` lives in `/reactive` and needs
    `createFieldContext` from the primary. It must import it as
    `@zvenigora/ng-eval-forms`, which row 4 above permits — **not** as
    `../../../src/lib/field-context`, which would duplicate the core into both FESM
    bundles. A relative cross-entry import is legitimate in a spec and wrong in lib code.
  - the built package resolves the way a consumer will:
    `dist/modules/eval-forms/package.json` carries an `exports` map with a `./reactive`
    key whose `types` and `default` name emitted files, and
    `dist/modules/eval-forms/reactive/package.json` points at the same pair. Added in step
    1 alongside the criterion above, not instead of it: that one proves the `paths`
    mapping, this one proves the ng-packagr wiring, and neither substitutes for the other;
  - the **boundary-tag probe**: temporarily narrow `scope:forms` in the root
    `eslint.config.mjs` to `['scope:core']`, confirm the `eval-signals` import now fails
    with `A project tagged with "scope:forms" can only depend on libs tagged with
    "scope:core"`, then restore. A positive-only probe proves nothing here — the root
    config has no catch-all `{sourceTag: '*'}` rule, so an unmatched source tag is
    unconstrained and the passing import passes identically with the entry deleted. If a
    reverse probe is also run (`eval-signals` importing this library), remove one probe
    file before reading the result, or `@nx/enforce-module-boundaries` reports a circular
    dependency instead of the tag violation.

### Step 2 — The shared core, and the constraint that keeps it shared

`createFieldContext` gets its real behaviour, and the core acquires the property that
makes § 9 possible.

- **Edit**: `src/lib/field-context.ts` — the **two lookups** of § 3.4.2 (not a joined
  record), the precedence rule of § 3.4.3 including its `undefined` clause, one context
  per field (§ 3.4.1).
- **New**: `src/lib/error-policy.ts` — `ExpressionErrorPolicy`, **the type only**.
  `applyErrorPolicy` is deferred to the `/signals` phase (§ 3.4.4): `createEvalSignal`
  owns the policy on the `/reactive` path, so the helper would ship with no caller —
  § 9.1's own rule, applied to both helpers rather than one.
- **New**: `src/lib/coercion.ts` — the `visible` / `text` coercion rules of § 3.6, in the
  core because both adapters need identical semantics.
- **Edit**: `src/public-api.ts` — the primary barrel gains the two new modules. § 5
  publishes `toVisible`, `toText` and `ExpressionErrorPolicy` from this entry point, so
  the barrel edit follows from the deliverable rather than being a deviation from it.
- **Edit**: `src/lib/field-context.spec.ts` — the precedence, live-key-set, form-half and
  `LogicFn`-shape cases of the exit criteria below, plus the characterization spec.
- **New**: `src/lib/coercion.spec.ts` — the § 3.6 rules, including the two cases that
  separate them from the obvious wrong implementations (`'false'` is visible; `0` is
  `'0'`).
- **No spec for `error-policy.ts`.** It exports a type and no runtime symbol, so `tsc` is
  the whole enforcement and a spec would assert nothing — CLAUDE.md's rule about a test
  that would pass without the code it tests, in its limiting case.
- **Exit**:
  - the precedence spec asserts **three** things (§ 3.4.3): the collision resolves to the
    field; removing the field key makes the form key visible again — which distinguishes
    the decision from "the form source was never consulted at all"; and a field key bound
    to `undefined` resolves the **form** value. The third is the only one that
    discriminates between the two-lookup mechanism and the rejected joined record, and an
    empty `FormControl` is the common case that hits it;
  - the live-key-set spec asserts a key added to the form source after construction
    **resolves**, and — the load-bearing half — that an expression which already read it as
    missing **does not recompute** until `invalidate()`. Both, or § 3.4.2's two-part rule
    is only half-tested. The first half is also what would catch a regression to a
    copy-based join;
  - a **characterization spec** pins the upstream liveness § 1.3 records as unpinned:
    `createSignalContext` over a record mutated after construction resolves the new key.
    Labelled in the file as characterizing `eval-signals` behaviour that its own contract
    does not promise, so a future reader knows why an eval-forms spec is asserting
    somebody else's implementation;
  - **the constraint of § 3.4.5, checked two ways, because neither is sufficient alone:**
    - **the core's `@angular/core` import list is empty**, and its
      `@zvenigora/ng-eval-signals` imports are exactly `createSignalContext`,
      `SignalContextSource` and `SignalContextWriteError`, and nothing from
      `@angular/forms` — all readable from the diff. An import list rather than a grep for
      `computed(` / `destroy(` / `DestroyRef`: that grep passes on a core that memoizes in
      a `signal()` and recomputes in an `effect()`, and on `linkedSignal`, `toSignal` and
      `resource` besides. The manifest cannot enforce any of this (§ 3.3.1), so the import
      list is the whole enforcement;
    - a spec exercises the core through a **`LogicFn`-shaped call** — a plain function the
      spec invokes inside a `computed()` the *spec* owns — and asserts per-key tracking:
      recompute when a read key changes, **no recompute when an unread key changes**. This
      is § 9's shape, executed. It proves the core is usable with no reactivity of its own.

    Which check catches what, stated so neither is trusted for the other's job: the spec
    proves the `/signals` shape *works*; it would still pass if the core wrapped things in
    its own `computed()`, because the spec's outer `computed()` would track through it. The
    **import list** is the only thing that catches that. Conversely the import list would
    pass on a core that is unusable from a `LogicFn` for some other reason.

    Neither catches what § 7 records separately: a core that satisfies both can still be
    *unsafe* on the `/signals` path, because the scope-leak containment does not exist
    there (§ 9.1). That is a precondition written down, not a check.
  - all three projects green.

### Step 3 — The mirror, and the five traps

- **Edit**: `reactive/src/lib/control-source.ts` — the real behaviour behind step 1's
  signature: per-control `toSignal` with the explicit `injector` (§ 3.5.4), and the
  key → instance map with `group.events` diffing of § 3.5.5. Per-control is trap 1's
  granularity and **one signal per key** is the lifetime — § 3.5.5's amendment says why
  the other reading reintroduces the freeze.
- **Edit**: `reactive/src/lib/control-source.spec.ts` — the trap specs below. Listed
  explicitly because every exit criterion of this step is one, and step 1's three
  snapshot-shape assertions survive the change to a mirror rather than being replaced.
- **Edit**: `modules/eval-forms/package.json` — an `rxjs` peer dependency. Added during
  step 3 and not foreseen by step 1's manifest work: this is the first step in which any
  of the three libraries imports rxjs *directly* (`Subject` / `switchMap` / `takeUntil` —
  § 3.5.5's channels), and `@nx/dependency-checks` fails the lint target until the
  manifest says so. Pinned `^7.8.0`, the version the workspace builds and tests against,
  rather than Angular's own looser `^7.4.0` floor.
- **Exit**: a spec for traps 1, 3, 4 and 5 — trap 2 folds into trap 1, for the reason given
  below — and the setups are where these go vacuous, not the assertions —
  - **trap 1**: a real `FormGroup` with two controls; `controls.country.disable()`; assert
    an expression naming `country` — evaluated for a *different* field — still resolves
    `country`'s value. This discriminates on its own: a group-backed mirror reads
    `group.value`, from which the disabled control has vanished, and fails it. Confirm that
    by building the mirror the group way once and watching it go red. Expect the negative
    reactivity assertion below to go red alongside it — a group mirror collapses every
    field into one signal, so an unnamed control's change does cause a recompute. Two
    failures is the correct result of this probe, not a sign it misfired;
  - **trap 2 has no separate spec, deliberately.** It is a second reason for the same
    decision trap 1 already forces, and a spec for it would be asserting Angular's
    documented parent-update ordering rather than anything this library does. Recorded in
    § 3.5.2 so that a future reader who "fixes" trap 1 with `group.getRawValue()` finds the
    reason that fix reintroduces a different failure;
  - **trap 3**: `setValue(v, { emitEvent: false })` leaves the property stale — asserted
    as **current behaviour**, with the `invalidate()` call then restoring it. Pinning the
    limitation is the point; a spec asserting the right answer would have to fail.
    Note this spec runs a step early relative to what it needs: `invalidate()` lives on the
    property signals, which `bindFieldProperties` does not create until step 4, so this
    spec hand-builds one `createEvalSignal` over the mirror to have something to
    invalidate. Workable, and cheaper than deferring the trap. **It is also the criterion
    that decided § 3.5.5's record shape** — the restoring half is simply false against a
    signal-valued record, so writing this spec is what forces the accessor;
  - **trap 4**: constructing outside an injection context with no `injector` throws, and
    with one does not — and the subscription is released when that injector is destroyed;
  - **trap 5**: `group.setControl('country', new FormControl('CA'))` on a group whose
    `country` was `'US'`; assert an expression naming `country` now reads `'CA'` — and
    that a property built **before** the replacement reads it, which is the half § 3.5.5's
    amendment adds and a bare `simpleEval` cannot see. The vacuity-resistant half is the
    churn, not the value. Revision 2 wrote that as "every untouched control's subscription
    object is identity-equal to what it was before", which is not observable:
    `createControlSource` returns a plain record and hands back no subscription objects.
    Amended in step 3 to what the record and a real `FormGroup` actually expose, which is
    strictly more than the original asked for —
    - the untouched control's `valueChanges` observer count stays at **exactly 1**
      (RxJS 7.8 `Subject.observers`; a real control, per § 6.1);
    - the replaced control's drops to **0**, and the new instance's goes **0 → 1** — one
      release and one subscribe, the churn assertion in its measurable form;
    - the **untouched key's accessor is identity-equal in the record**
      (`Object.getOwnPropertyDescriptor(source, key).get`, since § 3.5.5's record holds
      values behind accessors and hands out no signal objects at all). Under the
      one-entry-per-key mechanism this *must* hold, which is what makes it a real
      assertion rather than an incidental one — and the **replaced** key's accessor is
      identity-equal too, which is the assertion that separates the mechanism from the
      naive per-instance one.

    A binding that tears down and rebuilds everything on each `group.events` emission
    passes the value assertion and fails these, which is the whole point — and
    `addControl` / `removeControl` are the same assertion in their other two shapes.

    Two cases were added during step 3 after a review, both because the diff reads the
    group by key and § 0's field names come from a server:
    - **a removed control named off `Object.prototype`.** `FormGroup` keeps the caller's
      object literal and warns only on keys containing a dot, so `constructor` is a legal
      field name; after `removeControl` a bare `controls[name]` resolves `Object` rather
      than `undefined`, and the diff then misreads the removal as a *replacement*. The
      key is never released. § 3.4.2's own-property rule, applied on this side of the
      library. Asserted on the record — `EvalContext.get` consults `original` first, so
      this key is unreadable through an expression whatever the mirror does (§ 3.4.3's
      third layer);
    - **the `group.events` subscription's own lifetime.** The source holds two long-lived
      subscriptions, and the trap 4 teardown criterion reaches only the `toSignal` ones —
      `toSignal` unregisters itself either way, so dropping `takeUntilDestroyed` leaves
      every other case in this file green. It must be asserted through a **replacement**
      after teardown, not an addition: after an addition both implementations look
      identical, because an unscoped subscriber throws NG0205 off the destroyed injector
      before subscribing to anything;
  - reactivity is asserted by **recompute counts across a control change**, plus the
    negative case (a control the expression never named must not cause a recompute), per
    [`phase-3-plan.md`](../signals/phase-3-plan.md) § 6.1.

    **This is the only layer where the negative case is observable**, recorded during
    step 4 because the obvious place to ask for it again is step 4's spec and it cannot be
    written there: `bindFieldProperties` puts two `computed` layers in front of the source,
    both deduping on `Object.is`, so an inner over-subscription that recomputes without
    changing the value never reaches the signal a consumer holds. The *positive* direction
    is asserted at both layers;
  - all three projects green.

### Step 4 — The field schema and `visible` / `text`

- **New**: `reactive/src/lib/field-schema.ts` — the field descriptor
  (`{ name, visible?, text? }`) and the binding that turns a schema plus a `FormGroup`
  into per-field property signals, one `EvalSignal` per (field, property) via
  `createEvalSignal` over the core's context.
- **New**: `reactive/src/lib/field-schema.spec.ts` — the exit criteria below. Named
  explicitly during step 4 rather than left implied: every criterion of this step is a
  spec, and "driven through the public subpath import" is one of them.
- **Edit**: `reactive/src/public-api.ts` — `FieldSchema`, `FieldProperties` and
  `bindFieldProperties`, per § 5. Also added during step 4: the spec's subpath import
  resolves this file, so the step cannot meet its own criteria without it.
- **Signature**, settled before the step rather than improvised inside it:

  ```ts
  bindFieldProperties(
    schema: readonly FieldSchema[],
    group: FormGroup,
    options: { injector: Injector; onError?: ExpressionErrorPolicy }
  ): Record<string, FieldProperties>
  ```

  **`createControlSource` is called *once*, for the form half — never per field.** Per
  field would build N mirrors over one group: N × the `toSignal` subscriptions of § 3.7's
  live count, and trap 5's O(N) diff running N times per `group.events` emission on a
  signal that already fires several times per interaction (§ 3.5.5). Stated here because
  step 5's teardown counts rest on it: the live-subscription count it asserts is N, and
  under a per-field mirror it would be N².
- **The field half is deferred, and ships as an empty source this step.**
  `createFieldContext`'s two-source signature stays exercised and § 3.4.1's N-contexts
  rule still holds and is still asserted — the second argument is `{}`. What the
  field-local key set *contains* is specified nowhere in this plan, and § 3.4.3's
  "a field named `value`, `name` or `index`" is an illustration of collision **semantics**,
  not a specification of which keys exist; inventing three keys to fill a parameter is how
  a public surface acquires members nobody chose.

  The cost, stated rather than left to be discovered: **§ 3.4.3's precedence rule ships
  untested end-to-end.** Step 2's `field-context.spec.ts` asserts all four of its
  assertions at the core, so the rule is not unasserted — but no `/reactive` path produces
  a field-local key, so nothing exercises it through `bindFieldProperties`. It gets
  settled by whichever phase first has a consumer for a field-local key: the `/signals`
  adapter (§ 9), whose `FieldContext` supplies one natively, is the likely one, and it is
  additive — a second argument that stops being `{}`.
- **Open questions settled here, per their own "decide in step 4" instruction:**
  - **8.3 — yes, validate the schema at construction.** Three checks, and the count is the
    boundary: a **duplicate field name**, a **non-string `visible` / `text`**, and a
    **field name that resolves off `Object.prototype`** (§ 3.4.3's third layer, which no
    other layer can catch and which only this one can name in the message). This is three
    checks and not a validation layer; if it starts to grow a schema language, that is a
    stop-and-say-so, not a step 4 expansion.

    **The third check runs over control names as well as schema names**, which is the same
    check over the other source of names rather than a fourth one. Added after step 4's
    review corrected a belief this plan had encoded twice: a control named `constructor`
    is **not** rescued by the mirror defining an own accessor for it. Measured — the
    accessor is present on the source and the expression still reads
    `function Object() { [native code] }`, because the mirror is reached through `lookups`
    (step 4 of `EvalContext.get`) while `original` is the empty field source read at
    step 2, with a bare property access. So a *control* named off `Object.prototype` is
    unreadable through every expression, silently and truthily, exactly as a schema field
    of that name is — and it is worse, because the value genuinely exists.
  - **Enforcement is construction-time only, and that is a limitation rather than a
    guarantee.** `validate` reads `group.controls` once. `addControl('address', new
    FormGroup(…))` afterwards reaches `sync` → `open` with no check, and throwing from
    there is not available: a throw inside the `group.events` subscriber unsubscribes it
    and silently ends all diffing for the life of the form (§ 3.5.5). So 8.5's answer is
    precisely "a thrown error at construction **plus** a documented limitation after it",
    and § 6's README says both.
  - **8.5's second half — a nested control or `FormArray` throws**, and it follows from the
    same check rather than being a fourth one: the group is read for the prototype-name
    check anyway, and "not a `FormControl`" is a schema error of the same kind. A
    documented limitation was the alternative and it is the worse one — the failure
    otherwise surfaces as a confusing evaluation result, per open question 3's own framing.
  - **8.1 — recorded, not acted on.** `visible` remains a boolean the consumer's template
    decides on. Whether the README states a rendering recommendation is step 6's file and
    step 6's call; this step does not pre-empt it.
- **Carried forward from step 3 § 5.2:** `toSignal` opens with
  `assertNotInReactiveContext`, so anything in `bindFieldProperties` that could run inside
  an `effect()` throws out of `createControlSource`'s `open()`. Step 4 is where that
  becomes reachable — the binding is what a consumer calls, and a consumer who calls it
  from an `effect()` gets an error naming `toSignal`. The binding is constructed once, in
  a service or factory (§ 3.7), which is what keeps this a note rather than a defect.
- **Exit**: an end-to-end spec — a schema, a **flat** `FormGroup` of `FormControl`s per
  open question 8.5, a control change, and the
  property observed to change — driven through the public subpath import; the coercion
  rules of § 3.6 asserted, including `null`/`undefined` → `''` for `text`; the § 3.4.4
  default asserted with an expression that genuinely **throws** — ~~`user.name.first` where
  `user` is absent raises a `TypeError`~~ **corrected in step 4: it does not.** Measured
  across nine forms before amending: `member-expression.ts` resolves a member of `undefined`
  through `safeGetProperty`, which returns `undefined` for a null-ish target rather than
  throwing, so `user.name.first`, `null.x` and `undefinedThing.x.y.z` all resolve
  `undefined` and **no** member access throws. What throws is a **call**:
  `user.name.first()` raises `Error('Cannot call undefined or null function')` from
  `call-expression.ts`'s `safeCall`, and `country()` over a number raises
  `Error('Value is not a function: number')`. So the criterion stands with the expression
  changed to `user.name.first()` and the error class to `Error`, not `TypeError` —
  eval-core throws plain `Error`s throughout. The distinction the criterion exists for is
  untouched and is now sharper, since the guard is exactly what makes a rule merely
  *naming* a missing field resolve `undefined` on its own and pass with no error policy at
  all; and a
  `SignalContextWriteError` (`count = 5`) asserted to bypass that default rather than
  becoming a silent blank — and note the default is *resolved here* before forwarding
  (§ 3.4.4), since `createEvalSignal` would otherwise supply `'throw'`;
  **the context count of § 3.4.1 asserted directly**: N fields produce N *distinct*
  `EvalContext` instances, and a scope pushed onto field A's context is not visible from
  field B's. Without it, a binding that shares one context across every field passes every
  other criterion in steps 4 and 5 — and § 3.4.1's own argument, that field A's leaked
  arrow scope shadows field B's key of the same name because `scopes` precedes `lookups`
  in `get`, is exactly what a shared context produces.
  **The leak has to be made to happen, and this is where the setup goes vacuous — twice.**
  Two forms were tried and measured before the third was written:
  - `((country) => country.x.y)(1)` — **does not leak.** By the correction above, no member
    access throws, so the body returns and `arrow-function-expression.ts` pops normally.
  - `((country) => country())(1)` — throws, and **still does not leak**, which is the one
    that matters. `createEvalSignal` marks `ctx.scopes.length` before the walk and drains
    back to it in a `finally` — [`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.8.3's
    containment, which covers a caller-supplied `EvalContext` as readily as one it built.
    So **every in-walk leak on this path is already contained upstream**, and § 3.4.1's
    stated argument is not reachable through `bindFieldProperties` at all.
  - What is reachable is the case § 3.8.3 names as uncontained: **an arrow function that
    escapes the walk**, whose push and missing pop happen when the consumer calls it, long
    after the recompute's `finally` ran. Through this library's surface that needs the
    escape hatch to be in the *form*: a control whose value is a function that stores its
    argument, `visible: 'keep((country) => country())'`, and the spec calling the stored
    closure with `'LEAK'`. Measured: field A's own `text: 'country'` then reads `'LEAK'`
    and field B's reads `'CA'` — distinct contexts — where one shared context gives both
    `'LEAK'`.

  Both halves stay in the spec. Field A's `'LEAK'` is what separates "B was protected by a
  separate context" from "no leak ever happened", and it is the assertion that caught the
  first two forms.

  **Consequence for § 3.4.1, recorded rather than acted on.** One context per field remains
  correct and is still what ships, but its *justification* on the `/reactive` path is
  narrower than the section claims: upstream containment means only an escaped arrow can
  shadow a sibling field, and no shipped property can produce one, because `visible` and
  `text` coerce their value and hand a consumer no closure. The rule is kept because
  § 3.8.3 calls itself containment rather than a fix, because `/signals` will not
  necessarily route through `createEvalSignal`, and because the alternative saves one
  object per field;
  `bindFieldProperties`' `injector` is required, per § 5;
  **the three schema checks of open question 8.3**, each asserted to throw and each with a
  companion case proving the valid shape does not — a duplicate name, a non-string
  `visible`, a field named off `Object.prototype`, and a non-`FormControl` under a schema
  name (8.5's half). The prototype-name case is the one that goes vacuous most easily: the
  discriminating setup is a schema naming `constructor` over a group that **has no such
  control**, since a group that does have one makes the check indistinguishable from a
  plain own-property read;
  all three projects green.

### Step 5 — Lifetime and teardown at form scale

- **Edit**: the binding from step 4 gains its teardown.
- **Added after step 4's review: a bind that throws part-way through must release what it
  already built.** Step 4 puts `validate` before `createControlSource`, so a *schema*
  rejection opens no subscription and that is asserted — but a **parse** error cannot be
  validated ahead of the loop, and `createEvalSignal` compiles eagerly (§ 3.4.4's
  amendment). Measured: `visible: 'country ==='` throws from inside the loop with the
  mirror's `valueChanges` subscription already open (0 → 1) and the `group.events`
  subscription registered on the injector's `DestroyRef` — which for a root injector is
  the life of the application — and the binding has not returned, so the caller holds no
  handle to any of it. Not fixable in step 4: releasing the mirror needs a handle
  `createControlSource` does not return, and adding one edits step 3's file. The exit
  criterion is the same count in its failing form — **a bind that throws leaves zero live
  subscriptions and destroys every `EvalSignal` it had already created.**
- **Exit**: the counts of § 3.7 asserted — **N × M** destroys for N × M signals, not "the
  form's destroy ran"; teardown reaches unrendered fields; a form destroyed twice does not
  throw; the live `toSignal` subscriptions are released on the same path. Break the loop
  bound (destroy only the first field) and confirm the count assertion fails.

  **"A field removed and re-added works" is replaced**, not kept. It passes against a
  binding that tears down and re-subscribes everything on every group event, which is a
  different design from § 3.5.5's. The criterion is the churn: replacing one control's
  instance produces **exactly one** unsubscribe and **one** subscribe, and the untouched
  controls' subscription objects are unchanged — the same assertion trap 5 makes in step 3,
  here carried across a full teardown so a churned-then-destroyed binding leaks nothing.

### Step 6 — Docs, worked example, and release

- **Edit**: `modules/eval-forms/README.md` — following `modules/eval-core/README.md`'s
  pattern. Must contain § 0's "when not to use this library" paragraph, § 3.3.1's version
  story (one peer range; `/signals` needs Angular 22), § 3.4.2's two-part live-key rule,
  § 3.4.3's `undefined`-field-key clause and its prototype-name warning, and § 3.5.3's
  `{ emitEvent: false }` limitation.
- **New**: a worked example.
- **Edit**: `CHANGELOG.md`, version to 0.1.0, and `ROADMAP.md` — Phase 4 marked done, the
  `/signals` entry point added as a new phase carrying § 9 and its § 9.1 precondition.
- **Edit**: `ROADMAP.md` § Phase 4's exit criteria, which **three decisions in this plan
  narrow**. Listed here so the amendment is planned rather than discovered at close-out,
  which is when a narrowing starts looking like an omission:
  - [`ROADMAP.md:169`](../../ROADMAP.md) names "`visible`/`text` support wired to Reactive
    Forms". That ships. But § 3.6 **defers `disabled`**, which the phase's opening
    paragraph lists among the field properties — decisive reason: `disable()` emits on
    `valueChanges` by default, so a rule naming its own field re-enters its own input, and
    whether that converges depends on the expression.
  - § 3.5.6 narrows the expression context to **field values only**; form state
    (`touched` / `dirty` / `valid`) is not addressable. ROADMAP does not promise it, but
    "expressions over form state" in the phase's opening sentence reads wider than what
    ships.
  - Open question 8.5 narrows the worked example to **flat forms**; `FormArray` and nested
    `FormGroup` are out of scope.

  All three are narrowings of scope, not of the design — each is additive when it arrives.
  The amendment says which and why, and none of them is presented as complete.
- **Exit**: the README's examples execute as written — by hand, per `ROADMAP.md`'s note
  that this is a review practice rather than a gate; all three projects green.

---

## 5. Public API surface added

```ts
// from @zvenigora/ng-eval-forms  (primary — the core)
export { createFieldContext,
         type ExpressionErrorPolicy,     // a type only — applyErrorPolicy is deferred
         toVisible, toText };            // to the /signals phase, § 3.4.4

// from @zvenigora/ng-eval-forms/reactive
export { createControlSource,            // takes a FormGroup, § 3.5
         type FieldSchema, type FieldProperties,
         bindFieldProperties };
```

`FieldProperties` maps each property name to an **`EvalSignal`, not a plain `Signal`.**
Both extra members are load-bearing on this path: `invalidate()` is trap 3's hatch and
§ 3.4.2's key-set hatch, and `destroy()` is what step 5 counts. Typing it as `Signal`
would make both unreachable through the published surface.

**Amended in step 4, on both halves of that sentence.** The type arguments are
`EvalSignal<boolean>` for `visible` and `EvalSignal<string>` for `text`, not
`EvalSignal<unknown>`: this section was written before § 3.6's coercion had a home, and
`coercion.ts` settled it — "both adapters call this" — so `unknown` now describes the value
the property is built *from* rather than the one it answers with. And the two members are
**optional**, because the schema's `visible` and `text` are: a field that supplies neither
gets `{}`, which is why every consumer and every spec reads them through `?.`.

`bindFieldProperties` takes `{ injector: Injector }` **required**, not optional. § 3.7's
whole argument is that every `EvalSignal` here is built with an explicit injector and
therefore has no auto-teardown; an optional one means a call inside an injection context
silently gets auto-teardown instead, and step 5 would then be counting something other
than what ships. Outside an injection context and without it, `createEvalSignal`'s own
`inject(CompilerService)` throws NG0203 from a stack that does not name this library.

Nothing is added to `@zvenigora/ng-eval-core` or `@zvenigora/ng-eval-signals`. What this
library may import from them, under `src/lib/` and `reactive/src/lib/`:

- from `eval-core`: `EvalContext`, `EvalOptions`, and narrowing types — plus
  **`CompilerService` and the free `call` only in `/signals`**, which is not this phase
  (§ 9's sketch uses both);
- from `eval-signals`: `createSignalContext`, `SignalContextSource` and
  `SignalContextWriteError` in the **core**; `createEvalSignal`, `EvalSignal`,
  `EvalSignalOptions` and `SignalContextWriteError` in **`/reactive`**;
- from `@angular/forms`: **`/reactive` only**;
- from `rxjs`: **`/reactive` only** — added in step 3, whose per-key channels
  (§ 3.5.5) are `Subject` / `switchMap` / `startWith` / `takeUntil`. This is the first
  direct rxjs import in any of the three libraries, and it is what put an `rxjs` peer
  dependency in the manifest. Also recorded here: `SignalContextSource` is imported in
  **both** `src/lib/` and `reactive/src/lib/`, the latter as `createControlSource`'s
  return type since step 1, which the `eval-signals` row above lists under the core only;
- from `@angular/core` and `@angular/core/rxjs-interop`: **`/reactive` only** — the core's
  `@angular/core` import list is empty, which is § 3.4.5's rule in its enforceable form.

**This section governs `src/lib/` and `reactive/src/lib/`, not specs.** A spec may import
anything — step 2's `LogicFn`-shaped tracking spec necessarily reaches for `computed()`,
which the core itself may not.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Lint (new) | `npx nx run eval-forms:lint` | 0 errors — **red at baseline**, green from step 1 |
| Tests (new) | `npx nx run eval-forms:test` | Green; ≥1 suite from step 1 |
| Build (new) | `npx nx run eval-forms:build:production` | Clean, **and `dist/modules/eval-forms/reactive/package.json` present** — **red at baseline** |
| Root build | `npm run build` | Green from step 1 — the CI obligation of finding 1.2.1 |
| Lint (signals) | `npx nx run eval-signals:lint` | Unchanged, clean |
| Tests (signals) | `npx nx run eval-signals:test` | Unchanged: 5 suites / 97 tests |
| Lint (core) | `npx nx run eval-core:lint` | Unchanged, clean |
| Tests (core) | `npx nx run eval-core:test` | Unchanged: 41 suites / 717 tests |
| Perf (core) | `internal/performance.spec.ts` | Unchanged — this plan adds nothing to a per-node path |
| Boundaries | covered by `eval-forms:lint` | Proven by step 1's **narrowed** probe, not by a passing import |

Run **all** of these after every step. The `eval-core` and `eval-signals` rows are what
catch a step that quietly reached into a dependency against § 2.

### 6.1 Specs go through the end-to-end path

[`phase-3-plan.md`](../signals/phase-3-plan.md) § 6.1 applies here unchanged and is not
restated. Two additions specific to this library:

- **Through the published subpath.** From step 1, at least one spec per entry point
  imports via `@zvenigora/ng-eval-forms` / `@zvenigora/ng-eval-forms/reactive` rather than
  a relative path. Relative imports would pass on a package whose entry points are not
  wired at all, which is precisely what step 1 exists to prove. **The spec must sit in the
  *other* entry point's folder** — see step 1's exit criteria for why, and for the
  step-4 consequence.
- **Through a real `FormGroup`.** Not a stub with a `valueChanges` `Subject`. Traps 1, 2
  and 3 are all behaviours of Angular's own `AbstractControl` implementation; a fake
  emits whatever the spec author believed, which makes the spec a test of the belief.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
| :--- | :---: | :--- |
| **The core acquires reactivity of its own because `/reactive` is built first and it is locally convenient** | **High** — this is the default outcome, not a slip | § 3.4.5 as a rule, step 2's two-way check, and § 9 as the thing it is checked against. The **empty `@angular/core` import list** is the only one of the two that catches it — and it replaces revision 1's grep for `computed(` / `destroy(` / `DestroyRef`, which a core memoizing in a `signal()` and recomputing in an `effect()` passed cleanly |
| A field property silently freezes because a mirroring trap was missed | **High** | § 3.5's five traps, four of them specs, with the vacuity-resistant setups named in step 3. Trap 5 was missed entirely by revision 1 and found in review, which is the honest estimate of how complete this catalogue is |
| **A server-supplied field name shadows off `Object.prototype`** — `constructor`, `toString`, `valueOf`, `hasOwnProperty` resolve ahead of both sources | Medium, and **silent** | § 3.4.3's third layer. `createSignalContext` builds on an empty `original`, which `EvalContext.get` consults before `lookups`. Not containable from here — it is upstream and § 2 forbids the fix — so the mitigation is schema validation at construction (open question 3), which this makes the decisive argument for |
| The core's liveness rests on `eval-signals` behaviour nobody promised | Medium | § 1.3's last row, and step 2's characterization spec. A red test in *this* project is the available substitute for a contract this project may not amend |
| Secondary entry points fight Nx (not ng-packagr — finding 1.2.7) | Medium | Step 1 is exactly this and nothing else. If it fails, the fallback is two packages, and that decision belongs in this document before any adapter is written |
| Teardown reaches the first field and leaks the rest | Medium | § 3.7: every `EvalSignal` here takes an explicit `injector` and therefore auto-destroys **not at all**. Step 5 asserts a count, not that teardown ran |
| A leaked arrow-function scope on one field's context shadows a source key for the life of the form | Medium | § 3.4.1's one-context-per-field bounds the blast radius to one field; `createEvalSignal`'s own snapshot-and-restore containment ([`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.8.3) covers `/reactive`'s recomputes |
| **Step 2's constraint passes on a core that is still unsafe for the entry point it exists to enable** | **Medium, and structurally invisible** | § 3.4.5 asks whether the core is *usable* from a `LogicFn`; it asks nothing about whether it is *safe* there. The scope-leak containment `/reactive` inherits from `createEvalSignal` does not exist on the `/signals` path, and neither the import list nor the `LogicFn` spec can see that. § 9.1 states what containment would require and why it is not built in this phase; the mitigation for Phase 4 is that it is **written down as a precondition of `/signals`**, not that it is solved |
| `@nx/dependency-checks` cannot express two entry points and fails on one manifest | Medium | Surfaces at step 1's lint gate; resolve by declaring the peer, never by an `eslint-disable` (CLAUDE.md) |
| Someone narrows the peer range to `>=22` to "fix" the per-entry-point problem | Medium | § 3.3.1, stated prominently, and repeated in the README per step 6 |
| Someone bulks out `/signals` to balance it against `/reactive` | Medium | § 3.2 states the asymmetry is correct and names what "finished" means for `/signals` |
| Scope creep into `eval-core` or `eval-signals` | Medium | § 2 makes it a stop-and-replan condition; the § 6 rows for both detect it |

---

## 8. Open questions

1. **Does `visible` mean the field is not rendered, or rendered-and-hidden?** This library
   produces a boolean and the consumer's template decides, which is the right split — but
   it interacts with trap 1: a field the consumer stops rendering may also get disabled,
   and then its value leaves the group aggregate. Decide in step 4 whether the README
   states a recommendation or stays silent.

   **Settled in step 4: recorded, not acted on.** `visible` stays a boolean and the
   consumer's template decides. Whether the README carries a rendering recommendation is
   step 6's file and step 6's call, and step 4 does not pre-empt it.
2. **What shape do form *state* keys take when they arrive?** (§ 3.5.6.) The two candidates
   — a namespaced flat key per state per field (`email$touched`), or one
   `signal({...})` — trade key-set explosion against loss of per-key tracking. Neither is
   costed. Not this phase.
3. **Should the field schema be validated at construction?** A schema arriving from a
   server (§ 0) can be malformed in ways an expression cannot: a duplicate field name, a
   `visible` that is not a string. Currently these surface as a confusing evaluation error
   or silently. A construction-time check is strictly earlier and more informative; it is
   also a validation layer this library would then own. Decide in step 4.

   **§ 3.4.3's third precedence layer is the decisive argument for "yes".** A
   server-supplied field named `constructor`, `toString`, `valueOf` or `hasOwnProperty`
   resolves off `Object.prototype` ahead of both sources, and every rule reading it is
   wrong with no error anywhere. That is not containable at the context — it is upstream,
   in `createSignalContext`'s empty `original`, and § 2 forbids the fix — so schema
   validation is the only layer that can catch it, and it is the only layer that can name
   the offending field in the message. It also subsumes the third half of open question
   8.5: a nested control passed where a `FormControl` is expected is a schema error of the
   same kind. If step 4 decides "no", it must say what happens to `constructor` instead.

   **Settled in step 4: yes, three checks** — duplicate field name, non-string
   `visible` / `text`, and a field name that resolves off `Object.prototype`; plus 8.5's
   half, a schema name whose control is not a `FormControl`, which falls out of the same
   read rather than being a fourth check. Three is the boundary, not a starting point: if
   this grows toward a schema language, that is a stop-and-replan.
4. **Does `dependencies` introspection have a use at form scale?** `EvalSignal` exposes
   it, and a form binding could use it to answer "which fields does this rule depend on"
   for a form-builder UI — plausibly the most valuable thing this library could surface for
   its actual audience. It is also off by default for a good reason
   ([`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.4). Not this phase; recorded
   because it is the most likely Phase 6 feature.
5. ~~**Is one `EvalContext` per field the right granularity for array fields?**~~
   **Settled before step 1: flat forms only, and `FormArray` / nested `FormGroup` are out
   of scope (§ 2).** This one could bite step 4 rather than a later phase, because
   § 3.4.1's context count assumes a flat form and step 4 is where the binding that
   creates those contexts is written — so it is decided here rather than left as a
   question a step would have to improvise past.

   Flat, not deferred-by-accident. A `FormArray` of N rows is N × the field count of
   contexts under § 3.4.1's rule, and it raises a naming problem the flat case does not
   have: an expression inside row 3 that says `quantity` means *this row's* `quantity`,
   which needs a per-row scope the current field/form two-level composition (§ 3.4.3) has
   no third level for. Settling that without a consumer driving the shape would be
   speculative, and it is additive when it comes — a third source in the join, not a
   change to the two that exist.

   What this obliges: step 4's worked example and specs are a flat `FormGroup` of
   `FormControl`s; a nested control in the record passed to `createControlSource` is not
   supported, and step 4 decides whether that is a documented limitation or a thrown
   error. It is the second half of open question 3.

   **Settled in step 4: a thrown error**, raised by the schema check of open question 3
   rather than by a rule of its own. A documented limitation was the alternative and it is
   the worse one — unsupported nesting otherwise surfaces as a confusing evaluation
   result, which is the failure mode question 3 exists to remove.

---

## 9. The `/signals` entry point, on paper

Not shipped in this phase. Recorded here because it is what step 2's constraint is checked
against — a design the core cannot support is a core that is wrong, and this is how that
is detected before the code exists.

The whole adapter is a translation from a string to a `LogicFn`:

```ts
// sketch — not shipped in Phase 4
const compiled = compiler.compile('country === "US"');       // CompilerService, at the
const context  = createFieldContext(sourceFromModel(model), {});  // adapter — § 3.1

hidden(p.country, () => !toVisible(
  applyErrorPolicy(() => call(compiled, compiler.createState(context)), 'undefined')
));
// ^ Angular calls this inside its own reactive graph:
//   no computed() of ours, no destroy() of ours
```

Note which side compiles. The core supplies `createFieldContext` and `toVisible`; the
**adapter** holds the `CompilerService` and the free `call`, per § 3.1 — both are on
§ 5's `/signals`-only allowance. `applyErrorPolicy` is written *in this phase's successor*,
alongside this adapter, for the reason § 3.4.4 gives: it has no caller until this sketch
becomes code, and § 9.1 declines to build unexercised paths.

Four notes, each of which is a reason this cannot simply be written later without the
core having been built for it:

- **The source comes from the model signal, not from `ctx.valueOf`.**
  `RootFieldContext.valueOf(p)` takes a `SchemaPath` — a compile-time token
  (`_structure-chunk.d.ts:787`). A runtime string names a field by *string*, and there is
  no string → `SchemaPath` mapping. So the adapter builds its `SignalContextSource` from
  the `WritableSignal` model the consumer passed to `form()`, which gives the whole value
  tree reactively and keys it by name. This is why the core must accept a plain
  `SignalContextSource` and not something forms-shaped.
- **`text` goes through `createMetadataKey`, not a parallel mechanism**
  (`_structure-chunk.d.ts:966`, re-exported through the `signals.d.ts` barrel — the
  `@publicApi 22.0` tags finding 1.2.2 cites live in the chunk, not in the barrel).
  Signal Forms already has arbitrary per-field derived data with a
  reducer; inventing a second one is § 3.2's failure mode.
- **`visible` inverts to `hidden`** — finding 1.2.8.
- **`disabled` is available here and deferred in `/reactive`** — § 3.6. None of that
  section's three problems exists under Signal Forms.

### 9.1 The scope leak is uncontained on this path — and what containment would require

The one thing this sketch does **not** inherit is `createEvalSignal`'s
snapshot-and-restore containment for a leaked arrow-function scope
([`phase-3-plan.md`](../signals/phase-3-plan.md) § 3.8.3). `/signals` does not go through
`createEvalSignal`, so a context reused across `LogicFn` invocations — and § 3.4.1's
one-context-per-field is exactly that — carries the leak forward. Scopes are step 1 of
`EvalContext.get`'s resolution order, ahead of the adapter's own resolver, so one throwing
arrow body shadows a source key of the same name for every later invocation of every rule
on that field.

**This is checkable and it is not solved here**, so it is stated as a precondition:

*Containment is available, using only published surface.* It is the same three lines
`createEvalSignal` uses — snapshot `ctx.scopes.length` before the walk, and in a `finally`,
`ctx.pop()` back down to it. `scopes` and `pop` are both public on `EvalContext`, and the
sequence contains no `computed()` and no `destroy()`, so it is admissible in the core under
§ 3.4.5 rather than only in an adapter.

*The requirement is a single choke point.* Containment only works if **every** rule routes
through one evaluate helper; a rule that reaches for `call(fn, state)` directly bypasses it
silently. So whichever layer owns it, the shape it forces is the same: one function that
performs the walk, and no second path to the walk.

(Revision 1 added "if it lands in the core, `/reactive` gets it twice — harmless". The
harmlessness is right — an inner restore to a depth at or above the outer snapshot leaves
the outer loop nothing to pop — but the example is wrong: per § 3.1, `/reactive` never
calls the core's evaluate helper. It goes through `createEvalSignal` and gets the
containment **once**.)

*It is deliberately not built in Phase 4.* Nothing on the `/reactive` path needs it —
`createEvalSignal` already contains it — so building it now would ship an unexercised code
path whose only test would be one written against a consumer that does not exist. Phase 6
decides whether it lives in the core or in the adapter. What Phase 4 owes it is the
constraint above, and the § 7 row recording that step 2's checks cannot detect its absence.

*One residual gap survives containment either way*, and it is not worse here than in
Phase 3: an arrow function that **escapes** the walk and is called later pushes and pops
outside any frame either design controls ([`phase-3-plan.md`](../signals/phase-3-plan.md)
§ 3.8.3). Unsolved, in both libraries, and not this phase's to solve.
