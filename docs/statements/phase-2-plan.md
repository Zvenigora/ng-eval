# Phase 2 Plan — statement support in `eval-core`

Implements [`ROADMAP.md`](../../ROADMAP.md) § "Phase 2 — Statement support: `let`, `if`, `for`",
and closes [`docs/backlog.md`](../backlog.md) [A9](../backlog.md#a9) and [B2](../backlog.md#b2) as
its step 0, per that file's [Phase 2 preconditions](../backlog.md#phase-2-preconditions).

**Target**: `@zvenigora/ng-eval-core` (`modules/eval-core`), published at **0.3.0**.
`@zvenigora/ng-eval-signals` and `@zvenigora/ng-eval-forms` are dependencies, not work areas;
their suites are this phase's regression gate.

---

## 0. On the length of this document, and what makes this phase risky

[`docs/gates/plan.md`](../gates/plan.md) opened by saying its worst outcome was a spec that did not
earn its place, and came in at 765 lines against
[`docs/forms/phase-6-plan.md`](../forms/phase-6-plan.md)'s 3,420. This phase's worst outcome is
different in kind: it changes the evaluator that **all three published packages** run on, and the
findings below show that the change is not the additive one the roadmap brief assumes.

**The brief is wrong about the starting point, and that is finding 1.1.** `ROADMAP.md` says "the
evaluator itself only ever walks a single `Expression` node; there are currently no visitors for
`Program`, `VariableDeclaration`, `IfStatement`, `ForStatement`, or `BlockStatement`." The second
half is true and the first is not: `extractExpressions` defaults to **false**
([`parser-options.ts:7`](../../modules/eval-core/src/lib/internal/classes/eval/parser-options.ts#L7)),
so every evaluation already walks a whole `Program`, and acorn-walk's *base* walkers descend into
every statement body that has no visitor of ours. Statements do not fail today. They evaluate, and
they return values that are arbitrary.

So this phase does not add a capability beside an existing one. It **replaces silent
mis-evaluation with defined semantics**, which makes every step of it a behavioural change to an
already-shipped path — the second category in
[`.claude/skills/step/SKILL.md`](../../.claude/skills/step/SKILL.md), not the first.

That is why this document is longer than the gates plan and why its § 1 is mostly numbers. It is
still not Phase 6's length: the surface it adds is small, there is no framework boundary to read
per docblock, and four of the five decisions are settled by measurement rather than by argument.

**Everything in § 1 marked *measured* was run**, against the built package (`dist/`, i.e. the
published surface) from a throwaway script outside the repository, deleted afterwards. § 1.9
records the harness.

### 0.1 A rule this document applies to specs and did not apply to itself

`CLAUDE.md` says a probe checks the assertion and the setup must be checked separately, and § 3.1
sharpens it for this phase: *where this plan says an assertion is discriminating, it now states the
implementation that would pass it while being wrong.* That rule was written for **specs**. It was
not applied to the **exit criteria**, and three of them have now been caught naming a consequence
rather than a detector — each with a sound assertion over a condition the fixture could not reach:

| Where | The criterion as written | Why it could not fail |
| ----- | ------------------------ | --------------------- |
| [`program.spec.ts:150`](../../modules/eval-core/src/lib/internal/visitors/program.spec.ts#L150) | "resolves outer keys through the empty program scope" | § 8.1's presence rule means an empty scope shadows nothing, so the read answers correctly whether or not the scope was popped |
| Step 2, criterion 3 | "a second evaluation reads the source value afterwards" | the same defect inherited one step later, in the step that landed the fix which caused it |
| Step 3, the `__proto__` criterion | "asserted by reading the scope's prototype afterwards" | `scope.__proto__ = 1` is a **silent no-op** — `1` is not an object, so an unguarded write leaves the prototype intact and passes |

**The rule, stated for criteria as well as for probes: a criterion naming a property must state the
implementation that would satisfy it while being wrong.** A property is not a detector. The three
above are corrected in place rather than deleted, each with the wrong implementation named beside
it.

**Step 5's teardown criterion was the fourth candidate, and checking it found a fourth instance** —
so the count is four, not three. It is corrected in § 4 step 5; the short version is that
`for (…) { … }` leaving `ctx.scopes.length` at its pre-walk value, and returning `2`, are both
satisfied by a `ForStatement` visitor that **pushes no scope at all**: `let i` would bind into the
enclosing `Program` scope and `i++` would find it there. Restoring a depth nothing raised is the
purest form of this mistake, and it was one step away from being written.

**The correction was itself the fifth instance, and that is the part worth keeping.** The criterion
written to close the fourth — step 5's "the loop scope exists", added in this section's own
correction pass — read *"`for (let i = 0; i < 1; i++) { depth() }` reads **one higher** than the
enclosing statement list does"*. At the top level the enclosing statement list is `Program`, which
reads `1`; one higher is `2`; and `2` is exactly what the no-push implementation produces
(`Program` 1, then the body's own `BlockStatement` 2). **The detector written to catch the missing
push was satisfied by the missing push.** The arithmetic slipped because the body of a `for` is
itself a block, so the depth the criterion names is two pushes above the enclosing list and not
one. Corrected in § 4 step 5 to assert **both** body forms, which is what removes the ambiguity: a
bare body (`for (…) depth()`) reads `2`, one above the enclosing list with no block in the way, and
a block body reads `3`, one above the `2` a plain `{ depth() }` reads at the same position. Both go
red when nothing is pushed.

**The count belongs in the rule, because the count is the argument for it.** Five instances in this
phase, and the fourth occasion in this project on which a check caught its own author — the
identity-checked `exit` probe, Phase 3 step 4's shared-source pairing fixture, the fourth instance
above, and now the correction that produced it. A rule that has to be re-derived from a green suite
each time is not a rule; what makes this one load-bearing is that it keeps firing on the person
applying it, one level up, in the same pass. Neither "this criterion is about the plan, not a spec"
nor "this correction was written *under* the rule" is a reason to skip the check.

---

## 1. Findings that shape the design

### 1.1 Statements are not unsupported today — they are silently mis-evaluated

*Measured.* Each row is `parse(expr, { extractExpressions: false })` → `evaluate(ast, state)`, the
default path. "Stranded" is `state.result.stack.length` after `evaluate` returned — the values the
walk pushed that nothing popped, since
[`evaluate.ts:29`](../../modules/eval-core/src/lib/internal/functions/evaluate.ts#L29) pops exactly
one.

| Expression | Returns today | Correct | Stranded |
| ---------- | ------------- | ------- | -------- |
| `1 + 2` | `3` | `3` | 0 |
| `1; 2; 3` | `3` | `3` | **2** |
| `a; b` (a='A', b='B') | `'B'` | `'B'` | **1** |
| `let x = 1` | `1` | `undefined` | 0 |
| `let x = 1; x + 1` | **`NaN`** | `2` | 1 |
| `const y = 2; y` | **`undefined`** | `2` | 1 |
| `if (a) { 1 } else { 2 }`, a=**true** | **`2`** | `1` | 2 |
| `for (let i = 0; i < 3; i++) { i }` | **`NaN`** | `2` | 3 |
| `{ 1; 2 }` | `2` | `2` | 1 |
| `while (false) { 1 }` | **`1`** | `undefined` | 1 |
| `function f() { return 1 }` | **`1`** | `undefined` | 0 |
| `let [p, q] = arr` | the array | `undefined` | 0 |

Three things follow, and they set the shape of the whole phase.

**The right answer arrives by accident when it arrives at all.** `1; 2; 3` is correct only because
`Stack.pop` returns the last value pushed and the last statement happens to be the last thing
walked. `if (a) { 1 } else { 2 }` is wrong for a reason worth stating plainly: the base walker
visits **both** branches regardless of the test, so the `else` value is pushed last and wins — and
any call or assignment in the untaken branch has already run.

**A binding position is being evaluated as a read.** `let x = 1; x + 1` is `NaN` because the base
walker hands the declarator's `id` to `identifierVisitor`, which resolves `x` against the context,
fails, and pushes `undefined`; `x + 1` then reads the *outer* `x`, also absent. The declaration
binds nothing.

**Every statement form in the table is a live path with consumers on it.** Phase 2 changes the
value each row returns. That is the version-bump argument, made once here and not repeated: this
phase is `0.4.0` with a `CHANGELOG.md` entry, and its README section says what changed rather than
only what is new.

### 1.2 The value stack is already the completion-value mechanism

`evaluate` walks and then pops exactly one value
([`evaluate.ts:27-29`](../../modules/eval-core/src/lib/internal/functions/evaluate.ts#L27-L29)), so
whatever node it is handed must leave exactly one value behind. `ROADMAP.md` speculates that
control flow needs "a sentinel/completion value bubbled through `EvalState`, similar in spirit to
`eval-result.ts`/`eval-trace.ts`". It does not, and § 3.1 says why: with no `break`, `continue` or
`return` in scope there is no *abrupt* completion to bubble, and a statement's completion value is
just a value on the stack the enclosing block pops. The mechanism is a discipline, not a channel.

### 1.3 A9, measured: one throwing arrow body shadows a source key for the life of the context

[A9](../backlog.md#a9) is recorded as *Verified: source read* — read, not run. Run, on the built
package:

| Probe | `ctx.scopes.length` after | A later `evaluate('x')` on the same context |
| ----- | ------------------------- | ------------------------------------------- |
| `(x => boom())` called with `'SHADOW'`, `boom` throws | **1** | **`'SHADOW'`** |
| control: `(x => ok())` called with `'SHADOW'`, no throw | 0 | `'SOURCE'` |

The leaked scope is not merely present; it is **read first**, because `scopes` is step 1 of
[`EvalContext.get`](../../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L110-L138)'s
resolution order. This is the defect step 0 fixes, and it is the reason block scoping cannot be
built on the current idiom: a scope per block per iteration multiplies the two existing push sites
([`arrow-function-expression.ts:14-19`](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L14-L19),
[`pattern.ts:110-113`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L110-L113)) into
one per iteration of every loop.

### 1.4 Writes ignore the scope stack entirely — and the classic `for` loop forces this open

*Measured.* `(x => (x = 99))(1)` against `{ x: 'SOURCE' }` returns `99` and leaves the **caller's
object** holding `{ x: 99 }`. The arrow's parameter scope is not written; the source is.

The cause is one method:
[`EvalContext.set`](../../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L268-L276)
writes to `_original` and consults no scope. Both write sites route through it —
[`assignment-expression.ts:53`](../../modules/eval-core/src/lib/internal/visitors/assignment-expression.ts#L53)
and
[`update-expression.ts:27`](../../modules/eval-core/src/lib/internal/visitors/update-expression.ts#L27).

**This is not a nice-to-have for Phase 2, it is load-bearing.** `for (let i = 0; i < 3; i++)`
updates `i` through exactly that path, so without a scope-aware write every loop counter this
library ever runs is written into the consumer's context object — and left there. § 3.2 settles it.

### 1.5 `get` treats `undefined` as absent, so a `let` binding with no initializer cannot shadow

`EvalContext.get` returns the first scope value that is `!== undefined` and otherwise falls through
to `original`, `priorScopes` and `lookups`
([`eval-context.ts:110-138`](../../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L110-L138)).
`let x;` binds `undefined`, so a block-scoped `x` would fall through and read whatever the caller's
context has under that name.

Phase 1 already found this and already built the predicate for it:
[`hasInScopes`](../../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L188-L197)
asks about *binding* rather than value, and its docblock states the divergence for arrow parameters
in as many words. It has one caller —
[`identifier.ts:44`](../../modules/eval-core/src/lib/internal/visitors/identifier.ts#L44), for the
read hooks' `scoped` flag — and `get` is not it. So the library already answers "is this key bound
in a scope?" one way for hook consumers and another way for resolution. § 3.2's decision makes the
two agree.

### 1.6 E6, measured: the flush does cross a walk boundary — and this phase's design does not make it reachable

[`docs/side-effects/phase-1-plan.md` § 3.8](../side-effects/phase-1-plan.md) specifies `exit`'s
three cases and records the residual: *"`exit` has no mark, so it cannot tell 'absent from this
walk' from 'absent from the stack'."* [E6](../backlog.md#e6) carries it forward and says Phase 2 is
what makes it reachable.

*Measured*, driving the published `EvalHooks` directly — enter two nodes (the enclosing walk), take
the mark `evaluate` would take, enter a third (the nested walk), then close the **first** node:

| | Depth before | Mark | Depth after | Synthesised `completed: false` | Crossed the mark |
| - | - | - | - | - | - |
| case 2, node below the mark | 3 | 2 | **0** | 2 | **yes** |
| case 3 control, node never opened | 1 | — | 1 | 0 | no |

So the mechanism is exactly as § 3.8 described, and the damage is quantified: the nested walk's
`unwindTo(mark)` afterwards has nothing left to unwind, and one frame belonging to the enclosing
walk was closed under a hook event the consumer will read as that node completing.

**What the roadmap gets wrong here is the trigger.** E6 needs an `afterVisitor` with no matching
`beforeVisitor` *in the same frame*. Skipping a subtree does not produce one — an untaken `if`
branch or a `for` body that never runs is never entered, so nothing is left open. Only an *abrupt*
completion that abandons a partially-walked child does, and `break` / `continue` / `return` are out
of scope (§ 2). **Under the design in § 3.1, Phase 2 does not make E6 reachable.** § 3.3 settles
what to do about that.

### 1.7 There are three silent fall-throughs in this family, not one

[A2](../backlog.md#a2) records `update-expression.ts`'s `if`/`else if` chain pushing nothing on its
third path
([`update-expression.ts:19-37`](../../modules/eval-core/src/lib/internal/visitors/update-expression.ts#L19-L37)).
The same shape is in `assignment-expression.ts`
([:46-63](../../modules/eval-core/src/lib/internal/visitors/assignment-expression.ts#L46-L63)):
`node.left` that is neither `Identifier` nor `MemberExpression` falls past both branches to
`afterVisitor` with nothing pushed.

*Measured:* `[a, b] = arr` and `({m} = o)` both return `undefined`, throw nothing, and leave the
context **unchanged** — destructuring assignment is silently a no-op today. Third in the family; all
three now live in [A2](../backlog.md#a2), whose entry was rewritten to name them rather than read as
one bug (§ 8.4).

This matters to the phase for one reason: the statement visitors are `switch`-over-node-type
dispatchers, the same shape, and a `default:` that falls through silently is how this family
reproduces. § 3.1's convention makes that a compile-time and review-time impossibility rather than a
matter of care.

### 1.8 The performance gate is a behavioural guard, not a tight budget

`internal/performance.spec.ts` is a real gate per `CLAUDE.md`, but its one timing assertion allows
**5 seconds for 100 iterations**
([`performance.spec.ts:206`](../../modules/eval-core/src/lib/internal/performance.spec.ts#L206));
the rest of the file asserts *behaviour* — that results are not cached across contexts, that read
events are not built when no read hook is registered. Adding a `Program` visitor to a path that is
currently base-walked will not move it.

That is not licence to spend on the hot path. It means the gate for § 3.4's iteration bound is an
argument about where the counter lives, not a benchmark — see § 3.4.

*Measured baseline, for § 3.4's arithmetic:* a compiled `i < 3` evaluates **~1.4 M times per
second** (0.7 µs per walk, 200,000 runs, both with a fresh state per run and with one reused).

> **What step 1 actually found, and the one-line fix it took.** This section assumed the cost of a
> new visitor is the work that visitor does. For `Program` that is true and small — the
> program-level scope is 0.16 µs and the two extra trace entries 0.04 µs. **The cost that dominated
> was registration itself, and it landed on walks containing no statement node at all.**
>
> `walk.recursive` merges its `funcs` over the base walker by calling `walk.make` — allocating an
> object and copying every entry — **once per `evaluate`, not once per node**. Measured on the built
> bundle, walking a single `Literal` (one node, so almost pure fixed cost), with the *same*
> `evaluate.ts` on both sides and three registration lines the only difference:
>
> | visitor entries | per-call merge | merged once |
> | --------------- | -------------- | ----------- |
> | 19, before the statement visitors | 0.422 µs | — |
> | 22, with them | **1.045 µs** | **0.226 µs** |
>
> Three entries more than doubled it: a cliff, not a slope — the copy crosses a threshold where the
> engine stops treating the result as a fast-property object. Memoising `getDefaultVisitors()`
> recovers 0.03 µs of it and is not the fix; the merge is.
>
> **Step 1 builds the merged table once** (`evaluate.ts`, both entry points), which is **faster than
> the pre-statement baseline** rather than slower, and takes the whole class of problem off the
> table for steps 2–5, which add four more visitors. `2 + 3 * a` goes 0.652 µs → 0.429 µs; the same
> expression as a `Program` goes 0.759 µs → 0.535 µs.
>
> It is one line in a file already on step 1's list, and shipping a measured 2.3× per-walk
> regression in order to stay inside the original design would have been the wrong trade. Two
> mechanics are load-bearing and are documented at the call site: the table is **frozen**, because
> `EvalService` is `providedIn: 'root'` and one mutated entry would reach every later evaluation in
> the process; and it is built **lazily**, because a module-level `const` deadlocks the flattened
> bundle — `arrow-function-expression.ts` imports `evaluate`, so the built package throws
> `Cannot access 'arrowFunctionExpressionVisitor' before initialization` on import. Both were
> measured, not predicted. `getDefaultVisitors()` still returns a fresh mutable object to every
> caller, so nothing downstream loses anything.
>
> **This is a behavioural change to a published path in its own right** — every evaluation in the
> library gets faster, and the shared table is new shared state — so it belongs in the `0.4.0`
> entry beside § 1.1's rows.

### 1.9 The spike harness

Node 26, ESM, importing `dist/modules/eval-core/fesm2022/zvenigora-ng-eval-core.mjs` after
`npx nx run eval-core:build:production`, with `@angular/compiler` loaded first so the package's
`@Injectable` services can be constructed under JIT. Four scripts — statement behaviour (1.1),
A9 (1.3) and the write path (1.4), E6 (1.6), throughput (1.8) — written under the session scratch
directory, outside the repository, and deleted. Nothing under `modules/` was touched; `dist/` is
build output.

**Measuring against `dist/` rather than the source tree was deliberate**: every number above is
therefore a statement about the *published* package, which is the thing this phase's consumers
actually run.

---

## 2. Scope

### In scope

- `Program`, `ExpressionStatement` and `EmptyStatement` — the walk boundary and the completion
  convention (§ 3.1). `EmptyStatement` is a one-line `EMPTY` push and is in scope because § 3.1's
  dispatcher throws on anything it does not name: without it `a;;b` and `if (x) ;` would start
  throwing, which is a divergence nobody chose.
- `BlockStatement`, with block scoping (§ 3.2).
- `VariableDeclaration` for `let` and `const`, including the destructuring forms `pattern.ts`
  already implements, and scope-aware writes for assignment and update (§ 3.2).
- `IfStatement`, including `else if` chains.
- `ForStatement` — the classic three-part form — with the iteration bound of § 3.4.
- [A9](../backlog.md#a9) and [B2](../backlog.md#b2), as step 0.
- Bounding both of `EvalHooks.exit`'s routes — the scan and the identity fast path (§ 3.3).
- README "ESTree Nodes Supported" rows, a `CHANGELOG.md` entry, the `0.4.0` bump, and the backlog
  entries this phase moves.

### Out of scope — deliberately, with the reason

| Not in this phase | Why |
| ----------------- | --- |
| `break`, `continue`, `return` | Abrupt completion is a completion **record** with a type, not a value on a stack — a different mechanism from § 3.1, and the one that makes [E6](../backlog.md#e6) reachable. A phase of its own |
| `while`, `do…while`, `for…of`, `for…in` | `ROADMAP.md` defers them behind the classic `for` explicitly. They are cheap once § 3.1–§ 3.4 exist, and they are not free before |
| `var` | Function-scoped hoisting is a second scoping model beside § 3.2's. Open question 8.2 |
| `function` declarations, classes, `try`/`catch`, `switch`, labels | No design in this phase reaches them; each throws per § 3.1's dispatcher |
| Default values in patterns (`let {a = 1} = o`) | `AssignmentPattern` is commented out in `pattern.ts` ([:43-47](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L43-L47), [:67-68](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L67-L68)) and is its own work |
| The fall-through family of § 1.7 — `(a)++`, `[a, b] = arr`, `({m} = o)` | Defects this phase measured but did not create. Recorded together in [A2](../backlog.md#a2); § 8.4 says why fixing one of three here would be arbitrary |
| `@zvenigora/ng-eval-signals`, `@zvenigora/ng-eval-forms` | Dependencies. A step that needs a change in either is a stop-and-replan — **with one sanctioned exception, step 0b**, which exists because step 0 hit exactly that condition and the plan, not the step, has to decide it. 0b's file list is closed and enumerated in § 4; every other step keeps the original rule |
| The error-identity group — [A4](../backlog.md#a4), [A5](../backlog.md#a5), [A6](../backlog.md#a6), [A7](../backlog.md#a7), [C3](../backlog.md#c3) — and the write-policy pair, [C1](../backlog.md#c1) and [C2](../backlog.md#c2) | Not this phase's subject. [A10](../backlog.md#a10), opened in step 1, is argued to be the same defect as A4 and is out with it |

[A2](../backlog.md#a2) was the one deliberate maybe, and is settled at § 8.4: out.

**That row used to read "Everything in `docs/backlog.md` Track 1 / Track 2", and the entries are
named here because those two Tracks are not written down anywhere.** All three Tracks were a
sequencing suggestion made in conversation — 1 the error-identity group, 2 the write policy, 3 the
documentation gates — and only the third was ever recorded: it is glossed in
[`docs/backlog.md`](../backlog.md) beside the document list and titles every
[`docs/gates/`](../gates/plan.md) document, so "Track 3" resolves for a reader who follows it.
Tracks 1 and 2 never were, so this row pointed at a grouping nobody could look up and excluded
nothing checkable.

**That asymmetry is the reason it survived, and is why it is [F9](../backlog.md#f9)'s first
instance**: one member of a label family resolving is what lends the other two the appearance of
resolving. A reader who checks "Track 3" finds it and stops checking.

---

## 3. Design

### 3.1 Decision 1 — the completion-value convention

**This section is what `.claude/agents/code-reviewer.md` item 1 cites.** Item 1 says the
push/pop arithmetic for statements is this plan's to state, and that silence here is a finding
against the plan. The convention, in four rules:

1. **Every statement visitor pushes exactly one value on every exit path**, including the paths
   where the statement produced nothing. This is the same rule expression visitors follow; the
   arithmetic differs only in the pops.
2. **A statement visitor pops exactly one value per `callback(child, …)` it makes.** A visitor that
   walks K child statements pops K. This is where a block departs from an expression: `N` pops, one
   push.
3. **A statement that produces no value pushes `EMPTY`**, a sentinel, never `undefined`.
4. **`EMPTY` never leaves an evaluation's return value.** `evaluate` and `evaluateAsync` convert it
   to `undefined` immediately after `popVisitorResult`
   ([`evaluate.ts:29`](../../modules/eval-core/src/lib/internal/functions/evaluate.ts#L29),
   [:139](../../modules/eval-core/src/lib/internal/functions/evaluate.ts#L139)) — **at the walk
   boundary, not inside the `Program` visitor**. A draft of this plan put it in `Program` and was
   wrong: `arrow-function-expression.ts:17` calls `evaluate(node.body, st)` on a **`BlockStatement`**
   for a block-bodied arrow, so `x => { }` would have handed the sentinel straight to a consumer,
   on the one path § 3.6.1 documents as a deliberate divergence. Converting where the walk ends
   covers both entry points by construction.

**`EMPTY` is exported, and rule 4 is narrower than it first reads.** A statement visitor pushes and
*then* calls `afterVisitor`, which reads the value positionally off the top of the stack
([`after-visitor.ts:23-26`](../../modules/eval-core/src/lib/internal/visitors/after-visitor.ts#L23-L26)) —
so an `after` hook on a `VariableDeclaration`, an untaken `if`, or a zero-iteration `for` observes
the sentinel itself. Hiding it is not available: the alternatives are calling `afterVisitor` before
the push, which the same docblock warns reports the *neighbour's* value, or normalising inside
`afterVisitor`, which is a per-node cost on the hot path for a case only statements produce.

So the sentinel is part of the Phase 1 hook contract's `value` field and must be recognisable:
`EMPTY_COMPLETION` is exported for identity comparison, on the precedent of `ASYNC_HOOK_MESSAGE`,
which Phase 1 exported so a consumer could tell a diagnostic apart "without matching on message text
it would have to keep in sync by hand"
([`eval-hooks.ts:176-181`](../../modules/eval-core/src/lib/internal/classes/eval/eval-hooks.ts#L176-L181)).
The README's hooks section says so, and step 1 carries a spec asserting a hook sees it — an
undocumented sentinel arriving in a published event is worse than a documented one.

**Why a sentinel and not `undefined`.** JavaScript's completion-value semantics keep the last
*non-empty* value, and empty is not the same as `undefined`. The cost is one frozen symbol and one
identity comparison per statement in a block.

**The discriminating case is `{ 'a'; noop() }`, and two earlier drafts of this plan said otherwise.**
`{ 'a'; if (false) { 'b' } }` → `'a'` does **not** distinguish the sentinel from `undefined`: "keep
the last non-`EMPTY`" and "keep the last non-`undefined`" agree on it, because the empty statement
produced nothing under either reading. Only a statement that genuinely *produced* `undefined` —
`noop()` for a context function returning `undefined` — separates them, and it must win over the
earlier `'a'`. The drafts named the weaker case "the assertion that distinguishes the sentinel"
**twice**, in two different steps' exit criteria.

That repetition is the finding, not the typo. A named claim about what an assertion discriminates,
restated in a second place, is how a bad *setup* survives review: the second reader checks the
assertion against the claim rather than deriving the claim, which is the same shape as Phase 6's
`form()`/`schema()` criterion. Where this plan says an assertion is discriminating, it now states
the implementation that would pass it while being wrong — see step 2 and step 4.

**Why no completion record on `EvalState`.** `ROADMAP.md` anticipated a sentinel "bubbled through
`EvalState`". With no abrupt completion in scope (§ 2) nothing needs to bubble: an `if` that takes
no branch, or a `for` whose test is false at the top, simply pushes `EMPTY` and returns. Per-walk
mutable state on `EvalState` would also collide with the re-entrant `evaluate()` at
[`arrow-function-expression.ts:17`](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L17),
which runs a nested walk on the *same state* whenever the closure is called — the hazard
`code-reviewer.md` item 6 exists to catch. The stack discipline has no such coupling, because each
walk pushes and pops its own frames.

**The dispatcher is explicit and its default throws.** `Program` and `BlockStatement` iterate their
`body` and dispatch per statement type. A type this phase does not implement raises
`Error('Unsupported statement type: <type>')` rather than falling through to a base walker. This is
what retires § 1.1's table: `while (false) { 1 }` stops returning `1` and starts saying why, and
§ 1.7's family of silent fall-throughs gains no fourth member.

**It lives in `program.ts`, and the reason is its caller count.** `Program` is its first caller
(step 1) and `BlockStatement` its second (step 2), so it sits in the module of the first and is
imported by the second rather than getting a module of its own. **A third importer is when it earns
one** — until then a shared file would make `internal/visitors/` hold a utility module that also
exports a visitor, which is how a visitor directory stops being one. The single
`callback` / `popVisitorResult` pair lives inside it, so § 3.1's rule 2 is discharged in one place
for every statement list rather than per caller.

**The condition fired in step 4, and is recorded MET AND DEFERRED — not unmet.** `if-statement.ts`
is the third importer. It walks a single statement rather than a list, which `program.ts`'s own
docblock left as "a judgement for the step that adds it", and the judgement is that it counts: the
rule is about how many modules reach into `program.ts`, not about how many statements each of them
walks. What defers the move is scheduling and nothing else — no step's file list admits creating
`internal/visitors/dispatch-statement.ts` and rewriting three imports, and step 4 is not the place
to widen its own scope. **Declining on that ground is a schedule, so it needs a date:** the move
lands in **step 6**, whose file list is already the phase's wide one and whose subject is records
and release, or earlier in any step whose list already includes `program.ts` for another reason.
Named here rather than left implicit because the alternative is `ForStatement` arriving in step 5 as
a **fourth** importer against a rule that has now declined to fire twice, at which point the rule
means nothing. If step 6 does not move it, the reason goes in `docs/backlog.md`, not in a second
deferral here.

**Worked arithmetic**, for the review of every step below:

| Visitor | Pops | Pushes | Empty-path push |
| ------- | ---- | ------ | --------------- |
| `Program` | one per statement | 1 (`EMPTY` → `undefined`) | `undefined` |
| `BlockStatement` | one per statement | 1 (last non-`EMPTY`, else `EMPTY`) | `EMPTY` |
| `ExpressionStatement` | 1 (the expression) | 1 (that value) | — |
| `VariableDeclaration` | one per declarator `init` walked | 1 | always `EMPTY` |
| `IfStatement` | 1 (test) + 1 (the branch taken, if any) | 1 | `EMPTY` when no branch runs |
| `ForStatement` | 1 (init, if present) + **1 per test evaluated, which is n+1 for n iterations** + per iteration: 1 (body) + 1 (update, if present) | 1 | `EMPTY` when zero iterations |

**The `ForStatement` row's test count is n+1 and an earlier version of this table said n.** It read
"per iteration: 1 (test) + 1 (body) + 1 (update)", which groups the test with the iteration it
admits and so loses the **final, falsy** test — a real `callback`/`pop` pair that runs after the
last body. Rule 2 held literally the whole time (one pop per `callback`, and the code always did
that); what was wrong was the table a reviewer checks the code *against*, in the direction that
would have made a correct visitor look like it over-popped. Pinned in `for-statement.spec.ts`'s
"should evaluate the test once more than the body", which reads `[0, 1, 2, 3]` tests against
`[0, 1, 2]` bodies.

### 3.2 Decision 2 — block scoping

**One scope per block entry, and one per loop — not one per iteration.** See § 3.5's `ForStatement`
bullet for why not, and § 3.6.5 for what would have to change first.

**This paragraph said the opposite until step 5, which is the failure § 0.1 names, one level up.**
It read: *"one scope per loop **iteration** … a fresh scope per iteration is what makes a closure
created inside the body capture that iteration's binding, which is `let`'s defining property;
reusing one scope for the whole loop is the `var` semantics § 2 excluded."* The decision moved in
§ 3.5 — on the finding that the per-iteration scope buys a property **no spec in this evaluator can
assert**, because `arrow-function-expression.ts` closures capture `st` and not a scope chain — and
this paragraph was left standing, naming the shipped design as the excluded one. What makes it worth
correcting rather than ignoring is *where* it sits: this is the section gate 3 and § 4's scope-push
rule cite, so it is the paragraph a later phase revisiting block scoping reads first.

The `var` comparison does not survive the correction either, and not only because the design
changed: one scope for the whole loop is **not** `var` semantics here. `var`'s distinguishing
property is function-scoped hoisting, which § 2 excludes for a different reason and which
`variableDeclarationVisitor` rejects on `kind`. What one-scope-per-loop actually costs is
per-iteration closure capture, which § 3.6.5 records as already absent for reasons that predate
this phase.

**The idiom is step 0's, applied at every new site**:

```ts
st.context?.push(scope);
try {
  // … walk the block's statements …
} finally {
  st.context?.pop();
}
```

Step 0 puts exactly this shape at the two existing sites
([`arrow-function-expression.ts:14-19`](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L14-L19),
[`pattern.ts:110-113`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L110-L113)),
which is the whole reason it is step 0 rather than cleanup: the three new push sites — `Program`,
`BlockStatement`, `ForStatement` — copy whatever the existing two do, and § 1.3 measured what the
current shape costs when a body throws. Every new
push site in this phase is reviewed against `code-reviewer.md` item 3, including its probe — one
`EvalContext` handed to two evaluations, the first throwing inside a pushed scope.

**Reads.** `EvalContext.get` already searches `scopes` first, innermost first
([`stack.ts:79-82`](../../modules/eval-core/src/lib/internal/classes/common/stack.ts#L79-L82) reverses, so
`asArray()` is top-down), which is the correct order for nested blocks with no change. The one gap
is § 1.5: a binding whose value is `undefined` reads as absent, so `let x;` cannot shadow.

**Decided (8.1): `get` treats a binding in a *pushed scope* as present whatever its value, and
nothing else changes.** The narrowing is what makes it safe, and it is narrow against two named
consumers rather than against a general worry:

- **Phase 1's arrow-parameter resolution.** `hasInScopes`' docblock
  ([`eval-context.ts:168-187`](../../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L168-L187))
  states the divergence deliberately: a parameter bound to `undefined` is still a parameter, but
  `get` falls through past it. This phase closes that for the scope stack, which is the change —
  named here so a future reader knows it was made on purpose and against what.
- **`eval-forms`' documented empty-control behaviour**
  ([`docs/forms/phase-4-plan.md`](../forms/phase-4-plan.md) § 3.4.3): an empty `FormControl` falls
  through to the form value because `EvalContext.get` treats `undefined` as absent at **every** step.
  That fall-through is **within `lookups`** — `createFieldContext` installs the field resolver and
  the form resolver as two resolvers on the same context, which is the composition Phase 4 chose
  over a merged record — and not in the scope stack, so this change does not reach it. `eval-forms`
  keeps the limitation it documented rather than having it silently repaired under one adapter.
  (An earlier draft of this plan placed that fall-through "between `original` and `lookups`". Wrong
  in the one direction that matters: a later phase told to watch `original` would widen `lookups`
  and break `eval-forms` believing it had checked.)

A later phase that wants presence semantics everywhere now has to argue against both of these by
name, instead of rediscovering them from a green suite.

**Writes are the forced part** (§ 1.4). `for (let i = 0; i < 3; i++)` cannot work without them, so
this phase adds:

```ts
/** Assigns to the innermost pushed scope that binds `key`; false when none does. */
public setInScope(key: unknown, value: unknown): boolean
```

on `EvalContext`, and both write sites — `assignment-expression.ts` and `update-expression.ts` —
try it before falling back to today's `set`. Consequences, stated rather than discovered in review:

- It is **additive** as a symbol and **behavioural** at the two call sites. `(x => (x = 99))(1)`
  stops writing `99` into the caller's object (§ 1.4's measurement) and writes the arrow's parameter
  scope instead. That is JavaScript's semantics and today's behaviour is not, but it is a change to
  a shipped path: callout, bump, `CHANGELOG.md`.
- **`setInScope` returns `false` when no pushed scope *binds* the key, and the fallback to `set` is
  load-bearing rather than tidy.** `eval-signals` enforces its read-only policy by subclassing
  `EvalContext` and overriding `set` to throw
  ([`signal-context.ts:112-117`](../../modules/eval-signals/src/lib/signal-context.ts#L112-L117)),
  so every write that reaches the source goes through the one method it overrides. An
  implementation that wrote the innermost scope unconditionally — or created the binding when absent
  — would route `count = 5` around that override and **silently disable the policy of a published
  library**. Binding-presence, not scope-presence, is what keeps the fallback reachable.

  **The word "silently" was true when written and false by step 3.** It rested on `eval-signals`'
  write cases running with *no scopes pushed at all* — which step 1 ended, by giving `Program` a
  scope on every evaluation. Scope-presence is therefore now satisfied by every expression this
  library evaluates, `count = 5` included. Measured in step 3 by building the wrong implementation:
  `eval-signals` **10 red**, `eval-forms` **10 red**, `eval-core` **20 red**. The downstream suites
  *are* detectors for this, and step 3's criterion is corrected below.

  **The in-library cases stay regardless**, and the distinction is worth keeping: a suite that is
  this step's *regression gate* catching a defect is not the same as a test built to catch it. The
  downstream rows fail four files away, in two packages this step does not touch, for a reason
  their own specs do not name.

  **This is § 0.1's shape one level up.** What went stale was not an assertion but a *premise about
  the fixture* — "no scopes pushed" — which a change three steps earlier had quietly falsified,
  while the plan went on asserting it in two places.
- **The blast radius, checked rather than assumed.** Every write case pinned in `eval-signals`'
  specs is a bare identifier the source binds (`count = 5`,
  [`eval-signal.spec.ts:300-330`](../../modules/eval-signals/src/lib/eval-signal.spec.ts#L300-L330)),
  which takes the fallback and still throws; no spec in either downstream library assigns to an
  arrow parameter. So both suites are expected to stay green, and movement in either is a finding
  rather than an expectation to update.

  **This remains true of the *correct* implementation and stopped being true of the wrong one.**
  Step 3 measured it by inverting `setInScope` to scope-presence: `eval-signals` reddens **10**,
  `eval-forms` **10**, `eval-core` **20**. See the correction two bullets down.
- **What it deliberately relaxes**: a write to a binding the expression itself created — an arrow
  parameter, or a `let` from step 3 — no longer throws `SignalContextWriteError` under
  `eval-signals`, because it mutates nothing the consumer owns. That is a prerequisite for `for`'s
  `i++` to work at all inside a signal, and it is the one place this phase changes what a downstream
  policy covers. It belongs in the CHANGELOG entry, not only here.

**Scope objects are plain records built by the visitor**, handed to `EvalContext.push`, which
normalises through `fromContext`
([`eval-context.ts:283-286`](../../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L283-L286)).
No new class, and two mechanics that a draft of this plan got wrong:

- **The record the visitor builds is not always the object on the stack.** `fromContext`
  **copies** a plain record into a `Registry` when `caseInsensitive` is set
  ([`context.ts:20-31`](../../modules/eval-core/src/lib/internal/classes/common/context.ts#L20-L31)).
  So a visitor may not keep a reference to its record and expect later writes through it to be
  visible, and nothing may be stored *on* the record that the visitor needs to read back. Every new
  push site passes the walk's `options`, so a block binding is case-insensitive exactly when the
  evaluation is; omitting them would make block bindings case-sensitive inside an otherwise
  case-insensitive evaluation, which is a divergence nobody asked for.
- **`const` kinds live beside the scope, not in it.** A metadata key on the record is itself
  resolvable as a binding name — `getContextValue` reads the same surface — so `let __kind` would
  be readable from an expression. Kinds go in a `WeakMap<Context, Set<string>>` on `EvalState`,
  checked at the write site only, so reads pay nothing.

**Binding targets go through the pollution guard** (`code-reviewer.md` item 9). Declarations are a
new way to name a property, and the two places a binding is written today write raw —
[`pattern.ts:76`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L76)
(`object[pattern.name] = arg`) and
[`pattern.ts:116`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L116). On a plain
record `__proto__` is a setter, so `let __proto__ = x` and `let { __proto__: p } = o` would set a
prototype rather than bind a name. The guard is
[`prototype-pollution-guard.ts`](../../modules/eval-core/src/lib/internal/visitors/prototype-pollution-guard.ts),
the same one `member`, `assignment`, `update` and `object` already use, and its specs say which
names are rejected. This is a surface this phase widens, so it is stated rather than assumed.

**The guard and the dispatch are two decisions, and an earlier version of this paragraph named one
mechanism for two write shapes.** It said "routes every binding write through `safeSetProperty`",
which is right for one of the two sites and silently wrong for the other:

- **Rejection is `isDangerousProperty(key)`, at every binding site.** That is the whole of the
  security decision, and it is shape-independent.
- **Dispatch depends on what the target is.** `safeSetProperty` finishes with
  `Object.defineProperty`, which suits the two `pattern.ts` sites: both build plain `{}` records
  before anything is pushed. It does **not** suit a write into an *already-pushed* scope, which is
  what `VariableDeclaration` does — `EvalContext.push` routes through `fromContext`, which copies a
  plain record into a `Registry` when `caseInsensitive` is set, and a `Registry` is Map-backed.
  `Object.defineProperty` on one defines a property on the **instance** and inserts nothing into the
  map, so the binding would be written and then not found. Scope writes therefore dispatch through
  `setContextValue`, which asks the `Registry` question first.

**The failure mode is why this is recorded rather than left to the implementer**: it is silent, it
is confined to `caseInsensitive`, and every case-sensitive spec passes through it unharmed — a
plain-record scope takes the `defineProperty` path and behaves. A suite whose scope specs are all
case-sensitive would report a green `let` that binds nothing for the one option that reshapes the
scope.

### 3.3 Decision 3 — bounding `exit`'s scan (E6)

**Settled together with § 3.1, as [E6](../backlog.md#e6) asks.** The completion mechanism chosen
there is what decides this: because there is no abrupt completion, no visitor in this phase abandons
a partially-walked child, and **Phase 2 does not make E6 reachable** (§ 1.6). E6's own text says the
opposite, so this phase corrects that premise rather than inheriting it.

**Bound the scan anyway, in step 1.** Three reasons, in order of weight:

1. The failure is silent when it happens — § 1.6 measured a stack drained from depth 3 to 0 past a
   mark of 2, with two `after` events a consumer reads as ordinary completions.
2. The phase that *does* make it reachable is the `break`/`continue` phase, which will be written
   against these visitors as precedent. Leaving the trap armed under seven new statement visitors is
   how a residual becomes a defect.
3. It is small, and the mechanism already exists: `depth(state)` and `unwindTo(mark, …)` are the
   same idea one level up
   ([`eval-hooks.ts:510-540`](../../modules/eval-core/src/lib/internal/classes/eval/eval-hooks.ts#L510-L540)).

**Shape.** `evaluate` and `evaluateAsync` already capture a mark
([`evaluate.ts:22`](../../modules/eval-core/src/lib/internal/functions/evaluate.ts#L22),
[:132](../../modules/eval-core/src/lib/internal/functions/evaluate.ts#L132)) but keep it in a local,
where `exit` cannot see it. Move that mark onto the per-run bookkeeping as a stack of walk bases:
`evaluate` pushes its base on entry and pops it in a `finally`, and **both** of `exit`'s routes
respect it.

- The `lastIndexOf` scan
  ([`eval-hooks.ts:487`](../../modules/eval-core/src/lib/internal/classes/eval/eval-hooks.ts#L487))
  searches no further down than the current base.
- **The identity fast path
  ([`eval-hooks.ts:480`](../../modules/eval-core/src/lib/internal/classes/eval/eval-hooks.ts#L480))
  needs the same bound, and a draft of this plan missed it.** It returns before the scan and pops
  unconditionally, so when a nested walk has opened nothing yet, the top of the stack *is* the
  enclosing walk's node and an unmatched `after` for it crosses the boundary by the cheap route.
  Bounding only the scan would leave the case reachable and § 1.6's spike would not see it —
  that sequence opens a third node before closing the first, so it exercises case 2 only.

A node open only in an enclosing walk therefore falls into case 3 by either route — pop nothing,
emit nothing — which is the behaviour § 3.8's table already specifies for "not open at all".

`EvalHookBookkeeping` is `@internal` and unexported, so this is not published surface. The cost is
two array operations per `evaluate` call, guarded by `state.hasHooks`, and none per node.

**Two counters land in step 1, and they cannot be merged — which is the thing to read before
§ 3.4.** The walk-base stack above and § 3.4's walk-depth counter track the same nesting one level
apart, and step 5 will see them side by side and be tempted to collapse them. It cannot:

- the **walk bases** are pushed and popped only under `state.hasHooks`, because bounding
  `EvalHooks.exit` is meaningless when there is nothing to dispatch, and the whole point of the
  guard is that the default path pays nothing;
- the **walk-depth counter** must be maintained unconditionally, because § 3.4's budget refills on
  the outermost `evaluate` entry and a loop has to be bounded whether or not a hook is registered.

One field cannot be both guarded and unguarded, so there are two, and the note lives on
`EvalState.walkDepth` in the code as well as here. `EvalHooks.walkBase` reads an empty stack as
base 0 — unbounded, which is the correct answer for a walk that began before any hook existed and
so pushed no base.

**Probe** (step 1's, and it is § 1.6's spike promoted to a spec), three cases:

1. Case 2 across a boundary — § 1.6's sequence — leaves depth at the mark and synthesises **zero**
   events.
2. **The fast path across a boundary**: open a node, take the mark, open nothing, close that node.
   Depth stays at the mark. This is the case a scan-only bound passes while still being wrong.
3. Control: case 3 with a node never entered stays a no-op, or the bound has been implemented as
   "never pop" rather than "act within this walk".

Reverting the bound must turn 1 and 2 red and leave 3 green.

### 3.4 Decision 4 — non-termination

**A bound exists, it is an iteration budget on `EvalState`, its default is finite, and exceeding it
throws.**

| Question | Decision |
| -------- | -------- |
| Per loop, or per evaluation? | **Per evaluation.** A per-loop cap multiplies under nesting: two nested loops at 100 k each is 10¹⁰ iterations, which is not a bound |
| Where does the counter live? | `EvalState`, decrement-only, never reset by a visitor — see the row below for what "per evaluation" means, which is not "per state" |
| Per state, or per `evaluate()` entry? | **Per outermost `evaluate()` entry.** `EvalState` carries a walk-depth counter that `evaluate` increments on entry and decrements in a `finally`; the budget is refilled only on the 0 → 1 transition. This is forced by two cases a per-state budget gets wrong: the documented `createState` + repeated `eval` style ([`eval-state.ts:103-124`](../../modules/eval-core/src/lib/internal/classes/eval/eval-state.ts#L103-L124) describes counters accumulating for the life of the state under exactly that style) would erode one budget across independent evaluations, and an **escaped closure** — an arrow that outlives its walk — would carry that walk's spent budget and throw "exhausted" on a later call. A nested `evaluate` from an arrow body *during* a walk still shares the remaining budget, which is the half `code-reviewer.md` item 6 is about and the half the plan had right |
| Default | **100,000 iterations** |
| Configurable? | Yes, `maxIterations` on `EvalOptions`. A caller may raise it, or set `Infinity` and own the consequence |
| Behaviour at the limit | Throw. `Error('Iteration budget exhausted after 100000 iterations')` — a runaway loop that silently returns a partial value is the failure mode this exists to prevent |

**The budget is per `EvalState`, and one level up that is still a multiplier a determined consumer
can reach.** `chargeIteration` spends the counter of the state the visitor is running on, refilled
on *that* state's 0 → 1 transition. An arrow value produced by evaluation A and installed into
evaluation B's context still resolves against A's state; called from inside B's loop body, A's
`walkDepth` is 0, so every call refills A's budget and B's 100,000 iterations can drive 100,000 of
them. This is the "per-loop caps multiply" failure the first row rejects, surviving one level above
where the fix was applied. It needs a consumer to carry a closure between contexts deliberately —
no path inside this library does it, and `code-reviewer.md` item 6's hazard is the *other*
direction — so it is recorded rather than defended against. A phase that makes cross-context
closures ordinary has to revisit where the counter lives.

**It also bounds time and not memory**, which § 3.4 did not consider and step 5's review found:
`EvalResult.trace` gains an entry per push and is never reset, so a loop's trace grows as
iterations × nodes and the allocation is paid *before* the throw. `docs/backlog.md`
[A12](../backlog.md#a12) carries the measurements; `Infinity` is where it bites.

**Why 100,000.** § 1.8 measured ~1.4 M simple walks per second; a loop iteration is roughly three of
them (test, body, update), so ~2 µs. 100,000 iterations is **~0.2 s** before the throw — short
enough that a Jest spec fails fast rather than timing out at 5 s, and short enough that a browser
tab stutters rather than freezes. It is also far above any expression a rule author writes by hand.

**What it costs on the no-loop path: nothing, structurally.** The counter is decremented inside
`ForStatement`'s iteration loop and nowhere else, so an expression with no loop never executes the
instruction — this is not a claim about a guard being cheap (`code-reviewer.md` item 8), it is the
absence of a call site. The alternative design, a per-node fuel budget decremented in
`beforeVisitor`, *would* be on the hot path and is rejected for that reason; it buys protection
against pathological recursion, which this phase does not introduce.

### 3.5 What each visitor does

Registered in
[`recursive-visitors.ts`](../../modules/eval-core/src/lib/internal/visitors/recursive-visitors.ts#L20-L45)
alongside the existing nineteen. Every one brackets its body with `beforeVisitor` / `afterVisitor`
on **every** exit path (`code-reviewer.md` item 2), and satisfies § 3.1's arithmetic.

- **`Program`** — **push a program-level scope** in a `try`/`finally`, dispatch over `body`, pop one
  per statement, keep the last non-`EMPTY`, push once.

  **The scope is required, and a draft of this plan said the opposite.** That draft had `Program`
  push nothing, on the reasoning that the top level "shares the caller's context, which is what
  makes `let x = 1; x + 1` resolve `x` at all". The reasoning is backwards — `get` searches `scopes`
  first and *falls through* on a miss, so a program scope costs no outer resolution — and the
  omission broke two things elsewhere: a top-level `let` would have had nowhere to bind but
  `EvalContext.set`, i.e. the caller's object, contradicting step 3's "the caller's context object
  is unchanged" and making § 3.2's relaxation false, since `set` is the method `eval-signals`
  overrides to throw.

  It is also the one place this phase adds work to **every** evaluation, loops or not, which is why
  step 1 measures it rather than asserting it is cheap.
- **`BlockStatement`** — push a scope (§ 3.2), dispatch over `body` in a `try`/`finally`, keep the
  last non-`EMPTY`, push once.
- **`ExpressionStatement`** — walk `expression`, pop one, push it. A pass-through, registered rather
  than left to the base walker so that hooks see the statement and § 3.1's rule has no exception.
- **`EmptyStatement`** — push `EMPTY`. One line, and the reason it exists is the dispatcher's
  throwing `default:`, which would otherwise make `a;;b` an error.
- **`VariableDeclaration`** — for each declarator: walk `init` if present and pop one, else bind
  `undefined`; bind through the existing `evaluatePattern` for the destructuring forms; record the
  declaration kind for `const`. Pushes `EMPTY` always.
- **`IfStatement`** — walk `test`, pop one; walk exactly one branch or neither, **through
  `dispatchStatement`**; push that branch's value or `EMPTY`. The untaken branch is **not walked**,
  which is the behavioural fix in § 1.1's table. A taken branch that produced nothing propagates
  `EMPTY` — `if (true) { }` pushes the sentinel exactly as `if (false) { 1 }` does, by two different
  routes.

  **It pushes no scope, and the reason belongs in its docblock rather than only here** (§ 6 gate 3
  checks every push, so a visitor with no `try`/`finally` has to say why it needs none). Three
  routes, all closed: a block body gets its scope from `BlockStatement`; a bare declaration body is
  not legal JavaScript for `let` / `const`, so `if (a) let x = 1` never parses; and `if (a) var x = 1`
  does parse but is rejected inside `variableDeclarationVisitor`, which reads `kind` and throws
  before reaching `bindingScope`. So no binding can arrive needing a scope this visitor would have
  had to push, and it touches `EvalContext` not at all.
- **`ForStatement`** — push **one** scope for the loop, in a `try`/`finally`; walk `init` once; per
  iteration walk `test` (an absent test is `true`), `body`, then `update`, charging one against
  § 3.4's budget; keep the last non-`EMPTY` body value; push once.

  **`init` has two node shapes and they take two routes**, which § 3.1's table does not say because
  its arithmetic is the same for both. `for (let i = 0; …)` parses `init` as a
  **`VariableDeclaration`** — a `Statement`, so it goes through `dispatchStatement` and pops the
  `EMPTY` that visitor pushes. `for (i = 0; …)` parses it as an **`Expression`**, which takes a raw
  `callback` and pops its value. One pop either way, so the table holds and the difference is
  invisible to it — which is exactly why it is written into the visitor's docblock instead. What
  depends on it is the throwing `default`: only the `dispatchStatement` route has one, so a future
  `init` shape that is a statement this library does not implement is rejected, while an expression
  shape falls to the base walker as every other expression position does. `body` and the two
  expression positions are the same split: `body` is a `Statement` and dispatches, `test` and
  `update` are expressions and do not.

  **One scope for the loop, not one per iteration — and the deleted paragraph is worth keeping
  visible.** A draft of this plan specified a fresh scope per iteration, seeded from the head's
  bindings and copied back after `update`, and called that copy-in/copy-back "the subtle part"
  because it is what makes a closure capture its own iteration. **It makes no observable difference
  in this evaluator**, so the mechanism was subtle and unobservable at once. The closure
  `arrow-function-expression.ts` builds
  ([:14-20](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L14-L20))
  captures `st`, not a scope chain: it resolves its free variables against `st.context` **as it is
  when the closure is called**, and by then the loop has popped every scope it pushed. So a closure
  called during its own iteration reads the right value under either design, and one called after
  the loop reads nothing under either. The per-iteration design would have allocated a scope and
  copied bindings twice per iteration — `code-reviewer.md` item 8's per-iteration cost — to buy a
  property no spec can assert.

  Giving closures a captured scope chain is real work in `arrow-function-expression.ts`, in no
  step's file list, and it changes a shipped path Phase 1 documented as deliberate. It is out
  (§ 3.6.5), and it is what a later phase would have to do before per-iteration scopes mean
  anything.

### 3.6 Divergences from JavaScript, stated rather than discovered

Each of these is a README line, not a defect to be filed later.

1. **An arrow function with a block body returns the block's completion value**, where JavaScript
   returns `undefined` without a `return`. `x => { 1 }` yields `1` here.
   [`arrow-function-expression.ts:17`](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L17)
   calls `evaluate(node.body, st)` and takes what it returns; with `return` out of scope (§ 2), the
   completion value is the only answer available that is not an error. Today the same expression
   returns whatever the base walk stranded, so this replaces an accident with a documented rule
   (§ 8.3).
2. **`const` reassignment throws at the write, not at parse time.**
3. **An unsupported statement type throws** (§ 3.1), where today it returns a value (§ 1.1).
4. **No hoisting.** A `let` is bound when its declaration is reached; reading it earlier reads the
   enclosing context rather than raising a temporal-dead-zone error.
5. **Closures do not capture their lexical scope.** An arrow function resolves its free variables
   against the context *as it is when it is called*, not as it was where it was written
   ([`arrow-function-expression.ts:14-20`](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L14-L20)).
   So an arrow created inside a block or a loop body sees nothing of that block's bindings once
   the block has exited: `for (let i = 0; i < 3; i++) { fns.push(() => i) }` leaves three functions
   that all read whatever `i` resolves to at call time, which after the loop is the caller's `i` or
   nothing. This is pre-existing behaviour — the statement visitors neither cause it nor worsen it —
   and § 3.5's `ForStatement` bullet records that it is what makes a per-iteration scope pointless.
6. **A pattern form the binder does not implement throws** rather than binding nothing (§ 4 step 3).
   `let { a = 1 } = o` is the reachable case: `AssignmentPattern` is commented out in `pattern.ts`,
   and `evaluatePattern` returns an empty context for any unhandled type
   ([:71](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L71)), which would be a fourth
   member of § 1.7's silent-fall-through family arriving in the same phase that promises not to add
   one.

   **There are two sites, not one, and the named example does not reach the one named here.** Step 3
   found it: a default in an **object** pattern is parsed as `Property.value` of type
   `AssignmentPattern`, so `evaluateObjectPattern` matches its `Property` case and hands the node to
   `callback` — walking it as an *expression*. It reaches neither of the module's two `switch`
   defaults, and `let { a = 1 } = o` bound silently through a `default:` that had just been added
   for it. The **array** form (`let [a = 1] = arr`) and the **parameter** form (`(a = 1) => a`) do
   go through `evaluatePatterns` and are covered there. So the fix is a `default:` in each `switch`
   *and* a check in the `Property` branch.

   The general shape is worth the line: a fall-through guard placed where the type is *enumerated*
   misses every path that reaches the same node through a `callback` instead — which is how a node
   type can be "handled" and unhandled at once.
7. **A binding name on the prototype-pollution blocklist is rejected — including as an arrow
   function parameter.** `(toString => toString)(1)` returned `1` before step 3 and now throws
   `Access to dangerous property "toString" is blocked…`; so do `constructor`, `prototype`,
   `valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString` and the
   four `__define`/`__lookup` accessors.

   **Found in step 3's review, and it is a shipped path this step widened without meaning to.**
   § 3.2 routes binding writes through the guard because `__proto__` is a setter on a plain record;
   the binder it routes (`evaluateIdentifier` in `pattern.ts`) is the *same* one arrow parameters
   have always used, so the whole 13-name blocklist arrived on a form that had nothing to do with
   declarations. Of those names only `__proto__` is an actual write vector into a fresh `{}` —
   `let toString = 1` would have created a harmless own property — so the net is wider than the
   threat.

   **Kept wide rather than narrowed, and the reason is consistency of the blocklist, not of the
   threat.** `member`, `assignment`, `update` and `object` already reject all thirteen at their own
   write sites; a binder that rejected one of them would make "is this name blocked?" depend on
   which visitor you reached it through, which is harder to reason about than a name nobody should
   be binding anyway. Narrowing it to the actual write vectors is a real option and is a decision,
   not a tidy-up — it belongs to whoever revisits the blocklist as a whole (`docs/backlog.md`
   [B1](../backlog.md#b1) is the other half of that subject). Pinned in
   `variable-declaration.spec.ts`, so step 6 transcribes it from a green spec.

---

## 4. Work breakdown

One numbered step per session, per `CLAUDE.md`. Lint and the full suite after every step, and every
step leaves all three projects green. Each step states its category — additive, or a behavioural
change to an already-shipped path — because
[`.claude/skills/step/SKILL.md`](../../.claude/skills/step/SKILL.md) requires it in the § 2
restatement; the categories are pre-filled here so a step cannot quietly read itself as cleanup.

**Every step that adds a visitor edits `recursive-visitors.ts` *and*
`internal/visitors/public-api.ts`, and dispatchable statement types also edit `program.ts`.**
Written here rather than repeated per step because three steps' file lists have now been found
incomplete in the same way and amended at the start of the session that hit them — step 2 for
`program.ts`, step 3 for `public-api.ts` and `program.ts`, step 4 for both. A fourth rediscovery in
step 5 would make the omission a property of this document rather than an accident. `public-api.ts`
here is the **visitors** barrel, which `src/public-api.ts` does not re-export, so it adds nothing to
the published surface (§ 5's last row); `recursive-visitors.ts` is what makes the visitor run at
all, and `program.ts` is what makes it reachable from a statement list.

### Step 0 — [A9](../backlog.md#a9) and [B2](../backlog.md#b2)

**Category: behavioural.** **Files**: `arrow-function-expression.ts`, `pattern.ts`, a spec for each,
`docs/backlog.md`.

`try`/`finally` at both scope-push sites; delete the `console.log` at
[`pattern.ts:83`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L83), folding the node
type into the throw's message. Short by design — the argument is already in the backlog.

**The two sites are asserted by different routes, and the second route is not a choice.** The arrow
site is reachable by evaluating an expression. The `pattern.ts` site is not: acorn rejects a
`MemberExpression` as a binding target in a parameter list in every form, at every `ecmaVersion`
(B2's three reachability checks), so an evaluation-driven spec cannot enter that branch and would
**report green over nothing**. Step 0 therefore calls `evaluatePattern` directly with a hand-built
node and asserts the throw and its message. Stated here rather than left to the
implementer, because the wrong choice is the one that looks more idiomatic.

**Corrected during step 0: `pattern.ts` needs two fixtures, not one.** An earlier draft of the
criterion below asked for one hand-built `MemberExpression` node to carry both of that file's
assertions. It cannot, and the failure is silent. The two repairs are in two functions that never
call each other: the throw is at
[`:84`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L84) in
`evaluateMemberExpression`, and the scope push is at
[`:110-113`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L110-L113) in
`evaluateObjectPattern`. A `MemberExpression` throws from `:84` having executed **no push**, so
`scopes.length` is unchanged because nothing happened — the assertion passes identically against
the unfixed code, which is the vacuous setup `CLAUDE.md` describes. Asserting the pop survives a
throw requires the throw to land *between* the push and the pop, which needs an `ObjectPattern`
whose `Property.value` throws when walked:
[`:111`](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L111) is
`callback(pattern.value, st)`, dispatching to that node type's registered visitor.

**The idiom, stated because three more push sites copy it** (`Program`, `BlockStatement`,
`ForStatement`, steps 1/2/5). Both push sites are written `st.context?.push(...)`, so the `try`
opens on the line **after** the push, never around it:

```ts
const newContext = evaluatePatterns(node.params, st, callback, arrowArgs);  // outside
st.context?.push(newContext);                                               // outside
try {
  return evaluate(node.body, st);
} finally {
  st.context?.pop();
}
```

A `try` opened one line early is wrong in two ways, neither of which any suite reports: it brings
the context-building call inside the bracket, where a throw from it is swallowed into a pop; and
when `st.context` is undefined the optional chain skips the push while the `finally` still runs a
`pop()` that was never paired. Gate 3 checks the pairing; this is where the line goes.

**Exit criteria**
- A spec reproduces § 1.3's measurement — one `EvalContext`, an arrow whose body throws, then a
  second evaluation on the same context — and asserts `scopes.length === 0` and that the later read
  returns the source value. It fails when the `finally` is reverted.
- The `pattern.ts` repairs have **two** specs, both entered by a **direct call** to
  `evaluatePattern` with a hand-built node, because one node cannot reach both functions: a
  `MemberExpression` fixture asserting the throw and its message, and an `ObjectPattern` fixture
  whose property value throws when walked, asserting `scopes.length` is back to its pre-call value
  after it. Only the second is evidence about the push, and it fails when that `finally` is
  reverted.
- Each `finally` is reverted **separately**, and the step summary names which case goes red for
  which site — two sites, two reverts, not one revert and a count.
- `pattern.ts` has no `console.*`; the throw names the node type.
- Backlog A9 and B2 updated in the same commit.
- `nx run-many -t lint test build` green **except** for the two downstream pins named in step 0b,
  which step 0 leaves red on purpose. Amended after step 0 ran: the original criterion said
  "green", step 0's fix made two pre-existing downstream specs fail *because* it succeeded, and
  neither the step nor the reviewer may edit a downstream spec under § 2's rule. Step 0 and step 0b
  are therefore **one commit or two adjacent commits on the same branch**, and the branch is not
  green until 0b lands.

### Step 0b — The downstream consequences of step 0

**Category: behavioural** (it is step 0's behavioural change, seen from the two consumers).
**Files**, closed list — six downstream, two repo-level:

| File | What |
| ---- | ---- |
| `eval-signals/src/lib/signal-context.spec.ts` | re-pin `:248` to the fixed behaviour |
| `eval-forms/reactive/src/lib/field-schema.spec.ts` | `:347` and `:327` — item 1, the hard half |
| `eval-forms/signals/src/lib/evaluate-rule.spec.ts` | `:95`, `:111` — item 2 |
| `eval-signals/src/lib/eval-signal.memory.spec.ts` | `:231` — item 2 |
| `eval-signals/src/lib/eval-signal.ts` | comments at `:286`, `:332` — item 3 |
| `eval-forms/signals/src/lib/evaluate-rule.ts`, `eval-forms/reactive/src/lib/field-schema.ts` | comments at `:36`, `:253` — item 3 |
| `CLAUDE.md`, `docs/backlog.md` | item 3's stale facts, and anything item 1 files |

**No `public-api.ts`, `index.ts` or `package.json` under either downstream package is on this
list.** If 0b finds itself needing one, that is a stop-and-replan on the original terms: the
exception § 2 grants is for specs and comments that describe a defect `eval-core` just fixed, not
for the downstream surface.

**Why step 0 could not do this itself.** § 2 makes a downstream change a stop-and-replan, and
`CLAUDE.md` forbids rewriting a spec to match new behaviour. Both are right, and step 0 obeying
them is the reason this section exists rather than a `git diff` nobody reviewed. The plan sanctions
the paths; the step does not decide them.

#### The three items, which are not equal

**1. The two failing pins — and only one of them is a re-pin.**

`signal-context.spec.ts:248` is the easy half: it pins an uncontained leak that no longer exists,
and its own docblock already says the assertions are "pinned as current behaviour, not endorsed"
and that "a fix in `eval-core` has to update both deliberately". Invert it — the scope stack is
empty and the later read returns the source value — and the docblock's KNOWN LIMITATION framing
goes with it.

`field-schema.spec.ts` is **not** a re-pin, and must not be treated as one. Its
`context composition (§ 3.4.1)` block asserts **one `EvalContext` per field** *through the leak*,
because the binding hands out no context handle — the block's own comment records that two other
setups were tried and rejected. With A9 fixed there is no leak to observe by any route, so the
surviving sibling at `:327` now passes **even under a single shared context**. It is the vacuous
case its partner at `:347` was written to prevent, and its partner's comment says so in advance.

So 0b does one of two things, and **deleting `:347` while leaving `:327` standing is neither**:

- find a replacement observable for one-context-per-field — something the binding exposes that
  differs between a shared context and a per-field one; or
- record plainly in `docs/backlog.md` that § 3.4.1's property is **ungated** from `/reactive`'s
  public surface, with `:327` either removed or re-labelled as the non-detector it now is.

A deleted `:347` beside an untouched `:327` reads as coverage and is not. That is the specific
outcome this item exists to forbid.

**2. The three vacuous containment tests — the item that matters to the rest of this phase.**

`evaluate-rule.spec.ts:95` and `:111`, and `eval-signal.memory.spec.ts:231`, all now pass with the
`finally` in the code they cover **deleted**. Steps 1, 2 and 5 add three more scope-push sites
(`Program`, `BlockStatement`, `ForStatement`) whose failure mode is precisely a missing `finally`,
and these are the specs that would catch one from downstream. A phase whose downstream witness is
asleep for its own idiom's failure mode has no witness — and risk 4 names the per-site review
burden as the reason detectors matter here more than usual.

Restoring them means giving each a scope that is leaked by something **other** than the two sites
step 0 fixed — the containment's depth-mark unwind is still correct for any leak, so a spec can
push a scope on the context before the call and assert the unwind returns to *that* depth, or
drive a push the guard must still contain. Whatever the construction, the exit criterion is the
probe, not the green: each must go red with its `finally` deleted.

**3. Four false comments and two stale facts in `CLAUDE.md`.**

Present tense, in live source, all now wrong: `eval-signal.ts:286` and `:332` ("neither uses a
`try`/`finally`", and the escaped-closure residual "it does not reach" — which step 0 closed),
`evaluate-rule.ts:36`, `field-schema.ts:253`. And `CLAUDE.md`'s two: the third-invariant paragraph
saying **neither** push site uses `try`/`finally`, which is now the opposite of the idiom step 0
recorded; and the console inventory's "four survive tree-shaking into the published bundle", which
is **three** now that B2 is gone. Nothing in `run-many` flags a wrong comment, which is why they
are on a file list rather than left to be noticed.

#### The containments themselves stay, and are safe — state this, do not leave it implied

**Both unwind with `while (scopes.length > depth) { pop() }`** — `eval-signal.ts:338`,
`evaluate-rule.ts:85`. With the leak closed the loop condition is false on entry and the body
never runs: no double-pop, no drained scope, no new failure mode, one `.length` read per recompute.
Someone reading "three containment tests are now vacuous" will otherwise assume the *code* is
broken. It is not; the tests stopped discriminating because the thing they discriminated against
stopped happening.

#### Removable or only redundant? — **Redundant, and not removable.** Answer this in 0b's restatement

Phase 6 spent a spike placing `evaluateRule`'s choke point, so this is the question 0b must answer
before it touches either file, and the answer is not "the leak is fixed, delete the guard":

- **The peer range decides it.** `eval-signals` 0.1.0 and `eval-forms` 0.2.0 both declare
  `"@zvenigora/ng-eval-core": "^0.3.0"`. That caret range **admits 0.3.0 itself** — the leaking
  version — and will go on admitting it after `eval-core` 0.4.0 ships. A consumer on
  `eval-signals` 0.1.0 + `eval-core` 0.3.0 is a supported installation today, and removing the
  containment breaks exactly them. Removal is therefore gated on raising both peer ranges to
  `>=0.4.0`, which is its own breaking release of two packages and is not this phase's work.
- **What it still protects, concretely**, so the next person does not delete it as dead: (a) that
  version skew; (b) the three push sites steps 1, 2 and 5 add, for which it is the backstop while
  they are being written; (c) `EvalContext.push` / `pop` are **public methods on a published
  class**, so a leaked scope is reachable without any visitor at all.
- The escaped-closure residual is the one thing on the old list that is genuinely **gone**: the
  arrow's push and its `finally` pop now travel together, so it no longer matters when the closure
  is called. `eval-signal.ts:332`'s "two leaks it does not reach" must lose that half — item 3.

**Exit criteria**
- `nx run-many -t lint test build` green, all three projects. This is the criterion step 0 could
  not meet, and the branch is red until it does.
- Each of the three restored containment specs goes **red with its own `finally` deleted**, named
  individually — three deletions, three named red sets, on step 0's precedent. A restored spec that
  passes either way has re-created the problem item 2 exists to fix.
- `field-schema.spec.ts` § 3.4.1 is either gated by a replacement observable that fails under a
  shared context, or recorded as ungated in `docs/backlog.md` with `:327` no longer readable as
  coverage. Not "`:347` deleted".
- `eval-signal.ts`, `evaluate-rule.ts`, `field-schema.ts` contain no present-tense claim that
  `eval-core` pushes without a `try`/`finally`; `CLAUDE.md`'s third-invariant paragraph and console
  count are corrected.
- Each containment's docblock says it is retained against the `^0.3.0` peer range and the push
  sites still to come — not that it is contained against a live defect.
- The diff contains no downstream `public-api.ts`, `index.ts` or `package.json`.

### Step 1 — The walk boundary: `Program`, `ExpressionStatement`, and E6's bound

**Category: behavioural.** **Files**: three new visitors (`Program`, `ExpressionStatement`,
`EmptyStatement`), `recursive-visitors.ts`, `eval-hooks.ts`,
`evaluate.ts`, `eval-state.ts`, the `internal/classes/eval` barrel for `EMPTY_COMPLETION`,
co-located specs, `docs/backlog.md`.

**Four files were added to that list in execution, each with its reason recorded where the decision
is**: `eval-context.ts` (§ 8.1's rule, moved here from step 2 — see § 8.1); `eval.service.state.spec.ts`
and `readme-examples.spec.ts` with `modules/eval-core/README.md` (the trace and unwind-event counts
this step changes — see the exit criteria); and the merged-visitor fix inside `evaluate.ts`, which
was already listed (§ 1.8).

§ 3.1's convention and the `EMPTY` sentinel land here, converted at the `evaluate` boundary per
rule 4; § 3.3's walk-base bound lands here because this is the step that makes `Program` the walk's
root; § 3.4's walk-depth counter lands here because the bound and the budget refill read the same
field.

**Two criteria a draft of this plan put here belong later**, and are moved rather than dropped:
`let x = 1` returning `undefined` is step 3's, because at step 1 § 3.1's dispatcher *throws* on a
`VariableDeclaration`; and the `EMPTY_COMPLETION` hook criterion is step 2's, because no statement
this step adds can produce `EMPTY` — `Program` never pushes it past rule 4's conversion and
`ExpressionStatement` is a pass-through. A criterion that can only be met by driving a visitor
directly is not evidence about a walk.

**Exit criteria**
- `1; 2; 3` returns `3` with **zero** stranded values (§ 1.1 measured 2). The stranded count is
  asserted, not just the value — the value was already right by accident.
- `''` returns `undefined`; no evaluation returns the sentinel.
- `while (false) { 1 }` and `function f() { return 1 }` now **throw** naming the node type
  (§ 1.1 measured `1` for both), which is the dispatcher's `default:` asserted rather than assumed.
- § 3.3's three-case probe passes, and reverting the bound turns cases 1 and 2 red while leaving
  case 3 green.
- **`statement-semantics.spec.ts` exists and pins every row of § 1.1's table**, with each row either
  at its new value or marked with the step that changes it. It is the detector for risk 1: without
  it the only thing standing behind "six of twelve rows change" is step 6 transcribing a table by
  hand from a deleted scratch script.
- **The program-level scope's cost is measured and recorded in the step summary** (§ 3.5): walks per
  second for a simple expression before and after, on the § 1.8 harness. `internal/performance.spec.ts`
  must be green unchanged, and the number goes in the summary whether or not it is small — this is
  the one thing this phase adds to every evaluation, and `code-reviewer.md` item 8 will ask.
  *Met, and it found something the criterion was not looking for: the scope costs 0.16 µs and
  registration cost 0.6 µs, on walks with no statement in them. See § 1.8.*
- **The trace and hook-event counts this step changes are updated in the specs that pin them, with
  the old and new values recorded** — `eval.service.state.spec.ts` (trace 5 → 7 for `2 + 3 * a`) and
  `readme-examples.spec.ts` with its README block (2 → 4 synthesised unwind events for
  `1 + boom()`). Registering `Program` and `ExpressionStatement` makes them walked nodes rather than
  base-walker pass-throughs, so both counts move for **every** expression, statements or not. They
  are step 1's own specs failing on step 1's own change, one layer in from § 1.1's rows, and they
  are updated deliberately rather than left red — the same treatment step 0b gave the downstream
  pins. Both belong in the `0.4.0` entry.
- E6's premise correction is written into `docs/backlog.md` (§ 1.6): Phase 2's design does not make
  it reachable, and the bound landed anyway.
- `nx run-many -t lint test build` green.

### Step 2 — `BlockStatement` and block scoping

**Category: behavioural.** **Files**: one new visitor, `program.ts`, `recursive-visitors.ts`, the
visitor barrel, specs.
**`eval-context.ts` is no longer on this list**: § 8.1's presence rule landed in step 1, where the
value-based scope read turned out to be a live prototype-chain leak rather than a dormant
`let x;` limitation. Step 2 inherits it working.

> **`program.ts` was missing from this list, and its absence was an omission rather than a
> prohibition.** § 3.1 decides where the dispatcher lives by counting callers — "`Program` is its
> first caller (step 1) and `BlockStatement` its second (step 2)" — so this step adds the
> `BlockStatement` case to `dispatchStatement`'s `switch` by the plan's own design, and cannot reach
> the new visitor from a nested block without it. The list named the two files a *new* visitor
> always touches and not the one this particular visitor shares. Added here rather than reported as
> a deviation at execution time, on the precedent of § 8.1's move.

**Block scoping is deliberately unobservable until step 3.** Nothing binds into a block scope yet,
and an empty pushed scope changes no lookup, so this step's scope assertions are about **depth and
teardown**, not about resolution. Resolution is step 3's, where there is something to resolve; a
criterion here that claims to test shadowing would be testing an empty object.

**Exit criteria**
- `{ 1; 2 }` returns `2` with zero stranded values; `{ }` returns `undefined`.
- **`{ 'a'; noop() }` returns `undefined`**, where `noop` is a context function returning
  `undefined` — the case that separates § 3.1's sentinel from `undefined`. The implementation it
  catches is `EMPTY === undefined`, which passes `{ 'a'; { } }` → `'a'` and fails this. See § 3.1 on
  why the weaker case was named twice before anyone checked it.
- A block whose body throws leaves `ctx.scopes.length` at its pre-walk value, asserted on a
  **reused** `EvalContext` per `code-reviewer.md` item 3, with a second evaluation on that context
  reading the source value afterwards.

  **The later evaluation's arm must read *depth*, not a source key.** A leaked block scope is empty,
  and since § 8.1 an empty scope binds nothing and therefore shadows nothing — so "reads `a` and
  still gets `'A'`" passes identically with the `finally` deleted. That is
  [`program.spec.ts`](../../modules/eval-core/src/lib/internal/visitors/program.spec.ts)'s
  "resolves outer keys through the empty program scope" defect a second time, in the step that
  inherited the fix which *caused* it: presence semantics closed the one channel through which an
  empty scope used to be observable by resolution. The discriminating reading is a context function
  returning `ctx.scopes.length` on the **second** evaluation, which reads one higher for every scope
  the first walk stranded. Keep the source-key read as well — it is the criterion as written, and it
  is the arm that says the leak did not also break resolution — but it is not the detector.
- A hook registered on `after` for the empty block receives `EMPTY_COMPLETION`, by identity against
  the exported const (§ 3.1).

  > **"the first step at which a statement can produce it" was wrong when it was written, and is
  > corrected rather than deleted.** `EmptyStatement` pushes the sentinel in step 1, and
  > `program.spec.ts` already asserts an `after` hook on an empty `Program` receives it by identity.
  > The block-level assertion still earns its place — it is a different node, reached through a
  > different visitor's push — but it is a second instance of a contract step 1 established, not the
  > first.
- **`x => { 1 }` returns `1`, and `(x => { 1; 2 })(0)` returns `2` with zero stranded values**,
  pinned as a criterion and not only as a spec. Registering `BlockStatement` changes a **shipped**
  path that no criterion above reaches:
  [`arrow-function-expression.ts:17`](../../modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L17)
  calls `evaluate(node.body, st)` on the `BlockStatement`, so a block-bodied arrow stops returning
  whatever the base walker stranded and starts returning the block's completion value. § 8.3 settles
  that divergence and § 3.6.1 makes it a README line in **step 6** — five steps after the behaviour
  changes. A behavioural change to a published path, tested only by the documentation step, is
  exactly the gap step 0b was spent closing, and a spec with no criterion behind it reads to the
  next person as an accident someone pinned.

  **The stranded count is the whole criterion, and the value half of it is vacuous.** *Measured*
  before step 2, on the same harness § 1.1 used: `(x => { 1 })(0)` → `1` stranded 0,
  `(x => { 1; 2 })(0)` → `2` stranded **1**, `(x => { })(0)` → `undefined` stranded 0. All three
  values are already what this step makes them — the single-statement body because the base walker
  pushes the one value and the inner `evaluate` pops it, and the empty body because `undefined` is
  what a walk that pushed nothing yields either way. So `x => { 1 }` → `1` passes against an
  implementation that never registered the visitor, and it is retained only because § 8.3 names that
  exact form as the divergence a reader will look for. **The multi-statement body is the detector**,
  and it detects through the count rather than the value, for the same reason `1; 2; 3` needed one
  in § 1.1: `Stack.pop` returns the last thing pushed, and the last statement is walked last. This
  is § 3.1's failure mode caught inside the criterion written to prevent it — the first draft of this
  bullet asserted the value alone and would have shipped a green vacuous check.
- **A statement type the dispatcher rejects throws from inside an arrow body**:
  `(x => { while (false) { 1 } })(0)` raises rather than returning `1`. Found in review, and added
  here for the reason the bullet above exists: it is the half of the block-bodied-arrow change that
  is *observable*, where the completion values this step was written around turn out to be
  unchanged. § 3.6.3 covers the class; no criterion reached the arrow-body instance of it.
- `nx run-many -t lint test build` green.

### Step 3 — `VariableDeclaration` and scope-aware writes

**Category: behavioural.** **Files**: one new visitor, **the visitor barrel
(`visitors/public-api.ts`)**, **`program.ts`**, `eval-context.ts` (`setInScope`),
`assignment-expression.ts`, `update-expression.ts`, `pattern.ts` (§ 3.6.6's throwing default and
§ 3.2's guarded binding writes), `eval-state.ts` (the `const`-kind `WeakMap`),
`recursive-visitors.ts`, specs.

**Two files were missing from this list, both on the precedent step 2 set for `program.ts`.**
`recursive-visitors.ts` imports from `../../internal/visitors`, so a visitor absent from
`public-api.ts` cannot be registered at all. And `program.ts` holds `dispatchStatement`, whose
`switch` must admit `VariableDeclaration` or the statement never reaches the new visitor — the same
omission step 2 found and recorded, in the same place, one step later. Step 2's correction named
the general case ("the two files a *new* visitor always touches, and not the one this particular
visitor shares") and this list still did not carry it, which is why it is written into the general
form here: **every step that adds a statement type touches `program.ts` and the barrel**, and the
per-step list should stop being the place that has to remember.

The specs are one new file, `variable-declaration.spec.ts`, plus two **edits that move existing
assertions rather than weaken them** — the four `VariableDeclaration` rows in
[`statement-semantics.spec.ts`](../../modules/eval-core/src/lib/internal/statement-semantics.spec.ts)
leave the rejected table for the returning one, and
[`block-statement.spec.ts`](../../modules/eval-core/src/lib/internal/visitors/block-statement.spec.ts)'s
arrow-body row loses its `let y = 1` arm. Both are the step-2 precedent for `{ 1; 2 }`: a row whose
`step:` field named this step is a row this step is expected to move.

**Exit criteria**
- `let x = 1; x + 1` returns `2` (§ 1.1 measured `NaN`); `const y = 2; y` returns `2` (measured
  `undefined`); `let x = 1` returns `undefined`.
- `let x = 1; x = 2; x` returns `2`, and the caller's context object is **unchanged** — the
  assertion that § 1.4's write path was actually redirected.
- **`(x => (x = 99))(1)` returns `99` and leaves the caller's object at `{ x: 'SOURCE' }`** —
  § 1.4's headline behavioural change, which a draft of this plan named in three sections and
  asserted in none.
- **A write inside a pushed scope that does not bind the key still reaches `EvalContext.set`.**
  The probe is a subclass whose `set` throws, mirroring
  [`signal-context.ts:112-117`](../../modules/eval-signals/src/lib/signal-context.ts#L112-L117);
  `{ count = 5 }` must throw from it. This is the detector for § 3.2's binding-presence rule.

  > **"…and no downstream suite is one" was wrong, and step 3 measured it.** The reasoning was that
  > every write case `eval-signals` pins runs with no scopes pushed at all — true until step 1 gave
  > `Program` a scope on every evaluation, after which scope-presence holds for every expression
  > this library evaluates. Building the dangerous implementation reddens `eval-signals` **10**,
  > `eval-forms` **10** and `eval-core` **20**. The criterion stands as a criterion; what is
  > withdrawn is the claim that nothing else would catch it. The pairing below is what makes the
  > in-library case discriminating, and is the part that was actually missing.
- **The other arm: a write to a binding the expression *created* must not reach `set`.**
  `{ let count = 1; count = 5 }` returns `5` against that same throwing subclass. Without it the
  criterion above is satisfied by an implementation that never calls `setInScope` at all — which is
  precisely the pre-step behaviour this step replaces.
- Reassigning a `const` throws; the message names the binding.
- Destructuring declarations bind: `let [p, q] = arr` then `p` resolves.
- `let __proto__ = 1` and `let { __proto__: p } = o` are rejected by the pollution guard rather than
  setting a prototype (§ 3.2), asserted by reading the scope's prototype afterwards.

  **Both halves of that sentence were unreachable as written, and it is § 0.1's third instance.**
  The wrong implementation it must exclude is *no guard at all*, and `let __proto__ = 1` does not
  exclude it: `scope.__proto__ = 1` on a plain record is a **silent no-op**, because `1` is not an
  object and the setter ignores it. An unguarded write leaves the prototype exactly as the criterion
  demands to find it. `let __proto__ = { evil: 1 }` is the discriminating source — an object value
  is one the setter accepts — and the criterion carries both: the literal source because § 3.2 names
  it, and the object-valued one because it is the detector.

  **Reading "the scope's prototype afterwards" is also not available**, for a second and unrelated
  reason: the guard throws, so the scope is popped by the `finally` before the throw reaches the
  spec, and there is nothing left on the stack to read. The scope must be **captured mid-walk** —
  a context function invoked by an earlier statement in the same block, the `depth()` idiom
  [`block-statement.spec.ts`](../../modules/eval-core/src/lib/internal/visitors/block-statement.spec.ts)
  already uses — and the prototype read against the captured reference after the walk has unwound.
- `let { a = 1 } = o` throws naming `AssignmentPattern` (§ 3.6.6) rather than binding nothing.
- `nx run-many -t lint test build` green, including both downstream suites — a regression gate for
  the write-path change, and explicitly **not** the detector for the criterion above.

### Step 4 — `IfStatement`

**Category: behavioural.** **Files**: one new visitor, `recursive-visitors.ts`,
`internal/visitors/public-api.ts`, `program.ts`, specs — the last three per the rule above, added at
the start of step 4's session. The specs are three files, not one: the new
`if-statement.spec.ts`, plus `statement-semantics.spec.ts` and `block-statement.spec.ts`, each of
which carries an assertion that `if` **throws** and which this step *moves* into a returning case
rather than deletes, on the precedent step 3 set for the `let` arm.

**Exit criteria**
- `if (a) { 1 } else { 2 }` with `a` true returns `1` (§ 1.1 measured `2`).

  **This criterion and the next are one detector, and dropping either leaves the other green over
  the implementation this step replaces.** Alone, this one is satisfied by a visitor that walks
  **both** branches and then selects by the test — today's base-walker behaviour with a selector
  bolted on, which is wrong for the reason § 1.1 states plainly: any call or assignment in the
  untaken branch has already run. The criterion below is what closes it. Recorded here because the
  failure mode § 0.1 describes is a *later* edit reading the second criterion as redundant with the
  first and deleting it.
- **The untaken branch does not run**: a branch containing a `jest.fn` from the context, or an
  assignment, leaves no trace. The implementation this catches is today's — walk both branches and
  select the right value — which passes a value-only assertion and fails this one. Setup: the
  function is in the evaluation context, so the branch is reachable and the call is observable.
- `if (false) { 1 }` returns `undefined`; `{ 'a'; if (false) { 'b' } }` returns `'a'`. Note this
  pair does **not** discriminate the sentinel — § 3.1 says which case does, and step 2 carries it.
- **A taken branch that produced nothing propagates the sentinel**, not `undefined`:
  `{ 'a'; if (true) { } }` returns `'a'`. § 3.1's table says this visitor pushes "the branch taken"'s
  value, and an empty block's value *is* `EMPTY_COMPLETION` — so the `if` pushes the sentinel on a
  path where a branch did run, and an `after` hook on the node observes it. Distinct from the
  criterion above, which covers the no-branch-ran path; an implementation normalising a branch value
  to `undefined` passes that one and fails this.
- **A branch reached through `dispatchStatement`, not a raw `callback`.** Asserted behaviourally
  rather than structurally, and the detector is narrower than the obvious candidates — **this
  criterion was written naming two cases that measurement then showed discriminate nothing**, which
  is § 0.1's defect arriving inside the same step that recorded § 0.1's rule for criterion 1.
  Neither `if (true) { while (false) { 1 } }` nor an `else if` chain can fail: `acorn-walk` finds a
  *registered* visitor before it reaches its base walker, so a raw `callback` reaches
  `blockStatementVisitor` (which re-dispatches and rejects `while` one level down) and reaches
  `ifStatementVisitor` again for the chain. The detector is a **bare branch body of an unregistered
  type** — `if (a) function f() { }` throwing `Unsupported statement type: FunctionDeclaration` —
  the one position with no registered visitor between `IfStatement` and the base walker. Measured:
  swapping in a raw callback reddens that case and no other in the file. The two weaker cases stay,
  marked as what they are: guarantees worth pinning, not evidence about routing.
- `nx run-many -t lint test build` green.

### Step 5 — `ForStatement` and the iteration budget

**Category: behavioural** (additive as a node type; behavioural because § 1.1 measured `NaN` today).
**Files**: one new visitor, `eval-state.ts`, `eval-options.ts`, `recursive-visitors.ts`, specs — plus
`program.ts` and `internal/visitors/public-api.ts` per § 4's preamble, and
`statement-semantics.spec.ts`, whose `ForStatement` row this step moves out of the rejected table.
`evaluate.ts` is **not** on the list: `EvalState.enterWalk` already returns the new depth, so § 3.4's
refill on the 0 → 1 transition lives inside the state and no entry point changes.

**Exit criteria**
- `for (let i = 0; i < 3; i++) { i }` returns `2`; the counter is **not** written into the caller's
  context.
- **A loop body that throws mid-iteration leaves `ctx.scopes.length` at its pre-walk value**, on a
  **reused** `EvalContext`. `ForStatement` is the visitor with the highest push multiplicity, and
  the backlog's own precondition argument for A9 is a `for` body throwing on iteration 3; step 2
  carries this probe and step 5 is where it matters most.
- **The loop scope exists**, asserted in **both** body forms, where `depth` is a context function
  returning `ctx.scopes.length`:
  - a **bare** body — `for (let i = 0; i < 1; i++) depth()` reads `2`, one higher than the enclosing
    statement list's `1`;
  - a **block** body — `for (let i = 0; i < 1; i++) { depth() }` reads `3`, one higher than the `2`
    a plain `{ depth() }` reads at the same position.

  **Two forms rather than one, because the single-form version of this criterion was § 0.1's fifth
  instance.** It read "`for (let i = 0; i < 1; i++) { depth() }` reads one higher than the enclosing
  statement list does" — and at the top level that is `2`, which is precisely what a `ForStatement`
  pushing **no** scope produces (`Program` 1, the body's own `BlockStatement` 2). The detector
  written to catch the missing push was satisfied by the missing push: the body of a `for` is itself
  a block, so the depth named is two pushes above the enclosing list, not one. Each form above now
  states the number it expects rather than a relation, and both go red when nothing is pushed —
  `2`/`3` against the no-push implementation's `1`/`2`.

  **§ 0.1's fourth instance, and it is the two criteria above that need it.** The wrong
  implementation both of them admit is a `ForStatement` visitor that **pushes no scope at all**:
  `let i` binds into the enclosing `Program` scope, `i++` finds it there through `setInScope`, the
  loop returns `2`, and a depth that was never raised is trivially restored after a throw. A
  teardown criterion satisfied by never setting anything up is the purest form of the mistake
  § 0.1 names, and it is the reason "on a **reused** `EvalContext`" is not by itself enough: the
  qualifier makes a leak *observable*, it does not make a missing push observable. This criterion is
  what fails when nothing was pushed.
- `for (;;) { 1 }` throws within the budget rather than hanging; the spec asserts the throw, and the
  budget is asserted as **per outermost `evaluate()`** two ways: a nested pair of 1,000-iteration
  loops exhausts a 100,000 budget (which a per-loop cap would not), and two successive `evaluate`
  calls on **one** `EvalState` each get a full budget (which a per-state counter would not).
- `internal/performance.spec.ts` is unchanged and green.
- **The per-iteration allocation on the write path is measured, and either reduced or accepted with
  a number beside it.** Raised in step 3's review and left to this step because this is where it
  multiplies. Each identifier write runs `EvalContext.scopeHolding` twice — once in
  `assignToBinding` for the `const` check, once inside `setInScope` — and `scopeHolding` goes
  through `Stack.asArray()`, which copies and reverses. A classic `for` loop therefore does, per
  iteration: `get(i)` in the test, `get(i)` in the update, and two more scans for the write. Before
  Phase 2 the write half cost none, because `set` consulted no scope.

  The fix, if the number justifies it, is to let `setInScope` take an already-resolved scope — a
  widening of a signature § 5 publishes, which is why step 3 did not do it unilaterally. § 1.8 is
  the reminder that `performance.spec.ts` allows 5 seconds for 100 iterations and will not notice
  either way, so this criterion asks for a measurement and not for a green suite.

  **The criterion is discharged by measuring and reporting; applying the fix is not this step's to
  decide.** `setInScope` is **published** — § 5's first row — so changing its parameter list is a
  shape change on a shipped symbol, which `CLAUDE.md` makes a versioned-release question: an
  explicit callout, a bump and a `CHANGELOG.md` entry, none of which a step-time judgement can
  stand in for. So step 5 takes the number, states it here, and **stops**: if it justifies the
  change, that is a plan amendment and a `eval-context.ts` on step 6's file list, not a widening
  slipped in under a performance criterion. "Either reduced or accepted with a number beside it" is
  satisfied by the second branch with the number attached.

  **Measured, and accepted — the second scan is not worth a shape change.** § 1.9's harness, against
  `dist/` after `build:production`, one `evaluate` of `for (let i = 0; i < 200000; i++) { i }`
  divided by the iteration count:

  | | per iteration |
  | - | ------------- |
  | as shipped, two `scopeHolding` passes per write | **0.897, 0.880, 0.901 µs** |
  | the one-pass version built and measured | **0.954, 0.922, 1.007 µs** |
  | one `EvalContext.scopeHolding` in isolation, 2 scopes deep, binding in the innermost | 0.02–0.04 µs |
  | `2 + 3 * a`, no loop, for scale | 0.615 µs |

  The one-pass version was built by having `assignToBinding` write the scope it had already
  resolved, which is exactly what widening `setInScope` would buy, and it measured **no faster** —
  slightly slower, inside a run-to-run spread of roughly ±7 % that swamps the difference. The
  isolated scan is 2–4 % of an iteration, which is the honest upper bound on the saving and is below
  what this harness can resolve. The reason is the shape of the data rather than the code: a loop's
  scope stack is two deep and the counter is bound in the innermost scope, so the "scan" terminates
  on its first probe and `asArray()` copies a two-element array.

  **So the cost is real and small, and it grows with scope depth rather than with iterations** — a
  loop nested several blocks down pays more per write than one at the top level. If a later phase
  makes deep nesting ordinary, this is the measurement to redo rather than a conclusion to inherit.
- No exit criterion here asserts closure capture — § 3.6.5 says why there is nothing to assert.
- `nx run-many -t lint test build` green.

### Step 6 — Release and records

**Category: behavioural** (the bump itself). **Files**: `modules/eval-core/README.md`, **the root
`README.md`**, `modules/eval-core/src/lib/readme-examples.spec.ts`,
`modules/eval-core/package.json`, root `CHANGELOG.md`, `docs/backlog.md`, `ROADMAP.md`,
`docs/statements/summary.md`.

**The root `README.md` is on that list because "ESTree Nodes Supported" is in it, not in the module
README** — checked, at root `README.md`'s § of that name. The original file list named only the
module README, and § 6 gate 1 does not admit the root README at all, so this step could not have
added the rows it promises without tripping its own gate. § 6 gate 1 is widened for step 6 only, to
the same effect as `ROADMAP.md`. § 3.1's "the README's hooks section says so" for
`EMPTY_COMPLETION` is in the same position and covered by the same widening.

**Also `dispatchStatement`'s move out of `program.ts`**, deferred to this step in § 3.1 when the
third-importer condition fired in step 4: a new `internal/visitors/dispatch-statement.ts`, with
`program.ts`, `block-statement.ts`, `if-statement.ts`, `for-statement.ts` and
`internal/visitors/public-api.ts` following it. A pure refactor, so the existing suite is the gate
per `CLAUDE.md` and no new spec is owed. If it is dropped, it is dropped into `docs/backlog.md` with
a reason — not deferred a third time inside this document.

README rows for the seven node types plus § 3.6's six divergences and § 3.4's option; `0.4.0`;
a `## [eval-core 0.4.0]` entry whose "Changed" section is § 1.1's table read as a migration note;
confirmation that [A2](../backlog.md#a2) still names all three members of § 1.7's family, and that
this phase left them alone; `ROADMAP.md` Phase 2 marked done; a retrospect.

**Exit criteria**
- Every row of § 1.1's table appears in the CHANGELOG with its old and new value, **transcribed from
  `statement-semantics.spec.ts`** (step 1) rather than from this document — the spec is green, the
  table in § 1.9 came from a scratch script that no longer exists.
- The `eval-signals` relaxation of § 3.2 — a write to a binding the expression created stops
  throwing `SignalContextWriteError` — is in the CHANGELOG, cross-referenced from an `eval-signals`
  heading or with the decision not to recorded in the step summary.
- `readme-examples.spec.ts` covers the new fenced blocks, or its docblock's count claim is corrected;
  it is hand-transcribed and currently asserts coverage of all twelve.
- The drift gate from `docs/gates/plan.md` step 2 covers any symbol the new README blocks import.
- `nx run-many -t lint test build` green.

---

## 5. Published surface added

| Symbol | Kind | Where |
| ------ | ---- | ----- |
| `EvalContext.setInScope` | method, additive | `internal/classes/eval/eval-context.ts` |
| `EvalContext.scopeHolding` | method, additive — **was private, made public in step 3** | `internal/classes/eval/eval-context.ts`. The write sites need the *scope* and not just a yes/no: `const` kinds are keyed by scope on `EvalState` (§ 3.2), so a write must know which scope it is about to hit before it decides whether the binding is reassignable. Publishing the existing single pass is what keeps that question answered by the same code as `get`'s step 1; the alternative was a second copy of the innermost-scope walk at the write sites, which is [A4](../backlog.md#a4)/[A10](../backlog.md#a10)'s defect — two copies of one resolution order — reproduced deliberately |
| `EvalState.declareConst` / `isConstBinding` | methods, additive, `@internal`-tagged | `internal/classes/eval/eval-state.ts` — § 3.2's `const`-kind `WeakMap`, behind two methods rather than an exposed map |
| `EvalOptions.maxIterations` | option key, additive | `internal/classes/eval/eval-options.ts` |
| `EMPTY_COMPLETION` | const, additive | `internal/classes/eval/` — reachable in `after` hook events, so recognisable by contract (§ 3.1) |
| `EvalHooks.pushWalkBase` / `popWalkBase` / `walkBase` | methods, additive | `internal/classes/eval/eval-hooks.ts` — § 3.3's bound. **`EvalHookBookkeeping` the interface is `@internal` and unexported; these three methods are not**, since `EvalHooks` is published, and an earlier draft of this table said the whole mechanism was unpublished on the strength of the interface alone |
| `EvalState.walkDepth` / `enterWalk` / `exitWalk` | members, additive, `@internal`-tagged | `internal/classes/eval/eval-state.ts` — § 3.4's refill counter, on the precedent of `hookBookkeeping`, which is public and carries the same tag |
| `EvalState.iterationsRemaining` / `chargeIteration` | members, additive, `@internal`-tagged | `internal/classes/eval/eval-state.ts` — § 3.4's budget itself, which this table omitted while listing the `walkDepth` counter that refills it. Same precedent and the same tag. **The tag does not make them unpublished**, and the distinction is the one step 1 already corrected one row above: `EvalHookBookkeeping` the *interface* is `@internal` and unexported, and an earlier draft read that as making `EvalHooks.pushWalkBase` and friends unpublished too — they are public methods on a published class, and so are these. `@internal` states an intent about support, not a fact about reachability; a consumer holding an `EvalState` can call them, and removing one is still a breaking change |
| seven statement visitors, and `dispatchStatement` | **not published** | `internal/visitors/` is not re-exported by `src/public-api.ts` — verified, not assumed |

**Behavioural changes to already-published paths** — the list the version bump is for: every row of
§ 1.1's table; the write redirection of § 1.4; `EvalHooks.exit`'s scan bound (§ 3.3); **[A9](../backlog.md#a9)'s
scope-pop repair (step 0)**; `EvalContext.get`'s treatment of a pushed scope — presence rather than
value, which **also stops a plain-record scope resolving `Object.prototype` names** (§ 8.1, step 1);
**`EvalResult.trace` and the `after`-hook stream gaining `Program` and `ExpressionStatement` entries
on every evaluation** (step 1); **the merged visitor table, built once and frozen** — every
evaluation gets faster, and the table is new process-wide shared state (§ 1.8, step 1); and
**a block-bodied arrow's body going through `dispatchStatement`** (§ 3.6.1, § 3.6.3, § 8.3, step 2).
This is the one row of the list that arrives through a path § 1.1's table does not enumerate, since
that table measures statements at the **top level** and this one is reached from inside an
expression — which is also why it needs stating twice as carefully:

- Its **completion value becomes a rule rather than a stranded-stack accident**, and for every form
  this phase supports the value is *unchanged*. Measured: `(x => { 1 })(0)` → `1` before and after,
  `(x => { 1; 2 })(0)` → `2` before (stranded 1) and after (stranded 0), `(x => { })(0)` →
  `undefined` before and after. The stranded entry sat *below* the real value on a LIFO stack and
  was never read. **A CHANGELOG line claiming these values changed would be wrong** — an earlier
  version of this row said `x => { 1 }` "yielded a stranded base-walker value before", and it did
  not; it yielded `1`.
- **A statement type the dispatcher rejects now throws where the base walker previously evaluated
  it.** Measured with the visitor unregistered: `(x => { while (false) { 1 } })(0)` → `1`,
  `(x => { if (true) { 1 } })(0)` → `1`, `(x => { let y = 1; y })(0)` → `undefined`; all three now
  raise `Unsupported statement type: …`. At the top level these already threw in step 1, so **step 2
  is the first step at which they break inside an expression**. `while` and `function` are permanent
  per § 2; `if`, `for` and the declarations come back in steps 3 to 5. Pinned in
  `block-statement.spec.ts`, which is where step 6 transcribes this row from.

  **Step 4 returned the `if` arm of that list, and its net over the phase is no change in value.**
  `(x => { if (true) { 1 } })(0)` measured `1` before step 2, threw for steps 2 and 3, and returns
  `1` again — as a rule rather than as a stranded base-walker push. The same correction as the
  completion-value bullet above: **a CHANGELOG line claiming this value changed would be wrong.**
  What did change on this path is the untaken branch, which is the next row's subject. Pinned in
  `block-statement.spec.ts`'s "should evaluate an if in an arrow body".

**Step 4's row — `IfStatement` walks one branch, not both.** § 1.1's `if` row covers the *value*
(`2` → `1`); this is the part of the same change no value assertion reaches, and it is the one with
consumer-visible side effects. Before Phase 2 the base walker visited **both** branches regardless
of the test, so a call, an assignment or a throw in the untaken branch had already happened by the
time the right value was selected. The CHANGELOG line is about effects, not about `1` versus `2`:
**an expression whose untaken branch called a context function, wrote a context key, or raised, now
does none of those.** For a rule author relying on `if (guard) { … } else { sideEffect() }` this is
the behavioural change of the whole step. Pinned in `if-statement.spec.ts`'s "the untaken branch
does not run", and its hook-stream case, which is the arm that also catches a branch walked with
every side effect removed.

**A9 was missing from that list until step 0 ran, and the omission is instructive.** Step 0 reads
as a backlog fix, so the plan filed it under preconditions and not under the surface the bump
covers — while its effect is squarely behavioural on a published path: on a reused `EvalContext`,
a throwing arrow body used to leave a scope that shadowed a source key for the life of the
context, and no longer does. Two downstream suites pinned exactly that as known behaviour, which
is how it surfaced. Step 6's CHANGELOG criteria must therefore carry an A9 line as well as
§ 1.1's rows.

---

## 6. Verification gates

Checked at every step, not only at the end.

| # | Gate | How |
| - | ---- | --- |
| 1 | Nothing moved outside `eval-core` | `git diff --name-only HEAD` — `modules/eval-core/`, `docs/`, root `CHANGELOG.md`, and — **in step 6 only** — `ROADMAP.md` and the root `README.md`, which is where "ESTree Nodes Supported" lives. **Step 0b only**: also the eight downstream paths its § 4 entry names, and nothing else under `modules/eval-signals/` or `modules/eval-forms/` |
| 2 | § 3.1's arithmetic holds | For each visitor in the diff, enumerate exit paths and state pops and pushes per path, against § 3.1's table |
| 3 | Every scope push has a `finally` pop | Reviewed on a **reused** `EvalContext`, per `code-reviewer.md` item 3's probe — a spec building its context inline asserts nothing |
| 4 | No per-walk control-flow state on `EvalState` | § 3.1 chose a stack discipline; a field that a nested `evaluate` could clobber is a stop-and-replan |
| 5 | Every new assertion is load-bearing | Each step names the inversion it ran and **which** cases went red |
| 6 | The dispatcher's `default` throws | § 1.7's family gains no fourth member |
| 7 | Downstream suites are the regression gate | `eval-signals` and `eval-forms` rows of `run-many` — movement is a finding, not an expectation. **Step 0 moved both**, which is what step 0b exists to resolve; from step 1 on, the gate reads as written again |
| 7a | The downstream witness is awake | Step 0b restores the three containment specs that item 4 of its list found vacuous. Steps 2 and 5 add push sites those specs are the downstream detector for — a green row from an assertion that passes with its guard deleted is not evidence |
| 8 | Backlog entries move with the work | No step closes without its entries updated |

---

## 7. Risks

1. **The behavioural surface is wider than the node list.** Two numbers, and they are about
   different things: **six of § 1.1's twelve rows change value by the end of the phase** — that is
   the endpoint, and what the `0.4.0` migration note is for — while **nine of the twelve throw as of
   step 1**, because the dispatcher's `default` rejects every statement type later steps implement.
   The step-1 number is the blast radius during the phase, and it is the larger one: rows 4–9 and 12
   stop returning a value the moment `Program` is registered and only come back as steps 2–5 land
   (`{ 1; 2 }` at step 2, the three `let`/`const` rows and `let [p, q]` at step 3, `if` at 4, `for`
   at 5), while `while` and `function` throw for good (§ 2). A consumer whose expression happened to
   depend on one — most plausibly a multi-statement string that returns its last value — sees a
   different result after `0.4.0`. **Detector**: `statement-semantics.spec.ts`, built in step 1,
   pins all twelve rows and is what step 6 transcribes; every row carries either its final value or
   the step that replaces its throw, so an intermediate step cannot quietly drop one. A CHANGELOG entry is a writing task, not a detector, and a row that lands on a third
   value — neither the old one nor the intended one — would otherwise ship with the document
   asserting otherwise.
2. **Scope-aware writes change arrow-parameter assignment** (§ 3.2), which no roadmap document
   anticipated. **Detector**: step 3's subclass-`set` probe, *not* the downstream suites — their
   write cases run with no scopes pushed, so they are green for the implementation that breaks
   `eval-signals`' policy. The suites remain the regression gate for everything else, and movement
   in either is a stop-and-replan rather than a spec to update.
3. **`for` is the first construct that can consume unbounded time.** § 3.4 bounds it; the residual is
   a consumer who raises `maxIterations` and gets what they asked for.
4. **Three new scope-push sites** — `Program`, `BlockStatement`, `ForStatement` — on top of the two
   step 0 repairs. Step 0 sets the idiom, but the review burden is per site and
   the failure is invisible to `eval-core`'s own suite by construction (§ 1.3). **Detectors**: gate 3
   as a review gate, plus the reused-context throw probe as an exit criterion in steps 0, 2 and 5 —
   one per site, so no site ships on the review gate alone.
5. **`pattern.ts` is reached by more paths after step 3.** Its `MemberExpression` branch throws
   ([:84](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L84)), its `AssignmentPattern`
   branch is commented out, and its unhandled-type path returns an empty context silently
   ([:71](../../modules/eval-core/src/lib/internal/visitors/pattern.ts#L71)); declarations make all
   three easier to reach. **Detectors**: step 3's `let { a = 1 } = o` and `let __proto__ = 1`
   criteria, and step 0's direct-call spec for the `MemberExpression` branch — promoted out of this
   prose into exit criteria, since a risk whose mitigation lives only here has no detector.

---

## 8. Questions, all settled before step 0

Kept as a record of what was decided and against what, not as work. A step that finds itself
reopening one of these has left the plan.

**8.1 — settled: yes, narrowed to pushed scopes.** `EvalContext.get` treats a binding in a pushed
scope as present whatever its value, so `let x;` shadows; `original`, `priorScopes` and `lookups`
keep today's fall-through. § 3.2 carries the decision and names the two consumers the narrowing
protects — Phase 1's deliberate arrow-parameter resolution, and `eval-forms`' documented
empty-control behaviour — so that a later widening argues against them by name.

> **Moved from step 2 to step 1 during step 1, and it is a defect fix rather than a feature.** The
> plan scheduled this with `BlockStatement`, on the reasoning that presence semantics only matter
> once something binds into a block. That reasoning holds for the `let x;` half and misses the
> other half entirely: **reading the scope by *value* also means reading a plain record's prototype
> chain.** `getContextValue` resolves a plain object as `scope[key]`, so an **empty** scope answers
> for `toString`, `constructor`, `valueOf`, `hasOwnProperty` and `__proto__` — and wins, because
> scopes are step 1 of `get`'s order and `original`, `priorScopes` and `lookups` are steps 2 to 4.
>
> *Measured* on the built bundle, against a `Registry` original that resolves none of them itself:
> before step 1 every one of those names evaluated to `undefined`; with a program-level scope
> pushed on every walk, `constructor.name` evaluated to `"Object"` and a `lookups` resolver
> installed for `toString` was shadowed by `Object.prototype.toString`. No escalation past the
> pollution guard was found — `constructor.constructor` stays blocked — so this is a resolution
> defect, not a sandbox escape.
>
> Three reasons it moved rather than waiting, and rather than being worked around by pushing a
> `Registry` instead of a record:
>
> 1. **It is the defect.** A `Registry` scope would hide the symptom at the one new push site while
>    leaving `get` reading prototypes for every other.
> 2. **It fixes all four push sites at once** — `arrow-function-expression.ts`, `pattern.ts`'s two,
>    and `Program` — where the `Registry` workaround fixes one. The two pre-existing sites have had
>    this behaviour all along; only a walk that pushed no scope could avoid it, which is why nothing
>    caught it until a program scope made it universal.
> 3. **It keeps the scope stack homogeneous.** § 3.2's premise is that scope objects are plain
>    records normalised by `fromContext`; a visitor pushing a `Registry` to dodge a resolution bug
>    makes the stack a mixture of two shapes for a reason unrelated to what the scope is *for*.
>
> **A second symptom, recorded because it should disappear with the first and was checked that it
> does.** `fromContext` copies a plain record into a `Registry` when `caseInsensitive` is set, and a
> `Registry` is Map-backed — so the prototype names leaked on the case-**sensitive** path and not on
> the case-insensitive one. Two evaluators, one visitor. Both now ask the same own-key question:
> the `caseInsensitive` arm of `program.spec.ts`'s probe is green with the fix *and* with it
> reverted, which is what confirms that arm was never the leaking one.
>
> **Implementation**: one private `scopeHolding(key)` pass gated on `hasContextKey`, behind `get`'s
> step 1, `getFromScopes` and `hasInScopes`, so the three cannot disagree about what the scope stack
> holds — which is what `hasInScopes`' own docblock had recorded as a deliberate divergence and is
> now closed. Step 2's file list keeps `eval-context.ts` only if it needs it for something else.

**8.2 — settled: no `var`.** Function-scoped hoisting is a second scoping model beside § 3.2's and
buys a consumer nothing `let` does not. `var x = 1` throws, which is at least loud.

> **"per § 3.1's dispatcher" was true only until step 3, and the rejection had to move.** The
> dispatcher switches on `statement.type`, and `var x = 1` is a `VariableDeclaration` exactly as
> `let x = 1` is — so the moment step 3 adds that type to the allow-list, `var` stops reaching the
> throwing `default:` and starts reaching the new visitor. The answer is not to special-case the
> dispatcher on a field it does not read: the visitor rejects any `kind` other than `let` or
> `const`, with its own message (`Unsupported variable declaration kind: var`). Left as a note
> rather than a silent edit, because a settled answer that named the wrong mechanism is the kind of
> thing a later phase inherits as licence — § 0.1's shape, one level up.

**8.3 — settled: keep the divergence.** `x => { 1 }` returns `1` here and `undefined` in
JavaScript (§ 3.6.1). It replaces today's stranded-value accident with a rule, and throwing would
remove a form that works today for some inputs. README line, not a defect.

**8.4 — settled: A2 stays out.** [A2](../backlog.md#a2)'s entry is rewritten to name all three
members of the fall-through family — `(a)++`, `[a, b] = arr`, `({m} = o)` — so that "fixing one of
three is arbitrary" is checkable against the entry rather than a judgement made here. Step 6 no
longer files a new entry; it confirms that rewrite landed.

**8.5 — settled.** Nothing in this phase touches `evaluateAsync`'s contract: the walk stays
synchronous, statements included, and a loop containing an `await` is outside § 2's scope.
`awaitAllPromises` still resolves promises in the final value only.
