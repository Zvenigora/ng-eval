import { signal } from '@angular/core';
import { EvalContext, compile, defaultParserOptions, parse, stateCallback } from '@zvenigora/ng-eval-core';
import { ExpressionErrorPolicy, applyErrorPolicy } from '@zvenigora/ng-eval-forms';
// A spec-only import, and the plan says so in as many words: S 5's import
// list is normative over **non-spec** files, and it puts
// `SignalContextWriteError` out of bounds there precisely so the adapter
// cannot grow its own copy of the bypass (S 3.4.1). Asserting on the class is
// the one thing that cannot be done without naming it.
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';
import { evaluateRule } from './evaluate-rule';
import { createModelSource } from './model-source';

// The choke point and the error policy, together in one file because both are
// only observable through a walk (plan S 4, step 3).
//
// Every case here drives a **real** compiled callback over a **real** context
// from `createModelSource`. A hand-built `EvalContext` would make the write
// arm unwritable - it is `createFieldContext`'s class, not its sources, that
// throws on `set` (S 3.2.1, second bullet) - and a stubbed `stateCallback`
// would make the containment case vacuous, since nothing but the walk pushes
// a scope.

const compileExpression = (expression: string): stateCallback =>
  compile(parse(expression, defaultParserOptions));

/**
 * The fixture both containment cases share: a model whose `boom` throws on
 * its **first** call only.
 *
 * Throwing once rather than always is what lets one rule be invoked twice on
 * one context - the failure S 3.6 says actually happens, one `LogicFn`
 * re-invoked by Angular, not two rules meeting. A permanently-throwing `boom`
 * would make the second invocation throw for its own reason and the second
 * read would never be reached.
 *
 * The arrow's parameter is named `country`, shadowing the model's own key.
 * That is the discriminating condition: a scope left behind holds
 * `country = 1`, and `EvalContext.get` resolves `scopes` **first**, so the
 * next read of `country` on this context returns the arrow's parameter
 * instead of `'US'`. Without the name collision the leak would be invisible
 * and "scopes is 0" would be a claim about a number nothing can move.
 */
const throwOnceFixture = () => {
  let calls = 0;

  const model = signal<Record<string, unknown>>({
    country: 'US',
    boom: () => {
      calls += 1;

      if (calls === 1) {
        throw new Error('boom');
      }

      return 'ok';
    },
  });

  const context = createModelSource(model).createRuleContext();

  // `country` is read at the top level *and* rebound by the arrow's
  // parameter, so one expression carries both halves of the criterion.
  const compiled = compileExpression('country + [1].map(country => boom())[0]');

  return { compiled, context };
};

describe('evaluateRule', () => {

  it('should evaluate a rule against the source context', () => {
    const model = signal<Record<string, unknown>>({ country: 'US' });
    const context = createModelSource(model).createRuleContext();

    expect(evaluateRule(compileExpression('country === "US"'), context)).toBe(true);
  });

  it('should pass its options to the walk and not only to the context', () => {
    // The third parameter is wiring, and wiring is not covered by testing what
    // it wires to: drop it from the `fromContext` call and every other case
    // here stays green, so step 4 would forward `options.eval` into a
    // parameter that goes nowhere.
    //
    // The discriminating condition is CLAUDE.md's "the context's own options
    // are **not** the walk's options": the context here is built **without**
    // options, so `caseInsensitive` can only have arrived through the
    // argument below. `country` is spelled exactly and resolves either way -
    // it is the *property* name `NAME` that the member visitor corrects, and
    // it reads that off the state.
    const model = signal<Record<string, unknown>>({ address: { name: 'Boston' } });
    const context = createModelSource(model).createRuleContext();

    expect(evaluateRule(compileExpression('address.NAME'), context, { caseInsensitive: true })).toBe('Boston');
  });

  it('should leave the scope stack at its pre-walk depth when an arrow body throws', () => {
    const { compiled, context } = throwOnceFixture();

    expect(context.scopes.length).toBe(0);

    // The throw is the point: `arrow-function-expression.ts:14-19` pushes a
    // scope and pops it with no `try`/`finally`, so a body that throws skips
    // the pop and the scope outlives the walk. The context is per rule and
    // reused across invocations, so nothing else would ever drain it.
    expect(() => evaluateRule(compiled, context)).toThrow(/boom/);

    expect(context.scopes.length).toBe(0);
  });

  it('should resolve its own source key when the same rule is invoked again after a throw', () => {
    const { compiled, context } = throwOnceFixture();

    expect(() => evaluateRule(compiled, context)).toThrow(/boom/);

    // The half that discriminates. A leaked scope holds `country = 1`, and
    // `get` reads `scopes` before `lookups`, so this returns `1` and the
    // second invocation returns `'1ok'` when containment is removed.
    expect(context.get('country')).toBe('US');
    expect(evaluateRule(compiled, context)).toBe('USok');
  });
});

describe('applyErrorPolicy over evaluateRule', () => {

  // **One call site for every arm** - the criterion's "through one
  // `applyErrorPolicy` call". A second helper would let one arm pass against a
  // policy shape another never exercised, which is the form risk 2 is about.
  //
  // The compile is hoisted **out** of the callback deliberately: production
  // shape is one compile per rule per `form()`, held across every invocation
  // (S 3.6), and this file is the first thing step 4 reads for the
  // `applyErrorPolicy` / `evaluateRule` pairing. A compile inside the `run`
  // closure is risk 8 - re-parsing per derivation, correct results and
  // silently slow - modelled in the one place most likely to be copied.
  const runUnderPolicy = (
    context: EvalContext,
    expression: string,
    policy: ExpressionErrorPolicy = 'undefined'
  ): unknown => {
    const compiled = compileExpression(expression);

    return applyErrorPolicy(() => evaluateRule(compiled, context), policy);
  };

  const fixture = (): EvalContext => {
    const model = signal<Record<string, unknown>>({
      country: 'US',
      boom: () => {
        throw new Error('boom');
      },
    });

    return createModelSource(model).createRuleContext();
  };

  it('should route an ordinary error through the policy', () => {
    // Not padding: with only the write-error arm below,
    // `applyErrorPolicy = (run) => run()` passes, because the error
    // propagates from having never been caught. This arm is what proves the
    // `catch` exists at all.
    expect(runUnderPolicy(fixture(), 'boom()')).toBeUndefined();
  });

  it('should re-throw a write error through the same policy', () => {
    // And this arm proves the bypass inside the `catch`. An assigning
    // expression is illegal on every recompute with every dataset - a bug in
    // the rule's own syntax - so `'undefined'` would render it as a
    // permanently blank field with nothing in the console (1.2.11).
    //
    // The assertion is on the **class** because that is what survives the
    // package boundary: the error is thrown by `eval-signals`' own context,
    // not constructed here, so this also covers the one failure mode no
    // import syntax prevents - two resolved copies of that package giving two
    // constructors, for which `instanceof` is silently false.
    expect(() => runUnderPolicy(fixture(), 'country = "CA"')).toThrow(SignalContextWriteError);
  });

  it('should re-throw a write error under a handler policy without calling the handler', () => {
    // `applyErrorPolicy`'s docblock claims the bypass holds in **every** mode,
    // and the two arms above only reach `'undefined'`. They do not pin the
    // ordering the claim rests on: a later fast path -
    // `if (typeof policy === 'function') return policy(error)` placed *ahead*
    // of the `instanceof` - passes both of them and swallows a write error for
    // the one mode a form-builder consumer is most likely to configure.
    //
    // Asserting the handler was not called is what separates "the bypass
    // re-threw it" from "the handler happened to re-throw it"; without that
    // half, a handler that re-throws would satisfy this arm with the bypass
    // gone.
    const handler = jest.fn((error: unknown) => error);

    expect(() => runUnderPolicy(fixture(), 'country = "CA"', handler)).toThrow(SignalContextWriteError);
    expect(handler).toHaveBeenCalledTimes(0);
  });

  it('should route an ordinary error to a handler policy', () => {
    // The companion to the arm above, and it is what keeps that one honest:
    // without it, a bypass that swallowed the policy branch entirely - or a
    // handler never wired up at all - would still show a handler at zero
    // calls. This is the same two-arm shape as the pair above, one mode over.
    const handler = jest.fn(() => 'handled');

    expect(runUnderPolicy(fixture(), 'boom()', handler)).toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
