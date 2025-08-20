import { BinaryExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

/**
 * Safely evaluates binary operations with proper type coercion
 */
const evaluateBinaryOperation = (operator: string, left: unknown, right: unknown): unknown => {
  switch (operator) {
    case '+':
      // Handle string concatenation and numeric addition according to JavaScript rules
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left) + String(right);
      }
      return Number(left) + Number(right);
      
    case '-':
      return Number(left) - Number(right);
    case '*':
      return Number(left) * Number(right);
    case '/':
      return Number(left) / Number(right);
    case '%':
      return Number(left) % Number(right);
    case '**':
      return Number(left) ** Number(right);
      
    // Bitwise operations - convert to 32-bit integers
    case '<<':
      return (Number(left) | 0) << (Number(right) | 0);
    case '>>':
      return (Number(left) | 0) >> (Number(right) | 0);
    case '>>>':
      return (Number(left) >>> 0) >>> (Number(right) | 0);
    case '&':
      return (Number(left) | 0) & (Number(right) | 0);
    case '^':
      return (Number(left) | 0) ^ (Number(right) | 0);
    case '|':
      return (Number(left) | 0) | (Number(right) | 0);
      
    // Comparison operations
    case '==':
      return left == right;
    case '!=':
      return left != right;
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '<':
      return (left as string | number) < (right as string | number);
    case '<=':
      return (left as string | number) <= (right as string | number);
    case '>':
      return (left as string | number) > (right as string | number);
    case '>=':
      return (left as string | number) >= (right as string | number);
      
    // Special operations
    case 'in':
      if (typeof left === 'string' || typeof left === 'number' || typeof left === 'symbol') {
        return left in (right as object);
      }
      throw new Error(`Invalid left operand for 'in' operator: ${typeof left}`);
      
    case 'instanceof':
      if (typeof right === 'function') {
        return left instanceof right;
      }
      throw new Error(`Right operand of 'instanceof' is not a constructor`);
      
    case '??':
      return left ?? right;
      
    default:
      throw new Error(`Unsupported binary operator: ${operator}`);
  }
};

/**
 * Safely evaluates binary expressions with proper type handling
 */
export const binaryExpressionVisitor = (node: BinaryExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  callback(node.left, st);
  const left = popVisitorResult(node, st);

  callback(node.right, st);
  const right = popVisitorResult(node, st);

  const value = evaluateBinaryOperation(node.operator, left, right);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
