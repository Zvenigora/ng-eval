import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserOptions } from '../../internal/interfaces';
import { Expression, ModuleDeclaration, Program, Statement,
  defaultOptions, version as acornVersion, parse, AnyNode } from 'acorn';


@Injectable({
  providedIn: 'root'
})
export class ParserService extends BaseEval {

  constructor() {
    super();
    this.parserOptions = {
      ...defaultOptions,
      ecmaVersion: 2020,
      extractExpressions: true,
      cacheSize: undefined
    };
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
        const ast = this.doParse(expr, parserOptions);
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
