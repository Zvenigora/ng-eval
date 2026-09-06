# Phase 6 — Step 7 Summary: docs, README and the 0.2.0 release

**Date**: September 6, 2026
**Plan**: [`phase-6-plan.md`](./phase-6-plan.md) § 4, Step 7 — caveat sources in § 3.2.1, § 3.4,
§ 3.5.1, § 3.5.3, § 3.6 and § 3.8 / § 3.8.1
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.1.0 → **v0.2.0**) —
documentation across all three entry points, plus the release manifest; no runtime code changed
**Commits**: `ef26ad7` (docs, spec and release, plan revision 19)
**Status**: complete — all three projects green on lint, test and build; `eval-forms` 15 suites
/ 192 tests (from 14 / 180), `eval-core` unchanged at 43 suites / 735 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

The release, and the documentation that makes a third entry point findable.

| File | Kind | Contents |
| ---- | ---- | -------- |
| `modules/eval-forms/README.md` | edit | The four structural edits revision 18 assigned, three prose fixes revision 19 added, a `/signals` section carrying seven caveats, and the `/reactive` side of the identifier asymmetry |
| `signals/src/lib/readme-examples.spec.ts` | new | 12 cases executing the `/signals` blocks plus the one `/reactive` block whose subject is the difference between the entry points |
| `CHANGELOG.md` | edit | `## [eval-forms 0.2.0]`, naming both the `peerDependencies` addition and `applyErrorPolicy` |
| `modules/eval-forms/package.json` | edit | `0.1.0` → `0.2.0` |
| `docs/forms/phase-6-plan.md` | edit | § 3.8.1's closing paragraph corrected; revision 19 |
| `ROADMAP.md` | edit | The Phase 8 question, logged and not decided |
| `signals/src/lib/rules.ts` | edit | Prose only — revision 19 item 2 |
| `reactive/src/lib/readme-examples.spec.ts` | edit | Prose only — revision 19 item 2 |

**The correction the step exists around.** Revision 18 item 3 found that § 3.8.1 claimed
"`/reactive` **throws** on this today" and handed the fix here. `/reactive` throws on a field or
control **name** (`field-schema.ts:172-178`, `:214-220`) and never inspects an expression, so
`{ name: 'city', visible: 'constructor' }` binds there and renders the data-less field —
*exactly* the Q11 outcome the guard was added to prevent at `/signals`. The check therefore makes
`/signals` **stricter** than `/reactive` rather than symmetric with it, and § 8.2's
same-meaning-at-both-entry-points principle cannot be what carries it: shipping the check
**opens** an § 8.2 asymmetry. Q11 carries it on its own account. What § 8.2 does carry is that
the asymmetry is a **debt**, which is why the `/reactive` question is now a ROADMAP entry rather
than a decision this step took.

The order mattered and the plan said so: the README caveat was written *from* the corrected
paragraph, not the other way round.

---

## 2. The documentation defect class this step found — a **wrong** cause, not a missing one

The review caught four factual errors in prose I had written. Three were ordinary: a
contradiction between two sentences a hundred lines apart, a count that did not match the table
under it, and a "the shared core is unchanged" that its own bullet list refuted. The fourth is a
different species and is the one worth a section.

**What I wrote**, in the `/signals` caveat about the nested-signal diagnostic:

> It is not that the check is switched off; its scan never covered this shape.

**What is true.** `findNestedSignals`' own docblock
(`modules/eval-signals/src/lib/nested-signal-check.ts:29-46`) names
`{ user: { name: signal('a') } }` as its **reported** example and implements exactly that walk.
The scan covers the shape precisely. What is absent at `/signals` is a *source to scan*:
`createFieldContext({}, {}, options)` (`model-source.ts:155`) hands `createSignalContext` an
empty record on both halves, so `warnOnNestedSignals` runs over `{}` and every model key
resolves through `lookups`, where nothing scans.

**Why a wrong cause is worse than a missing one.** A missing explanation leaves a maintainer
where they started. This one *directs* them: a reader who believes the scan does not cover the
shape will go and widen the scan, which cannot recover the diagnostic no matter how far it is
widened, because the model never reaches it. The sentence converts an hour of confusion into a
day of it, and it does so most reliably for the reader who trusts the document most.

**Where it came from, which is the reusable part.** The plan *does* explain why the diagnostic
does not fire (§ 3.2.1, around `:1556-1560`), but it explains it about the **withdrawn**
seeded-record design — the record's values were all `computed`s, so `isPlainObject` skipped
every key. That reasoning was correct for a design that no longer exists. I paraphrased the
plan's conclusion ("the scan never covered this") and carried its *reason* across a design change
that had invalidated it. Neither § 0.2.1 nor § 0.2.2 catches this: the claim was not killed by a
finding, and the answer *was* attached to something — the plan. It is a third shape, and the
distinguishing question is not "is this claim supported?" but **"is the support still about the
code that shipped?"**

**No gate in this phase can catch it, and that is structural rather than an oversight.**
`readme-examples.spec.ts` runs code; it does not read explanations. The `/signals` caveat has no
runnable block at all — there is nothing to execute, because the claim is that *nothing happens*.
Every other caveat in the section is pinned by a case in the new spec; this one is pinned by
having been checked against source by a reviewer. That asymmetry is worth stating plainly: **the
examples gate covers what the README says will happen, and nothing covers what it says about
why.**

---

## 3. Verification

`npx nx run-many -t lint test build`, unfiltered, green for all three projects. `eval-core` (735)
and `eval-signals` (97) unmoved, which is the plan's scope section holding.

Two checks a green build cannot make, both from § 4:

- **The `/signals` subpath ships.** `dist/modules/eval-forms/package.json`'s `exports["./signals"]`
  names `types/zvenigora-ng-eval-forms-signals.d.ts` and
  `fesm2022/zvenigora-ng-eval-forms-signals.mjs`, both present;
  `dist/modules/eval-forms/signals/package.json` names the same pair. The emitted `.d.ts` exports
  exactly `TEXT`, `createExpressionRules`, `ExpressionRuleOptions`, `ExpressionRules` —
  `evaluateRule`, `guardIdentifiers` and `createModelSource` stayed module-private.
- **The Angular 22 import stays confined.** Every non-spec hit of `@angular/forms/signals` is
  under `signals/`. One spec hit sits outside — `src/lib/signals-entry-point.spec.ts`, step 1's
  paths-mapping proof, which *must* live under another entry point's folder and is not shipped.

The release itself is gated on the **build output** rather than the edits, per the plan's W2:
`dist` manifest shows `"version": "0.2.0"` and carries `acorn-walk`, and the `Versions` block was
compared to `package.json` key-for-key by script rather than by eye.

### Probes

Six, and the value is in **which** cases went red rather than how many.

| Probe | Red, by name |
| ----- | ------------ |
| `evalVisible`'s `!` inversion removed | quick-start eight values; makeSchema own model; schema value shared |
| Guard predicate neutered (`Object.prototype` → `{}`) | schema silent / `form()` throws; bound-parameter pair; `/reactive`-renders-`/signals`-throws |
| Guard made to visit `MemberExpression` | leave a member expression to eval-core |
| Memo built per-rule from `resolved.eval` | correct the property name and leave the identifier uncorrected — Expected `"undefinedHQ"`, **Received `"USHQ"`** |
| Factory fallback dropped from `resolveOptions` | resolve both when set on the factory — Expected `"USHQ"`, **Received `"USundefined"`** |
| `instanceof SignalContextWriteError` bypass removed | rethrow a direct assignment whatever the policy says |

**The last three were run because the first three left two pairs unprobed**, and "I flagged them
myself" is not a disposition. Both pairs separate completely: each probe reddens exactly one arm
and leaves the other green.

**The received values are the discriminating part, not the redness.** `"USHQ"` is precisely the
"a registration reached the memo" outcome — § 3.5.3's boundary, seen from the wrong side. A
probe that had merely turned the case red would not have distinguished "the option stopped
working" from "the option started working where it must not". The assignment probe is the
cleanest instance: the direct arm went red and the nested-in-a-call arm stayed green, because it
had already lost its class to `safeCall` before `applyErrorPolicy` ever saw it — the probe
confirms the pair is testing the boundary and not the mechanism twice.

**Not every case needs a probe I invent.** The reviewer established by inspection that the
recompute-count case reddens in both directions — under-subscription (counter frozen at 1) and
over-subscription (counter reaches 3) — which is stronger than the single-direction probes above
and is why the middle arm exists at all.

---

## 4. Open items carried forward

### 4.1 Written into the plan and the roadmap during the step

- **Plan revision 19, item 1** — three README prose claims this release falsified, plus a fifth
  exit criterion that greps for them. All three sat *adjacent to* structure the four existing
  criteria already reached: the package's one-line description beside nothing gated at all; the
  two sentences below the `Versions` JSON, where the criterion reads "matches `package.json`
  exactly" and stops at the closing fence; and "What is not here" still calling `/signals`
  future, one section from the gated table row. **That adjacency is the pattern, not three
  slips** — § 0.2.1 in a documentation register, where a criterion aimed at an artefact leaves
  the sentences around it ungated and the sentences are the other half of the deliverable.
- **Plan revision 19, item 2** — the § 0.2.2 sweep, below.
- **`ROADMAP.md`** — "should `/reactive` reject prototype-shadowed identifiers in expressions
  too?", logged as a Phase 8 question with what a phase would have to settle: where the check
  runs, whether the residual is acceptable at both entry points, whether the deliberate
  over-rejection ports to a released surface, and the migration note for a consumer whose schema
  arrives from a server and who therefore cannot rename the key. **Logged, not decided** — a docs
  step deciding it is how a breaking change ships without one. The entry says explicitly that
  neither Phase 7 nor Phase 8 is yet a section in that document, so the number is a reservation
  and not a dangling cross-reference.

### 4.2 The § 0.2.2 sweep, which found the more dangerous copy second

Two claims this step's own diff killed, each surviving in one other place:

- **`signals/src/lib/rules.ts:24-27`** said the memo and the rule context "are made once, at
  `createExpressionRules` time". The context is minted **per registration**; only the options it
  is built from are fixed at factory time. The README was corrected first, which left a source
  comment contradicting the shipped README on the one subject a consumer is most likely to check.
- **`reactive/src/lib/readme-examples.spec.ts`'s docblock** claimed coverage of the README's
  runnable `ts` blocks, over-claiming by exactly the block this step relocated.

**The doc comment is the worse of the two and the ordering is the lesson.** It is what an editor
shows on hover, so it reaches a reader who never opens the README — the copy with the widest
audience was the one fixed last, because the finding named the README. That is § 0.2.2's failure
mode exactly: scoping the search to the section the finding named.

The sweep itself was clean beyond those two. Grepping the distinctive phrases across the repo
found the plan's § 3.5.3, which says `createModelSource` runs once at factory time — **correct**,
because that sentence is about the memo, and the same section explicitly notes that `prepare`
takes its context from `source.createRuleContext()`. The plan never carried the wrong claim; only
the docblock did.

### 4.3 The two spec files no longer describe their contents, in either direction

Established by enumerating every fenced block in the README mechanically rather than by eye — 19
blocks, 13 runnable `ts`.

**The primary entry point's examples are gated**, which was the question asked. The core owns
exactly two runnable blocks (`toVisible`, `toText` under Coercion) and both are executed by
`reactive/src/lib/readme-examples.spec.ts` through the published `@zvenigora/ng-eval-forms`
specifier. This release does not ship three entry points behind a gate covering one.

But the folder layout now misstates the split **both ways**: the `/reactive` file is the sole
gate for the *core*'s examples, and the `/signals` file gates one `/reactive` block. Both are
deliberate — a core-only spec could not import `bindFieldProperties` to sit beside the coercion
blocks, and the asymmetry claim is a *pair* whose halves would drift if separated — and both are
now stated in the two docblocks and in the README's Development section.

**Is that sufficient, or does it want a ROADMAP line?** My reading: **sufficient for now, and the
thing that would earn a line is a different problem than this one.** Three prose statements now
point at each other, and prose is exactly what §  2's finding above says nothing enforces. But a
ROADMAP entry saying "keep three comments in sync" is not a deferred piece of work — it has no
deliverable. The mechanism that would actually close it already exists in the roadmap as
**"Deferred tooling — documented-symbol drift gate"** (`ROADMAP.md:707`), which scans the fenced
blocks rather than executing transcriptions; a gate that reads the markdown would derive the
block-to-spec mapping instead of trusting three comments to agree. The right move is to note this
as a second motivating case under *that* entry when someone picks it up, not to open a third
tooling section beside it. **Recorded here rather than acted on**, because adding a line to a
deferred-tooling section is a judgement about that section's scope, and step 7's file list does
not include it.

### 4.4 Noticed, not fixed

- **`applyErrorPolicy` has no runnable README block**, only a "How it fits together" row — so the
  one symbol this release adds to the *released* primary surface is documented but not
  example-gated. Consistent with `createFieldContext` and `ExpressionErrorPolicy`, which are also
  table-only, so this is the existing convention rather than a new gap; worth revisiting if the
  core's surface grows.
- **The `/signals` entry point has no worked example.** `docs/forms/worked-example.md` is
  `/reactive`'s, and the plan asks for no counterpart. The quick start plus five caveat blocks
  cover the API; a whole-form narrative is the thing `/reactive` has and `/signals` does not.

### 4.5 For whoever opens Phase 7 or 8

The three documents now disagree about *how much* they commit to. `README.md` and `CHANGELOG.md`
both say "a later major" with no number; `ROADMAP.md` is the only one that says **Phase 8**. That
is deliberate — a consumer-facing document should not promise a phase number the repository has
not defined — but it means the ROADMAP is the single source for that commitment, and renumbering
it later touches one file rather than three.
