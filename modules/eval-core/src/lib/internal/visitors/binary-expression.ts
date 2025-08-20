import { BinaryExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { pushVisitorResult, popVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';
// import { getCachedVisitorResult, setCachedVisitorResult } from './visitor-result-cache';

/**
 * Converts value to primitive for comparison operations
 */
const toPrimitive = (value: unknown, hint?: 'string' | 'number'): string | number | boolean | null | undefined | symbol | bigint => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || 
      typeof value === 'symbol' || typeof value === 'bigint') return value;
  
  // For objects, call valueOf/toString based on hint
  if (typeof value === 'object') {
    if (hint === 'number') {
      const valueOf = (value as Record<string, unknown>).valueOf;
      if (typeof valueOf === 'function') {
        const result = valueOf.call(value);
        if (typeof result !== 'object') return result as string | number | boolean | null | undefined | symbol | bigint;
      }
      const toString = (value as Record<string, unknown>).toString;
      if (typeof toString === 'function') {
        return toString.call(value) as string;
      }
    } else {
      const toString = (value as Record<string, unknown>).toString;
      if (typeof toString === 'function') {
        const result = toString.call(value);
        if (typeof result === 'string') return result;
      }
      const valueOf = (value as Record<string, unknown>).valueOf;
      if (typeof valueOf === 'function') {
        const result = valueOf.call(value);
        if (typeof result !== 'object') return result as string | number | boolean | null | undefined | symbol | bigint;
      }
    }
  }
  
  return String(value);
};

/**
 * Safely evaluates binary operations with proper type coercion
 */
const evaluateBinaryOperation = (operator: string, left: unknown, right: unknown): unknown => {
  switch (operator) {
    case '+': {
      // Handle string concatenation and numeric addition according to JavaScript rules
      const leftPrim = toPrimitive(left);
      const rightPrim = toPrimitive(right);
      if (typeof leftPrim === 'string' || typeof rightPrim === 'string') {
        return String(leftPrim) + String(rightPrim);
      }
      return Number(leftPrim) + Number(rightPrim);
    }
      
    case '-':
      return Number(toPrimitive(left, 'number')) - Number(toPrimitive(right, 'number'));
    case '*':
      return Number(toPrimitive(left, 'number')) * Number(toPrimitive(right, 'number'));
    case '/':
      return Number(toPrimitive(left, 'number')) / Number(toPrimitive(right, 'number'));
    case '%':
      return Number(toPrimitive(left, 'number')) % Number(toPrimitive(right, 'number'));
    case '**':
      return Number(toPrimitive(left, 'number')) ** Number(toPrimitive(right, 'number'));
      
    // Bitwise operations - convert to 32-bit integers
    case '<<':
      return (Number(toPrimitive(left, 'number')) | 0) << (Number(toPrimitive(right, 'number')) | 0);
    case '>>':
      return (Number(toPrimitive(left, 'number')) | 0) >> (Number(toPrimitive(right, 'number')) | 0);
    case '>>>':
      return (Number(toPrimitive(left, 'number')) >>> 0) >>> (Number(toPrimitive(right, 'number')) | 0);
    case '&':
      return (Number(toPrimitive(left, 'number')) | 0) & (Number(toPrimitive(right, 'number')) | 0);
    case '^':
      return (Number(toPrimitive(left, 'number')) | 0) ^ (Number(toPrimitive(right, 'number')) | 0);
    case '|':
      return (Number(toPrimitive(left, 'number')) | 0) | (Number(toPrimitive(right, 'number')) | 0);
      
    // Comparison operations - follow JavaScript's abstract comparison rules
    case '==':
      return left == right;
    case '!=':
      return left != right;
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '<': {
      const leftComp = toPrimitive(left, 'number');
      const rightComp = toPrimitive(right, 'number');
      // If both are strings, do string comparison
      if (typeof leftComp === 'string' && typeof rightComp === 'string') {
        return leftComp < rightComp;
      }
      return Number(leftComp) < Number(rightComp);
    }
    case '<=': {
      const leftLE = toPrimitive(left, 'number');
      const rightLE = toPrimitive(right, 'number');
      if (typeof leftLE === 'string' && typeof rightLE === 'string') {
        return leftLE <= rightLE;
      }
      return Number(leftLE) <= Number(rightLE);
    }
    case '>': {
      const leftGT = toPrimitive(left, 'number');
      const rightGT = toPrimitive(right, 'number');
      if (typeof leftGT === 'string' && typeof rightGT === 'string') {
        return leftGT > rightGT;
      }
      return Number(leftGT) > Number(rightGT);
    }
    case '>=': {
      const leftGE = toPrimitive(left, 'number');
      const rightGE = toPrimitive(right, 'number');
      if (typeof leftGE === 'string' && typeof rightGE === 'string') {
        return leftGE >= rightGE;
      }
      return Number(leftGE) >= Number(rightGE);
    }
      
    // Special operations
    case 'in': {
      if (typeof left === 'string' || typeof left === 'number' || typeof left === 'symbol') {
        if (right == null) {
          throw new Error(`Cannot use 'in' operator with null or undefined right operand`);
        }
        return left in (right as object);
      }
      throw new Error(`Invalid left operand for 'in' operator: ${typeof left}`);
    }
      
    case 'instanceof': {
      if (typeof right === 'function') {
        return left instanceof right;
      }
      throw new Error(`Right operand of 'instanceof' is not a constructor`);
    }
      
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

  // Disable visitor result caching for now due to context sensitivity issues
  // const cachedResult = getCachedVisitorResult(node, st.context);
  // if (cachedResult !== undefined) {
  //   pushVisitorResult(node, st, cachedResult);
  //   afterVisitor(node, st);
  //   return;
  // }

  callback(node.left, st);
  const left = popVisitorResult(node, st);

  callback(node.right, st);
  const right = popVisitorResult(node, st);

  const value = evaluateBinaryOperation(node.operator, left, right);

  // Disable visitor result caching for now
  // setCachedVisitorResult(node, st.context, value);

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
