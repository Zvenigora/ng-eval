import { Injector, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalContext, EvalState } from '@zvenigora/ng-eval-core';
import { EvalSignal, EvalSignalOptions, createEvalSignal } from './eval-signal';
import { SignalContextSource, SignalContextWriteError, createSignalContext } from './signal-context';

describe('createEvalSignal', () => {

  let compiler: CompilerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    compiler = TestBed.inject(CompilerService);
  });

  /**
   * Every case here goes through the factory rather than through the adapter
   * (plan S 6.1): the seam this library is built on is how the *evaluator*
   * consumes what the adapter produced, and an assertion that never leaves
   * the adapter cannot see a defect living there.
   *
   * `createState` is spied on as the recompute counter. It is called exactly
   * once per recompute by design (S 3.3.1), so its call count is the walk
   * count, and its return values are the states themselves.
   */
  const create = (
    expression: string,
    source: SignalContextSource | EvalContext,
    options?: EvalSignalOptions
  ): EvalSignal<unknown> =>
    TestBed.runInInjectionContext(() => createEvalSignal(expression, source, options));

  const statesBuilt = (spy: jest.SpyInstance): EvalState[] =>
    spy.mock.results.map((result) => result.value as EvalState);

  describe('reactivity', () => {

    it('should resolve a value and recompute when a signal it read changes', () => {
      const c = signal(1);
      const value = create('c + 1', { c });

      expect(value()).toEqual(2);

      c.set(10);

      expect(value()).toEqual(11);
    });

    it('should recompute for the one key the expression names and no other', () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);
      const states = jest.spyOn(compiler, 'createState');

      const value = create('a + 1', { a, b, c });

      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(1);

      b.set(20);
      c.set(30);

      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(1);

      // Without this half the negative assertions above would pass equally
      // against a signal that never recomputes at all.
      a.set(10);

      expect(value()).toEqual(11);
      expect(states).toHaveBeenCalledTimes(2);
    });

    it('should not recompute on a second read with nothing changed', () => {
      const states = jest.spyOn(compiler, 'createState');
      const value = create('c + 1', { c: signal(1) });

      expect(value()).toEqual(2);
      expect(value()).toEqual(2);
      expect(value()).toEqual(2);

      expect(states).toHaveBeenCalledTimes(1);
    });

  });

  describe('compilation and state', () => {

    it('should compile once across many recomputes', () => {
      const c = signal(1);
      const compile = jest.spyOn(compiler, 'compile');
      const states = jest.spyOn(compiler, 'createState');

      const value = create('c + 1', { c });

      for (let i = 1; i <= 5; i++) {
        c.set(i);
        expect(value()).toEqual(i + 1);
      }

      expect(states).toHaveBeenCalledTimes(5);
      expect(compile).toHaveBeenCalledTimes(1);
    });

    it('should build a distinct EvalState for each recompute', () => {
      const c = signal(1);
      const states = jest.spyOn(compiler, 'createState');

      const value = create('c + 1', { c });

      expect(value()).toEqual(2);
      c.set(2);
      expect(value()).toEqual(3);
      c.set(3);
      expect(value()).toEqual(4);

      const built = statesBuilt(states);

      // Asserted directly here rather than through its consequence, which is
      // what step 4 covers. `EvalResult.trace` is drained by nothing and
      // `setSuccess` does not clear a previous run's error fields, so a
      // reused state would grow and would report a stale failure (S 3.3.1).
      expect(built).toHaveLength(3);
      expect(new Set(built).size).toEqual(3);

      // The other half of the same decision: the identity-bearing part is
      // deliberately *not* rebuilt. One adapter, with its lookup and its
      // priorScopes, survives every recompute.
      expect(new Set(built.map((state) => state.context)).size).toEqual(1);
    });

  });

  describe('equal', () => {

    const structural = (a: unknown, b: unknown): boolean =>
      JSON.stringify(a) === JSON.stringify(b);

    it('should stop a structurally equal recompute reaching a consumer', () => {
      const c = signal(1);
      const value = create('[c > 0]', { c }, { equal: structural });

      let downstream = 0;
      const view = computed(() => {
        downstream++;
        return value();
      });

      expect(view()).toEqual([true]);
      expect(downstream).toEqual(1);

      c.set(2);

      expect(view()).toEqual([true]);
      expect(downstream).toEqual(1);
    });

    it('should re-notify without it, which is what makes the case above load-bearing', () => {
      const c = signal(1);
      const value = create('[c > 0]', { c });

      let downstream = 0;
      const view = computed(() => {
        downstream++;
        return value();
      });

      expect(view()).toEqual([true]);

      c.set(2);

      // A fresh array per recompute, so `Object.is` never dedupes and every
      // downstream consumer re-runs - the reason `equal` is on the options
      // at all.
      expect(view()).toEqual([true]);
      expect(downstream).toEqual(2);
    });

  });

  describe('onError', () => {

    const throwing = () => ({ explode: () => { throw new Error('boom'); } });

    it('should throw by default', () => {
      const value = create('explode()', throwing());

      expect(() => value()).toThrow('boom');
    });

    it('should yield undefined in undefined mode', () => {
      const value = create('explode()', throwing(), { onError: 'undefined' });

      expect(value()).toBeUndefined();
    });

    it('should pass the error to a mapper and use its result', () => {
      const seen: unknown[] = [];
      const value = create('explode()', throwing(), {
        onError: (error) => { seen.push(error); return 'fallback'; },
      });

      expect(value()).toEqual('fallback');
      expect(seen).toHaveLength(1);
      expect((seen[0] as Error).message).toContain('boom');
    });

  });

  describe('forwarding options.eval to both halves', () => {

    it('should correct a property name from a single caseInsensitive', () => {
      const value = create(
        'user.NAME',
        { user: signal({ name: 'Ada' }) },
        { eval: { caseInsensitive: true } }
      );

      // The half that fails without forwarding. Property names are corrected
      // by the member visitor off `state.options`, so this passes only when
      // the factory also handed the option to `createState`. An identifier
      // case would pass with no forwarding at all - step 1's four
      // case-sensitivity specs did.
      expect(value()).toEqual('Ada');
    });

    it('should correct an identifier from the same single option', () => {
      const value = create('PRICE * 2', { price: signal(10) }, { eval: { caseInsensitive: true } });

      expect(value()).toEqual(20);
    });

    it('should correct neither without the option', () => {
      expect(create('user.NAME', { user: signal({ name: 'Ada' }) })()).toBeUndefined();
      expect(create('PRICE', { price: signal(10) })()).toBeUndefined();
    });

  });

  describe('a pre-built EvalContext', () => {

    it('should be handed to the walk unchanged', () => {
      const context = createSignalContext({ c: signal(1) });
      const states = jest.spyOn(compiler, 'createState');

      const value = create('c + 1', context);

      expect(value()).toEqual(2);
      expect(statesBuilt(states)[0].context).toBe(context);
    });

    it('should keep its own options when the factory forwards different ones', () => {
      // Built case-sensitively by the caller, who owns the context half.
      const context = createSignalContext({ price: signal(10) });

      const value = create('PRICE', context, { eval: { caseInsensitive: true } });

      // The forwarding reaches the evaluation only, so the *resolver* - which
      // is what corrects identifiers - still matches case-sensitively and
      // `PRICE` misses. Contrast the factory-built case above, where the same
      // single option resolves. That asymmetry is inherent to accepting a
      // pre-built context (S 3.3).
      expect(value()).toBeUndefined();

      // ...and the factory did not retroactively rewrite what the caller set.
      expect(context.options).toEqual({});
    });

  });

  describe('the read-only write policy', () => {

    it('should raise an error naming both the key and the expression', () => {
      const value = create('count = 5', { count: signal(1) });

      let caught: unknown;
      try {
        value();
      } catch (error) {
        caught = error;
      }

      // The type survives to here only because the factory calls the free
      // `call` rather than `CompilerService.call`, which rethrows
      // `new Error(error.message)` and would leave nothing but a message to
      // match on (S 3.6.3). This assertion is what pins that choice.
      expect(caught).toBeInstanceOf(SignalContextWriteError);
      expect((caught as SignalContextWriteError).key).toEqual('count');
      expect((caught as SignalContextWriteError).expression).toEqual('count = 5');
      expect((caught as SignalContextWriteError).message).toEqual(
        "Cannot assign to 'count' in expression 'count = 5': "
        + 'the keys of a signal context are read-only.'
      );

      // The adapter's own key-only error, preserved rather than discarded.
      expect((caught as SignalContextWriteError).cause).toBeInstanceOf(SignalContextWriteError);
      expect(((caught as SignalContextWriteError).cause as SignalContextWriteError).expression)
        .toBeUndefined();
    });

    it('should not let onError undefined swallow it', () => {
      const value = create('count = 5', { count: signal(1) }, { onError: 'undefined' });

      // A write violation is a static property of the expression - illegal on
      // every recompute with every dataset - while `onError: 'undefined'`
      // exists so a *runtime* failure renders a blank. Routing this through
      // it would hand a consumer who set it for the ordinary reason a silent
      // blank for a bug in their own code (S 3.6.3).
      expect(() => value()).toThrow(SignalContextWriteError);
    });

    it('should not let an onError mapper swallow it', () => {
      const mapper = jest.fn(() => 'fallback');
      const value = create('count = 5', { count: signal(1) }, { onError: mapper });

      expect(() => value()).toThrow(SignalContextWriteError);
      expect(mapper).not.toHaveBeenCalled();
    });

    it('should leave the shared context uncorrupted for other signals on it', () => {
      const context = createSignalContext({ count: signal(1) });
      const writer = create('count = 5', context);
      const reader = create('count', context);

      expect(() => writer()).toThrow(SignalContextWriteError);

      // One `EvalContext` per signal is the design, and a landed write would
      // sit in `original` - ahead of the resolver in `get`'s order - and
      // shadow the source for the life of the context (S 3.2.2).
      expect(reader()).toEqual(1);
    });

  });

  describe('the injector option', () => {

    it('should require an injection context when none is given', () => {
      // Matched rather than left bare: an unqualified `toThrow()` here would
      // pass on a parse failure or a bad source too, and would report
      // coverage of the `inject()` branch that it does not have.
      expect(() => createEvalSignal('c + 1', { c: signal(1) }))
        .toThrow(/NG0203|injection context/);
    });

    it('should work outside one when an injector is supplied', () => {
      const injector = TestBed.inject(Injector);
      const c = signal(1);

      // Deliberately not wrapped in `runInInjectionContext`, unlike every
      // other case in this file - a wiring call is not covered by testing
      // what it calls (S 6.1).
      const value = createEvalSignal('c + 1', { c }, { injector });

      expect(value()).toEqual(2);

      c.set(4);

      expect(value()).toEqual(5);
    });

  });

  describe('destroy', () => {

    it('should stop recomputing, and stay stopped when called again', () => {
      const c = signal(1);
      const states = jest.spyOn(compiler, 'createState');
      const value = create('c + 1', { c });

      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(1);

      value.destroy();
      value.destroy();
      value.destroy();

      c.set(10);

      // Idempotence asserted behaviourally rather than as `not.toThrow()`:
      // the second and third calls must not resurrect or re-register
      // anything, and the only way to see that is that the recompute a
      // changed dependency would normally trigger does not run.
      expect(value()).toBeUndefined();
      expect(states).toHaveBeenCalledTimes(1);
    });

  });

});
