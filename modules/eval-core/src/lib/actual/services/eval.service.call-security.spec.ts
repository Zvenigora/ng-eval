import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';

describe('EvalService - Call Expression Security', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  describe('Dangerous function blocking', () => {
    const dangerousFunctions = [
      { name: 'eval', func: eval },
      { name: 'Function', func: Function },
      { name: 'setTimeout', func: setTimeout },
      { name: 'setInterval', func: setInterval },
    ];

    // Test functions that exist in the environment
    dangerousFunctions.forEach(({ name, func }) => {
      it(`should block direct call to ${name}`, () => {
        const context = { [name]: func };
        expect(() => {
          service.simpleEval(`${name}('console.log("test")')`, context);
        }).toThrow(/Function call blocked for security reasons/);
      });
    });

    // Test functions that might not exist but should still be blocked if provided
    it('should block require if provided', () => {
      // Mock require function
      const mockRequire = (module: string) => ({ module });
      const context = { require: mockRequire };
      expect(() => {
        service.simpleEval('require("fs")', context);
      }).toThrow(/Function call blocked for security reasons/);
    });

    it('should block import if provided', () => {
      // Mock import function  
      const mockImport = async (module: string) => Promise.resolve({ module });
      const context = { import: mockImport };
      expect(() => {
        service.simpleEval('import("./module")', context);
      }).toThrow(/Function call blocked for security reasons/);
    });

    it('should block importScripts if provided', () => {
      // Mock importScripts function
      const mockImportScripts = (...urls: string[]) => { console.log('Mock import', urls); };
      const context = { importScripts: mockImportScripts };
      expect(() => {
        service.simpleEval('importScripts("script.js")', context);
      }).toThrow(/Function call blocked for security reasons/);
    });
  });

  describe('Safe function calls', () => {
    const safeFunctions = {
      add: (a: number, b: number) => a + b,
      multiply: (a: number, b: number) => a * b,
      greet: (name: string) => `Hello, ${name}!`,
      isArray: Array.isArray,
      parseInt: parseInt,
      parseFloat: parseFloat,
    };

    it.each([
      ['add(5, 3)', 8],
      ['multiply(4, 6)', 24],
      ['greet("World")', 'Hello, World!'],
      ['isArray([1, 2, 3])', true],
      ['isArray("test")', false],
      ['parseInt("42")', 42],
      ['parseFloat("3.14")', 3.14],
    ])('should allow safe function call: %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression, safeFunctions);
      expect(result).toBe(expected);
    });
  });

  describe('Method calls on objects', () => {
    const context = {
      str: 'hello world',
      arr: [1, 2, 3, 4, 5],
      obj: {
        name: 'test',
        getValue: function() { return this.name; },
        calculate: function(x: number, y: number) { return x * y; }
      }
    };

    it.each([
      ['str.toUpperCase()', 'HELLO WORLD'],
      ['str.charAt(1)', 'e'],
      ['str.slice(0, 5)', 'hello'],
      ['arr.length', 5],
      ['arr.slice(1, 3)', [2, 3]],
      ['arr.indexOf(3)', 2],
      ['obj.getValue()', 'test'],
      ['obj.calculate(6, 7)', 42],
    ])('should allow safe method call: %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression, context);
      if (Array.isArray(expected)) {
        expect(result).toEqual(expected);
      } else {
        expect(result).toBe(expected);
      }
    });
  });

  describe('Optional chaining', () => {
    const context = {
      obj: { prop: { method: () => 'success' } },
      nullObj: null,
      undefinedObj: undefined,
    };

    it('should handle optional call on existing method', () => {
      const result = service.simpleEval('obj.prop.method?.()', context);
      expect(result).toBe('success');
    });

    it('should handle optional call on null', () => {
      const result = service.simpleEval('nullObj?.method?.()', context);
      expect(result).toBeUndefined();
    });

    it('should handle optional call on undefined', () => {
      const result = service.simpleEval('undefinedObj?.method?.()', context);
      expect(result).toBeUndefined();
    });
  });

  describe('Constructor function blocking', () => {
    it('should block Function constructor', () => {
      const context = { Function };
      expect(() => {
        service.simpleEval('new Function("return 1")()', context);
      }).toThrow(/Constructor blocked for security reasons/);
    });

    it('should block accessing constructor property', () => {
      expect(() => {
        service.simpleEval('({}).__proto__.constructor("alert(1)")()');
      }).toThrow(); // Should throw due to security checks or access issues
    });
  });

  describe('Error handling', () => {
    const testError = new Error('Test error');
    const context = {
      throwError: () => { throw testError; },
      notAFunction: 'not a function',
    };

    it('should handle function that throws error', () => {
      // Up to eval-core 0.6.x `safeCall` re-raised this as a new `Error`, its
      // message "Test error" behind a fixed prefix. Since 0.7.0 the callee's
      // own error leaves the call, by decision (`docs/backlog-retired.md` A6).
      let thrown: unknown;
      try {
        service.simpleEval('throwError()', context);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(testError);
      expect((thrown as Error).message).toBe('Test error');
    });

    it('should keep the class of a custom error thrown through a native call', () => {
      // Two call frames: the native `map`, and `fail` inside the arrow it
      // calls. Each used to re-raise, so the class was gone twice over.
      class RuleError extends Error {
        readonly code = 'E_RULE';
      }
      const ruleError = new RuleError('rule failed');
      let thrown: unknown;

      try {
        service.simpleEval('[1].map(x => fail(x))', { fail: () => { throw ruleError; } });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(RuleError);
      expect(thrown).toBe(ruleError);
      expect((thrown as RuleError).code).toBe('E_RULE');
    });

    it('should keep the class of a custom error thrown by a constructor', () => {
      // `new` re-raised a constructor's error the same way `safeCall` did, and
      // the same decision covers it. A plain function rather than a `class`:
      // the constructor guard rejects a source containing "constructor(".
      class RuleError extends Error {
        readonly code = 'E_RULE';
      }
      const ruleError = new RuleError('construction failed');
      const Failing = function () { throw ruleError; };
      let thrown: unknown;

      try {
        service.simpleEval('new Failing()', { Failing });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(RuleError);
      expect(thrown).toBe(ruleError);
      expect((thrown as RuleError).code).toBe('E_RULE');
    });

    it('should handle attempt to call non-function', () => {
      expect(() => {
        service.simpleEval('notAFunction()', context);
      }).toThrow(/Value is not a function: string/);
    });

    it('should handle attempt to call undefined', () => {
      expect(() => {
        service.simpleEval('nonExistent()');
      }).toThrow(/Cannot call undefined or null function/);
    });
  });

  describe('Built-in function safety', () => {
    const context = {
      Math,
      Date,
      JSON,
      Object: {
        keys: Object.keys,
        values: Object.values,
        entries: Object.entries,
      }
    };

    it.each([
      ['Math.max(1, 2, 3)', 3],
      ['Math.min(1, 2, 3)', 1],
      ['Math.round(3.7)', 4],
      ['JSON.stringify({a: 1})', '{"a":1}'],
      ['JSON.parse(\'{"b": 2}\').b', 2],
      ['Object.keys({x: 1, y: 2})', ['x', 'y']],
      ['new Date(2023, 0, 1).getFullYear()', 2023],
    ])('should allow safe built-in function: %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression, context);
      if (Array.isArray(expected)) {
        expect(result).toEqual(expected);
      } else {
        expect(result).toBe(expected);
      }
    });
  });
});