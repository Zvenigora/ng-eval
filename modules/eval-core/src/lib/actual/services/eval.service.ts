import { Injectable, OnDestroy, inject } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode } from 'acorn';
import { Context, Registry } from '../../internal/classes/common';
import { EvalContext, EvalOptions, EvalState, defaultParserOptions } from '../../internal/classes/eval';
import { evaluate, evaluateAsync } from '../../internal/functions';

/**
 * Service for evaluating and parsing expressions with proper memory management.
 */
@Injectable({
  providedIn: 'root'
})
export class EvalService extends BaseEval implements OnDestroy {
  private _isDestroyed = false;
  private _activeContexts = new Set<Context>();
  private _activeStates = new Set<EvalState>();

  protected override parserService = inject(ParserService);

  /**
   * Constructs a new instance of the EvalService class.
   */
  constructor() {
    super(inject(ParserService));
    this.parserOptions = defaultParserOptions;
  }

  /**
   * Override createState to track active contexts and states for cleanup
   */
  override createState(context?: EvalContext | Context, options?: EvalOptions): EvalState {
    if (this._isDestroyed) {
      throw new Error('EvalService has been destroyed and cannot be used');
    }
    
    const state = super.createState(context, options);
    
    // Track active states for cleanup
    this._activeStates.add(state);
    
    // Track active contexts
    if (context && typeof context === 'object') {
      // Check if it's a Registry-based context (has type property)
      if ('type' in context) {
        this._activeContexts.add(context as Registry<unknown, unknown>);
      }
      // For EvalContext, check if it has a nested context using bracket notation
      if ('context' in context) {
        const nestedContext = (context as Record<string, unknown>)['context'];
        if (nestedContext && typeof nestedContext === 'object' && 'type' in nestedContext) {
          this._activeContexts.add(nestedContext as Registry<unknown, unknown>);
        }
      }
    }
    
    return state;
  }

  /**
   * Clean up resources to prevent memory leaks
   */
  ngOnDestroy(): void {
    this._isDestroyed = true;
    
    // Clean up all active states
    for (const state of this._activeStates) {
      try {
        // Clear the stack in the result
        if (state.result?.stack) {
          state.result.stack.clear();
        }
        // Clear context if it has a clear method
        if (state.context && typeof state.context === 'object' && 'clear' in state.context && typeof state.context.clear === 'function') {
          (state.context as unknown as { clear(): void }).clear();
        }
        // Drop hook registrations so a long-lived closure cannot pin a
        // destroyed state. This matters most for a registry the caller passed
        // through `options.hooks` and still holds: one that outlives the
        // service keeps every state its closures captured reachable. A
        // state-owned registry would die with its state regardless.
        //
        // Guarded on `hasHooks` rather than reading `state.hooks`, because that
        // getter builds a registry on first access - allocating inside the
        // method whose job is releasing memory. The guard is exact for this
        // purpose: it is false only when no hook is registered, and clearing an
        // empty registry does nothing.
        if (state.hasHooks) {
          state.hooks.clear();
        }
        // Bookkeeping lives on the state and `clear` cannot reach it, so the
        // open-node stack and collected errors need dropping separately.
        state.resetHookBookkeeping();
      } catch (error) {
        console.warn('Error cleaning up EvalState:', error);
      }
    }
    this._activeStates.clear();
    
    // Clean up all active contexts
    for (const context of this._activeContexts) {
      try {
        if (context && typeof context.clear === 'function') {
          context.clear();
        }
      } catch (error) {
        console.warn('Error cleaning up Context:', error);
      }
    }
    this._activeContexts.clear();
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
      if (state?.result && typeof expression === 'string') {
        state.result.expression = expression;
      }
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
      if (state?.result && typeof expression === 'string') {
        state.result.expression = expression;
      }
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
      if (state?.result && typeof expression === 'string') {
        state.result.expression = expression;
      }
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
      if (state?.result && typeof expression === 'string') {
        state.result.expression = expression;
      }
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


