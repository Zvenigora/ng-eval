import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext } from '../../internal/classes/eval';
import { guardedReceiver } from '../../internal/visitors/context-receiver';

/**
 * A function the context holds is called with a **guarded view** of the
 * `EvalContext`, not the context and not the object behind it
 * (`docs/a35/plan.md` § 8 q6 and q7, step 8). The view resolves `push` and
 * `pop` against the real context; every other read throws, and a write throws
 * because the view's target is frozen.
 *
 * Up to 0.12.1 four receivers handed the function the real thing: a bare
 * call's, a bare tag's, and `this.fn()`'s for a key a lookup resolves (the
 * context) or a key the original holds (the original itself). A native method
 * that returns its `this` therefore returned it as data, with no `this`
 * expression anywhere - so step 7's positional refusal does not see it, and
 * neither does the funnel, which sees only values that pass through the walk's
 * own stack (`docs/backlog.md` A39).
 *
 * **R1–R4 are the route, one per receiver**, end to end through `EvalService`,
 * and each is red against this step's parent commit. **B1–B3 are the three
 * ways out of the view that are not a property read** - the prototype, the own
 * keys, a descriptor - and **S2–S4 run all three against the other three
 * receivers**, so every receiver has a structural pin and not only a route.
 *
 * Three things about how these are written, each answering a defect the step's
 * code review found in the first draft:
 * - **An R case fails at the read it is about.** It reaches for the context by
 *   the public name `original`, so the view's own refusal is what it catches,
 *   named in the message. The first draft caught a `TypeError` thrown further
 *   down, which would have stayed green had the route reopened.
 * - **No case depends on the context's field order.** The first draft indexed
 *   an own field by position, so a reordering would have turned the case green
 *   with the route open. The structural pins read no field at all.
 * - **The view's identity is pinned** (N4): every call gets its own view, and
 *   nothing retains one. It first pinned the opposite, a cached view per
 *   context, until the cache was measured as the cost on the one-shot path.
 *
 * `valueOf` is the subject because it is native, benign and returns its
 * `this`: the sandbox has no reason to refuse it, which is what leaves the
 * receiver as the only thing between the expression and the context.
 */
describe('EvalService - the guarded receiver (A39)', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  /** Native, benign, and returns its `this`. */
  const valueOf = Object.prototype.valueOf;

  /** The view's refusal of a read, compared by its whole message. */
  const blocked = (key: string): Error =>
    new Error(`Access to "${key}" on the evaluation context is blocked for security reasons`);

  /**
   * The route, parameterised by how the expression reaches the receiver. Each
   * form asks the receiver for the context's own object by name, then spreads
   * what it holds into a native call - the shape that hands a value to native
   * code without the walk pushing it.
   */
  const route = (receiver: string): string =>
    `["1+1"].map(...Object.values(Reflect.get(${receiver}, "original")).slice(0, 1))`;

  /** A context whose first value is the dangerous one, plus what the route needs. */
  const routeContext = () => ({ eval, Object, Reflect, v: valueOf });

  /** An `EvalContext` that resolves `v` only through a lookup. */
  const lookupContext = (): EvalContext => {
    const context = new EvalContext({ eval, Object, Reflect }, {});
    context.lookups.push((key) => key === 'v' ? valueOf : undefined);
    return context;
  };

  /**
   * What a function called through `run` receives as its `this`, read
   * structurally: no property of the context is touched, so nothing here
   * depends on what the context holds or in what order.
   */
  const receiverFacts = (run: (probe: () => number, context: Record<string, unknown>) => void) => {
    const facts: Record<string, unknown> = {};
    const probe = function (this: object) {
      facts['ownKeys'] = Reflect.ownKeys(this);
      facts['prototype'] = Object.getPrototypeOf(this);
      facts['descriptor'] = Object.getOwnPropertyDescriptor(this, '_original');
      return 1;
    };
    run(probe as unknown as () => number, { Object, Reflect });
    return facts;
  };

  /** What every receiver must look like: nothing of the context, by any route. */
  const nothingOfTheContext = {
    ownKeys: [],
    prototype: null,
    descriptor: undefined,
  };

  describe('the route through each receiver', () => {

    it('R1: should refuse the route through a bare call\'s receiver', () => {
      expect(() => service.simpleEval(route('v()'), routeContext()))
        .toThrow(blocked('original'));
    });

    it('R2: should refuse the route through a bare tag\'s receiver', () => {
      expect(() => service.simpleEval(route('v`x`'), routeContext()))
        .toThrow(blocked('original'));
    });

    it('R3: should refuse the route through this.fn() for a lookup-resolved key', () => {
      // `getThis` answers nothing for a lookup-resolved key, so the member
      // visitor falls back to the context it was evaluating.
      expect(() => service.simpleEval(route('this.v()'), lookupContext()))
        .toThrow(blocked('original'));
    });

    it('R4: should refuse the route through this.fn() for a key the original holds', () => {
      // Here `getThis` answers with the original, which is not the context and
      // not an `EvalContext` at all - so the receiver's origin has to be
      // carried out of `evaluateMember` for the guard to see it.
      expect(() => service.simpleEval(route('this.v()'), routeContext()))
        .toThrow(blocked('original'));
    });
  });

  describe('the ways out of the view that are not a property read', () => {

    // Each would reach the real context if the view's proxy target were the
    // context rather than a frozen stand-in: the prototype carries the
    // `original` getter, the own keys name the private fields, and the
    // descriptor of one carries its value. None of the three goes through the
    // `get` trap, so none is covered by the refusal the R cases catch.
    it('B1: should report a null prototype for the view', () => {
      expect(service.simpleEval('Object.getPrototypeOf(v())', { Object, v: valueOf }))
        .toBeNull();
    });

    it('B2: should report no own keys for the view', () => {
      expect(service.simpleEval('Reflect.ownKeys(v())', { Object, Reflect, v: valueOf }))
        .toEqual([]);
    });

    it('B3: should report no property descriptor for a field of the context', () => {
      expect(service.simpleEval('Object.getOwnPropertyDescriptor(v(), "_original")',
        { Object, v: valueOf })).toBeUndefined();
    });

    it('S2: should give a bare tag\'s receiver nothing of the context', () => {
      expect(receiverFacts((probe, context) =>
        service.simpleEval('p`x`', { ...context, p: probe }))).toEqual(nothingOfTheContext);
    });

    it('S3: should give this.fn()\'s receiver nothing, for a lookup-resolved key', () => {
      expect(receiverFacts((probe) => {
        const context = new EvalContext({}, {});
        context.lookups.push((key) => key === 'p' ? probe : undefined);
        service.simpleEval('this.p()', context);
      })).toEqual(nothingOfTheContext);
    });

    it('S4: should give this.fn()\'s receiver nothing, for a key the original holds', () => {
      expect(receiverFacts((probe, context) =>
        service.simpleEval('this.p()', { ...context, p: probe }))).toEqual(nothingOfTheContext);
    });

    it('S5: should leave obj.fn() alone when obj is the original itself', () => {
      // The origin half of the guard's condition, and the only case that
      // makes it load-bearing: a context that holds a reference to itself is
      // reached here as an ordinary member call, which `evaluateMember`
      // marks as not context-resolved, so the receiver stays the real
      // object. Guarding on identity alone - without the fourth slot - would
      // silently narrow this, and every other case in all three projects
      // would stay green (`docs/a35/plan.md` § 8 q7, probe (iv)).
      const seen: unknown[] = [];
      const context: Record<string, unknown> = {
        probe: function (this: unknown) { seen.push(this); return 1; },
      };
      context['self'] = context;

      service.simpleEval('self.probe()', context);

      expect(seen).toHaveLength(1);
      expect(seen[0]).toBe(context);
      expect(Reflect.ownKeys(seen[0] as object)).toEqual(['probe', 'self']);
    });
  });

  describe('what the view still does', () => {

    it('N1: should resolve push and pop against the real context', () => {
      // The documented use of the receiver `this` (`eval-signals`' README): a
      // function the context holds pushes a scope that later reads see, and
      // pops it again.
      const context = {
        enter: function (this: EvalContext) { this.push({ x: 'scoped' }); return 1; },
        leave: function (this: EvalContext) { this.pop(); return 2; },
        x: 'original',
      };

      expect(service.simpleEval('[enter(), x, leave(), x]', context))
        .toEqual([1, 'scoped', 2, 'original']);
    });

    it('N2: should throw a named refusal for any other read', () => {
      const seen: string[] = [];
      const context = {
        probe: function (this: Record<string, unknown>) {
          for (const key of ['original', 'type', 'get', '_original']) {
            try { seen.push(`${key}: reached ${String(this[key])}`); }
            catch (e) { seen.push((e as Error).message); }
          }
          return 1;
        },
      };

      service.simpleEval('probe()', context);

      expect(seen).toEqual([
        blocked('original').message,
        blocked('type').message,
        blocked('get').message,
        blocked('_original').message,
      ]);
    });

    it('N2b: should throw for a write, which the frozen target refuses', () => {
      // Up to 0.12.1 this landed on the `EvalContext` as an own property.
      let message = 'no throw';
      const context = {
        probe: function (this: Record<string, unknown>) {
          try { this['x'] = 1; } catch (e) { message = (e as Error).message; }
          return 1;
        },
      };

      service.simpleEval('probe()', context);

      expect(message).toContain('not extensible');
    });

    it('N3: should report only push and pop as present on the view', () => {
      const seen: boolean[] = [];
      const context = {
        probe: function (this: object) {
          seen.push('push' in this, 'pop' in this, 'original' in this, 'get' in this);
          return 1;
        },
      };

      service.simpleEval('probe()', context);

      expect(seen).toEqual([true, true, false, false]);
    });

    it('N5: should forward the class\'s push, not one the expression planted on the context', () => {
      // `this.k = v` writes onto the `EvalContext` itself, and a plain context
      // consults no policy about it (`docs/backlog.md` A42). An own property
      // shadows a prototype method, so a view that read `context.push` would
      // forward whatever was planted, bound to the real context - and a host
      // function that returns what its `this.push(...)` returns would hand
      // the context straight back into the walk. The view resolves both
      // methods from the context's class instead (`context-receiver.ts`).
      //
      // The returned value is what matters: it must hold nothing of the
      // context. `seen` records what the host function actually received.
      const seen: unknown[] = [];
      const context = EvalContext.fromContext({
        hand: function (this: { push: (x: unknown) => unknown }) {
          const returned = this.push('x');
          seen.push(returned);
          return returned;
        },
      }, {});

      // A planted `push` that returns its receiver, in place of the real one.
      //
      // **Set here rather than written by the expression**, since Revision 16:
      // `(this.push = give, hand())` is how this case used to plant, and that
      // write is now refused outright - `eval.service.context-write.spec.ts`
      // W1 is what pins the refusal. Were the plant still written from the
      // expression, this case would assert the write refusal a second time
      // and the view's resolution not at all, which is the layer it is about.
      (context as unknown as Record<string, unknown>)['push'] =
        function (this: unknown) { return this; };

      const planted = service.simpleEval('hand()', context as never);

      expect(seen).toHaveLength(1);
      // The real `push` returns undefined, and that is what came back.
      expect(planted).toBeUndefined();
      expect(seen[0]).toBeUndefined();
    });

    it('N6: should refuse push when the context\'s class does not provide one', () => {
      // Resolution is from the class, so a context whose class has no such
      // method leaves the key refused as any other is - not throwing from a
      // bind, and never falling back to an instance property.
      const bare = Object.create(null) as EvalContext;
      expect(() => (guardedReceiver(bare) as { push: unknown }).push)
        .toThrow(blocked('push'));
      expect('push' in (guardedReceiver(bare) as object)).toBe(false);
    });

    it('N4: should give every call its own view, each honouring the whole contract', () => {
      // **Deliberate contract change**, made before release (`docs/a35/plan.md`
      // N-d). This case first pinned the opposite - one view per context,
      // cached in a `WeakMap`, so `this` was the same object across calls and
      // walks. Measured on the one-shot path, where each evaluation builds a
      // fresh context, that cache never hit and retaining its entries made a
      // bare call ~45% slower than before the guard; an uncached view came in
      // within step 7's own spread. So nothing retains a view any more, and
      // this case pins the no-retention decision: a function must not key
      // anything on its `this`.
      //
      // Distinct objects alone would pass against a view rebuilt with half
      // its contract missing, so each one is held to all of it.
      const seen: object[] = [];
      const context = new EvalContext(
        { probe: function (this: object) { seen.push(this); return 1; } }, {});

      service.simpleEval('[probe(), probe()]', context);
      service.simpleEval('probe()', context);

      expect(seen).toHaveLength(3);
      // Different within one walk, and across walks on one context.
      expect(seen[1]).not.toBe(seen[0]);
      expect(seen[2]).not.toBe(seen[0]);
      expect(seen[2]).not.toBe(seen[1]);

      for (const view of seen) {
        expect(view).not.toBe(context);
        expect(Reflect.ownKeys(view)).toEqual([]);
        expect(Object.getPrototypeOf(view)).toBeNull();
        expect(Object.getOwnPropertyDescriptor(view, '_original')).toBeUndefined();
        expect(typeof (view as { push: unknown }).push).toBe('function');
        expect(typeof (view as { pop: unknown }).pop).toBe('function');
        expect(() => (view as { original: unknown }).original).toThrow(blocked('original'));

        // Each view's `push` is the real one: it acts on this context's scope
        // stack. `typeof` alone would pass against any function at all,
        // planted or forwarded from somewhere else.
        const before = context.scopes.length;
        (view as { push: (c: object) => void }).push({ probe: 1 });
        expect(context.scopes.length).toBe(before + 1);
        expect(context.get('probe')).toBe(1);
        (view as { pop: () => void }).pop();
        expect(context.scopes.length).toBe(before);
      }
    });
  });
});
