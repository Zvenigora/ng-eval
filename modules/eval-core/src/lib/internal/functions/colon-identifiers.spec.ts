import { TestBed } from '@angular/core/testing';
import { AnyNode, BinaryExpression, ExpressionStatement, Parser, Program,
  VariableDeclarator, parse as acornParse } from 'acorn';
import { parse } from './parse';
import { ParserService } from '../../actual/services/parser.service';
import { ParserOptions } from '../interfaces';

/**
 * The colon-joined name grammar, `docs/colon-identifiers/phase-9-plan.md`
 * § 3.4 and § 3.5, through both entry points: the free `parse` and
 * `ParserService.parse`, which parses through it.
 */

/**
 * The tree as one line, so that a row asserts the node types and names that
 * tell two readings apart (§ 6.1) — `(label Q1 1)` against `Q1:1` — rather
 * than that the text parsed. An identifier is its name, a literal its raw
 * text, a template's text its raw text quoted, and every other node
 * `(head child …)`.
 *
 * `VariableDeclarator` is named beside `AnyNode` because `acorn` 8.11.2's
 * `AnyNode` omits it, and this file must type-check at the `^8.11.2` peer
 * floor too (`docs/colon-identifiers/phase-9-plan.md` § 8 q3).
 */
const sx = (node: AnyNode | VariableDeclarator | null | undefined): string => {
  if (!node) {
    return '_';
  }
  const list = (head: string, nodes: (AnyNode | VariableDeclarator | null)[]) =>
    `(${[head, ...nodes.map(sx)].join(' ')})`;
  switch (node.type) {
    case 'Program':
      return node.body.map(sx).join(' ; ');
    case 'ExpressionStatement':
      return sx(node.expression);
    case 'LabeledStatement':
      return `(label ${sx(node.label)} ${sx(node.body)})`;
    case 'BlockStatement':
      return list('block', node.body);
    case 'VariableDeclaration':
      return list(node.kind, node.declarations);
    case 'VariableDeclarator':
      return `(= ${sx(node.id)} ${sx(node.init)})`;
    case 'Identifier':
      return node.name;
    case 'Literal':
      return node.raw ?? String(node.value);
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return `(${node.operator} ${sx(node.left)} ${sx(node.right)})`;
    case 'UpdateExpression':
      return `(${node.prefix ? '' : 'post'}${node.operator} ${sx(node.argument)})`;
    case 'ConditionalExpression':
      return `(? ${sx(node.test)} ${sx(node.consequent)} ${sx(node.alternate)})`;
    case 'CallExpression':
      return list(node.optional ? 'call?.' : 'call', [node.callee, ...node.arguments]);
    case 'MemberExpression':
      return `(${node.optional ? '?.' : '.'}${node.computed ? '[]' : ''} ` +
        `${sx(node.object)} ${sx(node.property)})`;
    case 'ChainExpression':
      return `(chain ${sx(node.expression)})`;
    case 'TemplateLiteral':
      return `(\` ${node.quasis.map((quasi, i) => [JSON.stringify(quasi.value.raw),
        ...(i < node.expressions.length ? [sx(node.expressions[i])] : [])].join(' '))
        .join(' ')})`;
    case 'ArrowFunctionExpression':
      return `(=> (${node.params.map(sx).join(' ')}) ${sx(node.body)})`;
    case 'ObjectExpression':
    case 'ObjectPattern':
      return list('{}', node.properties);
    case 'Property':
      if (node.kind !== 'init' || node.method) {
        throw new Error(`sx: no rendering for a ${node.kind} property`);
      }
      return `(${node.shorthand ? 'short' : ':'} ` +
        `${node.computed ? `[${sx(node.key)}]` : sx(node.key)} ${sx(node.value)})`;
    case 'SpreadElement':
    case 'RestElement':
      return `(... ${sx(node.argument)})`;
    case 'ArrayExpression':
    case 'ArrayPattern':
      return list('[]', node.elements);
    default:
      throw new Error(`sx: no rendering for ${node.type}`);
  }
};

/** A parse error, as asserted: class, message, `pos` and `loc` (§ 6.1). */
interface Failure {
  error: string;
  message: string;
  pos: number;
  loc: { line: number; column: number };
}

/** What a parse gave: the tree as `sx` renders it, or the error it raised. */
type Outcome = string | Failure;

const outcomeOf = (read: () => AnyNode | undefined): Outcome => {
  let node: AnyNode | undefined;
  try {
    node = read();
  } catch (e) {
    if (!(e instanceof SyntaxError)) {
      throw e;
    }
    const { pos, loc } = e as SyntaxError & Pick<Failure, 'pos' | 'loc'>;
    return { error: e.constructor.name, message: e.message, pos,
      loc: { line: loc.line, column: loc.column } };
  }
  return sx(node);
};

/** acorn's own error over a one-line source: `Unexpected token (1:pos)`. */
const err = (pos: number, message = 'Unexpected token'): Failure =>
  ({ error: 'SyntaxError', message: `${message} (1:${pos})`, pos, loc: { line: 1, column: pos } });

/** The hint of § 3.4, 1: the name a conditional's consequent did not join. */
const consequent = (name: string, pos: number): Failure =>
  err(pos, 'Unexpected token: a colon-joined name in the consequent of a conditional ' +
    `needs parentheses: (${name})`);

/** The refusal of § 3.4, 2: the key, and both ways to write what was meant. */
const objectKey = (name: string, first: string, pos: number): Failure =>
  err(pos, `Colon-joined name '${name}' cannot be an object key: ` +
    `write '${first}: ...' with a space for a property, or quote the key`);

interface Row {
  source: string;
  /** Today's reading, and the reading with the option unset or `false`. */
  off: Outcome;
  /** The reading with `colonIdentifiers: true`. */
  on: Outcome;
}

/** § 3.4's case table, row for row, and the rows its step 2 gate added. */
const CASE_TABLE: Row[] = [
  // One identifier.
  { source: 'Q1:1', off: '(label Q1 1)', on: 'Q1:1' },
  { source: 'VP14:0', off: '(label VP14 0)', on: 'VP14:0' },
  { source: 'DEALERS_COUNT:0', off: '(label DEALERS_COUNT 0)', on: 'DEALERS_COUNT:0' },
  { source: 'Q1:1:3', off: err(4), on: 'Q1:1:3' },
  { source: 'A1:2:3', off: err(4), on: 'A1:2:3' },
  { source: 'x + foo:1', off: err(7), on: '(+ x foo:1)' },
  { source: 'f(foo:1, A1:2:3)', off: err(5), on: '(call f foo:1 A1:2:3)' },
  { source: 'sheet:A1.value', off: '(label sheet (. A1 value))', on: '(. sheet:A1 value)' },
  { source: '`${foo:1}`', off: err(6), on: '(` "" foo:1 "")' },
  // After `.` and `?.`, and inside a computed member.
  { source: 'obj.Q1:1', off: err(6), on: '(. obj Q1:1)' },
  { source: 'obj.Q1:1.x', off: err(6), on: '(. (. obj Q1:1) x)' },
  { source: 'obj?.Q1:1', off: err(7), on: '(chain (?. obj Q1:1))' },
  { source: 'x?.Q1:1', off: err(5), on: '(chain (?. x Q1:1))' },
  { source: 'a?.[Q1:1]', off: err(6), on: '(chain (?.[] a Q1:1))' },
  { source: 'a?.b + Q1:1', off: err(9), on: '(+ (chain (?. a b)) Q1:1)' },
  // A segment is opaque text, and may start with a digit.
  { source: 'Q1:01', off: '(label Q1 01)', on: 'Q1:01' },
  { source: 'Q1:1e3', off: '(label Q1 1e3)', on: 'Q1:1e3' },
  { source: 'Q1:_x', off: '(label Q1 _x)', on: 'Q1:_x' },
  { source: 'Q1:$', off: '(label Q1 $)', on: 'Q1:$' },
  { source: 'a:b:c:d', off: '(label a (label b (label c d)))', on: 'a:b:c:d' },
  // Joined in a conditional's test and alternate, and either side of `??`.
  { source: 'Q1:1 ? 1 : 0', off: '(label Q1 (? 1 1 0))', on: '(? Q1:1 1 0)' },
  { source: 'c ? 0 : Q1:1', off: err(10), on: '(? c 0 Q1:1)' },
  { source: 'c ? 0 : Q1:1:3', off: err(10), on: '(? c 0 Q1:1:3)' },
  { source: 'a ?? Q1:1', off: err(7), on: '(?? a Q1:1)' },
  { source: 'Q1:1 ?? a', off: '(label Q1 (?? 1 a))', on: '(?? Q1:1 a)' },
  // Joined inside a delimiter a consequent opens.
  { source: 'c ? (Q1:1) : 0', off: err(7), on: '(? c Q1:1 0)' },
  { source: 'c ? f(Q1:1) : 0', off: err(8), on: '(? c (call f Q1:1) 0)' },
  { source: 'c ? f(Q1:1) : Q1:2', off: err(8), on: '(? c (call f Q1:1) Q1:2)' },
  { source: 'c ? [Q1:1][0] : 0', off: err(7), on: '(? c (.[] ([] Q1:1) 0) 0)' },
  { source: 'c ? `${Q1:1}` : 0', off: err(9), on: '(? c (` "" Q1:1 "") 0)' },
  { source: 'c ? d ? (Q1:1) : 2 : 3', off: err(11), on: '(? c (? d Q1:1 2) 3)' },
  { source: 'a ? (b ? (Q1:1) : 0) : Q1:2', off: err(12), on: '(? a (? b Q1:1 0) Q1:2)' },
  // Bindings and assignment targets.
  { source: 'let Q1:1 = 5; Q1:1 + 1', off: err(6), on: '(let (= Q1:1 5)) ; (+ Q1:1 1)' },
  { source: '(Q1:1 => Q1:1 + 1)(2)', off: err(3), on: '(call (=> (Q1:1) (+ Q1:1 1)) 2)' },
  { source: 'Q1:1 => 1', off: err(5), on: '(=> (Q1:1) 1)' },
  { source: 'let {a: Q1:1} = o', off: err(10), on: '(let (= ({} (: a Q1:1)) o))' },
  { source: '[Q1:1] = [5]', off: err(3), on: '(= ([] Q1:1) ([] 5))' },
  { source: 'Q1:1 = 2', off: err(3, 'Assigning to rvalue'), on: '(= Q1:1 2)' },
  { source: 'Q1:1++', off: err(3, 'Assigning to rvalue'), on: '(post++ Q1:1)' },
  // An object's value, computed key, spread and element.
  { source: '({a: Q1:1})', off: err(7), on: '({} (: a Q1:1))' },
  { source: '({[Q1:1]: 2})', off: err(5), on: '({} (: [Q1:1] 2))' },
  { source: '({...o, k: Q1:1})', off: err(13), on: '({} (... o) (: k Q1:1))' },
  { source: '({a: [x, Q1:1]})', off: err(11), on: '({} (: a ([] x Q1:1)))' },
  // JavaScript, unchanged.
  { source: 'a?b:c', off: '(? a b c)', on: '(? a b c)' },
  { source: 'a?b.c:d', off: '(? a (. b c) d)', on: '(? a (. b c) d)' },
  { source: 'a?1:b', off: '(? a 1 b)', on: '(? a 1 b)' },
  { source: 'a?"s":b', off: '(? a "s" b)', on: '(? a "s" b)' },
  { source: 'a?b:c?d:e', off: '(? a b (? c d e))', on: '(? a b (? c d e))' },
  { source: 'a?/x/g:b', off: '(? a /x/g b)', on: '(? a /x/g b)' },
  { source: 'f(a?b:c)', off: '(call f (? a b c))', on: '(call f (? a b c))' },
  { source: '[a?b:c]', off: '([] (? a b c))', on: '([] (? a b c))' },
  { source: '`${a?b:c}`', off: '(` "" (? a b c) "")', on: '(` "" (? a b c) "")' },
  { source: 'a?.5:1', off: '(? a .5 1)', on: '(? a .5 1)' },
  { source: 'c ? Q1:1', off: '(? c Q1 1)', on: '(? c Q1 1)' },
  { source: '"Q1:1"', off: '"Q1:1"', on: '"Q1:1"' },
  { source: '`Q1:1`', off: '(` "Q1:1")', on: '(` "Q1:1")' },
  { source: '/Q1:1/.test(s)', off: '(call (. /Q1:1/ test) s)', on: '(call (. /Q1:1/ test) s)' },
  { source: '({a: b})', off: '({} (: a b))', on: '({} (: a b))' },
  { source: "({'Q1:1': 2})", off: "({} (: 'Q1:1' 2))", on: "({} (: 'Q1:1' 2))" },
  { source: 'x ? {k: v} : 0', off: '(? x ({} (: k v)) 0)', on: '(? x ({} (: k v)) 0)' },
  // A name before the conditional's colon, after a delimiter the consequent
  // opened and closed: one per kind of closer, so a level never closed, or
  // closed without restoring the pending `?`, joins `c:d` here (step 2).
  { source: 'a?f(b)+c:d', off: '(? a (+ (call f b) c) d)', on: '(? a (+ (call f b) c) d)' },
  { source: 'a?x[0]+y:z', off: '(? a (+ (.[] x 0) y) z)', on: '(? a (+ (.[] x 0) y) z)' },
  { source: 'a?b.c(d).e:f', off: '(? a (. (call (. b c) d) e) f)',
    on: '(? a (. (call (. b c) d) e) f)' },
  { source: 'a?`${b}`+c:d', off: '(? a (+ (` "" b "") c) d)', on: '(? a (+ (` "" b "") c) d)' },
  { source: 'a?{k: 1}.k+b:c', off: '(? a (+ (. ({} (: k 1)) k) b) c)',
    on: '(? a (+ (. ({} (: k 1)) k) b) c)' },
  // A label, unchanged: whitespace or a comment, non-ASCII, an escape.
  { source: 'Q1 :1', off: '(label Q1 1)', on: '(label Q1 1)' },
  { source: 'Q1: 1', off: '(label Q1 1)', on: '(label Q1 1)' },
  { source: 'Q1/**/:1', off: '(label Q1 1)', on: '(label Q1 1)' },
  { source: 'Вопрос:1', off: '(label Вопрос 1)', on: '(label Вопрос 1)' },
  { source: 'Q1é:1', off: '(label Q1é 1)', on: '(label Q1é 1)' },
  { source: '\\u0051:1', off: '(label Q 1)', on: '(label Q 1)' },
  { source: 'Q1:Ответ', off: '(label Q1 Ответ)', on: '(label Q1 Ответ)' },
  // A `SyntaxError`, unchanged: no segment, a number, a keyword.
  { source: 'Q1:', off: err(3), on: err(3) },
  { source: 'Q1::1', off: err(3), on: err(3) },
  { source: '1:2', off: err(1), on: err(1) },
  { source: 'true:1', off: err(4), on: err(4) },
  { source: 'this:1', off: err(4), on: err(4) },
  { source: 'null:1', off: err(4), on: err(4) },
  { source: 'typeof:1', off: err(6), on: err(6) },
  { source: 'in:1', off: err(0), on: err(0) },
  { source: 'case:1', off: err(0), on: err(0) },
  { source: 'default:1', off: err(0), on: err(0) },
  // A word acorn reads as a name joins: a contextual one, and a reserved
  // word outside acorn's `keywords`, which today is refused as reserved.
  { source: 'let:1', off: '(label let 1)', on: 'let:1' },
  { source: 'enum:1', off: err(0, 'The keyword \'enum\' is reserved'), on: 'enum:1' },
  // The name ends at the last ASCII segment character.
  { source: 'Q1:1é', off: err(4, 'Identifier directly after number'), on: err(4) },
  // A block, not an object.
  { source: '{a:b}', off: '(block (label a b))', on: '(block a:b)' },
  // The colon a consequent's name lost: the hint (§ 3.4, 1).
  { source: 'c ? Q1:1 : 0', off: err(9), on: consequent('Q1:1', 9) },
  { source: 'f(c ? Q1:1 : 0)', off: err(11), on: consequent('Q1:1', 11) },
  { source: 'Q1:1 ? Q2:2 : Q3:3', off: err(12), on: consequent('Q2:2', 12) },
  { source: 'c ? x => Q1:1 : 2', off: err(14), on: consequent('Q1:1', 14) },
  { source: 'c ? f(x) + Q1:1 : 0', off: err(16), on: consequent('Q1:1', 16) },
  // A colon name as an object key: refused (§ 3.4, 2).
  { source: '({a:b})', off: '({} (: a b))', on: objectKey('a:b', 'a', 2) },
  { source: '({a:1})', off: '({} (: a 1))', on: objectKey('a:1', 'a', 2) },
  { source: '({Q1:1})', off: '({} (: Q1 1))', on: objectKey('Q1:1', 'Q1', 2) },
  { source: 'x ? 1 : {a:b}', off: '(? x 1 ({} (: a b)))', on: objectKey('a:b', 'a', 9) },
  { source: 'let {a:b} = o', off: '(let (= ({} (: a b)) o))', on: objectKey('a:b', 'a', 5) },
];

/** A parse of `source` through one entry point, with `options` added. */
type Read = (source: string, options: ParserOptions) => AnyNode | undefined;

const withOption = (setting: boolean | undefined): ParserOptions =>
  setting === undefined ? {} : { colonIdentifiers: setting };

const theFreeParse: Read = (source, options) => parse(source, options);

/**
 * Asks for the `Program`: `ParserService` defaults to `extractExpressions:
 * true`, which reads every label in the table as `undefined`.
 */
const throughService = (service: () => ParserService): Read => (source, options) =>
  service().parse(source, { extractExpressions: false, ...options });

/** The entry points, each with the `ParserService` its rows run on. */
const ENTRY_POINTS: [string, (service: () => ParserService) => Read][] = [
  ['the free parse', () => theFreeParse],
  ['ParserService.parse', throughService],
];

describe.each(ENTRY_POINTS)('colon-joined names through %s', (_, entryPoint) => {
  let service: ParserService;
  const read = entryPoint(() => service);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParserService);
  });

  describe('the case table', () => {
    it.each(CASE_TABLE)('$source', ({ source, off, on }) => {
      expect(outcomeOf(() => read(source, withOption(undefined)))).toEqual(off);
      expect(outcomeOf(() => read(source, withOption(false)))).toEqual(off);
      expect(outcomeOf(() => read(source, withOption(true)))).toEqual(on);
      // Off again, after the reading with the option on: on one service, a
      // cache key without the option would serve that reading here.
      expect(outcomeOf(() => read(source, withOption(undefined)))).toEqual(off);
    });
  });

  it('should span a colon name with the node, from its first character to its last', () => {
    const tree = read('x + Q1:1:3 * 2', { colonIdentifiers: true, locations: true }) as Program;

    expect(sx(tree)).toBe('(+ x (* Q1:1:3 2))');
    const sum = (tree.body[0] as ExpressionStatement).expression as BinaryExpression;
    const product = sum.right as BinaryExpression;
    expect(product.left).toMatchObject({
      type: 'Identifier', name: 'Q1:1:3', start: 4, end: 10,
      loc: { start: { line: 1, column: 4 }, end: { line: 1, column: 10 } },
    });
  });

  /**
   * P2: an error after a colon name is where acorn reports it over the same
   * text with `_` for each joining colon — one identifier there too.
   */
  it.each(['Q1:1 + * 2', 'x + Q1:1:3 +', 'Q1:1 Q2:2'])(
    'should raise %s where acorn raises it with _ for each joining colon', source => {
      const base = outcomeOf(() => acornParse(source.replace(/:/g, '_'), { ecmaVersion: 2020 }));

      // The comparison is between two errors, not two trees.
      expect(typeof base).toBe('object');
      expect(outcomeOf(() => read(source, { colonIdentifiers: true }))).toEqual(base);
    });

  /**
   * An error that is not about a colon name is acorn's, word for word: the
   * hint is added only at a colon its consequent's name lost. After the first
   * three, each holds a stray colon: one at a level that joined nothing, and
   * the rest after what ended the conditional whose consequent did not join
   * `b:c` — a `;` that starts a statement, a `,`, a `;` in a `for` head that
   * starts none, a semicolon acorn inserted at a line break, and a statement
   * that starts with the `(` that opens a level.
   */
  it.each(['a +', '(1', 'f(,)', 'a ? b : c : d', 'a?b:c; 1:2', 'f(a?b:c, 1:2)',
    'for (a?b:c; 1:2;) {}', 'x = a?b:c\ny = 1:2', 'if (z) y = a?b:c\nelse (1):2'])(
    'should raise acorn\'s own error for %s', source => {
      const base = outcomeOf(() => acornParse(source, { ecmaVersion: 2020 }));

      expect(typeof base).toBe('object');
      expect(outcomeOf(() => read(source, { colonIdentifiers: true }))).toEqual(base);
    });

  /**
   * A pinned known limit (§ 3.4, the rows under its table): with the leftover
   * colon on its own line, acorn inserts a semicolon at the line break, which
   * ends the conditional whose consequent did not join `Q1:1`, so the error is
   * acorn's own and the hint is not offered there.
   */
  it('should raise acorn\'s own error, with no hint, for a leftover colon on its own line', () => {
    const source = 'c ? Q1:1\n: 0';
    const outcome = outcomeOf(() => read(source, { colonIdentifiers: true }));

    expect(outcome).toEqual({ error: 'SyntaxError', message: 'Unexpected token (2:0)', pos: 9,
      loc: { line: 2, column: 0 } });
    expect(outcome).toEqual(outcomeOf(() => acornParse(source, { ecmaVersion: 2020 })));
    expect((outcome as Failure).message).not.toContain('parentheses');
  });
});

describe('acorn\'s own parser', () => {
  /** The methods the plugin overrides (§ 3.5). */
  const OVERRIDDEN =
    ['readWord', 'finishToken', 'parsePropertyName', 'parseStatement', 'unexpected'];

  /**
   * In a module registry of its own, so that acorn's prototype is read
   * before the plugin module has loaded: with a static import, both reads
   * would come after it.
   */
  it('should be untouched when the plugin module loads', () => {
    jest.isolateModules(() => {
      const acorn = jest.requireActual<{ Parser: typeof Parser }>('acorn');
      const own = acorn.Parser.prototype as unknown as Record<string, unknown>;
      const before = OVERRIDDEN.map(name => own[name]);

      const { ColonIdentifiersParser } =
        jest.requireActual<{ ColonIdentifiersParser: typeof Parser }>('./colon-identifiers');
      const extended = ColonIdentifiersParser.prototype as unknown as Record<string, unknown>;

      // The plugin extended this acorn, not another copy, and overrides each.
      expect(ColonIdentifiersParser.prototype).toBeInstanceOf(acorn.Parser);
      OVERRIDDEN.forEach((name, i) => {
        expect(typeof before[i]).toBe('function');
        expect(extended[name]).not.toBe(before[i]);
        expect(own[name]).toBe(before[i]);
      });
    });
  });
});
