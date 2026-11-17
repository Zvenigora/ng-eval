import { Component, Injector, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { FormBinding, bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { DATA, EXPRESSION } from '../../example-tokens';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Component({
  selector: 'demo-rule-fails',
  template: `
    <dl>
      <dt>default</dt>
      <dd class="default">{{ read(byDefault) }}</dd>
      <dt>function</dt>
      <dd class="function">{{ read(byFunction) }}</dd>
      <dt>'throw'</dt>
      <dd class="throw">{{ read(byThrow) }}</dd>
    </dl>
  `,
})
export class RuleFailsExample implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as Record<string, unknown>;

  readonly form = new FormGroup(
    Object.fromEntries(Object.keys(this.data).map((key) => [key, new FormControl(this.data[key])]))
  );

  private readonly schema = [{ name: 'label', text: this.expression }];

  readonly byDefault = bindFieldProperties(this.schema, this.form, { injector: this.injector });
  readonly byFunction = bindFieldProperties(this.schema, this.form, {
    injector: this.injector,
    onError: () => '—',
  });
  readonly byThrow = bindFieldProperties(this.schema, this.form, {
    injector: this.injector,
    onError: 'throw',
  });

  read(binding: FormBinding): string {
    try {
      return JSON.stringify(binding.fields['label'].text?.());
    } catch (error) {
      return messageOf(error);
    }
  }

  ngOnDestroy() {
    this.byDefault.destroy();
    this.byFunction.destroy();
    this.byThrow.destroy();
  }
}
