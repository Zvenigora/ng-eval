/**
 * The documented-symbol drift gate for `@zvenigora/ng-eval-core` —
 * [`docs/backlog.md`](../../../docs/backlog.md) F3, built by
 * [`docs/gates/plan.md`](../../../docs/gates/plan.md) § 4 step 2.
 *
 * Two READMEs name this package's symbols: the root `README.md`, which ships
 * nowhere, and `modules/eval-core/README.md`, which is the only documentation a
 * consumer installing the package can read. This file checks three things:
 *
 * 1. every identifier either README imports from the specifier is exported;
 * 2. the scan is not silently empty — a floor per file, not a block count;
 * 3. the published/unpublished relation (§ 3.2): a symbol that **is exported**,
 *    is documented in the root README, and is **absent** from the package
 *    README. It is a three-way relation, not a set difference — a set
 *    difference is unsatisfiable today on eight symbols and would need the
 *    exception list § 1.1 rejects.
 *
 * **What this gate cannot see, stated because F3 was retired on it.** Only
 * identifiers inside an `import { … } from '@zvenigora/…'` statement are
 * checked. F3's own motivating example, `trackTime`, is an `EvalOptions` key
 * rather than an exported symbol and appears in no import statement in any
 * README — so this gate would have stayed green through the divergence that
 * motivated it. What it catches is the same *shape* (documented in the
 * unpublished README, absent from the published one) for the subset that is
 * imported by name. Option keys, method names and prose-documented API —
 * `createControlSource`, `FieldSchema` and `FormBinding` are exported from
 * `/reactive` and imported by no README — are outside it.
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

const SPECIFIER = '@zvenigora/ng-eval-core';
const ROOT_README = 'README.md';
const PACKAGE_README = 'modules/eval-core/README.md';

describe('README symbols resolve against the @zvenigora/ng-eval-core export list', () => {
  const exported = (): ReadonlySet<string> =>
    exportedNames(SPECIFIER_ENTRY[SPECIFIER]);

  describe.each([ROOT_README, PACKAGE_README])('%s', (readme) => {
    it('scans a non-empty identifier set containing EvalService', () => {
      // The floor (§ 1.5): a named symbol known to be there, not an expected
      // count — a later step adding an import must not turn this red.
      const scanned = namesFor(readmeImports(readme), SPECIFIER);
      expect(scanned.size).toBeGreaterThan(0);
      expect([...scanned]).toContain('EvalService');
    });

    it('imports no identifier the package does not export', () => {
      expect(unresolvedImports(readme, SPECIFIER, exported())).toEqual([]);
    });
  });

  it('scans the identifiers carried by the root README two-line imports', () => {
    // `README.md:291-292` is one statement spanning two lines, and these three
    // symbols appear in no single-line import anywhere in that file. A reader
    // that matched an import a line at a time would drop the whole statement
    // and still satisfy the EvalService floor above, which single-line imports
    // supply on their own.
    const scanned = namesFor(readmeImports(ROOT_README), SPECIFIER);
    expect([...scanned]).toEqual(
      expect.arrayContaining(['EvalContext', 'EvalScope', 'EvalScopeOptions'])
    );
  });

  it('documents every exported root-README symbol in the package README too', () => {
    // F3's motivating case: exported, documented in the unpublished README, and
    // missing from the one that ships. Not a symmetric difference.
    const rootNames = namesFor(readmeImports(ROOT_README), SPECIFIER);
    const packageNames = namesFor(readmeImports(PACKAGE_README), SPECIFIER);
    const list = exported();
    const publishedNowhere = [...rootNames]
      .filter((name) => list.has(name) && !packageNames.has(name))
      .sort();
    expect(publishedNowhere).toEqual([]);
  });
});
