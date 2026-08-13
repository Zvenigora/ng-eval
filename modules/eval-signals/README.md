# @zvenigora/ng-eval-signals

Angular `Signal`s for [`@zvenigora/ng-eval-core`](../eval-core/README.md) expressions:
evaluate an expression over a context of signals and let Angular track exactly the keys the
expression read.

> **Status: in progress.** Only `createSignalContext` has landed so far; `createEvalSignal`
> and the DI surface follow. See [`docs/signals/phase-3-plan.md`](../../docs/signals/phase-3-plan.md).

## Install

```sh
npm install @zvenigora/ng-eval-signals @zvenigora/ng-eval-core
```

## `createSignalContext`

`createSignalContext(source)` builds an `EvalContext` whose reads resolve *through* signals.
The context is not itself reactive — what makes it work is that a context read ends in a
signal call, so an evaluation performed inside a `computed()` is tracked by Angular
natively, per key:

```ts
import { computed, signal } from '@angular/core';
import { EvalService } from '@zvenigora/ng-eval-core';
import { createSignalContext } from '@zvenigora/ng-eval-signals';

const price = signal(10);
const quantity = signal(3);
const shipping = signal(5);

const context = createSignalContext({ price, quantity, shipping });
const total = computed(() => evalService.simpleEval('price * quantity', context));

total();            // 30
quantity.set(4);
total();            // 40  — recomputed
shipping.set(0);
total();            // 40  — not recomputed; the expression never read `shipping`
```

Construct the context **once** and reuse it across recomputes.

## Limitations

- **Nested signals are not tracked.** `{ user: signal({ name: 'a' }) }` tracks at `user`;
  `{ user: { name: signal('a') } }` tracks nothing — the member hop reads the signal
  function itself and never calls it. `createSignalContext` scans one level and warns about
  this shape in dev mode. Signals inside arrays, `Map`s, class instances, or behind getters
  are not scanned.
- **Lookups resolve last.** A key already resolvable earlier in `EvalContext.get`'s order
  shadows the source. The adapter starts with an empty `original`, but an empty object is
  not an *absent* one: `Object.prototype` names — `toString`, `valueOf`, `constructor`,
  `hasOwnProperty` — resolve off the prototype, so a source key with one of those names is
  unreachable.
- **`caseInsensitive` has to be passed twice.** Given to `createSignalContext` it corrects
  identifier keys, which the resolver sees raw. Property names are corrected by the
  evaluator's member visitor from the *evaluation's* options, so `user.NAME` also needs
  `simpleEval(expr, context, { caseInsensitive: true })`.
- **A closure that escapes the evaluation is not tracked.** `list.map(x => x.n)` runs during
  the walk and tracks normally, but a closure called after the evaluation returns reads
  outside the reactive context. This is inherent to Angular's tracking model.

## Development

```sh
npx nx run eval-signals:test
npx nx run eval-signals:lint
npx nx run eval-signals:build:production
```
