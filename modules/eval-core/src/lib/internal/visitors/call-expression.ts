import { CallExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { evaluateArray } from './array-expression';

/**
 * Security: List of dangerous functions that should not be callable
 */
const DANGEROUS_FUNCTIONS = new Set([
  'Function',
  'eval',
  'setTimeout',
  'setInterval',
  'require',
  'import',
  'importScripts'
]);

/**
 * Security: Check if a function is safe to call
 */
const isFunctionSafe = (fn: unknown, fnName?: string): boolean => {
  if (typeof fn !== 'function') {
    return false;
  }

  // Check if it's a dangerous function by name
  if (fnName && DANGEROUS_FUNCTIONS.has(fnName)) {
    return false;
  }

  // Check function string for dangerous patterns
  const fnString = fn.toString();
  if (fnString.includes('eval') || 
      fnString.includes('Function(') ||
      fnString.includes('constructor') ||
      fnString.includes('__proto__')) {
    return false;
  }

  return true;
};

/**
 * Safely calls a function with proper error handling and security checks
 */
const safeCall = (
  caller: unknown, 
  thisArg: unknown, 
  args: unknown[], 
  optional: boolean = false,
  fnName?: string
): unknown => {
  if (!caller) {
    if (optional) {
      return undefined;
    }
    throw new Error(`Cannot call undefined or null function`);
  }

  if (typeof caller !== 'function') {
    throw new Error(`Value is not a function: ${typeof caller}`);
  }

  if (!isFunctionSafe(caller, fnName)) {
    throw new Error(`Function call blocked for security reasons: ${fnName || 'anonymous'}`);
  }

  try {
    return (caller as (...args: unknown[]) => unknown).apply(thisArg, args);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Function call error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Enhanced call expression visitor with security checks
 */
export const callExpressionVisitor = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const args = evaluateArray(node, node.arguments, st, callback);

  if (node.callee.type === 'MemberExpression') {
    const [object, propertyName, fn] = evaluateMember(node.callee, st, callback);
    const functionName = typeof propertyName === 'string' ? propertyName : undefined;
    const value = safeCall(fn, object, args, node.callee.optional, functionName);
    pushVisitorResult(node, st, value);
  } else {
    callback(node.callee, st);
    const caller = popVisitorResult(node, st);
    
    // Try to get function name for security checks
    let functionName: string | undefined;
    if (node.callee.type === 'Identifier') {
      functionName = node.callee.name;
    }
    
    const value = safeCall(caller, st.context, args, node.optional, functionName);
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}

export const evaluateCall = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {
  callback(node.callee, st);
  const caller = popVisitorResult(node, st);

  const args = node.arguments.map((argument) => {
    callback(argument, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  // Get function name for security checks
  let functionName: string | undefined;
  if (node.callee.type === 'Identifier') {
    functionName = node.callee.name;
  }

  const value = safeCall(caller, st.context, args, false, functionName);
  return value;
}
