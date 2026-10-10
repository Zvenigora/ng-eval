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
 * One object's answers, by lower-cased search key, and its own-key count when
 * they were made.
 */
interface PropertyLookupCacheEntry {
  keyCount: number;
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
 * scanned for again. A miss stays a miss while the object's own-key count is
 * unchanged; a key added since changes the count, and the object's answers
 * are made afresh. Not caught: a key added in the same interval as another is
 * deleted, which leaves the count as it was, so a cached miss can outlive it.
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

  if (!entry || entry.keyCount !== ownKeys.length) {
    entry = { keyCount: ownKeys.length, found: new Map() };
    propertyLookupCache.set(obj, entry);
    entriesCreated++;
  } else if (cached === null) {
    return null;
  }

  const foundKey = ownKeys.find(k => equalIgnoreCase(k, searchKey)) || null;
  entry.found.set(lowered, foundKey);

  return foundKey;
}

/**
 * Clears the property lookup cache (for testing or memory management)
 */
export function clearPropertyLookupCache(): void {
  propertyLookupCache = new WeakMap();
  entriesCreated = 0;
}

/**
 * Gets current property lookup cache statistics: the number of objects given
 * an entry since the last clear, live or collected.
 */
export function getPropertyLookupCacheStats(): { size: number } {
  return {
    size: entriesCreated
  };
}
