import type { EvalHooks, EvalHookErrorPolicy } from './eval-hooks';

/**
 * Represents the options for evaluating expressions.
 *
 * Deliberately a permissive record: callers pass their own keys through it, and
 * `EvalContext` / `EvalScope` forward the same object around. Narrowing it to
 * {@link EvalKnownOptions} would break every caller holding a
 * `Record<string, unknown>`, since `unknown` is not assignable to a declared
 * `boolean | undefined`. The keys the evaluator itself recognises are documented
 * on {@link EvalKnownOptions} instead, and read through a cast at the point of
 * use because a union does not index directly.
 */
export type EvalOptions = Record<string, unknown> | { caseInsensitive: false};

/**
 * The option keys `eval-core` itself recognises.
 *
 * Documentation with types attached rather than a constraint: an
 * {@link EvalOptions} value is *not* required to conform to this, and nothing
 * validates against it. Its purpose is to give the recognised keys one
 * discoverable declaration, and to let a caller who wants checking write
 * `const options: EvalKnownOptions = { … }` and have a typo caught.
 *
 * A type alias rather than an interface, and that is load-bearing: an interface
 * gets no implicit index signature, so it would not be assignable to
 * {@link EvalOptions}'s `Record<string, unknown>` arm and the annotated form
 * above - its only reason to exist - would not compile.
 */
export type EvalKnownOptions = {
  /**
   * Resolve context keys and property names without regard to case.
   */
  caseInsensitive?: boolean;

  /**
   * Accumulate per-node-type timings for the evaluation, readable afterwards as
   * `EvalState.nodeTimings`.
   *
   * **Turning this on makes the walk dispatch per node.** Registering the
   * timing hook from options constructs the hook registry eagerly, and
   * `EvalHooks.isActive` latches on that registration, so every node dispatches
   * for the whole evaluation. That cost is inherent to the feature - per-node
   * -type totals cannot be derived without visiting each node - and it is not
   * the zero-cost-when-unused guarantee being eroded: that guarantee is about
   * the *default* path. If a single walk-level total is all that is wanted,
   * `EvalResult.duration` already provides one for free on every evaluation.
   *
   * Honoured only when no registry is supplied through {@link hooks}; see that
   * key.
   */
  trackTime?: boolean;

  /**
   * A caller-owned {@link EvalHooks} to dispatch through, instead of the empty
   * one the state creates on first access.
   *
   * Adopted as-is and never cloned, so the unsubscribe closures `on` returned
   * keep working. **Because the registry belongs to the caller, options never
   * configure it**: {@link onHookError} and {@link trackTime} apply to a
   * registry the state built, and are silently ignored when one is adopted. A
   * caller who wants either alongside their own registry sets it there -
   * `new EvalHooks({ onHookError: 'throw' })`, or `createTimingHook().install`.
   */
  hooks?: EvalHooks;

  /**
   * What to do with an error raised by a hook. Defaults to `'collect'`.
   *
   * Honoured only when no registry is supplied through {@link hooks}; see that
   * key.
   */
  onHookError?: EvalHookErrorPolicy;
};


// export class EvalOptions {

//   private _caseInsensitive?: boolean;
//   private _trackTime?: boolean;

//   /**
//    * Gets or sets a value indicating whether the evaluation should be case-insensitive.
//    */
//   public get caseInsensitive(): boolean | undefined {
//     return this._caseInsensitive;
//   }

//   /**
//    * Gets or sets a value indicating whether the evaluation should track time.
//    */
//   public get trackTime(): boolean | undefined {
//     return this._trackTime;
//   }
//   public set trackTime(value: boolean | undefined) {
//     this._trackTime = value;
//   }


//   /**
//    * Gets the value of the EvalOptions object as a record of string keys and unknown values.
//    * @returns The value of the EvalOptions object.
//    */
//   public get value(): Record<string, unknown> {
//     const obj: Record<string, unknown> = {};
//     if (this._caseInsensitive !== undefined) {
//       obj['caseInsensitive'] = this._caseInsensitive;
//     }
//     return obj;
//   }

//   constructor(
//     caseInsensitive = false,
//     trackTime = false
//   ) {
//     this._caseInsensitive = caseInsensitive;
//     this._trackTime = trackTime;
//   }

// }
