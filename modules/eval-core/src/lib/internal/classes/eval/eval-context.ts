import { Context, Registry, Stack, fromContext } from '../common';
import { getContextKey, getContextValue, setContextValue } from '../common/context';
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

    // Presence, not value: a scope that *binds* the key answers, even when the
    // value bound is `undefined`. See {@link scopeHolding} for why the two are
    // not the same question, and what reading the value instead let through.
    const scope = this.scopeHolding(key);
    if (scope) {
      return getContextValue(scope, key);
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
   * A binding whose value is `undefined` is **found** here, and no longer reads
   * as absent - see {@link scopeHolding}.
   *
   * @param key - The key to retrieve the value for.
   * @returns The value bound by the innermost scope holding the key, or
   *   undefined when no pushed scope holds it. The two cases are no longer
   *   distinguishable from the return value alone; ask {@link hasInScopes}.
   */
  public getFromScopes(key: unknown): unknown | undefined {

    const scope = this.scopeHolding(key);
    return scope ? getContextValue(scope, key) : undefined;
  }

  /**
   * The innermost pushed scope that **binds** `key`, or undefined when none
   * does. The single pass behind {@link get}'s step 1, {@link getFromScopes}
   * and {@link hasInScopes}, so the three cannot disagree about what the scope
   * stack holds.
   *
   * **Binding, not value, and that is the whole point.** Reading the value and
   * treating `undefined` as absent - which is what this used to do - has two
   * consequences that look unrelated and are the same bug:
   *
   * - `let x;` could not shadow. A scope binding `x` to `undefined` fell
   *   through to the caller's context, so a declared-but-unset name read
   *   whatever the consumer happened to have under it.
   * - **A plain-object scope answered for every `Object.prototype` name.**
   *   `getContextValue` reads a plain record as `scope[key]`, which walks the
   *   prototype chain, so an *empty* scope resolved `toString`, `constructor`,
   *   `valueOf` and friends to the prototype's own members - shadowing
   *   `original`, `priorScopes` and `lookups`, all four of which come later in
   *   {@link get}'s order. Empty as a binding surface is not empty as a lookup
   *   surface. `hasContextKey` is own-properties-only, which closes it.
   *
   * The second was invisible while only `arrow-function-expression.ts` and
   * `pattern.ts` pushed scopes, because a walk that pushed none could not hit
   * it; a program-level scope on every evaluation made it reachable from every
   * expression, which is how it was found.
   *
   * It also removes an asymmetry between the two scope shapes: `fromContext`
   * copies a plain record into a `Registry` when `caseInsensitive` is set, and
   * a `Registry` is Map-backed, so the prototype names leaked on the
   * case-sensitive path and not on the case-insensitive one. Both now ask the
   * same own-key question.
   *
   * **Public since Phase 2 step 3, and the reason is the write sites.**
   * `assignment-expression.ts` and `update-expression.ts` need the *scope* and
   * not a yes/no: `const` kinds are recorded against the scope object on
   * `EvalState`, so a write has to know which scope it is about to land in
   * before it can decide whether the binding is reassignable. Publishing the
   * single pass is what keeps that question answered by the same code as
   * {@link get}'s step 1. The alternative was a second copy of the
   * innermost-scope walk at each write site, which is the defect
   * `docs/backlog.md` A4 and A10 already describe - two copies of one
   * resolution order, drifting - reproduced on purpose.
   *
   * @param key - The key to look for.
   * @returns The innermost scope binding the key, or undefined.
   */
  public scopeHolding(key: unknown): Context | undefined {

    for (const scope of this._scopes.asArray()) {
      if (hasContextKey(scope, key)) {
        return scope;
      }
    }

    return undefined;
  }

  /**
   * Whether any scope pushed during this evaluation *binds* the key - the
   * question the read hooks' `scoped` flag asks.
   *
   * Deliberately about binding rather than about value. It no longer parts
   * company with {@link getFromScopes} over it: both go through
   * {@link scopeHolding}, and `get` resolves a scope binding whatever its
   * value, which is the divergence this docblock used to record as deliberate.
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

    return this.scopeHolding(key) !== undefined;
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
   * Assigns to the innermost pushed scope that **binds** `key`, and reports
   * whether one did.
   *
   * The scope-aware half of the write path: `assignment-expression.ts` and
   * `update-expression.ts` try this first and fall back to {@link set}. Before
   * Phase 2 they only had {@link set}, which writes `_original` and consults no
   * scope at all - so `(x => (x = 99))(1)` wrote `99` into the *caller's*
   * object and left the arrow's parameter scope untouched.
   *
   * **Binding-presence, not scope-presence, and the fallback is load-bearing.**
   * `eval-signals` enforces a read-only policy by subclassing this class and
   * overriding {@link set} to throw, so every write that reaches the consumer's
   * data goes through the one method it overrides. An implementation that wrote
   * the innermost scope unconditionally - or created the binding when it was
   * absent - would route such a write around that override and silently disable
   * the policy of a published library, with every suite still green. Returning
   * false when nothing binds the key is what keeps {@link set} reachable.
   *
   * What it deliberately relaxes: a write to a binding the expression itself
   * created - an arrow parameter, or a `let` - no longer reaches {@link set},
   * because it mutates nothing the caller owns.
   *
   * The write dispatches through `setContextValue` rather than through the
   * prototype-pollution guard's `safeSetProperty`, and the difference is not
   * cosmetic: {@link push} normalises a plain record into a `Registry` when
   * `caseInsensitive` is set, and `Object.defineProperty` on a `Registry` would
   * define a property on the instance while inserting nothing into its map. No
   * guard is lost - this method only ever writes a key some scope already
   * *binds*, and a binding can only have been created through the guarded
   * declaration path, which rejects every blocklisted name.
   *
   * @param key - The key to assign to.
   * @param value - The value to assign.
   * @returns True when a pushed scope bound the key and received the write.
   */
  public setInScope(key: unknown, value: unknown): boolean {

    const scope = this.scopeHolding(key);
    if (!scope) {
      return false;
    }

    setContextValue(scope, key, value);
    return true;
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
