# A35 — dangerous function values past the call sandbox (`@zvenigora/ng-eval-core`)

**Date**: October 14, 2026
**Status**: **complete** — steps 1–11 and U3; the advisory is
[GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx)
(§ 5). A design record from here on.
**Revision**: 16 — **step 9 re-scoped**, in the same commit as the rest of step 9. The step closes
[A42](../backlog-retired.md#a42) rather than recording it, because A39's closure claim turned out to
depend on it.

**The correction reversed a conclusion this document had already given, and it came from two
places**: the code review of step 9's first run, and a probe run afterwards to check the review
rather than take its word. Revision 15 states that A42 "is contamination, not an escape … not a
route to a dangerous value **or to the context itself**". The first half holds. **The second half is
false**, and the measurement is in [A42](../backlog-retired.md#a42):

- The guarded view was never the only caller of a context method. The **evaluator itself** calls
  `st.context.push(...)` at four visitor sites, and resolution and writing call six more methods.
  A planted **function** shadowing one of those names was invoked there, with the real
  `EvalContext` as its `this` — measured at two invocations for one arrow call.
- A context captured that way stayed contained within the context it came from, but read under a
  **second** context the member visitor's identity branch no longer applies, the generic branch
  does, and `_original` is an ordinary property. A planted secret was retrieved across contexts.
- A39's retirement is sound regardless, and that was checked separately rather than assumed: no
  **listed** value can be planted, because the funnel refuses it at the read, over `push` and
  `pop` alike. The retirement was withdrawn while this was open and restored once items 4–6 of the
  re-scope were green.
- A42 also has an **availability** half that the first characterisation missed: an arrow planted
  over `push` recurses until the stack is gone and persists, so every later evaluation on a reused
  context throws. Both downstream libraries reuse one context by design, and both are named in the
  entry; neither is exposed, because a signal context refuses the planting write.

**Three layers, and each was probed to turn something red the others do not cover** (§ 9's outcome
has the matrix). **The second code review rewrote which of them is load-bearing**, and the
correction is recorded here rather than quietly applied:
- **An `EvalContext` is not a value an expression may hold** — refused at the **value funnel**,
  `pushVisitorResult`, so it covers every value the walk pushes. The first shape of this sat on
  the member read alone and was measured round four ways: object spread and destructuring, which
  need nothing from the host, and `Object.values` and `JSON.stringify`, which need one native the
  host supplied. Each disclosed the caller's object in full, and the spread copy also handed out
  the live scope `Stack`, poisoning every later evaluation on a reused context.
- **The write is refused, by class**, at `safeSetProperty` and at the native-writer boundary.
- **The methods the evaluator invokes are taken from the context's class**, kept at the scope
  pushes and pops, the write path and the policy.

**The native-writer refusal is coverage, not depth, and the final pass corrected that too.** An
earlier reading had it unreachable, since handing a context to `Object.assign` means holding one.
It is reachable through the L11 residual: measured, `Object.freeze`, `Object.assign`,
`Object.setPrototypeOf` and `Reflect.set` all arrive with the real context there, and this is what
refuses them (L2d). What remains true is that **hop-following can never be complete** — any
native function that calls another with arguments of its own is a hop, and the list grows with
the language — so the set is a second line, not a boundary. The by-class refusal in
`member-expression.ts` was the one genuine case of depth, and it was removed rather than kept
(M20).

**And the funnel itself is not complete, which is stated rather than implied.** It reads the value
a node pushes: it does not look inside one, and it does not run on `evaluateAsync`'s promise
unwrap, which happens after the walk. A host function returning its own context nested in an
object, or a promise of it, hands it back — both measured. Neither is constructible by an
expression, since both begin by holding a context.

**The hinge, measured: a captured context does not reach code execution.** Eighteen routes from a
capture, five across two contexts, one through a planted `get`. Every listed function was refused
— at the read by the step-4 funnel, at the call by the sandbox — and every `constructor` and
`__proto__` route by the pollution guard. A capture yielded disclosure of the host's own object
and the integrity and availability damage, not execution.

**The measurement decided where the second layer is kept** (M19). Resolving *every* site off the
class — which is what the re-scope first asked for — cost **+13.7 to +18.4% on the bare-call path
and +19.4 to +26.0% on the member-read path**, against a step-7 spread of ±7%: over the ~10% line
this plan holds changes to. Three shapes were measured and none of them was the cost:
- **A per-prototype cache is rejected on correctness, not on speed.** One entry per class reads
  cheaply, but it freezes a class's methods at the first evaluation of the process. It turned
  `performance.spec.ts`'s read-emission guard red — that case spies on `EvalContext.prototype.getKey`,
  and the spy was installed after the entry had been taken — and the mirror image is worse: a spy
  installed *before* an entry is taken is cached and **outlives its own test**. It also measured no
  faster than resolving each time.
- **Fixed-arity `.call` against a shared `apply` over an argument array**: within noise. The first
  write-up of this module named the array as the cost before measuring it; that was wrong.
- **What costs is the call site itself.** Replacing a monomorphic `context.get(k)` with a call
  through a value cannot be inlined, and no resolution strategy changes that.

So the read path reads the instance, as it always did, and is defended by the write refusal
instead. Measured on the shipping bundle: **bare call −0.6% to +1.3%, member write +0.3% to +3.9%,
member read +0.3% to +11.9% across six rotations (median +8.3%)**, all inside the line. Layer 2 was
measured as *not* the member-read cost: removing it moved nothing outside noise.

**The write boundary was enumerated by probe, not by reading the code**, and the probe found a
bypass of the first draft: `safeSetProperty` covers every form the evaluator offers, but a **native**
writer the expression merely calls — `Object.assign`, `Object.defineProperty`, `Object.setPrototypeOf`,
`Object.freeze`, `Reflect.set`, `Reflect.defineProperty`, and each through `call`, `apply` or `bind` —
wrote straight into the context. `setPrototypeOf` replaced the class itself. The same refusal now
answers at that boundary, **after** a context's own policy is asked, so a policy's refusal is still
the error that surfaces — the order the member-write path already had. The full table is § 9's
outcome.

**One existing case changed, and it is strengthened**: `eval.service.context-receiver.spec.ts`'s N5
planted through the expression `(this.push = give, hand())`, which the write refusal now refuses.
Its assertion is unchanged; its setup installs the own property from host code, so it tests the
layer it is about rather than testing the write refusal twice. The refusal itself is pinned by W1.

**Revision**: 15 — **step 9**, in its own commit, with N-d and four scope extensions the maintainer
asked for. A39 and A35 retire as fixed and not yet released; both routes through `this` become
protections in `SECURITY.md`, and a host container stays a limit.

**N-d found a regression, and its fix changed the design** (M18; the numbers in step 9's outcome):
- **Step 8's per-context cache made a bare call 41–56% slower** at the median, on the ordinary
  one-shot path — `simpleEval(expr, plainObject)` builds a fresh `EvalContext` every evaluation, so
  the cache never hit. With a reused context it cost +1–2%, so the cost was per context, not per call.
- **Cheaper construction did not help.** Three variants (a closure for the `Map`, no `bind`, no
  Proxy at all) stayed at +37–59%. Measured piece by piece, an uncached Proxy costs ~25 ns and any
  cached non-trivial view 400–1,100 ns; a reference cycle and closures were each tested and refuted
  as the sole cause, and the exact mechanism is not pinned.
- **The view is now built per call and retained by nothing**: −2.3% to +8.5% against step 7 on a
  fresh context, ~+4.5% on a reused one. The cost is **N4's old contract**, a `this` stable across
  calls and walks. N4 now pins the opposite, and the CHANGELOG says not to key anything on a
  function's `this`. The security contract — R1–R4, B1–B3, S2–S5, N1–N3 — is unchanged.
- **The member-read signal is not real.** A dedicated run, five rotations in each mode, put every
  delta inside step 7's own spread. The fourth tuple slot `evaluateMember` carries costs nothing
  measurable.

**Restored** (Revision 13 had narrowed each while R4 reached): § 9 item 6, U3 and its hold in § 5,
Revision 11's claim and its U3 note, the Objective, and step 9's own scope. **Cleared**: q7's C2
inventory. The published 0.12.1 CHANGELOG section keeps its wording; only its link targets moved.

**`performance.spec.ts` gains two structural cases** on the two paths N-d measured, each probed both
ways. Timed thresholds were not used: finding 7 measured Jest timing varying sixfold, so a threshold
loose enough not to flake would have let a 45% regression through.

**The step's code review found one Critical, C1, fixed before the step closed.** The view took
`push` and `pop` off the context *instance*, and an own property shadows a class method. An
expression can create one — that is [A42](../backlog-retired.md#a42), opened by the same review — so a host
function that returns what its `this.push(...)` returns could have handed the real context back into
the walk, past both halves of the fix. **The view now resolves both methods from the context's
class**, walking the prototype chain and skipping own properties, and refuses the key by the usual
message when the class provides no such method. Two probes decided the shape:
- **The plant cannot reach the prototype.** Every shape by which an expression might — `__proto__`,
  `constructor`, `constructor.prototype`, dotted or computed, on `this` or through the view — is
  refused by `prototype-pollution-guard.ts`, with the prototype unchanged after each. So the chain
  holds what the class put there, and *when* the walk runs does not matter.
- **A subclass override must stay reachable**, and does: the walk starts at the instance's immediate
  prototype and finds an override first. A module-level capture of `EvalContext.prototype.push`
  would have skipped it silently, and `@zvenigora/ng-eval-signals` subclasses `EvalContext`.

  Because the first probe holds, the walk is **deferred into the `get` trap** rather than run at
  construction: resolving eagerly cost every bare call two chain walks and two descriptor reads,
  ~15% on the one-shot path, over the line this change is held to, while most functions never read
  their `this`. Deferring is equally safe precisely because the expression cannot change what the
  walk will find.

**A42 is contamination, not an escape**, and that was measured rather than assumed: with C1 fixed, a
planted value cannot be read back by any route, a dangerous value is refused at the read before the
write is reached, and the view ignores a plant over either method. It is unscheduled, after 0.13.0.

> **Corrected by Revision 16.** The last paragraph is wrong in one half: the view was not the only
> caller of a context method, the evaluator called a plant itself, and a context captured that way
> disclosed the caller's object when read under a second context. A42 is fixed in this same step,
> and the measurement is in [its entry](../backlog-retired.md#a42). "Not a route to a dangerous
> value" stands; "or to the context itself" does not.

**One clause is deferred to step 11** (§ 2): `SECURITY.md`'s new subsection keeps to what the
CHANGELOG already says on the default branch about what 0.12.1 did, and the fuller account of the
route waits for the advisory, after 0.13.0 is published.

**Revision**: 14 — **§ 8 q7 decided (a), and step 8 completed under it**, in step 8's own commit.
The receiver's origin is carried out of `evaluateMember` in its fourth slot, so the guard covers
all four receivers and not the three an identity test at the call could see. M17 is the
measurement the decision rests on, taken before it.

Six things this revision settles, each measured rather than argued:
- **(a) is chosen.** Its cost is two functional assertions, both in one file, both about the
  semantics the change is about: a method held directly on the context, called as `this.fn()`,
  reaching its siblings through its own `this`. They are rewritten to name the refusal, and the
  documented migration — a named scope with an explicit `thisArg` — is pinned beside them.
- **A non-allowlisted read throws a named error**, rather than answering undefined. Measured
  across all three suites: no pre-existing case anywhere turned red, so the louder failure costs
  nothing the quiet one would have saved. **W4 resolves with it**: a write throws too, from the
  frozen target, and the CHANGELOG states both.
- **Step 8's file list gains** `member-expression.ts` (the origin carry) and
  `eval.service.sync.core.spec.ts` (the two functional cases and the migration).
- **W1, W2 and W3 are fixed.** Each receiver has a structural pin that fails when the context is
  reached rather than when a later read of nothing throws (B1–B3 and S2–S4); no case reads an own
  field by position, so none can go green on a field reordering; and N4 pins the cache's identity
  contract. The R cases now fail with the view's own named refusal, which is why their green side
  is no longer uninformative.
- **The counts**: `eval-core` 2528 → **2546**, `eval-signals` 438 and `eval-forms` 375 unchanged.
  (2544 at the first gate; the second code review added S5 and `scope-this` (f).)
- **The closure claims stay narrowed.** Step 9 restores them, after this gate passes — not here.

**Revision**: 13 — **step 8 stopped at R4**, in its own commit. Nothing is built by this revision;
step 8's code is held uncommitted in the working tree, and the step did not close.

**What stopped it.** Step 8's confirmation gate added R4 — `this.fn()` for a key the **original**
holds — and fixed the rule in advance: refuses, and it is covered by a behaviour case; reaches, and
the step stops and reports, rather than filing it as a limit on reasoning. **R4 reaches** (M16).
- **It is pre-existing, not a regression.** R4 reaches on step 7's commit as well as on step 8's
  working tree. Its control, the same read without the receiver, is refused by the funnel on both.
- **The guard cannot reach it by design.** `EvalContext.getThis` answers a key the original holds
  with the original — the host's own context object, which is not an `EvalContext`. The receiver
  `callMember` resolves is therefore that object, and `guardedReceiver` is keyed on the context, so
  no identity test at the call can see it.
- **The asymmetry is the finding.** For one and the same key, a bare call's receiver is now guarded
  and `this.fn()`'s is not, so the route survives in a shorter form than the one step 8 closes. A
  guard that closes three receivers and leaves a fourth reachable for the same key is not a partial
  fix of the same size as its gap.

**What step 8 did build, and what it measures as sound.** Held uncommitted, reported, not committed:
- R1, R2 and R3 are refused, and B1, B2 and B3 — the prototype, the own keys and a property
  descriptor, the three ways out that are not a property read — each yield nothing.
- **Probe (i)**, the guard removed at the three call sites: 9 red (R1–R4, B1–B3, and the two cases
  that pin what the view exposes). The two `eval-core` identity pins go green, which is what shows
  they are exactly the assertions the guard changes.
- **Probe (ii)**, `push`/`pop` dropped from the allowlist: `eval-signals`' two scope-depth-restore
  (criterion 10) cases go red — the documented `this.push(...)` — so the allowlist is load-bearing.
- **Probe (iii)**, the real context as the proxy target with only `get` trapped: B1, B2 and B3 go
  red. The frozen null-prototype stand-in is load-bearing, and the gate's choice of it is confirmed
  by measurement rather than by argument.
- The built `.d.ts` is byte-identical to 0.12.1's tarball, and the step's code review found no route
  by which the view yields the context or anything it holds.

**§ 8 q7 is the open scope question**, and it is the maintainer's: (a) carry the receiver's origin
out of `evaluateMember` so the guard covers `this.fn()` too; (b) close no receiver form and keep the
whole receiver route a documented limit; (c) ship the guard with the asymmetry. **(c) is rejected by
the maintainer** and is recorded only as the option that was weighed. Costs are in q7.

**C2 — nothing may claim the route is closed while q7 is open.** Four sentences said or implied it,
and this revision narrows them: § 9 item 6, step 9's scope, U3 in § 5, and
`modules/eval-core/CHANGELOG.md`'s `[Unreleased]` › Breaking line. **The advisory does not publish
with 0.13.0 as the patched version until q7 resolves** (§ 5, U3). Four more sentences outside this
revision's scope are inventoried in q7 and owed before step 10: two in `SECURITY.md`, one in the
published 0.12.1 CHANGELOG section, and one code comment in `dangerous-values.ts`. Each is a
forward-looking promise about 0.13.0 rather than a false statement about a shipped version, which is
why none of them is an emergency — and why none may stand when 0.13.0 ships.

**W4 — a second breaking change, found by the step's code review and measured through the real
service.** The view does not trap `set`, so a write through the receiver reaches a frozen target: in
a strict-mode source function, which a compiled consumer's is, it **throws** where up to 0.12.1 it
landed on the `EvalContext`. A built-in mutator called bare throws for the same reason. The step's
gate fixed whether `has` and `set` are trapped, but every contract sentence describes read
narrowing only. **The decision is open** — trap `set` and drop the write silently, or keep the
throw — and either way the breaking entry owes a line. It is recorded in q7 because it belongs to
whichever scope option wins.

**W1, W2 and W3 — defects in step 8's spec, to be fixed under whichever option wins.**
- **W1**: R2 and R3 carry one bare `toThrow()` each and no structural pin, so a reopened receiver
  would likely still throw somewhere and the case would stay green.
- **W2**: with the guard in place the R cases pass because a downstream read of nothing throws, not
  because anything was refused, and R1 additionally depends on the context's field order. Probe (i)
  shows they are load-bearing today; they are not load-bearing against a later change.
- **W3**: the per-context cache's identity contract is stated in a comment and pinned by nothing.

**Structural pins in the B style are required for each receiver**, whichever option wins: a case
that fails because the context was reached, not because a later read of nothing threw.

`.claude/skills/step/SKILL.md` is **not** retargeted by this revision; it is retargeted with the
option the maintainer picks.

**Revision**: 12 — step 7, in its own commit. Its confirmation gate corrected one claim and fixed
five details:
- **The D5 rewrite.** Revision 11 said the structural "only lookup" assertion already lived at the
  `createFieldContext` level, in `modules/eval-forms/src/lib/field-context.spec.ts`. It does not,
  and it cannot. `createFieldContext` keeps two lookups by design. The single lookup is made by the
  trim in `bindFieldProperties` (`/reactive`) and in `createRuleContext` (`/signals`).
  - D5 was a performance fix, and its dead lookups never answered. So no behavioural assertion can
    see them come back. At `/reactive` the pin was the only case that did.
  - So the three pins keep their `lookups` assertion and take the context where it is built, by a
    spy on its defining module confined to the case. Each rule's expression becomes a plain
    comparison.
  - The spy is not a `jest.mock`, which hoists to file scope.
    `field-schema.teardown-throw.spec.ts` records why that stays out of `field-schema.spec.ts`.
- **The message**: `Access to "this" outside a member access is blocked for security reasons`.
- **`typeof this` is refused**, and pinned. Exempting it needs a mark in `unary-expression.ts` or an
  export from `dangerous-values.ts`, and neither is on the step's list.
- **An identifier named `this`.** acorn parses `this` as a `ThisExpression`, so only a host-built
  AST reaches the case-sensitive identifier visitor's `this`. It is refused there too, and pinned.
- **The spec** is `eval.service.this-position.spec.ts`, with 16 cases: P1, P2, G1, E1–E8, H1 and
  O1–O4. `eval-core` goes from 2509 to 2525. *Raised to 19 at a second gate*, after the code
  review: E9, O5 and H2 (below), and `eval-core` goes to 2528.
- **The CHANGELOG's Breaking line** states the rule, with `typeof this` among the refusals, and the
  three `eval-forms` assertions it changes.

The step's code review found nothing Critical. It corrected two things before the commit:
- **The mark under `caseInsensitive`** takes every identifier object, with no name test (step 7's
  file list, *Corrected by Revision 12*). A name test cost a locale comparison per member access.
- **The `/signals` pins** also assert that the rule's walk runs against the context they inspect.

A second gate decided the review's other two findings, and raised the count from 16 to 19:
- **Under `preserveParens`**, the mark strips the object's parentheses first, as the write
  visitors strip a target's ([A2](../backlog-retired.md#a2)). So `(this).k` is kept (O5), and a
  parenthesised sequence ending in `this` is still refused as a member's object (E9).
- **H2**: a host-built member whose object is an identifier named `this` resolves. It pins the
  case-sensitive arm of the mark, which no case reached.

`.claude/skills/step/SKILL.md` follows the D5 correction.

**Revision**: 11 — decision A, in its own commit, before step 7 is built. **A39 is closed
completely in 0.13.0 — the value route *and* the receiver — not left as a limit.** *Revision 13
withdrew this claim when R4 reached past the guard as designed; Revision 15 restores it, now that
§ 8 q7's option (a) closes all four receivers (R1–R4) and step 9's gate has passed.* Revision 10's
step 7 carried a hard receiver gate (§ 4, step 7, criterion 4); it was measured through the real
service and **all three receivers reached** (R1, R2, R3), so positional `this` alone does not close
A39. The receiver a bare call, a bare tag and `this.fn()` (for a lookup-resolved key) passes is
`st.context` itself, and a native `this`-using method reached off a literal returns it as data, past
both the funnel and the value-route refusal. Measured by ID, three prototypes:
- **inert receiver** (frozen null-proto object): P1/P2/G1/R1/R2/R3 all refuse, but it breaks
  `eval-signals` *functionally* — a source function's `this.push(...)` (the async stranding fixture)
  throws, so the signal stops reading its source.
- **guarded receiver** (a view that forwards `push`/`pop` to the real context and exposes nothing
  else of it — no field, no accessor, no prototype path back to it): P1/P2/G1/R1/R2/R3 and three
  proto/`Reflect` bypasses all refuse, zero residual, and `eval-signals`' functional behaviour is
  **preserved** — the only failures left are identity pins. So A is clean and is chosen.

Seven things change:
- **The receiver `this` is consumer-observable**, with evidence: `eval-signals`' README (the
  "resolution" bullet on `EvalContext.push`/`pop`) documents to consumers that a source function can
  push a scope onto the context through its `this`. Narrowing that `this` is a breaking change, so
  **`eval-signals` ships 0.6.0**, and **`eval-forms` 0.6.0** (it must raise its `eval-signals` floor
  to the first version that admits `eval-core` 0.13.0, as 0.5.0 did).
- **Step 7 splits in two, both in 0.13.0**: step 7 is the value route (positional `this`, probes
  P1/P2/G1), step 8 is the receiver guard (probes R1/R2/R3 and the bypasses B1/B2/B3).
- **The guarded receiver is a real module**, `context-receiver.ts`, with its own probes. The
  positional-`this` mark and refusal are `this-position.ts` (step 7).
- **The write policy keeps the real context** as its write target; only the function's `this`
  becomes the view. Confirmed: tag T9 and `member-write-policy.methods.spec.ts` pass unchanged; the
  four function-`this` identity pins (`eval-core` `scope-this` (e) and tag T6; `eval-signals`
  `signal-context` ×2) are rewritten to assert the guard contract positively — strengthened, not
  weakened.
- **The release folds into one commit** (step 10): `@nx/dependency-checks` fails `lint` the moment
  `eval-core` reads 0.13.0 while a downstream peer still says `<0.13.0`, so all three bumps and every
  peer change land together (as 3466c80 did). Step 11 is the post-publish commit.
- **The dead `evaluateCall` is deleted** in step 8 (no caller, no spec reference, not in the
  published surface), removing a latent receiver site.
- **U3 covers the receiver route**, patched 0.13.0, and its CVSS impact is corrected to code
  execution (§ 5). **§ 8 q6** records this decision, § 9 item 6 covers both routes, Phase 10 resumes
  after step 11, and `.claude/skills/step/SKILL.md` is retargeted to steps 7–11. *Revision 13
  withdrew "patched 0.13.0" for the receiver while R4 reached; Revision 15 restores it, since
  0.13.0 patches every receiver form.*

**Revision**: 10 — § 8 q4 decided, in its own commit, before step 7. **`this` is allowed by
position, and refused anywhere else**: as the object of a member read it keeps resolving against the
context, and wherever else it is evaluated it throws. M15 measured every candidate first. Four
things change:
- **M15 joins § 1.3.** It covers:
  - the reliance inventory;
  - five values for `this`, each with `this.k` kept and not kept, against all three suites;
  - A39's probes on two bundles, by ID only.
- **§ 8 q4 is decided**, with the measurement behind it.
- **Step 7 is specified**:
  - its files, including two `eval-forms` spec files as test-only edits;
  - the three `eval-forms` assertions it changes, as breaking;
  - its counts;
  - a hard gate on three receivers that M15 did not measure.
- **`.claude/skills/step/SKILL.md`** gives step 7's scope and its two exceptions: the downstream
  spec files, and the receiver gate's stop.

**Revision**: 9 — step 6, in its post-publish commit. `eval-core` 0.12.1 is published, tagged at
7cc8d30. The step changed two things:
- **The CHANGELOG section opens with a summary paragraph**, settled at the confirmation gate. Its
  first sentence states partial hardening that does not close every route, and points to
  `SECURITY.md`'s mitigations.
- **Step 6 lists the post-publish commit's files**, which its text did not name.

**Revision**: 8 — step 5, in its own commit. Its confirmation gate changed three things:
- **The protections are framed as defense in depth.** K1 and the funnel narrow the routes and are
  not a boundary, and each links to the limits. The route through `this` and a host container also
  sit beside the protections, in "What these checks do not cover", not only under "Documented
  limits".
- **The mitigations lead**, and their first line is "the context is trusted — place no listed
  function in it".
- **Node's --disallow-code-generation-from-strings flag joins the mitigations**, stated only as far
  as it was measured on this step's bundle.

The gate also asked that the source-text limit be stated with a fresh measurement, and added a check:
nothing `SECURITY.md` marks as refused is in fact let through (step 5's outcome).

The step made one correction of its own. A35's and A39's *Recorded* lines in `docs/backlog.md` named
`SECURITY.md`'s limits only, and now name where step 5 puts each.

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

The review found a route the funnel cannot see, **through `this`** (finding 8, M14): evaluating
`this` lets native code reach a listed function the context holds, without any value passing through
the walk's stack for the funnel to check. Its mechanism and probes are held in the repository's
draft security advisory, not on the default branch (§ 2's disclosure rule).

That route is [A39](../backlog-retired.md#a39), opened as Open, security. Closing it changes what `this`
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
- **The postfix update's write before the refusal** is [A40](../backlog-retired.md#a40). This plan does not
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

As of 0.12.1 both downstream peer ranges admitted it: `eval-signals`' `>=0.11.0 <0.13.0` and
`eval-forms`' `>=0.12.0 <0.13.0`, neither of which admits 0.13.0 — which is what forced the
combined release. **Step 10 moves both to the 0.13 line** (`>=0.13.0 <0.14.0` in each, and
`eval-forms`' `eval-signals` peer to `>=0.6.0 <0.7.0`), so after it no downstream range admits a
pre-0.13 `eval-core` at all: the floors rose rather than only the ceilings (step 10's entry, the
reversal).
**Also touches**: no downstream code through step 9. `eval-signals` and `eval-forms` run as the
downstream witnesses. Their suites change only by the four function-`this` identity pins step 8
rewrites (two in `eval-signals`, test-only; none in `eval-forms`) and the three value-route D5 pins
step 7 rewrites in `eval-forms` (test-only); their counts are unchanged. For 0.13.0 to reach them,
**`eval-signals` ships 0.6.0 and `eval-forms` 0.6.0** — a breaking receiver contract in the first,
a forced floor raise in the second (Revision 11) — folded into step 10's single release commit.
**Fixes**:
- [A36](../backlog-retired.md#a36) in step 1;
- [A35](../backlog-retired.md#a35) in steps 2 and 4, and its route through `this` and the receiver,
  [A39](../backlog-retired.md#a39), in steps 7 (value route) and 8 (receiver guard);
- [A37](../backlog-retired.md#a37) in step 3.

**Pauses**: Phase 10 after its step 2 ([plan](../documentation/phase-10-plan.md)). This plan runs to
its end before Phase 10 resumes at its step 3: steps 7–11 run consecutively after step 6, so 0.13.0
closes A39 — the value route and the receiver — without Phase 10 in between (Revision 7, Revision 11,
§ 2). Phase 10 resumes at its step 3 after step 11.
**Source**: the requests of 2026-10-14. Phase 10 step 2's review found the class, which was then
measured route by route. The decisions in § 2 were fixed before this plan was committed.
**Objective**: an expression cannot call a dangerous function value that the context holds or that
is reachable from it, whatever name it uses. Nor can it hand one to native code through the walk's
own values: an argument, a receiver, an element, a branch or a result. *Narrowed by Revision 6*:
- **Two routes reach native code without passing through the walk's values**, and are stated
  limits: a container the host provides (finding 3), and `this` (finding 8).
- **Steps 7 and 8 close A39** (*Revision 11; restored by Revision 15*): step 7 the value route
  (positional `this`), step 8 the receiver — every receiver the evaluator resolves out of the
  context's own chain is handed a **guarded view**, never the context or the object behind it.
  That covers all four receivers, R4 included, because the receiver's origin is carried out of
  `evaluateMember` (§ 8 q7, option (a)). *Revision 13 had narrowed this when R4 reached past the
  first design.* A host container (finding 3) stays a limit.
- **Through step 4, every existing assertion holds.** Steps 7 and 8 change what `this` evaluates to
  and what receiver a call passes, so their gates decide which assertions change (§ 8 q4, q6).

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
- **The funnel sees only the walk's own values** (Revision 6). Step 4's review found that evaluating
  `this` lets native code reach a listed function the context holds, past the funnel (finding 8).
  - That route and a host container are stated limits.
  - Closing `this` is a breaking change: step 7, for 0.13.0.
  - **The receiver is a second half of the same route** (*Revision 11*): the context is also handed
    to native code as a call's, a tag's and `this.fn()`'s `this`, with no `this` expression at all.
    Step 8 replaces it with a guarded view. A host container (finding 3) stays a limit.
- Then `SECURITY.md` states the protections and the limits. The release shape decides whether
  0.12.1 ships before 0.13.0 (§ 2). A35 retires with A39, once `this` and the receiver are closed —
  which they are, and both retire in step 9 (*Revision 15*).

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
8. **`this` lets native code reach a listed function the context holds, past the funnel** (M14).
   *Added by Revision 6; cut to the disclosure limit by Revision 7.*
   - The funnel sees only what passes through the walk's own stack, and this route does not.
   - It needs no container from the host — the library supplies one — which is what makes it
     distinct from finding 3, where the host builds the container.
   - Its mechanism and the probes that reproduce it are held in the repository's draft security
     advisory, not on the default branch, under § 2's disclosure rule.

   It is [A39](../backlog-retired.md#a39), and step 7 closes it, in 0.13.0.

### 1.3 Measurements run for this plan

M1–M4, M6, M8, M9 and M10 ran against `dist/modules/eval-core`, or in Jest, with throwaway code. M5–M8
used throwaway prototypes of both shapes in the library: a shared check module, the callee marks,
and the gated checks. Everything was **reverted** and its files deleted before this plan's commit:
`git status` showed only the plan's files, and the library had no diff against `HEAD`. M12 and M13
used a throwaway funnel prototype, reverted the same way before step 4 began. M14 ran throwaway
scripts outside the repository against the built bundles. M15 used a throwaway prototype in the
library, switched per process. Two production bundles were built from it and copied outside the
repository, and A39's probes ran on those bundles with the maintainer's harness. The prototype was
reverted before Revision 10's commit, and the bundles and scripts were deleted.

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
| M14 | `this` handed to native code | Step 4's code review, on that step's bundle; the probes measured again with a throwaway script against step 3's bundle and step 4's | The route reaches a listed function past the funnel on both bundles, where each control without `this` is refused on step 4's. The probes and the mechanism are held in the draft advisory ([A39](../backlog-retired.md#a39)), under § 2's disclosure rule |
| M20 | The hop lookup, the member-object refusal, and the number that ships (Revision 16, final pass) | The N-d harness and rotation discipline, paired within rotations against step 7 (8bc8eda): the hop check as three lookups, as one, and removed, over ten rotations of the bare call; the member-object refusal present and removed, five rotations of the member read; the funnel present and removed, six rotations of the member read, after the bare-call attribution in M19 proved not to generalise; then twelve rotations of the shipping bundle on the bare call and the member write, six on the member read | **The hop cost was structural, not a deoptimisation**: an ordinary call asked three questions - a hop set, the built-in map, the `Reflect` set - and the common answer is "none". One `Map.get` over a combined table costs **+1.75%** by median (ten paired rotations: −0.2, 0.7, 1.1, 1.5, 1.7, 1.8, 2.6, 5.2, 8.4, 11.4), against +11.4% for the three-lookup form and +6.0% for the layer removed. **Kept**, and no longer depth: it is reachable through the L11 residual, where `Object.freeze`, `Object.assign`, `Object.setPrototypeOf` and `Reflect.set` each reach the real context and are each refused. **The member-object refusal is removed**: it turned no case red and cost ~2.5% of the member read by median, so it was overhead that read like protection. **The funnel is cheap on both paths**: +0.15% on the bare call, **+2.75%** on the member read, which is the push-heavy one and the measurement M19 had not made. **What ships**, medians over twelve paired rotations on the commit candidate: bare call **+7.6%** (0.6–15.1), member write **+10.0%** (5.1–16.8), member read **+1.85%** (six rotations, −4.7 to +5.3). **The member write is a real ~10%, not a measurement artefact**: it is positive in all twelve rotations, so although step 7's own spread on that path is 9.0% the effect does not hide inside it, and "inside spread" is the wrong way to describe it. The bare call is positive in twelve of twelve as well but half the size; only the member read is genuinely indistinguishable from the baseline (one rotation of six negative). So: **at the line on the write path, under it on the other two.** An earlier run of the same three paths, before the single lookup, the member-object removal and the hoist of the `pop` probe out of `contextPush`, read +13.6 / +11.6 / +12.4% on a noisier machine; the three changes and a quieter machine account for the difference, and both runs are recorded rather than the better one alone |
| M19 | What closing A42 costs, and where the second layer is kept (Revision 16) | Plain Node against production bundles, the N-d harness and rotation discipline: step 7's commit (8bc8eda) against four scratch variants and the shipping tree; three interleaved rotations each, 15 rounds of 60,000, min and median, paired within a rotation; six rotations for the member-read path, which sits nearest the line. A third path in one process voided the last path of every rotation on both bundles, so member-read was re-run on its own. Each layer then removed in turn and the suites re-run | **Routing every resolution off the class is over the line**: +13.7/+15.3/+18.4% bare call, +19.4/+22.7/+26.0% member read, against a step-7 spread of ±7%. **The per-prototype cache the re-scope asked for is rejected** — no faster, and it freezes a class's methods at the first evaluation: it turned `performance.spec.ts`'s read-emission guard red, and a spy installed before an entry is taken would outlive its test. Fixed-arity `.call` against `apply` over an array: within noise. **The cost is the call site** — a call through a value in place of a monomorphic `context.get(k)` — so no resolution strategy fixes it. Routing only the pushes, pops, writes and policy: −3.8/+8.5/+2.2% bare call, +8.9/+8.7/+3.2% member read. **Shipping bundle, with the write refusal**: bare call −0.6/+0.9/+1.3%, member write +0.3/+1.1/+3.9%, member read +7.2/+0.3/+11.9/+11.7/+5.4/+9.4% (median +8.3%, six rotations, every one positive). **Layer 2 is not the member-read cost**: with it removed the medians were 0.945/0.936/0.892 against the shipping bundle's 0.932/0.965/0.911 µs, inside noise |
| M18 | N-d: what the guard costs, and on which path (step 9) | Revision 15. Plain Node against production bundles of step 7's commit (8bc8eda), step 8's (d7ac92f) and five scratch variants; a cached AST, a fresh `EvalState` per evaluation; 15 rounds of 120,000 (member-read 20 of 200,000); min and median; one process per bundle per rotation, a rotation voided where step 7's own process shows interference. Then each piece of the guard in isolation, one process per piece. Every variant reverted; the full numbers are in step 9's outcome | **Bare call, fresh context: step 8 +41–56% median against a step-7 spread under 1–3%.** Reused context: +1–2%, within spread — so the cost was per context, not per call. V1–V3 (cheaper construction, no Proxy) all stayed +37–59%. In isolation an uncached Proxy costs ~25 ns and **any cached non-trivial view 400–1,100 ns**, a reference cycle and closures each refuted as the sole cause. **Uncached, built per call: −2.3% to +8.5% fresh, ~+4.5% reused**, adopted. Member-call within or near spread. **Member-read: not real** — five rotations each mode, every delta inside step 7's own spread, so the fourth tuple slot costs nothing measurable. **Re-run after C1**, on a noisier machine, pairing only rotations where both bundles ran clean: resolving the methods at construction cost ~15%, over the line, so the chain walk is deferred into the `get` trap; deferred, six paired rotations give +5.3% by median and +2.0% by minimum, inside step 7's own 13.2% / 19.9% spread |
| M17 | Option (a), and whether a refused read over-triggers (§ 8 q7) | Revision 14, in step 8. The origin carry prototyped in `evaluateMember`, then all three suites under it; then the same with a non-allowlisted read throwing a named error, all three suites again; every `this.fn()` expression in the three projects read for what it asserts | **(a) refuses R1–R4 and every structural way out, with no new reach.** Six assertions change: two functional, both in `eval.service.sync.core.spec.ts` section 13 (`this.increment()`, `this.getcounter()` — a method reaching its siblings), and the four identity pins already listed. `eval-forms` 375 green throughout. **The throw does not over-trigger**: beyond those six, the only case that moved was step 8's own, which pinned the undefined it replaces. `this.fn()` with a prior scope's `thisArg` is unaffected, which the root README documents |
| M16 | The four receivers under step 8's guard (§ 8 q7) | Revision 13, in step 8. The guard built and run through the real `EvalService` on step 8's working tree and on step 7's commit, as this document's steps are gated: the four receiver cases and the three ways out, each read case by case; three probes, each applied alone and reverted; the built `.d.ts` against 0.12.1's npm tarball by SHA-256 | R1, R2 and R3 refused, and the three ways out each yield nothing. **R4 reaches on both commits**, so it is pre-existing and the guard does not cover it: the receiver is the host's own object, which `getThis` answers with. Probe (i), the guard removed: 9 red, and the two identity pins green. Probe (ii), the allowlist emptied: `eval-signals`' two scope-depth-restore cases red. Probe (iii), the real context as the proxy target: the three ways out red. `.d.ts` identical, 111787 bytes. W4 measured: a write through the view throws where it used to land on the context |
| M15 | What `this` should evaluate to (§ 8 q4) | Revision 10, at 0.12.1. (1) Every expression in the three projects' specs, the READMEs and `docs/` that evaluates `this`, read for what it asserts. (2) A throwaway prototype giving `this`, outside a member's object, one of five values: the host's original object, a frozen shallow view of it, `undefined`, a refusal, an opaque frozen object. Each ran with `this.k` kept by position and not kept, and all three suites ran under each. (3) For each value, whether it withholds the context's functions (§ 8 q4's expectation). (4) The positional refusal's production bundle and 0.12.1's, outside the repository, with A39's probes P1, P2 and G1 run by the maintainer | § 8 q4. P1, P2 and G1 each reach a listed function on 0.12.1 and are refused on the prototype, where `this` escapes. Three receivers were not measured, and step 7's criterion 4 gates them |

---

## 1.2 Standing rules, from Revision 16

Two rules that outlive this plan. Both are here because a defect got through three code reviews
for want of them, and both are repeated in `.claude/skills/step/SKILL.md` so the next step
inherits them.

- **Every refusal carries a message that names its layer.** Two guards threw the same string, and
  every case that caught it passed whichever had fired — so a matrix that was supposed to prove
  one of them load-bearing could not tell them apart, and recorded the wrong answer. A refusal
  that cannot be attributed from its message cannot be probed by assertion, only by reading a
  stack trace.
- **Every supported option gets a leg in the case matrix.** `caseInsensitive` changes which nodes
  `markThisPositional` marks, and so changed the width of a security exemption. Not one case ran
  with the option on, so four documents asserted the opposite of what the code did. An option
  that changes behaviour and is tested in one mode is tested in none of the modes that matter.

  **And the near miss, which is the half worth remembering.** Adding the legs did not simply
  confirm the other mode: it exposed the *fixture*. Under `caseInsensitive`, `fromContext` copies
  the data into a `Registry`, so the line that exposed the context under `alias` — a property
  assignment onto `original` — inserted nothing, and seven native-writer cases had been passing
  on a `TypeError` from `Object.assign(undefined, …)` rather than on any refusal. A bare
  `toThrow()` could not tell the two apart. So the rule has a second clause: **a case that
  expects a refusal asserts the refusal's message**, never that something threw, because the
  cheapest way for a security case to go green is for its setup to fail before the code under
  test runs. This is the same failure CLAUDE.md records for Phase 3 step 4's pairing case — the
  setup, not the assertion — reached from the other direction.

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
  *Revision 13 held both open while R4 reached. Revision 15*: q7 chose (a), all four receivers are
  closed, and both retire in step 9 as fixed and not yet released.
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
    - **Steps 7–9 run consecutively after step 6, ahead of Phase 10's step 3**, so the window in
      which a public 0.12.1 carries the open route is as short as the work allows. 0.13.0 is
      published promptly after step 9 commits.
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
  - Evaluating `this` in fact lets native code reach a listed function the context holds, which
    neither shape sees, since nothing is pushed (finding 8, M14). The detail is held off the default
    branch (§ 2).

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
    has no site there. The funnel refuses it, and its write is [A40](../backlog-retired.md#a40).
  - **`this`**, which pushes `st.context`, an `EvalContext` object and never itself a function. But
    evaluating it lets native code reach a listed function the context holds, which neither shape
    sees (finding 8).
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

- **`this` handed to native code** (finding 8; [A39](../backlog-retired.md#a39)). Here the library supplies
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
  argument or a receiver is refused. But `this` lets native code reach it without a read (finding 8),
  so a forwarder built that way still runs. Step 4's code review measured it, and M14 measured it
  again. It is [A39](../backlog-retired.md#a39), it closes with step 7, and its detail is held in the draft
  advisory under § 2's disclosure rule.
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
     ([A40](../backlog-retired.md#a40));
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
   - a route through `this`, by which native code reaches a listed function the context holds
     (finding 8, [A39](../backlog-retired.md#a39)).

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
and 4, and › Fixed for step 3. No version moves until a release step: step 6 (0.12.1) and step 10
(0.13.0, with `eval-signals` 0.6.0 and `eval-forms` 0.6.0) (§ 2).

*Revised by Revision 6.* Steps 5 and 6 run under shape (i) only. Steps 7–11 close A39, and run under
shape (i), which *Revision 7 chose*. *Revision 11* split the old step 7 into the value route (7) and
the receiver guard (8), made the old documents/retire step 9 and the release steps 10 (commit) and 11
(post-publish).

| Step | Subject | Files (main) | Tests: `eval-core` / `eval-signals` / `eval-forms` | Shape | Ships in | State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | A36: the tag call through the sandbox | `tagged-template-expression.ts`, `call-expression.ts` (`callMember`, and `safeCall` exported), new `tagged-template-expression.spec.ts` | **+10** / 0 / 0 | both | the first release | done |
| 2 | K1 and the identity set | new `dangerous-values.ts`; `call-expression.ts`, `new-expression.ts`, `member-write-policy.ts`'s comment; new `eval.service.dangerous-values.spec.ts`; T11 and T12 in `tagged-template-expression.spec.ts` | **+21** / 0 / 0 | both | the first release | done |
| 3 | A37: a `SequenceExpression` visitor | new `sequence-expression.ts` and its spec; `recursive-visitors.ts`; the visitors barrel; the root `README.md`'s node list | **+6** / 0 / 0 | both | the first release | done |
| 4 | The funnel: every read through the walk's own stack | `visitor-result.ts`, `dangerous-values.ts`, the marks in `call-expression.ts`, `new-expression.ts`, `tagged-template-expression.ts` and `unary-expression.ts`; the spec; `.claude/skills/step/SKILL.md` | **+21** / 0 / 0 | both | the first release | done |
| 5 | `SECURITY.md` for 0.12.1: the funnel as a protection, the route through `this` and a host container as limits, the mitigations first | `SECURITY.md`, `public-api.spec.ts`'s allowlist if it needs entries | 0 / 0 / 0 | (i) only | no package | done |
| 6 | Release `eval-core` 0.12.1 | `modules/eval-core/package.json`, `CHANGELOG.md`; the post-publish commit's register, `CLAUDE.md` and this document | 0 / 0 / 0 | (i) only | `eval-core` 0.12.1 | done |
| 7 | A39 value route: `this` by position, refused anywhere else | new `this-position.ts`; `member-expression.ts`'s mark, `this-expression.ts`, `identifier.ts`; a new spec (P1/P2/G1); `CHANGELOG.md`; two `eval-forms` specs, test-only (Revision 10) | **+19** / 0 / 0 | both | `eval-core` 0.13.0 | done |
| 8 | A39 receiver guard: a guarded view, not the context, as `this` | new `context-receiver.ts`; the origin carry in `member-expression.ts`; the receiver at `call-expression.ts`, `tagged-template-expression.ts`, `callMember`; **delete** dead `evaluateCall`; a new spec (R1–R4, B1–B3, S2–S5, N1–N4); rewrite `scope-this` (e) and add (f), tag T6, `sync.core`'s two method rows, two `eval-signals` `signal-context` pins and a comment in `eval-signal-async.spec.ts`; `CHANGELOG.md` (Revision 11; extended by Revision 14) | **+18** / 0 / 0 | both | `eval-core` 0.13.0 | done (Revision 14, under q7's (a)) |
| 9 | `SECURITY.md`'s `this` and receiver limits become protections, a host container stays a limit; A39 and A35 retired; N-d timing, the view uncached, and its methods taken from the class (C1) | `SECURITY.md`, the register, this document; scope extensions (Revision 15): `context-receiver.ts`, N4–N6, `dangerous-values.ts`'s comment, `performance.spec.ts`, `public-api.spec.ts`'s allowlist, link targets | **+4** / 0 / 0 | both | `eval-core` 0.13.0 (the uncached view); the rest no package | done (Revision 15) |
| 10 | Release commit: `eval-core` 0.13.0, `eval-signals` 0.6.0, `eval-forms` 0.6.0, all peers consistent in one commit | all three `package.json`, each `CHANGELOG.md`, each README's peer block; `eval-signals`' `### Breaking` entry and its guarded-receiver README bullet | 0 / 0 / 0 | both | the three releases | |
| 11 | Post-publish commit, after the maintainer publishes and tags (ordered: core → signals → forms) | `docs/backlog.md`, `docs/backlog-retired.md`, `CLAUDE.md`, CHANGELOG dates, this document | 0 / 0 / 0 | both | — | |

From 2451, `eval-core` is at 2509 once step 4 commits, and at 2528 once step 7 does. Steps 7 and 8
each set their own count at their gate; `eval-signals` and `eval-forms` stay at 438 / 375 (the
rewritten pins are 1:1 replacements, not additions).

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
    - **The Critical**: the route through `this` (finding 8, [A39](../backlog-retired.md#a39)).
    - **W1**: reads that only inspect a value throw too. They went into § 3.5 item 3, and the
      postfix update's write became [A40](../backlog-retired.md#a40).
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
      ([A39](../backlog-retired.md#a39)). It is described at § 2's prose limit: that it exists, that
      0.13.0 closes it, and how a host stops it. Neither its mechanism nor an expression appears.
      *Revision 7.*
    - *Changed at the confirmation gate* (Revision 8):
      - K1 and the funnel are stated as defense in depth that narrows the routes, not as a boundary,
        and each links to the limits;
      - the route through `this` and a host container are also stated beside the protections, in
        "What these checks do not cover";
      - the mitigations open with "the context is trusted — place no listed function in it";
      - Node's --disallow-code-generation-from-strings joins them, stated only as far as it was
        measured on this step's bundle;
      - the source-text limit is stated with a fresh measurement.
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
- **Outcome** — done 2026-10-16.
  - **`SECURITY.md`** now opens with "Mitigations", ahead of the threat model. That section has
    three items:
    - the context is trusted — place no listed function in it;
    - a CSP without `'unsafe-eval'`;
    - Node's flag, as measured.

    "Call sandboxing" gains the check by value. A new "Dangerous function values" section states
    the set, its capture, the check at the callee and the funnel, each as defense in depth. It ends
    with "What these checks do not cover": the route through `this` and a host container.
    "Documented limits" replaces "The call checks refuse a name, not a value" with § 3.4's list, the
    route through `this` first.
  - **Criterion 1: met.** `public-api.spec.ts` is 29 of 29, its three `SECURITY.md` cases among
    them. From "Advisories" to the end, the document is byte-identical to `HEAD`, the Reporting
    section included: private vulnerability reporting was still off when checked on 2026-10-16
    (U1). doc-links is green.
  - **Criterion 2: met.** Every route in finding 1 is listed as refused, under the check at the
    callee (C1–C15t) or the funnel (V1–V21). Finding 8 is the first limit. It names
    [A39](../backlog-retired.md#a39) and M14, and its prose stays at § 2's limit.
  - **The allowlist** gains eight entries and loses none. `EvalError` and `Proxy` are `js-global`.
    `c`, `e`, `getEval`, `ns`, `obj` and `tools` are `example-binding`.
    - **Kept out of code spans**: names that fit none of the six reasons. They are the three
      constructors no global names, Node's flag, its vm module, the parser's preserveParens option
      and the upper-case variant.
    - **Quoted as a string**: `'anonymous'`, a word of the refusal message.
    - **The probe**, reverted: `tools` and `Proxy` dropped and a stale `vm` added. The identifier
      case listed exactly `Proxy` and `tools`, and the allowlist case exactly `vm`.
  - **Nothing marked refused is let through** (the gate's added check). A throwaway script ran
    against this step's production bundle, outside the repository. It ran every route the document
    states: 15 at the callee, 21 funnel reads, 8 reads that only inspect, the `typeof` exemption,
    17 behind the limits and 4 ordinary expressions. Each gave what the document says: the stated
    message, the stated value, or a run. A postfix update wrote before it threw (A40).
  - **The fresh measurements behind the limits.** A host function whose source names `globalThis`
    is refused as `host()`, and runs through `call`, `apply`, `bind` and `map`. Further runs measured:
    - an `eval` from a new vm context;
    - a `fetch` replaced after the capture;
    - `Function.prototype.call.bind(eval)` and `new Proxy(eval, {})`;
    - a host container holding `eval`, `Function` or any of the three other constructors.

    Each of those reached its function. A benign wrapper bound as `fetch` was refused, and Node's
    `setTimeout` rejected a string handler of its own accord.
  - **Node's flag**, measured on the bundle linked by the Angular linker, as an application build
    links it.
    - **What it stops**: the seven routes that build code from a string — the host containers of
      `eval` and the four constructors, and the two forwarders — each threw an `EvalError`.
    - **Unchanged**: every other route's result.
    - **What it does not stop**: `fetch` still fetched, and the vm context's `eval` still ran.
    - **Node's timers** reject a string handler with or without the flag.
    - **The unlinked bundle**, loaded through Angular's JIT compiler, fails under the flag, since
      that compiler calls `new Function`.
  - **Disclosure**: probe-pattern grep clean over every added line. Each added `this` in code is
    the refused `this.k` callee, or the prose limit.
  - **The reviewer was not run.** This step changes no library file, and the skill gives a
    documents step its own checks instead (above).
  - **Plan correction**: A35's and A39's *Recorded* lines in `docs/backlog.md`, as Revision 8
    states.
  - **Opened [A41](../backlog-retired.md#a41)**, fidelity and not in 0.12.1. An update does not convert its
    operand to a number, so `++` concatenates on a string or an object, and a postfix update gives
    the operand as read. Measured on a string, a numeric string and an object before the commit.

### Step 6 — Release `eval-core` 0.12.1 (shape (i) only)

- **The release commit**: bump `modules/eval-core/package.json` to 0.12.1, and move
  `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` items under `## [0.12.1] - <date>`. The full gate
  runs.
  - *Changed at the confirmation gate* (Revision 9): the section opens with a summary paragraph, as
    every released section does. Its first sentence states partial hardening that does not close
    every route, and points to `SECURITY.md`'s mitigations. Its prose about `this` stays at § 2's
    limit.
- **The post-publish commit** (*Revision 9*; CONTRIBUTING's Releasing step 6):
  - `docs/backlog.md`: the Publication status row, the tag count under it, the Register history
    row, "Work in flight", and the release in A35's, A36's and A37's rows and in A35's entry;
  - `docs/backlog-retired.md`: the release in A36's and A37's status lines;
  - `CLAUDE.md`: `eval-core`'s published version;
  - `modules/eval-core/CHANGELOG.md`: the heading's date, only if npm's differs;
  - this document: the outcome.
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
- **Outcome** — done 2026-10-17. The release commit is 7cc8d30, tagged `eval-core@0.12.1` there and
  published 2026-10-17 (npm: 13:49 UTC).
  - **Criterion 1: met.** The gate ran uncached and was green on all four projects. `eval-core` has
    2509 cases, `eval-signals` 438 and `eval-forms` 375, all unchanged. doc-links found 0 dangling
    links. Both downstream `lint` targets are green with their ranges unchanged.
  - **Criterion 2: met.** The built `types/zvenigora-ng-eval-core.d.ts` is byte-identical to the one
    in npm's 0.12.0 tarball, unpacked outside the repository: 111787 bytes, with the same SHA-256.
  - **Criterion 3: met.** The Security entry moved unchanged. It has three items, one per § 3.5 item,
    and the third states the two routes it does not cover. The Fixed entry lists A37.
  - **Criterion 4: met.**
    - The maintainer published from the `dist/` the gate built at 7cc8d30. Every file of the
      published tarball, the `.d.ts` and `CHANGELOG.md` among them, is identical to it.
    - The tag is annotated and pushed.
    - The post-publish commit adds the Publication status row and the Register history row: 19 live
      before, 8 opened (A35–A41, F20), 2 closed (A36, A37), 25 live after. They were counted against
      the index at 3466c80, by a script that reproduces 0.12.0's row.
    - `tools/release-tags.mjs` is green on it.
    - The CHANGELOG heading, 2026-10-17, is npm's date.
  - **The code review** found no Critical issue, and both its other findings were corrected before
    the release commit.
    - *Important*: the summary's "two routes stay open" read as the whole list. It now names the two
      routes past the walk's own values, says the host container stays a limit after 0.13.0, and
      points to `SECURITY.md`'s documented limits for the rest.
    - *Minor*: the summary says why a patch can make a read throw, as [0.10.1]'s does.
  - **No advisory** is published for 0.12.1. U3 follows 0.13.0 (§ 5).
  - **Plan correction**: the post-publish commit's files, which this step's text did not list. Its
    precedents, the 0.11.1 and 0.12.0 post-publish commits, touched the same files.

### Step 7 — A39 value route: `this` by position, refused anywhere else

*Added by Revision 6. Specified by Revision 10, from § 8 q4's decision. Split from the receiver
guard by Revision 11, which found the step-7 receiver gate reached (now step 8).*
- **New**: `internal/visitors/this-position.ts`, the positional mark and the refusal. `markThisPositional`
  / `isThisPositional` over a `WeakSet<AnyNode>`, as the funnel's `exemptNodes` is, and `refuseThisValue`.
- **Edit**, all in `internal/visitors/`:
  - `member-expression.ts`: `evaluateMember` marks its object node before visiting it, when that
    node is a `this`. That means a `ThisExpression`, or under `caseInsensitive` an identifier matching
    `this`. The mark is static, a property of the AST, as the funnel's marks are (§ 3.3). Every
    member read, call, tag, assignment and update goes through `evaluateMember`, so one mark covers
    each. M15's prototype did exactly this.

    *Corrected by Revision 12*, from the step's code review. Under `caseInsensitive` the mark takes
    every identifier object, with no name test. The identifier visitor decides which is `this`, and
    a mark is read only for a node it has decided is one. A name test there ran `equalIgnoreCase`,
    a locale comparison, on every member access whose object is an identifier. That measured the
    `caseInsensitive` path at 1.7–1.9× 0.12.1's (the outcome).
  - `this-expression.ts`: a marked `this` pushes the context, as today. Any other `this` throws.
  - `identifier.ts`: the same, in both visitors, for an identifier that matches `this` under
    `caseInsensitive`.

  Two details are fixed at the confirmation gate: the refusal's message, and whether `typeof this`
  is exempt. No existing case evaluates `typeof this`. The mark and refusal live in
  `this-position.ts` (Revision 11).

  *Fixed at the confirmation gate* (Revision 12):
  - **The message** is `Access to "this" outside a member access is blocked for security reasons`.
  - **`typeof this` is not exempt.** An exemption needs a mark in `unary-expression.ts` or an export
    from `dangerous-values.ts`, and neither is on this list.
  - **"Both visitors"**: the case-sensitive identifier visitor's `this` is reached only by a
    host-built AST, since acorn parses `this` as a `ThisExpression`. It is refused there too, and a
    case pins it.
- **New**: a spec, which holds:
  - the route cases P1, P2 and G1, through `EvalService`;
  - cases for `this` refused outside a member's object (as a value, an argument, an operand), under
    both case modes;
  - the kept positional cases: `this.k`, `this["k"]`, `this.fn()`, and `This.k` under
    `caseInsensitive`.

  Its name and its count are fixed at the gate. The route cases commit only in this commit (§ 2).
  *Fixed at the gate* (Revision 12): `modules/eval-core/src/lib/actual/services/`
  `eval.service.this-position.spec.ts`, 16 cases, raised to 19 at a second gate after the code
  review:
  - P1, P2 and G1;
  - E1–E8: `this` as a value, an argument, an operand and `typeof`'s operand, each as `this` and as
    `This` under `caseInsensitive`;
  - E9: a parenthesised sequence ending in `this`, as a member's object under `preserveParens`,
    refused (second gate);
  - H1: the host-built identifier named `this`;
  - O1–O4: the four kept positions;
  - O5: `(this).k` under `preserveParens`, kept (second gate);
  - H2: a host-built member whose object is an identifier named `this`, kept (second gate).
- **Edit**: `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` › Breaking, with the value-route change
  and the assertions it changes. Its wording is fixed at the gate. Its prose stays at § 2's limit.
  *Fixed at the gate* (Revision 12): the rule, with `typeof this` among the refusals, and the three
  `eval-forms` assertions.
- **Test-only edits downstream** (Revision 10, corrected by Revision 11):
  - `modules/eval-forms/reactive/src/lib/field-schema.spec.ts`;
  - `modules/eval-forms/signals/src/lib/rules.spec.ts`.

  Their three D5 context-composition pins capture the `EvalContext` with `keep(this)` — `this` passed
  as a call argument — then inspect its `lookups` (M15). The value route refuses `this` as an
  argument, and step 8's guard makes the call receiver a view, so **the context is no longer
  capturable from inside an expression — by design**. Revision 10's planned rewrite (capture through
  a bare call's receiver) is therefore superseded.

  *Corrected by Revision 12.* Revision 11 had the pins assert the resolver behaviourally, on the
  ground that the structural assertion already lived at the `createFieldContext` level in
  `modules/eval-forms/src/lib/field-context.spec.ts`. That spec makes no assertion on `lookups`, and
  cannot make this one: `createFieldContext` keeps two lookups by design. D5's dead lookups never
  answered, so no behavioural assertion sees them return. D5's own probe turned only the
  `/reactive` pin red when `/reactive`'s lookup was put back.
  - **So each pin takes the context where it is built**, which no `this` and no receiver is
    involved in, so it holds through step 8. The spy is on its defining module, confined to the
    case:
    - `createFieldContext` at `/reactive`;
    - `createModelSource` and the source's `createRuleContext` at `/signals`.
  - **The `lookups` assertion is kept as it was.** The rule's expression becomes a plain comparison
    of a form key, which shows the rule resolving it.
  - **Not a `jest.mock`**, which hoists to file scope. `field-schema.teardown-throw.spec.ts` records
    why that stays out of `field-schema.spec.ts`.

  No library file under `modules/eval-signals/` or `modules/eval-forms/` changes; `eval-forms` stays
  at 375.
- **Breaking.** These three pins are the only existing assertions step 7 changes (M15). Each was
  green against 0.12.1, and each is listed as breaking.
- **Scope.** The rest of `internal/visitors/`, the receiver, and `EvalContext` are outside this step.
  The receiver is step 8. A change to `EvalContext` is a stop-and-replan.
- **Exit criteria**:
  1. **The gate is green.** `eval-signals` stays at 438 and `eval-forms` at 375. `eval-core`'s count is
     fixed at the gate. `performance.spec.ts` is green and untouched.
  2. **The value route closes.** P1, P2 and G1 are each refused where `this` escapes as a value. Each
     is red against this step's parent commit. Probe (i): remove the refusal, and each reaches. Read
     case by case.
  3. **`this` as a member's object is unchanged.** Every existing case in the three projects holds
     except the three D5 pins: `this.k`, `this["k"]`, `this.fn()`, and `This.k` under
     `caseInsensitive`. Probe (ii): drop the mark. M15's not-kept column predicts failures in all
     three projects. Read which ones fail.
  4. **The surface.** The built `.d.ts` is byte-identical to 0.12.1's tarball. The change is in
     internal visitors only.
  5. **Disclosure.** The probe-pattern grep is clean over every added line outside the new spec's
     cases. Each added `this` in code is a member's object or the prose limit.
- **Disclosure** (Revision 7, § 2). Step 7 begins to end the embargo on the route's detail; step 8
  completes it.
  - **The spec cases that hold the probe expressions commit only with the fix, in this one commit.**
    They do not land on the default branch before step 7's code does.
  - **0.13.0 is published promptly after step 11 commits**, and the advisory (§ 5, U3) follows that
    publish. Steps 7–11 run consecutively, ahead of Phase 10, to keep the window short.
- **Category**: a breaking change on a published path, released in step 10 as 0.13.0.
- **Outcome** — done 2026-10-17.
  - **Criterion 1: met.** The gate ran uncached and was green on all four projects. `eval-core` has
    2528 cases (2509 + 19), `eval-signals` 438 and `eval-forms` 375. doc-links found 0 dangling
    links, and release-tags 0 failing rows. `performance.spec.ts` is 16 of 16, and untouched since
    0718796.
  - **Criterion 2: met.** P1, P2 and G1 are each red against the parent commit. None threw, and a
    throwaway run on the parent tree gave each listed function's result: `[2]`, 7 and `[2]`. Under
    the fix each throws the refusal.
    - **Probe (i)**, the refusal removed: 13 red in `eval-core`, which are P1, P2, G1, E1–E9 and H1.
    - The throwaway's three runs reached again, in the run before E9 existed.
    - `eval-signals` and `eval-forms` stayed green.
  - **Criterion 3: met.** Every existing case holds except the three D5 pins. `HEAD`'s two spec
    files, run against the fix, fail exactly those three, and 372 of 375 pass. O1–O5 and H2 are
    green.
    - **Probe (ii)**, the mark removed:
      - `eval-core`: 402 existing cases red, plus O1–O5 and H2;
      - `eval-signals`: 82, all in `signal-context.spec.ts`;
      - `eval-forms`: 4, all in `model-source.spec.ts`.

      That is M15's not-kept column, 402 / 82 / 7, less the three D5 pins, which no longer evaluate
      `this`.
    - `eval-core`'s 402 break down as:
      - 389 in `identifier-guard`;
      - 3 each in `read-hooks` and `sync.core`;
      - 2 each in `scope-this` and `get-key`;
      - 1 each in `sync.extended`, `dangerous-values` (C4) and `case-insensitive`.
  - **Criterion 4: met.** The built `types/zvenigora-ng-eval-core.d.ts` is byte-identical to the one in
    npm's 0.12.1 tarball, unpacked outside the repository: 111787 bytes, with the same SHA-256.
    `this-position.ts` is in no barrel.
  - **Criterion 5: met.** The probe-pattern grep finds nothing in any added line outside the spec's
    P1, P2 and G1 cases. Its pattern is built from those cases' fragments and from the field and
    getter names f64e779 removed. Every other added `this` in code is a member's object, the name
    test, the message, or prose at the limit.
  - **The D5 rewrite, failed first.** It is green on the parent. These match D5's own probes:
    - `/reactive`'s trim removed turns 1 case red, its pin;
    - `/signals`' trim removed turns 4 red: its two pins and `model-source.spec.ts`'s two rows.

    A registrar that walks a delegating copy of the minted context turns exactly the two `/signals`
    pins red.
  - **The code review** found nothing Critical. Before the commit it corrected:
    - **Important — the mark under `caseInsensitive`.** The name test cost a locale comparison per
      member access with an identifier object. Measured on `order.a.b + order.c`, in µs per
      evaluation over three rotations:

      | Bundle | case-sensitive | `caseInsensitive` |
      | :--- | :--- | :--- |
      | 0.12.1 | 2.63–2.78 | 6.75–6.81 |
      | as first written | 2.56–2.65 | 11.69–12.12 |
      | as corrected | 2.63–2.73 | 6.73–6.91 |

      Probes (i) and (ii) were run again on the corrected mark, with the same cases red, and again
      after the second gate, with the counts above.
    - **Minor — the `/signals` pins' comment** said the registrar uses the context and no other,
      which a context taken at construction does not show. The pins now spy on `evaluateRule` too.
      Their `createRuleContext` spy is restored in the case's `finally`, as the other two are.
  - **A second gate decided the review's other two findings** (Revision 12), and raised the count to
    19:
    - **Important — `(this).k` under `preserveParens`** threw, since the mark landed on the
      parenthesis. The mark now strips the object's parentheses first, as [A2](../backlog-retired.md#a2)'s
      write visitors do. O5 pins the kept read, and E9 pins a parenthesised sequence ending in
      `this` as still refused.
    - **Minor — the mark's case-sensitive arm** had no case. H2 pins it.
    - **Their probes**, each run against `eval-core` alone and reverted:
      - the unwrap removed: O5 alone red;
      - the unwrap widened through a sequence's last expression: E9 alone red;
      - the case-sensitive arm removed: H2 alone red.

### Step 8 — A39 receiver guard: a guarded view, not the context, as `this`

*Added by Revision 11, from decision A. The step-7 receiver gate (Revision 10, criterion 4) reached
on all three receivers, measured through the real service, so positional `this` alone does not close
A39: the context is also handed to native code as a call's, a tag's and `this.fn()`'s `this`, with no
`this` expression at all.*
- **New**: `internal/visitors/context-receiver.ts`, the guarded receiver. `guardedReceiver(context)`
  returns a `Proxy` cached per context in a `WeakMap` (*superseded by Revision 15*: built per call
  and retained by nothing, after M18 measured the cache as a ~45% cost on the one-shot path): it forwards an
  allowlist of scope-stack methods (`push`, `pop`) bound to the real context, reports no own keys
  (`ownKeys` → `[]`, `getOwnPropertyDescriptor` → undefined), and a null prototype
  (`getPrototypeOf` → null). So nothing else of the context is
  reachable — no internal field, no accessor, no prototype path — while a source function's
  documented `this.push(...)` / `this.pop(...)` still work (`eval-signals`' README; finding below).

  *Corrected by Revision 14*, from the step's second code review. This bullet said the proxy was
  "over the real `EvalContext`" and "returns undefined for every other property". Both were
  superseded before the step closed and the sentence was missed:
  - **The target is a frozen, null-prototype stand-in, not the context.** Probe (iii) measured the
    difference: over the real context, with only `get` trapped, all three structural ways out
    reach it.
  - **A non-allowlisted read throws**, and § 8 q7 records the measurement behind that.
  - **The gate's open question is settled**: `has` is trapped and answers from the allowlist;
    `set` is not trapped, and a write is refused by the frozen target — in strict mode as a
    `TypeError`, in sloppy mode silently.
*Extended by Revision 14, under § 8 q7's option (a): the file list gains `member-expression.ts`
and `eval.service.sync.core.spec.ts`, and the guard covers four receivers rather than three.*
- **Edit**, all in `internal/visitors/`:
  - `member-expression.ts` (*Revision 14*): `evaluateMember` returns the receiver's **origin** in
    a fourth slot — true when the evaluator chose the receiver out of the context's own resolution
    chain. Identity at the call cannot say it, since `getThis` answers a key the original holds
    with an ordinary host object, which is why R4 survived the first design.
  - `call-expression.ts`: the **bare** call passes `guardedReceiver(st.context)` to `safeCall`;
    `callMember` passes it when the fourth slot is set and the resolved receiver is `st.context`
    or its `original` (a member call on `this` for a lookup-resolved key, or for a key the
    original holds), and the real receiver otherwise (`obj.fn()`, `ns.fn()`, and a prior scope's
    declared `thisArg`, all unchanged).
  - `tagged-template-expression.ts`: the **bare** tag passes `guardedReceiver(st.context)` to
    `safeCall`.
  - **The write policy keeps the real context.** `consultMethodWrite` is still called with
    `st.context`, not the view, at every site, so the member-write policy sees the real write target.
    Only the function's `this` becomes the view. Confirmed at the prototype: tag T9 and
    `member-write-policy.methods.spec.ts` pass unchanged.
- **Delete**: `call-expression.ts`'s `evaluateCall`. It is dead — no caller anywhere in the repo, no
  `*.spec.ts` reference (grep-confirmed before deleting, Revision 11) — and not in the published
  surface (`src/public-api.ts` does not re-export `internal/visitors`, `export-list.spec.ts` pins
  that). So removing it changes no `.d.ts` and eliminates a latent fourth receiver site that carried
  `st.context` as its `this`.
- **New**: a spec, which holds the receiver route cases R1, R2 and R3 through `EvalService`, and the
  proto/`Reflect` bypass cases B1, B2 and B3. Its name and count are fixed at the gate. The cases
  commit only in this commit (§ 2).
- **Rewrite** (strengthened, not weakened): the two `eval-core` function-`this` identity pins —
  `eval.service.scope-this.spec.ts` (e), and T6 in `tagged-template-expression.spec.ts` — stop
  asserting the receiver *is* `st.context` by identity and assert the guard contract positively:
  the receiver resolves `push`/`pop`, exposes nothing else of the context, and has a null prototype.
  Each is listed as breaking.
- **Test-only edits downstream**, also `eval-signal-async.spec.ts`'s comment, which cited the
  bare call's receiver by a line this step moves (*added by Revision 14*, from the second code
  review: the file list was understated by one). (Revision 11): the two `eval-signals` `signal-context.spec.ts` pins
  ("the `this` argument of a context function": a bare call; a lookup-resolved `this.fn()`) are
  rewritten the same way — the function's `this` is the guarded view, resolving `push`/`pop` and
  hiding the rest. They keep every other assertion; `eval-signals` stays at 438. They ship in
  `eval-signals` 0.6.0 (step 10).
- **Edit**: `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` › Breaking, with the receiver change.
  Prose stays at § 2's limit.
- **Breaking.** The two `eval-core` pins and the two `eval-signals` pins are the only existing
  assertions step 8 changes. Each was green against step 7's commit, and each is listed as breaking.
- **Scope.** `EvalContext` is outside the step — the guard wraps it, and does not change it. A change
  to `EvalContext` is a stop-and-replan.
- **Exit criteria**:
  1. **The gate is green.** `eval-signals` stays at 438 and `eval-forms` at 375. `eval-core`'s count is
     fixed at the gate. `performance.spec.ts` is green and untouched.
  2. **The receiver route closes, with no residual and no bypass.** R1, R2 and R3 are each refused;
     B1, B2 and B3 (proto, `ownKeys`, `getOwnPropertyDescriptor`) are each refused. Each R case is red
     against this step's parent commit. Probe (i): remove the guard, and each R case reaches. Read
     case by case.
  3. **The documented `this.push` / `this.pop` survive.** `eval-signals`' async-signal suite is green,
     including the scope-depth-restore (criterion 10) case whose source calls `this.push(...)`. Probe
     (ii): drop `push`/`pop` from the allowlist, and that case goes red. The write policy still sees
     the real context: T9 and `member-write-policy.methods.spec.ts` are unchanged.
  4. **The surface.** The built `.d.ts` is byte-identical to 0.12.1's tarball — `context-receiver.ts`
     is internal and `evaluateCall`'s deletion is not in the published surface.
  5. **Disclosure.** The probe-pattern grep is clean over every added line outside the new spec's
     cases.
- **Category**: a breaking change on a published path, released in step 10 as 0.13.0.
- **Outcome** — **done 2026-10-18, under § 8 q7's option (a)** (*Revision 14*). The step stopped
  once at R4 (below), the scope question was decided from M17, and the step then completed with
  the origin carry folded in.
  - **Criterion 1: met.** The gate ran uncached and was green on all four projects. `eval-core`
    has 2546 cases, `eval-signals` 438 and `eval-forms` 375. `performance.spec.ts` is green and
    untouched.
  - **Criterion 2: met, for four receivers rather than three.** R1, R2, R3 and **R4** are each
    refused, each with the view's own named message; B1–B3 and S2–S4 each yield nothing of the
    context. 13 of the spec's 15 cases are red against the parent commit — the two that pass
    there, N1 and N4, hold trivially when the receiver is the context. **Probe (i)**, the guard
    removed at the three call sites: the same 13 red, so removing it restores the parent exactly.
  - **Criterion 3: met.** `eval-signals` is 438 green, the scope-depth-restore case included. T9
    and `member-write-policy.methods.spec.ts` are unchanged and green: the write policy still
    receives the real context.
  - **Criterion 4: met.** The built `.d.ts` is byte-identical to 0.12.1's tarball, 111787 bytes
    with the same SHA-256 — the origin carry is a fourth slot on an internal tuple, and
    `evaluateMember` is exported only from the internal visitors barrel.
  - **Criterion 5: met.** No route expression outside the spec's own cases.
  - **The six assertions rewritten**, each a deliberate contract change and none loosened:
    `eval.service.scope-this.spec.ts` (e); `tagged-template-expression.spec.ts` T6;
    `eval.service.sync.core.spec.ts`'s two section-13 method rows, which become the refusal pair
    plus the migration; and `eval-signals`' two `signal-context.spec.ts` pins.
  - **The second code review found nothing Critical**, and no route by which the view yields the
    context or the original. It traced all three `evaluateMember` exits, every `safeCall` site and
    every consumer of the tuple. Four things were corrected before the step closed:
    - **The origin carry was unpinned**, which is the finding that mattered: dropping
      `contextResolved` from the guard's condition left all three suites green, so the headline of
      this revision was vacuous in the suite. **Probe (iv)** confirmed it — 2544 of 2544 green with
      the origin half removed. **S5** now pins it: a context holding a reference to itself, called
      as `self.fn()`, keeps the real object, and that case is red the moment the flag is dropped.
    - **Two more receiver forms are guarded than the CHANGELOG listed** — `this.fn()` where a prior
      scope answers without declaring a `thisArg`, and where a pushed scope binds the key. Both
      measured. The entry now states the rule rather than enumerating forms, and `scope-this` gains
      **(f)**, the pair to (c): a declared `thisArg` is honoured, the evaluator's fallback is not.
    - **This bullet list's own stale sentences** (above), and the step-7 CHANGELOG paragraph, which
      said what closes A39 was undecided while the entry fifteen lines below said this closes it.
    - **The write throw is strict-mode only**, which the entry now says.
  - **The earlier stop, kept as the record.** *Revision 13*: the gate added R4 and fixed the rule
    before the work began — reaches, and the step stops rather than filing it as a limit. R4
    reached (M16), so the step did not close on its first run and nothing was committed. The guard
    as first designed discriminated on `receiver === st.context`, which no identity test at the
    call could extend to the original; (a) carries the fact out of `evaluateMember` instead.
  - **Criterion 1: not reached.** The tree is red by design at the stop — R4, plus the four
    identity pins the step lists as breaking and did not rewrite, since rewriting them would assert
    a contract the step is not shipping. `eval-core` 2538 with 3 red, `eval-signals` 438 with 2 red,
    `eval-forms` 375 green. Every `lint` and `build` target green, and `performance.spec.ts` green
    and untouched.
  - **Criterion 2: not met — this is the stop.** R1, R2 and R3 are each refused and each red
    against the parent; B1, B2 and B3 each yield nothing. **R4 reaches, on this commit and on the
    parent.** Probes (i), (ii) and (iii) are in M16, each read case by case.
  - **Criterion 3: met.** `eval-signals`' async-signal suite is green, the scope-depth-restore case
    included, and probe (ii) turns exactly that case red. T9 and
    `member-write-policy.methods.spec.ts` are unchanged and green, so the write policy still
    receives the real context — pinned, not merely read.
  - **Criterion 4: met.** The built `.d.ts` is byte-identical to 0.12.1's tarball, 111787 bytes
    with the same SHA-256. `context-receiver.ts` is in no barrel and `evaluateCall`'s deletion is
    not in the published surface.
  - **Criterion 5: met.** The probe-pattern grep finds no expression outside the spec's cases; the
    one hit in the new module is a single word of prose.
  - **The code review found nothing Critical in the guard**, and no route by which the view yields
    the context or anything it holds. It raised two Criticals about the step's *state* — the red
    tree, and the sentences claiming closure (C2, narrowed by this revision) — and W1–W4, all
    carried into § 8 q7.
  - **What is held uncommitted**: `context-receiver.ts`, the new spec, and the receiver changes in
    `call-expression.ts` and `tagged-template-expression.ts`. Whether it ships is q7's to decide.

### Step 9 — `SECURITY.md`'s `this` and receiver limits become protections; A39 and A35 retired

*Added by Revision 6. The receiver added by Revision 11. Narrowed by Revision 13 while § 8 q7 was
open; **restored by Revision 15**, since q7 chose (a) and step 8 closed all four receivers.*
- **Edit**:
  - `SECURITY.md`: the route through `this` — the value **and** the receiver — moves from the limits
    to the protections. **A host container (finding 3) stays a limit**, and the document says so
    beside the protection, so it does not read as though every route is now shut.
  - `docs/backlog.md` and `docs/backlog-retired.md`: A39 and A35 retired as fixed and not yet
    released, with their index rows re-pointed and the links the gate lists re-pointed. "Work in
    flight" is updated. Step 11 adds the release to their status lines, as it did for A36 and A37.
  - This document: the closure claims Revision 13 narrowed are restored (§ 9 item 6, U3, Revision
    11's note, the Objective), q7's C2 inventory is cleared, and the outcome.
- **Scope extensions**, each asked for by the maintainer and recorded here rather than made silently
  — `.claude/skills/step/SKILL.md` names any non-spec `.ts` change in this step a stop-and-replan,
  and that rule exists to stop silent scope creep, not explicit decisions:
  - **N-d, a timing measurement** before step 10: the bare-call and member-call paths, step 7's
    commit against step 8's (M18). A regression beyond the baseline's own spread stops the step.
  - **`context-receiver.ts`**, the one change on a published path: the view built per call and
    retained by nothing, adopted from M18 (q7's follow-up, option 1) with N4 rewritten to match and a
    CHANGELOG line that the view's identity is not stable.
  - **`dangerous-values.ts`**, a comment only, which promised that 0.13.0 closes A39 (C2's last
    item).
  - **`performance.spec.ts`**, two permanent cases on the paths M18 measured — structural rather than
    timed, for the reason that file's Parser Selection case gives and finding 7 measured.
  - **Link targets only**, outside this list: `docs/documentation/phase-10-plan.md` ×2, and the
    *published* 0.12.1 section of `modules/eval-core/CHANGELOG.md` ×3, whose wording stays as
    written — it is history. The doc-links gate requires them once the two entries move.
  - **`public-api.spec.ts`**, one allowlist entry, `fn`, as `example-binding`; *Revision 16* adds
    five more for the writers `SECURITY.md` now names — `assign`, `defineProperty`, `freeze` and
    `setPrototypeOf` as `js-member`, and `v` as `example-binding`.
  - **The step's own code review**, which found C1 on the first of those extensions and so is part
    of the same step: `context-receiver.ts`'s resolution, two cases and a strengthened N4, and
    [A42](../backlog-retired.md#a42) opened for its root cause.
  - **Revision 16: A42 is closed in this step**, since A39's closure claim depends on it. The
    maintainer re-scoped the step after the review's second finding and the probe confirming it,
    and chose this shape over routing every resolution off the class, which M19 measured over the
    line. The files that change beyond the list above:
    - `prototype-pollution-guard.ts` — `refuseContextWrite`, by class, reached from
      `safeSetProperty`, so it covers every write form the evaluator offers;
    - `member-write-policy.ts` — the same refusal at the native-writer boundary, after a context's
      own policy is asked;
    - `call-expression.ts` — that refusal at both call branches;
    - the new `context-method.ts`, and its use at the four scope pushes and their pops
      (`program.ts`, `block-statement.ts`, `for-statement.ts`,
      `arrow-function-expression.ts`), the write path (`variable-declaration.ts`,
      `eval-context.ts`'s `setInScope`) and the policy (`member-write-policy.ts`,
      `eval-state.ts`'s opt-in);
    - `member-expression.ts` — the by-class refusal of a context reached as data;
    - the new `eval.service.context-write.spec.ts`, 18 cases, and N5's setup in
      `eval.service.context-receiver.spec.ts`.
- **Exit criteria**: step 5's, with every route in findings 1 and 8 accounted for, the receiver
  included — "accounted for" meaning stated truthfully as closed or as open, not stated as closed.
  Nothing this step writes may claim a closure q7 has not delivered. *Revision 15*: N-d's line —
  the bare-call median within ~10% of step 7's on a fresh context — and the contract unchanged
  under the uncached view.
- **Category**: documents, plus the one change on a published path above, which ships in
  `eval-core` 0.13.0 with steps 7 and 8.
- **Outcome** — done 2026-10-18 (*Revision 15*).
  - **The gate is green.** Uncached, all four projects: `eval-core` 2550 (2546 + the two
    `performance.spec.ts` cases + N5 and N6; N4 rewritten one for one), `eval-signals` 438,
    `eval-forms` 375.
    doc-links 0 dangling over 1,499 links, release-tags 0 failing. The built `.d.ts` is
    byte-identical to 0.12.1's tarball.
  - **Criterion 1: met.** `public-api.spec.ts` is 29 of 29, its three `SECURITY.md` cases among them.
    The allowlist gains one entry, `fn`, as `example-binding`; removed, the identifier case lists
    exactly `fn`. From "Advisories" to the end, `SECURITY.md` is byte-identical to `HEAD`.
  - **Criterion 2: met.** Finding 8 is now a protection, naming its cases: P1, P2, G1 and E1–E9 for
    the value route, R1–R4, B1–B3 and S2–S5 for the receiver. Finding 1's routes are unchanged from
    step 5, refused at the callee or by the funnel. Finding 3, a host container, stays the first
    limit, stated in both places it appears as open in every version, 0.13.0 included.
  - **N-d's line: met**, after one stop. Bundles of 8bc8eda (step 7), d7ac92f (step 8), three
    variants and the uncached view; plain Node; a cached AST and a fresh `EvalState` per evaluation;
    15 rounds of 120,000; one process per bundle per rotation. µs per evaluation:

    | Path, mode | Step 7 (spread) | Step 8 | Uncached |
    | :--- | :--- | :--- | :--- |
    | bare call, fresh — first run, 3 rotations | 1.733–1.748 (0.87%) | +49.9 / +49.9 / +56.2% | — |
    | bare call, reused — first run | 1.685–1.721 (2.16%) | +1.3 / +2.0 / +1.6% | — |
    | bare call, fresh — r2–r4, r1 and r5 voided | 1.714–1.834 (7.0%) | +48 to +69% | **−2.3 / +8.5 / −0.8%** |
    | bare call, fresh — mins, same rotations | 1.615–1.760 (9.0%) | +32 to +39% | **+1.0 / +6.6 / −1.3%** |
    | bare call, reused — 10 rotations | 1.679–1.996 (18.9%) | +1–2% | **median +4.5%**, min median +4.6% |

    The variants, fresh, r2–r5 (r1 voided): V1, a closure for the `Map` and binds deferred, +37.2% to
    +42.8%; V2, no `bind` at all, +38.7% to +54.3%; V3, a frozen object and no Proxy, +55.5% to
    +58.9%. None came within 10%, and V3 was the slowest of all, which is what pointed away from the
    Proxy. Isolated, a fresh key per operation, medians: an uncached Proxy ~25 ns; step 8's
    construction uncached ~51 ns; a `WeakMap` entry of `1` ~92 ns, of a plain object pointing back at
    its key ~84 ns; of a Proxy ~405 ns, of an object of closures ~578 ns; step 8 in full ~627 ns; a
    shared handler with a private field ~715 ns; a `WeakRef` handler ~1,100 ns.
  - **Member paths.** Member call: fresh −0.4 / +1.8 / +1.3% inside a 2.1% spread; reused +5.0 /
    +3.8 / +2.6% against a 0.8% spread with mins straddling (+5.3 / +0.4 / +2.7%), not called a
    regression. **Member read, the dedicated run** — five rotations, 20 rounds of 200,000:

    | Mode | Step 7 spread | Median deltas | Min deltas |
    | :--- | :--- | :--- | :--- |
    | fresh | 7.0% | −3.2 / −1.9 / +4.3 / −0.6 / −2.8% | −4.7 / −0.4 / +0.9 / −1.3 / +0.8% |
    | reused | 3.0% | +1.0 / +1.3 / +2.9 / −2.1 / 0.0% | +1.3 / +2.9 / +0.1 / −0.3 / −0.8% |

    Not real. The +10% the first run's fresh medians showed came with overlapping mins, and was noise.
  - **The uncached view's contract.** R1–R4, B1–B3, S2–S5 and N1–N3 all green under it; only the old
    N4 failed. The new N4, run against step 8's cached view, fails alone.
  - **C1, from the code review, fixed in the step** (above). `eval-core` ends at 2550: the spec
    gains **N5**, which fails if the real context comes back through a planted `push`, and **N6**,
    which pins the refusal when the class provides no such method; **N4** gains a leg that each
    view's `push` moves this context's own scope stack, where `typeof` alone would have passed
    against any function. Probes, each alone and reverted: the instance read restored turns **N5
    alone** red across the whole suite; a `push` that is a function but inert turns **N4 and N1**
    red, and nothing else.
  - **The benchmark, re-run after C1** on a markedly noisier machine than the first run — step 7's
    own minimum sat at ~2.4–2.9 µs against ~1.6–1.8 µs earlier — so only rotations where **both**
    bundles ran clean are paired, by a rule declared before the run: a rotation is void where its
    median exceeds its own minimum by more than a quarter. Six of eighteen rotations paired:
    median deltas −6.5, +2.8, +7.8, +12.8, +14.0 and +2.7%, median **+5.3%**; minimum deltas −8.5,
    −1.3, +8.6, +4.6, +0.7 and +3.3%, median **+2.0%**. Step 7's own spread over the same rotations
    is 13.2% by median and 19.9% by minimum, so every delta falls inside the baseline's own
    variation. Within the ~10% line.
  - **The two `performance.spec.ts` cases, each probed both ways**, each probe alone and reverted:
    step 8's cached guard back turns only the bare-call case red; a view built on every member call
    turns only the member-read case red; no guard on the bare call turns only the bare-call case red,
    the over-reacting direction. The bare-call case parses outside its spy window: the parser
    service's fingerprint cache inserts into a `WeakMap` of its own on a first parse, which the
    case's first draft caught and which is not the walk.

#### Revision 16's outcome — A42 closed

**The gate is green.** `eval-core` **2596** (2550 + the 45 cases of
`eval.service.context-write.spec.ts` + one `performance.spec.ts` case on the member-write path;
N5 rewritten one for one), `eval-signals` 438, `eval-forms` 375; doc-links 0 dangling over 1,525
links, release-tags 0 failing. The W forms, the native forms, L1 and L8 each run twice, under
`{}` and under `{ caseInsensitive: true }`, which is § 1.2's second standing rule and which
caught a fixture that had been passing on a `TypeError`: under `caseInsensitive` `fromContext`
copies the data into a `Registry`, so assigning `alias` onto `original` inserted nothing. The built `.d.ts` is byte-identical to 0.12.1's tarball — same
SHA-256, 111787 bytes — because every file this revision adds or changes is internal.

**The member-write `performance.spec.ts` case** is structural, like its two neighbours: a write to
an ordinary object builds no view, inserts into no `WeakMap`, and asks the context's class for
nothing beyond the program's own scope push — that push being the positive control, without which
"the policy was not asked" would pass just as well against a spy that saw nothing. Probed: the
policy consulted unconditionally turns this case red and nothing else. It parses outside the spy
window, for the reason the bare-call case gives, which caught this one too.

**Where the evaluator invokes a method on a context-derived receiver** — the enumeration the
re-scope asked for, 22 invocation sites and one opt-in read, across 11 files. Those marked **kept**
resolve the method from the context's class; the rest read the instance, which the write refusal is
what defends:

| Site | Method | Reached by | Resolution |
| :--- | :--- | :--- | :--- |
| `program.ts` :44, :53 | push, pop | every walk | **kept** |
| `block-statement.ts` :52, :61 | push, pop | every block | **kept** |
| `for-statement.ts` :78, :116 | push, pop | every loop | **kept** |
| `arrow-function-expression.ts` :27, :31 | push, pop | every arrow call | **kept** |
| `variable-declaration.ts` :194, :197, :205 | scopeHolding, set, setInScope | every identifier write | **kept** |
| `member-write-policy.ts` :46, :173 | checkMemberWrite | every member write, every mutating built-in | **kept** |
| `eval-context.ts` `setInScope` | scopeHolding | the write path | **kept** |
| `eval-state.ts` :453 | checkMemberWrite | the policy opt-in — a *read*, not a call | **kept** |
| `identifier.ts` :130, :164 | get | every identifier | instance |
| `identifier.ts` :50, :53, :101 | getKey, hasInScopes, getKey | read hooks; the case-variant guard | instance |
| `member-expression.ts` :107, :112, :113 | getKey, get, getThis | every `this.k` | instance |
| `update-expression.ts` :29, :31 | getKey, get | `i++` | instance |
| `assignment-expression.ts` :66 | getKey | `x = v` under `caseInsensitive` | instance |
| `eval-context.ts` :59, `getFromScopes`, `hasInScopes` | scopeHolding | inside `resolve` — every `get` and `getKey` | instance |
| `member-expression.ts` :143, `resolve`, `getThis` | `EvalScope.get` | a prior scope, and a scope as a member's object | instance |

Not invoked on a context-derived receiver, and so not on the list: `Stack.push`/`pop` inside
`EvalContext.push` (the stack is held in a field, which the write refusal protects); `Registry`
access through `getContextValue`/`setContextValue`, which no expression can reach as a write
target; and a lookup, which is called with no receiver.

**The write boundary, probed form by form** against a plain context, through `EvalService`. The
first draft refused only at `safeSetProperty`, and the probe found the native writers going
straight past it — which is why this table was run rather than reasoned:

| Form | Before | After |
| :--- | :--- | :--- |
| `this.push = f`, `this["push"] = f`, `this["pu" + "sh"] = f` | plants | refused |
| `this.push += 1` | plants | refused |
| `this._original = o`, `this._scopes = o`, `this._priorScopes`, `this._options` | overwrites the field | refused |
| `alias.push = f`, the context under a host-supplied name | plants | refused |
| `Object.assign(alias, …)`, and `Object.assign.call(Object, alias, …)` | plants | refused |
| `Object.defineProperty(alias, …)` | plants | refused |
| `Reflect.set(alias, …)`, `Reflect.defineProperty(alias, …)` | plants | refused |
| `Object.setPrototypeOf(alias, o)` | **replaces the class** | refused |
| `Object.freeze(alias)` | freezes the context | refused |
| `Object.assign(this, …)` and every `this` in an argument position | refused already, by step 7's positional rule | unchanged |
| `[this.push] = [f]`, `({ v: this.push } = …)` | `Unsupported assignment target` | unchanged |
| `this.push ||= f` | a parse error — the operator is not supported | unchanged |
| `delete this.n`, `delete alias.n` | a no-op; `delete` has no visitor | unchanged |
| `++this.n`, `this.n++`, `this.n = 7`, `n = 7` for a key the context **resolves** | writes the caller's own object | unchanged |

**The probe matrix**, each layer removed alone and reverted, over the 45 cases of
`eval.service.context-write.spec.ts` and `eval.service.context-receiver.spec.ts`:

| Layer removed | Red | Covers what nothing else does |
| :--- | :--- | :--- |
| none | — | 46 of 46 green |
| the value funnel | 7: L4, L5, L7, L8, L9, L10, W10d | a context as a value, by every route |
| the write refusal | 8: W1–W6, W10e, W11 | every write form, and the field overwrite's integrity consequence |
| methods resolved from the class | 5: L1, L2, L2b, L3, N5 | an own property arriving by any route other than an expression |
| the funnel's exemption keyed on the node alone | 1: L10 | a foreign context before a `.` under `caseInsensitive` |
| the by-class member-object refusal | **0** | nothing — **removed in the final pass** |

No layer's removal turns another's cases red, so the first three are distinct rather than three
spellings of one.

**The fifth row is the step's third code review, and it corrects this table's own previous
version.** The funnel's exemption was keyed on the node — `isThisPositional(node)` — and
`markThisPositional` marks a member's object whenever it *could* resolve to `this`, which under
`caseInsensitive` is **every identifier**, with no name test, for a reason of its own: to keep a
locale comparison off the identifier path. So the exemption was as wide as that mark, and a
host-supplied foreign context named before a `.` passed the funnel unrefused. Only
`member-expression.ts`'s check refused it — the check this table had just called redundant. Not
one of the then-27 cases ran under `caseInsensitive`, which is why four documents asserted the
opposite and the matrix could not see it. The exemption now tests the **value's identity** as
well, so it is exactly the walk's own context in a member's object position; L10 pins it, and
probe E (the node-only form restored) turns L10 and nothing else red.

**The sixth turned nothing red even with L10 present, so it was removed** (M20). With the
exemption tightened it had no case of its own, and it was measured at ~2.5% of the member-read
path, which runs for every `a.b`: a check that covers nothing and is not free is overhead that
reads like protection. The funnel is the single read boundary, and `member-expression.ts` says so
where the check used to be.

**The two refusals now carry different messages** — `Access to the evaluation context…` from the
funnel, `Access to a member of the evaluation context…` from the member check. They were
identical, which is exactly why every L case passed without being able to say which layer had
fired, and why the gap above survived three reviews. The messages are what make this table
falsifiable by assertion rather than by reading a stack trace.

**The routes by which a value reaches a result**, enumerated and probed rather than reasoned, to
support the funnel's completeness claim. Every one of these is refused: a bare identifier, a
member read, a spread source, an array element, an object-literal value, a call argument returned
by identity, an arrow's body, a conditional, a logical, a sequence, a template literal, `typeof`,
an equality operand, a host function returning its own `this` (it receives the guarded view,
which refuses the coercion), and a host closure returning the real context. The exemption, the
positional `this`, resolves `this.k` as before.

There are exactly **two push sites**, `pushVisitorResult` and `pushVisitorResultAsync`, and the
second has no caller in the library and is not in the published surface. Two routes reach a
*result* without the funnel seeing the context, and both need a **host that already holds one** —
not a host *function*, which this said until the third review measured it: plain data is enough.
A context stored one level down in the evaluation data (`{ nested: { c: ctx } }`, `[ctx]`) is
handed back as a result, because the funnel reads the value a node pushes and not its contents;
reading it back one hop later is refused. The other is `evaluateAsync`'s `awaitAllPromises`,
which resolves a promise **after** the walk. Both are measured, both are in `SECURITY.md` and in
[A42](../backlog-retired.md#a42), and neither is constructible by an expression, since both begin
by holding a context.

The **trace** is a third destination of the same kind: the exempt positional `this` reaches
`addTraceBounded`, so a walk that evaluates `this.k` leaves the live context in
`EvalResult.trace`. Pre-existing — before step 7 every `this` did — and it reaches only the host,
which already holds that context.

**The third residual is the one that needs no host-held context, only an AST shape**, and it is
the sharpest of the three. The mark that says "member's object position" is keyed on the node and
is permanent — a `WeakSet`, by design and for cost (`this-position.ts`). A **host-built** AST
that uses one `this` node twice, the member use visited first, carries the mark to the second
use, where the identity half cannot help because the value there is the walk's own context too.
Measured: the context then reaches a host function as an argument, and leaves nested in the
result as `[1, [context]]` or `[1, {c: context}]`. Visited in the other order the second use is
refused by `refuseThisValue` before any mark exists, and **no source can produce it at all**,
since a parser never shares a node. Pinned as a tripwire by L11 rather than closed: closing it
means consuming the mark at the pop instead of leaving it standing, which is per-node state on
the hot path and a cost decision rather than an obvious win.

**The cost, after the final pass** (M20). On the commit candidate against step 7, paired within
rotations, medians over twelve rotations: **bare call +7.6%**, **member write +10.0%**, **member
read +1.85%** (six).

**The member write is a consistent ~10%, and is stated that way rather than as "inside spread".**
It is positive in all twelve rotations, so although step 7's own variation on that path is 9.0%
the effect does not vanish into it — a figure that is smaller than the baseline's spread but
never changes sign is a real cost that the spread merely makes hard to measure precisely. The
bare call is also positive in twelve of twelve, at about half the size. Only the member read is
genuinely indistinguishable from the baseline, with one of six rotations negative. The write path
is the one at the line, and it is the one to re-measure if anything else lands on it.

Three measurements got it there, and each corrected a guess. **The funnel is not what costs** —
+0.15% on the bare call and **+2.75%** on the member read, the push-heavy path the first
attribution had not used. **The hop lookup was structural**: three hash lookups per call became
one `Map.get`, +11.4% → +1.75%, and it is kept because it is *reached* through the third residual
(L2d). **The member-object refusal was removed**: no case red, ~2.5% of every member read. The
`pop` probe moved out of `contextPush` into `EvalState`'s constructor, off a per-block and
per-iteration path.

A third path in one process voided the last path of every rotation on both bundles, so member-read
is run alone; that void rule was declared before the first run (M13).

**One existing assertion changed**: N5's setup, for the reason Revision 16 gives — its old setup
planted through an expression, which W1 now refuses. The assertion is the same, and the layer it
tests is now the one it names.

### Step 10 — Release commit: `eval-core` 0.13.0, `eval-signals` 0.6.0, `eval-forms` 0.6.0

*Added by Revision 6 (as a single `eval-core` release). Rewritten by Revision 11 into one combined
commit, since the three must move together.*
- **Why one commit.** `@nx/dependency-checks` fails `lint` the moment the repo's `eval-core` reads
  0.13.0 while a downstream peer range still says `<0.13.0`, and again the moment `eval-signals`
  reads 0.6.0 while `eval-forms`' peer says `<0.6.0`. So all three bumps and every peer change land
  in one commit, as the Phase 9 release (3466c80) did for the same reason. The gate is green on this
  commit because every peer is consistent within it.
  - **With the floors raised** (the reversal below), the windows are tighter and the chain is
    shorter, but the reason for one commit is unchanged and the argument is the same shape run the
    other way. `@nx/dependency-checks` compares each declared range against the **workspace's own**
    version of the dependency, so `eval-signals`' `>=0.13.0 <0.14.0` and `eval-forms`'
    `>=0.13.0 <0.14.0` are unsatisfiable until `modules/eval-core/package.json` reads 0.13.0, and
    `eval-forms`' `>=0.6.0 <0.7.0` until `modules/eval-signals/package.json` reads 0.6.0. A raised
    floor therefore fails the gate **before** the bump it names, where a widened ceiling failed it
    after — so the commit cannot be split in either direction, and each range is satisfied by
    exactly one version in the tree. Nothing in the chain now admits a pre-0.13 `eval-core`: both
    downstream ranges pin the 0.13 line directly, and `eval-forms`' `eval-signals` range admits
    only the release whose own range does the same.
- **`eval-core` 0.13.0.** Bump `modules/eval-core/package.json`; move the `[Unreleased]` items under
  `## [0.13.0] - <date>`, with the two breaking changes (the value route, then the receiver) stated
  first.
- **`eval-signals` 0.6.0.** Bump `modules/eval-signals/package.json`; move its `eval-core` peer
  `>=0.11.0 <0.13.0` → `>=0.13.0 <0.14.0` — **the floor rises, not only the ceiling**
  (*the reversal, fixed at step 10's gate*): the `### Breaking` entry below describes behaviour
  that exists only with `eval-core` 0.13.0, so an install resolving an earlier `eval-core` would
  take this release's documented contract against an evaluator that does not implement it, and
  that evaluator is one U3 lists as affected. Its `CHANGELOG.md` gains a **`### Breaking`** entry: a
  context function's `this` is now a guarded view of the `EvalContext`, not the context itself —
  `push`/`pop` still work and nothing else of the context is reachable — and the two `signal-context`
  pins step 8 rewrote are the assertions that change. Its README's resolution bullet (the one on
  `EvalContext.push`/`pop`, lines 559–561 at this revision) is updated to describe the guarded
  receiver: a source function's `this` resolves `push`/`pop` against the context but exposes nothing
  else. The README peer block, and the prose that states the floor and its reason, show the new
  range. (The entry may be concrete: § 2's disclosure limit runs until 0.13.0 ships, and this is
  the commit it ships from — step 9's `SECURITY.md` already states both halves with their case
  names. It still prints no route expression.)
- **`eval-forms` 0.6.0.** Bump `modules/eval-forms/package.json`; move its `eval-core` peer
  `>=0.12.0 <0.13.0` → `>=0.13.0 <0.14.0` — **the floor rises here too** (*the reversal, fixed at
  step 10's gate*), for the same reason and one more: a fresh install of `eval-forms` 0.6.0 must
  not be able to resolve an `eval-core` U3 lists as affected. Raise its `eval-signals` floor
  `>=0.5.1 <0.6.0` → `>=0.6.0 <0.7.0` (the first `eval-signals` that admits `eval-core` 0.13.0, as
  0.5.0 raised the floor to the first that admitted 0.12.0). Its `CHANGELOG.md` records both floor
  raises and the forwarded behavioural change, and names the three D5 test-only edits step 7 made.
  The README peer block, and the prose that states each floor and its reason, show the new ranges.
- **Exit criteria**:
  1. The gate is green on the combined commit. **Counts unchanged from 55341d1 — 2596 / 438 / 375,
     exactly. Any movement is a stop condition.** (*Fixed at step 10's gate*, correcting
     "unchanged from step 8": step 8 ended at 2546 and step 9 and its Revision 16 took `eval-core`
     to 2596, so the count the criterion named no longer exists.)
  2. **All three built `.d.ts` are byte-identical to their published tarballs'** — `eval-core` to
     0.12.1's, `eval-signals` to 0.5.1's, `eval-forms` to 0.5.0's — **and `package.json` is
     reported separately. Not byte-identical anywhere is a stop-and-report.** (*Fixed at step 10's
     gate*, strengthening "differs … by documentation comments and peer metadata only": no
     non-spec source file changed in either downstream package since its last release, so nothing
     in any of the three `.d.ts` may move; and peer metadata lives in `package.json`, not in a
     `.d.ts`, so the two artifacts are checked and reported apart.)
  3. Each `CHANGELOG`'s `[Unreleased]` is moved under the new version, `eval-core`'s breaking
     entries first.
  4. Then CONTRIBUTING's Releasing steps 3–6 by the maintainer: publish in order
     **`eval-core` → `eval-signals` → `eval-forms`**, confirm each with `npm view`, and tag
     `eval-core@0.13.0`, `eval-signals@0.6.0`, `eval-forms@0.6.0` at this commit. Publishing and
     tagging are the maintainer's actions (§ 5).
- **Category**: the release — `eval-core` a minor carrying a breaking change, `eval-signals` a
  breaking minor (forwarded behaviour and a floor raise), `eval-forms` a breaking minor (the same,
  and two floor raises).
- **Outcome** — committed 2026-10-20, published and tagged by the maintainer afterwards (§ 5 U2).
  - **The gate is green.** Uncached, all four projects: `eval-core` **2596**, `eval-signals`
    **438**, `eval-forms` **375** — the counts at 55341d1, unmoved; doc-links 346 files, 1,537
    links, 0 dangling; release-tags 35 rows, 45 tags, 0 failing. Nine files changed, every one on
    this step's list, no rename and no `.ts` — which is what keeps criterion 2 reachable at all.
  - **Criterion 1: met.** 2596 / 438 / 375 exactly. No step-10 file is compiled or tested, so a
    moved count could only have come from a scope breach.
  - **Criterion 2: met.** Every built `.d.ts` is byte-identical to its published tarball's, by
    SHA-256. "All three" is three packages and **five files**, since `eval-forms` publishes one per
    entry point — the enumeration, not a change to the criterion:

    | File | Published | Bytes | SHA-256 (first 16) |
    | :--- | :--- | ---: | :--- |
    | `zvenigora-ng-eval-core.d.ts` | `eval-core` 0.12.1 | 111,787 | `4f11d36f2e4b8824` |
    | `zvenigora-ng-eval-signals.d.ts` | `eval-signals` 0.5.1 | 26,838 | `743ce48469d8a97e` |
    | `zvenigora-ng-eval-forms.d.ts` | `eval-forms` 0.5.0 | 16,734 | `9cdb2816f74b28b2` |
    | `zvenigora-ng-eval-forms-reactive.d.ts` | `eval-forms` 0.5.0 | 12,507 | `f2570daaae3b2a65` |
    | `zvenigora-ng-eval-forms-signals.d.ts` | `eval-forms` 0.5.0 | 7,981 | `3a9cf281451537ac` |

    **`package.json`, reported separately** as the criterion requires: `eval-core` 0.12.1 → 0.13.0,
    its own peers untouched; `eval-signals` 0.5.1 → 0.6.0 with `eval-core` `>=0.11.0 <0.13.0` →
    `>=0.13.0 <0.14.0`; `eval-forms` 0.5.0 → 0.6.0 with `eval-core` `>=0.12.0 <0.13.0` →
    `>=0.13.0 <0.14.0` and `eval-signals` `>=0.5.1 <0.6.0` → `>=0.6.0 <0.7.0`. The built manifests
    in `dist/` carry exactly those values.
  - **Criterion 3: met.** Each changelog keeps an empty `[Unreleased]` above the new heading;
    `eval-core`'s `### Breaking` items moved intact and come first, the value route before the
    receiver, with `### Performance` after them.
  - **Criterion 4: the maintainer's**, and outstanding at this commit. Publish `eval-core` →
    `eval-signals` → `eval-forms`, confirm each with `npm view`, tag all three here.
  - **The reversal, measured rather than assumed.** `@nx/dependency-checks` is green on the
    combined commit with the floors raised: it resolves each declared range against the
    workspace's own version, and `eval-core` 0.13.0, `eval-signals` 0.6.0 satisfy every one. The
    intersection of the three manifests is `eval-core` 0.13.x, so the graph is satisfiable and
    admits no pre-0.13 `eval-core` anywhere — which the widened-ceiling form would have allowed
    while the same releases' changelogs described behaviour only 0.13.0 has.
  - **The code review found no Critical and five Warnings, every one in text this commit
    authors, and all five are fixed in it** — the manifests, the version kinds, the ranges, the
    assertion accounting, the guarded-receiver contract and both downstream containment sites were
    sound as written:
    1. `eval-core`'s 0.13.0 summary named no downstream release, where every prior entry in that
       file does. With the floors raised that is an install failure, not a note: a consumer who
       bumps `eval-core` alone gets a peer graph nothing satisfies. The summary now names
       `eval-signals` 0.6.0 and `eval-forms` 0.6.0 and quotes the ranges that exclude it.
    2. `eval-signals`' `### Breaking` documented the receiver half of A39 and not the value half,
       although its raised floor hands consumers both. `eval-forms`' sibling entry stated it, so
       two packages described one evaluator change differently. A bullet mirroring `eval-forms`'
       was added.
    3. "No code of it changes at all" was false in both downstream entries — each then enumerated
       the specs that changed. Both now claim the stronger true thing: no *shipped* code changed,
       which is why the `.d.ts` cannot move. `eval-signals`' "suite otherwise unchanged" also
       overlooked a comment-only edit in `eval-signal-async.spec.ts`, now named.
    4. This document's header block still said both downstream ranges admit 0.12.1 and neither
       admits 0.13.0 — present tense that this commit falsifies, and outside the step entries the
       reversal edited. Scoped to the release it describes.
    5. **The headline absolute.** "The evaluation context is neither writable nor obtainable" is
       stronger than what 0.13.0 does: `SECURITY.md` keeps a host-nested context, `evaluateAsync`'s
       promise unwrap, the trace after `this.k` and L11 as limits open in every version. The clause
       is narrowed to "not writable by an expression, nor obtainable as a value the walk produces",
       and a paragraph now names those four and links the documented limits — which 0.12.1's own
       entry did and this one had not.

    Four notes were taken as well: `eval-forms`' "the `.d.ts`" made plural for a three-entry-point
    package; its floor prose given back the transitive reason for the `eval-signals` floor, which
    the rewrite had collapsed into `colonIdentifiers`; `eval-signals`' README write refusal
    qualified as the `TypeError` in strict mode that `eval-core` states; and criterion 2's "all
    three" enumerated above as five files rather than amended, since it was fixed at the gate.

### Step 11 — Post-publish commit

*Added by Revision 11 (the post-publish half of Revision 6's release step).*
- **After the maintainer publishes and tags** all three (CONTRIBUTING's Releasing step 6):
  - `docs/backlog.md`: the Publication status rows for the three, the tag count, the Register history
    row, "Work in flight", and the release in A35's and A39's rows and entries;
  - `docs/backlog-retired.md`: the release in A35's and A39's status lines;
  - `CLAUDE.md`: the three published versions;
  - each `CHANGELOG.md`: the heading's date, only where npm's differs;
  - this document: the outcome.
- **Exit criteria**: the gate is green; `tools/release-tags.mjs` is green on this commit, with every
  Publication status row's tag present at the commit it names.
- **Category**: the release's docs-only post-publish commit. Then U3 (§ 5), the advisory, after the
  publish.
- **Outcome** — committed 2026-10-20, after the maintainer's publish and tags (§ 5 U2), each
  checked rather than assumed: `npm view` lists `eval-core` 0.13.0 (20:52 UTC), `eval-signals`
  0.6.0 (20:55) and `eval-forms` 0.6.0 (20:57), in the order step 10 requires, and all three tags
  are on the remote at f7f27f7.
  - **The tags were first pushed lightweight**, where every earlier release tag is annotated and
    CONTRIBUTING's step 5 writes `git tag -a`. `release-tags.mjs` could not tell the difference —
    it resolves a tag with `git rev-list -n 1`, which accepts either kind — so the gate would have
    passed on them. Before this commit they were recreated annotated at the same commit, in the
    existing `<project> <version>` message form, and force-pushed. No tag moved commit.
  - **The gate is green** and the release-tags check with it: every Publication status row's tag
    exists, at the commit the row names — the three new rows at f7f27f7. Counts unmoved, as § 6
    has it for this step.
  - **The register**: three Publication status rows; the tag sentence at thirty-eight; a Register
    history row, 25 live before, opened 1 (A42), closed 3 (A35, A39, A42), 23 after. The totals line
    reads 42 + 51 − 70 = 23, and 23 is also the count of live rows in the index at this commit,
    counted from the index itself rather than taken from the delta. "Work in flight" says the
    steps are done, U3 remains, and Phase 10 resumes at its step 3.
  - **A plan correction: A42 is recorded as released with A35 and A39.** This step's list predates
    Revision 16, which added A42 to step 9; it ships in 0.13.0 like the other two, and its index
    row and retired status line said "not yet released". Both files were on the list already.
  - **The CHANGELOG headings stand**: each reads 2026-10-20, npm's UTC publish date for all three.
  - `CLAUDE.md` carries the three versions only. Its prose naming this plan as the active one and
    Phase 10 as paused is left for Phase 10's resumption, which retargets it with the `step`
    skill.

---

## 5. The maintainer's actions

| # | Action | When |
| :--- | :--- | :--- |
| U1 | Enable private vulnerability reporting on the repository | Before U3, and before step 5 if `SECURITY.md`'s Reporting section is to point at the form in that commit |
| U2 | Publish each release and push its tag, per CONTRIBUTING steps 3–5: `eval-core` 0.12.1, then 0.13.0 | After step 6's release commit, and after step 9's |
| U3 | **One** GHSA advisory for `@zvenigora/ng-eval-core`, published **after 0.13.0**; affected `<= 0.12.1`, **patched 0.13.0**. It covers dangerous function values callable past the name-based call sandbox (A35, A39) — including the routes through `this` and through the call/tag/`this.fn()` **receiver** — and the unsandboxed tag call (A36). It describes 0.12.1 as partial hardening: it refuses those values at the callee and at every read through the walk, and leaves the `this`/receiver routes open, which 0.13.0 closes. It names `new setTimeout("…")` under zone.js, recommends a Content Security Policy without `'unsafe-eval'` as the mitigation that holds in every version, and names the patched downstream releases **`eval-signals` 0.6.0** and **`eval-forms` 0.6.0** (*the reversal, fixed at step 10's gate*: **both floors rise to the 0.13 line** — `eval-signals`' `eval-core` peer to `>=0.13.0 <0.14.0`, `eval-forms`' to the same and its `eval-signals` peer to `>=0.6.0 <0.7.0` — so installing either patched release *is* taking the fix, rather than merely admitting it. The earlier plan widened the ceilings and left the floors, which would have let a fresh install of `eval-forms` 0.6.0 resolve an `eval-core` this advisory lists as affected, while that release's own CHANGELOG described behaviour only 0.13.0 has). It prints no route expression (§ 2). *Revised by Revision 7* (patched 0.12.1 → one advisory per shape); *by Revision 11* (the receiver route; the corrected CVSS below; the downstream names) | After 0.13.0's U2 |

**U3 is released from Revision 13's hold** (*Revision 15*). Revision 13 held it while R4 reached
past the guard as first designed. § 8 q7 chose (a), step 8 closed all four receiver forms, and
step 9's gate passed, so **0.13.0 is the patched version for every route U3 names** — the value
route and each receiver form. A host container stays outside U3: it is a documented limit in every
version, and the advisory says so rather than implying every route is shut. The advisory still
publishes only after 0.13.0 does, and still prints no route expression (§ 2).

U3's rating — **code execution is the impact, so it is not `C:L/I:L`** (Revision 11; it was "low" in
Revision 1, `C:L/I:L` in Revision 3). The **corrected provisional** vector is
`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N` (High–Critical). The **final vector and numeric score
are set in GitHub's advisory calculator at publish**; this is the provisional the entry commits to,
and `C:L/I:L` is not shipped.
- **C:H / I:H**: a successful attack runs arbitrary code in the consumer's origin, through `eval`,
  the `Function` constructor or a string timer — full read and write of whatever that origin can
  reach, beyond the evaluator's sandbox. Scored as FIRST scores a stored/DOM XSS that reaches script
  execution, not as an information leak.
- **S:C**: the impact crosses out of the evaluator's sandbox into the hosting origin.
- **A:N provisionally**, set to **A:H at publish if a reachable availability impact is confirmed**
  (arbitrary code can also hang or crash the page).
- **AC:H**: the attack needs the host to have placed a listed function in the context — and, for the
  `this`/receiver routes, ordinary built-ins too — a condition the expression's author does not
  control.
- **PR:N / UI:N**: reconsidered by the real trust model (Revision 11). The expression author is the
  attacker and is untrusted (PR:N), and the expression is evaluated when the victim's page processes
  it, with no interaction required (UI:N, where Revision 3 read UI:R). AV:N: the expression arrives
  from elsewhere.

These precondition and impact lines hold for the `this` and receiver routes as for the others: each
needs the host to have placed a listed function, and ordinary built-ins, in the context, which the
expression's author does not control.

After U3 comes a docs-only commit. It adds the advisory to `SECURITY.md`'s "Advisories for ng-eval"
table, a section otherwise unchanged since Phase 10 step 2, and its ID to the retired entries of A35,
A36 and A39.

**U3's outcome — published 2026-10-21 (UTC) as
[GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx)**,
a public repository advisory, read back with `gh api` rather than assumed:
- **Severity high, CVSS 8.7, `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N`** — the provisional
  vector above, unchanged at publish; `A:N` stands.
- **Affected and patched, three packages**: `@zvenigora/ng-eval-core` `<= 0.12.1`, patched 0.13.0;
  `@zvenigora/ng-eval-signals` and `@zvenigora/ng-eval-forms` `< 0.6.0`, patched 0.6.0. U3 named the
  downstream releases; the advisory lists them as affected packages in their own right, and
  `SECURITY.md`'s table carries a row for each.
- **Not yet in GitHub's global Advisory Database.** `gh api advisories/GHSA-qrqj-3445-3rjx` answers
  404, pending GitHub's review and ingest, so no Dependabot alert fires from it yet.
- **A CVE is requested**, and the advisory carries none yet. `SECURITY.md`'s table gains a CVE column
  for it, reading "Requested", so the ID lands there in a one-line edit when assigned.
  GHSA-jh43-xc7j-93c2's row reads "—": it has no CVE either.
- **The follow-up docs commit**: `SECURITY.md`'s table, and a section for the advisory in
  GHSA-jh43's form that points at the documented limits rather than restating them; the advisory on
  the retired status lines of A35, A36 and A39, and on the A35, A36, A39 and A42 index rows; "Work in
  flight" with the plan complete and Phase 10 resuming at its step 3. **The retired A39 entry's
  "held in the draft advisory" was false in both halves** once the advisory published — it is no
  longer a draft, and the probes are on the default branch — so the entry now names the advisory
  and the five specs that hold the probes; the A39 bullet in A35's entry points there. The quoted
  "entry as it stood" is kept verbatim, as the register keeps every quoted record, with a line saying
  where its claims now land. `CLAUDE.md` says this plan is complete and Phase 10 resumes at its
  step 3; the `step` skill is retargeted by Phase 10. It also carried two register items the release surfaced:
  [F16](../backlog.md#f16)'s `qs` audit line, and [F21](../backlog-retired.md#f21), the build-tooling
  findings, scheduled after Phase 10.
- **A plan correction: A42 is recorded as well.** The list above names A35, A36 and A39, written
  before Revision 16 added A42. The advisory names A42's defect — writing onto the context, and the
  context as a value — as additionally fixed in 0.13.0, so A42's status line and index row record
  the advisory with that qualifier: referenced in it, not its subject.

**This plan is complete**: steps 1–11 and U3.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | +10, +21, +6 and +21 in steps 1–4; steps 7 and 8 each set theirs at their gate; 0 in steps 5, 6, 9, 10 and 11 |
| `eval-signals` / `eval-forms` tests | (in the above) | Unchanged in every step (438 / 375); steps 7 and 8 rewrite pins 1:1, not additions |
| Perf | `internal/performance.spec.ts` | Green and untouched in every step; the gate |
| Timing | Step 4's harness against step 3's bundle | Step 4 only: green on its line, fixed at that step's confirmation gate (step 4, criterion 4). A red stops the step |
| Scope | `git diff --name-status` | The step's file list. No `R`. In steps 1–4 a non-spec `.ts` change outside `modules/eval-core/src/lib/internal/visitors/` is a stop-and-replan; in steps 7–8, outside the `internal/visitors/` files each step names |
| Surface | The built `.d.ts` against the previous release's tarball | Step 6: byte-identical to 0.12.0's. Step 10: `eval-core` byte-identical to 0.12.1's; `eval-signals` and `eval-forms` differ by documentation comments and peer metadata only |

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
| `this`, or a call/tag/`this.fn()` receiver, hands native code the context the library supplies | Certain with `Object` in the context (finding 8; Revision 11, R1–R3) | [A39](../backlog-retired.md#a39), steps 7 (value route) and 8 (receiver guard), in 0.13.0. Until then, a limit in `SECURITY.md` and the Security entry, with the mitigations first |
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
4. **What should `this` evaluate to?** ([A39](../backlog-retired.md#a39), step 7.) *Decided* (Revision 10),
   from M15: **by position, with a refusal**. `this` keeps resolving against the context as the
   object of a member read: `this.k`, `this["k"]`, `this.fn()`, and `This.k` under `caseInsensitive`.
   Wherever else it is evaluated, it throws.
   - **Who relies on it.** Three cases evaluate `this` outside a member's object, all in
     `eval-forms`: the D5 context-composition pins in `reactive/src/lib/field-schema.spec.ts` and
     `signals/src/lib/rules.spec.ts`, the second once per `caseInsensitive` arm. Each uses `this`
     only to obtain the `EvalContext` and inspect its `lookups`.
     - Every other use in the three projects is a member's object, in about fifteen spec files.
     - No README or `docs/` example evaluates `this` alone, and no public text states what it
       evaluates to.
   - **What breaks.** Each cell gives the failures in `eval-core` / `eval-signals` / `eval-forms`.
     The baseline had none, at 2509 / 438 / 375.

     | `this` outside a member's object | `this.k` kept by position | `this.k` reads the new value | Withholds the context's functions |
     | :--- | :--- | :--- | :--- |
     | the host's original object | 0 / 0 / 3 | 121 / 6 / 6 | no |
     | a frozen shallow view of it | 0 / 0 / 3 | 14 / 6 / 6 | no |
     | `undefined` | 0 / 0 / 3 | 272 / 56 / 6 | yes |
     | a refusal | 0 / 0 / 3 | 402 / 82 / 7 | yes |
     | an opaque frozen object | 0 / 0 / 3 | 142 / 30 / 6 | yes |

     - **With `this.k` kept by position**, every value fails the same three pins, and nothing else.
     - **Letting `this.k` read the new value** breaks the documented resolution
       ([B6](../backlog-retired.md#b6)) in all three projects, `eval-signals`'
       `signal-context.spec.ts` and `eval-forms`' `model-source.spec.ts` among them. So `this.k`
       stays.
     - **The two values that do not withhold** confirm this question's expectation, measured
       rather than assumed: neither closes the route on its own.
   - **Why a refusal**, among the three values that withhold: it fails where `this` escapes, with a
     message, as the funnel's refusals do. `undefined` and an opaque object fail the same three pins,
     but they change a host's result silently.
   - **The route.** A39's probes P1, P2 and G1 each reach a listed function on 0.12.1's bundle, so
     the probes are valid. Each is refused on the prototype's bundle, where `this` escapes (M15). The
     probes are held in the draft advisory (§ 2).
   - **Not measured by M15**: three receivers through which a function receives the `EvalContext`
     without the expression evaluating `this`. They are a bare call's, a bare tag's, and `this.fn()`'s
     for a key a lookup resolves. Revision 10 gated them at step 7's criterion 4; **Revision 11
     measured them through the real service and all three reached** (R1, R2, R3), so positional `this`
     alone does not close A39. The receiver is now § 8 q6, and step 8 closes it with a guarded view.

   *Until Revision 10 this question read as follows.* **Measure first, then decide.**

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

     Read case by case: which assertions fail, and whether A39's probes close against it. **Every
     candidate is measured before step 7 is specified.**

   **One expectation to measure, not assume.** A candidate that returns an object still holding the
   context's listed functions does not, on its own, close the route; only one that withholds them, or
   refuses, does. The host's original object and a plain shallow view do not withhold them, so each
   candidate is read twice: for what it breaks, and for whether it closes the route. (The probes are
   held in the draft advisory, § 2.)

   `this.k` resolves `k` against the context today (`member-expression.ts`), independently of what
   `this` alone evaluates to. Whether that stays is part of the decision.

   The target is decided from the measurement, as a plan revision before step 7 is specified.
5. **The release shape: (i) 0.12.1 then 0.13.0, or (ii) 0.13.0 alone?** Added by Revision 6.
   *Decided 2026-10-16* (Revision 7): **(i)** (§ 2). Steps 7–11 run consecutively after step 6, ahead
   of Phase 10's step 3, so the window in which a public version carries the open route is as short
   as the work allows.
6. **The receiver: how is A39 closed when `this` alone does not?** *Added and decided by Revision 11
   (decision A), from a measurement taken first — the pattern § 8 q4 set.* The question arose because
   step 7's receiver gate (q4's "not measured") reached on all three receivers.
   - **What was measured, by ID / counts, through the real `EvalService`** (prototypes reverted, tree
     clean; the route expressions are held in step 8's spec, not here, under § 2):
     - **the open route**: R1 (a bare call's receiver), R2 (a bare tag's), R3 (`this.fn()` for a
       lookup-resolved key) each reached a listed function on 0.12.1, past the funnel and past
       positional `this`.
     - **an inert receiver** (a frozen null-proto object): P1/P2/G1/R1/R2/R3 all refuse, but
       `eval-signals` breaks *functionally* — a source function's documented `this.push(...)`
       throws, so the async signal stops reading its source (0 / 2 functional failures in
       `eval-signals`, plus identity pins).
     - **a guarded receiver** (forwards `push`/`pop` to the real context; exposes nothing else of it;
       `ownKeys` → `[]`; null prototype): P1/P2/G1/R1/R2/R3 and three
       proto/`Reflect` bypasses (B1/B2/B3) all refuse, **zero residual**, and `eval-signals`'
       functional behaviour is **preserved**. The only failures are identity pins: `eval-core`
       `scope-this` (e) and tag T6, and `eval-signals` `signal-context` ×2 — four in all, which
       step 8 rewrites to assert the guard contract positively. The write policy keeps the real
       context, so tag T9 and `member-write-policy.methods.spec.ts` pass unchanged.
   - **Decided: the guarded receiver** (step 8). It closes the receiver route with no residual and no
     bypass, and preserves the one documented consumer use of the receiver `this` — a source function
     calling `this.push`/`this.pop` (`eval-signals`' README).
   - **Consumer-observable, so a breaking downstream release.** That the receiver `this` is the
     `EvalContext` is documented to `eval-signals` consumers (the README resolution bullet on
     `EvalContext.push`/`pop`), so narrowing it is breaking: **`eval-signals` 0.6.0**, and
     **`eval-forms` 0.6.0** (a forced `eval-signals` floor raise). Both fold into step 10's single
     release commit.
   - **Answered for three receivers, not four.** The guard closes R1, R2 and R3 and does not reach
     R4, which q7 now carries.
7. **R4: what scope closes the receiver route, now that the guard does not?** *Added by Revision 13,
   from the measurement step 8's gate required (M16).* **Decided 2026-10-18: (a)**, from the
   measurement q7's own text asked for (M17). The origin carry folds into step 8, which completes
   under it.
   - **What M17 measured**, before the decision: the prototype refuses R1–R4 and every structural
     way out, with no new reach; six assertions change, of which **two are functional** — a method
     held directly on the context, called as `this.fn()`, reaching its siblings through its own
     `this` — and four are the identity pins already listed as breaking. `eval-forms` is untouched.
   - **Why (a) despite the two.** They are the semantics the change is about, they are the only
     two in three suites, and the behaviour has a migration that this release does not touch: give
     the object a named scope with an explicit `thisArg`. Step 8's spec pins that migration beside
     the refusals.
   - **The read answers with a refusal, not undefined** (condition 1, measured): throwing turned no
     pre-existing case red in any of the three projects, so it costs nothing a silent undefined
     would have saved, and it names the cause at the read. **W4 resolves with it** — the write
     throws too, from the frozen target — and the CHANGELOG states both.

   The measurement is in M16 and the stop is in Revision 13. Three options were weighed.

   - **(a) Carry the receiver's origin out of `evaluateMember`, so the guard covers `this.fn()`
     too.** The route's real discriminator is not "the receiver is the context" but "the evaluator
     chose this receiver out of the context's resolution chain". `evaluateMember` holds that fact
     and discards it: it returns `thisValue ?? object`, so `callMember` can only recover the case
     where `getThis` answered nothing. Carrying it out — a further slot, or the two values returned
     separately — lets one test cover all four receivers.
     - **Cost: it changes `this.fn()`'s semantics for every context function**, not only on the
       route. `getThis` answering with the original is what lets a host's own method reach its
       siblings through its `this`, which is ordinary documented use, so guarding it narrows a
       method's view of its own object.
     - **It needs its own measurement of downstream breakage before it is specified**, on the
       pattern § 8 q4 set: every expression in the three projects that reaches a method as
       `this.fn()`, read for what it asserts, and all three suites under a prototype. The two
       `eval-forms` suites and `eval-signals`' are the witnesses. No count is predicted here.
     - It is the only option that makes § 9 item 6 true as first written.
   - **(b) Close no receiver form, and keep the whole receiver route a documented limit.** Step 8's
     code is dropped, and `SECURITY.md` keeps the receiver beside a host container under the limits
     rather than promoting it.
     - **Cost: 0.13.0 then closes the value route only**, and the advisory names the receiver as
       unpatched. A consumer who reads "A39 closed" gets a narrower fix than the entry describes, so
       A39 does not retire and A35 does not retire with it.
     - It is the cheapest in work and the most expensive in what ships: the route stays open in a
       published version with an advisory that says so.
     - It costs nothing already measured: step 8's probes stand as the record of what a guard
       would buy.
   - **(c) Ship the guard as it stands, with the asymmetry.** **Rejected by the maintainer**
     (Revision 13), recorded only as the option that was weighed. It would close three receivers,
     leave the fourth reachable for the same key, and ship documents that say the route is closed.

   **Owed under every option**, so none of it is an argument for one:
   - **W4's decision**, and a line in the breaking entry either way: trap `set` on the view and drop
     the write, or keep the throw a frozen target gives. Under (b) the view goes away and W4 with
     it.
   - **W1, W2 and W3**: structural pins per receiver in the B style, so a case fails because the
     context was reached rather than because a later read of nothing threw; and a case for the
     cache's identity contract.
   - **C2's inventory — cleared by step 9** (*Revision 15*). `SECURITY.md`'s two were narrowed in
     Revision 13's own commit and are now protections. `docs/backlog.md` ×5: the plan summary and
     the 0.12.1 Publication status row are corrected, A35's index row is retired, and the shape and
     disclosure notes moved with their entries into `backlog-retired.md`'s "entry as it stood",
     where they are history. `dangerous-values.ts`'s comment now names the closing modules. **The
     published 0.12.1 CHANGELOG section stays as written** — it is history — and only its link
     targets moved, as the retirement requires.
   - **The advisory is released from the hold** (§ 5): 0.13.0 patches every receiver form.

---

## 9. Contract after this lands

*Revised by Revision 6.* Items 1–4 hold once step 4 lands. Item 6 holds once steps 7 and 8 land
(*Revision 11*: the value route and the receiver).

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

   **Until steps 7 and 8 land**, also not provided: protection for A39 ([A39](../backlog-retired.md#a39)),
   by which native code reaches a listed function the context holds — through `this` as a value and
   through the call/tag/`this.fn()` receiver. Its detail is held in the draft advisory under § 2's
   disclosure rule.
6. **Once steps 7 and 8 land**, native code can no longer reach the context either way (*Revision 11;
   narrowed by Revision 13 while R4 reached; restored by Revision 15*).
   - **The value route** (step 7): `this` evaluates only as the object of a member read, as in
     `this.k`, `this["k"]` and `this.fn()`. Anywhere else it is refused (§ 8 q4, Revision 10).
   - **The receiver** (step 8, under § 8 q7's option (a)): every receiver the evaluator resolves out
     of the context's own chain — a bare call's, a bare tag's, and `this.fn()`'s for any key the
     context resolves, R4's included — is a **guarded view**: `push`/`pop` resolve against the real
     context, every other read throws a named refusal, a write is refused, and no field, accessor or
     prototype path is reachable. The member-write policy keeps the real context as its write target
     (§ 8 q6).
   - **No view is retained** (*Revision 15*, M18): each call gets its own, so a function must not key
     anything on its `this`.
   - **The context is not writable, and one reached as data is inert** (*Revision 16*,
     [A42](../backlog-retired.md#a42)): a member write whose target is an `EvalContext` throws
     `Write to the evaluation context is blocked for security reasons`, by class, whether the
     evaluator makes it or a native writer the expression calls does; a write to a key the context
     **resolves** is unchanged. A member read whose object or value is a context other than the
     walk's own throws `Access to the evaluation context is blocked for security reasons`. Without
     this the receiver guard was incomplete: the evaluator called a planted method itself, which no
     view sits in front of.
   A host container (finding 3) stays a limit. The receiver `this` is consumer-observable, so this
   ships as a breaking release — `eval-core` 0.13.0, `eval-signals` 0.6.0, `eval-forms` 0.6.0.
