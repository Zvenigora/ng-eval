import { TestBed } from '@angular/core/testing';
import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { Context } from '../classes/common';
import { evaluate, parse } from '../functions';
import { EvalService } from '../../actual/services/eval.service';

/**
 * A sequence evaluates each expression in order and its value is the last
 * one's, and it leaves exactly that one value on the stack.
 *
 * Up to 0.12.0 no visitor was registered for the node, so `acorn-walk`'s base
 * walker walked its expressions: each pushed its value and nothing popped the
 * ones before the last (`docs/backlog-retired.md` A37). The value read was
 * right, since each consumer pops only the top, but the leftovers stayed on the
 * stack, accumulated on a reused state, and no hook saw the node. Every case
 * below but Q4 is red against that walk. Q4 is green against both: it pins the
 * order and the single evaluation the visitor keeps.
 */
describe('sequenceExpressionVisitor', () => {

  /** Parses to the whole `Program`, the way `EvalService` does. */
  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

  const stateOf = (context: Context = {}): EvalState => EvalState.fromContext(context, {});

  it('Q1: should give the last value and leave the stack empty', () => {
    const state = stateOf();

    expect(evaluate(programOf('(0, 1)'), state)).toBe(1);
    expect(state.result.stack.length).toBe(0);
  });

  it('Q2: should leave the stack empty for a nested sequence', () => {
    // The base walker left two entries here: one per sequence.
    const state = stateOf();

    expect(evaluate(programOf('((1, 2), 3)'), state)).toBe(3);
    expect(state.result.stack.length).toBe(0);
  });

  it('Q3: should leave the stack empty as an element and as an argument', () => {
    const asElement = stateOf();

    expect(evaluate(programOf('[(1, 2), 3]'), asElement)).toEqual([2, 3]);
    expect(asElement.result.stack.length).toBe(0);

    const f = jest.fn();
    const asArgument = stateOf({ f });

    evaluate(programOf('f((1, 2), 3)'), asArgument);

    expect(f).toHaveBeenCalledWith(2, 3);
    expect(asArgument.result.stack.length).toBe(0);
  });

  it('Q4: should evaluate each expression once, left to right', () => {
    // Right to left, `x + 1` would read 0 and give 1.
    const ordered: Context = { x: 0 };

    expect(evaluate(programOf('(x = 1, x + 1)'), stateOf(ordered))).toBe(2);

    // An expression evaluated twice would leave `n` past 2. `x = 1` above
    // cannot show that: assigning 1 twice changes nothing.
    const counted: Context = { n: 0 };

    expect(evaluate(programOf('(n++, n++)'), stateOf(counted))).toBe(1);
    expect(counted['n']).toBe(2);
  });

  it('Q5: should show one node to hooks, the after event carrying the last value', () => {
    const state = stateOf();
    const before: unknown[] = [];
    const after: unknown[] = [];
    state.hooks.on('before', 'SequenceExpression', (e) => before.push(e.node.type));
    state.hooks.on('after', 'SequenceExpression', (e) => after.push(e.value));

    evaluate(programOf('(0, 1)'), state);

    expect(before).toEqual(['SequenceExpression']);
    expect(after).toEqual([1]);
    expect(state.result.trace
      .filter((item) => item.type === 'SequenceExpression')
      .map((item) => item.value)).toEqual([1]);
  });

  it('Q6: should leave nothing behind on a reused state', () => {
    // The `createState` + repeated `eval` style: one state, three walks. The
    // base walker's leftovers accumulated here, one per walk.
    TestBed.configureTestingModule({});
    const service = TestBed.inject(EvalService);
    const state = service.createState({});

    expect(service.eval('(0, 1)', state)).toBe(1);
    expect(service.eval('(0, 1)', state)).toBe(1);
    expect(service.eval('(0, 1)', state)).toBe(1);

    expect(state.result.stack.length).toBe(0);
  });
});
