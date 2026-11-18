import { Component, Injector, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { DATA, EXPRESSION } from '../../example-tokens';

interface Order {
  country: string;
  state: string;
}

@Component({
  selector: 'demo-quick-start',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <label>
        country
        <input class="country" formControlName="country" />
      </label>
      @if (binding.fields['state'].visible?.()) {
        <label>
          state
          <input class="state" formControlName="state" />
        </label>
      }
    </form>
    <dl>
      <dt>fields['state'].visible()</dt>
      <dd><output>{{ binding.fields['state'].visible?.() }}</output></dd>
    </dl>
  `,
})
export class QuickStartExample implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as Order;

  readonly form = new FormGroup({
    country: new FormControl(this.data.country),
    state: new FormControl(this.data.state),
  });

  readonly binding = bindFieldProperties(
    [{ name: 'state', visible: this.expression }],
    this.form,
    { injector: this.injector }
  );

  ngOnDestroy() {
    this.binding.destroy();
  }
}
