import { Injectable, OnDestroy } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { EvalService } from './eval.service';
import { EvalContext, EvalOptions, EvalState, defaultParserOptions } from '../../internal/classes/eval';
import { Context } from '../../internal/classes/common';
import { AnyNode } from 'acorn';
import { call as _call, callAsync as _callAsync,
  compile as _compile, compileAsync as _compileAsync,
  stateCallback, stateCallbackAsync } from '../../internal/functions';

/**
 * Interface for cached compilation result
 */
interface CachedCompilation {
  sync?: stateCallback;
  async?: stateCallbackAsync;
  timestamp: number;
  accessCount: number;
}

/**
 * CompilerService class that extends BaseEval.
 * Provides methods for compiling and evaluating expressions with performance caching.
 */
@Injectable({
  providedIn: 'root'
})
export class CompilerService extends BaseEval implements OnDestroy {
  
  // Compilation cache with LRU eviction
  private readonly _compilationCache = new Map<string, CachedCompilation>();
  private readonly _maxCacheSize = 200;
  private readonly _cacheTTL = 10 * 60 * 1000; // 10 minutes
  private readonly _accessOrder = new Set<string>();
  private _cacheCleanupInterval?: ReturnType<typeof setInterval>;
  private _isDestroyed = false;

  constructor(
    protected override parserService: ParserService,
    protected evalService: EvalService
  ) {
    super(parserService);
    this.parserOptions = defaultParserOptions;
    this.setupCacheCleanup();
  }

  /**
   * OnDestroy lifecycle hook for cleanup
   */
  ngOnDestroy(): void {
    this._isDestroyed = true;
    if (this._cacheCleanupInterval) {
      clearInterval(this._cacheCleanupInterval);
    }
    this._compilationCache.clear();
    this._accessOrder.clear();
  }

  /**
   * Setup periodic cache cleanup to prevent memory leaks and stale entries
   */
  private setupCacheCleanup(): void {
    if (typeof setInterval !== 'undefined') {
      this._cacheCleanupInterval = setInterval(() => {
        if (!this._isDestroyed) {
          this.cleanupCache();
        }
      }, 5 * 60 * 1000); // Clean every 5 minutes
    }
  }

  /**
   * Clean expired entries and enforce cache size limits
   */
  private cleanupCache(): void {
    const now = performance.now();
    const toDelete: string[] = [];
    
    // Remove expired entries
    for (const [key, cached] of this._compilationCache) {
      if (now - cached.timestamp > this._cacheTTL) {
        toDelete.push(key);
      }
    }
    
    // Remove expired entries
    toDelete.forEach(key => {
      this._compilationCache.delete(key);
      this._accessOrder.delete(key);
    });
    
    // Enforce cache size limit using LRU
    while (this._compilationCache.size > this._maxCacheSize) {
      const oldestKey = Array.from(this._accessOrder)[0];
      if (oldestKey) {
        this._compilationCache.delete(oldestKey);
        this._accessOrder.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Generate cache key for expression
   */
  private generateCacheKey(expression: string | AnyNode | undefined): string {
    if (typeof expression === 'string') {
      return `str:${expression}`;
    } else if (expression && typeof expression === 'object') {
      // Use a simplified hash for AST nodes to avoid deep serialization overhead
      return `ast:${expression.type}:${JSON.stringify({
        type: expression.type,
        start: expression.start,
        end: expression.end
      })}:${expression.toString()}`;
    }
    return 'undefined';
  }

  /**
   * Update access order for LRU cache
   */
  private updateAccessOrder(key: string): void {
    this._accessOrder.delete(key);
    this._accessOrder.add(key);
  }

  /**
   * Compiles the given expression into a state callback function with caching.
   * @param expression - The expression to compile.
   * @returns The compiled state callback function.
   * @throws Error if there is an error during compilation.
   */
  compile(expression: string | AnyNode | undefined): stateCallback | undefined {
    try {
      const cacheKey = this.generateCacheKey(expression);
      
      // Check cache first
      const cached = this._compilationCache.get(cacheKey);
      if (cached?.sync) {
        // Update access order for LRU
        this.updateAccessOrder(cacheKey);
        cached.accessCount++;
        
        // Check if entry is still fresh
        const age = performance.now() - cached.timestamp;
        if (age < this._cacheTTL) {
          return cached.sync;
        }
      }
      
      // Compile fresh
      const ast = this.parse(expression);
      const fn = _compile(ast);
      
      if (fn) {
        // Cache the result
        const existingCache = this._compilationCache.get(cacheKey) || {
          timestamp: performance.now(),
          accessCount: 0
        };
        
        existingCache.sync = fn;
        existingCache.timestamp = performance.now();
        existingCache.accessCount++;
        
        this._compilationCache.set(cacheKey, existingCache);
        this.updateAccessOrder(cacheKey);
        
        // Cleanup if cache is getting too large
        if (this._compilationCache.size > this._maxCacheSize * 1.2) {
          this.cleanupCache();
        }
      }
      
      return fn;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('error in compile');
    }
  }

  /**
   * Calls the given state callback function with the specified context and options.
   * @param fn - The state callback function to call.
   * @param context - The evaluation context or context object.
   * @param options - The evaluation options.
   * @returns The result of the evaluation.
   * @throws Error if there is an error during the evaluation.
   */
  simpleCall(fn: stateCallback | undefined,
             context?: EvalContext | Context,
             options?: EvalOptions) {
    if (fn) {
      try {
        const state = this.createState(context, options);
        const value = _call(fn, state);
        return value;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        } else {
          throw new Error('call');
        }
      }
    }
    return undefined;
  }


  /**
   * Calls the provided function with the given state.
   *
   * @param fn - The function to be called.
   * @param state - The state to be passed to the function.
   * @returns The value returned by the function.
   * @throws If an error occurs during the function call.
   */
  call(fn: stateCallback | undefined,
       state: EvalState) {
    if (fn) {
      try {
        const value = _call(fn, state);
        return value;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        } else {
          throw new Error('call');
        }
      }
    }
    return undefined;
  }

  /**
   * Compiles the given expression into an asynchronous state callback function with caching.
   * @param expression - The expression to compile.
   * @returns The compiled asynchronous state callback function.
   * @throws Error if there is an error during compilation.
   */
  compileAsync(expression: string | AnyNode | undefined): stateCallbackAsync | undefined {
    try {
      const cacheKey = this.generateCacheKey(expression);
      
      // Check cache first
      const cached = this._compilationCache.get(cacheKey);
      if (cached?.async) {
        // Update access order for LRU
        this.updateAccessOrder(cacheKey);
        cached.accessCount++;
        
        // Check if entry is still fresh
        const age = performance.now() - cached.timestamp;
        if (age < this._cacheTTL) {
          return cached.async;
        }
      }
      
      // Compile fresh
      const ast = this.parse(expression);
      const fn = _compileAsync(ast);
      
      if (fn) {
        // Cache the result
        const existingCache = this._compilationCache.get(cacheKey) || {
          timestamp: performance.now(),
          accessCount: 0
        };
        
        existingCache.async = fn;
        existingCache.timestamp = performance.now();
        existingCache.accessCount++;
        
        this._compilationCache.set(cacheKey, existingCache);
        this.updateAccessOrder(cacheKey);
        
        // Cleanup if cache is getting too large
        if (this._compilationCache.size > this._maxCacheSize * 1.2) {
          this.cleanupCache();
        }
      }
      
      return fn;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('error in compileAsync');
    }
  }

  /**
   * Calls the given asynchronous state callback function with the specified context and options.
   * @param fn - The asynchronous state callback function to call.
   * @param context - The evaluation context or context object.
   * @param options - The evaluation options.
   * @returns A promise that resolves to the result of the evaluation.
   * @throws Error if there is an error during the evaluation.
   */
  async simpleCallAsync(fn: stateCallbackAsync | undefined,
                        context?: EvalContext | Context,
                        options?: EvalOptions) {
    if (fn) {
      try {
        const state = this.createState(context, options);
        const promise = _callAsync(fn, state);
        const value = await promise;
        return value;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('error in callAsync');
      }
    }
    return undefined;
  }


  /**
   * Calls the provided asynchronous function with the given state.
   *
   * @param fn - The asynchronous function to call.
   * @param state - The state to pass to the function.
   * @returns A promise that resolves to the value returned by the function.
   * @throws If an error occurs during the function call.
   */
  async callAsync(fn: stateCallbackAsync | undefined,
                  state: EvalState) {
    if (fn) {
      try {
        const promise = _callAsync(fn, state);
        const value = await promise;
        return value;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('error in callAsync');
      }
    }
    return undefined;
  }

}
