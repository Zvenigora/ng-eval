import {
  arrayExpressionVisitor, arrowFunctionExpressionVisitor, assignmentExpressionVisitor, awaitVisitor, binaryExpressionVisitor,
  callExpressionVisitor,conditionalExpressionVisitor, importExpressionVisitor,
  blockStatementVisitor, emptyStatementVisitor, expressionStatementVisitor,
  identifierVisitor, literalVisitor, logicalExpressionVisitor,
  memberExpressionVisitor, newExpressionVisitor, objectExpressionVisitor,
  programVisitor, variableDeclarationVisitor,
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

  // The statement family. `Program` is the root of every walk that arrives
  // through `EvalService`, whose parser options leave `extractExpressions` off.
  visitors['Program'] = programVisitor;
  visitors['ExpressionStatement'] = expressionStatementVisitor;
  visitors['EmptyStatement'] = emptyStatementVisitor;
  visitors['BlockStatement'] = blockStatementVisitor;
  visitors['VariableDeclaration'] = variableDeclarationVisitor;

  return visitors;
}
