import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';

const context = {
  string: 'string',
  number: 123,
  bool: true,
  one: 1,
  two: 2,
  three: 3,
  foo: {bar: 'baz', baz: 'wow', func: function(x: string) { return (this as Record<string, unknown>) [x] as unknown; }},
  numMap: {10: 'ten', 3: 'three'},
  list: [1,2,3,4,5],
  func: function(...x: number[]) { return x.reduce((sum, v) => sum + v, 1); },
  isArray: Array.isArray,
  throwFunc: () => { throw new Error('Should not be called.'); },
  Date,
  sub: { sub2: { Date } },
  tag: (strings: unknown[], ...expand: unknown[]) => [...strings, '=>', ...expand].join(','),
  promise: (v: unknown) => Promise.resolve(v),
  Promise,
  asyncFunc: async (a: number, b: number) => await a + b,
  promiseFunc: (a: number, b: number) => new Promise((resolve, reject) => {
    setTimeout(() => resolve(a + b), 1000);
    reject(new Error('eval: Something is not right!'));
  }),
}

describe('EvalService Core', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('#eval a + b / c should be 2.4 for (a=2, b=2, c=5)', () => {
    const context = {a: 2, b: 2, c: 5};
    const expr = 'a + b / c';
    const value = service.eval(expr, context);
    expect(value).toBe(2 + 2 / 5);
  });

  it('#eval asyncFunc(one, two) should return 3', async () => {
    const context = {
      one: 1,
      two: 2,
      asyncFunc: async (a: number, b: number) => { return await (a+b); }
    };
    const expr = 'asyncFunc(one, two)';
    const value = await service.evalAsync(expr, context);
    expect(value).toBe(1 + 2);
  });

  it('#eval a > 2 ? b : c should be 100 for (a=3, b=100, c=200)', () => {
    const context = {"a": 3, "b": 100, "c": 200};
    const expr = 'a > 2 ? b : c';
    const value = service.eval(expr, context);
    expect(value).toBe(context.a > 2 ? context.b : context.c);
  });

  // 01. array expression
  it.each([
    ['([1,2,3])[0]',                1     ],
    ['(["one","two","three"])[1]',  'two' ],
    ['([true,false,true])[2]',      true  ],
    ['([1,true,"three"]).length',   3     ],
    ['isArray([1,2,3])',            true  ],
    ['list[3]',                     4     ],
    ['numMap[1 + two]',             'three'],
  ])("01. array expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 02. binary expression
  it.each([
    ['1+2',     3],
    ['2-1',     1],
    ['2*2',     4],
    ['6/3',     2],
    ['5|3',     7],
    ['5&3',     1],
    ['5^3',     6],
    ['4<<2',    16],
    ['256>>4',  16],
    ['-14>>>2', 1073741820],
    ['10%6',    4],
    ['"a"+"b"', 'ab'],
    ['one + three', 4],
  ])("02. binary expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 03. call expression
  it.each([
    ['func(5)',   6],
    ['func(1+2)', 4],
  ])("03. call expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 04. conditional expression
  it.each([
    ['(true ? "true" : "false")',               'true'],
    ['( ( bool || false ) ? "true" : "false")', 'true'],
    ['( true ? ( 123*456 ) : "false")',         123*456],
    ['( false ? "true" : one + two )',          3],
  ])("04. Conditional expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 05. identifier expression
  it.each([
    ['string',  'string'],
    ['number',  123],
    ['bool',    true],
  ])("05. identifier expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 06. literal
  it.each([
    ['"foo"', 'foo'],
    ["'foo'", 'foo'],
    ['123',   123],
    ['true',  true],
  ])("06. literal expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 07. logical expression
  it.each([
    ['true || false',   true],
    ['true && false',   false],
    ['1 == "1"',        true],
    ['2 != "2"',        false],
    ['1.234 === 1.234', true],
    ['123 !== "123"',   true],
    ['1 < 2',           true],
    ['1 > 2',           false],
    ['2 <= 2',          true],
    ['1 >= 2',          false],
  ])("07. logical expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 08. logical expression lazy evaluation
  it.each([
    ['true || throwFunc()',   true],
    ['false || true',     true],
    ['false && throwFunc()',  false],
    ['true && false',     false],
  ])("08. logical expression lazy evaluation: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 09. member expression
  it.each([
    ['foo.bar',       'baz'],
    ['foo["bar"]',    'baz'],
    ['foo[foo.bar]',  'wow'],
    ['foo?.bar',      'baz'],
    ['foo?.["bar"]',  'baz'],
    ['unknown?.x',    undefined],
    ['("foo").substr(0,1)', 'f'],
  ])("09. member expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 10. call expression with member
  it.each([
    ['foo.func("bar")',   'baz'],
    ['foo?.func("bar")',  'baz'],
    ['xxx?.func("bar")',  undefined],
  ])("10. call expression with member: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 11. unary expression
  it.each([
    ['-one',    -1],
    ['+two',    2],
    ['!false',  true],
    ['!!true',  true],
    ['~15',     -16],
    ['+[]',     0],
  ])("11. unary expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 12. three-valued logic expression
  it.each([
    ['null || true',        true],
    ['null || false',       false],
    ['undefined || true',   true],
    ['undefined || false',  false],
    ['null && true',        null],
    ['null && false',       null],
    ['undefined && true',   undefined],
    ['undefined && false',  undefined],
  ])("12. three-valued logic expression: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

  // 13. 'this' context
  it.each([
    ['this.three',        3],
    ['this.increment()',  1],
    ['this.getcounter()', 0]
  ])("13. `this` context: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const context = {
      three: 3,
      counter: 0,
      increment: function() {return ++this.counter;},
      getcounter: function() {return this.counter;}
    }
    const actual = service.eval(expr, context);
    expect(actual).toEqual(expected);
  });

});
