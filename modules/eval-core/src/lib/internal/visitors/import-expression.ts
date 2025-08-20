import { ImportExpression } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

/**
 * ImportExpression visitor - blocks all dynamic imports for security
 */
export const importExpressionVisitor = (node: ImportExpression, st: EvalState) => {
  beforeVisitor(node, st);

  // Block all dynamic imports for security reasons
  throw new Error('Function call blocked for security reasons: import');

  afterVisitor(node, st);
};