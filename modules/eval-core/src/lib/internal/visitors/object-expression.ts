import { ObjectExpression, Property } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

type KeyValuePair = {key: unknown; value: unknown};

export const objectExpressionVisitor = (node: ObjectExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const map = new Map();
  for (const property of node.properties) {
    if (property.type === 'SpreadElement') {
      callback(property.argument, st);
      const value = popVisitorResult(property, st) as object;
      for (const [key, val] of Object.entries(value)) {
        map.set(key, val);
      }
    } else {
      const pair = evalProperty(property, st, callback);
      map.set(pair.key, pair.value);
    }
  }

  const obj = Object.fromEntries(map);

  pushVisitorResult(node, st, obj);

  afterVisitor(node, st);
}

const evalProperty = (property: Property, st: EvalState, callback: walk.WalkerCallback<EvalState>): KeyValuePair => {
  // if (property.shorthand) {
  //   callback(property.value, st);
  //   const value = popVisitorResult(property, st);
  //   return { key: value, value };
  // } else
  if (property.computed) {
    callback(property.key, st);
    const key = popVisitorResult(property, st);
    callback(property.value, st);
    const value = popVisitorResult(property, st);
    return { key, value };
  } else if (property.key.type === 'Identifier') {
      const key = property.key.name;
      callback(property.value, st);
      const value = popVisitorResult(property, st);
      return { key, value };
  } else if (property.key.type === 'Literal') {
    const key = property.key.value;
    callback(property.value, st);
    const value = popVisitorResult(property, st);
    return { key, value };
  } else {
    throw new Error(`Unsupported property key type: ${property.key.type}`);
  }
}
