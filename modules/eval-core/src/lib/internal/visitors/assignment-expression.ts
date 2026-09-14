import { AssignmentExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { safeSetProperty } from './prototype-pollution-guard';
import { assignToBinding } from './variable-declaration';

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

  callback(node.left, st);

  const left = popVisitorResult(node, st) as number;

  callback(node.right, st);

  const right = popVisitorResult(node, st) as number;

  const func = assignmentOperators[node.operator];

  if (!func) {
    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  } else if (!st.context) {
    throw new Error(`Context is not set.`);
  } else if (node.left.type === 'Identifier') {
    const key = st.options?.caseInsensitive
      ? st.context.getKey(node.left.name)
      : node.left.name;
    const value = func(left, right);
    // Scope first, the caller's object second. Before Phase 2 this was
    // `st.context.set(key, value)`, which consults no scope at all - so
    // `(x => (x = 99))(1)` wrote `99` into the caller's own object and left the
    // arrow's parameter untouched. See `assignToBinding` for why the fallback
    // to `set` is load-bearing rather than tidy.
    assignToBinding(st, key, value, node.left.name);
    pushVisitorResult(node, st, value);
  } else if (node.left.type === 'MemberExpression') {
    const [object, key, ] = evaluateMember(node.left, st, callback);
    const value = func(left, right);
    
    // Use safe property assignment to prevent prototype pollution
    safeSetProperty(object, key, value);
    
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}

