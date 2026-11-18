import { Component, Signal, inject, signal } from '@angular/core';
import { createEvalSignal } from '@zvenigora/ng-eval-signals';
import { DATA } from '../example-tokens';

interface Order {
  price: number;
  quantity: number;
  /** Each formula by its name, in the order they are computed. */
  formulas: Record<string, string>;
}

interface Formula {
  name: string;
  expression: string;
  value: Signal<unknown>;
}

@Component({
  selector: 'demo-formula-fields',
  template: `
    <label>
      price
      <input class="price" type="number" [value]="price()" (input)="price.set(asNumber($event))" />
    </label>
    <label>
      quantity
      <input class="quantity" type="number" [value]="quantity()" (input)="quantity.set(asNumber($event))" />
    </label>
    <dl>
      @for (formula of formulas; track formula.name) {
        <dt>{{ formula.name }} = {{ formula.expression }}</dt>
        <dd [class]="formula.name">{{ show(formula.value()) }}</dd>
      }
    </dl>
  `,
})
export class FormulaFieldsExample {
  private readonly data = inject(DATA) as Order;

  readonly price = signal(this.data.price);
  readonly quantity = signal(this.data.quantity);

  readonly formulas: Formula[] = [];

  /** Each formula reads the two inputs and the formulas before it, from a copy of the source. */
  constructor() {
    const source: Record<string, Signal<unknown>> = { price: this.price, quantity: this.quantity };
    for (const [name, expression] of Object.entries(this.data.formulas)) {
      const value = createEvalSignal(expression, { ...source });
      source[name] = value;
      this.formulas.push({ name, expression, value });
    }
  }

  /** A number with two decimals; any other value as `String` gives it. */
  show(value: unknown): string {
    return typeof value === 'number' ? value.toFixed(2) : String(value);
  }

  asNumber(event: Event): number {
    return (event.target as HTMLInputElement).valueAsNumber;
  }
}
