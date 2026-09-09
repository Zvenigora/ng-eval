# Track 3, step 4 — `eval-core`: assessed, split, one gated and one dropped

Executed 2026-09-08 against [`docs/gates/plan.md`](plan.md) § 4 step 4. Completes
[`docs/backlog.md`](../backlog.md) [F4](../backlog.md#f4).

## 1. The inventory, stated before the decision

Measured 2026-09-08 with the TypeScript parser — **syntactic** diagnostics only, so a syntax
error is separated from a merely undeclared binding. That distinction is the whole decision.

| File | ` ```javascript ` | ` ```ts ` | Fails to parse as printed | Parses | Runnable programs as printed |
| --- | --- | --- | --- | --- | --- |
| `README.md` (root) | 11 (+1 `json`) | **0** | **9** | 2 | **0** |
| `modules/eval-core/README.md` | **12** | **0** | 4 | 8 | 0 |

Every failure is the same two constructs: a bare `...` line, and `private service: EvalService;`
outside a class body. The root's two survivors are an import-only block and a context object
literal — neither asserts anything, which is why its runnable count is 0 rather than 2.

**Two corrections to numbers this track had already written down**, both found by re-counting
rather than quoting, which is what criterion 1 asks for:

- **The package README has 12 blocks, not 11 — and had 9, not 8.** The `EvalHooks` block sits
  inside a bullet, so its fence is **indented** and a `^```` scan skips it. The plan's original
  8 and step 2's corrected 11 share that error.
- **Step 2's three added blocks did not parse.** See § 2.

## 2. The step-2 correction

Step 2 added three blocks to `modules/eval-core/README.md` to disposition the five root-only
symbols, matched the file's prevailing fragment style, and recorded that they "change the
inventory without changing the question."

**That is wrong, and it is wrong in the direction that flatters this step's drop.** Those three
blocks do not parse. Before step 2 the file had **one** unparseable block; after it, **four**. A
step judging "is this file gateable" would have been reading a file made measurably less
gateable by the step before it, with a note saying nothing had changed.

The correction is recorded in [`step-2-summary.md`](step-2-summary.md) § 4, where the claim was
made, as well as here — superseding a claim where it was written rather than only where it was
caught. All four blocks are now `const service = inject(X);` and parse.

**Criterion 1's "re-count rather than quoting this line" is what caught it**, and that is worth
keeping. Quoting 8 and 11 would have hidden step 2's own three blocks inside a total nobody
re-derived, and would have left the indented block uncounted in a second document.

## 3. The decision — split, per file

The plan's criteria assume one verdict for both READMEs. The measurement shows two different
failure modes, so the plan's binary was amended (§ 4 step 4, amendment note) rather than the
answer fitted to it.

**Root `README.md` — dropped.** 0 of 11 blocks runnable, 9 not parsing.

> **The first draft of this section gave a ground its own § 4 disproves, and the corrected
> version is narrower.** It said completion there is "**subtractive** — it removes printed
> lines". Measured, that is true of **2** of the 9 failing blocks (`:241` and `:264`, whose
> interior `...` lines stand in for prose). The other **7 are byte-for-byte the shape this step
> rewrote four times** in the package README, and § 4 describes that same operation as the
> opening "surviving as `inject(…)` rather than being deleted". Both cannot be true of one
> operation.

The ground is **volume and ownership**, not mechanism:

- Gating the root means rewriting the opening style of **9 of 11 blocks** — a whole-file
  documentation rewrite, which [`plan.md`](plan.md) § 8.3 holds open as a question with its own
  argument rather than as work this step may do in passing. The package README needed **4 of
  12**, and **3 of those 4 were introduced by step 2 itself**, so this track was largely
  correcting its own footprint rather than rewriting someone's document.
- **2 of the root's 9** additionally cannot be completed without deleting narrative elisions.
- Gating it *without* rewriting it would mean every case supplying the whole program, since none
  of the 11 blocks runs as printed. That is F3's "considered and rejected" shape exactly —
  "anyone turning those fragments into a runnable test declares the missing bindings without
  noticing" — and the substitution list would swallow the document.

**One thing the corrected ground must say plainly: the rewrite was not required by the gate.**
The spec never consumes the README's `inject(…)` line — substitution 2 supplies `TestBed.inject`,
and the file does not read the markdown at all. Parseability is a measurement this step used to
*decide*, not a property any mechanism enforces. So a later reader should not conclude that a
fragment style blocks gating; what it does is push the whole program into the substitution list,
which is where the honesty of this kind of gate lives.

**`modules/eval-core/README.md` — gated.** 8 of 12 blocks parsed as printed and needed only a
`service`, `state` or `context` binding the document already implied — step 3's completability
test, passed. The remaining 4 were the `private service:` shape, three of them step 2's own, and
were rewritten to `inject(…)`.

## 4. What changed in the README, and how far it went

`modules/eval-core/src/lib/readme-examples.spec.ts` covers **all 12 blocks in 10 cases**;
sections whose later blocks continue an earlier one are one case, split where the document
declares a fresh start.

| Block | Change |
| --- | --- |
| `### Parsing`, `### Discovery`, `### Scopes` | `private service: X;` + `...` → `const service = inject(X);`; each gained a printed value to assert |
| `### Per-node timing` | same opening fix; `total: 0.081` → `total: <ms>`, since a wall-clock figure is a printed value that is never true |
| the `createTimingHook` block | gained the adopted-registry state its prose is about, and the two reads that make the sentence checkable — it previously named a `state` the document had built with the *opposite* configuration |
| `### Evaluation hooks`, `#### Hook errors`, the indented `EvalHooks` block, both `completed: false` blocks | gained the `service` / `context` / `compiler` bindings their prose had been assuming |
| `#### Hook errors` | additionally gained the faulty observer its `hookErrors` output requires |

**This touched the fragments' prevailing style, and that is reportable rather than free.** It
went exactly as far as making each block a program: no prose rewritten, no example replaced, and
the injected-service opening survives as `inject(…)` rather than being deleted. What it left is
the root README, whose identical opening is the reason that file was dropped instead of
converted.

**A consequence worth stating, because it was a choice and not a discovery**: completing each
section with its own bindings turned what could have been one continuous program into per-section
fresh starts. An alternative completion — one `service` declared at the top of the file — would
have made the whole document one program. The per-section form is closer to how the document
already reads, and it is why § 6 below reports no subject for the one-program condition.

## 5. Confirmed load-bearing

`### Discovery`'s printed `// 2` was changed to `// 3` and transcribed into the case, as a
transcription would. Red, named:

```
● documented examples › should extract every node of a given type
  Expected: 3
  Received: 2
```

Both edits reverted. As in step 3, this shows the assertion is bound to the library rather than
to itself; and as in step 3, editing the README alone turns nothing red — nothing keeps a case
and its block in step but a human.

**Two more arms, added after review found the first draft's hook cases weaker than their names.**
Both invert the library, both reverted:

| Arm | Inversion | Red case |
| --- | --- | --- |
| Options must not configure an **adopted** registry | `eval-state.ts:194`'s `!this._hooks &&` guard removed, so `trackTime` installs into a caller's registry | `should leave an adopted registry unconfigured until the hook is installed` — `Expected: 0, Received: 2` |
| An adopted registry keeps its **own** policy | `adoptHooks` pointed at a key that does not exist, so the state builds its own registry from options | that case **and** `should keep the policy an owned registry was constructed with` — "Received function did not throw" |

**What review caught, and it is the same class as § 2's error.** The first draft asserted
`typeof off === 'function'` for the `createTimingHook` block — guaranteed by the declared return
type, so red under no implementation — and built it on a state that already had a timing hook
from `trackTime`, which is the *opposite* of the situation the block documents. The
`EvalHooks` case likewise passed only `hooks`, so an implementation where options *did*
reconfigure an adopted registry would have left it green. Both now assert the documented
sentence, and the README's `createTimingHook` block gained the state its prose was always about.

## 6. The one-program condition has no subject in this file — reported, not manufactured

Step 3's criteria apply here with `javascript` for `ts`, which includes demonstrating the
one-program condition on a block that can falsify it. **No such block exists in this document**,
and the honest report is that rather than a constructed one:

- No printed value in `modules/eval-core/README.md` depends on state an earlier block
  established. Each section builds its own `state` from its own `context`.
- The two multi-block sections are **precondition** dependencies, not printed-value ones: split
  the `createTimingHook` block from the `### Per-node timing` block and it has no `state` to
  install onto — it fails to run rather than passing wrongly. That is the declaration-dependency
  case [`plan.md`](plan.md) § 1.3 explicitly excludes from the condition's business.

So a resetting fixture could not report green on a wrong document here. That is partly a property
of the completion choice in § 4, and saying so is the point: the condition is satisfied by
construction rather than demonstrated, and a later step that re-completes this file as one
continuous program would put a subject back.

## 7. Exit criteria

| Criterion | Status |
| --- | --- |
| Block inventory stated before the decision, per file, with how many are runnable as printed, and re-counted rather than quoted | **Met** (§ 1) — and the re-count found two errors, one of them step 2's own |
| The decision recorded with its evidence, before any spec exists | **Met** (§ 3), and the plan's binary amended rather than the answer fitted to it |
| **If gated**: step 3's criteria with `javascript` for `ts`; per-file count non-zero and stated; blocks completed in the README named; if completion touched the prevailing style, how far it went and what it left | **Met** (§ 4) — 12 blocks, 9 cases, seven substitutions enumerated in the docstring, style change reported |
| **If dropped**: F4 records the assessment and reason, and is re-scoped so nothing implies pending work | **Met** — F4 now carries three states: `eval-signals` gated, package README gated, root README assessed and dropped |
| `nx run-many -t lint test` green | **Met**, with `build` |

## 8. Noticed, not fixed

- **`event.scoped` is `undefined` for an ordinary read, not `false`.** The README's `onRead`
  block prints only what `true` means, so the document is not wrong — but a consumer would
  reasonably read the field as a boolean. The case asserts both halves, including an
  arrow-parameter read the block's own program does not contain (substitution 7). Sharpening the
  comment is a documentation call left for whoever next edits that section.
- **The root README stays ungated**, which is the decision, not an omission — and it is the file
  where the two Phase 1 defects shipped. What would change the answer is a documentation rewrite
  of its fragment style, which [`plan.md`](plan.md) § 8.3 keeps open as a question with its own
  argument, not as pending work here.
