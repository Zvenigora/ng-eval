import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';

/**
 * Opens a node: records it as open and fires the registered 'before' hooks.
 *
 * Called at the top of every visitor body. The guard is a single boolean field
 * read - no options lookup - so an evaluation with no hooks pays almost
 * nothing, and it wraps the open-node bookkeeping as well as the hooks
 * themselves so `enter` and `exit` cannot become unpaired mid-walk.
 */
export const beforeVisitor = (node: AnyNode, st: EvalState): void => {

  if (!st.hasHooks) {
    return;
  }

  st.hooks.dispatch('before', node, st);
}
