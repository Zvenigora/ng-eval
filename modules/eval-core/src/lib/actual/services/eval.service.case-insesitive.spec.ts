import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { getValueIgnoreCase } from '../../internal/visitors';
import { Registry } from '../../internal/public-api';
import { EvalContext } from '../../internal/classes/eval';
import { runInNewContext } from 'vm';

const context = {
  string: 'string',
  number: 123,
  bool: true,
  one: 1,
  two: 2,
  three: 3,
  foo: {bar: 'baz', baz: 'wow', func: function(x: string) { return getValueIgnoreCase(this, x); }},
  numMap: {10: 'ten', 3: 'three'},
  list: [1,2,3,4,5],
  func: function(...x: number[]) { return x.reduce((sum, v) => sum + v, 1); },
  isArray: Array.isArray,
  throw: () => { throw new Error('Should not be called.'); },
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

const options = {
  caseInsensitive: true
}


describe('EvalService - case-insensitive options', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  // EvalService - case-insensitive options
  it.each([
    ['TrUe', 							          true],

    // array expression
    ['IsArray([1,2,3])',           	true    ],
    ['LiSt[3]',                    	4       ],
    ['NumMap[1 + two]',            	'three' ],

    ['THREE', 3],
    ['ONE + THREE', 4],

    // call expression
    ['FUNC(5)',   6],
    ['Func(1+2)', 4],

    // conditional expression
    ['(True ? "true" : "false")',               'true'  ],
    ['( ( Bool || False ) ? "true" : "false")', 'true'  ],
    ['( True ? ( 123*456 ) : "false")',         123*456 ],
    ['( False ? "true" : one + two )',          3       ],

    // identifier
    ['String', 		'string' ],
    ['Number', 		123      ],
    ['BOOL',   		true     ],

    // literal
    ['"foo"', 		'foo' ],
    ["'foo'", 		'foo' ],
    ['True',  		true  ],

    // logical expression
    ['True || False',   true  ],
    ['True && False',   false ],

    // logical expression lazy evaluation
    ['True || Throw()',  true   ],
    ['False || True',    true   ],
    ['False && Throw()', false  ],
    ['True && False',    false  ],

    // member expression
    ['foO.baR',      'baz'     ],
    ['foO["baR"]',   'baz'     ],
    ['foO[Foo.Bar]', 'wow'     ],
    ['Foo?.Bar',     'baz'     ],
    ['FoO?.["BaR"]', 'baz'     ],
    ['UnKnown?.x',   undefined ],

    // call expression with member
    ['Foo.Func("Bar")',  'baz'     ],
    ['Foo?.Func("baR")', 'baz'     ],
    ['Xxx?.Func("Bar")', undefined ],

    // unary expression
    ['-One',   -1   ],
    ['+Two',   2    ],
    ['!False', true ],
    ['!!True', true ],

    // 'this' context
    ['This.Three', 3 ],

    // Arrow Functions
    ['[1,2].Find(v => v === 2)',                     2                                  ],
    ['list.Reduce((sum, v) => sum + v, 0)',          15                                 ],
    ['list.FIND(() => False)',                       undefined                          ],
    ['list.FindIndex(v => v === 3)',                 2                                  ],
    ['[1].MAP(() => ({ a: 1 }))',                    [{ a: 1 }]                         ],
    ['[[1, 2]].Map(([a, b]) => a + b)',                [3]                                ],
    // ['[[1, 2]].map(([a, b] = []) => a+b)',           [3]                                ],
    // ['[[1,],Undefined].Map(([a=2, b=5]=[]) => a+b)', [6, 7]                             ],
    ['[{a:1}].Map(({a}) => a)',                      [1]                                ],
    // ['[Undefined].Map(({a=1}={}) => a)',             [1]                                ],
    ['[1, 2].mAp((a, ...b) => [a, b])',              [ [1, [0,[1,2]]], [2, [1,[1,2]]] ] ],
    // ['[{a:1,b:2,c:3}].MaP(({a, ...b}) => [a, b])',   [[1, {b:2,c:3}]]                   ],
    ['[{a:1}].Map(({...foo}) => foo.a)',             [1]                                ],

    // new
    ['(new date(2021, 8)).GetFullYear()',             2021                          ],
    ['(new sUb.sUb2["Date"](2021, 8)).GetFullYear()', 2021                          ], // ToDo: fix error
    ['new dAtE(2021, 8)',                             new Date(2021, 8) ],

    // object, spread
    ['({ a: "a", one, [Foo.Bar]: 2 })', { a: 'a', one: 1, baz: 2 }        ],
    ['({ a: "a", ...numMAP })',         { a: 'a', 10: 'ten', 3: 'three' } ], //
    ['[7, ...lisT]',                  [7,1,2,3,4,5]                     ],
    ['Func(1, ...lisT)',              17                                ],

    // template literals
    ['`abc`',                             'abc'               ],
    ['`hi ${Foo.BAR}`',                   'hi baz'            ],
    ['tag`hi ${LiSt[0]} and ${LIst[3]}`', 'hi , and ,,=>,1,4' ],

  ])("Case-insensitive: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.simpleEval(expr, context, options);
    expect(actual).toEqual(expected);
  });


// assignment/update
  it.each([
    ['A = 2',   2, {a: 1}, {a: 2}],
    ['A += 2',  3, {a: 1}, {a: 3}],
    ['A++',     1, {a: 1}, {a: 2}],
    ['++A',     2, {a: 1}, {a: 2}],
    ['A--',     1, {a: 1}, {a: 0}],
    ['--A',     0, {a: 1}, {a: 0}],
    ['A[0] = 3',3, {a: [0, 0]}, {a: [3, 0]}],
    ['1 + ++A', 3, {a: 1}, {a: 2}],
    ['1 + A++', 2, {a: 1}, {a: 2}],
  ])("16. Assignment/update: when the input is '%s', value is %p, context is %p, expected is %p",
        (expr: string, expected: unknown, context: Record<string, unknown>, expObj: object) => {
    const registryContext = Registry.fromObject(context, options);
    const actual = service.simpleEval(expr, registryContext, options);
    const resultContext = registryContext.toObject();
    expect(actual).toEqual(expected);
    expect(resultContext).toMatchObject(expObj);
  });

  // `docs/backlog.md` A57: what `EvalContext.fromContext`'s case-insensitive
  // copy holds, as A57's entry records it, and A58: what it does not copy,
  // as the README's `### Scopes` states it. Under
  // `caseInsensitive` a plain object is copied into a `Registry` by
  // `Object.entries`; case-sensitive, the object itself is the context, so
  // Q2 to Q4 read the same fixture case-sensitively first, to show it holds
  // what the copy leaves out (SR17). Each case builds its own object (SR43).
  describe('what fromContext\'s case-insensitive copy holds, and what it does not copy (docs/backlog.md A57, A58)', () => {
    const ci = { caseInsensitive: true };

    it('Q1 should read an own enumerable getter once, when the copy is made', () => {
      let gets = 0;
      const object = {};
      Object.defineProperty(object, 'g', { get: () => { gets += 1; return 1; }, enumerable: true });

      const context = EvalContext.fromContext(object, ci);
      expect(gets).toBe(1);
      expect(service.simpleEval('g', context, ci)).toBe(1);
      expect(service.simpleEval('this.g', context, ci)).toBe(1);
      expect(gets).toBe(1);
    });

    it('Q2 should leave out a class instance\'s inherited accessor and method, and keep its own field', () => {
      class Instance {
        own = 1;
        get g(): number { return 7; }
        m(): string { return 'm'; }
      }
      // A class instance has no index signature; the context takes it as any object.
      const instance = () => new Instance() as unknown as Record<string, unknown>;

      const plain = EvalContext.fromContext(instance(), {});
      expect(service.simpleEval('g', plain)).toBe(7);
      expect(service.simpleEval('m()', plain)).toBe('m');

      const context = EvalContext.fromContext(instance(), ci);
      expect(service.simpleEval('own', context, ci)).toBe(1);
      expect(service.simpleEval('g', context, ci)).toBeUndefined();
      expect(service.simpleEval('this.g', context, ci)).toBeUndefined();
      expect(() => service.simpleEval('m()', context, ci)).toThrow('Cannot call undefined or null function');
    });

    it('Q3 should leave out a non-enumerable own property', () => {
      const make = () => {
        const object: Record<string, unknown> = { a: 1 };
        Object.defineProperty(object, 'h', { value: 3, enumerable: false });
        return object;
      };

      expect(service.simpleEval('h', EvalContext.fromContext(make(), {}))).toBe(3);
      expect(service.simpleEval('h', EvalContext.fromContext(make(), ci), ci)).toBeUndefined();
    });

    it('Q4 should leave out a symbol-keyed own property', () => {
      const s = Symbol('s');
      const make = () => ({ a: 1, s, [s]: 2 });

      expect(service.simpleEval('this[s]', EvalContext.fromContext(make(), {}))).toBe(2);
      expect(service.simpleEval('this[s]', EvalContext.fromContext(make(), ci), ci)).toBeUndefined();
    });

    it('Q5 should write k = 5 to the copy, leaving the caller\'s object as it was', () => {
      const object: Record<string, unknown> = { k: 1 };
      const context = EvalContext.fromContext(object, ci);

      expect(service.simpleEval('k = 5', context, ci)).toBe(5);
      expect(service.simpleEval('k', context, ci)).toBe(5);
      expect(object['k']).toBe(1);
    });

    it('Q6 should write user.name into the caller\'s own user, the copy being shallow (the contrast)', () => {
      const user = { name: 'a' };
      const context = EvalContext.fromContext({ user }, ci);

      expect(service.simpleEval('user.name = "x"', context, ci)).toBe('x');
      expect(user.name).toBe('x');
    });

    it('Q7 should write k = 5 to a binding the expression declares, leaving the copy and the caller\'s object as they were', () => {
      for (const expression of ['let k = 1; k = 5; k', '(k => (k = 5, k))(1)']) {
        const object: Record<string, unknown> = { k: 1 };
        const context = EvalContext.fromContext(object, ci);

        expect(service.simpleEval(expression, context, ci)).toBe(5);
        expect(service.simpleEval('k', context, ci)).toBe(1);
        expect(object['k']).toBe(1);
      }
    });

    it('Q8 should leave the caller\'s object as it was for a write into a pushed scope or through this', () => {
      const object: Record<string, unknown> = { k: 1 };
      const context = EvalContext.fromContext(object, ci);
      context.push({ k: 'p' }, ci);

      expect(service.simpleEval('k = 5', context, ci)).toBe(5);
      context.pop();
      expect(service.simpleEval('k', context, ci)).toBe(1);
      expect(object['k']).toBe(1);

      for (const expression of ['this.k = 5', 'this.k += 5', 'k++']) {
        const own: Record<string, unknown> = { k: 1 };
        service.simpleEval(expression, EvalContext.fromContext(own, ci), ci);
        expect(own['k']).toBe(1);
      }
    });

    // A58: an object that is not an instance of this realm's `Object` is not
    // copied, nor read as the context, in either mode. Each assertion is a case
    // of its own, in each mode, so a probe of one is read on its own line.
    const nullProto = (): Record<string, unknown> => {
      const object = Object.create(null) as Record<string, unknown>;
      object['k'] = 1;
      return object;
    };
    const foreign = (): Record<string, unknown> => runInNewContext('({ k: 1 })') as Record<string, unknown>;
    const modes: [string, { caseInsensitive?: boolean }][] = [['case-sensitive', {}], ['caseInsensitive', ci]];

    describe.each<[string, () => Record<string, unknown>]>([
      ['Q9 an object with a null prototype', nullProto],
      ['Q10 an object made in another realm', foreign],
    ])('%s (docs/backlog.md A58)', (_label, make) => {
      it('should fail instanceof Object, and not be copied', () => {
        const object = make();
        expect(object instanceof Object).toBe(false);
        expect(EvalContext.fromContext(object, ci).original).toBe(object);
      });

      it.each(modes)('%s: k should read undefined', (_mode, options) => {
        expect(service.simpleEval('k', EvalContext.fromContext(make(), options), options)).toBeUndefined();
      });

      it.each(modes)('%s: this.k should read undefined', (_mode, options) => {
        expect(service.simpleEval('this.k', EvalContext.fromContext(make(), options), options)).toBeUndefined();
      });

      it.each(modes)('%s: held as a value, d.k should read 1 (the contrast)', (_mode, options) => {
        expect(service.simpleEval('d.k', EvalContext.fromContext({ d: make() }, options), options)).toBe(1);
      });
    });
  });

});
