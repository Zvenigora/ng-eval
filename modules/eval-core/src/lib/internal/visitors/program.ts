import { Program } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { dispatchStatement } from './dispatch-statement';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';
import { contextPop, contextPush } from './context-method';

/**
 * Evaluates a program: the root node of every walk that reaches this library
 * through `EvalService`, since its parser options leave `extractExpressions`
 * off and so hand `evaluate` the whole `Program`.
 *
 * Keeps the last **non-empty** completion value, per JavaScript's
 * completion-value semantics, and pushes exactly one value however many
 * statements the body holds. A program whose statements all produced nothing -
 * `;`, or a source that is only whitespace - pushes {@link EMPTY_COMPLETION},
 * which the walk boundary in `evaluate.ts` converts to `undefined`. The
 * conversion is deliberately not done here: `arrow-function-expression.ts`
 * walks a `BlockStatement` for a block-bodied arrow, so a `Program`-side
 * conversion would leave that entry point handing the sentinel to a consumer.
 *
 * **The program-level scope is required.** It is the only scope a top-level
 * `let` can bind into; without it a declaration would have nowhere to go but
 * `EvalContext.set`, which writes the caller's own context object - and is the
 * method `eval-signals` overrides to enforce its read-only policy. `get`
 * searches `scopes` first and falls through on a miss, so an empty program
 * scope costs no outer resolution.
 *
 * The pop is in a `finally` because the scope stack lives on `EvalContext`, not
 * on the per-walk `EvalState`, and one context can back any number of
 * evaluations: a scope this visitor failed to pop would outlive the walk and be
 * read first by every later evaluation on that context. The `try` opens *after*
 * the push, never around it - `contextPush` skips an absent context, as the
 * optional chain it replaced did, so bringing it inside would pair a `finally`
 * pop with a push that never happened.
 *
 * Both go through `context-method.ts`, which takes `push` and `pop` from the
 * context's class: an expression can plant an own `push` on the context
 * (`docs/backlog.md` A42), and this site would otherwise invoke it with the
 * real context as its `this`.
 */
export const programVisitor = (node: Program, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  let completion: unknown = EMPTY_COMPLETION;

  contextPush(st.context, {}, st.options);
  try {
    for (const statement of node.body) {
      const value = dispatchStatement(statement, st, callback);
      if (value !== EMPTY_COMPLETION) {
        completion = value;
      }
    }
  } finally {
    contextPop(st.context);
  }

  pushVisitorResult(node, st, completion);

  afterVisitor(node, st);
}
