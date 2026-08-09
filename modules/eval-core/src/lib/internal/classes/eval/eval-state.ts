import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';
import { EvalResult } from './eval-result';
import { EvalHooks } from './eval-hooks';
import type { EvalHookBookkeeping, EvalHookError } from './eval-hooks';
import { Context } from '../common';

/**
 * Reads a caller-supplied hook registry out of the evaluation options.
 *
 * `EvalOptions` is a union and does not index directly, so the read goes
 * through a cast - the same one `before-visitor.ts` performs. The registry is
 * adopted as-is and never cloned: the caller holds the unsubscribe closures
 * `on` returned, and a copy would leave those closures editing a registry that
 * is no longer the one being dispatched.
 */
const adoptHooks = (options?: EvalOptions): EvalHooks | undefined => {
  const value = (options as Record<string, unknown>)?.['hooks'];
  return value instanceof EvalHooks ? value : undefined;
};

/**
 * Represents the evaluation state, which includes the context, result, and options.
 */
export class EvalState {
  private _context: EvalContext | undefined;
  private _result: EvalResult;
  private _options: EvalOptions | undefined;
  private _isAsync: boolean | undefined;
  private _hooks: EvalHooks | undefined;
  private _hookBookkeeping: EvalHookBookkeeping | undefined;

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
   * Gets the hook registry for this evaluation, creating an empty one on first
   * access. A registry supplied through `options.hooks` is adopted instead.
   *
   * Merely reading this does not turn {@link hasHooks} on; registering does.
   */
  public get hooks(): EvalHooks {
    return (this._hooks ??= new EvalHooks(this._options));
  }

  /**
   * The dispatch guard read by `beforeVisitor` / `afterVisitor`. One field read
   * and no options lookup, so the no-hooks path stays cheap.
   */
  public get hasHooks(): boolean {
    return !!this._hooks && this._hooks.isActive;
  }

  /**
   * Errors raised by hooks during this evaluation and collected under the
   * 'collect' policy.
   *
   * They live here rather than on {@link hooks} because an `EvalHooks` may be
   * shared across evaluations, and an error describes one run.
   *
   * The array is the live one, so a reference taken before evaluating fills as
   * errors arrive. Returning a shared empty array until the first collection
   * would be cheaper by one allocation and wrong: the reference would silently
   * stop tracking the moment anything was collected.
   */
  public get hookErrors(): readonly EvalHookError[] {
    return this.hookBookkeeping.errors;
  }

  /**
   * The per-run bookkeeping `EvalHooks` reads and writes: the open-node stack
   * and the collected errors, grouped behind a single accessor.
   *
   * The state owns this storage and `eval-hooks.ts` only type-imports the
   * state, which keeps the runtime import graph acyclic. Holding it in a
   * module-private `WeakMap` inside `eval-hooks.ts` was the alternative and was
   * rejected: `hookErrors` would then need a *runtime* import of that module
   * while it already imports this one, and the resulting cycle is a hazard in
   * the ng-packagr build.
   *
   * @internal Not part of the published API.
   */
  public get hookBookkeeping(): EvalHookBookkeeping {
    return (this._hookBookkeeping ??= { open: [], errors: [] });
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
    this._hooks = adoptHooks(options);
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
