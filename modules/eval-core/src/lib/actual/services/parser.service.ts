import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { CacheType, ParserOptions } from '../../internal/interfaces';
import { Cache } from '../../internal/classes';
import { Expression, ModuleDeclaration, Program, Statement,
  defaultOptions, version as acornVersion, parse, AnyNode } from 'acorn';


@Injectable({
  providedIn: 'root'
})
export class ParserService extends BaseEval {

  private _cache?: CacheType<Program | AnyNode | Expression | undefined>;

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
   * Parses expression and returns ES6/ES2020 AST.
   * @param expr expression to parse
   */
  public parse(expr: string, options?: ParserOptions)
      : Program | AnyNode | Expression | undefined {
    if (expr) {
      try {
        const parserOptions = { ...this.parserOptions, ...options };
        const isCache = this.parserOptions.cacheSize && this._cache;
        const ast = isCache
          ? this.doCacheParse(expr, parserOptions)
          : this.doParse(expr, parserOptions);
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
  private doCacheParse(expr: string, options: ParserOptions) {
    if (this._cache) {
      const hashKey = this._cache.getHashKey('', expr);
      let ast = this._cache.get(hashKey);
      if (!ast) {
        ast = this.doParse(expr, options);
        this._cache.set(hashKey, ast);
      }
      return ast;
    }
    return undefined;
  }

  /**
 * @description
 * Parses expression and returns ES6/ES2020 AST.
 * @param expr expression to parse
 * @param options parser options
 */
  private doParse(expr: string, options: ParserOptions)
        : Program | AnyNode | undefined {
    const program: Program = parse(expr, options);
    if (!options.extractExpressions) {
      return program;
    }
    return this.extractExpression(program);
  }

  /**
   * @description
   * Walks through the AST and extracts first expression.
   * @param expr expression to parse
   */
  private extractExpression(program: Program)
          : Expression | undefined {

    if (program.body.length === 1) {
      const expression: Statement | ModuleDeclaration = program.body[0];
      if (expression.type === 'ExpressionStatement') {
        return expression.expression as Expression;
      }
    }

    return undefined;
  }

}
