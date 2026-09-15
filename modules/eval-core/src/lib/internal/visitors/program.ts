import { ModuleDeclaration, Program, Statement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';

/**
 * Walks one statement and returns its completion value.
 *
 * The statement dispatcher for the whole family: `Program` here, and
 * `BlockStatement`, which imports it. It is **explicit, and its `default`
 * throws**.
 * A node type this library does not implement raises rather than falling through
 * to `acorn-walk`'s base walker, which would visit the subtree as an expression
 * and strand whatever it pushed - `while (false) { 1 }` used to evaluate to `1`
 * that way. Three visitors in this library already push nothing on one path of an
 * `if`/`else if` chain over node types; a `switch` whose `default` throws is how
 * this family gains no fourth member.
 *
 * It lives in this module, rather than in one of its own, because `Program` is
 * its first caller and `BlockStatement` its second. **A third importer is when it
 * earns its own file** - otherwise a visitor module has quietly become a utility
 * module that also happens to export a visitor.
 *
 * **`if-statement.ts` is that third importer, and the condition is met rather
 * than dodged.** It walks a single statement rather than a list, which step 4
 * judged irrelevant: the rule counts the modules reaching in here, not what each
 * of them walks. The move to `dispatch-statement.ts` is **deferred to step 6**
 * on scheduling grounds - no step's file list admitted the rewrite - and is
 * written into the plan's § 3.1 and step 6 so that `ForStatement` does not
 * arrive in step 5 as a fourth importer against a rule that has declined to fire
 * twice.
 *
 * The single `callback` / `popVisitorResult` pair is here rather than in each
 * caller so that § 3.1's rule 2 - one pop per `callback` - is discharged in one
 * place for every statement list.
 *
 * @returns the statement's completion value, which is {@link EMPTY_COMPLETION}
 * for a statement that produced nothing.
 */
export const dispatchStatement = (
  statement: Statement | ModuleDeclaration,
  st: EvalState,
  callback: walk.WalkerCallback<EvalState>
): unknown => {

  switch (statement.type) {
    // `VariableDeclaration` covers `var` as well, and cannot not: this `switch`
    // reads the node *type*, and `var x = 1` is a `VariableDeclaration` exactly
    // as `let x = 1` is. Listing it here is therefore what stopped `var`
    // reaching the `default:` below; the rejection moved into the visitor,
    // which can read `kind`.
    //
    // `ForStatement` is the classic three-part form *only*. `ForOfStatement`,
    // `ForInStatement`, `WhileStatement` and `DoWhileStatement` are distinct
    // node types and stay out of the phase (§ 2), so they reach the `default`
    // below unchanged - unlike `var`, which shares a type with `let` and had to
    // be rejected one level down.
    case 'ExpressionStatement':
    case 'EmptyStatement':
    case 'BlockStatement':
    case 'VariableDeclaration':
    case 'IfStatement':
    case 'ForStatement':
      callback(statement, st);
      return popVisitorResult(statement, st);
    default:
      throw new Error(`Unsupported statement type: ${statement.type}`);
  }
}

/**
 * Evaluates a program: the root node of every walk that reaches this library
 * through `EvalService`, since its parser options leave `extractExpressions`
 * off and so hand `evaluate` the whole `Program`.
 *
 * Keeps the last **non-empty** completion value, per JavaScript's
 * completion-value semantics, and pushes exactly one value however many
 * statements the body holds. A program whose statements all produced nothing -
 * `;`, or a source that is only whitespace - pushes {@link EMPTY_COMPLETION},
 * which the walk boundary in `evaluate` converts to `undefined`. The conversion
 * is deliberately not done here: `arrow-function-expression.ts` calls
 * `evaluate` on a `BlockStatement` for a block-bodied arrow, so a `Program`-side
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
 * the push, never around it - `push` is optionally chained, so bringing it
 * inside would pair a `finally` pop with a push the same optional chain had
 * skipped.
 */
export const programVisitor = (node: Program, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

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
