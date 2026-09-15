import { ForStatement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { dispatchStatement } from './program';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';

/**
 * Evaluates a classic three-part `for` statement.
 *
 * § 1.1's row measured **`NaN`** with three stranded values before Phase 2: the
 * base walker handed the declarator's `id` to `identifierVisitor`, so `i`
 * resolved against the context rather than binding, and `i < 3` compared
 * `undefined`. Since step 1 the row throws from `dispatchStatement`'s `default`;
 * this visitor is what returns `2`.
 *
 * `for…of`, `for…in`, `while` and `do…while` stay out of the phase (§ 2) and
 * keep throwing - they are separate node types and reach the dispatcher's
 * `default` unchanged.
 *
 * **One scope for the loop, not one per iteration.** A draft of the plan
 * specified a fresh scope per iteration, seeded from the head and copied back
 * after `update`, on the reasoning that this is what makes a closure capture its
 * own iteration's binding. It makes **no observable difference here**: the
 * closure `arrow-function-expression.ts` builds captures `st`, not a scope
 * chain, and resolves its free variables against `st.context` *as it is when the
 * closure is called* - by which time this loop has popped everything it pushed.
 * So the per-iteration design would have allocated a scope and copied bindings
 * twice per iteration to buy a property no spec can assert (§ 3.6.5). Giving
 * closures a captured scope chain is real work in
 * `arrow-function-expression.ts` and is what a later phase would have to do
 * first.
 *
 * **`init` has two node shapes and they take two routes.** `for (let i = 0; …)`
 * parses `init` as a `VariableDeclaration`, which is a `Statement` and goes
 * through `dispatchStatement`; `for (i = 0; …)` parses it as an `Expression` and
 * takes a raw `callback`. Both pop exactly one - the declaration's `EMPTY`, or
 * the expression's value - so § 3.1's arithmetic is identical for the two and
 * the split is invisible to it. What depends on the split is the throwing
 * `default`: only the `dispatchStatement` route has one, so an `init` that is a
 * statement type this library does not implement is rejected rather than handed
 * to the base walker. `body` is a `Statement` and dispatches for the same
 * reason; `test` and `update` are expressions and do not.
 *
 * Arithmetic (§ 3.1): pops 1 for `init` when present, then per iteration 1 for
 * `test` (when present), 1 for `body` and 1 for `update` (when present) - one
 * per `callback` or `dispatchStatement`, as rule 2 requires. Pushes exactly one
 * value on every exit path: the last **non-empty** body value, or
 * {@link EMPTY_COMPLETION} when the loop ran zero iterations or every iteration
 * produced nothing. An absent `test` is `true`.
 *
 * **The budget is the only terminator for `for (;;)`** - with no `break`,
 * `continue` or `return` in this phase (§ 2) there is no other way out, and a
 * runaway loop that silently returned a partial value is the failure § 3.4
 * exists to prevent. `chargeIteration` throws when the budget is spent; it is
 * called from this loop and nowhere else in the library, which is why an
 * expression with no `for` in it pays nothing for the bound.
 *
 * The pop is in a `finally` because the scope stack lives on `EvalContext`, not
 * on the per-walk `EvalState`, and one context can back any number of
 * evaluations: a scope this visitor failed to pop would outlive the walk and be
 * read first by every later evaluation on that context. This is the visitor with
 * the **highest push multiplicity** in the family and the shape of A9's own
 * precondition argument - a `for` body throwing on iteration 3 - so every exit
 * path matters: `init`, `test`, `body` and `update` can each throw, the
 * dispatcher can reject the body, and the budget can end the loop from inside
 * the `try`. The `try` opens *after* the push, never around it - `push` is
 * optionally chained, so bringing it inside would pair a `finally` pop with a
 * push the same optional chain had skipped.
 */
export const forStatementVisitor = (node: ForStatement, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  let completion: unknown = EMPTY_COMPLETION;

  st.context?.push({}, st.options);
  try {

    if (node.init) {
      if (node.init.type === 'VariableDeclaration') {
        dispatchStatement(node.init, st, callback);
      } else {
        callback(node.init, st);
        popVisitorResult(node, st);
      }
    }

    for (;;) {

      if (node.test) {
        callback(node.test, st);
        if (!popVisitorResult(node, st)) {
          break;
        }
      }

      // Charged once the test has admitted the iteration, so a loop that runs
      // `n` bodies charges `n` - which is what `iterationsRemaining` is asserted
      // against - and a loop whose test is false at the top charges nothing.
      st.chargeIteration();

      const value = dispatchStatement(node.body, st, callback);
      if (value !== EMPTY_COMPLETION) {
        completion = value;
      }

      if (node.update) {
        callback(node.update, st);
        popVisitorResult(node, st);
      }
    }

  } finally {
    st.context?.pop();
  }

  pushVisitorResult(node, st, completion);

  afterVisitor(node, st);
}
