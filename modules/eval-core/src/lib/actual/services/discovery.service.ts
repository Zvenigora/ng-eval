import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { AnyNode } from 'acorn';
import { AnyNodeTypes } from '../../internal/interfaces';
import { extract } from '../../internal/functions';
import { defaultParserOptions } from '../../internal/classes/eval';

/**
 * Service responsible for discovering nodes in an abstract syntax tree (AST).
 */
@Injectable({
  providedIn: 'root'
})
export class DiscoveryService extends BaseEval {

  /**
   * Creates a new instance of the DiscoveryService class.
   * @param parserService The parser service to be used.
   */
  constructor(
    protected override parserService: ParserService
  ) {
    super(parserService);

    this.parserOptions = {
      ...defaultParserOptions,
      cacheSize: undefined
    };
  }

  /**
   * Finds all nodes in the AST that match the given expression and search type.
   * @param expression The expression to search for. Can be a string or an AST node.
   * @param searchType The type of nodes to search for.
   * @param options Optional parser options.
   * @returns An array of nodes that match the search criteria, or undefined if no nodes are found.
   * @throws If an error occurs during the search process.
   */
  extract(expression: string | AnyNode | undefined,
    searchType: AnyNodeTypes): AnyNode[] | undefined {
    try {
      const ast = this.parse(expression);
      const value = extract(ast, searchType);
      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

}
