# Backlog — retired entries

Entries from `docs/backlog.md` that are no longer live, each kept with its reason and its
evidence, in their original order and section. There is no index here: the one in
`docs/backlog.md` covers both files, and its retired rows link to this one.

---

# A. `eval-core` — visitor, context and service defects

<a id="a1"></a>
## A1 — `await-expression.ts` downgrades a synchronous throw to a promise rejection

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-30**; released
2026-10-01 in `eval-core` 0.7.0, tagged 724d831

`awaitVisitor` wrapped `callback(node.argument, st)` in a `try`/`catch` inside a `Promise`
executor ([`await-expression.ts`](../modules/eval-core/src/lib/internal/visitors/await-expression.ts)),
so a child that throws synchronously — a prototype-pollution guard rejection, for instance —
did not propagate. It became a rejected promise that only surfaced when something awaited it,
and the visitor continued to its own `pushVisitorResult`. In the async path a security rejection
therefore arrived as a rejected value rather than a throw, and in the sync path it may never have
been observed at all.

This was also the visitor that made [A9](#a9)'s class of defect quiet: it swallowed a child's
throw between its own `beforeVisitor` and `afterVisitor`, so it looked healthy to the hook layer
while the **value** stack was silently one entry out.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md).
*Verified*: source read, 2026-09-06.

*Fixed* 2026-09-30: the `callback` and its pop moved out of the executor and are left uncaught,
as in every other visitor, so the throw propagates and `evaluate`'s `catch` unwinds the open
nodes. What happens once the value exists is unchanged: the timeout race, and the
"at position" suffix on an asynchronous rejection. A synchronous throw under `await` now throws
from `simpleEval` / `eval`, and `evalAsync` rejects with the guard's own error object.

Specs: `eval.service.await.spec.ts`, four cases. **Probe** — the executor wrapping restored:
6 failed / 1080 — the three sync-throw cases (`simpleEval`, `eval`, `evalAsync` by identity) and
the three pre-existing cases rewritten below; the position case stays green. **Second probe** —
the position suffix dropped: 1 failed / 1080, the position case alone.

**Five pre-existing cases pinned the old shape and were rewritten, not deleted**: four in
`hooks.spec.ts`'s describe for a visitor that swallows its child throw, now "an await whose
operand throws synchronously", and the README's second `completed: false` example with its
`readme-examples.spec.ts` case. That example was the only built-in route to a `completed: false`
event *without* an error; the README now shows the same expression producing the first kind,
and says the second kind stays in the hook contract.

<a id="a2"></a>
## A2 — Three silent fall-throughs in the two write visitors, one shape

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-30**; released
2026-10-01 in `eval-core` 0.7.0, tagged 724d831

**Widened 2026-09-10 from one member to three**, while planning Phase 2. The entry previously
described `(a)++` alone, which read as a single exotic bug behind a non-default parser option. It is
one instance of a shape that appears **twice in the code and three times in behaviour**, and two of
the three need no option at all.

The shape: an `if`/`else if` chain over the node types a write visitor knows how to handle, with
**no final `else`** — so an unhandled type reaches `afterVisitor` having pushed nothing, and every
node downstream of it pops its neighbour's value.

| # | Expression | Needs an option? | What happened |
| - | ---------- | ---------------- | ------------- |
| 1 | `(a)++` | `preserveParens: true` | `argument.type === 'ParenthesizedExpression'`; neither branch of [`update-expression.ts`](../modules/eval-core/src/lib/internal/visitors/update-expression.ts) matched. Pushed nothing |
| 2 | `[a, b] = arr` | **no** | `left.type === 'ArrayPattern'`; neither branch of [`assignment-expression.ts`](../modules/eval-core/src/lib/internal/visitors/assignment-expression.ts) matched |
| 3 | `({m} = o)` | **no** | `left.type === 'ObjectPattern'`; same chain, same fall-through |

*Measured 2026-09-10*, against the built package: 2 and 3 both return `undefined`, throw nothing,
and leave the context **unchanged** — destructuring assignment is silently a no-op, which is a wrong
answer on the default path rather than an untidy bracket.

**Why this is one entry and not three.** The fix is one decision — what a write visitor does with a
target it does not handle — applied at two sites. Handling `ParenthesizedExpression` alone leaves
the two default-path members live; adding a `default:` that throws fixes all three and changes what
`[a, b] = arr` does from "nothing" to "a diagnostic", which is the behavioural half that needs a
version bump. Implementing destructuring assignment properly is a third, larger option and is the
only one that makes 2 and 3 *work* rather than *report*.

**Phase 2 deliberately left this alone** ([`statements/phase-2-plan.md`](statements/phase-2-plan.md)
§ 1.7 and § 8.4): that phase reviews the same fall-through shape in five new statement dispatchers
and requires a throwing `default:` in each, so fixing one of these three in passing would be
arbitrary rather than principled.

**Confirmed at the close of Phase 2, by measurement rather than by reading the diff.** Step 6 ran
all three against the pre-phase tree and against 0.4.0: `[a, b] = arr` and `({m} = o)` both return
`undefined` with the context unchanged and **nothing stranded**, identically before and after; `(a)++`
needs `preserveParens` and its chain in `update-expression.ts` is untouched. The two-statement form
`[a, b] = arr; a` ran through `Program` and still returned the unchanged `a`.

**"One shape" is a claim about these three, and [A11](#a11) is the reason to say so out loud.**
A11 is a fourth silent wrong answer in the same layer — renaming destructuring binds the wrong key
to the wrong value — and it is *not* this shape: no chain is fallen through, a branch matches and
computes the wrong thing. Repairing A11 turned up [A13](#a13) and [A14](#a14), both of that second
shape. "Silent wrong answer in the pattern layer" is a larger set than any one entry registered.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md) (member 1);
[`statements/phase-2-plan.md` § 1.7](statements/phase-2-plan.md) (members 2 and 3).
*Verified*: source read, 2026-09-06; members 2 and 3 measured against `dist/`, 2026-09-10.

*Fixed* 2026-09-30, by the decision this entry named — a throwing default, not destructuring
assignment. Both visitors unwrap `ParenthesizedExpression` first (`unwrapParentheses` in
`visitors/utils.ts`), so `(a)++`, `--((a))`, `(o.x)++` and `(a) = 7` work under `preserveParens`;
`(a) = 7` was a fourth member nobody had listed, the same fall-through in the assignment chain.
Any other target throws `Unsupported assignment target: <type>` /
`Unsupported update target: <type>` and pushes nothing. In `assignment-expression.ts` the check
sits **above** the operands rather than as the chain's final `else`, so neither side is evaluated
for an assignment that cannot happen. `[a, b] = arr; a` now throws.

Specs: `write-targets.spec.ts`, eight cases. **Probes**, each against 1088: both throwing defaults
removed — 4 failed, exactly the four unhandled-target cases; the unwrap removed — 4 failed, exactly
the four parenthesised cases; the assignment check moved after the right operand — 1 failed, the
"evaluates neither side" case. The update visitor's default is reached only by a hand-built node:
acorn rejects every source that would reach it. The root README's node list now says what the two
write visitors accept.

<a id="a11"></a>
## A11 — `evaluateObjectPattern` binds the key from the pattern and the value from the *wrong name*

**Package** core · **Kind** fix · **Status** **Retired — fixed, `eval-core` 0.5.0, 2026-09-17.**
`Property.value` is bound as a pattern against the source property instead of being walked as an
expression against the source object. Covered by
[`pattern.destructuring.spec.ts`](../modules/eval-core/src/lib/internal/visitors/pattern.destructuring.spec.ts),
every shape below through both routes. See [A13](#a13) and [A14](#a14), which the repair's own
specs found in the same function

**The entry's own fixture was the unlucky case, and that is worth carrying forward.** The table
below measures `{ a: b }` over a source holding **both** `a` and `b`, which makes the defect read as
"binds `a` to `src.b`" — a wrong *value*. That is the special case. The general rule is that the
value name resolves to **nothing**, so the ordinary symptom was `undefined` on both sides:
`({a: x, b: y}) => x` bound neither `x` nor `y` and left `a` and `b` holding `undefined`, because
neither `x` nor `y` was a source key. A wrong value needs the renamed-*to* name to exist on the
source as well. This matters twice over — it is why most consumers saw nothing rather than something
wrong, and it is why a fixture carrying the renamed-to name cannot discriminate the fix: the old code
would find that name and return a plausible value either way.

**Found Phase 2 step 3**, while routing binding writes through the pollution guard. Renaming
destructuring — `{ a: b }` — is wrong in **both** halves, and has been for as long as the binder has
existed.

[`evaluateObjectPattern`](../modules/eval-core/src/lib/internal/visitors/pattern.ts) takes the
binding name from `Property.key`, then pushes the argument as a scope and evaluates `Property.value`
through `callback` **as an expression**. For `{ a: b }` that resolves the identifier `b` against the
argument. So it binds `a` to `arg.b`, where JavaScript binds `b` to `arg.a`. Both names are wrong at
once, which is why the shorthand form works and hides it: `{ a }` has `key` and `value` both naming
`a`, so resolving the wrong one lands on the right answer.

*Measured 2026-09-13*, against `src` = `{ a: 'VALUE_OF_A', b: 'VALUE_OF_B' }`:

| Expression | JavaScript | This library |
| ---------- | ---------- | ------------ |
| `(({a: b}) => b)(src)` | `'VALUE_OF_A'` | **`undefined`** — `b` is not bound at all |
| `(({a: b}) => a)(src)` | `ReferenceError` | **`'VALUE_OF_B'`** — `a` is bound, to the wrong value |
| `let { a: b } = src; b` | `'VALUE_OF_A'` | **`undefined`** |
| `let { a: b } = src; a` | `ReferenceError` | **`'VALUE_OF_B'`** |

**Nested destructuring is the same branch and a second symptom.** `Property.value` of type
`ObjectPattern` is handed to `callback` just as an `Identifier` is, so acorn-walk's base walker
descends it as a pattern, pushes nothing, and `popVisitorResult` binds the *outer* key to
`undefined`. *Measured 2026-09-13* against `src` = `{ a: { b: 'B', c: 'C' } }`:

| Expression | JavaScript | This library |
| ---------- | ---------- | ------------ |
| `let { a: { b } } = src; b` | `'B'` | **`undefined`** — nothing named `b` is bound |
| `let { a: { b } } = src; a` | `ReferenceError` | **`undefined`** — `a` is bound, to nothing |

**The value stack does not desync**, checked specifically because it is the failure that would make
this urgent: `let { a: { b } } = src; 1` returns `1` with 0 stranded and `scopes.length` 0, and the
same pattern under a pending operand stays balanced. So this is a wrong *answer*, not corruption,
which is why it is filed rather than fixed in flight.

**Reachable from arrow parameters, i.e. shipped since before Phase 1**, with no option required.
Phase 2 step 3 widens *what* reaches it — declarations are a second route to the same code — without
changing the defect.

**Read this beside [A2](#a2), and re-read A2's framing when you do.** A2 is titled "one shape"
and its claim is that three instances share a single fix: an `if`/`else if` chain over node types
with no final `else`. This is a fourth silent wrong answer in the same *layer* and it is **not** that
shape — nothing falls through a chain here; a branch matches and computes the wrong thing. Two
consequences:

- A2's "one shape, one decision, two sites" reasoning is about A2's three members and does not
  extend to cover this. A reader who takes A2 as the register of silent-wrong-results in the pattern
  and write layer will not find this one in it.
- Step 3 did add a throwing `default:` to both of `pattern.ts`'s `switch` statements, and it does
  **not** reach this: the wrong binding is produced by a case that matched.

**The near miss worth recording.** Step 3's own divergence note (plan § 3.6.6) named
`let { a = 1 } = o` as reaching `evaluatePattern`'s fall-through. It does not — a default in an
object pattern is `Property.value` of type `AssignmentPattern`, handed to `callback` by the same
branch described above. The guard placed where node types are *enumerated* missed the path that
reaches the node through a `callback`, and the example the plan used to justify the guard was on
that path. Caught because the spec written for it failed; it would otherwise have shipped a
`default:` that covered two of the three forms it was written for.

**The repair, and the two entries it produced.** `Property.value` is now handed to
`evaluatePattern` with the *source property* as its argument, so an `Identifier` binds that name,
and a nested `ObjectPattern` or `ArrayPattern` recurses — one change covering renaming, nesting,
deep renaming and both key spellings at once. Two consequences worth reading before touching the
function again:

- **The scope push is gone.** `evaluateObjectPattern` pushed the source so the value could resolve
  against it; that push *was* the defect's mechanism, not a safety measure, and nothing reads a
  scope once the value is a binding target. `pattern.ts` is therefore no longer one of the visitors
  [A9](#a9)'s `finally` idiom applies to. Checking that also found `CLAUDE.md`'s "only two visitors
  push scopes" had been wrong since Phase 2 — which added three — and it is now corrected there
  with the reason rather than a new number.
- **The blocklist moved to the source key**, checked before the read. `safeGetProperty` returns
  early for a non-object target *before* it tests the key, so relying on it would have quietly
  dropped the existing `(({ valueOf: v }) => v)(o)` rejection when `o` is unbound. Caught by that
  spec failing.

*Recorded*: this entry, 2026-09-13.
*Verified*: measured against the working tree at Phase 2 step 3, 2026-09-13; re-measured against the
built **0.4.0** bundle 2026-09-16, all six rows reproducing, and fixed 2026-09-17.

<a id="a13"></a>
## A13 — An object rest element binds the whole source, not the remainder

**Package** core · **Kind** fix · **Status** **Retired — fixed, `eval-core` 0.5.0, 2026-09-17.**
Opened and closed in the same change

`evaluateRestElement` was handed `arg` itself from `evaluateObjectPattern`'s `RestElement` branch,
so a key a sibling property had already taken stayed on the rest record. *Measured against the built
0.4.0 bundle, 2026-09-16*, `src` = `{ a: 'A_VAL', b: 'B_VAL' }`:

| Expression | JavaScript | 0.4.0 |
| ---------- | ---------- | ----- |
| `(({a, ...r}) => r.a)(src)` | `undefined` | **`'A_VAL'`** |
| `(({a, ...r}) => r.b)(src)` | `'B_VAL'` | `'B_VAL'` |

Array rest was correct — `evaluatePatterns` slices, so `[p, ...t]` never saw this. Both routes,
same as [A11](#a11).

**The one shape in this family whose wrong answer was a real value.** Every other row of A11 and
[A14](#a14) returned `undefined`, which a consumer notices. This returned the source's own property,
so an expression reading `r.a` worked and kept working, and nothing would have surfaced it. That is
why it carries the migration note's only "you may have been relying on this" line.

*Recorded*: found while measuring [A11](#a11) against the built bundle, 2026-09-16 — not by reading
the function, which had been read several times.
*Verified*: fixed by excluding the keys taken by sibling properties, **by their source name** rather
than their binding name, so `{ a: x, ...r }` removes `a`. Covered by `pattern.destructuring.spec.ts`.

<a id="a14"></a>
## A14 — A computed key in an object pattern is not evaluated

**Package** core · **Kind** fix · **Status** **Retired — fixed, `eval-core` 0.5.0, 2026-09-17.**
Opened and closed in the same change

`{ [keyName]: q }` parses with `Property.key` an **`Identifier`** and `computed: true`. The key
branch tested `key.type === 'Identifier'` before it tested `computed`, so it took the identifier's
**spelling** and read `src.keyName` where JavaScript reads `src[keyName]`.

**Hidden the same way [A11](#a11) was hidden by shorthand.** The literal computed form
`{ ["a"]: q }` takes the `Literal` branch, and a literal's value *is* the key — so the wrong branch
produced the right answer, and the only form that exposes it is a computed key that is not a
literal.

*Recorded*: 2026-09-17. **Found by a spec written for [A11](#a11)**, not by inspection: the
computed-key case used a decoy context where `keyName` resolved to `'a'` in the enclosing scope and
to `'DECOY'` on the source, so each way of getting it wrong produced a different value. A fixture
without the decoy passes over this defect, and the first version of that spec — asserting only
`{ ["a"]: q }` — did exactly that.
*Verified*: `computed` is tested first; the key is walked through `callback`, which runs **before**
the source property is read and with no scope pushed, so it resolves in the enclosing scope as
JavaScript does. Both arms covered in `pattern.destructuring.spec.ts`.

<a id="a3"></a>
## A3 — `import-expression.ts` has a dead `afterVisitor`

**Package** core · **Kind** fix (cosmetic) · **Status** **Retired — fixed 2026-09-26**;
released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1

`importExpressionVisitor` called it after an unconditional throw
([`import-expression.ts:12`](../modules/eval-core/src/lib/internal/visitors/import-expression.ts#L12)),
so the line could never run. Nothing broke.

*Recorded*: [`side-effects/step-3-summary.md` § 5.1](side-effects/step-3-summary.md).
*Verified*: source read, 2026-09-06.

*Fixed* 2026-09-26: the line deleted, and its `afterVisitor` import with it, which lint then
reported unused. Nothing else in the visitor changed. **The published artifact does change**: the
built `fesm2022` bundle, compared against a build of the parent commit, differs by exactly that
one line (and its source map with it); the `.d.ts` is byte-identical. Test counts unchanged.

<a id="a4"></a>
## A4 — `EvalContext.getKey` cannot case-correct a namespace, and does not resolve through the same chain as `get`

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-10-01**, with [A10](#a10) as
one defect; released 2026-10-02 in `eval-core` 0.8.0, tagged c56f987. Was Open, Covered

Two related gaps in one method
([`eval-context.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts), lines
283–309 at 0.7.0), both surfaced by Phase 1 step 4's read hooks, which report `getKey`'s answer as
the key that was read.

**The namespace gap.** `getKey` searched `scopes`, then `original`, then **inside** each prior
scope's `context` — but never a scope's `namespace`. An `EvalScope` resolves its namespace in
`EvalScope.get`, which `getKey` had no counterpart for. So with a scope namespaced `dog`, the
expression `Dog.Says()` reported an uncorrected `'Dog'` for the identifier while the member hop
correctly reported `says`. **Covered** by `internal/visitors/read-hooks.spec.ts`; a fix had to
update that spec deliberately.

**The divergence from `get`.** `getKey` omitted the `lookups` loop that `get` runs, so a key
resolved by an `EvalLookup` reported nothing. And the two disagreed about absent values: `get`
treats `undefined` as "not found" and continues to prior scopes and lookups, while `getKey`
returned the first spelling it found. Under `caseInsensitive` the reported key could therefore
come from a *different source* than the value did.

**Confirmed to reach further than "a diagnostic" — Phase 3 step 2.** The `lookups` divergence
also stripped the key off a library-owned error. `assignment-expression.ts` and
`update-expression.ts` resolve their target through `getKey` **before** writing, so under
`caseInsensitive` a key that lives only in `lookups` — which is every key of a
`@zvenigora/ng-eval-signals` context — came back `undefined`, and any error raised from the
write named `'undefined'` instead of the key:

```
Cannot assign to 'undefined' in expression 'COUNT = 5': the keys of a signal context are read-only.
```

Both gaps are behavioral changes to an exported method. They matter most to dependency tracking,
which keys on what `getKey` returns. See [C3](#c3) for the question of whether
`eval-signals` should contain this locally, which was assigned to a step and never answered.

**A third divergence was found in Phase 2 step 1 and is filed as [A10](#a10), which argues it is the
same defect as this one.** If that reading holds, this entry is bigger than it looks: the fix has to
reach `getKeyValue` in `visitors/utils.ts` as well as `eval-context.ts`, and — the part that matters
for sequencing — **A10 sits in front of both gaps above**, so a fix to either that leaves A10 in
place does nothing whenever a scope is pushed, which since step 1 is every evaluation.

*Recorded*: [`side-effects/step-4-summary.md` § 5.2](side-effects/step-4-summary.md);
[`signals/phase-3-plan.md` § 3.6.4 gap 2](signals/phase-3-plan.md).
*Verified*: source read, 2026-09-06 — no `lookups` loop, no namespace check. The
`get`/`getKey` disagreement was then *measured* 2026-09-13 under [A10](#a10)'s probe, which
caught this entry's own third paragraph in the act: with `caseInsensitive` on, a
case-sensitive `Registry` original and a key spelled `A`, `get` returns `undefined` while
`getKey` returns `'a'` — the reported key coming from a different source than the value, exactly
as written here. *Re-measured* 2026-10-01 on master 955f0c9, every row reproducing: that one; a
prior scope namespaced `dog` giving `getKey('Dog')` undefined and read keys `['Dog', 'says']`; a
lookup-only key giving `get('COUNT')` 5 and `getKey('COUNT')` undefined; and a fourth, the same
defect — `getKey` searched inside every prior scope's context, `EvalScope.get` only inside a
`global` one, so a key held by a non-global scope was reported and never resolved.

*Fixed* 2026-10-01, with [A10](#a10), as the one defect A10 argued it was. `get` and `getKey` now
walk one module-private resolver in `eval-context.ts`, `resolve`, which follows `get`'s order —
pushed scopes by presence (`scopeHolding`), the original, each prior scope through `EvalScope.get`
itself, then lookups — and answers the value together with what held it. `get` reads the value;
`getKey` derives the spelling from the holder:

- a case-insensitive `Registry` — the spelling it holds; any other `Context` — the key itself,
  since `get` reads it by exact key;
- a prior scope matched on its namespace — the namespace as declared. The test is
  `matchesNamespace` in `eval-scope.ts`, which `EvalScope.get` now calls too, so it is one copy;
- a lookup — the key as written, since a lookup returns no key;
- nothing — undefined, exactly when `get` finds nothing.

It is the shape Phase 2 step 1 gave `get` / `getFromScopes` / `hasInScopes`. The resolver is a
function, not a method, so the class's `.d.ts` changes in documentation only. **The entry's
prediction about `getKeyValue` did not hold**: `getKey` no longer calls `getContextKey`, so neither
it nor `getKeyValue` needed to change, and neither did. `getKey`'s callers are `identifier.ts`
(`emitRead`, which falls back to the source name), `member-expression.ts` (`evaluateMember`'s
context branch), and `assignment-expression.ts` / `update-expression.ts` (identifier targets) — the
last three only under `caseInsensitive`. `getContextKey` (public, `classes/common`) is left with no
caller in the library; `getKeyValue`'s other caller, `getValueIgnoreCase`, is untouched.

What changes, all of it in the `eval-core` 0.8.0 CHANGELOG: a namespace read reports the namespace's
declared spelling (`read-hooks.spec.ts`'s covered case, `'Dog'` → `'dog'`, updated deliberately); an
unbound name gets no key; a lookup-resolved key comes back as written, so the signal-context write
error names `'COUNT'` (`eval-signals`' `signal-context.spec.ts` case that pinned `'undefined'` is
rewritten); a key inside a non-global prior scope is no longer reported. And one that follows
rather than being designed: `member-expression.ts` reads a member of the context itself as
`get(getKey(key))`, so `This.COUNT` on a lookup-only key and `This.Dog` on a namespace now resolve —
both were `undefined`, measured with the old `getKey` body restored.

Specs: `eval-context.get-key.spec.ts`, 17 cases — each measured row as it should be, the two
`This.` reads, and an invariant over a grid of 144 contexts (case-sensitive or not; a plain,
case-sensitive `Registry` or case-insensitive `Registry` original; no scope, a plain scope as an
arrow pushes it, or one pushed with the walk's options; no prior scope, a global, a namespaced, or a
global namespaced one; with and without a lookup) × 20 keys: `getKey(k)` is undefined iff `get`
finds nothing (`get(k) !== undefined || hasInScopes(k)`), and what it answers `get` resolves to the
same value. Plus one `read-hooks.spec.ts` case, an unbound name reporting its source spelling.
`eval-core` 1110 → 1128.

**Probes**, each reverted, against 1126 (before the two `This.` cases): the old scopes step
restored ahead of the resolver — 3 failed, both A10 rows and the grid. `getKey`'s own original and
prior-scope loops restored in place of the resolver's — 9 failed: the three absent-value rows, both
namespace rows, the non-global row, the grid, and both `read-hooks.spec.ts` namespace cases. The
lookups step dropped (a lookup answering undefined) — 3 failed, the absent-value row a lookup
resolves, the lookup row and the grid, and `eval-signals` 1 failed / 131, the write-error case.
Rerun on this file once the `This.` cases were added: the lookups probe fails `This.COUNT` as well
(4 / 17), and losing the prior-scope answers fails `This.Dog` (5 / 17).
`internal/performance.spec.ts` green throughout.

<a id="a10"></a>
## A10 — `getKey`'s scopes step reports **every** key as present against a plain-object scope

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-10-01**, with [A4](#a4);
released 2026-10-02 in `eval-core` 0.8.0, tagged c56f987. Was Open — latent, not live

**The shape — the sibling of the defect Phase 2 step 1 fixed, one method over.** Step 1 closed
`EvalContext.get`'s scopes step reading a plain record by *value*, which walked the prototype chain
and let an empty scope answer for `toString` and `constructor`. `getKey` had the matching fault and
did not get the matching fix: its scopes step called `getContextKey`, which for a plain object calls
[`getKeyValue`](../modules/eval-core/src/lib/internal/visitors/utils.ts), and `getKeyValue` under
`caseInsensitive: false` returns `[key, obj[key]]` **without asking whether the object holds the
key at all**. Any name matched. Since step 1 a scope is pushed on every evaluation, so the first
step of `getKey`'s resolution order answered for everything, always.

*Measured* 2026-09-13 against the built package, a plain-object scope pushed on an `EvalContext`
whose original is a `Registry` holding `a`:

| key | `get` | `getKey` |
| --- | ----- | -------- |
| `zzz-never-bound` | `undefined` | **`'zzz-never-bound'`** |
| `toString` | `undefined` | **`'toString'`** |
| `a` | `'A'` | `'a'` |
| *control, no scope pushed* | `undefined` | `undefined` |

The control is what shows the scopes step is the culprit rather than a later one.

**Why it was harmless, and this half was not a footnote.** Nothing resolved and nothing leaked:

- With `caseInsensitive: false` there is no correction to get wrong. `getKey` returned the key **as
  written**, which is the same string every later step would have returned for that input, so no
  consumer read a spelling it would not otherwise have read.
- Under `caseInsensitive` the case could not arise. `fromContext` copies a plain record into a
  `Registry` when the flag is set, and a `Registry` is Map-backed and answers `undefined` for an
  unbound name — measured in the same probe. So the shape existed only on the path where it cost
  nothing.

So this was **not** the security-shaped defect its sibling was.

**What would make it bite**, and why it was to be fixed *with* [A4](#a4): it sat **in front of**
every step a fix to A4 would add. **A fix to A4 that left this in place would have silently done
nothing**, and would have passed a suite that tested it with no scope pushed.

**One defect or two: one.** `getKey` was a parallel re-implementation of `get`'s resolution order
rather than a derivation of it, so every change to `get` widened the gap without anyone touching
`getKey`. The repair is one chain answering two questions, the shape `get` / `getFromScopes` /
`hasInScopes` were given in step 1. It was filed under its own ID so that the "harmless today"
finding had somewhere to live.

*Recorded*: Phase 2 step 1, from the review of the `get` fix.
*Verified*: **measured**, 2026-09-13, on `dist/modules/eval-core` — table above; re-measured
2026-10-01 on master 955f0c9.

*Fixed* 2026-10-01 in [A4](#a4)'s commit; the fix, specs and probes are recorded there. This
entry's own rows are two cases of `eval-context.get-key.spec.ts` (`zzz` and `toString` answer
nothing with a plain scope pushed), and the old scopes step restored ahead of the resolver fails
them and the grid, 3 / 1126.

<a id="a5"></a>
## A5 — Every service-layer entry point discards the error it caught

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-30**; released
2026-10-01 in `eval-core` 0.7.0, tagged 724d831

Each caught and raised a new `Error` built from `error.message` alone. That replaced the thrown
object: its **type**, its `cause`, its stack and any property it carried were gone, and the caller
received a bare `Error` whose only surviving information was the message string.

**Twelve sites across four services.** The roadmap entry this replaced named six methods in two
services; that was an undercount, corrected on 2026-09-06 by grepping across `modules/`:

| Service | Method | Named in the old entry? |
| ------- | ------ | ----------------------- |
| `EvalService` | `simpleEval` | yes |
| `EvalService` | `eval` | yes |
| `EvalService` | `simpleEvalAsync` | **no** |
| `EvalService` | `evalAsync` | **no** |
| `CompilerService` | `compile` | **no** |
| `CompilerService` | `simpleCall` | yes |
| `CompilerService` | `call` | yes |
| `CompilerService` | `compileAsync` | **no** |
| `CompilerService` | `simpleCallAsync` | yes |
| `CompilerService` | `callAsync` | yes |
| `DiscoveryService` | `extract` | **no — service not mentioned** |
| `ParserService` | `parse` | **no — service not mentioned** |

It included the **parser**, so a syntax error lost its type and position properties the same way
an evaluation error did. `evaluate` / `evaluateAsync` never did this, so the loss was entirely in
the service wrappers. Rethrowing the original, or wrapping it with `cause` set, were the
candidates.

Phase 3 routed around it: `createEvalSignal` calls the free `call(fn, state)` so
`SignalContextWriteError` survives to the factory
([`signals/phase-3-plan.md` § 3.6.3](signals/phase-3-plan.md)). That routing did **not** save
[A6](#a6), and it stays, since the downstream peer ranges still admit the versions with the defect.

*Recorded*: [`signals/phase-3-plan.md` § 3.6.3](signals/phase-3-plan.md).
*Verified*: grep + source read, 2026-09-06.

*Fixed* 2026-09-30, by decision: **rethrow the original**. The twelve `try`/`catch` blocks are
deleted rather than reduced to `catch (error) { throw error; }`, which ESLint's
`no-useless-catch` rejects and which is the same thing. Three of the sites also replaced a thrown
non-`Error` with a fixed message (`'call'`, `'error in compile'`, `'error in callAsync'`); that
value now propagates as thrown too. Grep afterwards: no rebuild from `error.message` in
`actual/services/`.

Two facts the table did not show. `simpleEvalAsync` and `evalAsync` only ever caught a **parse**
error: their walk runs inside the `async` `evaluateAsync`, whose rejection never passes through the
service's `catch`. And that parse error is thrown synchronously, not rejected — unchanged.

Specs: `services.error-identity.spec.ts`, one case per site, twelve. A walk error is thrown from an
accessor on the context, so no call frame — and so no [A6](#a6) — stands between it and the
service; it must arrive as the same object, of its class, with its `cause` and an extra property.
A parse error must arrive as acorn's `SyntaxError` with `pos`. **Probes**, against 1100:
`CompilerService.call`'s wrapper restored — 1 failed, that case alone; `ParserService.parse`
wrapping with `cause` set, the rejected alternative — 6 failed, every parse-error case, since all
six reach the parser.

`eval-signals`' comment on why it uses the free `call` is put in the past tense.

*Coverage gap closed in [A6](#a6)'s commit*: the non-`Error` half was unpinned. A case for
`CompilerService.simpleCall` with a thrown plain object was added there, since it is reached
through a call; restoring only that site's `'call'` replacement fails it alone, 1 / 1102.

<a id="a6"></a>
## A6 — `safeCall` destroys the class of any error thrown *through* a call

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-30**; released
2026-10-01 in `eval-core` 0.7.0, tagged 724d831

[A5](#a5) one layer down, and on a path no caller can route around. `safeCall` caught whatever
the callee threw and re-raised a new `Error` with the message prefixed `Function call error: `
([`call-expression.ts`](../modules/eval-core/src/lib/internal/visitors/call-expression.ts)),
so an error crossing a call frame arrived as a bare `Error` carrying only a decorated message.
Same consequences as [A5](#a5)'s — but calling the free `call(fn, state)` did not help, because
this wrapper is inside the walk itself.

**Surfaced by Phase 6 step 3, which is where it stopped being abstract.** `applyErrorPolicy`
([`error-policy.ts`](../modules/eval-forms/src/lib/error-policy.ts)) guarantees that
`SignalContextWriteError` is re-thrown rather than routed through the consumer's error policy.
That guarantee held for a top-level assignment and **failed for an assignment nested inside a
call**: `[1].map(x => (country = "CA"))` reached `applyErrorPolicy` as a plain `Error`, failed
the `instanceof`, and was policy-routed to `undefined`. **No** custom error type survived a call
frame anywhere in the evaluator.

*Recorded*: [`forms/phase-6-plan.md` § 3.4](forms/phase-6-plan.md);
[`forms/phase-6-step-3-summary.md`](forms/phase-6-step-3-summary.md); `eval-forms`' README.
*Verified*: source read, 2026-09-06.

*Fixed* 2026-09-30, by decision: **rethrow the original**. The `try`/`catch` around the
`apply` is deleted; the security checks before it are unchanged. **A deliberate behaviour change
to a pinned spec**: `eval.service.call-security.spec.ts`'s "should handle function that throws
error" matched `/Function call error: Test error/` and now asserts the callee's own error by
identity. The message loses the prefix.

**The same fix is applied to `new`**: `new-expression.ts`'s `safeNew` rethrows what the
constructor threw instead of prefixing it `Constructor error: `. Spec: "should keep the class of a
custom error thrown by a constructor"; with the wrapper restored, it alone fails, 1 / 1110 on the
final tree. No spec pinned that prefix.

Specs: in `eval-core`, the rewritten case and "should keep the class of a custom error thrown
through a native call", `[1].map(x => fail(x))`, two call frames. In `eval-forms`, the case this
entry describes, in `evaluate-rule.spec.ts`: the nested assignment now reaches
`applyErrorPolicy` as `SignalContextWriteError` and is rethrown. **The `/signals` README case
pinned the old boundary** ("should route an assignment nested inside a call through `onError`
instead") and is rewritten to the new behaviour, not deleted; the README passage it covered now
says the guarantee holds through a call with `eval-core` 0.7.0 or later. Prose only, so F13's
block counts are unchanged. The root README's note quoting the prefix is put in the past tense.

**Probe** — the wrapping restored: `eval-core` 2 failed / 1101 (both new-or-rewritten cases),
`eval-forms` 2 failed / 267 (the new case and the rewritten README case), `eval-signals` 0 / 131.

<a id="a7"></a>
## A7 — `EvalScopeOptions.thisArg` is documented and never applied

**Package** core · **Kind** decision, then fix · **Status** **Retired — decided and fixed
2026-09-30**; released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831. **Rewritten 2026-09-29** from
"`EvalContext.getThis` reads the wrong object in its `priorScopes` loop", when the fix planned for
`eval-core` 0.6.1 was measured and did not hold

**What it was.** `EvalScopeOptions.thisArg` was declared in
[`eval-scope.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-scope.ts) and advertised
in the package README's Scopes section, and nothing in `eval-core`'s source read it. So a scope's
`thisArg` never became a call's receiver on any path.

**The documented path could not show it.** `ns.fn()` resolves `ns` through `EvalScope.get`, which
returns `scope.context` on a namespace match. The member hop `.fn` then reads a plain object, so
the call's receiver was the scope's own object, whatever `thisArg` said. Every case in the suite
set `thisArg` to that same object, so none could tell the difference. *Probed 2026-09-29*: the
README case with `thisArg` set to `{ name: 'Other' }` stayed green.

**`getThis`'s `priorScopes` loop was dead.** `getThis` is reached only for `this.fn()`, from the
member visitor's context branch
([`member-expression.ts`](../modules/eval-core/src/lib/internal/visitors/member-expression.ts)).
The loop tested `_original` rather than the scope, so it could match only a key the block before it
had already returned for. The one-word repair, `getContextValue(scope, key)`, fails to compile
(TS2345: an `EvalScope` is not a `Context`); the two-line repair, `scope.get(key)` returning
`scope.options.thisArg`, builds and is green, but reaches only `this.fn()` — the documented
`ns.fn()` never reaches `getThis`.

**The `lookups` loop returned the lookup function itself**, so `this.fn()` for a lookup-resolved
key ran with the resolver as `this`, and `eval-signals`' `signal-context.spec.ts` pinned it.

*Recorded*: this entry, rewritten from a failed fix for `eval-core` 0.6.1; originally
[`signals/phase-3-plan.md`](signals/phase-3-plan.md), Phase 3 step 2.
*Verified*: the one-word fix built 2026-09-29 (TS2345); the two-line fix run against `eval-core`'s
suite, 1078 green; the README case probed with a foreign `thisArg`, green.

*Decided and fixed* 2026-09-30: **`thisArg` is the receiver for methods reached through a scope**,
and a bare namespace still evaluates to the scope's object. Both hold, so no option needed
choosing between them. Three changes:

- **`ns.fn()`** — `call-expression.ts`'s `scopeReceiver` maps a call's receiver to a prior scope's
  `thisArg` when the receiver **is** that scope's object, by identity; the first scope holding the
  object answers. It is done at the call and nowhere earlier, because `evaluateMember`'s first slot
  is also the target of `ns.x = v`, and a write belongs on the scope's object. One length check
  per member call when no prior scope is registered.
- **`this.fn()`** — `getThis`'s prior-scope loop asks `scope.get(key)` and returns that scope's
  `thisArg`, undefined when it sets none, so the member visitor's fallback applies as before.
- **Lookups** — the loop is deleted: a lookup is a resolver, not an object holding the key, so
  `getThis` answers nothing and `this.fn()` receives the fallback, the context.

Not changed: a bare `fn()` still receives the context, and the member visitor's `EvalScope`
branch — an `EvalScope` *instance* used as a value — still passes the instance.

Specs: `eval.service.scope-this.spec.ts`, seven cases — (a) `cat.whoAmI()` with a foreign
`thisArg` → it; (b) unset → the scope's object; (c) `this.fn()` through a global scope → `thisArg`;
(d) `cat` → the scope's object, and `cat === self` holds; (e) `this.fn()` through a lookup → the
context, not the lookup; and two guards, `cat.name` reads and `cat.label = "x"` writes the scope's
object, not `thisArg`. The README's Scopes example now uses `thisArg: { name: 'Mister Whiskers' }`
and prints `'Mister Whiskers says meow 3 times'`, and its caveat is gone. `eval-signals`'
`signal-context.spec.ts` case that pinned the lookup receiver is rewritten to the new one: no
receiver from `getThis`, and `this.probe()` receives the context.

**Probes**, against 1109: `thisArg` ignored on both paths — 3 failed, (a), (c) and the README
case; the rejected alternative, `EvalScope.get` returning `thisArg` for the namespace — 5 failed,
(d), both guards, (a) and the README case; the lookups loop restored — 1 failed, (e), and
`eval-signals` 1 failed / 131, the rewritten case.

<a id="a8"></a>
## A8 — `EvalService._activeStates` grows unboundedly

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-25, released 2026-09-26**, both
halves; `eval-core` 0.6.0, tagged f26f987, under `CHANGELOG.md`'s `[eval-core 0.6.0]`

**This entry is why this file exists.** See [R4](#r4) for the cross-references that hid it.

**Fixed in two steps.**

- **Step 1** ([`docs/a8/plan.md`](a8/plan.md), 2026-09-24) made `simpleEval` and
  `simpleEvalAsync` remove their state from the set when the call returned. That included a walk
  that throws and a promise that rejects.
- **Step 2** ([`docs/a8/step-2-plan.md`](a8/step-2-plan.md), 2026-09-25) deleted the set.
  `EvalService` now keeps no state and no context. `ngOnDestroy` marks the service destroyed and
  drains nothing. Who owns a state that `createState` hands back was an ownership decision, taken
  in [`docs/a8/step-2-decision.md`](a8/step-2-decision.md). It compared three options: the caller
  owns the state, weak tracking, and an explicit release. It chose the first.

**Step 2 withdrew a published promise.** From 0.3.0 to 0.5.0, destroy cleared the hook
registries of the states `createState` built, including the caller's `options.hooks`. Withdrawing
it reverses [A21](#a21)'s decision to keep the clear. It also removes the drain that
[A17](#a17) reordered and the `catch` that [B3](#b3) silenced.

**Coverage.** Step 1's cases 1.1–1.5, 1.7 and 1.8 and step 2's 2.1–2.9 cover it, in
`eval.service.memory-leaks.spec.ts` and `eval-signal.memory.spec.ts`. Every wrong implementation
each plan names was run against every case, and the results were read case by case. The tables
are in `plan.md` § 2.5 and `step-2-plan.md` § 6. Step 2's 2.10 pins the destroyed flag, not
retention. It was added after that run, from the code-reviewer's finding, and was probed against
P5 alone.

*The rest of this entry is the defect as recorded, with the notes each step added.*

Step 1 carried [A17](#a17) and [B3](#b3)'s `ngOnDestroy` site too, as this entry asked. It also
narrowed one published sentence. Destroy clears an adopted hook registry only for states that
`createState` handed back, because it no longer reaches a `simpleEval` state. That is a trade
with a small cost. A hook that stores `event.state` where only the hook can reach it now keeps
that state for as long as the caller keeps the registry, and no longer only until destroy. The
plan's § 2.2 weighs it. *Step 2 declined weak tracking, which could have reopened this. It
extended the same trade to `createState` states instead, so destroy clears no registry at all.*

`EvalService.createState` adds every state it builds to a strong `Set` (`eval.service.ts:45`),
and nothing removes an entry except `simpleEval`'s and `simpleEvalAsync`'s own. The set is
drained only in `ngOnDestroy` (`:53`). *(Both lines as of `10dd98f`. Step 2 deleted both, so
they are no longer linked.)* `EvalService` is `providedIn: 'root'`, so that is application
teardown.

*(Until step 1. Then true of every `createState` state the caller dropped, until step 2.)* Every `simpleEval` /
`simpleEvalAsync` call therefore retains its `EvalState` — and with it the
AST, the value stack, the trace and anything a hook closure captured — for the life of the
application. The cost grows with uptime and with call volume, which is the profile of a
long-running form or dashboard: exactly this repository's stated audience.

**"The trace" became a much larger term in Phase 2 step 5, and [A12](#a12)'s fix shrank it
again.** It used to be bounded by the expression's node count; with `for` loops registered, one
retained state could hold hundreds of thousands of trace items. **As of A12's fix — released 2026-09-26,
`eval-core` 0.6.0 — it is bounded by `maxTraceItems`, default 10,000**, so a
retained state holds ~0.5 MB of trace rather than ~34 MB, and `EvalService.ngOnDestroy` now
clears it *(until step 2, which removed that drain with the set)*. The two entries still compound, just by two orders of magnitude less: A12 is how much
one state can hold, A8 is why it is never released. **A8 is unchanged by that fix** — the `Set`
still grows, every `simpleEval` still retains its state *(until step 1; `createState`'s did
until step 2)*, and the trace is only one of the things a retained state keeps.

**It compounds two other entries.** [`phase-1-plan.md:1095`](side-effects/phase-1-plan.md)
records that because the `Set` is strong, frames abandoned on the open-node stack keep their AST
nodes alive "for the life of the service, which is exactly the retention `ngOnDestroy` is called
to prevent". And a leaked scope from [A9](#a9) sits on a context those retained states reference.

**Covered, in a way a fix must plan for.** *(As found by step 1, 2026-09-24: the first spec was
replaced. The second went red only in its `simpleEval` cases, and its control stayed green
because it goes through `createState`. The third went red at its count and was re-driven through
`createState`, which is what its comment always described, so it stays at 5. The control and
that count were step 2's red specs. The plan's § 1.3 has each. Step 2 deleted the first and
replaced the second, as the notes below say.)* Three specs read the private
field:

- `eval.service.memory-leaks.spec.ts:84-90` *(as of `c0c385b`; replaced by step 1, so no longer
  linked)* asserts the set is non-empty before `ngOnDestroy` and empty after — so it pins the current
  behaviour in both directions. *Step 1:* it fed the set through `simpleEval`, went red at its
  first assertion, and was replaced by the plan's criterion 1.6, which asserts the reverse.
- The same file's `contexts passed in are not retained (A20)` block *(added 2026-09-24 by
  [A20](#a20)'s fix)*. Its `collect` helper clears the set by hand before forcing a GC, and its
  control case, "should still retain the context through A8's state set", asserts that a
  context **is** still retained when the set is left alone. A fix turns the control red. It is
  deleted then, together with the clear in `collect`. *Step 1:* its two `simpleEval` cases now
  run with the set intact. The control goes through `createState`, stayed green, and (`:288`) is
  step 2's to turn red. `collect` keeps its clear for the two `createState` cases. *Step 2:* the
  control and the clear were deleted, as planned. Every case now runs on the service as it is,
  and a positive control (2.3), a context whose state the test holds, replaced the old one.
- `eval-signal.memory.spec.ts:80-114` uses it as a **contrast probe** in a different library: it
  is the reason `createEvalSignal` builds its states through `CompilerService` instead. A fix turns
  that spec red at one named line, and the comment above it says so. *Step 1:* it drove
  `simpleEval` and went to `0`. Its comment said `createState`, so it now drives `createState`,
  and it stays at `5` until step 2 (`:113`). That count is a symptom. The behaviour it guards is
  the `0` above it. *Step 2:* with no field to read, the case was replaced by a behavioural one
  (2.9). Each recompute's state is caught as a `WeakRef`, and all five must be collected except
  one the test holds. It is not a spy on `EvalService.createState`, which would pin a choice whose
  reason had gone. *(Line numbers here are as of `10dd98f`, and are no longer linked.)*

So a fix is not one file. It is: drain the set at the end of each evaluation (or make it weak),
update the `eval-core` specs that pin non-drainage, and update the `eval-signals` contrast probe
whose whole point is that the two paths differ.

**A8 now also holds every context passed in.** *(Added 2026-09-24, by [A20](#a20)'s fix.)* A
state holds its context, so each context passed to `createState`, `simpleEval` or
`simpleEvalAsync` stays reachable through the state in this set until destroy. `_activeContexts`
held the same objects for the same lifetime, which is why deleting it changed nothing a consumer
can observe, except for a `caseInsensitive` context, where the state holds a copy. **So this fix is the one that makes contexts collectable, and its `CHANGELOG.md`
entry should say so.** A20's control case observes that retention. The `eval-signals`
documented pattern, `simpleEval(expr, createSignalContext(...))`, is the case worth naming:
each signal context passed that way is kept, with the signal sources its lookup closure reads.
*Step 1 released every context passed to `simpleEval` and `simpleEvalAsync`, that pattern's
included, and its `CHANGELOG.md` entry says so. Step 2 released every context passed to
`createState`, once the caller drops the state.*

**The step that fixes this carries [B3](#b3) and [A17](#a17) too.** *(Step 1 carried both.)* All three are in
`ngOnDestroy`, and B3 already asks to be revisited with A8. **[A20](#a20) and [A21](#a21) are the
same method's siblings**, filed 2026-09-23. Both are fixed, and neither needed this fix. A21 was
fixed in `c86b586`. A20 deleted `_activeContexts` ([`docs/a20/plan.md`](a20/plan.md)). *(Corrected
2026-09-24, twice. It first said "A20 should ride with this fix". Then it said A20's fix stood
alone. The code change does stand alone, but the benefit depends on this fix: before A20's fix,
the second set would have kept every context alive even after this set was fixed.)*

*Recorded*: originated [`side-effects/phase-1-plan.md:1095`](side-effects/phase-1-plan.md) and
[`side-effects/step-2-summary.md` § 4.2](side-effects/step-2-summary.md); stated as its own item
in [`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md); carried forward in all six
`docs/forms/step-*-summary.md` § 5.3 tails.
*Verified*: source read, 2026-09-06. Step 1: red first and probed, 2026-09-24
([`docs/a8/plan.md`](a8/plan.md) § 2.5). Step 2: red first and probed, 2026-09-25
([`docs/a8/step-2-plan.md`](a8/step-2-plan.md) § 6).

<a id="a9"></a>
## A9 — The arrow-scope leak's root cause: no `try`/`finally` at either push site

**Package** core · **Kind** fix · **Status** **Retired — fixed** — Phase 2 step 0, 2026-09-11; released in
`eval-core` 0.4.0

**Fixed.** Both sites now push, then open a `try` whose `finally` pops. The rest of this entry is
the record of what the defect was and why it took five phases to get a home; it is no longer
work. What the fix closes and what it does not:

- The **escaped-closure residual** below is closed. It was the part no downstream containment
  could reach, because the arrow's push happens when the closure is *called*, which may be after
  any recompute boundary has run its own `finally`. A pop that travels with the push does not
  care when the call happens.
- The two downstream containments — `eval-signals`' snapshot-and-restore around each recompute,
  `eval-forms`' `evaluateRule` choke point — are **redundant but not removable**, and step 0 did
  not touch them. Both unwind with `while (scopes.length > depth) { pop() }`, so with the leak
  closed the loop body simply never runs: no double-pop, no new failure mode. They stay because
  both packages declare `"@zvenigora/ng-eval-core": "^0.3.0"`, a range that still admits the
  **leaking** 0.3.0 — so a consumer on `eval-signals` 0.1.0 + `eval-core` 0.3.0 is a supported
  installation that the guard is still load-bearing for. Removal is gated on raising both peer
  ranges, which is a breaking release of two packages. They also remain the downstream backstop
  for the three push sites Phase 2 still adds.
- **Step 0 left the branch red, on purpose; step 0b closed it.** Two pre-existing downstream specs
  pinned the leak as known behaviour and failed because it is fixed — `eval-signals`'
  `signal-context.spec.ts:248` and `eval-forms`' `field-schema.spec.ts:347`. Editing either from a
  step scoped to `eval-core` is what § 2 forbids, so the handling was
  [`statements/phase-2-plan.md`](statements/phase-2-plan.md) **step 0b**, which also covered three
  containment specs that had gone vacuous and four downstream comments that had gone false. The
  second of those mattered most: those specs are the downstream detector for a missing `finally`
  at the push sites steps 1, 2 and 5 add. **Done, 2026-09-12** — all three restored, and all
  three driven now through `EvalContext.push` / `pop` rather than through the fixed defect,
  since a public push on a published class is the one route no visitor fix can close. The red
  sets, named rather than counted, from whole-suite runs:
  - `evaluate-rule.ts`'s unwind loop removed → **exactly 2**: `evaluateRule` *should unwind a
    stranded scope to the caller's depth mark, not to zero* and *should resolve its own source
    key when the same rule is invoked again after a strand*.
  - the same loop changed to drain to zero rather than to the mark → **exactly 1**: the
    depth-mark case. This is what makes the caller-pushed `marker` scope load-bearing rather
    than decorative.
  - `eval-signal.ts`'s unwind loop removed → **exactly 1**: *should contain a scope stranded
    through the published push to the recompute that made it*.
  - step 0's own `finally` reverted in `arrow-function-expression.ts` → **exactly 2**, both in
    `signal-context.spec.ts`, and **zero** in `eval-forms` — which is the measurement behind
    the escaped-closure note below.
- **What step 0b found about `field-schema.spec.ts` § 3.4.1** — recorded because the plan
  anticipated the opposite outcome and reserved a backlog entry for it. That block asserted
  "one `EvalContext` per field" *through* the leak, and with the leak gone its surviving case
  passed under a single shared context (measured, by hoisting `createFieldContext` out of
  `bindFieldProperties`' loop). The property is **not** ungated: a replacement observable was
  found that needs no defect at all. An arrow's parameter scope is on its field's context
  *legitimately* for the duration of the body, so a form control whose value is a function,
  called as that body, opens a window in which another field can be read — it resolves against
  the shared scope or not, and that is the discrimination. The case carries a positive control
  (the same window read through the *owning* field, which must see the pushed binding) so that
  a run in which no scope was pushed cannot pass it silently.
- **The escaped-closure claim is now gated, and was briefly not.** This entry, the plan and two
  containment docblocks all assert the escaped-closure residual is closed. Step 0b's review found
  nothing asserting it: `arrow-function-expression.spec.ts` drives the arrow as an IIFE *inside*
  the walk in all its cases, and the one place in the repository that stored an escaped closure,
  called it after the walk returned and made it throw was `field-schema.spec.ts`'s leak case —
  retired earlier in 0b because the leak it observed was gone. `signal-context.spec.ts` gained a
  case for it (*should contain the scope of an arrow that escapes the walk and throws when
  called*), confirmed red when step 0's `finally` is reverted. Worth keeping as a pattern: the
  step that *removes* the last observation of a path is the step most likely to be the one
  newly asserting something about it.
- **Two stale comments left outside 0b's closed file list**, recorded here rather than edited,
  because the list is what § 2's exception is scoped to and widening it from inside the step is
  the condition the plan calls stop-and-replan. Both are present-tense claims that step 0
  falsified, of exactly the class 0b was convened to remove, and nothing in `run-many` flags
  either:
  - `modules/eval-signals/README.md` § "The arrow-scope guard covers `createEvalSignal`, not a
    raw context" — all three of its clauses are now false, and the third ("an arrow function
    that escapes the walk and throws when you call it later" still leaks) is contradicted by a
    comment 0b itself wrote in `eval-signal.ts`. This is **published prose in a shipped
    package**, so it is the most visible of the family. `readme-examples.spec.ts` does not
    reach it: that gate runs snippets, it does not check what surrounding prose asserts.
  - `modules/eval-forms/src/lib/field-context.ts` — motivates one-context-per-field with "an
    arrow function's leaked scope, say". Hedged rather than false, but its `/reactive` twin in
    `field-schema.ts` was rewritten in 0b to drop that framing, so the shared core and the
    adapter now explain the same decision differently.

  Also noted and not acted on: `.claude/agents/code-reviewer.md` carries
  `pattern.ts:110-113` for the scope push, which step 0 moved. Repository tooling, not a
  library, and outside every list this phase has.
- It is a **behavioural change to a published path**, carried by Phase 2's `0.4.0` bump: on a
  reused `EvalContext`, a throwing arrow body used to leave a scope that shadowed a source key of
  the same name for the life of that context, and no longer does.

**Where the detectors are.** `arrow-function-expression.spec.ts` (three cases, on a *reused*
`EvalContext` — a fixture building its context inline cannot observe this) and `pattern.spec.ts`'s
`ObjectPattern` fixture. Reverting each `finally` separately was run, and the red sets are
disjoint: the arrow revert reddens the three arrow cases and no pattern case; the pattern revert
reddens the two `ObjectPattern` cases and no arrow case.

**The idiom, for the three push sites Phase 2 still adds.** The `try` opens on the line *after*
the push, never around it. Both sites write `st.context?.push(...)`, so a `try` opened one line
early pairs a `finally` pop with a push the optional chain had skipped — and, at the arrow site,
swallows a throw from `evaluatePatterns` into a pop as well. Neither failure is visible to any
suite. Recorded in [`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 4 step 0.

---

The defect, as it stood:

The third stack invariant in `CLAUDE.md`: exactly one `st.context.pop()` per
`st.context.push()`, on every exit path including the ones an exception takes. Only two visitors
pushed scopes and **neither used `try`/`finally`**, so a body that threw skipped the pop:

- [`arrow-function-expression.ts:16-18` at `ef5ac2b`](https://github.com/Zvenigora/ng-eval/blob/ef5ac2b4be987577a868baf2cd48739d5d55a1be/modules/eval-core/src/lib/internal/visitors/arrow-function-expression.ts#L16-L18)
- [`pattern.ts:110-113` at `ef5ac2b`](https://github.com/Zvenigora/ng-eval/blob/ef5ac2b4be987577a868baf2cd48739d5d55a1be/modules/eval-core/src/lib/internal/visitors/pattern.ts#L110-L113)

**Why this outlives the walk.** The value stack and the open-node stack are on `EvalState`, which
`evaluate` builds per walk and discards. The scope stack is on `EvalContext`, and one
`EvalContext` can back any number of evaluations. A leaked scope therefore outlives the walk, and
every later evaluation on that context reads it first — scopes are step 1 of `EvalContext.get`'s
resolution order. Nothing drains it. One throwing arrow body permanently shadows a source key of
the same name.

**Recorded everywhere as a containment, nowhere as a defect.** This is the entry's history and
the reason it had no home:

| Where | What it says |
| ----- | ------------ |
| `CLAUDE.md` | States the invariant and both sites. Not a work item |
| [`signals/phase-3-plan.md` § 3.8.3](signals/phase-3-plan.md) | `eval-signals` snapshots `scopes.length` and pops back in a `finally` around each recompute |
| [`forms/phase-4-plan.md` § 9.1](forms/phase-4-plan.md) | Warns the `/signals` path would not inherit that containment |
| `ROADMAP.md` Phase 5 | Names it as an open question for `callAsync` |
| `ROADMAP.md` Phase 6 | Named it as the phase's one correctness precondition |

Two libraries now carry workarounds for three lines of core, and each workaround is a correct
implementation that a tidying edit can silently disable.

**Premise retired — the Phase 6 half is discharged.** Phase 6 built the choke point
(`evaluateRule`), so the `/signals` precondition is met and `ROADMAP.md`'s Phase 6 section should
not be read as pending work. What is *not* discharged is the core defect, and the containments
remain partial: the **escaped-closure residual** survives all of them. `arrow-function-expression`
pushes its parameter scope when the closure is *called*, not when it is visited, so
`createEvalSignal('x => x.foo()', ctx)` hands the consumer a function whose push — and skipped pop
— happen after the recompute's `finally` has run. That leak is permanent on the shared context
and is not containable at a recompute boundary by construction: there is no recompute in progress
when it happens.

**Fixing it in `eval-core` is the only thing that closes the residual**, and `phase-3-plan.md`
§ 3.8.3 says so in as many words while ruling it out of *that* phase's scope. Phase 2 step 0 is
that fix.

*Recorded*: `CLAUDE.md`; [`signals/phase-3-plan.md` § 3.8.3](signals/phase-3-plan.md);
[`forms/phase-4-plan.md` § 9.1](forms/phase-4-plan.md).
*Verified*: source read, 2026-09-06 — no `try` at either site. Measured on the built package,
[`statements/phase-2-plan.md` § 1.3](statements/phase-2-plan.md): `scopes.length` **1** after a
throwing arrow body, and the later read returning the shadowed `'SHADOW'` rather than `'SOURCE'`.
*Fixed*: 2026-09-11, Phase 2 step 0, with both reverts probed separately.

---

<a id="a12"></a>
## A12 — `EvalResult.trace` grows per loop iteration, so the iteration budget bounds time and not memory

**Package** core · **Kind** fix / decision · **Status** **Retired — fixed 2026-09-23, released 2026-09-26**;
`eval-core` 0.6.0, tagged f26f987, recorded under [`CHANGELOG.md`](../CHANGELOG.md)'s
`[eval-core 0.6.0]`. **Created by Phase 2 step 5**, found in its review

**Fixed.** `maxTraceItems` bounds the trace, defaulting to 10,000; `EvalResult.traceTruncated`
and `tracePushCount` report what the bound cost; `EvalResult.clearTrace()` is the only reset,
and `EvalService.ngOnDestroy` calls it. *(Until [A8](#a8)'s step 2, 2026-09-25. That step
removed the destroy drain before it shipped, because the service no longer keeps the states it
drained. `clearTrace()` is now called by nothing in the library, and a caller who wants a trace
emptied calls it.)* The rest of this entry is the record of what the defect was and what
measuring it produced.

**The measurements stand as three figures, not one, and none corrects another.** This entry's
original "roughly 45 MB" was taken **without** a forced collection and says so. A measurement
with one, 2026-09-17, gave **34.4 MB**. The same conditions gave **34.2 MB** two days later. The 45 is a different
measurement, not a wrong one; the 34.4 and the 34.2 are the same measurement on two days.

**What the fix did not close, and it is not in this entry.** Exit criterion 6 of the step that
shipped the bound could not detect its own named wrong implementation — see [A19](backlog.md#a19). That is
a defect in a criterion rather than in the trace, which is why it has its own entry.

`pushVisitorResult` appended to `st.result.trace` on **every** push, unguarded, and
`EvalResult.start()` did not reset the trace — the array is built once in the constructor and
accumulated for the life of the state.

Before Phase 2 step 5 the trace was bounded by the expression's **node count**. With
`ForStatement` registered it became bounded by **iterations × nodes**, a different order of
quantity from a fixed expression — and it is now bounded by `maxTraceItems`. Measured against
`dist/` after `build:production`, on the code that step shipped:

| source | trace items |
| ------ | ----------- |
| `for (let i = 0; i < 100000; i++) { i }`, `maxIterations: Infinity` | **700,007** |
| `for (;;) { i }`, default budget, to the throw | **300,000** |
| `for (let i = 0; i < 1000; i++) { i }` three times on one state | 7,007 → 14,014 → 21,021 |

Roughly 45 MB of heap for the first, though heap deltas measured without a forced collection are
soft; the **item counts are the firm number** and are what a fix would have to bound.

**Two things made this worth an entry rather than a shrug.** The trace **survived the throw** —
where the budget *did* stop a loop, as in the `for (;;)` row, the runaway case paid the whole
allocation and *then* raised, so the budget converted a hang into a large allocation plus an
error rather than into a cheap error. And [A8](#a8) keeps every `EvalService`-created state in a
strong `Set` for the life of the application, so under `simpleEval` that memory is retained. A8
already said a retained state keeps "the trace"; what it could not anticipate was that one
expression could put ~700 k items in one.

**`maxIterations: Infinity` was the sharp edge.** The plan's § 3.4 offers it as "a caller may
raise it, or set `Infinity` and own the consequence", and the consequence it had in mind was a
hang. With the trace unbounded the consequence was an out-of-memory instead. That is no longer
so: `maxTraceItems` bounds the trace whatever the budget does, and the option's docblock now
says that rather than the warning it used to carry.

**Not fixed in step 5, and the reason is scope rather than difficulty.** Capping or per-run
resetting `EvalTrace` changes what `EvalResult.trace` contains on an already-published path —
a versioned-release decision, and one that belongs with whoever decides what the trace is *for*
(it is the dependency-tracking channel `eval-signals` and `eval-forms` were built against). Step 5's
file list does not admit `eval-result.ts` or `visitor-result.ts`, and widening it under a
performance observation is the move this register exists to prevent.

> **Two of this entry's own reasons for deferring were measured false before the fix** (2026-09-19,
> by grepping all three packages for readers of the trace and reading both READMEs), and both are
> quoted above, so a reader working from the deferral reasoning should stop here.
>
> - **The trace is not the dependency-tracking channel.** That is `createDependencyTracker`
>   installed on `EvalHooks`, consuming `read` events. **No library code in any of the three
>   packages reads the trace** — every non-spec hit outside `eval-core` is a doc comment. The
>   deferral rested on a downstream owner who does not exist.
> - **Nothing documents accumulate-across-runs.** The root README's example is `createState` +
>   **one** `eval`, and the package README mentioned the accumulation only to call it a wart.
>   What *is* documented as per-state running totals is `nodeTimings`, a different accumulator.
>
> Neither changes the deferral's *conclusion* — step 5 was right not to widen its file list —
> but both were load-bearing in the argument for it, and they are the kind of claim a retired
> entry carries forward unchallenged.

**Options, for whoever takes it**: a cap with a documented truncation marker; a
`trace: false` option; resetting per `evaluate` in `start()` (which changes the documented
accumulate-across-runs behaviour the `createState` + repeated `eval` style relies on); or
recording loop bodies once rather than per iteration. None is obviously right, which is why this
is filed rather than guessed at.

*Found*: 2026-09-14, Phase 2 step 5 review.
*Measured*: 2026-09-14 against the built package, numbers above, re-run independently of the
review that raised it; re-measured against the built 0.5.0 bundle **2026-09-17, all three item
counts reproducing exactly** (700,007 / 300,000 / 7,007 → 14,014 → 21,021), and **2026-09-19,
the 700,007 row only**, with the heap at 34.2 MB. Attributed per date rather than to both,
because only the first run covers all three.
*Recorded*: this entry; [`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts)'s
`maxIterations` docblock; cross-referenced from [A8](#a8).
*Fixed*: first implemented 2026-09-19 in two steps, each probed — ten wrong implementations
against the bound and five against `clearTrace()`. The probe record, with which cases went red
under each, is the header of
[`trace-bound.spec.ts`](../modules/eval-core/src/lib/internal/visitors/trace-bound.spec.ts).
Default path measured unchanged at 598 → 588 ns/walk; the 100k loop 98 → 49 ms and 34.2 →
0.6 MB. Replayed onto this line 2026-09-23 as three steps, recorded in
[`docs/trace2/`](trace2/step-1.md).

---

<a id="a16"></a>
## A16 — `EvalTraceItem.start` and `end` are declared and never set

**Package** core · **Kind** decision · **Status** **Retired — decided and documented 2026-09-24,
released 2026-09-26**; `eval-core` 0.6.0, tagged f26f987. Recorded under
[`CHANGELOG.md`](../CHANGELOG.md)'s `[eval-core 0.6.0]`. Opened
2026-09-19, deliberately not decided by the [A12](#a12) fix

**Decided 2026-09-24, by [`docs/trace-surface/plan.md`](trace-surface/plan.md): documented as
reserved.** Both fields now have JSDoc saying nothing sets them. It points at `expression` for
source text and at `EvalState.nodeTimings` for timing. Each field keeps its type. The three
options, with their costs:

- **Document as reserved** (chosen). Two docblocks that ship in the `.d.ts`, and one
  `CHANGELOG.md` line. No shape change, so no bump of its own; it rides the next release. It
  closes neither other option: filling an optional field later is additive, and dropping it later
  is the same breaking change it is today.
- **Populate.** The declaration carries no meaning to populate *with*, so a meaning has to be
  chosen first. Source offsets would add two properties to every kept item, written on the
  per-node push path that `performance.spec.ts` gates. Timestamps would add a clock read per push.
  That is the timing hook's job, and it sits behind `trackTime` for that reason. Either is a
  feature nobody has asked for.
- **Drop.** Breaking for code that assigns them, such as a consumer building `EvalTraceItem`
  literals for a test double. That needs a breaking release, and it gains nothing a reader of
  the JSDoc does not already have.

**Why Retired, when [D7](backlog.md#d7) and [A15](backlog.md#a15) stay Open.** D7 accepts a defect that stands. The
defect here was two fields that look like a timing facility and are not one, and the JSDoc is
what removes it. Nothing is left pending and there is no reopen condition to watch. That is
[F4](#f4)'s root README precedent, decided, dropped and Retired. Populating them would be a new
feature, and it would get its own entry.

[`eval-trace.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-trace.ts)'s
`EvalTraceItem` declares `start?: number` and `end?: number`. **Nothing in any of the three
packages ever assigns either** — grepped, not assumed. `EvalTrace.add` sets `type`, `value` and
optionally `expression`, and no other writer exists.

Both are optional, so nothing breaks either way: a consumer reading them gets `undefined`, which
is what the type already promises. Removing them from an exported interface **is** a breaking
change for a consumer who assigns them; keeping them costs nothing but leaves two fields that look
like a timing facility and are not one.

**Not decided by the A12 fix, and the reason is the register's own.** It is a published-surface
question with no connection to memory, and riding it along inside a bounding change is exactly
what [A12](#a12)'s own deferral paragraph declined to do with the bound itself. Whoever decides it
should decide it as a surface question: drop them in a major, populate them, or document them as
reserved.

*Recorded*: this entry; the A12 fix listed it as out of scope.
*Verified*: grepped across all three packages 2026-09-17 — `EvalTrace.add` is the only writer of
an `EvalTraceItem`, and it sets neither field. Re-grepped 2026-09-24 with the same result.
`eval-trace.ts` has one commit in its history, `c1d6c05` (2024-01-11), which declared both
fields, so `add` has never set them. `git log -G "trace\.(push|add)\(" -- modules` returns
`c1d6c05` and `e6192cd`, and both write through `add`, so no other writer has ever existed.
*Fixed*: 2026-09-24, the docblocks in `eval-trace.ts`. After `build:production` they are present
in the built `.d.ts`.

---

<a id="a17"></a>
## A17 — `EvalService.ngOnDestroy` drains under one `try`, so one throw skips the rest

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-24, and never
released**: [A8](#a8)'s step 2 removed the drain before it shipped, so no `CHANGELOG.md` entry
describes this fix — opened 2026-09-19, found reviewing the [A12](#a12) fix's
`clearTrace()` change

**Its subject is gone. The drain it reordered was then removed by [A8](#a8)'s step 2, on
2026-09-25, before either change shipped.** The service no longer keeps any state, so
`ngOnDestroy` has nothing to drain, and the three cases below were deleted with it. The entry
stays retired: there is no drain left to fail.

**Fixed** by [A8](#a8)'s step 1 ([`docs/a8/plan.md`](a8/plan.md) § 2.1), using the second option
below. The order is now the value stack, the hook bookkeeping, the hook registry, and then the
trace. The state's own structures go first, then the two caller-owned drains, with the one that
matters for retention ahead of the other. Three cases in `eval.service.memory-leaks.spec.ts`
freeze the trace and destroy. Two of them failed against the old order. Each probe order turned
exactly its own case red: trace before hooks, and bookkeeping left last. The third case pins the
per-state `catch`, which [B3](#b3)'s change had to keep.

*(The next paragraph describes the drain as step 1 left it. It lapsed with the drain in step
2.)* **One exposure remains, by choice.** A registry whose `clear` throws, for example a frozen one,
still skips the trace drain for that state. The two caller-owned drains cannot both come last.
The hook clear goes first because it is the one this entry says matters. A `try` per drain
would close this too. It was not chosen, because the throw can only come from the caller's own
object and costs only that object.

*The rest of this entry is the defect as recorded.*

[`eval.service.ts`](../modules/eval-core/src/lib/actual/services/eval.service.ts)'s `ngOnDestroy`
drains each state inside **one** `try`/`catch`: the value stack, then the trace, then the hook
registry, then the hook bookkeeping. *(Four since [A21](#a21)'s fix, 2026-09-23, which deleted a
fifth, the context drain, between the trace and the hook registry.)* A throw from any of them lands in the single
`catch`, which logs and moves to the next **state** — so every drain *after* the throwing one is
skipped for that state.

**The order makes it worse than it sounds.** The hook-registration drop is last but one, and the
method's own comment identifies it as the drain that matters most for retention: a registry the
caller still holds keeps every state its closures captured reachable. A throw in an earlier drain
silently costs exactly that.

**Two of the four drains call into objects the caller owns**, which is where a throw comes
from. *(Corrected twice. It first said three, counting `state.context.clear()`. The first
correction, 2026-09-23, dropped it to two on the ground that the call never runs, because
`EvalContext` has no `clear` method. That was nearly right. The call did run for a caller's
`EvalContext` subclass that declared one, and [A21](#a21)'s spec observed it. A21's fix then
deleted the call, so two stands.)* `hooks.clear()` has carried that exposure since
before the trace work — [`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts)'s
`hooks` docblock says an adopted registry is "adopted as-is and never cloned" and that this
method empties it *(it no longer says the second, since [A8](#a8)'s step 2)*. `clearTrace()` (`eval-core` 0.6.0) is the second: `EvalResult.trace` is a
published getter handing out the live array, so a consumer who `Object.freeze`d it makes
`this._trace.length = 0` a `TypeError` under module strict mode.

**Not a defect in the change that surfaced it** — it is a property of the method, and it predates
that change. Filed here rather than in a step summary because the next person to touch
`ngOnDestroy` will look here.

**Options**: a `try` per drain; or order the drains so the caller-owned calls come last; or keep
one `try` and document that a hostile caller can skip the rest. The second is the cheapest and
does not change the method's shape — but note it has to move `hooks.clear()` too, and that is
the drain this entry calls the one that matters, so "order the caller-owned calls last" and
"protect the hook drop" are the same requirement rather than two.

*Recorded*: this entry.
*Verified*: source read 2026-09-19. Not exploited — no probe was written, and the frozen-array
route is reasoned from `trace`'s published getter rather than demonstrated. **Demonstrated
2026-09-24** by the fix's cases 3.1 and 3.2, which freeze the trace and failed against the old
order ([`docs/a8/plan.md`](a8/plan.md) § 2.5).

---

<a id="a20"></a>
## A20 — `EvalService._activeContexts` grows with every distinct `Registry` context

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-24, released 2026-09-26**;
`eval-core` 0.6.0, tagged f26f987, under `CHANGELOG.md`'s `[eval-core 0.6.0]` — recorded 2026-09-23, found while sizing [A8](#a8). **Rescoped 2026-09-24 by [A21](#a21)'s
fix**: wider, because every `EvalContext` enters the set too, and simpler, because the set can
now be deleted

**Fixed** by [`docs/a20/plan.md`](a20/plan.md). The field, both `add`s and the `clear()` are
deleted. The service keeps no reference of its own to a context passed in, and since [A8](#a8)'s
step 2 it keeps no state that could hold one either. Five cases in
`eval.service.memory-leaks.spec.ts` show each context kind being collected by a forced GC, and all
five went red against the old code. The instrument is a `WeakRef`, with `gc` reached through
`v8.setFlagsFromString` and `vm`, so [A19](backlog.md#a19)'s "Jest has no `global.gc`" is no obstacle for
a retention-shaped defect. A19's own conclusion is unaffected: its defect is shaped by
allocation, not retention. A19's "What Jest can do" records the technique and that distinction.

**The probes found the plan's own criterion backwards.** The draft said case 4, an
`EvalContext`, excluded "narrowing the set to `Registry` instances". Running that
implementation turned cases 1–3 red and left case 4 **green**: a set narrowed to registries
still holds registries. Case 4's real target is the opposite fix, one scoped to A20's title,
which exempts registries and keeps tracking everything else. The plan was corrected in the same
commit. **The practice is worth keeping, not the instance.** It surfaced only because every
wrong implementation was run against every case, and the result was read per case. The suite
did go red under that probe, so "the named wrong implementation makes the suite fail" would
have passed the draft. The same approach found that case 2 is not uniquely load-bearing: its
probe also turns case 4 red. This is `CLAUDE.md`'s "read **which** tests went red", applied to
the criteria and not only to the specs.

**For most contexts, the fix changes nothing a consumer can observe yet.** The plan found this,
and the entry had missed it. A state holds its context, and [A8](#a8)'s `_activeStates` holds
every state `createState` builds. The two sets filled in the same call and drained in the same
`ngOnDestroy`. So almost every context this set held was also reachable through a state, for the
same lifetime. Four of the specs therefore drop A8's references by hand, and a control case
leaves them in place and observes the retention. For these contexts, the benefit arrives with
A8's fix. Without this fix, A8's fix would have left every context that has a `type` alive. A8
records this now, and the control case is the spec its fix turns red. *(Narrowed 2026-09-24 by
A8's step 1, [`docs/a8/plan.md`](a8/plan.md). A8 was split. Its first step released
`simpleEval`'s states, so the two `simpleEval` cases here now run with A8's set intact. The
control goes through `createState`, so it stayed green, and it is A8's step 2 that turns it red.
Contexts passed to `createState` are the ones still waiting.)* *(Closed 2026-09-25 by A8's step 2,
[`docs/a8/step-2-plan.md`](a8/step-2-plan.md). That step deleted `_activeStates`, so every context
passed to `createState` is now collectable once the caller drops the state. The benefit this
paragraph waited for has arrived. **The control case is deleted**, and so is `collect`'s
hand-clear. It was replaced by a positive control, the step's 2.3: a context whose state the test
still holds is not collected. That is what shows the other cases are not vacuous, now that
nothing is held out by hand. Cases 1 and 3 run on the service as it is, as the step's 2.1 and
2.2.)*

**The exception is observable now: `caseInsensitive`.** The plan's draft missed it and the
code-reviewer found it. Under `caseInsensitive`, `fromContext` copies a plain object into a new
`Registry`, and the state holds the copy. `'type' in context` added the caller's object itself.
So a plain object or class instance with a `type`, evaluated case-insensitively, was kept by this
set alone until destroy. It is now collectable with A8 unchanged. The fifth case shows that
without holding anything out, and it is what the `CHANGELOG.md` line is for. A second exception
is contrived: a registry nested under a wrapper's `context` key, where the caller later replaces
the key.

*The rest of this entry is the defect as recorded.*

[A8](#a8)'s shape, on a different field. `EvalService.createState` adds a context to a second
strong `Set`, `_activeContexts`
([`eval.service.ts`](../modules/eval-core/src/lib/actual/services/eval.service.ts)), whenever the
context has a `type` property. `Registry` declares `type = 'Registry'`, so every `Registry` passed
to `createState`, or to `simpleEval` / `simpleEvalAsync` (which call it), is added. A plain
object nested under a `context` key is added too, if it has a `type`. Nothing removes an entry
before `ngOnDestroy`.

**Every `EvalContext` is added too.** *(Added 2026-09-24. The paragraph above names only
registries.)* `EvalContext` declares `type = 'EvalContext'`, so passing one in is enough. That
includes the pattern `eval-signals` documents, `simpleEval(expr, createSignalContext(...))`
([`signal-context.ts`](../modules/eval-signals/src/lib/signal-context.ts)). Each signal context
passed that way is retained, together with its lookup closure and the signal source that closure
reads, until destroy. It also covers `eval-forms`' field contexts, if a caller passes them to
`EvalService`. Observed by A21's case 5, where the context loop called `clear` on an `EvalContext`
subclass, which therefore had to be in the set.

**It grows per *distinct* registry, not per call, unlike A8.** A `Set` dedupes by identity.
Measured against the built bundle: three `simpleEval` calls on one `Registry` left the set at 1,
and a second `Registry` took it to 2. So the growth is in the number of distinct registries an
application creates over its life, and each one is kept with everything it holds. That is less
urgent than A8's per-call growth, and the same defect.

**Never mentioned in this register before today**, although it sits four lines below A8's field
and the two share a method. This is the second time this service's state tracking has hidden a
leak.

**Fix — superseded 2026-09-24. Delete the field, independently of A8.** *Previously*: "The same
shape as A8's. Adopting A8's 'don't keep `simpleEval`'s state' approach should carry
`simpleEval`'s contexts with it." That would have left every `createState` caller's contexts
retained. After [A21](#a21)'s fix (`c86b586`), `_activeContexts` has no use but being emptied in
`ngOnDestroy`. Nothing reads its entries, so it is pure retention. Deleting the field, both
`add`s and the `clear()` fixes every path at once, and it does not need to ride with A8.
**One spec changes with it:**
`eval.service.memory-leaks.spec.ts:76-89` *(as of `cffae78`; deleted by this entry's fix, so no
longer linked)*,
"should track and clean up active contexts", reads the private field and pins that it is
non-empty before destroy. It goes when the field goes. A21's five cases do not read the field and
stay as they are.

*Recorded*: this entry.
*Verified*: source read, and measured 2026-09-23 by a script outside the repository against
`dist/modules/eval-core` built from this branch: set size 1 after three calls on one registry, 2
after a second registry.

---

<a id="a21"></a>
## A21 — `EvalService.ngOnDestroy` empties the caller's own `Registry` contexts

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-23, released 2026-09-26**;
`eval-core` 0.6.0, tagged f26f987 — recorded the same day, found while sizing [A8](#a8). **This destroyed the caller's data. It was not a leak**

**Fixed** by [`docs/a21/plan.md`](a21/plan.md). `ngOnDestroy` no longer calls `clear()` on any
context the caller supplied. It still drops its references, and still drains each state's
stack, trace, hooks and bookkeeping *(until [A8](#a8)'s step 2, which removed that drain: see
the reversal below)*. **The fix removed code and recorded nothing new.** Every
entry in `_activeContexts` was already caller-owned by construction, because `createState` adds
its argument and never what `fromContext` builds from it. So the service-built context the brief
assumed was being drained never was. The plan has the argument. The fix deleted two drains: the
`_activeContexts` loop, and `state.context.clear()` in the per-state loop. The second fired on a
caller's `EvalContext` subclass that declared `clear`, which that loop cleared a second time. Five
cases in `eval.service.memory-leaks.spec.ts` reproduce the table below and went red against the
old code. [A20](#a20)'s retention is untouched, but its fix becomes simpler. A20 says how.

**One caller-owned object is still cleared, on purpose: an `EvalHooks` registry adopted through
`options.hooks`.** It has the same shape as this defect, and the fix considered it and kept it.
This is not a gap A21 missed. It is published behaviour: the `hooks` JSDoc in
[`eval-options.ts`](../modules/eval-core/src/lib/internal/classes/eval/eval-options.ts) says
clearing is "the one thing the library does *to* an adopted registry". The eval-core README says
the same, and `eval.service.memory-leaks.spec.ts`'s "should clear a caller-owned registry that
outlives the service" pins it. It also has a reason that contexts lack. A hook's closure usually
captures the state it observes, so a registry that outlives the service keeps dead states and
their AST reachable. And those registrations cannot be dropped selectively. A context holds the
caller's data, which the service has no business emptying. Reversing the hooks behaviour would be
a published change and would need its own entry.

**Reversed 2026-09-25, by [A8](#a8)'s step 2.** Destroy no longer clears any registry.
A21 was right with what it knew then. What changed its premise was A8's step 1, which came after
it. Step 1 released `simpleEval`'s states when the call returned, so destroy could no longer reach
a registry passed only to `simpleEval`. **The clear then depended on the entry point**: the same
registry was cleared if the caller had used `createState`, and not if they had used `simpleEval`.
Step 2 had to decide who owns a `createState` state. It chose the caller, and the service now
keeps no state at all ([`docs/a8/step-2-decision.md`](a8/step-2-decision.md)). That resolves the
asymmetry in the direction A21 itself took for contexts: destroy changes nothing the caller
passed in, whichever method they passed it to.

A21's reason for keeping the clear is still true. A hook's closure usually captures the state it
observes. But what it keeps alive is reachable from a registry the caller holds, and the caller
can release that registry with the unsubscribe `on` returns, or with `hooks.clear()`. The
reversal is a published change, and it has its own record, though not a new entry: A8's step 2
carries it, with `CHANGELOG.md`'s *Changed* and *Upgrading* entries. The spec named above was
inverted to "should not clear a caller-owned registry that outlives the service" (step 2's 2.7).

*The rest of this entry is the defect as recorded.*

`ngOnDestroy` walks [A20](#a20)'s `_activeContexts` and calls `.clear()` on each entry. Those are
objects the caller supplied and may still hold. `Registry.clear()` empties the registry, so when
the root `EvalService` is destroyed, every `Registry` an application ever evaluated against is
emptied under it.

**Observed, not inferred.** Measured 2026-09-23 against `dist/modules/eval-core` built from this
branch:

| Path | Before `ngOnDestroy` | After |
| ---- | -------------------- | ----- |
| `createState(registry)`, then `eval('a * 2', state)` | `20`; `registry.get('a')` is `10` | `registry.get('a')` is `undefined`, and `has('a')` is `false` |
| `simpleEval('a + 1', registry)` three times | `registry.get('a')` is `10` | `undefined` |
| `createState({ a: 10 })`, a plain object | — | `obj.a` is still `10`; untouched |

**It fires on the documented `createState` path, not only through `simpleEval`.** So **A8's
retention fix does not fix this.** Dropping `simpleEval`'s contexts from the set leaves every
`createState` caller's registry registered, and emptied at destroy. The fix here is to stop
clearing objects the caller owns, not to stop keeping them.

**Filed apart from [A20](#a20) on purpose.** One is retention and the other is data loss. They
differ in urgency and in fix, and filing both under one title is how [A8](#a8) spent a year inside
a commit called "Memory Leak Fixes (5/6)".

**What was not measured.** Whether any real consumer destroys the root injector while holding a
registry it goes on using. That happens in tests, in SSR per request, and in micro-frontend
teardown, but it was not observed in any consumer, and nothing in this repository's downstream
libraries passes a `Registry` to `EvalService`.

*Recorded*: this entry.
*Verified*: observed 2026-09-23 by a script outside the repository, as tabled above.

---

<a id="a22"></a>
## A22 — Five memory-leaks cases assert nothing about memory

**Package** core · **Kind** test gap · **Status** **Retired — consolidated 2026-09-26** —
recorded 2026-09-25, found by the code-reviewer on [A8](#a8)'s step 2

**Consolidated, not removed.** "`ngOnDestroy` does not throw" still guards something: a drain
reintroduced without its per-state `catch`, which is [A17](#a17)'s history. Five copies spread
across unrelated cases were noise. **One is kept**, in "should handle repeated async
evaluations, then destroy without throwing". None of the five used hooks or an adopted registry.
All five evaluate against a `Registry`. The async case is the only one whose states are written
again when the promise settles, the shape [A8](#a8)'s plan (§ 1.5) found a racing drain could
corrupt. So it is the richest state shape the five exercise.

The other four lost their destroy calls. Three were retitled to what they test:

| Was | Now |
| --- | --- |
| "should handle repeated evaluations without memory accumulation" | "should evaluate repeatedly against a changing registry" |
| "should clean up complex nested object evaluations" | "should read a deeply nested object" |
| "should handle large arrays without memory leaks" | "should read the length of a large array" |

The fourth, "should handle objects with many properties", kept its title and lost a comment
calling it a memory-leak test. The `describe` "Repeated Operations Memory Stability" became
"Repeated Operations".

**What the kept guard adds is narrow.** Probed with an `ngOnDestroy` that throws every time: 436
of 1074 `eval-core` cases failed, because TestBed's teardown destroys the service. So the kept
case earns its place only against a drain that throws on some state shapes and not others.
A17's own case, a drain reaching caller-owned objects, needs no new fixture: 2.4–2.8
(`docs/a8/step-2-plan.md`) each destroy with a caller-held state or registry. A drain that
mutates it breaks their assertions, and step 2's probe table shows this for P0 and P2. A drain
that throws on it fails their unguarded `ngOnDestroy()` call.

*The rest of this entry is the gap as recorded.*

Five cases in `eval.service.memory-leaks.spec.ts` sit under "Repeated Operations Memory
Stability" and "Large Data Handling":

- repeated evaluations;
- repeated async evaluations;
- complex nested objects;
- large arrays;
- objects with many properties.

Each evaluates, checks the result, and then calls `service.ngOnDestroy()`. Three do it inside
`expect(...).not.toThrow()`, and two do it bare, under `// Should clean up without issues`. Their
titles say "without memory accumulation" and "without memory leaks". **Nothing in them observes
memory.** Their result assertions are real, and duplicate what other specs cover. The destroy call
was always weak evidence: `ngOnDestroy`'s drain swallowed every throw in a per-state `catch`.
Since A8's step 2, `ngOnDestroy` is a single assignment, so that part now tests nothing at all.

**Not changed by that step, on purpose.** `CLAUDE.md` forbids weakening or deleting an existing
assertion without asking. Nor was this one of the cases the step's brief named. Options:

- retitle them, and drop the destroy call and its claim;
- replace them with retention cases on A20's `WeakRef` instrument;
- delete them as duplicates of the result assertions elsewhere.

*Recorded*: this entry. *Verified*: source read, 2026-09-25, at the working tree of A8's step 2
(`eval.service.memory-leaks.spec.ts:430-510`).

<a id="a23"></a>
## A23 — `safeSetProperty` defines the property instead of assigning it

**Package** core · **Kind** decision, then fix · **Status** **Retired — decided and fixed
2026-10-03**; released 2026-10-04 in `eval-core` 0.10.0, tagged 0c3299e. Was Open

**The cause.** [`safeSetProperty`](../modules/eval-core/src/lib/internal/visitors/prototype-pollution-guard.ts#L109-L155)
runs its refusals — a non-object target, a blocklisted key, a built-in constructor, a built-in
prototype — and then writes with
`Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true })`
rather than `target[key] = value`. The member branches of `assignment-expression.ts` and
`update-expression.ts` write through it, so every `o.k = v`, `o.k += v` and `o.k++` an expression
makes is a property *definition*. `pattern.ts` writes through it too, into the binding records it
has just created with `{}`. On a fresh plain object with no such key a definition and an
assignment cannot be told apart, so those are unaffected.

**The effects**, measured 2026-10-03 on 8d96fa7's code (the release commit was amended before push
in one CHANGELOG sentence only) through `evaluate` over a plain context, with no member-write
policy in force:

| Write | Result |
| ----- | ------ |
| `let r = /a/g; r.lastIndex = 3` | throws `Failed to set property "lastIndex": Cannot redefine property: lastIndex` — `lastIndex` is a non-configurable own property |
| `let a = [1, 2]; a.length = 0` | throws the same, for `length` |
| `o.f = 2`, `f` the caller's own writable, non-configurable data property | throws the same — the general case of the two rows above |
| `o.v = 5`, `v` an own accessor on the caller's object | returns `5`, and the setter runs **0** times. `Object.getOwnPropertyDescriptor(o, 'v')` afterwards is a data property, `{ value: 5, writable: true, enumerable: true, configurable: true }`: the accessor is gone from the caller's object, and the value behind it is still `1` |
| `b.v = 5`, `v` an accessor on a class's prototype | returns `5`, and the setter runs **0** times. `b` gains an own data property `v` that hides the prototype's accessor, which is itself untouched; the field the setter would have written still holds `1` |
| `o.h = 2`, `h` an existing non-enumerable, configurable data property | succeeds, and **`h` becomes enumerable**: `Object.keys(o)` goes from `[]` to `['h']` |

None of them needs a member-write policy, and none is new: the `defineProperty` predates
`eval-core` 0.10.0.

**The link to [C1](#c1).** Under `eval-signals` 0.3.0's policy a regex literal is the expression's
own and may be written, but `r.lastIndex = 0` — the usual way to reset a global regex — still
throws, for this reason and not the policy's. C1's spec row writes `r.tag` instead.

**Why it is not fixed with C1.** `safeSetProperty` is the write half of the prototype-pollution
guard. `eval.service.prototype-pollution.spec.ts` pins its refusals, and `SECURITY.md` describes
the guard it belongs to — § 1, and its review of GHSA-pj3p-xpg7-h7gw, whose spec
(`eval.service.case-variant-guard.spec.ts`) exercises the read half. The refusals all run before
the last line and would not move. What would move is what a write *does*: an assignment runs the
caller's setter, where today no setter ever runs. That is a behaviour change, in a published
library, to a function a security document describes.

**How big that change is: reads already run the caller's getters.** `safeGetProperty` ends in a
plain bracket read, and so do the member visitor's own reads (`member-expression.ts`, both paths,
and the key probe under `caseInsensitive`). Measured: `o.v` over an own getter runs it once; over an
inherited getter, once, by dot access, by computed access, and under `caseInsensitive`. The write
path runs it as well: `o.v = 5` above called the getter **twice**, because the assignment visitor
evaluates its target as a read before writing. Running a caller's accessor code from inside a walk
is therefore not new. Running its *setters* would be.

**Options, none chosen:**

- **Assign** — `target[key] = value`, after the existing refusals. JavaScript's own semantics:
  setters run, `lastIndex` and `length` are writable, enumerability is kept, and a non-writable
  property throws a `TypeError`, since library code is strict. The behaviour change above, and a
  failure message to settle.
- **Define only where nothing is there to respect** — assign when the key is on the chain as an
  accessor or as a non-configurable or non-enumerable property, define otherwise. Today's result
  for the common case and the rows above fixed, at the cost of two write paths in a security
  function.
- **Keep the definition, refuse an accessor** — throw when the chain holds an accessor for the
  key, rather than silently replacing or hiding it. Setters still never run, and `lastIndex` and
  `length` still throw unless handled separately.
- **Keep it, and document** the six rows as the evaluator's write semantics.

**Related, and already worked around.** Two notes record `defineProperty` being the wrong write for
a *scope*: [`variable-declaration.ts`](../modules/eval-core/src/lib/internal/visitors/variable-declaration.ts#L62-L67)
and [`EvalContext.setInScope`](../modules/eval-core/src/lib/internal/classes/eval/eval-context.ts#L439-L446).
A `caseInsensitive` scope is a Map-backed `Registry`, and defining a property on the instance
inserts nothing into its map, so both write scopes through `setContextValue` instead. The same
mechanism with a different victim: those keep `safeSetProperty` away from scopes, and this entry is
about the objects an expression's member writes reach.

*Recorded*: found 2026-10-03, writing C1's regex row. *Verified*: each row above, by a throwaway
spec that was not committed.

**Decided 2026-10-03: assign.** Every refusal ahead of the write is unchanged; the last line is
`target[key] = value` in place of the definition, inside the same `try`, with the same
`Failed to set property "…": ` prefix on a write the object refuses. The module is strict, so a
refused write throws rather than failing silently. The reason it was safe to take: the getter
measurement above. Running a caller's accessor code from inside a walk was already the case on
every read and on the write's own read of its target, so a setter running is the one behaviour
this adds — and it is what the caller's object asks for.

Neither guard spec needed a change: `eval.service.prototype-pollution.spec.ts` and
`eval.service.case-variant-guard.spec.ts` pass unedited, because every refusal they pin runs
before the line that changed. The two scope notes still hold, reworded: an assignment to a
`Registry` instance inserts nothing into its map either. C1's `eval-core` spec row now writes
`r.lastIndex = 3` instead of `r.tag`.

*Fixed* 2026-10-03. Specs: `prototype-pollution-guard.spec.ts` (8) — `r.lastIndex = 3` is `3`;
`a.length = 0` leaves `[]`; an own setter runs and is still an accessor afterwards; an inherited
setter runs, through an assignment and an update, and no own property appears; a non-enumerable
property stays non-enumerable; a writable, non-configurable property is written; a frozen object
and an accessor with no setter both throw with the prefix. In `eval-signals`, C1's allowed rows
gain `let r = /a/g; r.lastIndex = 0` → `0`, through `EvalService` and through the factory (2).
`eval-core` 1276 → 1284, `eval-signals` 158 → 160.

**Probe**: `Object.defineProperty` restored. `eval-core`: 8 failed — seven of the eight new rows
and C1's `lastIndex` row. The frozen-object row stays green, as it must: a frozen object refuses a
definition as it refuses an assignment, so that row pins the message and not the mechanism.
`eval-signals`: 2 failed, exactly the two regex rows.

<a id="a28"></a>
## A28 — `scoped` is documented as a scope pushed during this walk; the code asks the whole scope stack

**Package** core · **Kind** docs · **Status** **Retired — fixed 2026-10-10**, documentation
comments only; not yet released. Was Open

*Fixed* 2026-10-10. The docblocks now say what the code asks: a read is `scoped` when any scope on
the context's scope stack binds the name when it is read, whoever pushed it. That is an arrow call's
parameters, the lexical scope `program.ts`, `block-statement.ts` or `for-statement.ts` pushes, or a
scope a caller pushed with `EvalContext.push` before the walk, which is how `eval-signals` binds
`abortSignalKey`. `priorScopes` stay excluded, for the lifetime reason the comments already gave.
Five docblocks: the four below, and `EvalContext.getFromScopes`, which this entry did not name. Its
"the scopes pushed during this evaluation" is the same claim, in a docblock that names the flag.
`emitRead`'s last paragraph also said the stack is empty for any expression without an arrow
function. `program.ts` pushes a scope at the root of every walk through `EvalService`, so it now
says the stack is empty only for a walk that does not start at a `Program` and has nothing pushed by
its caller, and keeps the point that the length check short-circuits that case.

*Verified*: comment tokens only. TypeScript's scanner, trivia skipped, gives the same token stream
before and after in all four source files; run against `identifier.ts` before f96f1d0, the same
check diverges at token 49, so it does see a code change. Every `+` and `-` line of `git diff -U0`
over them is a comment line. `grep` finds no "during this walk", "during this evaluation" or
"pushed during" in the four. The built `.d.ts` against HEAD's build: four hunks, 30 lines, every one
a comment line, in `getFromScopes`, `hasInScopes`, `EvalReadEvent.scoped` and
`createDependencyTracker`; `emitRead`'s does not ship. The fix was expected to change
`EvalReadEvent.scoped`'s alone. The other three are on published symbols too, and their JSDoc ships
with them.

**The entry as it stood:**

`identifier.ts`'s doc comment (`:26`) says a read's `scoped` flag marks a name bound by a scope
pushed *during this walk*. The code asks `EvalContext.hasInScopes` (`:43-45`), which searches the
whole scope stack, so a scope pushed before the walk is flagged too.

`eval-signals` relies on the code, not the comment. Phase 5 step 3's `abortSignalKey` binds each
run's `AbortSignal` as a scope pushed before the walk ([`signals/phase-5-plan.md`](signals/phase-5-plan.md)
§ 3.6). Its read is flagged `scoped`, and the dependency tracker's rule 1 drops it, so the key never
reaches `dependencies` — step 3's criterion 4, met by the tracker alone, with no filter in
`eval-signals`. If the code were tightened to match the comment, the key would appear in
`dependencies`, and the criterion-4 cases ("dependencies (step 3 criterion 4)" in
`eval-signal-async.spec.ts`) would catch it.

The same narrower wording is in three more docblocks, read rather than measured:
`EvalReadEvent.scoped` (`eval-hooks.ts:71`, "a scope pushed *during this evaluation*"), which ships in
the published `.d.ts`; `EvalContext.hasInScopes` (`eval-context.ts:292`); and the tracker's rule 1
(`dependency-tracker.ts:49-50`).

**Fix**: correct the comment to what the code asks — a scope on the stack when the name is read,
whoever pushed it — and the three above with it. Documentation only: no behaviour changes, and the
`.d.ts` differs in a documentation comment.

*Recorded*: this entry; Phase 5 step 3's report, under "noticed, not fixed". Opened 2026-10-09 by
Phase 5 step 3.
*Verified*: Phase 5 step 3's criterion-4 probe, 2026-10-08, on the working tree committed as dafe5f3:
rule 1 disabled in `dependency-tracker.ts`, then reverted, turned both criterion-4 cases red with
`"abort"` in `dependencies` — so the key is dropped as a `scoped` read, which the comment says it
is not.

<a id="a29"></a>
## A29 — `CompilerService` keys a compiled AST by type, start, end and `toString()`

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-10-10**; not yet released. Was
Open

*Fixed* 2026-10-10. `compile` and `compileAsync` cache a string only. Any other input — an AST, or
nothing — is compiled on every call and never enters `_compilationCache`, and `generateCacheKey`
takes a string. Not the entry's `WeakMap`: compiling a node is `evaluate.bind(null, node)`
(`functions/compile.ts`), so a cache keyed by the node's identity would save one `bind` and add a
second map to keep in step with the LRU and the TTL. A string is cached as before, under the same
key. The defect came in with c087f69, so every published `eval-core` from 0.2.1 to 0.11.0 is
affected, 0.10.1 included; a string input never was.

*Verified*: test-first, four cases in `compiler.service.spec.ts`, "AST inputs": two ASTs of one shape
and span, `a * b` and `c * d`, each a `Program` from 0 to 5, through `compile` and through
`compileAsync`, over `{ a: 1, b: 3, c: 3, d: 4 }`; one text parsed twice, two node objects, each
correct through both; and the control, a string compiled twice returning one function by identity,
through both. Before the fix, the two shape cases failed, `12` expected and `3` received; the other
two passed. Wrong implementations, each against the whole spec: the original key — both shape cases
red, nothing else; a key of type, start and end without `toString()` — the same two; the bypass in
`compile` only, `compileAsync` on the original key — the async shape case alone. No other case in the
suite compiles an AST through the service.

The fix's grep for other keys built from an object's shape found two, neither in `CompilerService`:
[A31](#a31), the case-insensitive property cache, live, and fixed since; and [A32](backlog.md#a32), the
disabled visitor result cache.

**The entry as it stood:**

`CompilerService.compile` and `compileAsync` accept an AST as well as a string, and cache the compiled
function under `generateCacheKey` (`compiler.service.ts:108-120`), which for a node is `ast:`, its
type, a JSON of its type, start and end, and `expression.toString()`. An acorn node does not define
`toString`, so the last part is `[object Object]` for every node, and any two ASTs with the same root
type and span share one key.

Measured: `compile(parse('a + b', defaultParserOptions))`, then
`compile(parse('c * d', defaultParserOptions))`, returned the same function, under the key
`ast:Program:{"type":"Program","start":0,"end":5}:[object Object]`; `simpleCall` of the second over
`{ a: 1, b: 2, c: 3, d: 4 }` gave `3`, not `12`. A silent wrong answer, for up to the cache's
10-minute TTL, to any caller that compiles ASTs it parsed itself.

**Fix**: key a node by identity — a `WeakMap` beside the string cache — rather than by a description
of it. Nothing in this repository compiles an AST through the service: `eval-signals` passes strings,
and `eval-forms` uses the free `compile`.

**Why not Phase 9**: its design passes `CompilerService` strings only, and its step 3, which rewrites
the string key, is told to leave the AST branch alone. The finding does close one of that plan's
options, "parse it yourself and compile the AST" (§ 3.1, option A).

*Recorded*: this entry; [`colon-identifiers/phase-9-plan.md`](colon-identifiers/phase-9-plan.md) § 1.2
finding 7. Opened 2026-10-10 by the Phase 9 plan.
*Verified*: measured 2026-10-10 at af81e24, with a throwaway spec deleted the same day (that plan's
§ 1.3, P8).

<a id="a31"></a>
## A31 — The case-insensitive property cache keys an object by its key count and first five keys

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-10-10**; not yet released. Was
Open

*Fixed* 2026-10-10. The cache is a `WeakMap` from the object to its answers, by lower-cased search
key, together with the object's own-key count when they were made. A cached key is returned only
while it is still an own property of the object, which `hasOwnProperty` checks without a scan; a key
deleted or renamed since is scanned for again. A cached miss stands while the own-key count is
unchanged, and a changed count makes the object's answers afresh. The one change it does not see is a
key added in the same interval as another is deleted, which leaves the count as it was, so a cached
miss can outlive it; catching that would mean comparing every name on every miss. An entry lives as
long as its object, so nothing one object answered is read for another, and the old five-minute expiry
and thousand-entry bound go with the shape key. `getPropertyLookupCacheStats` now counts the entries
made since the last clear, the one figure a `WeakMap` can give; only `performance.spec.ts` reads it,
and no barrel exports the module.

**Kept, not removed.** The three strategies called directly, interleaved in one process, eleven runs
of each, in two sessions; the lowest time per lookup, old shape key / identity / no cache:

| Lookup | Old shape key | Identity | No cache |
| :--- | ---: | ---: | ---: |
| 3-key object, hit | 546–2,180 ns | 54–115 ns | 2,384–8,075 ns |
| 50-key object, hit on the last key | 2,564–3,582 ns | 55 ns | 125,508–486,409 ns |
| 50-key object, miss | 4,506–4,539 ns | 1,508–1,590 ns | 121,510–122,640 ns |
| 1000-element array, `list.map` | 47,215–47,508 ns | 25,872–26,205 ns | 2.48–2.57 ms |

Without a cache every read scans the object's names with `localeCompare`. `performance.spec.ts`,
three runs each: its two lookup cases and its benchmark took 12–13, 4 and 18–19 ms on the old cache
and 7–8, 2–3 and 13–14 ms on this one, and the whole spec 96–101 ms against 61–65 ms.

*Verified*: test-first. A regression table in `eval.service.case-variant-guard.spec.ts`, "after a
colliding cache entry, caseInsensitive: true": for each of the 15 spellings — the 12 upper-cased
`Object.prototype` names and the four spellings of `constructor` — the spelling is read first as data
from an object holding it, then from a second object with the same count and first five names, and
must be refused. All 15 were red on the old cache. And eight cases in `property-lookup-cache.spec.ts`:
two objects sharing their first five names, in both read orders; a fresh service after an earlier
one's objects; two objects whose names join alike with `_`; two objects holding the same names in
different orders; a key added after a cached miss; a cached key renamed away; and the control, one
object read twice resolving one key. The old cache failed the first four of those. Wrong
implementations, each against the cache, guard, carve-out and performance specs: the old key — the 15
rows and those four, 19 in all; a key of the count and every name — only the joined-names case, and
not the reordering case, since the order is part of the joined key; a cached key returned without the
own-property check — only the renamed-key case; a cached miss kept whatever the count — only the
added-key case.

**The entry as it stood:**

Under `caseInsensitive`, the member visitor asks `getCachedCaseInsensitiveProperty` which own key of
the object matches the name (`member-expression.ts:183`). The answer is cached under
`generateObjectHash` (`property-lookup-cache.ts:30-37`) — the object's own-key count and its first
five own property names — plus the lower-cased name. Two objects with the same count and the same
first five names share every entry, whatever their other keys are called. The cache is one instance
for the whole module (`:135`), so it is shared by every evaluation, every service and every injector
in the process; an entry lives five minutes from its last hit.

Measured, with `caseInsensitive`: over `two = { a, b, c, d, e, EXTRA: 'two' }`, `o.extra` is `'two'`.
After `o.extra` over `one = { a, b, c, d, e, Extra: 'one' }`, the same read over `two` is `undefined`
— the cached key is `Extra`, which `two` does not have — and so it is from an `EvalService` in a new
`TestBed` configuration. An object with five own keys or fewer is hashed on all its names, so two such
objects differ whenever their spellings do: `{ Name: 'x' }` and `{ NAME: 'y' }` read `'x'` and `'y'`.

**A collision can also turn a case-variant refusal into a silent `undefined`.** The prototype-pollution
re-check runs on whatever key the cache returns (`isDangerousProperty(foundKey)`,
`member-expression.ts:211`), and a key cached from another object is that object's spelling, not a
blocked name. Measured, for the 12 upper-cased `Object.prototype` names and the four spellings of
`constructor` in `eval.service.case-variant-guard.spec.ts`: each read is refused on a clean cache;
with a colliding entry primed — the same spelling read first as data from an object of the same
shape — each returns `undefined` instead, 15 of 15. The key read is the other object's non-blocked
spelling, so no blocked property is reached. Otherwise the wrong answer is a missing or misattributed
property, silently. The cache came in with c087f69, A29's commit, so every published version from
`eval-core` 0.2.1 is affected.

**Fix**: key the cache by the object's identity — a `WeakMap` — and decide what makes an entry stale
when the object gains or renames a key, since a hash of its names was the only invalidation it had; or
remove the cache. `performance.spec.ts` pins its existence ("should cache case-insensitive property
lookups", `:97`, and `propertyStats.size` at `:213`), so a removal changes those assertions
deliberately.

*Recorded*: this entry, by the grep the A29 fix ran for other keys built from an object's shape.
Opened 2026-10-10 by A29's fix.
*Verified*: measured 2026-10-10 at d839072 with a throwaway spec, deleted before A29's commit; the
refusal rows on A29's commit, with another, deleted the same day.

---

# B. `eval-core` — security and hygiene

<a id="b1"></a>
## B1 — The primitive carve-out in `member-expression.ts`

**Package** core · **Kind** decision, then fix · **Status** **Retired — fixed 2026-10-02**;
released 2026-10-03 in `eval-core` 0.9.0, tagged eb403c0. Was Open, Covered

Surfaced while checking GHSA-pj3p-xpg7-h7gw (reported against the sibling `jse-eval`) against
this repo. The advisory itself does not apply — see [`SECURITY.md`](../SECURITY.md), "Reviewed
External Advisories" — but the check walked the surrounding guard and found this.

**Status: not exploitable as far as probed. Not cleared.** No escalation was found; that is not
the same as none existing, and the probing was one session's worth against one threat model.

**What it is.** Both dangerous-property checks in the member visitor (lines 144 and 188 of
[`member-expression.ts`](../modules/eval-core/src/lib/internal/visitors/member-expression.ts) at
0.8.0) are gated on `!isPrimitive`, so when the receiver is a string, number or boolean the
blocklist is skipped entirely. `"abc".constructor` therefore returns the real `String` function.

**Why deleting the gate is not the fix.** The blocklist holds `toString`, `valueOf` and
`hasOwnProperty`, which are ordinary reads on a primitive. Enforcing it there would refuse
`s.toString()`. Worse, simply removing `!isPrimitive` does not narrow the carve-out at all — it
removes primitive member access outright, because `safeGetProperty` returns `undefined` for any
target that is not an object or a function *before* it consults the blocklist, so
`s.toUpperCase` becomes `undefined` rather than blocked (confirmed by probe). A fix has to keep a
primitive read path and enforce a subset of the blocklist on it.

**Probe results, so nobody re-derives them.** Against `{ s: 'abc', n: 1, b: true }`:

- `s.constructor` → the `String` function. Likewise `n.constructor` → `Number`,
  `b.constructor` → `Boolean`.
- `s.constructor.call` → `Function.prototype.call`, and it is callable —
  `s.constructor.call(null, "hi")` → `"hi"`. This is the one hop past the constructor that is not
  on the blocklist. `this` is the `String` function, so it yields a string.
- `s.constructor.constructor` → **throws**. So does `s.constructor.prototype`,
  `s.constructor.__proto__`, `s.constructor.call.constructor`, `s.trim.constructor` and
  `s.sub.constructor`.
- Every escalation tried dead-ends at hop 2, and by the same mechanism: the receiver is then a
  plain function, not a primitive, so the read goes through `safeGetProperty`, which does enforce
  the blocklist.
- A second, independent barrier sits behind that one: the case-insensitive lookup block is gated
  on `typeof obj === 'object'`, and functions are not. So no case variant reopens the chain —
  `s.constructor.CONSTRUCTOR`, `s.constructor.PROTOTYPE` and `s.trim.CONSTRUCTOR` all resolve to
  `undefined` under `caseInsensitive: true`. This barrier is incidental rather than designed,
  which is a reason not to lean on it.

**Covered, not fixed.** `eval.service.primitive-carve-out.spec.ts` pins the boundary in both
directions. Confirmed load-bearing: skipping the carve-out reddens the first two blocks,
extending it to function receivers reddens the third. A fix is expected to change its first
`describe` block and leave the other two intact.

Behavioural — anything reading `s.constructor` today starts throwing.

*Recorded*: [`SECURITY.md`](../SECURITY.md), the GHSA-pj3p-xpg7-h7gw section.
*Verified*: source read, 2026-09-06. *Re-measured* 2026-10-02 on master 92dcf0b, over the same
context: `s.constructor` is `String`, and callable through `.call`, `.bind`, `.fromCharCode` and
`.raw`; `n.constructor.MAX_SAFE_INTEGER` reads; `s.__proto__` is `String.prototype`, and
`n.__proto__.toFixed.call(1.5, 0)` runs; `s.__lookupGetter__` and `s.__defineGetter__` are callable
functions. Already refused: every second hop to a dangerous name, and every write to a built-in
prototype (`s.__proto__.x = 1` throws, and `String.prototype` is untouched).

*Fixed* 2026-10-02. A string, number or boolean receiver is refused `constructor`, `__proto__`,
`prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__` and `__lookupSetter__`, with
the blocklist's own error, on both the case-sensitive and the `caseInsensitive` path of
`member-expression.ts`. The seven are `DANGEROUS_PRIMITIVE_PROPERTY_NAMES`, defined beside
`DANGEROUS_PROPERTY_NAMES` in `prototype-pollution-guard.ts` and tested by the module-internal
`isDangerousPrimitiveProperty`. `toString`, `valueOf`, `toLocaleString`, `hasOwnProperty`,
`isPrototypeOf` and `propertyIsEnumerable` stay readable. The primitive read path is kept: after
the check the read is still direct, not through `safeGetProperty`.

**Case variants are not refused, deliberately.** The subset is checked by exact key, under
`caseInsensitive` too. A primitive receiver is never case-corrected — the lookup that corrects
case is gated on `typeof obj === 'object'` — so `s.Constructor` and `s.CONSTRUCTOR` read
`'abc'['Constructor']` and `'abc'['CONSTRUCTOR']`, both `undefined`, and never reach `String`. The
last test of the spec's third block (`s.CONSTRUCTOR` under `caseInsensitive` → `undefined`) fails
if a primitive is ever case-corrected, and the variants would then need refusing.

Behavioural, so a breaking minor: an expression reading one of the seven off a primitive now
throws. Nothing in `eval-signals` or `eval-forms` — source, specs or READMEs — reads one off a
primitive. Their `user.constructor` cases register an expression over an object model and never
evaluate it on a primitive; nor does anything in `eval-core`'s other specs or its README.

Specs: `eval.service.primitive-carve-out.spec.ts`, 8 → 113 cases. The first block, which pinned
what the carve-out permitted, now asserts refusal: each of the seven names on each of `s`, `n` and
`b`, by dot and by computed literal, under both option settings; a key computed at runtime; calls
through the constructor and the prototype (`s.constructor("x")` among them);
`s.constructor.CONSTRUCTOR` under `caseInsensitive`; the two variants reading `undefined`; and the
eight ordinary reads under both settings. The second block is unchanged. In the third, the cases
whose first hop is now refused were reworked to test what each is named for:

- `s.constructor.call.constructor` → `s.trim.call.constructor`, as a case of its own: `s.trim.call`
  reaches `Function.prototype.call` through allowed hops.
- `s.constructor.CONSTRUCTOR` → `s.sub.CONSTRUCTOR`, and `s.constructor.PROTOTYPE` →
  `s.trim.PROTOTYPE`, both still `undefined`: a function receiver reached through an allowed hop.
  `s.constructor.CONSTRUCTOR` moved to the first block as a refusal.
- `s.constructor.constructor`, `s.constructor.prototype` and `s.constructor.__proto__` kept, now
  asserting the first-hop refusal, the case retitled to say the second hop is unreachable from a
  primitive. No allowed member of a string, number or boolean yields a global constructor or a
  built-in prototype — checked over every own property name on each one's prototype chain, 55, 9
  and 6 names.

`eval-core` 1128 → 1233.

**Probes**, each reverted, against 1233. The `!isPrimitive` gate restored on both paths — 90 failed,
all in this spec: the 88 refusal cases, `s.constructor.CONSTRUCTOR`, and the kept first-hop case
(`s.constructor.prototype` is then refused at the second hop, as `"prototype"`). The 16 ordinary
reads stay green, and so do the reworked third-block cases, which exercise their later hop either
way. The full blocklist applied to primitives — 13 failed: the 12 ordinary reads of a blocklisted
name (`s.length` and `s.toUpperCase()` are not on it) and the second block's ordinary-reads case;
every refusal case green.

<a id="b2"></a>
## B2 — `pattern.ts:83` logs the whole `EvalState`

**Package** core · **Kind** fix · **Status** **Retired — fixed** — Phase 2 step 0, 2026-09-11; released in
`eval-core` 0.4.0

**Fixed.** The call is gone and the throw now reads
`` `${pattern.type} is not supported as a binding target.` `` — the node type being the only part
of the old argument list a caller could act on. Deleting it left `st`, `callback` and `arg`
unused, so `evaluateMemberExpression` is down to its one remaining parameter; it is
module-private and both call sites are in `pattern.ts`, so nothing outside the file moved. **Not
behavioural** — the branch is unreachable, per the three checks below, which is why the count of
`console.*` reaching the bundle drops from four to three without a consumer seeing anything.

Detector: `pattern.spec.ts`'s `MemberExpression` fixture, which asserts the message *and* spies
on `console.log`. Reverting both halves reddens that one case and nothing else.

**The remaining three are [B3](#b3)**, and this entry closing does not close that one.

---

The defect, as it stood:

`eval-core` has ~20 `console.*` calls in source. Most are unreachable and tree-shaken; **four
reach the published FESM bundle**, verified by building and grepping
`dist/modules/eval-core/fesm2022/`. This entry was one of them; the other three are [B3](#b3).

[`pattern.ts:83` at `ef5ac2b`](https://github.com/Zvenigora/ng-eval/blob/ef5ac2b4be987577a868baf2cd48739d5d55a1be/modules/eval-core/src/lib/internal/visitors/pattern.ts#L83) is
`console.log(pattern, st, callback, arg)`, inside `evaluateMemberExpression`, guarded by
`if (pattern.type === 'MemberExpression')`, and the *next* line is
`throw new Error('evaluateMemberExpression is not implemented.')`. So it is not per-node work:
`performance.spec.ts` is not the gate for it and there is no cost to recover.

**It is currently unreachable**, which is what decides its priority. Three checks:

- `evaluateMemberExpression` is reached only through `evaluatePatterns` / `evaluatePattern`, and
  the only caller of either inside the library is `arrow-function-expression.ts:15`, on an arrow
  function's parameter list.
- A `MemberExpression` is not a valid binding target in a parameter list, so acorn rejects every
  form of it — `(a.b) => 1`, `({x: a.b}) => 1`, `([a.b]) => 1`, `({...a.b}) => 1` — with
  `Assigning to rvalue`, at `ecmaVersion` 2020 (this library's default), 2022 and `latest`.
- Neither function is exported from the built package, so a consumer cannot call them directly to
  route around the parser.

*Were* it reachable it would be a **disclosure**, not a hygiene item: the second argument is
`st`, the whole `EvalState` — the call would dump the caller's entire evaluation context to the
console of any application whose user wrote that pattern.

**Phase 2 is what makes it live.** Statement support brings destructuring declarations
(`let [a, b] = c`, `let {x} = o`) and assignment destructuring, where a `MemberExpression` target
*is* legal — `[a.b] = arr` parses. If that work routes through `pattern.ts`, this branch becomes
reachable with a state dump already in it. **Delete it ahead of any code that widens what reaches
these functions**, not as a floating cleanup.

Scope: delete the call and fold anything worth keeping into the throw's message; the node type is
the only part a caller could act on. Not behavioural — the one call that could expose anything
cannot currently run.

*Verified*: source read, 2026-09-06. *Fixed*: 2026-09-11, Phase 2 step 0.

<a id="b3"></a>
## B3 — Two service-layer `console.*` calls reach the published bundle

**Package** core · **Kind** decision · **Status** **Retired — fixed 2026-09-29**;
released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1. The last call deleted, and the published bundle has none. Was one since
2026-09-24, two since 2026-09-23

**Decided and fixed 2026-09-29: the cache-timer call is deleted.** It did not qualify for the
`isDevMode()` carve-out, for the same reason as the `ngOnDestroy` site below: clearing the parser
cache is the service doing its job, not a misuse that fails silently. The `clear()` stays; only
the `console.debug` after it went. No spec referenced it.

*Verified*: `console.` in `eval-core` source now finds eleven calls, all in `memory-manager.ts`.
The built `fesm2022` bundle has **no** `console.` call. A grep for `console.` there finds three
lines, and all three are comments: two in `timing-hook.ts`'s docblock, which ships in the bundle,
and one in `pattern.ts`, recording the [B2](#b2) dump that was removed. Test counts unchanged.

**The entry as it stood:**

| Site | Call |
| ---- | ---- |
| ~~`parser.service.ts:67`~~ | ~~`console.debug('Parser cache cleared…')`~~ *(deleted 2026-09-29, above)* |
| ~~`eval.service.ts:89`~~ | ~~`console.warn('Error cleaning up EvalState:', error)`~~ *(deleted 2026-09-24, below)* |

**The `ngOnDestroy` site is decided: deleted, and the `catch` is now silent.** [A8](#a8)'s
step 1 did it, as the last paragraph here asked ([`docs/a8/plan.md`](a8/plan.md) § 2.1). It did
not qualify for the `isDevMode()` carve-out. After [A17](#a17)'s reorder, only the two drains
that reach a caller's object can throw: a frozen trace, or a registry whose `clear` throws. A
throw costs only that object. The carve-out is for a misuse that harms something the caller
could not have caught. The `catch` stays so that one state cannot stop the rest being drained.
One case asserts that no warning is logged. It failed against the old warn, and against a warn
guarded by `isDevMode()`, since Jest runs in dev mode. **`parser.service.ts:67` is still open.**
It is in a `setInterval` callback, not `ngOnDestroy`, so the A8 step left it alone.

**The silent `catch` is gone too, removed 2026-09-25 by [A8](#a8)'s step 2 before it shipped.**
That step deleted the drain loop it sat in: the service keeps no state, so `ngOnDestroy` drains
nothing and nothing in it can throw. The case asserting no warning was deleted with the loop,
since nothing is left that could log. What ships is the same for this entry: `ngOnDestroy` does
not call `console.*`. The count below is unchanged.

The third, `console.warn('Error cleaning up Context:', error)`, guarded `ngOnDestroy`'s loop that
cleared each tracked context. [A21](#a21)'s fix deleted that loop, since it emptied the caller's
registries, and the call went with it. That was not clean-up in passing: the call had nothing
left to guard.

**How the published bundle's count moved.** *(Moved here 2026-09-25 from `CLAUDE.md`, which now
keeps only the rule, the current count and where the calls are tracked.)* Four calls survived
tree-shaking when this register was opened. [B2](#b2)'s `pattern.ts:83` state dump was the
fourth, and Phase 2 step 0 deleted it: three. A21's fix deleted the context loop's warn: two.
A8's step 1 deleted `ngOnDestroy`'s remaining warn: one, `parser.service.ts:67`. Counted
2026-09-25 in the built `fesm2022` bundle, not in source. Source then held thirteen calls, and
tree-shaking removes the rest. [B4](#b4)'s deletion of the dead component took one of them,
`eval-core.component.ts:7`, which was never in the bundle: **twelve** in source since 2026-09-26
(eleven in `memory-manager.ts`, one in `parser.service.ts`), by grep, and still one in the bundle.
*(2026-09-29: eleven in source and none in the bundle, above.)*

*As recorded, before the `ngOnDestroy` site was decided above; it now applies to
`parser.service.ts:67` alone.* Decide whether these become the `isDevMode()` carve-out
(`CLAUDE.md`, Conventions), a no-op, or stay. Not behavioural. Note the `eval.service.ts` call sits inside `ngOnDestroy`'s cleanup
loop, which is the same method [A8](#a8) touches — if A8 is fixed, revisit it in the same
step rather than separately.

<a id="b4"></a>
## B4 — `eval-core.component.ts` is dead generator scaffold

**Package** core · **Kind** fix · **Status** **Retired — fixed 2026-09-26**; no published artifact
changed

`modules/eval-core/src/lib/eval-core/` held an empty `EvalCoreComponent` plus a stray `ngEval()`
that parsed `"1 + 1"` and logged the result. Nothing imported it but its own spec, and it was
**not** in the FESM bundle, so this was dead source rather than a published-surface problem. It
carried a template, a stylesheet and a spec with it — four files.

*Fixed* 2026-09-26: the directory deleted, all four files. *Verified*:
`grep -rn "EvalCoreComponent\|ngEval\b\|eval-core.component" modules/` finds nothing; `eval-core`'s
tests went from 1074 to 1073 in 58 suites, down exactly the spec's one case and one suite. **The
"not in the bundle" claim held**: the built `fesm2022` bundle, its source map and the `.d.ts` are
byte-identical to a build of the parent commit, and neither build names the component, `ngEval` or
its selector. The `console.log` at `eval-core.component.ts:7` went with it — see [B3](#b3) for the
source count.

<a id="b5"></a>
## B5 — `eval-core` exports seventeen symbols nothing uses

**Package** core · **Kind** decision, then fix · **Status** **Retired — decided and fixed
2026-10-04**: all seventeen removed, a breaking minor; released 2026-10-07 in `eval-core` 0.11.0,
tagged 776885a

*Decided* 2026-10-04: remove them. A consumer that imports one breaks, which the CHANGELOG says
symbol by symbol, with a replacement for the three that have one. Nothing in this repository
imports any of them, and keeping them cost a `.d.ts` that declared shapes the library does not
use, two of them a hook vocabulary `EvalHooks` contradicts.

*Fixed* 2026-10-04. Re-counted first, on the commit before: no non-spec `.ts` file under
`modules/` names any of the seventeen outside the five files that declare them and the two
barrels that export them. One comment named `getContextKey`, in `eval-context.ts`, to say why
`hasContextKey` does not use it; that clause went with the function. Removed:

- `internal/interfaces/recursive-visitors.ts`, `scope-type.ts` and `queue-type.ts`, which
  declared nothing else, and `classes/common/queue.ts`;
- `getContextKey` and `isRegistryContext` from `classes/common/context.ts`, with the two
  imports only `getContextKey` used;
- their lines in the two barrels;
- `queue.spec.ts`, which tested `Queue` and nothing else;
- the seventeen `unused` entries in [F10](#f10)'s allowlist. The reason stays in the vocabulary
  of all three spec copies, with no entry under it. The reader's case for a type-only export used
  `QueueType` and `RecursiveVisitorState` as its fixtures, and now uses `StackType` and `Context`.
  Its comment had called `RecursiveVisitorState` a type alias, which it never was; `Context` is
  one;
- `Queue`'s line in [`docs/common-classes.md`](common-classes.md).

*Verified*: the built `.d.ts` against npm's 0.10.0 lists 59 exports to 76, missing exactly the
seventeen and adding none, and every other line it changes is a removal, 133 of them. The built
FESM bundle no longer contains `class Queue`, `RecursiveVisitorResultType`, `getContextKey` or
`isRegistryContext`, the four that had runtime code. `eval-core`'s tests went from 1300 in 66
suites to 1295 in 65, down `queue.spec.ts`'s five cases and its suite.

**The entry as it stood:**

[F10](#f10)'s allowlist gives these seventeen the reason `unused`: nothing in
the three libraries' non-spec sources references them beyond their own declaration and the
barrels, counted 2026-10-04. They are:

- the ten types in `internal/interfaces/recursive-visitors.ts`: `AggregateType`,
  `RecursiveAggregateVisitor`, `RecursiveVisitor`, `RecursiveVisitorContext`,
  `RecursiveVisitorOptions`, `RecursiveVisitorRegistryResult`, `RecursiveVisitorResult`,
  `RecursiveVisitorResultType`, `RecursiveVisitorStackResult` and `RecursiveVisitorState`;
- `ScopeOptions`, `ScopeType` and `RegistryOptionType` in `scope-type.ts`. `EvalScope` does not
  use them, since it has `EvalScopeOptions`;
- `Queue` and its `QueueType`;
- `getContextKey` and `isRegistryContext` in `classes/common/context.ts`.

**Two of them have had a removal deferred where nothing tracked it.** Phase 1 marked
`RecursiveVisitorState` and `RecursiveVisitorResult` `@deprecated`, pointing at `EvalHooks`, and
its plan made their "removal … a follow-up for the next breaking version"
([`side-effects/phase-1-plan.md`](side-effects/phase-1-plan.md), step 6's edit list). The deferral
lived in the plan alone. `eval-core` has since shipped at least three breaking minors, 0.7.0, 0.8.0
and 0.9.0, with both still exported.

**The decision is whether to remove them, and when.** Removing an export is a breaking release.
Most of the seventeen are types, which a consumer can import, and nothing establishes that none
does. Keeping them costs a `.d.ts` that declares shapes the library does not use, and two of them
are a hook vocabulary that contradicts `EvalHooks`.

*Recorded*: while building F10's allowlist, 2026-10-04; the reference counts are that step's.

<a id="b6"></a>
## B6 — Identifier resolution reaches `Object.prototype` members

**Package** core · **Kind** fix, security · **Status** **Retired — fixed 2026-10-05**; released
2026-10-07 in `eval-core` 0.10.1, tagged d77fa16, and 0.11.0, tagged 776885a; advisory
[GHSA-jh43-xc7j-93c2](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-jh43-xc7j-93c2)

*Fixed* 2026-10-05. Two routes resolve a name against the context rather than against an object
the expression holds, and both refuse a name on the prototype-pollution blocklist,
`DANGEROUS_PROPERTY_NAMES`, with the member visitor's own error:

- **An identifier** (`identifier.ts`, both visitors). The name is refused before any lookup.
  Under `caseInsensitive` the key the lookup matched is refused too, asked of `getKey`, as
  `member-expression.ts` re-checks `foundKey` for another object.
- **A member of `this`**, `this.k` or `this["k"]` (`member-expression.ts`, the
  `object === st.context` branch), on the same two terms. `getKey` already ran there under
  `caseInsensitive`, so the matched-key check costs nothing extra.

The member visitor's third branch, an `EvalScope` the caller put in the context as a value, reads a
global scope's object the same way, and refuses the name as well. It has no case correction, so
there is no matched key to check.

**The plan named the identifier only; the other two were added in this step.** Measured on the
commit before the fix, over a plain object: `this.constructor` and `this["constructor"]` were
`Object` and `this.__proto__` was `Object.prototype`, through the context branch, which no
check guarded. C4's entry had recorded `this.constructor` beside `constructor`. Fixing the
identifier alone would have left `Object` reachable, and the Security section untrue.

**The matched-key check is behind a filter**, `mayMatchDangerousProperty`, because the
performance spec's read-emission guard asserts that an identifier does not pay a `getKey` call
when no read hook is registered. A context matches another spelling by `toLowerCase()` (a
case-insensitive `Registry`, an `eval-signals` source) or by `localeCompare` at base sensitivity
(a prior scope's namespace), which ignores accents too. So a name is let through when its
lower-case form is a blocklisted name's, or when it holds any character outside ASCII.

*Affected*, from the code history only: every published version from the first to 0.10.0.
`getContextValue` has read a plain object as `context[key]` since 8240885 (2023-12-15). The
identifier visitor's lookup, `context?.get(node.name)`, dates from d259729 (2024-01-07), the
commit tagged `eval-core@0.1.104`, the first published `eval-core` tag. At that tag the member
visitor's context branch was `st.context.get(key)` with no check either. No version of
`identifier.ts`, `eval-context.ts` or `common/context.ts` at any `eval-core` tag contains a
dangerous-name check. 0.1.102, published and never tagged, has the same identifier path at its
release commit, 156114e.

*Advisory*: [GHSA-jh43-xc7j-93c2](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-jh43-xc7j-93c2),
severity high, published 2026-10-07: `@zvenigora/ng-eval-core` `< 0.10.1` affected, patched in
0.10.1, and in 0.11.0. Listed in [`SECURITY.md`](../SECURITY.md).

*Verified*: `eval.service.identifier-guard.spec.ts`, 635 cases. Each of the thirteen names is
refused as an identifier, `this.k` and `this["k"]`, over five kinds of context: a plain object, a
`Registry`, a class instance, an `EvalContext` over a plain object, and a global prior scope. Each
is refused with and without `caseInsensitive`, and on an `EvalScope` in the context. Under
`caseInsensitive` an upper-case variant is refused over each correcting kind holding the name and
over a prior scope namespaced with it, and so is an accented variant of a namespace. An ordinary
key, a case variant of one, a near miss (`Constructor`, `myConstructor`, `toStringValue`) and the
literal names still resolve. `signal-context.spec.ts` gains 120 rows for a signal context. Three
`program.spec.ts` cases read `toString` and its kin as identifiers to show that the empty program
scope answers no prototype name; they now read through `get`, from a function the expression
calls, and the first also asserts the refusal. With the old value-based `hasContextKey` restored,
two of the three go red on the rerouted assertion, as they did before; the third,
`caseInsensitive`, describes itself as the arm that was already green. The prototype-pollution and
case-variant specs are unchanged.

Probes, each against all three projects' whole suites and read case by case, then reverted. The
suites before the fix: `eval-core` 1357, `eval-signals` 185, `eval-forms` 343; after, 1992, 305
and 343.

| Probe | `eval-core` | `eval-signals` | `eval-forms` |
| ----- | ----------- | -------------- | ------------ |
| Drop the identifier name check | **107**: 106 identifier rows, and `program.spec.ts`'s new refusal assertion. 24 identifier rows stay green: under `caseInsensitive` over a plain object read as written, an `EvalContext` the caller built or a global prior scope, the matched-key check refuses the twelve names the object inherits. `prototype`, which it does not inherit, goes red | **14**: the 13 case-sensitive rows, and `prototype` under `caseInsensitive` | **0** |
| Drop the identifier matched-key check | **53**: the 39 identifier variant rows, the 13 namespace rows and the accented row | **13**: the identifier variant rows | **0** |
| Drop the `this.k` name check | **212**: the `this.k` and `this["k"]` rows, with the same 24 per form green for the same reason | **28** | **0** |
| Drop the `this.k` matched-key check | **106**: the 78 variant rows, the 26 namespace rows and the 2 accented rows | **26** | **0** |
| Drop the `EvalScope` check | **52**: exactly its rows | **0** | **0** |
| The filter without its non-ASCII clause | **1**: the accented identifier row | **0** | not run |
| The filter always true | **1**: the read-emission guard in `performance.spec.ts`, an existing case | **0** | not run |

No probe turned red anything outside the new rows except the program-scope assertion added with
them and, for the filter, the existing performance guard that the filter exists to keep green.

**The entry as it stood:**

For a context built from a plain object, `getContextValue` reads the context with a bare
property access, so an identifier resolves members inherited from `Object.prototype`. The
dangerous-name check guards member access to other objects, not identifier resolution. Through
`Object`'s own static functions, an expression can then modify shared prototypes.

- Signal contexts refuse `Object`'s mutators since [C4](#c4); identifier
 resolution there is still affected.
- `eval-forms` refuses such identifiers at bind time ([D2](#d2)).

**Fix:** refuse an identifier whose name, or whose matched key under `caseInsensitive`, is in
the dangerous-name set. Details are withheld until a fixed version is published.

*Recorded*: found while building C4, 2026-10-04.

---

# C. `eval-signals`

<a id="c1"></a>
## C1 — A member-target write escapes the read-only policy

**Package** signals · **Kind** decision · **Status** **Retired — decided and fixed 2026-10-03**;
released 2026-10-04 in `eval-signals` 0.3.0, with `eval-core` 0.10.0, tagged 0c3299e. Was Open,
Covered

The most serious unlisted behavioural entry in the repository.

`assignment-expression.ts` and `update-expression.ts` each have a second branch,
`node.left.type === 'MemberExpression'`, which writes with `safeSetProperty(object, key, value)`
and never touches the `EvalContext`. Reproduced end-to-end:

```ts
createEvalSignal('user.name = "Bob"', { user: signal({ name: 'Ada' }) })
// no throw, returns 'Bob', and user() is now { name: 'Bob' }
createEvalSignal('user.n++', { user: signal({ n: 1 }) })
// no throw, and user() is now { n: 2 }
```

This is a write *through* a signal-backed key rather than *to* one, which is why § 3.6's wording
("a write to a signal-backed key") does not reach it. Two things make it a genuine open problem
rather than a wording nicety: it is a mutation performed from inside a `computed()`, and it lands
in **data this library does not own** — the object the consumer's signal holds — so it is **not
containable at the `EvalContext`** the way every other instance of this shape is.

**The chokepoint framing, added 2026-09-11 while planning Phase 2.** `eval-signals` enforces its
read-only policy in exactly one place: it subclasses `EvalContext` and overrides `set` to throw
([`signal-context.ts:112-117`](../modules/eval-signals/src/lib/signal-context.ts#L112-L117)). So
`EvalContext.set` is the **single policy chokepoint**, and this entry is definitionally *the class of
write that never enters it* — `safeSetProperty` writes the resolved object directly and no context
method is called. That is a harder question than "stop this write": there is nothing to override,
and the three mechanisms below are each an attempt to *reach* a write that bypasses the chokepoint
rather than to tighten one that passes through it.

Two consequences worth having recorded. A fix that adds a check to `EvalContext` cannot work, by
construction. And the sibling defect — [`statements/phase-2-plan.md` § 1.4](statements/phase-2-plan.md),
an identifier write reaching the caller's object because `set` consults no scope — is *not* this
entry: it goes **through** the chokepoint and lands on the wrong target, which is why Phase 2 can fix
it and cannot fix this one. Phase 2 § 3.2 preserves the chokepoint deliberately: its `setInScope`
returns false unless a pushed scope already binds the key, so every write that targets the source
still reaches `set`.

Three candidate mechanisms, none costed:

- a static AST check at `createEvalSignal` — shares its cost with [C2](#c2), catches it before the
  first read, but the guard then does not exist for `createSignalContext` used standalone;
- freezing or wrapping the resolved value — per-read cost, and it changes what an expression
  observes;
- documenting it as a limitation, the way the escaping-closure residual of [A9](#a9) is.

**Covered**: the runtime behaviour is pinned by spec, so whichever way this goes, the change is
visible.

*Recorded*: [`signals/phase-3-plan.md` § 3.6.4 gap 1](signals/phase-3-plan.md) and
[§ 8 q6](signals/phase-3-plan.md).

**Decided 2026-10-03: none of the three — a runtime guard in the context, with the walk telling it
what is the expression's own.** The chokepoint framing was right that a check on `EvalContext`
*alone* cannot work: the context has no way to see the write. So `eval-core` 0.10.0 makes the walk
ask it. The member branches of both write visitors call `EvalContext.checkMemberWrite` before
writing, with the target, the key, and whether the walk created the target; a context that
implements the method opts in, and the walk then records, per `EvalState`, every object it creates
for the expression to hold. `SignalEvalContext` implements it and refuses a target the walk did not
create, with `SignalContextWriteError` of `kind` `'member'`.

The rule, as the package README states it: **a signal expression may write into what it created —
object, array and regex literals, rest values, arrow functions — and not into anything it was given
or got back from a call.**

*Measured* on cbb00cb with `createEvalSignal` over `{ user: signal({ name, n, tags: [...] }) }`, and
on 0.3.0:

| Expression | Up to 0.2.x | 0.3.0 |
| ---------- | ----------- | ----- |
| `user.name = "Bob"` | writes into `user()` | refused, `kind` `'member'` |
| `user.n++` | writes into `user()` | refused |
| `let u = user; u.name = "Bob"; u.name` | writes into `user()` | refused |
| `[user].map(u => (u.name = "Bob"))[0]` | writes into `user()` | refused |
| `let o = {}; o.a = 1; o.a` | `1` | `1` |
| `let t = 0; for (let i = 0; i < 3; i++) { t += i; } t` | `3` | `3` |
| `user = 1` | refused, `kind` `'key'` | refused, `kind` `'key'` |
| `user.tags.push("x")` | mutates `user().tags` | mutates `user().tags` — [C4](#c4) |

**What the first cut refused that it should not have.** Step 1 was first written recording object
and array literals only. Run through a context applying the rule, nine writes into data the
expression had made itself were refused. Each group was decided on its own:

| Group | Expression | Decision |
| ----- | ---------- | -------- |
| A method's result | `let m = [1, 2].map(v => v * 2); m[0] = 0; m[0]` | **Refused, accepted and documented.** A call can return an existing object as easily as a new one — `[user].find(u => true)` returns the object inside `user()` — and the walk cannot tell them apart, so no call result is created. Spread it into a literal first: `[...xs.map(f)]` |
| | `let f = [3, 1, 2].filter(v => v > 1); f[0] = 9; f[0]` | as above |
| | `let t = [1, 2].slice(); t[0] = 0; t[0]` | as above |
| | `let c = [1].concat([2]); c[0] = 5; c[0]` | as above |
| | `let s = "a,b".split(","); s[0] = "c"; s[0]` | as above |
| A rest value | `let [first, ...rest] = [1, 2, 3]; rest[0] = 9; rest[0]` | **Allowed — recorded.** A rest is a fresh one-level copy, as a spread is |
| | `let { a, ...others } = { a: 1, b: 2 }; others.b = 5; others.b` | as above |
| | `((...xs) => (xs[0] = 7, xs[0]))(1, 2)` | as above |
| An arrow function | `let fn = x => x; fn.tag = 1; fn.tag` | **Allowed — recorded.** A new function on each evaluation of the arrow |

A `new` result stays unrecorded for the call's reason: a constructor can return an existing object.

**The survey of every place the walk creates an object found a tenth: a regex literal**, refused
because acorn builds its `RegExp` once per parse. That was a defect in its own right — every
evaluation of one parsed tree shared the object, so a global regex carried `lastIndex` from one
evaluation into the next — and `eval-core` 0.10.0 fixes it: the literal visitor pushes a copy per
evaluation, and records it. The spec row for it writes `r.tag`, not `r.lastIndex`: `lastIndex` is a
non-configurable own property, and `safeSetProperty` writes through `Object.defineProperty`, which
refuses to redefine one whatever the policy says. That was [A23](#a23), fixed the same day for the
same release; the row now writes `r.lastIndex`.

*Fixed* 2026-10-03: the `eval-core` hook, then the regex fix, then this library's guard, each its
own commit. Specs: `member-write-policy.spec.ts` in
`eval-core` (32); in `eval-signals`, the two known-gap cases in `signal-context.spec.ts` changed
deliberately and the rows above added there through `EvalService` (9) and in `eval-signal.spec.ts`
through the factory (10), with the README's spread-copy block executed (1); in `eval-forms`, one
member-write row per adapter (2). `eval-signals` 140 → 158, `eval-forms` 267 → 269.

**Probes**, each reverted:

| Probe | Against | Failed | Which |
| ----- | ------- | -----: | ----- |
| The signal context does not opt in | `eval-signals` | 11 | every member refusal, both message rows, the `onError` row; the allowed rows, the key rows and the `push` gap stay green |
| It refuses every member write | `eval-signals` | 2 | the two object-literal rows; the loop rows write identifiers only |
| The signal context does not opt in | `eval-forms` | 2 | exactly the two adapter rows |

`eval-core`'s own probes are in the commits that added the hook and the regex fix.

<a id="c2"></a>
## C2 — Detect a write violation at construction rather than at first recompute

**Package** signals · **Kind** decision · **Status** **Retired — decided 2026-10-03**. Was Open

Because the violation is *static* (`count = 5` is illegal on every recompute with every dataset),
it could be found by inspecting the AST for `AssignmentExpression` / `UpdateExpression` nodes at
`createEvalSignal` time and failing there, instead of on the first read. Strictly earlier and
strictly more informative.

It is **not** a replacement for the runtime throw: the `EvalContext.set` override is the
correctness guarantee and covers a context reached by any route, including `createSignalContext`
used standalone with `EvalService`.

Cost: it needs the AST, and § 5 currently admits only `CompilerService.compile`, which returns a
`stateCallback` closed over the AST rather than the AST itself.

Decide with [C1](#c1) — the static-check mechanism is one of C1's three candidates, so deciding
C2 alone forecloses the cheaper half of C1.

*Recorded*: [`signals/phase-3-plan.md` § 8 q5](signals/phase-3-plan.md).

**Decided 2026-10-03, with [C1](#c1): no construction-time check.** The runtime guard is the
guarantee — both halves of it, the `set` override and C1's member guard, live in the context, so
they hold for a context reached by any route — and it fires on the first read. A static pre-check
would add an earlier error at one entry point and nothing a consumer could not already see by
reading the signal once. And it could not decide C1's half at all: whether a member write is
allowed depends on whether the walk created its target, which `let u = user; u.name = 'x'` and
`let u = {}; u.name = 'x'` share an AST shape and differ in.

<a id="c3"></a>
## C3 — Whether `eval-signals` should work around [A4](#a4) locally

**Package** signals · **Kind** decision · **Status** **Retired — decided and fixed 2026-10-01**;
released 2026-10-02 in `eval-signals` 0.2.0, tagged c56f987. Was Open — decision point passed
unrecorded

A containment for [A4](#a4)'s `lookups` divergence exists entirely inside this library: override
`getKey` on the adapter's subclass to fall back to the source, reusing `resolve()`.

It was **not** taken in Phase 3 step 2, for a stated reason: `getKey` also feeds
`EvalReadEvent.key`, which is what step 3's `dependencies` set reports, so changing it there would
silently change step 3's output. § 8 q3 was therefore **reopened and assigned to step 3**, "with
the two consumers on the table together".

**Step 3 never recorded an answer.** [`signals/step-3-summary.md` § 5.3](signals/step-3-summary.md)
carries it forward under "still carried from earlier steps", and all six Phase 4 summaries inherit
that phrasing. There is no settlement in the plan's step 3 section either. The decision point
passed and the question is still open — logged here so it is not inherited a seventh time.

*Recorded*: [`signals/phase-3-plan.md` § 8 q3](signals/phase-3-plan.md).

*Re-measured* 2026-10-01 on master 955f0c9: `createEvalSignal('COUNT + 1', { count }, …)` with
`caseInsensitive` and `trackDependencies` reported `['COUNT']`.

**Decided 2026-10-01: the source's key.** Under `caseInsensitive`, a key a signal context
resolves from its own source is named as the source spells it — in `getKey`, so in read events
and in `SignalContextWriteError.key`, and in the first segment of each `dependencies` path.
[A4](#a4)'s fix, the same day, already stopped the write error naming `'undefined'`; it names
the key *as written*, and this names the source's.

**One premise of the entry was wrong, and it cost a stop.** "`getKey` also feeds
`EvalReadEvent.key`, which is what step 3's `dependencies` set reports" — it does not.
`createDependencyTracker` collects `event.path`, which `emitRead` builds from the source text
(`node.name`, or `readPath(node)` for a member), and `getKey` reaches only `event.key`. With the
override alone in place, measured, the write error and `getKey('COUNT')` said `'count'` and
`dependencies` still said `['COUNT']`. So the fix has two halves:

- **`SignalEvalContext.getKey`**, under `caseInsensitive` only. Whether the source answered is
  asked of `get` itself: the adapter's resolver records the source key it matched (`match()`,
  formerly `resolve()`, now returns the key), and `get` reaches the resolver only when scopes,
  `original` and prior scopes found nothing. Otherwise `eval-core`'s answer stands — a pushed
  scope still shadows the source, and a prior scope or a lookup a caller added answers as on any
  `EvalContext`. `get`'s order is the same in every `eval-core` the peer range admits, so there
  is no version check. The cost is a second `get` per `getKey`, under `caseInsensitive` only.
- **`createEvalSignal`'s `dependencies`**, under `caseInsensitive` only (the factory's `eval`
  options or the context's own): after each recompute, each path's first segment is rewritten to
  the key the identifier read of that name resolved to, from `tracker.reads`. `reads`, the
  identifier read's `key` from `getKey` and its `path` from `node.name` are all present at
  `eval-core` 0.3.0, checked at the tag.

**Top-level segments only**, because they are the keys of the context — the only spelling this
library owns. Later segments are property names inside a consumer's value: their resolved key is on
a member read that a computed member gives no path at all, and respelling them would turn a lookup
by root into a walk of each chain. So `user.NAME` reports `user.NAME`, documented in the README's
`trackDependencies` section and in `EvalSignal.dependencies`.

**`eval-forms`**, measured with a throwaway spec over `createFieldContext` under
`caseInsensitive`: a field-half key reports the source's spelling (`NAME` → `name`), and a
form-half key the key as written (`COUNTRY` → `COUNTRY`), in read events and in `getKey`. The form
half is the resolver of a second `createSignalContext` that `createFieldContext` discards after
taking its `lookups`, so that resolver's match lands on the discarded context, not on the field's.
Not widened, as decided. **No entry filed**: no consumer reads those keys. `/reactive` builds its
signals without `trackDependencies` and its field contexts without options, so its re-exposed
`dependencies` is always empty; `/signals` tracks nothing either, and its rule lookup is not a
signal-context source, so it gets `eval-core`'s answer, the key as written.

*Fixed* 2026-10-01. Specs: in `eval-signal.spec.ts`, five under `trackDependencies` —
`'COUNT + 1'` over `{ count }` → `['count']`; `'USER.name'` → `['user', 'user.name']` (the
tracker records the root read as well, as `'a.b + c'` → three paths always has); `'user.NAME'` →
`['user', 'user.NAME']`; an arrow parameter `count` shadowing the source's `count` → `['items']`;
and without the option `'COUNT + count'` over both spellings → both, unchanged. In
`signal-context.spec.ts`, the write error names `'count'`, and four `getKey` cases: `'COUNT'` →
`'count'`, a pushed scope shadowing the source, another lookup keeping core's answer, and
case-sensitive unchanged. `eval-signals` 131 → 140.

**Probes**, each reverted, against 140:

| Probe | Failed | Which |
| ----- | -----: | ----- |
| A: the rewrite removed | 2 | `'COUNT + 1'`, `'USER.name'`; the write error stays green |
| B: the override removed | 4 | the write error, `getKey('COUNT')`, `'COUNT + 1'`, `'USER.name'` — the rewrite reads the override's answer |
| C: later segments respelled too | 1 | `'user.NAME'` |
| D: dependencies rebuilt from every identifier read | 1 | the arrow parameter |
| E: the source asked directly rather than through `get` | 1 | the pushed scope |
| F: a non-source answer replaced with a lowercased key | 1 | the other lookup |

Every case went red under at least one probe except the case-sensitive pair, which pins
behaviour no plausible break of *this* code moves: without `caseInsensitive` the resolver matches
exactly, so the override's answer equals `eval-core`'s, and over a signal context alone an ungated
rewrite maps every root to itself. The gate is therefore mostly a cost guard. Not wholly: a prior
scope a caller registers with its own `caseInsensitive` corrects its namespace in `getKey` whatever
the walk's options, and only the gate keeps a case-sensitive signal's `dependencies` from
respelling that root. No case covers that combination.

<a id="c4"></a>
## C4 — A mutating method call escapes the member-write policy

**Package** signals · **Kind** accepted, then fix · **Status** **Retired — fixed 2026-10-04**;
released 2026-10-07 in `eval-core` 0.11.0, `eval-signals` 0.4.0 and `eval-forms` 0.4.0, tagged
776885a: `eval-core` asks the policy before a built-in method writes, and `eval-signals` refuses one with `kind`
`'method'`; `eval-forms` by consequence. Was Open, documented

*Fixed* 2026-10-04, in two packages, and opt-in in the first.

- **`eval-core`.** The call visitor asks `EvalContext.checkMemberWrite` before calling a
  function that is, by identity, a built-in that writes into an object it is handed: `Array`'s
  `copyWithin`, `fill`, `pop`, `push`, `reverse`, `shift`, `sort`, `splice` and `unshift`;
  `%TypedArray%`'s `copyWithin`, `fill`, `reverse`, `set` and `sort`; `Map`'s `set`, `delete`
  and `clear`; `Set`'s `add`, `delete` and `clear`; `WeakMap`'s `set` and `delete`; `WeakSet`'s
  `add` and `delete`; every `Date.prototype` setter, sixteen in V8 with Annex B's `setYear`; and
  `Object`'s `assign`, `defineProperty`, `defineProperties`, `setPrototypeOf`, `freeze`, `seal`
  and `preventExtensions`. The target is the receiver the call is made with, the context itself
  for a bare call, or the first argument for `Object`'s. `createdByEvaluation` comes from
  [C1](#c1)'s record, so `let a = []; a.push(1)` and `[...user.tags].push(1)` still work. `key`
  is undefined, and `EvalMemberWrite` gains an optional `method`, `'Array.prototype.push'`. Both
  branches of the visitor ask, member call and bare call. A context with no policy pays one field
  read per call, as for a member write. The table and `consultMethodWrite` are in
  `member-write-policy.ts`.
- **`eval-signals`.** `SignalContextWriteError.kind` gains `'method'`, with `key` naming the
  method as `eval-core` does, and a message that names it and what to use instead: `toSorted`,
  `toReversed`, `toSpliced`, `with`, or a spread into a literal, and nothing for a `Date`, a
  `WeakMap` or a `WeakSet`, which have no copy to make.
- **`eval-forms`** changes no code. One case per adapter, in `field-schema.spec.ts` and
  `rules.spec.ts`, and the README's "So does a write into the form's data" gains the method.

**Object and Reflect, measured** before either was added. `Object`, `Reflect`, `globalThis`,
`window`, `self` and `global` as identifiers all evaluate to `undefined`, and every member route to
a `constructor` is refused by the prototype-pollution guard. **But the bare identifier
`constructor` evaluates to `Object`**, inherited by the context's own `original`, and so does
`this.constructor`. So `Object` is reachable, and its seven first-argument mutators are in the
table. Through a signal context, `constructor.assign(user, { x: 1 })` wrote into `user()` before
the fix and is refused after it. How `constructor` resolves at all is new, and a security defect
in its own right: [B6](#b6). *(Since B6's fix, 2026-10-05, neither `constructor` nor
`this.constructor` resolves, so `Object`'s seven are matched only when a context supplies
`Object`. The CHANGELOGs and READMEs say so.)* **Reflect was not reached.** It is not a property of
`Object`, and no other route found it, so its mutators are not in the table. A caller who puts
`Reflect` into a context reaches them, and they are not asked about.

**Bounds**, recorded and not closed:

- **A regex the caller supplied keeps its `lastIndex` behaviour.** Measured on Node 26 with
  `lastIndex` 1: with a global or sticky regex, `test` and `exec` advance it to 2; `match`,
  `replace` and `replaceAll` with a global one reset it to 0, and a sticky `replace` advances it;
  `search`, `split` and `matchAll` leave it at 1. Refusing `test` and `exec` would break
  `pattern.test(value)`, the commonest rule there is. A spec pins `test`'s case as not asked about.
- **A method the caller wrote is the caller's own code**, and is not asked about, whatever it is
  called. A spec pins a caller's own `push`.
- **A call's result counts as given**, as under C1: `a.slice().push(4)` is refused.
- **A built-in reached through `call`, `apply` or `bind` is not asked about.**
  `[].push.call(user.tags, "x")` still writes into `user()`, because the function the visitor
  calls is `call`. Measured after the fix, and recorded as [C5](#c5) rather than
  folded in here. *(Closed since, 2026-10-05: [C5](#c5)'s fix asks about the method they run.)*
- **A built-in from another realm is not recognised.** An array made in an iframe holds that
  realm's `push`, which is not the function in the table. Read, not measured.
- **`evaluateCall`** in `call-expression.ts` calls functions without asking. It has no caller in
  the repository, and was left alone.

*Verified* by four probes, each run against all three projects' whole suites and read case by case,
then reverted. The suites before the probes: `eval-core` 1357, `eval-signals` 185, `eval-forms`
343, none red.

| Probe | `eval-core` | `eval-signals` | `eval-forms` |
| ----- | ----------- | -------------- | ------------ |
| Drop the check: both calls in the visitor removed | **57** red: all 47 refusal rows, the 6 allowed rows (never asked), and the bare-call, call-result, arrow-body and scope-pop cases. The five that assert "not asked" stay green | **12** red: every method refusal, message and `onError` row; the 3 allowed rows stay green | **2** red: both new cases |
| Match by name: the call site's spelling looked up in the table's short names | **13** red. The caller's own `push` is refused. `let p = a.push; p(4)` is not asked about. 11 refusal rows are refused, write nothing, and report the wrong method, since a short name shared by several owners (`set`, `delete`, `clear`, `add`, and `t.*` against `Array`'s) picks the first | **0** | **0** |
| Every receiver created | **51** red: all 47 refusal rows, and the bare-call, call-result, arrow-body and scope-pop cases. All 6 allowed rows green | **12** red, the same rows as the first probe | **2** red |
| No receiver created, the opposite direction | **6** red: exactly the 6 allowed rows | **3** red: exactly the 3 allowed rows | **0**: neither case allows anything |

The name probe goes red in `eval-core` only. The two downstream packages call real built-ins by
their own names, where name and identity agree, so the identity property is pinned by two
`eval-core` rows, the caller's own `push` and the bare call.

**The entry as it stood:**

[C1](#c1)'s fix refuses a member write whose target the expression did not
create, and it is asked about every write the two write visitors make. A method that mutates its
receiver writes from native code instead: the call visitor calls it, and no write visitor runs. So
`user.tags.push("x")` over `{ user: signal({ tags: ['a'] }) }` returns `2` and leaves `user().tags`
as `['a', 'x']`, mutated from inside a `computed()` — and so do `splice`, `sort`, `reverse`,
`fill`, `Map#set`, `Set#add` and their kin. Pinned as current behaviour in `signal-context.spec.ts`
and `eval-signal.spec.ts`, and a paragraph in the package README's "Writes are not supported".

Closing it would need the call visitor to know which methods mutate their receiver — a list per
built-in type, which the call sandbox does not keep — or the value frozen or wrapped before the
call, which is C1's rejected second mechanism. Kept here because "accepted and documented" is a
state a later phase may want to revisit, not a closed question.

*Recorded*: C1's decision, 2026-10-03.

<a id="c5"></a>
## C5 — A built-in mutator reached through `call`, `apply` or `bind` escapes C4's check

**Package** signals, mechanism in core · **Kind** fix · **Status** **Retired — fixed 2026-10-05**;
released 2026-10-07 in `eval-core` 0.11.0, with `eval-signals` 0.4.0 and `eval-forms` 0.4.0 by
consequence, tagged 776885a

*Fixed* 2026-10-05, in `eval-core`'s `consultMethodWrite` (`member-write-policy.ts`), which the call
visitor already asks before every call when the context has a policy. When the function about to
be called is `Function.prototype.call`, `apply` or `bind`, it asks about the function they run
instead, as a direct call of it: the receiver is the `this` argument they pass, and the arguments
are the rest, or `apply`'s second argument read as an array-like. So the table's own rule,
receiver or first argument, picks the target, and `Object.assign.call(null, o, p)` asks about `o`.
The question recurses, so `call.call`, `call.apply`, `bind.call` and `call.bind` are followed to
the method they reach. `bind` is asked at bind time, about the bound `this` and bound arguments,
since the bound function is new and no table could recognise it when it is called: binding a
built-in to an object the walk did not create is refused before the bound function exists. The
table and the question are C4's, unchanged. A context with no policy never reaches this code.

*Verified*: `member-write-policy.methods.spec.ts` gains 15 cases. A given array is refused, with
nothing written and one write asked about, through `call`, `apply`, `bind`, and `bind` then a
call. A copy is allowed through each of the three, asked about once as created. Four nested
forms are followed to `Array.prototype.push`. `Object.assign` through each of the three is asked
about its first argument. A non-mutating built-in, and the caller's own `push`, through them are
not asked about. `signal-context.spec.ts` gains 7: `SignalContextWriteError` with `kind`
`'method'` and `user()` unchanged through `call`, `apply`, `bind` and `call.call`, and a copy
allowed through each of the three. Probes, each against all three projects' whole suites, read
case by case, then reverted:

| Probe | `eval-core` | `eval-signals` | `eval-forms` |
| ----- | ----------- | -------------- | ------------ |
| Drop the `call` branch | **7**: the `call` refusal, copy and `Object.assign` rows, and the four nested rows, each of which has a `call` hop | **2**: `call` and `call.call` | **0** |
| Drop the `apply` branch | **4**: the `apply` refusal, copy and `Object.assign` rows, and `call` through `apply` | **1**: `apply` | **0** |
| Drop the `bind` branch | **6**: both `bind` refusal rows, the copy and `Object.assign` rows, `bind` through `call` and `call`, bound | **1**: `bind` | **0** |

The `eval-signals` copy rows stay green under every probe, and are not meant to go red: a signal
context cannot show whether it was asked, only what it refused, so they guard against
over-refusal. Whether a copy was asked about is pinned in `eval-core`, whose policy records every
question.

**The entry as it stood:**

[C4](#c4)'s fix recognises a built-in that writes by its identity, at the call
that invokes it. Through `Function.prototype.call`, `apply` or `bind`, the function the call
visitor invokes is `call`, `apply` or a new bound function, none of which is in the table, so the
policy is never asked. Measured after the fix, over
`createSignalContext({ user: signal({ name: 'Ada', tags: ['a'] }) })`:

| Expression | Result |
| ---------- | ------ |
| `user.tags.push("x")` | refused, `kind` `'method'` |
| `let p = user.tags.push; p("x")` | refused, `kind` `'method'`: a bare call asks about the context as receiver |
| `[].push.call(user.tags, "x")` | `2`, and `user().tags` is `['a', 'x']` |
| `[].push.apply(user.tags, ["x"])` | the same |
| `[].push.bind(user.tags)("x")` | the same |
| `[].push.call.call([].push, user.tags, "x")` | the same |

`[].push` is reachable from any expression: a literal's methods are ordinary reads. So is
`call`, off any function.

**What a fix would do**, sketched and not designed. When the function is
`Function.prototype.call` or `apply` and its receiver is a function, ask about that function, with
`args[0]` as its receiver and the rest as its arguments, repeatedly for `call.call`. For `bind`,
ask when a built-in in the table is bound, with `args[0]` as the target, since the bound
function's identity is new; or refuse that bind outright. The table and the question are C4's.
The work is in `call-expression.ts`.

Documented meanwhile in the `eval-signals` README's "Writes are not supported" and the
`eval-forms` README's error-policy section.

*Recorded*: C4's fix, 2026-10-04, from a probe run after it.

<a id="c6"></a>
## C6 — The README's `resource` composition does not compile at Angular 19, inside the peer range

**Package** signals · **Kind** docs · **Status** **Retired — fixed 2026-10-09**, docs and tests
only, by the Phase 5 plan's step 4; ships in the `eval-signals` 0.5.0 README

*Fixed* 2026-10-09. The README's "Async expressions" section, rewritten by
[Phase 5](signals/phase-5-plan.md)'s step 4, gives the composition in both spellings under "The
sync path still carries the promise": `params` from Angular 20, and `request` at 19, the loader's
parameter named to match in each.

*Verified*: `readme-examples.spec.ts` now executes the `params` block — the signal carries the
promise, the resource loads it, and it reloads when `id` changes. With the read moved into
`loader`, that case fails on the reload and no other case does, so it carries the prose's "put the
read in `params`". The `request` block cannot compile at the workspace's Angular 22 and is not
executed; the spec's coverage list says so, and that the spelling is read from 19.2.25's published
typings — this entry's evidence below — rather than from the plan's § 8 q1 matrix, which ran the
async signal's own specs and not this block. **The old exclusion is how this entry went unseen**:
the spec left the whole composition out as "Angular's API rather than this library's", so neither
spelling ever ran.

**The entry as it stood:**

The "Async expressions" section shows `resource({ params: () => user() as Promise<User>, loader:
({ params }) => params })` (`modules/eval-signals/README.md:284-290`). At `@angular/core` 19.x the
option and the loader's parameter are named `request`; `params` arrives in 20.0.0. The package's peer
range is `@angular/core >=19.0.0`, and the README presents the composition as working "at your own
Angular floor" — at 19 it does not compile. `readme-examples.spec.ts` deliberately does not execute
it (its header, `:68-72`), and the workspace runs 22, so nothing here could have caught it.

**Fix**: give both spellings. Phase 5's step 4 rewrites the section and does
([`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 4).

*Recorded*: this entry; that plan's § 1.2 finding 6. Opened 2026-10-07 by the Phase 5 plan.
*Verified*: read 2026-10-07 from `ResourceLoaderParams` and `BaseResourceOptions` in the published
`.d.ts` of `@angular/core` 19.2.25 and 20.0.0, unpacked outside the repository.

<a id="c7"></a>
## C7 — Phase 3's scope-containment case discriminates only through its depth assertion

**Package** signals · **Kind** test gap · **Status** **Retired — fixed 2026-10-10**, test only;
ships in no package. Was Open

*Fixed* 2026-10-10. The case's `strand` pushes `{ x: 'stranded' }` twice, as Phase 5's criterion-10
fixture does. `program.ts`'s `finally` pops the second, so the first survives the walk and shadows
`x`. The comment that said the end-to-end read gives `'stranded'` without the guard is now true, and
it says why: one push leaves only the `Program`'s empty scope behind. The depth expectation stays
1. The guard restores to the caller's mark, the same however many scopes a recompute strands;
without the guard the depth is 3 (P1 below).

*Verified*: four probes on the working tree, all reverted, `eval-signal.ts` matching HEAD afterwards.
P2 is the one this entry is about: the guard loop in `eval-signal.ts` disabled and the case's two
direct assertions removed, **1 failed of 421**, this case, at the end-to-end
`expect(plain()).toEqual('from source')`, received `"stranded"`. The same with the single push put
back: 421 passed, which is this entry's measurement reproduced. P1, the guard disabled with the
assertions present: 1 failed, this case, at `expect(context.scopes.length).toEqual(1)`, received 3.
P3, the guard popping to the bottom of the stack rather than to the mark: 1 failed, this case, the
same assertion, received 0. No other case went red in any probe. With all of it reverted, the suite
is green at 421, the count it had before.

**The entry as it stood:**

`eval-signal.memory.spec.ts`'s "should contain a scope stranded through the published push to the
recompute that made it" strands a scope through a source function that pushes one and does not pop
it, then asserts two things: the context's scope depth after the recompute, and, end to end, that a
later recompute of `x` reads the source rather than `'stranded'`. Only the first discriminates.
Measured by the reviewer: with the guard loop in `eval-signal.ts` disabled and the depth assertions
removed, the end-to-end read still passes.

The mechanism is the one [`signals/phase-5-plan.md`](signals/phase-5-plan.md) § 3.5 records for its
own criterion 10. The walk's own `Program` scope is on the stack when the source function runs, and
`program.ts`'s `finally` pops whatever is on top — so it pops the single stranded scope, and what is
left behind is the `Program`'s empty scope, which shadows nothing. The case's comment, "without the
guard this reads `'stranded'`" (`:321`), is false.

**Fix**: push twice, as Phase 5's criterion 10 fixture does (`eval-signal-async.spec.ts`, "the
scope-depth restore"), and correct the comment. Test only; it ships in no package.

*Recorded*: this entry. Opened 2026-10-08 by Phase 5 step 2.
*Verified*: measured 2026-10-08 by Phase 5 step 2's reviewer — the guard loop disabled and the depth
assertions removed, the case still green. The mechanism measured the same day by that step: with one
push, its own criterion 10 case stayed green against a restore moved to settlement, and a probe
showed the depth back at 1, the `Program`'s scope, when the run returned.

---

# D. `eval-forms`

<a id="d1"></a>
## D1 — The throwing-subscriber premise is false in both halves

**Package** forms · **Kind** fix + decision · **Status** **Retired — decided and fixed
2026-10-03**; released 2026-10-04 in `eval-forms` 0.3.0, tagged 0c3299e. Was Open, Premise retired

**The premise.** Four places in `eval-forms` state that a throw inside the `group.events`
subscriber "unsubscribes it and silently ends all diffing for the life of the form".

**It is false in both halves**, measured against this repo's `rxjs@7.8.2` with the same pipeline
shape `createControlSource` uses — a `Subject` exposed through `asObservable()`, piped through
`takeUntil`, with a function next-handler:

```
next(1) returned normally to the caller
closed after 1st throw: false | handler calls: 1 | observers: 1
closed after 2nd throw: false | handler calls: 2 | observers: 1
ASYNC UNHANDLED: boom  (x2)
```

RxJS 7's `ConsumerObserver` catches the handler's throw and re-reports it through
`reportUnhandledError`, **asynchronously**. The subscription stays open, and later emissions are
still delivered. `reportUnhandledError` (rxjs 7.8.2) schedules a timer whose callback calls
`config.onUnhandledError` when one is set and otherwise rethrows the error, where the host's
global error handling receives it. *(Corrected 2026-10-03: this sentence used to say that in an
Angular application the error reaches the unhandled-error path, which nothing here cited.)* So the
failure is *loud and non-fatal*, not *silent and terminal* — the opposite of the premise on both
axes.

**The four sites**, all stating it as established fact, all verified still present 2026-09-06:

- [`control-source.ts:165`](../modules/eval-forms/reactive/src/lib/control-source.ts#L165) — the
  own-property read in `sync`.
- [`field-schema.ts:199`](../modules/eval-forms/reactive/src/lib/field-schema.ts#L199) —
  `validate`'s group loop.
- [`control-source.spec.ts:409`](../modules/eval-forms/reactive/src/lib/control-source.spec.ts#L409)
  — the prototype-name removal case. This comment **already measured something that does not fit
  it**: it goes on to record that "the throw lands in that key's own subscriber and not back in
  `sync`, so the diff loop itself survives". The contradiction was sitting in one comment and was
  not read as one.
- [`forms/phase-4-plan.md:1438`](forms/phase-4-plan.md) — and it cites "§ 3.5.5" as the source,
  which does **not** contain the claim. The citation is what made it look settled.

**This is not a comment fix.** The premise is load-bearing for a shipped design decision:
enforcement is construction-time only, and `validate` is not re-run for a control added later,
*because* throwing from the diff was held to be unavailable. If a throw there is merely reported
and diffing continues, that argument no longer decides the question, and the alternatives reopen —
reject a late `addControl` from the diff, surface it through a channel the consumer can observe,
or keep the current behaviour on a different and stated ground (a throw cannot un-add the control,
and it fires far from the call that caused it, which may well still be decisive).

Scope: correct the four sites; decide the question again on the real behaviour and record which
ground it now rests on; and add a spec that pins what actually happens when the diff throws, since
none exists — the case above pins the *symptom* the guard prevents, not the subscriber's fate.
Behavioural if the decision changes, documentation-only if it does not.

**Pinned first, on the real mirror, 2026-10-03.** A throw forced out of `createControlSource`'s
own `sync` — a record the consumer had made non-extensible, so `open`'s `defineProperty` throws
for any new key — measured: `addControl` returned normally; nothing was reported synchronously;
after a macrotask `config.onUnhandledError` had received **two** errors, one per `group.events`
emission that one `addControl` fires (value, then status); the subscription stayed open, one
observer; a later `removeControl` was still diffed; and every later emission reported the error
again — 4, then 6. That case is now a spec, and it runs on a path any version of the refusal below
leaves throwing.

**Decided 2026-10-03: reject a late prototype-named control from the diff, and report it once.**
The ground the old decision stood on is gone, and the two that might have replaced it do not
decide it either. "A throw cannot un-add the control" is true and does not matter: the refusal is
*not mirroring* it, which the diff can do, and no expression could have read it anyway. "It fires
far from the call" is true of the out-of-band report and is the price of a diff in a subscriber;
it is still loud, it names the control, and it is the only diagnostic there was ever going to be
for this misuse — before, there was none.

So `sync`, for a control it has not mirrored whose name is off `Object.prototype`: does not open
it; finishes the rest of the emission — every replacement, removal and other addition; then throws
`bindFieldProperties`' construction-time message, shared now from one module-private helper,
naming each such control, each name once. A name leaves the reported set when its control leaves
the group, so a later re-add is reported afresh. The *class* half of `validate` — a nested group
or `FormArray` — was left construction-time only by this decision, and extended the same day;
see below.

**The four sites**, corrected to the measured behaviour: `control-source.ts`'s `sync` comment now
says a bare read's throw lands in that key's own subscriber, and documents the refusal;
`field-schema.ts`'s "Construction-time only" comment is rewritten for what runs once and what
`sync` now does; `control-source.spec.ts`'s removal case no longer says the subscriber
unsubscribes; and `forms/phase-4-plan.md` carries a dated correction under the original sentence,
which is left standing as the design record it is. The README sentence the field-schema comment
pointed to, under "It is validated when you bind", is rewritten too.

*Fixed* 2026-10-03. Specs, `control-source.spec.ts` (4): the pin above; `addControl('constructor', …)`
returns normally and `onUnhandledError` receives exactly one error, with the construction-time
message; the control is not mirrored while one added in the **same emission** is — both added
with `emitEvent: false`, then `markAsTouched()` for exactly one emission, because `addControl`
fires two and a `sync` that gave up mid-loop mirrored the second control on the second one
anyway; and later emissions still diff without the name being reported again. `afterEach` settles
a macrotask before restoring the handler, so a report from a case that failed early lands in that
case and not the next. `eval-forms` 280 → 284.

**Probes**, each reverted, against the whole `eval-forms` suite, on the final spec:

| Probe | Failed | Which |
| ----- | -----: | ----- |
| The refusal dropped — not mirrored, never thrown | 3 | the three refusal rows; the pin stays green |
| The name mirrored anyway, still reported | 1 | the "not mirrored" row |
| A throw at the refused name, before the loop finishes | 1 | the same-emission row — green with a two-event `addControl` fixture, which is why the row uses `markAsTouched` |
| Reported names not remembered | 2 | "report once" (two emissions, two reports) and "not reported again" |

**Extended 2026-10-03, for the same release: a nested `FormGroup` or `FormArray` added later is
refused on the same path**, with construction's `Control '…' is not a FormControl …` message —
not mirrored, reported once, thrown after the rest of the emission. The two messages and their
predicates now live together in a module-private `control-refusals.ts`; a late control is checked
in construction's order, the name first. A key that already had a channel was not re-checked at
first, so `setControl` replacing a mirrored control with a group still re-pointed it; that was
closed the same day, below. Lifting flat-only is still [E2](backlog.md#e2)'s. Specs (6): the
report-once, same-emission and later-emissions rows, for a late `FormGroup` and a late
`FormArray`; `eval-forms` 292 → 298. Probes, each reverted: the class check dropped, 6 failed —
all six rows, the prototype-name rows green; a late group mirrored anyway, still reported, 2 —
the two "not mirrored" rows; a late group reported on every emission, 4 — "report once" and "not
again" for each, the single-emission rows green.

**And swapped in, 2026-10-03, for the same release: a nested `FormGroup` or `FormArray` that
`setControl` swaps in for a mirrored control is refused on the same path.** `sync`'s replaced
branch used to re-point the channel at whatever arrived, so the key went on being mirrored as
the group's aggregate value. Now a replacement that is not a `FormControl` closes the key, as a
removal does, and the loop over unmirrored controls then refuses it exactly as an added one —
construction's `is not a FormControl` message, reported once, thrown after the rest of the
emission. A `FormControl` swapped back later is mirrored again, and since mirroring a name now
also takes it out of the reported set, a group swapped in after that is reported afresh: kept in
the set, it would have been refused with nothing reported. Specs (10), for a `FormGroup` and a
`FormArray` each: `setControl` returns and the refusal is reported once; the key stops being
mirrored while a second `setControl` and an `addControl` in the **same emission** are applied —
`country`, the swapped key, is the first the diff visits; later emissions diff without a second
report; a `FormControl` swapped back is mirrored again, behind a setup guard that the key had
stopped; and a second swap after that is reported afresh. `eval-forms` 298 → 308. Probes, each
reverted:

| Probe | Failed | Which |
| ----- | -----: | ----- |
| The check dropped — the replaced branch re-points whatever arrives | 10 | all ten rows |
| The key kept mirrored, still reported once | 4 | the two "stops being mirrored" rows, and the two swap-back rows at their setup guard |
| A swapped-in refusal reported on every emission | 6 | "report once" (`setControl` fires two emissions), "not again" and "afresh" for each; the single-emission and swap-back rows green |
| A refused name never mirrored again while it stays in the group | 4 | the swap-back and "afresh" rows for each |
| Mirroring a name not taking it out of the reported set | 2 | the two "afresh" rows |

The prototype-name and late-addition rows stayed green under every one.

<a id="d2"></a>
## D2 — Should `/reactive` reject prototype-shadowed identifiers in expressions too?

**Package** forms · **Kind** decision, **breaking** · **Status** **Retired — decided and fixed
2026-10-03**; released 2026-10-04 in `eval-forms` 0.3.0, tagged 0c3299e. Was Open

**The asymmetry, as it now ships.** `@zvenigora/ng-eval-forms/signals` walks every expression at
registration and throws on any `Identifier` whose name is an own property of `Object.prototype` —
`constructor`, `toString`, `valueOf`, `hasOwnProperty` and the other eight. `/reactive` does not:
its two **prototype-name** checks (`reactive/src/lib/field-schema.ts:172-178` over the schema's
field names, `:214-220` over the group's controls) inspect **names**, never expressions — and
neither do the other two construction-time rejections that entry point makes. So
`{ name: 'city', visible: 'constructor' }` throws under `/signals` and, under `/reactive`, binds
cleanly and renders a field that has no data — because the identifier resolves off
`Object.prototype`, a function is truthy, and truthy means visible.

One authored rule string, two behaviours, and the silent one is the unsafe one. Shipped knowingly
because the alternative was leaving both entry points silently wrong.

**Why it is not a bug fix.** `/reactive` is released and an expression that registers today would
start throwing. That needs three things a docs step cannot supply: a phase, a major-version
decision, and a migration note for a consumer whose form genuinely has a field named
`constructor`.

**What a phase would have to settle:**

- **Where the check runs.** `/signals` guards between `parse` and `compile` inside its own
  registrar. `/reactive` compiles inside `bindFieldProperties`, so the natural site is there —
  a fifth construction-time rejection beside the four the README documents.
- **Whether the residual is acceptable at both.** A *member* expression — `user.constructor` — is
  `eval-core`'s prototype-pollution guard and not this check's business at either entry point, and
  [B1](#b1)'s carve-out applies (narrowed in `eval-core` 0.9.0). A check that
  rejects the bare identifier and passes the member access is the same shape at both, and is
  worth stating rather than discovering. **The answer here has to be the same sentence at both
  entry points**, which is what ties this entry to [B1](#b1).
- **Whether the deliberate over-rejection ports.** `/signals` rejects a name an expression *binds*
  itself — `'[1].map(valueOf => valueOf)'` throws — because a scope-aware guard would be a second
  copy of `eval-core`'s frame logic. The same reasoning applies unchanged at `/reactive`, but it
  is a false positive that a released entry point would be *acquiring* rather than shipping with.
- **The migration note.** The fix for a real `constructor` field is renaming the model key, which
  a consumer may not control if the schema arrives from a server. Whether that is a rename, an
  escape hatch, or an accepted break is the substance of the decision.

Scope if taken: the guard is already written and module-private to `/signals`
(`signals/src/lib/guard-identifiers.ts`), so the mechanism is a **move** rather than a design. The
work is the version decision, the migration note, and the `acorn-walk` peer already being
declared.

*Recorded*: [`forms/phase-6-plan.md` § 3.8 and § 3.8.1](forms/phase-6-plan.md);
[`forms/phase-6-step-6-summary.md` § 4.4](forms/phase-6-step-6-summary.md).

**Numbering note.** The roadmap entry this replaces called this "a Phase 8 question", while
`eval-forms`' README and `CHANGELOG.md` both say only "a later major". No Phase 7 or Phase 8
section exists in `ROADMAP.md` — see [E1](backlog.md#e1). The consumer-facing wording is deliberately
vaguer; this file is the single source for the commitment.

**Decided 2026-10-03: `/reactive` refuses it too, in `eval-forms` 0.3.0.** Each of the three
things the entry said a docs step could not supply, answered:

- **The phase** was not needed. The mechanism was a move, as the entry said: `guardIdentifiers`
  moved to the core entry point, beside `applyErrorPolicy` and exported the same way, and
  `/reactive`'s `validate` calls it over every `visible` and `text` expression in the pass that
  checks field and control names. Same predicate, same message. A rule that does not parse is
  left to `createEvalSignal`, which throws it as before — after the mirror is built — so the
  binding's release-on-failure path keeps the rule that reaches it.
- **The version.** `eval-forms` 0.3.0 is already a breaking minor, for C1, and pre-1.0 a minor is
  where this package breaks.
- **The migration note** is that no refused expression ever produced a value from the form's
  data, and the entry's own objection is what shows it for one of the two kinds. An expression
  that *reads* such a name: a consumer "whose form genuinely has a field named `constructor`"
  could never build that form — `/reactive` already refused a field named off `Object.prototype`
  (`field-schema.ts:172`) and a control named off it (`:214`) — so the identifier only ever read
  the prototype's function. A control added *after* construction is [D1](#d1)'s case: even before
  D1's fix the name resolved off `original` ahead of the mirror, and since that fix, in the same
  release, it is not mirrored at all. An expression that *binds* such a name itself — an arrow
  parameter or a `let` — is the other kind, and this note first missed it; see the correction
  below. What changes for both is that the schema fails at bind time instead of rendering.

The two bounds are now the same sentence at both entry points, as the entry required: a member
expression is `eval-core`'s guard's business, and a name the expression binds itself is refused.

**Corrected 2026-10-03, for the same release, measured at b941b80** (before this fix): every
`/reactive` rule binding one of the twelve names — `[1].some(valueOf => valueOf)`,
`let toString = 'x'; toString`, and so on for all twelve, as an arrow parameter and as a `let` —
*bound* at `bindFieldProperties` and threw on every evaluation, `Access to dangerous property
"valueOf" is blocked for security reasons`: `eval-core` refuses to bind those names. The default
`onError` rendered that as a blank (`visible()` false, `text()` `""`); with `onError: 'throw'` the
error surfaced. A plain `[1].some(v => v)` evaluated to `true`. So the refused expressions that
bind a name never worked either, and "no form that worked loses anything" holds for them too — for
that reason, not the one first written. The same measurement retires the premise of the entry's
third bullet above: refusing a name the expression binds itself is not an over-rejection, since the
binding would not have resolved; `/signals`' README and `guardIdentifiers`' JSDoc said it would,
and are corrected. `[1].map(valueOf => 1)` still registered at both entry points when this was
written — the binding was never visited — and threw that error on every evaluation; it has been
refused since, below.

*Fixed* 2026-10-03. Specs, in `field-schema.spec.ts` (11): `constructor` refused under `visible`
and under `text`; the message names the expression and the identifier; `__lookupGetter__`, one of
the five names the illustrative seven omit; a name the expression binds itself; `CONSTRUCTOR`,
`country.constructor` and `[1].map(valueOf => 1)` accepted; the refusal comes before any
subscription; and the migration claim, by construction — a field named `constructor` and a control
named `constructor` are both refused by their *name* check, which runs first. The README case
pairing the two entry points, `signals/src/lib/readme-examples.spec.ts`, pinned the asymmetry —
`/reactive`'s `visible()` was `true` — and was changed deliberately, agreed before the change, to
assert that both throw. `eval-forms` 269 → 280.

**Probes**, each reverted, against the whole `eval-forms` suite:

| Probe | Failed | Which |
| ----- | -----: | ----- |
| The call in `validate` removed | 7 | the six new refusal rows and the README pair; the accepted rows and the two migration rows (name checks) stay green |
| The seven names hard-coded in place of the predicate | 2 | the "seven omit" row at each entry point: `__lookupGetter__` under `/reactive`, `__defineGetter__` under `/signals` |

**Extended 2026-10-03, for the same release: the guard checks binding names too.** `acorn-walk`
hands a binding to a visitor as a `VariablePattern`, never as an `Identifier` — `base.Pattern`
re-dispatches a bare name under that type for a parameter, a declarator, a destructured name and
an assignment target — and `guardIdentifiers` registered only `Identifier`. So a name bound and
never read was never seen: measured at f05ced9, before the change, `[1].map(valueOf => 1)`,
`let toString = 1; 2` and `(({ valueOf }) => 1)({})` each registered under `/signals` and bound
under `/reactive`, and each threw `Access to dangerous property` on evaluation. The walk now
registers the same predicate and message under `VariablePattern`, so the bound above — "a name
the expression binds itself is refused" — holds as written, read or not, at both entry points.
An assignment to such a name, `toString = 1`, registered and bound at both and threw
`SignalContextWriteError` (`kind` `'key'`, the read-only-key check) on evaluation; it now throws
the guard's `Error` at registration or bind time instead. *(Corrected 2026-10-03: this sentence
first said the assignment was already refused, from a harness that ran registration and the first
read in one `try`. Measured apart, at 97c986f and at cfe9d42, through both entry points, the
refusal was at evaluation.)* A destructuring *key*,
`({ valueOf: v }) => …`, is still not seen: it is not a binding.

Specs (6 new, and 3 changed): the three expressions above refused, naming the identifier, in
`guard-identifiers.spec.ts` and in `field-schema.spec.ts`. The accepted row `[1].map(valueOf =>
1)` at each of those two is removed, and `readme-examples.spec.ts`'s pair, which asserted that it
registered while `[1].map(valueOf => valueOf)` did not, now asserts that both throw — all three
encoded the gap, and were changed as the fix's brief directed. `eval-forms` 308 → 312. Probes,
each reverted, against the whole `eval-forms` suite:

| Probe | Failed | Which |
| ----- | -----: | ----- |
| The `VariablePattern` visitor dropped | 7 | the six new rows and the README pair, whose second half now asserts the refusal |
| The `VariablePattern` visitor refusing every binding, predicate ignored | 8 | existing rows that bind or assign an ordinary name — seven write-violation rows across both entry points, and `/reactive`'s per-field context row, whose arrow binds `country`; the new rows stay green |

<a id="d3"></a>
## D3 — Per-registration `caseInsensitive` reaches one of three levers

**Package** forms · **Kind** decision · **Status** **Retired — decided and fixed 2026-10-03**;
released 2026-10-04 in `eval-forms` 0.3.1, tagged 3d56994. Was Open, Covered. A registration's `caseInsensitive`
now reaches all three levers

**Decided: key the memo on the key and `caseInsensitive` together**, the second of the two shapes
the entry weighed. The first, moving `caseInsensitive` onto `createExpressionRules`' own signature,
would have removed the per-registration value rather than honoured it, and changed the shape of a
published option type.

*Fixed* 2026-10-03: `createModelSource`'s memo is two maps, one per casing rule.
`createRuleContext` takes the registration's resolved `eval` and builds the context under it, and
the context's lookup reads the memo under the same rule. The registrar passes it. So "registration
wins, per key" is now exact for both keys of `ExpressionRuleOptions`:

| Place | Built from | Reached by a per-registration `eval.caseInsensitive`? |
| ----- | ---------- | ---------------------------------------------------- |
| the walk's options, `evaluateRule`'s third argument | the resolved per-rule options | yes, as before |
| the rule's context, `createFieldContext({}, {}, options)` | the resolved per-rule options | **yes**; was the factory's |
| the factory's memo, `readProperty` | the casing rule the rule's context reads it under | **yes**: one entry per key per casing rule |

There is still one memo per factory, so § 3.6 of the [Phase 6 plan](forms/phase-6-plan.md) stands
with one amendment: its "one `computed` per key per factory" is now one per key **and casing rule**
per factory. That is two at most, and only for a key that registrations read under different
settings. `rules.model-source-count.spec.ts`, which counts the memo, is unchanged and green.

**The Covered spec flipped, as this entry said a fix would make it.** `rules.spec.ts`'
characterisation case now reads `'US/HQ'` where it read `'undefined/HQ'`, under a new title. The
README section that documented the gap is rewritten: "`caseInsensitive` is in practice a *factory*
option" is now "`caseInsensitive` per registration". Its block prints `'USHQ'`, and the case in
`signals/src/lib/readme-examples.spec.ts` that executes the block is renamed and flipped with it.
`ExpressionRuleOptions.eval`'s JSDoc, which ships in the `.d.ts`, is rewritten too. No exported
symbol changes shape: `ModelSource` is module-private.

*Verified*: five new rows, written first and red against the unfixed code alongside the flipped
case. In `rules.spec.ts`, two registrations on one factory read one key spelled `Country`, one of
them case-insensitive and one not. That runs in both read orders, since the memo builds a key's
computed on its first read. A third row has a registration's `eval: {}` turn off a factory's
`caseInsensitive`. In `model-source.spec.ts`, one row builds a context under the options it is
handed, in both directions, and another holds one computed per key per casing rule, checked by
identity and by value. Separately, `rules.invocation-count.spec.ts`' delegating mock of
`createRuleContext` now forwards its argument. It used to drop it, so inside that file every context
was built under the factory's options. `eval-forms` went from 316 to 321.

Probes, each against the whole `eval-forms` suite, then reverted:

| Wrong implementation | Red |
| -------------------- | --- |
| The memo keyed on the key alone, keeping the first reader's casing | 5 of 321: the five divergence rows. The flipped case and the README case stay green, since each has a single registration |
| The memo per casing rule, the context built from the factory's options | 5 of 321: the flipped case, the README case and the three registrar rows. The two source rows stay green, because the source is right |

**The entry as it stood:**

`ExpressionRuleOptions` arrives twice: at `createExpressionRules(model, options)` and at each
`rules.evalVisible(path, expression, options)`. **The rule is registration wins, per key** —
`rule?.eval ?? factory?.eval`, resolved independently.

**That rule is exact for `onError` and partial for `eval.caseInsensitive`, and the gap is a wrong
answer rather than a missing feature.** The memo has one lifetime — per factory — so
`createModelSource(model, options?.eval)` runs once and `readProperty`'s `caseInsensitive` is fixed
there. A registration supplying a different one moves exactly **one of the three** places it has
to reach:

| Place | Built from | Reached by a per-registration `eval.caseInsensitive`? |
| ----- | ---------- | ---------------------------------------------------- |
| the walk's options — `evaluateRule`'s third argument | the resolved per-rule options | **yes** — corrects *property* names |
| the rule's context — `createFieldContext({}, {}, options)` | the **factory's** `eval` | **no** — inert either way, both sources are `{}` |
| the factory's memo — `readProperty` | the same factory parameter | **no** — and this is the resolver that answers every identifier here |

So `rules.evalVisible(p.city, 'Country === "US"', { eval: { caseInsensitive: true } })` against a
factory built without it, and a model holding `country`, resolves `Country` to `undefined` while
correcting every *property* name in the same expression. One expression, two casing rules, no
error.

**Decision taken in Phase 6: no throw, documented, fix deferred.** Rejecting a divergent
registration was the alternative and was rejected on two grounds: it enumerates one key of an open
set (`EvalOptions` is `Record<string, unknown>`, so any later option with factory reach recreates
the gap), and it fires at the wrong time with the wrong blast radius (registration runs inside the
schema body during `form()`, so the throw takes down the entire form over one rule's casing, and
it is unreachable through `onError`).

**The real fix makes the gap unreachable rather than loud.** Two shapes, and the count above
decides which is cheaper: move `caseInsensitive` onto `createExpressionRules`' own signature, where
it already effectively lives — **the cheaper one, since two of the three levers are already
factory-bound** — or key the memo on `(key, caseInsensitive)` and give up "one computed per key per
factory". Both change something § 3.6 or § 5 of the Phase 6 plan states.

**Covered** by a characterisation case in `rules.spec.ts`: this is behaviour that is wrong and
shipping, so the spec records the limitation and goes red if a later change to the memo's lifetime
silently reverses it.

*Recorded*: [`forms/phase-6-plan.md` § 3.5.3](forms/phase-6-plan.md).

<a id="d4"></a>
## D4 — A top-level model key holding a signal is returned un-called

**Package** forms · **Kind** fix or doc · **Status** **Retired — fixed 2026-09-29**;
released 2026-09-30 in `eval-forms` 0.2.4, tagged 587ebf1. Took the fix, not the doc

*Fixed* 2026-09-29: `/signals`' model lookup now ends the way upstream's does, with
`isSignal(value) ? value() : value`, so `{ ready: signal(false) }` resolves `ready` to `false`. The
call runs in the rule's own derivation, so a rule naming `ready` re-derives when that signal
changes, with the model unchanged. The README bullet this entry cited now says the member-visitor
caveat is the *nested* shape, and that a top-level signal resolves as `createSignalContext`
resolves it.

*Verified*: three cases in `model-source.spec.ts`, written first, each comparing `/signals` with
`createSignalContext` over the same source and naming the value. Against the unfixed lookup the
first two were red (`[Function getter]` where `false` was expected). `eval-forms` 265 → 268.
Probes, each against the whole `eval-forms` suite:

| Wrong implementation | Red |
| -------------------- | --- |
| No unwrap (return the value as is) | 2 of 267: the two signal cases, nothing else. Run before the third case was written; that case returns the function uncalled and passes against this break, by design |
| Call every function, not only signals | 3 of 268: the plain-function case, plus two `evaluate-rule.spec.ts` strand cases whose model holds a function. The third D4 case was added for this probe: before it, only those two unrelated cases caught it |
| Unwrap with `untracked(value)` | 1 of 268: the re-derive case only |

The `.d.ts` files are byte-identical to a build before the change; the `/signals` FESM changes.

**The entry as it stood:**

Upstream's lookup is `resolve(...)` then `isSignal(value) ? value() : value`
([`signal-context.ts:200`](../modules/eval-signals/src/lib/signal-context.ts#L200)); this adapter's
is `keySignal(key)()` with no `isSignal` step
([`model-source.ts:131-146`](../modules/eval-forms/signals/src/lib/model-source.ts#L131-L146)). So
`model = signal({ ready: signal(false) })` resolves `ready` to a truthy function here and to
`false` through `/reactive`.

Near-unreachable for Signal Forms, whose models are plain data.

**Partly discharged.** [`README.md` § Two things that are not available
here](../modules/eval-forms/README.md#two-things-that-are-not-available-here) documents the shape,
but attributes it to "the member visitor" — which is the *nested* read mechanism
(`{ user: { name: signal('a') } }`), not this one. For a top-level key no member visitor is
involved: `keySignal('ready')()` returns the inner signal function directly. The README also does
not state the `/reactive` divergence, which is the part a consumer moving between adapters would
hit. Either correct the attribution and add the divergence, or add the `isSignal` step.

*Recorded*: [`forms/phase-6-step-2-summary.md` § 5.2](forms/phase-6-step-2-summary.md).

<a id="d5"></a>
## D5 — Two dead lookups run ahead of ours on every resolution

**Package** forms · **Kind** fix (perf) · **Status** **Retired — fixed 2026-10-03**; released
2026-10-04 in `eval-forms` 0.3.1, tagged 3d56994. Filed against `/signals`, and `/reactive` had the same shape with
one dead lookup

*Fixed* 2026-10-03: a rule context's lookups are exactly the live ones, at both entry points.
`/signals`' `createRuleContext` still builds through `createFieldContext({}, {}, options)`, for the
class whose `set` throws, then empties `lookups` before pushing the memo resolver, so that resolver
is the only lookup. `/reactive`'s `bindFieldProperties` removes the field half's lookup over `{}`
from `createFieldContext(formSource, {})`, so the form resolver is the only one. `createFieldContext`
itself is unchanged, since it is public.

*Measured*: resolver calls per identifier through the walk, the same for a key the source holds and
for one it does not:

| Entry point | Before | After |
| ----------- | -----: | ----: |
| `/signals` | 3 | 1 |
| `/signals`, `caseInsensitive` | 3, two of them allocating an `Object.keys({})` | 1 |
| `/reactive` | 2 | 1 |

No timing assertion was added: [D12](#d12)'s injector-path memory cases were removed for being
timing-dependent, and a count is what a suite can hold steady. `eval-core`'s
`internal/performance.spec.ts`, which this entry named as its gate, runs neither adapter.

*Verified*: five rows, written first and red against the unfixed code. At `/signals`,
`model-source.spec.ts` and `rules.spec.ts`, each with `caseInsensitive` off and on; at `/reactive`,
`field-schema.spec.ts`. Each asks every lookup on the context for a key the source holds and expects
`['US']` (`['CA']` at `/reactive`), so a lookup that cannot answer shows as an `undefined` and a
missing live one as an empty list. The two entry-point rows reach the context through the rule
itself, as `keep(this)`, because `this` evaluates to the walk's context, so they also show that the
registrar uses the context they describe. `/reactive` has no `caseInsensitive` row:
`bindFieldProperties` takes no evaluation options, so its form resolver is always built without the
option, and that leg of the criterion has nothing to run against there.

**One existing spec changed, by decision.** `model-source.spec.ts`' "should build a context carrying
exactly three lookups" was this entry's pin, since the count was the two dead lookups plus ours. It
is now the `/signals` row above. Its neighbour pops the memo lookup and expects nothing to resolve,
and keeps that assertion under a new title: with one lookup, popping it shows that nothing else
carries the model, `original` included. No answer changed: `eval-forms` went from 312 to 316, with
every other case green.

Probes, each against the whole `eval-forms` suite, then reverted:

| Wrong implementation | Red |
| -------------------- | --- |
| Every dead lookup put back | 5 of 316: the five new rows, nothing else |
| `/signals`' two put back, `/reactive` fixed | 4: the four `/signals` rows |
| `/reactive`'s put back, `/signals` fixed | 1: the `/reactive` row |
| `/reactive` drops the form's lookup as well | 18: the `/reactive` row, and 17 existing cases whose answers change |

**The entry as it stood:**

`createFieldContext({}, {}, …)` pushes two resolvers over empty records, and under
`caseInsensitive` each allocates an `Object.keys({})` per key **per node**. Plan-mandated (Phase 6
§ 5 authorises `createFieldContext`, not `createSignalContext`), construction is per rule per
`form()`, and the cost is small.

The only per-node-cost entry in this file, so it is the only one `internal/performance.spec.ts` is
the gate for.

*Recorded*: [`forms/phase-6-step-2-summary.md` § 5.2](forms/phase-6-step-2-summary.md).

<a id="d6"></a>
## D6 — `/signals` diverged from upstream on non-string keys

**Package** forms · **Kind** fix · **Status** **Retired — fixed 2026-09-26**;
released 2026-09-30 in `eval-forms` 0.2.4, tagged 587ebf1

*Filed as* "The `typeof key === 'string'` guard is unfalsifiable by the suite". The guard was
falsifiable; the suite just had no case that reached it.

`/signals`' model lookup (`model-source.ts`, in `createRuleContext`) passed a string key to the memo
and resolved anything else `undefined`. A non-string does reach it: `this` evaluates to the context
itself, and `member-expression.ts` hands the context a computed key raw, so `this[42]` asks the
lookup for the number `42`. Upstream's `resolve` (`eval-signals`' `signal-context.ts:127-144`)
finds it — `hasOwnProperty` coerces the number to `"42"` — and runs its case-variant fallback for
strings only, so it never throws. `/reactive` inherits that lookup. So `this[42]` against a model
holding `"42"` gave the value through `/reactive` and `createSignalContext`, and `undefined` through
`/signals`.

*Fixed* 2026-09-26: a number key resolves through `keySignal(String(key))`, so `this[42]` and
`this["42"]` read one memo entry and agree with upstream; string keys are unchanged; anything else
still resolves `undefined`. `readProperty` keeps `key: string`. **One divergence is kept, not
matched**: upstream would find a *symbol*-keyed own property on its source, and `/signals` resolves
every symbol `undefined`. The comment at the lookup says so. *Covered*: `model-source.spec.ts`,
"non-string keys", four cases, each comparing `/signals`' result with `createSignalContext` walked by
`eval-core` over the same values, and naming the value too. The memo-sharing case counts `model()`
reads through a `Proxy` on the model signal — one per memo entry — with a two-key calibration arm
that reads 2. Probed:

| Implementation | number key held | same, `caseInsensitive` | absent, `caseInsensitive` | one memo entry |
| -------------- | --------------- | ----------------------- | ------------------------- | -------------- |
| the original guard | **red** (`undefined`) | **red** (`undefined`) | green | **red** (value differs from upstream) |
| bare cast, no `String()` | green | green | **red** (`TypeError`) | **red** (2 reads, not 1) |

The rest of the `eval-forms` suite stayed green under both probes. *Changelog*: `[Unreleased]`.

*The premise as filed, **measured false** 2026-09-26*: "Removing it changes no observable:
`readProperty(model, 42, …)` returns `undefined` anyway and a `Map` entry under a non-string key is
unreadable." `readProperty`'s `hasOwnProperty` finds `"42"` from `42`, and its case-variant fallback
calls `key.toLowerCase()` without checking the type. Measured through the walk, with the guard and
with it replaced by a cast:

| `this[42]`, model | with the guard | cast, no guard |
| ----------------- | -------------- | -------------- |
| holds `"42"` | `undefined` | `"forty-two"` |
| lacks `"42"`, `caseInsensitive` | `undefined` | throws `TypeError: key.toLowerCase is not a function` |

The suite of 251 stayed green under the cast, so "unfalsifiable *by the suite*" was true. What made
the guard look like belt and braces was the gap in the suite, not the code.

*Recorded*: [`forms/phase-6-step-2-summary.md` § 5.2](forms/phase-6-step-2-summary.md).

<a id="d9"></a>
## D9 — § 3.4.3's precedence rule is untested end to end

**Package** forms · **Kind** test gap · **Status** **Retired — premise false: covered end to end
since 7fbef49; the `caseInsensitive` pair added 2026-09-27, test only**

**The premise was false when it was filed.** `field-context.spec.ts`'s `precedence` block, added by
`7fbef49` (Phase 4 step 2, 2026-08-17), already walked the rule end to end. It builds
`createFieldContext` with a non-empty field source and evaluates it through `eval-core`'s
`simpleEval`. "Should resolve a colliding key to the field" asserts that the field wins a collision,
and "should resolve a form key through the pushed lookup" asserts a form-only key over a non-empty
field source. "End to end" in the step-4 note meant *through a `/reactive` binding*, which no path
produces, and not *through the evaluator*, which was covered. The probe below shows those older
cases were load-bearing.

**Added 2026-09-27**: the one leg the older cases did not reach, `caseInsensitive` with the key
spelled differently from the expression. `field-context.spec.ts`, "precedence under
`caseInsensitive`", two cases. In the collision the *form* holds the expression's exact spelling
and the field does not, so the field wins by layer and not by exact match. Both cases carry a
calibration arm without the option, which shows the spelling differs enough that only the
correction finds the key. No published artifact changed.

**Two layers of three.** The third, an `Object.prototype` name resolving through the empty
`original` ahead of both sources, is upstream's (`eval-signals`' `createSignalContext` and
`eval-core`'s `EvalContext.get`), as `field-context.ts`'s own comment records. It is named here and
not tested.

*Probed* by installing the form half first (the two `createSignalContext` calls in
`field-context.ts` swapped), against the whole `eval-forms` suite, then reverted:

| Case | Since | form half first |
| ---- | ----- | --------------- |
| should resolve a colliding key to the field | `7fbef49` | **red** (`"form"`) |
| should show the form value once the field key is removed | `7fbef49` | **red** (`"form"`, on the first assertion) |
| should give precedence back to the field when its value appears | `7fbef49` | **red** (`"form"` after the field value appears) |
| should fall through to the form value for a field key holding undefined | `7fbef49` | green: the form wins it under either order |
| key in both sources → field, `caseInsensitive` | 2026-09-27 | **red** (`"form"`, on the main assertion; calibration arm green) |
| key only in the form source → form, `caseInsensitive` | 2026-09-27 | green |

Nothing else in the suite moved: 4 red of 257.

**The entry as it stood:**

**Status** Open, Premise retired

The three-layer precedence rule (field keys win) has no end-to-end coverage.

**Premise retired — the prediction was wrong.** Phase 4 step 4 recorded that this "stays so until a
phase has a consumer for a field-local key — the `/signals` adapter is the likely one, and it is
additive: a second argument that stops being `{}`."

`/signals` shipped and did **not** discharge it. It calls `createFieldContext({}, {}, options)`
([`model-source.ts`](../modules/eval-forms/signals/src/lib/model-source.ts)) — both sources empty,
deliberately, because the class is what it wants and not the sources. So the second argument never
stopped being `{}`, no consumer for a field-local key exists, and the gap is unchanged with no
candidate phase behind it.

Whoever closes this writes the fixture rather than waiting for a consumer to arrive.

*Recorded*: [`forms/step-4-summary.md` § 5.2](forms/step-4-summary.md).

<a id="d10"></a>
## D10 — `applyErrorPolicy` has no runnable README block

**Package** forms · **Kind** docs · **Status** **Retired — fixed**,
[`docs/gates/plan.md`](gates/plan.md) step 5, 2026-09-09

> **What shipped.** A `ts` block in `modules/eval-forms/README.md`'s
> [When a rule fails](../modules/eval-forms/README.md) section showing the default, an explicit
> `'undefined'`, a mapping function, the no-throw path — and the **rethrow**, which is the half
> a reader would not predict: every other failure is policed, a `SignalContextWriteError` is
> not. Two cases in `reactive/src/lib/readme-examples.spec.ts`, the file
> [`plan.md`](gates/plan.md) § 4 step 5 names because `applyErrorPolicy` is the shared core's
> surface and that spec already reaches it through the published specifier.
>
> **It also discharged a deferral that resolved as designed.** The block is the **first** import
> through the bare `@zvenigora/ng-eval-forms` specifier in any README, which is what
> [F3](#f3)'s third `eval-forms` gate had been waiting for: step 2 declined to build it because
> a gate over a specifier no README imports asserts over the empty set, recorded the obligation
> in the `/reactive` gate's docstring rather than leaving it implicit, and step 5 built it once
> the subject existed — `modules/eval-forms/src/public-api.spec.ts`. Probed: renaming
> `applyErrorPolicy` reddens it with `modules/eval-forms/README.md:339 imports
> { applyErrorPolicy } … which it does not export`.
>
> **One thing the block does not print**, and it is [F11](#f11)'s second instance:
> `SignalContextWriteError` belongs to `@zvenigora/ng-eval-signals` and neither `eval-forms`
> entry point re-exports it, so the block names its package in a comment rather than printing an
> import line no gate would scan. The class is still execution-gated — the spec imports and
> constructs it — but not drift-gated, which is exactly the hole F11 describes.

Only a "How it fits together" row — so the one symbol the 0.2.0 release adds to the *released
primary* surface is documented but not example-gated. Consistent with `createFieldContext` and
`ExpressionErrorPolicy`, which are also table-only, so this is the existing convention rather than a
new gap; worth revisiting if the core's surface grows.

*Recorded*: [`forms/phase-6-step-7-summary.md` § 4.4](forms/phase-6-step-7-summary.md).

<a id="d11"></a>
## D11 — `/signals` has no worked example

**Package** forms · **Kind** docs · **Status** **Retired — fixed 2026-10-03**, docs and tests
only; released 2026-10-04 in `eval-forms` 0.3.1, tagged 3d56994: the example ships in no package,
the README's link to it does. [`docs/forms/worked-example-signals.md`](forms/worked-example-signals.md),
linked from the package README's `/signals` section

*Fixed* 2026-10-03: [`docs/forms/worked-example-signals.md`](forms/worked-example-signals.md) is
the `/signals` counterpart of [`docs/forms/worked-example.md`](forms/worked-example.md). It has the
same checkout scenario in the same eight sections, at 243 lines against 230. Where the two entry
points differ, it says so rather than forcing the parallel. The rules arrive as expression
strings, while the fields they drive are typed schema paths. The shipping note is text on
`orderTotal`, because Signal Forms has no field without a model property. § 6 is a key that
arrives later with nothing to call, where `/reactive` needs `invalidate()`. § 8 has nothing to
end. `evalDisabled`, which `/reactive`'s example cannot show, is in it. The package README links it
from its `/signals` section, and its Development paragraph names the spec that runs it.

*Verified*: every one of its ten ` ```ts ` blocks is executed by
`signals/src/lib/readme-examples.spec.ts`, and `WORKED_EXAMPLE_TS_BLOCKS` = 10 gates the count, as
`/reactive`'s spec gates its own. § 1's model is built inside § 3's service, where the document
builds it. § 1's interface and § 2's two blocks are transcribed verbatim. The six blocks of §§ 4–7
run as one program in one case. Two further cases follow `/reactive`'s: one confirms that the rule
§ 7 calls broken really throws, and one turns § 4's closing sentence about re-evaluation into a
count. The spec supplies two things the document does not print, both listed in its docblock: the
`model` and `f` handles, taken from the service as the document's § 4 note says, and the injection
context for §§ 6–7's `form()` calls, which that note states in prose. It also imports through
`../public-api` rather than `@zvenigora/ng-eval-forms/signals`, the substitution the file already
records. `eval-forms` went from 321 to 325.

Probes, each reverted. The first two ran together, in different cases, and failed 2 of 325
between them, nothing else:

| Probe | Red |
| ----- | --- |
| `WORKED_EXAMPLE_TS_BLOCKS` set to 11 | the count case |
| § 4's `'Free shipping'` expected as `'Free shipping!'` | the one-program case |
| Every rule context's lookup also reads the whole model, so each rule re-evaluates on any write | 8 of 325: the § 4 re-evaluation case and seven existing per-key cases |

The spec does not read the document's blocks, so a block edited to print a different value fails
nothing. That is the limit both worked examples share: the spec catches an example that stops
working, not one that stops matching.

**The entry as it stood:**

[`docs/forms/worked-example.md`](forms/worked-example.md) is `/reactive`'s, and the Phase 6 plan
asked for no counterpart. The quick start plus five caveat blocks cover the API; a whole-form
narrative is the thing `/reactive` has and `/signals` does not.

**Deliberately left out of [`docs/gates/plan.md`](gates/plan.md)** (§ 2, out of scope): it is
~200 lines of original narrative authoring rather than a gate, and gating it afterwards would add
a sixth step to a plan whose value is being small. It belongs with whoever next has a reason to
document `/signals` end to end.

*Recorded*: [`forms/phase-6-step-7-summary.md` § 4.4](forms/phase-6-step-7-summary.md).

<a id="d12"></a>
## D12 — ~20 specs discard the binding and never call `destroy()`

**Package** forms · **Kind** test hygiene · **Status** **Retired — fixed 2026-09-28, test only;
`destroy()`'s release path is pinned by `field-schema.memory.spec.ts`, and the `DestroyRef` net's
by `field-schema.spec.ts`'s subscription count.** Corrected 2026-09-29, below

**2026-09-29: cases 2 and 3b removed, not tuned. Their result depended on how fast the collector
ran.** CI's `build (24.x)` job on `01a2c30` failed (its log was not read here). Case 2's failure
reproduces on a 2-core Linux
machine under Node 24, with three `nx run-many -t test --skip-nx-cache` runs in parallel: as
committed (one `setTimeout(0)` and one `gc()`), case 2 was red in 3 of 3 loaded runs and green
when run alone. With `collect()` looping up to ten rounds, case 2 went green and calibration 3b
went red in 2 of 3 loaded runs. The injector was collected with neither release applied, so its
retention on this path is transient and neither case isolates the net. No number of rounds makes
both reliable, so both were deleted, with `injectorUnder`. Cases 1 and 3a were green in every
loaded run under both variants and are unchanged, as is `collect()`. The net stays covered by the
subscription-count case named in the last bullet below, which went red under (b1) and (b2). The
probe table below is kept as the record: its rows 2 and 3b no longer exist. The loaded
reproduction was run on a 2-core machine on purpose. On a 20-core workstation, three parallel
gates start 20+ Node processes each and exhaust memory; do not run it there.

`modules/eval-forms/reactive/src/lib/field-schema.memory.spec.ts`, four cases, using
`eval-signals`' `eval-signal.memory.spec.ts` technique unchanged: `gc` from `--expose-gc` in a new
`vm` context, a `setTimeout` before collecting, and every target built inside a helper that returns
only `WeakRef`s and catches its own errors. No published artifact changed; `dist/` is byte-identical.

1. **`destroy()`, caller's injector alive**: the `FormGroup` and both bound signals are collected.
2. **The `DestroyRef` net, caller's injector destroyed, no `destroy()`**: the test holds the group,
   and the caller's *injector* is collected.
3. **Calibration, neither release**: (a) with the injector alive, the group and both signals are
   retained; (b) with the group held, the injector is retained.

**The targets are not the `FormGroup` throughout, for two measured reasons.**

- *Case 2 cannot use it.* `R3Injector.destroy()` swaps its hook list for an empty one before
  running it, so a destroyed injector drops the registration whatever the callback does, and a
  group nothing else holds is collected either way. A group-target case stayed green with the
  registration removed and with its callback a no-op. The net's real work runs the other way. The
  group's `group.events` subscriber reaches the mirror's `options`, which names the binding's child
  scope, and the scope's `parent` is the caller's injector. The callback destroys the scope and
  cuts that chain, so it is asserted from a group that outlives the injector: the component-injector
  case the net exists for.
- *Case 1 needs the signals too.* With only `destroy()`'s `release?.()` removed, so the
  registration stays on the injector, a group-only case stayed green: once `destroy()` has run, the
  signals and the scope have let go of what reached the group. What that leftover registration
  keeps is the destroyed signals, through `created`, so case 1 asserts them as well.

So calibration 3 is two cases, one per target.

*Probed* against the whole `eval-forms` suite, each probe reverted before the next:

| Case | (a1) `destroy` body no-op | (a2) returned `destroy` no-op | (a3) `release?.()` removed | (b1) registration removed | (b2) callback no-op |
| ---- | ------------------------- | ----------------------------- | -------------------------- | ------------------------- | ------------------- |
| 1. `destroy()`, injector alive | **red** | **red** | **red** (group collected, both signals retained) | green | green |
| 2. net, injector destroyed | **red** | green | green | **red** | **red** |
| 3a. calibration, injector alive | green | green | green | **red** | green |
| 3b. calibration, group held | green | green | green | green | green |
| rest of the suite | 10 red | 7 red | **0 red** | 1 red | 1 red |
| total of 266 | 12 | 8 | 1 | 3 | 2 |

The suite at this commit has 265 `eval-forms` tests. The probes ran with a 266th: the temporary
group-target case that measured the first bullet above, deleted afterwards, and it was green in
every probe.

Read case by case:

- **(a2) and (b2) are the two probes asked for, and each reads as predicted.** (a2) turns case 1
  red and leaves 2 and 3 green. (b2) turns case 2 red and leaves 1 and 3 green.
- **(a1) also turns case 2 red, and cannot do otherwise.** The net's callback *is* `destroy()`, so
  emptying its body disables both paths. The prediction that case 2 stays green was unsatisfiable,
  and (a2) was added to separate the caller's path from the net's.
- **(b1) also turns 3a red, and cannot do otherwise.** What retains the group while the injector
  lives *is* the registration, so removing it makes the calibration's retention disappear with it.
  (b2) keeps the registration and empties the callback, which separates the two.
- **(a3) is the reason this file exists.** A registration left on a live injector after
  `destroy()` is red here and nowhere else in the suite. The teardown cases in
  `field-schema.spec.ts` count subscriptions and `destroy` calls, and a leftover registration
  changes neither of them.
- The one pre-existing case red under (b1) and (b2), "should release the mirror when the injector
  it was given is destroyed", already covered the net's *subscription* release by count. So the
  premise below was partly false: the un-destroyed path's subscriptions were watched. Retention
  was not.

*Flake check*: the file run 5 times in a row, 4 of 4 green each time.

**The ~20 discard-style specs were left as they are.** They were never the gap. The gap was that
the path they rely on had no assertion, and it has one now. Adding `destroy()` to each would move
them off the net's path onto the one every teardown case already covers. It would also stop them
modelling what a consumer who forgets `destroy()` does, which is the case the net exists for.

`/signals` has no counterpart and gets no cases: `createExpressionRules` registers with no
`DestroyRef` and has no `destroy()` (`rules.ts`, its JSDoc).

**The entry as it stood:**

**Status** Open

They get collected at TestBed teardown through the `DestroyRef` net, which is an improvement and
**also means the suite would not notice a leak on the un-destroyed path**. Pre-existing style.

*Recorded*: [`forms/step-5-summary.md` § 5.2](forms/step-5-summary.md).

---

# E. Deferred to phases that are not yet defined

<a id="e6"></a>
## E6 — `exit` has no mark to bound its scan

**Package** core · **Kind** fix · **Status** **Retired — fixed** — Phase 2 step 1, 2026-09-12; released
in `eval-core` 0.4.0. The premise that Phase 2 makes it reachable was **wrong**, and is corrected
below

`EvalHooks.exit` could not distinguish "absent from this walk" from "absent from the stack", so a
node open only in an *enclosing* walk fell into case 2 and the flush crossed the walk boundary.

**Unreachable today** — it needs an `afterVisitor` with no matching `beforeVisitor` in the same
frame, which no visitor produces.

> **Premise corrected in execution, and the fix landed anyway.** This entry said "Phase 2 is what
> makes it reachable", on the reasoning that statement support "needs a way to short-circuit — skip
> the rest of the block". **It does not, under the design Phase 2 chose.** Skipping a subtree does
> not produce an unmatched `after`: an untaken `if` branch or a `for` body that never runs is never
> *entered*, so nothing is left open. Only an **abrupt** completion that abandons a
> partially-walked child does, and `break` / `continue` / `return` are out of Phase 2's scope
> ([`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 2). So the phase that makes this
> reachable is the abrupt-completion phase, not Phase 2 — which is also why that phase cannot
> inherit this entry's reasoning as a reason to hurry.
>
> *Measured* before the fix, driving the published `EvalHooks` directly — enter two nodes, take the
> mark `evaluate` takes, enter a third, then close the **first**: the open stack drained from depth
> **3 to 0** past a mark of **2**, synthesising **two** `completed: false` events for frames
> belonging to the enclosing walk, which a consumer reads as ordinary completions; the nested walk's
> own `unwindTo(mark)` then had nothing left to unwind. A control with a node never opened stayed a
> no-op.
>
> **Fixed in Phase 2 step 1** rather than deferred to the phase that needs it, for three reasons in
> order of weight: the failure is silent when it happens; the abrupt-completion phase will be
> written against seven new statement visitors as precedent, and leaving the trap armed under them
> is how a residual becomes a defect; and the mechanism already existed one level up (`depth` and
> `unwindTo`). `evaluate` and `evaluateAsync` now record their mark on
> `EvalHookBookkeeping.walkBases` — where `exit`, called from a visitor, can see it — and **both** of
> `exit`'s routes respect it: the `lastIndexOf` scan and the identity fast path. The fast path needs
> it independently: when a nested walk has opened nothing yet, the top of the stack *is* the
> enclosing walk's node, so a scan-only bound leaves the boundary crossable by the cheap route and
> the measurement above does not see it, because that sequence opens a third node first. A node open
> only in an enclosing walk now falls into case 3 by either route — pop nothing, emit nothing.
>
> *Covered*: `eval-hooks.spec.ts`, "the walk base bound". Reverting the bound turns the scan case
> and the fast-path case red and leaves the never-opened control green; bounding the scan alone
> turns only the fast-path case red.

Note this is orthogonal to per-state isolation and neither subsumes the other: per-state isolation
handles *sharing across evaluations*; marks handle *nested walks within one evaluation* — the
re-entrant `evaluate()` in `arrow-function-expression.ts:17`, which uses the very same state and so
is invisible to per-state isolation by construction.

*Recorded*: [`side-effects/step-3-summary.md` § 5.2](side-effects/step-3-summary.md);
[`side-effects/phase-1-plan.md` § 3.8](side-effects/phase-1-plan.md).

<a id="e5"></a>
## E5 — The options-first style cannot read `hookErrors`

**Package** core · **Kind** decision · **Status** **Retired — decided 2026-09-30: closed with
documentation**; the README note released 2026-10-01 in `eval-core` 0.7.0, tagged 724d831

With errors on the state, the options-first style (`simpleEval(expr, ctx, { hooks })`) has no way
to read them: the consumer holds the `EvalHooks` but never sees the `EvalState` that
`BaseEval.createState` built. The state-first style is unaffected. It argued for an `onHookError`
*callback* form of the option, or for `simpleEval` to surface the state.

**Premise retired.** Phase 1 deferred the design explicitly: "neither is worth designing before
Phase 3 shows which style consumers actually use." Phase 3, Phase 4 and Phase 6 have all shipped,
and **all three consume state-first** — `createEvalSignal` calls the free `call(fn, state)`, and
`eval-forms` routes everything through `evaluateRule`. The blocking condition was discharged and
the evidence it was waiting for existed.

*Recorded*: [`side-effects/phase-1-plan.md` § 3.6](side-effects/phase-1-plan.md), line 476.

*Decided* 2026-09-30: **closed, with documentation, and no API.** Every consumer that exists reads
state-first, and the two routes a consumer needs are already there: `createState` plus `eval` to
read `state.hookErrors`, or `onHookError: 'throw'` on the `EvalHooks` it passes, so a faulty hook
fails the evaluation instead of being collected. Neither a callback form of the option nor a
`simpleEval` that returns its state is built. The `eval-core` README's "Hook errors" section says
so, in the bullet that already sent readers to the state-first style; it now names the limit as
deliberate and gives the `'throw'` route too. What reopens it: a consumer that needs options-first
calls *and* collected hook errors, which neither route serves.

---

# F. Tooling and docs

<a id="f1"></a>
## F1 — No `configurations.ci` on the `test` target

**Package** signals **and** forms · **Kind** fix + decision · **Status** **Retired — fixed and
decided**, [`docs/gates/plan.md`](gates/plan.md) step 1, 2026-09-07

`modules/eval-core/project.json` gave its `test` target a `configurations.ci` block
(`ci: true`, `coverage: true`). Neither `modules/eval-signals/project.json` nor
`modules/eval-forms/project.json` had any `configurations` on `test` at all, so any CI job that
started asking for coverage per project would get it from one and not the others.

> **Premise corrected in execution: the failure was silent, not loud.** This entry said
> "`nx test <project> --configuration=ci` does not exist for two of three libraries", which
> implies the command fails. **It does not.** Measured with the block stashed and
> `--skip-nx-cache`: the command exits **0**, runs the full suite, and quietly emits no
> coverage — Nx ignores an unknown configuration rather than rejecting it. So a CI job asking
> for per-project coverage would have gone **green with no coverage** on two of three projects
> and reported nothing. That is worse than the entry described, and it is why the fix's exit
> criterion is "coverage is emitted" rather than "the command stops erroring".

**The entry this replaces named `eval-signals` only** — it was written in Phase 3 step 6, before
`eval-forms` existed, and nobody widened it when Phase 4 shipped a third project with the same gap.
Corrected here 2026-09-06 by reading all three `project.json` files.

Today's workflow runs `npm test` — plain `nx run-many -t test` — so nothing was red and nothing
was missing coverage that had previously been reported.

**Fixed**: both projects now carry the same block, and
`nx run-many -t test --configuration=ci` writes `coverage/modules/<project>/` for all three.

**Decided: no thresholds, not yet — and the baselines are why.** Measured 2026-09-07:

| Project | Statements | Branches | Functions | Lines |
| ------- | ---------- | -------- | --------- | ----- |
| `eval-core` | 82.44% | **67.95%** | 79.43% | 81.51% |
| `eval-signals` | 100% | 99.13% | 100% | 100% |
| `eval-forms` | 98.66% | 95.72% | 97.61% | 98.53% |

The spread settles it. A single workspace-wide threshold is either trivially met by the two
newer packages or immediately blocking for `eval-core`, whose branch coverage is 31 points below
its siblings'. Per-project thresholds would work, but setting three numbers from today's figures
draws three arbitrary lines that get lowered the first time one blocks somebody — and CI does
not run `--configuration=ci` at all today
([`.github/workflows/node.js.yml`](../.github/workflows/node.js.yml) runs plain `npm test`), so
adopting thresholds also means changing the workflow. That is a second decision with a second
owner.

**What would reopen it**: a decision to gate CI on coverage, which should be taken together with
the workflow change and per-project numbers rather than one workspace figure. `eval-core`'s 68%
branch coverage is the interesting number and is worth its own look — it is the package with the
`ROADMAP`-deferred defects, and low branch coverage is where an unfixed branch hides.

<a id="f2"></a>
## F2 — One `CHANGELOG.md` for three independently-versioned packages — **Retired, decided**

**Package** repo · **Kind** decision · **Status** **Retired — decided 2026-09-28: one changelog per
package**, `modules/<name>/CHANGELOG.md`, written by hand. The full `nx release` flow stays unadopted

There is one `CHANGELOG.md` at the workspace root and three packages that version separately. The
heading convention answers it well enough to read the file unambiguously: a release of a non-core
package is titled with the package name, `## [eval-signals 0.1.0]`. **Corrected 2026-09-28**: this
said `eval-core` keeps the bare `## [0.3.0]` form, which was true only up to 0.3.0. Every
`eval-core` heading from 0.4.0 onward is prefixed, `## [eval-core 0.4.0]`, so the bare form marks
only the pre-0.4.0 history.

Two things make it worth logging:

- **`eval-core`'s entries are the implicit case.** A bare `## [0.3.0]` means "eval-core" only by
  convention, and only because it got there first. Nothing enforces it.
- **It has already drifted from npm.** The changelog carries `## [0.2.3]`, `## [0.2.4]` and
  `## [0.2.5]` entries for `eval-core`; the registry's version list runs
  `0.1.102 … 0.2.1, 0.2.2, 0.3.0`. Those three were changelogged and never published. A reader
  treating the file as a release history is misled today, and the manual procedure has no step that
  would catch it. (Verified still present 2026-09-06.)

The fix is not obviously "split into three files". `nx release changelog` can maintain per-project
changelogs — but adopting it means adopting the full `nx release` flow, which is separately unmade
(see CONTRIBUTING, "Why publishing is still manual"), and it would have to be reconciled with the
existing single file rather than starting clean. Deciding that is the work.

Related: [F8](#f8), which is the same class of drift reaching the git tags.

**Decided 2026-09-28: one changelog per package.** Each package's entries moved to
`modules/<name>/CHANGELOG.md` with their text unchanged. Three things changed in the move: the
package prefix left each heading, relative links were re-based to the new location, and every
version that is not on npm was marked "(not published to npm)". The root `CHANGELOG.md` is now a
pointer to the three, plus a "Workspace (not published)" section for tooling changes that ship
in no package. The split was made **without** adopting `nx release`. Its layout is the one
`nx release changelog` writes, so the split does not stand in the way of adopting it later. The
flow itself is still unmade, for the reason CONTRIBUTING gives: no release has been cut through
it end to end.

A package-level `CHANGELOG.md` is **not** copied into `dist/`, so it does not reach the npm
tarball. ng-packagr's default assets are `LICENSE` and `README.md` only
(`write-package.transform.js`), and no `ng-package.json` here declares `assets`. The changelogs
are read on GitHub, as the root file was. Verified by building all three, 2026-09-28.
*(Superseded 2026-09-29: each `ng-package.json` now declares `"assets": ["CHANGELOG.md"]`, so
every package's changelog is copied into `dist/modules/<name>/` and ships in its tarball, first in
`eval-core` 0.6.1 and `eval-forms` 0.2.4. Its relative links into `docs/` do not resolve on npm;
they do on GitHub.)*

**The npm drift, checked against `npm view <pkg> versions` on 2026-09-28, was wider than recorded
above:**

| Package | Changelogged, not on npm | On npm, no entry |
| ------- | ------------------------ | ---------------- |
| `eval-core` | 0.1.0, 0.2.0, 0.2.3, 0.2.4, 0.2.5 | 0.1.104, 0.1.105, 0.1.106, 0.1.107 |
| `eval-signals` | none | none |
| `eval-forms` | none | none |

The five are marked in `modules/eval-core/CHANGELOG.md`, and its preamble names the four without
writing entries for them. The procedure gap this entry named is closed as a step rather than a
gate: CONTRIBUTING's release procedure now runs `npm view <pkg> versions` after publishing and
before tagging, and does not tag a version the registry does not list. Nothing checks mechanically
that a changelog heading matches a published version.

*Verified*: 21 release headings in the old file, 12 in `eval-core`'s, 4 in `eval-signals`' and 5
in `eval-forms`'. A throwaway script compared each old entry with its new copy, byte for byte
after resolving every relative link to a repository path. All 21 matched. The script failed on
a one-word edit, and on 7 entries when it compared links without resolving them.

<a id="f3"></a>
## F3 — Documented-symbol drift gate

**Package** core, signals **and** forms · **Kind** fix · **Status** **Retired — built, green,
and probed**, [`docs/gates/plan.md`](gates/plan.md) step 2, 2026-09-07

> **What shipped.** Five gate specs — four in step 2 and the fifth in step 5, see limit 2 —
> `modules/eval-core/src/public-api.spec.ts`,
> `modules/eval-signals/src/public-api.spec.ts`, and one per `eval-forms` entry point under
> `reactive/src/` and `signals/src/` — over an export-list reader built with the TypeScript
> compiler API, so type-only exports resolve (§ 1.1's `ExpressionRules` is asserted directly).
> The reader is triplicated, one copy per project, because `allow: []` on
> `@nx/enforce-module-boundaries` permits no cross-project helper import and § 6 gate 1 permits
> no non-spec file; see [`docs/gates/plan.md`](gates/plan.md) § 8.1 for what retires that.
>
> **The published/unpublished check found its five symbols on the first run**, exactly as § 3.2
> predicted: `ParserService`, `DiscoveryService`, `EvalContext`, `EvalScope` and
> `EvalScopeOptions` were exported, documented in the root `README.md`, and absent from
> `modules/eval-core/README.md`. All five are now documented in the package README — no
> exception list exists anywhere in the gate.
>
> **Three limits, all deliberate, and the first is the one to read before relying on this
> entry being closed.**
>
> 1. **Only identifiers inside an `import { … } from '@zvenigora/…'` statement are checked** —
>    which does **not** include this entry's own motivating example. `trackTime` is an
>    `EvalOptions` key, not an exported symbol, and appears in no import statement in any
>    README; the gate would have stayed green through the Phase 1 step 6 divergence described
>    below. What it catches is that divergence's *shape* for the subset that is imported by
>    name — which is how it found five real instances on its first run.
>
>    **The exported surface this leaves unwatched is [F10](#f10)**, opened rather than folded in
>    here: three `/reactive` symbols are documented in `modules/eval-forms/README.md` and named
>    in no import, so renaming them keeps every gate green. That is a coverage gap with its own
>    fix, not a caveat on this mechanism. **Fixed 2026-10-04**: every export is now named in a
>    code span of its package's README or allowlisted with a reason, which is F10's gate and not
>    this one.
>
>    **[F11](#f11) is the same shape one axis over**: each gate checks its README against **one**
>    specifier, so an import line naming a *different* `@zvenigora/…` package in a gated file is
>    scanned by nothing. Step 3 hit it for real and left an import out of
>    `modules/eval-signals/README.md` rather than print an unchecked one. F10 bounds which
>    symbols are checked; F11 bounds which specifiers. Both were found from inside the work, and
>    together they are what "the READMEs are gated" is entitled to mean.
> 2. ~~No gate covers the bare `@zvenigora/ng-eval-forms` specifier~~ — **discharged in step 5,
>    2026-09-09.** Step 2 declined that gate because no README imported through the bare
>    specifier, so it would have asserted over the empty set, and recorded the obligation here
>    and in `reactive/src/public-api.spec.ts`'s docstring rather than leaving it implicit.
>    [D10](#d10) created the subject — `modules/eval-forms/README.md:339` is now the first such
>    import — and the gate is `modules/eval-forms/src/public-api.spec.ts`. **All three
>    `eval-forms` entry points are gated**; nothing is owed here.
> 3. Nothing detects a **fifth** README that no gate reads; that is the plan's risk 7, a stated
>    refusal rather than an unfilled slot.

Not a defect in shipped behaviour; a gap in what the suite can catch.

**Assert that every symbol a README imports from `@zvenigora/ng-eval-core` is actually exported from
it.** Scan the fenced code blocks in **both** `README.md` and `modules/eval-core/README.md`, collect
the identifiers named in `import { … } from '@zvenigora/ng-eval-core'`, and assert each resolves
against the public API.

Scanning both is the point. The divergence Phase 1 step 6 had to correct was exactly a
published/unpublished split: `trackTime` was documented only in the root `README.md`, which ships
nowhere, so the one file a consumer installing the package can read was the one file the
documentation was not in. It also catches the higher-frequency case: a public symbol renamed or
removed while a README goes on naming it.

This is an **export-surface** assertion, so a `public-api.spec.ts` beside `src/public-api.ts` is its
natural home. **No such spec exists anywhere in the repo** (verified 2026-09-06), so this creates
one; the published surface has no direct test today, which is a second reason to add it.

> **Two findings from planning**, both in [`docs/gates/plan.md`](gates/plan.md). A runtime export
> list (`Object.keys` over a namespace import) is **blind to interfaces and type aliases**, and the
> READMEs document those today — `modules/eval-forms/README.md:555` names `ExpressionRules`, which
> is an `export interface`. So the obvious implementation false-fails on correct code on day one
> (§ 1.1), and the plan reads the export list with the TypeScript compiler API instead (§ 3.1).
> Separately, this entry is **scoped to `eval-core`** because it was written when that was the only
> package; there are now four READMEs and three packages (§ 1.4, § 3.2) — the same under-scoping
> [F1](#f1) carried.

**Deliberately excluded**: a block-count assertion ("the README contains N snippets"). It fires on
every legitimate addition, so its steady-state behaviour is to train people to bump the number
rather than investigate the failure.

### Considered and rejected: executing transcribed snippets

The larger version — mirroring each documented snippet as a test and asserting the output the README
prints — was written and run during Phase 1 step 6 (eight tests, all green) and then deleted.

A transcription is a **copy, not a reader**. It gates "the API behaves as documented", which the
suite already does; what it cannot gate is what the README actually says. The decisive evidence is
that **neither defect step 5 found would have been caught by it.** Both were missing declarations in
fragments — `### Compilation` passing an `options` it never declared, `### Evaluation with scope`
using an unconstructed `evalContext` — and a transcription is written to work. Anyone turning those
fragments into a runnable test declares the missing bindings without noticing.

That argument was later **reopened for `eval-forms` only** — see [F4](#f4), which is the narrower,
code-running gate and does **not** supersede this one.

<a id="f4"></a>
## F4 — README-execution gate for `eval-core` and `eval-signals`

**Package** core, signals · **Kind** fix (signals) / decide-then-maybe-drop (core) · **Status**
**Retired — three states, no pending work**, [`docs/gates/plan.md`](gates/plan.md) steps 3 and 4,
2026-09-08

> **Where each file landed.** The verdict is per file, not per package, because the two
> `eval-core` READMEs fail differently — the plan's binary was amended to allow it rather than
> the answer fitted to the form.
>
> | File | State |
> | ---- | ----- |
> | `modules/eval-signals/README.md` | **Gated** — step 3, `src/lib/readme-examples.spec.ts`, 7 cases over 9 `ts` blocks |
> | `modules/eval-core/README.md` | **Gated** — step 4, `src/lib/readme-examples.spec.ts`, 9 cases over **12** `javascript` blocks |
> | `README.md` (root) | **Assessed and dropped** — step 4, on the fragments |
>
> **The root README is a decision, not an omission**, and nothing here should be read as work
> still queued on it. Measured with the TypeScript parser: **0 of its 11 `javascript` blocks are
> runnable as printed and 9 do not parse at all** — a bare `...` line and
> `private service: EvalService;` outside a class body.
>
> The ground is **volume and ownership**: gating it means rewriting the opening style of 9 of 11
> blocks, a whole-file documentation rewrite [`plan.md`](gates/plan.md) § 8.3 keeps open as its
> own question; 2 of those 9 additionally carry interior `...` elisions that stand in for prose
> and cannot be completed without deleting what the document prints. Gating it *without*
> rewriting it would put the whole program into the substitution list of every case — F3's
> "considered and rejected" shape, where the transcription declares the missing bindings and
> nobody notices. **Not** because a fragment style makes gating impossible: the spec never
> consumes the README's opening line either way. See
> [`step-4-summary.md`](gates/step-4-summary.md) § 3, which corrects a first draft that gave
> "subtractive" as the reason — true of 2 of the 9 blocks, not of the file.
>
> **The package README was the opposite case**: 8 of 12 blocks parsed and needed only bindings
> the document already implied. The other 4 carried the same `private service:` shape — **three
> of them added by step 2 itself**, which recorded that they changed nothing; see
> [`step-4-summary.md`](gates/step-4-summary.md) § 2 and the correction in
> [`step-2-summary.md`](gates/step-2-summary.md) § 4. All four now open `const service =
> inject(X);`.

> **The `eval-signals` half shipped**, as
> `modules/eval-signals/src/lib/readme-examples.spec.ts`: seven cases over the README's nine `ts`
> blocks, with the two not covered named in the docstring and the reason given for each.
>
> **It found the defect the plan predicted, and a limit of value-transcription the plan did not
> name.** The defect: `Dependency introspection` printed `// 30` against identifiers the document
> never declared — fixed in the README, which now declares its own three signals. The limit,
> which is a property of the gate rather than an error in the document: `## Quick start`'s
> `// 40  — not recomputed` is a **behavioural** claim its printed value cannot discriminate,
> since a signal that *did* recompute produces 40 as well. The case asserts a recompute count
> beside it, listed as a substitution because the README prints no such number — and probed:
> made the resolver subscribe to every key and **only** that case went red, on the count, with
> the printed `40` still `40`.
>
> **The one-program condition was demonstrated, not asserted** — both halves. With the block
> restored to its bare identifiers and bound to the Quick start's fields, a per-block resetting
> fixture reported **green** on the wrong `// 30` while the one-program arrangement reported
> **red** (40 ≠ 30). The green half is the one that reproduces the Phase 4 trap, and it
> materialised.
>
> **The limit this gate keeps**, restated because it is easy to read a green suite as more:
> nothing connects a case to the block it mirrors except a human. Editing a printed value in the
> README alone does not turn anything red; what the gate catches is the *library* drifting from
> what a case transcribed. See [`docs/gates/step-3-summary.md`](gates/step-3-summary.md) § 4.
>
> **[F11](#f11) bounds this gate too**, and step 3 is where it surfaced: an execution spec
> substitutes its import line (§ 1.2), and the drift gate checks only the README's own
> specifier, so a **cross-package** import in a gated README is neither resolved nor run. That
> is why `## Using the adapter directly` names `EvalService`'s package in a comment instead of
> printing an import for it. With [F10](#f10), these are the two coverage limits this track
> found from inside the work rather than from planning.

`readme-examples.spec.ts` exists for `eval-forms/reactive` **and** `eval-forms/signals`, and for
neither other package (verified 2026-09-06). The five defects that justify the gate are in the other
two: two shipped in `eval-core`'s documentation in Phase 1, three in `eval-signals`' in Phase 3. So
the package with no record of a non-running snippet is the one gated, and the two with the record
are still on the review practice that missed them five times — each caught only by a later session
that happened to be reviewing documentation, and nothing makes that session happen.

Two pieces of work, not one.

**The soundness condition carries across unchanged: one case per continuous program, not one per
block.** A document whose sections run in sequence is one program, and its printed values are claims
about the state each block inherits. A per-block harness behind a resetting `beforeEach` executes a
*different* program and reports green for a document that is wrong as written. Phase 4 step 6 hit
this for real: a first draft split the worked example into a case apiece, went green, and hid a
`false` that § 4 had already driven to `true`. Split only where the document itself declares a fresh
start — `modules/eval-core/README.md` does exactly that between its `trackTime` section and its
hooks section, and does **not** between the `trackTime` blocks, whose second reads a `state` the
first declared.

**`eval-signals` is the easier of the two** and should go first. Its README is already written in
whole-unit blocks — a component class, then a sequence of reads and `set` calls against it — which
is the shape the gate wants.

> **Premise retired, 2026-09-07.** This entry also argued that "`eval-forms`' spec already imports
> `SignalContextWriteError` from it, so a consumer-shaped import through the published specifier is
> known to work from a spec folder." **Measured false for the case that matters.** That import
> works because it crosses *projects*; a spec inside `modules/eval-signals/` importing
> `@zvenigora/ng-eval-signals` is an `@nx/enforce-module-boundaries` error — *"Projects should use
> relative imports to import from other files within the same project"* — and the root
> `eslint.config.mjs` sets `allow: []`, so there is no exemption to reach for. The gate must import
> `../public-api`, which is a substitution against what the README prints and must be enumerated in
> the docstring. The conclusion (do `eval-signals` first) stands on its README's shape alone; see
> [`docs/gates/plan.md`](gates/plan.md) § 1.2 and § 1.3.

**Two further findings from planning**, both in [`docs/gates/plan.md`](gates/plan.md): this
README's blocks are one continuous program that reads `this.` outside any class body, so the spec
must supply a component instance (§ 1.3); and F3 and F4 read the same files, so a step that
completes `eval-core`'s fragments moves F3's input (§ 1.5).

**`eval-core` is the harder case, and it may not be gateable as written.** Its snippets are
fragments: `private service: EvalService;` followed by `...`, in both READMEs — and the two Phase 1
defects were *exactly* that shape. Fragments needing invented preamble are the condition under which
this gate stops being sound. Phase 4's answer was to complete the **document** rather than pad the
spec, but there the fragments were a handful of blocks; here it would mean rewriting the prevailing
style of both files, and the injected-service opening is load-bearing documentation in an Angular
library rather than an omission to be tidied away. So `eval-core`'s step decides that first, and the
drop rule applies without apology: **if it fights, it is dropped and the reason reported**, rather
than a harness built to prop it up. Whatever preamble a surviving spec does supply is **enumerated
in its docstring** — a blanket "self-contained" claim is how an unlisted substitution hides.

Both are narrower than [F3](#f3) and neither supersedes it: they run code, they do not read markdown.

<a id="f5"></a>
## F5 — The `js-sha256` peer range is locked to a dead minor

**Package** core · **Kind** decision · **Status** **Retired — decided and fixed 2026-09-29**;
released 2026-09-30 in `eval-core` 0.6.1, tagged 587ebf1. The peer range widened, not the dependency dropped

**Decided: widen.** `eval-core`'s peer range is now `^0.10.1 || ^0.11.0 || ^0.12.0 || ^1.0.0`, and
the workspace's own `js-sha256` moved from `^0.10.1` to an exact `1.0.0`. The in-repo hash was not
taken. The widening needed no source change, and `cache.ts`'s import is unchanged: 1.0.0 still
exports a named `sha256` with the same `(message) => string` shape, now behind an `exports` map with
separate ESM, CommonJS and Node entry points.

*Verified* 2026-09-29, on both ends of the range:

- **1.0.0**: the full gate green, with the counts unchanged (`eval-core` 1076). `lint` includes
  `@nx/dependency-checks`, which accepts the new range against the installed 1.0.0. The built
  bundle still imports `{ sha256 } from 'js-sha256'`, and every `.d.ts` is byte-identical to a
  build before the change. 1.0.0's `sha256(':1 + 2 * a')` equals Node's `crypto` SHA-256 hex, so
  cache keys do not change.
- **0.10.1**, installed with `--no-save`: `nx test eval-core --skip-nx-cache` green, 1076 in 58
  suites. Then restored to 1.0.0.

The two middle minors, 0.11.x and 0.12.x, were not installed. Their changelog entries are bug
and packaging fixes.

`npm audit --package-lock-only` reports the same 10 findings (7 moderate, 3 high, in `js-yaml`,
`undici` and `webpack-dev-middleware`) before and after the bump. None is in `js-sha256`.

**The entry as it stood:**

`modules/eval-core/package.json:20` declares `js-sha256: ^0.10.1` as a peer. Because the package is
still `0.x`, a caret range there is locked to the **minor**, so `^0.10.1` admits `0.10.x` and nothing
else. Upstream has since published `0.11.0`, `0.11.1`, `0.12.0` and `1.0.0`, and `1.0.0` is `latest`
— so every version a consumer would naturally reach for is outside the declared range.

The peer is real, not vestigial. There is exactly one call site —
`modules/eval-core/src/lib/internal/classes/common/cache.ts:53`, which hashes a `namespace:value`
template string into a cache key.

**What a consumer sees.** A clean `npm install` is fine: npm's automatic peer installation picks
`0.10.1`. The failure is the *other* order — a consumer whose tree already contains `js-sha256@1`
gets an `ERESOLVE overriding peer dependency` warning naming `@zvenigora/ng-eval-core`, and npm keeps
their version, so the library runs against a major it never declared. A warning rather than an error.

**The decision.** Widening to `^0.10.1 || ^0.11.0 || ^0.12.0 || ^1.0.0` needs the `sha256` call
signature checked against `1.0.0` first. The alternative is to stop depending on a hash library for
what is a cache key: the value is never persisted, compared across processes, or relied on for
integrity, so a non-cryptographic hash computed in-repo would remove a peer dependency from the
published surface entirely, and the one call site makes that a contained change. Either way it alters
an exported package's `peerDependencies`, so it needs a `CHANGELOG.md` entry and a version bump.

<a id="f6"></a>
## F6 — CONTRIBUTING's "Code style" describes a config that never existed here

**Package** repo · **Kind** decision (editorial) · **Status** **Retired — fixed 2026-09-26**; the
table replaced by a paragraph that points at the configs

*Fixed* 2026-09-26, taking the second option below: the dead link and the thirteen-rule table
are gone, and "Code style" is now one paragraph naming the four `eslint.config.mjs` files, the
`@nx` flat presets each layer spreads, the three rules the configs add themselves (module
boundaries by scope tag, the `zvenigora` selector prefixes, `@nx/dependency-checks`), and
`npm run lint`. Each claim was checked against the four configs, the `tags` in each
`project.json` and the root `package.json`'s `lint` script before it was written. It
deliberately does not enumerate the rule set, for the reason the last paragraph gives. *Verified*:
`CONTRIBUTING.md` no longer mentions `.eslintrc.json`; every file it names exists; lint green.

*As recorded:*

`CONTRIBUTING.md:42` linked to `.eslintrc.json`. That file does not exist —
Phase 1's tooling work replaced it with flat config, and the workspace now has four:
`eslint.config.mjs` at the root and one per module. The link is dead.

The thirteen-rule table beneath it is the larger problem, because it reads as authoritative and is
not. **None of its thirteen rules appear in any of the four configs** — not `semi`, `curly`,
`brace-style`, `spaced-comment`, `no-dupe-keys` or any of the rest. What the configs actually enforce
is a different kind of thing: the `@nx` flat presets, `@nx/enforce-module-boundaries` with the
`scope:core` / `scope:signals` / `scope:forms` tag constraints, the `zvenigora` selector prefixes, and
`@nx/dependency-checks`.

Misleading rather than merely stale, because two rows tell a contributor to write code the repository
does not contain:

- `brace-style: [1, "stroustrup"]` requires `else` on its own line. `eval-core`'s sources have 57
  occurrences of `} else` and none of the Stroustrup form.
- `no-mixed-spaces-and-tabs: [1, "smart-tabs"]` is described as "tabs for indentation". No file under
  `modules/eval-core/src` is tab-indented; 109 are space-indented.

The decision is what should replace it. Enumerating the real rule set reproduces the same drift one
migration later, and most of it is inherited from presets rather than chosen here. Pointing at
`eslint.config.mjs` and saying "run `npm run lint`" is honest and much shorter, but loses the
commentary the section was written to provide. That choice is the work.

<a id="f7"></a>
## F7 — An intermittent Jest worker-teardown warning with no established locus

**Package** — · **Kind** fix · **Status** **Retired — fixed 2026-10-04**; ships in no package.
Was Open, its locus corrected 2026-09-09 from an `eval-core` property to the test runner

*Fixed* 2026-10-04: `jest.preset.js`, the `preset` all three projects' `jest.config.ts` name,
sets `maxWorkers: 1`. No `project.json`, no `ci` configuration of a `test` target and no CI step
sets `maxWorkers` or `runInBand`, so nothing overrides it. `npx jest --showConfig`, run in each
project as the inferred `test` target runs it, reports `maxWorkers` 1 for all three, where the
commit before reports 19 on the 20-core machine it was measured on.

**The mechanism**, read from the installed source. The `test` target runs `jest`, which is the
workspace's `jest` 30.3.0, and its `jest-runner` 30.3.0 loads its own copy of `jest-worker`
30.3.0:

- To end a run, the worker pool sends each worker an end message and starts a 500 ms timer. A
  worker still alive when the timer fires is killed, and `jest-runner` prints `A worker process
  has failed to exit gracefully and has been force exited`. The 500 ms is a module constant,
  `FORCE_EXIT_DELAY`, and `jest-runner` 30.3.0 passes the pool no option that changes it.
- A worker does not exit when it is told to. It stops listening for messages, and Node exits it
  once nothing is left pending. So a worker on a contended machine can miss the 500 ms with no
  handle leaked at all.
- Uncapped, each project starts one worker per core minus one, and `nx run-many` runs the
  projects side by side. The gate therefore ran three pools at once, each sized for the whole
  machine.
- With `maxWorkers` 1, Jest's scheduler runs every test file in band, in Jest's own process, one
  after another (`shouldRunInBand` in `@jest/core`), and builds no pool. No worker exists to be
  killed, so the warning has nothing to report.

**A second copy of Jest is installed, and it makes the delay configurable.** `@nx/jest` 23.2.1
brings `jest-config` and `jest-runner` 30.5.2, with `jest-worker` 30.5.1. In that line the delay
is `workerGracefulExitTimeout`, a config option that defaults to 500 and that `jest-runner` 30.5.2
passes to the pool. The `test` target does not run that copy. Raising the workspace's `jest` to
30.5 and the delay with it would have been the other fix. It keeps the workers, and with them the
contention measured below.

*Measured* in a 2-core sandbox, with all three suites at once. With 6 workers each, the run took
over 10 minutes: workers were killed for lack of memory, and tests timed out. With 1 worker
each, it took 37 s, all green. `eval-core` on its own took 28 s with 1 worker and 21 s with 2.

**What it costs** depends on the machine. A project run on its own gives up its own
parallelism: on two cores, `eval-core` took 28 s in band against 21 s on two workers. Under
`run-many` the three projects still run side by side, one process each, and that can win
outright. On the 20-core Windows machine the fix was made on, the gate took 41.5 s with 19
workers a project, and 19.3 s in band.

**What it does not do** is show that no spec leaks a handle. In band, a leaked handle keeps
Jest's own process alive instead of a worker, and Jest prints `Jest did not exit one second after
the test run has completed`, so a real leak now shows up instead of being killed with its worker.

*Verified*: `npx jest --showConfig` in each project, as above. The last gate before the change
printed the warning once, in `eval-core:test`'s block; the gate at the fixing commit printed it
no times, and no spec failed when run in band.

**The entry as it stood:**

**What it is, as measured today.** `A worker process has failed to exit gracefully` appears
**intermittently under `nx run-many`, and does not reproduce for any project run on its own.**
Measured on this tree, 2026-09-09, every run with `--skip-nx-cache`:

| Command | Warnings |
| ------- | -------- |
| `nx test eval-core` (with and without the new spec) | **0**, twice |
| `nx test eval-signals` (with and without the new spec) | **0**, twice |
| `nx test eval-forms` | **0** |
| `nx run-many -t test --parallel=1` | **0** |
| `nx run-many -t test --output-style=stream` | **0** |
| `nx run-many -t lint test build` | **2** on one run, then **0** on the next three |
| two `nx run-many` invocations racing each other | **0** and **0** |

So it fired twice in roughly a dozen runs, in a multi-target parallel run, and every attempt to
pin it since — including the same command, and including deliberately loading the machine —
came back clean.

**New observation, Phase 2 step 5, 2026-09-14: it fired once under `nx run-many -t lint test`, a
command the table above records as untested rather than as zero.** One firing, on the step's
baseline run; all targets stayed green; two later `nx run-many -t lint test build` runs in the same
session came back clean. It was **not** captured with `--output-style=stream`, so the emitting task
is still unattributed and this adds no locus.

**Recorded rather than folded into the table, because one firing overturns nothing** — the table's
rows are repeated measurements and this is a single observation of a command they do not cover. What
it does establish is that the symptom is not specific to the three-target form: `lint test` is
enough, so the common factor remains *multi-target `run-many`* rather than `build`. The entry's
locus has already been corrected once on the strength of a claim nobody re-ran; a second wrong
claim inherited from a single run is exactly what that correction was about, so this stays a dated
note beside the table and not a row in it.

**Observed 2026-10-03, Windows 11, in the `.claude/worktrees/c1` worktree: two runs of
`$env:NX_WORKSPACE_ROOT_PATH = '<worktree>'; npx nx run-many -t lint test build --skip-nx-cache --output-style=static`**
(PowerShell; the override because the session's environment set `NX_WORKSPACE_ROOT_PATH` to the
main checkout, which nx would otherwise have run). The first, before `f05ced9`, printed the
warning inside `eval-signals:test`'s block of the static output and inside `eval-core:test`'s; the
second, before `cfe9d42`, inside `eval-core:test`'s only. Every target was green both times. The
C1 batch's third gate run printed it for both `eval-signals:test` and `eval-core:test`, as that
batch reported it; not re-measured here.

> **What this replaces.** The entry said: "Confined to `eval-core` — confirmed by running each
> project separately." **That does not hold today**: run separately, `eval-core` is the *quietest*
> of the three, at zero. Either the attribution was made under conditions this tree no longer
> reproduces, or a single clean per-project run was read as confirmation of a locus. The claim
> travelled through twelve summaries without anyone re-running it, which is the same failure the
> entry itself is about.

**Say what it now is, not only what it is not.** These are two different investigations and only
the first is a library defect:

- **"`eval-core` leaks a handle"** — a timer or listener a spec leaves behind. This is what the
  entry used to assert. **The evidence against it is that a leak of that kind is deterministic**:
  it would fire on `nx test eval-core` alone, every time. It does not fire there at all.
- **"Something about parallel execution surfaces a Jest worker that misses its exit window"** —
  which is where the observations actually point, and which **may be no package's defect**. Under
  `run-many` several Jest instances contend for the same cores; a worker that has finished its
  work but does not exit within Jest's grace period is force-exited and reported exactly like a
  leak. That is a **tooling and scheduling question — Nx's task parallelism against Jest's worker
  teardown** — not an expression evaluator's.

**What this means for the timebox.** [`docs/gates/plan.md`](gates/plan.md) § 4 step 5 opens F7
with `nx test eval-core --detectOpenHandles`. **That command is aimed at a run that does not
exhibit the symptom**, so it will report nothing and the box will be spent proving the absence of
a leak nobody has evidence for. Amended there to say so.

**The honest recommendation is that step 5 should not spend its box here.** F7's own drop rule —
"if it is not identified within the step, stop, write what was ruled out, and leave it open" — is
already satisfied by this entry: the measurements above *are* what was ruled out, and they were
cheap because they were run against a symptom rather than a suspect. What would change that is a
**reproduction**, not another hunt: if someone catches it firing, capture the run with
`--output-style=stream` so the emitting task is attributed, and record the command and the
machine. Until then there is no locus to investigate, and an unattributed intermittent warning in
a build tool is not work this repository owes anyone.

**Not closed, and deliberately not.** It is real, it has been seen repeatedly across phases, and
"cannot reproduce today" is not "does not happen". What changed is that the entry no longer names
a package that the evidence does not support.

**Carried in twelve step summaries and never once promoted to an entry**, from
[`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md) through
[`forms/phase-6-step-6-summary.md` § 4.3](forms/phase-6-step-6-summary.md), each time as
"pre-existing; carried unchanged". Twelve sessions noticed it and none owned it, which is [A8](#a8)'s
failure mode in a lower-stakes register: a note that travels forward is not a note that gets acted on.

~~Most likely an open handle — a timer or a listener a spec leaves behind. `--detectOpenHandles` is
the first step.~~ **Superseded by the measurements above**: `--detectOpenHandles` on a run that
does not warn reports nothing, and "most likely an open handle" was a guess that hardened into a
locus over twelve restatements.

<a id="f8"></a>
## F8 — The release tag step has no forcing function, and ships with a silencer

**Package** repo · **Kind** fix · **Status** **Retired — fixed 2026-10-04**; ships in no package.
Was Premise retired 2026-09-16, when the ten missing tags were written, with the mechanism
untouched. Opened 2026-09-06 as "`eval-forms@0.2.0` is untagged, and CLAUDE.md describes a
pre-Phase-6 repo"

*Fixed* 2026-10-04, taking two of the three candidate fixes the entry listed: the silencer is
gone, and a check gates the tags.

- **The silencer.** `fallbackCurrentVersionResolver: "disk"` is removed from all three
  `project.json`s, so `nx release version` resolves each project's current version from its tag,
  and fails without one instead of falling back to the manifest.
- **The forcing function.** `tools/release-tags.mjs` runs in the root project's `test` target,
  after `tools/doc-links.mjs`, so `npm test`, CI and the gate all run it. For every row of
  [`backlog.md`](backlog.md)'s Publication status table, the tag `<project>@<version>` must exist,
  where the project is `eval-core`, `eval-signals` or `eval-forms` by the row's package. Where the
  row's notes name a commit after "Tagged", the tag must point at a commit starting with that SHA,
  and where they name a tag, it must be the row's own. A checkout with no release tags at all fails
  with a hint to run `git fetch --tags`, rather than skipping. CI's `actions/checkout` now has
  `fetch-depth: 0`, without which it would be exactly that checkout.
- **Where it bites.** CONTRIBUTING's Releasing step 6, the post-publish commit, writes the
  Publication status row, so that commit is red until the tag exists. CONTRIBUTING now says so.
  The check keys on the register rather than on the manifests: a version bumped in a
  `package.json` and not yet published has no row, so it needs no tag yet.

*Measured* at the commit that built it: 23 rows, 33 release tags in the repository, and every row
naming the commit its tag points at. The check passed on all 23.

*Verified*, each probe reverted:

| Probe | Output, exit 1 every time |
| ----- | ------------------------- |
| A row for `@zvenigora/ng-eval-forms` 0.9.9, which has no tag | `docs/backlog.md:80: @zvenigora/ng-eval-forms 0.9.9 is published, and there is no tag eval-forms@0.9.9` |
| `eval-forms` 0.3.0's row naming 1234567 instead of 0c3299e | `docs/backlog.md:79: eval-forms@0.3.0 is at 0c3299e, and the row says 1234567` |
| `eval-core` 0.5.0's row naming `1111111` instead of `` `016a313` ``, a backticked SHA | `docs/backlog.md:94: eval-core@0.5.0 is at 016a313, and the row says 1111111` |
| `eval-forms` 0.3.0's notes naming `eval-forms@0.2.9` | `docs/backlog.md:79: the notes name eval-forms@0.2.9, and the row is eval-forms@0.3.0` |
| A clone with `--no-tags --depth 1`, which is CI's checkout without `fetch-depth: 0` | the hint, naming no row, since none is at fault |

The first two ran together and each named its own row; the line numbers are the register's at the
time of the probe.

**What it does not do.** It does not check that a version was published: the row is the claim,
and CONTRIBUTING's step 4, `npm view` before tagging, is still what checks that. Nor does it write
the tag. The third candidate fix, tagging inside whatever runs the publish, was not taken, because
publishing is still manual.

**The entry as it stood:**

Two drifts between what the repository says about itself and what it is, both found 2026-09-06.

**The missing tag.** `CLAUDE.md` states each published package carries a `<name>@<version>` git tag.
`git tag --list` has `eval-core@0.3.0`, `eval-forms@0.1.0` and `eval-signals@0.1.0`. There is **no
`eval-forms@0.2.0`**, although `modules/eval-forms/package.json` says `0.2.0` and `CHANGELOG.md`
carries a dated `## [eval-forms 0.2.0] - 2026-09-06` entry. Either the tag was missed or 0.2.0 has not
actually been published; the release procedure has no step that distinguishes those, which is the same
gap [F2](#f2) describes reaching the changelog.

**`CLAUDE.md` described the repo as it was before Phase 6 — corrected 2026-09-06, this half is
done.** It had said that `docs/forms/phase-6-plan.md` "does not exist yet" and that writing it was
Phase 6's first deliverable (the file exists and runs to 3,420 lines); that `eval-forms` was
"Published at 0.1.0, by Phase 4" with the `/signals` entry point "designed and not built"; and
that Phases 1, 3 and 4 were the complete set. All three are now accurate, the "active plan"
pointer says there is none, and its three pointers into `ROADMAP.md`'s moved sections now cite
backlog IDs.

That half mattered more than an ordinary stale doc: `CLAUDE.md` is loaded into every session's
context, so each new session started from a description of the repository one phase behind, and
the "active plan" pointer aimed at a document the same file said did not exist.

**Open: the tag, and whether 0.2.0 is actually on npm.** — *the tag half is done; see the closing
note. Whether each version is on npm is untouched by tagging and remains unanswered.*

**Widened by Phase 2, 2026-09-16 — it is now three missing tags, not one.** The phase released
`eval-core` **0.4.0** (step 6) and, in step 7, `eval-signals` **0.1.1** and `eval-forms` **0.2.1**.
None of the three is tagged, so `git tag --list` still ends at the same three tags it had before
Phase 2 opened while three `package.json`s have moved past them.

The entry's original question — *was the tag missed, or was the version never published?* — is now
asked of four versions at once, and Phase 2 cannot answer it for its own three: this branch is
unmerged and nothing has been published from it.

**The mechanism, checked rather than guessed — and it is not "nobody wrote the procedure down".**
That was the natural reading and it is wrong:

- **The procedure is specified.** [`CONTRIBUTING.md`](../CONTRIBUTING.md) step 4 says to tag and
  push, gives the `{projectName}@{version}` format, gives the `git tag -a` command, and states the
  constraint that the commit must be the one the artifact was built from.
- **It was followed, once per package.** `eval-core@0.3.0`, `eval-forms@0.1.0` and
  `eval-signals@0.1.0` all exist. This is not a step nobody has ever performed.
- **All three `project.json`s read those tags** — `currentVersionResolver: "git-tag"` — so the
  tags are load-bearing input to the next release's version, exactly as CONTRIBUTING says.
- **And every release since has skipped it**: `eval-forms@0.2.0` from Phase 6, and Phase 2's
  `eval-core@0.4.0`, `eval-signals@0.1.1`, `eval-forms@0.2.1`. Four consecutive releases across
  two phases.

**So what is missing is not a writer but a forcing function — and there is an active silencer.**
`fallbackCurrentVersionResolver: "disk"` means a missing tag never fails anything: the resolver
falls back to the manifest, the next release computes a plausible version, and the configuration
that was supposed to depend on tags keeps working without them. A step that is documented,
manual, unenforced, and whose omission is *masked by design* will be skipped, and was — four times.

That is a sharper finding than "remember to tag", and it points at a different fix. Options, in
rough order of cost: have the release procedure fail loudly when the tag it is about to read does
not exist (drop or condition the disk fallback); or add the tag write to whatever runs the publish,
so the two cannot separate; or gate it, in the shape [F3](#f3) and [F4](#f4) took — a check that
every version in a `modules/*/package.json` has a corresponding tag. The last is the only one that
catches the four already missing.

**The tag backlog is empty as of 2026-09-16, and nothing above it changed.** Ten tags were written
and pushed: seven retroactively — `eval-core@0.1.104`, `@0.1.105`, `@0.1.106`, `@0.1.107`, `@0.2.1`,
`@0.2.2` and `eval-forms@0.2.0` — and three for the versions released this week, `eval-core@0.4.0`,
`eval-signals@0.1.1` and `eval-forms@0.2.1`. All sixteen tags in the repository are on the remote,
and every version in the three `modules/*/package.json` manifests and every released version in
`CHANGELOG.md` now resolves to one.

**That closes the arrears, not the entry.** The three current versions were tagged *because the gap
was noticed during the release*, not because anything required it — the same manual, unenforced step
this entry is about, performed once more by a reader who happened to be looking. The diagnosis above
stands **unchanged**: the procedure is specified in [`CONTRIBUTING.md`](../CONTRIBUTING.md) step 4,
it is understood, and it has no forcing function. `fallbackCurrentVersionResolver: "disk"` is still
set in all three `project.json`s and still means a missing tag fails nothing. **The three candidate
fixes are unchanged and none has been adopted** — with one clause now spent: the gate was the only
option that caught the versions already missing, and those have been caught by hand instead, so it
would now be adopted to stop the *next* omission rather than to clear a backlog. The next release
skips the step exactly as easily as the last four did.

**The three release tags point at `7935a78`, Phase 2's closing commit, and the artifacts were built
from `615cd49`.** Recorded so the deviation is findable rather than read later as a discrepancy:
`615cd49` is the `npm audit fix` that follows it and touches **`package-lock.json` only** (one file,
+73/−103), so the published bundles are byte-identical either way and no consumer is affected.
CONTRIBUTING step 4 nonetheless says the commit must be the one the artifact was built from, and
these three are one commit behind it. The seven retroactive tags are not part of this: each points
at its own historic commit and is correct.

<a id="f9"></a>
## F9 — No gate on document cross-references — **Retired, fixed**

**Package** repo · **Kind** fix · **Status** **Retired — fixed 2026-09-28**: `tools/doc-links.mjs`,
the workspace root's `test` target. Considered and deferred by
[`docs/gates/plan.md`](gates/plan.md) § 8.4, step 2, 2026-09-07

**The gate.** `tools/doc-links.mjs` reads the tracked `*.md` files (`git ls-files`) using only Node
built-ins. It resolves every relative `](path)` and `](path#anchor)` link, and every `#anchor`-only
link. The target file must exist relative to the linking file. The anchor must be a GitHub heading
slug (with `-1`, `-2` for duplicates) or an explicit `<a id>` in the target. A `#L…` anchor on a
`.md` target is an error, because GitHub renders no line anchors in markdown. A `#L…` anchor on any
other file is checked against the end of the file only. Links in fenced blocks and inline code,
links with a scheme and reference-style definitions are skipped. A broken link prints
`file:line: target — reason` and exits 1.

**Where it lives, and why § 8.4's objection no longer holds.** It is the `test` target of the
workspace root, `@zvenigora/ng-eval`, declared in the root `package.json`'s `nx.targets` as
`node tools/doc-links.mjs`. So `nx run-many -t test`, `npm test` and CI all run it, with no project
filter to add. § 8.4 deferred it because it had no natural project, and folding it into
`public-api.spec.ts` would have put two unrelated claims behind one name. [§ 8.1](gates/plan.md)
had also measured that a spec outside a project runs under no `nx test` target. All three
assumed the gate had to be a Jest spec in one of the libraries. The root has been an Nx project
all along, with only `nx-release-publish` on it, so a plain Node target there makes its own claim
under its own name. Its scope, every tracked `*.md`, matches the project's scope, the whole
workspace. It needs no Jest config and no helper import across the boundary rule. It is
uncached, so it has no `inputs` to keep right.

**Measured before it was built**, on 2026-09-27: 115 files and 970 links, 5 of them dangling and
all 5 missing anchors. Three were `.md#L…` line anchors whose lines had drifted: 661 → 682 in the
`eval-forms` README, 555 → 576 there, and 102 → 103 in the `eval-signals` README. Two were
heading slugs written by hand that never matched: `step-8--f14s-four-comment-sites` from 03b5923,
and `…030--050…` from 737ebab, where GitHub renders `…030-050…`. All five are fixed by the commit
that added the gate, which pointed the three line anchors at the headings now holding the cited
text. **The slugger was compared against GitHub, not trusted.** Every heading in the 7 files that
anchors point into (265 headings) matched GitHub's rendered `id`s. That comparison caught one bug
before the gate shipped: `_` inside a code span was being stripped as emphasis, which broke the
[R1](#r1) heading. A full scan takes about 80 ms, and about 180 ms through `nx`.

**What it does not see, and why neither is gated.**

- **Line-anchor drift into source files.** A `#L…` anchor into a `.ts` file passes as long as the
  line exists. Blaming each linking line and comparing the cited line then and now found **46 of 88
  drifted** on 2026-09-27. Of those, 38 are in design records (36 in
  [`statements/phase-2-plan.md`](statements/phase-2-plan.md), 2 in [`a20/plan.md`](a20/plan.md)),
  which cite the code as it was when they were written and are left that way by design. The other
  8 are in this register, and were re-pointed 2026-09-28:
  - 4 moved to where the cited code now lives ([A2](#a2)'s two chains, [A4](#a4)'s `getKey`, and
    [A7](#a7)'s prior-scopes loop, whose original range had started three lines early).
  - 3 became SHA-pinned links to `ef5ac2b`, because the code they cite is gone ([A9](#a9)'s two
    unguarded push sites, and [B2](#b2)'s `console.log`).
  - 1 was left alone. [R1](#r1)'s export is still on line 12, and the line only gained
    `EMPTY_COMPLETION`.

  That last one is also a limit of the measurement itself: a changed line can still hold the code
  it cites, so 46 overstates the real drift. The check needs history to run: about 4.7 s, and it needs the full
  history. CI's `actions/checkout@v5` makes a depth-1 clone, where blame cannot attribute a
  line. It also cannot tell drift that is wrong from drift a record is meant to have. So it stays
  a measurement, not a gate. A live document that cites code should use a heading anchor or a
  SHA-pinned link.
- **References that are not links.** The "Track 1 / Track 2" instance below had no link syntax,
  so there was nothing to resolve. A label is not machine-checkable. The guard is the
  convention this entry already recorded, that scope rows cite entry IDs.

*As recorded before the fix:*

Nothing resolves a `](path#anchor)` link in this repository's documents against the filesystem or
against the target's headings. The evidence for wanting one is this register's own history: the
commit that created it shipped **two links to a section it had not written** — in the commit
arguing that dangling cross-references are how [A8](#a8) stayed invisible for five phases
([R4](#r4)). The documents here cite each other heavily and by anchor, so the failure is
available on every edit.

**Why it was deferred rather than folded into step 2**, now that the machinery exists and can be
compared rather than guessed at:

- **It shares almost nothing with the drift gate.** The part that was the unknown — the
  TypeScript export-list reader — is no use to a link checker, which needs `fs` and a
  heading-to-anchor slugifier. What would be shared is the markdown scan, which is nine lines.
  "The same shape of scan over the same files" turned out to be the weakest half of the argument.
- **It is a different claim.** F3 guards the public API surface; this guards document integrity.
  Folding it into `public-api.spec.ts` would put two unrelated claims behind one name, and the
  first person to see that spec red would learn nothing from its name.
- **Its scope is wider than anything in Track 3** (the documentation gates,
  [`docs/gates/plan.md`](gates/plan.md)) — `docs/` is 20+ files against four READMEs —
  and it has no natural project to live in, which is the same constraint that settled § 8.1.

**Not deferred on cost.** One cold export-list read measures 344 ms (`eval-core`) and 210–235 ms
for each other entry, so the gate this would join is well under a second in total.

**First concrete instance, 2026-09-13 — and it is the argument this entry was missing.** Until now
the case rested on [R4](#r4), two links to a section that was never written: a *broken* reference,
which a reader notices. This one is worse, because nothing about it looks broken.

[`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 2 excluded work with the row
*"Everything in `docs/backlog.md` Track 1 / Track 2 — not this phase's subject"*. **This register
has no Track 1 and no Track 2.** All three Tracks were a sequencing suggestion made in
conversation — 1 the error-identity group ([A4](#a4), [A5](#a5), [A6](#a6), [A7](#a7), [C3](#c3)),
2 the write policy ([C1](#c1), [C2](#c2)), 3 the documentation gates — and only the third was ever
written down. The plan then cited all three as though the reader could look them up.

Provenance, and each step of it is ordinary:

1. **It entered through the commit that introduced the plan** — `2177df1`, which `git log -S "Track 1"`
   identifies as the only commit in this repository's history to add the phrase. Not inherited from
   an older layout, not left behind by a rename: written new, in a document being written carefully.
2. **It was repeated as fact.** The reference was read and summarised downstream, including in this
   session's own reporting, as though it named a structure — which is how a phrase gets a second
   citation without ever acquiring a first.
3. **It survived because a phrase that looks like a citation is not one.** "Track 1 / Track 2" has
   the shape of a reference to a document that has sections, in a row whose whole job was to
   exclude work. It is not a `](#anchor)` link, so no link checker of the kind proposed above
   would have resolved it either — see the scope note below.
4. **Half the family resolves, which is what made the other half invisible.** "Track 3" *is*
   recorded here — glossed beside the document list at the top of this file, and the title of every
   [`docs/gates/`](gates/plan.md) document. A reader who spot-checks the label finds it. One member
   of a label family resolving lends the others the appearance of resolving, and the check stops
   there.

**What this instance changes about the gate.** The failure mode is not a dead link but a **live
reference to a structure that does not exist**, and the proposed checker resolves paths and
anchors — it would have caught this only if the plan had written the exclusion as a link, which is
itself the lesson: *a document that excludes work should name the entries, because a named entry is
checkable and a label is not.* So this instance argues for two things rather than one — the link
checker as specified, and a convention that scope rows cite IDs. The second is free and is applied
in the plan, where the row now names A4–A7, C3, C1 and C2 directly.

**Corrected**: the § 2 row names the entries, with the provenance recorded beside it. `CLAUDE.md`
was checked and never carried the phrase.

**What it would take**, for whoever picks it up: resolve every `](relative/path)` against the
filesystem, and every `#anchor` against the headings of the target file, over `docs/**/*.md` plus
the four READMEs. The anchor half is the one with a real decision in it — this repository writes
some anchors as explicit `<a id="…">` tags and relies on generated heading slugs elsewhere, so a
checker must handle both or it will false-fail on correct links, which is the shape
[F3](#f3) § 1.1 rejected.

<a id="f10"></a>
## F10 — The drift gate covers documented-**and-imported** symbols, not documented ones

**Package** core, signals **and** forms · **Kind** fix · **Status** **Retired — fixed
2026-10-04**; ships in no package. Was Open, the coverage gap [F3](#f3) left behind, opened
2026-09-08

*Fixed* 2026-10-04, in the entry's "sound and larger" shape: every export is documented, or listed
with a reason. In each `export-list.spec.ts`, **documented** means the export's name appears in a
code span of that package's README. The span is inline, outside any fenced block, and the name
must not follow a `.`, so `` `service.parse(expr)` `` names `service` and not the exported
function `parse`. An export no code span names must be in a per-package allowlist in the same
spec, with one reason from a fixed set:

| Reason | Meaning |
| ------ | ------- |
| `signature-type` | A type met only through a documented symbol's signature: a parameter, an option, a return value, an event, or an element of one |
| `function-form` | A free function a documented service method wraps, or the default that method uses |
| `example-only` | Named in one of the README's fenced code examples, and in no code span |
| `building-block` | A general-purpose class the evaluator is built from, its type, or a helper over it |
| `unused` | Referenced by nothing in the workspace beyond its own declaration and the barrels |

Every allowlist entry must also still be exported, so the list cannot outlive what it excuses.
`eval-forms`' gate reads its three entry points' exports as one surface, because one README
documents all three.

*Measured*, at the commit that built it:

| Package | Exports | Named in a code span | Allowlisted | `signature-type` | `function-form` | `example-only` | `building-block` | `unused` |
| ------- | ------: | -------------------: | ----------: | ---------------: | --------------: | -------------: | ---------------: | -------: |
| `eval-core` | 76 | 12 | 64 | 26 | 9 | 1 | 11 | 17 |
| `eval-signals` | 7 | 6 | 1 | 1 | 0 | 0 | 0 | 0 |
| `eval-forms`, three entry points | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **98** | **33** | **65** | **27** | **9** | **1** | **11** | **17** |

`eval-core`'s package README names twelve of its exports and defers the rest to the repository
README, which ships nowhere. That is why its list is long, and why it is the list F3 found the
first five of. The three `/reactive` symbols this entry measured, `createControlSource`,
`FormBinding` and `FieldSchema`, are each named in a code span and so are gated now.

**The seventeen `unused` are [B5](#b5)**, opened from this step rather than decided in it.

*The bound*, recorded as this entry's fix was asked to: the gate runs from the exports to the
README, not back. A documented export that is **removed** leaves the README naming something that
no longer exists, and this gate cannot see that. What catches it is the release-time comparison of
the built `.d.ts` against the published version, and [F3](#f3)'s gate as well where the README
imports the name. A code span that uses an exported name in another sense also counts as
documenting it.

*Verified*: each copy gains four rows: the README check, the allowlist check, and one fixture row
for each helper. Each copy is registered once by itself and once by every gate that imports it, so
`eval-core` went from 1292 to 1300, `eval-signals` from 164 to 172 and `eval-forms` from 325 to 341.
Probes, each against every project's tests, then reverted:

| Probe | `eval-core` | `eval-signals` | `eval-forms` |
| ----- | ----------- | -------------- | ------------ |
| An undocumented export added to the package's barrel | 2: the README row, twice registered | 2: the same | 4: the same, four times registered |
| An allowlist entry deleted, `Queue` and `SignalContextSource` | 2: the README row | 2: the README row | no entry to delete |
| An allowlist entry for a name not exported | 2: the allowlist row | 2: the allowlist row | 4: the allowlist row |

Nothing else went red under any of them. F3's index summary, "Documented-symbol drift gate", is
renamed to "README-import drift gate", so the two entries no longer both claim this coverage.

**The entry as it stood:**

[F3](#f3) is retired and its gate is green, and it now reads — including in its own title — as
"documented symbols do not drift". **What it actually asserts is that documented *and imported*
symbols do not drift.** The gate scans `import { … } from '@zvenigora/…'` statements, so an
exported symbol a README documents by any other means is outside it entirely.

This is a gap in coverage, not a caveat on the mechanism, which is why it is here rather than in
F3's limits list: F3's three limits describe what its gate deliberately does not attempt; this
describes a class of exported surface that no gate in the repository watches.

**Measured today**, in `modules/eval-forms/README.md`:

| Symbol | Exported from | Documented at | In an `import`? |
| ------ | ------------- | ------------- | --------------- |
| `createControlSource` | `/reactive` | `:159`, the API table | no |
| `FormBinding` | `/reactive` | `:156` and `:497`, prose and table | no |
| `FieldSchema` | `/reactive` | `:157` table, `:177` interface block | no |

All three are real published surface, all three are documented well enough that a consumer will
use them, and renaming any of them leaves every gate green. `bindFieldProperties` sits in the
same table and *is* covered — only because a different section happens to import it.

**Two shapes of fix, and they are not the same size.**

- **Cheap and partial**: scan for the symbols' *names* as they appear in prose or tables, not
  only in import statements. This finds these three, and it false-fails the first time a README
  legitimately names a symbol that was removed on purpose, or names a word that is also a
  symbol. That is close to the shape [F3](#f3) § 1.1 rejected, and it should not be adopted
  without an answer to it.
- **Sound and larger**: assert the other direction — every symbol in a package's export list is
  documented *somewhere* in that package's README. That is a real completeness gate rather than
  a drift gate, and it starts red: `eval-core` exports 74 names and its README names a small
  fraction of them, so adopting it means deciding what "documented" means for an internal type
  alias. That decision is the actual work here, and it is why this is an entry rather than a
  step someone can pick up in an hour.

Whoever takes it should also rename F3's summary line, or leave it retired and let this entry
carry the claim — but the two should not both stand as written.

<a id="f11"></a>
## F11 — A gated README can only import from its own specifier

**Package** core, signals **and** forms · **Kind** fix · **Status** **Retired — fixed 2026-10-03**;
ships in no package. Was Open — the second coverage limit Track 3 found from inside the work,
opened 2026-09-08

Each drift gate built in [F3](#f3) checks one README against **one** specifier's export list:
`modules/eval-signals/README.md` against `@zvenigora/ng-eval-signals`, `eval-forms`' against
`/reactive` and `/signals` separately, and so on. **An import line naming a different
`@zvenigora/…` package in that same file is scanned by nothing** — not by that file's gate, which
filters on its own specifier, and not by the other package's gate, which reads only its own
README.

This is not hypothetical and the track walked into it in step 3. Completing
`## Using the adapter directly` in `modules/eval-signals/README.md` required an `EvalService`,
which is `@zvenigora/ng-eval-core` surface. The block names it in a comment rather than an
`import` line **for this reason**: printing the import would have added the first unscanned
import line to a gated file, buying documentation completeness and zero coverage. That is a
defensible call for one block and a bad general rule — cross-package examples are exactly what a
three-package workspace's documentation should contain.

**It bounds [F4](#f4) as well as F3.** An execution spec substitutes its imports anyway (§ 1.2),
so a cross-package import line is unchecked in both directions: nothing verifies the symbol
exists, and nothing runs the line as printed.

**The fix is small and its cost is a decision, not code.** Each gate takes the set of specifiers
appearing in its README rather than a single constant, and resolves each against that specifier's
own export list — the reader in `export-list.spec.ts` already maps all five specifiers, so the
machinery exists. What has to be decided first is **which gate owns a cross-package line**: the
README's own package, which is where the failure should be reported, or the exporting package,
which is where a rename happens. Owning it in the README's package means a rename in `eval-core`
turns `eval-signals`' suite red, which is the right report and a cross-project coupling this
workspace has so far avoided in its test targets.

Related: [F10](#f10), the other limit of the same shape — the gate covers documented-**and-
imported** symbols, so an exported symbol named only in prose is unwatched. F10 is about which
*symbols* are checked; this is about which *specifiers*. Together they bound what "the READMEs
are gated" is entitled to mean.

**Decided 2026-10-03: the README's own package owns the line.** A rename in another package turns
this package's gate red, which is where the stale line is and where the entry said the failure
should be reported; the cross-project coupling is a *read* of the other package's sources through
the TypeScript compiler, not an import, so the module boundary rule is untouched.

**Fixed.** Each of the three `export-list.spec.ts` copies gains `unresolvedAcrossSpecifiers`, which
resolves every `@zvenigora/…` import a README holds against that specifier's own export list,
through `SPECIFIER_ENTRY` — the mirror of `tsconfig.base.json`'s paths, already checked against
it — and fails a specifier the workspace does not map rather than skipping it. Each copy then
checks its project's READMEs: `eval-core`, the root `README.md` and its own; `eval-signals` and
`eval-forms`, their own. The per-specifier gates stay as they are. The wider gate found **no
mismatch** in any README, so no README needed a rename.

Both instances this entry and [D10](#d10) recorded are now import lines: `eval-signals`'
`## Using the adapter directly` imports `EvalService` from `@zvenigora/ng-eval-core`, and
`eval-forms`' `applyErrorPolicy` block imports `SignalContextWriteError` from
`@zvenigora/ng-eval-signals`. Each README-examples gate accepts it: the block counts are unchanged,
and each case already imported that symbol from that specifier, so the printed line is now what
runs.

*Verified*: in each copy, a fixture row resolves a cross-package import against the other package
and names the misspelled half, and `eval-core`'s fails an unmapped specifier. **Probe**, reverted:
a misspelled cross-package import appended to each README — `createEvalSignalz` from
`@zvenigora/ng-eval-signals` in the root and `eval-core` READMEs, `EvalServicez` from
`@zvenigora/ng-eval-core` in `eval-signals`', `SignalContextWriteErrorz` from
`@zvenigora/ng-eval-signals` in `eval-forms`'. Each failed its own README's new row and nothing
else: `eval-core` 4 (two README rows, each registered twice — `public-api.spec.ts` imports the
copy), `eval-signals` 2, `eval-forms` 4 (one row, registered by the copy and three gates). No
existing per-specifier gate went red on any of them, which is the hole this entry described.

<a id="f12"></a>
## F12 — The downstream peer ranges exclude `eval-core` 0.4.0 — **Retired, fixed**

**Package** signals, forms · **Kind** fix (release coordination) · **Status** **Retired — fixed,
Phase 2 step 7, 2026-09-16.** Created by step 6 the day before

**Fixed.** Both ranges widened to `">=0.3.0 <0.5.0"` — `eval-signals` **0.1.1**, `eval-forms`
**0.2.1**, both patch releases carrying nothing but the manifest field. `>=0.3.0` rather than
`^0.4.0` deliberately: see [`statements/phase-2-plan.md`](statements/phase-2-plan.md) § 7.1. The
short version is that dropping 0.3.0 would have been a breaking release bought for a retirement it
does not deliver — the containments stay either way, on the public `EvalContext.push`/`pop` route,
which no peer range touches.

`eval-forms`' `"@zvenigora/ng-eval-signals": "^0.1.0"` needed no change: it already admits 0.1.1.

**The cache half is fixed too, and was the more general defect** — see the entry's last section.
`nx.json`'s `lint` target gained `"^production"` to its `inputs`.

---

**The entry as it stood, kept because the measurements are the reason the fix took the shape it
did:**

`modules/eval-signals/package.json:19` and `modules/eval-forms/package.json:22` both declare
`"@zvenigora/ng-eval-core": "^0.3.0"` as a peer dependency. `^0.3.0` resolves to `>=0.3.0 <0.4.0`,
so **`eval-core` 0.4.0 is excluded by both**. A consumer who upgrades `eval-core` while holding
`eval-signals` 0.1.0 or `eval-forms` 0.2.0 gets a peer-dependency conflict.

**It also breaks this repository's own lint, which is how it was found.** `@nx/dependency-checks`
fails both downstream `lint` targets the moment `modules/eval-core/package.json` reads `0.4.0`:

```
The version specifier does not contain the installed version of
"@zvenigora/ng-eval-core" package: 0.4.0   @nx/dependency-checks
```

Isolated by measurement, not inference: with `eval-core` at `0.3.0` `nx run-many -t lint` is green
for all three projects; at `0.4.0` `eval-signals:lint` and `eval-forms:lint` fail and nothing else
changes. **So `eval-core` 0.4.0 cannot be committed with a green lint run until the ranges widen**,
which is a `CONTRIBUTING.md` precondition for committing at all — and the fix is in two files that
Phase 2's scope gate ([plan § 6](statements/phase-2-plan.md) gate 1) makes a stop-and-replan.
Phase 2 step 6 therefore ends with this open rather than working around it.

**It was cached out of sight for most of step 6.** `nx run-many -t lint test build` reported green
after the bump because both `lint` results were replayed from cache; only `--skip-nx-cache`
surfaced it. That is worth recording next to [F7](#f7): a cache hit on a target whose input is
another project's `package.json` is a way for a gate to report a pass it did not run. Whether the
inputs for these `lint` targets are configured wrongly is a second question this entry does not
settle.

**It was configured wrongly, and step 7 settled it — one line.** `nx.json`'s `lint` target declared
`inputs: ["default", <the two eslint configs>]`, and `default` is `{projectRoot}/**/*` plus an empty
`sharedGlobals` — so **nothing from any dependency**. `@nx/dependency-checks` reads a *sibling
project's* manifest, so `eval-signals:lint`'s correctness depended on a file its cache key did not
cover. Adding **`"^production"`** to that `inputs` array brings every dependency's non-spec files,
`package.json` included, into the key.

*Measured both ways, because "the cache was stale" is not by itself a diagnosis:*

| | cached `nx run-many -t lint` after setting `eval-core` to an **inadmissible** `0.6.0` |
| --- | --- |
| **without** `^production` | **`Successfully ran target lint for 3 projects`** — green, replayed, wrong |
| **with** `^production` | fails both downstream projects, naming `0.6.0` |

The first row is step 6's incident reproduced exactly, on demand.

**`lint` was the only target with this gap**, checked rather than assumed: `build` and
`@nx/angular:package` already declared `["production", "^production"]`, `@nx/jest:jest` already
declared `["default", "^production", …]`, and no `project.json` in this repository overrides
`inputs` for any target. So there is no residual entry to open — this is the whole of the class.

**The cost, stated rather than discovered later**: `lint` now cache-misses whenever any
*dependency's* non-spec files change, so an `eval-core` source edit invalidates `eval-signals:lint`
and `eval-forms:lint` as well as its own. That is more misses than before and is the correct
trade — the alternative is a gate that reports passes it did not run, which is what this entry is.

**Not an incompatibility.** Both libraries' suites run against this repository's `eval-core` source
on every build and are green at 0.4.0 — including the two behavioural changes that reach them, A9's
scope-pop repair and the § 3.2 write relaxation. What is stale is the declared range, not the code.

**Why it is recorded rather than fixed here.** Widening the range is an edit to
`modules/eval-signals/` and `modules/eval-forms/`, which Phase 2's scope gate makes a
stop-and-replan (plan § 6 gate 1), and a peer-range change is itself a release of those packages —
so it needs a version, a `CHANGELOG.md` heading and a tag each, which is a release decision and not
a step-6 tidy-up. It is noted in the 0.4.0 entry so a consumer meets it in the changelog rather
than in their installer.

**What it would take**: `^0.3.0` → `>=0.3.0 <0.5.0` (or `^0.4.0`, if dropping 0.3.0 support is
intended — it is not obviously wrong, since neither package needs anything 0.4.0 added), a patch
bump of each, and an entry per package. [F2](#f2) — one `CHANGELOG.md` for three packages — is the
thing that makes "an entry per package" awkward, and [F8](#f8) is the missing-tag half.

<a id="f14"></a>
## F14 — Four downstream comments cite a peer range that no longer exists, and one repeats A9's necessary-vs-sufficient error

**Package** signals, forms · **Kind** fix (comments, and **published documentation**) · **Status**
**Retired — fixed, Phase 2 step 8, 2026-09-16.** Created by step 7 the same day

**Fixed, at six sites — and it was filed as four.** Step 8 checked the count rather than trusting
it and found `^0.3.0` asserted in **both published READMEs** as well as the four comments:

| File | Line | What it said | |
| ---- | ---- | ------------ | - |
| `eval-signals/README.md` | 20 | "Peer dependencies: … `@zvenigora/ng-eval-core ^0.3.0`" | fixed |
| `eval-forms/README.md` | 70 | a `peerDependencies` block quoting `"@zvenigora/ng-eval-core": "^0.3.0"` | fixed |

**The two the entry missed were the consumer-facing ones, and this entry had them the wrong way
round.** A comment misleads a maintainer reading the source; a README ships in the npm tarball. Both
asserted a range the manifest did not have, in the direction that says `eval-core` 0.4.0 is
*unsupported* — the exact confusion `eval-signals` 0.1.1 and `eval-forms` 0.2.1 were released to
remove, restated in the document a consumer reads first. **A count written from memory in an entry
that was itself about a stale claim**, which is [F13](#f13)'s subject arriving in the register
rather than in a spec docblock.

Step 8's file list was amended in the plan before either README was touched, rather than absorbed by
analogy — a README is neither a comment nor a manifest. `eval-forms`' block duplicates five other
ranges; all five were checked against the manifest and were already correct.

These are **worse than the four comments they were filed behind**, and the entry had them the wrong
way round. A comment misleads a maintainer reading the source; a README ships in the npm tarball and
is the first thing a consumer reads. Both now state a range the manifest does not have — and state
it in the direction that tells a reader `eval-core` 0.4.0 is *unsupported*, which is precisely the
confusion `eval-signals` 0.1.1 and `eval-forms` 0.2.1 were released to remove. `eval-forms`' block
also reproduces the manifest verbatim, so it reads as authoritative.

**Not fixed by step 8**, whose sanctioned list is the four comment sites and explicitly no other
downstream path ([plan § 8](statements/phase-2-plan.md#step-8--f14s-stale-peer-range-citations)). A README
is neither a comment nor a manifest, so it falls outside that list rather than inside it by
analogy — and a published documentation change is the sort of thing this phase has twice decided is
worth its own sanction. It needs one.

**What it would take**: re-spell both to `>=0.3.0 <0.5.0`. `eval-forms`' block should be checked
against the whole manifest while it is open, since it duplicates five other ranges that can drift
the same way — which is the argument for the block citing the manifest rather than copying it.

---

**The four comment sites, fixed by step 8, 2026-09-16:**

Step 7 widened both peer ranges from `^0.3.0` to `>=0.3.0 <0.5.0` ([F12](#f12)). Four downstream
comments name the old range by its literal spelling:

| File | Line | What it says |
| ---- | ---- | ------------ |
| `eval-signals/src/lib/eval-signal.ts` | 339 | "`package.json` declares `"@zvenigora/ng-eval-core": "^0.3.0"`, and that range admits the *leaking* 0.3.0" |
| `eval-signals/src/lib/eval-signal.memory.spec.ts` | 233 | the same claim, in the docblock of a containment spec |
| `eval-forms/signals/src/lib/evaluate-rule.ts` | 50 | the same claim |
| `eval-forms/signals/src/lib/evaluate-rule.spec.ts` | 44 | "leaking `eval-core` under the `^0.3.0` peer range" |

**Stale in spelling, not in substance — which is why this is low and not urgent.** Every one of
them reasons that the range *admits the leaking 0.3.0*, and `>=0.3.0 <0.5.0` still does. Had step 7
chosen `^0.4.0` these would have become outright false; under the range actually chosen they cite a
string that no longer appears in the manifest while their argument survives intact.

**One of them is more than a spelling**, and it is the same defect this backlog's
[A9](#a9)-adjacent planning note carried: `evaluate-rule.ts:53` says *"Removal is gated on raising
the peer range, which is a breaking release."* That reads as a **sufficient** condition and is only
a **necessary** one — `EvalContext.push` / `pop` are public methods on a published class, so a
scope can be stranded at any `eval-core` version and the containment stays load-bearing however the
range moves. A reader who raises the range and then deletes the guard on the strength of that
sentence removes a live protection. The same sentence in
[`statements/phase-2-plan.md`](statements/phase-2-plan.md) step 0b **was** corrected in place by
step 7; this copy of it was not, because it lives in downstream source.

**Why step 7 did not fix it.** Step 7's sanctioned file list is the two `package.json`s and
nothing else under either package — not a source file, not a spec (plan § 6 gate 1). Reaching into
four source files to edit comments is 0b's exception, not step 7's, and the two were written to be
disjoint on purpose. Fixing this is a comment-only change to four files and wants its own sanction.

**What it would take**: re-spell the range in all four, and rewrite `evaluate-rule.ts:53` to state
both retention reasons — the peer range still admitting 0.3.0, **and** the public `push`/`pop`
route, noting that only the second is durable. Plan § 4 step 0b's reworded containment criterion
has the wording to copy.

<a id="f13"></a>
## F13 — Nothing gates the README block count `readme-examples.spec.ts` claims

**Package** core, signals, forms · **Kind** test gap · **Status** **Retired — fixed 2026-09-27**,
test only; all four specs gated. Recorded Phase 2 step 6, 2026-09-15

*Fixed* 2026-09-27. In all four specs, `eval-core`, `eval-signals`, `eval-forms/signals` and
`eval-forms/reactive`, the docblock's count is now a named constant that the docblock cites rather
than restates. A new case in each reads the document from disk and counts the blocks the docblock
says it counts:

| Spec | Counts | Constant |
| ---- | ------ | -------- |
| `eval-core` | ` ```javascript ` fences, whole file | `README_JAVASCRIPT_BLOCKS` = 16 |
| `eval-signals` | ` ```ts ` and ` ```sh ` fences, whole file | `README_TS_BLOCKS` = 9, `README_SH_BLOCKS` = 2 |
| `eval-forms/signals` | every fence under `## Signal Forms — /signals`, and under `### Expressions are not validated` | `README_SIGNALS_BLOCKS` = 5, `README_ASYMMETRY_BLOCKS` = 1 |
| `eval-forms/reactive` | ` ```ts ` fences from `## Quick start — Reactive Forms (/reactive)` up to, not including, `## Signal Forms — /signals`; and ` ```ts ` fences in `docs/forms/worked-example.md`, whole file | `README_REACTIVE_TS_BLOCKS` = 10, `WORKED_EXAMPLE_TS_BLOCKS` = 11 |

A fence opens on three or more backticks or tildes at **any** indentation, so the fence inside
`eval-core`'s `onHookError` bullet, which a `^```` scan misses, is counted. Headings are read only
outside blocks. The reader is copied into each spec, because no spec may import out of another
project (`export-list.spec.ts`) or across entry points by a relative path. Every docblock said it
"does not read the markdown", and each now says it reads the markdown only to count blocks.
`/signals`' docblock names no fence language, so its count takes every language in its two
sections. Today every block there is `ts`.

**`/reactive`'s scope was decided for this gate.** Its docblock had stated none: it covered "the
`/reactive` `ts` blocks that are runnable, and the shared core's two `Coercion` blocks", which
matches no heading boundary. It is now the heading range above, and it takes in the two shared-core
sections between them, `## Coercion` and `## When a rule fails`. The docblock lists the 10 README
blocks so they add up. 7 are executed there. `### Expressions are not validated` is executed by
the `/signals` spec, as its docblock says. Two are not covered: `interface FieldSchema`, a
declaration, and `## Lifetime`'s block. That block is a fragment with a free `schema` and `form`
and an elided `// …`, and what it claims, that `destroy()` releases and is idempotent, is executed
by the Quick start case and the worked example's § 8. All 11 worked-example blocks are executed.
§ 1's form runs as constructed inside § 3's service, which is where the document says it is built.
Named out of scope: the README's intro block, `## Versions`, the `sh` blocks, and `html` in both
files.

**The gate's first run found `eval-core`'s count wrong a third time.** The docblock claimed 14
blocks and full coverage, and the README held 16: `f660c0d` (A12's documentation, 2026-09-23) added
the two `### Bounding the trace` blocks with no case. This is the failure the entry predicted, a
block added without a case under a green suite. Both blocks are covered now, as two cases
because the second re-declares `state`. So `eval-core` went from 1073 to 1076: those two and the
count case. [F3](#f3) excluded a block-count assertion from the *drift* gate because the fix it
invites is bumping the number. Here the first failure was investigated, and the fix was cases.

**What is gated is the count, not the case-to-block mapping**, which stays prose in each
docblock. A mapping gate is not worth building. Its useful form executes each block as printed,
which is [F3](#f3)'s "considered and rejected" case: a transcription is written to work, so it would
not have caught the fragment defects that motivated the gates. Its cheap form checks that each case
cites a heading that exists, fires on every edit that moves a heading, and gates almost nothing.

*Probed* on working copies of the documents, each probe reverted:

| Probe | `eval-core` | `eval-signals` | `eval-forms/signals` |
| ----- | ----------- | -------------- | -------------------- |
| (a) indented fence added in a list item, counted scope | **red**, 17 ≠ 16 | **red**, `ts` 10 ≠ 9 | **red**, section 6 ≠ 5 |
| (b) one counted block deleted | **red**, 15 ≠ 16 (the indented `EvalHooks` fence) | **red**, `ts` 8 ≠ 9 (`## Options`, counted and uncovered) | **red**, section 4 ≠ 5 (the Reuse block) |
| (b′) the other constant's block deleted | — | **red**, `sh` 1 ≠ 2 | **red**, asymmetry 0 ≠ 1 |
| (c) block added in an uncounted language or section | green (a ` ```ts ` block) | green (a ` ```json ` block) | green (` ```ts ` blocks just before `## Signal Forms — /signals` and under `## What is not here`, the H2 after its section)¹ |

| Probe | `README_REACTIVE_TS_BLOCKS` | `WORKED_EXAMPLE_TS_BLOCKS` |
| ----- | --------------------------- | -------------------------- |
| (a) indented ` ```ts ` fence added in a list item | **red**, 11 ≠ 10 (a bullet under `## When a rule fails`) | **red**, 12 ≠ 11 (a bullet under "What this example deliberately does not show") |
| (b) one counted block deleted | **red**, 9 ≠ 10 (`### The key set is not reactive`, covered) | **red**, 10 ≠ 11 (§ 8) |
| (c) block added outside the count | green (a ` ```ts ` block just before the `/reactive` H2, and an indented ` ```html ` block inside the range) | green (a ` ```json ` block) |

In every red run only the targeted count went red, and the `/signals` counts stayed green in each
`/reactive` probe. Where a case executes the deleted block, as in `eval-core`'s `EvalHooks` case,
`/signals`' two Reuse cases and its asymmetry case, `/reactive`'s key-set case and the worked
example's §§ 4–8 case, that case stayed green. That measures this entry's premise directly.

¹ Run before `/reactive` was gated. The first of those two blocks now sits inside `/reactive`'s
range and would redden `README_REACTIVE_TS_BLOCKS`, which is correct: it is the last section before
`## Signal Forms — /signals`.

---

**The entry as it stood:**

Each `readme-examples.spec.ts` opens with a docblock asserting how many fenced blocks its README
holds and which case covers each. The number is **hand-transcribed**, and nothing compares it to
the file. `eval-core`'s has now been wrong twice — the plan's "8" and step 2's corrected "11", both
short by the indented fence inside the `onHookError` bullet — and corrected three times, step 6's
raise from 12 to 14 being the third.

The failure is quiet in exactly the way the gates track was built to prevent: a block added to a
README without a case still leaves a green suite and a docblock claiming full coverage, which is
[F3](#f3)'s own motivating shape one layer over. `grep -c '```javascript'` is the whole measurement.

**Distinct from [F10](#f10) and [F11](#f11)**, which bound what the *drift* gate sees. This one is
about the *execution* gate ([F4](#f4)) and is not covered by either: F10 is about symbols named but
not imported, F11 about the specifier a gated block may import from, and neither counts blocks.

**What it would take**: scan each gated README for its fence count and assert it against a constant
the spec already states, so the count moves deliberately. The root `README.md` stays out — it was
assessed and dropped by [F4](#f4), and 0 of its 11 blocks are runnable as printed.

**Re-measured 2026-09-16 and both counts are correct** — `eval-core`'s docblock claims 14
`javascript` blocks and the README holds 14 (13 at line start, plus the indented `onHookError`
fence a `^```` scan misses); `eval-signals`' claims 9 `ts` and 2 `sh` and the README holds 9 and 2.
**That is this entry's premise holding, not the gap closing.** Nothing was added that compares
either number to its file: the fence-reading specs in the repository —
`export-list.spec.ts` and `public-api.spec.ts`, in all three packages — read their READMEs for
symbol drift and count no blocks. The counts are correct today because someone re-ran them today,
which is the same standing this entry's numbers had the last two times they were right and then
silently were not. Dated because "correct" with no date reads as "fixed" to the next reader, and
[F7](#f7) is what that costs: a claim nobody re-ran travelled through twelve summaries and had to
have its locus corrected out from under it.

<a id="f15"></a>
## F15 — The downstream peer ranges exclude `eval-core` 0.6.0 — **Retired, fixed**

**Package** signals, forms · **Kind** fix (release coordination) · **Status** **Retired — fixed
by the 0.6.0 release preparation, 2026-09-26**; released the same day in `eval-signals` 0.1.3
and `eval-forms` 0.2.3, tagged f26f987. Recorded
2026-09-23 by the [A12](#a12) replay

**Fixed.** Both ranges widened to `">=0.3.0 <0.7.0"` in the same commit that bumps `eval-core` to
0.6.0, and **both downstream packages bumped**: `eval-signals` **0.1.3**, `eval-forms` **0.2.3**.
That settles the question this entry left open, and 0.5.0's precedent settled it the same way. A
widening without a bump would pass the workspace gate, but it would leave consumers on
`eval-signals` 0.1.2 and `eval-forms` 0.2.2, whose published manifests declare `<0.6.0` and
exclude the new `eval-core`. So publishing `eval-core` 0.6.0 forces both patches. `eval-signals`
0.1.3 also carries two JSDoc corrections that ship in its `.d.ts`. `eval-forms` 0.2.3 carries the
range alone. The lower bound stays `>=0.3.0`, for [F12](#f12)'s reason.

Both packages' READMEs quoted the range too, and both still said `<0.5.0`, because 0.1.2 and
0.2.2 widened the manifests and not the READMEs. That is [F14](#f14)'s class again. The same
commit brings both to `<0.7.0`.

The lint failure this entry predicted was not reproduced: the widening went in with the bump, so
no commit ever held the failing state.

---

**The entry as it stood:**

`modules/eval-signals/package.json` and `modules/eval-forms/package.json` both declare
`"@zvenigora/ng-eval-core": ">=0.3.0 <0.6.0"`. The A12 fix adds four published symbols to
`eval-core` (`CHANGELOG.md`, `[Unreleased]`). The repository has never shipped API in a patch, so
that fix ships in **0.6.0**, and both ranges exclude 0.6.0.

**This is [F12](#f12)'s shape, and the failure will look the same.** `@nx/dependency-checks` is
`'error'` in all three projects' `eslint.config.mjs`. At the moment `modules/eval-core/package.json`
reads `0.6.0`, it fails `eval-signals:lint` and `eval-forms:lint` with *"The version specifier does
not contain the installed version"*. **No green state exists between the bump and the widening**,
and `CONTRIBUTING.md` requires a green lint before any commit. F12 measured this exact case: its
second table sets `eval-core` to an inadmissible `0.6.0` and records both downstream projects
failing, naming `0.6.0`. That table measured the `<0.5.0` ranges of the time. This entry has not
re-measured against `<0.6.0`, because doing so means editing a manifest.

**The fix.** Widen both ranges to `>=0.3.0 <0.7.0`, **in the same commit as the bump or in an
earlier one**. Before the bump the widening is harmless: 0.5.0 falls within both the old range and
the new. After the bump it is required. 0.5.0 followed this pattern: `eval-signals` 0.1.2 and
`eval-forms` 0.2.2 widened in the same change as the bump.

**`nx run-many -t lint` is what catches it.** That gate is reliable now and was not in F12's time.
F12 found the failure only under `--skip-nx-cache`, because `lint`'s cache key did not cover a
sibling project's manifest. F12 then added `"^production"` to `nx.json`'s `lint` inputs, so a
cached run now misses and re-lints when `eval-core`'s `package.json` changes. **CI does not catch
it**, because CI runs no `lint` target ([`CLAUDE.md`](../CLAUDE.md), § Commands). The local
`run-many` gate is the only one.

**Not settled here: whether the widening bumps the two downstream packages.** Both have been done,
and each has its own evidence:

- **Widen without a bump.** Done 2026-09-20: both ranges went to `>=0.3.0 <0.7.0` with
  `eval-core` at 0.6.0, neither downstream version moved, and `nx run-many -t lint test build`
  passed for all three projects without the cache. The argument: a widening forced by another
  package's bump is not worth a release on its own. What it shows is that the workspace gate
  accepts it, not that consumers are served by it.
- **Bump both.** [F12](#f12)'s fix shipped patch releases 0.1.1 and 0.2.1, tagged 2026-09-16.
  That is the only one of the two that has actually been published.

That choice belongs to whoever runs the release.

*Recorded*: this entry; `docs/trace2/step-3.md` § "Left for the release", which is where it was
noted first and where a release would not look.
*Verified*: both manifests read 2026-09-23, `>=0.3.0 <0.6.0`; `@nx/dependency-checks` is
`'error'` in `modules/eval-signals/eslint.config.mjs` and `modules/eval-forms/eslint.config.mjs`;
`nx.json`'s `lint` inputs include `"^production"`. The lint failure itself is inferred from
F12's measurement, not reproduced here.

<a id="f18"></a>
## F18 — `eval-signal.ts` line citations in `eval-forms` comments and completed plans are stale

**Package** forms, repo · **Kind** docs · **Status** **Retired — fixed 2026-10-10** in live source;
completed records kept as written, per `CLAUDE.md`. Was Open

*Fixed* 2026-10-10. The three live citations name the construct rather than a line, each read at
the commit that wrote it and checked against `eval-signal.ts` as it is now:

| Site | Cited | At | Now |
| ---- | ----- | -- | --- |
| `reactive/src/lib/field-schema.ts`, `destroy` | `:408-414` | 9fd548d | `createEvalSignal`'s `destroyRef.onDestroy` wrapper, which clears its handle before calling `destroy()` |
| `reactive/src/lib/field-schema.ts`, the injector note | `:215-216` | 9fd548d | the `options.injector` arm of the injector / `inject()` fork that resolves `CompilerService` |
| `src/lib/error-policy.ts`, `applyErrorPolicy` | `:353` | 0a92553 | the `SignalContextWriteError` re-throw in the `catch` of `compute` |

`:215-216` was a line off at its own commit: those were the blank line and the `if` before
`options.injector.get(CompilerService)`. `applyErrorPolicy`'s JSDoc ships in the core entry point's
`.d.ts`, so `eval-forms`' CHANGELOG gains a line under [Unreleased].

The completed documents keep their twenty-one citations. They describe the code at the commits
that wrote them; `forms/phase-4-plan.md`'s table of what it relied on heads its column of them
"Verified at". `CLAUDE.md`'s paragraph on completed plans
now says that their line citations, and their summaries', refer to the code at those commits, and
that `git log` and `git show` reach it.

*Verified*: `git grep -n "eval-signal\.ts:[0-9]" -- modules` finds nothing. Over `docs/` it finds
26 lines, identical in file, line and text to HEAD's: these twenty-one, and the Phase 5 plan's five.
The built `.d.ts` files against HEAD's build: `/reactive`'s and `/signals`' byte-identical, the core
entry point's differing in `applyErrorPolicy`'s comment only.

**The entry as it stood:**

Twenty-four citations of `eval-signal.ts` by line number sit outside the Phase 5 plan: three in
`eval-forms` source comments (`reactive/src/lib/field-schema.ts`, `src/lib/error-policy.ts`) and
twenty-one in completed documents (`a8/step-2-plan.md`, `forms/phase-4-plan.md`,
`forms/phase-6-plan.md`, `gates/step-3-summary.md`, `statements/phase-2-plan.md`). Some were stale
before Phase 5 step 2; that step's move of `respellRoots` and the `eval.hooks` conflict check into
`track-dependencies.ts` shifted the rest. The doc-links gate resolves a link's file and `#anchor`,
never a line number, so none of this turns it red.

The Phase 5 plan's own five citations were remapped by that step (its Revision 3).

*Recorded*: this entry. Opened 2026-10-08 by Phase 5 step 2.
*Verified*: raised 2026-10-08 by Phase 5 step 2's code review; counted the same day with
`git grep -n "eval-signal\.ts:[0-9]"` over `modules/eval-forms` and `docs/`, the Phase 5 plan
excluded. Not checked citation by citation.

---

# Retired

Kept with their reasons. A retired entry tells the next reader the question was asked and answered.

<a id="r1"></a>
## R1 — `ASYNC_HOOK_MESSAGE`'s dangling `{@link}` — **Retired, fixed**

`eval-hooks.ts:37` carries an `{@link ASYNC_HOOK_MESSAGE}` that did not resolve for consumers because
the symbol was not exported. Carried as open through three side-effects step summaries, assigned to
Phase 1 step 6.

**Fixed.** `ASYNC_HOOK_MESSAGE` is exported from
[`eval/public-api.ts:12`](../modules/eval-core/src/lib/internal/classes/eval/public-api.ts#L12) and
reaches `src/public-api.ts` through the barrel. Verified 2026-09-06.

<a id="r2"></a>
## R2 — `model-source.spec.ts`'s "registrars are stubs" comment — **Retired, fixed**

A comment at `model-source.spec.ts:76-77` said "this step's registrars are stubs" in the present
tense — false from Phase 6 step 4 onward, and false for all three registrars after step 5. Deferred by
step 5 **into step 6's file list** rather than fixed in place, on the disposition that the next step to
work in the area owes the comment.

**Fixed.** Step 6 did it; no occurrence of `stub` remains in that file. Verified 2026-09-06.

Worth keeping as a record because it is the deferral pattern that *worked*: handed to a named step
whose file list already included the file, rather than to a phase.

<a id="r3"></a>
## R3 — `eval-core` missing its `release.version` blocks — **Retired, superseded**

Phase 3 step 6 decided deliberately that `eval-signals` would keep its `release.version` and
`nx-release-publish` config while `eval-core` was left alone. **The circumstance that decision rested
on is gone**, and it was not overturned on review.

Leaving `eval-core` without a `release.version` block was sound while the workspace versioned
**fixed**: a fixed group resolves one current version for every project and overrides each project's
own resolution, so `eval-core`'s resolver was never consulted for anything that survived.

Independent versioning removed the mask, and the divergence became three live behaviours:
`eval-core` read its version from `modules/eval-core/package.json` instead of its `eval-core@0.3.0`
tag; it wrote bumps into that **tracked source** manifest while its siblings wrote into gitignored
`dist/` ones; and `nx-release-publish` fell back to the project root, so publishing would have handed
npm `modules/eval-core` — source, with no build output in it.

**All three projects now carry the same blocks** (`currentVersionResolver: "git-tag"`,
`fallbackCurrentVersionResolver: "disk"`, `manifestRootsToUpdate: ["dist/{projectRoot}"]`, and
`nx-release-publish` with `packageRoot: "dist/{projectRoot}"`). Verified 2026-09-06.

The **CI test configuration** half of that step-6 divergence is untouched by this and is [F1](#f1).

<a id="r4"></a>
## R4 — Two false cross-references asserting [A8](#a8) was tracked — **Retired, corrected**

Two places stated that `EvalService._activeStates` was already recorded in `ROADMAP.md`'s deferred
defects. It never was, in any revision.

- [`signals/step-4-summary.md` § 5.2](signals/step-4-summary.md) — "Pre-existing `eval-core`, already
  in `ROADMAP.md`'s deferred defects."
- `eval-signal.memory.spec.ts:99` — a comment citing `(ROADMAP.md, "Deferred defects")` beside
  the assertion that pins the behaviour. *(No longer linked. The line had already drifted, and
  [A8](#a8)'s step 2 replaced that case, comment and all, on 2026-09-25.)*

Six further documents — every `docs/forms/step-*-summary.md` § 5.3 tail — carried the item forward
without repeating the claim, which is why the item stayed visible while remaining untracked.

**Corrected 2026-09-06**: both sites now point at `docs/backlog.md`, [A8](#a8). Retired here rather
than deleted because the failure mode is the reason this file exists, and the next person tempted to
write "already tracked in X" without opening X should be able to read what it cost.
