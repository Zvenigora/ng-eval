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
    protected override parserService: ParserService
  ) {
    super(parserService);
    this.parserOptions = defaultParserOptions;
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
      const state = this.createState(context, options);
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
   * Evaluates an expression using the provided state.
   *
   * @param expression - The expression to evaluate.
   * @param state - The state object containing variables and functions used in the evaluation.
   * @returns The result of the evaluation.
   * @throws If an error occurs during evaluation.
   */
  eval(expression: string | AnyNode | undefined,
       state: EvalState
  ): unknown | undefined {
    try {
      const ast = this.parse(expression);
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
      const state = this.createState(context, options);
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

  /**
   * Asynchronously evaluates an expression using the provided state.
   *
   * @param expression - The expression to evaluate. Can be a string or an AST node.
   * @param state - The evaluation state.
   * @returns A promise that resolves to the result of the evaluation.
   * @throws If an error occurs during evaluation.
   */
  evalAsync(expression: string | AnyNode | undefined,
            state: EvalState
  ): Promise<unknown | undefined> {
    try {
      const ast = this.parse(expression);
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


