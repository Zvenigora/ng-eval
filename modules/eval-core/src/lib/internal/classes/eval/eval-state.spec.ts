import { AnyNode, ExpressionStatement, parse } from 'acorn';
import { EvalContext } from './eval-context';
import { EvalResult } from './eval-result';
import { EvalState } from './eval-state';
import { EvalHooks } from './eval-hooks';
import { EvalOptions } from './eval-options'; // Add missing import
import { Registry } from '../common';
import { TestBed } from '@angular/core/testing';
import { EvalService } from '../../../actual/services/eval.service';

/**
 * Parses a single expression and returns its root node.
 */
const nodeOf = (source: string): AnyNode => {
  const program = parse(source, { ecmaVersion: 'latest' });
  const statement = program.body[0] as ExpressionStatement;
  return statement.expression;
};

describe('EvalState', () => {
  let original: Registry<unknown, unknown>;
  let options: EvalOptions;
  let context: EvalContext;
  let result: EvalResult;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    original = new Registry<unknown, unknown>();
    options = {} as EvalOptions;
    context = new EvalContext(original, options);
    result = new EvalResult(context);
  });

  it('should create an instance', () => {

    const evalState = new EvalState(context, result, options);
    expect(evalState).toBeTruthy();
  });

  describe('hooks', () => {

    it('should report no hooks on a fresh state', () => {
      const state = new EvalState(context, result, options);

      expect(state.hasHooks).toBe(false);
      expect(state.hookErrors).toEqual([]);
    });

    it('should create the hooks registry lazily on first access', () => {
      const state = new EvalState(context, result, options);

      const hooks = state.hooks;

      expect(hooks).toBeInstanceOf(EvalHooks);
      expect(state.hooks).toBe(hooks);
    });

    it('should still report no hooks after the registry is merely touched', () => {
      const state = new EvalState(context, result, options);

      expect(state.hooks.isEmpty).toBe(true);
      expect(state.hasHooks).toBe(false);
    });

    it('should report hooks once one is registered', () => {
      const state = new EvalState(context, result, options);

      state.hooks.on('before', '*', () => undefined);

      expect(state.hasHooks).toBe(true);
    });

    it('should keep reporting hooks after the last one is removed', () => {
      const state = new EvalState(context, result, options);
      const unsubscribe = state.hooks.on('before', '*', () => undefined);

      unsubscribe();

      // the latch of § 3.6: the guard must not change value mid-walk
      expect(state.hooks.isEmpty).toBe(true);
      expect(state.hasHooks).toBe(true);
    });

    it('should apply the onHookError policy from the options', () => {
      const state = EvalState.fromContext({}, { onHookError: 'throw' } as EvalOptions);
      state.hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => state.hooks.dispatch('before', nodeOf('a'), state)).toThrow('boom');
    });

    it('should collect hook errors onto the state', () => {
      const state = new EvalState(context, result, options);
      state.hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      state.hooks.dispatch('before', nodeOf('a'), state);

      expect(state.hookErrors).toHaveLength(1);
      expect(state.hookErrors[0].nodeType).toBe('Identifier');
    });
  });

  describe('hooks adopted from options', () => {

    it('should adopt an EvalHooks passed in the options', () => {
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => undefined);

      const state = EvalState.fromContext({}, { hooks } as EvalOptions);

      expect(state.hooks).toBe(hooks);
      expect(state.hasHooks).toBe(true);
    });

    it('should adopt by reference rather than cloning', () => {
      const hooks = new EvalHooks();
      const state = EvalState.fromContext({}, { hooks } as EvalOptions);
      const seen: string[] = [];

      // registered on the caller's object *after* the state was built
      hooks.on('before', '*', (e) => seen.push(e.node.type));
      state.hooks.dispatch('before', nodeOf('a'), state);

      expect(seen).toEqual(['Identifier']);
    });

    it('should honour the unsubscribe closure the caller already holds', () => {
      const hooks = new EvalHooks();
      const seen: string[] = [];
      const unsubscribe = hooks.on('before', '*', (e) => seen.push(e.node.type));

      const state = EvalState.fromContext({}, { hooks } as EvalOptions);
      unsubscribe();
      state.hooks.dispatch('before', nodeOf('a'), state);

      expect(seen).toEqual([]);
    });

    it('should ignore a non-EvalHooks value in options.hooks', () => {
      const state = EvalState.fromContext({}, { hooks: { on: () => undefined } } as EvalOptions);

      expect(state.hasHooks).toBe(false);
      expect(state.hooks).toBeInstanceOf(EvalHooks);
    });

    it('should keep the adopted registry own error policy, ignoring options.onHookError', () => {
      // documented limitation of § 3.6: an adopted EvalHooks carries the policy it
      // was constructed with, so a co-passed onHookError is silently ignored
      const hooks = new EvalHooks();
      const state = EvalState.fromContext({}, { hooks, onHookError: 'throw' } as EvalOptions);
      state.hooks.on('before', '*', () => {
        throw new Error('boom');
      });

      expect(() => state.hooks.dispatch('before', nodeOf('a'), state)).not.toThrow();
      expect(state.hookErrors).toHaveLength(1);
    });
  });

  describe('per-state isolation', () => {

    it('should not share bookkeeping between two states of the same service', () => {
      const service = TestBed.inject(EvalService);
      const hooks = new EvalHooks();
      hooks.on('before', '*', () => {
        throw new Error('boom');
      });
      const sharedOptions = { hooks } as EvalOptions;

      const first = service.createState({}, sharedOptions);
      const second = service.createState({}, sharedOptions);

      expect(first.hooks).toBe(hooks);
      expect(second.hooks).toBe(hooks);

      first.hooks.dispatch('before', nodeOf('a'), first);

      expect(first.hookErrors).toHaveLength(1);
      expect(second.hookErrors).toHaveLength(0);
      expect(hooks.depth(first)).toBe(1);
      expect(hooks.depth(second)).toBe(0);
    });
  });
});
