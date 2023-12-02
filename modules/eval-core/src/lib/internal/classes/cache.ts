import { sha256 } from 'js-sha256';
import { RegistryType, CacheType } from '../interfaces';
import { BaseRegistry } from './base-registry';

/**
 * Represents a cache implementation that stores key-value pairs.
 * @template TValue The type of values stored in the cache.
 */
export class Cache<TValue> implements CacheType<TValue> {
  /**
   * The registry that stores the key-value pairs.
   */
  private readonly _registry: RegistryType<string, TValue>;
  /**
   * The queue that keeps track of the keys in the cache.
   */
  private readonly _keyQueue: string[];

  /**
   * Creates a new instance of the Cache class.
   * @param _maxCacheSize The maximum size of the cache.
   */
  constructor(
    private readonly _maxCacheSize: number,
  ) {
    this._registry = new BaseRegistry<string, TValue>();
    this._keyQueue = [];
  }

  /**
   * Gets the maximum size of the cache.
   */
  get maxCacheSize(): number {
    return this._maxCacheSize;
  }

  /**
   * Generates a hash key based on the given namespace and value.
   * @param namespace The namespace for the key.
   * @param value The value for the key.
   * @returns The generated hash key.
   */
  getHashKey(namespace: string, value: string): string {
    const key = sha256(`${namespace}:${value}`);
    return key;
  }

  /**
   * Gets the value associated with the specified key.
   * @param key The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key does not exist in the cache.
   */
  get(key: string): TValue | undefined {
    return this._registry.get(key);
  }

  /**
   * Sets the value for the specified key in the cache.
   * @param key The key to set the value for.
   * @param value The value to set.
   */
  set(key: string, value: TValue): void {
    const index = this._keyQueue.indexOf(key);
    if (index === -1) {
      this._keyQueue.push(key);
    }
    while(this._keyQueue.length > this._maxCacheSize) {
      const removeKey = this._keyQueue.shift();
      if (removeKey) {
        this._registry.delete(removeKey);
      }
    }

    this._registry.set(key, value);
  }

  /**
   * Checks if the cache contains the specified key.
   * @param key The key to check.
   * @returns True if the cache contains the key, false otherwise.
   */
  has(key: string): boolean {
    return this._registry.has(key);
  }

  /**
   * Deletes the value associated with the specified key from the cache.
   * @param key The key to delete.
   * @returns True if the value was successfully deleted, false otherwise.
   */
  delete(key: string): boolean {
    const index = this._keyQueue.indexOf(key);
    if (index > -1) {
      this._keyQueue.splice(index, 1);
    }
    return this._registry.delete(key);
  }

  /**
   * Clears the cache, removing all key-value pairs.
   */
  clear(): void {
    this._keyQueue.length = 0;
    this._registry.clear();
  }

  /**
   * Gets the number of key-value pairs in the cache.
   */
  get size(): number {
    return this._registry.size;
  }

  /**
   * Gets an iterator for the keys in the cache.
   */
  get keys(): IterableIterator<string> {
    return this._registry.keys;
  }

  /**
   * Gets an iterator for the values in the cache.
   */
  get values(): IterableIterator<TValue> {
    return this._registry.values;
  }

  /**
   * Gets an iterator for the entries (key-value pairs) in the cache.
   */
  get entries(): IterableIterator<[string, TValue]> {
    return this._registry.entries;
  }

  /**
   * Executes a provided function once for each key-value pair in the cache.
   * @param callbackfn The function to execute for each key-value pair.
   * @param thisArg The value to use as `this` when executing the callback function.
   */
  forEach(callbackfn: (value: TValue, key: string, map: Map<string, TValue>) => void, thisArg?: TValue): void {
    this._registry.forEach(callbackfn, thisArg);
  }

  /**
   * Returns an iterator for the entries (key-value pairs) in the cache.
   */
  [Symbol.iterator](): IterableIterator<[string, TValue]> {
    return this._registry[Symbol.iterator]();
  }
}
