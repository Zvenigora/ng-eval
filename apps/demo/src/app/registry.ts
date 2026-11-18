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
  /**
   * The expression box's first value, or `null` for an example that reads no expression, whose
   * page shows no expression box.
   */
  readonly expression: string | null;
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
      + 'lists each context read an `onRead` hook reported, and lists the state\'s trace, one line '
      + 'per node, with the node\'s type.',
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
  {
    path: 'features/forms-reactive/quick-start',
    title: 'The field schema quick start',
    summary: 'Binds a schema whose `state` field has the expression as its `visible` rule, with '
      + '`bindFieldProperties`, over a `FormGroup` whose controls start from the data. The state '
      + 'input is shown while the rule is true, and typing in the country input recomputes it.',
    file: 'features/forms-reactive/quick-start.example.ts',
    load: () => import('./features/forms-reactive/quick-start.example').then((m) => m.QuickStartExample),
    expression: "country === 'US'",
    data: '{ "country": "CA", "state": "" }',
    readme: { file: 'modules/eval-forms/README.md', anchor: 'quick-start--reactive-forms-reactive' },
  },
  {
    path: 'features/forms-reactive/rule-fails',
    title: 'When a rule fails',
    summary: 'Binds the expression as one field\'s `text` rule three times, over a `FormGroup` whose '
      + 'controls start from the data: with the default `onError`, with a function that returns '
      + '`—`, and with `\'throw\'`. Each line shows the value as JSON, or the message its read threw.',
    file: 'features/forms-reactive/rule-fails.example.ts',
    load: () => import('./features/forms-reactive/rule-fails.example').then((m) => m.RuleFailsExample),
    expression: 'customer.name.toUpperCase()',
    data: '{ "customer": null }',
    readme: { file: 'modules/eval-forms/README.md', anchor: 'when-a-rule-fails' },
  },
  {
    path: 'features/forms-reactive/validation',
    title: 'Schema and expression validation at bind',
    summary: 'Binds a schema of one field, `city`, with the expression as its `visible` rule, over '
      + 'a `FormGroup` whose controls start from the data, and shows the rule\'s value. `city` has '
      + 'no control: the rule reads the form\'s values, such as `country`. With the first '
      + 'expression, `constructor`, `bindFieldProperties` throws, and the block shows its message, '
      + 'which names the expression.',
    file: 'features/forms-reactive/validation.example.ts',
    load: () => import('./features/forms-reactive/validation.example').then((m) => m.ValidationExample),
    expression: 'constructor',
    data: '{ "country": "CA" }',
    readme: { file: 'modules/eval-forms/README.md', anchor: 'it-is-validated-when-you-bind' },
  },
  {
    path: 'features/forms-signals/registrars',
    title: 'The three registrars and their polarity',
    summary: 'Registers three rules in a Signal Forms schema with `createExpressionRules`: the '
      + 'expression by `evalVisible` on `state`, and two fixed rules by `evalText` and '
      + '`evalDisabled` on `zip`. It shows what Angular\'s field state reads back. The button sets '
      + 'the model to the US and a total of 120.',
    file: 'features/forms-signals/registrars.example.ts',
    load: () => import('./features/forms-signals/registrars.example').then((m) => m.RegistrarsExample),
    expression: "country === 'US'",
    data: '{ "country": "CA", "state": "", "zip": "", "orderTotal": 80 }',
    readme: { file: 'modules/eval-forms/README.md', anchor: 'the-three-registrars-and-their-polarity' },
  },
  {
    path: 'features/forms-signals/schema-function',
    title: 'Reusing a schema function',
    summary: 'Calls one schema function, which registers the expression by `evalVisible` on '
      + '`state`, once per form: for two models, from the data\'s `a` and `b`, each with its own '
      + '`createExpressionRules`. It shows each form\'s `state().hidden()`.',
    file: 'features/forms-signals/schema-function.example.ts',
    load: () => import('./features/forms-signals/schema-function.example').then((m) => m.SchemaFunctionExample),
    expression: "country === 'US'",
    data: '{ "a": { "country": "US", "state": "" }, "b": { "country": "CA", "state": "" } }',
    readme: { file: 'modules/eval-forms/README.md', anchor: 'reuse-a-schema-function-not-a-schema-value' },
  },
  {
    path: 'features/forms-signals/error-policy',
    title: 'The error policy',
    summary: 'Registers the expression by `evalText` on three fields of one Signal Forms schema: '
      + 'with the default `onError`, with a function that returns `—`, and with `\'throw\'`. The '
      + 'model\'s `customer` comes from the data. Each line shows the value as JSON, or the '
      + 'message its read threw.',
    file: 'features/forms-signals/error-policy.example.ts',
    load: () => import('./features/forms-signals/error-policy.example').then((m) => m.ErrorPolicyExample),
    expression: 'customer.name.toUpperCase()',
    data: '{ "customer": null }',
    readme: { file: 'modules/eval-forms/README.md', anchor: 'when-a-rule-fails' },
  },
  {
    path: 'use-cases/configured-form',
    title: 'A form driven by configuration',
    summary: 'Builds a form from the field list in the data box, as it would arrive from a server: '
      + 'one control per field, and the list bound as the schema with `bindFieldProperties`. A '
      + 'field with a `visible` rule is shown while the rule is true, and a field is labelled by '
      + 'its `text` rule, or by its name when it has none. Typing in the country input recomputes '
      + 'the rules that read it.',
    file: 'use-cases/configured-form.example.ts',
    load: () => import('./use-cases/configured-form.example').then((m) => m.ConfiguredFormExample),
    expression: null,
    data: JSON.stringify(
      [
        { name: 'country' },
        { name: 'state', visible: "country === 'US'", text: "'State'" },
        { name: 'province', visible: "country === 'CA'", text: "'Province'" },
        { name: 'zip', text: "country === 'US' ? 'ZIP code' : 'Postal code'" },
      ],
      null,
      2
    ),
    readme: { file: 'modules/eval-forms/README.md', anchor: 'the-field-schema' },
  },
  {
    path: 'use-cases/formula-fields',
    title: 'Formula fields',
    summary: 'Makes a signal with `createEvalSignal` of each formula in the data box, in order. A '
      + 'formula reads the price and quantity inputs and the formulas before it, so typing in an '
      + 'input recomputes the formulas that read it.',
    file: 'use-cases/formula-fields.example.ts',
    load: () => import('./use-cases/formula-fields.example').then((m) => m.FormulaFieldsExample),
    expression: null,
    data: JSON.stringify(
      {
        price: 25,
        quantity: 4,
        formulas: {
          subtotal: 'price * quantity',
          discount: 'subtotal >= 100 ? subtotal * 0.1 : 0',
          tax: '(subtotal - discount) * 0.13',
          total: 'subtotal - discount + tax',
        },
      },
      null,
      2
    ),
    readme: { file: 'modules/eval-signals/README.md', anchor: 'how-it-fits-together' },
  },
  {
    path: 'use-cases/row-filter',
    title: 'A filter the user writes',
    summary: 'Compiles the expression once with `CompilerService.compile`, calls it with '
      + '`simpleCall` once per row of the data, and shows the rows it is truthy for.',
    file: 'use-cases/row-filter.example.ts',
    load: () => import('./use-cases/row-filter.example').then((m) => m.RowFilterExample),
    expression: "price > 100 && category == 'books'",
    data: JSON.stringify(
      [
        { title: 'Dune', category: 'books', price: 120 },
        { title: 'Atlas', category: 'books', price: 80 },
        { title: 'Desk lamp', category: 'home', price: 150 },
        { title: 'Encyclopedia', category: 'books', price: 300 },
        { title: 'Mug', category: 'home', price: 12 },
      ],
      null,
      2
    ),
    readme: { file: 'modules/eval-core/README.md', anchor: 'compilation--compilerservice' },
  },
];

/** The entry a page shows, provided by its route. */
export const ENTRY = new InjectionToken<RegistryEntry>('ENTRY');

/** The entry's README section on GitHub. */
export function readmeUrl(entry: RegistryEntry): string {
  return `https://github.com/Zvenigora/ng-eval/blob/master/${entry.readme.file}#${entry.readme.anchor}`;
}
