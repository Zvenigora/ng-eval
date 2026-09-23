import { AnyNode } from 'acorn';
import { EvalContext, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * The `maxTraceItems` bound on `EvalResult.trace`, closing `docs/backlog.md`
 * A12.
 *
 * **Why one spec covers three files.** The subject is the guard in
 * `visitor-result.ts`; `EvalState`'s option read is its input and
 * `EvalResult.traceTruncated` / `tracePushCount` are its outputs. Splitting it
 * per file would put the discriminating fixtures - which all drive the guard
 * through a whole walk - in a file that does not name it. `CLAUDE.md`'s
 * co-location rule is satisfied by the subject, not by the field count.
 *
 * ---
 *
 * ## The probe record - why these assertions are load-bearing
 *
 * `CLAUDE.md`: *a test that would pass without the code it tests is worse than
 * no test*. Fifteen wrong implementations were built and run against these
 * assertions, and **which** cases went red under each is recorded below.
 *
 * **Read this before weakening, merging or deleting any assertion here.** If
 * you are about to remove a case, find it in a `Red` column first: several look
 * redundant and are the only detector for one wrong implementation.
 *
 * Carried from the A12 track's step summaries - `docs/trace/step-1-summary.md`
 * § 3 and `docs/trace/step-2-summary.md` § 2, on branch `backlog-A12` - where
 * the probes were run. The counts are as recorded; the summaries log red
 * *cases* by description rather than by `it` name, so no probe below is mapped
 * to a specific `it` - that mapping was not written down and is not invented
 * here.
 *
 * ### Step 1 - ten probes against the guard, the option read and the counters
 *
 * | # | Wrong implementation | Red |
 * | - | -------------------- | --- |
 * | 1 | Guard never caps | **7** - the 3 that stayed green are the 3 whose expected outcome *is* "nothing dropped" |
 * | 2 | Reads `EvalResult.options` (the *context's*) | **1** - the provenance case, and only it |
 * | 3 | Reads the option in the constructor | **2** - the re-read case and the getter-before-walk case |
 * | 4 | Never reads the option at all | **5** |
 * | 5 | Treats `0` as falsy | **1** |
 * | 6 | Early return skips the increment along with the push | **1**, and specifically its *third* assertion - `tracePushCount` 7 -> 0 |
 * | 7 | `tracePushCount` returns `trace.length` | **3** |
 * | 8 | Flag and count reset per walk | **1** |
 * | 9 | Tail-keeping bound (ring buffer) | **1** - the head-order case, and only it |
 * | 10 | **Build-and-discard** - allocate the item, then drop it | **0. All ten cases passed.** |
 *
 * **Probe 10 is a finding, not a footnote.** Retention-shaped assertions cannot
 * see an allocation-shaped defect: build-and-discard leaves the traced object
 * collectable exactly as the real guard does - measured at 0.6 MB either way -
 * so nothing here discriminates it. A `WeakRef` probe would not either. The
 * instrument that would is GC-event counting (`perf_hooks`,
 * `entryTypes: ['gc']`). Filed as `docs/backlog.md` A19; **still true of this
 * file today.**
 *
 * **Probe 9, incidentally:** the naive ring buffer - `Array.shift()` per push
 * past the bound - is O(n) each and hangs the suite at 690,000 x 10,000
 * operations. The probe had to be rewritten as an O(1) index overwrite to run
 * at all.
 *
 * ### Step 2 - five probes against `clearTrace()` and the destroy drain
 *
 * | Wrong implementation | Red |
 * | -------------------- | --- |
 * | `clearTrace()` reassigns instead of emptying in place | **1** - the identity assertion |
 * | Empties the array, strands both counters | **2** |
 * | Strands `traceTruncated`, and `addTraceBounded` short-circuits on it | **3** - but the flag assertion fired one step *before* the go-on-tracing assertion ran |
 * | Tracing latched off by a flag `clearTrace` does not reset | the go-on-tracing assertion **alone**, `Expected 7, Received 0` |
 * | Remove the `ngOnDestroy` call | **1**, in `eval.service.memory-leaks.spec.ts` - not this file |
 *
 * **The third and fourth rows together are the finding.** The go-on-tracing
 * assertion was written to catch "a clear that strands the flag"; row 3 shows
 * the flag assertion already catches that one step earlier. Row 4 isolates what
 * it uniquely backstops: a cleared state that is empty, counted from zero,
 * identical in instance - and traces nothing ever again. That is why it is not
 * redundant with the assertions above it.
 *
 * The last row's assertion lives in
 * `actual/services/eval.service.memory-leaks.spec.ts`; its probe is recorded
 * here because the other four are here and splitting the table would lose the
 * comparison.
 */

const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

/** The fixture every published measurement uses - `docs/backlog.md` A12. */
const LOOP = 'for (let i = 0; i < 100000; i++) { i }';

/** Seven pushes per iteration plus the program's seven - decomposed below. */
const LOOP_PUSHES = 700007;

describe('maxTraceItems', () => {

  describe('the default bound', () => {

    /**
     * Both halves in one case on purpose. The first alone is satisfied by an
     * implementation that stops tracing loop bodies, or any walk past some node
     * count; the second is the detector. Split across two `it`s, an edit can
     * weaken one and leave the other green.
     */
    it('should cap a runaway loop at 10,000 and leave a small expression whole', () => {
      const capped = EvalState.fromContext({}, { maxIterations: Infinity });
      evaluate(programOf(LOOP), capped);

      expect(capped.result.trace.length).toEqual(10000);
      expect(capped.result.traceTruncated).toEqual(true);

      const whole = EvalState.fromContext({ a: 10 }, {});
      evaluate(programOf('2 + 3 * a'), whole);

      expect(whole.result.trace.length).toEqual(7);
      expect(whole.result.traceTruncated).toEqual(false);
    });

    /**
     * The head is kept, not the tail. A ring buffer satisfies the length
     * assertion above exactly, so the discriminating check is *which* pushes
     * survived.
     *
     * Index 9999 is arithmetic, and the arithmetic was checked against an
     * unbounded walk rather than reasoned about - a first derivation of it was
     * wrong. `LOOP_PUSHES` decomposes as **2 + 7 x 100,000 + 5**: two pushes
     * for the `let i = 0` init, seven per iteration, then the failing test's
     * three and the `ForStatement` / `Program` pair closing the walk.
     *
     * So iteration `k` occupies indices `2 + 7k` upward, and
     * `9999 - 2 = 9997 = 7 x 1428 + 1` puts index 9999 one push into iteration
     * **1428** - the `100000` literal of that iteration's `i < 100000` test.
     * Asserting the entry rather than its absence is what separates a head
     * bound from a tail one: under a ring buffer this index holds a value from
     * iteration 98,5xx instead.
     */
    it('should keep the first 10,000 pushes in order, not the last', () => {
      const state = EvalState.fromContext({}, { maxIterations: Infinity });
      evaluate(programOf(LOOP), state);

      // The first push of the whole walk is the `0` in `let i = 0`.
      expect(state.result.trace[0]).toEqual({ type: 'Literal', value: 0 });

      // Iteration 1428's test literal, by the decomposition above.
      expect(state.result.trace[9999]).toEqual({ type: 'Literal', value: 100000 });

      // Nothing past the bound.
      expect(state.result.trace[10000]).toBeUndefined();
    });
  });

  describe('where the bound is read from', () => {

    /**
     * Provenance. `EvalResult.options` returns the *context's* options, not the
     * walk's, and the ordinary fixture cannot tell them apart: pass a plain
     * object plus options to `createState` and the context is built from those
     * same options, so both reads agree.
     *
     * This fixture makes them disagree. `EvalContext.fromContext`
     * short-circuits on identity, so the context handed in below keeps the cap
     * of 3 it was built with while the walk is given 12.
     */
    it('should read the walk options, not the context the walk runs on', () => {
      const context = EvalContext.fromContext({ a: 10 }, { maxTraceItems: 3 });
      const state = EvalState.fromContext(context, { maxTraceItems: 12 });

      // The same cast the library reads options through - `EvalOptions` is a
      // union and does not index directly.
      expect((context.options as Record<string, unknown>)['maxTraceItems'])
        .toEqual(3);

      evaluate(programOf('2 + 3 * a'), state);

      // Seven pushes, a walk cap of 12: nothing is dropped. Reading the
      // context's options instead caps at 3.
      expect(state.result.trace.length).toEqual(7);
      expect(state.result.traceTruncated).toEqual(false);
    });

    /**
     * Timing, and the only setup where a constructor read and an `enterWalk`
     * read disagree. The options are a **mutable record the caller keeps a
     * reference to** - which is the reason `enterWalk` re-reads them per
     * outermost walk rather than the constructor reading them once
     * (`eval-state.ts`, the refill comment).
     *
     * **The two caps are 3 then 10, and 5 then 50 would not work.** The
     * per-walk reset is decided out (`docs/backlog.md` A15), so the trace
     * accumulates: walk one leaves 3 items, walk two adds its seven pushes on
     * top to reach 10. A second cap the two walks cannot together exceed - 50
     * against 14 pushes - is reached by neither implementation and
     * discriminates nothing.
     */
    it('should re-read the bound per outermost walk, as the iteration budget does', () => {
      const options: Record<string, unknown> = { maxTraceItems: 3, maxIterations: 11 };
      const state = EvalState.fromContext({ a: 10 }, options);
      const ast = programOf('2 + 3 * a');

      evaluate(ast, state);

      expect(state.result.trace.length).toEqual(3);
      expect(state.result.traceTruncated).toEqual(true);
      expect(state.iterationsRemaining).toEqual(11);

      // The caller mutates the record they still hold.
      options['maxTraceItems'] = 10;
      options['maxIterations'] = 22;

      evaluate(ast, state);

      // A constructor read leaves this at 3 while the sibling knob below moves.
      expect(state.result.trace.length).toEqual(10);
      expect(state.iterationsRemaining).toEqual(22);
    });

    /**
     * Reads nothing at all. Caught by any non-default value, and by the getter
     * before a walk - which reports the default whatever the options say,
     * because the field is filled on the outermost entry exactly as
     * `_iterationBudget` is.
     */
    it('should report the default before the first walk and the option after it', () => {
      const state = EvalState.fromContext({ a: 10 }, { maxTraceItems: 4 });

      expect(state.maxTraceItems).toEqual(10000);

      evaluate(programOf('2 + 3 * a'), state);

      expect(state.maxTraceItems).toEqual(4);
      expect(state.result.trace.length).toEqual(4);
    });
  });

  describe('the two edges', () => {

    /**
     * `0` silences the trace and not the counter. An early return that skips
     * the increment with the push satisfies the first two assertions and fails
     * only the third, which is why all three are here.
     *
     * `0` is also honoured rather than treated as falsy - the trap
     * `readMaxIterations`' own docblock names for the budget.
     */
    it('should trace nothing under 0, without truncating and without losing the count', () => {
      const state = EvalState.fromContext({ a: 10 }, { maxTraceItems: 0 });
      evaluate(programOf('2 + 3 * a'), state);

      expect(state.result.trace.length).toEqual(0);
      expect(state.result.traceTruncated).toEqual(false);
      expect(state.result.tracePushCount).toEqual(7);
    });

    it('should restore the unbounded behaviour under Infinity', () => {
      const state = EvalState.fromContext({}, {
        maxIterations: Infinity,
        maxTraceItems: Infinity
      });
      evaluate(programOf(LOOP), state);

      expect(state.result.trace.length).toEqual(LOOP_PUSHES);
      expect(state.result.traceTruncated).toEqual(false);
    });

    it('should fall back to the default when the option is malformed', () => {
      const state = EvalState.fromContext({ a: 10 }, { maxTraceItems: 'lots' });
      evaluate(programOf('2 + 3 * a'), state);

      expect(state.maxTraceItems).toEqual(10000);
      expect(state.result.trace.length).toEqual(7);
    });
  });

  describe('tracePushCount and traceTruncated', () => {

    it('should count every push the walk made, not the items kept', () => {
      const state = EvalState.fromContext({}, { maxIterations: Infinity });
      evaluate(programOf(LOOP), state);

      expect(state.result.tracePushCount).toEqual(LOOP_PUSHES);
      expect(state.result.trace.length).toEqual(10000);
    });

    /**
     * Both span walks, because the trace does. With the per-walk reset decided
     * out (`docs/backlog.md` A15) a count or a flag scoped to one walk would
     * describe a different array than the one it sits beside.
     */
    it('should accumulate across walks on one state, and latch the flag', () => {
      const state = EvalState.fromContext({ a: 10 }, { maxTraceItems: 9 });
      const ast = programOf('2 + 3 * a');

      evaluate(ast, state);

      expect(state.result.tracePushCount).toEqual(7);
      expect(state.result.traceTruncated).toEqual(false);

      evaluate(ast, state);

      // 14 pushes against a bound of 9: the second walk is where it truncates.
      expect(state.result.tracePushCount).toEqual(14);
      expect(state.result.trace.length).toEqual(9);
      expect(state.result.traceTruncated).toEqual(true);

      evaluate(ast, state);

      // Latched - a third walk does not clear it, and the count keeps going.
      expect(state.result.tracePushCount).toEqual(21);
      expect(state.result.traceTruncated).toEqual(true);
    });
  });

  describe('clearTrace', () => {

    /**
     * One case, three legs, because each closes a wrong implementation the
     * others pass.
     *
     * **The context carries `a` although the loop does not need it.** Leg 1
     * walks the loop, which binds its own `i`; leg 3 walks `2 + 3 * a` on the
     * *same state*, and that is where `a` is read. Neither leg makes the
     * binding look necessary on its own.
     *
     * **No `WeakRef` probe here, deliberately** (`docs/backlog.md` A19): every
     * defect one would catch is length-visible, Jest has no `global.gc`, and
     * releasing the values is a consequence of emptying the array rather than a
     * separate claim.
     */
    it('should reset the trace and both counters, keep the array, and go on tracing', () => {
      const state = EvalState.fromContext({ a: 10 }, { maxIterations: Infinity });

      // Leg 1 - the precondition. Without it every assertion below passes on a
      // trace that was never filled.
      evaluate(programOf(LOOP), state);

      expect(state.result.trace.length).toEqual(10000);
      expect(state.result.traceTruncated).toEqual(true);
      expect(state.result.tracePushCount).toEqual(LOOP_PUSHES);

      // Leg 2. The identity assertion - not the length one - is what excludes
      // `this._trace = new EvalTrace()`: a reassignment empties the trace and
      // releases its values just as well, and breaks only the consumer holding
      // the array the getter has always returned.
      const array = state.result.trace;

      state.result.clearTrace();

      expect(state.result.trace).toBe(array);
      expect(state.result.trace.length).toEqual(0);
      expect(state.result.traceTruncated).toEqual(false);
      expect(state.result.tracePushCount).toEqual(0);

      // Leg 3 - the state still traces, and counts from zero. **Not** the leg
      // that catches a stranded `traceTruncated`: leg 2 asserts the flag false
      // immediately above, so a clear that strands it fails there and this
      // never runs. Probed, not reasoned - stranding the flag reddened leg 2.
      //
      // What this leg uniquely backstops is tracing latched off by anything
      // else: a guard that short-circuits on a disabled flag `clearTrace` does
      // not know to reset leaves the state tracing nothing ever again, while
      // length after the clear is still 0, the counters are still 0 and
      // identity still holds. Probed that way too - only this leg went red.
      evaluate(programOf('2 + 3 * a'), state);

      expect(state.result.trace.length).toEqual(7);
      expect(state.result.tracePushCount).toEqual(7);
      expect(state.result.traceTruncated).toEqual(false);
    });
  });
});
