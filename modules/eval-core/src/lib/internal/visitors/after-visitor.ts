import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';

export const afterVisitor = (node: AnyNode, st: EvalState) => {

  const options = st.options as Record<string, unknown>;
  if (options?.['trackTime']) {
    const t = performance.now();
    console.time('after: ' + node.type);
    return t;
  }
  return undefined;
}
