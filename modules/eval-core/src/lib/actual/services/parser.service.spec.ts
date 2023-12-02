import { TestBed } from '@angular/core/testing';

import { ParserService } from './parser.service';
import { ParserOptions } from '../../internal/interfaces';
import { BinaryExpression, Literal } from 'acorn';

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
    const expr = '1 + 2';
    const ast = service.parse(expr, {} as ParserOptions);
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
