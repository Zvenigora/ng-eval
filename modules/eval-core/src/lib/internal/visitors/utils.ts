import { BaseContext } from "../classes/common/context";

/**
 * Retrieves the key-value pair from an object based on the provided key.
 * @param obj - The object to search for the key-value pair.
 * @param key - The key to search for in the object.
 * @param caseInsesitive - Specifies whether the key comparison should be case-insensitive.
 * @returns The key-value pair as an array, or undefined if the key is not found.
 */
export const getKeyValue = (obj: BaseContext,
    key: string | number | symbol,
    caseInsesitive: boolean): [string | number | symbol, unknown] | undefined => {

  if (!caseInsesitive || typeof key !== 'string') {
    const value = obj[key];
    return [key, value];
  }

  if (typeof key === 'string') {
    let currentObj = obj;
    do {
      const keys: string[] = Object.getOwnPropertyNames(currentObj);
      if (Array.isArray(keys)) {
        const foundKey = keys.find(k => equalIgnoreCase(key, k));
        if (foundKey) {
          const value = currentObj[foundKey];
          return [foundKey, value];
        }
      }
    } while ((currentObj = Object.getPrototypeOf(currentObj)));
  }

  return undefined;
}

/**
 * Compares two values for equality, ignoring case sensitivity.
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @returns `true` if the values are equal, `false` otherwise.
 */
export const equalIgnoreCase = (a: string | number | symbol, b: string | number | symbol) => {
  if (typeof a === 'number' || typeof b === 'number') {
    return a === b;
  } else if (typeof a === 'symbol' || typeof b === 'symbol') {
    return a === b;
  } else if (typeof a === 'string' || typeof b === 'string') {
    return a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0;
  }
  return undefined;
}

/**
 * Retrieves the value from an object, ignoring the case of the key.
 * @param obj - The object to retrieve the value from.
 * @param key - The key to search for, ignoring the case.
 * @returns The value associated with the key, or undefined if the key is not found.
 */
export const getValueIgnoreCase = (obj: BaseContext,
  key: string | number | symbol): unknown | undefined => {
  const pair = getKeyValue(obj, key, true);
  if (pair) {
    return pair[1];
  }
  return undefined;
}
