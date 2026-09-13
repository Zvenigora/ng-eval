import { AnyNode, ExpressionStatement, parse } from 'acorn';
import { EvalHooks, EvalNodeHookEvent, EvalReadEvent } from './eval-hooks';
import { EvalOptions } from './eval-options';
import { EvalState } from './eval-state';

/**
 * Parses a single expression and returns its root node.
 */
const nodeOf = (source: string): AnyNode => {
  const program = parse(source, { ecmaVersion: 'latest' });
  const statement = program.body[0] as ExpressionStatement;
  return statement.expression;
};

describe('EvalHooks', () => {
  let state: EvalState;
  let binary: AnyNode;
  let identifier: AnyNode;
  let member: AnyNode;

  beforeEach(() => {
    state = EvalState.fromContext({}, {});
    binary = nodeOf('a + b');
    identifier = nodeOf('a');
    member = nodeOf('a.b');
  });

  it('should create an instance', () => {
    const hooks = new EvalHooks();

    expect(hooks).toBeTruthy();
    expect(hooks.isEmpty).toBe(true);
    expect(hooks.isActive).toBe(false);
    expect(state.hookErrors).toEqual([]);
  });

  describe('registration', () => {

    it('should fire a keyed hook only for its own node type', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('before', 'BinaryExpression', (e) => seen.push(e.node.type));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      expect(seen).toEqual(['BinaryExpression']);
    });

    it('should fire a wildcard hook for every node type', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('before', '*', (e) => seen.push(e.node.type));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      expect(seen).toEqual(['BinaryExpression', 'Identifier']);
    });

    it('should fire the keyed hook before the wildcard hook', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('before', '*', () => seen.push('wildcard'));
      hooks.on('before', 'BinaryExpression', () => seen.push('keyed'));

      hooks.dispatch('before', binary, state);

      expect(seen).toEqual(['keyed', 'wildcard']);
    });

    it('should keep the before and after registries separate', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('before', '*', () => seen.push('before'));
      hooks.on('after', '*', () => seen.push('after'));

      hooks.dispatch('before', binary, state);

      expect(seen).toEqual(['before']);
    });

    it('should report isEmpty until a hook is registered', () => {
      const hooks = new EvalHooks();
      expect(hooks.isEmpty).toBe(true);

      hooks.on('before', '*', () => undefined);

      expect(hooks.isEmpty).toBe(false);
    });

    it('should pass the node and the state to the hook', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('before', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);

      expect(events).toHaveLength(1);
      expect(events[0].phase).toBe('before');
      expect(events[0].node).toBe(binary);
      expect(events[0].state).toBe(state);
      expect(events[0].completed).toBe(true);
      expect(events[0].error).toBeUndefined();
    });

    it('should carry the pushed value on after events only', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('before', '*', (e) => events.push(e));
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('after', binary, state, 42);

      expect(events[0].value).toBeUndefined();
      expect(events[1].value).toBe(42);
      expect(events[1].completed).toBe(true);
    });

    it('should fire every hook registered for the same key', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      hooks.on('after', 'Identifier', () => seen.push(1));
      hooks.on('after', 'Identifier', () => seen.push(2));

      hooks.dispatch('after', identifier, state, 'a');

      expect(seen).toEqual([1, 2]);
    });

    it('should let a hook unregister itself mid-dispatch without skipping the next hook', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      const unsubscribe = hooks.on('after', '*', () => {
        seen.push(1);
        unsubscribe();
      });
      hooks.on('after', '*', () => seen.push(2));

      hooks.dispatch('after', identifier, state, 'a');
      hooks.dispatch('after', identifier, state, 'a');

      expect(seen).toEqual([1, 2, 2]);
    });
  });

  describe('unsubscribe, off and clear', () => {

    it('should stop firing a hook after its unsubscribe is called', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      const unsubscribe = hooks.on('before', '*', () => seen.push(1));

      hooks.dispatch('before', binary, state);
      unsubscribe();
      hooks.dispatch('before', binary, state);

      expect(seen).toEqual([1]);
      expect(hooks.isEmpty).toBe(true);
    });

    it('should treat a repeated unsubscribe as a no-op', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      const unsubscribe = hooks.on('before', '*', () => seen.push(1));
      hooks.on('before', '*', () => seen.push(2));

      unsubscribe();
      unsubscribe();
      hooks.dispatch('before', binary, state);

      expect(seen).toEqual([2]);
      expect(hooks.isEmpty).toBe(false);
    });

    it('should remove a single hook via off', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      const first = () => seen.push(1);
      hooks.on('before', 'BinaryExpression', first);
      hooks.on('before', 'BinaryExpression', () => seen.push(2));

      hooks.off('before', 'BinaryExpression', first);
      hooks.dispatch('before', binary, state);

      expect(seen).toEqual([2]);
    });

    it('should remove every hook for a key when off is called without a hook', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      hooks.on('before', 'BinaryExpression', () => seen.push(1));
      hooks.on('before', 'BinaryExpression', () => seen.push(2));
      hooks.on('before', '*', () => seen.push(3));

      hooks.off('before', 'BinaryExpression');
      hooks.dispatch('before', binary, state);

      expect(seen).toEqual([3]);
      expect(hooks.isEmpty).toBe(false);
    });

    it('should ignore off for a key or hook that was never registered', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => undefined);

      expect(() => hooks.off('before', 'Identifier')).not.toThrow();
      expect(() => hooks.off('before', '*', () => undefined)).not.toThrow();
      expect(hooks.isEmpty).toBe(false);
    });

    it('should remove hooks from both phases on clear', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('before', '*', () => seen.push('before'));
      hooks.on('after', 'Identifier', () => seen.push('after'));

      hooks.clear();
      hooks.dispatch('before', identifier, state);
      hooks.dispatch('after', identifier, state, 'a');

      expect(seen).toEqual([]);
      expect(hooks.isEmpty).toBe(true);
    });

    it('should keep collected errors on clear', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });
      hooks.dispatch('before', binary, state);

      hooks.clear();

      expect(state.hookErrors).toHaveLength(1);
    });

    it('should leave the open-node stack alone on clear', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => undefined);

      hooks.dispatch('before', binary, state);
      hooks.clear();

      // the stack belongs to the state, not to the registry that was cleared
      expect(hooks.depth(state)).toBe(1);
    });
  });

  describe('isActive latch', () => {

    it('should be false on a fresh instance', () => {
      const hooks = new EvalHooks();

      expect(hooks.isActive).toBe(false);
    });

    it('should latch true on the first registration', () => {
      const hooks = new EvalHooks();

      hooks.on('before', '*', () => undefined);

      expect(hooks.isActive).toBe(true);
    });

    it('should stay true after the last hook is unsubscribed', () => {
      const hooks = new EvalHooks();
      const unsubscribe = hooks.on('before', '*', () => undefined);

      unsubscribe();

      expect(hooks.isEmpty).toBe(true);
      expect(hooks.isActive).toBe(true);
    });

    it('should stay true after the last hook is removed via off', () => {
      const hooks = new EvalHooks();
      const hook = () => undefined;
      hooks.on('after', 'Identifier', hook);

      hooks.off('after', 'Identifier', hook);

      expect(hooks.isEmpty).toBe(true);
      expect(hooks.isActive).toBe(true);
    });

    it('should reset to false on clear', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => undefined);

      hooks.clear();

      expect(hooks.isActive).toBe(false);
    });

    it('should track isEmpty independently of isActive', () => {
      const hooks = new EvalHooks();
      const unsubscribe = hooks.on('before', '*', () => undefined);

      expect(hooks.isEmpty).toBe(false);
      expect(hooks.isActive).toBe(true);

      unsubscribe();

      expect(hooks.isEmpty).toBe(true);
      expect(hooks.isActive).toBe(true);

      hooks.on('before', '*', () => undefined);

      expect(hooks.isEmpty).toBe(false);
      expect(hooks.isActive).toBe(true);
    });
  });

  describe('error policy', () => {

    it('should collect a hook error by default and keep dispatching', () => {
      const hooks = new EvalHooks();
      const boom = new Error('boom');
      const seen: number[] = [];
      hooks.on('before', '*', () => {
        throw boom;
      });
      hooks.on('before', '*', () => seen.push(1));

      expect(() => hooks.dispatch('before', binary, state)).not.toThrow();

      expect(seen).toEqual([1]);
      expect(state.hookErrors).toHaveLength(1);
      expect(state.hookErrors[0].phase).toBe('before');
      expect(state.hookErrors[0].nodeType).toBe('BinaryExpression');
      expect(state.hookErrors[0].error).toBe(boom);
    });

    it('should collect by default when the policy is unrecognised', () => {
      const hooks = new EvalHooks({ onHookError: 'nonsense' } as EvalOptions);
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => hooks.dispatch('before', binary, state)).not.toThrow();
      expect(state.hookErrors).toHaveLength(1);
    });

    it('should rethrow a hook error under the throw policy', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => hooks.dispatch('before', binary, state)).toThrow('boom');
      expect(state.hookErrors).toHaveLength(0);
    });

    it('should swallow a hook error under the ignore policy', () => {
      const hooks = new EvalHooks({ onHookError: 'ignore' } as EvalOptions);
      const seen: number[] = [];
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });
      hooks.on('before', '*', () => seen.push(1));

      expect(() => hooks.dispatch('before', binary, state)).not.toThrow();

      expect(seen).toEqual([1]);
      expect(state.hookErrors).toHaveLength(0);
    });

    it('should record the after phase and node type of a failing hook', () => {
      const hooks = new EvalHooks();
      hooks.on('after', '*', () => {
        throw new Error('boom');
      });

      hooks.dispatch('after', identifier, state, 'a');

      expect(state.hookErrors[0].phase).toBe('after');
      expect(state.hookErrors[0].nodeType).toBe('Identifier');
    });
  });

  describe('promise-returning hooks', () => {

    it('should record a returned promise as an error rather than awaiting it', () => {
      const hooks = new EvalHooks();
      hooks.on('after', '*', () => Promise.resolve('ignored'));

      hooks.dispatch('after', identifier, state, 'a');

      expect(state.hookErrors).toHaveLength(1);
      expect((state.hookErrors[0].error as Error).message).toContain('will not be awaited');
      expect(state.hookErrors[0].nodeType).toBe('Identifier');
    });

    it('should keep dispatching the remaining hooks after a returned promise', () => {
      const hooks = new EvalHooks();
      const seen: number[] = [];
      hooks.on('before', '*', () => Promise.resolve());
      hooks.on('before', '*', () => seen.push(1));

      hooks.dispatch('before', binary, state);

      expect(seen).toEqual([1]);
    });

    it('should throw on a returned promise under the throw policy', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      hooks.on('before', '*', () => Promise.resolve());

      expect(() => hooks.dispatch('before', binary, state)).toThrow('will not be awaited');
    });

    it('should not flag a plain object as a promise', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => ({ then: 'not a function' }));

      hooks.dispatch('before', binary, state);

      expect(state.hookErrors).toHaveLength(0);
    });
  });

  describe('unwinding', () => {

    it('should flush nested opens innermost-first, marked incomplete', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));
      const boom = new Error('boom');

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.unwind(boom, state);

      expect(events.map((e) => e.node.type)).toEqual(['Identifier', 'BinaryExpression']);
      expect(events.every((e) => e.completed === false)).toBe(true);
      expect(events.every((e) => e.error === boom)).toBe(true);
      expect(events.every((e) => e.value === undefined)).toBe(true);
      expect(events.every((e) => e.state === state)).toBe(true);
    });

    it('should not unwind a node whose after was already dispatched', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.dispatch('after', identifier, state, 'a');
      hooks.unwind(new Error('boom'), state);

      expect(events.map((e) => e.node.type)).toEqual(['Identifier', 'BinaryExpression']);
      expect(events.map((e) => e.completed)).toEqual([true, false]);
    });

    it('should do nothing when there is nothing open', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.unwind(new Error('boom'), state);

      expect(events).toEqual([]);
    });

    it('should be idempotent', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.unwind(new Error('boom'), state);
      hooks.unwind(new Error('boom'), state);

      expect(events).toHaveLength(1);
    });

    it('should drain the stack even when an unwind hook throws', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      hooks.on('after', '*', (e) => {
        seen.push(e.node.type);
        throw new Error('hook boom');
      });

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      expect(() => hooks.unwind(new Error('boom'), state)).not.toThrow();

      expect(seen).toEqual(['Identifier', 'BinaryExpression']);
      expect(state.hookErrors).toHaveLength(2);

      // the throwing hook is still registered, so a stack that had not drained
      // would fire it again here
      hooks.unwind(new Error('boom'), state);

      expect(seen).toEqual(['Identifier', 'BinaryExpression']);
      expect(state.hookErrors).toHaveLength(2);
    });

    it('should collect rather than rethrow while unwinding under the throw policy', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      const seen: string[] = [];
      hooks.on('after', '*', (e) => {
        seen.push(e.node.type);
        throw new Error('hook boom');
      });

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      expect(() => hooks.unwind(new Error('boom'), state)).not.toThrow();

      expect(seen).toEqual(['Identifier', 'BinaryExpression']);
      expect(state.hookErrors).toHaveLength(2);
    });

    it('should balance every before with exactly one after across dispatch and unwind', () => {
      const hooks = new EvalHooks();
      let depth = 0;
      hooks.on('before', '*', () => depth++);
      hooks.on('after', '*', () => depth--);

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.dispatch('after', identifier, state, 'a');
      hooks.unwind(new Error('boom'), state);

      expect(depth).toBe(0);
    });
  });

  describe('depth and unwindTo', () => {

    it('should report zero open nodes on a fresh state', () => {
      const hooks = new EvalHooks();

      expect(hooks.depth(state)).toBe(0);
    });

    it('should count the nodes opened but not yet closed', () => {
      const hooks = new EvalHooks();

      hooks.dispatch('before', binary, state);
      expect(hooks.depth(state)).toBe(1);

      hooks.dispatch('before', identifier, state);
      expect(hooks.depth(state)).toBe(2);

      hooks.dispatch('after', identifier, state, 'a');
      expect(hooks.depth(state)).toBe(1);
    });

    it('should unwind only the nodes opened above the mark', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      const mark = hooks.depth(state);
      hooks.dispatch('before', identifier, state);

      hooks.unwindTo(mark, new Error('boom'), state);

      expect(events.map((e) => e.node.type)).toEqual(['Identifier']);
      expect(hooks.depth(state)).toBe(mark);
    });

    it('should leave the marked nodes open for their own after dispatch', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      const mark = hooks.depth(state);
      hooks.dispatch('before', identifier, state);
      hooks.unwindTo(mark, new Error('boom'), state);
      hooks.dispatch('after', binary, state, 3);

      expect(events.map((e) => e.node.type)).toEqual(['Identifier', 'BinaryExpression']);
      expect(events.map((e) => e.completed)).toEqual([false, true]);
      expect(hooks.depth(state)).toBe(0);
    });

    it('should be idempotent at a mark', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.unwindTo(1, new Error('boom'), state);
      hooks.unwindTo(1, new Error('boom'), state);

      expect(events).toHaveLength(1);
    });

    it('should treat unwind as unwindTo zero', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.unwind(new Error('boom'), state);

      expect(events).toHaveLength(2);
      expect(hooks.depth(state)).toBe(0);
    });

    it('should do nothing when the mark is at or above the current depth', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.unwindTo(5, new Error('boom'), state);

      expect(events).toEqual([]);
      expect(hooks.depth(state)).toBe(1);
    });

    it('should emit nothing when the depth is already back at the mark', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      const mark = hooks.depth(state);
      hooks.dispatch('before', binary, state);
      hooks.dispatch('after', binary, state, 3);
      events.length = 0;

      hooks.unwindTo(mark, new Error('boom'), state);

      expect(events).toEqual([]);
      expect(hooks.depth(state)).toBe(mark);
    });

    it('should leave the outer frame untouched when a nested drain unwinds to its own mark', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      // Outer walk opens one node, then a nested walk opens two of its own.
      hooks.dispatch('before', binary, state);
      const nestedMark = hooks.depth(state);
      hooks.dispatch('before', identifier, state);
      hooks.dispatch('before', member, state);

      hooks.unwindTo(nestedMark, new Error('boom'), state);

      expect(events.map((e) => e.node.type)).toEqual(['MemberExpression', 'Identifier']);
      expect(events.every((e) => e.completed === false)).toBe(true);
      expect(hooks.depth(state)).toBe(nestedMark);

      // The outer frame is still open and still closes normally.
      events.length = 0;
      hooks.dispatch('after', binary, state, 3);

      expect(events.map((e) => e.node.type)).toEqual(['BinaryExpression']);
      expect(events[0].completed).toBe(true);
      expect(hooks.depth(state)).toBe(0);
    });
  });

  describe('identity-checked exit', () => {

    it('should pop the node when it is already on top', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('after', binary, state, 3);

      expect(events.map((e) => e.node.type)).toEqual(['BinaryExpression']);
      expect(events[0].completed).toBe(true);
      expect(hooks.depth(state)).toBe(0);
    });

    it('should flush the frames above a node before popping it', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      // A visitor that swallowed its child's throw leaves the child open.
      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.dispatch('before', member, state);

      hooks.dispatch('after', binary, state, 3);

      expect(events.map((e) => e.node.type))
        .toEqual(['MemberExpression', 'Identifier', 'BinaryExpression']);
      expect(events.map((e) => e.completed)).toEqual([false, false, true]);
      expect(hooks.depth(state)).toBe(0);
    });

    it('should synthesise the flushed events without a value or an error', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      hooks.dispatch('after', binary, state, 3);

      const flushed = events.filter((e) => e.completed === false);
      expect(flushed).toHaveLength(1);
      expect(flushed[0].value).toBeUndefined();
      expect(flushed[0].error).toBeUndefined();
      expect('error' in flushed[0]).toBe(false);
    });

    it('should pop nothing when the node is not on the stack', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      // `member` was never entered - closing it must not drain the stack.
      hooks.dispatch('after', member, state, 'x');

      expect(events.map((e) => e.node.type)).toEqual(['MemberExpression']);
      expect(events[0].completed).toBe(true);
      expect(hooks.depth(state)).toBe(2);
      expect(state.hookBookkeeping.open.map((n) => n.type))
        .toEqual(['BinaryExpression', 'Identifier']);
    });

    it('should leave an empty stack empty when an unknown node is closed', () => {
      const hooks = new EvalHooks();
      hooks.on('after', '*', () => undefined);

      hooks.dispatch('after', binary, state, 3);

      expect(hooks.depth(state)).toBe(0);
    });
  });

  /**
   * The walk-base bound, and the three cases the Phase 2 plan § 3.3 specifies.
   *
   * `evaluate` is re-entered with the same state from an arrow-function body,
   * so a nested walk shares the open-node stack with the walk that started it.
   * Without a bound, a nested walk closing a node it never opened reaches down
   * into the enclosing walk's frames - measured once as a drain from depth 3 to
   * 0 past a mark of 2, emitting two `completed: false` events a consumer reads
   * as ordinary completions, and leaving that walk's own `unwindTo(mark)` with
   * nothing left to unwind.
   *
   * These drive `EvalHooks` directly, standing in for `evaluate`'s entry
   * bookkeeping with `pushWalkBase`, because the sequence needs a nested walk
   * to close a node the enclosing walk opened - which no visitor in this
   * library produces today, and which is why the residual survived Phase 1 as a
   * design note rather than a failing test.
   */
  describe('the walk base bound', () => {

    it('should not flush the enclosing walk frames when a nested walk closes its node', () => {
      // Case 1: the node is open, but below this walk's base - the scan route.
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      // The enclosing walk opens two nodes.
      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      // A nested walk starts here and opens one of its own.
      const mark = hooks.pushWalkBase(state);
      hooks.dispatch('before', member, state);

      expect(mark).toBe(2);
      expect(hooks.depth(state)).toBe(3);

      // The nested walk closes a node belonging to the enclosing walk.
      hooks.dispatch('after', binary, state, 3);

      expect(events.filter((e) => e.completed === false)).toEqual([]);
      expect(hooks.depth(state)).toBe(3);

      // So the nested walk's own unwind still has its frame to close, and the
      // enclosing walk's two frames survive it.
      hooks.unwindTo(mark, new Error('boom'), state);
      hooks.popWalkBase(state);

      expect(hooks.depth(state)).toBe(mark);
      expect(state.hookBookkeeping.open.map((n) => n.type))
        .toEqual(['BinaryExpression', 'Identifier']);
    });

    it('should not pop the enclosing walk node when the nested walk has opened nothing', () => {
      // Case 2: the identity fast path. The node *is* on top, because the
      // nested walk has opened nothing yet - so bounding only the scan leaves
      // the boundary crossable by the cheap route, and case 1's sequence does
      // not catch it because it opens a third node first.
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);

      const mark = hooks.pushWalkBase(state);

      expect(hooks.depth(state)).toBe(mark);

      hooks.dispatch('after', binary, state, 3);

      expect(events.filter((e) => e.completed === false)).toEqual([]);
      expect(hooks.depth(state)).toBe(mark);
      expect(state.hookBookkeeping.open.map((n) => n.type))
        .toEqual(['BinaryExpression']);
    });

    it('should still be a no-op for a node that was never opened', () => {
      // Case 3, the control: this passes with or without the bound, and it is
      // here to catch a bound implemented as "never pop" rather than "act
      // within this walk".
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.pushWalkBase(state);

      hooks.dispatch('after', member, state, 'x');

      expect(events.filter((e) => e.completed === false)).toEqual([]);
      expect(hooks.depth(state)).toBe(1);
    });

    it('should still flush frames a nested walk left open above its own base', () => {
      // The other half of "act within this walk": inside the nested walk the
      // flush is unchanged, so the bound cannot have been implemented by
      // disabling case 2.
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.pushWalkBase(state);

      hooks.dispatch('before', identifier, state);
      hooks.dispatch('before', member, state);
      hooks.dispatch('after', identifier, state, 1);

      expect(events.map((e) => e.node.type))
        .toEqual(['MemberExpression', 'Identifier']);
      expect(events.map((e) => e.completed)).toEqual([false, true]);
      expect(hooks.depth(state)).toBe(1);
    });

    it('should fall back to unbounded behaviour when no walk base was pushed', () => {
      // A walk that began before any hook existed pushes no base, since the
      // push is guarded on `hasHooks`. Base 0 is then the honest answer, and it
      // is exactly the behaviour that shipped before the bound.
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);

      hooks.dispatch('after', binary, state, 3);

      expect(events.map((e) => e.completed)).toEqual([false, true]);
      expect(hooks.depth(state)).toBe(0);
    });

    it('should restore the enclosing bound when a nested walk base is popped', () => {
      const hooks = new EvalHooks();

      hooks.dispatch('before', binary, state);
      hooks.pushWalkBase(state);
      hooks.dispatch('before', identifier, state);
      hooks.pushWalkBase(state);

      expect(hooks.walkBase(state)).toBe(2);

      hooks.popWalkBase(state);

      expect(hooks.walkBase(state)).toBe(1);

      hooks.popWalkBase(state);

      expect(hooks.walkBase(state)).toBe(0);
    });
  });

  describe('bookkeeping ordering', () => {

    it('should open the node before running before hooks, so a throwing hook cannot omit it', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => hooks.dispatch('before', binary, state)).toThrow('boom');
      expect(hooks.depth(state)).toBe(1);
    });

    it('should unwind a node whose before hook threw under the throw policy', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      const events: EvalNodeHookEvent[] = [];
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });
      hooks.on('after', '*', (e) => events.push(e));

      const mark = hooks.depth(state);
      expect(() => hooks.dispatch('before', binary, state)).toThrow('boom');
      hooks.unwindTo(mark, new Error('boom'), state);

      expect(events).toHaveLength(1);
      expect(events[0].node.type).toBe('BinaryExpression');
      expect(events[0].completed).toBe(false);
      expect(hooks.depth(state)).toBe(mark);
    });

    it('should close the node before running after hooks, so a throwing hook cannot corrupt the stack', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      hooks.on('after', '*', () => {
        throw new Error('boom');
      });

      hooks.dispatch('before', binary, state);
      expect(() => hooks.dispatch('after', binary, state, 3)).toThrow('boom');
      expect(hooks.depth(state)).toBe(0);
    });
  });

  describe('per-state isolation', () => {

    it('should keep the open-node stacks of two states separate', () => {
      const hooks = new EvalHooks();
      const other = EvalState.fromContext({}, {});
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, other);
      hooks.unwind(new Error('boom'), other);

      expect(events.map((e) => e.node.type)).toEqual(['Identifier']);
      expect(events.map((e) => e.state)).toEqual([other]);
      expect(hooks.depth(other)).toBe(0);
      expect(hooks.depth(state)).toBe(1);
    });

    it('should keep the collected errors of two states separate', () => {
      const hooks = new EvalHooks();
      const other = EvalState.fromContext({}, {});
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      hooks.dispatch('before', binary, state);

      expect(state.hookErrors).toHaveLength(1);
      expect(other.hookErrors).toHaveLength(0);
    });
  });

  describe('read hooks', () => {

    const target = { a: 1 };

    /**
     * A read event with sensible defaults; `identifier` and `state` are read at
     * call time so the per-test instances from `beforeEach` are the ones used.
     */
    const readEvent = (over: Partial<EvalReadEvent> = {}): EvalReadEvent => ({
      kind: 'identifier',
      node: identifier,
      state,
      key: 'a',
      target,
      value: 1,
      ...over
    });

    describe('registration', () => {

      it('should fire a registered read hook with the event', () => {
        const hooks = new EvalHooks();
        const seen: EvalReadEvent[] = [];
        hooks.onRead((e) => seen.push(e));
        const event = readEvent();

        hooks.dispatchRead(event);

        expect(seen).toEqual([event]);
      });

      it('should fire every registered read hook in registration order', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        hooks.onRead(() => seen.push(1));
        hooks.onRead(() => seen.push(2));

        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([1, 2]);
      });

      it('should carry the member fields through untouched', () => {
        const hooks = new EvalHooks();
        const seen: EvalReadEvent[] = [];
        hooks.onRead((e) => seen.push(e));

        hooks.dispatchRead(readEvent({
          kind: 'member',
          node: member,
          key: 'b',
          path: 'a.b',
          value: 2
        }));

        expect(seen[0].kind).toBe('member');
        expect(seen[0].key).toBe('b');
        expect(seen[0].path).toBe('a.b');
        expect(seen[0].value).toBe(2);
        expect(seen[0].target).toBe(target);
        expect(seen[0].state).toBe(state);
      });

      it('should not fire node hooks on a read dispatch', () => {
        const hooks = new EvalHooks();
        const nodeEvents: EvalNodeHookEvent[] = [];
        hooks.on('before', '*', (e) => nodeEvents.push(e));
        hooks.on('after', '*', (e) => nodeEvents.push(e));
        hooks.onRead(() => undefined);

        hooks.dispatchRead(readEvent());

        expect(nodeEvents).toEqual([]);
      });

      it('should not fire read hooks on a node dispatch', () => {
        const hooks = new EvalHooks();
        const seen: EvalReadEvent[] = [];
        hooks.onRead((e) => seen.push(e));

        hooks.dispatch('before', binary, state);
        hooks.dispatch('after', binary, state, 3);

        expect(seen).toEqual([]);
      });

      it('should leave the open-node stack alone on a read dispatch', () => {
        const hooks = new EvalHooks();
        hooks.onRead(() => undefined);

        hooks.dispatchRead(readEvent());

        expect(hooks.depth(state)).toBe(0);
      });

      it('should let a read hook unregister itself mid-dispatch without skipping the next', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        const off = hooks.onRead(() => {
          seen.push(1);
          off();
        });
        hooks.onRead(() => seen.push(2));

        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([1, 2]);
      });
    });

    describe('unsubscribe, offRead and clear', () => {

      it('should stop firing a read hook after its unsubscribe is called', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        const off = hooks.onRead(() => seen.push(1));

        hooks.dispatchRead(readEvent());
        off();
        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([1]);
      });

      it('should treat a repeated read unsubscribe as a no-op', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        // Registered twice, so a missing guard would consume the second
        // registration on the repeated call rather than doing nothing.
        const hook = () => seen.push(1);
        const off = hooks.onRead(hook);
        hooks.onRead(hook);

        off();
        off();
        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([1]);
        expect(hooks.isEmpty).toBe(false);
      });

      it('should remove a single hook via offRead', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        const first = () => seen.push(1);
        hooks.onRead(first);
        hooks.onRead(() => seen.push(2));

        hooks.offRead(first);
        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([2]);
      });

      it('should remove every read hook when offRead is called without a hook', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        hooks.onRead(() => seen.push(1));
        hooks.onRead(() => seen.push(2));

        hooks.offRead();
        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([]);
        expect(hooks.isEmpty).toBe(true);
      });

      it('should ignore offRead for a hook that was never registered', () => {
        const hooks = new EvalHooks();
        hooks.onRead(() => undefined);

        expect(() => hooks.offRead(() => undefined)).not.toThrow();
        expect(hooks.isEmpty).toBe(false);
      });

      it('should remove read hooks on clear', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        hooks.onRead(() => seen.push(1));

        hooks.clear();
        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([]);
        expect(hooks.isEmpty).toBe(true);
        expect(hooks.isActive).toBe(false);
      });
    });

    describe('isEmpty and the isActive latch', () => {

      it('should count a read hook towards isEmpty', () => {
        const hooks = new EvalHooks();

        expect(hooks.isEmpty).toBe(true);
        const off = hooks.onRead(() => undefined);
        expect(hooks.isEmpty).toBe(false);

        off();
        expect(hooks.isEmpty).toBe(true);
      });

      it('should latch isActive on the first read registration', () => {
        const hooks = new EvalHooks();

        expect(hooks.isActive).toBe(false);
        hooks.onRead(() => undefined);

        expect(hooks.isActive).toBe(true);
      });

      it('should keep isActive latched after the last read hook is removed', () => {
        const hooks = new EvalHooks();
        const off = hooks.onRead(() => undefined);

        off();

        expect(hooks.isEmpty).toBe(true);
        expect(hooks.isActive).toBe(true);
      });
    });

    describe('error policy', () => {

      it('should collect a read hook error by default and keep dispatching', () => {
        const hooks = new EvalHooks();
        const boom = new Error('boom');
        const seen: number[] = [];
        hooks.onRead(() => {
          throw boom;
        });
        hooks.onRead(() => seen.push(1));

        expect(() => hooks.dispatchRead(readEvent())).not.toThrow();

        expect(seen).toEqual([1]);
        expect(state.hookErrors).toHaveLength(1);
        expect(state.hookErrors[0].phase).toBe('read');
        expect(state.hookErrors[0].nodeType).toBe('Identifier');
        expect(state.hookErrors[0].error).toBe(boom);
      });

      it('should record the node type of the read that failed', () => {
        const hooks = new EvalHooks();
        hooks.onRead(() => {
          throw new Error('boom');
        });

        hooks.dispatchRead(readEvent({ kind: 'member', node: member }));

        expect(state.hookErrors[0].phase).toBe('read');
        expect(state.hookErrors[0].nodeType).toBe('MemberExpression');
      });

      it('should rethrow a read hook error under the throw policy', () => {
        const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
        hooks.onRead(() => {
          throw new Error('boom');
        });

        expect(() => hooks.dispatchRead(readEvent())).toThrow('boom');
        expect(state.hookErrors).toHaveLength(0);
      });

      it('should swallow a read hook error under the ignore policy', () => {
        const hooks = new EvalHooks({ onHookError: 'ignore' } as EvalOptions);
        const seen: number[] = [];
        hooks.onRead(() => {
          throw new Error('boom');
        });
        hooks.onRead(() => seen.push(1));

        expect(() => hooks.dispatchRead(readEvent())).not.toThrow();

        expect(seen).toEqual([1]);
        expect(state.hookErrors).toHaveLength(0);
      });

      it('should record the errors of two states separately', () => {
        const hooks = new EvalHooks();
        const other = EvalState.fromContext({}, {});
        hooks.onRead(() => {
          throw new Error('boom');
        });

        hooks.dispatchRead(readEvent());

        expect(state.hookErrors).toHaveLength(1);
        expect(other.hookErrors).toHaveLength(0);
      });
    });

    describe('promise-returning read hooks', () => {

      it('should record a returned promise as an error rather than awaiting it', () => {
        const hooks = new EvalHooks();
        hooks.onRead(() => Promise.resolve('ignored'));

        hooks.dispatchRead(readEvent());

        expect(state.hookErrors).toHaveLength(1);
        expect(state.hookErrors[0].phase).toBe('read');
        expect((state.hookErrors[0].error as Error).message).toContain('will not be awaited');
      });

      it('should keep dispatching the remaining read hooks after a returned promise', () => {
        const hooks = new EvalHooks();
        const seen: number[] = [];
        hooks.onRead(() => Promise.resolve());
        hooks.onRead(() => seen.push(1));

        hooks.dispatchRead(readEvent());

        expect(seen).toEqual([1]);
      });

      it('should throw on a returned promise under the throw policy', () => {
        const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
        hooks.onRead(() => Promise.resolve());

        expect(() => hooks.dispatchRead(readEvent())).toThrow('will not be awaited');
      });
    });
  });
});
