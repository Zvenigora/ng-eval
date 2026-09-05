# Phase 6 — Step 6 Summary: rejecting prototype-shadowed identifiers

**Date**: September 5, 2026
**Plan**: [`phase-6-plan.md`](./phase-6-plan.md) § 4, Step 6 — design in § 3.8 / § 3.8.1
**Target package**: `@zvenigora/ng-eval-forms` (`modules/eval-forms`, v0.1.0) — the `/signals`
entry point, plus the shared `package.json` manifest; `/reactive` and the primary entry point's
code are untouched
**Commits**: `e75d32b` (code and plan, revision 18)
**Status**: complete — all three projects green on lint, test and build; `eval-forms` 14 suites
/ 180 tests (from 13 / 165), `eval-core` unchanged at 43 suites / 735 tests, `eval-signals`
unchanged at 5 suites / 97 tests

---

## 1. What was built

A registration-time throw, which is the only new failure mode this phase introduces.

| File | Kind | Contents |
| ---- | ---- | -------- |
| `signals/src/lib/guard-identifiers.ts` | new | `guardIdentifiers`, module-private: `acorn-walk`'s `simple` over the AST the registrar already holds, throwing on any `Identifier` that is an own property of `Object.prototype` |
| `signals/src/lib/guard-identifiers.spec.ts` | new | 15 cases through a real `schema()` + `form()` |
| `signals/src/lib/rules.ts` | edit | The call site, inside `prepare`, between `parse` and `compile` |
| `modules/eval-forms/package.json` | edit | `acorn-walk ^8.3.0` into `peerDependencies`, at `eval-core`'s own range |
| `signals/src/lib/model-source.spec.ts` | edit | Prose only — the last stub-world sentence in the package (revision 17 item 2) |

**The guard, and the two lines that matter:**

```ts
simple(node, {
  Identifier(identifier) {
    if (Object.prototype.hasOwnProperty.call(Object.prototype, identifier.name)) {
      throw new Error(`Expression '${expression}': identifier '${identifier.name}' …`);
    }
  },
});
```

The failure it converts: `createSignalContext` builds its context on an empty `original`, and
`EvalContext.get` reads `original` **before** `lookups` — so `constructor` resolves off the
prototype and never reaches § 3.2.1's resolver. A function is truthy, so `toVisible` says
visible and `evalVisible(p.city, 'constructor')` renders a field with no data, no error and
nothing logged (Q11).

### Behaviour worth recording

**The check is on the expression, not on the field name, and that is forced rather than
chosen.** `/reactive` validates names because they arrive in its own `FieldSchema[]`; here the
paths are compile-time `p.city` tokens and the library never sees a name it could validate.
What it does see at registration is the expression — and the expression is the *complete*
subject, because a model key nobody names harms nobody. That is also why this check inherits
none of § 3.2.1's growing-key-set problem.

**It over-rejects deliberately, and the arm that proves it is the one that would otherwise have
gone unmeasured.** `'[1].map(valueOf => valueOf)'` throws even though an arrow's own frame is
genuinely safe — `EvalContext.get` resolves `scopes` at step 1 and `original` at step 2, so a
bound `valueOf` shadows the prototype and resolves correctly. Taken anyway: the scope-aware
alternative is a second copy of `eval-core`'s frame logic tracking two visitors this phase does
not own, and it fails by *under*-rejecting when it drifts.

**Two properties of the borrow are load-bearing and both are pinned.** `acorn-walk`'s base
walker descends into `node.property` only when `node.computed`, so `user.constructor` is
invisible to an `Identifier` visitor; and `base.Function` walks parameters under the `"Pattern"`
override, which `simple` suppresses, so a *binding* is never visited while a *reference* is.
A hand-rolled scan over every node rejects both cases — which is what the probe below confirms.

---

## 2. The documentation defect this step found in its own design

**A normative predicate standing beside an illustrative list, with nothing saying which
decides.** § 3.8 specified "an own property of `Object.prototype`"; § 3.8.1 wrote "**the name
set is seven**" and listed them. `Object.getOwnPropertyNames(Object.prototype)` is **twelve** —
the seven plus `__proto__` and the four `__define*` / `__lookup*` accessors.

Neither sentence is wrong on its own. Together they leave a reader unable to tell whether an
implementation hard-coding seven names satisfies the design, and that implementation **passes
every other criterion in the step**. The list was written to make a different point — that no
such name is natural as an arrow parameter, which is true of the seven and irrelevant for the
five — and it acquired normative weight by sitting next to a rule.

Revision 18 item 2 marks the predicate normative and the list illustrative. The durable half of
the fix is not the wording: it is the **added exit criterion**, one assertion on a name the
seven omit, so the wider reach is gated rather than incidental. Probe 1 below is what makes it
real.

---

## 3. Verification

`npx nx run-many -t lint test build`, cache skipped, all nine targets green. § 6's gates 1–7 all
pass. `/reactive`'s FESM is still exactly **25,748 bytes** — the step edits the shared
`package.json`, and this row is what confirms the manifest is not compiled into the bundle.
`dist/modules/eval-forms/package.json` carries `acorn-walk ^8.3.0` and **no `acorn`**, both arms
of the criterion. Gate 6's emitted `.d.ts` declares exactly § 5's four symbols; `guardIdentifiers`
appears in the FESM, as it must, and in no `.d.ts`.

**No published type changed**, so no version bump and no `CHANGELOG.md` entry are owed here. The
manifest's new peer does need both, and they are step 7's, along with the README `Versions`
block that quotes `peerDependencies` verbatim.

**No existing spec moved.** Step 5's § 4.4 flagged that a throw path enlarges the space
differently — every existing expression becomes a candidate for rejection — and the measured
answer is that none of them names a shadowed identifier, and none of the invocation counts
moved. Asserted by the 165 pre-existing tests staying green, not assumed.

### Probes

Seven mutations, each reported by **which named cases** went red.

| Mutation | Red |
| -------- | --- |
| Predicate hard-codes § 3.8.1's seven names | **exactly one** — `should throw on a name the illustrative seven omit` |
| Predicate uses `String.includes` | **exactly one** — `should register constructorName` |
| Predicate case-folds both sides | **exactly one** — `should register CONSTRUCTOR` |
| Hand-rolled recursive scan over every node | `should register a member expression naming a shadowed property` **and** `should register a bound name that is never referenced` |
| Guard wired into `evalVisible` alone | `evalText › should throw on constructor` **and** `evalDisabled › should throw on constructor`; `evalVisible`'s stayed green |
| Message names the identifier but not the expression | **exactly one** — `should name both the expression and the identifier` |
| Predicate matches `'constructor'` only | six name-dependent arms, by name |

**One plan claim was corrected by measurement.** Step 6's criterion says the three negative
names are proved by "a `String.includes` implementation passes the first three and fails these".
Measured, that implementation fails **only** `constructorName`: `'CONSTRUCTOR'.includes(...)` is
false for every prototype name, so `CONSTRUCTOR` survives it, and `country` survives everything.
All three arms are load-bearing — against three *different* wrong implementations, which is why
the case-folding probe had to be constructed separately. The criterion holds; its stated
rationale covered one arm of three. Recorded here rather than amended into the plan, because the
arms are what the plan is buying and they all discriminate.

**Review findings: no Critical, two Warnings, both fixed in the step.**

1. **The replacement for the stale comment was itself unresolvable.** Retiring
   `model-source.spec.ts:76-77` was the deliverable; the replacement pointed at
   `rules.model-source-count.spec.ts`, which counts `createModelSource` calls only and observes
   **neither** of the two counts the comment states. The spec carrying both is
   `rules.invocation-count.spec.ts`' *"one memo per factory and one context per rule per form"*.
   A prose fix that reproduces the defect in smaller form is the shape worth naming.
2. **The guard's `undefined` early-return comment claimed a reachable branch.** `prepare` passes
   `defaultParserOptions`, which sets `extractExpressions: false`, so `parse` returns the
   `Program` unconditionally and no call site in this package can produce `undefined`. The
   branch is correct and stays — the declared return type forces the narrowing — but the comment
   sent a reader looking for a spec that does not and should not exist.

---

## 4. Open items carried forward

### 4.1 Written into the plan after the step

**Revision 18**, three items: why one call site in `prepare` satisfies "every registrar calls
it" *here* and is not revision 16's rejected argument; § 3.8.1's predicate/list correction and
the exit criterion it adds; and item 3 below.

### 4.2 The one finding that outlives this step

**A criterion can be falsifiable only by something you do not own — and it will read like a gate
on your step.**

Step 6's second exit criterion is "the throw surfaces from `form()`, not from `schema()`". The
spec asserts it, the assertion is meaningful, and it *can* go red. But no mutation of
`guard-identifiers.ts` or of its call site moves the throw: the registrars run only when Angular
runs the schema body, and Angular decides when that is. The case pins **Q8's measurement of a
dependency**, so it goes red when Angular changes — which is a decay detector for a future
upgrade, not evidence about this step's code.

This is a third category beside the two § 0.2 already carries. § 0.2.1 is a criterion attached
to nothing that can fail; § 0.2.3 is a probe whose subject grew around it. This one is a
criterion whose subject was never ours.

**The danger is not the case — it is what the case appears to cover.** It looks like the thing
that pins registration-time-not-derivation-time, and it is not. What actually pins that is a
property of the whole file: **no arm reads field state**, so a guard moved from `prepare` into
the returned `LogicFn` would leave `form()` silent and take all eight rejecting arms red. That
invariant is real and load-bearing and is carried by no assertion named for it.

**Generalisable form, and it is cheap**: for each criterion, name the mutation that reddens it
*before* writing the assertion. If the only answer is "a dependency changes", the criterion is a
decay detector — keep it, label it, and go find what actually gates the invariant it looks like
it gates.

### 4.3 Noticed, not fixed

- **§ 3.8.1's "`/reactive` **throws** on this today" is false** — `/reactive` throws on a field
  or **control name**, not on an expression, so `visible: "constructor"` over a schema of
  `city`/`country` renders the data-less field there too. § 3.8's residual paragraph states this
  correctly and § 3.8.1's closing paragraph contradicts it. Recorded as revision 18 item 3 and
  handed to **step 7**, which owns the dependent README caveat; not rewritten in step 6, because
  re-deriving a shipped decision's justification is not a step's job when the decision itself is
  unaffected. Q11 carries the decision to ship; § 8.2's symmetry principle does not.
- **The asymmetry is consumer-visible.** `/signals` is now **stricter** than `/reactive`, and
  the reader who does not know is the one in `/reactive`'s documentation, where the behaviour is
  the silent one. Step 7's README row grew from three edits to four for this.
- **Step 2's three carried items are unchanged by this step** — the un-called top-level signal
  value, the unfalsifiable `typeof key === 'string'` guard, and the two dead lookups running
  ahead of ours.
- The `worker process has failed to exit gracefully` warning on `eval-forms:test` still predates
  this step.

### 4.4 For step 7 specifically

- **Order matters within the step**: correct § 3.8.1's closing paragraph **first**, then write
  both README halves from the corrected version. The README caveat is currently written from
  the false sentence.
- **`ROADMAP.md` gains a Phase 8 question** — should `/reactive` reject prototype-shadowed
  identifiers in expressions too? **Logged, not decided.** It is a behaviour change to a
  released entry point: an expression that registers today would start throwing, so it needs a
  phase, a major-version decision and a migration note. A docs step deciding it is how a
  breaking change ships without one.
- **The manifest's new peer needs three things, in three files**: the `CHANGELOG.md` entry under
  a heading naming the package, the version bump, and the README `Versions` block — which quotes
  `peerDependencies` verbatim at `README.md:59-69` and would otherwise reproduce a manifest the
  package no longer has. Its lead-in at `:59` also still reads "The package declares **one**
  peer range, at the floor".
- **Gate 6's expected list does not change in step 7** — no symbol is added. Gate 4's byte count
  should also be unchanged, since step 7 ships no code.
