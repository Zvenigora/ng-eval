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

/** How many problems a pattern reports; past them, one more says there are more. */
export const MAX_PATTERN_PROBLEMS = 100;

/** How many UTF-16 code units of a key a problem's path shows. */
export const MAX_PATH_KEY = 64;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * A key as a problem's path shows it: `.key` for an ASCII identifier of at
 * most {@link MAX_PATH_KEY} UTF-16 code units, and otherwise in brackets, quoted
 * as JSON: the whole key, or one longer than that cut to its first
 * {@link MAX_PATH_KEY} code units and `…`. A key holding a `.` or a `[` reads
 * as one key, and no path grows with its keys past the bound. A cut can split
 * a surrogate pair; `JSON.stringify` escapes the half it leaves.
 */
export const pathKey = (key: string): string =>
  key.length <= MAX_PATH_KEY && IDENTIFIER.test(key)
    ? `.${key}`
    : `[${JSON.stringify(key.length <= MAX_PATH_KEY ? key : `${key.slice(0, MAX_PATH_KEY)}…`)}]`;

/** A value in a pattern that is not one, and why. */
export interface InvalidPatternValue {
  readonly path: string;
  /**
   * `value`: not a value JSON can write, or `NaN` or an infinity. `cycle`: an
   * object or array that contains itself. `depth`: an array or object nested
   * deeper than {@link MAX_PATTERN_DEPTH}, reported once for the pattern, at
   * the first. `size`: the pattern holds more than {@link MAX_PATTERN_VALUES},
   * reported alone, at the pattern's own path. `more`: the pattern has more
   * problems than the {@link MAX_PATTERN_PROBLEMS} before it, reported last,
   * at the pattern's own path.
   */
  readonly reason: 'value' | 'cycle' | 'depth' | 'size' | 'more';
}

/** A pattern checked, and its copy, made by the same reading. */
export interface CheckedPattern {
  /**
   * The values that are not a pattern, by path, in the order the walk meets
   * them: every one, or the walk's stop at the first of two bounds, its first
   * {@link MAX_PATTERN_PROBLEMS} and one `more` at the next, or one `size`
   * alone past {@link MAX_PATTERN_VALUES}.
   */
  readonly problems: readonly InvalidPatternValue[];
  /**
   * A frozen copy, with null-prototype objects, when there are no problems:
   * what was checked, since each value is read once on each path to it and
   * copied from that reading. A value two paths share is copied once, from
   * the first, and shared in the copy.
   */
  readonly copy: unknown;
}

/**
 * Checks `pattern` and copies it, reading each value once on each path to it
 * and copying that reading, so a rule built in code with a getter is compiled
 * with what was checked. A pattern holds
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
 * value two paths share once on each, stops the walk and is reported alone,
 * whatever it had found, unless the walk stopped at the problem bound first.
 * JSON writes no shared value, so for a rule read from JSON the count is the
 * number of values in its text.
 *
 * What it returns is bounded too: at its 101st problem the walk stops and
 * gives its first {@link MAX_PATTERN_PROBLEMS} and one `more`; so a pattern
 * gives at most 101 problems, whichever bound it meets first, each path at
 * most {@link MAX_PATTERN_DEPTH} keys of {@link pathKey}'s length.
 * JSON can write a value that is not one: `1e999` parses to `Infinity`.
 */
export const checkPattern = (pattern: unknown, path: string): CheckedPattern => {
  const found: InvalidPatternValue[] = [];
  const open = new Set<object>();
  const copies = new Map<object, unknown>();
  let count = 0;
  let stopped = false;
  let more = false;
  let deep = false;
  const report = (at: string, reason: InvalidPatternValue['reason']): void => {
    if (found.length < MAX_PATTERN_PROBLEMS) {
      found.push({ path: at, reason });
    } else {
      more = stopped = true;
    }
  };
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
        report(at, 'value');
      }
      return value;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) {
      report(at, 'value');
      return undefined;
    }
    if (open.has(value)) {
      report(at, 'cycle');
      return undefined;
    }
    if (depth > MAX_PATTERN_DEPTH) {
      if (!deep) {
        deep = true;
        report(at, 'depth');
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
        entries[key] = visit(value[key], `${at}${pathKey(key)}`, depth + 1);
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
  if (more) {
    return { problems: [...found, { path, reason: 'more' }], copy: undefined };
  }
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
