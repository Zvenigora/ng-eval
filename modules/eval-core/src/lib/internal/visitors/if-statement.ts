import { IfStatement } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { dispatchStatement } from './program';
import { EMPTY_COMPLETION, EvalState } from '../classes/eval';

/**
 * Evaluates an `if` statement: one test, and **exactly one branch or neither**.
 *
 * The behavioural fix in the plan's § 1.1 table. `acorn-walk`'s base walker
 * visits both branches regardless of the test, so `if (a) { 1 } else { 2 }` with
 * `a` true measured `2` - the `else` value was pushed last and won - and any
 * call or assignment in the untaken branch had already run. The value was the
 * smaller half of that: a visitor that walked both branches and then *selected*
 * by the test would return `1` and still run them both, which is why the specs
 * assert on an uncalled `jest.fn` and an unwritten source key beside the value.
 *
 * Completion value, per § 3.1: the branch's own, unchanged. A taken branch that
 * produced nothing propagates {@link EMPTY_COMPLETION} - `if (true) { }` pushes
 * the sentinel exactly as `if (false) { 1 }` does, by two different routes - and
 * a branch that genuinely produced `undefined` pushes that, so an enclosing
 * statement list keeps it over an earlier value. Mapping either onto the other
 * here would collapse the distinction the sentinel exists for.
 *
 * Arithmetic: pops 1 for the test, plus 1 for the branch when one runs; pushes
 * exactly 1 on both exit paths.
 *
 * **The branches go through `dispatchStatement`, not a raw `callback`.** A
 * branch is a `Statement`, and a raw callback would hand a type this library
 * does not implement to the base walker, which walks it as an expression and
 * strands whatever it pushed. That is the silent fall-through family § 1.7
 * names and § 3.1 promises to add no member to.
 *
 * **The margin is narrower than it first looks, and the specs say so where an
 * earlier draft of this docblock did not.** Every registered statement type -
 * `BlockStatement`, `ExpressionStatement`, `IfStatement` itself for an
 * `else if` chain, `VariableDeclaration` - is reached by a raw `callback` just
 * as well, because `acorn-walk` finds the registered visitor before it reaches
 * its base walker. So neither `if (a) { while (false) { 1 } }` nor an `else if`
 * chain discriminates: the block re-dispatches, and the chain arrives back here
 * either way. The one position that does is a **bare** branch body of an
 * unregistered type - `if (a) function f() { }` - where nothing stands between
 * this visitor and the base walker. Measured: swapping in a raw callback reddens
 * that case alone.
 *
 * It is still the right call, for the reason `program.ts` gives rather than for
 * a reason the suite can show: rule 2's single `callback`/`pop` pair lives in one
 * place, so the guarantee holds for whatever bare statement type a later phase
 * registers without this visitor being revisited.
 *
 * This is `dispatchStatement`'s **third** importer, which is the condition
 * `program.ts` set for giving it a module of its own. The condition is met; the
 * move is deferred to step 6 on scheduling grounds alone and is recorded in the
 * plan's § 3.1 and step 6, not left to be rediscovered.
 *
 * **It pushes no scope, and there is no `try`/`finally` to pair.** Four routes a
 * binding could arrive by, all closed: a block body gets its scope from
 * `blockStatementVisitor`; `if (a) let x = 1` does not parse, since a lexical
 * declaration is not a legal bare statement body; `if (a) var x = 1` does parse,
 * reaches the dispatcher as a `VariableDeclaration`, and is rejected on `kind`
 * inside `variableDeclarationVisitor`; and `if (a) function f() { }` parses
 * under Annex B and is rejected by `dispatchStatement`'s throwing `default`.
 *
 * **The fourth is closed by the dispatcher and not by anything here**, which is
 * the one a later phase can reopen: a phase that registers `FunctionDeclaration`
 * gives this visitor a bare binding form with no enclosing block, and the
 * no-scope argument has to be re-made rather than inherited. `if (a) label: var
 * x = 1` is the same family. As of this step this visitor touches `EvalContext`
 * not at all, and the balance its specs assert on a reused context is the
 * enclosing visitors' to keep.
 */
export const ifStatementVisitor = (node: IfStatement, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.test, st);

  const test = popVisitorResult(node, st);

  let completion: unknown = EMPTY_COMPLETION;

  if (test) {
    completion = dispatchStatement(node.consequent, st, callback);
  } else if (node.alternate) {
    completion = dispatchStatement(node.alternate, st, callback);
  }

  pushVisitorResult(node, st, completion);

  afterVisitor(node, st);
}
