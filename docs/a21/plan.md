# A21 — stop `EvalService.ngOnDestroy` clearing caller-owned contexts

Plan and step in one, for [`docs/backlog.md`](../backlog.md) [A21](../backlog.md#a21). Drafted
against `6da12da`.

## Objective

`ngOnDestroy` must stop mutating objects the caller supplied. The service may drop its own
references to them. It may not empty them.

## What the tree says

**Which contexts reach `_activeContexts`, and how.** `createState` adds two things
([`eval.service.ts:44-56`](../../modules/eval-core/src/lib/actual/services/eval.service.ts)),
both taken from the **argument** before any conversion:

1. the `context` argument, when it has a `type` property. That covers `Registry`,
   `BaseRegistry`, `CaseInsensitiveRegistry`, every `EvalContext` (it declares
   `type = 'EvalContext'`), and any plain object with a `type` key;
2. `context['context']`, when the argument has a `context` key whose value has a `type`.

`simpleEval` and `simpleEvalAsync` call `createState`. No other path adds to the set.

**Service-built and caller-supplied contexts are already distinguishable. The drain never reaches
a service-built one.** `EvalContext.fromContext` builds a new object in two cases: a `Registry`
copied from a plain object under `caseInsensitive`, via `Registry.fromObject`, and a `{}` for an
absent context. Both are stored at `EvalContext._original`. Neither is ever the argument, so
neither enters the set. The other drain, `state.context.clear()` in the per-state loop
([`:83-85`](../../modules/eval-core/src/lib/actual/services/eval.service.ts)), targets an
`EvalContext`, and `EvalContext` has no `clear` ([A17](../backlog.md#a17) records this). So:

- **Every entry in `_activeContexts` is caller-owned.** Nothing needs recording. The
  distinction is structural.
- **No service-built context has ever been drained.** The brief's criterion "a service-built
  context is *still* drained" rests on the opposite assumption. It is replaced below.
- **Line 83 is not dead.** It fires on one kind of object: a caller's `EvalContext` subclass that
  declares a `clear`. `fromContext` returns such an object by identity. That object is also
  caller-owned and also in the set, so it is cleared **twice**. It is the same defect as A21 on a
  second line.

**What breaks if the drain stops.** Nothing that is owned by the service. Every object the loop
clears is one of two kinds:

- unreachable once `_activeContexts.clear()` drops the service's reference, so clearing it first
  releases nothing;
- still held by the caller, so clearing it is the data loss.

In one case clearing did release memory: an expression that assigned an arrow function *into*
the caller's registry, whose closure captures the state. But the caller holds that function, and
calling it needs that state. That is a live reference, not a leak.

**Downstream.** `eval-signals`' `SignalEvalContext` and `eval-forms`' field context are
`EvalContext`s with no `clear`, so today's drain already skips them. `eval-signals` documents
passing one to `simpleEval`. Neither library passes a `Registry` to `EvalService`, and
neither reads `_activeContexts`. The only reader outside `eval.service.ts` is
`eval.service.memory-leaks.spec.ts:76-89`, which pins that the set is **emptied**. That still
holds.

## Design

Two deletions in `ngOnDestroy`. Nothing is added.

- The `_activeContexts` loop that calls `clear()` on each entry. The trailing
  `_activeContexts.clear()` stays: dropping the service's references is the service's own
  business.
- The `state.context.clear()` call in the per-state loop. That is an edit inside the loop that
  iterates `_activeStates`, not to the set. **Membership, additions and the set's drain are
  untouched** ([A8](../backlog.md#a8), [A20](../backlog.md#a20)).

**Not done: adding a drain for the service-built `Registry`.** It would be new behaviour, not a
fix. It is also not recoverable at destroy time: `state.context.original` looks the same whether
`createState` built it or the caller built it with `EvalContext.fromContext`. It would need a
record taken at `createState`. And it would release only a shallow copy of a context that the
caller already holds through the state. Worth a backlog entry only if someone asks for it.

**Effect on siblings.** [A20](../backlog.md#a20) becomes easier. After this step `_activeContexts`
has no reader but its own `clear()`. It is pure retention, so A20's fix can delete the field
outright, `createState` contexts included, instead of riding with A8. A8 is unchanged.
[A17](../backlog.md#a17) loses one of its five drains. The removed loop takes one of
[B3](../backlog.md#b3)'s three `console.warn` calls with it. That is not clean-up in passing:
the call has nothing left to guard.

## Scope and files

The code change is confined to `modules/eval-core`. Docs outside it are updated as cross-references.

- `modules/eval-core/src/lib/actual/services/eval.service.ts`
- `modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts`
- `docs/backlog.md`: A21 (fixed), A17 (four drains), B3 (two calls), and their index rows
- `CLAUDE.md`: the three-call count in Conventions
- `CHANGELOG.md`: `[Unreleased]`, `### Fixed`

**Category:** fix. It changes published behaviour but no exported symbol's shape, so no bump and
no manifest change.

## Exit criteria

All cases live in a new `describe` in `eval.service.memory-leaks.spec.ts`. Each case names the
wrong implementation it excludes.

1. **`createState` path.** A `Registry` holding `a: 10`, passed to `createState` and walked with
   `eval('a * 2', state)` → `20`. After `ngOnDestroy`, `registry.get('a')` is `10` and `has('a')`
   is true. The same fixture sets `maxTraceItems: 1`, and the state's trace is non-empty before
   destroy and empty after. *Excludes:* today's code. Also excludes a fix that skips any state
   whose context is caller-owned, which would stop draining what the service owns.
2. **`simpleEval` path.** Three `simpleEval('a + 1', registry)` calls, then destroy.
   `registry.get('a')` is `10`. *Excludes:* treating `simpleEval`'s contexts as the service's own
   because `simpleEval` built the state, which passes 1 and fails here.
3. **Nested `context` key.** `createState({ context: registry })`. The registry survives.
   *Excludes:* removing only the top-level `add` and keeping the nested one.
4. **A non-`Registry` caller object.** `{ type: 'order', clear: jest.fn(), … }` passed to
   `createState`. `clear` is never called. *Excludes:* an exemption keyed on `instanceof
   Registry` or on `isRegistryContext`'s type strings.
5. **A caller's `EvalContext` subclass with `clear`.** `clear` is never called. *Excludes:*
   removing the `_activeContexts` loop and leaving line 83.

Unchanged and still green: `:76-89` (the set is emptied), and the trace, hook and bookkeeping
drains (`:121`, `:288`, `:304`, `:318`).

Probe: restore each deleted line in turn and read which cases go red.

The gate is `npx nx run-many -t lint test build`, all three projects.

## What was checked

- **Red first.** All five failed against `6da12da`, each on its target assertion: `get('a')`
  received `undefined` in 1–3, and `clear` was called once in 4 and **twice** in 5, which
  confirms two drains reaching one object.
- **Probes** of the finished code, one at a time. Each wrong implementation was reverted before
  the next.

  | Wrong implementation | Red |
  | -------------------- | --- |
  | line 83 restored | 5 only |
  | the context loop restored | 1–5 |
  | the loop, exempting `instanceof Registry` | 4, 5 |
  | the loop, exempting `isRegistryContext`'s type strings | 4, 5 |
  | the loop, with the top-level `add` removed | 3, and `:76` (tracking) |
  | per-state drain skipped when the context is caller-owned | 1, at the trace assertion only; `:121` stays green |
  | the loop over `simpleEval`'s contexts only | 2, 4, 5; 1 stays green |

  The last two rows are why cases 1 and 2 each exist: no other case catches them.
- **Gate:** `npx nx run-many -t lint test build --skip-nx-cache` is green for all three projects.
  eval-core has 1064 tests (1059 + 5), eval-signals 129, eval-forms 251. The built FESM has two
  live `console.*` calls; the third match, `console.log(pattern`, is inside B2's comment.
