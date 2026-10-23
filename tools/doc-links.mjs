// Document cross-reference gate (docs/backlog-retired.md F9, F25).
//
// Resolves every relative markdown link in the *.md files, and in the comment lines of the *.ts
// files: the target file must exist relative to the linking file, and a `#anchor` must exist in the
// target, either as a GitHub heading slug or as an explicit `<a id="…">`. Runs as the root project's
// `test` target.
//
// The files are the tracked ones and the untracked ones git does not ignore (`git ls-files --others
// --exclude-standard`), so a new document is checked before it is added. The summary line names each
// untracked file; being untracked fails nothing. An ignored file is never scanned.
//
// A .ts comment line is one whose first non-space characters are `*`, `/**` or `//`. Every other
// .ts line is code and is never parsed, since `fns[i](x)` has a link's shape.
//
// An absolute link into this repository's tree at `master` — `https://github.com/<owner>/ng-eval`
// followed by `/blob/master/<path>`, `/tree/master/<path>`, or nothing, with or without `#readme`,
// owner `zvenigora` in any case — is resolved as the root-relative path it names. Any other URL into
// the repository (issues, advisories, other refs) is skipped and counted.
//
// A published README binds its links (F25 Part 4): `tools/published-links.txt` lists every such link
// that any version on npm prints, and each is resolved as above, so a move or a retirement that would
// break one fails here. A link of that form in a `modules/*/README.md` must be in the list.
//
// `docs/README.md` is the index of `docs/` (F25 Part 1): every file under `docs/` but itself must be
// the target of one of its relative links, anchor dropped.
//
// Skipped: links inside fenced code blocks and inline code, links with any other scheme (http,
// mailto, …), and reference-style definitions. Not seen: whether a `#L…` line anchor into a source
// file still points at the code it cites (only end of file is checked), and references that are not
// links at all — F9 records both.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const started = process.hrtime.bigint();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const gitFiles = (...args) => execFileSync('git', ['ls-files', ...args, '*.md', '*.ts'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const tracked = gitFiles();
const untracked = gitFiles('--others', '--exclude-standard').filter((f) => !tracked.includes(f));
const files = [...tracked, ...untracked];

const publishedList = 'tools/published-links.txt';
const repoUrl = /^https:\/\/github\.com\/zvenigora\/ng-eval(?=[/#?]|$)/i;
const treeUrl = /^https:\/\/github\.com\/zvenigora\/ng-eval(?:\/(?:blob|tree)\/master(\/[^#?]+)(#.*)?|\/?(#readme)?)$/i;

/** The root-relative target of an absolute link into the tree at master, or null. */
function treeTarget(url) {
  const m = treeUrl.exec(url);
  if (!m) return null;
  return m[1] === undefined ? `/${m[3] ?? ''}` : `${m[1]}${m[2] ?? ''}`;
}

/** The URL with its owner lowercased, so `Zvenigora` and `zvenigora` compare equal. */
const normalized = (url) => url.replace(repoUrl, 'https://github.com/zvenigora/ng-eval');

/** A .ts file's comment lines, with every code line blanked so line numbers are preserved. */
function commentLines(text) {
  return text.split(/\r?\n/).map((line) => (/^\s*(?:\*|\/\*\*|\/\/)/.test(line) ? line : ''));
}

/** The file's lines, with fenced code blocks blanked so line numbers are preserved. */
function unfencedLines(text) {
  let fence = null;
  return text.split(/\r?\n/).map((line) => {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const closes = open && open[1][0] === fence.ch && open[1].length >= fence.len
        && /^ {0,3}(`{3,}|~{3,})\s*$/.test(line);
      if (closes) fence = null;
      return '';
    }
    if (open) {
      fence = { ch: open[1][0], len: open[1].length };
      return '';
    }
    return line;
  });
}

/** Blank out inline code spans (backtick runs of equal length). */
function withoutInlineCode(line) {
  return line.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (span) => ' '.repeat(span.length));
}

/**
 * GitHub's heading slug (github-slugger) of a heading's source text: rendered text, lowercased,
 * everything but letters, marks, numbers, connector punctuation, spaces and hyphens dropped,
 * spaces to hyphens. Emphasis markers are stripped outside code spans only, so the `_` in
 * `ASYNC_HOOK_MESSAGE` survives.
 */
function slugify(heading) {
  const text = heading
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .split(/(`[^`]*`)/)
    .map((part) => (part.length > 1 && part.startsWith('`') && part.endsWith('`')
      ? part.slice(1, -1)
      : part
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')))
    .join('');
  return text.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

const anchorCache = new Map();

/** Heading slugs (with GitHub's -1, -2 … for duplicates) and explicit ids of a markdown file. */
function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const text = readFileSync(file, 'utf8');
  const lines = unfencedLines(text);
  const anchors = new Set();
  const seen = new Map();
  const addHeading = (heading) => {
    const base = slugify(heading);
    const count = seen.get(base);
    seen.set(base, count === undefined ? 0 : count + 1);
    anchors.add(count === undefined ? base : `${base}-${count + 1}`);
  };
  lines.forEach((line, i) => {
    const atx = /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+\s*)?$/.exec(line);
    if (atx) {
      addHeading(atx[1]);
      return;
    }
    const next = lines[i + 1];
    const setext = next !== undefined && line.trim() !== '' && /^ {0,3}(=+|-+)\s*$/.test(next)
      && !/^\s*([-*+]|\d+\.|>|\|)/.test(line) && !(lines[i - 1] ?? '').trim().startsWith('|');
    if (setext) addHeading(line.trim());
  });
  for (const m of text.matchAll(/<[a-z][^>]*?\s(?:id|name)\s*=\s*["']([^"']+)["']/gi)) anchors.add(m[1]);
  anchorCache.set(file, anchors);
  return anchors;
}

/** Each markdown link's target in the given lines, with its 0-based line number. */
function* linksIn(lines) {
  for (const [i, rawLine] of lines.entries()) {
    const line = withoutInlineCode(rawLine);
    if (/^ {0,3}\[[^\]]+\]:\s+\S/.test(line)) continue; // reference-style definition
    for (const m of line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) yield { target: m[1], i };
  }
}

const hasScheme = (target) => /^[a-z][a-z0-9+.-]*:/i.test(target); // http(s), mailto, …

/** Resolves a relative or root-relative target from the file at `abs`; returns why it dangles, or null. */
function danglingReason(target, abs) {
  const hash = target.indexOf('#');
  const pathPart = decodeURI(hash === -1 ? target : target.slice(0, hash));
  const anchor = hash === -1 ? '' : decodeURIComponent(target.slice(hash + 1));
  let targetAbs = pathPart === '' ? abs
    : pathPart.startsWith('/') ? join(root, pathPart) : resolve(dirname(abs), pathPart);

  if (!existsSync(targetAbs)) return `no such file (${relative(root, targetAbs).split(sep).join('/')})`;
  if (anchor === '') return null;

  if (statSync(targetAbs).isDirectory()) {
    targetAbs = join(targetAbs, 'README.md');
    // GitHub renders a directory's README.md below its listing, under the id `readme`.
    if (anchor === 'readme') return existsSync(targetAbs) ? null : '#readme on a directory with no README.md';
    if (!existsSync(targetAbs)) return 'anchor on a directory with no README.md';
  }

  const lineAnchor = /^L(\d+)(?:-L(\d+))?$/.exec(anchor);
  if (/\.md$/i.test(targetAbs)) {
    if (lineAnchor) return 'GitHub renders no line anchors in markdown';
    const anchors = anchorsOf(targetAbs);
    if (anchors.has(anchor)) return null;
    const caseOnly = [...anchors].some((a) => a.toLowerCase() === anchor.toLowerCase());
    return caseOnly ? 'anchor differs from the target\'s only in case' : 'no such anchor in the target';
  }
  if (lineAnchor) {
    const lineCount = readFileSync(targetAbs, 'utf8').split(/\r?\n/).length;
    const last = Number(lineAnchor[2] ?? lineAnchor[1]);
    return last > lineCount ? `line ${last} is past the end of the file (${lineCount} lines)` : null;
  }
  return 'anchor on a file that is neither markdown nor a line anchor';
}

const errors = [];
let checked = 0;
let checkedTs = 0;
let checkedAbsolute = 0;
let skippedRepo = 0;

const published = new Map(); // normalized URL → line in the list
const publishedAbs = join(root, publishedList);
readFileSync(publishedAbs, 'utf8').split(/\r?\n/).forEach((raw, i) => {
  const url = raw.trim();
  if (url === '' || url.startsWith('#')) return;
  const fail = (reason) => errors.push(`${publishedList}:${i + 1}: ${url} — ${reason}`);
  const target = treeTarget(url);
  if (target === null) {
    fail('not a link into this repository\'s tree at master');
    return;
  }
  published.set(normalized(url), i + 1);
  const reason = danglingReason(target, publishedAbs);
  if (reason === null) return;
  fail(`${reason}. A published README links it, so it binds: `
    + (reason.startsWith('no such file')
      ? 'a moved file leaves a stub at its old path that links the new one'
      : 'a retired backlog entry\'s anchor goes on its index row in docs/backlog.md, as <a id="…"></a> '
        + 'in the first cell; any other lost anchor is restored, or kept as <a id="…"></a> beside its heading'));
});

for (const file of files) {
  const abs = join(root, file);
  const isTs = file.endsWith('.ts');
  const isPackageReadme = /^modules\/[^/]+\/README\.md$/.test(file);
  const text = readFileSync(abs, 'utf8');
  for (const { target: written, i } of linksIn(isTs ? commentLines(text) : unfencedLines(text))) {
    const fail = (reason) => errors.push(`${file}:${i + 1}: ${written} — ${reason}`);
    let target = written;
    if (hasScheme(written)) {
      if (!repoUrl.test(written)) continue;
      target = treeTarget(written);
      if (target === null) {
        skippedRepo++;
        continue;
      }
      checkedAbsolute++;
      if (isPackageReadme && !published.has(normalized(written))) {
        fail(`not recorded in ${publishedList}; a published README binds its links, so record it there`);
      }
    }
    checked++;
    if (isTs) checkedTs++;
    const reason = danglingReason(target, abs);
    if (reason !== null) fail(reason);
  }
}

const index = 'docs/README.md';
const indexAbs = join(root, index);
const indexed = new Set();
for (const { target } of linksIn(unfencedLines(readFileSync(indexAbs, 'utf8')))) {
  if (hasScheme(target)) continue;
  const hash = target.indexOf('#');
  const pathPart = decodeURI(hash === -1 ? target : target.slice(0, hash));
  const targetAbs = pathPart.startsWith('/') ? join(root, pathPart) : resolve(dirname(indexAbs), pathPart);
  indexed.add(relative(root, targetAbs).split(sep).join('/'));
}
const documents = files.filter((f) => f.startsWith('docs/') && f !== index);
for (const document of documents) {
  if (!indexed.has(document)) errors.push(`${index}: ${document} — not linked from the index`);
}

const ms = Number(process.hrtime.bigint() - started) / 1e6;
for (const error of errors) console.error(error);
const untrackedNote = untracked.length ? `${untracked.length} untracked: ${untracked.join(', ')}` : '0 untracked';
console.log(`doc-links: ${files.length} files (${untrackedNote}), ${checked} links (${checkedTs} in .ts comments, `
  + `${checkedAbsolute} absolute into the tree), ${skippedRepo} other repository URLs skipped, `
  + `${published.size} published links, ${documents.length} docs/ files checked against the index, `
  + `${errors.length} dangling (${Math.round(ms)} ms)`);
process.exitCode = errors.length ? 1 : 0;
