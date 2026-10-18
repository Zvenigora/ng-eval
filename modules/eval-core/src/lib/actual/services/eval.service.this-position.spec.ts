import { TestBed } from '@angular/core/testing';
import { Identifier, MemberExpression } from 'acorn';
import { EvalService } from './eval.service';
import { Registry } from '../../internal/public-api';
import { parse } from '../../internal/functions';

/**
 * `this` is evaluated only as the object of a member access
 * (`docs/a35/plan.md` § 8 q4, step 7): `this.k`, `this["k"]` and `this.fn()`
 * resolve against the context as they always have, and so does any spelling
 * of `this` in that place under `caseInsensitive`. Anywhere else, `this`
 * throws.
 *
 * Up to 0.12.1 `this` evaluated to the walk's `EvalContext` wherever it was
 * written. Handed to native code as a value, that object let native code
 * reach a dangerous function the host had placed in the context without the
 * function ever passing through the walk's stack, so the funnel never saw it
 * (`docs/backlog.md` A39). P1, P2 and G1 are that route, and each is red
 * against 0.12.1: each gives the dangerous function's result.
 *
 * The position is a mark on the AST node, made by the member visitor before
 * it visits its object, as the funnel's exemptions are. So an E case is the
 * same `this` with no member around it, and an O case is the position kept.
 */
describe('EvalService - this by position (A39)', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  /** The refusal, compared by its whole message. */
  const refusal = new Error('Access to "this" outside a member access is blocked for security reasons');

  const caseInsensitive = { caseInsensitive: true };

  describe('the route through this as a value', () => {

    it('P1: should refuse this handed to native code, with eval in the context', () => {
      expect(() => service.simpleEval(
        '["1+1"].map(...Object.values(Object.values(this)[1]).slice(0, 1))',
        { eval, Object }
      )).toThrow(refusal);
    });

    it('P2: should refuse this handed to native code, with Function in the context', () => {
      expect(() => service.simpleEval(
        'Reflect.apply(...Object.values(Object.values(this)[1]).slice(0, 1), null, ["return 7"])()',
        { Function, Object, Reflect }
      )).toThrow(refusal);
    });

    it('G1: should refuse this handed to a native getter read, with eval in the context', () => {
      expect(() => service.simpleEval(
        '["1+1"].map(...Object.values(Reflect.get(this, "original")).slice(0, 1))',
        { eval, Object, Reflect }
      )).toThrow(refusal);
    });
  });

  describe('this outside a member\'s object', () => {

    // Each row once as `this`, which acorn parses as a `ThisExpression` in
    // either mode, and once as `This` under `caseInsensitive`, which it parses
    // as an identifier that the identifier visitor resolves as `this`.
    it.each([
      ['E1', 'this',          'as a value',      undefined],
      ['E2', 'f(this)',       'as an argument',  undefined],
      ['E3', 'this === null', 'as an operand',   undefined],
      ['E4', 'typeof this',   'as typeof\'s operand', undefined],
      ['E5', 'This',          'as a value',      caseInsensitive],
      ['E6', 'f(This)',       'as an argument',  caseInsensitive],
      ['E7', 'This === null', 'as an operand',   caseInsensitive],
      ['E8', 'typeof This',   'as typeof\'s operand', caseInsensitive],
    ])('%s: should refuse %s %s (options %p)', (_id, expression, _where, options) => {
      const f = jest.fn();
      const context = options ? Registry.fromObject({ f }, options) : { f };

      expect(() => service.simpleEval(expression, context, options)).toThrow(refusal);
      // Arguments are evaluated before the callee, so the refusal comes first.
      expect(f).not.toHaveBeenCalled();
    });

    it('H1: should refuse a hand-built identifier named this, outside a member\'s object', () => {
      // acorn never gives an identifier this name, so only a host-built AST
      // reaches the case-sensitive identifier visitor's `this`.
      const node = { type: 'Identifier', name: 'this', start: 0, end: 4 } as Identifier;

      expect(() => service.simpleEval(node, {})).toThrow(refusal);
    });

    it('E9: should refuse a parenthesised sequence ending in this as a member\'s object, under preserveParens', () => {
      // The parentheses are unwrapped before the mark, and nothing else is:
      // the object is the sequence, so the `this` under it is not marked.
      const ast = parse('(0, this).k', { preserveParens: true });

      expect(() => service.simpleEval(ast, { k: 1 })).toThrow(refusal);
    });
  });

  describe('this as a member\'s object, unchanged', () => {

    it('O1: should resolve this.k against the context', () => {
      expect(service.simpleEval('this.k', { k: 1 })).toBe(1);
    });

    it('O2: should resolve this["k"] against the context', () => {
      expect(service.simpleEval('this["k"]', { k: 1 })).toBe(1);
    });

    it('O3: should call this.fn() from the context', () => {
      expect(service.simpleEval('this.fn()', { fn: () => 7 })).toBe(7);
    });

    it('O4: should resolve This.k against the context under caseInsensitive', () => {
      const context = Registry.fromObject({ k: 1 }, caseInsensitive);

      expect(service.simpleEval('This.k', context, caseInsensitive)).toBe(1);
    });

    it('O5: should resolve (this).k against the context under preserveParens', () => {
      // acorn keeps the parentheses as a node of their own under this option,
      // and `(this).k` is still the member read `this.k` is.
      const ast = parse('(this).k', { preserveParens: true });

      expect(service.simpleEval(ast, { k: 1 })).toBe(1);
    });

    it('H2: should resolve a hand-built member whose object is an identifier named this', () => {
      // H1's identifier, as a member's object: the case-sensitive mark takes
      // it, so the read resolves against the context as `this.k` does.
      const node = {
        type: 'MemberExpression',
        start: 0,
        end: 6,
        object: { type: 'Identifier', name: 'this', start: 0, end: 4 },
        property: { type: 'Identifier', name: 'k', start: 5, end: 6 },
        computed: false,
        optional: false,
      } as MemberExpression;

      expect(service.simpleEval(node, { k: 1 })).toBe(1);
    });
  });
});
