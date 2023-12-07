import { TestBed } from '@angular/core/testing';

import { EvalService } from './eval.service';

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
    const result = service.eval(expression, context);
    expect(result).toEqual(32);
  });

  // it('should evaluate an AST expression', () => {
  //   const expression = { type: 'BinaryExpression', operator: '+', left: 2, right: 2 };
  //   const result = service.eval(expression);
  //   expect(result).toEqual(4);
  // });

  // it('should throw an error if evaluation fails', () => {
  //   const expression = '2 / 0';
  //   expect(() => service.eval(expression)).toThrowError();
  // });
});
