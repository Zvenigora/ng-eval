# Changelog

All notable changes to the `@zvenigora/ng-eval` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-08-10

Phase 1 of the [roadmap](ROADMAP.md): a generic evaluation hook API, the prerequisite for the planned `eval-signals` and `eval-forms` libraries. Design and rationale in `docs/side-effects/phase-1-plan.md`; consumer documentation in the [package README](modules/eval-core/README.md#evaluation-hooks).

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

## [0.2.5] - 2026-08-03

### Changed
- **Nx Monorepo Upgrade**: Migrated Nx tooling from **v22.1.3** to **v23.1.1**, bringing Angular to **v22.0.8**, TypeScript to **v6.0.3**, and Jest to **v30.3.0**. Ran the full `nx migrate` flow (47 automatic codemods) plus the migrations Nx deferred to manual review.
- **ESLint v9 Flat Config**: Converted `.eslintrc.json`/`.eslintignore` to `eslint.config.mjs` at the root and in `eval-core`, replacing the generator's `FlatCompat` shims with flat-native config (the Angular inline-template shim was fully redundant with `@nx/eslint-plugin`'s `flat/angular` preset).
- **Inferred Nx Targets**: Converted the `eval-core` project's `lint` and `test` targets from the deprecated `@nx/eslint:lint` / `@nx/jest:jest` executors to Nx's inferred targets (`@nx/eslint/plugin`, `@nx/jest/plugin` registered in `nx.json`), removing the executor deprecation warnings scheduled for Nx v24.
- **Angular Change Detection**: Applied Angular v22's `change-detection-eager` migration, adding an explicit `ChangeDetectionStrategy.Eager` to `EvalCoreComponent` to preserve its pre-v22 default behavior.

### Fixed
- **Jest `isolatedModules`**: Removed from `eval-core`'s `tsconfig.spec.json` after confirming it broke typecheck (TS1205 on re-exported types) and isn't needed for this single-project workspace.

---

## [0.2.4] - 2026-08-02

### Note
- Version bump with no recorded changelog entry at the time; folded into the [0.2.5] migration work above.

---

## [0.2.3] - 2026-08-01

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

## [0.2.0] - 2025-08-20

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

## [0.1.0] - 2023-11-26

### Added
- **Initial Commit**: Core `@zvenigora/ng-eval-core` library initialization and basic AST evaluation engine (`2023-11-26`).
- **Angular Integration**: Basic Angular services and Angular plugin integration setup.
- **Public API**: Initial release of scope, parser, and visitor architecture.
