// The one case in this library that has to see the signals a *throwing* bind
// created, which no other route reaches: a bind that throws returns no handle,
// an `EvalSignal` built with an explicit injector holds no `DestroyRef`
// registration, and a signal nobody can read never recomputes - so a live one
// and a destroyed one are indistinguishable from outside. Instrumenting the
// factory is the handle, taken before the object is lost.
//
// Its own file rather than a block in `field-schema.spec.ts`, because
// `jest.mock` is hoisted to the top of the file it appears in: here it reaches
// one case, where there it would put all forty-odd through a mocked barrel to
// serve one. The passthrough shape - spread `requireActual`, wrap the one
// export - is this workspace's own (`eval-signals`'
// `nested-signal-check.spec.ts`).
const innerDestroys: jest.SpyInstance[] = [];

jest.mock('@zvenigora/ng-eval-signals', () => {
  const actual = jest.requireActual('@zvenigora/ng-eval-signals');

  return {
    ...actual,
    createEvalSignal: (...args: unknown[]) => {
      const created = (
        actual.createEvalSignal as (...a: unknown[]) => { destroy: () => void }
      )(...args);

      innerDestroys.push(jest.spyOn(created, 'destroy'));

      return created;
    },
  };
});

import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { bindFieldProperties } from '../public-api';

describe('bindFieldProperties - a bind that throws part-way (plan S 3.7)', () => {

  let injector: Injector;

  beforeEach(() => {
    innerDestroys.length = 0;
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  const group = (): FormGroup<{ [key: string]: AbstractControl }> =>
    new FormGroup<{ [key: string]: AbstractControl }>({
      country: new FormControl('CA'),
      age: new FormControl(30),
    });

  const observers = (control: AbstractControl): number =>
    (control.valueChanges as unknown as Subject<unknown>).observers.length;

  it('should destroy every signal it had already created', () => {
    // `createEvalSignal` compiles eagerly (S 3.4.4's amendment), so the parse
    // error throws from inside the loop - with the first field's two signals
    // already built and the mirror already open.
    const form = group();

    expect(() =>
      bindFieldProperties(
        [
          { name: 'country', visible: 'country', text: 'country' },
          { name: 'age', visible: 'country ===' },
        ],
        form,
        { injector }
      )
    ).toThrow(/Unexpected token/);

    // The denominator, asserted rather than assumed: two rules compiled before
    // the third threw, so "every one destroyed" is a claim about two objects
    // and not about an empty list.
    expect(innerDestroys).toHaveLength(2);

    for (const destroy of innerDestroys) {
      expect(destroy).toHaveBeenCalledTimes(1);
    }

    // Kept alongside, because the two halves fail independently: a `catch`
    // that destroyed the signals and left the scope alive passes above and
    // fails here.
    expect(observers(form.controls['country'])).toBe(0);
  });
});
