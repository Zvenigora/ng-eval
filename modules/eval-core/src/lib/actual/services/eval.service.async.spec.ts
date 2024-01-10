import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';

const context = {
  one: 1,
  two: 2,
  promise: (v: unknown) => Promise.resolve(v),
  Promise,
  asyncFunc: async (a: number, b: number) => await a + b,
  promiseFunc: (a: number, b: number) => new Promise((resolve) => {
    setTimeout(() => resolve(a + b), 1000);
  }),
}

describe('EvalService - async', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('#eval asyncFunc(one, two) should return 3', async () => {
    const context = {
      one: 1,
      two: 2,
      asyncFunc: async (a: number, b: number) => { return await (a+b); }
    };
    const expr = 'asyncFunc(one, two)';
    const testValue = await context.asyncFunc(context.one, context.two);
    const value = await service.simpleEvalAsync(expr, context);
    expect(value).toBe(1 + 2);
    expect(value).toBe(testValue);
  });

  // 21. sync expression
  it.each([
    ['asyncFunc(one, two)',     3 ],
    ['promiseFunc(one, two)',   3 ],
    // ['await 2',                 2 ], // SyntaxError: await is only valid in async function
    // ['await Promise.resolve(3)',3 ], // SyntaxError: await is only valid in async function
    // ['await asyncFunc(1, 2)',   3 ], // SyntaxError: await is only valid in async function
    ['asyncFunc(1, 2)',         3 ],
  ])("21. sync expression: when the input is '%s', value is %p", async (expr: string, expected: unknown) => {
    const actual = await service.simpleEval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 22. async expression
  it.each([
    ['asyncFunc(one, two)',     3 ],
    ['promiseFunc(one, two)',   3 ],
    // ['await 2',                 2 ], // SyntaxError: await is only valid in async function
    // ['await Promise.resolve(3)',3 ], // SyntaxError: await is only valid in async function
    // ['await asyncFunc(1, 2)',   3 ], // SyntaxError: await is only valid in async function
    ['asyncFunc(1, 2)',         3 ],
  ])("22. async expression: when the input is '%s', value is %p", async (expr: string, expected: unknown) => {
    const actual = await service.simpleEvalAsync(expr, context);
    expect(actual).toEqual(expected);
  });

});

