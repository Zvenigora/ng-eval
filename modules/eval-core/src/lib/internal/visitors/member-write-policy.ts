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
