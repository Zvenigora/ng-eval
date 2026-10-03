import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { clearPropertyLookupCache } from '../../internal/visitors/property-lookup-cache';

/**
 * Cover for the primitive carve-out in `member-expression.ts`, narrowed in
 * `eval-core` 0.9.0 (`docs/backlog-retired.md`, B1).
 *
 * Until 0.9.0 both branches of the member visitor skipped the
 * dangerous-property check outright when the receiver was a string, number or
 * boolean (`!isPrimitive && …`), so `"abc".constructor` handed back the
 * `String` function and `s.__proto__` handed back `String.prototype`. A
 * primitive receiver is now refused the subset of the blocklist that reaches a
 * constructor, a prototype or an accessor definer —
 * `DANGEROUS_PRIMITIVE_PROPERTY_NAMES` in `prototype-pollution-guard.ts`. The
 * rest of the blocklist — `toString`, `valueOf`, `toLocaleString`,
 * `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable` — are ordinary
 * reads on a primitive and stay readable.
 *
 * The subset is checked by exact key, under `caseInsensitive` too. A primitive
 * is never case-corrected — the lookup that corrects case runs only for
 * `typeof 'object'` receivers — so `s.CONSTRUCTOR` reads
 * `'abc'['CONSTRUCTOR']`, which is undefined, and never reaches `String`. The
 * third block's last test is the guard on that: if a primitive is ever
 * case-corrected it fails, and the variants then need refusing too.
 *
 * One thing the fix could not be. Simply deleting `!isPrimitive` does not
 * narrow the carve-out, it removes primitive member access altogether:
 * `safeGetProperty` returns undefined for any target that is not an object or
 * a function, *before* it consults the blocklist, so `s.toUpperCase` becomes
 * undefined rather than blocked. Narrowing means keeping a primitive read
 * path and enforcing a subset of the blocklist on it.
 *
 * The first block was rewritten with the fix, and the second predates it,
 * unchanged. The third predates it too, but its cases that started with a
 * now-refused hop were reworked so each still tests what it is named for:
 * where an allowed hop reaches the same receiver (`s.trim.call`, `s.sub`,
 * `s.trim`) the case goes through it; where none does — no allowed member of a
 * primitive yields a global constructor — the case asserts the first-hop
 * refusal and says the second hop is now unreachable.
 */
describe('EvalService - primitive receiver carve-out', () => {
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

  describe('what the narrowed carve-out refuses, and what it keeps readable', () => {
    const context = { s: 'abc', n: 1, b: true };

    const REFUSED = [
      'constructor',
      '__proto__',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__'
    ];

    const RECEIVER_AND_NAME = ['s', 'n', 'b'].flatMap(
      (receiver) => REFUSED.map((name) => [receiver, name] as [string, string])
    );

    // The message is the blocklist's own, naming the key as written.
    const refusal = (name: string) => `Access to dangerous property "${name}" is blocked for security reasons`;

    describe.each([false, true])('caseInsensitive: %s', (caseInsensitive) => {
      it.each(RECEIVER_AND_NAME)('should refuse %s.%s', (receiver, name) => {
        expect(() => service.simpleEval(`${receiver}.${name}`, context, { caseInsensitive }))
          .toThrow(refusal(name));
      });

      it.each(RECEIVER_AND_NAME)('should refuse %s["%s"]', (receiver, name) => {
        expect(() => service.simpleEval(`${receiver}["${name}"]`, context, { caseInsensitive }))
          .toThrow(refusal(name));
      });

      it('should refuse a key computed at runtime', () => {
        expect(() => service.simpleEval('s[k]', { s: 'abc', k: 'constructor' }, { caseInsensitive }))
          .toThrow(refusal('constructor'));
        expect(() => service.simpleEval('n[k]', { n: 1, k: '__proto__' }, { caseInsensitive }))
          .toThrow(refusal('__proto__'));
      });

      it('should refuse a call through the constructor or the prototype', () => {
        expect(() => service.simpleEval('s.constructor("x")', context, { caseInsensitive }))
          .toThrow(refusal('constructor'));
        expect(() => service.simpleEval('s.constructor.call(null, "hi")', context, { caseInsensitive }))
          .toThrow(refusal('constructor'));
        expect(() => service.simpleEval('n.__proto__.toFixed.call(1.5, 0)', context, { caseInsensitive }))
          .toThrow(refusal('__proto__'));
        expect(() => service.simpleEval('s.__lookupGetter__("length")', context, { caseInsensitive }))
          .toThrow(refusal('__lookupGetter__'));
      });

      it.each([
        ['s.toString()', 'abc'],
        ['s.valueOf()', 'abc'],
        ['s.hasOwnProperty("length")', true],
        ['s.isPrototypeOf(s)', false],
        ['s.propertyIsEnumerable("0")', true],
        ['n.toLocaleString()', (1).toLocaleString()],
        ['s.length', 3],
        ['s.toUpperCase()', 'ABC']
      ])('should keep the ordinary read %s', (expression, expected) => {
        expect(service.simpleEval(expression as string, context, { caseInsensitive })).toBe(expected);
      });
    });

    it('should refuse s.constructor.CONSTRUCTOR at the first hop under caseInsensitive', () => {
      // Formerly the third block's function-receiver case, which read
      // `undefined` at the second hop. The first hop is now refused.
      expect(() => service.simpleEval('s.constructor.CONSTRUCTOR', context, { caseInsensitive: true }))
        .toThrow(refusal('constructor'));
    });

    it('should read a case variant as undefined rather than refuse it', () => {
      // The subset is checked by exact key. A primitive is never
      // case-corrected, so a variant is a missing property and never reaches
      // `String`. The third block's last test is the guard on that premise.
      const options = { caseInsensitive: true };

      expect(service.simpleEval('s.Constructor', context, options)).toBeUndefined();
      expect(service.simpleEval('s.CONSTRUCTOR', context, options)).toBeUndefined();
    });
  });

  describe('why the carve-out exists (this block should survive any fix)', () => {
    it('should allow blocklisted names that are ordinary reads on a primitive', () => {
      const context = { s: 'abc', n: 42 };

      expect(service.simpleEval('s.toString()', context)).toBe('abc');
      expect(service.simpleEval('n.toString()', context)).toBe('42');
      expect(service.simpleEval('n.valueOf()', context)).toBe(42);
      expect(service.simpleEval('s.toUpperCase()', context)).toBe('ABC');
    });

    it('should not extend the carve-out to non-primitive receivers', () => {
      const context = { arr: [1, 2], x: {}, fn: function named() { /* empty for testing */ } };

      expect(() => service.simpleEval('arr.constructor', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('x.constructor', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('fn.constructor', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('arr.toString()', context)).toThrow(BLOCKED);
    });
  });

  describe('where every probed escalation dead-ends (this block should survive any fix)', () => {
    it('should refuse a primitive constructor at the first hop, so its second hop is now unreachable from a primitive', () => {
      const context = { s: 'abc' };

      // Before 0.9.0 the first hop returned the String function and the
      // second was cut by `safeGetProperty`. Now the first hop is refused, and
      // no allowed member of a string, number or boolean yields a global
      // constructor, so the second hop cannot be reached from a primitive at
      // all. `s.constructor.constructor` names the same key at both hops, so
      // its message cannot say which one refused; the other two can.
      const FIRST_HOP = /Access to dangerous property "constructor" is blocked/;

      expect(() => service.simpleEval('s.constructor.constructor', context)).toThrow(FIRST_HOP);
      expect(() => service.simpleEval('s.constructor.prototype', context)).toThrow(FIRST_HOP);
      expect(() => service.simpleEval('s.constructor.__proto__', context)).toThrow(FIRST_HOP);
    });

    it('should block the hop off Function.prototype.call, reached through a primitive method', () => {
      const context = { s: 'abc' };

      // Was `s.constructor.call.constructor`. `s.trim.call` reaches the same
      // receiver through allowed hops, and `safeGetProperty` cuts the chain to
      // `Function` there.
      expect(() => service.simpleEval('s.trim.call.constructor', context)).toThrow(BLOCKED);
    });

    it('should block the second hop off a primitive method', () => {
      const context = { s: 'abc' };

      expect(() => service.simpleEval('s.trim.constructor', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('s.sub.constructor', context)).toThrow(BLOCKED);
    });

    it('should not case-correct on a function receiver, so no variant reopens the chain', () => {
      const context = { s: 'abc' };
      const options = { caseInsensitive: true };

      // Functions are not `typeof 'object'`, so the case-insensitive lookup in
      // `member-expression.ts` never runs for them. This is a second barrier,
      // independent of the blocklist, and it is what stops `s.trim.CONSTRUCTOR`
      // even though the guard would not see it. The receivers are reached
      // through allowed hops: `s.constructor.CONSTRUCTOR` is now refused at
      // `s.constructor`, and is a refusal case in the first block.
      expect(service.simpleEval('s.sub.CONSTRUCTOR', context, options)).toBeUndefined();
      expect(service.simpleEval('s.trim.PROTOTYPE', context, options)).toBeUndefined();
      expect(service.simpleEval('s.trim.CONSTRUCTOR', context, options)).toBeUndefined();
    });

    it('should not case-correct on a primitive receiver either', () => {
      const context = { s: 'abc' };

      expect(service.simpleEval('s.CONSTRUCTOR', context, { caseInsensitive: true })).toBeUndefined();
    });
  });
});
