import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';

export const pushVisitorResult = (node: AnyNode, st: EvalState, value: unknown) => {
  const key = getKey(node);
  const result = st.result;
  result.stack.push(value);
  result.trace.set(key, value);
  return value;
}

export const popVisitorResult = (node: AnyNode, st: EvalState): unknown => {
  const result = st.result;
  const value = result.stack.pop();
  return value;
}

export const pushVisitorResultAsync = (node: AnyNode, st: EvalState, value: Promise<unknown>) => {
  const key = getKey(node);
  const result = st.result;
  result.stack.push(value);
  result.trace.set(key, value);
  return value;
}

export const popVisitorResultAsync = (node: AnyNode, st: EvalState): Promise<unknown> => {
  const result = st.result;
  const value = result.stack.pop() as Promise<unknown>;
  return value;
}

const getKey = (node: AnyNode) => {
  const key = `${node.type}(${node.start}:${node.end})`;
  return key;
}
