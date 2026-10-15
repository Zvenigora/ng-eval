# A35 — dangerous function values past the call sandbox (`@zvenigora/ng-eval-core`)

**Date**: October 14, 2026
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
**Target package**: `@zvenigora/ng-eval-core`, released as **0.12.1**. That is a patch (§ 2), and
both downstream peer ranges already admit it: `eval-signals`' `>=0.11.0 <0.13.0` and `eval-forms`'
`>=0.12.0 <0.13.0`.
**Also touches**: no downstream code. `eval-signals` and `eval-forms` run as the downstream
witnesses, with their counts unchanged.
**Fixes**:
- [A36](../backlog-retired.md#a36) in step 1;
- [A35](../backlog.md#a35) in steps 2 and 4;
- [A37](../backlog.md#a37) in step 3.

**Pauses**: Phase 10 after its step 2 ([plan](../documentation/phase-10-plan.md)). It resumes at its
step 3 once this plan's step 6 and the post-publish commit have landed.
**Source**: the requests of 2026-10-14. Phase 10 step 2's review found the class, which was then
measured route by route. The decisions in § 2 were fixed before this plan was committed.
**Objective**: an expression cannot call, or hand to native code, a dangerous function value that
the context holds or that is reachable from it, whatever name or route it uses. Every existing
assertion holds.

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
- Then `SECURITY.md` moves the limit into the protections, A35 retires, and a separate commit
  releases 0.12.1.

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

   No hook sees the node: there are 0 `after` events for it. This is [A37](../backlog.md#a37), which
   joins this plan as step 3, so the funnel's `(0, eval)` case runs on a correct walk.
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

### 1.3 Measurements run for this plan

M1–M4, M6, M8, M9 and M10 ran against `dist/modules/eval-core`, or in Jest, with throwaway code. M5–M8
used throwaway prototypes of both shapes in the library: a shared check module, the callee marks,
and the gated checks. Everything was **reverted** and its files deleted before this plan's commit:
`git status` showed only the plan's files, and the library had no diff against `HEAD`.

| ID | Question | Method | Result |
| :--- | :--- | :--- | :--- |
| M1 | The three callback routes | `evaluate(parse(…))` against the built bundle | `["1+1"].map(eval)` is `[2]`; `Reflect.apply(eval, null, ["1+1"])` is 2; `Promise.resolve("1+1").then(eval)` resolves to 2 |
| M2 | Entry routes | The same | Finding 1's member, call-result, destructuring, `this`, namespace, nested, bound and tag rows |
| M3 | Callee shapes and stack balance | The same, reading `state.result.stack.length` after the walk | `(0, eval)()` 2, leaving 1; `(c ? eval : f)()` 2, leaving 0; `eval?.()` refused; `run?.()` 2; `(eval)()` under `preserveParens` 2; `Reflect.apply(...pair)` 2; `(0, 1)` 1, leaving 1; `typeof eval` `"function"` |
| M4 | The identity set in the test realm | A throwaway Jest spec | Finding 5 |
| M5 | Timing inside Jest | A throwaway timing spec, in separate runs and interleaved | Discarded: finding 7 |
| M6 | **Timing, the method this plan uses** | A production build of each shape, fixed per process; Node against the bundle; 6 cached expressions; 15 rounds of 120,000 evaluations; one process per shape, rotated three times | § 3.3's table |
| M7 | Existing suites under each shape | `nx run-many -t test` with each shape on | Funnel and sites alike: `eval-core` 2451 of 2451 existing cases, `eval-signals` 438, `eval-forms` 375 |
| M8 | Routes under each shape | A throwaway Jest spec over 23 routes, with each shape on | § 3.3 |
| M9 | `SequenceExpression` today | `evaluate(parse(…))` against the built bundle, with an `after` hook on the node and `state.result.stack.length` read after the walk | Finding 4 |
| M10 | Case variants, member tags, a tag that is not a function | The same, at step 1's confirmation gate and in the step | Under `caseInsensitive`: `EVAL("1+1")` 2, `` Eval`1+1` `` `["1+1"]`, `` FUNCTION`return 7`() `` 7. `` obj["fetch"]`x` `` runs a stand-in where `obj["fetch"]()` is refused. An undefined or a string tag throws a `TypeError` from `apply` |
| M11 | A timer under `new` | Step 2's code review: zone.js 0.16.3's source, and the 0.12.0 tarball with a zone-shaped timer bound under its own name. Step 2's red-first run of C11 in the test realm | `new setTimeout("…", 0)` constructs, and the string reaches the native timer. The wrapper is `function () { return patchDelegate(this, arguments); }`, its `toString` shows the original's, and a handler that is not a function goes to `delegate.apply` |

---

## 2. Decisions — recorded, not reopened

- **A36 is its own entry and step 1, fixed alone**, with its own cases and its own probe. It ships in
  the same 0.12.1.
- **A37 joins this plan as step 3, before the funnel**: a `SequenceExpression` visitor that leaves
  exactly one value. It has its own cases and its own probe, and ships in 0.12.1.
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
- **0.12.1 is a patch.** The `[Unreleased]` › Security entry lists exactly what now throws (§ 3.5).
- **The release** is a separate commit after the fix steps, following CONTRIBUTING's Releasing
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

**`performance.spec.ts` remains the gate.** M6's method is reported in the funnel's step, beside
these figures, and it gates nothing.

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
- **1 not constructible**: `this` handed to a callback. `this` is always the `EvalContext` object,
  so no listed value can arrive that way.

**Which value-producing visitors each shape covers without a site of its own.**
- **The funnel** covers all 25 visitor files that push, with no site in any of them, and any visitor
  added later. That includes step 3's `SequenceExpression`.
- **The sites** cover five files: identifier, member, call, `new` and tag. The 20 others have no
  check:
  - **Forwarding a child's value**, which a site already checked: conditional, logical, assignment,
    block, expression-statement, for, if, program.
  - **Producing values that are never a listed function**: arrow (an expression-made closure), array
    and object (containers), literal, template-literal, binary, unary, update, empty,
    variable-declaration.
  - **`this`**, which pushes `st.context`, always an `EvalContext` object.
  - **`await`**, which pushes a promise through `pushVisitorResultAsync`.

  So **today** no visitor outside the five can push a listed value that no site has checked, and
  coverage is equal. The difference is **tomorrow's**. A visitor that brings a value into the walk
  from outside, as identifier, member, call, `new` and tag do, needs its own site under the sites
  shape and nothing under the funnel.

**Decided: the funnel.** Coverage is equal today, and § 1.2 finding 6 gives the cost as measured.
The sites shape would add a fourth per-visitor invariant beside `CLAUDE.md`'s three: every visitor
that introduces a value must check it. That is the kind of count this repository has recorded wrong
twice. The funnel states the invariant once: no listed function value is pushed, except at a callee
or as `typeof`'s operand. It holds for every visitor, and it is probed in one place.

What the funnel gives up is attribution by visitor. Removing it turns every value route red at once,
where removing one site would turn only its own routes red. The route cases are still read one by
one under the removal (step 4, criterion 2).

**The message** outside the exempt positions is new:
`Access to dangerous function "<name>" is blocked for security reasons`. The name is the identifier,
or the member's property name, or the function's own `name`. No existing assertion meets it (M7).

### 3.4 What stays open

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
  Step 2's code review measured both. **Only a host can make one once step 4 lands**: building
  either reads the listed function as an argument or a receiver, which the funnel refuses. Until
  then, an expression with a listed function in reach can build one.
- **The two heuristics**:
  - The source-pattern test can be evaded, and can refuse a benign function.
  - The bound-name rule refuses a host's own bound function that merely carries a listed name, such
    as a wrapper bound as `fetch`.

`SECURITY.md` lists each of these as a limit (step 5).

### 3.5 What now throws — the Security entry's list

`modules/eval-core/CHANGELOG.md`'s `[Unreleased]` › Security entry, which step 6 versions, lists
exactly these, and nothing else. A **listed value** is any member of § 3.1's set, or a bound function
whose name, stripped of its `bound ` prefixes, is a listed name.
1. **A tagged template whose tag the call sandbox refuses** — by its written name, a member tag's
   property name, a computed key included, by `Function`'s identity, or by the source-pattern test —
   throws `Function call blocked for security reasons: <name>`. A tag that is a built-in writing into
   its receiver or first argument throws the refusal of the context's write policy. (A36, step 1.)

   The same entry states three changes that are not refusals:
   - a member tag's `this` is its object, or a prior scope's `thisArg`; it was the context;
   - a member tag's own `MemberExpression` raises no `before` or `after` node-hook events and
     leaves no trace entry, as a member callee already does. Its read event is unchanged;
   - a tag that is not a function throws the call's error instead of a `TypeError` from `apply`.
2. **A call, `new` or tagged template whose callee value is a listed value**, under any name or
   callee shape: an alias, a member, a call result, `this.k`, a scope namespace, a destructured name,
   an optional call, a case variant under `caseInsensitive`, or a timer under `new` with its own name,
   which `new`'s list of names never held (M11). The error is today's message for that site, naming
   the written name, the property name or `anonymous` (step 2).
3. **Any other read of a listed value**, which throws
   `Access to dangerous function "<name>" is blocked for security reasons` (step 4). That covers:
   - an argument;
   - the receiver of `call`, `apply` or `bind`;
   - an element of an array or a property of an object the expression builds;
   - a branch of a conditional or a logical;
   - the last expression of a sequence used as a callee;
   - a parenthesised callee under `preserveParens`;
   - the expression's own result.

   Two positions do not throw: a callee itself, which is item 2's, and the operand of `typeof`.

A37's visitor changes no value an expression evaluates to, and makes nothing throw (finding 4). It is
a `### Fixed` line, not a Security one.

---

## 4. Work breakdown

Each step is one commit, leaves all three projects and the workspace root green, and runs in its own
session. "Wrong" in a criterion names the change the executor makes to show the criterion goes red.
The report gives the failure count for each and reads which cases failed, case by case. Steps 1–4 add
`[Unreleased]` lines to `modules/eval-core/CHANGELOG.md` with their change: › Security for steps 1, 2
and 4, and › Fixed for step 3. No version moves until step 6.

| Step | Subject | Files (main) | Tests: `eval-core` / `eval-signals` / `eval-forms` | Ships in |
| :--- | :--- | :--- | :--- | :--- |
| 1 | A36: the tag call through the sandbox | `tagged-template-expression.ts`, `call-expression.ts` (`callMember`, and `safeCall` exported), new `tagged-template-expression.spec.ts` | **+10** / 0 / 0 | `eval-core` 0.12.1 |
| 2 | K1 and the identity set | new `dangerous-values.ts`; `call-expression.ts`, `new-expression.ts`, `member-write-policy.ts`'s comment; new `eval.service.dangerous-values.spec.ts`; T11 and T12 in `tagged-template-expression.spec.ts` | **+21** / 0 / 0 | `eval-core` 0.12.1 |
| 3 | A37: a `SequenceExpression` visitor | new `sequence-expression.ts` and its spec; `recursive-visitors.ts`; the root `README.md`'s node list | **+6** / 0 / 0 | `eval-core` 0.12.1 |
| 4 | The funnel | `visitor-result.ts`, `dangerous-values.ts`, the marks in `call-expression.ts`, `new-expression.ts`, `tagged-template-expression.ts` and `unary-expression.ts`; the spec | **+19** / 0 / 0 | `eval-core` 0.12.1 |
| 5 | `SECURITY.md`'s limit becomes a protection; A35 retired | `SECURITY.md`, `public-api.spec.ts`'s allowlist if it needs entries, the register | 0 / 0 / 0 | no package |
| 6 | Release `eval-core` 0.12.1 | `modules/eval-core/package.json`, `CHANGELOG.md` | 0 / 0 / 0 | `eval-core` 0.12.1 |

From 2451, `eval-core` ends at 2507 if every step lands as planned.

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
    right today too.
  - **Q5** one `before` and one `after` event for the `SequenceExpression`, the `after` carrying the
    last value. Today there are none.
  - **Q6** a reused state, `createState` and then three evaluations of `(0, 1)`, still has an empty
    stack. Today it holds three entries.
- **Edit**:
  - `internal/visitors/recursive-visitors.ts`: register the visitor.
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
     `git diff --name-only` lists the files above and this document.
- **Category**: a fix on a published path, released in step 6. No value changes (finding 4).

### Step 4 — the funnel

- **Edit**:
  - `visitor-result.ts`: `pushVisitorResult` calls the check only when
    `typeof value === 'function'`. A value that is not a function pays one comparison and no frame,
    and the docblock says so.
  - `dangerous-values.ts`: the refusal, and the exempt-node `WeakSet`.
  - The marks: `call-expression.ts`, `new-expression.ts` and `tagged-template-expression.ts` mark
    the callee node before evaluating it, and `unary-expression.ts` marks a `typeof` operand.
  - The spec. `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` › Security (§ 3.5's item 3), "Work
    in flight", and this document's outcome.
- **The spec gains nineteen cases**, each refused with
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
    `["x"].map(…)`. The original global is restored after.

  V8–V10 assert the **read** message, not the call message. That is what shows the callee exemption
  does not leak: their identifier is not the callee node.
- **Exit criteria**:
  1. V1–V19 pass, and every step 1–3 case still passes.
  2. **The probes**, read case by case:
     - **(i)** the funnel's check removed: every V case fails except V16, which passes either way.
       Nothing else fails.
     - **(ii)** the callee exemption widened to the callee's whole subtree: V8–V10 alone fail. They
       reach K1 and take its call message instead.
     - **(iii)** the `typeof` exemption widened to the operand's whole subtree: V18 alone fails.
     - **(iv)** the bound-name rule removed: V15 fails, and so do step 2's C8 and C9.
     - **(v)** recapture that replaces the set instead of adding to it: V19 alone fails.
  3. **No existing assertion changes**, in all three projects. M7 measured this for the prototype.
  4. **Performance.** `performance.spec.ts` is green and untouched; it is the gate. The step reports
     M6's method on the step's bundle beside § 3.3's figures, and that report gates nothing.
  - The gate is green. `git diff --name-only` lists the files above and this document.
- **Category**: a behaviour change on a published path, released in step 6. § 3.5's item 3 is the
  change a consumer can notice.

### Step 5 — `SECURITY.md`'s limit becomes a protection; A35 retired

- **Edit**:
  - `SECURITY.md`:
    - "The call checks refuse a name, not a value" moves from the limits to the protections, as
      "Dangerous function values". It covers the set as § 3.1 lists it, when the set is captured
      and why, K1 and the funnel with its two exemptions, and the bound-name rule beside the
      source-pattern heuristic.
    - The limits keep § 3.4's list.
    - It recommends a Content Security Policy without `'unsafe-eval'` as the mitigation that holds
      in every version. In a browser, that stops `eval`, `Function` and a string timer, whatever
      reaches them. U3's advisory recommends the same (§ 5).
    - The Reporting section points at the repository's "Report a vulnerability" form once the
      maintainer has enabled private vulnerability reporting (§ 5, U1). Until then it stays as it is.
  - `modules/eval-core/src/public-api.spec.ts`: allowlist entries only if the new text needs them,
    each with its reason.
  - `docs/backlog.md` and `docs/backlog-retired.md`: A35 retired as fixed and not yet released, with
    its index row re-pointed, and the links the gate lists re-pointed. "Work in flight" is updated.
  - This document: the outcome.
- **Exit criteria**:
  1. `public-api.spec.ts`'s three `SECURITY.md` cases are green. The advisory sections are unchanged.
     doc-links is green.
  2. **Every route in § 1.2 finding 1 appears in `SECURITY.md`**, as refused or as a limit, and each
     limit names its case or its measurement.
  - Tests unchanged in all three projects. The gate is green.
- **Category**: documents. Ships in no package.

### Step 6 — Release `eval-core` 0.12.1

- **The release commit**: bump `modules/eval-core/package.json` to 0.12.1, and move
  `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` items under `## [0.12.1] - <date>`. The full gate
  runs.
- **Exit criteria**:
  1. The gate is green. Both downstream `lint` targets stay green with their ranges unchanged, since
     each range already admits 0.12.1.
  2. **The built `.d.ts` is byte-identical to 0.12.0's tarball** (`npm pack` outside the repository).
     Every change in steps 1–4 is internal.
  3. **The Security entry lists exactly § 3.5's three items**, and the Fixed entry lists A37.
  4. Then CONTRIBUTING's Releasing steps 3–6: publish, confirm with `npm view`, tag
     `eval-core@0.12.1` at the release commit, and write the post-publish commit. That commit adds a
     Publication status row and a Register history row, and `tools/release-tags.mjs` is green on it.
     Publishing and tagging are the maintainer's actions (§ 5).
- **Category**: the release, a patch.

---

## 5. The maintainer's actions

| # | Action | When |
| :--- | :--- | :--- |
| U1 | Enable private vulnerability reporting on the repository | Before U3, and before step 5 if `SECURITY.md`'s Reporting section is to point at the form in that commit |
| U2 | Publish `eval-core` 0.12.1 and push its tag, per CONTRIBUTING steps 3–5 | After step 6's release commit |
| U3 | Publish a GHSA advisory for `@zvenigora/ng-eval-core`, rated `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N`, **4.7 Medium**: affected `<= 0.12.0`, patched 0.12.1. It covers dangerous function values callable past the name-based call sandbox (A35), and the unsandboxed tag call (A36). Its text names `new setTimeout("…")` under zone.js, and recommends a Content Security Policy without `'unsafe-eval'` as the mitigation that holds in every version | After U2 |

U3's rating, in two lines (Revision 3; it was "low"):
- **AC:H**: the attack needs the host to have placed a listed function in the context, a condition
  the expression's author does not control. AV:N, PR:N and UI:R read the expression as arriving from
  elsewhere and evaluated in a victim's page.
- **S:C, C:L, I:L**: the impact is code execution in the consumer's origin, through `eval` or a
  string timer, beyond the evaluator's sandbox. That is scored as FIRST scores cross-site scripting.

After U3 comes a docs-only commit. It adds the advisory to `SECURITY.md`'s "Advisories for ng-eval"
table, a section otherwise unchanged since Phase 10 step 2, and its ID to A35's and A36's retired
entries.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | +10, +21, +6, +19, then 0 and 0 |
| `eval-signals` / `eval-forms` tests | (in the above) | Unchanged in every step |
| Perf | `internal/performance.spec.ts` | Green and untouched in every step; the gate. M6's method is reported in step 4 and gates nothing |
| Scope | `git diff --name-status` | The step's file list. No `R`. In steps 1–4 a non-spec `.ts` change outside `modules/eval-core/src/lib/internal/visitors/` is a stop-and-replan |
| Surface | The built `.d.ts` against the 0.12.0 tarball | Step 6: byte-identical |

---

## 7. Risks

| Risk | Likelihood | Mitigation — the criterion that fails |
| :--- | :---: | :--- |
| A consumer relied on reading a listed function: passing `fetch` to a host function, or returning it | Low; no existing case does (M7) | § 3.5 lists it in the Security entry; step 4's V17 pins it. `typeof` is exempt (V16) |
| The set captures the wrong timers under zone.js | Medium without the lazy capture | Step 2's S1, C12 and C13 |
| A recapture drops a value captured earlier | Medium without the additive rule | Step 4's V19, probe (v) |
| An exemption is wider than its node | Medium | Step 4, probes (ii) and (iii) |
| The funnel slows the hot path | Low: medians up to about 3.5% (§ 3.3) | `performance.spec.ts`, the gate; step 4's M6 report |
| The bound-name rule refuses a host's harmless wrapper | Low | Documented as a heuristic (§ 3.4) |
| Async constructors not captured in a downlevelled realm | Certain in the test realm (finding 5) | Recorded by the helper (S1, S3); a limit in `SECURITY.md` (§ 3.4) |
| A host container reaches native code | Certain (finding 3) | § 8 q2; `SECURITY.md`'s limit |

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

---

## 9. Contract after this lands

1. A call, `new` or tag whose callee value is in the identity set, or is a bound function of a
   listed name, is refused with today's message, whatever name or callee shape it is reached by.
2. Outside a callee and `typeof`'s operand, no such value is pushed into the walk. Reading one throws
   `Access to dangerous function "<name>" is blocked for security reasons`.
3. A `SequenceExpression` leaves exactly one value on the stack, and shows one node to hooks.
4. Every existing assertion holds, and nothing in the `.d.ts` changes.
5. **Not provided**: protection for a host-provided container handed to native code, for a function
   from another realm, for `AsyncFunction` and `AsyncGeneratorFunction` where they are downlevelled,
   for a listed global other than `setTimeout` replaced on its own after the capture, or for a host
   function that forwards to a listed one (§ 3.4).
