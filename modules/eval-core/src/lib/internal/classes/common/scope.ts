import { RegistryOptionType, ScopeType } from '../../interfaces';

/**
 * Represents a scope that holds key-value pairs.
 * @template TKey The type of the keys in the scope.
 * @template TValue The type of the values in the scope.
 */
export class Scope<TKey, TValue> implements ScopeType<TKey, TValue> {
  private _registries: RegistryOptionType<TKey, TValue>[] = [];

  /**
   * Gets the registries in the scope.
   */
  public get registries(): RegistryOptionType<TKey, TValue>[] {
    return this._registries;
  }

  /**
   * Creates a new scope.
   * @param registries Optional array of registries to initialize the scope with.
   */
  constructor(registries?: RegistryOptionType<TKey, TValue>[]) {
    if (registries) {
      this._registries = registries;
    }
  }

  /**
   * Adds a registry to the scope.
   * @param registry The registry to add.
   */
  public add(registry: RegistryOptionType<TKey, TValue>): void {
    this._registries.push(registry);
  }

  /**
   * Gets the value associated with the specified key in the scope.
   * @param key The key to search for.
   * @param namespace Optional namespace to filter the search by.
   * @returns An array containing the key and value if found, otherwise undefined.
   */
  public get(key: TKey, namespace?: string): [TKey, TValue] | undefined {
    const registries = this._registries.filter((registry) => {
      if (registry.options.global) {
        return true;
      }
      if (namespace && registry.options.namespace !== namespace) {
        return false;
      }
      return true;
    });

    for (const registry of registries) {
      if (registry.registry.has(key)) {
        const value = registry.registry.get(key) as TValue;
        return [key, value];
      }
    }
    return undefined;
  }
}


