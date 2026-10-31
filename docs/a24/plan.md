# A24, A25 and D13 — the await track: `await` where its value is the result, and every refused statement reported (`@zvenigora/ng-eval-core`, then `eval-signals` and `eval-forms`)

**Date**: October 30, 2026
**Revision**: 4 — step 4: widened at its code review to unwrap `preserveParens` in the accepted
positions, with four rows and probes P4-7 and P4-8, so `eval-core` reaches 3259 at step 4 and 3288
at step 5; step 4's outcome; the `step` skill's state line made step-independent.

**Revision**: 3 — step 3: P3-3's predicted red set corrected, measured; step 3's outcome.

**Revision**: 2 — step 2: § 1.2 finding 2's discrepancy measured and settled for the code reading;
§ 8's answers, given at step 2's confirmation gate, recorded, with pointers from § 3.3 and § 3.4;
step 5's parity rows for `return`, `break` and `continue` given sources that parse; step 2's outcome.

**Revision**: 1 — initial plan, with step 1's code review folded in before its commit. The review
measured that § 3.2's first mechanism, a one-entry `funcs` over the frozen shared table, throws
(§ 3.2), and found the retirements' inbound links missing from steps 3 and 6, and three row counts
off their own row lists: step 5 is +29 and step 6 +6.
**Target packages**: `@zvenigora/ng-eval-core` **0.15.0**, a minor that is breaking by behaviour (the
0.8.0 and 0.14.0 precedent). Then `@zvenigora/ng-eval-signals` **0.8.0** and
`@zvenigora/ng-eval-forms` **0.8.0**, whose `eval-core` ranges, `>=0.14.0 <0.15.0`, do not admit it.
The register's decisions name these releases.
**Fixes**:
- [A25](../backlog-retired.md#a25), in step 3: an `await` passes its operand through, with no race, no timer,
  no `__awaitTimeout` key and no suffix.
- [A24](../backlog-retired.md#a24), in step 4: an `await` is accepted only where its value is the result,
  and refused anywhere else.
- [D13](../backlog.md#d13), in steps 5 and 6: `eval-core` reports the first statement anywhere in a
  tree that evaluation would refuse, and both `eval-forms` adapters refuse such a rule at
  registration.
- The failure order of `evaluateAsync` (step 3): hook cleanup reads `duration` as `undefined` on
  both paths, as the sync path has since [A27](../backlog-retired.md#a27). It has no register entry:
  A27's batch found the difference and recorded it in its report.

**Source**: the register's three "Decided 2026-10-30" paragraphs and the request of 2026-10-30,
which fixed the step shape. § 4's preamble names the one place this plan changes it.
**Objective**: an `await` gives JavaScript's answer or throws. Where it is accepted, its value is the
evaluation's result, so the promise reaches the result unchanged and `evaluateAsync` resolves it
there. Anywhere else it throws a refusal that names `await` and the rule. The operand passes
through: nothing races it, nothing is armed, nothing is read from the context, and nothing is
written onto the caller's error. And a rule that holds a statement `eval-core` will never evaluate
is refused when it is registered, not rendered blank: `eval-core` publishes the one check its
evaluator uses.

**Conclusion, stated first so the rest reads as its argument**:
- **The decisions are made; this plan designs them and does not reopen them** (§ 2). Each decision
  quoted in § 2 is the register's paragraph.
- **Nothing in the suites pins an `await`'s position** (§ 1.2 finding 4). Every row that uses an
  `await` in an expression has it in a position A24 accepts, or is refused by the parser, or is the
  one row A24 is meant to move. So step 2 writes the characterisation spec first
  ([SR27](../standing-rules.md#sr27)), and its marks are steps 3 and 4's criteria.
- **The accepted `await` is a property of the walk's root, not of the node, and not of the state**
  (§ 3.2). It is the root itself, an arrow's expression body (the root of the arrow's nested walk),
  or the expression of the last statement of a `Program` or of an arrow's block body. Every walk
  accepts at most one `await`, found by reading its root one level deep. Nothing is traversed and
  nothing is cached, so nothing is stored on `st` or written onto a node.
- **A25's decided text overstated what reaches the caller** (§ 1.2 finding 2). `evaluateAsync`'s
  `ensureError` converts any rejection that is not an `Error`, and that conversion stays. Under an
  `await` the visitor's own `catch` converts first today, so `ensureError` converts such a rejection
  under an `await` only from step 3. Step 1 corrects the register ([SR4](../standing-rules.md#sr4)), and § 0 rule 1
  is the lesson.
- **`eval-signals` and `eval-forms` run against `eval-core`'s workspace source, not the published
  package** (§ 1.2 finding 1). So a behaviour change in `eval-core` moves their rows in the step
  that makes it, not at the release.

---

## 0. Failure modes added by this plan

The standing rules apply to every step and are cited by number
([`standing-rules.md`](../standing-rules.md)). This section lists only the two rules this plan adds,
for its retrospect to promote or drop ([SR7](../standing-rules.md#sr7)).

1. **A claim about what the caller receives is measured at the entry point, through every layer
   between the visitor and the caller.** A25's decided text said "a rejection reaches the caller as
   their own value". That is true of the visitor once its catch is gone. It is not true of the caller,
   because `evaluateAsync` passes every rejection through `ensureError`, which turns anything that is
   not an `Error` into a new `Error` (§ 1.2 finding 2). The sentence was about the layer being
   changed, and named the caller. *Red*: nothing — held by review, and by step 3's conversion rows,
   which assert at `evalAsync`.
2. **A row that pins a pass-through asserts identity, never type.** `await 3` is `3`, and a promise
   is a `Promise` whether or not it was re-wrapped. A row reading `toBeInstanceOf(Promise)` or
   awaiting the result passes against both the raced promise of today and the caller's own promise
   after step 3. `eval-signal.spec.ts`'s docblock on its promise-valued rows found this in Phase 3,
   and records it in a comment, not as a rule. The probe has the same trap: `Promise.resolve(p)`
   returns a native `p` unchanged, so a re-wrap by `Promise.resolve` breaks only a non-thenable's row.
   *Red*: step 3's probe P3-1, which re-wraps the operand in a new promise and must turn the sync
   identity rows red.

---

## 1. Current state

### 1.1 What exists today

Line numbers are at d62eee4, the commit before this plan.

| Element | Where | State |
| :--- | :--- | :--- |
| `awaitVisitor` | `internal/visitors/await-expression.ts:32-78` | Walks the operand and pops it (`:42-44`), wraps a non-thenable in `Promise.resolve` (`:25-30`, `:47`), reads `__awaitTimeout` from `st.context.original` (`:50-53`), races the operand against a timer that rejects after 30 000 ms by default (`:9`, `:14-20`, `:56-59`), and pushes the race. Its `catch` makes a non-`Error` rejection a new `Error('Await expression failed: …')` and appends ` at position <start>-<end>` to the message of whichever `Error` it holds, the caller's own included (`:60-72`) |
| Where an `await` is reached | `recursive-visitors.ts` | `AwaitExpression` is registered for every position. No visitor knows its parent, and nothing distinguishes one position from another |
| `async` | `arrow-function-expression.ts` | Ignored: the arrow builds a plain closure, and `(async () => 1)()` is `1` (A24's table) |
| The sync entry point | `functions/evaluate.ts:82-166` | `walkWithoutResult` walks and unwinds the open nodes in its `catch` (`:115-117`); `evaluate`'s `catch` then calls `stop()` and `setFailure` (`:158-161`). So hook cleanup runs **before** `stop()`, and since A27 reads `duration` `undefined` |
| The async entry point | `functions/evaluate.ts:236-301` | Its own walk (`:262-271`), then `awaitAllPromises` (`:275`), whose rejection goes through `ensureError` (`:171-193`, `:208`, `:278`). Its outer `catch` calls `stop()` **before** `unwindTo` (`:289-296`), so hook cleanup reads `duration` as a number |
| The statement dispatcher | `visitors/dispatch-statement.ts:39-68` | A `switch` over six statement types; `default` throws `Unsupported statement type: <type>` (`:66`) |
| The `var` check | `visitors/variable-declaration.ts:130-132` | Above `beforeVisitor`: throws `Unsupported variable declaration kind: <kind>` for anything but `let` and `const` |
| `eval-forms`' guard | `modules/eval-forms/src/lib/guard-identifiers.ts:98-160` | Public, at the core entry point. Refuses a `LabeledStatement` among the program's own statements, with the `colonIdentifiers` hint (`:125-137`), then any identifier naming an `Object.prototype` member. Called by `/reactive`'s validation (`field-schema.ts:247`) and `/signals`' `prepare` (`rules.ts:228`) |
| The published anchor | `tools/published-links.txt:26` | `docs/backlog.md#a24`, printed by `eval-signals`' published README. The index row keeps it when A24 retires ([SR5](../standing-rules.md#sr5)) |

The baseline is the gate at d62eee4, run for that commit: `eval-core` 3187, `eval-signals` 444,
`eval-forms` 380. `eval-core`'s `[Unreleased]` already holds [A27](../backlog-retired.md#a27) and
[A38](../backlog-retired.md#a38), so 0.15.0 carries them too.

### 1.2 Findings that shape the plan

1. **The downstream specs run against the workspace source** (verified for this plan, read from
   config at d62eee4).
   - `tsconfig.base.json:18` maps `@zvenigora/ng-eval-core` to `modules/eval-core/src/index.ts`, and
     `:19` maps `@zvenigora/ng-eval-signals` to its source. Each downstream `tsconfig.spec.json`
     extends its project's `tsconfig.json`, which extends `tsconfig.base.json`, and neither
     overrides `paths` or `baseUrl` (a grep of `modules/**/tsconfig*.json` finds `extends` only).
   - Both projects' `jest.config.ts` take `jest.preset.js`, which spreads `@nx/jest/preset`. That
     preset sets `resolver: '@nx/jest/plugins/resolver'`, which reads the project's
     `tsconfig.spec.json` (`node_modules/@nx/jest/dist/plugins/resolver.js:11-26`) and resolves
     through TypeScript's module resolution, `paths` included.
   - `node_modules/@zvenigora` does not exist, so no installed copy could answer the specifier
     instead.
   - The A45 plan's M5 is the measured precedent: `eval-signals` observed an unreleased `eval-core`
     prototype ([A45 plan](../a45/plan.md) § 1.4, M5).

   **Consequence**: a behaviour change in `eval-core` moves `eval-signals`' and `eval-forms`' rows in
   the step that makes it. Step 4 moves `eval-signal-async.spec.ts:1388-1412` for that reason, four
   steps before `eval-signals` releases. A downstream row that goes red in an
   `eval-core` step is that step's, and a row the plan does not list is a regression
   ([SR10](../standing-rules.md#sr10)).
2. **Only an `Error` rejection reaches an `evalAsync` caller by identity.** A25's decided text says "a
   rejection reaches the caller as their own value". `evaluateAsync` sends every rejection of the
   result through `ensureError` (`evaluate.ts:171-193`), which returns an `Error` unchanged and
   replaces anything else. The request of 2026-10-30 reports these as measured on 0.14.1 in a sandbox
   whose script is not recorded: `'x'` → `Error` `"x"`; `{k:1}` →
   `"Promise rejected with object: {\"k\":1}"`; `undefined` → `"Promise rejected with undefined"`.
   They agree with `ensureError`'s code. Step 3's rewritten conversion rows, group C's, are their
   recorded measurement; step 2's record what an `await` gives today (below). That conversion is not A25's and stays. Step 1 corrects the register.

   **One discrepancy between the request and the code, measured in step 2: the code reading is
   right.** The request gave those messages "with or without an await", and that was wrong. A
   non-`Error` rejection under an `await` meets the visitor's own `catch` first
   (`await-expression.ts:62-64`) and becomes an `Error` there, which `ensureError` then passes through
   unchanged. Reported at step 2's confirmation gate as measured on 0.14.1, again with no script
   recorded: `'x'` under the `await` of `(async () => await r())()` reads `Await expression failed: x
   at position 13-22`. The recorded measurement is step 2's group C, on d62eee4, under
   `await rejecting()`: `Await expression failed: x at position
   0-17`, `… [object Object] …` and `… undefined …`. After step 3 that `catch` is gone and the three
   messages above hold with an `await` too, so group C's rows are marked `3`. The correction in step 1
   says only what both readings agree on, and stays true.
3. **On the sync path an accepted `await` will return the operand itself.** Today it returns the
   race, a new promise, even for a non-thenable: `(async () => await 1)()` is a promise resolving to
   `1`. After step 3 it is `1`, and `(async () => await p)()` is `p`. `async` stays ignored (§ 2), so
   nothing else wraps it. The `eval-signals` row that pins the tail form,
   `eval-signal.spec.ts:998-1012`, asserts `toBeInstanceOf(Promise)` and `resolves`, which hold for
   `p` itself, so it is predicted green through steps 3 and 4. It is the shape § 0 rule 2 warns about,
   and stays because what it claims, that the form works, stays true.
4. **What pins `await` today**, by grep for an `await` inside a string literal in every `*.spec.ts`
   ([SR25](../standing-rules.md#sr25)):

   | Row | Position | After step 3 | After step 4 |
   | :--- | :--- | :--- | :--- |
   | `eval.service.await.spec.ts:36-73`, A1's three rows | `await obj.__proto__`, a program's last statement | green: the operand throws first | green, unmodified |
   | `eval.service.await.spec.ts:78-83` | `await rejecting()`, the same | moves: `rejects.toBe(e)`, message `'later'` | green |
   | `eval.service.async-error-handling.spec.ts:183-193` | none: `'quickOperation()'` has no `await` | its `__awaitTimeout` line goes, and the case is renamed | green |
   | `hooks.spec.ts:296-378` | `call(async () => await obj.__proto__)`, an arrow's expression body | green | green, unmodified |
   | `readme-examples.spec.ts:620-638` | `async () => await obj.__proto__`, the same | green | green |
   | `parser.service.spec.ts:199-214`, `:390-444` | `await p` and `await q`, refused by the parser | green | green |
   | `eval-signal.spec.ts:998-1012` | `(async () => await load(id))()`, an expression body | green (finding 3) | green |
   | `eval-signal-async.spec.ts:1388-1412` | `(async () => (await loadUser(id)).name)()`, an operand | green: `undefined` either way | moves: the refusal |

   No `eval-forms` spec has an `await` in an expression. So nothing pins an operand, an element, an
   argument, an initializer, a branch, a non-last statement or a nested `await`, on either path.
   That is step 2's job.
5. **A24 refuses forms that resolve correctly today.** Per register, measured 2026-10-30 on 0.14.1:
   `(async () => [await p])()` and `let x = await p; x` resolve on the async path, because the promise
   reaches the result and `awaitAllPromises` resolves it there. Both are refused after step 4. The
   decision accepts this: the rule is positional, and an element or an initializer is not the
   result. The `### Breaking` entry names them. `(async () => { await p })()`, also measured working,
   stays accepted: its one statement is the last.
6. **D13's two checks are two copies of one list.** `dispatchStatement`'s `switch` names the six
   statement types the evaluator implements, and `variable-declaration.ts` narrows one of them by
   `kind`. `eval-forms` cannot ask either: it checks for a label itself, at the top level only. Per
   register, measured 2026-10-30 on 0.14.1: `while`, `var`, `switch`, `return` and `function` throw
   at evaluation, and untaken branches and uncalled bodies pass.
7. **`evaluate-rule.ts:71` is stale since A27**: "`evaluate()` is re-entrant through the arrow
   closure". The arrow's body runs `walkWithoutResult` now. Step 6 corrects it, in the package it
   ships in.
8. **`guardIdentifiers` is public, and its README row says "top-level"** (`eval-forms`
   `README.md:176`). The request lists `:380`, `:519-521` and `:873-876`; `:176` makes the same claim
   and is false after step 6, so step 6 corrects it too ([SR31](../standing-rules.md#sr31)).

---

## 2. Decisions — recorded, not reopened

Quoted from the register, with the correction step 1 makes to A25 marked.

- **A24.** "An `await` is accepted only (a) as the walk's root, (b) as an arrow's concise body, or
  (c) as the expression of the final `ExpressionStatement` of a `Program` or of an arrow's block
  body. Anywhere else it throws a refusal naming `await` when the walk reaches it. An accepted
  `await` passes its operand through unchanged. `async` stays ignored, and documented, and the arrow
  returns no promise. The hook and trace events of an accepted `await` stay as they are. Option C,
  refusing every `await`, was declined."
- **A25.** "No race, no timer, no `__awaitTimeout`, no suffix." *Corrected in step 1*: a rejection
  reaches the caller as it was raised, and so by identity when it is an `Error`; `evaluateAsync`'s
  `ensureError` still turns any other rejection into a new `Error`, a conversion that is not A25's
  and stays. "`eval.service.await.spec.ts:82` moves to `rejects.toBe(e)` with the message `'later'`.
  The key at `eval.service.async-error-handling.spec.ts:188` is vacuous, since its expression has no
  `await`: the line goes and the case is renamed. 0.7.0's CHANGELOG line … stays as history."
- **D13.** "`eval-core` 0.15.0 adds an export that reports the first statement anywhere in a tree
  that evaluation would refuse, with the message evaluation throws, derived from the same check
  `dispatchStatement` and the `var` kind check use, so there is one source. `eval-forms` refuses such
  a rule at registration through both adapters, anywhere in the rule, function bodies and untaken
  branches included. A label keeps its `colonIdentifiers` hint." This reverses the Phase 9 plan's
  § 3.8, "left alone in a function body"; that plan stays as written ([SR6](../standing-rules.md#sr6)).
- **Releases.** `eval-core` 0.15.0, a minor breaking by behaviour; then `eval-signals` and
  `eval-forms` minors for their peer ranges.

**Out of scope**: a suspending walk (the Phase 5 plan's § 3.1 option A); an `async` arrow that
returns a promise; unsupported *expressions* (D13 is about statements); and the open entries this
plan does not name, A33, A34, A48–A51 and A53.

---

## 3. Design

### 3.1 The pass-through (A25, step 3)

`awaitVisitor` becomes: `beforeVisitor`, walk the operand, pop it, push it unchanged, `afterVisitor`.
`createTimeoutPromise`, `ensurePromise`, `DEFAULT_AWAIT_TIMEOUT`, the key read and the `catch` are
deleted. What that does not do, beside today ([SR29](../standing-rules.md#sr29)):
- It does not wrap a non-thenable, so the sync path returns `1` for `await 1` (§ 1.2 finding 3).
- It does not convert a rejection. `evaluateAsync`'s `ensureError` does, at the caller, as it does
  for a rejection with no `await` in the expression.
- It no longer limits how long an `await` waits. Nothing replaces the 30 s bound: a host that wants
  one wraps its own promise, which it owns. The CHANGELOG says so.

What it did incidentally, which goes with it: it made every `await` of a non-thenable asynchronous on
the sync path, and it gave every asynchronous failure a position. The position is the caller's to
find from their own error now; 0.7.0's CHANGELOG line stays as history.

**The failure order** (step 3, same commit). `evaluateAsync`'s outer `catch` moves `stop()` after
`unwindTo`, the sync order, so a hook that fires during cleanup reads `duration` `undefined` on both
paths. The `awaitAllPromises` branch keeps its `stop()` and `setFailure` before the rethrow: no node
is open there, so no hook fires.

### 3.2 The accepted position (A24, step 4)

**The rule, as a function of the walk's root.** Each walk accepts at most one `await`:

| The walk's root | Its accepted `await` |
| :--- | :--- |
| an `AwaitExpression` | the root itself — (a) |
| an arrow's expression body that is an `AwaitExpression` | that body: the arrow's nested walk is rooted there — (b) |
| a `Program` | the expression of its last statement, if that statement is an `ExpressionStatement` whose expression is an `AwaitExpression` — (c) |
| an arrow's `BlockStatement` body | the same, of the block's last statement — (c) |
| anything else | none |

(b) is (a) for the arrow's own walk: `arrow-function-expression.ts` runs
`walkWithoutResult(node.body, st)`, so the expression body is that walk's root. The table needs no
traversal, only the root's own fields; under `preserveParens` they are unwrapped first, a widening
step 4's outcome records. So there is nothing to cache, and the precedents for caching
by node identity, `exemptNodes` and `templateObjects`, are not needed: a cache keyed by the node would
add a lookup to save a property read.

**Why the root and not the node.** A mark on the `AwaitExpression` would outlive the walk that set it.
A caller who evaluates `extract`'s nodes one by one, then the whole tree, would have the `await` of
`(await p) * 10` marked accepted as a root and then accepted as an operand. The rule depends on
the walk, so the answer travels with the walk.

**How the walk carries it — not on `st`, not on the node.** `walkWithoutResult` and
`evaluateAsync`'s walk compute the accepted `await` from their root. When there is one, the walk's
base is a fresh object over the shared table with one own property defined on it:
`Object.create(mergedVisitors(), { AwaitExpression: { value: (n, s, c) => awaitVisitor(n, s, c, n === accepted) } })`,
passed to `walk.recursive` with `{}` as `funcs`, as today. The default table's entry refuses every
`await`. A walk with no accepted `await` takes the shared table unchanged.

**Not a one-entry `funcs`.** That was this plan's first design, and it throws: `walk.make` builds
`Object.create(base)` and *assigns* each `funcs` key onto it, in strict mode, and `mergedVisitors()`
is frozen, so assigning a key its prototype holds as read-only raises
`TypeError: Cannot assign to read only property 'AwaitExpression'`. Measured by step 1's code review
against `acorn-walk`'s `dist/walk.js:180-184`; `defineProperty` on the fresh object is not an
assignment and sidesteps the frozen prototype, measured the same way. Every walk with an accepted
`await` would have thrown, A1's rows included.

The arrow's nested walk computes its own, from its own root, so an enclosing walk's accepted `await`
is never in scope where it is not one. `walkWithoutResult` learns which table a root is checked
against from a parameter: the entry walk applies the `Program` row, the arrow's walk the `BlockStatement`
row, and both the `AwaitExpression` row. `walkWithoutResult` is internal, so its signature is free
to change. § 8 q4 asks whether the per-walk object is worth caching.

**The refusal sits above `beforeVisitor`**, as the `var` kind check does
(`variable-declaration.ts:123-132`), since it reads the node's position and nothing else. So a refused
`await` raises no node-hook event and leaves no trace entry, and the nodes open above it are closed by
the walk's unwinder as for any throw. An accepted `await` runs exactly today's bracket: one `before`,
one `after`, one trace entry, with the operand's events between.

**The message** names `await` and the rule ([SR18](../standing-rules.md#sr18)):

> `Unsupported await position: an await is evaluated only as the result of the expression - the whole expression, an arrow function's expression body, or the last statement of a program or of an arrow function's block body.`

Whether it gains a second sentence is § 8 q2. `async` gets no message: it stays ignored.

**The wrong implementations**, each with the step-2 row that catches it
([SR20](../standing-rules.md#sr20)):
- **By the enclosing arrow's `async`**: accept any `await` inside an `async` arrow. Caught by the
  operand row, `(async () => (await p) * 10)()`, which stays `NaN` where it must throw.
- **By the parent being an `ExpressionStatement`**: accept an `await` that is any statement's whole
  expression. Caught by the non-last program row, `await p; 1`, and the non-last block row.
- **Through a conditional's branches**: treat a `ConditionalExpression` in a result position as
  passing the position on. Caught by the branch row, `(async () => c ? await p : 0)()`.
- **A mark on the node**: caught by step 4's re-rooting rows.
- **A refusal inside the bracket**: caught by step 4's hook row, which expects no `before` for the
  refused node.

### 3.3 One statement check (D13, step 5)

**One module, `internal/visitors/statement-support.ts`**, holds the evaluator's statement table: the
six statement types `dispatchStatement` walks, and the two `VariableDeclaration` kinds. Two functions
read it and return the message evaluation throws, or `undefined`:
- `statementTypeRefusal(statement)`, which `dispatchStatement` calls in place of its `switch`'s list;
- `declarationKindRefusal(declaration)`, which `variable-declaration.ts` calls above `beforeVisitor`,
  where its check is today.

So the messages, and the place each is thrown, stay exactly as they are; only the list moves. The
dispatcher keeps throwing for a type outside the table, and the visitor keeps throwing for `var`,
because `var` shares its node type with `let`.

**The export** walks the whole tree with `acorn-walk`, function bodies, untaken branches and class
bodies included, and reports the first statement either function refuses, with its message. "First" is
source order, the lowest `start`, so a refused statement inside another is reported after it, as
evaluation would meet the outer one first. Its name, its parameter type and its return shape are § 8
q1. The working shape, for the steps to refer to:

```ts
export function unsupportedStatement(node: ReturnType<typeof parse>): { statement: Statement, message: string } | undefined;
```

The parameter follows `guardIdentifiers`' precedent and is a placeholder until q1 is answered.
*Answered at step 2's gate* (§ 8 q1): `findUnsupportedStatement`, over `AnyNode | undefined`, returning
`{ statement: Statement | ModuleDeclaration; message: string } | undefined`. Step 5 applies it.

It is exported through `internal/functions/public-api.ts`, beside `parse` and `extract`, and so reaches
`src/public-api.ts` without a direct export there.

**The wrong implementations**: a second list in the export (caught by the parity spec, probe P5-1);
an evaluation-based check (caught by the untaken-branch row, which never throws when evaluated); a
walk that stops at a function (caught by the function-body row).

### 3.4 Refusal at registration (D13, step 6)

`guardIdentifiers` calls the export before its identifier walk, in place of its own top-level label
loop. A `LabeledStatement`, anywhere, keeps today's message with its `colonIdentifiers` hint, since a
forgotten switch has exactly that shape at any depth. Any other statement is refused with:

> `Expression '<rule>': it holds a <type> statement, which eval-core never evaluates: <eval-core's message>.`

Its wording is settled at step 6 (§ 8 q5). *Answered at step 2's gate*: § 8 q5's text replaces this
one, and step 6 applies it. The order stays: statements first, then identifiers, so
`Q1:1 && constructor` with the switch off is still the label's message
(`guard-identifiers.spec.ts:281`).

### 3.5 Documents

| Document | Step | Change |
| :--- | :--- | :--- |
| `SECURITY.md:383-385` | 3 | A25 leaves "Open register entries that bear on this"; A33 stays. A claim → witness table in step 3's outcome ([SR21](../standing-rules.md#sr21)) |
| `modules/eval-core/README.md:264`, `:294-295`, `:115-135` | 4 | `AwaitExpression`: where it is accepted, the refusal, and that the operand passes through; `ArrowFunctionExpression`: `async` is ignored and the arrow returns no promise |
| `modules/eval-core/README.md`, `### How statements differ from JavaScript` | 5 | The export, in a code span and one executed block |
| `modules/eval-forms/README.md:176`, `:380`, `:515-522`, `:873-876` | 6 | Every refused statement, anywhere in the rule, not only a top-level label |
| `guardIdentifiers`' JSDoc, `evaluate-rule.ts:69-72` | 6 | The same; and the nested walk is `walkWithoutResult` |
| `modules/eval-signals/README.md:414-418` | 8 | "An `async` arrow's `await` is a pass-through" becomes the accepted positions and the refusal |

The `### Breaking` entry for 0.15.0 names the forms that resolved and are now refused (§ 1.2 finding
5), the sync path's operand in place of a promise (finding 3), and the 30 s bound that is gone.

---

## 4. Work breakdown

Each step is one commit, leaves the three projects and the workspace root green, and runs in its own
session ([SR2](../standing-rules.md#sr2)). The code-reviewer runs before every commit that changes a
file under `modules/` or `tools/` ([SR33](../standing-rules.md#sr33)), and on this plan in step 1 by
the request. Probes are applied alone and reverted, and their red cases are named
([SR16](../standing-rules.md#sr16)); a prototype a later step re-runs is pinned as a patch outside the
repository ([SR32](../standing-rules.md#sr32)).

**The request's step shape is changed in one place.** It lists step 7 as "release, then its
post-publish record", and steps 8 and 9 as releases. A publish by the maintainer sits between a release
commit and its record, and one step is one commit ([SR34](../standing-rules.md#sr34)), so each release
step is two: 7a and 7b, 8a and 8b, 9a and 9b. The numbering of the request's steps is kept.

| Step | Subject | Files | Rows: `eval-core` / `eval-signals` / `eval-forms` | Ships in |
| :--- | :--- | :--- | :--- | :--- |
| 1 | This plan and its records | `docs/a24/plan.md` (new), `docs/README.md`, `CLAUDE.md`, `.claude/skills/step/SKILL.md`, `docs/backlog.md` | 0 / 0 / 0 | no package |
| 2 | Characterisation | `internal/visitors/await-position.spec.ts` (new); this document's outcome | **+63** / 0 / 0 | no package |
| 3 | A25, and the failure order | `await-expression.ts`, `evaluate.ts`, the spec's step-3 rows, `eval.service.await.spec.ts`, `eval.service.async-error-handling.spec.ts`, `evaluate.result.spec.ts`, `SECURITY.md`, `CHANGELOG.md`, the register; A25's link targets in the Phase 5 plan and summary, `docs/README.md` and this document | **+2** / 0 / 0 | `eval-core` 0.15.0; `SECURITY.md` no package |
| 4 | A24 | `await-expression.ts`, `evaluate.ts`, `arrow-function-expression.ts`, `recursive-visitors.ts` if the table's entry changes, the spec's step-4 rows, `README.md`, `CHANGELOG.md`, `eval-signal-async.spec.ts`, the register | **+7** / 0 / 0 | `eval-core` 0.15.0 |
| 5 | D13 in `eval-core` | `statement-support.ts` (new), `dispatch-statement.ts`, `variable-declaration.ts`, `functions/unsupported-statement.ts` (new) and its spec (new), `functions/public-api.ts`, `README.md`, `readme-examples.spec.ts`, `CHANGELOG.md` | **+29** / 0 / 0 | `eval-core` 0.15.0 |
| 6 | D13 in `eval-forms` | `guard-identifiers.ts`, `guard-identifiers.spec.ts`, `evaluate-rule.ts`, `README.md`, `CHANGELOG.md`, the register; D13's link targets in the Phase 9 plan and summary, `docs/README.md` and this document | 0 / 0 / **+6** | `eval-forms` 0.8.0 |
| 7a | `eval-core` 0.15.0, the release commit | `package.json`, `CHANGELOG.md`, the root `CHANGELOG.md`, the register, the skill | 0 / 0 / 0 | the release |
| 7b | Its post-publish record | the register's Publication status, the CHANGELOG date if npm's differs, the skill, this document | 0 / 0 / 0 | no package |
| 8a | `eval-signals` 0.8.0 | `package.json`, `CHANGELOG.md`, `README.md`, the root `CHANGELOG.md`, the register, the skill | 0 / 0 / 0 | the release |
| 8b | Its post-publish record | as 7b | 0 / 0 / 0 | no package |
| 9a | `eval-forms` 0.8.0 | `package.json`, `CHANGELOG.md`, `README.md`'s peer lines, the root `CHANGELOG.md`, the register, the skill | 0 / 0 / 0 | the release |
| 9b | Its post-publish record | as 7b | 0 / 0 / 0 | no package |
| 10 | Retrospect | this document's § 10, `CLAUDE.md`, `docs/README.md`, the register, the skill | 0 / 0 / 0 | no package |

From 3187 / 444 / 380, `eval-core` is at 3250 after step 2, 3252 after step 3, 3259 after step 4 and
3288 after step 5 (*corrected in step 4*: 3255 and 3284, before its four `preserveParens` rows); `eval-forms` is at 386 from step 6; `eval-signals` stays at 444. A step-3 or
step-4 flip rewrites a row in place and moves no count. Every row "moves" below means rewritten 1:1.

### Step 1 — This plan and its records

- **New**: this document.
- **Edit**:
  - `docs/README.md`: "Active plan" links this document.
  - `CLAUDE.md`: both "No plan is active" sentences name this plan instead.
  - `.claude/skills/step/SKILL.md`: targets this document; says which projects each step reaches;
    records the counts above; step 1 is done and step 2 next.
  - `docs/backlog.md`: "Work in flight" says this plan is in flight. A24's, A25's and D13's statuses,
    in the index and in their entries, read "Open — in flight as the A24 plan, step N" for the step
    that fixes each: A25 step 3, A24 step 4, D13 steps 5 and 6. A25's decided text and index row are
    corrected (§ 2, § 1.2 finding 2), with the reason in the commit body ([SR4](../standing-rules.md#sr4)).
- **Exit criteria**:
  1. doc-links reports 0 dangling, and this document is linked from `docs/README.md` (the gate's
     index check fails otherwise).
  2. `git grep -n "No plan is active" CLAUDE.md .claude/skills/step/SKILL.md` finds nothing.
  3. `git grep -c "in flight as the \[A24 plan\]" docs/backlog.md` counts 6: three index rows and
     three entries.
  4. The live-row count is unchanged at 21: each status still starts with `Open`. Counted, as A27's
     batch counted it, by a script outside the repository over the index's status cells, live being a
     cell that starts `Open`, `Contained`, `Covered` or `Premise retired`; the count is in the commit
     body.
  5. `git grep -n "as their own value" docs/backlog.md` finds one line, the correction's quotation of
     the old text under "*Corrected 2026-10-30*", and the corrected text names `ensureError`.
  6. `git status --porcelain` lists the five files and nothing else ([SR3](../standing-rules.md#sr3)).
- **Wrong**: a status that starts "In flight" drops the three from the live count, which criterion 4
  catches; a correction that still says "their own value" fails criterion 5.
- **Probes**: none of code. Criterion 1's is the gate: a `docs/README.md` without the link fails the
  index check.
- **Ships in**: no package.

### Step 2 — Characterisation: today's `await` pinned, the flips marked

- **New**: `modules/eval-core/src/lib/internal/visitors/await-position.spec.ts`. Every row asserts
  today's value, measured, and carries a mark: `3`, `4`, both, or none, for the step that rewrites it.
  The register's measured lines are predictions here; a value that differs is recorded as measured,
  and the difference goes in the outcome ([SR22](../standing-rules.md#sr22)).
- **Groups** (`p` resolves to 2, `c` is `true`, `f` is `x => x`):

  | Group | Rows | Cases | Flips |
  | :--- | :--- | :--- | :--- |
  | **P**, the positions: root (`await p`, a bare `AwaitExpression` node); expression body `(async () => await p)()`; program `1; await p` and `await p; 1`; block `(async () => { 1; await p })()` and `(async () => { await p; 1 })()`; operand `(async () => (await p) * 10)()`; element `(async () => [await p])()`; argument `(async () => f(await p))()`; initializer `(async () => { let x = await p; x })()`; branch `(async () => c ? await p : 0)()`; nested `(async () => await await p)()` | 12 | 48: sync and async, each case-sensitive and under `caseInsensitive` ([SR19](../standing-rules.md#sr19)) | `3`: every sync case whose value is, or holds, a promise other than `p`, by identity (§ 0 rule 2); predicted 18, the nine such positions in both modes, the element row's array among them. `4`: every case of the eight positions A24 refuses; predicted 32 |
  | **A**, `async` ignored, and a non-thenable: `(async () => 1)()` and `(async () => await 1)()` | 2 | 4: sync, async | `3`: the second's sync case, today a promise, becomes `1` (§ 1.2 finding 3) |
  | **T**, the timer: one `await` evaluated through `evalAsync`; the same through `eval`; one expression evaluated twice | 3 | 3 | `3`: one `setTimeout` of 30 000 per evaluation of an `await`, no `clearTimeout`, become none |
  | **K**, the key: `__awaitTimeout: 1` on a plain object; on an `EvalContext`'s `original`; under `caseInsensitive` | 3 | 3 | `3`: the delay each `setTimeout` was armed with, 1, 1 and 30 000, becomes no timer |
  | **S**, the suffix: one rejection of a shared `Error`; the same `Error` through two evaluations | 2 | 2 | `3`: `later at position 0-17`, then `… at position 0-17 at position 0-17`, become `later` by identity |
  | **C**, the conversion: rejections `'x'`, `{k:1}` and `undefined` under an `await` through `evalAsync` | 3 | 3 | `3`: § 1.2 finding 2's code reading, measured right |

  63 cases. Async-path P rows also carry JavaScript's own value, run natively in an `async` function
  with the same bindings, so the outcome can say which of today's answers are wrong: predicted
  `(await p) * 10` is `NaN` here and 20 natively.
- **Exit criteria**:
  1. All 63 cases pass against d62eee4's library code, which this step does not touch.
  2. **The marks are measured** ([SR27](../standing-rules.md#sr27)). Two prototypes, written in this
     step and pinned as patches under `D:\repo.2026\ng-eval-base\a24-prototype\`, each with its
     SHA-256 in the outcome: `a25.patch`, § 3.1's visitor; `a24.patch`, § 3.1 and § 3.2 together.
     Each is applied alone with `git apply` and reverted with `git apply -R`, and run over all three
     projects:
     - `a25.patch` turns red exactly the cases marked `3`, and beside them only
       `eval.service.await.spec.ts:78-83`, the suffix pin step 3 moves;
     - `a24.patch` turns red exactly the cases marked `3` or `4`, and beside them only that case and
       `eval-signal-async.spec.ts:1388-1412` (§ 1.2 finding 4).

     Any other red case is a wrong mark or a missed pin, corrected before the commit and recorded.
  3. **The native arm is a separate producer**: replacing it with the evaluator's own result turns
     red exactly the async P cases whose value is not JavaScript's.
  4. `git status --porcelain` lists the new spec and this document.
- **Wrong**: a mark taken from the decision rather than from the prototype. Criterion 2 is its probe.
- **Ships in**: no package.
- **Outcome** (2026-10-30):
  - **The spec**: 63 cases, green against d62eee4's library code. Every value the plan predicted was
    measured as predicted, group C's code reading (§ 1.2 finding 2) and K3's 30 000 included, and
    **no mark differed from its prediction**.
  - **The prototypes**, pinned under `D:\repo.2026\ng-eval-base\a24-prototype\`, each applied alone
    with `git apply` after its SHA-256 was checked, run over all three projects, and reverted with
    `git apply -R` ([SR32](../standing-rules.md#sr32)):

    | Patch | SHA-256 | What it is |
    | :--- | :--- | :--- |
    | `a25.patch` | `E5648C953E26A006746A9DFBA699E414FC6B187639BFD76B2899FB3A155F4182` | `await-expression.ts`: § 3.1's visitor, the operand popped and pushed unchanged |
    | `a24.patch` | `B887A1210FF4912DDD6F00286A91DD4FDDC972518EAEFF14CF8EC3318E2BD5B5` | § 3.1 and § 3.2: the refusal above `beforeVisitor`; the accepted `await` read off the root one level deep; a fresh `Object.create(mergedVisitors(), { AwaitExpression })` only for a walk that has one; `walkWithoutResult`'s third parameter, set by the arrow's walk |

  - **The red sets**:

    | Patch | `eval-core` | `eval-signals` | `eval-forms` |
    | :--- | :--- | :--- | :--- |
    | `a25.patch` | 31 of 3250: the 30 cases marked `3` (group P's 18 sync, A2's sync, T1–T3, K1–K3, S1–S2, C1–C3) and `eval.service.await.spec.ts` "should still carry the position of the await expression" | 0 of 444 | 0 of 380 |
    | `a24.patch` | 53 of 3250: the 52 cases marked `3` or `4` (30 and 32, ten of them marked both) and the same suffix pin | 1 of 444: `eval-signal-async.spec.ts` "should read a member off the promise in operand position, inside an async arrow too" | 0 of 380 |

    So criterion 2 holds as written: no wrong mark and no missed pin.
  - **The native arm** (criterion 3): with the evaluator's own value in its place, 8 cases went red,
    P5, P6, P7 and P10 async, in both modes, and the arm was restored by hand. The plan named P7; P5,
    P6 and P10 came from the spec's hand-written `js` column, a prediction until the native arm ran
    it ([SR22](../standing-rules.md#sr22)), and the probe's red set matches that column exactly. Of today's answers, one is `await`'s: P7's `(await p) * 10` is `NaN` where JavaScript gives
    20, and step 4 refuses it. P5's 2, P6's 1 and P10's 2 are an arrow's block body returning its
    completion value where JavaScript returns `undefined`, `eval-core`'s documented statement semantics
    (its README, "How statements differ from JavaScript"), not `await`'s; step 4 refuses P6 and P10.
  - **One fixture finding**: the native arm's `AsyncFunction` is taken from source the engine compiles.
    The spec's own `async` arrow is down-levelled through `tslib`'s `__awaiter` by the Jest transform,
    so its `constructor` is plain `Function`, and the first run's six root and program native cases
    threw `SyntaxError` on their `await`.
  - **Counts**: `eval-core` 3187 → 3250; `eval-signals` 444 and `eval-forms` 380, unchanged.
  - **Corrections in this step's commit** ([SR4](../standing-rules.md#sr4)): § 1.2 finding 2 and the
    conclusion's bullet, the request's "with or without an await" measured wrong; group C's mark;
    step 5's parity sources for `return`, `break` and `continue`.
  - **Decisions recorded, not made, in this step**: § 8's six answers, given by the maintainer at
    step 2's confirmation gate on 2026-10-30 and added to its scope there. They are recorded under § 8,
    with pointers from § 3.3 and § 3.4, and steps 4–6 apply them.
  - **Code review** (before the commit): no Critical finding. Folded in: finding 2's stale sentence on
    the conversion rows, the source of § 8's answers, the revision header, this bullet's split of the
    predicted from the found, the docblock's wording on the `caseInsensitive` leg and the identity
    rows, and a setup check that P1's node is the bare `AwaitExpression` (asserted inside P1's cases,
    so no count moves; its probe, `extractExpressions` off, turned red P1's four cases and no other). P4, P6 and P7 give 1, 1 and `NaN` whether or not `p` resolves, so their
    `caseInsensitive` cases do not witness case correction; they are step-4 refusal rows, and the
    other nine positions' do.

### Step 3 — A25: the operand passes through; and the failure order

- **Edit**: `await-expression.ts` (§ 3.1); `evaluate.ts`, `stop()` after `unwindTo` in
  `evaluateAsync`'s outer `catch`; the spec's rows marked `3`, rewritten to their new values;
  `eval.service.await.spec.ts:78-83`, to `rejects.toBe(e)` and the message `'later'`, renamed;
  `eval.service.async-error-handling.spec.ts:183-193`, the `__awaitTimeout` line deleted and the case
  renamed for what it checks, a promise the result holds resolving within its own delay;
  `evaluate.result.spec.ts`, two rows: a hook during cleanup reads `duration` `undefined`, under
  `eval` (a guard, green on d62eee4) and under `evalAsync` (red on d62eee4); `SECURITY.md:383-385`;
  `modules/eval-core/CHANGELOG.md` `[Unreleased]`: a `### Fixed` line for A25, a `### Fixed` line for
  the failure order (a hook firing during an `evalAsync` failure's cleanup read `duration` as a
  number), and the `### Breaking` lines for the sync value and the bound; the register, A25 retired
  to `backlog-retired.md` with its rows and probes, its index row pointing there.
- **Edit, link targets only** ([SR6](../standing-rules.md#sr6)'s re-point): A25's inbound links,
  which its retirement leaves dangling — `docs/signals/phase-5-plan.md` (5),
  `docs/signals/phase-5-summary.md:57`, `docs/README.md`'s "Active plan" entry, and this document's.
  Only the target changes. `git grep -n "backlog\.md#a25"` finds none afterwards outside
  `backlog.md`'s own `[A25](backlog-retired.md#a25)` rows.
- **The failure order has no register entry**: A27's batch noticed it, and this step fixes it in the
  commit that records it, as the A45 plan's D11 was. This document and the CHANGELOG line record it.
- **Rows**: `eval-core` +2. The flips and the two existing cases move in place. `eval-signals` and
  `eval-forms`: 0, predicted by finding 3 and the grep in finding 4; a red row there is a regression.
- **Exit criteria**:
  1. Every case marked `3` holds its new value.
     `git grep -n -e __awaitTimeout -e "at position" -- modules/eval-core/src ":!*.spec.ts"` finds
     nothing.
  2. A1's rows (`eval.service.await.spec.ts:36-73`) and `hooks.spec.ts:296-378` are green and
     unmodified: `git diff` shows no line of either in those ranges.
  3. `SECURITY.md`'s sentence, with its claim → witness table in the outcome.
- **Probes**, each alone:
  - **P3-1** *Wrong*: re-wrap the operand in a new promise, `Promise.race([value])`, as today's race
    does. Red: the sync identity cases of group P, predicted 18, and group A's `await 1` sync case
    (§ 0 rule 2).
  - **P3-2** *Wrong*: keep the race, with the key's delay, and clear its timer once the operand
    settles. The race re-wraps the operand, so red: group T's three, group K's three, which see a
    timer armed with 1, 1 and 30 000, and P3-1's 19. It witnesses K's rows; no narrower probe of the
    key exists once the race is gone, since nothing reads it.
  - **P3-3** *Wrong*: drop the suffix by wrapping, `new Error('later', { cause })`. Red: the moved
    `eval.service.await.spec.ts` case and group S's two, and P3-1's 18 group-P sync cases: a
    visitor intercepts a rejection only by chaining a new promise onto the operand, which re-wraps
    it, while A2's `1` is not thenable and is not wrapped. *Corrected in step 3*
    ([SR4](../standing-rules.md#sr4)): this predicted the three alone, and the probe measured 21.
  - **P3-4** *Wrong*: restore `stop()` before `unwindTo`. Red: the `evalAsync` duration row only.
- **Ships in**: `eval-core` 0.15.0, but `SECURITY.md` in no package.
- **Outcome** (2026-10-30):
  - **The visitor is `a25.patch`'s**, applied after its SHA-256 was checked
    ([SR32](../standing-rules.md#sr32)), with one difference: the patch's comment, "A25 prototype:
    the operand passes through, unraced and unwrapped", is replaced by one that names what is gone
    and cites the retired entry, since the prototype's label would ship. The code is the patch's,
    line for line. The failure order is added on top, in `evaluate.ts`.
  - **The flips**: the 30 cases marked `3` and `eval.service.await.spec.ts`'s suffix case, exactly
    the patch's red set in step 2, each rewritten in place. The marked rows assert the operand by
    identity (`toBe(p)`, group P's sync cases; `1`, A2's), no timer (T and K), the caller's `Error`
    with its message `later` (S), and `ensureError`'s messages `x`,
    `Promise rejected with object: {"k":1}` and `Promise rejected with undefined` (C). T2 keeps its
    value assertion, that the promise resolves to 2, so that P3-1's red set stays the group-P and A2
    cases it was predicted from. `eval.service.async-error-handling.spec.ts`'s case is renamed
    "should resolve a promise the result holds within its own delay", its key line deleted.
  - **The two duration rows** are in `evaluate.result.spec.ts`. A hook on `CallExpression`'s
    `after` records `duration` from each event with `completed` `false`, and the row asserts exactly
    `[undefined]`, so a hook that never fired fails it as well ([SR17](../standing-rules.md#sr17)).
    The `eval` row is a guard; the `evalAsync` row is red with d62eee4's order, which is P3-4.
  - **The probes**, each applied alone against all three projects and reverted by hand; no probe
    moved a downstream row:

    | Probe | Predicted | Red |
    | :--- | :--- | :--- |
    | P3-1 | 19: group P's 18 sync cases, A2 sync | 19, as predicted |
    | P3-2 | 25: T's 3, K's 3, P3-1's 19 | 25, as predicted; K's delays 1, 1 and 30 000, T's 30 000 per evaluation |
    | P3-3 | 3: the moved case, S1, S2 | 21: those 3 and group P's 18 sync cases (corrected above) |
    | P3-4 | 1: the `evalAsync` duration row | 1, as predicted |

  - **Counts**: `eval-core` 3250 → 3252; `eval-signals` 444 and `eval-forms` 380, unchanged.
  - **Records**: `SECURITY.md`'s "Open register entries" names A33 alone; the CHANGELOG's
    `[Unreleased]` gains `### Breaking`, the operand itself and the bound that is gone, and two
    `### Fixed` lines, A25 and the failure order; A25 is retired to `backlog-retired.md` with its rows
    and probes, its index row and every inbound link pointing there.
  - **`SECURITY.md`'s sentence** (criterion 3), as written: "**Open register entry that bears on
    this**: [A33](../backlog.md#a33), under `caseInsensitive` a cached miss can hide a key added
    later — no refusal is skipped." ([SR21](../standing-rules.md#sr21)):

    | Claim | Witness |
    | :--- | :--- |
    | A33 is the one open entry that bears on this | doc-links, on `docs/backlog.md#a33`, which dangles when A33 retires unless the line is re-pointed; A33's index row reads `Open` |
    | A25 no longer bears on it: no `await` arms a timer | `await-position.spec.ts` T1–T3 and K1–K3, probed by P3-2; the old line's link into the register's A25 would dangle, so doc-links fails if it is restored |
    | A cached miss can hide a key added later | unchanged text: A33's measured rows in the register; no spec pins it |
    | No refusal is skipped | unchanged text: `eval.service.case-variant-guard.spec.ts`, the resolved-key re-check |

  - **The CHANGELOG's lines** ([SR21](../standing-rules.md#sr21)):

    | Claim | Witness |
    | :--- | :--- |
    | Breaking: on the sync path `(async () => await p)()` is `p`, `(async () => await 1)()` is `1` | group P's 18 sync cases and A2's sync case, probed by P3-1 |
    | Breaking: the sync entry points it names | held by review: each reaches `evaluate`, which the P rows call; T2 goes through `eval` |
    | Breaking: a non-thenable `await` gives the value wherever it sits, `(await 1) + 1` is `2` and `(await o).k` is `o.k`, on both paths | measured in this step by a throwaway spec, deleted before the gate: `"[object Promise]1"` and `undefined` with `a25.patch` reversed, `2` and `5` with it; no row, since step 4 refuses those positions and rewrites the line |
    | Breaking: `evalAsync` resolves a promise that reaches the result, as before | group P's async cases marked `-`, green through the step |
    | Breaking: no timer, no key | T1–T3 and K1–K3, probed by P3-2 |
    | Breaking: a host that wants a bound wraps its own promise | held by review: advice, no behaviour |
    | Fixed: one 30 000 ms timer per evaluation, never cleared; the key missed under `caseInsensitive` | step 2's T and K rows at d62eee4, K3's 30 000 |
    | Fixed: the zone waits out 30 s per `await` | the register's measurement of 2026-10-07 (the Phase 5 plan's § 1.3, P2); no row |
    | Fixed: an `Error` rejection by identity, its message unchanged | S1, S2 and `eval.service.await.spec.ts`'s moved case, probed by P3-3 |
    | Fixed: `'x'` rejects with an `Error` `"x"`, where it was `Await expression failed: x at position 0-17` | C1 now, and step 2's C1 at d62eee4 |
    | Fixed: no exported shape or `.d.ts` change | the gate's `build`; no exported declaration in `git diff`; `await-expression.ts` is under `internal/visitors`, outside the published surface |
    | Fixed: a hook during an `evalAsync` failure's cleanup reads `duration` `undefined`, as under `eval` | `evaluate.result.spec.ts`'s `evalAsync` row, probed by P3-4; its `eval` row, the guard |

  - **Code review** (before the commit): one Critical, folded in: criterion 3's claim → witness
    table, and the CHANGELOG's, were missing from this outcome. Folded in as well: the Breaking line
    named `eval` and `simpleEval` alone, where every sync entry point gives the operand; a
    non-thenable `await` changing value in every position, on both paths, which the line did not say,
    measured above; the neighbouring case's comment in
    `eval.service.async-error-handling.spec.ts`, that timeout functionality "would be implemented in
    the await-expression visitor", deleted; and A24's entry, which said the visitor pushes a
    promise.

### Step 4 — A24: the accepted position, and the refusal

- **Edit**: `await-expression.ts`, `evaluate.ts` and `arrow-function-expression.ts` (§ 3.2);
  `recursive-visitors.ts` only if the default entry changes; the spec's rows marked `4`;
  `modules/eval-core/README.md:264` and `:294-295`, and its "Async evaluation and compilation"
  section (`:115-135`), where a reader looks for `await`'s rule; `CHANGELOG.md` `[Unreleased]`;
  `modules/eval-signals/src/lib/eval-signal-async.spec.ts:1388-1412`, whose `arrow` now asserts the
  refusal, and whose comment says why; the register, A24 retired, its index row keeping
  `<a id="a24"></a>` in its first cell.
- **New rows** (`eval-core` +7): the same `AwaitExpression` node evaluated as a root, then the tree
  holding it as an operand: accepted, then refused; the reverse order; and a refused `await` under a
  hook: no `before` for it, and the enclosing nodes unwound. *Widened in step 4*
  ([SR4](../standing-rules.md#sr4)), at the maintainer's answer to its code review: four rows under
  `preserveParens`, each one case over both paths — an expression body `(async () => (await p))()`,
  a block's last statement `(async () => { 1; ((await p)) })()` and the root `(await p)`, accepted;
  an operand `(async () => ((await p)) * 10)()`, refused. This was +3.
- **Rows that move**: the 32 cases marked `4`; `eval-signal-async.spec.ts:1388-1412`, rewritten
  in place to assert § 3.2's message in full ([SR18](../standing-rules.md#sr18)), so `eval-signals`
  stays at 444.
- **`eval-signals`' README is left as it is until step 8a.** From this step its
  `:414-418` (`NaN` and `undefined` for an operand `await`) no longer describes the workspace, while
  the moved row asserts the refusal. It stays true of every published combination, since 0.7.0
  declares `eval-core` `<0.15.0`, so it is not false now in [SR31](../standing-rules.md#sr31)'s sense;
  the moved row's comment says that it mirrors the paragraph step 8a writes.
- **Exit criteria**:
  1. Every case marked `4` throws § 3.2's message, asserted in full ([SR18](../standing-rules.md#sr18)).
  2. A1's rows and `hooks.spec.ts:296-378` are green and unmodified, as in step 3.
  3. Nothing is stored on `st` or a node: the step's diff adds no assignment to a property of either,
     read by hand, and `git grep -n -e WeakMap -e WeakSet -- modules/eval-core/src/lib/internal/visitors/await-expression.ts modules/eval-core/src/lib/internal/functions/evaluate.ts`
     finds nothing. P4-4 is the row-level witness.
  4. `internal/performance.spec.ts` green and untouched.
- **Probes**, each alone, each with its catching row (§ 3.2):
  - **P4-1** *Wrong*: accept every `await` inside an `async` arrow. Red: the operand, element,
    argument, initializer, branch, nested and non-last block cases, sync and async, both modes.
  - **P4-2** *Wrong*: accept an `await` whose parent is any `ExpressionStatement`. Red: `await p; 1`
    and the non-last block row.
  - **P4-3** *Wrong*: pass the position through a conditional's branches. Red: the branch row only.
  - **P4-4** *Wrong*: mark the accepted node in a module-level `WeakSet`. Red: the first re-rooting
    row.
  - **P4-5** *Wrong*: refuse after `beforeVisitor`. Red: the hook row.
  - **P4-6** *Wrong*: refuse every `await`, option C. Red: A1's rows, `hooks.spec.ts:296-378`,
    `readme-examples.spec.ts:620-638`, `eval-signal.spec.ts:998-1012`, the moved
    `eval.service.await.spec.ts:78-83`, and every step-2 case that evaluates an accepted `await`: the
    16 accepted P cases and groups A's `await 1`, T, K, S and C. It is the probe that A1's rows
    witness acceptance.
  - **P4-7** *Wrong*, added in step 4 with the `preserveParens` rows: no unwrap. Red: the three
    accepted `preserveParens` rows only.
  - **P4-8** *Wrong*: unwrap one level instead of looping. Red: the block row, the one with two
    levels.
- **Ships in**: `eval-core` 0.15.0. The `eval-signals` spec ships in no package; its README waits for
  step 8a.
- **Outcome** (2026-10-30):
  - **The code is `a24.patch`'s § 3.2 hunks**, applied by hand onto step 3's visitor after the patch's
    SHA-256 was checked ([SR32](../standing-rules.md#sr32)): the accepted-position table
    (`acceptedAwait`, `lastStatementAwait`), the per-walk override (`visitorsFor`, and
    `walkWithoutResult`'s third parameter, which the arrow's walk sets), and the refusal above
    `beforeVisitor`. § 8 q2, q3 and q4 are applied: one sentence, the working answers, no cache.
    Every code line is the patch's, with these differences: the message constant is not exported,
    since nothing imports it and the specs write the message out ([SR18](../standing-rules.md#sr18));
    and the patch's four "A24 prototype" comments are replaced by ones that say what the code does
    and cite the retired entry, with a JSDoc for `acceptedAwait` and `visitorsFor`, `@param arrowBody`
    on `walkWithoutResult`, and a sentence on the arrow's call, since the prototype's labels would
    ship. `recursive-visitors.ts` is not edited: its entry is `awaitVisitor` with `accepted`
    defaulting to `false`, so the shared table refuses every `await` as it stands.
  - **One behavioural difference from the patch**, decided by the maintainer at the code review's
    finding: `acceptedAwait` strips `preserveParens`' wrappers with the existing `unwrapParentheses`
    (`visitors/utils.ts`) from the root and from the last statement's expression, through a new
    `asAwait`, as the assignment, update and `this`-position checks do ([SR29](../standing-rules.md#sr29)).
    The patch compared the type as it came, so under `preserveParens` `(async () => (await p))()`,
    accepted without the option, was refused. At 0.14.1 it resolved, held by reading and not
    measured: `acorn-walk`'s base visitor passes a `ParenthesizedExpression` through, so the race
    reached the result as it did without the parentheses. What it does not do: it unwraps
    only those two places, never an operand, so `((await p)) * 10` is still refused; and it reads no
    option, since without `preserveParens` acorn produces no wrapper to strip.
  - **The flips**: the 32 cases marked `4`, P4 and P6 to P12 on both paths and in both modes, each
    rewritten in place to `toThrow(new Error(REFUSAL))`, or `rejects.toThrow` for the async path,
    which compares the whole message. `REFUSAL` is written out in the spec. The refused rows keep
    their native arm. `eval-signal-async.spec.ts:1388-1412` is rewritten in place and renamed
    "should read a member off the promise in operand position, and refuse an await there": its
    `arrow` is `'error'` after the flush and its read throws an `Error` equal to the message in full.
    Its comment says the README paragraph it contradicts stays until step 8a, and why.
  - **The new rows**, `await-position.spec.ts`: R1 and R2, the `await` of `(await p) * 10` walked
    alone (accepted, `p` itself) and inside the program (refused), in both orders; H1, the program
    under a wildcard hook, which sees `BinaryExpression` opened, no `before` for the `await`, and
    every opened node unwound, innermost first, `completed` `false`, with the refusal as its error.
    Q1 to Q4, under `preserveParens` ([SR19](../standing-rules.md#sr19): the path now has a leg the
    option reaches), each one case asserting `p` itself on the sync path and `2` under
    `evaluateAsync`, or the refusal on both: Q1 `(async () => (await p))()`; Q2
    `(async () => { 1; ((await p)) })()`; Q3 the root `(await p)`, parsed under `extractExpressions`
    and checked to be a `ParenthesizedExpression`; Q4 `(async () => ((await p)) * 10)()`, refused.
  - **The probes**, each applied alone by hand against all three projects and reverted by hand;
    `git grep PROBE` found nothing afterwards:

    | Probe | Predicted | Red |
    | :--- | :--- | :--- |
    | P4-1 | 28: P6 to P12, both paths, both modes; and beside them the moved `eval-signals` row, an operand `await` in an `async` arrow, which the plan's list did not name: 29 | 29, as predicted |
    | P4-2 | 8: P4 and P6 | 8, as predicted |
    | P4-3 | 4: P11 | 4, as predicted |
    | P4-4 | 1: R1 | 1, as predicted |
    | P4-5 | 1: H1 | 1, as predicted |
    | P4-6 | `eval-core` 38: the 16 accepted P cases, A2's two, T, K and C's three each, S's two, R1 and R2, which the plan's list predates; `eval.service.await.spec.ts`' four; of `hooks.spec.ts:296-378`'s four, the two that read the operand's throw, "should throw and leave nothing open" and "should close every open node as failed"; `readme-examples.spec.ts:620-638`. `eval-signals` 1, `eval-signal.spec.ts:998-1012` | 38 and 1, as predicted |
    | P4-7 | 3: Q1, Q2, Q3 | 3, as predicted |
    | P4-8 | 1: Q2; Q3's source has one level | 1, as predicted |

    P4-1 accepted every `await` in an arrow's walk, which for these sources is every `await` in an
    `async` arrow: acorn parses an `await` nowhere else. P4-2 accepted the expression of every
    statement in the root's body. P4-3 read a root `ConditionalExpression`'s branches. P4-6 kept the
    override and passed `false` from it. P4-1 to P4-6 ran before the Q rows existed. P4-1 and P4-6
    reach them, so both were run again on `eval-core` after the unwrap, the probed code being the
    same downstream: P4-1 29, the 28 and Q4, and P4-6 41, the 38 and Q1 to Q3, each as predicted.
    P4-2's to P4-5's code leaves the Q rows as they are.
  - **Criteria**: 1, the 32 cases and the moved row; 2, `git diff` shows no line of
    `eval.service.await.spec.ts` or `hooks.spec.ts`; 3, the diff adds no assignment to a property of
    `st` or a node, read by hand, and the `WeakMap`/`WeakSet` grep finds nothing; 4,
    `performance.spec.ts` green and untouched.
  - **Counts**: `eval-core` 3252 → 3259; `eval-signals` 444 and `eval-forms` 380, unchanged.
  - **Records**: the README's "Async evaluation and compilation" gains the rule, and its
    `AwaitExpression` and `ArrowFunctionExpression` lines say where an `await` is accepted and that
    `async` is ignored. The CHANGELOG's `[Unreleased]` `### Breaking` gains A24's line, and A25's line
    loses its two examples of a non-thenable `await` in operand position, which this step refuses;
    A24's line carries one of them as the old value. A24 is retired to `backlog-retired.md` with its
    rows and probes; its index row keeps `<a id="a24"></a>` in its first cell, which
    `tools/published-links.txt:26` needs, and the register's own links point to the retired entry.
    The links into `backlog.md#a24` elsewhere resolve to that index row and are left as they are.
  - **Correction in this step's commit** ([SR4](../standing-rules.md#sr4)): `.claude/skills/step/SKILL.md`'s
    state line named the next step and went stale at every step; step 3 left it reading "Step 2 is
    next". It now names none: the last step in § 4 with a recorded outcome is done, and the next is
    the one after it.
  - **The README's lines** ([SR21](../standing-rules.md#sr21)):

    | Claim | Witness |
    | :--- | :--- |
    | Accepted as the whole expression, an arrow's expression body, a program's or a block body's last statement | P1, P2, P3 and P5, both paths, both modes; P4-6 turns them red |
    | A top-level `await` parses only with `allowAwaitOutsideFunction`, off in the services' options | `parser.service.spec.ts`' criterion 1 and (b) rows, `Unexpected token (1:6)` |
    | Refused anywhere else, by name, when the walk reaches it | the 32 cases; P4-1, P4-2 and P4-3 |
    | A refused `await` fires no hook | H1; P4-5 |
    | Up to 0.14.1 an `await` handed the walk a promise as its value | step 2's sync P cases at d62eee4, each a promise other than `p`; A25's retired rows |
    | Up to 0.14.1 `(async () => (await p) * 10)()` was `NaN`, where JavaScript gives 20 | step 2's P7 at d62eee4; P7's native arm, still run, gives 20 |
    | Elsewhere `evalAsync` resolved it: `(async () => f(await p))()` gave 2 | step 2's P9 async at d62eee4, `2`, and its native arm |
    | The operand passes through; on the sync path `eval` returns `p` | P2's sync case, `toBe(p)`, probed by step 3's P3-1 |
    | `async` is ignored; `(async () => 1)()` is `1` | A1, both paths |
    | The walk does not suspend | held by review: `evaluateAsync` awaits only after `walk.recursive` returns |

  - **The CHANGELOG's line** ([SR21](../standing-rules.md#sr21)):

    | Claim | Witness |
    | :--- | :--- |
    | The accepted positions, and the refusal elsewhere, by its message | as the README's first and third rows |
    | On every entry point | held by review: every entry point reaches `walkWithoutResult` or `evaluateAsync`, both of which build `visitorsFor`; the rows call `evaluate`, `evaluateAsync`, `EvalService` and `createEvalSignalAsync` |
    | Fires no hook | H1; P4-5 |
    | Every `await` handed the walk a promise | as the README's row |
    | Was `NaN`; was `undefined`; was `"[object Promise]1"` | step 2's P7; the register's table measured 2026-10-07 and the `eval-signals` row before this step; step 3's throwaway measurement at d62eee4 |
    | Six forms resolved under `evalAsync`, and are refused | step 2's P8, P9, P11, P12, P4 and P10 async, `[2]`, `2`, `2`, `2`, `1` and `2`, at d62eee4; their step-4 cases now |
    | An accepted `await` keeps its hook and trace events | `hooks.spec.ts:296-378`, unmodified and green; P4-6 turns two of its rows red |
    | No exported shape or `.d.ts` change | the gate's `build`; `acceptedAwait` and `awaitVisitor` are under `internal/visitors`, which `src/public-api.ts` does not re-export, and `walkWithoutResult` is not in `functions/public-api.ts` |

  - **Code review** (before the commit): no Critical finding. Folded in: the README's and the
    CHANGELOG's "gave a wrong answer up to 0.14.1" for every refused position, false of all but the
    operand ([SR31](../standing-rules.md#sr31)) — step 2 measured P4, P8, P9, P11 and P12 giving
    JavaScript's value under `evaluateAsync` — so the Breaking line now names the six forms that
    resolved, and "handed the walk its operand", false of 0.14.1, which handed it the race; the
    `preserveParens` gap, decided by the maintainer as above, with its four rows and P4-7 and P4-8;
    and this outcome's count of the prototype's comments, four, not three. Noted, not changed: a walk
    with an accepted `await` allocates its override per walk, so per call of such an arrow, as
    § 8 q4 decided; and `docs/README.md`'s "Active plan" entry still links `backlog.md#a24`, which
    resolves to the index row and is outside this step's file list.

### Step 5 — D13 in `eval-core`: one check, exported

- **New**: `internal/visitors/statement-support.ts`; `internal/functions/unsupported-statement.ts` and
  `unsupported-statement.spec.ts` (§ 3.3).
- **Edit**: `dispatch-statement.ts`, `variable-declaration.ts`, `functions/public-api.ts`,
  `modules/eval-core/README.md` with one executed block, `readme-examples.spec.ts`, `CHANGELOG.md`
  `[Unreleased]` `### Added`.
- **Rows** (`eval-core` +29):
  - **The parity table**, 23 cases. One row per statement type acorn produces at the services'
    options (`defaultParserOptions`: `ecmaVersion` 2020, `sourceType` `script`): the 20 members of
    acorn's `Statement` union other than `VariableDeclaration`, and `VariableDeclaration` once each for
    `var`, `let` and `const`. Acorn's `kind` union also has `using` and `await using`, which do not
    parse at `ecmaVersion` 2020, so they get no row and the spec says why. Each row's source, run
    through `simpleEval`, throws iff the export reports it, and with the same message.
    *Corrected in step 2*: `return`, `break` and `continue` do not parse at the top level of a script,
    so their rows' sources are ones that parse, and the spec says why for each: `return` in the block
    body of an arrow the source calls, `(() => { return 1 })()`, whose throw the call passes through
    unchanged; `break` and `continue` in a bounded `for`, the one loop `eval-core` evaluates, so the
    row's throw is theirs and not the loop's, `for (let i = 0; i < 1; i++) { break }` and the same with
    `continue`.
  - **The completeness case**, 1 case of its own: it reads the `Statement` union in acorn's `.d.ts`
    and fails on a member with no row and no stated reason. `ModuleDeclaration` types reach
    `dispatchStatement` only under a per-call `sourceType: 'module'`; the case names them as not
    produced at the services' options, and the export reports them by the same table, since none is
    in it.
  - **The tree**, 4 cases: an arrow's body never called reports; an untaken branch reports; two refused
    statements report the first in source order; a tree with none reports `undefined`.
  - **The README block**, 1 case.
- **Exit criteria**:
  1. `git grep -c "Unsupported statement type" modules/eval-core/src/lib/internal` outside specs is 1,
     in `statement-support.ts`, and so for `Unsupported variable declaration kind`.
  2. The existing statement specs, `statement-semantics.spec.ts:175-193` and the dispatcher rows in
     `block-statement.spec.ts`, `program.spec.ts`, `for-statement.spec.ts` and `if-statement.spec.ts`,
     are green and unmodified.
  3. The export is in the built `.d.ts`, `export-list.spec.ts` and `public-api.spec.ts` are green, and
     an import of it from `@zvenigora/ng-eval-core` compiles in the README block
     ([SR21](../standing-rules.md#sr21)).
- **Probes**, each alone:
  - **P5-1** *Wrong*: a second list in the export that admits `WhileStatement`. Red: the parity row
    for `while`.
  - **P5-2** *Wrong*: the dispatcher's old `switch` restored beside the table, with `SwitchStatement`
    added to it. Red: the parity row for `switch`, which now evaluates.
  - **P5-3** *Wrong*: the walk skips function bodies. Red: the uncalled-body row.
  - **P5-4** *Wrong*: report the last in source order. Red: the order row.
  - **P5-5** The README's code span for the export removed. Red: `export-list.spec.ts`' F10 case.
- **Ships in**: `eval-core` 0.15.0.

### Step 6 — D13 in `eval-forms`: refused at registration

- **Edit**: `modules/eval-forms/src/lib/guard-identifiers.ts` (§ 3.4), its JSDoc included;
  `modules/eval-forms/signals/src/lib/guard-identifiers.spec.ts`; `evaluate-rule.ts:69-72`;
  `modules/eval-forms/README.md:176`, `:380`, `:515-522`, `:873-876` (finding 8);
  `modules/eval-forms/CHANGELOG.md` `[Unreleased]`, whose link at `:141` is re-pointed too; the
  register, D13 retired, recording that it reverses the Phase 9 plan's § 3.8.
- **Edit, link targets only** ([SR6](../standing-rules.md#sr6)'s re-point): D13's inbound links —
  `docs/colon-identifiers/phase-9-plan.md` (6), `docs/colon-identifiers/phase-9-summary.md` (3),
  `docs/README.md`'s "Active plan" entry, and this document's.
- **Rows**: `guard-identifiers.spec.ts:308-311` and `:317-320` move in place, to the label's message
  through both adapters. **New**, each through both adapters, beside them inside the
  `describe.each` over the switch on and off (`:254-257`), so 3 rows and 6 cases (`eval-forms` +6):
  a top-level `while`; `if (false) { while (1) {} }`; `[1].map(() => { switch (1) {} })`.
- **Exit criteria**:
  1. The two moved rows and three new ones assert the full message ([SR18](../standing-rules.md#sr18)),
     in both modes of the switch.
  2. `guard-identifiers.spec.ts:281`'s row, the label before the identifier, is green and unmodified.
  3. `git grep -n "top-level\|own statements" modules/eval-forms/README.md` finds no claim that only
     the top level is checked ([SR25](../standing-rules.md#sr25)).
- **Probes**, each alone:
  - **P6-1** *Wrong*: today's loop kept, over the program's own statements. Red: the two moved rows,
    and the branch and function-body rows.
  - **P6-2** *Wrong*: the generic message for a label. Red: every label row.
  - **P6-3** *Wrong*: the guard skipped in `/reactive`. Red: each row's `/reactive` half.
- **Ships in**: `eval-forms` 0.8.0, which step 9a releases with the `eval-core` floor that has the
  export.

### Steps 7a and 7b — `eval-core` 0.15.0

- **7a** follows CONTRIBUTING's Releasing: `package.json` to 0.15.0, the `[Unreleased]` entry under its
  heading, the root `CHANGELOG.md`'s list, the register's "Work in flight", the skill's state. The built
  `.d.ts` is compared with 0.14.1's tarball: it differs by the export and by JSDoc, A27's and this
  plan's. The release is breaking by behaviour (§ 1.2 findings 3 and 5), not by shape
  ([SR12](../standing-rules.md#sr12)).
- **7b**, after the maintainer publishes: the Publication status row and the annotated tag, which
  `tools/release-tags.mjs` checks; the CHANGELOG date if npm's UTC date differs; the skill; this
  document.
- **Rows**: none. **Ships in**: 7a is the release; 7b in no package.

### Steps 8a and 8b — `eval-signals` 0.8.0

- **8a**: the peer `@zvenigora/ng-eval-core` to `>=0.15.0 <0.16.0`, in `package.json` and in every
  README line that quotes it (`public-api.spec.ts`' peer case is the witness); the README's "An `async`
  arrow's `await` is a pass-through" (`:414-418`) rewritten to § 3.2's positions and the refusal; the
  `[Unreleased]` documentation line rides along under the version's heading. A breaking minor by
  behaviour forwarded: the `.d.ts` is byte-identical to 0.7.0's.
  Before the entry says what changed, one row of each defect the release forwards runs through
  `createEvalSignal` ([SR24](../standing-rules.md#sr24)): an operand `await`, an accepted `await`, and
  the suffix.
- **8b**: as 7b.
- **Rows**: none predicted; the README's rewritten paragraph is mirrored by
  `eval-signal-async.spec.ts:1388-1412`, moved in step 4, whose comment names it.

### Steps 9a and 9b — `eval-forms` 0.8.0

- **9a**: the peers to `@zvenigora/ng-eval-core` `>=0.15.0 <0.16.0` and `@zvenigora/ng-eval-signals`
  `>=0.8.0 <0.9.0`, with the README's peer lines; the `[Unreleased]` entry from step 6 under its
  heading. The `.d.ts` differs in `guardIdentifiers`' JSDoc. One row of each forwarded defect through
  both adapters before the entry is written, as in 8a.
- **9b**: as 7b.
- **Rows**: none.

### Step 10 — Retrospect

§ 10 of this document; `CLAUDE.md`, `docs/README.md` (this plan moves to Completed tracks), the
register's "Work in flight", and the skill, which names no plan again and gets back its paragraph
that stops at § 1 while none is active, which step 1 removed and `CLAUDE.md` still describes. Each
§ 0 rule is promoted to
`standing-rules.md` or dropped with its reason. **Ships in**: no package.

---

## 5. Public API surface

- `eval-core` 0.15.0 adds one function (§ 3.3, § 8 q1). Nothing else changes shape: the visitors,
  `walkWithoutResult` and `statement-support.ts` are under `internal/visitors` or not in a barrel.
- `eval-signals` 0.8.0: none.
- `eval-forms` 0.8.0: none by shape. `guardIdentifiers` refuses more, which the CHANGELOG states as
  breaking by behaviour.

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` ([SR8](../standing-rules.md#sr8)) | Green, every step |
| `eval-core` rows | in the above | 3187 → 3250 (2) → 3252 (3) → 3259 (4) → 3288 (5), then unchanged |
| `eval-signals` / `eval-forms` rows | in the above | 444 throughout; 380, then 386 from step 6 |
| Performance | `internal/performance.spec.ts` | Green and untouched every step |
| Scope | `git status --porcelain` | The step's file list ([SR3](../standing-rules.md#sr3)) |
| Surface | the built `.d.ts` against the last tarball | Steps 7a, 8a, 9a |

## 7. Risks

| Risk | Likelihood | The criterion that fails |
| :--- | :--- | :--- |
| A mark in step 2 is wrong, so a flip goes unwitnessed | Medium | Step 2 criterion 2, against both patches |
| An accepted `await` loses or gains a hook event | Low | Step 4 criterion 2; probe P4-6 shows the rows can fail |
| The accepted set leaks across walks or roots | Medium without § 3.2's design | P4-4 and the re-rooting rows |
| A host relied on the 30 s bound | Low | The `### Breaking` line; no row can witness a host |
| A consumer relied on `[await p]` or `let x = await p; x` resolving | Low | The `### Breaking` line names both (finding 5) |
| The export and the evaluator disagree | Certain with two lists | The parity table; P5-1, P5-2 |
| A downstream row moves in an `eval-core` step unannounced | Medium (finding 1) | [SR10](../standing-rules.md#sr10): the gate's counts against § 4's table |

## 8. Open questions

Each is answered in the step named, with the answer recorded under it. All six were answered by the
maintainer at step 2's confirmation gate, on 2026-10-30, and the step that names each applies it.

1. **The D13 export's name and return shape** (step 5). § 3.3's working shape is
   `unsupportedStatement(node): { statement, message } | undefined`. Open: the name, beside `parse`,
   `extract` and `evaluate`; whether it returns the node, its type, its message, or all three; and the
   parameter type, given that `eval-core` publishes no `AnyNode` (its `AnyNodeTypes` is the union of
   type-name strings), which is why `guardIdentifiers` takes `ReturnType<typeof parse>`. That it
   reports the first refused statement, not every one, is decided.

   *Answered 2026-10-30, applied in step 5*:
   `findUnsupportedStatement(node: AnyNode | undefined): { statement: Statement | ModuleDeclaration; message: string } | undefined`.
   A verb, beside `parse`, `extract` and `evaluate`. The parameter is `evaluate`'s: acorn's `AnyNode`
   is already in the published `.d.ts` there. It returns the node, for its source positions, and
   `eval-core`'s message, so `eval-forms` quotes the message rather than copying it. Step 5 confirms
   that `eval-forms` compiles reading only `.statement.type` and `.message`, with no `acorn` import
   ([SR9](../standing-rules.md#sr9)).
2. **Whether a refused `await`'s message suggests the two-signal form** (step 4). `eval-core` knows no
   signals, and its README is the message's only context, so the default is no. The alternative is a
   neutral clause, "resolve the value first and evaluate a second expression with it", which `eval-signals`'
   README could then quote.

   *Answered 2026-10-30, applied in step 4*: no second sentence. `eval-signals`' README pairs the
   message with the two-signal form, in step 8a.
3. **The exact accepted-position rule for the walk's root when a caller passes a bare
   `AwaitExpression` node** (step 4). The decision's (a) accepts it, and § 3.2 accepts it for that
   walk only. Open:
   - whether that holds for an `AwaitExpression` that `DiscoveryService.extract` returned from an
     operand position, which a caller then evaluates alone. The working answer is yes: its value is
     the walk's result, so nothing reads the promise as an operand;
   - whether a root `ExpressionStatement` whose expression is an `await`, or a root `BlockStatement`
     that is not an arrow's body, accepts it. The working answer is no for both, as the decision lists
     neither;
   - under `extractExpressions: true`, `parse('await p')` returns the `AwaitExpression` itself, so
     (a) is what accepts it there. Step 2's group P root row is that node, so step 4 adds no row for
     it.

   *Answered 2026-10-30, applied in step 4*: all three working answers stand.
4. **Whether the per-walk table is cached** (step 4). § 3.2 builds one object per walk that has an
   accepted `await`. The alternative is a module-level `WeakMap` from the accepted node to its table,
   keyed by node identity as `exemptNodes` and `templateObjects` are; the table holds nothing but the
   node, so sharing it across walks is safe. A module-level mutable binding holding the current walk's
   `await`, and any field on `st`, are not alternatives: the first is walk state outside the state,
   and the request rules out the second. The choice is measured: the per-walk cost on
   `(async () => await p)()`, by [SR28](../standing-rules.md#sr28)'s method if `performance.spec.ts`
   cannot tell the two apart. A walk with no accepted `await` pays nothing either way.

   *Answered 2026-10-30, applied in step 4*: no cache, and no [SR28](../standing-rules.md#sr28)
   timing. The default path is unchanged, so `performance.spec.ts` covers it.
5. **`eval-forms`' message for a refused statement that is not a label** (step 6). § 3.4 has a
   working text. Open: whether it names the statement's type, `eval-core`'s message, or both, and
   whether it says that the statement may sit in code that never runs.

   *Answered 2026-10-30, applied in step 6*:

   > `Expression '<rule>': it holds a <type>, which eval-core does not evaluate (<message>). A rule is refused for it wherever it sits, in a function or branch that may never run too.`
6. **Which downstream rows A24 and A25 move beyond the one named** (steps 3 and 4). Finding 4 predicts
   none. A red row is a regression unless the step's prediction named it ([SR10](../standing-rules.md#sr10)).

   *Answered 2026-10-30, applied in steps 3 and 4*: confirmed. A downstream red row the step does not
   name is a regression, and the step stops ([SR10](../standing-rules.md#sr10)). Step 2's prototypes
   measured it: neither turns a downstream row red beside the one finding 4 names (step 2's outcome).

## 9. Contract after this lands

Written at step 10, from what the steps measured.

## 10. Retrospect

Written at step 10 ([SR7](../standing-rules.md#sr7)).
