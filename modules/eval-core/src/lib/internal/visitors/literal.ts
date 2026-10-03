import { Literal } from 'acorn';
import { beforeVisitor } from './before-visitor';
import { afterVisitor } from './after-visitor';
import { pushVisitorResult } from './visitor-result';
import { EvalState } from '../classes/eval';

export const literalVisitor = (node: Literal, st: EvalState) => {

  beforeVisitor(node, st);

  // A regex literal is a new `RegExp` on every evaluation, as it is in
  // JavaScript. Acorn builds `node.value` once, at parse time, and every walk of
  // the parsed tree used to push that one object - a cached `simpleEval` string
  // and each recompute of a compiled expression alike - so `lastIndex` carried
  // from one evaluation into the next, and `/a/g.test("a")` answered true, then
  // false. A copy starts at `lastIndex` 0, and being new it is recorded under a
  // member-write policy, as a literal is - `EvalContext.checkMemberWrite`. When
  // acorn could not build the regex in this environment, `value` is null and is
  // pushed as before.
  let value = node.value;
  if (value instanceof RegExp) {
    value = new RegExp(value);
    st.createdObjects?.add(value);
  }

  pushVisitorResult(node, st, value);

  afterVisitor(node, st);
}
