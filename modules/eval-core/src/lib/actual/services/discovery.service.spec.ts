import { TestBed } from '@angular/core/testing';
import { DiscoveryService } from './discovery.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscoveryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should discover binary expressions in a program', () => {
    const program = '1 + 2 * 3';
    const searchType = 'BinaryExpression';
    const expressions = service.discover(program, searchType);
    expect(expressions).toBeDefined();
    expect(expressions?.length).toBe(2);
    expect(expressions?.[0].type).toBe('BinaryExpression');
  });

  it('should discover identifier expressions in a program', () => {
    const program = 'a + 2*b + c';
    const searchType = 'Identifier';
    const expressions = service.discover(program, searchType);
    expect(expressions).toBeDefined();
    expect(expressions?.length).toBe(3);
    expect(expressions?.[0].type).toBe('Identifier');
  });

  // it('should discover expressions in an expression', () => {
  //   const expression: { type: 'BinaryExpression', left: 1 , right: 2 };
  //   const searchType = 'BinaryExpression';
  //   const expressions = service.discover(expression, searchType);
  //   expect(expressions).toBeDefined();
  //   expect(expressions?.length).toBe(1);
  //   expect(expressions?.[0].type).toBe('BinaryExpression');
  // });

  it('should return undefined if no expressions are found', () => {
    const program = '1 + 2';
    const searchType = 'Identifier';
    const expressions = service.discover(program, searchType);
    expect(expressions).toBeUndefined();
  });

  it('should throw an error if an error occurs during the discovery process', () => {
    const program = '1 +';
    const searchType = 'BinaryExpression';
    expect(() => {
      service.discover(program, searchType);
    }).toThrow('Unexpected token (1:3)');
  });
});
