# Phase 17 Plan — `@zvenigora/ng-eval-template` 0.1.0, text with expression macros (new module)

**Status: Revision 1, ready for step 1.** No step has run, and nothing is committed. The design is
[`design-session.md`](design-session.md), two sessions and questions Q1 to Q45, with ten readings
the maintainer confirmed. This plan does not restate it: it cites a decision by its Q number, and
adds what a plan needs: measurements, scope, steps, exit criteria, and what goes red.

A statement here about how `eval-core` behaves is a row of
[§ 1.3](#13-mechanism-questions-measured), run on the built 0.16.0 bundle from scripts pinned
outside the repository ([SR32](../standing-rules.md#sr32), [SR47](../standing-rules.md#sr47)), or
it says it is a prediction. Step 1 checks the hashes and runs the scripts again on the bundle its
own gate builds.

**What is open.** [§ 8](#8-questions) holds seven readings this plan makes by its rule P-1, on
points the measurements raised after session 2 had ended. Each is the stricter of two published
behaviours, and each is for the maintainer to confirm or change at step 1's gate; § 3 and § 4 are
written to them. The order among Phases 12, 17 and 18 is the maintainer's, and open: this plan
assumes neither order ([§ 3.6](#36-the-package)).

This phase ships **one release, 0.1.0**: `compileTemplate` and `renderTemplate`, plain functions.
`eval-forms`' template, `class` and `style` properties are Phase 18, with a plan of its own. What
Phase 18 needs from the shapes this phase publishes is
[§ 3.8](#38-what-phase-18-needs-from-010s-shapes).

## 0. Rules the plan adds

- **P-1. Where the design leaves a reading open, 0.1.0 ships the stricter one.** A refusal can be
  lifted in a later minor; an acceptance cannot be withdrawn without a breaking release
  ([SR12](../standing-rules.md#sr12)). Each use is marked **P-1** where it is made, so the
  retrospect can count what was later lifted. It is the `eval-rules` plan's
  [P-1](../eval-rules/plan.md#0-rules-the-plan-adds), taken as written. *Red*: nothing — held by
  review.

## 1. Current state

### 1.1 What exists today

- Three published libraries, `eval-core` 0.16.0, `eval-signals` 0.9.0 and `eval-forms` 0.9.0. No
  `modules/eval-template`, no `scope:template` tag, no path in `tsconfig.base.json`.
- `eval-core` exports what a walk outside Angular DI needs: `parse`, `extractExpression`,
  `compile`, `call`, `findUnsupportedStatement`, `fromContext`, `EvalState`, `EvalContext`,
  `Registry`. Its `ParserOptions` type is acorn's options and three keys of its own, so `onToken`,
  `onComment` and `allowAwaitOutsideFunction` are typed through it, with no import of `acorn`.
- `eval-forms`' `evaluateRule` is the pattern for a reused context: one `EvalState` per walk
  around one `EvalContext`, with a depth-mark unwind of the scope stack in a `finally`.
- The `eval-rules` plan, [`docs/eval-rules/plan.md`](../eval-rules/plan.md), is at Revision 4 with
  no step run. Its findings about `eval-core` 0.16.0 hold here, and this plan cites them by number
  as "R-finding n" where it relies on one, with the row of this plan that re-measures it.

### 1.2 Findings that shape the plan

Each names the row of [§ 1.3](#13-mechanism-questions-measured) it is read from.

1. **Session 1's rule for where a macro ends fails for an operator-led `end`** (T1). With acorn's
   `parseExpressionAt` and `end` required after the expression, 26 of 61 texts gave an expression;
   the first-`end` rule of Q34 gave one for 51, those 26 among them. It failed on every text under
   `%>`, `?>`, `-->`, `>>`, `=]` and `|`. That arm ran on acorn's own parser, since the bundle exports none, so
   it has no colon-joined names: it is the reason Q34 was asked, and nothing ships from it.
2. **One whole expression needs no new `eval-core` export** (T1b). The exported `parse` reads
   `(` + text + a newline + `)`, so the text is in expression position: `{a: 1}.a` is a
   `MemberExpression`, where the same text parsed alone is a block and fails. The tokens `onToken`
   delivers say whether the wrapper's parenthesis closes at the last token: `a) + (b` parses
   wrapped, and is refused because it closes early. The newline keeps a line comment from
   swallowing the closing parenthesis. A problem's offset is the wrapped offset less one, read
   from the `pos` of acorn's `SyntaxError`. It works under `colonIdentifiers`: `Q1:1` is one
   `Identifier` there and a syntax problem without it. Design Q28's possible `eval-core` minor is
   therefore not needed, and no downstream package releases with this one
   ([SR42](../standing-rules.md#sr42)).
3. **The same tokens give the top-level commas** (T1b): `f(a, b), 'c'` has one, at offset 7, and
   `('a', 'b')` has none. That is Q35's whole mechanism. `'a',` and `,a` are syntax problems.
4. **The first-`end` rule, implemented as written, is not safe against its author** (T2). Taking
   each `end` in the text in turn ("N") made 31,999 parse attempts over a 32,004-character
   template that is one tag with an open string, and took 5,325 ms. A 3,006-character tag of 1,000
   nested calls under the `end` `)` took 3,211 ms. The author is the least trusted the READMEs name
   (design Q2), so 0.1.0 cannot ship N.
5. **A guided search gives N's answer in a bounded number of parses** (T1, T2). "G" tries the
   first `end` in the text, which is N's answer by definition when the text before it is whole,
   and costs an ordinary macro one parse. Otherwise it parses `(` + a window of the text once and
   lets the parse fail where the text stops continuing an expression. The candidates are the
   positions where the text starts with `end` among: the tokens delivered at the wrapper's own
   depth, and the first text after the last token delivered, which is the token the parse had
   read and not consumed, or could not read. Each is confirmed by the whole-expression parse, in
   order, and the window doubles while none is. The prototype also takes the failure's own
   position; no T1 row needs it, so step 3 keeps it only if a row does
   ([SR21](../standing-rules.md#sr21)).
   N and G gave the same result on 115 of 122 rows, 61 texts in each parser mode, and G made 1
   attempt where N made 31,999, in 3.4 ms, and 2 where N made 1,001, in 24.3 ms.
6. **The seven rows where G differs are two kinds, and each is refused by a rule of § 8** (T1).
   In five, `end` starts with a character that can sit inside a name or a number, `x}`, `.}` and
   `:1}`: N ends the macro inside `max`, `1.` or `Q1:1`, and G, which looks only where a token
   starts, finds nothing. In two, an `end` sits in a line comment: N ends the macro there, and G
   at the next one. [§ 8](#8-questions) q2 and q3 refuse both forms (P-1), and with them refused G
   is N's answer: [§ 3.3](#33-where-a-macro-ends) has the argument.
7. **A candidate `end` can be tried without end** (T2, H5). With the `end` `+`, every `+` of
   `x ? 1 + 1 + … : 0 +` is a candidate at the wrapper's depth, and the text before each is not
   whole. N made 1,001 attempts in 1,204 ms at 4,014 characters. G stops at 100 attempts in one
   tag, with a problem (§ 8 q5).
8. **A deep expression overflows a stack, in three places** (T1, T2). acorn refuses 5,000 nested
   parentheses with its own message, `Not enough stack space to parse input`, a `SyntaxError`. A
   chain of 4,000 `+` raised a `RangeError` inside the parse, and in an earlier unpinned run one
   left `compileTemplate` uncaught, from the tree walk or `compile`. `compileTemplate` does not
   throw for a text (Q19), so it turns a `RangeError` from the parse, the checks and `compile`
   into a problem.
9. **An `await` gets a message of its own only if the parser is told to read it** (T1b,
   R-finding 10). Under the
   default options `await a` is a syntax error with the message any malformed text gets. With
   `allowAwaitOutsideFunction` it is an `AwaitExpression`, which a walk of the tree refuses with a
   message of its own ([SR18](../standing-rules.md#sr18)). `async () => 1`, `import('x')` and a
   block-bodied arrow function each parse as one expression, and the walk names each (T3). What
   the option costs: a context key named `await` no longer parses.
10. **A macro can write the host's context** (T4c). Over a plain object with no write policy, 9 of
    17 write forms changed the caller's object in the case-sensitive mode: `x = 5`, `o.k = 9`,
    `o.k++`, `arr.push(4)`, `arr.sort()`, `Object.assign(o, …)`, `fresh = 1`, `o["k"] = 3` and
    `X = 6`. Under `caseInsensitive`, the three identifier writes landed on the `Registry` copy,
    and seven member writes on the caller's nested objects. With the two overrides `eval-signals`'
    signal context writes, `set` and `checkMemberWrite`, 11 of the 17 were refused in each mode
    and the caller's object was unchanged after all 17. `bump()`, a function the host supplied,
    still ran, and counted. `delete o.k` is not refused and deletes nothing, in both arms
    (R-finding 8). `arr.slice().sort()` is refused and `[...arr].reverse()` and `arr.toSorted()`
    are not (R-finding 16). The design did not ask about writes: § 8 q1.
11. **What a value prints** (T4a). `null`, `undefined` and an unknown name print `''`; `0`,
    `false`, `NaN` and a `BigInt` print as JavaScript writes them; an object prints
    `[object Object]`, an array `1,2,3`, a `Date` its local-time text. Three values do not print:
    a null-prototype object and an object whose `toString` throws make `String` throw, and a
    `Promise` is a failure by reading 6. A thenable that is not a `Promise` prints
    `[object Object]` (R-finding 27). **A function prints its source text**,
    `function host(a) { return a; }`: § 8 q4. A member of an unknown name does not throw:
    `{{missing.x.y}}` prints `''` (T4f).
12. **A value is inserted once** (T4a). A value holding `{{ secret }}` printed those characters,
    escaped or raw, with `secret` in the context. That is design Q14, witnessed.
13. **The failure rule of Q43 to Q45, run** (T4b). Over 14 templates and four policies: a failed
    value macro, a failed `#if` or `#elseif` condition, a failed `#switch` subject and a failed
    `#case` value each printed `onErrorPrint` once and nothing else of the block; a failure after
    a branch had matched was never reached; a failed macro inside a taken branch replaced that
    macro only. A function policy saw each error once, and what it returned was not printed. A
    function policy that throws stopped the render with its own throw. A `Promise` as a condition
    is truthy to JavaScript; the prototype treats it as a failure, which is § 8 q7.
14. **`caseInsensitive` works over a plain object, and half-works over a store built without
    it** (T4d). A template compiled with the option read `COUNT`, `USER.NAME` and `user.NAME` over
    a plain object and a class instance. Over a case-sensitive `Registry`, and over an
    `EvalContext` built without the option, it read `user.NAME` and neither of the others: the
    walk's option corrects a member name, and the store's own option decides an identifier. The
    reverse holds too: a template compiled without the option read `COUNT` over a store built with
    it. A null-prototype object read nothing in either mode, with no error
    ([A58](../backlog.md#a58)). § 8 q6.
15. **The unwind is for the host** (T4e, R-finding 22). After two throws inside arrow functions,
    the scope stack was at its starting depth with no unwind by the caller. A host function that
    called `this.push({ a: 'stranded' })` left it one deeper: without the unwind the next macro
    read `stranded`, and a second render over the same context began at depth 1 and ended at 2.
    With a depth-mark unwind after each macro both renders read the context's own value and ended
    at depth 0.
16. **A caller's `EvalContext` is read through, not copied** (T4g). Over a context whose only
    source is a lookup, `{{#if a == 1}}{{b}} {{user.name}}{{#else}}{{c}}{{/if}}` asked the lookup
    for `a`, `b` and `user`, and never for `c`; after the source changed, the next render printed
    the new value. That is what Phase 18 builds on (§ 3.8).
17. **Escaping** (T4f). The five characters are escaped in a value, which is then inert inside a
    quoted attribute. `href="{{url}}"` with a `javascript:` URL is printed as written: nothing in
    it needs escaping, and design Q27 leaves it to Angular's sanitizer at the binding.
18. **Two messages are shared with another layer** (T3). `{{ Q1:1 + 1 }}` with `colonIdentifiers`
    off is `Unexpected token` at the colon, the message any malformed text gets, so a host that
    forgot the option is not told ([SR18](../standing-rules.md#sr18): a gap). And a failed block
    opener cascades in the prototype: `{{#if}}x{{/if}}` reports the empty expression and then a
    stray `/if`. Both are step 4's to close: a hint on the first, and a block that opens even when
    its expression is a problem.

### 1.3 Mechanism questions, measured

Each row is answered by a script under `D:\repo.2026\ng-eval-base\eval-template-prototype\`, run
against the `eval-core` 0.16.0 bundle in the repository's `dist/`, built 2026-11-08, SHA-256
`71936AEB…7F051264`, on Node 26.4.0: the bundle the `eval-rules` prototype ran on. Which tree
built it was not checked, which is why step 1 runs the scripts again. The bundle is partially
compiled, so a script loads `@angular/compiler` before it, by a path into the repository's
`node_modules`. The folder's `SHA256SUMS.txt` has 10 lines.

| Script | SHA-256 | Result | SHA-256 |
| :--- | :--- | :--- | :--- |
| `README.txt` | `F39A4213…E047C267` | — | — |
| `scripts/lib.mjs` | `E9CB3496…C12E879C` | — | — |
| `scripts/t1-macro-end.mjs` | `5DDD1567…3F70BB14` | `results/t1-macro-end.txt` | `F5FFDE9E…8491B98D` |
| `scripts/t2-cost.mjs` | `BFD693A9…296AACBF` | `results/t2-cost.txt` | `6FDBEA42…C5689B60` |
| `scripts/t3-compile.mjs` | `37B90608…DECD4212` | `results/t3-compile.txt` | `B862DE5E…98BA8E8C` |
| `scripts/t4-render.mjs` | `9A2E35B2…6E23281B` | `results/t4-render.txt` | `5393DBCB…3D7C2312` |

`lib.mjs` is a prototype of [§ 3](#3-design-of-010): the whole-expression parse, the three ways to
find a macro's end, and a `compileTemplate` and `renderTemplate` small enough to read beside each
row. It is not the implementation, and no step copies it: a step is written test-first
([SR13](../standing-rules.md#sr13)).

T2's milliseconds are single runs in one process. They answer a design question; they are not
timings under [SR28](../standing-rules.md#sr28), none is published, and they moved between runs.
What does not move is the count of parse attempts beside each, and § 4's criteria are written to
the counts.

| # | Question | Answer | Script |
| :--- | :--- | :--- | :--- |
| T1 | Where does a macro end, by each of three mechanisms, in each parser mode? | Findings 1, 5 and 6. 61 texts under 19 `end` delimiters. Plain parser: A gave an expression for 26, N for 51. Colon parser: N for 52, since `Q1:1 + Q2:12` and `flag ? (Q1:1) : Q2:12` parse there, and `{Q1:1}` is refused there with `eval-core`'s own message. N and G differ on 7 of the 122 rows, all outside G's rule | `t1-macro-end` |
| T1b | Is a text one whole expression? | Findings 2, 3 and 9. 28 texts in each parser mode: `a) + (b`, `a; b`, `let x = 1`, `x: 1`, `...a`, an empty text and an open block comment are problems; `a // c` and `a /* c */` are whole, each with its comment reported at offset 2 | `t1-macro-end` |
| T2 | What does a hostile or a large template cost each mechanism? | Findings 4, 5, 7 and 8. Seven shapes, n from 250 to 64,000. On 64,000 valid value macros, 832,000 characters, N and G each made one attempt per macro. On 100 or more unclosed tags both stop at 100 problems with no parse at all | `t2-cost` |
| T3 | Which problems does a prototype of `compileTemplate` report? | 65 templates: 42 gave problems, 21 rendered and 2 compiled and threw at render, an unknown function and an object literal `eval-core` refuses. The design's five examples render as its § 2.2 says, under `{{ }}`, `[= ]` and `<% %>`. Q38's four backslash rows, Q35's commas, Q39, each row of Q40, the nesting options and readings 7 to 9 each give the problem the design names. Finding 18's two gaps | `t3-compile` |
| T4 | What does a prototype of `renderTemplate` print, refuse and leave behind? | Findings 10 to 17, in seven groups, T4a to T4g. T4c and T4d run both case modes, and T4d's "by variant" column is the mode check: a key read by a case variant ([SR19](../standing-rules.md#sr19)) | `t4-render` |

What step 1 still owes: the hashes checked with `sha256sum -c`; each script run again on the
bundle the step's gate builds, with any row that differs written here as a plan correction
([SR4](../standing-rules.md#sr4)). No script measures the `@angular/core` peer or
`release-tags.mjs`, which are step 2's.

## 2. Decisions — recorded, not reopened

From the design sessions, by question.

| Decision | Q |
| :--- | :--- |
| A stand-alone package, `modules/eval-template`, depending on `eval-core` only; plain functions, no Angular DI, no signal | Q6, Q12, Q25, Q26 |
| `compileTemplate` returns the compiled template or every problem at once, and does not throw for a text; rendering never parses | Q19, reading 10 |
| Delimiters from the options, non-empty and different, with no whitespace and no backslash; `#` and `/` fixed | Q16, reading 5 |
| Backslashes before `start`: each pair prints one, an odd one left escapes the delimiter | Q38 |
| A macro ends at the first `end` before which the text is one whole expression | Q34, revising Q22 |
| Blocks are `#if`, `#elseif`, `#else`, `/if` and `#switch`, `#case`, `#default`, `/switch`, matched by a stack; tag names lowercase under every option | Q9, Q29, Q39 |
| Truthiness for `#if`; `===`, first match and no fall-through for `#case`; no match prints `''`; an untaken branch is not evaluated | Q13, Q18 |
| A top-level comma separates `#case` values and is a problem anywhere else | Q35 |
| The block-shape problems | Q40 |
| A macro is one expression: no statement anywhere, no `await`, no `async` function, no `import()` | Q20, reading 7 |
| An identifier naming a member of `Object.prototype` is a problem | Reading 8 |
| A tag starting with `/` is a close tag | Reading 9 |
| `null` and `undefined` print `''`; any other value prints as `String(value)`; a `Promise` is a failure | Q11, readings 3 and 6 |
| Values are escaped under `output: 'html'`, the five characters; `#raw` and `output: 'text'` escape nothing | Q10, Q23, Q27, reading 2 |
| Nesting by structure only, behind `nestedBlocks`, off, and `nestedValues`, on | Q14, Q24, Q30 |
| `onError` is `'throw'`, `'undefined'` or a function that observes; `'undefined'` is the default | Q36, Q45 |
| A contained failure prints `onErrorPrint`, `''` by default, as written: in place of a value macro, or once in place of a whole block | Q37, Q43, Q44 |
| The six compile options belong to `compileTemplate`; `renderTemplate` takes the two error options; an unknown option throws | Reading 5 |
| 0.1.0 requires an Angular build and promises nothing about plain Node | Reading 4 |
| Named macros, loops, pipes, whitespace trimming, template comments and an `if … then` grammar are left out | Q15, Q20 |

## 3. Design of 0.1.0

A paragraph that cites a question of § 8 is written to this plan's reading of it, and changes with
the maintainer's answer.

### 3.1 In scope

- `compileTemplate(text, options?)`: the scan, one parse per expression, the checks, and a tree of
  compiled nodes. It returns the compiled template or the problems.
- `renderTemplate(compiled, context?, options?)`: one string.
- The types of both, and `TemplateErrorPolicy`.

### 3.2 The scan

One pass over the text, left to right, with a stack of open blocks.

1. Find the next `start`. The text before it is template text, printed as written.
2. Count the backslashes directly before it (Q38). Each pair is one backslash of text. If one is
   left over, the delimiter is text and the scan goes on after it.
3. Otherwise a tag begins. After any whitespace: `#` and a name, `/` and a name, or neither. A
   name is the letters that follow the mark, compared as written against the eight lowercase
   names (Q39). `#else`, `#default`, `/if` and `/switch` take no expression: after whitespace,
   `end` is required (Q40).
4. Every other tag holds an expression, from the first character after the name to where
   [§ 3.3](#33-where-a-macro-ends) ends it.
5. After a problem in a tag, the scan resumes directly after that tag's `start`, so a later tag is
   still read. A block opener whose expression is a problem still opens its block, so its close is
   not a second problem (finding 18).
6. An `end` outside a tag is text (Q31).

Between `#switch` and its first `#case` or `#default`, whitespace is dropped and anything else is
a problem (Q40).

### 3.3 Where a macro ends

**The rule** is Q34's: the macro's expression ends at the first `end` before which the text is one
whole expression.

**One whole expression** is finding 2's parse: `eval-core`'s exported `parse` over `(` + text + a
newline + `)`, with the template's `colonIdentifiers`, with `allowAwaitOutsideFunction`
(finding 9), and with `onToken` and `onComment`. The text is whole when that parses, the wrapper's
parenthesis closes at the last token, and the program is one expression statement. The same call
gives the top-level commas (finding 3) and the comments.

**The search** is finding 5's:

1. The first `end` after the expression's start. With none, the tag is never closed. If the text
   before it is whole, that is the end.
2. Otherwise one parse of `(` + a window of the text, 256 characters and doubling, gives the
   candidates, and each is confirmed by the whole-expression parse, in order. The first confirmed
   is the end.
3. At most 100 confirmations in one tag (§ 8 q5). With nothing confirmed and the window at the end
   of the text, the tag's problem is the first failed attempt's.

**Why the search gives the rule's answer.** A confirmed candidate is an `end` with a whole text
before it, so the search accepts nothing the rule would not. It could only be late: an earlier
`end` with a whole text before it that is not a candidate. Take such an `end` at position q. The
text before q is whole, so its brackets are balanced and no string, template or regular expression
is open at q. The guided parse reads the same tokens up to q, and then either consumes the token
at q, which is then a delivered token at the wrapper's depth, or fails on it or fails to read it,
and q is then the first text after the last token delivered. Each is a candidate.
What is left is a q that is not where a token starts: inside a name or a number, which § 8 q2
excludes by `end`'s first character, or inside a comment, which § 8 q3 makes a problem either way.
A multi-character operator cannot be split so that the text before the split is whole: a whole
expression ends in a name, a literal, a closing bracket, `++` or `--`, and no operator has one of
those as a proper prefix. The argument is this plan's, and step 3 does not rest on it: the rule,
implemented as written, is the oracle of a differential spec
([§ 4](#step-3--one-expression-and-where-a-macro-ends)).

### 3.4 What `compileTemplate` reports, and what it throws for

Each problem is `{ code, offset, message }` (reading 10): a `code` from a list documented as open,
the offset in the template text, and a message. All are returned together.

**What it throws for** is the host's own code, not the text: an option it does not define; a
`start` or `end` that is empty, equal to the other, or holds whitespace or a backslash
(reading 5); an `end` § 8 q2 refuses. The message names the option.

The problems, by what the author did:

- **The expression**: it does not parse; it is empty; it is not one expression; it nests too
  deeply for the parser, the checks or `compile` (finding 8).
- **The tag**: a `start` with no `end` that closes it; more than 100 candidate ends (§ 8 q5); an
  unknown tag name, an uppercase one among them; text after the name of a tag that takes none.
- **What a macro may not hold**: a top-level comma outside `#case` (Q35); a comment (§ 8 q3); a
  statement anywhere, an `await`, an `async` function, an `import()` (reading 7), each with a
  message of its own; a statement `eval-core` does not evaluate, with `eval-core`'s message from
  `findUnsupportedStatement`; an identifier that names a member of `Object.prototype` (reading 8).
- **The blocks**: a close with no open; an open with no close; an `#elseif` or `#else` outside
  `#if`, a `#case` or `#default` outside `#switch`; the order problems and the empty `#switch` of
  Q40; text or a macro before the first `#case`; a block in a branch with `nestedBlocks` off, or a
  value macro in one with `nestedValues` off; blocks nested more than 100 deep (§ 8 q5).
- **The list itself**: after 100 problems, one more that says the rest was not checked, and the
  scan stops (§ 8 q5).

Every rejection here runs before any evaluation, so none stands in a write's path
([SR46](../standing-rules.md#sr46)). The run-time refusals are § 3.5's.

### 3.5 The render, in order

For one `renderTemplate(compiled, context?, { onError?, onErrorPrint? })`:

1. The options are checked, and a failure throws: a key other than the two, an `onError` that is
   not one of the three forms, an `onErrorPrint` that is not a string.
2. The context is settled once (§ 8 q1, q6). An `EvalContext` is used as the caller built it,
   read through and never copied (finding 16). A plain object or a `Registry` is put behind this
   library's own `EvalContext` subclass, whose `set` and `checkMemberWrite` refuse (finding 10).
   No context is an empty one. Anything else throws, and so does a store whose case mode is not
   the template's.
3. The nodes are rendered in order. Template text is appended as written.
4. Each expression is one walk on a state of its own, built with the template's
   `caseInsensitive`, and followed by an unwind of the context's scope stack to the depth before
   the walk, in a `finally` (finding 15).
5. A value macro: `null` and `undefined` print `''`; a `Promise` and a function are failures
   (reading 6, § 8 q4); anything else prints as `String(value)`, and a throw from that is a
   failure (finding 11). Under `output: 'html'` the five characters are escaped, unless the macro
   is `#raw`.
6. `#if`: the conditions in order, and the first truthy one renders its branch. No later
   condition is evaluated.
7. `#switch`: the subject once, then each `#case`'s values in order until one is `===` to it;
   `#default` matches whatever is left.
8. A failure, which is a throw from a walk or one of steps 5 to 7's refusals: under `'throw'` the
   error leaves `renderTemplate`. Under a function, the function is called with it, and a throw
   from the function leaves `renderTemplate` (finding 13). Then `onErrorPrint` is appended, in
   place of the value macro, or in place of the whole block when the failure is a condition's, a
   subject's or a `#case` value's.

**What the render keeps on every path** ([SR44](../standing-rules.md#sr44)): it never parses; an
untaken branch is not evaluated; a value is inserted once and is never read as template text. Over
a plain object or a `Registry`, the caller's object, and every object reachable from it, is not
written by an expression of the template, unless through a function the host supplied
(finding 10; R-finding 17 for a `Reflect` among the context). **What it does not promise**: that a
write is refused, since `delete` is not; that a refused write's right side did not run
(the `eval-rules` plan's M2); or anything about writes over a caller's own `EvalContext`, whose
policy is the caller's ([SR40](../standing-rules.md#sr40)).

### 3.6 The package

`modules/eval-template`, tag `scope:template`, depending on `scope:core` only. Its peers are
`@zvenigora/ng-eval-core`, in the bounded range the siblings declare for the workspace version
when the release step runs, `>=0.16.0 <0.17.0` today; `acorn-walk ^8.3.0`, as `eval-forms`
declares it, for § 3.4's walk of a tree; and `@angular/core >=19.0.0` only if lint accepts a peer
the source does not import, which is the `eval-rules` plan's finding 3, a prediction there and
measured by whichever of the two plans' step 2 runs first. It imports nothing from `acorn`: a tree
is typed as `ReturnType<typeof parse>`, as in `eval-forms`, and a token through `ParserOptions`.
Its `tsconfig.json` is `eval-signals`' own, so its `lib` is `es2020`. One barrel,
`src/public-api.ts`, is the whole surface, pinned by `export-list.spec.ts` and
`public-api.spec.ts` as in the others.

**Neither order with Phase 12 is assumed.** Each plan's step 2 adds its own project, its own
entry in `tools/release-tags.mjs`, its own row in `CONTRIBUTING.md`'s Releasing and its own
section of `.claude/agents/code-reviewer.md`. The two edit the same files and no line of each
other's, so the second to run counts one more project than it finds. Step 1 reads the baseline
from its gate, whatever that is.

The package is built as the others are, a partially compiled bundle for an Angular build, and its
README says so (reading 4, R-finding 25).

### 3.7 Out of scope, and where it goes

| Not in 0.1.0 | Goes to |
| :--- | :--- |
| A template property at both `eval-forms` adapters, and the `class` and `style` properties | Phase 18 |
| Named macros and `#include`; loops; pipes; whitespace trimming; template comments; an `if … then` expression grammar (design § 2.5) | The register ([SR5](../standing-rules.md#sr5)), opened by step 1 |
| An async render, and `await` in a macro | The register |
| What § 8 refuses, once confirmed: a comment in a macro, an `end` led by a name or number character, a function printed as text, writes over a plain context, the three bounds as options | The register, one entry |
| A bound on evaluation time and memory (R-finding 9); running outside an Angular build | The `eval-rules` plan opens both entries if its step 1 runs first; otherwise step 1 here |

### 3.8 What Phase 18 needs from 0.1.0's shapes

A later phase adds; it cannot change what this one published. Each row is checked at step 1's
gate, and again in step 6 before the version is set.

| Later need | What 0.1.0 must already be | Where |
| :--- | :--- | :--- |
| Phase 18: one `EvalSignal<string>` per template, recomputed when a value a macro read changes (Q13, Q26) | A synchronous render that reads a caller's `EvalContext` through, so a signal context's reads are the render's reads and an untaken branch reads nothing | Finding 16, § 3.5 step 2 |
| Phase 18: the template is parsed once | A compiled template that holds what `compile` returned, and a render that never calls `parse` | Step 5's parse-count row |
| Phase 18: `eval-forms`' policy passed through | A type of the same shape (Q36) | § 5 |
| Phase 18: a write to a signal context is never contained by a policy, as in `eval-forms` | A function policy whose throw leaves `renderTemplate`: Phase 18's function rethrows a `SignalContextWriteError` | Finding 13, § 3.5 step 8 |
| Phase 18: one context for many renders | The unwind after each macro | Finding 15 |
| A later minor: an async render | A `Promise` refused today, as a value and as a condition, so no 0.1.0 output holds `[object Promise]` | Reading 6, § 8 q7 |
| A later minor: a new tag, such as a loop or an include | An unknown tag refused today | § 3.4 |
| A later minor: a new kind of problem | A `code` list documented as open | Reading 10 |
| A later minor: a new option | An unknown option refused today, at both functions | Reading 5 |
| A later minor: lifting a refusal of § 8 | Each is a refusal today, so lifting it is additive | § 8 |

## 4. Work breakdown

One step per session and per commit ([SR2](../standing-rules.md#sr2),
[SR34](../standing-rules.md#sr34)); the gate after each ([SR8](../standing-rules.md#sr8)); the
`code-reviewer` before each commit from step 2 on ([SR33](../standing-rules.md#sr33)). Behaviour
is written test-first ([SR13](../standing-rules.md#sr13)), and every new check gets a probe,
applied alone and read case by case ([SR15](../standing-rules.md#sr15),
[SR16](../standing-rules.md#sr16)). The existing projects' test counts do not move in any step
([SR10](../standing-rules.md#sr10)); step 1 reads the baseline from the gate.

No step times anything. Nothing in `eval-core` changes, so its performance gate is not this
plan's, and what a template costs to compile is asserted as a count of parses, which does not
move between runs (§ 1.3).

The `step` skill reads a plan's state from this table and from the last step with a recorded
**Outcome**: each step's section ends with that bullet, written in the step's own commit. Every
step's list also holds this document and the skill, whose recorded counts move with the gate's.
`eval-template`'s count starts at step 2 and is recorded in each Outcome.

| Step | Subject | Files | Ships in |
| :--- | :--- | :--- | :--- |
| 1 | This plan, its records, and the measurements | `docs/eval-template/plan.md`, `docs/eval-template/design-session.md`, `docs/README.md`, `ROADMAP.md`, `CLAUDE.md`, the skill, `docs/backlog.md` | No package |
| 2 | The project, empty and green | `modules/eval-template/` (new), `tsconfig.base.json`, `eslint.config.mjs`, `tools/release-tags.mjs`, `.claude/agents/code-reviewer.md`, `CLAUDE.md`, the root `README.md` and `CHANGELOG.md`, `tools/published-links.txt` | No package: `eval-template` is at 0.0.0 and unpublished until step 6 |
| 3 | One expression, and where a macro ends | `whole-expression.ts`, `macro-end.ts`, their specs, `macro-end.cost.spec.ts`, `package.json` and the README's `## Install` if a peer is first imported | `eval-template` 0.1.0, as internals |
| 4 | `compileTemplate` | `template-options.ts`, `scan.ts`, `compile-template.ts`, `template.ts` (the types), their specs, the barrel and its two specs, `package.json`, `README.md`, `CHANGELOG.md` | `eval-template` 0.1.0 |
| 5 | `renderTemplate` | `render-template.ts`, `template-context.ts`, `escape.ts`, their specs, `render-template.parse-count.spec.ts`, the barrel and its specs, `CHANGELOG.md` | `eval-template` 0.1.0 |
| 6 | The README, and the release commit | `modules/eval-template/README.md`, `readme-examples.spec.ts`, `CHANGELOG.md`, `package.json`, `SECURITY.md`, `CONTRIBUTING.md`, `tools/published-links.txt`, the root `README.md` and `CHANGELOG.md` | The release, `eval-template` 0.1.0 |
| 7 | The post-publish record | `docs/backlog.md`, `ROADMAP.md`, `CLAUDE.md` | No package |
| 8 | The retrospect | This document's § 9 and § 10, `docs/standing-rules.md` if a rule is promoted, `CLAUDE.md`, `ROADMAP.md` | No package |

File names under `src/lib/` are proposals until the step that writes them.

### Step 1 — This plan, its records, and the measurements

**Files**: `docs/eval-template/plan.md`, `docs/eval-template/design-session.md`, `docs/README.md`,
`ROADMAP.md`, `CLAUDE.md`, `.claude/skills/step/SKILL.md`, `docs/backlog.md`.

- Put § 8's seven readings to the maintainer at the confirmation gate, and write each answer into
  § 2 and § 8. A reading that changes is followed through § 3 and § 4 in this step's patch
  ([SR4](../standing-rules.md#sr4)).
- Check the prototype's hashes, run its scripts on the bundle the gate builds, and write any row
  that differs into § 1.3.
- Read § 2's decisions once more against the rows: a decision a row now contradicts goes back to
  the maintainer, and is not adjusted in place.
- Open the register entries § 3.7 names.
- Point `CLAUDE.md` and the `step` skill at this plan as the active one, unless the `eval-rules`
  plan is active then: one plan is active at a time, and which goes first is the maintainer's.
- Record the gate's baseline counts.

**Exit criteria**: each of § 8's readings is confirmed or changed, in the maintainer's words;
`sha256sum -c` is clean, and every row of § 1.3 has been run on the gate's bundle; doc-links is
green; the gate is green with the existing projects' counts unchanged.

**The wrong implementation** ([SR20](../standing-rules.md#sr20)): a reading recorded as confirmed
because nobody objected; and a row copied from this revision without running its script on the
gate's bundle. Each result file's second line names the bundle it ran on.

### Step 2 — The project, empty and green

**Files**: `modules/eval-template/` (`package.json`, `project.json`, `ng-package.json`,
`eslint.config.mjs`, `jest.config.ts`, the four `tsconfig` files, `README.md`, `CHANGELOG.md`,
`LICENSE`, `src/index.ts`, `src/public-api.ts`, `src/test-setup.ts`, `src/export-list.spec.ts`,
`src/public-api.spec.ts`), `tsconfig.base.json`, `eslint.config.mjs`, `tools/release-tags.mjs`,
`.claude/agents/code-reviewer.md`, `CLAUDE.md`, the root `README.md` and `CHANGELOG.md`, and
`tools/published-links.txt` if the README prints a link into the repository.

The package is at version `0.0.0` and exports one constant, so the barrel specs have something to
pin. Nothing is published. The README is a stub that passes the two README gates the barrel specs
bring: `## Install` quotes each peer with the manifest's range, and the one export is named in a
code span.

**Exit criteria**
- The gate runs one more library project than step 1's baseline, and `eval-template`'s build
  emits a `.d.ts`.
- An import of `@zvenigora/ng-eval-signals` in `modules/eval-template/src` fails lint. *Probe*:
  add one, see `@nx/enforce-module-boundaries` go red, remove it.
- `export-list.spec.ts` fails on an export it does not list. *Probe*: add an unlisted export.
- `release-tags.mjs` knows the package. *Probe*: a scratch Publication row for `eval-template`
  with no tag fails it with the missing-tag message, not with "is not a package this workspace
  publishes", which the same row gives before the map changes
  ([SR18](../standing-rules.md#sr18)). The row is not committed.
- The `@angular/core` peer is settled as § 3.6 says: lint is run once with it and once without,
  unless the `eval-rules` plan's step 2 has recorded the result, and the manifest keeps the form
  that is green. The `acorn-walk` peer is declared in the step that first imports it.

**The wrong implementation**: a project the gate does not run. `nx run-many` skips a project with
no matching target silently, so the criterion counts projects in the gate's output, not its
colour.

### Step 3 — One expression, and where a macro ends

**Files**: `src/lib/whole-expression.ts`, `src/lib/macro-end.ts`, their specs,
`src/lib/macro-end.cost.spec.ts`. Nothing is exported.

Finding 2's parse and § 3.3's search, as two internal functions, with the rule implemented as
written kept in the spec file as the oracle.

**Exit criteria**
- T1b's 28 texts, in both parser modes, each give the result its row has: the node type, the
  commas' offsets and the comments' offsets, or the problem with its offset.
  *Probe*: drop the "closes at the last token" check, and `a) + (b` goes green as an expression;
  drop the newline, and `a // c` is a problem; parse the text bare, and `{a: 1}.a` is a problem.
- **The differential rows**: for T1's 52 texts inside the rule, in both parser modes, the search
  and the oracle give the same end and the same node type, or both a problem. *Probe*: each
  source of candidates is removed alone, and the step records which rows went red; a source whose
  removal turns nothing red gets a row or goes ([SR21](../standing-rules.md#sr21)). Seen in the
  prototype, and so predicted: without the first text after the last delivered token,
  `<!-- a-- -->` and `[= a == b =]` differ from the oracle; without the first-`end` attempt these
  rows stay green and the cost rows below go red, which is what that attempt is for.
- T1's seven rows outside the rule are pinned as they are, as contrast rows: the oracle gives an
  end and the search does not, or a later one ([SR44](../standing-rules.md#sr44)). They are what
  § 8 q2 and q3 refuse, and step 4's rows are the refusals.
- **The cost rows**, by count of calls of `eval-core`'s `parse`, counted with the delegating
  barrel mock of `eval-forms`' `rules.invocation-count.spec.ts`, in a spec file of its own
  (R-finding 24): one parse for `{{ a }}`; at most 100 confirmations and one guided parse per
  window for T2's H1, H4 and H5 at n = 1,000; H5 gives the too-many-ends problem. *Probe*: replace
  the search with the oracle, and H1's count is 1,999.
- A `RangeError` from the parse is a problem, not a throw: T2's 4,000-term chain.

**The wrong implementation**: a search tested only on texts whose first `end` is the right one,
which the oracle and a first-occurrence scan both pass. The differential rows therefore include
every T1 text whose first `end` sits in a string, a template, a regular expression or a nested
bracket, and the probe that removes the guided parse must turn them red.

### Step 4 — `compileTemplate`

**Files**: `src/lib/template-options.ts`, `src/lib/scan.ts`, `src/lib/compile-template.ts`,
`src/lib/template.ts`, their specs, `src/public-api.ts`, the two barrel specs, `package.json` and
the README's `## Install` (the `acorn-walk` peer), `CHANGELOG.md` (an `[Unreleased]` line,
[SR11](../standing-rules.md#sr11)).

§ 3.2's scan and § 3.4's problems, and the compiled tree: text, value macros, `#if` with its
branches, `#switch` with its cases. Each expression is compiled once, with `eval-core`'s
`compile`.

**Exit criteria**
- T3's 65 templates each compile or give the problems their rows have, by `code` and `offset`,
  with two changes from the prototype, both finding 18's: `{{#if}}x{{/if}}` gives one problem, and
  `{{ Q1:1 + 1 }}` with the option off gives a message that names `colonIdentifiers`.
- Every problem row asserts its `code`, its `offset` and its message
  ([SR18](../standing-rules.md#sr18)), and beside each is the nearest valid template, which
  compiles.
- Each refusal of § 3.4 has a row, and each option a leg: both delimiters set, `colonIdentifiers`
  on and off, each nesting option on and off ([SR19](../standing-rules.md#sr19)).
  `caseInsensitive` changes nothing at compile time, and a row says so: `{{#IF a}}` is an unknown
  tag under it (Q39).
- What `compileTemplate` throws for: an unknown option, `onError` among them, since that is
  `renderTemplate`'s; each refused delimiter, with the message naming the option.
- § 8 q5's three bounds each have a row at the bound and one past it.
- The public types compile through the barrel: `public-api.spec.ts` imports each
  ([SR9](../standing-rules.md#sr9)).

**The wrong implementation**: a scan that stops at the first problem, which passes every
one-problem row. The row `{{ a + }} {{#IF}} {{/if}} {{ b` has four, and asserts all four in
order. And a scan that reads a tag name before skipping whitespace, which passes every row
written without spaces: `{{ #if a }}yes{{ /if }}` is a row.

### Step 5 — `renderTemplate`

**Files**: `src/lib/render-template.ts`, `src/lib/template-context.ts`, `src/lib/escape.ts`, their
specs, `src/lib/render-template.parse-count.spec.ts`, `src/public-api.ts` and its specs,
`CHANGELOG.md`.

§ 3.5, in its order.

**Exit criteria**
- T4a's values each print what their row has, under `html`, `text` and `#raw`. A function is a
  failure if § 8 q4 stands.
- T4b's 14 templates give their rows under each of the four policies. The `'throw'` row asserts
  the error by identity, with `toBe` against the object the host function threw
  ([SR41](../standing-rules.md#sr41)); that the walk passes it through unchanged is a prediction
  until that row runs. The function-policy rows assert the errors seen, in order, and that the
  returned value appears nowhere in the output.
- An untaken branch is not evaluated: a call counter stays at 0. *Probe*: evaluate every branch
  and print the taken one.
- A value is inserted once: T4a's `{{ secret }}` row, with `secret` in the context.
- **Writes** (§ 8 q1): T4c's 17 forms in both case modes, over a plain object and over a
  `Registry`, each asserting the caller's own object beside the result
  ([SR19](../standing-rules.md#sr19)). A contrast row pins a caller's own `EvalContext` with no
  policy, where `x = 5` lands ([SR40](../standing-rules.md#sr40),
  [SR44](../standing-rules.md#sr44)). A refused write is a failure like any other: it prints
  `onErrorPrint` under a containing policy and leaves `renderTemplate` under `'throw'`, and a row
  whose right side is a call shows the call ran ([SR46](../standing-rules.md#sr46)).
- **Context shapes** (§ 8 q6): T4d's eight shapes under a template compiled in each mode, with the
  mode check. The mismatched stores and the null-prototype object throw, with a message.
- **The unwind**: T4e's stranded scope, over one context rendered twice. *Probe*: remove the
  unwind, and the first render prints `stranded`.
- **A caller's context is read through**: T4g's lookup rows.
- **Rendering never parses**: a count of `parse` and `compile` calls across two renders of one
  compiled template is 0, in a spec file of its own.
- Escaping: T4f's rows, and a row for each of the five characters alone.
- What `renderTemplate` throws for: each bad option of § 3.5 step 1.

**The wrong implementation**: `onErrorPrint` appended where the failure happened, with the block
then rendered on. It passes every row whose failed block has no later branch. The rows
`A{{#if a == 2}}yes{{#elseif boom()}}mid{{#else}}no{{/if}}B` and
`A{{#switch a}}{{#case 2, boom()}}x{{#default}}d{{/switch}}B` each have one, and each asserts the
whole output. And an unwind once per render instead of once per macro, which passes a row that
renders twice: T4e's template reads the stranded name in the same render.

### Step 6 — The README, and the release commit

**Files**: `modules/eval-template/README.md`, `src/lib/readme-examples.spec.ts`, `CHANGELOG.md`,
`package.json`, `SECURITY.md`, `CONTRIBUTING.md`, `tools/published-links.txt`, the root
`README.md` and `CHANGELOG.md`.

The README by the order the other packages use. Its limits, each stated as what every path keeps
([SR44](../standing-rules.md#sr44)) and scoped to the fixture its witnesses run
([SR45](../standing-rules.md#sr45)):

- An Angular build is required (reading 4).
- Escaping guards against data, not against the author; the result is for `[innerHTML]`, where
  Angular sanitizes it; sanitized HTML still carries a value to another server in a URL; escaping
  does not make `href="{{url}}"` safe (design § 2.6, finding 17).
- What a template can and cannot write, by context shape (§ 3.5).
- Evaluation time and memory are not bounded, and compile work is, by three figures (§ 8 q5).
- Under `caseInsensitive` a plain context is copied on each render, and the copy holds own
  enumerable properties only ([A57](../backlog.md#a57)).
- A `Date` prints in the local time zone; an unknown name prints `''`.

**Exit criteria**: every fenced example runs in `readme-examples.spec.ts`, strong enough that the
wrong implementation of its claim fails it ([SR30](../standing-rules.md#sr30)); a claim → witness
table for every sentence of the README, the CHANGELOG entry and `SECURITY.md`'s change
([SR21](../standing-rules.md#sr21)); each line under the dated heading is checked again under
SR45; § 3.8's rows are read against the built `.d.ts`; `CONTRIBUTING.md`'s Releasing is followed
for a first release.

**The wrong implementation**: a README sentence true of a plain object and false of a caller's
`EvalContext`, on writes or on case. Both paths are documented entry paths
([SR40](../standing-rules.md#sr40)), and each sentence names the one it is about.

### Step 7 — The post-publish record

The Publication status row with its annotated tag, the roadmap's Phase 17 row, and `CLAUDE.md`'s
package list.

### Step 8 — The retrospect

§ 9 and § 10: the contract after it landed, each P-1 use and whether it stood, each prediction
that missed, and the rules that stand ([SR7](../standing-rules.md#sr7)).

## 5. Public API surface added

All from `@zvenigora/ng-eval-template`. Names are proposals until step 4 writes them; from 0.1.0
their shapes are bound ([SR12](../standing-rules.md#sr12)). A result and a problem are objects a
consumer reads and does not build, and the README says so.

| Symbol | Kind | Step |
| :--- | :--- | :--- |
| `compileTemplate`, `CompileTemplateOptions`, `CompileTemplateResult`, `CompiledTemplate`, `TemplateProblem` | Function and types | 4 |
| `renderTemplate`, `RenderTemplateOptions`, `TemplateErrorPolicy` | Function and types | 5 |

Shapes § 2 has fixed:

- `CompileTemplateOptions` holds `start`, `end`, `output`, `nestedBlocks`, `nestedValues`,
  `colonIdentifiers` and `caseInsensitive`. Any other key throws.
- `compileTemplate` returns a `CompileTemplateResult`: the compiled template and no problem, or no
  template and at least one problem.
- A `TemplateProblem` is `{ code, offset, message }`, its `code` from a list documented as open.
- A `CompiledTemplate` is a handle with no public field.
- `RenderTemplateOptions` holds `onError` and `onErrorPrint`. Any other key throws.
- `TemplateErrorPolicy` is `'throw' | 'undefined' | ((error: unknown) => unknown)`.

Left to step 4, which writes the types: the field that tells the two forms of a
`CompileTemplateResult` apart, which follows the `eval-rules` plan's `CompileRuleResult` if that
has been written, and the spelling of each `code`. The step's gate shows both before they are
exported.

## 6. Verification gates

The gate of [SR8](../standing-rules.md#sr8), unfiltered, after every step. A green `test` is not a
type-check ([SR9](../standing-rules.md#sr9)): the specs' use of the public types is compiled by
`build` only through the barrel.

## 7. Risks

| Risk | What goes red |
| :--- | :--- |
| The search ends a macro somewhere the rule does not | Step 3's differential rows, against the oracle |
| The argument of § 3.3 misses a case no T1 text has | Nothing. The differential rows are the texts someone thought of; a text found later is a row added, and a patch if the search is late on it. The search cannot accept a text the rule refuses, since every end is confirmed |
| A hostile template makes compile slow | Step 3's cost rows, by parse count; step 4's rows at each bound |
| An engine error leaves `compileTemplate` as a throw | Step 3's and step 4's `RangeError` rows. An error of a kind no row has would leave it: `compileTemplate` converts the kinds it names, not every throw |
| A write reaches the host's object through a path T4c did not list | Step 5's 17 forms; a path with no row is a gap, recorded |
| A caller takes the write refusal to cover their own `EvalContext` | Step 5's contrast row, and the README sentence scoped to it |
| A host forgets `colonIdentifiers` | Step 4's hint row |
| A host passes a store built in the other case mode | Step 5's two throw rows |
| A host expects `{{numberName}}` to print something | Step 5's function row: a failure, with a message that says a call was probably meant |
| A value is read again as template text | Step 5's `{{ secret }}` row |
| A shape published in 0.1.0 cannot carry what Phase 18 needs | Nothing in the gate. Held by § 3.8, read at step 1's gate and in step 6 |
| `eval-core`'s wrapped parse changes what it accepts in a later minor | Step 3's T1b rows, which run on the workspace `eval-core`; the peer range is bounded above |
| A consumer imports the package in plain Node | Nothing in the gate. The import throws `eval-core`'s JIT message, and the README states the requirement |
| A shipped sentence wider than its witnesses | Held by review, [SR45](../standing-rules.md#sr45) |

## 8. Questions

Seven readings, each made by P-1 on a point the sessions did not ask and a measurement raised.
**None is decided.** Step 1's gate puts each to the maintainer, and its answer replaces the
reading here. Each says what the looser reading would be, since lifting one later is additive and
adding one later is not.

1. **Writes.** Over a plain object or a `Registry`, `renderTemplate` builds a context that refuses
   an identifier write and a member write, by the two overrides `eval-signals` uses (finding 10).
   A caller's own `EvalContext` keeps the policy the caller gave it. The looser reading leaves a
   plain context writable, as `eval-core` does by default: then `{{ user.role = 'admin' }}` in a
   template from an end user changes the host's object. *Reading*: refuse (P-1).
2. **`end`'s first character.** `end` may not start with a letter, a digit, `_`, `$`, `.`, `:` or
   a character outside ASCII (finding 6). With such an `end` the rule ends a macro inside a name
   or a number, `{{ max}` under `x}`, and the search of § 3.3 is not the rule's answer. The looser
   reading admits any `end` and pays for it with a fallback to the rule as written, bounded by
   § 8 q5. *Reading*: refuse, by a throw, since the option is the host's (P-1).
3. **A comment in a macro.** `{{ a /* note */ }}` and `{{ a // note }}` are compile problems
   (finding 6). Under the rule, `{{ a // note }} more }}` ends at the first `}}`, inside the
   comment, which no author means. Design § 2.5 leaves template comments out; this is JavaScript's
   own comment inside an expression. *Reading*: a problem (P-1).
4. **A function as a value.** `{{numberName}}`, with the call forgotten, prints the host
   function's source text under reading 6's `String(value)` (finding 11). *Reading*: a function is
   a failure, like a `Promise`, with a message that names the macro (P-1). As a condition a
   function stays what JavaScript makes it, truthy.
5. **Three bounds, each 100**: problems reported by one compile, candidate ends tried in one tag,
   and blocks nested inside one another (findings 7 and 8). Past each, a problem. None is an
   option in 0.1.0. The first qualifies Q19's "every problem at once" for a text with more than
   100. *Reading*: fixed bounds (P-1); a figure the maintainer prefers replaces 100.
6. **A context the template cannot be read against.** `renderTemplate` throws for a `Registry` or
   an `EvalContext` whose `caseInsensitive` is not the template's, and for an object `eval-core`
   does not read, a null-prototype one among them (finding 14). The looser reading renders them:
   the first prints `''` for some names and a value for others, and the second prints `''` for
   every name. *Reading*: throw (P-1).
7. **A `Promise` as a condition.** Reading 6 makes a `Promise` value a failure. A `Promise` as an
   `#if` condition, a `#switch` subject or a `#case` value is a failure too, and its block prints
   `onErrorPrint` (finding 13). The looser reading is JavaScript's: truthy, and never `===` to a
   case. *Reading*: a failure (P-1), so an async render can await it later.

Not a reading, and not this plan's: **the order among Phases 12, 17 and 18.**

## 9. Contract after this lands

Written by step 8.

## 10. Retrospect

Written by step 8.
