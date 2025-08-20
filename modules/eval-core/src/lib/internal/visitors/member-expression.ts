import { MemberExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalScope, EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { getKeyValue } from './utils';
import { BaseContext } from '../classes/common';
import { safeGetProperty } from './prototype-pollution-guard';

export const memberExpressionVisitor = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const [, , value] = evaluateMember(node, st, callback);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

export const evaluateMember = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  // Get the object
  callback(node.object, st);
  const obj = popVisitorResult(node, st) as object;
  const object = (node.optional ? (obj || {}) : obj);

  // Get the property
  let key: string | number | symbol;
  if (node.property.type === 'Identifier') {
    key = node.property.name;
  } else if (node.property.type === 'Literal') {
    key = node.property.value as string | number | symbol;
  } else {
    callback(node.property, st);
    key = popVisitorResult(node, st) as (string | number | symbol);
  }

  // Get the value
  if (object === st.context) {
    const value = st.context.get(key);
    const thisValue = st.context.getThis(key);
    return [thisValue ?? object, key, value];
  } else if (object instanceof EvalScope) {
    const value = object.get(key);
    const thisValue = object;
    return [thisValue ?? object, key, value];
  } else {
    const caseInsesitive = !!(st.options?.caseInsensitive);
    const pair = getKeyValue(object as BaseContext, key, caseInsesitive);
    if (pair) {
      const [key, value] = pair;
      return [object, key, value];
    } else {
      // Fall back to safe property access for additional protection
      try {
        const value = safeGetProperty(object, key);
        return [object, key, value];
      } catch (error) {
        // If safe access fails due to security restrictions, return undefined
        return [object, key, undefined];
      }
    }
  }

  return [object, key, undefined];
}
