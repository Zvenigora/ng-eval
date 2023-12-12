import {
  arrayExpressionVisitor, assignmentExpressionVisitor, awaitVisitor, binaryExpressionVisitor,
  callExpressionVisitor,conditionalExpressionVisitor,
  identifierVisitor, literalVisitor, logicalExpressionVisitor,
  memberExpressionVisitor, newExpressionVisitor, objectExpressionVisitor,
  popVisitorResult,
  taggedTemplateExpressionVisitor, templateLiteralVisitor,
  thisExpressionVisitor, unaryExpressionVisitor
} from '../../internal/visitors';

import { EvalState } from '../../actual/classes';

import * as walk from 'acorn-walk';

export const doEval = (state: EvalState): unknown | undefined => {
  if (state.ast) {

    const visitors: walk.RecursiveVisitors<EvalState> = getDefaultVisitors();

    walk.recursive(state.ast, state, visitors);

    const value = popVisitorResult(state.ast, state)

    return value;
  }

  return undefined;
}

export const getDefaultVisitors = () => {

  const visitors: walk.RecursiveVisitors<EvalState> = {};

  visitors['BinaryExpression'] = binaryExpressionVisitor;
  visitors['Identifier'] = identifierVisitor;
  visitors['Literal'] = literalVisitor;
  visitors['CallExpression'] = callExpressionVisitor;
  visitors['AwaitExpression'] = awaitVisitor;
  visitors['ConditionalExpression'] = conditionalExpressionVisitor;
  visitors['MemberExpression'] = memberExpressionVisitor;
  visitors['ArrayExpression'] = arrayExpressionVisitor;
  visitors['UnaryExpression'] = unaryExpressionVisitor;
  visitors['LogicalExpression'] = logicalExpressionVisitor;
  visitors['ThisExpression'] = thisExpressionVisitor;
  visitors['NewExpression'] = newExpressionVisitor;
  visitors['TemplateLiteral'] = templateLiteralVisitor;
  visitors['TaggedTemplateExpression'] = taggedTemplateExpressionVisitor;
  visitors['ObjectExpression'] = objectExpressionVisitor;
  visitors['AssignmentExpression'] = assignmentExpressionVisitor;

  return visitors;
}
