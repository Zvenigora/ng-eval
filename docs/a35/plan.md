# A35 — dangerous function values past the call sandbox (`@zvenigora/ng-eval-core`)

**Date**: October 14, 2026
**Revision**: 7 — step 4, in its own commit, with three decisions made after the replan:
- **Shape (i) is chosen** (§ 2, § 8 q5): 0.12.1 as hardening, then 0.13.0 closes `this`.
- **One advisory, after 0.13.0** (§ 5, U3). It names 0.13.0 as the patched version and describes
  0.12.1 as partial hardening. Until 0.13.0 ships, nothing public describes the route through `this`
  beyond `SECURITY.md`'s prose limit. No expression appears in the advisory, the CHANGELOG,
  `SECURITY.md` or a commit message (§ 2).
- **§ 8 q4 gains a fourth candidate**, the positional one, and every candidate is measured before
  step 7 is specified.

The CHANGELOG entry and a code comment in `dangerous-values.ts` were cut back to that prose limit
before step 4 committed. Step 4's status becomes its outcome.

**Revision**: 6 — the replan, in its own commit, after step 4's code review. Step 4 is implemented
and verified in the working tree (its status, in § 4), and is **not committed**.

The review found a route the funnel cannot see, **through `this`** (finding 8, M14):
- `this` hands native code the caller's context object.
- With `Object` in the context, an expression builds a container of the listed functions there, and
  spreads it into a native call.
- Nothing pushes them, so the funnel never sees them.

That route is [A39](../backlog.md#a39), opened as Open, security. Closing it changes what `this`
evaluates to, a breaking change, so it belongs to 0.13.0.

The replan changes eight things:
- **The funnel's objective is narrowed** to the values that pass through the walk's own stack. The
  route through `this`, and a container the host provides, are stated limits (§ 3.4, § 9).
- **The texts the review measured false are corrected here**, not in step 4's commit:
  - the Objective;
  - M8's "not constructible";
  - § 3.3's account of `this`, `update` and `await`;
  - § 3.4's "only a host can make one once step 4 lands";
  - § 3.5's item 3;
  - § 9 item 5.
- **§ 3.5 item 3 states the rule**, and names the reads that only inspect a value but throw anyway.
  Those are:
  - assigning over a listed function;
  - an operator's operand, and a conditional's test;
  - a template interpolation;
  - `typeof (eval)` under `preserveParens`.

  The exemptions are not widened.
- **The postfix update's write before the refusal** is [A40](../backlog.md#a40). This plan does not
  fix it.
- **§ 8 q4 is what `this` should evaluate to.** It is decided from a measurement taken first.
- **§ 8 q5 and § 2 set out the release shape, (i) or (ii), which is pending.** § 4 sets out the
  steps of both shapes.
- **A35 stays open** until the route through `this` is closed (§ 4, step 8).
- **`.claude/skills/step/SKILL.md`** follows the revised steps.

**Revision**: 5 — step 4's confirmation gate. At it:
- M3 and M7 were measured again with a funnel prototype on the tree after step 3 (M12).
- The timing harness was measured on the same prototype (M13).
- Each exemption was probed both ways.

The gate changed five things:
- **Two cases, V20 and V21.** Without them, widening the `new` or the tag exemption turns no case
  red. So step 4 adds 21, and `eval-core` ends at 2509.
- **Probe (ii) becomes three probes, and probe (vi) is added.** Each exemption is now probed widened
  and narrowed, one at a time.
  - As written, (ii) predicted that V8–V10 alone fail. V3 and V4 fail too, since each one's callee
    is a call whose subtree holds the read.
  - Widening a member callee's subtree also turns V1, V2, V12 and V14 red.
- **V19's subject** is `[f].map(t)`, with `f` a `jest.fn()` that must never run. The
  `["x"].map(t)` it replaces would hand the string `"x"` to the realm's timer under any probe that
  let it through.
- **Criterion 4 gains a timing line, which stops the step.** It read "gates nothing".
- **`.claude/skills/step/SKILL.md` joins the file list.** It changes in three places: its counts,
  its timing wording, and its stop-and-replan rule. The rule is narrowed from any `public-api.ts` to
  the published barrels.

The gate also fixed three readings:
- **The marks go where the callee or tag is visited.** A member callee or a member tag is
  evaluated by `evaluateMember` and never pushed, so it is not marked.
- **The read's name** is the identifier, then a dotted or literal key, then the function's own
  `name`.
- **The CHANGELOG's K1 bullet** no longer says "however it is reached". A sequence, conditional or
  parenthesised callee now takes the read's message.

**Revision**: 4 — step 3, in its own commit. Its confirmation gate changed three things:
- **The visitors barrel joins step 3's file list.** The visitor is exported from
  `internal/visitors/public-api.ts`, and `recursive-visitors.ts` imports it from there, as it imports
  every other visitor. The barrel is internal: `src/public-api.ts` does not re-export
  `internal/visitors`, and `export-list.spec.ts:403-412` pins that. So criterion 4 gains a leg: the
  built `.d.ts` is byte-identical to step 2's.
- **Q4 gains a counting leg**: `(n++, n++)` gives 1 and leaves `n` at 2. `(x = 1, x + 1)` alone cannot
  fail on an expression evaluated twice, since assigning 1 twice changes nothing.
- **The Fixed line** states the visible change: one `before` and `after` pair and one trace entry per
  sequence, no value left on the stack, and no evaluated value changed.

The gate also asked for a search before the code: every spec in the three projects, for a comma
expression asserted through hook events or trace entries. It found none (step 3's outcome).

The step itself made one more change. **Q5 gains a trace leg**, so the trace entry the Fixed line
states is pinned by a case. Neither probe's list changes: Q5 already fails with the visitor
unregistered, and its trace entry is right under the second wrong implementation.

**Revision**: 3 — step 2, in its own commit. Its confirmation gate changed four things:
- **C11's subject.** In jsdom, `XMLHttpRequest` and `WebSocket` are classes written in JavaScript,
  whose source holds `constructor(`. So `isConstructorSafe`'s source-text test already refused
  `new X()` with `X = XMLHttpRequest`, with the message C11 asserts. C11 would have been green before
  the fix and under probe (i), and nothing would have probed the `new` site's identity check. C11 is
  now `new X(f, 0)` with `X` the realm's `setTimeout`, asserting the refusal and that `f` never ran.
  The gate read that route as one only jsdom's timers open, not a browser attack route. Step 2's
  code review found otherwise (§ 1.2 finding 1, M11). zone.js's timer wrapper is a plain function
  that `new` can construct, whose `toString` shows the original's `[native code]`, and it hands a
  string handler to the browser's timer. So C11's comment and the Security entry state it as a
  browser route in a zone.js application.
- **Probe (vi)** reads "S1 and S3 fail". S1 records the realm's own capture, and removing the guard
  changes that capture too.
- **§ 8 q2 is decided**: no shallow container check (§ 8).
- **C14's name**, `eval`, joins the written names its cases assert.

The gate also fixed three readings:
- the bound-name rule fires only on a name with at least one `bound ` prefix, so an unbound function
  named `fetch` is not refused by it;
- C13 runs one evaluation of its own before it replaces `setTimeout`, so the set is captured first;
- T12 covers an identifier tag and a member tag, so probe (viii) has a case on either branch.

The step itself made two more changes:
- **Probe (iv) was corrected in place** to "C12 and S1", as (vi) was at the gate.
- **U3 is rated by a CVSS 3.1 vector** (§ 5), in place of "low". The rating weighs the string-timer
  route the code review found. Step 5's `SECURITY.md` and the advisory recommend the same CSP.

**Revision**: 2 — step 1, in its own commit. Its confirmation gate widened the step from "the tag
through `safeCall`" to "the tag through the call's own path":
- **One helper.** The call visitor's member branch becomes `callMember`: the receiver
  `scopeReceiver` gives, the write policy, then `safeCall` under the property name. The call and tag
  visitors both use it. So a member tag gets the computed-key name check, the receiver JavaScript
  gives it and the write policy. A tag that is not a member keeps the context as `this`, as a bare
  call does.
- **Four cases**, and a second probe, which drops the write policy from the tag path:
  - T7, a computed key;
  - T8, a case variant refused by identity;
  - T9, the write policy;
  - T10, the receiver.
- **The Security entry** states the receiver and hook-event changes beside the refusals.
- **The case-variant route** (M10) joins § 1.2 finding 1 and § 3.5 item 2, and step 2 gains C15 and
  C15t.

`callMember` takes the result of `evaluateMember` instead of evaluating the member itself, so each
visitor keeps its own order: a call evaluates its arguments before its callee, a tag evaluates itself
before its template's expressions. A helper that evaluated the member after arguments handed to it
would have made a member tag evaluate its expressions first. That is a change the gate did not list.

The step found two more consequences, and the Security entry states both:
- a member tag's own `MemberExpression` leaves no trace entry, just as it raises no `before` or
  `after` node-hook events. Its read event still fires, so the gate's wording, "raises no hook
  events", was corrected after the step's code review measured that event;
- a tag that is not a function throws the call's error. It used to throw a `TypeError` from `apply`
  (M10).

T9 also has an identifier-tag leg. That leg asks the policy about the context, as a bare call does,
so the entry's "tags go through the write policy" holds for both kinds of tag. The step's code review
found no Critical issue. It found the hook-event wording wrong, and that is corrected wherever it
appeared. The entry also gained a consequence of the receiver change: `` a.push`x` `` now appends to
`a`.

Three more of the review's findings were routed before the commit:
- **Two behaviours step 1 documents and no case pins.** They are the tag being evaluated before its
  expressions, and a non-function tag's error. They become step 2's T11 and T12, each with a probe,
  since step 1's count was fixed at its gate. Step 2 now adds 21.
- **A comment made stale by step 1**, in `member-write-policy.ts`, joins step 2's file list.
- **The tag's strings array is not JavaScript's.** It is not frozen, has no `raw`, is built anew per
  evaluation, and is not recorded as created. This is recorded as [A38](../backlog.md#a38), fidelity
  rather than security, and outside 0.12.1. This step's file list
gains `.claude/skills/step/SKILL.md`, whose per-step counts the gate changed.

**Revision**: 1 — initial plan.
**Target package**: `@zvenigora/ng-eval-core`, in **shape (i)**, chosen in Revision 7 (§ 2, § 8 q5):
**0.12.1**, a patch, then **0.13.0**. Shape (ii), 0.13.0 alone, was the alternative.

Both downstream peer ranges admit 0.12.1: `eval-signals`' `>=0.11.0 <0.13.0` and `eval-forms`'
`>=0.12.0 <0.13.0`. Neither admits 0.13.0.
**Also touches**: no downstream code through step 8. `eval-signals` and `eval-forms` run as the
downstream witnesses, with their counts unchanged. For 0.13.0 to reach them, each widens its peer
range in a release of its own (step 9).
**Fixes**:
- [A36](../backlog-retired.md#a36) in step 1;
- [A35](../backlog.md#a35) in steps 2 and 4, and its route through `this`, [A39](../backlog.md#a39),
  in step 7;
- [A37](../backlog-retired.md#a37) in step 3.

**Pauses**: Phase 10 after its step 2 ([plan](../documentation/phase-10-plan.md)). It resumes at its
step 3 once this plan's first release and its post-publish commit have landed: step 6 under shape
(i), step 9 under shape (ii).
**Source**: the requests of 2026-10-14. Phase 10 step 2's review found the class, which was then
measured route by route. The decisions in § 2 were fixed before this plan was committed.
**Objective**: an expression cannot call a dangerous function value that the context holds or that
is reachable from it, whatever name it uses. Nor can it hand one to native code through the walk's
own values: an argument, a receiver, an element, a branch or a result. *Narrowed by Revision 6*:
- **Two routes reach native code without passing through the walk's values**, and are stated
  limits: a container the host provides (finding 3), and `this` (finding 8).
- **Step 7 closes the route through `this`.**
- **Through step 4, every existing assertion holds.** Step 7 changes what `this` evaluates to, so
  its own gate decides which assertions it changes (§ 8 q4).

**Conclusion, stated first so the rest reads as its argument**:
- Fix A36 first and alone: the tag call goes through the sandbox.
- Then check every function value against an **identity set** of the realm's dangerous functions,
  in two places:
  - **K1**, at the call, `new` and tag sites, on the callee's value, with today's messages;
  - **one funnel** at `pushVisitorResult`, on every other value, with two exemptions: the callee
    position and the operand of `typeof`.

  Between them, give `SequenceExpression` a visitor (A37), so the funnel runs on a walk that leaves
  exactly one value per sequence.
- The funnel replaces the three per-visitor sites K2–K4.
  - **Routes**: over 23 measured routes, the two shapes refuse and pass the same ones.
  - **Cost**: the funnel's median came out up to about 3.5% higher than the clean bundle's in two of
    three rotations, while the minimums were equal. `performance.spec.ts` remains the gate.
  - **Why the funnel**: it holds for visitors not yet written, and states its invariant in one place.
- A bound function whose name, stripped of its `bound ` prefixes, is a listed name is refused too.
- **The funnel sees only the walk's own values** (Revision 6). Step 4's review found that `this`
  hands native code the caller's object, from which an expression builds a container of the listed
  functions and spreads it into a native call (finding 8).
  - That route and a host container are stated limits.
  - Closing `this` is a breaking change: step 7, for 0.13.0.
- Then `SECURITY.md` states the protections and the limits. The release shape decides whether
  0.12.1 ships before 0.13.0 (§ 2). A35 retires with A39, once `this` is closed.

---

## 1. Current state

### 1.1 What exists today

| Element | Where | State |
| :--- | :--- | :--- |
| Call sandbox | `isFunctionSafe` and `safeCall`, `internal/visitors/call-expression.ts:71-132` | Refuses by the callee's **written name** (fourteen names, `DANGEROUS_FUNCTIONS`, `:14-29`), by **identity** only for `Function`, and by **source text** (six patterns, `:35-42`) for a non-native callee. Message `Function call blocked for security reasons: <name>`. Module-private |
| `new` sandbox | `isConstructorSafe` and `safeNew`, `new-expression.ts:28-84` | Ten names, read only for a bare-identifier callee; the four function constructors by identity; a source-text test. Message `Constructor blocked for security reasons: <name>` |
| Tag call | `tagged-template-expression.ts:25` | `tag.apply(st.context, [quasi, ...quasiExpressions])`. **No check at all** (A36) |
| Member callee | `call-expression.ts:181-188` | Evaluated by `evaluateMember`, whose value is **not pushed**. It reaches `safeCall` with the property name as the checked name |
| Value push | `pushVisitorResult`, `visitor-result.ts:25-30` | Every visitor's result. Its docblock argues against extra frames on this per-node path |
| Push sites | 25 visitor files | identifier (2), member (1), call (2), `new` (1), tag (1), and 20 more: array, arrow, assignment, await (through `pushVisitorResultAsync`), binary, block, conditional, empty, expression-statement, for, if, literal, logical, object, program, template-literal, this, unary, update, variable-declaration |
| Unregistered nodes | `recursive-visitors.ts` | No visitor for `SequenceExpression` (A37), `ChainExpression`, `ParenthesizedExpression` or `SpreadElement`. `acorn-walk`'s base walker walks their children |
| `evaluateCall` | `call-expression.ts:210-227` | Exported, and called from nowhere in `modules/` |
| Existing pins | `eval.service.call-security.spec.ts:12-29`, `:136-142` | They bind the real `eval`, `Function`, `setTimeout` and `setInterval`, and assert `Function call blocked for security reasons`. They bind the real `Function` and assert `Constructor blocked for security reasons` for `new Function(…)` |

The baseline is the gate at this plan's commit: `eval-core` 2451, `eval-signals` 438, `eval-forms` 375.

### 1.2 Findings that shape the plan

Each finding cites the measurement in § 1.3 that produced it.

1. **Every route past the name check is open** (M1, M2, M3, M10, M11). With `eval` in the context under its
   own name, `eval("1+1")` is refused, while each of these gives 2 (or `[2]`, or a promise of 2):
   - **an alias**: `run("1+1")`, and `run?.("1+1")` as an optional call;
   - **a member**: `tools.run("1+1")`, `tools["ev" + "al"].call(…)`, `["1+1"].map(tools.eval)`;
   - **a call result**: `getEval()("1+1")`, `["1+1"].map(getEval())`;
   - **destructuring**: `let { run } = tools; run("1+1")`;
   - **`this`**: `this.run("1+1")`;
   - **a scope namespace**: `ns.run("1+1")`;
   - **`call`, `apply` and `bind`**, and `Function.call(null, "return 7")()`, which gives 7;
   - **native callbacks**: `map(eval)`, `Reflect.apply(eval, …)`, `then(eval)`;
   - **callee shapes the name check never sees**: `(0, eval)("1+1")`, `(c ? eval : f)("1+1")`, and
     `(eval)("1+1")` under `preserveParens`;
   - **a value nested in an array the expression builds**:
     `[[run, null, ["1+1"]]].map(apply.bind(Reflect.apply, null))`;
   - **a host-bound function**: `e("1+1")` with `e = eval.bind(null)`, whose `name` is
     `"bound eval"`;
   - **a case variant under `caseInsensitive`**: `EVAL("1+1")`, since the name check reads the
     written name, which the list does not hold (M10). `` EVAL`1+1` `` reaches `eval` the same way
     once step 1 checks a tag by name. `FUNCTION` is refused by `Function`'s identity, as a call and,
     after step 1, as a tag.
   - **a timer under `new`, under its own name** (M11): `new`'s list of names never held the timers,
     and zone.js's timer wrapper is a plain function that `new` can construct, whose `toString`
     shows the original's source. So in a browser application with zone.js,
     `new setTimeout("<code>", 0)` constructed, and zone.js handed the string to the browser's
     timer, which runs it unless a CSP forbids `unsafe-eval`. Step 2's code review found this.

   `eval?.("1+1")` alone is refused today, by name, since its callee is the identifier `eval`.
2. **The tag call is not sandboxed at all** (M2). With `Function` under its own name,
   `` Function`return 7`() `` gives 7. `` run`1+1` `` calls `eval` (it returns the strings array,
   since `eval` of a non-string returns its argument). This is [A36](../backlog-retired.md#a36).
3. **A host-provided container defeats any check on pushed values** (M3).
   `Reflect.apply(...pair)`, with `pair = [eval, null, ["1+1"]]` in the context, gives 2. The
   spread hands `eval` to native code without pushing it. Neither the funnel nor the sites see it
   (M8); § 8 q2.
4. **`SequenceExpression` breaks the value-stack invariant on its own** (M3, M9). The value is
   right every time, since each consumer pops only the top entry. Each sequence leaves its other
   values on the stack:
   - `(0, 1)`, `[(1, 2), 3]`, `f((1, 2), 3)`, `(x = 1, x + 1)`, `1 + (2, 3)` and `(1, 2) + 10` each
     leave one entry;
   - `((1, 2), 3)` leaves two.

   No hook sees the node: there are 0 `after` events for it. This is
   [A37](../backlog-retired.md#a37), which joins this plan as step 3, so the funnel's `(0, eval)` case
   runs on a correct walk.
5. **The test realm, measured** (M4).
   - **Timers**: zone.js has replaced `setTimeout` and `setInterval` with wrappers that are not
     native, and keeps the originals under `__zone_symbol__setTimeout` and
     `__zone_symbol__setInterval`.
   - **Absent**: `setImmediate`, `require`, `importScripts`, `fetch`, `Worker`, `SharedWorker` and
     `ServiceWorker`.
   - **jsdom's own**: `XMLHttpRequest` and `WebSocket`.
   - **The async constructors**: the transform downlevels async functions, so
     `Object.getPrototypeOf(async function () {}).constructor` is `Function`, and so is the async
     generator's. `GeneratorFunction` is native. So a capture from literals finds nothing to add for
     `AsyncFunction` or `AsyncGeneratorFunction` in such a realm, and § 3.1 records that rather than
     working round it.
6. **The two shapes refuse the same routes; their cost, as measured** (M6, M7, M8).
   - **Routes**: on all 23 routes measured, they refuse and pass the same ones.
   - **Cost**: the funnel's median was up to about 3.5% above the clean bundle's in two of three
     rotations, and the minimums were equal (§ 3.3's table).
   - **Existing suites**: both leave every existing case green in all three projects.
   - **What they differ in**: § 3.3 lists which visitors each shape covers without a site.
7. **Timing inside Jest could not tell them apart** (M5). Runs that were apart in time varied
   sixfold, and the IDE re-ran the spec on save. Interleaving the shapes in one process gave a 5×
   spread within one mode, probably because the mode switch deoptimised the hot path. That
   measurement is recorded and discarded, and M6 is the method this plan uses.
8. **`this` hands native code a container the library supplies** (M14). *Added by Revision 6*:
   - `this` evaluates to the walk's `EvalContext`. That object exposes the caller's context object
     as the enumerable own field `_original`, and through the public getter `original`.
   - An expression cannot read either, since `this.k` resolves `k` against the context. Native code
     can: `Object.values(this)` or `Reflect.get(this, "original")` returns the caller's object.
   - A native method then returns that object's values, any listed function among them. A spread
     hands them to a native call.
   - Neither the native result's elements nor the spread's are pushed, so the funnel never sees
     them.

   With `eval` and `Object` in the context, `["1+1"].map(eval)` is refused after step 4. The same
   call reached through `this` still gives `[2]`, and `Function` reached the same way runs. This
   differs from finding 3 in who supplies the container: there the host builds it, and here the
   library does, so it needs only a listed function and `Object` in the context. Making
   `_original` non-enumerable would not close it, since the getter exposes the same object. It is
   [A39](../backlog.md#a39), which records the probes, and step 7 closes it.

### 1.3 Measurements run for this plan

M1–M4, M6, M8, M9 and M10 ran against `dist/modules/eval-core`, or in Jest, with throwaway code. M5–M8
used throwaway prototypes of both shapes in the library: a shared check module, the callee marks,
and the gated checks. Everything was **reverted** and its files deleted before this plan's commit:
`git status` showed only the plan's files, and the library had no diff against `HEAD`. M12 and M13
used a throwaway funnel prototype, reverted the same way before step 4 began. M14 ran throwaway
scripts outside the repository against the built bundles.

| ID | Question | Method | Result |
| :--- | :--- | :--- | :--- |
| M1 | The three callback routes | `evaluate(parse(…))` against the built bundle | `["1+1"].map(eval)` is `[2]`; `Reflect.apply(eval, null, ["1+1"])` is 2; `Promise.resolve("1+1").then(eval)` resolves to 2 |
| M2 | Entry routes | The same | Finding 1's member, call-result, destructuring, `this`, namespace, nested, bound and tag rows |
| M3 | Callee shapes and stack balance | The same, reading `state.result.stack.length` after the walk | `(0, eval)()` 2, leaving 1; `(c ? eval : f)()` 2, leaving 0; `eval?.()` refused; `run?.()` 2; `(eval)()` under `preserveParens` 2; `Reflect.apply(...pair)` 2; `(0, 1)` 1, leaving 1; `typeof eval` `"function"` |
| M4 | The identity set in the test realm | A throwaway Jest spec | Finding 5 |
| M5 | Timing inside Jest | A throwaway timing spec, in separate runs and interleaved | Discarded: finding 7 |
| M6 | **Timing, the method this plan uses** | A production build of each shape, fixed per process; Node against the bundle; 6 cached expressions; 15 rounds of 120,000 evaluations; one process per shape, rotated three times | § 3.3's table |
| M7 | Existing suites under each shape | `nx run-many -t test` with each shape on | Funnel and sites alike: `eval-core` 2451 of 2451 existing cases, `eval-signals` 438, `eval-forms` 375 |
| M8 | Routes under each shape | A throwaway Jest spec over 23 routes, with each shape on | § 3.3. Its "`this` handed to a callback: not constructible" was wrong: M14 |
| M9 | `SequenceExpression` today | `evaluate(parse(…))` against the built bundle, with an `after` hook on the node and `state.result.stack.length` read after the walk | Finding 4 |
| M10 | Case variants, member tags, a tag that is not a function | The same, at step 1's confirmation gate and in the step | Under `caseInsensitive`: `EVAL("1+1")` 2, `` Eval`1+1` `` `["1+1"]`, `` FUNCTION`return 7`() `` 7. `` obj["fetch"]`x` `` runs a stand-in where `obj["fetch"]()` is refused. An undefined or a string tag throws a `TypeError` from `apply` |
| M11 | A timer under `new` | Step 2's code review: zone.js 0.16.3's source, and the 0.12.0 tarball with a zone-shaped timer bound under its own name. Step 2's red-first run of C11 in the test realm | `new setTimeout("…", 0)` constructs, and the string reaches the native timer. The wrapper is `function () { return patchDelegate(this, arguments); }`, its `toString` shows the original's, and a handler that is not a function goes to `delegate.apply` |
| M12 | M3 and M7 on the tree after step 3 | Step 4's confirmation gate: a funnel prototype; M3's routes against step 3's bundle and the prototype's; `nx run-many -t test` with the prototype on; each exemption widened and narrowed against the V cases | K1 already refuses `(0, eval)()`, `(c ? eval : f)()` and `(eval)()` under `preserveParens` with `Function call blocked for security reasons: anonymous`. The prototype refuses each at the read of `eval`. `run?.()` is K1's; `Reflect.apply(...pair)` gives 2 under both; `(0, 1)` leaves no entry; `typeof eval` is `"function"`. M7 holds: 2488 / 438 / 375, all green |
| M13 | Timing, previewed | Step 4's confirmation gate: M6's parameters with six recorded expressions (step 4's outcome); step 3's bundle against the prototype's; six rotations | Slower in all five valid rotations, by +1.1% to +8.5% on the median. The minimums moved from −22% to +5%. One rotation was void, from interference. Step 3's medians spread 5.7% over rotations 1–3, which sets step 4's line at 10.7% |
| M14 | `this` handed to native code | Step 4's code review, on that step's bundle. The review's two reproductions and the getter route measured again with a throwaway script, against step 3's bundle and step 4's | With `eval` and `Object`, and with `Function`, `Object` and `Reflect`, the routes in [A39](../backlog.md#a39) give `[2]` and 7 on both bundles, while each control without `this` is refused on step 4's. Through `Reflect.get(this, "original")` the first gives `[2]` too. An `EvalContext`'s own enumerable keys are `type`, `_original`, `_priorScopes`, `_scopes`, `_options`, `_lookups` |

---

## 2. Decisions — recorded, not reopened

- **A36 is its own entry and step 1, fixed alone**, with its own cases and its own probe. It ships in
  the same release as A35's first steps: 0.12.1 under shape (i), 0.13.0 under shape (ii).
- **A37 joins this plan as step 3, before the funnel**: a `SequenceExpression` visitor that leaves
  exactly one value. It has its own cases and its own probe, and ships in the same release.
- **The refusal surfaces as option (a).** The callee position keeps today's messages, and no
  existing assertion changes. The route cases include `(0, eval)("1+1")`, `(c ? eval : f)("1+1")` and
  `eval?.("1+1")`, so the callee exemption is shown not to leak.
- **The funnel also exempts the operand of `typeof`**, by node, as it exempts the callee:
  `typeof eval === "function"` still holds. A probe that widens the exemption turns a named case red.
- **Bound functions**: refuse when the function's `name`, with repeated `bound ` prefixes stripped,
  is a listed name. `SECURITY.md` documents this beside the source-pattern heuristic.
- **The identity set** is the call list plus the four function constructors (§ 3.1).
  - **Recapture is additive.** It adds a replaced timer's new value, and never removes one already
    captured.
  - **`AsyncFunction` and `AsyncGeneratorFunction` are captured from literals only**, never through
    `Function` or `eval`. Two reasons: a CSP forbids that, and a sandbox must not construct code. Where
    the captured constructor `=== Function`, as in a downlevelled realm such as an Angular zone.js
    build, the capture adds nothing and records it. The capture helper is tested with an injected
    prototype source.
- **0.12.1, under shape (i), is a patch.** The `[Unreleased]` › Security entry states the rule and
  lists exactly what now throws, and the two routes it does not cover (§ 3.5). **0.13.0 is a minor
  that carries a breaking change**: what `this` evaluates to (step 7).
- **The exemptions are not widened** (Revision 6). A read that only inspects a listed value throws
  as any other read does: an operator's operand, a conditional's test, an assignment's target. The
  Security entry names them instead (§ 3.5).
- **A35 retires with A39**, once the route through `this` is closed (step 8), under either shape.
- **Disclosure of the route through `this`** (Revision 7). Until 0.13.0 ships, nothing public
  describes it beyond `SECURITY.md`'s prose limit. That limit says the route exists, that 0.13.0
  closes it, and how a host stops it. No expression appears in the advisory, the CHANGELOG,
  `SECURITY.md` or a commit message.
- **The release shape is (i)**, chosen 2026-10-16 (Revision 7, § 8 q5). Shape (ii) is recorded
  below as the alternative that was weighed.
  - **(i) 0.12.1 as hardening, then 0.13.0.** *Chosen.*
    - 0.12.1 ships steps 1–4: A36, K1, A37 and the funnel.
    - Its `SECURITY.md` and Security entry lead with the guidance that holds whatever the route:
      place no listed function in the context, and in a browser, serve a Content Security Policy
      without `'unsafe-eval'`.
    - They state the route through `this` (A39) and a host container as limits.
    - Both downstream ranges admit 0.12.1, so every consumer can take it with no other release.
    - Then 0.13.0 closes `this` (step 7), and each downstream package widens its peer range to
      take it (step 9).
  - **(ii) Everything in 0.13.0.** Steps 5 and 6 are skipped. Nothing ships until `this` is closed.
    A consumer through `eval-signals` or `eval-forms` gets none of it until that package widens its
    range.
  - **Why (i).**
    - It ships the callee and funnel refusals now, to every consumer, with no downstream release.
      They close every route measured except those two.
    - (ii) would ship nothing sooner than (i) does.
    - Its cost is a published version with a documented open route. The one advisory waits for
      0.13.0, and calls 0.12.1 partial hardening (§ 5, U3).
- **Each release** is a separate commit after the fix steps, following CONTRIBUTING's Releasing
  procedure and the Publication status / release-tags process. A GHSA advisory, rated in § 5,
  follows the publish, once private vulnerability reporting is enabled. **Both are the maintainer's
  actions** (§ 5).

---

## 3. Design

### 3.1 The identity set

**The members.** These are values, matched by identity. A name absent from the realm adds nothing.

| Source | Members |
| :--- | :--- |
| The call list (`DANGEROUS_FUNCTIONS`), each name read from `globalThis` | `Function`, `eval`, `setTimeout`, `setInterval`, `setImmediate`, `require`, `importScripts`, `XMLHttpRequest`, `fetch`, `WebSocket`, `Worker`, `SharedWorker`, `ServiceWorker` |
| zone.js's saved original of each of those names, `globalThis.__zone_symbol__<name>`, where present | in the test realm, `setTimeout` and `setInterval` (finding 5) |
| The four function constructors | `Function` (already above), `AsyncFunction`, `GeneratorFunction` and `AsyncGeneratorFunction` |

So the set holds up to 16 distinct functions, plus zone's originals. The call list's fourteenth name,
`import`, is syntax and not a value, so it adds no member. `GeneratorFunction` is one of the four
function constructors and is in the set. It is **also** among `new`'s ten refused *names*. The report
before this plan listed it among the "`new`-only names", which was wrong.

**The function constructors are captured from literals only.** A helper reads the constructor off
the prototype of each of three function literals in the module: an async function, a generator and an
async generator. It takes the prototypes as an argument, so a spec can inject a source of its own.
- **Never through `Function` or `eval`.** Building the literal from source text would fail under a
  CSP without `unsafe-eval`, and a sandbox must not construct code to defend itself.
- **Where the constructor read is `Function` itself, nothing is added.** That is a realm whose
  bundler downlevels async functions, the test realm (finding 5) or an Angular zone.js build, and the
  helper records that the constructor was not captured. The real constructor is not a global there.
  An expression reaches it only through some value's `constructor`, which the guard refuses, so only a
  host could put it in the context, and `SECURITY.md`'s mitigation tells the host not to (§ 3.4).

**The listed names**, for the bound-function rule: the fourteen call-list names, `import` included,
plus `AsyncFunction`, `GeneratorFunction` and `AsyncGeneratorFunction`.

**When the set is captured, and why that is safe against zone.js.** The set is captured **lazily**, at
the first function value the check meets. That is during the first evaluation, never at module load.
Four things make this safe against zone.js patching the timers:
- **Order.** In an Angular application zone.js is loaded by the polyfills, before any application
  code runs, so by the first evaluation `globalThis.setTimeout` is already zone's wrapper.
- **Both identities.** zone keeps the original under `__zone_symbol__setTimeout`, and the capture
  takes it too. A context holding either the wrapper or the original is refused.
- **Late patching, additively.** If `setTimeout` is replaced after the capture, by a zone.js loaded
  late or by any other patcher, a **sentinel** catches it. Each check that reaches the set compares
  the last captured `setTimeout` with the current `globalThis.setTimeout`. When they differ, the
  current value of every listed global is **added** and the sentinel moves on. Nothing already
  captured is removed, so a value a context took before the replacement stays refused. Another
  listed global replaced on its own is not seen until `setTimeout` changes (§ 3.4).
- **Cost.** M6's prototypes carried the sentinel, and § 3.3 gives their cost.

A capture at module load would be unsafe: an eval-core module evaluated before zone.js would hold the
native timers, miss the wrappers every later context holds, and be inert for the timers.

### 3.2 K1 — the callee's value, at the call, `new` and tag sites

`isFunctionSafe` and `isConstructorSafe` also refuse when the callee **value** is in the identity
set, or is a bound function of a listed name. They throw today's messages, with today's names: the
written name, the property name, or `anonymous`. After step 1 the tag call runs through `safeCall`,
so K1 covers it too. Every existing pin holds: each binds the real global under its own name and
calls it by that name, so the name check fires first, as it does today.

### 3.3 Values outside the callee position — decided: one funnel, not three sites

**The shapes.**
- **Sites (K2–K4)**: a check in the visitors that bring values in, at seven push sites in five
  files: identifier (2), member (1), call (2), `new` (1) and tag (1).
- **Funnel**: one check in `pushVisitorResult`, behind `typeof value === 'function'`, so that a
  value that is not a function pays one comparison and no frame.

**The exemptions** are static, a property of the AST. Two kinds of node are exempt:
- **a callee**: the call, `new` and tag visitors mark `node.callee` and `node.tag`;
- **`typeof`'s operand**: the unary visitor marks `node.argument` when the operator is `typeof`.

The marks go in a `WeakSet`, and a hit is exempt only when the pushed node itself is marked:
- **`(0, eval)("1+1")`**: the callee is the `SequenceExpression`. The identifier `eval` is not
  marked, so its push is refused. The same holds for `(c ? eval : f)` and for a parenthesised
  `(eval)` under `preserveParens`.
- **`typeof eval`**: the operand is the identifier, which is marked, so the push passes and the result
  is `"function"`.
- **`typeof f(eval)`**: the operand is the call. The identifier `eval`, an argument, is not marked,
  so its push is refused.

**Cost** (M6). These are ms per round of 120,000 evaluations, one process each, rotated three times.
The percentages are against the clean bundle in the same rotation.

| Bundle | min, rotations 1 / 2 / 3 | median, rotations 1 / 2 / 3 |
| :--- | :--- | :--- |
| clean (`HEAD`, no prototype) | 552.4 / 553.1 / 554.8 | 564.2 / 563.3 / 570.5 |
| prototype present, both shapes off | 565.8 / 553.0 / 549.8 | 597.5 / 568.7 / 570.6 |
| funnel | 556.2 (+0.7%) / 558.7 (+1.0%) / 548.4 (−1.2%) | 584.1 (**+3.5%**) / 580.8 (**+3.1%**) / 566.8 (−0.6%) |
| sites | 559.6 (+1.3%) / 566.5 (+2.4%) / 550.5 (−0.8%) | 573.7 (+1.7%) / 574.0 (+1.9%) / 570.8 (+0.1%) |

As measured:
- **Medians**: the funnel was about 3.5% above the clean bundle in two of three rotations, and about
  equal in the third. The sites were up to about 2% above it.
- **Minimums**: all equal to within about 2%.
- **Noise**: the prototype with both shapes switched off measured +5.9% in its first rotation, so a
  difference of this size is within what this machine produced by itself, though not ruled out by
  it.

**`performance.spec.ts` remains the gate.** The funnel's step also runs a timing line of its own,
fixed at its confirmation gate (Revision 5): M6's method against step 3's bundle, which stops the
step on a red (step 4, criterion 4).

**Coverage** (M8). The 23 routes divide the same way under both shapes:
- **15 refused by both**, at the read: `eval.call`, `eval.bind`, `Function.call`, `map(eval)`,
  `Reflect.apply(eval…)`, `then(eval)`, `(0, eval)()`, `(c ? eval : f)()`, `(eval)()` under
  `preserveParens`, `map(tools.eval)`, a computed member's `.call`, `map(getEval())`, the nested
  container, `map` of a bound `eval`, and `typeof eval`. The prototypes had no `typeof` exemption;
  the plan adds one (§ 2).
- **1 refused in every mode, off included**, by today's name check: `eval?.()`.
- **6 passed by both**:
  - four callee routes, which K1 closes, since the prototypes left K1 out of both: an alias, a member
    callee, a call-result callee, a host-bound callee;
  - `run?.()`, an optional alias, which K1 also closes;
  - `Reflect.apply(...pair)` over a host container (finding 3).
- **1 recorded as not constructible, wrongly**: `this` handed to a callback.
  - M8 reasoned that `this`, always the `EvalContext` object, could carry no listed value.
  - It carries the caller's object, from which native code returns the listed values, and a spread
    hands them on.
  - Neither shape sees that, since nothing is pushed (finding 8, M14).

  *Corrected by Revision 6.*

**Which value-producing visitors each shape covers without a site of its own.**
- **The funnel** covers all 25 visitor files that push, with no site in any of them, and any visitor
  added later. That includes step 3's `SequenceExpression`.
- **The sites** cover five files: identifier, member, call, `new` and tag. The 20 others have no
  check:
  - **Forwarding a child's value**, which a site already checked: conditional, logical, assignment,
    block, expression-statement, for, if, program.
  - **Producing values that are never a listed function**: arrow (an expression-made closure), array
    and object (containers), literal, template-literal, binary, unary, empty,
    variable-declaration.
  - **`update`**, which this list once put among those never producing one. A postfix update
    pushes its target's old value, which can be a listed function. Before step 4, `tools.eval++`
    gave `eval` itself (A40's table), so `["1+1"].map(tools.eval++)` handed it on. The sites shape
    has no site there. The funnel refuses it, and its write is [A40](../backlog.md#a40).
  - **`this`**, which pushes `st.context`, an `EvalContext` object and never itself a function. But
    it carries the caller's object to native code, and neither shape sees that (finding 8).
  - **`await`**, which pushes its promise through `pushVisitorResult`. `pushVisitorResultAsync`
    has no caller.

  *`update` and `await` were corrected by Revision 6*, from step 4's code review. So coverage was
  **not** equal: no site under the sites shape covers `update`. Every other visitor outside the five
  forwards a value a site has checked, or produces one that is never listed. The rest of the
  difference is **tomorrow's**. A visitor that brings a value into the walk from outside, as
  identifier, member, call, `new` and tag do, needs its own site under the sites shape, and nothing
  under the funnel.

**Decided: the funnel.** Coverage is equal today, and § 1.2 finding 6 gives the cost as measured.
The sites shape would add a fourth per-visitor invariant beside `CLAUDE.md`'s three: every visitor
that introduces a value must check it. That is the kind of count this repository has recorded wrong
twice. The funnel states the invariant once: no listed function value is pushed, except at a callee
or as `typeof`'s operand. It holds for every visitor, and it is probed in one place. It says nothing
about a value that never passes through the stack: an element a native method returns, or one a
spread expands (finding 8; *Revision 6*).

What the funnel gives up is attribution by visitor. Removing it turns every value route red at once,
where removing one site would turn only its own routes red. The route cases are still read one by
one under the removal (step 4, criterion 2).

**The message** outside the exempt positions is new:
`Access to dangerous function "<name>" is blocked for security reasons`. The name is the identifier,
or the member's property name, or the function's own `name`. No existing assertion meets it (M7).

### 3.4 What stays open

- **`this` handed to native code** (finding 8; [A39](../backlog.md#a39)). Here the library supplies
  the container, so an expression needs only a listed function and `Object` in the context. Step 7
  closes it, in 0.13.0. Under shape (i), 0.12.1 ships with it as a limit. *Added by Revision 6.*
- **A container the host provides, handed to native code** (finding 3; § 8 q2).
- **A function from another realm**, such as an iframe's `eval`.
- **`AsyncFunction` and `AsyncGeneratorFunction` in a downlevelled realm**: not captured, and the
  capture records that (§ 3.1). Only a host can supply one, and the mitigation forbids it.
- **A listed global replaced on its own after the capture**, such as `fetch` or `XMLHttpRequest`
  wrapped late by instrumentation. The sentinel watches `setTimeout` only, so the replacement is not
  in the set until `setTimeout` changes (§ 3.1). Step 2's code review found this.
- **A host function that forwards to a listed one**: a closure, a `Proxy`, or a bound `call`,
  `apply` or `Reflect.apply`. It is not a listed value by identity or by name:
  `Function.prototype.call.bind(eval)` is named `bound call`, and `new Proxy(eval, {})` is named
  `eval`, with no `bound ` prefix. Neither K1 nor the funnel sees it, and the mitigation covers it.
  Step 2's code review measured both.

  **An expression can still build one after step 4**, through `this`. *Corrected by Revision 6*: this
  item said only a host could, once step 4 lands. Building one by reading the listed function as an
  argument or a receiver is refused: `(fwd => fwd(null, "1+1"))(f.call.bind(eval))` throws. But
  `this` hands the listed function to native code without a read (finding 8). So the same forwarder,
  bound to the function taken from `Object.values(Object.values(this)[1])`, gives 2, with `eval`,
  `Object` and a benign `f` in the context. Step 4's code review measured it, and M14 measured it
  again. It closes with A39.
- **The two heuristics**:
  - The source-pattern test can be evaded, and can refuse a benign function.
  - The bound-name rule refuses a host's own bound function that merely carries a listed name, such
    as a wrapper bound as `fetch`.

`SECURITY.md` lists each of these as a limit, in step 5, or in step 8 under shape (ii).

### 3.5 What now throws — the Security entry's list

`modules/eval-core/CHANGELOG.md`'s `[Unreleased]` › Security entry, which the first release versions,
lists exactly these, and nothing else. It also states the two routes it does not cover. A **listed
value** is any member of § 3.1's set, or a bound function whose name, stripped of its `bound `
prefixes, is a listed name.
1. **A tagged template whose tag the call sandbox refuses** — by its written name, a member tag's
   property name, a computed key included, by `Function`'s identity, or by the source-pattern test —
   throws `Function call blocked for security reasons: <name>`. A tag that is a built-in writing into
   its receiver or first argument throws the refusal of the context's write policy. (A36, step 1.)

   The same entry states three changes that are not refusals:
   - a member tag's `this` is its object, or a prior scope's `thisArg`; it was the context;
   - a member tag's own `MemberExpression` raises no `before` or `after` node-hook events and
     leaves no trace entry, as a member callee already does. Its read event is unchanged;
   - a tag that is not a function throws the call's error instead of a `TypeError` from `apply`.
2. **A call, `new` or tagged template whose callee value is a listed value**, under any name. That
   covers an alias, a member, a call result, `this.k`, a scope namespace, a destructured name, an
   optional call, and a case variant under `caseInsensitive`. It also covers a timer under `new` with
   its own name, which `new`'s list of names never held (M11).
   - **The error** is today's message for that site, naming the written name, the property name or
     `anonymous` (step 2).
   - **A callee under which the listed value is read takes item 3's message instead.** Such a
     callee is a sequence, a conditional, a logical, an assignment, or a parenthesised or
     optional-chain expression. The read under it is refused first (step 4).

   *Corrected by Revision 6*: item 2 read "under any name or callee shape".
3. **Every read of a listed value the walk makes**, which throws
   `Access to dangerous function "<name>" is blocked for security reasons` (step 4). The rule is one
   rule: a listed value pushed by any node but an exempt one. Among the reads that hand the value
   on:
   - an argument;
   - the receiver of `call`, `apply` or `bind`;
   - an element of an array or a property of an object the expression builds;
   - a branch of a conditional or a logical;
   - the last expression of a sequence used as a callee, a constructor or a tag;
   - a parenthesised callee under `preserveParens`;
   - the expression's own result.

   **Reads that only inspect the value throw too**, and the entry names them. *Added by Revision 6*,
   from step 4's code review:
   - assigning over a listed function, `fetch = 1` or `obj.fetch = 1`, since an assignment reads
     its target before writing it;
   - a postfix update, `obj.fetch++`, which writes first and then throws
     ([A40](../backlog.md#a40));
   - an operator's operand, `x instanceof Function` or `obj.fetch != null`;
   - a conditional's test;
   - a template interpolation, and a declaration's initializer;
   - `typeof (eval)` under `preserveParens`, whose operand is the parenthesis, not the identifier.

   Two positions do not throw: a callee or tag itself, which is item 2's, and the operand of
   `typeof`. The exemptions are not widened (§ 2).

   **Not covered**, and stated as such in the entry, with the mitigations that hold whatever the
   route: a host places no listed function in the context, and in a browser, a CSP without
   `'unsafe-eval'` stops `eval`, `Function` and a string timer. The two routes are:
   - a container the host provides, spread into a native call (finding 3);
   - `this`, from which an expression builds such a container itself (finding 8,
     [A39](../backlog.md#a39)).

   The entry describes both in prose, and does not print the expressions. *Since Revision 7*, its
   prose about `this` goes no further than `SECURITY.md`'s limit (§ 2). It says that the route
   exists, that 0.13.0 closes it, and that a host stops it by placing no listed function in the
   context.

A37's visitor changes no value an expression evaluates to, and makes nothing throw (finding 4). It is
a `### Fixed` line, not a Security one.

---

## 4. Work breakdown

Each step is one commit, leaves all three projects and the workspace root green, and runs in its own
session. "Wrong" in a criterion names the change the executor makes to show the criterion goes red.
The report gives the failure count for each and reads which cases failed, case by case. Steps 1–4 add
`[Unreleased]` lines to `modules/eval-core/CHANGELOG.md` with their change: › Security for steps 1, 2
and 4, and › Fixed for step 3. No version moves until the first release step: step 6 under shape (i),
step 9 under shape (ii) (§ 2).

*Revised by Revision 6.* Steps 5 and 6 run under shape (i) only. Steps 7–9 are new, and run under
either shape. *Revision 7 chose shape (i)*, so every step runs.

| Step | Subject | Files (main) | Tests: `eval-core` / `eval-signals` / `eval-forms` | Shape | Ships in | State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | A36: the tag call through the sandbox | `tagged-template-expression.ts`, `call-expression.ts` (`callMember`, and `safeCall` exported), new `tagged-template-expression.spec.ts` | **+10** / 0 / 0 | both | the first release | done |
| 2 | K1 and the identity set | new `dangerous-values.ts`; `call-expression.ts`, `new-expression.ts`, `member-write-policy.ts`'s comment; new `eval.service.dangerous-values.spec.ts`; T11 and T12 in `tagged-template-expression.spec.ts` | **+21** / 0 / 0 | both | the first release | done |
| 3 | A37: a `SequenceExpression` visitor | new `sequence-expression.ts` and its spec; `recursive-visitors.ts`; the visitors barrel; the root `README.md`'s node list | **+6** / 0 / 0 | both | the first release | done |
| 4 | The funnel: every read through the walk's own stack | `visitor-result.ts`, `dangerous-values.ts`, the marks in `call-expression.ts`, `new-expression.ts`, `tagged-template-expression.ts` and `unary-expression.ts`; the spec; `.claude/skills/step/SKILL.md` | **+21** / 0 / 0 | both | the first release | done |
| 5 | `SECURITY.md` for 0.12.1: the funnel as a protection, the route through `this` and a host container as limits, the mitigations first | `SECURITY.md`, `public-api.spec.ts`'s allowlist if it needs entries | 0 / 0 / 0 | (i) only | no package | |
| 6 | Release `eval-core` 0.12.1 | `modules/eval-core/package.json`, `CHANGELOG.md` | 0 / 0 / 0 | (i) only | `eval-core` 0.12.1 | |
| 7 | A39: what `this` evaluates to | specified once § 8 q4 is decided | set at its gate | both | `eval-core` 0.13.0 | |
| 8 | `SECURITY.md`'s `this` limit becomes a protection; A39 and A35 retired | `SECURITY.md`, the register; under shape (ii), step 5's text too | 0 / 0 / 0 | both | no package | |
| 9 | Release `eval-core` 0.13.0; each downstream package then widens its peer range | `modules/eval-core/package.json`, `CHANGELOG.md`; the downstream releases are planned with step 7 | 0 / 0 / 0 | both | `eval-core` 0.13.0 | |

From 2451, `eval-core` is at 2509 once step 4 commits. Step 7 sets its own count at its gate.

### Step 1 — A36: the tag call through the sandbox

- **Edit**:
  - `internal/visitors/call-expression.ts`:
    - the call visitor's member branch becomes the internal `callMember`, which takes
      `evaluateMember`'s result, gives the receiver `scopeReceiver` gives, asks the write policy,
      and calls `safeCall` under the property name;
    - `safeCall` is exported.

    The module is internal: `public-api.ts` does not re-export `internal/visitors`, so the `.d.ts`
    does not change. A call's behaviour does not change either.
  - `internal/visitors/tagged-template-expression.ts`. A member tag goes through `evaluateMember`
    and then `callMember`. Any other tag gets the write policy and `safeCall`, with `st.context` as
    `this` as a bare call has, under its identifier's name or none. The tag is evaluated before the
    template's expressions, as today. *Changed at the confirmation gate* (Revision 2): before that,
    every tag was to go through `safeCall` with `st.context`, and a computed key was not to be
    checked by name.
  - `modules/eval-core/CHANGELOG.md`: `[Unreleased]` › Security, § 3.5's item 1.
  - `SECURITY.md`: one sentence under Call sandboxing, saying a tagged template's tag goes through
    the same checks. `public-api.spec.ts`'s identifier case stays green.
  - `docs/backlog.md` and `docs/backlog-retired.md`: A36 retired as fixed and not yet released, with
    its index row re-pointed; "Work in flight".
  - `.claude/skills/step/SKILL.md`: step 1's description and the per-step counts (Revision 2).
  - This document: Revision 2 and the outcome.
- **New**: `internal/visitors/tagged-template-expression.spec.ts`, with ten cases:
  - **T1** `` Function`return 7`() ``, with `Function` bound: refused,
    `Function call blocked for security reasons: Function`.
  - **T2** `` eval`1+1` ``: refused, naming `eval`.
  - **T3** `` setTimeout`x` ``: refused, naming `setTimeout`.
  - **T4** a host tag whose source text contains `globalThis`: refused, naming `host`.
  - **T5** `` obj.fetch`x` ``: refused by its property name.
  - **T6** a benign tag: called with the cooked strings and the values, and `this` is `st.context`,
    pinned as today's behaviour.
  - **T7** `` obj["fetch"]`x` ``: refused, naming `fetch`, as `obj["fetch"]()` is.
  - **T8** `` FUNCTION`return 7`() `` under `caseInsensitive`: refused, by `Function`'s identity.
  - **T9** a member tag that reaches a mutating built-in asks the context's write policy, and a
    policy that refuses makes the tag throw its refusal. A second leg checks the same for an
    identifier tag, whose receiver is the context.
  - **T10** `` obj.m`x` `` sees `this === obj`, and through a prior scope with a `thisArg`, it sees
    the `thisArg`.
- **Exit criteria**, fixed at the confirmation gate (Revision 2):
  1. T1–T10 pass.
  2. **The probes**, read case by case:
     - **(i)** *Wrong*: restore the old visitor. T1–T5 and T7–T10 fail, and T6 stays green.
     - **(ii)** *Wrong*: drop the write policy from the tag path only. T9 alone fails.
  3. No existing assertion changes, and the call specs are untouched and green.
     `performance.spec.ts` is green and untouched. The gate is green. `git diff --name-only` lists
     the files above and this document.
- **Category**: a behaviour change on a published path, released in step 6.
- **Outcome** — done 2026-10-15, under Revision 2.
  - **Red first.** Written before the fix, nine cases failed and T6 passed. Each failure was for its
    named reason:
    - T1–T5, T7 and T8 did not throw;
    - T9 did not throw, because the old visitor's `push` wrote into the context object;
    - T10 received the context.
  - **Probe (i)**: 9 failures, T1–T5 and T7–T10. T6 stayed green, and nothing else in the suite
    failed.
  - **Probe (ii)**: T9 alone failed. Dropping the policy from one branch at a time also failed T9
    alone, each time on that branch's own leg.
  - **Totals.** The gate is green at 2461 / 438 / 375, so `eval-core` gained exactly ten cases.

### Step 2 — K1 and the identity set

- **New**: `internal/visitors/dangerous-values.ts`, exported from no barrel. It holds:
  - the identity set of § 3.1: captured lazily, with zone's originals and the additive sentinel;
  - the function-constructor capture helper, which takes its prototype source as an argument;
  - the bound-name rule;
  - `isDangerousValue(value)`.
- **Edit**: `call-expression.ts` (`isFunctionSafe`) and `new-expression.ts` (`isConstructorSafe`)
  refuse `isDangerousValue` with today's messages. Also `modules/eval-core/CHANGELOG.md`'s
  `[Unreleased]` › Security (§ 3.5's item 2), "Work in flight", and this document's outcome.
- **Edit**, added by Revision 2:
  - `member-write-policy.ts`: `consultMethodWrite`'s docblock still says it is called by
    `call-expression.ts`. Since step 1, `tagged-template-expression.ts` calls it too. Step 1's code
    review found this (its N3). It is a comment only.
  - `tagged-template-expression.spec.ts` gains two cases. Both pin step 1's behaviour, which the step 1
    review found no case pinning (its W2):
    - **T11** a member tag and an identifier tag are each evaluated before the template's
      expressions. The case asserts the order through side effects.
    - **T12** a tag that is not a function throws the call's own error,
      `Value is not a function: <type>`.
- **New**: `actual/services/eval.service.dangerous-values.spec.ts`, with nineteen cases:
  - **S1** the set in this realm, by identity: `Function`, `eval`, `setTimeout` and its zone
    original, `setInterval` and its zone original, `XMLHttpRequest`, `WebSocket`, `GeneratorFunction`.
    The helper records `AsyncFunction` and `AsyncGeneratorFunction` as not captured, since this realm
    downlevels them (finding 5).
  - **S2** the helper with an injected prototype source whose `constructor` is a stand-in function:
    the stand-in is captured.
  - **S3** the helper with an injected source whose `constructor` is `Function`: nothing is added,
    and the helper records it as not captured.
  - **C1** an alias, `run("1+1")`.
  - **C2** a member callee, `tools.run("1+1")`.
  - **C3** a call-result callee, `getEval()("1+1")`.
  - **C4** `this.run("1+1")`.
  - **C5** a scope namespace, `ns.run("1+1")`.
  - **C6** a destructured `run`.
  - **C7** an optional alias, `run?.("1+1")`.
  - **C8** a host-bound callee, `e = eval.bind(null)`.
  - **C9** a doubly bound callee, `e = eval.bind(null).bind(null)`, named `"bound bound eval"`.
  - **C10** a tag alias, `` run`1+1` ``.
  - **C11** `new X(f, 0)`, with `X` the realm's `setTimeout` and `f` a `jest.fn()`: refused, and `f`
    never runs. Today it constructs and schedules `f`. *Changed at the confirmation gate*
    (Revision 3): it was `new X()` with `X = XMLHttpRequest`, which jsdom's source text already
    refuses.
  - **C12** a context holding zone's original `setTimeout`, called as `t(…)`.
  - **C13** a timer global replaced after the capture: the case installs a new `setTimeout`, binds
    it as `t`, and restores the original after.
  - **C14** `eval?.("1+1")`: today's name refusal, pinned.
  - **C15** `EVAL("1+1")` under `caseInsensitive`, with `eval` bound under its own name. Today it
    gives 2 (M10). Added by Revision 2.
  - **C15t** `` EVAL`1+1` `` under `caseInsensitive`, the same route as a tag. After step 1 it is
    checked by name, which the list does not hold, so it still reaches `eval`. Added by Revision 2.

  Each C case is refused with today's message and its written name: `run`, `e`, `t`, `X`, `EVAL`,
  `eval`, or `anonymous`.
- **Exit criteria**:
  1. S1–S3, C1–C15, C15t, T11 and T12 pass.
  2. **The probes**, one fix removed at a time, read case by case:
     - **(i)** `isDangerousValue` taken out of both safety checks: C1–C13, C15 and C15t fail, and C14
       stays green.
     - **(ii)** the bound-name rule removed: C8 and C9 alone fail.
     - **(iii)** one `bound ` prefix stripped instead of all of them: C9 alone fails.
     - **(iv)** zone's originals left out of the capture: C12 and S1 fail. *Corrected in step 2*
       (Revision 3): it read "C12 alone", which S1 made unsatisfiable, since S1 checks the same
       capture by identity.
     - **(v)** the sentinel removed: C13 alone fails.
     - **(vi)** the helper's `=== Function` guard removed: S1 and S3 fail, since each records
       `Function` as captured. *Changed at the confirmation gate* (Revision 3): it read "S3 alone".
     - **(vii)** the template's expressions evaluated before the tag: T11 fails.
     - **(viii)** `safeCall`'s function check bypassed for the tag: T12 fails.
  3. No existing assertion changes. `eval.service.call-security.spec.ts` and `public-api.spec.ts`,
     including `sandboxRefuses`' benign stand-in, are green and unmodified. `performance.spec.ts` is
     green and untouched. The gate is green. `git diff --name-only` lists the files above and this
     document.
- **Category**: a behaviour change on a published path, released in step 6.
- **Outcome** — done 2026-10-15, under Revision 3.
  - **Red first.** Written before the fix, C1–C13, C15 and C15t failed, each because it did not
    throw. C14 passed, as today's name refusal. T11 and T12 passed, since they pin step 1's
    behaviour. Against the visitor before step 1, T11 also passes and T12 does not.
  - **C11's and C12's second leg.** With K1 out and each refusal swallowed, both failed because `f`
    had run, so "`f` never runs" can fail.
  - **Probes**, each against the whole `eval-core` suite:
    - **(i)**: 15 failures, C1–C13, C15 and C15t. C14 stayed green, and nothing else failed.
    - **(ii)**: C8 and C9 alone.
    - **(iii)**: C9 alone.
    - **(iv)**: C12 and S1. The criterion fixed at the gate said "C12 alone", which S1 made
      unsatisfiable: S1 checks the same capture by identity, and it failed at that check. So the
      leg is corrected in place, not amended, as (vi) was at the gate. The correction turns more
      cases red, and weakens none.
    - **(v)**: C13 alone.
    - **(vi)**: S1 and S3, each at its record of what was captured.
    - **(vii)**: T11, at its member leg. With only the identifier branch reordered, T11 failed at
      its identifier leg.
    - **(viii)**: T12, at its identifier leg. With only the member branch bypassed, T12 failed at
      its member leg.
  - **An import cycle, by design.** `dangerous-values.ts` imports `DANGEROUS_FUNCTIONS` from
    `call-expression.ts`, which imports it back. The list stays in `call-expression.ts` because
    `public-api.spec.ts` asserts its `'fetch',` literal there. The list is read at the first
    capture, never while either module loads. That has to hold: the flattened bundle declares
    `dangerous-values`' code before `DANGEROUS_FUNCTIONS`, so a read at load would be a
    temporal-dead-zone `ReferenceError` on import. The review loaded the built bundle in Node and
    evaluated through K1 without one. The build's silence is no evidence either way, since
    ng-packagr discards rollup's circular-dependency warnings.
  - **The code review** found no Critical issue. Its three warnings changed text, not code:
    - **W1**: the gate's "not a browser attack route" for C11 was wrong (M11). C11's comment,
      finding 1, § 3.5 item 2 and the Security entry now state the route.
    - **W2**: the Security entry's bullet on the sentinel claimed any replaced timer is added,
      where only `setTimeout` is watched. The bullet is gone, § 3.1 is corrected, and the residual
      is in § 3.4.
    - **W3**: a host function that forwards to a listed one is not a listed value. That joins
      § 3.4 and § 9.

    Of its notes:
    - the set is a `WeakSet`, assigned once it is filled (N1);
    - zone's prefix is read as zone.js reads it, from `__Zone_symbol_prefix` (N2);
    - C14 binds a stand-in under `eval`, so only the name check can refuse it (N4). With the name
      check removed, C14 alone fails. With K1 removed from the call check, C14 stays green.

    Probes (iv), (v) and (vi) were run again on the revised module, with the same results as above.
  - **Totals.** The gate is green at 2482 / 438 / 375, so `eval-core` gained exactly 21 cases.

### Step 3 — A37: a `SequenceExpression` visitor

- **New**: `internal/visitors/sequence-expression.ts`. It evaluates each expression in order, pops
  each value, and pushes the last one, so it leaves exactly one value on the stack. It brackets its
  body with `beforeVisitor` / `afterVisitor` and pushes no scope.
- **New**: `internal/visitors/sequence-expression.spec.ts`, with six cases:
  - **Q1** `(0, 1)` gives 1 and leaves the stack empty. Today it leaves one entry.
  - **Q2** `((1, 2), 3)` gives 3 and leaves the stack empty. Today it leaves two.
  - **Q3** `[(1, 2), 3]` gives `[2, 3]`, and `f((1, 2), 3)` passes `2, 3`; each leaves the stack
    empty. Today each leaves one.
  - **Q4** `(x = 1, x + 1)` gives 2: each expression is evaluated once, left to right. Pinned; it is
    right today too. A second leg: `(n++, n++)` gives 1 and leaves `n` at 2. *Changed at the
    confirmation gate* (Revision 4).
  - **Q5** one `before` and one `after` event for the `SequenceExpression`, the `after` carrying the
    last value. Today there are none. The case also asserts one trace entry for the node, carrying
    the last value. *Changed in step 3* (Revision 4).
  - **Q6** a reused state, `createState` and then three evaluations of `(0, 1)`, still has an empty
    stack. Today it holds three entries.
- **Edit**:
  - `internal/visitors/recursive-visitors.ts`: register the visitor.
  - `internal/visitors/public-api.ts`, the visitors barrel: export the visitor, which
    `recursive-visitors.ts` imports from it, as it imports every other visitor. The barrel is not
    re-exported by `src/public-api.ts`. *Added at the confirmation gate* (Revision 4).
  - The root `README.md`: add `SequenceExpression` to its "ESTree nodes supported" list, which
    `CLAUDE.md` requires of a new visitor. Phase 10's step 3 carries the list into the package
    README when Phase 10 resumes.
  - `modules/eval-core/CHANGELOG.md`: `[Unreleased]` › Fixed. A sequence leaves one value and shows
    one node to hooks; no value an expression evaluates to changes.
  - `docs/backlog.md` and `docs/backlog-retired.md`: A37 retired as fixed and not yet released, with
    its index row re-pointed; "Work in flight".
  - This document: the outcome.
- **Exit criteria**:
  1. Q1–Q6 pass.
  2. **The probe.** *Wrong*: unregister the visitor. Q1, Q2, Q3, Q5 and Q6 fail, and Q4 stays green,
     since the base walker's last value is right. Read case by case.
  3. **A second wrong implementation**: the visitor pushes the last value without popping the
     others. Q1, Q2, Q3 and Q6 fail.
  4. No existing assertion changes. `performance.spec.ts` is green and untouched. The gate is green.
     `git diff --name-only` lists the files above and this document. The built `.d.ts` is
     byte-identical to step 2's. *That leg was added at the confirmation gate* (Revision 4).
- **Category**: a fix on a published path, released in step 6. No value changes (finding 4).
- **Outcome** — done 2026-10-15, under Revision 4.
  - **The search, before the code.** Every string and template literal in the three projects' 90
    spec files was parsed: with acorn, then with the built `eval-core` `parse`, with and without
    `colonIdentifiers`. Three literals hold a sequence, and none is asserted through hook events or
    trace entries:
    - `(xs[0] = 7, xs[0])` in `member-write-policy.spec.ts`, which asserts the value;
    - `'call, bound'`, a test label;
    - `'1,2'` in `eval-forms`' `coercion.spec.ts`, an expected string.

    Of the literals that contain a comma and parse with neither parser, none that reads as code is
    an expression. No spec builds a `SequenceExpression` node.
  - **Red first.** Written before the visitor, five cases failed and Q4 passed:
    - Q1, Q2, Q3 and Q6 left 1, 2, 1 and 3 entries on the stack;
    - Q5 saw no event.
  - **Probes**, each against the whole `eval-core` suite:
    - **criterion 2**, the visitor unregistered: 5 failures, Q1, Q2, Q3, Q5 and Q6. Q4 stayed green,
      and nothing else failed.
    - **criterion 3**, the last value pushed and the others left on the stack: 4 failures, Q1, Q2, Q3
      and Q6. Nothing else failed. Q4 and Q5 stayed green: no value changes, the `after` event reads
      the top of the stack, which is still the last value, and the one push still makes the one
      trace entry.

    In both, each failure was at its stack assertion, and Q5's at its `before` events. Q3 failed at
    its element leg, which stops it before its argument leg.
  - **Two more wrong implementations**, for the legs Revision 4 added:
    - each expression evaluated twice: Q4 failed at its counting leg, and its `(x = 1, x + 1)` leg
      passed. The existing `member-write-policy.spec.ts` case that writes through `(xs[0] = 7, xs[0])`
      failed too, by recording two writes;
    - the push made without its trace entry: Q5 alone failed, at its trace leg.
  - **The code review** found no Critical issue and no warning. Its two notes changed text, not code:
    - **N1**: the leftovers were worse than one entry per sequence. Within one walk, a `for` update
      `i++, j--` left one entry per iteration, and an arrow body `x => (a, b)` one per call; the
      review measured 5 and 4 on the bundle with the registration removed. The Fixed line and A37's
      retired entry now say so.
    - **N2**: two more visible changes follow from the hook and trace bullets. Under `trackTime`,
      `nodeTimings` gains a `SequenceExpression` entry, and `tracePushCount` counts one more per
      sequence, so `traceTruncated` can be set on a walk that used to fit. Both texts now list them.

    It also measured what the step's probes did not reach: Q3's argument leg alone leaves one entry
    with the visitor unregistered, and an empty `expressions` array, built by hand since acorn
    never produces one, still leaves the stack balanced.
  - **The surface.** The built `.d.ts` is byte-identical to step 2's: one file,
    `types/zvenigora-ng-eval-core.d.ts`, with the same SHA-256 from a build at step 2's commit and a
    build in this step's gate, whose bundle holds the visitor.
  - **Totals.** The gate is green at 2488 / 438 / 375, so `eval-core` gained exactly six cases.

### Step 4 — the funnel

- **Objective**: no listed value passes through the walk's own stack, except at a callee, a tag or
  `typeof`'s operand. Every value an expression reads and hands on is checked where it is pushed.
  *Narrowed by Revision 6*:
  - It was every value the expression could hand to native code.
  - It does not cover a value that reaches native code without a push: a host container's elements,
    or what native code returns from `this` (§ 3.4, findings 3 and 8).
- **Edit**:
  - `visitor-result.ts`: `pushVisitorResult` calls the check only when
    `typeof value === 'function'`. A value that is not a function pays one comparison and no frame,
    and the docblock says so.
  - `dangerous-values.ts`: the refusal, and the exempt-node `WeakSet`.
  - The marks: `call-expression.ts`, `new-expression.ts` and `tagged-template-expression.ts` mark
    the callee or tag node they visit, before evaluating it, and `unary-expression.ts` marks a
    `typeof` operand. A member callee or member tag is evaluated by `evaluateMember` and never
    pushed, so it is not marked. *That reading was fixed at the confirmation gate* (Revision 5).
  - The spec, `eval.service.dangerous-values.spec.ts`. `modules/eval-core/CHANGELOG.md`'s
    `[Unreleased]` › Security (§ 3.5's item 3), "Work in flight", and this document's outcome.
  - `.claude/skills/step/SKILL.md`, in three places: the step 4 count, the timing wording, and the
    stop-and-replan rule, narrowed from any `public-api.ts` to the published barrels. *Added at the
    confirmation gate* (Revision 5).
- **The spec gains 21 cases**, each refused with
  `Access to dangerous function "<name>" is blocked for security reasons`, except V16:
  - **V1** `eval.call(null, "1+1")`.
  - **V2** `eval.apply(null, ["1+1"])`.
  - **V3** `eval.bind(null)("1+1")`.
  - **V4** `Function.call(null, "return 7")()`.
  - **V5** `["1+1"].map(eval)`.
  - **V6** `Reflect.apply(eval, null, ["1+1"])`.
  - **V7** `Promise.resolve("1+1").then(eval)`, refused synchronously, at the read.
  - **V8** `(0, eval)("1+1")`, on step 3's correct walk.
  - **V9** `(c ? eval : f)("1+1")`.
  - **V10** `(eval)("1+1")` under `preserveParens`.
  - **V11** `["1+1"].map(tools.eval)`.
  - **V12** `tools["ev" + "al"].call(null, "1+1")`.
  - **V13** `["1+1"].map(getEval())`.
  - **V14** the nested container, `[[run, null, ["1+1"]]].map(apply.bind(Reflect.apply, null))`.
  - **V15** `["1+1"].map(e)`, with `e` a bound `eval`.
  - **V16** `typeof eval === "function"`: **passes**, true. The operand is exempt.
  - **V17** `eval` alone, the expression's result.
  - **V18** `typeof f(eval)`: refused, naming `eval`, since the argument is not `typeof`'s operand.
  - **V19** **additive recapture**: after a first evaluation, replace `globalThis.setTimeout`. Both
    the value captured before the replacement and the replacement are refused when passed to
    `[f].map(…)`, and `f`, a `jest.fn()`, never runs. The original global is restored after.
    *Changed at the confirmation gate* (Revision 5): it was `["x"].map(…)`.
  - **V20** `new (0, X)(f, 0)`, with `X` the realm's `setTimeout`: refused, naming `X`, and `f`
    never runs. *Added at the confirmation gate* (Revision 5).
  - **V21** `` (0, eval)`1+1` ``: refused, naming `eval`. *Added at the confirmation gate*
    (Revision 5).

  V8–V10, V20 and V21 assert the **read** message, not the site's message. That is what shows the
  callee and tag exemptions do not leak: their identifier is not the callee or tag node. K1 already
  refuses each of them with the site's message, naming `anonymous` (M12), so before the fix they are
  red by message, not by running.
- **Exit criteria**, fixed at the confirmation gate (Revision 5):
  1. V1–V21 pass, and every step 1–3 case still passes.
  2. **The probes**, each against the whole `eval-core` suite, read case by case:
     - **(i)** the funnel's check removed: every V case fails except V16, which passes either way.
       Nothing else fails.
     - **(ii)** each callee exemption widened to its node's whole subtree, one at a time:
       - the call's, a member callee's subtree included: V1–V4, V8–V10, V12 and V14 alone fail;
       - `new`'s: V20 alone;
       - the tag's: V21 alone.

       *Changed at the confirmation gate* (Revision 5). It was one probe, under which V8–V10 alone
       failed. M12 showed V3 and V4 fail too, since each one's callee is a call whose subtree holds
       the read.
     - **(iii)** the `typeof` exemption widened to the operand's whole subtree: V18 alone fails.
     - **(iv)** the bound-name rule removed: V15 fails, and so do step 2's C8 and C9.
     - **(v)** recapture that replaces the set instead of adding to it: V19 alone fails.
     - **(vi)** each mark removed, one at a time. Existing cases fail, each because it gets the read
       message instead of its site's:
       - the call's: 13 cases. Those are `eval.service.call-security.spec.ts`'s direct calls to
         `eval`, `Function`, `setTimeout` and `setInterval`, and C1, C3, C6–C9, C12, C13 and C15;
       - `new`'s: 2 cases, `eval.service.call-security.spec.ts`'s `new Function` and C11;
       - the tag's: 5 cases, T1, T2, T8, C10 and C15t;
       - `typeof`'s: V16 alone.

       *Added at the confirmation gate* (Revision 5).
  3. **No existing assertion changes**, in all three projects. M7 measured this for the prototype,
     and M12 did again on the tree after step 3.
  4. **Performance.** `performance.spec.ts` is green and untouched. **The timing line**, fixed at
     the confirmation gate from M13 (Revision 5):
     - **The harness.** Plain Node against the production bundle: step 3's, built at its commit,
       against this step's. Six cached expressions, recorded in the outcome; a fresh state per
       evaluation; 15 rounds of 120,000 evaluations; min and median per process. Three rotations,
       one process per bundle in each, with the order alternating.
     - **Void.** A rotation is void when either process's slowest round is more than twice its
       fastest. All three are void when step 3's three medians spread by more than 8%. A void is
       re-run, up to three times, and every void is reported.
     - **Red** when this step's median is above step 3's by more than **10.7%** in at least two of
       three valid rotations. That is M13's baseline spread, 5.7%, plus 5%, and it does not move
       with a run's own noise. A red stops the step.
     - **The outcome states the cost as measured**: the mean of the median deltas, and how many
       rotations were slower. Pass or fail alone is not enough.
  - The gate is green. `git diff --name-only` lists the files above and this document.
- **Category**: a behaviour change on a published path, released in the first release: step 6 under
  shape (i), step 9 under shape (ii). § 3.5's item 3 is the change a consumer can notice.
- **Outcome** — done 2026-10-16. It was implemented and verified under Revision 5, held through
  Revision 6's replan, and committed under Revision 7.
  - **Before the commit**, the Security entry and the funnel's docblock in `dangerous-values.ts`
    were cut back to § 2's prose limit for the route through `this`. Neither changes code, and the
    gate ran again on the result.
  - **Red first.** Written before the fix, 20 V cases failed and V16 passed.
    - V3, V8–V10, V20 and V21 failed on K1's call message, as M12 predicted.
    - The other 14 failed because nothing threw.
  - **Probes**, each against the whole `eval-core` suite. Every one turned exactly its named cases
    red, and nothing else:
    - (i): 20 cases, every V case except V16.
    - (ii): the call's, V1–V4, V8–V10, V12 and V14; `new`'s, V20; the tag's, V21.
    - (iii): V18.
    - (iv): V15, C8 and C9.
    - (v): V19.
    - (vi): the call's, the 13 named; `new`'s, the 2; the tag's, the 5; `typeof`'s, V16.
  - **Timing, criterion 4: green**, and no rotation was void or re-run.

    | Rotation | Step 3 min / median | Step 4 min / median | Median delta |
    | :--- | :--- | :--- | :--- |
    | 1 | 212.5 / 222.1 | 221.4 / 233.5 | +5.1% |
    | 2 | 212.3 / 224.6 | 212.0 / 226.2 | +0.7% |
    | 3 | 210.1 / 220.5 | 214.9 / 225.4 | +2.2% |

    - **The cost as measured.** Step 4 was slower in all three rotations, by a mean of **+2.7%** on
      the median. That is under the 10.7% line in every rotation. The minimums moved +4.2%, −0.1%
      and +2.3%.
    - **The run itself.** Step 3's three medians spread 1.9%, against the 8% that would void the
      run. Values agree across the two bundles.
    - **The six expressions**:
      - `a + b * c - d / e`
      - `user.profile.name.length > 3 && user.active`
      - `max(a, b) + min(c, d)`
      - `items.filter(x => x > 2).map(x => x * k)`
      - `` flag ? `${first} ${last}` : "none" ``
      - `typeof fn === "function" ? fn(a) : 0`

      Each is evaluated 20,000 times per round, with a fresh `EvalState.fromContext` each time.
  - **The gate** was green at 2509 / 438 / 375. The built `.d.ts` is byte-identical to step 3's, and
    the bundle loads and evaluates in plain Node, so the wider import cycle is safe.
  - **The code review** raised one Critical, which stopped the step and produced this replan:
    - **The Critical**: the route through `this` (finding 8, [A39](../backlog.md#a39)).
    - **W1**: reads that only inspect a value throw too. They went into § 3.5 item 3, and the
      postfix update's write became [A40](../backlog.md#a40).
    - **W2**: the timing and this status. The timing had run before the review, but its brief
      omitted it.
    - **N1**: § 3.3's account of `update` and `await`, corrected.
    - **N2**: the exempt set's docblock now states its tree assumption.

### Step 5 — `SECURITY.md` for 0.12.1 (shape (i) only)

*Revised by Revision 6.* It no longer retires A35, which retires with A39 in step 8. Under shape
(ii) this step is skipped, and step 8 carries its text.

- **Edit**:
  - `SECURITY.md`:
    - **It leads with the mitigations that hold whatever the route**: place no listed function in
      the context, under any name, nor an object from which one is reachable. In a browser, a
      Content Security Policy without `'unsafe-eval'` stops `eval`, `Function` and a string timer,
      whatever reaches them. U3's advisory recommends the same (§ 5).
    - "The call checks refuse a name, not a value" moves from the limits to the protections, as
      "Dangerous function values". It covers:
      - the set as § 3.1 lists it, and when and why it is captured;
      - K1, and the funnel with its two exemptions, and that the funnel sees only the walk's own
        values;
      - the bound-name rule, beside the source-pattern heuristic.
    - The limits keep § 3.4's list, with the route through `this` first, fixed in 0.13.0
      ([A39](../backlog.md#a39)). It is described at § 2's prose limit: that it exists, that
      0.13.0 closes it, and how a host stops it. Neither its mechanism nor an expression appears.
      *Revision 7.*
    - The Reporting section points at the repository's "Report a vulnerability" form once the
      maintainer has enabled private vulnerability reporting (§ 5, U1). Until then it stays as it is.
  - `modules/eval-core/src/public-api.spec.ts`: allowlist entries only if the new text needs them,
    each with its reason.
  - `docs/backlog.md`: "Work in flight". A35 stays open.
  - This document: the outcome.
- **Exit criteria**:
  1. `public-api.spec.ts`'s three `SECURITY.md` cases are green. The advisory sections are unchanged.
     doc-links is green.
  2. **Every route in § 1.2 findings 1 and 8 appears in `SECURITY.md`**, as refused or as a limit,
     and each limit names its case or its measurement.
  - Tests unchanged in all three projects. The gate is green.
- **Category**: documents. Ships in no package.

### Step 6 — Release `eval-core` 0.12.1 (shape (i) only)

- **The release commit**: bump `modules/eval-core/package.json` to 0.12.1, and move
  `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` items under `## [0.12.1] - <date>`. The full gate
  runs.
- **Exit criteria**:
  1. The gate is green. Both downstream `lint` targets stay green with their ranges unchanged, since
     each range already admits 0.12.1.
  2. **The built `.d.ts` is byte-identical to 0.12.0's tarball** (`npm pack` outside the repository).
     Every change in steps 1–4 is internal.
  3. **The Security entry lists exactly § 3.5's three items**, and states the two routes item 3 does
     not cover. The Fixed entry lists A37.
  4. Then CONTRIBUTING's Releasing steps 3–6: publish, confirm with `npm view`, tag
     `eval-core@0.12.1` at the release commit, and write the post-publish commit. That commit adds a
     Publication status row and a Register history row, and `tools/release-tags.mjs` is green on it.
     Publishing and tagging are the maintainer's actions (§ 5).
- **Category**: the release, a patch.

### Step 7 — A39: what `this` evaluates to

*Added by Revision 6.*
- **Specified once § 8 q4 is decided.** Q4's measurement runs first. The decision is a plan
  revision in its own commit, and this step's files, cases, probes and count are fixed then, at its
  confirmation gate.
- **What it must do, whatever the target**:
  - A39's probes, P1, P2 and G1, no longer yield a listed value to native code.
  - Every case that pins what `this` is today, as q4's measurement finds them, either holds or is
    changed deliberately and listed as breaking.
- **Scope.** What `this` evaluates to is decided in `this-expression.ts` and `identifier.ts`, inside
  `internal/visitors/`. A change to `EvalContext` would fall outside that, and its gate would have to
  name it.
- **Category**: a breaking change on a published path, released in step 9 as 0.13.0.

### Step 8 — `SECURITY.md`'s `this` limit becomes a protection; A39 and A35 retired

*Added by Revision 6.*
- **Edit**:
  - `SECURITY.md`: the route through `this` moves from the limits to the protections. Under shape
    (ii), this step also carries step 5's text.
  - `docs/backlog.md` and `docs/backlog-retired.md`: A39 and A35 retired as fixed and not yet
    released, with their index rows re-pointed and the links the gate lists re-pointed. "Work in
    flight" is updated.
  - This document: the outcome.
- **Exit criteria**: step 5's, with every route in findings 1 and 8 accounted for.
- **Category**: documents. Ships in no package.

### Step 9 — Release `eval-core` 0.13.0

*Added by Revision 6.*
- **The release commit**: bump `modules/eval-core/package.json` to 0.13.0, and move the
  `[Unreleased]` items under `## [0.13.0] - <date>`, with step 7's breaking change stated first.
- **Downstream.** Neither peer range admits 0.13.0: `eval-signals`' is `>=0.11.0 <0.13.0` and
  `eval-forms`' is `>=0.12.0 <0.13.0`. Step 6's criterion 1 reads both downstream `lint` targets as
  checking their range against `eval-core`'s version. So the bump cannot land alone: each range
  widens in a release of its own. That is planned with step 7, where this plan's "no downstream
  code" rule changes.
- **Exit criteria**: set when step 7 is specified. They include the `.d.ts` against the previous
  release's tarball, differing only as step 7 states.
- **Category**: the release, a minor carrying a breaking change.

---

## 5. The maintainer's actions

| # | Action | When |
| :--- | :--- | :--- |
| U1 | Enable private vulnerability reporting on the repository | Before U3, and before step 5 if `SECURITY.md`'s Reporting section is to point at the form in that commit |
| U2 | Publish each release and push its tag, per CONTRIBUTING steps 3–5: `eval-core` 0.12.1, then 0.13.0 | After step 6's release commit, and after step 9's |
| U3 | **One** GHSA advisory for `@zvenigora/ng-eval-core`, published **after 0.13.0**. Rated `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N`, **4.7 Medium**; affected `<= 0.12.1`, **patched 0.13.0**. It covers dangerous function values callable past the name-based call sandbox (A35, A39), and the unsandboxed tag call (A36). It describes 0.12.1 as partial hardening: it refuses those values at the callee and at every read through the walk, and leaves one route open that 0.13.0 closes. It names `new setTimeout("…")` under zone.js, and recommends a Content Security Policy without `'unsafe-eval'` as the mitigation that holds in every version. It prints no expression for the route through `this` (§ 2). *Revised by Revision 7*: it was patched 0.12.1, then one advisory per shape | After 0.13.0's U2 |

U3's rating, in two lines (Revision 3; it was "low"):
- **AC:H**: the attack needs the host to have placed a listed function in the context, a condition
  the expression's author does not control. AV:N, PR:N and UI:R read the expression as arriving from
  elsewhere and evaluated in a victim's page.
- **S:C, C:L, I:L**: the impact is code execution in the consumer's origin, through `eval` or a
  string timer, beyond the evaluator's sandbox. That is scored as FIRST scores cross-site scripting.

U3's AC:H holds for the route through `this` as well. The expression's author needs the host to
have placed a listed function, and `Object` or `Reflect`, in the context.

After U3 comes a docs-only commit. It adds the advisory to `SECURITY.md`'s "Advisories for ng-eval"
table, a section otherwise unchanged since Phase 10 step 2, and its ID to the retired entries of A35,
A36 and A39.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | +10, +21, +6 and +21 in steps 1–4; step 7's is set at its gate; 0 in steps 5, 6, 8 and 9 |
| `eval-signals` / `eval-forms` tests | (in the above) | Unchanged in every step |
| Perf | `internal/performance.spec.ts` | Green and untouched in every step; the gate |
| Timing | Step 4's harness against step 3's bundle | Step 4 only: green on its line, fixed at that step's confirmation gate (step 4, criterion 4). A red stops the step |
| Scope | `git diff --name-status` | The step's file list. No `R`. In steps 1–4 a non-spec `.ts` change outside `modules/eval-core/src/lib/internal/visitors/` is a stop-and-replan |
| Surface | The built `.d.ts` against the previous release's tarball | Step 6: byte-identical to 0.12.0's. Step 9: differs only as step 7 states |

---

## 7. Risks

| Risk | Likelihood | Mitigation — the criterion that fails |
| :--- | :---: | :--- |
| A consumer relied on reading a listed function: passing `fetch` to a host function, or returning it | Low; no existing case does (M7) | § 3.5 lists it in the Security entry; step 4's V17 pins it. `typeof` is exempt (V16) |
| The set captures the wrong timers under zone.js | Medium without the lazy capture | Step 2's S1, C12 and C13 |
| A recapture drops a value captured earlier | Medium without the additive rule | Step 4's V19, probe (v) |
| An exemption is wider than its node | Medium | Step 4, probes (ii) and (iii) |
| The funnel slows the hot path | Low: medians up to about 3.5% (§ 3.3), and up to 8.5% in M13's preview | `performance.spec.ts`, the gate; step 4's timing line (criterion 4) |
| The bound-name rule refuses a host's harmless wrapper | Low | Documented as a heuristic (§ 3.4) |
| Async constructors not captured in a downlevelled realm | Certain in the test realm (finding 5) | Recorded by the helper (S1, S3); a limit in `SECURITY.md` (§ 3.4) |
| A host container reaches native code | Certain (finding 3) | § 8 q2; `SECURITY.md`'s limit |
| `this` hands native code a container the library supplies | Certain with `Object` in the context (finding 8) | [A39](../backlog.md#a39), step 7, in 0.13.0. Until then, a limit in `SECURITY.md` and the Security entry, with the mitigations first |
| A consumer feature-tests or compares a listed function: `obj.fetch != null`, `x instanceof Function` | Low | § 3.5 item 3 names these reads; the exemptions are not widened (§ 2) |

---

## 8. Open questions

1. **Capturing `AsyncFunction` and `AsyncGeneratorFunction` where async is downleveled.** *Decided*
   (§ 2): from literals only, never through `Function` or `eval`. Where the constructor read is
   `Function`, nothing is added and the helper records it. Tested with an injected prototype source
   (step 2, S2 and S3).
2. **A container the host provides, handed to native code** (finding 3). A shallow check at the call
   site, over the expanded arguments and the receiver, would close `Reflect.apply(...pair)`. A
   deeper container would stay open. *Decided* at step 2's confirmation gate (Revision 3): **no
   container check; a limit only**. A partial check of host containers has no boundary that can be
   stated: one level of nesting, or two, or the receiver's own properties, each leaves the next
   level open, and none matches anything a host could rely on. So the limit is stated whole instead,
   in `SECURITY.md` at step 5 (§ 3.4).
3. **Is 0.12.1 a patch, and how is the change worded?** *Decided* (§ 2): a patch. The funnel exempts
   `typeof`'s operand, so `typeof eval === "function"` still holds, and the Security entry lists
   exactly what now throws (§ 3.5).
4. **What should `this` evaluate to?** ([A39](../backlog.md#a39), step 7.) *Open, added by
   Revision 6.* **Measure first, then decide.**

   The measurement answers two questions:
   - **Who relies on it today.** Find every expression in the three projects' specs, and in the
     READMEs' and `docs/` examples, that evaluates `this` or `this.k`. Read what each asserts about
     what `this` is.
   - **What breaks under each candidate.** Prototype each, and run all three suites and A39's probes:
     - **the host's original object**;
     - **a frozen shallow view** of it;
     - **nothing**: `undefined`, or a refusal;
     - **by position**, *added by Revision 7*. `this` is allowed as the object of a member read,
       which keeps the documented `this.k` resolution ([B6](../backlog-retired.md#b6)). Wherever
       else it escapes as a value, it is refused or made opaque. The exemption is by node position,
       as the callee's is: the member visitor marks its object node when that is a `this`, and the
       push of an unmarked `this` is refused or replaced.

     Read case by case: which assertions fail, and whether P1, P2 and G1 close. **Every candidate is
     measured before step 7 is specified.**

   **One expectation to measure, not assume.** The original object and a plain shallow view both
   hold the listed values themselves. So `Object.values(this)` would still return them, and on their
   own they would not close the route. A view would have to leave listed values out. Each candidate
   is therefore read twice: for what it breaks, and for whether it closes the route.

   `this.k` resolves `k` against the context today (`member-expression.ts`), independently of what
   `this` alone evaluates to. Whether that stays is part of the decision.

   The target is decided from the measurement, as a plan revision before step 7 is specified.
5. **The release shape: (i) 0.12.1 then 0.13.0, or (ii) 0.13.0 alone?** Added by Revision 6.
   *Decided 2026-10-16* (Revision 7): **(i)** (§ 2). Steps 5 and 6 run. Whether Phase 10's step 3
   or this plan's step 7 runs after step 6 is not yet decided.

---

## 9. Contract after this lands

*Revised by Revision 6.* Items 1–4 hold once step 4 lands. Item 6 holds once step 7 lands.

1. A call, `new` or tag whose callee value is in the identity set, or is a bound function of a
   listed name, is refused, whatever name it is reached by. The refusal uses today's message, or
   item 2's when the value is read under the callee.
2. Outside a callee, a tag and `typeof`'s operand, no such value is pushed into the walk. Reading
   one throws `Access to dangerous function "<name>" is blocked for security reasons`. That covers
   every read the walk makes, including those that only inspect the value (§ 3.5 item 3). It covers
   nothing that never passes through the walk's stack.
3. A `SequenceExpression` leaves exactly one value on the stack, and shows one node to hooks.
4. Through step 4, every existing assertion holds, and nothing in the `.d.ts` changes.
5. **Not provided**, in either shape:
   - protection for a host-provided container handed to native code;
   - protection for a function from another realm;
   - protection for `AsyncFunction` and `AsyncGeneratorFunction` where they are downlevelled;
   - protection for a listed global other than `setTimeout`, replaced on its own after the capture;
   - protection for a host function that forwards to a listed one (§ 3.4).

   **Until step 7 lands**, also not provided: protection for the route through `this`, by which an
   expression builds a container of the context's listed functions itself
   ([A39](../backlog.md#a39)). It can build such a forwarder the same way.
6. **Once step 7 lands**, `this` no longer hands native code the caller's context object. What it
   evaluates to is § 8 q4's decision.
