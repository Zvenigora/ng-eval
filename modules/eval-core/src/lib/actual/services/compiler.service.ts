import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { EvalService } from './eval.service';
import { EvalContext, EvalOptions, EvalState } from '../../internal/classes/eval';
import { Context } from '../../internal/classes/common';
import { AnyNode, defaultOptions } from 'acorn';
import { doCall, doCallAsync, doCompile, doCompileAsync,
  stateCallback, stateCallbackAsync } from '../../internal/functions';

/**
 * CompilerService class that extends BaseEval.
 * Provides methods for compiling and evaluating expressions.
 */
@Injectable({
  providedIn: 'root'
})
export class CompilerService extends BaseEval {

  constructor(
    public parserService: ParserService,
    public evalService: EvalService
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
   * @param expression - The expression to parse.
   * @returns The parsed AST.
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
   * Compiles the given expression into a state callback function.
   * @param expression - The expression to compile.
   * @returns The compiled state callback function.
   * @throws Error if there is an error during compilation.
   */
  compile(expression: string | AnyNode | undefined): stateCallback | undefined {
    try {
      const ast = this.parse(expression);
      const fn = doCompile(ast);
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
  call(fn: stateCallback | undefined, context?: EvalContext | Context, options?: EvalOptions) {
    if (fn) {
      try {
        const state = EvalState.fromContext(context, options);
        const value = doCall(fn, state);
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
   * Calls the given asynchronous state callback function with the specified context and options.
   * @param fn - The asynchronous state callback function to call.
   * @param context - The evaluation context or context object.
   * @param options - The evaluation options.
   * @returns A promise that resolves to the result of the evaluation.
   * @throws Error if there is an error during the evaluation.
   */
  async callAsync(fn: stateCallbackAsync | undefined, context?: EvalContext | Context, options?: EvalOptions) {
    if (fn) {
      try {
        const state = EvalState.fromContext(context, options);
        const promise = doCallAsync(fn, state);
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
   * Compiles the given expression into an asynchronous state callback function.
   * @param expression - The expression to compile.
   * @returns The compiled asynchronous state callback function.
   * @throws Error if there is an error during compilation.
   */
  compileAsync(expression: string | AnyNode | undefined): stateCallbackAsync | undefined {
    try {
      const ast = this.parse(expression);
      const fn = doCompileAsync(ast);
      return fn;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('error in compileAsync');
    }
  }

}
