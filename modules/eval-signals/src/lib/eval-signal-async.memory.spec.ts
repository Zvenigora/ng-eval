import { PendingTasks, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { EvalContext, EvalHooks, EvalState } from '@zvenigora/ng-eval-core';
import { EvalSignalAsync, EvalSignalAsyncOptions, createEvalSignalAsync } from './eval-signal-async';
import { SignalContextSource } from './signal-context';

/**
 * A run's resolved value. A class instance, which `awaitAllPromises` returns
 * by identity (plan P4): a plain object would be rebuilt, and a `WeakRef` to
 * the one the test made would watch a copy nothing holds.
 */
class Resolved {
  constructor(readonly n: number) {}
}

/**
 * What a signal keeps of its runs (Phase 5 S 3.4): the current one, and nothing
 * older - not its state, not its value - and after `destroy()` not even that.
 *
 * `eval-signal.memory.spec.ts`'s instrument. Every fixture runs inside an
 * async function that returns only `WeakRef`s and the signals, so no local of
 * a test reaches a run's state or value; a resolver is dropped from the queue
 * as it is called; and no `jest` spy or `equal` spy is on the path, since
 * `mock.calls` and `mock.results` hold what they see (BL-A19).
 */
describe('createEvalSignalAsync - what it keeps of its runs', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const create = (
    expression: string,
    source: SignalContextSource | EvalContext,
    options?: EvalSignalAsyncOptions
  ): EvalSignalAsync<unknown> =>
    TestBed.runInInjectionContext(() => createEvalSignalAsync(expression, source, options));

  const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc') as () => void;
  setFlagsFromString('--no-expose-gc');

  // A `WeakRef` keeps its target alive until the job that created or read it
  // ends, so the collection happens in a later one.
  const collect = async (refs: WeakRef<object>[]): Promise<boolean[]> => {
    await flush();
    gc();
    return refs.map((ref) => ref.deref() !== undefined);
  };

  /**
   * A source function whose runs the test settles oldest first, each with a
   * fresh `Resolved` it watches through a `WeakRef` and does not keep.
   */
  const runs = () => {
    const resolvers: ((value: Resolved) => void)[] = [];
    const values: WeakRef<Resolved>[] = [];

    const load = (): Promise<Resolved> =>
      new Promise<Resolved>((resolve) => {
        resolvers.push(resolve);
      });

    const settleOldest = (n: number): void => {
      const resolve = resolvers.shift();
      if (!resolve) {
        throw new Error('no run is pending');
      }
      const value = new Resolved(n);
      values.push(new WeakRef(value));
      resolve(value);
    };

    return { load, settleOldest, values };
  };

  it('should keep no superseded run\'s state or value, and keep the current run\'s value', async () => {
    const { value, states, values } = await (async () => {
      const { load, settleOldest, values } = runs();
      const states: WeakRef<EvalState>[] = [];

      // States are caught by a read hook on a registry the test owns, as
      // `eval-signal.memory.spec.ts` catches them: the state the walk used.
      const hooks = new EvalHooks();
      hooks.onRead((event) => {
        if (states[states.length - 1]?.deref() !== event.state) {
          states.push(new WeakRef(event.state));
        }
      });

      const id = signal(0);
      const value = create('load(id)', { id, load }, { eval: { hooks } });

      expect(value()).toBeUndefined();

      // Each supersede is a change and the read after it; the old run then
      // settles, too late to be anything but discarded.
      for (let i = 1; i <= 5; i++) {
        id.set(i);
        expect(value()).toBeUndefined();
        settleOldest(i - 1);
        await flush();
      }

      settleOldest(5);
      await flush();

      expect(value() === values[5].deref()).toBe(true);

      return { value, states, values };
    })();

    // One state per run, so the hook caught every one.
    expect(states).toHaveLength(6);
    expect(values).toHaveLength(6);

    const liveStates = await collect(states);
    const liveValues = await collect(values);

    expect(liveStates.slice(0, 5)).toEqual([false, false, false, false, false]);

    // The current run's value survives, held by the signal alone - which is
    // what shows the others were collected rather than never caught.
    expect(liveValues).toEqual([false, false, false, false, false, true]);
    expect(value() === values[5].deref()).toBe(true);
  });

  it('should keep nothing of a run that settles after destroy()', async () => {
    const { destroyed, kept, values } = await (async () => {
      const { load, settleOldest, values } = runs();

      const destroyed = create('load()', { load });
      // The control: the same fixture, not destroyed.
      const kept = create('load()', { load });

      expect(destroyed()).toBeUndefined();
      expect(kept()).toBeUndefined();

      destroyed.destroy();

      settleOldest(0);
      settleOldest(1);
      await flush();

      expect(kept() === values[1].deref()).toBe(true);

      return { destroyed, kept, values };
    })();

    const live = await collect(values);

    expect(live).toEqual([false, true]);
    expect(destroyed()).toBeUndefined();
    expect(destroyed.status()).toEqual('idle');
    expect(kept() === values[1].deref()).toBe(true);
  });

  /**
   * `destroy()` marks `run` stale, and a `computed` keeps its last value until
   * it recomputes - so unless `destroy()` makes it drop the current `Run`, a
   * signal nothing reads again holds that run, and the value it resolved to,
   * for its whole life. The arm above cannot see it: its run is still pending
   * at `destroy()`, so the `Run` it would hold is empty.
   *
   * Only `status()` is read, so the `Run` is the one thing holding the value.
   * A `value()` read would add `value`'s own cache, which holds the last value
   * until the next read on the sync path too.
   */
  it('should keep nothing of the current run once destroy() has run, though nothing reads again', async () => {
    const { destroyed, kept, values } = await (async () => {
      const { load, settleOldest, values } = runs();

      const destroyed = create('load()', { load });
      // The control: the same fixture, not destroyed.
      const kept = create('load()', { load });

      expect(destroyed.status()).toEqual('loading');
      expect(kept.status()).toEqual('loading');

      settleOldest(0);
      settleOldest(1);
      await flush();

      expect(destroyed.status()).toEqual('resolved');
      expect(kept.status()).toEqual('resolved');

      destroyed.destroy();

      return { destroyed, kept, values };
    })();

    const live = await collect(values);

    expect(live).toEqual([false, true]);
    expect(destroyed.status()).toEqual('idle');
    expect(kept.status()).toEqual('resolved');
  });

  /**
   * The arm a shared last-settled slot fails, even one tagged with its run
   * and checked against the current one: the run below resolved while
   * current, so its value was written, and the run superseding it is left
   * pending - nothing has settled since to overwrite the slot.
   */
  it('should keep no value of a run that resolved while current, once a pending run supersedes it', async () => {
    const { value, kept, values } = await (async () => {
      const { load, settleOldest, values } = runs();

      const id = signal(0);
      const value = create('load(id)', { id, load });
      // The control: the same fixture, not superseded.
      const kept = create('load(id)', { id: signal(0), load });

      expect(value()).toBeUndefined();
      expect(kept()).toBeUndefined();

      settleOldest(0);
      settleOldest(1);
      await flush();

      expect(value() === values[0].deref()).toBe(true);
      expect(kept() === values[1].deref()).toBe(true);

      id.set(1);
      expect(value()).toBeUndefined();

      return { value, kept, values };
    })();

    const live = await collect(values);

    expect(live).toEqual([false, true]);
    expect(value.status()).toEqual('loading');
    expect(kept() === values[1].deref()).toBe(true);
  });

  describe('its runs\' AbortSignals and pending-task releases (step 3 criterion 7)', () => {

    let tasks: PendingTasks;
    let add: PendingTasks['add'];
    let releases: WeakRef<() => void>[];

    /**
     * Releases are caught by wrapping `PendingTasks.add` with a plain function
     * that keeps only a `WeakRef` to each release it hands out - not a `jest`
     * spy, whose `mock.results` would hold every one. Restored after each
     * case.
     */
    beforeEach(() => {
      tasks = TestBed.inject(PendingTasks);
      add = tasks.add;
      releases = [];
      tasks.add = function (this: PendingTasks): () => void {
        const release = add.call(this);
        releases.push(new WeakRef(release));
        return release;
      };
    });

    afterEach(() => {
      tasks.add = add;
    });

    /**
     * `runs()`, with each run's `AbortSignal` watched through a `WeakRef`
     * taken inside the source function. A run left pending is held only
     * through the signal: once the fixture returns, nothing reaches the
     * resolver that would settle it.
     */
    const aborting = () => {
      const { load: next, settleOldest, values } = runs();
      const signals: WeakRef<AbortSignal>[] = [];

      const load = (_id: unknown, abort: AbortSignal): Promise<Resolved> => {
        signals.push(new WeakRef(abort));
        return next();
      };

      return { load, settleOldest, values, signals };
    };

    it('should keep no superseded run\'s AbortSignal or release, and keep the current run\'s', async () => {
      const { value, signals } = await (async () => {
        const { load, settleOldest, signals } = aborting();

        const id = signal(0);
        const value = create('load(id, abort)', { id, load }, { abortSignalKey: 'abort' });

        expect(value()).toBeUndefined();

        for (let i = 1; i <= 5; i++) {
          id.set(i);
          expect(value()).toBeUndefined();
          settleOldest(i - 1);
          await flush();
        }

        // The sixth run is left pending: its controller and its release are
        // the signal's to keep.
        return { value, signals };
      })();

      expect(signals).toHaveLength(6);
      expect(releases).toHaveLength(6);

      const liveSignals = await collect(signals);
      const liveReleases = await collect(releases);

      expect(liveSignals).toEqual([false, false, false, false, false, true]);
      expect(liveReleases).toEqual([false, false, false, false, false, true]);
      expect(value.status()).toEqual('loading');
    });

    it('should keep neither of a run pending at destroy(), once it settles', async () => {
      const { destroyed, kept, signals } = await (async () => {
        const { load, settleOldest, signals } = aborting();

        const destroyed = create('load(0, abort)', { load }, { abortSignalKey: 'abort' });
        // The control: the same fixture, not destroyed, its run left pending.
        const kept = create('load(0, abort)', { load }, { abortSignalKey: 'abort' });

        expect(destroyed()).toBeUndefined();
        expect(kept()).toBeUndefined();

        destroyed.destroy();

        settleOldest(0);
        await flush();

        return { destroyed, kept, signals };
      })();

      expect(signals).toHaveLength(2);
      expect(releases).toHaveLength(2);

      const liveSignals = await collect(signals);
      const liveReleases = await collect(releases);

      expect(liveSignals).toEqual([false, true]);
      expect(liveReleases).toEqual([false, true]);
      expect(destroyed.status()).toEqual('idle');
      expect(kept.status()).toEqual('loading');
    });

  });

});
