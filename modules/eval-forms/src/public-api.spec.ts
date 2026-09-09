/**
 * The documented-symbol drift gate for the shared core specifier
 * `@zvenigora/ng-eval-forms` — [`docs/backlog.md`](../../../docs/backlog.md)
 * F3 as widened by [`docs/gates/plan.md`](../../../docs/gates/plan.md) § 3.2,
 * completing the per-entry-point set its step 2 began.
 *
 * **This is the gate step 2 declined to build, and it declined for the right
 * reason.** `eval-forms` ships three entry points, and step 2 gated two: no
 * README imported from the bare specifier, so a third gate would have asserted
 * over the empty set — the shape § 1.5's floor exists to reject. The obligation
 * was recorded in `reactive/src/public-api.spec.ts`'s docstring and in F3
 * rather than left implicit, and step 5 discharges it because
 * [D10](../../../docs/backlog.md#d10) creates the subject: the
 * `applyErrorPolicy` block added to `modules/eval-forms/README.md` is the
 * first import through `@zvenigora/ng-eval-forms` in any README.
 *
 * The reader and the scanner live in `export-list.spec.ts` beside this file —
 * one copy per project, shared by all three of this package's entry-point
 * gates; importing it re-registers its probes here, which is the cost of a
 * shared helper that must itself be a spec (see that file's docstring).
 */
import {
  SPECIFIER_ENTRY,
  exportedNames,
  namesFor,
  readmeImports,
  unresolvedImports,
} from './export-list.spec';

const SPECIFIER = '@zvenigora/ng-eval-forms';
const README = 'modules/eval-forms/README.md';

describe('README symbols resolve against the @zvenigora/ng-eval-forms export list', () => {
  it('scans a non-empty identifier set containing applyErrorPolicy', () => {
    // The floor (§ 1.5): a named symbol known to be there, not an expected
    // count. It is `applyErrorPolicy` because that import is what makes this
    // gate satisfiable at all.
    const scanned = namesFor(readmeImports(README), SPECIFIER);
    expect(scanned.size).toBeGreaterThan(0);
    expect([...scanned]).toContain('applyErrorPolicy');
  });

  it('imports no identifier the shared core does not export', () => {
    expect(
      unresolvedImports(
        README,
        SPECIFIER,
        exportedNames(SPECIFIER_ENTRY[SPECIFIER])
      )
    ).toEqual([]);
  });
});
