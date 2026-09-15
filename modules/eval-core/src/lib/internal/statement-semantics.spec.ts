import { TestBed } from '@angular/core/testing';
import { AnyNode } from 'acorn';
import { EvalService, ParserService } from '../actual/services';
import { Context } from './classes/common';
import { EMPTY_COMPLETION, defaultParserOptions } from './classes/eval';
import { evaluate } from './functions';

/**
 * Every row of the Phase 2 plan's § 1.1 table, pinned.
 *
 * **This spec is the only detector for the plan's risk 1.** Statement support
 * changes what twelve already-working expressions evaluate to, and step 6's
 * `CHANGELOG.md` migration note is transcribed *from here* rather than from the
 * plan: the table in the plan came from a scratch script that no longer exists,
 * and a row that lands on a third value - neither the old one nor the intended
 * one - would otherwise ship with a document asserting otherwise.
 *
 * So every row is present in every step of the phase, at one of two states:
 * **its final value**, or **the dispatcher's throw**, tagged with the step that
 * changes it. A row quietly dropped because it does not work yet is the failure
 * this spec exists to prevent.
 *
 * ---
 *
 * **The harness parses with `extractExpressions: false`, and that is
 * load-bearing.** `ParserService` is the more natural-looking entry point and
 * it overrides that option to `true`, in which case `parse` returns the *bare
 * expression* of a single-`ExpressionStatement` program and **`undefined` for
 * everything else** - every multi-statement source, and every source whose one
 * statement is a declaration or a block. `evaluate(undefined, state)` returns
 * `undefined` without walking.
 *
 * A version of this spec written through `ParserService.parse(expr)` therefore
 * measures `undefined` for nine of these twelve rows, throws nothing, and
 * **reports green** - including against an implementation that never registered
 * a statement visitor at all. If you change how this file obtains its AST, check
 * that the throwing rows still throw: that is the assertion that proves the walk
 * happened. `EvalService` sets `defaultParserOptions` on itself for this reason,
 * so the rows below match what a consumer of that service actually gets.
 *
 * "Stranded" is `state.result.stack.length` once `evaluate` has returned: the
 * values a walk pushed that nothing popped, since `evaluate` pops exactly one.
 * The count is asserted alongside the value because for two of these rows the
 * *value* was already right by accident - `1; 2; 3` returned `3` with two
 * stranded values, because `Stack.pop` happens to return the last thing pushed
 * and the last statement happens to be walked last. Asserting only the value
 * would pass against a `Program` that never popped per statement.
 */
describe('statement semantics (plan § 1.1)', () => {
  let service: EvalService;
  let parserService: ParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    parserService = TestBed.inject(ParserService);
  });

  /** Parses to the whole `Program`, the way `EvalService` does. */
  const programOf = (source: string): AnyNode | undefined =>
    parserService.parse(source, defaultParserOptions) as AnyNode | undefined;

  /** Evaluates `source` and reports both the value and the stranded count. */
  const run = (source: string, context?: Context) => {
    const state = service.createState(context);
    const value = evaluate(programOf(source), state);
    return { value, stranded: state.result.stack.length };
  };

  describe('rows that return a value', () => {

    it('should evaluate a lone expression, as it always did', () => {
      expect(run('1 + 2')).toEqual({ value: 3, stranded: 0 });
    });

    it('should return the last statement value and strand nothing', () => {
      // § 1.1: returned 3 with **2 stranded**. The value was right by accident.
      expect(run('1; 2; 3')).toEqual({ value: 3, stranded: 0 });
    });

    it('should return the last statement value for identifier statements', () => {
      // § 1.1: returned 'B' with **1 stranded**.
      expect(run('a; b', { a: 'A', b: 'B' })).toEqual({ value: 'B', stranded: 0 });
    });

    it('should return the block completion value and strand nothing', () => {
      // § 1.1: returned 2 with **1 stranded**. Moved out of the rejected table
      // by step 2. The value was already right, so this row is carried by the
      // stranded count alone - the same accident as `1; 2; 3` above, and the
      // reason both halves are asserted together.
      expect(run('{ 1; 2 }')).toEqual({ value: 2, stranded: 0 });
    });

    it('should return undefined for an empty block', () => {
      // Not a § 1.1 row - added by step 2 so that the sentinel sweep below has
      // an empty-block row to name, rather than listing a source that appears
      // nowhere else in this file.
      expect(run('{ }')).toEqual({ value: undefined, stranded: 0 });
    });

    it('should take the branch the test selects', () => {
      // § 1.1: returned **2** with **2 stranded** - the base walker visited both
      // branches and the `else` value was pushed last, so the wrong branch won.
      // Moved out of the rejected table by step 4.
      //
      // The value is the *smaller* half of this row. Its companion is the same
      // row's real content, and lives in `if-statement.spec.ts`: the untaken
      // branch is not walked, so its calls and assignments no longer run. This
      // file measures values and stranded counts, which a both-branches
      // implementation with a selector bolted on would satisfy.
      expect(run('if (a) { 1 } else { 2 }', { a: true })).toEqual({ value: 1, stranded: 0 });
      expect(run('if (a) { 1 } else { 2 }', { a: false })).toEqual({ value: 2, stranded: 0 });
    });

    it('should produce nothing when no branch runs', () => {
      // Not a § 1.1 row - added by step 4 so the sentinel sweep below has an
      // untaken-`if` row to name.
      expect(run('if (false) { 1 }')).toEqual({ value: undefined, stranded: 0 });
    });

    it('should run a classic for loop and keep its last body value', () => {
      // § 1.1: returned **NaN** with **3 stranded**. The base walker walked the
      // declarator's `id` as a read, so `i` resolved to nothing and `i < 3` was
      // `undefined < 3` - false - while three head values were left on the
      // stack. Moved out of the rejected table by step 5.
      //
      // The value is only half of this row; the other half is that `i` is not
      // written into the caller's context, which `for-statement.spec.ts` asserts
      // against a source object. This file measures values and stranded counts.
      expect(run('for (let i = 0; i < 3; i++) { i }')).toEqual({ value: 2, stranded: 0 });
    });

    it('should resolve a let binding in a later statement', () => {
      // § 1.1: returned **NaN**. The base walker stranded the initialiser and
      // `x` resolved to nothing, so `x + 1` added 1 to undefined. Moved out of
      // the rejected table by step 3, and the only row of this file whose old
      // value was neither right-by-accident nor a stranded count.
      expect(run('let x = 1; x + 1')).toEqual({ value: 2, stranded: 0 });
    });

    it('should resolve a const binding', () => {
      // § 1.1: returned **undefined**.
      expect(run('const y = 2; y')).toEqual({ value: 2, stranded: 0 });
    });

    it('should produce nothing for a declaration alone', () => {
      // § 1.1: returned **undefined** with 0 stranded, which is the value this
      // row still has - the change is that it is now a rule (a declaration
      // pushes the empty-completion sentinel) rather than the base walker
      // happening to leave nothing behind. The sweep at the end of this file is
      // what pins that it is the sentinel and not `undefined` on the stack.
      expect(run('let x = 1')).toEqual({ value: undefined, stranded: 0 });
    });

    it('should bind a destructuring declaration', () => {
      // § 1.1: returned **undefined** and bound nothing. The value is unchanged
      // and the binding is the row: `p` and `q` did not resolve before, which is
      // why the second half is asserted here rather than left to the visitor
      // spec.
      expect(run('let [p, q] = arr', { arr: [1, 2] }))
        .toEqual({ value: undefined, stranded: 0 });
      expect(run('let [p, q] = arr; p + q', { arr: [1, 2] }))
        .toEqual({ value: 3, stranded: 0 });
    });

    it('should reject var, which no longer reaches the dispatcher default', () => {
      // Not a § 1.1 row. `var` stays out of this phase (§ 2, question 8.2), and
      // the rejection moved: the dispatcher switches on node *type*, and `var`
      // shares `VariableDeclaration` with `let`, so admitting one admitted both.
      expect(() => run('var x = 1'))
        .toThrow('Unsupported variable declaration kind: var');
    });
  });

  describe('rows that throw the dispatcher default', () => {

    // Each row names the node type the dispatcher rejects and the step that
    // replaces the throw with a value. `while` and `function` are out of scope
    // for the whole phase (plan § 2), so their throw is the final answer.
    // One object per row rather than a tuple: `it.each` reads a callback
    // parameter the row does not supply as a `done` callback, so a table with
    // an optional trailing context silently turns every short row into a test
    // that waits five seconds and fails on timeout.
    const rejected: { source: string, type: string, step: string, context?: Context }[] = [
      { source: 'while (false) { 1 }', type: 'WhileStatement', step: 'out of scope (§ 2)' },
      { source: 'function f() { return 1 }', type: 'FunctionDeclaration', step: 'out of scope (§ 2)' },
    ];

    it.each(rejected)('should reject $source ($type, $step)', ({ source, type, context }) => {
      expect(() => run(source, context))
        .toThrow(`Unsupported statement type: ${type}`);
    });
  });

  describe('the empty-completion sentinel', () => {

    it('should return undefined rather than the sentinel for an empty program', () => {
      // A whitespace-only source parses to a `Program` with an empty body, so
      // this walks and converts. `''` is falsy and returns before parsing, so
      // it cannot exercise the conversion - see the separate row below.
      const { value, stranded } = run(' ');

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(stranded).toBe(0);
    });

    it('should return undefined for a program of only empty statements', () => {
      const { value, stranded } = run(';;');

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(stranded).toBe(0);
    });

    it('should keep a produced undefined over an earlier value', () => {
      // `EMPTY` is not `undefined`: this statement produced a value and it
      // wins. An implementation that marked "produced nothing" with
      // `undefined` returns 'A' here, and passes the row below.
      expect(run('a; noop()', { a: 'A', noop: () => undefined }))
        .toEqual({ value: undefined, stranded: 0 });
    });

    it('should keep the last non-empty value across an empty statement', () => {
      // `EmptyStatement` exists only because the dispatcher's default throws.
      expect(run('a;;b', { a: 'A', b: 'B' })).toEqual({ value: 'B', stranded: 0 });
      expect(run('a;;', { a: 'A' })).toEqual({ value: 'A', stranded: 0 });
    });

    it('should return undefined for the empty expression', () => {
      expect(service.simpleEval('')).toBeUndefined();
    });

    it('should never return the sentinel from any row above', () => {
      const returning = ['1 + 2', '1; 2; 3', 'a; b', '{ 1; 2 }', '{ }', ' ', ';;', 'a;;b',
        'let x = 1', 'let x = 1; x + 1', 'const y = 2; y',
        // Step 4's rows. `if (a) { }` and `if (a) ;` reach the conversion by a
        // *taken* branch whose own completion value is the sentinel, which is a
        // second route to it and not only a second source.
        //
        // **This sweep discriminates nothing about how the sentinel is handled**,
        // and an earlier comment here claimed one of these rows caught a
        // normalising implementation. Measured: normalise a taken branch's
        // sentinel to `undefined` and every row here stays green, because
        // `undefined` is not the sentinel either. It is a leak guard - the
        // sentinel must never reach a consumer by any route - and
        // `if-statement.spec.ts`'s "should propagate the sentinel from a taken
        // branch that produced nothing" is the one assertion that goes red,
        // measured as the only one.
        'if (a) { 1 } else { 2 }', 'if (false) { 1 }', 'if (a) { }', 'if (a) ;'];

      for (const source of returning) {
        expect(run(source, { a: 'A', b: 'B' }).value).not.toBe(EMPTY_COMPLETION);
      }
    });
  });
});
