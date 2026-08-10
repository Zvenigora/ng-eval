import { AnyNode } from 'acorn';
import { EvalHooks } from '../eval-hooks';
import { EvalKnownOptions } from '../eval-options';
import { EvalState } from '../eval-state';
import { evaluate, parse } from '../../../functions';
import { createTimingHook } from './timing-hook';

const nodeOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

describe('the timing hook', () => {

  describe('installed by hand', () => {

    it('should accumulate a count and a total per node type', () => {
      const state = EvalState.fromContext({ a: 2, b: 3, c: 4 });
      createTimingHook().install(state.hooks);

      expect(evaluate(nodeOf('a + b * c'), state)).toBe(14);

      const binary = state.nodeTimings.get('BinaryExpression');
      const identifier = state.nodeTimings.get('Identifier');

      expect(binary?.count).toBe(2);
      expect(identifier?.count).toBe(3);
      // performance.now() has real resolution here, so a total is a number and
      // cannot be negative - but on a fast machine it can legitimately be 0.
      expect(binary?.total).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(binary?.total)).toBe(true);
    });

    it('should record nothing before an evaluation runs', () => {
      const state = EvalState.fromContext({ a: 1 });
      createTimingHook().install(state.hooks);

      expect(state.nodeTimings.size).toBe(0);
    });

    it('should stop recording once uninstalled', () => {
      const state = EvalState.fromContext({ a: 1, b: 2 });
      const off = createTimingHook().install(state.hooks);

      evaluate(nodeOf('a + b'), state);
      const recorded = state.nodeTimings.get('Identifier')?.count;
      expect(recorded).toBe(2);

      off();
      evaluate(nodeOf('a + b'), state);

      // Both halves of the pair came off, so nothing was added by the second run.
      expect(state.nodeTimings.get('Identifier')?.count).toBe(recorded);
    });

    it('should keep two evaluations through one registry apart', () => {
      const hooks = new EvalHooks();
      createTimingHook().install(hooks);

      const first = EvalState.fromContext({ a: 1, b: 2 }, { hooks });
      const second = EvalState.fromContext({ a: 1 }, { hooks });

      evaluate(nodeOf('a + b'), first);
      evaluate(nodeOf('a'), second);

      // Totals live on the state, not on the handle, so a shared registry does
      // not accumulate one run into the next.
      expect(first.nodeTimings.get('Identifier')?.count).toBe(2);
      expect(second.nodeTimings.get('Identifier')?.count).toBe(1);
    });

    it('should keep two handles on one state from popping each other', () => {
      const state = EvalState.fromContext({ a: 1, b: 2 });
      createTimingHook().install(state.hooks);
      createTimingHook().install(state.hooks);

      evaluate(nodeOf('a + b'), state);

      // Each handle owns its own start-time stack, so both measure the same
      // nodes rather than interleaving pops on a shared one. Installing twice
      // does double the counts - that is what installing twice means - but the
      // elapsed figures stay attributed to the right node type.
      expect(state.nodeTimings.get('Identifier')?.count).toBe(4);
      expect(state.nodeTimings.get('BinaryExpression')?.count).toBe(2);
      expect(state.hookBookkeeping.open).toEqual([]);
    });

    it('should still close a node whose visitor threw', () => {
      const state = EvalState.fromContext({ a: { b: 1 } });
      createTimingHook().install(state.hooks);

      expect(() => evaluate(nodeOf('a.__proto__'), state)).toThrow();

      // `unwindTo` emits the missing 'after' events, so the start-time stack
      // drains with the open-node stack rather than stranding entries.
      expect(state.hookBookkeeping.open).toEqual([]);
      expect(state.nodeTimings.get('MemberExpression')?.count).toBe(1);
    });

    it('should count an arrow body re-walked on every call', () => {
      const state = EvalState.fromContext({ list: [1, 2, 3] });
      createTimingHook().install(state.hooks);

      expect(evaluate(nodeOf('list.map(v => v + 1)'), state)).toEqual([2, 3, 4]);

      // The body is walked once per element, and the same node is open more
      // than once over the walk - which is why the start times are a stack.
      expect(state.nodeTimings.get('BinaryExpression')?.count).toBe(3);
    });
  });

  describe('installed by the trackTime option', () => {

    it('should produce per-node-type totals without writing to the console', () => {
      const time = jest.spyOn(console, 'time').mockImplementation(() => undefined);
      const timeEnd = jest.spyOn(console, 'timeEnd').mockImplementation(() => undefined);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      try {
        const state = EvalState.fromContext({ a: 2, b: 3 }, { trackTime: true });

        expect(evaluate(nodeOf('a * b'), state)).toBe(6);

        expect(state.nodeTimings.get('BinaryExpression')?.count).toBe(1);
        expect(state.nodeTimings.get('Identifier')?.count).toBe(2);

        // The old trackTime emitted a console.time whose timeEnd label never
        // matched, so it leaked an unclosed label per node and printed nothing
        // useful. Nothing reaches the console now.
        expect(time).not.toHaveBeenCalled();
        expect(timeEnd).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
      } finally {
        time.mockRestore();
        timeEnd.mockRestore();
        log.mockRestore();
      }
    });

    it('should dispatch for the whole walk once trackTime is on', () => {
      const state = EvalState.fromContext({ a: 1 }, { trackTime: true });

      // Registering from options builds the registry eagerly and latches
      // isActive, so hasHooks is true before the walk starts. Documented as the
      // accepted cost of the option rather than defended against.
      expect(state.hasHooks).toBe(true);

      evaluate(nodeOf('a'), state);
      expect(state.nodeTimings.size).toBeGreaterThan(0);
    });

    it('should accept options annotated with EvalKnownOptions', () => {
      // A compile-time assertion as much as a runtime one: EvalKnownOptions is
      // documentation whose whole point is this annotated form, and an
      // interface would not type-check here - it gets no implicit index
      // signature, so it is not assignable to EvalOptions' Record arm. Written
      // as a spec because nothing else in the suite would catch that.
      const options: EvalKnownOptions = { trackTime: true, caseInsensitive: false };
      const state = EvalState.fromContext({ a: 1 }, options);

      evaluate(nodeOf('a'), state);

      expect(state.nodeTimings.get('Identifier')?.count).toBe(1);
    });

    it('should record nothing when trackTime is absent', () => {
      const state = EvalState.fromContext({ a: 1 });

      evaluate(nodeOf('a'), state);

      expect(state.hasHooks).toBe(false);
      expect(state.nodeTimings.size).toBe(0);
    });

    it('should leave an adopted registry untouched', () => {
      const hooks = new EvalHooks();
      const state = EvalState.fromContext({ a: 1 }, { hooks, trackTime: true });

      evaluate(nodeOf('a'), state);

      // Options configure the registry the state owns, never the caller's. The
      // same rule onHookError follows: installing here would leave a hook
      // firing on every later evaluation through this registry, with no
      // unsubscribe in the caller's hands.
      expect(hooks.isEmpty).toBe(true);
      expect(state.hooks).toBe(hooks);
      expect(state.nodeTimings.size).toBe(0);
    });
  });
});
