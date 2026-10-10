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

Peer dependencies: `@angular/core >=19` and `@zvenigora/ng-eval-core >=0.11.0 <0.12.0`. The floor
is the write guard, which needs `eval-core` 0.11.0 to ask about a built-in method's write as well
as a member write — see [Writes are not supported](#writes-are-not-supported).

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
| `createEvalSignalAsync(expression, source, options?)` | The async counterpart. Resolves the expression's value as `evaluateAsync` does, and returns an `EvalSignalAsync`. |
| `EvalSignalService.createAsync(…)` | The same, for callers outside an injection context. |
| `createSignalContext(source, options?)` | The context adapter on its own, for use with `EvalService` directly. |
| `SignalContextWriteError` | Thrown when an expression assigns to a context key, or to a member of anything it did not create. |
| `EvalSignal<T>` | `Signal<T>` plus `dependencies`, `invalidate()` and `destroy()`. The factory returns `EvalSignal<unknown>` — an expression's type is not knowable, so narrow at the call site. |
| `EvalSignalAsync<T>` | `EvalSignal<T>` plus `status`. The value reads `undefined` while a run is pending. |
| `EvalSignalStatus` | `'idle'`, `'loading'`, `'resolved'` or `'error'` — the words Angular's `ResourceStatus` uses for those states. |
| `EvalSignalOptions` | `eval`, `equal`, `onError`, `trackDependencies`, `injector`. |
| `EvalSignalAsyncOptions` | `EvalSignalOptions` plus `abortSignalKey`: the name under which each run's own `AbortSignal` is visible to its walk. |

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
const price = signal(10);
const quantity = signal(3);
const shipping = signal(5);

const total = createEvalSignal('price * quantity', { price, quantity, shipping },
  { trackDependencies: true });

total();                  // 30
total.dependencies;       // Set { 'price', 'quantity' }
```

It is a debugging surface, not a reactive one — a plain getter, deliberately, so reading it
neither triggers a recompute nor subscribes anything to it. It is off by default because
registering the read hook turns on key resolution and path reconstruction at every read site
for the whole walk, which a consumer who never reads `dependencies` should not pay for.

**Under `caseInsensitive`, a path's first segment is spelled as your record spells it** (since
0.2.0): `'PRICE * QUANTITY'` over the record above reports `price` and `quantity`. Only the
first segment — the key of the record — is respelled; the rest are property names inside a
value and stay as the expression wrote them, so `'user.NAME'` over `{ user }` reports `user` and
`user.NAME`. Without `caseInsensitive` every segment is as written, which is then also how the
record spells it.

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
const plainObject = { price: 10, quantity: 3 };

const total = createEvalSignal('price * quantity', plainObject);

total();              // 30

plainObject.quantity = 4;
total.invalidate();   // the next read re-evaluates
total();              // 40
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
const count = signal(1);

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

**A signal expression may write into what it created — object, array and regex literals, rest
values, arrow functions — and not into anything it was given or got back from a call.** Since
0.3.0, `user.name = 'Bob'` throws `SignalContextWriteError` with `kind` `'member'` and `key`
`'name'`, and so do `user.n++`, `let u = user; u.name = 'Bob'` and
`[user].map(u => (u.name = 'Bob'))`. Up to 0.2.x each of them wrote into the object your signal
holds. A call's result counts as given even when it is new, because a call can as easily hand
back your own object — `[user].find(u => true)` does.

To change something you were given, spread it into a literal first, and write into the copy:

```ts
const user = signal({ name: 'Ada', tags: ['a'] });

const renamed = createEvalSignal('let u = { ...user }; u.name = "Bob"; u', { user });
renamed();   // { name: 'Bob', tags: ['a'] } — user() is unchanged

const marked = createEvalSignal('let t = [...user.tags.map(s => s + "!")]; t[0] = "x"; t', { user });
marked();    // ['x']
```

A spread copies one level: `u.tags` above is still your array, and writing into it throws.

**A built-in method that would write into what the expression was given is refused too, since
0.4.0.** `user.tags.push('x')`, `user.tags.sort()`, `splice` and the rest of `Array`'s mutators,
the typed arrays' own, `Map#set`, `Set#add` and their removers, a `Date`'s setters, and, when
your context supplies `Object`, `Object.assign(user, …)` and `Object`'s other mutators each throw
`SignalContextWriteError` with `kind` `'method'` and `key` naming the method,
`'Array.prototype.push'`. The message says what to call instead where JavaScript has it —
`toSorted`, `toReversed`, `toSpliced`, `with` — or to spread the value into a literal and change
the copy. Up to 0.3.x each of these calls went through and
mutated your data. On a copy the expression made they still work: `[...user.tags].sort()`.
Reached through `call`, `apply` or `bind` — `[].push.call(user.tags, 'x')` — a method is refused
as a direct call of it is, and `bind` is refused when it binds.

Two things this does not catch:

- **A regex you supplied keeps its `lastIndex` behaviour.** With a global or sticky regex, `test`
  and `exec` advance it, and `match`, `replace` and `replaceAll` given a global one reset it to 0.
  Refusing them would break the commonest rule there is, `pattern.test(value)`.
- **A method you wrote is your own code**, and runs as written, whatever it is called.

**The cost** is a record of each object an expression creates, kept only for a signal context,
and a lookup of each function called in a table of the built-ins above. `eval-core` does both for
a context that asks, and nothing extra for one that does not.

## Async expressions

`createEvalSignalAsync` evaluates an expression whose value is a promise, or holds promises,
and gives you the resolved value as a signal (since 0.5.0):

```ts
import { signal } from '@angular/core';
import { createEvalSignalAsync } from '@zvenigora/ng-eval-signals';

const id = signal(1);
const user = createEvalSignalAsync('loadUser(id)', { id, loadUser });

user();           // undefined
user.status();    // 'loading'

// … once loadUser(1) resolves
user();           // { id: 1, name: 'Ada' }
user.status();    // 'resolved'

id.set(2);
user();           // undefined — this read starts the run for id 2
user.status();    // 'loading'
```

It takes what `createEvalSignal` takes — the same source, every option, and the same
[Lifetime](#lifetime) rules — and returns an `EvalSignal` with a `status` signal beside the
value. `EvalSignalService.createAsync` is the same for callers outside an injection context,
and like `create` it never tears a signal down for you.

**Tracking is unchanged.** The walk runs inside a `computed()` and has finished before the
promise exists, so every key it reads is tracked exactly as `createEvalSignal` tracks it, and
`dependencies` reports the last run started. What runs after the promise resolves is not
tracked — see [Two signals instead of `await`](#two-signals-instead-of-await).

**A run starts at the first read after a change, not at the change.** A changed key marks the
run stale, and reading the value or `status` starts the next one; that read is what supersedes
the old run. Until a run settles the signal reads `undefined` — even
`createEvalSignalAsync('1 + 1', {})`, which settles a few microtasks later, because the result
always goes through `await`s.

| Moment | `value()` | `status()` |
| :--- | :--- | :--- |
| A run is pending — the first, or any later one | `undefined` | `'loading'` |
| The current run resolved with `v` | `v` | `'resolved'` |
| The current run rejected with `e` | per `onError`, below | `'error'` |
| Destroyed | `undefined` | `'idle'` |

The words are the ones Angular's `ResourceStatus` uses for those states. There is no
`'reloading'`: a new run discards the previous value, and so does `invalidate()`, which counts
as a change — a source with no reactive surface calls it because its data changed, so keeping
the old value would show data for inputs that no longer hold. A superseded run settles into
nothing: its value or rejection is discarded whichever order the runs settle in, and no
rejection goes unhandled.

**A rejection goes through `onError`, with the contract it has on the sync path.** `'throw'`,
the default, rethrows it on every read until a new run starts; `'undefined'` reads `undefined`;
a function is called once per rejected run, and its result is what every read returns. A
promise that rejects with something other than an `Error` arrives wrapped in one, as
`eval-core`'s `evaluateAsync` wraps it. `status()` reads `'error'` in every mode, which is how
you tell a rejection from a pending run under `'undefined'`. A throw during the walk itself is
not thrown from the read: it rejects the run with what was thrown, unwrapped, and arrives once
the run settles. `SignalContextWriteError` still bypasses `onError` in every mode, and is
rethrown on every read once its run has settled.

**`destroy()`** reads `undefined` and `'idle'` from that moment. A run still pending stops
holding the application ([Stability](#stability)) and, with `abortSignalKey` set, is aborted
([Cancellation](#cancellation)); its late settlement changes nothing, and `invalidate()`
afterwards is a no-op.

Tested at Angular 19.2, 20.3, 21.2 and 22.2: the async signal's own specs pass at each, with the
library unmodified ([Phase 5 plan](https://github.com/zvenigora/ng-eval/blob/master/docs/signals/phase-5-plan.md),
§ 8 q1).

### Two signals instead of `await`

There is no `await` in an expression. Top-level `await` is a parse error — the parser runs at
`ecmaVersion: 2020` without `allowAwaitOutsideFunction` — and stays one: a promise enters the
walk as a call's return value, the walk finishes, and only then is the result resolved. A
promise in operand position is therefore an operand: `loadUser(id).name` reads `name` off the
promise, and is `undefined`.

Write it as two signals. An `EvalSignalAsync` is a `Signal`, so it can be a value in another
signal context's source, and a `createEvalSignal` over it tracks it like any other:

```ts
const id = signal(1);
const user = createEvalSignalAsync('loadUser(id)', { id, loadUser });
const role = signal('admin');

const label = createEvalSignal('user ? user.name + " (" + role + ")" : "loading"', { user, role });

label();          // 'loading'

// … once loadUser(id) resolves
label();          // 'Ada (admin)'

role.set('owner');
label();          // 'Ada (owner)' — and no new run of `user`
```

`user` reads `undefined` while its run is pending, hence the conditional.

**This is also the tracked way to use a resolved value.** `loadUser(id).then(u => u.name + role)`
evaluates, but the arrow runs when the promise resolves — after the walk, outside the reactive
context — so `role` is not tracked, and changing it starts no run. In the two-signal form every
read is made by a walk.

**An `async` arrow's `await` is a pass-through.** `(async () => await loadUser(id))()` parses
and evaluates, but `eval-core` does not suspend at the `await`: it hands the walk the promise as
an operand, and the walk carries on. That is right only where the `await` is the arrow's
result, as here. `(async () => (await loadUser(id)).name)()` is `undefined`, and
`(async () => (await p) * 10)()` is `NaN`; write those as two signals too. This is `eval-core`'s
[BL-A24](https://github.com/zvenigora/ng-eval/blob/master/docs/backlog.md#a24).

### What is resolved

Exactly what `eval-core`'s `evaluateAsync` resolves: the value if it is a promise, and promises
nested in arrays and plain objects, at any depth — `[loadUser(1), { b: loadUser(2) }]` resolves
both. A promise inside a promise's resolved value is not resolved, and neither is one inside a
`Map`, a class instance or a null-prototype object.

**Every plain object and array the walk produces is rebuilt on each run** — a literal, or one
read from the source — while a promise's resolved value comes back as it is. So an
object-valued expression is a new object on every run, the default `Object.is` equality never
finds two runs equal, and every consumer of the value re-runs. `equal` is forwarded to the
value, as on `createEvalSignal`, and a structural one keeps the last value when a run's result
has not changed — provided nothing read the value while the run was pending, since that read
returned `undefined`. Reading `status()` first, and the value only once it is `'resolved'`, is
the shape that lets it.

### Cancellation

Name a key with `abortSignalKey`, and each run gets an `AbortController` of its own, whose
`AbortSignal` the expression can hand to your function:

```ts
const id = signal(1);
const loadUser = (userId: number, abort: AbortSignal) =>
  fetch(`/api/users/${userId}`, { signal: abort }).then((response) => response.json());

const user = createEvalSignalAsync('loadUser(id, abort)', { id, loadUser }, {
  abortSignalKey: 'abort',
});
```

A run's signal is aborted when a newer run supersedes it — at the first read after a change,
not at the change — and on `destroy()`; it is not aborted when the run settles. It is bound for
the walk alone, as a scope pushed for it: a closure the promise calls later resolves `abort`
like any other name, and `dependencies` never reports it.

**The key is checked at construction**, and the factory throws, naming the option and the key:

- when no expression could read it — a name that is not an identifier (`'abort-signal'`), a
  reserved word (`'new'`), or one `eval-core`'s identifier guard refuses (`'constructor'`,
  `'__proto__'`);
- when a record source already has it — exactly, or under `caseInsensitive` by case, whatever
  it holds, `undefined` included — since the binding would shadow it in every run.

That second check sees the record **at construction only**: a key added to it later is
shadowed silently. A caller-built `EvalContext` is not checked at all, so keeping the name
free there is yours.

**An abort listener must not read, invalidate or destroy the signal it belongs to.** A
supersede aborts the old run inside the read that starts the new one — inside the signal's own
recomputation — so a read there throws Angular's cycle error into the listener, which a browser
reports and Node treats as an uncaught exception, and an `invalidate()` there is missed. Other
signals are fine: the listener runs untracked, so a read adds no dependency, and a write lands
before the new run's walk, which sees it.

### Stability

Each run holds the application unstable through Angular's `PendingTasks` until it settles, is
superseded or the signal is destroyed, whichever comes first — so
`ApplicationRef.whenStable()`, and server rendering, wait for the value rather than rendering
`undefined`. A superseded run that never settles holds nothing. Until the read that supersedes
it, though, the old run is still the current one: with nothing reading the signal, stability
waits for that run, not for one nobody has started.

This is what a zoneless application waits on — `provideZonelessChangeDetection()`, or
`provideExperimentalZonelessChangeDetection()` on Angular 19. `PendingTasks` comes from the
injection context, or from `injector` when you pass one; `EvalSignalService.createAsync` passes
the root injector, so its signals hold the application's own stability too.

### The sync path still carries the promise

`createEvalSignal` resolves nothing. For a promise-returning expression its value is the
promise itself, unresolved, as it always was — yours to unwrap if you would rather do it in your
own application. `resource` takes a promise directly; put the read in `params`:

```ts
const user = createEvalSignal('loadUser(id)', { id, loadUser });

// Angular 20 and later. The read goes in `params`, never in `loader`.
const userResource = resource({
  params: () => user() as Promise<User>,
  loader: ({ params }) => params,
});
```

On Angular 19 the option and the loader's parameter are named `request`:

```ts
const userResource = resource({
  request: () => user() as Promise<User>,
  loader: ({ request }) => request,
});
```

**Put the read in `params`** — or `request`. A `resource`'s loader body runs `untracked`, so
`resource({ loader: () => user() })` loads once and never reloads when `id` changes: a signal
that silently stops updating. `toSignal` and `rxResource` take an `Observable`, so they need
`from(promise)` first. On this path a promise nested in the result stays a promise, and a
rejection is the promise's to deliver — `onError` never sees it.

Both factories return `<unknown>`: the promise, or what it resolves to, is a runtime shape you
narrow to, not something the type says.

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
- **An async signal reads `undefined` until its run settles** — at the first read, even for
  `'1 + 1'`, and again at every run a change starts, since there is no stale-while-revalidate.
  And there is no `await` in an expression: what you do with a resolved value goes in a second
  signal. See [Async expressions](#async-expressions) above.

## Edge cases you may hit

- **A closure that escapes the evaluation is not tracked.** `list.map(x => x.n)` runs during
  the walk and tracks normally, but a closure called *after* the evaluation returns reads
  outside the reactive context. Inherent to Angular's model rather than to this library.
- **`dependencies` reports paths, with three limits.** A computed member (`obj[expr]`) has no
  reconstructible path and contributes nothing; a name used as an arrow parameter anywhere in
  the expression is dropped everywhere in it; and under `caseInsensitive` only a path's first
  segment is spelled as your record does — `'USER.NAME'` over `{ user }` reports `user.NAME`.
  Up to 0.1.x the first segment was as the expression spelled it too. None of them affect
  reactivity.
- **Only your own record's keys are respelled.** Under `caseInsensitive` a signal context names
  a key of *its own* record as the record spells it — in `dependencies` and in
  `SignalContextWriteError.key`, which since 0.2.0 is `count` for `COUNT = 5` over `{ count }`
  rather than `undefined`. A name something else resolves — an arrow parameter, a prior scope,
  a lookup you pushed onto the context — gets `eval-core`'s answer, which for a lookup is the
  name as the expression wrote it.
- **Lookups resolve last.** A key resolvable earlier in `EvalContext.get`'s order shadows the
  source. The adapter starts with an empty `original`, but an empty object is not an *absent*
  one: up to `eval-core` 0.10.x, `Object.prototype` names — `toString`, `valueOf`,
  `constructor`, `hasOwnProperty` — resolved off the prototype. Since 0.11.0 `eval-core` refuses
  them, and the rest of its prototype-pollution blocklist, as an identifier or a member of
  `this`, so an expression naming one throws. A source key with one of those names is
  unreachable either way.
- **A signal holding `undefined` does not shadow.** `EvalContext.get` treats `undefined` as
  "not found" and keeps going down its resolution order. Tracking is unaffected — the signal
  was called, so the dependency is recorded — but if you pushed another lookup onto the
  context after this one, that lookup answers instead. With a context this library built and
  nothing added to it there is nothing further to reach, so the read simply resolves to
  `undefined`.
- **The scope guard covers `createEvalSignal`, not a raw context.** `EvalContext.push` and
  `pop` are public, so a function in your source can push a scope onto the context and never
  pop it, and every later read of that name finds the scope first. `createEvalSignal` unwinds
  the context to the depth it started at after every recompute; a context you drive directly
  through `EvalService` gets no such unwind. Up to 0.2.x this bullet described an `eval-core`
  defect that leaked an arrow function's parameter scope; `eval-core` fixed it in 0.4.0, and
  0.3.0's peer floor of 0.10.0 excludes the versions that had it.

## Using the adapter directly

`createSignalContext` is the context on its own, for callers who want `EvalService`:

```ts
import { EvalService } from '@zvenigora/ng-eval-core';

const price = signal(10);
const quantity = signal(3);
const evalService = inject(EvalService);

const context = createSignalContext({ price, quantity });
const total = computed(() => evalService.simpleEval('price * quantity', context));

total();   // 30
```

You keep native per-key tracking and lose what the factory adds: compile-once, `dependencies`,
`invalidate()`, `destroy()`, the scope guard, and the `caseInsensitive` forwarding above.

## Development

```sh
npx nx run eval-signals:test
npx nx run eval-signals:lint
npx nx run eval-signals:build:production
```
