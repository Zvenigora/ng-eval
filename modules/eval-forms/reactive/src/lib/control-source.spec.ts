import {
  EnvironmentInjector,
  Injector,
  computed,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { EvalService } from '@zvenigora/ng-eval-core';
import { createFieldContext } from '@zvenigora/ng-eval-forms';
// Legal in a spec: plan S 5's import list governs `src/lib/` and
// `reactive/src/lib/`, explicitly not specs. Load-bearing rather than
// convenient - `invalidate()` exists only on an `EvalSignal`, and trap 3's
// whole assertion is that it restores a property the mirror could not see go
// stale.
import { createEvalSignal } from '@zvenigora/ng-eval-signals';
import { Subject } from 'rxjs';
import { createControlSource } from './control-source';

describe('createControlSource', () => {

  let service: EvalService;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    injector = TestBed.inject(Injector);
  });

  // A real `FormGroup`, never a stub with a `valueChanges` Subject (plan S 6.1):
  // the behaviours this source is built on are Angular's own, and a fake emits
  // whatever the spec author believed.
  //
  // Typed with an index signature rather than left to inference, because
  // `addControl` / `removeControl` on a group whose control set is statically
  // known are constrained by their `this` type to the index-signature form -
  // and trap 5 is *about* changing the control set. `noPropertyAccessFromIndex
  // Signature` is why every access below is `controls['country']`.
  const group = (country = 'CA'): FormGroup<{ [key: string]: AbstractControl }> =>
    new FormGroup<{ [key: string]: AbstractControl }>({
      country: new FormControl(country),
      age: new FormControl(30),
    });

  // How many subscribers a control's `valueChanges` currently has. This is the
  // observable form of "the subscription was released" - `createControlSource`
  // returns a plain record and hands back no subscription objects, so the
  // count on the real control is what trap 5's churn assertion can actually
  // read (plan S 3.5.5, amended in step 3). `valueChanges` is an
  // `EventEmitter`, hence a `Subject`.
  const observers = (control: AbstractControl): number =>
    (control.valueChanges as unknown as Subject<unknown>).observers.length;

  // The record holds *values* behind accessors, not signals (plan S 3.5.5), so
  // the per-key identity trap 5 asserts is the accessor's.
  const accessor = (
    source: Record<string, unknown>,
    key: string
  ): (() => unknown) | undefined =>
    Object.getOwnPropertyDescriptor(source, key)?.get;

  it('should expose each control value under its control name', () => {
    const source = createControlSource(group(), { injector });

    expect(source).toEqual({ country: 'CA', age: 30 });
  });

  it('should include a disabled control', () => {
    // The discriminating case: `group.value` omits disabled controls, so an
    // implementation that returned it would pass every other assertion here
    // and silently drop a field from the expression context.
    const form = group();
    form.controls['age'].disable();

    const source = createControlSource(form, { injector });

    expect(form.value).toEqual({ country: 'CA' });
    expect(source).toEqual({ country: 'CA', age: 30 });
  });

  it('should feed the form half of a field context', () => {
    // The same seam as `field-context.spec.ts`'s subpath case, approached from
    // the other side: this one resolves `@zvenigora/ng-eval-forms`, that one
    // resolves `@zvenigora/ng-eval-forms/reactive`. Each entry point's mapping
    // is only provable from the *other* one's spec folder, so the pair is not
    // redundant - dropping either leaves one mapping unexercised.
    const source = createControlSource(group(), { injector });
    const context = createFieldContext(source, { value: 5 });

    expect(service.simpleEval('country === "CA" && age > value', context))
      .toEqual(true);
  });

  describe('reactivity', () => {

    // Recompute counts, per phase-3-plan S 6.1 - the value alone proves
    // nothing, because a re-read on the same tick returns the new value
    // whether or not a dependency was ever recorded.

    it('should recompute for a control the expression named', () => {
      const form = group();
      const context = createFieldContext(
        createControlSource(form, { injector }),
        {}
      );

      let recomputes = 0;
      const visible = computed(() => {
        recomputes++;
        return service.simpleEval('country === "CA"', context);
      });

      expect(visible()).toEqual(true);
      expect(recomputes).toEqual(1);

      form.controls['country'].setValue('US');

      expect(visible()).toEqual(false);
      expect(recomputes).toEqual(2);
    });

    it('should not recompute for a control the expression never named', () => {
      // The negative case, and the one that proves the mirror is per control
      // rather than per group: a group-level mirror collapses every field into
      // one signal, so `age` moving would recompute an expression that only
      // ever read `country`.
      const form = group();
      const context = createFieldContext(
        createControlSource(form, { injector }),
        {}
      );

      let recomputes = 0;
      const visible = computed(() => {
        recomputes++;
        return service.simpleEval('country === "CA"', context);
      });

      expect(visible()).toEqual(true);
      expect(recomputes).toEqual(1);

      form.controls['age'].setValue(31);

      expect(visible()).toEqual(true);
      expect(recomputes).toEqual(1);
    });
  });

  describe('trap 1 - a disabled control stays readable', () => {

    // Plan S 3.5.1. A disabled control is excluded from its parent's aggregate
    // value and there is no `rawValueChanges`, so a group-backed mirror loses
    // the field entirely - and this library *computes* disablement, so one
    // field's rule would silently blank the value every other field's rules
    // resolve against.

    it('should read a control disabled before the source was built', () => {
      const form = group();
      form.controls['country'].disable();

      const context = createFieldContext(
        createControlSource(form, { injector }),
        { value: 30 }
      );

      // The aggregate has already lost it...
      expect(form.value).toEqual({ age: 30 });

      // ...and the expression - evaluated for the *age* field, naming a
      // sibling - still resolves it.
      expect(service.simpleEval('country === "CA" && value > 5', context))
        .toEqual(true);
    });

    it('should read a control disabled after the source was built', () => {
      // The ordering that actually occurs: S 3.5.1's failure is one rule
      // disabling a field at runtime, not a form that started out disabled.
      // Strictly harder than the case above - the mirror has to survive the
      // `disable()` emission rather than never having seen the control enabled.
      const form = group();
      const context = createFieldContext(
        createControlSource(form, { injector }),
        { value: 30 }
      );

      expect(service.simpleEval('country', context)).toEqual('CA');

      form.controls['country'].disable();

      expect(form.value).toEqual({ age: 30 });
      expect(service.simpleEval('country', context)).toEqual('CA');
    });
  });

  describe('trap 3 - emitEvent false defeats the mirror', () => {

    // Plan S 3.5.3, asserted as **current behaviour**. The observable is the
    // only signal there is, so a consumer who suppresses it gets a frozen
    // property with no error - and `invalidate()` is the documented hatch for
    // this one case. A spec asserting the *right* answer would have to fail.

    it('should leave the property stale, and restore it on invalidate', () => {
      const form = group();
      const context = createFieldContext(
        createControlSource(form, { injector }),
        {}
      );

      const visible = createEvalSignal('country === "CA"', context, { injector });

      expect(visible()).toEqual(true);

      form.controls['country'].setValue('US', { emitEvent: false });

      // Pinned limitation: nothing emitted, so nothing recomputed.
      expect(visible()).toEqual(true);

      visible.invalidate();

      // The hatch. This half is what forced the record to hold values behind
      // accessors rather than the mirrored signals (plan S 3.5.5, amended):
      // against a signal-valued record the mirrored signal is *itself* the
      // stale thing, so this still reads `true` and the hatch S 3.5.3
      // documents does not exist.
      expect(visible()).toEqual(false);

      visible.destroy();
    });
  });

  describe('trap 4 - the subscription lifetime is the injector\'s', () => {

    // Plan S 3.5.4. `toSignal` takes its `DestroyRef` from the ambient
    // injection context unless given an `injector`, and a form built in a
    // service is routinely outside one.

    it('should throw when constructed with no injector', () => {
      // Forced past the type, which makes `injector` required: the assertion
      // is that the option is genuinely *used*. An implementation that reached
      // for `manualCleanup` instead would construct happily here and leak
      // every subscription it ever made.
      //
      // Matched on NG0203 rather than left bare, because a bare `toThrow()`
      // does not assert what the comment above claims: a `manualCleanup`
      // implementation would still reach `injector.get(DestroyRef)` for the
      // `group.events` subscription and throw a `TypeError`, and the
      // assertion would stay green. The code is ordered so `toSignal` is
      // reached first precisely so this error is the one a consumer sees.
      expect(() => createControlSource(group(), {} as { injector: Injector }))
        .toThrow(/NG0203/);
    });

    it('should construct outside an injection context when given one', () => {
      // These specs run outside an injection context, so a `toSignal` that did
      // not receive the injector would throw NG0203 here. Asserted through a
      // working read rather than `not.toThrow()` alone - the claim is that the
      // mirror is usable, and "did not throw" would also hold for a source
      // that returned an empty record.
      const context = createFieldContext(
        createControlSource(group(), { injector }),
        {}
      );

      expect(service.simpleEval('country', context)).toEqual('CA');
    });

    it('should release its subscriptions when that injector is destroyed', () => {
      const form = group();
      const scoped = createEnvironmentInjector(
        [],
        TestBed.inject(EnvironmentInjector)
      );

      createControlSource(form, { injector: scoped });

      expect(observers(form.controls['country'])).toEqual(1);
      expect(observers(form.controls['age'])).toEqual(1);

      scoped.destroy();

      expect(observers(form.controls['country'])).toEqual(0);
      expect(observers(form.controls['age'])).toEqual(0);
    });

    it('should stop diffing the control set once that injector is destroyed', () => {
      // The source holds **two** long-lived subscriptions and the assertion
      // above only reaches one: `toSignal` unregisters itself from its own
      // `DestroyRef` whether or not the `group.events` subscription was ever
      // scoped, so every per-control count drops to 0 either way.
      //
      // Asserted through a **replacement** rather than an addition, and the
      // difference is the whole point. After an addition the two
      // implementations are indistinguishable: an unscoped subscriber still
      // runs, but `toSignal` throws NG0205 off the destroyed injector before
      // subscribing to anything, so the record gains no key and the new
      // control gains no observer - exactly what the scoped version produces
      // by not running at all. A replacement takes the branch that touches no
      // injector, so an unscoped subscriber re-points the channel and the
      // record follows the group past its own teardown.
      const form = group();
      const scoped = createEnvironmentInjector(
        [],
        TestBed.inject(EnvironmentInjector)
      );
      const source = createControlSource(form, { injector: scoped });

      scoped.destroy();

      form.setControl('country', new FormControl('XX'));

      expect(source['country']).toEqual('CA');
    });
  });

  describe('trap 5 - a control instance replaced under an existing key', () => {

    // Plan S 3.5.5. The value assertion alone passes against a binding that
    // tears down and rebuilds everything on each `group.events` emission, so
    // the churn is what discriminates: exactly one release, exactly one
    // subscribe, and every other key's entry untouched.

    it('should follow the new instance through a property built before it', () => {
      const form = group('US');
      const context = createFieldContext(
        createControlSource(form, { injector }),
        {}
      );

      // Built *before* the replacement, which is the half a bare `simpleEval`
      // cannot see: a mirror that swapped in a fresh signal per instance would
      // leave this `computed` tracking the dead control's signal, and it would
      // read `'US'` for the life of the binding.
      const country = createEvalSignal('country', context, { injector });

      expect(country()).toEqual('US');

      form.setControl('country', new FormControl('CA'));

      expect(country()).toEqual('CA');

      country.destroy();
    });

    it('should release exactly the replaced control and touch no other', () => {
      const form = group('US');
      const source = createControlSource(form, { injector });

      const dead = form.controls['country'];
      const untouched = form.controls['age'];
      const countryAccessor = accessor(source, 'country');
      const ageAccessor = accessor(source, 'age');

      expect(observers(dead)).toEqual(1);

      const fresh = new FormControl('CA');
      form.setControl('country', fresh);

      expect(observers(dead)).toEqual(0);
      expect(observers(fresh)).toEqual(1);
      expect(observers(untouched)).toEqual(1);

      // One entry per key for the life of the key: the replaced key's accessor
      // is the same object it was, which is what separates re-pointing an
      // instance channel from rebuilding the record.
      expect(accessor(source, 'country')).toBe(countryAccessor);
      expect(accessor(source, 'age')).toBe(ageAccessor);
    });

    it('should subscribe only the added control', () => {
      const form = group();
      const source = createControlSource(form, { injector });
      const context = createFieldContext(source, {});

      const countryAccessor = accessor(source, 'country');
      const added = new FormControl('west');
      form.addControl('region', added);

      expect(observers(added)).toEqual(1);
      expect(observers(form.controls['country'])).toEqual(1);
      expect(accessor(source, 'country')).toBe(countryAccessor);

      // Resolution is live, appearance is not reactive (plan S 3.4.2): a fresh
      // evaluation sees the new key.
      expect(service.simpleEval('region', context)).toEqual('west');
    });

    it('should release only the removed control', () => {
      const form = group();
      const source = createControlSource(form, { injector });

      const removed = form.controls['age'];
      const countryAccessor = accessor(source, 'country');

      form.removeControl('age');

      expect(observers(removed)).toEqual(0);
      expect(observers(form.controls['country'])).toEqual(1);
      expect(accessor(source, 'country')).toBe(countryAccessor);
      expect(Object.prototype.hasOwnProperty.call(source, 'age')).toEqual(false);
    });

    it('should keep diffing after a control named off Object.prototype is removed', () => {
      // S 0's premise is server-supplied field names, and `FormGroup` rejects
      // only keys containing a dot - so `constructor` is a legal field. Once
      // its control is removed, a bare `controls[name]` read resolves
      // `Object` off the prototype instead of `undefined`, and pushing that
      // down a channel throws out of the `group.events` subscriber, which
      // unsubscribes it.
      //
      // The discriminating assertion is that the key is **released**. Under a
      // bare read the removal is misread as a *replacement* by `Object`, so
      // the diff takes the wrong branch: the key is never closed, never
      // leaves the record, and its ticker enters a permanent error state
      // (`Object.valueChanges` is `undefined`, so the `switchMap` project
      // throws). Measured rather than assumed - the throw lands in that key's
      // own subscriber and not back in `sync`, so the diff loop itself
      // survives and `region` below is added under both implementations.
      // Asserting only that would have been vacuous.
      const form = new FormGroup<{ [key: string]: AbstractControl }>({
        constructor: new FormControl('shadowed'),
        country: new FormControl('CA'),
      });
      const source = createControlSource(form, { injector });

      expect(Object.prototype.hasOwnProperty.call(source, 'constructor'))
        .toEqual(true);

      form.removeControl('constructor');

      expect(Object.prototype.hasOwnProperty.call(source, 'constructor'))
        .toEqual(false);

      // Note this key is unreadable *through an expression* whatever the
      // mirror does - `EvalContext.get` consults `original` before `lookups`
      // and a bare property read finds `Object.prototype.constructor` first
      // (plan S 3.4.3's third layer, upstream and out of this phase's scope).
      // The record is where the difference is observable, so that is where it
      // is asserted.
      const added = new FormControl('west');
      form.addControl('region', added);

      expect(observers(added)).toEqual(1);
    });

    it('should need invalidate to see a key removed and re-added', () => {
      // Plan S 3.4.2's rule 2, on the path that makes it concrete. A property
      // that already read `age` recorded a dependency on that key's ticker,
      // and a *key-set* change is exactly the case the rule says is not
      // reactive - so the value stands until the owner of the source
      // invalidates. Asserted as current behaviour, the same way trap 3 is,
      // so step 4's binding inherits a pinned contract rather than a surprise.
      const form = group();
      const context = createFieldContext(
        createControlSource(form, { injector }),
        {}
      );
      const age = createEvalSignal('age', context, { injector });

      expect(age()).toEqual(30);

      form.removeControl('age');

      expect(age()).toEqual(30);
      age.invalidate();
      expect(age()).toBeUndefined();

      form.addControl('age', new FormControl(41));

      expect(age()).toBeUndefined();
      age.invalidate();
      expect(age()).toEqual(41);

      // And it is reactive again from there, without a further invalidate -
      // the recompute above read the re-added key's ticker, so the dependency
      // is recorded on the live one rather than the dead one.
      form.controls['age'].setValue(42);
      expect(age()).toEqual(42);

      age.destroy();
    });
  });
});
