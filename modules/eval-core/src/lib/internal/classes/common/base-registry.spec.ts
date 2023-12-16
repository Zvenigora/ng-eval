import { BaseRegistry } from './base-registry';

describe('BaseRegistry', () => {
  it('should create an instance', () => {
    expect(new BaseRegistry()).toBeTruthy();
  });

  it('should have type of BaseRegistry', () => {
    expect(new BaseRegistry().type).toEqual('BaseRegistry');
  });

  it('should be case sensitive', () => {
    expect(new BaseRegistry().options['caseInsensitive']).toBeFalsy();
  });

  it('should create an instance with entries', () => {
    const registry = new BaseRegistry([['foo', 'bar'], ['bar', 'baz']]);
    expect(registry.size).toEqual(2);
  });

  it('should create an instance from an object', () => {
    const registry = BaseRegistry.fromObject({ foo: 'bar', bar: 'baz' });
    expect(registry.size).toEqual(2);
  });

  it('should set and get a value', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    expect(registry.get('foo')).toEqual('bar');
  });

  it('should return undefined if a key is not set', () => {
    const registry = new BaseRegistry();
    expect(registry.get('foo')).toBeUndefined();
  });

  it('should return true if a key is set', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    expect(registry.has('foo')).toBeTruthy();
  });

  it('should return false if a key is not set', () => {
    const registry = new BaseRegistry();
    expect(registry.has('foo')).toBeFalsy();
  });

  it('should return true if a key is deleted', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    expect(registry.delete('foo')).toBeTruthy();
  });

  it('should return false if a key is not deleted', () => {
    const registry = new BaseRegistry();
    expect(registry.delete('foo')).toBeFalsy();
  });

  it('should return the correct size', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    expect(registry.size).toEqual(2);
  });

  it('should clear the registry', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    registry.clear();
    expect(registry.size).toEqual(0);
  });

  it('should return the correct keys', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    expect(Array.from(registry.keys)).toEqual(['foo', 'bar']);
  });

  it('should return the correct values', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    expect(Array.from(registry.values)).toEqual(['bar', 'baz']);
  });

  it('should return the correct entries', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    expect(Array.from(registry.entries)).toEqual([['foo', 'bar'], ['bar', 'baz']]);
  });

  it('should call the callback function', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    const callback = jest.fn();
    registry.forEach(callback);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should return an iterator for the entries', () => {
    const registry = new BaseRegistry();
    registry.set('foo', 'bar');
    registry.set('bar', 'baz');
    const iterator = registry[Symbol.iterator]();
    expect(iterator.next().value).toEqual(['foo', 'bar']);
    expect(iterator.next().value).toEqual(['bar', 'baz']);
  });
});
