import { CallExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { evaluateArray } from './array-expression';
import { consultMethodWrite, refuseContextMethodWrite } from './member-write-policy';
import { exemptFromFunnel, isDangerousValue } from './dangerous-values';
import { guardedReceiver } from './context-receiver';

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
export const callMember = (st: EvalState, [object, propertyName, fn, contextResolved]: readonly unknown[],
  args: unknown[], optional: boolean): unknown => {

  const functionName = typeof propertyName === 'string' ? propertyName : undefined;
  const receiver = scopeReceiver(st, object);
  const created = st.createdObjects;
  if (created) {
    // The write policy is asked about the real write target, never the view:
    // a policy decides about the object that is written.
    consultMethodWrite(st, created, fn, receiver, args);
  }
  // Then, whether or not the context polices writes: a native built-in
  // writing into an evaluation context is refused, because the context is
  // not the caller's to write (`member-write-policy.ts`). After the
  // consultation and not before, so a policy still sees the write it would
  // have seen and its own refusal is still the one that surfaces - the same
  // order the member-write path has, where `safeSetProperty` refuses after
  // `consultMemberWrite` has been asked.
  refuseContextMethodWrite(fn, receiver, args);
  // A receiver the evaluator resolved out of the context's own chain is
  // guarded (`context-receiver.ts`): the context itself, for a key only a
  // lookup resolves, and the original, for a key the original holds. Both
  // reach `this.fn()`, and guarding only the first left the second open -
  // the same route one token shorter (`docs/a35/plan.md` § 8 q7, R4).
  //
  // A prior scope's declared `thisArg`, and a plain object's own receiver,
  // are untouched: the host chose those, and `obj.fn()` and `ns.fn()` call
  // what they always did.
  const fromContextChain = contextResolved === true
    && (receiver === st.context || receiver === st.context?.original);
  const thisArg = fromContextChain ? guardedReceiver(st.context) : receiver;
  return safeCall(fn, thisArg, args, optional, functionName);
};

/**
 * Enhanced call expression visitor with security checks
 *
 * A context with a member-write policy is asked, before the call, about a
 * built-in that writes into its receiver or its first argument - see
 * `consultMethodWrite`. The receiver asked about is the write target: the
 * member's object, a prior scope's `thisArg`, or the context itself for a
 * bare call. A context without a policy pays one field read per call.
 *
 * That is no longer the same object the call is made with. A bare call's
 * `this` is a guarded view of the context (`context-receiver.ts`), while the
 * policy keeps the real one - a policy decides about the object that is
 * written, and the view is not it.
 */
export const callExpressionVisitor = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const args = evaluateArray(node, node.arguments, st, callback);

  if (node.callee.type === 'MemberExpression') {
    const value = callMember(st, evaluateMember(node.callee, st, callback), args, node.callee.optional);
    pushVisitorResult(node, st, value);
  } else {
    // The callee's own value is checked by `safeCall`, with the call's
    // message; what is read under it still passes the funnel.
    exemptFromFunnel(node.callee);
    callback(node.callee, st);
    const caller = popVisitorResult(node, st);

    // Try to get function name for security checks
    let functionName: string | undefined;
    if (node.callee.type === 'Identifier') {
      functionName = node.callee.name;
    }

    // A bare call's `this` is a guarded view, not the context itself
    // (`context-receiver.ts`). Built once, and asked about with the same
    // object the call will use.
    const thisArg = guardedReceiver(st.context);

    const created = st.createdObjects;
    if (created) {
      // The policy is asked about the **real** context, which is its
      // published contract: a policy decides about the object that would be
      // written, and `member-write-policy.methods.spec.ts` pins that target.
      consultMethodWrite(st, created, caller, st.context, args);
    }
    // The refusal is asked about `thisArg`, which is what the call will
    // actually receive. Passing the real context here instead would refuse a
    // write that was never going to reach it - a receiver-writing built-in
    // bare-called gets the view, whose frozen target refuses the write as
    // step 8 documents - and would report it under the context's name. An
    // argument that *is* a context is still caught, since a first-argument
    // writer is matched on `args` whatever its receiver.
    refuseContextMethodWrite(caller, thisArg, args);
    const value = safeCall(caller, thisArg, args, node.optional, functionName);
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}
