# Changelog

All notable changes to the `@zvenigora/ng-eval` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The repository publishes more than one package, and they version independently. From `eval-signals 0.1.0` onward a heading names its package; bare version headings below it are `@zvenigora/ng-eval-core`, which is the only package that had shipped until then.

---

## [eval-forms 0.1.0] - 2026-08-20

Phase 4 of the [roadmap](ROADMAP.md): the first release of `@zvenigora/ng-eval-forms`, which drives Angular form field properties from **string** expressions resolved at runtime — for schemas served by an API, authored in a form-builder UI, or versioned separately from the application. Design and rationale in `docs/forms/phase-4-plan.md`; consumer documentation in the [package README](modules/eval-forms/README.md), with a [worked example](docs/forms/worked-example.md). Requires `@angular/core >=19`, `@angular/forms >=19`, `rxjs ^7.8`, `@zvenigora/ng-eval-core ^0.3.0` and `@zvenigora/ng-eval-signals ^0.1.0`.

**If your conditions are known at compile time and you are on Angular 22, use Angular's own Signal Forms schema instead.** This library exists for the cases where the rule is not knowable when the application is compiled; the README says so first, before the API.

### Added
- **Two entry points, both shipped from one package.** `@zvenigora/ng-eval-forms` is the shared core and imports nothing from `@angular/core` or `@angular/forms`; `@zvenigora/ng-eval-forms/reactive` is the Angular Reactive Forms adapter. A `/signals` entry point for Signal Forms is designed (plan § 9) and not built — placing `/reactive` at the primary entry point now would have made adding it a breaking move of every symbol.
- **`bindFieldProperties(schema, group, options)`** (`/reactive`): the primary API. Validates the schema, mirrors the `FormGroup`, and returns a `FormBinding` — one `EvalSignal` per rule, recomputing when a control the rule actually *named* changes. `options.injector` is **required**: every signal it creates is built with an explicit injector and therefore takes no `DestroyRef` registration of its own, so an optional one would silently vary when teardown runs.
- **`FieldSchema`** (`/reactive`): `{ name, visible?, text? }`, and deliberately not a schema *language*. A field need not name a control.
- **`FormBinding`** (`/reactive`): `{ fields: Record<string, FieldProperties>; destroy(): void }`. One `destroy()` releases every property signal and both halves of the mirror; it is idempotent, and a `DestroyRef` registration on the caller's injector is the net under it rather than a substitute for calling it.
- **`FieldProperties`** (`/reactive`): `{ visible?: EvalSignal<boolean>; text?: EvalSignal<string> }` — `EvalSignal` rather than `Signal`, because both extra members are reachable API here: `invalidate()` is the documented hatch for a `{ emitEvent: false }` write and for a control-set change, and `destroy()` is what teardown counts.
- **`createControlSource(group, options)`** (`/reactive`): the mirror on its own, for callers composing contexts by hand. One subscription **per control, never to the group** — a disabled control is excluded from its parent's aggregate value and there is no `rawValueChanges`, so a group-backed mirror would lose a field the moment anything disabled it. The returned record holds live values behind accessors and must be passed by reference; `{ ...source }` flattens it and silently freezes every property built over the copy.
- **`createFieldContext(formSource, fieldSource, options?)`** (core): composes one `EvalContext` per field from a form-wide and a field-local source, as two live lookups rather than a joined record — so a key added to either source after construction resolves, with nothing to keep in sync.
- **`toVisible` / `toText`** (core): the two coercions. `visible` is JavaScript truthiness, so the string `'false'` is **visible**; `text` is `String(value)` with `null` and `undefined` mapping to `''`, so `0` stringifies to `'0'` rather than blanking.
- **`ExpressionErrorPolicy`** (core): `'throw' | 'undefined' | ((error) => unknown)`. **The default is `'undefined'` — the opposite of `eval-signals`' default**, because the expression's author may be an end user rather than the developer, and the right response to a bad rule is a field that does not render. A matching `applyErrorPolicy` helper is deferred to the `/signals` phase, which is its only caller.
- **Construction-time schema validation.** A duplicate field name, a non-string rule, a name that is a member of `Object.prototype`, and a control that is not a `FormControl` all throw from `bindFieldProperties`. The prototype check is the one no other layer can make: `FormGroup` accepts a control named `constructor`, and an expression naming it reads the prototype's value — a function, which is truthy — so `visible` would render precisely the field that has no data, with no error anywhere.

### Changed
- **⚠️ `bindFieldProperties` returns `FormBinding`, not a bare `Record<string, FieldProperties>`.** The only shape change to an exported symbol in this release, and it is called out rather than folded into "adds the `/reactive` adapter" — nothing has been published, so no released shape breaks, but the entry exists so the change is found by reading. `destroy()` is nested under `fields` rather than written onto the record because the record's keys are *field names*, `destroy` is a legal one, and those names arrive from a server: a flat shape would put a silent collision between the consumer's data and this library's API in the one case where the consumer controls the names least.

### Notes
- **Limitations, all documented in the README**: a `{ emitEvent: false }` write freezes a property until `invalidate()` (the observable is the only signal there is); the *key set* is not reactive, so `addControl` / `removeControl` needs one `invalidate()` on the rules that name the affected key; those same methods called with `{ emitEvent: false }` suppress `group.events` and have **no** hatch; an empty `FormControl` is indistinguishable from an absent key; and the binding must be constructed outside a reactive context, since `toSignal` opens with `assertNotInReactiveContext`.
- **Deferred deliberately**: `disabled` (it writes back into the form, it emits on `valueChanges` so a rule naming its own field re-enters its own input, and it removes the value from the parent aggregate); `required` and validators; form-state keys (`touched` / `dirty` / `valid`); `FormArray` and nested `FormGroup`, which are rejected at bind time rather than left to misbehave.
- **`peerDependencies` are per package, not per entry point**, so the manifest declares one range at the floor. `/reactive` works from Angular 19; when `/signals` ships it will need Angular 22, and an older consumer importing it gets `Cannot find module '@angular/forms/signals'` from Angular's own `exports` map. Narrowing the manifest to `>=22` would add no diagnostic and would break every Reactive Forms consumer on 19–21.
- **`readme-examples.spec.ts` executes the runnable examples** in the README and the worked example, so a documented example that stops working fails the suite. Template and manifest blocks are not covered, and it is narrower than the documented-symbol drift gate the roadmap still defers: it runs the code, it does not read the markdown.
- Nothing was added to `@zvenigora/ng-eval-core` or `@zvenigora/ng-eval-signals`; both are consumed at their published surfaces.

---

## [eval-signals 0.1.0] - 2026-08-15

Phase 3 of the [roadmap](ROADMAP.md): the first release of `@zvenigora/ng-eval-signals`, which turns an expression plus a context of signals into an Angular `Signal`. Design and rationale in `docs/signals/phase-3-plan.md`; consumer documentation in the [package README](modules/eval-signals/README.md). Requires `@angular/core >=19` and `@zvenigora/ng-eval-core ^0.3.0`.

### Added
- **`createEvalSignal(expression, source, options?)`**: The primary API. Compiles the expression once and returns an `EvalSignal` that recomputes when a signal-backed key the expression **read** changes — `shipping.set(0)` does not recompute `'price * quantity'`. The tracking is Angular's own rather than this library's: the walk is synchronous and a context read ends in a signal call, so running it inside a `computed()` records the dependency natively, per key. Each recompute gets a fresh `EvalState` while the `EvalContext` is built once and reused, which is what makes per-key tracking possible.
- **`createSignalContext(source, options?)`**: The context adapter on its own, for callers driving `EvalService` directly. Builds an `EvalContext` whose reads resolve through signals via a `lookups` resolver. Warns in dev mode about one-level nested signals (`{ user: { name: signal('a') } }`), a shape that tracks nothing.
- **`EvalSignalService`**: The DI-first entry point, for callers outside an injection context where the free function would throw `NG0203`. It supplies an injector and forwards everything else unchanged.
- **`EvalSignal.dependencies`**: Behind `trackDependencies`, the dotted paths the last recompute read, built on `eval-core` 0.3.0's `createDependencyTracker()`. A plain getter rather than a signal, so reading it neither triggers a recompute nor subscribes to one. Off by default because a registered read hook costs key resolution at every read site. Combining it with your own `eval.hooks` registry throws at construction rather than installing a hook into a registry the library does not own.
- **`EvalSignal.invalidate()`**: The escape hatch for a source with no reactive surface. Coarse by design and collapsing — three calls between two reads produce one recompute.
- **`EvalSignal.destroy()`**: Drops the compiled callback, the context and the recorded dependencies, and releases the `DestroyRef` registration. Idempotent; a destroyed signal reads `undefined` from that moment rather than from the next dependency change, and `invalidate()` afterwards is a no-op. Auto-teardown comes from the **ambient** injection context only: `options.injector` — which `EvalSignalService.create` always supplies — resolves services and does not scope lifetime, so those signals must be destroyed by hand.
- **`EvalSignalOptions`**: `eval` (forwarded to both the context and the walk, so `caseInsensitive` is set once), `equal`, `onError` (`'throw'` | `'undefined'` | mapper), `trackDependencies`, `injector`.
- **`SignalContextWriteError`**: The keys of a signal context are read-only; an assignment throws this, naming the key and the expression. It bypasses `onError` in every mode — an illegal assignment is a static property of the expression, not a runtime failure to render around.

### Notes
- **No async primitive.** An expression that calls an async function yields a signal carrying the **promise**, which composes with `resource({ params: () => sig(), loader: ({ params }) => params })` — the read must go in `params`, since a loader body runs untracked. `createEvalSignalAsync` is deferred to Phase 5; see the roadmap and the README's limitations.
- **Known limits**, all documented in the README: closures that escape an evaluation are not tracked, a member write (`user.name = 'x'`) bypasses the read-only policy, `SignalContextWriteError.key` is `undefined` under `caseInsensitive`, and nested signals are tracked only at the level that holds the signal.
- Nothing was added to `@zvenigora/ng-eval-core`, which is consumed at its published 0.3.0 surface.

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
