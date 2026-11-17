import { Component, inject, signal } from '@angular/core';
import { form, schema } from '@angular/forms/signals';
import { ExpressionRules, createExpressionRules } from '@zvenigora/ng-eval-forms/signals';
import { DATA, EXPRESSION } from '../../example-tokens';

interface Order {
  country: string;
  state: string;
}

@Component({
  selector: 'demo-schema-function',
  template: `
    <dl>
      <dt>a: state().hidden()</dt>
      <dd class="a">{{ fA.state().hidden() }}</dd>
      <dt>b: state().hidden()</dt>
      <dd class="b">{{ fB.state().hidden() }}</dd>
    </dl>
  `,
})
export class SchemaFunctionExample {
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as { a: Order; b: Order };

  private readonly makeSchema = (rules: ExpressionRules) =>
    schema<Order>((p) => {
      rules.evalVisible(p.state, this.expression);
    });

  readonly modelA = signal<Order>({ ...this.data.a });
  readonly modelB = signal<Order>({ ...this.data.b });

  readonly fA = form(this.modelA, this.makeSchema(createExpressionRules(this.modelA)));
  readonly fB = form(this.modelB, this.makeSchema(createExpressionRules(this.modelB)));
}
