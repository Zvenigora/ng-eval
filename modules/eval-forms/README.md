# @zvenigora/ng-eval-forms

Angular form field properties — `visible` and `text` — driven by **string** expressions
resolved at runtime.

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

| Import | Contains |
| :--- | :--- |
| `@zvenigora/ng-eval-forms` | The shared core — context composition and the coercion and error-policy rules every adapter uses. Imports nothing from `@angular/core` or `@angular/forms`. |
| `@zvenigora/ng-eval-forms/reactive` | The Angular Reactive Forms adapter — `FormGroup` / `FormControl`. **This is the entry point you want.** |

A `/signals` entry point for Angular's Signal Forms is designed but not built; see
[the Phase 4 plan](https://github.com/zvenigora/ng-eval/blob/master/docs/forms/phase-4-plan.md)
§ 9.

## Versions

The package declares **one** peer range, at the floor:

```json
"peerDependencies": {
  "@angular/core": ">=19.0.0",
  "@angular/forms": ">=19.0.0",
  "rxjs": "^7.8.0",
  "@zvenigora/ng-eval-core": "^0.3.0",
  "@zvenigora/ng-eval-signals": "^0.1.0"
}
```

`peerDependencies` are declared per **package**, not per entry point, so a narrower range
for a single entry point is not expressible. `/reactive` — everything this release ships —
works from Angular 19. When `/signals` arrives it will require **Angular 22 or later**, and
an older consumer importing it gets `Cannot find module '@angular/forms/signals'` from
Angular's own `exports` map rather than anything this library declares.

## Quick start

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

## What is not here

Deferred deliberately, each additive when it arrives:

- **`disabled`.** Applying it means calling `control.disable()`, which is three problems at
  once: it is a write back into the form rather than derived state; it emits on
  `valueChanges` by default, so a rule naming its own field re-enters its own input and
  whether that converges depends on the expression; and it removes the value from the
  parent's aggregate. Under Signal Forms none of the three exists, which is why `disabled`
  is a better fit for the future `/signals` entry point than for this one.
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

`readme-examples.spec.ts` executes the runnable examples in this file and in the worked
example, so a documented example that stops working fails the suite rather than shipping.
The template and manifest blocks are not executable and are not covered.
