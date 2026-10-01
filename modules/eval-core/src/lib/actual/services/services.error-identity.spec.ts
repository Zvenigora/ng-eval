import { TestBed } from '@angular/core/testing';
import { CompilerService } from './compiler.service';
import { DiscoveryService } from './discovery.service';
import { EvalService } from './eval.service';
import { ParserService } from './parser.service';

/**
 * `docs/backlog-retired.md` A5: every service-layer entry point caught what it
 * was thrown and raised a bare `Error` with only its message in its place, so the
 * caller lost the error's class, `cause`, stack and every other property, and
 * could select it only by matching its message. Twelve sites in four
 * services; each case below names the one it covers.
 *
 * Two kinds of error reach those sites:
 *
 * - **Thrown during a walk.** The context reads `boom` through an accessor, so
 *   the error leaves the walk with no call frame between it and the service:
 *   a call would add `safeCall`'s own handling (A6) to what is measured here.
 * - **Thrown by the parser.** Acorn's `SyntaxError` carries `pos`, which a
 *   rewrap dropped. The async evaluation entry points are covered this way:
 *   their walk runs inside `evaluateAsync`, whose rejection never passes
 *   through the service's `catch`, so a parse error is the only thing that
 *   ever reached theirs - and it is thrown synchronously, not rejected.
 */
class RuleError extends Error {
  readonly code = 'E_RULE';

  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'RuleError';
  }
}

describe('service entry points keep the error they were thrown', () => {
  let evalService: EvalService;
  let compiler: CompilerService;
  let discovery: DiscoveryService;
  let parser: ParserService;

  const cause = new Error('root cause');
  let thrown: RuleError;

  /** A context whose `boom` throws `thrown` when read. */
  const throwing = () => {
    const context: Record<string, unknown> = {};
    Object.defineProperty(context, 'boom', {
      get: () => { throw thrown; },
      enumerable: true
    });
    return context;
  };

  /** Asserts `error` is `thrown` itself, with its class, cause and property. */
  const expectOriginal = (error: unknown) => {
    expect(error).toBe(thrown);
    expect(error).toBeInstanceOf(RuleError);
    expect((error as RuleError).cause).toBe(cause);
    expect((error as RuleError).code).toBe('E_RULE');
  };

  /** Asserts `error` is acorn's, with its type and position. */
  const expectSyntaxError = (error: unknown) => {
    expect(error).toBeInstanceOf(SyntaxError);
    expect((error as SyntaxError & { pos: number }).pos).toBe(3);
  };

  /** Runs `fn` and returns what it threw synchronously. */
  const caught = (fn: () => unknown): unknown => {
    try {
      fn();
    } catch (error) {
      return error;
    }
    throw new Error('expected a synchronous throw');
  };

  /** Awaits `promise` and returns what it rejected with. */
  const rejected = async (promise: Promise<unknown>): Promise<unknown> => {
    try {
      await promise;
    } catch (error) {
      return error;
    }
    throw new Error('expected a rejection');
  };

  // `1 +` fails at the end of input, position 3.
  const INVALID = '1 +';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    evalService = TestBed.inject(EvalService);
    compiler = TestBed.inject(CompilerService);
    discovery = TestBed.inject(DiscoveryService);
    parser = TestBed.inject(ParserService);
    thrown = new RuleError('rule failed', cause);
  });

  describe('EvalService', () => {

    it('simpleEval should rethrow the original', () => {
      expectOriginal(caught(() => evalService.simpleEval('boom', throwing())));
    });

    it('eval should rethrow the original', () => {
      const state = evalService.createState(throwing());
      expectOriginal(caught(() => evalService.eval('boom', state)));
    });

    it('simpleEvalAsync should rethrow a parse error as acorn raised it', () => {
      expectSyntaxError(caught(() => evalService.simpleEvalAsync(INVALID, {})));
    });

    it('evalAsync should rethrow a parse error as acorn raised it', () => {
      const state = evalService.createState({});
      expectSyntaxError(caught(() => evalService.evalAsync(INVALID, state)));
    });
  });

  describe('CompilerService', () => {

    it('compile should rethrow a parse error as acorn raised it', () => {
      expectSyntaxError(caught(() => compiler.compile(INVALID)));
    });

    it('simpleCall should rethrow the original', () => {
      const fn = compiler.compile('boom');
      expectOriginal(caught(() => compiler.simpleCall(fn, throwing())));
    });

    it('call should rethrow the original', () => {
      const fn = compiler.compile('boom');
      const state = compiler.createState(throwing());
      expectOriginal(caught(() => compiler.call(fn, state)));
    });

    it('compileAsync should rethrow a parse error as acorn raised it', () => {
      expectSyntaxError(caught(() => compiler.compileAsync(INVALID)));
    });

    it('simpleCallAsync should reject with the original', async () => {
      const fn = compiler.compileAsync('boom');
      expectOriginal(await rejected(compiler.simpleCallAsync(fn, throwing())));
    });

    it('callAsync should reject with the original', async () => {
      const fn = compiler.compileAsync('boom');
      const state = compiler.createState(throwing());
      expectOriginal(await rejected(compiler.callAsync(fn, state)));
    });
  });

  describe('DiscoveryService', () => {

    it('extract should rethrow a parse error as acorn raised it', () => {
      expectSyntaxError(caught(() => discovery.extract(INVALID, 'Identifier')));
    });
  });

  describe('ParserService', () => {

    it('parse should rethrow a parse error as acorn raised it', () => {
      expectSyntaxError(caught(() => parser.parse(INVALID)));
    });
  });
});
