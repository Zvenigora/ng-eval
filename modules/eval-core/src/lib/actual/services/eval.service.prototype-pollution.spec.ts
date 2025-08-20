import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';

describe('EvalService - Prototype Pollution Prevention', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  describe('Direct Property Access Attacks', () => {
    it('should block access to __proto__ property', () => {
      expect(() => {
        service.simpleEval('obj.__proto__', { obj: {} });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should block access to constructor property', () => {
      expect(() => {
        service.simpleEval('obj.constructor', { obj: {} });
      }).toThrow(/Access to dangerous property "constructor" is blocked for security reasons/);
    });

    it('should block access to prototype property', () => {
      expect(() => {
        service.simpleEval('func.prototype', { func: function() {} });
      }).toThrow(/Access to dangerous property "prototype" is blocked for security reasons/);
    });

    it('should block access to dangerous methods', () => {
      const dangerousMethods = [
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__'
      ];

      dangerousMethods.forEach(method => {
        expect(() => {
          service.simpleEval(`obj.${method}`, { obj: {} });
        }).toThrow(/Access to dangerous property .* is blocked for security reasons/);
      });
    });
  });

  describe('Property Assignment Attacks', () => {
    it('should block __proto__ assignment', () => {
      expect(() => {
        service.simpleEval('obj.__proto__ = malicious', { 
          obj: {}, 
          malicious: { evil: true } 
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should block constructor assignment', () => {
      expect(() => {
        service.simpleEval('obj.constructor = malicious', { 
          obj: {}, 
          malicious: function() {} 
        });
      }).toThrow(/Access to dangerous property "constructor" is blocked for security reasons/);
    });

    it('should block prototype assignment', () => {
      // Functions are objects in JavaScript and can have properties set
      const func = function() {};
      expect(() => {
        service.simpleEval('func.prototype = malicious', { 
          func,
          malicious: { evil: true }
        });
      }).toThrow(/Access to dangerous property "prototype" is blocked for security reasons/);
    });

    it('should block computed property pollution', () => {
      expect(() => {
        service.simpleEval('obj[key] = value', {
          obj: {},
          key: '__proto__',
          value: { polluted: true }
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });
  });

  describe('Object Creation Pollution Attacks', () => {
    it('should block object literals with __proto__', () => {
      expect(() => {
        service.simpleEval('({ "__proto__": malicious })', { 
          malicious: { evil: true } 
        });
      }).toThrow(/Cannot create object with dangerous property "__proto__"/);
    });

    it('should block object literals with constructor', () => {
      expect(() => {
        service.simpleEval('({ "constructor": malicious })', { 
          malicious: function() {} 
        });
      }).toThrow(/Cannot create object with dangerous property "constructor"/);
    });

    it('should block computed object properties with dangerous keys', () => {
      expect(() => {
        service.simpleEval('({ [key]: value })', {
          key: '__proto__',
          value: { polluted: true }
        });
      }).toThrow(/Cannot create object with dangerous property "__proto__"/);
    });
  });

  describe('Built-in Prototype Modification Protection', () => {
    it('should block direct Object.prototype access', () => {
      // Object is not available in the eval context by default
      expect(() => {
        service.simpleEval('Object.prototype.evil = true', { Object });
      }).toThrow(/Access to dangerous property "prototype" is blocked for security reasons/);
    });

    it('should block Array prototype modification through assignment', () => {
      expect(() => {
        service.simpleEval('target.evil = value', {
          target: Array.prototype,
          value: 'polluted'
        });
      }).toThrow(/Modification of built-in prototype is blocked for security reasons/);
    });

    it('should block Function prototype modification', () => {
      expect(() => {
        service.simpleEval('target.evil = value', {
          target: Function.prototype,
          value: 'polluted'
        });
      }).toThrow(/Modification of built-in prototype is blocked for security reasons/);
    });
  });

  describe('Advanced Pollution Techniques', () => {
    it('should block nested property pollution', () => {
      expect(() => {
        service.simpleEval('obj.nested.__proto__ = malicious', {
          obj: { nested: {} },
          malicious: { evil: true }
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should block array-based prototype pollution', () => {
      expect(() => {
        service.simpleEval('arr[0].__proto__ = malicious', {
          arr: [{}],
          malicious: { evil: true }
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should block destructuring pollution attempts', () => {
      // Note: This test covers potential destructuring patterns that could be vulnerable
      expect(() => {
        service.simpleEval('obj["__proto__"] = malicious', {
          obj: {},
          malicious: { evil: true }
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });
  });

  describe('Spread Operator Protection', () => {
    it('should block spreading objects with dangerous properties', () => {
      // Create object with dangerous property as actual property (not prototype setter)
      const dangerous = {};
      Object.defineProperty(dangerous, '__proto__', { 
        value: { evil: true }, 
        enumerable: true, 
        configurable: true,
        writable: true
      });
      
      expect(() => {
        service.simpleEval('({ ...dangerous })', { dangerous });
      }).toThrow(/Spread operation blocked: Object contains dangerous property "__proto__"/);
    });

    it('should block spreading objects with constructor pollution', () => {
      // Create object with dangerous property as actual property
      const dangerous = {};
      Object.defineProperty(dangerous, 'constructor', { 
        value: function() {}, 
        enumerable: true, 
        configurable: true,
        writable: true
      });
      
      expect(() => {
        service.simpleEval('({ ...dangerous })', { dangerous });
      }).toThrow(/Spread operation blocked: Object contains dangerous property "constructor"/);
    });
  });

  describe('Update Expression Protection', () => {
    it('should block increment operations on dangerous properties', () => {
      expect(() => {
        service.simpleEval('obj.__proto__++', { obj: {} });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should block decrement operations on dangerous properties', () => {
      expect(() => {
        service.simpleEval('obj.constructor--', { obj: {} });
      }).toThrow(/Access to dangerous property "constructor" is blocked for security reasons/);
    });
  });

  describe('Assignment Operator Protection', () => {
    it('should block compound assignment to __proto__', () => {
      expect(() => {
        service.simpleEval('obj.__proto__ += value', { 
          obj: {}, 
          value: 'polluted' 
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should block compound assignment to constructor', () => {
      expect(() => {
        service.simpleEval('obj.constructor *= value', { 
          obj: {}, 
          value: 2 
        });
      }).toThrow(/Access to dangerous property "constructor" is blocked for security reasons/);
    });
  });

  describe('Safe Property Access', () => {
    it('should allow access to safe properties', () => {
      const result = service.simpleEval('obj.safeProperty', {
        obj: { safeProperty: 'safe value' }
      });
      expect(result).toBe('safe value');
    });

    it('should allow safe object creation', () => {
      const result = service.simpleEval('({ safeKey: value })', {
        value: 'safe value'
      });
      expect(result).toEqual({ safeKey: 'safe value' });
    });

    it('should allow safe property assignment', () => {
      const context = { obj: {} };
      const result = service.simpleEval('obj.safeProperty = value', {
        ...context,
        value: 'assigned value'
      });
      expect(result).toBe('assigned value');
      expect(context.obj).toEqual({ safeProperty: 'assigned value' });
    });

    it('should allow safe computed property access', () => {
      const result = service.simpleEval('obj[key]', {
        obj: { dynamicKey: 'dynamic value' },
        key: 'dynamicKey'
      });
      expect(result).toBe('dynamic value');
    });

    it('should handle safe nested property access', () => {
      const result = service.simpleEval('obj.nested.value', {
        obj: { nested: { value: 'nested value' } }
      });
      expect(result).toBe('nested value');
    });
  });

  describe('Edge Cases and Corner Cases', () => {
    it('should handle null and undefined targets safely', () => {
      // Assignment to null should fail with security protection, not JavaScript error
      expect(() => {
        service.simpleEval('target.someProperty = value', {
          target: null,
          value: 'test'
        });
      }).toThrow(/Cannot set property on non-object: object/);
    });

    it('should handle primitive targets safely', () => {
      // Assignment to primitive should fail with security protection
      expect(() => {
        service.simpleEval('target.someProperty = value', {
          target: 42,
          value: 'test'
        });
      }).toThrow(/Cannot set property on non-object: number/);
    });

    it('should handle Symbol keys safely', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'symbol value' };
      const result = service.simpleEval('obj.safeProperty', {
        obj: { ...obj, safeProperty: 'safe value' }
      });
      expect(result).toBe('safe value');
    });

    it('should block dangerous symbol descriptions', () => {
      const dangerousSymbol = Symbol('__proto__');
      expect(() => {
        service.simpleEval('({ ...dangerous })', {
          dangerous: { [dangerousSymbol]: 'polluted' }
        });
      }).toThrow(/Object contains dangerous symbol property "__proto__"/);
    });
  });

  describe('Complex Attack Scenarios', () => {
    it('should prevent prototype pollution through nested expressions', () => {
      expect(() => {
        service.simpleEval('(obj.nested || {})["__proto__"] = malicious', {
          obj: {},
          malicious: { evil: true }
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should prevent pollution through conditional assignments', () => {
      expect(() => {
        service.simpleEval('condition ? (obj.__proto__ = malicious) : safe', {
          condition: true,
          obj: {},
          malicious: { evil: true },
          safe: 'safe value'
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });

    it('should prevent pollution through function returns', () => {
      expect(() => {
        service.simpleEval('getPolluter().__proto__ = malicious', {
          getPolluter: () => ({}),
          malicious: { evil: true }
        });
      }).toThrow(/Access to dangerous property "__proto__" is blocked for security reasons/);
    });
  });
});