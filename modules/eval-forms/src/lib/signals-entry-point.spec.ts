import { createMetadataKey } from '@angular/forms/signals';
import { TEXT } from '@zvenigora/ng-eval-forms/signals';

// The subpath, exercised the way a consumer reaches it (plan S 4, step 1's
// third exit criterion). It lives under the *primary* entry point's folder
// rather than beside the code it imports, because
// `@nx/enforce-module-boundaries` rejects a package-name self-import within
// one entry point and permits it across - so a co-located version of this
// file fails lint, and only this placement proves the specifier resolves.
//
// It is also the only thing in this step that would notice a missing
// `tsconfig.base.json` path mapping: the relative import in
// `signals/src/lib/text-key.spec.ts` resolves with or without it.
describe('@zvenigora/ng-eval-forms/signals', () => {

  it('should publish TEXT through the package specifier', () => {
    // The prototype comparison rather than `typeof`: it is the assertion that
    // fails for the uncalled factory, for `undefined` and for `null`, and it
    // does not hard-code Angular's current runtime representation of a key.
    // See `signals/src/lib/text-key.spec.ts` for the reasoning.
    expect(Object.getPrototypeOf(TEXT)).toBe(
      Object.getPrototypeOf(createMetadataKey<string>())
    );
  });

  it('should publish one key per read, not a fresh one per access', () => {
    // Two reads through the specifier, one expression apart. Under
    // `module: "commonjs"` each reference is a property read off the module
    // namespace, so a getter that minted a key per access would hand back two.
    // A module-scope factory *call* would not - it evaluates once per registry
    // - so this covers the getter and nothing wider.
    expect(TEXT).toBe(TEXT);
  });
});
