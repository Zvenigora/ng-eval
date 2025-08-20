import { MemberExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalScope, EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { safeGetProperty, isDangerousProperty } from './prototype-pollution-guard';
import { equalIgnoreCase } from './utils';
import { getCachedCaseInsensitiveProperty } from './property-lookup-cache';
// import { getCachedVisitorResult, setCachedVisitorResult } from './visitor-result-cache';

export const memberExpressionVisitor = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // Disable visitor result caching for now due to context sensitivity issues
  // const cachedResult = getCachedVisitorResult(node, st.context);
  // if (cachedResult !== undefined) {
  //   pushVisitorResult(node, st, cachedResult);
  //   afterVisitor(node, st);
  //   return;
  // }

  const [, , value] = evaluateMember(node, st, callback);

  // Disable visitor result caching for now
  // setCachedVisitorResult(node, st.context, value);

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
  if (!node.computed && node.property.type === 'Identifier') {
    // Dot notation: obj.prop
    key = node.property.name;
  } else if (node.property.type === 'Literal') {
    // Computed literal: obj["literal"]
    key = node.property.value as string | number | symbol;
  } else {
    // Computed expression: obj[key], obj[expression]
    callback(node.property, st);
    key = popVisitorResult(node, st) as (string | number | symbol);
  }

  // Get the value with context-aware or prototype pollution protection
  if (object === st.context) {
    // For context objects, preserve case-insensitive behavior
    const contextKey = st.options?.caseInsensitive && typeof key === 'string'
      ? st.context.getKey(key)
      : key;
    const value = st.context.get(contextKey);
    const thisValue = st.context.getThis(contextKey);
    return [thisValue ?? object, contextKey, value];
  } else if (object instanceof EvalScope) {
    // For scope objects, preserve original behavior (no getKey method)
    const value = object.get(key);
    const thisValue = object;
    return [thisValue ?? object, key, value];
  } else {
    // For regular objects, we need both case-insensitive lookup AND prototype pollution protection
    let value: unknown;
    
    // Check if this is a primitive type (string, number, boolean) - these are safe for method access
    const isPrimitive = (typeof object === 'string' || typeof object === 'number' || typeof object === 'boolean');
    
    if (st.options?.caseInsensitive && typeof key === 'string') {
      // Use case-insensitive lookup but with prototype pollution protection
      // For primitives, skip dangerous property checks as their methods are safe
      if (!isPrimitive && isDangerousProperty(key)) {
        throw new Error(`Access to dangerous property "${key}" is blocked for security reasons`);
      }
      
      // Try case-insensitive lookup on own properties first
      const obj = object as Record<PropertyKey, unknown>;
      let foundKey: string | undefined = undefined;
      
      if (obj && typeof obj === 'object') {
        // Create wrapper function for cache compatibility
        const compareIgnoreCase = (a: string, b: string): boolean => {
          const result = equalIgnoreCase(a, b);
          return result === true;
        };
        
        // Use cached case-insensitive property lookup for own properties (optimization)
        const cachedFoundKey = getCachedCaseInsensitiveProperty(obj, key, compareIgnoreCase);
        foundKey = cachedFoundKey || undefined;
        
        // If not found in own properties, check if the original key exists (including prototype methods)
        if (!foundKey) {
          try {
            // Test if property exists in prototype chain (this includes native methods like array.find)
            const testValue = obj[key];
            if (testValue !== undefined) {
              foundKey = key;
            } else {
              // Look for case variations in prototype methods for arrays, objects, etc.
              // This is more expensive but necessary for case-insensitive prototype method access
              const prototype = Object.getPrototypeOf(obj);
              if (prototype) {
                const prototypeKeys = Object.getOwnPropertyNames(prototype);
                foundKey = prototypeKeys.find(k => typeof k === 'string' && equalIgnoreCase(k, key));
              }
            }
          } catch {
            // If access fails, foundKey remains undefined
          }
        }
        
        // Check if the found key is dangerous (but only for non-primitives)
        if (!isPrimitive && foundKey && isDangerousProperty(foundKey)) {
          throw new Error(`Access to dangerous property "${foundKey}" is blocked for security reasons`);
        }
      }
      
      // Get the value using the found key or use safeGetProperty fallback for non-primitives
      if (isPrimitive) {
        // For primitives, direct access is safe
        value = foundKey ? obj[foundKey] : obj[key];
      } else {
        // For objects, use safe property access
        value = foundKey ? obj[foundKey] : safeGetProperty(object, key);
      }
    } else {
      // Use safe property access for prototype pollution protection (but not for primitives)
      if (isPrimitive) {
        // For primitives, direct access is safe
        value = (object as Record<PropertyKey, unknown>)[key];
      } else {
        value = safeGetProperty(object, key);
      }
    }
    
    return [object, key, value];
  }
}
