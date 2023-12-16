/**
 * Represents a registry that stores key-value pairs.
 * @template TKey - The type of the keys in the registry.
 * @template TValue - The type of the values in the registry.
 */
export interface RegistryType<TKey, TValue> extends Iterable<[TKey, TValue]> {

  type: Readonly<'Registry' | string>;

  options: Readonly<{
    caseInsensitive: boolean;
  } | Record<string, unknown>>;

  /**
   * Retrieves the value associated with the specified key.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key does not exist.
   */
  get(key: TKey): TValue | undefined;

  /**
   * Sets the value for the specified key.
   * @param key - The key to set the value for.
   * @param value - The value to set.
   */
  set(key: TKey, value: TValue): void;

  /**
   * Checks if the registry contains the specified key.
   * @param key - The key to check.
   * @returns True if the registry contains the key, false otherwise.
   */
  has(key: TKey): boolean;

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key - The key to delete.
   * @returns True if the key-value pair was deleted, false if the key does not exist.
   */
  delete(key: TKey): boolean;

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
  readonly keys: IterableIterator<TKey>;

  /**
   * Gets an iterator for the values in the registry.
   */
  readonly values: IterableIterator<TValue>;

  /**
   * Gets an iterator for the key-value pairs in the registry.
   */
  readonly entries: IterableIterator<[TKey, TValue]>;

  /**
   * Executes a provided function once for each key-value pair in the registry.
   * @param callbackfn - The function to execute for each key-value pair.
   * @param thisArg - Optional value to use as `this` when executing the callback function.
   */
  forEach(callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void, thisArg?: unknown): void;

  /**
   * Returns an iterator for the entries of the registry.
   * @returns An iterator that yields key-value pairs of type [TKey, unknown].
   */
  [Symbol.iterator](): IterableIterator<[TKey, TValue]>;
}

// export interface BaseRegistryType<TKey, TValue> extends RegistryType<TKey, TValue> {
//   type: Readonly<'BaseRegistry' | string>;

//   options: Readonly<{
//     caseInsensitive: false;
//   } | Record<string, unknown>>;
// }

// export interface CaseInsensitiveRegistryType<TKey, TValue> extends RegistryType<TKey, TValue> {
//   type: 'CaseInsensitiveRegistry' | string;

//   options: {
//     caseInsensitive: true;
//   } | Record<string, unknown>;
// }

// export interface ScopeRegistryType<TKey, TValue> extends RegistryType<TKey, TValue> {
//   type: 'ScopeRegistry' | string;

//   options: Record<string, unknown> | ScopeRegistryOptions;
// }

export interface ScopeRegistryOptions {
  caseInsensitive: boolean;
  global: boolean;
  namespace: string;
  thisArg: unknown;
}

export type RegistryEntries<TKey, TValue> = [TKey, TValue][] | Record<string | number | symbol, TValue>;
