import { ArrayPattern, Identifier, MemberExpression,
  ObjectPattern, Pattern, RestElement } from 'acorn';
import * as walk from 'acorn-walk';
import { EvalState } from '../classes/eval';
import { popVisitorResult } from '.';
import { BaseContext } from '../classes/common';
import { isDangerousProperty, safeGetProperty, safeSetProperty } from './prototype-pollution-guard';


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

/**
 * The keys an object pattern has already consumed, in source-key terms.
 *
 * A rest element binds *the remainder*, so it needs the names the sibling
 * properties took - and it needs them as they appear on the **source**, which
 * is `Property.key`, not the name each one bound. For `{ a: x, ...r }` the key
 * removed from `r` is `a`; `x` was never a source key and removing it would
 * take the wrong property when the source happens to carry that name too.
 */
const restOf = (source: unknown, taken: readonly (string | number)[]): BaseContext => {
  const object = {} as BaseContext;

  if (!source || typeof source !== 'object') {
    return object;
  }

  const consumed = new Set<string>(taken.map(key => String(key)));

  for (const key of Object.keys(source as Record<string, unknown>)) {
    if (!consumed.has(key)) {
      safeSetProperty(object, key, (source as Record<string, unknown>)[key]);
    }
  }

  return object;
}

const evaluateObjectPattern = (pattern: ObjectPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, arg: unknown) => {

  let context: BaseContext = {};
  const taken: (string | number)[] = [];

  pattern.properties.map((pattern) => {
    switch (pattern.type) {
      case 'Property': {
          let key: string | number;
          // `computed` is tested first, and that is the whole of a third
          // defect. `{ [keyName]: q }` parses as `key` an **Identifier** named
          // `keyName`, so an `Identifier`-first chain took the name it is
          // spelled with and read `src.keyName` instead of evaluating it and
          // reading `src[keyName]`. The literal computed form `{ ["a"]: q }`
          // hid it the way shorthand hid A11 - a `Literal`'s value *is* its
          // key, so taking the wrong branch landed on the right answer. See
          // `docs/backlog.md` A14.
          if (!pattern.computed && pattern.key.type === 'Identifier') {
            key = pattern.key.name;
          } else if (!pattern.computed && pattern.key.type === 'Literal') {
            key = pattern.key.value as string | number;
          } else {
            // Walked **before** the source property is read, and deliberately:
            // a computed key is an expression of the *enclosing* scope, not of
            // the object being destructured. `let { [keyName]: v } = src`
            // resolves `keyName` where the declaration is written, exactly as
            // JavaScript does. This is the only `callback` left in the module,
            // and nothing pushes the source as a scope any more, so there is no
            // arrangement in which it could resolve against the source.
            callback(pattern.key, st);
            key = popVisitorResult(pattern, st) as string | number;
            if (typeof key !== 'string' && typeof key !== 'number')
            throw new Error(`Unsupported property key type: ${pattern.key.type}`);
          }

          // **Where `let { a = 1 } = o` actually lands**, which is not where it
          // was expected to. A default in an object pattern is parsed as
          // `Property.value` of type `AssignmentPattern`, and this branch is
          // the only thing that sees it: the recursion below would hand it to
          // `evaluatePattern`, whose `AssignmentPattern` case is commented out,
          // so it would reach that function's `default` and be rejected with
          // the same message one frame further down. Kept here so the rejection
          // is attributable to the object form, and because it predates the
          // recursion - before it, nothing reached either `switch` at all and
          // the form bound silently. The array form (`let [a = 1] = arr`) and
          // the parameter form (`(a = 1) => a`) go through `evaluatePatterns`
          // and are covered there.
          if (pattern.value.type === 'AssignmentPattern') {
            unsupportedBindingTarget(pattern.value.type);
          }

          taken.push(key);

          // Guarded on the way *in*, which is where the blocklist has to sit
          // now that the value is a binding target rather than an expression.
          // `let { __proto__: p } = o` and `let { constructor: { x } } = o`
          // both stop here, and the nested form is why the read is guarded and
          // not only the binding name below: a plain read would hand `Function`
          // to the recursion, and `evaluateIdentifier`'s guard would then be
          // inspecting the *inner* pattern's names, by which point the escape
          // has happened.
          //
          // Tested explicitly rather than left to `safeGetProperty`, which
          // returns early for a non-object target **before** it checks the key
          // - so `(({ valueOf: v }) => v)(o)` with `o` unbound would read
          // `undefined` and bind quietly. The blocklist applies to the source
          // key whatever the source turns out to be, which is the net the
          // declaration and arrow-parameter binders already cast.
          if (isDangerousProperty(key)) {
            throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
          }

          const value = safeGetProperty(arg, key);

          // The binding target, which may be a name, another object pattern,
          // or an array pattern. Recursion is the whole repair: `Property.value`
          // is a *pattern* and is bound against the source property, where it
          // used to be walked as an **expression** against the source object -
          // which resolved the wrong name and bound the wrong one. See
          // `docs/backlog.md` A11.
          const bound = evaluatePattern(pattern.value, st, callback, value);

          context = {...context, ...bound};
        }
        break;
      case 'RestElement': {
          // The remainder, not the whole source. Acorn requires the rest
          // element last in an object pattern, so `taken` is complete here.
          // Binding the whole argument left an already-destructured key on the
          // rest record - `docs/backlog.md` A13.
          const object = evaluateRestElement(pattern, st, callback, restOf(arg, taken));
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
