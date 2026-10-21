/**
 * The documented-symbol drift gate for `@zvenigora/ng-eval-signals` —
 * [`docs/backlog.md`](../../../docs/backlog.md) F3 as widened by
 * [`docs/gates/plan.md`](../../../docs/gates/plan.md) § 3.2, built in § 4
 * step 2.
 *
 * One README documents this package, and it is the published one, so there is
 * no published/unpublished relation to check here — that check existed only for
 * `eval-core`, whose symbols the root `README.md` also documented (§ 1.4) until
 * Phase 10 step 5 made it a landing page. What remains is the rename-drift
 * half: every identifier the README imports from the specifier must be
 * exported by it.
 *
 * The reader and the scanner live in `export-list.spec.ts` beside this file,
 * with their own probes; importing it re-registers those probes here, which is
 * the cost of a shared helper that must itself be a spec (see that file's
 * docstring).
 *
 * **The peer ranges the README quotes are checked here too** (the Phase 10
 * plan's § 3.5): each must equal the manifest's, and `## Install` must quote
 * every peer with its range. See the section below the README cases.
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

const SPECIFIER = '@zvenigora/ng-eval-signals';
const README = 'modules/eval-signals/README.md';
const MANIFEST = 'modules/eval-signals/package.json';

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
 * inside one. `<peer>` must be exactly a key of `peers`, and in a span it is
 * the text before the first space — so `` `acorn-walk ^8.3.0` `` is never
 * read as `acorn`. A span may wrap a line, and its whitespace is collapsed; as
 * in CommonMark, it ends at a blank line, so a stray backtick cannot pair
 * across paragraphs and hide every span after it. A fence opens on three or
 * more backticks or tildes, and closes on the same character, at least as many.
 *
 * Not seen, by design: a range in prose without its peer as the span's first
 * word — "Angular 19+", "The `eval-core` floor is 0.13.0" — a span with no
 * space after its peer (`` `@angular/core@>=19.0.0` ``), and a range in a
 * fenced line of any other shape.
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

describe('README peer ranges equal the @zvenigora/ng-eval-signals manifest', () => {
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
