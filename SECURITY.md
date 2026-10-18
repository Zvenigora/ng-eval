# Security

This document covers what `@zvenigora/ng-eval-core`'s evaluator protects against, how it does so, and
where the protection stops. The two other packages in this repository, `@zvenigora/ng-eval-signals`
and `@zvenigora/ng-eval-forms`, evaluate through it and add the write policies described below.

**ng-eval is not a sandbox.** Read the threat model and the documented limits before you evaluate an
expression you did not write.

## Mitigations

- **The context is trusted — place no listed function in it.** Not `eval`, `Function`, the timers
  (`setTimeout`, `setInterval`, `setImmediate`), `fetch`, or any other function the
  [call sandbox](#call-sandboxing) lists, under any name, nor an object from which one is reachable.
  Put in the context only what the expression's author may use. Every route to a listed function
  this document describes, refused or open, starts from one the context holds or can reach.
- **In a browser, serve a Content Security Policy without `'unsafe-eval'`.** The browser then refuses
  `eval`, `Function` and a string handed to a timer, whatever reaches them. It governs code built from
  strings and nothing else: the other listed functions, `fetch` among them, are covered by the first
  mitigation alone.
- **In Node, run with the --disallow-code-generation-from-strings flag.** Measured 2026-10-16 with
  Node 26.4, against the build that ships as 0.12.1, linked as an application build links it:
  - `eval` and the four function constructors — `Function`, AsyncFunction, GeneratorFunction and
    AsyncGeneratorFunction — handed a string through a host container, or through either of two
    forwarders a host built, each threw an `EvalError` instead of running it. Those are routes the
    checks below leave open; no other open route was measured.
  - Each refusal under [Dangerous function values](#dangerous-function-values), and the ordinary
    expressions measured beside them, gave the same result as without the flag.
  - It did not stop a listed function that builds no code from a string: `fetch` still fetched. Nor
    did it reach the `eval` of a context made with Node's vm module, which still ran.
  - Node's own timers take no string handler, with or without the flag.
  - Loaded unlinked, through Angular's JIT compiler, the package fails under the flag, since that
    compiler builds its own code from strings.

These come before the checks below, not instead of them. The checks narrow the routes by which an
expression reaches a listed function; the first mitigation keeps one from being there to reach.

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
- the callee's value is a listed value, under any name ([below](#dangerous-function-values));
- the callee is not a native function, and its source text matches one of six patterns: a call of
  `eval`, `Function` or `new Function`, a `__proto__` member, `prototype.constructor`, or
  `globalThis`. This test is a heuristic, as the bound-name rule below is: it can be evaded, it can
  refuse a benign function, and it reads only the callee ([limits](#documented-limits)).

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

It also refuses a constructor whose value is a listed value, as a call does.

### Dangerous function values

Implemented in
[dangerous-values.ts](modules/eval-core/src/lib/internal/visitors/dangerous-values.ts), called from
the call, `new` and tag visitors and from `pushVisitorResult` in
[visitor-result.ts](modules/eval-core/src/lib/internal/visitors/visitor-result.ts); pinned by
[eval.service.dangerous-values.spec.ts](modules/eval-core/src/lib/actual/services/eval.service.dangerous-values.spec.ts),
whose cases S1–S3 cover the capture, C1–C15t the callee and V1–V21 every other read. Up to 0.12.0
the call checks read a name, not a value ([A35](docs/backlog.md#a35)).

**Defense in depth, not a boundary.** These checks narrow the routes by which an expression reaches
a listed function the context holds. They do not make it safe to place one there: two routes stay
open in 0.12.1, listed [below](#what-these-checks-do-not-cover), and only the
[mitigations](#mitigations) cover every route.

**The listed values**, matched by identity, not by name:
- the global value of each name the call sandbox lists, where the realm has one, and zone.js's
  saved original of each one it has patched;
- the constructors of async functions, generators and async generators — AsyncFunction,
  GeneratorFunction and AsyncGeneratorFunction — read off function literals in the library's own
  code, never built from source text. Where the bundler downlevels async functions, the constructor
  read is `Function` itself and nothing is added for it ([limits](#documented-limits));
- a bound function whose name, with every `"bound "` prefix stripped, is one of those names:
  `eval.bind(null)` is named `"bound eval"`. This rule reads a name, so it is a heuristic, as the
  source-text test is.

**When they are captured.** At the first function value a check meets, during the first
evaluation, never at module load. In an Angular application zone.js patches the timers before any
evaluation runs, so the set holds the wrappers a context holds, and zone.js's originals too. When
`setTimeout` is replaced later, the next check adds the current value of every listed global and
removes nothing, so a value captured earlier stays refused. Another listed global replaced on its
own is not added until `setTimeout` changes ([limits](#documented-limits)).

**At the callee.** A call, a `new` or a tagged template whose callee value is a listed value is
refused under any name, with the site's own message, `'Function call blocked for security reasons: <name>'`
or, for `new`, `'Constructor blocked for security reasons: <name>'`. The name is the written name,
the property name or `'anonymous'`. With `eval` in the context, that refuses:
- an alias, `run("1+1")`, also called as `run?.("1+1")` or used as a tag;
- a member, `tools.run("1+1")`, and a scope namespace, `ns.run("1+1")`;
- `this.k`, and a destructured name, `let { run } = tools; run("1+1")`;
- a call result, `getEval()("1+1")`;
- a case variant under `caseInsensitive`;
- a host-bound function, `e("1+1")` with `e = eval.bind(null)`;
- a timer under `new`, whose list of names never held the timers. Up to 0.12.0, in a browser
  application with zone.js, `new setTimeout("<code>", 0)` was constructed, and zone.js handed the
  string to the browser's timer.

This check sees only the callee; see [what it does not cover](#what-these-checks-do-not-cover).

**Everywhere else: the funnel.** Every value the walk pushes on its own stack is checked as it is
pushed. A listed value pushed by any node but a callee, a tag or `typeof`'s operand throws
`'Access to dangerous function "<name>" is blocked for security reasons'`, naming the identifier,
the property name or the function's own `name`. With `eval` in the context, each of these is
refused at the read:
- an argument: `["1+1"].map(eval)`, `Reflect.apply(eval, null, ["1+1"])`, and
  `Promise.resolve("1+1").then(eval)`, synchronously;
- the receiver of `call`, `apply` or `bind`: `eval.call(null, "1+1")`, `eval.bind(null)("1+1")`,
  and with `Function` in the context, `Function.call(null, "return 7")()`;
- a member or a call result handed on: `["1+1"].map(tools.eval)`,
  `tools["ev" + "al"].call(null, "1+1")` and `["1+1"].map(getEval())`;
- an element of an array, or a property of an object, that the expression builds:
  `[[run, null, ["1+1"]]].map(apply.bind(Reflect.apply, null))`;
- a callee under which the value is read, which takes this message rather than the callee's: a
  branch of a conditional or a logical, `(c ? eval : f)("1+1")`; a sequence's last expression,
  `(0, eval)("1+1")`, under `new` or as a tag too; and `(eval)("1+1")` under the parser's
  preserveParens option;
- a host-bound function handed on, `["1+1"].map(e)`, and the expression's own result, `eval`.

Reads that only inspect the value throw too, since the rule has no exception for them:
- assigning over one, `fetch = 1` or `obj.fetch = 1`;
- a postfix update, `obj.fetch++`, which writes before it throws ([A40](docs/backlog.md#a40));
- an operator's operand, `x instanceof Function` or `obj.fetch != null`;
- a conditional's test, a template interpolation and a declaration's initializer;
- `typeof (eval)` under preserveParens, whose operand is the parenthesis.

**Exempt**: a callee or tag node itself, which the check at the callee covers, and `typeof`'s
operand, so `typeof eval` is still `"function"`. Only that node is exempt, never what is under it:
in `typeof f(eval)` the argument is read, and refused.

The funnel sees only the walk's own values; see
[what it does not cover](#what-these-checks-do-not-cover).

#### What these checks do not cover

Two routes reach a listed function without passing through the walk's own values, so 0.12.1 is
partial hardening, not a fix for the whole class. The [first mitigation](#mitigations) stops both.
Each is listed again, with the other limits, under [Documented limits](#documented-limits).
- **A route through `this`.** In 0.12.1 an expression can still reach a listed function the context
  holds through `this` ([A39](docs/backlog.md#a39)). A host stops it by placing no listed function
  in the context. A later release narrows it; **which release closes it entirely is not yet
  settled**, so treat it as open and rely on the mitigation, not on a version.
- **A container the host provides.** An array the host built, holding a listed function and spread
  by the expression into a native call, hands the function to native code without it being pushed.

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
- **A route through `this`, open in 0.12.1** ([A39](docs/backlog.md#a39)). It exists, and a host
  stops it by placing no listed function in the context. **No version closes it today**: work to
  narrow it is under way, part of it is measured and not shipped, and what closes the rest is an
  open question in the A35 plan ([§ 8 q7](docs/a35/plan.md#8-open-questions)). Treat the route as
  open until this entry says otherwise, and rely on the mitigation rather than on a release. The
  code review of the A35 plan's step 4 found it, and the plan's M14 and M16 measured it
  ([§ 1.3](docs/a35/plan.md#13-measurements-run-for-this-plan)). The measurements and their probes
  are held in the repository's draft security advisory.
- **A container the host provides**, spread by the expression into a native call: its elements
  reach native code without the walk pushing them, so neither check sees them. Measured as the A35
  plan's [finding 3](docs/a35/plan.md#12-findings-that-shape-the-plan). It is not checked, by
  decision: a partial check of containers has no boundary a host could rely on, since each level it
  checked would leave the next one open.
- **A function from another realm**, such as an iframe's `eval`, has another identity, so it is not a
  listed value. Measured 2026-10-16 in Node: an `eval` taken from a new context of Node's vm module
  ran when called.
- **AsyncFunction and AsyncGeneratorFunction where async functions are downlevelled**, as in this
  repository's test realm and in an Angular zone.js build. The constructor read off the literal is
  `Function` itself, so neither is captured, and the capture records that (cases S1 and S3). Neither
  is a global there: an expression reaches one only through some value's `constructor`, which the
  prototype-pollution guard refuses, so only a host could supply one.
- **A listed global replaced on its own after the capture**, such as `fetch` wrapped late by
  instrumentation. Only `setTimeout` is watched, so the replacement is not a listed value until
  `setTimeout` changes. Measured 2026-10-16: a replacement for `fetch`, installed after the first
  evaluation, ran when called.
- **A host function that forwards to a listed one** — a closure, a `Proxy`, or a bound `call`,
  `apply` or `Reflect.apply` — is not a listed value by identity or by name.
  `Function.prototype.call.bind(eval)` is named `"bound call"`, and `new Proxy(eval, {})` is named
  `"eval"`, with no bound prefix. Measured 2026-10-16: each ran `eval` when called.
- **The two heuristics.**
  - The source-text test can be evaded, can refuse a benign function, and reads only the callee.
    Measured 2026-10-16: a host function whose source names `globalThis` is refused as `host()`, and
    runs as `host.call(null)`, `host.apply(null)`, `host.bind(null)()` and `["x"].map(host)`.
  - The bound-name rule refuses a host's own bound function that merely carries a listed name:
    measured the same day, a wrapper bound as `fetch` is refused.
- **The budget counts loop iterations, not time or depth.** Recursion through arrow functions is not
  charged: `(f => f(f))(f => f(f))` ends in the engine's own stack overflow, a `RangeError`, whatever
  `maxIterations` is. Neither is the time a host function takes.
- **Calls and arrow functions are marked potentially unsafe** in the list of supported syntax, for
  the reasons above.
- **Open register entries that bear on this**:
  [A25](docs/backlog.md#a25), each `await` starts a 30-second timer that is never cleared;
  [A33](docs/backlog.md#a33), under `caseInsensitive` a cached miss can hide a key added later — no
  refusal is skipped; and [A40](docs/backlog.md#a40), a postfix update of a listed function writes
  before the funnel refuses it.

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
