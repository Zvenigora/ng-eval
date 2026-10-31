import * as walk from 'acorn-walk';
import { AnyNode, ModuleDeclaration, Statement } from 'acorn';
import { declarationKindRefusal, statementTypeRefusal } from '../visitors/statement-support';

/**
 * Whether a node is a statement or a module declaration. Every member of
 * acorn's `Statement` and `ModuleDeclaration` unions is named `…Statement` or
 * `…Declaration`, and no other node type is: a declarator is a
 * `VariableDeclarator`.
 */
const isStatement = (node: AnyNode): node is Statement | ModuleDeclaration =>
  /(?:Statement|Declaration)$/.test(node.type);

/** The message evaluation throws for this statement, or `undefined`. */
const refusalOf = (statement: Statement | ModuleDeclaration): string | undefined =>
  statementTypeRefusal(statement)
    ?? (statement.type === 'VariableDeclaration' ? declarationKindRefusal(statement) : undefined);

/**
 * Finds the first statement in a tree that evaluation would refuse.
 *
 * Evaluation refuses a statement only when the walk reaches it, so one in an
 * arrow function's body that is never called, or in a branch not taken, throws
 * nothing. This reads the whole tree instead - function bodies, untaken
 * branches and class bodies included - against the same table the evaluator
 * uses, and returns the message evaluation throws for that statement.
 *
 * "First" is source order, the lowest `start`, so a refused statement inside
 * another refused one is reported after it, as evaluation would meet the outer
 * one first.
 *
 * @param node The AST to search, as `parse` returns it.
 * @returns The statement and its message, or `undefined` when the tree holds
 * none, or `node` is `undefined`.
 */
export const findUnsupportedStatement = (node: AnyNode | undefined)
  : { statement: Statement | ModuleDeclaration; message: string } | undefined => {
  if (!node) {
    return undefined;
  }

  let first: { statement: Statement | ModuleDeclaration; message: string } | undefined;

  // `walk.full` calls back in post-order, an enclosing statement after the
  // ones inside it, so the first one visited is not the first in the source.
  walk.full(node, (visited) => {
    if (!isStatement(visited)) {
      return;
    }
    const message = refusalOf(visited);
    if (message !== undefined && (first === undefined || visited.start < first.statement.start)) {
      first = { statement: visited, message };
    }
  });

  return first;
}
