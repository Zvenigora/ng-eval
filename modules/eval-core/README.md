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

License: MIT
