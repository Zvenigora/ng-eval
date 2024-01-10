import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { getValueIgnoreCase } from '../../internal/visitors';
import { Registry } from '../../internal/public-api';

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

});
