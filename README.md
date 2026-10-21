# ng-eval

**JavaScript expression parsing and evaluation for Angular.** An expression arrives as a string, is
parsed with [acorn](https://github.com/acornjs/acorn), and is evaluated against a context the host
supplies, without `eval()` or `Function`.

> **IMPORTANT:** ng-eval is not a sandbox. An expression reaches whatever its context holds, and every
> function in the context runs with the host's privileges. Evaluating an expression or a value that
> came from a user may lead to unsafe behaviour. Read [`SECURITY.md`](SECURITY.md) first.

## Why ng-eval?

I wanted an evaluator to be included in one of my other projects. I found some great libraries, but they didn't have the features I needed and I found some issues with Angular integration. So I decided to create my own.

## Packages

This repository publishes three libraries. Each package's README is its documentation, and is the
copy that ships to npm.

| Package | What it does | Documentation | Changelog |
| :--- | :--- | :--- | :--- |
| `@zvenigora/ng-eval-core` | The expression parser and evaluator, exposed as Angular services, with free functions that need no injector | [README](modules/eval-core/README.md) | [CHANGELOG](modules/eval-core/CHANGELOG.md) |
| `@zvenigora/ng-eval-signals` | An expression over a context of signals as an Angular `Signal`, which recomputes exactly when a key the expression read has changed. Built on `ng-eval-core` | [README](modules/eval-signals/README.md) | [CHANGELOG](modules/eval-signals/CHANGELOG.md) |
| `@zvenigora/ng-eval-forms` | Angular form field properties driven by expressions that arrive as strings at runtime: `visible` and `text`, plus `disabled` at `/signals`. One package, two adapters: Reactive Forms at `@zvenigora/ng-eval-forms/reactive`, and Signal Forms at `@zvenigora/ng-eval-forms/signals`, which needs Angular 22. Built on the other two | [README](modules/eval-forms/README.md) | [CHANGELOG](modules/eval-forms/CHANGELOG.md) |

Expression syntax, the supported node types and the evaluator's options are documented in
`ng-eval-core`'s README. Each package's peer dependencies, with their ranges, are in its README's
`## Install` section.

## Install

Install a package with the packages it is built on:

```sh
npm install --save @zvenigora/ng-eval-core
npm install --save @zvenigora/ng-eval-signals @zvenigora/ng-eval-core
npm install --save @zvenigora/ng-eval-forms @zvenigora/ng-eval-signals @zvenigora/ng-eval-core
```

## Worked examples

Two worked examples build the same server-supplied checkout form with `@zvenigora/ng-eval-forms`:

- [With Reactive Forms](docs/forms/worked-example.md), through `@zvenigora/ng-eval-forms/reactive`.
- [With Signal Forms](docs/forms/worked-example-signals.md), through `@zvenigora/ng-eval-forms/signals`.

## Security

[`SECURITY.md`](SECURITY.md) covers the threat model, the protections the code has, and where they
stop. It lists the [advisories published against ng-eval](SECURITY.md#advisories-for-ng-eval), among
them GHSA-qrqj-3445-3rjx and GHSA-jh43-xc7j-93c2, with the versions that fix each. It also records
[reviewed external advisories](SECURITY.md#reviewed-external-advisories): advisories raised against
related projects, and whether ng-eval shares the defect. To report a vulnerability, follow
[its reporting section](SECURITY.md#reporting-a-vulnerability).

## Changelog

Each package keeps its own changelog, linked in the table above. The repository's
[`CHANGELOG.md`](CHANGELOG.md) lists the three and records workspace changes that ship in no package.

## Credits

Inspired by [jse-eval](https://github.com/6utt3rfly), [expression-eval](https://github.com/donmccurdy/expression-eval) and based on [acorn](https://github.com/acornjs/acorn), with thanks to their awesome work.

Many thanks to @Shelly and @donmccurdy for the initial packages.

## Related packages

Depending on your specific use-case, there are other
related packages available, including:
- [jsep](https://github.com/EricSmekens/jsep)
- [jse-eval](https://github.com/6utt3rfly)
- [expression-eval](https://github.com/donmccurdy/expression-eval)
- [eval-estree-expression](https://github.com/jonschlinkert/eval-estree-expression)
- [es-tree-walker](https://github.com/Rich-Harris/estree-walker)
- [acorn](https://github.com/acornjs/acorn)
- [astring](https://github.com/davidbonnet/astring)

## Contributing

Want to file a bug, contribute some code, or improve documentation?
Excellent! Read up on the guidelines for [contributing](CONTRIBUTING.md)
and then feel free to submit a PR with your contribution.

### Code of Conduct

Help us keep this project open and inclusive. Please read and follow
the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT License. See [`LICENSE`](LICENSE).
