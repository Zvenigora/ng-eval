import { AssignmentExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult, refuseFunnelledValue } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember, resolveMemberTarget } from './member-expression';
import { readIdentifierTarget, refuseIdentifierTarget } from './identifier';
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

  // The target is not walked, and is evaluated once, before the right side
  // (`docs/backlog.md` A45, part 2). `=` reads nothing of it, as JavaScript's
  // `=` does not: an identifier gets the identifier visitor's checks, and a
  // member is resolved to its object and key. A compound or logical target is
  // read once, as an update reads its operand: a member through one
  // `evaluateMember` call, whose object and matched key the write reuses
  // (A44), and an identifier through the identifier visitor's own read. The
  // value read is not pushed, so it is given the funnel's tests here, or a
  // listed function read as a target would be combined and written where
  // `fetch || 1` refuses it.
  const plain = node.operator === '=';
  let left: number | undefined;
  let targetObject: unknown;
  let targetKey: unknown;
  if (target.type === 'Identifier') {
    if (plain) {
      refuseIdentifierTarget(target, st);
    } else {
      left = readIdentifierTarget(target, st) as number;
    }
  } else if (plain) {
    [targetObject, targetKey] = resolveMemberTarget(target, st, callback);
  } else {
    const [object, , value, , key] = evaluateMember(target, st, callback);
    targetObject = object;
    targetKey = key;
    left = value as number;
  }
  if (!plain) {
    refuseFunnelledValue(target, st, left);
  }

  // A logical assignment that short-circuits gives `left` and does nothing
  // more: its right side is not evaluated and nothing is written, so no write
  // policy is asked (`docs/backlog.md` A45, part 1). The rule is
  // `logical-expression.ts`'s, for `||`, `&&` and `??`.
  if ((node.operator === '||=' && left) ||
      (node.operator === '&&=' && !left) ||
      (node.operator === '??=' && left !== null && left !== undefined)) {
    pushVisitorResult(node, st, left);
    afterVisitor(node, st);
    return;
  }

  callback(node.right, st);

  const right = popVisitorResult(node, st) as number;

  const func = assignmentOperators[node.operator];

  if (!func) {
    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  } else if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (target.type === 'Identifier') {
    // `getKey` gives `undefined` when `get` finds nothing - an absent name, or
    // one bound to `undefined` - and that key was written as it came
    // (`docs/backlog-retired.md` A43). The name as written is the fallback
    // `identifier.ts` already takes.
    const key = st.options?.caseInsensitive
      ? st.context.getKey(target.name) ?? target.name
      : target.name;
    const value = func(left as number, right);
    // Scope first, the caller's object second. Before Phase 2 this was
    // `st.context.set(key, value)`, which consults no scope at all - so
    // `(x => (x = 99))(1)` wrote `99` into the caller's own object and left the
    // arrow's parameter untouched. See `assignToBinding` for why the fallback
    // to `set` is load-bearing rather than tidy.
    assignToBinding(st, key, value, target.name);
    pushVisitorResult(node, st, value);
  } else if (target.type === 'MemberExpression') {
    const object = targetObject;
    const key = targetKey;
    const value = func(left as number, right);

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

