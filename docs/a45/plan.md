# A45 part 2 and A44 — assignment targets as JavaScript evaluates them (`@zvenigora/ng-eval-core`)

**Date**: October 23, 2026
**Revision**: 5 — the post-publish record, at step 7 (2026-10-26 UTC). The three releases are
published and tagged annotated at 0d305a3. § 0 gains rule 13, from step 6's code review: a
downstream "unchanged" claim is measured on each fixed defect's own rows. Step 7 opened
[F26](../backlog.md#f26), the release tag check's blindness to a lightweight tag. § 10 is the track's
retrospect. **The plan is complete.**
**Revision**: 4 — D11, found at step 2's confirmation gate and measured first (M12). Up to 0.13.3 an
assignment target was walked, so the identifier visitor refused `this` written as a name: a
host-built `Identifier` named `this`, and under `caseInsensitive` any spelling of it, `This += 1`
included. § 3.2's target read had no such test, so step 2 would have dropped that refusal for
compound targets and step 3 for `=`, while an update already writes, `This++` under
`caseInsensitive`. D11 keeps the refusal on every identifier target path: the target read in step 2,
the `=` resolver and the identifier update in step 3. The characterisation spec gains group T, 8 rows
and 16 cases, pinned today. Its marks are witnessed by steps 2 and 3's probes, not by the pinned
prototype, which predates D11: a stated exception to § 0 rule 10 (step 1's addendum). Rows: 100,
cases 200. `eval-core` is at 3080 from this revision, and reaches 3116 at step 3. Step 2's widening,
group V, adds 8 cases, so step 2 ends at 3088 and step 3 at 3124 (step 2's outcome). Step 3's
widening, three D7 rows, adds 6 more: step 3 ends at 3130 (step 3's outcome).
**Revision**: 3 — the request's third instruction, measured first (M11). D10 brings
[A52](../backlog-retired.md#a52) into step 2. Under `caseInsensitive` the identifier visitor's own read takes
the literals fallback only when `get` finds `undefined`, the rule § 3.2 gives the target read, so
there is one read, exported and shared. With the Revision 2 prototype plus that change, all three
suites stayed green at 2880 / 443 / 380, and on `{ x: null }` every M9 row gave JavaScript's value in
both modes. Group N's held `x === null` becomes a step-2 flip. M11 also moved one row the request did
not name: group B's `n.x = 1` under `caseInsensitive` now throws the case-sensitive message, since `n`
reads as `null`, so it flips at step 2 too. So held cases fall from 19 to 18, and step 1's probe (i)
predicts 28. Step 2 gains a probe, `??` restored in the visitor alone, which turns red exactly those
two cases. A52 stays open until step 5 retires it with A44 and A45. The identifier read joins step 4's
reported paths, which no decision rule covers. The row and case counts, and 3064 / 3100, are
unchanged.
**Revision**: 2 — the request of 2026-10-23's second instruction, measured before it was written
(M8–M10, M5b). Step 1 gains hold marks. Every row whose value after its step is not JavaScript's,
for a reason still open, names the register entry that holds it, and records that value per mode
(step 1's hold table). Steps 2 and 3 compare each row with the native run except held rows, which
match their recorded values. The `=` resolver's edges are fixed in § 3.3, and group B gains the
receivers they turn on: `null`, `undefined` and a function. Revision 1's q6, q5 and q1 are decided as
D7, D8 and D9. Measuring D7 found that § 3.3's resolver lacked the case-sensitive blocklist check the
read used to make, so `o.constructor = f()` called `f` before refusing. Measuring D9 found that the
target read's literal fallback turned `null` into `undefined`, which put four existing cases red. Both
are corrected in § 3.3 and § 3.2. q2, q3 and q4 are now [A48](../backlog.md#a48)–[A51](../backlog.md#a51),
q4 as two entries since its two halves are different code paths. The `null` read is
[A52](../backlog-retired.md#a52). q8 is folded into A48. Rows: 92, cases 184. `eval-core` reaches 3064 at
step 1 and 3100 at step 3.
**Revision**: 1 — initial plan.
**Target package**: `@zvenigora/ng-eval-core`, released as **0.14.0**, a minor that carries breaking
changes (D5; the precedent is 0.8.0). `eval-signals` 0.6.x and `eval-forms` 0.6.x declare
`>=0.13.0 <0.14.0`, so both release to admit it. M5 measured that `eval-signals` observes D2, so
whether each release is a patch or a minor is § 8 q7, decided at step 6's gate.
**Also touches**: no downstream code through step 5. `eval-signals` and `eval-forms` run as the
downstream witnesses with their counts unchanged (M4).
**Fixes**:
- [A45](../backlog-retired.md#a45) part 2, in steps 2 and 3;
- [A44](../backlog-retired.md#a44), in step 3;
- an identifier update's missing blocklist checks and read event, D8 and D9, in step 3. Neither has a
  register entry: Revision 1 recorded them as § 8 q5 and q1;
- [A52](../backlog-retired.md#a52), in step 2 (D10, Revision 3);
- the `this` refusal on every identifier target (D11, Revision 4). An identifier update of `this`
  written as a name writes it as a key today, and is refused from step 3. No compound or `=` target
  loses the refusal in steps 2 and 3. It has no register entry: step 2's confirmation gate found it.

**Opens**: [A48](../backlog.md#a48)–[A51](../backlog.md#a51) (Revision 2), for defects the plan
measured and does not fix. The characterisation spec holds their rows. [A52](../backlog-retired.md#a52),
opened with them, the plan fixes in step 2 (D10). Step 5 opens
[A53](../backlog.md#a53), step 4's unexplained `caseInsensitive` slowdown.
**Reopens**: Phase 1's decision that assignment and update targets emit read events
([`side-effects/phase-1-plan.md`](../side-effects/phase-1-plan.md):274-280), for assignment
targets only (§ 2, D2).
**Source**: the request of 2026-10-23, which fixed decisions D1–D6 and proposed the step shape that
§ 4 adjusts in two places (§ 4's preamble).
**Objective**: an assignment evaluates its target as JavaScript does. A member target's object and
key are evaluated once. `=` never reads the target's value, and a compound or logical operator reads
it once. Effects happen in JavaScript's order: object, key, read, right side, write. Read events
follow the reads. Under `caseInsensitive` the write reaches the key the lookup matched. No refusal
JavaScript's own reads would make is lost: a compound or logical target is still refused by the
funnel. The refusal that goes is the funnel's at an `=` target, a read JavaScript does not make.

**Conclusion, stated first so the rest reads as its argument**:
- **Nothing in the three suites pins today's behaviour** (M4). A throwaway prototype of D1–D4 left
  `eval-core` 2880, `eval-signals` 443 and `eval-forms` 380 green. Two of its pieces, removed one at a
  time, turned 1 and 2 existing cases red, and a third turned none. So step 1 writes the only witness
  first: a characterisation spec of 92 rows in both modes, each marked with the step that flips it
  (100 rows from Revision 4, whose group T the prototype does not witness).
  Its probe is the prototype itself: applied in step 1, it must turn red exactly the marked cases.
  Where the value after the change is still not JavaScript's, the row is held under the register
  entry that keeps it open (Revision 2).
- **Then compound and logical targets take update's shape** (step 2): one `evaluateMember` call for a
  member, no walk for an identifier. **Update's shape bypasses the funnel**, which is why `obj.fetch++`
  writes `NaN`. So the read value goes through the funnel's check explicitly, or `obj.fetch += 1` and
  `fetch ||= 1` stop being refused (M4, probe P2).
- **Then `=` gets its own resolver, and A44 lands in both visitors** (step 3). For an identifier, the
  resolver keeps the blocklist checks the operand walk used to make, or `constructor = 1` would write
  as `constructor++` does today (M1c). For a member, it walks the object and the key, runs the read
  path's key checks before the right side (D7), and matches the key under `caseInsensitive` without
  reading the value. The identifier update gains the same checks (D8) and one read event (D9).
- **The read path keeps its shape** (D6). It gains a fifth tuple slot, the key the lookup matched,
  which it already computes for the read event. Paired against HEAD over twelve rotations, that cost
  +0.12% by median, positive in 6 of 12 (M6). Step 4 measures the result against a decision rule
  stated here in advance. It met no regression: the member read moved −0.86% by median, positive in
  4 of 12, and the member write −20.90%, positive in 0 of 12 (step 4's outcome).
- **What § 1 found and D1–D10 do not decide is in the register**, as A48–A51, and the spec holds their
  rows. A52, also found here, is fixed in step 2 (D10). The largest is A49: the context branch's
  `getThis` reads the value it tests, so `this.g = 1`
  still calls a getter on the context. § 8 keeps one question open, the downstream versions.

---

## 0. Failure modes carried forward

Neither the A35 plan nor the Phase 10 plan has a § 0. The latest plan that does is Phase 2's
([`statements/phase-2-plan.md`](../statements/phase-2-plan.md) § 0.1), and the measurement rules
before it are Phase 6's ([`forms/phase-6-plan.md`](../forms/phase-6-plan.md) § 0.2). The A35 plan
keeps its standing rules in its second § 1.2 ("Standing rules, from Revision 16"), and the Phase 10
plan keeps its rules in § 6.1. This section collects them, each with its origin, and adds the four
that this plan's own measurements produced, the fourth at step 7 (Revision 5). Every step applies all of them; § 4's criteria cite them
by number.

**Carried forward**

1. **A criterion naming a property states the implementation that satisfies it while being wrong**
   (Phase 2 § 0.1). A property is not a detector. That plan's fifth instance was the correction
   written to close the fourth, so the rule applies to its own corrections too.
2. **A mechanism question is settled by measurement, against the artifact the claim is about**
   (Phase 6 § 0.2). A number from a neighbouring tool is a fact about that tool. Here the artifacts
   are the production bundle for values and timings, and the gate for counts. Jest is used only for
   what Jest runs.
3. **A measurement supports only what its arms distinguish** (Phase 6 § 0.2). Before citing one,
   name the arm that would have produced the claim's negation.
4. **Grep for the claim, not for the section** (Phase 6 § 0.2). A fix scoped to the section a finding
   names leaves the same claim standing elsewhere. This plan's own instance is § 1.5, whose list is
   built by grep and confirmed by running the change.
5. **Every risk, criterion and published claim names the thing that goes red when it is violated**
   (Phase 6 § 0.2.1). If the answer is a section number, it is not an answer.
6. **A refusal's message names its layer, and a case that expects a refusal asserts the message**
   (A35, second § 1.2). The cheapest way for a security case to go green is for its setup to fail
   first. Step 3 has a live instance: the resolver's key checks and `safeSetProperty` refuse with one
   message. D7 makes the resolver's layer attributable by an effect instead: it refuses before the
   right side runs, so its cases assert that the right side was not called (M8b).
7. **Every supported option gets a leg, and the fixture is checked under it** (A35, second § 1.2).
   Under `caseInsensitive`, `fromContext` copies a plain object into a `Registry`. So a write lands in
   the copy, a getter on the context is read at the copy, and the caller's object is not the one
   written (M1d, M1g).
8. **Each probe is applied alone and reverted, and its red cases are read case by case**
   (`CLAUDE.md`; the A45 part 1 entry). A suite going red is not the evidence; which cases went red
   is.
9. **A case that reads a document is probed by breaking the document, and every new check has a
   probe that proves it can fail** (Phase 10 § 6.1). It applies to step 5's README and `SECURITY.md`
   edits.

**Added by this plan**

10. **A suite that stays green under a change may be evidence that nothing looks.** M4 ran the whole
    change, prototyped, against all three suites, and nothing went red. Read as "the change is safe",
    that result would have been the wrong conclusion, at exactly the moment it was most tempting. So:
    before a behavioural change, run its prototype against the suite and count the red cases. When
    the count is zero, the spec that pins today's behaviour comes first. Its marks are then the
    change's criterion, and the prototype is the probe that checks them.
11. **A timing is a paired, signed comparison inside one run, never two runs side by side.** M6 timed
    the same bundle against a copy of itself. Single rotations swung from −17.6% to +20.2%, and the
    median of six A/A rotations differed by 6.5%. Between two runs an hour apart the machine's speed
    moved by about 1.5×. So a timing claim pairs within each rotation, counts the signs, and carries an
    A/A control in the same run (§ 3.8).
12. **Borrowing a mechanism's shape borrows its gaps.** "Take update's shape" is the obvious
    instruction for compound targets. But update's member branch never pushes its operand, so the
    funnel never sees it. That gap is why `obj.fetch++` writes `NaN`
    ([A40](../backlog-retired.md#a40)). The prototype without an explicit check turned one existing
    case red, and with it none. Before reusing a shape, list what it does not do.
13. **A downstream "unchanged" claim is measured on each fixed defect's own rows, through the
    downstream package** (*Revision 5*, from step 6). § 8 q7's measurement reused M5's rows, and
    each of them spelled its key as the data does. So [A44](../backlog-retired.md#a44), a defect
    this plan fixed, never ran through `eval-signals` or `eval-forms`. Both 0.7.0 entries said that
    `SignalContextWriteError` was unchanged until step 6's code review measured `user.NAME = "Bob"`
    under `caseInsensitive`, whose `key` moved from `NAME` to `name`. Before a downstream entry
    claims a surface unchanged, list the defects the release fixes, and run one row of each through
    that surface.

---

## 1. Current state

### 1.1 What exists today

Measured at db287da, the commit before this plan. 5b5a937 is its parent. Line numbers are at db287da.

| Element | Where | State |
| :--- | :--- | :--- |
| Assignment visitor | `internal/visitors/assignment-expression.ts` | Walks `node.left` as an operand (`:50`), so the target is read and its value pushed through the funnel. Then it applies part 1's short-circuit (`:58-64`) and walks the right side (`:66`). For an identifier it writes through `assignToBinding` (`:90`). For a member it calls `evaluateMember` **a second time**, after the right side, and writes to the object and key that call yields (`:93`, `:104`) |
| Update visitor | `internal/visitors/update-expression.ts` | Identifier: `getKey` under `caseInsensitive`, then `context.get`, with **no read event and no walk** (`:22-45`). Member: **one** `evaluateMember` call (`:47`), no walk, and no push before the result, so the funnel does not see the operand |
| `evaluateMember` | `internal/visitors/member-expression.ts:86-289` | Evaluates the object and the key, reads the value and emits the read event, all in one call. It returns `[receiver, key, value, origin]`. The key is the key **as spelled**, while the read matched `resolvedKey` (`:188`, `:259-261`), which goes to the read event only. Under `caseInsensitive`, a key that no own property matches is tested by **reading** `obj[key]` (`:226`) |
| Context branch | `member-expression.ts:110-150` | Blocklist check, `getKey` and the resolved-key check under `caseInsensitive`, `get`, then `getThis`. `getThis` (`eval-context.ts:342`) and `getKey`'s `resolve` (`eval-context.ts:63`) each read the value they test |
| Identifier checks | `identifier.ts:73-98` | `refuseDangerousName`, and under `caseInsensitive` `refuseDangerousMatch`, both module-private. An assignment reaches them only through the operand walk |
| Write helpers | `variable-declaration.ts:182`, `:225`; `prototype-pollution-guard.ts:226` | `refuseReadOnlyName` (A46), `assignToBinding`; `safeSetProperty` refuses a blocklisted key, a context target (A42), a built-in constructor or a built-in prototype |
| The funnel | `visitor-result.ts:40` | `pushVisitorResult` refuses a dangerous function value and an `EvalContext` value, wherever they are pushed. Nothing that is not pushed passes it |
| Existing pins | `assignment-expression.spec.ts:120` | A45 part 1's 64 cases. `fetch ||= 1` is refused by the funnel, and `a ||= b`'s read hooks are checked when it short-circuits |
| Held-back rows | `update-expression.spec.ts:19-23` | Its `caseInsensitive` leg spells every member as the data does, because of A44 |
| Structural perf case | `performance.spec.ts:400` | The member-write path builds no view, asks a context with no policy nothing, and pushes one scope |

The baseline is the gate at db287da, measured for this plan: `eval-core` 2880, `eval-signals` 443,
`eval-forms` 380. doc-links reported 352 files and 1755 links, with 0 dangling and 50 `docs/` files
checked against the index. release-tags reported 43 rows, 53 tags and 0 failing.

### 1.2 Findings that shape the plan

Each finding cites the measurement in § 1.3 that produced it.

1. **The A45 table holds at HEAD, and the prototype matches JavaScript on every row** (M1a). A member
   target is evaluated twice, **the second time after the right side**: `getObj()[k()] = f()` runs
   `getObj, k, get x, f, getObj, k, get x, set x`, where JavaScript runs `getObj, k, f, set x`. Both
   case modes give the same counts, since the fixture's objects are referenced and not copied.
2. **Read events report every hop of an assignment target twice, and `x++` reports nothing** (M2).
   - `a.b = 1` reports `a, a.b, a, a.b`, and `a.b.c = 1` reports each of its three hops twice.
   - `y = x` reports `y`, the target.
   - `x++` and `++x` emit **no read event**, so `createDependencyTracker` records nothing, while
     `a.b++` reports `a` and `a.b` once each.
   - Node hooks see the target `MemberExpression` enter and exit, then its object a second time after
     the right side. The trace records the object twice.
3. **Nothing in the suites pins today's behaviour** (M4): § 0 rule 10.
4. **Update's shape needs the funnel's check added** (M4, probe P2): § 0 rule 12. The check runs on
   the compound target's read value, with the target node as the node. With it, every listed-function
   row that reads stays refused with today's message (M1b, under the prototype).
5. **The identifier write path refuses no blocklisted name; only the operand walk does** (M1c).
   - `constructor++` today writes an own `constructor` key, with `NaN`, onto the caller's context
     (case-sensitive), or into the `Registry` copy (`caseInsensitive`).
   - `constructor = 1` is refused today only because the target is walked.
   - So the `=` resolver keeps `refuseDangerousName` and `refuseDangerousMatch`, and under the
     prototype `constructor = 1`, `__proto__ = 1` and `toString = 1` stay refused. The identifier
     update gains the same checks (D8, Revision 2; M8c).
6. **A44 is wider than the register's table** (M1e, M1f).
   - A computed literal key, `obj["X"] = 2`, creates the new key too.
   - On a class instance, `c.G = 1` under `caseInsensitive` creates an own `G` and never calls the
     prototype's setter `g`. Under the prototype the setter is called once and nothing is created.
   - `obj.X ||= 2` short-circuits on the matched `x`, so it writes nothing either way.
7. **Under `caseInsensitive`, the read path reads a prototype accessor twice** (M1f). The lookup tests
   `obj[key]` (`member-expression.ts:226`) and then reads `obj[foundKey]`. So `c.g` calls the getter
   twice, and `c.g += 1` calls it twice even under the prototype, against JavaScript's once. D6 keeps
   the read path's shape, so D1's "reads it once" cannot hold for this case:
   [A48](../backlog.md#a48), whose rows step 1 holds.
8. **The context branch reads what it tests** (M1j). `this.g` calls a getter on the context twice,
   once through `get` and once through `getThis`. `this.g = 1` calls it four times today, and once
   under the prototype, where JavaScript calls it zero times. Under `caseInsensitive`, `getKey`
   consults a lookup function. So `x = 1` calls a lookup twice today and once under the prototype
   (once and zero times case-sensitive). D6 names `getThis` and `getKey` as the resolver's:
   [A49](../backlog.md#a49), whose rows step 1 holds.
9. **Two write targets miss the data entirely, today and under the prototype** (M1d, M1h, M1i).
   - **`this.k = 5` under `caseInsensitive`** writes an own JavaScript property `k` onto the context's
     `Registry` copy. Its map is not changed, so `get('k')` still reads `1`. `getThis` answers the
     original, and the original is the copy.
   - **A member of an `EvalScope` held as a value**, `ns.k = 5`, writes an own property onto the
     `EvalScope` instance. Its context is untouched, a later `ns.k` still reads the old value, and
     `ns._context = 9` replaces the scope's context. The read goes through `EvalScope.get`; the write
     never reaches `EvalScope.set`.

   D1–D9 do not decide either. They are [A50](../backlog.md#a50) and [A51](../backlog.md#a51), two
   entries since the two halves are different code paths, and step 1 holds their rows.
10. **`eval-signals` observes D2, and nothing else** (M5).
    - `count = 5` over a signal context records `count` today and is recomputed when `count` changes.
      Under the prototype it records nothing and is not recomputed: the cached `SignalContextWriteError`
      is rethrown.
    - `user.name = "Bob"` records `user` and `user.name` today, and `user` alone under the prototype.
    - The error's class, `kind` and `key` are unchanged, and so is every expression that does not throw.

    So the change is visible through `EvalSignal.dependencies` and recompute counts, on expressions
    that throw on every recompute (§ 8 q7).

    *Corrected 2026-10-25, at step 6's gate.* M5 ran case-sensitive only, and before D10. Re-measured
    against 0.13.3's code and step 5's tree (step 6's outcome), its rows and M5b's reproduce, and
    two legs it lacked change the reading. Under `caseInsensitive`, `count = 5` still recomputes, 2
    and 2, since `getKey` reads the signal ([A49](../backlog.md#a49)): the recompute change is
    case-sensitive only. And "every expression that does not throw" is **not** unchanged under
    `caseInsensitive`: D10 moves a `null` source's reads, `nul === null` from `false` to `true` and
    `nul + 1` from `NaN` to `1`, through both downstream packages. Nor is the error's `key`
    unchanged on every row: under `caseInsensitive`, a member write spelled differently from its
    target, `user.NAME = "Bob"` over `{ user: { name: 'a' } }`, names `name` where it named `NAME`,
    through A44, in `eval-signals` and in `eval-forms`' `/signals` (found by step 6's code review). The
    sentences above stand as measured at Revision 1, on rows that each spelled their key as the data
    does.
11. **The timing harness has to be paired and signed** (M6): § 0 rule 11.
    - Over twelve A/A rotations the paired medians were −0.45% (member read), +2.46% (member write),
      +0.54% (member compound) and −0.12% (identifier write).
    - The read was positive in 5 rotations of 12, and the write in 7.
    - The `caseInsensitive` paths could not be timed stably (M7), so they stay out of the decision
      rule.

Findings 12–16 were added by Revision 2.

12. **The resolver's edges match the read path's** (M8a). For a string, `null` or `undefined` object,
    and for a function under `caseInsensitive`, the prototype gives today's outcome in both modes, so
    none of these rows flips. JavaScript throws a `TypeError` with its own message where the evaluator
    throws `Cannot set property on non-object: <type>`. Sloppy JavaScript ignores `s.x = 1`.
    `fn.X = 1` creates `X` beside an own `x` in both modes, as JavaScript does: the lookup runs only
    for an object, so a function's key is taken as spelled (§ 3.3). Under `caseInsensitive`,
    `n.x = 1` says `undefined` where case-sensitive says `object`, because of finding 16.
13. **§ 3.3's resolver, as Revision 1 wrote it, ran the right side before refusing a blocklisted key**
    (M8b). Today `o.__proto__ = f()` and `o.constructor = f()` are refused with `f` uncalled, in both
    modes, by the read. Case-sensitive, that read's refusal is `safeGetProperty`'s, and Revision 1's
    resolver checked only a primitive's key in that mode. So under the first prototype, `f` ran once and
    `safeSetProperty` refused afterwards. With a full blocklist check for any object, case-sensitive,
    all six rows refuse with `f` uncalled, as today. D7 decides this, and § 3.3 states it.
14. **An identifier update refuses nothing and reports nothing; D8 and D9 change both** (M8c, M8d,
    M5b).
    - Today `constructor++`, `++constructor` and `toString++` write an own key onto the caller's
      context, and `__proto__++` gives `NaN` and changes nothing.
    - Under the prototype all four are refused with the blocklist message, in both modes.
    - `x++`, `++x` and `x--` report one read of `x` under the prototype, and none today. A `for`
      loop's `i++` adds its reads, each flagged `scoped`.
    - Over a signal context, `x++` records no dependency today, yet recomputes when `x` changes, since
      the signal read happens all the same. Under the prototype it records `{x}`, with the same
      recompute.
15. **D9's shared read inherited a defect, and the suite caught it** (M10). The identifier visitor's
    `caseInsensitive` read falls back to the literals registry with `??`, so a `null` reads as
    `undefined`. Sharing that read, `x++` on `null` gave `NaN`: four existing
    `update-expression.spec.ts` cases went red, and they were the only red cases in the three suites.
    With the fallback taken only on `undefined`, all 2880 / 443 / 380 stayed green. `x += 1` on `null`
    then gives `1`, JavaScript's value, where today it gives `NaN`. So step 2's target read takes the
    fallback on `undefined` only (D9).
16. **Under `caseInsensitive`, an identifier holding `null` reads as `undefined`** (M9): `x === null`
    is `false`. This is the identifier visitor's own read, which D1–D9 leave alone:
    [A52](../backlog-retired.md#a52). *Revision 3*: D10 fixes it in step 2 (finding 17).
17. **One read for the visitor and the target is safe to ship** (M11, *Revision 3*). The Revision 2
    prototype plus the visitor's fallback on `undefined` only kept all 2880 / 443 / 380 cases green, so
    no existing case relies on a `null` reading as `undefined`. Every M9 row then equals JavaScript's
    in both modes. One characterisation row moves that no one aimed at: `n.x = 1` under
    `caseInsensitive` throws `Cannot set property on non-object: object`, the case-sensitive message,
    because `n` now reads as `null`. Restoring `??` in the visitor alone moves exactly that row and
    `x === null` back.

Finding 18 was added by Revision 4.

18. **The target read, as § 3.2 wrote it up to Revision 3, would drop the `this` refusal** (M12).
    - Today an assignment's identifier target is walked, so the identifier visitor refuses `this`
      written as a name: under `caseInsensitive`, `This = 1`, `This += 1` and `This ||= 1` throw
      `Access to "this" outside a member access…`, and so do a host-built `this = 1` and `this += 1`
      in both modes. Case-sensitive, `This` is an ordinary name and is written, as JavaScript writes
      it.
    - An update walks nothing and refuses nothing: `This++` and `++This` under `caseInsensitive`, and
      a host-built `this++` in both modes, write `NaN` under that key, onto the caller's object or into
      the copy. `SECURITY.md`'s statement that `this` throws "as an operand" is false for them today.
    - With the pinned prototype, which has no such test, `stage-2.patch` stops refusing the compound
      rows, `This += 1` and `This ||= 1` under `caseInsensitive` and the host-built `this += 1` in both
      modes, and `full.patch` the `=` rows too. The update rows write under both, as today.

    So D11 keeps the refusal on every identifier target path. Neither patch witnesses that, so group
    T's marks are witnessed by steps 2 and 3's probes.

### 1.3 Measurements run for this plan

M1, M2, M6 and M7 were throwaway scripts outside the repository, run in plain Node against the
production bundle built at db287da, with `@angular/compiler` loaded. M6's bundle copies sat under the
git-ignored `dist/`, so that their bare imports resolved, and were deleted after. Each evaluation was
`evaluate(parse(…, { ecmaVersion: 2022 }), EvalState.fromContext(…))`, and every row was also run
natively beside it. M4 and M5 used a throwaway prototype of D1–D4 in the library, applied twice. M5
also used a throwaway spec in `eval-signals`. *Revision 2* applied the prototype a third time,
extended by D7–D9 and by switches for each new probe (M10). It re-ran M1, M2 and the suites against
it, and measured M8, M9 and M5b. It was reverted the same way. *Revision 4*'s M12 was a throwaway
script too, deleted after its run, with the bundle rebuilt from HEAD.

**The prototype was verified and saved on 2026-10-23**, as `stage-2.patch` and `full.patch` in
`D:\repo.2026\ng-eval-base\a45-prototype\` (step 1, criterion 2). They were rebuilt from § 3 on
10e963f and carry no environment switches. Measured against them, M1a–j, M2, M8a–d and M9 equal the
recorded prototype columns, with no row differing, and the suites stay at 2880 / 443 / 380. The prototype was **reverted** with `git restore` and the
spec deleted before this commit: `git status` showed a clean tree, and the bundle was rebuilt from
db287da. The prototype's bundle was measured with the same scripts.

| ID | Question | Method | Result |
| :--- | :--- | :--- | :--- |
| M1 | Effects of assignment targets: value, getter and setter counts, call order, which object and key are written | Scripts M1a–M1j, both case modes, against the HEAD bundle and the prototype's | § 1.4's tables |
| M2 | Read events, node-hook `before`/`after` and the trace | An `EvalHooks` with `onRead` and `on('before'/'after', '*')`, plus `createDependencyTracker`, over 16 expressions in both modes | § 1.4, table M2 |
| M3 | What pins today's behaviour | `git grep` over specs, READMEs, `SECURITY.md`, CHANGELOGs and the downstream sources, for `A44`, `A45`, read-event counts, assignment-target wording and `createDependencyTracker` on a written path | § 1.5 |
| M4 | Whether any existing case observes D1–D4 | The prototype in the library; `nx run-many -t test --parallel=1` over all four projects; then one probe at a time, each an environment switch in the prototype, re-running `eval-core` | All green: 2880 / 443 / 380. Funnel check removed (P2): 1 red, `should refuse fetch ||= 1 with the funnel's message`. Identifier compound read event removed: 2 red, part 1's `should report a read of a and none of b for a short-circuited a ||= b`, both modes. A44's match removed: 0 red |
| M5 | What `eval-signals` observes | A throwaway spec: `createEvalSignal(…, { trackDependencies: true })` over 7 expressions, `compiler.createState` spied on as the recompute counter, one source signal changed between two reads; run at HEAD and under the prototype | Finding 10; § 1.4, table M5 |
| M6 | The timing baseline | One process per bundle and path; a cached AST and a fresh `EvalState` per evaluation; 15 rounds of 60,000 per process, after 20,000 warm-up; per-round µs, min and median. Bundle order alternated by rotation, children run one at a time. An A/A pair of the HEAD bundle, six rotations and then twelve; then HEAD against the prototype on the member read, twelve rotations | § 1.4, table M6 |
| M7 | Whether the `caseInsensitive` paths can be timed | The same harness with `caseInsensitive`, and three standalone growth checks | Not stably: § 1.4, table M6's note. Folded into [A48](../backlog.md#a48) (Revision 2) |
| M8 | *Revision 2.* The resolver's edges, a blocklisted key with a calling right side, identifier updates of blocklisted names, and identifier update read events | M1's method. JavaScript's side for the edges through `new Function`, sloppy and strict, since a module script is always strict | Findings 12–14; § 1.4, tables M8a–M8d |
| M9 | *Revision 2.* An identifier holding `null` under `caseInsensitive` | M1's method, at HEAD and under the prototype | Finding 16; § 1.4, table M9 |
| M10 | *Revision 2.* The prototype extended by D7–D9, against the suites and its own probes | `nx run-many -t test --parallel=1`, then each switch alone, against `eval-core` or against M1/M8 | The `??` fallback: 4 red, `update-expression.spec.ts`'s `caseInsensitive` `x++`, `x--`, `++x`, `--x` on `null`. The fallback taken only on `undefined`: 2880 / 443 / 380 green. Probe results: § 1.4, table M10 |
| M11 | *Revision 3.* D10: the Revision 2 prototype plus the visitor's literals fallback on `undefined` only | The prototype applied a fourth time and reverted the same way. `nx run-many -t test --parallel=1`. M9's rows under it, under a switch restoring `??` in the visitor alone, and natively through `new Function` with `with`. M1, M2 and M8 re-run and diffed against Revision 2's prototype | All green, 2880 / 443 / 380, no red case. M9: table M11. M1 and M2 identical to Revision 2's prototype. M8 differs by one row, `n.x = 1` under `caseInsensitive` (finding 17) |
| M12 | *Revision 4.* `this` written as a name, as an assignment or update target | A throwaway script under the git-ignored `dist/`, M1's method, both modes, at HEAD (57be303) and with each pinned patch applied, built and reverted. Native through `new Function` with `with`; a host-built target, `x` parsed and renamed `this`, has no native run, since the parser refuses `this` as a target. Then group T's 16 cases, under each patch | Finding 18; § 1.4, table M12. With group T in the spec, `stage-2.patch` turns 32 cases red, the 28 marked `2` and 4 of T's; `full.patch` 86, the 79 marked `2` or `3` and 7 of T's |
| M5b | *Revision 2.* `x++` over a signal context | M5's throwaway spec, rows `x++`, `++x`, `let i = x; i++; i` and `user.n++`, at HEAD and under the prototype | Finding 14; § 1.4, table M5b |

### 1.4 The measurements

**M1a — getters, setters, calls and order.** `o.g` is an own accessor whose value is `1`, or `0`
where marked. `t` is a proxy over `{ x: 10 }` that logs `get` and `set`. `getObj`, `k` and `f` log
their calls. Both modes gave identical rows, today and under the prototype.

| Expression | Today | JavaScript | Prototype | Step |
| :--- | :--- | :--- | :--- | :---: |
| `o.g = 1` | get 2, set 1 | get 0, set 1 | = JavaScript | 3 |
| `o.g += 1` | get 2, set 1 | get 1, set 1 | = JavaScript | 2 |
| `o.g &&= 1` | get 2, set 1 | get 1, set 1 | = JavaScript | 2 |
| `o.g \|\|= 1`, getter `0` | get 2, set 1 | get 1, set 1 | = JavaScript | 2 |
| `o.g ??= 1`, short-circuits | get 1, set 0 | get 1, set 0 | = JavaScript | — |
| `getObj().x = 1` | `getObj, get x, getObj, get x, set x=1` | `getObj, set x=1` | = JavaScript | 3 |
| `t[k()] = f()` | `k, get x, f, k, get x, set x=5` | `k, f, set x=5` | = JavaScript | 3 |
| `getObj()[k()] = f()` | `getObj, k, get x, f, getObj, k, get x, set x=5` | `getObj, k, f, set x=5` | = JavaScript | 3 |
| `getObj()[k()] += f()` | `getObj, k, get x, f, getObj, k, get x, set x=15` | `getObj, k, get x, f, set x=15` | = JavaScript | 2 |
| `getObj()[k()] \|\|= f()`, short-circuits | `getObj, k, get x` | the same | the same | — |
| `getObj()[k()] &&= f()` | `getObj, k, get x, f, getObj, k, get x, set x=5` | `getObj, k, get x, f, set x=5` | = JavaScript | 2 |
| `getObj().x++` | `getObj, get x, set x=11` | the same | the same | — |

**M1b — a listed function as the target** (`globalThis.fetch`, both modes alike). "Refused" is
`Access to dangerous function "fetch" is blocked for security reasons`, with the function left in
place.

| Expression | Today | Prototype | JavaScript | Step |
| :--- | :--- | :--- | :--- | :---: |
| `fetch = 1`, `obj.fetch = 1` | refused | writes `1` | writes `1` | 3 |
| `fetch += 1`, `obj.fetch += 1` | refused | refused | reads, then writes a string | — |
| `fetch \|\|= 1`, `obj.fetch \|\|= 1`, `obj.fetch &&= 1` [JavaScript writes 1; corrected at step 1 — see its outcome] | refused | refused | reads | — |
| `fetch++`, `obj.fetch++` | `NaN`, writes `NaN` | the same | the same | — |

**M1c — blocklisted names as targets** (identical today and under the prototype). "Refused" is
`Access to dangerous property "<name>" is blocked for security reasons`.

| Expression | Case-sensitive | `caseInsensitive` |
| :--- | :--- | :--- |
| `constructor = 1`, `__proto__ = 1`, `toString = 1`, `constructor += 1` | refused | refused |
| `o.constructor = 1`, `o.__proto__ = 1`, `o["__proto__"] = 1`, `o.constructor++` | refused | refused |
| `constructor++` | `NaN`, and the caller's context gains an own `constructor` | `NaN`, written into the `Registry` copy |
| `__proto__++` | `NaN`, nothing changes | the same |
| `CONSTRUCTOR = 1` | writes `CONSTRUCTOR` | writes it into the copy |
| `o.CONSTRUCTOR = 1` | writes `CONSTRUCTOR` on `o` | refused, as `"constructor"`, by the resolved-key check |

**M1d — `this.k` and an `EvalScope` value.** The context is `{ k: 1 }`.

| Expression | Case-sensitive | `caseInsensitive` |
| :--- | :--- | :--- |
| `this.k = 5`, `this.k += 5`, `this.k++` | writes the caller's `k` | gives `5`, `6`, `1`, and writes an own property `k` on the `Registry`; `get('k')` stays `1` |
| `this.K = 5` | refused, `Write to the evaluation context is blocked for security reasons` | the same as `this.k = 5` |
| `this.z = 5` | refused, the same message | refused, the same message |

The prototype gave the same rows.

**M1e — A44 under `caseInsensitive`, on `{ obj: { x: 1 } }`.** Case-sensitive rows behave as written
and do not change.

| Expression | Today | Prototype |
| :--- | :--- | :--- |
| `OBJ.X = 2`, `obj.X = 2`, `obj["X"] = 2` | `2`; `obj` is `{ x: 1, X: 2 }` | `2`; `{ x: 2 }` |
| `OBJ.X += 1`, `++OBJ.X` | `2`; `{ x: 1, X: 2 }` | `2`; `{ x: 2 }` |
| `OBJ.X++` | `1`; `{ x: 1, X: 2 }` | `1`; `{ x: 2 }` |
| `obj.X &&= 2` | `2`; `{ x: 1, X: 2 }` | `2`; `{ x: 2 }` |
| `obj.X \|\|= 2` | `1`; unchanged | the same |
| `obj.Y = 2` | `{ x: 1, Y: 2 }`, the key as spelled | the same |

**M1f — a prototype accessor**, `class C { get g(); set g(v) }`, against an own accessor.

| Expression | Case-sensitive today → prototype | `caseInsensitive` today → prototype | JavaScript |
| :--- | :--- | :--- | :--- |
| `c.g` | get 1 → 1 | **get 2 → 2** | get 1 |
| `c.g = 1` | get 2, set 1 → get 0, set 1 | get 4, set 1 → get 0, set 1 | get 0, set 1 |
| `c.g += 1` | get 2, set 1 → get 1, set 1 | get 4, set 1 → **get 2**, set 1 | get 1, set 1 |
| `c.g++` | get 1, set 1 → the same | get 2, set 1 → the same | get 1, set 1 |
| `c.G = 1` | own `G` created → the same | get 2, own `G` created, setter not called → get 0, set 1, nothing created | — |
| own accessor `o.g` | get 1 | get 1 | get 1 |

**M1g — an identifier target with a getter on the context**, `{ get x(), set x(v) }`, `x` holding
`0`. Under `caseInsensitive` the getter is read when the context is copied, before the walk, so both
counts there are 0 today and under the prototype.

| Expression | Case-sensitive today | Prototype | JavaScript (`with`-style) |
| :--- | :--- | :--- | :--- |
| `x = 1` | get 1, set 1 | get 0, set 1 | get 0, set 1 |
| `x += 1`, `x \|\|= 1`, `x++` | get 1, set 1 | the same | get 1, set 1 |

**M1h and M1i — an `EvalScope` held as a value.** For `new EvalScope({ k: 1 }, { global: true })`,
`ns.k` reads `1`. `ns.k = 5`, `ns.k += 5` and `ns.k++` give `5`, `6` and `1`, and each adds an own `k`
to the instance. The scope's context stays `{ k: 1 }`, and a later `ns.k` reads `1`. A namespaced
scope reads `undefined` for `ns.k`, by `EvalScope.get`'s rule, and its writes land on the instance
the same way. `ns._context = 9`, `ns._options = 9` and `ns.type = 9` each replace that field. The
prototype gave the same rows.

**M1j — what the context branch and an identifier write still read.**

| Expression | Case-sensitive today → prototype | `caseInsensitive` today → prototype |
| :--- | :--- | :--- |
| `this.g` (getter on the context) | get 2 → 2 | get 0 → 0 (copied) |
| `this.g = 1` | get 4, set 1 → **get 1**, set 1 | get 0, **set 0** → the same (finding 9) |
| `this.g += 1` | get 4, set 1 → get 2, set 1 | get 0, set 0 → the same |
| `g = 1` | get 1, set 1 → get 0, set 1 | 0 → 0 |
| `x = 1`, a lookup answering `x` | 1 lookup call → **0** | 2 → **1** (`getKey`) |
| `x += 1`, the same lookup | 1 → 1 | 2 → 2 |

**M2 — read events, node hooks and trace.** Both modes gave identical rows. `Program` and
`ExpressionStatement` are left out. "Reads" lists `kind:key@path`.

| Expression | Reads today | Reads, prototype | Nodes and trace today | Nodes and trace, prototype | Step |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `x = 1` | `x` | none | target `Identifier` walked | `Literal` only | 3 |
| `x += 1`, `x \|\|= 1` (`x` = 0) | `x` | `x` | target walked | `Literal` only | 2 |
| `x++`, `++x` | **none** | none; under Revision 2's prototype, `x` (D9, M8d) | `UpdateExpression` only | the same | 3 (*Revision 2*, D9) |
| `a.b = 1` | `a, a.b, a, a.b` | `a` | `MemberExpression` walked, then `Identifier a` again; trace `Identifier MemberExpression Literal Identifier` | `Identifier a`, `Literal` | 3 |
| `a.b += 1`, `a.b \|\|= 1` | `a, a.b, a, a.b` | `a, a.b` | as `a.b = 1` | `Identifier a`, `Literal` | 2 |
| `a.b++` | `a, a.b` | the same | `Identifier a` | the same | — |
| `a.b.c = 1` | `a, a.b, a.b.c` twice | `a, a.b` | the chain walked, then `a.b` again | `MemberExpression a.b`, `Literal` | 3 |
| `a.b.c += 1` | `a, a.b, a.b.c` twice | `a, a.b, a.b.c` | as above | `MemberExpression a.b`, `Literal` | 2 |
| `a.b.c++` | `a, a.b, a.b.c` | the same | `MemberExpression a.b` | the same | — |
| `a[k] = 1` | `a, k, member b` twice | `a, k` | both `Identifier`s twice | `a`, `k`, `Literal` | 3 |
| `a[k] += 1` | `a, k, member b` twice | `a, k, member b` | as above | `a`, `k`, `Literal` | 2 |
| `this.x = 1` | `member x` twice | none | `ThisExpression` twice | `ThisExpression` once | 3 |
| `y = x` | `y, x` | `x` | `Identifier y`, `Identifier x` | `Identifier x` | 3 |

The dependency sets follow the reads: `a.b = 1` gives `{a, a.b}` today and `{a}` under the
prototype. `a[k] = 1` gives `{a, k}` in both, since a computed member contributes no path.

**M5 — what `eval-signals` observes.** `trackDependencies: true`. "Recomputes" counts
`createState` calls over two reads with one change in between.

| Expression | Today | Prototype |
| :--- | :--- | :--- |
| `count = 5` | `SignalContextWriteError` (`kind` `key`, `key` `count`); deps `{count}`; recomputes 2 | the same error; deps `{}`; **recomputes 1** |
| `count += 5` | the error; deps `{count}`; 2 | the same |
| `user.name = "Bob"` | `SignalContextWriteError` (`member`, `name`); deps `{user, user.name}`; 2 | the same error; deps `{user}`; 2 |
| `user.name += "Bob"` | the error; deps `{user, user.name}`; 2 | the same |
| `user.a.b = 1` | the error (`member`, `b`); deps `{user, user.a, user.a.b}`; 2 | deps `{user, user.a}`; 2 |
| `let o = { a: count }; o.a = 1; o.a + count` | `2`, then `3`; deps `{count}`; 2 | the same |
| `let o = { a: count }; o.a += 1; o.a` | `2`, then `3`; deps `{count}`; 2 | the same |

**M6 — the timing baseline**, in µs per evaluation, as per-process medians.

| Path | Expression | A/A, 12 rotations: A's medians, low–high | Paired deltas, B vs A | Median delta | Positive |
| :--- | :--- | :--- | :--- | ---: | ---: |
| member read | `obj.x` | 0.854–1.101 | 1.9, −3.0, −0.4, −4.6, −12.2, −17.6, 0.8, −11.9, 0.4, −1.9, 2.0, 0.9 | −0.45% | 5 / 12 |
| member write | `obj.x = 1` | 1.251–1.505 | −13.6, −1.9, 2.5, 2.9, 12.6, 5.6, 2.6, 16.3, −1.3, −11.7, 1.9, −2.6 | +2.46% | 7 / 12 |
| member compound | `obj.x += 1` | 1.249–2.244 | 3.1, 2.2, 1.2, 10.0, −6.2, −0.0, −0.2, −1.7, −1.5, −19.1, 0.5, 12.1 | +0.54% | 6 / 12 |
| identifier write | `x = 1` | 0.908–2.162 | 27.6, −1.9, −5.9, −2.2, −14.0, 4.6, −0.1, 15.3, 15.1, 98.4, −9.1, −51.9 | −0.12% | 6 / 12 |
| member read, **prototype** vs HEAD | `obj.x` | 0.714–1.222 | 8.5, 24.9, 2.5, 3.8, −13.8, −0.1, −0.1, −1.9, −13.8, 0.1, −19.8, 2.7 | +0.12% | 6 / 12 |

The first A/A run, of six rotations, read 0.564–0.878 µs on the member read, with a median delta of
+6.51% between two copies of one bundle. Its last two rotations ran about 1.5× slower across every
path, so it is recorded and not used. The prototype row measures the fifth tuple slot alone: the
prototype's write paths carried environment switches, which cost time on those paths, so it was timed
on the read only. **M7**: under `caseInsensitive`, every path costs about 5.5–6 µs, an identifier read
included, because the context is copied per evaluation. In the harness the write path's medians were
bimodal, 6.7–66 µs at the same settings, while three standalone runs measured a steady 10.5–11 µs with
no heap growth and no difference between a shared and a fresh options object. That is unexplained, so
the `caseInsensitive` legs are reported and never decide.

**M8a — the resolver's edges** (*Revision 2*). HEAD and the prototype gave identical rows.

| Expression | Case-sensitive | `caseInsensitive` | JavaScript, sloppy / strict |
| :--- | :--- | :--- | :--- |
| `s.x = 1`, `s` a string | `Cannot set property on non-object: string` | the same | no error / `TypeError: Cannot create property 'x' on string 'str'` |
| `n.x = 1`, `n` `null` | `Cannot set property on non-object: object` | `Cannot set property on non-object: undefined` (A52) | `TypeError: Cannot set properties of null (setting 'x')`, both |
| `u.x = 1`, `u` `undefined` | `Cannot set property on non-object: undefined` | the same | `TypeError: Cannot set properties of undefined (setting 'x')`, both |
| `fn.X = 1`, `fn` a function with an own `x` | `1`; `fn` owns `x` and `X` | the same | `fn` owns `x` and `X`, both |

**M8b — a blocklisted key with a right side that calls** (*Revision 2*). "Refused" is the blocklist
message, naming the key.

| Expression | HEAD | Revision 1's prototype | Prototype with D7's check | D7's checks dropped |
| :--- | :--- | :--- | :--- | :--- |
| `o.__proto__ = f()` | refused; `f` 0, both modes | refused; **`f` 1** case-sensitive, 0 `caseInsensitive` | refused; `f` 0, both | refused; `f` 1, both |
| `o.constructor = f()` | refused; `f` 0, both | the same as the row above | refused; `f` 0, both | refused; `f` 1, both |
| `this.constructor = f()` | refused; `f` 0, both | refused; `f` 0, both | refused; `f` 0, both | `f` 1, both. Case-sensitive refused by the blocklist; `caseInsensitive` refused as `Write to the evaluation context is blocked for security reasons` |

**M8c — identifier updates of blocklisted names** (*Revision 2*). The context is `{ o: 1 }`.

| Expression | HEAD, case-sensitive | HEAD, `caseInsensitive` | Prototype (D8), both modes |
| :--- | :--- | :--- | :--- |
| `constructor++`, `++constructor` | `NaN`; the caller gains an own `constructor` | `NaN`; written into the copy | refused, `"constructor"` |
| `toString++` | `NaN`; the caller gains an own `toString` | `NaN`; into the copy | refused, `"toString"` |
| `__proto__++` | `NaN`; nothing changes | the same | refused, `"__proto__"` |
| `CONSTRUCTOR++` | `NaN`; writes `CONSTRUCTOR` | `NaN`; into the copy | unchanged: not a blocklisted name, and the copy matches no `constructor` |

**M8d — identifier update read events** (*Revision 2*). Both modes alike, except `X++`.

| Expression | HEAD | Prototype (D9) |
| :--- | :--- | :--- |
| `x++`, `++x`, `x--` | no read | one read, `identifier:x@x` |
| `X++` | no read | one read: `X@X` case-sensitive, `x@X` under `caseInsensitive` |
| `for (let i = 0; i < 2; i++) {}` | 3 reads of `i`, all `scoped` | 5, all `scoped` |
| `(x => x++)(1)` | none | one, `scoped` |

**M9 — an identifier holding `null`** (*Revision 2*), on `{ x: null, o: { x: null } }`. HEAD.

| Expression | Case-sensitive | `caseInsensitive` | JavaScript |
| :--- | :--- | :--- | :--- |
| `x`; `x === null` | `null`; `true` | **`undefined`; `false`** (A52) | `null`; `true` |
| `x += 1` | `1` | **`NaN`** | `1` |
| `x ??= 5` | `5` | `5` | `5` |
| `x++` | `0`, writes `1` | `0`, writes `1` | the same |
| `o.x`; `o.x += 1` | `null`; `1` | `null`; `1` | the same |

Under the prototype with the `??` fallback, `x++` under `caseInsensitive` gave `NaN`. With the
fallback taken only on `undefined`, `x++` gave `0` and `x += 1` gave `1`. A bare `x` read stayed
`undefined`, since the identifier visitor is not changed.

**M11 — D10, on `{ x: null, o: { x: null } }`** (*Revision 3*).

| Expression | D10, case-sensitive | D10, `caseInsensitive` | `??` restored in the visitor, `caseInsensitive` | JavaScript |
| :--- | :--- | :--- | :--- | :--- |
| `x` | `null` | `null` | **`undefined`** | `null` |
| `x === null` | `true` | `true` | **`false`** | `true` |
| `x += 1` | `1`, writes `1` | `1`, writes `1` | `1` (the target read keeps D9's rule) | `1` |
| `x ??= 5` | `5` | `5` | `5` | `5` |
| `x++` | `0`, writes `1` | `0`, writes `1` | `0`, writes `1` | `0`, writes `1` |
| `o.x`; `o.x += 1` | `null`; `1` | `null`; `1` | `null`; `1` | `null`; `1` |
| `n.x = 1` (M8a) | `…non-object: object` | **`…non-object: object`**, from `…: undefined` today | `…non-object: undefined` | `TypeError: Cannot set properties of null` |

**M12 — `this` written as a name, as a target** (*Revision 4*), on `{ k: 1 }`. "Refused" is
`Access to "this" outside a member access is blocked for security reasons`, with nothing written.
"Writes" names the key written: onto the caller's object case-sensitive, into the copy under
`caseInsensitive`. Case-sensitive, every `This` row equals JavaScript, today and under both patches.

| Expression | HEAD, case-sensitive | HEAD, `caseInsensitive` | `stage-2.patch`, `caseInsensitive` | `full.patch`, `caseInsensitive` | JavaScript |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `This = 1` | `1`; writes `This` | refused | refused | `1`; writes `This` | `1`; writes `This` |
| `This += 1` | `NaN`; writes `This` | refused | `NaN`; writes `This` | the same | `NaN`; writes `This` |
| `This \|\|= 1` | `1`; writes `This` | refused | `1`; writes `This` | the same | `1`; writes `This` |
| `This++`, `++This` | `NaN`; writes `This` | `NaN`; writes `This` | the same | the same | `NaN`; writes `This` |
| host-built `this = 1` | refused | refused | refused, both modes | `1`; writes `this`, both modes | not a target |
| host-built `this += 1` | refused | refused | `NaN`; writes `this`, both modes | the same | not a target |
| host-built `this++` | `NaN`; writes `this` | `NaN`; writes `this` | the same, both modes | the same, both modes | not a target |

**M10 — the extended prototype's probes** (*Revision 2*), each switch applied alone.

| Switch | Red, or changed |
| :--- | :--- |
| The target read's fallback by `??` | `update-expression.spec.ts`: 4 red, the `caseInsensitive` identifier `x++`, `x--`, `++x`, `--x` on `null` |
| D7's resolver key checks dropped | M8b's six rows call `f`. `this.constructor = f()` under `caseInsensitive` changes message |
| D7's case-sensitive check alone dropped | M8b's two case-sensitive `o.*` rows call `f` |
| The `=` identifier checks dropped | `constructor = 1`, `__proto__ = 1` and `toString = 1` stop refusing, in both modes |
| D8's update checks dropped | M8c's rows revert to HEAD's |
| D9's update event dropped | M8d's rows revert to HEAD's |

**M5b — `x++` over a signal context** (*Revision 2*). Same method as M5.

| Expression | HEAD | Prototype |
| :--- | :--- | :--- |
| `x++`, `++x` | `SignalContextWriteError` (`key`, `x`); deps `{}`; recomputes 2 | the same error; **deps `{x}`**; recomputes 2 |
| `let i = x; i++; i` | `2`, then `3`; deps `{x}`; 2 | the same |
| `user.n++` | `SignalContextWriteError` (`member`, `n`); deps `{user, user.n}`; 2 | the same |

### 1.5 What pins today's behaviour (M3), and the step that changes it

| Where | What it says or asserts | Step |
| :--- | :--- | :--- |
| `assignment-expression.spec.ts:120`, part 1 | `fetch \|\|= 1` refused by the funnel; `a \|\|= b`'s read hooks when it short-circuits | Stay green and unedited: steps 2 and 3 must keep them (P2 and probe 2.iii guard them) |
| `update-expression.spec.ts:19-23` | The `caseInsensitive` leg avoids case-variant spellings because of A44 | 3: the docblock is rewritten and the 36 rows added |
| `SECURITY.md:188-191` | "Reads that only inspect the value throw too": `fetch = 1` and `obj.fetch = 1` | 5: the bullet goes |
| `SECURITY.md:196-203` | "only an assignment reads its target as an operand", so only an update overwrites a listed function | 5: rewritten, since `=` then overwrites one as an update does |
| `SECURITY.md:64-67` | "Identifiers are checked before any lookup" | Holds, because step 3's resolver keeps the checks (finding 5); its probe 3.ii proves it |
| `SECURITY.md:57` | The guard is "applied by the identifier, member, assignment, update, …" visitors | True of an update's member branch only, today (M8c). It becomes true of the identifier branch at step 3 (D8), and step 5 says so (§ 3.5) |
| `SECURITY.md:219-222` | `this` "evaluates only as the object of a member access", and throws as "a value, an argument, an operand" | False today for an identifier update of `This` under `caseInsensitive`, or of a host-built `this` (M12). True of updates from step 3 (D11), and kept for compound and `=` targets by steps 2 and 3. Step 5 confirms it and adds nothing (*Revision 4*) |
| `eval-signals` `dependencies` for `x++` | Empty today, although the signal recomputes (M5b) | Step 3 (D9): `{x}`. § 8 q7 |
| `modules/eval-core/README.md:277-282` | The `AssignmentExpression` and `UpdateExpression` rows say nothing about reads or A44 | 5 |
| `modules/eval-core/README.md:511` | `onRead` fires "once per resolved context read" | Holds. Step 5 adds what an assignment target reports |
| `modules/eval-core/README.md:354` | `caseInsensitive` "applies to identifiers and to member names alike" | True of reads only until step 3. Step 5 states the write side |
| `modules/eval-core/CHANGELOG.md:22`, `:32` | Published sections link `backlog.md#a45` and `#a44` | 5: link targets only, re-pointed to `backlog-retired.md` when both retire; the wording stays |
| `docs/side-effects/phase-1-plan.md:274-280` | `a.b = 1` reports a read of `a.b`, "by design" | Stays as written, as a design record. D2 reopens it here |
| `modules/eval-signals/README.md:237` | An assignment throws `SignalContextWriteError` "on the first read" | Holds (M5) |
| `modules/eval-signals/README.md:74-77` | Angular records dependencies "exactly as the walk performed it" | Holds. M5 shows that the walk performs fewer reads |
| `modules/eval-forms/README.md:179`, `:640` | "the expression named `country`, so it recomputes when `country` changes" | True of every rule that reads a key. A write-only rule names its target and no longer reads it, and such a rule throws on every recompute anyway (`:454`). § 8 q7 |
| `eval-forms` `reactive/…/field-schema.spec.ts:271`, `signals/…/evaluate-rule.spec.ts:199`, `signals/…/rules.spec.ts:297`; `eval-forms` README `:454` | "illegal on every recompute with every dataset" | Holds: the write throws whether or not its target was read |
| `eval-signals` `track-dependencies.ts` | Respells first segments from identifier reads | No change: it consumes whatever reads arrive |
| `createDependencyTracker` on a written path | No spec in any project asserts one (M4: green) | Step 1 pins it (group R) |
| The trace surface | No spec asserts an assignment target's trace entries (M4: green) | Step 1 pins it (group R) |

---

## 2. Decisions — recorded, not reopened

Fixed by the request of 2026-10-23, before this plan was committed.

- **D1. A member target's object and key are evaluated once.** `=` never reads the target's value,
  and a compound or logical operator reads it once. Effects happen in JavaScript's order: object, key,
  the read where there is one, the right side, then the write.
- **D2. Read events follow the reads.**
  - `a.b = 1` reports `a`, and any intermediate hops, and not `a.b`.
  - `x = 1` reports nothing.
  - A compound or logical assignment reports one read of its target.

  **This reopens Phase 1's decision**
  ([`side-effects/phase-1-plan.md`](../side-effects/phase-1-plan.md):274-280) that "assignment and
  update targets emit read events", so that `a.b = 1` reports a read of `a.b`. Its reason was that
  "resolving the assignment target genuinely reads `a` from the context, and a tracker that filtered
  it would miss a real dependency on the object being written to".
  - **That reason survives.** The dependency on the written object is the read of `a`, and D2 keeps
    it: M2 shows `a` reported under the prototype, and M5 shows `user` still recorded.
  - **What is reopened is the read of the property itself.** It is not a read JavaScript makes for
    `=`. It was an artefact of walking the target as an operand, and it was made twice (M2).
  - **It has costs beyond the event**: a getter called, a host function called again after the right
    side, and a funnel refusal of a write (M1a, M1b).

  Phase 1's other reason, that emitting inside `evaluateMember` makes the call path's read reachable,
  is unaffected, since calls keep that path. The update half of the old decision is not reopened. For
  a member it already matches D2, and an identifier update's missing read event is D9.
- **D3. The target is not walked as an operand, as `update-expression.ts` already does.** Node hooks
  and the trace see the object and a computed key, not the target node. For an identifier target,
  nothing of the target is walked: the node hooks and the trace see the right side alone (M2).
- **D4. A44 joins.** Under `caseInsensitive`, the write goes to the key the lookup matched, in
  assignment and in update. With no match, it goes to the key as spelled.
- **D5. `eval-core` 0.14.0, a breaking minor**, on the precedent of 0.8.0. `eval-signals` and
  `eval-forms` release to widen their peer ranges. Whether either changes behaviour, and so its
  version, is measured: M5 is that measurement for `eval-signals`, and § 8 q7 carries the result to
  step 6's gate.
- **D6. `evaluateMember`'s read path keeps its shape.**
  - Compound and logical member targets take update's shape: one `evaluateMember` call.
  - `=` gets its own resolver. It evaluates the object and the key, runs the context branch's
    `getKey`, `getThis` and key checks, and applies A44's key match, with no value read.
  - The member read and the member write are measured before and after, with the M19/M20 harness and
    rotation discipline (§ 3.8, step 4).

Fixed by the request's second instruction, Revision 2, after M8 and M10 measured each:

- **D7. The resolver's member key checks stay: they refuse before the right side runs.** That is
  their attributable effect: `safeSetProperty` refuses the same keys with the same message, but only
  after the right side has run. So `o.__proto__ = f()`, `o.constructor = f()` and
  `this.constructor = f()` refuse with `f` uncalled, in both modes, as they do today (M8b). D7 needs a
  full blocklist check for a case-sensitive object key, which Revision 1's § 3.3 lacked (finding 13).
  This decides Revision 1's § 8 q6.
- **D8. The identifier update runs `refuseDangerousName`, and under `caseInsensitive`
  `refuseDangerousMatch`, before its lookup.** `constructor++`, `++constructor`, `toString++` and
  `__proto__++` are refused with the blocklist message, as `constructor = 1` is (M8c). `SECURITY.md`'s
  statement that the update visitor applies the guard becomes true of the identifier branch. This
  decides Revision 1's § 8 q5.
- **D9. The identifier update reads through step 2's exported target read**, so `x++` and `++x`
  report one read of `x`, as `a.b++` reports one of `a.b` (M8d). Revision 1's reopening of Phase 1's
  decision covered assignments; D9 adds the read event Phase 1's decision promised updates and never
  delivered for an identifier. **The target read takes the literals fallback on `undefined` only**:
  with `??` it turns `null` into `undefined`, and four existing cases went red (M10, finding 15). The
  update takes no funnel check, so `fetch++` still writes `NaN` ([A40](../backlog-retired.md#a40)).
  This decides Revision 1's § 8 q1.

Fixed by the request's third instruction, Revision 3, after M11 measured it:

- **D10. [A52](../backlog-retired.md#a52) joins, in step 2.** Under `caseInsensitive`, the identifier
  visitor's own read takes the literals fallback only when `get` finds `undefined`, the rule § 3.2
  gives the target read. So there is one read, exported and shared, as § 3.2 says. On `{ x: null }`,
  `x === null` is `true` and `x += 1` gives `1`, both JavaScript's (M11).

Fixed at step 2's confirmation gate, Revision 4, after M12 measured it:

- **D11. Every identifier target path keeps the identifier visitor's `this` refusal**,
  `Access to "this" outside a member access is blocked for security reasons`: for `this` as a
  host-built `Identifier` name, and under `caseInsensitive` for any spelling of it. In step 2 the
  shared target read makes it; in step 3 the `=` resolver and the identifier update (D8, D9) do.
  - **Why.** `SECURITY.md:219-222` says that `this` throws as an operand. `This++` writing today
    already makes that false for updates, and step 3 fixes it. And § 3.2's read is the identifier
    visitor's own read, which refuses it.
  - **Where it runs**: beside the blocklist checks, before any lookup, as the visitor runs it. So a
    refused target reads nothing, emits no read event and writes nothing.
  - Case-sensitive, `This` is an ordinary name, and D11 changes nothing for it.

---

## 3. Design

### 3.1 What each target does after step 3

| Target and operator | Evaluated | Read | Read events | Node hooks and trace see | Write key under `caseInsensitive` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `x = v` | nothing of the target; the blocklist checks and the `this` refusal (D11) | none | none | the right side | `getKey(x) ?? x`, as today |
| `x op= v`, `x ??= v` and the other logical operators | nothing walked | once, through the target read: blocklist checks and the `this` refusal (D11), `get` with the literals fallback on `undefined` only, the read event, then the funnel's check | one, `x` | the right side | `getKey(x) ?? x`, as today |
| `o.k = v` | object, then a computed key | none | the object's own reads only | the object and a computed key | the key the lookup matched, found without a read |
| `o.k op= v` and the logical operators | one `evaluateMember` | once, then the funnel's check | the object's, plus one for `o.k` | the object and a computed key | `evaluateMember`'s matched key (its fifth slot) |
| `x++` | nothing walked | once, through the target read, with its blocklist checks and the `this` refusal first (D8, D11) and no funnel check | one, `x` (D9) | the update only | unchanged |
| `o.k++` | unchanged: one `evaluateMember` | once | the object's, plus one for `o.k` | the object and a computed key | **the matched key** (D4) |

The value stack is unchanged: each visitor still pushes one value, and pops one per walked child. Part
1's short-circuit runs on the value of the single read.

### 3.2 Compound and logical targets — update's shape, plus the funnel (step 2)

A member target is resolved by one `evaluateMember(target, st, callback)` call, as
`update-expression.ts:47` does. Its object, key and value are kept, and there is no `callback(node.left)`
and no second call after the right side. An identifier target is not walked. Its value comes from the
identifier visitor's own read, exported from `identifier.ts`. That read runs `refuseDangerousName`,
the `this` refusal (*Revision 4*, D11) and `refuseDangerousMatch` under `caseInsensitive`, `get` and
the read event, but it neither pushes nor dispatches node hooks. The `this` test is the visitor's:
`node.name === 'this'` case-sensitive, `equalIgnoreCase` under `caseInsensitive`, and a match is
refused by `refuseThisValue`, since a target node is never marked positional. *Revision 2*: under `caseInsensitive`, the literals fallback is taken only when
`get` finds `undefined`, where the identifier visitor takes it on `null` too ([A52](../backlog-retired.md#a52)).
So `x += 1` on `null` gives `1`, JavaScript's value, where today it gives `NaN`. That is a step-2 flip,
group N's. D9 then needs this read unchanged for the update (finding 15). *Revision 3* (D10): the
identifier visitor reads through the same function, which wraps it in its push and its node hooks, so
there is one `caseInsensitive` identifier read and A52 is fixed in the same step. Group N's
`x === null` and group B's `n.x = 1` flip with it (M11).

**Then the funnel's check runs on the value**, with the target node as the node: the same two tests
`pushVisitorResult` makes, factored so that both call one function (§ 0 rule 12). Without it,
`obj.fetch += 1` would write the function's text followed by `1`, and `fetch ||= 1` would stop being
refused (M4, P2). Factoring keeps a single definition of what the funnel refuses. The push-path cost is
measured in step 4, since `pushVisitorResult` runs per node.

### 3.3 The `=` resolver (step 3)

**For an identifier**, the target is not walked. The resolver runs `refuseDangerousName`, and under
`caseInsensitive` `refuseDangerousMatch`, both exported from `identifier.ts` for this one use, and the
`this` refusal of § 3.2 (*Revision 4*, D11). It reads nothing, emits no event, and leaves the write
path as it is: `getKey` under `caseInsensitive`, then
`assignToBinding` with A46's check. Without the two checks, `constructor = 1` would write an own
`constructor` onto the caller's context, as `constructor++` does today (finding 5).

**For a member**, a new internal `resolveMemberTarget(node, st, callback)` sits beside `evaluateMember`
in `member-expression.ts` and returns `[object, key]`:
- the object is marked by `markThisPositional`, walked and popped, with `node.optional` treated as
  `evaluateMember` treats it;
- the key is read as `evaluateMember` reads it: a dotted name, a computed literal, or a computed
  expression, walked and popped;
- **the context branch**: the blocklist check, then under `caseInsensitive` `getKey` and the
  resolved-key check, then `getThis(contextKey) ?? object`. `getThis` reads the value it tests
  ([A49](../backlog.md#a49)), and under `caseInsensitive` the object it answers is the `Registry`
  copy ([A50](../backlog.md#a50));
- **the `EvalScope` branch**: the blocklist check, and `[object, key]` ([A51](../backlog.md#a51));
- **any other receiver**:
  - **The key checks** (D7) run in both modes, before the right side. A string, number or boolean
    receiver gets the primitive subset's check; any other receiver gets the full blocklist. Without the
    primitive check, `s.constructor = 1` would throw `Cannot set property on non-object`, where today
    it throws the dangerous-property message. Without the full check, case-sensitive, the right side
    would run before `safeSetProperty` refused (M8b). *The full check is Revision 2's correction*:
    Revision 1 listed only the primitive one for case-sensitive.
  - **The key match** (*Revision 2*) happens under `caseInsensitive`, for a string key, only where
    `evaluateMember` runs its lookup: a receiver whose `typeof` is `'object'` and which is not `null`.
    There the key is matched without a read: the own-key cache, then `key in object`, then the
    prototype's own names, and the resolved-key check runs on the match. Where `evaluateMember` reads
    `obj[key]`, the resolver uses `in`.
  - **Every other receiver** (a primitive, `null`, `undefined`, a function) takes the key as spelled,
    as the read path does. `fn.X = 1` creates `X`, and `null` and `undefined` reach `safeSetProperty`,
    whose message is today's (M8a).

The write is then made as today: `consultMemberWrite` with the resolved object and key, and then
`safeSetProperty`.

**The identifier update** (*Revision 2*, D8 and D9, step 3). `update-expression.ts`'s identifier
branch reads its operand through step 2's target read, in place of `context.get(key)`. That read runs
the blocklist checks and the `this` refusal first (*Revision 4*, D11), then `get` with the literals
fallback on `undefined` only, then the read event. So `This++` under `caseInsensitive`, and a
host-built `this++`, are refused where today they write. Nothing else in the update changes: it takes no funnel check, so `fetch++` still writes `NaN`.
`getKey` still corrects the write's key, and `assignToBinding` still writes.

### 3.4 A44 in both visitors (step 3)

`evaluateMember` already computes the key its lookup matched, `resolvedKey`, for the read event. It
returns it in a **fifth tuple slot**: the context branch gives `contextKey`, the `EvalScope` branch
the key, and the plain branch `resolvedKey`. Update's member branch and the compound branch write to
that slot. The four-slot callers, the call and tag paths, are unchanged. M6 measured the slot at
+0.12% on the member read, positive in 6 of 12 rotations. `=` takes its key from the resolver.

### 3.5 `SECURITY.md`, the README and the CHANGELOG (step 5)

- **`SECURITY.md`**:
  - The "an assignment's target" bullet under "Reads that only inspect the value throw too" goes.
  - The paragraph "No write path refuses overwriting a listed function" is rewritten. `fetch = 1` and
    `obj.fetch = 1` now write, as `obj.fetch++` does. `fetch += 1`, `fetch ||= 1` and their member
    forms stay refused, since they read the target, as `fetch || 1` is refused.
  - "Identifiers are checked before any lookup" stays, now true of an `=` target by the resolver.
  - *Revision 2*: the guard's list of visitors, "the identifier, member, assignment, update, …"
    (`SECURITY.md:57`), becomes true of the update's identifier branch at step 3 (D8). Up to 0.13.3
    it held for the member branch only. Step 5 says so in the Protections section and names
    `constructor++` beside `constructor = 1`.
  - *Revision 4*: "`this` evaluates only as the object of a member access" (`SECURITY.md:219-222`)
    becomes true of an identifier update at step 3 (D11), and steps 2 and 3 keep it true of compound
    and `=` targets. Step 5 confirms the statement and adds nothing to it.
  - `public-api.spec.ts`'s identifier case stays green.
- **The README**:
  - The `AssignmentExpression` row says what an assignment target reads and reports. The `onRead`
    paragraph gains one sentence: `a.b = 1` reports `a`, `x = 1` nothing, and a compound or logical
    assignment one read of its target.
  - The case-insensitive section says that a member write reaches the key the read would match, since
    0.14.0. `UpdateExpression`'s row says the same.
  - Each sentence gets a probe that breaks the document (§ 0 rule 9) where a spec reads it.
- **The CHANGELOG**: the `[Unreleased]` entries steps 2 and 3 added are consolidated under `### Breaking`
  and `### Fixed`, with the README's own line.

### 3.6 Read events, node hooks and the trace

M2's prototype column is the contract, row by row. Step 1 pins today's column; steps 2 and 3 move
each marked row to the prototype's.

### 3.7 Versions and the downstream packages

`eval-core` 0.14.0, a breaking minor (D5). The `.d.ts` is expected to be byte-identical to 0.13.3's,
since nothing under `internal/visitors` is published (`src/public-api.ts`); step 6 checks it.
`eval-signals` and `eval-forms` each widen `@zvenigora/ng-eval-core` to admit 0.14.0. Whether each
floor moves, and whether each is a patch or a minor, is § 8 q7, decided at step 6's gate from M5 and
from the same probe run against `eval-forms` at that gate. If `eval-signals` becomes 0.7.0,
`eval-forms`' `>=0.6.0 <0.7.0` must widen too.

### 3.8 Performance — the decision rule, stated in advance

**Method** (step 4), the M6 harness unchanged:
- Two production bundles: the plan commit's, which is db287da's code, and step 3's.
- Plus an A/A control, the plan commit's bundle against a copy of itself, in the same run.
- Five paths: member read `obj.x`, member write `obj.x = 1`, member compound `obj.x += 1`, identifier
  write `x = 1`, and identifier read `x` (*Revision 3*).
- Twelve rotations, with the bundle order alternated, one process per bundle and path, children run
  one at a time, never in parallel with any other nx or Jest run.
- 15 rounds of 60,000, after 20,000 warm-up, on a cached AST with a fresh `EvalState` per evaluation.
  Per-process median, paired within each rotation.

**The run is void** when the A/A control meets the regression test below on any path, or when its
paired median delta on any path exceeds ±3%. A void run is repeated, and it is reported, not dropped.

**A regression on a path** is a paired median delta above **+3%** together with **at least 10 of 12
rotations positive**. Under the null, 10 or more positives in 12 arise with probability about 1.9%.
Applied to M6's A/A data, the test flags nothing: 5, 7, 6 and 6 positives.
- The member read and the member write decide. A regression on either stops the step. The step
  reports it, commits nothing but its outcome, and § 8 gains the question.
- The member compound and the identifier write are reported and do not decide. Both are expected to
  get cheaper, since a walk and a second `evaluateMember` are removed.
- *Revision 3*: **the identifier read, `x`, is reported too, and does not decide.** D10 adds one
  comparison to the `caseInsensitive` identifier read. Neither decision path covers it, since the
  member read's object is an identifier read only under `caseInsensitive`, which this rule leaves out
  (M7). The case-sensitive identifier read does not change. Nothing new was timed for Revision 3.
- The `caseInsensitive` legs are reported only (M7).
- `performance.spec.ts` stays green and untouched in every step. It is structural, and the
  member-write case at `:400` constrains steps 2 and 3 directly.

---

## 4. Work breakdown

Each step is one commit, leaves all three projects and the workspace root green, and runs in its own
session. The code-reviewer runs at each step's exit criteria, before the commit, steps 4, 6 and 7
included. "Wrong" in a probe names the change the executor makes to show the criterion can go red. Each
probe is applied alone and reverted, and its red cases are named (§ 0 rule 8).

**The request's step shape is changed in two places.**
1. **Compound identifier targets join step 2.** The request placed "compound and logical member
   targets" in step 2 and "the `=` resolver, identifier and member" in step 3. That leaves `x += 1`,
   which D3 says is not walked, in no step.
2. **Steps 2 and 3 each add their own `[Unreleased]` line.** A shipped file changed carries its
   CHANGELOG line in the same commit (`.claude/skills/step/SKILL.md`), so step 5 consolidates the
   entry rather than writing it.

| Step | Subject | Files (main) | Tests: `eval-core` / `eval-signals` / `eval-forms` | Ships in |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Characterisation spec: today pinned, flips marked, deviations held | new `internal/visitors/assignment-target.spec.ts` | **+184** / 0 / 0; **+16** with Revision 4's group T | no package |
| 2 | Compound and logical targets in update's shape, with the funnel's check | `assignment-expression.ts`, `identifier.ts`, `visitor-result.ts`, the spec's step-2 rows, `CHANGELOG.md` | **+8** / 0 / 0 (rows rewritten 1:1; group V, a widening at the step's approval) | `eval-core` 0.14.0 |
| 3 | The `=` resolver; A44 in both visitors; the identifier update's checks and read (D8, D9) | `assignment-expression.ts`, `member-expression.ts`, `update-expression.ts`, `identifier.ts`, the spec's step-3 rows, `update-expression.spec.ts`, `CHANGELOG.md`; at the step's approval `call-expression.ts` and `assignment-expression.spec.ts`, comments only | **+42** / 0 / 0 (+36, and +6 for three D7 rows, a widening at the step's approval) | `eval-core` 0.14.0 |
| 4 | Timing against the rule in § 3.8 | this document only | 0 / 0 / 0 | no package |
| 5 | `SECURITY.md`, README, CHANGELOG; A45, A44 and A52 retired | `SECURITY.md`, `modules/eval-core/README.md`, `CHANGELOG.md`, the register, link targets | 0 / 0 / 0, or the allowlist's entries | `eval-core` 0.14.0 (README); the rest no package |
| 6 | Release commit | three `package.json`, three `CHANGELOG.md`, each README's peer line; at the gate the `eval-forms` README's recompute sentences, the `eval-signals` README's respelling bullet, `signal-context.spec.ts` and the register's "Work in flight" | 0 / **+1** / 0 (a widening at the gate) | the releases |
| 7 | Post-publish commit | the register, `CLAUDE.md`, `docs/README.md`, CHANGELOG dates, the skill, this document | 0 / 0 / 0 | — |

From 2880, `eval-core` is at 3064 once step 1 commits, at 3080 once Revision 4's addendum does, at
3088 once step 2 does, with its group V, and at 3130 once step 3 commits, with its three D7 rows
(3124 without them), and at 3134 once step 5 does, with its widenings. `eval-signals` and
`eval-forms` stay at 443 and 380 (M4, M10) through step 5; step 6 adds one `eval-signals` case, a
widening at its gate, so `eval-signals` is at 444 from step 6. *Revision 2*: they were 3044 and 3080 at Revision 1.
*Revision 4*: 3064 and 3100 at Revision 3, and 3080 and 3116 before step 2's widening.

### Step 1 — Characterisation spec: today's behaviour pinned, the flips marked

- **New**: `modules/eval-core/src/lib/internal/visitors/assignment-target.spec.ts`.
  - It holds 92 rows, each run under `describe.each` in both case modes (§ 0 rule 7), so 184 cases by
    construction; the gate confirms the count. *Revision 2*: 82 rows and 164 cases at Revision 1.
  - Every row asserts today's behaviour, beside the same expression run natively where JavaScript has
    an answer.
  - Every row carries a `flips` mark, `2`, `3` or none, per mode where the modes differ.
  - A `design` mark, beside the `2`, `3` and `held` marks, is a row that differs from JavaScript by
    design, and no later step rewrites it to JavaScript.
  - Expectations are recorded per row, never computed from the implementation.
  - **Held rows** (*Revision 2*). A case whose value after its step is still not JavaScript's, for a
    reason that is open, carries a `held` mark. The mark names the register entry and records that
    value per mode, in the table below. A case whose deviation is a decision carries a `design` mark
    naming the decision instead: a refusal by the blocklist, the funnel or
    [A42](../backlog-retired.md#a42), a message that is the evaluator's own (`safeSetProperty`'s), or
    a write into the `caseInsensitive` copy. Such a case is not held, since nothing about it is open.

  The groups, from § 1.4:
  - **E** (M1a): 12 rows. Five flip at step 2, four at step 3, and three are controls.
  - **F** (M1b): 8 rows. `fetch = 1` and `obj.fetch = 1` flip at 3. Six are controls, asserted by
    message.
  - **B** (M1c, M8a–M8c): 21 rows, asserted by message.
    - Revision 1's 14 rows, with `s.constructor = 1` and `s.x = 1` on a string `s`.
    - *Revision 2*: `n.x = 1` (`null`), `u.x = 1` (`undefined`) and `fn.X = 1` (a function with an own
      `x`). They are controls, measured identical under the prototype (M8a), each with its native
      outcome. *Revision 3*: except `n.x = 1` under `caseInsensitive`, which flips at 2, from
      `…non-object: undefined` to `…non-object: object`, the case-sensitive message (D10, M11).
    - *Revision 2*: `o.__proto__ = f()`, `o.constructor = f()` and `this.constructor = f()`, which
      assert the message and that `f` was not called. Controls (M8b).
    - *Revision 2*: `toString++`.
    - `constructor++`, `__proto__++` and `toString++` flip at 3, in both modes (D8, M8c).
  - **A** (M1e, and `c.G = 1` from M1f): 11 rows. Eight flip at 3 under `caseInsensitive` only.
  - **R** (M2): 16 rows, asserting the read events in order, the dependency set, the node-hook
    sequence and the trace's types. Six flip at 2. Six flip at 3, and *Revision 2* adds `x++` and `++x`
    at 3, in both modes (D9, M8d). `a.b++` and `a.b.c++` are controls.
  - **S** (M1d, M1h): 7 rows. All are controls, and eight of the cases are held (the table).
  - **G** (M1g): 4 rows. `x = 1` flips at 3, case-sensitive only.
  - **P** (M1f): 4 rows. `c.g = 1` flips at 3 and `c.g += 1` at 2.
  - **L** (M1j, lookups): 3 rows. `x = 1` and `X = 1` flip at 3.
  - **C** (M1j, a context getter): 3 rows. `this.g = 1` and `g = 1` flip at 3, `this.g += 1` at 2,
    case-sensitive only.
  - **N** (*Revision 2*; M9, M10): 3 rows on `{ x: null }`.
    - `x += 1` flips at 2 under `caseInsensitive`, from `NaN` to `1`. Case-sensitive, it is a control.
    - `x++` is a control in both modes. It is the row that D9's shared read would break (finding 15).
    - `x === null` flips at 2 under `caseInsensitive`, from `false` to `true` (D10, M11; *Revision 3*,
      where Revision 2 held it under A52). Case-sensitive, it is a control.

  **The held cases** (*Revision 2*; *Revision 3* removed N's): 18 of the 184. "After" is the value the row asserts once its step
  has run, and the native run is JavaScript's.

  | Group and row | Mode | After | JavaScript | Held under |
  | :--- | :--- | :--- | :--- | :--- |
  | P `c.g` | `caseInsensitive` | get 2 | get 1 | [A48](../backlog.md#a48) |
  | P `c.g += 1` (step 2) | `caseInsensitive` | get 2, set 1 | get 1, set 1 | A48 |
  | P `c.g++` | `caseInsensitive` | get 2, set 1 | get 1, set 1 | A48 |
  | C `this.g = 1` (step 3) | case-sensitive | get 1, set 1 | get 0, set 1 | [A49](../backlog.md#a49) |
  | C `this.g += 1` (step 2) | case-sensitive | get 2, set 1 | get 1, set 1 | A49 |
  | C `this.g = 1`, `this.g += 1` | `caseInsensitive` | get 0, set 0; the result `1` or `2` | set 1 | [A50](../backlog.md#a50) |
  | L `x = 1`, `X = 1` (step 3) | `caseInsensitive` | 1 lookup call | none | A49 |
  | L `x += 1` | `caseInsensitive` | 2 lookup calls | 1 | A49 |
  | S `this.k = 5`, `this.k += 5`, `this.K = 5`, `this.k++` | `caseInsensitive` | `5`, `6`, `5`, `1`; an own `k` on the `Registry`; `get('k')` `1` | `k` written | A50 |
  | S `ns.k = 5`, `ns.k += 5` | both | `5`, `6`; an own `k` on the instance; a later `ns.k` `1` | a later `ns.k` `5`; `NaN` for `+=` | [A51](../backlog.md#a51) |

  A step that fixes one of these entries moves its held rows to the native run, and removes the mark.
- **Edit**: this document (Revision 2 and the outcome); `.claude/skills/step/SKILL.md`, step 1's
  state.
- **Exit criteria**:
  1. All 184 cases pass against db287da's library code, which step 1 does not touch.
  2. **The marks are measured, not asserted** (§ 0 rule 10). The executor applies the prototype as M10
     and M11 left it, D7–D10 included, in two stages, and reverts it after each, reading the red cases one by
     one. **The prototype is two files outside the repository**, both against 10e963f:
     - `D:\repo.2026\ng-eval-base\a45-prototype\stage-2.patch`, SHA-256
       `4f92564a10170677e5c4f97b7065261403a9946b874a97af3248bcbb312da90d`, for stage (i);
     - `D:\repo.2026\ng-eval-base\a45-prototype\full.patch`, SHA-256
       `b465caec5fedc06203595faa7814f99c0552ee8a044210443cf879bd3a3ed1fa`, for stage (ii), applied on
       its own and not on top of the first.

     For each stage, the step checks the patch's SHA-256 first, then applies it as a file with
     `git apply`, and reverts it with `git restore modules/eval-core/src`. A mismatched SHA-256, or a
     patch that does not apply, stops the step. **The step never rebuilds the prototype from § 3.**
     The README beside the patches says what each contains and how it was verified.
     - **(i)** *Wrong for today*: step 2's half of the prototype alone: compound and logical targets,
       and the one `caseInsensitive` identifier read with the fallback on `undefined` only (D10).
       Exactly the cases marked `2` go red, and nothing else in the suite. Predicted count: 28.
     - **(ii)** *Wrong for today*: the whole prototype, with A44 and D7–D10. Exactly the cases marked
       `2` or `3` go red, and nothing else. Predicted: 28 + 51.
     - **A held case goes red only if it is also marked to flip.** The hold marks change no
       prediction, and checked against Revision 1's rows they leave its 25 and 41 as they were. The
       growth comes from Revision 2's new rows:
       - step 2 gains 1, N's `x += 1` under `caseInsensitive`;
       - step 3 gains 10: B's `constructor++`, `__proto__++` and `toString++`, and R's `x++` and `++x`,
         each in both modes;
       - *Revision 3*: step 2 gains 2 more from D10, N's `x === null` and B's `n.x = 1`, each under
         `caseInsensitive` (M11);
       - the other new B rows, and N's `x++`, flip nowhere (M8a, M8b, M9, M11).

     A mismatch either way is a wrong mark, corrected in the step before the commit, with the
     difference in the outcome.
  3. **(iii)** *Wrong*: every row's `native` comparison run against the evaluator's own result in
     place of the native run. The rows whose today differs from JavaScript go red, which shows that
     the native arm is a separate producer (`CLAUDE.md`, "the setup").
  4. No existing file changes. `git diff --name-only` lists the spec, this document and the skill.
- **Category**: ships in no package.
- **Outcome** — done 2026-10-24, under Revision 3.
  - **Corrections to the group counts**, confirmed at the step's gate. The plan's tables did not
    determine three things, and step 1 fixed them as follows:
    1. **Group A has 11 rows, and § 1.4 names 10**: M1e's nine and `c.G = 1`. The eleventh is
       `obj.x = 2`, spelled as the data spells it. It is a control in both modes, so step 3's 51 is
       unchanged.
    2. **Group F has 8 rows, and M1b lists 9 expressions.** F omits `fetch ||= 1`, which part 1 pins
       as `should refuse fetch ||= 1 with the funnel's message`. Step 2's probe (ii) names that case
       apart from F's four.
    3. **The native arm under `caseInsensitive`.** A case-variant row carries `nativeAs`: the same
       assignment written by hand in the data's spelling (`OBJ.X = 2` → `obj.x = 2`), run natively and
       never computed from the row's own source. Today's values are asserted as usual, and step 3
       compares group A's rewritten rows with `nativeAs`. Eleven rows carry one: group A's nine case
       variants, B's `o.CONSTRUCTOR = 1` and S's `this.K = 5`. `fn.X = 1` carries none, since a
       function's key is never matched on the read path either: its native arm is its own source.
       Rows with no JavaScript answer carry `native: none` and a reason: R's 16, whose read events,
       node hooks and trace are the evaluator's own (§ 3.6).
  - **The native arm** runs the row's source, or its `nativeAs`, in sloppy mode under `with`, over a
    proxy that holds every name. So a name the data lacks reads as `undefined` and is written onto
    the data, as the evaluator does, and nothing reaches a global. `this` is the data. A lookup, in
    group L, has no JavaScript counterpart, so the native arm stands an accessor in for it, and counts
    its reads.
  - **The caller's object is asserted beside the store** (§ 0 rule 7). Group B reports `caller`, the
    keys of the object the caller handed in, and group S the `k` on it, beside the store the context
    writes. Under `caseInsensitive` the store is the copy, so without `caller` a change that wrote
    through to the caller's object as well would leave the leg green. The code review found the gap
    (its W1). Probed by making `fromContext` skip the copy for these fixtures, applied alone and
    reverted: 9 `caseInsensitive` cases went red, B's `constructor++`, `__proto__++`, `toString++`
    and `CONSTRUCTOR = 1` and five S rows through `this`. In B's `constructor++`, `toString++` and
    `CONSTRUCTOR = 1`, `caller` was the only field that differed. `CONSTRUCTOR = 1` under
    `caseInsensitive` writes only into the copy, so it gained that design mark.
  - **Two recorded values the run corrected.** Both were values written for the spec, not the plan's
    measurements, and each was read before it was changed:
    - B's `__proto__++` under `caseInsensitive`: the copy gains a `__proto__` map key. M1c's "nothing
      changes" is about the caller's object, which `caller` shows unchanged in both modes. The row
      asserts the copy's keys as well, so it carries the design mark of a write into the copy.
    - S: at first every S row also reported a later `ns.k`. Natively that reads the instance's
      missing `k`, so three case-sensitive controls, `this.k = 5`, `this.k += 5` and `this.k++`,
      differed from JavaScript in a field they are not about. Probe (iii) found them, as its only
      unmarked red cases. S now has two fixtures: `this.*` rows observe the context, and `ns.*` rows
      observe the scope.
  - **Criterion 1**: all 184 cases pass. Nothing under `modules/` changed since db287da, apart from
    the new spec.
  - **Criterion 2.** Both SHA-256s matched the values above, both patches passed `git apply --check`,
    and each was reverted with `git restore modules/eval-core/src`, after which `git status` showed
    the spec alone. Both probes ran against the final spec, over all of `eval-core`:
    - **(i)**, `stage-2.patch`: 28 red of 3064, all in the spec, and the set of red cases equals the
      set marked `2`. The other 81 suites are green. Each red case's diff was read against the plan's
      prototype columns:
      - group E's and P's compound rows lose the second evaluation;
      - group R's six compound rows lose the target walk, and report each read once;
      - the held rows that flip reach their recorded values: C's case-sensitive `this.g += 1` get 2,
        and P's `caseInsensitive` `c.g += 1` two gets and one set;
      - B's `n.x = 1` gives the `object` message;
      - N's `x += 1` and `x === null` give JavaScript's values.
    - **(ii)**, `full.patch`: 79 red of 3064, all in the spec, and the set of red cases equals the set
      marked `2` or `3`: 28 + 51. Each step-3 diff matches the prototype column, and the held rows
      that flip reach their recorded values: C's case-sensitive `this.g = 1` get 1, and L's
      `caseInsensitive` `x = 1` and `X = 1` one call each.
  - **Criterion 3.** 152 cases have a native arm, every case but R's 32. Under probe (iii), 112 went
    red, every one on the native assertion and none on today's. None of them is unmarked. The 40
    that stayed green are the 37 unmarked controls, and group B's case-sensitive `constructor++`,
    `__proto__++` and `toString++`. Those three equal JavaScript today, and are refused by design
    only from step 3. Before `caller` was added, the count was 109 red, with 3 unmarked: the S rows
    above.
  - **M1b's JavaScript column is wrong for one row.** It gives `obj.fetch &&= 1` as "reads", but the
    listed function is truthy, so JavaScript writes `1`. The spec's row records `value: 1` and
    `objFetch: 1`, and the native arm confirms it. § 1.4 stays as written, as a measurement record.
    Group F's "six are controls, asserted by message" counts `fetch++` and `obj.fetch++`, which do not
    throw. They are asserted by value.
  - **Criterion 4.** `git status --short` lists the new spec, untracked, and `git diff --name-only`
    lists this document and the skill.
  - **Totals.** The gate is green at 3064 / 443 / 380, so `eval-core` gained exactly 184 cases.
    doc-links: 354 files, the spec untracked among them, 1827 links, 0 dangling, 51 `docs/` files
    checked against the index. release-tags: 43 rows, 53 tags, 0 failing.
- **Addendum** (*Revision 4*, D11, M12) — its own commit, before step 2's code.
  - **Group T**, 8 rows and 16 cases, pinned today in both modes:
    - `This = 1`, `This += 1` and `This ||= 1`. They are controls: case-sensitive an ordinary name
      equal to JavaScript, and under `caseInsensitive` refused today and by D11 after, with the design
      mark "the this refusal".
    - `This++` and `++This`. They are controls case-sensitive, and flip at 3 under `caseInsensitive`,
      from a write into the copy to the refusal.
    - A host-built `this = 1` and `this += 1`, refused in both modes, are controls. A host-built
      `this++` flips at 3 in both modes. The three carry `native: none`, since JavaScript's parser
      refuses `this` as a target. The spec's evaluator engine takes a host-built AST in place of a
      source, and its native engine refuses one.
  - So the spec holds 100 rows and 200 cases, the held cases stay 18, and the cases marked `3` are 55,
    51 and T's 4. None of T's rows is marked `2`, since D11 keeps step 2's compound rows as they are.
  - **The exception to § 0 rule 10.** T's marks are witnessed by steps 2 and 3's probes, step 2's
    (viii) and step 3's (xii) and (xiii). The pinned prototype predates D11 and does not witness
    them. Against the spec with group T (M12):
    - `stage-2.patch` turns 32 cases red, the 28 marked `2` and 4 controls of T's: `This += 1` and
      `This ||= 1` under `caseInsensitive`, and the host-built `this += 1` in both modes;
    - `full.patch` turns 86 red, the 79 marked `2` or `3` and 7 controls of T's: those 4, `This = 1`
      under `caseInsensitive`, and the host-built `this = 1` in both modes. T's 4 cases marked `3`
      stay green under it, since the prototype's update refuses nothing.

    Criterion 2's predictions, 28 and 28 + 51, hold for the 184 cases step 1 wrote, and the same sets
    went red.
  - **Probes of the new rows**, each applied alone and reverted:
    - the `this` refusal removed from `identifierVisitor`: exactly the host-built `this = 1` and
      `this += 1` went red, case-sensitive;
    - the same refusal removed from `identifierVisitorCaseInsensitive`: exactly `This = 1`, `This += 1`,
      `This ||= 1` and the host-built `this = 1` and `this += 1` went red under `caseInsensitive`.

    The host-built rows' setup is checked by the first probe: a target left named `self` would be
    written, and not refused.
  - **A revert that took the spec with it.** `git restore modules/eval-core/src`, criterion 2's revert,
    restores the spec too, now that it is tracked; in step 1 it was untracked. One run lost the
    uncommitted rows that way, and they were re-applied before the measurement above. Steps 2 and 3
    revert a patch with `git apply -R`, and a probe edit with the Edit tool.

### Step 2 — Compound and logical targets in update's shape (D1, D2 and D3 for those operators), and one identifier read (D10)

- **Edit**:
  - `assignment-expression.ts`. For an operator other than `=`, a member target gets one
    `evaluateMember` call and an identifier target is not walked (§ 3.2). The funnel's check runs on
    the read value. Part 1's short-circuit runs on that value. `=` keeps today's path until step 3.
  - `identifier.ts`, which exports the target read of § 3.2, with the literals fallback on `undefined`
    only. *Revision 3* (D10): `identifierVisitorCaseInsensitive` reads through the same function.
    *Revision 4* (D11): the target read keeps the visitor's `this` refusal.
  - `visitor-result.ts`, which factors the funnel's two tests into one exported function that
    `pushVisitorResult` also calls.
  - The spec: the rows marked `2` are rewritten to JavaScript's expectations, 1:1, and their marks are
    removed.
  - `modules/eval-core/CHANGELOG.md`: `[Unreleased]` › Changed, marked breaking. A compound or logical
    assignment's member target is evaluated once and read once; its read events and node hooks are
    those of the read. › Fixed, *Revision 3*: under `caseInsensitive` an identifier holding `null`
    reads as `null` ([A52](../backlog-retired.md#a52)).
  - This document; the skill's state.
- **Exit criteria**:
  1. The gate is green at 3088 / 443 / 380 (step 2's widening, group V; 3080 at Revision 4, 3064 at
     Revision 3). Every step-2 case now
     equals the native run, except held cases, which equal their recorded values. B's `n.x = 1` under
     `caseInsensitive` is the exception, and equals the case-sensitive message (M11). No other row
     changed, group T's included. `git diff` on the spec touches only the rows marked `2`.
  2. **Probes**:
     - **(i)** *Wrong*: restore the operand walk for compound targets. Exactly the rewritten step-2
       cases go red.
     - **(ii)**, P2, *Wrong*: drop the funnel's check on the read value. Red: group F's
       `fetch += 1`, `obj.fetch += 1`, `obj.fetch ||= 1` and `obj.fetch &&= 1` in both modes, and part
       1's `should refuse fetch ||= 1 with the funnel's message`. Nothing else.
     - **(iii)** *Wrong*: drop the identifier read's event. Red: group R's `x += 1` and `x ||= 1` in
       both modes, and part 1's two short-circuit read-hook cases (M4).
     - **(iv)** *Wrong*: read through the one `evaluateMember` call, but take the write's object and
       key from a second call after the right side. Group E's `getObj()[k()] += f()` and
       `getObj()[k()] &&= f()` go red on their call order, and group P's `c.g += 1` and group C's
       `this.g += 1` on their getter counts.
     - **(v)** *Wrong*: apply the shape to `=` as well. Rows marked `3` go red. This shows that the
       two steps are separable, since they are pinned separately.
     - **(vi)** (*Revision 2*; *Revision 3* widened) *Wrong*: take the shared read's literals fallback
       with `??`, as the identifier visitor did up to 0.13.3. Red, all under `caseInsensitive`: group
       N's `x += 1`, which gives `NaN` again, and the two cases of (vii). That prediction combines M10
       and M11, and was not measured as one switch.
     - **(vii)** (*Revision 3*) *Wrong*: restore `??` in the visitor alone, leaving the target read's
       rule. Red: exactly group N's `x === null` and group B's `n.x = 1`, under `caseInsensitive`.
       They are the two rows whose value the visitor's read decides. N's `x += 1` and `x++` stay green,
       since they read through the target read (M11).
     - **(viii)** (*Revision 4*) *Wrong*: drop the `this` test from the target read (D11). Red:
       exactly group T's compound rows under `caseInsensitive`, `This += 1` and `This ||= 1`, and the
       host-built `this += 1` in both modes. Four cases, the four `stage-2.patch` turns red in T (M12).
  3. `performance.spec.ts` is green and untouched; part 1's 64 cases are untouched and green.
- **Category**: ships in `eval-core`'s next release.
- **Outcome** — done 2026-10-24, under Revision 4.
  - **The confirmation gate's readings.** `identifier.ts` exports one function,
    `readIdentifierTarget`, and the read it shares with `identifierVisitorCaseInsensitive`,
    `readCaseInsensitive`, stays private. The blocklist checks stay private until step 3. The funnel's
    function is `refuseFunnelledValue`. The CHANGELOG's `[Unreleased]` › Changed bullet opens with
    **Breaking**, and step 5 consolidates it under `### Breaking`. The spec's docblock, which describes
    0.13.3 and step 2's marks, is left for step 3, which removes the last marks; `n.x = 1`'s own
    comment is rewritten with its row. Group R's six rows are rewritten by hand to M2's prototype
    column through four new constants beside the existing ones, `identifierRead`, `memberReadOnce`,
    `chainReadOnce` and `computedReadOnce`. So the spec's diff is the 28 cases' rows and those four
    constants, and no other row.
  - **Before the rows were rewritten**, the new code against the unchanged spec turned exactly 28
    cases red, every one marked `2`, and nothing else in `eval-core`.
  - **Criterion 1.** The gate is green at 3088 / 443 / 380: 3080 and group V's 8 cases (below). No `2`
    mark remains. Each rewritten case
    equals its native run, or for R's its M2 prototype column, or for P's `caseInsensitive` and C's
    case-sensitive `+=` its held value. B's `n.x = 1` under `caseInsensitive` gives the
    case-sensitive message. Group T is unchanged and green.
  - **Criterion 2**, each probe applied alone with the Edit tool and reverted, over all of
    `eval-core`:
    - **(i)**, the walk restored for compound targets (`=`'s path for every operator): **25 red, not
      28**, all of them rewritten step-2 cases, and nothing else. The three missing are D10's rows,
      N's `x += 1` and `x === null` and B's `n.x = 1` under `caseInsensitive`. Their values are
      decided by the read's fallback, not by the walk: with the walk restored, the identifier visitor
      reads `null` through D10's rule too. That leg of the criterion names a red case this wrong
      implementation cannot produce, so it is corrected and not amended (`CLAUDE.md`): the three are
      witnessed by (vi) and (vii), which turn exactly them red.
    - **(ii)**, the funnel's check dropped: 9 red, exactly as predicted. Part 1's `fetch ||= 1` goes red
      on its message, `"bound fetch"` for `"fetch"`. It is still refused, by the push of the
      short-circuit's result, whose node is the `AssignmentExpression`, so `readName` falls back to
      the function's own name. F's `obj.fetch ||= 1` short-circuits the same way and went red with it;
      its message was not read.
    - **(iii)**, the target read's event dropped: 6 red, exactly as predicted.
    - **(iv)**, the write's object and key from a second `evaluateMember` after the right side: 21
      red, all in the spec. They are the 7 the criterion names, E's two `getObj()[k()]` rows in both
      modes, P's `c.g += 1` in both and C's case-sensitive `this.g += 1`, plus 14 it does not name.
      The criterion does not say "exactly". The 14, each in both modes:
      - E's `o.g += 1`, `o.g &&= 1` and `o.g ||= 1`, on their getter counts: the second call reads
        the own accessor again;
      - R's `a.b += 1`, `a.b ||= 1`, `a.b.c += 1` and `a[k] += 1`, on their reads, node hooks and
        trace: the second call walks the object, and a computed key, again.
    - **(v)**, the shape applied to `=`: 24 red, every one marked `3`, and nothing else. They are the
      `=` rows whose walk or read the shape removes, 24 of the 55 marked `3`. The others are A44's
      keys, D8's and D9's updates and D11's update rows, which the shape does not reach.
    - **(vi)**, `??` in the shared read: 3 red, exactly as predicted.
    - **(vii)**, `??` in the visitor alone: 2 red, exactly as predicted.
    - **(viii)**, the `this` test dropped from the target read: 4 red, exactly as predicted.
  - **Criterion 3.** `performance.spec.ts` is untouched and green; part 1's cases in
    `assignment-expression.spec.ts` are untouched and green.
  - **Widenings at the step's approval**, from the code review. It found nothing Critical. Each item
    below was confirmed at the approval and is recorded here with its reason:
    1. **Group V, 4 rows and 8 cases** (the review's W1). The funnel's `EvalContext` test at the new
       call site had no case that would fail without it: probe (ii) dropped the whole call, and every
       case it turned red was a function case. So a narrowing to the function test would have left the
       suite green, while `f &&= 2` overwrote a name holding a foreign context.
       - **The rows**: `f += 1`, `o.f += 1`, `f &&= 2` and `o.f &&= 2`, over a foreign `EvalContext`,
         in both modes. Each is refused with `Access to the evaluation context is blocked for security
         reasons`, with both names left holding the context. Each is beside its native run, which
         combines or overwrites it. They carry the design mark "the funnel", and no flip mark. Up to
         0.13.3 the operand walk pushed the target's value, which the funnel refuses, so they were
         refused then too: refused at 0.13.3, measured 2026-10-24, when all 8 passed against
         57be303's visitors with step 2's spec.
       - **The probe**: the call narrowed to the function test, `if (typeof left === 'function')`.
         Exactly the 8 cases of V went red, and nothing else in `eval-core`: `f += 1`, `o.f += 1`,
         `f &&= 2` and `o.f &&= 2`, case-sensitive and `caseInsensitive`.
       - **The counts move.** `eval-core` reaches 3088 at this step and 3124 at step 3. Criterion 1
         here, step 3's criterion 1, § 4, § 6 and the skill say so. The step's criterion 1 named
         3080 at its gate. The new count is this widening, confirmed at the approval, and not an
         amendment by the step.
    2. **Two stale comments, comments only** (the review's N2). `dangerous-values.ts`'s
       `refuseDangerousRead` and `prototype-pollution-guard.ts`'s `refuseContextRead` said that the
       funnel was called from `pushVisitorResult`, and saw only what the walk pushes. Each now names
       `refuseFunnelledValue` and its two call sites. `visitor-result.ts`, on the list, gained one
       sentence on why the push path takes that frame.
    3. **The register's in-flight line** (the review's N5). `docs/backlog.md` said "Revision 3, no
       step has run". It now says Revision 4, with steps 1 and 2 done.

    The CHANGELOG line's claim about A48 and A49, "still read twice", was corrected to "read twice
    where they were read four times" (the review's N1). That file is on the list.

### Step 3 — The `=` resolver (D1, D2, D3) and A44 in both visitors (D4)

- **Edit**:
  - `assignment-expression.ts`: `=` uses the resolver of § 3.3, for an identifier and for a member.
    The compound branch writes to `evaluateMember`'s fifth slot.
  - `member-expression.ts`: `resolveMemberTarget`, and the fifth slot.
  - `update-expression.ts`: the member branch writes to the fifth slot. *Revision 2*: the identifier
    branch reads through step 2's target read, which runs the blocklist checks (D8) and emits one read
    event (D9) (§ 3.3, "The identifier update"). *Revision 4*: it keeps that read's `this` refusal
    (D11).
  - `identifier.ts`: the two checks exported for the resolver, and the `this` refusal with them (D11).
  - The spec: the rows marked `3` are rewritten to JavaScript's expectations, or to the matched key for
    group A, and their marks are removed. No mark remains.
  - `update-expression.spec.ts`: the docblock's A44 sentence is rewritten, and **36 rows** are added.
    They are the member matrix again under `caseInsensitive`, spelled `OBJ.X` over `{ obj: { x } }`,
    9 operands by 4 forms, read back through the matched key.
  - `CHANGELOG.md`: `[Unreleased]` › Changed (breaking), for `=` not reading its target, and the
    read events that follow, and for `x++`'s one read event (D9); › Fixed, for A44; › Security, for
    an identifier update of a blocklisted name, refused (D8), and *Revision 4*, for an identifier
    update of `this` written as a name, refused (D11).
  - This document; the skill's state.
- **Exit criteria**:
  1. The gate is green at 3130 / 443 / 380 (step 3's widening, three D7 rows, confirmed at its
     approval; 3124 at its gate, with step 2's widening; 3116 at Revision 4, 3100 at Revision 3).
     Every step-3 case
     equals the native run, or for group A the matched key, except held cases, which equal their
     recorded values, and group T's, which equal the `this` refusal (D11). No row is left marked to
     flip; the held marks stay.
  2. **Probes**:
     - **(i)** *Wrong*: restore the operand walk for `=`, with its second `evaluateMember` call. Every
       rewritten step-3 case of an `=` row goes red, group A's `=` rows included, since that call
       returns the key as spelled. Group A's compound and update rows (`OBJ.X += 1`, `OBJ.X++`,
       `++OBJ.X`, `obj.X &&= 2`) stay green, as do the 36 update rows.
     - **(ii)** *Wrong*: drop the identifier checks from the resolver. Red: group B's
       `constructor = 1`, `__proto__ = 1` and `toString = 1`, in both modes, which then write.
       `SECURITY.md`'s "Identifiers are checked before any lookup" has no other witness.
     - **(iii)** *Wrong*: drop the resolver's primitive check. Red: `s.constructor = 1`, both modes,
       on its message.
     - **(iv)** *Wrong*: drop the resolver's other member key checks, in the context, `EvalScope` and
       plain branches (D7). Red: group B's `o.__proto__ = f()`, `o.constructor = f()` and
       `this.constructor = f()`, in both modes, on `f`'s call count. `this.constructor = f()` under
       `caseInsensitive` is also red on its message (M10). Every other blocklist row stays green,
       since `safeSetProperty` refuses the same keys with the same message. *Revision 1 predicted 0
       red here*, having no row whose right side could tell the two layers apart.
     - **(v)** *Wrong*: write the key as spelled. Red: group A's eight `caseInsensitive` rows and the
       36 new update rows.
     - **(vi)** *Wrong*: match the key by reading `obj[key]`, as `evaluateMember` does. Red: group P's
       `c.g = 1` under `caseInsensitive`, on its getter count.
     - **(vii)** *Wrong*: emit a read event for the member target in the resolver. Red: group R's
       `a.b = 1`, `a.b.c = 1`, `a[k] = 1` and `this.x = 1`.
     - **(viii)** (*Revision 2*) *Wrong*: drop D7's case-sensitive blocklist check alone. Red: the two
       `o.* = f()` rows, case-sensitive, on `f`'s call count, and nothing else (M10).
     - **(ix)** (*Revision 2*) *Wrong*: drop D8's checks from the update. Red: exactly group B's
       `constructor++`, `__proto__++` and `toString++`, in both modes, which then give `NaN` and write.
     - **(x)** (*Revision 2*) *Wrong*: drop D9's read event from the update. Red: exactly group R's
       `x++` and `++x`, in both modes.
     - **(xi)** (*Revision 2*) *Wrong*: take the target read's fallback with `??`. Red: the four
       `update-expression.spec.ts` `caseInsensitive` identifier cases on `null` (M10), and group N's
       `x++` and `x += 1` under `caseInsensitive`.
     - **(xii)** (*Revision 4*) *Wrong*: drop the `this` refusal from the `=` resolver (D11). Red:
       exactly group T's `This = 1` under `caseInsensitive` and the host-built `this = 1` in both modes,
       which then write. The three are the `=` controls `full.patch` turns red in T (M12).
     - **(xiii)** (*Revision 4*) *Wrong*: drop the `this` refusal from the identifier update alone
       (D11). Red: exactly group T's `This++` and `++This` under `caseInsensitive` and the host-built
       `this++` in both modes, which then write as today.
  3. `performance.spec.ts` is green and untouched, its member-write case at `:400` included.
- **Category**: ships in `eval-core`'s next release.
- **Outcome** — done 2026-10-24, under Revision 4.
  - **The confirmation gate's readings.**
    1. `identifier.ts` exports one function, `refuseIdentifierTarget`, which runs the blocklist
       check, the `this` refusal and, under `caseInsensitive`, the matched-key check, in that order.
       `readIdentifierTarget` calls it, so every identifier target path shares one definition. The
       `=` resolver calls it alone.
    2. The identifier update reads through `readIdentifierTarget` **before** `getKey`, so the checks
       run before any lookup (D8, D11): under `caseInsensitive` `getKey` reads the value it tests
       (finding 8). `full.patch` called `getKey` first. No row tells the two orders apart.
    3. **Case-sensitive, a `null` or `undefined` object with a blocklisted key changes message.**
       § 3.3 gives every receiver that is not a string, number or boolean the full blocklist, as
       `full.patch` does. So `n.constructor = 1` is refused as `Access to dangerous property
       "constructor"…`, where up to 0.13.3 the read's `safeGetProperty` answered `undefined` for a
       nullish object without a check, and `safeSetProperty` refused it as `Cannot set property on
       non-object: object`. Under `caseInsensitive` nothing changes: the read path's own check
       already refused it with the dangerous-property message (the code review's W2). It is refused
       either way, no row pins it, and the CHANGELOG says so.
    4. **The resolver's `key in object` test is in a `try`**, as the read's `obj[key]` test is, so a
       lookup that throws leaves the key as spelled. `full.patch` had none. **Under
       `caseInsensitive` the `=` resolver calls a proxy's `has` trap, which JavaScript's `=` does not
       call**: it is the read path's lookup, with `in` for the read. Group E's proxy `t` has no `has`
       trap, so no row observes it.
    5. The spec's `flips` field, its `Step` type and the flips mark in case names are removed, so no
       row can carry one. Its docblock now describes 0.14.0 and the held and design marks; the
       `today` field name and the `describe` title stay, so the rows' diff stays 1:1. Group R's four
       walked-twice constants are replaced by four `=` constants, and `identifierUpdated` gains its
       read; T's `besideInCopy` went with its last row.
    6. `update-expression.spec.ts`'s 36 rows are a block under `caseInsensitive` alone, `OBJ.X` over
       `{ obj: { x } }`, each against the native update and, beside the read of `x`, asserting that
       `obj`'s own keys are exactly `['x']`, so a write that also created `X` goes red.
    7. **The shared `this` node needs no row: `SECURITY.md:340` covers it.** A host-built AST using
       one `this` Identifier first as a member's object, which marks it positional, and then as a
       target skips D11's refusal at the target. No target path then evaluates `this` to the
       context: `=` reads nothing, and the target read and the update read `get('this')`, an
       ordinary key. So the second place cannot carry the context; it writes a data key named
       `this`, as case-sensitive `This = 1` writes `This` by design. That is the mark-reuse residual
       `SECURITY.md:340` records and case L11 pins, with less reach. A throwaway spec, deleted after
       its run, measured it against this step's code on `{ k: 1 }`, in both modes alike:
       - `(this.k, this = 1)`: `1`; the store gains `this`, holding `1`;
       - `(this.k, this += 1)`: `NaN`; the store gains `this`, holding `NaN`;
       - `(this.k, this++)`: `NaN`; the store gains `this`, holding `NaN`.

       No result was the context, and no key written held it. The trace held the context in all
       three, as `this.k`'s own entry, the limit `SECURITY.md:337` records. Case-sensitive the store
       is the caller's object; under `caseInsensitive` the copy, the caller's keys unchanged. With
       the target first, `(this = 1, this.k)`, `(this += 1, this.k)` and `(this++, this.k)` were
       refused with the `this` message in both modes, nothing written.
  - **Before the rows were rewritten**, the new code against the unchanged spec turned exactly 55
    cases red, every one marked `3`, and nothing else in `eval-core`: the 81 other suites, and
    `update-expression.spec.ts` before its new rows, stayed green.
  - **Criterion 1.** The gate is green at 3130 / 443 / 380: 3088, the 36 update rows, and widening 1's
    6 cases (below); 3124 before the widenings. No case is
    marked to flip, and the eighteen held cases keep their marks. Each rewritten case equals its
    native run, or for group A's `caseInsensitive` rows its `nativeAs`, the matched key; for group
    R's its M2 prototype column, with D9's read for `x++` and `++x`; for C's case-sensitive
    `this.g = 1` and L's `caseInsensitive` `x = 1` and `X = 1` their held values, get 1 and one
    lookup call; for T's update rows the `this` refusal; and for B's three updates the blocklist
    refusal, which is their design mark.
  - **Criterion 2**, each probe applied alone with the Edit tool and reverted by hand, over all of
    `eval-core`. Probes (ii), (ix), (x), (xii) and (xiii) dropped a check at one call site through a
    probe-only parameter of `refuseIdentifierTarget` or `readIdentifierTarget`, inert unless passed;
    `markThisPositional` was not used, since it marks the node permanently. A grep found no residue.
    - **(i)**, the walk restored for `=` with the second `evaluateMember`: 37 red, every rewritten
      `=` case: E's 8, F's 4, A's 4 `caseInsensitive` `=` rows, R's 12, G's 1, P's 2, L's 4 and C's
      2. A's compound and update rows, B's and R's updates and the 36 update rows stayed green.
    - **(ii)**, the blocklist checks dropped from the `=` resolver, the `this` test kept: 6 red,
      exactly B's `constructor = 1`, `__proto__ = 1` and `toString = 1` in both modes.
    - **(iii)**, the primitive check dropped: 2 red, exactly `s.constructor = 1` in both modes.
    - **(iv)**, the context, `EvalScope` and plain branches' other key checks dropped, the matched-key
      check included: 6 red, exactly B's three `= f()` rows in both modes, each on `f`'s call count.
      Under `caseInsensitive` `this.constructor = f()` also differs on its message,
      `Write to the evaluation context…`; case-sensitive only `calls` differs.
    - **(v)**, the key as spelled in the resolver, the compound branch and the update: 44 red, A's 8
      `caseInsensitive` rows and the 36 update rows.
    - **(vi)**, the match by `obj[key] !== undefined` for `in`: 1 red, P's `c.g = 1` under
      `caseInsensitive`. A's `c.G = 1` stays green: `c['G']` calls no getter.
    - **(vii)**, a read event for the member target in the resolver: 8 red, exactly R's `a.b = 1`,
      `a.b.c = 1`, `a[k] = 1` and `this.x = 1` in both modes.
    - **(viii)**, the full check made `caseInsensitive` only: 2 red, exactly the two case-sensitive
      `o.* = f()` rows. Under `caseInsensitive` the full check, kept in that mode, still refuses them
      before `f`.
    - **(ix)**, D8's checks dropped from the update: 6 red, exactly B's `constructor++`,
      `__proto__++` and `toString++` in both modes. The diff read shows `NaN` and the key written.
    - **(x)**, D9's event dropped from the update: 4 red, exactly R's `x++` and `++x` in both modes.
    - **(xi)**, the target read's fallback by `??`, the visitor's read untouched: 6 red, exactly the
      four `update-expression.spec.ts` `caseInsensitive` identifier cases on `null` and N's `x++` and
      `x += 1` under `caseInsensitive`.
    - **(xii)**, the `this` refusal dropped at the `=` resolver: 3 red, exactly T's `This = 1` under
      `caseInsensitive` and the host-built `this = 1` in both modes.
    - **(xiii)**, the `this` refusal dropped at the update: 4 red, exactly T's `This++` and `++This`
      under `caseInsensitive` and the host-built `this++` in both modes.
  - **Criterion 3.** `performance.spec.ts` is untouched and green.
  - **The code review** found nothing Critical. Corrected in this step, on its list: the CHANGELOG's
    `=` bullet now names A49's getter and lookup calls (W1); the nullish message change is
    case-sensitive only, in the CHANGELOG and reading 3 (W2); all three blocklisted updates wrote
    into the copy under `caseInsensitive` (N1); `refuseIdentifierTarget`'s docblock names the
    shared-node limit (N2); probe (viii)'s wording (N5). N8, no witness for an update's `scoped`
    read, is carried to step 5's notes.
  - **Widenings at the step's approval**, from the code review, each confirmed at the approval:
    1. **Three D7 rows in group B, 6 cases** (the review's W3). Three of the resolver's checks are
       repeated by `safeSetProperty` after the right side with the same message, so no row went red
       without them: probe (iv) dropped them with the others, and its red cases came from the plain
       full check and the context exact-key check. Each row asserts `f`'s call count, beside its
       native run, over a fixture of its own, `beforeRight`:
       - `ns.__proto__ = f()`, a global `EvalScope`: refused with `f` uncalled in both modes, the
         design mark "the blocklist, before the right side". Natively `5`, `f` once, and the
         primitive given to `__proto__` ignored.
       - `o.CONSTRUCTOR = f()`: case-sensitive it is another name, so `5`, `f` once and `o` gains
         `CONSTRUCTOR`, equal to JavaScript; under `caseInsensitive` refused as `"constructor"` with
         `f` uncalled, the design mark "the resolved-key check, before the right side", where its
         `nativeAs`, `o.constructor = f()`, writes.
       - `this.CONSTRUCTOR = f()` over `{ constructor: 1 }`: case-sensitive the context holds no
         `CONSTRUCTOR`, so `getThis` answers nothing and the write reaches the context, refused by
         A42 after `f` is called once, the design mark "A42, a write to the context"; under
         `caseInsensitive` `getKey` matches `constructor`, refused with `f` uncalled, the
         resolved-key check's mark. Natively `5`, `f` once.

       **Probes**, each check dropped alone and reverted by hand: the `EvalScope` branch's check
       turned exactly `ns.__proto__ = f()` red in both modes, 2 cases; the plain branch's
       matched-key check exactly `o.CONSTRUCTOR = f()` under `caseInsensitive`, 1; the context
       branch's matched-key check exactly `this.CONSTRUCTOR = f()` under `caseInsensitive`, 1. In
       each, `calls` went from 0 to 1 and the message did not change.
    2. **Three stale comments, comments only** (the review's N3), in two files outside the step's
       list. `call-expression.ts`'s `scopeReceiver` said that `evaluateMember`'s first slot was the
       target of `ns.x = v`; it names `ns.x += v` and `ns.x++`, and `resolveMemberTarget` for `=`.
       `assignment-expression.spec.ts` said that a member target "is still evaluated twice", and
       that the funnel refuses the function "as the left side pushes it"; both now say what 0.13.3
       did and what part 2 does.
    3. **The table's own claim, asserted** (the review's N4), no new cases. Each case of
       `assignment-target.spec.ts` now asserts, before running the evaluator, that a held row's
       `today` equals its `held.after`, and an unmarked row's equals its native or `nativeAs` arm's
       outcome. Design-marked rows, and rows with no native arm, are exempt. Every case stayed
       green. **Probe**: E's `o.g += 1` recorded with `value: 3`. Exactly its 2 cases went red, on
       the new assertion's line, before the evaluator ran.
  - **The counts move.** `eval-core` reaches 3130 at this step: criterion 1, § 4, § 6, the header
    and the skill say so. The criterion named 3124 at the step's gate; the new count is widening 1,
    confirmed at the approval, and not an amendment by the step.
  - **Step 2's outcome is edited here**, in group V's paragraph: its "that was not run" became the
    measurement, at the request's second note.

### Step 4 — Timing: member read and member write, before and after

- **Run** § 3.8's method, exactly, against the plan commit's bundle and step 3's.
- **Edit**: this document only. The outcome records every rotation of every path, the A/A control,
  and the verdict under § 3.8's rule.
- **Exit criteria**:
  1. The run is valid by § 3.8's void rule.
  2. Neither the member read nor the member write meets the regression test. A path that meets it
     stops the plan before step 5, and § 8 gains the question.
  3. The compound, identifier-write and `caseInsensitive` figures are reported.
- **Category**: ships in no package. The reviewer is run on the step's outcome, the numbers and the
  rule's application.
- **Outcome** — done 2026-10-25, under Revision 4. **Valid at the first run; no regression on any
  path.** The member read moved −0.86% by median, positive in 4 of 12, and the member write −20.90%,
  positive in 0 of 12.
  - **The confirmation gate's readings.**
    1. **The harness was rebuilt, not reused.** M6's script was throwaway and did not survive (§ 1.3;
       the prototype's README.txt). This one was written from M6's recorded method and § 3.8, so M6's
       figures came from a different script, and its absolute µs are not comparable with these. Only
       the paired deltas within this run are.
    2. **Bundles.** A is the plan commit's: `git checkout db287da -- modules/eval-core/src`, then
       `nx run eval-core:build:production --skip-nx-cache`. f71656d has db287da's `modules/` tree,
       `git diff db287da f71656d -- modules` being empty. A second fresh build from db287da hashed
       equal to A. A′ is a copy of A. Then `git checkout HEAD -- modules/eval-core/src`: `git status`
       was clean and `git diff --stat HEAD -- modules` empty. B was built from HEAD, 93d76b2, step 3's
       commit. SHA-256 of `fesm2022/zvenigora-ng-eval-core.mjs`: A and A′ `0A3290FE…B468C679`,
       330,949 bytes; B `1977F994…53ADAFB40`, 341,267 bytes. A ≠ B. All three were built before the
       harness started, under the git-ignored `dist/a45-bench/`, deleted after.
    3. **Rotation order.** Odd rotations ran A, A′, B and even ones B, A′, A, so the A/A pair and the
       B-vs-A pair each alternate which runs first.
    4. **The void rule covers the five case-sensitive paths**, the identifier read included. The
       `caseInsensitive` A/A is reported and does not void, since M7 found those legs bimodal. The
       reading did not decide the outcome: the `caseInsensitive` A/A medians are inside ±3% too, with
       at most 7 of 12 positive, so the run is valid under either reading of "on any path".
    5. **The `caseInsensitive` legs ran as a second pass** after the case-sensitive one, with the same
       harness, rotations and A/A, so that their cost did not stretch the deciding rotations: 5–8× per
       evaluation before their slowdown (below), and 14× the case-sensitive pass's wall time.
    6. **A widening confirmed at the gate**: `.claude/skills/step/SKILL.md`'s step state, as steps 2
       and 3 updated it, beside this document.
  - **The harness**, as run:

    ```text
    node 26.4.0, plain Node against the production bundle (fesm2022), @angular/compiler imported first
    child process = one bundle × one path × one mode; children run one at a time (spawnSync)
    loop: rotation 1..12 → path → bundle (odd: A, A′, B; even: B, A′, A)
    paths: obj.x | obj.x = 1 | obj.x += 1 | x = 1 | x
    context: { obj: { x: 1 }, x: 1 }, one object per process
    options: undefined (case-sensitive pass) | { caseInsensitive: true }, one object per process
    ast = acorn.parse(expr, { ecmaVersion: 2022 }), once per process
    one evaluation = evaluate(ast, EvalState.fromContext(context, options))
    one untimed evaluation, its value recorded; then warm-up 20,000, untimed
    then 15 rounds × 60,000, each round timed by process.hrtime.bigint()
    per process: µs per evaluation per round; its median of 15 is the process's figure
    pair, per rotation: delta = (X − A) / A, X = A′ (A/A) or B
    per path: median of the 12 deltas; positive = delta > 0
    regression: median > +3% and ≥ 10 of 12 positive
    void (case-sensitive A/A only): the regression test met, or |median| > 3%
    ```

  - **The machine.** A laptop, Intel Core i7-13700H, 14 cores and 20 threads, 31.7 GB. On mains
    power, the battery at 100%. Windows power plan Balanced, with no power-mode overlay set. Nothing
    from nx, Jest or a build ran during either pass: the Nx daemon was stopped before the run. One
    process was present throughout, VS Code's Jest extension watcher (`jest --watch`, started the day
    before). **That is a departure from § 3.8's wording**, "never in parallel with any other nx or Jest
    run", accepted rather than corrected, because the process was the user's and it ran no tests. It
    used 0.53 CPU-s over the 142 s case-sensitive pass and 8.3 CPU-s over the 33.6-minute
    `caseInsensitive` pass, and nothing in the repository changed during either. It does not void the
    run: the case-sensitive A/A medians stayed within ±1.09%. The
    case-sensitive pass ran 10:10:47–10:13:09 on 2026-10-25, the `caseInsensitive` pass
    10:13:29–10:47:04.
  - **Case-sensitive pass, the deciding one.** Deltas in %, rotations 1–12:

    | Path | Expression | A/A deltas | Median | Positive | B vs A deltas | Median | Positive |
    | :--- | :--- | :--- | ---: | ---: | :--- | ---: | ---: |
    | member read | `obj.x` | 3.0, −8.3, −1.5, 1.4, 2.2, −3.7, −1.4, 9.2, −2.8, 4.0, −5.0, 4.2 | −0.01% | 6 / 12 | 1.8, 5.2, −3.4, −3.0, 6.0, −1.3, −8.5, 7.8, −2.5, −0.4, −3.8, −0.1 | −0.86% | 4 / 12 |
    | member write | `obj.x = 1` | −5.6, 2.1, −2.0, −1.5, −2.3, 3.2, 7.0, −0.6, −6.0, 10.3, −4.9, 0.5 | −1.09% | 5 / 12 | −26.7, −21.5, −20.6, −21.1, −19.5, −19.3, −22.4, −18.5, −23.6, −20.2, −22.8, −19.7 | −20.90% | 0 / 12 |
    | member compound | `obj.x += 1` | −0.7, 2.7, 0.4, −3.5, 2.8, −4.7, −6.2, 0.3, 4.8, −2.8, 2.7, 0.1 | +0.20% | 7 / 12 | −18.8, −20.1, −19.2, −21.6, −18.0, −18.7, −21.9, −19.1, −17.7, −18.8, −17.5, −12.6 | −18.83% | 0 / 12 |
    | identifier write | `x = 1` | −9.8, 2.2, 1.9, 3.7, −5.1, 1.0, 7.8, −1.4, −7.0, −1.2, −1.7, 3.9 | −0.12% | 6 / 12 | −22.8, −13.2, −17.6, −16.1, −20.5, −16.8, −14.4, −20.7, −23.4, −21.5, −18.1, −22.6 | −19.31% | 0 / 12 |
    | identifier read | `x` | 6.5, 2.5, −2.8, 1.2, −1.5, −7.2, 0.5, 5.9, −3.6, −0.2, 0.9, −2.3 | +0.16% | 6 / 12 | 3.6, 1.9, 2.0, −0.6, −0.6, −1.9, 2.4, 6.4, −2.1, 3.2, −1.2, −2.7 | +0.64% | 6 / 12 |

    Per-process medians, µs per evaluation, rotations 1–12:

    | Path | Bundle | Medians |
    | :--- | :--- | :--- |
    | member read | A | 0.514, 0.533, 0.533, 0.534, 0.512, 0.547, 0.559, 0.519, 0.572, 0.513, 0.569, 0.556 |
    |  | A′ | 0.529, 0.488, 0.525, 0.542, 0.523, 0.527, 0.551, 0.566, 0.556, 0.533, 0.541, 0.579 |
    |  | B | 0.523, 0.561, 0.514, 0.518, 0.543, 0.540, 0.511, 0.559, 0.558, 0.510, 0.547, 0.555 |
    | member write | A | 0.808, 0.808, 0.799, 0.812, 0.829, 0.803, 0.790, 0.822, 0.864, 0.785, 0.868, 0.800 |
    |  | A′ | 0.763, 0.825, 0.783, 0.800, 0.810, 0.829, 0.845, 0.816, 0.812, 0.866, 0.825, 0.804 |
    |  | B | 0.592, 0.634, 0.634, 0.640, 0.667, 0.648, 0.613, 0.669, 0.660, 0.626, 0.670, 0.642 |
    | member compound | A | 0.812, 0.810, 0.799, 0.815, 0.802, 0.827, 0.882, 0.843, 0.818, 0.840, 0.826, 0.797 |
    |  | A′ | 0.806, 0.832, 0.802, 0.787, 0.825, 0.788, 0.827, 0.845, 0.858, 0.817, 0.848, 0.798 |
    |  | B | 0.659, 0.647, 0.646, 0.639, 0.658, 0.672, 0.689, 0.682, 0.674, 0.682, 0.681, 0.697 |
    | identifier write | A | 0.703, 0.635, 0.668, 0.656, 0.709, 0.672, 0.651, 0.697, 0.700, 0.700, 0.686, 0.683 |
    |  | A′ | 0.634, 0.649, 0.681, 0.680, 0.674, 0.679, 0.702, 0.687, 0.650, 0.692, 0.675, 0.709 |
    |  | B | 0.543, 0.551, 0.550, 0.550, 0.564, 0.559, 0.557, 0.553, 0.536, 0.550, 0.562, 0.528 |
    | identifier read | A | 0.428, 0.453, 0.455, 0.460, 0.460, 0.478, 0.448, 0.451, 0.454, 0.463, 0.480, 0.479 |
    |  | A′ | 0.456, 0.464, 0.443, 0.465, 0.453, 0.444, 0.450, 0.478, 0.438, 0.462, 0.484, 0.468 |
    |  | B | 0.444, 0.461, 0.465, 0.457, 0.457, 0.469, 0.459, 0.480, 0.444, 0.478, 0.474, 0.466 |

  - **`caseInsensitive` pass, reported only.** Deltas in %, rotations 1–12:

    | Path | Expression | A/A deltas | Median | Positive | B vs A deltas | Median | Positive |
    | :--- | :--- | :--- | ---: | ---: | :--- | ---: | ---: |
    | member read | `obj.x` | −3.4, −0.7, −0.7, 3.5, −4.1, −2.0, −0.6, 0.4, −3.0, 1.4, 0.5, −7.0 | −0.67% | 4 / 12 | −7.1, −1.4, 1.7, 2.5, −5.8, 6.5, −2.2, 2.9, 1.1, 0.3, 1.7, −3.2 | +0.70% | 7 / 12 |
    | member write | `obj.x = 1` | −0.3, 1.3, 2.1, 1.5, −73.4, −49.7, −2.7, 2.3, 8.4, 1.3, −7.9, 8.0 | +1.33% | 7 / 12 | −88.6, −89.0, −88.8, −87.7, −84.3, −89.1, −88.2, −88.5, −89.3, −88.8, −90.5, −91.1 | −88.79% | 0 / 12 |
    | member compound | `obj.x += 1` | 7.2, −0.6, 5.4, 2.1, 120.6, −1.5, −1.8, −0.6, −2.7, 7.8, −1.8, 3.5 | +0.77% | 6 / 12 | −88.6, −89.0, −88.3, −88.8, −41.5, −89.0, −88.0, −88.9, −89.8, −88.3, −91.0, −90.6 | −88.84% | 0 / 12 |
    | identifier write | `x = 1` | −0.4, 0.1, −2.1, −4.6, 1.0, 0.1, 3.6, 2.4, −1.9, 1.6, −2.9, 4.2 | +0.13% | 7 / 12 | −7.1, −3.8, −4.9, −11.9, −7.1, −6.8, 0.9, −8.8, −11.0, −2.2, −5.3, −6.6 | −6.73% | 1 / 12 |
    | identifier read | `x` | 3.7, 2.7, 0.03, 9.8, −2.1, −3.8, −1.6, −0.1, −2.9, −4.1, −2.2, 7.9 | −0.81% | 5 / 12 | 0.4, 2.5, 5.0, −1.0, 4.0, 8.7, −5.6, 4.3, −2.9, −1.3, 0.7, 10.8 | +1.61% | 8 / 12 |

    Per-process medians, µs per evaluation, rotations 1–12:

    | Path | Bundle | Medians |
    | :--- | :--- | :--- |
    | member read | A | 3.884, 3.804, 3.685, 3.628, 4.023, 3.842, 3.874, 3.708, 3.798, 3.749, 3.689, 3.860 |
    |  | A′ | 3.750, 3.778, 3.660, 3.753, 3.859, 3.764, 3.852, 3.722, 3.683, 3.802, 3.706, 3.592 |
    |  | B | 3.607, 3.751, 3.748, 3.717, 3.789, 4.093, 3.787, 3.814, 3.841, 3.759, 3.754, 3.737 |
    | member write | A | 33.874, 35.134, 34.947, 33.059, 25.288, 36.321, 33.946, 34.495, 36.369, 34.594, 39.452, 42.131 |
    |  | A′ | 33.775, 35.607, 35.697, 33.545, 6.733, 18.257, 33.025, 35.279, 39.421, 35.049, 36.331, 45.481 |
    |  | B | 3.848, 3.848, 3.910, 4.077, 3.970, 3.947, 3.999, 3.973, 3.901, 3.886, 3.746, 3.755 |
    | member compound | A | 33.150, 35.578, 33.703, 34.188, 6.876, 36.564, 33.480, 35.432, 37.830, 33.185, 42.496, 41.558 |
    |  | A′ | 35.545, 35.349, 35.512, 34.917, 15.168, 36.014, 32.887, 35.223, 36.813, 35.758, 41.726, 43.017 |
    |  | B | 3.781, 3.925, 3.953, 3.843, 4.024, 4.040, 4.024, 3.925, 3.858, 3.882, 3.825, 3.891 |
    | identifier write | A | 4.025, 4.018, 3.971, 4.242, 3.939, 4.046, 4.010, 3.928, 4.091, 3.883, 3.964, 3.928 |
    |  | A′ | 4.008, 4.024, 3.890, 4.049, 3.978, 4.051, 4.155, 4.024, 4.015, 3.944, 3.848, 4.091 |
    |  | B | 3.737, 3.864, 3.776, 3.736, 3.661, 3.770, 4.045, 3.583, 3.642, 3.797, 3.754, 3.667 |
    | identifier read | A | 3.481, 3.512, 3.537, 3.623, 3.570, 3.588, 3.748, 3.566, 3.678, 3.628, 3.543, 3.329 |
    |  | A′ | 3.610, 3.606, 3.538, 3.979, 3.496, 3.454, 3.690, 3.564, 3.571, 3.478, 3.464, 3.592 |
    |  | B | 3.494, 3.601, 3.713, 3.588, 3.713, 3.901, 3.539, 3.718, 3.570, 3.580, 3.567, 3.690 |

  - **Criterion 1: met.** The case-sensitive A/A medians are −0.01%, −1.09%, +0.20%, −0.12% and
    +0.16%, all inside ±3%, with 6, 5, 7, 6 and 6 positives of 12, so none meets the regression test.
    The run is valid at its first attempt, and no repeat was needed. The `caseInsensitive` A/A medians,
    reported only, are −0.67%, +1.33%, +0.77%, +0.13% and −0.81%, with 4 to 7 positives. Its member
    write and compound swung by −73.4%, −49.7% and +120.6% in single rotations. These are not two
    stable modes. They are rotations in which one process's in-process slowdown (below) came after
    round 8, the median round, instead of at round 7.
  - **Criterion 2: met.** The member read is −0.86% by median, positive in 4 of 12. The member write is
    −20.90%, positive in 0 of 12. Neither meets the test, which needs above +3% and at least 10
    positive. § 8 gains no question.
  - **Criterion 3: met.** Reported, none deciding. Case-sensitive: the member compound −18.83%, 0 of 12
    positive, and the identifier write −19.31%, 0 of 12, as § 3.8 expected, since a walk and a second
    `evaluateMember` are gone. The identifier read, `x`, is +0.64%, 6 of 12, which is within its A/A
    spread. It is a one-node walk, so it is the closest leg to a push-only figure. It answers § 3.2's
    "the push-path cost is measured in step 4": no cost the run can see. Under `caseInsensitive`:
    member read +0.70%, 7 of 12; member write −88.79%, 0 of 12; member compound −88.84%, 0 of 12;
    identifier write −6.73%, 1 of 12; identifier read +1.61%, 8 of 12. The identifier read is the leg
    carrying D10's added comparison, below the test's +3% and 10. **The two −88% figures compare a
    slowed A with a B not yet slowed** (below). Taking each process's median over its rounds before
    the slowdown, the member write is −42.37% and the compound −41.29%, both 0 of 12. On the same
    basis the member read is +0.30%, the identifier write −5.81% and the identifier read +1.31%, with
    A/A medians within ±1.13%.
  - **The `caseInsensitive` slowdown, measured and not explained.** The per-round data, which the
    tables above summarise by each process's median, shows almost every `caseInsensitive` process
    slowing 5–9× partway through its rounds. Here a process's slow round is its first round above
    twice the fastest of its first three. It happens in every bundle and on every path, step 3's
    included. For example, B's member write in rotation 1 runs `3.8 … 3.8 7.3 20.1 29.8 33.6`.
    - **By round:** A and A′'s member write and compound slow at round 7 or 8. Every other leg slows at
      round 12 to 14, B's write and compound included. 175 of 180 processes slow. Each process's figure
      is the median of its 15 rounds, round 8. So that figure lands after the slowdown on A's two write
      paths and before it everywhere else.
    - **(a) By elapsed time**, from the raw data with no new run: the time at a process's first slow
      round is its warm-up, estimated as 20,000 × round 1's µs, plus its preceding rounds. Process
      start-up is not included. Across the 175 processes it is 2.50–3.29 s, median 2.72 s. Each bundle
      and path's median lies between 2.54 s and 2.80 s. So A's write at about 6.7 µs reaching round 7
      or 8 and B's at about 3.9 µs reaching round 12 or 13 land at the same time. The five processes
      that never slowed ran 3.10–6.32 s in total, three of them in rotation 5.
    - **(b) One case-sensitive process for longer**: A's member write, 60 rounds of 60,000, run alone
      after the passes. A was rebuilt from db287da for it, as in reading 2, with its hash equal to
      the run's, and deleted after. B, at 0.64 µs, would have stopped at about 2.3 s. It ran 0.747–0.832 µs in every round, with no rising trend, through 2.87 s of
      timed evaluation, while 150 of the 175 `caseInsensitive` processes had slowed by that point. No
      case-sensitive process in the pass ran longer than 0.81 s.
    - **A cloud run**, recorded as reported: Linux, Node 22.22.0 and 26.12.1, both bundles,
      `obj.x = 1` and `obj.x` under `caseInsensitive`, 20,000 + 15 × 60,000. It saw no slowdown and a
      flat heap, 22–40 MB.

    So the slowdown starts at about the same time in each process, not after the same number of
    evaluations. A case-sensitive process does not slow by that time on this machine, and the cloud
    run did not slow at all. What A versus B shows is only that step 3's code reaches the slowdown
    after more evaluations, because each evaluation is cheaper. It does not show the slowdown belongs
    to either bundle's code. The cause was not measured: this machine and Node 26.4.0 against the cloud's
    Linux and Node versions, and the `caseInsensitive` path's per-evaluation copy against the
    case-sensitive path, are not separated by any arm here. Step 5's notes carry it.

### Step 5 — `SECURITY.md`, README and CHANGELOG; A45, A44 and A52 retired

- **Edit**:
  - `SECURITY.md`, as § 3.5 lists. *Revision 4*: its `this` statement (`:219-222`) is confirmed true
    after step 3, of updates too, and needs no new text.
  - `modules/eval-core/README.md`, as § 3.5 lists. If a README block changes, its case in
    `readme-examples.spec.ts` changes with it, probed by breaking the document.
  - `CHANGELOG.md`: the README's `[Unreleased]` line, and the consolidation.
  - `public-api.spec.ts`'s allowlist, only if `SECURITY.md` names a new identifier.
  - The register: A45, A44 and, *Revision 3*, A52 retire to `backlog-retired.md` as fixed and not yet
    released, with their
    index rows re-pointed and "Work in flight" updated.
  - The published CHANGELOG sections' links to `#a45` and `#a44`: their targets only.
  - This document; the skill's state.
- **Exit criteria**:
  1. The gate is green, doc-links included.
  2. `git grep -n 'fetch = 1'` finds no claim that the write is refused.
  3. Each new README sentence that a spec reads has a probe that breaks the document and goes red.
  4. `SECURITY.md`'s identifier case is green.
- **Notes**:
  - *Step 3's code review, N8*: the `[Unreleased]` line's claim that "a `for` loop's `i++` adds its
    reads, each flagged `scoped`" has no witness. It follows from `emitRead`'s `hasInScopes` test,
    and M8d measured it under the prototype, but no spec asserts a `scoped` read from an update
    (§ 0 rule 5). Step 5's consolidation either gives it a row, a widening of the step's counts
    decided at its gate, or drops the clause.
  - *Step 4's `caseInsensitive` slowdown*: step 4 proposes a new register entry, a widening of step
    5's register edit decided at its gate. On this machine, Windows and Node 26.4.0, every
    `caseInsensitive` process in step 4's harness slowed 5–9× about 2.7 s into its timed loop, in both
    bundles and on every path: (a), 175 of 180 processes, first slow round at 2.50–3.29 s, median
    2.72 s. A case-sensitive member write ran 2.87 s alone without slowing: (b). A cloud run on Linux,
    Node 22.22.0 and 26.12.1, both bundles, `obj.x = 1` and `obj.x` under `caseInsensitive`, saw no
    slowdown and a flat heap, 22–40 MB. The entry would record those three results and that the cause
    is open: the platform or Node version, or something the `caseInsensitive` path builds per
    evaluation (step 4's outcome).
  - *The register's "Work in flight" paragraph on this plan* (`docs/backlog.md`, "The A45 plan is in
    flight") still says that steps 1 and 2 are done and step 3 is next. It has been stale since step 3's commit, which did not touch the
    register, and step 4's edit list excludes it. Step 5's update of "Work in flight" brings it to
    step 5.
- **Category**: the README line ships in `eval-core`'s next release; the rest ships in no package.
- **Outcome** — done 2026-10-25, under Revision 4. **A44, A45 and A52 are retired, fixed and not yet
  released; A53 is opened.**
  - **The confirmation gate's readings.**
    1. **N8 gets its row**, a widening of the file list and the counts: `update-expression.spec.ts`,
       "the read of an identifier update (D9)", one case in each mode, so `eval-core` is at **3132**.
       It runs `for (let i = 0; i < 2; i++) {}` and asserts that the reads at the update's operand
       are two, each flagged `scoped`, and that a dependency tracker records nothing. Probes, each
       applied alone with the Edit tool and reverted, over all of `eval-core`:
       - the update's read event dropped from `readIdentifierTarget`: 12 red, the new 2, group R's
         `x += 1`, `x ||= 1`, `x++` and `++x` in both modes, and part 1's two `a ||= b` read rows,
         every case that reads an identifier target's event;
       - the event dispatched without `scoped`: exactly the new 2. So the row is the only witness of
         the CHANGELOG's clause, and the clause stays.
    2. **`docs/README.md:29`**, a widening: its `#a45` and `#a44` targets only, re-pointed to
       `backlog-retired.md`, since the anchors moved. Step 7 rewrites the line.
    3. **The CHANGELOG's sections as 0.13.0's**: the three "Breaking:" bullets under
       `### Breaking`, the prefix dropped; the README's line under `### Changed`, as 0.13.2's README
       line is; `### Fixed` (A44, A52) and step 3's `### Security` (D8, D11) kept. § 3.5 named only
       Breaking and Fixed, having predated D8 and D11.
    4. **Criterion 3 is met by the claim → witness table below**, decided at the gate: no spec reads
       README prose, since `readme-examples.spec.ts` executes and counts the fenced blocks and the
       edits are in rows and paragraphs. Every new or changed sentence in the README and
       `SECURITY.md` names the cases that pin its behaviour. Writing the table reworded two README
       sentences before it was complete. "`+=` or `||=` reads it once" stood alone: group P and C's
       held rows read twice, so the README names the reads that remain. Its first form, "`this.g =
       1` calls its getter once", was case-sensitive only: under `caseInsensitive` C's row gives 0,
       the write landing in the copy (A50).
    5. **A53 is opened** with Kind "decision, then fix", A24's precedent: the cause, the platform or
       the library, is decided first. Its two runs are the entry's to make, not this step's.
    6. **At the step's approval, N3**: `SECURITY.md` is read at master by every published version's
       README, so the listed-function paragraph and the `constructor++` lines carry version markers,
       in the file's "From 0.13.0" style. The paragraph is now three bullets, `=`, an update, and a
       compound or logical assignment, and restores `++obj.fetch`'s history: overwritten since before
       0.13.0, a string up to 0.13.1, `NaN` from 0.13.2. No spec pinned a prefix update of a listed
       function, so that sentence got a witness rather than a rewording: `update-expression.spec.ts`,
       "should give NaN for ++tools.eval and write NaN", beside the A40 postfix cases, one in each
       mode. **`eval-core` is at 3134.** Probe: the member branch's prefix update of a function
       concatenating again, as up to 0.13.1, turned exactly the new 2 red over all of `eval-core`;
       reverted.
  - **Claim → witness**, every new or changed sentence. A spec named without a file is
    `assignment-target.spec.ts`, by its group and row, each in both modes unless marked:

    | Document | Claim | Witness |
    | :--- | :--- | :--- |
    | `SECURITY.md`, Protections | **From 0.14.0** the update visitor applies the guard to an identifier operand too, so `constructor++` is refused | B's `constructor++`, `__proto__++`, `toString++`, refused with the dangerous-property message; step 3's probe (ix), 6 red |
    | | **Up to 0.13.3** only to a member operand, and `constructor++` wrote an own `constructor` onto the context while `constructor = 1` was refused | B's `constructor = 1`; B's `constructor++` row comment and probe (ix)'s diff, which showed `NaN` and the key written |
    | | An assignment's identifier target is checked the same way, and nothing is written: `constructor = 1`, `constructor += 1`; so is `constructor++`, **from 0.14.0**, which up to 0.13.3 wrote onto the context | B's three rows, each asserting the message and the store's and the caller's keys unchanged; step 3's probe (ii) for `=`, (ix) for the update |
    | `SECURITY.md`, the funnel | No function value reaches anything either way | F's rows and the A40 cases: each gives `1`, `NaN` or the funnel's throw |
    | | **`=`, from 0.14.0**: `=` does not read its target, so `fetch = 1` and `obj.fetch = 1` write `1` | F's `fetch = 1` and `obj.fetch = 1`, against the native run; step 3's probe (i), the walk restored, turned F's 4 red |
    | | **Up to 0.13.3** both were refused at the read: the target was read as an operand, and the funnel refused that read | The same probe (i), which restores that read |
    | | **An update, in every version**, takes its operand without the funnel's test | F's `fetch++` and `obj.fetch++` and the A40 cases, none refused |
    | | `++obj.fetch` has overwritten the function since before 0.13.0, a string up to 0.13.1 and `NaN` from 0.13.2 | `update-expression.spec.ts`, "should give NaN for ++tools.eval and write NaN" (reading 6); the history, A41's retired entry, whose fix replaced the concatenation |
    | | **From 0.13.2** an update converts its operand, so `++obj.fetch`, `fetch++` and `obj.fetch++` write `NaN`; up to 0.13.1 `obj.fetch++` threw after writing | The same case; F's `fetch++` and `obj.fetch++`; `update-expression.spec.ts`, "a listed function as the operand (A40)"; the history, A40's retired entry |
    | | A compound or logical target's read is given the funnel's test although not pushed; so `fetch += 1`, `obj.fetch += 1`, `fetch \|\|= 1` and `obj.fetch \|\|= 1` are refused, as `fetch \|\| 1` is | F's `fetch += 1`, `obj.fetch += 1`, `obj.fetch \|\|= 1`; `assignment-expression.spec.ts`, "should refuse fetch \|\|= 1 with the funnel's message, as fetch \|\| 1 is"; step 2's probe (ii), 9 red |
    | README, `AssignmentExpression` | From 0.14.0, object and key once, the value only for a compound or logical operator, then the right side, then the write | E's `getObj().x = 1`, `getObj()[k()] = f()`, `+= f()`, `\|\|= f()`, `&&= f()`, call order against the native run |
    | | `=` does not read its target; `+=` or `\|\|=` reads it once | E's `o.g = 1` (getter 0), `o.g += 1`, `o.g &&= 1` (getter 1), `o.g \|\|= 1` |
    | | Up to 0.13.3 the target was read as an operand, and a member target evaluated again after the right side | Step 2's probe (i), the walk restored for compound targets, 25 red; step 3's (i), for `=`, 37 red |
    | | Three kinds of read remain: `this.g = 1` once and `this.g += 1` twice case-sensitive; a lookup answering `x`, once for `x = 1` and twice for `x += 1`, under `caseInsensitive`; an inherited getter under `caseInsensitive`, twice for `c.g += 1`, as for `c.g` | C's `this.g = 1` and `this.g += 1`, case-sensitive, held under A49; L's `x = 1` and `x += 1`, `caseInsensitive`, held under A49; P's `c.g += 1` and `c.g`, `caseInsensitive`, held under A48 |
    | README, `UpdateExpression` | Under `caseInsensitive` a member update writes the key its read matched: `OBJ.X++` writes `x` | `update-expression.spec.ts`, "under caseInsensitive, a case variant of the member (A44)", 36 cases; A's `OBJ.X++`, `++OBJ.X`; step 3's probe (v), 44 red |
    | README, case-insensitive section | A member write reaches the key the read would match: `OBJ.X = 2` writes `x`, where up to 0.13.3 it created `X` | A's `OBJ.X = 2`, `obj.X = 2`, `obj["X"] = 2`, `caseInsensitive`, each asserting the object's keys; probe (v) |
    | | A key that matches nothing is written as spelled | A's `obj.Y = 2` |
    | README, beside `onRead` | `a.b = 1` reports `a` and not `a.b`; `x = 1` nothing; a compound or logical assignment one read of its target, `a.b += 1` reporting `a` then `a.b`; `x++` one read of `x` | R's `a.b = 1`, `x = 1`, `a.b += 1`, `a.b \|\|= 1`, `x += 1`, `x \|\|= 1`, `x++`, `++x`; step 3's probes (vii), 8 red, and (x), 4 red; step 2's (iii), 6 red; reading 1's first probe, 12 red |

    The bullet "an assignment's target, `fetch = 1` or `obj.fetch = 1`" under "Reads that only
    inspect the value throw too" is removed, as § 3.5 lists, and needs no witness. "Identifiers are
    checked before any lookup" and the `this` statement (`SECURITY.md:227-230` now) are unchanged.
  - **The code review** found nothing Critical. Corrected in this step: the README's lookup case
    gave `x = 1`'s count and not `x += 1`'s, two, which L's held row pins (W1); A53's index row said
    every process slowed, where the entry measures 175 of 180 (W2); the plan's "Opens" line still
    counted A52 among the defects it does not fix (N1); `SECURITY.md` now says the compound read is
    given the funnel's test without being pushed, and an update's is not (N2); a reflow leftover in
    the README row (N4). N3, the rewrite's lost `++obj.fetch` history, was fixed at the step's
    approval (reading 6). Left: source comments citing `docs/backlog.md` A44, A45 and A52 by ID, as
    criterion 1 records (N5).
  - **Criterion 1.** The gate is green at 3134 / 443 / 380, doc-links at 0 dangling. The move left
    14 dangling links, all listed by the gate and re-pointed: the plan's ten, `docs/README.md`'s two,
    `backlog-retired.md`'s A40 entry, and the register's own A44 mention. Comments in source cite
    `docs/backlog.md` A44, A45 and A52 by ID, which the index still resolves, and are not edited.
  - **Criterion 2.** `git grep -n 'fetch = 1'`, read line by line: `SECURITY.md:202` says the write
    happens. The CHANGELOG's `[Unreleased]` (`:34`) says it writes where it was refused, and its
    `[0.12.1]` (`:379`) is that release's history. `backlog.md`'s are the 0.13.2 Publication row and
    A45's index title, each describing the defect as it stood, and `backlog-retired.md`'s are A45's,
    in the past tense. The rest are the A35 plan, a design record, this plan, and the spec's two F
    rows. None claims the write is refused now.
  - **Criterion 3.** Met by the table above (reading 4).
  - **Criterion 4.** `public-api.spec.ts`'s identifier case is green, and no allowlist entry was
    needed. Probed by breaking the document: a code span `refuseProbeXyz()` added to the rewritten
    paragraph turned exactly that case red, naming the identifier; reverted.
  - **The register.** A44, A45 and A52 moved to `backlog-retired.md` after A46, each with its
    *Fixed* and *Verified* paragraphs and its original measurement kept; their index rows point
    there. A53 is opened after A51. "Work in flight" is brought to step 5. The register history's
    *Unreleased* row becomes 24 live before, 6 opened (A48–A53), 5 closed (F21, F25, A44, A45, A52),
    25 after, and the totals row 42 + 67 − 84 = 25. **The cycle's live count rises from 24 to 25
    because this plan's measurements surfaced six pre-existing defects, A48–A53**, and it closed
    three.

### Step 6 — Release commit

- **Before the commit**: § 8 q7 is answered at the gate, from M5 and from the same probe run against
  `eval-forms`. The answer fixes each downstream version and floor.
- **Edit**:
  - `eval-core` 0.14.0;
  - `eval-signals` and `eval-forms` at the versions q7 fixes, their ranges widened;
  - each `CHANGELOG.md`'s `[Unreleased]` moved under its version;
  - each README's peer line, which the peer-range cases check;
  - this document.
- **Exit criteria**:
  1. The gate is green.
  2. The built `eval-core` `.d.ts` is byte-identical to 0.13.3's tarball's, or the difference is
     listed.
  3. Every peer range admits a consistent set.
- **Category**: the releases. Publishing and tagging, in the order core → signals → forms, are the
  maintainer's.
- **Outcome** — done 2026-10-25, under Revision 4. **`eval-core` 0.14.0, `eval-signals` 0.7.0,
  `eval-forms` 0.7.0, every `@zvenigora` floor raised.**
  - **§ 8 q7, measured at the gate before any version was written.** Throwaway Jest specs, run once
    in step 5's tree and once in a worktree at the `eval-core@0.13.3` tag, then deleted from both.
    `git diff eval-core@0.13.3 HEAD -- modules/eval-signals modules/eval-forms` is empty, so the two
    arms differ in `eval-core` alone. The full-text diff of the results has the same changed rows as
    the diff with messages and `expression` fields stripped: every error message is identical **on
    these rows**, each of which spells its key as the data does. The A44 leg below, found by the code
    review, is the row they lacked.
    - **`eval-signals`** (`trackDependencies: true`, `createState` as the recompute counter, one
      source changed between two reads). M5's and M5b's rows reproduce exactly, case-sensitive:
      `count = 5` deps `{count}` → `{}`, recomputes 2 → 1; `user.name = "Bob"` `{user, user.name}` →
      `{user}`; `user.a.b = 1` `{user, user.a, user.a.b}` → `{user, user.a}`; `x++` and `++x` `{}` →
      `{x}`, recomputes 2 and 2. Compound rows, both `let o` rows, `let i = x; i++; i` and `user.n++`
      are unchanged. The `SignalContextWriteError`'s class, `kind`, `key`, `expression` and message
      are unchanged on every row. **Under `caseInsensitive`**, a leg M5 lacked, the dependency rows
      move alike, but `count = 5` still recomputes, 2 and 2, since `getKey` reads the signal (A49).
    - **`eval-forms`, its public surface.** `/reactive`, `bindFieldProperties` with `count = 5` as a
      `visible` or a `text` rule: recomputes 2 → **1**. `/signals`, `EvalState.fromContext` counted
      as the walk: `count = 5` case-sensitive walks 1 then 1 → **1 then 0**, and under
      `caseInsensitive` 1 then 1 in both. The error's class, `kind`, `key`, `expression` and message
      are unchanged at both entry points. `/reactive`'s exposed `dependencies` are `{}` at both
      versions, since `bindFieldProperties` turns no tracking on. `count += 5`, `user.name = "Bob"`,
      `user.name += "Bob"`, `x++`, `++x` and `count > 0` are unchanged on every surface.
    - **D10, the leg q7's Revision 3 named.** Under `caseInsensitive`, over a `null` source:
      `eval-signals` `nul` `undefined` → `null`, `nul === null` `false` → `true`, `nul + 1` `NaN` →
      `1`; `eval-forms` `/signals` `evalVisible(…, 'nul === null')` hidden → shown, `evalText(…,
      'nul + 1')` `'NaN'` → `'1'`. Case-sensitive, nothing moves. Finding 10 carries the dated
      correction.
    - **A44, through the write error**, found by the code review and measured the same way, over
      `{ user: { name: 'a' } }`. Under `caseInsensitive`, `user.NAME = "Bob"`, `user.NAME += "x"`,
      `user.NAME++` and `USER.NAME = "Bob"` throw `SignalContextWriteError` with `key` `NAME` and a
      message naming `'NAME'` at 0.13.3, and `name` at step 5, in `eval-signals`; the first three
      likewise in `eval-forms`' `/signals`. Case-sensitive, every row keeps `NAME`. The class, `kind`
      and `expression` are unchanged.
    - **The choice**: both 0.7.0, on the 0.6.0 precedent. `eval-forms` changed on its surface, its
      recompute triggers and its `/signals` values.
  - **The gate's readings.** 1, the floors rise; 2, each README's floor reason is rewritten with its
    range; 3, **a widening**: `eval-forms` README's two recompute sentences (`:179`, `:640` at step 5)
    say "reads `country`" where they said "named", so they hold for a write-only rule. The existing
    cases that witness the reading form are `reactive/src/lib/readme-examples.spec.ts`, "should
    recompute only for the control a rule named (S 4)", and `signals/src/lib/readme-examples.spec.ts`,
    "should re-evaluate a rule for the key it named and not for another (S 4)": each counts the
    recomputes of `country + missing.fn()`, a rule that reads `country`, across a change to `country`
    and to another key. 4, each 0.7.0 entry states that the recompute change is case-sensitive only
    (A49) and the D10 change `caseInsensitive` only. 5, finding 10's correction is dated, not a
    rewrite.
  - **After the code review, approved at the gate.** Both 0.7.0 entries name A44 in their lead, gain
    a `### Fixed` entry for the write error's key (`/signals` only in `eval-forms`), and claim the
    error unchanged only where a rule spells its key as the data does. Three widenings:
    - 2: `eval-forms` README's Reactivity sentence, "a control it named emits", says "reads", the
      flaw reading 3 fixed twice. Its witness is the same `/reactive` readme-examples case.
    - 3: the register's "Work in flight" brought to step 6 done, pending publish.
    - 5: `eval-signals` README's "Only your own record's keys are respelled" names the exception, a
      member write's key, with **one new case**: `signal-context.spec.ts`, "should name a member write
      the key its target holds under caseInsensitive", `user.NAME = "Bob"` over
      `{ user: signal({ name: 'a' }) }`, asserting `kind` `member`, `key` `name`, the message naming
      `'name'`, and the signal unwritten. **`eval-signals` is at 444.** Probe: `resolveMemberTarget`
      returning the key as spelled (`member-expression.ts:389`) turned exactly the new case red over
      all of `eval-signals`, 1 of 444, receiving `NAME`; reverted, `git diff` on `eval-core`'s source
      empty.
  - **The code review** found one Critical, A44 through the write error, above, confirmed end to
    end and fixed in this step. Its Warnings were the three widenings and the suite counts, which
    were 439 and 376 at 0.6.1, not 443 and 380: each entry now says no case changed for it. Its
    Notes were applied: `eval-core`'s lead says no exported symbol changes shape, "records what it
    recorded before", `/signals` named for the `null` clause in the forms README, and reflows. One
    Note stays open as written: `eval-signals` README's divergence list (`:173`) does not name
    `count = 5` reporting `{}` while it recomputes under `caseInsensitive`; the CHANGELOG does.
  - **For step 7's retrospect.** § 0 gains rule 13: **a downstream "unchanged" claim is measured on
    each fixed defect's own rows through the downstream package.** q7's measurement reused M5's rows,
    each spelling its key as the data does, so A44, a defect this plan fixed, was never run through
    `eval-signals` or `eval-forms`, and both entries said the error was unchanged until the code
    review measured it.
  - **Peer ranges, before → after.** `eval-signals`: `@zvenigora/ng-eval-core` `>=0.13.0 <0.14.0` →
    `>=0.14.0 <0.15.0`. `eval-forms`: `@zvenigora/ng-eval-core` the same; `@zvenigora/ng-eval-signals`
    `>=0.6.0 <0.7.0` → `>=0.7.0 <0.8.0`. Every other peer of the three is unchanged.
  - **Criterion 1.** The gate is green at 3134 / 444 / 380, `eval-signals` +1 by widening 5;
    doc-links 354 files and 1857 links, 0 dangling; release-tags 43 rows, 53 tags, 0 failing.
  - **Criterion 2.** The built `types/zvenigora-ng-eval-core.d.ts` is byte-identical to the npm
    0.13.3 tarball's: SHA-256 `4F11D36F…3D16F651`, 111,787 bytes, before and after the version bump.
    Measured the same way before the entries claimed it: `eval-signals`' `.d.ts` and `eval-forms`'
    three are byte-identical to their 0.6.1 tarballs'.
  - **Criterion 3.** `semver`: `eval-signals`' core range admits 0.14.0 and not 0.13.3; `eval-forms`'
    admits core 0.14.0 and signals 0.7.0, and not 0.13.3 or 0.6.1; the two core ranges intersect.
    The README peer-range cases are green, and each was probed by breaking its document: the signals
    README's span widened to `>=0.13.0 <0.15.0` turned exactly that package's peer case red, naming
    `:15`, and the forms README's manifest block quoting `>=0.6.0 <0.8.0` turned exactly its peer case
    red, naming `:94`. Both reverted.

### Step 7 — Post-publish commit

- **Edit**:
  - the register's Publication status rows and A45's and A44's status lines, with the tags;
  - `CLAUDE.md`'s versions and active-plan lines;
  - `docs/README.md`, moving this plan to "Completed tracks";
  - the skill, back to "none active";
  - this document's last revision and the track's retrospect.
- **Exit criteria**: release-tags is green with the new rows, and doc-links is green.
- **Category**: ships in no package, except widening 1 below, which corrects three shipped files.
- **Outcome** — done 2026-10-26 (UTC; the step's records are dated in UTC, as the release's are),
  under Revision 5. **The three releases are recorded, and the plan is complete.**
  - **The release, measured and not taken from the request.** `npm view <pkg> time`:
    `eval-core` 0.14.0 at 2026-10-26 00:29:37 UTC, `eval-signals` 0.7.0 at 00:32:38 and `eval-forms`
    0.7.0 at 00:34:07, in the order step 6 requires; each is `latest`. The three tags are
    **annotated**, left as they were: `git cat-file -t` gives `tag` for each, each peels to 0d305a3,
    and `git ls-remote` shows each tag object and its `^{}` peel on origin. HEAD was 0d305a3,
    `origin/master`'s commit. Of the 59 tags, the 56 release tags are annotated and the three `v*`
    lightweight, as the register says.
  - **The confirmation gate's readings.**
    1. **The three CHANGELOG headings move to 2026-10-26**, a widening of step 7's Edit list, which
       omitted them, though § 4's table already named "CHANGELOG dates" (and omitted the skill, now
       added there): `modules/eval-core/CHANGELOG.md`'s `[0.14.0]` and `eval-signals`' and
       `eval-forms`' `[0.7.0]`.
       Publishing crossed UTC midnight, and CONTRIBUTING's Releasing step 6 has the post-publish
       commit correct a heading to npm's UTC publish date. No `[Unreleased]` line: the change is
       the release entry's own heading. **The published tarballs keep 2026-10-25**: each was
       fetched with `npm pack` and its `package/CHANGELOG.md` read, and each heading says
       2026-10-25. A package's next release ships the corrected date. `git grep 2026-10-25` found the
       date nowhere else as a release date.
    2. **F26 is opened as the gap only**: `tools/release-tags.mjs` resolves a tag with
       `git rev-list -n 1`, which a lightweight tag satisfies, so the register's "all annotated"
       is checked by nothing. It is the next item after this step. It opens after 0d305a3, so the
       register history gains an *Unreleased* row, 25 + 1 − 0 = 26.
    3. **The retrospect is § 10 of this document**, as the A35 track's plan stands alone, and not a
       separate summary.
    4. **A52's lines move with A44's and A45's**: the step names A44 and A45, and A52 carried the
       same "not yet released" in the same two files.
  - **The register.** Three Publication status rows at 0d305a3; the tag paragraph at forty-six rows
    and fifty-six tags, naming F26 beside its "all annotated"; the *Unreleased* row becomes 0.14.0's,
    `0d305a3`, 2026-10-26, 24 + 6 − 5 = 25, and a new *Unreleased* row holds F26, 25 + 1 − 0 = 26,
    totals 42 + 68 − 84 = 26. A44's, A45's and A52's index rows and retired entries say released in
    0.14.0, tagged 0d305a3. "Work in flight" says the plan is complete, with F26 next.
  - **The criterion.** The gate is green at 3134 / 444 / 380, every row unmoved. release-tags: 46
    rows, 56 release tags, 0 failing. doc-links: 354 files, 1878 links, 0 dangling, 51 `docs/` files
    checked against the index. The new rows are parsed, not skipped: `eval-core`'s row's commit
    changed to 021d5e4 failed exactly `docs/backlog.md:206`, "eval-core@0.14.0 is at 0d305a3, and the
    row says 021d5e4", 1 failing; reverted, 0 failing. `git diff --name-status HEAD` lists the step's
    files and the three CHANGELOGs of widening 1, all `M`.
  - **The code review** found nothing Critical. It verified:
    - the three rows clause by clause against the CHANGELOGs and manifests;
    - "admitted only by 0.7.0", against every earlier downstream tag's `package.json`;
    - the live count from the index, 24 at 021d5e4, 25 at 0d305a3 and 26 after;
    - the tag counts, against `git cat-file -t` and `git ls-remote`;
    - release-tags' parsing, by two probes on a scratch copy of the register.

    Corrected in this step:
    - § 10.2's M11 bullet said `n.x = 1` took the held cases from 19 to 18: it was a control, and
      raised step 2's flips to 28, while N's `x === null` left the holds (W1);
    - § 10.3 said step 1's probes ran M4's code, where the pinned patches are the prototype rebuilt
      with D7–D10 and verified 2026-10-23 (W2);
    - the *Recorded* lines of A44, A45 and A52 in `backlog-retired.md` cited `[Unreleased]`, now
      `[0.14.0]`, as dc4302d re-pointed A41's (W3), in entries the step already edits;
    - § 10.2's D7 bullet credited step 3 with Revision 1's prediction (N1);
    - F26 stated the A35 plan's hypothetical as fact (N2);
    - "thirteen rules" are nine carried forward and four this plan's own (N3);
    - a missing subject in the `eval-signals` row (N4);
    - the tag reading tied to a commit (N5);
    - two reflows (N6);
    - § 4's table row (N7).

    Left as found, older than this step: A40's *Recorded* line cites `[Unreleased]` › Security
    (`backlog-retired.md`, A40), which 0.13.2 released.

---

## 5. Public API surface

None changes. `evaluateMember`, `resolveMemberTarget`, the exported identifier helpers and the
funnel's function are all under `internal/visitors`, which `src/public-api.ts` does not re-export. The
release is breaking by behaviour (§ 3.1, M2, M5), not by shape.

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | +184 in step 1, +16 in Revision 4's addendum, +8 in step 2 (its widening), +42 in step 3 (its widening included), +4 in step 5 (its widenings), 0 otherwise: 3064, 3080, 3088 after step 2, 3130 after step 3, 3134 from step 5 (Revision 4; +164 at Revision 1) |
| `eval-signals` / `eval-forms` tests | (in the above) | 443 / 380 through step 5; 444 / 380 from step 6, its gate's widening |
| Perf | `internal/performance.spec.ts` | Green and untouched in every step |
| Timing | § 3.8's harness | Step 4 only, under the rule stated there |
| Scope | `git diff --name-status HEAD` | The step's file list; no `R`; no `package.json` before step 6 |
| Surface | the built `.d.ts` against 0.13.3's tarball | Step 6 |

## 7. Risks

| Risk | Likelihood | Mitigation — the criterion that fails |
| :--- | :---: | :--- |
| A compound target stops being refused by the funnel | Certain without § 3.2's check (M4) | Step 2, probe (ii) |
| `constructor = 1` writes once the walk is gone | Certain without the resolver's checks (M1c) | Step 3, probe (ii) |
| A mark in the characterisation spec is wrong, so a flip goes unwitnessed | Medium | Step 1, probes (i) and (ii), against the prototype |
| A consumer relied on `a.b = 1` reporting `a.b`, or on `count = 5` depending on `count` | Low: no case in any suite does (M4) | The `### Breaking` entry; § 8 q7 for the downstream versions |
| The fifth slot or the factored funnel slows the read or push path | Low: +0.12% measured on the read (M6) | Step 4's rule, met by no path: the read −0.86%, 4 of 12 positive (step 4's outcome); `performance.spec.ts` |
| A host relied on A44's new key | Low | The `### Fixed` entry names the old behaviour |
| The machine's noise hides a real regression | Medium (M6) | § 3.8's A/A control and its void rule |
| The resolver runs the right side before refusing a blocklisted key | Certain without D7's case-sensitive check (M8b) | Step 3, probes (iv) and (viii) |
| D9's shared read turns `null` into `undefined` under `caseInsensitive` | Certain with the `??` fallback (M10) | Step 2, probe (vi); step 3, probe (xi); `update-expression.spec.ts`'s four `null` cases |
| A held row is read as a pass, and its entry is forgotten | Medium | Every hold names a live register entry, A48–A51; fixing one moves its rows |
| D10's read changes a `null` the host relied on reading as `undefined` | Low: no case in any suite does (M11) | The `### Fixed` entry; step 2, probe (vii) |
| An identifier target that is not walked loses the `this` refusal | Certain without D11's test (M12) | Group T; step 2, probe (viii); step 3, probes (xii) and (xiii) |
| Group T's marks go unwitnessed, since the pinned prototype predates D11 | Medium | The same three probes, each predicting T's red cases exactly |

## 8. Open questions

*Revision 2* decided q1, q5 and q6 as D9, D8 and D7 (§ 2) and removed them. It moved q2, q3 and q4
into the register and removed q8, folding its note into A48. The remaining questions keep their
numbers, so a citation of "§ 8 q7" still resolves. Only q7 is undecided here; q2–q4 are pointers, and
their decisions belong to their entries. *Revision 3* decided q9 as D10 and removed it. Step 6's gate
decided q7 by measurement; q7 keeps its text, with the decision under it.

2. **Under `caseInsensitive`, the read path reads a prototype accessor twice**:
   [A48](../backlog.md#a48) (M1f, finding 7). Its rows are held in step 1. The entry also records
   that the plan's harness cannot time the `caseInsensitive` path (M7), which was q8.
3. **The context branch reads what it tests**: [A49](../backlog.md#a49) (M1j, finding 8). Held in
   step 1.
4. **Two write targets miss the data** (M1d, M1h, M1i; finding 9), as two entries, since the two are
   different code paths with different fixes:
   - `this.k = v` under `caseInsensitive` lands on the `Registry` copy: [A50](../backlog.md#a50);
   - a member of an `EvalScope` value lands on the instance: [A51](../backlog.md#a51).

   Both are held in step 1.
7. **The downstream versions** (M5, finding 10; D5). `eval-signals`' `dependencies` and recompute
   count change for an expression that writes a context key or a member. Every such expression throws
   `SignalContextWriteError` on every recompute. The 0.6.0 precedent forwarded a consumer-observable
   change as a breaking minor with no shipped code changed. Is this a minor, 0.7.0, or a patch, 0.6.2?
   And `eval-forms`, which M5 did not measure directly: its suite is green (M4), and its README's "the
   expression named `country`" (`:179`, `:640`) is true of every rule that reads.
   *Revision 2*: D9 moves `eval-signals`' `dependencies` the other way for an identifier update. `x++`
   records `{x}` where today it records `{}`, while the recompute is unchanged, since the signal read
   happens either way (M5b). That too is an expression that throws on every recompute.
   *Revision 3*: D10 changes what a `caseInsensitive` signal context's identifier reads give for a
   `null` source. M11's suites cover `eval-signals` and `eval-forms`, both green, but M5's probe was
   not re-run under D10.
   **Decided at step 6's gate, 2026-10-25**: `eval-signals` 0.7.0 and `eval-forms` 0.7.0, both
   breaking minors on the 0.6.0 precedent, with every `@zvenigora` floor raised. `eval-forms` was
   measured on its public surface and changed: a case-sensitive write-only rule is no longer
   recomputed when its target changes, on both entry points, and the D10 reads change on `/signals`
   under `caseInsensitive`. The measurement is step 6's outcome.

## 9. Contract after this lands

1. An assignment's member target has its object and key evaluated once, in JavaScript's order:
   object, key, the read where there is one, the right side, the write. `=` reads no value, except
   what [A49](../backlog.md#a49) records for the context branch.
2. A compound or logical assignment reads its target once, and that value passes the funnel. A listed
   function as such a target is refused with today's message.
3. `a.b = 1` reports the reads of `a` and of any intermediate hops. `x = 1` reports nothing. A compound
   or logical assignment reports one read of its target. Node hooks and the trace see the object and a
   computed key, never the target node.
4. Under `caseInsensitive`, an assignment or update writes to the key the lookup matched, and to the
   key as spelled when nothing matches.
5. An `=` target that is a blocklisted identifier, a blocklisted member key, or a blocklisted key the
   lookup matched is refused, with today's message, before the right side runs (D7).
6. An identifier update of a blocklisted name is refused with the blocklist message (D8). An
   identifier update reports one read of its target (D9). Its value is read with the literals
   fallback on `undefined` only, so `x++` on `null` stays `0`.
7. Under `caseInsensitive`, an identifier holding `null` reads as `null`, through the one identifier
   read the visitor and every target share (D10, *Revision 3*). The literals registry answers only a
   name `get` finds nothing for.
8. Every identifier target, `=`, compound, logical and update alike, refuses `this` written as a name,
   a host-built `this` and under `caseInsensitive` any spelling of it, with the identifier visitor's
   message and before any lookup (D11, *Revision 4*). Case-sensitive, `This` is an ordinary name.
9. **Not provided**, each held in step 1 under its entry:
   - a single read of a prototype accessor under `caseInsensitive` ([A48](../backlog.md#a48));
   - an `=` through the context branch that reads nothing ([A49](../backlog.md#a49));
   - a write through `this` under `caseInsensitive` that reaches the data ([A50](../backlog.md#a50));
   - a write through an `EvalScope` value that reaches the data ([A51](../backlog.md#a51)).

## 10. Retrospect

*Revision 5, step 7.* The track's one retrospect. It keeps what a later plan can reuse, not a
summary of the steps, which are § 4's outcomes.

### 10.1 Twice the measured rows did not exercise the change

Both times the measurement was sound, the reading was "nothing changed", and the rows could not have
shown a change.

- **M4, before step 1.** The whole change, prototyped, left all three suites green at 2880 / 443 /
  380. Read as "safe", that was wrong: nothing in the suites pinned an assignment target's reads, so
  nothing could go red. The answer was § 0 rule 10. The characterisation spec came first, and the
  prototype became the probe that checked its marks: 28 red at stage 2, 79 for the whole change.
- **§ 8 q7, at step 6's gate.** The downstream measurement reused M5's rows, and every one of them
  spelled its key as the data does. So A44, which this plan fixed, never ran through `eval-signals`
  or `eval-forms`. Both 0.7.0 entries called the write error unchanged until the code review
  measured `user.NAME = "Bob"`: the error's `key` moved from `NAME` to `name`. The answer was § 0
  rule 13.

What the two share: a row set inherited from an earlier question, run against a new change. Before
citing "unchanged", name the row that would have shown the change (§ 0 rule 3). If no row in the set
can, the measurement has not been made yet.

### 10.2 Each corrected prediction, and why it was wrong

- **Revision 2, D7.** § 3.3's resolver lacked the case-sensitive blocklist check the read used to
  make, so `o.constructor = f()` called `f` before refusing (M8b). Revision 1 could not see this.
  `safeSetProperty` refuses the same keys with the same message after the right side, and no row had
  a right side with an effect, so Revision 1 predicted step 3's probe (iv) at 0 red; Revision 2
  corrected that before step 3 ran. Step 3 then hit the same blind spot once more: three of the
  resolver's checks had no witness until a widening gave each a `= f()` row. **A check repeated downstream with the same message has no
  witness unless a row's side effect separates the two layers** (§ 0 rule 6).
- **Revision 2, D9's fallback.** The target read's `??` turned a `null` into `undefined`, and four
  existing cases went red (M10). The fix was to take the fallback on `undefined` only. The same
  `??` in the visitor was the separate defect A52.
- **Revision 3, M11.** D10 also flipped a row the request did not name: group B's `n.x = 1` under
  `caseInsensitive`, a control until then. That raised step 2's flips to 28. Separately, group N's
  held `x === null` became a flip, so the held cases fell from 19 to 18. `n.x = 1` is a row about a
  write that moved through a read, since `n` now reads as `null`. A change to a read moves every row
  that reads, whatever the row is about.
- **Revision 4, D11.** Walking an identifier target was also what refused `this` written as a name.
  Removing the walk in steps 2 and 3 would have dropped that refusal. Step 2's confirmation gate
  found it, not the prototype, which predates it. So group T's marks are witnessed by step probes, a
  stated exception to rule 10. **A mechanism you remove also removes what it did incidentally.** List
  that, as rule 12 lists what a borrowed shape does not do.
- **Step 1's counts and values.** Group A has 11 rows and § 1.4 names 10. Group F has 8, and M1b
  lists 9 expressions. M1b's JavaScript column gave `obj.fetch &&= 1` as "reads", but a function is
  truthy, so JavaScript writes. Two recorded values were wrong too. B's `__proto__++` under
  `caseInsensitive` does change the copy, which gains a `__proto__` map key. Group S's rows reported
  a later `ns.k`, a field they are not about, and probe (iii) found that one. **A value written by
  hand for a spec is a prediction.** Running it is what checks it: against today's evaluator, and in
  its native arm against JavaScript.
- **Step 2's probe (i): 25 red, not 28.** The prediction came from the marks: every case marked `2`.
  The probe restored the walk, and three of those cases are decided by D10's fallback, not by the
  walk. That leg named a red case the wrong implementation could not produce, so it was corrected,
  not amended, and probes (vi) and (vii) witness the three. **Predict a probe's red set from what
  the probe changes, not from which step owns the rows.**
- **Step 2's group V.** Probe (ii) dropped the funnel's whole call, and only function cases went
  red. So the `EvalContext` test inside the call had no witness. A narrowing to the function test
  would have stayed green. **A probe that removes a whole call cannot show which test inside it is
  load-bearing.** Probe each test alone.
- **Step 5's claim → witness table** reworded two README sentences before the table was finished.
  "`+=` reads it once" was false for the held rows. "`this.g = 1` calls its getter once" was true
  case-sensitive only. Writing a document's witness table is a measurement of the document.

### 10.3 Process traps

- **`git restore` on a directory took the tracked spec with it.** Step 1 reverted the prototype with
  `git restore modules/eval-core/src`. That was safe while the spec was untracked. From the addendum
  on, the spec was tracked under `src/`, and one run lost its uncommitted rows that way. They were
  re-applied before the measurement. Later steps reverted a patch with `git apply -R` and a probe edit
  with the Edit tool. **A revert scoped by directory reverts every tracked file in it**, the work in
  progress included.
- **The prototype was pinned as hashed patches, outside the repository.** `stage-2.patch` and
  `full.patch`, with their SHA-256s in step 1's criterion 2, were checked before each `git apply`
  and never rebuilt from § 3. So step 1's probes ran the code verified on 2026-10-23 against the
  recorded prototype columns (§ 1.3), and a mismatch would have stopped the step rather than quietly
  changing the probe. M4's own prototype, of D1–D4 only, was throwaway; the patches were rebuilt
  from § 3 with D7–D10. M6's timing harness is the
  contrast. It was throwaway and did not survive, so step 4 rebuilt it from the recorded method. Its
  absolute µs are therefore not comparable with M6's, only its paired deltas. **Pin, by hash, what a
  later step must re-run.**
