import { AnyNode } from 'acorn';
import { EvalContext, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * Object destructuring binds the names JavaScript binds.
 *
 * **What this replaces**, recorded because the suite was green over all of it:
 * `evaluateObjectPattern` took the binding name from `Property.key` and then
 * walked `Property.value` **as an expression** against the argument. For
 * `{ a: b }` that resolved the identifier `b` against the source and bound the
 * name `a` to the result - both halves wrong at once, where JavaScript binds
 * `b` to `src.a`. Shorthand `{ a }` hid it: `key` and `value` both name `a`, so
 * resolving the wrong one landed on the right answer. See `docs/backlog.md`
 * A11, and A13 for the rest element.
 *
 * **The fixture is the load-bearing part of this file.** The context below
 * holds `src`, `nested` and `arr` and *nothing else* - no `a`, `b`, `x`, `y`,
 * `q` or `z` at the top level. That is not tidiness. A11's own table was
 * measured over a source carrying both `a` and `b`, which made the defect read
 * as "binds `a` to `src.b`" - a wrong *value*. That is the unlucky case. The
 * general rule is that the value name resolves to **nothing**, so the usual
 * symptom is `undefined`, and a fixture whose context carries the renamed-to
 * name cannot tell the two apart: the old code would find it in the context and
 * return a plausible value either way.
 *
 * So every bare name asserted below is reachable only as a binding. An
 * unbound name resolves to `undefined` here rather than raising - this library
 * has no `ReferenceError` - which is why the "the old name is gone" arm asserts
 * `undefined` and not a throw.
 *
 * **Both routes, every shape.** `evaluateObjectPattern` is reached from an
 * arrow parameter list (since before Phase 1) and from a `let`/`const`
 * declaration (new in 0.4.0, Phase 2 step 3). They are the same branch, so a
 * shape fixed for one is fixed for both - and asserted for both anyway, because
 * nothing in the code says they cannot diverge.
 */

const programOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: false }) as AnyNode;

/**
 * A context holding only the sources. See the note above: no name this file
 * binds may exist here, or the assertions stop discriminating.
 */
const contextOf = (): EvalContext => EvalContext.fromContext({
  src: { a: 'A_VAL', b: 'B_VAL' },
  nested: { a: { b: 'INNER_B', c: 'INNER_C' } },
  arr: [1, 2, 3],
});

const run = (source: string): unknown =>
  evaluate(programOf(source), EvalState.fromContext(contextOf(), {}));

describe('object destructuring binds the JavaScript names', () => {

  /**
   * Each shape is asserted twice over: the new name carries the source value,
   * **and** the pattern's key is not bound. The second arm is what fails if the
   * swap is only half repaired, and it is the arm the old code passed by
   * accident - it bound the key, so the key resolved.
   */
  describe('renaming - { a: b }', () => {

    it('should bind the value name through an arrow parameter', () => {
      expect(run('(({a: b}) => b)(src)')).toBe('A_VAL');
    });

    it('should bind the value name through a declaration', () => {
      expect(run('let {a: b} = src; b')).toBe('A_VAL');
    });

    it('should not bind the key name through an arrow parameter', () => {
      // Measured 'B_VAL' before the fix: `a` was bound, to whatever the name
      // `b` resolved to against the source. This is A11's own table row.
      expect(run('(({a: b}) => a)(src)')).toBeUndefined();
    });

    it('should not bind the key name through a declaration', () => {
      expect(run('let {a: b} = src; a')).toBeUndefined();
    });
  });

  describe('renaming every key - { a: x, b: y }', () => {

    /**
     * The shape that shows the general rule. Neither `x` nor `y` exists in the
     * source, so the old code bound `a` and `b` to `undefined` and left `x` and
     * `y` unbound - `undefined` on both sides of the swap, and no wrong value
     * anywhere to make it visible.
     */
    it('should bind both value names through an arrow parameter', () => {
      expect(run('(({a: x, b: y}) => x)(src)')).toBe('A_VAL');
      expect(run('(({a: x, b: y}) => y)(src)')).toBe('B_VAL');
    });

    it('should bind both value names through a declaration', () => {
      expect(run('let {a: x, b: y} = src; x')).toBe('A_VAL');
      expect(run('let {a: x, b: y} = src; y')).toBe('B_VAL');
    });

    it('should bind both through a const declaration', () => {
      expect(run('const {a: x, b: y} = src; x')).toBe('A_VAL');
    });
  });

  describe('nested - { a: { b } }', () => {

    it('should bind the inner name through an arrow parameter', () => {
      expect(run('(({a: {b}}) => b)(nested)')).toBe('INNER_B');
    });

    it('should bind the inner name through a declaration', () => {
      expect(run('let {a: {b}} = nested; b')).toBe('INNER_B');
    });

    it('should not bind the outer key through an arrow parameter', () => {
      expect(run('(({a: {b}}) => a)(nested)')).toBeUndefined();
    });

    it('should not bind the outer key through a declaration', () => {
      expect(run('let {a: {b}} = nested; a')).toBeUndefined();
    });
  });

  describe('nested and renamed - { a: { b: z } }', () => {

    it('should bind the renamed inner name through an arrow parameter', () => {
      expect(run('(({a: {b: z}}) => z)(nested)')).toBe('INNER_B');
    });

    it('should bind the renamed inner name through a declaration', () => {
      expect(run('let {a: {b: z}} = nested; z')).toBe('INNER_B');
    });
  });

  describe('a literal key - { "a": q }', () => {

    it('should bind the value name through an arrow parameter', () => {
      expect(run('(({"a": q}) => q)(src)')).toBe('A_VAL');
    });

    it('should bind the value name through a declaration', () => {
      expect(run('let {"a": q} = src; q')).toBe('A_VAL');
    });
  });

  describe('a computed key - { ["a"]: q }', () => {

    /**
     * The computed key is evaluated in the **enclosing** scope, not against the
     * source - which is what JavaScript does, and what the code already did:
     * the key walk runs before the source value is read. Asserted because the
     * repair moved the code around it, and a computed key that started
     * resolving against the source would be a new defect wearing this one's
     * clothes. `keyName` is a context key, so it can only resolve in the
     * enclosing scope; if it resolved against `src` it would be `undefined`.
     */
    it('should bind the value name through an arrow parameter', () => {
      expect(run('(({["a"]: q}) => q)(src)')).toBe('A_VAL');
    });

    it('should bind the value name through a declaration', () => {
      expect(run('let {["a"]: q} = src; q')).toBe('A_VAL');
    });

    /**
     * **The decoy is the point.** `keyName` exists in *both* places - `'a'` in
     * the enclosing context and `'DECOY'` on the source - so each of the three
     * ways this can go wrong produces a different value, and the assertion can
     * only pass one way. Evaluating the key in the enclosing scope gives
     * `src.a`; taking the identifier's *spelling* gives `src.keyName`, which is
     * A14; resolving it against the source would give `src.DECOY`.
     */
    const decoy = (): EvalContext => EvalContext.fromContext({
      src: { a: 'A_VAL', keyName: 'DECOY', DECOY: 'WORSE' },
      keyName: 'a',
    });

    it('should evaluate the key in the enclosing scope, through a declaration', () => {
      expect(evaluate(programOf('let {[keyName]: q} = src; q'),
        EvalState.fromContext(decoy(), {}))).toBe('A_VAL');
    });

    it('should evaluate the key in the enclosing scope, through an arrow parameter', () => {
      expect(evaluate(programOf('(({[keyName]: q}) => q)(src)'),
        EvalState.fromContext(decoy(), {}))).toBe('A_VAL');
    });
  });

  describe('the object rest element - { a, ...r } (A13)', () => {

    /**
     * `evaluateRestElement` bound the **whole** argument, so a key already
     * taken by a sibling property stayed on the rest record. This is the one
     * shape in this file whose old answer was a real value rather than
     * `undefined`, which is why it is the one a consumer could have been
     * reading without noticing.
     */
    it('should exclude a key already bound, through an arrow parameter', () => {
      expect(run('(({a, ...r}) => r.a)(src)')).toBeUndefined();
    });

    it('should exclude a key already bound, through a declaration', () => {
      expect(run('let {a, ...r} = src; r.a')).toBeUndefined();
    });

    it('should keep the keys not bound', () => {
      expect(run('(({a, ...r}) => r.b)(src)')).toBe('B_VAL');
      expect(run('let {a, ...r} = src; r.b')).toBe('B_VAL');
    });

    it('should exclude a renamed key by its source name, not its binding name', () => {
      // `{a: x, ...r}` takes `src.a`, so `r` must lack `a`. It must not lack
      // `x` for the wrong reason either - `x` was never a source key.
      expect(run('(({a: x, ...r}) => r.a)(src)')).toBeUndefined();
      expect(run('(({a: x, ...r}) => r.b)(src)')).toBe('B_VAL');
    });

    it('should take every key when nothing else is bound', () => {
      expect(run('(({...r}) => r.a)(src)')).toBe('A_VAL');
      expect(run('(({...r}) => r.b)(src)')).toBe('B_VAL');
    });
  });

  /**
   * The shapes that were already correct. They are here because the repair
   * rewrites the branch all of them run through, and a fix that only moved the
   * defect would show up here first.
   */
  describe('the shapes that were already correct', () => {

    it('should still bind shorthand', () => {
      expect(run('(({a}) => a)(src)')).toBe('A_VAL');
      expect(run('let {a} = src; a')).toBe('A_VAL');
      expect(run('(({a, b}) => b)(src)')).toBe('B_VAL');
    });

    it('should still bind array patterns', () => {
      expect(run('(([p, q]) => q)(arr)')).toBe(2);
      expect(run('let [p, q] = arr; p')).toBe(1);
      expect(run('let [p, ...t] = arr; t')).toEqual([2, 3]);
    });

    it('should still resolve a name the source does not carry to undefined', () => {
      expect(run('(({missing}) => missing)(src)')).toBeUndefined();
    });

    it('should still reject a default, which is not implemented', () => {
      // Step 3's guard, and the one shape in an object pattern that is loud
      // rather than wrong. Unchanged by this repair.
      expect(() => run('(({z = 1}) => z)(src)'))
        .toThrow('AssignmentPattern is not supported as a binding target.');
      expect(() => run('let {z = 1} = src; z'))
        .toThrow('AssignmentPattern is not supported as a binding target.');
    });
  });

  /**
   * The defect was a wrong answer and not corruption, and the repair has to
   * keep it that way - `evaluateObjectPattern` no longer pushes a scope, so
   * these assert the absence of the thing that replaced it as much as the
   * absence of the original.
   */
  describe('stack and scope balance', () => {

    it('should leave no scope and no stranded value on any shape', () => {
      const shapes = [
        '(({a: b}) => 1)(src)',
        '(({a: {b}}) => 1)(nested)',
        '(({a, ...r}) => 1)(src)',
        'let {a: b} = src; 1',
        'let {a: {b}} = nested; 1',
        'let {a, ...r} = src; 1',
      ];

      for (const source of shapes) {
        const context = contextOf();
        const state = EvalState.fromContext(context, {});

        expect(evaluate(programOf(source), state)).toBe(1);
        expect(context.scopes.length).toBe(0);
        expect(state.result.stack.length).toBe(0);
      }
    });

    it('should not disturb a pending operand', () => {
      expect(run('9 + (({a: {b}}) => 1)(nested)')).toBe(10);
      expect(run('9 + (({a: x, b: y}) => 1)(src)')).toBe(10);
    });

    it('should not write the caller object', () => {
      const source = { a: 'A_VAL', b: 'B_VAL' };
      const context = EvalContext.fromContext({ src: source });

      evaluate(programOf('let {a: x} = src; x'), EvalState.fromContext(context, {}));

      expect(source).toEqual({ a: 'A_VAL', b: 'B_VAL' });
      expect('x' in source).toBe(false);
    });
  });
});
