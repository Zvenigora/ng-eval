import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';

export const pushVisitorResult = (node: AnyNode, st: EvalState, value: unknown) => {
  const result = st.result;
  result.stack.push(value);
  result.trace.add(node, value, st.result.expression);
  return value;
}

export const popVisitorResult = (node: AnyNode, st: EvalState): unknown => {
  const result = st.result;
  const value = result.stack.pop();
  return value;
}

export const pushVisitorResultAsync = (node: AnyNode, st: EvalState, value: Promise<unknown>) => {
  const result = st.result;
  result.stack.push(value);
  result.trace.add(node, value, st.result.expression);
  return value;
}

export const popVisitorResultAsync = (node: AnyNode, st: EvalState): Promise<unknown> => {
  const result = st.result;
  const value = result.stack.pop() as Promise<unknown>;
  return value;
}
