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

/** How deep a pattern nests: the `match` object is the first array or object. */
export const MAX_PATTERN_DEPTH = 64;

/** How many values a pattern holds, itself among them, counting a value once per path to it. */
export const MAX_PATTERN_VALUES = 100_000;

/** A value in a pattern that is not one, and why. */
export interface InvalidPatternValue {
  readonly path: string;
  /**
   * `value`: not a value JSON can write, or `NaN` or an infinity. `cycle`: an
   * object or array that contains itself. `depth`: an array or object nested
   * deeper than {@link MAX_PATTERN_DEPTH}, reported once for the pattern, at
   * the first. `size`: the pattern holds more than {@link MAX_PATTERN_VALUES},
   * reported alone, at the pattern's own path.
   */
  readonly reason: 'value' | 'cycle' | 'depth' | 'size';
}

/** A pattern checked, and its copy, made by the same reading. */
export interface CheckedPattern {
  /** Every value that is not a pattern, by path, in the order the walk meets them. */
  readonly problems: readonly InvalidPatternValue[];
  /**
   * A frozen copy, with null-prototype objects, when there are no problems:
   * what was checked, since every value is read once. A value two paths
   * share is copied once and shared in the copy.
   */
  readonly copy: unknown;
}

/**
 * Checks `pattern` and copies it, reading each value once, so a rule built in
 * code with a getter is compiled with what was checked. A pattern holds
 * `null`, strings, finite numbers, booleans, arrays of patterns and objects of
 * patterns: what JSON can write, less `NaN` and the infinities, which no `===`
 * matches. An array is read by index, so a hole is a value, `undefined`, and
 * reported. A rule built in code can also hold a cycle, which JSON cannot
 * write; it is reported at the value that closes it, and not walked again.
 *
 * Two bounds keep the walk and every match within the call stack and in
 * proportion to the text: an array or object nested deeper than
 * {@link MAX_PATTERN_DEPTH} is not walked, and the first is reported; a
 * pattern holding more than {@link MAX_PATTERN_VALUES}, counting itself and a
 * value two paths share once on each, stops the walk and is reported alone.
 * JSON writes no shared value, so for a rule read from JSON the count is the
 * number of values in its text.
 */
export const checkPattern = (pattern: unknown, path: string): CheckedPattern => {
  const found: InvalidPatternValue[] = [];
  const open = new Set<object>();
  const copies = new Map<object, unknown>();
  let count = 0;
  let stopped = false;
  let deep = false;
  const visit = (value: unknown, at: string, depth: number): unknown => {
    if (++count > MAX_PATTERN_VALUES) {
      stopped = true;
      return undefined;
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        found.push({ path: at, reason: 'value' });
      }
      return value;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) {
      found.push({ path: at, reason: 'value' });
      return undefined;
    }
    if (open.has(value)) {
      found.push({ path: at, reason: 'cycle' });
      return undefined;
    }
    if (depth > MAX_PATTERN_DEPTH) {
      if (!deep) {
        deep = true;
        found.push({ path: at, reason: 'depth' });
      }
      return undefined;
    }
    open.add(value);
    let copy: unknown[] | Record<string, unknown>;
    if (Array.isArray(value)) {
      const items: unknown[] = [];
      for (let index = 0; !stopped && index < value.length; index++) {
        items.push(visit(value[index], `${at}[${index}]`, depth + 1));
      }
      copy = items;
    } else {
      const entries: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(value)) {
        if (stopped) {
          break;
        }
        entries[key] = visit(value[key], `${at}.${key}`, depth + 1);
      }
      copy = entries;
    }
    open.delete(value);
    const shared = copies.get(value);
    if (shared !== undefined) {
      return shared;
    }
    const frozen = Object.freeze(copy);
    copies.set(value, frozen);
    return frozen;
  };
  const copy = visit(pattern, path, 1);
  if (stopped) {
    return { problems: [{ path, reason: 'size' }], copy: undefined };
  }
  return found.length > 0 ? { problems: found, copy: undefined } : { problems: [], copy };
};

/** An object whose prototype is `Object.prototype` or `null`. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
