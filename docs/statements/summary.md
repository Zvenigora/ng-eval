# Phase 2 — retrospect

Ten steps (0, 0b, 1–8), 2026-09-11 to 2026-09-16, against
[`phase-2-plan.md`](phase-2-plan.md).

**The phase released three packages**, which is not what it set out to do:

| Package | Version | What it carries |
| ------- | ------- | --------------- |
| `@zvenigora/ng-eval-core` | **0.4.0** | the phase — statement support |
| `@zvenigora/ng-eval-signals` | **0.1.1** | one peer-range field, no code |
| `@zvenigora/ng-eval-forms` | **0.2.1** | one peer-range field, no code |

The two patch releases exist because `^0.3.0` does not admit `0.4.0`, which broke both downstream
`lint` targets the moment `eval-core`'s version moved ([F12](../backlog.md#f12)). § 2's "out of
scope" reasonably read as *`eval-core` only* when the phase opened, and that stopped being true at
the last step.

This document doubles as the record for steps 6, 7 and 8. Steps 1–5 recorded their findings **into
the plan** rather than into summaries of their own, which is why there are no `step-N-summary.md`
files here and why this file does not invent five: reconstructing them now would be authoring, not
recording. The plan is therefore the design record *and* the step log, and its § 3 and § 5 carry
corrections written at the step that found them.

## 1. What shipped

| | |
| --- | --- |
| **Seven visitors** | `Program`, `ExpressionStatement`, `EmptyStatement`, `BlockStatement`, `VariableDeclaration` (`let`/`const`), `IfStatement`, `ForStatement` — registered in `recursive-visitors.ts`, none of them exported |
| **The completion-value convention** | § 3.1's four rules: one push per exit path, one pop per `callback`, `EMPTY_COMPLETION` for "produced nothing", converted to `undefined` at the walk boundary rather than in `Program` |
| **Block scoping** | a scope per block, per `for` head; `const` kinds in a `WeakMap` keyed by scope rather than a resolvable key on the record |
| **The statement dispatcher** | explicit, `default` throws. Moved to `dispatch-statement.ts` in step 6, its fourth importer |
| **An iteration budget** | `maxIterations`, default 100,000, per outermost `evaluate` entry rather than per state or per loop |
| **`exit`'s scan bound** | [E6](../backlog.md#e6), landed in step 1 after its premise was measured false |
| **A9 and B2** | step 0 — `try`/`finally` at both scope-push sites, and the `EvalState` dump deleted from `pattern.ts` |
| **The peer ranges** | step 7 — both widened to `>=0.3.0 <0.5.0`, and `nx.json`'s `lint` inputs gained `^production` so a sibling manifest change can no longer be cached over |
| **The citations of them** | step 8 — six sites re-spelled, and one gate that would have got a live guard deleted |

Opened along the way: [A11](../backlog.md#a11), [A12](../backlog.md#a12),
[F13](../backlog.md#f13); [F8](../backlog.md#f8) widened from one untagged version to four.
[F12](../backlog.md#f12) and [F14](../backlog.md#f14) were both opened **and closed** inside the
phase, one step apart each time. Resolved, in the register's own vocabulary:
[A9](../backlog.md#a9) and [B2](../backlog.md#b2) are **Fixed** (step 0); [E6](../backlog.md#e6),
[F12](../backlog.md#f12) and [F14](../backlog.md#f14) are **Retired — fixed** (steps 1, 7 and 8).
All five bodies still sit above the register's `# Retired` heading, which is where the entries
themselves say they belong.

## 2. The thing this phase will be remembered for

**Statements were never unsupported. They were walked as expressions and silently
mis-evaluated.** `throw 1` evaluated to `1` and threw nothing. `if (a) { 1 } else { 2 }` walked
**both** branches and returned the `else` value because it was pushed last. `switch (1) { case 1: 2 }`
returned `2`. `let x = 1; x + 1` returned `NaN`, because the declarator's `id` was handed to the
identifier visitor and resolved as a *read*.

That is what made this a behavioural release rather than an additive one, and it is why the
CHANGELOG's Changed section is longer than its Added section. A phase that had read its own subject
as "add some visitors" would have shipped `0.3.1`.

## 3. Step 6's own findings

Step 6 was scoped as records and release. **Four of its five findings came from *checking* claims
earlier steps had written down**, rather than from writing anything new — which is the thing worth
stating about this step: the documentation task was where the measurement happened, and every one
of those four claims had passed review at the step that made it.

**Two of them correct [`phase-2-plan.md`](phase-2-plan.md) § 5, and the corrections are recorded
_here_ rather than beside the claims.** That is a departure from how steps 1 to 5 worked — each
corrected the plan in place, which is why § 5 already carries step 4's correction of the `if` row
three paragraphs below the row § 3.2 below is about. The reason is narrow and worth naming rather
than leaving as an inconsistency: the plan document **is not on step 6's file list**. Nothing else
made it unsuitable. So a reader of § 5 alone will still find the two rows as written, uncorrected;
§ 3.1 and § 3.2 below are the correction, and the CHANGELOG — which is what a consumer actually
reads — acts on both.

**Annotating § 5 in place remains the better end state, and it is a one-file follow-up**: two
paragraphs added to `phase-2-plan.md` § 5 beside the rows they correct, in the shape step 4 used
three paragraphs further down that same section, touching nothing else. Named as a concrete piece
of work rather than left as an implication, because "the better end state" with no owner and no
size is how § 0.1's subject gets created rather than avoided. The material is written — § 3.1 and
§ 3.2 below are what it would say.

Step 6 did edit the plan for one other reason —
[step 7](phase-2-plan.md#step-7--the-downstream-peer-ranges), which had to be written there before
it could open — so the file list this paragraph describes is the one step 6 *started* with. The § 5
annotation was still not folded in, deliberately: sanctioning a step's paths is the plan's job and
belongs in it, while correcting § 5's rows is editorial and would have been the second scope
widening of one step.

### 3.1 A § 5 row that is net-zero over the phase

§ 5 lists, among the behavioural changes the bump covers, `EvalContext.get`'s treatment of a pushed
scope — presence rather than value — *"which also stops a plain-record scope resolving
`Object.prototype` names"*.

**Measured across the phase, it changes nothing.** `toString`, `constructor`, `hasOwnProperty`,
`valueOf` and `isPrototypeOf` resolve identically before step 0 and at 0.4.0, on six context
shapes: a plain object, no context at all, a `Registry`, a `lookups` resolver over a plain object,
a `lookups` resolver over a `Registry`, and inside an arrow body.

The reason is that the exposure the presence gate fixes is one **step 1 itself created**: the
program scope pushed on every walk is new in step 1, and a plain `{}` answering `toString` ahead of
`original` is new with it. Step 1 measured the regression against a mid-step state and correctly
fixed it; what it then recorded in § 5 reads as a change a *consumer* would see. A consumer sees
none. The pre-existing leak — a plain context object resolving its own prototype's names through
`original` — is untouched and still live.

The gate stays load-bearing; it is just not a migration row. **The CHANGELOG omits it**, and that is
the correction: a migration note that sends a reader looking for a difference that does not exist
costs them the same time as one that hides a difference that does.

### 3.2 A § 5 row whose endpoint is neither of the two values it names

§ 5's block-bodied-arrow row lists three expressions that "now raise `Unsupported statement type`",
measured with the visitors unregistered. Two of the three moved again afterwards:

| Expression | pre-phase | steps 2–3 | 0.4.0 |
| ---------- | --------- | --------- | ----- |
| `(x => { while (false) { 1 } })(0)` | `1` | throws | throws |
| `(x => { if (true) { 1 } })(0)` | `1` | throws | **`1`** — net zero |
| `(x => { let y = 1; y })(0)` | `undefined` | throws | **`1`** — a third value |

The `if` row was already corrected in § 5 by step 4. The `let` row was not, and it is the more
interesting of the two: its endpoint is neither the old value nor the throw the row names. A
CHANGELOG transcribed from § 5 would have had to read on to the next sentence — "`if`, `for` and
the declarations come back in steps 3 to 5" — to get the endpoint right, and would still not have
learned that the endpoint is `1` rather than the `undefined` it started from.

**The general shape**: § 5 accumulated one row per step, each written at the step that caused it,
and a row written mid-phase records a *transition*, not an *endpoint*. The migration note describes
endpoints. Nothing in the plan's structure distinguishes the two, and the fix is not a rule but an
audit — which is what step 6 ran, against both trees, for every row.

### 3.3 The rejection surface is much wider than § 1.1's table

§ 1.1's twelve rows are the phase's detector and they are all pinned in
`statement-semantics.spec.ts`. Only two of them — `while` and `function` — are rejections. But the
dispatcher's `default` rejects **every** statement type outside the seven, and the pre-phase base
walker returned a value for almost all of them:

`do`/`while`, `for...in`, `for...of`, `switch`, `try`, `throw`, labels, `break`, `continue`,
`class`, `var`, plus `const` reassignment, object-pattern defaults, and blocked names as arrow
parameters. Fifteen rows, measured before and after, all in the CHANGELOG.

None of these is a *defect* — they are the intended consequence of § 1.7's "the `default` throws".
What was missing was that a consumer meets them, and § 1.1's table is not where they are. A reader
of the plan would reasonably have concluded the blast radius was twelve expressions.

### 3.4 The divergence count, and the third count correction of the phase

Step 6's own paragraph in the plan says to write "§ 3.6's six divergences" into the README. **§ 3.6
lists seven.** Item 7 — a binding name on the prototype-pollution blocklist is rejected, including
as an arrow function parameter — was added by **step 3's review**, after step 6's paragraph had
already been written. Nothing then went back to the paragraph that counts them. The README ships
seven, each measured against the built bundle.

This is § 0.1's shape applied to a prose count: a number written once, made stale by later work
that had no reason to look at it. **It is the phase's third count correction** — after the
`ForStatement` table's test count (n, corrected to n+1) and `readme-examples.spec.ts`'s block count
(8 → 11 → 12, and 12 → 14 in this step). Three instances in one phase is the argument that
hand-transcribed counts in prose are a category, not a series of slips: the `ForStatement` one
would have made a correct visitor look like it over-popped, and the block count silently claims
coverage that may not exist. [F13](../backlog.md#f13) gates the one that is mechanically
checkable; the other two are not, and the only defence is that a count is a claim like any other.

### 3.5 The relaxation the plan predicted, demonstrated rather than argued

§ 3.2 predicts that a write to a binding the expression itself created stops throwing
`SignalContextWriteError` under `eval-signals`. Nothing had demonstrated it: every write case
pinned in that library's specs is a bare identifier the *source* binds, which still throws, and both
downstream suites stayed green through the whole phase — which is what § 3.2 predicted too.

Step 6 held the criterion to a measurement rather than accepting the design argument, and the
relaxation is real. The citable case is **`(x => (x = 5))(1)`** — an arrow parameter, no statement
involved, so it is a path that existed in 0.3.0:

| | `eval-core` 0.3.0 | `eval-core` 0.4.0 |
| --- | --- | --- |
| `count = 5` | throws | throws — unchanged |
| `(x => (x = 5))(1)` | throws | `5` |
| `let count = 5; count` | n/a | `5`, source unchanged at `1` |

Measured by reverting `assignToBinding` to `st.context.set` and re-running: the arrow case throws
again. So the relaxation is attributable to step 3's write redirection specifically, not to
statements in general.

**It is in the CHANGELOG and pinned by nothing.** No spec in either library asserts it — adding one
means editing `modules/eval-signals/`, which this phase's scope gate makes a stop-and-replan. A
consumer-visible behaviour documented in a published changelog and held by no test is a gap; it is
the kind of thing [F13](../backlog.md#f13)'s neighbours exist for, and whoever releases
`eval-signals` next (Phase 5, or [F12](../backlog.md#f12)) should pin it there.

## 4. The gates track caught its first real case, on its own repository

[F3](../backlog.md#f3)'s drift gate has a three-way check: a symbol that **is exported**, is
documented in the **root** README, and is **absent** from the package README. It was built in the
gates track and had never fired on a release.

Step 6 is the first release since it shipped, and the check shaped the work: `EMPTY_COMPLETION`'s
worked example went into the **package** README rather than the root one, because the root README
is the one that ships nowhere. That is the gate working as designed rather than a constraint routed
around — and the probe confirms it is awake: renaming the import to `EMPTY_COMPLETION_XX` reddens
`public-api.spec.ts` with the exact line and symbol.

The execution gate ([F4](../backlog.md#f4)) covers the two new blocks, which took
`readme-examples.spec.ts` from twelve blocks to fourteen. The count is hand-transcribed and now
[F13](../backlog.md#f13).

## 5. What the plan got right, worth keeping

- **`EMPTY_COMPLETION` converted at the walk boundary, not in `Program`.** § 3.1 caught this in
  draft: `arrow-function-expression.ts` calls `evaluate` on a `BlockStatement`, so a `Program`-side
  conversion would have handed the sentinel to a consumer on exactly the path § 3.6.1 documents as
  a deliberate divergence.
- **Refusing a completion record on `EvalState`.** `ROADMAP.md` anticipated one. With abrupt
  completion out of scope nothing needed to bubble, and per-walk mutable state would have collided
  with the re-entrant `evaluate()` in `arrow-function-expression.ts`.
- **§ 0.1's discipline, applied to itself repeatedly.** The plan corrected its own claims at least
  six times — the `ForStatement` test count (n, not n+1), the discriminating sentinel case named
  twice in two steps, E6's premise, A9's absence from § 5, the third-importer rule, the divergence
  count. Step 6 found two more, recorded in § 3 above rather than in the plan for the reason given
  there. A document that records its own corrections in place is the reason this retrospect could
  be written from the plan rather than from the diff — which is also the argument for closing that
  last gap.

## 6. What is left

- [F8](../backlog.md#f8) — **four untagged published versions**, three of them created by this
  phase. The sharpest thing the phase leaves, and § 8 below is why it is not "remember to tag".
- [A12](../backlog.md#a12) — the budget bounds time, not memory; `result.trace` grows per iteration.
- [A11](../backlog.md#a11) — renaming and nested destructuring bind the wrong key. Live on the
  default path, found in step 3, and **not caused by this phase** — declarations only widened the
  route to it.
- [A2](../backlog.md#a2) — confirmed untouched by measurement at step 6, not by reading the diff:
  step 3 *did* edit both write visitors, so "the phase did not touch these files" would have been
  false while "the phase did not change these three behaviours" is true.
- The multiplier one level up ([`phase-2-plan.md`](phase-2-plan.md) § 3.4, not § 3.4 of this
  document): a closure carried between contexts refills its own budget. Recorded in the plan,
  unreachable from inside this library.

## 7. The measurement rule this phase ends with

**A version bump invalidates a `lint` result whose cache key does not capture it.**

Step 6 bumped `modules/eval-core/package.json` to `0.4.0`, ran
`nx run-many -t lint test build`, and was told all three projects were green. They were not:
`@nx/dependency-checks` fails `eval-signals:lint` and `eval-forms:lint` against a `^0.3.0` peer
range that does not admit `0.4.0`. Both `lint` results were **replayed from cache**, populated
before the bump. `--skip-nx-cache` is what surfaced it. The rule, now in
[`phase-2-plan.md`](phase-2-plan.md) § 7.3: **any step touching a `package.json` verifies with
`--skip-nx-cache`.**

The mechanism is worth naming, because "the cache was stale" is not the finding. `@nx/dependency-checks`
reads a **sibling project's** manifest — `eval-signals:lint`'s correctness depends on a file in
`modules/eval-core/`. `nx.json` declared `lint`'s inputs as `["default", <two eslint configs>]`,
and `default` is `{projectRoot}/**/*` plus an empty `sharedGlobals` — **nothing from any
dependency**. So the cache key could not move when the manifest did. A cache is only as honest as
its declared inputs, and these were wrong.

**Step 7 fixed it in one line**: `"^production"` added to that `inputs` array, which brings every
dependency's non-spec files — `package.json` included — into the key. Measured both ways rather
than assumed, because a fix to a caching bug that is itself verified through the cache deserves the
suspicion:

| cached `nx run-many -t lint`, `eval-core` set to an inadmissible `0.6.0` | result |
| --- | --- |
| **without** `^production` | `Successfully ran target lint for 3 projects` — green, replayed, **wrong** |
| **with** `^production` | fails both downstream projects, naming `0.6.0` |

The first row is the step 6 incident reproduced on demand. `lint` was the only target with the gap —
`build` and the Jest target already declared `^production`, and no `project.json` overrides
`inputs`. The cost is more cache misses: an `eval-core` source edit now invalidates both downstream
`lint` results as well as its own, which is the right trade against a gate that reports passes it
did not run.

**The discipline survives the fix.** `--skip-nx-cache` when a `package.json` is in the diff is still
the rule in [`phase-2-plan.md`](phase-2-plan.md) § 7.3, because the fix addresses the one input that
was found missing and not the class of inputs that might still be.

**This is the fourth cache-versus-measurement incident in this repository, and the first that
reached the user as a reported fact.** The earlier three were caught inside the step that caused
them; this one was stated as a completed verification before anything questioned it. That is the
difference that makes it a rule rather than a note — the failure mode is not "a stale result
existed", which is ordinary, but "a gate reported a pass it had not run, and the report was
believed and passed on".

It belongs beside § 3's findings rather than apart from them. Every one of those was a claim that
had passed review at the step that made it, and this is the same shape one layer out: the
verification command is itself a claim, and running it is not the same as it having run.

## 8. What the phase leaves: a procedure with a silencer

[F8](../backlog.md#f8) is the one open item worth naming at length, because the obvious reading of
it is wrong and the obvious fix would not work.

**Four published versions carry no git tag**: `eval-forms@0.2.0` from Phase 6, and this phase's
`eval-core@0.4.0`, `eval-signals@0.1.1`, `eval-forms@0.2.1`. The natural conclusion is that nobody
wrote the procedure down, or that four people forgot. Checked, both are false:

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) **step 4 specifies it** — the `{projectName}@{version}`
  format, the `git tag -a` command, and the constraint that the commit be the one the artifact was
  built from.
- **It was followed**: `eval-core@0.3.0`, `eval-forms@0.1.0` and `eval-signals@0.1.0` all exist.
- **All three `project.json`s read those tags** (`currentVersionResolver: "git-tag"`), so they are
  load-bearing input to the next release's version — the configuration does depend on them.

So the step is specified, understood, and was performed; it has simply been skipped by every
release for two phases. **What makes that possible is `fallbackCurrentVersionResolver: "disk"`.** A
missing tag fails nothing. The resolver falls back to the manifest, the next version computes, the
publish works, and the configuration that was built to depend on tags goes on working without them.

**The tag step has a specification and no forcing function, and it ships with a silencer.** That is
a different defect from a missing instruction and it wants a different fix: "remember to tag" is
the remedy for a procedure nobody documented, and this procedure is documented. What would actually
hold is one of — failing loudly when a tag the resolver is about to read does not exist; writing the
tag from whatever performs the publish, so the two cannot separate; or gating it the way
[F3](../backlog.md#f3) and [F4](../backlog.md#f4) were gated, with a check that every version in a
`modules/*/package.json` has a tag. Only the last catches the four already missing.

It is the same shape as § 7's cache incident and as every finding in § 3: **a mechanism that keeps
working while the thing it depends on quietly stops being true.** A cache that replays a pass it
did not run, a docblock that justifies a guard with a reason that expired, a plan row that records
a transition as an endpoint, a fallback that covers for a tag nobody wrote. The phase spent more
effort on that class than on statements, and this entry is where it is left standing.

---

## 9. Phase 2, closed

Ten steps. Statement support in `eval-core` 0.4.0 — seven visitors, block scoping, an iteration
budget, and a dispatcher whose `default` throws instead of silently mis-evaluating. Two patch
releases downstream to make it installable. Six documentation sites corrected to match.

**What it actually cost was not the visitors.** The evaluation model absorbed statements about as
the plan predicted: the value stack was already the completion-value mechanism (§ 1.2), no
completion record was needed, and the three stack invariants held at every new site. What consumed
the phase was everything *around* the code — the blast radius of a change to a silently-wrong path,
and the accumulated claims about it. Step 6 was scoped as records and release and produced five
findings, four of them corrections to claims that had passed review at the step that made them.

**The one number to carry forward**: `eval-core` 0.4.0 changes what **twenty-two rows'** worth of
already-working expressions return or raise — seven that return a different value, fifteen that now
throw — against a plan section that enumerated twelve. Every row is measured, before and after, in
the CHANGELOG, against a pre-phase worktree rather than against the plan. That gap between what a
phase thinks it changes and what it changes is the phase's real subject.
