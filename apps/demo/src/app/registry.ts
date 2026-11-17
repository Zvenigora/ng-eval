import { InjectionToken, Type } from '@angular/core';

/** One example: its page, its file, the values its boxes start from, and its README section. */
export interface RegistryEntry {
  /** The route's path. */
  readonly path: string;
  /** The page's title, and its link in the navigation. */
  readonly title: string;
  /** What the example does, shown under the title. */
  readonly summary: string;
  /** The example's file, as a path under `src/app`; the build copies it to `source/`. */
  readonly file: string;
  /** The example's component, by a dynamic import, so that each example is its own chunk. */
  readonly load: () => Promise<Type<unknown>>;
  /** The expression box's first value. */
  readonly expression: string;
  /** The data box's first value, as JSON text. */
  readonly data: string;
  /** The README section the page links, as a path from the repository's root and a heading slug. */
  readonly readme: { readonly file: string; readonly anchor: string };
}

export const REGISTRY: readonly RegistryEntry[] = [
  {
    path: 'try',
    title: 'Try an expression',
    summary: 'Evaluates the expression against the data with `EvalService.simpleEval`.',
    file: 'try/core-eval.example.ts',
    load: () => import('./try/core-eval.example').then((m) => m.CoreEvalExample),
    expression: '2 + 3 * a',
    data: '{ "a": 10 }',
    readme: { file: 'modules/eval-core/README.md', anchor: 'evaluation--evalservice' },
  },
  {
    path: 'features/core/evaluate',
    title: 'Evaluate and compile',
    summary: 'Evaluates the expression against the data twice: with `EvalService.simpleEval`, and by '
      + 'compiling it with `CompilerService.compile` and calling the result with `simpleCall`.',
    file: 'features/core/evaluate.example.ts',
    load: () => import('./features/core/evaluate.example').then((m) => m.EvaluateExample),
    expression: 'x + y',
    data: '{ "x": 1, "y": 2 }',
    readme: { file: 'modules/eval-core/README.md', anchor: 'compilation--compilerservice' },
  },
  {
    path: 'features/core/scopes',
    title: 'Scopes and case-insensitive lookup',
    summary: 'Evaluates the expression case-insensitively, over a context built from the data and a '
      + 'prior scope under the namespace `cat`, whose methods are called with a `thisArg`.',
    file: 'features/core/scopes.example.ts',
    load: () => import('./features/core/scopes.example').then((m) => m.ScopesExample),
    expression: 'CAT.action(ARGS, cat.NUM, "times")',
    data: '{ "args": ["says", "meow"] }',
    readme: {
      file: 'modules/eval-core/README.md',
      anchor: 'scopes--evalcontext-evalscope-evalscopeoptions',
    },
  },
  {
    path: 'features/core/hooks',
    title: 'Hooks and trace',
    summary: 'Evaluates the expression with `EvalService.eval` over a state built from the data, '
      + 'lists each context read an `onRead` hook reported, and lists the state\'s trace.',
    file: 'features/core/hooks.example.ts',
    load: () => import('./features/core/hooks.example').then((m) => m.HooksExample),
    expression: '2 + 3 * a',
    data: '{ "a": 10 }',
    readme: { file: 'modules/eval-core/README.md', anchor: 'evaluation-hooks' },
  },
  {
    path: 'features/signals/signal',
    title: 'Expression to Signal',
    summary: 'Makes a signal of the expression with `createEvalSignal`, over the signals `price`, '
      + '`quantity` and `shipping`, which start from the data. The button sets `quantity` one '
      + 'higher, and the value recomputes.',
    file: 'features/signals/signal.example.ts',
    load: () => import('./features/signals/signal.example').then((m) => m.SignalExample),
    expression: 'price * quantity',
    data: '{ "price": 10, "quantity": 3, "shipping": 5 }',
    readme: { file: 'modules/eval-signals/README.md', anchor: 'quick-start' },
  },
  {
    path: 'features/signals/dependencies',
    title: 'Dependency introspection',
    summary: 'Makes a signal of the expression with `trackDependencies: true`, and shows its value '
      + 'and the keys its last recompute read.',
    file: 'features/signals/dependencies.example.ts',
    load: () => import('./features/signals/dependencies.example').then((m) => m.DependenciesExample),
    expression: 'price * quantity',
    data: '{ "price": 10, "quantity": 3, "shipping": 5 }',
    readme: { file: 'modules/eval-signals/README.md', anchor: 'dependency-introspection' },
  },
  {
    path: 'features/signals/async',
    title: 'Async expressions',
    summary: 'Makes an async signal of the expression with `createEvalSignalAsync`, and shows its '
      + 'status and the name of the user it resolved to. `loadUser` is defined in the example\'s '
      + 'file and resolves after 10 ms.',
    file: 'features/signals/async.example.ts',
    load: () => import('./features/signals/async.example').then((m) => m.AsyncExample),
    expression: 'loadUser(id)',
    data: '{ "id": 1 }',
    readme: { file: 'modules/eval-signals/README.md', anchor: 'async-expressions' },
  },
];

/** The entry a page shows, provided by its route. */
export const ENTRY = new InjectionToken<RegistryEntry>('ENTRY');

/** The entry's README section on GitHub. */
export function readmeUrl(entry: RegistryEntry): string {
  return `https://github.com/Zvenigora/ng-eval/blob/master/${entry.readme.file}#${entry.readme.anchor}`;
}
