# ng-eval

An expression evaluator for Angular.

## Credits
Inspired by [jse-eval](https://github.com/6utt3rfly), [expression-eval](https://github.com/donmccurdy/expression-eval) and based on [acorn](https://github.com/acornjs/acorn), with thanks to their awesome work.

Many thanks to @Shelly and @donmccurdy for the initial packages.

**JavaScript expression parsing and evaluation.**

> **IMPORTANT:** As mentioned under [Security](#security) below, this library does not attempt to provide a secure sandbox for evaluation. Evaluation involving user inputs (expressions or values) may lead to unsafe behavior.

### Why ng-eval?

I wanted an evaluator to be included in one of my other projects. I found some great libraries, but they didn't have the features I needed and I found some issues with Angular integration. So I decided to create my own.

- [Usage](#usage)
  * [Install](#install)
- [API](#api)
  * [Parsing](#parsing)
  * [Evaluation](#evaluation)
  * [Compilation](#compilation)
  * [Async Evaluation and Compilation](#async-evaluation-and-compilation)
  * [Discovery](#discovery)
- [ESTree Nodes Supported](#estree-nodes-supported)
- [Related Packages](#related-packages)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)


## Usage
Evaluates an [estree](https://github.com/estree/estree) expression from [acorn](https://github.com/acornjs/acorn).


### Install

Install:
```
npm install --save @zvenigora/ng-eval-core
```

Import:

```javascript
import { ParserService, EvalService, 
  CompilerService, DiscoveryService } from '@zvenigora/ng-eval-core';
```

## API

### Parsing

```javascript
import { ParserService } from '@zvenigora/ng-eval-core';

private service: ParserService;
...
const ast = service.parse('1 + foo');
```

The result of the parse is an AST (abstract syntax tree), like:

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

### Evaluation
Evaluation executes the AST using the given context `eval(ast, context)`. By default, the context is empty.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

private service: EvalService;
...
const expression = '2 + 3 * a';
const context = { a: 10 };
const result = service.simpleEval(expression, context); // 32
```

Since the default context is empty, it prevents using built-in JS functions.
To allow those functions, they can be added to the `context` argument passed into the `eval` method:
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
```

### Compilation

```javascript
import { CompilerService } from '@zvenigora/ng-eval-core';

private service: CompilerService;
...
const fn = service.compile('x + y');
const context = { x: 1, y: 2 };
const value = service.call(fn, context, options); // 3
```


### Async evaluation and compilation

Ng-eval has a limited support for asynchronous expression based on JavaScript promises.

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

private service: EvalService;
...
const context = {
  one: 1,
  two: 2,
  asyncFunc: async (a: number, b: number) => { return await (a+b); }
};
const expr = 'asyncFunc(one, two)';
const value = await service.simpleEvalAsync(expr, context); // 3
```

```javascript
import { CompilerService } from '@zvenigora/ng-eval-core';

private service: CompilerService;
...
const context = {
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
const fn = service.compileAsync(expr);
const result = await service.callAsync(fn, context); // 3
```

### Discovery
Discovery service finds all nodes for the given node type.

```javascript
import { DiscoveryService } from '@zvenigora/ng-eval-core';

private service: DiscoveryService;
...
const expressions = service.extract('1 + 2 * a', 'BinaryExpression'); // 2 nodes
```

### ESTree nodes supported:
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
 - `ThisExpression`
 - `NewExpression`
 - `TemplateLiteral`
 - `TaggedTemplateExpression`
 - `ObjectExpression`
 - `AssignmentExpression`
 - `UpdateExpression`
 - `ArrowFunctionExpression` *potentially unsafe* (AssignmentPattern is not implemented)

## Options
To change the default behavior of the evaluator, use `options`. Options may be provided as an argument to the function call of `eval`.

### Case-insensitive evaluation

While JavaScript is a case-sensitive language, some may find it hard to use. To provide case-insensitive evaluation, set `caseInsensitive` to `true`. 

```javascript
import { EvalService } from '@zvenigora/ng-eval-core';

private service: EvalService;
...
const options = {caseInsensitive: true};
...
const expression = '2 + 3 * A';
const context = { a: 10 };
const result = service.simpleEval(expression, context, options); // 32
```

## Related Packages
Depending on your specific use-case, there are other
related packages available, including:
- [jsep](https://github.com/EricSmekens/jsep)
- [jse-eval](https://github.com/6utt3rfly)
- [expression-eval](https://github.com/donmccurdy/expression-eval)
- [eval-estree-expression](https://github.com/jonschlinkert/eval-estree-expression)
- [es-tree-walker](https://github.com/Rich-Harris/estree-walker)
- [acorn](https://github.com/acornjs/acorn)
- [astring](https://github.com/davidbonnet/astring)

## Security

Although this package does [avoid the use of `eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Do_not_ever_use_eval!), it _cannot guarantee that user-provided expressions, or user-provided inputs to evaluation, will not modify the state or behavior of your application_. This library does not attempt to provide a secure sandbox for evaluation. Evaluation of arbitrary user inputs (expressions or values) may lead to unsafe behavior. If your project requires a secure sandbox, consider alternatives.

## Contributing

Want to file a bug, contribute some code, or improve documentation?
Excellent! Read up on the guidelines for [contributing](CONTRIBUTING.md)
and then feel free to submit a PR with your contribution.

### Code of Conduct

Help us keep this project open and inclusive. Please read and follow
the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT License.
