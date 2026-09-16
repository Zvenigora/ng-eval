import { EvalContext, EvalOptions, EvalState, call, stateCallback } from '@zvenigora/ng-eval-core';

/**
 * Runs one compiled rule against one context, and leaves the context's scope
 * stack exactly as it found it.
 *
 * **This is the entry point's only path to the walk, and that is the whole
 * point of it** (plan S 3.3, `phase-4-plan.md` S 9.1). Every walk needs an
 * `EvalState`, and outside Angular DI there are exactly two ways to get one:
 * the static factory this function calls below, and the class's public
 * constructor. The one construction in this package is that line, inside this
 * function's body; S 6 gate 3 greps for both spellings and expects one hit and
 * zero.
 *
 * **Neither spelling is written out in this comment, deliberately.** Gate 3 is
 * a grep, and prose naming what it searches for is a standing hit on the file
 * the gate exists to bless - which is what revision 10 spent a revision
 * removing from that gate's third row, after a block comment in
 * `reactive/src/lib/field-schema.ts` made it read as failing. A gate with a
 * known pre-existing hit is one people learn to ignore.
 *
 * **Module-private to `/signals`, deliberately, and not merely unexported by
 * omission.** Placing it in the shared core was measured against this and
 * separates on one row that matters: a barrel re-exports whole modules, so a
 * helper the core's `public-api.ts` can reach **is published**, permanently,
 * on an entry point already released at 0.1.0 - and a published `evaluateRule`
 * *is* a second path to the walk by existing, since any consumer could call it
 * with a hand-built `EvalContext`. Here the set of callers is the set of files
 * in this directory, which is checkable by grep. The three placement
 * hypotheses that sound decisive - `/reactive` bundle weight, `@angular/core`
 * leakage, FESM size - were measured and are not: ng-packagr compiles each
 * entry point separately and the helper appears in `/reactive`'s FESM at zero
 * bytes either way (S 3.3's table).
 *
 * **Why the `finally` exists.** The scope stack is the third and longest-lived
 * of `eval-core`'s three stack invariants ([`CLAUDE.md`](../../../../../CLAUDE.md)):
 * unlike the value stack and the open-node stack, which live on the per-walk
 * `EvalState` and die with it, scopes live on the `EvalContext`. A rule holds
 * its context across every invocation Angular makes, and `EvalContext.get`
 * resolves `scopes` **first**, so one scope left behind shadows the source key
 * of that name for the life of the form. Nothing else drains it.
 *
 * **Retained, not redundant.** This was written against a specific defect -
 * `arrow-function-expression.ts` pushed a scope and popped it with no
 * `try`/`finally`, so an arrow body that threw skipped the pop - and Phase 2
 * step 0 fixed exactly that
 * ([backlog A9](../../../../../docs/backlog.md#a9)). The loop stays anyway, for
 * two reasons that outlive the fix - and they are not the same *kind* of
 * reason, which is the part an earlier version of this docblock got wrong:
 *
 *  - `package.json` declares `"@zvenigora/ng-eval-core": ">=0.3.0 <0.5.0"`.
 *    That range admits the *leaking* 0.3.0 as well as the fixed 0.4.0, so a
 *    supported installation can still be running the defect. **Range-dependent**:
 *    it would stop being true if the range were ever raised past 0.3.0.
 *  - `EvalContext.push` and `pop` are public methods on a published class: a
 *    scope can be stranded with no visitor involved at all. That is the route
 *    `evaluate-rule.spec.ts`'s containment cases now drive, because it is the
 *    one no fix inside the core's visitors can close. **True at every version**,
 *    and therefore the reason this loop is not removable at any peer range.
 *
 * **Raising the peer range does not make this removable**, and the sentence
 * that used to sit here said it did - "removal is gated on raising the peer
 * range" reads as a sufficient condition and is only a necessary one. Whoever
 * raises it retires the first reason and leaves the second untouched. The same
 * error was in the plan's step 0b, corrected there in Phase 2 step 7; this copy
 * of it was corrected in step 8.
 *
 * A third reason has expired and is recorded as gone rather than silently
 * dropped: this was also the backstop for the scope-push sites Phase 2 was
 * adding to the core. `Program`, `BlockStatement` and `ForStatement` all
 * shipped in 0.4.0, each popping in a `finally`.
 *
 * The unwind is a loop to a **depth mark**, not a single `pop()`: one throw
 * can leave more than one scope open, and unwinding to the bottom would drain
 * scopes this call did not push - `evaluate()` is re-entrant through the arrow
 * closure, so the depth on entry is not reliably zero.
 *
 * This helper deliberately does **not** apply the error policy. The throw
 * propagates, and `applyErrorPolicy` sits outside this call in the `LogicFn`
 * body (S 3.5) - containment first, then the policy - so an expression that
 * throws is contained whether the consumer asked for `'throw'`, `'undefined'`
 * or a handler.
 *
 * @param compiled - `eval-core`'s own `stateCallback`, from
 *                   `compile(parse(expression, ...))`. A registrar compiles
 *                   once and holds the callback; nothing recompiles per
 *                   invocation.
 * @param context - The rule's context, from `ModelSource.createRuleContext()`.
 *                  One per rule per `form()` (S 3.6), reused across every
 *                  invocation of that rule.
 * @param options - The walk's options, which are **not** the context's:
 *                  visitors read `caseInsensitive` off the state, so it has to
 *                  reach both to correct property names as well as identifier
 *                  keys.
 */
export const evaluateRule = (
  compiled: stateCallback,
  context: EvalContext,
  options?: EvalOptions
): unknown => {

  const depth = context.scopes.length;

  // `fromContext` short-circuits on identity for an `EvalContext`, so this
  // builds a fresh per-walk state around the *same* context rather than
  // copying it - which is what lets one context back many invocations, and
  // equally what makes a leaked scope durable.
  const state = EvalState.fromContext(context, options);

  try {
    return call(compiled, state);
  } finally {
    while (context.scopes.length > depth) {
      context.pop();
    }
  }
};
