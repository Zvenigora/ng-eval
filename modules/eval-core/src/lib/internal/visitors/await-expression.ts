import { AwaitExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

export const awaitVisitor = (node: AwaitExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const promise = new Promise<unknown | undefined>((resolve) => {

    callback(node.argument, st);

    const value = popVisitorResult(node, st) as number;

    resolve(value);
  });

  pushVisitorResult(node, st, promise);

  afterVisitor(node, st);

}

