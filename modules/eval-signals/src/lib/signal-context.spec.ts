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

    it('should report no receiver for a lookup-resolved key, so this.fn() gets the context', () => {
      // Up to eval-core 0.6.x `getThis` answered a lookup-resolved key with the
      // lookup function itself, so `this.fn()` ran with the resolver as `this`;
      // this case pinned that. Since 0.7.0 a lookup is not an object that holds
      // the key and answers nothing, and the member visitor falls back to the
      // context (`docs/backlog-retired.md` A7).
      const seen: unknown[] = [];
      const probe = function (this: unknown) { seen.push(this); return 1; };
      const context = createSignalContext({ one: signal(1), probe: signal(probe) });

      // Pin that the keys are lookup-resolved first - the condition under
      // which the resolver used to answer. With no lookup registered,
      // `getThis` would be `undefined` against any version.
      expect(context.lookups).toHaveLength(1);
      expect(context.get('one')).toBe(1);
      expect(context.getThis('one')).toBeUndefined();

      service.simpleEval('this.probe()', context);

      expect(seen).toHaveLength(1);
      expect(seen[0]).toBe(context);
      expect(seen[0]).not.toBe(context.lookups[0]);
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
     * 2 step 0 is that fix - [A9](../../../../docs/backlog-retired.md#a9), a
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
     * A member write - a write *through* a context key rather than *to* one.
     *
     * Until 0.3.0 these two cases were pinned the other way round, as a known
     * gap: `user.name = "Bob"` returned `'Bob'` and left `user()` mutated,
     * because the member branch of each write visitor never calls `set`
     * (`docs/backlog-retired.md` C1). They are changed deliberately, as Phase 2
     * step 0b changed the arrow-scope cases above once the leak they pinned was
     * fixed. `eval-core` 0.10.0 asks the context about each member write, and
     * this context refuses one whose target the walk did not create.
     *
     * Driven straight through `EvalService`: the guard is the context's, so it
     * holds for `createSignalContext` used standalone, with no factory and no
     * recompute boundary in between.
     */
    describe('a member write', () => {

      const userOf = () => signal({ name: 'Ada', n: 1, tags: ['a'] });

      it.each([
        ['an assignment', 'user.name = "Bob"'],
        ['an update', 'user.n++'],
        ['a write through a binding the expression declared', 'let u = user; u.name = "Bob"; u.name'],
        ['a write inside an arrow body', '[user].map(u => (u.name = "Bob"))[0]'],
      ])('should refuse %s into a signal value, and write nothing', (_label, source) => {
        const user = userOf();
        const context = createSignalContext({ user });

        expect(() => service.simpleEval(source, context)).toThrow(SignalContextWriteError);

        expect(user()).toEqual({ name: 'Ada', n: 1, tags: ['a'] });
      });

      it('should raise a member error naming the property and no expression', () => {
        const context = createSignalContext({ user: userOf() });

        let caught: unknown;
        try {
          service.simpleEval('user.name = "Bob"', context);
        } catch (error) {
          caught = error;
        }

        expect(caught).toBeInstanceOf(SignalContextWriteError);
        expect((caught as SignalContextWriteError).kind).toEqual('member');
        expect((caught as SignalContextWriteError).key).toEqual('name');
        expect((caught as SignalContextWriteError).message).toEqual(
          "Cannot assign to member 'name': a signal expression may write only into objects it created."
        );
        expect((caught as SignalContextWriteError).expression).toBeUndefined();
      });

      it.each([
        ['a member of an object literal', 'let o = {}; o.a = 1; o.a', 1],
        ['a loop over its own bindings', 'let t = 0; for (let i = 0; i < 3; i++) { t += i; } t', 3],
        ['the lastIndex of a regex literal', 'let r = /a/g; r.lastIndex = 0', 0],
      ])('should allow %s', (_label, source, expected) => {
        const context = createSignalContext({ user: userOf() });

        expect(service.simpleEval(source, context)).toEqual(expected);
      });

      it('should still refuse an assignment to the key itself, as a key error', () => {
        const context = createSignalContext({ user: userOf() });

        let caught: unknown;
        try {
          service.simpleEval('user = 1', context);
        } catch (error) {
          caught = error;
        }

        expect(caught).toBeInstanceOf(SignalContextWriteError);
        expect((caught as SignalContextWriteError).kind).toEqual('key');
      });

      /**
       * A mutating method - `docs/backlog-retired.md` C4. Until 0.4.0 the push
       * row was pinned the other way round, as a known gap: it returned 2 and
       * left `user().tags` as `['a', 'x']`, because the method writes from
       * native code and neither write visitor runs. Changed deliberately, as
       * the member-write rows above were: `eval-core` 0.11.0 asks the context
       * before calling a built-in that writes into an object it is handed, and
       * this context refuses one the walk did not create.
       */
      it.each([
        ['push', 'user.tags.push("x")'],
        ['sort', 'user.tags.sort()'],
        ['splice', 'user.tags.splice(0, 1)'],
        ['Object.assign', 'Object.assign(user, { name: "Bob" })'],
      ])('should refuse a mutating method, %s, on a signal value, and write nothing', (_label, source) => {
        const user = userOf();
        const context = createSignalContext({ user, Object });

        expect(() => service.simpleEval(source, context)).toThrow(SignalContextWriteError);

        expect(user()).toEqual({ name: 'Ada', n: 1, tags: ['a'] });
      });

      it.each([
        ['sort', 'user.tags.sort()', 'Array.prototype.sort',
          'Use toSorted instead, which returns a sorted copy.'],
        ['reverse', 'user.tags.reverse()', 'Array.prototype.reverse',
          'Use toReversed instead, which returns a reversed copy.'],
        ['splice', 'user.tags.splice(0, 1)', 'Array.prototype.splice',
          'Use toSpliced instead, which returns a changed copy.'],
        ['fill', 'user.tags.fill("z")', 'Array.prototype.fill',
          'Use with instead, which returns a copy with one element replaced, or spread it into an array literal and fill that.'],
        ['push', 'user.tags.push("x")', 'Array.prototype.push',
          'Spread it into an array literal and change the copy instead.'],
      ])('should raise a method error for %s naming the method and what to use instead',
        (_label, source, method, advice) => {
          const context = createSignalContext({ user: userOf() });

          let caught: unknown;
          try {
            service.simpleEval(source, context);
          } catch (error) {
            caught = error;
          }

          expect(caught).toBeInstanceOf(SignalContextWriteError);
          expect((caught as SignalContextWriteError).kind).toEqual('method');
          expect((caught as SignalContextWriteError).key).toEqual(method);
          expect((caught as SignalContextWriteError).message).toEqual(
            `Cannot call ${method}: a signal expression may write only into objects it created. ${advice}`
          );
        });

      /**
       * A mutating method reached through `call`, `apply` or `bind` -
       * `docs/backlog-retired.md` C5. The function called there is `call`,
       * `apply` or `bind`, which no table holds, so up to the fix each of
       * these wrote into `user()`. `eval-core` now asks about the method they
       * run, with the `this` they pass, and about `bind` when it binds.
       */
      it.each([
        ['call', '[].push.call(user.tags, "x")'],
        ['apply', '[].push.apply(user.tags, ["x"])'],
        ['bind', '[].push.bind(user.tags)("x")'],
        ['call through call', '[].push.call.call([].push, user.tags, "x")'],
      ])('should refuse a mutating method reached through %s, and write nothing', (_label, source) => {
        const user = userOf();
        const context = createSignalContext({ user });

        let caught: unknown;
        try {
          service.simpleEval(source, context);
        } catch (error) {
          caught = error;
        }

        expect(caught).toBeInstanceOf(SignalContextWriteError);
        expect((caught as SignalContextWriteError).kind).toEqual('method');
        expect((caught as SignalContextWriteError).key).toEqual('Array.prototype.push');
        expect(user()).toEqual({ name: 'Ada', n: 1, tags: ['a'] });
      });

      it.each([
        ['call', 'let t = [...user.tags]; [].push.call(t, "x"); t'],
        ['apply', 'let t = [...user.tags]; [].push.apply(t, ["x"]); t'],
        ['bind', 'let t = [...user.tags]; [].push.bind(t)("x"); t'],
      ])('should allow a mutating method on a copy through %s', (_label, source) => {
        const user = userOf();
        const context = createSignalContext({ user });

        expect(service.simpleEval(source, context)).toEqual(['a', 'x']);

        expect(user()).toEqual({ name: 'Ada', n: 1, tags: ['a'] });
      });

      it.each([
        ['a spread copy', 'let t = [...user.tags]; t.push("x"); t', ['a', 'x']],
        ['a spread copy, sorted in one expression', '[...user.tags, "0"].sort()', ['0', 'a']],
        ['an object literal, through Object.assign', 'Object.assign({}, user, { name: "Bob" }).name', 'Bob'],
      ])('should allow a mutating method on %s, leaving the signal value alone', (_label, source, expected) => {
        const user = userOf();
        const context = createSignalContext({ user, Object });

        expect(service.simpleEval(source, context)).toEqual(expected);

        expect(user()).toEqual({ name: 'Ada', n: 1, tags: ['a'] });
      });
    });

    it('should name the key as the source spells it under caseInsensitive', () => {
      const context = createSignalContext({ count: signal(1) }, { caseInsensitive: true });

      let caught: unknown;
      try {
        service.simpleEval('COUNT = 5', context, { caseInsensitive: true });
      } catch (error) {
        caught = error;
      }

      // Under `caseInsensitive` the visitors resolve the key through
      // `EvalContext.getKey` before calling `set`, and this context answers
      // a source key with the source's own spelling.
      expect((caught as SignalContextWriteError).key).toEqual('count');
      expect((caught as Error).message)
        .toEqual("Cannot assign to 'count': the keys of a signal context are read-only.");

      // Still no write, which is the property the policy actually owes.
      expect(service.simpleEval('count', context)).toEqual(1);
      expect(context.original).toEqual({});
    });

  });

  describe('getKey', () => {

    const insensitive = { caseInsensitive: true };

    it('should answer a source key as the source spells it under caseInsensitive', () => {
      const context = createSignalContext({ count: signal(1) }, insensitive);

      expect(context.getKey('COUNT')).toEqual('count');
    });

    it('should let a pushed scope shadow the source', () => {
      const context = createSignalContext({ Count: signal(10) }, insensitive);
      context.push({ count: 1 });

      // An arrow parameter named `count`: the scope binds it, `get` resolves
      // it there, and the source's `Count` is never consulted.
      expect(context.get('count')).toEqual(1);
      expect(context.getKey('count')).toEqual('count');
    });

    it('should keep the answer for a key another lookup resolves', () => {
      const context = createSignalContext({ count: signal(1) }, insensitive);
      context.lookups.push((key) => key === 'EXTRA' ? 'extra' : undefined);

      expect(context.get('EXTRA')).toEqual('extra');
      expect(context.getKey('EXTRA')).toEqual('EXTRA');
    });

    it('should be unchanged without caseInsensitive', () => {
      const context = createSignalContext({ count: signal(1) });

      expect(context.getKey('count')).toEqual('count');
      expect(context.getKey('COUNT')).toBeUndefined();
    });
  });

  // `eval-core` refuses an identifier, or a member of `this`, that names a key
  // on its prototype-pollution blocklist, and under `caseInsensitive` one whose
  // lookup matched such a key (`docs/backlog-retired.md` B6). Up to `eval-core`
  // 0.10.x both resolved off the context's empty `original`, so
  // `constructor` was `Object` here. A signal context's own `getKey` answers
  // the source's spelling, which is what the matched-key rows reach.
  describe('the prototype-pollution blocklist', () => {

    const NAMES = [
      '__proto__', 'constructor', 'prototype',
      '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
      'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
      'toString', 'valueOf', 'toLocaleString'
    ];

    const FORMS: ReadonlyArray<readonly [string, (name: string) => string]> = [
      ['an identifier', (name) => name],
      ['a member of this', (name) => `this.${name}`],
      ['a computed member of this', (name) => `this["${name}"]`]
    ];

    const blocked = (name: string): string =>
      `Access to dangerous property "${name}" is blocked for security reasons`;

    const rows = [false, true].flatMap((caseInsensitive) => FORMS.flatMap(([form, write]) =>
      NAMES.map((name) => [name, form, caseInsensitive, write(name)] as const)));

    it.each(rows)('should refuse %s as %s, caseInsensitive %s', (name, _form, caseInsensitive, expression) => {
      const options = { caseInsensitive };
      const context = createSignalContext({ a: signal(1) }, options);

      expect(() => service.simpleEval(expression, context, options)).toThrow(blocked(name));
    });

    const variantRows = FORMS.flatMap(([form, write]) =>
      NAMES.map((name) => [name.toUpperCase(), form, name, write(name.toUpperCase())] as const));

    it.each(variantRows)('should refuse %s as %s, matching a source key %s, caseInsensitive',
      (_variant, _form, name, expression) => {
        const options = { caseInsensitive: true };
        const context = createSignalContext({ [name]: signal('own') }, options);

        expect(() => service.simpleEval(expression, context, options)).toThrow(blocked(name));
      });

    it.each([false, true])('should still resolve an ordinary key, caseInsensitive %s', (caseInsensitive) => {
      const options = { caseInsensitive };
      const context = createSignalContext({ a: signal(1), Constructor: signal('own') }, options);

      expect(service.simpleEval('a', context, options)).toEqual(1);
      expect(service.simpleEval('this.a', context, options)).toEqual(1);
      expect(service.simpleEval('Constructor', context, options)).toEqual('own');
    });

    it('should still resolve a case variant of an ordinary key, caseInsensitive', () => {
      const options = { caseInsensitive: true };
      const context = createSignalContext({ a: signal(1) }, options);

      expect(service.simpleEval('A', context, options)).toEqual(1);
      expect(service.simpleEval('this.A', context, options)).toEqual(1);
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
