import { ArrayPattern, Identifier, MemberExpression,
  ObjectPattern, Pattern, RestElement } from 'acorn';
import * as walk from 'acorn-walk';
import { EvalState } from '../classes/eval';
import { popVisitorResult } from '.';
import { BaseContext } from '../classes/common';
import { safeSetProperty } from './prototype-pollution-guard';


// based on evalArrowContext
// https://github.com/6utt3rfly/jse-eval/blob/main/index.ts

/**
 * The one answer this module gives to a binding target it does not implement.
 *
 * Both entry points used to fall out of their `switch` and return an empty
 * context - `evaluatePatterns` past a `case`-less type, `evaluatePattern` past
 * the `return {}` at the end - so `let { a = 1 } = o` and `((a = 1) => a)(x)`
 * bound nothing, threw nothing, and left the caller to read the miss as a
 * value. That is the shape `docs/backlog.md` A2 records three instances of in
 * the two write visitors, and Phase 2 requires a throwing `default:` in every
 * new statement dispatcher; a phase that promises not to add a fourth member of
 * that family cannot leave this one open either.
 *
 * `AssignmentPattern` is the reachable case - it is commented out below - and
 * the message names the node type so a consumer can tell which form was
 * rejected.
 */
const unsupportedBindingTarget = (type: string): never => {
  throw new Error(`${type} is not supported as a binding target.`);
}

export const evaluatePatterns = (patterns: Pattern[], st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown[]) => {

  let context: BaseContext = {};

  patterns.map((pattern, i) => {
    switch (pattern.type) {
      case 'Identifier': {
          const object = evaluateIdentifier(pattern, st, args[i]);
          context = {...context, ...object};
        }
        break;
      case 'MemberExpression': {
          const object = evaluateMemberExpression(pattern);
          context = {...context, ...object};
        }
        break;
      case 'ObjectPattern': {
          const object = evaluateObjectPattern(pattern, st, callback, args[i]);
          context = {...context, ...object};
        }
        break;
      case 'ArrayPattern': {
          const object = evaluateArrayPattern(pattern, st, callback, args[i] as unknown[]);
          context = {...context, ...object};
        }
        break;
      case 'RestElement': {
          const object = evaluateRestElement(pattern, st, callback, args.slice(i));
          context = {...context, ...object};
        }
        break;
      // case 'AssignmentPattern': {
      //     const object = evaluateAssignmentPattern(pattern, st, callback, args[i]);
      //     context = {...context, ...object};
      //   }
      //   break;
      default:
        unsupportedBindingTarget(pattern.type);
      }
  });

  return context;
}

export const evaluatePattern = (pattern: Pattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, arg: unknown): BaseContext => {

  switch (pattern.type) {
    case 'Identifier':
      return evaluateIdentifier(pattern, st, arg);
    case 'MemberExpression':
      return evaluateMemberExpression(pattern);
    case 'ObjectPattern':
      return evaluateObjectPattern(pattern, st, callback, arg as unknown[]);
    case 'ArrayPattern':
      return evaluateArrayPattern(pattern, st, callback, arg as unknown[]);
    case 'RestElement':
      return evaluateRestElement(pattern, st, callback, arg);
    // case 'AssignmentPattern':
    //   return evaluateAssignmentPattern(pattern, st, callback, arg);
  }

  return unsupportedBindingTarget(pattern.type);
}

// The binding write goes through the prototype-pollution guard, for the reason
// the other three guarded visitors do: on a plain record `__proto__` is a
// setter, so `let __proto__ = { … }` and `({ __proto__ }) => …` would replace
// this object's prototype instead of naming a binding. Declarations are a new
// way to reach this line - before Phase 2 only an arrow parameter did - so the
// surface widened and the guard is what keeps the blocklist covering it.
const evaluateIdentifier = (pattern: Identifier, st: EvalState, arg: unknown) => {
  const object = {} as BaseContext;
  safeSetProperty(object, pattern.name, arg);
  return object;
}

// Module-private, and down to the one parameter it reads: deleting the log
// below left `st`, `callback` and `arg` unused, and the two call sites are both
// in this file.
const evaluateMemberExpression = (pattern: MemberExpression): BaseContext => {

  if (pattern.type === 'MemberExpression') {
    // The node type is the only part of this a caller could act on. What stood
    // here before was `console.log(pattern, st, callback, arg)` - `st` being the
    // whole EvalState, i.e. the caller's entire evaluation context dumped to the
    // console of any application whose user wrote that pattern. Unreachable
    // today because acorn rejects a MemberExpression binding target in a
    // parameter list, and deleted ahead of the work that widens what reaches
    // here. See docs/backlog.md B2.
    throw new Error(`${pattern.type} is not supported as a binding target.`);
  }

  return {} as BaseContext;
}

const evaluateObjectPattern = (pattern: ObjectPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, arg: unknown) => {

  let context: BaseContext = {};

  pattern.properties.map((pattern) => {
    switch (pattern.type) {
      case 'Property': {
          let key: string | number;
          if (pattern.key.type === 'Identifier') {
            key = pattern.key.name;
          } else if (pattern.key.type === 'Literal') {
            key = pattern.key.value as string | number;
          } else {
            callback(pattern.key, st);
            key = popVisitorResult(pattern, st) as string | number;
            if (typeof key !== 'string' && typeof key !== 'number')
            throw new Error(`Unsupported property key type: ${pattern.key.type}`);
          }

          // **Where `let { a = 1 } = o` actually lands**, which is not where
          // it was expected to. A default in an object pattern is parsed as
          // `Property.value` of type `AssignmentPattern` - so it is handed to
          // `callback` below and walked as an *expression*, and reaches neither
          // of this module's two `switch` defaults. Rejecting it there would
          // have left the object form of the very example that names the
          // divergence still binding silently; the array form
          // (`let [a = 1] = arr`) and the parameter form (`(a = 1) => a`) do go
          // through `evaluatePatterns`, and are covered there.
          if (pattern.value.type === 'AssignmentPattern') {
            unsupportedBindingTarget(pattern.value.type);
          }

          const ctx = arg as BaseContext;

          // `finally`, for the reason given at the other push site in
          // arrow-function-expression.ts: the scope stack is on EvalContext,
          // which outlives this walk, so a scope left behind here shadows a
          // source key on every later evaluation against the same context.
          // The `try` opens after the push, never around it.
          st.context?.push(ctx);
          let value: BaseContext;
          try {
            callback(pattern.value, st);
            value = popVisitorResult(pattern, st) as BaseContext;
          } finally {
            st.context?.pop();
          }

          // Guarded for the same reason `evaluateIdentifier` is: the key comes
          // from the *pattern*, so `let { __proto__: p } = o` names `__proto__`
          // here and a raw assignment would set this record's prototype.
          const pair = {} as BaseContext;
          safeSetProperty(pair, key, value);

          context = {...context, ...pair};
        }
        break;
      case 'RestElement': {
          const object = evaluateRestElement(pattern, st, callback, arg);
          context = {...context, ...object};
        }
        break;
    }
  });

  return context;
}

const evaluateArrayPattern = (pattern: ArrayPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown[]) => {
  const patterns = pattern.elements.filter(s => !!s) as Pattern[];
  const object = evaluatePatterns(patterns, st, callback, args);
  return object;
}

const evaluateRestElement = (pattern: RestElement, st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown) => {
  const argument = pattern.argument;
  const object = evaluatePattern(argument, st, callback, args);
  return object;
}

// const evaluateAssignmentPattern = (pattern: AssignmentPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown) => {
//   const left = evaluatePattern(pattern.left, st, callback, args);
//   callback(pattern.right, st);
//   const value = popVisitorResult(pattern, st);
//   const object = {...left};
//   return object;
// }
