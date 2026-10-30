import { AnyNode } from "acorn";
import { Stack } from "../common";
import { EvalContext } from "./eval-context";
import { EvalOptions } from "./eval-options";
import { EvalTrace } from "./eval-trace";

type UnknownValue = unknown | Promise<unknown>;

/**
 * Represents the result of an evaluation.
 *
 * **The outcome describes the last entry-point walk on the state**: its
 * {@link value}, {@link error}, {@link errorMessage}, {@link isSuccess},
 * {@link isError}, {@link isUndefined} and {@link duration}. Each entry point
 * resets the outcome when its walk starts and writes it when the walk ends - for
 * `evalAsync` and its kin, once the result's promises have settled, so between
 * return and settlement a walk that did not throw reports neither success nor
 * failure. An arrow function's body runs a walk of its own on the same state,
 * and it changes nothing here: not while the enclosing walk runs, and not when
 * a function the walk built is called later. Up to 0.14.1 it overwrote all of it
 * (`docs/backlog-retired.md` A27). Two `evalAsync` runs interleaved on one
 * state share one outcome: the later start resets it, and the last to settle
 * writes it.
 *
 * The {@link trace} is not part of the outcome: it spans every evaluation run on
 * the state, and only {@link clearTrace} resets it.
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
   * Gets the evaluated value: the last entry-point walk's, and `undefined`
   * once that walk failed or while it is pending.
   */
  public get value(): UnknownValue | undefined {
    return this._value;
  }

  /**
   * Gets the error the last entry-point walk failed with, and `undefined` once
   * it succeeded or while it is pending. An error an arrow function's body
   * threw and something in the walk caught is not the walk's.
   */
  public get error(): unknown | undefined {
    return this._error;
  }

  /**
   * Gets {@link error}'s message when it is an `Error`, and `undefined`
   * otherwise.
   */
  public get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  /**
   * Gets whether the last entry-point walk failed: `undefined` while it is
   * pending.
   */
  public get isError(): boolean | undefined {
    return this._isError;
  }

  /**
   * Gets whether the last entry-point walk succeeded: `undefined` while it is
   * pending.
   */
  public get isSuccess(): boolean | undefined {
    return this._isSuccess;
  }

  /**
   * Gets whether {@link value} is `undefined`, once the last entry-point walk
   * has ended - including after a failure, which clears the value. `undefined`
   * while it is pending.
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
   * Gets the duration of the last entry-point walk, an arrow function's body
   * called inside it included: `undefined` while it is pending.
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
   * Starts the evaluation process, and resets the outcome: {@link value},
   * {@link error}, {@link errorMessage}, {@link isSuccess}, {@link isError},
   * {@link isUndefined} and {@link duration} read `undefined` until the walk
   * ends. Leaves the
   * {@link trace}, {@link tracePushCount} and {@link traceTruncated} alone,
   * since the trace spans every evaluation on the state (`docs/backlog.md`
   * A15). Up to 0.14.1 it reset nothing, so a reused state reported the last
   * run's error until something overwrote it (A27).
   */
  public start(): void {
    this._startDate = performance.now();
    this._endDate = undefined;
    this._value = undefined;
    this._error = undefined;
    this._errorMessage = undefined;
    this._isSuccess = undefined;
    this._isError = undefined;
    this._isUndefined = undefined;
  }

  /**
   * Stops the evaluation and records the end date.
   */
  public stop(): number | undefined {
    this._endDate = performance.now();
    return this.duration;
  }

  /**
   * Sets the success value of the evaluation result, writing every outcome
   * field: the error and its message are cleared.
   *
   * @param value The value to set as the success value.
   * @returns void
   */
  public setSuccess(value: UnknownValue): void {
    this._value = value;
    this._error = undefined;
    this._errorMessage = undefined;
    this._isSuccess = true;
    this._isError = false;
    this._isUndefined = value === undefined;
  }

  /**
   * Sets the failure state of the evaluation result, writing every outcome
   * field: the value is cleared, and the message is the error's when it is an
   * `Error`.
   * @param error The error object associated with the failure.
   */
  public setFailure(error: unknown): void {
    this._value = undefined;
    this._error = error;
    this._errorMessage = error instanceof Error ? error.message : undefined;
    this._isSuccess = false;
    this._isError = true;
    this._isUndefined = true;
  }
}
