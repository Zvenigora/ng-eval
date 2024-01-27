import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext } from '../../internal/classes/eval';
import { BaseContext, Registry } from '../../internal/public-api';


describe('EvalService - lookups', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('should lookup a value', () => {

    const constant: BaseContext = {
      one: 1,
      two: 2,
    }

    const lookup = (key: unknown) => constant[key as string | number] as unknown;

    const context = {
    }

    const evalContext = new EvalContext(context, {caseInsensitive: false});
    evalContext.lookups.push(lookup);

    const expression = 'one+two';
    const result = service.simpleEval(expression, evalContext);
    expect(result).toEqual(3);
  });

  it('should lookup a function', () => {

    const registry = new Registry({
      'Tokio': 37_393_000,
      'Delhi': 29_399_000,
      'Shanghai': 26_317_000,
      'Sao Paulo': 21_297_000,
    });

    const getPopulation = (key: unknown) => registry.get(key) as unknown;

    const context = {
    }

    const evalContext = new EvalContext(context, {caseInsensitive: false});
    evalContext.lookups.push((key) => key==='population' ? getPopulation : undefined);

    const expression = 'population("Tokio") + population("Delhi")';
    const result = service.simpleEval(expression, evalContext);
    expect(result).toEqual(37_393_000+29_399_000);
  });

});
