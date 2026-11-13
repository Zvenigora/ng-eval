# `eval-rules` — design sessions 1 to 3: questionnaire and outputs

The result of three grilling sessions on a new library, `@zvenigora/ng-eval-rules`: a rule engine over
`@zvenigora/ng-eval-core`, for rules stored as JSON and evaluated as dynamic expressions. It is
**not a plan** and nothing here is built. It is the record to review, and the input to a further
session that challenges it ([§ 6](#6-what-the-next-session-should-challenge)).

- "Settled" means the maintainer answered it. "Default" means the maintainer accepted the
  recommendation in one block ("rest: yes" in session 1, "approved" in session 2), so it was agreed
  but not individually discussed. Review defaults first.
- The starting point is an earlier, application-specific rule engine, bound to one state store and
  one domain. Nothing of it is reproduced here; this library is generic and extendable.
- Session 2 changed the effect model ([§ 2.2](#22-evaluate-then-commit)). Where a session-1 answer
  was revised, the questionnaire says by which question.

## 1. What an application-specific engine does, and what this one must change

| Application-specific engine | This engine |
| :--- | :--- |
| One fixed record per rule, with no composition | A rule is a fixed pipeline, but rules compose into rule sets and workflows |
| Closed enumerations of action, service and source kinds | Open registries: node kinds, host functions, effect functions; event names are host strings |
| A state store bound in three places: its action stream as the trigger, its state as the facts, its actions as the effects | Three ports: events, facts, sink ([§ 2.3](#23-the-three-ports)) |
| Effects are records, collected and dispatched after evaluation | Kept: evaluate, then commit |
| One state snapshot per event; all rules evaluated against it | Kept for a rule set; a `sequence` commits between nodes |
| An emitted action re-enters the engine, with no bound | A queue, one run at a time, and a loop guard |
| Rules independent; no order, chain or tree | `sequence`, `branch`, nested workflows |
| Executions chained with `&&` (a falsy call skips the rest) | One effect item per call, in array order |
| An order field on every item | Array order is the order |
| Fields typed as a boolean or a string, expression or constant by convention | Every expression field is a string; no marker |
| Tests embedded in the rule | Tests stored beside it; a test never commits |
| No cache | Compiled rules cached by id, reused only for the same text or version |

## 2. The design as agreed

### 2.1 A rule

`triggers` and `filter` decide whether the rule runs. Then its sections run in this fixed order,
each an ordered list:

`calculations → decisions → outputs`, with `onInit` separately, at initialization, and `onError`
on a failure.

- **triggers** — what starts the rule: `{ event, match? }`. `event` is a host-defined name
  (`'valueChanged'`); `match` is a pattern on the event's payload. A rule with none runs only when
  called. The engine indexes rules by event name.
- **filter** — whether the rule applies in this context (a region, a locale):
  `{ match?, when? }`. `match` is a pattern on the context; `when` is an optional predicate, an
  expression over the event and the context. Both must hold.
- **Patterns** (`match` and `filter`): a scalar equals; an array in the pattern is any-of, and
  matches an array target by any element; an object recurses; unnamed keys are ignored. No operator
  syntax.
- **onInit** — effect items emitted once when the engine initializes.
- **calculations** — guarded assignments, in order, a name assignable many times:
  `{ name, when?, value }`. The first assignment creates the variable. There is no `variables`
  section and no `conditions` section: a condition is the calculation `when ? then : else`.
- **decisions** — independent flat lists of ordered cases, first match wins, no nesting. A case's
  `value` is a **constant label** (string, number or boolean), never an expression. They never
  mutate variables. No match leaves the label unset, or is an error under `strict` (per rule,
  overridable per decision).
- **outputs** — `{ on: { decision, is }, items }`, where `is` is one label or a list, and `items`
  are effect expressions evaluated one by one in array order.
- **onError** — optional effect items, run when the rule's evaluation throws or its commit fails.
  Its expressions read an `error` object (`error.message`, `error.phase`), and its effects are a
  batch of their own. If that batch fails, the failure is only logged and reported.

Names: rule variables are read as **`calc.name`**; a variable and a label with the same name is a
compile error. Run-wide exports live under **`run`**. Labels are a rule's public result, in the
namespace **`labels.<ruleId>.<decision>`**, which only a `branch` guard and a test's `expect` read:
no rule expression reads a label, its own or another rule's.

The sections are the authoring shape. The compiler turns them into a generic step list, so a later
release can open step kinds without changing the format.

### 2.2 Evaluate, then commit

An expression never performs a side effect.

- **Host functions** are pure reads and helpers. Their arguments are **values**: `order:total` in an
  expression reads that fact through the context, and a function is never handed a name.
- **Effect functions** only record an effect, `{ name, args }`, in call order. A target is a string:
  `setVisible('shipping:address', true)`.
- **The rule's context is read-only** outside `calc.`: an assignment to a fact is refused.
- A rule run returns a **result**: its variables, its labels, its ordered effect list, its trace.
  The engine hands the effects to the host's **sink**, which performs them.

So evaluation performs no side effect, sync or async. A rule that throws emits nothing. A dry run is
a run that does not commit.

**An asynchronous provider** (a remote service a rule depends on) fits in two ways.

- **Request and reply, as two rules.** Rule A emits an effect, `requestScore('order:42')`. The sink
  performs it; when the provider answers, the host writes the result into the facts and calls
  `emit('scoreReady', …)`. Rule B, triggered by `scoreReady`, continues. Nothing in the engine is
  async for it; the cost is one piece of logic in two rules.
- **An async rule run.** A calculation's `value` may be an `await` of a registered function,
  `{ "name": "score", "value": "await score(order:id)" }`, and the engine awaits between fields.
  `eval-core` accepts an `await` only as the whole expression, so calculations are the one section
  that allows it: a decision's `if`, a filter and an effect item stay sync. The compiler finds an
  `await` in the text, so a rule that has one runs only through the async runner. The rule keeps
  the snapshot it started with, so it can decide on facts that changed while it waited; the queue
  is held meanwhile, so a timeout and an `AbortSignal` apply to the evaluation.

**A documented limit**: inside one rule, an effect item cannot read what an earlier item wrote,
since nothing is committed until the rule ends. Compute the value once as a `calc.` variable and use
it in both items, or split the rule in two inside a `sequence`.

**Rule text is untrusted.** A rule reaches only the facts, its own `calc.` variables and the
functions the host registered, which are the boundary. Every expression field is a single
expression unless the compile option `statements: true` permits statements, per engine and
overridable per rule. With it on, a field's value is its last statement's, a `let` is local to its
field, and writes to facts are still refused.

### 2.3 The three ports

The whole host contract. A store-based, signals or plain-object host is an adapter outside the core.

| Port | Shape | In a store-based host |
| :--- | :--- | :--- |
| facts | `facts()`, returning the context object | The store's state |
| events | `emit(event)`, called by any source | Its action stream |
| sink | `commit(effects)`, sync or async | Dispatching actions |

A read of the facts is sync. A rule that needs server data has the host load it into the facts
before the event, or uses one of the two provider patterns in [§ 2.2](#22-evaluate-then-commit).

### 2.4 Compile once

`compileRule(json)` parses every expression once, resolves names, and returns **all** problems at
once, each with a path (`rules[2].decisions[0].cases[1].if`). It rejects: a read of a `calc.` name no
item assigns, a read before every assignment in section order, a variable/label name clash, and an
output whose `is` no case of its decision can produce. Evaluation never parses.

### 2.5 Rule sets and workflows

One node interface, `{ kind, id, … }`, and a `kind` registry. A rule never contains rules, and rule
variables are not shared: data crosses nodes only through explicit exports to `run`.

- **A rule set** (an array) is unordered. One event takes one snapshot of the facts, evaluates every
  matching rule against it, and commits one batch, in array order. No rule sees another's effects.
  An effect function may be registered with a `key(args)`; two effects in one batch with the same
  name and key and different arguments conflict. Both are committed, in order, and the trace flags
  it; the engine option `onConflict: 'error'` fails the batch instead. A function with no key is
  never checked.
- **`sequence`** commits after each node, so a later node reads facts an earlier one changed.
  `onError: 'stop' | 'continue'`, default `stop`.
- **`branch`** selects children by guards. A tree is nested `sequence` and `branch`.
- **`parallel` and `fanOut`** are deferred until a use case needs them; the registry admits them
  without changing a published shape.
- An async commit accepts an `AbortSignal`; a cancelled run stops before its next node.

### 2.6 The engine

`emit(event)` queues the event. Events run **first-in first-out, one at a time**, a commit finishing
before the next event starts. No de-duplication by default. The core ships the `manual` event;
`/signals` adds a value-change event source.

- **Loop guard**: each event records the run that caused it. The limit counts the depth of one
  causal chain (event, effect, event), not runs per rule; default 16, configurable per engine. The
  error names the chain of rule ids.
- **`init()`**: the host calls it when its facts are ready. It evaluates every applicable rule's
  `onInit` against the facts at that moment and commits one batch. Calling it again runs them
  again; the engine never runs `onInit` on its own.
- **`load(rules)`** replaces the whole set atomically. Ids are unique within an engine, and a
  duplicate is a load error. A run in flight finishes with the set it started with; a queued event
  is evaluated against the set current when it is dequeued.
- **Failures never halt the queue.** The sink is handed the whole batch. If it throws, the engine
  cannot know which effects landed: the trace marks the batch "failed, state unknown", the error is
  logged, and the next event runs. No retry, no rollback. Every failure reaches the engine option
  `onError(error, info)`, where `info` names the rule, the event and the phase (`evaluate` or
  `commit`), and then the rule's own `onError` section.

### 2.7 Trace, logger, debugger, tests, cache

- **Trace**: a tree shaped like the workflow. Each node: status (ran, skipped by filter, failed),
  timings. Each variable: its expression, every assignment in order, the facts it read (from
  `eval-core`). Each effect: its name and arguments, and what the sink reported. Always built;
  expression-level detail when `debug` is on.
- **Logger**: a pluggable sink receiving the same events; `log` and `debug` flags per rule.
- **Debugger**: an `onStep` hook before and after each node, expression and effect; built on
  `eval-core`'s `EvalHooks`. No UI.
- **Tests**: `{ ruleId, given, expect: { calc?, labels?, effects?, skipped? } }`. A test evaluates
  and compares the result; it never commits.
- **Cache**: a `RuleRegistry` keyed by rule id, with no hash. An entry is reused only if its stored
  JSON text equals the incoming text, or the caller's `version` matches when one is given.
  `invalidate(id)`. Bounded by count, least recently used evicted first; default 500, configurable.

### 2.8 The package and its releases

`@zvenigora/ng-eval-rules` at `modules/eval-rules`, from 0.1.0; peers `@angular/core >=19.0.0` and `@zvenigora/ng-eval-core >=0.16.0 <0.17.0`;
plain functions in the main entry (no Angular DI); a `/signals` entry with an optional
`@zvenigora/ng-eval-signals` peer. JSON is canonical, with a typed `defineRule` helper over it.

| Release | Contents |
| :--- | :--- |
| 0.1.0 | Pure rule evaluation: `compileRule`, the result with its trace, the tests runner, the registry cache |
| 0.2.0 | The engine: rule sets, events, the sink, batch commit, the queue and the loop guard |
| 0.3.0 | The `kind` registry, `sequence`, `branch`, async commit and cancellation |
| 0.4.0 | `/signals`: a value-change event source, which calls `emit` when a signal changes |
| 0.5.0 | The async rule run: `await` in a calculation, with a timeout and cancellation on the evaluation |
| any | `onStep` debugger, with the first release that needs it |

Not built: a converter from any earlier rule format, and any host's function vocabulary, which
belong to the host application; `parallel` and `fanOut`; timer and route event sources; a rule as
a `computed` that re-runs when a fact it read changes.

### 2.9 One rule in the format (proposal)

An order-discount rule. Function and event names are the host's, and stand in for whatever a host
registers.

```json
{
  "id": "orderDiscount",
  "name": "Order discount by tier",
  "active": true,
  "triggers": [{ "event": "valueChanged", "match": { "keys": ["order:total", "customer:tier"] } }],
  "filter": { "match": { "region": ["EU", "UK"] }, "when": "customer:active" },
  "calculations": [
    { "name": "eligible", "value": "order:total >= 100" },
    { "name": "discount", "value": "0" },
    { "name": "discount", "when": "calc.eligible", "value": "order:total * 0.1" }
  ],
  "decisions": [
    {
      "name": "offer",
      "cases": [
        { "if": "customer:tier == 'gold' && calc.eligible", "value": "apply" },
        { "value": "clear" }
      ]
    }
  ],
  "outputs": [
    { "on": { "decision": "offer", "is": "apply" }, "items": ["setValue('order:discount', calc.discount)", "setVisible('discount:banner', true)"] },
    { "on": { "decision": "offer", "is": "clear" }, "items": ["setValue('order:discount', 0)", "setVisible('discount:banner', false)"] }
  ]
}
```

A case with no `if` is the `else`, and there is no operator or order field.

## 3. The questionnaire

| Q | Topic | Outcome | Status |
| :--- | :--- | :--- | :--- |
| Q1 | What is a rule | A pipeline of calculations and decisions; outputs driven by decision labels | Settled |
| Q2 | What an application-specific engine gets wrong | Closed, not extendable, no composition, no async; needs side effects, order, chains, trees, JSON from a database, caching, traceability | Settled |
| Q3 | Relation to the other packages | `eval-core` only; optional `/signals` entry point | Settled |
| Q4 | Authoring | JSON canonical, typed helper | Settled |
| Q5 | What a run returns | Restated as Q19 | Superseded |
| Q6 | Sync or async | Both; narrowed by Q43 and Q44 to the commit and the workflow | Settled |
| Q7 | Variables | Calculations mutate in order; decisions do not | Settled |
| Q8 | Decisions | a) narrowed by Q28; b) unmatched is an option; c) no nested decisions | Settled |
| Q9 | Outputs | The side effects, driven by decisions | Settled |
| Q10 | Scope | Rule-local; labels not usable in expressions; name clash is a compile error | Settled |
| Q11 | Compile once | Yes | Settled |
| Q12 | Composition | Nodes and a `kind` registry; `parallel` and `fanOut` deferred by Q45 | Default |
| Q13 | Effects | Descriptors and handlers | Superseded by Q27, then Q43 |
| Q14 | Data across nodes | Exports to `run`; labels readable by `branch` guards | Default |
| Q15 | Fresh state | Live facts per node | Revised by Q46 |
| Q16 | Sync and async | One definition, two runners | Revised by Q43 and Q61: a rule with an `await` runs only through the async runner |
| Q17 | Triggers and filters | Replaced by Q29 | Superseded |
| Q18 | Tests and debugger | Stored tests; `onStep` hook | Default |
| Q19 | The run's result | A trace shaped like the workflow; logger sink | Default |
| Q20 | Cache | Registry keyed by id and content hash | Revised by Q55: no hash |
| Q21 | Section order | Fixed order; add triggers; `conditions` dropped by Q47 | Settled |
| Q22 | `inits` and variables | Replaced by Q30 and Q34 | Superseded |
| Q23 | Constant or expression | Replaced by Q35 | Superseded |
| Q24 | Outputs on labels | Replaced by Q32 | Superseded |
| Q25 | Nesting | Only through workflow nodes | Default |
| Q26 | `strict` | Per rule, overridable per decision | Default |
| Q27 | Effects | Expressions calling registered functions, which performed the effect | Revised by Q43: they record it |
| Q28 | Decision values | Constant labels; outputs checked against them | Settled |
| Q29 | Trigger and filter | A trigger starts the rule; a filter is any matching structure | Settled; split by Q47 |
| Q30 | `inits` | Renamed `onInit` | Settled |
| Q31 | Earlier rule formats | New format; no converter for now | Settled |
| Q32 | Outputs shape | Separate list: `on: { decision, is }`, `items` | Settled |
| Q33 | Variable names | `calc.` namespace; `run` for exports | Settled |
| Q34 | Declaring variables | None; the first assignment creates it | Settled |
| Q35 | Expression fields | Plain expressions, no marker | Settled |
| Q36 | Pattern matching | Subset pattern; arrays are any-of; no operators | Settled |
| Q37 | Events and triggers | `emit(event)`; top-level nodes only | Settled |
| Q38 | Events caused by effects | FIFO, one run at a time; loop guard at depth 16 | Settled |
| Q39 | Package | `modules/eval-rules`, 0.1.0, plain functions, `/signals` entry | Default |
| Q40 | Workflow failures | `onError` on `sequence`; the `parallel` and `fanOut` parts deferred by Q45 | Default |
| Q41 | Cancellation | `AbortSignal` on an async commit | Default |
| Q42 | Releases | Five slices | Superseded by § 2.8 |
| Q43 | Evaluate, then commit | Yes; a later item cannot read an earlier item's write | Default |
| Q44 | Reads | Always sync; the host loads server data first | Revised by Q61 |
| Q45 | `parallel`, `fanOut` | Deferred until a use case | Default |
| Q46 | Rule set | Unordered, one snapshot, one batch; conflicts flagged | Default |
| Q47 | Three simplifications | Read-only context; event matching in `triggers`; no `conditions` | Default |
| Q48 | Sections | The only authoring shape; compiled to a generic step list | Default |
| Q49 | Conflicting effects | An optional `key(args)` per effect function; flagged, or an error by option | Settled |
| Q50 | A sink that fails mid-batch | "Failed, state unknown"; logged; the queue never halts | Settled |
| Q51 | Reading labels | `labels.<ruleId>.<decision>`, by `branch` guards and tests only | Settled |
| Q52 | `onInit` timing | On the host's `init()`, each time it is called | Settled |
| Q53 | The loop limit | Depth of one causal chain; default 16, configurable | Settled |
| Q54 | The security boundary | Untrusted rule text; registered functions are the boundary; statements by option (Q60) | Settled |
| Q55 | Cache key and bound | By id and text equality or `version`, no hash; 500, least recently used | Settled |
| Q56 | Rule identity | Unique per engine; `load` swaps the set atomically | Settled |
| Q57 | The reactive mode | An event source only; a rule as a `computed` is backlog | Settled |
| Q58 | A rule reading its own effect | A documented limit, with two workarounds | Settled |
| Q59 | `onError` | An engine callback and an optional rule section | Settled |
| Q60 | Statements | Off by default, on by option; an endless loop is not guarded for now | Settled |
| — | Filter | `{ match?, when? }`: an optional predicate beside the pattern | Settled |
| Q61 | An asynchronous provider | Request and reply as two rules, documented from the start; an async rule run, `await` in calculations only, as its own slice | Settled |

## 4. Outputs the review should produce

1. A yes or a change for each **Default** row, which was not discussed individually.
2. A decision on each item in [§ 6](#6-what-the-next-session-should-challenge).
3. The settled design, once agreed, as `docs/eval-rules/plan.md` ([SR1](../standing-rules.md#sr1)),
   with a step per release slice, exit criteria that name a failing assertion
   ([SR21](../standing-rules.md#sr21)) and a probe for each check ([SR15](../standing-rules.md#sr15)).
4. Backlog entries ([SR5](../standing-rules.md#sr5)) for what this design defers: a converter
   from an earlier rule format, `parallel` and `fanOut`, timer and route event sources, and
   anything § 6 defers.

## 5. Facts found about the existing code

- `eval-forms/signals` already registers one expression per Angular field property
  (`createExpressionRules`); this library is the layer above it, not a replacement.
- `eval-core` takes the walk outside Angular DI through `parse`, `compile` and `call` with an
  `EvalState` (`evaluateRule` in `eval-forms/signals` is the pattern), and keeps scope on the
  `EvalContext`, so a reused context needs the depth-mark unwind that `evaluateRule` has.
- `colonIdentifiers` (`eval-core` 0.12.0) reads `order:0:1` as one identifier, and `eval-core`
  evaluates assignments, which is why the rule's context has to refuse them.
- In `eval-core` an identifier argument is evaluated, so a function receives a value and never a
  name, and `0-999` is a subtraction, not a range. A rule format that meant otherwise needs its
  expressions rewritten by its host.

## 6. What the next session should challenge

Session 1 listed twelve holes. Evaluate-then-commit closed five: how "sync-capable" is known, what
a dry-run stub returns, effects with no rollback inside a rule, `await` inside an effect expression,
and effect order under `parallel`. "Arguments are values" closed a sixth, what a host
function is handed. Session 3 decided the other six and the four that session 2 opened, as Q49 to Q60.

What is left is smaller, and none of it blocks a plan:

1. **An endless loop under `statements: true`.** Evaluation is synchronous, so the engine cannot
   interrupt one. Set aside for now (Q60); it needs a backlog entry when the option is built.
2. **Trace size under `debug`** is unmeasured ([SR28](../standing-rules.md#sr28)). The plan measures
   it before any figure is published.
3. **The "Default" rows** of the questionnaire were agreed in blocks and never discussed one by one.
4. **`onError` and `onInit`.** Whether a failing `onInit` item runs the rule's `onError` section was
   not asked.
5. **Where the async rule run ships.** It is placed after `/signals`, as 0.5.0; the order of those
   two slices was not asked, and neither depends on the other.
6. **A filter's `when` and the event index.** The engine indexes rules by event name and `match`;
   a `when` predicate is evaluated per candidate rule, so its cost is per event, not per index.
