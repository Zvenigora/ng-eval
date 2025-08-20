import { Injectable, OnDestroy } from '@angular/core';
import { CacheType, ParserOptions } from '../../internal/interfaces';
import { Cache } from '../../internal/classes/common';
import { Expression, Program,
  version as acornVersion, AnyNode } from 'acorn';
import { parse as _parse } from '../../internal/functions';
import { defaultParserOptions } from '../../internal/classes/eval';


/**
 * @description
 * Service for parsing expressions and returning ES6/ES2020 AST.
 * Implements OnDestroy for proper memory cleanup.
 */
@Injectable({
  providedIn: 'root'
})
export class ParserService implements OnDestroy {

  private _parserOptions!: ParserOptions;
  private _cache?: CacheType<Program | AnyNode | Expression | undefined>;
  private _cacheCleanupInterval?: ReturnType<typeof setInterval>;
  private _isDestroyed = false;

  /**
   * Gets the parser options.
   */
  get parserOptions(): ParserOptions {
    return this._parserOptions;
  }

  /**
   * Sets the parser options.
   * @param value The parser options to set.
   */
  set parserOptions(value: ParserOptions) {
    this._parserOptions = value;
  }

  /**
   * Constructs a new instance of the ParserService class.
   */
  constructor() {
    this.parserOptions = {
      ...defaultParserOptions,
      extractExpressions: true
    };
    if (this.parserOptions.cacheSize) {
      this._cache = new Cache<AnyNode>(this.parserOptions.cacheSize);
      
      // Set up periodic cache cleanup to prevent memory leaks
      this.setupCacheCleanup();
    }
  }

  /**
   * Setup periodic cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    if (this._cache && typeof setInterval !== 'undefined') {
      // Clean up cache every 5 minutes to prevent unbounded growth
      this._cacheCleanupInterval = setInterval(() => {
        if (!this._isDestroyed && this._cache) {
          // Keep cache size within bounds by clearing if it gets too large
          if (this._cache.size > this._cache.maxCacheSize * 0.8) {
            this._cache.clear();
            console.debug('Parser cache cleared to prevent memory leaks');
          }
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Clean up resources to prevent memory leaks
   */
  ngOnDestroy(): void {
    this._isDestroyed = true;
    
    if (this._cacheCleanupInterval) {
      clearInterval(this._cacheCleanupInterval);
      this._cacheCleanupInterval = undefined;
    }
    
    if (this._cache) {
      this._cache.clear();
      this._cache = undefined;
    }
  }

  /**
   * @description
   * Returns acorn version.
   */
  get version(): string {
    return acornVersion;
  }

  /**
   * Gets the parser options.
   * @returns The parser options.
   */
  get options(): ParserOptions {
    return this.parserOptions;
  }

  /**
   * @description
   * Parses expression and returns ES6/ES2023 AST.
   * @param expr expression to parse
   * @param options optional parser options
   * @returns The parsed AST (Abstract Syntax Tree).
   */
  public parse(expr: string, options?: ParserOptions)
      : Program | AnyNode | Expression | undefined {
    if (this._isDestroyed) {
      throw new Error('ParserService has been destroyed and cannot be used');
    }
    
    if (expr) {
      try {
        const parserOptions = { ...this.parserOptions, ...options };
        const isCache = this.parserOptions.cacheSize && this._cache;
        const ast = isCache
          ? this.fromCacheOrParse(expr, parserOptions)
          : _parse(expr, parserOptions);
        return ast;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        } else {
          throw error;
        }
      }
    }
    return undefined;
  }

  //#region Private methods
  private fromCacheOrParse(expr: string, options: ParserOptions) {
    if (this._cache) {
      const hashKey = this._cache.getHashKey('', expr);
      let ast = this._cache.get(hashKey);
      if (!ast) {
        ast = _parse(expr, options);
        this._cache.set(hashKey, ast);
      }
      return ast;
    }
    return undefined;
  }
  //#endregion
}
