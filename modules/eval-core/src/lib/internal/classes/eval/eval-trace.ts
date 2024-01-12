import { AnyNode } from "acorn";

export interface EvalTraceItem {
  start?: number;
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
