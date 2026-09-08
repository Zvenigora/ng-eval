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
 * **The shared-core specifier `@zvenigora/ng-eval-forms` has no gate yet, and
 * that is deliberate.** No README imports from it today, so a spec for it would
 * assert over the empty set — the shape § 1.5's floor exists to reject. Step 5
 * creates the subject: D10 adds a runnable `applyErrorPolicy` block, whose
 * import is through the bare specifier. **Adding that block obliges step 5 to
 * add the third gate**, either here or beside `src/public-api.ts`.
 *
 * The reader and the scanner live in `../../src/export-list.spec.ts` — one copy
 * per project, shared by both entry-point gates within this one; importing it
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
