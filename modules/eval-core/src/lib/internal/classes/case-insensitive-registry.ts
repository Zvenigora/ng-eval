import { CaseInsensitiveRegistryType, RegistryType } from "../interfaces";

// some code here:
// https://stackoverflow.com/questions/50019920/javascript-map-key-value-pairs-case-insensitive-search

/**
 * Represents a case-insensitive registry that maps keys to values.
 */
export class CaseInsensitiveRegistry<TKey, TValue> implements CaseInsensitiveRegistryType<TKey, TValue> {

  private readonly registry: Map<TKey, TValue> = new Map();
  private keysMap = new Map<TKey, TKey>();

  type: Readonly<string> = 'CaseInsensitiveRegistry';

  /**
   * Options for the registry.
   */
  options: Readonly<Record<string, unknown>> = {
    caseInsensitive: true
  };

  /**
   * Creates a new instance of CaseInsensitiveRegistry.
   * @param entries - Optional initial entries to populate the registry.
   */
  constructor(entries?: readonly (readonly [TKey, TValue])[] | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  /**
   * Creates a new CaseInsensitiveRegistry from an object.
   * @param object - The object containing key-value pairs.
   * @returns A new CaseInsensitiveRegistry instance.
   */
  public static fromObject<TKey extends string | number | symbol, TValue>(object: Record<TKey, TValue>): RegistryType<TKey, TValue> {
    const registry = new CaseInsensitiveRegistry<TKey, TValue>();
    for (const [key, value] of Object.entries(object)) {
      registry.set(key as TKey, value as TValue);
    }
    return registry;
  }

  /**
   * Retrieves the value associated with the specified key.
   * @param key - The key.
   * @returns The value associated with the key, or undefined if the key is not found.
   */
    public get(key: TKey): TValue | undefined {
      return this.registry.get(this.getKey(key));
    }

  /**
   * Sets a key-value pair in the registry.
   * @param key - The key.
   * @param value - The value.
   */
  public set(key: TKey, value: TValue): void {
    const newKey = this.getKey(key);
    this.registry.set(newKey, value);
    this.keysMap.set(newKey, key);
  }

  /**
   * Checks if the registry contains the specified key.
   * @param key - The key.
   * @returns True if the key is found, false otherwise.
   */
  public has(key: TKey): boolean {
    return this.registry.has(this.getKey(key));
  }

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key - The key.
   * @returns True if the key-value pair is deleted, false if the key is not found.
   */
  public delete(key: TKey): boolean {
    const newKey = this.getKey(key);
    this.keysMap.delete(newKey);
    return this.registry.delete(newKey);
  }

  /**
   * Clears all key-value pairs from the registry.
   */
  public clear(): void {
    this.registry.clear();
    this.keysMap.clear();
  }

  /**
   * Gets the number of key-value pairs in the registry.
   */
  public get size(): number {
    return this.registry.size;
  }

  /**
   * Gets an iterator for the keys in the registry.
   */
  public get keys(): IterableIterator<TKey> {
    return this.keysMap.values();
  }

  /**
   * Gets an iterator for the values in the registry.
   */
  public get values(): IterableIterator<TValue> {
    return this.registry.values();
  }

  /**
   * Gets an iterator for the key-value pairs in the registry.
   */
  public get entries(): IterableIterator<[TKey, TValue]> {
    const keys = this.keysMap.values();
    const values = this.registry.values();
    const entries = new Array<[TKey, TValue]> ;
    for (let i = 0; i < this.registry.size; i++) {
      entries.push([keys.next().value, values.next().value]);
    }
    return entries.values();
  }

  /**
   * Executes a provided function once for each key-value pair in the registry.
   * @param callbackfn - The function to execute for each key-value pair.
   */
  public forEach(callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void): void {
    this.registry.forEach(callbackfn);
  }

  /**
   * Returns an iterator for the entries of the registry.
   * @returns An iterator that yields key-value pairs of type [string, unknown].
   */
  [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    return this.registry[Symbol.iterator]();
  }

  private getKey(key: TKey): TKey {
    const keyLowerCase = typeof key === 'string'
            ? key.toLowerCase() as unknown as TKey
            : key;
    return keyLowerCase;
  }

}
