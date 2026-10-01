import { TestBed } from '@angular/core/testing';
import { AnyNode } from 'acorn';
import { EvalService } from './eval.service';
import { EvalHooks } from '../../internal/classes/eval';
import { parse } from '../../internal/functions';

/**
 * `docs/backlog-retired.md` A1: `awaitVisitor` used to evaluate its operand
 * inside a `Promise` executor, so a synchronous throw from the operand - a
 * prototype-pollution guard rejection, for instance - became a rejected
 * promise. The sync entry points then *returned* that promise instead of
 * throwing, and the walk carried on to its own `afterVisitor` with the operand
 * still open.
 *
 * Top-level `await` needs `allowAwaitOutsideFunction`, which the services'
 * default parser options leave off, so these parse the expression themselves
 * and hand the services the node. That keeps every case off `safeCall`: an
 * `await` inside an arrow body is only reached through a call, and a call
 * frame would add its own handling of the error to what is being measured.
 */
describe('EvalService - await', () => {
  let service: EvalService;

  const BLOCKED = /Access to dangerous property "__proto__" is blocked/;

  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020, allowAwaitOutsideFunction: true }) as AnyNode;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  describe('a synchronous throw from the operand', () => {

    it('should throw from simpleEval rather than return a rejected promise', () => {
      let value: unknown = 'not evaluated';

      expect(() => {
        value = service.simpleEval(programOf('await obj.__proto__'), { obj: {} });
      }).toThrow(BLOCKED);

      expect(value).toBe('not evaluated');
    });

    it('should throw from eval rather than return a rejected promise', () => {
      const state = service.createState({ obj: {} });
      let value: unknown = 'not evaluated';

      expect(() => {
        value = service.eval(programOf('await obj.__proto__'), state);
      }).toThrow(BLOCKED);

      expect(value).toBe('not evaluated');
    });

    it('should reject evalAsync with the error the walk failed with, by identity', async () => {
      // The walk's own failure is what the unwinder hands the operand's
      // synthesised `after` event. When the throw was downgraded to a promise
      // the walk did not fail at all, and that event carried no error.
      const hooks = new EvalHooks();
      const state = service.createState({ obj: {} }, { hooks });
      let thrown: unknown;
      hooks.on('after', 'MemberExpression', (e) => {
        if ('error' in e) thrown = e.error;
      });

      const promise = service.evalAsync(programOf('await obj.__proto__'), state);

      await expect(promise).rejects.toThrow(BLOCKED);
      expect(thrown).toBeInstanceOf(Error);
      await expect(promise).rejects.toBe(thrown);
    });
  });

  describe('an asynchronous rejection', () => {

    it('should still carry the position of the await expression', async () => {
      const context = { rejecting: () => Promise.reject(new Error('later')) };

      await expect(service.simpleEvalAsync(programOf('await rejecting()'), context))
        .rejects.toThrow('later at position 0-17');
    });
  });
});
