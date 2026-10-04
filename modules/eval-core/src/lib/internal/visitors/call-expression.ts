import { CallExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { evaluateArray } from './array-expression';
import { consultMethodWrite } from './member-write-policy';

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
 * Calls a function after the security checks.
 *
 * Whatever the callee throws leaves the call as thrown - class, `cause` and
 * properties intact - so a consumer can select it by type. Up to 0.6.x it was
 * re-raised as a new `Error` with a fixed prefix on its message, which no
 * caller could route around, since the call is inside the walk
 * (`docs/backlog-retired.md` A6).
 */
const safeCall = (
  caller: unknown,
  thisArg: unknown,
  args: unknown[],
  optional = false,
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

  return (caller as (...args: unknown[]) => unknown).apply(thisArg, args);
};

/**
 * The receiver for a method called on `object`: a prior scope's `thisArg` when
 * `object` is that scope's own object, `object` otherwise.
 *
 * `ns.fn()` reaches `fn` through the namespace, which evaluates to the scope's
 * object and has to keep doing so - `ns` alone, or `ns === x`, must not see
 * `thisArg`. So the substitution is made here, at the call, and nowhere
 * earlier: `evaluateMember`'s first slot is also the target of `ns.x = v`, and
 * a write belongs on the scope's object. Matched by identity, so it follows the
 * object rather than the name it was reached by; the first scope holding the
 * object answers, as in `EvalContext.get`. Up to 0.6.x `thisArg` was never
 * applied (`docs/backlog-retired.md` A7).
 *
 * `this.fn()` does not need this: `EvalContext.getThis` answers it.
 *
 * A call with no prior scopes pays one length check.
 */
const scopeReceiver = (st: EvalState, object: unknown): unknown => {
  const priorScopes = st.context?.priorScopes;
  if (!priorScopes?.length) {
    return object;
  }
  for (const scope of priorScopes) {
    if (scope.context === object) {
      return scope.options.thisArg ?? object;
    }
  }
  return object;
};

/**
 * Enhanced call expression visitor with security checks
 *
 * A context with a member-write policy is asked, before the call, about a
 * built-in that writes into its receiver or its first argument - see
 * `consultMethodWrite`. The receiver asked about is the one the call is made
 * with: the member's object, a prior scope's `thisArg`, or the context itself
 * for a bare call. A context without a policy pays one field read per call.
 */
export const callExpressionVisitor = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const args = evaluateArray(node, node.arguments, st, callback);

  if (node.callee.type === 'MemberExpression') {
    const [object, propertyName, fn] = evaluateMember(node.callee, st, callback);
    const functionName = typeof propertyName === 'string' ? propertyName : undefined;
    const receiver = scopeReceiver(st, object);
    const created = st.createdObjects;
    if (created) {
      consultMethodWrite(st, created, fn, receiver, args);
    }
    const value = safeCall(fn, receiver, args, node.callee.optional, functionName);
    pushVisitorResult(node, st, value);
  } else {
    callback(node.callee, st);
    const caller = popVisitorResult(node, st);

    // Try to get function name for security checks
    let functionName: string | undefined;
    if (node.callee.type === 'Identifier') {
      functionName = node.callee.name;
    }

    const created = st.createdObjects;
    if (created) {
      consultMethodWrite(st, created, caller, st.context, args);
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
