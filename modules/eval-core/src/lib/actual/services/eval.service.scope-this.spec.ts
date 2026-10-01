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

    it('(e) should not receive the lookup function for a lookup-resolved key', () => {
      // What an unresolved receiver gets: `getThis` answers nothing, and the
      // member visitor falls back to the object it was evaluating - the
      // context itself, which is what `this` evaluates to.
      const fn = function (this: unknown) { return this; };
      const lookup = (key: unknown) => key === 'fn' ? fn : undefined;
      const context = new EvalContext({}, {});
      context.lookups.push(lookup);
      const state = service.createState(context);

      const receiver = service.eval('this.fn()', state);

      expect(receiver).not.toBe(lookup);
      expect(receiver).toBe(state.context);
    });
  });
});
