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

    const collect = async (ref: WeakRef<object>): Promise<object | undefined> => {
      // A `WeakRef` keeps its target alive until the job that created or
      // read it ends, so the collection has to happen in a later one.
      await new Promise((resolve) => setTimeout(resolve, 0));
      gc();
      return ref.deref();
    };

    /**
     * `docs/backlog.md` A8, second step (`docs/a8/step-2-plan.md` 2.4). A state
     * from `createState` is the caller's, and destroy changes nothing on it.
     * This inverts A12's case, which pinned destroy draining the trace: the
     * service no longer holds the state, so there is nothing for it to drain,
     * and a caller who wants the trace emptied calls `clearTrace()`.
     *
     * The non-empty assertions are the precondition: without them the
     * assertions after the destroy would pass on a state that never traced,
     * and equally on one a drain had emptied.
     */
    it('should leave a caller-held state\'s trace and counters as they were on destroy (2.4)', () => {
      // A bound of 3 against 7 pushes, so all three fields are non-default
      // before the destroy - the flag included - and a drain would reset each.
      const state = service.createState({ a: 10 }, { maxTraceItems: 3 });
      service.eval('2 + 3 * a', state);

      expect(state.result.trace.length).toEqual(3);
      expect(state.result.traceTruncated).toEqual(true);
      expect(state.result.tracePushCount).toEqual(7);

      service.ngOnDestroy();

      expect(state.result.trace.length).toEqual(3);
      expect(state.result.traceTruncated).toEqual(true);
      expect(state.result.tracePushCount).toEqual(7);
    });

    /**
     * `docs/backlog.md` A21. Every context destroy used to clear was one the
     * caller passed in - the argument, or its `context` key - never what
     * `fromContext` built from it. So destroy may drop the service's references,
     * and may not empty any of them: an
     * application's registries outlive a root injector torn down in tests, per
     * SSR request, or by a micro-frontend. `docs/a21/plan.md` names the wrong
     * implementation each case excludes. Since A8's second step the service
     * keeps nothing at all, so destroy leaves the state alone too.
     */
    describe('caller-owned contexts (A21)', () => {
      it('should leave a registry passed to createState intact, and the state as it was (2.5)', () => {
        const registry = new Registry<string, number>([['a', 10]]);
        // A bound of 1 pins the trace's length, so the precondition below is
        // exact, and a drain would take it to 0.
        const state = service.createState(registry, { maxTraceItems: 1 });

        expect(service.eval('a * 2', state)).toEqual(20);
        expect(state.result.trace.length).toEqual(1);

        service.ngOnDestroy();

        expect(registry.get('a')).toEqual(10);
        expect(registry.has('a')).toEqual(true);
        expect(state.result.trace.length).toEqual(1);
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
     * Nothing is held out by hand any more. Until A8's second step every state
     * `createState` built was kept until destroy, with its context, so these
     * cases cleared that set before collecting and a control case observed
     * the retention. The service now keeps no state, so every case runs on the
     * service as it is. The control became a positive one (2.3): a context
     * whose state the test still holds is not collected, which is what shows
     * the others are not vacuous. `docs/a20/plan.md` and `docs/a8/step-2-plan.md`
     * name the wrong implementation each case excludes.
     */
    describe('contexts passed in are not retained (A20)', () => {
      const createStateRef = (): WeakRef<object> => {
        const registry = new Registry<string, number>([['a', 10]]);
        const state = service.createState(registry);
        expect(service.eval('a * 2', state)).toEqual(20);
        return new WeakRef(registry);
      };

      it('should not retain a registry passed to createState (2.1)', async () => {
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

        // `docs/a8/plan.md`'s 1.1.
        expect(await collect(ref)).toBeUndefined();
      });

      it('should not retain a registry nested under a context key (2.2)', async () => {
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

        // `docs/a8/plan.md`'s 1.2.
        expect(await collect(ref)).toBeUndefined();
      });

      /**
       * The case where A20's fix was observable while A8 stood. Under
       * `caseInsensitive`, `fromContext` copies a plain object into a new
       * `Registry`, and the state holds the copy. The set added the caller's
       * object itself, because it has a `type`, and so it was the only thing
       * keeping that object alive.
       */
      it('should not retain a caller object that only the set held', async () => {
        const ref = (() => {
          const order = { type: 'order', total: 10 };
          expect(service.simpleEval('total * 2', order, { caseInsensitive: true })).toEqual(20);
          return new WeakRef(order);
        })();

        expect(await collect(ref)).toBeUndefined();
      });

      it('should still see a context whose state the caller holds (2.3)', async () => {
        // The instrument's only guard. A `collect` that reports everything
        // collected turns this case alone red (`docs/a8/step-2-plan.md` § 6).
        // Without it, all eight retention cases would pass vacuously.
        //
        // The positive control, which replaced the one that observed A8's set
        // retaining this context. The same fixture as 2.1, except that the
        // state leaves the closure and is held past `collect`: the context is
        // reachable, so it must still be there. Without this, 2.1 and 2.2
        // could not tell a collector that works from a fixture that frees
        // everything.
        let held: EvalState | undefined;
        const ref = (() => {
          const registry = new Registry<string, number>([['a', 10]]);
          held = service.createState(registry);
          expect(service.eval('a * 2', held)).toEqual(20);
          return new WeakRef(registry);
        })();

        expect(await collect(ref)).toBeDefined();
        expect(held?.context).toBeDefined();
      });
    });

    /**
     * `docs/backlog.md` A8, first step. `simpleEval` and `simpleEvalAsync`
     * build a state the caller never receives, and the service kept each one
     * until destroy - with its context, its AST and its trace. The first step
     * released it when the call returned; the second step removed the set, so
     * the service keeps no state at all.
     *
     * The retention cases ask the collector, as A20's do: a state holds its
     * context, so a collected context means nothing the service holds refers
     * to it. Criterion numbers are `docs/a8/plan.md`'s.
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

        expect(await collect(ref)).toBeUndefined();
      });

      it('should not retain a state simpleEvalAsync built (1.4)', async () => {
        const ref = await (async () => {
          const registry = new Registry<string, number>([['a', 10]]);
          expect(await service.simpleEvalAsync('a + 1', registry)).toEqual(11);
          return new WeakRef(registry);
        })();

        expect(await collect(ref)).toBeUndefined();
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

        expect(await collect(ref)).toBeUndefined();
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
        // left the service when the call returned, and since A8's second step
        // the service keeps no state at all. `docs/a8/plan.md` § 2.2 weighs the
        // trade; 2.7 is the same for `createState`.
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

    it('should throw from createState and simpleEvalAsync after destruction (2.10)', () => {
      // The flag is all `ngOnDestroy` still does, and its JSDoc names all three
      // entry points. The two cases above reach it through `simpleEval` only.
      // `simpleEvalAsync` is not `async`, so the throw is synchronous.
      service.ngOnDestroy();

      expect(() => service.createState({ a: 1 })).toThrow('EvalService has been destroyed');
      expect(() => service.simpleEvalAsync('1 + 1')).toThrow('EvalService has been destroyed');
    });
  });

  describe('Repeated Operations', () => {
    it('should evaluate repeatedly against a changing registry', () => {
      const context = new Registry<string, number>();

      // Perform many evaluations
      for (let i = 0; i < 50; i++) {
        context.set('value', i);
        const result = service.simpleEval('value * 2', context);
        expect(result).toBe(i * 2);
      }
    });

    it('should handle repeated async evaluations, then destroy without throwing', async () => {
      const context = new Registry<string, number>();

      // Perform many async evaluations
      for (let i = 0; i < 10; i++) {
        context.set('asyncValue', i);
        const result = await service.simpleEvalAsync('asyncValue + 1', context);
        expect(result).toBe(i + 1);
      }

      // The one "destroy does not throw" guard these cases keep
      // (`docs/backlog.md` A22). It stands against a drain reintroduced without
      // its per-state `catch` (A17). It sits here because the async form is the
      // one whose state is written again when the promise settles.
      expect(() => service.ngOnDestroy()).not.toThrow();
    });

    it('should read a deeply nested object', () => {
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
    });
  });

  describe('Large Data Handling', () => {
    it('should read the length of a large array', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const context = new Registry<string, number[]>();
      context.set('largeArray', largeArray);

      const result = service.simpleEval('largeArray.length', context);
      expect(result).toBe(1000);
    });

    it('should handle objects with many properties', () => {
      const largeObject: Record<string, number> = {};
      for (let i = 0; i < 200; i++) {
        largeObject[`prop${i}`] = i;
      }

      const context = new Registry<string, Record<string, number>>();
      context.set('largeObject', largeObject);

      const result = service.simpleEval('largeObject.prop0 + largeObject.prop199', context);
      expect(result).toBe(199); // 0 + 199 = 199
    });
  });

  describe('Hook Lifecycle Cleanup', () => {
    // `_hooks` is private and the getter that would reveal it allocates, which
    // is the thing the case below checks does not happen. Reaching for the
    // field is the only non-destructive observation available.
    const registryOf = (state: EvalState): EvalHooks | undefined =>
      (state as unknown as { _hooks?: EvalHooks })._hooks;

    it('should release collected hook errors and the open-node stack on reset', () => {
      const state = service.createState({ a: 1 });
      state.hooks.on('before', 'Identifier', () => {
        throw new Error('boom');
      });

      service.eval('a', state);
      // A frame the walk never closed - the case § 3.6 documents as unsupported,
      // and the one `resetHookBookkeeping` exists for. Seeded directly because
      // reaching it through a visitor would depend on a defect rather than on
      // this method.
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

    /**
     * `docs/backlog.md` A8, second step (`docs/a8/step-2-plan.md` 2.6-2.8).
     * From 0.3.0 to 0.5.0 destroy cleared the registry and reset the
     * bookkeeping of every state `createState` had handed back, and these three
     * cases pinned that. The service no longer keeps those states, so destroy
     * reaches none of them: the registrations and the bookkeeping are the
     * caller's to release, with the unsubscribe `on` returns, `hooks.clear()`
     * or `resetHookBookkeeping()`.
     */
    it('should leave registered hooks in place on destruction (2.6)', () => {
      const state = service.createState({ a: 1 });
      const hooks = state.hooks;
      const seen: string[] = [];
      hooks.on('before', 'Identifier', (event) => {
        seen.push((event.node as { name: string }).name);
      });
      hooks.onRead(() => undefined);

      expect(hooks.isActive).toBe(true);
      expect(hooks.hasReadHooks).toBe(true);

      service.ngOnDestroy();

      expect(hooks.isActive).toBe(true);
      expect(hooks.isEmpty).toBe(false);
      expect(hooks.hasReadHooks).toBe(true);

      // And it still dispatches. `eval` does not check the destroyed flag.
      service.eval('a', state);

      expect(seen).toEqual(['a']);
    });

    it('should not clear a caller-owned registry that outlives the service (2.7)', () => {
      // The fixture of the promise 0.3.0 to 0.5.0 published and this step
      // withdrew: a long-lived registry whose closure captures the state keeps
      // that state reachable after the service is gone. The registry is the
      // caller's, and so is releasing it.
      const hooks = new EvalHooks();
      const state = service.createState({ a: 1 }, { hooks });
      hooks.on('after', '*', () => state);

      expect(hooks.isEmpty).toBe(false);

      service.ngOnDestroy();

      expect(hooks.isEmpty).toBe(false);
      expect(hooks.isActive).toBe(true);
    });

    it('should leave hook bookkeeping as it was on destruction (2.8)', () => {
      const state = service.createState({ a: 1 });
      state.hooks.on('before', 'Identifier', () => {
        throw new Error('boom');
      });
      service.eval('a', state);
      state.hookBookkeeping.open.push(parserService.parse('a') as AnyNode);

      // Non-empty first, or a reset would be indistinguishable from nothing.
      const errors = state.hookErrors.length;
      const open = state.hookBookkeeping.open.length;
      expect(errors).toBeGreaterThan(0);
      expect(open).toBeGreaterThan(0);

      service.ngOnDestroy();

      expect(state.hookErrors.length).toBe(errors);
      expect(state.hookBookkeeping.open.length).toBe(open);
    });

    it('should not build a hook registry for a state that never used hooks', () => {
      // The walk's own guards - `hasHooks` in the visitors and in `evaluate` -
      // keep a hookless walk off `state.hooks`, whose getter builds a registry
      // on first access. Nothing else observes this: `hasHooks` is `false` for
      // an empty registry too, and the performance gate's margin would not see
      // the allocation. Until A8's second step this case also asserted that
      // destroy allocated none. With no drain, that half had no code under
      // test, and it was dropped (`docs/a8/step-2-plan.md` § 4).
      const state = service.createState({ a: 1 });
      service.eval('a', state);

      expect(registryOf(state)).toBeUndefined();
    });
  });
});
