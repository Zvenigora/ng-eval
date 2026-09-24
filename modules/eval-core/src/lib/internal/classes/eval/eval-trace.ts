import { AnyNode } from "acorn";

export interface EvalTraceItem {
  /**
   * Reserved, and never set: no item this library produces carries a value
   * here, and none has since the field was declared (`docs/backlog.md` A16).
   * It is neither a source offset nor a timestamp. For the node's source text
   * read `expression`; for timing totals per node type, `EvalState.nodeTimings`,
   * filled under `trackTime`.
   */
  start?: number;
  /**
   * Reserved, and never set - as `start`.
   */
  end?: number;
  type: string;
  expression?: string;
  value: unknown;
}

/**
 * Represents a trace of evaluation for a specific code execution.
 */
export class EvalTrace extends Array<EvalTraceItem> {

  /**
   * Adds a new trace item to the evaluation trace.
   * @param node - The AST node associated with the trace item.
   * @param value - The value of the evaluated expression.
   * @param expression - The expression being evaluated.
   */
  add(node: AnyNode, value?: unknown, expression?: string) {
    const item: EvalTraceItem = {
      type: node.type,
      value
    };
    if (expression) {
      item.expression = expression.substring(node.start, node.end);
    }
    this.push(item);
  }
}
