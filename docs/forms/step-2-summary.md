# Phase 4 — Step 2 Summary: The shared core, and the constraint that keeps it shared

**Date**: August 17, 2026
**Plan**: [`phase-4-plan.md`](./phase-4-plan.md) § 4, Step 2
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.0.1)
**Commit**: `7fbef49`
**Status**: complete — `eval-forms` lint clean, 3 suites / 33 tests, `build:production` clean
with both entry points; `eval-core` unchanged at 41 suites / 717 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

The core's real behaviour, and the property that makes § 9 possible. `createFieldContext`
stopped being a composition sketch and became the composition; the two other core pieces
shipped alongside it. Nothing in `eval-core` or `eval-signals` was touched.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `src/lib/field-context.ts` | edit | the form half borrows upstream's resolver — § 3.4.2 candidate A |
| `src/lib/error-policy.ts` | **new** | `ExpressionErrorPolicy`, the type only |
| `src/lib/coercion.ts` | **new** | `toVisible` / `toText` — § 3.6 |
| `src/public-api.ts` | edit | the barrel gains both new modules |
| `src/lib/field-context.spec.ts` | edit | precedence (4), live key set (3), form half (3), the `LogicFn` shape (1), the characterization block (2) |
| `src/lib/coercion.spec.ts` | **new** | 9 cases across the two rules |
| `phase-4-plan.md` | edit | § 3.4.2's fork settled, § 1.3's register, step 2's file list |

Published surface added: `toVisible`, `toText`, `type ExpressionErrorPolicy`. The emitted
`zvenigora-ng-eval-forms.d.ts` was read after the build and contains exactly those three
plus `createFieldContext` — nothing leaked through the two new `export *` lines.

### Behaviour worth recording

- **Borrowing a resolver is a spread, not a copy, and the spread is the robust form.**
  `context.lookups.push(...createSignalContext(formSource, options).lookups)` survives
  upstream pushing more than one resolver; `push(ctx.lookups[0])` would silently drop the
  rest. The second context is discarded and only the closure survives — the arrow at
  `signal-context.ts:198` captures `source` and `caseInsensitive` and nothing else, so
  § 3.4.1's count is still one `EvalContext` per field.
- **`warnOnNestedSignals` now runs once per field over the same form source.**
  `createSignalContext` calls it unconditionally, so a form of N fields scans the form
  record N times and, in dev mode, would emit N identical warnings attributed to
  `createSignalContext` — a function the consumer never called. Construction-time only;
  no per-node or per-recompute path is touched. Written into § 3.4.2 so step 4 does not
  meet it as a mystery in the console.
- **The `undefined` fall-through discriminates the *mechanism*, not the *order*.**
  Reversing the two lookups turns three precedence cases red and leaves the fall-through
  case green; the joined record turns the fall-through case red. They are different
  probes catching different assertions, and neither substitutes for the other.
- **Candidate B turns four cases red, not one.** § 3.4.3's "only one discriminates" is
  about the joined record, not about A/B — § 3.4.2's table already listed four differing
  rows. Both unwrapping cases, the `caseInsensitive` case and the `LogicFn` tracking case
  go red under B, the last because `country === "US"` compares a function to a string and
  yields `false` on every recompute. That is the silent freeze, executed rather than
  argued.
- **The repo's edit hook enforces zero lint warnings per edit**, so an import and its
  first use have to land in the same write. Adding four imports to a spec and then
  filling in the cases as a second edit is blocked between the two.

---

## 2. Design questions settled during the step

- **§ 3.4.2's fork: A, on row 2 of its table — not on condition 1 failing.** The
  distinction is what decides whether the fork can reopen. Condition 1 (§ 3.5 naming a
  liveness mechanism for a plain-value record) is *unmet* today, and had that been the
  reason, B would return the moment step 3 named one. It is not the reason: B is **wrong**,
  because a form key holding `signal(undefined)` comes back as the signal function, which
  is truthy, so `visible: "country"` renders its field precisely when the value is absent —
  on every form's first render. No liveness mechanism repairs a wrong return value.
  Recorded in the plan and in the code comment in those terms.
- **`error-policy.ts` ships without a spec, by decision rather than omission.** It exports
  a type and no runtime symbol, so `tsc` is the whole enforcement and any spec would be
  CLAUDE.md's vacuity rule in its limiting case. Written into the plan's step-2 file list.
- **The spec-level import exemption is labelled where a reviewer will look.**
  `field-context.spec.ts` imports `createEvalSignal` and `createSignalContext`, neither of
  which the *core* may import. § 5 already exempts specs; the file now says which check it
  is exempt from and why, because a reviewer running the § 3.4.5 import-list check will
  otherwise see those names under `src/lib/`.

---

## 3. Deviations from the plan's literal sketch

- **Three files were added to step 2's list rather than reported as deviations**, on
  instruction: `src/public-api.ts` (§ 5 publishes the new symbols, so the barrel edit
  follows from the deliverable), `field-context.spec.ts` and `coercion.spec.ts` (CLAUDE.md
  requires them). The plan now lists all six, plus the no-spec note for `error-policy.ts`.
- **The first joined-record probe was invalid and was re-run.** It replaced the field half
  with `{ ...formSource, ...fieldSource }` and *left the pushed form lookup in place*, so
  the fall-through still had a form half to reach and the case it existed to discriminate
  stayed green. A probe of a *mechanism* has to remove the whole mechanism; removing half
  of it produces a green that reads as "the assertion is vacuous" when it means "the probe
  was". Re-run properly, it turned six cases red including the fall-through.
- **No other deviation.** Every source file in the commit is on step 2's list.

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `eval-forms:lint` | clean |
| `eval-forms:test` | 3 suites / 33 tests |
| `eval-forms:build:production` | clean; primary `.d.ts` exports exactly § 5's four symbols, `/reactive` exports only `createControlSource` |
| `eval-signals:lint` / `:test` | clean / 5 suites / 97 tests, unchanged |
| `eval-core:lint` / `:test` | clean / 41 suites / 717 tests, unchanged |
| Import list (§ 3.4.5) | `@angular/core` absent from `src/lib/` non-spec files; `@angular/forms` absent; eval-signals imports are `createSignalContext` + `SignalContextSource` |

### Probes

Named, not counted.

| Inversion | Cases that went red |
| :--- | :--- |
| Form half reverted to candidate B | `› should unwrap a signal in the form half`; `› should resolve a form key holding signal(undefined) to undefined`; `› should correct a form key under caseInsensitive`; `the /signals shape › should track per key through a LogicFn-shaped call` — **four**, and the last is the silent freeze |
| Form half `unshift`ed ahead of the field half | `precedence › should resolve a colliding key to the field`; `› should show the form value once the field key is removed`; `› should give precedence back to the field when its value appears`. The `undefined` fall-through stayed green — it does not discriminate order |
| Form source copied at construction | `the live key set › should resolve a form key added after construction`; `› should not recompute for a key that appeared after it read as missing` |
| True joined record — joined **and** the second lookup removed | six, including `precedence › should fall through to the form value for a field key holding undefined`, which the half-probe above had left green |
| `toText` blanking every falsy value | `toText › should stringify the falsy values that are not null or undefined`, alone |
| `toVisible` special-casing the string `'false'` | `toVisible › should treat a non-empty string as visible, including "false"`, alone |

One assertion resisted probing: the recompute count in
`precedence › should give precedence back to the field when its value appears` pins
*upstream's* read-the-signal-then-return-`undefined` behaviour, and no plausible mutation
of this library's code inverts it. Its non-vacuity rests on the `LogicFn` case's negative
half, which shows the counter genuinely does not tick without a tracked dependency.

### Review

`code-reviewer` reported **no Critical findings**. Two Warnings and two Notes were closed
inside the step's own files:

- the `caseInsensitive` cases asserted only `context.get`, which calls exactly the half
  that works — both now also assert through the walk, matching the pairing upstream's own
  case-insensitivity specs use;
- `› should give precedence back to the field when its value appears` did a write followed
  by a read on one tick, which returns the new value whether or not a dependency was ever
  recorded. It now counts recomputes through a `computed()`, so the comment's reactivity
  claim and the assertion finally agree;
- the prototype-shadowing comment had lost step 1's caveat that the guard is unreachable
  (`get` consults `original` first), leaving a comment that read as a security property
  this library does not have. Restored;
- `expect(toText(true)).toEqual(true.toString())` mirrored the implementation. Now `'true'`.

Two Notes became plan edits rather than code edits — § 5.1 below.

---

## 5. Open items carried forward

### 5.1 Written into the plan after the step

- **§ 3.4.2 records the fork as settled**, with the row-2 reason stated as a correctness
  decision rather than an unmet precondition, and the measured probe result (four red
  under B; precedence and liveness green under both).
- **§ 3.4.2 also records the N× `warnOnNestedSignals` scan** that candidate A brings, so
  step 4 inherits it rather than rediscovering it.
- **§ 1.3 gained a row.** Borrowing the resolver relies on something the six existing rows
  do not state: that `createSignalContext` installs its resolver into the returned
  context's public `lookups`, and that the resolver is self-contained — it closes over the
  source and ignores the `context` / `options` arguments `EvalLookup` passes it. Unpinned
  upstream, but pinned by *our* specs, so it needs no second characterization block.
- **Step 2's file list gained the three files of § 3**, plus the no-spec note.

### 5.2 Noticed, not fixed

- **`createControlSource`'s record shape is still open** and § 3.5 still owes the answer.
  A made both shapes *safe*; it did not choose between them. Step 3's decision.
- **The `hasOwnProperty` guard on the form half remains unreachable by test** — now
  upstream's guard rather than ours, but for the same reason: `get` consults `original`
  first. The comment says so again.
- **`eval-core`'s Jest run warns "a worker process has failed to exit gracefully".**
  Pre-existing; carried from [`step-1-summary.md`](./step-1-summary.md) § 5.2 unchanged.

### 5.3 Still carried from earlier phases

Unchanged by this step: `SignalContextWriteError.key` reading `undefined` under
`caseInsensitive`; `EvalService.simpleEval` never draining `_activeStates`; the arrow-scope
leak's escaped-closure path, and its uncontained form on the unshipped `/signals` path
(§ 9.1). All are `eval-core` / `eval-signals` and § 2 forbids fixing them from here. The
`createSignalContext` liveness this library depends on is still unpinned upstream — but it
is now pinned *here*, by the characterization block this step shipped.
