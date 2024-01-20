import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext, EvalScope, EvalScopeOptions } from '../../internal/classes/eval';

const context = {};

const globalScope = {
  PI: Math.PI,
  pow: function(base: number, exponent: number) {return Math.pow(base, exponent);}
};

const globalOptions: EvalScopeOptions = {
  global: true,
  namespace: 'global',
};

const evalContext = new EvalContext(context, {caseInsensitive: true});

evalContext.priorScopes.push(EvalScope.fromObject(globalScope, globalOptions));

describe('EvalService', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it.each([
    ['2 * PI',                    2 * Math.PI ],
    ['pow(2, 3)',                 8           ],
    ['global.pow(2, 3)',          8           ],
  ])("01. curried function: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.simpleEval(expr, evalContext, {caseInsensitive: true});
    expect(actual).toEqual(expected);
  });

});
