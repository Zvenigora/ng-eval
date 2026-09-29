# A20 — delete `EvalService._activeContexts`

Plan and step in one, for [`docs/backlog.md`](../backlog.md) [A20](../backlog-retired.md#a20). Drafted
against `cffae78`.

## Objective

`EvalService` must keep no reference of its own to a context passed to `createState`,
`simpleEval` or `simpleEvalAsync`. After [A21](../backlog-retired.md#a21)'s fix, `_activeContexts` does
nothing but hold those references until `ngOnDestroy`, so this step deletes it.
`_activeStates` is [A8](../backlog-retired.md#a8), and this step leaves it as it is.

## What the tree says

**Every use of the field.** These are all in
[`eval.service.ts`](../../modules/eval-core/src/lib/actual/services/eval.service.ts):

| Line | Use |
| ---- | --- |
| 17 | declaration |
| 47 | `add`: the argument, when it has a `type` |
| 53 | `add`: `argument['context']`, when that has a `type` |
| 113 | `clear()` in `ngOnDestroy` |

No line reads an entry. The field is private and `EvalService` has no subclass. Outside this
file, only
[`eval.service.memory-leaks.spec.ts:76-89`](../../modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts#L76-L89)
names it. **So the entry's claim holds: after A21 nothing is left but the drain.**

**Downstream.** Neither `eval-signals` nor `eval-forms` names the field. The one probe of this
service's private state, the contrast case in
[`eval-signal.memory.spec.ts:80-112`](../../modules/eval-signals/src/lib/eval-signal.memory.spec.ts#L80-L112),
reads `_activeStates.size` and nothing else. Its `simpleEval` calls pass a signal context,
which is an `EvalContext` and so enters `_activeContexts` today. But the probe counts states, so
removing the field leaves it at 5.

**What `:76-89` pins.** It asserts that the set is non-empty after a `simpleEval` on a
`Registry`, and empty after destroy. The first assertion pins the retention this step removes.
The second is about a field that will not exist. Neither can be rewritten against the new code,
so the case is **deleted**, and the new cases below replace what it claimed to cover. The
entry already said this ("It goes when the field goes").

**The finding: deleting the field does not, by itself, stop the service retaining the
context.** `createState` puts the state it builds into `_activeStates` in the same call that
puts the context into `_activeContexts`. The state's `_context` is the `EvalContext`: the
caller's own one, or one whose `_original` is the caller's argument. It has no setter. The two
sets fill together and drain together, in `ngOnDestroy`. So while A8 stands, **almost every
context in `_activeContexts` is also reachable through a state in `_activeStates`**, for the
same lifetime. For those, deleting the field changes nothing a consumer can observe.

**The exception is `caseInsensitive`.** *(Corrected during the step, from the code-reviewer's
finding. The draft said "every context", and named only a contrived exception.)* When
`caseInsensitive` is set, `fromContext` copies a plain object into a new `Registry`, and the
state holds the copy, not the argument. The set added the caller's object itself, because the
test was `'type' in context`, which also finds an inherited `type`. So for a plain object or a
class instance that has a `type` and is evaluated case-insensitively, `_activeContexts` was the
**only** thing keeping it alive. It is now collectable with A8 still in place. That is not
contrived. A21's case 4 uses that shape (`{ type: 'order', … }`), and `type` is a common field
name. A21's plan recorded the copy, and this draft missed what it meant here. The contrived
exception remains: a registry nested under a wrapper's `context` key that the caller later
replaces. Under `caseInsensitive`, the copy keeps the nested reference.

The step is still right. The field has no use, and deleting it is what lets A8's fix release
contexts. If A8 were fixed first, `_activeContexts` would keep every context that has a `type`
alive by itself. The dependency runs the other way from how A8 records it. **So A20 is a precondition of A8's fix
being complete, not independent of it.** A8 is updated below.

**The criterion has to be worded against that.** "The service does not retain the context"
would be false after this step. The true claim is narrower: the service retains the context
only through a state that A8 retains. So cases 1–4 below drop A8's references by hand, as their
setup. Case 6, the control, leaves them in place and observes the retention. Case 5, the
`caseInsensitive` one, leaves them in place too, since there the fix is observable today.

**The instrument.** [A19](../backlog.md#a19) rejected a `WeakRef` probe for A12. It had two
reasons. The defect there was allocation-shaped, and Jest has no `global.gc`. Neither reason
applies here. A20 is retention-shaped, which is exactly what a `WeakRef` detects. And `gc` is
reachable from inside Jest: `v8.setFlagsFromString('--expose-gc')`, then
`vm.runInNewContext('gc')`. Checked before drafting, in a throwaway spec under the `jsdom`
environment: in 20 of 20 runs, an unreferenced object was collected and a referenced one was
kept. The flag is switched off again once `gc` is in hand, so contexts that Jest builds later do
not get a `gc` global.

## Design

Deletions only, in `eval.service.ts`:

- the field;
- the whole context block in `createState` (both `add`s and the `type` checks around them);
- `_activeContexts.clear()` and its comment in `ngOnDestroy`;
- the `Registry` import, which only the two casts used.

The `createState` docblock stops saying that it tracks contexts.

## Scope and files

`modules/eval-core` only, plus the docs that cite the field.

- `modules/eval-core/src/lib/actual/services/eval.service.ts`
- `modules/eval-core/src/lib/actual/services/eval.service.memory-leaks.spec.ts`: `:76-89`
  deleted, a new `describe` added, and A21's docblock no longer names the field
- `docs/backlog.md`: A20 (fixed) and its index row, and A8 (the dependency, and a third spec it
  must update). Also the line citations into `eval.service.ts` that this deletion moves: A8's
  two, B3's one and A5's four `EvalService` rows. A5's rows were already two lines stale.
- `docs/a20/plan.md`: this file
- `CHANGELOG.md`: `[Unreleased]`, `### Fixed`

**Category:** fix. The field is private, so no exported symbol changes shape: no bump and no
manifest change. **A `CHANGELOG.md` entry**, for the `caseInsensitive` case above, where
retention changes now. *(Corrected during the step. The draft said no entry, on the premise
that nothing observable changed.)* It says plainly that other contexts are still retained
through their states until A8 is fixed.

## Exit criteria

All cases live in a new `describe` in `eval.service.memory-leaks.spec.ts`. The setup of each is
a context built inside a closure that returns only a `WeakRef` to it. Then the setup clears
`_activeStates` (A8's references), except in cases 5 and 6, yields a macrotask, and forces a full
GC. Each case names the wrong implementation it excludes.

1. **`createState`.** A `Registry` holding `a: 10`, passed to `createState` and walked with
   `eval('a * 2', state)` → `20`. The registry is collected. *Excludes:* today's code.
2. **`simpleEval`.** Three `simpleEval('a + 1', registry)` calls, each → `11`. The registry is
   collected. *Excludes:* tracking moved out of `createState` into `simpleEval`. That passes 1 and
   fails here, and in 4.
3. **Nested `context` key.** `createState({ context: registry })`. The nested registry is
   collected. *Excludes:* deleting only the top-level `add`.
4. **An `EvalContext`.** An `EvalContext` over `{ a: 10 }`, passed to `simpleEval` → `11`. It is
   collected. This is the shape `eval-signals` documents. *Excludes:* a fix scoped to A20's
   title, which stops tracking registries and keeps tracking every other context. That passes
   1–3 and fails here. *(Corrected during the step. The draft said this case excluded
   "narrowing the set to `Registry` instances". The probe showed the reverse: a set narrowed to
   registries still retains registries, so 1–3 catch it and this case stays green.)*
5. **`caseInsensitive`, A8 in place.** `simpleEval('total * 2', { type: 'order', total: 10 },
   { caseInsensitive: true })` → `20`. The caller's object is collected, **without** clearing
   `_activeStates`. *Excludes:* today's code, observed with nothing held out. This case is the
   reason for the `CHANGELOG.md` line, and it survives A8's fix unchanged. *(Added during the
   step, from the code-reviewer's finding.)*
6. **Control: A8's path.** Case 1's fixture, with `_activeStates` left intact. The registry is
   **not** collected. This shows two things: the instrument can see retention in this fixture,
   and a state is now the only thing holding the context. *Excludes:* a vacuous 1–4, where the
   registry is collectable whatever the service does. If A8 is fixed, this is the case that goes
   red. It is deleted then, along with the `_activeStates` clear in the setup.

Deleted: `:76-89`, per the reasoning above. Unchanged and still green: `:91-104` (A8's set is
tracked and emptied), A21's five cases, and the trace, hook and bookkeeping drains.

Probe: restore each wrong implementation in turn and read which cases go red.

The gate is `npx nx run-many -t lint test build`, all three projects.

## What was checked

- **Red first.** Against `cffae78`, cases 1–4 failed on their target assertion: `deref()`
  returned the registry, or the `EvalContext`, that the field held. The control passed. Case 5
  was added after the review. It was checked against the old tracking, restored as a probe, and
  failed the same way, with `_activeStates` intact.
- **Probes** of the finished code, one at a time. Each was reverted before the next.

  | Wrong implementation | Red |
  | -------------------- | --- |
  | today's tracking restored, both `add`s | 1–4; 5 too, once added |
  | only the nested `add` restored | 3 only |
  | both `add`s narrowed to `instanceof Registry` | 1–3 |
  | registries exempted, every other context tracked | 4 only |
  | tracking moved from `createState` into `simpleEval` | 2, 4; 1 and 3 stay green |
  | `_activeStates.add` removed, which stands in for A8 being fixed | the control, plus six drain cases that need a tracked state |
  | the instrument: `gc()` not called | 1–4 |

  The other probe rows ran before case 5 existed. Rows 2 and 4 are why cases 3 and 4 exist: no
  other case catches them. Row 5 is caught by case 4 as well as case 2, so case 2 is not uniquely
  load-bearing. It stays as the only fixture that passes a `Registry` through `simpleEval`
  repeatedly. The last row shows that the passes depend on the collection, not on the fixture.
- **The flag.** After `--no-expose-gc`, `runInNewContext('typeof gc')` is `'undefined'`, and
  so is the suite's own global. Checked with a temporary case, since removed.
- **Stability.** The spec file ran ten times in a row on Node 26 locally, twice: 28 of 28 each
  time before case 5, and 29 of 29 each time after it. The code-reviewer ran it five times on Node 24.5.0, and all passed each time,
  along with the full eval-core suite under `--runInBand`. This is the one place the step
  depends on GC behaviour, and it is the risk [A19](../backlog.md#a19) raised about GC-event counts. The
  failure mode is different here, though. A forced full GC either collects an unreachable object
  or it does not, and no threshold is involved.
- **Gate:** `npx nx run-many -t lint test build --skip-nx-cache` is green for all three projects.
  eval-core has 1069 tests (1064, minus the deleted `:76-89`, plus 6). eval-signals has 129 and
  eval-forms 251, both unchanged.
- **Code-reviewer**, before commit. It found the `caseInsensitive` gap that case 5 now covers.
  It also found one stale link, in A20's recorded text, to the deleted `:76-89`.
