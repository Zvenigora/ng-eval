import { AnyNode } from 'acorn';
import { EvalHooks, EvalNodeHookEvent, EvalState } from '../classes/eval';
import { Context } from '../classes/common';
import { evaluate, evaluateAsync, parse } from '../functions';

/**
 * Parses a single expression down to its root node, the way the services do.
 */
const nodeOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

/**
 * Records every node event fired during one evaluation.
 */
class Recorder {
  readonly hooks = new EvalHooks();
  readonly before: EvalNodeHookEvent[] = [];
  readonly after: EvalNodeHookEvent[] = [];

  constructor() {
    this.hooks.on('before', '*', (e) => this.before.push(e));
    this.hooks.on('after', '*', (e) => this.after.push(e));
  }

  state(context: Context = {}, options: Record<string, unknown> = {}): EvalState {
    return EvalState.fromContext(context, { hooks: this.hooks, ...options });
  }

  get beforeTypes(): string[] {
    return this.before.map((e) => e.node.type);
  }

  get afterTypes(): string[] {
    return this.after.map((e) => e.node.type);
  }

  /** Events synthesised by unwinding rather than dispatched by a visitor. */
  get unwound(): EvalNodeHookEvent[] {
    return this.after.filter((e) => e.completed === false);
  }

  /** How many after events each node received, keyed by node identity. */
  afterCounts(): Map<AnyNode, number> {
    const counts = new Map<AnyNode, number>();
    for (const event of this.after) {
      counts.set(event.node, (counts.get(event.node) ?? 0) + 1);
    }
    return counts;
  }
}

describe('visitor hooks', () => {

  describe('dispatch over a real walk', () => {

    it('should fire a wildcard hook once per node', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1, b: 2 });

      evaluate(nodeOf('a + b * 2'), state);

      expect(recorder.beforeTypes).toEqual([
        'BinaryExpression',
        'Identifier',
        'BinaryExpression',
        'Identifier',
        'Literal'
      ]);
      expect(recorder.before).toHaveLength(state.result.trace.length);
    });

    it('should fire after events in the order the results were traced', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1, b: 2 });

      evaluate(nodeOf('a + b * 2'), state);

      expect(recorder.afterTypes).toEqual(state.result.trace.map((item) => item.type));
    });

    it('should carry the pushed value on the after event', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1, b: 2 });

      evaluate(nodeOf('a + b * 2'), state);

      expect(recorder.after.map((e) => e.value)).toEqual([1, 2, 2, 4, 5]);
      expect(recorder.after.every((e) => e.completed)).toBe(true);
    });

    it('should hand every hook the state being evaluated', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1 });

      evaluate(nodeOf('a'), state);

      expect(recorder.before.every((e) => e.state === state)).toBe(true);
      expect(recorder.after.every((e) => e.state === state)).toBe(true);
    });

    it('should match every before with exactly one after on the success path', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1, b: 2, c: { d: 3 } });

      evaluate(nodeOf('a + b * 2 > c.d ? [a, b] : { x: c.d }'), state);

      expect(recorder.before.length).toBeGreaterThan(0);
      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.hooks.depth(state)).toBe(0);
      expect(recorder.unwound).toEqual([]);
    });

    it('should leave nothing open once the walk finishes', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1 });

      evaluate(nodeOf('a'), state);

      expect(recorder.hooks.depth(state)).toBe(0);
    });
  });

  describe('balance across throws', () => {

    it('should unwind the open nodes when a binary operation throws', () => {
      const recorder = new Recorder();
      const state = recorder.state({});

      expect(() => evaluate(nodeOf("'x' in null"), state))
        .toThrow(/Cannot use 'in' operator/);

      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.hooks.depth(state)).toBe(0);
      expect(recorder.unwound.map((e) => e.node.type)).toEqual(['BinaryExpression']);
      expect(recorder.unwound[0].error).toBeInstanceOf(Error);
      expect(recorder.unwound[0].value).toBeUndefined();
    });

    it('should unwind the open nodes when the prototype-pollution guard rejects', () => {
      const recorder = new Recorder();
      const state = recorder.state({ obj: {} });

      expect(() => evaluate(nodeOf('obj.__proto__'), state))
        .toThrow(/dangerous property/);

      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.hooks.depth(state)).toBe(0);
      expect(recorder.unwound.map((e) => e.node.type)).toEqual(['MemberExpression']);
      expect(recorder.unwound.every((e) => e.completed === false)).toBe(true);
    });

    it('should unwind innermost first when several nodes are open', () => {
      const recorder = new Recorder();
      const state = recorder.state({ obj: {} });

      expect(() => evaluate(nodeOf('1 + obj.__proto__'), state)).toThrow(/dangerous property/);

      expect(recorder.unwound.map((e) => e.node.type))
        .toEqual(['MemberExpression', 'BinaryExpression']);
      expect(recorder.before).toHaveLength(recorder.after.length);
    });

    it('should never give one node both a completed and an incomplete after', () => {
      const recorder = new Recorder();
      const state = recorder.state({ obj: {} });

      expect(() => evaluate(nodeOf('1 + obj.__proto__'), state)).toThrow(/dangerous property/);

      for (const count of recorder.afterCounts().values()) {
        expect(count).toBe(1);
      }
    });
  });

  describe('logical expression exits', () => {

    const cases: { name: string; expression: string; context: Context }[] = [
      { name: 'the && short circuit', expression: 'a && b', context: { a: false, b: 1 } },
      { name: 'the || short circuit', expression: 'a || b', context: { a: 1, b: 2 } },
      { name: 'the ?? short circuit', expression: 'a ?? b', context: { a: 0, b: 2 } },
      { name: 'the full evaluation path', expression: 'a && b', context: { a: 1, b: 2 } }
    ];

    for (const testCase of cases) {
      it(`should fire exactly one after for ${testCase.name}`, () => {
        const recorder = new Recorder();
        const state = recorder.state(testCase.context);

        evaluate(nodeOf(testCase.expression), state);

        const logicalAfters = recorder.after.filter((e) => e.node.type === 'LogicalExpression');
        const logicalBefores = recorder.before.filter((e) => e.node.type === 'LogicalExpression');

        expect(logicalBefores).toHaveLength(1);
        expect(logicalAfters).toHaveLength(1);
        expect(logicalAfters[0].completed).toBe(true);
        expect(recorder.hooks.depth(state)).toBe(0);
      });
    }

    it('should not visit the right operand on a short circuit', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: false, b: 1 });

      evaluate(nodeOf('a && b'), state);

      expect(recorder.beforeTypes).toEqual(['LogicalExpression', 'Identifier']);
    });
  });

  describe('identifier visitor branches', () => {

    it('should balance the case-sensitive branch', () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1 });

      evaluate(nodeOf('a'), state);

      expect(recorder.beforeTypes).toEqual(['Identifier']);
      expect(recorder.afterTypes).toEqual(['Identifier']);
      expect(recorder.after[0].value).toBe(1);
      expect(recorder.hooks.depth(state)).toBe(0);
    });

    it('should balance the case-insensitive branch', () => {
      const recorder = new Recorder();
      const state = recorder.state({ Alpha: 1 }, { caseInsensitive: true });

      evaluate(nodeOf('alpha'), state);

      expect(recorder.beforeTypes).toEqual(['Identifier']);
      expect(recorder.afterTypes).toEqual(['Identifier']);
      expect(recorder.after[0].value).toBe(1);
      expect(recorder.hooks.depth(state)).toBe(0);
    });
  });

  describe('re-entrant evaluation from an arrow function body', () => {

    it('should keep the enclosing nodes open when a host function swallows the throw', () => {
      const recorder = new Recorder();
      const safeCall = (fn: () => unknown) => {
        try {
          return fn();
        } catch {
          return 'caught';
        }
      };
      const state = recorder.state({ safeCall });

      const value = evaluate(nodeOf("safeCall(() => 'x' in null)"), state);

      expect(value).toBe('caught');
      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.hooks.depth(state)).toBe(0);
    });

    it('should unwind only the nodes the nested walk opened', () => {
      const recorder = new Recorder();
      const safeCall = (fn: () => unknown) => {
        try {
          return fn();
        } catch {
          return 'caught';
        }
      };
      const state = recorder.state({ safeCall });

      evaluate(nodeOf("safeCall(() => 'x' in null)"), state);

      // The arrow body's nodes are the nested walk's; the call and its callee are not.
      expect(recorder.unwound.map((e) => e.node.type)).toEqual(['BinaryExpression']);
    });

    it('should never give an enclosing node both an incomplete and a completed after', () => {
      const recorder = new Recorder();
      const safeCall = (fn: () => unknown) => {
        try {
          return fn();
        } catch {
          return 'caught';
        }
      };
      const state = recorder.state({ safeCall });

      evaluate(nodeOf("safeCall(() => 'x' in null)"), state);

      for (const count of recorder.afterCounts().values()) {
        expect(count).toBe(1);
      }
      expect(recorder.after.filter((e) => e.node.type === 'CallExpression'))
        .toEqual([expect.objectContaining({ completed: true })]);
    });
  });

  describe('a visitor that swallows its child throw', () => {

    // awaitVisitor catches a synchronous child throw, turns it into a promise
    // rejection and carries on to its own afterVisitor, so the child is still
    // open when the parent closes. A positional pop would close the child's
    // frame under the parent's name and leak one frame onto the state forever.
    const expression = 'call(async () => await obj.__proto__)';

    const stateFor = (recorder: Recorder): EvalState => recorder.state({
      call: (fn: () => unknown) => fn(),
      obj: {}
    });

    /**
     * Evaluates and keeps the downgraded rejection handled. Its shape is pinned
     * by the first case below; the rest care only about the hook bookkeeping.
     */
    const run = (state: EvalState): void => {
      const result = evaluate(nodeOf(expression), state) as Promise<unknown>;
      result.catch(() => undefined);
    };

    it('should leave nothing open after the walk', async () => {
      const recorder = new Recorder();
      const state = stateFor(recorder);

      // The guard rejection is downgraded to a rejected promise by awaitVisitor
      // rather than thrown - the behaviour recorded in ROADMAP.md as deferred.
      // Awaiting it here keeps the rejection handled instead of leaving it to
      // the test environment, and pins the current shape while it stands.
      await expect(evaluate(nodeOf(expression), state) as Promise<unknown>)
        .rejects.toThrow(/dangerous property/);

      expect(recorder.hooks.depth(state)).toBe(0);
      expect(state.hookBookkeeping.open).toEqual([]);
    });

    it('should match every before with exactly one after', () => {
      const recorder = new Recorder();
      const state = stateFor(recorder);

      run(state);

      expect(recorder.before).toHaveLength(recorder.after.length);
      for (const count of recorder.afterCounts().values()) {
        expect(count).toBe(1);
      }
      expect(recorder.beforeTypes.slice().sort()).toEqual(recorder.afterTypes.slice().sort());
    });

    it('should close the abandoned member expression as incomplete', () => {
      const recorder = new Recorder();
      const state = stateFor(recorder);

      run(state);

      expect(recorder.beforeTypes).toContain('MemberExpression');
      expect(recorder.unwound.map((e) => e.node.type)).toEqual(['MemberExpression']);
      expect(recorder.unwound[0].value).toBeUndefined();
      expect(recorder.unwound[0].error).toBeUndefined();
    });

    it('should not strand a frame into the next evaluation on the same state', () => {
      const recorder = new Recorder();
      const state = stateFor(recorder);

      run(state);
      recorder.before.length = 0;
      recorder.after.length = 0;

      evaluate(nodeOf('1 + 1'), state);

      expect(recorder.hooks.depth(state)).toBe(0);
      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.unwound).toEqual([]);
    });
  });

  describe('asynchronous evaluation', () => {

    it('should balance before and after on the async success path', async () => {
      const recorder = new Recorder();
      const state = recorder.state({ a: 1, b: 2 });

      await evaluateAsync(nodeOf('a + b'), state);

      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.unwound).toEqual([]);
      expect(recorder.hooks.depth(state)).toBe(0);
    });

    it('should unwind the open nodes when the async walk throws', async () => {
      const recorder = new Recorder();
      const state = recorder.state({});

      await expect(evaluateAsync(nodeOf("'x' in null"), state))
        .rejects.toThrow(/Cannot use 'in' operator/);

      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.hooks.depth(state)).toBe(0);
      expect(recorder.unwound.map((e) => e.node.type)).toEqual(['BinaryExpression']);
    });

    it('should synthesise nothing when a promise rejects after the walk completed', async () => {
      const recorder = new Recorder();
      const state = recorder.state({ p: Promise.reject(new Error('nope')) });

      await expect(evaluateAsync(nodeOf('p'), state)).rejects.toThrow('nope');

      // The walk itself finished, so every node was closed by its own afterVisitor
      // and the depth was already back at the mark when the rejection surfaced.
      expect(recorder.unwound).toEqual([]);
      expect(recorder.before).toHaveLength(recorder.after.length);
      expect(recorder.hooks.depth(state)).toBe(0);
    });
  });

  describe('the no-hooks path', () => {

    it('should report no hooks and open nothing for an evaluation with no hooks', () => {
      const state = EvalState.fromContext({ a: 1 }, {});

      evaluate(nodeOf('a + 1'), state);

      expect(state.hasHooks).toBe(false);
      expect(state.hookBookkeeping.open).toEqual([]);
    });

    it('should not write to the console under trackTime', () => {
      const time = jest.spyOn(console, 'time').mockImplementation(() => undefined);
      const timeEnd = jest.spyOn(console, 'timeEnd').mockImplementation(() => undefined);

      try {
        const state = EvalState.fromContext({ a: 1 }, { trackTime: true });

        expect(evaluate(nodeOf('a + 1'), state)).toBe(2);
        expect(time).not.toHaveBeenCalled();
        expect(timeEnd).not.toHaveBeenCalled();
      } finally {
        time.mockRestore();
        timeEnd.mockRestore();
      }
    });
  });
});
