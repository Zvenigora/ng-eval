import { AnyNode } from 'acorn';
import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';
import { EvalResult } from './eval-result';

/**
 * Represents the evaluation state, which includes the context, result, and options.
 */
export class EvalState {
  private _expression: string | AnyNode | undefined;
  private _ast: Readonly<AnyNode | undefined>;
  private _context: Readonly<EvalContext | undefined>;
  private _result: Readonly<EvalResult>;
  private _options: Readonly<EvalOptions | undefined>;
  private _isAsync: Readonly<boolean | undefined>;

  /**
   * Gets the expression.
   */
  public get expression(): Readonly<string | AnyNode | undefined> {
    return this._expression;
  }

  /**
   * Gets the abstract syntax tree (AST) of the evaluation state.
   * @returns The AST of the evaluation state, or undefined if it is not set.
   */
  public get ast(): Readonly<AnyNode | undefined> {
    return this._ast;
  }

  /**
   * Gets the evaluation context.
   */
  public get context(): Readonly<EvalContext | undefined> {
    return this._context;
  }

  /**
   * Gets the evaluation result.
   */
  public get result(): Readonly<EvalResult> {
    return this._result;
  }

  /**
   * Gets the evaluation options.
   */
  public get options(): Readonly<EvalOptions | undefined> {
    return this._options;
  }

  /**
   * Gets whether the evaluation is asynchronous.
   */
  public get isAsync(): Readonly<boolean | undefined> {
    return this._isAsync;
  }

  constructor(expression: string | AnyNode | undefined,
    ast: AnyNode | undefined,
    context: EvalContext | undefined,
    result: EvalResult,
    options?: EvalOptions,
    isAsync?: boolean) {

    this._expression = expression;
    this._ast = ast;
    this._context = context;
    this._result = result;
    this._options = options;
    this._isAsync = isAsync;
  }

}
