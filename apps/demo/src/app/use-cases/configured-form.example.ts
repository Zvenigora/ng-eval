import { Component, Injector, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldSchema, bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { DATA } from '../example-tokens';

@Component({
  selector: 'demo-configured-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      @for (field of fields; track field.name) {
        @if (binding.fields[field.name].visible?.() ?? true) {
          <label [class]="field.name">
            {{ binding.fields[field.name].text?.() ?? field.name }}
            <input [formControlName]="field.name" />
          </label>
        }
      }
    </form>
  `,
})
export class ConfiguredFormExample implements OnDestroy {
  private readonly injector = inject(Injector);

  /** The field list, as it would arrive from a server. */
  readonly fields = inject(DATA) as FieldSchema[];

  readonly form = new FormGroup(
    Object.fromEntries(this.fields.map((field) => [field.name, new FormControl('')]))
  );

  readonly binding = bindFieldProperties(this.fields, this.form, { injector: this.injector });

  ngOnDestroy() {
    this.binding.destroy();
  }
}
