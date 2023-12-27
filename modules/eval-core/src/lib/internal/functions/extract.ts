import * as walk from 'acorn-walk';
import { AnyNode } from 'acorn';
import { AnyNodeTypes } from '../interfaces';

/**
 * Finds all nodes of a specific type in the given AST.
 *
 * @param ast The AST to search in.
 * @param searchType The type of nodes to search for.
 * @returns An array of nodes of the specified type if found, otherwise undefined.
 */
export const extract = (node: AnyNode | undefined,
  searchType: AnyNodeTypes): AnyNode[] | undefined => {
  if (node) {

    const state: AnyNode[] = [];

    const visitors: walk.SimpleVisitors<AnyNode[]> = {
      [searchType]: (node: AnyNode,) => { state.push(node); return; }
    };

    walk.simple(node, visitors);

    return state.length > 0 ? state : undefined;
  }
  return undefined;
}

