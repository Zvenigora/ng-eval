/**
 * Represents a registry that stores key-value pairs.
 */
export interface RegistryType {
  /**
   * Retrieves the value associated with the specified key.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key does not exist.
   */
  get(key: string): unknown | undefined;

  /**
   * Sets the value for the specified key.
   * @param key - The key to set the value for.
   * @param value - The value to set.
   */
  set(key: string, value: unknown): void;

  /**
   * Checks if the registry contains the specified key.
   * @param key - The key to check.
   * @returns True if the registry contains the key, false otherwise.
   */
  has(key: string): boolean;

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key - The key to delete.
   * @returns True if the key-value pair was deleted, false if the key does not exist.
   */
  delete(key: string): boolean;

  /**
   * Clears all key-value pairs from the registry.
   */
  clear(): void;

  /**
   * Gets the number of key-value pairs in the registry.
   */
  readonly size: number;

  /**
   * Gets an iterator for the keys in the registry.
   */
  readonly keys: IterableIterator<string>;

  /**
   * Gets an iterator for the values in the registry.
   */
  readonly values: IterableIterator<unknown>;

  /**
   * Gets an iterator for the key-value pairs in the registry.
   */
  readonly entries: IterableIterator<[string, unknown]>;

  /**
   * Executes a provided function once for each key-value pair in the registry.
   * @param callbackfn - The function to execute for each key-value pair.
   * @param thisArg - Optional value to use as `this` when executing the callback function.
   */
  forEach(callbackfn: (value: unknown, key: string, map: Map<string, unknown>) => void, thisArg?: unknown): void;

  /**
   * Returns an iterator for the entries of the registry.
   * @returns An iterator that yields key-value pairs of type [string, unknown].
   */
  [Symbol.iterator](): IterableIterator<[string, unknown]>;
}
