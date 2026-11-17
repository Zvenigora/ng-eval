import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REGISTRY } from './registry';

// Paths from this spec's location, not from the working directory: it is `apps/demo/src/app`.
const APP = __dirname;
const ROOT = join(__dirname, '..', '..', '..', '..');

// Copied from tools/doc-links.mjs, which is not imported because it runs its check on import:
// `unfencedLines` (lines 66–82), `slugify` (lines 95–110), and the heading loop of `anchorsOf`
// with GitHub's duplicate numbering (lines 118–137). Its explicit ids (line 138) are left out:
// an entry's anchor is a heading's.

/** The file's lines, with fenced code blocks blanked so line numbers are preserved. */
function unfencedLines(text: string): string[] {
  let fence: { ch: string; len: number } | null = null;
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

/** GitHub's heading slug (github-slugger) of a heading's source text. */
function slugify(heading: string): string {
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

/** Heading slugs, with GitHub's -1, -2 … for duplicates, of a markdown file's text. */
function headingSlugs(text: string): Set<string> {
  const lines = unfencedLines(text);
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  const addHeading = (heading: string): void => {
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
  return anchors;
}

/** Every file under the folder, as a path from it with `/` between the parts. */
function filesUnder(folder: string, prefix = ''): string[] {
  return readdirSync(join(folder, prefix), { withFileTypes: true }).flatMap((dirent) => {
    const path = prefix ? `${prefix}/${dirent.name}` : dirent.name;
    return dirent.isDirectory() ? filesUnder(folder, path) : [path];
  });
}

describe('the registry', () => {
  it('lists every *.example.ts under src/app, and every file it lists exists', () => {
    const onDisk = filesUnder(APP)
      .filter((path) => path.endsWith('.example.ts'))
      .sort();
    const listed = REGISTRY.map((entry) => entry.file).sort();

    expect(onDisk.length).toBeGreaterThan(0);
    expect(listed).toEqual(onDisk);
    for (const file of listed) {
      expect(existsSync(join(APP, file))).toBe(true);
    }
  });

  it('links each entry to a heading of its README', () => {
    for (const entry of REGISTRY) {
      const slugs = headingSlugs(readFileSync(join(ROOT, entry.readme.file), 'utf8'));
      expect({ entry: entry.path, anchor: entry.readme.anchor, found: slugs.has(entry.readme.anchor) })
        .toEqual({ entry: entry.path, anchor: entry.readme.anchor, found: true });
    }
  });
});
