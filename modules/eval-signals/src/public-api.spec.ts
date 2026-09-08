/**
 * The documented-symbol drift gate for `@zvenigora/ng-eval-signals` —
 * [`docs/backlog.md`](../../../docs/backlog.md) F3 as widened by
 * [`docs/gates/plan.md`](../../../docs/gates/plan.md) § 3.2, built in § 4
 * step 2.
 *
 * One README documents this package, and it is the published one, so there is
 * no published/unpublished relation to check here — that check exists only for
 * `eval-core`, whose symbols are also documented in the root `README.md`
 * (§ 1.4). What remains is the rename-drift half: every identifier the README
 * imports from the specifier must be exported by it.
 *
 * The reader and the scanner live in `export-list.spec.ts` beside this file,
 * with their own probes; importing it re-registers those probes here, which is
 * the cost of a shared helper that must itself be a spec (see that file's
 * docstring).
 */
import {
  SPECIFIER_ENTRY,
  exportedNames,
  namesFor,
  readmeImports,
  unresolvedImports,
} from './export-list.spec';

const SPECIFIER = '@zvenigora/ng-eval-signals';
const README = 'modules/eval-signals/README.md';

describe('README symbols resolve against the @zvenigora/ng-eval-signals export list', () => {
  it('scans a non-empty identifier set containing createEvalSignal', () => {
    // The floor (§ 1.5): a named symbol known to be there, not an expected
    // count — step 3 may add imports to this README and must not turn it red.
    const scanned = namesFor(readmeImports(README), SPECIFIER);
    expect(scanned.size).toBeGreaterThan(0);
    expect([...scanned]).toContain('createEvalSignal');
  });

  it('imports no identifier the package does not export', () => {
    expect(
      unresolvedImports(
        README,
        SPECIFIER,
        exportedNames(SPECIFIER_ENTRY[SPECIFIER])
      )
    ).toEqual([]);
  });
});
