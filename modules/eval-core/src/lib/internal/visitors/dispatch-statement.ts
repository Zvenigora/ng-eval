import { ModuleDeclaration, Statement } from 'acorn';
import * as walk from 'acorn-walk';
import { popVisitorResult } from './visitor-result';
import { statementTypeRefusal } from './statement-support';
import { EvalState } from '../classes/eval';

/**
 * Walks one statement and returns its completion value.
 *
 * The statement dispatcher for the whole family, and the single place § 3.1's
 * rule 2 - one `popVisitorResult` per `callback` - is discharged for every
 * caller. Four visitors import it: `Program` and `BlockStatement` walk a
 * statement list, `IfStatement` a branch, and `ForStatement` an `init` and a
 * body.
 *
 * **It is explicit, and a type outside its table throws.** A node type this
 * library does not implement raises rather than falling through to
 * `acorn-walk`'s base walker, which would visit the subtree as an expression and
 * strand whatever it pushed - `while (false) { 1 }` used to evaluate to `1` that
 * way. Three visitors in this library already push nothing on one path of an
 * `if`/`else if` chain over node types (`docs/backlog.md` A2); a table whose
 * miss throws is how this family gains no fourth member. The table and its
 * message are `statementTypeRefusal`'s, in `statement-support.ts`, since D13:
 * this was a `switch` whose `default` threw until then.
 *
 * **Why this module exists.** It lived in `program.ts` for steps 1 to 5, on the
 * rule that a shared helper earns its own file at its *third* importer -
 * otherwise a visitor module has quietly become a utility module that also
 * happens to export a visitor. `if-statement.ts` met that condition in step 4,
 * which recorded it MET AND DEFERRED rather than unmet: no step's file list
 * admitted creating a module and rewriting three imports, and step 4 was not the
 * place to widen its own scope. The plan named step 6 as the date so that
 * `ForStatement` would not arrive in step 5 as a *fourth* importer against a
 * rule that had declined to fire twice. This is that move. The rejection surface
 * did not change with it - a pure relocation, gated by the existing suite.
 *
 * @returns the statement's completion value, which is `EMPTY_COMPLETION`
 * (`../classes/eval`) for a statement that produced nothing. The sentinel is not
 * imported here: this module never compares against it, and an import kept only
 * for a doc link is an unused binding the lint config rejects.
 */
export const dispatchStatement = (
  statement: Statement | ModuleDeclaration,
  st: EvalState,
  callback: walk.WalkerCallback<EvalState>
): unknown => {

  // The types walked are `statement-support.ts`' table, which
  // `findUnsupportedStatement` reads too, so the two cannot disagree.
  const refusal = statementTypeRefusal(statement);
  if (refusal !== undefined) {
    throw new Error(refusal);
  }

  callback(statement, st);
  return popVisitorResult(statement, st);
}
