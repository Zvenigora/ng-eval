import { isSignal } from '@angular/core';
import { EvalContext, EvalOptions } from '@zvenigora/ng-eval-core';
import { warnOnNestedSignals } from './nested-signal-check';

/**
 * The backing data of a signal context: a plain record whose values may be
 * signals, plain values, or functions. Signals are unwrapped on read;
 * everything else is passed through untouched.
 */
export type SignalContextSource = Record<string, unknown>;

/**
 * Resolves a key against the source, preferring an exact match.
 *
 * Under `caseInsensitive` a key that does not match exactly falls back to the
 * first source key that differs only in case, in insertion order. An exact
 * match always wins, so enabling the option never changes how an
 * exactly-spelled key resolves.
 */
const resolve = (
  source: SignalContextSource,
  key: unknown,
  caseInsensitive: boolean
): unknown => {

  if (Object.prototype.hasOwnProperty.call(source, key as PropertyKey)) {
    return source[key as string];
  }

  if (!caseInsensitive || typeof key !== 'string') {
    return undefined;
  }

  const lowered = key.toLowerCase();
  const match = Object.keys(source).find((candidate) => candidate.toLowerCase() === lowered);
  return match === undefined ? undefined : source[match];
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
  const context = new EvalContext({}, options ?? {});

  context.lookups.push((key) => {
    const value = resolve(source, key, caseInsensitive);
    return isSignal(value) ? value() : value;
  });

  return context;
};
