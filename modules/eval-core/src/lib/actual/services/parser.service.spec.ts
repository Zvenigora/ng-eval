import { TestBed } from '@angular/core/testing';

import { ParserService } from './parser.service';
import { EvalService } from './eval.service';
import * as fingerprint from './parse-fingerprint';
import { ParserOptions } from '../../internal/interfaces';
import { defaultParserOptions } from '../../internal/classes/eval';
import { BinaryExpression, Literal, parse as acornParse } from 'acorn';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse expression', () => {
    // const t0 = performance.now();
    const expr = '1 + 2';
    const ast = service.parse(expr, {} as ParserOptions);
    // const t1 = performance.now();
    // console.log(`Call to parse took ${t1 - t0} milliseconds.`);
    expect(ast).toBeDefined();
    expect(ast?.type).toBe('BinaryExpression');
    expect((ast as BinaryExpression).operator).toBe('+');
  });

  it('should return version > 8', () => {
    const version = service.version;
    expect(parseFloat(version)).toBeGreaterThan(8);
  });

  it('#parse 1+ should return error', () => {
    expect(() => service.parse('1+')).toThrow('Unexpected token (1:2)');
  });

  it('#parse [a] should return ArrayExpression', () => {
    const ast = service.parse('[a]');
    // const ast = {
    //   type: 'ArrayExpression',
    //   start: 0,
    //   end: 3,
    //   elements: [ { type: 'Identifier', start: 1, end: 2, name: 'a' } ]
    // };

    const expected = {
      type: 'ArrayExpression',
      elements: [{ type: 'Identifier', name: 'a' }]
    };
    expect(ast).toBeTruthy();
    expect(ast).toEqual(
      expect.objectContaining({
        type: expected.type,
        elements: expect.arrayContaining([
          expect.objectContaining(
            expected.elements[0]
          )
        ])
      })
    );
  });

  it.each([
    ['\'abc\'', { type: 'Literal', value: 'abc' }],
    ['"abc"', { type: 'Literal', value: 'abc' }],
    ['123', { type: 'Literal', value: 123 }],
    ['12.3', { type: 'Literal', value: 12.3 }],
    ['true', { type: 'Literal', value: true }],
    ['null', { type: 'Literal', value: null }],
    ['NaN', { type: 'Identifier', name: 'NaN' }],
    ['Infinity', { type: 'Identifier', name: 'Infinity' }],
    ['undefined', { type: 'Identifier', name: 'undefined' }],
  ])("Constants: when the input is '%s', value is %p", (expr: string, expected: object) => {
    const actual = service.parse(expr);
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it.each`
    expression    | result
    ${'\'abc\''}  | ${{ value: 'abc' }}
    ${'"abc"'}    | ${{ value: 'abc' }}
    ${'123'}      | ${{ value: 123 }}
    ${'12.3'} | ${{ value: 12.3 }}
    ${'true'} | ${{ value: true }}
    ${'null'} | ${{ value: null }}
  `
    ("Constants 2: when the input is $expression, value is $result", ({ expression, result }) => {
      const actual = service.parse(expression);
      expect(actual).toEqual(expect.objectContaining(result));
    });

    it.each([
      ["'a \\w b'", "a w b"],
      ["'a \\' b'", "a ' b"],
      ["'a \\n b'", "a \n b"],
      ["'a \\r b'", "a \r b"],
      ["'a \\t b'", "a \t b"],
      ["'a \\b b'", "a \b b"],
      ["'a \\f b'", "a \f b"],
      ["'a \\v b'", "a \v b"],
      // ["'a \\\ b'", "a \ b"],
    ])("Literal: when the input is '%s', value is %s", (expr: string, expected: string) => {
        const actual = service.parse(expr) as Literal;
        expect(actual.value).toEqual(expected);
      });

    it.each([
      ['abc', { name: 'abc' }],
      ['a.b[c[0]]', { property: { type: 'MemberExpression' }}],
      ['Δέλτα', { name: 'Δέλτα' }],
      ['a?.b?.(arg)?.[c] ?. d', { type: "ChainExpression", expression: {type: 'MemberExpression', optional: true }}],
    ])("Variables: when the input is '%s', value is %o", (expr: string, expected: object) => {
      const actual = service.parse(expr);
      expect(actual).toMatchObject(expected);
      // expect(actual).toEqual(expect.objectContaining(expected));
    });

    it.each([
      ['a(b, c(d,e), f)', {"type":"CallExpression","callee":{"type":"Identifier","name":"a"}}],
      //['a b + c', {"type":"Compound"}],
      ['\'a\'.toString()', {"type":"CallExpression","arguments":[]}],
      ['[1].length', {"type":"MemberExpression","property":{"type":"Identifier","name":"length"}}],
      //[';', { type: "Compound", body: [], }],
    ])("Function Calls: when the input is '%s', value is %o", (expr: string, expected: object) => {
      const actual = service.parse(expr);
      expect(actual).toMatchObject(expected);
    });

    it.each([
      ['[]', { type: 'ArrayExpression', elements: [] }],
      ['[a]', { type: 'ArrayExpression',  elements: [{ type: 'Identifier', name: 'a' }], }],
    ])("Arrays: when the input is '%s', value is %o", (expr: string, expected: object) => {
      const actual = service.parse(expr);
      expect(actual).toMatchObject(expected);
    });

    // Acorn does not support custom identifier characters
    // it('#parse custom identifier characters', () => {
    //   service.addIdentifierChar('@');
    //   service.addIdentifierChar(':');
    //   expect(service.parse('@asd')).toMatchObject({ type: 'Identifier', name: '@asd' });
    //   expect(service.parse('ab:1')).toMatchObject({ type: 'Identifier', name: 'ab:1' });
    //   service.removeIdentifierChar('@');
    //   service.removeIdentifierChar(':');
    // });

    it('#parse Ternary', () => {
      const actual = service.parse('a == 1 ? b : c');
      const expected = { type: 'ConditionalExpression' };
      expect(actual).toMatchObject(expected);
    });

    // Acorn does not support custom operators
    // it('#parse custom operators', () => {
    //   service.addBinaryOp('or', 1);
    //   service.addUnaryOp('not');
    //   expect(service.parse('a or b')).toMatchObject({ type: "BinaryExpression", operator: "or", left: { type: "Identifier", name: "a", }, right: { type: "Identifier", name: "b", }, });
    //   expect(service.parse('not a')).toMatchObject({ type: 'UnaryExpression', operator: 'not', argument: { type: 'Identifier', name: 'a' }, });
    //   service.removeIdentifierChar('@');
    //   service.removeIdentifierChar(':');
    // });

});

// `docs/backlog-retired.md` A26; `docs/colon-identifiers/phase-9-plan.md` § 3.2
// and step 1's exit criteria. Each case has a fresh root injector, so a fresh
// `ParserService` and an empty cache.
describe('ParserService cache keyed on parse-relevant options (A26)', () => {
  let parser: ParserService;
  let evalService: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    parser = TestBed.inject(ParserService);
    evalService = TestBed.inject(EvalService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const thrownBy = (fn: () => unknown): unknown => {
    try {
      fn();
    } catch (error) {
      return error;
    }
    throw new Error('expected a throw, and nothing was thrown');
  };

  it('criterion 1: a permissive per-call parse leaves simpleEval\'s SyntaxError as it was', () => {
    const context = { p: Promise.resolve(1) };
    const before = thrownBy(() => evalService.simpleEval('await p', context));
    expect(before).toBeInstanceOf(SyntaxError);
    expect((before as SyntaxError).message).toBe('Unexpected token (1:6)');
    expect((before as { pos?: number }).pos).toBe(6);

    const permissive = parser.parse('await p',
      { ecmaVersion: 2022, allowAwaitOutsideFunction: true });
    expect(permissive).toMatchObject({ type: 'AwaitExpression' });

    const after = thrownBy(() => evalService.simpleEval('await p', context));
    expect(after).toBeInstanceOf(SyntaxError);
    expect((after as SyntaxError).message).toBe((before as SyntaxError).message);
    expect((after as { pos?: number }).pos).toBe((before as { pos?: number }).pos);
  });

  const asProgram = {
    type: 'Program',
    body: [{ type: 'ExpressionStatement', expression: { type: 'BinaryExpression' } }]
  };

  it('criterion 2: the shape follows the caller — the expression first, then the program', () => {
    expect(parser.parse('a + b')).toMatchObject({ type: 'BinaryExpression' });
    expect(parser.parse('a + b', defaultParserOptions)).toMatchObject(asProgram);
  });

  it('criterion 2: the shape follows the caller — the program first, then the expression', () => {
    expect(parser.parse('a + b', defaultParserOptions)).toMatchObject(asProgram);
    expect(parser.parse('a + b')).toMatchObject({ type: 'BinaryExpression' });
  });

  it('criterion 3: extractExpressions turned off through the setter after first use is honoured', () => {
    expect(parser.parse('k + 1')).toMatchObject({ type: 'BinaryExpression' });
    parser.parserOptions = { ...parser.parserOptions, extractExpressions: false };
    expect(parser.parse('k + 1')).toMatchObject(asProgram);
  });

  // acorn reads a key present as `undefined` apart from a missing one: a
  // missing `checkPrivateFields` defaults to `true`. The service's own options
  // carry every acorn key, so the setter installs options without it.
  it('a key present as undefined is keyed apart from a missing one', () => {
    parser.parserOptions = { cacheSize: 100, extractExpressions: false };
    const text = 'class A { #x; m() { return this.#y } }';
    expect(parser.parse(text, { ecmaVersion: 2022, checkPrivateFields: undefined }))
      .toMatchObject({ type: 'Program' });
    const error = thrownBy(() => parser.parse(text, { ecmaVersion: 2022 }));
    expect(error).toBeInstanceOf(SyntaxError);
    expect((error as SyntaxError).message)
      .toBe('Private field \'#y\' must be declared in an enclosing class (1:32)');
  });

  // One options object for both parses, so a fingerprint remembered by
  // identity would serve the second from the cache if the callback did not
  // bypass it. Each text yields a node, so it would be cached at all.
  it.each([
    ['onToken', 'i + 1'],
    ['onComment', 'i /* note */ + 1'],
    ['onInsertedSemicolon', 'i + 1'],
    ['onTrailingComma', '[i, ]'],
  ])('criterion 4: an %s callback runs on both parses of one text', (name: string, text: string) => {
    const callback = jest.fn();
    const options = { [name]: callback } as ParserOptions;
    parser.parse(text, options);
    const once = callback.mock.calls.length;
    expect(once).toBeGreaterThan(0);
    parser.parse(text, options);
    expect(callback).toHaveBeenCalledTimes(2 * once);
  });

  it('criterion 4: a program is appended to on both parses of one text', () => {
    const program = acornParse('', { ecmaVersion: 2020 });
    // `extractExpressions` off: the result is then `program` itself, which a
    // cache would hold, where two statements would extract to nothing.
    const options: ParserOptions = { program, extractExpressions: false };
    expect(parser.parse('i + 1', options)).toBe(program);
    expect(parser.parse('i + 1', options)).toBe(program);
    expect(program.body).toHaveLength(2);
  });

  // The write half of the bypass: every key but the five matches
  // `defaultParserOptions`, so a written entry would be the services' entry.
  it('criterion 4: a parse with a program writes nothing a later parse reads', () => {
    const program = acornParse('', { ecmaVersion: 2020 });
    parser.parse('i + 1', { program, extractExpressions: false });
    const later = parser.parse('i + 1', defaultParserOptions);
    expect(later).not.toBe(program);
    expect(later).toMatchObject(asProgram);
    expect(program.body).toHaveLength(1);
  });

  it('criterion 4: a callback on the service\'s own options bypasses the cache too', () => {
    const onToken = jest.fn();
    parser.parserOptions = { ...parser.parserOptions, onToken };
    parser.parse('i + 1');
    const once = onToken.mock.calls.length;
    expect(once).toBeGreaterThan(0);
    parser.parse('i + 1');
    expect(onToken).toHaveBeenCalledTimes(2 * once);
  });

  // What parsed before the fix still parses.
  it('options that are not an object parse as no options', () => {
    // A JavaScript caller can write `condition && options`.
    expect(parser.parse('a + b', false as unknown as ParserOptions))
      .toMatchObject({ type: 'BinaryExpression' });
  });

  it('options the fingerprint cannot serialize bypass the cache rather than throw', () => {
    const startLocation: Record<string, unknown> = { line: 1, column: 0 };
    startLocation['self'] = startLocation;
    const options = { locations: true, startLocation } as unknown as ParserOptions;
    expect(parser.parse('a + b', options)).toMatchObject({ type: 'BinaryExpression' });
  });

  it('criterion 5: two parses with the same options return one object', () => {
    const first = parser.parse('s * 2');
    expect(first).toMatchObject({ type: 'BinaryExpression' });
    expect(parser.parse('s * 2')).toBe(first);

    const program = parser.parse('s * 3', defaultParserOptions);
    expect(program).toMatchObject({ type: 'Program' });
    expect(parser.parse('s * 3', defaultParserOptions)).toBe(program);
  });

  it('criterion 5: equal options in two objects share an entry, and cacheSize is no part of the key', () => {
    const first = parser.parse('s * 4', { ...defaultParserOptions });
    expect(parser.parse('s * 4', { ...defaultParserOptions })).toBe(first);
    // `DiscoveryService`'s per-call options.
    expect(parser.parse('s * 4', { ...defaultParserOptions, cacheSize: undefined })).toBe(first);
  });

  it('criterion 6: two simpleEval calls build the fingerprint once', () => {
    const build = jest.spyOn(fingerprint, 'buildParseFingerprint');
    expect(evalService.simpleEval('m + 1', { m: 1 })).toBe(2);
    expect(evalService.simpleEval('m * 3', { m: 2 })).toBe(6);
    expect(build).toHaveBeenCalledTimes(1);
  });
});
