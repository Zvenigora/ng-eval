import { RegistryType, ScopeRegistryOptions, ScopeRegistryType } from "../interfaces";
import { Registry } from "./registry";

const defaultOptions: ScopeRegistryOptions = {
  caseInsensitive: false,
  namespace: '',
  global: false,
  thisArg: undefined
};

type RegistryScopeOptionType = Readonly<Record<string, unknown> | ScopeRegistryOptions>

/**
 * Represents a registry that stores key-value pairs within a specific scope.
 * @template TKey The type of the keys in the registry.
 * @template TValue The type of the values in the registry.
 */
export class ScopeRegistry<TKey, TValue> implements ScopeRegistryType<TKey, TValue> {
  private readonly _registry: RegistryType<TKey, TValue>

  type: Readonly<string> = 'ScopeRegistry';

  /**
   * Options for the registry.
   */
  options: Readonly<RegistryScopeOptionType> = defaultOptions;

  /**
   * Creates a new instance of ScopeRegistry.
   * @param entries Optional. An array of key-value pairs to initialize the registry.
   * @param options Optional. Options for the registry.
   */
  constructor(entries?: readonly (readonly [TKey, TValue])[] | null,
              options: RegistryScopeOptionType = defaultOptions) {
    this.options = {...defaultOptions, ...options};
    this._registry = new Registry<TKey, TValue>(entries, options);
  }

  /**
   * Creates a new ScopeRegistry instance from an object.
   * @param object The object containing key-value pairs.
   * @param options Optional. Options for the registry.
   * @returns A new ScopeRegistry instance.
   */
  public static fromObject<TKey extends string | number | symbol, TValue>(object: Record<TKey, TValue>,
    options: RegistryScopeOptionType = defaultOptions): ScopeRegistryType<TKey, TValue> {

    const registry = Registry.fromObject(object, options);
    return registry;
  }

  /**
   * Gets the value associated with the specified key.
   * @param key The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key does not exist.
   */
  get(key: TKey): TValue | undefined {
    return this._registry.get(key);
  }

  /**
   * Sets the value for the specified key.
   * @param key The key to set the value for.
   * @param value The value to set.
   */
  public set(key: TKey, value: TValue): void {
    this._registry.set(key, value);
  }

  /**
   * Checks if the registry contains the specified key.
   * @param key The key to check.
   * @returns True if the key exists in the registry, false otherwise.
   */
  public has(key: TKey): boolean {
    return this._registry.has(key);
  }

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key The key to delete.
   * @returns True if the key-value pair was deleted, false if the key does not exist.
   */
  public delete(key: TKey): boolean {
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
  public get keys(): IterableIterator<TKey> {
    return this._registry.keys;
  }

  /**
   * Gets an iterator for the values in the registry.
   */
  public get values(): IterableIterator<TValue> {
    return this._registry.values;
  }

  /**
   * Gets an iterator for the key-value pairs in the registry.
   */
  public get entries(): IterableIterator<[TKey, TValue]> {
    return this._registry.entries;
  }

  /**
   * Executes a provided function once for each key-value pair in the registry.
   * @param callbackfn The function to execute for each key-value pair.
   * @param thisArg Optional. The value to use as `this` when executing the callback function.
   */
  public forEach(callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void, thisArg?: TValue): void {
    this._registry.forEach(callbackfn, thisArg);
  }

  /**
   * Gets an iterator for the key-value pairs in the registry.
   * @returns An iterator for the key-value pairs in the registry.
   */
  public [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    return this._registry.entries;
  }
}
