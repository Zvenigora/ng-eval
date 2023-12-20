import { EvalContext } from './eval-context';
import { EvalResult } from './eval-result';
import { EvalState } from './eval-state';
import { EvalOptions } from './eval-options'; // Add missing import
import { Registry } from '../common';
import { TestBed } from '@angular/core/testing';

describe('EvalState', () => {
  let original: Registry<unknown, unknown>;
  let options: EvalOptions;
  let context: EvalContext;
  let result: EvalResult;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    original = new Registry<unknown, unknown>();
    options = {} as EvalOptions;
    context = new EvalContext(original, options);
    result = new EvalResult(context);
  });

  it('should create an instance', () => {

    const evalState = new EvalState(context, result, options);
    expect(evalState).toBeTruthy();
  });
});
