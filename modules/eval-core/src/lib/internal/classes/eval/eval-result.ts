import { Registry, Stack } from "../common";
import { EvalContext } from "./eval-context";
import { EvalOptions } from "./eval-options";

type UnknownValue = unknown | Promise<unknown>;

/**
 * Represents the result of an evaluation.
 */
export class EvalResult {

  private _stack: Readonly<Stack<UnknownValue>>;
  private _value?: UnknownValue;
  private _error?: unknown;
  private _errorMessage?: string;
  private _isError?: boolean;
  private _isSuccess?: boolean;
  private _isUndefined?: boolean;
  private _trace: Readonly<Registry<unknown, UnknownValue>>;
  private _context: EvalContext;
  private _startDate?: number;
  private _endDate?: number;

  /**
   * Gets the stack of evaluated values.
   */
  public get stack(): Readonly<Stack<UnknownValue>> {
    return this._stack;
  }

  /**
   * Gets the evaluated value.
   */
  public get value(): UnknownValue | undefined {
    return this._value;
  }

  /**
   * Gets the error that occurred during evaluation.
   */
  public get error(): unknown | undefined {
    return this._error;
  }

  /**
   * Gets the error message associated with the evaluation error.
   */
  public get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  /**
   * Gets whether the evaluation resulted in an error.
   */
  public get isError(): boolean | undefined {
    return this._isError;
  }

  /**
   * Gets whether the evaluation was successful.
   */
  public get isSuccess(): boolean | undefined {
    return this._isSuccess;
  }

  /**
   * Gets whether the evaluated value is undefined.
   */
  public get isUndefined(): boolean | undefined {
    return this._isUndefined;
  }

  /**
   * Gets the trace of evaluated values.
   */
  public get trace(): Readonly<Registry<unknown, UnknownValue>> {
    return this._trace;
  }

  /**
   * Gets the evaluation context.
   */
  public get context(): EvalContext {
    return this._context;
  }

  /**
   * Gets the evaluation options.
   */
  public get options(): EvalOptions {
    return this._context.options;
  }

  /**
   * Gets the duration of the evaluation result.
   * @returns The duration in milliseconds.
   */
  public get duration(): number | undefined {
    if (!this._startDate || !this._endDate) {
      return undefined;
    }
    return this._endDate - this._startDate;
  }

  /**
   * Creates a new instance of EvalResult.
   * @param trace The trace of evaluated values.
   * @param context The evaluation context.
   */
  constructor(context: EvalContext) {

    this._stack = new Stack<UnknownValue>();
    this._trace = new Registry<unknown, UnknownValue>;
    this._context = context;
  }

  /**
   * Starts the evaluation process.
   */
  public start(): void {
    this._startDate = performance.now();
  }

  /**
   * Stops the evaluation and records the end date.
   */
  public stop(): number | undefined {
    this._endDate = performance.now();
    return this.duration;
  }
}
