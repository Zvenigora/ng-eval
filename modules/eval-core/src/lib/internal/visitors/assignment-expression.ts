import { AssignmentExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { safeSetProperty } from './prototype-pollution-guard';
import { consultMemberWrite } from './member-write-policy';
import { assignToBinding } from './variable-declaration';
import { unwrapParentheses } from './utils';

const assignmentOperators = {
  '=': (left: number, value: number) => { return left = value; },
  '+=': (left: number, value: number) => { return left += value; },
  '-=': (left: number, value: number) => { return left -= value; },
  '*=': (left: number, value: number) => { return left *= value; },
  '/=': (left: number, value: number) => { return left /= value; },
  '%=': (left: number, value: number) => { return left %= value; },
  '**=': (left: number, value: number) => { return left **= value; },
  '<<=': (left: number, value: number) => { return left <<= value; },
  '>>=': (left: number, value: number) => { return left >>= value; },
  '>>>=': (left: number, value: number) => { return left >>>= value; },
  '&=': (left: number, value: number) => { return left &= value; },
  '^=': (left: number, value: number) => { return left ^= value; },
  '|=': (left: number, value: number) => { return left |= value; },
  '&&=': (left: number, value: number) => { return left &&= value; },
  '||=': (left: number, value: number) => { return left ||= value; },
  '??=': (left: number, value: number) => { return left ??= value; },
};


export const assignmentExpressionVisitor = (node: AssignmentExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // `(a) = 1` under `preserveParens` arrives wrapped (`docs/backlog-retired.md`
  // A2). Any target other than an identifier or a member - destructuring,
  // `[a, b] = arr` and `({m} = o)` - used to fall out of the chain below having
  // pushed nothing, silently changing nothing. It is rejected here, above the
  // operands rather than as the chain's final `else`, so that neither side is
  // evaluated for an assignment that cannot happen: a right-hand side with an
  // effect would otherwise run first. Pushes nothing: `evaluate`'s `catch`
  // closes the open nodes.
  const target = unwrapParentheses(node.left);
  if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
    throw new Error(`Unsupported assignment target: ${target.type}`);
  }

  callback(node.left, st);

  const left = popVisitorResult(node, st) as number;

  callback(node.right, st);

  const right = popVisitorResult(node, st) as number;

  const func = assignmentOperators[node.operator];

  if (!func) {
    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  } else if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (target.type === 'Identifier') {
    const key = st.options?.caseInsensitive
      ? st.context.getKey(target.name)
      : target.name;
    const value = func(left, right);
    // Scope first, the caller's object second. Before Phase 2 this was
    // `st.context.set(key, value)`, which consults no scope at all - so
    // `(x => (x = 99))(1)` wrote `99` into the caller's own object and left the
    // arrow's parameter untouched. See `assignToBinding` for why the fallback
    // to `set` is load-bearing rather than tidy.
    assignToBinding(st, key, value, target.name);
    pushVisitorResult(node, st, value);
  } else if (target.type === 'MemberExpression') {
    const [object, key, ] = evaluateMember(target, st, callback);
    const value = func(left, right);

    // A member write never reaches `EvalContext.set`, so a context policing
    // writes is asked here instead - `EvalContext.checkMemberWrite`.
    const created = st.createdObjects;
    if (created) {
      consultMemberWrite(st, created, object, key);
    }

    // Use safe property assignment to prevent prototype pollution
    safeSetProperty(object, key, value);
    
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}

