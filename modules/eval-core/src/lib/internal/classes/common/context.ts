import { Registry } from '../common';
import { EvalOptions } from '../eval';

export type BaseContext = Record<string | number | symbol, unknown>;

export type Context = Registry<unknown, unknown> | BaseContext;

/**
 * Converts a context object to a Context instance.
 * @param context - The context object to convert.
 * @param options - Optional evaluation options.
 * @returns The converted Context instance.
 */
export const fromContext = (context?: Context, options?: EvalOptions): Context => {
  const caseInsensitive = options?.caseInsensitive;
  if (!context) {
    return {} as Record<string | number | symbol, unknown>;
  } else if (caseInsensitive && context instanceof Object) {
    return Registry.fromObject(context as Record<string | number | symbol, unknown>, options) as Context;
  } else if (context instanceof Registry || context instanceof Object) {
    return context;
  } else  {
    return context;
  }
}

/**
 * Retrieves the value associated with the specified key from the given context.
 * If the context is an instance of Registry, it uses the `get` method to retrieve the value.
 * If the context is an object, it accesses the value using the key as a property name.
 * If the context is neither an instance of Registry nor an object, it returns undefined.
 *
 * @param context The context from which to retrieve the value.
 * @param key The key associated with the value to retrieve.
 * @returns The value associated with the specified key, or undefined if not found.
 */
export const getContextValue = (context?: Context, key?: unknown): unknown => {
  if (context instanceof Registry) {
    return context.get(key);
  } else if (context instanceof Object) {
    return context[key as string | number | symbol];
  } else {
    return undefined;
  }
}

/**
 * Sets a value in the given context object.
 * If the context is an instance of Registry, the value is set using the key.
 * If the context is a plain object, the value is set using the key as a property name.
 * @param context - The context object.
 * @param key - The key or property name.
 * @param value - The value to be set.
 */
export const setContextValue = (context: Context, key: unknown, value: unknown): void => {
  if (context instanceof Registry) {
    const registry = context as Registry<unknown, unknown>;
    registry.set(key, value);
  } else if (context instanceof Object) {
    const object = context as Record<string, unknown>;
    object[key as string | number] = value;
  }
}
