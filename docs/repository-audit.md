# Repository Audit Report: `@zvenigora/ng-eval`

**Date**: July 31, 2026  
**Repository**: [Zvenigora/ng-eval](https://github.com/Zvenigora/ng-eval)  
**Package**: `@zvenigora/ng-eval` (`@zvenigora/ng-eval-core`)  
**Version**: `0.2.3`  
**Framework**: Angular v20, Nx v22, TypeScript v5.9  

---

## Executive Summary

An in-depth technical audit was conducted on the `@zvenigora/ng-eval` repository. The project is an Angular expression evaluation library that parses JavaScript/Angular expressions into ASTs via [Acorn](https://github.com/acornjs/acorn) and evaluates them using a safe, custom AST visitor traversal engine.

### Key Audit Findings

| Category | Status | Details |
| :--- | :---: | :--- |
| **Build** | 🟢 **PASS** | `nx run eval-core:build:production` compiles cleanly to `dist/modules/eval-core` (Time: ~1.2s). |
| **Unit Tests** | 🟢 **PASS** | **36/36 test suites passed** (511/511 tests passing, 0 failures). |
| **Linting** | 🔴 **FAIL** | **5 lint errors** detected by `nx run eval-core:lint` (1 dependency check error, 4 Angular ESLint `prefer-inject` errors). |
| **Security** | 🟢 **SECURE** | Hardened against prototype pollution (`__proto__`, `constructor`), function call hijacking, and async resource exhaustion. |
| **Performance** | 🟢 **OPTIMIZED** | AST caching in `ParserService` & `CompilerService` (LRU with 10m TTL), O(1) case-insensitive property lookup cache. |
| **Repository Hygiene** | 🟡 **NEEDS CLEANUP** | Unused root debug scripts (`debug-ast.js`, `debug-proto.js`, `debug-prototype.js`) and unreferenced peer dependencies. |

---

## 1. Architecture & Design Review

### Workspace Structure
The project is structured as an **Nx Workspace** containing a single primary library project:
- **Root `package.json`**: Controls workspace tools (`@nx/*`, `@angular/*`, `acorn`, `jest`, `eslint`).
- **`modules/eval-core`**: The main Angular library module (`@zvenigora/ng-eval-core`).
  - `src/lib/actual/services/`: Angular injectable services exposed to library consumers.
  - `src/lib/internal/classes/`: Core state, context, registry, queue, stack, and memory management implementations.
  - `src/lib/internal/functions/`: Functional wrappers around parse, compile, and evaluate routines.
  - `src/lib/internal/visitors/`: Individual AST node visitors (`member-expression`, `call-expression`, `binary-expression`, etc.).

### Service Hierarchy
1. **`ParserService`**: Parses expressions into ES6/ES2023 ASTs via Acorn with LRU AST caching.
2. **`BaseEval`**: Abstract base class holding common parser options and state factory methods.
3. **`EvalService`**: Evaluates expressions synchronously (`simpleEval`, `eval`) or asynchronously (`simpleEvalAsync`, `evalAsync`) with state and context lifecycle tracking for garbage collection.
4. **`CompilerService`**: Compiles expressions into reusable state callback functions (`compile`, `compileAsync`) backed by an LRU compilation cache.
5. **`DiscoveryService`**: AST inspection utility for extracting matching node types (`extract`).

---

## 2. Build, Test, and Quality Analysis

### Build Verification
- **Command**: `npm run build` (`nx run eval-core:build:production`)
- **Outcome**: **SUCCESS**
- **Artifacts**: Generated FESM and DTS bundles placed in `dist/modules/eval-core`.

### Test Suite Health
- **Command**: `npm test` (`nx run eval-core:test`)
- **Outcome**: **36 Passed, 0 Failed (511 Total Tests)**
- **Coverage Highlights**:
  - `eval.service.prototype-pollution.spec.ts`: Validates defense against object prototype attacks.
  - `eval.service.call-security.spec.ts`: Validates function call restrictions and execution limits.
  - `eval.service.memory-leaks.spec.ts`: Validates resource disposal on service `ngOnDestroy`.
  - `eval.service.async-error-handling.spec.ts`: Validates promise rejection and async boundaries.

### Linting Issues
- **Command**: `npm run lint` (`nx run eval-core:lint`)
- **Outcome**: **5 Errors Detected**

#### Detailed Lint Breakdown:
1. **Unused Peer Dependency**:
   - `modules/eval-core/package.json:17`: `@angular/common` listed in `peerDependencies` but not imported anywhere in `eval-core`.
2. **Angular ESLint `prefer-inject` Warnings**:
   - `modules/eval-core/src/lib/actual/services/compiler.service.ts`: Lines 40, 41
   - `modules/eval-core/src/lib/actual/services/discovery.service.ts`: Line 22
   - `modules/eval-core/src/lib/actual/services/eval.service.ts`: Line 25

---

## 3. Security & Vulnerability Audit

### AST Traversal & Evaluation Security
- **Prototype Pollution Guard** (`prototype-pollution-guard.ts`):
  - Explicitly blocks access to forbidden keys: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`.
- **Function Call Isolation**:
  - Validates function invocation targets; blocks execution of dangerous native constructors (e.g. `Function('...')`).
- **Async Execution Safety**:
  - Automatic error boundary wrapping and resource disposal to prevent unhandled rejections and memory growth.

### Dependency Security
- **Override in Root `package.json`**:
  ```json
  "overrides": {
    "qs": "^6.14.1"
  }
  ```
  Prevents transitive `qs` prototype pollution vulnerability in development toolchains.

---

## 4. Code Quality & Repository Hygiene

### Root Directory Leftovers
The project root contains three standalone debugging scripts:
- `debug-ast.js`: Minimal script printing Acorn AST structures.
- `debug-proto.js`: Prototype pollution manual verification script.
- `debug-prototype.js`: Variant prototype inspection script.

*Recommendation*: Move these into a `scripts/debug/` directory or delete them if no longer needed.

### Documentation Consistency
- Existing markdown documents (`SECURITY.md`, `IMPROVEMENTS.md`, `PERFORMANCE.md`) accurately reflect recent security and performance work completed in August 2025.
- `docs/steps.txt` contains stale scratchpad notes that should be archived or formalized.

---

## 5. Actionable Remediation Plan

### Priority 1: Fix Lint Errors (Immediate)
1. **Remove Unused Peer Dependency**:
   - In `modules/eval-core/package.json`, remove `@angular/common` from `peerDependencies`.
2. **Refactor Services to `inject()`**:
   - Update `CompilerService`, `DiscoveryService`, and `EvalService` to use Angular's `inject(ParserService)` function instead of constructor parameter injection.

### Priority 2: Repository Cleanup
1. Remove or relocate root debug scripts (`debug-ast.js`, `debug-proto.js`, `debug-prototype.js`).
2. Clean up `docs/steps.txt` or integrate relevant documentation into structured guides.

---

*Report generated by Claude Code Audit process.*
