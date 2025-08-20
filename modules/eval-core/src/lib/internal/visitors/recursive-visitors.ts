import {
  arrayExpressionVisitor, arrowFunctionExpressionVisitor, assignmentExpressionVisitor, awaitVisitor, binaryExpressionVisitor,
  callExpressionVisitor,conditionalExpressionVisitor, importExpressionVisitor,
  identifierVisitor, literalVisitor, logicalExpressionVisitor,
  memberExpressionVisitor, newExpressionVisitor, objectExpressionVisitor,
  taggedTemplateExpressionVisitor, templateLiteralVisitor,
  thisExpressionVisitor, unaryExpressionVisitor, updateExpressionVisitor
} from '../../internal/visitors';

import { EvalState } from '../classes/eval';

import * as walk from 'acorn-walk';



/**
 * Returns the default visitors for the recursive traversal of an abstract syntax tree.
 * @returns The default visitors object.
 */
export const getDefaultVisitors = () => {

  const visitors: walk.RecursiveVisitors<EvalState> = {};

  visitors['BinaryExpression'] = binaryExpressionVisitor;
  visitors['Identifier'] = identifierVisitor;
  visitors['Literal'] = literalVisitor;
  visitors['CallExpression'] = callExpressionVisitor;
  visitors['ImportExpression'] = importExpressionVisitor;
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
  visitors['UpdateExpression'] = updateExpressionVisitor;
  visitors['ArrowFunctionExpression'] = arrowFunctionExpressionVisitor;

  return visitors;
}
