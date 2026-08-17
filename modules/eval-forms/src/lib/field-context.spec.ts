import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { EvalService } from '@zvenigora/ng-eval-core';
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';
// Through the published subpath, not a relative path (plan S 6.1). It resolves
// only because of this step's `tsconfig.base.json` `paths` entry, and it is
// permitted here - rather than from a `reactive/` spec - because
// `@nx/enforce-module-boundaries` exempts a self-import that *crosses* entry
// points and rejects one that does not.
import { createControlSource } from '@zvenigora/ng-eval-forms/reactive';
import { createFieldContext } from './field-context';

describe('createFieldContext', () => {

  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  // The two sources carry *disjoint* keys throughout. A fixture that put the
  // same name in both would let one half satisfy assertions written for the
  // other, and the composition this step exists to prove is exactly the part
  // that would go untested.

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

  // Whether the *form* half unwraps is deliberately not asserted here. It does
  // not today, and S 3.4.2 hands step 2 the decision - pinning either answer
  // now would make step 2 delete an assertion to implement its own plan.

  it('should still reject a write through the composed context', () => {
    const context = createFieldContext({ country: 'CA' }, { value: 7 });

    // Holds today only because line 1 of the composition is a
    // `createSignalContext` call, and step 2 rewrites exactly that line. The
    // write policy (plan S 3.4.4, phase-3 S 9.4) is load-bearing rather than
    // incidental, so it is asserted rather than assumed.
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
    const source = createControlSource(group, {
      injector: TestBed.inject(Injector),
    });

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
});
