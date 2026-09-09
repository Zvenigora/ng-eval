/**
 * The documented-symbol drift gate for `@zvenigora/ng-eval-forms/reactive` —
 * [`docs/backlog.md`](../../../../docs/backlog.md) F3 as widened by
 * [`docs/gates/plan.md`](../../../../docs/gates/plan.md) § 3.2, built in § 4
 * step 2.
 *
 * `eval-forms` ships three entry points from one package and they have separate
 * export surfaces, so § 3.2 checks it **per entry point**: this file covers the
 * `/reactive` specifier, `signals/src/public-api.spec.ts` covers `/signals`.
 * Both read the same `modules/eval-forms/README.md` and filter by their own
 * specifier.
 *
 * **The shared-core specifier `@zvenigora/ng-eval-forms` is gated too, as of
 * step 5**, by `../../src/public-api.spec.ts`. Step 2 left it unbuilt on
 * purpose — no README imported through the bare specifier, so the check would
 * have asserted over the empty set, which is the shape § 1.5's floor rejects —
 * and recorded the obligation here and in F3. D10's `applyErrorPolicy` block
 * created the subject and step 5 built it. All three entry points now have a
 * gate; nothing is owed.
 *
 * The reader and the scanner live in `../../src/export-list.spec.ts` — one copy
 * per project, shared by all three of this package's gates; importing it
 * re-registers its probes here, which is the cost of a shared helper that must
 * itself be a spec (see that file's docstring).
 */
import {
  SPECIFIER_ENTRY,
  exportedNames,
  namesFor,
  readmeImports,
  unresolvedImports,
} from '../../src/export-list.spec';

const SPECIFIER = '@zvenigora/ng-eval-forms/reactive';
const README = 'modules/eval-forms/README.md';

describe('README symbols resolve against the @zvenigora/ng-eval-forms/reactive export list', () => {
  it('scans a non-empty identifier set containing bindFieldProperties', () => {
    // The floor (§ 1.5): a named symbol known to be there, not an expected
    // count — a later step adding an import must not turn this red.
    const scanned = namesFor(readmeImports(README), SPECIFIER);
    expect(scanned.size).toBeGreaterThan(0);
    expect([...scanned]).toContain('bindFieldProperties');
  });

  it('imports no identifier the entry point does not export', () => {
    expect(
      unresolvedImports(
        README,
        SPECIFIER,
        exportedNames(SPECIFIER_ENTRY[SPECIFIER])
      )
    ).toEqual([]);
  });
});
