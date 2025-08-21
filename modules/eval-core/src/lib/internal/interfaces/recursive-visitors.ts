import { WalkerCallback } from 'acorn-walk';
import * as acorn from 'acorn';
import { StackType } from './stack-type';
import { AnyNode } from 'acorn';
import { RegistryType } from './registry-type';
import { AnyNodeTypes } from './parser-types';
import { BaseRegistry, Registry } from '../public-api';

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

