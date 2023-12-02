import { Cache } from './cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>(5);
  });

  it('should create an instance', () => {
    expect(cache).toBeTruthy();
  });

  it('should return the correct size', () => {
    expect(cache.size).toBe(0); // Initial size should be 0
    cache.set('key1', 'value1');
    expect(cache.size).toBe(1); // Size should be 1 after adding one entry
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2); // Size should be 2 after adding another entry
    cache.delete('key1');
    expect(cache.size).toBe(1); // Size should be 1 after deleting one entry
    cache.clear();
    expect(cache.size).toBe(0); // Size should be 0 after clearing the cache
  });

  it('should return the correct value for a key', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.get('key1')).toBe('value1'); // Should return 'value1' for 'key1'
    expect(cache.get('key2')).toBe('value2'); // Should return 'value2' for 'key2'
    expect(cache.get('key3')).toBeUndefined(); // Should return undefined for non-existent key 'key3'
  });

  it('should check if a key exists in the cache', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true); // Should return true for existing key 'key1'
    expect(cache.has('key2')).toBe(false); // Should return false for non-existent key 'key2'
  });

  it('should delete a key-value pair from the cache', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true); // Should return true when deleting an existing key 'key1'
    expect(cache.delete('key2')).toBe(false); // Should return false when deleting a non-existent key 'key2'
    expect(cache.has('key1')).toBe(false); // Key 'key1' should no longer exist in the cache
  });

  it('should clear the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size).toBe(0); // Size should be 0 after clearing the cache
    expect(cache.has('key1')).toBe(false); // Key 'key1' should no longer exist in the cache
    expect(cache.has('key2')).toBe(false); // Key 'key2' should no longer exist in the cache
  });

  it('should iterate over the keys in the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const keys = Array.from(cache.keys);
    expect(keys).toEqual(['key1', 'key2']); // Should iterate over the keys in the cache
  });

  it('should iterate over the values in the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const values = Array.from(cache.values);
    expect(values).toEqual(['value1', 'value2']); // Should iterate over the values in the cache
  });

  it('should iterate over the entries (key-value pairs) in the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const entries = Array.from(cache.entries);
    expect(entries).toEqual([['key1', 'value1'], ['key2', 'value2']]); // Should iterate over the entries in the cache
  });

  it('should execute a callback function for each key-value pair in the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const callback = jest.fn();
    cache.forEach(callback);
    expect(callback).toHaveBeenCalledTimes(2); // Callback should be called for each key-value pair in the cache
    expect(callback).toHaveBeenCalledWith('value1', 'key1', expect.any(Map)); // Callback should be called with the correct arguments for 'key1'
    expect(callback).toHaveBeenCalledWith('value2', 'key2', expect.any(Map)); // Callback should be called with the correct arguments for 'key2'
  });

  it('should not exseed max size', () => {
    expect(cache.size).toBe(0); // Initial size should be 0
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');
    cache.set('key5', 'value5');

    expect(cache.has('key1')).toBeTruthy();
    cache.set('key6', 'value6');
    expect(cache.has('key1')).toBeFalsy();
    expect(cache.has('key2')).toBeTruthy();
    expect(cache.size).toBe(5); // Size should be 5 after adding 5 entries

  });

  it('should return the correct hash key', () => {
    // const t0 = performance.now();
    const cache = new Cache<string>(5);
    const namespace = 'test';
    const value = 'example';
    const expectedKey = 'bc2e9db60f211014ef81826efc6c58ae3698795bda0976bf8d7385b057c2eb51';
    const hashKey = cache.getHashKey(namespace, value);
    cache.set(hashKey, value);
    const savedValue = cache.get(hashKey);
    // const t1 = performance.now();
    // console.log(`Call to cache took ${t1 - t0} milliseconds.`);
    expect(hashKey).toBe(expectedKey);
    expect(savedValue).toBe(value);
  });
});

