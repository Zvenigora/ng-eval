import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalContext, EvalHooks } from '@zvenigora/ng-eval-core';
import { EvalSignalOptions } from './eval-signal';
import { EvalSignalAsync, createEvalSignalAsync } from './eval-signal-async';
import { SignalContextSource, SignalContextWriteError, createSignalContext } from './signal-context';

/**
 * A promise whose settlement the test orders itself (Phase 5 S 6.1: no timers in
 * a fixture).
 */
interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/**
 * Microtasks and one macrotask (Phase 5 S 6.1). `evaluateAsync` resolves through
 * several `await` hops and the settle handler is one more, so "after" is only
 * asserted once the macrotask queue has turned.
 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A source function that hands back a fresh deferred per call, in call order,
 * so a run's promise is one the test settles by index.
 */
const loader = () => {
  const loads: Deferred<unknown>[] = [];
  const load = (): Promise<unknown> => {
    const next = deferred<unknown>();
    loads.push(next);
    return next.promise;
  };
  return { loads, load };
};

describe('createEvalSignalAsync', () => {

  let compiler: CompilerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    compiler = TestBed.inject(CompilerService);
  });

  /**
   * Through the factory, as `eval-signal.spec.ts` does (Phase 3 S 6.1), and
   * with `createState` spied on as the run counter: one call per run.
   */
  const create = (
    expression: string,
    source: SignalContextSource | EvalContext,
    options?: EvalSignalOptions
  ): EvalSignalAsync<unknown> =>
    TestBed.runInInjectionContext(() => createEvalSignalAsync(expression, source, options));

  const caught = (read: () => unknown): unknown => {
    try {
      read();
    } catch (error) {
      return error;
    }
    throw new Error('expected the read to throw');
  };

  describe('tracking (criterion 1)', () => {

    // The two halves are separate cases so a probe's report names the half
    // that went red. Each is vacuous without the other: the negative passes
    // against a signal that never starts a second run, the positive against
    // one that starts a run on every change.

    it('should start no run for a change to a key the walk never read', async () => {
      const { loads, load } = loader();
      const id = signal(1);
      const other = signal(0);
      const states = jest.spyOn(compiler, 'createState');

      const user = create('load(id)', { id, other, load });

      expect(user()).toBeUndefined();
      loads[0].resolve('user-1');
      await flush();
      expect(user()).toEqual('user-1');
      expect(states).toHaveBeenCalledTimes(1);

      other.set(1);

      expect(user()).toEqual('user-1');
      await flush();
      expect(user()).toEqual('user-1');
      expect(states).toHaveBeenCalledTimes(1);
      expect(loads).toHaveLength(1);
    });

    it('should start exactly one run for a change to a key it read, at the read after it', async () => {
      const { loads, load } = loader();
      const id = signal(1);
      const states = jest.spyOn(compiler, 'createState');

      const user = create('load(id)', { id, load });

      expect(user()).toBeUndefined();
      loads[0].resolve('user-1');
      await flush();
      expect(user()).toEqual('user-1');

      id.set(2);

      // Lazy (Phase 5 S 3.4): the change marks the run dirty and nothing more.
      expect(states).toHaveBeenCalledTimes(1);

      expect(user()).toBeUndefined();
      expect(user.status()).toEqual('loading');
      expect(states).toHaveBeenCalledTimes(2);

      loads[1].resolve('user-2');
      await flush();

      expect(user()).toEqual('user-2');
      expect(states).toHaveBeenCalledTimes(2);
    });

  });

  describe('first read (criterion 2)', () => {

    it('should read undefined and loading until the run settles, then its value', async () => {
      const pending = deferred<string>();
      const value = create('load()', { load: () => pending.promise });

      // Before the test resolves anything (Phase 5 S 6.1): an implementation that
      // settled synchronously, or handed out the promise, fails here.
      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('loading');

      pending.resolve('done');
      await flush();

      expect(value()).toEqual('done');
      expect(value.status()).toEqual('resolved');
    });

    it('should read loading first even for an expression with no promise in it', async () => {
      const value = create('c + 1', { c: signal(1) });

      // `evaluateAsync` always resolves through an `await` (Phase 5 S 3.4,
      // S 8 q4).
      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('loading');

      await flush();

      expect(value()).toEqual(2);
      expect(value.status()).toEqual('resolved');
    });

    it('should start the run when status is read first, as reading the value does', async () => {
      const states = jest.spyOn(compiler, 'createState');
      const value = create('c + 1', { c: signal(1) });

      expect(states).not.toHaveBeenCalled();

      expect(value.status()).toEqual('loading');
      expect(states).toHaveBeenCalledTimes(1);

      await flush();

      expect(value.status()).toEqual('resolved');
      expect(value()).toEqual(2);
      expect(states).toHaveBeenCalledTimes(1);
    });

  });

  describe('out-of-order resolution (criterion 3)', () => {

    const twoRuns = () => {
      const { loads, load } = loader();
      const id = signal(1);
      const equal = jest.fn((a: unknown, b: unknown) => Object.is(a, b));
      const user = create('load(id)', { id, load }, { equal });

      expect(user()).toBeUndefined();

      // A supersede is a change and a read (Phase 5 S 6.1).
      id.set(2);
      expect(user()).toBeUndefined();
      expect(loads).toHaveLength(2);

      return { loads, user, equal };
    };

    it('should end on the second run when the runs settle in order', async () => {
      const { loads, user, equal } = twoRuns();
      const before = equal.mock.calls.length;

      loads[0].resolve('user-1');
      await flush();

      // The stale arm: no recompute, so the spy - which fires only on one -
      // has not moved, and the value is still the pending second run's.
      expect(user()).toBeUndefined();
      expect(user.status()).toEqual('loading');
      expect(equal).toHaveBeenCalledTimes(before);

      loads[1].resolve('user-2');
      await flush();

      expect(user()).toEqual('user-2');
      expect(user.status()).toEqual('resolved');
    });

    it('should end on the second run when the stale first run settles last', async () => {
      const { loads, user, equal } = twoRuns();

      loads[1].resolve('user-2');
      await flush();

      expect(user()).toEqual('user-2');
      const before = equal.mock.calls.length;

      // Settling last is the arm that last-write-wins fails (Phase 5 S 6.1).
      loads[0].resolve('user-1');
      await flush();

      expect(user()).toEqual('user-2');
      expect(user.status()).toEqual('resolved');
      expect(equal).toHaveBeenCalledTimes(before);
    });

  });

  describe('rejection, after settlement (criterion 4)', () => {

    it('should rethrow the rejection by identity on every read under throw', async () => {
      const pending = deferred<unknown>();
      const error = new Error('boom');
      const value = create('load()', { load: () => pending.promise });

      expect(value()).toBeUndefined();

      pending.reject(error);
      await flush();

      expect(caught(value)).toBe(error);
      expect(caught(value)).toBe(error);
      expect(value.status()).toEqual('error');
    });

    it('should read undefined under onError undefined', async () => {
      const pending = deferred<unknown>();
      const value = create('load()', { load: () => pending.promise }, { onError: 'undefined' });

      expect(value()).toBeUndefined();

      pending.reject(new Error('boom'));
      await flush();

      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('error');
    });

    it('should call a mapper once per rejected run and serve its result', async () => {
      const pending = deferred<unknown>();
      const error = new Error('boom');
      const mapper = jest.fn(() => 'mapped');
      const value = create('load()', { load: () => pending.promise }, { onError: mapper });

      expect(value()).toBeUndefined();

      pending.reject(error);
      await flush();

      for (let i = 0; i < 5; i++) {
        expect(value()).toEqual('mapped');
      }
      expect(mapper).toHaveBeenCalledTimes(1);
      expect(mapper).toHaveBeenCalledWith(error);
      expect(value.status()).toEqual('error');
    });

    it('should hand the mapper a non-Error rejection wrapped, as evaluateAsync rejects with it', async () => {
      const pending = deferred<unknown>();
      const mapper = jest.fn((error: unknown) => (error as Error).message);
      const value = create('load()', { load: () => pending.promise }, { onError: mapper });

      expect(value()).toBeUndefined();

      pending.reject('plain');
      await flush();

      expect(value()).toEqual('plain');
      expect(mapper.mock.calls[0][0]).toBeInstanceOf(Error);
    });

  });

  /**
   * Observed through zone.js's own hook, because nothing else reports here.
   * Every promise in these specs is a `ZoneAwarePromise` - zone.js is loaded
   * by `test-setup.ts` and the specs compile at `target: es2016` - and for one
   * rejected with no handler, the window's `unhandledrejection`, Node's
   * `process` `unhandledRejection` and zone.js's console report all stay
   * silent. zone.js still collects it, and after the microtask drain calls
   * the function under `Zone.__symbol__('unhandledPromiseRejectionHandler')`
   * if one is set.
   *
   * The control case is what keeps the other two from going vacuous: if
   * zone.js ever leaves `test-setup.ts`, or stops calling the hook, it fails
   * rather than leaving "nothing was reported" true of everything.
   */
  describe('unhandled rejections (criterion 5)', () => {

    type ZoneGlobal = { __symbol__(name: string): string } & Record<string, unknown>;

    const zone = (globalThis as unknown as { Zone: ZoneGlobal }).Zone;
    const hook = zone.__symbol__('unhandledPromiseRejectionHandler');

    let unhandled: unknown[];
    let previous: unknown;

    beforeEach(() => {
      unhandled = [];
      previous = zone[hook];
      // zone.js hands over its own wrapper, carrying the rejection, unless it
      // is configured to throw the original - so both shapes are unwrapped.
      zone[hook] = (error: unknown): void => {
        unhandled.push(error instanceof Error && 'rejection' in error
          ? (error as { rejection: unknown }).rejection
          : error);
      };
    });

    afterEach(() => {
      zone[hook] = previous;
    });

    it('should see a plain promise rejected with no handler (the control)', async () => {
      const error = new Error('unhandled on purpose');

      void Promise.reject(error);
      await flush();

      expect(unhandled).toHaveLength(1);
      expect(unhandled[0]).toBe(error);
    });

    it('should leave a superseded run that then rejects handled', async () => {
      const { loads, load } = loader();
      const id = signal(1);
      const user = create('load(id)', { id, load });

      expect(user()).toBeUndefined();
      id.set(2);
      expect(user()).toBeUndefined();

      loads[0].reject(new Error('stale'));
      await flush();

      expect(unhandled).toEqual([]);

      loads[1].resolve('user-2');
      await flush();

      expect(user()).toEqual('user-2');
    });

    it('should leave a run that rejects after destroy handled', async () => {
      const pending = deferred<unknown>();
      const value = create('load()', { load: () => pending.promise });

      expect(value()).toBeUndefined();
      value.destroy();

      pending.reject(new Error('late'));
      await flush();

      expect(unhandled).toEqual([]);
      expect(value()).toBeUndefined();
    });

  });

  describe('a walk failure and a write violation settle with the run (criterion 6)', () => {

    const modes: [string, EvalSignalOptions['onError']][] = [
      ['throw', 'throw'],
      ['undefined', 'undefined'],
      ['a mapper', () => 'mapped'],
    ];

    it.each(modes)('should rethrow a write violation naming the expression under %s', async (_, onError) => {
      const value = create('count = 5', { count: signal(1) }, { onError });

      // No synchronous failure path (Phase 5 S 3.4): a pending run like any
      // other.
      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('loading');

      await flush();

      for (let i = 0; i < 2; i++) {
        const error = caught(value);
        expect(error).toBeInstanceOf(SignalContextWriteError);
        expect((error as SignalContextWriteError).key).toEqual('count');
        expect((error as SignalContextWriteError).expression).toEqual('count = 5');
      }
      expect(value.status()).toEqual('error');
    });

    it('should not hand a write violation to a mapper', async () => {
      const mapper = jest.fn(() => 'mapped');
      const value = create('count = 5', { count: signal(1) }, { onError: mapper });

      expect(value()).toBeUndefined();
      await flush();

      expect(() => value()).toThrow(SignalContextWriteError);
      expect(mapper).not.toHaveBeenCalled();
    });

    /**
     * P7's pair. At return `state.result.isError` is `true` for both: the
     * second's arrow body is a nested walk on the same state, and it threw
     * before `safe` caught it. Only settlement tells them apart.
     */
    const pairSource = () => ({
      a: signal(1),
      fail: (): never => {
        throw new Error('failed');
      },
      safe: (thunk: () => unknown): unknown => {
        try {
          return thunk();
        } catch {
          return 0;
        }
      },
      load: (x: unknown) => Promise.resolve(x),
    });

    it('should settle a walk that threw as an error', async () => {
      const value = create('a + fail()', pairSource(), { onError: 'undefined' });

      expect(value.status()).toEqual('loading');
      await flush();

      expect(value.status()).toEqual('error');
    });

    it('should settle a walk whose consumer function caught an arrow\'s throw as resolved', async () => {
      const value = create('load(safe(() => fail()))', pairSource(), { onError: 'undefined' });

      expect(value.status()).toEqual('loading');
      await flush();

      expect(value.status()).toEqual('resolved');
      expect(value()).toEqual(0);
    });

  });

  describe('destroy() during a run (criterion 7)', () => {

    it('should read undefined and idle at once, and stay inert when the run then settles', async () => {
      const pending = deferred<unknown>();
      const equal = jest.fn((a: unknown, b: unknown) => Object.is(a, b));
      const states = jest.spyOn(compiler, 'createState');
      const load = jest.fn(() => pending.promise);
      const value = create('load()', { load }, { equal });

      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('loading');

      // `destroy()` recomputes `run` so it drops the current run (Phase 5
      // S 3.4) - and that recompute must find nothing to walk, or tearing a
      // signal down would call the consumer's functions one last time.
      const walks = states.mock.calls.length;
      const loads = load.mock.calls.length;

      value.destroy();

      expect(states).toHaveBeenCalledTimes(walks);
      expect(load).toHaveBeenCalledTimes(loads);

      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('idle');
      const calls = equal.mock.calls.length;

      pending.resolve('late');
      await flush();

      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('idle');
      expect(equal).toHaveBeenCalledTimes(calls);

      value.invalidate();

      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('idle');
      expect(states).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent', () => {
      const value = create('c', { c: signal(1) });

      value.destroy();
      value.destroy();

      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('idle');
    });

  });

  describe('invalidate() (criterion 8)', () => {

    it('should start a run at the next read and discard the previous value until it settles', async () => {
      const { loads, load } = loader();
      const states = jest.spyOn(compiler, 'createState');
      const value = create('load()', { load });

      expect(value()).toBeUndefined();
      loads[0].resolve('v1');
      await flush();
      expect(value()).toEqual('v1');

      value.invalidate();

      // A dependency change, not a reload (Phase 5 S 3.4): a source with no reactive
      // surface has no other way to say its data no longer holds.
      expect(value()).toBeUndefined();
      expect(value.status()).toEqual('loading');
      expect(states).toHaveBeenCalledTimes(2);

      loads[1].resolve('v2');
      await flush();

      expect(value()).toEqual('v2');
      expect(value.status()).toEqual('resolved');
    });

  });

  describe('dependencies (criterion 9)', () => {

    it('should report the last started run\'s reads while an older run is pending, whatever order they settle in', async () => {
      const { loads, load } = loader();
      const wide = signal(true);
      const value = create('wide ? load(a, b) : load(a)', {
        wide, load, a: signal(1), b: signal(2),
      }, { trackDependencies: true });

      expect(value.dependencies.size).toEqual(0);

      expect(value()).toBeUndefined();
      expect([...value.dependencies].sort()).toEqual(['a', 'b', 'load', 'wide']);

      wide.set(false);
      expect(value()).toBeUndefined();

      // Both runs are pending, and the set is the second's: it shrank.
      expect([...value.dependencies].sort()).toEqual(['a', 'load', 'wide']);

      // The older run settling last is the order that tells "recorded at
      // start" from "recorded at settlement".
      loads[1].resolve('narrow');
      await flush();
      loads[0].resolve('wide');
      await flush();

      expect(value()).toEqual('narrow');
      expect([...value.dependencies].sort()).toEqual(['a', 'load', 'wide']);
    });

    it('should report the source spelling of a root under caseInsensitive', async () => {
      const value = create('COUNT + 1', { count: signal(1) }, {
        trackDependencies: true,
        eval: { caseInsensitive: true },
      });

      expect(value()).toBeUndefined();
      expect([...value.dependencies]).toEqual(['count']);

      await flush();
      expect(value()).toEqual(2);
    });

    it('should refuse trackDependencies combined with an eval.hooks registry, at construction', () => {
      expect(() => create('c', { c: signal(1) }, {
        trackDependencies: true,
        eval: { hooks: new EvalHooks() },
      })).toThrow(/Cannot combine 'trackDependencies' with 'eval.hooks'/);
    });

  });

  describe('the scope-depth restore (criterion 10)', () => {

    /**
     * The leak is driven through the published `push` (Phase 5 S 3.5): a bare call's
     * `this` is the shared context (`call-expression.ts:203`), so a source
     * function can strand scopes on it with no visitor involved. The
     * expression reads `x` before the call, so what a run read is in its
     * value.
     *
     * **Two pushes, not one.** The walk's own `Program` scope is already on
     * the stack when the function runs, and `program.ts`'s `finally` pops
     * whatever is on top - so a single pushed scope is popped in its place,
     * and what is left stranded is the Program's empty scope, which shadows
     * nothing. With one push this case passed against a restore moved to
     * settlement. The second push is the one that survives the walk.
     */
    const stranding = () => {
      const { loads, load } = loader();
      const context = createSignalContext({
        x: signal('from source'),
        strand(this: EvalContext) {
          this.push({ x: 'stranded' });
          this.push({ x: 'stranded' });
          return load();
        },
      });
      return { loads, context, value: create('[x, strand()]', context) };
    };

    it('should have a second run, started before the first settles, read the source key', async () => {
      const { loads, value } = stranding();

      expect(value()).toBeUndefined();

      value.invalidate();
      expect(value()).toBeUndefined();
      expect(loads).toHaveLength(2);

      loads[1].resolve('second');
      await flush();

      expect(value()).toEqual(['from source', 'second']);

      loads[0].resolve('first');
      await flush();

      // And a third, after both have settled.
      value.invalidate();
      expect(value()).toBeUndefined();
      loads[2].resolve('third');
      await flush();

      expect(value()).toEqual(['from source', 'third']);
    });

    it('should be back at the caller\'s depth when a run returns, before it settles', async () => {
      const { loads, context, value } = stranding();

      expect(value()).toBeUndefined();
      expect(context.scopes.length).toEqual(0);

      loads[0].resolve('first');
      await flush();

      expect(context.scopes.length).toEqual(0);
    });

  });

  describe('a lazy supersede (criterion 12)', () => {

    it('should not show a run that settled after a change nobody read', async () => {
      const { loads, load } = loader();
      const id: WritableSignal<number> = signal(1);
      const states = jest.spyOn(compiler, 'createState');
      const user = create('load(id)', { id, load });

      expect(user()).toBeUndefined();

      id.set(2);

      // The old run is still current here, so its handler writes - and this
      // read, which supersedes it, must not show what it wrote (Phase 5 S 3.4).
      loads[0].resolve('user-1');
      await flush();
      expect(states).toHaveBeenCalledTimes(1);

      expect(user()).toBeUndefined();
      expect(user.status()).toEqual('loading');
      expect(states).toHaveBeenCalledTimes(2);

      loads[1].resolve('user-2');
      await flush();

      expect(user()).toEqual('user-2');
      expect(user.status()).toEqual('resolved');
    });

  });

});
