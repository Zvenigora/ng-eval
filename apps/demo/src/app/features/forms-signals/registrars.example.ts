import { Component, inject, signal } from '@angular/core';
import { form, schema } from '@angular/forms/signals';
import { TEXT, createExpressionRules } from '@zvenigora/ng-eval-forms/signals';
import { DATA, EXPRESSION } from '../../example-tokens';

interface Order {
  country: string;
  state: string;
  zip: string;
  orderTotal: number;
}

@Component({
  selector: 'demo-registrars',
  template: `
    <dl>
      <dt>state().hidden()</dt>
      <dd class="hidden">{{ f.state().hidden() }}</dd>
      <dt>zip().metadata(TEXT)</dt>
      <dd class="text">{{ f.zip().metadata(TEXT)?.() }}</dd>
      <dt>zip().disabled()</dt>
      <dd class="disabled">{{ f.zip().disabled() }}</dd>
      <dt>zip().disabledReasons()</dt>
      <dd class="reasons">{{ reasons() }}</dd>
    </dl>
    <button type="button" (click)="setUs()">country US, total 120</button>
  `,
})
export class RegistrarsExample {
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as Order;

  readonly TEXT = TEXT;

  readonly model = signal<Order>({ ...this.data });

  readonly rules = createExpressionRules(this.model);

  readonly orderSchema = schema<Order>((p) => {
    this.rules.evalVisible(p.state, this.expression);
    this.rules.evalText(p.zip, "orderTotal >= 100 ? 'Free shipping' : 'Standard'");
    this.rules.evalDisabled(p.zip, "country !== 'US'", { reason: 'ZIP is US-only' });
  });

  readonly f = form(this.model, this.orderSchema);

  reasons(): string {
    return this.f.zip().disabledReasons().map((r) => r.message).join(', ');
  }

  setUs(): void {
    this.model.set({ country: 'US', state: '', zip: '', orderTotal: 120 });
  }
}
