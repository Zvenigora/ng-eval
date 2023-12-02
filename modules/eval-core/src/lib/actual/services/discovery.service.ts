import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode, defaultOptions } from 'acorn';
import { AnyNodeTypes, ParserOptions } from '../../internal/interfaces';
import * as walk from "acorn-walk";

/**
 * Service responsible for discovering nodes in an abstract syntax tree (AST).
 */
@Injectable({
  providedIn: 'root'
})
export class DiscoveryService extends BaseEval {

  constructor(
    public parserService: ParserService
  ) {
    super();
    this.parserOptions = {
      ...defaultOptions,
      ecmaVersion: 2020,
      extractExpressions: false,
      cacheSize: undefined
    };
  }

  /**
   * Gets the parser options.
   * @returns The parser options.
   */
  get options(): ParserOptions {
    return this.parserOptions;
  }

  /**
   * Finds all nodes in the AST that match the given expression and search type.
   * @param expression The expression to search for. Can be a string or an AST node.
   * @param searchType The type of nodes to search for.
   * @param options Optional parser options.
   * @returns An array of nodes that match the search criteria, or undefined if no nodes are found.
   * @throws If an error occurs during the search process.
   */
  findAll(expression: string | AnyNode | undefined,
    searchType: AnyNodeTypes,
    options?: ParserOptions): AnyNode[] | undefined {
    try {
      const parserOptions = { ...this.parserOptions, ...options };
      const ast = typeof expression === 'string'
        ? this.parserService.parse(expression, parserOptions)
        : expression;
      const value = this.doFindAll(ast, searchType);
      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

  private doFindAll(ast: AnyNode | undefined,
    searchType: AnyNodeTypes): AnyNode[] | undefined {
    if (ast) {

      const state: AnyNode[] = [];

      const visitors: walk.SimpleVisitors<AnyNode[]> = {
        [searchType]: (node: AnyNode,) => { state.push(node); return; }
      };

      walk.simple(ast, visitors);

      return state.length > 0 ? state : undefined;
    }
    return undefined;
  }

}
