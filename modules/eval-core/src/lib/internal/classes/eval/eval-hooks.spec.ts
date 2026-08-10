import { AnyNode, ExpressionStatement, parse } from 'acorn';
import { EvalHooks, EvalNodeHookEvent } from './eval-hooks';
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
});
