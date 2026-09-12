import {
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';
import { Subject } from 'rxjs';
// Through the entry point's barrel rather than `./field-schema`, which is what
// "driven through the public subpath import" reduces to from *this* folder.
// Step 1 measured all four combinations: a spec under `reactive/src/lib/`
// importing `@zvenigora/ng-eval-forms/reactive` is a boundary **error** - a
// subpath mapping is only provable from the other entry point's spec folder,
// which `field-context.spec.ts` is and does. What is provable here is that the
// three symbols S 5 promises actually leave `reactive/src/public-api.ts`, and
// dropping this import for a relative one to the implementation file would
// stop proving even that.
import {
  FieldProperties,
  FieldSchema,
  FormBinding,
  bindFieldProperties,
} from '../public-api';

describe('bindFieldProperties', () => {

  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  // A real `FormGroup`, never a stub (plan S 6.1), and index-signature typed
  // for the same reason `control-source.spec.ts` is: `addControl` /
  // `removeControl` are constrained by their `this` type to that form, and
  // `noPropertyAccessFromIndexSignature` is why every access is bracketed.
  const group = (
    controls: Record<string, AbstractControl> = {
      country: new FormControl('CA'),
      age: new FormControl(30),
    }
  ): FormGroup<{ [key: string]: AbstractControl }> =>
    new FormGroup<{ [key: string]: AbstractControl }>(controls);

  const observers = (control: AbstractControl): number =>
    (control.valueChanges as unknown as Subject<unknown>).observers.length;

  // The subscriber *object*, not the count. Trap 5's churn assertion is that
  // an untouched key's subscription is the same one it was, which a count of
  // 1 before and 1 after does not say: a teardown-and-resubscribe of
  // everything produces exactly that count.
  const subscriberOf = (control: AbstractControl): unknown =>
    (control.valueChanges as unknown as Subject<unknown>).observers[0];

  // `events` is exposed as `_events.asObservable()`, so the wrapper has no
  // observer count of its own and the private subject is the only place the
  // second long-lived subscription is visible. Reached deliberately rather
  // than behaviourally - see the teardown case that uses it.
  const groupEvents = (form: FormGroup): number =>
    (form as unknown as { _events: Subject<unknown> })._events.observers.length;

  // Step 5 nested the return in a `FormBinding` (plan S 5's amendment) and
  // every case written before it reads a bare record. Adapted here rather
  // than rewritten at forty call sites: the nesting itself is asserted in the
  // teardown block, where the half that motivated it is under test.
  const bindFields = (
    ...args: Parameters<typeof bindFieldProperties>
  ): Record<string, FieldProperties> => bindFieldProperties(...args).fields;

  describe('end to end', () => {

    it('should move a property when the control it names changes', () => {
      const form = group();

      const bound = bindFields(
        [{ name: 'age', visible: "country === 'US'" }],
        form,
        { injector }
      );

      expect(bound['age'].visible?.()).toBe(false);

      form.controls['country'].setValue('US');

      expect(bound['age'].visible?.()).toBe(true);
    });

    it('should bind every field of the schema', () => {
      const bound = bindFields(
        [
          { name: 'country', text: 'country' },
          { name: 'age', visible: 'age > 18', text: "age + ' years'" },
        ],
        group(),
        { injector }
      );

      expect(Object.keys(bound)).toEqual(['country', 'age']);
      expect(bound['country'].text?.()).toBe('CA');
      expect(bound['country'].visible).toBeUndefined();
      expect(bound['age'].visible?.()).toBe(true);
      expect(bound['age'].text?.()).toBe('30 years');
    });

    it('should mirror the group once for the whole form, not once per field', () => {
      // The discriminating count. A binding that called `createControlSource`
      // per field passes every other case in this file - the values are
      // identical - while holding N mirrors over one group: N x the live
      // subscriptions step 5 counts, and trap 5's O(N) diff running N times
      // per `group.events` emission, on a signal that already fires several
      // times per interaction (plan S 3.7, amended in step 4).
      const form = group();

      bindFieldProperties(
        [
          { name: 'country', text: 'country' },
          { name: 'age', text: 'age' },
          { name: 'other', text: 'age' },
        ],
        form,
        { injector }
      );

      expect(observers(form.controls['country'])).toBe(1);
      expect(observers(form.controls['age'])).toBe(1);
    });
  });

  describe('coercion (plan S 3.6)', () => {

    it('should coerce visible by truthiness rather than by equality to true', () => {
      const form = group({ country: new FormControl('CA') });

      const bound = bindFields(
        [{ name: 'country', visible: 'country' }],
        form,
        { injector }
      );

      expect(bound['country'].visible?.()).toBe(true);

      form.controls['country'].setValue('');

      expect(bound['country'].visible?.()).toBe(false);
    });

    it('should coerce an absent value to not visible', () => {
      // S 3.4.3's empty control: `undefined` is the ordinary input here, not
      // an edge case, and it is the same `undefined` a missing key produces.
      const bound = bindFields(
        [{ name: 'country', visible: 'nosuchfield' }],
        group(),
        { injector }
      );

      expect(bound['country'].visible?.()).toBe(false);
    });

    it('should coerce null and undefined to the empty string for text', () => {
      const form = group({ country: new FormControl<string | null>(null) });

      const bound = bindFields(
        [
          { name: 'country', text: 'country' },
          { name: 'missing', text: 'nosuchfield' },
        ],
        form,
        { injector }
      );

      // The failure this rule exists to prevent is the literal text
      // `undefined` rendered into a label.
      expect(bound['country'].text?.()).toBe('');
      expect(bound['missing'].text?.()).toBe('');
    });

    it('should stringify a falsy value that is not null or undefined', () => {
      // The obvious wrong way to write `toText` is "falsy -> ''", which blanks
      // a field whose value is legitimately zero.
      const bound = bindFields(
        [{ name: 'age', text: 'age' }],
        group({ age: new FormControl(0) }),
        { injector }
      );

      expect(bound['age'].text?.()).toBe('0');
    });
  });

  describe('error policy (plan S 3.4.4)', () => {

    // A **call**, and the trailing `()` is the whole assertion. The plan said
    // `user.name.first` raises a `TypeError`; measured, it does not - member
    // access goes through `safeGetProperty`, which returns `undefined` for a
    // null-ish target rather than throwing, so no member access in this
    // evaluator throws at all. Calling the `undefined` it produced does:
    // `call-expression.ts`'s `safeCall` raises
    // `Error('Cannot call undefined or null function')`. Corrected in the plan
    // before this spec was changed.
    //
    // That guard is also exactly why the two halves are not interchangeable: a
    // rule merely *naming* a missing field resolves `undefined` on its own and
    // would pass with no error policy at all, which leaves the throwing case
    // as the only one that discriminates.
    const throwing = 'user.name.first()';

    it('should resolve a throwing expression to the property default, not throw', () => {
      const bound = bindFields(
        [{ name: 'country', visible: throwing, text: throwing }],
        group(),
        { injector }
      );

      expect(bound['country'].visible?.()).toBe(false);
      expect(bound['country'].text?.()).toBe('');
    });

    it('should be a real throw that the default swallows', () => {
      // The probe, written as a spec rather than run once by hand: without
      // it the case above passes against an expression that never failed.
      const bound = bindFields(
        [{ name: 'country', text: throwing }],
        group(),
        { injector: injector, onError: 'throw' }
      );

      expect(() => bound['country'].text?.()).toThrow(
        'Cannot call undefined or null function'
      );
    });

    it('should not inherit eval-signals default of throw', () => {
      // `createEvalSignal` does `options?.onError ?? 'throw'`, so a binding
      // that forwarded an *absent* policy verbatim would land on `'throw'` -
      // the opposite of this library's default. Resolving it here is what the
      // first case in this block is really asserting; this one names it.
      const bound = bindFields(
        [{ name: 'country', text: throwing }],
        group(),
        { injector }
      );

      expect(() => bound['country'].text?.()).not.toThrow();
    });

    it('should forward a function policy', () => {
      const seen: unknown[] = [];

      const bound = bindFields(
        [{ name: 'country', text: throwing }],
        group(),
        {
          injector,
          onError: (error: unknown) => {
            seen.push(error);
            return 'fallback';
          },
        }
      );

      expect(bound['country'].text?.()).toBe('fallback');
      expect(seen).toHaveLength(1);
      expect(seen[0]).toBeInstanceOf(Error);
    });

    it('should let a write violation through the default rather than blanking it', () => {
      // A write violation is *static* - illegal on every recompute with every
      // dataset - so swallowing it under a default of `'undefined'` would hand
      // the consumer a silent blank for a bug in the rule's own syntax.
      const bound = bindFields(
        [{ name: 'country', text: 'count = 5' }],
        group(),
        { injector }
      );

      expect(() => bound['country'].text?.()).toThrow(SignalContextWriteError);
    });
  });

  describe('context composition (plan S 3.4.1)', () => {

    // Asserted through resolution, not through an identity check the binding
    // hands out no handle for. `get` resolves `scopes` before `lookups`, so a
    // scope on the context one field's walk is using would shadow every other
    // field's key of the same name for as long as it is there.
    //
    // **Rewritten in Phase 2 step 0b, and the reason is worth keeping.** Until
    // then this block observed a shared context through the *scope leak*
    // [A9](../../../../../docs/backlog.md#a9) left behind:
    // `arrow-function-expression.ts` pushed a parameter scope and popped it
    // with no `try`/`finally`, so an arrow that escaped the walk and threw when
    // called later stranded its binding permanently, where a second field could
    // read it. Step 0 fixed A9. With no leak to observe by any route the case
    // below went on passing **under a single shared context** - measured, by
    // hoisting `createFieldContext` out of `bindFieldProperties`' loop - which
    // made it the vacuous case its own partner had been written to prevent.
    //
    // What replaces it needs no defect at all: the arrow's parameter scope is
    // on the context *legitimately*, for the duration of the body. Reading
    // another field from inside that window is the discriminator, and reaching
    // inside it needs two escape hatches in the form - a control whose value
    // stores the closure, so it can be called outside any reactive context, and
    // one that runs while the scope is pushed.
    const observing = (): {
      form: FormGroup<{ [key: string]: AbstractControl }>;
      enter: (value: unknown) => { fromA: unknown; fromB: unknown };
      attach: (bound: Record<string, FieldProperties>) => void;
    } => {
      let escaped: ((...args: unknown[]) => unknown) | undefined;
      let bound: Record<string, FieldProperties> | undefined;
      let fromA: unknown;
      let fromB: unknown;

      const form = group({
        country: new FormControl('CA'),
        keep: new FormControl((fn: unknown) => {
          escaped = fn as (...args: unknown[]) => unknown;
          return true;
        }),
        // The window. This runs as the arrow's body, so `a`'s parameter scope
        // is on `a`'s context right now and pops when the body returns.
        peek: new FormControl((value: unknown) => {
          fromA = bound?.['a'].text?.();
          fromB = bound?.['b'].text?.();

          return value;
        }),
      });

      // Called from test code rather than from a recompute, so neither read
      // inside `peek` is nested in another field's reactive context.
      const enter = (value: unknown): { fromA: unknown; fromB: unknown } => {
        expect(escaped).toBeInstanceOf(Function);
        escaped?.(value);

        return { fromA, fromB };
      };

      return { form, enter, attach: (value) => { bound = value; } };
    };

    it('should give each field its own context', () => {
      const { form, enter, attach } = observing();

      const bound = bindFields(
        [
          { name: 'a', visible: 'keep((country) => peek(country))', text: 'country' },
          { name: 'b', text: 'country' },
        ],
        form,
        { injector }
      );

      attach(bound);

      // Reading `a.visible` is what hands the closure out; the order matters.
      expect(bound['a'].visible?.()).toBe(true);

      const { fromA, fromB } = enter('SCOPED');

      // **The positive control, and it is not decoration.** Without it `fromB`
      // reading `'CA'` is equally true of a run in which no scope was ever
      // pushed, the arrow never ran, or `peek` was called outside the window -
      // every one of which makes the assertion below pass while discriminating
      // nothing. This says the window is real: read through `a`'s own context,
      // the pushed parameter shadows the control.
      expect(fromA).toBe('SCOPED');

      // The assertion. `b` resolves `country` against its own context, which
      // the scope on `a`'s is not on. Hoist `createFieldContext` out of
      // `bindFieldProperties`' loop and this reads `'SCOPED'` too.
      expect(fromB).toBe('CA');
    });
  });

  describe('schema validation (open question 8.3)', () => {

    it('should reject a duplicate field name', () => {
      expect(() =>
        bindFieldProperties(
          [
            { name: 'country', text: 'country' },
            { name: 'country', visible: 'age' },
          ],
          group(),
          { injector }
        )
      ).toThrow(/duplicate/i);
    });

    it('should accept the same expression under two different names', () => {
      expect(() =>
        bindFieldProperties(
          [
            { name: 'country', text: 'country' },
            { name: 'age', text: 'country' },
          ],
          group(),
          { injector }
        )
      ).not.toThrow();
    });

    it.each(['visible', 'text'])('should reject a non-string %s', (property) => {
      const schema = [{ name: 'country', [property]: true }] as unknown as FieldSchema[];

      expect(() => bindFieldProperties(schema, group(), { injector })).toThrow(
        /must be a string/i
      );
    });

    it('should accept a field with neither rule', () => {
      const bound = bindFields([{ name: 'country' }], group(), { injector });

      expect(bound['country']).toEqual({});
    });

    it.each(['constructor', 'toString', 'valueOf', '__proto__'])(
      'should reject the field name %s',
      (name) => {
        // Every rule naming such a field silently reads a function - truthy,
        // so `visible` renders precisely the field that has no data.
        expect(() =>
          bindFieldProperties([{ name, text: 'country' }], group(), { injector })
        ).toThrow(/Object\.prototype/);
      }
    );

    it.each(['constructor', 'toString', 'valueOf', '__proto__'])(
      'should reject a control named %s',
      (name) => {
        // The same check over the other source of names, and the mirror does
        // **not** rescue this case even though it defines an own accessor for
        // the key: the record is reached through `lookups` (step 4 of
        // `EvalContext.get`) while `original` - the empty field source - is
        // read at step 2 with a bare property access. Measured before this
        // case was written: the accessor is present and the expression still
        // reads `function Object() { [native code] }`.
        const form = group({ [name]: new FormControl('MINE') });

        expect(() =>
          bindFieldProperties([{ name: 'field', text: 'country' }], form, { injector })
        ).toThrow(/Object\.prototype/);
      }
    );

    it('should accept an ordinary field name that no control backs', () => {
      // A rule naming a field the group has no control for is not an error -
      // it resolves `undefined`, which is S 3.4.3's own case. Without this
      // the prototype check above would pass equally against a binding that
      // rejected every unbacked name.
      expect(() =>
        bindFieldProperties([{ name: 'nosuchfield', text: 'country' }], group(), {
          injector,
        })
      ).not.toThrow();
    });

    it('should reject a nested group in the form (open question 8.5)', () => {
      const form = group({
        country: new FormControl('CA'),
        address: new FormGroup({ city: new FormControl('Rome') }),
      });

      expect(() =>
        bindFieldProperties([{ name: 'country', text: 'country' }], form, { injector })
      ).toThrow(/FormControl/);
    });

    it('should reject a FormArray in the form (open question 8.5)', () => {
      const form = group({
        country: new FormControl('CA'),
        tags: new FormArray([new FormControl('a')]),
      });

      expect(() =>
        bindFieldProperties([{ name: 'country', text: 'country' }], form, { injector })
      ).toThrow(/FormControl/);
    });

    it('should reject before any subscription is opened', () => {
      // Validation that ran after `createControlSource` would leave the
      // mirror's subscriptions alive behind the throw, with no handle to
      // release them - the binding has not returned, so nothing can be
      // destroyed.
      const form = group();

      expect(() =>
        bindFieldProperties(
          [
            { name: 'country', text: 'country' },
            { name: 'country', text: 'age' },
          ],
          form,
          { injector }
        )
      ).toThrow();

      expect(observers(form.controls['country'])).toBe(0);
    });
  });

  describe('the property signals (plan S 5)', () => {

    it('should expose invalidate and destroy, not a plain Signal', () => {
      // Both members are load-bearing on this path: `invalidate()` is trap 3's
      // hatch and S 3.4.2's key-set hatch, and `destroy()` is what step 5
      // counts. Typing these as `Signal` would put both out of reach.
      const bound = bindFields(
        [{ name: 'country', text: 'country' }],
        group(),
        { injector }
      );

      expect(typeof bound['country'].text?.invalidate).toBe('function');
      expect(typeof bound['country'].text?.destroy).toBe('function');
    });

    it('should recover a value the mirror could not see change (trap 3)', () => {
      const form = group();

      const bound = bindFields(
        [{ name: 'country', text: 'country' }],
        form,
        { injector }
      );

      expect(bound['country'].text?.()).toBe('CA');

      form.controls['country'].setValue('US', { emitEvent: false });

      // Current behaviour, pinned rather than fixed (S 3.5.3): the mirror's
      // change-signal never ticked, so the property is stale.
      expect(bound['country'].text?.()).toBe('CA');

      bound['country'].text?.invalidate();

      expect(bound['country'].text?.()).toBe('US');
    });

    it('should read the coerced empty value once destroyed', () => {
      const bound = bindFields(
        [{ name: 'country', visible: 'country', text: 'country' }],
        group(),
        { injector }
      );

      expect(bound['country'].text?.()).toBe('CA');

      bound['country'].visible?.destroy();
      bound['country'].text?.destroy();

      // A destroyed `EvalSignal` reads `undefined`; the coercion is still in
      // front of it, so the property answers with the same empty value an
      // absent key produces rather than leaking `undefined` into a template.
      expect(bound['country'].visible?.()).toBe(false);
      expect(bound['country'].text?.()).toBe('');
    });
  });

  describe('teardown (plan S 3.7)', () => {

    // Every rule here is *truthy* against the default fixture, deliberately.
    // The cases below read a property after `destroy()` and expect the empty
    // value - and against a rule that already answered `false` / `''` that
    // assertion holds whether teardown reached the field or not.
    const rules = (name: string): FieldSchema => ({
      name,
      visible: 'country',
      text: 'country',
    });

    // Spied on the objects the caller holds, which are the objects the
    // binding retains: `coerce` builds `destroy` as an own property, so
    // replacing it here is seen by an implementation that calls
    // `signal.destroy()` and missed by one that captured the function up
    // front or destroyed the *inner* signal instead - and only the first of
    // those destroys the thing the consumer was handed.
    const destroySpies = (
      fields: Record<string, FieldProperties>
    ): jest.SpyInstance[] => {

      const spies: jest.SpyInstance[] = [];

      for (const properties of Object.values(fields)) {
        for (const property of [properties.visible, properties.text]) {
          if (property !== undefined) {
            spies.push(jest.spyOn(property as { destroy: () => void }, 'destroy'));
          }
        }
      }

      return spies;
    };

    const destroyCalls = (spies: jest.SpyInstance[]): number =>
      spies.reduce((total, spy) => total + spy.mock.calls.length, 0);

    it('should destroy every signal it created, exactly once each', () => {
      // The count, and the count is the assertion: "the form's destroy ran"
      // holds equally for a binding that destroys the first field and leaks
      // the rest, which is what a `for` loop with a wrong bound produces.
      const binding: FormBinding = bindFieldProperties(
        [rules('country'), rules('age'), rules('other')],
        group(),
        { injector }
      );

      const spies = destroySpies(binding.fields);

      // N x M - three fields, two properties apiece. Asserted rather than
      // assumed, because a `destroyCalls` of 6 would otherwise be reachable
      // by six calls against however many signals exist.
      expect(spies).toHaveLength(6);

      binding.destroy();

      expect(destroyCalls(spies)).toBe(6);

      for (const spy of spies) {
        expect(spy).toHaveBeenCalledTimes(1);
      }
    });

    it('should reach a field nothing ever read', () => {
      const binding = bindFieldProperties(
        [rules('read'), rules('never')],
        group(),
        { injector }
      );

      // Reading `read` is what proves the rule is truthy to begin with.
      // Without it every expectation below holds against a rule that was
      // false all along, and the case asserts nothing about teardown.
      expect(binding.fields['read'].visible?.()).toBe(true);
      expect(binding.fields['read'].text?.()).toBe('CA');

      binding.destroy();

      expect(binding.fields['read'].visible?.()).toBe(false);
      expect(binding.fields['never'].visible?.()).toBe(false);
      expect(binding.fields['never'].text?.()).toBe('');
    });

    it('should release every live toSignal subscription', () => {
      const form = group();

      // One field, two controls: the mirror covers the whole group (S 3.5),
      // so `age` is subscribed although no rule names it - and a teardown
      // driven off the *schema* rather than off the mirror would leave it.
      const binding = bindFieldProperties([rules('country')], form, { injector });

      expect(observers(form.controls['country'])).toBe(1);
      expect(observers(form.controls['age'])).toBe(1);

      binding.destroy();

      expect(observers(form.controls['country'])).toBe(0);
      expect(observers(form.controls['age'])).toBe(0);
    });

    it('should release the group.events subscription on the same path', () => {
      // The source holds **two** long-lived subscriptions and the per-control
      // count above reaches only one, so this reaches the other directly -
      // through Angular's private `_events`, since `events` is exposed as
      // `_events.asObservable()` and the wrapper has no observer count.
      //
      // What it does *not* buy, stated because the first draft of this comment
      // claimed it did: no assertion here can see a `group.events` subscriber
      // that outlived the per-control chains, because that state is not
      // reachable by any change to this file - `createControlSource` takes one
      // injector for both. The break this file can produce is a mirror built
      // on the caller's injector instead of the scope, and that leaves both
      // alive; the behavioural case below sees it too, without a private
      // field. Both are kept: they fail together here and independently
      // against a change to step 3's file.
      const form = group();
      const binding = bindFieldProperties([rules('country')], form, { injector });

      expect(groupEvents(form)).toBe(1);

      binding.destroy();

      expect(groupEvents(form)).toBe(0);
    });

    it('should not throw when destroyed twice', () => {
      // Load-bearing here and vacuous under the alternative step 5 rejected:
      // a release handle on the mirror is idempotent in every part, so the
      // criterion passed against a binding with no guard at all. The scope is
      // an `EnvironmentInjector`, and `R3Injector.destroy()` opens with
      // `assertNotDestroyed` - NG0205 on the second call.
      const binding = bindFieldProperties([rules('country')], group(), { injector });

      binding.destroy();

      expect(() => binding.destroy()).not.toThrow();
    });

    it('should not destroy anything a second time', () => {
      // The half that survives a change of mechanism. `not.toThrow()` above
      // would also hold for a guard that swallowed the throw and re-ran the
      // whole loop, which is a double `destroy()` on every signal.
      const binding = bindFieldProperties(
        [rules('country'), rules('age')],
        group(),
        { injector }
      );

      const spies = destroySpies(binding.fields);

      binding.destroy();
      binding.destroy();

      expect(destroyCalls(spies)).toBe(4);
    });

    it('should leave nothing live after a control instance was churned', () => {
      // Trap 5's churn assertion, carried across a full teardown: the
      // replacement is what makes the live set differ from the set the
      // binding opened with, so a teardown that released "the controls I
      // started with" leaks the replacement and over-releases the dead one.
      const form = group();
      const binding = bindFieldProperties([rules('country')], form, { injector });

      const dead = form.controls['country'];
      const untouched = form.controls['age'];
      const before = subscriberOf(untouched);
      const fresh = new FormControl('US');

      form.setControl('country', fresh);

      expect(observers(dead)).toBe(0);
      expect(observers(fresh)).toBe(1);
      expect(observers(untouched)).toBe(1);

      // The identity, not the count: a binding that tore down and re-subscribed
      // everything on the `group.events` emission produces the same three
      // counts above.
      expect(subscriberOf(untouched)).toBe(before);

      binding.destroy();

      expect(observers(fresh)).toBe(0);
      expect(observers(untouched)).toBe(0);
      expect(groupEvents(form)).toBe(0);
    });

    it('should leave nothing live when the bind itself throws', () => {
      // `createEvalSignal` compiles eagerly (S 3.4.4's amendment), so a
      // *parse* error throws from inside the loop - after the mirror is open
      // and after the first field's signals exist. `validate` cannot move
      // ahead of it the way it does for a schema-shape error: the expression
      // is a string, and only the parser knows it is not an expression.
      //
      // This is the mirror half of the criterion. The signal half - that the
      // signals already created are destroyed - is asserted in
      // `field-schema.teardown-throw.spec.ts`, which instruments the factory
      // because no route from *here* reaches it: a throwing bind returns no
      // handle, an `EvalSignal` built with an explicit injector holds no
      // `DestroyRef` registration, and a signal nobody can read never
      // recomputes. The two halves fail independently, which is why they are
      // two cases: a `catch` that released the mirror and leaked the signals
      // passes this one.
      const form = group();

      expect(() =>
        bindFieldProperties(
          [rules('country'), { name: 'age', visible: 'country ===' }],
          form,
          { injector }
        )
      ).toThrow(/Unexpected token/);

      expect(observers(form.controls['country'])).toBe(0);
      expect(observers(form.controls['age'])).toBe(0);
      expect(groupEvents(form)).toBe(0);
    });

    it('should stop diffing the control set once the binding is destroyed', () => {
      // The behavioural half of the case above, and the one that needs no
      // private field. It reddens the reachable regression - a mirror built on
      // the caller's injector rather than the scope - because that mirror's
      // `group.events` subscriber survives `destroy()` and opens a channel for
      // the added control on an injector that is still alive.
      const form = group();
      const binding = bindFieldProperties([rules('country')], form, { injector });

      binding.destroy();

      const extra = new FormControl('x');
      form.addControl('extra', extra);

      expect(observers(extra)).toBe(0);
    });

    it('should release the mirror when the injector it was given is destroyed', () => {
      // `createEnvironmentInjector` does **not** register the child with its
      // parent's destroy hooks, so the scope's lifetime is detached rather
      // than merely shorter. Step 4 scoped the mirror to the caller's injector
      // directly and got this for free; without the registration
      // `bindFieldProperties` adds, a consumer who wires a binding to a
      // component or route injector - the case S 3.7's required `injector` is
      // argued from - retains N subscriptions, the mirror and the form for the
      // life of the root injector, silently.
      const form = group();
      const owner = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));

      bindFieldProperties([rules('country')], form, { injector: owner });

      // Guards the setup: without this the case passes against a binding that
      // never subscribed anything.
      expect(observers(form.controls['country'])).toBe(1);

      owner.destroy();

      expect(observers(form.controls['country'])).toBe(0);
      expect(groupEvents(form)).toBe(0);
    });

    it('should require the injector inside an injection context too', () => {
      // The other arm of the NG0203 case at the foot of this file, which runs
      // outside a context and cannot see this. S 3.7 makes `injector` required
      // precisely so that a call which *happens* to sit in an injection
      // context does not silently get a different teardown story - so the
      // fallback that preserves NG0203 outside a context must not become a
      // working ambient binding inside one.
      expect(() =>
        TestBed.runInInjectionContext(() =>
          bindFieldProperties(
            [{ name: 'country', text: 'country' }],
            group(),
            {} as { injector: Injector }
          )
        )
      ).toThrow(/injector/);
    });

    it('should return the fields under `fields`, not on the binding itself', () => {
      // The nesting is why the shape changed (S 5's amendment): the record's
      // keys are field names, `destroy` is a legal one, and S 0's premise is
      // that those names come from a server rather than from the consumer.
      const binding = bindFieldProperties(
        [{ name: 'destroy', text: 'country' }],
        group(),
        { injector }
      );

      expect(typeof binding.destroy).toBe('function');
      expect(binding.fields['destroy'].text?.()).toBe('CA');
    });
  });

  it('should require the injector at run time, not only at compile time', () => {
    // The premise the required `injector` rests on (S 3.7): a form binding is
    // constructed in a service or a factory, never in a component's injection
    // context. Every other case in this file already builds from outside one,
    // so "it works with an injector" is not an assertion - it is a restatement
    // of the whole file. What discriminates is the other arm: without one,
    // from here, the build fails rather than quietly picking up an ambient
    // context or an auto-teardown nobody asked for.
    //
    // The cast is how an argument the type forbids gets past it, which is the
    // point: a JavaScript consumer can write this call.
    //
    // Matched on NG0203 rather than left as a bare `toThrow()`, because a bare
    // one passes on any failure at all - including the `TypeError` that
    // reading `.get` off `undefined` would produce.
    //
    // **The error moved in step 5 and now proves more than it did.** It used
    // to come from `control-source.ts`, which ordered `toSignal` ahead of its
    // `DestroyRef` read to get this message; it now comes from
    // `field-schema.ts`'s `inject(EnvironmentInjector)` fallback, which runs
    // before `createControlSource` is called at all. So a caller with no
    // injector opens **zero** subscriptions, which the old ordering did not
    // give. The in-context arm is a separate case in the teardown block, and
    // it has to be: this one runs outside an injection context, where the
    // fallback throws instead of succeeding.
    expect(() =>
      bindFieldProperties(
        [{ name: 'country', text: 'country' }],
        group(),
        {} as { injector: Injector }
      )
    ).toThrow(/NG0203/);
  });
});
