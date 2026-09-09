# Track 3, step 2 — the export-list helper and the drift gate

Executed 2026-09-07 against [`docs/gates/plan.md`](plan.md) § 4 step 2. Covers
[`docs/backlog.md`](../backlog.md) [F3](../backlog.md#f3), now retired, and opens
[F9](../backlog.md#f9).

## 1. What changed

| File | Change |
| ---- | ------ |
| `modules/eval-core/src/export-list.spec.ts` | **new** — the § 3.1 reader and the README scanner, with their own probes |
| `modules/eval-signals/src/export-list.spec.ts` | **new** — this project's copy of the same |
| `modules/eval-forms/src/export-list.spec.ts` | **new** — this project's copy, shared by both entry-point gates |
| `modules/eval-core/src/public-api.spec.ts` | **new** — the gate for `@zvenigora/ng-eval-core`, over both READMEs, including the three-way published/unpublished relation |
| `modules/eval-signals/src/public-api.spec.ts` | **new** — the gate for `@zvenigora/ng-eval-signals` |
| `modules/eval-forms/reactive/src/public-api.spec.ts` | **new** — the gate for `/reactive` |
| `modules/eval-forms/signals/src/public-api.spec.ts` | **new** — the gate for `/signals`, where the type-only case bites |
| `modules/eval-core/README.md` | the five root-only symbols documented — the gate's first finding, fixed rather than excepted |
| `docs/backlog.md` | F3 retired with what shipped and its two limits; F9 opened for § 8.4 |
| `docs/gates/plan.md` | § 8.1 and § 8.4 settled; the hop-count criterion amended; step 4's block inventory corrected |

## 2. The shape, and the constraint that produced it (§ 8.1)

**Four gate specs, and the helper triplicated — one copy per project.** The question offered
"four files sharing a helper" or "one workspace-level spec". Neither is available as written:

- A workspace-level spec has no project to live in, and — measured — no runner: the root
  `jest.config.ts` is `getJestProjectsAsync()`, so a spec outside a project is executed by no
  `nx test` target at all. It would be a gate that runs nowhere.
- **Sharing a helper is blocked too**, which § 8.1 did not anticipate. `allow: []` on
  `@nx/enforce-module-boundaries` means no spec may import a helper out of another project, by
  alias or relatively — § 1.2's measurement one layer over — and § 6 gate 4 forbids relaxing it
  for a spec. The helper must additionally *be* a `*.spec.ts`, since § 6 gate 1 admits no other
  file kind under `src/`.

So: three helper copies, each carrying its own § 3.1 probes, and four gate specs importing their
own project's copy (`eval-forms`' two entry points share that package's one copy). **The
triplication is deliberate, and what retires it is recorded in all three docstrings**: a shared
spec-utilities location the boundary rule permits, which does not exist here and is not this
track's to build. A later reader wanting to de-duplicate should build that, not add an exemption.

One reporting consequence: importing a helper spec re-registers its cases in the importing file,
so a broken reader is reported once per importing file. Duplication in the output, not in the
check — visible in § 5's arms C and D below.

## 3. The reader (§ 3.1), and its own probes

`ts.createProgram` over the file each specifier resolves to in `tsconfig.base.json`, then
`checker.getExportsOfModule`. It **throws** on every "nothing to read" path it can detect —
missing file, file not in the program, module exporting nothing. That is the point of the reader
having probes of its own: a reader that silently returned `[]` would pass every three-way check
and every unresolved-import check trivially, and the four scan arms below would not reach it.

Asserted directly, per project:

| Property | `eval-core` copy | `eval-signals` copy | `eval-forms` copy |
| --- | --- | --- | --- |
| value export | `EvalService` | `createSignalContext` | `applyErrorPolicy` |
| type-only export | `QueueType` (`export interface`), `RecursiveVisitorState` (`export type`) | `EvalSignalOptions`, `SignalContextSource` | **`ExpressionRules`** — § 1.1's named case |
| multi-hop barrel | `CacheType` and `EvalService`, both 4 edges | `createEvalSignal`, `SignalContextWriteError`, both 2 | `ExpressionErrorPolicy` (2, and type-only with it), `bindFieldProperties` (1) |
| in the program but **not** exported | `getDefaultVisitors` (`internal/visitors`, never barrelled) | `warnOnNestedSignals` | `EvalContext`, `evaluateRule` |
| not exported anywhere | `NotAnExportedSymbol` absent | same | same |
| not silently empty | 74 exports | 7 | 5 / 5 / 4 per entry point |
| throws, not `[]` | missing path; path the program will not load; **unresolved re-export** | same | same |
| mirrors `tsconfig.base.json` `paths` | asserted | asserted | asserted |

**On the hop counts** (§ 4 step 2's criterion, amended in the plan): counting **edges**, three is
correct from `src/public-api.ts` as the plan wrote it; the gate roots the graph at what the
*specifier* resolves to — `src/index.ts` — because the gate's claim is about what a consumer's
import reaches, so `EvalService` is four. `CacheType` is at the **same** depth through a
structurally identical chain, and is type-only with it, which is why it is the criterion's
symbol; `EvalService` is asserted beside it. An earlier draft of this summary and of the plan's
amendment called `CacheType` five, which was a file count read as an edge count.

**Two hardening changes came out of the review**, both closing a way for a shipped assertion to
be weaker than it reads:

- **The "not exported" probe was vacuous.** `NotAnExportedSymbol` exists nowhere in the
  workspace, so the case passed for a reader that returns exports, for one that returns every
  declaration in the program, and for one that returns `[]`. It now asserts on a symbol that is
  *in* the program and deliberately not on the barrel — `getDefaultVisitors`, which
  `src/public-api.ts` withholds by not re-exporting `internal/visitors`.
- **The reader could return a silently *incomplete* set.** An `export *` whose target does not
  resolve drops that branch's names, leaves the set non-empty, and would make the three-way
  check pass falsely on anything that vanished. The reader now walks the program's export
  declarations and throws, naming the file and the specifier. Probed — see arm F.

**Wall-clock (risk 6).** One cold read of the reader: **344 ms** for `eval-core`'s entry,
**212 ms** (`eval-signals`), **213 ms** (`eval-forms`), **228 ms** (`/reactive`), **233 ms**
(`/signals`); warm reads are 0.00 ms against the per-path cache. Measured with
`performance.now()` around `createProgram` + `getExportsOfModule`, on a throwaway spec deleted
before the diff.

**What a reader will actually observe is larger than those numbers**, and it is worth stating
because the per-path cache does not do what its presence suggests: Jest gives each test file its
own module registry, so the cache does not survive across files and each importing file rebuilds
the programs it needs — three times over for `eval-forms`. Measured, running only these files
with `--skip-nx-cache`: **3.21 s** for `eval-core`'s two (30 cases), **2.17 s** for
`eval-signals`' two (24), **3.05 s** for `eval-forms`' three (43) — roughly 8 s added across a
`run-many` that takes about a minute. Risk 6's trigger — "if the number is seconds,
cache the program across the four checks" — is about the reader's own cost, which is
sub-second; the cross-file rebuild is a Jest property that a wider cache inside the helper cannot
reach.

### 3.1 That 8 s is the retirement condition for § 8.1's triplication, not just a cost

Written down here while the reasoning is fresh, because these are one fact and a later reader
will otherwise meet the two halves a year apart.

**The rebuild count is a direct consequence of three copies.** The reader caches per path within
one module registry; Jest gives a registry per *test file*; and seven files import a copy of the
reader because no eighth file may exist to hold one shared copy (§ 2). So program builds scale
with **files that import a helper**, which the triplication decision fixed at seven. A shared
helper would not by itself reduce that — Jest would still give each importer its own registry —
but it would give a cross-file memo, or a `globalSetup` that reads the five export lists once, a
place to live. Today there is nowhere to put one. That is § 8.1's constraint restated in seconds.

**So the trigger is a number, and this is the number.** 8 s against a ~60 s `run-many` is well
inside tolerance and nobody should act on it now. If a later step pushes it up — a fifth entry
point, more gate specs, `eval-core`'s program growing — **the argument to make is not "make the
reader faster" but "build the shared spec-utilities location § 8.1 names, and read the export
lists once."** Re-measure before arguing; the baseline to compare against is **8 s on this tree,
2026-09-07**, with the per-suite split above.

This is the one thing that would retire the triplication on evidence. The other route — someone
finding three near-identical files ugly — is not an argument, and § 8.1 already rules out the
shortcut of a boundary exemption.

## 4. The gate's first finding — the five root-only symbols

The three-way relation of § 3.2 went red on its first run with exactly the five symbols the plan
predicted:

```
- Array []
+ Array [
+   "DiscoveryService",
+   "EvalContext",
+   "EvalScope",
+   "EvalScopeOptions",
+   "ParserService",
+ ]
```

Each is **exported**, documented in the root `README.md` (which ships nowhere), and was absent
from `modules/eval-core/README.md` (the only file a consumer who installed the package can read).

**That is F3's motivating *shape*, and not its motivating *case* — the distinction matters
because F3 is being retired.** `trackTime`, the Phase 1 step 6 divergence F3 was written from, is
an `EvalOptions` key rather than an exported symbol and appears in no `import { … }` statement in
any README. This gate scans import statements and filters on "is exported", so `trackTime` fails
both conditions: had the gate existed in Phase 1 it would have stayed green throughout. The
limit is now recorded first in F3's entry and in the `eval-core` gate's docstring, because a
closed entry claiming to cover its own example is exactly the kind of thing nobody re-checks.

**Dispositioned by documenting all five in the package README**, not by an exception: a new
`## Exported entry points` section with three `javascript` blocks — `ParserService`,
`DiscoveryService`, and one covering `EvalContext` / `EvalScope` / `EvalScopeOptions` — in the
file's prevailing fragment style, plus one line amended in the intro sentence that used to say
the file documented only options. **There is no exception list anywhere in the gate**, which was
§ 1.1's condition for the whole thing being worth having.

This moves step 4's input: `modules/eval-core/README.md` now has **11** `javascript` blocks, not
8. Both the § 4 step 4 inventory paragraph and its exit criterion are corrected in the plan, with
an instruction to re-count rather than quote.

> ### Superseded by step 4, 2026-09-08 — two errors, and one of them flattered a drop
>
> Corrected here, where the claim was made, rather than only in the later summary.
>
> **1. "The added blocks are in the file's prevailing fragment style, so they change the
> inventory without changing the question" — wrong, and wrong in the direction that made step
> 4's drop look better supported.** Measured with the TypeScript parser, the three blocks this
> step added do not **parse**: `private service: X;` outside a class body plus a bare `...` line
> are syntax errors, not merely missing bindings. Before this step
> `modules/eval-core/README.md` had **one** such block; after it, **four**. So this step tripled
> the unparseable count in the file step 4 then had to judge — in the exact shape that judgement
> was about — and said it had changed nothing. Step 4 rewrote all four to
> `const service = inject(X);`, which parses.
>
> **2. Both counts were one short.** The file has **12** `javascript` blocks and had **9**
> before this step, not 11 and 8: the `EvalHooks` block sits inside a bullet and its fence is
> **indented**, so a `^```` scan skips it. The plan's original 8 and this step's corrected 11
> share the error.
>
> **What caught both was step 4's criterion 1 — "re-count rather than quoting this line".**
> Quoting the numbers written here would have hidden this step's own three blocks inside a
> total nobody re-derived, and left the indented block uncounted in a second document. The
> lesson is the criterion's, not this step's: a count recorded in one document and quoted in the
> next is a fact with no owner.

## 5. Confirmed load-bearing — five arms, and which case went red in each

Four rename arms as § 4 step 2 requires, plus two for the reader itself. **Every probe edit was
reverted before the diff was taken**; `git diff --name-only HEAD` after the last revert showed
only `docs/` files and `modules/eval-core/README.md`, with the seven new specs untracked.

| Arm | Inversion | Which case went red |
| --- | --- | --- |
| A1 — root README **and** package README | `EvalScopeOptions` renamed in `classes/eval/public-api.ts` | **two** cases: `… › README.md › imports no identifier the package does not export` (`README.md:291 imports { EvalScopeOptions } …`) and `… › modules/eval-core/README.md › …` (`modules/eval-core/README.md:46 …`). 15 passed |
| A2 — package README **alone** | `ASYNC_HOOK_MESSAGE` renamed in the same barrel | **one** case: `… › modules/eval-core/README.md › imports no identifier the package does not export` (`modules/eval-core/README.md:145 …`). The root README case stayed **green**, which is what shows the two files are scanned independently rather than one mirroring the other. 16 passed |
| B — `eval-signals` | `createEvalSignal` renamed at its declaration | `… @zvenigora/ng-eval-signals … › imports no identifier the package does not export` (`modules/eval-signals/README.md:26 …`), plus the two reader cases that name that symbol |
| C — `eval-forms/reactive` | `bindFieldProperties` renamed at its declaration | `… /reactive … › imports no identifier the entry point does not export` (`modules/eval-forms/README.md:100 …`). The `/signals` gate stayed **green** |
| D — `eval-forms/signals` | `ExpressionRules` renamed at its declaration | `… /signals … › imports no identifier the entry point does not export` (`modules/eval-forms/README.md:555 …`). The `/reactive` gate stayed **green** |
| E — the reader, one layer down | `IMPORT_PATTERN` replaced with a line-anchored regex (`^…[^}\n]*…$`), i.e. a scanner that reads only an import's first line | exactly the two named multi-line cases: `README import scanner … › scans an import statement that spans two lines` and `… › scans the identifiers carried by the root README two-line imports`. **The floors and the three-way check stayed green** |
| F — the reader, its partial-failure path | `modules/eval-signals/src/public-api.ts` repointed at `./lib/signal-context-missing` | every `export-list reader (eval-signals copy)` case, each throwing `… has unresolved re-exports, so the list would be short: modules\eval-signals\src\public-api.ts → './lib/signal-context-missing'`. Without the guard the list would have come back with 4 of 7 names, non-empty and unremarked |

**Arm E is the one worth keeping in mind.** `README.md:76-77` and `:291-292` are single
statements spanning two lines, and between them they carry all five symbols the three-way check
exists for. A first-line-only reader drops both statements whole — and still satisfies the
`EvalService` floor, which single-line imports supply on their own, and still passes the
three-way check, whose finding set only *shrinks*. Only the explicitly named multi-line cases
catch it. The floor is a floor; it is not a scanner test.

## 6. § 8.4 — decided: deferred, and recorded as [F9](../backlog.md#f9)

The document-cross-reference check is **not** built here. Now that the machinery exists the
comparison can be made rather than guessed: the reader — the part that was the unknown — is no
use to a link checker, which needs `fs` and a heading slugifier; what would be shared is the
nine-line markdown scan. So the "same shape of scan over the same files" argument, which was the
case *for* folding it in, is the half that did not survive. The two arguments against are
unchanged: it is a different claim (API surface vs. document integrity), and its scope is `docs/`
plus the four READMEs.

It is **not** deferred on cost — § 3's numbers put the whole gate under a second — and it is in
`docs/backlog.md` as its own entry rather than left as a paragraph in a plan, which is the
failure the register was built to stop.

## 7. Exit criteria

| Criterion | Status |
| --- | --- |
| Helper returns type-only exports; `ExpressionRules` asserted directly | **Met** — `eval-forms` copy, plus `CacheType` / `EvalSignalOptions` / `SignalContextSource` in the other two |
| Helper follows the barrel graph, asserted on `EvalService` | **Met**, with the criterion amended for where the graph is rooted (§ 3) — `CacheType`, at the same depth and type-only with it, carries both properties in one case |
| Every identifier in all four READMEs resolves; `eval-forms` per entry point | **Met** — 4 gate specs, 2 for `eval-forms` |
| The scan is not silently empty — a floor per file | **Met** — `EvalService` ×2, `createEvalSignal`, `bindFieldProperties`, `createExpressionRules`; no counts asserted |
| Confirmed load-bearing, four arms, each naming its README and line | **Met**, plus two more for the reader itself — the scanner's multi-line handling and the reader's partial-failure path (§ 5, arms E and F) |
| Each rename reverted before the diff | **Met** — `git diff --name-only HEAD` lists only `modules/eval-core/README.md` and two `docs/` files; the seven new specs are the only untracked additions |
| Published/unpublished is the three-way relation; five symbols dispositioned | **Met** — all five documented in the package README, no exception list (§ 4) |
| Helper's wall-clock cost recorded | **Met** — 344 / 212 / 213 / 228 / 233 ms cold, 0.00 ms warm (§ 3) |
| No block-count assertion anywhere | **Met** |
| `nx run-many -t lint test` green | **Met**, and `build` with it |

## 8. Noticed, not fixed

- **The bare `@zvenigora/ng-eval-forms` specifier has no gate**, because no README imports from
  it and the check would assert over the empty set. [D10](../backlog.md#d10) creates the subject
  in step 5, which makes the third `eval-forms` gate step 5's obligation. Recorded in
  `reactive/src/public-api.spec.ts`'s docstring as well as in F3, so the step that adds the
  import meets the note in the file it edits.
- **The scanner reads whole markdown files, not only fenced blocks.** A superset of F3's wording
  — it cannot miss an import a fence parser would — but it would scan an import deliberately
  printed as wrong in prose. No README does that today; the choice is in each helper docstring.
- **Three import forms the scanner does not handle**, none used by any README: an inline type
  modifier (`import { type X, Y }`) yields the name `"type X"` and would fail spuriously;
  `import D, { X } from …` and `import * as api from …` are not matched at all. Checked against
  all four files — 10 / 9 / 2 / 7 statements matched against 10 / 9 / 2 / 7 import line-starts,
  so no false positive or negative exists today. Recorded in each helper docstring rather than
  fixed, because fixing an unreachable case is how a gate accumulates untested branches.
- **Only imported identifiers are gated at all**, which is F3's third limit above and the one
  worth knowing before treating the entry as closed. `createControlSource`, `FieldSchema` and
  `FormBinding` are exported from `/reactive` and named in no README import, so nothing here
  would notice them being renamed.
- **`README.md` (root) and `modules/eval-core/README.md` still disagree in structure**, and the
  root file's `## Options` prose is where step 4 will have to decide about fragments. Step 2
  added the three blocks needed to disposition the five symbols and nothing further.
