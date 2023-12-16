import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';

export const beforeVisitor = (node: AnyNode, st: EvalState) => {

  const options = st.options as Record<string, unknown>;
  if (options?.['trackTime']) {
    const t = performance.now();
    console.time('before: ' + node.type);
    return t;
  }
  return undefined;
}
