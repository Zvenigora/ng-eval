import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { AnyNode, ArrayExpression } from 'acorn';
import { EvalContext, EvalMemberWrite, EvalOptions, EvalState } from '../../internal/classes/eval';
import { evaluate, parse } from '../../internal/functions';
import { refuseContextMethodWrite } from '../../internal/visitors/member-write-policy';

/**
 * The evaluation context is not a writable object, and a context reached as
 * data is inert (`docs/a35/plan.md` Revision 16, `docs/backlog.md` A42).
 *
 * Up to 0.12.1 `this.k = v` wrote an own property onto the `EvalContext`: the
 * member visitor resolves `this.k` through the context's chain, and for a key
 * nothing in that chain holds, `getThis` answers undefined and the receiver
 * falls back to the context itself. The property was unreadable by any
 * expression - `EvalContext.get` never reads the instance - so it bought
 * nothing and cost three things, which is why the write is refused rather
 * than redirected:
 *
 * - **Capture.** An own property shadows the prototype's method, so a plant
 *   under a method's name was invoked *by the evaluator* - `program.ts`,
 *   `block-statement.ts`, `for-statement.ts` and
 *   `arrow-function-expression.ts` all call `push` - with the real context as
 *   its `this`. A function that keeps that `this` holds the caller's own
 *   object, and read under a *second* context it disclosed it.
 * - **Denial of service.** A plant over `push` that evaluates anything
 *   recurses until the stack is gone, and it persists, so every later
 *   evaluation on a reused context throws. Both downstream libraries reuse
 *   one context by design.
 * - **Integrity.** `_original` and `_scopes` are own properties too.
 *
 * **Three layers, and each is pinned here separately**, because each one
 * covers a case the others do not:
 *
 * - **The value funnel** (`visitor-result.ts`, raising
 *   `prototype-pollution-guard.ts`'s `refuseContextRead`), L4, L5 and
 *   L7–L10: an `EvalContext` is not a value an expression may hold, whatever
 *   node pushed it. This is the load-bearing one. It replaced a refusal that
 *   sat on the member read alone, which the step's second code review
 *   measured round four ways - object spread and destructuring with no host
 *   natives at all, `Object.values` and `JSON.stringify` with them. Its one
 *   exemption is the walk's **own** context as a member's object, matched by
 *   identity as well as by position: keyed on position alone it was as wide
 *   as `markThisPositional`, which under `caseInsensitive` marks every
 *   identifier before a `.`, and L10 is the case that was missing.
 * - **The write refusal** (`prototype-pollution-guard.ts`), W1–W6 and W11:
 *   the context cannot be written to, by any form the evaluator offers.
 * - **Class-resolved methods** (`context-method.ts`), L1–L3: an own property
 *   that arrives by some other route - a host that sets one, a route not yet
 *   found - is not what the evaluator invokes.
 *
 * **What is depth rather than a boundary, and is labelled as such.** The
 * native-writer refusal (W7–W10d, W10e) can no longer be reached by an
 * expression at all, because handing a context to `Object.assign` requires
 * holding one, which the funnel refuses; and following call hops can never
 * be complete, since any native function that calls another - `map`, `sort`,
 * `then`, an accessor, a `Proxy` trap - is a hop. The by-class refusal in
 * `member-expression.ts` is in the same position: removing it turns no case
 * here red, even with L10 present. Both are kept, and the plan's § 9 says
 * plainly that they are second lines behind the funnel rather than the thing
 * being relied on. The two refusals carry **different messages** so a case
 * can say which fired; while they were identical, the L cases passed without
 * distinguishing the layers, which is how L10's gap survived three reviews.
 *
 * **What is not covered, measured and stated rather than implied.** The
 * funnel checks the value a node pushes; it does not look *inside* one, and
 * it does not run on `evaluateAsync`'s post-walk promise unwrap. So a host
 * that places its own context inside a value an expression can read - nested
 * in an object, in an array, or behind a promise - gets it back as a result;
 * no host *function* is needed, which an earlier wording implied. Reading it
 * back one hop later is refused, and no expression can construct either
 * route, because both start from holding a context.
 *
 * The L cases install the own property from **host code** rather than from an
 * expression, which is the point: with W green an expression cannot make one,
 * so a case that planted through the evaluator would assert the first layer
 * twice and the second one not at all.
 */
describe('EvalService - the evaluation context is not writable (A42)', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  /** The refusal, compared by its whole message - named, not a silent no-op. */
  const refusal = new Error(`Write to the evaluation context is blocked for security reasons`);

  /**
   * **Every option this library supports gets a leg in this matrix**, which
   * is a standing rule since Revision 16 (`docs/a35/plan.md` § 9) and not a
   * flourish: the third code review found a refusal whose exemption was
   * wider under `caseInsensitive` than anywhere the cases looked, and the
   * reason it survived three passes is that not one case ran with the option
   * on. `OPTIONS` is what the W and L bodies are parameterised over.
   */
  const OPTIONS: readonly [string, EvalOptions][] = [
    ['case-sensitive', {}],
    ['caseInsensitive', { caseInsensitive: true }],
  ];

  /**
   * A context whose data also holds the natives and the context itself.
   *
   * Built with the same options it will be evaluated under: a context's own
   * options are not the walk's, and a case-insensitive *lookup* needs the
   * option on the context too (`CLAUDE.md`, context resolution).
   */
  const built = (options: EvalOptions = {}) => {
    const context = EvalContext.fromContext({
      f: function (this: unknown) { return this; },
      o: { z: 1 },
      n: 1,
      Object,
      Reflect,
    }, options);
    // As a host exposing its own context would, and as a capture once did.
    //
    // Inserted through the `Registry`'s own `set` where there is one: under
    // `caseInsensitive`, `fromContext` copies the data into a `Registry`, and
    // assigning a property to that object inserts nothing into its map - so
    // the first version of this left `alias` unresolvable in exactly the mode
    // this matrix was added to cover, and the native-writer legs passed on a
    // `TypeError` from `Object.assign(undefined, …)` rather than on the
    // refusal.
    const original = context.original as
      { set?: (key: unknown, value: unknown) => void } & Record<string, unknown>;
    if (typeof original.set === 'function') {
      original.set('alias', context);
    } else {
      original['alias'] = context;
    }
    return context;
  };

  /** Own properties the class did not put there. */
  const planted = (context: EvalContext): string[] =>
    Object.getOwnPropertyNames(context).filter((key) =>
      !['type', '_original', '_priorScopes', '_scopes', '_lookups', '_options'].includes(key));

  describe('the write refusal', () => {

    const forms: readonly [string, string][] = [
      ['W1: a dotted member write', 'this.push = f'],
      ['W2: a computed member write', 'this["push"] = f'],
      ['W3: a computed member write with a built key', 'this["pu" + "sh"] = f'],
      ['W4: a compound member write', 'this.push += 1'],
      ['W5: a private field, the caller\'s own object', 'this._original = o'],
      ['W6: a private field, the scope stack', 'this._scopes = o'],
    ];

    for (const [id, source] of forms) {
      for (const [mode, options] of OPTIONS) {
        it(`${id} is refused by name, and plants nothing (${mode})`, () => {
          const context = built(options);

          expect(() => service.simpleEval(source, context as never, options)).toThrow(refusal);

          expect(planted(context)).toEqual([]);
          expect(Object.getPrototypeOf(context)).toBe(EvalContext.prototype);
          expect(Object.isFrozen(context)).toBe(false);
        });
      }
    }

    /**
     * A native writer handed the context, which the expression can only
     * attempt by naming a context the host put in its own data.
     *
     * **These assert the outcome, not which layer produced it**, and that is
     * deliberate: since the refusal moved to the value funnel, reading
     * `alias` is refused *before* the call is built, so the message is the
     * read's rather than the write's. Asserting the write's message here
     * would pin the weaker of the two layers and would go red the moment the
     * stronger one did its job. What must hold is that nothing is planted,
     * the class is not replaced, and the context is not frozen - and
     * `refuseContextMethodWrite` is pinned directly below, where it can
     * still be reached.
     */
    const natives: readonly [string, string][] = [
      ['W7: Object.assign through a name the host supplied', 'Object.assign(alias, { push: f })'],
      ['W8: Object.defineProperty, the same way', 'Object.defineProperty(alias, "push", { value: f })'],
      ['W9: Reflect.set, which the policy\'s own table does not list',
        'Reflect.set(alias, "push", f)'],
      ['W10: Object.setPrototypeOf, which would replace the class itself',
        'Object.setPrototypeOf(alias, o)'],
      ['W10b: Reflect.apply as a hop, which carried every writer past the first draft',
        'Reflect.apply(Reflect.set, null, [alias, "push", f])'],
      ['W10c: Reflect.apply onto Object.assign', 'Reflect.apply(Object.assign, null, [alias, { push: f }])'],
      ['W10d: a writer through a callback the walk never sees', '[alias].map(Object.freeze)'],
    ];

    for (const [id, source] of natives) {
      for (const [mode, options] of OPTIONS) {
        it(`${id} is refused, and the context is untouched (${mode})`, () => {
          const context = built(options);

          // By message, not bare: a bare `toThrow()` passed on a `TypeError`
          // from `Object.assign(undefined, …)` while the fixture left
          // `alias` unresolvable, which is how the broken fixture above went
          // unnoticed. Either layer may answer - the funnel when the context
          // is read, the write refusal when it reaches the writer - and both
          // say the same thing about the context.
          expect(() => service.simpleEval(source, context as never, options))
            .toThrow(/the evaluation context is blocked for security reasons/);

          expect(planted(context)).toEqual([]);
          expect(Object.getPrototypeOf(context)).toBe(EvalContext.prototype);
          expect(Object.isFrozen(context)).toBe(false);
          expect(context.scopes.length).toBe(0);
        });
      }
    }

    it('W10e: the native-writer refusal itself, where an expression can no longer reach it', () => {
      // `refuseContextMethodWrite` is depth rather than a boundary: with the
      // funnel refusing the context as a value, no expression can hand one to
      // a native writer, so the cases above are all stopped earlier. It is
      // still pinned, because the thing it defends against - a context
      // reaching native code by a route the funnel does not see - is exactly
      // what the funnel's completeness is claimed on, and a claim with no
      // second line under it is worth less.
      const context = built();
      const hops: readonly [unknown, unknown, unknown[]][] = [
        [Object.assign, undefined, [context, { push: 1 }]],
        [Object.defineProperty, undefined, [context, 'push', { value: 1 }]],
        [Object.setPrototypeOf, undefined, [context, {}]],
        [Object.freeze, undefined, [context]],
        [Reflect.set, undefined, [context, 'push', 1]],
        [Reflect.apply, undefined, [Reflect.set, null, [context, 'push', 1]]],
        [Function.prototype.call, Object.assign, [undefined, context, { push: 1 }]],
        [Function.prototype.apply, Object.assign, [undefined, [context, { push: 1 }]]],
        [Function.prototype.bind, Object.assign, [undefined, context, { push: 1 }]],
        [Array.prototype.push, context, [1]],
      ];

      for (const [fn, receiver, args] of hops) {
        expect(() => refuseContextMethodWrite(fn, receiver, args)).toThrow(refusal);
      }
      // And it says nothing about a write to anything else.
      expect(() => refuseContextMethodWrite(Object.assign, undefined, [{}, { a: 1 }])).not.toThrow();
      expect(() => refuseContextMethodWrite((x: unknown) => x, undefined, [context])).not.toThrow();
    });

    it('W11: the context still resolves after a refused field write', () => {
      const context = built();

      expect(() => service.simpleEval('this._original = o', context as never)).toThrow(refusal);

      // The integrity consequence, shown gone: the caller's object is still
      // the one behind the context, and the scope stack still works.
      expect(service.simpleEval('n', context as never)).toBe(1);
      expect(service.simpleEval('((x) => x + n)(1)', context as never)).toBe(2);
    });

    it('W12: a write to a key the context holds is untouched', () => {
      const context = built();

      // The data write, through the member and through the identifier, and
      // the update - all of which target the caller's object, not the
      // context, and none of which this refusal is about.
      expect(service.simpleEval('(this.n = 7, n)', context as never)).toBe(7);
      expect(service.simpleEval('(n = 8, n)', context as never)).toBe(8);
      expect(service.simpleEval('(this.n++, n)', context as never)).toBe(9);
      expect(planted(context)).toEqual([]);
    });
  });

  describe('methods resolved from the class', () => {

    it.each(OPTIONS)('L1 (%s): an own push the host set is not what the evaluator calls',
      (_mode, options) => {
      const calls: unknown[] = [];
      const context = built(options);
      // Not reachable from an expression - W1 refuses that - so it is set
      // here, which is what makes this a test of the second layer.
      (context as unknown as Record<string, unknown>)['push'] =
        function (this: unknown) { calls.push(this); return undefined; };

      // Three scope pushes: the program's, the arrow's, and the block's.
      expect(service.simpleEval('((x) => { x + 1; })(1)', context as never, options)).toBe(2);
      expect(calls).toEqual([]);
    });

    it('L2d: a native writer reached through the L11 residual is refused', () => {
      // **This is what makes the native-writer refusal coverage rather than
      // depth**, and it was measured rather than assumed: L11's residual
      // hands the real context to a call's arguments, so a host-built AST
      // can put it in front of `Object.freeze` or `Object.assign`. The
      // writer refusal is the only thing between that and a write.
      for (const [call, after] of [
        ['Object.freeze(1)', (c: EvalContext) => Object.isFrozen(c)],
        ['Object.assign(1, {push: 1})', (c: EvalContext) =>
          Object.prototype.hasOwnProperty.call(c, 'push')],
        ['Object.setPrototypeOf(1, {})', (c: EvalContext) =>
          Object.getPrototypeOf(c) !== EvalContext.prototype],
        // The plant `Object.assign` cannot express, and the row a reader
        // asks about first.
        ['Object.defineProperty(1, "push", {value: 1})', (c: EvalContext) =>
          Object.prototype.hasOwnProperty.call(c, 'push')],
        ['Reflect.set(1, "push", 1)', (c: EvalContext) =>
          Object.prototype.hasOwnProperty.call(c, 'push')],
      ] as const) {
        const context = EvalContext.fromContext({ n: 1, Object, Reflect }, {});
        const ast = parse(`[this.n, ${call}]`, { ecmaVersion: 2020 }) as AnyNode;
        const list = (ast as unknown as { body: { expression: ArrayExpression }[] })
          .body[0].expression;
        const sharedThis = (list.elements[0] as unknown as { object: unknown }).object;
        (list.elements[1] as unknown as { arguments: unknown[] }).arguments[0] = sharedThis;

        expect(() => evaluate(ast, EvalState.fromContext(context))).toThrow(refusal);
        expect(after(context)).toBe(false);
      }
    });

    it('L2b: a policy assigned to an instance is refused, loudly', () => {
      // The counterpart of L2, and the one a *consumer* can walk into rather
      // than an attacker: `checkMemberWrite` is declared as an optional
      // method, so assigning one to an instance looks like a way to supply
      // it. The opt-in and the call both ask the class, so such a policy
      // would be inert - and a security opt-in that quietly does nothing is
      // worse than a construction error, so it throws instead, naming the
      // class to declare it on.
      const assigned = built();
      (assigned as unknown as Record<string, unknown>)['checkMemberWrite'] =
        (write: unknown) => { void write; };

      expect(() => EvalState.fromContext(assigned))
        .toThrow(/"checkMemberWrite" is an instance property/);
      expect(() => service.simpleEval('o.z = 2', assigned as never))
        .toThrow(/Declare it as a method/);

      // **The shape a consumer actually writes**, and the one that made the
      // first version of this message useless: a class field is an instance
      // property, so it throws - and the message must not answer it with
      // "declare it on a subclass", which is what its author just did.
      class FieldPolicy extends EvalContext {
        public override checkMemberWrite = (write: EvalMemberWrite): void => { void write; };
      }
      expect(() => EvalState.fromContext(new FieldPolicy({ a: 1 }, {})))
        .toThrow(/is an instance property[\s\S]*Declare it as a method on FieldPolicy/);

      // A class that declares it as a method is unaffected, and so is a
      // context with no policy at all, and so is a data key of that name.
      class MethodPolicy extends EvalContext {
        public override checkMemberWrite(write: EvalMemberWrite): void { void write; }
      }
      expect(() => EvalState.fromContext(new MethodPolicy({ a: 1 }, {}))).not.toThrow();
      expect(() => EvalState.fromContext(built())).not.toThrow();
      expect(() => EvalState.fromContext(
        EvalContext.fromContext({ checkMemberWrite: 1 }, {}))).not.toThrow();
    });

    it('L2c: a policy the class defines is consulted, and refuses before the write refusal', () => {
      // The ordering `call-expression.ts` states: the policy is asked first,
      // so its own refusal is the error that surfaces, and the by-class
      // refusal is the fallback underneath. Nothing pinned this before - the
      // existing method-write cases all target arrays, where the context
      // refusal is a no-op, so the two could be swapped with every suite
      // still green. This is the discriminating setup: a policed context,
      // and a write whose target is a context.
      class Policed extends EvalContext {
        public readonly asked: unknown[] = [];
        public override checkMemberWrite(write: EvalMemberWrite): void {
          this.asked.push(write.method ?? write.key);
          throw new RefusedByPolicy();
        }
      }
      class RefusedByPolicy extends Error {}

      const context = new Policed({ o: { k: 1 }, Object }, {});
      (context.original as Record<string, unknown>)['alias'] = context;

      // A member write the policy refuses: its error, not the guard's.
      expect(() => service.simpleEval('o.k = 2', context as never)).toThrow(RefusedByPolicy);

      // And a method write whose target is the context itself, asked of the
      // policy first for the same reason.
      const asked = context.asked.length;
      expect(() => service.simpleEval('[1].push(2)', context as never)).toThrow(RefusedByPolicy);
      expect(context.asked.length).toBe(asked + 1);
    });

    it('L2: where the class defines a policy, an own one shadowing it is not consulted', () => {
      // The remaining shape of "the instance is not where a method comes
      // from": a class that *does* declare the policy, with an own property
      // of the same name over it. L2b covers the other shape - no class
      // policy at all - which now throws rather than being ignored, so this
      // is where the class-over-instance rule is still observable.
      const fromClass: unknown[] = [];
      const fromInstance: unknown[] = [];
      class Policed extends EvalContext {
        public override checkMemberWrite(write: EvalMemberWrite): void {
          fromClass.push(write.key);
        }
      }
      const context = new Policed({ o: { k: 1 } }, {});
      (context as unknown as Record<string, unknown>)['checkMemberWrite'] =
        (write: unknown) => { fromInstance.push(write); };

      expect(service.simpleEval('(o.k = 2, o.k)', context as never)).toBe(2);
      expect(fromClass).toEqual(['k']);
      expect(fromInstance).toEqual([]);
    });

    it('L3: an own push does not brick a context that is reused', () => {
      const context = built();
      // An arrow would recurse through the re-entrant walk in
      // `arrow-function-expression.ts` until the stack was gone, and the own
      // property persists, so every later evaluation on this context would
      // throw. The context is reused here, as `eval-signals` reuses one.
      (context as unknown as Record<string, unknown>)['push'] =
        () => service.simpleEval('n', context as never);

      expect(service.simpleEval('n + 1', context as never)).toBe(2);
      expect(service.simpleEval('n + 2', context as never)).toBe(3);
    });
  });

  describe('a context reached as data', () => {

    /** A second context, as a cross-context disclosure would reach one. */
    const foreign = () => EvalContext.fromContext({ s3cret: 'disclosed' }, {});

    const blocked = new Error(`Access to the evaluation context is blocked for security reasons`);

    it('L4: reading through a foreign context is refused', () => {
      const context = EvalContext.fromContext({ h: { v: foreign() } }, {});

      expect(() => service.simpleEval('h.v._original.s3cret', context as never)).toThrow(blocked);
    });

    it('L5: a foreign context is refused as a value, before it is anything else', () => {
      const context = EvalContext.fromContext({ h: { v: foreign() } }, {});

      expect(() => service.simpleEval('h.v', context as never)).toThrow(blocked);
    });

    it('L6: the positional `this` is not refused by that rule', () => {
      const context = built();

      // The one value in a walk that may be a context. `this.k` resolves
      // through the context's chain and reads nothing off the instance, and
      // the member visitor consumes the context as its object rather than
      // handing it on - so the funnel exempts this node and only this node.
      expect(service.simpleEval('this.n', context as never)).toBe(1);
      expect(service.simpleEval('this["n"] + 1', context as never)).toBe(2);
    });

    it('L7: a context the host named in its own data is refused as a value', () => {
      const context = built();

      // `alias` holds the walk's own context. Up to Revision 16's second
      // pass this read answered with it, and `({...alias})._original` then
      // gave the caller's object; the funnel refuses the read itself.
      expect(() => service.simpleEval('alias', context as never)).toThrow(blocked);
      expect(() => service.simpleEval('alias.n', context as never)).toThrow(blocked);
    });

    for (const [mode, options] of OPTIONS) {
      it(`L8: the routes that went round a member read are refused at the funnel (${mode})`, () => {
        // Each of these was measured to disclose `_original` in full while
        // the refusal sat on the member read alone. The first two need
        // nothing from the host at all.
        const foreign = EvalContext.fromContext({ s3cret: 'disclosed' }, options);
        const context = EvalContext.fromContext(
          { v: foreign, h: { v: foreign }, Object, JSON }, options);

        for (const source of [
          'v',
          '({...v})._original.s3cret',
          '(({_original: q}) => q.s3cret)({...v})',
          'Object.assign({}, v)._original.s3cret',
          'Object.values(v)[1]',
          'JSON.stringify(v)',
          'h.v',
          '[v][0]',
        ]) {
          expect(() => service.simpleEval(source, context as never, options)).toThrow(blocked);
        }
      });
    }

    it('L10: a foreign context before a dot is refused by the funnel, under caseInsensitive too', () => {
      // **The case the first three passes did not have**, and the reason the
      // matrix said the member-object check covered nothing: not one case
      // ran under `caseInsensitive`, and under it `markThisPositional` marks
      // *every* identifier in a member's object position - no name test, to
      // keep a locale comparison off the identifier path. An exemption keyed
      // on the node alone was therefore as wide as that mark, and a foreign
      // context named before a `.` passed the funnel. It is keyed on the
      // value's identity as well now, so the funnel is what refuses this -
      // which the message says, and which is why the two layers no longer
      // share one.
      const insensitive = { caseInsensitive: true };
      const foreign = EvalContext.fromContext({ s3cret: 'disclosed' }, {});
      // Built with the option as well as evaluated with it: a context's own
      // options are not the walk's, and `V` resolves only when the context
      // itself was built case-insensitively (`CLAUDE.md`, context resolution).
      const context = EvalContext.fromContext({ v: foreign }, insensitive);

      for (const source of ['v', 'v._original', 'v["_original"]', 'V._ORIGINAL', 'v._original.s3cret']) {
        expect(() => service.simpleEval(source, context as never, insensitive)).toThrow(blocked);
      }

      // And the walk's own context keeps its exemption under the same option.
      const own = EvalContext.fromContext({ n: 1 }, insensitive);
      expect(service.simpleEval('this.N', own as never, insensitive)).toBe(1);
    });

    it('L11: a reused `this` node is a residual, pinned as a tripwire rather than closed', () => {
      // **This case pins a limit, not a protection**, which is why it is
      // written out rather than left implicit.
      //
      // The funnel's exemption is the walk's own context in a member's
      // object position, and the mark that says "object position" is keyed
      // on the AST node and is permanent - `this-position.ts` keeps it in a
      // `WeakSet`, by design and for cost. A **host-built** AST that uses
      // one `this` node twice, member first, therefore carries the mark to
      // the second use, where the identity half cannot help: the value
      // there is the walk's own context too. The context then reaches
      // native code as an argument, or leaves nested in the result.
      //
      // No source can produce it - a parser never shares a node - and
      // `refuseThisValue` still refuses the second use when it is visited
      // first, which the second half of this case pins. Closing it needs
      // the mark consumed rather than standing, which is per-node state on
      // the hot path and a cost decision rather than an obvious win
      // (`docs/a35/plan.md` § 9, the third residual).
      const received: unknown[] = [];
      const context = EvalContext.fromContext({
        n: 1, sink: (value: unknown) => { received.push(value); return 0; },
      }, {});

      const ast = parse('[this.n, sink(1)]', { ecmaVersion: 2020 }) as AnyNode;
      const list = (ast as unknown as { body: { expression: ArrayExpression }[] })
        .body[0].expression;
      const sharedThis = (list.elements[0] as unknown as { object: unknown }).object;
      (list.elements[1] as unknown as { arguments: unknown[] }).arguments[0] = sharedThis;

      expect(evaluate(ast, EvalState.fromContext(context))).toEqual([1, 0]);
      // The limit, stated as it is: the host's own function received the
      // real context.
      expect(received[0]).toBe(context);

      // And the ordering that still refuses: the same node, non-member use
      // visited first, is refused before the mark exists.
      const reversed = parse('[sink(1), this.n]', { ecmaVersion: 2020 }) as AnyNode;
      const pair = (reversed as unknown as { body: { expression: ArrayExpression }[] })
        .body[0].expression;
      const member = pair.elements[1] as unknown as { object: unknown };
      (pair.elements[0] as unknown as { arguments: unknown[] }).arguments[0] = member.object;

      expect(() => evaluate(reversed, EvalState.fromContext(context)))
        .toThrow('Access to "this" outside a member access is blocked for security reasons');

      // Written as source - which cannot share a node - both are refused.
      expect(() => service.simpleEval('[this.n, sink(this)]', context as never)).toThrow();
    });

    it('L9: the live scope stack cannot be reached through a copy of the context', () => {
      const context = built();

      // The spread copy handed out the `Stack` by reference, and pushing onto
      // its array left a scope the program's `finally` never pops - so every
      // later evaluation on this context resolved the attacker's binding
      // first. Depth is the observable, and it is read on a reused context.
      expect(() => service.simpleEval('(({...alias})._scopes._stack.push({n: 99}, {}), 0)',
        context as never)).toThrow(blocked);

      expect(context.scopes.length).toBe(0);
      expect(service.simpleEval('n', context as never)).toBe(1);
    });
  });
});
