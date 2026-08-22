import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { clearPropertyLookupCache } from '../../internal/visitors/property-lookup-cache';

/**
 * Regression cover for GHSA-pj3p-xpg7-h7gw, reported against the sibling
 * project `@zvenigora/jse-eval` (<= 1.10.0, fixed in 1.10.1).
 *
 * There, the blocklist was the regex `/^__proto__|prototype|constructor$/`.
 * Two defects: no `i` flag, so `x.CONSTRUCTOR` was not matched; and the
 * alternation groups as `(^__proto__)|(prototype)|(constructor$)`, so it both
 * over-blocks names that merely contain a fragment and under-blocks names that
 * merely end with one. The case-insensitive fallback lookup then resolved the
 * unmatched `CONSTRUCTOR` back to the real `constructor`, reaching
 * `Function` and arbitrary execution.
 *
 * ng-eval does not share the defect. `isDangerousProperty` is an exact-match
 * Set rather than a regex, so the grouping flaw cannot arise; and under
 * `caseInsensitive` the member visitor re-checks the key the lookup actually
 * *matched* - `member-expression.ts`'s `isDangerousProperty(foundKey)` - not
 * only the key as it was written. That second check is the load-bearing one:
 * neuter it and `x.CONSTRUCTOR` yields `Object` again. These specs pin it.
 *
 * The cache is cleared per test because `getCachedCaseInsensitiveProperty`
 * keys on object *shape*, so a lookup from a neighbouring spec can otherwise
 * answer this one's.
 */
describe('EvalService - case-variant property guard (GHSA-pj3p-xpg7-h7gw)', () => {
  let service: EvalService;

  const BLOCKED = /Access to dangerous property .* is blocked for security reasons/;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    clearPropertyLookupCache();
  });

  afterEach(() => {
    clearPropertyLookupCache();
  });

  describe('the advisory chain, caseInsensitive: true', () => {
    it('should block the reported proof-of-concept expression', () => {
      const expr = 'x.CONSTRUCTOR.CONSTRUCTOR("return process")()'
        + '.mainModule.require("child_process").execSync("id").toString()';

      expect(() => {
        service.simpleEval(expr, { x: {} }, { caseInsensitive: true });
      }).toThrow(BLOCKED);
    });

    it('should block the first hop, so no constructor reference ever escapes', () => {
      // The chain is only exploitable because hop 1 hands back `Object`. This
      // asserts on the returned value and not merely on "it throws", so a
      // future change that lets the read succeed silently is still caught.
      let value: unknown = 'not evaluated';

      expect(() => {
        value = service.simpleEval('x.CONSTRUCTOR', { x: {} }, { caseInsensitive: true });
      }).toThrow(BLOCKED);

      expect(value).toBe('not evaluated');
      expect(value).not.toBe(Object);
    });

    it('should block every case spelling of the first hop', () => {
      const spellings = ['CONSTRUCTOR', 'CoNsTrUcToR', 'Constructor', 'consTRUCTor'];

      spellings.forEach(spelling => {
        clearPropertyLookupCache();
        expect(() => {
          service.simpleEval(`x.${spelling}`, { x: {} }, { caseInsensitive: true });
        }).toThrow(BLOCKED);
      });
    });

    it('should block case variants reached through a computed member', () => {
      expect(() => {
        service.simpleEval('x["CONSTRUCTOR"]', { x: {} }, { caseInsensitive: true });
      }).toThrow(BLOCKED);

      // The key is produced at runtime, so no static check on the source text
      // could catch this one.
      expect(() => {
        service.simpleEval('x[k.toUpperCase()]', { x: {}, k: 'constructor' }, { caseInsensitive: true });
      }).toThrow(BLOCKED);
    });

    it('should block case variants of every blocklisted name reachable on Object.prototype', () => {
      // `prototype` is absent: it is not an own name of Object.prototype, so
      // no case-insensitive lookup resolves to it. It is covered separately
      // below, on a function receiver.
      const names = [
        '__proto__',
        'constructor',
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'toString',
        'valueOf',
        'toLocaleString'
      ];

      names.forEach(name => {
        clearPropertyLookupCache();
        expect(() => {
          service.simpleEval(`x.${name.toUpperCase()}`, { x: {} }, { caseInsensitive: true });
        }).toThrow(BLOCKED);
      });
    });

    it('should block `prototype` on a function receiver, and not resolve a case variant to it', () => {
      const fn = function named() { /* empty for testing */ };

      expect(() => {
        service.simpleEval('fn.prototype', { fn }, { caseInsensitive: true });
      }).toThrow(BLOCKED);

      // Functions are not `typeof 'object'`, so the case-insensitive lookup
      // does not run for them at all and the variant simply misses.
      const value = service.simpleEval('fn.PROTOTYPE', { fn }, { caseInsensitive: true });
      expect(value).toBeUndefined();
    });
  });

  describe('the advisory chain, caseInsensitive: false', () => {
    it('should not resolve a case variant, since no case correction runs', () => {
      const value = service.simpleEval('x.CONSTRUCTOR', { x: {} }, { caseInsensitive: false });

      expect(value).toBeUndefined();
      expect(value).not.toBe(Object);
    });

    it('should still block the exact spelling', () => {
      expect(() => {
        service.simpleEval('x.constructor', { x: {} }, { caseInsensitive: false });
      }).toThrow(BLOCKED);
    });
  });

  describe('the advisory\'s secondary finding: alternation grouping', () => {
    it('should not over-block names that merely contain a blocklisted fragment', () => {
      // jse-eval's ungrouped `|prototype|` matched anywhere in the name, so
      // these were refused. An exact-match Set cannot make that mistake -
      // the fixture holds real values so a silent `undefined` cannot pass.
      const context = {
        x: {
          myconstructor: 'a',
          prototypeFoo: 'b',
          fooPrototype: 'c',
          constructorFoo: 'd',
          proto__: 'e'
        }
      };

      [false, true].forEach(caseInsensitive => {
        clearPropertyLookupCache();
        expect(service.simpleEval('x.myconstructor', context, { caseInsensitive })).toBe('a');
        expect(service.simpleEval('x.prototypeFoo', context, { caseInsensitive })).toBe('b');
        expect(service.simpleEval('x.fooPrototype', context, { caseInsensitive })).toBe('c');
        expect(service.simpleEval('x.constructorFoo', context, { caseInsensitive })).toBe('d');
        expect(service.simpleEval('x.proto__', context, { caseInsensitive })).toBe('e');
      });
    });

    it('should block on the resolved key rather than on the lowercased source key', () => {
      // A caller's own data legitimately named CONSTRUCTOR resolves to itself,
      // because the guard tests the key the lookup matched. A guard that
      // instead lowercased the source spelling and tested that would refuse
      // this read - the over-blocking half of the advisory's grouping defect.
      const context = { y: Object.assign(Object.create(null), { CONSTRUCTOR: 'own-value' }) };

      expect(service.simpleEval('y.CONSTRUCTOR', context, { caseInsensitive: true })).toBe('own-value');
    });
  });
});
