import { AnyNode, Expression, ModuleDeclaration, Program, Statement, parse } from "acorn";
import { ParserOptions } from "../interfaces";

/**
* @description
* Parses expression and returns ES6/ES2020 AST.
* @param expr expression to parse
* @param options parser options
*/
export const doParse = (expr: string, options: ParserOptions)
  : Program | AnyNode | undefined => {
  if (options.ecmaVersion === undefined) {
    options.ecmaVersion = 2020;
  }
  const program: Program = parse(expr, options);
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
