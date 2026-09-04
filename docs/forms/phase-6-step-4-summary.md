# Phase 6 — Step 4 Summary: `evalVisible` and `evalText`

**Date**: September 3, 2026
**Plan**: [`phase-6-plan.md`](./phase-6-plan.md) § 4, Step 4
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.1.0) — the `/signals`
entry point only; the released primary entry point and `/reactive` are untouched
**Commits**: `26164b1` (plan, revision 15), `3ac2ea6` (code), `c348bcf` (plan, revision 16)
**Status**: complete — all three projects green on lint, test and build; `eval-forms` 13 suites
/ 155 tests (from 11 / 141), `eval-core` unchanged at 43 suites / 735 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

The two registrars, and the first line that publishes anything from this entry point's factory.

| File | Kind | Contents |
| ---- | ---- | -------- |
| `signals/src/lib/rules.ts` | edit | `evalVisible` and `evalText`; `resolveOptions`; `prepare`. `evalDisabled` stays a throwing stub |
| `signals/src/public-api.ts` | edit | `export * from './lib/rules'` — the line § 5 has listed since revision 1 and no step produced |
| `signals/src/lib/rules.spec.ts` | new | 12 read-back cases — § 6.1's first harness |
| `signals/src/lib/rules.invocation-count.spec.ts` | new | 3 counting cases behind three delegating mocks |

**The `LogicFn` body, which is the phase's one structural invariant:**

```ts
const evaluated = () =>
  applyErrorPolicy(() => evaluateRule(compiled, context, resolved.eval), resolved.onError);

hidden(path, { when: () => !toVisible(evaluated()) });   // evalVisible
metadata(path, TEXT, () => toText(evaluated()));         // evalText
```

`prepare` runs once per registration, so `parse` + `compile` and `createRuleContext()` happen at
schema-body time — which Angular re-runs once per `form()` (Q8), giving § 3.6's count of one
context and one compiled callback per rule per form, against one memo per factory.

### Behaviour worth recording

**The two nestings § 3.5 chooses between are separated by exactly one assertion, and it is
now measured rather than argued.** With `onError: 'undefined'` and a throwing expression,
`!toVisible(applyErrorPolicy(walk, policy))` coerces `undefined` to `false` and inverts to
**`true`**; `applyErrorPolicy(() => !toVisible(walk()), policy)` returns `undefined` and the
field is not hidden. Every other error-policy criterion in the step passes under both — which is
why risk 12 sat for revisions naming a mitigation that did not test the thing.

**The read-back harness is as blind as § 6.1 claims.** Three separate mutations — a hoisted
guard, an over-subscribing rule, a compile sunk into the closure — leave all 12 read-back cases
green and redden only counting cases. This is the plan's own claim about its harnesses, and it
held under test rather than under argument.

**Two behaviours that are wrong and shipping are characterised, not left to be discovered.** A
schema *value* reused across models evaluates the factory's model (Q9), and a per-registration
`caseInsensitive` corrects property names but not identifier keys (§ 3.5.3). Both specs say in a
comment that they record a limitation rather than a guarantee.

---

## 2. Design questions settled during the step

**`ExpressionRuleOptions` resolution — registration wins per key** (§ 3.5.3, revision 15). The
type has promised since step 2 that a registration "may override" the factory, and no revision
said how. Settled as `rule?.eval ?? options?.eval` and `rule?.onError ?? options?.onError`, each
resolved independently, neither a deep merge.

**Whether a divergent per-registration `caseInsensitive` should throw — no.** Two reasons, both
in § 3.5.3. A guard naming `caseInsensitive` enumerates one key of an open
`Record<string, unknown>`, so any later factory-bound option recreates the gap while the guard
teaches the reader the set is closed. And registration runs inside the schema body during
`form()`, so the throw would kill the whole form over one rule's identifier casing — unreachable
through `onError`, which exists precisely so a bad rule degrades to a blank field rather than a
dead form (§ 3.4.4). The fixes that make the gap *unreachable* rather than loud are named and
deferred, because both change § 3.6's count or § 5's shapes.

---

## 3. Deviations from the plan's literal sketch

**None in the code.** § 3.5's table and its `evaluated` snippet are what shipped, including the
config overloads and the inversion's placement.

**One in the criteria, deliberately, and stated rather than quietly met**: step 4's
compile-once bullet states the sequence numerically — `compile` at 1, invocations
**1 → 1 → 2** — while § 6.1's generic sequence states step 2 as `≥ 1`. The spec asserts **both**:
the relative form, because that is what the six steps are about, and the absolutes, because the
relative form alone would accept a registrar that invoked the rule twice per read. The measured
numbers matched the plan's re-spike exactly.

---

## 4. Verification

`npx nx run-many -t lint test build`, unfiltered and cache-skipped: green. Gates 1–7 all pass —
`./signals` exports map agrees with `signals/package.json`; `@angular/forms/signals` in non-spec
code appears only under `signals/`; exactly one `EvalState.fromContext`, inside `evaluateRule`'s
body, zero `new EvalState`, zero service imports; `/reactive`'s FESM byte-identical at 25,748;
the primary `.d.ts` unchanged; the `/signals` `.d.ts` declaring exactly § 5's four symbols with
`evaluateRule`, `createModelSource` and `ModelSource` absent; `tsc --noEmit` filtered to this
package silent.

### Probes

Nine mutations, each reported by **which named cases** went red rather than by a count.

| Mutation | Red |
| -------- | --- |
| Remove the `!` in `evalVisible` | 8 cases, including the dedicated inversion case |
| Policy outside the coercion (the C4 alternative) | **exactly one** — `should coerce outside the policy…` |
| Guard hoisted above `applyErrorPolicy` (M7) | the two counting cases; **all 12 read-back cases stayed green** |
| `compile(parse(…))` sunk into the `LogicFn` body | `should re-invoke only for a key its expression names, and compile once` |
| Rule reads the whole model (over-subscription) | the same case, and only it |
| Factory-wins instead of registration-wins | `should take a per-registration onError over the factory's` |
| Walk options dropped from `evaluateRule` | the § 3.5.3 characterisation case, and only it |
| `createRuleContext()` hoisted to factory scope | `should hold one memo per factory and one context per rule per form` |
| `createRuleContext()` sunk into the closure | the same case |

The last two exist because the review found that both passed the whole suite. The
over-subscription and hoisted-guard rows are the two vacuity probes
[`.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md) requires, and both
fail the suite.

**Review findings: no Critical, three Major, all fixed in the step.**

1. **§ 3.5.3's central count was wrong, and the wrong version had already reached the shipped
   `.d.ts`.** Revision 15 said a per-registration `eval.caseInsensitive` reaches "two of the
   three" places. It reaches **one** — the walk. `prepare` obtains its context from
   `source.createRuleContext()`, which closes over `createModelSource`'s options
   (`model-source.ts:155`), so the rule's context is factory-bound too. Corrected in the plan
   **with the error recorded rather than silently replaced**, because the count is the premise
   the two deferred fixes are chosen between: under the true count, moving `caseInsensitive`
   onto the factory's signature is the cheaper fix rather than the more invasive one.
2. **§ 3.6's per-rule `EvalContext` count was asserted by nothing.** Both hoisting and sinking
   the call passed all 15 cases. The compiled-callback half of that sentence was counted; the
   context half was not, and the asymmetry was invisible from the diff. Fixed with a two-rule,
   two-form lifetime case — a two-rule schema being a fixture no case in the package built.
3. **`rules.model-source-count.spec.ts` had stopped discriminating.** See § 5.2.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

**Revision 15** — § 3.5.3, the option-resolution section, with the no-throw decision and its
reasons; step 4's characterisation criterion; step 7's README caveat.

**Revision 16** — `evalText`'s two missing cases and the
`rules.model-source-count.spec.ts` correction added to step 5's file list, plus § 0.2.3 below.

### 5.2 The one finding that outlives this step

**A probe can stop discriminating without being edited, when a later step makes a new wrong
implementation reachable** — recorded as § 0.2.3, a fourth failure mode rather than an instance
of the third.

`rules.model-source-count.spec.ts` was written in step 2 to gate § 3.6's one-memo-per-factory
count, and its comment names the defect it exists to catch: a factory calling `createModelSource`
per registrar. **When it was written, that was true.** The registrars were stubs that threw, so
"per registrar" had no reachable form other than a second call at construction time, which its
count of 1 did catch. Step 4 shipped the bodies, and the defect became reachable for the first
time — patched in, both of its cases stayed green, because neither fixture registers a rule.

What makes it a separate failure mode: **§ 0.2.1's check passes on it at every moment.** Ask
"which assertion goes red?" and there is a named assertion in a named file, before and after.
Nothing was edited, nothing was falsified, and nothing was red in between. A probe discriminates
over the set of wrong implementations that are *reachable*, and a later step can enlarge that
set around a spec that has not moved.

The check is therefore a duty of the step that does the enlarging: when a stub becomes a body,
re-run the earlier steps' probes over the code that changed subject — mechanically, by patching
in the wrong implementation the older spec names in its own comment and confirming that spec is
among the files that go red. And the older spec is not at fault: step 4 owed the *coverage* and
added the lifetime case, while step 5 owes the comment because step 5 is the next step to edit
`rules.ts`.

### 5.3 Noticed, not fixed

- **`ExpressionRules` is now published with one throwing member.** `evalDisabled` is on the
  exported interface and gate 6 reads green while a third of the surface throws. That is what
  the plan asks for and step 5 closes it, but it is a state to be in deliberately.
- **Step 2's three carried items are unchanged by this step** — the un-called top-level signal
  value, the unfalsifiable `typeof key === 'string'` guard, and the two dead lookups running
  ahead of ours.
- The `worker process has failed to exit gracefully` warning on `eval-forms:test` still
  predates this step.

### 5.4 For step 5 specifically

- **The § 0.2.3 re-run is a deliverable, not a habit.** `evalDisabled` stops being a stub, so
  every claim gated over "the registrars" silently changes subject from two to three. Re-run
  step 4's probes — the C4 nesting, the M7 hoisted guard, the compile-in-the-closure, the
  context hoisted to factory scope — and confirm each still reddens a **named** case.
- **`evalText` owes an invocation count and a write-error arm.** "The wrapper is shared" is a
  claim about our code, not about Angular's: `metadata` has its own reducer and its own
  memoisation.
- **`prepare` is now the shared path, and `applyErrorPolicy` must stay its outermost call.**
  `evalDisabled` goes through it, adding only § 3.5.2's static `reason`. A guard placed ahead of
  the wrapper degrades every negative case in the package to M7's zero.
- **The `pending` stub goes away with `evalDisabled`**, and with it the parameter-order comment
  whose only purpose is to keep `@typescript-eslint/no-unused-vars` quiet.
- **`disabled`'s `boolean | string` return is the trap step 5 exists to document.** The reason
  is authored statically and never expression-derived, which is what makes a rule yielding
  `'false'` disable the field with the *authored* reason rather than with `"false"`.
