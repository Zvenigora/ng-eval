import { NewExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../../actual/classes';
import { afterVisitor } from './after-visitor';

export const newExpressionVisitor = (node: NewExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const args = node.arguments.map((argument) => {
    callback(argument, st);
    const value = popVisitorResult(node, st);
    return value;
  });

  callback(node.callee, st)

  const constructor = popVisitorResult(node, st) as (...a: unknown[]) => unknown;

  const value = newFunc(constructor, ...args);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}

// based on Reflect.construct()
// https://stackoverflow.com/questions/10428603/simulate-the-new-operator-in-javascript
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct

export const newFunc = (constructor: (...a: unknown[]) => unknown, ...args: unknown[]) => {
  const obj = Reflect.construct(constructor, args);
  return obj;
}
