import { CallExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { evaluateArray } from './array-expression';
import { consultMethodWrite } from './member-write-policy';
import { isDangerousValue } from './dangerous-values';

/**
 * Security: List of dangerous functions that should not be callable
 *
 * Also the names `dangerous-values.ts` reads from `globalThis` into its
 * identity set, and the names its bound-function rule refuses.
 */
export const DANGEROUS_FUNCTIONS = new Set([
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

  // A dangerous function by value, under whatever name it was reached:
  // an alias, a member, a call result, a case variant (`dangerous-values.ts`).
  // Up to 0.12.0 only the written name was checked (`docs/backlog.md` A35).
  if (isDangerousValue(fn)) {
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
 *
 * Also the call a tag that is not a member goes through
 * (`tagged-template-expression.ts`).
 */
export const safeCall = (
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
 * Calls the function a member callee reads, from what `evaluateMember`
 * returned for it: the receiver `scopeReceiver` gives, the context's write
 * policy asked first, then the sandbox, with the property name as the checked
 * name - a computed key included, since `obj["fetch"]` reads the key `fetch`.
 *
 * Shared by a member call and a member tag (`tagged-template-expression.ts`),
 * so the two cannot drift. Up to 0.12.0 a tag was applied with the context as
 * `this` and no check at all (`docs/backlog-retired.md` A36). Each visitor
 * evaluates the member itself and hands the result in, so each keeps its own
 * order: a call's arguments before its callee, a tag before its template's
 * expressions.
 */
export const callMember = (st: EvalState, [object, propertyName, fn]: readonly unknown[],
  args: unknown[], optional: boolean): unknown => {

  const functionName = typeof propertyName === 'string' ? propertyName : undefined;
  const receiver = scopeReceiver(st, object);
  const created = st.createdObjects;
  if (created) {
    consultMethodWrite(st, created, fn, receiver, args);
  }
  return safeCall(fn, receiver, args, optional, functionName);
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
    const value = callMember(st, evaluateMember(node.callee, st, callback), args, node.callee.optional);
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
