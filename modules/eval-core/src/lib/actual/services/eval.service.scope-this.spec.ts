import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext, EvalScope } from '../../internal/classes/eval';
import { Context, Registry } from '../../internal/classes/common';

/**
 * `docs/backlog-retired.md` A7: `EvalScopeOptions.thisArg` was documented and
 * never read, so no call received it as `this`. Every spec that set it set it
 * to the scope's own object, which is the receiver a namespaced method got
 * anyway, so none could tell. Each case here uses a `thisArg` that is a
 * different object from the scope's, and every method returns its `this`, so
 * the receiver is asserted by identity.
 *
 * Two paths reach a scope's method, and neither changes what an identifier
 * evaluates to:
 *
 * - `ns.fn()` - `ns` still evaluates to the scope's object; the call maps that
 *   receiver to the scope's `thisArg`.
 * - `this.fn()` - `EvalContext.getThis` returns the `thisArg` of the prior
 *   scope that resolves `fn`.
 */
describe('EvalService - a prior scope\'s thisArg', () => {
  let service: EvalService;

  /** A scope object whose methods report their receiver. */
  const scopeObject = () => ({
    name: 'Miss Kitty',
    whoAmI: function () { return this; },
  });

  const foreign = { name: 'Other' };

  const namespaced = (object: Context, thisArg?: unknown): EvalContext => {
    const context = new EvalContext({}, {});
    context.priorScopes.push(EvalScope.fromObject(object, {
      global: false, caseInsensitive: false, namespace: 'cat', thisArg
    }));
    return context;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  describe('a method reached through a namespace', () => {

    it('(a) should be called with thisArg as this', () => {
      const cat = scopeObject();

      expect(service.simpleEval('cat.whoAmI()', namespaced(cat, foreign))).toBe(foreign);
    });

    it('(b) should be called with the scope\'s own object when thisArg is unset', () => {
      const cat = scopeObject();

      expect(service.simpleEval('cat.whoAmI()', namespaced(cat))).toBe(cat);
    });

    it('(d) should leave the bare namespace evaluating to the scope\'s object', () => {
      const cat = scopeObject();
      const context = namespaced(cat, foreign);

      expect(service.simpleEval('cat', context)).toBe(cat);
      // `self` is the caller's own reference to the same object.
      context.priorScopes.push(EvalScope.fromObject({ self: cat }, { global: true }));
      expect(service.simpleEval('cat === self', context)).toBe(true);
    });

    it('should read a property from the scope\'s object, not from thisArg', () => {
      // Through a namespace the receiver changes at the call and nowhere
      // else: a member read substituting `thisArg` would answer 'Other'.
      // Through `this` a write can go to `thisArg` (A56, below).
      expect(service.simpleEval('cat.name', namespaced(scopeObject(), foreign))).toBe('Miss Kitty');
    });

    it('should write a property onto the scope\'s object, not onto thisArg', () => {
      // The member target of a write is the same tuple slot a call reads its
      // receiver from, so a substitution made there would move writes too.
      const cat = scopeObject();
      const thisArg: Record<string, unknown> = {};

      service.simpleEval('cat.label = "x"', namespaced(cat, thisArg));

      expect((cat as Record<string, unknown>)['label']).toBe('x');
      expect(thisArg['label']).toBeUndefined();
    });
  });

  describe('this.fn()', () => {

    it('(c) should be called with thisArg when a global prior scope supplies fn', () => {
      const context = new EvalContext({}, {});
      context.priorScopes.push(EvalScope.fromObject(
        { fn: function () { return this; } },
        { global: true, thisArg: foreign }
      ));

      expect(service.simpleEval('this.fn()', context)).toBe(foreign);
    });

    it('(f) should receive a guarded view when a prior scope supplies fn and declares no thisArg', () => {
      // **Deliberate contract change**, `eval-core` 0.13.0 (`docs/a35/plan.md`
      // § 8 q7). (c) above is the *declared* `thisArg`, which is unchanged.
      // With none declared, `getThis` answers undefined and the member
      // visitor falls back to the context - so this form is guarded, where
      // (c) is not. The pair is what makes the boundary visible: the host's
      // own choice of receiver is honoured, and the evaluator's fallback to
      // the context is not.
      const seen: unknown[] = [];
      const context = new EvalContext({}, {});
      context.priorScopes.push(EvalScope.fromObject(
        { fn: function (this: unknown) { seen.push(this); return 1; } },
        { global: true }
      ));

      service.simpleEval('this.fn()', context);

      expect(seen).toHaveLength(1);
      const receiver = seen[0] as object;
      expect(receiver).not.toBe(context);
      expect(Reflect.ownKeys(receiver)).toEqual([]);
      expect(typeof (receiver as { push: unknown }).push).toBe('function');
    });

    it('(e) should receive a guarded view for a lookup-resolved key, not the lookup and not the context', () => {
      // **Deliberate contract change**, `eval-core` 0.13.0
      // (`docs/a35/plan.md` § 8 q7, `docs/backlog.md` A39). Up to 0.12.1 this
      // asserted the receiver *was* `state.context`: `getThis` answers
      // nothing for a lookup-resolved key, and the member visitor fell back
      // to the object it was evaluating.
      //
      // A function reached through the context's own resolution chain now
      // receives a guarded view instead (`context-receiver.ts`). The
      // assertion is strengthened, not dropped: still not the lookup, which
      // is what `docs/backlog-retired.md` A7 fixed, and now not the context
      // either - and what it *is* is pinned, rather than left open.
      const fn = function (this: unknown) { return this; };
      const lookup = (key: unknown) => key === 'fn' ? fn : undefined;
      const context = new EvalContext({}, {});
      context.lookups.push(lookup);
      const state = service.createState(context);

      const receiver = service.eval('this.fn()', state) as object;

      expect(receiver).not.toBe(lookup);
      expect(receiver).not.toBe(state.context);
      expect(Reflect.ownKeys(receiver)).toEqual([]);
      expect(Object.getPrototypeOf(receiver)).toBeNull();
      expect(typeof (receiver as { push: unknown }).push).toBe('function');
    });
  });

  describe.each<[string, { caseInsensitive?: boolean }]>([
    ['case-sensitive', {}],
    ['caseInsensitive', { caseInsensitive: true }],
  ])('this.k = v under a global prior scope\'s thisArg (docs/backlog.md A56), %s', (_label, options) => {
    // `this.k` reads `k` as the identifier does, a `k` the expression binds
    // itself first, but a write through `this` goes to the receiver `getThis`
    // answers: the `thisArg` of the first prior scope that holds `k`, when the
    // context's own object does not. "Holds" is a value other than `undefined`.
    // A56's entry records it; each case builds its own context,
    // scopes and `thisArg` (SR43). W2 and W3 read `k` before `this.k`, so a
    // probe that breaks the identifier's read fails on its own line.
    const withScope = (caller: Record<string, unknown>) => {
      const context = EvalContext.fromContext(caller, options);
      const scope: Record<string, unknown> = { k: 10 };
      const thisArg: Record<string, unknown> = { k: 't' };
      context.priorScopes.push(EvalScope.fromObject(scope, { global: true, thisArg }));
      return { context, scope, thisArg };
    };

    it('W1 should write this.k = 2 to thisArg, not to the scope\'s object', () => {
      const { context, scope, thisArg } = withScope({});

      expect(service.simpleEval('this.k = 2', context, options)).toBe(2);
      expect(thisArg['k']).toBe(2);
      expect(scope['k']).toBe(10);
    });

    it('W2 should read k and this.k from the scope, not from thisArg', () => {
      const { context } = withScope({});

      expect(service.simpleEval('k', context, options)).toBe(10);
      expect(service.simpleEval('this.k', context, options)).toBe(10);
    });

    it('W3 should still read k and this.k from the scope after this.k = 2', () => {
      const { context } = withScope({});
      service.simpleEval('this.k = 2', context, options);

      expect(service.simpleEval('k', context, options)).toBe(10);
      expect(service.simpleEval('this.k', context, options)).toBe(10);
    });

    it('W4 should leave thisArg alone when the context\'s own object holds k (the contrast)', () => {
      const caller: Record<string, unknown> = { k: 1 };
      const { context, scope, thisArg } = withScope(caller);

      expect(service.simpleEval('this.k = 2', context, options)).toBe(2);
      expect(thisArg['k']).toBe('t');
      expect(scope['k']).toBe(10);
      // Case-sensitive the write lands on the caller's object; under
      // `caseInsensitive` in the copy `fromContext` made of it, into its map
      // since A50's fix (A57).
      expect(caller['k']).toBe(options.caseInsensitive ? 1 : 2);
    });

    it('W5 should write to the thisArg of the first prior scope that holds k', () => {
      const context = EvalContext.fromContext({}, options);
      const second: Record<string, unknown> = { k: 't2' };
      context.priorScopes.push(EvalScope.fromObject({ j: 1 }, { global: true }));
      context.priorScopes.push(EvalScope.fromObject({ k: 10 }, { global: true, thisArg: second }));

      expect(service.simpleEval('this.k = 2', context, options)).toBe(2);
      expect(second['k']).toBe(2);
    });

    it('W6 should refuse this.k = 2 when the first prior scope that holds k has no thisArg', () => {
      const context = EvalContext.fromContext({}, options);
      const first: Record<string, unknown> = { k: 't1' };
      context.priorScopes.push(EvalScope.fromObject({ j: 1 }, { global: true, thisArg: first }));
      context.priorScopes.push(EvalScope.fromObject({ k: 10 }, { global: true }));

      expect(() => service.simpleEval('this.k = 2', context, options))
        .toThrow('Write to the evaluation context is blocked for security reasons');
      expect(first['k']).toBe('t1');
    });

    it('W7 should read a k the expression binds itself, while this.k = 2 still writes thisArg (the contrast)', () => {
      for (const expression of [
        'let k = 1; this.k = 2; this.k',
        'const k = 1; this.k = 2; this.k',
        '(k => (this.k = 2, this.k))(1)',
      ]) {
        const { context, scope, thisArg } = withScope({});

        expect(service.simpleEval(expression, context, options)).toBe(1);
        expect(thisArg['k']).toBe(2);
        expect(scope['k']).toBe(10);
      }
    });

    it('W8 should write thisArg for a Registry passed as the context and for a Registry-backed prior scope (SR19)', () => {
      const host = new Registry<string, unknown>([['j', 1]], options);
      const viaHost = EvalContext.fromContext(host as unknown as Context, options);
      const hostThisArg: Record<string, unknown> = { k: 't' };
      viaHost.priorScopes.push(EvalScope.fromObject({ k: 10 }, { global: true, thisArg: hostThisArg }));

      expect(service.simpleEval('this.k = 2', viaHost, options)).toBe(2);
      expect(hostThisArg['k']).toBe(2);
      expect(host.get('k')).toBeUndefined();

      const backing = new Registry<string, unknown>([['k', 10]], options);
      const viaScope = EvalContext.fromContext({}, options);
      const scopeThisArg: Record<string, unknown> = { k: 't' };
      viaScope.priorScopes.push(new EvalScope(backing as unknown as Context, { global: true, thisArg: scopeThisArg }));

      expect(service.simpleEval('this.k = 2', viaScope, options)).toBe(2);
      expect(scopeThisArg['k']).toBe(2);
      expect(backing.get('k')).toBe(10);
    });

    it('W9 should pass over a k whose value is undefined, in a prior scope and in the context\'s own object', () => {
      const context = EvalContext.fromContext({}, options);
      const first: Record<string, unknown> = { k: 't1' };
      const second: Record<string, unknown> = { k: 't2' };
      context.priorScopes.push(EvalScope.fromObject({ k: undefined }, { global: true, thisArg: first }));
      context.priorScopes.push(EvalScope.fromObject({ k: 10 }, { global: true, thisArg: second }));

      expect(service.simpleEval('this.k = 2', context, options)).toBe(2);
      expect(first['k']).toBe('t1');
      expect(second['k']).toBe(2);

      const caller: Record<string, unknown> = { k: undefined };
      const own = withScope(caller);

      expect(service.simpleEval('this.k = 2', own.context, options)).toBe(2);
      expect(own.thisArg['k']).toBe(2);
      expect(caller['k']).toBeUndefined();
    });

    it('W10 should read k from a scope the caller pushes, while this.k = 2 still writes thisArg', () => {
      const { context, scope, thisArg } = withScope({});
      context.push({ k: 'p' }, options);

      expect(service.simpleEval('this.k = 2', context, options)).toBe(2);
      expect(thisArg['k']).toBe(2);
      expect(scope['k']).toBe(10);
      expect(service.simpleEval('k', context, options)).toBe('p');
      expect(service.simpleEval('this.k', context, options)).toBe('p');
    });
  });
});
