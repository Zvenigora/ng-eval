import { AnyNode } from 'acorn';
import { EMPTY_COMPLETION, EvalContext, EvalKnownOptions, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * Parses to the whole `Program`, the way `EvalService` does - its parser options
 * leave `extractExpressions` off, so `evaluate` is handed the program node.
 */
const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

/**
 * Evaluates against an `EvalContext` the caller owns.
 *
 * `EvalState.fromContext` routes through `EvalContext.fromContext`, which
 * short-circuits on identity, so every call here walks on the **same** context
 * instance. The scope stack lives on `EvalContext` and not on the per-walk
 * `EvalState`, so a scope this visitor failed to pop is invisible to a fixture
 * that builds its context inline and shows up only on the next evaluation to
 * reuse the context - which is the plan's step 5 criterion 2 and
 * `code-reviewer.md` item 3's probe.
 */
const runOn = (source: string, context: EvalContext, options: EvalKnownOptions = {}): unknown =>
  evaluate(programOf(source), EvalState.fromContext(context, options));

/**
 * A reusable context carrying the things these specs read.
 *
 * `depth` reports `scopes.length` **at call time**, which is the only channel
 * the loop scope is observable on: a `for` binds `i` into it, but a caller
 * cannot see a binding that is correctly popped, and cannot tell a scope that
 * was pushed from one that never was by reading values alone.
 */
const contextOf = (): EvalContext => {
  const context: EvalContext = EvalContext.fromContext({
    a: 'A',
    depth: () => context.scopes.length,
    noop: () => undefined,
    boom: () => { throw new Error('boom'); },
  });
  return context;
};

describe('forStatementVisitor', () => {

  describe('completion value', () => {

    it('should return the last body value and strand nothing', () => {
      // § 1.1's row: measured **`NaN`** with **3 stranded** before Phase 2. The
      // base walker walked the declarator's `id` as a read, so `i` resolved to
      // nothing and `i < 3` was `undefined < 3`; since step 1 the row throws
      // from the dispatcher's `default`. This is the step that returns `2`.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('for (let i = 0; i < 3; i++) { i }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should take a bare body, not only a block', () => {
      // A bare body is an `ExpressionStatement`, which reaches the dispatcher by
      // a different `case` than `BlockStatement` does - and is the one body
      // position where no registered statement visitor stands between this
      // visitor and `acorn-walk`'s base walker.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('for (let i = 0; i < 3; i++) i;'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should keep the last non-empty body value over a later empty one', () => {
      // **The discriminating case for "last non-`EMPTY`" against "last body
      // value".** Iteration 0 produces `'first'`; iterations 1 and 2 take no
      // branch and produce the sentinel. An implementation that kept whatever
      // the last iteration pushed returns `undefined` here and still passes
      // every row above, where every iteration produces something.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf(`for (let i = 0; i < 3; i++) { if (i < 1) { 'first' } }`), state))
        .toBe('first');
      expect(state.result.stack.length).toBe(0);
    });

    it('should let a body that produced undefined win over an earlier value', () => {
      // The other side of the same distinction, and the case § 3.1 names as the
      // only one that separates the sentinel from `undefined`: `noop()`
      // genuinely *produced* `undefined`, so it is not empty and must beat the
      // `'a'` before the loop. "Keep the last non-`undefined`" returns `'a'`.
      const context = contextOf();

      expect(runOn(`{ 'a'; for (let i = 0; i < 1; i++) { noop() } }`, context)).toBeUndefined();
    });

    it('should produce nothing when the loop runs zero iterations', () => {
      // The `EMPTY` path: the test is false at the top, so no body value exists
      // and the earlier `'a'` survives. An implementation pushing `undefined`
      // for a zero-iteration loop returns `undefined`.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf(`{ 'a'; for (let i = 0; i < 0; i++) { i } }`), state)).toBe('a');
      expect(state.result.stack.length).toBe(0);
    });

    it('should return undefined rather than the sentinel for a zero-iteration loop', () => {
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('for (let i = 0; i < 0; i++) { i }'), state);

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(state.result.stack.length).toBe(0);
    });

    it('should produce nothing when every iteration produced nothing', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf(`{ 'a'; for (let i = 0; i < 3; i++) { } }`), state)).toBe('a');
      expect(state.result.stack.length).toBe(0);
    });

    it('should not leak the sentinel out of an arrow body whose loop ran zero times', () => {
      // § 3.1 rule 4 through the *other* walk boundary:
      // `arrow-function-expression.ts` calls `evaluate` on the `BlockStatement`,
      // and the array literal holds whatever that call pushed, so `Program`'s
      // own filter never sees it.
      const state = EvalState.fromContext({}, {});

      const value = evaluate(
        programOf('[(x => { for (let i = 0; i < 0; i++) { 1 } })(0)]'), state) as unknown[];

      expect(value).toEqual([undefined]);
      expect(value[0]).not.toBe(EMPTY_COMPLETION);
    });
  });

  describe('the three head positions', () => {

    it('should accept an expression init and strand nothing', () => {
      // **The init split, pinned.** `for (let i = …)` parses `init` as a
      // `VariableDeclaration` - a `Statement`, dispatched - while `for (i = …)`
      // parses it as an `Expression`, taking a raw `callback`. Both pop exactly
      // one, so § 3.1's arithmetic is the same for either and the stranded count
      // is what catches a route that popped the wrong number.
      const source = { i: 99 };
      const context = EvalContext.fromContext(source);
      const state = EvalState.fromContext(context, {});

      expect(evaluate(programOf('for (i = 0; i < 3; i++) { i }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
      // No scope binds `i`, so the write falls back to `EvalContext.set` and
      // lands in the caller's object - which is the documented fallback, not a
      // defect. It is the contrast with the `let` case below.
      expect(source.i).toBe(3);
    });

    it('should accept an absent init', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('let i = 0; for (; i < 3; i++) { i }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should accept an absent update', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('for (let i = 0; i < 3; ) { i++ }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should treat an absent test as true', () => {
      // The only terminator available with no `break` (§ 2) is the budget, so
      // the absent test is asserted by the loop running until it is exhausted
      // rather than stopping at the first iteration. A visitor reading an absent
      // test as false returns `undefined` here.
      expect(() => evaluate(programOf('for (let i = 0; ; i++) { i }'),
        EvalState.fromContext({}, { maxIterations: 50 })))
        .toThrow('Iteration budget exhausted after 50 iterations');
    });

    it('should evaluate init exactly once', () => {
      const init = jest.fn(() => 0);
      const state = EvalState.fromContext({ init }, {});

      expect(evaluate(programOf('for (let i = init(); i < 3; i++) { i }'), state)).toBe(2);
      expect(init).toHaveBeenCalledTimes(1);
    });

    it('should evaluate the test once more than the body', () => {
      // Three iterations means four tests and three bodies - the extra test is
      // the one that ends the loop. A visitor testing after the body instead of
      // before it reads three and three.
      const tests: number[] = [];
      const bodies: number[] = [];
      const state = EvalState.fromContext({
        test: (i: number) => { tests.push(i); return i < 3; },
        body: (i: number) => { bodies.push(i); return i; },
      }, {});

      expect(evaluate(programOf('for (let i = 0; test(i); i++) { body(i) }'), state)).toBe(2);
      expect(tests).toEqual([0, 1, 2, 3]);
      expect(bodies).toEqual([0, 1, 2]);
    });

    it('should run the update after the body, not before it', () => {
      const seen: string[] = [];
      const state = EvalState.fromContext({
        body: () => { seen.push('body'); return 1; },
        bump: () => { seen.push('update'); return 1; },
      }, {});

      evaluate(programOf('for (let i = 0; i < 2; i = i + bump()) { body() }'), state);

      expect(seen).toEqual(['body', 'update', 'body', 'update']);
    });
  });

  describe('the loop binding is not the caller\'s', () => {

    it('should not write the counter into the caller\'s context object', () => {
      // **Plan step 5, criterion 1, second half.** Before Phase 2 there was no
      // scope to bind into and `EvalContext.set` wrote `_original` - the
      // caller's own object - so a rule that ran a loop mutated the consumer's
      // data. `eval-signals` overrides `set` to throw for exactly this reason.
      const source: Record<string, unknown> = { total: 0 };
      const context = EvalContext.fromContext(source);

      expect(runOn('for (let i = 0; i < 3; i++) { i }', context)).toBe(2);

      expect('i' in source).toBe(false);
      expect(runOn('i', context)).toBeUndefined();
    });

    it('should shadow a source key of the same name and leave it intact', () => {
      // The stronger arm: `i` exists in the caller's object, so a visitor that
      // bound into the caller's context would overwrite a real value rather than
      // add a key. `in` cannot see that; the value can.
      const source = { i: 'source' };
      const context = EvalContext.fromContext(source);

      expect(runOn('for (let i = 0; i < 3; i++) { i }', context)).toBe(2);

      expect(source.i).toBe('source');
      expect(runOn('i', context)).toBe('source');
    });

    it('should reject an update to a const loop binding', () => {
      // `const` kinds are recorded against the scope object on `EvalState`, so
      // this also pins that the head's declaration bound into the scope this
      // visitor pushed rather than somewhere the write site cannot find.
      expect(() => runOn('for (const i = 0; i < 3; i++) { i }', contextOf()))
        .toThrow('Assignment to constant variable "i".');
    });

    it('should reject var in the loop head', () => {
      // `var` is out of scope for the phase (§ 2) and the rejection lives in
      // `variableDeclarationVisitor`, which reads `kind` - the dispatcher
      // switches on node *type*, which `var` shares with `let`.
      expect(() => runOn('for (var i = 0; i < 3; i++) { i }', contextOf()))
        .toThrow('Unsupported variable declaration kind: var');
    });

    it('should resolve an outer binding from inside the body', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('let n = 10; for (let i = 0; i < 3; i++) { n + i }'), state))
        .toBe(12);
    });
  });

  describe('scope discipline on a reused context', () => {

    it('should push one scope for the loop with a bare body', () => {
      // **Plan step 5, criterion 3, first form.** `Program` pushes one, the loop
      // a second, and a bare body pushes none - so `2`, one higher than the
      // enclosing statement list's `1`. A `ForStatement` that pushes no scope
      // at all reads `1`.
      const context = contextOf();

      expect(runOn('depth()', context)).toBe(1);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should push one scope for the loop with a block body', () => {
      // **Criterion 3, second form**, and the one the single-form version of
      // this criterion got wrong (§ 0.1's fifth instance): a `for` body is
      // itself a block, so the reading is two pushes above the enclosing list,
      // not one. Stated against the block's own baseline - a plain `{ depth() }`
      // reads `2` at this position, so the loop makes it `3`. The no-push
      // implementation reads `2`, which is what "one higher than the enclosing
      // statement list" would have accepted.
      const context = contextOf();

      expect(runOn('{ depth() }', context)).toBe(2);
      expect(runOn('for (let i = 0; i < 1; i++) { depth() }', context)).toBe(3);
    });

    it('should push one scope per nested loop', () => {
      const context = contextOf();

      expect(runOn('for (let i = 0; i < 1; i++) for (let j = 0; j < 1; j++) depth();', context))
        .toBe(3);
    });

    it('should not raise the depth per iteration', () => {
      // One scope for the whole loop, not one per iteration (§ 3.5). The
      // readings are taken *during* the loop, so this catches a per-iteration
      // push whose pop is missing or misplaced - the depth would climb 3, 4, 5.
      // It does **not** distinguish one-per-loop from
      // one-per-iteration-correctly-popped, which no assertion can; § 3.5
      // explains why nothing needs to.
      const seen: number[] = [];
      const context: EvalContext = EvalContext.fromContext({
        record: () => { seen.push(context.scopes.length); return 0; },
      });

      runOn('for (let i = 0; i < 3; i++) { record() }', context);

      expect(seen).toEqual([3, 3, 3]);
      expect(context.scopes.length).toBe(0);
    });

    it('should pop the scope it pushed', () => {
      const context = contextOf();

      expect(runOn('for (let i = 0; i < 3; i++) { a }', context)).toBe('A');
      expect(context.scopes.length).toBe(0);
    });

    it('should pop the loop scope when the body throws mid-iteration', () => {
      // **Plan step 5, criterion 2**, and the backlog's own precondition
      // argument for A9: a `for` body throwing on iteration 3. The context is
      // reused across the whole block, which is what makes a leak observable -
      // a fixture building its context inline sees a balanced stack whatever
      // the visitor did.
      const context = contextOf();

      expect(() => runOn('for (let i = 0; i < 5; i++) { if (i > 1) { boom() } }', context))
        .toThrow('boom');

      expect(context.scopes.length).toBe(0);
    });

    it('should leave a later evaluation at the right depth after a mid-iteration throw', () => {
      // The arm that fails rather than the count above: a leaked loop scope
      // *binds* `i`, so it would also shadow - but depth is the reading that
      // cannot be answered correctly by accident, and the source read below is
      // the weaker companion kept for the case where a leak breaks resolution
      // too.
      const context = contextOf();

      expect(() => runOn('for (let i = 0; i < 5; i++) { if (i > 1) { boom() } }', context))
        .toThrow('boom');

      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
      expect(runOn('a', context)).toBe('A');
    });

    it('should pop the loop scope when the init throws', () => {
      const context = contextOf();

      expect(() => runOn('for (let i = boom(); i < 3; i++) { i }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should pop the loop scope when the test throws', () => {
      const context = contextOf();

      expect(() => runOn('for (let i = 0; boom(); i++) { i }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should pop the loop scope when the update throws', () => {
      const context = contextOf();

      expect(() => runOn('for (let i = 0; i < 3; boom()) { i }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should pop the loop scope when the dispatcher rejects the body', () => {
      // The throw originates inside `dispatchStatement` rather than inside a
      // child walk, which is a different exit path from the body-throws case.
      //
      // **Not evidence about routing**, and the `if-statement.spec.ts` case of
      // the same shape says why: the body here is a `BlockStatement`, which *is*
      // registered, so `acorn-walk` finds its visitor before its base walker and
      // the rejection happens one level down whether this visitor dispatched or
      // used a raw callback. The bare-body case in `dispatch` below is the
      // routing detector.
      const context = contextOf();

      expect(() => runOn('for (let i = 0; i < 3; i++) { while (false) { 1 } }', context))
        .toThrow('Unsupported statement type: WhileStatement');

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should pop the loop scope when the budget is exhausted', () => {
      // The budget throws from inside the iteration loop, which is inside the
      // `try` - so the exhaustion path is a scope-teardown path too, and it is
      // the one a caller hits by accident rather than by writing `boom()`.
      const context = contextOf();

      expect(() => runOn('for (;;) { 1 }', context, { maxIterations: 20 }))
        .toThrow('Iteration budget exhausted after 20 iterations');

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should leave no residue after repeated throws on one context', () => {
      const context = contextOf();

      for (let i = 0; i < 3; i++) {
        expect(() => runOn('for (let j = 0; j < 5; j++) { if (j > 1) { boom() } }', context))
          .toThrow('boom');
      }

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
      expect(runOn('a', context)).toBe('A');
    });

    it('should unwind every nested loop scope when an inner body throws', () => {
      const context = contextOf();

      expect(() => runOn(
        'for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { boom() }', context))
        .toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('for (let i = 0; i < 1; i++) depth();', context)).toBe(2);
    });

    it('should bind the head under caseInsensitive', () => {
      // `EvalContext.push` copies a plain record into a `Registry` when
      // `caseInsensitive` is set, so a scope write that went through
      // `Object.defineProperty` would define a property on the instance and
      // insert nothing into the map - the binding written and then not found,
      // silently, for this option only. Every other case in this file is
      // case-sensitive and passes through that defect unharmed.
      const state = EvalState.fromContext({}, { caseInsensitive: true });

      expect(evaluate(programOf('for (let i = 0; I < 3; i++) { I }'), state)).toBe(2);
    });
  });

  describe('dispatch', () => {

    it('should reject an unsupported statement type as a bare body', () => {
      // **The detector for the body going through `dispatchStatement` rather
      // than a raw `callback`**, and the only one - the same position that is
      // the only one in `if-statement.spec.ts`, for the same reason. A bare body
      // of an unregistered type is where nothing stands between this visitor and
      // `acorn-walk`'s base walker, which would walk `while` as an expression
      // and strand what it pushed. § 1.7's family gains no fourth member.
      expect(() => evaluate(programOf('for (let i = 0; i < 3; i++) while (false) { 1 }'),
        EvalState.fromContext({}, {})))
        .toThrow('Unsupported statement type: WhileStatement');
    });

    it('should admit an empty statement as a body', () => {
      // `for (…) ;` is the form § 2 names as the reason `EmptyStatement` is in
      // scope at all, reached from this visitor.
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf(`{ 'a'; for (let i = 0; i < 3; i++) ; }`), state);

      expect(value).toBe('a');
      expect(state.result.stack.length).toBe(0);
    });

    it('should admit a declaration in a block body', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('for (let i = 0; i < 3; i++) { let n = i * 2; n }'), state))
        .toBe(4);
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('the iteration budget', () => {

    it('should throw rather than hang on an unbounded loop', () => {
      // § 3.4's whole reason to exist. The default budget is 100,000, which
      // § 3.4 sizes at ~0.2 s - short enough to fail fast rather than time out.
      const state = EvalState.fromContext({}, {});

      expect(() => evaluate(programOf('for (;;) { 1 }'), state))
        .toThrow('Iteration budget exhausted after 100000 iterations');
    });

    it('should honour a configured maxIterations', () => {
      const state = EvalState.fromContext({}, { maxIterations: 7 });

      expect(() => evaluate(programOf('for (let i = 0; i < 100; i++) { i }'), state))
        .toThrow('Iteration budget exhausted after 7 iterations');
    });

    it('should not charge a loop that stays inside its budget', () => {
      const state = EvalState.fromContext({}, { maxIterations: 3 });

      expect(evaluate(programOf('for (let i = 0; i < 3; i++) { i }'), state)).toBe(2);
    });

    it('should spend one budget across nested loops', () => {
      // **The per-evaluation half of § 3.4, criterion 4 arm 1.** A nested pair
      // of 1,000-iteration loops is 1,000,000 iterations and must exhaust the
      // default 100,000. A **per-loop** cap of 100,000 lets both loops run in
      // full and returns a value - which is § 3.4's own argument for why a
      // per-loop cap is not a bound.
      const state = EvalState.fromContext({}, {});

      expect(() => evaluate(
        programOf('for (let i = 0; i < 1000; i++) { for (let j = 0; j < 1000; j++) { 1 } }'),
        state))
        .toThrow('Iteration budget exhausted after 100000 iterations');
    });

    it('should refill the budget for each outermost evaluate on one state', () => {
      // **Criterion 4 arm 2.** Two successive evaluations on the *same*
      // `EvalState`, each spending more than half the budget. A counter that
      // lived for the life of the state - the `createState` + repeated `eval`
      // style `eval-state.ts` documents - throws on the second call.
      const state = EvalState.fromContext({}, { maxIterations: 100 });

      expect(evaluate(programOf('for (let i = 0; i < 60; i++) { i }'), state)).toBe(59);
      expect(evaluate(programOf('for (let i = 0; i < 60; i++) { i }'), state)).toBe(59);
      expect(evaluate(programOf('for (let i = 0; i < 60; i++) { i }'), state)).toBe(59);
    });

    it('should share the remaining budget with a nested walk', () => {
      // **The other half of the same rule, and the one a naive refill breaks.**
      // `arrow-function-expression.ts` calls `evaluate` on this same state, so a
      // refill on *every* entry rather than on the 0 -> 1 transition would hand
      // the arrow body a fresh budget and make an escaped closure an unbounded
      // loop. 5 iterations before the call plus 8 inside it is 13 against a
      // budget of 10.
      const state = EvalState.fromContext({}, { maxIterations: 10 });

      expect(() => evaluate(
        programOf('for (let i = 0; i < 5; i++) { 1 }; (x => { for (let j = 0; j < 8; j++) { 1 } })(0)'),
        state))
        .toThrow('Iteration budget exhausted after 10 iterations');
    });

    it('should give an escaped closure a full budget on each call', () => {
      // **§ 3.4's *second* forcing case for per-entry over per-state**, and it
      // had no spec until step 5's review asked for it: "an escaped closure - an
      // arrow that outlives its walk - would carry that walk's spent budget and
      // throw 'exhausted' on a later call". The arrow is returned from the
      // evaluation, so each call is a fresh outermost `evaluate` on the same
      // state at depth 0 -> 1.
      //
      // Discriminating in the same direction as the repeated-evaluation case
      // above and by a different route: under a per-state budget the second call
      // throws, since 60 + 60 exceeds 100.
      const state = EvalState.fromContext({}, { maxIterations: 100 });

      const fn = evaluate(
        programOf('x => { for (let i = 0; i < 60; i++) { i } }'), state) as () => unknown;

      expect(fn()).toBe(59);
      expect(fn()).toBe(59);
      expect(fn()).toBe(59);
    });

    it('should not carry a spent budget into the next evaluation after a throw', () => {
      // The refill is on entry, so the state that exhausted its budget is usable
      // again - and the `walkDepth` decrement it depends on is in a `finally`.
      const state = EvalState.fromContext({}, { maxIterations: 20 });

      expect(() => evaluate(programOf('for (;;) { 1 }'), state))
        .toThrow('Iteration budget exhausted after 20 iterations');

      expect(evaluate(programOf('for (let i = 0; i < 3; i++) { i }'), state)).toBe(2);
    });

    it('should accept Infinity as a budget', () => {
      // A caller may opt out and own the consequence (§ 3.4). The loop below is
      // longer than the default budget, so this fails against an implementation
      // that clamped or ignored the option.
      const state = EvalState.fromContext({}, { maxIterations: Infinity });

      expect(evaluate(programOf('for (let i = 0; i < 120000; i++) { i }'), state)).toBe(119999);
    });

    it('should charge nothing when no loop runs', () => {
      // § 3.4's cost claim is structural - the counter is decremented inside
      // this visitor's iteration loop and nowhere else - so an expression with
      // no loop spends nothing. A per-node fuel budget would read below 100000
      // here.
      const state = EvalState.fromContext({ a: 1 }, {});

      evaluate(programOf('a + 1; { a; if (a) { a } }'), state);

      expect(state.iterationsRemaining).toBe(100000);
    });

    it('should charge exactly one per iteration', () => {
      const state = EvalState.fromContext({}, {});

      evaluate(programOf('for (let i = 0; i < 7; i++) { i }'), state);

      expect(state.iterationsRemaining).toBe(100000 - 7);
    });
  });

  describe('hooks', () => {

    it('should report the loop node to an after hook with its completion value', () => {
      const state = EvalState.fromContext({}, {});
      const seen: [string, unknown][] = [];
      state.hooks.on('after', 'ForStatement', (e) => seen.push([e.node.type, e.value]));

      evaluate(programOf('for (let i = 0; i < 3; i++) { i }'), state);

      expect(seen).toEqual([['ForStatement', 2]]);
    });

    it('should report the sentinel to an after hook for a zero-iteration loop', () => {
      // The value is read positionally off the result stack, so a loop that ran
      // no iterations reports the sentinel itself - which is why
      // `EMPTY_COMPLETION` is exported for identity comparison (§ 3.1).
      const state = EvalState.fromContext({}, {});
      const seen: unknown[] = [];
      state.hooks.on('after', 'ForStatement', (e) => seen.push(e.value));

      expect(evaluate(programOf('for (let i = 0; i < 0; i++) { i }'), state)).toBeUndefined();

      expect(seen).toEqual([EMPTY_COMPLETION]);
    });

    it('should report one node per visit, iterating the body nodes per iteration', () => {
      const state = EvalState.fromContext({}, {});
      const seen: string[] = [];
      state.hooks.on('after', '*', (e) => seen.push(e.node.type));

      evaluate(programOf('for (let i = 0; i < 2; i++) i;'), state);

      // `i++` contributes one `UpdateExpression` and no `Identifier`:
      // `update-expression.ts` reads `node.argument.name` directly for the
      // identifier form rather than walking it, since walking it would resolve a
      // read where a write target is wanted. Not this visitor's doing, and
      // pinned here because the alternative is a reader deriving the expected
      // stream from source order and finding it wrong.
      expect(seen).toEqual([
        // init: `let i = 0`
        'Literal', 'VariableDeclaration',
        // iteration 1: test, body, update
        'Identifier', 'Literal', 'BinaryExpression',
        'Identifier', 'ExpressionStatement',
        'UpdateExpression',
        // iteration 2
        'Identifier', 'Literal', 'BinaryExpression',
        'Identifier', 'ExpressionStatement',
        'UpdateExpression',
        // the test that ends the loop
        'Identifier', 'Literal', 'BinaryExpression',
        'ForStatement',
        'Program',
      ]);
    });

    // **The two teardown cases below are regression cover for the unwinder, not
    // evidence that this visitor brackets correctly**, and the distinction is
    // worth stating because the file's name invites the stronger reading.
    // `evaluate`'s `catch` calls `unwindTo(mark, …)`, which closes whatever the
    // walk left open whatever the visitor did - so a `ForStatement` that never
    // called `afterVisitor` at all passes both. The bracketing evidence is the
    // hook-stream case above, which pins exactly one `ForStatement` `after` in a
    // walk that completed.

    it('should leave no node open after a walk whose body threw', () => {
      const context = contextOf();
      const state = EvalState.fromContext(context, {});
      state.hooks.on('after', '*', () => undefined);

      expect(() => evaluate(programOf('for (let i = 0; i < 5; i++) { if (i > 1) { boom() } }'),
        state)).toThrow('boom');

      expect(state.hookBookkeeping.open).toEqual([]);
      expect(state.hookBookkeeping.walkBases).toEqual([]);
    });

    it('should leave no node open after a walk the budget ended', () => {
      const state = EvalState.fromContext({}, { maxIterations: 10 });
      state.hooks.on('after', '*', () => undefined);

      expect(() => evaluate(programOf('for (;;) { 1 }'), state))
        .toThrow('Iteration budget exhausted after 10 iterations');

      expect(state.hookBookkeeping.open).toEqual([]);
      expect(state.hookBookkeeping.walkBases).toEqual([]);
    });
  });
});
