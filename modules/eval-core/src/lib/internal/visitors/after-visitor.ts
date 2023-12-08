import { AnyNode } from 'acorn';
import { EvalState } from '../../actual/classes';

export const afterVisitor = (node: AnyNode, st: EvalState) => {
  if (st.options?.trackTime) {
    const t = performance.now();
    console.time('after: ' + node.type);
    return t;
  }
  return undefined;
}