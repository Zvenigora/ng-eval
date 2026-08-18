import { Injector, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { EvalService } from '@zvenigora/ng-eval-core';
// `createEvalSignal` and `createSignalContext` are **not** on the core's
// allowed import list (plan S 3.4.5, S 5). They are legal here because S 5's
// list governs `src/lib/` and `reactive/src/lib/` and explicitly not specs -
// so a reviewer running the import-list check should read it against
// `field-context.ts`, not against this file. Both are load-bearing rather
// than convenient: `invalidate()` exists only on an `EvalSignal`, so the
// second half of S 3.4.2's rule is unassertable without one, and the
// characterization spec at the bottom is *about* `createSignalContext`.
import {
  SignalContextSource,
  SignalContextWriteError,
  createEvalSignal,
  createSignalContext,
} from '@zvenigora/ng-eval-signals';
// Through the published subpath, not a relative path (plan S 6.1). It resolves
// only because of this step's `tsconfig.base.json` `paths` entry, and it is
// permitted here - rather than from a `reactive/` spec - because
// `@nx/enforce-module-boundaries` exempts a self-import that *crosses* entry
// points and rejects one that does not.
import { createControlSource } from '@zvenigora/ng-eval-forms/reactive';
import { createFieldContext } from './field-context';

describe('createFieldContext', () => {

  let service: EvalService;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    injector = TestBed.inject(Injector);
  });

  // The two sources carry *disjoint* keys throughout, except in the
  // precedence block below, where a collision is the subject. A fixture that
  // put the same name in both elsewhere would let one half satisfy assertions
  // written for the other, and the composition this step exists to prove is
  // exactly the part that would go untested.

  it('should resolve a field key through the field half', () => {
    const context = createFieldContext({ country: 'CA' }, { value: 7 });

    expect(service.simpleEval('value * 2', context)).toEqual(14);
  });

  it('should resolve a form key through the pushed lookup', () => {
    const context = createFieldContext({ country: 'CA' }, { value: 7 });

    expect(service.simpleEval('country', context)).toEqual('CA');
  });

  it('should resolve both halves within one expression', () => {
    const context = createFieldContext({ country: 'CA' }, { value: 7 });

    expect(service.simpleEval('country === "CA" && value > 5', context))
      .toEqual(true);
  });

  it('should unwrap a signal in the field half', () => {
    const context = createFieldContext({ country: 'CA' }, { value: signal(7) });

    expect(service.simpleEval('value', context)).toEqual(7);
  });

  it('should unwrap a signal in the form half', () => {
    // Step 1 deferred this assertion rather than pinning either answer, and
    // this is that comment doing its job: S 3.4.2's fork is settled to
    // candidate A - the form half borrows upstream's resolver - so the
    // deferral is replaced by the assertion it was deferring.
    //
    // This is the **only** case that separates A from B. Under B the lookup
    // returns the signal function un-called, which passes every other
    // assertion in this file.
    const context = createFieldContext({ country: signal('CA') }, { value: 7 });

    expect(service.simpleEval('country', context)).toEqual('CA');
    expect(typeof service.simpleEval('country', context)).toEqual('string');
  });

  it('should resolve a form key holding signal(undefined) to undefined', () => {
    // Row 2 of S 3.4.2's table, and the reason A was chosen rather than a
    // reason A is merely supported: under B this resolves the signal
    // *function*, which is truthy, so `visible: "country"` renders the field
    // precisely when its value is absent - and an empty control is every
    // form's first render.
    const context = createFieldContext(
      { country: signal<string | undefined>(undefined) },
      { value: 7 }
    );

    expect(service.simpleEval('country', context)).toBeUndefined();
    expect(service.simpleEval('country ? 1 : 0', context)).toEqual(0);
  });

  it('should correct a form key under caseInsensitive', () => {
    // The third gap A closes. The options reach the borrowed resolver because
    // the composition passes them to *both* halves.
    const context = createFieldContext(
      { Country: 'CA' },
      { value: 7 },
      { caseInsensitive: true }
    );

    expect(context.get('country')).toEqual('CA');

    // And through the walk, not only through the adapter's own API. A
    // `get`-level assertion alone cannot see a defect in how the *evaluator*
    // consumes the corrected key - it calls exactly the half that works. Same
    // pairing upstream's own case-insensitivity specs use, for the same reason.
    expect(service.simpleEval('country', context)).toEqual('CA');
  });

  it('should still reject a write through the composed context', () => {
    const context = createFieldContext({ country: 'CA' }, { value: 7 });

    // The write policy (plan S 3.4.4, phase-3 S 9.4) is load-bearing rather
    // than incidental, so it is asserted rather than assumed: it holds only
    // because the field half is a `createSignalContext` call, which is the
    // line this step rewrote around.
    expect(() => service.simpleEval('value = 1', context))
      .toThrow(/Cannot assign to 'value'/);

    // Through `simpleEval` the class identity is lost - `EvalService` catches
    // and rethrows `new Error(error.message)` - so the type is pinned at the
    // one call that preserves it. Same split as the upstream spec.
    expect(() => context.set('value', 1)).toThrow(SignalContextWriteError);
  });

  it('should resolve a key absent from both sources to undefined', () => {
    const context = createFieldContext({ country: 'CA' }, { value: 7 });

    expect(context.get('missing')).toBeUndefined();
  });

  it('should take its form half from the /reactive adapter', () => {
    // The cross-entry-point seam, exercised from the core's side and resolved
    // through the published subpath. A relative import would pass on a package
    // whose entry points are not wired at all - which is what this step exists
    // to prove.
    const group = new FormGroup({ country: new FormControl('CA') });
    const source = createControlSource(group, { injector });

    const context = createFieldContext(source, { value: 7 });

    expect(service.simpleEval('country === "CA" && value > 5', context))
      .toEqual(true);
  });

  it('should build a separate context per call', () => {
    // One context per field, never one shared (plan S 3.4.1): a scope left on
    // a shared context would be read by every other field first.
    const first = createFieldContext({ country: 'CA' }, { value: 1 });
    const second = createFieldContext({ country: 'CA' }, { value: 2 });

    expect(first).not.toBe(second);
    expect(service.simpleEval('value', first)).toEqual(1);
    expect(service.simpleEval('value', second)).toEqual(2);
  });

  describe('precedence', () => {

    // Plan S 3.4.3. Three assertions, not two: the third is the only one that
    // separates the two-lookup mechanism from the rejected joined record,
    // under which a field key bound to `undefined` would have *shadowed* the
    // form value instead of falling through to it.

    it('should resolve a colliding key to the field', () => {
      const context = createFieldContext({ value: 'form' }, { value: 'field' });

      expect(service.simpleEval('value', context)).toEqual('field');
    });

    it('should show the form value once the field key is removed', () => {
      // What distinguishes "the field wins" from "the form source was never
      // consulted at all" - the first assertion alone cannot tell those apart.
      const fieldSource: SignalContextSource = { value: 'field' };
      const context = createFieldContext({ value: 'form' }, fieldSource);

      expect(service.simpleEval('value', context)).toEqual('field');

      delete fieldSource['value'];

      expect(service.simpleEval('value', context)).toEqual('form');
    });

    it('should fall through to the form value for a field key holding undefined', () => {
      // An empty `FormControl`, which is the common case and not an exotic
      // one. `EvalContext.get` treats `undefined` as absent at every step, so
      // a present-but-undefined field key is indistinguishable from a missing
      // one and the form value shows through. Documented as a limitation.
      const context = createFieldContext({ value: 'form' }, { value: undefined });

      expect(service.simpleEval('value', context)).toEqual('form');
    });

    it('should give precedence back to the field when its value appears', () => {
      // Precedence is value-dependent and time-varying: a field does not
      // *have* precedence, it has it while its value is present.
      //
      // Read through a `computed()` rather than through two bare `simpleEval`
      // calls, because the claim is that the fall-through is **reactive** -
      // that the field half called the signal on the way to returning
      // `undefined`, and so recorded the dependency. A write followed by a
      // read on the same tick returns the new value whether or not any
      // dependency exists, so the recompute count is what carries the claim
      // and the value alone would not.
      const value = signal<string | undefined>(undefined);
      const context = createFieldContext({ value: 'form' }, { value });

      let recomputes = 0;
      const resolved = computed(() => {
        recomputes++;
        return service.simpleEval('value', context);
      });

      expect(resolved()).toEqual('form');
      expect(recomputes).toEqual(1);

      value.set('field');

      expect(resolved()).toEqual('field');
      expect(recomputes).toEqual(2);
    });
  });

  describe('the live key set', () => {

    // Plan S 3.4.2's two-part rule. Both halves are asserted, or the rule is
    // only half-tested: resolution is live, and appearance is *not* reactive.

    it('should resolve a form key added after construction', () => {
      // The half that catches a regression to a copy-based join: a third
      // object built at construction time would still read `undefined` here.
      const formSource: SignalContextSource = { country: 'CA' };
      const context = createFieldContext(formSource, { value: 7 });

      expect(context.get('region')).toBeUndefined();

      formSource['region'] = 'west';

      expect(context.get('region')).toEqual('west');
    });

    it('should resolve a field key added after construction', () => {
      const fieldSource: SignalContextSource = { value: 7 };
      const context = createFieldContext({ country: 'CA' }, fieldSource);

      expect(context.get('label')).toBeUndefined();

      fieldSource['label'] = 'Region';

      expect(context.get('label')).toEqual('Region');
    });

    it('should not recompute for a key that appeared after it read as missing', () => {
      // The load-bearing half. An expression that read a then-missing key
      // subscribed to nothing, so nothing tells it the key now exists - the
      // owner of the source calls `invalidate()` when the *key set* changes.
      // A spec asserting only the liveness above would pass on a library that
      // promised reactivity it cannot deliver.
      const formSource: SignalContextSource = { country: 'CA' };
      const context = createFieldContext(formSource, { value: 7 });

      const region = createEvalSignal('region', context, { injector });

      expect(region()).toBeUndefined();

      formSource['region'] = 'west';

      // Resolution is live - the same context reads it...
      expect(context.get('region')).toEqual('west');

      // ...and the signal does not, because it recorded no dependency on a
      // key that did not exist.
      expect(region()).toBeUndefined();

      region.invalidate();

      expect(region()).toEqual('west');

      region.destroy();
    });
  });

  describe('the /signals shape', () => {

    // Plan S 3.4.5's second check, and S 9's sketch executed: the core is
    // called through a plain function - a `LogicFn`, in Signal Forms' terms -
    // that the *spec* invokes inside a `computed()` the spec owns. No
    // `computed()`, no `destroy()` and no `DestroyRef` of the library's is
    // involved, which is what makes the core usable from an adapter that
    // brings its own reactivity.
    //
    // This check is not sufficient alone and is not trusted to be: it would
    // still pass on a core that wrapped its resolvers in a `computed()` of its
    // own, because this outer `computed()` would track straight through it.
    // The empty `@angular/core` import list in `field-context.ts` is the only
    // thing that catches that, and it is read from the diff.

    it('should track per key through a LogicFn-shaped call', () => {
      const country = signal('US');
      const other = signal(1);
      const context = createFieldContext(
        { country, other },
        { value: signal(7) }
      );

      // The `LogicFn`: a plain function, no reactivity of its own.
      const isUs = () => service.simpleEval('country === "US"', context);

      let recomputes = 0;
      const visible = computed(() => {
        recomputes++;
        return isUs();
      });

      expect(visible()).toEqual(true);
      expect(recomputes).toEqual(1);

      // An unread key changing must not recompute. This is the assertion that
      // proves the tracking is per key rather than per source: a resolver that
      // read the whole record - `Object.keys`, a spread, a memo keyed on the
      // source - would recompute here.
      other.set(2);

      expect(visible()).toEqual(true);
      expect(recomputes).toEqual(1);

      // A read key changing must recompute.
      country.set('CA');

      expect(visible()).toEqual(false);
      expect(recomputes).toEqual(2);
    });
  });
});

describe('createSignalContext liveness (characterization)', () => {

  // **This asserts `@zvenigora/ng-eval-signals` behaviour, not ours.**
  //
  // `createFieldContext`'s live key set (S 3.4.2) rests on `createSignalContext`
  // resolving against a *live* source. That behaviour is published and real -
  // the resolver closes over the source and reads it at resolve time - but it
  // is **not promised**: it is not in `phase-3-plan.md` S 9, not in
  // `createSignalContext`'s JSDoc, and no eval-signals spec has a
  // mutate-after-construction case at all (plan S 1.3, last row).
  //
  // So an upstream refactor that memoized the key set would break a documented
  // README rule of *this* library with no red test in either project. This
  // spec is the available substitute for amending someone else's contract,
  // which S 2 forbids from here. If it goes red, the finding is "upstream
  // changed", not "this library is broken" - and S 3.4.2's mechanism needs
  // rewriting before the red is cleared.

  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('should resolve a key added to the source after construction', () => {
    const source: SignalContextSource = { country: 'CA' };
    const context = createSignalContext(source);

    expect(context.get('region')).toBeUndefined();

    source['region'] = 'west';

    expect(context.get('region')).toEqual('west');
    expect(service.simpleEval('region', context)).toEqual('west');
  });

  it('should resolve a key added to the source under caseInsensitive', () => {
    // The case-insensitive path is the one a memoization would land on first:
    // it calls `Object.keys(source)` on every miss, and caching that result
    // is the obvious optimisation. Asserted separately for that reason.
    const source: SignalContextSource = { Country: 'CA' };
    const context = createSignalContext(source, { caseInsensitive: true });

    expect(context.get('region')).toBeUndefined();

    source['Region'] = 'west';

    expect(context.get('region')).toEqual('west');
    expect(service.simpleEval('region', context)).toEqual('west');
  });
});
