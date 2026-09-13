import { BlockStatement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { dispatchStatement } from './program';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';

/**
 * Evaluates a block statement: a scope, a statement list, and one completion
 * value.
 *
 * Keeps the last **non-empty** completion value, per JavaScript's
 * completion-value semantics, and pushes exactly one value however many
 * statements the body holds. A block whose statements all produced nothing -
 * `{ }`, or `{ ; }` - pushes {@link EMPTY_COMPLETION} for its enclosing
 * statement list to skip over. The sentinel is converted to `undefined` at the
 * walk boundary in `evaluate`, which is why this visitor may return it to a
 * caller that is itself a walk root: `arrow-function-expression.ts` calls
 * `evaluate` on this node for a block-bodied arrow, so `x => { }` reaches a
 * consumer through the same conversion a `Program` does.
 *
 * **The block scope is unobservable in this step, and is pushed anyway.**
 * Nothing binds into it until `VariableDeclaration` lands, and an empty scope
 * shadows nothing now that `EvalContext.get` resolves a scope by presence
 * rather than by value. Pushing it here rather than with the first binding
 * keeps the scope arithmetic in one place: the depth a nested block reports is
 * a property of the block, not of whether its body happened to declare
 * anything.
 *
 * `st.options` is passed to `push` because `fromContext` copies a plain record
 * into a `Registry` when `caseInsensitive` is set. Omitting them would make a
 * block's bindings case-**sensitive** inside an otherwise case-insensitive
 * evaluation - a silent wrong answer rather than an error, and one no assertion
 * in this step can reach, since a scope nothing binds into resolves nothing
 * either way.
 *
 * The pop is in a `finally` because the scope stack lives on `EvalContext`, not
 * on the per-walk `EvalState`, and one context can back any number of
 * evaluations: a scope this visitor failed to pop would outlive the walk and be
 * read first by every later evaluation on that context. The `try` opens *after*
 * the push, never around it - `push` is optionally chained, so bringing it
 * inside would pair a `finally` pop with a push the same optional chain had
 * skipped.
 */
export const blockStatementVisitor = (node: BlockStatement, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  let completion: unknown = EMPTY_COMPLETION;

  st.context?.push({}, st.options);
  try {
    for (const statement of node.body) {
      const value = dispatchStatement(statement, st, callback);
      if (value !== EMPTY_COMPLETION) {
        completion = value;
      }
    }
  } finally {
    st.context?.pop();
  }

  pushVisitorResult(node, st, completion);

  afterVisitor(node, st);
}
