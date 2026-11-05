# A48–A51, A55 and F29 — member reads and writes that miss the data, and a getter's throw (`@zvenigora/ng-eval-core` 0.16.0)

**Date**: November 3, 2026
**Revision**: 2 — step 2, A55 and A48 fixed: § 3.1's CHANGELOG heading corrected to `### Breaking`,
step 1's count corrected to 30, and § 8 q1 decided (§ 4, Step 2). Revision 1 — step 1, this plan and
its records, with its five code reviews folded in before the commit (§ 4.1).

Four `eval-core` entries opened by the [A45 plan](../a45/plan.md) and one found measuring them:
[A48](../backlog-retired.md#a48), a `caseInsensitive` read that calls a prototype accessor twice;
[A49](../backlog.md#a49), the context branch calling a context getter or a lookup where JavaScript
reads less; [A50](../backlog.md#a50), a write through `this` that lands beside a `Registry`'s map;
[A51](../backlog.md#a51), a write to an `EvalScope` held as a value that lands on the instance; and
[A55](../backlog-retired.md#a55), new, `safeGetProperty` swallowing a getter's throw. This plan fixes A48,
A50, A51 and A55, decides A49 a documented limit, and adds [F29](../backlog.md#f29)'s two `eval-forms`
cases. The fixes change what an expression returns, throws and writes, so they ship as `eval-core`
0.16.0, and `eval-signals` 0.9.0 and `eval-forms` 0.9.0 release in the same commit
([SR42](../standing-rules.md#sr42)). Measuring them found two README sentences false now, which step 1
corrects ([SR31](../standing-rules.md#sr31)), and opens [A56](../backlog.md#a56),
[A57](../backlog.md#a57) and [A58](../backlog.md#a58), which this plan pins and does not fix: A56 and
A58 are the defects behind the two sentences, and A57 records what the `caseInsensitive` copy holds.

This revision replaces a step 1 written on another model and reverted (d507440, reverted by 3bbc296).
Nothing of it is carried over except what § 1.3 re-measured.

## 0. Rules the plan adds

- **P-1. A new write-path refusal says where it runs**, relative to `EvalContext.checkMemberWrite`
  and to the right side, and is measured through `eval-signals`, whose signal-context policy refuses
  first. A refusal that runs earlier turns `SignalContextWriteError`, which bypasses `onError`, into a
  plain `Error` that `onError` handles (§ 1.4, finding 9). *Red*: the `eval-signals` rows of step 6.
- **P-2. A count is named with the file behind it.** The prototype and its supplements have five row
  scripts; a figure such as "P50 moves 12 rows" is `rows.mjs`'s alone, and the others move more
  (§ 1.3). *Red*:
  nothing — held by review.
- **P-3. A figure in this plan is read from a pinned file**, named with its hash where it is first
  cited, and "the pinned file wins" governs measured facts only; a decision in § 2 is re-decided here,
  not inherited from the prototype's notes. *Red*: nothing — held by review.

## 1. Current state

### 1.1 What exists today

- **Reads.** `safeGetProperty` (`prototype-pollution-guard.ts`) reads `target[key]` inside a `try`
  whose `catch` returns `undefined`, so a getter's or a proxy trap's throw is swallowed. A null-ish
  target returns `undefined` before the read. Under `caseInsensitive`, `evaluateMember`
  (`member-expression.ts`) tests a key no own property matches by reading it, `obj[key]`, and then reads
  the matched key, so an inherited accessor's exact spelling is read twice.
- **The context branch.** For `this.k`, `evaluateMember` reads the value through
  `EvalContext.get` and the receiver through `EvalContext.getThis`, which tests the original by
  reading the value and then each prior scope by its `get`, answering a global scope's `thisArg`.
  `resolveMemberTarget`, the write resolver, answers `getThis`'s receiver too. So `this.k = v` writes to
  the receiver, and `this.k` reads what `k` reads.
- **Writes.** `assignment-expression.ts` resolves the target, evaluates the right side, asks
  `consultMemberWrite` (the host's `checkMemberWrite`), then calls `safeSetProperty`, in that order
  (§ 1.2, P51). `update-expression.ts` does the same without a right side. `safeSetProperty` refuses a
  non-object, an `EvalContext` target (`refuseContextWrite`), a dangerous name and a built-in
  constructor or prototype, then assigns. A `Registry`
  target, the `caseInsensitive` copy of a plain context or a host's, is assigned an own JavaScript
  property; the read path reads it through `get`.
- **The copy.** Under `caseInsensitive`, `fromContext` (`classes/common/context.ts`) copies a plain
  context with `Registry.fromObject`, that is `Object.entries`: own enumerable string keys, each value
  read once.
- **What pins it.** `assignment-target.spec.ts`, the A45 characterisation, holds 11 cases "held under"
  A48, A50 or A51 that the fixes change (§ 1.4, finding 10), and rows held under A49 that a documented
  limit re-marks. No row pins A55, A56 or A57.

### 1.2 The prototypes

Pinned under `D:\repo.2026\ng-eval-base\a48-prototype\` ([SR32](../standing-rules.md#sr32)), with its
`SHA256SUMS.txt` (45 lines), and seven supplements beside it: `a48-supplement-1\` (9 lines), and
`a48-supplement-2\` to `a48-supplement-7\`, step 1's (§ 1.3). Each zip unpacks into a folder of its own
name, so the files sit one level down. Each patch applies alone at 9bf1bc8, whose tree is 3bbc296's.

| Patch | SHA-256 | Entry | The change |
| :--- | :--- | :--- | :--- |
| P55 | `D40D6411…35D17D59` | A55 | `safeGetProperty` loses its `try`/`catch`; the null-ish return stays |
| P48 | `53142227…D4F9A5ED` | A48 | The `caseInsensitive` branch tests the key as spelled with `key in obj`, as the `=` resolver does, where it read `obj[key]` |
| P50 | `7CEEF596…CB7EB76B` | A50 | `writeMemberTarget(st, object, key, value)` in `member-expression.ts`: a `Registry` that is `st.context.original` is written through `Registry.set`, a dangerous name refused first; anything else goes to `safeSetProperty`. The assignment and update visitors call it |
| P51 | `4ECCF8D7…9DAA75BD` | A51 | `safeSetProperty` refuses an `EvalScope` target, `Write to an evaluation scope is blocked`, after `refuseContextWrite` |
| PALL-4 | `29B9367D…B6981591` | all four | P55, P48, P50 and P51 stacked, in that order |

P51 refuses in `safeSetProperty`, so after the target, the right side and `consultMemberWrite`
(`assignment-expression.ts` at 9bf1bc8: the target at line 72, the right side at 95,
`consultMemberWrite` at 130, `safeSetProperty` at 134). `superseded/P51-early.patch` also refused in the
visitor before the right side; it ran ahead of the policy (finding 9) and is not used.

### 1.3 Measurements run for this plan

Production bundles (fesm2022) of eval-core at 9bf1bc8 and with each patch, built in the Claude-side
sandbox, Linux, Node 22 for rows and suites. The six bundles are byte-identical across two rebuilds,
2026-11-02 and 2026-11-03: base `B8BAED38…AFDA24E4`, P55 `83CE6B9A…23EA71D2`, P48 `8B220209…0725BAB3`,
P50 `5377F0DE…58CFF909`, P51 `6D9150D9…DFE4A0FB`, PALL-4 `FA929286…BEBDC8BC` (supplement 1,
`results/bundles.sha256`).

| Script | Rows | Where | What it measures | Rows each patch moves |
| :--- | ---: | :--- | :--- | :--- |
| `rows.mjs` (`A8E8D235…0EEE82AA`) | 224 | prototype | A55, A48, A49, A50, A51, both case modes | P55 19, P48 15, P50 12, P51 38; PALL-4 78 |
| `a56.mjs` (`2903F53C…218FD253`) | 42 | prototype | A56, the copy's getter count, A57 | P50 and PALL-4 2: `A56 ci pushed scope (k => this.k = 5)(1)` and `(k => (this.k = 5, k))(1)` |
| `rows-s1.mjs` | 46 | supplement 1 | A56's conditions, an `EvalScope`'s reads, the identifier write over a host `Registry` | P50 and PALL-4 1: `S1 ci caller holds k, global+thisArg: this.k = 2` |
| `s2.mjs` | 44 | supplement 2 | step 1's README sentences (A56, A57), and P50's host-`Registry` rows | PALL-4 3: `S2 ci A57 a write to a name: this.k = 5`, and `S2 cs`/`ci P50 host Registry: this.k = 5` |
| `s3.mjs` | 26 | supplement 3 | step 1's revision after its review: a `k` the expression binds (`bound`), "holds" as a value other than `undefined` (`holds`), a `Registry` as the context or behind a prior scope (`shape`) | P50 and PALL-4 2: `S3 cs`/`ci shape, host Registry context with k` |
| `s4.mjs` | 22 | supplement 4 | step 1's second revision: a write through `this` over the copy (`copy-this`), a scope the caller pushes (`pushed`), a `const` binding (`const`), a destructuring read of a throwing accessor (`destructure`), a namespaced scope (`namespace`), names that differ only in case (`collapse`) | P55 7, P48 1, P50 2, P51 0; PALL-4 9: the `destructure` rows throw, and `ci copy-this` writes into the map |
| `s5.mjs` | 42 | supplement 5 | step 1's third revision: an identifier write with a pushed scope (`pushed-write`), writes through `this` and compound writes over the copy (`this-write`), an object with a null prototype (`null-proto`), names spelled otherwise under `caseInsensitive` (`variant`) | none |
| `s6.mjs` | 32 | supplement 6 | step 1's fourth revision: a `thisArg` the context's reads also reach (`thisarg-read`), a null, frozen or number `thisArg` (`thisarg-odd`), and what `EvalContext.fromContext` copies (`copies`) | none |
| `s7.mjs` | 22 | supplement 7 | step 1's fifth revision: an object made in another realm as the context (`realm`), and the caller's object reaching an evaluation a second way, pushed or as a global scope's `thisArg` (`alias`) | none |

Each script's output on each bundle is pinned in its folder's `results/`. Supplement 2's
`rows-s1.mjs` honours `REPO_PKG`, where supplement 1's hardcoded `/tmp/ng-eval/package.json`; its output
on all six bundles is byte-identical to supplement 1's. The suites, per patch alone and stacked, are
in the prototype's `results/suite-*.log`; the downstream rows in `results/downstream.txt`
(`2B3341C9…990EA054`), from two throwaway specs run in `eval-signals` and `eval-forms` and deleted.

Step 1's probes are patches against 3bbc296: P1-1 to P1-9 in supplement 2, P1-1 to P1-16 in
supplement 3, after step 1's first code review, P1-1 to P1-17 in supplement 4, after its second, and
P1-1 to P1-20 in supplement 5, after its third; each supplement's earlier probes are byte-identical to
the one before's. Supplement 5 also holds every probe's red set with step 1's final rows in place
(step 1's *Probes* table); supplements 2 to 4's red sets are superseded. Supplement 6, after the fourth
review, holds step 1's patch and `s6.mjs`, and no new probe: the fourth revision changes no row and no
code. Supplement 7, after the fifth review, adds Q10, so it carries the twenty probes byte-identical
from supplement 5 and re-measures every red set with Q10 in place, in its `results/red-P1-*.txt`, which
supersede supplement 5's. Supplements 2 to 6's step 1 patches are superseded.

### 1.4 Findings

1. **A55, new.** `safeGetProperty` swallows any throw and returns `undefined` (`rows-base.txt`, the
   `A55` rows). Case-sensitive, an own or inherited throwing accessor reads `undefined`; `x.t += 1` and
   `x.t++` fail later, at the write, `Failed to set property "t": …`; `x.t || 1` is `1`;
   `let {t} = x` swallows; a non-`Error` throw too. Under `caseInsensitive` an own accessor read as a
   member, `x.t`, already throws, read directly after the cache match, while an inherited one is read
   twice and swallowed; a destructuring read, `let {t} = x; 1`, swallows in both modes, own or
   inherited, the getter called once (`s4.mjs`, `destructure`);
   its case variant `x.T` is read once and throws. A revoked proxy already throws, at `getPrototypeOf`,
   outside the catch. A null-ish target reads `undefined` by the early return, which stays. P55 alone
   turns no suite case red, 3303 of 3303 (`suite-P55-eval-core.log`), so characterisation comes first
   ([SR27](../standing-rules.md#sr27)). P48 alone turns the inherited `caseInsensitive` rows from
   swallowed to thrown as well, since the second read was the swallowed one, so A55 and A48 land in
   one step.
2. **A48.** Under `caseInsensitive` an inherited accessor's exact spelling is read twice by `c.g`,
   `c.g++`, `c.g += 1`, `c.g ||= 5` and `` `${c.g}` ``; `c.G` once. Over a prototype holding
   `foo: undefined` and an accessor `Foo`, the read answers `Foo`'s value where `=` writes `foo`. A
   proxy's traps see `get, get` for a missing key, and so does a get-only proxy for a present one.
   After P48 every one is read once, and the proxy with a `has` trap sees **`has:zz, get:zz`**
   (`A48 ci proxy px.zz`), a trap call it did not see before, which the CHANGELOG states.
3. **A50 is wider than recorded** ([SR4](../standing-rules.md#sr4)). A host `Registry` passed as the
   context shows the shape case-sensitively too: `this.k = 5` sets an own `k` on the instance, a later
   `k` reads 1 and the map keeps 1 (`A50 cs hostRegistry`). The identifier write `k = 5` writes the map
   in both modes (`rows-s1`, `A50-ident`). A `Registry` held as a value is consistent with itself
   (`A50 registry-as-value`). After P50, under `caseInsensitive`, a write through `this` stays in the
   walk's copy: on a plain context `this.k = 5` persists across calls on the same `EvalContext` and
   never reaches the caller's object (`A50 ci plain`, PALL-4: later 5, caller 1), as the identifier
   write already did at 9bf1bc8 (`A49 ci undefined-key k = 1`: the caller's `k` unset, the store 1).
4. **A51.** An `EvalScope` held as a value is sealed for reads (`rows-s1`, `A51-read`): `ns.set` and
   `ns.get` cannot be called, and `ns.context`, `ns._context` and `ns.type` read `undefined`; a
   namespaced scope's `ns.n` is its context object. Writes are the leak (`rows.mjs`, `A51`): `ns.k = 5`
   lands on the instance, `ns._context = 9` breaks later reads, and `ns.k = f()` calls `f`. After P51
   every write to the instance is refused after the right side (`f` still called) and after the policy;
   `ns.n.k = 7` still writes, into the context object; `ns.k ||= 5` with `k` set writes nothing and is
   not refused.
5. **A49.** Case-sensitively, the context branch calls a getter on the context twice for `this.g`, `this.g += 1` and
   `this.g++`, and once for `this.g = 5`; a `caseInsensitive` lookup is called twice for `this.x` and
   `x += 1`, and once for `x = 1` (`rows.mjs`, `A49`). Under `caseInsensitive` a plain context's
   enumerable getter is read once, at the copy (`a56.mjs`, `copy ci enumerable getter`). No patch
   changes these.
6. **A56, new.** `this.k = v` writes to `getThis`'s answer, while `this.k` reads what `k` reads
   (`a56.mjs`; `rows-s1`; `s2.mjs`; `s3.mjs`). "Holds" is a value other than `undefined`, for the
   original and a prior scope alike (`s3.mjs`, `holds`). When the first prior scope that holds `k` is
   global and has a `thisArg`, the write goes to `thisArg`. `k` and `this.k` read a `k` the expression
   binds itself with `let`, `const` or an arrow parameter, or that a scope the caller pushes holds,
   before the scope's, and the write reaches neither (`s3.mjs`, `bound`; `s4.mjs`, `const` and
   `pushed`). What they read after the write depends on what else reaches `thisArg`: with the caller's
   own object as `thisArg` they read `2` case-sensitively, and `10` under `caseInsensitive`, whose reads
   go to the copy (`s6.mjs`, `thisarg-read`); a host `Registry` as the context and a `Registry`-backed prior scope behave alike
   (`s3.mjs`, `shape`); a namespaced prior scope answers its own name the same way (`s4.mjs`,
   `namespace`); when that scope has no `thisArg`, the write is refused, even if another scope has one. If the caller's object
   holds `k`, the write lands there case-sensitively, and under `caseInsensitive` on the copy (finding
   3's shape, which P50 moves into the copy's map). In `(k => (this.k = 5, k))(1)` the read sees the
   parameter while the write goes to the original's `k`. Over `{ k: undefined }`, `this.k = 1` is
   refused while `k = 1` writes. **The README's `### Scopes` sentence "Only the call's receiver
   changes" is false now.**
7. **A57, new.** The `caseInsensitive` copy keeps own enumerable string-keyed properties only, each read
   once, when it is made (`s2.mjs`, the `A57` rows): a class instance's accessor and method, a
   non-enumerable property and a symbol-keyed one are not in it; an own field is; names that differ only
   in case collapse into one, the last listed winning (`s4.mjs`, `collapse`). An assignment to one of
   its names does not write back from the copy to the caller's object: an identifier write changes the
   copy, or a binding the expression declares, with `let` or an arrow parameter (`s3.mjs`, `bound`), or
   a scope the caller pushes that holds the name (`s5.mjs`, `pushed-write`); a write through `this`
   lands beside the copy's map (finding 3; `s4.mjs`, `copy-this`). The caller's object is written when
   it reaches the evaluation a second way: pushed with `EvalContext.push` without `caseInsensitive`
   (with it, the push makes a second copy), or as a global scope's `thisArg` (`s7.mjs`, `alias`). The
   copy is shallow, so `user.name = "x"` writes into the caller's own `user`. A `Registry` and an
   `EvalContext` are taken as they are (`s6.mjs`, `copies`). The README promises none of this
   ([SR44](../standing-rules.md#sr44)); its "copies the object into a case-insensitive store" is false
   only for finding 12's objects.
8. **Downstream** (`downstream.txt`). `eval-signals`' default `onError: 'throw'` now throws a getter's
   error where it read `undefined`, and under `caseInsensitive` `c.g + 1` calls the getter once where it
   called it twice. Its signal-context write policy refuses `this.k = 5` and `ns.k = 5` first, with
   `SignalContextWriteError`, before and after. `eval-forms` `/reactive`: the default policy reads `""`
   before and after; `'throw'` now throws the getter's error, and a function policy now sees it. So
   both downstream packages change behaviour and release as minors.
9. **The refusal's position.** P51-early, a refusal before the right side, ran ahead of the policy and
   turned `eval-signals`' `SignalContextWriteError` into a plain `Error` handled by `onError`
   (`downstream.txt`, the superseded note). So the refusal sits in `safeSetProperty`, and P-1 is a rule.
10. **Suites.** P48 alone turns 3 `eval-core` cases red, P50 4, P51 4, PALL-4 11, each a row held under
    the entry the patch fixes and nothing else (`suite-PALL4-red.txt`, `C12A2C2E…18D99E45`).
    `eval-signals` 450 of 450 and `eval-forms` 386 of 386 on PALL-4. The two `assignment-target.spec.ts`
    C rows held under A50 under `caseInsensitive`, `this.g = 1` and `this.g += 1` over a context
    accessor, stay green under P50: the write goes to the copy, which is the decision that spec already
    names `design: a write into the caseInsensitive copy` for its identifier rows.
11. **Timing** (`timing/outcome.md`, rules `0AB4A775…664087F0`): two runs of PALL-4 against 9bf1bc8, both
    void by the A/A bound, `cs-inh` −3.11% in run 1 and `compound` −4.08% in run 2; no path met the
    regression test in either. The sandbox's noise floor is about ±4%. They decide nothing; step 7 times
    the final code under § 3.7's rule.
12. **A58, new** (step 1's third review, I-c; widened by its fifth, I-2). `fromContext` does not copy
    an object that is not an instance of this realm's `Object`, one with a null prototype or one made
    in another realm, and `eval-core` does not read one as the context in either mode: `k`, `this.k`
    and `K` read `undefined`, `k = 5` does not reach it, and `this.k = 5` is refused; held as a value,
    `d.k` reads it (`s5.mjs`, `null-proto`; `s7.mjs`, `realm`). The README's "copies the object into a
    case-insensitive store" is false for it now.

## 2. Decisions

- **D1. A55: the catch goes** (P55). A getter's or a proxy `get` trap's throw, read through
  `safeGetProperty`, reaches the caller, as in JavaScript, in both modes. The null-ish early return
  stays. A breaking change by behaviour. The `caseInsensitive` branch of `evaluateMember` keeps a
  `catch` of its own, around its test of the key and its search of the prototype's names, which
  swallows a proxy trap's throw there; § 8 q1, decided in step 2.
- **D2. A48: the `in` test** (P48), so the read tests presence as `=` already does: one read per
  access, the exact spelling first. A proxy's `has` trap is newly called; stated.
- **D3. A50: a `Registry` that is the context's original is written through its map**, in both modes,
  for a host's `Registry` and the `caseInsensitive` copy alike (P50). A `Registry` held as a value is
  unchanged. Under `caseInsensitive` the write stays in the copy, never reaching the caller's object
  (finding 3).
- **D4. A51: refused in `safeSetProperty`** (P51), after the policy and the right side, as P-1 asks;
  `ns.n.k = 7` still writes. Its message, `Write to an evaluation scope is blocked`, names its layer
  ([SR18](../standing-rules.md#sr18)).
- **D5. A49: a documented limit, no code.** How many times a context getter or a lookup is called is not
  part of the contract. A fix needs a presence test on `EvalContext`, a published class, for a cost no
  consumer has reported. The README's "Two kinds of read remain beyond JavaScript's" passage (three until step 2) states
  it, under [SR44](../standing-rules.md#sr44).
- **D6. A56, A57 and A58: opened, covered by step 1's rows, not fixed here.** A fix to any changes what
  a published path reads or writes (`getThis`'s answer as a write target, what the copy holds, what a
  context outside this realm's `Object` reads) and is its own decision. The README is corrected in step 1
  ([SR31](../standing-rules.md#sr31)), each claim witnessed ([SR21](../standing-rules.md#sr21)) and
  written as what every path keeps, leaving unpromised paths unstated
  ([SR44](../standing-rules.md#sr44)).
- **D7. Versions**: `eval-core` 0.16.0, `eval-signals` 0.9.0 and `eval-forms` 0.9.0, minors by
  behaviour, in one release commit ([SR42](../standing-rules.md#sr42)). The peer ranges become
  `>=0.16.0 <0.17.0` on core in both, and `>=0.9.0 <0.10.0` on `eval-signals` in `eval-forms`.
- **D8. F29 rides in step 6**, the step that moves `eval-forms`' rows.

## 3. Design

### 3.1 A55 and A48 (step 2)

`prototype-pollution-guard.ts` and `member-expression.ts` made to P55 and P48, their comments pointing
at `docs/backlog-retired.md` A55 and A48. The README's "Three kinds of read remain" passage loses its
third kind, the inherited getter under `caseInsensitive`; the CHANGELOG's `### Breaking` states the throw
and the proxy's `has` trap, as § 7 says and as 0.14.0 filed a getter's changed call count, and `### Fixed`
the double read. (Revision 1 said `### Changed`; corrected in step 2.) The characterisation includes the
destructuring read, own and inherited, in both modes (`s4.mjs`, `destructure`), and § 8 q1 is decided
before the gate.

### 3.2 A50 (step 3)

`writeMemberTarget` as P50, its comment pointing at `docs/backlog-retired.md` A50. Its dangerous-name
refusal stands in for `safeSetProperty`'s on the branch that bypasses it; both sit behind
`resolveMemberTarget`'s own refusals, so step 3 probes the layers as the A33 plan's P2-3 and P2-3b did.
The `assignment-target.spec.ts` rows held under A50 are rewritten to their measured outcomes, and the two
C rows that stay as they are are re-marked `design: a write into the caseInsensitive copy`.

### 3.3 A51 (step 4)

`safeSetProperty` as P51, its comment pointing at `docs/backlog-retired.md` A51.

### 3.4 A49 (step 5)

No code. The README passage and `EvalContext`'s `lookups` and `getThis` JSDoc state the limit as what
every path keeps ([SR44](../standing-rules.md#sr44)); the rows held under A49 are re-marked `design:`.

### 3.5 A56, A57 and A58: the README corrected (step 1)

Written to [SR44](../standing-rules.md#sr44): each sentence states what holds on every path it names,
and a path it does not promise is left unstated, not qualified. In `### Scopes`, the sentence "Only the
call's receiver changes: `cat` still evaluates to the scope's object, so `cat.num` reads it and
`cat.x = 1` writes to it." becomes:

> Through a namespace, only the call's receiver changes: `cat` still evaluates to the scope's object, so
> `cat.num` reads it and `cat.x = 1` writes to it.

A write through `this` is left unpromised: its rules are [A56](../backlog.md#a56)'s defect, recorded in
its entry and pinned by W1–W10, and every wording that stated them drew a counter-example (§ 4.1).

"…build the context with `EvalContext.fromContext(object, options)` instead, which copies the object
into a case-insensitive store." becomes:

> …build the context with `EvalContext.fromContext(object, options)` instead, which copies the object
> into a case-insensitive store, unless it is not an instance of this realm's `Object` (an object with a
> null prototype, or one made in another realm): such an object is not copied, and `eval-core` does not
> yet read it as the context, in either mode.

The sentence keeps its subject, the plain object of the sentence before it, and adds only A58's
exception, the one path on which it is false, named by its mechanism, `instanceof Object`, with both
shapes that fail it. What the copy holds, and where a write to one of its names goes, are left
unpromised: they are [A57](../backlog.md#a57)'s, recorded in its entry and pinned by Q1–Q8, and every
wording that stated them drew a counter-example (§ 4.1), the last a caller's object that reaches the
evaluation a second way.

Each claim has a row (step 1's *Claim → witness* table). The namespace sentence's contrast is W1, which
a wording covering `this` fails. The exception's rows are Q9, a null prototype, and Q10, another
realm, each with its contrast, the object read as a value.

### 3.6 Downstream and F29 (step 6)

Rows through each downstream surface for the defects this release fixes
([SR24](../standing-rules.md#sr24)), from `downstream.txt`'s measured shapes: `eval-signals`
`createEvalSignal` under `onError: 'throw'` and `'undefined'` for A55, both modes; its `caseInsensitive`
call count for A48; its signal-context refusal of `this.k = 5` and `ns.k = 5`, unchanged, for P-1; and
`eval-forms` `/reactive`'s three policies for A55. F29: two cases, one per adapter, a rule that does not
parse registered under a function policy, asserting the parse error's message, each probed by moving
that adapter's parse inside its policy (F29's *Fix*).

### 3.7 Timing (step 7), the rule stated before any run

Run Claude-side ([SR28](../standing-rules.md#sr28)): the sandbox, Linux, no performance cores, Node
26.4.0, one process at a time. A = the base bundle (`B8BAED38…`), A′ its byte copy, B the production
bundle of the tree after step 6. The prototype's harness and its seven paths and roles
(`timing/rules.md`): read, write, ci-inh and ci-proto decide; compound, cs-inh and ci-miss are reported.

- **24 rotations, path-major**: within a rotation each path runs A, A′ and B back to back, in that order
  in odd rotations and reversed in even ones. Per rotation and path the paired delta is (X − A) / A.
- **Regression on a path**: B's median paired delta above **+3%** with **at least 18 of 24** positive.
- **Void run**: the A/A control meets the regression test on any path, or its median exceeds ±3% on any
  path. A void run is repeated once; both are reported.
- **If both runs are void**, the release goes ahead only if no deciding path's B median exceeds **+5%**
  in either run.
- **A regression on a deciding path** stops the plan before the release: § 2 records the figure and the
  patch is re-designed or its cost accepted.
- **Memory arm**: none. No patch adds or changes a cache or retains anything per object or per
  evaluation: stated from the patches, not measured.

The rules file is written and hashed before the first run, and pinned with the runs.

## 4. Work breakdown

One step per session behind the `/step` gate. Gate counts at 3bbc296: `eval-core` 3303, `eval-signals`
450, `eval-forms` 386.

| Step | Subject | Files | Rows: `eval-core` / `eval-signals` / `eval-forms` | Ships in |
| :--- | :--- | :--- | :--- | :--- |
| 1 | This plan, its records, and the two README sentences | `docs/a48/plan.md` (new), `docs/README.md`, `docs/backlog.md`, `CLAUDE.md`, `.claude/skills/step/SKILL.md`; `modules/eval-core/README.md`, `CHANGELOG.md`, `eval.service.scope-this.spec.ts`, `eval.service.case-insesitive.spec.ts` | **+30** / 0 / 0 | the README and CHANGELOG in `eval-core` 0.16.0; the rest in no package |
| 2 | A55 and A48 | `prototype-pollution-guard.ts`, `member-expression.ts`, `member-read.spec.ts` (new), `assignment-target.spec.ts`, `eval.service.case-insesitive.spec.ts`, `README.md`, `CHANGELOG.md`, the register, `docs/README.md`, `docs/a45/plan.md`, `CLAUDE.md`, the skill, this document | **+86** / 0 / 0 | `eval-core` 0.16.0 |
| 3 | A50 | `member-expression.ts`, `assignment-expression.ts`, `update-expression.ts`, their specs, `assignment-target.spec.ts`, `CHANGELOG.md`, the register, the skill, this document | measured in the step | `eval-core` 0.16.0 |
| 4 | A51 | `prototype-pollution-guard.ts`, its spec, `assignment-target.spec.ts`, `CHANGELOG.md`, the register, the skill, this document | measured in the step | `eval-core` 0.16.0 |
| 5 | A49, a documented limit | `README.md`, `eval-context.ts`' JSDoc, `assignment-target.spec.ts`' marks, a witness spec, `CHANGELOG.md`, the register, the skill, this document | measured in the step | `eval-core` 0.16.0 |
| 6 | Downstream rows and F29 | `eval-signals` and `eval-forms` specs, the register, the skill, this document | 0 / measured / measured | no package |
| 7 | The timing record | this document, the skill | 0 / 0 / 0 | no package |
| 8 | The release commit | the three `package.json`, the three `CHANGELOG.md`, the register, `CLAUDE.md`, the skill, this document | 0 / 0 / 0 | the release |
| 9 | The post-publish record | the register, `CLAUDE.md`, the tags, the skill, this document | 0 / 0 / 0 | no package |
| 10 | Retrospect | this document's § 9 and § 10, `docs/standing-rules.md` if a rule stands, `CLAUDE.md`, `docs/README.md`, the register, the skill | 0 / 0 / 0 | no package |

A row count left to its step is fixed before that step's gate, in its prompt, from measurements pinned
for it, and the step records it here ([SR4](../standing-rules.md#sr4)).

### Step 1 — This plan, its records, and the two README sentences

- **Place, don't draft.** The step's whole change is pinned as `step-1/step-1.patch` in supplement 7,
  its SHA-256 given in the prompt. Each hunk is made with Edit or Write
  ([SR36](../standing-rules.md#sr36)), and then, everything staged, the diff that supplement 7's
  `step-1/staged-diff.sh` prints, the staged diff in one fixed form whatever the local git config,
  hashes to the pinned patch's SHA-256.
- **The records.** This document; `docs/README.md`'s Active plan holds this plan's row in place of
  "None"; `docs/backlog.md`: A55 to A58 opened after A54, with their index rows; A48, A50, A51, A55 and
  F29 "Scheduled — the A48 plan, step N", A49 "Scheduled — … step 5, to be decided a documented limit
  (its D5)"; A50's entry corrected for the host `Registry` (finding 3); Work in flight names this plan
  as active; an *Unreleased* history row, 16 live before, 4 opened, 0 closed, 20 after, and the totals
  row 42, 77, 99, 20. `CLAUDE.md`'s two "No plan is active" sentences; the skill retargeted.
- **The README** (§ 3.5) and its `[Unreleased]` `### Changed` line; the spec comment in
  `eval.service.scope-this.spec.ts` that said the receiver changes "at the call and nowhere else",
  scoped to the namespace path ([SR31](../standing-rules.md#sr31)).
- **Witness rows** ([SR21](../standing-rules.md#sr21)), 30 cases, green on 3bbc296's code, since they
  pin today's behaviour; measured first on the base bundle by `s2.mjs` to `s5.mjs` and `s7.mjs`:
  - In `eval.service.scope-this.spec.ts`, A56, in both case modes (20 cases), each with its own
    fixture ([SR43](../standing-rules.md#sr43)): W1 `this.k = 2` writes `thisArg.k`, the scope's `k`
    still 10; W2 `k`, then `this.k`, read the scope's 10, not `thisArg`'s; W3 the same after the write;
    W4, the contrast, the caller's object holds `k`: `thisArg` untouched, the scope's `k` 10, and the
    caller's `k` 2 case-sensitively, 1 under `caseInsensitive` (the copy); W5, the second of two global
    scopes holds `k` and has the `thisArg`, written; W6, the first has the `thisArg` and the second
    holds `k`, refused, `Write to the evaluation context is blocked for security reasons`; W7, the
    contrast, a `k` the expression binds with `let`, `const` or an arrow parameter is what `this.k`
    reads, 1, while `thisArg.k` becomes 2 and the scope keeps 10; W8 a host `Registry` as the context,
    and a `Registry`-backed prior scope, alike ([SR19](../standing-rules.md#sr19)); W9 a `k` whose
    value is `undefined`, in the first prior scope or in the caller's object, is passed over; W10, the
    contrast, a scope the caller pushes with `EvalContext.push`: `k` and `this.k` read its `k`, while
    `this.k = 2` still writes `thisArg.k`. They pin A56's behaviour, in both modes; the README promises
    none of it.
  - In `eval.service.case-insesitive.spec.ts`, A57 and A58 (10 cases); Q2 to Q4 read the same fixture
    case-sensitively first, to show it holds what the copy leaves out
    ([SR17](../standing-rules.md#sr17)): Q1 an own enumerable getter read once, at the copy; Q2 a class
    instance's inherited accessor and method left out, its own field kept; Q3 a non-enumerable property
    left out; Q4 a symbol-keyed one left out, read as `this[s]`; Q5 the identifier assignment `k = 5`
    changes the copy and not the caller's object; Q6, the stated exception, `user.name = "x"` writes
    into the caller's own `user`; Q7, the contrast, under a `let` or an arrow parameter that binds `k`,
    `k = 5` changes the binding, and neither the copy nor the caller's object; Q8, the contrast, `k = 5`
    with a pushed scope that holds `k` changes that scope, the copy still 1 after `pop()`, and
    `this.k = 5`, `this.k += 5` and `k++` leave the caller's object as it was. Q1 to Q8 pin A57's
    behaviour; the README promises none of it. Q9, A58, an object with a null prototype is not copied
    and `k` and `this.k` read `undefined` in both modes, while held as a value, `d.k`, it reads 1; Q10,
    A58, the same for an object made in another realm by `vm.runInNewContext`, which first fails
    `instanceof Object`.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)), § 3.5's sentences:

  | Claim | Rows | Probes |
  | :--- | :--- | :--- |
  | through a namespace, only the call's receiver changes: `cat` still evaluates to the scope's object, `cat.num` reads it, `cat.x = 1` writes to it | `(a)`, `(d)`, and "should read a property from the scope's object" and "should write a property onto the scope's object", unchanged | held since the A7 fix, aec3a5b |
  | (the contrast: through `this`, a write goes to `thisArg`, so a wording covering `this` fails) | W1 | P1-1 |
  | `fromContext` copies the object into a case-insensitive store | Q1, and the existing `caseInsensitive` rows that build their context with it, unchanged | P1-6 |
  | unless it is not an instance of this realm's `Object`, a null prototype or another realm: not copied, and not read as the context, in either mode | Q9, Q10 | P1-18, P1-19 |

- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)), each a pinned patch
  against 3bbc296 in supplement 5, carried byte-identical into supplement 7, applied alone with its hash checked, every `eval-core` case read,
  reverted, and the tree checked clean ([SR32](../standing-rules.md#sr32)). Each predicted red set is
  measured with step 1's rows in place, Q10 among them, in supplement 7's `results/red-P1-*.txt`, the
  existing rows named in the same run; each probe's effect on the bundle is supplement 5's
  `results/s5-P1-*.txt`. P1-1 to P1-17
  are byte-identical to supplement 4's, and their existing rows' red sets equal supplement 4's. Every red
  set equals supplement 5's but P1-18's and P1-19's, which each add Q10.

  | Probe | The wrong implementation | Red, of 3333 | Step 1's rows | Existing rows |
  | :--- | :--- | ---: | :--- | :--- |
  | P1-1 | `getThis` answers a prior scope's own object, not its `thisArg` | 17 | W1, W3, W5–W10, both modes | `(f)`, the guarded view, since the scope's object is now the receiver |
  | P1-2 | `getThis` asks the prior scopes before the original | 2 | W4, both modes | none |
  | P1-3 | `this.k` reads a receiver that is not the original | 9 | W2, W3, W7, W10, both modes | `(c)`: `this.fn` is read from `thisArg`, which has none |
  | P1-4 | the copy takes every own key, non-enumerable and symbol keys included | 2 | Q3, Q4 | none |
  | P1-5 | the copy takes the names the chain holds below `Object.prototype` | 1 | Q2 | none |
  | P1-6 | the copy reads through to the object | 74 | Q1, Q2, Q3, Q5, Q7 | 69, every `caseInsensitive` row whose object's own value differs from the copy's after a write: 37 in `updateExpressionVisitor › caseInsensitive`, 11 in `assignment-target.spec.ts`, 6 read-only-name rows, 6 arrow-parameter rows, 4 short-circuiting logical assignments, 5 A43 rows |
  | P1-7 | the copy writes through to the object | 8 | Q5, Q8 | 6 in `assignment-target.spec.ts`: the five rows marked `design: a write into the caseInsensitive copy` over a context accessor, and `CONSTRUCTOR = 1` |
  | P1-8 | the copy is one level deep | 29 | Q6 | 28 that read or write through a nested object, whose identity the copy now changes: 23 in `assignment-target.spec.ts`, one update row, two read-hook rows, two property-cache rows |
  | P1-9 | `getThis` answers the first prior scope's `thisArg`, whichever holds the key | 6 | W5, W6, W9, both modes | none |
  | P1-10 | `this.k` skips the context's pushed scopes, the expression's bindings among them, reading from the prior scopes on | 4 | W7, W10, both modes | none |
  | P1-11 | `getThis` reads a prior scope's object as a plain record | 2 | W8, both modes | none |
  | P1-12 | a `Registry` original is always the receiver | 15 | W8 both modes; W1, W5, W6, W7, W9, W10 under `caseInsensitive`, whose copy is a `Registry` | 7 under `caseInsensitive`: the six A42 write refusals and `S`'s `this.z = 5` |
  | P1-13 | `getThis` tests a prior scope by presence, not value | 2 | W9, both modes | none |
  | P1-14 | `getThis` tests the original by presence, not value | 4 | W9, both modes | 2 held under A49, case-sensitive: `this.g = 1` and `this.g += 1` over a context accessor |
  | P1-15 | an identifier write to a name the context's own object holds goes there, past the expression's bindings and pushed scopes | 14 | Q7, Q8 | 12: 5 case-sensitive identifier writes over a context accessor in `assignment-target.spec.ts`, 3 `variableDeclarationVisitor`, 3 arrow-parameter, 1 `for` binding |
  | P1-16 | a global prior scope's `thisArg` answers the read of `k` | 4 | W2, W3, both modes | none |
  | P1-17 | a pushed scope that holds `k`, the expression's binding among them, is the receiver of `this.k = v` | 4 | W7, W10, both modes | none |
  | P1-18 | `fromContext` copies any object, a null-prototype one or another realm's included | 2 | Q9, Q10 | none |
  | P1-19 | `getContextValue` reads any object, a null-prototype one or another realm's included | 2 | Q9, Q10 | none |
  | P1-20 | a write onto the copy reaches the copy's object | 20 | Q8; W4 under `caseInsensitive` | 18: 6 `caseInsensitive` rows held under A50 that write through `this` onto the copy, now reaching the object, and 12 `E` rows, both modes, whose targets log every read, which see the probe's read of its marker |

  Every step-1 row is red under the probe of its own claim, and no probe leaves one of its rows green.
  A first P1-15, every identifier write skipping the bindings, hung the suite in a `for` loop whose
  counter it never advanced; it was withdrawn unpinned.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `git grep -n -i "call's receiver\|case-insensitive
  store\|only the receiver\|receiver changes"` at 3bbc296. The README's `### Scopes` sentence is
  scoped to a namespace and its "copies the object into a case-insensitive store" sentence given A58's exception; the
  `scope-this` spec comment is rewritten; the hits in `docs/a35/plan.md`, `docs/backlog-retired.md`
  (A7), `eval-core`'s CHANGELOG for 0.7.0 and two specs are history or another subject, kept.
- **Criterion**: the staged diff's hash, as above; the gate green, `eval-core` 3333 (3303 + 30),
  `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; every probe's red set as predicted;
  `sha256sum -c` on supplement 7's `SHA256SUMS.txt`; the step skill's § 1 names this plan.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`. Its first five reviews, of supplements 2 to 6's `step-1.patch`, each stopped the commit;
  every finding is folded in or recorded (§ 4.1).
- **Outcome**: placed from supplement 7's `step-1.patch`, measured first in the sandbox: the gate
  `eval-core` 3333, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; release-tags 52 rows, 62
  tags, all annotated; the twenty probes' red sets as the table gives them. The commit's body records
  the run on the maintainer's checkout and the sixth code review.

### 4.1 Step 1's reviews, folded in

Each placement met every criterion up to its code review, and each review stopped the commit. Every
finding was measured or checked on the production bundle before it was folded.

**The first review**, of supplement 2's `step-1.patch`: one Important, nine Minor.

- **I-1.** § 3.5's sentences were false where the expression binds `k` itself: `this.k` read the
  binding, not the scope's `k`, and `k = 5` changed the binding, not the copy. Measured in both modes
  (`s3.mjs`, `bound`). Both sentences reworded; W7 and Q7 added, probed by P1-10 and P1-15.
- **M-1.** The A57 spec comment said every case reads its fixture case-sensitively; Q2 to Q4 do.
  Reworded.
- **M-2.** § 3.5 cited a claim → witness table step 1 lacked. Added, above.
- **M-3.** The [SR25](../standing-rules.md#sr25) sweep was not recorded. Recorded, above.
- **M-4.** The plan said every probe also ran before the rows; P1-9 had not. The probe pass now names
  the existing rows in the run with step 1's rows in place.
- **M-5.** D1 overstated: the `caseInsensitive` branch keeps a `catch` of its own. D1 and A55 narrowed;
  the code is § 8 q1, for step 2.
- **M-6.** No A56 row for a `Registry` as the context or behind a prior scope
  ([SR19](../standing-rules.md#sr19)). W8 added, probed by P1-11 and P1-12 (`s3.mjs`, `shape`).
- **M-7.** W2 and W3's `k` read had no probe of its own. They now read `k` first; P1-16 added.
- **M-8.** A56 and A57's Kind is `decision, then fix`, as their entries describe, in the index and the
  entries.
- **M-9.** "Holds" means a value other than `undefined`. The README said so until the third review's
  rewrite; W9 added, probed by P1-13 and P1-14 (`s3.mjs`, `holds`).

**The second review**, of supplement 3's `step-1.patch`: I-1 and M-1 to M-9 confirmed resolved; one
Important, four Minor, four notes.

- **I-a.** The CHANGELOG's A57 clause, "an assignment to one of its names changes the copy", was false
  for a write through `this`: under `caseInsensitive` over `{ k: 1 }`, `this.k = 5` lands beside the
  copy's map and a later `k` reads 1, and `let k = 0; this.k = 5; k` leaves the binding 0 (`s4.mjs`,
  `copy-this`; that is [A50](../backlog.md#a50), fixed in step 3). The README and the CHANGELOG said
  "an identifier assignment" until the third review's rewrite; the CHANGELOG restores "inherited". The
  A57 entry records the write through `this`.
- **M-a.** A scope the caller pushes with `EvalContext.push` is what `k` and `this.k` read, while
  `this.k = 2` still writes `thisArg.k` (`s4.mjs`, `pushed`). The README said so until the third
  review's rewrite, and W10 stays as its contrast, probed by P1-10 and P1-17.
- **M-b.** A55's entry and finding 1 said an own accessor under `caseInsensitive` already throws; a
  member read does, a destructuring read swallows (`s4.mjs`, `destructure`). Both reworded; step 2's
  characterisation takes the rows (§ 3.1).
- **M-c.** The README named `const`, and no row had one. W7 adds it (`s4.mjs`, `const`).
- **M-d.** `docs/README.md`'s Active-plan row said step 1 opened A56 and A57; it opened A55 too.
- **Notes, not false sentences**, each recorded where it belongs: names that differ only in case
  collapse in the copy, in the A57 entry (`s4.mjs`, `collapse`); a namespaced prior scope also takes
  `this.cat = 2`, in the A56 entry (`s4.mjs`, `namespace`);
  W4's comment now cites A50 beside A57; the `caseInsensitive` branch's `catch` swallowing an inherited
  getter's first read today is § 8 q1's `get`.

**The third review**, of supplement 4's `step-1.patch`: I-a, M-a to M-d and the notes confirmed
resolved; two Important, one Minor, three notes. Rather than qualify the sentences a third time, § 3.5
rewrites them to [SR44](../standing-rules.md#sr44): what holds on every path named, the rest unstated.

- **I-b.** "An identifier assignment to one of its names changes the copy" was false with a pushed scope
  that holds `k`, which takes the write (`s5.mjs`, `pushed-write`). The sentence now states what every
  write path keeps, "leaves your object as it was"; Q8 witnesses the pushed and `this` paths, probed by
  P1-7, P1-15 and P1-20.
- **I-c.** "Copies the object into a case-insensitive store" was false for an object with a null
  prototype, which `fromContext` does not copy and `eval-core` does not read as the context in either
  mode (`s5.mjs`, `null-proto`). Opened as [A58](../backlog.md#a58), widening the step at its gate
  ([SR3](../standing-rules.md#sr3)); the README says so; Q9 added, probed by P1-18 and P1-19.
- **m-1.** Under `caseInsensitive`, a `K` in a binding, a pushed scope or a prior scope turns
  `this.k = 2` into a refusal or a write to `thisArg.K` (`s5.mjs`, `variant`). The sentence now promises
  the case-sensitive path only; the A56 entry records the rest.
- **Notes**: "never `thisArg.k`" and its exception when `thisArg` is the scope's own object went with the
  rewrite; a namespaced scope named `k` before the global one is a holder the sentence's "only" excludes;
  the case collapse stays in the A57 entry.

**The fourth review**, of supplement 5's `step-1.patch`: the third review's findings confirmed
resolved; two Important, one Minor, five notes.

- **I-1.** The A56 sentence's "`k` and `this.k` still read the scope's `k`" failed for a `thisArg` the
  context's reads also reach: with the caller's own object as `thisArg`, `this.k = 2` writes it and the
  reads then return `2` case-sensitively (`s6.mjs`, `thisarg-read`). Every wording of the `this` path
  across four reviews drew a counter-example, so the README now promises none of it: the sentence is
  scoped to a namespace, which its rows have held since the A7 fix, aec3a5b, and A56's entry records
  the rest.
- **I-2.** "Copies a plain object or a class instance" failed for a `Registry` and an `EvalContext`,
  taken as they are (`s6.mjs`, `copies`). The README now says "a plain object, or an instance of a class
  of your own"; the A57 entry records the two.
- **m-1.** Finding 7 kept the clause I-b had proved false. Rewritten to "leaves the caller's object as
  it was", with the pushed scope.
- **Notes**: a null, frozen or number `thisArg` is recorded in the A56 entry (`thisarg-odd`); the case
  collapse stays in the A57 entry; the namespace sentence's witnesses, `(a)`, `(d)` and the namespace
  block's two property rows, are now in the claim → witness table; the `scope-this` spec comment says a
  write through `this` "can go" to `thisArg`; the CHANGELOG says "two passages".

No row and no code changed in the fourth revision, so supplement 5's probes and red sets stood.

**The fifth review**, of supplement 6's `step-1.patch`: the fourth review's findings confirmed
resolved; nothing Critical; two Important, three Minor, two notes.

- **I-1.** "An assignment to one of its names leaves your object as it was" failed when the caller's
  object reaches the evaluation a second way: pushed with `EvalContext.push`, it takes `k = 5`; as a
  global scope's `thisArg`, `{ k: undefined }` takes `this.k = 2` (`s7.mjs`, `alias`). The reviewer's
  wording, "the copy does not write back to your object", is true and P1-7 probes it, but it would be
  the fifth wording of a passage each review had broken. So the passage is cut back to the correction
  SR31 needs: the README promises nothing of what the copy holds or where a write goes, and A57's
  entry records both alias paths; Q1 to Q8 pin A57 unchanged.
- **I-2.** "Copies a plain object" failed for a plain object made in another realm, which fails
  `instanceof Object` as a null-prototype one does: not copied, and `k`, `K` and `this.k` read
  `undefined` in both modes (`s7.mjs`, `realm`). A58 is widened to its mechanism, "not an instance of
  this realm's `Object`", in its entry, its index row and the README; Q10 added, probed by P1-18 and
  P1-19.
- **m-1.** The `scope-this` spec comment named the README; it names A56's entry.
- **m-2.** § 7's risk about the README's A56 sentence went with that sentence.
- **m-3.** Finding 6 kept the "still read the scope's `k`" clause the fourth review disproved;
  rewritten with `thisarg-read`.
- **Notes**: a subclass of `Registry` or `EvalContext` is taken as it is, and is no plain object, the
  copy sentence's subject; a namespace is shadowed when the caller's own object holds its name, a path
  the namespace sentence does not name ([SR44](../standing-rules.md#sr44)).

Q10 is a new row, so supplement 7 re-measures every probe's red set with it in place.

### Step 2 — A55 and A48

- **Place, don't draft.** The step's whole change is pinned as `step-2/step-2.patch` in supplement 8,
  its SHA-256 given in the prompt, placed as step 1's was: each hunk with Edit or Write
  ([SR36](../standing-rules.md#sr36)), then, everything staged, the diff that supplement 8's
  `step-2/staged-diff.sh` prints hashes to the pinned patch's SHA-256.
- **The code.** `prototype-pollution-guard.ts` and `member-expression.ts` made to P55 and P48, their
  comments pointing at `docs/backlog-retired.md` A55 and A48; the inner `catch` kept, with a comment
  saying why (§ 8 q1); the two comments that described the read's old test, above `resolveMemberTarget`
  and inside it, rewritten ([SR25](../standing-rules.md#sr25)).
- **The records.** A55 and A48 retired: their index rows re-pointed, their entries moved to
  `docs/backlog-retired.md` with a *Fixed* paragraph each; the *Unreleased* history row, 16 live before,
  4 opened, 2 closed, 18 after, and the totals row 42, 77, 101, 18. Every link to the two entries
  re-pointed: `docs/README.md`'s row, this document's opening, `docs/a45/plan.md`'s seven
  ([SR6](../standing-rules.md#sr6)), `backlog-retired.md`'s two, 0.14.0's CHANGELOG line. `CLAUDE.md`'s
  "pointers to A48–A51, which stay open" corrected. Work in flight; the skill's count.
- **Step 1's carry-overs** ([SR4](../standing-rules.md#sr4)): § 4's table and § 6 count step 1's rows as
  30, not 29; Q9 and Q10 split, one case per assertion and mode, and probed where no probe reached
  them; A56's entry states the pushed-scope point once; A58's entry records an object outside this
  realm's `Object` as a global prior scope or a pushed scope (`a58.mjs`); the `describe` at
  `eval.service.case-insesitive.spec.ts` names A57 and A58; § 8 q1 decided.
- **The README** (§ 3.1): "Three kinds of read remain" becomes two. **The CHANGELOG**: `### Breaking`, the
  throw and the proxy's `has` trap; `### Fixed`, the double read and the key the read and the write
  agree on.
- **Rows** ([SR27](../standing-rules.md#sr27)), **+86**, `eval-core` 3333 → 3419:
  - `member-read.spec.ts`, new, 37 rows in both case modes, each mode its own case (74), each checked
    against a native run of its source: A55, an own and an inherited getter that throws, read by `x.t`,
    `x["t"]`, `x.t += 1`, `x.t++`, `x.t || 1` and `let {t} = x; 1`, its case variant `x.T`, and a throw
    that is not an `Error` (15); its contrasts, `u.t`, `n.t` and a revoked proxy (3); A48, `c.g ||= 5`,
    `` `${c.g}` ``, `c.G`, `c.G += 1`, an own accessor `o.g`, `p.foo`, `p.foo = 1`, `p.foo += 1` and
    `p.FOO` over a chain holding `foo: undefined` behind an accessor `Foo`, and a proxy logging its
    traps, `px.q`, `px.q += 1`, `px.zz` and a `get`-only proxy's `px.q` (13); § 8 q1, a proxy whose
    `has` or `get` trap throws, a prototype whose `has` or `ownKeys` trap throws, and a proxy whose
    `getPrototypeOf` or `ownKeys` trap throws (6).
  - `eval.service.case-insesitive.spec.ts`: Q9 and Q10, two cases, become fourteen: per object, its
    `instanceof Object` and that it is not copied, then `k`, `this.k` and the contrast `d.k`, each in
    each mode (+12).
  - `assignment-target.spec.ts`: the three `P` rows held under A48 have JavaScript's outcome under
    `caseInsensitive`, one `get g`, and lose the mark; `Hold.under` drops `'A48'`. No count change.

  On bdaa542's code, the rows in place (`code-at-bdaa542.patch`, supplement 8): **35 red**, the 32
  `member-read.spec.ts` cases whose outcome the fix changes and the three `P` rows; with the fix, none.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)):

  | Claim (CHANGELOG, README) | Rows | Probes |
  | :--- | :--- | :--- |
  | a getter's or a proxy `get` trap's throw reaches the caller, in both modes | A55's rows; q1's `get` row | P2-1, P2-8, P2-18; the 35 on bdaa542's code |
  | the getter's own value, an `Error` or not | every `boom` outcome; the non-`Error` row | P2-9 |
  | a null or undefined object still reads `undefined` | `u.t`, `n.t` | P2-4 |
  | under `caseInsensitive` a read calls a proxy's `has` for a key no own property matches | `px.zz`; q1's rows | P2-2; P2-5 and P2-13, for a key an own property matches |
  | a throw from that `has`, or from a searched prototype's `ownKeys`, is caught, and the key read as written | q1's `has`, prototype `has` and prototype `ownKeys` rows | P2-3 |
  | under `caseInsensitive` a getter on the chain is called once, and a proxy's `get` once | A48's rows; the three `P` rows | P2-2, P2-16 |
  | the read and the write agree on the key, `foo` | `p.foo`, `p.foo += 1`, `p.foo = 1` | P2-2, P2-14, P2-17 |
  | README: two kinds of read remain, the third gone | the three `P` rows | P2-2 |

- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)), each a pinned patch
  against the step's tree in supplement 8, applied alone, every `eval-core` case read, reverted, and the
  tree checked clean ([SR32](../standing-rules.md#sr32)); P1-18 and P1-19 are supplement 7's,
  byte-identical, re-measured with Q9 and Q10 split. Red sets in supplement 8's `results/red-*.txt`.

  | Probe | The wrong implementation | Red, of 3419 | Step 2's rows | Existing rows |
  | :--- | :--- | ---: | :--- | :--- |
  | P2-1 | `safeGetProperty` catches a throw and reads `undefined`, as up to 0.15.1 | 17 | case-sensitive, A55's 13 throwing rows, own and inherited, destructuring and the non-`Error` throw among them; under `caseInsensitive`, the two destructuring rows; q1's `get` row in both modes | none |
  | P2-2 | the `caseInsensitive` test reads the key, as up to 0.15.1 | 19 | under `caseInsensitive`: A55's six inherited throwing rows; `c.g ||= 5`, `` `${c.g}` ``, `p.foo`, `p.foo += 1`, `px.zz`, the `get`-only `px.q`; q1's four `zz` rows | the three `P` rows under `caseInsensitive` |
  | P2-3 | the branch's own `catch` goes | 3 | under `caseInsensitive`, q1's `has`, prototype `has` and prototype `ownKeys` rows | none |
  | P2-4 | the null-ish early return goes | 10 | `u.t`, `n.t`, both modes | 6: `assignment-target.spec.ts`' case-sensitive `OBJ.X += 1`, `OBJ.X++`, `++OBJ.X`; two colon-joined criterion-6 rows; one documented example |
  | P2-5 | a cache match is tested with `in` too, and the test decides | 81 | under `caseInsensitive`, `px.q`, `px.q += 1`, the own `x.T` | 78: 36 `updateExpressionVisitor`, 10 case-insensitive options, 10 lookup cache, 5 `assignment-target.spec.ts`, 5 read hooks, 5 performance, 2 curried function, and one each of the service, the case-variant guard, colon-joined names, documented examples and the dependency tracker |
  | P2-6 | the prototype's own names are not searched | 42 | under `caseInsensitive`, `c.G`, `c.G += 1`, `p.FOO`, the inherited `x.T`, q1's prototype `ownKeys` row | 37: 22 case-variant guard, 11 case-insensitive options, 2 colon-joined, 2 read hooks |
  | P2-7 | the lookup cache's listing of the own names sits inside a `catch` | 1 | under `caseInsensitive`, q1's `ownKeys` row | none |
  | P2-8 | a destructuring read swallows a throw | 4 | the two destructuring rows, both modes | none |
  | P2-9 | the throw reaches the caller as a copy | 17 | P2-1's 17 | none |
  | P2-10 | a member read of an object outside this realm's `Object` reads `undefined`, in both branches | 5 | Q9's and Q10's `d.k`, both modes | 1: the case-variant guard's "should block on the resolved key rather than on the lowercased source key" |
  | P2-11 | `this.k = v` also writes the first global prior scope that holds `k` | 12 | none | W1, W3, W4, W7, W8 and W10, both modes: the scope's `k` after the write |
  | P2-12 | the `caseInsensitive` branch runs in both modes | 15 | case-sensitive: both `x.T`, `c.G`, `c.G += 1`, `p.FOO`, `px.zz`, q1's five rows but `getPrototypeOf` | 4: the case-variant guard's case-sensitive chain, one performance row, `assignment-target.spec.ts`' case-sensitive `obj.X &&= 2` and `obj.X ||= 2` |
  | P2-13 | a cache match is read to test it | 11 | under `caseInsensitive`, `o.g`, `px.q`, `px.q += 1` | 8 `assignment-target.spec.ts` `E` rows under `caseInsensitive` |
  | P2-14 | the write resolver tests the key by reading it | 2 | under `caseInsensitive`, `p.foo = 1` | `assignment-target.spec.ts`' `c.g = 1` under `caseInsensitive` |
  | P2-15 | the class checks before a member read take a trap's throw as `false` | 4 | the revoked proxy and q1's `getPrototypeOf` row, both modes | none |
  | P2-16 | `safeGetProperty` reads twice | 28 | 16, the rows whose log a second read changes, case-sensitive and, where the read reaches `safeGetProperty`, under `caseInsensitive` | 12: 8 `E` and the three `P` rows, case-sensitive; one `assignmentExpressionVisitor` row |
  | P2-17 | case-sensitively, a key whose value is `undefined` falls to a case variant on the prototype, read and write | 17 | case-sensitive: `c.G`, `c.G += 1`, `p.FOO`, `p.foo`, `p.foo += 1`, `p.foo = 1`, the inherited `x.T`, q1's prototype `ownKeys` row | 9: 8 case-sensitive `assignment-target.spec.ts` rows, the case-variant guard's case-sensitive chain |
  | P2-18 | the `caseInsensitive` branch's read of the matched key swallows a throw | 14 | under `caseInsensitive`, A55's 13 own and inherited rows but destructuring, and q1's `get` row | none |
  | P1-18 | `fromContext` copies any object | 6 | Q9 and Q10: not copied, and under `caseInsensitive` `k` and `this.k` | none |
  | P1-19 | `getContextValue` reads any object | 8 | Q9 and Q10: `k` and `this.k`, both modes | none |

  Every `member-read.spec.ts` case is red under at least one probe, every new Q9 and Q10 case too, and
  P2-11 reaches the `scope['k']` assertions no step-1 probe reached.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `git grep -n -i "three kinds of read\|getter an
  instance inherits\|read tests \`obj\[key\]\`\|read path's \`obj\[key\]\`\|which stay open\|backlog.md#a48\|backlog.md#a55"`
  at bdaa542. The README's passage, the two code comments, `CLAUDE.md`'s sentence, D5's name for the
  passage and every link are rewritten; 0.14.0's CHANGELOG line "Two are read twice …" and
  `docs/a45/plan.md`'s table row quoting the passage are history, kept, the line's link re-pointed.
- **Criterion**: the staged diff's hash; the gate green, `eval-core` 3419 (3333 + 86), `eval-signals`
  450, `eval-forms` 386; doc-links 0 dangling; every probe's red set as the table gives it;
  `sha256sum -c` on supplement 8's `SHA256SUMS.txt`; the register's live rows 18.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`.
- **Outcome**: placed from supplement 8's `step-2.patch`, measured first in the sandbox: the gate
  `eval-core` 3419, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; release-tags 52 rows, 62
  tags, all annotated; the eighteen probes' and P1-18's and P1-19's red sets as the table gives them.
  The commit's body records the run on the maintainer's checkout and the code review.

## 5. Public API surface

No export changes shape ([SR12](../standing-rules.md#sr12)); behaviour changes as § 2 says, so the
release is a minor. Step 8 diffs each `.d.ts` against the published 0.15.1, 0.8.0 and 0.8.0 tarballs.

## 6. Verification gates

[SR8](../standing-rules.md#sr8) after every step, on the committed tree. Counts move by step 1's 30
`eval-core` cases, step 2's 86, and by what each later step's prompt fixes before its gate.

## 7. Risks

- **A getter that throws by design.** A host whose getters throw, read in an expression with a fallback
  such as `x.t || 1`, gets the throw from 0.16.0. Named in the CHANGELOG as a breaking change; the
  witness is step 2's characterisation, red on the swallow.
- **Timing on one machine.** The noise floor in the sandbox is about ±4% (finding 11), above the void
  bound; § 3.7's +5% clause decides two void runs.

## 8. Open questions

1. **The `caseInsensitive` branch's own `catch`** (step 1's review, M-5). Around its test of the key,
   `obj[key]` today and `key in obj` after P48, and its search of the prototype's names, it swallows a
   proxy trap's throw there: `get` today, `has` after P48, and `getPrototypeOf` and `ownKeys` in both.
   D1's catch does not reach it. Step 2 measures it and decides whether the catch goes with A55's,
   before its gate.
   **Decided in step 2: the catch stays.** Measured on the production bundle of bdaa542 and with P55
   and P48 (`q1.mjs`, supplement 8): after P48 it swallows a throw from a `has` trap on the object or
   its chain, and from the `ownKeys` trap of a prototype searched for a case variant, neither of which
   JavaScript's `x.k` calls, and the key is then read as written, by the `get` JavaScript does make,
   whose throw reaches the caller since D1. `resolveMemberTarget` wraps its `key in target` in the
   same kind of `catch`, so the read and the write treat a throwing `has` alike. A proxy's own
   `getPrototypeOf`, which the evaluator's class checks call before every member read, and under
   `caseInsensitive` its own `ownKeys`, which the lookup cache calls, are outside it and already throw
   to the caller; recorded in A55's retired entry. Rows: `member-read.spec.ts`, § 8 q1; probes P2-3,
   P2-7 and P2-15.

## 9. Contract after this lands

Written in step 10.

## 10. Retrospect

Written in step 10.
