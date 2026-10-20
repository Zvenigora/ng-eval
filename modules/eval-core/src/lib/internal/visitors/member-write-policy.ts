import { EvalState } from '../classes/eval';
import { contextCheckMemberWrite } from './context-method';
import { refuseContextWrite } from './prototype-pollution-guard';

/**
 * Whether `value` can be held in a `WeakSet` - an object or a function.
 */
const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

/**
 * Records `value` as created by the walk, unless it is a primitive.
 *
 * For the one recording site whose value may be a primitive: an array or
 * parameter rest is `args.slice(i)`, which is a string when the destructured
 * source is one (`let [h, ...t] = "abc"`), and `WeakSet.add` throws on a
 * primitive. The literal, object-rest and arrow-function sites always create
 * an object and add directly.
 *
 * @param created - `st.createdObjects`, already read and found set by the caller.
 * @param value - The value the walk created.
 */
export const recordCreated = (created: WeakSet<object>, value: unknown): void => {
  if (isObjectLike(value)) {
    created.add(value);
  }
};

/**
 * Asks the context whether a member write may happen, through
 * `EvalContext.checkMemberWrite`. A refusal is a throw, and it propagates from
 * here unchanged: nothing has been written yet.
 *
 * Called by the member branches of `assignment-expression.ts` and
 * `update-expression.ts`, immediately before `safeSetProperty`, and only after
 * the caller has read `st.createdObjects` and found it set. That read is the
 * whole of the default path's cost: a state whose context has no policy holds
 * no set, so neither visitor reaches this call.
 *
 * @param st - The state of the walk making the write.
 * @param created - `st.createdObjects`, already read by the caller.
 * @param target - The object about to receive the write.
 * @param key - The property about to be written.
 */
export const consultMemberWrite = (st: EvalState,
  created: WeakSet<object>, target: unknown, key: unknown): void => {

  contextCheckMemberWrite(st.context, {
    target,
    key,
    createdByEvaluation: isObjectLike(target) && created.has(target),
  });
};

/**
 * A built-in method that writes into an object it is handed: the name
 * `EvalMemberWrite.method` reports, and whether the object written is the
 * method's receiver or its first argument.
 */
interface MutatingBuiltIn {
  readonly name: string;
  readonly writes: 'receiver' | 'first argument';
}

/**
 * The built-ins that write into their receiver or their first argument, keyed
 * by the function itself. Identity is the point: a method of the caller's own
 * named `push` is not one of these, and `Array.prototype.push` reached under
 * another name is.
 *
 * Read through property descriptors, since `%TypedArray%.prototype` carries
 * getters that throw when read off the prototype itself. Built once, from this
 * realm's built-ins: an array made in another realm - an iframe - holds that
 * realm's `push`, which is not in here.
 */
const MUTATING_BUILT_INS: ReadonlyMap<unknown, MutatingBuiltIn> = (() => {
  const table = new Map<unknown, MutatingBuiltIn>();

  const add = (owner: object, ownerName: string, names: readonly string[],
    writes: MutatingBuiltIn['writes']): void => {
    for (const name of names) {
      const fn: unknown = Object.getOwnPropertyDescriptor(owner, name)?.value;
      if (typeof fn === 'function') {
        table.set(fn, { name: `${ownerName}.${name}`, writes });
      }
    }
  };

  add(Array.prototype, 'Array.prototype',
    ['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], 'receiver');
  add(Object.getPrototypeOf(Int8Array.prototype), '%TypedArray%.prototype',
    ['copyWithin', 'fill', 'reverse', 'set', 'sort'], 'receiver');
  add(Map.prototype, 'Map.prototype', ['set', 'delete', 'clear'], 'receiver');
  add(Set.prototype, 'Set.prototype', ['add', 'delete', 'clear'], 'receiver');
  add(WeakMap.prototype, 'WeakMap.prototype', ['set', 'delete'], 'receiver');
  add(WeakSet.prototype, 'WeakSet.prototype', ['add', 'delete'], 'receiver');
  add(Date.prototype, 'Date.prototype',
    Object.getOwnPropertyNames(Date.prototype).filter((name) => name.startsWith('set')), 'receiver');
  add(Object, 'Object',
    ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf', 'freeze', 'seal', 'preventExtensions'],
    'first argument');

  return table;
})();

/**
 * `Function.prototype`'s three ways to run a function with a `this` the
 * caller chooses. Read once, from this realm, as the table above is.
 */
const FUNCTION_CALL: unknown = Function.prototype.call;
const FUNCTION_APPLY: unknown = Function.prototype.apply;
const FUNCTION_BIND: unknown = Function.prototype.bind;

/**
 * The arguments `Function.prototype.apply` passes on: its second argument, read
 * as an array-like, as `apply` reads it. Nothing for anything else - `apply`
 * passes none for `null` or `undefined`, and throws for a primitive.
 */
const argumentsOf = (list: unknown): readonly unknown[] =>
  isObjectLike(list) ? Array.prototype.slice.call(list as ArrayLike<unknown>) : [];

/**
 * `Reflect`'s writers, which {@link MUTATING_BUILT_INS} does not list.
 *
 * That table decides what a context's `checkMemberWrite` is asked about, and
 * widening it would change what a published policy sees. This set feeds
 * {@link WRITE_SITES} alone, so the context refusal covers `Reflect` without
 * altering the policy's surface. Each of these writes its **first** argument,
 * as `Object`'s writers do.
 */
const REFLECT_WRITERS: ReadonlySet<unknown> = new Set<unknown>([
  Reflect.set,
  Reflect.defineProperty,
  Reflect.deleteProperty,
  Reflect.setPrototypeOf,
  Reflect.preventExtensions,
]);

/**
 * What {@link refuseContextMethodWrite} does with a function, in **one**
 * lookup: every hop and every writer in a single table, keyed by the function
 * itself.
 *
 * **The hops.** `Reflect.apply` was missing from the first version and
 * carried every writer straight past the check - `Reflect.apply(Reflect.set,
 * null, [context, "get", f])` planted, and a planted `get` is invoked by the
 * evaluator on every resolution. That was the step's second code review, C1.
 *
 * **Following hops cannot be made complete, so this is a second line and not
 * a boundary.** A hop is any native function that calls another with
 * arguments it did not get from the expression's own call node:
 * `Array.prototype.map` and its siblings, `sort`, `Promise.prototype.then`,
 * `Array.from`'s second argument, `String.prototype.replace` with a function,
 * a `Proxy` trap, an accessor installed by `defineProperty`,
 * `Symbol.iterator`, `valueOf` and `toString` under coercion - and the list
 * grows with the language. What keeps a context out of such a call is that a
 * context cannot be obtained as a value at all, which is the funnel in
 * `visitor-result.ts`. The same argument is recorded for a host-provided
 * container (`SECURITY.md`, finding 3 of the A35 plan).
 *
 * **It is still reached, and so it is coverage rather than depth.** The
 * funnel exempts the walk's own context in a member's object position, and a
 * host-built AST that reuses one `this` node carries that exemption into a
 * call's arguments (`docs/a35/plan.md` § 9, the third residual). Measured
 * there: `Object.freeze`, `Object.assign`, `Object.setPrototypeOf`,
 * `Object.defineProperty` and `Reflect.set` each arrive holding the real
 * context, and each is refused here. The spec's L2d is that case.
 *
 * **One lookup rather than three, and that is measured** (`docs/a35/plan.md`
 * M20). The first form asked three questions of every call - a hop set, the
 * mutating-built-in map, then the `Reflect` set - and the common answer is
 * "none of them", so an ordinary call paid all three. The cost was structural
 * and not a deoptimisation: collapsing them to one `Map.get` that misses
 * returns the bare-call path to its baseline. This check runs on every call
 * in every expression, which is why the shape of it matters at all.
 */
const enum Site {
  /** `f.call(this, …)` and `f.bind(this, …)`: the function is the receiver. */
  CallOrBind,
  /** `f.apply(this, list)`: the arguments come from the list. */
  Apply,
  /** `Reflect.apply(f, this, list)`: the function is the first argument. */
  ReflectApply,
  /** `Reflect.construct(f, list)`: no receiver. */
  ReflectConstruct,
  /** A built-in that writes into its receiver. */
  WritesReceiver,
  /** A built-in that writes into its first argument. */
  WritesFirstArgument,
}

const WRITE_SITES: ReadonlyMap<unknown, Site> = (() => {
  const table = new Map<unknown, Site>();
  // **A later entry must never silently overwrite an earlier one.** Three
  // sources feed this table, and a function in two of them would take the
  // last writer's meaning: putting `Reflect.apply` into `REFLECT_WRITERS` -
  // an easy mistake, since it is a `Reflect` function whose first argument
  // is a target - would demote it from a hop to a writer and reopen C1
  // exactly, with no case able to show the cause. So a collision is a load
  // error rather than a silent demotion.
  const add = (fn: unknown, site: Site): void => {
    if (table.has(fn)) {
      throw new Error(`member-write-policy: ${String(fn)} is listed as two kinds of write site`);
    }
    table.set(fn, site);
  };

  add(FUNCTION_CALL, Site.CallOrBind);
  add(FUNCTION_BIND, Site.CallOrBind);
  add(FUNCTION_APPLY, Site.Apply);
  add(Reflect.apply, Site.ReflectApply);
  add(Reflect.construct, Site.ReflectConstruct);
  for (const [fn, builtIn] of MUTATING_BUILT_INS) {
    add(fn, builtIn.writes === 'receiver' ? Site.WritesReceiver : Site.WritesFirstArgument);
  }
  for (const fn of REFLECT_WRITERS) {
    add(fn, Site.WritesFirstArgument);
  }
  return table;
})();

/**
 * Security: refuses a **native** write into an evaluation context, by class -
 * the other half of `refuseContextWrite` (`docs/a35/plan.md` Revision 16,
 * item 2's enumeration).
 *
 * `safeSetProperty` covers every write an expression makes through the
 * evaluator: dotted and computed member assignment, compound assignment and
 * the update expressions. It does not cover a write made by **native code**
 * the expression merely calls - `Object.assign(c, { push: f })`,
 * `Object.defineProperty`, `Reflect.set`, `Object.setPrototypeOf`,
 * `Object.freeze`, and each of them reached through `call`, `apply` or
 * `bind`. Measured, all of those planted an own property, replaced the
 * prototype or froze the context (the plan's X-a to X-g).
 *
 * **Reachable only where a host supplies both halves**: a native namespace -
 * `Object` or `Reflect` - in the evaluation data, *and* the context itself
 * under some key, since `this` outside a member access is refused by
 * `this-position.ts` and a context can no longer be captured. Narrow, and
 * still a write to the context, so it is refused rather than documented.
 *
 * Asked before every call, unlike the policy consultation below, which a
 * context without a write policy never reaches. The cost is one map lookup
 * and one set lookup per call.
 *
 * Not asked for a tag: a tagged template's first argument is always the
 * template's strings array, so no tag can hand a context to one of these.
 */
export const refuseContextMethodWrite = (fn: unknown, receiver: unknown,
  args: readonly unknown[]): void => {

  const site = WRITE_SITES.get(fn);
  if (site === undefined) {
    return;
  }

  switch (site) {
    // `f.call(this, …)` and `f.bind(this, …)` take the function as their
    // receiver; `Reflect.apply(f, this, [...])` and `Reflect.construct` take
    // it as their first argument. Each resolves to the same question of the
    // function it is about to run.
    case Site.CallOrBind:
      refuseContextMethodWrite(receiver, args[0], args.slice(1));
      return;
    case Site.Apply:
      refuseContextMethodWrite(receiver, args[0], argumentsOf(args[1]));
      return;
    case Site.ReflectApply:
      refuseContextMethodWrite(args[0], args[1], argumentsOf(args[2]));
      return;
    case Site.ReflectConstruct:
      refuseContextMethodWrite(args[0], undefined, argumentsOf(args[1]));
      return;
    case Site.WritesReceiver:
      refuseContextWrite(receiver);
      return;
    case Site.WritesFirstArgument:
      refuseContextWrite(args[0]);
      return;
  }
};

/**
 * Asks the context whether a call may run, when the function is a built-in
 * that writes into an object it is handed, through
 * `EvalContext.checkMemberWrite` with `method` naming it. Any other function is
 * not asked about. A refusal is a throw, and it propagates from here
 * unchanged: the call has not been made.
 *
 * Reached through `Function.prototype.call`, `apply` or `bind`, the function
 * the visitor calls is one of those three and not the built-in, so it is asked
 * about as a direct call of the function they run: its receiver is the `this`
 * they pass, and its arguments are the rest, or `apply`'s list. Followed
 * through `call.call`, `call.apply` and the like, since each hop is one more of
 * the three. `bind` makes a new function, which no table could recognise when
 * it is called later, so it is asked at bind time, about the bound `this` and
 * arguments: binding a built-in to an object the walk did not create is
 * refused before the bound function exists (`docs/backlog-retired.md` C5).
 *
 * Called by `call-expression.ts` immediately before a call, and by
 * `tagged-template-expression.ts` immediately before a tag is called, in each
 * case only after the caller has read `st.createdObjects` and found it set, as
 * for a member write.
 *
 * @param st - The state of the walk making the call.
 * @param created - `st.createdObjects`, already read by the caller.
 * @param fn - The function about to be called.
 * @param receiver - The `this` it is about to be called with.
 * @param args - The arguments it is about to be called with.
 */
export const consultMethodWrite = (st: EvalState, created: WeakSet<object>,
  fn: unknown, receiver: unknown, args: readonly unknown[]): void => {

  if (fn === FUNCTION_CALL) {
    consultMethodWrite(st, created, receiver, args[0], args.slice(1));
    return;
  }

  if (fn === FUNCTION_APPLY) {
    consultMethodWrite(st, created, receiver, args[0], argumentsOf(args[1]));
    return;
  }

  if (fn === FUNCTION_BIND) {
    consultMethodWrite(st, created, receiver, args[0], args.slice(1));
    return;
  }

  const builtIn = MUTATING_BUILT_INS.get(fn);
  if (!builtIn) {
    return;
  }

  const target = builtIn.writes === 'receiver' ? receiver : args[0];

  contextCheckMemberWrite(st.context, {
    target,
    key: undefined,
    createdByEvaluation: isObjectLike(target) && created.has(target),
    method: builtIn.name,
  });
};
