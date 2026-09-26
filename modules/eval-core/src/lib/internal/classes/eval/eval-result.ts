import { AnyNode } from "acorn";
import { Stack } from "../common";
import { EvalContext } from "./eval-context";
import { EvalOptions } from "./eval-options";
import { EvalTrace } from "./eval-trace";

type UnknownValue = unknown | Promise<unknown>;

/**
 * Represents the result of an evaluation.
 */
export class EvalResult {

  private _stack: Stack<UnknownValue>;
  private _value?: UnknownValue;
  private _error?: unknown;
  private _errorMessage?: string;
  private _isError?: boolean;
  private _isSuccess?: boolean;
  private _isUndefined?: boolean;
  private _trace: EvalTrace;
  private _tracePushCount = 0;
  private _traceTruncated = false;
  private _context: EvalContext;
  private _startDate?: number;
  private _endDate?: number;
  private _expression?: string;

  /**
   * Gets the stack of evaluated values.
   */
  public get stack(): Stack<UnknownValue> {
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
  public get trace(): EvalTrace {
    return this._trace;
  }

  /**
   * Whether {@link trace} stopped short of everything this state pushed,
   * because `options.maxTraceItems` was reached.
   *
   * **Latches.** Once true it stays true until {@link clearTrace}, however many
   * evaluations run in between, because the trace does: it spans every
   * evaluation run on this result, so a flag that cleared per walk would
   * describe a different array than the one beside it.
   *
   * False under `maxTraceItems: 0`, which is a caller asking for no trace
   * rather than a trace that lost something.
   */
  public get traceTruncated(): boolean {
    return this._traceTruncated;
  }

  /**
   * How many values were pushed for tracing since this result was built or last
   * cleared by {@link clearTrace} - which is what {@link trace} no longer tells
   * you once {@link traceTruncated} is set.
   *
   * Counts pushes, not entries kept, so it goes on rising past the bound, and
   * it stays accurate under `maxTraceItems: 0` - a caller who disabled tracing
   * for the allocation still gets the walk-size figure.
   */
  public get tracePushCount(): number {
    return this._tracePushCount;
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
   * Gets the expression associated with the evaluation result.
   * @returns The expression as a string, or undefined if no expression is associated.
   */
  public get expression(): string | undefined {
    return this._expression;
  }

  /**
   * Sets the expression for the evaluation result.
   *
   * @param value - The expression to be set.
   */
  public set expression(value: string | undefined) {
    this._expression = value;
  }

  /**
   * Creates a new instance of EvalResult.
   * @param trace The trace of evaluated values.
   * @param context The evaluation context.
   */
  constructor(context: EvalContext) {

    this._stack = new Stack<UnknownValue>();
    this._trace = new EvalTrace();
    this._context = context;
  }

  /**
   * Records one traced push against `limit`, adding it to {@link trace} only
   * while there is room.
   *
   * **The bound is the caller's, and that is the point.** `limit` arrives from
   * `EvalState.maxTraceItems` - the *walk's* options - because this object
   * cannot read them: {@link options} returns `this._context.options`, and a
   * context can be handed to any number of evaluations carrying options none
   * of them used. Reading the bound here would reproduce the split `CLAUDE.md`
   * documents for `caseInsensitive`.
   *
   * One call, replacing the bare `trace.add` the push helpers made before, so
   * the guarded path costs an increment and a comparison rather than a second
   * call per node. `_traceTruncated` is written rather than tested-then-written
   * for the same reason: it is idempotent, and a write is cheaper than a read
   * and a branch on a path a runaway loop takes hundreds of thousands of times.
   *
   * @internal Not part of the published API.
   */
  public addTraceBounded(node: AnyNode, value: unknown, limit: number): void {
    this._tracePushCount++;

    if (this._trace.length >= limit) {
      // `limit` 0 is tracing turned off, not a trace that lost something.
      if (limit > 0) {
        this._traceTruncated = true;
      }
      return;
    }

    this._trace.add(node, value, this._expression);
  }

  /**
   * Empties {@link trace} and resets {@link traceTruncated} and
   * {@link tracePushCount} - the only reset any of the three has.
   *
   * **For the caller who reuses one state.** The trace spans every evaluation
   * run on this result rather than restarting per walk, which is deliberate
   * (`docs/backlog.md` A15) and is what `options.maxTraceItems` bounds.
   * A caller using the `createState` + repeated `eval` style who wants the
   * trace to describe only the walk they just ran calls this before each one.
   *
   * **The array is emptied in place, not replaced.** {@link trace} has always
   * returned the same instance for the life of the result, so a consumer
   * holding it - `const t = state.result.trace` - keeps a live reference
   * across this call rather than a stale snapshot.
   *
   * That is the **opposite** of `EvalState.resetHookBookkeeping`, which
   * replaces its record rather than emptying it so as not to mutate a
   * collection the caller holds a reference to - and both are right for their
   * own goal, which is why this says so rather than leaving a reader to find
   * one of them and read the other as a slip. Emptying in place is what
   * *releases* memory a caller-held array would otherwise pin, and that is the
   * whole of A12; replacing here would leave the old array, and every value in
   * it, alive in the caller's hand.
   *
   * Leaves {@link expression} alone: that is one string replaced per
   * evaluation, not an accumulator.
   */
  public clearTrace(): void {
    this._trace.length = 0;
    this._tracePushCount = 0;
    this._traceTruncated = false;
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

  /**
   * Sets the success value of the evaluation result.
   *
   * @param value The value to set as the success value.
   * @returns void
   */
  public setSuccess(value: UnknownValue): void {
    this._value = value;
    this._isSuccess = true;
    this._isError = false;
    this._isUndefined = false;
  }

  /**
   * Sets the failure state of the evaluation result.
   * @param error The error object associated with the failure.
   */
  public setFailure(error: unknown): void {
    this._error = error;
    if (error instanceof Error) {
      this._errorMessage = error.message;
    }
    this._isSuccess = false;
    this._isError = true;
    this._isUndefined = false;
  }
}
