# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Nx monorepo containing a single publishable Angular library, `@zvenigora/ng-eval-core`
(`modules/eval-core`) — a JavaScript expression parser/evaluator built on `acorn` +
`acorn-walk`, exposed as Angular DI services. `ROADMAP.md` plans two further libraries
under `modules/` (`eval-signals`, `eval-forms`); see `docs/side-effects/phase-1-plan.md`
for the in-progress hook API design that unblocks them.

## Commands

Prefer `nx` over the underlying tooling (see `AGENTS.md` for the workspace-wide Nx rules).

```sh
npx nx run eval-core:build:production   # ng-packagr build → dist/modules/eval-core
npx nx run eval-core:test               # jest (jest-preset-angular)
npx nx run eval-core:lint               # eslint flat config

# single test file / pattern — Jest 30, so the flag is plural
npx nx test eval-core --testPathPatterns=queue.spec
npx nx test eval-core --testNamePattern="case insensitive"   # note: singular here
```

Root `npm run build|test|lint` are thin aliases for the three `eval-core` targets.
`lint` and `test` targets are *inferred* by the `@nx/eslint` / `@nx/jest` plugins
(`nx.json` `plugins`); only `build` and target-level overrides live in
`modules/eval-core/project.json`.

Tests are matched as both `*.spec.ts` and `*.test.ts` — both conventions are in use and
live next to the code they cover.

## Working from a plan

- Active work is driven by a plan document under `docs/` (currently
  `docs/side-effects/phase-1-plan.md`). Read the plan before proposing changes; it records
  findings about this codebase that are not obvious from reading files in isolation.
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

Every visitor brackets its body with `beforeVisitor` / `afterVisitor`. These are currently
timing-only stubs gated on `options.trackTime`, and are the designated dispatch point for
the Phase 1 user-registerable hook API — 19 call sites already exist, so the hook work
changes those two functions, not the visitors.

### Sync vs. async

`evaluateAsync` (`internal/functions/evaluate.ts`) runs the **same synchronous walk** and
only awaits at the end, via `awaitAllPromises` which recursively resolves promises nested
in the result. There is no `await` point inside any visitor. Any feature that needs to
suspend mid-traversal requires redesigning the walker, not just the visitor.

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

### Security-relevant code

Prototype-pollution blocking lives in `visitors/prototype-pollution-guard.ts` and is
applied by the `member`, `assignment`, `update`, and `object` expression visitors; call
sandboxing is in `call-expression.ts`. `visitors/property-lookup-cache.ts` is an LRU that
makes repeated property lookups O(1). `visitor-result-cache.ts` exists but is
**deliberately disabled** (commented out in `binary-expression.ts`) due to
context-sensitivity bugs — don't re-enable it without solving cache-key-includes-context.

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

## Public API discipline

- New public symbols are exported through the relevant `internal/classes/*/public-api.ts`,
  which reaches `src/public-api.ts` automatically — not by adding a direct export there.
- Prefer purely additive changes. Anything that alters an exported symbol's shape needs an
  explicit callout in the response, a `CHANGELOG.md` entry, and a version bump.

## Conventions

- Commit messages follow the Angular format: `<type>(<scope>): <summary>` with `<type>`
  one of `build | ci | docs | feat | fix | perf | refactor | test`. The type drives
  semantic versioning on merge (`CONTRIBUTING.md`).
- Prettier config exists but the codebase is not formatted to it; match the surrounding file's style.
- `tsconfig.base.json` sets `strict: false`, but library code leans on `unknown` +
  explicit narrowing rather than `any`.
- Angular 22 / TypeScript 6 / Nx 23. `@zvenigora/ng-eval-core` declares Angular `>=19` as a
  peer dep, so avoid APIs newer than that in shipped code.
- No `console.*` in library code.
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
