/**
 * The export-list reader and the README import scanner — § 3.1 of
 * [`docs/gates/plan.md`](../../../docs/gates/plan.md), with its own probes.
 *
 * **Why this file is a `*.spec.ts` and not a plain module.** Track 3 may add or
 * edit only specs, `project.json`, READMEs and `docs/`; a non-spec source file
 * under `src/lib/` is a stop-and-replan (§ 6 gate 1). A `.spec.ts` is the only
 * shape a shared test utility can legally take here, and building the reader
 * first with its own cases (§ 3.1) is what keeps "the export list is wrong" and
 * "the README is wrong" from being read as one failure — they now fail in
 * different files.
 *
 * **Why it is triplicated.** `eval-signals` and `eval-forms` carry byte-similar
 * copies. This is deliberate, not an oversight: `@nx/enforce-module-boundaries`
 * runs with `allow: []` (root `eslint.config.mjs`), so no spec may import a
 * helper out of another project — by alias or relatively — and § 6 gate 4
 * forbids loosening that rule to serve a spec. What retires the triplication is
 * a shared spec-utilities location the boundary rule permits. No such location
 * exists in this workspace, and building one is not this track's to do.
 *
 * The reader resolves the export list with the TypeScript compiler API rather
 * than `Object.keys` over a namespace import, because a runtime export list is
 * blind to `export interface` and `export type` and the READMEs document those
 * (§ 1.1). It reads the file each specifier resolves to in `tsconfig.base.json`
 * — `src/index.ts` for the three package specifiers — so it reads the graph a
 * consumer's import actually enters. See § 3.1 as amended for the hop counts.
 *
 * The scanner reads the whole markdown file rather than only fenced blocks.
 * That is a superset of F3's wording and cannot miss an import a fence parser
 * would; the cost is that an import deliberately shown as wrong in prose would
 * be scanned. No README does that today.
 *
 * Three import forms it does **not** handle, none of which any README uses:
 * an inline type modifier (`import { type X, Y }`) yields the name `"type X"`
 * and would report a spurious failure; a default-plus-named import
 * (`import D, { X } from …`) and a namespace import (`import * as api from …`)
 * are not matched at all. The first is a false fail, the other two a silent
 * miss — worth knowing before adding one of those forms to a README.
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
 * outside `src/public-api.ts`.
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
 * a missing file, a file that is not a module, a module that exports nothing.
 * A reader that silently returns `[]` passes every check built on it, which is
 * the failure the caller cannot see.
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
 * that span lines — the two in the root `README.md` carry all five symbols the
 * published/unpublished check exists for.
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

describe('export-list reader (eval-core copy)', () => {
  const core = () => exportedNames(SPECIFIER_ENTRY['@zvenigora/ng-eval-core']);

  it('returns a value export', () => {
    expect([...core()]).toContain('EvalService');
  });

  it('returns a type-only export, which a runtime export list cannot see', () => {
    // Both are type-only and have no runtime presence at all: `QueueType` is
    // `export interface`, `RecursiveVisitorState` a type alias.
    expect([...core()]).toContain('QueueType');
    expect([...core()]).toContain('RecursiveVisitorState');
  });

  it('follows the barrel graph through every hop', () => {
    // Hops are counted as edges from the file the specifier resolves to.
    // `CacheType` is four: index.ts → public-api.ts →
    // lib/internal/interfaces/index.ts → its public-api.ts → cache-type.ts
    // (five files). It is type-only as well, so it needs both properties at
    // once. `EvalService` is the same depth through a different chain:
    // index.ts → public-api.ts → lib/actual/services/index.ts → its
    // public-api.ts → eval.service.ts. A single-file parser sees neither.
    expect([...core()]).toContain('CacheType');
    expect([...core()]).toContain('EvalService');
  });

  it('returns exports, not every declaration the program can reach', () => {
    // `getDefaultVisitors` is `export const` in
    // lib/internal/visitors/recursive-visitors.ts and is *in* this program —
    // `evaluate` imports it — but `src/public-api.ts` deliberately does not
    // re-export `internal/visitors`. A reader that enumerated declarations
    // rather than exports would return it. A name that exists nowhere, like
    // the second one, cannot tell those two readers apart.
    expect([...core()]).not.toContain('getDefaultVisitors');
    expect([...core()]).not.toContain('NotAnExportedSymbol');
  });

  it('is not silently empty', () => {
    expect(core().size).toBeGreaterThan(20);
  });

  it('throws rather than returning an empty set for a missing entry file', () => {
    expect(() => exportedNames('modules/eval-core/src/no-such-file.ts')).toThrow(
      /no such entry file/
    );
  });

  it('throws rather than returning an empty set for a file the program will not load', () => {
    // A path that exists but is not TypeScript. This exercises the
    // "not in the program" branch specifically, and the assertion pins that
    // branch rather than accepting any of the reader's throws — the other
    // "nothing to read" branches are unreachable from a fixture this step may
    // legally add, since each needs a real source file under `src/`.
    expect(() => exportedNames('modules/eval-core/README.md')).toThrow(
      /export-list reader: modules\/eval-core\/README\.md is not in the program/
    );
  });

  it('agrees with tsconfig.base.json about what each specifier resolves to', () => {
    // `SPECIFIER_ENTRY` is a hand-maintained mirror of `paths`, inside a gate
    // whose whole subject is a hand-maintained document drifting from the code.
    // Repoint a mapping at a different existing file and every gate would check
    // the wrong surface, silently and greenly.
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
        path.relative(workspaceRoot, path.resolve(workspaceRoot, targets[0])).split(path.sep).join('/'),
      ])
    );
    expect(declared).toEqual({ ...SPECIFIER_ENTRY });
  });
});

describe('README import scanner (eval-core copy)', () => {
  it('scans a single-line import', () => {
    const found = readmeImportsFromText(
      "```javascript\nimport { EvalService } from '@zvenigora/ng-eval-core';\n```\n"
    );
    expect(found).toEqual([
      {
        specifier: '@zvenigora/ng-eval-core',
        names: ['EvalService'],
        line: 2,
      },
    ]);
  });

  it('scans an import statement that spans two lines', () => {
    // The arm a first-line-only reader fails. Both of the root README's
    // multi-line statements have this shape, and between them they carry every
    // symbol the published/unpublished check is about.
    const found = readmeImportsFromText(
      "import { EvalContext, EvalScope, EvalScopeOptions,\n  EvalService } from '@zvenigora/ng-eval-core';\n"
    );
    expect(found).toHaveLength(1);
    expect(found[0].names).toEqual([
      'EvalContext',
      'EvalScope',
      'EvalScopeOptions',
      'EvalService',
    ]);
    expect(found[0].line).toBe(1);
  });

  it('scans a type-only import and reports the imported name of an alias', () => {
    const found = readmeImportsFromText(
      "import type { ExpressionRules as Rules } from '@zvenigora/ng-eval-forms/signals';\n"
    );
    expect(found[0].names).toEqual(['ExpressionRules']);
  });

  it('ignores imports from other packages', () => {
    const found = readmeImportsFromText(
      "import { signal } from '@angular/core';\n"
    );
    expect(found).toEqual([]);
  });
});
