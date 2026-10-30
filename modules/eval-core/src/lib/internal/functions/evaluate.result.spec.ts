import { TestBed } from '@angular/core/testing';
import { EvalService } from '../../actual/services';
import { EvalOptions } from '../classes/eval';

/**
 * What `state.result` reports, and when (`docs/backlog-retired.md` A27).
 *
 * An arrow's body runs a nested walk on the walk's own state. Up to 0.14.1
 * that walk was `evaluate` itself, so every call of an arrow wrote its own
 * outcome, value and start time over the enclosing walk's, mid-walk - and a
 * closure called after the walk wrote over the finished walk's result. And
 * `start()` reset nothing, so a state reused across runs reported the last
 * run's error until something overwrote it.
 *
 * Now the result describes the last entry-point walk alone: the nested walk
 * writes nothing to it, `start()` resets the outcome, and each setter writes
 * every outcome field. The trace is not part of the outcome, and still spans
 * every evaluation on the state (A15).
 *
 * Observations taken at return are kept and asserted only once the promise
 * has settled, as `evaluate.async-walk.spec.ts` does.
 */
describe('the evaluation result', () => {

  let service: EvalService;

  /** What `fail` throws. */
  const inner = new Error('inner');

  const source = () => ({
    // Settles a macrotask later, so the walk's return and its settlement
    // are two observably different instants.
    load: (x: unknown) => new Promise((resolve) => setTimeout(() => resolve(x), 5)),
    safe: (thunk: () => unknown): unknown => {
      try {
        return thunk();
      } catch {
        return 0;
      }
    },
    fail: (): never => {
      throw inner;
    },
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it.each<[string, string, EvalOptions]>([
    ['case-sensitive', 'load(safe(() => fail()))', {}],
    ['caseInsensitive', 'LOAD(SAFE(() => FAIL()))', { caseInsensitive: true }],
  ])('%s: should not report an arrow\'s caught throw as the walk\'s, at return or once settled',
    async (_, expression, options) => {
      const state = service.createState(source(), options);

      const returned = service.evalAsync(expression, state);
      const isErrorAtReturn = state.result.isError;
      const isSuccessAtReturn = state.result.isSuccess;
      const errorAtReturn = state.result.error;
      const value = await returned;

      // Pending: neither success nor failure until the promises settle.
      expect(isErrorAtReturn).toBeUndefined();
      expect(isSuccessAtReturn).toBeUndefined();
      expect(errorAtReturn).toBeUndefined();
      expect(value).toBe(0);
      expect(state.result.isSuccess).toBe(true);
      expect(state.result.error).toBeUndefined();
    });

  it('should not report an earlier run\'s rejection on a reused state, at return or once settled', async () => {
    const run1 = new Error('run1');
    const state = service.createState({
      r: () => Promise.reject(run1),
      ok: () => Promise.resolve(20),
    });

    await expect(service.evalAsync('r()', state)).rejects.toBe(run1);
    expect(state.result.error).toBe(run1);

    const returned = service.evalAsync('ok()', state);
    const isErrorAtReturn = state.result.isError;
    const isSuccessAtReturn = state.result.isSuccess;
    const errorAtReturn = state.result.error;
    const value = await returned;

    expect(isErrorAtReturn).toBeUndefined();
    expect(isSuccessAtReturn).toBeUndefined();
    expect(errorAtReturn).toBeUndefined();
    expect(value).toBe(20);
    expect(state.result.isSuccess).toBe(true);
    expect(state.result.error).toBeUndefined();
    expect(state.result.errorMessage).toBeUndefined();
  });

  it('should not report an arrow\'s caught throw on the sync path', () => {
    const state = service.createState(source());

    expect(service.eval('safe(() => fail())', state)).toBe(0);

    expect(state.result.isSuccess).toBe(true);
    expect(state.result.isError).toBe(false);
    expect(state.result.error).toBeUndefined();
    expect(state.result.value).toBe(0);
  });

  it('should time the whole walk, an arrow called inside it included', () => {
    // A nested walk used to restart the clock, so the duration ran from the
    // last arrow call - which here comes after the 20 ms the walk spends.
    const state = service.createState({
      spin: (g: () => unknown) => {
        const started = performance.now();
        while (performance.now() - started < 20) {
          // busy-wait: the walk's own time, before the arrow runs
        }
        return g();
      },
    });

    expect(service.eval('spin(() => 1)', state)).toBe(1);

    expect(state.result.duration).toBeGreaterThanOrEqual(20);
  });

  it('should be left as the walk wrote it by a function the walk built and is called later', () => {
    const state = service.createState({});

    const fn = service.eval('x => x + 1', state) as (x: number) => number;

    expect(fn(41)).toBe(42);
    expect(state.result.value).toBe(fn);
    expect(state.result.isSuccess).toBe(true);
  });

  it('should report isUndefined for a walk whose value is undefined, and only then', () => {
    const state = service.createState({});

    expect(service.eval('undefined', state)).toBeUndefined();
    expect(state.result.isUndefined).toBe(true);

    expect(service.eval('1', state)).toBe(1);
    expect(state.result.isUndefined).toBe(false);
  });

  it('should report the walk\'s own throw and no value after an arrow call succeeded', () => {
    const outer = new Error('outer');
    const state = service.createState({
      call: (f: () => unknown) => f(),
      boom: (): never => {
        throw outer;
      },
    });

    expect(() => service.eval('call(() => 1) + boom()', state)).toThrow(outer);

    expect(state.result.value).toBeUndefined();
    expect(state.result.isError).toBe(true);
    expect(state.result.isSuccess).toBe(false);
    expect(state.result.error).toBe(outer);
    expect(state.result.errorMessage).toBe('outer');
  });

  it('should keep the trace across evaluations on one state, as A15 has it', () => {
    const state = service.createState({});

    service.eval('1 + 2', state);
    const once = state.result.trace.length;
    service.eval('1 + 2', state);

    expect(once).toBeGreaterThan(0);
    expect(state.result.trace.length).toBe(2 * once);
    expect(state.result.tracePushCount).toBe(2 * once);
  });
});
