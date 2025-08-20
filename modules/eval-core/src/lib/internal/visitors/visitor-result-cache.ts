/**
 * Visitor Result Cache
 * 
 * Provides caching for visitor results to avoid redundant AST node evaluations.
 * This is particularly effective for repeated evaluations of identical expressions.
 */

import { AnyNode } from 'acorn';

interface VisitorCacheEntry {
  result: unknown;
  lastAccessed: number;
  contextHash: string;
  nodeHash: string;
}

/**
 * Generates a simple hash for an AST node based on its type and key properties
 */
function generateNodeHash(node: AnyNode): string {
  try {
    let hash = node.type;
    
    // Add specific properties based on node type for better uniqueness
    if ('name' in node && typeof node.name === 'string') {
      hash += '_' + node.name;
    }
    if ('value' in node) {
      hash += '_' + String(node.value);
    }
    if ('operator' in node && typeof node.operator === 'string') {
      hash += '_' + node.operator;
    }
    if ('property' in node && node.property && typeof node.property === 'object' && 'name' in node.property) {
      hash += '_' + String(node.property.name);
    }
    
    // Include position for uniqueness
    if ('start' in node && typeof node.start === 'number') {
      hash += '_' + node.start;
    }
    
    return hash;
  } catch {
    return node.type + '_unknown';
  }
}

/**
 * Generates a simple hash for evaluation context
 */
function generateContextHash(context: unknown): string {
  try {
    if (!context || typeof context !== 'object') {
      return 'no_context';
    }
    
    // For EvalContext objects, hash based on actual variable values
    if ('get' in context && typeof context.get === 'function') {
      // This is likely an EvalContext - get a rough hash based on size or contents
      const size = 'size' in context && typeof context.size === 'number' ? context.size : 0;
      return `context_size_${size}_${Date.now()}`;  // Include timestamp to avoid false caching
    }
    
    // For plain objects, create hash based on JSON content
    const jsonStr = JSON.stringify(context);
    let hash = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `json_hash_${hash}`;
  } catch {
    return `context_unknown_${Date.now()}`;  // Fallback with timestamp
  }
}

/**
 * Cache for visitor results to optimize repeated AST evaluations
 */
class VisitorResultCache {
  private readonly _cache = new Map<string, VisitorCacheEntry>();
  private readonly _maxSize: number;
  private readonly _expirationTime: number; // in milliseconds
  
  constructor(maxSize = 500, expirationTimeMs = 2 * 60 * 1000) { // 2 minutes default
    this._maxSize = maxSize;
    this._expirationTime = expirationTimeMs;
  }

  /**
   * Generates a cache key for a visitor result
   */
  private generateCacheKey(nodeHash: string, contextHash: string): string {
    return `${nodeHash}:${contextHash}`;
  }

  /**
   * Checks if a cache entry is still valid
   */
  private isEntryValid(entry: VisitorCacheEntry, nodeHash: string, contextHash: string): boolean {
    const now = Date.now();
    return (
      entry.nodeHash === nodeHash &&
      entry.contextHash === contextHash &&
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
   * Determines if a node result should be cached (some node types benefit more than others)
   */
  private shouldCacheNode(node: AnyNode): boolean {
    // Cache results for expensive operations but not simple literals
    const cacheableTypes = [
      'MemberExpression',
      'CallExpression', 
      'BinaryExpression',
      'ArrayExpression',
      'ObjectExpression',
      'ConditionalExpression'
    ];
    
    return cacheableTypes.includes(node.type);
  }

  /**
   * Gets a cached visitor result
   */
  get(node: AnyNode, context?: unknown): unknown | undefined {
    if (!this.shouldCacheNode(node)) {
      return undefined; // Don't cache simple nodes
    }
    
    const nodeHash = generateNodeHash(node);
    const contextHash = generateContextHash(context);
    const cacheKey = this.generateCacheKey(nodeHash, contextHash);
    
    const entry = this._cache.get(cacheKey);
    if (entry && this.isEntryValid(entry, nodeHash, contextHash)) {
      // Update access time
      entry.lastAccessed = Date.now();
      return entry.result;
    }
    
    return undefined; // Cache miss
  }

  /**
   * Sets a cached visitor result
   */
  set(node: AnyNode, context: unknown, result: unknown): void {
    if (!this.shouldCacheNode(node)) {
      return; // Don't cache simple nodes
    }
    
    // Don't cache errors or undefined results
    if (result instanceof Error || result === undefined) {
      return;
    }
    
    // Perform cleanup periodically
    if (this._cache.size > this._maxSize * 0.8) {
      this.cleanup();
    }
    
    const nodeHash = generateNodeHash(node);
    const contextHash = generateContextHash(context);
    const cacheKey = this.generateCacheKey(nodeHash, contextHash);
    
    this._cache.set(cacheKey, {
      result,
      lastAccessed: Date.now(),
      contextHash,
      nodeHash
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

// Global visitor result cache instance
const visitorResultCache = new VisitorResultCache();

/**
 * Gets a cached visitor result for the given node and context
 */
export function getCachedVisitorResult(node: AnyNode, context?: unknown): unknown | undefined {
  return visitorResultCache.get(node, context);
}

/**
 * Sets a cached visitor result for the given node and context
 */
export function setCachedVisitorResult(node: AnyNode, context: unknown, result: unknown): void {
  visitorResultCache.set(node, context, result);
}

/**
 * Clears the visitor result cache (for testing or memory management)
 */
export function clearVisitorResultCache(): void {
  visitorResultCache.clear();
}

/**
 * Gets current visitor result cache statistics
 */
export function getVisitorResultCacheStats(): { size: number, maxSize: number } {
  return {
    size: visitorResultCache.size,
    maxSize: 500 // This should match the maxSize in constructor
  };
}