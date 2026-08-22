import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { clearPropertyLookupCache } from '../../internal/visitors/property-lookup-cache';

/**
 * Characterization cover for the primitive carve-out in `member-expression.ts`.
 *
 * Both branches of the member visitor skip the dangerous-property check when
 * the receiver is a string, number or boolean (`!isPrimitive && …`, lines 144
 * and 188). That is deliberate — the blocklist holds `toString`, `valueOf` and
 * `hasOwnProperty`, which are ordinary reads on a primitive, and enforcing it
 * there would break `s.toString()` — but it also means `"abc".constructor`
 * really does hand back the `String` function.
 *
 * The carve-out is **not cleared**, only probed: no escalation from that
 * reference has been found, because the second hop's receiver is a plain
 * function and goes through `safeGetProperty`, which does enforce the
 * blocklist. See ROADMAP.md, "Deferred security hardening".
 *
 * These specs pin the boundary in *both* directions — what the carve-out
 * currently permits and what still blocks — so narrowing it or widening it
 * both show up as a failure here rather than silently. Confirmed by probe:
 * skipping the carve-out reddens the first and second blocks, and extending
 * it to function receivers reddens the third. They are a record of current
 * behaviour, not an endorsement of it: a fix is expected to change the first
 * `describe` block and should leave the second and third intact.
 *
 * One thing a fix cannot be. Simply deleting `!isPrimitive` does not narrow
 * the carve-out, it removes primitive member access altogether:
 * `safeGetProperty` returns undefined for any target that is not an object or
 * a function, *before* it consults the blocklist, so `s.toUpperCase` becomes
 * undefined rather than blocked. Narrowing means keeping a primitive read
 * path and enforcing a subset of the blocklist on it.
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

  describe('what the carve-out currently permits (change this block when it is narrowed)', () => {
    it('should return the global constructor for a primitive receiver', () => {
      const context = { s: 'abc', n: 1, b: true };

      expect(service.simpleEval('s.constructor', context)).toBe(String);
      expect(service.simpleEval('n.constructor', context)).toBe(Number);
      expect(service.simpleEval('b.constructor', context)).toBe(Boolean);
    });

    it('should reach Function.prototype.call through that reference', () => {
      const context = { s: 'abc' };

      // The one hop past the constructor that is not on the blocklist. It is
      // callable, but `this` is the String function, so it yields a string.
      expect(service.simpleEval('s.constructor.call', context)).toBe(Function.prototype.call);
      expect(service.simpleEval('s.constructor.call(null, "hi")', context)).toBe('hi');
      expect(service.simpleEval('s.constructor("x")', context)).toBe('x');
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
    it('should block the second hop off a primitive constructor', () => {
      const context = { s: 'abc' };

      // The receiver is now the String function - not a primitive - so
      // `safeGetProperty` enforces the blocklist and the chain to `Function`
      // is cut here.
      expect(() => service.simpleEval('s.constructor.constructor', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('s.constructor.prototype', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('s.constructor.__proto__', context)).toThrow(BLOCKED);
      expect(() => service.simpleEval('s.constructor.call.constructor', context)).toThrow(BLOCKED);
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
      // independent of the blocklist, and it is what stops
      // `s.constructor.CONSTRUCTOR` even though the guard would not see it.
      expect(service.simpleEval('s.constructor.CONSTRUCTOR', context, options)).toBeUndefined();
      expect(service.simpleEval('s.constructor.PROTOTYPE', context, options)).toBeUndefined();
      expect(service.simpleEval('s.trim.CONSTRUCTOR', context, options)).toBeUndefined();
    });

    it('should not case-correct on a primitive receiver either', () => {
      const context = { s: 'abc' };

      expect(service.simpleEval('s.CONSTRUCTOR', context, { caseInsensitive: true })).toBeUndefined();
    });
  });
});
