import { AbstractControl, FormControl } from '@angular/forms';

/**
 * The two reasons a control is refused, shared by `field-schema.ts`'s
 * `validate` at construction and `control-source.ts`'s `sync` for a control
 * added later, so a consumer meets the same words either way and the two
 * checks cannot drift apart. Not exported from the entry point.
 */

/**
 * Whether `name` is an own property of `Object.prototype` - `constructor`,
 * `toString`, `__proto__` and the rest of the twelve. A field or control of
 * such a name is unreadable through any expression: `EvalContext.get` reads
 * the empty field source with a bare property access before the mirror, so
 * the name resolves to the prototype's value, a truthy function.
 */
export const isPrototypeName = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(Object.prototype, name);

/** The message a control named off `Object.prototype` is refused with. */
export const prototypeControlMessage = (name: string): string =>
  `Control '${name}' is a member of Object.prototype and cannot be read by any ` +
  `expression: the name resolves to the prototype's value before the form is ` +
  `ever consulted. Rename the control.`;

/**
 * Whether a control is outside the flat forms this adapter supports - a
 * nested `FormGroup` or a `FormArray`, which would reach an expression as its
 * *aggregate value* where a field's value was expected.
 */
export const isNotFormControl = (control: AbstractControl): boolean =>
  !(control instanceof FormControl);

/** The message a nested group or `FormArray` is refused with. */
export const nonFormControlMessage = (name: string): string =>
  `Control '${name}' is not a FormControl. Nested groups and FormArrays are ` +
  `out of scope for this phase.`;
