/**
 * Property Lookup Cache
 * 
 * Provides efficient caching for case-insensitive property lookups
 * to avoid repeated O(n) searches through object property lists.
 */

interface PropertyLookupCacheEntry {
  foundKey: string | null;
  lastAccessed: number;
  objectHash: string;
}

/**
 * Cache for property lookup results to optimize case-insensitive property access
 */
class PropertyLookupCache {
  private readonly _cache = new Map<string, PropertyLookupCacheEntry>();
  private readonly _maxSize: number;
  private readonly _expirationTime: number; // in milliseconds
  
  constructor(maxSize = 1000, expirationTimeMs = 5 * 60 * 1000) { // 5 minutes default
    this._maxSize = maxSize;
    this._expirationTime = expirationTimeMs;
  }

  /**
   * Generates a simple hash for an object based on its own property names
   */
  private generateObjectHash(obj: Record<PropertyKey, unknown>): string {
    try {
      const keys = Object.getOwnPropertyNames(obj);
      return keys.length.toString() + '_' + keys.slice(0, 5).join('_');
    } catch {
      return 'unknown_hash';
    }
  }

  /**
   * Generates a cache key for a property lookup
   */
  private generateCacheKey(objectHash: string, searchKey: string): string {
    return `${objectHash}:${searchKey.toLowerCase()}`;
  }

  /**
   * Checks if a cache entry is still valid
   */
  private isEntryValid(entry: PropertyLookupCacheEntry, objectHash: string): boolean {
    const now = Date.now();
    return (
      entry.objectHash === objectHash &&
      (now - entry.lastAccessed) < this._expirationTime
    );
  }

  /**
   * Cleans up expired entries and maintains cache size
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this._cache.entries());
    
    // Remove expired entries
    for (const [key, entry] of entries) {
      if ((now - entry.lastAccessed) >= this._expirationTime) {
        this._cache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (this._cache.size > this._maxSize) {
      const sortedEntries = Array.from(this._cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const entriesToRemove = sortedEntries.slice(0, this._cache.size - this._maxSize);
      for (const [key] of entriesToRemove) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Gets a cached property lookup result
   */
  get(obj: Record<PropertyKey, unknown>, searchKey: string): string | null | undefined {
    const objectHash = this.generateObjectHash(obj);
    const cacheKey = this.generateCacheKey(objectHash, searchKey);
    
    const entry = this._cache.get(cacheKey);
    if (entry && this.isEntryValid(entry, objectHash)) {
      // Update access time
      entry.lastAccessed = Date.now();
      return entry.foundKey;
    }
    
    return undefined; // Cache miss
  }

  /**
   * Sets a cached property lookup result
   */
  set(obj: Record<PropertyKey, unknown>, searchKey: string, foundKey: string | null): void {
    // Perform cleanup periodically
    if (this._cache.size > this._maxSize * 0.8) {
      this.cleanup();
    }
    
    const objectHash = this.generateObjectHash(obj);
    const cacheKey = this.generateCacheKey(objectHash, searchKey);
    
    this._cache.set(cacheKey, {
      foundKey,
      lastAccessed: Date.now(),
      objectHash
    });
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this._cache.clear();
  }

  /**
   * Gets current cache size
   */
  get size(): number {
    return this._cache.size;
  }
}

// Global property lookup cache instance
const propertyLookupCache = new PropertyLookupCache();

/**
 * Performs optimized case-insensitive property lookup with caching
 */
export function getCachedCaseInsensitiveProperty(
  obj: Record<PropertyKey, unknown>,
  searchKey: string,
  equalIgnoreCase: (a: string, b: string) => boolean
): string | null {
  // Try to get from cache first
  const cachedResult = propertyLookupCache.get(obj, searchKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }
  
  // Cache miss - perform actual lookup
  let foundKey: string | null = null;
  
  if (obj && typeof obj === 'object') {
    const ownKeys = Object.getOwnPropertyNames(obj);
    const matchingKey = ownKeys.find(k => equalIgnoreCase(k, searchKey));
    foundKey = matchingKey || null;
  }
  
  // Cache the result
  propertyLookupCache.set(obj, searchKey, foundKey);
  
  return foundKey;
}

/**
 * Clears the property lookup cache (for testing or memory management)
 */
export function clearPropertyLookupCache(): void {
  propertyLookupCache.clear();
}

/**
 * Gets current property lookup cache statistics
 */
export function getPropertyLookupCacheStats(): { size: number, maxSize: number } {
  return {
    size: propertyLookupCache.size,
    maxSize: 1000 // This should match the maxSize in constructor
  };
}