import * as acorn from 'acorn';

export type ParserOptions = Partial<acorn.Options> & {
  extractExpressions?: boolean,
  cacheSize?: number,
  ecmaVersion?: acorn.ecmaVersion,
};

export type AnyNodeTypes = acorn.AnyNode['type'];
