import { TestBed } from '@angular/core/testing';

import { ParserService } from './parser.service';
import { BinaryExpression, ParserOptions } from '../../internal/interfaces';

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
    console.log(ast);
    console.log(expected);

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
});
