import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode, defaultOptions } from 'acorn';
import { Context } from '../../internal/classes/common';
import { EvalContext, EvalOptions, EvalResult, EvalState } from '../../internal/classes/eval';
import { doEval, doEvalAsync } from '../../internal/functions';

/**
 * Service for evaluating and parsing expressions.
 */
@Injectable({
  providedIn: 'root'
})
export class EvalService extends BaseEval {

  constructor(
    public parserService: ParserService
  ) {
    super();
    this.parserOptions = {
      ...defaultOptions,
      ecmaVersion: 2020,
      extractExpressions: false,
      cacheSize: 100
    };
  }

  /**
   * Parses the given expression into an abstract syntax tree (AST).
   * @param expression The expression to parse.
   * @returns The AST representing the expression.
   */
  parse(expression: string | AnyNode | undefined): AnyNode | undefined {
    if (!expression) {
      return undefined;
    } else if (typeof expression === 'string') {
      const ast = this.parserService.parse(expression, this.parserOptions);
      return ast;
    } else {
      return expression as AnyNode;
    }
  }

  /**
   * Evaluates the given expression.
   * @param expression The expression to evaluate.
   * @param context The evaluation context.
   * @param options The evaluation options.
   * @returns The result of the evaluation.
   */
  eval(expression: string | AnyNode | undefined,
       context?: EvalContext | Context,
       options?: EvalOptions
  ): unknown | undefined {
    try {
      const ast = this.parse(expression);
      const ctx = EvalContext.fromContext(context, options);
      const result = new EvalResult(expression, ctx);
      const state = new EvalState(expression, ast, ctx, result, options);
      const value = doEval(ast, state);
      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

  /**
   * Asynchronously evaluates the given expression.
   * @param expression The expression to evaluate.
   * @param context The evaluation context.
   * @param options The evaluation options.
   * @returns A promise that resolves to the result of the evaluation.
   */
  evalAsync(expression: string | AnyNode | undefined,
       context?: EvalContext | Context,
       options?: EvalOptions
  ): Promise<unknown | undefined> {
    try {
      const ast = this.parse(expression);
      const ctx = EvalContext.fromContext(context, options);
      const result = new EvalResult(expression, ctx);
      const state = new EvalState(expression, ast, ctx, result, options, true);
      const promise = doEvalAsync(ast, state);
      return promise;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

}


