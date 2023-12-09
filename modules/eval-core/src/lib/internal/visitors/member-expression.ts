import { MemberExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const memberExpressionVisitor = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.object, st);
  const obj = popVisitorResult(node, st) as object;
  const object = (node.optional ? (obj || {}) : obj);

  callback(node.property, st);
  const prop = popVisitorResult(node, st) as string | number | symbol;
  const property = typeof prop !== 'undefined' ? prop
    : node.property.type === 'Identifier' ? node.property.name : prop;

  if (node.computed) {
    const value = (object as Record<string | number | symbol, unknown>)[property];
    pushVisitorResult(node, st, value);
  } else {
    const value = (object as Record<string | number | symbol, unknown>)[property];
    pushVisitorResult(node, st, value);
  }

  const value = popVisitorResult(node, st) as number;

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
