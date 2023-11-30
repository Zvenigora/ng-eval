import { RegistryType } from "../interfaces";
import { BaseRegistry } from "./base-registry";
import { CaseInsensitiveRegistry } from "./case-insensitive-registry";

export class Registry<TKey, TValue> implements RegistryType<TKey, TValue> {
  private readonly _registry: RegistryType<TKey, TValue>
  private readonly _caseInsensitive: boolean;

  get caseInsensitive(): boolean {
    return this._caseInsensitive;
  }

  /**
   * Creates a new Registry instance.
   * @param entries - Optional array of key-value pairs to initialize the registry.
   */
  constructor(entries?: readonly (readonly [TKey, TValue])[] | null, caseInsensitive: boolean = false) {
    this._caseInsensitive = caseInsensitive;
    this._registry = caseInsensitive
      ? new CaseInsensitiveRegistry<TKey, TValue>(entries)
      : new BaseRegistry<TKey, TValue>(entries)
  }

  /**
   * Creates a new Registry instance from an object.
   * @param object - The object containing key-value pairs.
   * @returns A new Registry instance.
   */
  public static fromObject<TKey extends string | number | symbol, TValue>(object: Record<TKey, TValue>,
    caseInsensitive: boolean = false): RegistryType<TKey, TValue> {

    const registry: RegistryType<TKey, TValue> = caseInsensitive
      ? CaseInsensitiveRegistry.fromObject(object)
      : BaseRegistry.fromObject(object);

    return registry;
  }

  /**
   * Retrieves the value associated with the specified key.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key does not exist.
   */
  public get(key: TKey): TValue | undefined{
    return this._registry.get(key);
  }

  /**
   * Sets the value for the specified key.
   * @param key - The key to set the value for.
   * @param value - The value to set.
   */
  public set(key: TKey, value: TValue): void {
    this._registry.set(key, value);
  }

  /**
   * Checks if the registry contains the specified key.
   * @param key - The key to check.
   * @returns True if the registry contains the key, false otherwise.
   */
  public has(key: TKey): boolean {
    return this._registry.has(key);
  }

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key - The key to delete.
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
   * @param callbackfn - The function to execute for each key-value pair.
   * @param thisArg - Optional value to use as `this` when executing the callback function.
   */
  public forEach(callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void, thisArg?: TValue): void {
    this._registry.forEach(callbackfn, thisArg);
  }

  /**
   * Returns an iterator for the entries of the registry.
   * @returns An iterator that yields key-value pairs of type [TKey, TValue].
   */
  public [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    return this._registry.entries;
  }
}
