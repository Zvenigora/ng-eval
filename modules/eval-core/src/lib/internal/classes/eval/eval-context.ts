import { Context, Registry, Stack, fromContext } from '../common';
import { getContextValue, setContextValue } from '../common/context';
import { EvalLookup } from './eval-lookup';
import { EvalMemberWrite } from './eval-member-write';
import { EvalOptions } from './eval-options';
import { EvalScope, matchesNamespace } from './eval-scope';

/**
 * Whether a context holds a key at all, regardless of the value bound to it.
 *
 * There is no `getContextValue` counterpart for this: that helper cannot
 * distinguish an absent key from one bound to `undefined`. Own properties
 * only - the scopes this is used on are object literals
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
 * What {@link resolve} found: the value, and what held it - a pushed scope or
 * the original (a `Context`), a prior scope (an `EvalScope`), or a lookup
 * (`undefined`, since a lookup is a resolver and holds no key).
 */
interface Resolution {
  readonly value: unknown;
  readonly holder: Context | EvalScope | undefined;
}

/**
 * `EvalContext.get`'s resolution order, once, for both questions asked of it:
 * `get` reads the value, `getKey` the spelling of the key that held it.
 * Undefined exactly when `get` finds nothing.
 *
 * Up to 0.7.x `getKey` walked a copy of this order of its own, and the copy
 * drifted three ways (`docs/backlog-retired.md` A4 and A10): it never consulted
 * `lookups`; it searched inside every prior scope's context but never a
 * namespace, where `EvalScope.get` does the reverse for a non-global scope; and
 * it took the first spelling a source held, with no regard to whether `get`
 * found a value there - so a pushed plain scope answered for every key. This is
 * the shape `scopeHolding` gave `get`, `getFromScopes` and `hasInScopes` in
 * Phase 2 step 1: one pass, several questions.
 *
 * A module function rather than a method, so the published class shape is
 * unchanged; it reads only what the class exposes.
 *
 * 1. The pushed scopes, by **presence** - see `scopeHolding`.
 * 2. The original, by value.
 * 3. Each prior scope, through `EvalScope.get` itself, so the namespace and
 *    `global` rules are that method's and not a copy of them.
 * 4. Each lookup, by value.
 */
const resolve = (context: EvalContext, key: unknown): Resolution | undefined => {

  const scope = context.scopeHolding(key);
  if (scope) {
    return { value: getContextValue(scope, key), holder: scope };
  }

  const original = context.original;
  if (original) {
    const value = getContextValue(original, key);
    if (value !== undefined) {
      return { value, holder: original };
    }
  }

  for (const prior of context.priorScopes) {
    const value = prior.get(key);
    if (value !== undefined) {
      return { value, holder: prior };
    }
  }

  for (const lookup of context.lookups) {
    const value = lookup(key, context, context.options);
    if (value !== undefined) {
      return { value, holder: undefined };
    }
  }

  return undefined;
};

/**
 * The spelling under which `holder` holds `key`, given that it does.
 *
 * Only a case-insensitive `Registry` can hold a key under another spelling;
 * it keeps the spelling it was last written with, and matches by
 * `toLowerCase`, so that is the comparison used to find it. A case-sensitive
 * `Registry` and a plain record are read by exact key - `get` reads a plain
 * record as `obj[key]` whatever the context's own options - so the key is its
 * own spelling there.
 */
const spellingIn = (holder: Context, key: string | number | symbol): string | number | symbol => {

  if (holder instanceof Registry
    && holder.options['caseInsensitive'] === true
    && typeof key === 'string') {

    const lowered = key.toLowerCase();
    for (const candidate of holder.keys) {
      if (typeof candidate === 'string' && candidate.toLowerCase() === lowered) {
        return candidate;
      }
    }
  }

  return key;
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

    // Pushed scopes by presence, not value: a scope that *binds* the key
    // answers, even when the value bound is `undefined`. See
    // {@link scopeHolding} for why the two are not the same question. The
    // order itself is `resolve`'s, shared with {@link getKey}.
    return resolve(this, key)?.value;
  }

  /**
   * Step 1 of {@link get}'s resolution order on its own: the scopes pushed
   * during this evaluation, innermost first.
   *
   * {@link get} calls this rather than inlining the loop, so that the read
   * hooks' `scoped` flag and the resolution it describes are the *same*
   * implementation. A second copy of the order would drift - `getKey`'s did,
   * until 0.8.0 (`docs/backlog-retired.md` A4).
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
   * `docs/backlog-retired.md` A4 and A10 describe - two copies of one
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
   * Retrieves the `this` value a call of the specified key receives through
   * `this.key()`.
   *
   * - A key the original context holds: the original context.
   * - A key a prior scope resolves: that scope's `thisArg`, or undefined when
   *   it sets none. The first scope that resolves the key answers, as in
   *   {@link get}.
   * - A key only a lookup resolves, or none: undefined. A lookup is a resolver,
   *   not an object that holds the key.
   *
   * Undefined means "no receiver of its own", and the member visitor then falls
   * back to the object it was evaluating. Up to 0.6.x the prior-scope step
   * re-tested the original context and could never answer, and the lookup step
   * returned the lookup function itself (`docs/backlog-retired.md` A7).
   * @param key - The key to retrieve the value for.
   * @returns The `this` value associated with the key, or undefined.
   */
  public getThis(key: unknown): unknown | undefined {
    if (this._original) {
      const value = getContextValue(this._original, key);
      if (value !== undefined) {
        return this._original;
      }
    }
    for (const scope of this._priorScopes) {
      if (scope.get(key) !== undefined) {
        return scope.options.thisArg;
      }
    }
    return undefined;
  }

  /**
   * The key {@link get} resolves `key` to: the spelling under which the source
   * that answered holds it. The read hooks report this as the key that was
   * read, and the write visitors write to it under `caseInsensitive`.
   *
   * Resolved through {@link get}'s own chain, so the two cannot disagree:
   *
   * - A pushed scope, the original, or a `global` prior scope holding the key:
   *   the spelling that source holds it under - corrected only where the
   *   source is a case-insensitive `Registry`, which is the only kind that
   *   matches another spelling.
   * - A prior scope's namespace: the namespace, as the scope declares it.
   * - A lookup: the key as written, since a lookup returns no key.
   * - Nothing: undefined, exactly when {@link get} finds nothing. A pushed
   *   scope binding the key to `undefined` counts as found, as in {@link get}.
   *
   * Since 0.8.0. Up to 0.7.x it walked its own copy of the chain: it never
   * consulted lookups, never matched a namespace, reported keys held inside a
   * non-global prior scope that {@link get} never reads, and answered a
   * spelling from a source where {@link get} found no value - including every
   * key at all, once a plain-object scope was pushed.
   *
   * @param key - The key as written.
   * @returns The resolved key, or undefined when {@link get} finds nothing.
   */
  public getKey(key: string | number | symbol): string | number | symbol | undefined {

    const resolution = resolve(this, key);

    if (!resolution) {
      return undefined;
    }

    const { holder } = resolution;

    if (holder === undefined) {
      return key;
    }

    if (holder instanceof EvalScope) {
      return matchesNamespace(holder.options, key)
        ? holder.options.namespace
        : spellingIn(holder.context, key);
    }

    return spellingIn(holder, key);
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
   * `caseInsensitive` is set, and `safeSetProperty` writes a property onto the
   * object it is given - by assignment since 0.10.0, by `Object.defineProperty`
   * before - which on a `Registry` sets a property on the instance while
   * inserting nothing into its map. No
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
   * An opt-in policy for **member** writes - `o.k = v`, `o.k += v`, `o.k++`.
   * Those never reach {@link set} or {@link setInScope}: the assignment and
   * update visitors write the member straight into the object, so a context
   * that overrides {@link set} to protect its keys cannot see a write made
   * *through* one. This is the hook that can.
   *
   * **Undefined on `EvalContext`, and that is the opt-out.** A subclass that
   * implements it opts in to two things, decided once per `EvalState`, when
   * the state is built around this context:
   *
   * - the walk records every object it creates for the expression to hold -
   *   object, array and regex literals, rest values, arrow functions - on that
   *   state, in a `WeakSet` the state holds; and
   * - before each member write, the assignment and update visitors call this
   *   with the target, the key, and whether that state's walk created the
   *   target - see {@link EvalMemberWrite.createdByEvaluation}, which also
   *   says what does not count, and why.
   *
   * To refuse a write, throw: nothing is written, and the error leaves the
   * evaluation as thrown. Returning allows it, and the prototype-pollution
   * guard still applies after. A context that does not implement this pays
   * one field read at each of those sites, and nothing else.
   *
   * What it does not see: a mutating **method** call - `arr.push(x)`,
   * `arr.splice(i, 1)`, `map.set(k, v)` - writes from native code and is no
   * member write at all.
   *
   * @param write - The write about to happen.
   * @throws To refuse the write.
   */
  public checkMemberWrite?(write: EvalMemberWrite): void;

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
