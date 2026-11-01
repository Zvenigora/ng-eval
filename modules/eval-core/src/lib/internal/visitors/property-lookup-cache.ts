/**
 * Property Lookup Cache
 *
 * Remembers, per object, which own key a case-insensitive name resolved to,
 * so that a repeated read skips the O(n) scan of the object's own names.
 *
 * Keyed by the object itself (`docs/backlog-retired.md` A31). Up to 0.11.0 the
 * key was the object's own-key count and its first five own names, in one
 * cache for the whole process, so two objects that shared those answered for
 * each other: a read could return the wrong property, or `undefined`, and a
 * case variant of a blocked name read `undefined` instead of being refused.
 */

/**
 * One object's answers, by lower-cased search key, and its own-key names, in
 * order, when they were made.
 */
interface PropertyLookupCacheEntry {
  keys: string[];
  found: Map<string, string | null>;
}

// A `WeakMap`, so an entry lives exactly as long as its object, and nothing
// one object answered can be read for another.
let propertyLookupCache = new WeakMap<object, PropertyLookupCacheEntry>();

// Entries made since the last clear. A `WeakMap` cannot say how many are live.
let entriesCreated = 0;

/**
 * Performs optimized case-insensitive property lookup with caching.
 *
 * A key found before is still the answer while it is still an own key of the
 * object, which is checked without a scan. One deleted or renamed since is
 * scanned for again. A miss stays a miss while the object's own names are the
 * ones it was made from, in order; any difference, a key added in the same
 * interval as another is deleted included, and the object's answers are made
 * afresh (`docs/backlog-retired.md` A33).
 */
export function getCachedCaseInsensitiveProperty(
  obj: Record<PropertyKey, unknown>,
  searchKey: string,
  equalIgnoreCase: (a: string, b: string) => boolean
): string | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const lowered = searchKey.toLowerCase();
  let entry = propertyLookupCache.get(obj);
  const cached = entry?.found.get(lowered);

  if (typeof cached === 'string' && Object.prototype.hasOwnProperty.call(obj, cached)) {
    return cached;
  }

  const ownKeys = Object.getOwnPropertyNames(obj);

  if (!entry || !sameNames(entry.keys, ownKeys)) {
    entry = { keys: ownKeys, found: new Map() };
    propertyLookupCache.set(obj, entry);
    entriesCreated++;
  } else if (cached === null) {
    return null;
  }

  const foundKey = ownKeys.find(k => equalIgnoreCase(k, searchKey)) || null;
  entry.found.set(lowered, foundKey);

  return foundKey;
}

const sameNames = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

/**
 * Clears the property lookup cache (for testing or memory management)
 */
export function clearPropertyLookupCache(): void {
  propertyLookupCache = new WeakMap();
  entriesCreated = 0;
}

/**
 * Gets current property lookup cache statistics: the number of entries made
 * since the last clear, live or collected; an object gets a new one when a
 * lookup that is not a cached hit finds its own names changed.
 */
export function getPropertyLookupCacheStats(): { size: number } {
  return {
    size: entriesCreated
  };
}
