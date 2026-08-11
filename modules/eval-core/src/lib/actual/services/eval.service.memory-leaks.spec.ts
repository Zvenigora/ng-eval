import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { ParserService } from './parser.service';
import { Registry, Cache } from '../../internal/classes/common';
import { EvalHooks, EvalState } from '../../internal/classes/eval';
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
    it('should track and clean up active contexts', () => {
      const context = new Registry<string, number>();
      context.set('value', 123);

      service.simpleEval('value', context);

      const activeContexts = (service as unknown as { _activeContexts: { size: number } })._activeContexts;
      expect(activeContexts.size).toBeGreaterThan(0);

      service.ngOnDestroy();

      const activeContextsAfter = (service as unknown as { _activeContexts: { size: number } })._activeContexts;
      expect(activeContextsAfter.size).toBe(0);
    });

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
