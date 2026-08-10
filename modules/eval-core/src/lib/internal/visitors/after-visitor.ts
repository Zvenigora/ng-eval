import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';

/**
 * Closes a node: pops it off the open-node stack and fires the registered
 * 'after' hooks.
 *
 * The event's `value` is read **positionally** - it is whatever sits on top of
 * the result stack right now, not something keyed to this node. Reading it here
 * is what makes the value available without changing any visitor's call
 * signature, and it is correct for every visitor that pushes its result
 * immediately before calling this. A visitor that reaches this without pushing
 * would report its *neighbour's* value, not `undefined`; the length check below
 * only guards the empty stack, since `Stack.peek` is non-destructive but does
 * not bounds-check.
 */
export const afterVisitor = (node: AnyNode, st: EvalState): void => {

  if (!st.hasHooks) {
    return;
  }

  const stack = st.result?.stack;
  const value = stack && stack.length > 0 ? stack.peek() : undefined;

  st.hooks.dispatch('after', node, st, value);
}
