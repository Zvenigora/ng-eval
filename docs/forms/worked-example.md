# Worked example — a server-supplied checkout form

The point of this library is that the rules below are **strings that arrived at runtime**.
Everything in `SCHEMA` could have come from an HTTP response, a database row, or a
form-builder UI an administrator typed into. None of it is compiled into the application,
and none of it goes near `new Function`.

The form is a **flat `FormGroup` of `FormControl`s** — nested groups and `FormArray` are out
of scope for this phase and are rejected at bind time rather than left to misbehave.

Every result printed below is executed by
[`readme-examples.spec.ts`](../../modules/eval-forms/reactive/src/lib/readme-examples.spec.ts),
so it is measured rather than remembered. That spec is a copy of these blocks kept in step
by hand — it does not read this file — so it catches an example that stops *working*, not
one that stops *matching*.

## 1. The form

Shown on its own for readability; § 3 is where it is actually constructed.

```ts
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';

// Index-signature typed on purpose. A schema that arrives from a server implies
// a control set assembled at runtime, and `addControl` on a group typed from an
// object literal accepts only the keys that literal had — see § 6.
new FormGroup<{ [key: string]: AbstractControl }>({
  country: new FormControl('CA'),
  orderTotal: new FormControl(80),
  promoCode: new FormControl(''),
});
```

## 2. The schema

Three fields, and only one of them names a control of the same name. A field is a *rule
holder*: `state` has no control yet, and `shippingNote` never will — it is a label.

```ts
import { FieldSchema } from '@zvenigora/ng-eval-forms/reactive';

// Fetched, not compiled in.
const SCHEMA: FieldSchema[] = [
  { name: 'state', visible: "country === 'US'" },
  { name: 'promoCode', visible: 'orderTotal >= 100' },
  {
    name: 'shippingNote',
    text: "orderTotal >= 100 ? 'Free shipping' : 'Shipping calculated at checkout'",
  },
];
```

## 3. Binding

`injector` is required, and the binding must be **constructed** rather than computed — never
inside an `effect()` or a `computed()`. A service is the natural home, because the same
place then owns the `destroy()`.

```ts
import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';

@Injectable()
export class CheckoutFormService implements OnDestroy {
  private readonly injector = inject(Injector);

  readonly form = new FormGroup<{ [key: string]: AbstractControl }>({
    country: new FormControl('CA'),
    orderTotal: new FormControl(80),
    promoCode: new FormControl(''),
  });

  readonly binding = bindFieldProperties(SCHEMA, this.form, {
    injector: this.injector,
  });

  ngOnDestroy() {
    this.binding.destroy();
  }
}
```

## 4. What it answers

**§§ 4–8 are one continuous program**, run in order against the service above: `form` and
`binding` are `checkout.form` and `checkout.binding`, and `injector` is the one the service
injected. Each block starts where the previous one left the form.

Straight after binding, with the form in its initial state:

```ts
binding.fields['state'].visible?.();          // => false
binding.fields['promoCode'].visible?.();      // => false
binding.fields['shippingNote'].text?.();      // => 'Shipping calculated at checkout'
```

Now the customer picks a country and adds to their basket:

```ts
form.controls['country'].setValue('US');
form.controls['orderTotal'].setValue(120);

binding.fields['state'].visible?.();          // => true
binding.fields['promoCode'].visible?.();      // => true
binding.fields['shippingNote'].text?.();      // => 'Free shipping'
```

Nothing was re-bound and no rule was re-parsed. Each property is a `computed()` over the
keys its own expression read, so `orderTotal` moving recomputes `promoCode.visible` and
`shippingNote.text` and leaves `state.visible` — which named only `country` — untouched.

## 5. In a template

`visible` is a boolean and **your template decides what that means** — this library does not
choose between "not rendered" and "rendered but hidden". One caution if you drop the control
entirely: if you also `disable()` it, its value leaves the group's aggregate, and every
other rule reading that field then sees an absent value.

```html
<form [formGroup]="checkout.form">
  <select formControlName="country"> … </select>

  @if (checkout.binding.fields['state'].visible?.()) {
    <input formControlName="state" />
  }

  @if (checkout.binding.fields['promoCode'].visible?.()) {
    <input formControlName="promoCode" />
  }

  <p>{{ checkout.binding.fields['shippingNote'].text?.() }}</p>
</form>
```

## 6. Adding the control the schema was already expecting

`state` is bound but has no control. Adding one later needs no re-bind, and a rule that
never named `state` is unaffected by its arrival — this continues from § 4, so `country` is
still `'US'` and the rule still reads `true`:

```ts
form.addControl('state', new FormControl('TX'));

binding.fields['state'].visible?.();   // => true — unchanged; it named `country`, not `state`
```

A rule that *does* name a key whose control comes and goes is the case that needs the hatch,
because values are reactive but the **key set** is not:

```ts
const stateLabel = bindFieldProperties(
  [{ name: 'stateLabel', text: 'state' }],
  form,
  { injector }
);

stateLabel.fields['stateLabel'].text?.();   // => 'TX'

form.removeControl('state');

stateLabel.fields['stateLabel'].text?.();   // => 'TX'   — stale: the key set is not reactive
stateLabel.fields['stateLabel'].text?.invalidate();
stateLabel.fields['stateLabel'].text?.();   // => ''     — the key is gone

stateLabel.destroy();
```

## 7. A rule the administrator got wrong

The schema is authored by someone who is not the developer, so a broken rule is an ordinary
event rather than a bug report. The default policy makes it a field that does not render:

```ts
const broken = bindFieldProperties(
  [{ name: 'taxNote', text: 'customer.address.line1()' }],
  form,
  { injector }
);

broken.fields['taxNote'].text?.();   // => ''  — the rule threw; the default swallowed it

broken.destroy();
```

Pass `onError: 'throw'` if you would rather find out loudly, or a function to substitute a
value of your own:

```ts
const reported = bindFieldProperties(
  [{ name: 'taxNote', text: 'customer.address.line1()' }],
  form,
  { injector, onError: () => '(rule error)' }
);

reported.fields['taxNote'].text?.();   // => '(rule error)'

reported.destroy();
```

A rule that does not **parse** is different, and it is not routed through the policy at all
— expressions are compiled eagerly, so the bind itself throws and releases everything it had
already built:

```ts
bindFieldProperties(
  [{ name: 'taxNote', text: 'orderTotal ===' }],
  form,
  { injector }
);
// throws — and no subscription is left open
```

## 8. Ending it

```ts
binding.destroy();
binding.destroy();   // idempotent
```

One call releases every property signal and both halves of the mirror. There is a net under
it — the binding is also released if the injector you passed is destroyed — but the net is
not a substitute: a binding built on the root injector lives as long as the application
does.

## What this example deliberately does not show

- **`disabled`**, which is deferred — it writes back into the form and re-enters its own
  input. See the [package README](../../modules/eval-forms/README.md).
- **Form state** (`touched`, `dirty`, `valid`): not addressable in this release.
- **Nested groups and `FormArray`**: rejected at bind time.
