import { Injectable } from '@angular/core';
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
 * CompilerService class that extends BaseEval.
 * Provides methods for compiling and evaluating expressions.
 */
@Injectable({
  providedIn: 'root'
})
export class CompilerService extends BaseEval {

  constructor(
    protected override parserService: ParserService,
    protected evalService: EvalService
  ) {
    super(parserService);
    this.parserOptions = defaultParserOptions;
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
      const fn = _compile(ast);
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
        const state = EvalState.fromContext(context, options);
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
        const state = EvalState.fromContext(context, options);
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
   * Compiles the given expression into an asynchronous state callback function.
   * @param expression - The expression to compile.
   * @returns The compiled asynchronous state callback function.
   * @throws Error if there is an error during compilation.
   */
  compileAsync(expression: string | AnyNode | undefined): stateCallbackAsync | undefined {
    try {
      const ast = this.parse(expression);
      const fn = _compileAsync(ast);
      return fn;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('error in compileAsync');
    }
  }

}
