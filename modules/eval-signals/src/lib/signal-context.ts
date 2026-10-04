import { isSignal } from '@angular/core';
import { EvalContext, EvalMemberWrite, EvalOptions } from '@zvenigora/ng-eval-core';
import { warnOnNestedSignals } from './nested-signal-check';

/**
 * The backing data of a signal context: a plain record whose values may be
 * signals, plain values, or functions. Signals are unwrapped on read;
 * everything else is passed through untouched.
 */
export type SignalContextSource = Record<string, unknown>;

/**
 * What to do instead of a built-in method that writes, named as `eval-core`
 * names it - `'Array.prototype.sort'` - with a leading space, or nothing where
 * JavaScript has no copy to make: a `Date`, a `WeakMap`, a `WeakSet`.
 */
const methodAdvice = (method: string): string => {
  const dot = method.lastIndexOf('.');
  const owner = method.slice(0, dot);
  const name = method.slice(dot + 1);

  if (owner === 'Array.prototype' || owner === '%TypedArray%.prototype') {
    switch (name) {
      case 'sort':
        return ' Use toSorted instead, which returns a sorted copy.';
      case 'reverse':
        return ' Use toReversed instead, which returns a reversed copy.';
      case 'splice':
        return ' Use toSpliced instead, which returns a changed copy.';
      case 'fill':
        return ' Use with instead, which returns a copy with one element replaced,'
          + ' or spread it into an array literal and fill that.';
      default:
        return ' Spread it into an array literal and change the copy instead.';
    }
  }
  if (owner === 'Map.prototype' || owner === 'Set.prototype') {
    return ' Spread its entries into an array literal and work on the copy instead.';
  }
  if (owner === 'Object') {
    return ' Spread it into an object literal and change the copy instead.';
  }
  return '';
};

const writeErrorMessage = (key: unknown, expression: string | undefined,
  kind: 'key' | 'member' | 'method'): string => {

  const where = expression === undefined ? '' : ` in expression '${expression}'`;

  if (kind === 'method') {
    return `Cannot call ${String(key)}${where}: `
      + `a signal expression may write only into objects it created.${methodAdvice(String(key))}`;
  }

  const target = kind === 'member'
    ? `member '${String(key)}'`
    : `'${String(key)}'`;
  const why = kind === 'member'
    ? 'a signal expression may write only into objects it created.'
    : 'the keys of a signal context are read-only.';

  return `Cannot assign to ${target}${where}: ${why}`;
};

/**
 * Thrown when an expression assigns to a key of a signal context, or to a
 * member of an object the expression did not create, or calls a built-in
 * method that would write into one.
 *
 * The keys are read-only by design. An `AssignmentExpression` or
 * `UpdateExpression` against one would otherwise write into the context's
 * empty `original`, which `EvalContext.get` consults *before* the resolver -
 * so the written value would shadow the source from then on. A signal
 * context is reused for the life of the signal, which makes that shadow
 * permanent and leaves the signal silently frozen on a stale value.
 *
 * Two further reasons, either of which would be enough on its own: a signal
 * write inside a `computed()` is illegal to Angular anyway, so the consumer
 * would only be trading this error for `NG0600`; and a derived value that
 * mutates its own inputs does not have a stable value regardless of Angular.
 *
 * **Since 0.3.0 a member write is refused too**, unless its target is an
 * object the expression created - see {@link kind}. `user.name = 'Bob'` lands
 * in the object the consumer's signal holds, which is the second reason above
 * in its plainest form: the recompute mutates the input it was derived from.
 *
 * The message is assembled by two layers, because neither knows both halves.
 * `createSignalContext` knows the key and is callable with no expression at
 * all; `createEvalSignal` knows the expression, and re-raises this error with
 * that half added and the original kept as {@link cause}.
 */
export class SignalContextWriteError extends Error {

  /**
   * The key the expression tried to write: a key of the context when
   * {@link kind} is `'key'`, the property name when it is `'member'` - `name`
   * for `user.name = 'Bob'`, `0` for `list[0] = 1`. When it is `'method'`, the
   * method instead, as `eval-core` names it: `'Array.prototype.push'` for
   * `user.tags.push('x')`.
   *
   * Under `caseInsensitive` the two visitors resolve the key through
   * `EvalContext.getKey` before writing, and since 0.2.0 a signal context
   * answers a source key with the **source's** spelling: `COUNT = 5` over
   * `{ count }` names `count`. Up to 0.1.x it was `undefined`, and the message
   * named `'undefined'`. A member's key is the spelling the target object
   * holds, which the member visitor resolves.
   */
  readonly key: unknown;

  /**
   * Which policy refused the write.
   *
   * - `'key'` - an assignment to a key of the context, `count = 5`. The keys
   *   are read-only.
   * - `'member'` - an assignment to a member of an object the expression did
   *   not create: anything it was given, or got back from a call.
   *   `user.name = 'Bob'`, `user.n++`, `[user].map(u => (u.name = 'x'))`.
   *   An object the expression created - an object, array or regex literal, a
   *   rest value, an arrow function - may be written. Since 0.3.0; up to
   *   0.2.x a member write was not refused at all.
   * - `'method'` - a call of a built-in method that would write into an
   *   object the expression did not create: `user.tags.push('x')`,
   *   `user.tags.sort()`, `m.set(k, v)`, `Object.assign(user, p)`. The same
   *   objects may be written as for `'member'`, so `[...user.tags].sort()`
   *   is allowed. The message names the method and, where JavaScript has
   *   one, what to call instead - `toSorted`, `toReversed`, `toSpliced`,
   *   `with`, or a spread into a literal. Since 0.4.0; up to 0.3.x the call
   *   went through and mutated the caller's data.
   */
  readonly kind: 'key' | 'member' | 'method';

  /** The source expression - present only when raised through `createEvalSignal`. */
  readonly expression?: string;

  /**
   * The error this one was raised from, when it was enriched.
   *
   * Declared here rather than passed to `super`: `ErrorOptions` and
   * `Error.cause` are ES2022 and this workspace compiles against
   * `lib: ["es2020", "dom"]`. If that is ever raised, this member starts
   * shadowing `Error.cause` and `noImplicitOverride` will ask for `override`.
   */
  readonly cause?: unknown;

  constructor(key: unknown, expression?: string, cause?: unknown,
    kind: 'key' | 'member' | 'method' = 'key') {

    super(writeErrorMessage(key, expression, kind));

    this.name = 'SignalContextWriteError';
    this.key = key;
    this.kind = kind;
    this.expression = expression;
    this.cause = cause;

    // `extends Error` loses the prototype chain under a downlevelled emit,
    // which would make the `instanceof` that `createEvalSignal` selects on
    // silently false - and a write violation would then be swallowed by
    // `onError` instead of bypassing it. A no-op at this library's own
    // target; insurance against a consumer's toolchain.
    Object.setPrototypeOf(this, SignalContextWriteError.prototype);
  }
}

/**
 * The `EvalContext` a signal context is built on, private to this module.
 *
 * `EvalContext.set` is the interception point for the read-only policy, and
 * it is exact for the writes the policy claims: a write whose target is a
 * bare **identifier**. `assignment-expression.ts` routes those through `set`
 * for `=` and its compound forms, `update-expression.ts` for `++` / `--`, and
 * nothing else in `eval-core` calls `set` at all. Scope handling uses `push` /
 * `pop`, and `priorScopes` is populated by the caller, so the override has no
 * legitimate internal caller to let through.
 *
 * **A member target is policed by {@link checkMemberWrite}, not by `set`.**
 * Each of those two visitors has a second branch - a `MemberExpression`
 * target - which writes the property straight into the object and never calls
 * `set`. So `user.name = 'Bob'` would mutate the object *inside* the
 * consumer's signal: a write *through* a signal-backed key rather than *to*
 * one, into data this library does not own. Up to 0.2.x nothing refused it
 * (`docs/backlog-retired.md` C1). `eval-core` 0.10.0 asks the context about
 * every member write and says whether the walk created the target; this
 * context refuses any target it did not.
 *
 * A mutating *method* is asked about through the same hook: since
 * `eval-core` 0.11.0 the call visitor asks before calling a built-in that
 * writes into an object it is handed - `user.tags.push('x')`, `m.set(k, v)`,
 * `Object.assign(user, p)` - and this context refuses one whose target the
 * walk did not create (`docs/backlog-retired.md` C4). A method the caller
 * wrote is the caller's own code and is not asked about.
 *
 * Guarding the `original` object instead - a `Proxy` with a throwing `set`
 * trap - was rejected: it sits below the layer that knows *who* is writing,
 * so it cannot tell the evaluator's write from a consumer deliberately
 * populating `original` to shadow the source, which is documented behaviour
 * and asserted in this module's spec.
 *
 * The subclass is not exported. `createSignalContext` declares `EvalContext`
 * as its return type, and `EvalContext.fromContext` short-circuits on
 * `instanceof EvalContext`, which this satisfies - so reuse across
 * recomputes is unaffected.
 */
class SignalEvalContext extends EvalContext {

  /**
   * The source key this context's own resolver matched while answering, set
   * by that resolver and read back by {@link getKey}. Undefined outside a
   * `getKey` call, and when anything other than this context's source
   * answered.
   */
  private answeredBy: string | undefined;

  public override set(key: unknown): void {
    throw new SignalContextWriteError(key);
  }

  /**
   * Refuses a member write unless the walk created its target, and a built-in
   * method's call on the same terms. Implementing this is what opts the
   * context in: `eval-core` then records, per evaluation, the objects the
   * walk creates - which is the whole cost, and one that only a signal
   * context pays.
   */
  public override checkMemberWrite(write: EvalMemberWrite): void {
    if (write.createdByEvaluation) {
      return;
    }
    if (write.method !== undefined) {
      throw new SignalContextWriteError(write.method, undefined, undefined, 'method');
    }
    throw new SignalContextWriteError(write.key, undefined, undefined, 'member');
  }

  /**
   * Under `caseInsensitive`, a key the source resolves is answered with the
   * source's own spelling - so the read hooks and a write error name `count`
   * for `COUNT` over `{ count }`. Anything else keeps `eval-core`'s answer: a
   * pushed scope still shadows the source, and a prior scope or a lookup a
   * caller added answers as it would on any `EvalContext`.
   *
   * Whether the source answered is asked of `get` itself rather than of a
   * second copy of its order: the resolver records the key it matched, and
   * `get` only reaches the resolver when scopes, `original` and prior scopes
   * found nothing. That order is the same in every `eval-core` the peer range
   * admits, so no version check is needed. The cost is a second `get` per
   * `getKey` - one more call of a signal already read - and only under
   * `caseInsensitive`, the only mode in which a spelling can differ.
   */
  public override getKey(key: string | number | symbol): string | number | symbol | undefined {

    if (!this.options['caseInsensitive']) {
      return super.getKey(key);
    }

    const outer = this.answeredBy;
    this.answeredBy = undefined;

    try {
      this.get(key);
      return this.answeredBy ?? super.getKey(key);
    } finally {
      this.answeredBy = outer;
    }
  }

  /** Called by this context's own resolver when the source answered. */
  public noteAnswer(sourceKey: string): void {
    this.answeredBy = sourceKey;
  }
}

/**
 * Matches a key against the source, preferring an exact match, and returns
 * the source's own key - or undefined when the source holds none.
 *
 * Under `caseInsensitive` a key that does not match exactly falls back to the
 * first source key that differs only in case, in insertion order. An exact
 * match always wins, so enabling the option never changes how an
 * exactly-spelled key resolves.
 */
const match = (
  source: SignalContextSource,
  key: unknown,
  caseInsensitive: boolean
): string | undefined => {

  if (Object.prototype.hasOwnProperty.call(source, key as PropertyKey)) {
    return key as string;
  }

  if (!caseInsensitive || typeof key !== 'string') {
    return undefined;
  }

  const lowered = key.toLowerCase();
  return Object.keys(source).find((candidate) => candidate.toLowerCase() === lowered);
};

/**
 * Creates an `EvalContext` whose reads resolve *through* signals.
 *
 * The context is not itself reactive. Its value is that a read ends in a
 * signal call: run an evaluation over this context from inside a `computed()`
 * and Angular records the dependency natively, per key, exactly as the walk
 * performed it. Reading `c` and not `d` subscribes to `c` and not `d`.
 *
 * ```ts
 * const context = createSignalContext({ c: signal(1), d: signal(2) });
 * const total = computed(() => evalService.simpleEval('c + 1', context));
 * ```
 *
 * Construct the context **once per signal** and reuse it across recomputes.
 *
 * Two properties of the `lookups` resolution point come with this:
 *
 * - **Lookups run last.** `EvalContext.get` resolves scopes, then `original`,
 *   then prior scopes, then lookups - so a name already resolvable earlier in
 *   that order never reaches the source. The adapter starts with an empty
 *   `original`, so a consumer who populates it afterwards is shadowing the
 *   source. Note that an empty `original` is not the same as no `original`:
 *   `getContextValue` reads a plain object as a bare property access, so an
 *   `Object.prototype` name - `toString`, `valueOf`, `constructor`,
 *   `hasOwnProperty` - resolves off the prototype and shadows a source key of
 *   the same name.
 * - **A closure that escapes the evaluation is not tracked.** Reads made after
 *   the walk returns happen outside the reactive context. This is inherent to
 *   Angular's tracking model.
 *
 * The returned context's keys are **read-only**: an assignment or update
 * against one throws {@link SignalContextWriteError} rather than writing. So
 * does an assignment or update to a member of anything the expression did not
 * create - see {@link SignalContextWriteError.kind}.
 *
 * @param source - The backing record. Values that are signals are unwrapped.
 * @param options - Configures this context and its resolver, not the walk.
 *                  `caseInsensitive` corrects identifier keys here, because
 *                  lookups receive the raw key - but *property* names are
 *                  corrected by the member visitor off the state's options, so
 *                  the same options must also be passed to `simpleEval` /
 *                  `createState` for `user.NAME` to resolve `name`.
 * @returns An `EvalContext` to pass to `EvalService` / `CompilerService`.
 */
export const createSignalContext = (
  source: SignalContextSource,
  options?: EvalOptions
): EvalContext => {

  warnOnNestedSignals(source);

  const caseInsensitive = !!options?.['caseInsensitive'];
  const context = new SignalEvalContext({}, options ?? {});

  context.lookups.push((key) => {
    const sourceKey = match(source, key, caseInsensitive);
    if (sourceKey === undefined) {
      return undefined;
    }

    const held = source[sourceKey];
    const value = isSignal(held) ? held() : held;

    // Only an answer `get` will take: `undefined` reads as "not found", and
    // `get` moves on to the next lookup.
    if (value !== undefined) {
      context.noteAnswer(sourceKey);
    }
    return value;
  });

  return context;
};
