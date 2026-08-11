import { WalkerCallback } from 'acorn-walk';
import * as acorn from 'acorn';
import { StackType } from './stack-type';
import { AnyNode } from 'acorn';
import { RegistryType } from './registry-type';
import { AnyNodeTypes } from './parser-types';
import { BaseRegistry, Registry } from '../public-api';

/**
 * @deprecated Use `EvalHooks` and `EvalState` instead. Nothing in the library
 * implements this interface, and no code path reads its `beforeVisitors` /
 * `afterVisitors` entries; the evaluator's state type is `EvalState` and hooks
 * are registered through `EvalState.hooks`.
 *
 * **Its two hook entries are the last published trace of a signature no
 * function in the library has any more.** They are typed to return
 * `number | undefined` because the real `beforeVisitor` / `afterVisitor` once
 * returned a timing stub - a start timestamp handed back to the closing call.
 * That stub was deleted when those functions became hook dispatchers and their
 * return type widened to `void`, which is also what `EvalNodeHook` mandates, so
 * the shape recorded here is now contradicted by every hook the library
 * actually dispatches. A reader who finds these lines has no way to discover
 * that from the code, since there is no implementation left to compare against.
 *
 * Retained so this release stays purely additive; removal is a follow-up for
 * the next breaking version.
 */
export interface RecursiveVisitorState {
  scope: Registry<unknown, unknown>,
  result: RecursiveVisitorResult<unknown | undefined>,
  option: RecursiveVisitorOptions,
  beforeVisitors?: RegistryType<AnyNodeTypes, (node: AnyNode, st: RecursiveVisitorState) => number | undefined>,
  afterVisitors?: RegistryType<AnyNodeTypes, (node: AnyNode, st: RecursiveVisitorState) => number | undefined>,
}
export interface RecursiveVisitorOptions {
  trackTime?: boolean;
  resultType?: 'stack' | 'registry';
}
export interface RecursiveVisitorContext {
  placeholder?: unknown; // Placeholder for future context data
}

export enum RecursiveVisitorResultType {
  Stack,
  Registry
}

/**
 * @deprecated Use `EvalResult` instead. This exists only as the `result` member
 * of the deprecated {@link RecursiveVisitorState}; the evaluator carries its
 * value stack and trace on `EvalResult`, which is what visitors actually push
 * to and what `EvalState.result` returns.
 *
 * Retained so this release stays purely additive; removal is a follow-up for
 * the next breaking version.
 */
export type RecursiveVisitorResult<TValue> =
  RecursiveVisitorStackResult<TValue> |
  RecursiveVisitorRegistryResult<TValue>

export interface RecursiveVisitorStackResult<TValue> {
  type: 'stack',
  stack: StackType<TValue>
}

export interface RecursiveVisitorRegistryResult<TValue> {
  type: 'registry',
  registry: BaseRegistry<AnyNode, TValue>
}

export type AggregateType = {
  Expression: acorn.Expression,
  Statement: acorn.Statement,
  Function: acorn.Function,
  Class: acorn.Class,
  Pattern: acorn.Pattern,
  ForInit: acorn.VariableDeclaration | acorn.Expression
}

export type RecursiveVisitor<TState> = ( node: acorn.AnyNode, state: TState, callback: WalkerCallback<TState>) => void;

export type RecursiveAggregateVisitor<TState> = ( node: AggregateType, state: TState, callback: WalkerCallback<TState>) => void;

