import { isDevMode, isSignal } from '@angular/core';

/**
 * Whether a value is a plain object literal, as opposed to an array, a `Map`,
 * a class instance, or a signal (which is a function).
 *
 * Only object literals are scanned: a signal held inside caller data with a
 * prototype of its own is a shape this library has no opinion about.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Reads an own enumerable *data* property without invoking an accessor.
 *
 * Calling a getter here would be a side effect at context-construction time,
 * for a diagnostic - so a signal behind a getter is a deliberate blind spot.
 */
const dataPropertyValue = (target: object, key: string): { value: unknown } | undefined => {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  return descriptor && 'value' in descriptor ? { value: descriptor.value } : undefined;
};

/**
 * Finds signals nested exactly one level inside a plain-object value of the
 * source, and returns their `key.nestedKey` paths in source order.
 *
 * ```ts
 * { user: signal({ name: 'a' }) }   // supported - tracks at `user`
 * { user: { name: signal('a') } }   // reported  - tracks nothing
 * ```
 *
 * The second shape resolves `user` to a plain object, and the member hop then
 * reads `name` off it and gets the signal *function* - never called, never
 * tracked, and pushed as the expression's value. It is legal, so this reports
 * it rather than correcting it or throwing.
 *
 * Known blind spots, by design: a signal inside an array, a `Map`, or a class
 * instance; a signal behind a getter; and a signal added to the source after
 * the context was constructed.
 */
export const findNestedSignals = (source: Record<string, unknown>): string[] => {
  const paths: string[] = [];

  for (const key of Object.keys(source)) {
    const property = dataPropertyValue(source, key);
    if (!property || !isPlainObject(property.value)) {
      continue;
    }

    const nested = property.value;
    for (const nestedKey of Object.keys(nested)) {
      const nestedProperty = dataPropertyValue(nested, nestedKey);
      if (nestedProperty && isSignal(nestedProperty.value)) {
        paths.push(`${key}.${nestedKey}`);
      }
    }
  }

  return paths;
};

/**
 * Reports the nested-signal shape found by {@link findNestedSignals}, in dev
 * mode only.
 *
 * This is the one place this library writes to the console, under the
 * dev-mode-only carve-out in CLAUDE.md's Conventions: the shape fails
 * silently - the expression evaluates to a function and the signal simply
 * never updates - so a consumer has nothing to search for. An opt-in callback
 * would only reach the consumers who already knew about the trap.
 */
export const warnOnNestedSignals = (source: Record<string, unknown>): void => {
  if (!isDevMode()) {
    return;
  }

  const paths = findNestedSignals(source);
  if (paths.length === 0) {
    return;
  }

  console.warn(
    `[ng-eval-signals] createSignalContext: signal(s) nested inside a plain object ` +
    `(${paths.join(', ')}). A nested signal is never called, so it is not tracked and ` +
    `the expression evaluates to the signal function itself. Hoist it to a top-level ` +
    `key, or put the whole object in one signal.`
  );
};
