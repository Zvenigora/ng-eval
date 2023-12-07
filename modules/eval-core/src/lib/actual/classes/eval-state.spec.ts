import { EvalContext } from './eval-context';
import { EvalResult } from './eval-result';
import { EvalState } from './eval-state';
import { EvalOptions } from './eval-options'; // Add missing import
import { Registry } from '../../internal/classes';
import { ParserService } from '../services';
import { TestBed } from '@angular/core/testing';
import { AnyNode } from 'acorn';

describe('EvalState', () => {
  let original: Registry<unknown, unknown>;
  let options: EvalOptions;
  let context: EvalContext;
  let result: EvalResult;
  let expression: string;
  let ast: AnyNode | undefined;
  let parser: ParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    parser = TestBed.inject(ParserService);
    expression = 'a + b';
    ast = parser.parse(expression);
    original = new Registry<unknown, unknown>();
    options = new EvalOptions();
    context = new EvalContext(original, options);
    result = new EvalResult(expression, context);
  });

  it('should create an instance', () => {

    const evalState = new EvalState(expression, ast, context, result, options);
    expect(evalState).toBeTruthy();
  });
});
