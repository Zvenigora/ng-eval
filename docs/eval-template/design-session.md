# `eval-template` — design sessions 1 and 2: questionnaire and outputs

The result of two grilling sessions. The first, on 2026-11-12, began as a request to extend
`eval-forms` and ended as a new library, `@zvenigora/ng-eval-template`: text with expression macros
in it, each macro evaluated by `@zvenigora/ng-eval-core`. The second, on 2026-11-13, asked what the
first had left unasked, Q34 to Q45, before a plan was written. It is **not a plan** and nothing here
is built. It is the record to review, and the input to Phase 17's plan,
[`plan.md`](plan.md), and to Phase 18's in [`ROADMAP.md`](../../ROADMAP.md).

- "Settled" means the maintainer answered the question. "Reading" means this record's own reading
  of a point no question asked, which the maintainer confirmed in one block at the end of its
  session. Review the readings first.
- A statement here about how `eval-core` or Angular behaves is a row of
  [§ 5](#5-facts-found-about-the-existing-code), or it says it was not verified.
- Session 2 revised one answer of session 1, Q22, and § 2 is written to the answers as they now
  stand. Where an answer was revised, the questionnaire says by which question.
- The form follows the `eval-rules` record,
  [`docs/eval-rules/design-session.md`](../eval-rules/design-session.md).

## 1. What was asked, and what it became

The request was to extend `eval-forms` with "dynamic" expressions, with a `SafeHtml` pipe over
Angular's `DomSanitizer` as one option, and to look at styling. **"Dynamic" means the expression's
source is a database or an API, and its text is unknown at compile time** (Q1). That is the case
all three published packages are built for, so it asks nothing new of the expression language.

| Asked | Found | Became |
| :--- | :--- | :--- |
| Any expression `eval-core` supports, as a form rule | Already so. A rule is any expression `eval-core` evaluates, less what `guardIdentifiers` refuses. What is fixed is the property list: `visible` and `text` at both adapters, `disabled` at `/signals` | No change to what an expression may say |
| A `SafeHtml` pipe | `[innerHTML]` sanitizes every string it is given. A pipe over `bypassSecurityTrustHtml` turns that off for strings the README says may come from an API or an end user; a pipe over `sanitize()` repeats the binding | No pipe and no `DomSanitizer` (Q3) |
| HTML driven by expressions | An `html` property would have `text`'s coercion, so it is `text` under another name | A template language: text with macros, as its own package (Q9, Q12) |
| Styling | A class name picks from the host's stylesheet; a style value can overlay the page or carry a form value in a `url(…)` | `class` unrestricted, `style` behind an allow-list, in `eval-forms` (Q5) |

## 2. The design as agreed — Phase 17, `@zvenigora/ng-eval-template` 0.1.0

### 2.1 The package

`modules/eval-template`, a stand-alone library depending on `eval-core` only (Q6). Plain functions,
no Angular DI, no signal and no `eval-signals` peer (Q12, Q25, Q26).

- **`compileTemplate(text, options)`** returns a value that holds the compiled template, or every
  problem at once. A problem is `{ code, offset, message }`, its `code` from a list documented as
  open. It does not throw for a bad template (Q19, reading 10). It throws for an option it does not
  define and for a delimiter it refuses, since the options are the host's (reading 5).
- **`renderTemplate(compiled, context, options)`** returns a string. The context is what
  `eval-core` takes, the host's functions included. The options carry `onError` and `onErrorPrint`
  and nothing else (Q25, Q43, reading 5).
- The compiled template is a handle with no public field (reading 10).
- Rendering never parses, so a template that compiled cannot fail on syntax later.

Like the other packages, 0.1.0 requires an Angular build and promises nothing about plain Node
(reading 4), for the reason Phase 12's plan measured.

### 2.2 The syntax

A template is text with tags. A tag starts with the `start` delimiter and ends with the `end`
delimiter.

```
{{count}} {{item}}{{#if count != 1}}s{{/if}}
{{numberName(count, language)}} pen{{#if count != 1}}s{{/if}}
{{#if count == 1}}one pen{{#elseif count == 0}}none{{#else}}{{count}} pens{{/if}}
{{#switch status}}{{#case 'new'}}New{{#case 'done', 'closed'}}Closed{{#default}}Unknown{{/switch}}
[=#if vip]<b>Gold</b>[=#else]Standard[=/if]
```

- **Delimiters** come from the options: `start` and `end`, both non-empty and different from each
  other, by default `{{` and `}}` (Q16). Neither holds whitespace or a backslash (reading 5).
- **Backslashes directly before `start`** (Q16, Q38): each pair prints one backslash, and an odd one
  left over escapes the delimiter. So `\{{x}}` prints `{{x}}`, and `\\{{x}}` prints `\` and then the
  value. A backslash anywhere else is text.
- **A value macro** is `{{expr}}`: one `eval-core` expression, printed. **`{{#raw expr}}`** prints
  it without escaping, and is always available (Q23).
- **Blocks** are `#if` / `#elseif` / `#else` / `/if` and `#switch` / `#case` / `#default` /
  `/switch`. The marks `#` and `/` are fixed (Q9, Q16). The `#` is what tells `{{#raw x}}` from a
  variable named `raw`.
- **Tag names are lowercase under every option**: `{{#IF a}}` is an unknown tag, with
  `caseInsensitive` too (Q39).
- **A tag that starts with `/` is a close tag**, so an expression that starts with a regular
  expression needs parentheses: `{{ (/ab/).test(x) }}` (reading 9).
- **A branch is template text**, so HTML in a branch needs no quoting and a macro in a branch is
  an ordinary macro.
- **Whitespace inside a tag is ignored**: `{{ #if a }}` is `{{#if a}}` (Q32).

Two levels decide where things end (Q29, Q34):

- **A macro ends at the first `end` before which the text is one whole expression.** So
  `{{ '}}' }}`, `{{ {a: {b: 1}}.a.b }}` and `[= list[0] ]` work: the text before the first `}}` or
  `]` in each is not an expression, and the next one is tried. Session 1 had the expression parser
  find the end, with `end` required after it (Q22). Measured, that fails for every macro when `end`
  starts with an operator character, `%>`, `?>`, `-->`, `>>`, `=]` or `|`, since the parser reads
  the delimiter as an operator; both rules give the same end on the examples above
  ([§ 5](#5-facts-found-about-the-existing-code)).
- **Across tags, blocks are matched by a stack**, as brackets are in arithmetic: each `/if` closes
  the nearest open `#if`. Delimiters never sit inside each other; what nests is blocks.

Compile problems (Q19, Q29, Q31, Q32): an expression that does not parse, a `start` that is never
closed, an empty macro `{{ }}`, an unknown tag, a close with no open, an open with no close, an
`#else` or `#case` outside its block, and a nesting the options have turned off. An `end` delimiter
in plain text is text, not a problem: with `[=` and `]`, every `]` in ordinary text would otherwise
fail.

Session 2 added these compile problems:

- **A top-level comma outside `#case`** (Q35): `{{a, b}}`, and the same in `#raw`, `#if`, `#elseif`
  and `#switch`. In `#case` a top-level comma separates the values, and `('a', 'b')` in parentheses
  is one value, JavaScript's.
- **A block out of shape** (Q40): anything but whitespace between `#switch` and its first `#case`
  or `#default`, and that whitespace prints nothing; a `#case` after `#default`, a second
  `#default`, or a `#switch` with neither; an `#elseif` after `#else`, or a second `#else`; text
  after the name in `#else`, `#default`, `/if` or `/switch`; no expression in `#if`, `#elseif`,
  `#switch`, `#case` or `#raw`.
- **What a macro may not hold** (reading 7): a statement anywhere, a block-bodied arrow function's
  body included; an `await`; an `async` function; an `import()`. Each has a message of its own.
- **An identifier that names a member of `Object.prototype`**, such as `toString` or `constructor`,
  as in `eval-forms` (reading 8).

### 2.3 The semantics

- **Every expression is `eval-core`'s.** Each is parsed once at compile time and evaluated at
  render time by the walk that evaluates any other expression, with the same protections and
  limits. The package has no evaluator of its own.
- **A macro is one expression**: no statements, and no `await` in 0.1.0 (Q20).
- **`#if` and `#elseif` test JavaScript truthiness**, as `visible` does, so the string `'false'`
  is true (Q18).
- **`#case` compares with `===`**, takes one or more values, and the first match wins with no
  fall-through (Q18). Its values are expressions, evaluated in order until one matches (reading 1).
- **No matching branch prints `''`** (Q18). An untaken branch is not evaluated (Q13).
- **`null` and `undefined` print `''`**; `0` prints `0` and `false` prints `false` (Q11). Every
  other value prints as `String(value)` (reading 6). The package carries its own copy of this rule,
  since it cannot depend on `eval-forms`, whose `toText` states it (reading 3).
- **A value that is a `Promise` is a failure**, not the text `[object Promise]`, so an async render
  stays additive (reading 6).
- **A failure goes to `onError`, per macro** (Q11, Q36). `onError` is `'throw'`, `'undefined'` or
  a function, the shape of `eval-forms`' `ExpressionErrorPolicy`, exported under this package's own
  name, and `'undefined'` is the default. Under `'throw'` the render throws the error. Under the
  other two the failure is contained, and the rest renders.
- **A contained failure prints `onErrorPrint`** (Q37, Q43, Q44): a string option of
  `renderTemplate`, `''` by default, printed as written and not escaped, since it is the host's
  text. A failed value macro prints it in the macro's place. A block whose `#if` or `#elseif`
  condition, `#switch` subject or `#case` value fails prints it once in place of the whole block,
  and no branch of that block is tried.
- **A function policy observes** (Q45): it is called with each error, and what it returns is not
  printed.
- **Output is escaped by default** (Q10, Q27). With `output: 'html'`, the default, the five
  characters `&`, `<`, `>`, `"` and `'` are escaped in a value, so it is also safe inside a quoted
  attribute. With `output: 'text'` nothing is escaped, and `{{#raw x}}` prints what `{{x}}` prints
  (reading 2). The template's own text passes through as written in both.
- **Nesting is by structure only** (Q8, Q14). A value is inserted once and never read as template
  text: if `item` holds the characters `{{ secret }}`, they print as characters. A string literal
  inside an expression is not template text either; the author writes a template literal or a
  block.

### 2.4 The options

`compileTemplate`'s, carried by the compiled template (reading 5):

| Option | Default | What it does |
| :--- | :--- | :--- |
| `start`, `end` | `{{`, `}}` | The delimiters (Q16) |
| `output` | `'html'` | `'html'` escapes values; `'text'` escapes nothing (Q10) |
| `nestedBlocks` | `false` | Allows a block inside another block's branch (Q24, Q30) |
| `nestedValues` | `true` | Allows a value macro, `{{x}}` or `{{#raw x}}`, inside a branch (Q24, Q30) |
| `colonIdentifiers` | `false` | As in `eval-core` and both siblings (Q20) |
| `caseInsensitive` | `false` | As in `eval-core`, for the names an expression reads (Q20) |

A template that uses a nesting while its option is off gets a compile problem, never a silent
literal.

`renderTemplate`'s:

| Option | Default | What it does |
| :--- | :--- | :--- |
| `onError` | `'undefined'` | `'throw'`, `'undefined'`, or a function called with each error (Q36, Q45) |
| `onErrorPrint` | `''` | What a contained failure prints, as written (Q43, Q44) |

### 2.5 Left out of 0.1.0

Each is additive later, since an unknown tag is a compile problem today (Q15, Q20):

- Named macros, such as an `#include` of a fragment defined once. A host function does the job
  meanwhile, as `numberName` does.
- Loops. `items.map(i => i.name).join(', ')` works in a macro today.
- Statements in a macro, and `await`.
- Pipes such as `x | upper`, whitespace trimming, and comments.
- An `if … then … elseif … else` expression grammar. It is not JavaScript, so it needs an acorn
  plugin, as colon-joined names did; the maintainer may add it in a later phase (Q9).

### 2.6 Security

- **The template's author is the least trusted the READMEs name**: a string from an API or an end
  user (Q2).
- **Escaping guards against data, not against the author.** An author can type any markup into the
  template text, so no option forbids `#raw` (Q23).
- **The result is bound to `[innerHTML]`, where Angular sanitizes it** (Q3). The library bypasses
  nothing and imports nothing from `@angular/platform-browser`.
- **Sanitized HTML still leaks data**: the sanitizer keeps `<img src>`, so a template can put a
  value in a URL another server receives. The README states it as a limit.
- **Escaping does not make `href="{{url}}"` safe** against a `javascript:` URL; the sanitizer
  handles that at the binding, and the README says so (Q27).

## 3. Phase 18 — an `eval-forms` minor

Recorded as agreed, and designed when the phase starts (Q21):

- A template property at both adapters, as one `EvalSignal<string>` per template: parsed once, and
  recomputed when a value a macro actually read changes (Q13, Q26).
- A `class` property, which normalizes a string, an array or a `{ name: boolean }` object to a
  class list, with no restriction (Q5).
- A `style` property, which normalizes an object to a map of property to string, behind an
  allow-list of property names that the host supplies and that is empty by default (Q5).
- Both coercions live in the shared core, so one rule string means the same thing at both adapters.

## 4. The questionnaire

| Q | Subject | Answer | State |
| :--- | :--- | :--- | :--- |
| Q1 | What "dynamic" means | The expression's source is a database or an API, unknown at compile time. The expression language is unchanged | Settled, on 2026-11-13 |
| Q2 | Who writes the rules | Design for the least trusted author | Settled |
| Q3 | The `SafeHtml` pipe | Dropped, with `DomSanitizer`; the string is bound to `[innerHTML]` | Settled |
| Q4 | Generic named properties in place of an `html` property | Replaced by the template language | Superseded by Q9 |
| Q5 | Styling | `class` unrestricted; `style` behind an allow-list | Settled |
| Q6 | Both adapters, one release | The new library stands alone, depending on `eval-core` only. `eval-forms` takes it as a dependency in Phase 18, at both adapters, and the library never depends on `eval-forms` | Settled, on 2026-11-13, with Q21 |
| Q7 | Where it sits against Phase 12 | A new roadmap item; Phase 12 untouched | Settled, as Q21 |
| Q8 | What "nested" means | Macros inside macros, by structure | Revised by Q14 |
| Q9 | Condition syntax | Block tags; an acorn plugin for `if … then` possibly later | Settled |
| Q10 | Escaping | Escaped by default; raw per macro; a plain-text output | Settled |
| Q11 | Empty and failing macros | `null` and `undefined` print `''`; a throw goes to `onError`, per macro | Settled |
| Q12 | Where it lives | A new package of plain functions | Settled |
| Q13 | One signal per template | Yes, downstream; an untaken branch is not evaluated | Settled |
| Q14 | Nesting pinned on the examples | By structure, to any depth; never a string literal or a value; behind an option, off by default | Settled, with Q24 and Q30 |
| Q15 | Named macros | Left out of the first release | Settled |
| Q16 | Delimiters | From options, non-empty and different; `#` and `/` fixed; a backslash escapes `start` | Settled; its third part is Q22 |
| Q17 | Raw output | See Q23 | Settled, as Q23 |
| Q18 | `if` and `switch` | Truthiness; `===`, first match, no fall-through; no match prints `''` | Settled |
| Q19 | Compile errors | Every problem at once, each with its offset | Settled |
| Q20 | Options and scope | `colonIdentifiers` and `caseInsensitive` in; loops, statements, pipes and `await` out | Settled |
| Q21 | The roadmap items | Phase 17, the package; Phase 18, the `eval-forms` minor | Settled |
| Q22 | Where a macro ends | Where its expression ends, by the parser | Revised by Q34 |
| Q23 | Raw output, explained | `{{#raw expr}}`, always available | Settled |
| Q24 | What a nesting option refuses | A block in a block; a value macro in a branch has an option of its own, on by default | Settled |
| Q25 | The API | `compileTemplate` and `renderTemplate`, plain functions | Settled |
| Q26 | No signal in Phase 17 | The reactive form arrives with Phase 18 | Settled |
| Q27 | What is escaped | `&`, `<`, `>`, `"` and `'` | Settled |
| Q28 | A possible `eval-core` minor | Accepted, if parsing at an offset needs a new export | Settled |
| Q29 | Two levels | The parser inside a tag; a stack across tags; `#` stays | Settled |
| Q30 | The nesting options | `nestedBlocks`, default `false`; `nestedValues`, default `true` | Settled |
| Q31 | A stray `end` in text | Text; a stray `start` is a problem | Settled |
| Q32 | Empty and spaced tags | `{{ }}` is a problem; whitespace in a tag is ignored | Settled |
| Q33 | Recording it | This document and the roadmap entries; no plan, no code | Settled |
| — | Reading 1 | A `#case` value is an expression, evaluated in order until one matches | Reading |
| — | Reading 2 | With `output: 'text'`, `{{#raw x}}` prints what `{{x}}` prints | Reading |
| — | Reading 3 | The package carries its own copy of the `null` and `undefined` rule | Reading |
| — | Reading 4 | 0.1.0 requires an Angular build and promises nothing about plain Node | Reading |

The maintainer also asked whether the expressions in a template are evaluated by `eval-core`. They
are, all of them; [§ 2.3](#23-the-semantics) opens on it.

Session 2, on 2026-11-13. Q34 to Q42 were one round, and Q43 to Q45 a second, asked because the
answer to Q37 named an option the round had not proposed.

| Q | Subject | Answer | State |
| :--- | :--- | :--- | :--- |
| Q34 | Where a macro ends, when `end` starts with an operator | At the first `end` before which the text is one whole expression. The alternative kept Q22 and refused such an `end` | Settled; revises Q22 |
| Q35 | Commas | In `#case` a top-level comma separates the values, and a parenthesized `('a', 'b')` is one value. Anywhere else a top-level comma is a compile problem | Settled |
| Q36 | `onError`'s type | The package exports its own type with the shape of `eval-forms`' `ExpressionErrorPolicy`; `'undefined'` is the default | Settled |
| Q37 | A condition that throws | The whole block prints one text, by an option the maintainer named, `onErrorPrint`. The recommendation, that the policy's result stands in for the value and the next branch is tried, was declined | Settled, as Q43 to Q45 |
| Q38 | Backslashes before `start` | Each pair prints one backslash; an odd one left over escapes the delimiter; a backslash elsewhere is text | Settled |
| Q39 | Tag names under `caseInsensitive` | Lowercase under every option; `{{#IF a}}` is an unknown tag | Settled |
| Q40 | Block structure | Four groups of compile problems, listed in [§ 2.2](#22-the-syntax) | Settled |
| Q41 | Readings 5 to 10 | Confirmed in one block | Settled |
| Q42 | Recording it, and the plan | This record's session 2, and [`plan.md`](plan.md) in the form of Phase 12's, measured on the built bundle. The order among Phases 12, 17 and 18 stays open, and nothing is committed | Settled |
| Q43 | What `onErrorPrint` is | A string option, `''` by default. A block whose condition, subject or `#case` value fails prints it once in place of the whole block, and no branch is tried. The alternative made it opt-in | Settled |
| Q44 | `onErrorPrint` and a value macro | It replaces a failed value macro too, and is printed as written, not escaped | Settled |
| Q45 | A function policy's return value | Ignored: the function observes each error, and `onErrorPrint` decides what prints | Settled |
| — | Reading 5 | All six options of [§ 2.4](#24-the-options) are `compileTemplate`'s, and the compiled template carries them; `renderTemplate`'s options hold the error options only. An unknown option or a bad delimiter throws. A delimiter holds no whitespace and no backslash | Reading |
| — | Reading 6 | A value prints as `String(value)`; a value that is a `Promise` is a failure | Reading |
| — | Reading 7 | A macro holds no statement anywhere, no `await`, no `async` function and no `import()`; each is a compile problem with a message of its own. This is stricter than `eval-forms`, which accepts a block-bodied arrow function in a rule | Reading |
| — | Reading 8 | An identifier that names a member of `Object.prototype` is a compile problem, as in `eval-forms` | Reading |
| — | Reading 9 | A tag that starts with `/` is a close tag, so an expression that starts with a regular expression needs parentheses | Reading |
| — | Reading 10 | `compileTemplate` returns a value holding the compiled template or the problems; a problem is `{ code, offset, message }`, its `code` from an open list; the compiled template is a handle with no public field | Reading |

## 5. Facts found about the existing code

Read on 2026-11-12, at the commit that wrote this file.

- `eval-forms` publishes `visible` and `text` at `/reactive`, and `visible`, `text` and `disabled`
  at `/signals`. `text` is `String(value)` with `null` and `undefined` mapped to `''`.
- No package of the workspace publishes a pipe, a directive or a component, and none declares
  `@angular/platform-browser` as a peer.
- In the installed `@angular/core` 22.2.3, the HTML sanitizer's allow-lists hold the `img` element
  and the `src` and `class` attributes, and do not hold the `style` attribute.
- `eval-core` evaluates `ConditionalExpression` and `TemplateLiteral`, and `IfStatement` as a
  statement. It rejects `SwitchStatement` with `Unsupported statement type: SwitchStatement`.
- `eval-core`'s `parse` hands the whole string to acorn's `parse`, through its own parser subclass
  under `colonIdentifiers`. Nothing in it parses one expression at an offset.
- Not verified: that Angular applies no sanitizer to a style binding. Q5's allow-list does not rest
  on it, and Phase 18's plan measures it.

Run on 2026-11-13, for session 2's Q34, on the installed acorn 8.18.0 alone, not on the `eval-core`
bundle and not under `colonIdentifiers`:

- Over 27 texts, acorn's `parseExpressionAt` with `end` required after the expression gave
  `Unexpected token` for each of `<% a %>`, `<% a % b %>`, `<? a ?>`, `<!-- a -->`, `[= a =]`,
  `<< a >>` and `| a |`. Taking each `end` in turn, the first before which the text is one whole
  expression, gave the expression for each of the seven.
- The two rules gave the same answer on the other texts, `{{ '}}' }}`, `{{ {a: {b: 1}}.a.b }}` and
  `[= list[0] ]` among them.

The plan's [§ 1.3](plan.md#13-mechanism-questions-measured) runs the question again on the bundle,
in both parser modes, from a pinned file; that row replaces this one.

## 6. What the plans measure and decide

Session 1 left nine points for the plans. Session 2 and Phase 17's plan took them up:

| # | Point | Where it went |
| :--- | :--- | :--- |
| 1 | Parsing at an offset (Q22, Q28) | Q34 changed the rule. The plan measures the mechanism, and finds that `eval-core` has to export nothing |
| 2 | A `#case` with several values | Q35 |
| 3 | `onError`'s type | Q36, Q45 |
| 4 | A literal backslash before a macro | Q38 |
| 5 | Tag names under `caseInsensitive` | Q39 |
| 6 | How a statement in a macro is refused | Reading 7; the messages are the plan's |
| 7 | A reused context, and the scope-stack unwind | The plan, measured |
| 8 | The order among Phases 12, 17 and 18 | The maintainer's, and open |
| 9 | Register entries for what [§ 2.5](#25-left-out-of-010) leaves out | Written when Phase 17's step 1 runs, as Phase 12 does for its own |

What session 2 did not ask, and the plan's measurements raised, is the plan's
[§ 8](plan.md#8-questions): seven readings it makes by its rule P-1, each for the maintainer to
confirm at its step 1's gate.
