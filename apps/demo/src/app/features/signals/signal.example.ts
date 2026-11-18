import { Component, inject, signal } from '@angular/core';
import { createEvalSignal } from '@zvenigora/ng-eval-signals';
import { DATA, EXPRESSION } from '../../example-tokens';

interface Order {
  price: number;
  quantity: number;
  shipping: number;
}

@Component({
  selector: 'demo-signal',
  template: `
    <dl>
      <dt>total()</dt>
      <dd><output>{{ total() }}</output></dd>
    </dl>
    <button type="button" (click)="quantity.set(quantity() + 1)">quantity + 1</button>
  `,
})
export class SignalExample {
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as Order;

  readonly price = signal(this.data.price);
  readonly quantity = signal(this.data.quantity);
  readonly shipping = signal(this.data.shipping);

  readonly total = createEvalSignal(this.expression, {
    price: this.price,
    quantity: this.quantity,
    shipping: this.shipping,
  });
}
