# Track 3 Plan — the documentation and CI gates

Covers [`docs/backlog.md`](../backlog.md) entries [F1](../backlog.md#f1), [F3](../backlog.md#f3),
[F4](../backlog.md#f4), [F7](../backlog.md#f7) and [D10](../backlog.md#d10).

Not a roadmap phase. It ships no capability, adds no exported symbol, and bumps no version. It
is ordered ahead of Phase 2 in [`ROADMAP.md`](../../ROADMAP.md) § "Suggested order" for one
reason: F3 and F4 build gates that every later phase inherits, so a phase that starts behind
them gets them for free, and a phase that starts in front of them adds to a queue.

---

## 0. On the length of this document

**Agreed: this should be, and is, a much shorter plan than
[`docs/forms/phase-6-plan.md`](../forms/phase-6-plan.md).** That document runs 3,420 lines
because it shipped a new published entry point against an Angular API whose every relied-upon
overload had to be read per docblock, carried a stated correctness precondition, and could
break a released package. This one ships nothing to npm, has no consumer, and cannot regress a
published surface — the worst outcome available to it is a spec that does not earn its place.
Roughly a sixth of the length is the right order of magnitude, and § 4's steps are
correspondingly thin.

**What makes it bigger than it looks**, though, and why it is not the afternoon the entries
imply. Five findings, four of them measured, in descending order of how much work they move:

1. **The drift gate cannot see the symbols it most needs to check** (§ 1.1). A runtime export
   list is blind to every interface and type alias, and the READMEs document those today.
2. **F4's stated reason for doing `eval-signals` first is false** (§ 1.2) — measured, not
   reasoned. The consumer-shaped import it rests on is a lint error in exactly the place the
   argument needs it.
3. **`eval-signals`' README is not the zero-preamble case F4 implies** (§ 1.3). It is still the
   easier of the two, but not for the reason given.
4. **F3 is scoped to one package and there are now three** (§ 1.4) — the same under-scoping
   that F1 carried for two phases.
5. **F3 and F4 read the same files and one can move the other's input** (§ 1.5).

None of these changes the plan's shape. Two of them change a step's content, and one retires a
premise a later reader would otherwise inherit.

---

## 1. Findings that shape the design

### 1.1 A runtime export list is blind to type-only exports — and the READMEs use them

The obvious implementation of F3 is `import * as api from '<specifier>'` and then check each
identifier a README imports against `Object.keys(api)`. **That fails on correct code**, because
interfaces and type aliases have no runtime presence.

Measured against the current tree:

- [`modules/eval-forms/README.md:555`](../../modules/eval-forms/README.md#L555) documents
  `import { ExpressionRules } from '@zvenigora/ng-eval-forms/signals'`.
- `ExpressionRules` is `export interface` at
  [`signals/src/lib/rules.ts:60`](../../modules/eval-forms/signals/src/lib/rules.ts#L60).

So the naive gate reports a false failure on day one, against a symbol that is correctly
exported and correctly documented. `eval-core`'s surface makes this the common case rather than
the exception — `ParserOptions`, `AnyNodeTypes`, `CacheType`, `QueueType`,
`RecursiveVisitorState` and the rest of `internal/interfaces/` are all type-only.

A gate that false-fails is worse than no gate: the first person to hit it will either delete it
or add an exception list, and an exception list is where the symbols that *should* fail go to
hide.

**Two viable sources for a complete export list**, and choosing between them is § 3.1:

| Source | Sees types? | Cost |
| ------ | ----------- | ---- |
| The TypeScript compiler API over `src/public-api.ts` | yes | `typescript@6.0.3` is already a devDependency; the barrel re-exports other barrels, so the checker must follow the graph rather than read one file |
| The built `dist/**/*.d.ts` | yes | Trivial to read — but it only exists after `build:production`, and `nx test` does not depend on `build`. Green locally only if someone built first |

### 1.2 The consumer-shaped import is a lint error inside the package it belongs to — measured

F4 argues `eval-signals` should go first partly because "`eval-forms`' spec already imports
`SignalContextWriteError` from it, so a consumer-shaped import through the published specifier
is known to work from a spec folder."

**That does not transfer, and the difference is the whole point.** `eval-forms` importing
`@zvenigora/ng-eval-signals` crosses *projects*, which `@nx/enforce-module-boundaries` permits
under the `scope:forms` → `scope:signals` constraint. A spec inside `modules/eval-signals/`
importing `@zvenigora/ng-eval-signals` does not cross anything.

Probed directly — a throwaway spec at `modules/eval-signals/src/lib/` importing
`createEvalSignal` through the published specifier, then removed:

```
error  Projects should use relative imports to import from other files within the
       same project. Use "./path/to/file" instead of import from
       "@zvenigora/ng-eval-signals"   @nx/enforce-module-boundaries
```

The root [`eslint.config.mjs`](../../eslint.config.mjs) sets `allow: []`, so there is no
exemption to reach for and adding one would be a workspace-wide loosening to serve one spec.

**Consequence.** The `eval-signals` gate must import through `../public-api` (or `../index`),
which is a **substitution against what the README prints** — the same one
[`readme-examples.spec.ts`](../../modules/eval-forms/reactive/src/lib/readme-examples.spec.ts)
had to make for `/reactive`, recorded in its docstring for the same reason. It is a real cost
rather than a formality: the gate's claim is "this is what a consumer writes", and the import
line is the one line where that stops being true. It must be enumerated, not glossed.

This does **not** overturn "do `eval-signals` first" — § 1.3 leaves that conclusion standing on
a different footing — but the stated reason is retired, and
[`docs/backlog.md` F4](../backlog.md#f4) should not be read as still asserting it.

### 1.3 `eval-signals`' README is continuous, which is the good news and the cost

F4 describes it as "already written in whole-unit blocks — a component class, then a sequence of
reads and `set` calls against it — which is the shape the gate wants." Accurate, and it has a
second half.

[`modules/eval-signals/README.md`](../../modules/eval-signals/README.md) has 11 `ts` blocks and
exactly **one** `import` from the package across the whole file, at line 26. Its Quick start
declares a component class; the very next block reads

```ts
this.total();              // 30
this.quantity.set(4);
this.total();              // 40  — recomputed
```

— `this.`, outside any class body, against the class the previous block declared. So:

- **The one-program soundness condition is not optional here, it is the file's actual shape.**
  A per-block harness behind a resetting `beforeEach` would execute a different program and go
  green on a document that is wrong as written. This is the failure Phase 4 step 6 hit for real
  when a first draft split the worked example into a case apiece and hid a `false` that § 4 had
  already driven to `true`.
- **The spec must supply a component instance and rewrite `this.` to it**, plus a real
  `@Component` decorator argument where the README elides one as `{ /* … */ }`. That is a
  substitution of exactly the kind F3's "considered and rejected" section warns about, and the
  established answer applies: enumerate it in the docstring, and where a block is a genuine
  fragment fix the **document** rather than padding the spec.

`eval-signals` is still the easier package — its blocks are whole units and its narrative is
linear — but "already in the shape the gate wants" overstates it by one preamble.

### 1.4 F3 names one package; there are three, and four READMEs

F3 was written closing Phase 1, when `eval-core` was the only published package, and says
"every symbol a README imports from `@zvenigora/ng-eval-core`… in **both** `README.md` and
`modules/eval-core/README.md`". Nothing widened it when two more packages shipped — the same
drift [F1](../backlog.md#f1) carried for two phases.

Measured inventory of `import { … } from '@zvenigora/…'` lines:

| File | Count | Specifiers |
| ---- | ----- | ---------- |
| `README.md` (root, unpublished) | 10 | `ng-eval-core` only |
| `modules/eval-core/README.md` | 6 | `ng-eval-core` |
| `modules/eval-signals/README.md` | 1 | `ng-eval-signals` |
| `modules/eval-forms/README.md` | 3 | `ng-eval-forms/reactive` ×1, `ng-eval-forms/signals` ×2 |

The published/unpublished comparison that motivated F3 — `trackTime` documented only in the root
README, which ships nowhere — still applies and still only concerns `eval-core`, since the root
README imports nothing else. But the "public symbol renamed while a README goes on naming it"
half applies to all four files, and `eval-forms` splits across two entry points with separate
export surfaces.

Scope is § 3.2.

### 1.5 F3 and F4 read the same files, and F4 can move F3's input

Both gates take the fenced blocks of the same READMEs as input. F4's method, inherited from
Phase 4, is that **where a documented block is a fragment the fix goes into the document** — so a
step that gates `eval-core`'s README may add the import lines its fragments are missing, which
is precisely the set F3 scans.

They do not conflict, but the order is not free: F3 built first measures a document F4 may then
change, and F3's cases would need re-reading. F3 built *last* measures the final text once.
Against that, F3 is the larger unknown (§ 1.1) and finding it unbuildable after two F4 steps
would be finding it late.

§ 4 resolves this by putting F3 second — after the config step, before both F4 steps — and
accepting one re-read of its case list in step 4 if that step edits `eval-core`'s README. The
re-read is cheap; discovering F3's export-list problem in step 5 would not be.

---

## 2. Scope

### In scope

- **[F1](../backlog.md#f1)** — a `configurations.ci` block on the `test` target of
  `eval-signals` and `eval-forms`, plus the decision on coverage thresholds.
- **[F3](../backlog.md#f3)** — the documented-symbol drift gate, its export-list source, and its
  package scope.
- **[F4](../backlog.md#f4)** — the README-execution gate for `eval-signals`, then the
  decide-or-drop for `eval-core`.
- **[F7](../backlog.md#f7)** — the Jest worker warning, timeboxed, with a drop rule.
- **[D10](../backlog.md#d10)** — a runnable README block for `applyErrorPolicy`, which folds into
  `eval-forms`' existing README-execution spec rather than creating anything.

### Out of scope (deliberately deferred)

- **Any behavioural change to any package.** Nothing here alters an evaluation result, an
  exported symbol's shape, or a manifest. If a step finds it needs one, that is a
  stop-and-replan, not a wider step. The one exception is prose *inside* a README, which several
  steps may edit under § 1.5's rule.
- **[D11](../backlog.md#d11), the `/signals` worked example.** Moved out of this plan
  deliberately, and the reason is a scope call worth stating: it is ~200 lines of original
  narrative authoring, not a gate, and gating it afterwards would then be a sixth step. It
  belongs with whoever next has a reason to document `/signals` end to end. Bundling it here
  would double the plan to buy something none of the other entries need.
- **Every other backlog entry.** [F2](../backlog.md#f2) (one changelog for three packages),
  [F5](../backlog.md#f5) (the `js-sha256` range), [F6](../backlog.md#f6) (CONTRIBUTING's rule
  table) and [F8](../backlog.md#f8) (the missing tag) are all tooling or docs, and all four are
  *decisions about policy* rather than gates. They share no file and no mechanism with anything
  here.
- **Coverage thresholds actually gating CI.** Step 1 decides whether to adopt them; adopting
  them and driving the numbers up is separate work with a different owner.

---

## 3. Design

### 3.1 The drift gate's export list — decided: the compiler API, over source

Of § 1.1's two options, **read the export list with the TypeScript compiler API from
`src/public-api.ts`**, not from `dist/**/*.d.ts`.

The `.d.ts` route is far less code and has one disqualifying property: it makes a `test` target
depend on a `build` target that Nx does not know about. `nx test eval-core` on a clean checkout
would fail, or worse, pass against a stale `dist/` from three commits ago. A gate whose
correctness depends on whether someone remembered to build is the class of gate this repository
has twice rejected.

The compiler-API route reads the same source the barrel actually publishes, needs no build, and
`typescript@6.0.3` is already a devDependency. Its cost is that `src/public-api.ts` re-exports
barrels which re-export barrels, so the implementation must resolve the graph rather than parse
one file — `ts.createProgram` plus `checker.getExportsOfModule(...)` on the resolved source file
does this, and returns types and values alike.

**This is the one piece of genuinely new machinery in the plan**, and step 2 should build it as
a small helper with its own unit cases before any README is scanned, so that "the export list is
wrong" and "the README is wrong" cannot be confused for one another.

### 3.2 The drift gate's scope — decided: all four READMEs, all three packages

F3's original wording is honoured and widened rather than reinterpreted:

- **Both `eval-core` READMEs are compared against each other**, which is the published/unpublished
  check F3 exists for and the only place it applies (§ 1.4 — the root README imports nothing
  else).
- **Each package README is checked against its own package's export list**, which is the
  rename-drift half and applies to all three.
- **`eval-forms` is checked per entry point**, because `/reactive` and `/signals` have separate
  export surfaces and a symbol exported from one is not exported from the other.

Explicitly **not** included, on F3's own reasoning: a block-count assertion. It fires on every
legitimate addition, so its steady state is training people to bump a number.

### 3.3 What the two gates each claim, stated so neither is read as the other

Repeating this here because the two land two steps apart and the distinction is what keeps both
worth having:

| | Reads markdown? | Runs code? | Catches |
| --- | --- | --- | --- |
| **F3** drift gate | yes | no | A symbol a README names that the package does not export — including a rename that happened elsewhere |
| **F4** execution gate | no | yes | A documented snippet that does not run as printed |

Neither supersedes the other and nothing but a human keeps a snippet and its case in step. That
last sentence is [F4](../backlog.md#f4)'s own limitation, restated rather than solved.

### 3.4 The coverage decision — recommended shape, decided in step 1

`eval-core`'s block is `{ ci: true, coverage: true }` and reports coverage without failing on it.
The cheap, symmetric answer is to give the other two the same block and **not** add thresholds.

Thresholds are the part worth deciding rather than copying, and the recommendation is *not yet*:
none of the three projects has a measured baseline, a threshold set from today's number is an
arbitrary line that will be lowered the first time it blocks someone, and CI does not currently
run `--configuration=ci` at all
([`.github/workflows/node.js.yml`](../../.github/workflows/node.js.yml) runs plain `npm test`).
Adopting thresholds means also changing the workflow, which is a second decision. Step 1 records
the baseline numbers so a later decision has them.

---

## 4. Work breakdown

One numbered step per session, per `CLAUDE.md`. Lint and the full suite after every step.

### Step 1 — The CI test configuration, and the coverage decision

**Files**: `modules/eval-signals/project.json`, `modules/eval-forms/project.json`, and
[`docs/backlog.md`](../backlog.md).

Add the `configurations.ci` block `eval-core` already has to both other projects. Run
`nx run-many -t test --configuration=ci` and record the three coverage baselines in the step
summary. Decide thresholds per § 3.4 and write the decision — including "not yet", if that is the
answer — into `docs/backlog.md` F1.

**Exit criteria**
- `nx test eval-signals --configuration=ci` and `nx test eval-forms --configuration=ci` both run
  and emit coverage; the command errored before this step and does not after.
- The three baseline coverage numbers are in the step summary.
- F1's entry records the threshold decision and its ground, and is marked Retired if nothing is
  left open.
- `nx run-many -t lint test` green.

### Step 2 — The export-list helper and the drift gate

**Files**: a new `public-api.spec.ts` beside each package's public API per § 3.2, plus a shared
helper for the export list and the README scan.

Build the § 3.1 helper **first**, with its own cases: a known value export, a known
`export interface`, and a name that is not exported at all. Only then scan the READMEs.

**Exit criteria**
- The helper returns type-only exports. Asserted directly on `ExpressionRules`
  (`export interface`, § 1.1) — this is the case the naive implementation fails, so it is the
  case that proves the helper is not the naive implementation.
- Every identifier imported from a `@zvenigora/…` specifier in all four READMEs resolves against
  that specifier's export list. `eval-forms` is checked per entry point.
- **Confirmed load-bearing**: rename one exported symbol and observe a named failure that points
  at the README and line that still uses the old name. Report which case went red, not that the
  suite did.
- The published/unpublished comparison for `eval-core` is asserted, not merely enabled — a symbol
  documented in only one of the two `eval-core` READMEs fails.
- No block-count assertion anywhere (§ 3.2).
- `nx run-many -t lint test` green.

### Step 3 — The README-execution gate for `eval-signals`

**Files**: `modules/eval-signals/src/lib/readme-examples.spec.ts`; possibly
`modules/eval-signals/README.md`.

Follow
[`readme-examples.spec.ts`](../../modules/eval-forms/reactive/src/lib/readme-examples.spec.ts) —
it is the pattern, including its docstring discipline. One case per continuous program (§ 1.3),
split only where the document itself declares a fresh start.

**Exit criteria**
- The runnable `ts` blocks execute and their printed values are asserted as printed. Blocks that
  do not execute are named in the docstring as not covered, with the reason.
- **Every substitution is enumerated in the docstring**, and the list explicitly includes the
  `../public-api` import (§ 1.2) and the component instance standing in for `this.` (§ 1.3).
  A blanket "self-contained" claim is how an unlisted substitution hides.
- Where a block was a genuine fragment, the fix went into the **README**, and the step summary
  says which blocks moved and why.
- **Confirmed load-bearing**: change one printed value in the README and observe the paired case
  fail.
- **The one-program condition is demonstrated, not asserted**: show that splitting the Quick
  start pair behind a resetting fixture makes a wrong document pass. One paragraph in the step
  summary; this is the trap Phase 4 fell into and the reason the condition is in § 1.3.
- `nx run-many -t lint test` green.

### Step 4 — `eval-core`: decide gateable, then build or drop

**Files**: `modules/eval-core/README.md` and/or `README.md` if completion is chosen; a spec if
the gate survives; the step summary either way.

Decide **first**, and in writing, whether `eval-core`'s READMEs can be gated without inventing
preamble. The evidence against is that both are written as fragments — `private service:
EvalService;` followed by `...` — and that the two Phase 1 defects were exactly that shape.

**F4's drop rule applies without apology: if it fights, drop it and report the reason.** A
harness built to prop up an ungateable document is the failure mode this whole track exists to
avoid, and dropping here is a legitimate exit, not a failed step.

**Exit criteria**
- The decision is recorded with its evidence, before any spec exists.
- **If gated**: the criteria of step 3 apply unchanged, and any block completed in the README is
  named. If completion touched the fragments' prevailing style, the step summary says how far it
  went and what it left.
- **If dropped**: `docs/backlog.md` F4 records that `eval-core` was assessed and dropped, with
  the reason, and F4 is re-scoped to `eval-signals` only rather than left implying pending work.
  This is a complete step.
- If step 4 edited a README, step 2's case list is re-read and updated (§ 1.5).
- `nx run-many -t lint test` green.

### Step 5 — The worker warning, `applyErrorPolicy`'s block, and the retrospect

**Files**: whatever F7 turns out to touch; `modules/eval-forms/README.md` and its
`readme-examples.spec.ts` for D10; `docs/backlog.md`.

**F7 is timeboxed to this step and no further.** Start with
`nx test eval-core --detectOpenHandles`. If the handle is identified and closing it is contained,
close it. **If it is not identified within the step, stop**, write what was ruled out into F7,
and leave it open — an open-handle hunt is exactly the kind of work that consumes a session and
produces a diff nobody can evaluate.

D10 adds a runnable `applyErrorPolicy` block to `eval-forms`' README and a case for it in the
spec that already gates that file.

**Exit criteria**
- F7 is either fixed with the cause named, or updated with what was eliminated and left open.
  Both are passes; a silent third session on it is not.
- `applyErrorPolicy` has a runnable README block and a case in
  `reactive/src/lib/readme-examples.spec.ts`, and step 2's drift gate covers any symbol that
  block imports.
- Every entry this track touched is updated in `docs/backlog.md` — Retired with a reason, or
  re-scoped — in the same commit as the change.
- A retrospect for the track, as `docs/gates/summary.md`.
- `nx run-many -t lint test` green.

---

## 5. Public API surface added

**None, in any package.** No exported symbol, no manifest change, no version bump, no
`CHANGELOG.md` entry. Every file this track adds is a spec or a `project.json` block, and every
file it edits is a README, a spec or `docs/backlog.md`.

This is stated as a section rather than omitted because it is the property that makes the track
safe to run ahead of Phase 2, and a step that finds itself wanting to add an export has left the
plan.

---

## 6. Verification gates

Checked at every step, not only at the end.

| # | Gate | How |
| - | ---- | --- |
| 1 | No behavioural change to any package | `git diff` touches no file under `src/lib/` or `signals/`/`reactive/` **except** `*.spec.ts`. A non-spec source file in the diff is a stop-and-replan |
| 2 | No published surface moved | No diff in any `public-api.ts`, `index.ts` or `package.json` under `modules/` |
| 3 | Every new assertion is load-bearing | Each step names the inversion it ran and **which** case went red — per `CLAUDE.md`, reading which tests failed rather than that the suite did |
| 4 | No `eslint-disable`, no boundary exemption | `allow: []` stays empty in `eslint.config.mjs`; § 1.2's substitution is the sanctioned route, not a rule change |
| 5 | The drift gate is not quietly narrowed | Step 2's README list stays at four files; a later step removing one says so in its summary |
| 6 | Backlog entries move with the work | No step closes without its entries updated in `docs/backlog.md` |

Gate 1 is the important one and it is deliberately mechanical: this track's whole safety argument
is that it cannot regress a published package, and the way that stops being true is a step
"fixing something small while it is in there".

---

## 7. Risks

| # | Risk | Mitigation |
| - | ---- | ---------- |
| 1 | The drift gate false-fails on type-only exports and someone adds an exception list to silence it | § 3.1's helper, and step 2's exit criterion asserting `ExpressionRules` specifically — the case the naive implementation gets wrong |
| 2 | Step 3's spec passes on a program the README does not describe, because a fixture reset between blocks | Step 3's exit criterion demands the split be **demonstrated** to make a wrong document pass, not asserted to be avoided |
| 3 | An unlisted substitution hides in step 3 or 4 — the failure mode that shipped five documented defects | Docstring enumeration is an exit criterion, and § 1.2 and § 1.3 name the two substitutions already known, so a *third* one appearing unlisted is visible |
| 4 | F7 consumes step 5 and produces nothing | The timebox and the explicit "leave it open" pass. Accepted rather than solved: the warning has survived twelve summaries, so one bounded attempt failing is the expected case, not the bad one |
| 5 | Step 4 builds a harness for an ungateable document because dropping feels like failing | The drop is written into the exit criteria as a **complete step**, and F4 already licenses it in its own words |
| 6 | The compiler-API helper is slower than the suite tolerates | Not measured. It runs once per spec file, not per node, so `performance.spec.ts` is not the gate — but if step 2 finds it adds seconds, cache the program across the four checks rather than widening the budget |
| 7 | Step 2 gates four READMEs and a later phase adds a fifth without a case | **Unmitigated and stated.** Nothing detects a README that no gate reads. A sixth gate that enumerates READMEs would itself need maintaining; the honest answer is that this is a human step in `CONTRIBUTING.md`, and it is not in this plan's scope |

Risk 7 is the one an later reader should not mistake for an oversight: it is the same class as
F4's "nothing keeps the spec and the documents in step but a human", and inventing a gate over
the gates is where this stops paying.

---

## 8. Open questions

**8.1 — Should the drift gate live in one spec or one per package?** § 3.2 implies four checks;
they could be four `public-api.spec.ts` files sharing a helper, or one workspace-level spec.
Four files match F3's "a `public-api.spec.ts` beside `src/public-api.ts`" and give each package
a failure in its own suite; one file is less duplication. **Decide in step 2**, and note that a
workspace-level spec has no obvious project to live in, which probably settles it.

**8.2 — Does `.claude/skills/step/SKILL.md` retarget to this document?** It currently reads
`Plan document: docs/forms/phase-6-plan.md`, which is a closed phase. If this track is executed
with `/step`, that line points at the wrong file. Retargeting it is a one-line `chore` and is
**not** in any step's file list above, deliberately — it should be done before step 1 runs, or
the steps should be executed without the skill. Flagged rather than decided because it depends on
how the track is actually run.

**8.3 — Is `eval-core`'s README fragment style worth changing at all?** Step 4 decides gateable
or not, but if it decides "not", the underlying question stands: an injected-service opening is
load-bearing documentation in an Angular library, and the two Phase 1 defects were *in* that
style. Neither this plan nor F4 claims the style is wrong — only that it is not gateable as
written. If someone later wants both, that is a documentation rewrite with its own argument, not
a gate.
