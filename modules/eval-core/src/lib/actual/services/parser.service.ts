import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { CacheType, ParserOptions } from '../../internal/interfaces';
import { Cache } from '../../internal/classes/common';
import { Expression, Program,
  defaultOptions, version as acornVersion, AnyNode } from 'acorn';
import { parse as _parse } from '../../internal/functions';


/**
 * @description
 * Service for parsing expressions and returning ES6/ES2020 AST.
 */
@Injectable({
  providedIn: 'root'
})
export class ParserService extends BaseEval {

  private _cache?: CacheType<Program | AnyNode | Expression | undefined>;

  /**
   * Constructs a new instance of the ParserService class.
   */
  constructor() {
    super();
    this.parserOptions = {
      ...defaultOptions,
      ecmaVersion: 2020,
      extractExpressions: true,
      cacheSize: 100
    };
    if (this.parserOptions.cacheSize) {
      this._cache = new Cache<AnyNode>(this.parserOptions.cacheSize);
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
