/**
 * The documented-symbol drift gate for `@zvenigora/ng-eval-forms/signals` —
 * [`docs/backlog.md`](../../../../docs/backlog.md) F3 as widened by
 * [`docs/gates/plan.md`](../../../../docs/gates/plan.md) § 3.2, built in § 4
 * step 2.
 *
 * The `/signals` entry point is where the type-only case bites: the README
 * documents `ExpressionRules` at `:555`, which is an `export interface` and has
 * no runtime presence, so a gate built on `Object.keys` over a namespace import
 * would report a false failure against correct code (§ 1.1). The reader used
 * here resolves types and values alike; the case that proves it is in
 * `../../src/export-list.spec.ts`.
 *
 * That file — one copy per project, shared by both of this package's
 * entry-point gates — also carries the scanner and its probes; importing it
 * re-registers them here, which is the cost of a shared helper that must itself
 * be a spec (see its docstring).
 */
import {
  SPECIFIER_ENTRY,
  exportedNames,
  namesFor,
  readmeImports,
  unresolvedImports,
} from '../../src/export-list.spec';

const SPECIFIER = '@zvenigora/ng-eval-forms/signals';
const README = 'modules/eval-forms/README.md';

describe('README symbols resolve against the @zvenigora/ng-eval-forms/signals export list', () => {
  it('scans a non-empty identifier set containing createExpressionRules', () => {
    // The floor (§ 1.5): a named symbol known to be there, not an expected
    // count — a later step adding an import must not turn this red.
    const scanned = namesFor(readmeImports(README), SPECIFIER);
    expect(scanned.size).toBeGreaterThan(0);
    expect([...scanned]).toContain('createExpressionRules');
  });

  it('imports no identifier the entry point does not export', () => {
    // Includes `ExpressionRules`, the type-only symbol of § 1.1.
    expect(
      unresolvedImports(
        README,
        SPECIFIER,
        exportedNames(SPECIFIER_ENTRY[SPECIFIER])
      )
    ).toEqual([]);
  });
});
