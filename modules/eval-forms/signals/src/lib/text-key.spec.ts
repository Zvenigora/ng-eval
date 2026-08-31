import { createMetadataKey } from '@angular/forms/signals';
import { TEXT } from './text-key';

// `TEXT` is the key `evalText` writes through `metadata(path, TEXT, logic)` and
// the one a consumer reads back off the field's state (plan S 1.2.8). Both
// sides have to name the *same* object, so what this step can assert about it
// is its identity - the value round-trip belongs to step 4, where a real
// `form()` exists to carry it.
//
// **Identity across two imports is not the assertion.** Jest caches a module
// per registry, so a second `require` returns the same object whatever
// `text-key.ts` does, and `jest.isolateModules` inverts that - two registries
// hand back two keys even for a correct singleton. Neither can fail. The
// discriminating pair is below: `createMetadataKey` mints a fresh value per
// call, and `TEXT` is one of those values rather than the factory itself.
describe('TEXT', () => {

  it('should be a distinct key, not one shared with every other caller', () => {
    // The calibration arm: keys are per-call identities, so identity is a
    // meaningful thing to assert about `TEXT` at all.
    expect(createMetadataKey<string>()).not.toBe(createMetadataKey<string>());

    // `TEXT` is one of those, not a second reference to somebody else's key.
    // Note this pair is *only* worth writing with the prototype check below:
    // `expect(TEXT).not.toBe(createMetadataKey<string>())` on its own is a
    // tautology, because the right-hand side is minted inside the expression
    // and `TEXT` cannot be it for any implementation - including `undefined`.
    expect(TEXT).not.toBe(createMetadataKey<string>());
    expect(Object.getPrototypeOf(TEXT)).toBe(
      Object.getPrototypeOf(createMetadataKey<string>())
    );
  });

  it('should be a created key rather than the factory that creates one', () => {
    // The forgotten `()`. `export const TEXT = createMetadataKey<string>` is
    // valid TypeScript - an instantiation expression - so it compiles, ships a
    // function where step 4 expects a key, and fails only here.
    //
    // The prototype comparison is the load-bearing one and subsumes `typeof`:
    // it fails for the uncalled factory, for `undefined`, for `null` (which
    // `typeof` calls an object and `toBeDefined` accepts), and for a plain
    // object. `MetadataKey` is not a value export of `@angular/forms/signals`,
    // so a real key's prototype is the only way to name the class.
    expect(Object.getPrototypeOf(TEXT)).toBe(
      Object.getPrototypeOf(createMetadataKey<string>())
    );
  });
});
