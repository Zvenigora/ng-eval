import { Registry } from '../../internal/classes';
import { EvalOptions } from './eval-options';

/**
 * Represents the evaluation context for the code execution.
 */
export class EvalContext {
  private _original: Readonly<Registry<unknown, unknown> | Record<string, unknown>  | undefined>;
  private _scopes: Readonly<Registry<unknown, unknown>[]>;
  private _lookups: Readonly<Registry<unknown, (key: unknown, thisArg: unknown, options?: EvalOptions) => unknown>>;
  private _options: Readonly<EvalOptions>;

  /**
   * Gets the original registry.
   */
  public get original(): Registry<unknown, unknown> | Record<string, unknown>  | undefined {
    return this._original;
  }

  /**
   * Gets the scopes registry.
   */
  public get scopes(): Readonly<Registry<unknown, unknown>[]> {
    return this._scopes;
  }

  /**
   * Gets the lookups registry.
   */
  public get lookups(): Readonly<Registry<unknown, (key: unknown, thisArg: unknown, options?: EvalOptions) => unknown>> {
    return this._lookups;
  }

  /**
   * Gets the evaluation options.
   */
  public get options(): EvalOptions {
    return this._options;
  }

  /**
   * Creates a new instance of EvalContext.
   * @param original - The original registry or an object to create a registry from.
   * @param options - The evaluation options.
   */
  constructor(
    original: Registry<unknown, unknown> | Record<string, unknown> | undefined,
    options: EvalOptions
  ) {
    const caseInsensitive = options.caseInsensitive;
    if (original instanceof Registry) {
      this._original = original;
    } else if (!original) {
      this._original = undefined;
    } else if (caseInsensitive) {
      this._original = Registry.fromObject(original, options.value);
    } else {
      this._original = original as Record<string, unknown>;
    }
    this._scopes = [];
    this._options = options;
    this._lookups = new Registry<unknown, (key: unknown, thisArg: unknown, options?: EvalOptions) => unknown>();
  }

  /**
   * Converts the given context to an instance of EvalContext.
   * @param context - The context to convert.
   * @param options - The evaluation options.
   * @returns The converted EvalContext instance.
   */
  public static toContext(context?: EvalContext | Record<string, unknown> | Registry<string, unknown> | undefined,
                          options?: EvalOptions): EvalContext {
    if (!context) {
      return new EvalContext(undefined, options || new EvalOptions());
    } else if (context instanceof EvalContext) {
      return context;
    } else if (context instanceof Registry) {
      return new EvalContext(context, options || new EvalOptions());
    }
    return new EvalContext(context as Record<string, unknown>, options || new EvalOptions());
  }

  /**
   * Gets the value associated with the specified key from the evaluation context.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if not found.
   */
  public get(key: unknown): unknown | undefined {
    if (this._original && this._original instanceof Registry) {
      const value = this.getFromRegistry(this._original, key);
      if (value !== undefined) {
        return value;
      }
    } else if (this._original && this._original instanceof Object) {
      const value = this.getFromObject(this._original, key as string);
      if (value !== undefined) {
        return value;
      }
    }
    for (const scope of this._scopes) {
      const value = this.getFromRegistry(scope, key);
      if (value !== undefined) {
        return value;
      }
    }
    for (const lookup of this._lookups.values) {
      const value = lookup(key, this, this._options);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  public getThis(key: unknown): unknown | undefined {   // ToDo: refactor
    if (this._original && this._original instanceof Registry) {
      const value = this.getFromRegistry(this._original, key);
      if (value !== undefined) {
        return this._original;
      }
    } else if (this._original && this._original instanceof Object) {
      const value = this.getFromObject(this._original, key as string);
      if (value !== undefined) {
        return this._original;
      }
    }
    for (const scope of this._scopes) {
      const value = this.getFromRegistry(scope, key);
      if (value !== undefined) {
        return scope;
      }
    }
    for (const lookup of this._lookups.values) {
      const value = lookup(key, this, this._options);
      if (value !== undefined) {
        return lookup;
      }
    }
    return undefined;
  }


  public set(key: unknown, value: unknown): void {
    if (this._original && this._original instanceof Registry) {
      const registry = this._original as Registry<unknown, unknown>;
      registry.set(key, value);
    } else if (this._original && this._original instanceof Object) {
      const obj = this._original as Record<string, unknown>;
      obj[key as string | number] = value;
    }
  }

  private getFromRegistry(registry: Registry<unknown, unknown>, key: unknown): unknown | undefined {
    return registry.get(key);
  }

  private getFromObject(obj: Record<string, unknown>, key: string): unknown | undefined{
    if (!this._options.caseInsensitive) {
      return obj[key as string];
    }
    for (const [k, value] of Object.entries(obj)) {
      const found = key.localeCompare(k, 'en', { sensitivity: 'base' }) === 0;
      if (found) {
        return value;
      }
    }
    return undefined;
  }

}
