import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext, EvalScope } from '../../internal/classes/eval';
import { Context } from '../../internal/classes/common';

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
      // The receiver changes at the call and nowhere else: a member read
      // substituting `thisArg` would answer 'Other'.
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
});
