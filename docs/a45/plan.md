# A45 part 2 and A44 — assignment targets as JavaScript evaluates them (`@zvenigora/ng-eval-core`)

**Date**: October 23, 2026
**Revision**: 4 — D11, found at step 2's confirmation gate and measured first (M12). Up to 0.13.3 an
assignment target was walked, so the identifier visitor refused `this` written as a name: a
host-built `Identifier` named `this`, and under `caseInsensitive` any spelling of it, `This += 1`
included. § 3.2's target read had no such test, so step 2 would have dropped that refusal for
compound targets and step 3 for `=`, while an update already writes, `This++` under
`caseInsensitive`. D11 keeps the refusal on every identifier target path: the target read in step 2,
the `=` resolver and the identifier update in step 3. The characterisation spec gains group T, 8 rows
and 16 cases, pinned today. Its marks are witnessed by steps 2 and 3's probes, not by the pinned
prototype, which predates D11: a stated exception to § 0 rule 10 (step 1's addendum). Rows: 100,
cases 200. `eval-core` is at 3080 from this revision through step 2, and reaches 3116 at step 3.
**Revision**: 3 — the request's third instruction, measured first (M11). D10 brings
[A52](../backlog.md#a52) into step 2. Under `caseInsensitive` the identifier visitor's own read takes
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
[A52](../backlog.md#a52). q8 is folded into A48. Rows: 92, cases 184. `eval-core` reaches 3064 at
step 1 and 3100 at step 3.
**Revision**: 1 — initial plan.
**Target package**: `@zvenigora/ng-eval-core`, released as **0.14.0**, a minor that carries breaking
changes (D5; the precedent is 0.8.0). `eval-signals` 0.6.x and `eval-forms` 0.6.x declare
`>=0.13.0 <0.14.0`, so both release to admit it. M5 measured that `eval-signals` observes D2, so
whether each release is a patch or a minor is § 8 q7, decided at step 6's gate.
**Also touches**: no downstream code through step 5. `eval-signals` and `eval-forms` run as the
downstream witnesses with their counts unchanged (M4).
**Fixes**:
- [A45](../backlog.md#a45) part 2, in steps 2 and 3;
- [A44](../backlog.md#a44), in step 3;
- an identifier update's missing blocklist checks and read event, D8 and D9, in step 3. Neither has a
  register entry: Revision 1 recorded them as § 8 q5 and q1;
- [A52](../backlog.md#a52), in step 2 (D10, Revision 3);
- the `this` refusal on every identifier target (D11, Revision 4). An identifier update of `this`
  written as a name writes it as a key today, and is refused from step 3. No compound or `=` target
  loses the refusal in steps 2 and 3. It has no register entry: step 2's confirmation gate found it.

**Opens**: [A48](../backlog.md#a48)–[A52](../backlog.md#a52) (Revision 2), for defects the plan
measured and does not fix. The characterisation spec holds their rows.
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
  stated here in advance.
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
plan keeps its rules in § 6.1. This section collects them, each with its origin, and adds the three
that this plan's own measurements produced. Every step applies all of them; § 4's criteria cite them
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
    [A52](../backlog.md#a52). *Revision 3*: D10 fixes it in step 2 (finding 17).
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

- **D10. [A52](../backlog.md#a52) joins, in step 2.** Under `caseInsensitive`, the identifier
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
`get` finds `undefined`, where the identifier visitor takes it on `null` too ([A52](../backlog.md#a52)).
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
| 2 | Compound and logical targets in update's shape, with the funnel's check | `assignment-expression.ts`, `identifier.ts`, `visitor-result.ts`, the spec's step-2 rows, `CHANGELOG.md` | 0 / 0 / 0 (rows rewritten 1:1) | `eval-core` 0.14.0 |
| 3 | The `=` resolver; A44 in both visitors; the identifier update's checks and read (D8, D9) | `assignment-expression.ts`, `member-expression.ts`, `update-expression.ts`, `identifier.ts`, the spec's step-3 rows, `update-expression.spec.ts`, `CHANGELOG.md` | **+36** / 0 / 0 | `eval-core` 0.14.0 |
| 4 | Timing against the rule in § 3.8 | this document only | 0 / 0 / 0 | no package |
| 5 | `SECURITY.md`, README, CHANGELOG; A45, A44 and A52 retired | `SECURITY.md`, `modules/eval-core/README.md`, `CHANGELOG.md`, the register, link targets | 0 / 0 / 0, or the allowlist's entries | `eval-core` 0.14.0 (README); the rest no package |
| 6 | Release commit | three `package.json`, three `CHANGELOG.md`, each README's peer line | 0 / 0 / 0 | the releases |
| 7 | Post-publish commit | the register, `CLAUDE.md`, `docs/README.md`, CHANGELOG dates, this document | 0 / 0 / 0 | — |

From 2880, `eval-core` is at 3064 once step 1 commits, at 3080 once Revision 4's addendum does, still
3080 after step 2, and at 3116 once step 3 commits. `eval-signals` and `eval-forms` stay at 443 and 380
(M4, M10). *Revision 2*: they were 3044 and 3080 at Revision 1. *Revision 4*: 3064 and 3100 at
Revision 3.

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
    reads as `null` ([A52](../backlog.md#a52)).
  - This document; the skill's state.
- **Exit criteria**:
  1. The gate is green at 3080 / 443 / 380 (*Revision 4*; 3064 at Revision 3). Every step-2 case now
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
  1. The gate is green at 3116 / 443 / 380 (*Revision 4*; 3100 at Revision 3). Every step-3 case
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
- **Category**: the README line ships in `eval-core`'s next release; the rest ships in no package.

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

### Step 7 — Post-publish commit

- **Edit**:
  - the register's Publication status rows and A45's and A44's status lines, with the tags;
  - `CLAUDE.md`'s versions and active-plan lines;
  - `docs/README.md`, moving this plan to "Completed tracks";
  - the skill, back to "none active";
  - this document's last revision and the track's retrospect.
- **Exit criteria**: release-tags is green with the new rows, and doc-links is green.
- **Category**: ships in no package.

---

## 5. Public API surface

None changes. `evaluateMember`, `resolveMemberTarget`, the exported identifier helpers and the
funnel's function are all under `internal/visitors`, which `src/public-api.ts` does not re-export. The
release is breaking by behaviour (§ 3.1, M2, M5), not by shape.

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | +184 in step 1, +16 in Revision 4's addendum, +36 in step 3, 0 otherwise: 3064, 3080, 3080 after step 2, 3116 from step 3 (Revision 4; +164 at Revision 1) |
| `eval-signals` / `eval-forms` tests | (in the above) | 443 / 380 in every step |
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
| The fifth slot or the factored funnel slows the read or push path | Low: +0.12% measured on the read (M6) | Step 4's rule; `performance.spec.ts` |
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
their decisions belong to their entries. *Revision 3* decided q9 as D10 and removed it.

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
