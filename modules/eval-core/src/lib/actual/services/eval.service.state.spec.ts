import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalResult } from '../../internal/classes/eval';

describe('EvalService', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should evaluate a string expression', () => {
    const expression = '2 + 3 * a';
    const context = { a: 10 };
    const state = service.createState(context);
    const value = service.eval(expression, state);
    const result: EvalResult = state.result;
    expect(value).toEqual(32);
    expect(result.value).toEqual(32);
    expect(result.isError).toBeFalsy();
    expect(result.isUndefined).toBeFalsy();
    expect(result.isSuccess).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
    expect(result.stack).toBeDefined();
    // 5 before Phase 2 step 1, 7 after: `Program` and `ExpressionStatement` are
    // visitors now rather than nodes acorn-walk's base walker passed through,
    // and every visitor traces what it pushes. This is a behavioural change to
    // a published surface for *every* expression, statements or not - see the
    // step's entry in `CHANGELOG.md`.
    expect(result.trace.length).toEqual(7);
    expect(result.context).toBeDefined();
    expect(result.context.get('a')).toEqual(10);
    expect(result.context.toObject()).toMatchObject(context);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should trace the evaluation', () => {
    const expression = '2 + 3 * a';
    const context = { a: 10 };
    const state = service.createState(context);
    const value = service.eval(expression, state);
    const result: EvalResult = state.result;

    // The last two entries are Phase 2 step 1's: the statement layer is walked
    // rather than passed through, so the completion value is traced as it
    // bubbles out of the expression statement and then the program. Both carry
    // the same value the expression produced, which is what a completion value
    // is.
    const expected = [
      { type: 'Literal', value: 2, expression: '2' },
      { type: 'Literal', value: 3, expression: '3' },
      { type: 'Identifier', value: 10, expression: 'a' },
      { type: 'BinaryExpression', value: 30, expression: '3 * a' },
      { type: 'BinaryExpression', value: 32, expression: '2 + 3 * a' },
      { type: 'ExpressionStatement', value: 32, expression: '2 + 3 * a' },
      { type: 'Program', value: 32, expression: '2 + 3 * a' }
    ]

    expect(value).toEqual(32);
    expect(result.trace.length).toEqual(7);
    expect(result.trace).toEqual(expected);
  });

});
