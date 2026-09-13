import { AnyNode, Program } from 'acorn';
import { Registry } from '../classes/common';
import { EMPTY_COMPLETION, EvalContext, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * Parses to the whole `Program`, the way `EvalService` does - its parser options
 * leave `extractExpressions` off, so `evaluate` is handed the program node.
 */
const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

/**
 * Evaluates against an `EvalContext` the caller owns.
 *
 * `EvalState.fromContext` routes through `EvalContext.fromContext`, which
 * short-circuits on identity, so every call here walks on the **same** context
 * instance. That is what these specs need: the scope stack lives on
 * `EvalContext`, not on the per-walk `EvalState`, so a scope this visitor failed
 * to pop is invisible to a fixture that builds its context inline and only
 * shows up on the next evaluation to reuse the context.
 */
const runOn = (source: string, context: EvalContext): unknown =>
  evaluate(programOf(source), EvalState.fromContext(context, {}));

const contextOf = (): EvalContext => EvalContext.fromContext({
  a: 'A',
  b: 'B',
  boom: () => { throw new Error('boom'); },
});

describe('programVisitor', () => {

  describe('completion value', () => {

    it('should push exactly one value however many statements ran', () => {
      const state = EvalState.fromContext({ a: 'A', b: 'B' }, {});

      expect(evaluate(programOf('a; b; 1 + 2'), state)).toBe(3);

      // `evaluate` pops one; anything left is a value the walk pushed and
      // nothing popped. This is the assertion § 1.1's stranded column is
      // about, and the reason it is not enough to assert the value: `1; 2; 3`
      // returned 3 before this visitor existed, with two values stranded.
      expect(state.result.stack.length).toBe(0);
    });

    it('should keep the last non-empty value', () => {
      const context = contextOf();

      expect(runOn('a; ;', context)).toBe('A');
    });

    it('should prefer a statement that produced undefined over an earlier value', () => {
      // The case that separates the sentinel from `undefined`, and the plan
      // assigns it to the block visitor - but a program is a statement list
      // too, so it is reachable here a step early. `noop()` genuinely produced
      // `undefined` and must win over `'A'`; an implementation using
      // `undefined` as the empty marker returns `'A'` and passes every other
      // assertion in this file.
      const context = EvalContext.fromContext({ a: 'A', noop: () => undefined });

      expect(runOn('a; noop()', context)).toBeUndefined();
    });

    it('should convert its own empty completion at the walk boundary', () => {
      const context = contextOf();

      expect(runOn(';', context)).toBeUndefined();
      expect(runOn(';', context)).not.toBe(EMPTY_COMPLETION);
    });
  });

  describe('the statement dispatcher', () => {

    it('should throw naming the node type it does not implement', () => {
      const context = contextOf();

      expect(() => runOn('while (false) { 1 }', context))
        .toThrow('Unsupported statement type: WhileStatement');
    });

    it('should throw rather than let the base walker strand a value', () => {
      // The pre-Phase-2 behaviour: `acorn-walk`'s base walker visited the
      // subtree as an expression, `1` was pushed and stranded, and `evaluate`
      // popped it as the program's value. A dispatcher that fell through
      // silently would return 1 here instead of throwing.
      const state = EvalState.fromContext({}, {});

      expect(() => evaluate(programOf('while (false) { 1 }'), state)).toThrow();
      expect(state.result.value).not.toBe(1);
    });
  });

  describe('scope discipline on a reused context', () => {

    it('should push exactly one scope while the body runs', () => {
      const context = EvalContext.fromContext({
        depth: () => context.scopes.length,
      });

      expect(runOn('depth()', context)).toBe(1);
    });

    it('should pop the program scope it pushed', () => {
      const context = contextOf();

      expect(runOn('a', context)).toBe('A');
      expect(context.scopes.length).toBe(0);
    });

    it('should pop the program scope when a statement throws', () => {
      const context = contextOf();

      expect(() => runOn('boom()', context)).toThrow('boom');

      expect(context.scopes.length).toBe(0);
    });

    it('should pop the program scope when the dispatcher rejects a statement', () => {
      // The dispatcher throws from *inside* the try, which is the exit path a
      // `try`/`finally` is here for and the one no other visitor has.
      const context = contextOf();

      expect(() => runOn('a; while (false) { 1 }', context))
        .toThrow('Unsupported statement type: WhileStatement');

      expect(context.scopes.length).toBe(0);
    });

    it('should leave no residue after repeated throws', () => {
      const context = contextOf();

      for (let i = 0; i < 3; i++) {
        expect(() => runOn('boom()', context)).toThrow('boom');
      }

      expect(context.scopes.length).toBe(0);
      expect(runOn('a', context)).toBe('A');
    });

    it('should not shadow a source key on a later evaluation against the same context', () => {
      const context = contextOf();

      expect(() => runOn('boom()', context)).toThrow('boom');

      expect(runOn('a', context)).toBe('A');
      expect(runOn('b', context)).toBe('B');
    });

    it('should resolve outer keys through the empty program scope', () => {
      // `get` searches `scopes` first and falls through on a miss, which is
      // what makes an empty program scope free of consequence for resolution.
      const context = contextOf();

      expect(runOn('a', context)).toBe('A');
    });

    it('should not resolve Object.prototype names out of the empty program scope', () => {
      // The assertion the case above cannot make. `a` is a key the scope does
      // not shadow, so it passes whatever the scope answers for names it was
      // never given - and a plain `{}` answers for every prototype member,
      // because `getContextValue` reads a record as `scope[key]`. An empty
      // scope is empty as a binding surface and not as a lookup surface.
      //
      // A `Registry` original is what makes this discriminating: it resolves
      // none of these itself, so anything that comes back came from the scope.
      const context = EvalContext.fromContext(Registry.fromObject({ a: 'A' }));

      for (const name of ['toString', 'constructor', 'valueOf', 'hasOwnProperty']) {
        expect(runOn(name, context)).toBeUndefined();
      }

      expect(runOn('a', context)).toBe('A');
    });

    it('should not let the program scope shadow a lookup resolver', () => {
      // Scopes are step 1 of the resolution order and lookups are step 4, so a
      // scope that answers for a prototype name wins over a resolver the
      // caller installed for it.
      const context = EvalContext.fromContext(Registry.fromObject({ a: 'A' }));
      context.lookups.push((key: unknown) => (key === 'toString' ? 'FROM-LOOKUP' : undefined));

      expect(runOn('toString', context)).toBe('FROM-LOOKUP');
    });

    it('should resolve the same way under caseInsensitive', () => {
      // `fromContext` copies a plain record into a Map-backed `Registry` when
      // `caseInsensitive` is set, so the prototype names leaked on the
      // case-sensitive path only. Both shapes now ask the same own-key
      // question, and this is the arm that was already green.
      const context = EvalContext.fromContext(Registry.fromObject({ a: 'A' }), { caseInsensitive: true });
      const state = EvalState.fromContext(context, { caseInsensitive: true });

      expect(evaluate(programOf('toString'), state)).toBeUndefined();
    });
  });

  describe('nesting', () => {

    it('should not carry a program scope into an unrelated later evaluation', () => {
      const context = contextOf();

      expect(runOn('a', context)).toBe('A');
      expect(context.scopes.length).toBe(0);
      expect(runOn('b', context)).toBe('B');
      expect(context.scopes.length).toBe(0);
    });

    it('should keep the scope balanced when an arrow body re-enters evaluate', () => {
      // `arrow-function-expression.ts` calls `evaluate` on the same state from
      // inside the closure, so this walk runs a nested walk that pushes a scope
      // of its own. Both pops have to happen.
      const context = contextOf();

      expect(runOn('(x => x + 1)(1)', context)).toBe(2);
      expect(context.scopes.length).toBe(0);
    });
  });

  describe('the walk boundary', () => {

    it('should restore the walk depth after a successful walk', () => {
      const state = EvalState.fromContext({ a: 'A' }, {});

      evaluate(programOf('a'), state);

      expect(state.walkDepth).toBe(0);
    });

    it('should restore the walk depth after a failed walk', () => {
      const state = EvalState.fromContext(contextOf(), {});

      expect(() => evaluate(programOf('boom()'), state)).toThrow('boom');

      expect(state.walkDepth).toBe(0);
    });

    it('should push a walk base per evaluate entry when hooks are registered', () => {
      // The other specs drive `EvalHooks` directly, so nothing else asserts that
      // `evaluate` pushes a base at all - and an implementation that pushed none
      // leaves every one of them green. The push is guarded on `hasHooks`, so
      // this fixture has to register one.
      const seen: number[][] = [];
      const state = EvalState.fromContext({
        bases: () => { seen.push(state.hookBookkeeping.walkBases.slice()); return 0; },
      }, {});
      state.hooks.on('after', 'Program', () => undefined);

      // The arrow body re-enters `evaluate` on this state, so the inner walk
      // pushes a second base at the depth the outer walk had open.
      evaluate(programOf('(x => bases())(1)'), state);

      expect(seen).toHaveLength(1);
      expect(seen[0]).toHaveLength(2);
      expect(seen[0][0]).toBe(0);
      expect(seen[0][1]).toBeGreaterThan(0);
      expect(state.hookBookkeeping.walkBases).toEqual([]);
    });

    it('should count a nested walk while it runs', () => {
      const seen: number[] = [];
      const state = EvalState.fromContext({
        depth: () => { seen.push(state.walkDepth); return 0; },
      }, {});

      // The outer walk is depth 1; the arrow body re-enters `evaluate` on the
      // same state, so the call inside it sees 2.
      evaluate(programOf('(x => depth())(1)'), state);

      expect(seen).toEqual([2]);
      expect(state.walkDepth).toBe(0);
    });
  });

  describe('hooks', () => {

    it('should report the program node to an after hook', () => {
      const state = EvalState.fromContext({ a: 'A' }, {});
      const seen: [string, unknown][] = [];
      state.hooks.on('after', '*', (e) => seen.push([e.node.type, e.value]));

      evaluate(programOf('a'), state);

      expect(seen).toEqual([
        ['Identifier', 'A'],
        ['ExpressionStatement', 'A'],
        ['Program', 'A'],
      ]);
    });

    it('should report the sentinel to an after hook for an empty program', () => {
      // The value is read positionally off the result stack, so a statement
      // that produced nothing reports the sentinel itself. That is why it is
      // exported: a consumer recognises it by identity.
      const state = EvalState.fromContext({}, {});
      const seen: unknown[] = [];
      state.hooks.on('after', 'Program', (e) => seen.push(e.value));

      expect(evaluate(programOf(' '), state)).toBeUndefined();

      expect(seen).toEqual([EMPTY_COMPLETION]);
    });

    it('should leave no node open after a walk whose statement threw', () => {
      const state = EvalState.fromContext(contextOf(), {});
      state.hooks.on('after', '*', () => undefined);

      expect(() => evaluate(programOf('boom()'), state)).toThrow('boom');

      expect(state.hookBookkeeping.open).toEqual([]);
      expect(state.hookBookkeeping.walkBases).toEqual([]);
    });
  });

  describe('trace', () => {

    it('should record one trace entry per statement node', () => {
      const state = EvalState.fromContext({ a: 'A' }, {});

      evaluate(programOf('a'), state);

      expect(state.result.trace.map((item) => item.type))
        .toEqual(['Identifier', 'ExpressionStatement', 'Program']);
    });
  });
});

/**
 * The program node is reachable only through `parse` here, so this guards the
 * fixture rather than the visitor: a source that stopped parsing to a `Program`
 * would make every assertion above vacuous.
 */
describe('programOf', () => {

  it('should parse to a program node', () => {
    expect((programOf('a') as Program).type).toBe('Program');
  });
});
