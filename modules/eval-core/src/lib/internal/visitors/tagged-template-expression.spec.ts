import { AnyNode } from 'acorn';
import { EvalContext, EvalMemberWrite, EvalOptions, EvalScope, EvalState } from '../classes/eval';
import { Context } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * A tagged template calls its tag, and the tag is called as a callee is:
 * through the call sandbox - its written name, `Function`'s identity, the
 * source-pattern test - and past the context's write policy. A member tag
 * shares the member call's path, so its checked name is the property name,
 * computed keys included, and its `this` is its object; any other tag is
 * called with the context as `this`, as a bare call is.
 *
 * Up to 0.12.0 the visitor applied the tag directly, with the context as
 * `this` and no check at all: `` Function`return 7`() `` gave 7 with
 * `Function` in the context (`docs/backlog-retired.md` A36). Every case below
 * but T6 and T11 is red against that visitor. T6, a benign identifier tag, is
 * green against both, and so is T11: that visitor evaluated the tag first too.
 * T11 and T12 pin what the fix kept and what it changed: the tag's order, and
 * the call's own error for a tag that is not a function.
 *
 * T1, T2 and T8 bind the real `Function` and `eval`. The other refused cases
 * bind a stand-in, so each can assert that nothing ran: the name is what is
 * refused, and a real `setTimeout` or `fetch` would leave work behind if it
 * were not.
 */
describe('tagged template visitor - the tag through the call sandbox', () => {

  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020 }) as AnyNode;

  const run = (source: string, context: Context | EvalContext, options?: EvalOptions): unknown =>
    evaluate(programOf(source), EvalState.fromContext(context, options));

  /** The call sandbox's refusal, compared by its whole message. */
  const refusal = (name: string): Error =>
    new Error(`Function call blocked for security reasons: ${name}`);

  it('T1: should refuse Function as a tag, with Function bound', () => {
    expect(() => run('Function`return 7`()', { Function })).toThrow(refusal('Function'));
  });

  it('T2: should refuse eval as a tag', () => {
    expect(() => run('eval`1+1`', { eval })).toThrow(refusal('eval'));
  });

  it('T3: should refuse setTimeout as a tag, by its name', () => {
    const standIn = jest.fn();

    expect(() => run('setTimeout`x`', { setTimeout: standIn })).toThrow(refusal('setTimeout'));
    expect(standIn).not.toHaveBeenCalled();
  });

  it('T4: should refuse a host tag whose source text names globalThis', () => {
    let ran = false;
    const host = function () { ran = true; return typeof globalThis; };

    expect(() => run('host`x`', { host })).toThrow(refusal('host'));
    expect(ran).toBe(false);
  });

  it('T5: should refuse a member tag by its property name', () => {
    const obj = { fetch: jest.fn() };

    expect(() => run('obj.fetch`x`', { obj })).toThrow(refusal('fetch'));
    expect(obj.fetch).not.toHaveBeenCalled();
  });

  it('T6: should call a benign tag with the cooked strings and the values, and a guarded view as this', () => {
    // **Deliberate contract change**, `eval-core` 0.13.0
    // (`docs/a35/plan.md` § 8 q7, `docs/backlog.md` A39). Up to 0.12.1 this
    // asserted `self` *was* `state.context`. A bare tag now receives a
    // guarded view of it (`context-receiver.ts`), as a bare call does, so the
    // assertion names what the view is rather than dropping the claim.
    const calls: { self: unknown; args: unknown[] }[] = [];
    const tag = function (this: unknown, ...args: unknown[]) {
      calls.push({ self: this, args });
      return 'tagged';
    };
    const state = EvalState.fromContext({ tag, x: 2 });

    expect(evaluate(programOf('tag`a${1}b${x}c`'), state)).toBe('tagged');

    expect(calls.length).toBe(1);
    expect(calls[0].args).toEqual([['a', 'b', 'c'], 1, 2]);

    const self = calls[0].self as object;
    expect(self).not.toBe(state.context);
    expect(Reflect.ownKeys(self)).toEqual([]);
    expect(Object.getPrototypeOf(self)).toBeNull();
    expect(typeof (self as { push: unknown }).push).toBe('function');
  });

  it('T7: should refuse a computed member tag by its key, as a computed member call is', () => {
    const obj = { fetch: jest.fn() };

    expect(() => run('obj["fetch"]`x`', { obj })).toThrow(refusal('fetch'));
    expect(obj.fetch).not.toHaveBeenCalled();
  });

  it('T8: should refuse Function under a case variant, by its identity', () => {
    // Under caseInsensitive `FUNCTION` resolves to `Function`, a name the list
    // does not hold; the identity check is what refuses it, as it does a call.
    expect(() => run('FUNCTION`return 7`()', { Function }, { caseInsensitive: true }))
      .toThrow(refusal('FUNCTION'));
  });

  describe('T9: a tag that reaches a mutating built-in', () => {

    class RefusedWrite extends Error {
      constructor(readonly write: EvalMemberWrite) {
        super(`refused: ${String(write.method ?? write.key)}`);
      }
    }

    /** Refuses whatever the walk did not create, and records every question. */
    class PolicedContext extends EvalContext {

      readonly writes: EvalMemberWrite[] = [];

      override checkMemberWrite(write: EvalMemberWrite): void {
        this.writes.push(write);
        if (!write.createdByEvaluation) {
          throw new RefusedWrite(write);
        }
      }
    }

    it('T9: should ask the write policy about the receiver, and throw its refusal', () => {
      // A member tag's receiver is its object, as a member call's is.
      const data = { a: [1] };
      const policed = new PolicedContext(data, {});

      expect(() => run('a.push`x`', policed)).toThrow(RefusedWrite);
      expect(data.a).toEqual([1]);
      expect(policed.writes.length).toBe(1);
      expect(policed.writes[0].target).toBe(data.a);
      expect(policed.writes[0].method).toBe('Array.prototype.push');

      // Any other tag's receiver is the context, as a bare call's is.
      const bare = new PolicedContext({ p: Array.prototype.push }, {});

      expect(() => run('p`x`', bare)).toThrow(RefusedWrite);
      expect(bare.writes.length).toBe(1);
      expect(bare.writes[0].target).toBe(bare);
      expect(bare.writes[0].method).toBe('Array.prototype.push');
    });
  });

  it('T10: should call a member tag with its object as this, or a prior scope\'s thisArg', () => {
    const obj = { m: function (this: unknown) { return this; } };

    expect(run('obj.m`x`', { obj })).toBe(obj);

    const cat = { m: function (this: unknown) { return this; } };
    const foreign = { name: 'Other' };
    const context = new EvalContext({}, {});
    context.priorScopes.push(EvalScope.fromObject(cat, {
      global: false, caseInsensitive: false, namespace: 'cat', thisArg: foreign
    }));

    expect(run('cat.m`x`', context)).toBe(foreign);
  });

  it('T11: should evaluate the tag before the template\'s expressions, member or not', () => {
    // A call evaluates its arguments before its callee; a tag is evaluated
    // first, as in JavaScript. Each side records its turn as it is evaluated.
    const order: string[] = [];
    const mark = (label: string) => { order.push(label); return label; };
    const tag = () => 'tagged';

    // A member tag: its object comes from a call, which records the tag's turn.
    const pick = () => { order.push('tag'); return { m: tag }; };

    expect(run('pick().m`a${mark("expression")}b`', { pick, mark })).toBe('tagged');
    expect(order).toEqual(['tag', 'expression']);

    // An identifier tag: a getter on the context records the read.
    order.length = 0;
    const context = { mark, get t() { order.push('tag'); return tag; } };

    expect(run('t`a${mark("expression")}b`', context)).toBe('tagged');
    expect(order).toEqual(['tag', 'expression']);
  });

  it('T12: should throw the call\'s own error for a tag that is not a function, member or not', () => {
    expect(() => run('s`x`', { s: 'str' })).toThrow(new Error('Value is not a function: string'));
    expect(() => run('obj.n`x`', { obj: { n: 5 } })).toThrow(new Error('Value is not a function: number'));
  });
});
