import { MemberExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalScope, EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { safeGetProperty, isDangerousProperty, isDangerousPrimitiveProperty } from './prototype-pollution-guard';
import { equalIgnoreCase } from './utils';
import { getCachedCaseInsensitiveProperty } from './property-lookup-cache';
import { markThisPositional } from './this-position';
// import { getCachedVisitorResult, setCachedVisitorResult } from './visitor-result-cache';

/**
 * Reconstructs the dotted source path of a member chain (`a.b.c`).
 *
 * Static only: a computed hop (`a[expr]`, `a["b"]`) leaves the path
 * unreconstructible and yields undefined, and a consumer falls back to
 * `target` + `key` identity - which is exact either way. The parts are source
 * spellings, so under `caseInsensitive` the path is not corrected even though
 * the reported key is; optional markers are not represented either, so `a?.b`
 * reconstructs as `a.b`. A chain rooted at anything but an `Identifier` - a
 * `this`, a call, a `super` - yields undefined.
 *
 * Walks the chain once per member read, so every call site sits behind
 * `st.hasHooks && st.hooks.hasReadHooks`: a consumer that registered only node
 * hooks must not pay for a path it can never observe.
 */
const readPath = (node: MemberExpression): string | undefined => {
  const parts: string[] = [];
  let current: MemberExpression['object'] = node;

  while (current.type === 'MemberExpression') {
    if (current.computed || current.property.type !== 'Identifier') {
      return undefined;
    }
    parts.unshift(current.property.name);
    current = current.object;
  }

  if (current.type !== 'Identifier') {
    return undefined;
  }

  parts.unshift(current.name);
  return parts.join('.');
}

/*
 * **There is no by-class refusal of a context in this visitor, and its
 * removal is deliberate** (`docs/a35/plan.md` M20). One stood here, on the
 * member's object and on the value it read, and the value funnel
 * (`visitor-result.ts`) now covers both: a context is refused as it is
 * pushed, whatever node pushed it, so it cannot reach a member read at all -
 * the funnel's one exemption is the walk's own context in an object
 * position, which the branch below handles by identity.
 *
 * It was removed rather than kept as depth because it was measured on both
 * counts: removing it turned no case red (probe D of the § 9 matrix), and it
 * cost ~2.5% of the member-read path, which runs for every `a.b`. A check
 * that covers nothing and is not free is not depth, it is overhead that
 * reads like protection.
 */

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

  // Get the object. A `this` is evaluated only here, as a member's object, so
  // it is marked before it is visited (`this-position.ts`).
  markThisPositional(node.object, !!st.options?.caseInsensitive);
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
    // `this.k` resolves `k` against the context, as an identifier does, so it
    // is refused as one is (`identifier.ts`, `docs/backlog-retired.md` B6): a
    // blocklisted key before the lookup, and under `caseInsensitive` a
    // blocklisted key the lookup matched. Up to 0.10.x neither was checked,
    // and `this.constructor` over a plain object was `Object`.
    if (isDangerousProperty(key)) {
      throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
    }

    // For context objects, preserve case-insensitive behavior
    let contextKey: string | number | symbol | undefined = key;
    if (st.options?.caseInsensitive && typeof key === 'string') {
      contextKey = st.context.getKey(key);
      if (isDangerousProperty(contextKey)) {
        throw new Error(`Access to dangerous property "${String(contextKey)}" is blocked for security reasons`);
      }
    }
    const value = st.context.get(contextKey);
    const thisValue = st.context.getThis(contextKey);

    if (st.hasHooks && st.hooks.hasReadHooks) {
      st.hooks.dispatchRead({
        kind: 'member',
        node,
        state: st,
        key: contextKey ?? key,
        target: st.context,
        path: readPath(node),
        value
      });
    }

    // The fourth slot is the receiver's *origin*, not its identity: true means
    // the evaluator chose this receiver out of the context's own resolution
    // chain, which is what `callMember` guards (`context-receiver.ts`). The
    // identity alone cannot say it - `getThis` answers a key the original
    // holds with the original, which is an ordinary host object - so the fact
    // is carried from here, where it is known, rather than re-derived at the
    // call, where it is not (`docs/a35/plan.md` § 8 q7).
    //
    // The fifth slot is the key the lookup matched, which a write reaches
    // (`docs/backlog.md` A44). Here it is the key the context resolved.
    return [thisValue ?? object, contextKey, value, true, contextKey];
  } else if (object instanceof EvalScope) {
    // A global scope reads its object as the context does, with a bare
    // property access, so a blocklisted key is refused here as it is above.
    if (isDangerousProperty(key)) {
      throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
    }

    // For scope objects, preserve original behavior (no getKey method)
    const value = object.get(key);
    const thisValue = object;

    if (st.hasHooks && st.hooks.hasReadHooks) {
      st.hooks.dispatchRead({
        kind: 'member',
        node,
        state: st,
        key,
        target: object,
        path: readPath(node),
        value
      });
    }

    // A namespaced or global prior scope is not the context's own chain: its
    // object, or the `thisArg` its host declared, is the receiver it has
    // always been.
    return [thisValue ?? object, key, value, false, key];
  } else {
    // Not the walk's own context, and not a scope. A context cannot reach
    // here at all: the value funnel refuses one as it is pushed, and the one
    // it exempts is the walk's own, which the first branch took.
    //
    // For regular objects, we need both case-insensitive lookup AND prototype pollution protection
    let value: unknown;

    // The key the lookup actually matched, reported to the read hooks and
    // returned in the fifth slot, which a compound assignment and an update
    // write to (`docs/backlog.md` A44). The second slot keeps the original
    // `key`, which the call path names a function by.
    let resolvedKey: string | number | symbol = key;

    // A primitive receiver (string, number, boolean) is checked against the
    // primitive subset of the blocklist: `toString` and its kin are ordinary
    // reads on it, while `constructor`, `__proto__` and the accessor definers
    // would reach its global constructor and built-in prototype
    const isPrimitive = (typeof object === 'string' || typeof object === 'number' || typeof object === 'boolean');

    if (st.options?.caseInsensitive && typeof key === 'string') {
      // Use case-insensitive lookup but with prototype pollution protection.
      // A primitive is checked by exact key: it is never case-corrected below,
      // so a variant such as `s.CONSTRUCTOR` reads as a missing property
      if (isPrimitive ? isDangerousPrimitiveProperty(key) : isDangerousProperty(key)) {
        throw new Error(`Access to dangerous property "${key}" is blocked for security reasons`);
      }
      
      // Try case-insensitive lookup on own properties first
      const obj = object as Record<PropertyKey, unknown>;
      let foundKey: string | null | undefined = undefined;
      
      if (obj && typeof obj === 'object') {
        // Create wrapper function for cache compatibility
        const compareIgnoreCase = (a: string, b: string): boolean => {
          const result = equalIgnoreCase(a, b);
          return result === true;
        };
        
        // Use cached case-insensitive property lookup for own properties (optimization)
        const cachedFoundKey = getCachedCaseInsensitiveProperty(obj, key, compareIgnoreCase);
        if (cachedFoundKey !== undefined) {
          // Cache hit: cachedFoundKey is either the found key (string) or null (no match)
          foundKey = cachedFoundKey;
        }
        
        // If cache miss or not found in own properties, check if the original key exists (including prototype methods)
        if (cachedFoundKey === undefined || !foundKey) {
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
        // For primitives, a direct read: the key passed the primitive subset's
        // check above, and the lookup block never ran, so foundKey is unset
        value = foundKey ? obj[foundKey] : obj[key];
      } else {
        // For objects, use safe property access
        value = foundKey ? obj[foundKey] : safeGetProperty(object, key);
      }

      if (foundKey) {
        resolvedKey = foundKey;
      }
    } else {
      // Use safe property access for prototype pollution protection; a
      // primitive gets a direct read, after the primitive subset's check
      if (isPrimitive) {
        if (isDangerousPrimitiveProperty(key)) {
          throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
        }
        value = (object as Record<PropertyKey, unknown>)[key];
      } else {
        value = safeGetProperty(object, key);
      }
    }

    if (st.hasHooks && st.hooks.hasReadHooks) {
      st.hooks.dispatchRead({
        kind: 'member',
        node,
        state: st,
        key: resolvedKey,
        target: object,
        path: readPath(node),
        value
      });
    }

    return [object, key, value, false, resolvedKey];
  }
}

/**
 * An `=` target's object and key, with no value read: JavaScript's `=` does
 * not read its target (`docs/backlog.md` A45, part 2). The object, and a
 * computed key, are evaluated as {@link evaluateMember} evaluates them, once
 * and before the right side, and nothing reports a read of the target.
 *
 * The key checks the read used to make stay, and run here, before the right
 * side (`docs/a45/plan.md` D7): `safeSetProperty` refuses the same keys with
 * the same message, but only after the right side has run. A string, number or
 * boolean object gets the primitive subset's check, and any other object,
 * `null` and `undefined` included, the full blocklist.
 *
 * Under `caseInsensitive` a string key on an object is matched as the read
 * matches it, the own-key cache and then the prototype's own names, but tested
 * with `in` where the read tests `obj[key]`, so no getter is called
 * (`docs/backlog.md` A44). The match is checked against the blocklist, as the
 * read's `foundKey` is. Any other object takes the key as spelled, as on the
 * read path.
 *
 * The context branch still calls `getThis`, which reads the value it tests
 * (`docs/backlog.md` A49), and under `caseInsensitive` answers the `Registry`
 * copy (A50). An `EvalScope` is written as an object (A51).
 */
export const resolveMemberTarget = (node: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>): [unknown, unknown] => {

  markThisPositional(node.object, !!st.options?.caseInsensitive);
  callback(node.object, st);
  const obj = popVisitorResult(node, st) as object;
  const object = (node.optional ? (obj || {}) : obj);

  let key: string | number | symbol;
  if (!node.computed && node.property.type === 'Identifier') {
    key = node.property.name;
  } else if (node.property.type === 'Literal') {
    key = node.property.value as string | number | symbol;
  } else {
    callback(node.property, st);
    key = popVisitorResult(node, st) as (string | number | symbol);
  }

  if (object === st.context) {
    // As the read path's context branch, without its `get`.
    if (isDangerousProperty(key)) {
      throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
    }

    let contextKey: string | number | symbol | undefined = key;
    if (st.options?.caseInsensitive && typeof key === 'string') {
      contextKey = st.context.getKey(key);
      if (isDangerousProperty(contextKey)) {
        throw new Error(`Access to dangerous property "${String(contextKey)}" is blocked for security reasons`);
      }
    }
    return [st.context.getThis(contextKey) ?? object, contextKey];
  } else if (object instanceof EvalScope) {
    if (isDangerousProperty(key)) {
      throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
    }
    return [object, key];
  }

  const isPrimitive = (typeof object === 'string' || typeof object === 'number' || typeof object === 'boolean');

  if (isPrimitive ? isDangerousPrimitiveProperty(key) : isDangerousProperty(key)) {
    throw new Error(`Access to dangerous property "${String(key)}" is blocked for security reasons`);
  }

  if (st.options?.caseInsensitive && typeof key === 'string' && object && typeof object === 'object') {
    const target = object as Record<PropertyKey, unknown>;
    let foundKey: string | null | undefined = getCachedCaseInsensitiveProperty(target, key,
      (a, b) => equalIgnoreCase(a, b) === true);

    if (!foundKey) {
      // As the read path's `obj[key]` test, a lookup that throws leaves the
      // key as spelled. A proxy's `has` trap is called here, which
      // JavaScript's `=` does not call.
      try {
        if (key in target) {
          foundKey = key;
        } else {
          const prototype = Object.getPrototypeOf(target);
          if (prototype) {
            foundKey = Object.getOwnPropertyNames(prototype).find(k => equalIgnoreCase(k, key));
          }
        }
      } catch {
        foundKey = undefined;
      }
    }

    if (foundKey && isDangerousProperty(foundKey)) {
      throw new Error(`Access to dangerous property "${foundKey}" is blocked for security reasons`);
    }
    return [object, foundKey || key];
  }

  return [object, key];
}
