/**
 * The export-list reader and the README import scanner — § 3.1 of
 * [`docs/gates/plan.md`](../../../docs/gates/plan.md), with its own probes.
 *
 * **Why this file is a `*.spec.ts` and not a plain module.** Track 3 may add or
 * edit only specs, `project.json`, READMEs and `docs/`; a non-spec source file
 * under `src/lib/`, `reactive/` or `signals/` is a stop-and-replan (§ 6
 * gate 1). A `.spec.ts` is the only shape a shared test utility can legally
 * take here, and building the reader first with its own cases (§ 3.1) is what
 * keeps "the export list is wrong" and "the README is wrong" from being read as
 * one failure.
 *
 * **Why it is triplicated.** `eval-core` and `eval-signals` carry byte-similar
 * copies. This is deliberate: `@nx/enforce-module-boundaries` runs with
 * `allow: []` (root `eslint.config.mjs`), so no spec may import a helper out of
 * another project — by alias or relatively — and § 6 gate 4 forbids loosening
 * that rule to serve a spec. What retires the triplication is a shared
 * spec-utilities location the boundary rule permits. No such location exists in
 * this workspace, and building one is not this track's to do. Within this
 * package the copy is shared: both entry-point gates import this one file.
 *
 * The reader resolves the export list with the TypeScript compiler API rather
 * than `Object.keys` over a namespace import, because a runtime export list is
 * blind to `export interface` and `export type` and the READMEs document those
 * — `modules/eval-forms/README.md:555` names `ExpressionRules`, which is an
 * `export interface` (§ 1.1). It reads the file each specifier resolves to in
 * `tsconfig.base.json`.
 *
 * The scanner reads the whole markdown file rather than only fenced blocks:
 * a superset of F3's wording, which cannot miss an import a fence parser would.
 *
 * Three import forms it does **not** handle, none of which any README uses:
 * an inline type modifier (`import { type X, Y }`) yields the name `"type X"`
 * and would report a spurious failure; a default-plus-named import
 * (`import D, { X } from …`) and a namespace import (`import * as api from …`)
 * are not matched at all.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/** One `import { … } from '<specifier>'` statement found in a markdown file. */
export interface ReadmeImport {
  readonly specifier: string;
  readonly names: readonly string[];
  /** 1-based line of the statement's first line, for a named failure. */
  readonly line: number;
}

/** The directory holding `tsconfig.base.json`, found by walking up. */
export const workspaceRoot = ((): string => {
  let dir = __dirname;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'tsconfig.base.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`no tsconfig.base.json above ${__dirname}`);
    }
    dir = parent;
  }
})();

/**
 * What each published specifier resolves to, mirroring `tsconfig.base.json`
 * `paths`. The three package specifiers resolve to `src/index.ts`, one hop
 * outside `src/public-api.ts`; the two `eval-forms` sub-entry-points resolve to
 * their `public-api.ts` directly.
 */
export const SPECIFIER_ENTRY: Readonly<Record<string, string>> = {
  '@zvenigora/ng-eval-core': 'modules/eval-core/src/index.ts',
  '@zvenigora/ng-eval-signals': 'modules/eval-signals/src/index.ts',
  '@zvenigora/ng-eval-forms': 'modules/eval-forms/src/index.ts',
  '@zvenigora/ng-eval-forms/reactive':
    'modules/eval-forms/reactive/src/public-api.ts',
  '@zvenigora/ng-eval-forms/signals':
    'modules/eval-forms/signals/src/public-api.ts',
};

const compilerOptions = (): ts.CompilerOptions => {
  const configPath = path.join(workspaceRoot, 'tsconfig.base.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    workspaceRoot
  );
  return {
    ...parsed.options,
    types: [],
    noEmit: true,
    skipLibCheck: true,
    declaration: false,
    sourceMap: false,
  };
};

const cache = new Map<string, ReadonlySet<string>>();

/**
 * Every `export … from '<specifier>'` in the workspace's own sources that the
 * program failed to resolve.
 *
 * This is the reader's one *partial* failure: an `export *` whose target does
 * not resolve drops that whole branch's names and leaves the set non-empty, so
 * none of the other guards below fire and the drift gate reports a false pass
 * on any symbol that vanished. Checked here rather than through
 * `getPreEmitDiagnostics`, which type-checks the entire program for an answer
 * this reads off the export declarations directly.
 */
const unresolvedReExports = (
  program: ts.Program,
  checker: ts.TypeChecker
): readonly string[] => {
  const unresolved: string[] = [];
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || file.fileName.includes('/node_modules/')) {
      continue;
    }
    for (const statement of file.statements) {
      const specifier = ts.isExportDeclaration(statement)
        ? statement.moduleSpecifier
        : undefined;
      if (specifier && !checker.getSymbolAtLocation(specifier)) {
        unresolved.push(
          `${path.relative(workspaceRoot, file.fileName)} → ${specifier.getText()}`
        );
      }
    }
  }
  return unresolved;
};

/**
 * Every symbol the entry file exports, values and types alike, following
 * `export *` through as many barrels as it takes.
 *
 * Throws rather than returning an empty set on every failure it can detect —
 * a missing file, a file the program will not load, a module that exports
 * nothing. A reader that silently returns `[]` passes every check built on it,
 * which is the failure the caller cannot see.
 */
export const exportedNames = (entryRelativePath: string): ReadonlySet<string> => {
  const cached = cache.get(entryRelativePath);
  if (cached) {
    return cached;
  }
  const entry = path.join(workspaceRoot, entryRelativePath);
  if (!fs.existsSync(entry)) {
    throw new Error(`export-list reader: no such entry file ${entryRelativePath}`);
  }
  const program = ts.createProgram([entry], compilerOptions());
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  if (!source) {
    throw new Error(`export-list reader: ${entryRelativePath} is not in the program`);
  }
  const unresolved = unresolvedReExports(program, checker);
  if (unresolved.length > 0) {
    throw new Error(
      `export-list reader: ${entryRelativePath} has unresolved re-exports, so the list would be short: ${unresolved.join(
        '; '
      )}`
    );
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) {
    throw new Error(`export-list reader: ${entryRelativePath} is not a module`);
  }
  const names = new Set(
    checker.getExportsOfModule(moduleSymbol).map((symbol) => symbol.name)
  );
  if (names.size === 0) {
    throw new Error(`export-list reader: ${entryRelativePath} exports nothing`);
  }
  cache.set(entryRelativePath, names);
  return names;
};

const IMPORT_PATTERN =
  /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;

/**
 * Every `@zvenigora/…` import statement in markdown text, including statements
 * that span lines.
 */
export const readmeImportsFromText = (text: string): readonly ReadmeImport[] => {
  const found: ReadmeImport[] = [];
  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const specifier = match[2];
    if (!specifier.startsWith('@zvenigora/')) {
      continue;
    }
    const names = match[1]
      .split(',')
      .map((name) => name.trim().split(/\s+as\s+/)[0].trim())
      .filter((name) => name.length > 0);
    const index = match.index ?? 0;
    found.push({
      specifier,
      names,
      line: text.slice(0, index).split('\n').length,
    });
  }
  return found;
};

/** The same, read from a path relative to the workspace root. */
export const readmeImports = (
  readmeRelativePath: string
): readonly ReadmeImport[] =>
  readmeImportsFromText(
    fs.readFileSync(path.join(workspaceRoot, readmeRelativePath), 'utf8')
  );

/** The identifiers a markdown file imports from one specifier. */
export const namesFor = (
  imports: readonly ReadmeImport[],
  specifier: string
): ReadonlySet<string> =>
  new Set(
    imports
      .filter((entry) => entry.specifier === specifier)
      .flatMap((entry) => [...entry.names])
  );

/**
 * The failures a README's imports produce against an export list, one message
 * per unresolved identifier, naming the file and line.
 */
export const unresolvedImports = (
  readmeRelativePath: string,
  specifier: string,
  exported: ReadonlySet<string>
): readonly string[] =>
  readmeImports(readmeRelativePath)
    .filter((entry) => entry.specifier === specifier)
    .flatMap((entry) =>
      entry.names
        .filter((name) => !exported.has(name))
        .map(
          (name) =>
            `${readmeRelativePath}:${entry.line} imports { ${name} } from '${specifier}', which it does not export`
        )
    );

/**
 * The failures **every** `@zvenigora/…` import produces, each resolved
 * against its own specifier's export list rather than one fixed specifier
 * (`docs/backlog.md` F11). This README's own package owns a cross-package
 * line, so a rename in another package turns this package's gate red, where
 * the stale line is. Read through `SPECIFIER_ENTRY` and the TypeScript
 * compiler, which open the other package's sources as files - no import
 * crosses the module boundary rule. An unmapped specifier is a failure, not a
 * skip. The `eval-core` copy carries the full reasoning.
 */
export const unresolvedAcrossSpecifiers = (
  imports: readonly ReadmeImport[],
  label: string
): readonly string[] =>
  imports.flatMap((entry) => {
    const entryFile = SPECIFIER_ENTRY[entry.specifier];
    if (entryFile === undefined) {
      return [
        `${label}:${entry.line} imports from '${entry.specifier}', which no tsconfig.base.json path maps`,
      ];
    }
    const exported = exportedNames(entryFile);
    return entry.names
      .filter((name) => !exported.has(name))
      .map(
        (name) =>
          `${label}:${entry.line} imports { ${name} } from '${entry.specifier}', which it does not export`
      );
  });

/**
 * Why an export its package's README does not name may stay unnamed
 * (`docs/backlog.md` F10). The `eval-core` copy defines each reason.
 */
export type UndocumentedReason =
  | 'signature-type'
  | 'function-form'
  | 'example-only'
  | 'building-block'
  | 'unused';

/**
 * Every identifier a markdown text names inside a code span, outside fenced
 * blocks, and not after a `.` - what "documented" means for F10. The
 * `eval-core` copy carries the reasoning.
 */
export const documentedNames = (markdown: string): ReadonlySet<string> => {
  let fence: { readonly ch: string; readonly length: number } | undefined;

  const prose = markdown
    .split(/\r?\n/)
    .map((line) => {
      const run = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) {
        if (run && run[1][0] === fence.ch && run[1].length >= fence.length && /^ {0,3}(`{3,}|~{3,})\s*$/.test(line)) {
          fence = undefined;
        }
        return '';
      }
      if (run) {
        fence = { ch: run[1][0], length: run[1].length };
        return '';
      }
      return line;
    })
    .join('\n');

  const names = new Set<string>();
  for (const span of prose.matchAll(/(?<!`)(`+)((?:(?!\n[ \t]*\n)[\s\S])*?[^`])\1(?!`)/g)) {
    for (const name of span[2].matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)) {
      names.add(name[0]);
    }
  }
  return names;
};

/** Each export named in no code span of `readme` and absent from the allowlist. */
export const undocumentedExports = (
  exported: ReadonlySet<string>,
  documented: ReadonlySet<string>,
  allowlist: Readonly<Record<string, UndocumentedReason>>,
  readme: string
): readonly string[] =>
  [...exported]
    .filter((name) => !documented.has(name) && !Object.prototype.hasOwnProperty.call(allowlist, name))
    .sort()
    .map((name) => `${name}: exported, named in no code span of ${readme}, and not allowlisted`);

/** Each allowlist entry the package no longer exports. */
export const staleAllowlistEntries = (
  exported: ReadonlySet<string>,
  allowlist: Readonly<Record<string, UndocumentedReason>>
): readonly string[] =>
  Object.keys(allowlist)
    .filter((name) => !exported.has(name))
    .sort()
    .map((name) => `${name}: allowlisted, and not exported`);

describe('export-list reader (eval-forms copy)', () => {
  const core = () => exportedNames(SPECIFIER_ENTRY['@zvenigora/ng-eval-forms']);
  const forSignals = () =>
    exportedNames(SPECIFIER_ENTRY['@zvenigora/ng-eval-forms/signals']);
  const forReactive = () =>
    exportedNames(SPECIFIER_ENTRY['@zvenigora/ng-eval-forms/reactive']);

  it('returns a value export', () => {
    expect([...core()]).toContain('applyErrorPolicy');
  });

  it('returns a type-only export, which a runtime export list cannot see', () => {
    // `ExpressionRules` is `export interface` (signals/src/lib/rules.ts:60) and
    // is documented at `modules/eval-forms/README.md:555`. This is the case the
    // naive `Object.keys(namespace)` implementation false-fails on day one.
    expect([...forSignals()]).toContain('ExpressionRules');
  });

  it('follows the barrel graph through every hop', () => {
    // Hops are counted as edges from the file the specifier resolves to.
    // `ExpressionRules` is one (public-api.ts → lib/rules.ts), so it does not
    // cover this on its own. `ExpressionErrorPolicy` is two from the package
    // entry — index.ts → public-api.ts → lib/error-policy.ts — and is a type
    // alias, so it carries both properties at once.
    expect([...core()]).toContain('ExpressionErrorPolicy');
    expect([...forReactive()]).toContain('bindFieldProperties');
  });

  it('keeps the entry points separate', () => {
    // A symbol exported from one entry point is not exported from the other,
    // which is why § 3.2 checks `eval-forms` per entry point.
    expect([...forReactive()]).not.toContain('ExpressionRules');
    expect([...forSignals()]).not.toContain('bindFieldProperties');
  });

  it('returns exports, not every declaration the program can reach', () => {
    // `EvalContext` is imported by lib/field-context.ts, so it is *in* the
    // package-entry program, and this package does not re-export it.
    // `evaluateRule` is `export const` in signals/src/lib/evaluate-rule.ts,
    // imported by rules.ts and not on that entry point's barrel. A reader that
    // enumerated declarations rather than exports would return both; a name
    // that exists nowhere, like the third one, cannot tell those two readers
    // apart.
    expect([...core()]).not.toContain('EvalContext');
    expect([...forSignals()]).not.toContain('evaluateRule');
    expect([...core()]).not.toContain('NotAnExportedSymbol');
  });

  it('is not silently empty', () => {
    expect(core().size).toBeGreaterThan(3);
    expect(forReactive().size).toBeGreaterThan(3);
    expect(forSignals().size).toBeGreaterThan(3);
  });

  it('throws rather than returning an empty set for a missing entry file', () => {
    expect(() => exportedNames('modules/eval-forms/src/no-such-file.ts')).toThrow(
      /no such entry file/
    );
  });

  it('throws rather than returning an empty set for a file the program will not load', () => {
    // Pins the "not in the program" branch rather than accepting any of the
    // reader's throws.
    expect(() => exportedNames('modules/eval-forms/README.md')).toThrow(
      /export-list reader: modules\/eval-forms\/README\.md is not in the program/
    );
  });

  it('agrees with tsconfig.base.json about what each specifier resolves to', () => {
    // `SPECIFIER_ENTRY` is a hand-maintained mirror of `paths`, inside a gate
    // whose whole subject is a hand-maintained document drifting from the code.
    // This package is the one with two extra entry points to get wrong.
    const parsed = ts.parseJsonConfigFileContent(
      ts.readConfigFile(
        path.join(workspaceRoot, 'tsconfig.base.json'),
        ts.sys.readFile
      ).config,
      ts.sys,
      workspaceRoot
    );
    const declared = Object.fromEntries(
      Object.entries(parsed.options.paths ?? {}).map(([specifier, targets]) => [
        specifier,
        path
          .relative(workspaceRoot, path.resolve(workspaceRoot, targets[0]))
          .split(path.sep)
          .join('/'),
      ])
    );
    expect(declared).toEqual({ ...SPECIFIER_ENTRY });
  });
});

describe('README import scanner (eval-forms copy)', () => {
  it('scans a single-line import', () => {
    const found = readmeImportsFromText(
      "```ts\nimport { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';\n```\n"
    );
    expect(found).toEqual([
      {
        specifier: '@zvenigora/ng-eval-forms/reactive',
        names: ['bindFieldProperties'],
        line: 2,
      },
    ]);
  });

  it('scans an import statement that spans two lines', () => {
    // The arm a first-line-only reader fails.
    const found = readmeImportsFromText(
      "import { TEXT,\n  createExpressionRules } from '@zvenigora/ng-eval-forms/signals';\n"
    );
    expect(found).toHaveLength(1);
    expect(found[0].names).toEqual(['TEXT', 'createExpressionRules']);
  });

  it('distinguishes the two entry-point specifiers', () => {
    const found = readmeImportsFromText(
      "import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';\n" +
        "import { ExpressionRules } from '@zvenigora/ng-eval-forms/signals';\n"
    );
    expect(namesFor(found, '@zvenigora/ng-eval-forms/reactive')).toEqual(
      new Set(['bindFieldProperties'])
    );
    expect(namesFor(found, '@zvenigora/ng-eval-forms/signals')).toEqual(
      new Set(['ExpressionRules'])
    );
  });

  it('ignores imports from other packages', () => {
    const found = readmeImportsFromText(
      "import { signal } from '@angular/core';\n"
    );
    expect(found).toEqual([]);
  });
});

describe('every @zvenigora import resolves against its own specifier (F11, eval-forms copy)', () => {
  // One README for all three entry points' gates, and for cross-package lines.
  it('modules/eval-forms/README.md', () => {
    const readme = 'modules/eval-forms/README.md';
    expect(unresolvedAcrossSpecifiers(readmeImports(readme), readme)).toEqual([]);
  });

  it('checks a cross-package import against the other package, and names it', () => {
    const found = unresolvedAcrossSpecifiers(
      readmeImportsFromText(
        "import { SignalContextWriteError, SignalContextWriteErrorz } from '@zvenigora/ng-eval-signals';\n"
      ),
      'fixture.md'
    );
    expect(found).toEqual([
      "fixture.md:1 imports { SignalContextWriteErrorz } from '@zvenigora/ng-eval-signals', which it does not export",
    ]);
  });
});

/**
 * The exports of the three entry points that `modules/eval-forms/README.md`
 * names in no code span, each with its reason (`docs/backlog.md` F10). Empty
 * when written: the README names every one. The two checks below still run
 * over it, so the first entry anyone adds is held to them.
 */
const UNDOCUMENTED: Readonly<Record<string, UndocumentedReason>> = {};

describe('every export is documented or allowlisted (F10, eval-forms copy)', () => {
  // One README for the three entry points, so their exports are read as one
  // surface.
  const README = 'modules/eval-forms/README.md';
  const exported = () =>
    new Set(
      [
        '@zvenigora/ng-eval-forms',
        '@zvenigora/ng-eval-forms/reactive',
        '@zvenigora/ng-eval-forms/signals',
      ].flatMap((specifier) => [...exportedNames(SPECIFIER_ENTRY[specifier])])
    );
  const documented = () =>
    documentedNames(fs.readFileSync(path.join(workspaceRoot, README), 'utf8'));

  it('names every export in a code span of the package README, or allowlists it', () => {
    expect(undocumentedExports(exported(), documented(), UNDOCUMENTED, README)).toEqual([]);
  });

  it('allowlists only names the package still exports', () => {
    expect(staleAllowlistEntries(exported(), UNDOCUMENTED)).toEqual([]);
  });

  it('reads code spans, not fenced blocks, and not a member access', () => {
    const names = documentedNames(
      'Use `bindFieldProperties` and\n`binding.destroy()`.\n\n```ts\nimport { TEXT } from "x";\n```\n'
    );
    expect([...names].sort()).toEqual(['bindFieldProperties', 'binding']);
  });

  it('names the export it cannot account for, and the entry that excuses nothing', () => {
    const fixture = new Set(['A', 'B', 'C']);
    expect(undocumentedExports(fixture, new Set(['A']), { B: 'unused' }, 'fixture.md')).toEqual([
      'C: exported, named in no code span of fixture.md, and not allowlisted',
    ]);
    expect(staleAllowlistEntries(fixture, { B: 'unused', D: 'unused' })).toEqual([
      'D: allowlisted, and not exported',
    ]);
  });
});
