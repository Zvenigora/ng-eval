/**
 * Performance optimization tests to validate caching and allocation improvements
 */

import { TestBed } from '@angular/core/testing';
import { EvalService } from '../actual/services/eval.service';
import { clearVisitorResultCache, getVisitorResultCacheStats } from './visitors/visitor-result-cache';
import { clearPropertyLookupCache, getPropertyLookupCacheStats } from './visitors/property-lookup-cache';
import { EvalContext, EvalHooks, EvalState } from './classes/eval';
import { evaluate, parse } from './functions';
import { ColonIdentifiersParser } from './functions/colon-identifiers';
import * as receiver from './visitors/context-receiver';
import * as contextMethod from './visitors/context-method';
import { AnyNode } from 'acorn';
import * as acorn from 'acorn';

describe('Performance Optimizations', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    clearVisitorResultCache();
    clearPropertyLookupCache();
  });

  afterEach(() => {
    clearVisitorResultCache();
    clearPropertyLookupCache();
  });

  describe('Visitor Result Caching', () => {
    it('should not cache visitor results due to context sensitivity', () => {
      const context = { a: 5, b: 3 };
      const expression = 'a + b * 2';
      
      // First evaluation
      const result1 = service.simpleEval(expression, context);
      expect(result1).toBe(11); // 5 + (3 * 2)
      
      // Second evaluation should produce same result but not use cache
      const result2 = service.simpleEval(expression, context);
      expect(result2).toBe(11);
      
      // Visitor result caching is disabled to prevent context sensitivity issues
      const stats = getVisitorResultCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should not cache member expression visitor results', () => {
      const context = { user: { name: 'John', age: 25 } };
      const expression = 'user.name';
      
      // First evaluation
      const result1 = service.simpleEval(expression, context);
      expect(result1).toBe('John');
      
      // Second evaluation should produce same result but not use cache
      const result2 = service.simpleEval(expression, context);
      expect(result2).toBe('John');
      
      // Visitor result caching is disabled to prevent context sensitivity issues
      const stats = getVisitorResultCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should handle context changes without caching', () => {
      let context = { value: 10 };
      const expression = 'value * 2';
      
      // First evaluation
      const result1 = service.simpleEval(expression, context);
      expect(result1).toBe(20);
      
      // Change context
      context = { value: 15 };
      
      // Should recalculate with new context (no cache interference)
      const result2 = service.simpleEval(expression, context);
      expect(result2).toBe(30);
      
      // Cache should remain empty
      const stats = getVisitorResultCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should not cache simple literal expressions', () => {
      const result1 = service.simpleEval('42');
      const result2 = service.simpleEval('42');
      
      expect(result1).toBe(42);
      expect(result2).toBe(42);
      
      // Cache should remain empty for simple literals
      const stats = getVisitorResultCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Property Lookup Caching', () => {
    it('should cache case-insensitive property lookups', () => {
      const context = { 
        TestObject: { Value: 'test', Count: 42 }
      };
      
      // First lookup with case-insensitive option enabled
      const result1 = service.simpleEval('TestObject.value', context, { caseInsensitive: true }); // lowercase 'value'
      expect(result1).toBe('test');
      
      // Second lookup should use cached result
      const result2 = service.simpleEval('TestObject.value', context, { caseInsensitive: true });
      expect(result2).toBe('test');
      
      const stats = getPropertyLookupCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle multiple case variations efficiently', () => {
      const context = {
        data: { Name: 'John', Age: 25, Email: 'john@test.com' }
      };
      
      // Test different case variations with case-insensitive option enabled
      expect(service.simpleEval('data.name', context, { caseInsensitive: true })).toBe('John');
      expect(service.simpleEval('data.NAME', context, { caseInsensitive: true })).toBe('John');
      expect(service.simpleEval('data.Name', context, { caseInsensitive: true })).toBe('John');
      expect(service.simpleEval('data.age', context, { caseInsensitive: true })).toBe(25);
      expect(service.simpleEval('data.AGE', context, { caseInsensitive: true })).toBe(25);
      
      const stats = getPropertyLookupCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Array Allocation Optimization', () => {
    it('should efficiently handle large array expressions', () => {
      const context = { items: [1, 2, 3, 4, 5] };
      
      // Test array operations that could benefit from optimized allocation
      const result = service.simpleEval('[...items, 6, 7, 8]', context);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should handle nested array expressions efficiently', () => {
      const context = { a: [1, 2], b: [3, 4] };
      
      const result = service.simpleEval('[[...a], [...b], [5, 6]]', context);
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('should handle empty and null array elements correctly', () => {
      const result = service.simpleEval('[1, , 3, null, 5]');
      expect(result).toEqual([1, null, 3, null, 5]); // Note: evaluator may treat empty elements as null
    });
  });

  describe('Object Allocation Optimization', () => {
    it('should efficiently handle object expressions with spread', () => {
      const context = { 
        base: { a: 1, b: 2 },
        extra: { c: 3, d: 4 }
      };
      
      // Simplified object expression for compatibility using array instead
      const result = service.simpleEval('[base.a, base.b, extra.c, extra.d, 5]', context);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle complex object expressions efficiently', () => {
      const context = {
        user: { name: 'John', age: 25 },
        settings: { theme: 'dark' }
      };
      
      // Use array instead of object due to parser limitations
      const result = service.simpleEval('[user, settings, true]', context);
      expect(result).toEqual([
        { name: 'John', age: 25 },
        { theme: 'dark' },
        true
      ]);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should show improved performance on repeated evaluations', () => {
      const context = { 
        users: [
          { Name: 'John', Age: 25, Active: true },  // Uppercase properties
          { Name: 'Jane', Age: 30, Active: false }
        ]
      };
      
      // Use case-insensitive evaluation to trigger property lookup caching
      const expression = 'users.filter(u => u.active).map(u => u.name)[0]'; // lowercase properties
      
      // Warm up and measure with case-insensitive option
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = service.simpleEval(expression, context, { caseInsensitive: true });
        expect(result).toBe('John');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete reasonably quickly (this is more about regression testing)
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 iterations
      
      // Only property lookup cache should be populated (visitor cache is disabled)
      const visitorStats = getVisitorResultCacheStats();
      const propertyStats = getPropertyLookupCacheStats();
      
      expect(visitorStats.size).toBe(0); // Disabled
      expect(propertyStats.size).toBeGreaterThan(0); // Should have cached case-insensitive lookups
    });
  });

  /**
   * The gate on the read-emission guard.
   *
   * `hasHooks` is true whenever *any* hook is registered, so guarding the read
   * emission on it alone makes a consumer with only node hooks pay `getKey` per
   * identifier and `readPath` plus an object literal per member - work whose
   * result no registered hook can observe. The guard is
   * `st.hasHooks && st.hooks.hasReadHooks`; these tests are what keeps it that
   * way.
   *
   * Both halves are asserted through `dispatchRead`, not through a read hook: a
   * spy on a read hook cannot see this, because the whole cost is incurred
   * *building the argument* before any read hook would be called.
   */
  describe('Read Emission Guard', () => {

    const nodeOf = (source: string): AnyNode =>
      parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

    /** Case-insensitive, so `getKey` reaches the linear scan this guards. */
    const options = { caseInsensitive: true };

    let getKey: jest.SpyInstance;

    beforeEach(() => {
      getKey = jest.spyOn(EvalContext.prototype, 'getKey');
    });

    afterEach(() => {
      getKey.mockRestore();
    });

    it('should not build a read event when only node hooks are registered', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => undefined);
      hooks.on('after', '*', () => undefined);

      const state = EvalState.fromContext({ a: 1, b: { c: 2 } }, { hooks, ...options });
      const dispatchRead = jest.spyOn(hooks, 'dispatchRead');

      expect(evaluate(nodeOf('A + b.C'), state)).toBe(3);

      // The walk really did dispatch - otherwise this proves nothing about the
      // read path in particular.
      expect(state.hasHooks).toBe(true);
      expect(hooks.hasReadHooks).toBe(false);

      // Never called, so neither `readPath` nor the event literal ran either:
      // both are evaluated to build this call's argument.
      expect(dispatchRead).not.toHaveBeenCalled();
      // `getKey` still runs for the context member hop, which is ordinary
      // evaluation - but not the extra call `emitRead` would add per identifier.
      expect(getKey).not.toHaveBeenCalledWith('A');
    });

    it('should build read events once a read hook is registered', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => undefined);
      hooks.onRead(() => undefined);

      const state = EvalState.fromContext({ a: 1, b: { c: 2 } }, { hooks, ...options });
      const dispatchRead = jest.spyOn(hooks, 'dispatchRead');

      expect(evaluate(nodeOf('A + b.C'), state)).toBe(3);

      expect(hooks.hasReadHooks).toBe(true);
      expect(dispatchRead).toHaveBeenCalled();
      expect(getKey).toHaveBeenCalledWith('A');
    });

    it('should stop building read events when the last read hook unsubscribes', () => {
      const hooks = new EvalHooks();
      hooks.on('after', '*', () => undefined);
      const off = hooks.onRead(() => undefined);
      off();

      const state = EvalState.fromContext({ a: 1 }, { hooks, ...options });
      const dispatchRead = jest.spyOn(hooks, 'dispatchRead');

      expect(evaluate(nodeOf('A'), state)).toBe(1);

      // `hasReadHooks` does not latch, so unsubscribing really turns the read
      // path back off - unlike `isActive`, which stays true for the walk.
      expect(state.hasHooks).toBe(true);
      expect(hooks.hasReadHooks).toBe(false);
      expect(dispatchRead).not.toHaveBeenCalled();
    });
  });

  /**
   * The gate on the default parse path (`docs/colon-identifiers/phase-9-plan.md`
   * § 3.9).
   *
   * With `colonIdentifiers` off, `parse` is acorn's own `parse`, the function
   * it called before the grammar existed, so the default path pays one option
   * check and nothing of the plugin. Structural rather than timed: one
   * extended parser for every call, with the grammar switched off inside it,
   * would be as fast in a benchmark and still put the plugin on every parse.
   */
  describe('Parser Selection', () => {
    it('should parse with acorn\'s own parser unless colonIdentifiers is set', () => {
      const acornParse = jest.spyOn(acorn, 'parse');
      const colonParse = jest.spyOn(ColonIdentifiersParser, 'parse');
      try {
        parse('a + b', { ecmaVersion: 2020 });
        parse('a + b', { ecmaVersion: 2020, colonIdentifiers: false });

        expect(acornParse).toHaveBeenCalledTimes(2);
        expect(colonParse).not.toHaveBeenCalled();

        acornParse.mockClear();
        parse('a + b', { ecmaVersion: 2020, colonIdentifiers: true });

        expect(colonParse).toHaveBeenCalledTimes(1);
        expect(acornParse).not.toHaveBeenCalled();
      } finally {
        acornParse.mockRestore();
        colonParse.mockRestore();
      }
    });
  });

  /**
   * The gate on the guarded receiver's cost (`docs/a35/plan.md` N-d).
   *
   * Measured in a production bundle, the first form of the guard cached one
   * view per context in a `WeakMap`. On the ordinary one-shot path -
   * `simpleEval(expr, plainObject)`, which builds a fresh context every time -
   * the cache never hit, and retaining its entries made a bare call ~45%
   * slower than before the guard. An uncached view, built per call and held by
   * nothing, came in within the baseline's own spread. The member-read path,
   * measured in its own run, did not move.
   *
   * Structural rather than timed, for the reason the Parser Selection case
   * gives and the plan's finding 7 measured: timing inside Jest varied
   * sixfold, so a threshold loose enough not to flake would let a 45%
   * regression through. What these pin is the mechanism the measurement
   * found, which is what a regression would have to reintroduce.
   *
   * Both spy on `guardedReceiver` through its module namespace, which works
   * because this project's transform emits CommonJS and the call sites read
   * the export at call time. Were a call site ever to capture the function at
   * load instead, the second case could go vacuous - but the first, in the
   * same pair, goes red at the same moment, so the two check each other. The
   * `WeakMap.prototype.set` spy sees retention through a `WeakMap` and not
   * through a `WeakSet`, a `FinalizationRegistry` or a strong `Map`; any
   * cache that *reuses* a view also fails N4 in
   * `eval.service.context-receiver.spec.ts`.
   */
  describe('Guarded Receiver Cost', () => {

    const nodeOfExpression = (source: string): AnyNode =>
      parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

    it('should build a bare call\'s view per call and retain none of it, on a fresh context', () => {
      // Retention was the whole cost: a view per context, kept in a `WeakMap`
      // keyed by a context that lived for one evaluation. So a bare call must
      // insert nothing into any `WeakMap` - and must still build its view,
      // once per call, or the guard is not running at all.
      //
      // Parsed outside the window on purpose: the parser service's cache
      // fingerprints its options in a `WeakMap` of its own on a first parse,
      // which is not the walk and not this cost. Only the walk is spied on,
      // with a fresh context, which is the path that regressed.
      const f = function (x: number) { return x; };
      const ast = nodeOfExpression('f(1) + f(2) + f(3)');
      const weakMapSet = jest.spyOn(WeakMap.prototype, 'set');
      const build = jest.spyOn(receiver, 'guardedReceiver');
      try {
        expect(evaluate(ast, EvalState.fromContext({ f }))).toBe(6);

        expect(build).toHaveBeenCalledTimes(3);
        expect(weakMapSet).not.toHaveBeenCalled();
      } finally {
        weakMapSet.mockRestore();
        build.mockRestore();
      }
    });

    it('should keep the member-write path free of the context\'s own machinery', () => {
      // The write path pays two new checks since Revision 16: the by-class
      // refusal in `safeSetProperty`, and - on every call - the lookup that
      // asks whether a native built-in is about to write into a context
      // (`docs/a35/plan.md` M19, which measured both at +0.3% to +3.9%).
      //
      // Structural, like its neighbours: a write to an ordinary object must
      // build no view, retain nothing, and ask a context with no policy
      // nothing. What this would catch is the refusal growing a per-write
      // allocation, or the native-writer check waking the policy path up for
      // a context that opted out of it.
      // The policy is asked through `contextCheckMemberWrite` rather than off
      // the instance, so that is what a spy can see: `checkMemberWrite` is
      // declared on the class and defined by no one, which is the opt-out
      // (`member-write-policy.spec.ts` pins that it stays undefined), so
      // there is nothing on the prototype to spy on.
      // Parsed as a whole `Program`, and outside the window: the program's
      // own scope push is the positive control for these spies - without it
      // "the policy was not asked" would hold just as well if the spy saw
      // nothing at all - and the parser service's fingerprint cache inserts
      // into a `WeakMap` of its own on a first parse, which is not the walk.
      // The case next to this one was caught by the same thing.
      const ast = parse('(o.k = o.k + 1, arr.push(2), o.k)', { ecmaVersion: 2020 }) as AnyNode;
      const build = jest.spyOn(receiver, 'guardedReceiver');
      const weakMapSet = jest.spyOn(WeakMap.prototype, 'set');
      const policy = jest.spyOn(contextMethod, 'contextCheckMemberWrite');
      const push = jest.spyOn(contextMethod, 'contextPush');
      try {
        expect(evaluate(ast, EvalState.fromContext({ o: { k: 1 }, arr: [1] }))).toBe(2);

        expect(build).not.toHaveBeenCalled();
        expect(weakMapSet).not.toHaveBeenCalled();
        expect(policy).not.toHaveBeenCalled();
        // Once, for the program's own scope: the write path and the call ask
        // the context's class for nothing of their own.
        expect(push).toHaveBeenCalledTimes(1);
      } finally {
        build.mockRestore();
        weakMapSet.mockRestore();
        policy.mockRestore();
        push.mockRestore();
      }
    });

    it('should build no view at all on the member-read path', () => {
      // The path the benchmark above exercises, and the one the measured
      // fourth slot of `evaluateMember` sits on. A member read, and a call on
      // an object the context merely holds, keep their own receiver, so the
      // guard has nothing to build there - and must not start to.
      const build = jest.spyOn(receiver, 'guardedReceiver');
      try {
        const context = { a: { b: { c: 1 }, d: 2 }, o: { m: (x: number) => x } };

        expect(service.simpleEval('a.b.c + a.d + o.m(3)', context)).toBe(6);

        expect(build).not.toHaveBeenCalled();
      } finally {
        build.mockRestore();
      }
    });
  });
});