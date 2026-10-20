import { EvalContext } from '../classes/eval';
import { prototypeMethod, refuseContextAccess } from './context-method';

/**
 * Security: the receiver every function the evaluator **resolves from the
 * context's chain** is called with (`docs/a35/plan.md` § 8 q6, step 8).
 *
 * Resolved from the chain, not held by the context: the distinction is the
 * step's code review, and it is not a nicety. A function an *expression*
 * planted on the context is held by it and is not resolved from its chain -
 * and such a plant is never called through this view at all. It is refused
 * before it can be: `context-method.ts` resolves every method the evaluator
 * invokes off the class, so the plant is not invoked, by the view or by the
 * evaluator (`docs/a35/plan.md` Revision 16).
 *
 * Four receivers used to hand a function the context or the object behind it:
 * a bare call's, a bare tag's, and `this.fn()`'s for a key a lookup resolves
 * (the `EvalContext`) or a key the original holds (the original itself). The
 * context exposes the caller's own object - as an own field, and through a
 * public getter on its prototype - so a native method that returns its `this`
 * returned it as data, and native code then reached whatever the host had put
 * in the context. No value passed through the walk's stack on that route, so
 * the funnel never saw it, and no `this` was written, so step 7's positional
 * refusal did not either. That is `docs/backlog.md` A39's second half.
 *
 * Each of those four now receives this view instead. Which receivers those
 * are is decided where it is known - `evaluateMember` carries the receiver's
 * origin out in its fourth slot - and not by an identity test at the call,
 * which can see the context but not the original (`docs/a35/plan.md` § 8 q7).
 *
 * **What it forwards, and why only that.** `push` and `pop` are documented to
 * consumers: `@zvenigora/ng-eval-signals`' README has a source function push a
 * scope onto the context through its `this`, and its async-signal suite
 * exercises it. Those two are taken from the context's class, by
 * {@link boundMethod}, and bound to the real context; nothing else is
 * reachable - which is the whole contract, and it is narrower than what
 * 0.12.1 handed out, so it ships as a breaking change.
 *
 * **The proxy target is a frozen stand-in, not the context, and that is the
 * design.** A proxy forwards every operation it does not trap to its target,
 * and a property read is not the only way out of an object: the prototype
 * carries the getter, `ownKeys` names the fields, and a descriptor carries a
 * field's value. Over the real context each of those would have to be trapped,
 * and the one forgotten would be the way through. Over an empty, frozen,
 * null-prototype target they answer with nothing by construction, so only
 * `get` and `has` are trapped and they answer from the allowlist alone. The
 * spec's B1, B2 and B3 cases are those three ways out, and its S cases run
 * them against each receiver. Nothing lands on the shared target either: a
 * write is refused because it is frozen, which is what makes sharing sound.
 *
 * **A read of anything else throws, rather than answering undefined.** Both
 * were measured against all three suites: the throw turned no pre-existing
 * case red anywhere, so it costs nothing a silent undefined would have saved,
 * and it fails loudly at the read instead of somewhere downstream where the
 * cause is no longer visible. A write throws too, which is the frozen
 * target's doing rather than a trap's; up to 0.12.1 it landed on the context.
 * Both are breaking, and the CHANGELOG entry states them.
 *
 * **Built fresh for every call, and retained by nothing.** So two calls - even
 * in one walk, on one context - receive two different views, and a function
 * must not key anything on its `this`. That is a decision taken from a
 * measurement (`docs/a35/plan.md` N-d): the first form cached one view per
 * context in a `WeakMap`, and on the ordinary one-shot path, where every
 * evaluation builds a fresh context, the cache never hit and its entries cost
 * 400-1,100 ns each to retain - a bare call ran ~45% slower than before the
 * guard. Every cached variant measured - a closure for the lookup, no `bind`,
 * no `Proxy` at all - stayed 37-59% above it, and isolated, a cached view of
 * any shape cost 400-1,100 ns against ~25 ns for an uncached `Proxy`. An
 * uncached view costs a `Proxy`, its handler and two trap closures, all
 * bounded and constant per call. The binds are deferred into the `get` trap:
 * most functions never read their `this`, so most views never bind anything.
 *
 * `push` and `pop` return `void`, which the allowlist relies on: a method
 * that returned the context, or a scope, would hand back by its result what
 * the view withholds by its traps. Check that before widening the list, and
 * note that {@link boundMethod} is what makes the two *be* those methods.
 *
 * **A view that escapes as an evaluation's result fails differently in the
 * two walks.** `evaluate` returns it, and the consumer's first read of it
 * throws. `evaluateAsync` runs its result through `awaitAllPromises`, which
 * tests `value.constructor` - a read, so the refusal is raised there instead,
 * naming `constructor` rather than anything the expression wrote. Neither
 * yields the context, so this is a difference in where the refusal surfaces
 * and not in what is withheld.
 */

/**
 * The proxy target: empty, frozen and null-prototyped, so every untrapped
 * operation answers with nothing of its own. Shared by every view, which is
 * sound because a proxy's identity comes from the proxy and not its target,
 * and nothing lands on it: a write is refused because it is frozen.
 */
const EMPTY_TARGET: object = Object.freeze(Object.create(null));

/**
 * `push` or `pop` bound to the real context, as the context's **class**
 * defines it: `context-method.ts` walks the prototype chain and skips the
 * instance's own properties.
 *
 * **Reading `context[key]` instead would be a hole.** An own property shadows
 * the prototype's method, and an expression can create one - `this.k = v` is a
 * member write whose target is the `EvalContext` itself, and a plain context
 * consults no policy about it (`docs/backlog.md` A42). The view would then
 * forward whatever was planted, bound to the real context, and a host function
 * that returns what its `this.push(...)` returns would hand the context back
 * into the walk. That is the step's code review C1, and the chain walk is the
 * fix.
 *
 * That walk is shared with every site where the *evaluator itself* invokes a
 * method on the context, which the review's second finding is about: the view
 * was never the only caller, and a plant the view ignored was still invoked by
 * `program.ts`, `block-statement.ts`, `for-statement.ts` and
 * `arrow-function-expression.ts` - with the real context as its `this`. One
 * resolver answers for all of them (`docs/a35/plan.md` Revision 16).
 */
const boundMethod = (context: EvalContext, key: 'push' | 'pop'): unknown =>
  prototypeMethod(context, key)?.bind(context);

/**
 * A guarded view of `context` for one call. The methods the view forwards to
 * the real context are `push` and `pop`, and nothing else.
 *
 * @param context - The walk's context, or undefined when the state has none.
 * @returns A new view, or `context` unchanged when there is none to guard.
 */
export const guardedReceiver = (context: EvalContext | undefined): unknown => {

  if (!context) {
    return context;
  }

  // Resolved and bound on first use rather than here, and memoized per view.
  // **When it happens does not matter, and that is measured**: the expression
  // cannot reach the prototype chain at all, since `__proto__`, `constructor`
  // and `prototype` are refused by `prototype-pollution-guard.ts`, so what the
  // walk finds is the same whenever it looks. Doing it here instead cost every
  // bare call two resolutions and two `bind` allocations - ~15% on the
  // one-shot path, over the ~10% line this change is held to - while most
  // functions never read their `this` at all. The resolution itself is a
  // property read off the prototype (`context-method.ts`, where a cache was
  // measured and rejected); the binds are not, and they are what the
  // deferral saves.
  let push: unknown;
  let pop: unknown;

  return new Proxy(EMPTY_TARGET, {
    get: (_target, key) => {
      if (key === 'push') {
        push ??= boundMethod(context, 'push');
        if (push !== undefined) {
          return push;
        }
      } else if (key === 'pop') {
        pop ??= boundMethod(context, 'pop');
        if (pop !== undefined) {
          return pop;
        }
      }
      return refuseContextAccess(key);
    },
    has: (_target, key) => {
      if (key === 'push') {
        return (push ??= boundMethod(context, 'push')) !== undefined;
      }
      if (key === 'pop') {
        return (pop ??= boundMethod(context, 'pop')) !== undefined;
      }
      return false;
    },
  });
};
