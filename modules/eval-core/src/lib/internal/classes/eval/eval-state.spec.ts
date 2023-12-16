import { EvalContext } from './eval-context';
import { EvalResult } from './eval-result';
import { EvalState } from './eval-state';
import { EvalOptions } from './eval-options'; // Add missing import
import { Registry } from '../common';
import { TestBed } from '@angular/core/testing';
import { AnyNode, defaultOptions } from 'acorn';
import { doParse } from '../../functions';

describe('EvalState', () => {
  let original: Registry<unknown, unknown>;
  let options: EvalOptions;
  let context: EvalContext;
  let result: EvalResult;
  let expression: string;
  let ast: AnyNode | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    expression = 'a + b';
    ast = doParse(expression, defaultOptions);
    original = new Registry<unknown, unknown>();
    options = {} as EvalOptions;
    context = new EvalContext(original, options);
    result = new EvalResult(expression, context);
  });

  it('should create an instance', () => {

    const evalState = new EvalState(expression, ast, context, result, options);
    expect(evalState).toBeTruthy();
  });
});
