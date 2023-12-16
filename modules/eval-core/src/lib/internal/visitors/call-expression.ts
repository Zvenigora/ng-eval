import { CallExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { evaluateMember } from './member-expression';
import { evaluateArray } from './array-expression';

export const callExpressionVisitor = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const args = evaluateArray(node, node.arguments, st, callback);

  if (node.callee.type === 'MemberExpression') {
    const [object, , fn] = evaluateMember(node.callee, st, callback);
    const caller = fn as (...args: unknown[]) => unknown;
    const value = !caller && node.callee.optional
      ? undefined : caller.apply(object, args);
    pushVisitorResult(node, st, value);
  } else {
    callback(node.callee, st);
    const caller = popVisitorResult(node, st) as (...args: unknown[]) => unknown;
    const value = !caller && node.optional
      ? undefined : caller.apply(st.context, args);
    pushVisitorResult(node, st, value);
  }

  afterVisitor(node, st);
}

export const evaluateCall = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  callback(node.callee, st);
  const caller = popVisitorResult(node, st) as (...args: unknown[]) => unknown;

  const args = node.arguments.map((argument) => {
    callback(argument, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  const value = caller.apply(st.context, args);
  return value;
}
