import { ObjectExpression, Property } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { createSafeObject, validateSafeObject } from './prototype-pollution-guard';

type KeyValuePair = {key: unknown; value: unknown};

export const objectExpressionVisitor = (node: ObjectExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // Pre-allocate entries array for better performance
  const propertyCount = node.properties.length;
  const entries: Array<[unknown, unknown]> = [];
  
  for (let i = 0; i < propertyCount; i++) {
    const property = node.properties[i];
    
    if (property.type === 'SpreadElement') {
      callback(property.argument, st);
      const value = popVisitorResult(property, st) as object;
      
      // Validate spread object for safety
      try {
        validateSafeObject(value);
      } catch (error) {
        throw new Error(`Spread operation blocked: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Use Object.entries() once and cache the result
      const spreadEntries = Object.entries(value);
      for (let j = 0; j < spreadEntries.length; j++) {
        const [key, val] = spreadEntries[j];
        entries.push([key, val]);
      }
    } else {
      const pair = evalProperty(property, st, callback);
      entries.push([pair.key, pair.value]);
    }
  }

  // Create safe object with prototype pollution protection
  try {
    const obj = createSafeObject(entries);
    pushVisitorResult(node, st, obj);
  } catch (error) {
    throw new Error(`Object creation blocked: ${error instanceof Error ? error.message : String(error)}`);
  }

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
