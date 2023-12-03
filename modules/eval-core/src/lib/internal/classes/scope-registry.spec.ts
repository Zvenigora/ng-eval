import { ScopeRegistry } from './scope-registry';

describe('ScopeRegistry', () => {
  it('should create an instance', () => {
    expect(new ScopeRegistry()).toBeTruthy();
  });

  it('should have type of ScopeRegistry', () => {
    expect(new ScopeRegistry().type).toEqual('ScopeRegistry');
  });

  it('should be case sensitive', () => {
    expect(new ScopeRegistry().options['caseInsensitive']).toBeFalsy();
  });

  it('can be case insensitive', () => {
    expect(new ScopeRegistry(null, {caseInsensitive: true}).options['caseInsensitive']).toBeTruthy();
  });

  it('should get and set values correctly', () => {
    const registry = new ScopeRegistry<string, number>();

    registry.set('key1', 1);
    registry.set('key2', 2);

    expect(registry.get('key1')).toBe(1);
    expect(registry.get('key2')).toBe(2);
  });

  it('should check if key exists correctly', () => {
    const registry = new ScopeRegistry<string, number>();

    registry.set('key1', 1);

    expect(registry.has('key1')).toBe(true);
    expect(registry.has('key2')).toBe(false);
  });

  it('should delete key-value pair correctly', () => {
    const registry = new ScopeRegistry<string, number>();

    registry.set('key1', 1);

    expect(registry.delete('key1')).toBe(true);
    expect(registry.has('key1')).toBe(false);
  });

  it('should clear all key-value pairs correctly', () => {
    const registry = new ScopeRegistry<string, number>();

    registry.set('key1', 1);
    registry.set('key2', 2);

    registry.clear();

    expect(registry.size).toBe(0);
    expect(registry.has('key1')).toBe(false);
    expect(registry.has('key2')).toBe(false);
  });

  it('should iterate over key-value pairs correctly', () => {
    const registry = new ScopeRegistry<string, number>();

    registry.set('key1', 1);
    registry.set('key2', 2);

    const keys: string[] = [];
    const values: number[] = [];

    registry.forEach((value, key) => {
      keys.push(key);
      values.push(value);
    });

    expect(keys).toEqual(['key1', 'key2']);
    expect(values).toEqual([1, 2]);
  });
});
