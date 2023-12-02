import * as acorn from 'acorn';

export type ParserOptions = acorn.Options & {
  extractExpressions?: boolean,
  cacheSize?: number,
};

export type ExpressionTypes = acorn.Expression['type'];
export type StatementTypes = acorn.Statement['type'];
export type DeclarationTypes = acorn.Declaration['type'];
export type PatternTypes = acorn.Pattern['type'];
export type ModuleDeclarationTypes = acorn.ModuleDeclaration['type'];
export type AnyNodeTypes = acorn.AnyNode['type'];
