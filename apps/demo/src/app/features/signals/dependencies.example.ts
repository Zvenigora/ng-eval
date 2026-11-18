import { Component, computed, inject, signal } from '@angular/core';
import { createEvalSignal } from '@zvenigora/ng-eval-signals';
import { DATA, EXPRESSION } from '../../example-tokens';

interface Order {
  price: number;
  quantity: number;
  shipping: number;
}

@Component({
  selector: 'demo-dependencies',
  template: `
    <dl>
      <dt>total()</dt>
      <dd><output class="total">{{ total() }}</output></dd>
      <dt>total.dependencies</dt>
      <dd><output class="dependencies">{{ dependencies() }}</output></dd>
    </dl>
  `,
})
export class DependenciesExample {
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as Order;

  readonly price = signal(this.data.price);
  readonly quantity = signal(this.data.quantity);
  readonly shipping = signal(this.data.shipping);

  readonly total = createEvalSignal(this.expression, {
    price: this.price,
    quantity: this.quantity,
    shipping: this.shipping,
  }, { trackDependencies: true });

  readonly dependencies = computed(() => {
    this.total();
    return [...this.total.dependencies].join(', ');
  });
}
