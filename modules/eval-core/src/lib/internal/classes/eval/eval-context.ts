import { Context, Registry, Stack, fromContext } from '../common';
import { getContextKey, getContextValue } from '../common/context';
import { EvalLookup } from './eval-lookup';
import { EvalOptions } from './eval-options';
import { EvalScope } from './eval-scope';

/**
 * Whether a context holds a key at all, regardless of the value bound to it.
 *
 * There is no `getContextValue` counterpart for this: that helper cannot
 * distinguish an absent key from one bound to `undefined`, and `getContextKey`
 * with `caseInsensitive: false` reports every key as present for a plain
 * object. Own properties only - the scopes this is used on are object literals
 * built by `evaluatePatterns`, and inherited names are not bindings.
 */
const hasContextKey = (context: Context, key: unknown): boolean => {
  if (context instanceof Registry) {
    return context.has(key);
  }
  return context instanceof Object
    && Object.prototype.hasOwnProperty.call(context, key as PropertyKey);
};

/**
 * Represents the evaluation context for the code execution.
 */
export class EvalContext {

  type = 'EvalContext';

  private _original: Readonly<Context>;
  private _priorScopes: EvalScope[];
  private _scopes: Stack<Context>;
  private _lookups: EvalLookup[];
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
  public get priorScopes(): EvalScope[] {
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
  public get lookups(): EvalLookup[] {
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
    this._lookups = [];
  }

  /**
   * Converts the given context to an instance of EvalContext.
   * @param context - The context to convert.
   * @param options - The evaluation options.
   * @returns The converted EvalContext instance.
   */
  public static fromContext(context?: EvalContext | Context | undefined,
    options?: EvalOptions): EvalContext {

    if (context instanceof EvalContext) {
      return context;
    }

    const ctx = fromContext(context ?? {}, options);
    return new EvalContext(ctx, options ?? {});
  }

  /**
   * Gets the value associated with the specified key from the evaluation context.
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if not found.
   */
  public get(key: unknown): unknown | undefined {

    const scoped = this.getFromScopes(key);
    if (scoped !== undefined) {
      return scoped;
    }

    if (this._original) {
      const value = getContextValue(this._original, key);
      if (value !== undefined) {
        return value;
      }
    }

    for (const scope of this._priorScopes) {
      const value = scope.get(key);
      if (value !== undefined) {
        return value;
      }
    }

    for (const lookup of this._lookups) {
      const value = lookup(key, this, this._options);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Step 1 of {@link get}'s resolution order on its own: the scopes pushed
   * during this evaluation, innermost first.
   *
   * {@link get} calls this rather than inlining the loop, so that the read
   * hooks' `scoped` flag and the resolution it describes are the *same*
   * implementation. A second copy of the order would drift - `getKey` already
   * shows what that looks like when it does.
   *
   * A binding whose value is `undefined` reads as absent here, exactly as it
   * does in {@link get}, which falls through to the original context for it.
   *
   * @param key - The key to retrieve the value for.
   * @returns The value bound by the innermost scope holding the key, or
   *   undefined when no pushed scope holds it.
   */
  public getFromScopes(key: unknown): unknown | undefined {

    for (const scope of this._scopes.asArray()) {
      const value = getContextValue(scope, key);
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Whether any scope pushed during this evaluation *binds* the key - the
   * question the read hooks' `scoped` flag asks.
   *
   * Deliberately about binding rather than about value, which is where it parts
   * company with {@link getFromScopes}: a parameter bound to `undefined` is
   * still a parameter, but `get` falls through past it to the original context.
   * Reading the flag off the value would make it depend on the *data* - the
   * same arrow function over `[{ name: 'a' }]` and over `[undefined]` would
   * report different bindings, and a dependency tracker's output would vary
   * between two recomputes of one expression. That is the failure this flag
   * exists to prevent, so presence is the correct predicate.
   *
   * Both queries iterate the same stack in the same direction, so neither is a
   * second copy of the four-step resolution order; they answer two different
   * questions about its first step.
   *
   * @param key - The key to look for.
   * @returns True when a pushed scope holds the key, whatever its value.
   */
  public hasInScopes(key: unknown): boolean {

    for (const scope of this._scopes.asArray()) {
      if (hasContextKey(scope, key)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Retrieves the `this` value of the specified key from the evaluation context.
   * The value is searched in the original context, prior scopes, and lookup functions.
   * @param key - The key to retrieve the value for.
   * @returns The `this` value associated with the key, or undefined if not found.
   */
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
    for (const lookup of this._lookups) {
      const value = lookup(key, this, this._options);
      if (value !== undefined) {
        return lookup;
      }
    }
    return undefined;
  }

  /**
   * Retrieves the value associated with the specified key from the evaluation context.
   *
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key is not found.
   */
  public getKey(key: string | number | symbol): string | number | symbol | undefined {

    const caseInsensitive = !!this._options.caseInsensitive;

    for (const scope of this._scopes.asArray()) {
      const foundKey = getContextKey(scope, key, caseInsensitive);
      if (foundKey !== undefined) {
        return foundKey;
      }
    }

    if (this._original) {
      const foundKey = getContextKey(this._original, key, caseInsensitive);
      if (foundKey !== undefined) {
        return foundKey;
      }
    }

    for (const scope of this._priorScopes) {
      const foundKey = getContextKey(scope.context, key, caseInsensitive);
      if (foundKey !== undefined) {
        return foundKey;
      }
    }

    return undefined;
  }

  /**
   * Sets a key-value pair in the context.
   * If the original context is a Registry, the key-value pair is set using the Registry's set method.
   * If the original context is an Object, the key-value pair is set directly on the object.
   * @param key - The key of the pair.
   * @param value - The value of the pair.
   */
  public set(key: unknown, value: unknown): void {
    if (this._original && this._original instanceof Registry) {
      const registry = this._original as Registry<unknown, unknown>;
      registry.set(key, value);
    } else if (this._original && this._original instanceof Object) {
      const obj = this._original as Record<string, unknown>;
      obj[key as string | number] = value;
    }
  }

  /**
   * Pushes a context to the scope stack.
   * @param context - The context to push.
   * @param options - The evaluation options.
   */
  public push(context: Context, options?: EvalOptions): void {
    const ctx = fromContext(context, options);
    this._scopes.push(ctx);
  }

  /**
   * Pops a context from the scope stack.
   */
  public pop(): void {
    this._scopes.pop();
  }


  /**
   * Converts the EvalContext instance to an object representation.
   * If the original value is an instance of Registry, it converts it to an object using the toObject method of the registry.
   * If the original value is an object, it returns the original object.
   * @returns The object representation of the EvalContext instance.
   */
  public toObject(): Record<string | number | symbol, unknown> | undefined{

    if (this._original && this._original instanceof Registry) {
      const registry = this._original as Registry<unknown, unknown>;
      const object = registry.toObject();
      return object;
    } else if (this._original && this._original instanceof Object) {
      const obj = this._original as Record<string, unknown>;
      return obj;
    }

    return undefined;
  }

}
