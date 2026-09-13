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
      { source: 'let x = 1', type: 'VariableDeclaration', step: 'step 3' },
      { source: 'let x = 1; x + 1', type: 'VariableDeclaration', step: 'step 3' },
      { source: 'const y = 2; y', type: 'VariableDeclaration', step: 'step 3' },
      { source: 'let [p, q] = arr', type: 'VariableDeclaration', step: 'step 3', context: { arr: [1, 2] } },
      { source: 'if (a) { 1 } else { 2 }', type: 'IfStatement', step: 'step 4', context: { a: true } },
      { source: 'for (let i = 0; i < 3; i++) { i }', type: 'ForStatement', step: 'step 5' },
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
      const returning = ['1 + 2', '1; 2; 3', 'a; b', '{ 1; 2 }', '{ }', ' ', ';;', 'a;;b'];

      for (const source of returning) {
        expect(run(source, { a: 'A', b: 'B' }).value).not.toBe(EMPTY_COMPLETION);
      }
    });
  });
});
