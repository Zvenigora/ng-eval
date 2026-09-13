import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';
import { EvalResult } from './eval-result';
import { EvalHooks } from './eval-hooks';
import type { AnyNodeTypes } from '../../interfaces';
import type { EvalHookBookkeeping, EvalHookError, EvalNodeTiming } from './eval-hooks';
import { createTimingHook } from './hooks/timing-hook';
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
 * Whether the caller asked for per-node timings. Same cast, same reason.
 */
const readTrackTime = (options?: EvalOptions): boolean =>
  !!(options as Record<string, unknown>)?.['trackTime'];

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
  private _walkDepth = 0;

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
   * Per-node-type timings for **this state**, keyed by node type. Empty unless
   * a timing hook was installed - by `options.trackTime`, or by the caller
   * through `createTimingHook().install(state.hooks)`.
   *
   * Accumulates for the life of the state, not per `evaluate` call: under the
   * `createState` + repeated `eval` style the counts are the running totals
   * across every run on this state, which is what makes them comparable. A
   * caller who wants per-run figures uses a fresh state, or drops these along
   * with the rest of the run record via {@link resetHookBookkeeping}.
   *
   * Here rather than on the handle `createTimingHook` returns for the same
   * reason {@link hookErrors} is: timings describe one run, and an `EvalHooks`
   * may be handed to several. It is also the only place a `trackTime` caller
   * could reach them, since that installation happens in this constructor and
   * hands the handle to nobody.
   *
   * Totals are inclusive of child nodes; see `EvalNodeTiming`.
   */
  public get nodeTimings(): ReadonlyMap<AnyNodeTypes, EvalNodeTiming> {
    return this.hookBookkeeping.timings;
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
    return (this._hookBookkeeping ??=
      { open: [], errors: [], timings: new Map(), walkBases: [] });
  }

  /**
   * How many `evaluate` / `evaluateAsync` calls on this state are currently on
   * the JavaScript stack: 0 between evaluations, 1 during an ordinary walk, and
   * more while a nested walk runs - an arrow-function body is re-entrant
   * `evaluate` on this same state.
   *
   * Maintained by {@link enterWalk} / {@link exitWalk}, which the entry points
   * pair around their walk, the exit in a `finally` so a throw still restores
   * the count.
   *
   * **Deliberately not merged with `EvalHookBookkeeping.walkBases`**, which
   * tracks the same nesting one level down. That stack is pushed only under
   * {@link hasHooks}, because bounding `EvalHooks.exit` is meaningless with no
   * hooks to dispatch; this counter must be maintained unconditionally, because
   * § 3.4's iteration budget refills on the outermost entry and a loop is
   * bounded whether or not anyone is listening. One field cannot be both
   * guarded and unguarded, so there are two.
   *
   * @internal Not part of the published API.
   */
  public get walkDepth(): number {
    return this._walkDepth;
  }

  /**
   * Records that a walk is starting on this state and returns the new depth, so
   * a caller can recognise the outermost entry as `=== 1` without a second
   * read.
   *
   * @internal Not part of the published API.
   */
  public enterWalk(): number {
    return ++this._walkDepth;
  }

  /**
   * Records that a walk has finished. Called from the entry point's `finally`.
   *
   * @internal Not part of the published API.
   */
  public exitWalk(): void {
    this._walkDepth--;
  }

  /**
   * Drops every per-run record this state holds: the collected hook errors, the
   * open-node stack, the accumulated timings, and the walk bases bounding
   * `EvalHooks.exit`.
   *
   * It resets the whole record rather than only the errors, which is why it is
   * not named for them. `EvalHooks.clear` cannot reach any of this - the
   * bookkeeping belongs to the state - so without this method nothing drains
   * the open-node stack at all. Frames left on it keep their AST nodes
   * reachable for as long as the state is, and `EvalService` holds its states
   * in a strong `Set`.
   *
   * The errors matter for the same reason under the state-first style:
   * `createState` plus repeated `eval` on one state accumulates them for the
   * life of that state, and a thrown value can close over consumer objects.
   *
   * The record is replaced rather than emptied in place, so a caller still
   * holding the array {@link hookErrors} handed out keeps its own contents and
   * simply stops tracking - the alternative would mutate a collection the
   * caller owns a reference to.
   *
   * Calling this mid-walk is unsupported for the same reason `EvalHooks.clear`
   * is: it abandons frames the dispatcher expects to close.
   */
  public resetHookBookkeeping(): void {
    this._hookBookkeeping = undefined;
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

    // Options configure the registry this state owns, never an adopted one -
    // the same rule `onHookError` follows, and for the same reason: an adopted
    // `EvalHooks` belongs to the caller, and installing into it would leave a
    // hook firing on every later evaluation they run through it, with the
    // unsubscribe this call discards as the only way off. A caller who wants
    // both passes their own registry and installs the hook on it themselves.
    if (!this._hooks && readTrackTime(options)) {
      // Registering here rather than lazily means `isActive` has latched before
      // the walk starts, so every node dispatches for its whole duration. That
      // is what was asked for: per-node-type totals cannot be had without
      // visiting each node, and `EvalResult.duration` already covers the
      // cheaper walk-level question.
      createTimingHook().install(this.hooks);
    }
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
