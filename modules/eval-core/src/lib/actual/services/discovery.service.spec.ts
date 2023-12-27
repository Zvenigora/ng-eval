import { TestBed } from '@angular/core/testing';
import { DiscoveryService } from './discovery.service';
import { AnyNode, Identifier } from 'acorn';
import { ParserService } from './parser.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let parser: ParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscoveryService);
    parser = TestBed.inject(ParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should find all binary expressions in a program', () => {
    const program = '1 + 2 * a';
    const searchType = 'BinaryExpression';
    const expressions = service.extract(program, searchType);
    expect(expressions).toBeDefined();
    expect(expressions?.length).toBe(2);
    expect(expressions?.[0].type).toBe('BinaryExpression');
  });

  it('should find all identifier expressions in a program', () => {
    const program = 'a + 2 * b + c';
    const searchType = 'Identifier';
    const expressions = service.extract(program, searchType);
    expect(expressions).toBeDefined();
    expect(expressions?.length).toBe(3);
    expect(expressions?.[0].type).toBe('Identifier');
    expect((expressions?.[0] as Identifier).name).toBe('a');
  });

  it('should find all binary expressions expressions in an expression', () => {
    const expression: AnyNode | undefined = parser.parse('1 + 2 * a');
    const searchType = 'BinaryExpression';
    const expressions = service.extract(expression, searchType);
    expect(expressions).toBeDefined();
    expect(expressions?.length).toBe(2);
    expect(expressions?.[0].type).toBe('BinaryExpression');
  });

  it('should return undefined if no expressions are found', () => {
    const program = '1 + 2';
    const searchType = 'Identifier';
    const expressions = service.extract(program, searchType);
    expect(expressions).toBeUndefined();
  });

  it('should throw an error if an error occurs during the discovery process', () => {
    const program = '1 +';
    const searchType = 'BinaryExpression';
    expect(() => {
      service.extract(program, searchType);
    }).toThrow('Unexpected token (1:3)');
  });

});
