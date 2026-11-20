/**
 * The pattern of a filter's and a trigger's `match` (the design's § 2.1,
 * Q36): a subset match with no operators.
 *
 * - A scalar matches a value that is `===` to it.
 * - An array is any-of: it matches when one of its elements does. A target
 *   that is an array matches by any of its elements.
 * - An object matches an object that has, as an **own** property, every key
 *   the pattern names, each matching. Keys the pattern does not name are
 *   ignored.
 *
 * Own properties only, on both sides. A pattern's keys are read with
 * `Object.keys`, and a target's with `Object.prototype.hasOwnProperty`, so
 * `{ "constructor": { "name": "Object" } }` does not match `{}`, and a key
 * `__proto__` - which `JSON.parse` makes an own property of the pattern -
 * matches nothing a target inherits.
 *
 * Not exported from the package: `compileRule` checks a pattern's shape, and
 * evaluation applies it.
 */

/** Whether `target` matches `pattern`. */
export const matchesPattern = (pattern: unknown, target: unknown): boolean => {
  if (Array.isArray(pattern)) {
    return pattern.some((element) => matchesElement(element, target));
  }
  if (isObject(pattern)) {
    if (!isObject(target)) {
      return false;
    }
    return Object.keys(pattern).every(
      (key) =>
        Object.prototype.hasOwnProperty.call(target, key) &&
        matchesPattern((pattern as Record<string, unknown>)[key], (target as Record<string, unknown>)[key])
    );
  }
  return pattern === target;
};

/** One element of an any-of list, against a target or each of its elements. */
const matchesElement = (element: unknown, target: unknown): boolean =>
  Array.isArray(target)
    ? target.some((item) => matchesPattern(element, item))
    : matchesPattern(element, target);

const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The path of the first value in `pattern` that is not a pattern, or
 * `undefined`. A pattern holds `null`, strings, finite numbers, booleans,
 * arrays of patterns and objects of patterns: what JSON can write, less
 * `NaN` and the infinities, which no `===` matches.
 */
export const invalidPatternPath = (pattern: unknown, path: string): string | undefined => {
  if (pattern === null || typeof pattern === 'string' || typeof pattern === 'boolean') {
    return undefined;
  }
  if (typeof pattern === 'number') {
    return Number.isFinite(pattern) ? undefined : path;
  }
  if (Array.isArray(pattern)) {
    for (let index = 0; index < pattern.length; index++) {
      const found = invalidPatternPath(pattern[index], `${path}[${index}]`);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  if (isPlainObject(pattern)) {
    for (const key of Object.keys(pattern)) {
      const found = invalidPatternPath((pattern as Record<string, unknown>)[key], `${path}.${key}`);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  return path;
};

/** An object whose prototype is `Object.prototype` or `null`. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
