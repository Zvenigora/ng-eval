import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode } from 'acorn';
import { Context } from '../../internal/classes/common';
import { EvalContext, EvalOptions, EvalState, defaultParserOptions } from '../../internal/classes/eval';
import { evaluate, evaluateAsync } from '../../internal/functions';

/**
 * Service for evaluating and parsing expressions.
 */
@Injectable({
  providedIn: 'root'
})
export class EvalService extends BaseEval {

  /**
   * Constructs a new instance of the EvalService class.
   * @param parserService The parser service used for parsing expressions.
   */
  constructor(
    public parserService: ParserService
  ) {
    super();
    this.parserOptions = defaultParserOptions;
  }

  /**
   * Parses the given expression into an abstract syntax tree (AST).
   * @param expression The expression to parse.
   * @returns The AST representing the expression.
   */
  private parse(expression: string | AnyNode | undefined): AnyNode | undefined {
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
  simpleEval(expression: string | AnyNode | undefined,
             context?: EvalContext | Context,
             options?: EvalOptions
  ): unknown | undefined {
    try {
      const ast = this.parse(expression);
      const state = EvalState.fromContext(context, options);
      const value = evaluate(ast, state);
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
  simpleEvalAsync(expression: string | AnyNode | undefined,
                  context?: EvalContext | Context,
                  options?: EvalOptions
  ): Promise<unknown | undefined> {
    try {
      const ast = this.parse(expression);
      const state = EvalState.fromContext(context, options);
      const promise = evaluateAsync(ast, state);
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


