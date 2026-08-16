# @zvenigora/ng-eval-signals

Angular `Signal`s for [`@zvenigora/ng-eval-core`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-core#readme)
expressions.

Evaluate a JavaScript expression over a context of signals and get back a `Signal` that
recomputes **exactly** when a key the expression actually read has changed.

The sources for this package are in the main [@zvenigora/ng-eval](https://github.com/zvenigora/ng-eval)
repo. Expression syntax, security, and the evaluator's own options are documented in the
[repository README](https://github.com/zvenigora/ng-eval#readme); this file documents the
signals library.

## Install

```sh
npm install @zvenigora/ng-eval-signals @zvenigora/ng-eval-core
```

Peer dependencies: `@angular/core >=19` and `@zvenigora/ng-eval-core ^0.3.0`.

## Quick start

```ts
import { Component, signal } from '@angular/core';
import { createEvalSignal } from '@zvenigora/ng-eval-signals';

@Component({ /* … */ })
export class OrderComponent {
  readonly price = signal(10);
  readonly quantity = signal(3);
  readonly shipping = signal(5);

  readonly total = createEvalSignal('price * quantity', {
    price: this.price,
    quantity: this.quantity,
    shipping: this.shipping,
  });
}
```

Reading it from inside the component:

```ts
this.total();              // 30
this.quantity.set(4);
this.total();              // 40  — recomputed
this.shipping.set(0);
this.total();              // 40  — not recomputed: the expression never read `shipping`
```

That last line is the point of the library. The recompute is Angular's own dependency
tracking, not a diff of the context: the expression is walked synchronously inside a
`computed()`, and a context read ends in a *signal call*, so Angular records the dependency
natively — per key, exactly as the walk performed it.

Called from a field initializer as above, the signal is inside an injection context and tears
itself down with the component. See [Lifetime](#lifetime) for every other case.

## How it fits together

| Symbol | What it is |
| :--- | :--- |
| `createEvalSignal(expression, source, options?)` | The primary API. Compiles once, returns an `EvalSignal`. |
| `EvalSignalService.create(…)` | The same thing for callers outside an injection context. See [Lifetime](#lifetime). |
| `createSignalContext(source, options?)` | The context adapter on its own, for use with `EvalService` directly. |
| `SignalContextWriteError` | Thrown when an expression assigns to a context key. |
| `EvalSignal<T>` | `Signal<T>` plus `dependencies`, `invalidate()` and `destroy()`. The factory returns `EvalSignal<unknown>` — an expression's type is not knowable, so narrow at the call site. |
| `EvalSignalOptions` | `eval`, `equal`, `onError`, `trackDependencies`, `injector`. |

`source` is a plain record whose values may be signals, plain values or functions — signals
are unwrapped on read, everything else is passed through. It may also be an `EvalContext` you
built yourself, which is handed to the walk unchanged.

## Options

```ts
createEvalSignal('user.name', { user }, {
  eval: { caseInsensitive: true },   // forwarded to the context *and* the walk
  equal: isDeepEqual,                // computed() equality; default Object.is
  onError: 'undefined',              // 'throw' (default) | 'undefined' | (error) => value
  trackDependencies: true,           // collect `dependencies`; default false
  injector,                          // resolves services outside an injection context
});
```

**`onError`** defaults to `'throw'`, which is a `computed()`'s own behaviour: the error is
cached and rethrown on every read until a dependency changes. `'undefined'` renders a blank
instead, and a function maps the error to a value. Two things are **not** routed through it —
a parse error, which throws from `createEvalSignal` itself because the expression is compiled
eagerly, and a `SignalContextWriteError`, which bypasses `onError` in every mode because an
illegal assignment is a bug in the expression rather than a runtime failure to render around.

**`equal`** matters more than it looks for expressions producing objects or arrays: a fresh
literal per recompute is never `Object.is`-equal to the last one, so every downstream consumer
re-runs.

## Dependency introspection

`trackDependencies: true` records what the **last recompute** read:

```ts
const total = createEvalSignal('price * quantity', { price, quantity, shipping },
  { trackDependencies: true });

total();                  // 30
total.dependencies;       // Set { 'price', 'quantity' }
```

It is a debugging surface, not a reactive one — a plain getter, deliberately, so reading it
neither triggers a recompute nor subscribes anything to it. It is off by default because
registering the read hook turns on key resolution and path reconstruction at every read site
for the whole walk, which a consumer who never reads `dependencies` should not pay for.

Setting it together with your own hook registry (`eval: { hooks }`) **throws at
`createEvalSignal`**, rather than installing a read hook into a registry this library does not
own and cannot hand you an unsubscribe for. The escape hatch is to install
`createDependencyTracker()` on your registry yourself — it is the same tracker.

**An empty set means one of three things, and they look identical.** Either
`trackDependencies` was never set; or it was set and the `computed` has **not run yet**, since
it is lazy and reading `dependencies` does not trigger it — read the signal first; or it ran
and genuinely read nothing. The middle one is the one nothing in the type or the option name
hints at, and it is the usual answer when `dependencies` is empty on a signal you have not
called.

What it reports is not what the signal recomputes on: reactivity is Angular's and is per
signal, not per path. See [Edge cases](#edge-cases-you-may-hit) for where the two diverge.

## Contexts that are not signal-backed

If the source has no reactive surface — a plain object you own and do not want to convert —
nothing can tell the signal it changed, so you say so:

```ts
const total = createEvalSignal('price * quantity', plainObject);

plainObject.quantity = 4;
total.invalidate();   // the next read re-evaluates
```

Coarse by construction: it re-evaluates regardless of what changed, or whether anything did.
Calls collapse — three between two reads produce one recompute.

## Lifetime

`destroy()` ends a signal: it drops the compiled callback, the context and the recorded
dependencies. It is idempotent, and a destroyed signal reads `undefined` from that moment
rather than from the next time a dependency happens to move. `invalidate()` afterwards is a
no-op rather than a throw, because teardown order is not something a consumer controls.

**Auto-teardown is not universal, and the rule is worth learning once:**

| How you create it | `DestroyRef` teardown |
| :--- | :--- |
| `createEvalSignal(…)` in a field initializer, constructor, or other injection context | **Automatic** |
| `createEvalSignal(…, { injector })` | **No** — call `destroy()` yourself |
| `EvalSignalService.create(…)` | **No** — call `destroy()` yourself |

`options.injector` **resolves services; it does not scope lifetime.** The injector a caller has
to hand is routinely a long-lived one — `EvalSignalService` supplies the root injector — and a
teardown callback registered there would be retained for that injector's whole life, once per
signal ever created. So the service, whose entire job is supplying an injector, never
auto-destroys:

```ts
export class PriceComponent implements OnDestroy {
  private readonly signals = inject(EvalSignalService);
  readonly price = signal(10);
  readonly quantity = signal(3);

  readonly total = this.signals.create('price * quantity', {
    price: this.price,
    quantity: this.quantity,
  });

  ngOnDestroy(): void {
    this.total.destroy();
  }
}
```

Use the service when you are outside an injection context — a lifecycle hook, a subscription
callback, a plain method — where the free function would throw `NG0203`.

## Writes are not supported

The keys of a signal context are read-only. An assignment throws `SignalContextWriteError` on
the first read, naming the key and the expression:

```ts
const broken = createEvalSignal('count = 5', { count });

try {
  broken();
} catch (error) {
  if (error instanceof SignalContextWriteError) {
    error.key;          // 'count'
    error.expression;   // 'count = 5'
  }
}
```

A signal write inside a `computed()` is illegal to Angular anyway (`NG0600`), and a derived
value that mutates its own inputs has no stable value. The error is raised by this library so
the message names the cause rather than surfacing an Angular error code from inside a
`TypeError`.

## Async expressions

There is no async primitive in this release — `createEvalSignalAsync` is Phase 5 of the
[roadmap](https://github.com/zvenigora/ng-eval/blob/master/ROADMAP.md). You do not need one to
call an async function: the walk is
synchronous and returns the promise **as the value**, so the signal carries a promise you
compose with in your own application, at your own Angular floor.

```ts
const user = createEvalSignal('loadUser(id)', { id, loadUser });

// The read goes in `params`, never in `loader`.
const userResource = resource({
  params: () => user() as Promise<User>,
  loader: ({ params }) => params,
});
```

**Put the read in `params`.** A `resource`'s loader body runs `untracked`, so
`resource({ loader: () => user() })` computes once and then never reloads when `id` changes —
a signal that silently stops updating. `toSignal` and `rxResource` take an `Observable`, so
they need `from(promise)` first; `resource` is the only one that takes a promise directly.

Three limits apply until Phase 5 closes them:

- **An expression cannot use top-level `await`** — the parser runs at `ecmaVersion: 2020`
  without `allowAwaitOutsideFunction`, so `await load(id)` is a parse error. Inside an async
  arrow it parses and evaluates: `(async () => await load(id))()`.
- **Nested promises are not resolved.** A promise *inside* a returned object or array stays a
  promise; only `eval-core`'s `evaluateAsync` walks a result resolving those, and this library
  does not use it.
- **`onError` never sees a rejection.** The error handling is synchronous, so a rejecting
  promise passes straight through the signal and is yours to catch. Setting
  `onError: 'undefined'` does *not* give you a blank here.

The return type is `EvalSignal<unknown>` — the promise is a runtime shape you narrow to, not
something the type says.

## Before you use it

Four things that decide whether this library fits, rather than surprises you later.

- **Nested signals are not tracked.** `{ user: signal({ name: 'a' }) }` tracks at `user`;
  `{ user: { name: signal('a') } }` tracks **nothing** — the member hop reads the signal
  function itself and never calls it. `createSignalContext` scans one level and warns about
  that shape in dev mode. Signals inside arrays, `Map`s, class instances, or behind getters
  are not scanned at all.
- **`caseInsensitive` has to be passed once, in the right place — and that place depends on
  who built the context.** Through `createEvalSignal`, `eval: { caseInsensitive: true }`
  reaches both halves and is all you need. If you build the context yourself with
  `createSignalContext` and drive it through `EvalService`, you must pass it **twice**: to the
  adapter, which corrects identifier keys, and to the evaluation, which is what corrects
  property names (`user.NAME`).
- **Construct the context once and reuse it.** `createEvalSignal` does this for you; it
  matters if you build contexts yourself. Tracking still works on a context rebuilt inside the
  computation — that part is Angular's — but you pay the allocation and the dev-mode nested
  scan on every read, and you lose `EvalContext` identity, so anything you put on the context
  (prior scopes, extra lookups) has to be rebuilt with it.
- **Async is not a first-class signal** — see [Async expressions](#async-expressions) above.

## Edge cases you may hit

- **A closure that escapes the evaluation is not tracked.** `list.map(x => x.n)` runs during
  the walk and tracks normally, but a closure called *after* the evaluation returns reads
  outside the reactive context. Inherent to Angular's model rather than to this library.
- **`dependencies` reports paths, with three limits.** A computed member (`obj[expr]`) has no
  reconstructible path and contributes nothing; a name used as an arrow parameter anywhere in
  the expression is dropped everywhere in it; and under `caseInsensitive` a key is reported as
  the **expression** spells it, not as your record does — `'PRICE * 2'` over `{ price }`
  reports `PRICE`. None of them affect reactivity.
- **`SignalContextWriteError.key` is `undefined` under `caseInsensitive`.** The evaluator
  resolves the key through `EvalContext.getKey` before writing, and that does not consult the
  resolver a signal context lives in. The message then says `'undefined'`; the throw itself is
  unaffected.
- **A write to a *member* does not throw.** `user.name = 'Bob'` writes into the object your
  signal holds without ever reaching the context, so the read-only policy cannot see it.
  Do not write through expressions.
- **Lookups resolve last.** A key resolvable earlier in `EvalContext.get`'s order shadows the
  source. The adapter starts with an empty `original`, but an empty object is not an *absent*
  one: `Object.prototype` names — `toString`, `valueOf`, `constructor`, `hasOwnProperty` —
  resolve off the prototype, so a source key with one of those names is unreachable.
- **A signal holding `undefined` does not shadow.** `EvalContext.get` treats `undefined` as
  "not found" and keeps going down its resolution order. Tracking is unaffected — the signal
  was called, so the dependency is recorded — but if you pushed another lookup onto the
  context after this one, that lookup answers instead. With a context this library built and
  nothing added to it there is nothing further to reach, so the read simply resolves to
  `undefined`.
- **The arrow-scope guard covers `createEvalSignal`, not a raw context.** An arrow function
  whose body throws leaks its parameter scope onto the context (an `eval-core` defect).
  `createEvalSignal` contains that to the recompute that caused it. A context driven directly
  through `EvalService` keeps the leak, as does an arrow function that escapes the walk and
  throws when you call it later.

## Using the adapter directly

`createSignalContext` is the context on its own, for callers who want `EvalService`:

```ts
const context = createSignalContext({ price, quantity });
const total = computed(() => evalService.simpleEval('price * quantity', context));
```

You keep native per-key tracking and lose what the factory adds: compile-once, `dependencies`,
`invalidate()`, `destroy()`, the arrow-scope guard, and the `caseInsensitive` forwarding above.

## Development

```sh
npx nx run eval-signals:test
npx nx run eval-signals:lint
npx nx run eval-signals:build:production
```
