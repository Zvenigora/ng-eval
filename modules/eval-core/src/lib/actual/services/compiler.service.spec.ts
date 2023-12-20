import { TestBed } from '@angular/core/testing';
import { CompilerService } from './compiler.service';
import { BaseContext } from '../../internal/classes/common';

describe('CompilerService', () => {
  let service: CompilerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CompilerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse the expression into an abstract syntax tree (AST)', () => {
    const expression = '1 + 2';
    const ast = service['parse'](expression);
    expect(ast).toBeDefined();
    // Add more assertions for the parsed AST if needed
  });

  it('should compile the expression into a state callback function', () => {
    const expression = '1 + 2';
    const fn = service.compile(expression);
    expect(fn).toBeDefined();
  });

  it('should call the state callback function with the specified context and options', () => {
    const expression = 'x + y';
    const fn = service.compile(expression);
    const context = { x: 1, y: 2 };
    const options = { debug: true };
    const result = service.call(fn, context, options);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('should call the asynchronous state callback function with the specified context and options', async () => {
    const context: BaseContext = {
      one: 1,
      two: 2,
      promiseFunc: (a: number, b: number) => {
            return new Promise((resolve) => {
              setTimeout(() => {
                return resolve(a + b);
              }, 1000);
            });
          }
    };
    const expr = 'promiseFunc(one, two)';
    const fn = service.compileAsync(expr);
    const options = { debug: true };
    const result = await service.callAsync(fn, context, options);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('should compile the expression into an asynchronous state callback function', () => {
    const expression = '1 + 2';
    const fn = service.compileAsync(expression);
    expect(fn).toBeDefined();
  });
});
