import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext, EvalScope } from '../../internal/classes/eval';
import { captureFunctionConstructors, isDangerousValue } from '../../internal/visitors/dangerous-values';
import { parse } from '../../internal/functions';

/**
 * The call, `new` and tag sandboxes refuse a dangerous function by its value
 * as well as by its written name (`docs/a35/plan.md` § 3.2, K1). The value is
 * matched against an identity set of the realm's dangerous functions, captured
 * lazily and added to when a timer global is replaced, or is a bound function
 * whose name, stripped of its `bound ` prefixes, is a listed name.
 *
 * Up to 0.12.0 only the written name was checked, so a dangerous function
 * bound under any other name, or reached by any callee shape the name check
 * does not read, ran: with `eval` in the context as `run`, `run("1+1")` gave 2
 * (`docs/backlog.md` A35). Every C case but C14 is red against that code; C14
 * is today's name refusal, pinned.
 *
 * Each refusal is today's message for its site, naming what was written: the
 * identifier, the property name, or `anonymous` for a callee with no name.
 */
describe('EvalService - dangerous function values (A35, K1)', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  /** The call sandbox's refusal, compared by its whole message. */
  const refusal = (name: string): Error =>
    new Error(`Function call blocked for security reasons: ${name}`);

  /** Long enough for a timer of delay 0 to have run, had it been scheduled. */
  const pastTheDelay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

  const realm = globalThis as unknown as Record<string, unknown>;

  describe('the identity set', () => {

    it('S1: should hold this realm\'s dangerous functions, and record the downlevelled constructors as not captured', () => {
      // zone.js has replaced both timers and keeps each original; both
      // identities are in the set, so neither can stand in for the other.
      const zoneSetTimeout = realm['__zone_symbol__setTimeout'];
      const zoneSetInterval = realm['__zone_symbol__setInterval'];
      expect(typeof zoneSetTimeout).toBe('function');
      expect(zoneSetTimeout).not.toBe(setTimeout);
      expect(typeof zoneSetInterval).toBe('function');
      expect(zoneSetInterval).not.toBe(setInterval);
      const GeneratorFunction = Object.getPrototypeOf(function* () { /* a generator literal */ }).constructor;
      expect(GeneratorFunction).not.toBe(Function);

      for (const value of [Function, eval, setTimeout, zoneSetTimeout, setInterval, zoneSetInterval,
        XMLHttpRequest, WebSocket, GeneratorFunction]) {
        expect(isDangerousValue(value)).toBe(true);
      }
      // A benign function is not, and neither is a value that is not a function.
      expect(isDangerousValue(() => 1)).toBe(false);
      expect(isDangerousValue('eval')).toBe(false);

      // This realm downlevels async functions, so an async literal's
      // constructor is `Function` itself, which the helper does not capture.
      const capture = captureFunctionConstructors();
      expect(capture.notCaptured).toEqual(['AsyncFunction', 'AsyncGeneratorFunction']);
      expect(capture.captured.get('GeneratorFunction')).toBe(GeneratorFunction);
    });

    it('S2: should capture the constructor an injected prototype source holds', () => {
      const standIn = function StandIn() { /* a stand-in constructor */ };

      const capture = captureFunctionConstructors({ AsyncFunction: { constructor: standIn } });

      expect(capture.captured.get('AsyncFunction')).toBe(standIn);
      expect(capture.notCaptured).toEqual([]);
    });

    it('S3: should capture nothing, and record it, when the constructor read is Function', () => {
      const capture = captureFunctionConstructors({ AsyncFunction: { constructor: Function } });

      expect(capture.captured.size).toBe(0);
      expect(capture.notCaptured).toEqual(['AsyncFunction']);
    });
  });

  describe('the callee value, under any name or callee shape', () => {

    it('C1: should refuse eval called through an alias', () => {
      expect(() => service.simpleEval('run("1+1")', { run: eval })).toThrow(refusal('run'));
    });

    it('C2: should refuse eval called as a member, under the property name', () => {
      expect(() => service.simpleEval('tools.run("1+1")', { tools: { run: eval } }))
        .toThrow(refusal('run'));
    });

    it('C3: should refuse eval returned by a call and called, as anonymous', () => {
      expect(() => service.simpleEval('getEval()("1+1")', { getEval: () => eval }))
        .toThrow(refusal('anonymous'));
    });

    it('C4: should refuse eval called through this', () => {
      expect(() => service.simpleEval('this.run("1+1")', { run: eval })).toThrow(refusal('run'));
    });

    it('C5: should refuse eval called through a scope namespace', () => {
      const context = new EvalContext({}, {});
      context.priorScopes.push(EvalScope.fromObject({ run: eval }, { namespace: 'ns' }));

      expect(() => service.simpleEval('ns.run("1+1")', context)).toThrow(refusal('run'));
    });

    it('C6: should refuse eval destructured into a name and called', () => {
      expect(() => service.simpleEval('let { run } = tools; run("1+1")', { tools: { run: eval } }))
        .toThrow(refusal('run'));
    });

    it('C7: should refuse eval called through an optional alias', () => {
      expect(() => service.simpleEval('run?.("1+1")', { run: eval })).toThrow(refusal('run'));
    });

    it('C8: should refuse a host-bound eval, by the bound-name rule', () => {
      const e = eval.bind(null);
      expect(e.name).toBe('bound eval');

      expect(() => service.simpleEval('e("1+1")', { e })).toThrow(refusal('e'));
    });

    it('C9: should refuse a doubly bound eval, every bound prefix stripped', () => {
      const e = eval.bind(null).bind(null);
      expect(e.name).toBe('bound bound eval');

      expect(() => service.simpleEval('e("1+1")', { e })).toThrow(refusal('e'));
    });

    it('C10: should refuse eval as a tag through an alias', () => {
      expect(() => service.simpleEval('run`1+1`', { run: eval })).toThrow(refusal('run'));
    });

    it('C11: should refuse the realm\'s setTimeout constructed through an alias, and schedule nothing', async () => {
      // The `new` site's identity check. The timer here is zone.js's wrapper, a
      // plain function `new` can construct, whose `toString` shows the
      // original's source: jsdom's JavaScript here, `[native code]` in a
      // browser. Either way it passes the constructor's source-text test, and
      // `new`'s name list never held the timers, so up to 0.12.0 this
      // constructed even as `new setTimeout(…)`. In a browser, zone.js hands a
      // handler that is not a function to the native timer, which runs a
      // string as code. jsdom's XMLHttpRequest and WebSocket are refused before
      // identity is asked: their class source holds "constructor(".
      const f = jest.fn();

      expect(() => service.simpleEval('new X(f, 0)', { X: setTimeout, f }))
        .toThrow(new Error('Constructor blocked for security reasons: X'));

      await pastTheDelay();
      expect(f).not.toHaveBeenCalled();
    });

    it('C12: should refuse zone\'s original setTimeout through an alias, and schedule nothing', async () => {
      const original = realm['__zone_symbol__setTimeout'];
      expect(typeof original).toBe('function');
      expect(original).not.toBe(setTimeout);
      const f = jest.fn();

      expect(() => service.simpleEval('t(f, 0)', { t: original, f })).toThrow(refusal('t'));

      await pastTheDelay();
      expect(f).not.toHaveBeenCalled();
    });

    it('C13: should refuse a setTimeout installed after the capture', () => {
      // The capture is lazy, at the first function value the check meets. One
      // evaluation first, so the set is captured before the replacement and
      // only the sentinel can add it.
      expect(service.simpleEval('ping()', { ping: () => 1 })).toBe(1);

      const original = realm['setTimeout'];
      const received: unknown[] = [];
      const replacement = function (...args: unknown[]) { received.push(...args); };
      realm['setTimeout'] = replacement;
      try {
        expect(() => service.simpleEval('t("from the walk")', { t: replacement }))
          .toThrow(refusal('t'));
      } finally {
        realm['setTimeout'] = original;
      }

      expect(received).not.toContain('from the walk');
    });

    it('C14: should refuse eval called optionally under its own name, by the name', () => {
      // A stand-in, so only the name check can refuse it: the real `eval`
      // would be refused by its identity as well.
      const standIn = jest.fn();

      expect(() => service.simpleEval('eval?.("1+1")', { eval: standIn })).toThrow(refusal('eval'));
      expect(standIn).not.toHaveBeenCalled();
    });

    it('C15: should refuse a case variant of eval under caseInsensitive', () => {
      expect(() => service.simpleEval('EVAL("1+1")', { eval }, { caseInsensitive: true }))
        .toThrow(refusal('EVAL'));
    });

    it('C15t: should refuse a case variant of eval as a tag under caseInsensitive', () => {
      expect(() => service.simpleEval('EVAL`1+1`', { eval }, { caseInsensitive: true }))
        .toThrow(refusal('EVAL'));
    });
  });

  /**
   * Outside a callee, a tag and `typeof`'s operand, a dangerous function is
   * refused where its value is pushed, whatever visitor pushes it
   * (`docs/a35/plan.md` § 3.3, the funnel). Up to 0.12.0 nothing refused it:
   * `["1+1"].map(eval)` gave `[2]`, and `eval.call(null, "1+1")` gave 2.
   *
   * The exemptions are by node: only the callee, tag or operand node itself is
   * exempt, never what is under it. V8–V10, V20 and V21 put the read under a
   * callee or tag node, so they take this message and not the call's; K1
   * refused each of them with the call's message before the funnel.
   */
  describe('the value, read anywhere but a callee, a tag or typeof\'s operand', () => {

    /** The funnel's refusal, compared by its whole message. */
    const read = (name: string): Error =>
      new Error(`Access to dangerous function "${name}" is blocked for security reasons`);

    it('V1: should refuse eval as the receiver of call', () => {
      expect(() => service.simpleEval('eval.call(null, "1+1")', { eval })).toThrow(read('eval'));
    });

    it('V2: should refuse eval as the receiver of apply', () => {
      expect(() => service.simpleEval('eval.apply(null, ["1+1"])', { eval })).toThrow(read('eval'));
    });

    it('V3: should refuse eval as the receiver of bind', () => {
      expect(() => service.simpleEval('eval.bind(null)("1+1")', { eval })).toThrow(read('eval'));
    });

    it('V4: should refuse Function as the receiver of call', () => {
      expect(() => service.simpleEval('Function.call(null, "return 7")()', { Function }))
        .toThrow(read('Function'));
    });

    it('V5: should refuse eval as an argument to a native callback', () => {
      expect(() => service.simpleEval('["1+1"].map(eval)', { eval })).toThrow(read('eval'));
    });

    it('V6: should refuse eval as an argument to Reflect.apply', () => {
      expect(() => service.simpleEval('Reflect.apply(eval, null, ["1+1"])', { eval, Reflect }))
        .toThrow(read('eval'));
    });

    it('V7: should refuse eval handed to then, synchronously, at the read', () => {
      expect(() => service.simpleEval('Promise.resolve("1+1").then(eval)', { eval, Promise }))
        .toThrow(read('eval'));
    });

    it('V8: should refuse eval as the last expression of a sequence called', () => {
      expect(() => service.simpleEval('(0, eval)("1+1")', { eval })).toThrow(read('eval'));
    });

    it('V9: should refuse eval as a branch of a conditional called', () => {
      expect(() => service.simpleEval('(c ? eval : f)("1+1")', { eval, c: true, f: () => 0 }))
        .toThrow(read('eval'));
    });

    it('V10: should refuse eval as a parenthesised callee under preserveParens', () => {
      const ast = parse('(eval)("1+1")', { preserveParens: true });

      expect(() => service.simpleEval(ast, { eval })).toThrow(read('eval'));
    });

    it('V11: should refuse eval read as a member and passed', () => {
      expect(() => service.simpleEval('["1+1"].map(tools.eval)', { tools: { eval } }))
        .toThrow(read('eval'));
    });

    it('V12: should refuse eval read through a computed key, by its own name', () => {
      expect(() => service.simpleEval('tools["ev" + "al"].call(null, "1+1")', { tools: { eval } }))
        .toThrow(read('eval'));
    });

    it('V13: should refuse eval returned by a call and passed, by its own name', () => {
      expect(() => service.simpleEval('["1+1"].map(getEval())', { getEval: () => eval }))
        .toThrow(read('eval'));
    });

    it('V14: should refuse eval nested in an array the expression builds', () => {
      expect(() => service.simpleEval('[[run, null, ["1+1"]]].map(apply.bind(Reflect.apply, null))',
        { run: eval, apply: Function.prototype.apply, Reflect })).toThrow(read('run'));
    });

    it('V15: should refuse a host-bound eval passed, by the bound-name rule', () => {
      expect(() => service.simpleEval('["1+1"].map(e)', { e: eval.bind(null) })).toThrow(read('e'));
    });

    it('V16: should let typeof read eval, its operand being exempt', () => {
      expect(service.simpleEval('typeof eval === "function"', { eval })).toBe(true);
    });

    it('V17: should refuse eval as the expression\'s own result', () => {
      expect(() => service.simpleEval('eval', { eval })).toThrow(read('eval'));
    });

    it('V18: should refuse eval as an argument inside typeof\'s operand', () => {
      expect(() => service.simpleEval('typeof f(eval)', { f: () => 1, eval })).toThrow(read('eval'));
    });

    it('V19: should refuse both the setTimeout captured before a replacement and the replacement', async () => {
      // One evaluation first, so the set is captured before the replacement.
      // The value captured then must stay refused once the sentinel adds the
      // replacement: recapture adds and never replaces.
      expect(service.simpleEval('ping()', { ping: () => 1 })).toBe(1);

      const before = realm['setTimeout'];
      const received: unknown[] = [];
      const replacement = function (...args: unknown[]) { received.push(...args); };
      const f = jest.fn();
      realm['setTimeout'] = replacement;
      try {
        expect(() => service.simpleEval('[f].map(t)', { t: replacement, f })).toThrow(read('t'));
        expect(() => service.simpleEval('[f].map(t)', { t: before, f })).toThrow(read('t'));
      } finally {
        realm['setTimeout'] = before;
      }

      await pastTheDelay();
      expect(received).toEqual([]);
      expect(f).not.toHaveBeenCalled();
    });

    it('V20: should refuse a timer as the last expression of a sequence constructed, and schedule nothing', async () => {
      const f = jest.fn();

      expect(() => service.simpleEval('new (0, X)(f, 0)', { X: setTimeout, f })).toThrow(read('X'));

      await pastTheDelay();
      expect(f).not.toHaveBeenCalled();
    });

    it('V21: should refuse eval as the last expression of a sequence used as a tag', () => {
      expect(() => service.simpleEval('(0, eval)`1+1`', { eval })).toThrow(read('eval'));
    });
  });
});
