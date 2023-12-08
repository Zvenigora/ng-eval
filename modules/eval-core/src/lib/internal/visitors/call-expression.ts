import { CallExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const callExpressionVisitor = (node: CallExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  //const callee: Expression | Super = node.callee;
  //const optional: boolean = node.optional;

  const args = node.arguments.map((argument) => {
    callback(argument, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  callback(node.callee, st);
  const caller = popVisitorResult(node, st) as (...args: unknown[]) => unknown;

  const value = caller.apply(st.context, args);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
