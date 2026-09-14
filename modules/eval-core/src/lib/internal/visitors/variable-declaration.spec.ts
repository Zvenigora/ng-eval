import { AnyNode } from 'acorn';
import { Context } from '../classes/common';
import { EMPTY_COMPLETION, EvalContext, EvalOptions, EvalState } from '../classes/eval';
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
 * instance - which is what makes a scope left behind by one evaluation
 * observable to the next.
 */
const runOn = (source: string, context: EvalContext, options: EvalOptions = {}): unknown =>
  evaluate(programOf(source), EvalState.fromContext(context, options));

/**
 * The caller's own object, handed to `EvalContext` unwrapped and kept as a
 * reference so a spec can read it back afterwards.
 *
 * **This is the detector for the write redirection** (§ 1.4): `EvalContext.set`
 * writes `_original`, which is this object. A `let` that bound here rather than
 * in a scope, or an assignment that fell back to `set` when a scope bound the
 * key, shows up as a changed property on it.
 */
const sourceObject = () => ({ x: 'SOURCE', a: 'A', arr: [1, 2], o: { m: 7 } });

/**
 * A context carrying the two functions these specs read.
 *
 * `depth` reports `scopes.length` **at call time** and `grab` captures the
 * innermost scope object itself - the only way to read a scope after the walk
 * that pushed it has unwound, which the pollution cases need because the guard
 * throws and the `finally` pops before the throw reaches the spec.
 */
const contextOf = (extra: Record<string, unknown> = {}): EvalContext => {
  const context: EvalContext = EvalContext.fromContext({
    ...sourceObject(),
    ...extra,
    depth: () => context.scopes.length,
  });
  return context;
};

describe('variableDeclarationVisitor', () => {

  describe('binding and completion value', () => {

    it('should bind a let and resolve it in a later statement', () => {
      // § 1.1 measured `NaN`: the base walker stranded the initialiser and `x`
      // resolved to nothing.
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('let x = 1; x + 1'), state)).toBe(2);
      expect(state.result.stack.length).toBe(0);
    });

    it('should bind a const and resolve it', () => {
      // § 1.1 measured `undefined`.
      expect(evaluate(programOf('const y = 2; y'), EvalState.fromContext({}, {}))).toBe(2);
    });

    it('should produce nothing, so a declaration is not a completion value', () => {
      const state = EvalState.fromContext({}, {});

      const value = evaluate(programOf('let x = 1'), state);

      expect(value).toBeUndefined();
      expect(value).not.toBe(EMPTY_COMPLETION);
      expect(state.result.stack.length).toBe(0);
    });

    it('should keep an earlier value over a trailing declaration', () => {
      // The sentinel, not `undefined`: a declaration that pushed `undefined`
      // would win over `'a'` here and this would read undefined.
      expect(evaluate(programOf(`'a'; let x = 1`), EvalState.fromContext({}, {}))).toBe('a');
    });

    it('should bind every declarator in one declaration', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('let a = 1, b = 2; a + b'), state)).toBe(3);
      expect(state.result.stack.length).toBe(0);
    });

    it('should bind an uninitialised let as present, shadowing the source', () => {
      // § 1.5, and the one case that needs § 8.1's presence rule to have landed:
      // `let x;` binds `undefined`, and a value-based scope read would fall
      // through to the caller's `x` and answer 'SOURCE'.
      const context = contextOf();

      expect(runOn('let x; x', context)).toBeUndefined();
      expect(runOn('x', context)).toBe('SOURCE');
    });
  });

  describe('block scoping', () => {

    it('should not let a block binding outlive its block', () => {
      const context = contextOf();

      expect(runOn('{ let x = 1; x }', context)).toBe(1);
      expect(runOn('x', context)).toBe('SOURCE');
    });

    it('should shadow a source key for the life of the block only', () => {
      const context = contextOf();

      expect(runOn(`{ let a = 'INNER'; a }`, context)).toBe('INNER');
      expect(runOn('a', context)).toBe('A');
    });

    it('should let an inner block shadow an outer binding', () => {
      const state = EvalState.fromContext({}, {});

      expect(evaluate(programOf('let v = 1; { let v = 2; v }'), state)).toBe(2);
      expect(evaluate(programOf('let v = 1; { let v = 2 } v'), EvalState.fromContext({}, {}))).toBe(1);
    });

    it('should leave the scope stack balanced, including when a binding throws', () => {
      const context = contextOf();

      expect(runOn('{ let x = 1 }', context)).toBeUndefined();
      expect(context.scopes.length).toBe(0);

      expect(() => runOn('{ let __proto__ = 1 }', context)).toThrow();
      expect(context.scopes.length).toBe(0);
      expect(runOn('{ depth() }', context)).toBe(2);
    });
  });

  describe('scope-aware writes', () => {

    it('should write the binding and not the caller object', () => {
      const source = sourceObject();
      const context = EvalContext.fromContext(source);

      expect(runOn('let x = 1; x = 2; x', context)).toBe(2);
      expect(source.x).toBe('SOURCE');
    });

    it('should write an arrow parameter rather than the caller object', () => {
      // **§ 1.4's headline change.** Measured before this step: returned `99`
      // and left the caller's object holding `{ x: 99 }`.
      const source = sourceObject();
      const context = EvalContext.fromContext(source);

      expect(runOn('(x => (x = 99))(1)', context)).toBe(99);
      expect(source.x).toBe('SOURCE');
    });

    it('should update the binding and not the caller object', () => {
      // The `update-expression.ts` half of the same redirection - `i++` is what
      // step 5's loop counter runs through, so this is the write site that
      // matters there.
      const source = sourceObject();
      const context = EvalContext.fromContext(source);

      expect(runOn('let n = 1; n++; n', context)).toBe(2);
      expect(runOn('let m = 1; ++m', context)).toBe(2);
      expect(source).toEqual(sourceObject());
    });

    it('should still write the caller object when nothing binds the key', () => {
      // The fallback, from the other side: no scope binds `x`, so the write
      // reaches `set` and the caller's object changes. An implementation that
      // wrote the innermost scope unconditionally leaves 'SOURCE' here.
      const source = sourceObject();
      const context = EvalContext.fromContext(source);

      expect(runOn('x = 5; x', context)).toBe(5);
      expect(source.x).toBe(5);
    });
  });

  describe('the read-only policy a downstream library builds on', () => {

    /**
     * `eval-signals` enforces its read-only policy by overriding `set` to throw
     * (`signal-context.ts:112-117`), so every write that reaches the *source*
     * goes through the one method it overrides.
     *
     * An implementation that wrote the innermost scope unconditionally - or
     * created the binding when it was absent - routes the write around that
     * override and turns the policy off.
     *
     * **The plan said no downstream suite would catch that, and as of step 1 it
     * is wrong** (§ 3.2, corrected): the claim rested on `eval-signals`' write
     * cases running "with no scopes pushed at all", which stopped being true
     * when step 1 gave *every* evaluation a program-level scope. Measured by
     * inverting this implementation: `eval-signals` reddens 10 and `eval-forms`
     * 10, alongside 20 here.
     *
     * These cases stay, and the reason is not redundancy. They are in-library,
     * they name the mechanism, and they fail for a reason a reader of this file
     * can act on - where the downstream rows fail four files away from the
     * change, in a suite that is the *regression gate* for this step rather than
     * its detector. A gate that happens to catch something is not a substitute
     * for a test that was built to.
     */
    class ThrowingSetContext extends EvalContext {
      public override set(key: unknown): void {
        throw new Error(`Write to "${String(key)}" is not allowed.`);
      }
    }

    it('should reach set for a write no pushed scope binds', () => {
      const context = new ThrowingSetContext({ count: 1 } as Context, {});

      expect(() => runOn('{ count = 5 }', context))
        .toThrow('Write to "count" is not allowed.');
    });

    it('should reach set from inside an arrow body too', () => {
      // Three scopes deep - program, parameter, block - and none of them binds
      // `count`. Scope *presence* would route this away from `set`; binding
      // presence does not.
      const context = new ThrowingSetContext({ count: 1 } as Context, {});

      expect(() => runOn('(q => { count = 5 })(1)', context))
        .toThrow('Write to "count" is not allowed.');
    });

    it('should not reach set for a write to a binding the expression created', () => {
      // § 3.2's deliberate relaxation, and the other arm of the pair: without
      // it the case above says nothing, because an implementation that never
      // calls `setInScope` at all passes it.
      const context = new ThrowingSetContext({ count: 1 } as Context, {});

      expect(runOn('{ let count = 1; count = 5; count }', context)).toBe(5);
      expect(runOn('(q => (q = 9))(1)', context)).toBe(9);
    });
  });

  describe('const', () => {

    it('should throw on reassignment, naming the binding', () => {
      expect(() => evaluate(programOf('const y = 1; y = 2'), EvalState.fromContext({}, {})))
        .toThrow('Assignment to constant variable "y".');
    });

    it('should throw on update, naming the binding', () => {
      expect(() => evaluate(programOf('const y = 1; y++'), EvalState.fromContext({}, {})))
        .toThrow('Assignment to constant variable "y".');
      expect(() => evaluate(programOf('const y = 1; --y'), EvalState.fromContext({}, {})))
        .toThrow('Assignment to constant variable "y".');
    });

    it('should not throw for a let of the same name', () => {
      expect(evaluate(programOf('let y = 1; y = 2; y'), EvalState.fromContext({}, {}))).toBe(2);
    });

    it('should be recorded per scope, not per name', () => {
      // The kinds live in a `WeakMap` keyed by the **scope object**, so an inner
      // `let` of a name an outer scope declared `const` is writable. An
      // implementation keying by name alone throws here.
      expect(evaluate(programOf('const y = 1; { let y = 2; y = 3; y }'), EvalState.fromContext({}, {})))
        .toBe(3);
    });

    it('should still protect the outer const after the inner block has exited', () => {
      expect(() => evaluate(programOf('const y = 1; { let y = 2; y = 3 } y = 4'), EvalState.fromContext({}, {})))
        .toThrow('Assignment to constant variable "y".');
    });

    it('should not leak a const kind onto a later evaluation reusing the context', () => {
      // Scope objects are per walk, so the `WeakMap` entry dies with them.
      //
      // **What this excludes, exactly**: a const registry living on the
      // `EvalContext`, which outlives the walk - that one makes the second run
      // throw. It does **not** exclude a registry keyed by *name* on the
      // `EvalState`, because these are two `runOn` calls and so two states; the
      // per-scope case above is the detector for that one. Two cases, two wrong
      // implementations, stated rather than left to whoever reads the pair next.
      const context = contextOf();

      expect(() => runOn('const c = 1; c = 2', context)).toThrow();
      expect(runOn('let c = 1; c = 2; c', context)).toBe(2);
    });
  });

  describe('destructuring declarations', () => {

    it('should bind an array pattern', () => {
      const context = contextOf();

      expect(runOn('let [p, q] = arr; p', context)).toBe(1);
      expect(runOn('let [p, q] = arr; q', context)).toBe(2);
    });

    it('should bind an object pattern', () => {
      const context = contextOf();

      expect(runOn('let { m } = o; m', context)).toBe(7);
    });

    it('should bind a rest element', () => {
      const context = contextOf();

      expect(runOn('let [p, ...rest] = arr; rest', context)).toEqual([2]);
    });

    it('should not write the caller object when destructuring', () => {
      const source = sourceObject();
      const context = EvalContext.fromContext(source);

      expect(runOn('let [p, q] = arr; p + q', context)).toBe(3);
      expect(source).toEqual(sourceObject());
      expect('p' in source).toBe(false);
    });
  });

  describe('the prototype-pollution guard on binding targets', () => {

    /**
     * Captures the block's own scope object mid-walk.
     *
     * The guard throws and the block's `finally` pops before the throw reaches
     * the spec, so there is nothing left on the stack to read afterwards - the
     * scope has to be taken while the walk is still inside the block.
     */
    const capturing = () => {
      const captured: Context[] = [];
      const context: EvalContext = EvalContext.fromContext({
        ...sourceObject(),
        grab: () => { captured.push(context.scopes.peek()); },
      });
      return { context, captured };
    };

    it('should reject a __proto__ binding', () => {
      expect(() => evaluate(programOf('let __proto__ = 1'), EvalState.fromContext({}, {})))
        .toThrow('Access to dangerous property "__proto__" is blocked for security reasons');
    });

    it('should not set a prototype for an object-valued __proto__ binding', () => {
      // **The detector, and `let __proto__ = 1` is not one.** `scope.__proto__ = 1`
      // is a silent no-op - `1` is not an object, so the setter ignores it and an
      // unguarded write leaves the prototype intact. Only an object value is one
      // the setter accepts.
      const { context, captured } = capturing();

      expect(() => runOn('{ grab(); let __proto__ = { evil: 1 } }', context))
        .toThrow('Access to dangerous property "__proto__" is blocked for security reasons');

      expect(captured.length).toBe(1);
      expect(Object.getPrototypeOf(captured[0])).toBe(Object.prototype);
      expect((captured[0] as Record<string, unknown>)['evil']).toBeUndefined();
    });

    it('should reject a __proto__ key in an object pattern', () => {
      const { context, captured } = capturing();

      expect(() => runOn('{ grab(); let { __proto__: p } = o }', context))
        .toThrow('Access to dangerous property "__proto__" is blocked for security reasons');

      expect(Object.getPrototypeOf(captured[0])).toBe(Object.prototype);
    });

    it('should reject the other blocklisted binding names', () => {
      const state = () => EvalState.fromContext({}, {});

      expect(() => evaluate(programOf('let constructor = 1'), state()))
        .toThrow('Access to dangerous property "constructor" is blocked for security reasons');
      expect(() => evaluate(programOf('let prototype = 1'), state()))
        .toThrow('Access to dangerous property "prototype" is blocked for security reasons');
    });

    it('should reject a blocklisted name as an arrow parameter too', () => {
      // **The shipped path this widening reaches, which the declaration cases
      // above do not.** `evaluateIdentifier` is the binder for arrow parameters
      // as well as for declarations, so routing it through `safeSetProperty`
      // applies the whole 13-name blocklist to a form that bound normally
      // before this step - `(toString => toString)(1)` returned `1`.
      //
      // Only `__proto__` is an actual write vector into a fresh `{}`; the rest
      // are rejected as *names*, where the write would have been harmless. That
      // is a wider net than the pollution case needs, and it is the same net the
      // `member`, `assignment`, `update` and `object` visitors already cast, so
      // it is recorded as a divergence (plan § 3.6.7) rather than narrowed here.
      const state = () => EvalState.fromContext({}, {});

      expect(() => evaluate(programOf('(toString => toString)(1)'), state()))
        .toThrow('Access to dangerous property "toString" is blocked for security reasons');
      expect(() => evaluate(programOf('(({ valueOf: v }) => v)(o)'), state()))
        .toThrow('Access to dangerous property "valueOf" is blocked for security reasons');
    });
  });

  describe('forms this phase does not implement', () => {

    it('should reject var, which the dispatcher no longer catches', () => {
      // § 8.2 settled "no `var`" and said it would throw "per § 3.1's
      // dispatcher". That stopped being true the moment `VariableDeclaration`
      // joined the allow-list: the dispatcher switches on node *type*, and `var`
      // and `let` share one. The rejection moved into this visitor.
      expect(() => evaluate(programOf('var x = 1'), EvalState.fromContext({}, {})))
        .toThrow('Unsupported variable declaration kind: var');
    });

    it('should throw naming AssignmentPattern for a default in a pattern', () => {
      // § 3.6.6. `evaluatePattern` returned an empty context for any unhandled
      // type, which would have made this a fourth member of § 1.7's silent
      // fall-through family - arriving in the phase that promises not to add one.
      const context = contextOf();

      expect(() => runOn('let { a = 1 } = o', context))
        .toThrow('AssignmentPattern is not supported as a binding target.');
    });

    it('should throw naming AssignmentPattern for a default arrow parameter', () => {
      // **The shipped path the criterion above does not reach.** `evaluatePattern`
      // and `evaluatePatterns` are reached from arrow parameters as well as from
      // declarations, so this step changes what `((a = 1) => a)(undefined)` does:
      // it bound nothing and returned undefined, and now says why.
      const context = contextOf();

      expect(() => runOn('((z = 1) => z)(undefined)', context))
        .toThrow('AssignmentPattern is not supported as a binding target.');
    });
  });

  describe('case insensitivity', () => {

    /**
     * **The detector for § 3.2's guard/dispatch split.** `EvalContext.push` routes
     * through `fromContext`, which copies a plain record into a `Registry` when
     * `caseInsensitive` is set - and a `Registry` is Map-backed. A binding write
     * that finished with `Object.defineProperty`, as `safeSetProperty` does,
     * would define a property on the registry *instance* and insert nothing into
     * its map, so the binding would be written and then not found.
     *
     * Every other case in this file is case-**sensitive**, and every one of them
     * passes against that implementation: a plain-record scope takes the
     * assignment path and behaves.
     */
    const insensitive = { caseInsensitive: true } as EvalOptions;

    it('should bind into a registry-shaped scope', () => {
      const context = EvalContext.fromContext({}, insensitive);

      expect(runOn('let x = 1; x + 1', context, insensitive)).toBe(2);
    });

    it('should resolve a binding through a case-corrected read', () => {
      const context = EvalContext.fromContext({}, insensitive);

      expect(runOn('let value = 1; VALUE + 1', context, insensitive)).toBe(2);
    });

    it('should write a binding through a case-corrected key', () => {
      const source = sourceObject();
      const context = EvalContext.fromContext(source, insensitive);

      expect(runOn('let value = 1; VALUE = 2; value', context, insensitive)).toBe(2);
      expect(source).toEqual(sourceObject());
    });
  });
});
