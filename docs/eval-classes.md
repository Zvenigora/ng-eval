# Eval Classes
Ng-eval provides a set of classes for evaluating expressions.

## ParserOptions
The `ParserOptions` are used to configure the `ParserService`. It is based on Acorn `Options` with a few extra properties. The following options are available:
 - `ecmaVersion`: The version of ECMAScript to parse. Supported values are 3, 5, 6, 7, 8, 9, 10, 11, 12, 2015, 2016, 2017, 2018, 2019, 2020, 2021 or 2022. Default is 2020,
 - `extractExpressions`: If true, the parser will extract expressions from the source code and store them in the expressions property of the returned AST. Default is true for `ParserService`, false for `EvalService`, `CompileService` and `DiscoveryService`,
 - `cacheSize`: The size of the cache used to store hashed expressions. Default is 100.

## EvalOptions
The `EvalOptions` are used to configure the `EvalService`. The following options are available:
 - `caseInsensitive`: If true, the expression will be evaluated in case insensitive mode. Default is false.

## EvalLookup
The `EvalLookup` is a callback function is used to lookup variables and functions from consumer application.

## EvalContext
`EvalContext` is used to evaluate expressions by `EvalService`. It has the following properties:
 - `original`: The original `Context`,
 - `priorScopes`: The prior scopes used to evaluate the expression,
  - `scopes`: The stack of current scopes used to evaluate the expression,
  - `lookups`: The registry of lookup functions used to lookup variables and functions,
  - `options`: The options used to evaluate the expression.

## EvalResult
The `EvalResult` is the result of evaluating an expression. It has the following properties:
 - `stack`: The stack to evaluate the expression,
 - `value`: The value of the expression,
 - `error`: The error that occurred while evaluating the expression,
 - `errorMessage`: The error message that occurred while evaluating the expression,
 - `isError`: True if an error occurred while evaluating the expression,
 - `isSuccess`: True if no error occurred while evaluating the expression,
 - `isUndefined`: True if the value of the expression is undefined,
 - `trace`: The trace of the expression,
 - `context`: The context used to evaluate the expression,
 - `options`: The options used to evaluate the expression,
 - `startDate`: The start date of the evaluation,
 - `endDate`: The end date of the evaluation,
 - `duration`: The duration of the evaluation.

## EvalState
The `EvalState` is the state of the evaluation. It has the following properties:
 - `context`: The context used to evaluate the expression,
 - `options`: The options used to evaluate the expression,
 - `result`: The result of evaluating the expression,
 - `isAsync`: True if the evaluation is asynchronous.

