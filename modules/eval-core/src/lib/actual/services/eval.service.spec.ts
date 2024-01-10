import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { AnyNode } from 'acorn';

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
    const result = service.simpleEval(expression, context);
    expect(result).toEqual(32);
  });

  it('#eval a + b / c should be 2.4 for (a=2, b=2, c=5)', () => {
    const context = {a: 2, b: 2, c: 5};
    const expr = 'a + b / c';
    const value = service.simpleEval(expr, context);
    expect(value).toBe(2 + 2 / 5);
  });

  it('#eval func(one, two) should return 3', () => {
    const context = {
      one: 1,
      two: 2,
      func: (a: number, b: number) => { return a+b; }
    };
    const expr = 'func(one, two)';
    const value = service.simpleEval(expr, context);
    expect(value).toBe(1 + 2);
  });

  it('should evaluate an AST expression', () => {
    const expression = {
      type: "BinaryExpression",
      left: {
        raw: "2",
        type: "Literal",
        value: 2
      },
      operator: "+",
      right: {
        raw: "2",
        type: "Literal",
        value: 2
      }
    } as unknown as AnyNode;
    const result = service.simpleEval(expression);
    expect(result).toEqual(4);
  });

  // it('should throw an error if evaluation fails', () => {
  //   const expression = '2 / 0';
  //   expect(() => service.simpleEval(expression)).toThrowError(); // 2 / 0 returns Infinity
  // });
});
