import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';
import { EvalResult } from './eval-result';

describe('EvalResult', () => {
  let evalResult: EvalResult;

  beforeEach(() => {
    const options = new EvalOptions(true);
    const context = new EvalContext({}, options);
    const expression = '1 + 1';
    evalResult = new EvalResult(expression, context);
  });

  it('should create an instance', () => {
    expect(evalResult).toBeTruthy();
  });

  it('should have default values', () => {
    expect(evalResult.stack).toBeDefined();
    expect(evalResult.value).toBeUndefined();
    expect(evalResult.error).toBeUndefined();
    expect(evalResult.errorMessage).toBeUndefined();
    expect(evalResult.isError).toBeUndefined();
    expect(evalResult.isSuccess).toBeUndefined();
    expect(evalResult.isUndefined).toBeUndefined();
    expect(evalResult.trace).toBeDefined();
    expect(evalResult.context).toBeDefined();
    expect(evalResult.expression).toBeDefined();
    expect(evalResult.ast).toBeUndefined();
    expect(evalResult.options).toBeDefined();
  });

  it('should start the evaluation', async () => {
    evalResult.start();
    await new Promise((r) => setTimeout(r, 10));
    const duration = evalResult.stop();
    expect(duration).toBeDefined();
  });
});
