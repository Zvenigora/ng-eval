# Phase 1 — Step 4 Summary: Read hooks

**Date**: August 10, 2026
**Plan**: [`phase-1-plan.md`](./phase-1-plan.md) § 4, Step 4 (design in § 3.5)
**Target package**: `@zvenigora/ng-eval-core` (`modules/eval-core`, v0.2.5)
**Commit**: pending — not committed
**Status**: complete — lint clean, 39 suites / 674 tests green, production build clean

---

## 1. What was built

`EvalHooks` gained its second hook kind. Node hooks report *that* a node was visited; read
hooks report *which key was resolved against the context, and off what object* — the thing
finding 1.2.5 says the AST node alone cannot tell you, and the actual prerequisite for
Phase 3's dependency tracking. Two emission points, both already isolated in the code.

| File | Kind | Contents |
| :--- | :--- | :--- |
| `internal/classes/eval/eval-hooks.ts` | edit | `EvalReadKind` / `EvalReadEvent` / `EvalReadHook`; the `_read` registry with `onRead` / `offRead` / `dispatchRead`; `EvalHookError.phase` widened; `handleError` signature refactored |
| `internal/classes/eval/public-api.ts` | edit | exports the three new read types |
| `internal/classes/eval/eval-hooks.spec.ts` | edit | **+326/−1**; new `read hooks` block, 24 cases |
| `internal/visitors/identifier.ts` | edit | module-private `emitRead`; emission in both the case-sensitive and case-insensitive branches |
| `internal/visitors/member-expression.ts` | edit | module-private `readPath`; emission at all three `evaluateMember` returns; hoisted `resolvedKey` |
| `internal/visitors/read-hooks.spec.ts` | **new** | 38 cases, 586 lines — the exit criterion's coverage |
| `docs/side-effects/phase-1-plan.md` | edit | § 3.5 corrected and extended per the decisions in § 2 below |

The single deletion in `eval-hooks.spec.ts` is line 2's import statement. No assertion was
relocated, weakened or removed.

### API added

```ts
// published via internal/classes/eval/public-api.ts → src/public-api.ts
export type EvalReadKind = 'identifier' | 'member';

export interface EvalReadEvent {
  readonly kind: EvalReadKind;
  readonly node: AnyNode;
  readonly state: EvalState;
  readonly key: string | number | symbol;   // post-case-correction
  readonly target: unknown;                 // context, EvalScope, or plain object
  readonly path?: string;                   // static dotted path, else undefined
  readonly value: unknown;
}

export type EvalReadHook = (event: EvalReadEvent) => void;

class EvalHooks {
  onRead(hook: EvalReadHook): Unsubscribe;
  offRead(hook?: EvalReadHook): void;
  dispatchRead(event: EvalReadEvent): void;
}
```

### API changed

```ts
interface EvalHookError {
  readonly phase: EvalHookPhase | 'read';   // was EvalHookPhase
}
```

A read is neither of the two node phases, and reporting one as `'before'` or `'after'`
would mislead anything reading the error log. § 5 sanctions the widening: nothing is
published before the `0.3.0` bump, so it is free now and breaking later. It needs a line in
step 6's `CHANGELOG.md` entry — a consumer switching over `'before' | 'after'` stops being
exhaustive.

`handleError` also changed shape, from `(event, error, unwinding)` to
`(state, phase, nodeType, error, unwinding)`, so reads and nodes can share it. Private;
behaviour-preserving, including the `'throw'`-while-unwinding downgrade.

### Behaviour worth recording

- **`dispatchRead` touches no bookkeeping.** A read is not a frame — it happens *within* a
  node's `before`/`after` pair — so it never calls `enter` / `exit` and cannot perturb the
  open-node stack. This matters more than it looks: step 3's summary § 5.2 flagged that
  `exit` has no mark to bound its scan and that *this* step's new emission points were the
  likely way to make that reachable by accident. They do not.
- **The value stack is untouched too.** Every emit sits after the last `popVisitorResult`
  for the node's children and before the `return` / `pushVisitorResult`, so the
  push-one/pop-one-per-child arithmetic is unchanged on all five sites.
- **`evaluateMember`'s return tuple is unchanged on all three branches.** Only the *event*
  carries the corrected key; `resolvedKey` is written nowhere else. This is load-bearing —
  `call-expression.ts:144`, `assignment-expression.ts:56` and `update-expression.ts:30` all
  destructure that tuple, and all three still get identical values.
- **Reads are emitted for assignment and update targets**, because `evaluateMember` is
  where the emission lives and those visitors call it. Intended: resolving `a.b = 1`'s
  target genuinely reads `a`, and filtering it would lose a real dependency on the object
  being written to. It is also what makes the exit criterion reachable at all —
  `cat.action(…)` resolves its callee through the call-expression path, never through
  `memberExpressionVisitor`.
- **`callExpressionVisitor` evaluates arguments before the callee**, so a method call's
  own reads arrive *last*. Surprising enough that it cost a wrong assertion before the code
  corrected it; pinned explicitly.

---

## 2. Design questions settled during the step

Six raised before implementing, all answered, all now written into § 3.5.

| Question | Ruling |
| :--- | :--- |
| Identifier `key` under `caseInsensitive` — § 3.5's table said `node.name`, its own doc comment and the step's spec bullet said *corrected* | Corrected wins: `getKey(node.name) ?? node.name`, inside the guard. § 9 is the contract Phase 3 builds against; § 3.5's table was an earlier sketch, and was fixed as part of this step. |
| Plain-object member branch discards its corrected `foundKey` | `foundKey ?? key` in the event, return tuple untouched. |
| Reads fire for assignment / update targets | Implement and record as *intended*, not as a wart — see above. |
| Emit for `this`? | **No.** It resolves to the context object itself, not a key within it; emitting would have a tracker record a dependency on the whole context and re-fire on every change. `This.Three` still yields a member event with key `three`, which is the real dependency. Not dead code: acorn produces a `ThisExpression` only for the lowercase keyword, so `This` under `caseInsensitive` is a live `Identifier`. |
| Does `onRead` latch `isActive`? | Yes — latch and count exactly like `on()`. The visitors reach their emission points through the same `EvalState.hasHooks` guard, so a non-latching `onRead` would mean a read-hooks-only consumer received nothing. |
| Error policy shape for reads | Widen `EvalHookError.phase` rather than pick a misleading `'before'` / `'after'`. |

### Three investigations requested with the confirmation

- **Is `evaluateMember`'s `EvalScope` branch reachable from the named specs?** **No** —
  confirmed empirically, not by reading. A namespaced `EvalScope.get` returns its wrapped
  `context` object, never the scope itself, so `cat.action(…)` and `global.pow(…)` land in
  the plain-object branch; the spec asserts `not.toBeInstanceOf(EvalScope)` on those
  targets. The branch is reached only when a context *value* is itself an `EvalScope`.
  `read-hooks.spec.ts` hand-builds such a context, with a comment saying why it is not
  redundant with the namespaced cases.
- **Do literal-registry resolutions emit?** Yes. `TrUe` / `Undefined` / `null` resolve off
  the module-private `literals` registry rather than the context, so `getKey` cannot correct
  the spelling and the source name stands in. Under-reporting a read is the worse failure;
  a consumer that does not want constants can filter them.
- **Is `target` a stable identity across evaluations?** **Partly — § 9.1 is too strong as
  written.** It holds for member reads: a plain context is copied into a fresh `Registry`
  per evaluation under `caseInsensitive`, but the entries still reference the caller's
  objects, so `foo.bar` reports the same `context.foo` every run. It does **not** hold for
  identifier reads, whose target is `st.context` — a new `EvalContext` per evaluation
  whenever the caller passes a plain object instead of reusing an `EvalContext`. Phase 3
  therefore cannot key on `(target, key)` alone for bare identifiers across runs. Asserted
  both ways.

---

## 3. Deviations from the plan's literal sketch

| Deviation | Reason |
| :--- | :--- |
| `offRead` added, not in the plan | The unsubscribe closure needs a removal path, and `clear()` must drop read hooks. Mirrors the already-public `off`; § 5 constrains types, not methods. |
| `dispatchRead(event)` takes the built event, rather than positional arguments | Seven positional parameters otherwise. It also keeps the whole allocation inside the visitor's `st.hasHooks` guard, so the no-hooks path builds nothing. |
| `readPath` lives in `member-expression.ts`, not `eval-hooks.ts` | It is AST reconstruction and only that file needs it; `eval-hooks.ts` stays free of AST walking and keeps its type-only import of `EvalState`. |
| `docs/side-effects/phase-1-plan.md` edited, though not in the step's file list | § 3.5's emission table was wrong (see § 2) and had to be corrected before the code could disagree with it. Explicitly requested. |
| `eval.service.global-scope.spec.ts`'s paths covered too, though the exit criterion names only two specs | The scope spec alone never reaches an `EvalScope` with `global: true`. Cheap to add, and the `global` path is the one Phase 4 forms work will lean on. |

---

## 4. Verification

| Gate | Result |
| :--- | :--- |
| `npx nx run eval-core:lint` | 0 errors, 0 warnings; no `eslint-disable` added |
| `npx nx run eval-core:test` | 39 suites / 674 tests (baseline 38 / 612, so +1 suite and +62 tests) |
| `npx nx run eval-core:build:production` | clean; `EvalReadKind` / `EvalReadEvent` / `EvalReadHook` verified present in the emitted `types/zvenigora-ng-eval-core.d.ts` barrel |
| `internal/performance.spec.ts` | green |

**Exit criterion** — *"read events cover every path exercised by `eval.service.scope.spec.ts`
and `eval.service.case-insesitive.spec.ts`"* — **met**, with one reading stated openly.

`read-hooks.spec.ts` carries a describe block per named spec, rebuilding each one's context
and driving its expressions:

- **`eval.service.scope.spec.ts`** — both of its cases (`cat.action(args, cat.num, "times")`
  and `Dog.Says()`), plus assertions on the resolved target and key, plus the two cases from
  `eval.service.global-scope.spec.ts`.
- **`eval.service.case-insesitive.spec.ts`** — its 65 `it.each` rows reduce to a smaller set
  of distinct *read-resolution* paths, and each is covered: identifier correction
  (`IsArray`), literal registry (`TrUe`, `Undefined`), computed literal index (`LiSt[3]`),
  computed expression index (`NumMap[1 + 2]`), nested chain correction (`SUB.SUB2.DATE`),
  context-self member (`This.Three`), prototype-chain correction (`list.FIND`), and optional
  chaining on both a present (`Foo?.Bar`) and a nullish (`UnKnown?.x`) base.

"Every path" is read as every read-resolution path, not all 65 expressions verbatim. Flagged
rather than assumed.

### Review

`code-reviewer` was run at the exit criteria. **No Critical findings.** It independently
verified both stack invariants, the unchanged return tuple across all four `evaluateMember`
callers, the `handleError` refactor's equivalence (including the unwinding downgrade), that
`readPath` yields `undefined` rather than a *wrong* path on every shape tried
(`PrivateIdentifier`, `Super`, `ThisExpression`, call bases, inner computed hops), and that
nothing beyond the three intended types became reachable on the published surface.

Three of its notes were about weak assertions in specs written *this* step and were fixed
before closing: a vacuous "emits nothing when no read hook is registered" case rewritten to
register-then-unsubscribe (which exercises the latched-but-empty path instead of nothing at
all), a repeated-`offRead` case that passed with or without the flag it was testing, and a
missing `path` assertion on the `this.a` shape.

---

## 5. Open items carried forward

### 5.1 Raised by review, deliberately not acted on

All three change what Phase 3 can rely on, so per CLAUDE.md they belong in the plan document
before they belong in code. **Settle these before step 5 builds `createDependencyTracker()`
on top of this contract.**

- **`st.hasHooks` is the wrong granularity for the read guard.** It is true when *any* hook
  is registered, so a consumer with only `before` / `after` hooks now pays
  `st.context.getKey(node.name)` per identifier and `readPath(node)` plus an object literal
  per member — all discarded. `getKey` is not cheap: under `caseInsensitive` it reaches
  `getContextKey`, which materialises the entire key array per scope and scans it linearly,
  for every scope, then `original`, then every prior scope. This becomes live in step 5,
  whose `trackTime` deliberately latches `hasHooks` for the whole walk — those callers asked
  to time every node, not to build read events they cannot observe. The fix is a
  **non-latching** `hasReadHooks` on `EvalHooks`, guarding as
  `st.hasHooks && st.hooks.hasReadHooks`. Non-latching is safe precisely because
  `dispatchRead` touches no bookkeeping: a value that flips mid-walk can only drop read
  events, never unpair `enter` / `exit`. That asymmetry with § 3.6's latch argument is worth
  writing into § 3.7 alongside the change. Step 4's bullet literally says
  `if (st.hasHooks)`, so the plan needs amending first. Nothing currently pins the expensive
  case.
- **Optional chaining reports a synthetic `{}` as `target`.** `evaluateMember`'s
  `node.optional ? (obj || {}) : obj` manufactures a fresh empty object for a nullish base,
  so `UnKnown?.x` carries a target that never existed in the caller's data and differs on
  every evaluation — § 9.1's identity promise silently fails there. `path` survives
  (`'UnKnown.x'`), so path-based tracking still works. Current behaviour is pinned by spec
  and commented; changing it to report the real nullish base should be a decision, not a
  drive-by.
- **Arrow-function parameters emit as ordinary context reads.**
  `arrow-function-expression.ts:16` pushes params as a scope on the *same* `EvalContext`, so
  `list.FIND(v => v === 3)` emits `key: 'v'`, `path: 'v'`, `target: st.context` — shape-
  identical to a genuine context read. A tracker will record loop-local bindings unless it
  filters them, and `path` strings from different arrow bodies collide with each other and
  with same-named context paths. Pinned by spec. § 3.5 should either say Phase 3 filters
  these, or a later step teaches the event to flag them.

### 5.2 Noticed, not fixed

- **`EvalContext.getKey` cannot correct a namespace.** It searches *inside* each prior
  scope's context, never its `namespace`, so `Dog.Says()` reports `key: 'Dog'` uncorrected
  while the member hop correctly reports `says`. Pinned by spec and recorded in § 3.5.
  Fixing it changes an exported method's behaviour, so it wants its own step and a
  `ROADMAP.md` entry alongside step 3's deferred visitor defects — **not added here**, since
  `ROADMAP.md` was not in this step's file list.
- **`getKey` and `get` do not resolve through the same chain.** `getKey` omits the
  `_lookups` loop that `get` runs, so an identifier resolved by a lookup resolver reports
  its spelling uncorrected. Separately, `get` skips a key whose value is `undefined` and
  continues to prior scopes and lookups, while `getKey` returns the first spelling it finds
  — so under `caseInsensitive` the reported key can come from a different source than the
  value did.

### 5.3 Still carried from earlier steps

Unchanged by this step: nothing drains the open-node stack (step 6, from step 2 § 4.2),
`ASYNC_HOOK_MESSAGE`'s `{@link}` dangles for consumers (step 6, from step 1), the
options-first style cannot read `hookErrors` (§ 3.6, deferred to Phase 3), and step 3's
three `ROADMAP.md` visitor-layer defects remain open — `await-expression.ts` downgrading a
synchronous throw, `update-expression.ts` desynchronizing under `preserveParens`, and
`import-expression.ts`'s dead `afterVisitor`.
