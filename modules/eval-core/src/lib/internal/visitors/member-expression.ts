import { MemberExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const memberExpressionVisitor = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const [, , value] = evaluateMember(node, st, callback);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

export const evaluateMember = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  callback(node.object, st);
  const obj = popVisitorResult(node, st) as object;
  const object = (node.optional ? (obj || {}) : obj);

  if (node.property.type === 'Identifier') {
    if (object === st.context) {
      const value = st.context.get(node.property.name);
      const thisValue = st.context.getThis(node.property.name);
      return [thisValue ?? object, node.property.name, value];
    } else if ((object as Record<string, unknown>)[node.property.name]) {
      const value = (object as Record<string, unknown>)[node.property.name];
      return [object, node.property.name, value];
    }
  }

  callback(node.property, st);
  const prop = popVisitorResult(node, st) as string | number | symbol;
  const property = typeof prop !== 'undefined' ? prop
    : node.property.type === 'Identifier' ? node.property.name : prop;

  const value = (object as Record<string | number | symbol, unknown>)[property];
  return [object, property, value];
}
