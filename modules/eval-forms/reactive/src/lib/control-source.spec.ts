import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { EvalService } from '@zvenigora/ng-eval-core';
import { createFieldContext } from '@zvenigora/ng-eval-forms';
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
  const group = () => new FormGroup({
    country: new FormControl('CA'),
    age: new FormControl(30),
  });

  it('should expose each control value under its control name', () => {
    const source = createControlSource(group(), { injector });

    expect(source).toEqual({ country: 'CA', age: 30 });
  });

  it('should include a disabled control', () => {
    // The discriminating case: `group.value` omits disabled controls, so an
    // implementation that returned it would pass every other assertion here
    // and silently drop a field from the expression context.
    const form = group();
    form.controls.age.disable();

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
});
