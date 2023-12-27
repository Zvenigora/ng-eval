import { AnyNode, Expression, ModuleDeclaration,
  Program, Statement, parse as _parse } from "acorn";
import { ParserOptions } from "../interfaces";
import * as acorn from 'acorn';

/**
* @description
* Parses expression and returns ES6/ES2020 AST.
* @param expr expression to parse
* @param options parser options
*/
export const parse = (expr: string, options: ParserOptions)
  : Program | AnyNode | undefined => {
  options = {ecmaVersion: 2020, ...options};
  const acornOptions: acorn.Options = {ecmaVersion: 2020, ...options};
  const program: Program = _parse(expr, acornOptions);
  if (!options.extractExpressions) {
    return program;
  }
  return extractExpression(program);
}

/**
* @description
* Walks through the AST and extracts first expression.
* @param expr expression to parse
*/
export const extractExpression = (program: Program)
  : Expression | undefined => {

  if (program.body.length === 1) {
    const expression: Statement | ModuleDeclaration = program.body[0];
    if (expression.type === 'ExpressionStatement') {
      return expression.expression as Expression;
    }
  }

  return undefined;
}
