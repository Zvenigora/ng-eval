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
    expect(result.trace.size).toEqual(5);
    expect(result.context).toBeDefined();
    expect(result.context.get('a')).toEqual(10);
    expect(result.context.toObject()).toMatchObject(context);
    expect(result.duration).toBeGreaterThan(0);
  });

});
