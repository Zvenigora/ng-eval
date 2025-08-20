import { NewExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateArray } from './array-expression';

/**
 * Security: List of dangerous constructors that should not be instantiated
 */
const DANGEROUS_CONSTRUCTORS = new Set([
  'Function',
  'GeneratorFunction',
  'AsyncFunction',
  'AsyncGeneratorFunction',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'ServiceWorker',
  'Proxy',
]);

/**
 * Security: Check if a constructor is safe to use
 */
const isConstructorSafe = (constructor: unknown, constructorName?: string): boolean => {
  if (typeof constructor !== 'function') {
    return false;
  }

  // Check if it's a dangerous constructor by name
  if (constructorName && DANGEROUS_CONSTRUCTORS.has(constructorName)) {
    return false;
  }

  // Special check for Function constructor and its variants
  if (constructor === Function || 
      constructor === (async function(){}).constructor ||
      constructor === (function*(){}).constructor ||
      constructor === (async function*(){}).constructor) {
    return false;
  }

  try {
    // Check constructor string for dangerous patterns
    const constructorString = constructor.toString();
    if (constructorString.includes('eval') || 
        constructorString.includes('Function(') ||
        constructorString.includes('constructor(')) {
      return false;
    }
  } catch {
    // If we can't get the constructor string, be cautious
    return false;
  }

  return true;
};

/**
 * Safely creates a new instance with proper security checks
 */
const safeNew = (constructor: unknown, args: unknown[], constructorName?: string): unknown => {
  if (!constructor) {
    throw new Error('Cannot instantiate undefined or null constructor');
  }

  if (typeof constructor !== 'function') {
    throw new Error(`Value is not a constructor: ${typeof constructor}`);
  }

  if (!isConstructorSafe(constructor, constructorName)) {
    throw new Error(`Constructor blocked for security reasons: ${constructorName || 'anonymous'}`);
  }

  try {
    return Reflect.construct(constructor as (...a: unknown[]) => unknown, args);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Constructor error: ${error.message}`);
    }
    throw error;
  }
};

export const newExpressionVisitor = (node: NewExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const args = evaluateArray(node, node.arguments, st, callback);

  callback(node.callee, st);

  const constructor = popVisitorResult(node, st);

  // Try to get constructor name for security checks
  let constructorName: string | undefined;
  if (node.callee.type === 'Identifier') {
    constructorName = node.callee.name;
  }

  const value = safeNew(constructor, args, constructorName);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

// Legacy function - now with security checks
export const newFunc = (constructor: (...a: unknown[]) => unknown, ...args: unknown[]) => {
  return safeNew(constructor, args);
}
