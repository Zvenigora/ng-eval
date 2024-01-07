import { CaseInsensitiveRegistry } from './case-insensitive-registry';

describe('CaseInsensitiveRegistry', () => {
  it('should create an instance', () => {
    expect(new CaseInsensitiveRegistry()).toBeTruthy();
  });

  it('should have type of CaseInsensitiveRegistry', () => {
    expect(new CaseInsensitiveRegistry().type).toEqual('CaseInsensitiveRegistry');
  });

  it('should be case insensitive', () => {
    expect(new CaseInsensitiveRegistry().options['caseInsensitive']).toBeTruthy();
  });

  it('should set and get values', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key1', 'value1');
    registry.set('Key2', 'value2');
    expect(registry.get('key1')).toBe('value1');
    expect(registry.get('key2')).toBe('value2');
  });

  it('should return undefined for non-existent keys', () => {
    const registry = new CaseInsensitiveRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should check if a key exists', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key', 'value');
    expect(registry.has('key')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should delete a key-value pair', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key', 'value');
    expect(registry.delete('key')).toBe(true);
    expect(registry.has('key')).toBe(false);
    expect(registry.delete('nonexistent')).toBe(false);
  });

  it('should clear all key-value pairs', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key1', 'value1');
    registry.set('Key2', 'value2');
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it('should create a new registry from an object', () => {
    const object = { key1: 'value1', key2: 'value2' };
    const registry = CaseInsensitiveRegistry.fromObject(object);
    expect(registry.get('key1')).toBe('value1');
    expect(registry.get('key2')).toBe('value2');
  });

  it('should return keys', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key1', 'value1');
    registry.set('Key2', 'value2');
    expect(Array.from(registry.keys)).toEqual(['Key1', 'Key2']);
  });

  it('should return values', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key1', 'value1');
    registry.set('Key2', 'value2');
    expect(Array.from(registry.values)).toEqual(['value1', 'value2']);
  });

  it('should return entries', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Key1', 'value1');
    registry.set('Key2', 'value2');
    expect(Array.from(registry.entries)).toEqual([['Key1', 'value1'], ['Key2', 'value2']]);
  });

  it('should convert registry to object', () => {
    const registry = new CaseInsensitiveRegistry();
    registry.set('Foo', 'bar');
    registry.set('Bar', 'baz');
    const object = registry.toObject();
    expect(object).toEqual({ Foo: 'bar', Bar: 'baz' });
  });
});
