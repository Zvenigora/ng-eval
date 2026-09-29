import { EnvironmentInjector, createEnvironmentInjector,
  runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { CompilerService, EvalContext, EvalHooks, EvalState,
  createDependencyTracker } from '@zvenigora/ng-eval-core';
import { EvalSignal, EvalSignalOptions, createEvalSignal } from './eval-signal';
import { SignalContextSource, createSignalContext } from './signal-context';

/**
 * Mirrors `eval-core`'s `eval.service.memory-leaks.spec.ts`: what a signal
 * accumulates over its life, and what it releases when it ends.
 *
 * Three things can outlive a signal and must not (plan S 3.8) - the states,
 * the hook registrations, and the teardown callback itself - plus one that
 * outlives a *recompute* and must not: a scope leaked onto the shared
 * `EvalContext` by an arrow function that threw (S 3.8.3).
 */
describe('createEvalSignal - lifetime and cleanup', () => {

  let compiler: CompilerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    compiler = TestBed.inject(CompilerService);
  });

  const create = (
    expression: string,
    source: SignalContextSource | EvalContext,
    options?: EvalSignalOptions
  ): EvalSignal<unknown> =>
    TestBed.runInInjectionContext(() => createEvalSignal(expression, source, options));

  const statesBuilt = (spy: jest.SpyInstance): EvalState[] =>
    spy.mock.results.map((result) => result.value as EvalState);

  describe('one EvalState per recompute', () => {

    // `eval-core`'s memory spec's instrument. Jest has no `global.gc`: the
    // flag exposes `gc` to contexts created after it is set, and is cleared
    // again at once so that the contexts Jest builds for later suites do not
    // get one.
    setFlagsFromString('--expose-gc');
    const gc = runInNewContext('gc') as () => void;
    setFlagsFromString('--no-expose-gc');

    // Whether each target is still alive. A `WeakRef` keeps its target alive
    // until the job that created or read it ends, so the collection has to
    // happen in a later one.
    const collect = async (refs: WeakRef<object>[]): Promise<boolean[]> => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      gc();
      return refs.map((ref) => ref.deref() !== undefined);
    };

    /**
     * The states are reached through a read hook's `event.state` rather than
     * through the `createState` spy, so the assertion is about the state the
     * *walk* used and not only about what the factory handed out.
     *
     * The plan's bullet said to do this "under `trackDependencies: true`",
     * which is not reachable: that option plus a caller registry throws by
     * design (S 3.4), and the factory's own tracker is not visible from here.
     * The documented escape hatch - the same tracker on a registry the caller
     * owns - reaches the same events.
     */
    it('should hand each recompute a state of its own, none of them grown', () => {
      const hooks = new EvalHooks();
      const tracker = createDependencyTracker();
      tracker.install(hooks);

      const c = signal(0);
      const value = create('a.b + c', { a: signal({ b: 1 }), c }, { eval: { hooks } });

      for (let i = 1; i <= 5; i++) {
        c.set(i);
        expect(value()).toEqual(i + 1);
      }

      const states = tracker.reads.map((read) => read.state);
      const distinct = [...new Set(states)];

      expect(distinct).toHaveLength(5);

      // The retention half, and the one that fails on a reused state:
      // `EvalResult.trace` holds every node's value and is drained by nothing
      // on this path, so a shared state's trace would be 5x the first walk's
      // by now. `eval-core` 0.6.0 adds `clearTrace()`, and nothing on this
      // path calls it; nor does any service drain these states at destroy.
      const [first] = distinct;
      expect(first.result.trace.length).toBeGreaterThan(0);
      distinct.forEach((state) =>
        expect(state.result.trace.length).toEqual(first.result.trace.length));
    });

    /**
     * What S 3.8 asks of a recompute's state: that nothing keeps it once the
     * recompute returns. Asked of the collector, as `eval-core`'s memory spec
     * asks it: a read hook on a registry the test owns catches each state as a
     * `WeakRef`, and a full GC runs before the assertion.
     *
     * This replaced a count of `EvalService`'s private state set, contrasted
     * with five states driven through `EvalService.createState` - the reason
     * S 3.3.1 gives for building states through `CompilerService`. `eval-core`
     * removed the set (docs/backlog.md, `BL-A8`), so the count had nothing left
     * to read. The behaviour is asserted instead, and it holds whichever
     * service builds the states. A spy asserting `EvalService` is never called
     * would pin that choice after its reason had gone.
     *
     * The third state is also held by the test, in `held`, and must survive:
     * that is what shows the other four are collected rather than never
     * caught. The recomputes run inside a function that returns only the
     * `WeakRef`s, so no local of this test other than `held` reaches a state
     * (`BL-A19`'s technique note).
     */
    it('should leave no recompute\'s state reachable once it has returned', async () => {
      let held: EvalState | undefined;

      const refs = (() => {
        const caught: WeakRef<EvalState>[] = [];
        const hooks = new EvalHooks();
        hooks.onRead((event) => {
          caught.push(new WeakRef(event.state));
          if (caught.length === 3) {
            held = event.state;
          }
        });

        const c = signal(0);
        const value = create('c + 1', { c }, { eval: { hooks } });

        for (let i = 1; i <= 5; i++) {
          c.set(i);
          expect(value()).toEqual(i + 1);
        }

        return caught;
      })();

      // One read per recompute, so one state each.
      expect(refs).toHaveLength(5);

      const live = await collect(refs);

      expect(live).toEqual([false, false, true, false, false]);
      expect(held).toBeDefined();
    });

  });

  describe('the read-hook registration', () => {

    // `restoreMocks` is not configured, and the spy below is on a shared
    // prototype rather than on a per-TestBed instance - so a failing
    // assertion before its `mockRestore()` would leave it installed for the
    // rest of the file.
    afterEach(() => jest.restoreAllMocks());

    it('should install and remove its hook once per recompute, on a registry per walk', () => {
      const onRead = jest.spyOn(EvalHooks.prototype, 'onRead');
      const states = jest.spyOn(compiler, 'createState');

      const c = signal(0);
      const value = create('c + 1', { c }, { trackDependencies: true });

      for (let i = 1; i <= 3; i++) {
        c.set(i);
        expect(value()).toEqual(i + 1);
      }

      const built = statesBuilt(states);

      expect(built).toHaveLength(3);

      // Installed once per recompute, never twice on one registry, and never
      // on a registry shared between two of them.
      expect(onRead).toHaveBeenCalledTimes(3);
      expect(new Set(onRead.mock.instances).size).toEqual(3);

      // ...and removed again inside the recompute that made it. This is what
      // S 3.8's "destroy() has nothing left to unsubscribe" rests on, so it
      // is asserted where it happens rather than at destroy(), where an
      // implementation that never registered anything would pass too.
      built.forEach((state) => expect(state.hooks.hasReadHooks).toBe(false));
    });

  });

  describe('DestroyRef', () => {

    /**
     * `options.injector` resolves services; it does not scope lifetime
     * (S 3.8.1). Auto-teardown therefore comes from the *ambient* injection
     * context and from nowhere else.
     */
    it('should destroy itself with the injection context that created it', () => {
      const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
      const c = signal(1);
      const value = runInInjectionContext(injector, () => createEvalSignal('c + 1', { c }));

      expect(value()).toEqual(2);

      injector.destroy();

      // No dependency has moved, so this is the destroyed signal's own value
      // rather than a recompute's (S 3.8.2).
      expect(value()).toBeUndefined();
    });

    it('should not take its lifetime from an injector passed as an option', () => {
      const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
      const c = signal(1);

      // Outside any injection context - the case the option exists for, and
      // the case `EvalSignalService.create` is in on every call.
      const value = createEvalSignal('c + 1', { c }, { injector });

      expect(value()).toEqual(2);

      injector.destroy();
      c.set(5);

      expect(value()).toEqual(6);
    });

    /**
     * The one assertion here that reaches into a private, and the reason it
     * has to: releasing a `DestroyRef` registration has **no behavioural
     * surface**. `destroy()` is idempotent, so a callback the injector still
     * holds does nothing observable when it eventually fires - the difference
     * is retention and nothing else. A stub `DestroyRef` is not an option
     * either: an explicit provider for it loses to the injector's intrinsic
     * one, checked rather than assumed. So this counts the injector's hooks,
     * the way `eval-core`'s memory spec counted `EvalService`'s state set
     * until that set was removed (docs/backlog.md, `BL-A8`).
     */
    it('should release its registration when destroyed by hand', () => {
      const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
      const hooks = (injector as unknown as { _onDestroyHooks: unknown[] })._onDestroyHooks;
      const before = hooks.length;

      const value = runInInjectionContext(injector,
        () => createEvalSignal('c + 1', { c: signal(1) }));

      expect(hooks.length).toEqual(before + 1);

      value.destroy();

      // Without the release the injector holds the callback - and through it
      // the signal, its context and its compiled callback - until its own
      // teardown, which for the root injector is the life of the application.
      expect(hooks.length).toEqual(before);

      value.destroy();

      expect(hooks.length).toEqual(before);
    });

  });

  describe('the arrow-scope containment', () => {

    /**
     * **Rewritten in Phase 2 step 0b.** This case used to drive the leak
     * through a throwing arrow body, because `arrow-function-expression.ts`
     * pushed a scope and popped it with no `try`/`finally`. Step 0 fixed that
     * ([A9](../../../../docs/backlog-retired.md#a9)) and the case went on passing with
     * `eval-signal.ts`'s guard **deleted** - a green row reporting coverage it
     * no longer had.
     *
     * The guard is retained, not redundant-and-removable: the
     * `@zvenigora/ng-eval-core` peer range in `modules/eval-signals/package.json`
     * admits the leaking 0.3.0. That reason is range-dependent; the durable one
     * is below, and it is why raising the range's lower bound would not make
     * the guard removable. See the `finally` in `eval-signal.ts` for both.
     *
     * So the leak is now driven the way the durable reason names:
     * `EvalContext.push` and `pop` are **public methods on a published class**,
     * reachable with no visitor at all. A source function that pushes and does
     * not pop strands a scope exactly as a push site missing its `finally`
     * would, and is the one route no fix inside `eval-core`'s visitors can
     * close.
     *
     * `signal-context.spec.ts` holds the other half - the same context driven
     * straight through `EvalService`, outside any recompute, where step 0's fix
     * now reaches and this guard never could.
     */
    it('should contain a scope stranded through the published push to the recompute that made it', () => {
      const context = createSignalContext({
        x: signal('from source'),
        // Referenced before its declaration on purpose: this runs only when a
        // recompute calls it, long after the line below.
        strand: () => {
          context.push({ x: 'stranded' });

          return 'ok';
        },
      });

      // A scope the caller owns, so the depth the guard marks on entry is not
      // zero. Its key is not `x`: bound to the name the signals read it would
      // shadow the source for the walk itself, which is a different property.
      context.push({ marker: 'the caller\'s own scope' });

      const plain = create('x', context);
      const stranding = create('strand()', context);

      expect(plain()).toEqual('from source');
      expect(stranding()).toEqual('ok');

      // The direct assertion: the recompute stranded `{ x: 'stranded' }` on a
      // context that outlives it, and the guard put the depth back - to the
      // caller's mark, not to the bottom.
      expect(context.scopes.length).toEqual(1);
      expect(context.get('marker')).toEqual('the caller\'s own scope');

      // The end-to-end one (S 6.1). Scopes are step 1 of `EvalContext.get`'s
      // resolution order, so without the guard this reads `'stranded'` - for
      // this recompute and every one after it, on a context that lives as long
      // as the signal does.
      plain.invalidate();

      expect(plain()).toEqual('from source');

      context.pop();
    });

  });

});
