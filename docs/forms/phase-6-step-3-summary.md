# Phase 6 — Step 3 Summary: the choke point and the error policy

**Date**: September 1, 2026
**Plan**: [`phase-6-plan.md`](./phase-6-plan.md) § 4, Step 3
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.1.0) — the `/signals`
entry point, **and** one additive symbol on the released primary entry point
**Commits**: `973198f` (plan, revision 13), `0a92553` (code), `70bf1e4` (plan, revision 14)
**Status**: complete — all three projects green on lint, test and build; `eval-forms` 11 suites
/ 141 tests (from 10 / 133), `eval-core` unchanged at 43 suites / 735 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

The two Critical items, together because both are only observable through a walk.

| File | Kind | Contents |
| ---- | ---- | -------- |
| `signals/src/lib/evaluate-rule.ts` | new | `evaluateRule` — the entry point's only path to the walk, with the scope-stack containment. Module-private; absent from `signals/src/public-api.ts` |
| `src/lib/error-policy.ts` | edit | gains `applyErrorPolicy`; the `SignalContextWriteError` value import; docblock superseded |
| `signals/src/lib/evaluate-rule.spec.ts` | new | the three criteria plus three cases added after review |

**This is the first step of the phase to touch the released primary entry point.**
`applyErrorPolicy` is purely additive — `ExpressionErrorPolicy`'s union is unchanged, no
existing symbol's shape moved, and `/reactive`'s FESM is byte-identical at 25,748.

### Behaviour worth recording

**The containment is a `finally`, and that is stronger than "the arrow visitor forgets to
pop".** The obvious failure is the one § 3.2.1 measured: an arrow body throws, the pop is
skipped, the scope outlives the walk. But `await-expression.ts` *swallows* a child's throw
mid-walk, so a leaked scope can also survive into a **successful** `evaluateRule` return. A
`catch`-based containment would miss that shape entirely. The `finally` drains it.

**The unwind is a loop to a depth mark, and the mark is not assumed to be zero.** One throw can
leave more than one scope open, so a single `pop()` is not enough; and `evaluate()` is
re-entrant through the arrow closure, so unwinding to the bottom would drain scopes the
enclosing call pushed.

**It pops the same object the walk pushed, and nothing in the signature says so.**
`EvalState.fromContext` → `EvalContext.fromContext` short-circuits on identity, so
`state.context === context`. Had it copied, both containment cases would have passed against a
`finally` that drained an unrelated stack — the probe is what distinguishes those, and it shows
`scopes.length` moving to 1.

**`applyErrorPolicy`'s default parameter settles step 2's § 5.3 concern structurally.** Step 2
carried a warning that `onError` must be *resolved* rather than forwarded, because
`createEvalSignal` reads an absent policy as `'throw'` — the opposite of this package's default.
`policy: ExpressionErrorPolicy = 'undefined'` means a registrar may forward `options?.onError`
verbatim, including `undefined`, and get this package's default. Step 4 does not need a
`?? 'undefined'` at the call site, and adding one would be harmless but redundant.

---

## 2. Design questions settled during the step

**Where the specs live.** The step's file list named two implementation files and three
behavioural criteria. One spec, under `signals/`, carries all three: both policy arms need a
walk, and the write arm is reachable only through the context `createFieldContext` builds,
which exists in the adapter. Written into the plan as revision 13 item 1 before the code.

**What the write-error criterion actually protects.** The plan said a type-only import of
`SignalContextWriteError` "would compile and the guard would silently never fire", and made the
import's form the criterion's subject. Measured: it is **TS1361** — `instanceof` is a value
position — so it fails `build:production`, gate 7, and both policy arms under ts-jest. The
criterion is worth keeping and its stated reason was not. What it covers is the bypass's
**behaviour across the package boundary**, including the one failure mode no import syntax
prevents: two resolved copies of `eval-signals` giving two constructors, for which `instanceof`
is silently false. That is why the arm throws the error through the real context rather than
constructing one. Revision 13 item 2; superseded inline at § 3.4 and § 8.1.

---

## 3. Deviations from the plan's literal sketch

**None in the implementation.** `evaluateRule` is § 3.3's helper as written;
`applyErrorPolicy` is § 3.4's, branch for branch.

**Three specs beyond the criteria**, all from the review and all probed:

- the write-error bypass under a **handler** policy, with the handler asserted at zero calls.
  The docblock claims the bypass holds in every mode and the criteria reach only `'undefined'`;
  a function fast-path placed ahead of the `instanceof` passes both required arms and swallows
  the error under the one mode a form-builder consumer is most likely to configure;
- an ordinary error under the same handler policy, so the zero-call assertion cannot pass
  vacuously;
- `evaluateRule`'s `options` reaching the **walk**. Dropping the argument left every other case
  green, so the parameter step 4 forwards `options.eval` into was uncovered wiring.

**One comment rewritten for the gate rather than for the reader.** The first draft of
`evaluate-rule.ts`'s docblock spelled out `EvalState.fromContext` and `new EvalState`, which
made gate 3's first grep return two hits and its second return one — prose on the very file the
gate exists to bless. That is what revision 10 spent a revision removing from gate 3's third
row. The docblock now names neither spelling and says why.

---

## 4. Verification

`npx nx run-many -t lint test build` green for all three projects, run after every change.
`eval-core` and `eval-signals` unmoved at 735 and 97 tests — the regression gate on the plan's
scope section.

| Gate | Result |
| ---- | ------ |
| 1 `/signals` shipped | `exports['./signals']` names `types/…-signals.d.ts` + `fesm2022/…-signals.mjs`, both emitted; `dist/…/signals/package.json` names the same pair |
| 2 Angular 22 confinement | every non-spec `@angular/forms/signals` hit under `signals/`; this step added none |
| 3 One path to the walk | **exactly one** `EvalState.fromContext`, at `evaluate-rule.ts:80`, inside the function body; zero `new EvalState`; zero service imports (calibration still fires on `eval-signals`) |
| 4 `/reactive` unmoved | FESM 25,748 bytes |
| 5 Published core surface | `.d.ts` exports `applyErrorPolicy, createFieldContext, toText, toVisible` — gained one symbol, and nothing else |
| 6 `/signals` published surface | `.d.ts` declares exactly `TEXT`; all four module-private symbols absent |
| 7 Unpublished sources type-check | no output under `^modules/eval-forms/`; calibration returns the 38 pre-existing `eval-core` hits |

Gate 3 flipped from zero to one at this step, as § 6 predicted, and the hit is inside the
function body rather than at module scope — a hoisted state would satisfy the count while
sharing one value stack, open-node stack and `result.trace` across every derivation.

### Probes

Six, all named rather than counted.

**The required containment probe** — remove the `finally`. Two red, and both are the ones on
record:

- `evaluateRule › should leave the scope stack at its pre-walk depth when an arrow body throws`
  — `scopes.length` **1**
- `evaluateRule › should resolve its own source key when the same rule is invoked again after a
  throw` — `country` resolves to **`1`**, the arrow's own parameter, and the second invocation
  returns `'1ok'`

The second half is the discriminating one, and it fired: the fixture can actually produce the
shadowing, so "scopes is 0" is not a claim about a number nothing can move. What makes it
reachable is that the arrow's parameter is *named* `country`, colliding with a real source key,
and `EvalContext.get` resolves `scopes` before `lookups`.

**Remove the `instanceof` bypass** — one red:
`applyErrorPolicy over evaluateRule › should re-throw a write error through the same policy`.

**Replace the helper with `(run) => run()`** — one red, and it is the *ordinary*-error arm.
The write arm stays green, because the error propagates from having never been caught. This is
the plan's own argument for two arms, confirmed rather than quoted.

**A function fast-path ahead of the bypass** — one red, the handler arm alone. The two required
arms both pass, which is why that arm exists.

**Drop `options` from `EvalState.fromContext`** — one red, the options case alone.

**`import type { SignalContextWriteError }`** — `TS1361` at `tsc`, and under ts-jest *both*
policy arms red. Not a silent mutation in any configuration; see § 2.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

**Revision 13** — the spec in step 3's file list; the false `import type` claim superseded at
§ 3.4 and § 8.1; the three extra assertions recorded.

**Revision 14** — § 3.4 gains the boundary on its own guarantee (below), `ROADMAP.md` gains the
defect underneath it, and step 7's `CHANGELOG.md` row and exit criterion now name
`applyErrorPolicy` — the only symbol this phase adds to the already-released primary entry
point, omitted from that row through six revisions because everything else lands behind
`/signals`.

### 5.2 The one finding that outlives this step

**A write error nested inside a call loses its class, and the § 3.4 guarantee with it.**
`safeCall` catches whatever a callee threw and re-raises
`new Error(\`Function call error: …\`)` (`internal/visitors/call-expression.ts:126-128`). So:

- `country = "CA"` → `SignalContextWriteError`, re-thrown past the policy, as promised;
- `[1].map(x => (country = "CA"))` → a plain `Error`, `instanceof` false, routed to
  `undefined` — the silently blank field the guarantee exists to prevent.

Measured with a temporary probe, then removed. **The shape a rule would actually take is
unaffected** — an assignment is already a misuse, and the unprotected form is a misuse inside
one. Not fixable here: the re-wrap is inside `eval-core`'s walk, and the routing Phase 3 used
to escape the *service*-layer version of this wrapper does not apply. Matching the decorated
message would couple this package to another library's error wording.

Recorded in `ROADMAP.md` (the fix is upstream, and the blast radius is every custom error type
crossing a call frame), in § 3.4 (a section stating a guarantee states where it stops), and in
step 7's README list (the consumer meets it as a blank field with nothing in the console).

### 5.3 Noticed, not fixed

- **Step 2's three carried items are unchanged by this step** — the un-called top-level signal
  value, the unfalsifiable `typeof key === 'string'` guard, and the two dead lookups running
  ahead of ours. None is touched by the choke point.
- The `worker process has failed to exit gracefully` warning on `eval-forms:test` predates this
  step and appears in the baseline run.

### 5.4 For step 4 specifically

- **`applyErrorPolicy` must stay the outermost call in the `LogicFn` body** (risk 12). The
  coercion goes *inside* it, and a guard added ahead of it breaks two things at once, only one
  of them loudly.
- **Compile once per rule per `form()`, outside the `LogicFn`** (risk 8). `evaluate-rule.spec.ts`
  hoists its compile out of the policy callback deliberately, because that file is the first
  thing step 4 reads for this pairing and a compile inside the closure is the defect modelled
  in the place most likely to be copied.
- **Step 4's barrel edit is where two steps of source first meets `tsconfig.lib.prod.json`** —
  step 2's finding, unchanged. Gate 7 has covered `model-source.ts`, `rules.ts` and now
  `evaluate-rule.ts` since revision 12, so the surprise should be smaller than step 2 feared,
  but `build:production` still compiles them for the first time there.
- **`evaluateRule`'s third argument is now covered by a spec**, so step 4 forwarding
  `options?.eval` into it has a regression gate behind it.
