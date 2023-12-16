import { ArrowFunctionExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';


export const arrowFunctionExpressionVisitor = (node: ArrowFunctionExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  // (...arrowArgs: unknown[]) => {
  //   const arrowContext = evaluateParams(node, st, callback, arrowArgs);
  //   // return ExpressionEval[node.async ? 'evalAsync' : 'eval'](node.body, arrowContext);
  //   callback(node.body, st);
  //   const body = popVisitorResult(node, st);
  // }

  // id?: Identifier | null
  // params: Array<Pattern>
  callback(node.body, st);
  // const body = popVisitorResult(node, st);
  // generator: boolean
  // expression: boolean
  // async: boolean

  // console.log('arrowFunctionExpressionVisitor', node, body);

  // const args = evaluateArray(node, node.arguments, st, callback);

  // if (node.callee.type === 'MemberExpression') {
  //   const [object, , fn] = evaluateMember(node.callee, st, callback);
  //   const caller = fn as (...args: unknown[]) => unknown;
  //   const value = !caller && node.callee.optional
  //     ? undefined : caller.apply(object, args);
  //   pushVisitorResult(node, st, value);
  // } else {
  //   callback(node.callee, st);
  //   const caller = popVisitorResult(node, st) as (...args: unknown[]) => unknown;
  //   const value = !caller && node.optional
  //     ? undefined : caller.apply(st.context, args);
  //   pushVisitorResult(node, st, value);
  // }

  afterVisitor(node, st);
}

// based on evalArrowContext
// https://github.com/6utt3rfly/jse-eval/blob/main/index.ts

export const evaluateParams = (node: ArrowFunctionExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>, arrowArgs: unknown[]) => {

  const arrowContext: Record<string | number | symbol, unknown> = {};

  const params = node.params.map((param, i) => {
    switch (param.type) {
      case 'Identifier': {
          const value = arrowArgs[i];
          const key = param.name;
          arrowContext[key] = value;
        }
        break;
      // case 'MemberExpression':
      //   return evaluatePattern(param, st, callback);
      // case 'ObjectPattern':
      //   return evaluatePattern(param, st, callback);
      // case 'ArrayPattern':
      //   return evaluatePattern(param, st, callback);
      // case 'RestElement':
      //   return evaluatePattern(param, st, callback);
      // case 'AssignmentPattern':
      //   return evaluatePattern(param, st, callback);
      // default:
      //   return param;
    }
  });

  pushVisitorResult(node, st, params);
}
