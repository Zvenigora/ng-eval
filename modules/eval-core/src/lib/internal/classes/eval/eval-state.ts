import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';
import { EvalResult } from './eval-result';
import { Context } from '../common';

/**
 * Represents the evaluation state, which includes the context, result, and options.
 */
export class EvalState {
  private _context: EvalContext | undefined;
  private _result: EvalResult;
  private _options: EvalOptions | undefined;
  private _isAsync: boolean | undefined;

  /**
   * Gets the evaluation context.
   */
  public get context(): EvalContext | undefined {
    return this._context;
  }

  /**
   * Gets the evaluation result.
   */
  public get result(): EvalResult {
    return this._result;
  }

  /**
   * Gets the evaluation options.
   */
  public get options(): EvalOptions | undefined {
    return this._options;
  }

  /**
   * Gets whether the evaluation is asynchronous.
   */
  public get isAsync(): boolean | undefined {
    return this._isAsync;
  }

  /**
   * Represents the state of an evaluation.
   * @param context The evaluation context.
   * @param result The evaluation result.
   * @param options The evaluation options.
   * @param isAsync Indicates whether the evaluation is asynchronous.
   */
  constructor(context: EvalContext | undefined,
    result: EvalResult,
    options?: EvalOptions,
    isAsync?: boolean) {

    this._context = context;
    this._result = result;
    this._options = options;
    this._isAsync = isAsync;
  }

  /**
   * Creates an instance of EvalState from a given context, options, and async flag.
   *
   * @param context - The evaluation context or context object.
   * @param options - The evaluation options.
   * @param isAsync - A flag indicating whether the evaluation is asynchronous.
   * @returns The created EvalState instance.
   */
  static fromContext(context?: EvalContext | Context,
                     options?: EvalOptions,
                     isAsync?: boolean): EvalState {

    const ctx = EvalContext.fromContext(context, options);
    const result = new EvalResult(ctx);
    const state = new EvalState(ctx, result, options, isAsync);
    return state;
  }

}
