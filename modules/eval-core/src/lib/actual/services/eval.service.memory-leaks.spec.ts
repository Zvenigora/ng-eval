import { TestBed } from '@angular/core/testing';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { EvalService } from './eval.service';
import { ParserService } from './parser.service';
import { Registry, Cache } from '../../internal/classes/common';
import { EvalContext, EvalHooks, EvalState } from '../../internal/classes/eval';
import { evaluate } from '../../internal/functions';
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
    // Jest has no `global.gc`. The flag exposes `gc` to contexts created
    // after it is set, and is cleared again at once so that the contexts
    // Jest builds for later suites do not get one.
    setFlagsFromString('--expose-gc');
    const gc = runInNewContext('gc') as () => void;
    setFlagsFromString('--no-expose-gc');

    const activeStates = (): Set<EvalState> =>
      (service as unknown as { _activeStates: Set<EvalState> })._activeStates;

    const collect = async (ref: WeakRef<object>, dropStates = true): Promise<object | undefined> => {
      if (dropStates) {
        activeStates().clear();
      }
      // A `WeakRef` keeps its target alive until the job that created or
      // read it ends, so the collection has to happen in a later one.
      await new Promise((resolve) => setTimeout(resolve, 0));
      gc();
      return ref.deref();
    };

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
     * **A8 is held out by hand, for `createState` only.** Each state
     * `createState` builds is in `_activeStates` until destroy, and a state
     * holds its context - so while A8's second half stands, a context passed
     * to `createState` is retained through its state however this set is
     * fixed. `collect` drops those references first. The control case leaves
     * them in place and observes the retention, which is what shows the other
     * cases are not vacuous. The `simpleEval` cases and the `caseInsensitive`
     * case leave them in place too: `simpleEval` keeps no state since A8's
     * first step, and under `caseInsensitive` the state holds a copy.
     * `docs/a20/plan.md` names the wrong implementation each case excludes.
     */
    describe('contexts passed in are not retained (A20)', () => {
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

        // With A8's set intact since `docs/a8/plan.md` step 1 (its 1.1).
        expect(await collect(ref, false)).toBeUndefined();
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

        // With A8's set intact since `docs/a8/plan.md` step 1 (its 1.2).
        expect(await collect(ref, false)).toBeUndefined();
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
        // The control. A8's first step left it green, because it goes through
        // `createState`, not `simpleEval`. `docs/a8/plan.md`'s step 2, the
        // `createState` half, is the change that turns it red: revisit it
        // then, and the `_activeStates` clear in `collect` with it.
        expect(await collect(createStateRef(), false)).toBeDefined();
      });
    });

    /**
     * `docs/backlog.md` A8, first step. `simpleEval` and `simpleEvalAsync`
     * build a state the caller never receives, and the service kept each one
     * in `_activeStates` until destroy - with its context, its AST and its
     * trace. The set now holds such a state for the length of the call and no
     * longer. `createState` is `docs/a8/plan.md`'s step 2, and still tracks.
     *
     * The retention cases leave the set intact and ask the collector, as A20's
     * do: a state holds its context, so a collected context means no state the
     * service holds refers to it. Criterion numbers are the plan's.
     */
    describe('states simpleEval builds are not retained (A8)', () => {
      const throwing = (): Registry<string, unknown> =>
        new Registry<string, unknown>([['boom', () => { throw new Error('boom'); }]]);

      const rejecting = (): Registry<string, unknown> =>
        new Registry<string, unknown>([['fail', () => Promise.reject(new Error('fail'))]]);

      it('should not retain a state whose walk threw (1.3)', async () => {
        // No closure over the registry, and the error is dropped here
        // (`docs/backlog.md` A19, "It has a known failure mode"). Under
        // `expect(() => service.simpleEval(..., registry)).toThrow()` the
        // errors capture a frame of that arrow, whose context holds the
        // registry, and under load something on Jest's path kept one alive:
        // that form failed 4 times in 32 contended full-suite runs, with the
        // service's set empty each time. This form failed in none of 64.
        const ref = (() => {
          const registry = throwing();
          let message: string | undefined;
          try {
            service.simpleEval('boom()', registry);
          } catch (error) {
            message = (error as Error).message;
          }
          expect(message).toContain('boom');
          return new WeakRef(registry);
        })();

        expect(await collect(ref, false)).toBeUndefined();
      });

      it('should not retain a state simpleEvalAsync built (1.4)', async () => {
        const ref = await (async () => {
          const registry = new Registry<string, number>([['a', 10]]);
          expect(await service.simpleEvalAsync('a + 1', registry)).toEqual(11);
          return new WeakRef(registry);
        })();

        expect(await collect(ref, false)).toBeUndefined();
      });

      it('should not retain a state whose simpleEvalAsync promise rejected (1.5)', async () => {
        // 1.3's form, for 1.3's reason: the rejection is an error created by
        // a function called on the registry, so it is caught here and only its
        // message is kept, rather than handed to Jest's `rejects.toThrow`.
        const ref = await (async () => {
          const registry = rejecting();
          let message: string | undefined;
          try {
            await service.simpleEvalAsync('fail()', registry);
          } catch (error) {
            message = (error as Error).message;
          }
          expect(message).toContain('fail');
          return new WeakRef(registry);
        })();

        expect(await collect(ref, false)).toBeUndefined();
      });

      it('should leave nothing in the set after either form, on any exit, and still track createState (1.6)', async () => {
        service.simpleEval('a + 1', { a: 10 });
        expect(() => service.simpleEval('boom()', throwing())).toThrow('boom');
        expect(await service.simpleEvalAsync('a + 1', { a: 10 })).toEqual(11);
        await expect(service.simpleEvalAsync('fail()', rejecting())).rejects.toThrow('fail');

        expect(activeStates().size).toEqual(0);

        // The control: the half this step leaves alone still tracks, so the
        // zero above is not a set that no longer fills at all.
        service.createState({ a: 10 });

        expect(activeStates().size).toEqual(1);

        service.ngOnDestroy();

        expect(activeStates().size).toEqual(0);
      });

      it('should not clear a registry that only simpleEval states adopted (1.7)', () => {
        const hooks = new EvalHooks();
        const seen: string[] = [];
        hooks.on('before', 'Identifier', (event) => {
          seen.push((event.node as { name: string }).name);
        });

        expect(service.simpleEval('a + 1', { a: 10 }, { hooks })).toEqual(11);

        service.ngOnDestroy();

        // Destroy no longer reaches this registry: the state that adopted it
        // left the service when the call returned. `docs/a8/plan.md` § 2.2 on
        // why that is not a gap.
        expect(hooks.isEmpty).toBe(false);
        expect(hooks.isActive).toBe(true);

        // And it still dispatches, which a registry `clear` had emptied would
        // not. Walked outside the destroyed service.
        evaluate(parserService.parse('b') as AnyNode, EvalState.fromContext({ b: 1 }, { hooks }));

        expect(seen).toEqual(['a', 'b']);
      });

      it('should still build the state through createState (1.8)', async () => {
        const createState = jest.spyOn(service, 'createState');

        service.simpleEval('1 + 1');
        await service.simpleEvalAsync('1 + 1');

        expect(createState).toHaveBeenCalledTimes(2);

        createState.mockRestore();
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

  /**
   * `docs/backlog.md` A17 and B3. The drains share one `try` per state, so a
   * throw skips every drain after it. Two of them reach objects the caller
   * owns - the trace, whose getter hands out the live array, and an adopted
   * registry - and they now run last, the registry first. A caller who froze
   * the trace makes `clearTrace` throw; that must cost the caller's own trace
   * and nothing else, silently. Criterion numbers are `docs/a8/plan.md`'s.
   */
  describe('a drain that throws (A17, B3)', () => {
    // A state with a hook registered, collected hook errors, a frame left
    // open and a frozen, non-empty trace. Freezing an empty array would not
    // make `length = 0` throw, hence the precondition.
    const frozenState = (): EvalState => {
      const state = service.createState({ a: 1 });
      state.hooks.on('before', 'Identifier', () => {
        throw new Error('boom');
      });
      service.eval('a', state);
      state.hookBookkeeping.open.push(parserService.parse('a') as AnyNode);

      expect(state.result.trace.length).toBeGreaterThan(0);
      expect(state.hookErrors.length).toBeGreaterThan(0);

      Object.freeze(state.result.trace);
      return state;
    };

    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => warn.mockRestore());

    it('should clear the hooks when the trace drain throws (3.1)', () => {
      const state = frozenState();
      const hooks = state.hooks;

      service.ngOnDestroy();

      // The drain did throw: the frozen trace is untouched.
      expect(state.result.trace.length).toBeGreaterThan(0);
      expect(hooks.isEmpty).toBe(true);
      expect(hooks.isActive).toBe(false);
    });

    it('should reset the hook bookkeeping when the trace drain throws (3.2)', () => {
      const state = frozenState();

      service.ngOnDestroy();

      expect(state.result.trace.length).toBeGreaterThan(0);
      expect(state.hookErrors.length).toBe(0);
      expect(state.hookBookkeeping.open.length).toBe(0);
    });

    it('should go on to drain the next state (3.3)', () => {
      const frozen = frozenState();
      const next = service.createState({ a: 1 });
      service.eval('a + 1', next);

      expect(next.result.trace.length).toBeGreaterThan(0);

      service.ngOnDestroy();

      expect(frozen.result.trace.length).toBeGreaterThan(0);
      expect(next.result.trace.length).toBe(0);
    });

    it('should not log the throw (3.4)', () => {
      const state = frozenState();
      const clearTrace = jest.spyOn(state.result, 'clearTrace');

      service.ngOnDestroy();

      // Not vacuous: the drain reached `clearTrace` and it threw, so the catch
      // ran. A non-empty trace alone would not show it - a state the drain
      // never reached keeps its trace too.
      expect(clearTrace.mock.results.map((result) => result.type)).toEqual(['throw']);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
