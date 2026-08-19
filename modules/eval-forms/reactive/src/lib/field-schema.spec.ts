import { Injector } from '@angular/core';
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
import { FieldSchema, bindFieldProperties } from '../public-api';

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

  describe('end to end', () => {

    it('should move a property when the control it names changes', () => {
      const form = group();

      const bound = bindFieldProperties(
        [{ name: 'age', visible: "country === 'US'" }],
        form,
        { injector }
      );

      expect(bound['age'].visible?.()).toBe(false);

      form.controls['country'].setValue('US');

      expect(bound['age'].visible?.()).toBe(true);
    });

    it('should bind every field of the schema', () => {
      const bound = bindFieldProperties(
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

      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
        [{ name: 'country', visible: 'nosuchfield' }],
        group(),
        { injector }
      );

      expect(bound['country'].visible?.()).toBe(false);
    });

    it('should coerce null and undefined to the empty string for text', () => {
      const form = group({ country: new FormControl<string | null>(null) });

      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
        [{ name: 'country', text: throwing }],
        group(),
        { injector }
      );

      expect(() => bound['country'].text?.()).not.toThrow();
    });

    it('should forward a function policy', () => {
      const seen: unknown[] = [];

      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
        [{ name: 'country', text: 'count = 5' }],
        group(),
        { injector }
      );

      expect(() => bound['country'].text?.()).toThrow(SignalContextWriteError);
    });
  });

  describe('context composition (plan S 3.4.1)', () => {

    // Asserted through the scope leak S 3.4.1 is *about*, not through an
    // identity check the binding hands out no handle for. `get` resolves
    // `scopes` before `lookups`, so a scope left on a shared context would
    // shadow every other field's key of the same name for the life of the
    // form.
    //
    // **Getting a leak to happen is the whole difficulty, and two obvious
    // setups do not.** `arrow-function-expression.ts` pushes a scope and pops
    // it with no `try`/`finally`, so a body that throws should strand it - but
    // `((country) => country.x.y)(1)` does not throw at all (no member access
    // in this evaluator does), and `((country) => country())(1)` throws and is
    // *contained*: `createEvalSignal` marks `ctx.scopes.length` before the
    // walk and drains back to it in a `finally` (phase-3-plan S 3.8.3). Both
    // were measured, and both leave a shared context passing this case.
    //
    // What S 3.8.3 names as uncontained is an arrow that **escapes** the walk
    // and is called later, after the recompute's `finally` has run. Reaching
    // that through this library's surface needs the escape hatch to be in the
    // form: a control whose value stores its argument.
    const escaping = (): {
      form: FormGroup<{ [key: string]: AbstractControl }>;
      leak: (value: unknown) => void;
    } => {
      let escaped: ((...args: unknown[]) => unknown) | undefined;

      const form = group({
        country: new FormControl('CA'),
        keep: new FormControl((fn: unknown) => {
          escaped = fn as (...args: unknown[]) => unknown;
          return true;
        }),
      });

      // Calling it throws - the parameter is bound to a string, and calling a
      // string is `safeCall`'s "Value is not a function" - which is what skips
      // the pop and strands the scope on the context.
      const leak = (value: unknown): void => {
        expect(escaped).toBeInstanceOf(Function);
        expect(() => escaped?.(value)).toThrow();
      };

      return { form, leak };
    };

    it('should give each field its own context', () => {
      const { form, leak } = escaping();

      const bound = bindFieldProperties(
        [
          { name: 'a', visible: 'keep((country) => country())', text: 'country' },
          { name: 'b', text: 'country' },
        ],
        form,
        { injector }
      );

      // Reading `a` is what hands the closure out; the order matters.
      expect(bound['a'].visible?.()).toBe(true);
      leak('LEAK');

      expect(bound['b'].text?.()).toBe('CA');
    });

    it('should leave the leak on the context that made it', () => {
      // The same leak seen from the field that owns it. Without this the case
      // above passes whenever no leak happened at all - which is what the two
      // rejected setups above did, and the only reason they were caught.
      const { form, leak } = escaping();

      const bound = bindFieldProperties(
        [
          { name: 'a', visible: 'keep((country) => country())', text: 'country' },
          { name: 'b', text: 'country' },
        ],
        form,
        { injector }
      );

      expect(bound['a'].text?.()).toBe('CA');

      expect(bound['a'].visible?.()).toBe(true);
      leak('LEAK');

      bound['a'].text?.invalidate();

      expect(bound['a'].text?.()).toBe('LEAK');
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
      const bound = bindFieldProperties([{ name: 'country' }], group(), { injector });

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
      const bound = bindFieldProperties(
        [{ name: 'country', text: 'country' }],
        group(),
        { injector }
      );

      expect(typeof bound['country'].text?.invalidate).toBe('function');
      expect(typeof bound['country'].text?.destroy).toBe('function');
    });

    it('should recover a value the mirror could not see change (trap 3)', () => {
      const form = group();

      const bound = bindFieldProperties(
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
      const bound = bindFieldProperties(
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
    // reading `DestroyRef` off `undefined` would produce. This is the error
    // `control-source.ts` ordered its statements to get: `toSignal` runs
    // before the `DestroyRef` read precisely so the message names the
    // injection context.
    expect(() =>
      bindFieldProperties(
        [{ name: 'country', text: 'country' }],
        group(),
        {} as { injector: Injector }
      )
    ).toThrow(/NG0203/);
  });
});
