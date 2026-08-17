# @zvenigora/ng-eval-forms

Runtime string expressions driving Angular form field properties, built on
[`@zvenigora/ng-eval-core`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-core)
and
[`@zvenigora/ng-eval-signals`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-signals).

**Work in progress.** Phase 4 step 1 has wired the two entry points; the field schema,
the control mirror and the `visible` / `text` properties land in later steps. The full
README is step 6.

## Entry points

| Import | Contains |
| :--- | :--- |
| `@zvenigora/ng-eval-forms` | The shared core — context composition, and the error policy and coercion rules both adapters use. Imports nothing from `@angular/core` or `@angular/forms`. |
| `@zvenigora/ng-eval-forms/reactive` | The Angular Reactive Forms adapter — `FormGroup` / `FormControl`. |

A `/signals` entry point for Angular's Signal Forms is designed but not built; see
[the Phase 4 plan](https://github.com/zvenigora/ng-eval/blob/master/docs/forms/phase-4-plan.md)
§ 9.

## Versions

The package declares **one** peer range, at the floor: `@angular/core >=19.0.0` and
`@angular/forms >=19.0.0`. `peerDependencies` are per package, not per entry point, so a
narrower range for a single entry point is not expressible. When `/signals` ships it will
require **Angular 22 or later**, and an older consumer importing it gets
`Cannot find module '@angular/forms/signals'` from Angular's own `exports` map.

## Running unit tests

```sh
npx nx test eval-forms
```
