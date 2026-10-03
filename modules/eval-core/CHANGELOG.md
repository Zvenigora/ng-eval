# Changelog — `@zvenigora/ng-eval-core`

All notable changes to `@zvenigora/ng-eval-core` are documented in this file. The other two packages in this repository keep their own, listed in the [root changelog](../../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

A heading marked "(not published to npm)" is a version that was recorded here and never published.

Versions 0.1.104–0.1.107 are on npm without entries here.

---

## [Unreleased]

---

## [0.9.0] - 2026-10-02

**A primitive receiver no longer skips the prototype-pollution guard —
[B1](../../docs/backlog-retired.md#b1).** A breaking minor. No exported symbol changes shape, but an
expression that read one of seven names off a string, number or boolean now throws.
`eval-signals` 0.2.1 and `eval-forms` 0.2.7 widen their peer ranges to admit it.

### Breaking
- **A string, number or boolean receiver is refused `constructor`, `__proto__`, `prototype`,
  `__defineGetter__`, `__defineSetter__`, `__lookupGetter__` and `__lookupSetter__`**, by dot or
  computed access, with or without `caseInsensitive`, with the error any other blocked name
  throws: `Access to dangerous property "constructor" is blocked for security reasons`. Why: the
  member visitor skipped the guard entirely for a primitive receiver, so `s.constructor` handed
  back the global `String` function — callable, `s.constructor("x")` — and `s.__proto__` handed
  back `String.prototype`, with `n.__proto__.toFixed.call(1.5, 0)` running off it. No escalation
  past that was found (every second hop to a dangerous name was already refused, and so was every
  write to a built-in prototype), but nothing an expression needs from a primitive goes through
  its constructor or its prototype.
- **Kept readable on a primitive:** `toString`, `valueOf`, `toLocaleString`, `hasOwnProperty`,
  `isPrototypeOf` and `propertyIsEnumerable`. They are on the blocklist for objects, but on a
  primitive they are ordinary reads — `s.toString()`, `n.toLocaleString()`,
  `s.hasOwnProperty("length")` work as before, as do `s.length` and `s.toUpperCase()`.
- **A case variant is not refused.** The names are matched exactly, and a primitive receiver is
  never case-corrected, so under `caseInsensitive` `s.CONSTRUCTOR` is a missing property and
  evaluates to `undefined`, as it did in 0.8.0.

---

## [0.8.0] - 2026-10-02

**`EvalContext.getKey` resolves through `get`'s own chain —
[A4](../../docs/backlog-retired.md#a4) and [A10](../../docs/backlog-retired.md#a10).** A breaking
minor. No exported symbol changes shape — the `.d.ts` differs from 0.7.0 in documentation comments
only — but `getKey`'s answers change, and with them the `key` of identifier and member read events
and the key the write visitors assign to under `caseInsensitive`. `eval-signals` 0.2.0 and
`eval-forms` 0.2.6 widen their peer ranges to admit it.

### Breaking
- **`getKey` answers what `get` resolved, and nothing when `get` finds nothing.** It used to walk
  its own copy of the resolution order, which disagreed with `get` in four ways; each is now
  `get`'s answer:
  - **A namespace is reported as the scope declares it.** With a prior scope namespaced `dog`,
    `Dog.Says()` under `caseInsensitive` reports read keys `['dog', 'says']`, where it reported
    `['Dog', 'says']`.
  - **An unbound name gets no key.** With a plain-object scope pushed, `getKey` answered every
    key as present, so a name nothing holds came back as itself; and a key held only in a source
    `get` does not read — a wrong-case key in a case-sensitive `Registry`, a key inside a
    non-global prior scope — came back spelled as that source holds it. All of these are now
    `undefined`. An identifier read still reports the name as written when `getKey` answers
    nothing.
  - **A key only a lookup resolves is reported as written**, where `getKey` returned `undefined`
    because it never consulted lookups. Under `caseInsensitive` the write visitors resolve their
    target through `getKey`, so an assignment to such a key now writes, or is refused, under its
    name: a `@zvenigora/ng-eval-signals` context's write error names `'COUNT'` rather than
    `'undefined'`.
  - **A spelling comes from the source that supplied the value.** Under `caseInsensitive` with a
    case-sensitive `Registry` holding `a`, `getKey('A')` returned `'a'` while `get('A')` found
    nothing there and went on to later sources.
- **A member of the context itself resolves through `getKey`'s answer.** Under `caseInsensitive`,
  `This.COUNT` for a key only a lookup resolves, and `This.Dog` for a namespace `dog`, evaluated
  to `undefined`: the member visitor read `get(getKey(key))`, and `getKey` answered nothing. Both
  now resolve.

### Changed
- `getKey`'s JSDoc states its answers, and two sentences in `getFromScopes` / `scopeHolding` that
  described `getKey`'s drift are corrected. Those are the whole `.d.ts` difference from 0.7.0.

---

## [0.7.0] - 2026-10-01

**Errors keep their identity, `thisArg` is applied, and three silent outcomes now throw —
[A1](../../docs/backlog-retired.md#a1), [A2](../../docs/backlog-retired.md#a2),
[A5](../../docs/backlog-retired.md#a5), [A6](../../docs/backlog-retired.md#a6) and
[A7](../../docs/backlog-retired.md#a7).** A breaking minor. No exported symbol changes shape — the
`.d.ts` differs from 0.6.1 in documentation comments only — but what several methods throw, and
the `this` some calls receive, change. `eval-signals` 0.1.4 and `eval-forms` 0.2.5 widen their
peer ranges to admit it.

### Breaking
- **Errors are no longer rewrapped.** The twelve service entry points — `EvalService`,
  `CompilerService`, `DiscoveryService` and `ParserService` — and the evaluator's call and `new`
  wrappers rethrow what they caught, where each raised a new `Error` carrying only the message. A
  custom error keeps its class, `stack`, `cause` and properties, so `instanceof` works; a syntax
  error is acorn's `SyntaxError`, with `pos` and `loc`. Messages lose the prefixes a throw used to
  get: `Function call error: ` from inside a called function, and `Constructor error: ` from
  inside a constructor. A thrown non-`Error` value propagates as thrown, where `CompilerService`
  replaced it with a fixed message (`'call'`, `'error in compile'`, `'error in callAsync'`). Code
  that matched a prefix or the message should select on the error itself.
  [A5](../../docs/backlog-retired.md#a5), [A6](../../docs/backlog-retired.md#a6).
- **A synchronous throw under `await` throws synchronously.** `await obj.__proto__` became a
  rejected promise: `simpleEval` and `eval` returned it instead of throwing, and the walk went on
  with the operand still open. It now throws from the sync entry points, and `evalAsync` rejects
  with the original error. An asynchronous rejection still carries ` at position <start>-<end>`.
  Hooks see a failed walk: the operand and the `await` close with `completed: false` and an
  `error`, where the operand used to close with no `error`.
  [A1](../../docs/backlog-retired.md#a1).
- **Destructuring assignment throws instead of silently doing nothing.** `[a, b] = arr` and
  `({ m } = o)` returned `undefined` and left the context unchanged. They now throw
  `Unsupported assignment target: ArrayPattern` / `ObjectPattern`, before either side is
  evaluated. [A2](../../docs/backlog-retired.md#a2).
- **`(a)++` works under `preserveParens`**, and so do `(a) = 1` and `(o.x)++`: a parenthesised
  write target is unwrapped. Each used to push no value, so the nodes around it read the wrong
  operands. Any other unsupported update target throws `Unsupported update target: <type>`.
  [A2](../../docs/backlog-retired.md#a2).
- **`EvalScopeOptions.thisArg` is applied.** A method called on a scope's own object —
  `cat.action()` through the namespace `cat` — receives the scope's `thisArg` as `this`, and
  `this.fn()` receives the `thisArg` of the prior scope that supplies `fn`. With no `thisArg`,
  `cat.action()` still receives the scope's object. `cat` itself still evaluates to the scope's
  object, and `cat.x` reads and writes it, not `thisArg`. `EvalContext.getThis` answers with
  that `thisArg`, and answers `undefined` for a key only a lookup resolves, where it returned the
  lookup function: `this.fn()` for such a key now receives the context. The README's Scopes
  example now uses a `thisArg` other than the scope's object.
  [A7](../../docs/backlog-retired.md#a7).

### Changed
- **The README says options-first calls cannot read collected hook errors, by design.**
  `simpleEval(expr, context, { hooks })` never hands back its state: read `state.hookErrors`
  after `createState` and `eval`, or set `onHookError: 'throw'` on the `EvalHooks` you pass.
  Decided rather than built: [E5](../../docs/backlog-retired.md#e5).
- **`LICENSE` ships in the package**, which declared `"license": "MIT"` and shipped no file.

---

## [0.6.1] - 2026-09-30

**A patch: two manifest-and-hygiene fixes, [F5](../../docs/backlog-retired.md#f5) and
[B3](../../docs/backlog-retired.md#b3), a dead line removed, and a README correction.** No
published symbol is added and none changes shape. `eval-signals` 0.1.3 and `eval-forms` admit it
unchanged: both declare `>=0.3.0 <0.7.0`.

### Changed
- **The `js-sha256` peer range is widened** from `^0.10.1` to
  `^0.10.1 || ^0.11.0 || ^0.12.0 || ^1.0.0`. On `0.x` a caret range admits only its own minor, so
  a project already on `js-sha256` 1.0.0, the current `latest`, got an npm peer warning naming this
  package. No code changed; tested against 0.10.1 and 1.0.0. [F5](../../docs/backlog-retired.md#f5).
- **`ParserService` no longer logs when its periodic cleanup clears the parse cache.** The
  `console.debug('Parser cache cleared to prevent memory leaks')` is gone; the cache is still
  cleared on the same condition. The published bundle now makes no `console.*` call.
  [B3](../../docs/backlog-retired.md#b3).
- **Built with Angular 22.1.** The published `.d.ts` declares each service's `ɵprov` as
  `ɵɵInjectableDeclaration<any>`, where 0.6.0, built with Angular 22.0, declared it with the
  service's own type (`ɵɵInjectableDeclaration<ParserService>`, and so on for `EvalService`,
  `CompilerService` and `DiscoveryService`). This is Angular's generated injection metadata, not
  this package's API, and those four lines are the whole `.d.ts` difference from 0.6.0.
- **`CHANGELOG.md` now ships in the package**, beside `README.md`. Its links into the repository's
  `docs/` resolve on GitHub, not on npm.

### Fixed
- **The `import()` visitor's dead `afterVisitor` call is removed.** It followed an unconditional
  throw, so it never ran. Behaviour is unchanged; the bundle loses that one line.
  [A3](../../docs/backlog-retired.md#a3).
- **The README no longer presents `EvalScopeOptions.thisArg` as applied.** `thisArg` is accepted
  and is not currently applied: a method reached through a scope's namespace, such as
  `cat.action()`, is called with the scope's own object as `this`, whatever `thisArg` holds.
  Nothing changes at runtime; the README's Scopes section now says this. What `thisArg` should
  mean is open, as [A7](../../docs/backlog-retired.md#a7), and answering it changes a call's receiver.

---

## [0.6.0] - 2026-09-26

**The trace bound, [A12](../../docs/backlog-retired.md#a12), and `EvalService`'s lifecycle,
[A8](../../docs/backlog-retired.md#a8) with [A20](../../docs/backlog-retired.md#a20), [A21](../../docs/backlog-retired.md#a21) and
[B3](../../docs/backlog-retired.md#b3).** A **minor** rather than a patch: it adds four published symbols and
changes the shape of none, and this repository has never shipped API in a patch. It does withdraw
one documented behaviour, `EvalService.ngOnDestroy` clearing your hook registries, and
*Upgrading* says what to do instead. `eval-signals 0.1.3` and `eval-forms 0.2.3` below widen
their peer ranges to admit it.

### Added

- **`maxTraceItems`**, an evaluation option bounding how many entries `EvalResult.trace` keeps.
  Defaults to **10,000** — roughly 0.5 MB. The **head** is kept in order, so `trace[0]` is still
  the first value the walk pushed.
- **`EvalResult.traceTruncated`** — `true` once a push has actually been **dropped**, and it
  stays true until `clearTrace()`. A walk of exactly `maxTraceItems` pushes leaves it `false`,
  because nothing was lost. No entry is appended to the trace to mark truncation: every row in it
  describes a real node. Under `maxTraceItems: 0` it also stays `false` — that is tracing turned
  off, not a trace that lost something.
- **`EvalResult.tracePushCount`** — every push the state made since it was built or last
  cleared, which is the number the trace no longer tells you once it is truncated. Accurate even
  when tracing is off.
- **`EvalResult.clearTrace()`** — the only reset for the trace and both counters. It empties the
  array **in place**, so a consumer holding `state.result.trace` keeps a live reference rather
  than a stale snapshot.
- `EvalResult.addTraceBounded` and `EvalState.maxTraceItems`. These are `@internal`-tagged:
  supported for this library's own use, not part of the contract, and not counted in the four
  above. They are nonetheless reachable on published classes, so they are listed rather than
  hidden.

### Changed

- **`EvalResult.trace` stops growing past 10,000 entries by default**. It gained an
  entry per pushed value and was reset by nothing, so a loop's trace grew as iterations × nodes:
  700,007 entries and ~34 MB for a 100,000-iteration loop — which the default `maxIterations`
  does not stop, since it charges exactly its budget and completes. Where the budget *does* stop
  a loop, the whole allocation was paid *before* the throw. The budget bounded time; nothing
  bounded the memory.
- **`EvalTraceItem.start` and `end` are documented as reserved**
  ([A16](../../docs/backlog-retired.md#a16)). Nothing has ever set either field. Their JSDoc now says so, and
  points at `expression` and `EvalState.nodeTimings` for the source text and timing they appear
  to offer. Documentation only — both fields keep their optional `number` type — but the JSDoc
  ships in the `.d.ts`.
- **⚠️ `EvalService.ngOnDestroy` no longer clears any hook registry, and drains nothing**
  ([A8](../../docs/backlog-retired.md#a8)). **This withdraws documented behaviour.** From 0.3.0
  to 0.5.0, destroy cleared the value stack, the hook registrations and the hook bookkeeping of
  every state the service had built, and that included an `EvalHooks` registry you passed through
  `options.hooks`. It follows from the fix below: the service now keeps no state, so at destroy
  there is none for it to reach. It marks the service destroyed, so later calls throw, and does
  nothing else. This is a trade. Keeping the clear would mean the service keeping those states,
  or their registries, until destroy, and that is the leak being fixed. The cost falls only on
  what you keep past the root injector. That means a registry with a hook on it that keeps a
  state, or a `createState` state whose hook bookkeeping you relied on destroy to reset.
  *Upgrading* says what to do instead. The `hooks` JSDoc, which ships in the `.d.ts`, and the
  README no longer make the promise.
- **`EvalService.ngOnDestroy` no longer logs to `console.warn`**
  ([B3](../../docs/backlog-retired.md#b3)). The warn reported a drain that threw, and there is no drain.

### Upgrading

**No expression result changes.** `eval`, `simpleEval` and their async forms return
byte-identical values. What changes is two surfaces around the result:

- **Diagnostics.** `EvalResult.trace` is bounded where it was not ([A12](../../docs/backlog-retired.md#a12)).
- **`EvalService`'s lifecycle: what it keeps, and what `ngOnDestroy` touches.** The service no
  longer keeps anything you pass it or anything it hands back. That means no state, whether from
  `simpleEval`, `simpleEvalAsync` or `createState`, and no context ([A8](../../docs/backlog-retired.md#a8),
  [A20](../../docs/backlog-retired.md#a20)). Each is collectable once you drop it. `ngOnDestroy` marks the
  service destroyed and does nothing else. It drains no state, empties none of your registries
  or contexts ([A21](../../docs/backlog-retired.md#a21)), and no longer logs ([B3](../../docs/backlog-retired.md#b3)).

The first is covered by the trace paragraphs below. For the second, two changes can ask
something of you, and the next two paragraphs say what: the hook registries destroy no longer
clears, and the hook bookkeeping it no longer resets.

**If you relied on `EvalService.ngOnDestroy()` to clear an `EvalHooks` registry you passed
through `options.hooks`**, it no longer does, whichever method you passed it to
([A8](../../docs/backlog-retired.md#a8)). From 0.3.0 to 0.5.0, the `hooks` JSDoc said:

> `EvalService.ngOnDestroy` empties the registries of the states it created, this one included,
> so that a registry outliving the service cannot keep those states and their AST nodes
> reachable.

The README said the same. You are affected only if the registry outlives the root injector
**and** a hook on it keeps a state. That covers a hook that captures one
(`hooks.on('after', '*', () => state)`), one that stores the events it receives or
`event.state`, and a `createDependencyTracker` installed on it, which stores them in `reads`. In
that case, those states and their contexts now live as long as the registry does. **Release it
yourself** when you are done with it, in the teardown that owns the registry, such as your
component's `ngOnDestroy` or a `DestroyRef.onDestroy` callback. Call the unsubscribe that `on` /
`onRead` returned, or `hooks.clear()`.

**If you keep a state from `createState` past the root injector**, destroy no longer resets its
hook bookkeeping: the errors in `hookErrors`, and any frame a walk left open. 0.5.0 reset both,
and cleared the state's value stack. If you relied on that, call `state.resetHookBookkeeping()`
yourself. The trace was never part of it. 0.5.0's destroy did not clear the trace, and
`clearTrace()` is new in this release.

**If you read `EvalResult.trace` programmatically**, two things to check. Above 10,000 pushes on
one state it now stops, and `traceTruncated` is how you detect that — a truncated trace is
otherwise indistinguishable from a complete one. And the trace spans every evaluation run on a
state, so the bound is on their **total**; `clearTrace()` is how the `createState` + repeated
`eval` style gets a trace describing one walk.

**Two values are honoured rather than treated as falsy**: `maxTraceItems: 0` disables tracing
while keeping `tracePushCount` accurate, and `Infinity` restores the previous behaviour exactly.

### Fixed

- **`EvalService.ngOnDestroy` no longer empties your registries**
  ([A21](../../docs/backlog-retired.md#a21)). It called `clear()` on every context with a `type` passed to
  `createState`, `simpleEval` or `simpleEvalAsync`, including one nested under a `context`
  key. So when the root injector was destroyed, in a test, per SSR request or at a
  micro-frontend's teardown, every `Registry` the application had evaluated against was emptied,
  even though the application still held it. It also called a `clear` method on any other object
  passed in that had a `type` key and declared one, a caller's `EvalContext` subclass included. It
  now changes nothing inside them, and since the two entries below it holds no reference to them
  either. No exported symbol changes.
- **Under `caseInsensitive`, a context object with a `type` field is no longer kept alive by
  `EvalService`** ([A20](../../docs/backlog-retired.md#a20)). `createState`, `simpleEval` and
  `simpleEvalAsync` added every context with a `type`, including every `Registry` and
  `EvalContext`, to a set that nothing read and that emptied only when the service was destroyed.
  The set is gone. On its own that changed only one case. Under `caseInsensitive`, a plain object
  or class instance is copied into a new `Registry` rather than adopted, so the set was the only
  thing holding the original. It can now be garbage-collected once you drop it. Every other
  context is released by the next entry, which removes the evaluation states that held them.
  No exported symbol changes.
- **`EvalService` no longer keeps any evaluation state until the application ends**
  ([A8](../../docs/backlog-retired.md#a8)). It added every state it built, through `simpleEval`,
  `simpleEvalAsync` or `createState`, to a set that emptied only in `ngOnDestroy`. So each
  state was kept for the life of the root injector, including one you had finished with and
  dropped. That meant the parsed expression, the trace (up to `maxTraceItems`), and the context
  you passed, with everything reachable from it. The pattern `eval-signals` documents,
  `simpleEval(expr, createSignalContext(...))`, kept each signal context and the signal sources it
  reads. The set is gone. A state from `simpleEval` or `simpleEvalAsync` is collectable when the
  call returns, including a call that throws or a promise that rejects. One from `createState` is
  collectable once you drop it. Either way your context goes with it, once nothing else holds it.
  No exported symbol changes. The one documented behaviour this withdraws, destroy clearing your
  hook registries, is under *Changed* and *Upgrading*.

---

## [0.5.0] - 2026-09-17

### Fixed

- **Object destructuring now binds the names JavaScript binds.** `evaluateObjectPattern` took
  the binding name from the pattern's **key** and then resolved the pattern's **value** as an
  *expression* against the source object. For `{ a: b }` that resolved the identifier `b`
  against the source and bound the name `a` to whatever came back — both halves wrong at once,
  where JavaScript binds `b` to `src.a`. Shorthand `{ a }` hid it, because `key` and `value`
  both name `a`, so resolving the wrong one landed on the right answer.

  Affected, through **both** arrow parameters and `let`/`const` declarations:

  | Pattern | before | now |
  | ------- | ------ | --- |
  | `{ a: b }` — read `b` | `undefined` | the source's `a` |
  | `{ a: b }` — read `a` | the source's `b`, when it had one | not bound |
  | `{ a: x, b: y }` | neither bound | both bound |
  | `{ a: { b } }` | nothing bound | the inner `b` |
  | `{ a: { b: z } }` | nothing bound | the inner `b` |
  | `{ "a": q }` | `undefined` | the source's `a` |
  | `{ ["a"]: q }` | `undefined` | the source's `a` |

  **Most consumers saw `undefined` rather than a wrong value.** The wrong-value case needs the
  renamed-*to* name to exist on the source as well — `{ a: b }` over a source carrying both
  `a` and `b` — and otherwise the value name resolves to nothing. If you inverted a rename to
  work around this, remove the inversion.

  Shorthand `{ a }` and array patterns were correct and are unchanged. Defaults (`{ a = 1 }`)
  continue to throw `AssignmentPattern is not supported as a binding target.`

- **A computed key is now evaluated.** `{ [keyName]: q }` parses with `key` an `Identifier`,
  and the branch order tested `Identifier` before `computed` — so the key was taken to be the
  *name it is spelled with* and the source was read at `src.keyName` instead of at
  `src[keyName]`. The literal form `{ ["a"]: q }` hid it, a `Literal`'s value being its own
  key. Computed keys are evaluated in the enclosing scope, as in JavaScript.

- **An object rest element now binds the remainder.** `{ a, ...r }` bound the **whole** source
  to `r`, leaving a key a sibling property had already taken: `(({a, ...r}) => r.a)(src)` was
  the source's `a` and is now `undefined`. Keys are excluded by their **source** name, so
  `{ a: x, ...r }` removes `a`. Array rest was already correct. This is the one item here
  whose old answer was a real value rather than `undefined`, so it is the one a consumer may
  have been reading without knowing.

### Changed

- **`evaluateObjectPattern` no longer pushes a scope.** It pushed the source so the value
  could be resolved against it, which was the defect above; the value is now bound as a
  pattern and nothing reads a scope. No consumer-visible behaviour depends on this, but it
  means `pattern.ts` is no longer one of the visitors the `BL-A9` push/pop idiom applies to.

- **The prototype-pollution blocklist now applies to the source key on the way in.**
  `{ __proto__: p }` and `{ constructor: { x } }` are rejected before the source property is
  read, rather than at the binding write — which is what keeps the guard in front of a nested
  pattern, where a plain read would have handed `Function` to the recursion. The rejection and
  its message are unchanged for every form that already threw.

### Upgrading

`0.5.0` is a minor rather than a patch because expression **results change** on the paths
above: a consumer on `^0.4.0` does not receive it unattended, and should re-run their own
expression tests when they take it. The two downstream packages widen their peer range to
admit it in the same change — `eval-signals 0.1.2` and `eval-forms 0.2.2` below — which is
what `@nx/dependency-checks` requires of a workspace release, and neither carries any other
change.

---

## [0.4.0] - 2026-09-15

Phase 2 of the [roadmap](../../ROADMAP.md): **statement support**. `let` and `const` declarations,
blocks, `if`/`else` and the classic three-part `for` now evaluate as statements, with JavaScript's
completion-value semantics. Design, measurements and the questions it settles are in
`docs/statements/phase-2-plan.md`; the retrospect is in `docs/statements/summary.md`.

**Read the Changed section before upgrading.** Statements were never *unsupported* — they were
walked as expressions and silently mis-evaluated, so this release changes what a dozen already-working
expressions return, and rejects a dozen more that used to return a value. If your expressions are
single expressions (`a + b * c`, `user.name`, `items.filter(…)`), nothing here reaches you.

### Added

- **Seven statement node types**: `Program`, `ExpressionStatement`, `EmptyStatement`,
  `BlockStatement`, `VariableDeclaration` (`let` / `const`), `IfStatement` and `ForStatement`.
  Blocks introduce a scope; declarations bind into it and do not write the caller's context object.
- **`EMPTY_COMPLETION`**, exported. A statement that produces no value — a declaration, an `if`
  that takes no branch, a `for` that runs zero iterations — pushes this sentinel rather than
  `undefined`, because JavaScript's completion-value semantics keep the last *non-empty* value and
  empty is not `undefined`. It never leaves an evaluation's return value, but an `after` hook on a
  statement node fires before the conversion and **will** see it, so it is exported for identity
  comparison on the precedent of `ASYNC_HOOK_MESSAGE`. See the
  [package README](README.md#statements-and-the-empty-completion-sentinel).
- **`maxIterations`** on `EvalOptions`, defaulting to **100,000** iterations per evaluation.
  Exceeding it raises `Iteration budget exhausted after <n> iterations`. The budget is per
  outermost `eval` call and shared by every loop in the expression. It bounds **time, not memory**:
  `result.trace` grows per pushed value and that allocation is paid before the throw.
- **`EvalContext.setInScope`**, and `EvalContext.scopeHolding` promoted from private — a write
  needs the scope, not a yes/no, because `const` kinds are keyed by scope.
- `EvalHooks.pushWalkBase` / `popWalkBase` / `walkBase`, and `EvalState.walkDepth` / `enterWalk` /
  `exitWalk` / `iterationsRemaining` / `chargeIteration` / `declareConst` / `isConstBinding`. These
  are `@internal`-tagged: supported for this library's own use, not part of the contract. They are
  nonetheless reachable on published classes, so they are listed rather than hidden.

### Changed

**Every row below was transcribed from `statement-semantics.spec.ts` and the step-6 audit, both
run against 0.3.0 and 0.4.0 — not from the design document.**

Expressions that returned a value and now return a **different** value:

| Expression | 0.3.0 | 0.4.0 |
| ---------- | ----- | ----- |
| `let x = 1` | `1` | `undefined` |
| `let x = 1; x + 1` | `NaN` | `2` |
| `const y = 2; y` | `undefined` | `2` |
| `if (a) { 1 } else { 2 }`, `a` truthy | `2` | `1` |
| `if (a) { 1 }`, `a` falsy | `1` | `undefined` |
| `for (let i = 0; i < 3; i++) { i }` | `NaN` | `2` |
| `let [p, q] = arr` | the array | `undefined`, and `p` / `q` are now bound |

Expressions that returned a value and now **throw**:

| Expression | 0.3.0 | 0.4.0 |
| ---------- | ----- | ----- |
| `while (false) { 1 }` | `1` | `Unsupported statement type: WhileStatement` |
| `do { 1 } while (false)` | `1` | `Unsupported statement type: DoWhileStatement` |
| `for (const k in o) { k }` | `undefined` | `Unsupported statement type: ForInStatement` |
| `for (const v of arr) { v }` | `undefined` | `Unsupported statement type: ForOfStatement` |
| `switch (1) { case 1: 2 }` | `2` | `Unsupported statement type: SwitchStatement` |
| `try { 1 } catch (e) { 2 }` | `2` | `Unsupported statement type: TryStatement` |
| `throw 1` | `1`, throwing nothing | `Unsupported statement type: ThrowStatement` |
| `x: 1` | `1` | `Unsupported statement type: LabeledStatement` |
| `break` / `continue` in a loop body | `undefined` | `Unsupported statement type: …` |
| `function f() { return 1 }` | `1` | `Unsupported statement type: FunctionDeclaration` |
| `class C {}` | `undefined` | `Unsupported statement type: ClassDeclaration` |
| `var x = 1` | `1` | `Unsupported variable declaration kind: var` |
| `const y = 1; y = 2; y` | `2` | `Assignment to constant variable "y".` |
| `let { a = 1 } = o; a` | `undefined` | `AssignmentPattern is not supported as a binding target.` |
| `(toString => toString)(1)` | `1` | `Access to dangerous property "toString" is blocked…` |

**The messages above are the ones raised at the top level.** A throw from inside a called arrow
function is re-wrapped, so `(toString => toString)(1)` is caught as
`Function call error: Access to dangerous property "toString" is blocked for security reasons`, and
an unsupported statement inside a block-bodied arrow as
`Function call error: Unsupported statement type: …`. Match on a substring rather than on the start
of the message.

The last row is the widest of them: binding writes now share the prototype-pollution blocklist with
every other write site, so all thirteen blocked names are rejected as **arrow function parameters**
too — a form that has nothing to do with declarations. Only `__proto__` is an actual write vector;
the rest is kept wide so that "is this name blocked?" does not depend on which visitor reached it.

**This is a change of kind, not only of coverage.** Before 0.4.0 an unsupported statement was handed
to `acorn-walk`'s base walker, which walked the subtree as an expression and left whatever it pushed
on the value stack — which is why `throw 1` evaluated to `1` and threw nothing. There is now an
explicit dispatcher whose `default` raises.

Expressions whose **value is unchanged** and whose stranded-value count is not — listed because the
values above make it reasonable to assume otherwise:

| Expression | 0.3.0 | 0.4.0 |
| ---------- | ----- | ----- |
| `1 + 2` | `3`, 0 stranded | unchanged |
| `1; 2; 3` | `3`, **2 stranded** | `3`, 0 stranded |
| `a; b` | `'B'`, **1 stranded** | `'B'`, 0 stranded |
| `{ 1; 2 }` | `2`, **1 stranded** | `2`, 0 stranded |
| `(x => { 1 })(0)`, `(x => { 1; 2 })(0)`, `(x => { })(0)` | `1` / `2` / `undefined` | unchanged |
| `(x => { if (true) { 1 } })(0)` | `1` | `1` |

A "stranded" value is one the walk pushed that nothing popped, visible as `result.stack.length` after
an evaluation returns. It was never read, so the value was right by accident; it is now right by rule.

Other behavioural changes on already-shipped paths:

- **A write to a bare identifier consults the scope stack before the caller's context object.**
  `(x => (x = 99))(1)` used to write `99` into the caller's own context and leave the arrow's
  parameter untouched; it now writes the parameter. This is what makes `for`'s `i++` work.
- **A block-bodied arrow's body goes through the statement dispatcher.** Completion values are
  unchanged for every supported form (the table above), but an unsupported statement inside a block
  body now throws where the base walker previously evaluated it:
  `(x => { while (false) { 1 } })(0)` was `1`. In the other direction,
  `(x => { let y = 1; y })(0)` was `undefined` and is now `1`.
- **`EvalHooks.exit` bounds its scan to the current walk**, so a nested walk can no longer flush
  frames belonging to the walk that contains it.
- **A throwing arrow body no longer strands a scope on a reused `EvalContext`.** Both scope-push
  sites now pop in a `finally`. Before this, one throwing evaluation left a scope that shadowed a
  source key for the life of the context — and a context is reused by design in
  `@zvenigora/ng-eval-signals`. `docs/backlog.md` A9.
- **`result.trace` and the `after`-hook stream gain `Program` and `ExpressionStatement` entries on
  every evaluation**, including single-expression ones. Code that counts hook events or trace
  entries sees two more per walk.
- The visitor table is built once and frozen at first use rather than merged per `evaluate` call.
  Every evaluation is faster; the table is process-wide shared state.

### Fixed

- `pattern.ts` no longer writes the whole `EvalState` to the console on a destructuring path
  (`docs/backlog.md` B2). Three `console.*` calls remain in the published bundle, tracked as B3.

### Upgrading alongside `eval-signals` and `eval-forms`

**Upgrade both downstream packages with it**: `eval-signals` **0.1.1** and `eval-forms` **0.2.1**,
released alongside this one and documented above. `eval-signals` 0.1.0 and `eval-forms` 0.2.0
declare `"@zvenigora/ng-eval-core": "^0.3.0"`, which resolves to `>=0.3.0 <0.4.0` and therefore
**excludes** this release; installing 0.4.0 beside either of them raises a peer-dependency
conflict. The two patch releases widen the range and change nothing else.

Neither package was ever *incompatible* with 0.4.0 — both suites run against this evaluator on
every build and are green — so what the conflict reported was a declared range that had not caught
up. Both continue to support `eval-core` 0.3.0.

### `@zvenigora/ng-eval-signals` — one relaxation, no release

`eval-signals` is **not** re-released and its version is unchanged at 0.1.0; this is what its
existing code does once it resolves `eval-core` 0.4.0.

A signal context rejects writes to its keys with `SignalContextWriteError`. Because writes now
consult the scope stack first, **a write to a binding the expression itself created no longer
throws** — it mutates nothing the consumer owns. Measured, with `count` a signal in the source:

| Expression | with `eval-core` 0.3.0 | with `eval-core` 0.4.0 |
| ---------- | ---------------------- | ---------------------- |
| `count = 5` | throws `SignalContextWriteError` | **unchanged** — still throws |
| `(x => (x = 5))(1)` | throws `SignalContextWriteError` | `5` |
| `let count = 5; count` | n/a — statements did not evaluate | `5`, and the source's `count` is still `1` |

The read-only guarantee is intact: it covers the keys of the signal context, and an expression's own
bindings were never among them. This is a prerequisite for `for`'s `i++` to work inside a signal.

---

## [0.3.0] - 2026-08-10

Phase 1 of the [roadmap](../../ROADMAP.md): a generic evaluation hook API, the prerequisite for the planned `eval-signals` and `eval-forms` libraries. Design and rationale in `docs/side-effects/phase-1-plan.md`; consumer documentation in the [package README](README.md#evaluation-hooks).

### Added
- **Evaluation Hooks (`EvalHooks`)**: A node-type-keyed hook registry with wildcard (`'*'`) support, reached through `EvalState.hooks`. `on('before' | 'after', type, hook)` fires around each visitor body and returns an unsubscribe; every one of the 19 visitors dispatches through it. Registration is per-`EvalState`, so hooks never leak between evaluations even though `EvalService` is `providedIn: 'root'`.
- **Read Hooks (`onRead`)**: Fire once per resolved context read, reporting the key **as the context resolved it** — case-corrected under `caseInsensitive`, and exact for computed members — which the AST node alone cannot provide. Events carry `kind`, `key`, `target`, `value`, a best-effort dotted `path`, and `scoped`, which flags a read that resolved to a scope pushed *during* the evaluation (an arrow-function parameter) rather than a real dependency.
- **Built-in hooks**: `createDependencyTracker()` yields a resettable dependency set per evaluation, filtering scoped reads and any path rooted at one; `createTimingHook()` accumulates per-node-type timings.
- **`trackTime` option**: Accumulates per-node-type timings on the state, read back as `EvalState.nodeTimings`. Note this registers a hook, so it makes the walk dispatch per node; `EvalResult.duration` remains the free walk-level total.
- **Hook error policy**: `onHookError` selects `'collect'` (default — a faulty hook cannot break the evaluation it observes), `'throw'`, or `'ignore'`. Collected errors are read from `EvalState.hookErrors`. `ASYNC_HOOK_MESSAGE` is exported so a hook that returned an un-awaited promise can be told apart from an error the hook itself threw.
- **`EvalState` members**: `hooks`, `hasHooks`, `hookErrors`, `nodeTimings`, and `resetHookBookkeeping()`.
- **`EvalContext` queries**: `getFromScopes()` and `hasInScopes()`.

### Changed
- **⚠️ `EvalHookError.phase` widened to `EvalHookPhase | 'read'`**: **The one non-additive change in this release.** Read hooks report errors through the same channel as node hooks, so the phase is no longer just `'before' | 'after'`. Nothing shipped before this version, so no released shape is broken — but a `switch (e.phase)` written against the two-value type will not be exhaustive, and this note is here so that is discovered by reading rather than at runtime. Everything else in this release is purely additive.
- **Hook dispatch is balanced across throws**: `before`/`after` stay paired on every exit path, including the ones an exception takes. A synthesised `after` carries `completed: false` and no `value`, from two distinct sources — the unwinder, which supplies the `error`, and an enclosing visitor closing without its child, which supplies **no** error on an evaluation that may still succeed. **Presence of `error` is the discriminator**, not `completed === false`.
- **`ngOnDestroy` releases hook state**: `EvalService` now clears each tracked state's hook registrations and resets its hook bookkeeping, so a long-lived caller-owned registry cannot pin destroyed states or their AST nodes. This covers the states `EvalService.createState` produced — the ones the service tracks. States built elsewhere (`CompilerService.createState`, or `EvalState.fromContext` directly) are not tracked and are not cleared, so this is not a general guarantee about every state in an application.

### Deprecated
- **`RecursiveVisitorState` and `RecursiveVisitorResult`**: Superseded by `EvalHooks` / `EvalState` / `EvalResult`. Nothing in the library implements them, and shipping them beside the new API would publish two contradictory hook vocabularies: their `beforeVisitors` / `afterVisitors` entries are typed to return `number | undefined` — the last trace of a timing stub the library no longer has — while `EvalNodeHook` mandates `void`. Both remain exported so this release stays additive; removal is a follow-up for the next breaking version.

---

## [0.2.5] - 2026-08-03 (not published to npm)

### Changed
- **Nx Monorepo Upgrade**: Migrated Nx tooling from **v22.1.3** to **v23.1.1**, bringing Angular to **v22.0.8**, TypeScript to **v6.0.3**, and Jest to **v30.3.0**. Ran the full `nx migrate` flow (47 automatic codemods) plus the migrations Nx deferred to manual review.
- **ESLint v9 Flat Config**: Converted `.eslintrc.json`/`.eslintignore` to `eslint.config.mjs` at the root and in `eval-core`, replacing the generator's `FlatCompat` shims with flat-native config (the Angular inline-template shim was fully redundant with `@nx/eslint-plugin`'s `flat/angular` preset).
- **Inferred Nx Targets**: Converted the `eval-core` project's `lint` and `test` targets from the deprecated `@nx/eslint:lint` / `@nx/jest:jest` executors to Nx's inferred targets (`@nx/eslint/plugin`, `@nx/jest/plugin` registered in `nx.json`), removing the executor deprecation warnings scheduled for Nx v24.
- **Angular Change Detection**: Applied Angular v22's `change-detection-eager` migration, adding an explicit `ChangeDetectionStrategy.Eager` to `EvalCoreComponent` to preserve its pre-v22 default behavior.

### Fixed
- **Jest `isolatedModules`**: Removed from `eval-core`'s `tsconfig.spec.json` after confirming it broke typecheck (TS1205 on re-exported types) and isn't needed for this single-project workspace.

---

## [0.2.4] - 2026-08-02 (not published to npm)

### Note
- Version bump with no recorded changelog entry at the time; folded into the [0.2.5] migration work above.

---

## [0.2.3] - 2026-08-01 (not published to npm)

### Added
- **Repository Audit & Remediation Plan**: Comprehensive documentation detailing codebase audit (`docs/repository-audit.md`) and remediation execution steps (`docs/remediation-plan.md`).
- **Archive Script**: Command script (`ng-eval-archive.cmd`) for project archiving (`2026-01-02`).

### Fixed
- **Dependency Security**: Added package overrides for `qs` dependency resolving security vulnerabilities in `package-lock.json` (`2026-01-02`).
- **Angular Peer Dependencies**: Cleaned up `peerDependencies` in `@zvenigora/ng-eval-core` by removing unused `@angular/common` dependency (`2026-08-01`).
- **Angular Dependency Injection**: Refactored `CompilerService`, `DiscoveryService`, and `EvalService` to use Angular's modern `inject()` functional dependency injection paradigm (`@angular-eslint/prefer-inject`).
- **Repository Hygiene**: Removed loose root debug scripts (`debug-ast.js`, `debug-proto.js`, `debug-prototype.js`) and cleaned up stale notes.

---

## [0.2.2] - 2025-11-30

### Changed
- **Angular Framework Upgrade**: Upgraded Angular framework and dependencies to **v20.x** (v20.1.2 / Angular 20).
- **Nx Monorepo Upgrade**: Updated Nx tooling to **v22.x** (`22.0.0-beta.6`).
- **ESLint & Guidelines**: Updated ESLint rules and guidelines for Nx workspace compatibility (`AGENTS.md`).

### Fixed
- **Repository URL**: Standardized repository URL format across `package.json`.

---

## [0.2.1] - 2025-11-30

### Added
- **Angular 19 Support**: Updated peer dependencies across packages to officially support Angular 19+ (`>=19.0.0`).
- **Nx Tooling**: Upgraded build tooling to **Nx 21.4.0** and **Angular 19.2.14** (`2025-08-20`).

### Fixed
- **ESLint Compliance**: Resolved ESLint errors following the Angular 19 migration.
- **Documentation**: Enhanced README descriptions and added automated attribution notes.

---

## [0.2.0] - 2025-08-20 (not published to npm)

### Added
- **LRU Property Lookup Caching**: Implemented LRU cache for property lookups, optimizing lookup performance from $O(n)$ to $O(1)$.
- **Enhanced Visitors**: Refactored `MemberExpressionVisitor` with cached property lookups and case-insensitive resolution.
- **Security Hardening**:
  - Comprehensive prototype pollution prevention (`__proto__`, `constructor`, `prototype` protections).
  - Call expression execution security and strict scope boundary enforcement.
  - Enhanced binary expression type safety and arithmetic error handling.
  - Safe, guarded asynchronous expression evaluation and stack error tracking.
- **Memory Management**: Cross-platform memory manager compatibility and leak fixes.
- **Performance Test Suite**: Added benchmark validation test suite ensuring 100% regression-free performance across all 511 unit tests.

---

## [0.1.102] - 2024-01-03

### Added
- **Expression Support**: Added support for arrow function expressions, update expressions, assignment expressions, object expressions, template literals, tagged templates, `new` expressions, `this` binding, logic expressions, arrays, and unary operations (`2023-12`).
- **AST Parsing & Caching**: Added caching mechanisms to `ParserService` utilizing `js-sha256` hashing and Acorn parser integration (`2023-12-02`).
- **Evaluation State & Trace**: Introduced `EvalState`, `EvalContext`, `EvalOptions`, `EvalResult`, and evaluation trace logging.
- **Case-Insensitive Evaluation**: Added optional case-insensitive property lookup support across scope registries.
- **Documentation**: Documented visitor pattern, evaluation functions, core services, and common AST model classes (`docs/`).

---

## [0.1.0] - 2023-11-26 (not published to npm)

### Added
- **Initial Commit**: Core `@zvenigora/ng-eval-core` library initialization and basic AST evaluation engine (`2023-11-26`).
- **Angular Integration**: Basic Angular services and Angular plugin integration setup.
- **Public API**: Initial release of scope, parser, and visitor architecture.
