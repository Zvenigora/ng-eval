import { AnyNode } from 'acorn';
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
 * instance - which is what makes a scope left on the stack observable at all.
 */
const runOn = (source: string, context: EvalContext): unknown =>
  evaluate(programOf(source), EvalState.fromContext(context, {}));

describe('ifStatementVisitor', () => {

  describe('branch selection', () => {

    it('should take the consequent and strand nothing', () => {
      // § 1.1's row, and the headline behavioural change: measured **`2`** before
      // Phase 2 with 2 stranded, because the base walker visited *both* branches
      // and the `else` value was pushed last. Since step 1 it throws from the
      // dispatcher's `default`.
      //
      // **Alone, this case does not discriminate** - a visitor that walks both
      // branches and then selects by the test passes it. The "untaken branch"
      // block below is the other half of the detector; see the plan's step 4,
      // criterion 1.
      const state = EvalState.fromContext({ a: true }, {});

      expect(evaluate(programOf('if (a) { 1 } else { 2 }'), state)).toBe(1);
      expect(state.result.stack.length).toBe(0);
    });

    it('should take the alternate and strand nothing', () => {
      const state = EvalState.fromContext({ a: false }, {});

      expect(evaluate(programOf('if (a) { 1 } else { 2 }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should coerce a truthy test rather than require a boolean', () => {
      const state = EvalState.fromContext({ a: 'A' }, {});

      expect(evaluate(programOf(`if (a) { 'yes' } else { 'no' }`), state)).toBe('yes');
      expect(evaluate(programOf(`if (0) { 'yes' } else { 'no' }`), EvalState.fromContext({}, {})))
        .toBe('no');
    });

    it('should take a bare statement branch, not only a block', () => {
      // `if (a) 1` parses its consequent as an `ExpressionStatement`, which
      // reaches the dispatcher by a different `case` than `BlockStatement` does.
      const state = EvalState.fromContext({ a: true }, {});

      expect(evaluate(programOf('if (a) 1; else 2'), state)).toBe(1);
      expect(state.result.stack.length).toBe(0);
    });

    it('should return undefined when no branch runs', () => {
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('if (false) { 1 }'), state);

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(state.result.stack.length).toBe(0);
    });

    it('should push exactly one value with no alternate and a taken consequent', () => {
      const state = EvalState.fromContext({ a: true }, {});

      expect(evaluate(programOf('if (a) { 7 }'), state)).toBe(7);
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('the untaken branch does not run', () => {

    it('should not call a function in the untaken alternate', () => {
      // **The criterion the value cases miss** (plan step 4, criterion 2). The
      // implementation this catches is the pre-Phase-2 one with a selector
      // bolted on: walk both branches, then pick the right value. It returns
      // `1` above and calls `taken` *and* `skipped` here.
      //
      // The setup is what makes the condition reachable: both functions are in
      // the evaluation context, so both branches are walkable and both calls are
      // observable. A fixture whose untaken branch held a literal could not
      // fail.
      const taken = jest.fn(() => 'T');
      const skipped = jest.fn(() => 'S');

      const value = evaluate(
        programOf('if (a) { taken() } else { skipped() }'),
        EvalState.fromContext({ a: true, taken, skipped }, {}));

      expect(value).toBe('T');
      expect(taken).toHaveBeenCalledTimes(1);
      expect(skipped).not.toHaveBeenCalled();
    });

    it('should not call a function in the untaken consequent', () => {
      const taken = jest.fn(() => 'T');
      const skipped = jest.fn(() => 'S');

      const value = evaluate(
        programOf('if (a) { skipped() } else { taken() }'),
        EvalState.fromContext({ a: false, taken, skipped }, {}));

      expect(value).toBe('T');
      expect(taken).toHaveBeenCalledTimes(1);
      expect(skipped).not.toHaveBeenCalled();
    });

    it('should not run an assignment in the untaken branch', () => {
      // The second half of criterion 2's "a `jest.fn` from the context, or an
      // assignment". `seen` is a source key, so the write would land in the
      // caller's own object and outlive the walk - the branch leaves a trace
      // that survives the evaluation rather than one a mock recorded.
      const source = { a: false, seen: 'before' };
      const context = EvalContext.fromContext(source);

      expect(runOn(`if (a) { seen = 'after' }`, context)).toBeUndefined();

      expect(source.seen).toBe('before');
      expect(runOn('seen', context)).toBe('before');
    });

    it('should not throw from the untaken branch', () => {
      // A third observation channel, and **weaker than the two mock cases, not
      // stronger** - an earlier comment here had the relation inverted. It
      // claimed to catch a visitor that walks both branches inside a `try` and
      // swallows the loser's throw, on the reasoning that such a visitor would
      // pass the assignment case. It would not: that fixture's untaken branch
      // holds an assignment and no throw, so there is nothing to swallow and the
      // write lands in the caller's object. Every implementation this case
      // catches is caught by the mocks; the reverse does not hold.
      const context = EvalContext.fromContext({
        a: true,
        boom: () => { throw new Error('boom'); },
      });

      expect(runOn('if (a) { 1 } else { boom() }', context)).toBe(1);
    });

    it('should not walk the untaken branch of a nested if', () => {
      const outer = jest.fn(() => 'O');
      const inner = jest.fn(() => 'I');

      const value = evaluate(
        programOf('if (a) { if (b) { inner() } else { outer() } }'),
        EvalState.fromContext({ a: true, b: true, inner, outer }, {}));

      expect(value).toBe('I');
      expect(outer).not.toHaveBeenCalled();
    });
  });

  describe('else if chains', () => {

    it('should select the first matching arm', () => {
      const state = () => EvalState.fromContext({}, {});

      expect(evaluate(programOf(`if (1 > 2) { 'a' } else if (2 > 1) { 'b' } else { 'c' }`), state()))
        .toBe('b');
      expect(evaluate(programOf(`if (2 > 1) { 'a' } else if (2 > 1) { 'b' } else { 'c' }`), state()))
        .toBe('a');
      expect(evaluate(programOf(`if (1 > 2) { 'a' } else if (1 > 2) { 'b' } else { 'c' }`), state()))
        .toBe('c');
    });

    it('should call only the matching arm in a three-arm chain', () => {
      // An `else if` alternate is itself an `IfStatement`, so this arm re-enters
      // this visitor rather than arriving from a statement list - worth pinning,
      // and **not evidence about routing**, which is the disclosure the
      // `while`-in-a-block case below carries and this one was missing. Because
      // `IfStatement` is registered, `acorn-walk` finds this visitor before its
      // base walker, so a raw `callback` reaches the chained arm exactly as
      // `dispatchStatement` does. Measured: the raw-callback probe reddened the
      // bare-body case only.
      const first = jest.fn(() => 1);
      const second = jest.fn(() => 2);
      const third = jest.fn(() => 3);

      const value = evaluate(
        programOf('if (a) { first() } else if (b) { second() } else { third() }'),
        EvalState.fromContext({ a: false, b: true, first, second, third }, {}));

      expect(value).toBe(2);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
      expect(third).not.toHaveBeenCalled();
    });

    it('should return undefined when no arm of a chain matches', () => {
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf(`if (false) { 'a' } else if (false) { 'b' }`), state);

      expect(value).toBeUndefined();
      expect(state.result.stack.length).toBe(0);
    });

    it('should strand nothing across a four-arm chain', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(
        programOf(`if (false) { 1 } else if (false) { 2 } else if (true) { 3 } else { 4 }`), state))
        .toBe(3);
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('the empty-completion sentinel', () => {

    it('should keep an earlier value when no branch runs', () => {
      // The plan's own note: this case does **not** discriminate the sentinel.
      // "keep the last non-EMPTY" and "keep the last non-undefined" agree on it,
      // because no branch produced anything under either reading. Here as a
      // completion-value case; the one below is the one that can fail.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf(`{ 'a'; if (false) { 'b' } }`), state)).toBe('a');
    });

    it('should propagate the sentinel from a taken branch that produced nothing', () => {
      // **The discriminating case for this visitor.** A branch *did* run and its
      // completion value is `EMPTY_COMPLETION`, because an empty block pushes the
      // sentinel. An implementation normalising a taken branch's value to
      // `undefined` - or one treating "no value" as `undefined` anywhere on this
      // path - returns `undefined` here and still passes the case above.
      const state = EvalState.fromContext({ a: true }, {});

      expect(evaluate(programOf(`{ 'a'; if (a) { } }`), state)).toBe('a');
    });

    it('should let a taken branch that produced undefined win over an earlier value', () => {
      // The other side of the same distinction: `noop()` genuinely produced
      // `undefined`, so it is not empty and must beat `'a'`. Together with the
      // case above this pins that the visitor propagates its branch's value
      // unchanged rather than mapping between `EMPTY` and `undefined`.
      const context = EvalContext.fromContext({ a: true, noop: () => undefined });

      expect(runOn(`{ 'a'; if (a) { noop() } }`, context)).toBeUndefined();
    });

    it('should never return the sentinel to a consumer', () => {
      // A leak guard, not a discriminator, and the same measurement as the
      // sweep in `statement-semantics.spec.ts`: normalising a taken branch's
      // sentinel to `undefined` leaves this green, because `undefined` is not
      // the sentinel either. The case two above is the one that fails.
      const state = () => EvalState.fromContext({ a: true }, {});

      expect(evaluate(programOf('if (false) { 1 }'), state())).not.toBe(EMPTY_COMPLETION);
      expect(evaluate(programOf('if (a) { }'), state())).not.toBe(EMPTY_COMPLETION);
      expect(evaluate(programOf('if (a) ;'), state())).not.toBe(EMPTY_COMPLETION);
    });

    it('should not leak the sentinel out of an arrow body whose if took no branch', () => {
      // The walk-boundary conversion again (§ 3.1 rule 4), reached through
      // `arrow-function-expression.ts`'s `evaluate` call rather than through
      // `Program`. An array literal holds whatever the call pushed, so
      // `Program`'s own filter never sees it.
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('[(x => { if (false) { 1 } })(0)]'), state) as unknown[];

      expect(value).toEqual([undefined]);
      expect(value[0]).not.toBe(EMPTY_COMPLETION);
    });
  });

  describe('dispatch', () => {

    it('should reject an unsupported statement type in a taken branch', () => {
      // **Not a detector for this visitor's routing, and an earlier comment here
      // said it was.** Measured: replace `dispatchStatement` with a raw
      // `callback` and this stays green, because the branch is a
      // `BlockStatement`, `BlockStatement` *is* registered, and the block's own
      // body dispatch rejects `while` one level down. What it pins is that the
      // rejection reaches inside an `if` at all - a user-facing guarantee worth
      // an assertion, just not this one's stated one. The bare-body case below
      // is the routing detector.
      expect(() => evaluate(programOf('if (a) { while (false) { 1 } }'),
        EvalState.fromContext({ a: true }, {})))
        .toThrow('Unsupported statement type: WhileStatement');
    });

    it('should reject an unsupported statement type as a bare branch body', () => {
      // **The detector for the branch going through `dispatchStatement` rather
      // than a raw `callback`** - and the only one, measured: swapping in a raw
      // callback reddens this case and nothing else in the file. A bare branch
      // body is the one position where no registered statement visitor stands
      // between this visitor and `acorn-walk`'s base walker, so a raw callback
      // walks the declaration as an expression and strands what it pushed.
      // § 1.7's family gains no fourth member.
      expect(() => evaluate(programOf('if (a) function f() { }'),
        EvalState.fromContext({ a: true }, {})))
        .toThrow('Unsupported statement type: FunctionDeclaration');
    });

    it('should not reject an unsupported statement type in the untaken branch', () => {
      // A consequence of not walking it, and a second angle on criterion 2: the
      // untaken branch is not even *type-checked*, because nothing dispatches
      // it. An implementation walking both branches throws here.
      expect(evaluate(programOf('if (a) { 1 } else { while (false) { 2 } }'),
        EvalState.fromContext({ a: true }, {})))
        .toBe(1);
    });

    it('should admit an empty statement as a branch body', () => {
      // `if (x) ;` is the form § 2 names as the reason `EmptyStatement` is in
      // scope at all. It reaches the dispatcher from this visitor.
      const state = EvalState.fromContext({ a: true }, {});

      const value = evaluate(programOf('if (a) ;'), state);

      expect(value).toBeUndefined();
      expect(state.result.stack.length).toBe(0);
    });

    it('should admit a declaration in a block branch', () => {
      const state = EvalState.fromContext({ a: true }, {});

      expect(evaluate(programOf('if (a) { let x = 1; x + 1 }'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should reject var as a bare branch body', () => {
      // `var` parses in a bare branch position where `let` does not, and it is a
      // `VariableDeclaration`, so the dispatcher admits it and the *visitor*
      // rejects it on `kind`. One of the routes by which a declaration could
      // have reached this visitor with no enclosing block scope; the other bare
      // form, `function f() { }`, is the case above and is closed by the
      // dispatcher instead.
      //
      // **This fixture does not measure where the `kind` check sits.** At
      // program level `Program` has already pushed a scope, so `bindingScope`
      // would succeed and the same message would appear with the check below it
      // - an earlier comment claimed the ordering as the thing asserted. The
      // ordering is real (`variable-declaration.ts` rejects above both
      // `beforeVisitor` and `bindingScope`); what is pinned here is the weaker
      // and sufficient claim that `var` never binds by either ordering.
      expect(() => evaluate(programOf('if (a) var x = 1'),
        EvalState.fromContext({ a: true }, {})))
        .toThrow('Unsupported variable declaration kind: var');
    });
  });

  describe('stack and scope discipline', () => {

    // **Every case in this block passes with the visitor unregistered**, and
    // that is a property of the subject rather than a defect in the setup: this
    // visitor pushes no scope, so what these assert is that it does not *break*
    // a balance `Program` and `BlockStatement` keep. There is no implementation
    // of `ifStatementVisitor` that fails them short of one that reaches into
    // `EvalContext`, which is exactly the regression they exist to catch.
    // Measured with the registration removed: 28 red across the suite, none of
    // them here.

    it('should push no scope of its own', () => {
      // `depth` reports `scopes.length` at call time. `Program` pushes one and
      // the branch block a second; a visitor that pushed a scope for the `if`
      // reads 3.
      const context = EvalContext.fromContext({
        a: true,
        depth: () => context.scopes.length,
      });

      expect(runOn('if (a) { depth() }', context)).toBe(2);
      expect(runOn('if (a) depth()', context)).toBe(1);
    });

    it('should leave the context balanced when the test throws', () => {
      const context = EvalContext.fromContext({
        boom: () => { throw new Error('boom'); },
        depth: () => context.scopes.length,
      });

      expect(() => runOn('if (boom()) { 1 }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });

    it('should leave the context balanced when the taken branch throws', () => {
      const context = EvalContext.fromContext({
        a: true,
        boom: () => { throw new Error('boom'); },
        depth: () => context.scopes.length,
      });

      expect(() => runOn('if (a) { boom() }', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });

    it('should leave no residue after repeated throws on one context', () => {
      const context = EvalContext.fromContext({
        a: true,
        boom: () => { throw new Error('boom'); },
        depth: () => context.scopes.length,
      });

      for (let i = 0; i < 3; i++) {
        expect(() => runOn('if (a) { boom() }', context)).toThrow('boom');
      }

      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });

    it('should strand nothing when an earlier statement precedes the if', () => {
      const state = EvalState.fromContext({ a: true, b: 'B' }, {});

      expect(evaluate(programOf('b; if (a) { 1 } else { 2 }; b'), state)).toBe('B');
      expect(state.result.stack.length).toBe(0);
    });
  });

  describe('hooks', () => {

    it('should report the if node to an after hook with its branch value', () => {
      const state = EvalState.fromContext({ a: true }, {});
      const seen: [string, unknown][] = [];
      state.hooks.on('after', 'IfStatement', (e) => seen.push([e.node.type, e.value]));

      evaluate(programOf('if (a) { 1 }'), state);

      expect(seen).toEqual([['IfStatement', 1]]);
    });

    it('should report the sentinel to an after hook when no branch ran', () => {
      // The value is read positionally off the result stack, so an untaken `if`
      // reports the sentinel itself - which is why `EMPTY_COMPLETION` is
      // exported for identity comparison rather than hidden (§ 3.1).
      const state = EvalState.fromContext({}, {});
      const seen: unknown[] = [];
      state.hooks.on('after', 'IfStatement', (e) => seen.push(e.value));

      expect(evaluate(programOf('if (false) { 1 }'), state)).toBeUndefined();

      expect(seen).toEqual([EMPTY_COMPLETION]);
    });

    it('should fire no hook for the untaken branch', () => {
      // The hook stream is the third channel the untaken branch would show up
      // on, after the mock and the assignment - and the only one that reports
      // *nodes* rather than effects, so it also catches a branch walked with
      // every side effect removed.
      const state = EvalState.fromContext({ a: true }, {});
      const seen: string[] = [];
      state.hooks.on('after', '*', (e) => seen.push(e.node.type));

      evaluate(programOf('if (a) { 1 } else { 2 }'), state);

      expect(seen).toEqual([
        'Identifier',
        'Literal',
        'ExpressionStatement',
        'BlockStatement',
        'IfStatement',
        'Program',
      ]);
    });

    it('should leave no node open after a walk whose branch threw', () => {
      const context = EvalContext.fromContext({
        a: true,
        boom: () => { throw new Error('boom'); },
      });
      const state = EvalState.fromContext(context, {});
      state.hooks.on('after', '*', () => undefined);

      expect(() => evaluate(programOf('if (a) { boom() }'), state)).toThrow('boom');

      expect(state.hookBookkeeping.open).toEqual([]);
      expect(state.hookBookkeeping.walkBases).toEqual([]);
    });
  });
});
