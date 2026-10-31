import { ModuleDeclaration, Statement, VariableDeclaration } from 'acorn';

/**
 * The statement types `dispatchStatement` walks, and the one place they are
 * listed.
 *
 * `VariableDeclaration` covers `var` as well, and cannot not: this table reads
 * the node *type*, and `var x = 1` is a `VariableDeclaration` exactly as
 * `let x = 1` is. Listing it here is therefore what stops `var` reaching the
 * dispatcher's throw; its rejection is `declarationKindRefusal`, below, which
 * the visitor calls because it can read `kind`.
 *
 * `ForStatement` is the classic three-part form *only*. `ForOfStatement`,
 * `ForInStatement`, `WhileStatement` and `DoWhileStatement` are distinct node
 * types and stay out of the table, so they are refused unchanged - unlike
 * `var`, which shares a type with `let` and is refused one level down.
 */
const SUPPORTED_STATEMENT_TYPES: ReadonlySet<string> = new Set([
  'ExpressionStatement',
  'EmptyStatement',
  'BlockStatement',
  'VariableDeclaration',
  'IfStatement',
  'ForStatement',
]);

/** The `VariableDeclaration` kinds the declaration visitor binds. */
const SUPPORTED_DECLARATION_KINDS: ReadonlySet<string> = new Set(['let', 'const']);

/**
 * The message evaluation throws for a statement whose type it does not walk,
 * or `undefined` for one it does.
 *
 * `dispatchStatement` throws it, and `findUnsupportedStatement` reports it, so
 * the evaluator and the export cannot disagree about a type (`docs/backlog.md`
 * D13).
 */
export const statementTypeRefusal = (statement: Statement | ModuleDeclaration): string | undefined =>
  SUPPORTED_STATEMENT_TYPES.has(statement.type)
    ? undefined
    : `Unsupported statement type: ${statement.type}`;

/**
 * The message evaluation throws for a declaration whose kind it does not bind,
 * `var` among them, or `undefined` for `let` and `const`.
 *
 * `variableDeclarationVisitor` throws it above its `beforeVisitor`, and
 * `findUnsupportedStatement` reports it.
 */
export const declarationKindRefusal = (declaration: VariableDeclaration): string | undefined =>
  SUPPORTED_DECLARATION_KINDS.has(declaration.kind)
    ? undefined
    : `Unsupported variable declaration kind: ${declaration.kind}`;
