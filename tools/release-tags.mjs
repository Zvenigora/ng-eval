// Release tag gate (docs/backlog-retired.md F8).
//
// Every row of docs/backlog.md's Publication status table is a version on npm, so its tag must
// exist: `<project>@<version>`, over the Nx project the package is built from, as CONTRIBUTING.md's
// Releasing section has it. Where the row's notes name a commit after "Tagged", the tag must point
// at that commit, and where they name the tag, it must be this row's. Runs as part of the root
// project's `test` target, after doc-links.
//
// A checkout with no release tags at all fails, with a hint, rather than skipping. That is a
// shallow or tagless clone, which is what CI's checkout gives unless it is asked for
// `fetch-depth: 0`, and a check that skipped there would pass in the one place it runs on every
// commit.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const started = process.hrtime.bigint();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const register = 'docs/backlog.md';

/** The Nx project each published package is built from. */
const PROJECT = {
  '@zvenigora/ng-eval-core': 'eval-core',
  '@zvenigora/ng-eval-signals': 'eval-signals',
  '@zvenigora/ng-eval-forms': 'eval-forms',
};

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const errors = [];
const fail = (line, message) => errors.push(`${register}:${line}: ${message}`);

/** The rows of the table under `### Publication status`, each with its 1-based line. */
function publicationRows(lines) {
  const heading = lines.indexOf('### Publication status');
  if (heading === -1) {
    errors.push(`${register}: no "### Publication status" heading`);
    return [];
  }
  let i = heading + 1;
  while (i < lines.length && !lines[i].startsWith('|')) i++;
  const rows = [];
  // The header row and the separator row come first.
  for (i += 2; i < lines.length && lines[i].startsWith('|'); i++) {
    const cells = lines[i].split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim());
    rows.push({ line: i + 1, cells });
  }
  if (rows.length === 0) errors.push(`${register}:${heading + 1}: the Publication status table has no rows`);
  return rows;
}

const rows = publicationRows(readFileSync(resolve(root, register), 'utf8').split(/\r?\n/));
const tags = new Set(git('tag', '--list').split('\n').filter(Boolean));
const releaseTags = [...tags].filter((tag) => Object.values(PROJECT).some((project) => tag.startsWith(`${project}@`)));

if (releaseTags.length === 0) {
  errors.push(
    'release-tags: this checkout has no eval-core@, eval-signals@ or eval-forms@ tag at all, so it is a ' +
      'shallow or tagless clone. Run `git fetch --tags`; in CI, give actions/checkout `fetch-depth: 0`. ' +
      'The check does not skip.'
  );
} else {
  for (const { line, cells } of rows) {
    const [packageCell = '', versionCell = '', notes = ''] = cells;
    const name = packageCell.replace(/`/g, '');
    const version = versionCell.replace(/`/g, '');
    const project = PROJECT[name];
    if (project === undefined) {
      fail(line, `${packageCell} is not a package this workspace publishes`);
      continue;
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      fail(line, `${name}: "${versionCell}" is not a version`);
      continue;
    }
    const tag = `${project}@${version}`;
    if (!tags.has(tag)) {
      fail(line, `${name} ${version} is published, and there is no tag ${tag}`);
      continue;
    }
    const tagged = /\bTagged\b(.*)$/.exec(notes);
    if (tagged === null) continue;
    const named = /`([a-z-]+@\d+\.\d+\.\d+)`/.exec(tagged[1]);
    if (named !== null && named[1] !== tag) {
      fail(line, `the notes name ${named[1]}, and the row is ${tag}`);
    }
    const commit = /\bat `?([0-9a-f]{7,40})\b`?/.exec(tagged[1]);
    if (commit !== null) {
      const actual = git('rev-list', '-n', '1', tag);
      if (!actual.startsWith(commit[1])) {
        fail(line, `${tag} is at ${actual.slice(0, 7)}, and the row says ${commit[1]}`);
      }
    }
  }
}

const ms = Number(process.hrtime.bigint() - started) / 1e6;
for (const error of errors) console.error(error);
console.log(`release-tags: ${rows.length} rows, ${releaseTags.length} release tags, ${errors.length} failing (${Math.round(ms)} ms)`);
process.exitCode = errors.length ? 1 : 0;
