import { RegistryType } from "../interfaces";

// some code here:
// https://stackoverflow.com/questions/50019920/javascript-map-key-value-pairs-case-insensitive-search

/**
 * Represents a case-insensitive registry that maps keys to values.
 */
export class CaseInsensitiveRegistry implements RegistryType {
  private readonly registry = new Map<string, string>();
  private keysMap = new Map<string, string>();

  /**
   * Creates a new instance of CaseInsensitiveRegistry.
   * @param entries - Optional initial entries to populate the registry.
   */
  constructor(entries?: readonly (readonly [string, string])[] | null) {
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
  public static fromObject(object: Record<string, string>): CaseInsensitiveRegistry {
    const registry = new CaseInsensitiveRegistry();
    for (const [key, value] of Object.entries(object)) {
      registry.set(key, value);
    }
    return registry;
  }

  /**
   * Retrieves the value associated with the specified key.
   * @param key - The key.
   * @returns The value associated with the key, or undefined if the key is not found.
   */
    public get(key: string): string | undefined {
      return this.registry.get(key.toLowerCase());
    }

  /**
   * Sets a key-value pair in the registry.
   * @param key - The key.
   * @param value - The value.
   */
  public set(key: string, value: string): void {
    const keyLowerCase = key.toLowerCase();
    this.registry.set(keyLowerCase, value);
    this.keysMap.set(keyLowerCase, key);
  }

  /**
   * Checks if the registry contains the specified key.
   * @param key - The key.
   * @returns True if the key is found, false otherwise.
   */
  public has(key: string): boolean {
    return this.registry.has(key.toLowerCase());
  }

  /**
   * Deletes the key-value pair associated with the specified key.
   * @param key - The key.
   * @returns True if the key-value pair is deleted, false if the key is not found.
   */
  public delete(key: string): boolean {
    const keyLowerCase = key.toLowerCase();
    this.keysMap.delete(keyLowerCase);
    return this.registry.delete(keyLowerCase);
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
  public get keys(): IterableIterator<string> {
    return this.keysMap.values();
  }

  /**
   * Gets an iterator for the values in the registry.
   */
  public get values(): IterableIterator<string> {
    return this.registry.values();
  }

  /**
   * Gets an iterator for the key-value pairs in the registry.
   */
  public get entries(): IterableIterator<[string, string]> {
    // return this.registry.entries();
    const keys = this.keysMap.values();
    const values = this.registry.values();
    const entries = new Array<[string, string]> ;
    for (let i = 0; i < this.registry.size; i++) {
      entries.push([keys.next().value, values.next().value]);
    }
    return entries.values();
  }

  /**
   * Executes a provided function once for each key-value pair in the registry.
   * @param callbackfn - The function to execute for each key-value pair.
   */
  public forEach(callbackfn: (value: string, key: string, map: Map<string, string>) => void): void {
    this.registry.forEach(callbackfn);
  }

  /**
   * Returns an iterator for the entries of the registry.
   * @returns An iterator that yields key-value pairs of type [string, unknown].
   */
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.registry[Symbol.iterator]();
  }

}
