import { Registry } from '../../internal/classes';
import { EvalContext } from './eval-context';

import { EvalOptions } from './eval-options';

describe('EvalContext', () => {
  let original: Registry<unknown, unknown>;
  let options: EvalOptions;

  beforeEach(() => {
    original = new Registry<unknown, unknown>();
    options = new EvalOptions();
  });

  it('should create an instance with original registry', () => {
    const evalContext = new EvalContext(original, options);
    expect(evalContext.original).toBe(original);
    expect(evalContext.scopes).toEqual([]);
    expect(evalContext.options).toBe(options);
  });

  it('should create an instance with object to create a registry from', () => {
    const object = { key: 'value' };
    const evalContext = new EvalContext(object, options);
    expect(evalContext.original).toEqual(Registry.fromObject(object));
    expect(evalContext.scopes).toEqual([]);
    expect(evalContext.options).toBe(options);
  });
});
