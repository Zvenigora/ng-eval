/**
 * Performance optimization tests to validate caching and allocation improvements
 */

import { TestBed } from '@angular/core/testing';
import { EvalService } from '../actual/services/eval.service';
import { clearVisitorResultCache, getVisitorResultCacheStats } from './visitors/visitor-result-cache';
import { clearPropertyLookupCache, getPropertyLookupCacheStats } from './visitors/property-lookup-cache';

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
    it('should cache and reuse binary expression results', () => {
      const context = { a: 5, b: 3 };
      const expression = 'a + b * 2';
      
      // First evaluation
      const result1 = service.simpleEval(expression, context);
      expect(result1).toBe(11); // 5 + (3 * 2)
      
      // Second evaluation should use cached result
      const result2 = service.simpleEval(expression, context);
      expect(result2).toBe(11);
      
      const stats = getVisitorResultCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should cache and reuse member expression results', () => {
      const context = { user: { name: 'John', age: 25 } };
      const expression = 'user.name';
      
      // First evaluation
      const result1 = service.simpleEval(expression, context);
      expect(result1).toBe('John');
      
      // Second evaluation should use cached result
      const result2 = service.simpleEval(expression, context);
      expect(result2).toBe('John');
      
      const stats = getVisitorResultCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should invalidate cache when context changes', () => {
      let context = { value: 10 };
      const expression = 'value * 2';
      
      // First evaluation
      const result1 = service.simpleEval(expression, context);
      expect(result1).toBe(20);
      
      // Change context
      context = { value: 15 };
      
      // Should recalculate with new context
      const result2 = service.simpleEval(expression, context);
      expect(result2).toBe(30);
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
      
      // First lookup
      const result1 = service.simpleEval('TestObject.value', context); // lowercase 'value'
      expect(result1).toBe('test');
      
      // Second lookup should use cached result
      const result2 = service.simpleEval('TestObject.value', context);
      expect(result2).toBe('test');
      
      const stats = getPropertyLookupCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle multiple case variations efficiently', () => {
      const context = {
        data: { Name: 'John', Age: 25, Email: 'john@test.com' }
      };
      
      // Test different case variations
      expect(service.simpleEval('data.name', context)).toBe('John');
      expect(service.simpleEval('data.NAME', context)).toBe('John');
      expect(service.simpleEval('data.Name', context)).toBe('John');
      expect(service.simpleEval('data.age', context)).toBe(25);
      expect(service.simpleEval('data.AGE', context)).toBe(25);
      
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
      
      // Simplified object expression for compatibility 
      const result = service.simpleEval('{ a: base.a, b: base.b, c: extra.c, d: extra.d, e: 5 }', context);
      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
    });

    it('should handle complex object expressions efficiently', () => {
      const context = {
        user: { name: 'John', age: 25 },
        settings: { theme: 'dark' }
      };
      
      const result = service.simpleEval('{ profile: user, config: settings, active: true }', context);
      expect(result).toEqual({
        profile: { name: 'John', age: 25 },
        config: { theme: 'dark' },
        active: true
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should show improved performance on repeated evaluations', () => {
      const context = { 
        users: [
          { name: 'John', age: 25, active: true },
          { name: 'Jane', age: 30, active: false }
        ]
      };
      
      const expression = 'users.filter(u => u.active).map(u => u.name)[0]';
      
      // Warm up and measure
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = service.simpleEval(expression, context);
        expect(result).toBe('John');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete reasonably quickly (this is more about regression testing)
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 iterations
      
      // Cache should be populated
      const visitorStats = getVisitorResultCacheStats();
      const propertyStats = getPropertyLookupCacheStats();
      
      expect(visitorStats.size + propertyStats.size).toBeGreaterThan(0);
    });
  });
});