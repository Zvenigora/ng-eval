import { RegistryType } from "../interfaces";

/**
 * Represents a registry that stores key-value pairs.
 */
export class Registry implements RegistryType {
  private readonly _registry: Map<string, unknown> = new Map();

  /**
   * Creates a new Registry instance.
   * @param entries - Optional array of key-value pairs to initialize the registry.
   */
  constructor(entries?: readonly (readonly [string, unknown])[] | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  /**
   * Creates a new Registry instance from an object.
   * @param object - The object containing key-value pairs.
   * @returns A new Registry instance.
   */
  public static fromObject(object: Record<string, unknown>): Registry {
    const registry = new Registry();
    for (const [key, value] of Object.entries(object)) {
      registry.set(key, value);
    }
    return registry;
  }

  /**
   * Retrieves the value associated with the specified key.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key does not exist.
   */
  public get(key: string): unknown | undefined{
    return this._registry.get(key);
  }

  /**
   * Sets the value for the specified key.
   * @param key - The key to set the value for.
   * @param value - The value to set.
   */
  public set(key: string, value: unknown): void {
    this._registry.set(key, value);
  }

  /**
   * Checks if the registry contains the specified key.
   * @param key - The key to check.
   * @returns True if the registry contains the key, false otherwise.
   */
  public has(key: string): boolean {
    return this._registry.has(key);
  }

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key - The key to delete.
   * @returns True if the key-value pair was deleted, false if the key does not exist.
   */
  public delete(key: string): boolean {
    return this._registry.delete(key);
  }

  /**
   * Clears all key-value pairs from the registry.
   */
  public clear(): void {
    this._registry.clear();
  }

  /**
   * Gets the number of key-value pairs in the registry.
   */
  public get size(): number {
    return this._registry.size;
  }

  /**
   * Gets an iterator for the keys in the registry.
   */
  public get keys(): IterableIterator<string> {
    return this._registry.keys();
  }

  /**
   * Gets an iterator for the values in the registry.
   */
  public get values(): IterableIterator<unknown> {
    return this._registry.values();
  }

  /**
   * Gets an iterator for the key-value pairs in the registry.
   */
  public get entries(): IterableIterator<[string, unknown]> {
    return this._registry.entries();
  }

  /**
   * Executes a provided function once for each key-value pair in the registry.
   * @param callbackfn - The function to execute for each key-value pair.
   * @param thisArg - Optional value to use as `this` when executing the callback function.
   */
  public forEach(callbackfn: (value: unknown, key: string, map: Map<string, unknown>) => void, thisArg?: unknown): void {
    this._registry.forEach(callbackfn, thisArg);
  }

  /**
   * Returns an iterator for the entries of the registry.
   * @returns An iterator that yields key-value pairs of type [string, unknown].
   */
  public [Symbol.iterator](): IterableIterator<[string, unknown]> {
    return this._registry.entries();
  }
}
