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
   * deeper than {@link MAX_PATTERN_DEPTH}. `size`: the pattern holds more than
   * {@link MAX_PATTERN_VALUES}, reported alone, at the pattern's own path.
   */
  readonly reason: 'value' | 'cycle' | 'depth' | 'size';
}

/**
 * Every value in `pattern` that is not a pattern, by path. A pattern holds
 * `null`, strings, finite numbers, booleans, arrays of patterns and objects of
 * patterns: what JSON can write, less `NaN` and the infinities, which no `===`
 * matches. An array is read by index, so a hole is a value, `undefined`, and
 * reported. A rule built in code can also hold a cycle, which JSON cannot
 * write; it is reported at the value that closes it, and not walked again.
 *
 * Two bounds keep the walk, the copy `compileRule` makes and every match
 * within the call stack and in proportion to the text: an array or object
 * nested deeper than {@link MAX_PATTERN_DEPTH} is reported and not walked,
 * and a pattern holding more than {@link MAX_PATTERN_VALUES}, counting itself
 * and a value shared by two paths once on each, stops the walk and is reported alone. JSON
 * writes no shared value, so for a rule read from JSON the count is the
 * number of values in its text.
 */
export const invalidPatternValues = (pattern: unknown, path: string): readonly InvalidPatternValue[] => {
  const found: InvalidPatternValue[] = [];
  const open = new Set<object>();
  let count = 0;
  const visit = (value: unknown, at: string, depth: number): boolean => {
    if (++count > MAX_PATTERN_VALUES) {
      return false;
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return true;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        found.push({ path: at, reason: 'value' });
      }
      return true;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) {
      found.push({ path: at, reason: 'value' });
      return true;
    }
    if (open.has(value)) {
      found.push({ path: at, reason: 'cycle' });
      return true;
    }
    if (depth > MAX_PATTERN_DEPTH) {
      found.push({ path: at, reason: 'depth' });
      return true;
    }
    open.add(value);
    let within = true;
    if (Array.isArray(value)) {
      for (let index = 0; within && index < value.length; index++) {
        within = visit(value[index], `${at}[${index}]`, depth + 1);
      }
    } else {
      for (const key of Object.keys(value)) {
        within = visit(value[key], `${at}.${key}`, depth + 1);
        if (!within) {
          break;
        }
      }
    }
    open.delete(value);
    return within;
  };
  return visit(pattern, path, 1) ? found : [{ path, reason: 'size' }];
};

/** An object whose prototype is `Object.prototype` or `null`. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
