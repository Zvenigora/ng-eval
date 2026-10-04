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

/**
 * The failures **every** `@zvenigora/…` import produces, each resolved
 * against its own specifier's export list rather than one fixed specifier
 * (`docs/backlog.md` F11). A README's cross-package line - `eval-signals`'
 * README importing `EvalService` from `@zvenigora/ng-eval-core` - was scanned
 * by no gate before: its own package's gate filtered on its own specifier, and
 * the exporting package's gate never reads that README. The README's own
 * package owns the line, so a rename in another package turns this package's
 * gate red, where the stale line is.
 *
 * Read through `SPECIFIER_ENTRY`, which mirrors `tsconfig.base.json` and is
 * checked against it below, and through the TypeScript compiler, which opens
 * the other package's sources as files - no import crosses the module
 * boundary rule. A specifier the workspace does not map is a failure in its own
 * right rather than a silent skip.
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
 * (`docs/backlog.md` F10). A fixed set, and every allowlist entry takes one:
 *
 * - `signature-type` - a type a reader meets only through a documented
 *   symbol's signature: a parameter, an option, a return value, an event, or
 *   an element of one.
 * - `function-form` - a free function a documented service method wraps, or
 *   the default that method uses. The service is the documented form.
 * - `example-only` - named in one of the README's fenced code examples, and
 *   in no code span.
 * - `building-block` - a general-purpose class the evaluator is built from,
 *   its type, or a helper over it: usable directly, documented nowhere.
 * - `unused` - referenced by nothing in the workspace beyond its own
 *   declaration and the barrels, and kept because removing an export is a
 *   breaking release.
 */
export type UndocumentedReason =
  | 'signature-type'
  | 'function-form'
  | 'example-only'
  | 'building-block'
  | 'unused';

/**
 * Every identifier a markdown text names inside a code span, outside fenced
 * blocks - what "documented" means for F10. A span may run over a line break
 * but not over a blank line, and an identifier after a `.` is a member access
 * that does not count, so `` `service.parse(expr)` `` names `service` and
 * not the exported function `parse`.
 *
 * A fenced block does not count, even one importing the name: an example
 * shows a symbol in use rather than saying what it is, and the
 * `example-only` reason exists for the export that only an example names.
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

/**
 * Each allowlist entry the package no longer exports, so the list cannot
 * outlive what it excuses. The other direction - an allowlisted name the
 * README has since documented - is harmless and not checked.
 */
export const staleAllowlistEntries = (
  exported: ReadonlySet<string>,
  allowlist: Readonly<Record<string, UndocumentedReason>>
): readonly string[] =>
  Object.keys(allowlist)
    .filter((name) => !exported.has(name))
    .sort()
    .map((name) => `${name}: allowlisted, and not exported`);

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

describe('every @zvenigora import resolves against its own specifier (F11, eval-core copy)', () => {
  // The READMEs this project's gates own.
  it.each(['README.md', 'modules/eval-core/README.md'])('%s', (readme) => {
    expect(unresolvedAcrossSpecifiers(readmeImports(readme), readme)).toEqual([]);
  });

  it('checks a cross-package import against the other package, and names it', () => {
    const found = unresolvedAcrossSpecifiers(
      readmeImportsFromText(
        "import { createEvalSignal, createEvalSignalz } from '@zvenigora/ng-eval-signals';\n"
      ),
      'fixture.md'
    );
    expect(found).toEqual([
      "fixture.md:1 imports { createEvalSignalz } from '@zvenigora/ng-eval-signals', which it does not export",
    ]);
  });

  it('fails a specifier the workspace does not map, rather than skipping it', () => {
    const found = unresolvedAcrossSpecifiers(
      readmeImportsFromText("import { X } from '@zvenigora/ng-eval-nowhere';\n"),
      'fixture.md'
    );
    expect(found).toEqual([
      "fixture.md:1 imports from '@zvenigora/ng-eval-nowhere', which no tsconfig.base.json path maps",
    ]);
  });
});

/**
 * The exports `modules/eval-core/README.md` names in no code span, each with
 * its reason (`docs/backlog.md` F10). The package README names twelve of the
 * seventy-six and defers the rest to the repository README, which ships
 * nowhere; a name documented only there is undocumented for whoever installed
 * the package, which is the split F3 found.
 *
 * `unused` counts references in all three libraries' non-spec sources,
 * measured when the list was written; `docs/backlog.md` B5 holds the question
 * of removing them.
 */
const UNDOCUMENTED: Readonly<Record<string, UndocumentedReason>> = {
  // A parameter, option, return value or event of `EvalService`,
  // `CompilerService`, `ParserService`, `DiscoveryService`, `EvalContext`,
  // `EvalHooks`, `createDependencyTracker` or `createTimingHook`.
  AnyNodeTypes: 'signature-type',
  BaseContext: 'signature-type',
  Context: 'signature-type',
  EvalDependencyTracker: 'signature-type',
  EvalHookError: 'signature-type',
  EvalHookErrorPolicy: 'signature-type',
  EvalHookPhase: 'signature-type',
  EvalKnownOptions: 'signature-type',
  EvalLookup: 'signature-type',
  EvalMemberWrite: 'signature-type',
  EvalNodeHook: 'signature-type',
  EvalNodeHookEvent: 'signature-type',
  EvalNodeTiming: 'signature-type',
  EvalOptions: 'signature-type',
  EvalReadEvent: 'signature-type',
  EvalReadHook: 'signature-type',
  EvalReadKind: 'signature-type',
  EvalResult: 'signature-type',
  EvalState: 'signature-type',
  EvalTimingHook: 'signature-type',
  EvalTrace: 'signature-type',
  EvalTraceItem: 'signature-type',
  ParserOptions: 'signature-type',
  stateCallback: 'signature-type',
  stateCallbackAsync: 'signature-type',
  Unsubscribe: 'signature-type',

  // What `CompilerService`, `EvalService`, `ParserService` and
  // `DiscoveryService` call.
  call: 'function-form',
  callAsync: 'function-form',
  compile: 'function-form',
  compileAsync: 'function-form',
  defaultParserOptions: 'function-form',
  evaluate: 'function-form',
  extract: 'function-form',
  extractExpression: 'function-form',
  parse: 'function-form',

  // `### Per-node timing`'s second block imports and calls it.
  createTimingHook: 'example-only',

  BaseRegistry: 'building-block',
  Cache: 'building-block',
  CacheType: 'building-block',
  CaseInsensitiveRegistry: 'building-block',
  fromContext: 'building-block',
  getContextValue: 'building-block',
  Registry: 'building-block',
  RegistryEntries: 'building-block',
  RegistryType: 'building-block',
  Stack: 'building-block',
  StackType: 'building-block',

  AggregateType: 'unused',
  getContextKey: 'unused',
  isRegistryContext: 'unused',
  Queue: 'unused',
  QueueType: 'unused',
  RecursiveAggregateVisitor: 'unused',
  RecursiveVisitor: 'unused',
  RecursiveVisitorContext: 'unused',
  RecursiveVisitorOptions: 'unused',
  RecursiveVisitorRegistryResult: 'unused',
  RecursiveVisitorResult: 'unused',
  RecursiveVisitorResultType: 'unused',
  RecursiveVisitorStackResult: 'unused',
  RecursiveVisitorState: 'unused',
  RegistryOptionType: 'unused',
  ScopeOptions: 'unused',
  ScopeType: 'unused',
};

describe('every export is documented or allowlisted (F10, eval-core copy)', () => {
  const README = 'modules/eval-core/README.md';
  const exported = () => exportedNames(SPECIFIER_ENTRY['@zvenigora/ng-eval-core']);
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
      'Use `EvalService`, ``a `quoted` span``, and\n`service.parse(expr)`.\n\n' +
        '```ts\nimport { Queue } from "x";\n```\n'
    );
    expect([...names].sort()).toEqual(['EvalService', 'a', 'expr', 'quoted', 'service', 'span']);
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
