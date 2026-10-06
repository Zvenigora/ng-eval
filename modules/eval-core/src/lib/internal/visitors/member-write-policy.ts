import { EvalState } from '../classes/eval';

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

  st.context?.checkMemberWrite?.({
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
 * Called by `call-expression.ts` immediately before the call, and only after
 * it has read `st.createdObjects` and found it set, as for a member write.
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

  st.context?.checkMemberWrite?.({
    target,
    key: undefined,
    createdByEvaluation: isObjectLike(target) && created.has(target),
    method: builtIn.name,
  });
};
