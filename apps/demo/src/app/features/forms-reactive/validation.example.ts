import { Component, Injector, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { DATA, EXPRESSION } from '../../example-tokens';

@Component({
  selector: 'demo-validation',
  template: `<output>{{ binding.fields['city'].visible?.() }}</output>`,
})
export class ValidationExample implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as Record<string, unknown>;

  readonly form = new FormGroup(
    Object.fromEntries(Object.keys(this.data).map((key) => [key, new FormControl(this.data[key])]))
  );

  readonly binding = bindFieldProperties(
    [{ name: 'city', visible: this.expression }],
    this.form,
    { injector: this.injector }
  );

  ngOnDestroy() {
    this.binding.destroy();
  }
}
