# Security

This document covers what `@zvenigora/ng-eval-core`'s evaluator protects against, how it does so, and
where the protection stops. The two other packages in this repository, `@zvenigora/ng-eval-signals`
and `@zvenigora/ng-eval-forms`, evaluate through it and add the write policies described below.

**ng-eval is not a sandbox.** Read the threat model and the documented limits before you evaluate an
expression you did not write.

## Threat model

- **The expression is the untrusted input.** It may come from a user, an API or a database. The
  protections below assume it was written to escape.
- **The context is trusted.** The host chooses it, and every value and function in it is the host's.
  An expression reaches only what the context holds: its keys, the members of what they hold, and
  what the functions it calls return. A function the context holds runs with the host's privileges,
  as any JavaScript function does.
- **The evaluator runs in the host's JavaScript realm.** It walks the parsed expression itself and
  never hands the expression to `eval` or `Function`, but it shares the realm's globals and built-in
  prototypes. The protections below exist to keep an expression from reaching those through the
  values it holds.

## Protections

### The prototype-pollution guard

Implemented in
[prototype-pollution-guard.ts](modules/eval-core/src/lib/internal/visitors/prototype-pollution-guard.ts),
applied by the identifier, member, assignment, update, object, pattern and variable-declaration
visitors, and pinned by
[eval.service.prototype-pollution.spec.ts](modules/eval-core/src/lib/actual/services/eval.service.prototype-pollution.spec.ts).

- **A blocklist, matched by exact name**: `__proto__`, `constructor`, `prototype`,
  `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `hasOwnProperty`,
  `isPrototypeOf`, `propertyIsEnumerable`, `toString`, `valueOf` and `toLocaleString`. It is a set
  lookup, not a pattern, so no spelling can match by accident.
- **Identifiers are checked before any lookup.** A bare identifier, `this.k`, and a member of an
  `EvalScope` held in the context refuse a blocklisted name before the context is consulted, so an
  expression cannot read what the context inherits from `Object.prototype`. This is the fix for
  GHSA-jh43-xc7j-93c2, below.
- **Member reads and writes** refuse a blocklisted key on an object receiver, in member access,
  assignment, update and object literals. **Binding names** — an arrow parameter, a `let` or `const`,
  a destructuring target — refuse it too.
- **The resolved-key re-check.** Under `caseInsensitive`, a key written as `CONSTRUCTOR` resolves to
  whatever key it matched, and the guard checks the key it matched, not only the key as written, for
  identifiers and members alike. Pinned by
  [eval.service.case-variant-guard.spec.ts](modules/eval-core/src/lib/actual/services/eval.service.case-variant-guard.spec.ts).
- **The primitive carve-out.** On a string, number or boolean receiver, seven of the names are
  refused — `__proto__`, `constructor`, `prototype` and the four accessor definers — and the other
  six, `toString` and its kin, stay readable, since they are ordinary reads on a primitive. Pinned by
  [eval.service.primitive-carve-out.spec.ts](modules/eval-core/src/lib/actual/services/eval.service.primitive-carve-out.spec.ts).

A refusal throws an `Error` whose message names the property. On an identifier, a member read or
write, an update or a binding the message is
`'Access to dangerous property "<name>" is blocked for security reasons'`. On an object literal's key
it is `'Object creation blocked: Cannot create object with dangerous property "<name>"'`, and on a
spread `'Spread operation blocked: Object contains dangerous property "<name>" that could lead to prototype pollution'`.

### Call sandboxing

Implemented in
[call-expression.ts](modules/eval-core/src/lib/internal/visitors/call-expression.ts) and, for `new`,
[new-expression.ts](modules/eval-core/src/lib/internal/visitors/new-expression.ts); pinned by
[eval.service.call-security.spec.ts](modules/eval-core/src/lib/actual/services/eval.service.call-security.spec.ts).

A call is refused, with the message `'Function call blocked for security reasons: <name>'`, when:

- the callee's name, as the expression writes it, is one of fourteen: `Function`, `eval`,
  `setTimeout`, `setInterval`, `setImmediate`, `require`, `import`, `importScripts`,
  `XMLHttpRequest`, `fetch`, `WebSocket`, `Worker`, `SharedWorker` and `ServiceWorker`;
- the callee is the realm's `Function` itself, called directly, whatever name it is bound under;
- the callee is not a native function, and its source text matches one of six patterns: a call of
  `eval`, `Function` or `new Function`, a `__proto__` member, `prototype.constructor`, or
  `globalThis`.

A tagged template's tag goes through the same checks and the same write policy as a callee: a member
tag is checked under its property name, a computed key included, and called with its object as
`this`, and any other tag is called with the context as `this`, as a bare call is; pinned by
[tagged-template-expression.spec.ts](modules/eval-core/src/lib/internal/visitors/tagged-template-expression.spec.ts).

`new` has three checks of its own, and refuses with the message
`'Constructor blocked for security reasons: <name>'`:
- a list of ten constructor names, read only when the constructor is a bare identifier, so a
  constructor reached as a member is not name-checked;
- the four function constructors, by identity;
- a source-text test, which applies to native constructors too.

### The iteration budget

Every `for` loop in an evaluation charges one shared budget, `maxIterations`, 100,000 iterations per
evaluation by default, and exceeding it throws `'Iteration budget exhausted after <n> iterations'`
rather than returning a partial value. `maxTraceItems`, 10,000 by default, bounds the memory the
evaluation's trace can take. Implemented in
[for-statement.ts](modules/eval-core/src/lib/internal/visitors/for-statement.ts) and
[eval-state.ts](modules/eval-core/src/lib/internal/classes/eval/eval-state.ts); pinned by
[for-statement.spec.ts](modules/eval-core/src/lib/internal/visitors/for-statement.spec.ts) and
[trace-bound.spec.ts](modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts).

### Write policies

- **`eval-core`**: a context may implement `EvalContext.checkMemberWrite`, which is asked before
  every member write and before a built-in method writes into what it is handed, called directly or
  through `call`, `apply` or `bind`, and refuses by throwing. Implemented in
  [eval-context.ts](modules/eval-core/src/lib/internal/classes/eval/eval-context.ts) and
  [member-write-policy.ts](modules/eval-core/src/lib/internal/visitors/member-write-policy.ts);
  pinned by
  [member-write-policy.spec.ts](modules/eval-core/src/lib/internal/visitors/member-write-policy.spec.ts).
- **`eval-signals`**: an expression may write into what it created and into nothing it was given:
  such a write throws `SignalContextWriteError`, whose `kind` says whether a key, a member or a
  method wrote. Implemented in
  [signal-context.ts](modules/eval-signals/src/lib/signal-context.ts); pinned by
  [signal-context.spec.ts](modules/eval-signals/src/lib/signal-context.spec.ts).
- **`eval-forms`**: `guardIdentifiers` refuses, when a rule is registered, any identifier named
  after an own property of `Object.prototype`, at both entry points. Implemented in
  [guard-identifiers.ts](modules/eval-forms/src/lib/guard-identifiers.ts); pinned by
  [guard-identifiers.spec.ts](modules/eval-forms/signals/src/lib/guard-identifiers.spec.ts).

## Documented limits

- **It is not a sandbox.** An expression runs in the host's realm, against the host's context, and
  the checks above are a guard on that path, not an isolation boundary.
- **The call checks refuse a name, not a value.** They read three things: the callee's name as the
  expression writes it, the identity of `Function` when it is the callee, and the source text of a
  function that is not native. So a dangerous function the context holds, or that is reachable from
  it, can be called whenever the call does not name it. The expression's author chooses how, not
  only the host. Measured with `eval` in the context under its own name, where `eval("1+1")` is
  refused:
  - under another name: with `eval` bound as `run`, `run("1 + 1")` is 2;
  - through `call`, `apply` or `bind`: `eval.call(null, "1+1")`, `eval.apply(null, ["1+1"])` and
    `eval.bind(null)("1+1")` are each 2. With `Function` bound,
    `Function.call(null, "return 7")()` is 7;
  - as a callback that a native function makes: `["1+1"].map(eval)` is `[2]`;
    `Reflect.apply(eval, null, ["1+1"])` is 2 with `Reflect` bound; and
    `Promise.resolve("1+1").then(eval)` resolves to 2 with `Promise` bound;
  - and a host function whose source text a pattern refuses is refused as `host()`, and runs as
    `host.call(null)`.

  In each, the function checked is a native method or an unlisted name, and the dangerous function is
  an argument or a receiver, which no check reads ([A35](docs/backlog.md#a35)).

  **The host's mitigation**: never place `eval`, `Function`, the timers (`setTimeout`,
  `setInterval`, `setImmediate`) or any other function the call sandbox lists in the context, under
  any name, nor an object from which one is reachable. Put in the context only what the expression's
  author may use.
- **The budget counts loop iterations, not time or depth.** Recursion through arrow functions is not
  charged: `(f => f(f))(f => f(f))` ends in the engine's own stack overflow, a `RangeError`, whatever
  `maxIterations` is. Neither is the time a host function takes.
- **Calls and arrow functions are marked potentially unsafe** in the list of supported syntax, for
  the reasons above.
- **Open register entries that bear on this**:
  [A25](docs/backlog.md#a25), each `await` starts a 30-second timer that is never cleared; and
  [A33](docs/backlog.md#a33), under `caseInsensitive` a cached miss can hide a key added later — no
  refusal is skipped.

## Advisories

### Advisories for ng-eval

Advisories published against the packages in this repository.

| Advisory | Package | Affected | Patched |
|----------|---------|----------|---------|
| [GHSA-jh43-xc7j-93c2](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-jh43-xc7j-93c2) | `@zvenigora/ng-eval-core` | < 0.10.1 | 0.10.1, 0.11.0 |

#### GHSA-jh43-xc7j-93c2 — prototype pollution through identifier resolution

Severity high, published 2026-10-07. An identifier was resolved against the evaluation context,
and for a context built from a plain object or a class instance the lookup was a bare property
access, so an expression resolved the members the context inherits from `Object.prototype`:
`constructor` evaluated to `Object`, and through `Object`'s own static functions an expression
could modify shared prototypes. `this.k` and `this["k"]` did the same. The blocklist guarded
member access to the objects an expression holds, not resolution against the context. Every
published version up to 0.10.0 is affected.

Since 0.10.1 and 0.11.0 a name on the blocklist is refused before any lookup, as an identifier,
as `this.k` or `this["k"]`, or as a member of an `EvalScope` held in the context, and under
`caseInsensitive` so is a matched key that is one. A context key with such a name can no longer
be read by an expression; rename it.

**Upgrading.** 0.10.1 is a patch on the 0.10 line, and the peer ranges of
`@zvenigora/ng-eval-signals` 0.3.0 and `@zvenigora/ng-eval-forms` 0.3.x admit it. 0.11.0 is a
breaking minor for other reasons; `@zvenigora/ng-eval-signals` 0.4.0 and
`@zvenigora/ng-eval-forms` 0.4.0 require it. The fix, its probes and the code history behind
"every published version" are in [`docs/backlog-retired.md`](docs/backlog-retired.md#b6), B6.

### Reviewed External Advisories

Advisories raised against related projects, and whether ng-eval shares the defect. Each
verdict below was reached by running the advisory's own proof-of-concept against this
evaluator, not by reading the code alone.

| Advisory | Project | Applies to ng-eval? |
|----------|---------|---------------------|
| [GHSA-pj3p-xpg7-h7gw](https://github.com/Zvenigora/jse-eval/security/advisories/GHSA-pj3p-xpg7-h7gw) | `@zvenigora/jse-eval` <= 1.10.0 | **No** |

#### GHSA-pj3p-xpg7-h7gw — case-insensitive guard bypass leading to RCE

**The reported defect.** `jse-eval` blocked prototype-chain escapes with the regex
`/^__proto__|prototype|constructor$/`. It has no `i` flag, so `x.CONSTRUCTOR` was not
matched; the library's case-insensitive fallback lookup then resolved that spelling back to
the real `constructor`, and the chain

```js
x.CONSTRUCTOR.CONSTRUCTOR("return process")().mainModule
  .require("child_process").execSync("id")
```

reached `Function` and arbitrary execution. A secondary finding: the alternation groups as
`(^__proto__)|(prototype)|(constructor$)` rather than `^(__proto__|prototype|constructor)$`,
so it both over-blocks names that merely *contain* a fragment and under-blocks names that
merely *end* with one.

**Why ng-eval does not share it.** Three reasons, in increasing order of importance:

1. **No dependency.** ng-eval builds on `acorn` / `acorn-walk` and does not depend on
   `jse-eval`, `expression-eval` or `jsep`. This is a shared-bug-class question, not a
   supply-chain one.
2. **No regex.** `isDangerousProperty` (`visitors/prototype-pollution-guard.ts`) matches
   against an exact-match `Set` of names, and so does `isDangerousPrimitiveProperty`, which
   checks a string, number or boolean receiver against a subset of them (below). The
   alternation-grouping defect cannot arise in that form, so neither half of the secondary
   finding applies.
3. **The guard tests the resolved key.** This is the load-bearing one. Under
   `caseInsensitive`, `member-expression.ts` resolves a case variant to the key it actually
   matched and then re-checks *that* key, not only the key as it was written. So, on an object
   receiver, `x.CONSTRUCTOR` resolves to `constructor` and is refused, as are `x.CoNsTrUcToR`,
   `x["CONSTRUCTOR"]` and the runtime-computed `x[k.toUpperCase()]`. A primitive receiver is
   never case-corrected, so there is no resolved key to re-check: a variant on one is a missing
   property, and the key as written is checked against the primitive subset —
   "Primitive receivers" below.

**Verification.** The proof-of-concept and its variants are pinned in
`modules/eval-core/src/lib/actual/services/eval.service.case-variant-guard.spec.ts`. That
spec was confirmed load-bearing rather than assumed: with the resolved-key re-check
neutered, `x.CONSTRUCTOR` yields `Object` again and five of its tests fail — while the
**entire 717-test suite that existed before it passed unchanged**. Nothing else covers that
line.

Under `caseInsensitive: false` the chain fails for an unrelated reason — no case correction
runs at all, so the variant is simply a missing property — which is why the spec covers
both option settings separately.

**Primitive receivers — the carve-out, narrowed in `eval-core` 0.9.0.** Checking this
advisory found a gap beside it. Until 0.9.0 a string, number or boolean receiver skipped the
blocklist entirely, so `"abc".constructor` returned the `String` function and `s.__proto__`
returned `String.prototype`. No escalation was found from either — every second hop to a
dangerous name was refused, and so was every write to a built-in prototype — but a primitive
could reach its global constructor and its prototype.

Since 0.9.0 a primitive receiver is refused `constructor`, `__proto__`, `prototype`,
`__defineGetter__`, `__defineSetter__`, `__lookupGetter__` and `__lookupSetter__`, with the
blocklist's own error, with or without `caseInsensitive`. The rest of the blocklist —
`toString`, `valueOf`, `toLocaleString`, `hasOwnProperty`, `isPrototypeOf` and
`propertyIsEnumerable` — stays readable on a primitive, because those are ordinary reads
there: `s.toString()`, `n.toLocaleString()`, `s.hasOwnProperty("length")`.

Case variants such as `s.Constructor` are not refused, and need not be: the subset is matched
by exact key, and a primitive receiver is never case-corrected — the lookup that corrects case
runs only for `typeof 'object'` receivers — so under `caseInsensitive` `s.CONSTRUCTOR` reads
`'abc'['CONSTRUCTOR']`, which is `undefined`, and never reaches `String`. The last test of
the third block of `eval.service.primitive-carve-out.spec.ts` fails if that ever changes, and
the variants would then need refusing. That spec covers the rest, and the probe results are kept
in [`docs/backlog-retired.md`](docs/backlog-retired.md#b1), B1.

## Reporting a vulnerability

Do not open a public issue for a vulnerability. GitHub's private vulnerability reporting is not
enabled for this repository (checked 2026-10-14), and the repository publishes no security address.
Contact the maintainer named as the author of every package here, Zvenigora, through
[github.com/zvenigora](https://github.com/zvenigora), and ask for a private channel before sending
details. Fixed vulnerabilities are published as advisories on the repository and listed under
"Advisories for ng-eval" above.
