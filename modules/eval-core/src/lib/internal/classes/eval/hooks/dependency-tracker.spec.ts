import { AnyNode } from 'acorn';
import { Context } from '../../common';
import { EvalContext } from '../eval-context';
import { EvalScope, EvalScopeOptions } from '../eval-scope';
import { EvalState } from '../eval-state';
import { evaluate, parse } from '../../../functions';
import { createDependencyTracker } from './dependency-tracker';

const nodeOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

/**
 * Installs a tracker, evaluates, and hands back both - the shape Phase 3 uses:
 * everything in one synchronous turn.
 */
const track = (source: string,
               context: EvalContext | Context = {},
               options: Record<string, unknown> = {}) => {

  const tracker = createDependencyTracker();
  const state = EvalState.fromContext(context, options);
  tracker.install(state.hooks);

  const value = evaluate(nodeOf(source), state);
  return { tracker, state, value };
};

describe('the dependency tracker', () => {

  describe('the dependency set', () => {

    it('should record every hop of a member chain and each bare identifier', () => {
      const { tracker, value } = track('a.b + c', { a: { b: 1 }, c: 2 });

      expect(value).toBe(3);
      expect([...tracker.dependencies].sort()).toEqual(['a', 'a.b', 'c']);
    });

    it('should record a nested chain one path per hop', () => {
      const { tracker } = track('a.b.c', { a: { b: { c: 1 } } });

      expect([...tracker.dependencies].sort()).toEqual(['a', 'a.b', 'a.b.c']);
    });

    it('should record the same set on a re-evaluation after reset', () => {
      const context = { a: { b: 1 }, c: 2 };
      const tracker = createDependencyTracker();

      const first = EvalState.fromContext(context);
      tracker.install(first.hooks);
      evaluate(nodeOf('a.b + c'), first);
      const before = [...tracker.dependencies].sort();

      tracker.reset();
      expect(tracker.dependencies.size).toBe(0);
      expect(tracker.reads).toEqual([]);

      const second = EvalState.fromContext(context);
      tracker.install(second.hooks);
      evaluate(nodeOf('a.b + c'), second);

      expect([...tracker.dependencies].sort()).toEqual(before);
    });

    it('should record a read that resolved to undefined', () => {
      const { tracker } = track('missing', {});

      expect([...tracker.dependencies]).toEqual(['missing']);
    });

    it('should record a prior-scope read as a dependency', () => {
      const cat = { name: 'Miss Kitty', num: 3 };
      const evalContext = new EvalContext({}, {});
      const catOptions: EvalScopeOptions = {
        global: false, caseInsensitive: false, namespace: 'cat', thisArg: cat
      };
      evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

      const { tracker, value } = track('cat.num', evalContext);

      // priorScopes hold long-lived caller objects registered before the walk.
      // They are exactly what a signal should track, so they must survive the
      // scope filtering rather than be swept up by it.
      expect(value).toBe(3);
      expect([...tracker.dependencies].sort()).toEqual(['cat', 'cat.num']);
    });
  });

  describe('arrow-function parameters', () => {

    it('should record only the collection, not the loop variable', () => {
      const { tracker, value } = track('list.map(item => item.name)',
        { list: [{ name: 'a' }, { name: 'b' }] });

      expect(value).toEqual(['a', 'b']);
      // Not { list, item, item.name }: `item` is flagged `scoped` by the
      // walker, and `item.name` is dropped because its path is rooted at a
      // known binding. `list.map` is a method reference, not data.
      expect([...tracker.dependencies]).toEqual(['list']);
    });

    it('should keep the loop variable in the unfiltered read stream', () => {
      const { tracker } = track('list.map(item => item.name)',
        { list: [{ name: 'a' }, { name: 'b' }] });

      const paths = tracker.reads.map((e) => e.path);
      expect(paths).toContain('item');
      expect(paths).toContain('item.name');
      expect(tracker.reads.filter((e) => e.scoped)).toHaveLength(2);
    });

    it('should record a real dependency read inside an arrow body', () => {
      const { tracker, value } = track('list.map(n => n * factor)',
        { list: [1, 2], factor: 10 });

      expect(value).toEqual([10, 20]);
      expect([...tracker.dependencies].sort()).toEqual(['factor', 'list']);
    });

    it('should flag a parameter bound to undefined, so the set does not vary with the data', () => {
      const present = track('list.map(item => item?.name)',
        { list: [{ name: 'a' }, { name: 'b' }] });
      const absent = track('list.map(item => item?.name)',
        { list: [undefined, { name: 'a' }] });

      expect(absent.value).toEqual([undefined, 'a']);

      // `scoped` is read off the *binding*, not off the resolved value. Were it
      // read off the value, the undefined element's `item` read would fall
      // through to the context, arrive unflagged, and drag `item.name` in with
      // it - so one expression would report two different dependency sets
      // depending on its data, and a Phase 3 signal would subscribe to a
      // loop variable.
      expect([...present.tracker.dependencies]).toEqual(['list']);
      expect([...absent.tracker.dependencies]).toEqual(['list']);
    });
  });

  describe('reads it deliberately drops', () => {

    it('should not record a method reached through a member hop', () => {
      const { tracker } = track('text.toUpperCase()', { text: 'abc' });

      expect([...tracker.dependencies]).toEqual(['text']);
    });

    it('should record a bare identifier even when it holds a function', () => {
      const double = (n: number) => n * 2;
      const { tracker, value } = track('double(n)', { double, n: 4 });

      // Exempt from the method-reference rule: named directly rather than
      // reached through an object, so no already-recorded object stands in.
      expect(value).toBe(8);
      expect([...tracker.dependencies].sort()).toEqual(['double', 'n']);
    });

    it('should over-drop a real dependency whose name was also an arrow parameter', () => {
      const { tracker, value } = track('list.map(item => item.y).length + item.x',
        { list: [{ y: 1 }], item: { x: 5 } });

      expect(value).toBe(6);
      // A known false negative, not an accident: the scope-binding filter keys
      // on the *name*, so once `item` has been an arrow parameter anywhere in
      // the expression, a genuine `item.x` elsewhere in it is dropped too. A
      // signal built on this misses updates to `item.x`. Pinned here so the
      // limit is a decision rather than a downstream surprise; § 9 hands the
      // paths-versus-identity question to Phase 3, and this is its cost.
      expect([...tracker.dependencies]).toEqual(['list']);
      // The reads themselves are all there for a consumer keying on identity.
      expect(tracker.reads.map((e) => e.path)).toContain('item.x');
    });

    it('should not record a computed member, which has no reconstructible path', () => {
      const { tracker, value } = track('a[key]', { a: { b: 1 }, key: 'b' });

      expect(value).toBe(1);
      expect([...tracker.dependencies].sort()).toEqual(['a', 'key']);

      // Still in the raw stream with an exact key and target, for a consumer
      // willing to key on identity instead of on paths.
      const computed = tracker.reads.find((e) => e.kind === 'member' && e.path === undefined);
      expect(computed?.key).toBe('b');
      expect(computed?.value).toBe(1);
    });
  });

  describe('installation', () => {

    it('should record nothing until installed', () => {
      const tracker = createDependencyTracker();
      const state = EvalState.fromContext({ a: 1 });

      evaluate(nodeOf('a'), state);

      expect(tracker.dependencies.size).toBe(0);
      expect(state.hasHooks).toBe(false);
    });

    it('should stop recording once uninstalled', () => {
      const tracker = createDependencyTracker();
      const state = EvalState.fromContext({ a: 1, b: 2 });
      const off = tracker.install(state.hooks);

      evaluate(nodeOf('a'), state);
      off();
      evaluate(nodeOf('b'), state);

      expect([...tracker.dependencies]).toEqual(['a']);
    });

    it('should expose a live dependency set', () => {
      const tracker = createDependencyTracker();
      const dependencies = tracker.dependencies;
      const state = EvalState.fromContext({ a: 1 });
      tracker.install(state.hooks);

      evaluate(nodeOf('a'), state);

      // The reference taken before evaluating is the one that filled, so a
      // consumer can hold it across the call.
      expect([...dependencies]).toEqual(['a']);
    });
  });

  describe('case-insensitive evaluation', () => {

    it('should key on the source spelling, not the corrected key', () => {
      const { tracker, value } = track('A.B', { a: { b: 1 } }, { caseInsensitive: true });

      expect(value).toBe(1);
      // `path` is reconstructed from source and is never corrected, while the
      // event's `key` is. Consumers keying on paths must normalise themselves.
      expect([...tracker.dependencies].sort()).toEqual(['A', 'A.B']);
      expect(tracker.reads.map((e) => e.key)).toEqual(['a', 'b']);
    });
  });
});
