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
 * [D10](../../../docs/backlog-retired.md#d10) creates the subject: the
 * `applyErrorPolicy` block added to `modules/eval-forms/README.md` is the
 * first import through `@zvenigora/ng-eval-forms` in any README.
 *
 * The reader and the scanner live in `export-list.spec.ts` beside this file —
 * one copy per project, shared by all three of this package's entry-point
 * gates; importing it re-registers its probes here, which is the cost of a
 * shared helper that must itself be a spec (see that file's docstring).
 *
 * **The peer ranges the README quotes are checked here too** (the Phase 10
 * plan's § 3.5): each must equal the manifest's, and `## Install` must quote
 * every peer with its range. The manifest is the package's, so it covers all
 * three entry points, and this file is the one of the three that holds the
 * case. See the section below the README cases.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  SPECIFIER_ENTRY,
  exportedNames,
  namesFor,
  readmeImports,
  unresolvedImports,
  workspaceRoot,
} from './export-list.spec';

const SPECIFIER = '@zvenigora/ng-eval-forms';
const README = 'modules/eval-forms/README.md';
const MANIFEST = 'modules/eval-forms/package.json';

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

// ---------------------------------------------------------------------------
// Quoted peer ranges (the Phase 10 plan, § 3.5)
// ---------------------------------------------------------------------------

/** A peer range as the README quotes it. */
interface QuotedRange {
  readonly peer: string;
  readonly range: string;
  readonly line: number;
  /** The `##` section it sits in. */
  readonly section: string;
  /** A code span in prose, or a `"<peer>": "<range>"` line in a fenced block. */
  readonly form: 'span' | 'fenced';
}

/**
 * Every peer range `markdown` quotes, in one of two forms: a code span
 * `` `<peer> <range>` `` outside a fence, or a `"<peer>": "<range>"` line
 * inside one — `## Versions` holds the manifest's block. `<peer>` must be
 * exactly a key of `peers`, and in a span it is the text before the first
 * space — so `` `acorn-walk ^8.3.0` `` is never read as `acorn`. A span may
 * wrap a line, and its whitespace is collapsed; as in CommonMark, it ends at a
 * blank line, so a stray backtick cannot pair across paragraphs and hide every
 * span after it. A fence opens on three or more backticks or tildes, and
 * closes on the same character, at least as many.
 *
 * Not seen, by design: a range in prose without its peer as the span's first
 * word — "Angular 19+", "The `eval-core` floor is 0.13.0" — a span with no
 * space after its peer (`` `rxjs@^7.8.0` ``), and a range in a fenced line of
 * any other shape. So the README states no sibling package's range: one
 * quoted as a span would be read as this package's, and one quoted any other
 * way would not be read at all.
 */
const quotedRanges = (markdown: string, peers: ReadonlySet<string>): QuotedRange[] => {
  const found: QuotedRange[] = [];
  const lines = markdown.split(/\r?\n/);
  const sectionAt: string[] = [];
  let section = '';
  let fence = '';
  const prose = lines.map((text, index) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(text);
    if (marker && (!fence || (marker[1][0] === fence[0] && marker[1].length >= fence.length))) {
      fence = fence ? '' : marker[1];
      sectionAt.push(section);
      return '';
    }
    if (fence) {
      const pair = /^\s*"([^"]+)"\s*:\s*"([^"]*)"/.exec(text);
      if (pair && peers.has(pair[1])) {
        found.push({ peer: pair[1], range: pair[2], line: index + 1, section, form: 'fenced' });
      }
      sectionAt.push(section);
      return '';
    }
    const heading = /^## (.+)$/.exec(text);
    if (heading) section = heading[1].trim();
    sectionAt.push(section);
    return text;
  });
  const text = prose.join('\n');
  const spanPattern = /`((?:[^`\n]|\n(?!\s*\n))+)`/g;
  for (let match = spanPattern.exec(text); match; match = spanPattern.exec(text)) {
    const span = match[1].trim().replace(/\s+/g, ' ');
    const space = span.indexOf(' ');
    if (space < 0 || !peers.has(span.slice(0, space))) continue;
    const line = text.slice(0, match.index).split('\n').length;
    found.push({
      peer: span.slice(0, space),
      range: span.slice(space + 1),
      line,
      section: sectionAt[line - 1],
      form: 'span',
    });
  }
  return found;
};

describe('README peer ranges equal the @zvenigora/ng-eval-forms manifest', () => {
  it('quotes every peer in ## Install, and every quoted range as the manifest declares it', () => {
    const declared: Readonly<Record<string, string>> =
      JSON.parse(fs.readFileSync(path.join(workspaceRoot, MANIFEST), 'utf8')).peerDependencies;
    const quoted = quotedRanges(
      fs.readFileSync(path.join(workspaceRoot, README), 'utf8'),
      new Set(Object.keys(declared))
    );
    const mismatched = quoted
      .filter((q) => q.range !== declared[q.peer])
      .map((q) => `${q.peer} at :${q.line} quotes "${q.range}"; the manifest declares "${declared[q.peer]}"`);
    const installed = new Set(
      quoted.filter((q) => q.section === 'Install' && q.form === 'span').map((q) => q.peer)
    );
    const missingFromInstall = Object.keys(declared).filter((peer) => !installed.has(peer));
    expect({ mismatched, missingFromInstall }).toEqual({ mismatched: [], missingFromInstall: [] });
  });
});
