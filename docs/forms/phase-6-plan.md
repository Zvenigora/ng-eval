# Phase 6 Plan — the `/signals` entry point (`@zvenigora/ng-eval-forms/signals`)

**Date**: August 24, 2026

**Revision**: 19 — **a one-item amendment, made during step 7**, widening that step's own file
list and gating what it adds. A 18→19 diff also shows § 3.8.1's closing paragraph rewritten,
which is **not** this revision's item: that rewrite is revision 18 item 3 being *executed* by the
step it was assigned to, and the new text self-attributes inline.

1. **Step 7's README deliverable gains three prose claims this release falsifies, and a fifth
   exit criterion that greps for them.** Found by restating the step against the file before
   editing it. All three sit *adjacent to* structure the existing criteria already reach, and
   that adjacency is the pattern rather than a coincidence — **it is § 0.2.1 in a documentation
   register**: a criterion aimed at a gated artefact leaves the sentences around it ungated, and
   the sentences are the other half of the same deliverable.

   - `README.md:3-4` — "Angular form field properties — `visible` and `text`". `/signals` ships
     `disabled` as well (step 5). Adjacent to nothing gated at all, which is why it survived
     eighteen revisions.
   - `README.md:71-77` — the prose **below** the `Versions` JSON: "`/reactive` — everything this
     release ships" and "**When** `/signals` **arrives** it will require Angular 22 or later."
     Revision 7's criterion reads "the README's `Versions` block matches
     `modules/eval-forms/package.json` exactly", which reaches the fenced JSON and stops at its
     closing fence. Same section, same deliverable, two sentences past the gate.
   - `README.md:400-407` — "What is not here" still lists `disabled` as deferred and calls
     `/signals` "the **future** `/signals` entry point". Adjacent to the entry-point table's
     gated row, one section away.

   **Gated, not merely fixed.** Revision 18 assigned step 7 four README edits and gave three of
   them criteria; a fifth criterion — one grep over the three false claims, returning nothing —
   is what keeps these from being a deliverable with no gate, which is the shape the other three
   were rescued from. § 4's step 7 carries both halves.

2. **Step 7's file list gains two files its own diff falsified, and this is § 0.2.2 rather than
   tidying.** The kill-list check asks whether a claim died everywhere or only where the finding
   named it. Step 7 killed two claims and left each alive in one other place:

   - **`signals/src/lib/rules.ts:24-27`** says a per-registration `caseInsensitive` misses "the
     factory's memo and the context `createRuleContext()` builds" because both "are made once,
     at `createExpressionRules` time". Step 7's review established that the *context* is minted
     per registration and only its **options** are fixed at factory time, and the README was
     corrected accordingly — leaving a source comment that contradicts the shipped README on the
     one subject a consumer is most likely to check. **It is the worse copy of the two**: a
     doc comment is what an editor shows on hover, so it reaches a reader who never opens the
     README, and nothing in this phase's gates compares the two.
   - **`reactive/src/lib/readme-examples.spec.ts`'s docblock** claims it executes the README's
     runnable `ts` blocks. Step 7 moved one `/reactive` block — the `/signals`↔`/reactive`
     asymmetry — into the `/signals` spec, because that claim is a pair and splitting it lets
     either half drift. So the docblock over-claims by exactly the block this step relocated.

   **Neither is a behaviour change** and both are one- or two-sentence edits; they are named
   here rather than left to a later step because the next step to edit either file is in another
   phase, and § 0.2.3's disposition only works when such a step exists.

**Revision**: 18 — **a three-item amendment, made during step 6.** The first records a reading;
the second corrects a claim in § 3.8.1 that a later reader could not have resolved; the third
records a false sentence in the same subsection and hands its correction to step 7 rather than
rewriting a shipped decision's justification inside step 6.

1. **Step 6's guard is called from the shared `prepare`, and revision 16 item 1 does not
   apply to it.** That item, and revision 17 item 1's rule, reject "the wrapper is shared" as
   a substitute for a per-registrar case. The discriminator revision 17 states is whether the
   criterion's subject is *a path Angular owns* — and this one is not. The guard runs
   **entirely inside `prepare`, at registration, and throws before any Angular primitive is
   reached**: in the rejecting case `hidden`, `metadata` and `addDisabledReasonRule` are never
   called, so there is no third reducer, no second polarity and nothing downstream that could
   diverge between the three. Contrast step 4's invocation count and step 5's write-error
   bypass, whose values arrive *through* those three primitives and could each fail
   differently.

   **This is a fact about where the guard sits, not a licence to argue from a shared wrapper.**
   Anything the returned `LogicFn` does is on Angular's path and stays registrar-level. And
   step 6's three-registrar assertions ship regardless: a guard wired into `evalVisible` alone
   is a reachable wrong implementation, and excluding it is the specs' job even when the
   shipped structure makes it unlikely.

2. **§ 3.8.1's "the name set is seven" is corrected: the predicate is normative and the list
   was illustrative.** The check is
   `Object.prototype.hasOwnProperty.call(Object.prototype, name)` — § 3.8's own wording ("an
   own property of `Object.prototype`") and `field-schema.ts:172`'s precedent — and
   `Object.getOwnPropertyNames(Object.prototype)` is **twelve**, not seven: the seven named
   there plus `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__` and
   `__lookupSetter__`. A list of seven standing beside a predicate matching twelve leaves the
   next reader unable to tell which is authoritative, which is § 0.2.1's defect in a
   documentation register. § 3.8.1 now says the seven are the names a form author might
   plausibly type and that the predicate decides, and step 6 gains an exit criterion asserting
   one name the seven omits — so the wider reach is **gated rather than incidental**.

3. **§ 3.8.1's "`/reactive` **throws** on this today" is false, and step 7 owns the fix.**
   Found by step 6's review. `/reactive`'s checks are on **field and control names**
   (`field-schema.ts:172`, `:214`), not on the expression — so `visible: "constructor"` over a
   schema of `city`/`country` does **not** throw there either; it renders the data-less field,
   exactly as `/signals` did before this step. § 3.8's residual paragraph states this
   correctly and § 3.8.1's closing paragraph contradicts it, which is the shape § 0.2.1 exists
   for: two normative sentences, one true.

   **The decision to ship the check here is unaffected** — Q11's silently rendering field is
   its own justification, and § 3.8's own argument never rested on this sentence. What the
   sentence gets wrong is the *reason*: the entry points do not currently agree, and the
   check makes `/signals` **stricter** than `/reactive` rather than equal to it. That is a
   defensible outcome and a different one from what § 8.2's symmetry principle claims here.

   **Not rewritten in step 6.** Re-deriving a shipped decision's justification is not this
   step's deliverable, and the sentence has a dependent: step 7's README caveat is written
   from the looser reading. Step 7 edits both, so it corrects them together — its file list
   already names `README.md`, and it gains § 3.8.1's closing paragraph.

   **And the asymmetry is consumer-visible, not only a plan defect — which changes what step 7
   owes the README.** The same authored rule, `visible: "constructor"`, now **throws under
   `/signals`** and **silently renders a data-less field under `/reactive`**. So it cannot be
   documented as a `/signals` caveat alone: the consumer who does not know is the one reading
   **`/reactive`'s** documentation, where the behaviour is the silent one. Step 7 states it
   plainly in **both** entry points' sections — under `/signals` as "this is rejected", under
   `/reactive` as "this is *not* rejected, and here is what it does instead".

   **Whether `/reactive` should gain the same guard is a Phase 8 question and step 7 does not
   decide it.** It is a behaviour change to a released entry point — an expression that
   registers today would start throwing — so it needs a phase, a major-version decision and a
   migration note, none of which belong in a docs step. Step 7 logs it to `ROADMAP.md` and
   stops there.

**Revision**: 17 — **a two-item amendment, made during step 5**, both recording a reading
rather than changing a decision.

1. **Step 5's "as step 4" is read as *the harnesses*, not as the eleven bullets.** The
   discriminator is registrar-level versus factory-level. Step 4's read-back, invocation-count
   and error-policy criteria are *about a registrar*, so `evalDisabled` owes each of them its
   own case; schema reuse, § 3.5.3's option-resolution characterisation and the compile-once
   count are *about the factory*, are already pinned by step 4's fixtures, and could not fail
   differently for a third registrar — re-running them under a new registrar's name would add
   assertions that cannot go red, which is § 0.2.1's defect wearing a duplicate's clothes.
   Written down because "as step X" is exactly the shorthand that means something else to the
   next reader, and this document's own history is that an unstated reading survives review.

   **One consequence, found by step 5's review and worth the sentence**: the "it is about the
   registrar" test is not always obvious from the criterion's wording. Step 5 first shipped
   `evalDisabled` *without* the assigning-expression case, reasoning that the bypass lives in
   `applyErrorPolicy` and is therefore factory-level — which is the same "the wrapper is
   shared" substitution item 1 of revision 16 exists to reject, made about the very registrar
   that revision introduced. `disabled` registers through `addDisabledReasonRule` and is a
   third Angular primitive, so the case is registrar-level and is now present. **The rule: if a
   criterion's subject is a path Angular owns, it is registrar-level, however shared our own
   half of it looks.**

2. **Step 6's file list gains `signals/src/lib/model-source.spec.ts`.** Its comment at `:76-77`
   says "this step's registrars are stubs" in the present tense, which stopped being true in
   step 4 and is now false for all three. Deferred rather than fixed in step 5 because step 5's
   file list does not name it and § 0.2.3's own consequence puts the correction in the next step
   to edit that area — the same disposition step 5 inherited for
   `rules.model-source-count.spec.ts`. It is prose only: no assertion in that file depends on it.

**Revision**: 16 — **a three-item amendment, made after step 4 and before step 5.** All three
come from step 4's review, and the third is the general form of the second.

1. **Step 5's file list gains `evalText`'s two missing cases.** Step 4 asserted the invocation
   count and the write-error bypass through `evalVisible` alone, on the argument that `prepare`
   is structurally shared. That is an argument that they would pass rather than evidence that
   they do — § 0.2's own subject — and `metadata` is a different Angular primitive with its own
   reducer. `evalText` is also the registrar whose failure renders a *wrong string* rather than
   hiding a field, which is the harder one to notice, so it is the one least well served by an
   argument from symmetry.

2. **Step 5's file list gains the correction to `rules.model-source-count.spec.ts`.** Its
   comment names a defect — a factory calling `createModelSource` per registrar — that neither
   of its fixtures can reach, because neither registers a rule.

3. **§ 0.2 gains a fourth failure mode, § 0.2.3, because item 2 is not a mistake anyone made.**
   That spec was sound when step 2 wrote it: with the registrars stubs that threw, "per
   registrar" had no reachable form its count of 1 did not catch. **Step 4 made a new wrong
   implementation reachable, and the probe stopped discriminating without being edited** — no
   red at any point in between, and § 0.2.1's check passes on it before and after, because
   there is a named assertion in a named file the whole time. The rule is therefore about the
   step that *enlarges* the space of reachable implementations, not about the spec that decays:
   when a stub becomes a body, re-run the earlier steps' probes over the code that changed
   subject. Step 5 carries that re-run as a deliverable, since `evalDisabled` stops being a stub
   there.

**Revision**: 15 — **a one-item amendment, made at the start of step 4**, and the item is a
question this plan has carried unanswered since revision 1 rather than something step 4
introduced.

**§ 3.5 gains 3.5.3, `ExpressionRuleOptions` resolution, and step 7's README list gains its
caveat.** `ExpressionRuleOptions` arrives at two levels — the factory and each registration —
and no revision said how they combine, while the type's own docblock (shipped in step 2)
already promised a registration "may override". The rule is registration-wins per key. What
made this worth a revision rather than an implementer's judgement call is that the rule is
**exact for `onError` and partial for `eval.caseInsensitive`**: § 3.6 binds both the memo *and*
the rule's context to the factory, so a per-registration `caseInsensitive` moves the walk and
nothing else, and one expression then resolves its property names under one casing rule and its
identifier keys under another, silently. That is Q4's failure mode reached through the
options instead of through the memo — a silent partial failure on published surface, which is
the class § 0.2 exists to catch, so it is stated in § 3.5.3, pinned by a characterisation case
in step 4, and carried to the consumer in step 7. § 3.5.3 also records the throw that was
considered and rejected, and why, so a later reader inherits the decision rather than
re-opening it.

**Revision**: 14 — **a two-item amendment, made after step 3 and before step 4.** Both items
are things step 3 found and step 3's own deliverables had no room for.

1. **§ 3.4 gains the boundary on its own guarantee, and `ROADMAP.md` gains the defect
   underneath it.** The guarantee is that `SignalContextWriteError` bypasses the error policy;
   it does not hold for an assignment nested inside a call, because `safeCall` re-raises a
   fresh `Error` for anything a callee throws
   (`internal/visitors/call-expression.ts:126-128`), so the class is gone before
   `applyErrorPolicy` sees it and the write is routed to `undefined`. Measured in step 3 with
   a temporary probe. Top-level assignments — the shape a rule would actually take — are
   unaffected, which is why this is a boundary rather than a hole.

   Recorded in three places on purpose, and the split is the point: **§ 3.4** because a
   section stating a guarantee has to state where it stops; **`ROADMAP.md`**'s deferred
   visitor defects because the fix is `eval-core`'s and the blast radius is *every* custom
   error type crossing a call frame, not this one class; and **step 7's README list** because
   the consumer-visible symptom is a silently blank field with nothing in the console, and
   nothing else in the phase would put that in front of a consumer. § 2 keeps this phase
   additive to `eval-core`, so it is deferred rather than worked around — and matching on the
   wrapper's decorated message would buy the fix at the price of coupling this package to
   another library's error wording, which is the coupling `ROADMAP.md` gives as the reason
   that wrapper is a defect in the first place.

2. **Step 7's `CHANGELOG.md` row and its exit criterion now name `applyErrorPolicy`.** They
   named only the `peerDependencies` addition, and `applyErrorPolicy` is the *only* thing
   this phase changes about the already-released primary entry point — everything else lands
   behind `/signals`, which no current consumer imports. A release note that omits it tells an
   existing consumer their surface is untouched. The criterion is amended with the row rather
   than after it: an obligation written where it reads naturally and gated nowhere is the
   defect § 0.2.1 exists to catch, and it is what left this missing through six revisions.

**Revision**: 13 — **a three-item amendment, made during step 3**, and items 2 and 3 come from
running the step rather than reading it. One is a file the step could not have been completed
without; the other two are a mechanism claim this plan asserted twice and that step 3 measured
to be false.

1. **Step 3's file list gains `signals/src/lib/evaluate-rule.spec.ts`.** Both new-file rows
   were implementation; the criteria beneath them are entirely behavioural, so the list as
   written described a step that could satisfy none of them. This is the same shape as C3 one
   step over — there the criteria had no reachable *subject*, here they had no file to live
   in — and the fix is the same: name the file rather than leave the implementer to invent
   one. The placement is not free either, and the row says why: both policy arms need a walk,
   and the write arm is reachable only through the context `createFieldContext` builds, which
   exists in the adapter and not beside `error-policy.ts`.

   No criterion changes. This adds nothing to the step's scope: it names a file the step could
   not have been completed without.

2. **§ 3.4's and § 8.1's claim that a type-only import "would compile and the guard would
   silently never fire" is false, and step 3 measured it.** `instanceof` is a value position,
   so `import type { SignalContextWriteError }` is **TS1361** — it fails `build:production`
   and gate 7, and under ts-jest's transpile path, which does not report type diagnostics, the
   elided binding raises a `ReferenceError` inside the `catch` that reddens **both** policy
   arms. There is no configuration in this workspace under which that edit is quiet.

   The claim mattered because § 3.4 built an argument on it — the import's form is
   "load-bearing", and "step 3's exit criterion is what catches that". The criterion is worth
   keeping and the reason is not: what the write-error arm actually covers is the bypass's
   **behaviour**, including the one failure mode no import syntax prevents — two resolved
   copies of `@zvenigora/ng-eval-signals` giving two constructors, for which `instanceof` is
   silently false. That is why the arm throws the error across the real package boundary
   instead of constructing one.

   This is § 0.2.1's third failure mode in the plan's own prose: an answer attached to
   nothing that can fail. The mutation § 3.4 named as the hazard cannot reach a green suite,
   so the criterion defended against a thing that was never possible, while the mutation that
   *is* possible went unnamed. § 8.1's settlement is unaffected — the helper still belongs in
   the core, for the one-implementation-for-both-adapters reason, which never rested on this.

3. **Step 3's spec carries two arms the criteria do not require, and the reason is that the
   docblock claims more than the criteria do.** `applyErrorPolicy` re-throws in **every** mode,
   and the criteria reach only `'undefined'`. A fast path for function policies placed ahead of
   the `instanceof` passes both required arms and swallows a write error under a handler —
   measured, and caught by the added arm alone. The pair is asserted with the handler at zero
   calls, so "the bypass re-threw it" is distinguishable from "the handler re-threw it", plus
   an ordinary-error case under the same handler so the zero-call assertion cannot pass
   vacuously.

   Step 3 also asserts that `evaluateRule`'s `options` reach the **walk** and not only the
   context. `EvalState.fromContext(context)` — the argument dropped — leaves every other case
   in the file green, so without this the parameter step 4 forwards `options.eval` into is
   uncovered wiring, and `caseInsensitive` property-name correction would be dead at this
   entry point with no test naming it.

**Revision**: 12 — **a one-item amendment, made between steps 2 and 3.** Revision 11 measured
that `build:production` does not compile `model-source.ts` or `rules.ts`, recorded it as a
warning to step 4, and explicitly declined to add a gate because "adding a gate mid-phase is a
plan change". This revision makes that plan change instead of carrying the hole for another
step.

1. **§ 6 gains gate 7, "unpublished sources type-check", applying from step 2.** One command —
   `npx tsc -p modules/eval-forms/tsconfig.lib.prod.json --noEmit`, filtered to
   `^modules/eval-forms/` — because `tsc` honours `tsconfig.lib.json`'s `include` where
   ng-packagr, compiling from the entry file, does not. Steps 2 and 3 otherwise run with lint
   and Jest as their only compile gates over these two files, and `tsconfig.spec.json` is the
   more permissive of the two configs.

   **The filter is load-bearing and is stated in the row rather than left to the runner.**
   Unfiltered, the command exits non-zero on **38** pre-existing `TS1205` errors in `eval-core`
   sources reached through `paths` — none in this package, all older than this phase. Shipping
   it that way would recreate exactly what revision 10 removed from gate 3: a gate with a known
   standing hit, which is worse than no gate. Calibrated against `^modules/eval-core/`, where
   the same grep returns all 38, so it is not a filter that can never fire.

   It lands green today and is redundant with `build` from step 4 on for these two files —
   which is the argument for adding it now rather than at the step that would have caught the
   errors late.

**Revision**: 11 — **a step-2 amendment, not a review round.** One correction, and it comes
from running the step rather than reading it.

1. **Step 2's two new files are never seen by the production compiler, and the plan did not
   say so.** Gate 6 keeps `createExpressionRules`, `ExpressionRules` and
   `ExpressionRuleOptions` out of the emitted `.d.ts` until step 4, so
   `signals/src/public-api.ts` is not edited in steps 2–3 and neither `model-source.ts` nor
   `rules.ts` is reachable from the entry file. ng-packagr compiles **from the entry file**,
   not from `tsconfig.lib.json`'s `include`. Measured: with
   `const probeTypeError: number = 'not a number'` in `createModelSource`'s body,
   `nx run eval-forms:build:production --skip-nx-cache` is **green**. So § 6's "every step:
   lint, test, build" silently covers less than it names for two steps, and **step 4's barrel
   edit is where two steps of source first meets `tsconfig.lib.prod.json`** — Phase 3 step 3's
   `TS7053` is the precedent for what surfaces at exactly that transition. Step 2's bullet list
   records it, and step 4 should budget for it.

   This is § 0.2's third failure mode again, the one revision 10 added: the claim "build is a
   type-check" is true of every *other* file in this package and false of these two, and
   nothing in the gate's wording distinguishes them. **A cheaper gate exists and is not yet
   adopted** — `npx tsc -p modules/eval-forms/tsconfig.lib.prod.json --noEmit` does honour the
   `include` and reports zero errors in `modules/eval-forms` today. Left as a note rather than
   a new § 6 row, because adding a gate mid-phase is a plan change and this revision is an
   amendment. — **Superseded by revision 12, which makes that plan change: it is gate 7.**

**Revision**: 10 — **a step-1 amendment, not a review round.** Step 1 was executed against
revision 9 and its three corrections all come from running the plan rather than reading it,
which is the outcome § 0.2 has been arguing for since revision 4.

1. **Step 1's `moduleResolution` bullet stated a false claim that had been reached by
   measurement.** "Without it this step cannot pass its own test target" — `tsc` really does
   report `TS2307` under `node10`, and the test target is not `tsc`: ts-jest does not enforce
   type diagnostics, and `nx test eval-forms` is green under `node10` with both new specs in
   place. Five pre-existing specs import `@angular/core/testing`, which `node10` also cannot
   resolve, and have been green since Phase 4. The bullet now lists the grounds that hold —
   `tsc` cleanliness for editors and any later type-aware check, the `TS5107` deprecation, and
   parity with `eval-core`, which already sets `bundler`. **§ 0.2 gains the third failure mode
   this is an instance of**: a claim can be false and still have been arrived at by
   measurement, if the wrong artifact was measured. Neither § 0.2.1 nor § 0.2.2 catches it,
   because the claim is gated, single-sourced, and wrong.
2. **Gate 3's third grep now matches an `import`, not a bare name.** Run for real, the name
   grep returned one hit — a pre-existing block comment at
   `reactive/src/lib/field-schema.ts:431` naming `CompilerService` as eval-signals' internal.
   A gate with a known standing hit is one people learn to ignore, and step 3 is where that
   bites. The import form makes the row a subset of § 5's import list and is calibrated
   against `eval-signal.ts:2-3`, a real multi-line import it does find.
3. **Step 1's file list carries two specs**, which its own third exit criterion had required
   since revision 1: `@nx/enforce-module-boundaries` rejects a package-name self-import within
   one entry point, so the spec proving the `paths` mapping cannot be the co-located one.

**Also recorded from the step**: the boundary rule resolves the specifier before deciding, so
a spec written test-first against a not-yet-existing `public-api.ts` fails the rule for a
reason that disappears when the barrel lands (`runtime-lint-utils.js:330-344`) — a mechanic
worth knowing before step 2 writes its specs first again.

**Revision**: 9 — amended after a review of revision 8, and **the last revision before step 1**.
No spike; no design changed. Three blockers, four warnings, and one decision revision 8 had
described instead of making.

1. **C1 — `acorn` survived revision 8's own kill, in two normative sections.** § 2's scope list
   and § 5's import justification both still said `acorn` *and* `acorn-walk` are added, while
   the header, § 3.8 and step 6 said `acorn-walk` alone. Step 6's manifest criterion checked
   *presence* only, so a manifest carrying both passed it; it now has an absence arm.
2. **C2 — "the memo is per form" survived in step 2**, the step that establishes the memo's
   lifetime, plus § 1.2.10's compile count. Revision 8's sweep caught three sites of this and
   missed three.
3. **C3 — § 5's `guardIdentifiers` row named a type `eval-core` does not export.** `AnyNode` is
   imported from `acorn` inside the published `.d.ts` and is absent from its export clause,
   which publishes `AnyNodeTypes`. Written as stated, the signature forces
   `import type { AnyNode } from 'acorn'`, `@nx/dependency-checks` flags an undeclared `acorn`,
   and the shortest fix is the peer § 3.8 rejects — C1 and C3 converging on the manifest the
   design refuses. Now `ReturnType<typeof parse>`, which needs no import.

**W2 is decided rather than described, in § 3.8.1: the guard over-rejects, deliberately.** An
arrow's own frame *is* safe — `EvalContext.get` resolves `scopes` at step 1 and `original` at
step 2, so a bound `valueOf` shadows `Object.prototype` and resolves correctly — while a model
key is unsafe for the mirror-image reason, arriving through `lookups` at step 4, *behind*
`original`. Rejecting a bound parameter therefore refuses an expression that would have worked,
and it is taken anyway: the alternative is a second copy of `eval-core`'s frame logic that must
track two scope-pushing visitors this phase cannot change and fails by *under*-rejecting when
it drifts, and the costs are asymmetric — a named error at registration against Q11's silently
rendering field. Step 6 gains the arm that separates the two implementations, which both passed
revision 8: **`'[1].map(valueOf => valueOf)'` throws**, and `'[1].map(valueOf => 1)'` registers,
because `acorn-walk` never visits a binding as an `Identifier`.

**W1, W3, W4**: gate 6's absent-list gains `guardIdentifiers`, which was revision 8's stated
reason for adding the § 5 row and was left undone; **risk 13** is new, covering step 6's throw
path and the `/reactive`-vs-`/signals` timing difference — the only new failure mode this phase
introduces had no row, so § 7's audit ran to completion over a table that did not mention it;
and step 7's README deliverable becomes the three edits it actually is, since the "designed but
not built" claim is prose at `README.md:53-55` and not a row.

**§ 0.2.2's runs are now recorded in the document.** Six sweeps, with their greps and their
survivors, including the two revision 8 owed and did not run. That omission *is* C1 and C3, and
it made revision 8 the fourth consecutive revision to leave its own claim standing. Both live
survivors sat in normative sections, which is the difference between a stale sentence costing a
reader a moment and one sending an implementer to add a dependency the design rejects.

**Revision**: 8 — amended after a review of revision 7. No spike: all three blockers were
internal inconsistencies or ungated criteria, none of them a mechanism question.

1. **C1 — § 3.2.1 still asserted the premise § 3.6.1 and risk 7 refute.** Revision 7 rewrote
   § 3.6 and risk 7 around Q7/Q9 and left the section it reasoned *from* saying "it closes over
   one model, so it cannot be shared by two forms with different models". § 3.2.1 is what
   steps 2 and 4 are implemented from, so an implementer reading it and not § 3.6.1 would
   conclude Q9 cannot happen and that step 4's characterisation test covers an impossible case.
   Rewritten, with the two counts that inherited the error: **contexts and compiled callbacks
   are per rule per `form()`**, not per rule, and **the memo is per factory**, which equals per
   form only in the supported shape.
2. **C2 — step 6's guard was gated through one registrar of three.** The deliverable says every
   registrar calls it; every criterion went through `evalVisible`. The gap it left is § 3.8's
   worst case: `evalText(p.city, 'constructor')` renders `"function Object() { [native code] }"`
   into the field through `toText`, with the suite green. Now asserted through all three.
3. **C3 — step 6's manifest criterion passed before its own deliverable existed.** `npm ls
   acorn-walk` resolves from the workspace root today: the root declares `acorn-walk` directly
   and has no `workspaces` field, so `modules/eval-forms` is not an installed package. Replaced
   with a read of the artifact a consumer receives — `dist/modules/eval-forms/package.json`'s
   `peerDependencies` — which ng-packagr populates and which gate 1 already opens. § 0.2.1's
   own defect, on the newest step in the plan.

**§ 0.2's escalation rule fired, and § 0.2.2 is the check it promised.** C1 is the *third*
occurrence of a fix that left its own claim standing elsewhere — one page away in revision 4,
one line away in revision 6, one section upstream in revision 7 — and revision 6 wrote that a
third would make it a check of its own. **The kill-list check**: quote the sentence being
killed, grep its most distinctive three-to-five words across the whole file, and decide every
hit as rewritten, deleted, or marked history. Run against C1's own fix it immediately found
three more survivors of the same claim — two "memo per form"s and a context count — which is
the second time in two revisions that a check caught its author within minutes of being
written.

**W1–W5, one line each.** Step 7 gains the README `Versions` block, which quotes
`peerDependencies` verbatim and would otherwise reproduce a manifest step 6 changed; step 7's
exit gains a real gate on the version and the CHANGELOG heading, where it had "all gates green"
and no gate reads either; § 5's module-private table gains `guardIdentifiers`, without which
gate 6 cannot name it as absent; step 6's `field-schema.ts` citation is corrected to `:172-178`;
step 3's § 3.2.1 cross-reference is corrected to the second bullet. **`acorn` is dropped from
the peer addition** — `acorn-walk@8.3.5` declares it as a real dependency and this adapter
imports no `acorn` symbol, so only `acorn-walk ^8.3.0` is added.

**Revision**: 7 — amended after a review of revision 6, plus a **fourth spike**. One Critical
and five Warnings. The Critical was a containment claim resting on an argument the type
signatures contradict, and measuring it retired that hazard and uncovered a worse one nobody
had named.

**C1 — the reusable-schema question, measured (Q7–Q9), and the answer is not the one either
side of the argument expected.**

1. **Q7 refutes the old premise.** `form()` accepts the **same** model signal twice — no throw,
   two distinct trees — so "the factory binds one model, therefore it cannot be shared by two
   forms" never bounded anything. Revisions 1–6 declared the context-sharing hazard
   "structurally unreachable" on that.
2. **Q8 retires the hazard anyway, on measured ground.** The schema body runs **0** times at
   `schema()` and **once per `form()`**: one reused schema, two forms → 2 registrar bodies, 2
   contexts, 2 distinct identities. Angular re-invokes; contexts are never shared across form
   instances. § 3.2's "the schema runs *during* `form()`" is now measured rather than asserted.
3. **Q9 is what replaces it, and it is worse.** A schema built from
   `createExpressionRules(modelA)` and reused for `form(modelB, s)` re-runs its registrars and
   every rebuilt rule still reads **model A** — form B renders against form A's data, silently,
   on every rule. Flipping `modelA` moved **both** forms. § 3.6 is rewritten around this,
   risk 7 with it, `makeSchema = (rules) => schema(…)` is promoted from aside to the documented
   pattern, and step 4 pins the behaviour so a change to it goes red.

**W1 is a design decision and is taken, not deferred.** Q10/Q11 measured it: `constructor`,
`toString`, `valueOf` and `hasOwnProperty` resolve off `Object.prototype` before § 3.2.1's
resolver ever runs, **identically with and without `caseInsensitive`** — so this is *not*
GHSA-pj3p-xpg7-h7gw's case-variant bypass, and saying so matters because the family resemblance
invites the stronger claim. `CONSTRUCTOR` resolves `undefined` in both modes, so under an
option whose purpose is that spelling stops mattering, spelling decides the answer. End to end,
`evalVisible(p.city, 'constructor')` **renders the field** on a key the model does not have.
Phase 4 rejected such names at schema construction; **§ 3.8 rejects them at registration, on
the *expression* rather than the field name**, because that is the input this entry point
actually owns and it is the complete subject — every expression is known at registration
whatever the model does later. New **step 6**, `acorn`/`acorn-walk` into `eval-forms`'
`peerDependencies`, docs and release become step 7. § 8.2 is the reason it ships here:
`/reactive` throws on this today, and shipping the silent side of that asymmetry is worse than
shipping neither.

**W2–W5**, in one line each: step 2's "both sources are asserted empty" named no reachable
observable and is restated as `lookups.length === 3` plus a pop (W2 — and § 0.2 now records
this as the **second** occurrence of its scoped-fix hazard, with the rule that a third makes it
a check of its own); `field` is not an export of `@angular/forms/signals` and the read is
`f.city().hidden()`, corrected throughout with the finding recorded at § 1.2.5 (W3); § 6.1's
sequence disambiguates *sequence* step 2 from *work-breakdown* step 2 (W4); risk 6's cell now
opens with "Accepted" so § 7's audit is exact (W5).

**§ 0.2.1's audit is re-run to completion, and it caught the section that wrote it.** Revision 6
applied the check to § 7's table alone and reported eight gated rows; the true count was
**seven**, because risk 7's mitigation named a deliverable — the check's own headline case,
missed one row past where the paragraph stopped. Run to completion it also produced W2 and W3.
That is recorded in § 0.2.1 as the strongest thing available for it: a rule whose first
application finds its own author's miss, within a day, is doing work rather than describing it.
Question 3 gains a third half — *does the import compile?* — which is the surface `field`
slipped through.

**Revision**: 6 — amended after a review of revision 5, plus a **third spike**: C1 asked for
§ 6.1.1's instrument to be re-measured under the layout § 3.4.1 actually specifies, where
`applyErrorPolicy` sits in the core and the adapter reaches it through the
`@zvenigora/ng-eval-forms` **barrel** rather than a sibling `./error-policy`.

Five C-series findings and seven warnings. The theme of four of them is one thing: **a
criterion, gate or mitigation that names something it does not actually test.** Revision 5 was
the revision that fixed three instances of that pattern; it shipped four more.

**The spike first — the instrument choice survives the change of seam; two sentences about it
do not.**

1. **M4 and M6 reproduce at identical numbers.** M1's stage-by-stage 0/0 → 1/1 → 1/1 → 2/2
   holds for all three mocked instruments; M6 — the rule that skips the walk — is again
   ground truth **1**, `applyErrorPolicy` **1**, `evaluateRule` **0**, `call` **0**. The
   decision stands and the specifier changes.
2. **M7 is new, and it is what § 3.5's invariant actually rests on** (C2). Moving the guard
   *ahead* of the wrapper reads **0** against a ground truth of **1**. M6 had put the guard
   *inside* an outermost wrapper, where the invariant holds — so revision 5 cited, three times,
   a measurement whose arrangement is the one that works. § 0.2 gains the general form: **a
   measured result restated as a principle can lose the property it measured, and this
   restatement inverted the observable.** § 3.5, § 6.1.1 and risk 12 now cite M7.
3. **Revision 5's account of the bare auto-mock is corrected by the same run.** Under the
   barrel, `jest.mock('@zvenigora/ng-eval-forms')` with no factory also auto-mocks
   `createFieldContext`, so registration throws
   `TypeError: Cannot read properties of undefined (reading 'lookups')` — loud, not the silent
   dead rule revision 5 described from the sibling seam.

**Then the two blockers that are not about the spike, and both are criteria with nothing
underneath them.**

4. **C3 — step 2 required an `EvalContext` its own deliverables could not build.** Its first
   and last exit criteria need a live context, and revision 4 moved context construction into
   the registrars, which step 2 ships as stubs that throw. `model-source.ts` therefore gains
   **named exports** — `createModelSource(model, options)` returning
   `{ keySignal, createRuleContext }`, module-private to the entry point (§ 3.2.1, § 5, W5).
   `createRuleContext()` is the subject the criteria construct; `keySignal` is what the
   memo-identity criterion compares. This is a scope-and-naming call and § 0.2 says settle
   those by argument, so it is settled by argument and needed no measuring.
5. **C4 — risk 12 named a gate that does not gate it.** Both nestings of the coercion satisfy
   "an ordinary error resolves per `onError`" and "an assigning expression throws out of
   `f.city().hidden()`". Step 4 gains the assertion that does separate them: under
   `'undefined'`, a throwing expression must leave `f.city().hidden()` **`true`** — the
   coercion ran on the policy's output. The guard half stays with the counting spec, where
   M7's 0-against-1 is what makes it able to fail.
6. **C5 — step 4's compile-once criterion gains an instrument and an N.** A delegating mock of
   `@zvenigora/ng-eval-core` counting `parse`/`compile` — measured coexisting with the
   `LogicFn` counter in one file — and the count is hung off § 6.1's sequence, so "across N
   invocations" is enforced by reads: `compile` 1 while invocations move 1 → 1 → 2.

**The seven warnings.** W7 is the one with a section of its own: **`jest.mock` hoists to *file*
scope, so the barrel mock needs its own spec file.** Step 4 stacked six cases in one and would
have hoisted the mock over all of them; it now ships `rules.spec.ts` and
`rules.invocation-count.spec.ts`. All four of § 6.1.1's mechanics were already on this
repository's shelf, in `reactive/src/lib/field-schema.teardown-throw.spec.ts`, with the reasons
in its comment — the **second** mechanic rediscovered rather than borrowed, so § 0.1 gains both
the row and the rule: **check the shelf before spiking, not after.** The other six:

- **W1** — § 6.1.1 said the `LogicFn` count is required "for every negative case", twice, while
  § 6.1's table and step 2 both assign step 2 the third harness. Restricted to steps 4 and 5.
- **W2** — gate 3's intro scoped its greps to `signals/`, its own table rows to
  `modules/eval-forms/`, and its refinement said explicitly that the path is the whole package.
  Risk 1 repeated the narrow one. The narrow spelling misses the case the refinement says the
  gate exists for; `signals/` is gone from both.
- **W3** — `TEXT` was published surface in § 5 with no step producing the barrel line that
  publishes it. Step 1's `public-api.ts` deliverable is now `export * from './lib/text-key';`.
  The same defect revision 5 fixed for the other three symbols.
- **W4** — nothing gated the `/signals` published surface at all: gate 5 reads the *primary*
  entry point's `.d.ts`, and step 4 pointed at it for exports that never reach it. **Gate 6**
  is new, from step 1, over `…-signals.d.ts`.
- **W5** — step 2 compared `keySignal` by identity while neither § 3.2.1 nor § 5 stated
  `model-source.ts`'s export shape. Stated in both, as part of C3.
- **W6** — § 6.1's six-step sequence was written in `f.city().hidden()` terms and handed to
  step 2, which has no form, no field state and no `LogicFn`. Restated generically, with a
  table giving each harness its own **read**.

**And § 0.2 gains a third failure mode, § 0.2.1, because four of the twelve findings are one
defect on three surfaces.** C3, C4, W3 and W4 are each an obligation attached to nothing that
can go red — a mitigation naming a criterion its own failure would pass, an exit criterion
whose subject its step does not build, a published symbol with no line publishing it and no
gate reading the `.d.ts`. Risk 8 sat in that state for four revisions and risk 12 for five, so
this is not one revision's slip; and revision 5 fixed three instances of it while shipping
four, which is why it is written as a **check** — *name the thing that goes red, and if the
answer is a section number, it is not gated* — rather than as advice to be careful. § 7's table
is audited against it below the risks.

**Revision**: 5 — amended after a scoped review of revision 4, plus a second spike. Twenty
findings applied; one of them (the `LogicFn` instrument) was a mechanism question and was
measured rather than decided, per § 0.2.

The four that were blockers:

1. **Step 2's first exit criterion contradicted § 3.2.1** — it still said the source composes
   "as the form half (first argument)", the record shape Q4 killed. Revision 4 rewrote the
   section and left the same claim standing one page away. § 0.2 gains the one-line hazard:
   **grep for the claim, not for the section.**
2. **§ 3.5 now shows the `LogicFn` body**, `applyErrorPolicy` wrapping `evaluateRule`.
   `onError` was published in § 5 and wired up nowhere, so a registrar calling `evaluateRule`
   bare passed every gate while an assigning expression rendered a blank field.
3. **Step 3's write-error criterion was satisfiable by an `applyErrorPolicy` with no `catch`**
   — the error propagated from never having been caught. It gains the second arm.
4. **Q5 and Q5b are in the table.** They were measured with the other seven and carried in
   prose for a whole revision, cited three times, in the revision that introduced § 0.2.

**§ 6.1.1 is new and answers what no revision had said: how a spec obtains the `LogicFn`
count** when `rules.ts` builds the closure and hands it to `hidden()`. Four candidate
instruments, graded against a ground-truth counter. All four agree on every case this plan
already had; **M6** — a rule that skips the walk — separates them: ground truth 1,
`applyErrorPolicy` 1, `evaluateRule` 0, `call` 0. The `evaluateRule` mock counts *walks*, and
a negative case built on it would pass while the rule was running. The instrument is
`applyErrorPolicy`, which is also the seam blocker 2 needs.

The other sixteen were corrections of fact or of an exit criterion: § 1.2.7's `hidden` and
`disabled` line ranges were transposed, `tsconfig.spec.json`'s `node10` is line 8 not 6,
`field-context.ts:9-11` was correct before revision 4 "fixed" it, `eval-signal.ts:353-354`
re-*wraps* rather than re-throws, no step listed the `signals/src/public-api.ts` edit that
publishes § 5's surface, two README obligations § 3.2.1 created were in no step, risk 8 had
named a step-4 criterion since revision 1 that step 4 never contained, and § 6's gates 3 and
5 cannot pass before step 3.

**Revision**: 4 — amended after a **spike**, before step 1. Revision 3 was reviewed, found to
have reintroduced the freeze class it withdrew, and then *measured* rather than re-argued. A
throwaway jest project built both candidate sources against a real `form()` + `schema()` +
`hidden(path, { when })` and answered the questions this section had been guessing at. The
spike was deleted; § 3.2.1's table is what it produced.

What changed, in dependency order:

1. **§ 0.2 is new, and it is the constraint that supersedes the others in force**: a question
   about *mechanism* is settled by measurement, not by review. Every part of this plan
   settled that way — § 3.3's choke point, `phase-4-plan.md` § 3.4.2's A/B fork — has held
   across three revisions, while every part settled by reasoning has produced a silent
   freeze. § 0.1's borrow rule stands and is now second in line: borrowing narrows the
   guessing, and revision 3 proved it does not eliminate it.
2. **§ 3.2.1's source keeps its memo in a private `Map` and resolves the property inside the
   computed** (Q4). Revision 3 wrote the memo back into the record upstream's `resolve`
   enumerates, and under `caseInsensitive` that entry becomes an exact match on the second
   read and permanently shadows the key that was working. **Observed, not argued.**
3. **§ 3.6 and step 3: one `EvalContext` per rule, not per field.** Q6 measured the
   `SchemaPath` token as identical across two property accesses, so per-field keying is
   available; it is declined for a stated reason rather than an assumed impossibility, and
   step 3's containment exit becomes the failure that actually happens — the *same* rule
   invoked twice on one context.
4. **§ 6.1 gains the positive arm** the count needs to be worth anything, and § 6 gate 3 is
   tightened past its own heading (the single `EvalState.fromContext` must be inside
   `evaluateRule`'s body, and the grep covers all of `modules/eval-forms/`).
5. Corrections of fact throughout: the `findNestedSignals` justification for the seed loop
   was void, the resolver sketch did not type-check against `EvalLookup`, § 5's import list
   made the adapter's own reason for existing a finding, and three citations pointed near
   their claims rather than at them.

**Revision 3's design reversal is narrowed rather than repeated.** Q3 measured revision 3's
shape resolving a late key correctly in the case-sensitive path — the case C2 was raised
about. It failed only under `caseInsensitive`. The record below says that, because "the whole
fix was wrong" would be the fourth wrong thing this document asserted about its own source.

**Revision**: 3 — amended after a second review, before step 1. Four changes, one of them a
design reversal, plus one standing constraint that is new to this document:

1. **§ 0.1 is new and governs the whole plan**: prefer a mechanism this repository already
   exercises over one derived for the plan, and when a section deviates, say what makes the
   case different. It is written in because of this document's own history — revisions 1 and
   2 each introduced a *silent-freeze* defect, and each fix was invented where the repo
   already had the mechanism on the shelf.
2. **§ 3.2.1's source materialises keys at resolve time** — the direction stands and the
   *implementation* is superseded by revision 4 item 2, which moves the memo out of the
   source record. Revision 2's snapshotted key set is **withdrawn** (C2). The reasoning that produced it is corrected in place rather
   than dropped: the argument was about *paths* and the failure is about *values*. Steps 2
   and 4 gain the fixture that makes it reachable, because every fixture in the plan as
   written used a fully-populated model and so none of them could have caught it.
3. **§ 6.1 states the negative case as a sequence** — read, record, write an unnamed key,
   read again, count unchanged — and records the general form beside it (C1). "By the count
   and by nothing else" was written as a vacuity guard and had become the clause forbidding
   the read-back that makes the count mean anything: an assertion discipline can itself have
   a vacuous setup.
4. **§ 6 gate 3 counts `EvalState` constructions, not call-site names** (W1). `compile`
   returns `evaluate.bind(null, node)` (`modules/eval-core/src/lib/internal/functions/compile.ts:16`),
   so a rule holding `compiled` and writing `compiled(state)` runs a full uncontained walk
   while matching no name-based regex. Every walk needs a state; state construction is the
   thing worth counting.

Revision 2's changes stand except where item 2 above supersedes one, and are kept below.

**Revision**: 2 — amended after review, before step 1. Nine changes; four are design
reversals and the rest are corrections of fact or of a gate.

Load-bearing, in dependency order:

1. **§ 3.2.1 is new: the registrars are produced by a factory**, `createExpressionRules(model,
   options?)`. Revision 1 specified them as free functions `(path, expression, options?)`
   with no parameter carrying the source — and a `LogicFn` cannot recover it, because
   `RootFieldContext` has no root or parent handle. The rules could not have reached a
   sibling value at all.
2. **§ 3.2's source is a record of per-key `computed`s** — the record stands, and its
   *snapshotted key set* is superseded by revision 3 item 2. Revision 1's notation
   `() => model()[key]` stays **withdrawn**, and it was not merely shorthand: a
   bare function in a `SignalContextSource` is passed through *untouched*
   (`signal-context.ts:198-201`), so the expression would have compared a function object and
   frozen silently — the exact failure `field-context.ts:60-64` already records.
3. **§ 6.1 stops offering two harnesses as equivalent.** The `f.city().hidden()` read-back
   cannot see over-subscription, because Angular's value equality masks a re-derivation that
   returns the same boolean. It proves wiring and polarity; only a `LogicFn` invocation count
   proves reactivity, and the negative case now requires it by name.
4. **§ 1.2.7 cited `@deprecated` overloads.** `hidden`, `disabled` and `readonly` each ship
   a `{ when: … }` config overload tagged `@publicApi 22.0` and a positional overload tagged
   `@deprecated`. Revision 1 quoted the second of each pair and § 7 risk 5 then claimed
   everything relied on was `@publicApi`. § 7 records how that happened.
5. **§ 3.1 drops `CompilerService`.** `parse`, `compile` and `defaultParserOptions` are all
   published free functions, so the whole string → callback → walk chain needs no Angular
   DI — which means the registrars work at module scope, where `inject()` would have thrown
   NG0203.

Also: § 4 step 1 gains the `tsconfig.spec.json` edit without which its test target cannot
pass (§ 4, C5); § 6 gate 3's grep is widened past `call(`; § 3.6 answers what happens to a
reusable schema; § 8.3 is revisited and **re-affirmed on corrected grounds**.

**Revision**: 1 — initial plan, written against `13bec97`.
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`), **published at
0.1.0**. This phase adds a third entry point to a released package; it does not create a
library.
**Depends on**: `@zvenigora/ng-eval-core` 0.3.0 and `@zvenigora/ng-eval-signals` 0.1.0,
both consumed as published — and on `@zvenigora/ng-eval-forms` 0.1.0's own shared core,
which is the new constraint this phase has and no previous phase did.
**Source**: [`ROADMAP.md`](../../ROADMAP.md) § Phase 6, and
[`phase-4-plan.md`](phase-4-plan.md) § 9 / § 9.1 — the design on paper.
**Angular floor**: `@angular/forms/signals` requires **Angular 22**. Verified against the
installed `@angular/forms` 22.0.8, whose `exports` map carries `./signals` and
`./signals/compat`.
**Objective**: Translate a runtime string into a Signal Forms `LogicFn`, so the same rules
`/reactive` drives through `FormGroup` drive `hidden`, `text` and `disabled` through
Angular's own schema — without going through `createEvalSignal`, and therefore without
inheriting its scope containment.

---

## 0. What this entry point is for, stated once

[`phase-4-plan.md`](phase-4-plan.md) § 0 states the library's premise and it is unchanged:
the condition is a **string, resolved at runtime**, for forms served by an API, authored in
a builder UI, or versioned separately from the application.

What changes here is who owns the reactivity. On `/reactive` this library builds the
reactive graph itself — a mirror per control, an `EvalSignal` per rule, a `destroy()` the
consumer calls. On `/signals` Angular owns all of it. The adapter's whole job is to hand
Angular a closure:

```ts
hidden(p.country, { when: (ctx) => !toVisible(evaluate('country === "US"', ctx)) });
```

Everything else in this plan follows from one property of that line: **Angular decides when
it runs, how often, and in what reactive context.** We supply a function; we do not supply a
`computed()`, we do not own a `DestroyRef`, and we cannot count our own recomputes.

**If a consumer's conditions are known at compile time, they should write the `LogicFn`
themselves and not install this.** Same sentence as § 0 of Phase 4, and it matters more
here, because on this path the thing we replace is four words of TypeScript.

### 0.1 The mechanism-reuse constraint — borrow it, or say what makes this different

**Prefer a mechanism this repository already exercises over one derived for this plan. Where
a section deviates, it must say what makes its case different.** This is a standing
constraint on every section below and on every step that implements one, not a summary of
the two decisions that happened to prompt it.

It is written in because of this document's own revision history. Two rounds of review have
each found a **silent-freeze** defect, and each of those defects was introduced by the
previous round's fix:

| Revision | The mechanism it derived | The mechanism already on the shelf | How it failed |
| -------- | ------------------------ | ---------------------------------- | ------------- |
| 1 | `() => model()[key]` as a `SignalContextSource` value | `createSignalContext`'s resolver, which unwraps a `Signal` and passes a bare function through untouched (`signal-context.ts:198-201`) | The expression compared a function object — truthy, never called, never tracked. `field-context.ts:60-64` records that exact failure, for the form half, in a docblock |
| 2 | A record of per-key `computed`s snapshotted from `Object.keys(model())` | `createFieldContext`'s two resolvers, which "close over their source and read it at resolve time, so a key added to either after construction resolves" (`field-context.ts:9-11`) | An expression naming a key the model does not have *yet* has no computed to read, subscribes to nothing, and never re-runs when the key arrives (§ 3.2.1, C2) |
| 3 | The same resolver, **borrowed** this time — but memoising into the record it shares with upstream | `field-context.ts:84` pushes a resolver that only ever **reads** `formSource` | Under `caseInsensitive`, the memo entry is spelled as the *expression* wrote it, so `resolve`'s scan (`signal-context.ts:127-144`) finds it as an exact match on the second read and permanently shadows the model's own key. Measured: § 3.2.1, Q4 |

The first two share a shape, and it is the shape that makes the constraint about
**provenance** rather than about being more careful. Each derived mechanism was *reasoned*
correct, and each time the reasoning was sound about the thing it considered and silent about
the thing it did not: revision 1 reasoned about how a value is read and not about what a
`SignalContextSource` does with a function; revision 2 reasoned about which *fields* a schema
can address and not about which *values* an expression can name. Being more careful is what
produced revision 2.

**Revision 3 is the one that says what this constraint cannot do.** It was a borrow — the
push onto `lookups`, taken from `field-context.ts:84`, cited as such in the provenance table
below. It still failed, because a borrow is only borrowed at the point it *resembles* the
original, and this one departed at the point it *touched* it: upstream's resolver reads the
source, and this one wrote into it. So the rule has a second half that revision 3 did not
have. **Check a borrow where it contacts the borrowed code, not where it looks like it** —
what the original does to that object, what else enumerates it, what upstream assumes about
who owns it. And note what still happened after all that: this was caught by review, and the
review's proposed fix was accepted only after § 0.2 checked it.

This generalises [`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s
`/signals` item 4 — "Angular's own primitives, not a second mechanism beside them" — from
Angular's primitives to this repository's own. Item 4 already makes a working parallel
mechanism a finding; § 0.1 says the same of a parallel mechanism inside `eval-forms`,
`eval-signals` and `eval-core`.

**Deviating is allowed and is not rare. Deviating silently is not.** Where this plan borrows
and where it departs, so a reviewer can check the claim rather than take it:

| Section | Mechanism | Provenance |
| ------- | --------- | ---------- |
| § 3.2.1 resolver | A resolver pushed onto `context.lookups` | **Borrowed** — `field-context.ts:84` composes the form half exactly this way. Revision 3 cited this row for a resolver that also *wrote* into the shared record, which upstream's never does; that is the departure the row failed to name and Q4 caught |
| § 3.2.1 key resolution | `readProperty`'s exact-then-case-insensitive rule | **Departs** — a re-implementation of `resolve` (`signal-context.ts:127-144`), which is module-private in `eval-signals` and cannot be called. Two copies that must agree; § 3.2.1 says so |
| § 3.2.1 context construction | `createFieldContext({}, {})` | **Borrowed for its class, not its sources** — the `SignalEvalContext` it returns is what makes an assigning expression throw (`signal-context.ts:112-117`), which § 3.4 depends on |
| § 3.3 containment | Snapshot `scopes.length`, restore in a `finally` | **Departs** — `createEvalSignal` does this and `/reactive` inherits it; this path never calls that function (§ 9.1 of `phase-4-plan.md`), so the three lines are re-stated here rather than reached |
| § 3.4 write-error bypass | Re-throw of `SignalContextWriteError` ahead of the policy | **Borrowed, and it departs where it contacts** — `eval-signal.ts:353-354` re-*wraps* (`throw new SignalContextWriteError(error.key, expression, error)`), while § 3.4 does `throw error`, having no expression string to attach. Same bypass, different error object out; § 3.4 states it |
| § 3.5 `text` | `createMetadataKey` + `metadata` | **Borrowed from Angular**, which is item 4's own instruction |
| § 6.1 harness | An invocation count around a real evaluation | **Departs** — eval-signals' recompute count has no subject here, because no `computed()` of ours exists (§ 3.6). The count is of `LogicFn` invocations instead |
| § 6.1.1 instrument | A **delegating** mock of a package-specifier barrel, counting one export, in its own spec file | **Borrowed** — `reactive/src/lib/field-schema.teardown-throw.spec.ts:14-31` mocks `@zvenigora/ng-eval-signals` in exactly this shape: counter object declared first, `jest.mock` with a factory that spreads `jest.requireActual` and wraps one export. Its own comment (`:8-13`) states the file-scope-hoisting reason for the separate file, and credits `eval-signals`' `nested-signal-check.spec.ts:1-15` for the passthrough shape (W7) |
| § 6 gate 3 | The one-path-to-the-walk gate | **Departs** — the checklist's `call(` grep cannot see a bound compiled callback (`compile.ts:16`), so the gate counts `EvalState` constructions instead (W1) |

**Check the shelf *before* spiking, not after — this is the second time a mechanic was
rediscovered rather than borrowed.** § 6.1.1's row above was found by running a spike, twice:
revision 5 derived the delegating-mock-plus-`requireActual` shape from its own
`ReferenceError`, and revision 6's re-spike derived the own-spec-file rule from the same
place, while `field-schema.teardown-throw.spec.ts` had carried both — with the reasons written
in a comment — since Phase 4. § 0.2 outranks § 0.1 and says measure rather than argue; it does
not say measure rather than *look*, and the two failure modes are different. A spike answers
"what does the machinery do"; the shelf answers "has this repository already answered it". Run
the second search first: it is a grep, it costs seconds, and where it hits, the spike's job
shrinks to confirming the borrow at the point it contacts the borrowed code. The § 6.1.1
re-spike is what that looks like when the shelf is checked late: all four of its mechanics were
already on the shelf, in one file. What the spike added and the shelf could not are the
numbers — M4, M6, M7 — and the correction to revision 5's account of the bare auto-mock.

The three departures are where a later reviewer should push hardest. The first two are
departures of *subject* rather than of design — the mechanism is the repo's, and what changed
is that the object it acted on is absent on this path. The third is a departure of
*instrument*, and it is the one that says the borrowed thing was **checked** rather than
assumed: the existing grep is sound for what it names and blind to a case this path makes
easy to write.

### 0.2 Mechanism questions are settled by measurement, not by review

**Where a decision turns on what the machinery actually does — Angular's, `eval-core`'s,
ng-packagr's — build the smallest thing that answers it and record the numbers. Do not settle
it in prose, and do not settle it by review of prose.** This outranks § 0.1: borrowing
narrows the guessing and revision 3 is the proof that it does not end it.

The evidence is this document's own scoreboard, and it is one-sided:

| Settled by | Sections | Outcome across four revisions |
| ---------- | -------- | ----------------------------- |
| **Measurement** | § 3.3's choke-point placement (six measurements); `phase-4-plan.md` § 3.4.2's A/B resolver fork; § 4 step 1's `moduleResolution` table; § 3.2.1's source and § 6.1.1's instrument, as of revisions 4–6; § 3.6.1's schema reuse and § 3.8's prototype-shadowed identifiers, as of revision 7 | **Every one has held.** § 3.3's table records **three of the four** apparent discriminators as *false*, § 3.2.1's Q4 separates two shapes nothing else could, and § 6.1.1's M6 separates four instruments that agreed everywhere else. Re-run under the real seam for revision 6, M4 and M6 reproduce at identical numbers — the finding survived a change of layout that the *prose* around it did not. **Revision 7 is the sharpest instance yet**: Q7 refuted the premise of a claim six revisions old, Q8 reached the same conclusion on different ground, and Q9 — which nobody had thought to ask — found a live correctness defect the argument had no way to reach |
| **Reasoning, then review** | § 3.2.1's source in revisions 1, 2 and 3 | Three shapes, three silent freezes, each introduced by the previous fix. Each was caught by the *next* round, never the one that shipped it |

The failure mode this addresses is specific and it is not carelessness. A silent freeze is
invisible to the thing that produced it: the reasoning that builds a source is reasoning
about the case the author has in mind, and a frozen rule *looks* exactly like a rule whose
condition is false. Prose review inherits that blindness, because it can only check the cases
the prose raises. A measurement does not — Q4 below was written to observe a defect that had
already been argued for and against, and what it actually showed was that revision 3 was
correct in the case it was defended on (Q3) and broken in one nobody had reached.

**When this applies.** A question is a mechanism question if the answer is a fact about code
this plan does not own. "Does Angular re-invoke a `LogicFn` inside a memoising consumer?"
(Q2), "is a `SchemaPath` token stable across two property accesses?" (Q6), "does
`moduleResolution: bundler` coexist with `module: commonjs`?" (§ 4 step 1) — all measurable
in minutes, all previously answered here by assertion, and one of those three assertions was
wrong. Scope, naming, and what to defer are **not** mechanism questions; § 8 settles those by
argument and should.

**A third failure mode, and it is the one that most resembles success: a claim can be false
and still have been arrived at by measurement, if the wrong thing was measured.** The other
two above are about not measuring and about restating a measurement. This one is about
measuring the wrong artifact and reading the number as if it were about the right one — and
it leaves a false claim wearing every mark of a true one, which is why neither § 0.2.1 nor
§ 0.2.2 catches it.

Step 1's own bullet is the instance. Revisions 1–9 said the `moduleResolution` edit was forced
because "without it this step cannot pass its own test target", and that was not asserted —
`tsc -p modules/eval-forms/tsconfig.spec.json` really does report `TS2307` under `node10` and
really is clean under `bundler`. Both numbers are correct. The claim is still false, because
**the test target is not `tsc`**: Jest runs ts-jest, which does not enforce type diagnostics,
and `nx test eval-forms` is green under `node10` with the new specs in place. A measurement of
`tsc` is evidence about `tsc`.

The tell was in the repository and cost nothing to look at: **five pre-existing specs import
`@angular/core/testing`, which `node10` cannot resolve either, and they have been green since
Phase 4.** A claim that a resolution failure stops the suite was refuted by a suite that had
been passing with that exact failure for two phases.

**So: name the artifact the claim is about, and measure *that* artifact.** If the claim is
"the test target fails", run the test target. If it is "the build fails", run the build. A
number from a neighbouring tool is a fact about the neighbouring tool, and the gap between the
two is invisible in the write-up — the prose reads "measured" either way. This is the reason
§ 4 step 1's corrected bullet lists the grounds that *do* hold rather than deleting the edit:
the edit was right, and only its stated reason was wrong, which is exactly how this failure
mode survives review.

**A hazard in restating a finding: a measured result restated as a principle can lose the
property it measured.** M6 measured a rule whose guard sat *inside* an outermost
`applyErrorPolicy` — ground truth 1, instrument 1. Revision 5 restated that as "the
measurement of what happens to an instrument sitting under a branch" and then cited it three
times — § 3.5, § 6.1.1, risk 12 — as the evidence that `applyErrorPolicy` must be the
outermost call. It is not that evidence. M6's arrangement is one where the invariant **holds**;
the numbers that make it load-bearing are M7's, and M7 was not run until revision 6. The
restatement did not merely overreach, it **inverted the observable**: M6 reads 1 for a rule
that ran, M7 reads 0 for a rule that ran, and every negative case in steps 4 and 5 turns on
which of those the instrument does.

So: **a measurement supports only what its arms distinguish.** M6 had one arm and one number,
so it could support "the instrument still tracks a rule that skips the walk" and nothing
further. Before citing a measurement for a claim, name the arm that would have produced the
claim's negation — if there isn't one, the citation is prose wearing a number's clothes, which
is the failure § 0.2 exists to prevent, one level up.

**One hazard in applying a finding, since three revisions have now hit it.** A fix scoped to
the section a finding names leaves the same claim standing wherever else it was written down:
revision 4 rewrote § 3.2.1 to build `createFieldContext({}, {})` and left step 2's exit
criterion one page away still saying "as the form half (first argument)", where it survived a
scoped review because that review was looking at the section it had already fixed. **Grep for
the claim, not for the section.**

**Second occurrence, and it is worth counting because the next one changes what this is.** W2:
revision 6 fixed C3 by giving step 2's criteria a constructible subject, rewrote that bullet,
and left the *adjacent* clause — "both `createFieldContext` sources are asserted empty" —
naming an observable no spec can reach. Same defect, same step, one bullet up, in text the same
revision had its hands on. The first occurrence was a claim one page away; this one was one
line away, which is the harder case for a grep and the easier case for reading the bullet you
are editing to its end.

**It happened a third time, in revision 7, and the escalation this paragraph promised is
§ 0.2.2.** Revision 7 rewrote § 3.6 and risk 7 around Q7/Q9 and left § 3.2.1 — the section the
fix was reasoned *from* — still asserting the refuted premise verbatim. Three occurrences at
three distances: one page, one line, one section upstream. That is enough to say what the check
must be, which two were not.

#### 0.2.1 The third failure mode — an answer attached to nothing that can fail

**The two rules above govern how a question gets answered** — measure rather than argue, and
do not restate a measurement as a principle that loses the property it measured. **This one
governs whether the answer is attached to something that can go red.** It is a different
defect and it has never been caught by either of the others, because both of those are
satisfied by an answer that is entirely correct and entirely ungated.

The evidence is four instances across five revisions, on three different surfaces:

| Instance | Surface | What it named | What was actually there |
| -------- | ------- | ------------- | ----------------------- |
| **Risk 8** | a mitigation | "step 4's parse/compile count" | No step contained that criterion until revision 5 — **four revisions ungated** |
| **Risk 12** (C4) | a mitigation | "step 4's policy-through-a-rule criteria" | Both nestings of the coercion satisfy both of those criteria; the risk's own failure passes them |
| **Step 2's criteria 1 and 6** (C3) | an exit criterion | a context built by `createFieldContext({}, {}, …)`, and a `computed` around `context.get(key)` | Revision 4 moved context construction into registrars this step ships as stubs that throw — **no subject** |
| **`TEXT`** (W3, W4) | a published symbol | § 5's published-surface table | No step produced the barrel line that exports it, and no gate read the `.d.ts` it would appear in |

**Three surfaces, one defect.** A mitigation that names a criterion which would not fail; an
exit criterion whose subject its own step does not build; a published symbol with no line that
publishes it. In each case the *answer* is right — risk 8's mitigation is the right mitigation,
step 2's criteria are the right criteria, `TEXT` is the right symbol — and in each case nothing
would have reported its absence.

**It is not one revision's slip, which is the reason it earns a rule.** Revision 5 fixed three
instances of exactly this pattern — it put risk 8's count into step 4, rewrote step 2's
criteria against its deliverables, and added the barrel line for three of § 5's four
`/signals` symbols — and shipped four more in the same pass, including the fourth symbol. A
defect that survives being fixed instance by instance needs a check, not more care.

**The check, and it would have caught all four: for every risk, every exit criterion and every
§ 5 entry, name the thing that goes red when it is violated.** A named assertion in a named
spec file, or a grep with an expected count. **If the answer is a section number, it is not
gated** — § 3.5 stating an invariant is not a gate on it, § 5 listing a symbol is not a line
that exports it, and "step 4's criteria" is not a gate unless one of those criteria fails when
the risk occurs.

Three questions make it mechanical:

1. **A risk** — *which assertion goes red?* Run the risk's own failure against the criterion
   it names. If the criterion still passes, the mitigation is a cross-reference wearing a
   gate's clothes (risk 12, C4).
2. **An exit criterion** — *which deliverable of **this** step builds its subject?* If the
   subject arrives in a later step, the criterion cannot be met in the step that states it
   (C3).
3. **A § 5 entry** — *which barrel line publishes it, which gate reads the emitted `.d.ts`,
   and **does the import compile**?* Three halves, because each alone leaves something
   undetectable: the first two are W3 and W4, and the third is revision 7's `field` — a name
   § 5 listed as an import from `@angular/forms/signals` for six revisions, which that package
   does not export (§ 1.2.5).

**The check's first run, and what it caught.** Revision 6 wrote this section and applied it to
§ 7's table alone, reporting eight gated rows and four honest exceptions. Re-run to completion
one day later, it produced three findings, one of them Critical:

- **Risk 7 was ungated and counted as gated.** Its cell named "Step 2's construction" — a
  *deliverable*, which is the "a section is not a gate" case in its purest form. The
  arithmetic was wrong by exactly that row: **seven** gated, not eight.
- **Step 2 had a criterion with no observable and no criterion through its factory.** "Both
  sources are asserted empty" names nothing a spec can reach (W2) — the same defect as C3, one
  bullet up, in a bullet revision 6 had just rewritten — and nothing exercised
  `createExpressionRules` itself, so a factory building one memo *per rule* would have passed
  every criterion in steps 2 and 4.
- **§ 5's `field` entry authorised an import that cannot compile** (W3), which is the surface
  question 3 covered least.

**That is the strongest thing this document can say for the check: it caught the section that
introduced it, one row past where that section stopped, within a day.** A rule whose first
application finds its own author's miss is doing work rather than describing it. It also fixes
the way the rule must be run — **to completion, over every row, every criterion and every § 5
entry** — because a partial run is what produced the wrong count, and a wrong count reads
exactly like a right one.

This is [`CLAUDE.md`](../../CLAUDE.md)'s "break the implementation and confirm the test fails",
moved up one level from the spec to the plan. A mitigation that cannot fail reports coverage it
does not have, in exactly the way a vacuous assertion does — and § 6.1's own history is the
proof that a document can hold that rule for specs while breaking it for itself.

#### 0.2.2 The kill-list check — did the old claim actually die?

**Promoted from a hazard note in revision 8, because § 0.2's escalation rule fired exactly as
written.** § 0.2.1 asks whether an answer is attached to something that can fail. This asks a
different question about the same revision: **when a finding kills a claim, did the claim die
everywhere, or only in the section the finding named?**

Three occurrences, and the distance is not the pattern:

| | Revision | The claim killed | Where it survived |
| - | -------- | ---------------- | ----------------- |
| 1 | 4 | § 3.2.1's record-shaped source | step 2's exit criterion, **one page away**: "as the form half (first argument)" |
| 2 | 6 (W2) | step 2's criteria had no constructible subject | the **adjacent clause of the same bullet**: "both sources are asserted empty" |
| 3 | 7 (C1) | "the factory binds one model, so it cannot be shared by two forms" | § 3.2.1, **the section the fix was reasoned from**: "it closes over one model, so it cannot be shared by two forms with different models" |

What *is* constant: in all three, the surviving text contained a **distinctive phrase**, and a
grep for that phrase would have found it in seconds. What failed each time was scoping the
search to a section, a claim's paraphrase, or the finding's own words.

**So, three steps, before a revision is called done:**

1. **Quote the sentence being killed, verbatim.** Not the finding's summary of it — the words
   in the document.
2. **Grep for its most distinctive three to five words**, across the whole file. "form half",
   "sources are asserted empty", "closes over one model". Not the section number, not the
   concept.
3. **Read every hit and decide it**: rewritten, deleted, or kept as history and *marked* as
   history. The third option is why this cannot be a blind replace — two of the three
   occurrences sat next to legitimate restatements in revision blocks, where the old claim is
   supposed to stand.

Step 3 is also what distinguishes this from § 0.2's "grep for the claim, not for the section",
which is the same instinct without a procedure: that line has been in the document since
revision 4 and did not prevent occurrences 2 or 3, because an instinct with no step 1 has
nothing to grep *for*.

##### The sweeps, recorded

**A check whose runs are not written down is a check that was not run.** Revision 8 wrote this
section, ran it for one claim, and did not run it for either of the two changes revision 8
itself made — which produced revision 9's C1 and C3, and made this the *fourth* consecutive
revision to leave its own claim standing. The runs go here from now on, with their greps.

| Killed claim | Grep | Live survivors | Historical hits, left as history |
| ------------ | ---- | -------------- | -------------------------------- |
| The record-shaped source (r3–r4) | `record`, `seeded`, `snapshot`, `SignalContextSource` | none | § 0.1's table, § 3.2.1's withdrawal, step 2's "break it by seeding the record" mutation probe |
| "The factory binds one model" (r8) | `closes over one model`, `shared by two forms` | none for the phrase; **three for its derived counts** (r9 C2) — step 2's deliverable and criterion, § 1.2.10's compile count | § 3.2.1 and § 3.6.1 quoting the killed claim, marked |
| "`applyErrorPolicy` outermost, per **M6**" (r6) | `outermost`, `M6`, `under a branch` | none | § 3.5, § 6.1.1 and risk 12 all cite M7 and name M6's substitution as the error |
| The seed loop over `Object.keys(model())` (r4) | `seed`, `Object.keys`, `findNestedSignals` | none | § 3.2.1's withdrawal and the void-justification account; § 3.8 re-derives why the *expression* is the subject |
| **`acorn` as a second peer (r8)** | `acorn` | **two** (r9 C1): § 2's scope list and § 5's import justification, both live and normative | the Revision 7 block's "`acorn`/`acorn-walk` into `peerDependencies`", which revision 8's entry corrects; § 1.2.10's quotation of `eval-core`'s own `.d.ts`, which is upstream's signature and not our import |
| **`guardIdentifiers`' signature (r9)** | `AnyNode`, `guardIdentifiers` | none after the fix | § 1.2.10's quoted `parse`/`compile` declarations, which name `AnyNode` because upstream does |

The last two rows are what the check is for and are also its indictment: they were run one
revision late, and both live survivors sat in **normative** sections — § 2's scope list and
§ 5, which ends "anything beyond these lists is a finding". A stale sentence in a revision block
costs a reader a moment; a stale sentence in § 5 sends an implementer to add a peer dependency
the design rejects.

**The cost is low and was measured too.** The spike behind § 3.2.1 was a jest project outside
`modules/`, nine cases, both candidate shapes side by side, and it ran in about seven
seconds. The one behind § 6.1.1 was six cases against a ground-truth counter, and it ran in
three. The re-spike C1 asked for — the same cases plus M7 and the compile-once counter, run
against the real barrel seam rather than a sibling module — was fifteen cases across five spec
files and ran in about ten seconds warm. The fourth, behind § 3.6.1 and § 3.8, was five cases
and ran in under three. **Its numbering continues § 3.2.1's**, so Q1–Q6 are the source spike's
and **Q7–Q11 are revision 7's**, recorded in § 3.6.1 and § 3.8 rather than in § 3.2.1's table
because they measure different subjects. It
is cheaper than the review round it replaces and far cheaper than the release it prevents.
A spike is throwaway by construction: it is deleted when its numbers reach the plan, which is
what keeps it from becoming a second, untested copy of the design.

#### 0.2.3 Probe decay — a gate can stop discriminating without being edited

§ 0.2.1 asks whether a claim is gated. **This is the case where it *was* gated, and quietly
stopped being** — no edit to the spec, no edit to the claim, and nothing red at any point in
between. It is a fourth failure mode rather than an instance of the third, because § 0.2.1's
check passes on it at every moment: ask "which assertion goes red?" and there is a named
assertion in a named file, both before and after.

**The instance, found in step 4's review.**
`signals/src/lib/rules.model-source-count.spec.ts` was written in step 2 to gate § 3.6's
one-memo-per-factory count, and its own comment names the defect it exists to catch: "a factory
calling `createModelSource` **per registrar** instead of once … would satisfy all of them while
quietly making the memo per rule". When it was written that was true — the registrars were
stubs that threw, so "per registrar" had no reachable form other than a second call at
construction time, which its count of 1 did catch. **Step 4 shipped the registrar bodies, and
`createModelSource` moved into `prepare`'s reach for the first time.** Patched to build a memo
per registration — the exact defect the file names — both of its cases stayed green, because
neither fixture ever registers a rule.

**The mechanism, and it is the part that generalises: a probe discriminates over the set of
wrong implementations that are *reachable*, and a later step can enlarge that set.** The spec
did not decay by rotting. It stayed exactly as sound as it was written; the space it was
guarding grew around it. Nothing in this document's other checks looks at that — § 0.2.1 is a
question about a claim at the moment it is written, § 0.2.2 is a question about a claim that was
*replaced*, and this is a claim that was neither rewritten nor falsified while the ground under
it moved.

**The check, and it is a question for the step that does the enlarging rather than for the spec
that decayed**: when a step makes a previously-unreachable implementation reachable — a stub
becomes a body, a parameter starts being read, a private helper gains a second caller — **re-run
the probes of every earlier step whose subject that code is**, not just the current step's. The
mechanical form is the one this repository already has: patch in the wrong implementation the
older spec names in its own comment, and confirm that spec is among the files that go red.

Two consequences worth stating, because both are the opposite of the obvious response:

- **The older spec is not at fault and editing it is not the whole fix.** The step that
  enlarged the space owes the coverage, so step 4 added the two-rule lifetime case to
  `rules.invocation-count.spec.ts` rather than only correcting a comment. Step 5 corrects the
  comment because step 5 is the next step to edit `rules.ts`.
- **A stub is the loudest form of this, and it is exactly what step 5 inherits.**
  `evalDisabled` is a throwing stub today, so every claim about the shared `prepare` path is
  currently gated over a set of two registrars. Step 5 makes it three, and § 4's step 5 carries
  the re-run as a deliverable rather than leaving it to whoever notices.

---

## 1. Current state of the code

### 1.1 What exists today

`modules/eval-forms/` ships two entry points, both released in 0.1.0:

| Entry point | Files | Exported |
| ----------- | ----- | -------- |
| `@zvenigora/ng-eval-forms` | `src/lib/{coercion,error-policy,field-context}.ts` | `toVisible`, `toText`, `createFieldContext`, `ExpressionErrorPolicy` |
| `@zvenigora/ng-eval-forms/reactive` | `reactive/src/lib/{control-source,field-schema}.ts` | `createControlSource`, `bindFieldProperties`, `FieldSchema`, `FieldProperties`, `FormBinding` |

There is no `modules/eval-forms/signals/`. The build produces
`dist/modules/eval-forms/fesm2022/zvenigora-ng-eval-forms.mjs` (7,096 bytes) and
`…-reactive.mjs` (25,748 bytes), with an `exports` map carrying `.` and `./reactive`.

`applyErrorPolicy` **does not exist**. `error-policy.ts` ships the `ExpressionErrorPolicy`
type and its own docblock says the helper is deferred to this phase, which is its only
caller.

### 1.2 Findings that shape the design

Each verified against the installed Angular 22.0.8 type definitions
(`node_modules/@angular/forms/types/`), not from recollection. Line numbers are
`_structure-chunk.d.ts` unless stated.

**1.2.1 `LogicFn` is exactly what § 9 assumed.** `:723`:

```ts
type LogicFn<TValue, TReturn, TPathKind extends PathKind = PathKind.Root> =
  (ctx: FieldContext<TValue, TPathKind>) => TReturn;
```

Synchronous, one argument, no injection context promised. This is the whole integration
surface, and it is compatible with `eval-core`'s synchronous walk without adaptation.

**1.2.2 `valueOf` still takes a compile-time token — § 9's premise holds.** `RootFieldContext`
(`:779`) exposes `valueOf<PValue>(p: SchemaPath<PValue, SchemaPathRules>): PValue` at `:787`.
A `SchemaPath` is produced by the schema builder, not addressable by string. So a rule that
names `country` as text cannot reach `ctx.valueOf`, exactly as § 9 said.

**1.2.3 But `FieldContext` carries four runtime-addressable members § 9 did not account
for.** `:781-794`:

- `readonly value: Signal<TValue>` — the current field's value, reactive.
- `readonly state: ReadonlyFieldState<TValue>` — see 1.2.4.
- `readonly fieldTree: ReadonlyFieldTree<TValue>` — the current field's node.
- `readonly pathKeys: Signal<readonly string[]>` — the keys from root to here.

`ChildFieldContext` (`:802`) adds `key: Signal<string>`; `ItemFieldContext` (`:811`) adds
`index: Signal<number>`.

**1.2.4 Every form-state key Phase 4 deferred is a `Signal` here.** `ReadonlyFieldState`
exposes `value`, `controlValue`, `disabled`, `readonly`, `required`, `touched`, `dirty`,
`hidden`, `valid`, `invalid`, `pending`, `submitting`, `errors`, `errorSummary`,
`disabledReasons`, `name`, `keyInParent`, `min`/`max`/`minLength`/`maxLength`/`pattern` —
all `Signal<…>`. [`ROADMAP.md`](../../ROADMAP.md) narrowing 2 called form-state keys
"unresolved rather than merely unbuilt" for `/reactive`, where they are not signal-backed.
**On this path they are.** That does not put them in scope (§ 2), but it changes the reason:
here it is a scope decision, not a mechanism gap.

**1.2.5 `FieldTree` is string-indexable and iterable at runtime.** `:208` makes a
`FieldTree` callable — calling the node returns its `FieldState` — and `:224` defines `Subfields`
as a mapped type **plus** `[Symbol.iterator](): Iterator<[string, MaybeFieldTree<…>]>`. So
from a `FieldTree` node one can enumerate `[key, childNode]` pairs at runtime and call each
child to get its state. This is a second candidate source, and § 3.2 is the fork it opens.

**And it settles the notation, which revisions 1–6 got wrong** (W3). There is **no lowercase
`field` export**: `signals.d.ts:10` and `:814` export `Field` (the directive), `FieldState`,
`FieldTree` and `ReadonlyFieldTree`, and nothing named `field`. A read is therefore
`f.city().hidden()` — the node called, then its state's signal — which follows from this
finding and from nothing else. Revisions 1–6 wrote `field(f).hidden()` throughout and § 5's
import list, which is normative, authorised an import that cannot compile.

**1.2.6 `form()` does not copy the model.** `:1860`,
`form<TModel>(model: WritableSignal<TModel>): FieldTree<TModel>`, documented as using "the
given model as the source of truth" and not maintaining its own copy. So the model signal
and the field tree are two views of one thing, which is what makes § 3.2's fork a genuine
choice rather than a correctness question.

**1.2.7 `hidden`, `disabled` and `readonly` each ship two overloads, and only the config one
is supported.** From `signals.d.ts` — the `@publicApi 22.0` tag sits on the first of each
pair, `@deprecated` on the second:

```ts
// supported — signals.d.ts: hidden :66-68, disabled :32-34, readonly :92-94
// (declaration order below is hidden, disabled, readonly; the file's is disabled first)
declare function hidden<TValue, TPathKind>(path, config: { when: LogicFn<TValue, boolean, TPathKind> }): void;
declare function disabled<TValue, TPathKind>(path, config?: { when?: string | LogicFn<TValue, boolean | string, TPathKind> }): void;
declare function readonly<TValue, TPathKind>(path, config?: { when?: LogicFn<TValue, boolean, TPathKind> }): void;

// @deprecated "Passing a function directly to `hidden` is deprecated. Use `{ when: ... }` instead."
declare function hidden<TValue, TPathKind>(path, logic: LogicFn<TValue, boolean, TPathKind>): void;
```

Two details that matter downstream. **`hidden`'s `when` is required** while `disabled`'s and
`readonly`'s are optional — the whole config is optional there, since `disabled(p.x)`
disables unconditionally. And **`disabled`'s `boolean | string` return is a reason**,
surfaced through `state.disabledReasons` as `DisabledReason { fieldTree, message? }`
(`_structure-chunk.d.ts:118`). A rule returning the string `'false'` therefore disables the
field with reason `"false"` — the `toVisible` truthiness trap (Phase 4 § 3.6) in a new shape.

**The config overload does *not* separate the condition from the reason**: `when` is one
field carrying both. That is why § 8.3's re-affirmation does not rest on it.

`metadata` (`_structure-chunk.d.ts:855`) has no deprecated counterpart, so `evalText` is
unaffected.

**1.2.8 `text` has a real home: `createMetadataKey` + `metadata`.** `:966` and `:978`:

```ts
declare function createMetadataKey<TWrite>(): MetadataKey<Signal<TWrite | undefined>, TWrite, TWrite | undefined>;
declare function createMetadataKey<TWrite, TAcc>(reducer: MetadataReducer<TAcc, TWrite>): MetadataKey<Signal<TAcc>, TWrite, TAcc>;
declare function metadata<TValue, TKey, TPathKind>(path, key: TKey, logic: LogicFn<TValue, MetadataSetterType<TKey>, TPathKind>): TKey;  // :855
```

So `text` is `metadata(p.x, TEXT, logicFn)` with `TEXT = createMetadataKey<string>()`, read
back off the field's state. No parallel mechanism, per Phase 4 § 3.2's failure mode.

**The read-back has a named API and it is worth citing, since every neighbouring claim here
carries one**: `ReadonlyFieldState.metadata<M>(key: MetadataKey<M, any, any>): M | undefined`
(`_structure-chunk.d.ts:406`). For `TEXT` that is `Signal<string | undefined> | undefined`, so
a spec reads `f.city().metadata(TEXT)?.()` — two calls and an optional chain, not one.

**1.2.9 The containment primitives are all published and none of them is Angular.** From
`dist/modules/eval-core/types/zvenigora-ng-eval-core.d.ts`:

- `declare const call: (fn: stateCallback, state: EvalState) => unknown | undefined` (`:1851`)
- `static fromContext(context?, options?, isAsync?): EvalState` on `EvalState`
- `get scopes(): Readonly<Stack<Context>>` and `pop(): void` on `EvalContext`
- `get length(): number` on `Stack`

All four are value exports of the FESM. **`createState` is not** — it is a method on
`BaseEval`, so `CompilerService.createState` drags in Angular DI, while
`EvalState.fromContext` does not. That single fact is what makes § 3.3's core placement
buildable at all, and § 9's sketch (`compiler.createState(context)`) is therefore not the
only shape available.

**1.2.10 The whole string → walk chain is published as free functions, so no Angular DI is
needed anywhere.** Extending 1.2.9's search past `call`:

```ts
declare const parse: (expr: string, options: ParserOptions) => Program | AnyNode | undefined;  // :1804
declare const compile: (node: AnyNode | undefined) => stateCallback;                            // :1836
declare const defaultParserOptions: ParserOptions;                                              // :1427
```

All three are in the FESM's export list. `CompilerService` adds only an LRU over
`parse` + `compile` (10-minute TTL, 200 entries) and its `simpleCall`; this adapter compiles
once per rule per `form()` at registration and holds the callback, so the cache has little to
do — and "little" rather than "nothing" is Q8's correction: N forms from one schema recompile
each rule N times, which is the one case an LRU would have served. It does not change the
call, because § 3.1 drops the service for the injection-context reason and not for this. § 3.1
therefore drops the service entirely — which also removes an injection-context requirement
the plan never had a story for, and which `inject()` would have turned into NG0203 for a
module-scope schema.

**1.2.11 `createEvalSignal`'s write-error bypass does not travel with the type.**
`modules/eval-signals/src/lib/eval-signal.ts:353` re-throws `SignalContextWriteError`
regardless of `onError`. That behaviour lives **inside `createEvalSignal`**, which this path
never calls. `applyErrorPolicy` must re-implement it or a write violation becomes a blank
field — see § 3.4.

### 1.3 What this plan relies on beyond `phase-4-plan.md` § 9

§ 9 is a sketch, not a contract, and this plan departs from it in three places. Stated here
so the departures are found by reading rather than by diffing:

1. **§ 9's sketch calls `compiler.createState(context)`.** This plan uses
   `EvalState.fromContext` where the choke point does not otherwise need Angular (1.2.9).
2. **§ 9 assumes the source must come from the model signal.** 1.2.5 opens a second route;
   § 3.2 decides between them.
3. **§ 9 does not mention `readonly`.** 1.2.7 shows it is available on the same terms as
   `hidden`. It is out of scope (§ 2) but for a scope reason, not an absence.

Beyond § 9, this plan relies on these published-but-unpromised behaviours, the same way
Phase 4 § 1.3 had to:

- `EvalContext.scopes.length` and `EvalContext.pop()` behave as a stack (1.2.9).
- `EvalState.fromContext` short-circuits on identity for an `EvalContext`, per
  [`CLAUDE.md`](../../CLAUDE.md) "Context resolution", so one context backs many states.
- `createSignalContext`'s `lookups` resolver unwraps signals on read — the property
  `createFieldContext` already composes on.
- **`EvalContext.lookups` is a mutable array a caller may push onto**, and resolvers run in
  push order. `field-context.ts:84` already relies on both, and § 3.2.1 pushes a third
  resolver onto the context that function returns. Measured in the spike: with both
  `createFieldContext` sources empty, the third resolver answers every key.
- **`EvalContext.get` treats `undefined` as absent at every step**, so a resolver that
  returns `undefined` has still *read* whatever it read. § 3.2.1's fix depends on this
  entirely, and `field-context.ts:28-30` records it as a limitation rather than a promise.

---

## 2. Scope

### In scope

- A third entry point, `@zvenigora/ng-eval-forms/signals`, shipped from the same package.
- A **single choke point** for the walk, with scope containment inside it (§ 3.3) — the
  precondition [`phase-4-plan.md`](phase-4-plan.md) § 9.1 states.
- `applyErrorPolicy`, written against the shipped `ExpressionErrorPolicy`, with the
  `SignalContextWriteError` bypass (§ 3.4).
- A source adapter turning the consumer's model signal into resolvable, per-key reactive
  reads (§ 3.2).
- `hidden`, `text` and `disabled` as string-driven rules (§ 3.5).
- **Rejection of prototype-shadowed identifiers at registration** (§ 3.8), with **`acorn-walk`**
  — and only `acorn-walk` — added to `eval-forms`' `peerDependencies`. Phase 4 answered the same question
  for `/reactive` with construction-time validation, and § 8.2's principle makes shipping the
  silent side of that asymmetry worse than shipping neither.
- README entry-point table row, CHANGELOG entry, and a minor release.

### Out of scope (deliberately deferred)

- **Any change to `eval-core` or `eval-signals`.** Consumed as published;
  [`.claude/skills/step/SKILL.md`](../../.claude/skills/step/SKILL.md) makes a step that
  needs one a stop-and-replan condition. The § 6 gate rows detect a step that reached in.
- **Any change to `/reactive`'s behaviour or to an existing exported symbol's shape.**
  This is the constraint no previous phase had: 0.1.0 is on npm. Additive work on the shared
  core is in scope when a section here calls for it; a shape change is a stop-and-replan.
- **`readonly`, `required`, and validators.** Available (1.2.7) and not built. `required`
  and validators affect validity rather than presentation, which
  [`ROADMAP.md`](../../ROADMAP.md) already defers; `readonly` is new surface with no
  demonstrated demand.
- **Form-state keys in the expression context** (`touched`, `dirty`, `valid`, …). 1.2.4
  shows the mechanism exists here and § 3.2's route B would reach it. **Settled out of scope
  in § 8.2, and recorded as a Phase 7 candidate covering both adapters together**: an
  expression must mean the same thing at both entry points, and `visible: "touched"` working
  under `/signals` while silently resolving `undefined` under `/reactive` is worse than the
  key being unsupported at both. Shipping it here would be shipping the asymmetry.
- **Arrays and nested objects.** `applyEach` and `ItemFieldContext` exist; per-row naming is
  the same unsolved problem as Phase 4's `FormArray` (open question 8.4).
- **Async.** Phase 5, unchanged.
- **Write-back.** [`phase-3-plan.md`](../signals/phase-3-plan.md) § 9.4; § 3.4 keeps it loud.

---

## 3. Design

### 3.1 Where the seam sits

Phase 4 § 3.1 put the shared core at the primary entry point and adapters at subpaths, and
made the core's `@angular/core` import list empty. Both still hold: **measured 0 `@angular/core`
imports in `modules/eval-forms/src/`** at `13bec97`.

The division for this phase:

| Concern | Lives in | Why |
| ------- | -------- | --- |
| `toVisible`, `toText`, `createFieldContext`, `ExpressionErrorPolicy` | core (shipped) | Already published; both adapters use them |
| `applyErrorPolicy` | **core** | Pure function over a shipped type, no Angular — § 3.4 |
| The walk choke point | **adapter** | § 3.3, on a measurement |
| `parse` + `compile` (at registration), `hidden`/`metadata`/`disabled` | adapter | `@angular/forms/signals` |
| The source adapter and the rule factory | adapter | § 3.2, § 3.2.1 |

**`CompilerService` is not used** (1.2.10). The chain is `parse(expr, defaultParserOptions)`
→ `compile(ast)` at registration, then `EvalState.fromContext` + `call` per invocation, all
free functions. The adapter therefore requires **no injection context**, which is what makes
§ 3.2.1's factory callable from module scope.

### 3.2 The source — model signal or field tree

§ 9 assumed the source is built from the `WritableSignal` model the consumer passed to
`form()`. 1.2.5 opens a second route: the root `FieldTree`, which is string-indexable and
iterable at runtime.

| | **A — model signal** | **B — root `FieldTree`** |
| --- | --- | --- |
| What the adapter takes | `WritableSignal<TModel>` | `FieldTree<TModel>` (what `form()` returned) |
| Key → value | one memoised `computed` per key, resolving the property inside (§ 3.2.1) | `() => tree[key]()!.value()` |
| Reactive | yes, one signal read | yes, `state.value` is a `Signal` |
| Key set | any key an expression names, built on first read (§ 3.2.1) | enumerable via `[Symbol.iterator]` |
| Reaches form state (1.2.4) | no | **yes** — `tree[key]()!.touched()` etc. |
| Extra coupling | none beyond `WritableSignal` | the whole `FieldTree` shape |
| Available before `form()` returns | yes | **no** — the schema runs *during* `form()` |

**The last row is decisive and it is a sequencing fact, not a preference — and as of revision 7
it is measured rather than asserted** (Q8). A schema function runs while `form()` is
constructing the tree, so a rule registered inside the schema cannot close over `form()`'s
return value — it does not exist yet. Q8 timed it exactly: after `schema<Model>(p => …)`
returns, the registrar has run **0** times; after the first `form(model, s)`, **1**. The body
does not run at `schema()` time at all. B would need the source to be
built lazily and read on first `LogicFn` invocation, which is possible but puts a
construction-order hazard on the hot path for a capability (form state) that § 2 puts out of
scope anyway.

**Decision: A, the model signal.** B is not refuted — it is the route form-state keys would
take if § 8.2's Phase 7 candidate is ever built, and this table is where that work starts.

#### 3.2.1 The registration shape, and the source it binds

These are one decision, not two. The shape determines what can hold the source; what holds
the source determines what the source can be; and that determines what a reactivity spec is
able to assert. Revision 1 settled them separately and got all three wrong.

**No subsection is numbered 3.2.2 here.** `docs/signals/phase-3-plan.md` § 3.2.2 is this
repo's construct-once finding, cited from `CLAUDE.md` and from the code-reviewer, and a
second § 3.2.2 in a sibling plan is the ambiguity § 9.1 already suffers from.

##### The shape — a factory, because a `LogicFn` cannot recover the source

Revision 1 specified the registrars as free functions `(path, expression, options?)`. That
cannot work, and the reason is 1.2.2 and 1.2.3 together: `RootFieldContext` exposes the
*current* field's node plus three compile-time-token accessors, and **no root or parent
handle**. A rule on `p.city` evaluating `country === "US"` has no route to `country` from
inside the `LogicFn`. The source must be closed over at registration or it is unreachable.

```ts
const rules = createExpressionRules(model);            // binds the model, builds the source
const s = schema<Model>((p) => {
  required(p.email);                                   // Angular's
  rules.evalVisible(p.city, 'country === "US"');       // ours
});
const f = form(model, s);
```

This preserves § 3.5.1's naming argument intact — the three registrars are still three
separate functions, one per Angular rule, and destructuring keeps `evalVisible` at the call
site. It is not the aggregate § 3.5.1 rejects: that was one call registering three different
Angular primitives, and this is one factory returning three registrars.

**The factory closes over one model, and nothing bounds it to one form.** Revisions 1–7 said
the opposite here — "it closes over one model, so it cannot be shared by two forms with
different models" — and Q7/Q9 refute it: `form()` takes the same model signal twice, and a
schema built from this factory and reused against a **second** model re-registers its rules and
still reads the **first** model's values, silently (§ 3.6.1). What actually bounds the context
lifetime is Angular, not this factory: Q8 measured the schema body re-running once per
`form()`, so each form mints its own contexts.

So the supported reuse shape is a schema **function of the rules** —
`const makeSchema = (rules) => schema<Model>(p => …)`, called per form — which keeps reuse
while giving each form a factory bound to its own model. A schema **value** shared across
models is the unsupported shape and is the subject of risk 7. § 3.6 states the resulting counts
and § 3.6.1 has the measurements.

##### The source — a private memo of per-key `computed`s, measured

**Revision 1's `() => model()[key]` was wrong, not shorthand.** `SignalContextSource` is
`Record<string, unknown>` and its resolver is `isSignal(value) ? value() : value`
(`modules/eval-signals/src/lib/signal-context.ts:198-201`), with the type's own docblock
saying functions are "passed through untouched." A bare arrow therefore resolves to the
**function object** — truthy, never called, never tracked — which is precisely the silent
freeze `modules/eval-forms/src/lib/field-context.ts:60-64` already records for the form half.

**Revision 2 replaced it with a record snapshotted from `Object.keys(model())`; revision 3
grew that record at resolve time; both are withdrawn.** The record is gone entirely. The
factory keeps a **private memo** nothing upstream can see, and the property resolution
happens **inside** the computed:

```ts
// eval-signals' own `resolve` (signal-context.ts:127-144), re-implemented — § 0.1
const readProperty = (model: Record<string, unknown>, key: string, caseInsensitive: boolean): unknown => {
  if (Object.prototype.hasOwnProperty.call(model, key)) return model[key];
  if (!caseInsensitive) return undefined;
  const lowered = key.toLowerCase();
  const match = Object.keys(model).find((candidate) => candidate.toLowerCase() === lowered);
  return match === undefined ? undefined : model[match];
};

// `signals/src/lib/model-source.ts` — module-private to the entry point (§ 5).
export interface ModelSource {
  /** One `computed` per key, per **factory**. Exported for the memo-identity assertion. */
  keySignal: (key: string) => Signal<unknown>;
  /** § 3.6's one context per rule per `form()`, built off the shared memo. */
  createRuleContext: () => EvalContext;
}

export const createModelSource = <TModel extends object>(
  model: WritableSignal<TModel>,
  options?: EvalOptions
): ModelSource => {
  const caseInsensitive = !!options?.['caseInsensitive'];   // index access, per CLAUDE.md
  const memo = new Map<string, Signal<unknown>>();

  const keySignal = (key: string): Signal<unknown> => {
    let cached = memo.get(key);
    if (!cached) {
      cached = computed(() => readProperty(model() as Record<string, unknown>, key, caseInsensitive));
      memo.set(key, cached);
    }
    return cached;
  };

  const createRuleContext = (): EvalContext => {
    const context = createFieldContext({}, {}, options);
    context.lookups.push((key) => (typeof key === 'string' ? keySignal(key)() : undefined));
    return context;
  };

  return { keySignal, createRuleContext };
};
```

**`createModelSource` is a named export, and `keySignal` reaches a spec on the object it
returns — that is a deliverable rather than a style note** (C3, W5). Revisions 1–5 wrote both
as closures inside `createExpressionRules`, and step 2 then
carried exit criteria — "the resolver is pushed onto the `lookups` of a context built by
`createFieldContext({}, {}, options?.eval)`, and both sources asserted empty", and a
"spec-local `computed` around `context.get(key)`" — with **no reachable subject**, because
revision 4 moved context construction into the registrars and step 2's registrars are stubs
that throw. A criterion whose object cannot be constructed by the step that states it is what
sends an implementer off to invent one. `createModelSource` is the object: `createRuleContext`
is callable in step 2's own specs, and `keySignal` is what the memo-identity criterion compares
across two reads. The registrars in step 4 call `source.createRuleContext()` once each and hold
the result; they build no context of their own.

This is a scope-and-naming call, so § 0.2 says settle it by argument and it is settled by
argument. Nothing about it turns on what Angular or `eval-core` does — the mechanism it exposes
is the one Q2/Q3/Q4 already measured, unchanged.

**Three things about that sketch are load-bearing and were each a defect one revision ago.**

- **The memo is a `Map`, not the source record.** Revision 3 wrote it back into the record
  `createFieldContext` hands to `createSignalContext`, and upstream's `resolve` enumerates
  that record with `Object.keys` under `caseInsensitive` (`signal-context.ts:137-143`). A memo
  entry spelled as the *expression* wrote it therefore becomes an **exact** match on the
  second read and shadows the model's own key for the life of the form. Q4 below is that
  defect observed.
- **Both sources are `{}`.** With resolution inside the computed there is nothing left for a
  static record to hold: the resolver answers every key, exactly and case-insensitively.
  `createFieldContext` is still what builds the context — not for its sources but for its
  **class**: it returns a `SignalEvalContext` whose `set` throws `SignalContextWriteError`
  (`signal-context.ts:112-117`), which is the error § 3.4 exists to re-throw. A hand-built
  `EvalContext` would silently accept an assigning expression.
- **The resolver's parameter is untyped.** `EvalLookup` is
  `(key: unknown, thisArg?: unknown, options?: EvalOptions) => unknown`
  (`eval-lookup.ts:3`), and under `strict` a parameter position is contravariant, so
  `(key: string) => …` does not compile. Upstream writes `(key) => …` for the same reason.
  The `typeof key === 'string'` narrowing is not defensive padding: without it a non-string
  key would be coerced into the memo as a spurious entry, which is the revision-3 defect in a
  second costume.

**What the spike measured.** Nine cases, both candidate shapes side by side, against a real
`form()` + `schema()` + `hidden(path, { when })`, a real `createFieldContext`, and § 3.3's
`evaluateRule`. **A** is revision 3's shape (seeded record, memo written back into it); **B**
is the one above.

| # | Question | Shape A | Shape B |
| - | -------- | ------- | ------- |
| 1 | Write a key the rule named — does it re-run? | invocations 1 → 2, `hidden` true → false | same |
| 2 | Write a key it did not name — does it stay put? | **delta 0** | **delta 0** |
| 2b | Same, under `caseInsensitive`, where B scans the whole model inside the computed | — | **delta 0** — per-key propagation holds |
| 3 | Key absent at factory time, added later (case-sensitive) | **resolves** | **resolves** |
| 4 | Expression names `Country`, model holds `country: undefined`, `caseInsensitive`, **second read** | **FROZEN** | **resolves** |
| 4b | Same, key absent at factory time too | **FROZEN** | **resolves** |
| 5 | Same rule twice on one context, throwing arrow first, **through `evaluateRule`** | `scopes.length` 0 → 0 → 0; the throw propagates; the second invocation reads `country` = `'US'` — **contained** | |
| 5b | Same, with the `finally` removed | `scopes.length` = **1** after the throw; the second read of `country` returns **`1`** — the arrow's own parameter, shadowing the source key | |
| 6 | Is a `SchemaPath` token identical across two property accesses? | `Object.is` → **true** (see § 3.6) | |

Rows 5 and 5b are shape-independent — they measure § 3.3's choke point, not the source — which
is why their cells span the table.

**Q5 and Q5b were measured with the rest and then carried in prose for a whole revision.**
Revision 4 cited them three times, in § 3.6 and in step 3, while its own table had seven rows
and § 0.2 said nine; the numbers existed and the document asserted them instead of recording
them. Left here as the plainest evidence for § 0.2 that this document contains: **a rule about
recording measurements does not apply itself**, and the revision that introduced the rule is
the one that broke it.

Q3 is why revision 3's reversal is narrowed rather than repeated: **it worked for the case it
was raised about.** Q4 is the case nobody reached by arguing, and it is the whole difference
between the two shapes.

Q2b is the measurement that pre-empts the obvious objection to B — that `readProperty` reads
`Object.keys(model())` and must therefore over-subscribe. It does not, and the reason is the
one the next paragraph already gives: the computed was reading the whole model before this
change too. Scanning it costs work inside a memoised derivation, not a dependency.

**Per-key propagation survives even though every `computed` reads the whole model.** Angular's
`computed` memoises on `Object.is` by default, so a write to `zip` re-evaluates each
computed's property read and propagates only from `zip`'s. A rule naming only `country` reads
only `country`'s computed, so it does not re-run. This is the one mechanism the whole
reactivity story rests on, and it is **no longer an inference about Angular's graph**: Q2
measured it end to end through Angular's own `hidden()`, which also settles the standing
question of whether Signal Forms invokes a `LogicFn` inside a memoising consumer at all. It
does. Step 2 still asserts it, because a plan's measurement is not a repository's regression
gate.

The cost per model write is O(keys some expression actually reads), not O(rules) and not
O(model keys): Angular's `computed` is lazy, so a key nothing names is never evaluated. Under
`caseInsensitive`, a key the model does not hold pays one `Object.keys` scan per evaluation of
*that key's* computed — bounded by the same memoisation, per Q2b.

**There is no seed loop, and dropping it costs a diagnostic that never worked.** Revisions 2
and 3 seeded the record from `Object.keys(model())` and revision 3 justified it by
`findNestedSignals`' scan. That justification was void: `findNestedSignals` only reports a key
whose value `isPlainObject` (`nested-signal-check.ts:52`), and every value in that record was
a `computed` — a function — so the loop skipped every key, seeded or not. The nested-signal
diagnostic does not reach `/signals` and never did. A consumer model of
`{ user: { name: signal('a') } }` gets no warning here, and the README caveat says so rather
than implying the scan covers this adapter.

**The read is what subscribes, and it happens even when the key resolves to `undefined`.**
That single sentence is the fix. `EvalContext.get` treats `undefined` as absent at every step
(`field-context.ts:28-30`), so a rule naming a key the model does not yet have still resolves
to nothing — but `keySignal(key)()` has been *called*, inside Angular's derivation, so the
rule is now subscribed to that key's computed. When the model gains the key, the computed's
value changes and the rule re-runs. A record that simply lacked the key returns `undefined`
without reading anything, subscribes to nothing, and is frozen for the life of the form.
Measured as Q3, in both shapes.

Two consequences of the shape, neither obvious:

- **The memo is mandatory, not an optimisation.** A resolver that built a fresh `computed`
  per read would hand Angular a new dependency on every invocation, so the previous one is
  dropped and the tracking churns. The `Map` also means a key first read by one rule is
  already built for the next — one computed per key per **factory**, not per rule, even though
  the contexts are per rule **per `form()`** (§ 3.6, Q8).
- **A `computed` is created inside Angular's reactive consumer**, on the first read of any
  key. That is allowed — `computed()` needs no injection context and is not `effect()` — and
  the spike exercised it in every case above rather than reasoning about it. It is the inner
  computed that becomes the active consumer for its own body, so `model()` is attributed
  there and the outer consumer records the inner one as a dependency, which is exactly what
  Q2's delta of 0 demonstrates.

**The correction to revision 2's own reasoning, stated rather than quietly dropped.** Revision
2 argued the frozen key set was acceptable because *a Signal Forms schema addresses fields by
compile-time path (`p.city`), so a key the model gains at runtime has no path that could name
it*. That argument is true, and it is about the wrong thing. It is about **paths** — which
fields a rule can be attached to. The failure is about **values** — which keys an expression
is allowed to read. In `rules.evalVisible(p.city, 'country === "US"')` the path is `p.city`
and the key read is `country`, and nothing requires `country` to be an own property of the
model object when `createExpressionRules` runs: an optional field, a model the user fills in,
a partial loaded from an API, or a model typed with optional members and initialised `{}` all
produce a key set that grows. The path argument never touched that case.

**And nothing in the plan as written would have caught it.** Every fixture in steps 2 and 4
used a fully-populated model, so the discriminating condition — an expression naming a key
the model does not have yet — was not reachable from any of them. This is
[`CLAUDE.md`](../../CLAUDE.md)'s setup failure rather than its assertion failure: breaking the
implementation would have turned tests red and none of them would have been this one. Steps 2
and 4 therefore gain a fixture whose model omits a key its expression names, and that fixture
is the gate on this section.

The `Proxy` alternative **stays rejected, and the reason has changed twice, so here is the
final one**: it existed to make the record's key set live, and there is no record. It would
have to implement `has`, `ownKeys` and `getOwnPropertyDescriptor` to satisfy `resolve`'s
`hasOwnProperty` and `Object.keys` (`signal-context.ts:133,142`) to buy a property the
resolver has without traps.

**What is limited, stated for the README beside `/reactive`'s key-set caveat.** Two things,
and neither is resolution — every key an expression can name resolves, at any spelling the
`caseInsensitive` option allows, whether or not the model held it when the form was built:

- **The nested-signal diagnostic does not reach this adapter**, per the paragraph above. A
  model property holding a signal is read un-called by the member visitor and nothing warns.
- **Enumeration of the form's keys is not available to anything upstream**, because the memo
  is deliberately private. That is the fix, not a cost: the record being enumerable by
  `resolve` is precisely what produced Q4's freeze.

`caseInsensitive` matching is now **ours** rather than upstream's, since `resolve` is
module-private in `eval-signals` and could not be called. `readProperty` above is a
re-implementation of its exact rule, and § 0.1 requires that be said plainly rather than
recorded as a borrow: the two must agree, and if `resolve` ever changes, this is the second
copy that does not know.

### 3.3 The choke point — core or adapter, measured

[`phase-4-plan.md`](phase-4-plan.md) § 9.1 states the precondition and explicitly leaves the
placement to this phase. It is not settled here by argument. Both placements were built
against a realistic helper and the difference measured.

**The helper, as built for the measurement** — the shape both placements share:

```ts
export const evaluateRule = (
  compiled: stateCallback,        // eval-core's own published type (§ 5)
  context: EvalContext,
  options?: EvalOptions
): unknown => {
  const depth = context.scopes.length;
  const state = EvalState.fromContext(context, options);
  try {
    return call(compiled, state);
  } finally {
    while (context.scopes.length > depth) {
      context.pop();
    }
  }
};
```

Placed at `modules/eval-forms/src/lib/evaluate-rule.ts` and exported from
`src/public-api.ts`, then built with `nx run eval-forms:build:production` and compared
against the unmodified baseline. The probe was reverted; the numbers are what it produced.

| Measurement | Core placement | Adapter placement | Separates? |
| ----------- | -------------- | ----------------- | ---------- |
| `@angular/core` imports in `modules/eval-forms/src/` | **0** | 0 (core untouched) | **no** |
| `/reactive` FESM size | 25,748 B — **unchanged** | 25,748 B | **no** |
| Occurrences of the helper in `/reactive`'s FESM | **0** | 0 | **no** |
| Primary FESM size | 7,096 → **7,487 B** (+391) | 7,096 B | marginal |
| Symbol in the primary entry point's published `.d.ts` | **`declare const evaluateRule` added** | absent | **yes** |
| Can the choke point be module-private? | **no** | **yes** | **yes** |

**Three of the four hypotheses that looked like discriminators are not.** In particular the
one that motivated the question — that a core-placed helper would be dead weight in
`/reactive`'s bundle — is false: ng-packagr compiles each entry point separately and the
helper does not appear in `/reactive`'s FESM at all, at zero bytes. Anyone re-deriving this
by reasoning will get it wrong, which is why it is a table.

**What does separate them is the published surface, twice over.**

- Barrels re-export whole modules (`export * from './lib/…'`), so a helper in the core
  reachable from `src/public-api.ts` **is published**, permanently, on an entry point
  already released at 0.1.0. The measurement shows `declare const evaluateRule` appearing in
  `dist/modules/eval-forms/types/zvenigora-ng-eval-forms.d.ts`.
- In the adapter it can live at `signals/src/lib/evaluate-rule.ts` and simply not be listed
  in `signals/src/public-api.ts` — **module-private to the entry point**, changeable by any
  later phase without a release.

That second row is the one that matters for the invariant itself. § 9.1's requirement is
that there be no second path to the walk. A public `evaluateRule` guarantees a second path
*by existing*: any consumer can call it with a hand-built `EvalContext`, and the containment
guarantee becomes a documented API this package owes forever. Module-private, the set of
callers is the set of files in `signals/src/lib/`, which is checkable by grep in one
directory.

**Decision: the adapter.** Neither placement can stop a rule inside the adapter from
importing `call` directly — that is equivalent, and § 6's grep is the gate for it either
way. What is not equivalent is who else can reach the walk, and how permanent the answer is.

**What would have flipped it:** if `/reactive` needed the same containment, the core
placement would win on duplication. It does not — `/reactive` goes through
`createEvalSignal`, which contains scopes itself, which is § 9.1's own revision note.

### 3.4 `applyErrorPolicy`, and the error that must not be caught

`applyErrorPolicy` is written this phase against the shipped `ExpressionErrorPolicy`
(`'throw' | 'undefined' | ((error: unknown) => unknown)`), default `'undefined'`.

It goes in the **core**, unlike the choke point, and the difference is deliberate: it is a
pure function over a type the core already publishes, with no Angular and no `EvalContext`,
and both adapters could reasonably use it. § 3.3's decisive argument does not apply — there
is no invariant that a second caller would break.

**It must re-throw `SignalContextWriteError` in every mode** (1.2.11). On `/reactive` this
came free from `createEvalSignal`; here it does not exist unless written. The failure it
prevents: an assigning expression is illegal on every recompute with every dataset — a bug
in the rule's syntax — and a default of `'undefined'` would render it as a permanently blank
field with nothing in the console.

```ts
export const applyErrorPolicy = <T>(run: () => T, policy: ExpressionErrorPolicy = 'undefined'): T | undefined => {
  try {
    return run();
  } catch (error) {
    if (error instanceof SignalContextWriteError) throw error;   // never policy-routed
    if (policy === 'throw') throw error;
    if (policy === 'undefined') return undefined;
    return policy(error) as T | undefined;
  }
};
```

**The bypass holds for a top-level assignment and not for one nested inside a call, and that
is a boundary on the guarantee rather than a caveat about a corner** (new in revision 14,
measured in step 3). `safeCall` catches whatever a callee threw and re-raises
`new Error(\`Function call error: ${error.message}\`)`
(`modules/eval-core/src/lib/internal/visitors/call-expression.ts:126-128`), so an error
crossing a call frame loses its class. `country = "CA"` throws `SignalContextWriteError` and
is re-thrown as this section promises; `[1].map(x => (country = "CA"))` arrives at
`applyErrorPolicy` as a plain `Error`, fails the `instanceof`, and is policy-routed to
`undefined` — the silently blank field this whole section exists to prevent, in the one shape
where the mechanism cannot see it.

Three things follow, and the order matters:

- **The shape a rule would actually take is unaffected.** A field property is an expression
  whose *value* drives the property; an assignment is already a misuse, and a rule author
  writing one writes `country = "CA"`, not an assignment buried in a `.map` callback. The
  unprotected shape is a misuse inside a misuse.
- **It is not fixable here.** The re-wrap is `eval-core`'s, inside the walk, and the routing
  Phase 3 used to escape the *service*-layer version of this wrapper — call the free
  `call(fn, state)` — does not apply to a wrapper the walk itself runs. § 2 scopes this phase
  to add nothing to `eval-core`, so this is recorded and deferred, not worked around. Matching
  on the decorated message would couple this package to another library's error wording, which
  is the coupling [`ROADMAP.md`](../../ROADMAP.md) already names as the reason that wrapper is
  a defect.
- **It is recorded twice, deliberately**: in `ROADMAP.md`'s "Deferred defects in the visitor,
  context and service layers", because the fix is upstream and the blast radius is every
  custom error type rather than this one class; and in step 7's README list, because a
  consumer meets this as a blank field with nothing in the console and has no route from the
  symptom to the cause.

**It re-throws the error it caught; `/reactive` re-wraps.** `eval-signal.ts:353-354` throws a
*new* `SignalContextWriteError` carrying the offending expression string, which
`createEvalSignal` has and this path does not — the `LogicFn` holds a compiled callback, not
the source text. So the same misuse surfaces a different object at each entry point: wrapped
with the expression under `/reactive`, the original under `/signals`. Stated rather than
hidden, per § 0.1's second half, and it is the one thing a consumer catching this error
across both adapters would notice.

**This makes the core import a value from `eval-signals`, and that is the point rather than
a cost.** `SignalContextWriteError` is a class; `instanceof` needs the constructor, not the
type. `field-context.ts` already imports `createSignalContext` from the same package, so
there is no new dependency edge — and the value import **is** the enforcement that
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s
`/signals` Critical item 2 asks for. ~~A type-only import would compile and the guard would
silently never fire, so the import's form is load-bearing: a step that "tidies" it to
`import type` disables the bypass with a green suite. Step 3's exit criterion is what
catches that.~~ — **Superseded by revision 13 item 2, which measured it rather than reasoning
about it.** `import type` is **TS1361** at the `instanceof`, so it fails `build:production`,
gate 7, and both policy arms under ts-jest. The criterion stands and the value import stays;
what the criterion covers is the bypass's **behaviour** across the package boundary — where
two resolved copies of `eval-signals` really would make `instanceof` silently false — and not
the import's form, which the compiler already owns.

#### 3.4.1 Why this is the opposite call from § 3.3, which it superficially contradicts

Two placement decisions in one plan, going opposite ways, and the pair reads as inconsistent
unless the discriminator is stated. It is not "core by default" or "adapter by default" — it
is **what the symbol grants a caller who reaches it**.

- `evaluateRule` **is a second path to the walk.** Publishing it hands any consumer the
  ability to run an expression against a hand-built `EvalContext`, which is precisely the
  thing § 9.1 requires there be only one of. The published surface *is* the bypass, so
  keeping it module-private is the invariant, not tidiness.
- `applyErrorPolicy` is a pure function over an error and a policy. It takes no
  `EvalContext`, holds no compiled callback and cannot reach a walk. Publishing it grants a
  caller nothing they could not write themselves in four lines, so it costs nothing — and
  it buys the thing duplication would lose: **one implementation of the write-error bypass
  for both adapters.** In the adapter, `/reactive`'s eventual version drifts from
  `/signals`', and the two would disagree about the one error that must never be swallowed.

So: a symbol whose reachability is itself the risk stays private; a symbol whose only risk
is divergence goes in the core where there can be exactly one of it.

### 3.5 Which properties ship

| This library | Registers (config overload, 1.2.7) | Coercion | Note |
| ------------ | --------------------------------- | -------- | ---- |
| `evalVisible` | `hidden(p.x, { when: () => !toVisible(evaluated()) })` | `toVisible` (shipped) | Inverted — § 3.5.1 |
| `evalText` | `metadata(p.x, TEXT, () => toText(evaluated()))` | `toText` (shipped) | `TEXT = createMetadataKey<string>()` (1.2.8) |
| `evalDisabled` | `disabled(p.x, { when: () => … })` | `toVisible`'s rule | § 3.5.2 for the reason |

**`evaluated()` above is not a placeholder for "the walk" — it is `applyErrorPolicy` wrapping
the walk, and every `LogicFn` body has exactly this shape:**

```ts
const evaluated = () =>
  applyErrorPolicy(() => evaluateRule(compiled, context, options?.eval), options?.onError);
```

Revisions 1–4 elided this and the omission was load-bearing twice over. **`onError` is
published in `ExpressionRuleOptions` (§ 5) and nothing else in the plan wired it up**, so a
registrar calling `evaluateRule` bare would satisfy every exit criterion and every § 6 gate
while an expression that throws took down the derivation and an assigning one rendered a
blank field — the `/signals` checklist's Critical item 2, untested end to end.
`phase-4-plan.md:1911-1913`'s sketch had the wrapper; this plan dropped it in transcription.

**`applyErrorPolicy` must be the outermost call in the body**, ahead of the coercion and
ahead of any guard a later phase adds. Two things depend on that and neither is obvious:
the policy has to cover the coercion's input rather than only the walk, and § 6.1.1's
invocation instrument counts this call — **M7** measured what happens to that count when the
wrapper sits under a branch instead of over one, and it is 0 against a ground truth of 1.
(Revision 5 cited **M6** here, which measures the opposite arrangement — a guard *inside* an
outermost wrapper, still tracking 1:1. § 0.2 records why that substitution is a class of error
and not a slip.)

#### 3.5.1 Naming — `eval<Property>`, registering Angular's own rule

Settled here rather than deferred, because it interacts with
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s `/signals`
item 4: use Angular's own primitives, do not build a second mechanism beside them. Naming is
where that goes wrong first, since these functions sit in a consumer's schema literally
beside `hidden`, `disabled`, `required` and `metadata`:

```ts
const s = schema<Model>((p) => {
  required(p.email);                              // Angular's
  hidden(p.state, { when: ctx => !ctx.valueOf(p.isUs) });   // Angular's, a closure
  rules.evalVisible(p.city, 'country === "US"');            // ours, a string
});
```

Three rules, and each earns its place:

1. **One call per Angular rule, never an aggregate.** A single
   `evalRules(p.x, { visible, text, disabled })` was the alternative and is rejected: it
   would register three different Angular primitives behind one name, hiding which one each
   property maps to. That is item 4's failure mode expressed as an API — a consumer reading
   the schema could no longer see that `text` *is* `metadata` and `visible` *is* `hidden`.
2. **The `eval` prefix, for provenance and collision-safety.** The prefix says the argument
   is a string evaluated at runtime rather than a closure, which is the one thing a reader
   must know at the call site. A bare `visible` would not collide with Angular's exports
   today, but `hidden`, `disabled`, `readonly` and `required` are all taken, and a library
   whose names sit in someone else's namespace should not bet on the remainder staying free.
3. **Named after the property, not after Angular's rule — so the expression ports.**
   `evalVisible` registers `hidden`. That mismatch is deliberate: § 8.2's principle is that
   an expression means the same thing at both entry points, and `/reactive` already ships
   `visible`. Naming ours `evalHidden` would mirror Angular but force the consumer to invert
   the expression when moving a schema between adapters — the same rule string producing the
   opposite result, which is exactly the class of bug § 8.2 exists to prevent.

   **The inversion therefore lives inside `evalVisible`**, once, next to `toVisible`, rather
   than in every consumer's expression. It is worth a loud line in the README precisely
   because `evalVisible` and `hidden` will appear adjacent in real schemas with opposite
   polarity.

`evalDisabled` has no such tension: `/reactive` does not ship `disabled` at all, and
Angular's polarity is already the one an author expects.

`disabled` is the property Phase 4 deferred *to here*, and none of the three problems that
blocked it under Reactive Forms exists: it does not emit on a value stream, it does not
remove the value from a parent aggregate, and it is declarative rather than a write.

**The one new decision is its return type.** `boolean | string` means a truthy string is
both "disabled" and "the reason". A rule returning `'false'` would disable the field with
the reason `"false"` — the same truthiness trap `toVisible` documents.

#### 3.5.2 The disabled reason — a static option, not the expression's return

§ 8.3 deferred this in revision 1 pending "a schema shape that separates the two." The
review suggested Angular's non-deprecated config overload is that shape. **It is not**:
`disabled`'s config is a single field, `{ when?: string | LogicFn<…, boolean | string> }`
(1.2.7), so the reason still arrives as the *return value* of the same function that decides
the condition. Checked before acting on it.

What does separate them is ours to build, and it costs one option:

```ts
rules.evalDisabled(p.zip, 'country !== "US"', { reason: 'ZIP is US-only' });
// registers: disabled(p.zip, { when: ctx => truthy ? 'ZIP is US-only' : false })
```

The expression stays boolean and is coerced by `toVisible`'s rule; the reason is authored
separately as a static string and is never expression-derived. **That is what kills the
trap** — a rule yielding `'false'` disables the field with the *authored* reason, not with
the reason `"false"`, because the string never comes from the expression.

**Taken, rather than deferred again.** It is three lines in the registrar, adds no Angular
surface beyond the `disabled` call already being made, and recovers capability that would
otherwise be silently dropped at the entry point where Angular owns the semantics. A
*dynamic* reason — the string coming from a second expression — stays out: it reopens the
trap and needs its own coercion rule.

#### 3.5.3 Option resolution — registration wins per key, and `caseInsensitive` is only two-thirds resolved

`ExpressionRuleOptions` arrives twice: once at `createExpressionRules(model, options)` and once
at each `rules.evalVisible(path, expression, options)`. Revisions 1–14 never said how the two
combine, while the type's own docblock says a registration "may override" the factory's. **The
rule is registration wins, per key** — `rule?.eval ?? factory?.eval` and
`rule?.onError ?? factory?.onError`, resolved independently, neither a deep merge.

**That rule is exact for `onError` and partial for `eval.caseInsensitive`, and the gap is a
wrong answer rather than a missing feature.** § 3.6 gives the memo one lifetime — per factory —
so `createModelSource(model, options?.eval)` runs once, at `createExpressionRules` time, and
`readProperty`'s `caseInsensitive` is fixed there. **A registration supplying a different one
moves exactly one of the three places it has to reach**, and the other two are factory-bound
for the same reason:

| Place | Built from | Reached by a per-registration `eval.caseInsensitive`? |
| ----- | ---------- | ---------------------------------------------------- |
| the walk's options — `evaluateRule`'s third argument | the resolved per-rule options | **yes** — corrects *property* names; the member visitor reads the flag off the state (`CLAUDE.md`, "Context resolution") |
| the rule's context — `createFieldContext({}, {}, options)` | `createModelSource`'s parameter, i.e. the **factory's** `eval` (`model-source.ts:155`) | **no** — and it is inert either way, since both of that context's own sources are `{}` (§ 3.2.1) |
| the factory's memo — `readProperty` | the same factory parameter | **no** — and this is the resolver that actually answers every identifier at this entry point |

**"Two of three" is what revision 15 first wrote, and it was wrong**: `prepare` obtains its
context from `source.createRuleContext()`, which closes over the factory's options rather than
taking the rule's. Recorded rather than silently corrected, because the count is the premise the
two deferred fixes below are chosen between — under the true count, moving `caseInsensitive`
onto `createExpressionRules`' signature is the cheaper of the two rather than the more
invasive, since two of the three levers already live there.

So `rules.evalVisible(p.city, 'Country === "US"', { eval: { caseInsensitive: true } })` against
a factory built without it, and a model holding `country`, resolves `Country` to `undefined`
while correcting every *property* name in the same expression. One expression, two casing
rules, no error.

**Decision: no throw. Registration wins uniformly, the divergence is documented, and the fix is
deferred to a phase that can afford it.** Rejecting a registration whose `caseInsensitive`
differs from the factory's resolved value was the alternative, and it is rejected on two
grounds:

- **It enumerates one key of an open set.** `EvalOptions` is
  `Record<string, unknown> | { caseInsensitive: false }`, so any later option with factory reach
  recreates this gap and a guard naming `caseInsensitive` does not cover it — while teaching the
  reader that the set is closed. That is § 0.2.1's shape: a check attached to the one case
  somebody thought of.
- **It fires at the wrong time with the wrong blast radius.** Registration runs inside the
  schema body, during `form()` (Q8), so the throw takes down the entire form over a
  misconfiguration affecting one rule's identifier casing — and it is unreachable through
  `onError`, which exists precisely so a bad rule degrades to a blank field rather than a dead
  form (§ 3.4.4).

**The real fix makes the gap unreachable rather than loud**, and both shapes of it change
something § 3.6 or § 5 states, which is why neither is taken here: move `caseInsensitive` onto
`createExpressionRules`' own signature, where it already effectively lives, or key the memo on
`(key, caseInsensitive)` and give up "one computed per key per factory". Named so a later phase
inherits the choice rather than the surprise.

**Pinned by a characterisation case in `rules.spec.ts`**, on Q9's precedent: this is behaviour
that is wrong and shipping, so the spec records the limitation and goes red if a later change to
the memo's lifetime silently reverses it. Nothing else in step 4 would touch it — the divergence
needs options set at *both* levels, which no other fixture does.

### 3.6 Lifetime — there is nothing to destroy, and that is the finding

Phase 4 § 3.7 is N × M `EvalSignal`s and a `destroy()` the consumer calls. Here:

- No `EvalSignal` is created. No `DestroyRef` registration, no `destroy()`.
- Angular owns the `FieldTree`'s lifetime and the `LogicFn`s die with the schema.

What the adapter **does** retain, per `createExpressionRules` call: **one private memo**
(§ 3.2.1 — one `computed` per key any expression has named, built on first read, bounded by
the union of the keys the rules mention), **one `EvalContext` per rule per `form()`**, and
**one compiled callback per rule per `form()`**. All three are closed over by the `LogicFn`s.
The first lives on the `ModelSource` of § 3.2.1 and the other two come from
`createRuleContext()` and `compile()` inside each registrar — which is what lets step 2 assert
the memo half before any registrar exists (C3).

**"Per rule per `form()`" is Q8's wording and revisions 1–7 said "per rule".** The registrar
body re-runs on every `form()` built from the schema, so N forms from one schema hold N × rules
contexts and N × rules compiled callbacks, all of them garbage when their form is. The memo is
the exception: it belongs to the factory, so it is per **factory** — which equals per form only
in the supported shape of § 3.2.1, where each form gets its own.

**One context per rule, and revisions 1–3 said "per field".** The plan never stated how the
factory would recognise that `rules.evalVisible(p.city, …)` and `rules.evalText(p.city, …)`
name the same field, which would need the `SchemaPath` token to be a stable identity. **Q6
measured that it is** — `p.city` accessed twice inside one schema gives `Object.is → true` —
so per-field keying is available, and this is a decision rather than a limit:

- Containment makes the count a question of economy, not of correctness. Q5 measured a
  throwing arrow inside `evaluateRule` leaving `scopes.length` at 0 and the next invocation
  on the same context resolving its key correctly. A shared context is not carrying anything
  forward to be shared.
- Per-rule is the strictly safer end of the range, and § 3.4.1's argument — a leak sitting
  ahead of another rule's source key — has no reachable form at all when no two rules share
  a context.
- Token identity is an unpromised implementation detail of a library this plan already lists
  under risk 5. Per-field would buy a smaller number of small objects and would owe a spec
  pinning someone else's `Proxy` behaviour.

The memo is still per **factory**, so the computeds are shared across every rule that factory
registers — and across every `form()` built from them, which is Q9's mechanism seen from the
other side. What multiplies, per rule and again per `form()`, is an `EvalContext` holding an
empty source and a `lookups` array of three entries.

#### 3.6.1 The reusable-schema question, measured — and the answer replaces the hazard rather than closing it

Revisions 1–6 said: a module-scope `const s = schema<M>(p => …)` that closed over
registration-time contexts would share them across every `form()` built from it, so field A's
leaked scope in instance 1 would sit ahead of field A's source key in instance 2, permanently
— § 3.3's `finally` bounds a leak *per walk*, not per form. And they then declared it
**structurally unreachable "because the factory binds one model, so it cannot be shared by two
forms."**

**That argument is false, and C1 was right to reject it.** `form<TModel>(model:
WritableSignal<TModel>, schemaOrOptions)` (`_structure-chunk.d.ts:1908`) does not stop two
`form()` calls on the *same* model signal, and § 1.2.6 already established that `form()` does
not copy it. Q7 built two forms from one model signal: **no throw, two distinct trees, both
functional.** So binding one model never bounded anything, and the conclusion rested on a
premise the type signature contradicts.

**The conclusion survives on measured ground, and it is a stronger one.** Q8 ran the module-
scope shape — one `schema()` built once from one factory, then two `form()` calls:

| Stage | registrar bodies run | contexts minted |
| ----- | -------------------- | --------------- |
| after `schema<Model>(p => …)` | **0** | 0 |
| after `form(modelA, s)` | **1** | 1 |
| after `form(modelB, s)` | **2** | 2 |

Two distinct `EvalContext` identities. **Angular re-invokes the schema body once per `form()`,
so a reused schema does not share contexts — it mints fresh ones per form.** The scope-sharing
hazard is unreachable, and the reason is Angular's re-invocation rather than anything this
plan does. Revisions 1–6 reached the right answer through an argument that does not hold,
which is § 0.2's whole subject.

**What replaces it is worse, louder in effect and quieter at the call site (Q9).** The
registrars close over the **factory's** model, and the factory is bound to one model. So a
schema built from `createExpressionRules(modelA)` and reused for `form(modelB, s)` re-runs its
registrars — and every rebuilt rule still reads **model A**:

| Q9 | `fA.city().hidden()` | `fB.city().hidden()` |
| -- | -------------------- | -------------------- |
| `modelA.country = 'US'`, `modelB.country = 'CA'` | false | **false** — should be true; B evaluated A's `country` |
| then `modelA.country = 'FR'` | true | **true** — B followed A |

Form B renders against form A's data, on every rule, silently. No error, no warning, and the
form is fully functional — it is simply wrong. That is a correctness defect where the old
hazard was a containment one, and it is reachable by exactly the pattern § 3.6 previously
recommended as the safe one.

**So `makeSchema = (rules) => schema<M>(p => …)` is promoted from an aside to the documented
pattern, and it works for a reason that is now stated:** it takes the rules as a parameter, so
each form gets a factory bound to its own model. A schema value shared across models is the
unsupported shape. § 4's step 4 pins Q9's behaviour so a change to it is noticed, step 7's
README carries the caveat, and risk 7 is rewritten around this rather than around the leak.

That is the count-and-lifetime statement § 6 asks the reviewer to be able to make from the
diff. It needs no teardown API: nothing here registers with a `DestroyRef`, and everything
becomes garbage with the form.

**Never one context shared across rules**, for Phase 4 § 3.4.1's reason. It is worth being
exact about how much of that reason survives measurement: § 3.3's containment bounds a leak
to one walk and Q5 confirms it does, so the shared-context hazard is not live while the
`finally` is there. Per-rule contexts are what make it unreachable *if the `finally` is ever
removed* — belt and braces, and Q5b shows what the braces are holding. That is a weaker claim
than revisions 1–3 made, and it is the true one.

### 3.7 The Angular 22 boundary

`peerDependencies` are per package, so the manifest cannot narrow to `>=22` without breaking
`/reactive` consumers on 19–21. The loud failure for a 19–21 consumer importing `/signals` is
inherited from Angular's own `exports` map (`Cannot find module '@angular/forms/signals'`).

**The checkable invariant is confinement**: `@angular/forms/signals` must be imported only
under `modules/eval-forms/signals/`. The workspace is on 22.0.8, so a leak into the shared
core or `/reactive` compiles green here and fails in the consumer's build. § 6 makes it a
grep.

### 3.8 Prototype-shadowed identifiers — the same question Phase 4 answered, on a path that owns a different input

**The failure, measured** (W1). `createSignalContext` builds its context on an empty
`original` (`signal-context.ts:196`), and `EvalContext.get` consults `original` *before*
`lookups`, reading a plain object as a bare property access. So an identifier naming an own
property of `Object.prototype` resolves off the prototype and **never reaches § 3.2.1's
resolver at all**. Q10, through a real `createRuleContext()` context:

| Identifier | Resolves to | Under `caseInsensitive` |
| ---------- | ----------- | ----------------------- |
| `constructor` | `function Object()` | `function Object()` |
| `toString`, `valueOf`, `hasOwnProperty` | functions off `Object.prototype` | the same functions |
| `CONSTRUCTOR` | **`undefined`** | **`undefined`** |
| `country` (a real model key) | `'US'` | `'US'` |

And Q11, end to end: **`rules.evalVisible(p.city, 'constructor')` renders the field**, against
a model with no such key, with nothing logged. A function is truthy, so `toVisible` says
visible — the field with no data is precisely the one that shows.

**Two things the table says that the reasoning did not.** The behaviour is **identical** with
and without `caseInsensitive`, so this is *not* GHSA-pj3p-xpg7-h7gw's case-variant bypass —
that shape needs `member-expression.ts`'s resolved-key re-check, which is about property
access and is already `eval-core`'s. What is here is narrower and dumber: `constructor`
returns a function and `CONSTRUCTOR` returns `undefined`, **in both modes**, so under an option
whose entire purpose is that spelling stops mattering, spelling decides the answer. That is an
inconsistency, not an escalation, and it is worth being exact because the family resemblance
invites the stronger claim.

**§ 0's premise is the test of any answer**, and it is not an edge case here: the condition is
a string authored in a builder UI, and the model arrives from an API. `visible: "constructor"`
is a plausible thing for a form author to type by accident — a field genuinely named
`constructor` in a server-supplied schema — and the result is a field that always renders.

**Phase 4 answered this by rejecting the name at construction** — `field-schema.ts:172-178`
throws on a schema field name that is an own property of `Object.prototype`, and again at
`:214-220` over the group's controls, because that layer is the only one that can name the
offending field. `phase-4-plan.md` § 3.4.3 calls it "the strongest argument for validating
schemas at construction". **`/signals` gets the same answer and a different subject.**

**Decision: reject at registration, on the *expression*, not on the field name.** The two entry
points own different inputs. `/reactive` owns the field names — they arrive in its own
`FieldSchema[]`. Here the field paths are compile-time `p.city` tokens, the consumer's own
TypeScript, and the library never sees a name it could validate. What it does see, at
registration, is **the expression** — it already calls `parse(expression, defaultParserOptions)`
there (§ 3.1). So the registrar walks the AST it has just built and throws on any `Identifier`
whose name is an own property of `Object.prototype`, naming the expression and the identifier.

**And the expression is the complete subject, which the field name would not have been.** A
model key is only ever read because some expression names it; an unnamed key harms nobody. All
expressions are known at registration, whatever the model does later — so this check does not
inherit § 3.2.1's growing-key-set problem, which is exactly why revision 2's seed loop over
`Object.keys(model())` was withdrawn. A construction-time scan of the *model* would have that
problem and would buy nothing on top. It is not taken.

**Mechanism — borrowed** (§ 0.1). `acorn-walk`'s `simple` walker, from the package `eval-core`
itself walks with (`recursive-visitors.ts:12`, `import * as walk from 'acorn-walk'`), rather
than a hand-rolled AST scan. It costs a manifest line: `acorn-walk` is a `peerDependency` of
`@zvenigora/ng-eval-core` and is **not** declared by `@zvenigora/ng-eval-forms`, so the adapter
would be importing an undeclared dependency — which resolves today by accident of hoisting and
would not resolve at all under pnpm's isolated layout. § 4's step 6 adds it at `eval-core`'s own
range, `acorn-walk ^8.3.0`.

**`acorn` itself is deliberately not added**, though `eval-core` declares it: this adapter
imports no `acorn` symbol (§ 5's list names only `acorn-walk`'s `simple`), and `acorn-walk@8.3.5`
declares `acorn ^8.11.0` as a real **dependency**, so it arrives regardless. An unused peer on a
published manifest is surface without a caller.

**This is a manifest change to a published package and is called out as one.** It imposes no
new install: a consumer of `eval-forms` already peer-depends on `eval-core`, whose peers include
`acorn-walk ^8.3.0`, so npm 7+ has already placed it and a strict consumer who satisfied
`eval-core`'s peers by hand needs nothing further. It still belongs in the CHANGELOG and in the
README's `Versions` block — which quotes `peerDependencies` verbatim (`README.md:59-69`) and
would otherwise reproduce a manifest the package no longer has. Step 7 carries both.

**The residual, stated rather than implied.** A *member* expression — `user.constructor` — is
not this check's business and is `eval-core`'s prototype-pollution guard, with the
`!isPrimitive` gate [`CLAUDE.md`](../../CLAUDE.md) records. A model key named off
`Object.prototype` that no expression names stays unreadable and unreported, which is harmless
by the paragraph above and is the one thing `/reactive`'s second check covers that this does
not. Both go in step 7's README beside the other caveats.

#### 3.8.1 Arrow parameters — the guard over-rejects, deliberately

An expression may bind its own names: `'[1].map(valueOf => valueOf)'`. Does the guard reject
it? Two implementations of § 3.8 answer differently and revision 8 decided neither, so both
passed step 6 (W2).

**The arrow's own frame is genuinely safe, and the reason is the resolution order this whole
section turns on.** `EvalContext.get` resolves **`scopes` first**, `original` second,
`priorScopes` third, `lookups` fourth ([`CLAUDE.md`](../../CLAUDE.md), "Context resolution").
`arrow-function-expression.ts:14-19` pushes the parameters as a scope, so a bound `valueOf`
is found at **step 1** and shadows `Object.prototype` at step 2 — resolved correctly, with the
prototype never consulted. **A model key is unsafe for the mirror-image reason**: it arrives
through `lookups`, at step **4**, *behind* `original`. Same name, opposite outcomes, and the
gap between step 1 and step 4 is the entire subject of § 3.8.

So rejecting a bound `valueOf` refuses an expression that would have worked. **Take it
anyway.** Three reasons, in the order they decide it:

1. **The alternative is a second copy of `eval-core`'s frame logic.** A scope-aware guard must
   track what `arrow-function-expression.ts:14-19` *and* `pattern.ts:110-113` push, including
   destructuring patterns, and stay in sync with two visitors this phase does not own and § 2
   forbids changing. § 0.1 and [`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)'s
   `/signals` item 4 both make a working parallel mechanism a finding — and a scoping
   implementation that silently drifts from the real one is the worst shape of that, because
   it fails by *under*-rejecting.
2. **The costs are asymmetric and the guard exists because of the asymmetry.** Over-rejecting
   is a named error at registration whose fix is renaming a parameter. Under-rejecting is
   Q11: a field that always renders, silently, in production. A check built to convert a
   silent wrong answer into a loud one should not acquire a silent failure mode to spare a
   rename.
3. **No name the predicate matches is natural as a parameter.** Seven of them are names a
   form author might plausibly type — `constructor`, `toString`, `valueOf`, `hasOwnProperty`,
   `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString` — and that list is
   **illustrative**. **The predicate is normative**:
   `Object.prototype.hasOwnProperty.call(Object.prototype, name)`, § 3.8's wording and
   `field-schema.ts:172`'s precedent, which matches **twelve** names —
   `Object.getOwnPropertyNames(Object.prototype)` adds `__proto__`, `__defineGetter__`,
   `__defineSetter__`, `__lookupGetter__` and `__lookupSetter__`. Revision 18 corrects a
   sentence that gave the count as seven flat; step 6 asserts one of the five so that the
   wider reach is gated rather than incidental.

**It is recorded as a false positive, not as a hazard.** The README says the guard rejects
these names anywhere in an expression, including where the expression binds them itself, and
that the fix is to rename the parameter — not that binding one is dangerous.

**One line the borrowed walker draws, which is a property of the borrow rather than a
decision.** `acorn-walk`'s `base.Function` walks parameters with the `"Pattern"` override,
reaching `VariablePattern` → `ignore` (`walk.js:287-306`), and `simple` suppresses its callback
whenever an override is passed — so a **binding** is never visited as an `Identifier`. The
body re-dispatches with no override, so a **reference** is. `'[1].map(valueOf => 1)'` therefore
registers and `'[1].map(valueOf => valueOf)'` throws. Recorded because a hand-rolled scan over
every node would reject both, which is the difference § 0.1 asks a borrow to be checked at.

**Why it ships here rather than deferring, which was the alternative — and revision 18 item 3
corrects what carries it.** Revisions 8–17 read: "§ 8.2's principle is that an expression means
the same thing at both entry points. `/reactive` **throws** on this today. Ship `/signals`
without the check and the same authored rule throws under one adapter and silently renders a
data-less field under the other." The middle sentence is false, and it inverts the conclusion
the other two rest on. **`/reactive` throws on a field or control *name*** —
`field-schema.ts:172-178` over the schema's names and `:214-220` over the group's controls —
and it never inspects an expression at all. So `{ name: 'city', visible: 'constructor' }` binds
there without complaint and renders the field, which is Q11's outcome exactly, reached by the
same mechanism at the other entry point.

**So this check makes `/signals` stricter than `/reactive`, not symmetric with it, and § 8.2 is
not what carries the decision.** It cannot: § 8.2's subject is an expression *meaning* the same
thing at both entry points, and what ships here is a divergence of precisely that kind — the
string `'constructor'` throws at one entry point and renders a data-less field at the other.
Shipping it **opens** an § 8.2 asymmetry rather than closing one.

**Q11 carries it, on its own account.** `rules.evalVisible(p.city, 'constructor')` renders a
field against a model with no such key, with nothing logged, and § 0's premise is that the
expression was authored in a builder UI. Converting a silent wrong answer into a named throw is
worth doing whether or not `/reactive` ever does the same, and the two entry points owning
different inputs (above) is why it could not have been done symmetrically in one step regardless.

**What § 8.2 does carry is that the asymmetry is a debt.** Whether `/reactive` should reject
prototype-shadowed identifiers in expressions too is a behaviour change to a **released** entry
point — an expression that registers today would start throwing — so it needs a phase, a
major-version decision and a migration note. Step 7 logs it against a later phase in
[`ROADMAP.md`](../../ROADMAP.md) and **does not decide it**; a docs step deciding it is how a
breaking change ships without one. Step 7's README also documents the asymmetry from
`/reactive`'s side, where the behaviour is the silent one and the reader is the one not yet
protected from it.

---

## 4. Work breakdown

Each step leaves `eval-core`, `eval-signals` and `eval-forms` green on lint, test and build.

### Step 1 — The entry point, the manifest, and a green build

The unproven-mechanism step, exactly as Phase 4 step 1 was — and its findings apply
verbatim, so this step should re-read them rather than rediscover them.

- **New**: `modules/eval-forms/signals/ng-package.json` —
  `{ "lib": { "entryFile": "src/public-api.ts" } }` against `ng-entrypoint.schema.json`.
- **New**: `modules/eval-forms/signals/src/public-api.ts`, whose one line is
  `export * from './lib/text-key';` — **the line that publishes `TEXT`** (W3). § 5 has listed
  `TEXT` as published surface since revision 1 and no step ever produced that line: step 4's
  barrel edit enumerates the other three symbols by name, and step 1 created the barrel
  without saying what goes in it. Revision 5 fixed exactly this for `createExpressionRules`,
  `ExpressionRules` and `ExpressionRuleOptions` and left it standing for the fourth symbol.
- **New**: the smallest real runtime symbol — a type-only barrel does not satisfy
  ng-packagr. `signals/src/lib/text-key.ts` exporting
  `export const TEXT = createMetadataKey<string>();` is the natural one: it is real, it is
  needed by step 4, and it forces the `@angular/forms/signals` import to exist so the § 6
  confinement grep has something to pass on.
- **Edit**: `modules/eval-forms/tsconfig.lib.json` — widen `include` to reach `signals/`
  **and** widen `exclude` with `signals/**/*.spec.ts` and `signals/**/*.test.ts` in the same
  edit. Phase 4 step 1's finding: `include` widened alone pulls the specs into the library
  compilation where `types: []` leaves `describe` undeclared.
- **Edit**: `modules/eval-forms/tsconfig.spec.json` — the same `include` widening for specs,
  **and `moduleResolution: "bundler"`**, replacing the `node10` it sets at `:8`.

  **Corrected in revision 10, after step 1 measured the claim this bullet actually rested
  on.** Revisions 1–9 said "without the second half this step cannot pass its own test
  target". That is false, and it was measured: with `node10` restored and both new specs in
  place, `nx test eval-forms` is **green — 8 suites, 113 tests**. ts-jest does not enforce type
  diagnostics here, so `TS2307` never reaches the test target at all. The refutation was
  sitting in the baseline the whole time: **five pre-existing eval-forms specs import
  `@angular/core/testing`**, which `node10` cannot resolve either (`tsc -p
  modules/eval-forms/tsconfig.spec.json` at `e739d0f` reports 8 × `TS2307`), and those suites
  have been green since Phase 4. § 0.2 records the general form.

  **The grounds that do hold**, and they are enough on their own:

  - **`tsc -p modules/eval-forms/tsconfig.spec.json` fails under `node10` and is clean under
    `bundler`** — an editor, a `tsc --noEmit` in CI, or any later type-aware lint rule sees
    those errors even though Jest does not. `@angular/forms` publishes `./signals` **only**
    through its `exports` map, with no `signals/` directory to fall back to.
  - **It retires a setting on borrowed time**: `TS5107: Option 'moduleResolution=node10' is
    deprecated and will stop functioning in TypeScript 7.0`.
  - **It aligns eval-forms with `eval-core`, which already sets `bundler`** in its own
    `tsconfig.spec.json`. Revisions 1–9 named only `eval-signals` as still carrying `node10`,
    which understated the case: eval-forms is the second of three, not the first.

  The library build hides the whole question either way: `tsconfig.lib.json` inherits
  `bundler` from `modules/eval-forms/tsconfig.json:6`, while `tsconfig.spec.json` overrides it
  to `node10`. Measured against this workspace's own `node_modules`:

  | `moduleResolution` | Result |
  | ------------------ | ------ |
  | `node10` | `TS2307: Cannot find module '@angular/forms/signals' … there are types at 'types/signals.d.ts', but this result could not be resolved under your current 'moduleResolution' setting` |
  | `bundler` | clean |

  **This is the step's mechanism risk**: it changes resolution for *every* eval-forms spec,
  not only the new ones, so the whole existing suite is the gate on it. **Measured in step 1
  and it moved nothing**: `tsc --listFiles` under both settings over the pre-existing spec set
  resolves **no file to a different file**; three files appear that `node10` had reported as
  `TS2307` (`@angular/core/types/testing.d.ts`, `types/rxjs-interop.d.ts`,
  `types/primitives-signals.d.ts`), none is removed, and no `paths` entry shadows a real
  package. Whole-program errors go from 38 × `TS1205` + 8 × `TS2307` + 1 × `TS2353` to
  38 × `TS1205` — strictly fewer, with the `TS1205` set identical and pre-existing. Compatibility with
  the `module: "commonjs"` already set there was an assertion in revisions 1–3 and is now
  measured: `tsc` accepts the pair with no `TS5095`, and resolves `@angular/forms/signals`
  clean. The same probe found that the **`node10` being replaced is itself deprecated** —
  `TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in
  TypeScript 7.0` — so this edit retires a setting that is on borrowed time regardless. `modules/eval-signals/tsconfig.spec.json:8`
  carries the same `node10`, so a cross-project spec would hit it too — out of scope here,
  worth knowing.
- **Edit**: `tsconfig.base.json` — add
  `"@zvenigora/ng-eval-forms/signals": ["./modules/eval-forms/signals/src/public-api.ts"]`.
- **New**: **two** specs, test-first, because the third exit criterion needs a file the
  co-located one cannot be. `signals/src/lib/text-key.spec.ts` imports `TEXT` **relatively**
  and carries the key's own invariant; `src/lib/signals-entry-point.spec.ts` imports it
  through **`@zvenigora/ng-eval-forms/signals`** and lives under another entry point's folder,
  because `@nx/enforce-module-boundaries` rejects a package-name self-import within one entry
  point and permits it across. Revisions 1–9 listed one spec here: the deliverable predates
  the boundary constraint, which arrived with the exit criterion below and was never reflected
  upward.
- **Exit**:
  - all three projects green on lint, test and build;
  - `dist/modules/eval-forms/package.json`'s `exports` map has a `./signals` key whose
    `types` and `default` name emitted files, and
    `dist/modules/eval-forms/signals/package.json` names the same pair;
  - **a spec imports through `@zvenigora/ng-eval-forms/signals`** — and per Phase 4 step 1's
    verified table, that spec must live under *another* entry point's folder, because
    `@nx/enforce-module-boundaries` rejects a package-name self-import within one entry
    point and permits it across;
  - `/reactive`'s FESM is byte-identical to its 25,748-byte baseline. Nothing in this step
    touches it, and that is the cheapest possible check that the shared core did not move.

### Step 2 — The source adapter

- **New**: `signals/src/lib/model-source.ts` — § 3.2.1's per-key `computed`s over a
  `WritableSignal<TModel>`, **exporting `createModelSource` and the `ModelSource` type**
  (§ 3.2.1, § 5): `readProperty`, the private memo, `keySignal`, and `createRuleContext`,
  which builds one `createFieldContext({}, {}, options)` and pushes the resolver onto its
  `lookups`. Module-private to the entry point — not listed in `signals/src/public-api.ts`.

  **The named exports are the step's load-bearing deliverable, not a detail of it** (C3).
  Every exit criterion below needs a live `EvalContext`, and revision 4 moved context
  construction into the registrars, which this step ships as stubs that throw. So through
  revisions 4 and 5 this step required an object none of its own deliverables could build —
  the very failure its last bullet has called out since revision 4, reintroduced one bullet
  above it. `createRuleContext` is what the criteria construct; `keySignal` is what the
  memo-identity criterion compares (W5).
- **New**: `signals/src/lib/rules.ts` — `createExpressionRules(model, options?)`, returning
  the three registrars. It calls `createModelSource(model, options?.eval)` **once**, and that
  call is real in this step, because that is what fixes the **memo**'s lifetime — one per
  **factory**, § 3.6. The registrars may be stubs that throw until steps 4–5; what they will do is
  call `source.createRuleContext()` once each, so the **context** count only becomes
  observable in step 4. Revisions 1–3 said "context count and lifetime" here and the first
  half stopped being true when § 3.6 changed.
- **New**: co-located specs, test-first.
- **Exit**:
  - **`createRuleContext()` returns a context whose `lookups` carry the resolver, asserted on
    observables the step can actually reach** (§ 3.2.1). The subject is
    `createModelSource(model, options).createRuleContext()`, callable in this step's own spec
    — that is C3's fix and the reason the criterion has one. **The observables are
    `context.lookups.length === 3` and a pop**: removing the third lookup makes every model
    key resolve `undefined`, which is what proves the third one is ours and the first two are
    empty.

    Revisions 2–6 wrote this as "**both sources are asserted empty**", which names nothing a
    spec can see: `createSignalContext` closes over its source (`signal-context.ts:196-201`)
    and the returned `EvalContext` exposes no accessor for it, and this step's own harness
    needs no mocking. That is the C3 defect one bullet up, in a bullet revision 6 rewrote —
    § 0.2's scoped-fix hazard, second occurrence (W2). `phase-4-plan.md:1910`'s `createFieldContext(sourceFromModel(model), {})` is
    the *record* design and is what this phase withdrew — the citation is kept here only to
    say so, because through revisions 2, 3 and 4 this criterion said "as the form half
    (first argument)" and would have walked the implementer straight back into the shape Q4
    killed and risk 9 exists to prevent;
  - **per-key propagation is asserted directly**: writing a key the expression does not name
    leaves the named key's `computed` un-notified. This is the mechanism § 3.2.1 says the
    whole reactivity story rests on, and it is asserted here rather than inferred from a
    rule's behaviour two steps later;
  - **a key absent from the model at construction resolves, and re-resolves when it
    arrives** (§ 3.2.1, C2). The fixture's model **omits** a key the expression names — that
    is the whole point of the case and the plan as written had no fixture in which it was
    reachable. Reading that key resolves `undefined` *and subscribes*; adding it to the model
    afterwards notifies. Break it by seeding the record from `Object.keys(model())` and
    returning `undefined` for anything else — revision 2's shape — and this case must be the
    one that goes red;
  - **the memo holds**: two reads of the same late key produce the same `computed`, not two.
    Without this the tracking churns and the negative case below becomes unstable rather
    than wrong, which is the harder failure to read. **State the observable**: the memo is
    private and the resolver returns a *value*, so comparing two resolved values passes with
    or without a memo. `model-source.ts` **exports** `keySignal` on the `ModelSource` it
    returns — module-private to the entry point either way (§ 3.3, § 5) — and the spec
    compares `source.keySignal('country')` across two reads by identity;
  - **case-insensitive resolution is asserted on the second read, not only the first**
    (§ 3.2.1, Q4). An expression naming `Country` against a model holding `country` resolves,
    then still resolves after a write. Revision 3 passed the first read and froze on the
    second, so a spec that reads once is the setup failure that let it through;
  - **two assertions go through `createExpressionRules`, not only through `createModelSource`**
    (C1). Every other criterion here constructs the source directly, so nothing exercises the
    factory's own wiring — and a factory that called `createModelSource` **per registrar**
    instead of once would satisfy all of them, and every step-4 criterion including Q4, while
    quietly making the memo per rule rather than per factory.

    **Through the factory**: a delegating mock of `./model-source` counting `createModelSource`
    — one `createExpressionRules(model)` call invokes it **exactly once**, and two factories
    invoke it twice. That is § 6.1.1's instrument shape applied to a module-private sibling,
    so it needs its own spec file (W7) and `jest.requireActual` inside the factory.
    **On the source**: two `createRuleContext()` calls give **different** `EvalContext`
    identities and the **same** `keySignal('country')` identity — § 3.6's count, memo per
    **factory** and context per rule **per `form()`**, as two identity comparisons rather than
    as a sentence. The
    second pair is asserted on the source rather than through two registrations because this
    step's registrars are stubs; step 4 observes the count through them;
  - **the harness here is § 6.1's third row, and it is not the `LogicFn` count.** Step 2 has
    no registrars — they are stubs until steps 4–5 — and no `evaluateRule` until step 3, so
    there is no `LogicFn` to invoke and no field state to read. The step-2 instrument is a
    spec-local `computed(() => context.get(key))` over a context from `createRuleContext()`,
    counted, running **all six steps** of § 6.1's sequence including the positive calibration
    arm — the negative case here is otherwise the one asserted with no in-fixture proof that
    its counter can move. § 6.1's sequence is stated generically, and its table gives this
    harness its own **read**: "read the counted derivation" means reading that spec-local
    `computed`, not `f.city().hidden()` (W6). Revisions 2 and 3 gave this step exit criteria
    its own deliverables could not satisfy; revision 4 put two of them back (C3). That is how
    an implementer ends up improvising a design.

  - **Neither new file is type-checked by `build:production`, and step 4 is the first time
    they meet the production compiler** — added in revision 11, after step 2 measured it.
    Gate 6 requires `createExpressionRules`, `ExpressionRules` and `ExpressionRuleOptions` to
    be absent from the emitted `.d.ts` until step 4, so `signals/src/public-api.ts` is not
    edited in this step and neither `model-source.ts` nor `rules.ts` is reachable from the
    entry file. ng-packagr compiles **from the entry file**, not from `tsconfig.lib.json`'s
    `include`, so an unreachable module is never compiled at all.

    Measured rather than inferred: with `const probeTypeError: number = 'not a number'` in
    `createModelSource`'s body, `nx run eval-forms:build:production --skip-nx-cache` is
    **green**. `lint` and `test` would otherwise be the only gates on these two files for
    steps 2 and 3 — and `tsconfig.spec.json` is more permissive than `tsconfig.lib.prod.json`,
    which is [`CLAUDE.md`](../../CLAUDE.md)'s "a green `test` run is not a type-check" with the
    usual one-project caveat removed: here it is not that the two configs differ in
    strictness but that one of them never sees the file. **Revision 12 closes that with
    gate 7**, a filtered `tsc -p tsconfig.lib.prod.json --noEmit`, which does honour `include`.

    **So step 4 should expect to find things.** The barrel edit that publishes the three
    symbols is also the moment two steps' worth of accumulated source first reaches
    `tsconfig.lib.prod.json`, and a step-4 budget that assumes those files are already sound
    is the same mistake in a new place. Phase 3 step 3's `TS7053` is the precedent for what
    surfaces at exactly this transition.

### Step 3 — The choke point and the error policy

The two Critical items, together because § 3.3's containment is only testable through a
walk and § 3.4's bypass is only testable through the same walk.

- **New**: `signals/src/lib/evaluate-rule.ts` — module-private, **not** listed in
  `signals/src/public-api.ts` (§ 3.3).
- **New**: `src/lib/error-policy.ts` gains `applyErrorPolicy` (§ 3.4) — the one additive
  change to the published core this phase makes.
- **New**: `signals/src/lib/evaluate-rule.spec.ts` — all three behavioural criteria below,
  in one file. Revision 12 omitted it, and the omission is worth naming rather than
  silently repairing: every criterion here names an assertion, so a step whose file list
  holds no spec states obligations no listed file can carry. It goes **here** rather than
  beside `error-policy.ts` because both policy arms need a *walk* — the write arm is
  reachable only through the context `createFieldContext` builds (§ 3.2.1, second bullet),
  which exists in the adapter — and the criterion requires both arms in one spec.
- **Exit**:
  - a throwing arrow body leaves `context.scopes.length` at its pre-walk value, asserted
    directly, and **the same rule invoked a second time on that context resolves its own
    source key**. Per rule, not per field (§ 3.6): the failure that actually happens is one
    `LogicFn` re-invoked by Angular on one context, not two rules meeting. The spike ran both
    halves — contained, `scopes` 0 → 0, second read correct;
  - **the containment probe is required, not optional**, and its expected output is on
    record: remove the `finally` and the same fixture must show `scopes.length === 1` after
    the throw and the second read of `country` returning **`1`** — the arrow's own parameter,
    shadowing the source key. Without that arm, "scopes is 0" is a claim about a number
    nothing was ever able to move;
  - **both arms of the policy, in one spec, through one `applyErrorPolicy` call.** An
    assigning expression throws `SignalContextWriteError` **through** a `'undefined'` policy
    — reachable because `createFieldContext` returns a context whose `set` throws (§ 3.2.1,
    **second** bullet, "Both sources are `{}`") — **and** an expression that throws an ordinary error under the same
    `'undefined'` policy returns `undefined`. The second arm is not padding: with only the
    first, `applyErrorPolicy = (run) => run()` passes, because the error propagates from
    having never been caught. One arm proves the `catch` exists; the other proves the bypass
    inside it does. Risk 2 names this criterion as its whole mitigation, so a single arm
    leaves that risk unmitigated while reading as covered;
  - § 6 gate 3's greps pass.

### Step 4 — `evalVisible` and `evalText`

- **Edit**: `signals/src/lib/rules.ts` — the two registrars, naming per § 3.5.1, registering
  Angular's **config** overloads per 1.2.7, each body shaped per § 3.5 with
  `applyErrorPolicy` outermost.
- **Edit**: `signals/src/public-api.ts` — export `createExpressionRules`, `ExpressionRules`
  and `ExpressionRuleOptions`. Named as a deliverable because barrels re-export whole modules
  and nothing else in this phase makes the barrel a place anyone looks: § 5 lists these three
  as published and, through revisions 1–4, no step produced the line that publishes them. It
  is also where an *unintended* export gets in, so it is worth a deliberate edit and a look
  at **gate 6's** output afterwards — gate 5 reads the primary entry point's `.d.ts` and never
  sees this one (W4).
- **New**: **two** co-located spec files, not one, and the split is mechanical rather than
  stylistic (W7). `rules.spec.ts` carries the read-back cases; **`rules.invocation-count.spec.ts`
  carries every case that needs a § 6.1.1 counter**, because `jest.mock` hoists to *file*
  scope and cannot be confined to a `describe`. Stacked in one file, the barrel mock of
  `@zvenigora/ng-eval-forms` would put all six of this step's cases through a mocked core
  entry point to serve two of them. This is
  `reactive/src/lib/field-schema.teardown-throw.spec.ts`'s own split, made for the same reason
  and stated in its own comment — § 0.1's row.
- **Exit**:
  - an end-to-end spec builds a real `form()` with a schema, writes the model, and asserts
    `f.city().hidden()` and the `TEXT` metadata signal follow — the **wiring and polarity**
    harness of § 6.1;
  - one assertion pins that `evalVisible` **inverts**: a *true* expression yields
    `hidden() === false`. Without it a sign flip is invisible, and § 3.5.1 put the inversion
    inside the library precisely so no consumer's expression carries it;
  - the negative case **asserts** on the `LogicFn`-invocation count and runs § 6.1's full
    six-step sequence to get there: read the field state, record a count that is ≥ 1, write a
    model key the expression never named, **read the field state again**, assert the count
    unchanged, **then write a key it does name and assert the count moved**. The reads are
    setup, not assertions (§ 6.1) — without them the case compares 0 to 0 and passes against
    a rule that over-subscribes; without the last step the counter is never shown to work;
  - **one end-to-end case runs against a model missing a key its expression names** (§ 3.2.1,
    Q3), and asserts the field follows once the model gains it. Step 2 asserts this at the
    source; this is the same case through a real `form()`, and it is where a regression in
    the resolver would actually reach a consumer;
  - **one end-to-end case is Q4**: `caseInsensitive`, an expression naming `Country` against a
    model holding `country`, asserted on the **second** read after a write. This is the only
    case that separated the two candidate sources, and it is the one a later "simplification"
    of the memo would silently reverse;
  - **the error policy is asserted through a registered rule**, not only through
    `applyErrorPolicy` directly as in step 3: a rule whose expression throws an ordinary
    error resolves per `options.onError` and the field renders, and a rule whose expression
    assigns throws `SignalContextWriteError` out of `f.city().hidden()`. Step 3 proves the
    function; this proves the registrars actually call it (§ 3.5). Without it, `onError` is
    published surface with no test that anything reads it;
  - **the coercion is pinned to the *outside* of the policy** (C4): with `onError: 'undefined'`
    and an expression that throws, `f.city().hidden()` is **`true`**. One assertion, and it is
    the only one that separates the two nestings § 3.5 chooses between —
    `!toVisible(applyErrorPolicy(walk, policy))` coerces the policy's `undefined` to `false`
    and inverts to `true`, while `applyErrorPolicy(() => !toVisible(walk()), policy)` returns
    `undefined` and the field is not hidden.

    Risk 12 named step 4's policy-through-a-rule criteria as its whole mitigation and **those
    criteria do not gate it**: "an ordinary error resolves per `options.onError`" and "an
    assigning expression throws out of `f.city().hidden()`" are both true of either nesting. So
    risk 12 sat in exactly the state risk 8 sat in through revisions 1–4 — a mitigation naming
    a criterion that does not test the thing. This bullet is the criterion.

    **The guard half of the invariant is the counting spec's, not this one's.** A branch
    hoisted above the wrapper survives the assertion above whenever the branch does not trip,
    so what catches it is M7's number: the same rule in `rules.invocation-count.spec.ts`, its
    branch key absent, must show the instrument at **≥ 1**. M7 measured **0** there against a
    ground truth of **1**, which is what makes that assertion capable of failing;
  - **the reused-schema behaviour is pinned, because it is wrong and shipping** (C1, Q9). One
    `schema<Model>` built from `createExpressionRules(modelA)`, two `form()` calls — `modelA`
    and `modelB` — and the spec asserts what actually happens: form B's rule evaluates
    **model A**, and flipping `modelA` moves **both** fields. It is a characterisation test,
    said so in a comment: it records a limitation rather than a guarantee, and its job is that
    a future change to Angular's re-invocation or to the factory's binding goes red instead of
    quietly changing which data a form reads. Alongside it, the **supported** shape asserted
    positively: `makeSchema = (rules) => schema<Model>(p => …)` called per form gives each form
    its own model. Without both arms, § 3.6's reuse guidance is a paragraph;
  - **§ 3.5.3's option-resolution divergence is pinned as a characterisation case** (revision
    15). A factory built *without* `caseInsensitive` and a registration passing
    `{ eval: { caseInsensitive: true } }`, against a model holding `country`, and the spec
    asserts what actually happens: an identifier spelled `Country` does **not** resolve, while a
    *property* name in the same expression is corrected — two casing rules in one expression.
    Said to be a characterisation test in a comment, on Q9's precedent: registration-wins is
    exact for `onError` and partial here, and a later change to the memo's lifetime would
    reverse it silently. The property half is what keeps the case from passing against a
    registration whose `eval` was dropped on the floor entirely;
  - **compile-once is counted, not assumed — and the count has a named instrument and a stated
    N** (C5). The instrument is a **delegating mock of `@zvenigora/ng-eval-core` counting
    `parse` and `compile`**, the same shape as the `LogicFn` counter one barrel over; the two
    were measured coexisting in one file, so both live in `rules.invocation-count.spec.ts`.
    **The N is § 6.1's sequence, not a loop**: run its six steps and assert `compile` stays at
    **1** while the invocation count moves **1 → 1 → 2**. Revisions 1–5 wrote "across N
    invocations" with nothing in the criterion making N exceed one, so it was satisfiable by a
    fixture that read the field once — the same shape of vacuous setup § 6.1 already carries a
    paragraph about, in the step that cites it. Measured in the § 6.1.1 re-spike, same fixture
    and same reads: `parse` 1, `compile` 1, invocations 1 → 1 → 2. Risk 8 has named this as its
    mitigation since revision 1 and no step has ever contained it. `CompilerService`'s LRU
    would have masked a `compile()` that drifted into the `LogicFn` body; § 3.1 drops the
    service, so nothing else would catch it.

### Step 5 — `evalDisabled`

- **Edit**: `signals/src/lib/rules.ts`, adding the `reason` option of § 3.5.2 and removing the
  `pending` stub, whose unused `source` parameter exists only to keep
  `@typescript-eslint/no-unused-vars` quiet while a registrar is unimplemented.
- **Edit**: `signals/src/lib/rules.spec.ts` and `signals/src/lib/rules.invocation-count.spec.ts`
  — **`evalText` gains the two cases step 4 did not give it** (revision 16, from step 4's
  review): an invocation-count case over § 6.1's six-step sequence, and a write-error case
  asserting `SignalContextWriteError` escapes the `metadata` reducer. Step 4 covered both
  through `evalVisible` only, on the argument that `prepare` is structurally shared — **which
  is an argument that they would pass, not evidence that they do**, and § 0.2 is the section
  about that substitution. It lands here rather than as a step-4 amendment for two reasons:
  step 5 edits the same shared path, and `evalText` is the registrar whose failure renders a
  *wrong string* rather than hiding a field, which is the harder one for a consumer to notice.
  `metadata` is also a different Angular primitive with its own reducer and its own
  memoisation, so "the wrapper is shared" is a claim about our code and not about Angular's.
- **Edit**: `signals/src/lib/rules.model-source-count.spec.ts` — **the § 0.2.3 correction**. Its
  comment at `:33-37` claims to catch a factory calling `createModelSource` per registrar, and
  neither of its fixtures registers a rule, so since step 4 it does not. Give one case a real
  registration — a `schema()` + `form()` through `TestBed.runInInjectionContext` — so the count
  is taken after registrations have run. The comment is corrected with the fixture and not
  instead of it: step 4 already restored the *coverage* in
  `rules.invocation-count.spec.ts`'s lifetime case, so what is owed here is that this file stops
  claiming a discrimination it no longer performs.
- **Exit**: as step 4, plus two specs that exist because of the trap — a rule yielding the
  string `'false'` **disables** the field, and it does so with the *authored* reason where
  one was supplied, never with `"false"`. Both record behaviour rather than leave it to be
  discovered.
  - and the three edits above, each gated rather than assumed: `evalText`'s count case must
    fail when the resolver over-subscribes, its write-error case must fail when the bypass is
    removed, and `rules.model-source-count.spec.ts` must go **red** when `createModelSource` is
    moved into `prepare` — which is the patch that leaves it green today. Naming the patch is
    the criterion, per § 0.2.1: "the file is corrected" is a deliverable, not a gate;
  - **§ 0.2.3's re-run, as a deliverable rather than as a habit.** `evalDisabled` stops being a
    stub in this step, so every claim in this package that is gated over "the registrars"
    silently changes subject from two to three. Re-run step 4's probes — the C4 nesting, the M7
    hoisted guard, the compile-in-the-closure, the context hoisted to factory scope — and
    confirm each still reddens a named case, rather than confirming the suite is green.

### Step 6 — Rejecting prototype-shadowed identifiers

§ 3.8's check. Its own step rather than a clause in step 4: it adds a throw path, a manifest
change to a published package, and specs of its own, and one plan step is one commit.

- **New**: `signals/src/lib/guard-identifiers.ts` — module-private, walking the AST the
  registrar already has with `acorn-walk`'s `simple`, throwing on any `Identifier` whose name
  is an own property of `Object.prototype`. The message names the expression and the
  identifier, per `field-schema.ts:172-178`'s precedent.
- **Edit**: `signals/src/lib/rules.ts` — every registrar calls it immediately after `parse`,
  before `compile`. Registration-time only; no hot path is touched.

  **Through the shared `prepare`, and revision 18 item 1 says why that is not revision 16's
  rejected argument.** The guard throws before any Angular primitive is reached, so the three
  registrars have nothing downstream that could diverge — unlike step 4's count and step 5's
  bypass, whose values arrive *through* `hidden`, `metadata` and `addDisabledReasonRule`. The
  three assertions below still ship: one call site is what the code has, three registrars is
  what the criterion is about.
- **Edit**: `modules/eval-forms/package.json` — `acorn-walk ^8.3.0` into `peerDependencies`,
  matching `eval-core`'s range (§ 3.8).
- **Edit**: `signals/src/lib/model-source.spec.ts` — the last stub-world sentence in the
  package (revision 17). Its comment at `:76-77` reads "this step's registrars are stubs; step 4
  observes the same count through them", which step 4 falsified and step 5 finished falsifying.
  Prose only — no assertion in that file depends on it — and it lands here because step 6 is the
  next step to work in this area, on the same disposition § 0.2.3 gave step 5.
- **New**: a co-located spec, test-first.
- **Exit**:
  - `'constructor'` **throws, through each of `evalVisible`, `evalText` and `evalDisabled`** —
    three assertions, not one. The deliverable says *every* registrar calls the guard, and a
    single-registrar criterion goes green with it wired into `evalVisible` alone; the miss that
    leaves is the worst shape § 3.8 has, since `evalText(p.city, 'constructor')` would render
    `"function Object() { [native code] }"` into the field through `toText`. Q11 is the case:
    without this step that call builds a form whose field always renders;
  - **the throw surfaces from `form()`, not from `schema()`** — Q8 measured the schema body
    running zero times at `schema()` — so the specs `expect(() => form(model, s)).toThrow(…)`,
    and the message contains both the expression and the identifier;
  - the same for `toString`, `valueOf` and `hasOwnProperty`, and **not** for `CONSTRUCTOR`,
    `country`, or `constructorName` — the check is on the identifier's exact name, not a
    substring, and the negative arm is what proves it (a `String.includes` implementation
    passes the first three and fails these);
  - **and the same for `__defineGetter__`, which the seven-name list omits** (revision 18
    item 2). The predicate matches twelve names and the illustrative list names seven, so an
    implementation that hard-codes the seven satisfies every other criterion in this step.
    This arm is what makes the predicate the deliverable rather than the list;
  - **a member expression is not rejected**: `'user.constructor'` registers, because that is
    `eval-core`'s guard and not this one (§ 3.8's residual). Without this arm the check has no
    stated upper bound and the next revision widens it into `eval-core`'s territory. It is also
    the arm that pins the borrow: `acorn-walk`'s base walker descends into `node.property` only
    when `node.computed` (`node_modules/acorn-walk/dist/walk.js:397-400`), so a bare
    `Identifier` visitor cannot see `user.constructor` — while a hand-rolled scan over every
    node would, and would fail here;
  - **an arrow's own binding does not rescue the name, and § 3.8.1 chose that**:
    `'[1].map(valueOf => valueOf)'` **throws**. This is the arm that separates the two
    implementations revision 8 left undecided — an over-rejecting guard throws here, a
    scope-aware one does not, and both satisfy every other criterion in this step;
  - **and `'[1].map(valueOf => 1)'` registers**, because `acorn-walk` never visits a *binding*
    as an `Identifier` (§ 3.8.1). Not a decision — a property of the borrowed walker, pinned
    so that a hand-rolled scan, which would reject both, fails this step instead of shipping;
  - **the manifest edit is gated on the artifact a consumer receives**:
    `dist/modules/eval-forms/package.json`'s `peerDependencies` contains `acorn-walk ^8.3.0`
    **and does not contain `acorn`**. Both arms: § 3.8 rejects the second peer for a stated
    reason, and a presence-only check passes a manifest carrying it.
    ng-packagr copies `peerDependencies` into the built manifest — the five existing peers are
    in that file today — so this is a real read of a real output. **`npm ls acorn-walk` is not
    the gate and was proposed as one in revision 7**: the root declares `acorn-walk` directly
    and has no `workspaces` field, so `modules/eval-forms` is not an installed package and the
    command passes at the root with or without the edit. A criterion that passes before its own
    deliverable exists is § 0.2.1's defect on the newest step in the plan;
  - gate 4 still shows `/reactive`'s FESM at 25,748 bytes — the guard is adapter-only, and this
    step edits the shared `package.json`, so it is the step most likely to move it.

### Step 7 — Docs, README and release

- **Edit**: `docs/forms/phase-6-plan.md` § 3.8.1's closing paragraph — new in revision 18
  item 3, and it comes **before** the README row because that row's caveat is written from
  the sentence being corrected. `/reactive` does not throw on a prototype-shadowed
  *expression*; it throws on a field or control **name**. So the check makes `/signals`
  stricter than `/reactive` rather than symmetric with it, and § 8.2's principle is not what
  carries the decision — Q11 is. Correct the paragraph, then write the README caveat from
  the corrected version rather than the other way round.
- **Edit**: `ROADMAP.md` — new in revision 18 item 3. Log **"should `/reactive` reject
  prototype-shadowed identifiers in expressions too?"** as a **Phase 8** question. It is a
  behaviour change to a released entry point — an expression that registers today would start
  throwing — so it needs a phase, a major-version decision and a migration note. **Logged, not
  decided**: a docs step deciding it is how a breaking change ships without one.
- **Edit**: `modules/eval-forms/README.md` — **four separate edits, not three** (W4, and
  revision 18 item 3 adds the fourth). The fourth is the **`/reactive` side of the
  asymmetry**, and it is separate from the `/signals` caveat because the two sections have
  different readers and only one of them is currently told anything. `visible: "constructor"`
  throws under `/signals` and silently renders a data-less field under `/reactive`; the
  consumer who needs that sentence is reading `/reactive`'s documentation, where the
  behaviour is the silent one. A `/signals`-only caveat documents the asymmetry to the half
  of the audience already protected from it. The other three edits: add a
  `/signals` row to the entry-point table at `README.md:47-51`, which today has two rows;
  **delete the "designed but not built" prose block at `:53-55`** and repoint its link, since
  that claim lives in prose pointing at `phase-4-plan.md` § 9 and not in any row; and update
  the `Versions` lead-in at `:59`, which reads "The package declares **one** peer range, at the
  floor" immediately above the JSON step 6 adds an entry to. Revision 8 wrote this as "the
  `/signals` row stops saying 'designed but not built'", which describes an edit to a row that
  does not exist and leaves the other two undone. Also: the Angular 22 requirement stated at
  the entry-point table, not only in prose;
  and the two caveats § 3.2.1 assigns to the README, which exist nowhere else and would
  otherwise never be written: **the nested-signal diagnostic does not reach `/signals` at
  all** (a model property holding a signal is read un-called and nothing warns — revision 4
  established the scan never covered this shape), and the enumeration limit, beside
  `/reactive`'s key-set caveat. Also the `evalVisible`/`hidden` polarity line § 3.5.1 asks
  for, and **three caveats revision 7 adds, none of which exists anywhere else**: the
  **schema-reuse rule** (§ 3.6, Q9 — a schema value carries its factory's model, so
  `makeSchema = (rules) => schema(…)` is the supported reuse shape and a shared schema value
  is not), the **prototype-shadowed identifier rejection** and its residual (§ 3.8 — a member
  expression is `eval-core`'s, and a model key nobody names stays unreadable), and the fact
  that `/reactive` and `/signals` now reject the same identifier at **different times**:
  schema-construction there, `form()` here. **And one caveat revision 14 adds, which exists in
  no other consumer-facing place**: an assigning expression is rejected loudly — the error
  bypasses `onError` entirely — **unless it is nested inside a call**, where
  `[1].map(x => (country = "CA"))` loses its error class to `eval-core`'s `safeCall` re-wrap
  and is routed to `undefined` like any other failure. The README states the guarantee, so it
  is the README that has to state the boundary; a consumer meets this as a blank field with
  nothing in the console (§ 3.4). **And one caveat revision 15 adds, which likewise exists in no
  other consumer-facing place**: `caseInsensitive` is in practice a **factory** option — a
  per-registration `eval.caseInsensitive` corrects *property* names and leaves *identifier* keys
  on the factory's setting, because the memo it would have to move is bound to the factory
  (§ 3.5.3). A consumer meets this as one expression obeying two casing rules: `address.NAME`
  resolves and `Country` does not. The README documents `ExpressionRuleOptions` at both levels,
  so it is the README that has to say where "a registration may override" stops.
  **And the `Versions` block at `README.md:59-69`,
  which quotes `peerDependencies` verbatim** — step 6 adds an entry to that manifest, so the
  block reproduces a package that no longer exists unless this step edits it. It is listed as a
  deliverable because a quoted manifest is the one piece of a README nothing recompiles (W1).
- **Edit**: `modules/eval-forms/README.md` — **three further prose claims this release
  falsifies**, new in revision 19. Each sits adjacent to structure the four edits above already
  gate, which is the pattern rather than three separate slips (§ 0.2.1 in a documentation
  register): **`:3-4`**, which describes the package as "`visible` and `text`" and omits the
  `disabled` step 5 shipped; **`:71-77`**, the prose *below* the `Versions` JSON — "`/reactive`
  — everything this release ships" and "**when** `/signals` **arrives** it will require Angular
  22" — which the "matches `package.json` exactly" criterion reaches the fenced block of and
  not the sentences after it; and **`:400-407`**, where "What is not here" still lists
  `disabled` as deferred and calls `/signals` "the **future** `/signals` entry point". The
  fifth exit criterion below is what makes these a gate rather than a deliverable.
- **Edit**: `signals/src/lib/rules.ts` — prose only, new in revision 19 item 2. The
  `ExpressionRuleOptions.eval` doc comment at `:24-27` says the context is "made once, at
  `createExpressionRules` time"; it is minted per registration from options fixed then, which is
  what the corrected README now says. A doc comment is the copy an editor shows on hover, so
  this is the version that reaches a consumer who never opens the README.
- **Edit**: `reactive/src/lib/readme-examples.spec.ts` — prose only, new in revision 19 item 2.
  Its docblock claims coverage of the README's runnable `ts` blocks; this step moved the
  `/signals`↔`/reactive` asymmetry block into the `/signals` spec, so it over-claims by one.
  No assertion in the file changes.
- **New**: `signals/src/lib/readme-examples.spec.ts` — the `/signals` counterpart to
  `reactive/src/lib/readme-examples.spec.ts`, which is the only file of that name today.
- **Edit**: root `CHANGELOG.md` — `## [eval-forms 0.2.0]`, naming the package, and naming
  **two** things (the second is new in revision 14): the **`peerDependencies` addition**
  step 6 made (§ 3.8), because a manifest change to a published package is a release note
  even when it imposes no new install; and **`applyErrorPolicy`, the one symbol this phase
  adds to the already-released primary entry point** (§ 3.4, § 5).

  Revisions 7–13 named only the first, and the omission is § 0.2.1's shape rather than a
  slip: this row exists to record what the release changes for an existing consumer, and
  `applyErrorPolicy` is the only such change outside the new entry point — a new export on a
  package at 0.1.0, additive but permanent. Every other deliverable of this phase lands
  behind `/signals`, which no current consumer imports, so a reader of this row would
  reasonably conclude the released surface was untouched. Named here rather than left to
  step 7 because step 7 is several sessions away and this row is what step 7 will be read
  against.
- **Edit**: `modules/eval-forms/package.json` — version only. The peer ranges landed in
  step 6.
- **Exit**:
  - `readme-examples.spec.ts` covers the new examples; all gates green;
  - **the release is gated on the build output, not on the edits** (W2): `dist/modules/eval-forms/package.json`
    shows `"version": "0.2.0"` and carries `acorn-walk` in `peerDependencies`, and root
    `CHANGELOG.md` contains a `## [eval-forms 0.2.0]` heading that names the
    `peerDependencies` addition **and `applyErrorPolicy`** — both, since a criterion naming
    one of the two deliverable's halves is how the second came to be missing for six
    revisions. Revision 7's exit was "all gates green", and no gate reads a
    version or a changelog — gate 1 reads the dist manifest's `exports` map, gates 5 and 6 read
    `.d.ts` files. A step whose whole product is a release needs one criterion that fails when
    the release is wrong;
  - the README's `Versions` block matches `modules/eval-forms/package.json` exactly, **and its
    lead-in sentence at `:59` no longer says "one peer range"** — the JSON alone satisfies a
    diff and leaves the prose above it wrong, which is how that block came to be worth a
    criterion at all;
  - **no "designed but not built" string survives in `README.md`**, and the `/signals` row
    exists in the entry-point table. One grep and one read, because the deliverable is three
    edits and a single criterion would gate one of them;
  - **none of revision 19's three false claims survives in `README.md`** — one grep, over
    `visible` and `text` as the package's stated properties (`:3-4`), "everything this release
    ships" and "when `/signals` arrives" (`:71-77`), and "future `/signals` entry point"
    (`:400-407`), returning nothing. Added rather than left to the fix itself: the three were
    found *because* the four criteria above stop at the structure they name, and a correction
    with no criterion is the same shape one revision later.

---

## 5. Public API surface added

At `@zvenigora/ng-eval-forms/signals`:

| Symbol | Shape |
| ------ | ----- |
| `createExpressionRules` | `<T>(model: WritableSignal<T>, options?: ExpressionRuleOptions) => ExpressionRules` — § 3.2.1 |
| `ExpressionRules` | `{ evalVisible, evalText, evalDisabled }`, each `(path, expression: string, options?) => void` |
| `ExpressionRuleOptions` | `{ eval?: EvalOptions; onError?: ExpressionErrorPolicy }` |
| `TEXT` | `MetadataKey<Signal<string \| undefined>, string, string \| undefined>` |

`evalVisible` registers Angular's `hidden` inverted (§ 3.5.1); `evalText` registers
`metadata(path, TEXT, …)`; `evalDisabled` registers `disabled` and takes an extra
`{ reason?: string }` (§ 3.5.2). All three use the **config** overloads (1.2.7).

`createModelSource` is **not** exported *from the entry point* — and it **is** a named export
of its own module, which through revision 5 it was not (W5). Those are different statements and
collapsing them is what left step 2's criteria without a subject (C3). **Four** symbols hold the
same status § 3.3 gives `evaluateRule`: real exports, module-private to `/signals`, absent from
`signals/src/public-api.ts`, changeable by a later phase without a release. The table is what
lets gate 6 name what must be **absent** from the emitted `.d.ts`, so a symbol missing from it
is a symbol that gate cannot check.

| Module-private symbol | Shape | Named by |
| --------------------- | ----- | -------- |
| `createModelSource` | `<T extends object>(model: WritableSignal<T>, options?: EvalOptions) => ModelSource` | step 2's exit criteria |
| `ModelSource` | `{ keySignal: (key: string) => Signal<unknown>; createRuleContext: () => EvalContext }` | step 2's memo-identity and context criteria |
| `evaluateRule` | `(compiled: stateCallback, context: EvalContext, options?: EvalOptions) => unknown` | § 3.3, step 3 |
| `guardIdentifiers` | `(expression: string, node: ReturnType<typeof parse>) => void` — throws, § 3.8 | step 6 |

**`guardIdentifiers`' second parameter is typed `ReturnType<typeof parse>`, not `AnyNode`, and
that is load-bearing rather than fussy.** `eval-core` does **not** export `AnyNode`: its
published `.d.ts` imports it from `acorn` at `:4` for internal use and its export clause at
`:1980` publishes `AnyNodeTypes` — a string union of node-type names — and not the node type
itself. Writing the signature with `AnyNode` therefore requires `import type { AnyNode } from
'acorn'` in the adapter, which is the one thing § 3.8's peer decision rests on not happening;
`@nx/dependency-checks` would then flag an undeclared `acorn`, and the shortest fix from there
is to add the peer § 3.8 rejects. `parse` is already on the import list below, so
`ReturnType<typeof parse>` names exactly the value the registrar holds between `parse` and
`compile` and needs no import at all. This is § 0.2.1's question 3, third half — *does the
import compile?* — which exists because of revision 7's `field`.

Revision 1 listed `createModelSource` as **published** and it is not: it has no caller outside
the factory, and § 3.2.1 makes the factory the only supported way to build one. What revision 6
changes is that "not published" stopped meaning "not named".

At `@zvenigora/ng-eval-forms` (primary, **additive to a released entry point**):

| Symbol | Shape |
| ------ | ----- |
| `applyErrorPolicy` | `<T>(run: () => T, policy?: ExpressionErrorPolicy) => T \| undefined` |

**Not exported from the entry point, deliberately**: `evaluateRule`, `createModelSource`,
`ModelSource` and `guardIdentifiers` — the table above. Nothing in `signals/src/lib/` reaches
`signals/src/public-api.ts` unless it appears in this section's first table.

**These lists govern non-spec files under `signals/`** — the same non-spec scoping § 6 gate 3
uses, though gate 3's *path* is the whole package rather than the adapter (W2). A spec imports
`form` and `schema` from `@angular/forms/signals` and `TestBed` from
`@angular/core/testing`, none of which belongs in shipped code; without this sentence § 5
made step 4's own required spec a finding.

**Imported from `eval-core`**: `EvalContext`, `EvalOptions`, `EvalState`, `call`, `parse`,
`compile`, `defaultParserOptions`, `stateCallback`. From `eval-signals`:
`SignalContextWriteError` — **in specs only**. The adapter's non-spec files must *not* import
it: § 3.4.1 put the `instanceof` bypass in the core precisely so `/signals` cannot grow its own,
and this list is normative over non-spec files, so listing it here authorised the thing that
argument forbids. Step 4's and step 3's specs need the class to assert on, which is what the
sentence below about spec imports already covers. From the shared core at
`@zvenigora/ng-eval-forms`: `toVisible`,
`toText`, `createFieldContext`, `applyErrorPolicy`, `ExpressionErrorPolicy`. From
`@angular/core`: `computed`, `Signal`, `WritableSignal`. From `@angular/forms/signals`:
`hidden`, `disabled`, `metadata`, `createMetadataKey`, `MetadataKey`, and the
`SchemaPath`/`LogicFn` types. From **`acorn-walk`**: `simple` — § 3.8's guard, and the reason
step 6 adds `acorn-walk` — and not `acorn` (§ 3.8) — to this package's `peerDependencies`;
without that
manifest edit the import is an undeclared dependency that happens to resolve through
`eval-core`'s peers. Anything beyond these lists is a finding.

**`field` is deliberately absent**, and it was on this list through revision 6.
`@angular/forms/signals` exports no such symbol (§ 1.2.5) — the read is `f.city().hidden()` —
so the list authorised an import that cannot compile, which is the third half § 0.2.1's
question 3 gained because of it.

`MetadataKey` is on the list because § 5's `TEXT` row states the symbol's shape in terms of
it. **`EvalLookup` is deliberately *not*** — revision 4 added it, and § 3.2.1's third bullet
is the reason it cannot appear: the resolver's parameter must stay unannotated for the
contravariance to work out, so the type is inferred and never named.

`SignalContextSource` **drops off the list** — with § 3.2.1's memo private and both
`createFieldContext` sources empty, no value of that type is constructed here. Revisions 1–3
listed it, and it was the type of the record Q4 killed.

**`CompilerService` is deliberately absent** (1.2.10) — revision 1 listed it, and with it an
`inject()` this plan never gave an injection-context story for. § 3.3's helper takes a
`stateCallback`, `eval-core`'s own published type; revision 1 invented `CompiledRule`, which
is a symbol nobody exports.

---

## 6. Verification gates

Every step: `npx nx run-many -t lint test build`, unfiltered. Plus the gates below — **three of
which are step-conditional, and saying so is not pedantry**: gate 3 expects exactly one
`EvalState.fromContext` and steps 1–2 have zero, gate 5 expects `applyErrorPolicy` in the
core's `.d.ts` and it does not exist until step 3, and gate 7 has nothing to catch until step 2
puts the first barrel-unreachable file in the package. A gate the first two steps are meant to
fail is a gate the reader learns to skip. Gate 6 is neither — it applies from step 1, and what
changes is its expected list, which grows by three symbols at step 4.

**Gate 7 is step-conditional in a different sense from 3 and 5, and the difference matters**:
those two are *expected to fail* before their step and this one is not — it is green from step
1 onward and simply has no subject until step 2. It is listed with them because a reader
scanning for "which gates can I skip today" needs the same answer either way.

| Gate | Applies from |
| ---- | ------------ |
| 1 `/signals` shipped | step 1 |
| 2 Angular 22 confinement | step 1 |
| 3 One path to the walk | **step 3** (zero hits before it, and zero is the expected value) |
| 4 `/reactive` unmoved | step 1, through step 7 |
| 5 Published core surface | **step 3** |
| 6 `/signals` published surface | step 1 |
| 7 Unpublished sources type-check | **step 2** (nothing before it is unreachable from a barrel) |

1. **`/signals` shipped**: `dist/modules/eval-forms/package.json` `exports` has `./signals`
   with `types` and `default` naming emitted files; `signals/package.json` agrees.
2. **Angular 22 confinement**: every `@angular/forms/signals` hit under
   `modules/eval-forms/` is inside `modules/eval-forms/signals/`. Specs are excluded because
   they do not ship: step 4's end-to-end spec must import `form` and `schema` from
   `@angular/forms/signals` to exist at all, and it can live under `signals/` or, per step
   1's cross-entry-point rule, under another entry point's folder — where a spec-inclusive
   grep would fire on a file that reaches no consumer. (Revisions 1–4 justified this
   exclusion with `field-context.spec.ts` importing `@angular/core`, which this grep would
   not have matched.)
3. **One path to the walk — gated on state construction, not on call-site names** (W1).
   Revision 2 widened a name-based grep past `call(`; the invariant cannot be expressed that
   way at all. `compile` returns `evaluate.bind(null, node)`
   (`modules/eval-core/src/lib/internal/functions/compile.ts:16`), so a rule that holds the
   compiled callback and writes `compiled(state)` runs the identical walk under a local
   variable's name, matching no regex over `call|evaluate|simpleCall`, with the containment
   `finally` skipped in silence. Widening the name list makes that miss harder to notice, not
   less likely.

   What every walk needs is an `EvalState`, and outside Angular DI there are exactly two ways
   to obtain one: `EvalState.fromContext` (1.2.9) and `new EvalState(context, result, …)`,
   whose constructor is public
   (`modules/eval-core/src/lib/internal/classes/eval/eval-state.ts:177`). The services
   construct one out of sight — `EvalService.simpleEval` and `CompilerService.simpleCall`
   build a state internally, so their use would never appear as a construction in our source.
   Three greps over **non-spec files under `modules/eval-forms/`** — the whole package, not
   `signals/`, and the intro said `signals/` through revision 5 while the table rows and the
   refinement below both said the package (W2). The narrow spelling misses the one case the
   refinement says this gate exists for:

   | Grep | Over | Expected |
   | ---- | ---- | -------- |
   | `EvalState\.fromContext` | **all** non-spec files under `modules/eval-forms/` | **exactly one hit**, and it is in `signals/src/lib/evaluate-rule.ts` |
   | `new\s+EvalState` | non-spec files under `modules/eval-forms/` | zero |
   | `import\s*(type\s*)?\{[^}]*\b(EvalService\|CompilerService)\b[^}]*\}\s*from\s*'@zvenigora/ng-eval-core'`, multiline | non-spec files under `modules/eval-forms/` | zero |

   **The third grep matches an `import`, not a name, and revision 10 narrowed it after step 1
   ran it.** The bare `EvalService\|CompilerService` returned **one hit** —
   `reactive/src/lib/field-schema.ts:431`, a block comment explaining why `createEvalSignal`
   gets `options.injector`, which names `CompilerService` as *eval-signals'* internal and cites
   `eval-signal.ts:215-216`. Pre-existing since `9fd548d`, and not a use: there is no import of
   either service anywhere in `modules/eval-forms/`. So the gate's expected value of zero was
   right about the invariant and wrong about the grep, and step 3 is where that bites — it
   ships `evaluate-rule.ts`, whose § 3.3 discussion makes another such comment more likely than
   not, and the gate would then read as failing on prose. **A gate with a known pre-existing hit
   is one people learn to ignore**, which is worse than no gate. Matching the import also makes
   this row a **subset of § 5's "Imported from `eval-core`" list** rather than a second,
   differently-shaped check: neither symbol can enter a non-spec file by any other route.
   Calibrated so it is not vacuous — the same pattern finds
   `modules/eval-signals/src/lib/eval-signal.ts:2-3`, a real multi-line import of
   `CompilerService`, so the grep fires when there is something to find.

   Two refinements the greps alone do not carry, and both are read from the diff. **The one
   hit must be inside `evaluateRule`'s body** — hoisted to module scope it is still one hit,
   while one `EvalState` reused across invocations shares the value stack, the open-node
   stack and `result.trace` between derivations, which is a different defect wearing this
   gate's pass. And **the path is the whole package, not `signals/`** — a state-constructing
   helper parked in `src/lib/` and reached by a relative import is invisible to a grep scoped
   to the adapter, and gate 5 catches it only if it is also exported.

   One state construction, in the right place, and no route that constructs one elsewhere. A second walk is then
   unreachable rather than merely unnamed: free `evaluate` (`:1819`), `evaluateAsync`
   (`:1826`) and a bound `compiled` all require a state they have no way to get. `compile(`
   stays expected in `rules.ts` and is registration, not a walk — it produces a callback and
   does not run one.

   **This departs from the `/signals` checklist's own wording**, which says to "grep the
   adapter for `call(` and for direct `EvalService` use"
   ([`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md), item 1), and
   § 0.1 requires saying why: the checklist's grep is sound for the two entrances it names
   and blind to the bound callback, which is the one a rule reaching for speed would most
   plausibly write. `call(` is still worth grepping — more than one hit inside
   `evaluate-rule.ts` is still a finding — but a hit count of one proves nothing by itself.
4. **`/reactive` unmoved**: its FESM stays at 25,748 bytes **through step 7** — nothing in
   this phase touches its bundle, including step 6's guard and peer-dependency edit and
   step 7's README and version bump — and its specs stay green throughout. Step 6 is the one
   that could plausibly move it, since it edits the shared `package.json`; the manifest is not
   compiled into the FESM, and this row is what confirms that rather than assumes it.
5. **Published core surface**: `dist/modules/eval-forms/types/zvenigora-ng-eval-forms.d.ts`
   gains `applyErrorPolicy` and **nothing else**.
6. **`/signals` published surface** (W4).
   `dist/modules/eval-forms/types/zvenigora-ng-eval-forms-signals.d.ts` declares **exactly**
   § 5's `/signals` list and nothing besides: `TEXT` alone from step 1, and
   `createExpressionRules`, `ExpressionRules`, `ExpressionRuleOptions` and `TEXT` from step 4
   on. `evaluateRule`, `createModelSource`, `ModelSource` and `guardIdentifiers` must be
   **absent** — the four rows of § 5's module-private table — which is what turns § 3.3's
   module-privacy decision and that table from claims into something a build output can fail.

   Gate 5 does not cover this and cannot: it names the *primary* entry point's `.d.ts`, and
   `/signals` emits a separate file. So through revision 5 the one entry point this phase
   actually creates — the one where an unintended export would appear — had no surface gate,
   while step 4 told the implementer to "look at gate 5's output afterwards" for exports that
   never reach gate 5's file. That is the same shape as W3 one gate over: the obligation was
   written where it reads naturally rather than where it is checked.
7. **Unpublished sources type-check** — new in revision 12, and it closes the hole step 2
   measured. Gate 6 keeps the factory symbols off the published surface until step 4, so
   `signals/src/public-api.ts` is unedited in steps 2–3 and neither `model-source.ts` nor
   `rules.ts` is reachable from the entry file. **ng-packagr compiles from the entry file, not
   from `tsconfig.lib.json`'s `include`**, so those two files are not compiled at all:
   measured in step 2 with `const probeTypeError: number = 'not a number'` in
   `createModelSource`'s body, against which `nx run eval-forms:build:production
   --skip-nx-cache` is **green**. Without this row, § 6's `build` covers less than it names
   for two steps and every type error in them defers to step 4's barrel edit.

   `tsc` honours `include` where ng-packagr does not, so the gate is one command:

   | Command | Expected |
   | ------- | -------- |
   | `npx tsc -p modules/eval-forms/tsconfig.lib.prod.json --noEmit 2>&1 \| grep "^modules/eval-forms/"` | **no output** |

   **The filter is the row, not a convenience, and dropping it would make this the gate
   revision 10 spent gate 3 removing.** Run unfiltered the command exits non-zero with **38**
   pre-existing `TS1205` errors — all in `eval-core` sources pulled in through
   `tsconfig.base.json`'s `paths`, none in this package, and all of them there before this
   phase started. A gate with 38 standing hits is one people learn to ignore. Calibrated so
   the filter is not vacuous: the same grep against `^modules/eval-core/` returns those 38, so
   it fires when there is something to find.

   **Applies from step 2**, and permanently after — step 1 shipped nothing a barrel does not
   reach, so it had nothing this gate could have caught, and from step 4 on the row is
   redundant with `build` for these two files and still live for anything a later step leaves
   unexported. It reports no output today, so it lands green rather than as a known failure.

   This does not replace `build`: `build` is the only gate on an empty or type-only barrel and
   on the emitted `.d.ts` gates 5 and 6 read, and `tsc --noEmit` emits nothing to check.

### 6.1 Specs go through the end-to-end path

As Phase 4 § 6.1, with one substitution that is not optional: the `/reactive` harness does
not port, because there is no `EvalSignal` whose recomputes can be counted (§ 3.6).

**There are three harnesses here and they are not interchangeable.** Revision 1 offered the
first two as alternatives, which would have let the weaker stand in for the stronger; the
third exists because step 2 has no `LogicFn` to count:

| Harness | Used by | Proves | Does **not** prove |
| ------- | ------- | ------ | ------------------ |
| Read back `f.city().hidden()` / the `TEXT` signal after a model write | steps 4–7 | The rule is registered with Angular, its value reaches the field's state, and the polarity is right — **wiring**, end to end | Anything about tracking |
| Count `LogicFn` invocations across a model write | steps 4–5 | The rule ran, or did not — **reactivity** | Nothing about the value it produced |
| Count re-evaluations of a spec-local `computed(() => context.get(key))` | **step 2 only** | The source and the context resolve and track — **reactivity of the source alone** | Nothing about a rule, a `LogicFn`, or Angular |

#### 6.1.1 How the `LogicFn` count is actually obtained, measured

The second harness is required by name for every negative case **in steps 4 and 5** — step 2's
is the third harness, which needs no mocking at all (W1) — and revisions 1–4 never said
how a spec gets the number. It cannot wrap the closure: `rules.ts` builds the `LogicFn` and
hands it straight to `hidden()`. Four candidate instruments were spiked against a ground-truth
counter placed inside the registrar — available to the spike, never to the library's specs.

**The numbers below are the re-spike's, run under the layout this plan actually specifies**
(C1). Revision 5's spike mocked `./error-policy` as a **sibling** of the adapter, and § 3.4
does not put it there: `applyErrorPolicy` lives in the core (§ 3.4.1), so the adapter imports
it from `@zvenigora/ng-eval-forms` and the seam is a **barrel** re-exporting `toVisible`,
`toText`, `createFieldContext` and `ExpressionErrorPolicy` alongside it. That is a different
mock — wider, and shared with the specs' own imports — so the instrument choice was re-run
rather than re-specified. Six cases, a ground-truth counter, a real `form()` + `schema()` +
`hidden(path, { when })`, the real `createFieldContext`, § 3.3's `evaluateRule`, and
`applyErrorPolicy` reached through the package specifier.

| Instrument | Tracks the true invocation count? |
| ---------- | --------------------------------- |
| Delegating mock of `@zvenigora/ng-eval-forms` — the core entry point's **barrel** — counting `applyErrorPolicy` | **Yes, in every case measured** — construction, first read, unnamed write, named write, throwing expression, and M6's guarded rule |
| Module mock of `./evaluate-rule`, counting `evaluateRule` | Yes **until a rule short-circuits**, then no — see M6 |
| Module mock of `@zvenigora/ng-eval-core`, counting `call` | Same as `evaluateRule`, one layer lower |
| A probe function carried in the model, called by the expression itself | Yes, and needs no mocking — `eval-core`'s call sandboxing does not block it |

**Decision: mock `applyErrorPolicy` — unchanged by the re-spike, and now on four
measurements rather than three.** M4 and M6 hold across the barrel seam at identical numbers;
what the re-spike added is M7, and M7 is the one that changes a sentence this plan had
written down.

- **M1** — with an unguarded rule all three mocked instruments equal the ground truth at every
  stage of § 6.1's sequence: at construction **0/0**, first read **1/1**, unnamed write then
  read **1/1**, named write then read **2/2**, with `hidden` false → false → true. So the
  choice cannot be made by trying the plan's own cases. It has to be made by constructing the
  case that separates them.
- **M6** — a rule that skips the walk when its key is absent, which is the shape a later
  "optimisation" would take, invoked once: ground truth **1**, `applyErrorPolicy` **1**,
  `evaluateRule` **0**, `call` **0**. Identical through the barrel. A negative case built on
  the `evaluateRule` mock would compare 0 to 0 and pass **while the rule was running** —
  reporting reactivity coverage it does not have, exactly as this document's § 6.1 has twice
  before. Counting walks is not counting invocations, and the difference is invisible until
  the day it matters.
- **M4** — `applyErrorPolicy` is 1:1 with the invocation count at every stage above *and*
  under a throwing expression (ground **1**, all three mocked instruments **1**), *and* is the
  seam § 3.4 already requires around the same call. One seam serves the instrument and the
  error policy, so neither is scaffolding held up only by the other. The barrel does not
  weaken this: the delegating mock leaves the rest of the entry point real, and an assigning
  expression still throws `SignalContextWriteError` out through a `'undefined'` policy with
  the mock installed.
- **M7 — new, and it is the measurement § 3.5's invariant actually rests on.** The same
  guarded rule with the guard moved **ahead** of the wrapper, so `applyErrorPolicy` is no
  longer the outermost call, invoked once: ground truth **1**, `applyErrorPolicy` **0**.
  *That* is the instrument sitting under a branch, and it reads zero.

**The instrument depends on a design invariant, and the invariant is therefore stated rather
than assumed: `applyErrorPolicy` must be the outermost call in every `LogicFn` body** (§ 3.5).
M7 is what makes that load-bearing, and **M6 is not** — M6 put the guard *inside* the wrapper,
where the wrapper is still outermost and still tracked 1:1. Revision 5 cited M6 for this
sentence and so cited a measurement whose numbers say the opposite of the claim; § 0.2 records
the general form. A registrar that evaluates before wrapping, or guards ahead of it, degrades
every negative case in steps 4 and 5 to the **M7** result — a count of 0 that reads as "the
rule did not re-run". Step 4's exit criteria assert the policy path through a registered rule,
which is what keeps this checkable.

**Four mechanics, and the barrel changes one of them.** All four are borrowed rather than
derived; the § 0.1 row records where from.

1. **A delegating mock is required, and the bare one fails differently here than the
   sibling-seam spike reported.** Revision 5 wrote that `jest.mock` with no factory auto-mocks
   the function to `undefined`, the rule goes dead, and the read-back assertions in the same
   spec pass while meaning nothing. Under the barrel that is **not** what happens:
   `jest.mock('@zvenigora/ng-eval-forms')` auto-mocks `createFieldContext` too, so
   registration throws `TypeError: Cannot read properties of undefined (reading 'lookups')`
   before any `LogicFn` exists. Measured. The failure is loud, not silent — which is a reason
   to spread `requireActual` rather than a hazard to guard against, and revision 5's stated
   reason for the delegating form does not survive the move to the real seam. It preserves
   behaviour: with the delegating mock installed, every read-back and both error-policy arms
   produce the same values as with no mock at all.
2. **`jest.requireActual` goes *inside* the factory**, because `jest.mock` factories are
   hoisted above every `const` in the file; the obvious spelling throws
   `ReferenceError: Cannot access '…' before initialization`. A counter object declared before
   the `jest.mock` call is fine, because the factory only *reads* it when the wrapped function
   runs.
3. **The mock target is the package specifier**, `@zvenigora/ng-eval-forms`, and
   `jest.requireActual` takes the same specifier. Nothing resolves `./error-policy` from the
   adapter — that path does not exist on this side of § 3.4.1's placement call.
4. **`jest.mock` hoists to *file* scope, so the barrel mock needs its own spec file** (W7).
   It cannot be scoped to one `describe`. Two *delegating* barrel mocks do coexist in one file
   — measured, `@zvenigora/ng-eval-core` and `@zvenigora/ng-eval-forms` side by side, both
   counting correctly — so the split is per file, not per mock.

**The in-expression probe is the rejected alternative, not a refuted one.** It works, it
needs no mocking, and it is 1:1. It is not taken because it changes the expression under
test — `probe(country) === "US"` is not the string a consumer writes — so the fixture and the
shipped case diverge in the one place this plan cares about. Recorded because it is the
fallback if module mocking ever becomes unavailable.

**Also measured: `form()` construction invokes the `LogicFn` zero times** (M1, first row).
The count is 0 until something reads field state, which is why § 6.1's step 1 is a read and
why step 2's `≥ 1` is a real assertion rather than one construction already satisfied.

The read-back **cannot see over-subscription at all**: Angular's value equality means a
re-derivation returning the same boolean is indistinguishable from no re-derivation, so a
source that re-runs every rule on every keystroke passes it unchanged. It is a wiring
harness, not a reactivity harness, and describing it as one is how the over-subscription
probe gets defeated by its own setup.

**So: the negative case — a key the expression never named changes, and the rule must not
re-run — is asserted by the `LogicFn` invocation count in steps 4 and 5.** In step 2 it is
asserted by the third harness's count, for the reason the table's third row gives: there is no
`LogicFn` yet (W1). Positive cases may use either
harness, and should use both where the value matters.

**Revision 2 wrote "and by nothing else", and that clause was itself the defect** (C1). It
was aimed at the assertion and it landed on the setup. Angular's graph is pull-based: a
`LogicFn` registered through `hidden(p.x, { when })` runs when something reads field state
that depends on it, not when the model is written. A spec that writes the model and compares
counts without ever reading the field compares 0 to 0 — and passes identically against a rule
that over-subscribes, a rule wired to the wrong field, and a `hidden()` that was never
registered at all.

**The full sequence, every line of it load-bearing. It is stated generically because two
different harnesses run it** (W6): **sequence steps 2 and 5** are the count in both, and what
"read" means differs, because **work-breakdown step 2** has no form, no field state and no
`LogicFn` at all. (Both numberings in one sentence, which is why both are qualified — W4.)

| Harness | "the counted derivation" is | "read" is | Used by |
| ------- | --------------------------- | --------- | ------- |
| `LogicFn` count | the registered rule's `LogicFn` | `f.city().hidden()`, or the `TEXT` metadata signal read as `f.city().metadata(TEXT)?.()` | steps 4–5 |
| Source count | a spec-local `computed(() => context.get(key))` over a `createRuleContext()` context | calling that `computed` | **step 2** |

1. **Read the counted derivation**, forcing the first invocation.
2. **Record** the count, and assert it is **≥ 1**. A recorded count of 0 means nothing has
   run yet, and the rest of the spec is measuring an absence it created.
3. **Write** a model key the expression does not name.
4. **Read the same derivation again.** This is the step "by nothing else" forbade. Without
   it nothing demands a derivation, and the count cannot move whether the rule is
   over-subscribed or not.
5. **Assert the count is unchanged.** The count is the assertion; steps 1 and 4 are setup.
6. **Then write a key the expression *does* name, read again, and assert the count
   increased.** Without this arm nothing ever demonstrates the counter can move: a counter
   incremented at registration, or wrapping the wrong closure, or sitting outside the
   `LogicFn` body, satisfies step 2's `≥ 1` and then reports "unchanged" for every negative
   case in **work-breakdown** steps 2, 4 and 5 — and § 6.1's own table has already disqualified the read-back
   from covering for it. The instrument needs its own calibration, and this is it. Measured
   for real in the § 3.2.1 spike: Q2's delta is 0, Q1's is 1, same fixture, same counter.

The distinction revision 2 lost is that the read-back is **barred as the assertion and
required as the setup**. `f.city().hidden()` returning the same boolean proves nothing about
tracking — that is the table above, and it stands — but reading it is the only way to make
Angular do the work whose absence the count measures.

**The general form, which is the part worth keeping past this fix: an assertion discipline
can itself have a vacuous setup.** [`CLAUDE.md`](../../CLAUDE.md)'s rule — "The probe checks
the assertion. Check the setup separately." — applies to the rules a plan writes *about*
assertions, not only to the assertions a spec writes. "By the count and by nothing else" was
written as a vacuity guard and it removed the only thing that could make its own subject
occur, which is the same signature § 0.1 gives the other two defects: sound about what it
considered, silent about what it did not. A rule of the form "assert X and nothing else"
therefore has to say what must **happen** for X to be observable, or it is a rule about
notation rather than about evidence.

Both vacuity probes from
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md) apply: break the
unwrap, and make the resolver over-subscribe. A spec suite that survives both has no
reactivity coverage regardless of what it reports — and after the table above, only the
invocation count can fail the second one.

---

## 7. Risks

| # | Risk | Mitigation |
| - | ---- | ---------- |
| 1 | A rule reaches the walk without `evaluateRule`, silently voiding containment — most plausibly by calling the compiled callback directly, which no name-based grep sees | § 6 gate 3 — exactly one `EvalState.fromContext` under **`modules/eval-forms/`**, no `new EvalState`, and no **import** of either service. Scoped to the package, not to `signals/`: a state-constructing helper parked in `src/lib/` is invisible to the narrow grep (W1, W2). The third grep matches an import rather than a bare name, because the bare name hits a pre-existing comment (gate 3) |
| 2 | `applyErrorPolicy` swallows `SignalContextWriteError` via a type-only import (§ 3.4) | Step 3 exit criterion asserts the re-throw through a `'undefined'` policy |
| 3 | `@angular/forms/signals` leaks into the core or `/reactive`; green here, broken for a 19–21 consumer | § 6 gate 2 |
| 4 | An additive core change alters `/reactive` behaviour; no gate row moves because it is one project | § 6 gates 4 and 5, plus reading the diff |
| 5 | Signal Forms is new; an API used here changes in 22.x | Each symbol's **own docblock** checked, per overload — see below |
| 6 | The escaped-closure residual — an arrow that outlives the walk pushes and pops outside any frame | **Accepted**, not mitigated: unsolved in both libraries and not this phase's, stated so it is not mistaken for a regression |
| 7 | **A schema value reused across two models evaluates both forms against the *factory's* model** (§ 3.6, Q9) — every rule silently reads the wrong form's data, with no error and a fully working form | Step 4's Q9 criterion pins the behaviour by assertion (two forms from one schema; form B reads model A), so a change to it goes red rather than passing unnoticed; step 7's README names `makeSchema = (rules) => schema(…)` as the supported reuse shape. **Not** "structurally unreachable" — revisions 1–6 said that of the *context-sharing* hazard on an argument Q7 refutes, and Q8 retires that hazard for a different reason |
| 8 | `compile()` drifts into the `LogicFn` body, re-parsing per derivation | Step 4's parse/compile count, **which revisions 1–4 named here and never put in the step**. `CompilerService`'s LRU would have masked it; § 3.1 drops the service, so there is no cache to hide behind |
| 9 | A later step "simplifies" § 3.2.1's memo back into the source record — the shape that reads more naturally and is what revision 3 shipped | Steps 2 and 4 both carry the Q4 case, asserted on the **second** read under `caseInsensitive`. This is risk 2's shape — a correct implementation a tidying edit silently disables — and the only reason it is catchable is that the case is written down with its expected output |
| 10 | `resolve` changes upstream and `readProperty` does not (§ 3.2.1) | Accepted, and stated rather than mitigated: `resolve` is module-private in `eval-signals`, so there is nothing to import. Two copies that must agree, in a package this repo owns and versions |
| 11 | Angular stops invoking `LogicFn`s inside a memoising consumer, or `computed`'s equality behaviour changes, and every negative case in §§ 4–6 inverts | Q1/Q2/Q2b measure it rather than assume it, so a failing negative case in step 4 is a **mechanism finding about Angular**, not a bug in the diff. Recorded so the next reader spends the hour in the right place |
| 12 | `applyErrorPolicy` stops being the outermost call in a `LogicFn` body — a guard added ahead of it, or the coercion moved inside | Two things break at once and only one is loud: the policy stops covering the coercion, and § 6.1.1's instrument reads 0 where the truth is 1 (**M7**) — so every negative case built on it reports "the rule did not re-run" for a rule that ran, which is the quiet half. **Gated by step 4's coercion-outside-the-policy criterion** — `hidden()` is `true` for a throwing expression under `'undefined'` — plus the instrument at ≥ 1 for a rule whose branch trips, which step 4 states as "its branch key absent" — the same M7 case in the two wordings. Revisions 1–5 named the policy-through-a-rule criteria here, which both nestings satisfy (C4); § 3.5 states the invariant |

| 13 | Step 6's guard rejects an expression a consumer legitimately wrote — a bound arrow parameter (§ 3.8.1) or a name it does not actually shadow — or the `/reactive`-vs-`/signals` **timing** difference surprises a consumer moving a schema between adapters: schema construction there, `form()` here | Step 6's four negative arms are the gate, and they bound the check from both sides: `CONSTRUCTOR`, `country` and `constructorName` must register, `'user.constructor'` must register, `'[1].map(valueOf => 1)'` must register, and `'[1].map(valueOf => valueOf)'` must throw. The timing difference is stated in § 3.8 and carried into step 7's README, which is where a consumer moving a schema would look |

**§ 0.2.1's check applied to this table — re-run to completion in revision 7, and revision 6's
run of it was wrong.** Revision 6 reported eight gated rows and four exceptions. The true count
then was **seven**: risk 7's cell named "Step 2's construction", which is a *deliverable*, not
an assertion — § 0.2.1's own headline case, missed by the paragraph that introduced it, one row
past where it stopped reading. Revision 7 rewrites risk 7 around Q9 and gives it a step-4
assertion, so the count is eight now for a reason rather than by arithmetic.

**As it stands: nine rows name an assertion or a grep** — 1, 2, 3, 4, 7, 8, 9, 12 and 13 —
**and four are exceptions that say so on their face** rather than implying a gate they do not have:
risk 5's is a **completed** read of Angular's per-overload docblocks (1.2.7), done once at plan
time and not repeatable by a spec; risks 6 and 10 are **accepted rather than mitigated**, in
those words; and risk 11's measurement makes a failure *diagnosable* rather than preventable,
which is why its cell says where to spend the hour. Those four are the rows a later revision
must not quietly convert into a cross-reference; the nine are the rows where "which assertion
goes red?" must keep having an answer.

**Risk 13 is new in revision 9, and its absence was itself the defect.** Step 6 adds a
registration-time **throw** to a released package — the only new failure mode this phase
introduces — and through revision 8 no row owned it, so this audit ran to completion over a
table that did not mention the plan's newest deliverable. A check over a list only covers what
the list contains, which is the one thing § 0.2.1's three questions cannot tell you.

**Risk 5's mitigation in revision 1 was false, and how it went wrong is worth recording.**
It read "everything relied on is tagged `@publicApi 22.0` (1.2.1–1.2.8)". What was actually
verified was the **export list** — every name present in `signals.d.ts`'s `export {…}` — and
the **type shapes** of the signatures. What was not read was the **docblock immediately above
each overload**. `hidden`, `disabled` and `readonly` each ship two overloads whose signatures
both type-check; the `@publicApi 22.0` tag sits on the config one and `@deprecated` on the
positional one, and revision 1 cited the positional one for all three. A name being exported
and a signature compiling are both true of a deprecated overload. The check that
distinguishes them is reading the comment, per symbol, per overload.

---

## 8. Open questions

Five were raised in revision 1's draft and settled before it was committed; the reasoning is
kept because each is a decision a later phase could reasonably want to revisit. One remains
open and is marked as such.

**8.1 — Where `applyErrorPolicy` lives. Settled: the core.** The `instanceof
SignalContextWriteError` value import is not a cost to be minimised — it *is* the
enforcement the reviewer's `/signals` Critical item 2 asks for, ~~and a type-only import would
disable it silently~~ — **and revision 13 item 2 corrects that second clause: `import type` is
a compile error, not a silent one. The settlement does not rest on it.** In the core there is
one implementation for both adapters; in the
adapter, `/reactive`'s eventual version drifts from `/signals`', and the two end up
disagreeing about the one error that must never be swallowed. § 3.4.1 records why this is the
opposite placement call from § 3.3 and what actually separates the two cases: `evaluateRule`
published *is* a second path to the walk, while `applyErrorPolicy` cannot reach a walk at
all.

**8.2 — Form-state keys (`touched`, `dirty`, `valid`, …). Settled: out of scope, and a
Phase 7 candidate covering both adapters together.** The mechanism exists here (1.2.4) and
does not exist at `/reactive`, so shipping it now would ship an asymmetry:
`visible: "touched"` would work under `/signals` and silently resolve `undefined` under
`/reactive`, which is worse than the key being unsupported at both. An expression must mean
the same thing at both entry points. **Phase 7 is not yet in
[`ROADMAP.md`](../../ROADMAP.md)** — adding it is a separate docs change, not this phase's.

**8.3 — Should `disabled` surface its reason? Revisited in revision 2. Settled: yes, as a
static option (§ 3.5.2).** Revision 1 deferred it pending "a schema shape that separates the
two", and the review proposed Angular's non-deprecated config overload as that shape.
**That premise does not hold** — `disabled`'s config is a single field,
`{ when?: string | LogicFn<…, boolean | string> }` (1.2.7), so the reason still arrives as
the return value of the function that decides the condition. Checked before acting on it.

The shape that does separate them is ours: a static `reason?: string` on `evalDisabled`,
never expression-derived, with the expression staying boolean. § 3.5.2 has it. So revision 1's
stated precondition is now met — by a different mechanism than the one proposed — and the
capability is recovered rather than dropped. A *dynamic* reason remains out.

**8.4 — Arrays. Still open, and the only one.** `applyEach` and `ItemFieldContext` exist, and
a per-row rule would read `ctx.index` (1.2.3). Unlike Phase 4's `FormArray`, the shape is
obvious. § 2 leaves it out; whether it earns a step in *this* phase rather than a later one
is a scope call I have not made. Step 4 is where it would attach.

**8.5 — Naming. Settled: `evalVisible` / `evalText` / `evalDisabled`.** § 3.5.1 carries the
three rules and the argument: one call per Angular rule rather than an aggregate, an `eval`
prefix for provenance and collision-safety, and naming after the property rather than
Angular's rule so an expression ports between adapters unchanged — which puts the
`visible`/`hidden` inversion inside the library instead of in every consumer's expression.

**8.6 — Version. Settled: 0.2.0.** A new entry point is additive but not a patch.
