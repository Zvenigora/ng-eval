# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standing rules

@docs/standing-rules.md

The process and verification rules for all three libraries — plans and steps, the gate, probes,
claims, commits — are [`docs/standing-rules.md`](docs/standing-rules.md), imported by the line
above and cited as [SR1](docs/standing-rules.md#sr1), SR2, …. This file keeps the facts about the
code and the state of the work, and cites a rule rather than restating it.

## What this is

An Nx monorepo containing three Angular libraries under `modules/`, versioned
independently and **all three published to npm** under the `@zvenigora` scope, each with a
`<name>@<version>` git tag:

- **`@zvenigora/ng-eval-core`** (`modules/eval-core`) — a JavaScript expression
  parser/evaluator built on `acorn` + `acorn-walk`, exposed as Angular DI services.
  Published at **0.14.1**. This is where nearly all the code is.
- **`@zvenigora/ng-eval-signals`** (`modules/eval-signals`) — expression → Angular
  `Signal`, built on the first library's published surface. Published at **0.7.0**;
  Phase 3 shipped 0.1.0.
- **`@zvenigora/ng-eval-forms`** (`modules/eval-forms`) — Angular form field properties
  driven by expressions that arrive as strings at runtime, built on the other two.
  Published at **0.7.1**; Phase 6 shipped 0.2.0. It ships **three entry points from one
  package**: the shared core at `@zvenigora/ng-eval-forms`, the Reactive Forms adapter at
  `@zvenigora/ng-eval-forms/reactive`, and the Signal Forms adapter at
  `@zvenigora/ng-eval-forms/signals`, which requires Angular 22.

**Published is a constraint, not a status line.** No exported symbol's shape can change
without a breaking release, in any of the three; "nothing has shipped yet" no longer
applies to any of them.

Phases 1, 2, 3, 4, 5, 6, 9, 10 and 11 are complete and their plan documents are design records rather
than active work. Phase 2 shipped as `eval-core` 0.4.0, and its plan is
`docs/statements/phase-2-plan.md`. Phase 5, the async signal, shipped as `eval-signals` 0.5.0,
and its plan is `docs/signals/phase-5-plan.md`. Phase 9, colon-joined identifiers, shipped as
`eval-core` 0.12.0, `eval-signals` 0.5.1 and `eval-forms` 0.5.0, and its plan is
`docs/colon-identifiers/phase-9-plan.md`. Phase 10, the documentation restructure, is complete:
it shipped as `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms` 0.6.1, docs-only patches,
and its plan is `docs/documentation/phase-10-plan.md`. The A45 plan, `docs/a45/plan.md` — A45
part 2 and A44, assignment targets as JavaScript evaluates them — is complete: it shipped as
`eval-core` 0.14.0, `eval-signals` 0.7.0 and `eval-forms` 0.7.0. Phase 11, `eval-forms`' README
by entry point (`docs/backlog.md` F28), is complete: it shipped as `eval-forms` 0.7.1, a docs-only
patch, and its plan is `docs/documentation/phase-11-plan.md`. No plan is active. What `ROADMAP.md`
has left is Phases 7 and 8, which it reserves without specifying them.

**Deferred work is not in `ROADMAP.md`.** Everything recorded-and-not-done — defects left
unfixed, decisions logged rather than made, gaps in what the suite can catch — is in
**`docs/backlog.md`**, cited by stable ID ([SR5](docs/standing-rules.md#sr5)). Read its
preamble before recording a deferral anywhere else.

## Commands

Prefer `nx` over the underlying tooling (see `AGENTS.md` for the workspace-wide Nx rules).

```sh
# projects: eval-core, eval-signals, eval-forms
npx nx run <project>:build:production   # ng-packagr → dist/modules/<project>
npx nx run <project>:test               # jest (jest-preset-angular)
npx nx run <project>:lint               # eslint flat config

npx nx run-many -t lint test build       # every project, every target

# single test file / pattern — Jest 30, so the flag is plural
npx nx test eval-core --testPathPatterns=queue.spec
npx nx test eval-core --testNamePattern="case insensitive"   # note: singular here
```

The gate is the full command in [SR8](docs/standing-rules.md#sr8), never filtered with `-p`.
Its `--output-style=static` is there because nx 23.3, like 23.2, hides successful tasks'
output, and the gate is read for its test counts.

Root scripts: `npm test`, `npm run build` and `npm run lint` are `nx run-many -t <target>`
with no project filter, so each covers all three projects. CI
(`.github/workflows/node.js.yml`) runs `npm ci`, `npm run build --if-present` and
`npm test` — so it covers all three projects' build and test targets, and no project's
lint.

`test` also runs on a fourth project, the workspace root (`@zvenigora/ng-eval`), whose only
`test` target is `node tools/doc-links.mjs && node tools/release-tags.mjs`, declared in the root
`package.json`'s `nx.targets`. The first is the document cross-reference gate (`docs/backlog.md`
F9). It fails on a relative link in any `*.md`, or in a comment line of any `*.ts`, whose file or
`#anchor` does not resolve, so a doc-only or comment-only edit can turn `npm test`, CI and the gate
red. It scans tracked files and untracked ones git does not ignore, naming the untracked ones in its
summary line. A `.ts` line counts as a comment only if it starts with `*`, `/**` or `//`; code
lines are never parsed. Since F25 it also resolves an absolute link into the repository's tree at
`master` against the tree; fails on any link a published README prints, listed in
`tools/published-links.txt`, that stops resolving, and on a package README link of that form the
list lacks; and fails on a file under `docs/` that `docs/README.md` does not link. The second is the release tag check
(`docs/backlog.md` F8): every row of the register's Publication status table needs its
`<project>@<version>` tag, at the commit the row names, so it fails in a checkout with no tags
(`git fetch --tags`) and on a row written before its tag. Since F26 every release tag — any
`eval-core@`, `eval-signals@` or `eval-forms@` tag, with or without a row — must also be annotated,
and a lightweight one fails; the `v*` tags are not checked.

**A green `test` run is not a type-check** ([SR9](docs/standing-rules.md#sr9), which names
the tsconfig each target compiles through).

`lint` and `test` targets are *inferred* by the `@nx/eslint` / `@nx/jest` plugins
(`nx.json` `plugins`); only `build` and target-level overrides live in each project's
`project.json`.

## Working from a plan

Work runs per backlog item or batch, and a plan document is only for an item that needs more
than one commit ([SR1](docs/standing-rules.md#sr1)) — as in `docs/a8/`, `docs/a20/`,
`docs/a21/` and `docs/trace-surface/`. Steps, plan corrections, the gate, review and commits are
[SR2](docs/standing-rules.md#sr2)–[SR4](docs/standing-rules.md#sr4),
[SR8](docs/standing-rules.md#sr8) and [SR33](docs/standing-rules.md#sr33)–[SR35](docs/standing-rules.md#sr35).

- The A35 plan, `docs/a35/plan.md` — dangerous function values past the call sandbox, with A36
  and A37 — is complete: it shipped as `eval-core` 0.12.1 and 0.13.0, and its advisory is
  GHSA-qrqj-3445-3rjx. Phase 10's plan is complete, and so are the A45 plan, `docs/a45/plan.md`,
  which shipped as `eval-core` 0.14.0, `eval-signals` 0.7.0 and `eval-forms` 0.7.0, and Phase 11's,
  `docs/documentation/phase-11-plan.md`, which shipped as `eval-forms` 0.7.1. No plan is active.
  `.claude/skills/step/SKILL.md` targets the active plan,
  and is retargeted with each new plan; while none is active it names none, and stops at its § 1 if
  invoked.
- The completed plans are design records, not work in progress, and each remains the
  reference for its library — they record findings about this codebase that are not
  obvious from reading files in isolation:
  - `docs/side-effects/phase-1-plan.md` — Phase 1, the hook contract (its § 9 and § 9.1).
  - `docs/statements/phase-2-plan.md` — Phase 2, statements.
  - `docs/signals/phase-3-plan.md` — Phase 3; its § 9 is the downstream contract
    `eval-forms` is entitled to rely on, and § 3.2.2 the construct-once finding.
  - `docs/forms/phase-4-plan.md` — Phase 4; its § 9 designs Phase 6 and § 9.1 states
    Phase 6's one correctness precondition.
  - `docs/signals/phase-5-plan.md` — Phase 5, the async signal; its § 3.4 is the value and
    status contract, and § 9 the downstream one.
  - `docs/colon-identifiers/phase-9-plan.md` — Phase 9, colon-joined identifiers; its § 3.4 is
    the grammar, § 3.5 the acorn plugin and the internals it relies on, and § 9 the downstream
    contract. Its § 8 q1, q2 and q4 are open, waiting on real expressions arriving as corpus
    data, and say so; q5 is decided — not provided in Phase 9 — and reopens only on the condition
    the plan states.
  - `docs/a35/plan.md` — the A35 track, dangerous function values past the call sandbox, with
    A36, A37, A39 and A42, shipped as `eval-core` 0.12.1 and 0.13.0; its § 3.1 is the identity
    set, § 3.3 the funnel, § 3.4 what stays open, and § 9 the contract after it landed. It
    numbers two § 1.2s: the second, "Standing rules, from Revision 16", holds the two probe rules
    that are now [SR18](docs/standing-rules.md#sr18) and [SR19](docs/standing-rules.md#sr19).
  - `docs/documentation/phase-10-plan.md` — Phase 10, the documentation restructure, shipped as
    `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms` 0.6.1, docs-only; its § 3.2 is why
    nothing under `docs/` moves, § 3.5 the package READMEs' one opening and their gated peer ranges,
    § 3.10 `SECURITY.md`'s identifier check, § 6.1 the spec discipline for documentation, and § 9
    the contract after it landed. Its § 8 q3 was decided after the phase, as `docs/backlog.md` F25
    Part 4: a published absolute link binds its target.
  - `docs/a45/plan.md` — the A45 track, A45 part 2 and A44, assignment targets as JavaScript
    evaluates them, with A52, shipped as `eval-core` 0.14.0, `eval-signals` 0.7.0 and `eval-forms`
    0.7.0; its § 0 collects thirteen rules, now standing rules
    ([the map](docs/standing-rules.md#old-numberings)), § 3 is the design, § 9 the contract after it landed, and § 10 the retrospect. Its § 8 q2–q4
    are pointers to A48–A51, which stay open.
  - `docs/documentation/phase-11-plan.md` — Phase 11, `eval-forms`' README by entry point, shipped
    as `eval-forms` 0.7.1, docs-only; its § 3.1 is D1–D6, why each package keeps one README and no
    guide file exists, § 3.2 the README's order, § 3.5 its contents list, § 9 the contract after it
    landed — its headings are 0.7.0's word for word — and § 10 the retrospect.

  Their open questions are settled unless the document says otherwise. They stay as written,
  and their line citations, and those in their summaries, refer to the code at the commits that
  wrote them ([SR6](docs/standing-rules.md#sr6)): `git log` on the document finds that commit,
  and `git show <commit>:<file>` the code a citation names. Two of them number a § 9 and a
  § 9.1 on unrelated subjects.

## Architecture (`eval-core`)

Everything in this section is `eval-core` unless it says otherwise. The two downstream
libraries are far smaller, and their own invariants live in
`.claude/agents/code-reviewer.md` beside the checklists that enforce them.

`src/public-api.ts` is the entire published surface: it re-exports the service, interface,
function and class barrels — but **not** `internal/visitors`. Visitor signatures are
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

Every visitor brackets its body with `beforeVisitor` / `afterVisitor`, and the two do not
appear in equal numbers: `identifier.ts` holds two visitor functions, and
`logical-expression.ts`, `binary-expression.ts` and `member-expression.ts` each close on
more than one `after` exit. Count them with `grep` rather than trusting a number written
down here — the totals have been recorded wrong twice. Both are **hook dispatchers**:
each returns immediately unless `st.hasHooks`, then fires the registered `EvalHooks`
callbacks for that node. They return `void`.

So there are **three** stack invariants, not one, and a new visitor must satisfy all three:

- the value stack above — push exactly one, pop exactly one per child;
- the open-node stack — exactly one `afterVisitor` per `beforeVisitor`, on every exit path
  including the ones an exception takes;
- the **scope stack** — exactly one `contextPop(st.context)` per
  `contextPush(st.context, …)`, again on every exit path. **Four** visitors push scopes —
  `arrow-function-expression.ts` (the parameter bindings), and `program.ts`,
  `block-statement.ts` and `for-statement.ts` (a lexical scope each, all three added by
  Phase 2) — and since Phase 2 step 0 (`docs/backlog.md` `BL-A9`) **every one pops in a
  `finally`**. That is the idiom to copy, and the `try` opens on the line *after* the push,
  never around it. `contextPush` and `contextPop` (`context-method.ts`, which takes both
  methods from the context's class, A42) skip an absent context alike, as the optional chain
  `st.context?.push(...)` they replaced did. The hazard is a throw: a `try` opened one line
  early would run its `finally` pop after the push, or the call building its scope, had thrown,
  and pop a scope that belongs to the caller.

  **Count them with `grep`, and do not trust the number in this paragraph either.** It said
  "two — `arrow-function-expression.ts` and `pattern.ts`" from Phase 1 until the A11 repair,
  through the whole of Phase 2, which added three pushers and removed the one that made the
  sentence wrong in the other direction. `pattern.ts` pushed the destructuring source as a
  scope so it could resolve `Property.value` as an expression against it; that *was* the A11
  defect, so the repair deleted the push and `pattern.ts` is now not a pusher at all. This is
  the same failure the `beforeVisitor` / `afterVisitor` totals above carry a warning about,
  in the paragraph immediately before this one.

The third differs from the other two in *where it lives*, which is what makes it the
longest-lived of the three, and the reason the `finally` is not optional. The value stack and
the open-node stack are on `EvalState`, which `evaluate` builds per walk and discards after —
so corruption there dies with the walk that caused it. The scope stack is on `EvalContext`,
and a caller may hand the **same** `EvalContext` to any number of evaluations (see "Context
resolution" below). A scope that is pushed and not popped therefore outlives the walk, and
every later evaluation on that context reads it first, since scopes are step 1 of
`EvalContext.get`'s resolution order. Nothing in `eval-core` drains it.

A visitor that pushes without a `finally` is latent in `eval-core` only because the usual
call builds a fresh context per evaluation. It is not latent for a caller that reuses one —
`@zvenigora/ng-eval-signals` does, by design, and both downstream libraries still carry a
depth-mark unwind at their recompute boundary against it (`eval-signal.ts`,
`evaluate-rule.ts`). Those guards are **retained, not redundant**: `EvalContext.push` / `pop`
are public methods on a published class, so a scope can be stranded with no visitor involved
at all. A second reason expired when both packages raised their `eval-core` floor to 0.10.0
(`eval-signals` 0.3.0, `eval-forms` 0.3.0): the range used to admit the pre-fix 0.3.0.

The second one has a safety net and the first does not, which is the trap. `EvalHooks.exit`
matches the closing node by **identity** and flushes any frames still open above it, and
`evaluate` / `evaluateAsync` unwind to a depth mark in their `catch`. A visitor that
swallows a child's throw between its own `beforeVisitor` and `afterVisitor` — which
`await-expression.ts` did until `eval-core` 0.7.0 — therefore looks perfectly healthy to the
hook layer while the *value* stack is silently one entry out, and every downstream node reads
the wrong operand. Making the hook stack self-correcting made value-stack corruption quieter,
not louder: do not read balanced hook events as evidence that a visitor is correctly
bracketed. See `docs/side-effects/phase-1-plan.md` § 3.8 and `docs/backlog-retired.md`
`BL-A1`, the `await-expression.ts` case and its fix: the operand is evaluated outside any
`Promise` executor and its throw is left to propagate, as in every other visitor.

### Sync vs. async

`evaluateAsync` (`internal/functions/evaluate.ts`) runs the **same synchronous walk** and
only awaits at the end, via `awaitAllPromises` which recursively resolves promises nested
in the result. There is no `await` point inside any visitor. Any feature that needs to
suspend mid-traversal requires redesigning the walker, not just the visitor.

`evaluate()` is also **re-entrant, and the re-entry is deferred**.
`arrow-function-expression.ts` calls `evaluate(node.body, st)` with the *same state*,
from inside the closure it pushes as the arrow function's value — so that nested walk runs
whenever the arrow function is called: during the outer walk, after it has returned, many
times, or never. It is the only such re-entry in any visitor, and the *nested `evaluate`
call* brings its own `try`/`catch` with it (distinct from the `try`/`finally` the visitor
wraps that call in, which is the scope-stack pop above). Anything that accumulates per-walk
state on `EvalState` therefore cannot assume one `evaluate()` call means one walk, and
cannot reset that state unconditionally in a catch — a nested call would clobber the outer
walk's.

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
sandboxing is in `call-expression.ts`. `visitors/property-lookup-cache.ts` remembers, under
`caseInsensitive`, which own key a name resolved to, in a `WeakMap` keyed by the object
([A31](docs/backlog-retired.md#a31)). A found key is reused while it is still an own key of the
object, and a miss while the object's own-key count is unchanged, so a key added as another is
deleted can read as a miss — a wrong `undefined`, never a skipped refusal
([A33](docs/backlog.md#a33)). A repeated hit is O(1); a repeated miss still lists the object's
own names, though it skips comparing them. A visitor result cache, disabled since it was
written, was **deleted** ([A32](docs/backlog-retired.md#a32)): its key held none of the node's
operands, so `a + b` and `c + d` over one context shared an entry, and of the `EvalContext` the
visitors passed it held only the size and the time. A future result cache starts from A32's
register entry.

Under `caseInsensitive`, what blocks the case-variant bypass (`x.CONSTRUCTOR`, the shape of
GHSA-pj3p-xpg7-h7gw in the sibling `jse-eval`) is the *resolved-key* re-check,
`isDangerousProperty(foundKey)` in `member-expression.ts`, testing the key the lookup
matched rather than the key as written. It is now covered by
`eval.service.case-variant-guard.spec.ts`; before that spec, the entire suite passed with
it neutered. A string/number/boolean receiver is not checked against the full blocklist —
`toString`, `valueOf` and their kin are ordinary reads on it — but against
`DANGEROUS_PRIMITIVE_PROPERTY_NAMES` (`constructor`, `__proto__`, `prototype` and the four
accessor definers), by exact key on both paths, since a primitive is never case-corrected.
See `docs/backlog-retired.md` `BL-B1`, which carries the probe results, and
`eval.service.primitive-carve-out.spec.ts` before touching either check.

### Performance

`internal/performance.spec.ts` is a real gate. Work added to a path that runs per node
must be guarded by a cheap check so the default (no hooks, no tracing) path does not
regress.

## Testing

These apply to all three libraries.

- Specs live next to the code they cover, as `*.spec.ts` or `*.test.ts`.
- Match the existing per-visitor spec style — read a neighbouring spec before writing a
  new one.
- Test-first, assertions, probes and the setup check are
  [SR13](docs/standing-rules.md#sr13)–[SR19](docs/standing-rules.md#sr19), and the
  documentation specs [SR30](docs/standing-rules.md#sr30).

## Public API discipline

- In `eval-core`, export a new public symbol through the relevant
  `internal/classes/*/public-api.ts`, which reaches `src/public-api.ts` automatically —
  not by adding a direct export there. The downstream libraries have no such nesting:
  their barrels list modules directly, and `eval-forms` has one barrel per entry point.
- A changed exported shape is a breaking release ([SR12](docs/standing-rules.md#sr12)), and
  every change states where it ships ([SR11](docs/standing-rules.md#sr11)). A package's entry
  goes in **its own `modules/<name>/CHANGELOG.md`**, headed `## [<version>] - <date>` with no
  package prefix and npm's publish date in UTC, by `CONTRIBUTING.md`'s Releasing. The root
  `CHANGELOG.md` only lists the three, plus workspace changes that ship in no package.

## Conventions

- Commit messages follow the Angular format in `CONTRIBUTING.md`'s Commit Messages, where
  `chore` is for changes that ship to no consumer, such as `.claude/`.
- Prettier config exists but the codebase is not formatted to it; match the surrounding file's style.
- `tsconfig.base.json` sets `strict: false`, but all three libraries override it — so
  library code compiles under strict, and you should narrow `T | undefined` for real
  rather than assuming the loose base config applies. Library code also leans on
  `unknown` + explicit narrowing rather than `any`. All three additionally set
  `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns` and
  `noFallthroughCasesInSwitch`; `eval-signals` and `eval-forms` have identical
  `tsconfig.json`s and add `isolatedModules` on top of that. **The strictness difference
  between the libraries is `isolatedModules` and nothing else** — do not assume `eval-core`
  is the lax one. `noPropertyAccessFromIndexSignature` is why options are read as
  `options?.['caseInsensitive']` and not `options?.caseInsensitive` — `EvalOptions` is
  `Record<string, unknown> | { caseInsensitive: false }`, and dotted access into an index
  signature is an error under that flag, in all three. That is required, not a style slip;
  don't "tidy" it.
- **`target` and `lib` disagree — but only downstream.** All three libraries target
  `es2022`. `tsconfig.base.json` pins `lib: ["es2020", "dom"]`, and
  `modules/eval-core/tsconfig.json` **overrides it** to `["dom", "es2022"]` while the other
  two do not. Re-check with
  `npx tsc --showConfig -p modules/<project>/tsconfig.lib.json` rather than by reading the
  files, since three levels of `extends` are involved.

  So **in `eval-signals` and `eval-forms`** an ES2021+ API is available at *runtime* and
  absent from the *type system* — `ErrorOptions`, `Error.cause`, `Object.hasOwn`,
  `Array.prototype.at`, `String.replaceAll` and friends fail to compile, usually with a
  "change your `lib`" hint that is not a licence to change it. Declare what you need at the
  call site rather than widening the workspace: `SignalContextWriteError` (`eval-signals`)
  declares its own `cause` property instead of passing `ErrorOptions` to `super`. If that
  library's `lib` is ever raised, the member starts shadowing `Error.cause` and
  `noImplicitOverride` will ask for `override` — the one place a widening would surface.
  **None of this constrains `eval-core`**, where those APIs compile today.
- Angular 22 / TypeScript 6 / Nx 23. `@zvenigora/ng-eval-core` declares Angular `>=19` as a
  peer dep, so avoid APIs newer than that in shipped code.
- **Add no `console.*` to library code. This is a rule for what you write, not a
  description of what is there.** `eval-core` has eleven pre-existing calls in source, all in
  `memory-manager.ts`, and **none** survives tree-shaking into the published bundle. A grep of
  the built `fesm2022` for `console.` still finds three lines, all of them comments. A grep of
  the source finds the eleven; they are inherited, not something a recent change introduced. Do
  not add to them, and do not clean them up in passing either. The history of the ones removed
  is `BL-B3` (retired), which deleted the last service-layer call, `parser.service.ts`'s
  cache-timer `console.debug`. Another went with the dead component it sat in (`BL-B4`,
  retired).
  The one deliberate call is the carve-out — a dev-mode-only diagnostic behind
  `isDevMode()`, for a misuse that fails silently and would otherwise be undiagnosable
  (`eval-signals`' `warnOnNestedSignals`, in `nested-signal-check.ts`, behind its
  `isDevMode()` guard). Anything reachable in
  production, or that a consumer could have caught another way, does not qualify.
- New evaluator features generally need: the visitor, its registration in
  `recursive-visitors.ts`, a co-located spec, and an entry in the "ESTree nodes supported" list
  of `modules/eval-core/README.md`, the package README.
- Modify files with the Edit and Write tools only ([SR36](docs/standing-rules.md#sr36)).
- Do not add `eslint-disable` comments to make lint pass. Fix the code, or raise
  the rule for discussion.

## Git

- Commit or push only when asked, and commit only after a green gate, one plan step to a
  commit ([SR34](docs/standing-rules.md#sr34)); review first
  ([SR33](docs/standing-rules.md#sr33)), and verify every push
  ([SR35](docs/standing-rules.md#sr35)).
