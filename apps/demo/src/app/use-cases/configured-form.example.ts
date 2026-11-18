import { Component, Injector, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldSchema, bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { DATA } from '../example-tokens';

/** A field as the server sends it: the schema's keys, and `options`, which only this form reads. */
type ConfiguredField = FieldSchema & { readonly options?: readonly string[] };

@Component({
  selector: 'demo-configured-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      @for (field of fields; track field.name) {
        @if (binding.fields[field.name].visible?.() ?? true) {
          @if (field.options; as options) {
            <label [class]="field.name">
              <span>{{ binding.fields[field.name].text?.() ?? field.name }}</span>
              <select [formControlName]="field.name">
                <option value="">Choose…</option>
                @for (option of options; track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select>
            </label>
          } @else {
            <label [class]="field.name">
              <span>{{ binding.fields[field.name].text?.() ?? field.name }}</span>
              <input [formControlName]="field.name" />
            </label>
          }
        }
      }
    </form>
  `,
})
export class ConfiguredFormExample implements OnDestroy {
  private readonly injector = inject(Injector);

  /** The field list, as it would arrive from a server. */
  readonly fields = inject(DATA) as ConfiguredField[];

  readonly form = new FormGroup(
    Object.fromEntries(this.fields.map((field) => [field.name, new FormControl('')]))
  );

  readonly binding = bindFieldProperties(this.fields, this.form, { injector: this.injector });

  ngOnDestroy() {
    this.binding.destroy();
  }
}
