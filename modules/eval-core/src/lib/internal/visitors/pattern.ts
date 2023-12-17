import { ArrayPattern, Identifier, MemberExpression,
  ObjectPattern, Pattern, RestElement } from 'acorn';
import * as walk from 'acorn-walk';
import { EvalState } from '../classes/eval';
import { popVisitorResult } from '.';
import { BaseContext } from '../classes/common';


// based on evalArrowContext
// https://github.com/6utt3rfly/jse-eval/blob/main/index.ts

export const evaluatePatterns = (patterns: Pattern[], st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown[]) => {

  let context: BaseContext = {};

  patterns.map((pattern, i) => {
    switch (pattern.type) {
      case 'Identifier': {
          const object = evaluateIdentifier(pattern, st, args[i]);
          context = {...context, ...object};
        }
        break;
      case 'MemberExpression': {
          const object = evaluateMemberExpression(pattern, st, callback, args[i]);
          context = {...context, ...object};
        }
        break;
      case 'ObjectPattern': {
          const object = evaluateObjectPattern(pattern, st, callback, args[i]);
          context = {...context, ...object};
        }
        break;
      case 'ArrayPattern': {
          const object = evaluateArrayPattern(pattern, st, callback, args[i] as unknown[]);
          context = {...context, ...object};
        }
        break;
      case 'RestElement': {
          const object = evaluateRestElement(pattern, st, callback, args.slice(i));
          context = {...context, ...object};
        }
        break;
      // case 'AssignmentPattern': {
      //     const object = evaluateAssignmentPattern(pattern, st, callback, args[i]);
      //     context = {...context, ...object};
      //   }
      //   break;
      }
  });

  return context;
}

export const evaluatePattern = (pattern: Pattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, arg: unknown): BaseContext => {

  switch (pattern.type) {
    case 'Identifier':
      return evaluateIdentifier(pattern, st, arg);
    case 'MemberExpression':
      return evaluateMemberExpression(pattern, st, callback, arg);
    case 'ObjectPattern':
      return evaluateObjectPattern(pattern, st, callback, arg as unknown[]);
    case 'ArrayPattern':
      return evaluateArrayPattern(pattern, st, callback, arg as unknown[]);
    case 'RestElement':
      return evaluateRestElement(pattern, st, callback, arg);
    // case 'AssignmentPattern':
    //   return evaluateAssignmentPattern(pattern, st, callback, arg);
  }

  return {} as BaseContext;
}

const evaluateIdentifier = (pattern: Identifier, st: EvalState, arg: unknown) => {
  const object = {} as BaseContext;
  object[pattern.name] = arg;
  return object;
}

const evaluateMemberExpression = (pattern: MemberExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>, arg: unknown): BaseContext => {

  if (pattern.type === 'MemberExpression') {
    console.log(pattern, st, callback, arg);
    throw new Error('evaluateMemberExpression is not implemented.');
  }

  return {} as BaseContext;
}

const evaluateObjectPattern = (pattern: ObjectPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, arg: unknown) => {

  let context: BaseContext = {};

  pattern.properties.map((pattern) => {
    switch (pattern.type) {
      case 'Property': {
          let key: string | number;
          if (pattern.key.type === 'Identifier') {
            key = pattern.key.name;
          } else if (pattern.key.type === 'Literal') {
            key = pattern.key.value as string | number;
          } else {
            callback(pattern.key, st);
            key = popVisitorResult(pattern, st) as string | number;
            if (typeof key !== 'string' && typeof key !== 'number')
            throw new Error(`Unsupported property key type: ${pattern.key.type}`);
          }

          const ctx = arg as BaseContext;
          st.context?.push(ctx);
          callback(pattern.value, st);
          const value = popVisitorResult(pattern, st) as BaseContext;
          st.context?.pop();

          const pair = {} as BaseContext;
          pair[key] = value;

          context = {...context, ...pair};
        }
        break;
      case 'RestElement': {
          const object = evaluateRestElement(pattern, st, callback, arg);
          context = {...context, ...object};
        }
        break;
    }
  });

  return context;
}

const evaluateArrayPattern = (pattern: ArrayPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown[]) => {
  const patterns = pattern.elements.filter(s => !!s) as Pattern[];
  const object = evaluatePatterns(patterns, st, callback, args);
  return object;
}

const evaluateRestElement = (pattern: RestElement, st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown) => {
  const argument = pattern.argument;
  const object = evaluatePattern(argument, st, callback, args);
  return object;
}

// const evaluateAssignmentPattern = (pattern: AssignmentPattern, st: EvalState, callback: walk.WalkerCallback<EvalState>, args: unknown) => {
//   const left = evaluatePattern(pattern.left, st, callback, args);
//   callback(pattern.right, st);
//   const value = popVisitorResult(pattern, st);
//   const object = {...left};
//   return object;
// }
