# Phase 9 Plan — colon-joined identifiers (`@zvenigora/ng-eval-core`)

**Date**: October 10, 2026
**Revision**: 1 — initial plan.
**Target package**: `@zvenigora/ng-eval-core` (`modules/eval-core`, published at 0.11.0)
**Also touches**: `@zvenigora/ng-eval-signals` — one step, an error message and specs, released as a
patch that also widens its peer range; `@zvenigora/ng-eval-forms` — one step, both adapters' parse
sites and `guardIdentifiers`, released as a breaking minor
**Depends on**: [BL-A26](../backlog.md#a26), which the [Phase 5 plan](../signals/phase-5-plan.md)
recorded in its § 1.2 finding 11 with "a later design that parses some path with options of its own
needs this first" — this is that design; [BL-D2](../backlog-retired.md#d2), whose guard the
`eval-forms` step extends
**Source**: the request of 2026-10-10 — Mikhail's legacy survey app; [`ROADMAP.md`](../../ROADMAP.md)
§ Phase 9, added with this plan
**Objective**: Let an expression name a context key such as `Q1:1:3` as written, and plan the steps
that build it, on measured evidence.

**Conclusion, stated first so the rest reads as its argument**: ship it as an opt-in parser feature
of `eval-core`. `colonIdentifiers` on `ParserOptions` turns it on per call; `provideColonIdentifiers()`
turns it on for an application, read once by `ParserService`, so `EvalService`, `CompilerService`,
`DiscoveryService` — and through them `eval-signals` and `/reactive` — parse colon names with no
change of their own. A colon name is one `Identifier` whose `name` is the whole key, so the evaluator,
the prototype-pollution guards, the hooks and the dependency tracker see an ordinary identifier and
nothing in them changes. Where JavaScript gives the colon a meaning, the grammar keeps that meaning
when the name reading could not parse, and refuses when both could. BL-A26 is fixed first.
`eval-core` 0.12.0 is a minor and additive; `eval-signals` 0.5.1 a patch; `eval-forms` 0.5.0 a
breaking minor, because a rule that parses as a labeled statement is now refused at registration.

---

## 1. Current state of the code

### 1.1 What exists today

| Element | Where | State |
| :--- | :--- | :--- |
| Free parse | `parse`, `internal/functions/parse.ts:12-21` | `acorn.parse(expr, { ecmaVersion: 2020, ...options })`; returns the `Program`, or its single expression when `extractExpressions` is set |
| Parser options | `ParserOptions`, `internal/interfaces/parser-types.ts:3-7` | `Partial<acorn.Options>` plus `extractExpressions`, `cacheSize`, `ecmaVersion`. A type alias, published |
| Defaults | `defaultParserOptions`, `internal/classes/eval/parser-options.ts:4-9` | acorn's `defaultOptions` spread — 23 keys in all — with `ecmaVersion: 2020`, `extractExpressions: false`, `cacheSize: 100` |
| Service parse | `ParserService.parse`, `actual/services/parser.service.ts:113-130` | Merges `{ ...this.parserOptions, ...options }` (`:122`); caches under `getHashKey('', expr)` (`:135`), the text alone — [BL-A26](../backlog.md#a26). Its own defaults set `extractExpressions: true` (`:44-47`); `parserOptions` has a public setter (`:36-38`) |
| The services' parse | `BaseEval.parse`, `actual/services/base-eval.ts:41` | `parserService.parse(expression, this.parserOptions)`, where `EvalService` and `CompilerService` set `defaultParserOptions` (`eval.service.ts:29`, `compiler.service.ts:44`) and `DiscoveryService` the same with `cacheSize: undefined` (`discovery.service.ts:25-28`) |
| Compile cache | `CompilerService.compile` / `compileAsync`, `compiler.service.ts:136-182`, `:227-269` | Its own LRU (200) and 10-minute TTL, keyed by `generateCacheKey` (`:108-120`): `str:` + the text, or for an AST `ast:` + type, start, end and `toString()` |
| Identifier guard | `refuseDangerousName` / `refuseDangerousMatch`, `internal/visitors/identifier.ts:79-104` | Exact-name blocklist (`prototype-pollution-guard.ts:12-26`, `:83-88`); under `caseInsensitive` the matched key is re-checked, asked of `getKey` only when `mayMatchDangerousProperty` lets the name through (`:125-126`) |
| Member guard | `member-expression.ts:211` | The resolved-key re-check, `isDangerousProperty(foundKey)` |
| Read events | `emitRead`, `identifier.ts:48-64`; `readPath`, `member-expression.ts:27` | `key` is the matched key, `path` the source spelling, joined with `.` |
| Dependencies | `createDependencyTracker`, `hooks/dependency-tracker.ts`; `respellRoots`, `eval-signals/src/lib/track-dependencies.ts:26-48` | Both split a path on `.` only (`rootOf`, `dependency-tracker.ts:38`) |
| Statements | `dispatchStatement`, `internal/visitors/dispatch-statement.ts:66` | Throws `Unsupported statement type` for any statement outside six — a `LabeledStatement` among them |
| `eval-signals` parse sites | `eval-signal.ts:258`, `eval-signal-async.ts:250`; `assertReadableKey`, `eval-signal-async.ts:102-142` | Expressions through `CompilerService.compile` / `compileAsync`, from `options.injector` or `inject()`; `abortSignalKey` through the free `parse(key, defaultParserOptions)` (`:111`) |
| `/reactive` parse sites | `validate`, `eval-forms/reactive/src/lib/field-schema.ts:157-266`; `bindFieldProperties`, `:488`, `:499` | Two parsers: `validate` the free `parse(rule, defaultParserOptions)` (`:219`), skipping `guardIdentifiers` when it throws; the compile path `createEvalSignal`, so `CompilerService` |
| `/signals` parse site | `prepare`, `eval-forms/signals/src/lib/rules.ts:196-205` | Free `parse(expression, defaultParserOptions)` (`:198`), `guardIdentifiers`, free `compile`. No injector anywhere in the entry point |
| `guardIdentifiers` | `eval-forms/src/lib/guard-identifiers.ts:83-124` | Refuses an `Identifier` or `VariablePattern` named after an own property of `Object.prototype` (`:104`); published from the core entry point |
| Peer ranges | `modules/eval-signals/package.json`, `modules/eval-forms/package.json` | Both `@zvenigora/ng-eval-core >=0.11.0 <0.12.0`; `eval-forms` also `@zvenigora/ng-eval-signals >=0.4.0 <0.6.0`; `eval-core` peers `acorn ^8.11.2` |
| Performance gate | `internal/performance.spec.ts` | Evaluation only. Its one use of `parse` (`:234`) builds nodes for the read-emission guard; nothing times or pins the parse path |

The baseline test counts are whatever the gate reports at this plan's commit; step 1's green-baseline
run (`.claude/skills/step/SKILL.md` § 1) records them.

### 1.2 Findings that shape the design

Each finding cites the probe that measured it — listed with its result in § 1.3 — or the file and line
that shows it.

1. **Today no colon name evaluates, and the ones that parse parse as labels** — handed finding 1,
   reproduced (H1). Through `EvalService.simpleEval` at default options:

   | Expression | Today |
   | :--- | :--- |
   | `foo:1`, `Q1:1`, `VP14:0`, `DEALERS_COUNT:0` | parses as a `LabeledStatement`; throws `Unsupported statement type: LabeledStatement` |
   | `Q1:1 == 1`, `Q1:1 && constructor`, `sheet:A1.value` | the same: a label over `1 == 1`, `1 && constructor`, `A1.value` |
   | `Q1:1:3`, `A1:2:3` | `SyntaxError: Unexpected token (1:4)` |
   | `x + foo:1` | `SyntaxError: Unexpected token (1:7)` |
   | `f(foo:1)` | `SyntaxError: Unexpected token (1:5)` |
   | `a?b:c`, `({a:b})` | evaluate, as JavaScript |

   So no expression that evaluates today has a colon directly between two name characters outside a
   string, template text or regex, **except** in a conditional's consequent and an object key — the
   two places § 3.4 gives a rule of their own. The
   handed conclusion, "no working expression changes meaning", holds under § 3.4 with one qualification:
   a compact object key (`({a:1})`) works today and is refused under the option — loudly, never with
   a different meaning.

2. **The spike, rebuilt from its description, behaves as handed — and its limits are elsewhere**
   (H2). No spike code was in the repository, so the probe rebuilt it: a `readWord1` override absorbing
   `:segment` runs, segment `[A-Za-z0-9_$]+`, no space either side, pending `?` counted per bracket
   depth, and no absorption while acorn's token context is an object literal (`b_expr`). Every handed
   claim reproduced: `foo:1`, `A1:2:3`, `x + foo:1`, `f(foo:1, A1:2:3)`, `sheet:A1.value` and
   `` `${foo:1}` `` parse as single identifiers; `a?b:c`, `a ? b : c`, `({a:b})`, regex literals and
   strings are unchanged; `a ? foo:1 : 2` and `({a: foo:1})` are `SyntaxError`s; error positions are
   exact. What the case table found beyond the handed list:
   - **It joins keywords, non-ASCII names and escapes**: `true:1`, `this:1`, `null:1`, `typeof:1`,
     `in:1`, `case:1` and `default:1` become identifiers; so do `Вопрос:1` and `Q1é:1`; and
     `\u0051:1` becomes the identifier `Q:1`, its escape decoded.
   - **Its object rule refuses a colon name anywhere in a literal, not only in a key**: `({a: Q1:1})`,
     `({[Q1:1]: 2})`, `({...o, k: Q1:1})`, `({a: [x, Q1:1]})` and `let {a: Q1:1} = o` are all
     `SyntaxError`s. `({a: foo:1})` fails for that reason, not for key ambiguity.
   - **It overrides `readWord1`**, which acorn also uses for regex flags (`flags = this.readWord1()`)
     and private names, so the rule reaches two token kinds that are not identifiers.
   - **A prediction of mine failed and is recorded as such.** I expected the spike to misread
     `x ? 1 : {a:b}`, because acorn's lexer classifies that brace as a block (`b_stat`, C1). It does
     not: acorn's parser overrides the brace's context to `b_expr` when it enters an object literal,
     before the first key is lexed, so the spike reads the key correctly. The spike's object rule is
     accurate at key-read time; § 3.5 still places the key rule in the parser, for a different reason.

3. **The parse sites are more than handed, and `/reactive` has two that disagree** — handed finding 3,
   confirmed, with additions. `ParserService.parse` caches on the text (`:135`); the free `parse` takes
   its options and nothing else; `CompilerService` reaches `ParserService` through `BaseEval.parse`; the
   `eval-forms` sites are `field-schema.ts:219` and `rules.ts:198`; the `abortSignalKey` check is
   `eval-signal-async.ts:111`. Not in the handed list: `EvalService` and `DiscoveryService` parse
   through the same `BaseEval.parse`; `eval-signals`' sync and async compile go through
   `CompilerService` (`eval-signal.ts:258`, `eval-signal-async.ts:250`); and `/reactive`'s compile path
   is `createEvalSignal` (`field-schema.ts:488`, `:499`), so `/reactive` parses each rule twice, once
   with the free `parse` in `validate` and once through `CompilerService`.

4. **A service-level option reaches the services only if `defaultParserOptions` lacks the key** (P6).
   `BaseEval.parse` passes `defaultParserOptions` per call, and `ParserService.parse` lets per-call keys
   win. With `ParserService.parserOptions` set to carry `allowAwaitOutsideFunction: true`,
   `colonIdentifiers: true` and `preserveParens: true`, the options `EvalService.simpleEval` handed to
   `acorn.parse` carried `colonIdentifiers: true` — and `allowAwaitOutsideFunction: null` and
   `preserveParens: false`, `defaultParserOptions`' values; `simpleEval('await q')` still threw
   `SyntaxError: Unexpected token (1:6)`. So a key `defaultParserOptions` does not carry reaches every
   service, and no acorn option does. § 3.1 rests on the first half; the second is outside scope and
   recorded as [BL-A30](../backlog.md#a30). **It is also why `defaultParserOptions` must never carry
   `colonIdentifiers`**, not even as `false`: per-call `false` would override every application-wide
   setting on every service path.

5. **BL-A26, measured in full** (P5). (a) Phase 5's P5 again: after one permissive
   `ParserService.parse('await p', …)`, the default `simpleEval('await p')` returned a promise. (b) The
   entry's "read, not measured" half, now measured in both directions: `ParserService.parse('a + b')`
   cached a `BinaryExpression`, and `ParserService.parse('a + b', defaultParserOptions)` — which asks
   for a `Program` — got it; after `simpleEval('x + y')`, `ParserService.parse('x + y')` — which asks
   for the expression — got a `Program`. (c) A change after first use: with `ParserService.parse('k + 1')`
   cached as a `BinaryExpression`, setting `parserOptions.extractExpressions` to `false` left
   `parse('k + 1')` a `BinaryExpression` and made `parse('k + 2')` a `Program`.

6. **`CompilerService` caches a compiled string without asking the parser again** (P7). Two
   `compile('m * n')` calls made one `ParserService.parse` call; after the setter changed
   `parserOptions`, a third `compile('m * n')` made none and returned the same function. So fixing
   BL-A26 in `ParserService` does not reach a string `CompilerService` already compiled — up to its TTL
   or its eviction. Steps 1 and 3 between them cover both caches (§ 3.2).

7. **`CompilerService` keys an AST by type, start, end and `toString()`** (P8). An acorn node's
   `toString()` is `[object Object]`, so `compile(parse('a + b'))` then `compile(parse('c * d'))`
   returned the same function — key `ast:Program:{"type":"Program","start":0,"end":5}:[object Object]` —
   and `simpleCall` gave `3` for `c * d` over `{ a: 1, b: 2, c: 3, d: 4 }`, not `12`. Silent wrong
   answers for any caller that compiles ASTs. No design here hands `CompilerService` an AST, so it is
   outside scope: [BL-A29](../backlog.md#a29). It does rule out "parse it yourself and compile the AST"
   as this phase's per-call route through `CompilerService`.

8. **A colon name, once parsed, needs nothing from the evaluator** (P3, measured through `EvalService`
   with a prototype parser, § 1.3). Over `{ 'Q1:1': 3, 'Q1:1:3': 4, Q1: 100, obj: { 'Q2:3': 5 },
   'sheet:A1': { value: 6 }, … }`: `Q1:1` is 3, `Q1:1:3` 4, `Q1` 100, `Q1:1 + obj.Q2:3` 8,
   `sheet:A1.value` 6, `let Q1:1 = 5; Q1:1 + 1` 6, `let {a: Q1:1} = o; Q1:1` 8,
   `(Q1:1 => Q1:1 + 1)(2)` 3; `Q1:9` is `undefined`. Read events:

   | Read | `kind` | `key` | `path` |
   | :--- | :--- | :--- | :--- |
   | `Q1:1` | identifier | `Q1:1` | `Q1:1` |
   | `obj.Q2:3` | member | `Q2:3` | `obj.Q2:3` |
   | `sheet:A1.value` | identifier, then member | `sheet:A1`, `value` | `sheet:A1`, `sheet:A1.value` |
   | the arrow parameter `Q9:9` | identifier, `scoped: true` | `Q9:9` | `Q9:9` |
   | `q1:1`, `OBJ.q2:3` under `caseInsensitive` | identifier, member | `Q1:1`, `Q2:3` | `q1:1`, `OBJ.q2:3` |

   The tracker's `dependencies` were `Q1:1`, `obj`, `obj.Q2:3`, `sheet:A1`, `sheet:A1.value` — the
   arrow parameter dropped by its own rule 1. In `eval-signals` (S1), with `ParserService` emulating the
   planned switch and **no `eval-signals` code changed**: `createEvalSignal('q1:1 + Q2:3 + obj.R:7', …)`
   under `caseInsensitive` read 7, reported `dependencies` `Q1:1`, `Q2:3`, `obj`, `obj.R:7` — the root
   respelled to the source's key — and read 16 after the `Q1:1` signal changed; `Q1:1 = 5` threw
   `SignalContextWriteError` with `key` `Q1:1` and `kind` `'key'`; `createEvalSignalAsync('load(Q1:1)',
   …)` resolved to 20.

9. **Every existing refusal still fires, and a colon name cannot reach an inherited member** (P3).
   With the prototype parser, `constructor`, `obj.constructor`, `CONSTRUCTOR` over a context holding
   `constructor` under `caseInsensitive`, `obj.CONSTRUCTOR` under `caseInsensitive`, and
   `Q1:1 && constructor` all threw `Access to dangerous property "constructor" is blocked for security
   reasons`. `toString:1`, `constructor:1`, `obj.toString:1`, `__proto__:1` and, under
   `caseInsensitive`, `valueOf:0` read `undefined` over contexts that do not hold them.
   `mayMatchDangerousProperty('constructor:1')` is `false`, so a colon name costs `caseInsensitive` no
   extra `getKey`.

10. **In `eval-forms`, a legacy rule that starts with a colon name registers and renders blank, today**
    (F1). It parses as a label, both adapters accept it, and every evaluation throws `Unsupported
    statement type`, which the default `onError: 'undefined'` turns into a blank. Measured:
    `/reactive` with `visible` and `text` both `Q1:1 == 1` (and both `Q1:1`) bound, with `visible()`
    `false` and `text()` `''`; `/signals` registered `evalVisible(p.city, 'Q1:1 == 1')` and the field
    read `hidden()` `true`. A colon name anywhere else — `x + Q1:1 > 0` — is a `SyntaxError` at
    registration in both. The phase changes neither unless the option is on; § 3.8 closes the silent
    half. The general case, any statement `eval-core` refuses, is [BL-D13](../backlog.md#d13).

11. **`/reactive`'s guard depends on its two parsers agreeing** (F2). With `ParserService` emulating
    the switch and `validate` left on the free `parse`: `x > 0 || constructor` was refused at bind, as
    designed (BL-D2); `x + Q1:1 > 0 || constructor` bound — `validate`'s parse threw, so the guard was
    skipped — and read `visible()` `true`, because `||` short-circuited past `constructor`;
    `Q1:1 > 0 || constructor` was refused, but only because the free `parse` happened to read it as a
    label over an expression the guard walked. Whether the guard runs would depend on where in the rule
    the colon name sits.

12. **The extended parser costs nothing measurable, and the default path can be acorn's own** (P4).
    20 000 parses over five plain expressions: base `acorn.parse` 152 ms, the extended parser 152 ms,
    base again 151 ms; over two legacy-shaped colon expressions the extended parser took 141 ms, and the
    base parser over the same text with `_` for each joining colon 162 ms. `Parser.extend` returns a
    subclass: `acorn.Parser.prototype.readWord` was the same function after it.

13. **The acorn methods the design overrides exist at the peer floor** (D1). The `acorn@8.11.2`
    tarball, read outside the repo, has `readWord`, `readWord1`, `finishToken`, `parsePropertyName`,
    `unexpected`, `raise`, the per-parser `this.keywords`, `Parser.extend` and `tokTypes`, with
    `readWord` line for line as at the installed 8.18.0. Read, not run — § 8 q3 runs it.

14. **The peer ranges are as handed** — handed finding 4, confirmed: both downstream packages declare
    `@zvenigora/ng-eval-core >=0.11.0 <0.12.0`, so `eval-core` 0.12.0 forces both to widen in the same
    step ([BL-F12](../backlog-retired.md#f12)'s mechanism: `@nx/dependency-checks` fails their `lint`
    on the bump alone).

### 1.3 Probes run for this plan

Throwaway specs at af81e24 — `modules/eval-core/src/lib/zz-phase9-probe.spec.ts`,
`modules/eval-signals/src/lib/zz-phase9-probe.spec.ts` and `modules/eval-forms/src/lib/zz-phase9-probe.spec.ts`
— run through `nx test` with `--testPathPatterns`, results written to a scratch file, all three
**deleted before this plan's commit**. The `eval-core` spec held two acorn plugins: the spike as handed
(H2), and a prototype of § 3.4–§ 3.5 (P1–P4). The `eval-signals` and `eval-forms` specs replaced
`ParserService.prototype.parse` with the prototype for their duration, to emulate the application-wide
switch (S1, F2). C1 ran in Node against the installed acorn. D1 read the `acorn@8.11.2` tarball with
`npm pack` and `grep`, in a directory outside the repo; nothing from it was executed.

| ID | Question | Result |
| :--- | :--- | :--- |
| H1 | Handed finding 1 | Reproduced exactly — § 1.2 finding 1's table |
| H2 | Handed finding 2, against the full case table | Reproduced; the spike also joins keywords, non-ASCII names and escapes, and refuses colon names everywhere in an object literal — finding 2 |
| C1 | Does acorn's lexer misclassify the brace in `x ? 1 : {a:b}` | Yes at the `{` token (`b_stat`); the parser corrects it to `b_expr` before the key is lexed, and the spike reads the key correctly |
| P1 | The prototype against the case table | § 3.4's table, every row |
| P2 | Node shape and error positions | `x + Q1:1:3 * 2` gives an `Identifier` `Q1:1:3`, `start` 4, `end` 10, `loc` (1:4)–(1:10). `Q1:1 + * 2`, `x + Q1:1:3 +` and `Q1:1 Q2:2` raise at (1:7), (1:12) and (1:5), as the base parser does over the same text with `_` for the colons |
| P3 | Evaluation, reads, dependencies, `caseInsensitive`, refusals | Findings 8 and 9 |
| P4 | Parse cost, and the base parser after `extend` | Finding 12 |
| P5 | BL-A26 | Finding 5, (a)–(c) |
| P6 | Which service-level keys reach `EvalService`'s parse | Finding 4 |
| P7 | Does `CompilerService` re-parse a compiled string | No — finding 6 |
| P8 | `CompilerService`'s AST key | Two ASTs, one compiled function — finding 7 |
| S1 | `eval-signals` over colon keys, with no change of its own | Finding 8's last paragraph; `abortSignalKey: 'run:abort'` refused at construction with "it is not an identifier, so no expression could name it" |
| F1 | `eval-forms` over a rule that starts with a colon name, today | Finding 10 |
| F2 | `/reactive` with the compile path switched and `validate` not | Finding 11 |
| D1 | acorn's internals at the peer floor | Finding 13 |

---

## 2. Scope

### In scope

- [BL-A26](../backlog.md#a26): `ParserService`'s cache keyed on the options that change the parse
  (step 1), and `CompilerService`'s string cache keyed the same way (step 3) — § 3.2.
- The grammar (§ 3.4), as an acorn plugin selected per parse (§ 3.5), behind
  `ParserOptions.colonIdentifiers` (§ 3.3).
- `provideColonIdentifiers()`, read by `ParserService` (§ 3.1, § 3.3).
- Specs pinning that hooks, dependency tracking and every prototype-pollution refusal carry over
  (§ 3.6, § 3.7).
- A data-driven corpus of expressions, synthetic until real ones arrive (step 4).
- `eval-signals`: specs through both factories, and the `abortSignalKey` refusal's wording (§ 3.8).
- `eval-forms`: `/reactive`'s `validate` parsing as its compile path does; `/signals`'
  `colonIdentifiers` rule option; `guardIdentifiers` refusing a top-level label (§ 3.8).
- READMEs, CHANGELOGs, versions and peer ranges (§ 3.10).

### Out of scope

- **Other legacy syntax** — `<>`, templates, anything that is not a colon between name segments. The
  corpus records an expression that uses one as out of scope, by name (step 4).
- **Structure in a colon name.** `Q1:1:3` is an opaque key: no ranges, no segment access, no
  wildcard. Nothing splits it.
- **`defaultParserOptions`** — unchanged, and § 1.2 finding 4 is why it must stay so.
- **A per-signal parser option in `eval-signals`** — § 8 q5.
- [BL-A29](../backlog.md#a29), [BL-A30](../backlog.md#a30), [BL-D13](../backlog.md#d13) — found by
  this plan's probes, recorded, and not needed by it. Step 3 must not touch `CompilerService`'s AST
  key branch, so A29's fix stays its own decision.
- **A source rewrite** — any approach that edits the text before acorn sees it (§ 3.5).

---

## 3. Design

### 3.1 How the feature is enabled — decided: both, an application provider and a per-call option

**Option A — per call only.** `colonIdentifiers` on the options of the free `parse` and of
`ParserService.parse`.

- *Reach*: those two only. `EvalService`, `CompilerService` and `DiscoveryService` take no parser
  options per call, `eval-signals` hands `CompilerService` a string, and the way around that —
  parse it yourself and compile the AST — is exactly what [BL-A29](../backlog.md#a29) answers wrongly
  (§ 1.2 finding 7). Every layer would need a new option, and every call site in the one application
  that needs it would have to remember it.

**Option B — application-wide through `ParserService.parserOptions`, the setter that exists.**

- *Reach*: every service, because the key is absent from `defaultParserOptions` (§ 1.2 finding 4).
- *Cost*: imperative — a statement in an initializer — and mutable at any time, so "the switch changed
  after first use" is a real sequence, and with today's caches it is ignored for every text already
  parsed or compiled (§ 1.2 findings 5c and 6).

**Option C — application-wide through a provider.** `provideColonIdentifiers()` registers an internal
token; `ParserService`, which is `providedIn: 'root'`, reads it at construction into its own
`parserOptions`.

- *Reach*: as B, through the existing merge, with no change to any service, to `eval-signals` or to
  `/reactive`'s compile path.
- *Lifetime*: set before any parse, once, per root injector — two applications in one process, or two
  `TestBed` configurations, do not share it.
- *Placement*: a token in a child environment injector — a lazy route's `providers` — is invisible to
  the root `ParserService`, which would silently ignore it. So the provider also registers an
  environment initializer that throws, naming the provider and the root, when the `ParserService` it
  resolves does not have the option on (Angular 19's `provideEnvironmentInitializer`, inside the
  `>=19` peer range). Misplacement is loud at startup.

**Option D — process-wide**: write `colonIdentifiers` into the exported `defaultParserOptions`, or a
module-level `setColonIdentifiers()`.

- *Reach*: everything, the free `parse` callers included.
- *Cost*: one setting for every application the process serves, server rendering included; a published
  constant mutated; stale in both caches after first use; and, if the key ever sits in
  `defaultParserOptions` at all, per-call `false` overrides every service-level `true` (§ 1.2
  finding 4).

**Option E — an `EvalOptions` member.** Evaluation options configure the walk, which starts after the
parse, and `CompilerService.compile` takes none. Rejected.

**Decision: C, with A.** The use case is one application whose every name uses colons, so the default
belongs to the application, declared once; A is what the free `parse` callers and a deliberate
per-call override need. B keeps working — the setter is published and finding 4 shows it reaching the
services — and § 3.2 makes a change through it honoured.

**Consequences.** The free `parse` sees only its argument, so `eval-forms`' direct calls must pass the
option themselves, and `eval-signals`' `abortSignalKey` check sees it never (§ 3.8). The README says
the provider belongs in the application's root providers, and that `ParserService.parserOptions` is the
imperative alternative.

### 3.2 BL-A26 first — decided: step 1 keys the parse cache on parse-relevant options; step 3 does the same for compiled strings

Even with the provider alone, the caches have to honour options, for three reasons:

- **Per-call options are part of the design** (§ 3.1's A). Without the fix, the first parse of a text
  decides what every later caller gets for it — finding 5a, where one permissive call changed
  `simpleEval` for everyone.
- **The setter is published** (§ 3.1's B). A switch turned on after first use would be ignored for
  every text already parsed — finding 5c — and, in `CompilerService`, for every text already compiled,
  until its TTL or eviction — finding 6. The provider cannot change after construction; the setter can.
- **The two services already disagree about shape.** `ParserService` defaults to
  `extractExpressions: true` and the services ask for `false`, and each is served the other's node
  (finding 5b). That is a defect today, whatever this phase does.

**What is parse-relevant.** Every acorn option except the callbacks and `program`, plus
`extractExpressions` and `colonIdentifiers`; not `cacheSize`. A call carrying a callback (`onToken`,
`onComment`, `onInsertedSemicolon`, `onTrailingComma`) or `program` bypasses the cache, reading and
writing: a cached AST runs no callback, and `program` makes acorn append to the caller's node.

**The key.** A canonical fingerprint of those options — sorted keys, JSON values — passed to
`getHashKey` as its namespace. `getHashKey` joins namespace and value with `:` (`cache.ts:52-55`), and
until now the namespace was always empty; with expression text that now holds colons, an encoding in
which one fingerprint plus `:` could be a prefix of another would let two (options, text) pairs share a
key. A canonical JSON object cannot be: it ends at its closing brace.

**The cost.** The fingerprint is computed once per pair of option objects — the service's and the
call's — and remembered by identity, so `EvalService`, which passes the same `defaultParserOptions`
object every call, pays two lookups per parse, not a serialization.

**`CompilerService`, in step 3.** Its string key gains the fingerprint of the options its own parse
would use — `ParserService`'s merged with its per-call `defaultParserOptions`. In step 1 nothing
observable can vary that parse (finding 4), so the criterion that would discriminate it has nothing to
turn on until `colonIdentifiers` exists; step 3 is where it does. The AST branch is not touched
(§ 2).

### 3.3 The option — decided: `ParserOptions.colonIdentifiers?: boolean`, and `provideColonIdentifiers()`

- **Name.** `colonIdentifiers`: the result *is* an `Identifier` with a colon in its name, which is
  what a reader of the AST will find. acorn's `allowX` names describe permissions over JavaScript's own
  grammar; this is a grammar of our own, so it does not borrow the prefix.
- **Type.** `boolean`. The grammar is fixed (§ 3.4); a configurable separator or segment pattern is
  configuration nobody has asked for. Reopens if a second application needs another separator.
- **Where.** On `ParserOptions` (`parser-types.ts`), a published type alias: an optional member is an
  addition to the `.d.ts`. acorn ignores it — its `getOptions` copies only its own keys, and P6 shows
  the key passing through `acorn.parse` harmlessly.
- **`defaultParserOptions`** — unchanged, and never to carry the key (§ 1.2 finding 4).
- **`ParserService`'s own defaults** gain `colonIdentifiers: true` from the provider, and from nothing
  else.
- **The provider.** `provideColonIdentifiers(): EnvironmentProviders`, built with
  `makeEnvironmentProviders`, so it cannot be listed in a component's providers. The token stays
  internal: the provider is the only way to set it, and `inject(ParserService).parserOptions` is the
  published way to read the effective value.

### 3.4 The grammar — decided

**The rule.**

```text
ColonName  ::= First (":" Segment)+        no whitespace, comment or line break anywhere inside
First      ::= [A-Za-z_$][A-Za-z0-9_$]*     and not a keyword of the parse's ecmaVersion
Segment    ::= [A-Za-z0-9_$]+               may start with a digit
```

Longest match: `Q1:1:3` is one name. It is recognised wherever acorn reads an identifier-or-keyword
token — in expressions, bindings, after `.` and `?.`, in template substitutions — and nowhere else:
not in a regex body or its flags, a string, a template's raw text, a comment, a number or a private
name. The `Identifier`'s `name` is the source text, character for character; its `start`, `end` and
`loc` span it.

**Each sub-question, decided:**

- **Segments after a colon may start with a digit**, since every legacy key does (`VP14:0`): `Q1:0`,
  `Q1:01`, `Q1:1e3`, `Q1:_x`, `Q1:$`. A segment is opaque text, never a number: `Q1:01` and `Q1:1`
  are different keys.
- **Whitespace and comments break a name.** `Q1 :1`, `Q1: 1` and `Q1/**/:1` keep today's meaning, a
  label. So does a trailing or doubled colon: `Q1:`, `Q1::1`.
- **ASCII only.** A first segment holding a non-ASCII character or a `\u` escape does not join
  (`Вопрос:1`, `Q1é:1`, `\u0051:1` keep today's meaning); neither does a colon followed by a non-ASCII
  character (`Q1:Ответ`). The known keys are ASCII; a non-ASCII name brings confusable spellings into
  keys that `caseInsensitive` matching and `mayMatchDangerousProperty`'s non-ASCII rule
  (`prototype-pollution-guard.ts:57-60`) treat specially; and the spike's decoding of `\u0051:1` to
  `Q:1` shows a key spelled one way and read another. Reopens on a real key that needs it (§ 8 q4).
- **A keyword does not start a name.** `true:1`, `this:1`, `null:1`, `typeof:1`, `in:1`, `case:1` and
  `default:1` keep today's `SyntaxError`. A keyword followed by a colon has a JavaScript meaning only in
  the two positions below and in `switch`, and joining it elsewhere would put an `Identifier` named
  `this:1` beside the `this` that `identifier.ts:118` and `:144` resolve by name. The set is acorn's
  `keywords` for the parse's `ecmaVersion`, so contextual words acorn reads as names — `let`, `of`,
  `async` — do join (`let:1`). Reopens on a real key with a keyword prefix (§ 8 q4).
- **Member access and optional chaining.** `obj.Q1:1` is `obj['Q1:1']`; `obj.Q1:1.x`, `obj?.Q1:1`
  and `a?.[Q1:1]` follow. `sheet:A1.value` is `(sheet:A1).value`: the name ends where a `.` begins.
- **Bindings.** A colon name binds like any identifier: `let Q1:1 = 5`, `(Q1:1) => …`, `Q1:1 => …`,
  `let {a: Q1:1} = o`, `[Q1:1] = [5]`; and `Q1:1 = 2`, `Q1:1++` are assignments to it. A binding
  shadows the context key for the rest of the program, as `let Q1 = …` shadows `Q1`, and reads of it
  are `scoped`.
- **Labels.** A statement that starts `Q1:1` is an expression statement — today a label, which never
  evaluated. `Q1: 1`, with a space, is still a label.
- **Templates and regexes.** `` `${Q1:1}` `` joins inside the substitution; `` `Q1:1` ``, `"Q1:1"` and
  `/Q1:1/` are text.

**The two positions where JavaScript gives the colon a meaning:**

1. **A conditional's consequent, at its own nesting level, keeps JavaScript's reading.** From a `?` —
   not `?.`, not `??` — to the `:` that closes it, a name does not join; inside a `(`, `[`, `{` or
   `${` the consequent opens, it does, and so it does in the test and the alternate. `a?b:c` is
   unchanged, and `c ? Q1:1` is `c ? Q1 : 1`, as today. A colon name in a consequent is written
   `c ? (Q1:1) : 0`.

   *Why this cannot misread silently.* At one level every `?` needs exactly one `:`, and nothing else
   at that level consumes a colon in the syntax the evaluator runs — an object's colons are inside its
   braces. The JavaScript reading and the name reading of one adjacency differ by exactly one such
   colon, so at most one of them parses: forgetting the parentheses always leaves a colon the grammar
   cannot place. That colon raises acorn's `SyntaxError` at its own position, with a hint added when a
   join was suppressed in the same frame — measured: `c ? Q1:1 : 0` → `Unexpected token: a colon-joined
   name in the consequent of a conditional needs parentheses: (Q1:1) (1:9)`, `pos` 9, `loc` (1:9). The
   wording is the step's; the class, `pos`, `loc`, the name and the fix are criteria.

2. **An object key is refused.** Here both readings parse: `{Q1:1}` is `{Q1: 1}` to JavaScript and a
   shorthand `{'Q1:1': Q1:1}` as a name, so keeping either would answer some author wrongly and
   silently. A joined name in key position raises a `SyntaxError` at the key: `Colon-joined name 'a:b'
   cannot be an object key: write 'a: ...' with a space for a property, or quote the key (1:2)`. Values,
   computed keys and spreads join: `({a: Q1:1})`, `({[Q1:1]: 2})` — which uses the *value* of `Q1:1`
   as the key — `({...o, k: Q1:1})`, `({a: [x, Q1:1]})`. A colon-named key is written quoted,
   `{'Q1:1': v}`.

   *Consequence*: under the option, a compact object literal or pattern — `({a:1})`, `({a:b})`,
   `let {a:b} = o` — is a `SyntaxError` until a space is added. Loud, never a different meaning.
   § 8 q2 asks the corpus whether that costs anything.

**Option considered for 1: take the reading that parses.** Parse with the consequent rule; on a
`SyntaxError` at a leftover colon in a frame that suppressed a join, parse again with that join
allowed, and repeat. Since at most one reading parses, the search finds it, and no consequent ever needs
parentheses. Its cost is one parse per suppressed join, on the error path only, and an error to choose
when every attempt fails — the furthest one reached. **Not chosen now**: it is a search, its rule is
harder to state and to test than "parenthesise", and nothing yet says legacy expressions need it.
§ 8 q1 makes the corpus decide.

**Option considered for 2: keep JavaScript's reading of a key**, as the spike does by not joining
inside a literal at all. Rejected: `{Q1:1}` written for a shorthand would silently be `{Q1: 1}`.

**The case table** — the prototype's results (P1), which step 2's spec carries row for row:

| Source | Option off (today) | Option on |
| :--- | :--- | :--- |
| `Q1:1`, `VP14:0`, `DEALERS_COUNT:0` | label | one identifier |
| `Q1:1:3`, `A1:2:3` | `SyntaxError` (1:4) | one identifier |
| `x + foo:1`, `f(foo:1, A1:2:3)` | `SyntaxError` | `x + foo:1`; a call with two identifiers |
| `sheet:A1.value` | label `sheet` over `A1.value` | `(sheet:A1).value` |
| `` `${foo:1}` `` | `SyntaxError` (1:6) | a template over one identifier |
| `obj.Q1:1`, `obj.Q1:1.x`, `obj?.Q1:1`, `a?.[Q1:1]` | `SyntaxError` | property `Q1:1`; computed `Q1:1` |
| `Q1:01`, `Q1:1e3`, `Q1:_x`, `Q1:$`, `a:b:c:d` | label | one identifier each |
| `Q1:1 ? 1 : 0`, `c ? 0 : Q1:1`, `a ?? Q1:1`, `Q1:1 ?? a` | label or `SyntaxError` | joined in the test, the alternate and either side of `??` |
| `c ? (Q1:1) : 0`, `c ? f(Q1:1) : 0`, `c ? [Q1:1][0] : 0`, `` c ? `${Q1:1}` : 0 ``, `c ? d ? (Q1:1) : 2 : 3` | `SyntaxError` | joined inside a delimiter the consequent opens |
| `let Q1:1 = 5; Q1:1 + 1`, `(Q1:1 => Q1:1 + 1)(2)`, `Q1:1 => 1`, `let {a: Q1:1} = o`, `[Q1:1] = [5]`, `Q1:1 = 2`, `Q1:1++` | `SyntaxError` | bindings and assignment targets |
| `({a: Q1:1})`, `({[Q1:1]: 2})`, `({...o, k: Q1:1})`, `({a: [x, Q1:1]})` | `SyntaxError` | a value, a computed key, a spread, an element |
| `a?b:c`, `a?b.c:d`, `a?1:b`, `a?"s":b`, `a?b:c?d:e`, `a?/x/g:b`, `f(a?b:c)`, `[a?b:c]`, `` `${a?b:c}` ``, `a?.5:1` | JavaScript | unchanged |
| `c ? Q1:1` | `c ? Q1 : 1` | `c ? Q1 : 1` |
| `"Q1:1"`, `` `Q1:1` ``, `/Q1:1/.test(s)`, `({a: b})`, `({'Q1:1': 2})`, `x ? {k: v} : 0` | JavaScript | unchanged |
| `Q1 :1`, `Q1: 1`, `Q1/**/:1`, `Вопрос:1`, `Q1é:1`, `\u0051:1`, `Q1:Ответ` | label | label, unchanged |
| `Q1:`, `Q1::1`, `1:2`, `true:1`, `this:1`, `null:1`, `typeof:1`, `in:1`, `case:1`, `default:1` | `SyntaxError` | `SyntaxError`, unchanged |
| `let:1` | label | one identifier |
| `Q1:1é` | `SyntaxError: Identifier directly after number (1:4)` | `SyntaxError: Unexpected token (1:4)` |
| `{a:b}` as a statement | a block holding a label | a block holding `a:b` |
| `c ? Q1:1 : 0`, `f(c ? Q1:1 : 0)`, `Q1:1 ? Q2:2 : Q3:3`, `c ? x => Q1:1 : 2` | `SyntaxError` | `SyntaxError` at the leftover colon, with the parentheses hint |
| `({a:b})`, `({a:1})`, `({Q1:1})`, `x ? 1 : {a:b}`, `let {a:b} = o` | JavaScript | `SyntaxError` at the key |

### 3.5 The implementation — decided: an acorn plugin, chosen per parse, that rewrites no text

`Parser.extend` with four overrides, in an internal module, `internal/functions/colon-identifiers.ts`,
which `functions/public-api.ts` does not re-export:

- **`readWord`**: scans an ASCII first segment from the token start; if a colon and a segment character
  follow, the first segment is not a keyword and the current frame has no pending `?`, it consumes every
  `:segment` and finishes a `name` token over the whole text. In every other case it calls acorn's own
  `readWord` unchanged — so a word that does not join is lexed exactly as today. Not `readWord1`, which
  regex flags and private names also go through (finding 2).
- **`finishToken`**: after acorn's own, keeps a stack of frames — pushed on `(`, `[`, `{`, `${`, popped
  on `)`, `]`, `}` — each counting pending `?` tokens, decremented by a `:` in the same frame. `?.` and
  `??` are other token types and do not count.
- **`parsePropertyName`**: refuses a joined name as a key (§ 3.4, 2). This is where acorn parses every
  object key, in literals and patterns alike, so the rule is exact by construction. The spike's
  lexer-context test is accurate too (finding 2, C1), but only because acorn's parser corrects a
  context its lexer guessed for regex detection — a dependency on that correction, and on its timing,
  that the parser-level hook does not have.
- **`unexpected`**: adds the hint of § 3.4, 1, when the unexpected token is a colon and its frame
  suppressed a join. The error stays acorn's: a `SyntaxError` with `pos`, `loc` and the ` (line:col)`
  suffix, as A5 left every parse error ([BL-A5](../backlog-retired.md#a5)).

The free `parse` uses the extended parser when `options.colonIdentifiers` is set and `acorn.parse`
otherwise. The extended class is built once, at module load. No source text is rewritten, so every
position acorn reports is the position in what the author wrote (P2) — the reason a rewriting
pre-pass is out of scope.

**acorn's range.** The overridden methods are acorn internals, not its documented API, though they are
the ones its plugins use, and they have the same shape at the `^8.11.2` floor (finding 13). § 8 q3 runs
the grammar spec there before the release.

### 3.6 Security — decided: no new refusal, no change to any guard; specs assert that every refusal still fires

A colon name cannot reach an inherited member, by construction:

- The blocklist is matched by exact name (`isDangerousProperty`, a `Set` lookup), and no prototype in
  the language has a property whose name contains a colon. A colon name resolves to an own key or to
  nothing — finding 9, `toString:1` and its kin reading `undefined`.
- Under `caseInsensitive`, `mayMatchDangerousProperty` passes a name to `getKey` only if its lower case
  is a blocklisted name or it holds a non-ASCII character. A colon name is neither (§ 3.4's ASCII
  rule), so the `localeCompare` accent path — `cönstructor` matching `constructor` — never arises for
  one, and it costs no extra resolution.
- The resolved-key re-checks — `refuseDangerousMatch` (`identifier.ts:96-104`) and the member visitor's
  (`member-expression.ts:211`) — run unchanged, and finding 9 shows them firing with the option on,
  beside colon names in the same expression.
- A member write into `obj.Q1:1` reaches `safeSetProperty` with the key `Q1:1` and its refusals; a
  signal context's write policy names `Q1:1` (finding 8).
- `guardIdentifiers` matches `Object.prototype`'s own names, none of which holds a colon, so a colon
  name is refused at neither entry point, consistently with `eval-core`.

**The specs assert refusal only** — the existing message, from the existing check, with the option on
— and that a colon name reads `undefined` where its key is absent. No payloads. A wrong implementation
that skips `refuseDangerousName` for a name containing a colon changes nothing, since no colon name is
blocklisted; the criterion that discriminates is removing the guard outright, which the rows must catch
with the option on (step 3).

### 3.7 Hooks and dependency tracking — decided: nothing changes; a colon key is one path segment

`EvalReadEvent.key` is the key the context matched and `path` the source spelling, both carrying the
whole colon name (finding 8). `rootOf` and `respellRoots` split on `.`, never on `:`, so `obj.Q2:3` is
the two segments `obj` and `Q2:3`, and `q1:1` is respelled to the source's `Q1:1`. The README says so
where it documents `path` as dotted, since a consumer splitting paths on `:` would otherwise be
reasonable.

### 3.8 How the downstream libraries reach it — decided

**`eval-signals`: no source change for the feature.** Its expressions go through `CompilerService`,
resolved from `options.injector` or `inject()`, and so through the root `ParserService` and the
provider (S1). Step 5 pins it through both factories.

**`abortSignalKey` stays a plain identifier.** The check parses the key with `defaultParserOptions`
(`eval-signal-async.ts:111`), so a colon key is refused at construction whatever the application sets.
That over-refuses, loudly, a name no one needs — an abort key is the consumer's choice. But its message,
"it is not an identifier, so no expression could name it", is false under the option, where `run:abort`
is an `Identifier` an expression can name. Step 5 rewords both sites (`:113`, `:123`) to say the key is
not a plain identifier. The alternative — parse the key with the signal's own `ParserService` — would
resolve a second service beside `CompilerService` for a name nobody needs.

**`/reactive`: `validate` parses with the compile path's parser.** Its compile path already reaches
the provider; its `validate` does not, and the guard then depends on where the colon name sits
(finding 11). Step 6 makes `validate` call `ParserService.parse(rule, defaultParserOptions)` — the call
`BaseEval.parse` makes — on the `ParserService` resolved as `createEvalSignal` resolves
`CompilerService`: from `options.injector` when given, `inject()` otherwise. The guard then walks the
tree that is compiled, after step 1 the same cached object. The existing missing-injector cases must
stay green unmodified: `bindFieldProperties` orders its statements for that error (`field-schema.ts:360-368`),
and resolving a service earlier must not change which error a JavaScript caller with no injector sees.

**`/signals`: a rule option.** `createExpressionRules` has no injector and requires no injection
context; reaching the provider would need one, which would break callers that have none. So
`ExpressionRuleOptions` gains `colonIdentifiers?: boolean`, at the factory and per registration,
resolved like its other keys — registration wins, per key — and `prepare` passes
`{ ...defaultParserOptions, colonIdentifiers: true }` when it is set. An `injector` option was the
alternative: more surface than one boolean, in an entry point that uses no DI at all.

**Both: a rule that parses as a label is refused at registration.** Finding 10's silent blank is what a
forgotten switch looks like — the provider forgotten for `/reactive`, the rule option for `/signals` —
whenever the rule starts with a colon name. `guardIdentifiers`, which both adapters call on every rule,
also refuses a `LabeledStatement` among the program's top-level statements, naming the label and saying
that colon names need `colonIdentifiers`. It refuses nothing that evaluated: `dispatchStatement` throws
`Unsupported statement type` for every label (`dispatch-statement.ts:66`), and a top-level statement
always runs. A label nested in a function body is left alone — the function may never be called. Every
other unsupported statement stays [BL-D13](../backlog.md#d13)'s.

**So one rule string is refused at both entry points or at neither**, given the same setting: with it
on, both evaluate `Q1:1 == 1`; with it off, both refuse it at registration.

### 3.9 Performance — decided: the default path is acorn's own parse, chosen by one check per parse; evaluation is untouched

The free `parse` checks one option and calls `acorn.parse` when it is off — the function it calls
today. The evaluator gains nothing, since a colon name is an ordinary `Identifier`. With the option on,
P4 measured no cost at 20 000 parses.

`performance.spec.ts` gates evaluation and has no parse case, so "it gates the plugin" would be
vacuous. Step 2 adds a structural case to it: with the option off, `parse` calls acorn's `parse` and
never the extended parser; with it on, the reverse. *Wrong*: one extended parser for every call, the
rule gated inside it — the first half fails. Timing stays out of the gate, as everywhere in this
repository; each step that touches the parse path reports a P4-style measurement.

Step 1's fingerprint memo (§ 3.2) is what keeps the cache fix off the `simpleEval` hot path, and its
own criterion pins it.

### 3.10 Versions — decided

| Package | Change | Version | Breaking | Peer ranges after |
| :--- | :--- | :--- | :--- | :--- |
| `@zvenigora/ng-eval-core` | Adds `ParserOptions.colonIdentifiers` and `provideColonIdentifiers`; fixes BL-A26 — a cached AST is served only to a caller whose parse-relevant options match — and keys compiled strings the same way | **0.12.0**, a minor | **No** — additions, and a fix whose old behaviour no caller could rely on | unchanged: `@angular/core >=19.0.0`, `acorn ^8.11.2` (§ 8 q3) |
| `@zvenigora/ng-eval-signals` | `abortSignalKey`'s refusal reworded; specs | **0.5.1**, a patch | No | `@zvenigora/ng-eval-core >=0.11.0 <0.13.0` |
| `@zvenigora/ng-eval-forms` | `/signals`' `ExpressionRuleOptions.colonIdentifiers`; `/reactive`'s `validate` parses as its compile path does; `guardIdentifiers` refuses a top-level label | **0.5.0**, a breaking minor | **Yes** — a schema holding a rule that starts with a label, which rendered blank, now fails to bind or register, as [BL-D2](../backlog-retired.md#d2)'s refusal did in 0.3.0 | `@zvenigora/ng-eval-core >=0.12.0 <0.13.0`; `@zvenigora/ng-eval-signals >=0.4.0 <0.6.0`, unchanged, admits 0.5.1 |

`eval-signals` keeps its 0.11 floor: nothing in it needs 0.12. `eval-forms` raises its floor: its
`/signals` option passes `colonIdentifiers` to `parse`, which 0.11 would ignore, and an option that
does nothing should not be installable. All three bumps land in one step: the moment
`modules/eval-core/package.json` reads 0.12.0, both downstream `lint` targets fail until their ranges
admit it (finding 14).

**The `.d.ts`, by package.** `eval-core`: the `ParserOptions` member, `provideColonIdentifiers`, and
documentation comments. `eval-signals`: identical to 0.5.0's but for the `abortSignalKey` JSDoc
(step 5). `eval-forms`: `/signals` gains the member; the core entry point's `guardIdentifiers` comment
changes; `/reactive`'s at most in comments.

---

## 4. Work breakdown

Each step is one commit, leaves all three projects and the workspace root green, and runs in its own
session (CLAUDE.md, "Working from a plan"). "Wrong implementation" in a criterion names the change the
step's executor makes to the finished code to show the criterion goes red, and the report gives the
failure count for each, reading which cases failed rather than that the suite did.

### Step 1 — `eval-core`: the parse cache keyed on parse-relevant options (BL-A26)

- **New**: `actual/services/parse-fingerprint.ts`, the fingerprint and its memo, exported from no
  barrel.
- **Edit**: `actual/services/parser.service.ts`; `parser.service.spec.ts`; `docs/backlog.md` and
  `docs/backlog-retired.md` — A26 retired as fixed, not yet released, its index row re-pointed.
- **Builds**: § 3.2 for `ParserService` — the fingerprint, the cache key, the bypass, the memo.
- **Exit criteria**:
  1. **Per-call options are honoured.** After `ParserService.parse('await p', { ecmaVersion: 2022,
     allowAwaitOutsideFunction: true })`, `EvalService.simpleEval('await p')` throws the `SyntaxError`
     it throws without that call. *Wrong*: the key on the text alone — it returns a promise (P5a).
  2. **Shape follows the caller.** `ParserService.parse('a + b')` is a `BinaryExpression` and
     `ParserService.parse('a + b', defaultParserOptions)` a `Program`, in both orders. *Wrong*: a
     fingerprint without `extractExpressions` — the second call of each order gets the first's shape.
  3. **A change after first use is honoured.** `parse('k + 1')`, then the setter turning
     `extractExpressions` off, then `parse('k + 1')`: a `Program`. *Wrong*: the fingerprint built from
     the per-call options alone, ignoring the service's.
  4. **Callbacks and `program` bypass the cache.** An `onToken` callback passed on two parses of one
     text is called on both. *Wrong*: callbacks cached like any option — the second parse calls it
     never.
  5. **The cache still caches.** Two parses with the same options return one object by identity.
     *Wrong*: the cache bypassed for every call.
  6. **The memo.** Two `simpleEval` calls build the fingerprint once. *Wrong*: built per call — twice.
  - `performance.spec.ts` green and untouched; the gate green; `git diff --name-only` lists the files
    above and this document.
- **Category**: a fix to a published path's behaviour, released in step 7.

### Step 2 — `eval-core`: the grammar, per call

- **New**: `internal/functions/colon-identifiers.ts` (§ 3.5), not re-exported;
  `internal/functions/colon-identifiers.spec.ts`.
- **Edit**: `internal/functions/parse.ts` (the parser chosen per call); `internal/interfaces/parser-types.ts`
  (the member, with a JSDoc naming this plan's rule); `internal/performance.spec.ts` (§ 3.9's case).
- **Builds**: § 3.3's option, § 3.4 entire, § 3.5, through the free `parse` and `ParserService.parse`.
- **Exit criteria**:
  1. **The case table** (§ 3.4), every row, through both entry points, each asserting the AST's shape —
     not "parses" — and, for errors, class, `pos` and `loc`. With the option off, every row is today's.
  2. **The node.** `x + Q1:1:3 * 2` gives an `Identifier` named `Q1:1:3`, `start` 4, `end` 10, and
     under `locations: true` (1:4)–(1:10).
  3. **Errors are exact.** `Q1:1 + * 2`, `x + Q1:1:3 +` and `Q1:1 Q2:2` raise at the positions the base
     parser reports for the same text with `_` in place of each joining colon (P2). The consequent case
     names the colon name and parentheses; the key case names the key and both fixes.
  4. **The default path** (§ 3.9) — the `performance.spec.ts` case.
  5. **The base parser is untouched**: `acorn.Parser.prototype.readWord` is the same function after the
     module loads.
  - *Wrong implementations*, each run against the whole table, reported by row:
    - W1 — no consequent rule: the `a?b:c` rows fail.
    - W2 — keys joined like any name: the compact-object rows parse — `({a:b})` as a shorthand
      `a:b` — and fail.
    - W3 — pending `?` counted for the whole parse, not per frame: `c ? f(Q1:1) : 0` fails.
    - W4 — keywords join: the `true:1` rows fail.
    - W5 — any identifier character joins (`isIdentifierChar`): the non-ASCII and escape rows fail.
    - W6 — a text pre-pass that rewrites `\w:\w` before acorn: the string, template and regex rows
      fail.
  - The gate green; `git diff --name-only` lists the files above and this document.
- **Category**: additive, unreleased until step 7.

### Step 3 — `eval-core`: the application switch

- **New**: `actual/services/colon-identifiers.provider.ts` — `provideColonIdentifiers` and its internal
  token; `actual/services/eval.service.colon-identifiers.spec.ts`.
- **Edit**: `parser.service.ts` (reads the token); `compiler.service.ts` (§ 3.2's string key; the AST
  branch untouched); their specs; the services' `public-api.ts` (the export); `modules/eval-core/README.md`
  — a section naming `provideColonIdentifiers` and `colonIdentifiers` in code spans, with one executed
  ` ```javascript ` block; `src/lib/readme-examples.spec.ts` — that block executed and
  `README_JAVASCRIPT_BLOCKS` raised from 16 ([BL-F13](../backlog-retired.md#f13)); `export-list.spec.ts`
  only if its F10 case needs it ([BL-F10](../backlog-retired.md#f10)).
- **Builds**: § 3.1's decision and § 3.2's `CompilerService` half.
- **Exit criteria**:
  1. **Every service reaches it.** Under `provideColonIdentifiers()`: `EvalService.simpleEval('Q1:1 + 1',
     { 'Q1:1': 2 })` is 3; `CompilerService.compile` then `simpleCall` the same; `compileAsync` then
     `simpleCallAsync` the same; `DiscoveryService.extract('Q1:1 + x', 'Identifier')` names `Q1:1` and
     `x`. Without the provider each is today's error. *Wrong*: `defaultParserOptions` gains
     `colonIdentifiers: false` — every row under the provider fails.
  2. **Per call wins.** Under the provider, `ParserService.parse('Q1:1', { colonIdentifiers: false })`
     is a label.
  3. **A change after first use, through the setter, reaches compiled strings.** `CompilerService.compile('Q1:1 == 1')`
     before the setter turns the option on, then after it: the second compiles a colon name. *Wrong*:
     the string key without the fingerprint — the second returns the label's function (P7).
  4. **Per injector.** A `TestBed` configuration with the provider, then one without: the second parses
     `Q1:1` as a label. *Wrong*: a module-level flag set by the provider.
  5. **Misplacement is loud.** The provider in a child environment injector throws at its creation,
     naming `provideColonIdentifiers` and the root. *Wrong*: no initializer — the child is created and
     colon names are not parsed.
  6. **Hooks and dependencies** (§ 3.7) — finding 8's read table and `dependencies`, through
     `EvalService` under the provider, with and without `caseInsensitive`. *Wrong*: the plugin producing
     `Q1` with a computed member `1` — every key and path row fails.
  7. **Refusals** (§ 3.6) — finding 9's rows, under the provider. *Wrong*: `refuseDangerousName` and
     `refuseDangerousMatch` removed — the identifier rows fail with the option on, which is what shows
     the rows reach the guards through colon-name expressions.
  - `readme-examples.spec.ts` and the F10 case green with the new block counted; the gate green;
    `git diff --name-only` lists the files above and this document.
- **Category**: additive, and a versioned behaviour fix to `CompilerService`'s cache; released in
  step 7.

### Step 4 — The corpus: data-driven cases, synthetic until real ones arrive

- **New**: `modules/eval-core/src/lib/colon-identifiers.corpus.json` — the data;
  `colon-identifiers.corpus.spec.ts` — the runner, which reads the JSON with `fs`, as
  `readme-examples.spec.ts` reads the README, so adding an expression changes no code.
- **The format.** `{ "cases": [ … ] }`, each case `{ "id", "origin", "expression", "context"?,
  "expect" }`. `origin` is `"synthetic"` or where a real expression came from. `expect` is one of:
  `{ "value": … }`; `{ "syntaxError": "<message fragment>", "pos": n }`; `{ "error": "<message
  fragment>" }` for a throw at evaluation; `{ "reads": [ … ] }` — the `dependencies` it must record,
  for a real expression whose value is unknown; `{ "outOfScope": "<construct>" }` — the runner asserts
  it does **not** parse under the option, so an out-of-scope construct that starts parsing is noticed.
  Every case runs through `EvalService` under `provideColonIdentifiers()`.
- **Synthetic cases** now: § 3.4's table rows that evaluate, and legacy-shaped ones over the known
  names — `Q1:1 == 1 && Q2:3 > 2`, `VP14:0 + DEALERS_COUNT:0`, `Q1:1:3 || Q1:2:3`, `(Q1:1) ? 1 : 0`,
  `Q1:1 ? (Q2:2) : Q3:3`.
- **Real cases**, when Mikhail supplies them, are appended as data. They are committed as he supplies
  them, and names may be anonymised so long as the colon structure is kept.
- **Exit criteria**:
  1. Every case passes.
  2. Each of step 2's six wrong implementations fails at least one corpus case; the report names them.
  3. The report gives, over the real cases if any have arrived and the synthetic ones otherwise: how
     many put a colon name in a consequent unparenthesised (§ 8 q1), how many use a compact object key
     (§ 8 q2), how many need a keyword or non-ASCII prefix (§ 8 q4), and every `outOfScope` construct.
  - The gate green; `git diff --name-only` lists the two files and this document.
- **Category**: test-only; ships in no package.

### Step 5 — `eval-signals`: the reworded refusal, and colon keys through both factories

- **New**: `eval-signal.colon-identifiers.spec.ts`.
- **Edit**: `eval-signal-async.ts` (the two messages, `:113`, `:123`, and the `abortSignalKey` JSDoc's
  "a name no expression could read", `:56`, which the option makes inexact in the same way);
  `eval-signal-async.spec.ts` — a case for the new wording beside the existing refusal cases, which
  assert only the option's name and the key (`:1153-1158`) and stay as they are.
- **Exit criteria**, through the factories under `provideColonIdentifiers()`:
  1. `createEvalSignal` over `{ 'Q1:1': signal(1), 'Q2:3': signal(2), obj: { 'R:7': 4 } }` reads the
     sum, reports `dependencies` `Q1:1`, `Q2:3`, `obj`, `obj.R:7`, and recomputes when the `Q1:1`
     signal changes and not when an unread signal does. Under `caseInsensitive`, `q1:1` is reported as
     `Q1:1`. *Wrong*: `respellRoots` splitting its root on `/[.:]/` — the dependency rows fail.
  2. `Q1:1 = 5` throws `SignalContextWriteError` with `key` `Q1:1`.
  3. `createEvalSignalAsync` resolves a colon key and reports it in `dependencies`.
  4. `abortSignalKey: 'run:abort'` is refused at construction, under the provider and without it,
     with the reworded message.
  - The gate green; `git diff --name-only` lists the files above and this document.
- **Category**: a patch — one message, released in step 7.

### Step 6 — `eval-forms`: both adapters, and the label refusal

- **Edit**: `reactive/src/lib/field-schema.ts` (`validate` through `ParserService`, § 3.8);
  `signals/src/lib/rules.ts` (`ExpressionRuleOptions.colonIdentifiers`, resolved per key, and `prepare`);
  `src/lib/guard-identifiers.ts` (the top-level label, and its JSDoc); their specs; `modules/eval-forms/README.md`
  — the option, the provider's reach into `/reactive`, and the refusal.
- **Exit criteria**:
  1. **`/reactive` under the provider**: a schema with a control named `Q1:1` and `visible: 'Q1:1 == 1'`
     binds and follows the control; `x + Q1:1 > 0 || constructor` is refused at bind with
     `guardIdentifiers`' message. *Wrong*: `validate` left on the free `parse` — the second binds (F2).
  2. **`/reactive`'s missing-injector cases** are green and unmodified.
  3. **`/signals`**: `colonIdentifiers: true` on the factory makes `evalVisible(p.city, 'Q1:1 == 1')`
     follow the model's `Q1:1`; a registration's `colonIdentifiers: false` overrides it for that rule;
     with neither, `x + Q1:1 > 0` throws a `SyntaxError` at registration. *Wrong*: the registration
     value ignored — the override row fails.
  4. **The label refusal**: without the switch, `Q1:1 == 1` is refused at registration in both adapters,
     naming `Q1` and `colonIdentifiers`; `[1].map(() => { L: 1 })` is not refused. *Wrong*: no refusal —
     both adapters' rows read a blank instead (F1); a label refused anywhere in the tree — the nested row
     fails.
  5. **One string, both adapters**: `Q1:1 == 1`, `x + Q1:1 > 0` and `Q1:1 && constructor`, through both
     adapters with the switch on and off, are refused at both or evaluated at both.
  - The gate green; `git diff --name-only` lists the files above and this document.
- **Category**: a breaking minor (the refusal) and an addition (the option), released in step 7.

### Step 7 — Docs and release

- **Precondition — § 8 q3 answered and recorded in this document.** If the grammar spec fails at
  `acorn` 8.11.2, this step does not start: the floor is raised deliberately, as a decision recorded
  here, not to make the release fit.
- **Edit**:
  - `modules/eval-core/README.md` — the section step 3 began, completed: the rule, the case table's
    gist, parentheses in a consequent, quoted keys, keywords and ASCII, `path` as dotted segments
    (§ 3.7), and where the provider goes. Every new ` ```javascript ` block executed and counted.
  - `modules/eval-signals/README.md` — `abortSignalKey` stays a plain identifier, so its "a name that
    is not an identifier" (`:431`) says so; colon keys need nothing of `eval-signals`.
  - `modules/eval-forms/README.md` — completed from step 6, and the quoted peer range.
  - Each package's `package.json` and `CHANGELOG.md` per § 3.10; `eval-forms`' entry calls out the
    breaking refusal.
  - `ROADMAP.md` — Phase 9 marked done; "Suggested order" updated. `CLAUDE.md` — the plan named as a
    design record.
  - `docs/backlog.md` — the entries the phase touched.
  - `docs/colon-identifiers/phase-9-summary.md` — the phase's one retrospect.
  - This document — each step's outcome.
- **Exit criteria**:
  - § 8 q3 answered with its recorded result.
  - The gate green; both downstream `lint` targets going green is the check that the ranges widened —
    they fail on the bump alone (finding 14).
  - The built `.d.ts` of each package against its published tarball (`npm pack` outside the repo):
    `eval-core` 0.11.0 by § 3.10's additions and documentation comments; `eval-signals` 0.5.0 by the
    `abortSignalKey` comment only; `eval-forms` 0.4.1 by the `/signals` member and comments.
  - `readme-examples.spec.ts` and the F10 cases green in all three packages.
- **Category**: the release. Publishing, tags and the Publication status rows are CONTRIBUTING's
  Releasing procedure, after this commit; so is CLAUDE.md's "Published at" line.

---

## 5. Public API surface added

```ts
// from @zvenigora/ng-eval-core — additive
export type ParserOptions = Partial<acorn.Options> & {
  extractExpressions?: boolean;
  cacheSize?: number;
  ecmaVersion?: acorn.ecmaVersion;
  /** Phase 9 § 3.4. Parse a colon-joined name such as `Q1:1:3` as one identifier. */
  colonIdentifiers?: boolean;
};

/** § 3.1. Turns colonIdentifiers on for every parse through ParserService; root providers only. */
export function provideColonIdentifiers(): EnvironmentProviders;

// from @zvenigora/ng-eval-forms/signals — additive
export interface ExpressionRuleOptions {
  eval?: EvalOptions;
  onError?: ExpressionErrorPolicy;
  /** § 3.8. Parse this factory's — or this registration's — rules with colonIdentifiers. */
  colonIdentifiers?: boolean;
}
```

Nothing is added to `eval-signals`. `defaultParserOptions` is unchanged. `guardIdentifiers` keeps its
signature and refuses one more shape (§ 3.8).

---

## 6. Verification gates

| Gate | Command | Expected |
| :--- | :--- | :--- |
| Everything | `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` | Green, every step |
| `eval-core` tests | (in the above) | Baseline plus each step's cases; no existing assertion changed |
| `eval-signals` / `eval-forms` tests | (in the above) | Unchanged until steps 5 and 6; the downstream witnesses for steps 1–3 |
| Perf | `internal/performance.spec.ts` | Green; gains § 3.9's structural case in step 2 and nothing else |
| Docs | the root `test` target (`tools/doc-links.mjs`, `tools/release-tags.mjs`) | Green |
| Scope | `git diff --name-only` | Exactly the step's file list in § 4 and this document |
| Surface | the built `.d.ts` against the published tarballs | Step 7 only |
| acorn floor | § 8 q3 | Before step 7 |

### 6.1 The spec discipline for a grammar

- **Assert the tree, not that it parsed.** "Parses" passes against a parser that joins in the wrong
  place: `({a:b})` parses under W2 too, as a shorthand. Each row asserts the node types and names that
  distinguish the readings.
- **Every row runs with the option off as well.** The table's middle column is a criterion: a plugin
  that leaks into the default path turns it red.
- **Errors are asserted by class, `pos` and `loc`**, and a hint by the name and the fix it carries —
  never by `toThrow()` alone.
- **A context that holds the key and one that does not**, for every evaluation row: a colon name read
  as `undefined` is indistinguishable from one never joined if the fixture only ever omits it.
- **Break each criterion the ways § 4 names**, and report which rows failed, by name.

---

## 7. Risks

| Risk | Likelihood | Mitigation — the criterion that fails |
| :--- | :---: | :--- |
| Legacy expressions put colon names in consequents, so the parentheses rule rejects much of the corpus | **Unknown until the corpus** | Step 4's count; § 8 q1 costs the alternative |
| A compact object key in a working expression stops parsing under the option | Low for survey rules | Loud at parse; step 4's count; § 8 q2 |
| `{Q1:1}` read silently as `{Q1: 1}` | Designed out | § 3.4, 2; step 2's W2 |
| A forgotten switch renders `eval-forms` fields blank | **High** without the refusal — it is today's behaviour (F1) | Step 6 criterion 4 |
| `/reactive`'s guard skipped for colon rules | Certain without step 6 | Step 6 criterion 1 (F2) |
| A switch changed after first use is ignored | Certain without steps 1 and 3 | Step 1 criterion 3; step 3 criterion 3 |
| The provider placed in a lazy route, silently inert | Medium | Step 3 criterion 5 |
| acorn internals differ inside `^8.11.2` | Low (finding 13) | § 8 q3, a precondition of step 7 |
| The plugin slows the default parse | Low (finding 12) | Step 2 criterion 4 |
| A colon name opens a prototype path | Very low, by construction (§ 3.6) | Step 3 criterion 7 |
| A consumer splits paths on `:` | Low | README (§ 3.7) |
| `eval-forms` consumers on `eval-core` 0.11 cannot install 0.5.0 | Certain, by design | § 3.10; CHANGELOG |

---

## 8. Open questions

1. **Do legacy expressions put colon names in consequents?** § 3.4 requires parentheses there; the
   retry design removes the requirement at the cost of a search (§ 3.4, option considered for 1).
   *Settled by* step 4's count over real expressions. Zero, or a handful the author can parenthesise:
   § 3.4 stands. More: the retry design is planned as a step of its own before step 7 — a replan, not
   an improvisation inside step 4.
2. **Do they build compact object literals?** § 3.4 refuses `({a:1})` under the option. *Settled by*
   step 4's count. If they do and never mean a shorthand, keeping JavaScript's reading of a key is the
   reopening, with § 3.4's silent-shorthand cost stated against it.
3. **Does the grammar hold at `acorn` 8.11.2? — a precondition of step 7.** *Evidence required*: step 2's
   spec and step 4's runner, run against `acorn` 8.11.2 outside the workspace after step 6, with the
   installed version as the control; each result and any substitution recorded here. A failure stops
   step 7 (§ 4).
4. **Keyword prefixes and non-ASCII names.** Refused by § 3.4. *Reopens on* a real key that needs one.
5. **A per-signal parser option in `eval-signals`.** Not provided: the provider covers the one
   application, and per-signal control would need `CompilerService` to take parser options per call.
   *Reopens on* a consumer that mixes colon and non-colon parsing in one application.
6. **What else the legacy expressions contain.** `<>` and templates are out of scope (§ 2); the corpus
   records anything else that fails, by construct, and a construct that recurs is a phase of its own.

---

## 9. Downstream contract

What a consumer — and the two downstream libraries — can rely on after this lands:

1. With `colonIdentifiers` on, `Q1:1:3` is one `Identifier` whose `name` is the source text, and it
   reads `context['Q1:1:3']`. Nothing splits, normalises or interprets it.
2. With it off — the default everywhere — every expression parses as it does at 0.11.0, and the free
   `parse` calls acorn's own parser.
3. The rule is § 3.4's: no whitespace, ASCII, no keyword prefix; parentheses for a colon name in a
   conditional's consequent; a quoted key for a colon-named property. Every refusal is a `SyntaxError`
   with acorn's `pos` and `loc`.
4. `provideColonIdentifiers()` in the root providers reaches `EvalService`, `CompilerService`,
   `DiscoveryService`, `eval-signals`' factories and `/reactive`, and a per-call `colonIdentifiers`
   overrides it. A change through `ParserService.parserOptions` after first use is honoured.
5. Read events, `dependencies` and `respellRoots` carry the whole colon name as one path segment.
   Every prototype-pollution refusal is unchanged.
6. `eval-signals`: `abortSignalKey` stays a plain identifier.
7. `eval-forms`: `/signals` takes `colonIdentifiers` per factory or registration; `/reactive` follows
   the provider; both refuse, at registration, a rule that parses as a labeled statement.
8. **Not** provided: any other legacy syntax; structure in a name; a separator other than `:`;
   per-signal parser options.
