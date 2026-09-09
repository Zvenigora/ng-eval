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
3. **`eval-signals`' README has a live defect the gate will catch on its first run** (§ 1.3) —
   found while re-deriving the soundness argument, and better evidence for the whole track than
   the argument it replaced.
4. **F3 is scoped to one package and there are now three** (§ 1.4) — the same under-scoping
   that F1 carried for two phases.
5. **F3 and F4 read the same files, and F3 scans rather than enumerates** (§ 1.5), which is what
   settles their order.

None of these changes the plan's shape. Three of them change a step's content, and one retires a
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

**Revision 2's own step 2 criterion reproduced this exact failure two sections later** — it
demanded that a symbol documented in only one `eval-core` README fail, which is unsatisfiable
today on eight symbols without the exception list this paragraph rejects (§ 3.2, and the
criterion is now restated). Fourth check in this project to catch its own author within a
session of being written.

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

### 1.3 `eval-signals`' README has a live defect, and finding it re-derived this section

[`modules/eval-signals/README.md`](../../modules/eval-signals/README.md) has **9** `ts` blocks
(plus two `sh`) and exactly **one** `import` from the package across the whole file, at line 26.

**Revision 2 argued the wrong thing here, and the correction is the finding.** It said the
one-program condition was mandatory because the Quick start's second block reads `this.total()`
against the class the first block declares. That is a **declaration** dependency, and it does not
fail the way the condition is about: split that pair behind a resetting fixture and it does not go
green on a wrong document, it fails to run at all, because `this.total` does not exist. The Phase 4
precedent it invoked is a **state** dependency — a later block's printed value falsified by an
earlier block's mutation. Two different failures; only the second is what a resetting fixture
hides.

**The file does contain a state dependency, and under the one-program reading the README is
wrong.** The Quick start sets `quantity` to 4:

```ts
this.total();              // 30
this.quantity.set(4);
this.total();              // 40  — recomputed
```

and `## Dependency introspection` at [:102](../../modules/eval-signals/README.md#L102) then prints

```ts
const total = createEvalSignal('price * quantity', { price, quantity, shipping },
  { trackDependencies: true });

total();                  // 30
```

against bare `price` / `quantity` / `shipping` that **the document never declares**. Bind them to
the Quick start's fields and `price * quantity` is 40, not 30 — the printed value is wrong. Treat
them as a fresh start and it is right, but that concedes a per-block reset on exactly the axis the
one-program condition governs.

**This is better evidence for the whole track than the argument it replaced.** It is a real
documented value that is wrong under a defensible reading, in a shipped README, found by reading
the file rather than by running anything — which is the fifth instance of the review practice
F4 exists to replace, and the first one caught before it shipped rather than a phase later.

**Step 3 should expect to fix it, not discover it.** The fix is a document edit under § 1.5's rule
— give the `Dependency introspection` block its own declarations, which is what the surrounding
blocks (`Options`, `Contexts that are not signal-backed`, `Lifetime`, `Writes`, `Async`) already
do — and it turns an ambiguous block into a genuine fresh start the gate can split on. Step 3's
criteria are written for that outcome rather than for a discovery.

**Two costs survive the re-derivation:**

- **The spec must supply a component instance and rewrite `this.` to it**, plus a real
  `@Component` decorator argument where the README elides one as `{ /* … */ }`. That is a
  substitution of exactly the kind F3's "considered and rejected" section warns about, and the
  established answer applies: enumerate it in the docstring.
- **The Quick start pair is one program and must stay one case.** The declaration dependency is
  real even though it is not the dangerous kind, and splitting it would need invented preamble.

`eval-signals` is still the easier package — its blocks are whole units and its narrative is
linear — but "already in the shape the gate wants" overstates it by one preamble and one defect.

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

**F3 scans; it does not enumerate.** Settled here because revision 2 held both readings at once
and its ordering argument rested on the wrong one. Step 2 derives its identifiers from the README
text at run time (§ 3.2), so a README edited in step 3 or 4 is re-scanned on the next test run
and there is **no case list to re-read**. Revision 2 claimed the re-read as the cost of ordering
F3 first and gave step 4 a criterion for it; both are wrong and both are gone.

That removes the argument *against* F3 first, and the argument *for* F3 second survives intact
and alone: **F3 is the larger unknown (§ 1.1), and finding it unbuildable after two F4 steps
would be finding it late.** § 4 puts it second — after the config step, before both F4 steps —
on that ground only.

One real interaction remains, and it runs the other way: steps 3 and 4 may **add** import lines
to a README when they complete a fragment (§ 1.3's `Dependency introspection` fix is exactly
this), which gives step 2's scan new identifiers to resolve. That needs no action — a scan sees
them — but it does shape how step 2 proves its scan is not silently empty (§ 4 step 2, criterion
3). The proof is a **floor per file**: each README's scanned set is non-empty and contains one
named symbol known to be there. A floor survives a later step adding an import; an exact expected
count would not, and would train people to bump a number, which is § 3.2's stated reason for
rejecting a block count.

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
  an existing spec rather than creating anything. `eval-forms` has **two** README-execution specs
  (`reactive/` and `signals/`); this goes in `reactive/`'s, for the reason step 5 gives.

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

- **The two `eval-core` READMEs are compared against each other *and* against the export list**,
  which is the published/unpublished check F3 exists for and the only place it applies (§ 1.4 —
  the root README imports nothing else). **This is a three-way relation, not a set difference**,
  and the distinction is what makes it satisfiable. F3's motivating case was `trackTime`: a
  symbol that **is exported**, documented in the root README, and **absent from the package
  README** — so the consumer who installs the package cannot read about a symbol they have. The
  claim is therefore "*exported* and documented only in the unpublished README", not "documented
  in only one of the two".

  A plain set difference is unsatisfiable today. Measured: the root README imports 7 symbols
  (`ParserService`, `EvalService`, `CompilerService`, `DiscoveryService`, `EvalContext`,
  `EvalScope`, `EvalScopeOptions`) and `modules/eval-core/README.md` imports 5 (`EvalService`,
  `CompilerService`, `createTimingHook`, `ASYNC_HOOK_MESSAGE`, `EvalHooks`) — a symmetric
  difference of **eight**. Requiring all eight to fail would mean an exception list holding
  eight entries on day one, which is § 1.1's rejected shape.

  The five root-only symbols are the ones the real check is about, and step 2 dispositions each:
  a symbol that is exported and documented only in the root is a **finding**, and the fix is a
  package-README edit, not an exception.
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
  and **emit coverage** — `coverage/modules/<project>/` is written where it was not before.

  > **Corrected during execution.** This criterion originally read "the command errored before
  > this step and does not after". **It does not error.** Measured with the config stashed and
  > `--skip-nx-cache`: `nx test eval-signals --configuration=ci` exits 0, runs the suite, and
  > silently produces no coverage — Nx ignores an unknown configuration rather than rejecting it.
  > So the discriminator is coverage emitted, not exit status, and F1's own "that command does
  > not exist" understated the gap: the failure was **silent**, not loud. See [F1](../backlog.md#f1).
- The three baseline coverage numbers are in the step summary.
- F1's entry records the threshold decision and its ground, and is marked Retired if nothing is
  left open.
- `nx run-many -t lint test` green.

### Step 2 — The export-list helper and the drift gate

**Files**: a new `public-api.spec.ts` beside each package's public API per § 3.2, plus a shared
helper for the export list and the README scan.

Build the § 3.1 helper **first**, with its own cases: a known value export, a known
`export interface`, a symbol reachable only through **a multi-hop barrel chain**, and a name that
is not exported at all. Only then scan the READMEs.

**Exit criteria**
- The helper returns type-only exports. Asserted directly on `ExpressionRules`
  (`export interface`, § 1.1) — this is the case the naive implementation fails, so it is the
  case that proves the helper is not the naive implementation.
- **The helper follows the barrel graph**, asserted on `EvalService`, which is **three hops**
  from `modules/eval-core/src/public-api.ts`: `./lib/actual/services` → its `index.ts`
  (`export * from './public-api'`) → `services/public-api.ts`
  (`export { EvalService } from './eval.service'`) → the declaration. Verified 2026-09-07.
  `ExpressionRules` does **not** cover this — it is one hop from
  `modules/eval-forms/signals/src/public-api.ts` (`export * from './lib/rules'`), so a
  single-file parser passes the type-only criterion above and still fails here. This is § 3.1's
  one stated cost, and without this criterion nothing gates it.

  > **Amended during execution — the hop counts differ by where the graph is rooted, and both
  > numbers here are right.** Counting **edges**, three is correct from `src/public-api.ts`, as
  > written. The gate roots the graph at **what the specifier resolves to** instead:
  > `tsconfig.base.json` maps `@zvenigora/ng-eval-core` to `modules/eval-core/src/index.ts`,
  > which is `export * from './public-api'` — one hop further out, making `EvalService`
  > **four** (five files). The reason to root it there rather than at the barrel is that the
  > gate's claim is about what a consumer's import reaches, and the consumer writes the
  > specifier.
  >
  > The shipped assertion uses `CacheType`, which is at the **same** depth — four edges,
  > `index.ts` → `public-api.ts` → `internal/interfaces/index.ts` → its `public-api.ts` →
  > `cache-type.ts` — and is type-only with it, so one case carries both properties;
  > `EvalService` is asserted beside it. The two chains are structurally identical, so neither
  > is "the deeper one". Count edges, not files, and say which when writing a number down: a
  > reader who finds three, four and five in this document without this note will assume two of
  > them are stale.
- Every identifier imported from a `@zvenigora/…` specifier in all four READMEs resolves against
  that specifier's export list. `eval-forms` is checked per entry point.
- **The scan is not silently empty — a floor per file** (§ 1.5). Each of the four READMEs yields
  a non-empty identifier set containing one named symbol known to be there: root and
  `eval-core` → `EvalService`, `eval-signals` → `createEvalSignal`, `eval-forms` →
  `bindFieldProperties` for `/reactive` and `createExpressionRules` for `/signals`. A floor, not
  an expected count, so a later step adding an import does not turn it red.
- **Confirmed load-bearing, four arms — one per README × specifier pair.** Rename an exported
  symbol used by each of: the root README, `eval-core`'s, `eval-signals`', and each `eval-forms`
  entry point. Each rename must produce a named failure pointing at *that* README and line.
  **One arm is not enough**: a scanner that silently returns `[]` for three of the four goes red
  exactly where it works and stays green everywhere it does not. Report which case went red for
  each arm, not that the suite did.
- **Each rename is reverted before the step's diff is taken.** A rename touches a non-spec file
  under `src/lib/` and a `public-api.ts`, which § 6 gates 1 and 2 call a stop-and-replan. The
  probe is legitimate; leaving it in the diff is not.
- **The published/unpublished check is the three-way relation of § 3.2**, not a set difference:
  a symbol that **is exported**, is documented in the root `README.md`, and is **absent from
  `modules/eval-core/README.md`** fails. Measured today that is five symbols — `ParserService`,
  `DiscoveryService`, `EvalContext`, `EvalScope`, `EvalScopeOptions` — each of which must be
  dispositioned in the step: documented in the package README, or recorded with a reason. A
  symmetric-difference assertion is **not** acceptable; it needs an eight-entry exception list
  on day one, which is § 1.1's rejected shape.
- **The helper's wall-clock cost is recorded in the step summary** — one number, so risk 6's
  "cache the program if it adds seconds" becomes actionable rather than aspirational.
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
- **All 9 ` ```ts ` blocks** are accounted for — executed with their printed values asserted as
  printed, or named in the docstring as not covered with the reason. The count is stated so
  "asserted over the empty set" is not available: `modules/eval-signals/README.md` has 9 `ts`
  blocks and 2 `sh` blocks, measured 2026-09-07, and the `sh` blocks are install and link
  commands that are not covered.
- **§ 1.3's `Dependency introspection` defect is fixed in the README**, not worked around in the
  spec: the block at `:102` gains its own `price` / `quantity` / `shipping` declarations, so its
  printed `// 30` is true and the block becomes a genuine fresh start the gate can split on.
  Step 3 **expects** this rather than discovering it.
- **Every substitution is enumerated in the docstring**, and the list explicitly includes the
  `../public-api` import (§ 1.2) and the component instance standing in for `this.` (§ 1.3).
  A blanket "self-contained" claim is how an unlisted substitution hides.
- Where any other block was a genuine fragment, the fix went into the **README**, and the step
  summary says which blocks moved and why.
- **Confirmed load-bearing**: change one printed value in the README and observe the paired case
  fail — named, not "the suite went red".
- **The one-program condition is demonstrated on the block that can falsify it.** Restore the
  `Dependency introspection` block to its bare identifiers, bind them to the Quick start's
  fields, and show that a per-block resetting fixture reports green on the wrong `// 30` while
  the one-program arrangement reports red. That is the Phase 4 trap reproduced on this file. The
  Quick start pair is **not** the subject: splitting it fails to run rather than passing wrongly,
  which is a declaration dependency and not the condition's business (§ 1.3).
- `nx run-many -t lint test` green.

### Step 4 — `eval-core`: decide gateable, then build or drop

**Files**: `modules/eval-core/README.md` and/or `README.md` if completion is chosen; a spec if
the gate survives; the step summary either way.

Decide **first**, and in writing, whether `eval-core`'s READMEs can be gated without inventing
preamble. The evidence against is that both are written as fragments — `private service:
EvalService;` followed by `...` — and that the two Phase 1 defects were exactly that shape.

**Both files fence their code as ` ```javascript `, not ` ```ts `.** Measured 2026-09-07: the
root `README.md` has 11 `javascript` blocks and one `json`; `modules/eval-core/README.md` has 11
`javascript` blocks — 8 when this plan was written, plus the **three** step 2 added when it
dispositioned the five root-only symbols into that file (§ 4 step 2, and `step-2-summary.md`
§ 4). The added blocks are in the file's prevailing fragment style, so they change the inventory
without changing the question. **Neither contains a single ` ```ts ` fence** — `eval-signals` and
`eval-forms` use `ts`, which is why revision 2's criteria, written against those two, said "the
runnable `ts` blocks" and would have selected nothing here.

**Record what the wrong answer would have cost, because it is not the miss itself.** A spec
scanning for `ts` finds zero blocks in both files, and zero blocks reads as *the document is
ungateable* — which is the exact conclusion this step exists to reach honestly. The drop decision
below would have been made on evidence about a **fence tag** while appearing to be evidence about
the fragment style, and the step would have reported "assessed and dropped" with a reason that was
not the real one. A wrong drop here is quiet: F4 gets re-scoped, `eval-core`'s READMEs stay
ungated, and the five defects that motivated the whole track keep their least-covered document.

**F4's drop rule applies without apology: if it fights, drop it and report the reason.** A
harness built to prop up an ungateable document is the failure mode this whole track exists to
avoid, and dropping here is a legitimate exit, not a failed step.

> **Amended during execution — the verdict is per file, not per step.** This section and its
> criteria were written as one decision covering both READMEs. Measured, the two files fail
> differently, and forcing one verdict would have meant fitting the answer to the form:
>
> - **Root `README.md`: 0 of 11 blocks runnable as printed**, 9 of them not even *parsing* — a
>   bare `...` line and `private service: EvalService;` outside a class body. Gating it means
>   rewriting the opening style of **9 of 11 blocks**, which is the whole-file documentation
>   rewrite § 8.3 defers to its own argument; 2 of those 9 additionally carry interior `...`
>   elisions standing in for prose, which cannot be completed without deleting what the document
>   prints. **Dropped.**
> - **`modules/eval-core/README.md`: 8 of 12 parse**, needing only a `service`, `state` or
>   `context` binding the document already implies — which is step 3's completability test,
>   passed. Of its 4 exceptions, **3 were introduced by step 2 itself**. **Gated.**
>
> **Neither count is this document's to own.** An earlier draft of this amendment said "7 of
> 11", written before the re-count found the **indented** `EvalHooks` fence that a `^```` scan
> skips — the same error, in the same session that diagnosed it. The owner is
> [`step-4-summary.md`](step-4-summary.md) § 1: cite it rather than copying these numbers again.
>
> So "If gated" and "If dropped" below both apply, each to its own file, and F4 re-scopes to
> three states rather than two: `eval-signals` gated (step 3), `eval-core`'s package README gated
> (step 4), root README **assessed and dropped** with the fragment reason. The root is a
> decision, not an omission, and F4 must not read as though it were still pending there.
>
> **The measurement that produced this split also caught an error in step 2**, and criterion 1's
> "re-count rather than quoting this line" is what caught it — see `step-4-summary.md` § 2 and
> the correction added to `step-2-summary.md` § 4.

**Exit criteria**
- **The block inventory is stated before the decision**: the count of `javascript` blocks per
  file and how many of each are runnable as printed. The decision must cite those numbers, so
  "ungateable" is a claim about fragments rather than about a fence tag. **Re-count rather than
  quoting this line** — and this line no longer carries numbers to quote, which is the fix this
  criterion earned twice: it once read "11 and 11 as of step 2 — 11 and 8 when this plan was
  written", and **both** of those package-README figures were one short of the indented fence.
  The measured inventory has exactly one owner, [`step-4-summary.md`](step-4-summary.md) § 1.
- The decision is recorded with its evidence, before any spec exists.
- **If gated**: step 3's criteria apply with `javascript` substituted for `ts` throughout, and
  the per-file block count is non-zero and stated. Any block completed in the README is named,
  and if completion touched the fragments' prevailing style the summary says how far it went and
  what it left.
- **If dropped**: `docs/backlog.md` F4 records that the dropped file was assessed and dropped,
  with the reason — which must be about the fragments, since the fence tag is settled above — and
  F4 is re-scoped so nothing in it implies pending work there. This is a complete step.

  > **As executed**: the root `README.md` is the dropped file, and F4 re-scopes to the three
  > states in the amendment above — not to "`eval-signals` only", which the original wording
  > anticipated and which would have erased the package README's gate along with the root's
  > decision.
- `nx run-many -t lint test` green.

### Step 5 — The worker warning, `applyErrorPolicy`'s block, and the retrospect

**Files**: whatever F7 turns out to touch; `modules/eval-forms/README.md` and its
`readme-examples.spec.ts` for D10; `docs/backlog.md`.

**F7 is timeboxed to this step and no further.** ~~Start with
`nx test eval-core --detectOpenHandles`.~~ If the handle is identified and closing it is
contained, close it. **If it is not identified within the step, stop**, write what was ruled out
into F7, and leave it open — an open-handle hunt is exactly the kind of work that consumes a
session and produces a diff nobody can evaluate.

> **Amended 2026-09-09, before step 5 opened: the starting command is aimed at a run that does
> not exhibit the symptom.** Measured on this tree — every command with `--skip-nx-cache` —
> `nx test eval-core` warns **zero** times, as do `eval-signals` and `eval-forms` run alone;
> the warning appeared **twice in about a dozen runs**, only under multi-target
> `nx run-many`, and did not recur on the same command three times after, or under deliberate
> concurrent load. `--detectOpenHandles` on a quiet run reports nothing, so that box would be
> spent proving the absence of a leak nothing points to.
>
> **F7's locus is corrected in [`docs/backlog.md`](../backlog.md#f7)**, which now carries the
> table: the entry's "confined to `eval-core` — confirmed by running each project separately"
> does not hold, and the symptom's shape — intermittent, only under parallel task execution —
> makes it a **Jest-worker-teardown-under-contention** question, which may be no package's
> defect at all rather than a library bug.
>
> **So step 5 should not spend its box hunting a handle.** The entry's own "leave it open" pass
> is already satisfied by those measurements — they are what was ruled out. What F7 needs next
> is a **reproduction**, captured with `--output-style=stream` so the emitting task is
> attributed; without one there is no locus to investigate. Step 5's F7 exit criterion is met by
> recording that, and its time is better spent on D10 and the retrospect.

D10 adds a runnable `applyErrorPolicy` block to `eval-forms`' README and a case for it in
**`reactive/src/lib/readme-examples.spec.ts`** — there are two such specs in that package, and
this is the one, because it already covers the shared core's two `Coercion` blocks and already
imports `@zvenigora/ng-eval-forms` through the published specifier. `applyErrorPolicy` is core
surface, so it belongs beside them rather than under `signals/`.

**Exit criteria**
- F7 is either fixed with the cause named, or updated with what was eliminated and left open.
  Both are passes; a silent third session on it is not.
- `applyErrorPolicy` has a runnable README block and a case in
  `reactive/src/lib/readme-examples.spec.ts`, and step 2's drift gate covers any symbol that
  block imports.
- **F7 and D10's entries are updated in `docs/backlog.md` in the same commit**, and F1, F3 and
  F4 are **confirmed** already updated by their own steps (§ 6 gate 6 is what enforces that
  per-step; this criterion only checks none was missed).
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
| 3 | An unlisted substitution hides in step 3 or 4 — the failure mode that shipped five documented defects | **Accepted, not gated.** The mitigation is a docstring, which is a *deliverable* judged by the author who would be the one omitting the entry — nothing goes red when the risk occurs. That is § 0.2.1's headline case and it is marked rather than dressed up. The ground for accepting: this is F4's own limitation ("nothing keeps the spec and the documents in step but a human", § 3.3), the two known substitutions are named in § 1.2 and § 1.3 so a third is at least *visible* to a reader, and the alternative — counting the spec's non-README declarations — gates arithmetic rather than honesty |
| 4 | F7 consumes step 5 and produces nothing | The timebox and the explicit "leave it open" pass. Accepted rather than solved: the warning has survived twelve summaries, so one bounded attempt failing is the expected case, not the bad one |
| 5 | Step 4 builds a harness for an ungateable document because dropping feels like failing | **Accepted, not gated.** Step 4's criteria pass in both branches by construction, so nothing goes red when the risk occurs — the drop being written in as a *complete step* is a permission, not a detector. It is a judgement call and saying so is the honest form. What narrows it is step 4's new block-inventory criterion: the decision must cite the per-file `javascript` block counts, so a drop has to argue about fragments with numbers on the table rather than in the abstract |
| 6 | The compiler-API helper is slower than the suite tolerates | **Gated as of revision 3.** Step 2 records the helper's wall-clock cost in its summary — one number, which is a mechanism question answerable by building the smallest thing rather than deferred. It runs once per spec file, not per node, so `performance.spec.ts` is not the gate; if the number is seconds, cache the program across the four checks rather than widening the budget |
| 7 | Step 2 gates four READMEs and a later phase adds a fifth without a case | **Refused, not unfilled.** Nothing detects a fifth README that no gate reads, and a gate over the gates is where this stops paying. See below — this cell is a decision, and a later revision should not treat it as an empty slot to complete |

**Risk 7's cell is a stated refusal and the wording is deliberate.** A blank or vague
mitigation invites the next reader to fill it; a refusal with a reason does not. The reason is
that the mitigation would be a sixth gate whose only job is enumerating the files the other
gates read — which then needs its own maintenance, its own case when someone adds a seventh
README, and its own answer to "what watches *it*". That regress is real and it terminates
nowhere useful.

This is the same class as F4's own "nothing keeps the spec and the documents in step but a
human", and it gets the same answer: the limit is named in the docstring and in
[`docs/backlog.md`](../backlog.md), and a human owns it. **Neither this plan nor a later
revision should convert this row into a gate** without an argument that the regress stops
somewhere — which is a higher bar than "it would be nice to catch".

**Three rows are accepted or refused, and five name something that goes red.** Gated: 1
(step 2's `ExpressionRules` criterion), 2 (step 3's demonstration on the `Dependency
introspection` block), 6 (step 2's wall-clock number), plus 3 and 5's partial narrowings noted
in their cells. Accepted or refused on their face: 3, 4, 5 and 7. **Revision 2 had rows 3, 5 and
6 asserting mitigations that were a deliverable, a permission and a deferral** — § 0.2.1's
headline case, three times in one table, which is the same count Phase 6's plan hit before its
own audit ran to completion. A later revision must not quietly convert an accepted row into a
cross-reference; the four above say what they are on their face, and that is the property to
preserve.

---

## 8. Open questions

**8.1 — Should the drift gate live in one spec or one per package? Settled in step 2: four
gate specs, and the helper triplicated — one copy per project.** § 3.2 implies four checks;
they could be four `public-api.spec.ts` files sharing a helper, or one workspace-level spec.
Four files match F3's "a `public-api.spec.ts` beside `src/public-api.ts`" and give each package
a failure in its own suite; one file is less duplication. A workspace-level spec has no obvious
project to live in — and, measured, no runnable one: the root `jest.config.ts` is
`getJestProjectsAsync()`, so a spec outside a project is executed by no `nx test` target at all.

What the question did not anticipate is that **"sharing a helper" is not available either**.
`@nx/enforce-module-boundaries` runs with `allow: []`, so a spec in one project cannot import a
helper out of another by alias or relatively (§ 1.2's measurement, one layer over), and § 6
gate 4 forbids loosening the rule for a spec. The helper must also itself be a `*.spec.ts`, since
§ 6 gate 1 admits no other file kind. So the shape is: **three copies of the helper, one per
project, each carrying its own § 3.1 probes; four gate specs importing their project's copy**
(`eval-forms`' two entry-point gates share that package's one copy).

The triplication is deliberate and it is recorded in each copy's docstring along with **what
retires it** — a shared spec-utilities location the boundary rule permits. No such location
exists in this workspace, and building one is not this track's to do. A later reader who wants
to de-duplicate should build that, not add a boundary exemption.

One consequence worth knowing before reading a failure report: a gate spec importing its
helper spec **re-registers the helper's own cases in the importing file**, so a broken reader is
reported once per file that imports it. That is duplication in the output, not in the check.

**What would retire this decision on evidence is a measured number, and it is recorded**:
`step-2-summary.md` § 3.1. Jest builds the compiler program once per *importing test file*, which
is eight as of step 5 — seven at step 2, plus `eval-forms`' third entry-point gate — and scales
with the copies rather than with the packages, so the ~8 s the gates
add to a `run-many` is the triplication's cost expressed in seconds. If that figure grows, the
move is to build the shared spec-utilities location named above and read the export lists once,
not to optimise the reader.

**8.2 — `.claude/skills/step/SKILL.md`. Settled before step 1: retargeted, as a standalone
`chore` outside every step's file list.** Kept here because what it turned out to be is a
finding about this track rather than a bookkeeping note.

It was expected to be the one-line `Plan document:` change the last two phases needed. It was
not. Phases 3, 4 and 6 each named **one** library as the work area and made reaching into
another a stop-and-replan; that rule is wrong here, because steps 2, 3 and 4 add specs to
`eval-core` and `eval-signals` and step 1 edits two `project.json` files. A one-line retarget
would have handed step 3 a stop-and-replan condition on its own file list.

The scope rule in the skill is therefore about the **kind of file**, not the project: all three
libraries are work areas, and only specs, `project.json`, READMEs and `docs/` may move — § 6
gates 1 and 2, restated where a step actually reads them. Two verification blocks went with it:
the "`eval-core` and `eval-signals` rows are the regression gate" sentence, false once both are
work areas, and Phase 6's two `/signals` build checks, which have nothing to check here.

**The general point, for whoever writes the next plan**: the step skill encodes the *previous*
phase's scope shape, not just its filename. A track whose scope shape differs inherits a rule
that will fire on its own first step.

**8.3 — Is `eval-core`'s README fragment style worth changing at all?** Step 4 decides gateable
or not, but if it decides "not", the underlying question stands: an injected-service opening is
load-bearing documentation in an Angular library, and the two Phase 1 defects were *in* that
style. Neither this plan nor F4 claims the style is wrong — only that it is not gateable as
written. If someone later wants both, that is a documentation rewrite with its own argument, not
a gate.

**8.4 — Should step 2's machinery also check *document* cross-references?** Step 2 scans markdown
for `import { … } from '<specifier>'` and resolves each name. Resolving `](path#anchor)` against
the filesystem and against the target's anchors is the same shape of scan over the same files,
and [`docs/backlog.md`](../backlog.md)'s preamble now records the evidence for wanting it: the
commit that created that register shipped two links to a section it had not written — in the
commit arguing that dangling cross-references are how [A8](../backlog.md#a8) hid for five phases.

Two things make this a question rather than a sixth step. It is a **different gate** — nothing to
do with the public API surface F3 exists to guard — so folding it into `public-api.spec.ts` would
put two unrelated claims behind one name. And its natural scope is `docs/` plus the four READMEs,
wider than anything else here. **Decide in step 2**, once the scan helper exists and its cost is
known. If it is deferred, it goes into `docs/backlog.md` as its own entry rather than staying a
paragraph in a plan — which is the failure the register was built to stop.

**Settled in step 2: deferred, and recorded as [F9](../backlog.md#f9).** The two reasons above
both survived contact with the helper, and building it added a third. The machinery does not
transfer as cleanly as the shape suggests: the export-list reader — the part that was the
unknown — is no help at all to a link checker, which needs only `fs` and a heading-to-anchor
slugifier. What would be shared is the markdown regex scan, which is nine lines. So the "same
shape of scan over the same files" argument buys almost nothing, while the scope difference
(`docs/` is 20+ files against four READMEs) and the two-claims-behind-one-name objection are
unchanged. Deferring it costs a future session the nine lines and no more.

The cost side is now measured rather than assumed: one cold export-list read is 344 ms for
`eval-core` and 210–235 ms for each of the other four entries (§ 4 step 2's wall-clock
criterion), so the four gates are well under a second in total and a fifth check would not have
been blocked on cost. It is deferred on scope and on what it claims, not on speed.
