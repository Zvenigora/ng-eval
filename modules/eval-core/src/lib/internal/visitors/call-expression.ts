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
  'setImmediate',
  'require',
  'import',
  'importScripts',
  'XMLHttpRequest',
  'fetch',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'ServiceWorker',
]);

/**
 * Security: List of dangerous patterns in function code
 * Only the most dangerous patterns that could lead to code injection
 */
const DANGEROUS_PATTERNS = [
  /\beval\s*\(/i,
  /\bFunction\s*\(/,  // Look for Function constructor (capital F only)
  /new\s+Function\s*\(/i,
  /\.__proto__\b/,
  /\.prototype\s*\.\s*constructor\b/,
  /\bglobalThis\b/,
];

/**
 * Security: Check if a function name is dangerous
 */
const isDangerousFunctionName = (fnName: string): boolean => {
  return DANGEROUS_FUNCTIONS.has(fnName);
};

/**
 * Security: Check if function code contains dangerous patterns
 * Only check user-defined functions, not native ones
 */
const hasDangerousPatterns = (fnString: string): boolean => {
  // If it's a native function ([native code]), allow it
  if (fnString.includes('[native code]')) {
    return false;
  }
  
  // For user-defined functions, only check for truly dangerous patterns
  // that could lead to code injection or security bypass
  const result = DANGEROUS_PATTERNS.some(pattern => pattern.test(fnString));
  
  return result;
};

/**
 * Security: Check if a function is safe to call
 */
const isFunctionSafe = (fn: unknown, fnName?: string): boolean => {
  if (typeof fn !== 'function') {
    return false;
  }

  // Check if it's a dangerous function by name
  if (fnName && isDangerousFunctionName(fnName)) {
    return false;
  }

  // Special check for Function constructor
  if (fn === Function) {
    return false;
  }

  try {
    // Check function string for dangerous patterns
    const fnString = fn.toString();
    if (hasDangerousPatterns(fnString)) {
      return false;
    }
  } catch {
    // If we can't get the function string, be cautious
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
