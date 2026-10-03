/**
 * Whether `name` is an own property of `Object.prototype` - `constructor`,
 * `toString`, `__proto__` and the rest of the twelve. A field or control of
 * such a name is unreadable through any expression: `EvalContext.get` reads
 * the empty field source with a bare property access before the mirror, so
 * the name resolves to the prototype's value, a truthy function.
 *
 * Not exported from the entry point. `field-schema.ts`'s `validate` and
 * `control-source.ts`'s `sync` share it so the construction-time refusal and
 * the later one cannot drift apart.
 */
export const isPrototypeName = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(Object.prototype, name);

/**
 * The message a control named off `Object.prototype` is refused with - at
 * construction by `validate`, and for a control added later by the mirror's
 * `sync`. One string, so a consumer meets the same words either way.
 */
export const prototypeControlMessage = (name: string): string =>
  `Control '${name}' is a member of Object.prototype and cannot be read by any ` +
  `expression: the name resolves to the prototype's value before the form is ` +
  `ever consulted. Rename the control.`;
