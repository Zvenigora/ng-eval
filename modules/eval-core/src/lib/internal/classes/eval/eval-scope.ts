import { equalIgnoreCase } from "../../visitors";
import { Context, Registry, getContextValue } from "../common";

export interface EvalScopeOptions {
  global?: boolean;
  caseInsensitive?: boolean;
  namespace?: string;
  /**
   * The `this` for a method called on the scope's own object (`ns.fn()`), or
   * for `this.fn()` when this scope supplies `fn`. Unset, `ns.fn()` receives
   * the scope's object. Applied since 0.7.0; accepted and ignored before.
   */
  thisArg?: unknown;
}

const defaultEvalScopeOptions: EvalScopeOptions = {
  global: false,
  caseInsensitive: false,
  namespace: undefined,
  thisArg: undefined
};

/**
 * Whether `key` names the scope's namespace - the first test
 * {@link EvalScope.get} makes, and the one `EvalContext.getKey` asks to know
 * that a resolution came from the namespace rather than from inside the scope.
 * One copy, so the two cannot disagree about it. Not part of the public API.
 */
export const matchesNamespace = (options: EvalScopeOptions, key: unknown): boolean => {
  const { caseInsensitive, namespace } = options;

  if (typeof key !== 'string' || !namespace) {
    return false;
  }

  return caseInsensitive
    ? !!equalIgnoreCase(key, namespace)
    : key === namespace;
};

/**
 * Represents an evaluation scope.
 */
export class EvalScope {

  type = 'EvalScope';

  private _context!: Context;
  private _options!: EvalScopeOptions;

  /**
   * Gets the context of the evaluation scope.
   * @returns The context object.
   */
  public get context(): Context {
    return this._context;
  }

  /**
   * Gets the options for evaluating the scope.
   * @returns The evaluation options.
   */
  public get options(): EvalScopeOptions {
    return this._options;
  }

  /**
   * Creates a new instance of EvalScope.
   * @param context - The context of the evaluation scope.
   * @param options - The options for evaluating the scope.
   */
  constructor(
    context?: Context,
    options?: EvalScopeOptions
  ) {
    this._context = context ?? {};
    this._options = {...defaultEvalScopeOptions,...options ?? {}};
  }

  /**
   * Creates an instance of EvalScope from the given context and options.
   *
   * @param context - The context object.
   * @param options - The options object.
   * @returns An instance of EvalScope.
   */
  public static fromObject(
    context?: Context,
    options?: EvalScopeOptions): EvalScope {

    return new EvalScope(context, options);
  }

  /**
   * Gets the value of the specified key.
   * @param key - The key to retrieve the value for.
   * @returns The value of the specified key, or undefined if the key is not found.
   */
  public get(key: unknown): unknown | undefined {
    const { global } = this._options;
    const { context } = this;

    if (matchesNamespace(this._options, key)) {
      return this.context;
    }

    if (global) {
      const value = getContextValue(context, key);
      return value;
    }

    return undefined;
  }

  /**
   * Sets the value of the specified key.
   * @param key - The key to set the value for.
   * @param value - The value to set.
   */
  public set(key: string, value: unknown): void {
    const { context } = this;
    if (context && context instanceof Registry) {
      const registry = context as Registry<unknown, unknown>;
      registry.set(key, value);
    } else if (context && context instanceof Object) {
      const obj = context as Record<string, unknown>;
      obj[key as string | number] = value;
    }
  }
}
