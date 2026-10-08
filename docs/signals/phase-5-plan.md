# Phase 5 Plan — async expression signals (`@zvenigora/ng-eval-signals`)

**Date**: October 7, 2026
**Revision**: 1
**Target package**: `@zvenigora/ng-eval-signals` (`modules/eval-signals`, published at 0.4.0)
**Also touches**: `@zvenigora/ng-eval-core` — one test-only step, no release; `@zvenigora/ng-eval-forms`
— a peer-range patch at release, no code
**Depends on**: Phase 3 ([`phase-3-plan.md`](phase-3-plan.md)) — § 3.7 is the deferral this plan
answers, § 3.3.1, § 3.8.2 and § 3.8.3 are the mechanisms it reuses, § 6.1 the spec discipline it
re-derives
**Source**: [`ROADMAP.md`](../../ROADMAP.md) § Phase 5
**Objective**: Decide, on measured evidence, whether `eval-signals` ships an async signal and in what
shape — and if it ships, plan the steps that build it.

**Conclusion, stated first so the rest reads as its argument**: ship it, as
`createEvalSignalAsync`, built from two `computed`s and one `signal` rather than from `resource()` or
an `effect`. `await` stays out of expressions. No `eval-core` code changes, no peer range narrows,
and nothing in the release is breaking.

---

## 1. Current state of the code

### 1.1 What exists today

| Element | Where | State |
| :--- | :--- | :--- |
| Async evaluation | `evaluateAsync`, `internal/functions/evaluate.ts:206-270` | Runs the same synchronous `walk.recursive` as `evaluate` (`:232`), then `await awaitAllPromises(value)` (`:244`) |
| Promise resolution | `awaitAllPromises`, `evaluate.ts:168-198` | Resolves a promise, and recursively the elements of an array and the values of a plain object (`constructor === Object`) |
| Rejection shaping | `ensureError`, `evaluate.ts:141-163` | An `Error` passes through by identity; a string, `null`, `undefined` or object becomes a new `Error` |
| Compile once, call per run | `compileAsync` / `callAsync`, `internal/functions/compile.ts:25`, `:48`; `CompilerService.compileAsync` / `.callAsync`, `compiler.service.ts:227-308` | Published. `compileAsync` shares `compile`'s LRU/TTL cache under the same key |
| `await` | `awaitVisitor`, `internal/visitors/await-expression.ts`; registered at `recursive-visitors.ts:32` | Pushes a promise as its value and lets the walk continue — § 1.2 findings 2–4 |
| Parser defaults | `defaultParserOptions`, `internal/classes/eval/parser-options.ts:4-9` | `ecmaVersion: 2020`, `allowAwaitOutsideFunction` left at acorn's `null`. Top-level `await` is a `SyntaxError` |
| Sync signal | `createEvalSignal`, `modules/eval-signals/src/lib/eval-signal.ts` | Carries a promise-valued expression's promise as its value, untouched — pinned by `eval-signal.spec.ts:946-1036` and `readme-examples.spec.ts:278` |
| Async signal | — | None. The README's "Async expressions" section (`modules/eval-signals/README.md:274-310`) documents the composition and three limits |
| `eval-forms` | `modules/eval-forms` | **No async use**, measured: `Async`, `resource(` and `rxResource` match nothing in any `.ts` file of the project, specs included. Its upstream imports are `createEvalSignal`, `EvalSignal`, `createSignalContext`, `SignalContextSource` and `SignalContextWriteError` from `eval-signals`, and `defaultParserOptions`, `parse`, `compile`, `call`, `EvalContext`, `EvalOptions`, `EvalState` and `stateCallback` from `eval-core` |

The baseline test counts are whatever the gate reports at this plan's commit; step 1's green-baseline
run (`.claude/skills/step/SKILL.md` § 1) records them, rather than this document carrying numbers
that rot.

### 1.2 Findings that shape the design

Each finding cites the probe that measured it — listed with its result in § 1.3 — or the file and line
that shows it.

1. **The walk has finished by the time an async entry point returns its promise, and a walk that
   threw is already recorded.** `evaluateAsync` is an `async` function whose first `await` is after
   the walk (`evaluate.ts:244`), so calling it runs the whole traversal synchronously. Measured
   (P3): every context read the walk makes has happened when `CompilerService.callAsync` and
   `EvalService.evalAsync` return, and the scope stack is back at its starting depth with an arrow
   called during the walk. Measured (P6): when the walk throws, `state.result.isError` is already
   `true` at return and `state.result.error` is the object the promise later rejects with.

   **Nothing pins either property.** The eval-core README states the first ("The walk is synchronous
   even under `evalAsync`", `modules/eval-core/README.md:237`), but every async case in the suite
   `await`s before it asserts (`hooks.spec.ts:380-415`, `eval.service.async*.spec.ts`), so an `await`
   point added before the walk would leave the suite green. Phase 3 § 3.7 called this "a design
   invariant of the current walker rather than a guarantee". Everything in § 3.3–§ 3.5 rests on it, so
   step 1 turns it into a guarantee.

2. **`await` in operand position evaluates to wrong answers, silently** — handed finding 1,
   reproduced exactly (P1). Parsed with `ecmaVersion: 2022` and `allowAwaitOutsideFunction`, through
   `simpleEvalAsync`, context `{ p: Promise.resolve(2), q: Promise.resolve(3) }`:

   | Expression | Result |
   | :--- | :--- |
   | `await p` | `2` |
   | `[await p, 1]` | `[2, 1]` |
   | `await p + 1` | `"[object Promise]1"` |
   | `await p + await q` | `"[object Promise][object Promise]"` |
   | `(await p) * 10` | `NaN` |

   `awaitVisitor` pushes a promise and the walk continues with it as an operand; only promises left in
   the result tree are resolved, at the end. The two right answers are right only because their
   `await` sits where the promise reaches the result unchanged.

   **`ROADMAP.md` § Phase 5 is wrong twice here, and this plan is where it is corrected.** It calls
   `await` "a parser-options question rather than evaluator work". It is evaluator semantics: turning
   the parser option on ships the table above. And it says acorn's `allowAwaitOutsideFunction` is
   "off below 2022". The version is not the gate. Acorn's `canAwait` (`acorn/dist/acorn.js:634-641`)
   allows top-level `await` in a script only when `allowAwaitOutsideFunction` is set, at any
   `ecmaVersion`. Measured (P1b): `ecmaVersion: 2020` with the flag parses `await p`; `2022` without
   it, in script mode, is a `SyntaxError`. The finding as handed to this plan put the refusal down to
   `ecmaVersion: 2020`, which is the same misreading. The `eval-signals` README's wording — the parser
   runs "at `ecmaVersion: 2020` without `allowAwaitOutsideFunction`"
   (`modules/eval-signals/README.md:299-300`) — is accurate.

3. **`await` already reaches the walk today, on default options, with the same semantics.** Inside an
   `async` arrow it parses at `ecmaVersion: 2020`, and the arrow visitor ignores `async`. Measured
   (P1c): `(async () => (await p) * 10)()` is `NaN` through both `simpleEval` and `simpleEvalAsync`;
   `(async () => (await u).name)()` is `undefined`; `(async () => 1)()` is `1`, not a promise. The
   `eval-signals` README offers this form as the way to use `await`
   (`modules/eval-signals/README.md:300-301`), and `eval-signal.spec.ts:998-1012` pins it in the one
   position where it is right. This is an `eval-core` defect that exists whatever Phase 5 decides,
   so it is recorded as [BL-A24](../backlog.md#a24), not solved here (§ 3.1 says why).

4. **`awaitVisitor` carries three hazards of its own** — handed finding 2, reproduced (P2, P2b).
   Recorded as [BL-A25](../backlog.md#a25); what each design option does to them is in § 3.1.
   - **A 30 s timer per `await`, never cleared.** One `setTimeout(…, 30000)` per evaluation of the
     node and no `clearTimeout` (`await-expression.ts:14-20`, `:56-59`). Under Angular's zone the
     timer outlives the evaluation: `NgZone.hasPendingMacrotasks` was `true` after the result had
     settled and `false` only once the timeout elapsed; with no `await` in the expression it was
     `false` straight after. An application waiting for stability — server rendering, `whenStable` —
     waits out the timer.
   - **An undocumented context key.** The timeout is read from `context.original['__awaitTimeout']`
     (`await-expression.ts:50-53`). Measured from a plain-object context and from an `EvalContext`'s
     `original` alike.
   - **The caller's error object is mutated.** A rejection that is an `Error` is the caller's own
     object, by identity, and `" at position …"` is appended to its `message`
     (`await-expression.ts:67-69`) — once per evaluation that sees it: a shared error read
     `boom at position 0-12 at position 0-12` after two. `eval.service.await.spec.ts:82` pins the
     suffix (`'later at position 0-17'`).

5. **`awaitAllPromises` resolves less than "nested promises" suggests, and copies more.** Measured
   (P4): promises nested in arrays and plain objects are resolved at any depth (`[[p], {x: [p]}]` →
   `[[7], {x: [7]}]`). A promise **inside a promise's resolved value** is not — the resolved value is
   not walked again — and neither is one inside a `Map`, a class instance or a null-prototype object.
   And **every plain object and array in the result is rebuilt**, promise or not: `simpleEvalAsync('obj',
   { obj })` is equal to `obj` and not identical to it. So an object-valued async expression is a new
   object on every run, and the default `Object.is` equality never dedupes it.

6. **Angular's stability floors, read from the published `.d.ts` of each major** (D1; `npm pack` of
   `@angular/core` 19.0.0, 19.2.25, 20.0.0, 20.3.33, 21.0.0, 21.2.25 and 22.0.0, outside the repo):

   | API | 19.x | 20.x | 21.x | 22.x |
   | :--- | :--- | :--- | :--- | :--- |
   | `resource` | `@experimental` | `@experimental 19.0` | `@experimental 19.0` | **`@publicApi 22.0`** |
   | `effect` | `@developerPreview` | **`@publicApi 20.0`** | `@publicApi 20.0` | `@publicApi 20.0` |
   | `PendingTasks` | `@developerPreview` | **`@publicApi 20.0`** | `@publicApi 20.0` | `@publicApi 20.0` |
   | `signal`, `computed`, `untracked` | untagged | untagged | untagged | untagged |

   Handed finding 3 holds: `resource` is stable from **22.0** and experimental through 21.2.25. Two
   more facts came out of the same reading:
   - **Phase 3 § 3.7's table is wrong about the second shape.** It costs `signal` + `effect` at "None
     beyond Angular 16". `effect` is developer preview throughout 19.x, so that shape's stable floor is
     **20**. The table was "Phase 5's starting point, not a decision it inherits", and this is the
     correction.
   - **`resource`'s option is `request` at 19 and `params` from 20.0.0** (`ResourceLoaderParams` in
     19.2.25 against 20.0.0). The README's composition, `resource({ params: …, loader: ({ params }) =>
     … })` (`modules/eval-signals/README.md:284-290`), does not compile at 19, which the package's
     `>=19.0.0` peer range admits. Recorded as [BL-C6](../backlog.md#c6); step 4 closes it.

   `PendingTasks.add(): () => void` has the same signature at 19.0.0, 20.0.0 and 22.0.0; its `run`
   changed shape between 19 and 20 and is not used here.

7. **Per-key tracking survives wherever the walk runs inside a reactive context, and dies in a
   `resource` loader** (S1, at the installed 22.2.1). One fixture — `load(id)` over a signal context
   holding `id` and an unread `other` — driven four ways, counting walks:

   | Where the walk runs | `other` changes | `id` changes |
   | :--- | :--- | :--- |
   | Inside a `computed` over `callAsync` | no walk | one walk, `user-2` |
   | `resource` `loader` | — | **no walk; value stays `user-1`** |
   | `resource` `params`, loader awaits it | no walk | one walk, `user-2` |
   | `effect` body | no walk | one walk, `user-2` |

   The loader row is the silent freeze Phase 3 § 3.7 warned about, now measured rather than read from
   Angular's source. The three tracked rows share one fixture with it, so they are the arms that make
   it discriminate.

8. **A run started inside a `computed` does not hold application stability; `resource` does**
   (S2, under `provideZonelessChangeDetection()`). With the loader's promise held unresolved,
   `ApplicationRef.whenStable()` had resolved within 50 ms for the `computed` arrangement and had not
   for `resource`. Adding `PendingTasks.add()` around the run in the `computed`, released when it settles,
   made it wait. Under zoneless server rendering, an async signal that skips this renders before its
   data arrives.

9. **Angular's own async contract, from the 22.2.1 typings** (`ResourceStatus` and `Resource<T>`):
   `loading` — "a change in its reactive dependencies", `value()` is `undefined`; `reloading` — "the
   same reactive dependencies", the previous value is kept; `idle` — "will not perform any loading",
   `value()` is `undefined`. On `error` the file disagrees with itself: `Resource.value`'s comment says
   it "throws an error if the resource is in an error state", the `ResourceStatus` comment beside it
   says `value()` "will be `undefined`". A consumer who knows `resource` knows these words, and § 3.4
   adopts them; for `error` it keeps this library's own `onError` contract, which covers both readings.

10. **`eval-forms` parses with `defaultParserOptions` directly** (`signals/src/lib/rules.ts:198`,
    `reactive/src/lib/field-schema.ts:219`). A change to those defaults is a change to which rule
    strings both adapters accept, not only to the async path.

11. **The parse cache ignores parser options** (P5). `ParserService.parse` merges per-call options
    (`parser.service.ts:122`) but caches under the expression string alone (`:135`). After one
    `ParserService.parse('await p', { ecmaVersion: 2022, allowAwaitOutsideFunction: true })`, the
    default-options `EvalService.simpleEval('await p')` stopped throwing and returned a promise.
    Recorded as [BL-A26](../backlog.md#a26). It bears on any design that parses the async path with
    options of its own (§ 3.1).

12. **The sync path's promise pass-through is discriminated, in `eval-signals`.** Phase 3 § 3.7's "no
    spec in the repo would fail if the sync path started resolving promises" was true when written; Phase 3
    step 6 added identity assertions against the promise the context function returned
    (`eval-signal.spec.ts:946-996`) and a README-executed case (`readme-examples.spec.ts:278-296`).
    `eval-core` itself still has no discriminating case: `eval.service.async.spec.ts`'s table 21 `await`s
    the sync result (`:36-47`). The `eval-signals` specs reach `eval-core`'s `call` end to end, so the
    behaviour is pinned; this plan changes nothing on the sync path.

### 1.3 Probes run for this plan

Throwaway specs at d080707 — `modules/eval-core/src/lib/actual/services/zz-phase5-probe.spec.ts` and
`modules/eval-signals/src/lib/zz-phase5-probe.spec.ts` — run through `nx test` with
`--testPathPatterns`, results written to a scratch file, both **deleted before this plan's commit**.
D1 read the tarballs with a script outside the repo.

| ID | Question | Result |
| :--- | :--- | :--- |
| P1 | Handed finding 1 | Reproduced exactly — § 1.2 finding 2's table |
| P1b | Which option gates top-level `await` | `allowAwaitOutsideFunction`: 2020 + flag parses; 2022 without it does not; the default service throws `SyntaxError: Unexpected token (1:6)` |
| P1c | `await` inside an `async` arrow, default options | Parses. `(async () => (await p) * 10)()` → `NaN` (sync and async entry points); `(async () => await p)()` → a promise (sync) / `2` (async); `(async () => (await u).name)()` → `undefined`; `(async () => 1)()` → `1` |
| P2 | Handed finding 2 | `setTimeout` delays `[30000]`, `clearTimeout` calls `0`; `__awaitTimeout: 20` → "Await expression timed out after 20ms at position 0-12", from a plain object and from `EvalContext.original`; a shared `Error` read `boom at position 0-12 at position 0-12` after two evaluations; the rejection is the caller's object by identity |
| P2b | Does the timer outlive the evaluation in Angular's zone | `hasPendingMacrotasks`: `false` before, **`true` after the result settled**, `false` after the 150 ms timeout; `false` straight after an evaluation with no `await` |
| P3 | Has the walk finished when `callAsync` returns | Yes — all seven reads (`a`, `b`, `b`, `f`, `list`, `a`, `a`) present at return, none added by settlement; scope depth `0` → `0`; same through `EvalService.evalAsync` |
| P4 | What `awaitAllPromises` resolves and copies | Resolves in arrays and plain objects at any depth; not inside a resolved value, a `Map`, a class instance or a null-prototype object; plain objects and arrays are **not** returned by identity |
| P5 | Does the parse cache honour options | No — a permissive `ParserService.parse` made the default `simpleEval('await p')` return a promise instead of throwing |
| P6 | Is a walk failure visible before settlement | Yes — `state.result.isError` `true` at return, `isSuccess` `false`, and the rejection is `state.result.error` by identity; a succeeding walk reports neither until it settles |
| S1 | Tracking per placement | § 1.2 finding 7's table |
| S2 | Stability under zoneless | `computed` run: stable before resolve. `resource`: not. `computed` + `PendingTasks.add`: not. (Angular logs `NG0914` because `test-setup.ts` loads zone.js; expected.) |
| D1 | Stability tags and `resource` option names per major | § 1.2 finding 6; also `ResourceStatus`, an `enum` at 19.2.25 and a string union from 20.0.0, `@experimental` at 21.2.25 |

---

## 2. Scope

### In scope

- `createEvalSignalAsync(expression, source, options?)` and `EvalSignalService.createAsync`, returning
  an `EvalSignalAsync<unknown>`: an `EvalSignal` plus a `status` signal (§ 3.2, § 3.4).
- Resolution of promises in the result exactly as `evaluateAsync` does it (§ 3.7), rejections
  through `onError` with its existing contract (§ 3.4), staleness and out-of-order resolution, and
  `destroy()` during a run.
- Cancellation: an `AbortController` per run, reachable by the expression's own functions under a key
  the consumer names (§ 3.6); stability through `PendingTasks` (§ 3.2).
- A test-only `eval-core` step pinning § 1.2 finding 1 (step 1).
- README, CHANGELOG, and the `eval-forms` peer-range patch the release forces (§ 3.8).

### Out of scope

- **Top-level `await`, and any change to what `await` means** — § 3.1 decides it. The `async`-arrow
  path stays as it is; [BL-A24](../backlog.md#a24) owns it.
- **Any `eval-core` source change.** [BL-A25](../backlog.md#a25) and [BL-A26](../backlog.md#a26) are
  `eval-core` defects that Phase 5 neither needs fixed nor makes more reachable (§ 3.1). If a step
  finds it needs a core change, that is a stop-and-replan, as it was in Phase 3 § 2.
- **`defaultParserOptions`** — unchanged; finding 10 is why that matters beyond this package.
- **A `resource()`- or `effect()`-based shape** — § 3.2.
- **`reloading` / stale-while-revalidate, `set` / `update` / `local`, and an `error` signal** — § 3.4
  and § 8.
- **The sync path.** `createEvalSignal`'s behaviour, including its promise pass-through, does not
  change.
- **Async validators or any async rule in `eval-forms`.** Nothing there asks for one (§ 1.1).
- **Async hooks, and [BL-E4](../backlog.md#e4)'s interceptors.** The walk stays synchronous, so the
  hook contract (`modules/eval-core/README.md:235-247`) is untouched and E4's door stays as it is.

---

## 3. Design

Phase 3 § 3.7 left eight decisions and three gaps. Where each is settled:

| Inherited from Phase 3 § 3.7 | Here |
| :--- | :--- |
| The driver is not a `computed()` — re-establish Phase 3 § 3.1's tracking | § 3.2, § 3.3 |
| First-read value | § 3.4 |
| Staleness and out-of-order resolution | § 3.4 |
| Rejection surfacing through `onError` | § 3.4 |
| In-flight cancellation at `destroy()` against Phase 3 § 3.8.2 | § 3.4, § 3.6 |
| `dependencies` with more than one run in flight | § 3.4 |
| Where Phase 3 § 3.8.3's scope-depth guard goes | § 3.5 |
| The spec harness | § 6.1 |
| Gap: no `await` in an expression | § 3.1 |
| Gap: nested promises not resolved | § 3.7 |
| Gap: `onError` never sees a rejection | § 3.4 |

### 3.1 `await` in operand position — decided: keep it out

**Option A — make the walker suspend.** A real async walk: an `await` stops the traversal and resumes
it with the resolved value.

- *Cost.* The walker is `acorn-walk`'s `walk.recursive` (`evaluate.ts:96`, `:232`), which is
  synchronous, so it is replaced, not extended. All 26 registered node types
  (`recursive-visitors.ts:27-55`) and their 27 `beforeVisitor` call sites — counted with `grep` at
  d080707, per CLAUDE.md's warning about these totals — are rewritten against it, and the
  three stack invariants (CLAUDE.md, "The evaluation model") are re-proved for a walk that other code
  can interleave with. `evaluateAsync` already releases the walk base and depth *before* its one
  `await` because "an independent evaluation that interleaved on this state [would look] like a nested
  walk" (`evaluate.ts:225-230`) — a suspending walk holds them across every `await`. The hook contract
  is published as synchronous (`modules/eval-core/README.md:235-247`, `ASYNC_HOOK_MESSAGE`) and
  breaks. `performance.spec.ts` gates the sync path, so the sync walker stays and there are two.
  [BL-E4](../backlog.md#e4)'s interceptor would need an async dispatch point. A breaking `eval-core`
  release, in the package the other two are built on.
- *What it buys this library: less than it costs, and the decisive reason is tracking.* Angular records
  reads during a synchronous run. After a walk's first suspension every read is outside the reactive
  context — the same mechanism that freezes a `resource` loader (finding 7). So `(await a) + b` would
  track `a` and silently not `b`. A perfect async walker still delivers an async signal that stops
  updating for some of its inputs, which is the failure this library exists to prevent.
- *Finding 4's hazards*: designed out, since `awaitVisitor` is rewritten — inside the cost above.

**Option B — allow `await` only where pass-through is correct, refuse it elsewhere.** "Correct" is a
position whose value reaches the result tree unchanged: the expression's value, an array element or
plain-object property value in it, a conditional's branches, the last operand of a sequence.

- *What it buys: syntax only.* In those positions `await p` and `p` evaluate alike under
  `evaluateAsync`, since `awaitAllPromises` resolves the promise either way — P1's first two rows
  against P4's `[[p], {x: [p]}]`, resolved with no `await` in it.
  The refused positions are exactly the ones a consumer reaches for `await` to write.
- *Cost.* A static check over the AST, with the position rules above and their error. Parser options
  for the async path that differ from `defaultParserOptions` — they cannot change in place, because
  `eval-forms` parses with them (finding 10) — and then a parse cache that keys on those options, or the
  async path's permissive parse is served to the sync path ([BL-A26](../backlog.md#a26), P5). And it
  leaves the `async`-arrow path (finding 3) as it is unless the same check is applied there, which is
  an `eval-core` behaviour change.
- *Finding 4's hazards*: made **more** reachable. Every recompute of an expression with a top-level
  `await` would start a 30 s timer, and under zone.js hold the application unstable for 30 s after each
  one (P2b). B would need [BL-A25](../backlog.md#a25) fixed in `eval-core` first, as a step of its own.

**Option C — keep `await` out, and close the gap differently.** Top-level `await` stays a
`SyntaxError`. A promise enters the walk as a call's return value, the walk finishes, and
`evaluateAsync` resolves the result. Operand-position use is written as **two signals**: the async
signal resolves, and an ordinary `createEvalSignal` derives from its value. An `EvalSignalAsync` is a
`Signal`, so it is a legal value in a signal context's source, and the second signal's read of it is
tracked natively:

```ts
const user = createEvalSignalAsync('loadUser(id)', { id, loadUser });
const label = createEvalSignal('user ? user.name + " (" + role + ")" : "loading"', { user, role });
```

`user` reads `undefined` while a run is pending (§ 3.4), which a signal context resolves as "not
found" and the walk as `undefined` — hence the conditional.

- *Cost*: none in `eval-core`. A README section.
- *What it loses*: a dependent sequence in one expression — `load(await getId())`. It becomes two
  async signals, or one with the dependency written inside a consumer function.
- *Finding 4's hazards*: unreachable from a top-level expression; reachable through an `async` arrow
  exactly as today, on the sync path and this one alike. Phase 5 neither adds nor removes reach, so
  they stay [BL-A25](../backlog.md#a25)'s.

**Decision: C.** A is a rewrite of the evaluator that still cannot deliver tracked reads after an
`await`; B is a static check that buys syntax and costs a core fix. C's two-signal form tracks every
read at both levels, which is the property the other two cannot have.

**Consequences.** `defaultParserOptions` and the parser are untouched. The README stops presenting
`(async () => await load(id))()` as "how `await` reaches an expression" without saying that the
`await` is a pass-through, right only where it is the arrow's result (step 4).

**Reopens if** a consumer needs operand-position `await` that two signals cannot express, or
[BL-A24](../backlog.md#a24) is decided as "implement" rather than "refuse" — at which point the
`async`-arrow path and this one should get the same semantics in one decision.

### 3.2 Shape — decided: two `computed`s and a `signal`, not `resource()`, not an `effect`

**Option 1 — `resource()`.**

- *Peer cost*: stable from 22.0 (finding 6). A `>=19` range cannot carry it: at 19 the option is
  named `request`, so a `resource({ params, loader })` call compiled into this package would hand
  Angular 19 an option it does not read — inferred from the typings, not run — and on 20–21 it rests
  on an experimental API. So the
  range narrows to `@angular/core >=22` — breaking for every 19–21 consumer of `eval-signals`, and for
  `eval-forms`' `/reactive` consumers on 19–21 through its peer on `eval-signals`.
- *Tracking*: only with the walk in `params` (finding 7). Then the loader just awaits a promise the
  walk already produced.
- *Cancellation*: the `abortSignal` arrives in the loader, after the walk has called the expression's
  functions, so it can never reach them on the one placement that tracks.
- *What it gives for free*: status, staleness, abort-on-change, stability (finding 8).

**Option 2 — `signal()` plus an `effect`.**

- *Peer cost*: stable from 20.0 (finding 6), not "none" as Phase 3 § 3.7's table said. Narrowing to
  `>=20` is breaking for 19 consumers.
- *Tracking*: survives (finding 7).
- *Lifetime*: an `effect` created with `options.injector` registers on that injector, and
  `EvalSignalService` passes the root one. That is Phase 3 § 3.8.1's accumulator again — a long-lived
  holder retaining something per signal — unless the effect is created with `manualCleanup`.
- *Eager*: it runs whether or not anything reads the value, unlike every other signal this library
  returns; and the `onError` contract (rethrow on read) still needs a `computed` over it.
- *Harness*: effects are scheduled, so every spec needs `TestBed.tick()` between a change and its
  assertion.

**Option 3 — a pull shape: two `computed`s and one `signal`.**

```ts
const run = computed(() => { version(); return start(); });     // the walk: tracked, synchronous
const settled = signal<Outcome | undefined>(undefined);          // written by run's settle handler
const value = computed(() => read(run(), settled()), { equal }); // onError applied here, on read
const status = computed(() => statusOf(run(), settled()));
```

`start()` is § 3.3.1 and § 3.8.3 of Phase 3 with `callAsync` in place of `call`: a fresh state, the
depth snapshot, the walk, the restore. It returns a `Run` holding the promise, its `AbortController`,
its pending-task release and — when `state.result.isError` is already `true` (finding 1) — the
synchronous failure. The settle handler writes `settled` a microtask later, outside any reactive
context, and only if its run is still current and the signal is not destroyed. `value` and `status`
read an outcome only when its run is `run()`'s current value — the check that makes a lazy supersede
correct (§ 3.4).

- *Peer cost*: none. `signal` and `computed` are untagged at every floor; `PendingTasks.add()` is
  developer preview at 19 with the signature it has at 22 (finding 6). At 19 zoneless change detection
  is itself experimental (`provideExperimentalZonelessChangeDetection`), so the consumer for whom that
  preview status matters is one already running an experimental mode.
- *Tracking*: the walk runs inside `run`, a `computed` — finding 7's first row.
- *Cancellation*: the controller exists before the walk, so the expression's functions can be handed
  its signal (§ 3.6).
- *Errors*: a `computed` that throws on read is exactly `onError: 'throw'`'s existing contract, so the
  option means the same thing on both primitives.
- *Lazy*, like `createEvalSignal`: no read, no walk.
- *Cost*: the primitive owns what `resource` would have given it — status, staleness, abort,
  stability. That is § 3.4–§ 3.6, and steps 2–3's criteria.
- *The risk it takes*: it starts asynchronous work inside a `computed`. Two things bound it. The sync
  primitive already does exactly this for a promise-returning expression, and pins it
  (`eval-signal.spec.ts:946-977`). And no signal is written synchronously inside the `computed`; the
  write happens in the settle handler, which `NG0600` does not concern. Measured clean at 22.2.1 (S1,
  S2), including `PendingTasks.add()` inside the `computed`; not measured at 19–21, which § 8 q1
  makes a precondition of step 4.

**Decision: 3.** Tracking, cancellation that reaches the expression, and the `onError` contract all
carry over, and the `>=19` floor holds — which Phase 3 step 1 widened to deliberately. The price is
code this package owns and tests, against a breaking narrowing for either alternative.

**Consequence**: `PendingTasks.add()` around every run, released when the run settles, is superseded
(§ 3.4: at the first read after a dependency change), or the signal is destroyed — whichever comes
first (finding 8; step 3). A superseded run that never settles must not hold the application
unstable.

**`PendingTasks` comes from the same injector fork as `CompilerService`** (`eval-signal.ts:267-272`):
`options.injector.get(PendingTasks)` when an injector is given, `inject(PendingTasks)` otherwise.
`EvalSignalService.createAsync` always passes one, the root injector, whose `PendingTasks` is the
application's own, so stability holds through the service too. Phase 3 § 3.8.1's rule is untouched:
the injector resolves services, and no `DestroyRef` is taken from it.

### 3.3 Per-key tracking — decided: it survives, because the walk stays in a `computed`

The walk runs inside `run` and finishes before `callAsync` returns (finding 1), so every read it makes
is tracked by Angular exactly as Phase 3 § 3.1 describes. Reads that happen after resolution are not:
those are reads inside a closure the promise machinery calls later — `load(id).then(u => u.x * rate)`
does not track `rate`. That is Phase 3 finding 1.2.7's escaped-closure limitation, not a new one, and
the two-signal form of § 3.1 is the tracked way to write it.

### 3.4 Value, status, errors, staleness, destroy — decided: Angular's `resource` contract, minus `reloading`

| Moment | `value()` | `status()` |
| :--- | :--- | :--- |
| A run is pending — the first, or any later | `undefined` | `'loading'` |
| The current run resolved with `v` | `v` | `'resolved'` |
| The current run rejected with `e` | per `onError`, below | `'error'` |
| Destroyed | `undefined` | `'idle'` |

Reading `status()` starts a run as reading `value()` does; both are views of `run`.

**First read: `undefined`, `'loading'`.** Even for an expression with no promise in it:
`evaluateAsync` always resolves through an `await`, so `createEvalSignalAsync('1 + 1')` reads
`undefined` until a microtask later. A synchronous fast path would need the walk's raw value before
resolution, which `eval-core` does not expose — `setSuccess` runs after the `await`
(`evaluate.ts:253-254`). § 8 q4.

**A new run discards the previous outcome**, as Angular's `loading` does on a dependency change
(finding 9). **`invalidate()` counts as a dependency change**, not as a `reload()`: it exists for a
source with no reactive surface (Phase 3 § 3.5), where it is the only way the signal learns the data
changed, so keeping the previous value would show data for inputs that no longer hold. There is
therefore no `reloading`, and `EvalSignalStatus` is `'idle' | 'loading' | 'resolved' | 'error'` — a
subset of the strings Angular's `ResourceStatus` has been since 20. Declared here rather than
imported: at 19 that type is an `enum`, and it is `@experimental` until 22 (D1).

**Rejection reaches `onError` with its existing contract.** `'throw'`: `value()` throws the rejection
on every read until a new run starts — a `computed`'s rethrow-on-read, which is what
`EvalSignalOptions.onError` already promises (`eval-signal.ts:149-161`). `'undefined'`: `undefined`.
A mapper: called **once per rejected run** with the rejection, its result cached by `value`. What
arrives is what `evaluateAsync` rejects with, so a non-`Error` rejection arrives wrapped by
`ensureError` (`evaluate.ts:141-163`) and an `Error` arrives by identity.

**A failure in the walk itself settles at once.** `state.result.isError` is `true` when `callAsync`
returns (finding 1), so the run carries it and the first read already sees `'error'` — the same timing
as `createEvalSignal`. This matters most for `SignalContextWriteError`, which **bypasses `onError` in
every mode**, enriched with the expression, as on the sync path (`eval-signal.ts:428-430`; Phase 3
§ 3.6.3): on the async path it would otherwise surface one read late, and
[BL-C2](../backlog-retired.md#c2) declined a construction-time check because the runtime guard already
fires on the first read. A write that happens in a closure the promise calls later arrives through the
rejection instead, and is treated the same way.

**No rejection goes unhandled.** Every run's promise gets its settle handler, including runs that
were superseded or outlived their signal; the handler discards their outcome.

**Supersede is lazy: it happens at the first read after a dependency change.** `run` is a `computed`,
so a dependency change only marks it dirty. The new run starts — and the old one is aborted and its
pending task released — when something next reads `value()` or `status()`, which recomputes `run`;
reading either *is* the supersede. Until that read the old run is still current, so if it settles in
between, its handler writes `settled` as it should for a current run.

**Staleness is therefore run identity, checked where the outcome is read.** Each `start()` makes a new
`Run` and aborts the previous run's controller. A settle handler whose run is no longer current writes
nothing, so a late resolution neither changes the value nor recomputes it — whatever order the two
promises settle in. But the handler's check alone is not enough: in the window above, the old run's
outcome is written while it is current, and the read that follows supersedes it. So `value` and
`status` accept an outcome only when its run is `run()`'s current value, and that read returns
`undefined` / `'loading'`. Step 2's criteria 3 and 12 each catch one of the two checks missing.

Between the change and the read, the old run's pending task still holds the application unstable. It
is released at the read, or when the old run settles, whichever comes first — so with nothing reading
the signal, stability waits for the old run, not for a run nobody has started.

**`destroy()` during a run.** Phase 3 § 3.8.2's rule holds unchanged: a destroyed signal reads `undefined`
from the moment it is destroyed, and neither producer moves it. Here there is a third producer — the
in-flight run's resolution — and the destroyed check in the settle handler is what keeps it inert.
`destroy()` also aborts the current run's controller and releases its pending task.

**The signal holds the current run and nothing older.** A superseded `Run` — its promise and so its
resolved value, its state, its `AbortController`, its pending-task release — is referenced by nothing
the signal keeps once `start()` has replaced it, and after `destroy()` not even the current one is. A
list of runs, kept to abort or release them all at the end, would be the per-signal accumulator Phase 3
§ 3.2.2 and § 3.8.1 describe, and the shape of [BL-A8](../backlog-retired.md#a8). Step 2's criterion 13
and step 3's criterion 7 assert it.

**`dependencies` reports the last run started.** The walk finishes before `callAsync` returns
(finding 1), so a run's reads are complete when it starts, and however many older runs are still in
flight, "the last recompute" (Phase 3 § 3.4) is one thing again. The tracker is uninstalled in the
`finally` after the call, as on the sync path (`eval-signal.ts:371-384`), so a closure the promise
calls later records nothing — consistent with what Angular tracks.

### 3.5 The scope-depth restore under `callAsync` — decided: the same `finally`, around the synchronous call

Phase 3 § 3.8.3 restores the context's scope depth in a `finally` around a synchronous `call`, and
asked where that goes when the walk ends "relative to the promise". Finding 1 answers it: the walk
ends before the promise exists, and the depth is already back at return (P3). So the `finally` wraps
the synchronous `callAsync` call, in `start()`, exactly where it sits today.

Restoring at settlement instead would be wrong, not merely late: a run started before an earlier one
settles would walk on a context still carrying the earlier leak. Step 2's criterion 10 is that
discriminator.

[BL-A9](../backlog-retired.md#a9) is fixed (`arrow-function-expression.ts:27-31`), so the arrow scope
no longer leaks on any path, including a closure the promise machinery calls later. The guard stays for
the reason `eval-signal.ts:392-401` gives: `EvalContext.push` and `pop` are public, so a scope can be
stranded with no visitor involved — for instance by a consumer function, which a bare call invokes
with the context itself as `this` (`call-expression.ts:203`).

### 3.6 An `AbortSignal` for the expression's own functions — decided: yes, opt-in, through a per-run scope

A function in the source receives exactly the arguments the expression passes it
(`call-expression.ts:131`). There is no hidden channel; the question is which visible one.

- **Through a context key, bound per run as a pushed scope.** `start()` pushes `{ [key]:
  controller.signal }` after the depth snapshot, so § 3.5's loop pops it with anything else. The
  expression passes it on: `load(id, abort)`. Published surface only (`EvalContext.push` / `pop`).
- **Through a lookup over a holder the primitive updates.** The context is built once and shared by
  every run, so a closure the promise calls later would read the *latest* run's signal — the wrong
  one, silently.
- **Through `this`.** A bare call's `this` is the shared `EvalContext` (`call-expression.ts:203`): the
  same wrong-run problem, and an arrow function ignores it anyway.
- **Not at all.** A superseded run is then ignored, not cancelled, and a consumer's `fetch` runs to
  completion for nothing.

**Decision: the pushed scope, under a key the consumer names — `abortSignalKey`**, off by default.

**Consequences.** The key is visible to the walk and only to it; a closure the promise calls later
resolves it like any other name, which a step-3 case pins. A pushed scope is first in
`EvalContext.get`'s order, so it shadows a source key of that name: for a record source the factory
**throws** at construction when the source has an own key equal to `abortSignalKey`; for a
caller-built `EvalContext` it cannot know the keys, and the README says so. The key is never reported
in `dependencies`.

**A key the expression could never read — decided: refused at construction.** Two kinds of key would
leave the option silently inert: one that is not a plain identifier (an expression can only name a
scope binding as an identifier), and one `eval-core`'s identifier guard refuses, which throws on every
read of it. Documenting that and pinning it would ship an option that does nothing with no error,
which is the failure this library exists to prevent — so the factory refuses both, naming the option
and the key.

The rule, and where the name list comes from: **from `eval-core` itself, asked through its published
surface, so there is no list in this package.** The guard's names are internal
(`DANGEROUS_PROPERTY_NAMES`, `prototype-pollution-guard.ts:12-26`, under `internal/visitors`, which
`src/public-api.ts` does not re-export), and the nearest copy, `eval-forms`' `guardIdentifiers`, uses
a different predicate — `Object.prototype`'s own names, which lack `prototype` — so copying either
would drift. Instead, at construction and only when `abortSignalKey` is set:

1. `parse(key, defaultParserOptions)` must yield one `ExpressionStatement` whose expression is an
   `Identifier` named exactly `key`. That refuses anything with a character an identifier cannot hold,
   and a reserved word, as the evaluator's own parser sees them.
2. That identifier, compiled and evaluated once on a throwaway `EvalContext` and state built from
   `{ caseInsensitive }` alone — taken from the signal's `eval` options — with `{ [key]: sentinel }`
   pushed as a scope, must return the sentinel. If the identifier guard refuses the name — or under
   `caseInsensitive` the matched key — the evaluation throws, and the factory refuses the key.
   `caseInsensitive` is the only `EvalOptions` member the guard reads (`identifier.ts:100`, and
   `getKey` through the context); the rest either bound a walk (`maxIterations`, `maxTraceItems`) or
   observe one (`hooks`, `onHookError`, `trackTime`), and a caller's `hooks` registry is adopted by
   identity (`eval-state.ts:19-22`), so passing the full options would fire the consumer's callbacks
   for a walk that never happened.

The second check is the runtime path in everything the guard depends on — the same parser, the same
guard, the same pushed-scope resolution, the same `caseInsensitive` — and runs no consumer code. It follows whichever `eval-core` the peer
range resolves to, so a name the guard adds later is refused without an edit here. It costs one parse
and one single-node walk, once per signal, and nothing when the option is not set.

### 3.7 Nested promises, and the sync path — decided: exactly what `evaluateAsync` resolves

The async primitive resolves through `callAsync`, so it resolves what `awaitAllPromises` resolves and
nothing else (finding 5). A second resolution semantics in this package — walking `Map`s, re-walking
resolved values — would make `evaluateAsync` and `createEvalSignalAsync` disagree about the same
expression.

**Consequences**, all for the README: a promise inside a promise's resolved value, a `Map`, a class
instance or a null-prototype object is not resolved; every plain object and array in the result is
rebuilt on each run, so the default `Object.is` equality never dedupes an object-valued expression,
and `equal` — forwarded to `value` — is the remedy.

The sync path does not change: `createEvalSignal` keeps passing promises through, pinned by
finding 12's specs.

### 3.8 Versions — decided

| Package | Change | Version | Breaking | Peer ranges after |
| :--- | :--- | :--- | :--- | :--- |
| `@zvenigora/ng-eval-core` | Step 1 adds a spec; no source change | none — ships in no package | — | unchanged |
| `@zvenigora/ng-eval-signals` | Adds `createEvalSignalAsync`, `EvalSignalAsync`, `EvalSignalAsyncOptions`, `EvalSignalStatus`, `EvalSignalService.createAsync` | **0.5.0**, a minor | **No** — additions only | `@angular/core >=19.0.0`, `@zvenigora/ng-eval-core >=0.11.0 <0.12.0` — both unchanged |
| `@zvenigora/ng-eval-forms` | `@zvenigora/ng-eval-signals` peer widened | **0.4.1**, a patch | No | `@zvenigora/ng-eval-signals >=0.4.0 <0.6.0`; the rest unchanged |

The `eval-forms` patch is forced, not optional. Its current range, `>=0.4.0 <0.5.0`, excludes 0.5.0,
so a consumer with both packages could not install the new `eval-signals`. And
`@nx/dependency-checks` fails `eval-forms:lint` the moment `modules/eval-signals/package.json` reads
0.5.0 — [BL-F12](../backlog-retired.md#f12)'s measured mechanism — so the widening lands in the same
step as the bump or that step cannot go green.

Under the rejected shapes the `eval-signals` row would read `@angular/core >=22` (resource) or `>=20`
(effect), each a breaking narrowing.

---

## 4. Work breakdown

Each step is one commit, leaves all three projects and the workspace root green, and runs in its own
session (CLAUDE.md, "Working from a plan"). "Wrong implementation" in a criterion names the change the
step's executor makes to the finished code to show the criterion goes red, and the report gives the
failure count for each, reading which cases failed rather than that the suite did.

### Step 1 — `eval-core`: pin that the walk ends before the promise is returned (test-only)

The property § 3.3–§ 3.5 rest on (finding 1) is a fact about `evaluateAsync`, which this phase does not
own and which nothing currently pins. `eval-core` is changed first, and by a spec only.

- **New**: `modules/eval-core/src/lib/internal/functions/evaluate.async-walk.spec.ts`.
- **Cases.** 1 and 2 through all six async entry points — `evaluateAsync`, the free `callAsync`,
  `CompilerService.callAsync`, `CompilerService.simpleCallAsync`, `EvalService.evalAsync` and
  `simpleEvalAsync`; 3 through the four that take a state, since the other two build theirs inside:
  1. Every context read the walk makes, counted by a lookup, has happened at return, before anything
     is awaited — over an expression with a promise-returning call in it, so a suspended walk has
     something to wait on.
  2. An arrow called during the walk has run **and** popped its scope by return: its body's read is in
     the count, and the scope depth equals the depth before. The count is what makes this arm
     discriminate — a walk that has not started leaves the depth unchanged too.
  3. For a walk that throws: at return `state.result.isError` is `true`; the returned promise rejects
     with `state.result.error`, by identity.
- **Exit criteria**:
  - The cases pass on the current code.
  - **Wrong implementation W1** — `await Promise.resolve()` inserted in `evaluateAsync` before
    `walk.recursive`: cases 1 and 2 fail through all six entry points, case 3 through all four.
  - **Wrong implementation W2** — `await null` inserted at the top of `evaluateAsync`'s outer `catch`
    (`evaluate.ts:257`), before `setFailure`: case 3 fails, and cases 1 and 2 do not.
  - `git diff --name-only` lists the new spec and this document only; `performance.spec.ts` is
    untouched.
- **Category**: test-only. It ships in no package: no version bump, no CHANGELOG entry.

### Step 2 — `createEvalSignalAsync`: the value, its status and its errors

- **New**: `modules/eval-signals/src/lib/eval-signal-async.ts`, `eval-signal-async.spec.ts`,
  `eval-signal-async.memory.spec.ts`.
- **Edit**: `src/public-api.ts` (the export); `eval-signal.service.ts` (`createAsync`) and its spec;
  `README.md`, the "How it fits together" table only — rows naming `createEvalSignalAsync`,
  `EvalSignalAsync`, `EvalSignalStatus` and `createAsync` in code spans. [BL-F10](../backlog-retired.md#f10)'s
  gate (`export-list.spec.ts:482`) fails on an export the README names nowhere, and none of the five
  allowlist reasons fits a primary API. Table rows are not fenced blocks, so `readme-examples.spec.ts`'s
  block count does not move.
- **Builds**: § 3.2's option 3, § 3.4 entire, § 3.5, `trackDependencies` (with the sync path's
  conflict rule against `eval.hooks`), `invalidate()`, `destroy()` with the ambient-only `DestroyRef`
  rule of Phase 3 § 3.8.1. The factory takes `EvalSignalOptions` here. Not the `AbortSignal` key,
  `EvalSignalAsyncOptions` or `PendingTasks` — step 3, so that no step exports an interface with
  nothing in it.
- **Exit criteria** — spec cases through the factory (§ 6.1), each with the wrong implementation it
  must catch:
  1. **Tracking.** An unread signal's change starts no run (the `createState` count does not move) and
     leaves the value as it was after a flush; a read signal's change starts exactly one, at the read
     after it (§ 3.4). *Wrong:* the
     walk wrapped in `untracked` — the positive half fails; a resolver reading every source signal —
     the negative half fails.
  2. **First read.** `undefined` and `'loading'` while the run's deferred is unresolved, asserted
     before the test resolves it; the value and `'resolved'` after. *Wrong:* `run()`'s promise
     returned as the value — the first half fails.
  3. **Out of order.** Two runs, their deferreds resolved first-then-second and second-then-first: the
     final value is the second run's in both orders, and the stale resolution does not recompute
     `value` (an `equal` spy's count does not move). *Wrong:* the settle handler's identity check
     removed — the reverse order fails: the stale write lands last, and the value reads `undefined`
     through `value`'s own check, or the stale value without it. `value`'s check removed alone is not
     caught here; criterion 12 catches it.
  4. **Rejection, after settlement, per mode.** `'throw'`: two consecutive reads throw the rejection
     by identity, and `status()` is `'error'`. `'undefined'`: `undefined`. Mapper: its result, and it
     is called once across five reads. *Wrong:* the mapper applied per read outside the `computed` —
     the call count fails; the rejection swallowed — the `'throw'` case fails.
  5. **Nothing unhandled.** A run superseded — by a change and the read after it — that then rejects,
     and a run that rejects after `destroy()`,
     reach no `unhandledRejection` listener. *Wrong:* the handler attached only to the current run.
  6. **A write violation.** `count = 5` throws `SignalContextWriteError` naming the expression on the
     **first** read, in all three `onError` modes. *Wrong:* the synchronous `state.result` check
     removed, so the failure arrives through settlement — the first read returns `undefined`; the
     error routed through `onError` — the `'undefined'` and mapper modes return instead of throwing.
  7. **`destroy()` during a run.** `value()` `undefined` and `status()` `'idle'` at once; the pending
     run resolving afterwards changes neither and does not recompute — the `equal` spy's count is the
     one it had at the first read after `destroy()`; `invalidate()` after it is inert. *Wrong:* the
     settle handler's destroyed check removed, with `destroy()` leaving the run current — the late
     resolution writes `settled`, and the spy moves even though the value stays `undefined`.
  8. **`invalidate()`.** The next read starts a run and reads `undefined` / `'loading'` until it
     settles. *Wrong:* the previous value kept while reloading.
  9. **`dependencies`.** Reports the last started run's reads while an older run is still pending,
     and shrinks when the expression takes a branch reading fewer keys (Phase 3 § 3.4's precedent).
     *Wrong:* the set recorded at settlement — a reverse-order settle reports the older run's.
  10. **The scope-depth restore.** A source function that pushes a scope on its `this` (the context,
      `call-expression.ts:203`) and does not pop it, in an expression that reads the shadowed key
      before making the call; a second run started **before the first settles** reads the source
      key, not the stranded scope. *Wrong:* the restore moved to the settle handler — the second run
      reads the shadow; the restore removed — every later run does.
  11. **The service.** `EvalSignalService.createAsync` returns a working signal outside an injection
      context and takes no `DestroyRef` registration, as `create` does. One case through it (Phase 3
      § 6.1's "a wiring call is not covered by testing what it calls").
  12. **A lazy supersede** (§ 3.4). A run is pending; a dependency changes and **nothing reads**; the
      old run's deferred resolves; then a read returns `undefined` and `status()` `'loading'` — not
      the old run's value — and the next settle gives the new run's value. Asserted in that order,
      with the old deferred resolved by the test before the read. *Wrong:* the run-identity check only
      in the settle handler — the old run was still current when it settled, so its outcome was
      written, and the read returns the stale value.
  13. **Retention** (§ 3.4), in `eval-signal-async.memory.spec.ts` with `eval-signal.memory.spec.ts`'s
      instrument: `WeakRef`s and a forced collection (`setFlagsFromString('--expose-gc')` /
      `runInNewContext('gc')`, a macrotask first), with `eval-core`'s several-round `collect` if one
      round proves flaky ([BL-A19](../backlog.md#a19)'s 2026-10-07 note). Two arms:
      - after five supersedes — each a dependency change, the read that supersedes, and the old run's
        deferred resolved — no superseded run's state (caught by a read hook on a registry the test
        owns, as `eval-signal.memory.spec.ts` catches states) and no superseded run's resolved value
        survives; the current run's value, held by the signal alone, **does** survive, which is what
        shows the others were collected rather than never caught;
      - after `destroy()` with a run pending, and that run's deferred then resolved: its value does
        not survive.

      The resolved values are class instances, which `awaitAllPromises` returns by identity (P4) — a
      plain object would be rebuilt and the `WeakRef` would watch a copy nothing holds. The fixture
      keeps no reference to a resolved deferred, its value or its state, and no `jest` spy or `equal`
      spy sits on the path (`mock.calls` and `mock.results` hold what they see) — BL-A19's "the fixture
      can keep the target alive". *Wrong:* runs kept in an array — the first arm fails, every
      superseded value surviving; the current run kept after `destroy()` — the second arm fails.
  - The gate is green, and `git diff --name-only` lists only the files above and this document.
- **Category**: additive to a published package, unreleased until step 4.

### Step 3 — Cancellation and stability

- **Edit**: `eval-signal-async.ts`, `eval-signal-async.spec.ts`, `eval-signal-async.memory.spec.ts`;
  `eval-signal.service.ts`, whose `createAsync` now takes `EvalSignalAsyncOptions`, and its spec;
  `README.md`'s "How it fits together" table, one row for `EvalSignalAsyncOptions` (F10, as in
  step 2).
- **Builds**: § 3.6 (`EvalSignalAsyncOptions` with `abortSignalKey`, its construction-time check, an
  `AbortController` per run, aborted on supersede and destroy) and § 3.2's consequence
  (`PendingTasks.add()` per run, from the same injector fork as `CompilerService`).
- **Exit criteria**:
  1. **The signal reaches the function.** With `abortSignalKey: 'abort'`, `load(id, abort)` receives
     an `AbortSignal`: **not** aborted by a dependency change alone, aborted by the read that then
     supersedes its run (§ 3.4), aborted on `destroy()`, **not** aborted when its run settles
     normally, and the new run's signal is not aborted. *Wrong:* one controller per signal rather
     than per run — the new run's signal is already aborted.
  2. **Only the walk sees it.** A closure the promise calls later resolves the key through the
     context's ordinary order, not to the run's signal; the scope depth after a run equals the depth
     before.
  3. **A record source that already has the key throws** at construction, naming the key and the
     option. *Wrong:* no check — the source key is silently shadowed.
  4. **`dependencies` never contains the key** — whether the tracker's own scope handling drops it or a
     filter has to. The report says which, with the probe that removes the mechanism and shows the key
     appear.
  5. **Stability**, under `provideZonelessChangeDetection()` (S2's arrangement):
     `ApplicationRef.whenStable()` does not resolve while the current run is pending; it resolves once
     the run settles; after a supersede — a dependency change **and the read that starts the new
     run** — it resolves once the new run settles, **even if the superseded run never settles**; it
     resolves after `destroy()` with a run pending; and, through `EvalSignalService.createAsync`,
     which passes the root injector, it does not resolve while a run is pending and resolves once it
     settles. *Wrong:* no `PendingTasks` — the first fails; release only on settlement — the third
     fails; no release on `destroy()` — the fourth fails; `PendingTasks` taken only from the ambient
     injection context, or skipped when an injector is given — the fifth fails (outside an injection
     context the first of those throws `NG0203` instead, which criterion 11 of step 2 already
     catches).
  6. **A key the expression could never read is refused** (§ 3.6). Constructing with
     `abortSignalKey` set to a string that is not an identifier, to a reserved word, or to a name
     `eval-core`'s identifier guard refuses — taken from that guard's existing spec fixtures — throws
     at construction, naming the option and the key; the guard-refused name is refused under
     `caseInsensitive` as well; and an ordinary identifier constructs and reaches the function, as in
     criterion 1. The cases assert refusal only. And with an `EvalHooks` registry in `eval` that
     records every event, constructing a signal with `abortSignalKey` set records **no** event — the
     check is not a walk the consumer's hooks may see. *Wrong:* a syntax check alone — the
     guard-refused name constructs, and the option is inert; no check — all three construct; the
     signal's full `eval` options passed to the check — events are recorded at construction.
  7. **Retention of controllers and releases** (§ 3.4), in `eval-signal-async.memory.spec.ts` with
     step 2's instrument and arms: after five supersedes, no superseded run's `AbortSignal` — caught
     as a `WeakRef` inside the source function, and reachable from a retained controller — and no
     superseded run's pending-task release survives a forced collection, while the current run's do;
     after `destroy()` with a run pending, neither survives once that run's deferred resolves. The
     releases are caught by wrapping `PendingTasks.add` with a plain function that keeps only a
     `WeakRef` to each release it returns, restored afterwards — not a `jest` spy, whose
     `mock.results` would hold every release. *Wrong:* controllers kept in an array to abort them all
     at `destroy()` — the superseded signals survive; releases kept in a `Set` until `destroy()` —
     the superseded releases survive.
  - The gate is green; `git diff --name-only` lists only the files above and this document.
- **Category**: additive, unreleased until step 4.

### Step 4 — Docs and release

- **Precondition — § 8 q1 answered and recorded in this document.** The matrix run § 8 q1 describes
  is performed by the reviewer outside this workspace after step 3, and its result is written into
  § 8 q1 before this step starts. If any version failed, this step does not start: the plan is
  replanned, and the `>=19` peer floor is not narrowed silently to make the release fit.
- **Edit**:
  - `modules/eval-signals/README.md` — "Async expressions" rewritten: the primitive; § 3.4's table;
    `onError`; the two-signal form for operand-position use (§ 3.1); the resolution boundary and the
    copy-per-run consequence for `equal` (§ 3.7); `abortSignalKey` and its shadowing rule (§ 3.6);
    stability. The sync path's promise pass-through stays documented, with the `resource` composition
    given in both spellings — `request` on 19, `params` from 20 — closing [BL-C6](../backlog.md#c6). The
    `async`-arrow line says the `await` is a pass-through, right only as the arrow's result
    ([BL-A24](../backlog.md#a24)). "Before you use it"'s async bullet follows.
  - `modules/eval-signals/src/lib/readme-examples.spec.ts` — every new ` ```ts ` block executed, and the
    block count it claims updated ([BL-F13](../backlog-retired.md#f13)'s gate).
  - `modules/eval-signals/package.json` → 0.5.0; `modules/eval-signals/CHANGELOG.md` — `[0.5.0]`.
  - `modules/eval-forms/package.json` → 0.4.1, `@zvenigora/ng-eval-signals` `>=0.4.0 <0.6.0`;
    `modules/eval-forms/CHANGELOG.md` — `[0.4.1]`, the range and nothing else.
  - `ROADMAP.md` — Phase 5 marked done, pointing here; § "Suggested order" updated.
  - `docs/backlog.md` / `docs/backlog-retired.md` — C6 retired; A24's entry notes the README
    wording.
  - `docs/signals/phase-5-summary.md` — new, the phase's one retrospect.
  - This document — each step's outcome.
- **Exit criteria**:
  - § 8 q1 answered, with the recorded result: every version of the matrix passing, and the README's
    stated Angular support matching what was run.
  - The gate is green. `eval-forms:lint` going green is itself the check that the range was widened:
    it fails on the bump alone ([BL-F12](../backlog-retired.md#f12)).
  - The built `dist/modules/eval-signals` `.d.ts` differs from the published 0.4.0's (`npm pack
    @zvenigora/ng-eval-signals@0.4.0` into a directory outside the repo) by additions only — the four
    exports and the `createAsync` method in § 5 — plus documentation comments.
  - The built `dist/modules/eval-forms` `.d.ts` files are byte-identical to the published 0.4.0's.
  - `export-list.spec.ts`'s F10 cases and `readme-examples.spec.ts` are green with the new blocks
    counted.
- **Category**: the release. Publishing, tags and the Publication status rows are CONTRIBUTING's
  Releasing procedure, steps 3–6, after this commit; so is CLAUDE.md's "Published at" line, which this
  step's bump does not yet falsify.

---

## 5. Public API surface added

```ts
// from @zvenigora/ng-eval-signals — all additive
export function createEvalSignalAsync(
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalAsyncOptions
): EvalSignalAsync<unknown>;

export type EvalSignalStatus = 'idle' | 'loading' | 'resolved' | 'error';

export interface EvalSignalAsync<T> extends EvalSignal<T> {
  /** § 3.4. Reading it starts a run, as reading the value does. */
  readonly status: Signal<EvalSignalStatus>;
}

export interface EvalSignalAsyncOptions extends EvalSignalOptions {
  /** § 3.6. The name under which the run's AbortSignal is visible to the walk; refused at
   *  construction unless an expression could read it. */
  abortSignalKey?: string;
}

// and on the existing service
EvalSignalService.createAsync(expression, source, options?): EvalSignalAsync<unknown>;
```

Every `EvalSignalOptions` member keeps its meaning: `eval`, `equal` (on `value`), `onError` (§ 3.4),
`trackDependencies` (§ 3.4), `injector` (resolves services, never scopes lifetime — Phase 3 § 3.8.1).

**This amends Phase 3 § 5's list of what `src/lib/` may import from `eval-core`**, which step 5 of that
phase noted admits no async entry point. Added: `CompilerService.compileAsync`, the free `callAsync`
and the `stateCallbackAsync` type. The free `callAsync` rather than `CompilerService.callAsync`, on
Phase 3 § 3.6.3's reasoning for `call`: the free function is what the method wraps. Also `parse`,
`defaultParserOptions` and the free `compile`, for § 3.6's construction-time check — the three
`eval-forms` already imports from the same published surface. From Angular: `PendingTasks`.

Nothing is added to `eval-core` or `eval-forms`.

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | Baseline plus step 1's cases; unchanged after |
| Perf | `internal/performance.spec.ts` | Unchanged — no `eval-core` source changes |
| Docs | the root `test` target (`tools/doc-links.mjs`, `tools/release-tags.mjs`) | Green |
| Scope | `git diff --name-only` | Exactly the step's file list in § 4 and this document; any non-spec file under `modules/eval-core/` is a stop-and-replan |
| Surface | the built `.d.ts` against the published tarball | Step 4 only — § 4's criteria |

### 6.1 The spec harness, re-derived for assertions that can pass by resolving late

Phase 3 § 6.1's rules carry over — through the factory, recompute counts around real evaluations, the
negative case always paired with a positive one. What changes is time, and each rule below exists
because an async assertion has one more way to be vacuous:

- **No timers in a fixture.** A promise an assertion orders is a deferred the test resolves itself.
  A timer makes order a race and makes "it resolved late" indistinguishable from "it never resolved".
- **"Before" is asserted before the test resolves anything.** `'loading'` / `undefined` checked after
  a flush passes against an implementation that settles synchronously, or never.
- **"After" is asserted after an explicit flush** — microtasks and one macrotask — never in the
  synchronous instant. An implementation that applies `onError` a microtask late agrees with "not
  called" in that instant; Phase 3's `eval-signal.spec.ts:1024-1033` is the precedent.
- **Out-of-order cases run both orders**, with the stale arm settling **last**. Settling it first
  passes against last-write-wins.
- **A supersede is a change and a read** (§ 3.4). A fixture that changes a dependency and then asserts
  an abort, a release or a new run without reading has asserted nothing about supersede — `run` has
  not recomputed. And the window between the change and the read is a case of its own (step 2
  criterion 12), not a gap to read past.
- **"Did not recompute" goes on a channel that fires only on a recompute** — an `equal` spy, as in
  Phase 3 § 3.8.2 — not on the value, which a stale write can restore to what it was.
- **The run counter is the `createState` spy**, one call per run (§ 3.3.1).
- **Unhandled rejections are observed**, with a listener the spec installs and removes, for every
  case that supersedes or destroys a rejecting run.
- **There are no effects to flush.** If an implementation ever adds one, its specs need
  `TestBed.tick()` and this section is wrong.
- **The stability cases use S2's arrangement** — `provideZonelessChangeDetection()` and
  `ApplicationRef.whenStable()` — and Angular logs `NG0914` there because `test-setup.ts` loads zone.js.
  Expected, not a defect.
- **Break each criterion two ways** — the wrong implementations in § 4 — and report which cases
  failed, by name.

---

## 7. Risks

| Risk | Likelihood | Mitigation — the criterion that fails |
| :--- | :---: | :--- |
| Tracking silently lost — the walk moved out of the `computed`, or a microtask inserted before it | **High** | Step 2 criterion 1 (both halves); step 1's W1 for the core half |
| A late resolution overwrites a newer value | **High** if not designed for | Step 2 criterion 3, both orders |
| A superseded or post-destroy rejection is reported unhandled | Medium | Step 2 criterion 5 |
| A pending task is never released and the application never stabilises | Medium | Step 3 criterion 5's third and fourth arms |
| Async work in a `computed`, or `PendingTasks.add()` there, misbehaves at Angular 19–21 | Medium — measured at 22.2.1 only | § 8 q1's matrix run, a precondition of step 4; a failure replans rather than narrowing the floor |
| The signal keeps every superseded run — its value, state, controller or pending-task release — for its whole life: the per-signal accumulator of Phase 3 § 3.2.2 and § 3.8.1, and the shape of [BL-A8](../backlog-retired.md#a8) | Medium — "keep them all to clean up at `destroy()`" is the natural first draft | Step 2 criterion 13 and step 3 criterion 7, each with a control arm that must survive |
| A dependency change with no read leaves the old run current, and its late outcome is shown for the new inputs | **High** if the only check is in the settle handler | § 3.4's check in `value` / `status`; step 2 criterion 12 |
| An `abortSignalKey` the expression can never read leaves the option silently inert | Medium | § 3.6's construction-time check; step 3 criterion 6 |
| A future `eval-core` change adds an `await` before the walk | Low | Step 1's spec |
| Object-valued results never dedupe, because `awaitAllPromises` rebuilds them | **Certain**, low severity | README (§ 3.7); `equal` is forwarded |
| `eval-forms` consumers cannot install `eval-signals` 0.5.0 | Certain without the patch | Step 4 releases `eval-forms` 0.4.1; `eval-forms:lint` fails until it does |
| [BL-A24](../backlog.md#a24) / [BL-A25](../backlog.md#a25) reached through an `async` arrow in the new primitive | Medium | Not this phase's to fix (§ 3.1); the README states it (step 4) |

---

## 8. Open questions

1. **Does the pull shape behave the same at Angular 19–21? — a precondition of step 4, not an open
   note.** Measured at 22.2.1 only: no `NG0600` for `PendingTasks.add()` inside a `computed`, and the
   tracking table of finding 7. The workspace runs 22, so no gate in it covers the lower floors, and
   the `>=19` floor this plan keeps (§ 3.2, § 3.8) is a claim about them.

   *Evidence required*: a matrix run of steps 2–3's spec files — `eval-signal-async.spec.ts`,
   `eval-signal-async.memory.spec.ts` and the `createAsync` cases of `eval-signal.service.spec.ts` —
   against `@angular/core` 19.2.x, 20.3.x and 21.2.x, performed by the reviewer outside this workspace
   after step 3. One substitution is known in advance: 19 has no `provideZonelessChangeDetection`,
   only `provideExperimentalZonelessChangeDetection` (D1), so step 3's stability cases use that at 19,
   and the record says so. Any other change a version needs is itself a result to record.

   *Recorded here before step 4 starts*: each version's exact patch, pass or fail per case, and every
   substitution. A failure at any version stops step 4 and the plan is replanned (§ 4, step 4's
   precondition).

   *Result*: not yet run.
2. **`reloading` / stale-while-revalidate.** § 3.4 decided against it for the first release. *Reopens
   on* a consumer who needs the previous value kept across a run — `linkedSignal` over the value is the
   composition until then.
3. **An `error` signal.** Under `onError: 'undefined'` or a mapper, the rejection is observable only
   through the mapper. `status()` says that one happened. *Reopens on* a consumer who needs the error
   object without a mapper.
4. **A synchronous first value for an expression with no promise in it.** Needs the walk's raw value
   before resolution, which `eval-core` does not expose (§ 3.4). *Reopens on* that need, as an additive
   `eval-core` change of its own.

---

## 9. Downstream contract

What a consumer — and `eval-forms`, should it ever want an async rule — can rely on after this lands:

1. `createEvalSignalAsync(expr, source)` is a `Signal` whose value is the latest run's resolved result,
   `undefined` while a run is pending, and per `onError` when it rejected. A new run starts at the
   first read after a signal-backed key the walk read changes, or after `invalidate()` — and only
   then (§ 3.4).
2. It is a `Signal`, so it can be a value in another signal context's source, and a sync
   `createEvalSignal` over it tracks it natively — § 3.1's two-signal form.
3. `status()` uses the words Angular's `ResourceStatus` has used since 20, for the states it has.
4. `destroy()` is the whole of its teardown, aborts the current run, and leaves it `undefined` /
   `'idle'` for good.
5. **Not** provided: top-level `await`; an `await` that waits anywhere — inside an `async` arrow it is
   a pass-through ([BL-A24](../backlog.md#a24)); operand-position use of a promise in one expression;
   or resolution beyond `evaluateAsync`'s (§ 3.7).
6. `createEvalSignal` is unchanged. Nothing in `eval-forms` has to change, and nothing there does
   except the peer range.
