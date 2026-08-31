import { WritableSignal } from '@angular/core';
import type { PathKind, SchemaPath, SchemaPathRules } from '@angular/forms/signals';
import type { EvalOptions } from '@zvenigora/ng-eval-core';
import type { ExpressionErrorPolicy } from '@zvenigora/ng-eval-forms';
import { ModelSource, createModelSource } from './model-source';

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

  // Called **once** per factory, and the call is real in this step: it is
  // what fixes the memo's lifetime, one per factory rather than one per rule
  // (plan S 3.6). Calling it per registrar instead would satisfy every
  // behavioural criterion in this phase while quietly making the memo per
  // rule, which is why the count has a spec of its own.
  const source = createModelSource(model, options?.eval);

  // The registrar bodies land in steps 4 and 5, and this is the seam they
  // fill: each takes the shared `source` and its own name. The `source`
  // argument is **not read yet** - a registrar will call
  // `source.createRuleContext()` once and hold the result alongside one
  // compiled callback, so the *context* count only becomes observable in
  // step 4. What this step settles is the *memo* count, which
  // `createModelSource` owns and `model-source.spec.ts` asserts.
  //
  // Throwing rather than no-op'ing, deliberately: a no-op registrar would let
  // a schema build, a form render and every field silently keep its default,
  // which is the failure mode this entry point exists to remove.
  //
  // **The parameter order is load-bearing until step 4 reads `source`.**
  // `@typescript-eslint/no-unused-vars` runs at max-warnings 0 with no ignore
  // pattern, and its default `args: 'after-used'` reports an unused parameter
  // only when nothing after it is used. `source` is unread here and survives
  // because `registrar` follows it; swapping the two fails lint.
  const pending = (source: ModelSource, registrar: string) => (): never => {
    throw new Error(
      `@zvenigora/ng-eval-forms/signals: ${registrar} is not implemented yet. ` +
        `The factory's model source is built; the registrars arrive in a ` +
        `later step of Phase 6.`
    );
  };

  return {
    evalVisible: pending(source, 'evalVisible'),
    evalText: pending(source, 'evalText'),
    evalDisabled: pending(source, 'evalDisabled'),
  };
};
