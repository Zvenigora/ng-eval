import { AnyNode } from 'acorn';
import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';
import { EvalResult } from './eval-result';

describe('EvalResult', () => {
  let evalResult: EvalResult;

  beforeEach(() => {
    const options = {} as EvalOptions;
    const context = new EvalContext({}, options);
    evalResult = new EvalResult(context);
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
    expect(evalResult.options).toBeDefined();
  });

  it('should start the evaluation', async () => {
    evalResult.start();
    await new Promise((r) => setTimeout(r, 10));
    const duration = evalResult.stop();
    expect(duration).toBeDefined();
  });

  // `docs/backlog-retired.md` A27: each setter writes every outcome field, so neither
  // leaves the other's behind - which the entry points never show, since
  // `start()` resets the outcome before either runs.
  it('should write every outcome field from either setter', () => {
    const error = new Error('failed');

    evalResult.setFailure(error);
    evalResult.setSuccess(2);

    expect(evalResult.value).toBe(2);
    expect(evalResult.isSuccess).toBe(true);
    expect(evalResult.isError).toBe(false);
    expect(evalResult.isUndefined).toBe(false);
    expect(evalResult.error).toBeUndefined();
    expect(evalResult.errorMessage).toBeUndefined();

    evalResult.setFailure(error);
    evalResult.setFailure('not an Error');

    expect(evalResult.value).toBeUndefined();
    expect(evalResult.isSuccess).toBe(false);
    expect(evalResult.isError).toBe(true);
    expect(evalResult.isUndefined).toBe(true);
    expect(evalResult.error).toBe('not an Error');
    expect(evalResult.errorMessage).toBeUndefined();
  });

  it('should reset the outcome on start, and leave the trace and its counters', () => {
    const node: AnyNode = { type: 'Literal', start: 0, end: 1, value: 1, raw: '1' };
    evalResult.addTraceBounded(node, 1, 1);
    evalResult.addTraceBounded(node, 1, 1);
    evalResult.start();
    evalResult.stop();
    evalResult.setFailure(new Error('failed'));
    expect(evalResult.duration).toBeDefined();

    evalResult.start();

    expect(evalResult.duration).toBeUndefined();
    expect(evalResult.value).toBeUndefined();
    expect(evalResult.error).toBeUndefined();
    expect(evalResult.errorMessage).toBeUndefined();
    expect(evalResult.isError).toBeUndefined();
    expect(evalResult.isSuccess).toBeUndefined();
    expect(evalResult.isUndefined).toBeUndefined();
    expect(evalResult.trace.length).toBe(1);
    expect(evalResult.tracePushCount).toBe(2);
    expect(evalResult.traceTruncated).toBe(true);
  });
});
