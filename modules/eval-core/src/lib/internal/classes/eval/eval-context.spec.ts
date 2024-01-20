import { EvalScope } from '.';
import { Registry } from '../common';
import { EvalContext } from './eval-context';
import { EvalOptions } from './eval-options';

describe('EvalContext', () => {
  let original: Registry<unknown, unknown>;
  let options: EvalOptions;

  beforeEach(() => {
    original = new Registry<unknown, unknown>();
    options = {};
  });

  it('should create an instance with original registry', () => {
    const evalContext = new EvalContext(original, options);
    expect(evalContext.original).toBe(original);
    expect(evalContext.priorScopes).toEqual([]);
    expect(evalContext.options).toBe(options);
  });

  it('should create an instance with object to create a registry from', () => {
    const object = { testKey: 'value' };
    const evalContext = new EvalContext(object, options);
    // expect(evalContext.original.get).toEqual(Registry.fromObject(object));
    expect(evalContext.priorScopes).toEqual([]);
    expect(evalContext.options).toBe(options);
  });

  it('should get value from original registry', () => {
    const key = 'key';
    const value = 'value';
    original.set(key, value);
    const evalContext = new EvalContext(original, options);
    expect(evalContext.get(key)).toBe(value);
  });

  it('should get value from object registry', () => {
    const key = 'key';
    const value = 'value';
    const object = { [key]: value };
    const evalContext = new EvalContext(object, options);
    expect(evalContext.get(key)).toBe(value);
  });

  it('should get value from prior scopes', () => {
    const key = 'key';
    const value = 'value';
    const scope = new EvalScope({}, {global: true});
    scope.set(key, value);
    const evalContext = new EvalContext(original, options);
    evalContext.priorScopes.push(scope);
    expect(evalContext.get(key)).toBe(value);
  });

  it('should get value from lookup function', () => {
    const key = 'key';
    const value = 'value';
    const lookup = jest.fn().mockReturnValue(value);
    const evalContext = new EvalContext(original, options);
    evalContext['lookups'].set(key, lookup);
    expect(evalContext.get(key)).toBe(value);
    expect(lookup).toHaveBeenCalledWith(key, evalContext, options);
  });

  it('should return undefined for non-existent key', () => {
    const key = 'non-existent';
    const evalContext = new EvalContext(original, options);
    expect(evalContext.get(key)).toBeUndefined();
  });
});
