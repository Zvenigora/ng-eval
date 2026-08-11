# @zvenigora/ng-eval-core

An expression evaluator for Angular. 

The sources for this package are in the main [@zvenigora/ng-eval](https://github.com/zvenigora/ng-eval) repo. 

This library was generated with [Nx](https://nx.dev).

Full documentation — parsing, evaluation, compilation, async evaluation, discovery, and the `caseInsensitive` / state / scope options — is in the [repository README](https://github.com/zvenigora/ng-eval#readme). This file documents the options that need more than a snippet.

## Options

### Per-node timing

Set `trackTime` to `true` to accumulate per-node-type timings for an evaluation. They are read back from the state as `nodeTimings`, so this option needs the state-first style — `simpleEval` builds its state internally and never hands it back.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

private service: EvalService;
...
const context = { a: 2, b: 3, c: 4 };
const state = service.createState(context, { trackTime: true });

const result = service.eval('a + b * c', state); // 14

state.nodeTimings.get('BinaryExpression'); // { count: 2, total: 0.081 }
state.nodeTimings.get('Identifier');       // { count: 3, total: 0.014 }
```

Totals are in milliseconds and **inclusive** of child nodes, so nested node types overlap and summing them exceeds the walk's duration — the figures are for comparing node types against each other, not for a breakdown that adds up. They accumulate for the life of the state rather than per `eval` call, so under the `createState` + repeated `eval` style the counts are running totals; use a fresh state for per-run figures.

**Turning this on makes the walk dispatch a hook on every node.** That is inherent to the feature rather than an oversight: per-node-type totals cannot be produced without visiting each node. If a single walk-level total is all you need, `state.result.duration` already provides one on every evaluation, at no cost, whether or not `trackTime` is set.

`trackTime` configures the hook registry the state creates for itself. If you pass your own registry through `options.hooks`, that registry is yours and options never configure it — install the hook explicitly instead:

```javascript
import { createTimingHook } from '@zvenigora/ng-eval-core';

const off = createTimingHook().install(state.hooks);
```

### Evaluation hooks

Hooks let you observe an evaluation as it happens: a callback per AST node, or per resolved context read. They are registered on the state's `hooks` registry, so they apply to that **state** — every evaluation you run through it, which under the `createState` + repeated `eval` style is more than one. `EvalService` is a root singleton, but hooks are never held on the service, so one consumer's hooks never reach another's.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const state = service.createState({ a: 2, b: 3 });

const off = state.hooks.on('after', 'BinaryExpression', (event) => {
  event.node.type; // 'BinaryExpression'
  event.value;     // the value the visitor pushed
});

service.eval('a + b', state); // 5
off();                        // every `on` returns its unsubscribe
```

`on(phase, type, hook)` takes `'before'` or `'after'`, and either a concrete node type or `'*'` for every node. `onRead(hook)` registers a read hook instead, fired once per resolved context read with the key as the context actually resolved it — case-corrected when `caseInsensitive` is set, which is not recoverable from the AST node alone:

```javascript
state.hooks.onRead((event) => {
  event.kind;   // 'identifier' | 'member'
  event.key;    // the resolved key
  event.path;   // 'a.b' when statically reconstructible, else undefined
  event.scoped; // true for arrow-function parameters - not dependencies
});
```

If you want a dependency set rather than raw events, `createDependencyTracker()` builds one and applies the `scoped` filtering for you.

#### Hooks are synchronous

The walk is synchronous even under `evalAsync` — `evaluateAsync` runs the same synchronous traversal and only awaits the result at the end. There is no point at which a hook could be awaited.

A hook that returns a promise is therefore **not** awaited, and whatever it meant to do lands after the evaluation has finished. The dispatcher reports this as an error carrying the exported `ASYNC_HOOK_MESSAGE`, routed through the configured policy like any other hook error — collected by default, and thrown under `'throw'`. Matching on the constant tells it apart from an error your own hook threw:

```javascript
import { ASYNC_HOOK_MESSAGE } from '@zvenigora/ng-eval-core';

state.hookErrors.some(
  (e) => e.error instanceof Error && e.error.message === ASYNC_HOOK_MESSAGE
);
```

#### Hook errors

By default an error thrown by a hook is collected rather than propagated, so a faulty observer cannot break the evaluation it is observing. Collected errors are read back from the state:

```javascript
const state = service.createState(context, { onHookError: 'collect' }); // the default
service.eval('a + b', state);
state.hookErrors; // [{ phase, nodeType, error }, ...]
```

`onHookError` also accepts `'throw'` (rethrow into the visitor, failing the evaluation) and `'ignore'`.

Two things to know about it:

- **Reading `hookErrors` requires the state-first style.** `simpleEval` builds its state internally and never hands it back, so there is nowhere to read them from. Use `createState` plus `eval`.
- **Passing both `hooks` and `onHookError` silently ignores `onHookError`.** A registry you pass through `options.hooks` is yours, and it keeps the policy it was constructed with; options never reconfigure an adopted registry. Pass the policy where the registry is built instead:

  ```javascript
  import { EvalHooks } from '@zvenigora/ng-eval-core';

  const hooks = new EvalHooks({ onHookError: 'throw' });
  const state = service.createState(context, { hooks });
  ```

  One thing the library *does* do to a registry you own: `EvalService.ngOnDestroy()` clears the registries of the states it created, adopted ones included, so that a registry outliving the service cannot keep those states and their AST nodes reachable. Do not share one registry with a state whose lifetime is meant to outlast the service.

#### `completed: false` events

An `'after'` event normally means a visitor finished and pushed a value. When it carries `completed: false` it was *synthesised* — the visitor never closed the node itself — and there is no `value`.

These come from two different places, and **the presence of `error` is what tells them apart**. A consumer that reads `completed: false` as "this evaluation failed" will be wrong on the second kind.

**1. Evaluation actually failed.** The unwinder closes every node still open and supplies the `error`:

```javascript
const boom = () => { throw new Error('kaboom'); };
const state = service.createState({ boom });
const seen = [];

state.hooks.on('after', '*', (e) => {
  if (!e.completed) seen.push([e.node.type, 'error' in e]);
});

try { service.eval('1 + boom()', state); } catch { /* rethrown */ }

// seen === [['CallExpression', true], ['BinaryExpression', true]]
// innermost first, each carrying the error that aborted the walk
```

**2. An enclosing visitor moved on without its child.** The node is flushed when the enclosing one closes, and there is **no** `error` — nothing was reported as thrown, and the evaluation may still produce a value:

```javascript
import { CompilerService, EvalService } from '@zvenigora/ng-eval-core';
// `service` is an EvalService, `compiler` a CompilerService

const state = service.createState({ obj: {} });
const seen = [];

state.hooks.on('after', '*', (e) => {
  if (!e.completed) seen.push([e.node.type, 'error' in e]);
});

const fn = compiler.compile('async () => await obj.__proto__');
const arrow = compiler.call(fn, state); // returns the closure; seen === []
await arrow().catch(() => undefined);   // the body runs here

// seen === [['MemberExpression', false]] - completed: false, but no error
```

So: test for the `error` property, not for `completed === false`.

#### Cost

The no-hooks path is a single boolean check per node, so an evaluation with nothing registered pays essentially nothing. Registering any hook turns per-node dispatch on for the whole walk; registering a *read* hook additionally turns on key resolution and path reconstruction at each read site, which node hooks alone do not pay for.

Note that `trackTime: true` registers a hook, so it makes the walk dispatch per node exactly as an explicit registration would.

Hooks are observers: a hook's return value is discarded and cannot replace or suppress the value a visitor produces.

License: MIT
