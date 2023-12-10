import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode, defaultOptions } from 'acorn';
import * as walk from 'acorn-walk';
import { Registry } from '../../internal/classes';
import { arrayExpressionVisitor, awaitVisitor, binaryExpressionVisitor,
  callExpressionVisitor,
  conditionalExpressionVisitor,
  identifierVisitor, literalVisitor, logicalExpressionVisitor, memberExpressionVisitor, popVisitorResult,
  thisExpressionVisitor, unaryExpressionVisitor } from '../../internal/visitors';
import { EvalContext, EvalOptions, EvalResult, EvalState } from '../classes';


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

  public parse(expression: string | AnyNode | undefined): AnyNode | undefined {
    if (!expression) {
      return undefined;
    } else if (typeof expression === 'string') {
      const ast = this.parserService.parse(expression, this.parserOptions);
      return ast;
    } else {
      return expression as AnyNode;
    }
  }

  public createContext(context?: EvalContext | Record<string, unknown> | Registry<string, unknown> | undefined,
                        options?: EvalOptions): EvalContext {
    const ctx = EvalContext.toContext(context, options);
    return ctx;
  }

  private createResult(expression: string | AnyNode | undefined,
    context: EvalContext): EvalResult {
    const result = new EvalResult(expression, context);
    return result;
  }

  private createState(expression: string | AnyNode | undefined,
                     ast: AnyNode | undefined,
                     context: EvalContext | undefined,
                     result: EvalResult,
                     options?: EvalOptions,
                     isAsync?: boolean): EvalState {
      const state = new EvalState(expression, ast, context, result, options, isAsync);
      return state;
  }

  eval(expression: string | AnyNode | undefined,
       context?: EvalContext | Record<string, unknown> | Registry<string, unknown> | undefined,
       options?: EvalOptions
  ): unknown | undefined {
    try {
      const ast = this.parse(expression);
      const ctx = this.createContext(context, options);
      const result = this.createResult(expression, ctx);
      const state = this.createState(expression, ast, ctx, result, options);
      const value = this.doEval(state);
      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

  evalAsync(expression: string | AnyNode | undefined,
       context?: EvalContext | Record<string, unknown> | Registry<string, unknown> | undefined,
       options?: EvalOptions
  ): Promise<unknown | undefined> {
    try {
      const ast = this.parse(expression);
      const ctx = this.createContext(context, options);
      const result = this.createResult(expression, ctx);
      const state = this.createState(expression, ast, ctx, result, options, true);
      const promise = this.doEvalAsync(state);
      return promise;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

  private doEval(state: EvalState): unknown | undefined {
    if (state.ast) {

      const visitors: walk.RecursiveVisitors<EvalState> = {};

      visitors['BinaryExpression'] = binaryExpressionVisitor;
      visitors['Identifier'] = identifierVisitor;
      visitors['Literal'] = literalVisitor;
      visitors['CallExpression'] = callExpressionVisitor;
      visitors['AwaitExpression'] = awaitVisitor;
      visitors['ConditionalExpression'] = conditionalExpressionVisitor;
      visitors['MemberExpression'] = memberExpressionVisitor;
      visitors['ArrayExpression'] = arrayExpressionVisitor;
      visitors['UnaryExpression'] = unaryExpressionVisitor;
      visitors['LogicalExpression'] = logicalExpressionVisitor;
      visitors['ThisExpression'] = thisExpressionVisitor;

      walk.recursive(state.ast, state, visitors);

      const value = popVisitorResult(state.ast, state)

      return value;
    }

    return undefined;
  }

  private doEvalAsync(state: EvalState): Promise<unknown | undefined> {
    const promise = new Promise<unknown | undefined>((resolve) => {
      const value = this.doEval(state);
      resolve(value);
    });
    return promise;
  }

}


