import { AwaitExpression } from 'acorn';
import * as walk from 'acorn-walk';
import { beforeVisitor } from './before-visitor';
import { popVisitorResult, pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';
import { afterVisitor } from './after-visitor';

// Default timeout for await expressions (30 seconds)
const DEFAULT_AWAIT_TIMEOUT = 30000;

/**
 * Creates a timeout promise that rejects after the specified timeout
 */
const createTimeoutPromise = (timeout: number): Promise<never> => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Await expression timed out after ${timeout}ms`));
    }, timeout);
  });
};

/**
 * Safely wraps a value in a promise if it's not already a promise
 */
const ensurePromise = (value: unknown): Promise<unknown> => {
  if (value && typeof value === 'object' && 'then' in value) {
    return value as Promise<unknown>;
  }
  return Promise.resolve(value);
};

export const awaitVisitor = (node: AwaitExpression, st: EvalState, callback: walk.WalkerCallback<EvalState>) => {

  beforeVisitor(node, st);

  const promise = new Promise<unknown | undefined>((resolve, reject) => {
    try {
      callback(node.argument, st);

      const value = popVisitorResult(node, st);

      // Convert value to promise if it's not already one
      const valuePromise = ensurePromise(value);

      // Get timeout from context or use default
      const contextObj = st.context?.original as Record<string, unknown>;
      const timeout = (contextObj && typeof contextObj['__awaitTimeout'] === 'number' 
        ? contextObj['__awaitTimeout'] 
        : DEFAULT_AWAIT_TIMEOUT);

      // Race between the actual promise and timeout
      Promise.race([
        valuePromise,
        createTimeoutPromise(timeout)
      ])
      .then(resolve)
      .catch((error) => {
        // Enhance error information with context
        const enhancedError = error instanceof Error 
          ? error 
          : new Error(`Await expression failed: ${String(error)}`);
        
        // Add source location information if available
        if (node.start !== undefined && node.end !== undefined) {
          enhancedError.message += ` at position ${node.start}-${node.end}`;
        }
        
        reject(enhancedError);
      });

    } catch (synchronousError) {
      // Handle synchronous errors immediately
      const enhancedError = synchronousError instanceof Error 
        ? synchronousError 
        : new Error(`Await expression failed synchronously: ${String(synchronousError)}`);
      
      reject(enhancedError);
    }
  });

  pushVisitorResult(node, st, promise);

  afterVisitor(node, st);

}

