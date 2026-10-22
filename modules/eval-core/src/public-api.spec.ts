/**
 * The documented-symbol drift gate for `@zvenigora/ng-eval-core` —
 * [`docs/backlog.md`](../../../docs/backlog.md) F3, built by
 * [`docs/gates/plan.md`](../../../docs/gates/plan.md) § 4 step 2.
 *
 * `modules/eval-core/README.md` is the package's whole documentation, and the
 * only copy a consumer installing the package can read. This file checks two
 * things about it: every identifier it imports from the specifier is exported,
 * and the scan is not silently empty — a floor, not a block count.
 *
 * Until Phase 10 step 5 the root `README.md` documented this package's API as
 * well, and this file checked it the same way, with a third case for the
 * published/unpublished relation: a symbol exported, documented in the root
 * README, and absent from the package README. The root README is a landing
 * page now, with no code to import from (D5, the last section below), so
 * those cases were removed rather than kept green over an empty import set
 * ([`docs/backlog-retired.md`](../../../docs/backlog-retired.md#f3), F3).
 *
 * **What this gate cannot see, stated because F3 was retired on it.** Only
 * identifiers inside an `import { … } from '@zvenigora/…'` statement are
 * checked. F3's own motivating example, `trackTime`, is an `EvalOptions` key
 * rather than an exported symbol and appears in no import statement in any
 * README — so the published/unpublished case would have stayed green through
 * the divergence that motivated it. Option keys, method names and
 * prose-documented API are outside this gate; F10, in `export-list.spec.ts`,
 * is the one that reads the package README's code spans for every export.
 *
 * The reader and the scanner live in `export-list.spec.ts` beside this file,
 * with their own probes; importing it re-registers those probes here, which is
 * the cost of a shared helper that must itself be a spec (see that file's
 * docstring).
 *
 * **`SECURITY.md` is checked here too** (the Phase 10 plan's § 3.10): every
 * identifier it names in code must resolve against the code, so the document
 * cannot again describe an API that does not exist, as it did from 2025-08-20
 * until Phase 10 step 2. Its helpers live in this file rather than in
 * `export-list.spec.ts`, since nothing imports this file and nothing they add
 * therefore runs twice. See the section below the README cases.
 *
 * **So are the peer ranges the package README quotes** (the Phase 10 plan's
 * § 3.5): each must equal the manifest's, and `## Install` must quote every
 * peer with its range. See the section below the `SECURITY.md` cases.
 *
 * **And the landing page holds no code** (the Phase 10 plan's D5): every fence
 * in the root `README.md`, in a blockquote or a list item as well, is an `sh`
 * block, and nothing in it imports or requires `@zvenigora/`, in the forms the
 * last section lists.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  SPECIFIER_ENTRY,
  exportedNames,
  namesFor,
  readmeImports,
  unresolvedImports,
  workspaceRoot,
} from './export-list.spec';
import { EvalState, defaultParserOptions, evaluate, parse } from './public-api';
import {
  isDangerousPrimitiveProperty,
  isDangerousProperty,
  mayMatchDangerousProperty,
} from './lib/internal/visitors/prototype-pollution-guard';

const SPECIFIER = '@zvenigora/ng-eval-core';
const ROOT_README = 'README.md';
const PACKAGE_README = 'modules/eval-core/README.md';

describe('README symbols resolve against the @zvenigora/ng-eval-core export list', () => {
  const exported = (): ReadonlySet<string> =>
    exportedNames(SPECIFIER_ENTRY[SPECIFIER]);

  describe(PACKAGE_README, () => {
    it('scans a non-empty identifier set containing EvalService', () => {
      // The floor (§ 1.5): a named symbol known to be there, not an expected
      // count — a later step adding an import must not turn this red.
      const scanned = namesFor(readmeImports(PACKAGE_README), SPECIFIER);
      expect(scanned.size).toBeGreaterThan(0);
      expect([...scanned]).toContain('EvalService');
    });

    it('imports no identifier the package does not export', () => {
      expect(unresolvedImports(PACKAGE_README, SPECIFIER, exported())).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// SECURITY.md (the Phase 10 plan, § 3.10)
// ---------------------------------------------------------------------------

const SECURITY_DOC = 'SECURITY.md';

/** ECMAScript's reserved words and literals: never identifiers, so never tokens. */
const KEYWORDS: ReadonlySet<string> = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'of', 'package',
  'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
]);

/**
 * A code span that is a path or a file name: a path separator, or one of the
 * extensions this repository's documents cite. Not "contains a dot", which
 * would skip `service.secureEval` (the plan's step 2, fixed at its gate).
 */
const PATH_SPAN = /[/\\]|\.(?:ts|md|json|mjs)$/;

/**
 * A code span that is one hyphenated lower-case word, such as `acorn-walk` or
 * `eval-core`: a package or file name. An identifier cannot hold a hyphen, so
 * the span names no API (the plan's step 2, Revision 3).
 */
const HYPHENATED_SPAN = /^@?[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

/** String literals and comments, removed before identifiers are read. */
const NOT_CODE =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

/**
 * Every identifier a markdown text names in code: in its code spans and in
 * its fenced blocks, member names after `.` included, string literals,
 * comments and keywords excluded, and path, file-name and hyphenated-name
 * spans skipped whole. Link targets are not read.
 */
const codeIdentifiers = (markdown: string): readonly string[] => {
  const code: string[] = [];
  const prose: string[] = [];
  let fence: { readonly ch: string; readonly length: number } | undefined;
  let block: string[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const run = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (run && run[1][0] === fence.ch && run[1].length >= fence.length && /^ {0,3}(`{3,}|~{3,})\s*$/.test(line)) {
        code.push(block.join('\n'));
        block = [];
        fence = undefined;
      } else {
        block.push(line);
      }
      prose.push('');
      continue;
    }
    if (run) {
      fence = { ch: run[1][0], length: run[1].length };
      prose.push('');
      continue;
    }
    prose.push(line);
  }
  if (fence) {
    // CommonMark runs an unclosed fence to the end of the document.
    code.push(block.join('\n'));
  }

  for (const span of prose.join('\n').matchAll(/(?<!`)(`+)((?:(?!\n[ \t]*\n)[\s\S])*?[^`])\1(?!`)/g)) {
    const text = span[2].trim();
    if (!PATH_SPAN.test(text) && !HYPHENATED_SPAN.test(text)) {
      code.push(text);
    }
  }

  return code.flatMap((text) =>
    [...text.replace(NOT_CODE, ' ').matchAll(/(?<![\w$])[A-Za-z_$][\w$]*/g)]
      .map((match) => match[0])
      .filter((name) => !KEYWORDS.has(name))
  );
};

/**
 * Whether the call sandbox refuses `name`: a call to it, with `context`
 * binding a benign stand-in under that name by default, throws the sandbox's
 * own refusal. Any other throw - an unbound name, a value that is not a
 * function, the prototype-pollution guard - does not count (the plan's step
 * 2, fixed at its gate).
 */
const sandboxRefuses = (
  name: string,
  context: Record<string, unknown> = { [name]: () => 1 }
): boolean => {
  try {
    evaluate(parse(`${name}()`, defaultParserOptions), EvalState.fromContext(context));
    return false;
  } catch (error) {
    return error instanceof Error
      && error.message === `Function call blocked for security reasons: ${name}`;
  }
};

/** Whether the prototype-pollution guard refuses `name`, or may under `caseInsensitive`. */
const guardRefuses = (name: string): boolean =>
  isDangerousProperty(name) || isDangerousPrimitiveProperty(name) || mayMatchDangerousProperty(name);

let exportCache: ReadonlySet<string> | undefined;

/** Every export of the five entry points `SPECIFIER_ENTRY` maps. */
const allExports = (): ReadonlySet<string> =>
  (exportCache ??= new Set(Object.values(SPECIFIER_ENTRY).flatMap((entry) => [...exportedNames(entry)])));

let memberCache: ReadonlySet<string> | undefined;

/**
 * Every property, instance or static, of a class, interface or type alias
 * that one of the five entry points exports - `EvalKnownOptions`' keys, the
 * `EvalOptions` keys, among them. Read with the TypeScript compiler, as
 * `export-list.spec.ts` reads the exports themselves.
 *
 * Object types only. A union of string literals, such as `EvalReadKind`, has
 * `String`'s methods as its apparent properties, and taking those would let
 * any string method resolve.
 *
 * And the packages' own declarations only. `EvalTrace` extends `Array`, and
 * `SignalContextWriteError` extends `Error`, so their properties include the
 * default library's - `copyWithin`, `toString`, `message` - and every class's
 * static side has `prototype`. Taken, those would let `toString`,
 * `toLocaleString` and `prototype` resolve by this route as well as by the
 * guard's, and a guard that stopped refusing them would leave the case green
 * (the plan's step 2, Revision 3).
 *
 * What it does not check: which object a member is on. `x.push` and `y.push`
 * resolve alike, if any exported type declares `push`.
 */
const allMembers = (): ReadonlySet<string> => {
  if (memberCache) {
    return memberCache;
  }
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(path.join(workspaceRoot, 'tsconfig.base.json'), ts.sys.readFile).config,
    ts.sys,
    workspaceRoot
  );
  const entries = Object.values(SPECIFIER_ENTRY).map((entry) => path.join(workspaceRoot, entry));
  const program = ts.createProgram(entries, {
    ...config.options,
    types: [],
    noEmit: true,
    skipLibCheck: true,
    declaration: false,
    sourceMap: false,
  });
  const checker = program.getTypeChecker();
  const names = new Set<string>();
  const declaredHere = (property: ts.Symbol): boolean =>
    !(property.flags & ts.SymbolFlags.Prototype)
    && (property.declarations ?? []).some((declaration) => {
      const file = declaration.getSourceFile();
      return !program.isSourceFileDefaultLibrary(file) && !program.isSourceFileFromExternalLibrary(file);
    });
  const addObjectProperties = (type: ts.Type): void => {
    for (const part of type.isUnionOrIntersection() ? type.types : [type]) {
      if (part.flags & ts.TypeFlags.Object) {
        for (const property of checker.getPropertiesOfType(part)) {
          if (declaredHere(property)) {
            names.add(property.name);
          }
        }
      }
    }
  };

  for (const entry of entries) {
    const source = program.getSourceFile(entry);
    const moduleSymbol = source ? checker.getSymbolAtLocation(source) : undefined;
    if (!moduleSymbol) {
      throw new Error(`SECURITY.md member reader: ${entry} is not a module in the program`);
    }
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
        addObjectProperties(checker.getDeclaredTypeOfSymbol(symbol));
      }
      const declaration = symbol.declarations?.[0];
      if (declaration && symbol.flags & ts.SymbolFlags.Class) {
        addObjectProperties(checker.getTypeOfSymbolAtLocation(symbol, declaration));
      }
    }
  }
  if (!names.has('maxIterations') || !names.has('checkMemberWrite')) {
    throw new Error('SECURITY.md member reader: a known member is missing, so the set would be short');
  }
  return (memberCache = names);
};

/** The directory whose declarations the source route reads. */
const SOURCE_ROOT = 'modules/eval-core/src/lib';

let sourceCache: ReadonlySet<string> | undefined;

/**
 * Every name declared at the top level of a non-spec `.ts` file under
 * `modules/eval-core/src/lib/` - a function, a `const`, a class, an interface
 * or a type alias, exported or not - so a document can name an internal
 * helper such as `isDangerousProperty` and still be checked against the code.
 * Each file is parsed, not searched, so a name that appears there only inside
 * a string literal is not a declaration: `fetch`, which `call-expression.ts`
 * holds as a string in its list of refused callees, does not resolve here.
 */
const sourceDeclarations = (): ReadonlySet<string> => {
  if (sourceCache) {
    return sourceCache;
  }
  const filesUnder = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? filesUnder(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
    );
  const names = new Set<string>();

  for (const file of filesUnder(path.join(workspaceRoot, SOURCE_ROOT))) {
    if (!file.endsWith('.ts') || /\.(spec|test)\.ts$/.test(file)) {
      continue;
    }
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    for (const statement of source.statements) {
      if (
        (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
          || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement))
        && statement.name
      ) {
        names.add(statement.name.text);
      } else if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            names.add(declaration.name.text);
          }
        }
      }
    }
  }
  if (!names.has('isDangerousProperty') || !names.has('DANGEROUS_FUNCTIONS')) {
    throw new Error('SECURITY.md source reader: a known declaration is missing, so the set would be short');
  }
  return (sourceCache = names);
};

/** The routes by which code resolves `name`, without the allowlist. */
const codeRoutes = (name: string): readonly string[] => [
  ...(allExports().has(name) ? ['export'] : []),
  ...(allMembers().has(name) ? ['member'] : []),
  ...(sourceDeclarations().has(name) ? ['source'] : []),
  ...(guardRefuses(name) ? ['guard'] : []),
  ...(sandboxRefuses(name) ? ['sandbox'] : []),
];

/**
 * Why a name `SECURITY.md` uses in code resolves by no code route. A fixed set;
 * every entry takes one, and an entry a code route also resolves fails the
 * second case below, so the list cannot mask a probe.
 *
 * `js-global` and `js-member` are reasons, not routes, on purpose. Resolving a
 * name because it is in `globalThis`, or on a built-in prototype, would give
 * the probe targets a second route: `fetch` is a global in Node, and
 * `__proto__` and `constructor` are on `Object.prototype` (the plan's step 2,
 * Revision 3).
 */
type SecurityAllowReason =
  | 'js-global' // a JavaScript global the evaluator does not export
  | 'js-member' // a method of a built-in prototype
  | 'package-name' // an npm package named in a single-word code span
  | 'regex-text' // an anchor or a flag in a regular expression quoted as text
  | 'attack-input' // a name from a reviewed advisory's proof-of-concept
  | 'example-binding'; // a context key an example invents

const SECURITY_ALLOWLIST: Readonly<Record<string, SecurityAllowReason>> = {
  Error: 'js-global',
  EvalError: 'js-global',
  JSON: 'js-global',
  NaN: 'js-global',
  Object: 'js-global',
  Promise: 'js-global',
  Proxy: 'js-global',
  RangeError: 'js-global',
  Reflect: 'js-global',
  Set: 'js-global',
  String: 'js-global',
  globalThis: 'js-global',
  undefined: 'js-global',

  apply: 'js-member',
  assign: 'js-member',
  bind: 'js-member',
  defineProperty: 'js-member',
  freeze: 'js-member',
  map: 'js-member',
  setPrototypeOf: 'js-member',
  stringify: 'js-member',
  then: 'js-member',
  toUpperCase: 'js-member',

  acorn: 'package-name',
  jsep: 'package-name',

  $: 'regex-text',
  constructor$: 'regex-text',
  i: 'regex-text',

  execSync: 'attack-input',
  mainModule: 'attack-input',

  c: 'example-binding',
  ctx: 'example-binding',
  e: 'example-binding',
  f: 'example-binding',
  fn: 'example-binding',
  getEval: 'example-binding',
  host: 'example-binding',
  k: 'example-binding',
  n: 'example-binding',
  ns: 'example-binding',
  obj: 'example-binding',
  run: 'example-binding',
  s: 'example-binding',
  tools: 'example-binding',
  v: 'example-binding',
  wrap: 'example-binding',
  x: 'example-binding',
};

describe('SECURITY.md names only what the code has (Phase 10, § 3.10)', () => {
  const doc = (): string => fs.readFileSync(path.join(workspaceRoot, SECURITY_DOC), 'utf8');

  it('resolves every identifier it names in code', () => {
    const unresolved = [...new Set(codeIdentifiers(doc()))]
      .filter((name) => codeRoutes(name).length === 0 && !Object.prototype.hasOwnProperty.call(SECURITY_ALLOWLIST, name))
      .sort();
    expect(unresolved).toEqual([]);
  });

  it('allowlists only names the document uses and no code route resolves', () => {
    const used = new Set(codeIdentifiers(doc()));
    const problems = Object.keys(SECURITY_ALLOWLIST)
      .sort()
      .flatMap((name) => [
        ...(used.has(name) ? [] : [`${name}: allowlisted, and not in ${SECURITY_DOC}`]),
        ...codeRoutes(name).map((route) => `${name}: allowlisted, and resolved by the ${route} route`),
      ]);
    expect(problems).toEqual([]);
  });

  it('reads code the way the two cases above rely on', () => {
    // The tokenizer. A path, a file name and a hyphenated word are skipped
    // whole; a dot without a known extension is not a file name, and a spaced
    // hyphen is a subtraction, not a name.
    expect([...codeIdentifiers([
      'A member call `service.secureEval(expr)` is read whole, and so is `x["CONSTRUCTOR"]`.',
      'A path `modules/eval-core/src/index.ts`, a file `member-expression.ts`, a package `acorn-walk`',
      'and `@zvenigora/jse-eval` are skipped, `a - b` is not, and `new Foo` keeps only its name.',
      '',
      '```js',
      'const s = "return process"; /* gone */ obj.run(`tpl ${y}`) // gone too',
      '```',
    ].join('\n'))].sort()).toEqual(['Foo', 'a', 'b', 'expr', 'obj', 'run', 's', 'secureEval', 'service', 'x']);
    // An unclosed fence runs to the end of the document, and is read.
    expect(codeIdentifiers('Text.\n\n```js\nservice.secureEval()\n')).toEqual(['service', 'secureEval']);

    // The member route: object types only, and the packages' own declarations
    // only. `EvalReadKind` is an exported union of strings, `EvalTrace` extends
    // `Array` and `SignalContextWriteError` extends `Error`; none of their
    // built-in members, nor a class's static `prototype`, is a member by it.
    expect(allExports().has('EvalReadKind')).toBe(true);
    expect(allExports().has('EvalTrace')).toBe(true);
    expect(allMembers().has('toUpperCase')).toBe(false);
    expect(allMembers().has('copyWithin')).toBe(false); // `Array`'s; `push` is `Stack`'s and `EvalContext`'s own
    expect(allMembers().has('push')).toBe(true);
    expect(allMembers().has('message')).toBe(false);
    expect(allMembers().has('checkMemberWrite')).toBe(true);
    expect(codeRoutes('toString')).toEqual(['guard']);
    expect(codeRoutes('toLocaleString')).toEqual(['guard']);
    expect(codeRoutes('prototype')).toEqual(['guard']);

    // The source route: declarations, parsed, not text. `fetch` is in
    // call-expression.ts as a string literal, and only as one.
    const callExpression = fs.readFileSync(
      path.join(workspaceRoot, SOURCE_ROOT, 'internal/visitors/call-expression.ts'), 'utf8');
    expect(callExpression).toContain("'fetch',");
    expect(sourceDeclarations().has('fetch')).toBe(false);
    expect(sourceDeclarations().has('DANGEROUS_FUNCTIONS')).toBe(true);
    expect(sourceDeclarations().has('isDangerousPrimitiveProperty')).toBe(true);

    // The two probe targets each resolve by exactly one route, the source
    // route included (the plan's step 2, fixed at its gate).
    expect(codeRoutes('fetch')).toEqual(['sandbox']);
    expect(codeRoutes('__proto__')).toEqual(['guard']);

    // The sandbox route: its own refusal resolves a name, and any other throw does not.
    expect(sandboxRefuses('fetch')).toBe(true);
    expect(sandboxRefuses('fetch', {})).toBe(false); // absent from the context: "Cannot call undefined or null function"
    expect(() => evaluate(parse('fetch()', defaultParserOptions), EvalState.fromContext({}))).toThrow(
      'Cannot call undefined or null function'
    );
    expect(sandboxRefuses('fetch', { fetch: 1 })).toBe(false); // "Value is not a function"
    expect(sandboxRefuses('benignStandIn')).toBe(false); // called, and returned 1
    expect(sandboxRefuses('constructor')).toBe(false); // the guard's refusal, not the sandbox's
  });
});

// ---------------------------------------------------------------------------
// Quoted peer ranges (the Phase 10 plan, § 3.5)
// ---------------------------------------------------------------------------

const MANIFEST = 'modules/eval-core/package.json';

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
 * read as `acorn`, which is this package's peer as well. A span may wrap a
 * line, and its whitespace is collapsed; as in CommonMark, it ends at a blank
 * line, so a stray backtick cannot pair across paragraphs and hide every span
 * after it. A fence opens on three or more backticks or tildes, and closes on
 * the same character, at least as many.
 *
 * Not seen, by design: a range in prose without its peer as the span's first
 * word, a span with no space after its peer (`` `acorn@^8.11.2` ``), and a
 * range in a fenced line of any other shape.
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

describe('README peer ranges equal the @zvenigora/ng-eval-core manifest', () => {
  it('quotes every peer in ## Install, and every quoted range as the manifest declares it', () => {
    const declared: Readonly<Record<string, string>> =
      JSON.parse(fs.readFileSync(path.join(workspaceRoot, MANIFEST), 'utf8')).peerDependencies;
    const quoted = quotedRanges(
      fs.readFileSync(path.join(workspaceRoot, PACKAGE_README), 'utf8'),
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

// ---------------------------------------------------------------------------
// The landing page holds no code (the Phase 10 plan, D5)
// ---------------------------------------------------------------------------

/**
 * Every fenced block `markdown` opens, as `<line> (<info string>)`, the info
 * string's first word or `none`. A fence opens on three or more backticks or
 * tildes, and closes on the same character, at least as many, with no info
 * string.
 *
 * Looser than `codeIdentifiers` on purpose: any indentation and any `>`
 * prefix may precede the fence, so a fence in a blockquote or a nested list
 * item, which GitHub renders as a code block, is read too. A line that only
 * looks like a fence is reported rather than missed, which for a check that
 * fails on every fence but `sh` is the safe direction.
 */
const fencesOf = (markdown: string): readonly { readonly line: number; readonly label: string }[] => {
  const found: { line: number; label: string }[] = [];
  let fence: { readonly ch: string; readonly length: number } | undefined;
  markdown.split(/\r?\n/).forEach((text, index) => {
    const run = /^[\s>]*(`{3,}|~{3,})\s*(\S*)/.exec(text);
    if (!run) {
      return;
    }
    if (!fence) {
      fence = { ch: run[1][0], length: run[1].length };
      found.push({ line: index + 1, label: run[2] || 'none' });
    } else if (run[1][0] === fence.ch && run[1].length >= fence.length && !run[2]) {
      fence = undefined;
    }
  });
  return found;
};

/**
 * An `@zvenigora/` specifier after `from`, `import` or `require`, anywhere in
 * the text, fenced or not, and read over the whole text rather than a line at a
 * time: a static import, its `from` on its own line or not, a side-effect
 * import, a dynamic `import(…)` and a `require(…)`, with any of the three
 * quotes. Not seen: a specifier with nothing but a comment between it and its
 * keyword.
 */
const ZVENIGORA_IMPORT = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"`]@zvenigora\//g;

describe('the root README is a landing page (Phase 10, D5)', () => {
  it('holds no fence but sh, and imports nothing from @zvenigora/', () => {
    const markdown = fs.readFileSync(path.join(workspaceRoot, ROOT_README), 'utf8');
    const fences = fencesOf(markdown)
      .filter((fence) => fence.label !== 'sh')
      .map((fence) => `${ROOT_README}:${fence.line} (${fence.label})`);
    const imports = [...markdown.matchAll(ZVENIGORA_IMPORT)].map(
      (match) => `${ROOT_README}:${markdown.slice(0, match.index).split('\n').length}`
    );
    expect({ fences, imports }).toEqual({ fences: [], imports: [] });
  });
});
