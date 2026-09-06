import { WritableSignal } from '@angular/core';
import { type PathKind, type SchemaPath, type SchemaPathRules, disabled, hidden, metadata } from '@angular/forms/signals';
import { type EvalOptions, compile, defaultParserOptions, parse } from '@zvenigora/ng-eval-core';
import { type ExpressionErrorPolicy, applyErrorPolicy, toText, toVisible } from '@zvenigora/ng-eval-forms';
import { evaluateRule } from './evaluate-rule';
import { guardIdentifiers } from './guard-identifiers';
import { createModelSource } from './model-source';
import { TEXT } from './text-key';

/**
 * What `createExpressionRules` takes, and what a single registration may
 * override (plan S 5).
 */
export interface ExpressionRuleOptions {

  /**
   * Passed to the context and to the walk. `caseInsensitive` has to reach
   * both: on the context it corrects identifier keys, and on the walk it
   * corrects *property* names, which the member visitor reads off the
   * state's options.
   *
   * **A per-registration value reaches exactly one of the three places it
   * has to: the walk** (plan S 3.5.3). The other two read the **factory's**
   * options, which are fixed when `createExpressionRules` is called: the memo
   * is built once, there; the context is minted per registration by
   * `createRuleContext()` but always from that same fixed setting, so a
   * registration cannot move it. So overriding this per registration corrects
   * *property* names and leaves *identifier* keys on the factory's setting,
   * and one expression then obeys two casing rules. Set `caseInsensitive` on
   * the **factory** unless that is the behaviour you want.
   *
   * Revision 19 item 2 corrects "both are made once, at
   * `createExpressionRules` time", which was wrong about the context and is
   * the claim the README states correctly.
   */
  eval?: EvalOptions;

  /**
   * What a field property does when its expression throws at runtime.
   * Defaults to `'undefined'` here, the opposite of `eval-signals`' own
   * default - see `ExpressionErrorPolicy` for why.
   */
  onError?: ExpressionErrorPolicy;
}

/**
 * The three registrars one factory returns, one per Angular rule.
 *
 * **One call per Angular primitive, never an aggregate** (plan S 3.5.1). A
 * single `evalRules(p.x, { visible, text, disabled })` would register three
 * different Angular rules behind one name, hiding which one each property
 * maps to - which is the `/signals` reviewer checklist's item 4 expressed as
 * an API.
 *
 * Named after the **property**, not after Angular's rule: `evalVisible`
 * registers `hidden`, inverted once inside the registrar rather than in every
 * consumer's expression, so the same expression string means the same thing
 * at this entry point and at `/reactive`.
 */
export interface ExpressionRules {

  /** Registers Angular's `hidden`, inverted (plan S 3.5.1). */
  evalVisible: <TValue, TPathKind extends PathKind = PathKind.Root>(
    path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
    expression: string,
    options?: ExpressionRuleOptions
  ) => void;

  /** Registers `metadata(path, TEXT, …)` (plan S 1.2.8, S 3.5). */
  evalText: <TValue, TPathKind extends PathKind = PathKind.Root>(
    path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
    expression: string,
    options?: ExpressionRuleOptions
  ) => void;

  /**
   * Registers Angular's `disabled`.
   *
   * The `reason` is authored as a static string and is never
   * expression-derived (plan S 3.5.2). Angular's `when` returns
   * `boolean | string` and a truthy string is *both* "disabled" and "the
   * reason", so a rule yielding `'false'` would otherwise disable the field
   * with the reason `"false"` - the `toVisible` truthiness trap in a new
   * shape. Keeping the expression boolean and the reason static is what kills
   * it.
   */
  evalDisabled: <TValue, TPathKind extends PathKind = PathKind.Root>(
    path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
    expression: string,
    options?: ExpressionRuleOptions & { reason?: string }
  ) => void;
}

/**
 * Binds one model signal and returns the three expression-driven registrars.
 *
 * **A factory rather than free functions, because a `LogicFn` cannot recover
 * the source** (plan S 3.2.1). `RootFieldContext` exposes the *current*
 * field's node plus compile-time-token accessors and no root or parent
 * handle, so a rule on `p.city` evaluating `country === "US"` has no route to
 * `country` from inside the `LogicFn`. The source must be closed over at
 * registration or it is unreachable.
 *
 * ```ts
 * const rules = createExpressionRules(model);
 * const s = schema<Model>((p) => {
 *   required(p.email);                                 // Angular's
 *   rules.evalVisible(p.city, 'country === "US"');     // ours
 * });
 * const f = form(model, s);
 * ```
 *
 * **A schema *value* shared across models is the unsupported shape.** Nothing
 * stops two `form()` calls from one schema - Angular re-invokes the schema
 * body once per `form()`, so each form mints its own contexts - but the
 * registrars close over the **factory's** model, and the factory is bound to
 * one. A schema built from `createExpressionRules(modelA)` and reused for
 * `form(modelB, s)` re-registers every rule and every one of them still reads
 * model A: form B renders against form A's data, silently, with no error and
 * a fully functional form (Q9).
 *
 * The supported reuse shape is therefore a schema **function of the rules** -
 * `const makeSchema = (rules) => schema<Model>(p => …)`, called per form -
 * which keeps reuse while giving each form a factory bound to its own model.
 *
 * What one factory retains: **one private memo**, per factory, bounded by the
 * union of keys the rules mention; and, per rule per `form()`, one
 * `EvalContext` and one compiled callback. Nothing registers with a
 * `DestroyRef` and there is no `destroy()` - it all becomes garbage with the
 * form (S 3.6).
 */
export const createExpressionRules = <TModel extends object>(
  model: WritableSignal<TModel>,
  options?: ExpressionRuleOptions
): ExpressionRules => {

  // Called **once** per factory: it is what fixes the memo's lifetime, one
  // per factory rather than one per rule (plan S 3.6). Calling it per
  // registrar instead would satisfy every behavioural criterion in this phase
  // while quietly making the memo per rule, which is why the count has a spec
  // of its own.
  const source = createModelSource(model, options?.eval);

  /**
   * Resolves the two levels `ExpressionRuleOptions` arrives at:
   * **registration wins, per key** (plan S 3.5.3). Each key is resolved
   * independently and neither is a deep merge, so a registration supplying
   * only `onError` keeps the factory's `eval` and vice versa.
   *
   * Exact for `onError`, partial for `eval.caseInsensitive` - see the note on
   * `ExpressionRuleOptions.eval`. The divergence is characterised in
   * `rules.spec.ts` rather than left to be discovered.
   */
  const resolveOptions = (rule?: ExpressionRuleOptions): ExpressionRuleOptions => ({
    eval: rule?.eval ?? options?.eval,
    onError: rule?.onError ?? options?.onError,
  });

  /**
   * Everything a registrar does before handing Angular a `LogicFn`, and the
   * shape of what it returns is the phase's one structural invariant.
   *
   * **Called once per registration**, so `parse` + `compile` and
   * `createRuleContext()` happen at schema-body time - which Angular re-runs
   * once per `form()` (Q8), giving S 3.6's count of one context and one
   * compiled callback per rule per form. Nothing here re-parses per
   * derivation; risk 8 is a compile that drifts into the returned closure, and
   * `rules.invocation-count.spec.ts` counts `compile` to say it has not.
   *
   * **`guardIdentifiers` runs here, between `parse` and `compile`, and one
   * call site is deliberate** (S 3.8, revision 18 item 1). Revision 16's rule
   * rejects "the wrapper is shared" as a substitute for a per-registrar case,
   * and the discriminator it states is whether the subject is a path Angular
   * owns. This one is not: the guard throws **before any Angular primitive is
   * reached**, so in the rejecting case `hidden`, `metadata` and
   * `addDisabledReasonRule` are never called and the three registrars have
   * nothing downstream that could diverge. Contrast the invocation count and
   * the write-error bypass, whose values arrive *through* those three
   * primitives - `rules.spec.ts` gives each of them a case per registrar for
   * exactly that reason. Anything the returned closure does stays
   * registrar-level; this runs before there is a closure.
   *
   * **`applyErrorPolicy` is the outermost call in the returned closure, and
   * that is load-bearing twice over** (S 3.5). The policy has to cover the
   * coercion's *input* rather than only the walk - a registrar that coerced
   * first would hand `toVisible` a value the policy never saw - and S 6.1.1's
   * invocation instrument counts this exact call. M7 measured what a guard
   * hoisted *above* the wrapper does to that number: ground truth 1,
   * instrument **0**, which reads as "the rule did not re-run" in every
   * negative case in this package. A later guard belongs **inside** the
   * `run` callback, never ahead of this call.
   */
  const prepare = (expression: string, ruleOptions?: ExpressionRuleOptions): (() => unknown) => {
    const resolved = resolveOptions(ruleOptions);
    const node = parse(expression, defaultParserOptions);

    guardIdentifiers(expression, node);

    const compiled = compile(node);
    const context = source.createRuleContext();

    return () =>
      applyErrorPolicy(() => evaluateRule(compiled, context, resolved.eval), resolved.onError);
  };

  return {

    // Angular's **config** overload (S 1.2.7); the deprecated one takes the
    // `LogicFn` positionally. `hidden`'s `when` is the only required config of
    // the three primitives this entry point registers.
    //
    // The `!` is S 3.5.1's inversion, and it lives here rather than in every
    // consumer's expression so the same rule string means the same thing at
    // this entry point and at `/reactive`'s `visible`.
    evalVisible: (path, expression, ruleOptions) => {
      const evaluated = prepare(expression, ruleOptions);

      hidden(path, { when: () => !toVisible(evaluated()) });
    },

    // `text` has no dedicated primitive, so it is Angular's `metadata` against
    // the module-scope key of `text-key.ts` (S 1.2.8) - its own mechanism
    // rather than a second one beside it.
    evalText: (path, expression, ruleOptions) => {
      const evaluated = prepare(expression, ruleOptions);

      metadata(path, TEXT, () => toText(evaluated()));
    },

    // Angular's polarity, uninverted: `/reactive` ships no `disabled`, so no
    // expression has to mean the same thing at two entry points, and `true`
    // disabling is what an author expects (S 3.5.1).
    //
    // **The reason is a static option, never the expression's return**
    // (S 3.5.2). Angular's `when` is a single field carrying both the
    // condition and the reason - it returns `boolean | string`, and a truthy
    // string is *both* (1.2.7) - so a registrar forwarding `evaluated()` raw
    // would disable a field on the string `'false'` **with the reason
    // `"false"`**. Coercing through `toVisible` first, and sourcing the reason
    // from the registration instead, is what kills that: the string never
    // comes from the expression at all.
    //
    // A *dynamic* reason stays out of scope - it reopens the trap and needs a
    // coercion rule of its own.
    evalDisabled: (path, expression, ruleOptions) => {
      const evaluated = prepare(expression, ruleOptions);
      const reason = ruleOptions?.reason;

      disabled(path, {
        when: () => {
          // `evaluated()` first, so `applyErrorPolicy` stays the outermost
          // call in this body as it is in the other two (S 3.5). `reason` is
          // read from a closure rather than branched on ahead of the call:
          // a guard hoisted above the wrapper is M7's arrangement, which
          // reads 0 on an instrument whose ground truth is 1.
          const on = toVisible(evaluated());

          return on && reason !== undefined ? reason : on;
        },
      });
    },
  };
};
