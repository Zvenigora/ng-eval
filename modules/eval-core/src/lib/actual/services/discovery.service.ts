import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode } from 'acorn';
import { AnyNodeTypes, ParserOptions } from '../../internal/interfaces';
import * as walk from "acorn-walk";


/**
  * Discovers nodes in the given expression or AST based on the specified search type.
  * @param expression The expression or AST to be searched.
  * @param searchType The type of nodes to search for.
  * @param options Optional parser options.
  * @returns An array of discovered nodes, or undefined if no nodes are found.
  * @throws If an error occurs during the discovery process.
  */
@Injectable({
  providedIn: 'root'
})
export class DiscoveryService extends BaseEval {

  constructor(
    public parserService: ParserService
  ) {
    super();
  }


  discover(expression: string | AnyNode,
        searchType: AnyNodeTypes,
        options?: ParserOptions): AnyNode[] | undefined {
    try {
      const ast  = typeof expression === 'string'
        ? this.parserService.parse(expression, options)
        : expression;
      const value = this.doDiscover(ast, searchType);
      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

  private doDiscover(ast: AnyNode | undefined,
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
