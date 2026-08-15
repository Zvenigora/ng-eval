import { Injector, WritableSignal, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalContext, EvalHooks, EvalState } from '@zvenigora/ng-eval-core';
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

  describe('invalidate', () => {

    it('should force exactly one recompute over a source with no reactive surface', () => {
      const source = { count: 1 };
      const states = jest.spyOn(compiler, 'createState');

      const value = create('count + 1', source);

      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(1);

      source.count = 10;

      // Nothing told the signal anything changed, and nothing could: a plain
      // object has no reactive surface to subscribe to. That is the honest
      // trade of S 3.5's fallback, and it is what makes the assertion below
      // load-bearing rather than a value that would have refreshed anyway.
      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(1);

      value.invalidate();

      expect(value()).toEqual(11);
      expect(states).toHaveBeenCalledTimes(2);

      // "and no more" - the version bump is one write, not a switch that
      // leaves the signal re-evaluating on every read from then on.
      expect(value()).toEqual(11);
      expect(value()).toEqual(11);
      expect(states).toHaveBeenCalledTimes(2);
    });

    it('should recompute once per call, not once per read', () => {
      const source = { count: 1 };
      const states = jest.spyOn(compiler, 'createState');
      const value = create('count + 1', source);

      expect(value()).toEqual(2);

      source.count = 2;
      value.invalidate();
      value.invalidate();
      value.invalidate();

      // Three bumps between two reads collapse into one recompute, because
      // what they change is a signal `computed` reads - not a counter it
      // replays. The value is the current one either way; the call count is
      // what distinguishes the two.
      expect(value()).toEqual(3);
      expect(states).toHaveBeenCalledTimes(2);
    });

    it('should recover a signal whose last recompute threw', () => {
      const source: Record<string, unknown> = {
        read: () => { throw new Error('bad data'); },
      };
      const value = create('read()', source);

      expect(() => value()).toThrow('bad data');

      source['read'] = () => 'fixed';

      // A `computed` caches the error and re-throws it on every read until
      // one of the producers *that run recorded* changes. Nothing here is
      // signal-backed, so without the version read there is no such producer
      // and this signal is permanently poisoned.
      expect(() => value()).toThrow('bad data');

      value.invalidate();

      // Which makes this the case that pins where `version()` sits: move it
      // below `evaluate()` and it is skipped on exactly the runs that most
      // need it - the ones that threw.
      expect(value()).toEqual('fixed');
    });

    it('should leave signal-backed tracking alone', () => {
      const c = signal(1);
      const d = signal(100);
      const states = jest.spyOn(compiler, 'createState');
      const value = create('c + 1', { c, d });

      expect(value()).toEqual(2);

      value.invalidate();

      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(2);

      // The version signal is an *additional* producer, not a replacement:
      // reading it must not make the signal depend on keys the expression
      // never named.
      d.set(200);

      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(2);
    });

  });

  describe('trackDependencies', () => {

    const source = (): SignalContextSource =>
      ({ a: signal({ b: 1 }), c: signal(2), d: signal(99) });

    it('should register no read hook by default', () => {
      const states = jest.spyOn(compiler, 'createState');

      const value = create('a.b + c', source());

      expect(value()).toEqual(3);

      const [state] = statesBuilt(states);

      // Asserted on the state the factory actually built, rather than on a
      // registry handed in from outside - that weaker form would only prove
      // nothing was installed on *that* registry, not that the factory built
      // none of its own. `hasHooks` is checked *before* `state.hooks`, whose
      // getter constructs an empty registry on first access and would leave
      // the second assertion true for the wrong reason.
      expect(state.hasHooks).toBe(false);
      expect(state.hooks.hasReadHooks).toBe(false);
    });

    it('should report an empty dependency set by default', () => {
      const value = create('a.b + c', source());

      expect(value()).toEqual(3);

      // The consumer-visible half of the case above, and deliberately not a
      // substitute for it: an empty set is also what a registered tracker
      // returns when nothing was read.
      expect([...value.dependencies]).toEqual([]);
    });

    it('should register the read hook on the state it owns, and remove it again', () => {
      const onRead = jest.spyOn(EvalHooks.prototype, 'onRead');
      const states = jest.spyOn(compiler, 'createState');

      const value = create('a.b + c', source(), { trackDependencies: true });

      expect(value()).toEqual(3);

      const [state] = statesBuilt(states);

      // Registered, and on the registry this state built for itself rather
      // than on any other: `isActive` latches on the first registration, and
      // the spy names the instance it happened on.
      expect(state.hasHooks).toBe(true);
      expect(onRead).toHaveBeenCalledTimes(1);
      expect(onRead.mock.instances[0]).toBe(state.hooks);

      // ...and gone again by the time the recompute returned. The unsubscribe
      // is taken and called even though the state is unreachable from here -
      // "it dies with the state" is a property of the current design rather
      // than a guarantee (S 3.8). This is also why `hasReadHooks` is not the
      // assertion for *registration*: it reads false after the walk either
      // way.
      expect(state.hooks.hasReadHooks).toBe(false);

      // The only global mutation in this file, and `restoreMocks` is not
      // configured - the `createState` spies elsewhere are on a per-test
      // TestBed instance, this one is on a shared prototype.
      onRead.mockRestore();
    });

    it('should collect the keys the expression named, and no others', () => {
      const value = create('a.b + c', source(), { trackDependencies: true });

      expect(value()).toEqual(3);

      // `d` is in the context and is not read, so it is not a dependency -
      // the same distinction the recompute assertions make, reported rather
      // than acted on.
      expect([...value.dependencies].sort()).toEqual(['a', 'a.b', 'c']);
    });

    it('should not broaden what the signal subscribes to', () => {
      const context = source();
      const states = jest.spyOn(compiler, 'createState');

      const value = create('a.b + c', context, { trackDependencies: true });

      expect(value()).toEqual(3);
      expect(states).toHaveBeenCalledTimes(1);

      (context['d'] as WritableSignal<number>).set(100);

      // The negative case for the *tracking* path specifically. Every other
      // assertion in this block reads a value or a reported set, and all of
      // them stay green if turning tracking on made the walk touch signals
      // the expression never named - the read hook turns on key resolution
      // and path reconstruction at every read site, which is exactly the
      // machinery that could reach further than the expression did.
      expect(value()).toEqual(3);
      expect(states).toHaveBeenCalledTimes(1);
    });

    it('should report the last recompute rather than accumulating', () => {
      const flag = signal(true);
      const value = create('flag ? a : b', {
        flag,
        a: signal(1),
        b: signal(2),
      }, { trackDependencies: true });

      expect(value()).toEqual(1);
      expect([...value.dependencies].sort()).toEqual(['a', 'flag']);

      flag.set(false);

      expect(value()).toEqual(2);

      // `a` is gone rather than joined by `b`. Each recompute has its own
      // state and therefore its own registry and its own tracker (S 3.4), so
      // no reset is needed - and this is the assertion that would fail if the
      // tracker were hoisted out of the recompute to save an allocation.
      expect([...value.dependencies].sort()).toEqual(['b', 'flag']);
    });

    it('should drop the recorded set on destroy', () => {
      const value = create('a.b + c', source(), { trackDependencies: true });

      expect(value()).toEqual(3);
      expect(value.dependencies.size).toEqual(3);

      value.destroy();

      expect([...value.dependencies]).toEqual([]);
    });

  });

  describe('the registry-ownership rule', () => {

    it('should throw when trackDependencies meets a caller-supplied registry', () => {
      const hooks = new EvalHooks();

      let raised: unknown;
      try {
        create('c + 1', { c: signal(1) }, { trackDependencies: true, eval: { hooks } });
      } catch (error) {
        raised = error;
      }

      // Named rather than matched loosely: the escape hatch only helps a
      // consumer who can tell which two options collided.
      expect(raised).toBeInstanceOf(Error);
      expect((raised as Error).message).toContain('trackDependencies');
      expect((raised as Error).message).toContain('eval.hooks');

      // The assertion that actually pins the rule. A throw alone is
      // compatible with having installed the tracker first and thrown
      // afterwards, which would leave a hook firing on every later
      // evaluation the consumer runs through this registry, with an
      // unsubscribe they were never handed.
      expect(hooks.hasReadHooks).toBe(false);
    });

    it('should throw at createEvalSignal rather than at the first recompute', () => {
      const hooks = new EvalHooks();

      // No read of the returned signal anywhere in this case: the failure
      // has to surface where it was written, not on whatever line first
      // happens to touch the value.
      expect(() =>
        create('c + 1', { c: signal(1) }, { trackDependencies: true, eval: { hooks } })
      ).toThrow(/trackDependencies/);
    });

    it('should accept trackDependencies alone', () => {
      const value = create('c + 1', { c: signal(1) }, { trackDependencies: true });

      expect(value()).toEqual(2);
      expect([...value.dependencies]).toEqual(['c']);
    });

    it('should accept a caller-supplied registry alone, and leave it untouched', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('before', 'Identifier', (event) => seen.push(event.node.type));
      const states = jest.spyOn(compiler, 'createState');

      const value = create('c + 1', { c: signal(1) }, { eval: { hooks } });

      expect(value()).toEqual(2);

      // The registry is adopted by reference, so this is the factory's own
      // state reporting on the consumer's registry: their hook ran, and no
      // read hook of ours joined it.
      expect(seen).toEqual(['Identifier']);
      expect(statesBuilt(states)[0].hooks).toBe(hooks);
      expect(hooks.hasReadHooks).toBe(false);
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

    it('should read undefined from the moment it is destroyed', () => {
      const c = signal(1);
      const value = create('c + 1', { c });

      expect(value()).toEqual(2);

      value.destroy();

      // No producer has moved here, so the `computed` is not dirty and would
      // keep serving its cached 2 - which is what makes the destroyed value
      // depend on *which* producer happens to move next. `destroy()` bumps
      // the version once itself so that it does not (plan S 3.8.2).
      expect(value()).toBeUndefined();
    });

    it('should make invalidate() inert once destroyed', () => {
      const equal = jest.fn((a: unknown, b: unknown) => Object.is(a, b));
      const states = jest.spyOn(compiler, 'createState');
      const value = create('c + 1', { c: signal(1) }, { equal });

      expect(value()).toEqual(2);

      value.destroy();

      expect(value()).toBeUndefined();

      equal.mockClear();
      const before = states.mock.calls.length;

      value.invalidate();
      value.invalidate();

      expect(value()).toBeUndefined();

      // `createState` cannot tell the no-op from step 3's fall-through: after
      // `destroy()` the compiled callback is gone, so `evaluate()` returns
      // before building a state either way, and the count is flat under both
      // (S 3.8.2). `equal` is the channel that can - a `computed` invokes it
      // only when it has actually re-run and produced a value to compare.
      expect(equal).not.toHaveBeenCalled();
      expect(states).toHaveBeenCalledTimes(before);
    });

    it('should leave the same value whichever producer moves after destroy', () => {
      // Deliberately two sources rather than one shared signal: over a shared
      // `c`, `c.set` would dirty *both* computeds and drive both signals down
      // the dependency-change arm, so the case would pass without the
      // producers ever having been compared. Each signal here is moved by one
      // producer and one only.
      const a = signal(1);
      const b = signal(1);
      const invalidated = create('a + 1', { a });
      const changed = create('b + 1', { b });

      expect(invalidated()).toEqual(2);
      expect(changed()).toEqual(2);

      invalidated.destroy();
      changed.destroy();

      invalidated.invalidate();
      b.set(10);

      // The pairing S 3.8.2 owes: an inert `invalidate()` would otherwise
      // leave a destroyed signal reporting its last good value while a
      // destroyed signal whose dependency moved reports `undefined`.
      expect(invalidated()).toEqual(changed());
      expect(invalidated()).toBeUndefined();
    });

  });

});
