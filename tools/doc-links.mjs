// Document cross-reference gate (docs/backlog.md F9).
//
// Resolves every relative markdown link in the tracked *.md files: the target file must exist
// relative to the linking file, and a `#anchor` must exist in the target, either as a GitHub
// heading slug or as an explicit `<a id="…">`. Runs as the root project's `test` target.
//
// Skipped: links inside fenced code blocks and inline code, links with a scheme (http, mailto,
// …), and reference-style definitions. Not seen: whether a `#L…` line anchor into a source file
// still points at the code it cites (only end of file is checked), and references that are not
// links at all — F9 records both.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const started = process.hrtime.bigint();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const files = execFileSync('git', ['ls-files', '*.md'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

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

const errors = [];
let checked = 0;

for (const file of files) {
  const abs = join(root, file);
  unfencedLines(readFileSync(abs, 'utf8')).forEach((rawLine, i) => {
    const line = withoutInlineCode(rawLine);
    if (/^ {0,3}\[[^\]]+\]:\s+\S/.test(line)) return; // reference-style definition
    for (const m of line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // http(s), mailto, …
      checked++;
      const fail = (reason) => errors.push(`${file}:${i + 1}: ${target} — ${reason}`);

      const hash = target.indexOf('#');
      const pathPart = decodeURI(hash === -1 ? target : target.slice(0, hash));
      const anchor = hash === -1 ? '' : decodeURIComponent(target.slice(hash + 1));
      let targetAbs = pathPart === '' ? abs
        : pathPart.startsWith('/') ? join(root, pathPart) : resolve(dirname(abs), pathPart);

      if (!existsSync(targetAbs)) {
        fail(`no such file (${relative(root, targetAbs).split(sep).join('/')})`);
        continue;
      }
      if (anchor === '') continue;

      if (statSync(targetAbs).isDirectory()) {
        // GitHub renders a directory's README.md below its listing, under the id `readme`.
        if (anchor === 'readme') continue;
        targetAbs = join(targetAbs, 'README.md');
        if (!existsSync(targetAbs)) {
          fail('anchor on a directory with no README.md');
          continue;
        }
      }

      const lineAnchor = /^L(\d+)(?:-L(\d+))?$/.exec(anchor);
      if (/\.md$/i.test(targetAbs)) {
        if (lineAnchor) {
          fail('GitHub renders no line anchors in markdown');
          continue;
        }
        const anchors = anchorsOf(targetAbs);
        if (anchors.has(anchor)) continue;
        const caseOnly = [...anchors].some((a) => a.toLowerCase() === anchor.toLowerCase());
        fail(caseOnly ? 'anchor differs from the target\'s only in case' : 'no such anchor in the target');
      } else if (lineAnchor) {
        const lineCount = readFileSync(targetAbs, 'utf8').split(/\r?\n/).length;
        const last = Number(lineAnchor[2] ?? lineAnchor[1]);
        if (last > lineCount) fail(`line ${last} is past the end of the file (${lineCount} lines)`);
      } else {
        fail('anchor on a file that is neither markdown nor a line anchor');
      }
    }
  });
}

const ms = Number(process.hrtime.bigint() - started) / 1e6;
for (const error of errors) console.error(error);
console.log(`doc-links: ${files.length} files, ${checked} links, ${errors.length} dangling (${Math.round(ms)} ms)`);
process.exitCode = errors.length ? 1 : 0;
