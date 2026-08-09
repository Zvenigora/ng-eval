#!/usr/bin/env node
/**
 * PostToolUse hook for Edit|Write.
 *
 * Lints just the edited file with ESLint.
 * Lint failures exit 2, which sends the ESLint output back to Claude as feedback.
 *
 * Deliberately scoped to one file: running the full `nx run eval-core:lint`
 * target on every edit costs seconds per tool call and adds up fast.
 *
 * Fails open — any unexpected problem exits 0 so the hook never blocks work
 * for a reason unrelated to the code.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LINTABLE = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function hasLocalDep(projectDir, name) {
  return existsSync(path.join(projectDir, 'node_modules', name));
}

function run(command) {
  return spawnSync(command, {
    shell: true, // resolves .cmd shims on Windows
    encoding: 'utf8',
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  });
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    process.exit(0); // not our problem
  }

  const filePath = input?.tool_input?.file_path;
  if (!filePath) process.exit(0);

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const abs = path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
  const rel = path.relative(projectDir, abs).split(path.sep).join('/');

  // Only care about library source. Skip node_modules, dist, and files
  // outside the workspace.
  if (rel.startsWith('..')) process.exit(0);
  if (/(^|\/)(node_modules|dist|\.nx|coverage)\//.test(rel)) process.exit(0);
  if (!existsSync(abs)) process.exit(0);

  const ext = path.extname(abs);

  if (!LINTABLE.has(ext)) process.exit(0);
  if (!hasLocalDep(projectDir, 'eslint')) process.exit(0);

  const lint = run(`npx --no-install eslint --format stylish --max-warnings 0 "${rel}"`);

  // status 0 = clean. status 1 = lint problems. Anything else (or a null
  // status, meaning the process never started) is a tooling failure, not a
  // code failure — stay quiet.
  if (lint.status === 0 || lint.status === null || lint.status > 1) {
    process.exit(0);
  }

  const report = `${lint.stdout || ''}${lint.stderr || ''}`
    .split(/\r?\n/)
    .filter((l) => !/^npm (notice|warn|WARN)\b/.test(l.trim()))
    .join('\n')
    .trim();

  // An npm/npx plumbing failure also exits 1. Never report that as a lint
  // error — it would block every edit for a reason Claude cannot fix.
  if (!report || /^npm (error|ERR!)/m.test(report)) process.exit(0);

  console.error(`ESLint reported problems in ${rel}:\n\n${report}`);
  process.exit(2);
}

main();
