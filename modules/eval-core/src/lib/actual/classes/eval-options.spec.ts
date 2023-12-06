import { EvalOptions } from './eval-options';

describe('EvalOptions', () => {
  it('should create an instance', () => {
    expect(new EvalOptions()).toBeTruthy();
  });

  it('should have default caseInsensitive value as false', () => {
    const evalOptions = new EvalOptions();
    expect(evalOptions.caseInsensitive).toBe(false);
  });

  it('should set caseInsensitive value correctly', () => {
    const evalOptions = new EvalOptions(true);
    expect(evalOptions.caseInsensitive).toBe(true);
  });
});
