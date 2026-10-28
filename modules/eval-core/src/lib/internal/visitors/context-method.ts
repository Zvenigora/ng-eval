import type { Context } from '../classes/common';
import type { EvalContext, EvalMemberWrite, EvalOptions } from '../classes/eval';

/**
 * Security: a method of the evaluation context, as the context's **class**
 * defines it (`docs/a35/plan.md` § 9, Revision 16).
 *
 * **The instance is not where a method comes from.** `this.k = v` is a member
 * write whose target is the `EvalContext` itself, and a plain context consults
 * no policy about it (`docs/backlog.md` A42), so an expression can create an
 * own property under any name the pollution guard does not refuse - `push`,
 * `get`, `getKey`, `checkMemberWrite` among them. An own property shadows the
 * prototype's method, so `context.push(...)` written anywhere in the evaluator
 * would invoke what the expression planted, **with the real `EvalContext` as
 * its `this`**. A function that keeps that `this` has the context, and the
 * context exposes the caller's own object.
 *
 * The receiver guard (`context-receiver.ts`) closed that for the receivers a
 * *called function* is handed. It did not close it for the evaluator's own
 * invocations, which are not made through the view at all: the four scope
 * pushes and their pops, every resolution, both write paths, and the
 * member-write policy. Those are the plan's § 9 enumeration.
 *
 * **Since Revision 16 the plant cannot be created at all**, which is the
 * first of three layers and the one that does the work:
 * `prototype-pollution-guard.ts`'s `refuseContextWrite` refuses any member
 * write whose target is an `EvalContext`, by class. This module is the second
 * layer, and it is kept where it costs nothing - the scope pushes and pops,
 * the write path, and the policy. It was measured at every resolution too,
 * which is where the capture would have been read from, and that cost ~20% on
 * the bare-call path and ~24% on the member-read path (`docs/a35/plan.md`
 * M19): with the write refused there is no plant for those sites to find, so
 * they read the instance as they always did. The third layer is
 * `member-expression.ts`'s by-class refusal of a context reached as data.
 *
 * So this module is the single answer to "what does calling `m` on this
 * receiver mean" wherever that question is still asked: the view asks it for
 * `push` and `pop`, and the sites above ask it for the method they are about
 * to call. One implementation - a second copy would be the drift
 * `EvalContext.getKey` spent four versions in (`docs/backlog-retired.md` A4).
 *
 * **The chain is out of the expression's reach, which is what makes this
 * sound.** `__proto__`, `constructor` and `prototype` are refused by
 * `prototype-pollution-guard.ts`, as a member of `this` and through the view
 * alike, so what the walk finds on the chain is what the class put there, and
 * when it looks does not matter. Measured, every shape refused.
 *
 * A subclass override is still found, because the walk starts at the
 * instance's immediate prototype. That is load-bearing rather than
 * hypothetical: `@zvenigora/ng-eval-signals` subclasses `EvalContext` and
 * overrides `set` and `checkMemberWrite`, and a module-level capture of
 * `EvalContext.prototype.push` would silently skip such an override.
 *
 * **Nothing is cached, and that was the measurement.** The plan asked for one
 * entry per prototype rather than per context, because a context is built per
 * evaluation on the ordinary path and a per-context cache is built and thrown
 * away with it - the N-d measurement that took the receiver view's own cache
 * out (`docs/a35/plan.md` N-d). A per-prototype cache answers that, but it
 * also freezes a class's methods at the first evaluation, and it was measured
 * no cheaper than resolving each time: see {@link prototypeMethod}, where both
 * halves of that are recorded. Resolution is a property read off the
 * prototype, which is O(1) and always current.
 *
 * The names below are the methods the evaluator invokes on a context or a
 * scope. `checkMemberWrite` is one of them although `EvalContext` leaves it
 * undefined: a subclass defines it, and an expression must not be able to
 * supply one. See {@link contextCheckMemberWrite}, which treats unresolved as
 * the documented opt-out rather than as a refusal.
 */
export type ContextMethodName =
  | 'push'
  | 'pop'
  | 'set'
  | 'setInScope'
  | 'scopeHolding'
  | 'checkMemberWrite';

type Method = (...args: unknown[]) => unknown;

/**
 * `key` as the receiver's class defines it - unbound, so the caller supplies
 * the receiver and nothing is allocated per call.
 *
 * **The read starts at the prototype, which is the whole mechanism.** Reading
 * it off the receiver would find an own property first, and an own property is
 * what an expression can create. Starting one link up skips the instance and
 * finds what the class - or a subclass, since the read walks the chain from
 * there - actually defines.
 *
 * **Resolved per call, and not cached per prototype, which was measured.** A
 * cache keyed by prototype is one entry per class and reads cheaply, but it
 * freezes the class's methods at the first evaluation of the process: a
 * prototype patched afterwards is never seen again. That is not hypothetical
 * - `performance.spec.ts`'s read-emission guard spies on
 * `EvalContext.prototype.getKey`, and under the cached form the spy was
 * installed after the entry was taken and was never called, so a test that
 * asserts real behaviour went red for a reason that had nothing to do with it.
 * Worse, a spy installed *before* an entry was taken would have been cached
 * and outlived its own test. A property read off the prototype is cheaper than
 * the `WeakMap` lookup the cache needs anyway (M19), so the cache cost
 * correctness and bought nothing.
 *
 * The chain read can in principle invoke a prototype accessor, which the
 * descriptor walk this replaces could not. Nothing on the chain of either
 * class is an accessor under these names, and an expression cannot add one:
 * `__proto__`, `constructor` and `prototype` are refused by
 * `prototype-pollution-guard.ts`, as a member of `this` and through the view
 * alike. A non-function - an accessor's value included - yields undefined, and
 * the caller gives the named refusal rather than a raw `TypeError`.
 *
 * @param receiver - The context, or a scope of its chain.
 * @param key - The method name.
 * @returns The class's method, or undefined when the class defines none.
 */
export const prototypeMethod = (receiver: object, key: ContextMethodName): Method | undefined => {

  const proto = Object.getPrototypeOf(receiver) as Record<string, unknown> | null;
  if (proto === null) {
    return undefined;
  }
  const method = proto[key];
  return typeof method === 'function' ? method as Method : undefined;
};

/**
 * The one refusal for a context member the evaluator will not reach: a key the
 * view does not forward, and a method the receiver's class does not define.
 *
 * Shared so the two cannot drift, and so neither ends as a raw `TypeError`
 * from calling undefined - which names nothing and reads as a library fault.
 */
export const refuseContextAccess = (key: PropertyKey): never => {
  throw new Error(
    `Access to "${String(key)}" on the evaluation context is blocked for security reasons`);
};

/**
 * The resolved method, or the refusal.
 *
 * Every wrapper below then calls it with `.call` and its own fixed arity
 * rather than one shared `apply` over an argument array - which is tidier,
 * and **not** where the cost of this indirection is. Measured (M19): the
 * `apply` form and this one are within noise of each other, as are resolving
 * per call and caching the resolution per prototype. What costs is replacing a
 * monomorphic `context.get(k)` with a call through a value, which cannot be
 * inlined; see the plan's M19 for the four shapes measured and the decision
 * taken on them.
 */
const methodOf = (receiver: object, key: ContextMethodName): Method => {

  const method = prototypeMethod(receiver, key);
  if (!method) {
    return refuseContextAccess(key);
  }
  return method;
};

/**
 * `EvalContext.scopeHolding` as the class defines it - at the write path's
 * two sites, which is where this resolution is kept.
 */
export const contextScopeHolding = (context: EvalContext, key: unknown): Context | undefined =>
  methodOf(context, 'scopeHolding').call(context, key) as Context | undefined;

/**
 * `EvalContext.set` as the class defines it - the method `eval-signals`
 * overrides to enforce its read-only policy, which is why resolving it off the
 * chain rather than off the instance matters twice over.
 */
export const contextSet = (context: EvalContext, key: unknown, value: unknown): void => {
  methodOf(context, 'set').call(context, key, value);
};

/**
 * `EvalContext.setInScope` as the class defines it.
 */
export const contextSetInScope = (context: EvalContext, key: unknown, value: unknown): boolean =>
  methodOf(context, 'setInScope').call(context, key, value) as boolean;

/**
 * `EvalContext.push` as the class defines it, for a context that may be
 * undefined.
 *
 * The optional receiver is deliberate: every scope push in the evaluator
 * calls `contextPush(st.context, ...)`, and its pop, `contextPop`, runs in the
 * `finally` of a `try` opened on the next line. Both wrappers no-op on an
 * absent context, so a walk with no context pushes nothing and pops nothing,
 * exactly as the `st.context?.push(...)` optional chain they replaced did.
 */
export const contextPush = (context: EvalContext | undefined, scope: Context, options?: EvalOptions): void => {
  if (!context) {
    return;
  }
  // The pair is checked once per `EvalState`, not here - see
  // {@link refuseUnbalancedScopeMethods}. A scope push runs per block and
  // per loop iteration, and the context cannot change under a state, so
  // asking per push would pay for a guarantee that is already settled.
  methodOf(context, 'push').call(context, scope, options);
};

/**
 * Refuses a context whose class defines `push` but no `pop`, at the point
 * the state is built.
 *
 * **Because the pop cannot refuse for itself.** Every pop in the evaluator is
 * the `finally` of a `try` opened after its push, so a throw raised there
 * would replace whatever error the body was propagating; {@link contextPop}
 * is therefore tolerant. That tolerance has exactly one failure mode - a
 * class with `push` and no `pop` pushes a scope nothing ever pops, on a
 * context that may back any number of evaluations, with nothing thrown. The
 * scope stack is the one invariant of the three with no net anywhere else in
 * the system, so the pair is refused up front instead, where a throw costs
 * nothing and names the cause.
 *
 * No context `EvalContext.fromContext` produces has this shape; a hand-built
 * object cast to `EvalContext` does.
 */
export const refuseUnbalancedScopeMethods = (context: EvalContext | undefined): void => {

  if (context && prototypeMethod(context, 'push') && !prototypeMethod(context, 'pop')) {
    refuseContextAccess('pop');
  }
};

/**
 * `EvalContext.pop` as the class defines it, for a context that may be
 * undefined - see {@link contextPush} for why both take one.
 */
export const contextPop = (context: EvalContext | undefined): void => {
  if (!context) {
    return;
  }
  // Tolerant where {@link contextPush} refuses, and the asymmetry is the
  // point: every pop in the evaluator is the `finally` of a `try` opened
  // after its push, so a throw raised here would **replace** whatever error
  // the body was already propagating. A class that defines no `pop` defines
  // no `push` either in any shape this library builds, so nothing was pushed
  // and not popping is the correct outcome rather than a silent drift.
  const pop = prototypeMethod(context, 'pop');
  if (pop) {
    pop.call(context);
  }
};

/**
 * The context's member-write policy, as its class defines it.
 *
 * Unresolved is the documented opt-out and not a refusal: `EvalContext`
 * declares `checkMemberWrite` and defines nothing, and a context without a
 * policy is asked nothing. What is refused is a policy an *expression*
 * supplied - a planted own `checkMemberWrite` would otherwise be invoked with
 * the real context as its `this`, before every member write, and would see
 * every write the walk makes.
 */
export const contextCheckMemberWrite = (context: EvalContext | undefined, write: EvalMemberWrite): void => {

  if (!context) {
    return;
  }
  const policy = prototypeMethod(context, 'checkMemberWrite');
  if (policy) {
    policy.call(context, write);
  }
};

/**
 * Whether the context's class defines a member-write policy - the opt-in
 * `EvalState` decides `createdObjects` by.
 *
 * Asked of the class for the same reason the call is: a planted own
 * `checkMemberWrite` must not turn the walk's object recording on and then be
 * the policy that reads it.
 */
export const hasMemberWritePolicy = (context: EvalContext | undefined): boolean =>
  !!context && prototypeMethod(context, 'checkMemberWrite') !== undefined;

/**
 * Refuses a member-write policy held as an **instance property**, loudly,
 * when the context's class defines none.
 *
 * **Because the alternative is failing open in silence.** `checkMemberWrite`
 * is declared on `EvalContext` as an optional method, so supplying one on the
 * instance reads like the way to do it. Since the policy and the opt-in are
 * both taken from the class, such a policy is inert: no error, no
 * `createdObjects`, and every write it existed to refuse goes through. A
 * security opt-in that quietly does nothing is worse than a construction
 * error, so this is the error.
 *
 * **Three shapes are instance properties, and the message has to say so.** A
 * plain `context.checkMemberWrite = fn`; an assignment in a subclass's
 * constructor; and - the one an honest consumer is most likely to write - a
 * **class field**, `class C extends EvalContext { checkMemberWrite = (w) => … }`,
 * which TypeScript defines on the instance and not on the prototype. The
 * first version of this message told the author to declare it on a subclass,
 * which the class-field author had already done, so it sent them in a
 * circle. It now names the condition (an instance property) and the remedy (a
 * method), which is the distinction that matters.
 *
 * The security reason for reading the class does not apply to the party left
 * making this mistake. An *expression* can no longer supply one at all - the
 * write is refused by `prototype-pollution-guard.ts` - so whoever holds one
 * on an instance now is a host that meant it, and the right answer to a host
 * that meant it is to say so precisely.
 *
 * Raised from `EvalState`'s constructor, so it fires once per evaluation
 * built around such a context.
 */
export const refuseInstanceMemberWritePolicy = (context: EvalContext | undefined): void => {

  if (!context
    || !Object.prototype.hasOwnProperty.call(context, 'checkMemberWrite')
    || prototypeMethod(context, 'checkMemberWrite')) {
    return;
  }
  const className = (context.constructor as { name?: string } | undefined)?.name ?? 'EvalContext';
  throw new Error(
    `"checkMemberWrite" is an instance property of this context - a class field, a constructor `
    + `assignment, or a direct assignment - and the evaluator does not use one: the policy is `
    + `resolved from the prototype chain. Declare it as a method on ${className}: `
    + `class ${className} extends EvalContext { override checkMemberWrite(write) { ... } }`);
};

