import { EvalContext } from '../classes/eval';

/**
 * Security: the receiver a function the context holds is called with
 * (`docs/a35/plan.md` § 8 q6, step 8).
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
 * exercises it. Those two are bound to the real context and nothing else is
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
 * Cached per context in a `WeakMap`, so a context evaluated many times - the
 * pattern `@zvenigora/ng-eval-signals` is built on - builds one view and the
 * identity a function sees as `this` is stable across calls and across walks.
 *
 * `push` and `pop` return `void`, which the allowlist relies on: a method
 * that returned the context, or a scope, would hand back by its result what
 * the view withholds by its traps. Check that before widening the list.
 *
 * **A view that escapes as an evaluation's result fails differently in the
 * two walks.** `evaluate` returns it, and the consumer's first read of it
 * throws. `evaluateAsync` runs its result through `awaitAllPromises`, which
 * tests `value.constructor` - a read, so the refusal is raised there instead,
 * naming `constructor` rather than anything the expression wrote. Neither
 * yields the context, so this is a difference in where the refusal surfaces
 * and not in what is withheld.
 */

/** The methods the view forwards to the real context. */
const ALLOWED_METHODS = ['push', 'pop'] as const;

/**
 * The proxy target: empty, frozen and null-prototyped, so every untrapped
 * operation answers with nothing of its own. Shared by every view, which is
 * sound because a proxy's identity comes from the proxy and not its target,
 * and no trap ever writes to it.
 */
const EMPTY_TARGET: object = Object.freeze(Object.create(null));

const views = new WeakMap<EvalContext, object>();

/**
 * The guarded view of `context`, built once per context.
 *
 * @param context - The walk's context, or undefined when the state has none.
 * @returns The view, or `context` unchanged when there is none to guard.
 */
export const guardedReceiver = (context: EvalContext | undefined): unknown => {

  if (!context) {
    return context;
  }

  const cached = views.get(context);
  if (cached) {
    return cached;
  }

  const methods = new Map<PropertyKey, unknown>();
  for (const name of ALLOWED_METHODS) {
    const method = context[name];
    if (typeof method === 'function') {
      methods.set(name, method.bind(context));
    }
  }

  const view = new Proxy(EMPTY_TARGET, {
    get: (_target, key) => {
      if (methods.has(key)) {
        return methods.get(key);
      }
      throw new Error(
        `Access to "${String(key)}" on the evaluation context is blocked for security reasons`);
    },
    has: (_target, key) => methods.has(key),
  });


  views.set(context, view);
  return view;
};
