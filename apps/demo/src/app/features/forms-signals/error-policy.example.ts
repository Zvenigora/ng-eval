import { Component, inject, signal } from '@angular/core';
import { form, schema } from '@angular/forms/signals';
import { TEXT, createExpressionRules } from '@zvenigora/ng-eval-forms/signals';
import { DATA, EXPRESSION } from '../../example-tokens';

interface Model {
  customer: unknown;
  byDefault: string;
  byFunction: string;
  byThrow: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Component({
  selector: 'demo-error-policy',
  template: `
    <dl>
      <dt>default</dt>
      <dd class="default">{{ read('byDefault') }}</dd>
      <dt>function</dt>
      <dd class="function">{{ read('byFunction') }}</dd>
      <dt>'throw'</dt>
      <dd class="throw">{{ read('byThrow') }}</dd>
    </dl>
  `,
})
export class ErrorPolicyExample {
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as { customer: unknown };

  readonly model = signal<Model>({
    customer: this.data.customer,
    byDefault: '',
    byFunction: '',
    byThrow: '',
  });

  readonly rules = createExpressionRules(this.model);

  readonly policySchema = schema<Model>((p) => {
    this.rules.evalText(p.byDefault, this.expression);
    this.rules.evalText(p.byFunction, this.expression, { onError: () => '—' });
    this.rules.evalText(p.byThrow, this.expression, { onError: 'throw' });
  });

  readonly f = form(this.model, this.policySchema);

  read(key: 'byDefault' | 'byFunction' | 'byThrow'): string {
    try {
      return JSON.stringify(this.f[key]().metadata(TEXT)?.());
    } catch (error) {
      return messageOf(error);
    }
  }
}
