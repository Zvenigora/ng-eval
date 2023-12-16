import { Context, Registry, Stack, fromContext } from '../common';
import { getContextValue } from '../common/context';
import { EvalLookup } from './eval-lookup';
import { EvalOptions } from './eval-options';

/**
 * Represents the evaluation context for the code execution.
 */
export class EvalContext {

  type = 'EvalContext';

  private _original: Readonly<Context>;
  private _priorScopes: Readonly<Context[]>;
  private _scopes: Readonly<Stack<Context>>;
  private _lookups: Readonly<Registry<unknown, EvalLookup>>;
  private _options: Readonly<EvalOptions>;

  /**
   * Gets the original registry.
   */
  public get original(): Context {
    return this._original;
  }

  /**
   * Gets the scopes registry.
   */
  public get priorScopes(): Readonly<Context[]> {
    return this._priorScopes;
  }

    /**
   * Gets the scopes registry.
   */
    public get scopes(): Readonly<Stack<Context>> {
      return this._scopes;
    }

  /**
   * Gets the lookups registry.
   */
  public get lookups(): Readonly<Registry<unknown, EvalLookup>> {
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
    original: Context,
    options: EvalOptions
  ) {
    this._original = original;
    this._priorScopes = [];
    this._scopes = new Stack<Context>();
    this._options = options;
    this._lookups = new Registry<unknown, EvalLookup>();
  }

  /**
   * Converts the given context to an instance of EvalContext.
   * @param context - The context to convert.
   * @param options - The evaluation options.
   * @returns The converted EvalContext instance.
   */
  public static toContext(context?: Context,
                          options?: EvalOptions): EvalContext {
    const ctx = fromContext(context ?? {}, options);
    return new EvalContext(ctx, options ?? {});
  }

  /**
   * Gets the value associated with the specified key from the evaluation context.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if not found.
   */
  public get(key: unknown): unknown | undefined {
    if (this._original) {
      const value = getContextValue(this._original, key);
      if (value !== undefined) {
        return value;
      }
    }

    for (const scope of this._scopes.asArray()) {
      const value = getContextValue(scope, key);
      if (value !== undefined) {
        return value;
      }
    }

    for (const scope of this._priorScopes) {
      const value = getContextValue(scope, key);
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

  public getThis(key: unknown): unknown | undefined {
    if (this._original) {
      const value = getContextValue(this._original, key);
      if (value !== undefined) {
        return this._original;
      }
    }
    for (const scope of this._priorScopes) {
      const value = getContextValue(this._original, key);
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

}
