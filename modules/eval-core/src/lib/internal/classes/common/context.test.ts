import { fromContext, getContextValue } from './context';
import { Registry } from '../common';

describe('fromContext', () => {
  it('should return the same context if it is an instance of Registry', () => {
    const registry = new Registry();
    const result = fromContext(registry);
    expect(result).toBe(registry);
  });

  it('should return an empty object if the context is falsy', () => {
    const result = fromContext(undefined);
    expect(result).toEqual({});
  });

  it('should convert the context object to a Registry instance if caseInsensitive option is true', () => {
    const context = { foo: 'bar' };
    const options = { caseInsensitive: true, trackTime: false };
    const result = fromContext(context, options);
    expect(result).toBeInstanceOf(Registry);
  });

  it('should return the context object as is if caseInsensitive option is false', () => {
    const context = { foo: 'bar' };
    const options = { caseInsensitive: false };
    const result = fromContext(context, options);
    expect(result).toBe(context);
  });
});

describe('getContextValue', () => {
  it('should return the value associated with the specified key from a Registry instance', () => {
    const registry = new Registry();
    registry.set('foo', 'bar');
    const result = getContextValue(registry, 'foo');
    expect(result).toBe('bar');
  });

  it('should return the value associated with the specified key from an object', () => {
    const context = { foo: 'bar' };
    const result = getContextValue(context, 'foo');
    expect(result).toBe('bar');
  });

  it('should return undefined if the context is neither a Registry instance nor an object', () => {
    const result = getContextValue(undefined, 'foo');
    expect(result).toBeUndefined();
  });
});
