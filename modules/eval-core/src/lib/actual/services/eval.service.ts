import { Injectable, OnDestroy, inject } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode } from 'acorn';
import { Context } from '../../internal/classes/common';
import { EvalContext, EvalOptions, EvalState, defaultParserOptions } from '../../internal/classes/eval';
import { evaluate, evaluateAsync } from '../../internal/functions';

/**
 * Service for evaluating and parsing expressions.
 *
 * It keeps no reference to anything you pass it or anything it hands back: a
 * state from `createState`, its context and an `options.hooks` registry are
 * yours, and are collectable once you drop them (`docs/backlog.md` A8).
 */
@Injectable({
  providedIn: 'root'
})
export class EvalService extends BaseEval implements OnDestroy {
  private _isDestroyed = false;

  protected override parserService = inject(ParserService);

  /**
   * Constructs a new instance of the EvalService class.
   */
  constructor() {
    super(inject(ParserService));
    this.parserOptions = defaultParserOptions;
  }

  /**
   * Builds a state for `eval` / `evalAsync`. The service does not keep it:
   * the state is yours, and so are its context and any `options.hooks`
   * registry it adopted (`docs/backlog.md` A8, A20). Nothing the service does
   * later, `ngOnDestroy` included, reaches it.
   */
  override createState(context?: EvalContext | Context, options?: EvalOptions): EvalState {
    if (this._isDestroyed) {
      throw new Error('EvalService has been destroyed and cannot be used');
    }

    return super.createState(context, options);
  }

  /**
   * Marks the service destroyed, so that `createState`, `simpleEval` and
   * `simpleEvalAsync` throw from then on. It releases and changes nothing
   * else: the service holds no state, context or registry to release. Clear
   * a registry you passed through `options.hooks` in your own teardown, with
   * the unsubscribe `on` / `onRead` returned or `hooks.clear()`
   * (`docs/backlog.md` A8).
   */
  ngOnDestroy(): void {
    this._isDestroyed = true;
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
    // No `catch`: an error leaves this method as it was thrown, class, `cause`
    // and properties intact. Each entry point here and in the other services
    // used to raise a bare `Error` carrying only the message in its place
    // (`docs/backlog-retired.md` A5).
    const ast = this.parse(expression);
    // Through `createState`, which a subclass may override, rather than a
    // private builder (`docs/a8/plan.md` § 2.1).
    const state = this.createState(context, options);
    if (state?.result && typeof expression === 'string') {
      state.result.expression = expression;
    }
    const value = evaluate(ast, state);
    return value;
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
    const ast = this.parse(expression);
    if (state?.result && typeof expression === 'string') {
      state.result.expression = expression;
    }
    const value = evaluate(ast, state);
    return value;
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
    const ast = this.parse(expression);
    // As in `simpleEval`. The pending frame holds the state for as long as
    // the promise it awaits is reachable, and nothing else does.
    const state = this.createState(context, options);
    if (state?.result && typeof expression === 'string') {
      state.result.expression = expression;
    }
    const promise = evaluateAsync(ast, state);
    return promise;
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
    const ast = this.parse(expression);
    if (state?.result && typeof expression === 'string') {
      state.result.expression = expression;
    }
    const promise = evaluateAsync(ast, state);
    return promise;
  }

}


