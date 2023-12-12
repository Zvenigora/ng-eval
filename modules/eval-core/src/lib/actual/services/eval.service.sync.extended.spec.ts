import { TestBed } from '@angular/core/testing';

import { EvalService } from './eval.service';

function myTag(strings: string[], personExp: string, ageExp: number) {
  const str0 = strings[0]; // "That "
  const str1 = strings[1]; // " is a "
  const str2 = strings[2]; // "."

  const ageStr = ageExp < 100 ? "youngster" : "centenarian";

  return `${str0}${personExp}${str1}${ageStr}${str2}`;
}

const context = {
  string: 'string',
  number: 123,
  bool: true,
  one: 1,
  two: 2,
  three: 3,
  foo: {bar: 'baz', baz: 'wow', func: function(x: string) { return (this as Record<string, unknown>)[x] as unknown; }},
  numMap: {10: 'ten', 3: 'three'},
  list: [1,2,3,4,5],
  // func: function(x: number) { return x + 1; },
  func: function(...x: number[]) { return x.reduce((sum, v) => sum + v, 1); },
  isArray: Array.isArray,
  throw: () => { throw new Error('Should not be called.'); },
  Date,
  sub: { sub2: { Date } },
  tag: (strings: unknown[], ...expand: unknown[]) => [...strings, '=>', ...expand].join(','),
  person: 'Mike',
  age: 28,
  myTag: myTag,
  promise: (v: unknown) => Promise.resolve(v),
  Promise,
  asyncFunc: async (a: number, b: number) => await a + b,
  promiseFunc: (a: number, b: number) => new Promise((resolve, reject) => {
    setTimeout(() => resolve(a + b), 1000);
    reject(new Error('eval: Something is not right!'));
  }),
}

describe('EvalService - extended', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  // 15. Arrow Functions
  it.each([
    ['[1,2].find(v => v === 2)', 2],
    ['list.reduce((sum, v) => sum + v, 0)', 15],
    ['list.find(() => false)', undefined],
    ['list.findIndex(v => v === 3)', 2],
    ['[1].map(() => ({ a: 1 }))', [{ a: 1 }]],
    ['[[1, 2]].map([a, b] => a + b)', [3]],
    ['[[1, 2]].map(([a, b] = []) => a+b)', [3]],
    ['[[1,],undefined].map(([a=2, b=5]=[]) => a+b)', [6, 7]],
    ['[{a:1}].map(({a}) => a)', [1]],
    ['[undefined].map(({a=1}={}) => a)', [1]],
    ['[1, 2].map((a, ...b) => [a, b])', [ [1, [0,[1,2]]], [2, [1,[1,2]]] ]],
    ['[{a:1,b:2,c:3}].map(({a, ...b}) => [a, b])', [[1, {b:2,c:3}]]],
    ['[{a:1}].map(({...foo}) => foo.a)', [1]],
  ])("15. Arrow Functions: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 16. assignment/update
  it.each([
    ['a = 2',   2, {a: 1}, {a: 2}],
    ['a += 2',  3, {a: 1}, {a: 3}],
    ['a++',     1, {a: 1}, {a: 2}],
    ['++a',     2, {a: 1}, {a: 2}],
    ['a--',     1, {a: 1}, {a: 0}],
    ['--a',     0, {a: 1}, {a: 0}],
    ['a[0] = 3',3, {a: [0, 0]}, {a: [3, 0]}],
    ['1 + ++a', 3, {a: 1}, {a: 2}],
    ['1 + a++', 2, {a: 1}, {a: 2}],
  ])("16. Assignment/update: when the input is '%s', value is %p, context is %p, expected is %p",
          (expr: string, expected: unknown, context: Record<string, unknown>, expObj: object) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
    expect(context).toMatchObject(expObj);
  });

  // 17. compound
  it.each([
    ['a=1; b=a; c=a+b;',   2, {}, {a: 1, b: 1, c: 2}],
  ])("17. compound: when the input is '%s', value is %p, context is %p, expected is %p",
          (expr: string, expected: unknown, context: Record<string, unknown>, expObj: object) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
    expect(context).toMatchObject(expObj);
  });

  // 18. new operator
  it.each([
    ['(new Date(2021, 8)).getFullYear()', 2021],
    ['(new sub.sub2["Date"](2021, 8)).getFullYear()', 2021],  // ToDo: fix error
    ['(new this.Date(2021, 8)).getFullYear()', 2021],        // ToDo: fix error
    ['new Date(2021, 8)', new Date(2021, 8)],
  ])("18. new operator: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 19. object, spread
  it.each([
    // ['{ a: "a", one, [foo.bar]: 2 }', { a: 'a', one: 1, baz: 2 }],    // error: Unexpected token (1:24)
    ['({ a: "a", one, [foo.bar]: 2 })', { a: 'a', one: 1, baz: 2 }],
    ['({ true: 1, 0: false })', { true: 1, 0: false }],
    ['({ x: 1, x: 2 })', { x: 2 }],
    ['({ a: "a", ...numMap })', { a: 'a', 10: 'ten', 3: 'three' }],
    ['([7, ...list])', [7,1,2,3,4,5]],
    ['(func(1, ...list))', 17],
  ])("19. object, spread: when the input is '%s', expected is %p",
          (expr: string, expObj: object | unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toBeTruthy();
    if (typeof expObj == 'object' && expObj) {
      expect(actual).toMatchObject(expObj);
    } else {
      expect(actual).toEqual(expObj);
    }
  });

  // 20. regex
  it.each([
    ['/123/', /123/],
    ['/a/ig', /a/ig],
  ])("20. regex: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 21. template literals
  it.each([
    ['`abc`', 'abc'],
    ['`hi ${foo.bar}`', 'hi baz'],
    ['tag`hi ${list[0]} and ${list[3]}`', 'hi , and ,,=>,1,4'],
    ['myTag`That ${person} is a ${age}.`', 'That Mike is a youngster.'],
  ])("20. template literals: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

});
