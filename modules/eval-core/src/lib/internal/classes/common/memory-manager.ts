/**
 * Memory Manager - Comprehensive memory leak prevention and resource cleanup
 * 
 * This utility provides centralized memory management for the evaluation system,
 * handling cleanup of circular references, resource disposal, and memory optimization.
 * 
 * Compatible with older TypeScript/JavaScript environments.
 */
export interface DisposableResource {
  dispose(): void;
  isDisposed(): boolean;
}

export interface CircularReferenceTracker {
  visited: Set<object>;
  pathStack: object[];
}

/**
 * Simple resource tracker for automatic cleanup (compatible version)
 */
class ResourceTracker {
  private resources = new Set<DisposableResource>();
  private disposedResources = new WeakSet<DisposableResource>();

  track<T extends DisposableResource>(resource: T, name?: string): T {
    this.resources.add(resource);
    
    if (name) {
      console.debug(`Tracking resource: ${name}`);
    }
    
    return resource;
  }

  cleanup(): void {
    const resourceArray = Array.from(this.resources);
    for (let i = 0; i < resourceArray.length; i++) {
      const resource = resourceArray[i];
      if (!this.disposedResources.has(resource) && !resource.isDisposed()) {
        try {
          resource.dispose();
          this.disposedResources.add(resource);
        } catch (error) {
          console.warn('Error disposing resource:', error);
        }
      }
    }
    
    // Clean up the tracking set
    this.resources.clear();
  }

  getActiveResourceCount(): number {
    let count = 0;
    const resourceArray = Array.from(this.resources);
    for (let i = 0; i < resourceArray.length; i++) {
      if (!resourceArray[i].isDisposed()) {
        count++;
      }
    }
    return count;
  }
}

/**
 * Memory Manager singleton for comprehensive memory management
 */
export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private resourceTracker = new ResourceTracker();
  private gcTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly GC_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.startAutoCleanup();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Track a disposable resource for automatic cleanup
   */
  trackResource<T extends DisposableResource>(resource: T, name?: string): T {
    return this.resourceTracker.track(resource, name);
  }

  /**
   * Detect and break circular references in object graphs
   */
  detectAndBreakCircularReferences(obj: unknown, maxDepth = 50): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    const tracker: CircularReferenceTracker = {
      visited: new Set(),
      pathStack: []
    };

    return this.processObjectForCircularRefs(obj, tracker, maxDepth, 0);
  }

  private processObjectForCircularRefs(
    obj: unknown, 
    tracker: CircularReferenceTracker, 
    maxDepth: number,
    currentDepth: number
  ): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (currentDepth >= maxDepth) {
      console.warn('Max depth reached during circular reference detection');
      return '[Max Depth Reached]';
    }

    // Check for circular reference
    if (tracker.visited.has(obj as object)) {
      console.warn('Circular reference detected and broken');
      return '[Circular Reference]';
    }

    // Track this object
    tracker.visited.add(obj as object);
    tracker.pathStack.push(obj as object);

    try {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => {
          try {
            return this.processObjectForCircularRefs(item, tracker, maxDepth, currentDepth + 1);
          } catch (error) {
            console.warn(`Error processing array item at index ${index}:`, error);
            return null;
          }
        });
      }

      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        try {
          result[key] = this.processObjectForCircularRefs(value, tracker, maxDepth, currentDepth + 1);
        } catch (error) {
          console.warn(`Error processing property '${key}':`, error);
          result[key] = null;
        }
      }
      return result;
    } finally {
      // Clean up tracking for this object
      tracker.visited.delete(obj as object);
      tracker.pathStack.pop();
    }
  }

  /**
   * Safe property cleanup that handles circular references
   */
  safeCleanupObject(obj: unknown): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    const visited = new Set<object>();
    this.cleanupObjectRecursive(obj, visited);
  }

  private cleanupObjectRecursive(obj: unknown, visited: Set<object>): void {
    if (!obj || typeof obj !== 'object' || visited.has(obj as object)) {
      return;
    }

    visited.add(obj as object);

    try {
      // Check if object is already disposed before attempting disposal
      const isAlreadyDisposed = 'isDisposed' in obj && 
        typeof (obj as { isDisposed: () => boolean }).isDisposed === 'function' &&
        (obj as { isDisposed: () => boolean }).isDisposed();

      if (isAlreadyDisposed) {
        return; // Skip already disposed objects
      }

      // Clean up disposable resources
      if ('dispose' in obj && typeof (obj as DisposableResource).dispose === 'function') {
        try {
          (obj as DisposableResource).dispose();
        } catch (error) {
          // Only warn if it's not an "already disposed" error
          if (error instanceof Error && !error.message.includes('disposed')) {
            console.warn('Error disposing resource:', error);
          }
        }
        return; // Don't continue recursive cleanup after disposal
      }

      // Clean up common cleanup methods
      if ('clear' in obj && typeof (obj as { clear: () => void }).clear === 'function') {
        try {
          (obj as { clear: () => void }).clear();
        } catch (error) {
          // Only warn if it's not an "already disposed" error
          if (error instanceof Error && !error.message.includes('disposed')) {
            console.warn('Error clearing object:', error);
          }
        }
      }

      // Only recursively clean up if not disposed
      if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          try {
            // Only recurse on non-disposed child objects
            if (value && typeof value === 'object') {
              const childIsDisposed = 'isDisposed' in value && 
                typeof (value as { isDisposed: () => boolean }).isDisposed === 'function' &&
                (value as { isDisposed: () => boolean }).isDisposed();
              
              if (!childIsDisposed) {
                this.cleanupObjectRecursive(value, visited);
              }
            }
            
            // Nullify reference for large objects/arrays
            if (this.isLargeReference(value)) {
              (obj as Record<string | number | symbol, unknown>)[key] = null;
            }
          } catch (error) {
            console.warn(`Error cleaning up property '${key}':`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Error during object cleanup:', error);
    }
  }

  private isLargeReference(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    // Consider arrays with more than 100 elements as large
    if (Array.isArray(value) && value.length > 100) {
      return true;
    }

    // Consider objects with more than 50 properties as large
    if (typeof value === 'object') {
      try {
        const keys = Object.keys(value);
        return keys.length > 50;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Memory-efficient deep clone that prevents circular references
   */
  safeDeepClone<T>(obj: T, maxDepth = 10): T {
    if (maxDepth <= 0) {
      return obj;
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    const visited = new Map<object, unknown>();
    return this.deepCloneRecursive(obj, visited, maxDepth) as T;
  }

  private deepCloneRecursive(obj: unknown, visited: Map<object, unknown>, maxDepth: number): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (maxDepth <= 0) {
      return null;
    }

    // Handle circular references
    if (visited.has(obj as object)) {
      return visited.get(obj as object);
    }

    if (Array.isArray(obj)) {
      const cloned: unknown[] = [];
      visited.set(obj, cloned);
      
      for (let i = 0; i < obj.length; i++) {
        cloned[i] = this.deepCloneRecursive(obj[i], visited, maxDepth - 1);
      }
      return cloned;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof RegExp) {
      return new RegExp(obj);
    }

    if (obj instanceof Map) {
      const cloned = new Map();
      visited.set(obj, cloned);
      
      obj.forEach((value, key) => {
        cloned.set(
          this.deepCloneRecursive(key, visited, maxDepth - 1),
          this.deepCloneRecursive(value, visited, maxDepth - 1)
        );
      });
      return cloned;
    }

    if (obj instanceof Set) {
      const cloned = new Set();
      visited.set(obj, cloned);
      
      obj.forEach((value) => {
        cloned.add(this.deepCloneRecursive(value, visited, maxDepth - 1));
      });
      return cloned;
    }

    // Handle plain objects
    const cloned: Record<string, unknown> = {};
    visited.set(obj as object, cloned);
    
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      cloned[key] = this.deepCloneRecursive(value, visited, maxDepth - 1);
    }
    
    return cloned;
  }

  /**
   * Force cleanup of all tracked resources
   */
  forceCleanup(): void {
    this.resourceTracker.cleanup();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    activeResources: number;
    heapUsed?: number;
    heapTotal?: number;
  } {
    const stats = {
      activeResources: this.resourceTracker.getActiveResourceCount(),
      heapUsed: undefined as number | undefined,
      heapTotal: undefined as number | undefined
    };

    // Add Node.js memory usage if available (browser-safe check)
    try {
      if (typeof globalThis !== 'undefined') {
        const process = (globalThis as { process?: { memoryUsage?: () => { heapUsed: number; heapTotal: number } } }).process;
        if (process && typeof process.memoryUsage === 'function') {
          const memUsage = process.memoryUsage();
          stats.heapUsed = memUsage.heapUsed;
          stats.heapTotal = memUsage.heapTotal;
        }
      }
    } catch {
      // Ignore errors in browser environments or when process is not available
    }

    return stats;
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    if (typeof setTimeout !== 'undefined') {
      this.gcTimer = setTimeout(() => {
        this.forceCleanup();
        this.startAutoCleanup(); // Restart timer
      }, this.GC_INTERVAL);
    }
  }

  /**
   * Stop automatic cleanup and dispose of manager
   */
  dispose(): void {
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
    
    this.forceCleanup();
    MemoryManager.instance = null;
  }
}

/**
 * Utility functions for common memory management tasks
 */
export const MemoryUtils = {
  /**
   * Create a disposable wrapper around any object
   */
  makeDisposable<T>(obj: T, cleanupFn?: (obj: T) => void): T & DisposableResource {
    let disposed = false;
    
    return Object.assign(obj as T & DisposableResource, {
      dispose(): void {
        if (!disposed) {
          disposed = true;
          if (cleanupFn) {
            try {
              cleanupFn(obj);
            } catch (error) {
              console.warn('Error in cleanup function:', error);
            }
          }
        }
      },
      
      isDisposed(): boolean {
        return disposed;
      }
    });
  },

  /**
   * Safely null out object properties to break references
   */
  nullifyReferences(obj: Record<string, unknown>, propertiesToKeep: string[] = []): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    const keepSet = new Set(propertiesToKeep);
    
    for (const key of Object.keys(obj)) {
      if (!keepSet.has(key)) {
        try {
          obj[key] = null;
        } catch {
          // Ignore errors for read-only properties
        }
      }
    }
  },

  /**
   * Create a memory-safe timeout that automatically cleans up
   */
  createSafeTimeout(callback: () => void, delay: number): () => void {
    const timeoutId = setTimeout(callback, delay);
    return () => clearTimeout(timeoutId);
  },

  /**
   * Check if an object looks like it might have memory leaks
   */
  checkForPotentialLeaks(obj: unknown): string[] {
    const warnings: string[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return warnings;
    }

    // Check for large arrays
    if (Array.isArray(obj) && obj.length > 1000) {
      warnings.push(`Large array detected: ${obj.length} elements`);
    }

    // Check for objects with many properties
    if (typeof obj === 'object') {
      try {
        const keys = Object.keys(obj);
        if (keys.length > 100) {
          warnings.push(`Object with many properties: ${keys.length} keys`);
        }

        // Check for potential circular references in immediate properties
        for (const [key, value] of Object.entries(obj)) {
          if (value === obj) {
            warnings.push(`Direct circular reference found in property: ${key}`);
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return warnings;
  }
};