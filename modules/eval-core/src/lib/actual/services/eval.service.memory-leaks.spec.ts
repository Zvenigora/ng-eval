import { TestBed } from '@angular/core/testing';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { EvalService } from './eval.service';
import { ParserService } from './parser.service';
import { Registry, Cache } from '../../internal/classes/common';
import { EvalContext, EvalHooks, EvalState } from '../../internal/classes/eval';
import { AnyNode } from 'acorn';

describe('EvalService - Memory Leak Prevention', () => {
  let service: EvalService;
  let parserService: ParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    parserService = TestBed.inject(ParserService);
  });

  afterEach(() => {
    // Clean up after each test
    try {
      service.ngOnDestroy();
    } catch {
      // Ignore cleanup errors for destroyed services
    }
  });

  describe('Parser Cache Memory Management', () => {
    it('should not accumulate unbounded cache entries', () => {
      // Create a new parser with small cache size for testing
      const testParser = new ParserService();
      testParser.parserOptions = { ...testParser.parserOptions, cacheSize: 5 };
      // Force recreation of cache with new size
      (testParser as unknown as { _cache: Cache<AnyNode> })._cache = new Cache<AnyNode>(5);

      // Parse many different expressions to exceed cache size
      const expressions = [];
      for (let i = 0; i < 20; i++) {
        expressions.push(`${i} + ${i + 1}`);
      }

      expressions.forEach(expr => {
        testParser.parse(expr);
      });

      // Cache size should not exceed maxCacheSize
      const cache = (testParser as unknown as { _cache?: { size: number } })._cache;
      expect(cache?.size).toBeLessThanOrEqual(5);
    });

    it('should clean up cache on service destruction', () => {
      // Use the parser service to populate the cache first
      parserService.parse('1 + 2');
      parserService.parse('x * y');

      const cacheBeforeDestroy = (parserService as unknown as { _cache?: { size: number } })._cache;
      expect(cacheBeforeDestroy?.size).toBeGreaterThan(0);

      parserService.ngOnDestroy();

      const cacheAfterDestroy = (parserService as unknown as { _cache?: undefined })._cache;
      const intervalAfterDestroy = (parserService as unknown as { _cacheCleanupInterval?: undefined })._cacheCleanupInterval;
      expect(cacheAfterDestroy).toBeUndefined();
      expect(intervalAfterDestroy).toBeUndefined();
    });

    it('should throw error when using destroyed parser service', () => {
      parserService.ngOnDestroy();

      expect(() => {
        parserService.parse('1 + 2');
      }).toThrow('ParserService has been destroyed');
    });
  });

  describe('Context and State Cleanup', () => {
    it('should track and clean up active states', () => {
      const context = new Registry<string, string>();
      context.set('msg', 'hello');

      service.simpleEval('msg', context);

      const activeStatesBefore = (service as unknown as { _activeStates: { size: number } })._activeStates;
      expect(activeStatesBefore.size).toBeGreaterThan(0);

      service.ngOnDestroy();

      const activeStatesAfter = (service as unknown as { _activeStates: { size: number } })._activeStates;
      expect(activeStatesAfter.size).toBe(0);
    });

    /**
     * `ngOnDestroy` drained the value stack, the hook registry and the hook
     * bookkeeping, and skipped the trace - the largest thing on the
     * object. It survived only because `_activeStates.clear()` then dropped the
     * service's own reference, which is why this fixture **keeps a state**:
     * under the documented `createState` + repeated `eval` style the caller
     * holds it, and for that caller the method advertised as releasing memory
     * released everything except this.
     *
     * The state is built through `createState` and walked through `eval`
     * rather than through `simpleEval`, which builds its state internally and
     * hands nothing back - there would be no caller-held state to assert on.
     * The non-empty assertions are the precondition: without them every
     * assertion after the destroy passes on a state that never traced.
     */
    it('should drain a caller-held state\'s trace and counters on destroy', () => {
      // A bound of 3 against 7 pushes, so all three fields are non-empty
      // before the destroy - the flag included. At the default bound a 7-item
      // trace never truncates, and the assertion after the destroy would be a
      // no-op rather than a reset.
      const state = service.createState({ a: 10 }, { maxTraceItems: 3 });
      service.eval('2 + 3 * a', state);

      expect(state.result.trace.length).toEqual(3);
      expect(state.result.traceTruncated).toEqual(true);
      expect(state.result.tracePushCount).toEqual(7);

      service.ngOnDestroy();

      expect(state.result.trace.length).toEqual(0);
      expect(state.result.traceTruncated).toEqual(false);
      expect(state.result.tracePushCount).toEqual(0);
    });

    /**
     * `docs/backlog.md` A21. Every context destroy used to clear was one the
     * caller passed in - the argument, or its `context` key - never what
     * `fromContext` built from it. So destroy may drop the service's references,
     * and may not empty any of them: an
     * application's registries outlive a root injector torn down in tests, per
     * SSR request, or by a micro-frontend. `docs/a21/plan.md` names the wrong
     * implementation each case excludes.
     */
    describe('caller-owned contexts (A21)', () => {
      it('should leave a registry passed to createState intact, and still drain the state', () => {
        const registry = new Registry<string, number>([['a', 10]]);
        // A bound of 1 pins the trace's length, so the precondition below is
        // exact. The trace is non-empty at any bound; the drain after destroy is
        // the service-owned half of this case.
        const state = service.createState(registry, { maxTraceItems: 1 });

        expect(service.eval('a * 2', state)).toEqual(20);
        expect(state.result.trace.length).toEqual(1);

        service.ngOnDestroy();

        expect(registry.get('a')).toEqual(10);
        expect(registry.has('a')).toEqual(true);
        expect(state.result.trace.length).toEqual(0);
      });

      it('should leave a registry passed to simpleEval intact', () => {
        const registry = new Registry<string, number>([['a', 10]]);

        for (let i = 0; i < 3; i++) {
          expect(service.simpleEval('a + 1', registry)).toEqual(11);
        }

        service.ngOnDestroy();

        expect(registry.get('a')).toEqual(10);
      });

      it('should leave a registry nested under a context key intact', () => {
        const registry = new Registry<string, number>([['a', 10]]);
        service.createState({ context: registry });

        service.ngOnDestroy();

        expect(registry.get('a')).toEqual(10);
      });

      it('should not call clear on a caller object that is not a Registry', () => {
        const clear = jest.fn();
        const order = { type: 'order', clear, total: 10 };

        expect(service.simpleEval('total * 2', order)).toEqual(20);

        service.ngOnDestroy();

        expect(clear).not.toHaveBeenCalled();
      });

      it('should not call clear on a caller\'s EvalContext subclass', () => {
        const clear = jest.fn();
        class ClearableContext extends EvalContext {
          clear = clear;
        }
        const context = new ClearableContext({ a: 10 }, {});

        expect(service.simpleEval('a + 1', context)).toEqual(11);

        service.ngOnDestroy();

        expect(clear).not.toHaveBeenCalled();
      });
    });

    /**
     * `docs/backlog.md` A20. The service kept every context passed in, in a set
     * nothing read, until destroy. Retention has no behavioural surface short of
     * the collector, so these cases ask it: each context is built in a closure
     * that returns only a `WeakRef`, and a full GC runs before the assertion.
     *
     * **A8 is held out by hand.** Each state the service builds is in
     * `_activeStates` until destroy, and a state holds its context - so while
     * A8 stands, most contexts here are retained through their state however
     * this set is fixed. `collect` drops those references first. The control
     * case leaves them in place and observes the retention, which is what shows
     * the other cases are not vacuous. The `caseInsensitive` case leaves them
     * in place too, because there the state holds a copy. `docs/a20/plan.md`
     * names the wrong implementation each case excludes.
     */
    describe('contexts passed in are not retained (A20)', () => {
      // Jest has no `global.gc`. The flag exposes `gc` to contexts created
      // after it is set, and is cleared again at once so that the contexts
      // Jest builds for later suites do not get one.
      setFlagsFromString('--expose-gc');
      const gc = runInNewContext('gc') as () => void;
      setFlagsFromString('--no-expose-gc');

      const collect = async (ref: WeakRef<object>, dropStates = true): Promise<object | undefined> => {
        if (dropStates) {
          (service as unknown as { _activeStates: Set<EvalState> })._activeStates.clear();
        }
        // A `WeakRef` keeps its target alive until the job that created or
        // read it ends, so the collection has to happen in a later one.
        await new Promise((resolve) => setTimeout(resolve, 0));
        gc();
        return ref.deref();
      };

      const createStateRef = (): WeakRef<object> => {
        const registry = new Registry<string, number>([['a', 10]]);
        const state = service.createState(registry);
        expect(service.eval('a * 2', state)).toEqual(20);
        return new WeakRef(registry);
      };

      it('should not retain a registry passed to createState', async () => {
        expect(await collect(createStateRef())).toBeUndefined();
      });

      it('should not retain a registry passed to simpleEval', async () => {
        const ref = (() => {
          const registry = new Registry<string, number>([['a', 10]]);
          for (let i = 0; i < 3; i++) {
            expect(service.simpleEval('a + 1', registry)).toEqual(11);
          }
          return new WeakRef(registry);
        })();

        expect(await collect(ref)).toBeUndefined();
      });

      it('should not retain a registry nested under a context key', async () => {
        const ref = (() => {
          const registry = new Registry<string, number>([['a', 10]]);
          service.createState({ context: registry });
          return new WeakRef(registry);
        })();

        expect(await collect(ref)).toBeUndefined();
      });

      it('should not retain an EvalContext passed to simpleEval', async () => {
        const ref = (() => {
          const context = new EvalContext({ a: 10 }, {});
          expect(service.simpleEval('a + 1', context)).toEqual(11);
          return new WeakRef(context);
        })();

        expect(await collect(ref)).toBeUndefined();
      });

      /**
       * The case where the fix is observable while A8 stands, so A8's set is
       * left alone. Under `caseInsensitive`, `fromContext` copies a plain
       * object into a new `Registry`, and the state holds the copy. The set
       * added the caller's object itself, because it has a `type`, and so it
       * was the only thing keeping that object alive.
       */
      it('should not retain a caller object that only the set held', async () => {
        const ref = (() => {
          const order = { type: 'order', total: 10 };
          expect(service.simpleEval('total * 2', order, { caseInsensitive: true })).toEqual(20);
          return new WeakRef(order);
        })();

        expect(await collect(ref, false)).toBeUndefined();
      });

      it('should still retain the context through A8\'s state set', async () => {
        // The control. If A8 is fixed this goes red: delete it then, and the
        // `_activeStates` clear in `collect` with it.
        expect(await collect(createStateRef(), false)).toBeDefined();
      });
    });

    it('should throw error when using destroyed eval service', () => {
      service.ngOnDestroy();

      expect(() => {
        service.simpleEval('1 + 1');
      }).toThrow('EvalService has been destroyed');
    });

    it('should prevent evaluation after destruction', () => {
      service.ngOnDestroy();

      const context = new Registry<string, number>();
      context.set('x', 10);

      expect(() => {
        service.simpleEval('x * 2', context);
      }).toThrow('EvalService has been destroyed');
    });
  });

  describe('Repeated Operations Memory Stability', () => {
    it('should handle repeated evaluations without memory accumulation', () => {
      const context = new Registry<string, number>();

      // Perform many evaluations
      for (let i = 0; i < 50; i++) {
        context.set('value', i);
        const result = service.simpleEval('value * 2', context);
        expect(result).toBe(i * 2);
      }

      // Memory should be stable (hard to test directly, but shouldn't throw)
      expect(() => service.ngOnDestroy()).not.toThrow();
    });

    it('should handle repeated async evaluations', async () => {
      const context = new Registry<string, number>();

      // Perform many async evaluations
      for (let i = 0; i < 10; i++) {
        context.set('asyncValue', i);
        const result = await service.simpleEvalAsync('asyncValue + 1', context);
        expect(result).toBe(i + 1);
      }

      expect(() => service.ngOnDestroy()).not.toThrow();
    });

    it('should clean up complex nested object evaluations', () => {
      const nestedObject = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };

      const context = new Registry<string, typeof nestedObject>();
      context.set('nested', nestedObject);

      const result = service.simpleEval('nested.level1.level2.level3.value', context);
      expect(result).toBe('deep');

      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large arrays without memory leaks', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const context = new Registry<string, number[]>();
      context.set('largeArray', largeArray);

      const result = service.simpleEval('largeArray.length', context);
      expect(result).toBe(1000);

      // Should clean up without issues
      service.ngOnDestroy();
    });

    it('should handle objects with many properties', () => {
      const largeObject: Record<string, number> = {};
      for (let i = 0; i < 200; i++) {
        largeObject[`prop${i}`] = i;
      }

      const context = new Registry<string, Record<string, number>>();
      context.set('largeObject', largeObject);

      // Test accessing properties from the large object (memory leak test, not functionality test)
      const result = service.simpleEval('largeObject.prop0 + largeObject.prop199', context);
      expect(result).toBe(199); // 0 + 199 = 199

      // Should clean up without issues
      service.ngOnDestroy();
    });
  });

  describe('Hook Lifecycle Cleanup', () => {
    // `_hooks` is private and the getter that would reveal it allocates, which
    // is the thing these tests are checking does not happen. Reaching for the
    // field is the only non-destructive observation available.
    const registryOf = (state: EvalState): EvalHooks | undefined =>
      (state as unknown as { _hooks?: EvalHooks })._hooks;

    it('should release collected hook errors and the open-node stack on reset', () => {
      const state = service.createState({ a: 1 });
      state.hooks.on('before', 'Identifier', () => {
        throw new Error('boom');
      });

      service.eval('a', state);
      // A frame the walk never closed - the case § 3.6 documents as unsupported
      // and the one `ngOnDestroy` performs. Seeded directly because reaching it
      // through a visitor would depend on a defect rather than on this method.
      state.hookBookkeeping.open.push(parserService.parse('a') as AnyNode);

      expect(state.hookErrors.length).toBeGreaterThan(0);
      expect(state.hookBookkeeping.open.length).toBeGreaterThan(0);

      state.resetHookBookkeeping();

      expect(state.hookErrors.length).toBe(0);
      expect(state.hookBookkeeping.open.length).toBe(0);
    });

    it('should drop hook errors rather than keep the array alive after reset', () => {
      const state = service.createState({ a: 1 });
      state.hooks.on('before', 'Identifier', () => {
        throw new Error('boom');
      });
      service.eval('a', state);

      // The getter hands back the live array, so a consumer may be holding the
      // pre-reset one. Reset must not empty that array in place - a caller
      // reading `hookErrors` after a reset should see a new, empty record.
      const collected = state.hookErrors;
      expect(collected.length).toBeGreaterThan(0);

      state.resetHookBookkeeping();

      expect(collected.length).toBeGreaterThan(0);
      expect(state.hookErrors).not.toBe(collected);
      expect(state.hookErrors.length).toBe(0);
    });

    it('should clear registered hooks on destruction', () => {
      const state = service.createState({ a: 1 });
      const hooks = state.hooks;
      hooks.on('before', '*', () => undefined);
      hooks.onRead(() => undefined);

      expect(hooks.isActive).toBe(true);
      expect(hooks.hasReadHooks).toBe(true);

      service.ngOnDestroy();

      expect(hooks.isActive).toBe(false);
      expect(hooks.isEmpty).toBe(true);
      expect(hooks.hasReadHooks).toBe(false);
    });

    it('should clear a caller-owned registry that outlives the service', () => {
      // The retention `ngOnDestroy` exists to prevent: a long-lived registry
      // whose closure captures the state keeps that state reachable after the
      // service is gone. A state-owned registry dies with its state anyway.
      const hooks = new EvalHooks();
      const state = service.createState({ a: 1 }, { hooks });
      hooks.on('after', '*', () => state);

      service.ngOnDestroy();

      expect(hooks.isEmpty).toBe(true);
      expect(hooks.isActive).toBe(false);
    });

    it('should reset hook bookkeeping on destruction', () => {
      const state = service.createState({ a: 1 });
      state.hooks.on('before', 'Identifier', () => {
        throw new Error('boom');
      });
      service.eval('a', state);
      state.hookBookkeeping.open.push(parserService.parse('a') as AnyNode);

      expect(state.hookErrors.length).toBeGreaterThan(0);

      service.ngOnDestroy();

      expect(state.hookErrors.length).toBe(0);
      expect(state.hookBookkeeping.open.length).toBe(0);
    });

    it('should not build a hook registry for a state that never used hooks', () => {
      const state = service.createState({ a: 1 });
      service.eval('a', state);

      expect(registryOf(state)).toBeUndefined();

      service.ngOnDestroy();

      // Touching `state.hooks` during teardown would allocate a registry inside
      // the method whose job is releasing memory.
      expect(registryOf(state)).toBeUndefined();
    });
  });
});
