# @zvenigora/ng-eval-core

An expression evaluator for Angular: JavaScript expression parsing and evaluation, built on [acorn](https://github.com/acornjs/acorn) and exposed as injectable services. An expression is evaluated against a context the host supplies, and resolves names only against that context. This file is the package's whole documentation.

## Install

```sh
npm install --save @zvenigora/ng-eval-core
```

Peer dependencies: `@angular/core >=19.0.0`, `acorn ^8.11.2`, `acorn-walk ^8.3.0` and `js-sha256 ^0.10.1 || ^0.11.0 || ^0.12.0 || ^1.0.0`.

## Sibling packages

- [`@zvenigora/ng-eval-signals`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-signals#readme) — an expression over a context of signals as an Angular `Signal`, which recomputes exactly when a key the expression read has changed.
- [`@zvenigora/ng-eval-forms`](https://github.com/zvenigora/ng-eval/tree/master/modules/eval-forms#readme) — Angular form field properties driven by expressions that arrive as strings at runtime, for Reactive Forms and Signal Forms.

The sources for all three are in the [@zvenigora/ng-eval](https://github.com/zvenigora/ng-eval) repository.

## Security

**ng-eval is not a sandbox.** An expression reaches whatever its context holds, and every function in the context runs with the host's privileges. [`SECURITY.md`](https://github.com/zvenigora/ng-eval/blob/master/SECURITY.md) covers the threat model, the protections the code has, and their [documented limits](https://github.com/zvenigora/ng-eval/blob/master/SECURITY.md#documented-limits) — read it before evaluating an expression you did not write. [GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx), dangerous functions and the evaluation context reachable past the call sandbox, affects `@zvenigora/ng-eval-core` up to 0.12.1 and is fixed in 0.13.0. `SECURITY.md` also records [reviewed external advisories](https://github.com/zvenigora/ng-eval/blob/master/SECURITY.md#reviewed-external-advisories) — advisories raised against related projects and whether this library shares the defect. [GHSA-pj3p-xpg7-h7gw](https://github.com/Zvenigora/jse-eval/security/advisories/GHSA-pj3p-xpg7-h7gw), the case-insensitive guard bypass reported against the separate `@zvenigora/jse-eval` package, **does not apply to `@zvenigora/ng-eval-core`**: this library does not depend on `jse-eval`, and the advisory's proof-of-concept was run against this evaluator and is blocked.

## Exported entry points

Each service below is documented in its own section. `EvalService` (evaluation) and `CompilerService` (compile once, call repeatedly) are used throughout.

Each service also has a form that needs no injector. The free functions `parse`, `extract`, `evaluate`, `evaluateAsync`, `compile`, `call`, `compileAsync` and `callAsync` are what the services call. `parse` takes the expression text; `extract`, `compile` and `compileAsync` take the AST node `parse` returns, not a string; and `evaluate`, `evaluateAsync`, `call` and `callAsync` take an `EvalState`, which `EvalState.fromContext(context, options)` builds.

### Parsing — `ParserService`

```javascript
import { ParserService } from '@zvenigora/ng-eval-core';

const service = inject(ParserService);   // Angular's inject(), or constructor injection

const ast = service.parse('1 + foo');    // an ESTree AST
ast.type;                                // 'BinaryExpression'
```

The result of the parse is an AST (abstract syntax tree):

```json
{
  "type": "BinaryExpression",
  "start": 0,
  "end": 7,
  "left": {
    "type": "Literal",
    "start": 0,
    "end": 1,
    "value": 1,
    "raw": "1"
  },
  "operator": "+",
  "right": {
    "type": "Identifier",
    "start": 4,
    "end": 7,
    "name": "foo"
  }
}
```

`ParserService` parses with `ecmaVersion: 2020`, keeps a cache of 100 parses, and sets `extractExpressions`, so `parse` returns the expression itself — the `BinaryExpression` above — rather than the `Program` around it. `EvalService`, `CompilerService` and `DiscoveryService` parse with `extractExpressions` off, into a `Program`, which is what lets an expression be a statement list.

### Evaluation — `EvalService`

`simpleEval(expression, context)` evaluates an expression against the given context. Without a context, the context is empty.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

const expression = '2 + 3 * a';
const context = { a: 10 };
const result = service.simpleEval(expression, context); // 32
```

Since the default context is empty, an expression cannot reach JavaScript's global built-ins, such as `Math`, `parseInt` or `Date`. The methods of the values it holds stay callable: `'abc'.toUpperCase()` and `[3, 1, 2].map(x => x * 2)` run over an empty context. To allow the globals, add them to the context passed to `simpleEval`:

```javascript
const context = {
  Date,
  Array,
  Object,
  encodeURI,
  decodeURI,
  isFinite,
  isNaN,
  JSON,
  Math,
  parseFloat,
  parseInt,
  RegExp,
  // ...myCustomPropertiesAndFunctions,
};
service.simpleEval('Math.max(1, 2) + parseInt("40")', context); // 42
```

### Compilation — `CompilerService`

```javascript
import { CompilerService } from '@zvenigora/ng-eval-core';

const service = inject(CompilerService);

const fn = service.compile('x + y');
const context = { x: 1, y: 2 };
const options = { caseInsensitive: false };
const value = service.simpleCall(fn, context, options); // 3
```

### Async evaluation and compilation

Asynchronous evaluation is limited, and based on promises. The walk itself is synchronous, and a promise is awaited once it has finished, wherever it sits in the result: the result itself, or an element or property of an array or object the expression builds.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

const context = {
  one: 1,
  two: 2,
  asyncFunc: async (a: number, b: number) => { return await (a+b); }
};
const expr = 'asyncFunc(one, two)';
const value = await service.simpleEvalAsync(expr, context); // 3

await service.simpleEvalAsync('[asyncFunc(one, two), two]', context); // [3, 2]
```

```javascript
import { CompilerService } from '@zvenigora/ng-eval-core';

const service = inject(CompilerService);

const context = {
  one: 1,
  two: 2,
  promiseFunc: (a: number, b: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        return resolve(a + b);
      }, 10);
    });
  }
};
const expr = 'promiseFunc(one, two)';
const fn = service.compileAsync(expr);
const result = await service.simpleCallAsync(fn, context); // 3

const nested = service.compileAsync('({ sum: promiseFunc(one, two) })');
await service.simpleCallAsync(nested, context); // { sum: 3 }
```

### Discovery — `DiscoveryService`

Finds every node of a given type in an expression.

```javascript
import { DiscoveryService } from '@zvenigora/ng-eval-core';

const service = inject(DiscoveryService);

const expressions = service.extract('1 + 2 * a', 'BinaryExpression');
expressions.length;   // 2
```

### Scopes — `EvalContext`, `EvalScope`, `EvalScopeOptions`

An evaluation context may carry prior scopes, each with its own `namespace` and case sensitivity. Bare identifiers are read from the context itself; a namespaced scope is reached through its namespace.

`thisArg` is the `this` a scope's methods are called with. A method called on the scope's own object, such as `cat.action(...)` below, receives `thisArg`; so does `this.fn()` when a global scope supplies `fn`. Without `thisArg`, `cat.action(...)` receives the scope's object. Only the call's receiver changes: `cat` still evaluates to the scope's object, so `cat.num` reads it and `cat.x = 1` writes to it. Up to 0.6.x `thisArg` was accepted and never applied.

```javascript
import { EvalContext, EvalScope, EvalScopeOptions,
  EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

const cat = {
  name: 'Miss Kitty',
  num: 3,
  action: function(args: string[], n: number, t: string) {
    return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;
  }
};

// `args` is read as a bare identifier, so it belongs to the context itself
// rather than to the scope.
const evalContext = new EvalContext({ args: ['says', 'meow'] }, {});

const catOptions: EvalScopeOptions = {
  global: false,
  caseInsensitive: false,
  namespace: 'cat',
  thisArg: { name: 'Mister Whiskers' }
};
evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

const result = service.simpleEval('cat.action(args, cat.num, "times")', evalContext);
// 'Mister Whiskers says meow 3 times' - `this` is thisArg; cat.num still reads cat
```

Note that an `EvalContext` may back any number of evaluations, and that `caseInsensitive` set on the context alone does not reach the walk — pass it in the evaluation options too. Even then, a plain object handed to `new EvalContext` matches no case variant: build the context with `EvalContext.fromContext(object, options)` instead, which copies the object into a case-insensitive store.

### Colon-joined names — `provideColonIdentifiers`

Some expression languages name their values `Q1:1` or `VP14:0`. With `colonIdentifiers` on, such a name parses as one identifier and reads the context key of the same spelling, `context['Q1:1']`. It is off by default, and with it off every expression parses as it always has.

`provideColonIdentifiers()` turns it on for an application: `ParserService` reads it when it is constructed, so every parse through `EvalService`, `CompilerService` and `DiscoveryService` follows it. Put it in the application's **root** providers. `ParserService` is provided in the root, so in a lazy route's providers, or any other child injector's, the provider would reach no parse; there it throws when that injector is created instead.

A per-call `colonIdentifiers` in the options of `ParserService.parse`, or of the exported `parse`, overrides it — and the exported `parse` sees only the options it is given. Setting `ParserService.parserOptions` to a new object is the imperative alternative: every later parse or compile follows it, of a text seen before as of a new one, while a function already compiled keeps the reading it was compiled with.

```javascript
import { EvalService, ParserService,
  provideColonIdentifiers } from '@zvenigora/ng-eval-core';

// app.config.ts: the application's root providers, not a lazy route's
export const appConfig = { providers: [provideColonIdentifiers()] };

const parser = inject(ParserService);
parser.parserOptions.colonIdentifiers;           // true - the effective setting

const service = inject(EvalService);
service.simpleEval('Q1:1 + 1', { 'Q1:1': 2 });   // 3
service.simpleEval('Q1:1 + 1', { Q1: 100 });     // NaN - 'Q1:1' is a key of its own
```

**The rule.** A colon-joined name is a first segment — an ASCII letter, `_` or `$`, then ASCII letters, digits, `_` or `$` — followed by one or more segments of the same characters, each after a `:`, which may start with a digit: `Q1:1`, `VP14:0`, `Q1:1:3`, `Q1:_x`. Nothing may sit inside it, no space, comment or line break, and the longest match wins, so `Q1:1:3` is one name. The name is an opaque key: `Q1:01` and `Q1:1` are different keys, and nothing splits one into segments. It joins wherever an identifier can stand — in an expression, after `.` and `?.` (`obj.Q1:1` reads `obj['Q1:1']`, and `sheet:A1.value` is `(sheet:A1).value`), as a binding (`let Q1:1 = 5`, `(Q1:1) => …`) and inside a template's `${…}` — and text stays text: `"Q1:1"`, a template's own text, a regex, a comment.

Some spellings keep the meaning they always had. A keyword does not start a name, so `true:1`, `this:1` and `typeof:1` are syntax errors as before, while a word acorn reads as a name, such as `let` or `async`, does start one. A first segment holding a non-ASCII character or a `\u` escape does not join, and neither does a colon followed by a non-ASCII character, so `Вопрос:1` and `Q1:Ответ` are labels; so is a colon with a space beside it: `Q1: 1` is the label `Q1`, under the option too. A non-ASCII character later in a segment ends the name there, and what follows it is a `SyntaxError`: `Q1:1é`.

**Where JavaScript already gives the colon a meaning**, the name gives way or is refused, and never reads silently as something else:

- **A conditional's consequent.** Between a `?` and the `:` that closes it, a name does not join at the conditional's own level, so `a?b:c` keeps its meaning. Put a colon-joined name there in parentheses, `c ? (Q1:1) : 0`; inside a call, an array or a template the consequent opens it joins as anywhere else, as it does in the test and the alternate: `Q1:1 ? f(Q2:2) : Q3:3`. Without the parentheses the leftover colon is a `SyntaxError` at its own position, whose message names the fix — except when the `:` that closes the conditional starts a line of its own, where it is acorn's plain `Unexpected token`.
- **An object key.** `{Q1:1}` would be `{Q1: 1}` to JavaScript and the shorthand `{'Q1:1': Q1:1}` here, so a colon-joined key is a `SyntaxError` naming both fixes. Quote a colon-named key, `{'Q1:1': v}`. A value, a computed key and a spread join as usual: `({a: Q1:1})`, `({[Q1:1]: 2})`, `({...o, k: Q1:1})`. So under the option a compact literal or pattern — `({a:1})`, `let {a:b} = o` — needs a space after the key's colon.

```javascript
const ctx = { c: true, 'Q1:1': 5 };

service.simpleEval('c ? (Q1:1) : 0', ctx);       // 5
service.simpleEval('c ? Q1:1 : 0', ctx);         // throws SyntaxError: Unexpected token: a colon-joined
                                                 // name in the consequent of a conditional needs
                                                 // parentheses: (Q1:1) (1:9)
service.simpleEval("({ 'Q1:1': 2 })['Q1:1']");   // 2 - a colon-named key is quoted
service.simpleEval('({a:1}).a');                 // throws SyntaxError - write ({a: 1})
```

**Read events and dependencies stay dotted.** A colon-joined name is one segment of a `path`: reading `obj.Q2:3` reports the `key` `Q2:3` and the `path` `obj.Q2:3`, and `createDependencyTracker()` records `obj.Q2:3`. Split a path on `.`, never on `:`.

## Supported syntax

### ESTree nodes supported

The project has been tested with the following node types:
 - `BinaryExpression`
 - `Identifier`
 - `Literal`
 - `CallExpression` *potentially unsafe*
 - `AwaitExpression`
 - `ConditionalExpression`
 - `MemberExpression`
 - `ArrayExpression`
 - `UnaryExpression`
 - `LogicalExpression`
 - `ThisExpression` — only as the object of a member access, `this.k`, `this['k']` or `this.fn()`;
   anywhere else it throws, since `@zvenigora/ng-eval-core` 0.13.0. Up to 0.12.1 it evaluated to the
   evaluation context
 - `NewExpression`
 - `TemplateLiteral`
 - `TaggedTemplateExpression`
 - `ObjectExpression`
 - `AssignmentExpression` — to an identifier or a member, parenthesised or not. Since 0.14.0 the
   target is evaluated as JavaScript evaluates it: a member target's object and key once, then
   the target's value only for a compound or logical operator, then the right side, then the
   write. So `=` does not read its target, and `+=` or `||=` reads it once; up to 0.13.3 the
   target was read as an operand, and a member target was evaluated again after the right side.
   Three kinds of read remain beyond JavaScript's. Case-sensitive, a getter `g` on the context,
   reached through `this`: `this.g = 1` calls it once and `this.g += 1` twice. Under
   `caseInsensitive`, a lookup that answers an identifier target: `x = 1` calls it once and
   `x += 1` twice. And under `caseInsensitive`, a getter an instance inherits: `c.g += 1` calls it
   twice, as `c.g` does. Destructuring assignment, `[a, b] = arr` or `({ m } = o)`, throws
   `Unsupported assignment target`;
   before `@zvenigora/ng-eval-core` 0.7.0 it silently did nothing. An identifier write that
   would shadow `undefined`, or under `caseInsensitive` a literal, throws
   `Assignment to read-only name`, since 0.13.2
 - `UpdateExpression` — to an identifier or a member, parenthesised or not. Under
   `caseInsensitive` a member update writes the key its read matched, since 0.14.0: `OBJ.X++`
   on `{ obj: { x: 1 } }` writes `x`
 - `ArrowFunctionExpression` *potentially unsafe* (AssignmentPattern is not implemented, so a
   destructuring default — `({ a = 1 }) => a` — is rejected rather than defaulted)
 - `SequenceExpression` — each expression in order, the value the last one's

Object and array destructuring bind the names JavaScript binds, in parameter lists and in
`let` / `const` declarations alike: shorthand, renaming, nesting, literal and computed keys,
and rest elements. **Before `@zvenigora/ng-eval-core` 0.5.0 the renaming forms bound the wrong
names** — see the 0.5.0 entry in the
[CHANGELOG](https://github.com/zvenigora/ng-eval/blob/master/modules/eval-core/CHANGELOG.md#050---2026-09-17).

Statements, since `@zvenigora/ng-eval-core` 0.4.0:

 - `Program`
 - `ExpressionStatement`
 - `EmptyStatement`
 - `BlockStatement`
 - `VariableDeclaration` — `let` and `const` only; `var` is rejected
 - `IfStatement`
 - `ForStatement` — the classic three-part form only

**Every other statement type is rejected with `Unsupported statement type: <type>`.**
That is a change of kind, not only of coverage: before 0.4.0 an unsupported statement was
handed to `acorn-walk`'s base walker, which walked the subtree as an expression and left
whatever it pushed on the value stack — so `throw 1` evaluated to `1` and threw nothing, and
`switch (1) { case 1: 2 }` evaluated to `2`. See the
[CHANGELOG](https://github.com/zvenigora/ng-eval/blob/master/modules/eval-core/CHANGELOG.md#040---2026-09-15) for the full before/after table.

`WhileStatement`, `DoWhileStatement`, `ForInStatement`, `ForOfStatement`, `SwitchStatement`,
`TryStatement`, `ThrowStatement`, `LabeledStatement`, `BreakStatement`, `ContinueStatement`,
`FunctionDeclaration` and `ClassDeclaration` are among the rejected types. The three that
imply **abrupt completion** and are reachable — `break`, `continue`, `throw` — are out by
design rather than by schedule: the evaluator has no completion record to carry them, and
adding one is a redesign of the walker rather than another visitor. `return` never reaches
the evaluator at all: an expression is parsed outside any function, so `return 1` is a parse
error (`'return' outside of function`) both before and after 0.4.0.

### How statements differ from JavaScript

Seven deliberate divergences, each a documented rule rather than an accident:

1. **An arrow function with a block body returns the block's completion value**, where
   JavaScript returns `undefined` without a `return`. `x => { 1 }` yields `1` here. With
   `return` unsupported, the completion value is the only answer available that is not an
   error.
2. **`const` reassignment throws at the write, not at parse time.**
3. **An unsupported statement type throws**, where before 0.4.0 it returned a value.
4. **No hoisting.** A `let` binds when its declaration is reached; reading it earlier reads
   the enclosing context rather than raising a temporal-dead-zone error.
5. **Closures do not capture their lexical scope.** An arrow resolves its free variables
   against the context *as it is when it is called*, not as it was where it was written — so
   `for (let i = 0; i < 3; i++) { fns.push(() => i) }` leaves three functions that all read
   whatever `i` resolves to at call time. This is pre-existing behaviour that statements
   neither cause nor worsen.
6. **A pattern form the binder does not implement throws** rather than binding nothing.
7. **A binding name on the prototype-pollution blocklist is rejected — including as an arrow
   function parameter.** `(toString => toString)(1)` returned `1` before 0.4.0 and now
   throws; so do `constructor`, `prototype`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`,
   `propertyIsEnumerable`, `toLocaleString` and the four `__define`/`__lookup` accessors.
   Binding writes share the blocklist with every other write site, which is wider than the
   threat — only `__proto__` is an actual write vector — and is kept wide so that "is this
   name blocked?" does not depend on which visitor reached it. From 0.4.0 to 0.6.x a throw
   from inside a called arrow function was re-wrapped, so this one arrived as
   `Function call error: Access to dangerous property "toString" is blocked…`; since 0.7.0
   it arrives as thrown, without the prefix.

## Options

To change the evaluator's default behaviour, pass `options`: the last argument of `simpleEval`, `simpleCall` and `createState`.

### Case-insensitive evaluation

While JavaScript is a case-sensitive language, some may find it hard to use. To provide case-insensitive evaluation, set `caseInsensitive` to `true`. It applies to identifiers and to member names alike. Since 0.14.0 a member write reaches the key the read would match: `OBJ.X = 2` on `{ obj: { x: 1 } }` writes `x`, where up to 0.13.3 it created a key `X` beside it. A key that matches nothing is written as spelled.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

const options = { caseInsensitive: true };

const expression = '2 + 3 * A';
const context = { a: 10 };
const result = service.simpleEval(expression, context, options); // 32

service.simpleEval('User.NAME', { user: { name: 'Ann' } }, options); // 'Ann'
```

### Evaluation with state

`eval(expression, state)` evaluates against a state rather than a context. The state holds the context, the result and the options; the visitors read it as they walk, so it can extend the evaluator — for example with the execution history, or the time each node type took. `simpleEval` builds a state internally and never hands it back, so reading back what the walk recorded — `nodeTimings`, the trace, collected hook errors — needs this style.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

const expression = '2 + 3 * A';
const context = { a: 10 };
const options = { caseInsensitive: true };
const state = service.createState(context, options);
// update the state if required - register hooks on state.hooks, for example

const result = service.eval(expression, state); // 32

// read the state: the execution history, one entry per value the walk pushed
state.result.trace.map((item) => `${item.expression} = ${item.value}`);
// ['2 = 2', '3 = 3', 'A = 10', '3 * A = 30', '2 + 3 * A = 32', '2 + 3 * A = 32', '2 + 3 * A = 32']
state.result.traceTruncated;   // false - did it stop short? see `maxTraceItems`
```

### Per-node timing

Set `trackTime` to `true` to accumulate per-node-type timings for an evaluation. They are read back from the state as `nodeTimings`, so this option needs the state-first style — `simpleEval` builds its state internally and never hands it back.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

const context = { a: 2, b: 3, c: 4 };
const state = service.createState(context, { trackTime: true });

const result = service.eval('a + b * c', state); // 14

// `count` is exact; `total` is wall-clock in milliseconds.
state.nodeTimings.get('BinaryExpression'); // { count: 2, total: <ms> }
state.nodeTimings.get('Identifier');       // { count: 3, total: <ms> }
```

Totals are in milliseconds and **inclusive** of child nodes, so nested node types overlap and summing them exceeds the walk's duration — the figures are for comparing node types against each other, not for a breakdown that adds up. They accumulate for the life of the state rather than per `eval` call, so under the `createState` + repeated `eval` style the counts are running totals; use a fresh state for per-run figures.

**Turning this on makes the walk dispatch a hook on every node.** That is inherent to the feature rather than an oversight: per-node-type totals cannot be produced without visiting each node. If a single walk-level total is all you need, `state.result.duration` already provides one on every evaluation, at no cost, whether or not `trackTime` is set.

`trackTime` configures the hook registry the state creates for itself. If you pass your own registry through `options.hooks`, that registry is yours and options never configure it — install the hook explicitly instead:

```javascript
import { EvalHooks, createTimingHook } from '@zvenigora/ng-eval-core';

const hooks = new EvalHooks();   // yours, so `trackTime` never configures it
const state = service.createState(context, { hooks, trackTime: true });

service.eval('a + b * c', state);
state.nodeTimings.size;          // 0 — the option did not reach your registry

const off = createTimingHook().install(state.hooks);

service.eval('a + b * c', state);
state.nodeTimings.get('BinaryExpression');   // { count: 2, total: <ms> }
```

### Iteration budget

`for` loops are bounded so that a runaway expression fails fast rather than hanging the caller. The budget is **100,000 iterations per evaluation**, shared by every loop in the expression — a per-loop cap would multiply under nesting and so would not be a bound at all. Exceeding it throws; a runaway loop that silently returns a partial value is the failure mode this exists to prevent.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);

service.simpleEval('for (let i = 0; i < 3; i++) { i }'); // 2

// Raise it, lower it, or set Infinity and own the consequence.
const state = service.createState({}, { maxIterations: 10 });

try {
  service.eval('for (let i = 0; i < 100; i++) { i }', state);
} catch (e) {
  e.message; // 'Iteration budget exhausted after 10 iterations'
}
```

The budget is refilled per outermost `eval` call, not per state — so the `createState` + repeated `eval` style does not erode one budget across independent evaluations, and an arrow function that outlives the walk that created it does not carry that walk's spent budget into a later call.

**It bounds time; `maxTraceItems` bounds the memory.** `state.result.trace` gains an entry per pushed value, so before that bound a long-running loop's trace grew as iterations × nodes — 700,007 entries and ~36 MB for a 100,000-iteration loop evaluated through `eval`. That loop is *not* stopped by the default budget: it charges exactly 100,000 and completes. Where the budget does stop a loop, the whole allocation was paid before the throw.

### Bounding the trace

`state.result.trace` records every value the evaluator pushes, and it spans **every evaluation run on one state**, not just the last. `maxTraceItems` bounds how many entries it keeps. It defaults to **10,000** — roughly 0.5 MB, and three orders of magnitude above anything a hand-written expression produces.

```javascript
const state = service.createState({ a: 10 });
service.eval('2 + 3 * a', state);

state.result.trace.length;      // 7
state.result.traceTruncated;    // false
state.result.tracePushCount;    // 7
```

The **head** is kept, in order, so `trace[0]` is still the first thing evaluated. Once a push is actually dropped:

- **`state.result.traceTruncated`** turns `true` and stays true — no entry is appended to the trace to say so, because every row in it describes a real node. A walk of exactly `maxTraceItems` pushes leaves it `false`; nothing was lost.
- **`state.result.tracePushCount`** goes on counting every push, which is the number the trace no longer tells you.

```javascript
const state = service.createState({}, { maxIterations: Infinity });
service.eval('for (let i = 0; i < 100000; i++) { i }', state);

state.result.trace.length;      // 10000
state.result.traceTruncated;    // true
state.result.tracePushCount;    // 700007
```

Two values are special, and both are honoured rather than treated as falsy:

- **`0`** disables tracing — `trace.length` stays `0` and `traceTruncated` stays `false`, while `tracePushCount` stays accurate, so a caller who turns tracing off for the allocation keeps the walk-size figure.
- **`Infinity`** restores the unbounded behaviour exactly.

**`state.result.clearTrace()`** is the only reset. It empties the trace and both counters, in place — the array `state.result.trace` returns is the same instance for the life of the result, so a reference you are holding stays live across the call. Under the `createState` + repeated `eval` style, call it before an evaluation to make the trace describe only that walk.

### Evaluation hooks

Hooks let you observe an evaluation as it happens: a callback per AST node, or per resolved context read. They are registered on the state's `hooks` registry, so they apply to that **state** — every evaluation you run through it, which under the `createState` + repeated `eval` style is more than one. `EvalService` is a root singleton, but hooks are never held on the service, so one consumer's hooks never reach another's.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);
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
  event.scoped; // true when a scope on the context's stack binds the name - an
                // arrow parameter, a let or const, or a scope pushed with
                // EvalContext.push - so not a dependency
});
```

Since 0.14.0 an assignment or an update reports the reads JavaScript makes: `a.b = 1` reports `a` and not `a.b`, `x = 1` reports nothing, a compound or logical assignment one read of its target — `a.b += 1` reports `a`, then `a.b` — and `x++` one read of `x`.

If you want a dependency set rather than raw events, `createDependencyTracker()` builds one and applies the `scoped` filtering for you.

#### Statements and the empty-completion sentinel

Since 0.4.0 an expression may be a statement list, and a statement that produces no value — a declaration, an `if` that takes no branch, a `for` that runs zero iterations — pushes a sentinel rather than `undefined`. JavaScript's completion-value semantics keep the last *non-empty* value, and empty is not the same as `undefined`: in `a; noop()`, where `noop` returns `undefined`, the result is `undefined` and not `'A'`, because the call genuinely produced a value.

`EMPTY_COMPLETION` never leaves an evaluation's return value — it is converted to `undefined` at the walk boundary — but an `after` hook fires before that conversion, so a hook on a statement node **will** see it. It is exported so you can recognise it by identity rather than by guessing:

```javascript
import { EMPTY_COMPLETION, EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);
const state = service.createState({ a: 1 });

const produced = [];
state.hooks.on('after', 'VariableDeclaration', (event) => {
  produced.push(event.value !== EMPTY_COMPLETION);
});

service.eval('let x = 1; x + a', state); // 2
produced;                                // [false] - the declaration produced nothing
```

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
const service = inject(EvalService);
const context = { a: 2, b: 3 };

const state = service.createState(context, { onHookError: 'collect' }); // the default
state.hooks.on('after', 'Identifier', () => { throw new Error('faulty observer'); });

service.eval('a + b', state);
state.hookErrors; // [{ phase, nodeType, error }, ...]
```

`onHookError` also accepts `'throw'` (rethrow into the visitor, failing the evaluation) and `'ignore'`.

Two things to know about it:

- **Options-first calls cannot read collected hook errors, by design.** `simpleEval(expr, context, { hooks })` builds its state internally and never hands it back, so errors collected on it are out of reach. To read them, use the state-first style — `createState`, then `eval` — and read `state.hookErrors`. Or have a faulty hook fail the evaluation instead, with `onHookError: 'throw'` set on the `EvalHooks` you pass (see the next point).
- **Passing both `hooks` and `onHookError` silently ignores `onHookError`.** A registry you pass through `options.hooks` is yours, and it keeps the policy it was constructed with; options never reconfigure an adopted registry. Pass the policy where the registry is built instead:

  ```javascript
  import { EvalHooks } from '@zvenigora/ng-eval-core';

  const service = inject(EvalService);
  const context = { a: 2, b: 3 };

  const hooks = new EvalHooks({ onHookError: 'throw' });
  const state = service.createState(context, { hooks });
  ```

  The library never clears a registry you own. `EvalService.ngOnDestroy()` does not touch it, whichever method you passed it to, and up to 0.5.0 it cleared the registries of the states `createState` built. So a hook that keeps a state, by capturing it or by storing `event.state`, keeps that state and its context reachable for as long as the registry is. Release them in the teardown that owns the registry, such as your component's `ngOnDestroy` or a `DestroyRef.onDestroy` callback: call the unsubscribe that `on` / `onRead` returned, or `hooks.clear()`.

#### `completed: false` events

An `'after'` event normally means a visitor finished and pushed a value. When it carries `completed: false` it was *synthesised* — the visitor never closed the node itself — and there is no `value`.

These come from two different places, and **the presence of `error` is what tells them apart**. A consumer that reads `completed: false` as "this evaluation failed" will be wrong on the second kind.

**1. Evaluation actually failed.** The unwinder closes every node still open and supplies the `error` — including the statement nodes enclosing the expression, since a program and its statements are walked like anything else:

```javascript
const service = inject(EvalService);

const boom = () => { throw new Error('kaboom'); };
const state = service.createState({ boom });
const seen = [];

state.hooks.on('after', '*', (e) => {
  if (!e.completed) seen.push([e.node.type, 'error' in e]);
});

try { service.eval('1 + boom()', state); } catch { /* rethrown */ }

// seen === [['CallExpression', true], ['BinaryExpression', true],
//           ['ExpressionStatement', true], ['Program', true]]
// innermost first, each carrying the error that aborted the walk
```

**2. An enclosing visitor moved on without its child.** The node is flushed when the enclosing one closes, and there is **no** `error` — nothing was reported as thrown, and the evaluation may still produce a value.

Up to 0.6.x an `await` whose operand threw synchronously did this: it turned the throw into a rejected promise and closed without its operand. Since 0.7.0 no built-in visitor does — the throw propagates, so the same expression is now the first kind:

```javascript
import { CompilerService, EvalService } from '@zvenigora/ng-eval-core';

const service = inject(EvalService);
const compiler = inject(CompilerService);

const state = service.createState({ obj: {} });
const seen = [];

state.hooks.on('after', '*', (e) => {
  if (!e.completed) seen.push([e.node.type, 'error' in e]);
});

const fn = compiler.compile('async () => await obj.__proto__');
const arrow = compiler.call(fn, state); // returns the closure; seen === []
try { arrow(); } catch { /* the body runs here, and throws synchronously */ }

// seen === [['MemberExpression', true], ['AwaitExpression', true]]
// up to 0.6.x: [['MemberExpression', false]] - completed: false, but no error
```

The second kind stays in the hook contract.

So: test for the `error` property, not for `completed === false`.

#### Cost

The no-hooks path is a single boolean check per node, so an evaluation with nothing registered pays essentially nothing. Registering any hook turns per-node dispatch on for the whole walk; registering a *read* hook additionally turns on key resolution and path reconstruction at each read site, which node hooks alone do not pay for.

Note that `trackTime: true` registers a hook, so it makes the walk dispatch per node exactly as an explicit registration would.

Hooks are observers: a hook's return value is discarded and cannot replace or suppress the value a visitor produces.

License: MIT
