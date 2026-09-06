# @zvenigora/ng-eval-forms

Angular form field properties — `visible` and `text`, plus `disabled` at the `/signals` entry
point — driven by **string** expressions resolved at runtime.

```ts
{ name: 'state', visible: "country === 'US'" }
```

That rule is a string. It can be fetched from an API, typed into a form-builder UI by an
administrator, or stored in a database and versioned separately from your application —
because nothing about it is compiled in.

The sources for this package are in the main [@zvenigora/ng-eval](https://github.com/zvenigora/ng-eval)
repo. Expression syntax, security and the evaluator's own options are documented in the
[repository README](https://github.com/zvenigora/ng-eval#readme); reactivity and the
`EvalSignal` type are documented in
[`@zvenigora/ng-eval-signals`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-signals#readme).
This file documents the forms library.

## When *not* to use this library

Angular 22 ships [Signal Forms](https://angular.dev/guide/forms/signals), whose schema
already expresses conditional `disabled`, `hidden`, `readonly`, `required` and arbitrary
per-field metadata. Every one of those rules is a `LogicFn` — a TypeScript closure,
compiled into your bundle.

**If your conditions are known at compile time and you are on Angular 22, use Signal
Forms' schema and not this library.** It will be faster, fully typed, and one dependency
lighter.

What this library adds is the one thing a closure cannot be: **a condition that is a
string, resolved at runtime.** That covers form definitions served by an API, rules
authored by an end user, and rules versioned independently of the application release.
Against the obvious alternative for those cases — `new Function(…)` — it brings what
`@zvenigora/ng-eval-core` already is: a sandboxed evaluator with no `eval`, safe under a
strict CSP, with prototype-pollution blocking, dependency introspection and
case-insensitive resolution.

## Install

```sh
npm install @zvenigora/ng-eval-forms @zvenigora/ng-eval-signals @zvenigora/ng-eval-core
```

## Entry points

| Import | Contains | Requires |
| :--- | :--- | :--- |
| `@zvenigora/ng-eval-forms` | The shared core — context composition and the coercion and error-policy rules every adapter uses. Imports nothing from `@angular/core` or `@angular/forms`. | — |
| `@zvenigora/ng-eval-forms/reactive` | The Angular **Reactive Forms** adapter — `FormGroup` / `FormControl`. `visible` and `text`. | Angular 19+ |
| `@zvenigora/ng-eval-forms/signals` | The Angular **[Signal Forms](https://angular.dev/guide/forms/signals)** adapter — `schema()` / `form()`. `visible`, `text` and `disabled`. | **Angular 22+** |

**Pick the adapter that matches the forms API you already use.** The two are independent — the
same expression string means the same thing at both — and neither imports the other. The design
and the measurements behind `/signals` are in
[the Phase 6 plan](https://github.com/zvenigora/ng-eval/blob/master/docs/forms/phase-6-plan.md).

## Versions

`peerDependencies` are declared per **package**, not per entry point, so the manifest holds one
set of ranges covering both adapters:

```json
"peerDependencies": {
  "@angular/core": ">=19.0.0",
  "@angular/forms": ">=19.0.0",
  "rxjs": "^7.8.0",
  "acorn-walk": "^8.3.0",
  "@zvenigora/ng-eval-core": "^0.3.0",
  "@zvenigora/ng-eval-signals": "^0.1.0"
}
```

**The Angular range is at the floor, and the floor is `/reactive`'s.** `/signals` requires
**Angular 22 or later** — that is when `@angular/forms/signals` ships — and the manifest cannot
say so: narrowing it to `>=22.0.0` would break every Reactive Forms consumer on 19–21 to add a
diagnostic for an entry point they do not import. An older consumer importing `/signals` gets
`Cannot find module '@angular/forms/signals'` from Angular's own `exports` map rather than
anything this library declares.

**`acorn-walk` is new in 0.2.0 and imposes no new install.** `/signals` walks the parsed
expression with it. A consumer of this package already peer-depends on
`@zvenigora/ng-eval-core`, whose own peers include `acorn-walk ^8.3.0`, so npm 7+ has already
placed it; it is declared here because importing it undeclared resolves today by accident of
hoisting and would not resolve at all under pnpm's isolated layout. `acorn` itself is
deliberately **not** declared — this package imports no `acorn` symbol, and `acorn-walk`
depends on it directly.

## Quick start — Reactive Forms (`/reactive`)

Everything from here to [Lifetime](#lifetime) is the `/reactive` adapter, except for three
sections that cover both: [How it fits together](#how-it-fits-together), [Coercion](#coercion)
and [When a rule fails](#when-a-rule-fails). Signal Forms has
[its own section](#signal-forms--signals) below.

```ts
import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';

@Injectable()
export class OrderFormService implements OnDestroy {
  private readonly injector = inject(Injector);

  readonly form = new FormGroup({
    country: new FormControl('CA'),
    state: new FormControl(''),
  });

  readonly binding = bindFieldProperties(
    [{ name: 'state', visible: "country === 'US'" }],
    this.form,
    { injector: this.injector }
  );

  ngOnDestroy() {
    this.binding.destroy();
  }
}
```

Reading the bound property — `form` and `binding` are the service's, and the `injector` in
the later examples is the same one it injected:

```ts
binding.fields['state'].visible?.();   // => false

form.controls.country.setValue('US');

binding.fields['state'].visible?.();   // => true
```

In a template, where `orderForm` is the injected `OrderFormService`:

```html
<form [formGroup]="orderForm.form">
  <select formControlName="country"> … </select>

  @if (orderForm.binding.fields['state'].visible?.()) {
    <input formControlName="state" />
  }
</form>
```

The recompute is Angular's own dependency tracking, per key: the expression named
`country`, so it recomputes when `country` changes and not when any other control does. A
worked example of a whole form is in
[docs/forms/worked-example.md](https://github.com/zvenigora/ng-eval/blob/master/docs/forms/worked-example.md).

## How it fits together

| Symbol | Entry point | What it is |
| :--- | :--- | :--- |
| `bindFieldProperties(schema, group, options)` | `/reactive` | The primary API. Validates the schema, mirrors the group, returns a `FormBinding`. |
| `FormBinding` | `/reactive` | `{ fields: Record<string, FieldProperties>; destroy(): void }`. |
| `FieldSchema` | `/reactive` | `{ name, visible?, text? }` — one field's rules. |
| `FieldProperties` | `/reactive` | `{ visible?: EvalSignal<boolean>; text?: EvalSignal<string> }`. Both optional, because the schema's rules are. |
| `createControlSource(group, options)` | `/reactive` | The mirror on its own, for callers composing contexts by hand. |
| `createFieldContext(formSource, fieldSource, options?)` | core | Composes one `EvalContext` out of a form-wide and a field-local source. |
| `toVisible(value)` / `toText(value)` | core | The two coercions, exported so an adapter or a test can apply the same rule. |
| `ExpressionErrorPolicy` | core | `'throw' \| 'undefined' \| ((error) => unknown)`. |
| `applyErrorPolicy(run, policy?)` | core | Runs `run` under a policy, **new in 0.2.0**. Rethrows a `SignalContextWriteError` whatever the policy says — see [When a rule fails](#when-a-rule-fails). Exported so an adapter applies the rule rather than reimplementing it. |
| `createExpressionRules(model, options?)` | `/signals` | The primary API. Binds one model signal and returns `evalVisible` / `evalText` / `evalDisabled`. |
| `ExpressionRules` | `/signals` | The three registrars, each `(path, expression, options?) => void`. |
| `ExpressionRuleOptions` | `/signals` | `{ eval?: EvalOptions; onError?: ExpressionErrorPolicy }`, accepted by the factory and per registration. |
| `TEXT` | `/signals` | The metadata key `evalText` writes through and `field().metadata(TEXT)` reads back. |

`FieldProperties` members are `EvalSignal`, not plain `Signal`, and both extra members
matter here: `invalidate()` is the escape hatch described under
[Reactivity](#reactivity-and-its-two-holes), and `destroy()` is what
[Lifetime](#lifetime) counts.

## The field schema

```ts
interface FieldSchema {
  readonly name: string;
  readonly visible?: string;   // coerced by truthiness
  readonly text?: string;      // coerced to a string
}
```

That is the whole descriptor. It is deliberately **not** a schema language — see
[What is not here](#what-is-not-here).

A field does **not** have to name a control. `{ name: 'state', … }` is legal on a form with
no `state` control; the name is how you look the properties up in `binding.fields`, and
rules naming a missing field resolve `undefined`.

### It is validated when you bind

A schema that arrives from a server can be malformed in ways an expression cannot be, so
`bindFieldProperties` checks four things and **throws** rather than letting them surface
later as an evaluation result nobody can trace:

| Rejected | Why it is not a warning |
| :--- | :--- |
| A duplicate field name | The second would silently replace the first. |
| A `visible` / `text` that is not a string | Reaches the compiler as something it cannot parse. |
| A field name that is a member of `Object.prototype` | See below. |
| A control in the group that is not a `FormControl` | Nested groups and `FormArray` are out of scope; the alternative is a group's *aggregate object* arriving where a value was expected. |

**Field and control names may not be `constructor`, `toString`, `valueOf`,
`hasOwnProperty`, `__proto__` or any other member of `Object.prototype`.** `FormGroup`
accepts such a key — it rejects only names containing a dot — and an expression naming one
then reads the prototype's value, which is a *function*, which is truthy. A `visible` rule
would render precisely the field that has no data, with no error anywhere. This is checked
over the schema's names *and* the group's controls, because the two are different sets and
the second is worse: the control exists and its value is unreadable.

**The check runs at construction only.** A control added afterwards is mirrored but not
re-validated, so a `constructor` or a nested `FormGroup` introduced by a later `addControl`
gets none of the diagnostics above. Rejecting it from inside the diff is not on offer:
the diff runs in a subscriber, where a throw is reported out of band and far from the
`addControl` that caused it — and it could not undo that call anyway. Validate a control
set you assemble dynamically, or re-bind.

### Expressions are not validated

**No check in the table above inspects an expression.** Two of the four are on **names** — the
schema's field names and the group's control names; the other two are on a rule's *type* and a
control's *class*. `bindFieldProperties` compiles each expression, so one that does not *parse*
throws; nothing inspects what a parsed expression **names**.

**So `visible: "constructor"` binds here without complaint, and renders the field:**

```ts
const form = new FormGroup({ country: new FormControl('CA') });

const binding = bindFieldProperties(
  [{ name: 'city', visible: 'constructor' }],
  form,
  { injector }
);

binding.fields['city'].visible?.();   // => true — against a form with no `city` and no
                                      //    `constructor`, with nothing logged
```

The identifier resolves off `Object.prototype` to a *function*, a function is truthy, and
truthiness means visible. It is the same failure the field-name check above prevents, reached
through the expression instead of through the name.

**`/signals` rejects this and `/reactive` does not**, so one authored rule string behaves two
ways: it throws under `@zvenigora/ng-eval-forms/signals` and silently renders a data-less field
here. The asymmetry is deliberate rather than an oversight — adding the check to `/reactive`
would make an expression that registers today start throwing, which is a breaking change to a
released entry point, and it is logged as a question for a later major in the
[roadmap](https://github.com/zvenigora/ng-eval/blob/master/ROADMAP.md). Until it is answered:
if your model keys or expressions can come from a server or a form-builder UI, prefer
`/signals`, or screen the expressions yourself.

## What an expression can name

**The values of the form's controls, by control name.** Every control is mirrored,
including disabled ones — a disabled control is excluded from its parent's aggregate value,
but its own value is still readable here.

Not addressable in this release:

- **Form state.** `touched`, `dirty`, `pristine`, `valid` and `status` are not keys. The
  shape they should take is unresolved (a flat record cannot hold per-field state without
  either nesting signals or collapsing everything into one signal, which destroys the
  per-key tracking the design rests on), and real conditional-visibility rules read sibling
  *values*.
- **Nested groups and `FormArray`.** Flat forms only, and enforced rather than documented —
  see the validation table above.
- **Field-local keys.** `createFieldContext` takes a second, field-local source and the
  `/reactive` binding passes `{}`. What a field-local key set should *contain* is not
  specified anywhere yet, and inventing keys to fill a parameter is how a public surface
  acquires members nobody chose.

### An empty control reads as absent

`EvalContext.get` treats `undefined` as absent at every step, and there is no way to tell
"no such key" from "key bound to `undefined`". An empty `FormControl` therefore behaves as
though the field were not there:

- `visible: "promoCode"` on an empty `promoCode` is `false`.
- Where a field-local key and a form key collide, the field wins **while its value is not
  `undefined`** — an empty field falls through and the form value shows through instead.

This is a limitation, not a design goal; distinguishing the two would need a sentinel
threaded through `EvalContext.get`, which belongs to `@zvenigora/ng-eval-core`.

## Coercion

`visible` is **JavaScript truthiness, and nothing cleverer**:

```ts
toVisible(undefined);   // => false — an empty or missing field is not visible
toVisible(0);           // => false
toVisible('false');     // => true  — a non-empty string
```

That third line is the one to know about, and it is the one a form-builder UI storing every
value as a string will hit. It is truthiness rather than parsing: a coercion that read
`'false'` as false would then owe an answer for `'no'`, `'0'` and `'off'`, and JavaScript
has one for none of them. Write `visible: "flag === 'true'"` if that is what you mean.

`text` is `String(value)`, with `null` and `undefined` mapping to `''`:

```ts
toText(null);        // => ''    — never the literal text "null"
toText(undefined);   // => ''
toText(0);           // => '0'   — not ''
toText(false);       // => 'false'
```

Every *other* falsy value stringifies normally. Mapping all falsy values to `''` is the
obvious way to write this rule wrongly, and it blanks a field whose value is legitimately
zero.

The coercion sits in front of the signal rather than inside the walk, so a **destroyed**
property still answers `false` / `''` rather than leaking `undefined` into a template.

## When a rule fails

`options.onError` decides, and **the default is `'undefined'`** — the opposite of
`@zvenigora/ng-eval-signals`' default:

| Value | Effect |
| :--- | :--- |
| `'undefined'` *(default)* | The property resolves `undefined`, which coerces to `false` / `''`. |
| `'throw'` | Rethrow. |
| `(error) => unknown` | Your function's return value becomes the property's value. |

The default differs from upstream's because the author differs. An expression that fails in
`@zvenigora/ng-eval-signals` was written by the developer reading the stack trace; an
expression that fails here may have been typed into a form builder by an end user, and the
right response to "the administrator wrote a bad rule" is a field that does not render, not
an application that throws on every change-detection pass.

Two things are **not** routed through it:

- **A parse error throws from `bindFieldProperties` itself**, whatever the policy.
  Expressions are compiled eagerly, so `visible: 'country ==='` fails at bind time — and
  the binding releases everything it had already built before rethrowing.
- **An assignment throws `SignalContextWriteError`, in every mode.** Expression keys are
  read-only, and a write violation is *static* — illegal on every recompute with every
  dataset. Swallowing it under the default would hand you a silent blank for a syntax bug
  in the rule itself.

  **That guarantee has one boundary, and it is stated here because the guarantee is.** It
  holds for an assignment the expression makes directly. An assignment **nested inside a
  call** — `[1].map(x => (country = 'CA'))` — is caught by the evaluator's own call wrapper
  and re-raised as a plain `Error`, which loses the class the bypass matches on. It is then
  routed by `onError` like any other failure, so under the default you get a blank field with
  nothing in the console. It is a misuse inside a misuse — a rule author writing an assignment
  writes `country = 'CA'`, not one buried in a `.map` callback — but it is the one shape where
  the mechanism cannot see what it is for. The re-wrap belongs to
  `@zvenigora/ng-eval-core` and cannot be fixed from this side.

## Reactivity, and its two holes

A property recomputes when a control it named emits on `valueChanges`. The mirror
subscribes **per control, never to the group**, so a disabled control stays readable, and
tracking is per key rather than per form.

Two cases the mirror cannot see. Both take the same hatch — `invalidate()` — and there is
one corner at the end of the second that no hatch reaches:

### `{ emitEvent: false }` freezes a value

`setValue`, `patchValue`, `reset`, `enable` and `disable` all accept it, and it does what it
says: no event, so no recompute, so a stale property with no error. There is no fix
available from this side — the observable is the only signal there is. `invalidate()` is
the documented hatch for exactly this case:

```ts
const form = new FormGroup({ country: new FormControl('CA') });

const binding = bindFieldProperties(
  [{ name: 'country', text: 'country' }],
  form,
  { injector }
);

binding.fields['country'].text?.();   // => 'CA'

form.controls.country.setValue('US', { emitEvent: false });

binding.fields['country'].text?.();   // => 'CA'  — stale

binding.fields['country'].text?.invalidate();

binding.fields['country'].text?.();   // => 'US'
```

(The first read is not decoration. A property is a `computed()`, so one that has never been
read has nothing cached and answers with whatever the form holds *now* — the staleness
starts at the first read, not at the write.)

### The key **set** is not reactive

Values are reactive; the *set of keys* is not. A property that already read `age` recorded
a dependency on that key, and `removeControl('age')` does not itself produce a recompute:

```ts
// A control set that changes at runtime needs an index-signature type:
// `addControl` / `removeControl` on a group typed from an object literal
// accept only the keys that literal had.
const form = new FormGroup<{ [key: string]: AbstractControl }>({
  age: new FormControl(30),
});

const binding = bindFieldProperties([{ name: 'age', text: 'age' }], form, { injector });

binding.fields['age'].text?.();   // => '30'

form.removeControl('age');

binding.fields['age'].text?.();   // => '30'  — the value it last read

binding.fields['age'].text?.invalidate();

binding.fields['age'].text?.();   // => ''    — the key is gone
```

From the next recompute onward it is reactive again against whatever now holds the key, so
one `invalidate()` per structural change is the whole obligation. **The properties to
invalidate are the ones whose expressions name the affected key.**

And there is one corner with **no hatch at all**: `addControl` / `removeControl` /
`setControl` called with `{ emitEvent: false }` suppress `group.events`, so the mirror
never learns the control set changed. `invalidate()` cannot rescue that — re-running the
expression finds the same stale mirror. Do not pass `{ emitEvent: false }` to the
control-set methods on a mirrored group.

## Lifetime

**`destroy()` is yours to call.** Every signal a binding creates is built with an explicit
injector, which means none of them registers its own teardown:

```ts
const binding = bindFieldProperties(schema, form, { injector });

// …

binding.destroy();   // releases every property signal and every subscription
```

It is idempotent, and it releases the whole mirror — every per-control subscription and the
`group.events` one — in a single call.

There is a **net** under that, and it is a net rather than a substitute: the binding
registers its teardown on the `DestroyRef` of the injector you passed, so a binding wired to
a component or route injector is released when that injector dies even if nobody called
`destroy()`. A binding built on the *root* injector is released at the end of the
application and no sooner.

### Constructed, not computed

**Build the binding in a service or a factory, and call `destroy()` from the same place.**
`bindFieldProperties` uses `toSignal` internally, which opens with
`assertNotInReactiveContext` — so calling it from inside an `effect()` or a `computed()`
throws, with an error naming `toSignal` and nothing naming this library. If you see
`NG0602` and no `toSignal` of your own, this is why.

`options.injector` is **required** for the same reason it is required upstream: an optional
one would silently pick up the ambient injection context when there is one, and teardown
would then run at a time that varied with where the call happened to sit.

## Signal Forms — `/signals`

**Requires Angular 22 or later.** Import from `@zvenigora/ng-eval-forms/signals`.

One factory, bound to one model signal, returning three registrars you call from inside a
`schema()` body beside Angular's own rules:

```ts
import { signal } from '@angular/core';
import { form, schema } from '@angular/forms/signals';
import { TEXT, createExpressionRules } from '@zvenigora/ng-eval-forms/signals';

interface Order {
  country: string;
  state: string;
  zip: string;
  orderTotal: number;
}

const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 80 });

const rules = createExpressionRules(model);

const orderSchema = schema<Order>((p) => {
  rules.evalVisible(p.state, "country === 'US'");
  rules.evalText(p.zip, "orderTotal >= 100 ? 'Free shipping' : 'Standard'");
  rules.evalDisabled(p.zip, "country !== 'US'", { reason: 'ZIP is US-only' });
});

const f = form(model, orderSchema);
```

There is no `FormBinding` here and nothing to look a field up in: the rules register through
Angular's own primitives, so you read them back off Angular's field state.

```ts
f.state().hidden();                                // => true
f.zip().metadata(TEXT)?.();                        // => 'Standard'
f.zip().disabled();                                // => true
f.zip().disabledReasons().map((r) => r.message);   // => ['ZIP is US-only']

model.set({ country: 'US', state: '', zip: '', orderTotal: 120 });

f.state().hidden();                                // => false
f.zip().metadata(TEXT)?.();                        // => 'Free shipping'
f.zip().disabled();                                // => false
```

Recompute is Angular's own dependency tracking, per key: a rule that named `country`
re-evaluates when `country` changes and not when any other key does.

### The three registrars, and their polarity

| Registrar | Registers | A **true** expression means |
| :--- | :--- | :--- |
| `evalVisible(path, expression, options?)` | Angular's `hidden`, **inverted** | the field is **visible** |
| `evalText(path, expression, options?)` | `metadata(path, TEXT, …)` | — |
| `evalDisabled(path, expression, options?)` | Angular's `disabled`, uninverted | the field is **disabled** |

**`evalVisible` is named after the property, not after Angular's rule, and the inversion lives
inside the library.** That is the whole reason it exists rather than a thin `hidden` wrapper:
the same rule string means the same thing at both entry points, so `country === 'US'` is "show
it when the country is US" under `/reactive`'s `visible` and under `evalVisible` alike, with no
consumer's expression carrying a `!`. `evalDisabled` keeps Angular's polarity instead, because
`/reactive` ships no `disabled` — there is no second entry point for its expressions to agree
with, and `true` disabling is what an author expects.

**`reason` is a static string, never expression-derived.** Angular's `disabled` config is a
single field: `when` returns `boolean | string`, and a truthy string is *both* "disabled" and
"the reason". A registrar forwarding the expression's value raw would disable a field on the
string `'false'` **with the reason `"false"`** — [Coercion](#coercion)'s truthiness trap in a
new shape. Keeping the expression boolean and sourcing the reason from the registration is what
kills it. A *dynamic* reason is out of scope for the same reason.

### Lifetime — there is nothing to destroy

Unlike [`/reactive`](#lifetime), this entry point creates no `EvalSignal`, registers nothing
with a `DestroyRef`, and has **no `destroy()`**. Angular owns the field tree's lifetime and the
rules die with the schema. What is retained, on two different clocks: **per factory**, one
private memo of per-key `computed`s, bounded by the union of keys the rules name — it lives as
long as the `createExpressionRules` value does, which for a factory built at module scope is
longer than any one form; and **per rule per `form()`**, one evaluation context and one compiled
expression, garbage when that form is.

### Reuse a schema *function*, not a schema *value*

The registrars close over the **factory's** model, and a factory is bound to one model. So the
supported way to share rules across forms is a function of the rules, called once per form:

```ts
import { ExpressionRules } from '@zvenigora/ng-eval-forms/signals';

const makeSchema = (rules: ExpressionRules) =>
  schema<Order>((p) => {
    rules.evalVisible(p.state, "country === 'US'");
  });

const modelA = signal<Order>({ country: 'US', state: '', zip: '', orderTotal: 0 });
const modelB = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });

const fA = form(modelA, makeSchema(createExpressionRules(modelA)));
const fB = form(modelB, makeSchema(createExpressionRules(modelB)));
```

**Sharing a schema *value* across models compiles, runs, and is wrong.** Angular re-invokes the
schema body once per `form()`, so each form does mint its own contexts — but every rule inside
them still reads the model the *factory* was given. A schema built from
`createExpressionRules(modelA)` and passed to `form(modelB, …)` yields a fully functional form B
rendering against form A's data, silently, with no error anywhere.

### Prototype-shadowed identifiers are rejected

An expression naming a member of `Object.prototype` — `constructor`, `toString`, `valueOf`,
`hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`, and the five
`__proto__`-style accessors `Object.getOwnPropertyNames(Object.prototype)` also returns —
**throws**, naming the expression and the identifier:

```ts
const bad = schema<Order>((p) => {
  rules.evalVisible(p.state, 'constructor');
});

form(model, bad);   // throws: identifier 'constructor' is a member of Object.prototype …
```

Without the check the identifier resolves off the prototype to a *function*, a function is
truthy, and `evalVisible` would render precisely the field that has no data — with nothing
logged. The fix is to rename the model key.

**The throw arrives from `form()`, not from `schema()`.** The schema body is what registers, and
Angular invokes that body once per `form()` — so building the schema is silent and every
`form()` made from it throws. `/reactive` makes its (different, name-based) check at the
`bindFieldProperties(…)` call instead, so **the two entry points reject at different times**.

Three bounds on the check, none of them obvious from the paragraph above:

- **It is the expression that is checked, never the model.** A model key named off
  `Object.prototype` that no expression names stays unreadable and unreported. That is
  harmless — a key is only ever read because some expression names it — but it is not covered,
  and it is the one thing `/reactive`'s control-name check catches that this does not.
- **A *member* expression is not this check's business.** `user.constructor` goes to
  `@zvenigora/ng-eval-core`'s prototype-pollution guard, under the rules documented there.
- **It over-rejects a name the expression *binds* itself**, deliberately.
  `'[1].map(valueOf => valueOf)'` throws, even though an arrow's own parameter shadows the
  prototype and would have resolved correctly. A scope-aware guard would be a second copy of
  the evaluator's frame logic, and one that drifted out of step would fail by
  *under*-rejecting — a silent wrong answer in place of a rename. Rename the parameter.
  (`'[1].map(valueOf => 1)'` registers: a binding that is never referenced is not visited.)

**`/reactive` makes no equivalent check on expressions** — see
[Expressions are not validated](#expressions-are-not-validated).

### `caseInsensitive` is in practice a *factory* option

`ExpressionRuleOptions` — `{ eval?, onError? }` — is accepted by the factory and by each
registration, and **registration wins per key**: a registration supplying only `onError` keeps
the factory's `eval`, and vice versa. Neither key is deep-merged.

That resolution is exact for `onError` and **only partial for `eval.caseInsensitive`**:

```ts
interface Profile {
  country: string;
  address: { name: string };
  label: string;
}

const profile = signal<Profile>({ country: 'US', address: { name: 'HQ' }, label: '' });

const rules = createExpressionRules(profile);        // caseInsensitive off at the factory

const profileSchema = schema<Profile>((p) => {
  rules.evalText(p.label, 'Country + address.NAME', {
    eval: { caseInsensitive: true },                 // on for this registration
  });
});

form(profile, profileSchema).label().metadata(TEXT)?.();
// => 'undefinedHQ'
//    address.NAME  resolved  — a *property* name, corrected by the walk
//    Country       did not   — an *identifier* key, still on the factory's setting
```

The walk is the only one of the three places the option must reach that a per-registration
value gets to. The other two — the factory's key memo, and the evaluation context every rule is
given — are built from the options handed to `createExpressionRules`, fixed at factory time; the
context is minted per rule, but always from that same fixed setting, so a registration cannot
move it. One expression then ends up obeying two casing rules. **Set `caseInsensitive` on the
factory** unless that is precisely what you want.

### Two things that are not available here

Neither is about resolution. Every key an expression can name resolves, at any spelling
`caseInsensitive` allows, whether or not the model held it when the form was built — there is
no `invalidate()` at this entry point and nothing to call it on.

- **The nested-signal diagnostic does not reach `/signals`.** A model property holding a signal
  — `{ user: { name: signal('a') } }` — is read un-called by the member visitor, and
  `@zvenigora/ng-eval-signals`' dev-mode warning never fires here. That shape is precisely what
  the upstream scan reports, so the check is neither switched off nor blind to it: it runs over
  the *source record* a context is built from, and this adapter hands it an empty one. Every
  model key resolves through a lookup instead, where nothing scans. Widening the scan would not
  recover it.
- **The form's key set is not enumerable from upstream**, because the memo is deliberately
  private. That is the fix rather than the cost: an enumerable record is exactly what froze a
  case-insensitively matched key to its first spelling for the life of the form. It is the
  counterpart to [`/reactive`'s key-set caveat](#the-key-set-is-not-reactive) and the milder
  one — nothing here goes stale.

## What is not here

Deferred deliberately, each additive when it arrives:

- **`disabled` at `/reactive`.** It ships at [`/signals`](#the-three-registrars-and-their-polarity)
  and not here, and the asymmetry is the point rather than a gap. Applying it to a
  `FormControl` means calling `control.disable()`, which is three problems at once: it is a
  write back into the form rather than derived state; it emits on `valueChanges` by default, so
  a rule naming its own field re-enters its own input and whether that converges depends on the
  expression; and it removes the value from the parent's aggregate. Under Signal Forms
  `disabled` is a schema rule over derived state and none of the three exists.
- **`required` and validators**, which affect form validity rather than presentation.
- **Form state keys**, `FormArray` and nested `FormGroup`, and field-local keys — see
  [What an expression can name](#what-an-expression-can-name).
- **Anything asynchronous.** Every property is derived synchronously from control values,
  which is all the mirror supplies; there is no `await` inside an expression and no async
  variant of the binding. The upstream question is
  [`@zvenigora/ng-eval-signals`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-signals#async-expressions)'.

## Development

```sh
npx nx test eval-forms
npx nx run eval-forms:build:production
```

Two `readme-examples.spec.ts` files execute the runnable examples in this document, and the
split is not quite by folder: the one under `reactive/src/lib/` covers the `/reactive` blocks,
the shared core's two [Coercion](#coercion) blocks and the
[worked example](https://github.com/zvenigora/ng-eval/blob/master/docs/forms/worked-example.md);
the one under `signals/src/lib/` covers the `/signals` blocks **plus the one `/reactive` block
whose subject is the difference between the two entry points**, because that claim is a pair and
splitting it would let either half drift alone. So a documented example that stops working fails
the suite rather than shipping. The template and manifest blocks are not executable and are not
covered.
