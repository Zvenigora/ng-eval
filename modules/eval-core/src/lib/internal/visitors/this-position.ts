import { AnyNode } from 'acorn';
import { unwrapParentheses } from './utils';

/**
 * Security: `this` by position (`docs/a35/plan.md` § 8 q4, step 7).
 *
 * `this` is evaluated only as the object of a member access. There `this.k`,
 * `this["k"]` and `this.fn()` resolve `k` and `fn` against the context, as an
 * identifier does (`member-expression.ts`). Anywhere else it throws. Up to
 * 0.12.1 it evaluated to the walk's `EvalContext` wherever it was written,
 * which is the route `docs/backlog.md` A39 records.
 *
 * The position is a mark on the AST node, as the funnel's exemptions are
 * (`dangerous-values.ts`): `evaluateMember` marks its object before it visits
 * it, and the `this` and identifier visitors refuse a `this` that is not
 * marked. A mark records the node's place in the AST, which never changes, so
 * it is never cleared. Weak, so a cached AST that is dropped takes its marks
 * with it.
 *
 * Keyed by node object, so it assumes a tree, as `dangerous-values.ts`'s marks
 * do: a host-built AST that reused one `this` node as a member's object and
 * elsewhere would see the other place refused until the member had been
 * visited once, and allowed after.
 */
const positionalNodes = new WeakSet<AnyNode>();

/**
 * Marks a member's `object` when it can be a `this`: a
 * `ThisExpression`, or an identifier the identifier visitor may resolve as
 * `this`. Case-sensitively that is one spelt `this`, which only a host-built
 * AST holds. Under `caseInsensitive` it is any identifier, with no name test:
 * the visitor's own test, `equalIgnoreCase`, decides which is `this`, and a
 * mark is read only for a node it has decided is one. So the two cannot
 * disagree on a name, and a member access does not pay a locale comparison
 * per identifier object, which this path otherwise would.
 *
 * Under `preserveParens` the object's parentheses are stripped first, as the
 * write visitors strip a target's (`docs/backlog-retired.md` A2): `(this).k`
 * is the member read `this.k` is, and the walk passes through the parentheses
 * to the `this` inside. Nothing else is stripped, so in `(0, this).k` the
 * object is the sequence, and the `this` under it is refused.
 *
 * Runs once per member access, before its object is visited.
 */
export const markThisPositional = (object: AnyNode, caseInsensitive: boolean): void => {
  const node = unwrapParentheses(object);
  if (node.type === 'ThisExpression'
    || (node.type === 'Identifier' && (caseInsensitive || node.name === 'this'))) {
    positionalNodes.add(node);
  }
};

/** Whether `node` is a `this` that {@link markThisPositional} marked. */
export const isThisPositional = (node: AnyNode): boolean => positionalNodes.has(node);

/**
 * Refuses a `this` that is not a member's object: as a value, an argument, an
 * operand, `typeof`'s operand included, or anything else that is not the
 * object of a member access.
 */
export const refuseThisValue = (node: AnyNode): void => {
  if (!isThisPositional(node)) {
    throw new Error('Access to "this" outside a member access is blocked for security reasons');
  }
};
