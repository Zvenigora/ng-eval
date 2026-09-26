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
   * **It bounds time, not memory** - {@link maxTraceItems} bounds the memory,
   * and before it existed this option was the only thing between a loop and an
   * out-of-memory. `EvalResult.trace` gained an entry per value pushed and was
   * reset by nothing, so a loop's trace grew as iterations x nodes - 700,007
   * entries for a 100,000-iteration loop, and unbounded under `Infinity`.
   * **That loop is not stopped by this budget**: it charges exactly the default
   * 100,000 and completes, so the whole allocation is paid by a walk that
   * returns normally. Where the budget *does* stop a loop - an unbounded
   * `for (;;)` - the allocation is already paid when the throw arrives.
   * {@link maxTraceItems} caps that by default as of 0.6.0; `docs/backlog.md`
   * A12 is retired and carries the measurements.
   *
   * Costs nothing when no loop runs: the counter is charged inside
   * `for-statement.ts`'s iteration loop and nowhere else, so an expression with
   * no `for` in it never reaches the instruction.
   */
  maxIterations?: number;

  /**
   * How many values one {@link EvalState}'s trace may hold before it stops
   * growing. Defaults to `10000`.
   *
   * **A bound on memory, not a debugging preference.** `EvalResult.trace` gains
   * an entry per value pushed and is reset only by `EvalResult.clearTrace()`.
   * Before this bound, with nothing resetting it at all, a loop's trace grew as
   * iterations x nodes - 700,007 entries and ~34 MB for a 100,000-iteration
   * loop, which {@link maxIterations} does **not** stop: that loop charges
   * exactly the default budget of 100,000 and completes, so the allocation
   * happened in full on a walk that never raised. The budget bounded time and
   * left this unbounded; this bounds it.
   *
   * **The head is kept, and truncation is reported rather than marked.** The
   * first `maxTraceItems` pushes survive in order, so `trace[0]` still means
   * the first thing evaluated. Once a push is actually dropped,
   * `EvalResult.traceTruncated` turns true and stays true until `clearTrace()`;
   * a walk of exactly `maxTraceItems` pushes drops none and leaves it false.
   * `EvalResult.tracePushCount` goes on counting every push the state made -
   * which is the number the trace no longer tells you. No synthetic entry is
   * appended: every row in the trace describes a real node.
   *
   * **Per state, not per walk.** The trace spans every evaluation run on one
   * state, so this bounds their total. `EvalResult.clearTrace()` is how a
   * caller reusing a state gets a fresh one.
   *
   * `0` disables tracing - `trace.length` stays `0`, `traceTruncated` stays
   * `false`, and `tracePushCount` stays accurate, so the walk-size figure
   * survives the tracing that was turned off. `Infinity` restores the
   * unbounded behaviour exactly. Both are honoured rather than treated as
   * falsy or as opt-outs, the same way {@link maxIterations} honours them.
   *
   * Re-read on each outermost `evaluate` call rather than once, because the
   * options are a mutable record the caller keeps a reference to - the same
   * reason, and the same moment, as {@link maxIterations}' refill.
   */
  maxTraceItems?: number;

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
   * The library never clears an adopted registry. It is yours for its whole
   * life, and `EvalService.ngOnDestroy` does not touch it, whichever method you
   * passed it to. (Up to 0.5.0, destroy cleared the registries of the states
   * `createState` built.) So a hook that keeps a state, by capturing it or by
   * storing `event.state`, keeps that state and its context reachable for as
   * long as the registry is. Release them in the teardown that owns the
   * registry, with the unsubscribe `on` / `onRead` returned or `hooks.clear()`.
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
