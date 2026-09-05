# Phase 6 — Step 5 Summary: `evalDisabled`

**Date**: September 4, 2026
**Plan**: [`phase-6-plan.md`](./phase-6-plan.md) § 4, Step 5
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.1.0) — the `/signals`
entry point only; the released primary entry point and `/reactive` are untouched
**Commits**: `be64416` (code and plan, revision 17)
**Status**: complete — all three projects green on lint, test and build; `eval-forms` 13 suites
/ 165 tests (from 13 / 155), `eval-core` unchanged at 43 suites / 735 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

The third registrar, and the payment of two coverage debts step 4 left behind.

| File | Kind | Contents |
| ---- | ---- | -------- |
| `signals/src/lib/rules.ts` | edit | `evalDisabled` over Angular's `disabled` config overload, with § 3.5.2's static `reason`; the `pending` stub and its `ModelSource` import removed |
| `signals/src/lib/rules.spec.ts` | edit | 5 `evalDisabled` cases; `evalText`'s and `evalDisabled`'s write-error arms |
| `signals/src/lib/rules.invocation-count.spec.ts` | edit | § 6.1's six-step sequence for `evalText` and for `evalDisabled` |
| `signals/src/lib/rules.model-source-count.spec.ts` | edit | § 0.2.3's correction — one case gains a real `schema()` + `form()` registration |

**The registrar, and the two lines that matter:**

```ts
disabled(path, {
  when: () => {
    const on = toVisible(evaluated());          // applyErrorPolicy stays outermost
    return on && reason !== undefined ? reason : on;
  },
});
```

`evaluated()` is unchanged from step 4 — `evalDisabled` goes through the same `prepare`, adding
only the closed-over `reason`, which is read at registration and never inside the derivation.

### Behaviour worth recording

**The truthiness trap is dead in all four combinations, and the reason is Angular's ordering
rather than ours.** `signals.mjs:41-49` tests `typeof result === 'string'` *before* truthiness:
a string becomes `{fieldTree, message}`, a truthy non-string becomes `{fieldTree}` with no
message, a falsy value yields nothing. So the only string `when` can return is the closed-over
`reason` — `toVisible` (`!!value`) has already collapsed the expression to a boolean, and the
expression's own value has no route to `message` at all. That is what makes the guarantee
structural rather than a matter of care in the registrar.

**`evalDisabled` is uninverted, unlike `evalVisible`.** `/reactive` ships no `disabled`, so no
expression has to mean the same thing at two entry points, and § 3.5.1's porting argument — the
whole reason `evalVisible` carries a `!` — does not apply.

---

## 2. The reading that needed writing down

**"As step 4" is a shorthand, and shorthands are where a criterion quietly changes meaning.**
Step 5's exit criteria are stated as "as step 4, plus…", and step 4 has eleven bullets. Read
literally that is a duplicate set for a third registrar; read as intended it is the *harnesses*.

The discriminator settled in revision 17 is **registrar-level versus factory-level**:

| Step 4 criterion | Level | Owed by `evalDisabled`? |
| ---------------- | ----- | ----------------------- |
| Read-back through a real `form()` | registrar | yes |
| § 6.1's six-step invocation count | registrar | yes |
| The error policy through a registered rule | registrar | yes |
| Schema reuse (characterisation + supported shape) | factory | no — already pinned |
| § 3.5.3's option-resolution divergence | factory | no — already pinned |
| Compile-once | factory | no — already pinned |

Re-running the factory-level three under a third registrar's name would add assertions that
cannot go red, which is § 0.2.1's defect wearing a duplicate's clothes.

**And the test is not always obvious from the criterion's wording — this step got it wrong
once.** `evalDisabled` first shipped *without* the assigning-expression case, on the reasoning
that the write-error bypass lives in `applyErrorPolicy` and is therefore factory-level. That is
the same "the wrapper is shared" substitution revision 16 exists to reject, made about the very
registrar that revision introduced, in a file whose own comment twenty lines up spells out why
the substitution is invalid. `disabled` registers through `addDisabledReasonRule` and is a third
Angular primitive with its own reducer, so the case is registrar-level.

**The rule that came out of it: if a criterion's subject is a path Angular owns, it is
registrar-level, however shared our own half of it looks.**

---

## 3. Verification

`npx nx run-many -t lint test build`, cache skipped, all nine targets green. § 6's gates 1–7 all
pass; `/reactive`'s FESM is still exactly 25,748 bytes; gate 6's emitted `.d.ts` declares
exactly § 5's four symbols.

**The published type did not change.** `ExpressionRules.evalDisabled` already declared
`ExpressionRuleOptions & { reason?: string }` as of step 4, so the diff touches no declaration —
only the value behind it. No version bump, no `CHANGELOG.md` entry, and gate 6's expected list
is unaffected. Worth stating because "step 5 adds the `reason` option" reads like a surface
change and is not one.

### Probes

Seven mutations, each reported by **which named cases** went red rather than by a count.

| Mutation | Red |
| -------- | --- |
| Registrar forwards `evaluated()` raw to `when` (the trap) | **exactly one** — `should disable on a rule yielding the string false…`, on `Received: ["false"]`, while the `disabled()` assertion one line above stayed green |
| The `on &&` conjunct dropped | `should not disable on a falsy expression even when a reason is authored`, and the `evalDisabled` count case |
| Resolver reads the whole model (over-subscription) | both new count cases named, among 11 |
| `SignalContextWriteError` bypass removed | all **three** registrars' write-error cases, by name |
| Policy outside the coercion (C4) | **exactly one** — `should coerce outside the policy…` |
| Guard hoisted above `applyErrorPolicy` (M7) | `should reach the wrapper even when the key its expression names is absent` |
| `compile(parse(…))` sunk into the `LogicFn` body | all three count cases |
| `createRuleContext()` hoisted to factory scope | `should hold one memo per factory and one context per rule per form` |
| `createModelSource` moved into `prepare` | the corrected count case — **and the step-4 version of that same file passed 2/2 under the identical patch** |

The last row is the one worth keeping. § 0.2.3's decay claim was written from an argument in
revision 16; this step measured it. Restoring the step-4 spec from `git show HEAD:` and running
it against the patched factory gives **2 passed** — the same patch that reddens the corrected
case. The finding is now evidence rather than assertion.

**Review findings: no Critical, two Warnings, both fixed in the step.**

1. **`evalDisabled` shipped without the assigning-expression case** — § 2 above.
2. **The `on &&` conjunct was gated only by a setup line in the counting spec.** That conjunct
   is what stops a *static* reason from disabling a field unconditionally; drop it and every
   field carrying a `reason` disables for the life of the form, with the authored message. Every
   behavioural case in the `evalDisabled` describe registered a reason only alongside a *truthy*
   expression, so all of them stayed green — the sole red was a setup read inside the file whose
   subject is invocation counts. CLAUDE.md's "the probe checks the assertion, check the setup
   separately" in its usual shape: the assertion existed, in a fixture whose purpose was
   something else.

---

## 4. Open items carried forward

### 4.1 Written into the plan after the step

**Revision 17** — the "as step 4" reading and its registrar/factory discriminator; the deferral
of `model-source.spec.ts`'s stale comment into step 6's file list.

### 4.2 The one finding that outlives this step

**A shorthand cross-reference between steps changes meaning when the thing it points at grows,
and the direction it drifts is toward doing less.** § 0.2.1 already covers a criterion attached
to nothing that can fail, and § 0.2.3 covers a probe whose subject grew around it. This is
neither: the criterion is real, the probe discriminates, and what moved is *how many things the
criterion is about*.

"As step 4" was written when step 4 had two registrars. It was read, correctly, as three
harnesses — and then applied to only two of the three paths, because the third looked like it
was covered by a shared helper. Both the reading and the application were defensible in
isolation; what caught the gap was a reviewer holding the criterion against the *registrar*
rather than against the helper.

The generalisable form, and it is cheap: **when a step's criteria are inherited by reference,
enumerate them against the new subject before starting, not after.** A table of six rows marked
registrar-level or factory-level took two minutes and would have caught this before the first
spec was written — the same table now sits in § 2 above and in revision 17.

### 4.3 Noticed, not fixed

- **`model-source.spec.ts:76-77` still says "this step's registrars are stubs"** in the present
  tense — false since step 4, and now false for all three. Deferred into **step 6's file list**
  rather than fixed here, on the same disposition § 0.2.3 gave step 5: the next step to work in
  the area owes the comment. Prose only; no assertion in that file depends on it.
- **Step 2's three carried items are unchanged by this step** — the un-called top-level signal
  value, the unfalsifiable `typeof key === 'string'` guard, and the two dead lookups running
  ahead of ours.
- The `worker process has failed to exit gracefully` warning on `eval-forms:test` still predates
  this step.

### 4.4 For step 6 specifically

- **`ExpressionRules` is now fully implemented**, so § 0.2.3's re-run has no stub left to
  enlarge. Step 6 adds a *throw path* instead, which enlarges the space differently: every
  existing spec's expression becomes a candidate for rejection at registration time.
- **`guardIdentifiers` runs between `parse` and `compile`, in `prepare`** — which all three
  registrars now share, so a mistake there reaches the whole entry point at once rather than one
  property. It is registration-time only and no hot path is touched, so none of the invocation
  counts should move; that they do not is worth asserting rather than assuming.
- **The peer-dependency edit touches the shared `package.json`**, which is the one plausible way
  this phase moves `/reactive`'s FESM. Gate 4's byte count is what confirms the manifest is not
  compiled into the bundle rather than assuming it.
- **`guardIdentifiers`' second parameter is `ReturnType<typeof parse>`, not `AnyNode`** — § 5's
  note. `eval-core` does not export `AnyNode`, and reaching for it pulls in an `acorn` import
  that § 3.8's peer decision rests on not happening.
