# Phase 4 — Step 4 Summary: The field schema and `visible` / `text`

**Date**: step committed August 19, 2026; **this summary reconstructed August 20, 2026**
**Plan**: [`phase-4-plan.md`](./phase-4-plan.md) § 4, Step 4
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1)
**Commit**: `146b40c`
**Status**: complete — `eval-forms` lint clean, 4 suites / 83 tests, `build:production`
clean with both entry points; `eval-core` unchanged at 41 suites / 717 tests,
`eval-signals` unchanged at 5 suites / 97 tests

> **Reconstructed after the fact, and its sources are narrower than the other four.**
> Step 4 shipped without a retrospect; this was written during step 5's session from the
> commit and its message, the plan diff that commit carries, and the comments in
> `field-schema.spec.ts` — all of which are unusually detailed, which is why the
> reconstruction is worth having. What it cannot recover is the part the other summaries
> get from the session itself: **the probe table**. Which inversions were run, and how many
> cases each reddened, is not in any artifact. § 4 records what the specs preserve and says
> plainly where the record stops. The step-5 numbers in the status line above are the
> baseline measured at the start of that session, so they are direct evidence for this
> commit's state.

---

## 1. What was built

The binding: a schema plus a `FormGroup` becomes one `EvalSignal` per (field, property).
This is the step that made the library's premise executable — steps 1–3 built the entry
points, the shared core and the mirror, and none of them is reachable by a consumer.
Nothing in `eval-core` or `eval-signals` was touched.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `reactive/src/lib/field-schema.ts` | new | `FieldSchema`, `FieldProperties`, `bindFieldProperties`, `coerce`, `validate` (300 lines) |
| `reactive/src/lib/field-schema.spec.ts` | new | 28 declarations expanding to 35 cases — three are `it.each` over prototype names — across six blocks plus a standalone case (553 lines) |
| `reactive/src/public-api.ts` | edit | the three symbols of § 5 — without which the spec's subpath import does not resolve |
| `phase-4-plan.md` | edit | § 3.4.4, § 3.4.1's narrowed justification, § 5, step 4's exit criteria, three open questions |

`coercion.ts` and `error-policy.ts` were **not** written here — both arrived in step 2
(`7fbef49`), and `field-context.ts` in step 1 (`5e26f14`). Step 4 is their first consumer,
which is what turned § 5's `EvalSignal<unknown>` into `EvalSignal<boolean>` /
`EvalSignal<string>`.

### The mechanism, in one paragraph

`validate` runs first, over both the schema and the group. Then one `createControlSource`
for the whole form, and per field one `createFieldContext(formSource, {})` and one
`createEvalSignal` per rule the schema supplied, each wrapped by `coerce` — a second
`computed` that applies `toVisible` / `toText` while preserving `invalidate`, `destroy` and
a live `dependencies` getter. The error policy defaults to `'undefined'`, resolved locally
rather than forwarded absent.

---

## 2. Design questions settled during the step

Three of the plan's open questions carried an explicit "decide in step 4", and all three
were settled in the plan before the code was written.

- **8.3 — validate the schema at construction: yes, three checks.** Duplicate field name,
  non-string `visible` / `text`, and a name that resolves off `Object.prototype`; plus
  8.5's half, a control that is not a `FormControl`, which falls out of the same read
  rather than being a fourth check. The decisive argument is § 3.4.3's third precedence
  layer: a server-supplied field named `constructor` resolves off the prototype ahead of
  both sources, every rule reading it is wrong with no error anywhere, and this is the only
  layer that can name the offending field. **Three is the boundary, not a starting point**
  — growth toward a schema language is a stop-and-replan.
- **8.5 — a nested group or `FormArray`: a thrown error**, not a documented limitation.
  Unsupported nesting otherwise surfaces as a confusing evaluation result far from its
  cause, which is the failure mode 8.3 exists to remove.
- **8.1 — what `visible` means: recorded, not acted on.** It stays a boolean and the
  consumer's template decides; whether the README carries a rendering recommendation is
  step 6's call, and step 4 declined to pre-empt it.
- **The field half of each context ships as `{}`.** What a field-local key set should
  *contain* is specified nowhere in the plan, and inventing three keys to fill a parameter
  is how a public surface acquires members nobody chose. The cost is stated rather than
  left to be found: **§ 3.4.3's precedence rule ships untested end to end** — asserted at
  the core in `field-context.spec.ts`, but no `/reactive` path produces a field-local key.
- **§ 5 amended on both halves of one sentence**: the type arguments became `boolean` and
  `string` because § 3.6's coercion found its home in the core, and the two members became
  optional because the schema's rules are — which is why every consumer and every spec
  reads them through `?.`.

---

## 3. Two plan claims corrected against measurement

Both are in the commit message, and both are the kind of correction that would have
produced a green-but-vacuous spec if taken on trust.

- **"`user.name.first` raises a `TypeError`" — it does not.** Measured across nine forms
  before amending: `member-expression.ts` resolves a member of `undefined` through
  `safeGetProperty`, which returns `undefined` rather than throwing, so **no member access
  in this evaluator throws at all**. What throws is a *call* — `user.name.first()` raises
  `Error('Cannot call undefined or null function')` from `call-expression.ts`'s `safeCall`.
  The criterion stands with the expression changed and the error class corrected to plain
  `Error`. It also got sharper: the guard is exactly why a rule merely *naming* a missing
  field resolves `undefined` on its own and would pass with no error policy at all, which
  leaves the throwing case as the only discriminating one.
- **One-context-per-field is not observable through an in-walk leak**, because
  `createEvalSignal` already contains one. Two setups were measured and rejected before the
  third was written: `((country) => country.x.y)(1)` does not throw at all by the
  correction above, and `((country) => country())(1)` throws and is *contained* —
  `createEvalSignal` marks `ctx.scopes.length` before the walk and drains back to it in a
  `finally` (phase-3-plan § 3.8.3). Both leave a **shared** context passing the case. What
  is reachable is § 3.8.3's uncontained form: an arrow that escapes the walk and is called
  after the `finally` ran, which through this library's surface needs the escape hatch to
  be in the form — a control whose value is a function that stores its argument.
  **Consequence recorded rather than acted on**: one context per field still ships, but its
  justification on the `/reactive` path is narrower than § 3.4.1 claims.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-forms:lint` | clean |
| `eval-forms:test` | 4 suites / 83 tests (was 3 / 48) |
| `eval-forms:build:production` | clean; both entry points present |
| `eval-signals:lint` / `:test` | clean / 5 suites / 97 tests, unchanged |
| `eval-core:lint` / `:test` | clean / 41 suites / 717 tests, unchanged |

### Probes — what the record preserves

**No probe table survives**, and reconstructing one from the specs would be inventing it.
What the spec comments do preserve is the harder half of the same discipline — three
setups rejected *before* an assertion was written, each because the discriminating
condition was unreachable from the fixture:

- the two arrow-function forms of § 3, rejected because a shared context passes both;
- the prototype-name case, where a schema naming `constructor` over a group that **has**
  such a control makes the check indistinguishable from an ordinary field — the
  discriminating setup is a group with no such control;
- the one-mirror-per-form count, added because a per-field mirror produces identical
  *values* in every other case in the file.

This is the pattern CLAUDE.md's "the probe checks the assertion, check the setup
separately" describes, applied three times in one step.

### Review

Two findings recorded in the plan, both real:

- **A control named off `Object.prototype` is not rescued by the mirror** — a belief this
  plan had encoded **twice**. The mirror does define an own accessor for `constructor`, but
  the record is reached through `lookups` (step 4 of `EvalContext.get`) while `original` —
  the empty field source — is read at step 2 with a bare property access. Measured: the
  accessor is present and the expression still reads
  `function Object() { [native code] }`. So the third check runs over *control* names as
  well as schema names, and the control case is worse than the schema one because the value
  genuinely exists.
- **A bind that throws part-way leaves its subscriptions open** — `validate` runs before
  the mirror, so a *schema* rejection opens nothing, but a **parse** error cannot be
  validated ahead of the loop and `createEvalSignal` compiles eagerly. Not fixable inside
  step 4 as the plan then stood, so it became an added criterion of step 5, where it was
  closed. (Step 5 also overturned the premise attached to it — releasing the mirror needed
  no handle from `createControlSource`; see [`step-5-summary.md`](./step-5-summary.md) § 2.)

Also recorded during the step: **enforcement is construction-time only, and that is a
limitation rather than a guarantee.** `validate` reads `group.controls` once; an
`addControl` afterwards reaches `sync` → `open` with no check, and throwing from there is
not available, because a throw inside the `group.events` subscriber unsubscribes it and
silently ends all diffing for the life of the form.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.4.4 records that a parse error is not covered by `ExpressionErrorPolicy` in any
  mode** — `createEvalSignal` compiles eagerly, so `visible: 'country ==='` throws from the
  factory. This matters more here than upstream, because § 0's premise is a rule typed by
  an end user and a syntax slip is the commonest way such a rule is bad. Step 6's README
  states it.
- **§ 3.4.1's justification is narrowed** on the `/reactive` path, with the rule kept and
  the three reasons for keeping it named.
- **§ 5's `FieldProperties` type arguments and optionality**, and step 4's own file list
  gaining `public-api.ts`.
- **Step 5 gained the throwing-bind criterion.**

### 5.2 Noticed, not fixed

- **§ 3.4.3's precedence rule is untested end to end**, and stays so until a phase has a
  consumer for a field-local key — the `/signals` adapter (§ 9) is the likely one, and it
  is additive: a second argument that stops being `{}`.
- **`toSignal` opens with `assertNotInReactiveContext`**, so `bindFieldProperties` throws
  out of the mirror if called inside an `effect()` or `computed()`, with an error naming
  `toSignal` and nothing naming this library. First noticed in step 3, confirmed
  undischargeable in step 5, and now a step 6 README line.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing; carried from [`step-1-summary.md`](./step-1-summary.md) § 5.2 unchanged.

### 5.3 Still carried from earlier phases

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive`; `EvalService.simpleEval` never draining `_activeStates`; the arrow-scope
leak's escaped-closure path — which this step is the first to *exercise*, as a fixture
rather than as a defect — and its uncontained form on the unshipped `/signals` path
(§ 9.1). All are `eval-core` / `eval-signals` and § 2 forbids fixing them from here.
