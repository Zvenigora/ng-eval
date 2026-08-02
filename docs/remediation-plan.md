# Remediation & Fix Plan: `@zvenigora/ng-eval`

**Date**: August 1, 2026  
**Target Package**: `@zvenigora/ng-eval-core` (`modules/eval-core`)  
**Workspace**: Angular v20, Nx v22, TypeScript v5.9  
**Source Audit**: [`docs/repository-audit.md`](repository-audit.md)  
**Objective**: Fix all linting errors, refactor Angular service dependency injection to the modern `inject()` paradigm, clean up repository root debug artifacts, and verify build/test quality gates.

---

## 1. Executive Issue Summary

Based on the technical repository audit (`docs/repository-audit.md`), the core library `@zvenigora/ng-eval-core` compiles and passes all 36 test suites (511 tests). However, 5 lint errors and loose repository debug files were identified that require remediation.

### Identified Issues Matrix

| Issue ID | Scope / File | Severity | Rule / Category | Description |
| :---: | :--- | :---: | :--- | :--- |
| **ERR-1** | `modules/eval-core/package.json:17` | 🔴 Error | `@nx/dependency-checks` | `@angular/common` listed in `peerDependencies` but never imported in `eval-core`. |
| **ERR-2** | `compiler.service.ts:40-41` | 🔴 Error | `@angular-eslint/prefer-inject` | Constructor parameter injection used for `ParserService` and `EvalService`. |
| **ERR-3** | `discovery.service.ts:22` | 🔴 Error | `@angular-eslint/prefer-inject` | Constructor parameter injection used for `ParserService`. |
| **ERR-4** | `eval.service.ts:25` | 🔴 Error | `@angular-eslint/prefer-inject` | Constructor parameter injection used for `ParserService`. |
| **HYG-1** | Root Directory | 🟡 Warning | Repository Hygiene | Unused root debug scripts (`debug-ast.js`, `debug-proto.js`, `debug-prototype.js`). |
| **HYG-2** | `docs/steps.txt` | 🟡 Warning | Documentation | Stale scratchpad notes file in documentation directory. |

---

## 2. Step-by-Step Remediation Actions

### Action 1: Remove Unused Peer Dependency (`modules/eval-core/package.json`)

* **File**: `modules/eval-core/package.json`
* **Root Cause**: The package `eval-core` is a pure expression evaluation engine relying on `@angular/core`, `acorn`, and `acorn-walk`. It does not import or use components/directives from `@angular/common`.
* **Fix**: Remove `"@angular/common": ">=19.0.0"` from `peerDependencies`.

```json
// Before:
"peerDependencies": {
  "@angular/common": ">=19.0.0",
  "@angular/core": ">=19.0.0"
}

// After:
"peerDependencies": {
  "@angular/core": ">=19.0.0"
}
```

---

### Action 2: Refactor Angular Service Dependency Injection (`inject()`)

Refactor all Angular services in `modules/eval-core/src/lib/actual/services/` to use Angular's modern `inject()` functional dependency injection.

#### 2.1 Refactor `EvalService` (`eval.service.ts`)
* **File**: `modules/eval-core/src/lib/actual/services/eval.service.ts`
* **Changes**:
  1. Add `inject` import from `@angular/core`.
  2. Replace constructor parameter injection of `ParserService` with field initialization using `inject(ParserService)`.
  3. Update constructor to pass `inject(ParserService)` to `super()`.

```typescript
// Before:
export class EvalService extends BaseEval implements OnDestroy {
  constructor(
    protected override parserService: ParserService
  ) {
    super(parserService);
    this.parserOptions = defaultParserOptions;
  }
}

// After:
export class EvalService extends BaseEval implements OnDestroy {
  protected override parserService = inject(ParserService);

  constructor() {
    super(inject(ParserService));
    this.parserOptions = defaultParserOptions;
  }
}
```

#### 2.2 Refactor `CompilerService` (`compiler.service.ts`)
* **File**: `modules/eval-core/src/lib/actual/services/compiler.service.ts`
* **Changes**:
  1. Add `inject` import from `@angular/core`.
  2. Inject `ParserService` and `EvalService` as class fields using `inject()`.
  3. Remove parameters from constructor and pass `inject(ParserService)` to `super()`.

```typescript
// Before:
export class CompilerService extends BaseEval implements OnDestroy {
  constructor(
    protected override parserService: ParserService,
    protected evalService: EvalService
  ) {
    super(parserService);
    this.parserOptions = defaultParserOptions;
    this.setupCacheCleanup();
  }
}

// After:
export class CompilerService extends BaseEval implements OnDestroy {
  protected override parserService = inject(ParserService);
  protected evalService = inject(EvalService);

  constructor() {
    super(inject(ParserService));
    this.parserOptions = defaultParserOptions;
    this.setupCacheCleanup();
  }
}
```

#### 2.3 Refactor `DiscoveryService` (`discovery.service.ts`)
* **File**: `modules/eval-core/src/lib/actual/services/discovery.service.ts`
* **Changes**:
  1. Add `inject` import from `@angular/core`.
  2. Inject `ParserService` using `inject(ParserService)`.
  3. Update constructor to no longer take constructor parameters.

```typescript
// Before:
export class DiscoveryService extends BaseEval {
  constructor(
    protected override parserService: ParserService
  ) {
    super(parserService);
    this.parserOptions = { ...defaultParserOptions, cacheSize: undefined };
  }
}

// After:
export class DiscoveryService extends BaseEval {
  protected override parserService = inject(ParserService);

  constructor() {
    super(inject(ParserService));
    this.parserOptions = { ...defaultParserOptions, cacheSize: undefined };
  }
}
```

---

### Action 3: Repository Hygiene & Cleanup

1. **Root Debug Scripts**:
   * Move loose root scripts (`debug-ast.js`, `debug-proto.js`, `debug-prototype.js`) into a structured `scripts/debug/` directory or delete them if obsolete.
2. **Documentation Scratchpad**:
   * Review `docs/steps.txt` and clean up or consolidate into standard documentation guides.

---

## 3. Quality Assurance & Verification Plan

After applying the fixes, execute the following full verification pipeline:

| Gate | Command | Expected Outcome |
| :--- | :--- | :--- |
| **Linting** | `npx nx run eval-core:lint` | 🟢 **0 errors, 0 warnings** |
| **Unit Testing** | `npx nx run eval-core:test` | 🟢 **36/36 test suites passing (511 tests)** |
| **Build Verification** | `npx nx run eval-core:build:production` | 🟢 **Clean build into `dist/modules/eval-core`** |

---

## 4. Execution Tracking

| Phase | Milestone | Status |
| :--- | :--- | :---: |
| **Phase 1** | Repository Audit & Issue Identification | ✅ **COMPLETED** |
| **Phase 2** | Remediation Plan Updated (`docs/remediation-plan.md`) | ✅ **COMPLETED** |
| **Phase 3** | Code Remediation (Package dependencies & `inject()` refactoring) | ✅ **COMPLETED** |
| **Phase 4** | Repository Hygiene Cleanup (Debug scripts & docs) | ✅ **COMPLETED** |
| **Phase 5** | Final Verification (Lint, Test, Build) | ✅ **COMPLETED** |

---

*Plan updated and synchronized with `docs/repository-audit.md` findings.*
