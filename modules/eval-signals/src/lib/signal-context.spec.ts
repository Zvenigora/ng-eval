import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EvalService } from '@zvenigora/ng-eval-core';
import { createSignalContext } from './signal-context';

describe('createSignalContext', () => {

  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  describe('resolution', () => {

    it('should unwrap a signal value', () => {
      const context = createSignalContext({ one: signal(1), two: signal(2) });

      const result = service.simpleEval('one + two', context);

      expect(result).toEqual(3);
    });

    it('should resolve a plain value through the same lookup', () => {
      const context = createSignalContext({ one: signal(1), two: 2 });

      const result = service.simpleEval('one + two', context);

      expect(result).toEqual(3);
    });

    it('should resolve an unknown key to undefined', () => {
      const context = createSignalContext({ one: signal(1) });

      expect(context.get('missing')).toBeUndefined();
    });

    it('should lose to a key present in the original context', () => {
      const context = createSignalContext({ shadowed: signal('from signal') });

      // Without this the assertion below passes against a context that never
      // resolved the source in the first place.
      expect(service.simpleEval('shadowed', context)).toEqual('from signal');

      (context.original as Record<string, unknown>)['shadowed'] = 'from original';

      expect(service.simpleEval('shadowed', context)).toEqual('from original');
    });

    it('should lose to an Object.prototype member of the same name', () => {
      const context = createSignalContext({ toString: signal('from signal') });

      // `original` is `{}`, and `getContextValue` reads it as a bare property
      // access with no own-property check - so an inherited name resolves off
      // `Object.prototype` and never reaches the resolver. Pre-existing
      // `eval-core` behaviour, pinned here because it bounds the adapter's
      // claim to own the whole context.
      expect(context.get('toString')).toEqual(expect.any(Function));
      expect(context.get('toString')).not.toEqual('from signal');
      expect(context.get('hasOwnProperty')).toEqual(expect.any(Function));
    });

  });

  describe('reactivity', () => {

    it('should recompute when a signal the expression read changes', () => {
      const c = signal(1);
      const context = createSignalContext({ c, d: signal(100) });

      let runs = 0;
      const value = computed(() => {
        runs++;
        return service.simpleEval('c + 1', context);
      });

      expect(value()).toEqual(2);
      expect(runs).toEqual(1);

      c.set(10);

      expect(value()).toEqual(11);
      expect(runs).toEqual(2);
    });

    it('should not recompute when a signal the expression did not read changes', () => {
      const d = signal(100);
      const context = createSignalContext({ c: signal(1), d });

      let runs = 0;
      const value = computed(() => {
        runs++;
        return service.simpleEval('c + 1', context);
      });

      expect(value()).toEqual(2);
      expect(runs).toEqual(1);

      d.set(200);

      expect(value()).toEqual(2);
      expect(runs).toEqual(1);
    });

    it('should not recompute when nothing changed', () => {
      const context = createSignalContext({ c: signal(1) });

      let runs = 0;
      const value = computed(() => {
        runs++;
        return service.simpleEval('c + 1', context);
      });

      expect(value()).toEqual(2);
      expect(value()).toEqual(2);
      expect(value()).toEqual(2);

      expect(runs).toEqual(1);
    });

    it('should track a signal read through a member expression', () => {
      const user = signal({ name: 'Ada' });
      const context = createSignalContext({ user });

      let runs = 0;
      const value = computed(() => {
        runs++;
        return service.simpleEval('user.name', context);
      });

      expect(value()).toEqual('Ada');

      user.set({ name: 'Grace' });

      expect(value()).toEqual('Grace');
      expect(runs).toEqual(2);
    });

  });

  describe('the `this` argument of a context function', () => {

    it('should pass the EvalContext to a bare call, not the resolver', () => {
      const seen: unknown[] = [];
      const source = {
        probe: function (this: unknown) { seen.push(this); return 1; },
      };
      const context = createSignalContext(source);

      service.simpleEval('probe()', context);

      expect(seen).toHaveLength(1);
      expect(seen[0]).toBe(context);
    });

    it('should report the resolver as getThis for a lookup-resolved key', () => {
      const context = createSignalContext({ one: signal(1) });

      // Pin that a resolver exists and that getThis discriminates, first:
      // with no lookup registered both sides of the identity check below are
      // `undefined` and it would pass against an adapter that registers none.
      expect(context.lookups).toHaveLength(1);
      expect(context.getThis('one')).toEqual(expect.any(Function));
      expect(context.getThis('missing')).toBeUndefined();

      expect(context.getThis('one')).toBe(context.lookups[0]);
    });

  });

  describe('case sensitivity', () => {

    it('should keep keys distinct by default', () => {
      const context = createSignalContext({ Foo: signal('upper'), foo: signal('lower') });

      expect(context.get('Foo')).toEqual('upper');
      expect(context.get('foo')).toEqual('lower');
      expect(context.get('FOO')).toBeUndefined();
    });

    it('should match a differently cased key when caseInsensitive is set', () => {
      const context = createSignalContext({ foo: signal('lower') }, { caseInsensitive: true });

      expect(context.get('FOO')).toEqual('lower');
      expect(context.get('Foo')).toEqual('lower');
    });

    it('should prefer an exact match over a differently cased one', () => {
      const source = { Foo: signal('upper'), foo: signal('lower') };
      const context = createSignalContext(source, { caseInsensitive: true });

      expect(context.get('Foo')).toEqual('upper');
      expect(context.get('foo')).toEqual('lower');
    });

    it('should take the first key in insertion order when only case differs', () => {
      const source = { Foo: signal('upper'), foo: signal('lower') };
      const context = createSignalContext(source, { caseInsensitive: true });

      expect(context.get('FOO')).toEqual('upper');
    });

    it('should correct an identifier through a full evaluation', () => {
      const context = createSignalContext({ price: signal(10) }, { caseInsensitive: true });

      expect(service.simpleEval('PRICE * 2', context)).toEqual(20);
    });

    it('should not correct a member name, which the walk resolves and not the resolver', () => {
      const context = createSignalContext(
        { user: signal({ name: 'Ada' }) },
        { caseInsensitive: true }
      );

      // `caseInsensitive` given here reaches the resolver, which sees raw
      // identifier keys. Property names are corrected by the member visitor
      // off `state.options`, which is built from the options passed to the
      // *evaluation* - so the context's own options do not reach it.
      expect(service.simpleEval('user.NAME', context)).toBeUndefined();

      expect(service.simpleEval('user.NAME', context, { caseInsensitive: true }))
        .toEqual('Ada');
    });

  });

  describe('the nested-signal diagnostic', () => {

    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('should run the scan when a context is constructed', () => {
      createSignalContext({ user: { name: signal('a') } });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('user.name');
    });

    it('should stay silent for the supported shape', () => {
      createSignalContext({ user: signal({ name: 'a' }) });

      expect(warn).not.toHaveBeenCalled();
    });

  });

});
