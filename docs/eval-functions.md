# Eval Functions
Ng-eval provides a set of functions for evaluating expressions. These functions are used by the `eval` function to evaluate expressions. You can use these functions to evaluate expressions in your own code without Angular dependency.

## `parse`
Parses an expression and returns an AST (Abstract Syntax Tree) object. It is just a wrapper around the `parse` function of Acorn library. Options parameter was extended to support default value of `ecmaVersion` and `extractExpressions` options. The default value for `ecmaVersion` is `2020` and the default value for `extractExpressions` is `false`.

```js
import { parse } from 'ng-eval';

const expr = '1 + 2';
const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: true };
const result = parse(expr, options); // returns an AST object
```

## `extract`
Extracts expressions from an AST object. It is just a wrapper around the `SimpleVisitor` function of Acorn library. The function is useful to determine if an expression has nodes of the given type. For example, if you want to know if an expression has a `Identifier` nodes, you can use the function as follows:
```js
import { parse, extract } from 'ng-eval';

const expr = 'a + b*x';
const ast = parse(expr, { extractExpressions: true });
const identifiers = extract(ast, 'Identifier'); 
// returns array of identifier nodes: [
//      {type: 'Identifier', ... name: 'a'},
//      {type: 'Identifier', ... name: 'b'},
//      {type: 'Identifier', ... name: 'x'}
//    ]
```

## `evaluate`
Evaluates an expression and returns the result. It utilizes the `recursive` Acorn function. The function accepts two parameters: `node` and `state`. The `node` parameter is AST of the expression to evaluate. The `state` parameter is an object that contains the variables and functions that are used in the expression. The function returns the result of the expression. If the expression is invalid, the function throws an error.

```js 
import { evaluate, EvalState } from 'ng-eval';

const node: AnyNode = {
  "type": "Literal",
  "start": 0,
  "end": 1,
  "value": 1,
  "raw": "1"
};
const state = EvalState.fromContext({});
const result = evaluate(node, state); // 1
```

## `evaluateAsync`
Provides a limited support for asynchronous expressions. It executes `evaluate` function and returns a promise that resolves to the result of the expression. If the expression is invalid, the function throws an error.

```js
import { evaluateAsync, EvalState, parse } from 'ng-eval';
import { AnyNode, ecmaVersion } from 'acorn';

const context = {
  one: 1,
  two: 2,
  asyncFunc: async (a: number, b: number) => { return await (a+b); }
};

const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: true };

const expr = 'asyncFunc(one, two)';
const node = parse(expr, options);
const state = EvalState.fromContext(context);

const value = await evaluateAsync(node, state); // 3
```

## `compile`
Compiles the given node and returns a function that can be used by function `call` to evaluate it.

```js
import { compile, EvalState, parse, call } from 'ng-eval';
import { AnyNode, ecmaVersion } from 'acorn';

const context = {
  one: 1,
  two: 2
};

const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: true };

const expr = 'one + two';
const node = parse(expr, options);
const state = EvalState.fromContext(context);

const func = compile(node);

const value = func.call(state); // 3
const value2 = call(func, state); // 3 - alternative way
```

## `call`
Calls the given function with the given context and returns the result. The function is useful to call the function returned by `compile` function.

## `compileAsync`
Compiles the given node and returns a function that can be used by function `callAsync` to evaluate it to promise.

```js
import { compileAsync, EvalState, parse, callAsync } from 'ng-eval';
import { AnyNode, ecmaVersion } from 'acorn';

const context = {
  one: 1,
  two: 2,
  asyncFunc: async (a: number, b: number) => { return await (a+b); }
};

const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: true };

const expr = 'asyncFunc(one, two)';
const node = parse(expr, options);
const state = EvalState.fromContext(context);

const func = compileAsync(node, state);
const value = await func.call(state); // 3
const value2 = await callAsync(func, state); // 3 - alternative way
```


