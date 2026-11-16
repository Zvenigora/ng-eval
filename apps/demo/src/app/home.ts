import { Component, Injector, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField, form, schema } from '@angular/forms/signals';
import { EvalService } from '@zvenigora/ng-eval-core';
import { toText } from '@zvenigora/ng-eval-forms';
import { FieldSchema, bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { createExpressionRules } from '@zvenigora/ng-eval-forms/signals';
import { createEvalSignal } from '@zvenigora/ng-eval-signals';

interface Order {
  country: string;
  state: string;
}

const SCHEMA: FieldSchema[] = [{ name: 'state', visible: "country === 'US'" }];

@Component({
  selector: 'demo-home',
  imports: [ReactiveFormsModule, FormField],
  template: `
    <h1>ng-eval</h1>

    <section id="core">
      <h2>&#64;zvenigora/ng-eval-core</h2>
      <output>{{ result }}</output>
    </section>

    <section id="signals">
      <h2>&#64;zvenigora/ng-eval-signals</h2>
      <button type="button" (click)="quantity.set(quantity() + 1)">quantity + 1</button>
      <output>{{ total() }}</output>
    </section>

    <section id="forms">
      <h2>&#64;zvenigora/ng-eval-forms</h2>
      <output>{{ text }}</output>
    </section>

    <section id="forms-reactive">
      <h2>&#64;zvenigora/ng-eval-forms/reactive</h2>
      <form [formGroup]="reactiveForm">
        <input formControlName="country" />
        @if (binding.fields['state'].visible?.()) {
          <input formControlName="state" />
        }
      </form>
    </section>

    <section id="forms-signals">
      <h2>&#64;zvenigora/ng-eval-forms/signals</h2>
      <input [formField]="f.country" />
      @if (!f.state().hidden()) {
        <input [formField]="f.state" />
      }
    </section>
  `,
})
export class Home implements OnDestroy {
  private readonly evalService = inject(EvalService);

  readonly result = this.evalService.simpleEval('2 + 3 * a', { a: 10 });
  readonly text = toText(this.result);

  readonly price = signal(10);
  readonly quantity = signal(3);
  readonly shipping = signal(5);

  readonly total = createEvalSignal('price * quantity', {
    price: this.price,
    quantity: this.quantity,
    shipping: this.shipping,
  });

  readonly reactiveForm = new FormGroup({
    country: new FormControl('CA'),
    state: new FormControl(''),
  });

  readonly binding = bindFieldProperties(SCHEMA, this.reactiveForm, {
    injector: inject(Injector),
  });

  readonly model = signal<Order>({ country: 'CA', state: '' });

  private readonly rules = createExpressionRules(this.model);

  readonly f = form(
    this.model,
    schema<Order>((p) => {
      this.rules.evalVisible(p.state, "country === 'US'");
    })
  );

  ngOnDestroy(): void {
    this.binding.destroy();
  }
}
