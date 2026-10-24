import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
// Direct, not through the `classes/eval` barrel, as
// `prototype-pollution-guard.ts` takes it: `instanceof` needs the class and
// not its type, and the narrow edge is the one this family uses.
import { EvalContext } from '../classes/eval/eval-context';
import { refuseDangerousRead } from './dangerous-values';
import { refuseContextRead } from './prototype-pollution-guard';
import { isThisPositional } from './this-position';

/**
 * The two push helpers each carry their own trace-bound call rather than
 * sharing one.
 *
 * **Why the read is at these two sites.** `st.maxTraceItems` is the *walk's*
 * bound. `EvalResult` cannot read it for itself: it holds a context, and a
 * context's options are not the walk's - the split `CLAUDE.md` documents for
 * `caseInsensitive`. So the option is read where `st` is in hand and passed in.
 *
 * **Why the one line is duplicated rather than factored.** A shared helper put
 * a third frame on a path taken once per node - `push` -> helper ->
 * `addTraceBounded` -> `EvalTrace.add` - to save one identical line. Measured
 * both ways at 50,000 walks of `2 + 3 * a`, the difference was inside
 * run-to-run noise, so this is not a speed claim; it is that the helper cost a
 * frame on the hot path and bought nothing, and that `addTraceBounded`'s own
 * docblock claims one call per push, which only this shape makes true.
 * {@link refuseFunnelledValue} is the one frame the push path does take, since
 * an assignment target read without a push needs the same two tests, and a
 * second copy of them could drift from the first (`docs/a45/plan.md` § 3.2;
 * its cost is measured by that plan's step 4).
 *
 * **The value stack is not bounded and must not be.** It is how visitors return
 * values to each other, and dropping an entry desynchronises every node above
 * it. Only the trace - which nothing in this library reads - is capped.
 *
 * **Every value pushed here passes the funnel**, {@link refuseFunnelledValue}.
 * `pushVisitorResultAsync` has no caller, and no check.
 */
export const pushVisitorResult = (node: AnyNode, st: EvalState, value: unknown) => {
  refuseFunnelledValue(node, st, value);
  const result = st.result;
  result.stack.push(value);
  result.addTraceBounded(node, value, st.maxTraceItems);
  return value;
}

/**
 * The funnel's two tests, made on every pushed value and on a value a visitor
 * reads without pushing it: a compound or logical assignment's target, which
 * `assignment-expression.ts` reads once and does not walk
 * (`docs/backlog.md` A45, part 2). One definition serves both, so what the
 * funnel refuses cannot differ between them.
 *
 * **A function value passes `refuseDangerousRead`** (`docs/a35/plan.md`
 * § 3.3): a dangerous function is refused wherever it was read, unless the
 * node is a callee, a tag or `typeof`'s operand. The call is behind
 * `typeof value === 'function'`, so a value that is not a function pays one
 * comparison on this per-node path. `await` pushes its promise here too,
 * which is not a function.
 */
export const refuseFunnelledValue = (node: AnyNode, st: EvalState, value: unknown): void => {
  if (typeof value === 'function') {
    refuseDangerousRead(node, value);
  } else if (value instanceof EvalContext
    && !(value === st.context && isThisPositional(node))) {
    // An `EvalContext` is not a value an expression may hold
    // (`prototype-pollution-guard.ts`'s `refuseContextRead`).
    //
    // **The exemption is the walk's own context in a member's object
    // position**, which the member visitor consumes as its object and never
    // hands on. Both halves are required, and the identity half is the one
    // the step's third code review added: `markThisPositional` marks a
    // member's object whenever it *could* resolve to `this`, and under
    // `caseInsensitive` that is every identifier, with no name test - for a
    // reason of its own, to keep a locale comparison off the identifier
    // path. Keyed on the node alone, the exemption was therefore as wide as
    // that mark, and a host-supplied *foreign* context named before a `.`
    // passed the funnel unrefused. Keyed on the value too, it is exactly the
    // one context that has nowhere else to go.
    //
    // The `instanceof` is the gate, so the identity compare and the
    // `WeakSet` lookup run only for a value that is a context at all.
    //
    // **This is the only boundary, with nothing behind it.** A by-class
    // refusal in `member-expression.ts` used to stand second, and it was
    // removed once this condition made it unreachable and it was measured at
    // ~2.5% of every member read (`docs/a35/plan.md` M20). So a change to
    // the condition on this line is a disclosure, not a narrowing, and its
    // only tripwires are L10 and L11 of
    // `eval.service.context-write.spec.ts`.
    refuseContextRead();
  }
}

export const popVisitorResult = (node: AnyNode, st: EvalState): unknown => {
  const result = st.result;
  const value = result.stack.pop();
  return value;
}

export const pushVisitorResultAsync = (node: AnyNode, st: EvalState, value: Promise<unknown>) => {
  const result = st.result;
  result.stack.push(value);
  result.addTraceBounded(node, value, st.maxTraceItems);
  return value;
}

export const popVisitorResultAsync = (node: AnyNode, st: EvalState): Promise<unknown> => {
  const result = st.result;
  const value = result.stack.pop() as Promise<unknown>;
  return value;
}
