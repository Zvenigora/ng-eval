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

  beforeEach(() => {
    state = EvalState.fromContext({}, {});
    binary = nodeOf('a + b');
    identifier = nodeOf('a');
  });

  it('should create an instance', () => {
    const hooks = new EvalHooks();

    expect(hooks).toBeTruthy();
    expect(hooks.isEmpty).toBe(true);
    expect(hooks.errors).toEqual([]);
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

      expect(hooks.errors).toHaveLength(1);
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
      expect(hooks.errors).toHaveLength(1);
      expect(hooks.errors[0].phase).toBe('before');
      expect(hooks.errors[0].nodeType).toBe('BinaryExpression');
      expect(hooks.errors[0].error).toBe(boom);
    });

    it('should collect by default when the policy is unrecognised', () => {
      const hooks = new EvalHooks({ onHookError: 'nonsense' } as EvalOptions);
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => hooks.dispatch('before', binary, state)).not.toThrow();
      expect(hooks.errors).toHaveLength(1);
    });

    it('should rethrow a hook error under the throw policy', () => {
      const hooks = new EvalHooks({ onHookError: 'throw' } as EvalOptions);
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => hooks.dispatch('before', binary, state)).toThrow('boom');
      expect(hooks.errors).toHaveLength(0);
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
      expect(hooks.errors).toHaveLength(0);
    });

    it('should record the after phase and node type of a failing hook', () => {
      const hooks = new EvalHooks();
      hooks.on('after', '*', () => {
        throw new Error('boom');
      });

      hooks.dispatch('after', identifier, state, 'a');

      expect(hooks.errors[0].phase).toBe('after');
      expect(hooks.errors[0].nodeType).toBe('Identifier');
    });
  });

  describe('promise-returning hooks', () => {

    it('should record a returned promise as an error rather than awaiting it', () => {
      const hooks = new EvalHooks();
      hooks.on('after', '*', () => Promise.resolve('ignored'));

      hooks.dispatch('after', identifier, state, 'a');

      expect(hooks.errors).toHaveLength(1);
      expect((hooks.errors[0].error as Error).message).toContain('will not be awaited');
      expect(hooks.errors[0].nodeType).toBe('Identifier');
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

      expect(hooks.errors).toHaveLength(0);
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
      hooks.unwind(boom);

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
      hooks.unwind(new Error('boom'));

      expect(events.map((e) => e.node.type)).toEqual(['Identifier', 'BinaryExpression']);
      expect(events.map((e) => e.completed)).toEqual([true, false]);
    });

    it('should do nothing when there is nothing open', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.unwind(new Error('boom'));

      expect(events).toEqual([]);
    });

    it('should be idempotent', () => {
      const hooks = new EvalHooks();
      const events: EvalNodeHookEvent[] = [];
      hooks.on('after', '*', (e) => events.push(e));

      hooks.dispatch('before', binary, state);
      hooks.unwind(new Error('boom'));
      hooks.unwind(new Error('boom'));

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

      expect(() => hooks.unwind(new Error('boom'))).not.toThrow();

      expect(seen).toEqual(['Identifier', 'BinaryExpression']);
      expect(hooks.errors).toHaveLength(2);

      // the throwing hook is still registered, so a stack that had not drained
      // would fire it again here
      hooks.unwind(new Error('boom'));

      expect(seen).toEqual(['Identifier', 'BinaryExpression']);
      expect(hooks.errors).toHaveLength(2);
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

      expect(() => hooks.unwind(new Error('boom'))).not.toThrow();

      expect(seen).toEqual(['Identifier', 'BinaryExpression']);
      expect(hooks.errors).toHaveLength(2);
    });

    it('should balance every before with exactly one after across dispatch and unwind', () => {
      const hooks = new EvalHooks();
      let depth = 0;
      hooks.on('before', '*', () => depth++);
      hooks.on('after', '*', () => depth--);

      hooks.dispatch('before', binary, state);
      hooks.dispatch('before', identifier, state);
      hooks.dispatch('after', identifier, state, 'a');
      hooks.unwind(new Error('boom'));

      expect(depth).toBe(0);
    });
  });
});
