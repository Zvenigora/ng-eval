import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EvalService } from '@zvenigora/ng-eval-core';
import { SignalContextWriteError, createSignalContext } from './signal-context';

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

  describe('a throwing arrow function and the reused context', () => {

    /**
     * Re-pinned in Phase 2 step 0b, and the inversion is the point: this case
     * spent Phases 3-6 asserting a leak, with a docblock saying the
     * assertions were "pinned as current behaviour, not endorsed" and that a
     * fix in `eval-core` would have to update both halves deliberately. Phase
     * 2 step 0 is that fix - [A9](../../../../docs/backlog.md#a9), a
     * `try`/`finally` at `arrow-function-expression.ts`'s push site - so this
     * is the deliberate update.
     *
     * **What changed is the reach, not the containment.** The leak used to be
     * uncontained *here specifically*: the guard lives at the recompute
     * boundary (phase-3-plan S 3.8.3), and a signal context driven straight
     * through `EvalService` - what this case does, and what
     * `createSignalContext`'s own doc comment shows - is outside any recompute
     * this library owns. There was nothing on this path to drain it. Now the
     * pop travels with the push inside the visitor, so the path needs no
     * guard: this is the case that shows the fix reaches where the
     * containment could not.
     *
     * `eval-signal.memory.spec.ts` holds the other half - the same expression
     * through `createEvalSignal`, where the guard is also still in place and
     * still retained (step 0b item 2).
     */
    it('should contain the arrow parameter scope even with no recompute boundary', () => {
      const context = createSignalContext({
        x: signal('from source'),
        items: signal([1, 2, 3]),
        explode: () => { throw new Error('boom'); },
      });

      expect(service.simpleEval('x', context)).toEqual('from source');

      // `arrow-function-expression.ts` pushes the parameter scope, then calls
      // `evaluate` inside a `try` whose `finally` pops. `evaluate` rethrows
      // (`evaluate.ts:46`), so the throw leaves the frame - and the pop runs
      // on the way out rather than being skipped.
      expect(() => service.simpleEval('items.map(x => explode(x))', context)).toThrow();

      // The direct assertion. Nothing on this path would drain a scope that
      // survived the throw, so an empty stack here is the visitor's `finally`
      // and nothing else.
      expect(context.scopes.length).toEqual(0);

      // A *fresh* EvalState, the same EvalContext - the shape this library is
      // built on: one context per signal (S 3.2), one state per recompute
      // (S 3.3.1). Scopes are step 1 of `get`'s resolution order, so a stranded
      // `{ x: 1 }` would shadow the source from here on. It does not.
      expect(service.simpleEval('x', context)).toEqual('from source');

      // ...and the context stays usable for its whole life, which under
      // `createEvalSignal` is the signal's.
      expect(service.simpleEval('x', context)).toEqual('from source');
    });

    /**
     * The **escaped-closure** half, and it is the one no containment could
     * ever have reached. `eval-signal.ts` and `evaluate-rule.ts` both bound a
     * leak by marking `scopes.length` before the walk and unwinding to it
     * after, which works only for a push that happens *during* the walk. An
     * arrow function that escapes - stored by the expression and called by the
     * consumer later - pushes its parameter scope long after that `finally`
     * has run, so a missing pop stranded a scope nothing would ever drain.
     * Both guards' docblocks recorded it as out of reach, in those words.
     *
     * Step 0's fix is what closes it, because a pop that travels with the push
     * in the visitor's own `finally` does not care when the call happens. This
     * case exists because the diff that made that claim would otherwise have
     * been the only thing asserting it: `arrow-function-expression.spec.ts`
     * drives the arrow as an IIFE inside the walk every time, and the
     * `eval-forms` case that used to store an escaped closure and make it
     * throw was retired in step 0b once the leak it observed was gone.
     */
    it('should contain the scope of an arrow that escapes the walk and throws when called', () => {
      let escaped: ((...args: unknown[]) => unknown) | undefined;

      const context = createSignalContext({
        x: signal('from source'),
        keep: (fn: unknown) => {
          escaped = fn as (...args: unknown[]) => unknown;

          return true;
        },
      });

      // The walk ends here, with the closure handed out and never called.
      expect(service.simpleEval('keep(x => x())', context)).toEqual(true);
      expect(context.scopes.length).toEqual(0);
      expect(escaped).toBeInstanceOf(Function);

      // Called outside any walk, any recompute and any containment. The
      // parameter binds to a string and calling a string is `safeCall`'s
      // "Value is not a function" - so the push is followed by a throw, which
      // is exactly the shape that used to skip the pop.
      expect(() => escaped?.('ESCAPED')).toThrow();

      // Nothing but the visitor's own `finally` can have popped this.
      expect(context.scopes.length).toEqual(0);

      // And the source key is intact rather than shadowed by `{ x: 'ESCAPED' }`
      // for the life of the context.
      expect(service.simpleEval('x', context)).toEqual('from source');
    });

  });

  describe('the read-only write policy', () => {

    /**
     * The keys of a signal context are read-only (plan S 3.6). The
     * interception point is `EvalContext.set`, which both evaluator write
     * branches route through - `assignment-expression.ts:53` and
     * `update-expression.ts:27` - and which nothing else in `eval-core`
     * calls.
     */

    it('should reject an assignment made by the evaluator', () => {
      const context = createSignalContext({ count: signal(1) });

      // `EvalService.simpleEval` rethrows `new Error(error.message)`, so the
      // error *type* does not survive this path. The message does, and the
      // type is pinned on the adapter's own API below. S 3.6.3 is why
      // `createEvalSignal` calls the free `call` instead of the service's.
      expect(() => service.simpleEval('count = 5', context))
        .toThrow(/Cannot assign to 'count'/);
    });

    it('should reject an update expression, which writes through the same point', () => {
      const context = createSignalContext({ count: signal(1) });

      expect(() => service.simpleEval('count++', context))
        .toThrow(/Cannot assign to 'count'/);
    });

    it('should raise a keyed error naming no expression when used standalone', () => {
      const context = createSignalContext({ count: signal(1) });

      let caught: unknown;
      try {
        context.set('count', 5);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(SignalContextWriteError);
      expect((caught as SignalContextWriteError).key).toEqual('count');
      expect((caught as SignalContextWriteError).message)
        .toEqual("Cannot assign to 'count': the keys of a signal context are read-only.");

      // The adapter has no expression to name - `createSignalContext` is
      // public and callable without one. `createEvalSignal` adds that half
      // and is asserted in `eval-signal.spec.ts`; without this case the
      // standalone shape goes untested and enrichment could silently become
      // the only path.
      expect((caught as SignalContextWriteError).expression).toBeUndefined();
      expect((caught as SignalContextWriteError).cause).toBeUndefined();
    });

    it('should leave the source resolving after a rejected write', () => {
      const context = createSignalContext({ count: signal(1) });

      expect(() => service.simpleEval('count = 5', context)).toThrow();

      // The assertion that pins "no write landed" - the throw alone does not.
      // A guard that threw *after* writing would put `count` in `original`,
      // which is step 2 of `get`'s resolution order against the resolver's
      // step 4, so the stale 5 would shadow the source for the life of the
      // context. On a construct-once context that is the life of the signal
      // (S 3.2.2).
      expect(service.simpleEval('count', context)).toEqual(1);
      expect(context.original).toEqual({});
    });

    /**
     * KNOWN GAP - pinned as current behaviour, not endorsed. A fix has to
     * update this spec deliberately, the way Phase 2 step 0b updated the
     * arrow-scope cases above once `eval-core` fixed the leak they pinned
     * (the `read-hooks.spec.ts` precedent for the `getKey` gaps). See the
     * plan's S 3.6.4 and S 8 q6.
     */
    it('should NOT reject a write whose target is a member of a signal value', () => {
      const user = signal({ name: 'Ada' });
      const context = createSignalContext({ user });

      // The policy covers a write *to* a context key. This is a write
      // *through* one: `assignment-expression.ts` takes its MemberExpression
      // branch, which writes with `safeSetProperty` straight into the object
      // the signal holds and never touches the context. No guard on the
      // `EvalContext` can see it - the data is the consumer's, not ours.
      expect(service.simpleEval('user.name = "Bob"', context)).toEqual('Bob');

      expect(user()).toEqual({ name: 'Bob' });
    });

    it('should NOT reject an update whose target is a member either', () => {
      const counter = signal({ n: 1 });
      const context = createSignalContext({ counter });

      expect(service.simpleEval('counter.n++', context)).toEqual(1);

      expect(counter()).toEqual({ n: 2 });
    });

    /**
     * KNOWN GAP - pinned as current behaviour. See the plan's S 3.6.4.
     */
    it('should lose the key under caseInsensitive, which getKey cannot resolve', () => {
      const context = createSignalContext({ count: signal(1) }, { caseInsensitive: true });

      let caught: unknown;
      try {
        service.simpleEval('COUNT = 5', context, { caseInsensitive: true });
      } catch (error) {
        caught = error;
      }

      // Under `caseInsensitive` the visitors resolve the key through
      // `EvalContext.getKey` before calling `set`, and `getKey` consults
      // scopes, `original` and `priorScopes` but never `lookups` - so a
      // signal-backed key, which lives only in `lookups`, comes back
      // unresolved. The guard still fires, which is what matters; the
      // diagnostic half of the error is what degrades.
      expect((caught as Error).message)
        .toEqual("Cannot assign to 'undefined': the keys of a signal context are read-only.");

      // Still no write, which is the property the policy actually owes.
      expect(service.simpleEval('count', context)).toEqual(1);
      expect(context.original).toEqual({});
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
