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
   * How many loop iterations one evaluation may run before it throws. Defaults
   * to `100000`.
   *
   * **A bound on non-termination, not a performance knob.** With no `break`,
   * `continue` or `return` in the language this evaluator implements, the only
   * way out of `for (;;)` is the budget, and a runaway loop that silently
   * returned a partial value is the failure this exists to prevent - so
   * exceeding it raises `Iteration budget exhausted after <n> iterations`.
   *
   * **Per outermost `evaluate` call, not per loop and not per state.** Per loop
   * would not be a bound at all: two nested loops at 100,000 each is 10^10
   * iterations. Per state would erode one budget across the independent
   * evaluations of the `createState` + repeated `eval` style, and would leave an
   * escaped closure - an arrow that outlives its walk - carrying that walk's
   * spent budget into a later call. A nested walk *during* an evaluation, which
   * is what an arrow-function body is, shares the remaining budget with its
   * caller rather than refilling.
   *
   * `Infinity` opts out; the consequence is the caller's. The default is sized
   * in the plan's § 3.4 at roughly 0.2 s of evaluation - long enough to exceed
   * any hand-written rule, short enough that a browser tab stutters rather than
   * freezes.
   *
   * **It bounds time, not memory, and raising it trades one for the other.**
   * `EvalResult.trace` gains an entry per value pushed and is never reset, so a
   * loop's trace grows as iterations x nodes - roughly 700,000 entries for a
   * 100,000-iteration loop. The allocation happens *before* the throw, so
   * exhausting the budget costs it in full; and `Infinity` removes the only
   * thing bounding it, turning a hang into an out-of-memory. `docs/backlog.md`
   * A12 carries the measurements and the options for bounding it.
   *
   * Costs nothing when no loop runs: the counter is charged inside
   * `for-statement.ts`'s iteration loop and nowhere else, so an expression with
   * no `for` in it never reaches the instruction.
   */
  maxIterations?: number;

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
   *
   * The one thing the library does *to* an adopted registry is clear it:
   * `EvalService.ngOnDestroy` empties the registries of the states it created,
   * this one included, so that a registry outliving the service cannot keep
   * those states and their AST nodes reachable. Registrations cannot be dropped
   * selectively - the closures that captured a dead state are indistinguishable
   * from the rest - so do not share one registry with a state whose lifetime is
   * meant to outlast the service.
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
