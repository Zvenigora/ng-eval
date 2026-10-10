import { ApplicationRef, WritableSignal, effect, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalContext, EvalHooks } from '@zvenigora/ng-eval-core';
import { EvalSignalOptions } from './eval-signal';
import { EvalSignalAsync, EvalSignalAsyncOptions, createEvalSignalAsync } from './eval-signal-async';
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

/**
 * `loader()`, keeping the `AbortSignal` each run handed it, in call order.
 */
const aborting = () => {
  const { loads, load: next } = loader();
  const signals: AbortSignal[] = [];
  const load = (_id: unknown, abort: AbortSignal): Promise<unknown> => {
    signals.push(abort);
    return next();
  };
  return { loads, signals, load };
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
    options?: EvalSignalAsyncOptions
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
     * settlement. With two, that `finally` pops the second, and the first
     * survives the walk.
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

  describe('the AbortSignal reaches the function (step 3 criterion 1)', () => {

    it('should abort a run at the read that supersedes it, not at the change, and not abort the new run', () => {
      const { signals, load } = aborting();
      const id = signal(1);
      const user = create('load(id, abort)', { id, load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      expect(signals).toHaveLength(1);
      expect(signals[0]).toBeInstanceOf(AbortSignal);
      expect(signals[0].aborted).toBe(false);

      // A change only marks the run stale (Phase 5 S 3.4).
      id.set(2);
      expect(signals[0].aborted).toBe(false);

      // The read is the supersede.
      expect(user()).toBeUndefined();
      expect(signals).toHaveLength(2);
      expect(signals[0].aborted).toBe(true);
      expect(signals[1].aborted).toBe(false);
    });

    it('should not abort a run that settles normally', async () => {
      const { loads, signals, load } = aborting();
      const user = create('load(id, abort)', { id: signal(1), load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      loads[0].resolve('user-1');
      await flush();

      expect(user()).toEqual('user-1');
      expect(signals[0].aborted).toBe(false);
    });

    it('should abort the pending run on destroy()', () => {
      const { signals, load } = aborting();
      const user = create('load(id, abort)', { id: signal(1), load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      expect(signals[0].aborted).toBe(false);

      user.destroy();

      expect(signals[0].aborted).toBe(true);
    });

    // Settling releases a run's task and keeps its controller, so a supersede
    // or `destroy()` still aborts it (Phase 5 S 3.4), as `resource()` does.
    // Added during step 3 for a gap the review found.

    it('should abort a run that settled normally at a later supersede', async () => {
      const { loads, signals, load } = aborting();
      const id = signal(1);
      const user = create('load(id, abort)', { id, load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      loads[0].resolve('user-1');
      await flush();

      expect(user()).toEqual('user-1');
      expect(signals[0].aborted).toBe(false);

      id.set(2);
      expect(user()).toBeUndefined();

      expect(signals[0].aborted).toBe(true);
    });

    it('should abort a run that settled normally on destroy()', async () => {
      const { loads, signals, load } = aborting();
      const user = create('load(id, abort)', { id: signal(1), load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      loads[0].resolve('user-1');
      await flush();

      expect(user()).toEqual('user-1');
      expect(signals[0].aborted).toBe(false);

      user.destroy();

      expect(signals[0].aborted).toBe(true);
    });

  });

  /**
   * A supersede happens inside `run`, a `computed`, and `abort()` calls the
   * old run's listeners synchronously - so a listener runs in the walk's
   * reactive context unless the abort is untracked: a signal it read would
   * become a dependency of the walk, and a write would throw `NG0600`. Fixed
   * at step 3's confirmation gate.
   */
  describe('an abort listener runs outside the walk\'s reactive context (step 3 criterion 8)', () => {

    /** Registers `listener` on every run's signal, and supersedes the first. */
    const superseding = (listener: () => void) => {
      const { load: next } = loader();
      const id = signal(1);
      const load = (_id: unknown, abort: AbortSignal): Promise<unknown> => {
        abort.addEventListener('abort', listener);
        return next();
      };
      const user = create('load(id, abort)', { id, load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      id.set(2);
      expect(user()).toBeUndefined();

      return user;
    };

    it('should not make a signal an abort listener reads a dependency of the walk', () => {
      const watched = signal(0);
      const heard: number[] = [];
      const states = jest.spyOn(compiler, 'createState');

      const user = superseding(() => {
        heard.push(watched());
      });

      // The listener ran, at the supersede.
      expect(heard).toEqual([0]);
      expect(states).toHaveBeenCalledTimes(2);

      watched.set(1);

      expect(user()).toBeUndefined();
      expect(states).toHaveBeenCalledTimes(2);
    });

    it('should let an abort listener write a signal', () => {
      const written = signal('before');

      superseding(() => written.set('aborted'));

      expect(written()).toEqual('aborted');
    });

  });

  /**
   * The supersede aborts the old run before the new walk (Phase 5 S 3.4), so
   * a listener that writes an input the walk reads is seen by it. Walking
   * first left the walk on the old input: a `computed` marks itself clean
   * after computing, so the write made during the computation was missed
   * until some other signal was written. Added during step 3 for a defect the
   * review found; criterion 8's write arm writes a signal the walk never
   * reads, so it could not reach this.
   */
  describe('the supersede aborts before the new walk (added during step 3)', () => {

    // The effect arm spies on `console.error`, which would otherwise keep
    // every later error's arguments for the rest of the file.
    afterEach(() => {
      jest.restoreAllMocks();
    });

    /**
     * The first run's listener writes `id`, which the walk reads; `calls`
     * keeps what each `load` was called with.
     */
    const rewriting = () => {
      const { loads, load: next } = loader();
      const id = signal(1);
      const calls: unknown[] = [];

      const load = (value: unknown, abort: AbortSignal): Promise<unknown> => {
        calls.push(value);
        if (calls.length === 1) {
          abort.addEventListener('abort', () => id.set(100));
        }
        return next();
      };

      const user = create('load(id, abort)', { id, load }, { abortSignalKey: 'abort' });
      return { loads, id, calls, user };
    };

    it('should walk on an input the old run\'s abort listener wrote, with no third run', async () => {
      const states = jest.spyOn(compiler, 'createState');
      const { loads, id, calls, user } = rewriting();

      expect(user()).toBeUndefined();
      expect(states).toHaveBeenCalledTimes(1);

      id.set(2);
      expect(user()).toBeUndefined();

      // One run for the supersede, and it walked the written value.
      expect(states).toHaveBeenCalledTimes(2);
      expect(calls).toEqual([1, 100]);

      loads[1].resolve('user-100');
      await flush();

      expect(user()).toEqual('user-100');
      expect(user.status()).toEqual('resolved');
      expect(states).toHaveBeenCalledTimes(2);
      expect(calls).toEqual([1, 100]);
    });

    it('should have aborted the old run when the new run\'s load is called', () => {
      const { load: next } = loader();
      const id = signal(1);
      const signals: AbortSignal[] = [];
      const previousAborted: boolean[] = [];

      const load = (_id: unknown, abort: AbortSignal): Promise<unknown> => {
        const previous = signals[signals.length - 1];
        previousAborted.push(previous === undefined ? false : previous.aborted);
        signals.push(abort);
        return next();
      };

      const user = create('load(id, abort)', { id, load }, { abortSignalKey: 'abort' });

      expect(user()).toBeUndefined();
      id.set(2);
      expect(user()).toBeUndefined();

      expect(signals).toHaveLength(2);
      expect(previousAborted).toEqual([false, true]);
    });

    /**
     * The same supersede with a live consumer, an effect: Angular notifies a
     * live consumer of a write made during a computation, a path a plain read
     * never takes. The one case in these specs with an effect (Phase 5 S 6.1),
     * and the arm the Angular 19-21 matrix reruns to see whether a version
     * takes that path differently.
     */
    it('should walk on the written input under an effect, with no extra run after the tick', async () => {
      const errors = jest.spyOn(console, 'error');
      const states = jest.spyOn(compiler, 'createState');
      const { loads, id, calls, user } = rewriting();
      const seen: unknown[] = [];

      const ref = TestBed.runInInjectionContext(() => effect(() => {
        seen.push(user());
      }));

      TestBed.tick();
      expect(states).toHaveBeenCalledTimes(1);

      id.set(2);
      TestBed.tick();

      expect(states).toHaveBeenCalledTimes(2);
      expect(calls).toEqual([1, 100]);

      TestBed.tick();
      expect(states).toHaveBeenCalledTimes(2);

      loads[1].resolve('user-100');
      await flush();
      TestBed.tick();

      expect(seen[seen.length - 1]).toEqual('user-100');
      expect(states).toHaveBeenCalledTimes(2);
      expect(calls).toEqual([1, 100]);
      expect(errors.mock.calls.flat().map(String).filter((text) => text.includes('NG0600'))).toEqual([]);

      ref.destroy();
    });

  });

  /**
   * An abort listener that pushes a scope on the shared context - one it can
   * reach, as a caller-built context's owner can - is contained by the same
   * restore as a consumer function (Phase 5 S 3.5): the snapshot is taken
   * before the old run is retired, and `destroy()` takes one of its own.
   * Added during step 3 for a gap the review found.
   */
  describe('the scope-depth restore contains an abort listener\'s push (added during step 3)', () => {

    const pushing = () => {
      const { loads, load: next } = loader();
      const id = signal(1);
      let heard = 0;
      let calls = 0;

      const context: EvalContext = createSignalContext({
        x: signal('from source'),
        id,
        load: (_id: unknown, abort: AbortSignal): Promise<unknown> => {
          calls++;
          if (calls === 1) {
            abort.addEventListener('abort', () => {
              heard++;
              context.push({ x: 'from listener' });
            });
          }
          return next();
        },
      });

      const value = create('[x, load(id, abort)]', context, { abortSignalKey: 'abort' });
      return { loads, id, context, value, heard: () => heard };
    };

    it('should be back at the depth before a supersede whose old run\'s listener pushed a scope', async () => {
      const { loads, id, context, value, heard } = pushing();

      expect(value()).toBeUndefined();
      const before = context.scopes.length;

      id.set(2);
      expect(value()).toBeUndefined();

      // The listener ran, at the supersede.
      expect(heard()).toEqual(1);
      expect(context.scopes.length).toEqual(before);

      // A later run reads the source key, not the listener's scope.
      id.set(3);
      expect(value()).toBeUndefined();
      loads[2].resolve('third');
      await flush();

      expect(value()).toEqual(['from source', 'third']);
    });

    it('should be back at the depth before destroy() when the aborted run\'s listener pushed a scope', () => {
      const { context, value, heard } = pushing();

      expect(value()).toBeUndefined();
      const before = context.scopes.length;

      value.destroy();

      expect(heard()).toEqual(1);
      expect(context.scopes.length).toEqual(before);
    });

  });

  describe('only the walk sees the AbortSignal (step 3 criterion 2)', () => {

    /**
     * A caller-built context holding the key - one the factory cannot check
     * (Phase 5 S 3.6) - so the context's ordinary order has something to find.
     * The array's first element is read by the walk; the second by a closure
     * `defer` calls once its promise resolves, after the walk has returned.
     */
    it('should resolve the key through the context in a closure the promise calls later', async () => {
      const pending = deferred<void>();
      const context = createSignalContext({
        abort: 'from source',
        defer: (thunk: () => unknown) => pending.promise.then(() => thunk()),
      });
      const value = create('[abort, defer(() => abort)]', context, { abortSignalKey: 'abort' });

      expect(context.scopes.length).toEqual(0);
      expect(value()).toBeUndefined();
      expect(context.scopes.length).toEqual(0);

      pending.resolve();
      await flush();

      const [walked, later] = value() as [unknown, unknown];
      expect(walked).toBeInstanceOf(AbortSignal);
      expect(later).toEqual('from source');
      expect(context.scopes.length).toEqual(0);
    });

  });

  /**
   * Matched by the signal context's own rule - `match`, exact first, then by
   * case under `caseInsensitive` - which reads the source's keys and never
   * its values. So a key holding `undefined` is found, which `getKey` would
   * miss: it resolves through the context's resolver, and that reads an
   * `undefined` value as "not found". Fixed at step 3's confirmation gate.
   */
  describe('a record source that already has the key (step 3 criterion 3)', () => {

    const refused: [string, SignalContextSource, boolean, string][] = [
      ['an exact own key', { abort: signal(1) }, false, 'abort'],
      ['a key differing in case, under caseInsensitive', { Abort: signal(1) }, true, 'Abort'],
      ['an exact own key holding undefined', { abort: signal(undefined) }, false, 'abort'],
      ['a key differing in case and holding undefined, under caseInsensitive', { Abort: signal(undefined) }, true, 'Abort'],
    ];

    it.each(refused)('should refuse %s, naming the key and the option', (_, source, caseInsensitive, held) => {
      const error = caught(() => create('abort', source, {
        abortSignalKey: 'abort',
        eval: { caseInsensitive },
      })) as Error;

      expect(error.message).toContain(`'abortSignalKey'`);
      expect(error.message).toContain(`"abort"`);
      expect(error.message).toContain(`"${held}"`);
    });

    it('should construct over a key differing in case when case matters, and leave it reading the source', async () => {
      const value = create('Abort', { Abort: signal('from source') }, { abortSignalKey: 'abort' });

      expect(value()).toBeUndefined();
      await flush();

      expect(value()).toEqual('from source');
    });

  });

  describe('dependencies (step 3 criterion 4)', () => {

    it.each([false, true])('should never report the key, caseInsensitive %p', (caseInsensitive) => {
      const { load } = aborting();
      const value = create('load(id, abort)', { id: signal(1), load }, {
        abortSignalKey: 'abort',
        trackDependencies: true,
        eval: { caseInsensitive },
      });

      expect(value()).toBeUndefined();

      // The tracker ran - it recorded the rest of the walk's reads.
      expect([...value.dependencies].sort()).toEqual(['id', 'load']);
    });

  });

  describe('a key no expression could read (step 3 criterion 6)', () => {

    const refuses = (key: string, options?: EvalSignalAsyncOptions): void => {
      const error = caught(() => create('1', {}, { ...options, abortSignalKey: key })) as Error;

      expect(error.message).toContain(`'abortSignalKey'`);
      expect(error.message).toContain(`"${key}"`);
    };

    it.each(['', 'not a name', 'a.b', '1abort', 'abort-signal', 'abort;'])(
      'should refuse %p, which is not an identifier', (key) => refuses(key));

    it.each(['class', 'new', 'this', 'null'])(
      'should refuse the reserved word %p', (key) => refuses(key));

    /**
     * `eval-core`'s identifier-guard fixtures
     * (`eval.service.identifier-guard.spec.ts`), copied rather than imported:
     * this package reaches `eval-core` through its published surface only.
     */
    const guarded: [string, boolean][] = [
      ['__proto__', false], ['__proto__', true],
      ['constructor', false], ['constructor', true],
      ['prototype', false], ['prototype', true],
      ['__defineGetter__', false], ['__defineGetter__', true],
      ['__defineSetter__', false], ['__defineSetter__', true],
      ['__lookupGetter__', false], ['__lookupGetter__', true],
      ['__lookupSetter__', false], ['__lookupSetter__', true],
      ['hasOwnProperty', false], ['hasOwnProperty', true],
      ['isPrototypeOf', false], ['isPrototypeOf', true],
      ['propertyIsEnumerable', false], ['propertyIsEnumerable', true],
      ['toString', false], ['toString', true],
      ['valueOf', false], ['valueOf', true],
      ['toLocaleString', false], ['toLocaleString', true],
    ];

    it.each(guarded)('should refuse %p, which the identifier guard refuses, caseInsensitive %p',
      (key, caseInsensitive) => refuses(key, { eval: { caseInsensitive } }));

    it.each([false, true])('should construct with an ordinary identifier and hand the function its signal, caseInsensitive %p', (caseInsensitive) => {
      const { signals, load } = aborting();
      const value = create('load(id, cancel)', { id: signal(1), load }, {
        abortSignalKey: 'cancel',
        eval: { caseInsensitive },
      });

      expect(value()).toBeUndefined();
      expect(signals[0]).toBeInstanceOf(AbortSignal);
    });

    it('should fire none of the consumer\'s hooks while checking the key', () => {
      const events: string[] = [];
      const hooks = new EvalHooks();
      hooks.on('before', '*', (event) => {
        events.push(`before ${event.node.type}`);
      });
      hooks.on('after', '*', (event) => {
        events.push(`after ${event.node.type}`);
      });
      hooks.onRead((event) => {
        events.push(`read ${String(event.key)}`);
      });

      const value = create('c', { c: signal(1) }, { abortSignalKey: 'abort', eval: { hooks } });

      expect(events).toEqual([]);

      // The control: the same registry records the first run's walk.
      expect(value()).toBeUndefined();
      expect(events).toContain('read c');
    });

  });

  /**
   * The README's prose claims that no executed block shows (Phase 5 step 4;
   * Phase 3 S 3.7: a public claim needs a spec that discriminates). One case
   * per claim, each naming the `modules/eval-signals/README.md` lines it
   * pins. Three are `eval-core`'s resolution, pinned here observationally:
   * no code in this package decides them, so no probe of it applies.
   */
  describe('README: Async expressions', () => {

    describe('What is resolved', () => {

      it('should hand back a promise\'s resolved value as it is, and rebuild an object the walk reads', async () => {
        // README.md:400-401. `eval-core`'s `awaitAllPromises`: it does not
        // walk a resolved value, and copies every plain object it walks.
        const shared = { name: 'Ada' };
        const held = { name: 'Ada' };
        const load = (): Promise<unknown> => Promise.resolve(shared);

        const resolved = create('load()', { load });
        const read = create('held', { held });

        expect(resolved()).toBeUndefined();
        expect(read()).toBeUndefined();
        await flush();

        expect(resolved()).toBe(shared);
        expect(read()).toEqual(held);
        expect(read()).not.toBe(held);
      });

      it('should resolve promises in arrays and plain objects at any depth, and none inside a resolved value, a Map, a class instance or a null-prototype object', async () => {
        // README.md:395-398. `eval-core`'s `awaitAllPromises`, as above.
        class Box {
          constructor(readonly inner: Promise<number>) {}
        }
        const inner = Promise.resolve(7);
        const map = new Map([['inner', inner]]);
        const box = new Box(inner);
        const bare: Record<string, unknown> = Object.assign(Object.create(null), { inner });
        const load = (n: number): Promise<number> => Promise.resolve(n * 10);
        const wrap = (): Promise<unknown> => Promise.resolve({ inner });

        const nested = create('[load(1), { b: [load(2)] }]', { load });
        const kept = create('[wrap(), map, box, bare]', { wrap, map, box, bare });

        expect(nested()).toBeUndefined();
        expect(kept()).toBeUndefined();
        await flush();

        expect(nested()).toEqual([10, { b: [20] }]);

        const [wrapped, keptMap, keptBox, keptBare] = kept() as [{ inner: unknown }, unknown, unknown, unknown];
        expect(wrapped.inner).toBe(inner);
        expect(keptMap).toBe(map);
        expect(map.get('inner')).toBe(inner);
        expect(keptBox).toBe(box);
        expect(keptBare).toBe(bare);
        expect(bare['inner']).toBe(inner);
      });

      it('should keep the last value under a structural equal only when nothing read it while the run was pending', async () => {
        // README.md:402-407. This package's: `equal` is forwarded to the
        // value's `computed`, and a pending run reads `undefined`.
        const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
        const id = signal(1);
        const load = (): Promise<string> => Promise.resolve('Ada');

        // Each reads the same rebuilt literal on its own run. `plain` is the
        // control: without `equal` the status-first pattern gets a new
        // object, so the first arm cannot pass on identity alone.
        const plain = create('({ name: load(id) })', { id, load });
        const statusFirst = create('({ name: load(id) })', { id, load }, { equal });
        const valueRead = create('({ name: load(id) })', { id, load }, { equal });

        expect(plain()).toBeUndefined();
        expect(statusFirst()).toBeUndefined();
        expect(valueRead()).toBeUndefined();
        await flush();

        const plainBefore = plain();
        const statusFirstBefore = statusFirst();
        const valueReadBefore = valueRead();
        expect(statusFirstBefore).toEqual({ name: 'Ada' });

        id.set(2);

        // Status first: the read starts the run, and the value is not read
        // until it settles.
        expect(plain.status()).toBe('loading');
        expect(statusFirst.status()).toBe('loading');
        // The value read while the run is pending.
        expect(valueRead()).toBeUndefined();
        await flush();

        expect(plain.status()).toBe('resolved');
        expect(plain()).not.toBe(plainBefore);
        expect(statusFirst.status()).toBe('resolved');
        expect(statusFirst()).toBe(statusFirstBefore);
        expect(valueRead()).toEqual({ name: 'Ada' });
        expect(valueRead()).not.toBe(valueReadBefore);
      });

    });

    describe('Two signals instead of `await`', () => {

      it('should not track a read inside a .then the expression set up, and should track the walk\'s own', async () => {
        // README.md:381-383. This package's: the walk runs inside `run`,
        // and the arrow runs after it, outside any reactive context.
        const id = signal(1);
        const role = signal('admin');
        const loadUser = (key: number): Promise<{ name: string }> =>
          Promise.resolve({ name: key === 1 ? 'Ada' : 'Grace' });
        const states = jest.spyOn(compiler, 'createState');

        const label = create('loadUser(id).then(u => u.name + " (" + role + ")")', { id, role, loadUser });

        expect(label()).toBeUndefined();
        await flush();
        expect(label()).toBe('Ada (admin)');
        expect(states).toHaveBeenCalledTimes(1);

        role.set('owner');

        expect(label()).toBe('Ada (admin)');
        await flush();
        expect(label()).toBe('Ada (admin)');
        expect(states).toHaveBeenCalledTimes(1);

        // The control: a key the walk read starts a run, whose arrow reads
        // `role` afresh.
        id.set(2);

        expect(label()).toBeUndefined();
        expect(states).toHaveBeenCalledTimes(2);
        await flush();
        expect(label()).toBe('Grace (owner)');
      });

      it('should read a member off the promise in operand position, inside an async arrow too', async () => {
        // README.md:357-358 and :389. `eval-core`'s: a member read off a
        // promise, and an `await` that passes the promise through (BL-A24).
        const id = signal(1);
        const loadUser = (): Promise<{ name: string }> => Promise.resolve({ name: 'Ada' });

        // The control: the same call resolves to an object with a `name`.
        const direct = create('loadUser(id)', { id, loadUser });
        const member = create('loadUser(id).name', { id, loadUser });
        const arrow = create('(async () => (await loadUser(id)).name)()', { id, loadUser });

        expect(direct()).toBeUndefined();
        expect(member()).toBeUndefined();
        expect(arrow()).toBeUndefined();
        await flush();

        expect(direct()).toEqual({ name: 'Ada' });
        // Resolved, not pending: the `undefined` is the run's value.
        expect(member.status()).toBe('resolved');
        expect(member()).toBeUndefined();
        expect(arrow.status()).toBe('resolved');
        expect(arrow()).toBeUndefined();
      });

    });

  });

});

/**
 * S2's arrangement (Phase 5 S 6.1): zoneless, with `whenStable()` as the probe.
 * A describe of its own because the one above instantiates its TestBed in
 * `beforeEach`, after which it cannot be configured. Angular logs `NG0914`
 * here because `test-setup.ts` loads zone.js - expected.
 */
describe('createEvalSignalAsync - application stability (step 3 criterion 5)', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  const create = (
    expression: string,
    source: SignalContextSource | EvalContext,
    options?: EvalSignalAsyncOptions
  ): EvalSignalAsync<unknown> =>
    TestBed.runInInjectionContext(() => createEvalSignalAsync(expression, source, options));

  /**
   * Whether `whenStable()` resolves within a few macrotasks. A released task
   * schedules change detection, which holds stability until its tick has run,
   * so one turn is not always enough.
   */
  const isStable = async (): Promise<boolean> => {
    let stable = false;
    void TestBed.inject(ApplicationRef).whenStable().then(() => {
      stable = true;
    });
    for (let i = 0; i < 3; i++) {
      await flush();
    }
    return stable;
  };

  it('should hold the application unstable while the current run is pending', async () => {
    const pending = deferred<unknown>();
    const value = create('load()', { load: () => pending.promise });

    // The control: lazy, so nothing is pending before the first read.
    expect(await isStable()).toBe(true);

    expect(value()).toBeUndefined();

    expect(await isStable()).toBe(false);
  });

  it('should release it once the run settles', async () => {
    const pending = deferred<unknown>();
    const value = create('load()', { load: () => pending.promise });

    expect(value()).toBeUndefined();
    pending.resolve('done');
    await flush();

    expect(value()).toEqual('done');
    expect(await isStable()).toBe(true);
  });

  it('should release a superseded run at the read that supersedes it, though it never settles', async () => {
    const { loads, load } = loader();
    const id = signal(1);
    const value = create('load(id)', { id, load });

    expect(value()).toBeUndefined();

    id.set(2);
    expect(value()).toBeUndefined();
    expect(loads).toHaveLength(2);

    // The new run holds it now.
    expect(await isStable()).toBe(false);

    // `loads[0]` is never settled.
    loads[1].resolve('user-2');
    await flush();

    expect(value()).toEqual('user-2');
    expect(await isStable()).toBe(true);
  });

  it('should release the pending run on destroy()', async () => {
    const pending = deferred<unknown>();
    const value = create('load()', { load: () => pending.promise });

    expect(value()).toBeUndefined();
    value.destroy();

    expect(await isStable()).toBe(true);
  });

});
