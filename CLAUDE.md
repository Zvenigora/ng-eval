# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Nx monorepo containing two publishable Angular libraries under `modules/`:

- **`@zvenigora/ng-eval-core`** (`modules/eval-core`) — a JavaScript expression
  parser/evaluator built on `acorn` + `acorn-walk`, exposed as Angular DI services. At
  0.3.0, not yet published to npm. This is where nearly all the code is.
- **`@zvenigora/ng-eval-signals`** (`modules/eval-signals`) — expression → Angular
  `Signal`, built on the first library's published surface. At 0.1.0, not yet published to
  npm; Phase 3 built it and is complete.

Phase 1 (the generic evaluation hook API that unblocked the second library) is **complete**,
shipped in `eval-core` 0.3.0; `docs/side-effects/phase-1-plan.md` is its design record, kept
as reference rather than as active work. `ROADMAP.md` plans a third library,
`eval-forms` (Phase 4), and statement support in `eval-core` (Phase 2).

## Commands

Prefer `nx` over the underlying tooling (see `AGENTS.md` for the workspace-wide Nx rules).

```sh
npx nx run eval-core:build:production   # ng-packagr build → dist/modules/eval-core
npx nx run eval-core:test               # jest (jest-preset-angular)
npx nx run eval-core:lint               # eslint flat config

npx nx run eval-signals:build:production   # → dist/modules/eval-signals
npx nx run eval-signals:test
npx nx run eval-signals:lint

npx nx run-many -t lint test -p eval-signals eval-core   # both projects at once

# single test file / pattern — Jest 30, so the flag is plural
npx nx test eval-core --testPathPatterns=queue.spec
npx nx test eval-core --testNamePattern="case insensitive"   # note: singular here
```

Root scripts: `npm test`, `npm run build` and `npm run lint` are all `nx run-many` and cover
both projects. `test` moved in Phase 3 step 0, `build` and `lint` in step 1 — which is when
`eval-signals`' build and lint first passed. CI (`.github/workflows/node.js.yml`) runs
`npm run build --if-present` and `npm test`, so it covers both projects' build and test
targets and neither project's lint.

**A green `test` run is not a type-check.** Jest compiles per file through `tsconfig.spec`
and is more permissive than `tsconfig.lib` — Phase 3 step 3 shipped an `EvalOptions` index
read that the whole suite accepted and `build:production` rejected (`TS7053`), so run the
build before believing a type is sound.

`lint` and `test` targets are *inferred* by the `@nx/eslint` / `@nx/jest` plugins
(`nx.json` `plugins`); only `build` and target-level overrides live in each project's
`project.json`.

## Working from a plan

- Active work is driven by a plan document under `docs/`. **The active plan is
  `docs/signals/phase-3-plan.md`** — read it before proposing changes; it records findings
  about this codebase that are not obvious from reading files in isolation.
  `docs/side-effects/phase-1-plan.md` is the **completed** Phase 1 plan: still worth reading
  for the hook contract Phase 3 consumes (its § 9 and § 9.1), but it is not the work in
  progress and its open questions are settled.
- **Execute one numbered step per session.** Do not begin step N+1 in the same session.
- Run lint and the full test suite after **every** step, not only at the end.
- A step is done when its stated exit criteria are met, not when the code looks finished.
- If a step turns out to be wrong, stop and say so rather than improvising a replacement
  design. Plan changes are written into the plan document first.

## Architecture

`src/public-api.ts` is the entire published surface. It re-exports `actual/services`,
`internal/interfaces`, `internal/functions`, `internal/classes/common`, and
`internal/classes/eval` — but **not** `internal/visitors`. Visitor signatures are
therefore free to change without a breaking release; anything under `classes/` or
`functions/` is public despite the `internal/` folder name.

### The evaluation model (the non-obvious part)

Evaluation is `acorn.parse` → `walk.recursive(node, state, visitors)` from `acorn-walk`,
where `visitors` comes from `getDefaultVisitors()` in
`lib/internal/visitors/recursive-visitors.ts` (the node-type → visitor map; adding
support for a node type means adding a file *and* registering it here).

**Visitors do not return values.** They communicate through a value stack on
`state.result.stack`:

```ts
export const binaryExpressionVisitor = (node, st, callback) => {
  beforeVisitor(node, st);          // hook point — see below
  callback(node.left, st);          // recurse; child pushes its result
  const left = popVisitorResult(node, st);
  callback(node.right, st);
  const right = popVisitorResult(node, st);
  pushVisitorResult(node, st, value);  // also appends to state.result.trace
  afterVisitor(node, st);
};
```

A new visitor must push exactly one value on **every** exit path and pop exactly one per
`callback(child, …)`, or the stack desynchronizes and downstream nodes silently read the
wrong operand. `logical-expression.ts` (short-circuiting, 4 exits) is the reference for
multi-exit handling.

**Traversal order is not source order.** `callExpressionVisitor` evaluates the arguments
*before* the callee, so a method call's own reads and events arrive last. Check the visitor
before predicting an event sequence; assuming left-to-right costs a test-fix cycle every
time.

Every visitor brackets its body with `beforeVisitor` / `afterVisitor` — 19 visitor files,
20 `beforeVisitor` and 23 `afterVisitor` calls (`identifier.ts` holds two visitor
functions, `logical-expression.ts` has four `after` exits). Both are **hook dispatchers**:
each returns immediately unless `st.hasHooks`, then fires the registered `EvalHooks`
callbacks for that node. They return `void`.

So there are **three** stack invariants, not one, and a new visitor must satisfy all three:

- the value stack above — push exactly one, pop exactly one per child;
- the open-node stack — exactly one `afterVisitor` per `beforeVisitor`, on every exit path
  including the ones an exception takes;
- the **scope stack** — exactly one `st.context.pop()` per `st.context.push()`, again on
  every exit path. Only two visitors push scopes (`arrow-function-expression.ts:14-19` and
  `pattern.ts:110-113`) and **neither uses `try`/`finally`**, so a body that throws skips
  the pop.

The third differs from the other two in *where it lives*, which is what makes it the
longest-lived of the three. The value stack and the open-node stack are on `EvalState`,
which `evaluate` builds per walk and discards after — so corruption there dies with the
walk that caused it. The scope stack is on `EvalContext`, and a caller may hand the **same**
`EvalContext` to any number of evaluations (see "Context resolution" below). A leaked scope
therefore outlives the walk and every later evaluation on that context reads it first, since
scopes are step 1 of `EvalContext.get`'s resolution order. Nothing drains it.

This is latent in `eval-core` only because the usual call builds a fresh context per
evaluation. It is not latent for a caller that reuses one — `@zvenigora/ng-eval-signals`
does, by design.

The second one has a safety net and the first does not, which is the trap. `EvalHooks.exit`
matches the closing node by **identity** and flushes any frames still open above it, and
`evaluate` / `evaluateAsync` unwind to a depth mark in their `catch`. A visitor that
swallows a child's throw between its own `beforeVisitor` and `afterVisitor` — which
`await-expression.ts` does — therefore looks perfectly healthy to the hook layer while the
*value* stack is silently one entry out, and every downstream node reads the wrong operand.
Making the hook stack self-correcting made value-stack corruption quieter, not louder: do
not read balanced hook events as evidence that a visitor is correctly bracketed. See
`docs/side-effects/phase-1-plan.md` § 3.8 and the "Deferred defects in the visitor, context
and service layers" section of `ROADMAP.md`.

### Sync vs. async

`evaluateAsync` (`internal/functions/evaluate.ts`) runs the **same synchronous walk** and
only awaits at the end, via `awaitAllPromises` which recursively resolves promises nested
in the result. There is no `await` point inside any visitor. Any feature that needs to
suspend mid-traversal requires redesigning the walker, not just the visitor.

`evaluate()` is also **re-entrant, and the re-entry is deferred**.
`arrow-function-expression.ts:17` calls `evaluate(node.body, st)` with the *same state*,
from inside the closure it pushes as the arrow function's value — so that nested walk runs
whenever the arrow function is called: during the outer walk, after it has returned, many
times, or never. It is the only such re-entry in any visitor, and it has its own
`try`/`catch`. Anything that accumulates per-walk state on `EvalState` therefore cannot
assume one `evaluate()` call means one walk, and cannot reset that state unconditionally in
a catch — a nested call would clobber the outer walk's.

### Context resolution

`EvalState` (per-evaluation, never global — `EvalService` is `providedIn: 'root'`) holds
`context` / `result` / `options`. `EvalContext.get(key)` resolves in order:

1. `scopes` — a `Stack<Context>` pushed/popped during evaluation (e.g. arrow-function args)
2. `original` — the caller's context object or `Registry`
3. `priorScopes` — `EvalScope` instances registered by the caller, each with its own
   `namespace` / `thisArg` / `caseInsensitive`
4. `lookups` — fallback resolver functions

`getKey()` mirrors this to return the *case-corrected* key when `caseInsensitive` is set.
Consumers that need to know what an expression actually read (dependency tracking for
signals/forms) need the resolved key from here — the AST node alone is not enough, since
computed members and case correction change it.

**`EvalState` is per-evaluation, but `EvalContext` need not be.** `EvalState.fromContext`
calls `EvalContext.fromContext`, which **short-circuits on identity**: hand it something
that is already an `EvalContext` and you get that same instance back, unwrapped and
unmodified; hand it a plain object or `Registry` and it builds a fresh one. So one
`EvalContext` can back any number of `EvalState`s. Three consequences, none of them
obvious from `get`'s resolution order:

- It is what makes "construct the context once, evaluate many times" possible at all —
  the pattern `@zvenigora/ng-eval-signals` is built on.
- The context's own `options` are **not** the walk's options. Visitors read
  `st.options`, which `createState` builds from the options passed to *it* — so
  `caseInsensitive` set only on the `EvalContext` corrects lookup-resolved identifiers
  (the resolver sees the raw key) while `member-expression.ts` still compares property
  names case-sensitively. It has to be passed to both.
- It is what makes a leaked scope durable rather than per-walk — see the third stack
  invariant above.

### Security-relevant code

Prototype-pollution blocking lives in `visitors/prototype-pollution-guard.ts` and is
applied by the `member`, `assignment`, `update`, and `object` expression visitors; call
sandboxing is in `call-expression.ts`. `visitors/property-lookup-cache.ts` is an LRU that
makes repeated property lookups O(1). `visitor-result-cache.ts` exists but is
**deliberately disabled** (commented out in `binary-expression.ts`) due to
context-sensitivity bugs — don't re-enable it without solving cache-key-includes-context.

Under `caseInsensitive`, what blocks the case-variant bypass (`x.CONSTRUCTOR`, the shape of
GHSA-pj3p-xpg7-h7gw in the sibling `jse-eval`) is the *resolved-key* re-check at
`member-expression.ts:188` — `isDangerousProperty(foundKey)`, testing the key the lookup
matched rather than the key as written. It is now covered by
`eval.service.case-variant-guard.spec.ts`; before that spec, the entire 717-test suite
passed with it neutered. Also note `member-expression.ts:144` and `:188` are both gated on
`!isPrimitive`, so the blocklist is skipped for string/number/boolean receivers and
`"abc".constructor` really does return `String` — see the "Deferred security hardening"
section of `ROADMAP.md` before touching either line.

### Performance

`internal/performance.spec.ts` is a real gate. Work added to a path that runs per node
must be guarded by a cheap check so the default (no hooks, no tracing) path does not
regress.

## Testing

- Specs live next to the code they cover, as `*.spec.ts` or `*.test.ts`.
- Match the existing per-visitor spec style — read a neighbouring spec before writing a
  new one.
- New behaviour is written test-first. Pure refactors are not: for those the existing
  suite is the regression gate, and new specs are added once the refactor is green.
- Never weaken or delete an existing assertion to make a change pass. If an existing test
  genuinely encodes wrong behaviour, flag it and ask.
- **A test that would pass without the code it tests is worse than no test** — it reports
  coverage it does not have. For any assertion covering an invariant, break the
  implementation and confirm the test fails. Step 3's identity-checked `exit` is the
  pattern: it was confirmed load-bearing by forcing `exit` back to a positional pop and
  observing **7 failures**. Without that probe, "the suite is green" would have been equally
  true of the broken version.
  Common ways an assertion goes vacuous here: asserting on a hook that was never registered,
  a no-op guard whose absence changes nothing for a singly-registered callback,
  `expect(x).not.toThrow()` standing in for a behavioural claim, or a fixture shared between
  the two arms of a comparison, so one producer moves both.
- **The probe checks the assertion. Check the setup separately.** The failure is usually the
  setup, not the assertion: a fixture in which the discriminating condition cannot arise.
  Step 4's pairing case gave both signals one shared source, so the "a dependency changed"
  producer moved *both* of them and the two arms it existed to compare were never distinct.
  So before writing the assertion, describe what the setup would look like if the invariant
  were false, and confirm that setup is reachable from the fixture you have. Then, when you
  break the implementation, read **which** tests went red rather than that the suite did —
  step 4's pairing case survived a probe that produced three failures, none of them it.

## Public API discipline

- New public symbols are exported through the relevant `internal/classes/*/public-api.ts`,
  which reaches `src/public-api.ts` automatically — not by adding a direct export there.
- Prefer purely additive changes. Anything that alters an exported symbol's shape needs an
  explicit callout in the response, a `CHANGELOG.md` entry, and a version bump.

## Conventions

- Commit messages follow the Angular format: `<type>(<scope>): <summary>` with `<type>`
  one of `build | chore | ci | docs | feat | fix | perf | refactor | test`. `chore` is for
  changes that ship to no consumer — repository tooling such as the agent and skill
  definitions under `.claude/`. Nothing parses the type: versions are bumped by hand
  (`CONTRIBUTING.md`), so it is a convention for whoever reads the log, not a release
  trigger.
- Prettier config exists but the codebase is not formatted to it; match the surrounding file's style.
- `tsconfig.base.json` sets `strict: false`, but both libraries override it — so library
  code compiles under strict, and you should narrow `T | undefined` for real rather than
  assuming the loose base config applies. Library code also leans on `unknown` + explicit
  narrowing rather than `any`. **The two libraries are not equally strict**:
  `modules/eval-core/tsconfig.json` sets `strict: true`, while
  `modules/eval-signals/tsconfig.json` adds `noPropertyAccessFromIndexSignature`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch` and `isolatedModules` on top. The first
  of those is why `eval-signals` reads options as `options?.['caseInsensitive']` and not
  `options?.caseInsensitive` — `EvalOptions` is
  `Record<string, unknown> | { caseInsensitive: false }`, and dotted access into an index
  signature is an error there. That is required, not a style slip; don't "tidy" it.
- **`target` and `lib` disagree: both libraries target `es2022`, but `tsconfig.base.json`
  pins `lib: ["es2020", "dom"]` and neither overrides it.** So an ES2021+ API is available
  at *runtime* and absent from the *type system* — `ErrorOptions`, `Error.cause`,
  `Object.hasOwn`, `Array.prototype.at`, `String.replaceAll` and friends all fail to
  compile, usually with a "change your `lib`" hint that is not a licence to change it. The
  fix at the call site is to declare what you need rather than widen the workspace: e.g.
  `SignalContextWriteError` (`eval-signals`) declares its own `cause` property instead of
  passing `ErrorOptions` to `super`. If `lib` is ever raised, that member starts shadowing
  `Error.cause` and `noImplicitOverride` will ask for `override` — the one place a widening
  would surface.
- Angular 22 / TypeScript 6 / Nx 23. `@zvenigora/ng-eval-core` declares Angular `>=19` as a
  peer dep, so avoid APIs newer than that in shipped code.
- No `console.*` in library code. One carve-out: a dev-mode-only diagnostic behind
  `isDevMode()`, for a misuse that fails silently and would otherwise be undiagnosable.
  Anything reachable in production, or that a consumer could have caught another way, does
  not qualify.
- New evaluator features generally need: the visitor, its registration in
  `recursive-visitors.ts`, a co-located spec, and an entry in the README's
  "ESTree Nodes Supported" list.
- Modify files with the Edit and Write tools only. Do not edit files via shell
  commands (`sed -i`, `>` redirection, `Set-Content`, etc.) — those bypass
  formatting and lint automation.
- Do not add `eslint-disable` comments to make lint pass. Fix the code, or raise
  the rule for discussion.

## Git

- One plan step = one commit = one PR.
- Never commit without a green lint + test run.
- Do not commit or push unless asked.
