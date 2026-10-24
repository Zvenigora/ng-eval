/**
 * Prototype Pollution Prevention Utilities
 *
 * This module provides safeguards against prototype pollution attacks
 * by controlling access to dangerous property names and ensuring safe
 * object operations.
 */
// Direct, not through the `classes/eval` barrel. `instanceof` needs the class
// itself and not its type, and this module is imported by most visitors, so
// the narrowest edge is the right one. Nothing here reads the binding at
// module scope - only inside {@link safeSetProperty} - so the import cycle
// the barrels already carry (`eval-scope.ts` imports the visitors barrel) is
// not deepened into an initialisation order.
import { EvalContext } from '../classes/eval/eval-context';

/**
 * Set of property names that are dangerous for prototype pollution attacks
 */
const DANGEROUS_PROPERTY_NAMES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toString',
  'valueOf',
  'toLocaleString'
]);

/**
 * The subset of DANGEROUS_PROPERTY_NAMES refused on a string, number or
 * boolean receiver: the names that reach a global constructor, a built-in
 * prototype or an accessor definer. The other six - `toString`, `valueOf`,
 * `toLocaleString`, `hasOwnProperty`, `isPrototypeOf`,
 * `propertyIsEnumerable` - are ordinary reads on a primitive and stay
 * readable.
 *
 * Matched by exact key, under `caseInsensitive` too: a primitive receiver is
 * never case-corrected, so a variant such as `s.CONSTRUCTOR` is a missing
 * property, not a route to `String`.
 */
const DANGEROUS_PRIMITIVE_PROPERTY_NAMES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
]);

/**
 * DANGEROUS_PROPERTY_NAMES lower-cased, for {@link mayMatchDangerousProperty}.
 */
const LOWERED_DANGEROUS_PROPERTY_NAMES = new Set(
  Array.from(DANGEROUS_PROPERTY_NAMES, (name) => name.toLowerCase())
);

/**
 * Any UTF-16 code unit outside ASCII, for {@link mayMatchDangerousProperty}.
 */
const NON_ASCII = /[\u0080-￿]/;

/**
 * Set of constructor names that should be blocked from modification
 */
const DANGEROUS_CONSTRUCTORS = new Set([
  'Object',
  'Function',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Date',
  'RegExp',
  'Error',
  'Promise'
]);

/**
 * Checks if a property name is dangerous for prototype pollution
 * @param key The property name to check
 * @returns true if the property is dangerous, false otherwise
 */
export const isDangerousProperty = (key: unknown): boolean => {
  if (typeof key === 'string') {
    return DANGEROUS_PROPERTY_NAMES.has(key);
  }
  return false;
};

/**
 * Checks if a property name is dangerous on a primitive receiver
 * @param key The property name to check
 * @returns true if the property is in the primitive subset, false otherwise
 */
export const isDangerousPrimitiveProperty = (key: unknown): boolean => {
  if (typeof key === 'string') {
    return DANGEROUS_PRIMITIVE_PROPERTY_NAMES.has(key);
  }
  return false;
};

/**
 * Whether a name, matched against a context under `caseInsensitive`, could
 * match a key in DANGEROUS_PROPERTY_NAMES: the cheap filter ahead of
 * `EvalContext.getKey`, which says which key it did match. False means it
 * cannot, so an identifier pays for `getKey` only when it is near a dangerous
 * name.
 *
 * A context matches another spelling in two ways. A case-insensitive
 * `Registry`, and an `eval-signals` source, compare `toLowerCase()` forms, so
 * a name can match a dangerous key only if its own lower-case form is one. A
 * prior scope's namespace is compared by `localeCompare` at base sensitivity,
 * which ignores accents as well as case: on ASCII identifier characters that
 * is the same comparison, but a name with any other character may match a
 * dangerous key - `cönstructor` matches `constructor` - so such a name always
 * answers true.
 * @param name The name as written
 * @returns false if the name cannot match a dangerous key, true otherwise
 */
export const mayMatchDangerousProperty = (name: string): boolean =>
  NON_ASCII.test(name) || LOWERED_DANGEROUS_PROPERTY_NAMES.has(name.toLowerCase());

/**
 * Checks if an object is a dangerous constructor that shouldn't be modified
 * @param obj The object to check
 * @returns true if the object is a dangerous constructor, false otherwise
 */
export const isDangerousConstructor = (obj: unknown): boolean => {
  if (typeof obj === 'function' && obj.name) {
    return DANGEROUS_CONSTRUCTORS.has(obj.name);
  }
  return false;
};

/**
 * Security: refuses a member write whose target is an evaluation context -
 * **by class** (`docs/a35/plan.md` Revision 16, and `docs/backlog.md` A42).
 *
 * `this.k = v` is a member write whose target is the `EvalContext` itself: the
 * member visitor resolves `this.k` through the context's chain, and for a key
 * nothing in that chain holds, `getThis` answers undefined and the receiver
 * falls back to the context object. Up to 0.12.1 the write then landed on the
 * instance as an own property. Three things followed, and the third is why
 * this refusal is the fix rather than one of the routes being closed:
 *
 * - **Capture.** An own property shadows the prototype's method, so a planted
 *   function under a method's name was invoked by the evaluator itself - with
 *   the real context as its `this`. `context-method.ts` closes that at the
 *   sites that remain; closing it here closes it at the source.
 * - **Denial of service.** A plant over `push` that evaluates anything
 *   recurses through `arrow-function-expression.ts` until the stack is gone,
 *   and it persists on the instance - so every later evaluation on a reused
 *   context throws. `@zvenigora/ng-eval-signals` and
 *   `@zvenigora/ng-eval-forms` both reuse one context by design.
 * - **Integrity.** `_original`, `_scopes`, `_priorScopes`, `_lookups` and
 *   `_options` are own properties, so a write could replace the caller's own
 *   object or the scope stack outright. No amount of method resolution
 *   reaches that; refusing the write does.
 *
 * **Nothing legitimate is lost.** The property it used to create was not
 * readable by any expression: `EvalContext.get` resolves through the scopes,
 * the original, the prior scopes and the lookups, and never off the instance.
 * So the write was invisible from the inside and reachable only as the three
 * defects above. A write to a context *key* is `k = v`, which goes through
 * `EvalContext.set` and the write policy a subclass may override.
 *
 * By class rather than by identity, so it covers a subclass - a signal
 * context - and a context other than the walk's own, which is the shape the
 * cross-context disclosure took.
 */
export const refuseContextWrite = (target: unknown): void => {
  if (target instanceof EvalContext) {
    throw new Error(`Write to the evaluation context is blocked for security reasons`);
  }
};

/**
 * Security: refuses an evaluation context **as a value**, by class.
 *
 * The companion to {@link refuseContextWrite}, and the load-bearing one: the
 * context cannot be written to, and it cannot be obtained either. It is
 * raised from the value funnel, `refuseFunnelledValue` in `visitor-result.ts`,
 * which has two call sites: `pushVisitorResult`, so it covers every value the
 * walk pushes, whatever node pushed it, and `assignment-expression.ts`, for a
 * compound or logical assignment's target, which is read once and not pushed
 * (`docs/backlog.md` A45, part 2).
 *
 * **It is at the funnel because a member read was not enough.** The first
 * version refused a context only as a member read's object and value, and
 * the step's second code review measured four ways round it, two of them
 * pure language and needing nothing from the host: object spread
 * (`({...c})._original`) and destructuring both copy the context's own
 * enumerable fields into a plain object, from which the caller's object is an
 * ordinary read; `Object.values` and `JSON.stringify` do the same with a
 * host-supplied native; and a bare identifier simply returned the context to
 * the consumer. The spread copy also handed out the **live** scope `Stack` by
 * reference, so pushing onto its array poisoned every later evaluation on
 * that context - the third stack invariant broken from outside any visitor.
 *
 * Refusing the value closes all of those at once, because each of them has to
 * get the context onto the walk's stack first.
 *
 * The one value that may be a context is the positional `this`, which the
 * member visitor consumes as its object and never returns; the funnel
 * exempts exactly that node, and `this` anywhere else is already refused by
 * `this-position.ts`.
 */
export const refuseContextRead = (): never => {
  throw new Error(`Access to the evaluation context is blocked for security reasons`);
};

/**
 * Safely sets a property on an object with prototype pollution protection.
 * Refuses a dangerous target or key, then assigns - so a setter runs, and a
 * write the object refuses throws, prefixed "Failed to set property".
 * @param target The target object
 * @param key The property key
 * @param value The property value
 * @throws Error if the operation would cause prototype pollution, or if the
 *   object refuses the write
 */
export const safeSetProperty = (target: unknown, key: unknown, value: unknown): void => {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    throw new Error(`Cannot set property on non-object: ${typeof target}`);
  }

  refuseContextWrite(target);

  if (isDangerousProperty(key)) {
    throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
  }

  // Additional protection: don't allow setting properties on built-in prototypes
  if (isDangerousConstructor(target)) {
    throw new Error(`Modification of built-in constructor "${(target as {name: string}).name}" is blocked for security reasons`);
  }

  // Check if we're trying to modify prototype chain
  if (target === Object.prototype ||
      target === Function.prototype ||
      target === Array.prototype ||
      target === String.prototype ||
      target === Number.prototype ||
      target === Boolean.prototype) {
    throw new Error(`Modification of built-in prototype is blocked for security reasons`);
  }

  // Convert key to PropertyKey for safe operations
  let propertyKey: PropertyKey;
  if (typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol') {
    propertyKey = key;
  } else {
    // For other types, try to convert to string
    propertyKey = String(key);
  }

  // An assignment, after every refusal above - not a definition. Up to 0.9.x
  // this was `Object.defineProperty` with a writable, enumerable, configurable
  // descriptor (`docs/backlog-retired.md` A23), which a write in JavaScript is
  // not: it replaced an own accessor and hid an inherited one, so no setter
  // ever ran; it made a non-enumerable property enumerable; and it refused
  // every non-configurable property, `lastIndex` and an array's `length`
  // included. Reads already ran the caller's getters, so running its setters
  // here is the one behaviour this adds. This module is strict, so a write the
  // object refuses - frozen, non-writable, an accessor with no setter - throws
  // rather than failing silently, and is reported below.
  try {
    (target as Record<PropertyKey, unknown>)[propertyKey] = value;
  } catch (error) {
    throw new Error(`Failed to set property "${String(key)}": ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Safely gets a property from an object with prototype pollution protection
 * @param target The target object
 * @param key The property key
 * @returns The property value or undefined
 */
export const safeGetProperty = (target: unknown, key: unknown): unknown => {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    return undefined;
  }

  if (isDangerousProperty(key)) {
    throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
  }

  // Convert key to PropertyKey for safe operations
  let propertyKey: PropertyKey;
  if (typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol') {
    propertyKey = key;
  } else {
    // For other types, try to convert to string
    propertyKey = String(key);
  }

  // Direct property access using bracket notation (safer than complex prototype walking)
  try {
    return (target as Record<PropertyKey, unknown>)[propertyKey];
  } catch {
    // If property access fails, return undefined
    return undefined;
  }
};

/**
 * Creates a safe object without dangerous prototype pollution vectors
 * @param entries Key-value pairs to populate the object
 * @returns A new safe object
 */
export const createSafeObject = (entries: Array<[unknown, unknown]> = []): Record<string, unknown> => {
  // Create object with normal prototype for compatibility, but validate contents
  const obj: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    if (isDangerousProperty(key)) {
      throw new Error(`Cannot create object with dangerous property "${String(key)}"`);
    }

    // Safely set the property
    if (typeof key === 'string' || typeof key === 'number') {
      obj[key] = value;
    } else if (typeof key === 'symbol') {
      (obj as Record<symbol, unknown>)[key] = value;
    }
  }

  return obj;
};

/**
 * Validates that an object is safe from prototype pollution
 * @param obj The object to validate
 * @throws Error if the object contains dangerous properties
 */
export const validateSafeObject = (obj: unknown): void => {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const keys = Object.getOwnPropertyNames(obj);
  for (const key of keys) {
    if (isDangerousProperty(key)) {
      throw new Error(`Object contains dangerous property "${key}" that could lead to prototype pollution`);
    }
  }

  // Also check symbol properties
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const symbol of symbols) {
    const description = symbol.description;
    if (description && isDangerousProperty(description)) {
      throw new Error(`Object contains dangerous symbol property "${description}" that could lead to prototype pollution`);
    }
  }
};
