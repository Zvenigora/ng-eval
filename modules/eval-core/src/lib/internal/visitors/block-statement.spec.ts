import { AnyNode, BlockStatement } from 'acorn';
import { EMPTY_COMPLETION, EvalContext, EvalState } from '../classes/eval';
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
 * reuse the context.
 */
const runOn = (source: string, context: EvalContext): unknown =>
  evaluate(programOf(source), EvalState.fromContext(context, {}));

/**
 * A reusable context carrying the three things these specs read.
 *
 * `depth` reports `scopes.length` **at call time**, which is the only channel a
 * leaked block scope is observable on in this step - see the teardown block.
 */
const contextOf = (): EvalContext => {
  const context: EvalContext = EvalContext.fromContext({
    a: 'A',
    b: 'B',
    depth: () => context.scopes.length,
    noop: () => undefined,
    boom: () => { throw new Error('boom'); },
  });
  return context;
};

describe('blockStatementVisitor', () => {

  describe('completion value', () => {

    it('should return the last statement value and strand nothing', () => {
      // § 1.1 measured `2` with **1 stranded**: the base walker pushed both
      // values and `evaluate` popped the last one. The value was right by
      // accident, so the count is the half of this that discriminates.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('{ 1; 2 }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should return undefined for an empty block', () => {
      // Passes with no block visitor registered at all, and cannot tell
      // block-pushes-`EMPTY` from block-pushes-`undefined`, since `Program`
      // filters or converts either way. The sentinel is carried by the hook case
      // below; this pins the value a consumer sees.
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('{ }'), state);

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(state.result.stack.length).toBe(0);
    });

    it('should prefer a statement that produced undefined over an earlier value', () => {
      // **The discriminating case for the sentinel** (§ 3.1). `noop()` genuinely
      // produced `undefined` and must win over `'a'`. An implementation marking
      // "produced nothing" with `undefined` returns `'a'` here - and passes the
      // weaker nesting case below, which is why § 3.1 records that the weak case
      // was named as the discriminating one twice before anyone checked it.
      const context = contextOf();

      expect(runOn(`{ 'a'; noop() }`, context)).toBeUndefined();
    });

    it('should keep an earlier value across a nested empty block', () => {
      // **This case does not discriminate, and that is the point of the
      // comment.** "keep the last non-EMPTY" and "keep the last non-undefined"
      // agree on it: the inner `{ }` produced nothing under either reading, so
      // it passes unchanged under `EMPTY === undefined`. It is here as a nesting
      // case, not as evidence about the sentinel - the case above is that.
      const context = contextOf();

      expect(runOn(`{ 'a'; { } }`, context)).toBe('a');
    });

    it('should keep the last non-empty value across an empty statement', () => {
      const context = contextOf();

      expect(runOn(`{ 'a'; ; }`, context)).toBe('a');
    });

    it('should push exactly one value however many statements ran', () => {
      const state = EvalState.fromContext({ a: 'A', b: 'B' }, {});

      expect(evaluate(programOf('{ a; b; 1 + 2 }'), state)).toBe(3);
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('nesting', () => {

    it('should return the innermost last value and strand nothing', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('{ 1; { 2; 3 } }'), state)).toBe(3);
      expect(state.result.stack.length).toBe(0);
    });

    it('should dispatch a nested block rather than reject it', () => {
      // A nested block reaches the dispatcher from `blockStatementVisitor`
      // rather than from `programVisitor`, which is the only thing this case
      // adds over the top-level ones: **both** go through the same `switch`, so
      // without the `BlockStatement` case the whole file raises, top-level rows
      // included. Measured - removing that case reddens ~20 cases here, not one.
      const context = contextOf();

      expect(() => runOn('{ { a } }', context)).not.toThrow();
      expect(runOn('{ { a } }', context)).toBe('A');
    });

    it('should strand nothing at three levels', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('{ 1; { 2; { 3; 4 } } }'), state)).toBe(4);
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('scope discipline on a reused context', () => {

    it('should push exactly one scope for the block', () => {
      // Program pushes one, the block a second. A visitor pushing per statement
      // rather than per block reads 4 here.
      const context = contextOf();

      expect(runOn('{ depth() }', context)).toBe(2);
      expect(runOn('{ 1; 2; depth() }', context)).toBe(2);
    });

    it('should push one scope per nested block', () => {
      const context = contextOf();

      expect(runOn('{ { depth() } }', context)).toBe(3);
    });

    it('should pop the scope it pushed', () => {
      const context = contextOf();

      expect(runOn('{ a }', context)).toBe('A');
      expect(context.scopes.length).toBe(0);
    });

    it('should pop the block scope when the body throws', () => {
      const context = contextOf();

      expect(() => runOn('{ boom() }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
    });

    it('should leave a later evaluation at the right depth after a throw', () => {
      // **The detector for the teardown criterion.** A leaked block scope is
      // empty, and since § 8.1 `get` resolves a scope by *presence* - so an
      // empty scope binds nothing and shadows nothing, and the source-key read
      // below answers 'A' whether or not the scope was popped. Depth is the one
      // channel the leak is observable on until step 3 binds into a block.
      //
      // This is `program.spec.ts`'s "resolves outer keys through the empty
      // program scope" defect a second time: an assertion that cannot reach the
      // condition its comment claims. The source read stays, because a leak that
      // also broke resolution is worth catching, but it is not what fails here.
      const context = contextOf();

      expect(() => runOn('{ boom() }', context)).toThrow('boom');

      expect(runOn('{ depth() }', context)).toBe(2);
      expect(runOn('a', context)).toBe('A');
    });

    it('should pop the block scope when the dispatcher rejects a statement', () => {
      // The dispatcher throws from inside the `try`, which is an exit path the
      // body-throws case does not cover: the throw originates in
      // `dispatchStatement` rather than inside a child walk. `a` is still walked
      // first - the `default` is reached on the second statement, not the first.
      const context = contextOf();

      expect(() => runOn('{ a; while (false) { 1 } }', context))
        .toThrow('Unsupported statement type: WhileStatement');

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });

    it('should leave no residue after repeated throws', () => {
      const context = contextOf();

      for (let i = 0; i < 3; i++) {
        expect(() => runOn('{ boom() }', context)).toThrow('boom');
      }

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
      expect(runOn('a', context)).toBe('A');
    });

    it('should unwind every nested block scope when an inner body throws', () => {
      const context = contextOf();

      expect(() => runOn('{ { { boom() } } }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });

    it('should resolve outer keys through the empty block scope', () => {
      // Not a detector for the push or the pop - an empty scope shadows nothing
      // either way. See the depth cases above for the arm that can fail.
      const context = contextOf();

      expect(runOn('{ a }', context)).toBe('A');
      expect(runOn('{ { b } }', context)).toBe('B');
    });

    it('should resolve through a block under caseInsensitive', () => {
      // A resolution guard, and honestly not a detector for the scope being
      // built with the walk's `options` (§ 3.2): nothing binds into a block
      // scope until step 3, so an omitted `st.options` is unobservable here.
      // What it does catch is a block scope that broke case-insensitive
      // resolution of the *enclosing* context.
      const context = EvalContext.fromContext({ a: 'A' }, { caseInsensitive: true });
      const state = EvalState.fromContext(context, { caseInsensitive: true });

      expect(evaluate(programOf('{ A }'), state)).toBe('A');
    });
  });

  describe('the block-bodied arrow function', () => {

    it('should return the block completion value', () => {
      // § 8.3's divergence, in the exact form a reader will look for - and it
      // returns `1` *today* as well, because the base walker pushes the one
      // value and the inner `evaluate` pops it. Retained as documentation of the
      // settled behaviour; the case below is the one that can fail.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('(x => { 1 })(0)'), state)).toBe(1);
    });

    it('should strand nothing from a multi-statement arrow body', () => {
      // **The detector.** Measured before this step: `2` with **1 stranded**.
      // The value was already right, so an assertion on it alone passes against
      // an implementation with no block visitor at all.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('(x => { 1; 2 })(0)'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should return undefined for an empty arrow body', () => {
      // Pins `x => { }` and nothing more. It is **not** evidence for § 3.1's
      // rule-4 siting, which an earlier comment here claimed: move the
      // conversion into `Program` and this still passes, because the sentinel
      // coming back from the inner `evaluate` is filtered again by
      // `program.ts`'s own `value !== EMPTY_COMPLETION` test and converted
      // there. The case below is the one that can tell the two sitings apart.
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('(x => { })(0)'), state);

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(state.result.stack.length).toBe(0);
    });

    it('should not leak the sentinel out of an empty arrow body in expression position', () => {
      // **The detector for § 3.1's rule 4.** An array literal holds whatever the
      // call pushed, so `Program`'s filter never sees it. With the conversion at
      // the walk boundary the element is `undefined`; move it into `Program` -
      // the draft § 3.1 records and rejects - and the element is the sentinel
      // itself, handed to a consumer. Measured: `[undefined]` today.
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('[(x => { })(0)]'), state) as unknown[];

      expect(value).toEqual([undefined]);
      expect(value[0]).not.toBe(EMPTY_COMPLETION);
    });

    it('should throw from the dispatcher for a statement type it rejects in an arrow body', () => {
      // **The behavioural change on this shipped path that the value cases miss**
      // (§ 3.6.3, and § 5's row). Before step 2 the base walker walked the block
      // and these returned a stranded value; measured, with the visitor
      // unregistered: `while` and `if` both yielded `1`, and `let` yielded
      // `undefined`. At the top level they already threw in step 1, so this is
      // the first step at which they throw from *inside an expression*.
      //
      // The measurement covers three arms and one is left: step 3 moved the
      // `let` arm and step 4 the `if` arm to the returning cases below, as each
      // was admitted. `while` is permanent per § 2, so this case does not shrink
      // further.
      const state = () => EvalState.fromContext({}, {});

      expect(() => evaluate(programOf('(x => { while (false) { 1 } })(0)'), state()))
        .toThrow('Unsupported statement type: WhileStatement');
    });

    it('should evaluate an if in an arrow body, which step 4 admitted', () => {
      // The `if` arm of the row above, moved rather than dropped - the same
      // treatment step 3 gave the `let` arm. Measured before step 2:
      // `(x => { if (true) { 1 } })(0)` returned `1` from the base walker's
      // stranded push; it threw `Unsupported statement type: IfStatement` for
      // steps 2 and 3; and it now returns `1` again, this time as a rule.
      //
      // **So the net over the phase is no change in this value**, and step 6's
      // CHANGELOG must not read it as one - § 5 records the same correction for
      // the block-bodied arrow's completion values, where a draft claimed a
      // change that measurement did not support. What is *not* covered by the
      // value is the untaken branch, which is `if-statement.spec.ts`'s subject;
      // the stranded count is asserted here because it is the half a value
      // assertion never reaches.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('(x => { if (true) { 1 } })(0)'), state)).toBe(1);
      expect(state.result.stack.length).toBe(0);
    });

    it('should evaluate a declaration in an arrow body, which step 3 admitted', () => {
      // The `let` arm of the row above, moved rather than dropped. It measured
      // `undefined` before step 2 (the base walker bound nothing), threw
      // `Unsupported statement type: VariableDeclaration` for one step, and now
      // returns the binding - so the block-bodied arrow reaches step 3's work
      // through `arrow-function-expression.ts`'s `evaluate` call on this node,
      // not through `Program`.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('(x => { let y = 1; y })(0)'), state)).toBe(1);
      expect(state.result.stack.length).toBe(0);
    });

    it('should keep the context balanced across a block-bodied arrow', () => {
      const context = contextOf();

      expect(runOn('(x => { x; depth() })(1)', context)).toBe(3);
      expect(context.scopes.length).toBe(0);
    });

    it('should pop both scopes when a block-bodied arrow throws', () => {
      // Two pushes on the way in - the arrow's parameter scope and the block's -
      // and the arrow body re-enters `evaluate`, which rethrows.
      const context = contextOf();

      expect(() => runOn('(x => { boom() })(1)', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });
  });

  describe('hooks', () => {

    it('should report the sentinel to an after hook for an empty block', () => {
      // The value is read positionally off the result stack, so a statement that
      // produced nothing reports the sentinel itself. Recognised by identity
      // against the exported const, which is what it is exported for (§ 3.1).
      const state = EvalState.fromContext({}, {});
      const seen: unknown[] = [];
      state.hooks.on('after', 'BlockStatement', (e) => seen.push(e.value));

      expect(evaluate(programOf('{ }'), state)).toBeUndefined();

      expect(seen).toEqual([EMPTY_COMPLETION]);
      expect(seen[0]).not.toBeUndefined();
    });

    it('should report the completion value to an after hook', () => {
      const state = EvalState.fromContext({}, {});
      const seen: unknown[] = [];
      state.hooks.on('after', 'BlockStatement', (e) => seen.push(e.value));

      evaluate(programOf('{ 1; 2 }'), state);

      expect(seen).toEqual([2]);
    });

    it('should be visible to hooks rather than handled by the base walker', () => {
      const state = EvalState.fromContext({}, {});
      const seen: string[] = [];
      state.hooks.on('before', 'BlockStatement', (e) => seen.push(e.node.type));

      evaluate(programOf('{ { 1 } }'), state);

      expect(seen).toEqual(['BlockStatement', 'BlockStatement']);
    });

    it('should leave no node open when its body throws', () => {
      const state = EvalState.fromContext(contextOf(), {});
      state.hooks.on('after', '*', () => undefined);

      expect(() => evaluate(programOf('{ boom() }'), state)).toThrow('boom');

      expect(state.hookBookkeeping.open).toEqual([]);
      expect(state.hookBookkeeping.walkBases).toEqual([]);
    });
  });

  describe('trace', () => {

    it('should record one trace entry per block node', () => {
      const state = EvalState.fromContext({ a: 'A' }, {});

      evaluate(programOf('{ a }'), state);

      expect(state.result.trace.map((item) => item.type))
        .toEqual(['Identifier', 'ExpressionStatement', 'BlockStatement', 'Program']);
    });
  });
});

/**
 * Guards the fixture rather than the visitor: `{ 1; 2 }` is a block only in
 * statement position, and a source that stopped parsing to a `BlockStatement`
 * would make every assertion above vacuous.
 */
describe('the block fixture', () => {

  it('should parse a braced statement list to a block, not an object', () => {
    const program = programOf('{ 1; 2 }') as { body: BlockStatement[] };

    expect(program.body[0].type).toBe('BlockStatement');
  });
});
