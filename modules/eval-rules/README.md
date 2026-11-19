# @zvenigora/ng-eval-rules

Rules for [`@zvenigora/ng-eval-core`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-core#readme)
expressions: a rule compiled once and evaluated to a result.

**This package is not published.** It is at version 0.0.0 while it is built, and its first release
will be 0.1.0. Until then this file is a stub.

## Install

The package is not on npm yet. Its peer dependency is `@zvenigora/ng-eval-core >=0.16.0 <0.17.0`.

## What it exports

One constant, `RULES_PLACEHOLDER`, so that the checks on the package's exports have an export to
read. The first function the package exports replaces it.

```ts
import { RULES_PLACEHOLDER } from '@zvenigora/ng-eval-rules';
```

## Security

**ng-eval is not a sandbox.** An expression reaches whatever its context holds, and every function
in the context runs with the host's privileges.
[`SECURITY.md`](https://github.com/zvenigora/ng-eval/blob/master/SECURITY.md) covers the threat
model, the protections the code has, and where they stop.
