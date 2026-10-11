import { TestBed } from '@angular/core/testing';
import { CompilerService } from './compiler.service';
import { ParserService } from './parser.service';
import { BaseContext } from '../../internal/classes/common';
import { defaultParserOptions } from '../../internal/classes/eval';
import { parse } from '../../internal/functions';

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
    const result = service.simpleCall(fn, context, options);
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
    const result = await service.simpleCallAsync(fn, context, options);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('should compile the expression into an asynchronous state callback function', () => {
    const expression = '1 + 2';
    const fn = service.compileAsync(expression);
    expect(fn).toBeDefined();
  });

  // `docs/backlog-retired.md` A29. An AST input was cached under its type, its
  // start and end, and `toString()` - which is `[object Object]` for every
  // acorn node - so two expressions of one shape and span shared a compiled
  // function. Both fixtures are a `Program` from 0 to 5, and the context gives
  // them different values, so a shared function reads as the wrong number.
  describe('AST inputs', () => {

    const context = { a: 1, b: 3, c: 3, d: 4 };
    const ast = (expression: string) => parse(expression, defaultParserOptions);

    it('should compile two ASTs of one shape and span to their own functions', () => {
      const ab = service.compile(ast('a * b'));
      const cd = service.compile(ast('c * d'));

      expect(service.simpleCall(ab, context)).toBe(3);
      expect(service.simpleCall(cd, context)).toBe(12);
    });

    it('should compile two ASTs of one shape and span to their own functions, async', async () => {
      const ab = service.compileAsync(ast('a * b'));
      const cd = service.compileAsync(ast('c * d'));

      expect(await service.simpleCallAsync(ab, context)).toBe(3);
      expect(await service.simpleCallAsync(cd, context)).toBe(12);
    });

    it('should compile one text parsed twice correctly from each node', async () => {
      const first = ast('c * d');
      const second = ast('c * d');

      expect(first).not.toBe(second);
      expect(service.simpleCall(service.compile(first), context)).toBe(12);
      expect(service.simpleCall(service.compile(second), context)).toBe(12);
      expect(await service.simpleCallAsync(service.compileAsync(first), context)).toBe(12);
      expect(await service.simpleCallAsync(service.compileAsync(second), context)).toBe(12);
    });

    // The control: a string is still cached, and returns the function it
    // compiled the first time.
    it('should return the cached function for a string compiled twice', () => {
      expect(service.compile('a * b')).toBe(service.compile('a * b'));
      expect(service.compileAsync('a * b')).toBe(service.compileAsync('a * b'));
    });
  });

  // `docs/colon-identifiers/phase-9-plan.md` § 3.2 and step 3. A string is
  // keyed under the fingerprint of the options its parse uses, `ParserService`'s
  // merged with this service's, so a change through the setter reaches a string
  // compiled before it.
  describe('the string key under the parse fingerprint', () => {

    const colonOn = () => {
      const parser = TestBed.inject(ParserService);
      parser.parserOptions = { ...parser.parserOptions, colonIdentifiers: true };
    };

    it('criterion 3: a string compiled before the setter turns colonIdentifiers on compiles a colon name after', () => {
      const before = service.compile('Q1:1 == 1');
      expect(() => service.simpleCall(before, { 'Q1:1': 1 }))
        .toThrow('Unsupported statement type: LabeledStatement');

      colonOn();
      const after = service.compile('Q1:1 == 1');
      expect(after).not.toBe(before);
      expect(service.simpleCall(after, { 'Q1:1': 1 })).toBe(true);
      expect(service.simpleCall(after, { Q1: 1 })).toBe(false);
    });

    it('criterion 3: the same for compileAsync', async () => {
      const before = service.compileAsync('Q1:1 == 1');
      await expect(service.simpleCallAsync(before, { 'Q1:1': 1 }))
        .rejects.toThrow('Unsupported statement type: LabeledStatement');

      colonOn();
      const after = service.compileAsync('Q1:1 == 1');
      expect(after).not.toBe(before);
      expect(await service.simpleCallAsync(after, { 'Q1:1': 1 })).toBe(true);
      expect(await service.simpleCallAsync(after, { Q1: 1 })).toBe(false);
    });

    // A parse that bypasses `ParserService`'s cache bypasses this one: a cached
    // function runs no callback. A callback on `ParserService`'s own options
    // cannot show it - the service's per-call `defaultParserOptions` carries
    // every callback as `null`, which wins the merge (finding 4, A30) - so the
    // callback is on this service's per-call options, which a subclass sets.
    it('compiles a string whose parse carries a callback on every call, uncached', () => {
      class CallbackCompiler extends CompilerService {
        constructor(onToken: () => void) {
          super();
          this.parserOptions = { ...defaultParserOptions, onToken };
        }
      }
      const onToken = jest.fn();
      const compiler = TestBed.runInInjectionContext(() => new CallbackCompiler(onToken));

      const first = compiler.compile('i + 1');
      const once = onToken.mock.calls.length;
      expect(once).toBeGreaterThan(0);
      const second = compiler.compile('i + 1');
      expect(second).not.toBe(first);
      expect(onToken).toHaveBeenCalledTimes(2 * once);
      expect(compiler.compileAsync('i + 1')).not.toBe(compiler.compileAsync('i + 1'));
      expect(compiler.simpleCall(second, { i: 2 })).toBe(3);
    });

    // A consumer's test double for `ParserService` need not carry
    // `parserOptions`; up to 0.11.1 the key read nothing from it.
    it('compiles and caches a string through a ParserService double without parserOptions', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{
          provide: ParserService,
          useValue: { parse: (text: string) => parse(text, defaultParserOptions) },
        }],
      });
      const compiler = TestBed.inject(CompilerService);

      const fn = compiler.compile('a + b');
      expect(compiler.simpleCall(fn, { a: 1, b: 2 })).toBe(3);
      expect(compiler.compile('a + b')).toBe(fn);
      expect(compiler.compileAsync('a + b')).toBe(compiler.compileAsync('a + b'));
    });
  });
});
