# Worked example — a server-supplied checkout form, under Signal Forms

The checkout form of the [`/reactive` worked example](worked-example.md), built on Angular's
**Signal Forms** (`@angular/forms/signals`, Angular 22 or later) through
`@zvenigora/ng-eval-forms/signals`. As there, the rules below are **strings that arrived at
runtime**: from an HTTP response, a database row, or a form-builder UI an administrator typed
into. None of them is compiled into the application, and none goes near `new Function`.

What differs is where the rules attach. Under Signal Forms a rule is registered against a
**schema path**, `p.state`, which is typed code, so what arrives as data is each rule's
expression and not the list of fields it drives. The field tree is Angular's, and every result
below is read off Angular's own field state.

Every result printed below is executed by
[`readme-examples.spec.ts`](../../modules/eval-forms/signals/src/lib/readme-examples.spec.ts),
so it is measured rather than remembered. That spec is a copy of these blocks kept in step by
hand — it does not read this file — so it catches an example that stops *working*, not one that
stops *matching*.

## 1. The model

One signal holds the whole form's data. There is no group of controls to build: Angular derives
the field tree from the model's shape, so the model *is* the form.

```ts
import { signal } from '@angular/core';

interface Checkout {
  country: string;
  state: string;
  orderTotal: number;
  promoCode: string;
  region?: string;
}

signal<Checkout>({ country: 'CA', state: '', orderTotal: 80, promoCode: '' });
```

`region` is optional and absent. § 6 is about the rule that names it.

## 2. The rules

Four expressions, fetched rather than compiled in. The shipping note has no field of its own:
Signal Forms has no field without a model property, so the note is text **on the field it
describes**, `orderTotal`.

```ts
interface CheckoutRules {
  stateVisible: string;
  promoCodeVisible: string;
  promoCodeDisabled: string;
  shippingNote: string;
}

// Fetched, not compiled in.
const RULES: CheckoutRules = {
  stateVisible: "country === 'US'",
  promoCodeVisible: 'orderTotal >= 100',
  promoCodeDisabled: "country !== 'US'",
  shippingNote: "orderTotal >= 100 ? 'Free shipping' : 'Shipping calculated at checkout'",
};
```

The schema is a **function of the rules**, never a schema value, because the registrars close
over the one model their factory was given:

```ts
import { schema } from '@angular/forms/signals';
import { ExpressionRules } from '@zvenigora/ng-eval-forms/signals';

const checkoutSchema = (rules: ExpressionRules, text: CheckoutRules) =>
  schema<Checkout>((p) => {
    rules.evalVisible(p.state, text.stateVisible);
    rules.evalVisible(p.promoCode, text.promoCodeVisible);
    rules.evalDisabled(p.promoCode, text.promoCodeDisabled, {
      reason: 'Promo codes apply to US orders',
    });
    rules.evalText(p.orderTotal, text.shippingNote);
  });
```

## 3. Building the form

`form()` needs an injection context, and a service's field initializers are one. The model, the
factory and the form are built together, so each form gets a factory bound to its own model.

```ts
import { Injectable } from '@angular/core';
import { form } from '@angular/forms/signals';
import { createExpressionRules } from '@zvenigora/ng-eval-forms/signals';

@Injectable()
export class CheckoutFormService {
  readonly model = signal<Checkout>({ country: 'CA', state: '', orderTotal: 80, promoCode: '' });

  readonly form = form(this.model, checkoutSchema(createExpressionRules(this.model), RULES));
}
```

There is no `ngOnDestroy` and no `destroy()` to call. See § 8.

## 4. What it answers

**§§ 4–8 are one continuous program**, run in order against the service above: `model` and `f`
are `checkout.model` and `checkout.form`. Each block starts where the previous one left the form,
and the program runs in an injection context, as § 3 does, because §§ 6 and 7 call `form()` again.

Straight after construction:

```ts
import { TEXT } from '@zvenigora/ng-eval-forms/signals';

f.state().hidden();                    // => true
f.promoCode().hidden();                // => true
f.promoCode().disabled();              // => true
f.promoCode().disabledReasons().map((r) => r.message);
                                       // => ['Promo codes apply to US orders']
f.orderTotal().metadata(TEXT)?.();     // => 'Shipping calculated at checkout'
```

Now the customer picks a country and adds to their basket. The field and the model are two views
of one thing, so a write through either moves the rules:

```ts
f.country().value.set('US');
model.update((m) => ({ ...m, orderTotal: 120 }));

f.state().hidden();                    // => false
f.promoCode().hidden();                // => false
f.promoCode().disabled();              // => false
f.orderTotal().metadata(TEXT)?.();     // => 'Free shipping'
```

Nothing was registered again and no rule was re-parsed. Each rule is part of Angular's own
derivation and tracks the keys its expression read, so `orderTotal` moving re-evaluates the
promo code's visibility and the shipping note and leaves `state`'s visibility, which named only
`country`, alone.

## 5. In a template

`evalVisible` registers Angular's `hidden`, and `hidden` is state, not rendering: **your
template decides what it means**. `[formField]` binds a field to its input.

```html
<form>
  <select [formField]="checkout.form.country"> … </select>

  @if (!checkout.form.state().hidden()) {
    <input [formField]="checkout.form.state" />
  }

  @if (!checkout.form.promoCode().hidden()) {
    <input [formField]="checkout.form.promoCode" />
  }

  <p>{{ checkout.form.orderTotal().metadata(TEXT)?.() }}</p>
</form>
```

`TEXT` is read in the template, so the component exposes it as a member.

## 6. A key the model does not hold yet

A rule may name a key the model does not have. It resolves to nothing until the key arrives, and
then it follows the key with nothing to call. This is where `/reactive`'s `invalidate()` hatch has
no counterpart: the model is one signal, so a key that arrives is a change Angular already
tracks.

```ts
const region = form(
  model,
  schema<Checkout>((p) => {
    createExpressionRules(model).evalText(p.state, "region ? 'Ships from ' + region : ''");
  })
);

region.state().metadata(TEXT)?.();     // => ''

model.update((m) => ({ ...m, region: 'EU' }));

region.state().metadata(TEXT)?.();     // => 'Ships from EU'
```

## 7. A rule the administrator got wrong

The rules are authored by someone who is not the developer, so a broken rule is an ordinary event
rather than a bug report. The default policy makes it a property with its default value: no text,
and for a visibility rule, hidden.

```ts
const broken = form(
  model,
  schema<Checkout>((p) => {
    createExpressionRules(model).evalText(p.state, 'customer.address.line1()');
  })
);

broken.state().metadata(TEXT)?.();     // => ''  — the rule threw; the default swallowed it
```

Pass `onError: 'throw'` to the factory or to one registration if you would rather find out
loudly, or a function to substitute a value of your own:

```ts
const reported = form(
  model,
  schema<Checkout>((p) => {
    createExpressionRules(model, { onError: () => '(rule error)' })
      .evalText(p.state, 'customer.address.line1()');
  })
);

reported.state().metadata(TEXT)?.();   // => '(rule error)'
```

A rule that does not **parse** is different, and the policy never sees it: expressions are
compiled when they are registered, and registration runs inside the schema body, which Angular
runs during `form()`. So the throw arrives from `form()`, and building the schema is silent:

```ts
const unparsable = schema<Checkout>((p) => {
  createExpressionRules(model).evalText(p.state, 'orderTotal ===');
});

form(model, unparsable);
// throws
```

## 8. Ending it

There is nothing to end. This entry point creates no subscription and registers nothing with a
`DestroyRef`: the rules are part of the field tree, and the field tree is Angular's, so they go
when the form does. What one factory keeps beyond a form is a private memo of `computed`s, one
per key its rules name and casing rule they read it under, which lives as long as the factory
value does.

## What this example deliberately does not show

- **`caseInsensitive`**, per factory or per registration. See the
  [package README](../../modules/eval-forms/README.md#caseinsensitive-per-registration).
- **Form state** (`touched`, `dirty`, `valid`): not addressable in this release.
- **Arrays**: `applyEach` has no expression-driven counterpart yet.
- **A field-local key** such as `/reactive`'s planned per-field keys: every key an expression
  names here is a model key.
