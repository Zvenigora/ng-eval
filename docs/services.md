# Eval Classes
Ng-eval provides a set of service for evaluating expressions.

## `ParserService`
Parses an expression and returns an ES6/ES2023 AST (Abstract Syntax Tree) object. Under the hood, it uses the `parse` function. Options parameter was extended to support default value of `ecmaVersion` and `extractExpressions` properties. The default value for `ecmaVersion` is `2020` and the default value for `extractExpressions` is `false`. To spead up subsequent calls, the service supports caching of the AST objects.

```js
import { ParserService } from 'ng-eval';

constructor(private parser: ParserService) {}
...

const expr = '1 + 2';
const ast = parser.parse(expr, {} as ParserOptions);  // returns an AST object
```

## `DiscoveryService`
Extracts expressions from an AST object. It is just a wrapper around the `extract` function. The function is useful to determine if an expression has nodes of the given type. For example, if you want to know if an expression has a `Identifier` nodes, you can use the function as follows:

```js
import { DiscoveryService } from 'ng-eval';

constructor(private discoveryService: DiscoveryService) {}
...

const expression = '1 + 2 * a';
const searchType = 'BinaryExpression';
const expressions = discoveryService.extract(expression, searchType); // returns array of binary expression nodes
```

## `EvalService`
Evaluates an expression and returns the result. It utilizes the `evaluate` function. The function accepts three parameters: `node`, `context` and `options`. The `node` parameter is AST of the expression to evaluate. The `context` parameter is an object that contains the variables and functions that are used in the expression. The function returns the result of the expression. If the expression is invalid, the function throws an error.

```js
import { EvalService } from 'ng-eval';

constructor(private evalService: EvalService) {}
...

const expression = '2 + 3 * a';
const context = { a: 10 };
const result = evalService.eval(expression, context); // 32
```

The service provides a limited support for asynchronous expressions. It executes `evaluateAsync` function and returns a promise that resolves to the result of the expression. If the expression is invalid, the function throws an error.

```js
import { EvalService } from 'ng-eval';

constructor(private evalService: EvalService) {}
...

const context = {
  one: 1,
  two: 2,
  asyncFunc: async (a: number, b: number) => { return await (a+b); }
};
const expr = 'asyncFunc(one, two)';
const value = await evalService.evalAsync(expr, context); // 3
```

## `CompilerService`
Compiles an expression and returns a function that can be used to evaluate the expression. It utilizes the `compile` function. The function accepts two parameters: `node` and `options`. The `node` parameter is AST of the expression to evaluate. The function returns a function that accepts a context object and returns the result of the expression. If the expression is invalid, the function throws an error.

```js
import { CompilerService } from 'ng-eval';

constructor(private compilerService: CompilerService) {}
...

const expression = 'x + y';
const fn = compilerService.compile(expression);
const context = { x: 1, y: 2 };
const options = { };
const result = compilerService.call(fn, context, options);  // returns 3
```

The service provides a limited support for asynchronous expressions. It executes `compileAsync` function and returns a function that accepts a context object and returns a promise that resolves to the result of the expression. If the expression is invalid, the function throws an error.

```js
import { CompilerService } from 'ng-eval';

constructor(private compilerService: CompilerService) {}
...

const context: BaseContext = {
  one: 1,
  two: 2,
  promiseFunc: (a: number, b: number) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            return resolve(a + b);
          }, 1000);
        });
      }
};
const expr = 'promiseFunc(one, two)';
const fn = compilerService.compileAsync(expr);
const options = { };
const result = await compilerService.callAsync(fn, context, options); // 3
```





