# A48–A51, A55 and F29 — member reads and writes that miss the data, and a getter's throw (`@zvenigora/ng-eval-core` 0.16.0)

**Date**: November 3, 2026
**Revision**: 10 — step 10, the retrospect: § 9 maps the published entries to their witnesses, § 10
records twelve review stops of one cause; SR45 is new, § 0's P-1 to P-3 are promoted as SR46 and
SR47, and SR19 and SR40 are amended; the plan is complete (§ 4, Step 10).
Revision 9 — step 9, the post-publish record: all three on npm 2026-11-08, tagged annotated at
7d9d488; F31 opened; step 8's last review carried (§ 4, Step 9).
Revision 8 — step 8, the release commit: `eval-core` 0.16.0, `eval-signals` 0.9.0 and
`eval-forms` 0.9.0 in one commit, pending publish; step 7's Outcome added, its review's Important,
with its Minors (§ 4, Step 8).
Revision 7 — step 7, the timing record: one valid run under § 3.7, no regression on any path,
so the release goes ahead on the timing; step 6's review's four Minors corrected (§ 4, Step 7).
Revision 6 — step 6, the downstream rows and F29: rows through `eval-signals` and `eval-forms`
for what 0.16.0 changes, measured on this tree and on 0.15.1's `eval-core` code, with an inherited
getter, since an own one's throw already reached the caller under `caseInsensitive`; F29's two cases;
step 5's review's Important pinned by three rows with a read hook, and its Minors; supplement 14's
stale-pointer Minor answered by the A45 plan's decision to leave them; § 4's table gives step 6's files and its +6 / +12 / +5 (§ 4, Step 6). Revision 5 — step 5, A49 decided a documented limit: the README's passage rewritten as the
contract, with no count promised, measured on twenty forms without and with a read hook, since a
getter on a prior scope's object made "two kinds" false and a read hook made its lookup counts false
(supplement 13 kept them, and its code review stopped the commit; supplement 14's CHANGELOG
misstated which of the old counts a hook moves, and its review stopped the commit too); § 4's table gives step 5's files
and its +8; [A61](../backlog.md#a61) opened from step 4's
review, at the maintainer's decision; step 4's review's three findings corrected (§ 4, Step 5).
Revision 4 — step 4, A51 fixed: § 4's table gives step 4's files and its +52; step 3's
review's two Important points are stated and pinned, the original as a prior scope's `thisArg`
written through its map, kept as A50's fix, and a `Registry` `thisArg` that is not the original
unchanged; [A60](../backlog.md#a60) opened for the `Registry` whose methods a write shadows, at the
maintainer's decision; step 3's section corrected (§ 4, Steps 3 and 4). Revision 3 — step 3, A50 fixed: § 4's table gives step 3's files and its +48, the write's test is by the receiver's origin, step 2's
get-only proxy break, measured wider than recorded, is stated, and [A59](../backlog.md#a59) opened for
it and step 2's two traps, at the maintainer's decision (§ 4, Step 3; § 7). Revision 2 — step 2, A55
and A48 fixed: § 3.1's CHANGELOG heading corrected to `### Breaking`,
step 1's count corrected to 30, and § 8 q1 decided (§ 4, Step 2). Revision 1 — step 1, this plan and
its records, with its five code reviews folded in before the commit (§ 4.1).

Four `eval-core` entries opened by the [A45 plan](../a45/plan.md) and one found measuring them:
[A48](../backlog-retired.md#a48), a `caseInsensitive` read that calls a prototype accessor twice;
[A49](../backlog-retired.md#a49), the context branch calling a context getter or a lookup where JavaScript
reads less; [A50](../backlog-retired.md#a50), a write through `this` that lands beside a `Registry`'s map;
[A51](../backlog-retired.md#a51), a write to an `EvalScope` held as a value that lands on the instance; and
[A55](../backlog-retired.md#a55), new, `safeGetProperty` swallowing a getter's throw. This plan fixes A48,
A50, A51 and A55, decides A49 a documented limit, and adds [F29](../backlog-retired.md#f29)'s two `eval-forms`
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
  ([SR18](../standing-rules.md#sr18)). By class, an `EvalScope`; a host `Registry` whose methods a
  member write shadows is not covered, and is [A60](../backlog.md#a60) (decided in step 4).
- **D5. A49: a documented limit, no code.** How many times a context getter or a lookup is called is not
  part of the contract. A fix needs a presence test on `EvalContext`, a published class, for a cost no
  consumer has reported. The README's "Two kinds of read remain beyond JavaScript's" passage (three until step 2) stated
  it, under [SR44](../standing-rules.md#sr44). Step 5 replaced it with the contract, since a getter on a prior scope's object made "two kinds" false (§ 4, Step 5).
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
| 3 | A50 | `member-expression.ts`, `assignment-expression.ts`, `update-expression.ts`, `assignment-target.spec.ts`, `member-read.spec.ts`, `CHANGELOG.md`, the register, the skill, this document; comments in `call-expression.ts`, `member-write-policy.ts`, `eval.service.scope-this.spec.ts` and `eval-forms`' `field-schema.spec.ts` | **+48** / 0 / 0 | `eval-core` 0.16.0 |
| 4 | A51 | `prototype-pollution-guard.ts`, its spec, `assignment-target.spec.ts`, `CHANGELOG.md`, the register, `docs/backlog-retired.md`, `docs/README.md`, `docs/a45/plan.md`, `CLAUDE.md`, the skill, this document | **+52** / 0 / 0 | `eval-core` 0.16.0 |
| 5 | A49, a documented limit | `README.md`, `eval-context.ts`' JSDoc, `member-expression.ts`' JSDoc, `assignment-target.spec.ts`' marks and its `Q` rows, `CHANGELOG.md` and the two downstream CHANGELOGs' links, the register, `docs/backlog-retired.md`, `docs/README.md`, `docs/a45/plan.md`, `CLAUDE.md`, the skill, this document | **+8** / 0 / 0 | `eval-core` 0.16.0 |
| 6 | Downstream rows and F29 | `eval-signals`' `eval-signal.spec.ts`; `eval-forms`' `field-schema.spec.ts`, `readme-examples.spec.ts` and `rules.spec.ts`; `eval-core`'s `assignment-target.spec.ts` and `eval-context.ts`' JSDoc; the register, `docs/backlog-retired.md`, `docs/README.md`, `docs/documentation/phase-11-plan.md`, `CLAUDE.md`, the skill, this document | **+6** / **+12** / **+5** | `getThis`' JSDoc in `eval-core` 0.16.0's `.d.ts` (corrected in step 7); the rest in no package |
| 7 | The timing record | this document, the skill, the register, `docs/backlog-retired.md`, `docs/README.md` | 0 / 0 / 0 | no package |
| 8 | The release commit | the three `package.json`, the three `CHANGELOG.md`, the `eval-signals` and `eval-forms` READMEs, the register, `docs/backlog-retired.md`, `docs/README.md`, `CLAUDE.md`, the skill, this document | 0 / 0 / 0 | the release |
| 9 | The post-publish record | the register, `docs/backlog-retired.md`, `docs/README.md`, `CLAUDE.md`, the tags, the skill, this document | 0 / 0 / 0 | no package |
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
  `copy-this`; that is [A50](../backlog-retired.md#a50), fixed in step 3). The README and the CHANGELOG said
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

### Step 3 — A50

- **Place, don't draft.** The step's whole change is pinned as `step-3/step-3.patch` in supplement 11
  (supplements 9 and 10 are superseded: 9 was pinned before A59 was opened, and 10's code review
  found the Critical below),
  its SHA-256 given in the prompt, placed as step 2's was: each hunk with Edit or Write
  ([SR36](../standing-rules.md#sr36)), then, everything staged, the diff that supplement 11's
  `step-3/staged-diff.sh` prints hashes to the pinned patch's SHA-256.
- **The code.** `writeMemberTarget`, new in `member-expression.ts`, P50 with one correction: a
  `Registry` that is the context's original, and that the context branch chose as the receiver, is
  written through its map, a blocked name refused first, and anything else goes to `safeSetProperty`.
  The choice is the receiver's origin, which `evaluateMember` already carries in its fourth slot
  (`docs/a35/plan.md` § 8 q7) and `resolveMemberTarget` now returns in a third; P50 tested identity
  alone, so the original reached as a value, a host `Registry` holding itself, `self.k = 5`, went to
  the map too, and `self.q = 7; self.q` read `undefined`, where 0dc9c15 read 7. The first placement's
  code review found it (Critical: the CHANGELOG's "held as a value … as before" false for the
  original); D3 and finding 3 already said the value path stays consistent with itself, so the code
  is made to match them. `assignment-expression.ts` and `update-expression.ts` pass the origin. The
  test reads the origin and the identity before `instanceof`, which calls a proxy's `getPrototypeOf`
  trap (the review's Minor). Its comment
  points at `docs/backlog-retired.md` A50 and states the layer: its refusal stands behind
  `resolveMemberTarget`'s, and for an update the read's. The comments that named `safeSetProperty`
  as the write, above `resolveMemberTarget`, in `member-write-policy.ts` (two) and in
  `call-expression.ts`, are rewritten ([SR25](../standing-rules.md#sr25)).
- **The records.** A50 retired: its index row re-pointed, its entry moved to
  `docs/backlog-retired.md` with a *Fixed* paragraph. [A59](../backlog.md#a59) opened, Covered, at
  the maintainer's decision: the proxy traps a member read calls beyond `get`, gathering step 2's
  `getPrototypeOf` and `ownKeys` rows and carry-over 1 below; A55's and A48's retired entries point to
  it. The *Unreleased* history row, 16 live before, 5 opened, 3 closed, 18 after, and the totals row
  42, 78, 102, 18. Every link to it re-pointed:
  `docs/README.md`'s row, this document's two, `docs/a45/plan.md`'s five
  ([SR6](../standing-rules.md#sr6)), and the register's own three, in Work in flight, A56 and A57.
  A57's sentence that a write through `this` lands beside the copy's map, false from this step, is
  corrected ([SR31](../standing-rules.md#sr31)); A56's "A50's shape" says where the write goes now.
  Work in flight; the skill's count.
- **Step 2's carry-overs** ([SR4](../standing-rules.md#sr4)):
  1. **The get-only proxy, measured wider than recorded** (`a50.mjs`, the `GETONLY` rows, on published
     0.15.1, on 0dc9c15 and on 0dc9c15 with P50). Under `caseInsensitive`, a key that a proxy with no
     `has` trap answers but whose target does not hold is searched for a case variant on the target's
     prototype, as `=` already searched it: the variant is read, `px.getx` over an instance whose
     prototype has `getX`, and `px.getx += 1` reads and writes it; or refused when it is a blocked
     name, `px.tostring` over `{}`. Up to 0.15.1 the read tested the key by reading it and read it as
     spelled, twice. `px.q` and a case-sensitive read are unchanged, and `px.getx = 1` wrote `getX`
     at 0.15.1 too. The CHANGELOG gains a `### Breaking` bullet; `member-read.spec.ts` five rows; A48's
     retired entry a paragraph; and [A59](../backlog.md#a59) records it.
  2. `field-schema.spec.ts`' comment that "no member access in this evaluator throws at all" is
     reworded: a member access on `null` or `undefined` does not throw; a blocked name and, from
     0.16.0, a getter that throws do. A comment only, in no package.
  3. The two `C` rows held under A50, `this.g = 1` and `this.g += 1` under `caseInsensitive`, keep
     their outcome under P50 and are re-marked `design: a write into the caseInsensitive copy`; P50's
     refusal is probed behind `resolveMemberTarget`'s and the read's (the probes below).
- **The file list** (§ 4's table, corrected here, [SR3](../standing-rules.md#sr3)): beyond the
  table's, `member-read.spec.ts` and `field-schema.spec.ts` (the carry-overs), `call-expression.ts`,
  `member-write-policy.ts` and `eval.service.scope-this.spec.ts` (comments only), `docs/README.md`, `docs/backlog-retired.md` and
  `docs/a45/plan.md` (the records and the links). The two visitors' own specs are not changed: the
  characterisation spec's `S`, `H` and `K` rows run both visitors.
- **The CHANGELOG**: `### Fixed`, the write through `this` to a `Registry` original; `### Breaking`, the
  get-only proxy (carry-over 1). The README promises neither path and is not changed.
- **Rows** ([SR27](../standing-rules.md#sr27)), **+48**, `eval-core` 3419 → 3467:
  - `assignment-target.spec.ts`, +38: group `H`, a host's `Registry` as the context, twelve rows in
    both modes: `this.k = 5`, `this.k += 5`, `this.k++` and `this.k ||= 5` written through the map;
    `this.K = 5`, refused case-sensitively by A42 and written under `caseInsensitive`; `this.z = 5`,
    refused; `r.k = 5`, a `Registry` held as a value, an own property as before, checked natively;
    and the host's `Registry` holding itself as `self`: `self.k = 5`, `self.k += 5`, `self.k++` and
    `this.self.k = 5`, the original reached as a value, an own property, read back by `self.k`, the
    map keeping 1, as at 0dc9c15, beside `this["k"] = 5` on the same fixture, through the map.
    Group `K`, a blocked name on a `Registry` original, seven rows in both modes: `this.__proto__ =
    f()`, `this["__proto__"] = f()`, `this.constructor += f()`, `this.constructor++`,
    `this.prototype = f()` and `this.CONSTRUCTOR = f()` over a host `Registry` holding the names,
    and `this.constructor = f()` over a plain context, whose `caseInsensitive` copy is the original:
    each refused before `f` runs, the map keeping its entries. The four `S` rows held under A50 have
    the copy's map written under `caseInsensitive`, `k` and `K` the new value, no stray, the caller's
    object `1`, and are re-marked `design: a write into the caseInsensitive copy`; the two `C` rows
    are re-marked; `Hold.under` drops `'A50'`.
  - `member-read.spec.ts`, +10: a proxy whose `get` trap answers every key, with no `has` trap, five
    rows in both modes: `px.q` and `px.tostring` over `{}`, and `px.getx`, `px.getx += 1` and the
    contrast `px.getx = 1` over an instance with a method `getX`.

  On 0dc9c15's code, the rows in place (`code-at-0dc9c15.patch`, supplement 11): **15 red**, the set P3-7
  gives: `H`'s six writes through the context, through the map with no stray, both modes, `this.K = 5`
  under `caseInsensitive`, and the four `S` rows under `caseInsensitive`; with the fix, none. The `self`
  rows, the `K` rows and the `member-read.spec.ts` rows are green on 0dc9c15's code as well: the `self`
  rows pin what 0dc9c15 did, and the others layers and a read that step 2 already changed.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)):

  | Claim (CHANGELOG) | Rows | Probes |
  | :--- | :--- | :--- |
  | a write through `this` to a `Registry` original reaches its map, and a later `k` or `this.k` reads it: the copy under `caseInsensitive`, a host's in both modes | `H`'s writes; `S`' four under `caseInsensitive` | P3-7; the 15 on 0dc9c15's code |
  | `=`, `+=`, `\|\|=` and `++` alike | `H`'s `this.k = 5`, `this.k += 5`, `this.k \|\|= 5`, `this.k++` | P3-7 |
  | under `caseInsensitive` the write stays in the copy, the caller's object unwritten, as before | `S`' `caller: 1` under `caseInsensitive` | none: unchanged, and nothing the step changes reaches the caller's object |
  | a `Registry` reached as a value, the context's original included, is written as any object is, as before | `H`'s `r.k = 5`, checked natively, and its four `self` rows | P3-1; P3-11, the review's case |
  | a key no receiver holds is still refused (the entry; it said "a key the original does not hold", corrected in step 4) | `H`'s `this.z = 5`, and `this.K = 5` and `K`'s `this.CONSTRUCTOR = f()` case-sensitively | P3-9 |
  | the write goes to a `Registry` that is the original only (the entry) | existing rows: a plain original is not a `Registry` | P3-2 |
  | the get-only proxy: a case variant on the target's prototype read, written, or refused when blocked; `px.q` as spelled; `=` as before; case-sensitive unchanged | the five `member-read.spec.ts` rows | P3-8, P3-10, P2-12, P2-14, P2-16 |
  | (no claim) `writeMemberTarget` refuses a blocked name, behind `resolveMemberTarget`'s refusal and the read's | `K` | P3-3, P3-4, P3-5, P3-6 |

- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)), each a pinned patch
  against the step's tree in supplement 11, applied alone, every `eval-core` case read, reverted, and the
  tree checked clean ([SR32](../standing-rules.md#sr32)). Red sets in supplement 11's
  `results/red-*.txt`.

  | Probe | The wrong implementation | Red, of 3467 | Step 3's rows | Existing rows |
  | :--- | :--- | ---: | :--- | :--- |
  | P3-1 | any `Registry` is written through its map, however it was reached | 10 | `H`'s `r.k = 5` and its four `self` rows, both modes | none |
  | P3-2 | any original the context branch chose is written through `set`, a plain object too | 8 | none | 8, case-sensitive, a plain context written through `this`: `S`' `this.k = 5`, `this.k += 5` and `this.k++`, `C`'s `this.g = 1` and `this.g += 1`, one `R` row, one A56 row and A42's "the write refusal" |
  | P3-3 | `writeMemberTarget`'s own blocked-name check goes | 0 | none: `resolveMemberTarget` and the read refuse first | none |
  | P3-4 | `resolveMemberTarget`'s two context checks go | 12 | 9: `K`'s `=` rows, both modes, but case-sensitive `this.CONSTRUCTOR = f()`: `f` runs, and the refusal comes after it | 3: `B`'s `this.constructor = f()`, both modes, and `this.CONSTRUCTOR = f()` under `caseInsensitive` |
  | P3-5 | P3-4, and `writeMemberTarget`'s check | 12 | P3-4's nine, the write now landing in the map | P3-4's three |
  | P3-6 | the read's two context checks, and `writeMemberTarget`'s | 370 | `K`'s `this.constructor += f()` and `this.constructor++`, both modes, the write landing | 366: "the blocklist against the context", every blocked read through `this` |
  | P3-7 | the map written and an own property set too, as up to 0.15.1 | 15 | `H`'s six writes through the context, `this["k"] = 5` on the `self` fixture among them, both modes, and `this.K = 5` under `caseInsensitive`; `S`' four under `caseInsensitive` | none |
  | P3-8 | the `caseInsensitive` read tests the key by reading it, as up to 0.15.1 (P2-2) | 23 | under `caseInsensitive`, the answering proxy's `px.q`, `px.tostring`, `px.getx`, `px.getx += 1` | 19: P2-2's |
  | P3-9 | a key the original does not hold is written into it, where A42 refuses it | 21 | `H`'s `this.z = 5`, both modes; case-sensitive `this.K = 5` and `K`'s `this.CONSTRUCTOR = f()` | 17: 11 A42 "the evaluation context is not writable", 4 `assignment-target.spec.ts`, 2 A56 |
  | P3-10 | the write resolver's `caseInsensitive` branch runs in both modes | 7 | case-sensitive `px.getx = 1` | 6: 5 `assignment-target.spec.ts`, 1 performance |
  | P3-11 | the original is written through its map by identity alone, however it was reached: P50 as first pinned, the review's case | 8 | `H`'s four `self` rows, both modes | none |
  | P3-12 | any `Registry` the context branch chose is written through its map, the original or not | 0 | none: the branch chooses a `Registry` other than the original only as a prior scope's `thisArg`, which no row holds and nothing claims | none |
  | P2-12 | supplement 8's, byte-identical: the read's `caseInsensitive` branch in both modes | 18 | case-sensitive `px.tostring`, `px.getx`, `px.getx += 1` | 15: step 2's |
  | P2-14 | supplement 8's: the write resolver tests the key by reading it | 3 | `px.getx = 1` under `caseInsensitive` | 2: step 2's |
  | P2-16 | supplement 8's: `safeGetProperty` reads twice | 33 | `px.q` in both modes; case-sensitive `px.tostring`, `px.getx`, `px.getx += 1` | 28: step 2's |

  Every new case is red under at least one probe, checked case by case; each red set's names are as
  many as Jest's failed cases, so no two red cases share a name (25 `eval-core` titles repeat at 0dc9c15,
  none in this step's specs).
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `git grep -n "beside its map\|backlog.md#a50\|immediately before \`safeSetProperty\`\|\`safeSetProperty\` covers every write\|where \`safeSetProperty\` refuses after\|no member access in this"`
  at 0dc9c15. Rewritten: the register's A57 sentence, A50's index row status, the four code comments,
  `eval.service.scope-this.spec.ts`' W4 comment and `field-schema.spec.ts`' comment; every link
  re-pointed. Kept: A50's index row description and its entry, history; `assignment-target.spec.ts`'
  definition of `stray`, which still names what it tests; this document's step 1 text.
- **Criterion**: the staged diff's hash; the gate green, `eval-core` 3467 (3419 + 48), `eval-signals`
  450, `eval-forms` 386; doc-links 0 dangling; every probe's red set as the table gives it;
  `sha256sum -c` on supplement 11's `SHA256SUMS.txt`; the register's live rows 18.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`.
- **Carried into step 4** ([SR4](../standing-rules.md#sr4)): measured with the correction
  (`shadow.mjs`, supplement 11), the same on 0.15.1, 0dc9c15 and step 3: a host `Registry` held in its
  own data can have its methods shadowed by a member write, an own property, as for any object, so
  `self.get = 1` makes every later `k` and `this.k` throw `context.get is not a function`, and
  `self.set = 1` every later `k = 5`. It is [A51](../backlog-retired.md#a51)'s shape for a `Registry`, recorded
  there; step 4 decides whether D4's refusal covers it.
- **Outcome**: supplement 10's placement matched its hash, its gate and its 14 red sets, and its
  code review stopped the commit on a Critical, above, so supplement 11 corrects the code and pins the
  step again. (Revision 3 said "supplement 11's first placement"; corrected in step 4.) Measured first in the sandbox: the gate `eval-core` 3467, `eval-signals` 450,
  `eval-forms` 386; doc-links 0 dangling; the probes' red sets as the table gives them. The commit's
  body records the run on the maintainer's checkout and the code review. It names "Probes
  P3-1..P3-11"; P3-12 ran on that checkout as well, 0 red, matching its pinned set, and the commit
  cannot be changed, so this records it.

### Step 4 — A51

- **Place, don't draft.** The step's whole change is pinned as `step-4/step-4.patch` in supplement 12,
  its SHA-256 given in the prompt, placed as step 3's was: each hunk with Edit or Write
  ([SR36](../standing-rules.md#sr36)), then, everything staged, the diff that supplement 12's
  `step-4/staged-diff.sh` prints hashes to the pinned patch's SHA-256.
- **The code.** `safeSetProperty` as P51, byte for byte in its test and message: an `EvalScope`
  target, by class, is refused, `Write to an evaluation scope is blocked`, after `refuseContextWrite`
  and before the blocklist. Its comment points at `docs/backlog-retired.md` A51 and states its layer:
  after the right side and the write policy, P-1's reason, and that a namespaced scope's object is
  not a scope. The module's import comment names both bindings it reads. Nothing else in the code
  changes: `resolveMemberTarget`'s `EvalScope` branch keeps refusing a blocked name first, before the
  right side.
- **Measured** on the production bundles of published 0.15.1 (`B8BAED38…AFDA24E4`), 0dc9c15
  (`FFACA46D…16D675C5`), 6086872 (`8EE9C6F4…E4122D75`), 6086872 with P51 (`3B362348…00337DEC`) and
  the step's tree (`47A03308…0E25C1BA`, its comments the difference) (`s12.mjs`, 168 rows;
  `results/s12-*.txt` in supplement 12; the first three byte-identical to supplement 11's bundles).
  0.15.1 and 0dc9c15 give the same 168 rows, and P51 and the step's tree the same. P51 moves the
  `A51` rows only, and the `A59` counts by one.
- **The maintainer's decisions** (2026-11-06): the `Registry` whose methods a member write shadows,
  A51's *Related*, is not covered by D4's refusal and is opened as [A60](../backlog.md#a60), not
  fixed: refusing a write to a `Registry` reached as a value would reverse step 3's `self` rows. The
  extra `getPrototypeOf` call P51's `instanceof` makes on a proxy target is recorded in
  [A59](../backlog.md#a59), with step 3's, and P51 is kept.
- **Step 3's carry-overs** ([SR4](../standing-rules.md#sr4), [SR31](../standing-rules.md#sr31)):
  1. **Important 1, kept and stated.** A global prior scope whose `thisArg` is the context's
     `Registry` original, the original not holding the key: since step 3 `this.k = 2`, `+= 2` and
     `++` write the original's map, and `k` and `this.k` read the new value, in both modes, and under
     `caseInsensitive` for the copy of a plain context as `thisArg` too; on 0.15.1 and 0dc9c15 the
     instance took an own `k` and `k` read `10` (`THISARG` rows). It is A50's fix on one more path:
     the context branch chose the original. The CHANGELOG's A50 bullet states it; A50's retired
     entry is corrected ("a key the original does not hold is still refused" held only where no
     receiver holds it); step 3's claim row is corrected; `assignment-target.spec.ts`' `Y` rows pin
     it, and P4-6 probes it.
  2. **Important 2, recorded.** A `Registry` `thisArg` that is not the original keeps A50's shape,
     an own `k`, `k` reading `10`, unchanged on all five bundles; so does an earlier prior scope's
     `Registry` object as `thisArg` (`A56` rows). A56's "an earlier prior scope's object as `thisArg`
     reads back `2` in both modes" is corrected to a plain object. Two `Y` rows pin it, held under
     A56; P3-12, byte-identical from supplement 11, now reddens them.
  3. **A59, the write.** A paragraph: the calls to `getPrototypeOf` a member write makes, counted
     per expression, case-sensitively over a proxy original `this.k = 5` 3, 4 and 5 on 0dc9c15, step 3
     and step 4, `this.k += 5` and `this.k++` 5, 6 and 7; over a proxy held as a value `px.k = 5` and
     `px.k += 5` 3, 3 and 4, the read 2 on each; JavaScript calls none (`A59` rows, and a native run).
  4. **This document's errors in Step 3**: the duplicated sentence after "On 0dc9c15's code" is
     removed; its Outcome said "supplement 11's first placement" for supplement 10's; and the commit
     named "Probes P3-1..P3-11" where P3-12 ran too, which the Outcome now records.
  5. **The shadowing case** is [A60](../backlog.md#a60), above; A51's *Related* paragraph moves
     there.
- **A51's entry corrected** ([SR4](../standing-rules.md#sr4)): "a prior scope is never reachable as
  one" holds for the scope, not for its `thisArg`, which `this.k = v` reaches (A56); measured on the
  five bundles, an own `k` on the `EvalScope` up to step 3, refused from step 4.
- **The records.** A51 retired: its index row re-pointed, its entry moved to
  `docs/backlog-retired.md` with a *Fixed* paragraph. A60 opened, Open, not scheduled. The
  *Unreleased* history row, 16 live before, 6 opened, 4 closed, 18 after, and the totals row 42, 79,
  103, 18. Every link to A51 re-pointed: `docs/README.md`'s row, this document's two,
  `docs/a45/plan.md`'s seven ([SR6](../standing-rules.md#sr6)), `docs/backlog-retired.md`'s one, and
  the register's own two, in Work in flight and A51's index row. `CLAUDE.md`'s "the A48 plan fixed
  A48 in its step 2, and A49–A51 are open", false since step 3, corrected
  ([SR31](../standing-rules.md#sr31)). Work in flight; the skill's count.
- **The file list** (§ 4's table, corrected in this step, [SR3](../standing-rules.md#sr3)): beyond
  what Revision 3's row named, `docs/backlog-retired.md`, `docs/README.md`, `docs/a45/plan.md` and
  `CLAUDE.md` (the records and the links).
- **The CHANGELOG**: `### Breaking`, the refusal; `### Fixed`, A50's bullet gains the prior scope's
  `thisArg` (carry-over 1). The README promises no write to an `EvalScope` and is not changed: its
  `### Scopes` "`cat.x = 1` writes to it" is of the scope's object, which is not a scope.
- **Rows** ([SR27](../standing-rules.md#sr27)), **+52**, `eval-core` 3467 → 3519:
  - `assignment-target.spec.ts`, +48: group `J`, an `EvalScope` held as a value, eighteen rows in
    both modes: on a global scope `ns.k++`, `++ns.k`, `ns["k"] = 5`, `ns.K = 5`, `ns.z = 5`,
    `ns.k = f()`, `ns._context = 9`, `ns._options = 9`, `ns.type = 9` and `ns.k ||= 5` over a falsy
    `k`, refused, the scope and its fields as they were, `f` called; `ns.__proto__ = f()`, refused by
    the blocklist before `f`; `ns.k ||= 5` with `k` set, which writes nothing and is not refused; on
    a namespaced scope `ns.k = 5`, refused, and `ns.n.k = 7`, written into its object; on a
    subclass's instance `ns.k = 5`, refused; an `EvalScope` as a global prior scope's `thisArg`,
    `this.k = 2`, refused; and under a write policy that allows, `ns.k = f()`, refused after `f` and
    the policy, and under one that refuses, the policy's own error. Group `Y`, a prior scope's
    `thisArg` that is a `Registry`, six rows in both modes: the original, `this.k = 2`, `+= 2` and
    `++`, through the map; the copy, `this.k = 2`, case-sensitively the caller's object and under
    `caseInsensitive` the copy's map; another `Registry`, `this.k = 2` and `+= 2`, an own `k`, held
    under A56. `S`' two rows held under A51 refused and re-marked
    `design: A51, a write to an evaluation scope refused`; `Hold.under` drops `'A51'` and gains
    `'A56'`. A row may carry a `label`, shown in its case's name, where two rows of a group share a
    source.
  - `prototype-pollution-guard.spec.ts`, +4: `safeSetProperty` refuses an `EvalScope`, its fields
    and context kept; a subclass; before the blocklist, under its own message; and `ns.n.k = 7`
    still writes the namespaced scope's object.

  On 6086872's code, the rows in place (`code-at-6086872.patch`, supplement 12): **35 red**, every
  write the fix refuses: `J`'s fourteen refused rows and `S`' two, both modes, and the guard spec's
  first three; with the fix, none. `J`'s `ns.__proto__ = f()`, `ns.k ||= 5` with `k` set,
  `ns.n.k = 7` and the refusing policy, the guard spec's fourth and every `Y` row are green on
  6086872's code as well: they pin what the fix leaves, and step 3's code.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)):

  | Claim (CHANGELOG) | Rows | Probes |
  | :--- | :--- | :--- |
  | a member write to an `EvalScope` throws `Write to an evaluation scope is blocked`, where it set an own property, in both modes | `J`'s refused rows, `S`' two | code-at-6086872 |
  | every form a member write takes | `J`'s `ns.k++`, `++ns.k`, `ns["k"] = 5`, `ns.k \|\|= 5` over a falsy `k`; `S`' `=` and `+=` | code-at-6086872; P4-7 for the updates |
  | every key the blocklist does not already refuse, the scope's own fields included | `J`'s `ns.K`, `ns.z`, `ns._context`, `ns._options`, `ns.type`; the guard spec's first and third | code-at-6086872; P4-4; P4-5 |
  | a subclass too | `J`'s `ns.k = 5 (a subclass)`; the guard spec's second | P4-1 |
  | an `EvalScope` that is a prior scope's `thisArg`, through `this` | `J`'s `this.k = 2 (a prior scope's thisArg)` | code-at-6086872 |
  | after the right side has run and after a write policy, so a policy that refuses first gives its own error | `J`'s `ns.k = f()`, and its two policy rows | P4-2; P4-3 |
  | `ns.n.k = 7` still writes into a namespaced scope's object | `J`'s `ns.n.k = 7 (namespaced)`; the guard spec's fourth | P4-9 |
  | a logical assignment that writes nothing is not refused | `J`'s `ns.k \|\|= 5 (k set)` | P4-2 |
  | (no claim) a blocked name is refused first, by `resolveMemberTarget`, before the right side | `J`'s `ns.__proto__ = f()` | P4-8 |
  | A50's bullet: the original as a global prior scope's `thisArg` is written through its map, a later `k` and `this.k` reading the new value, the copy under `caseInsensitive` included | `Y`'s `the original` rows; `Y`'s `the copy` under `caseInsensitive` | P4-6 |
  | (A56) a `Registry` `thisArg` that is not the original keeps its shape | `Y`'s `another Registry` rows | P3-12 |
  | (A56) case-sensitively the caller's object as `thisArg` is written as itself | `Y`'s `the copy`, case-sensitive | P3-2 |

- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)), each a pinned patch
  against the step's tree in supplement 12, applied alone, every `eval-core` case read, reverted, and the
  tree checked clean ([SR32](../standing-rules.md#sr32)). Red sets in supplement 12's
  `results/red-*.txt`.

  | Probe | The wrong implementation | Red, of 3519 | Step 4's rows | Existing rows |
  | :--- | :--- | ---: | :--- | :--- |
  | code-at-6086872 | 6086872's code: no refusal, the write lands on the instance | 35 | `J`'s fourteen refused rows and `S`' two, both modes; the guard spec's first three | none |
  | P4-1 | the refusal by exact prototype, not by class | 3 | `J`'s `ns.k = 5 (a subclass)`, both modes; the guard spec's second | none |
  | P4-2 | the refusal in the assignment visitor once the target is resolved, before the short circuit, the right side and the policy (as the superseded P51-early) | 8 | `J`'s three `ns.k = f()` and `ns.k \|\|= 5 (k set)`, both modes | none |
  | P4-3 | the refusal after the right side, before the policy is asked | 4 | `J`'s two policy rows, both modes | none |
  | P4-4 | only the scope's three fields refused | 29 | `J`'s eleven other refused rows and `S`' two, both modes; the guard spec's first three | none |
  | P4-5 | the refusal after the blocklist | 1 | the guard spec's third | none |
  | P4-6 | the original reached as a prior scope's `thisArg` written as any object is, as at 0dc9c15 | 7 | `Y`'s three `the original` rows, both modes, and `the copy` under `caseInsensitive` | none |
  | P4-7 | the refusal in the assignment visitor only, `safeSetProperty` unguarded | 7 | `J`'s `ns.k++` and `++ns.k`, both modes; the guard spec's first three | none |
  | P4-8 | `resolveMemberTarget`'s `EvalScope` branch without its blocklist check | 4 | `J`'s `ns.__proto__ = f()`, both modes | 2: `B`'s `ns.__proto__ = f()`, both modes |
  | P4-9 | over-broad: the object a scope holds refused too | 4 | `J`'s `ns.n.k = 7 (namespaced)`, both modes; the guard spec's fourth | 1: `eval.service.scope-this.spec.ts`' "should write a property onto the scope's object, not onto thisArg" |
  | P3-2 | supplement 11's, byte-identical: any original the context branch chose is written through `set`, a plain object too | 9 | `Y`'s `the copy`, case-sensitive | 8: step 3's |
  | P3-12 | supplement 11's, byte-identical: any `Registry` the context branch chose is written through its map | 4 | `Y`'s two `another Registry` rows, both modes; 0 at step 3, where no row held it | none |

  Every new case is red under at least one probe, checked case by case; each red set's names are as
  many as Jest's failed cases. Rows of `J` and `Y` that share a source with another row of their
  group carry a `label` in their case's name; without it a comparison by name missed two red cases
  (code-at-6086872, 33 names for 35 failed), caught by the runner's check before pinning.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `git grep -n "backlog.md#a51\|A49–A51 are open\|never reachable as one\|reads back \`2\` in both modes\|does not hold is still refused"`
  at 6086872, its last pattern short enough to survive the line wrap in A50's entry. Rewritten:
  every A51 link, `CLAUDE.md`'s sentence, A56's sentence, A50's retired entry's sentence, and this
  document's Step 3 claim row. Kept: A51's own "never reachable as one", history, under its
  *Corrected* paragraph, which quotes it; A50's *Corrected* paragraph, which quotes its old words;
  A56's sentence, now scoped to a plain object.
- **Criterion**: the staged diff's hash; the gate green, `eval-core` 3519 (3467 + 52), `eval-signals`
  450, `eval-forms` 386; doc-links 0 dangling; every probe's red set as the table gives it;
  `sha256sum -c` on supplement 12's `SHA256SUMS.txt`; the register's live rows 18.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`.
- **Outcome**: measured first in the sandbox: the gate `eval-core` 3519, `eval-signals` 450,
  `eval-forms` 386; doc-links 0 dangling; the probes' red sets as the table gives them. The commit's
  body records the run on the maintainer's checkout and the code review.

### Step 5 — A49, a documented limit

- **Place, don't draft.** The step's whole change is pinned as `step-5/step-5.patch` in supplement 15,
  its SHA-256 given in the prompt, placed as step 4's was ([SR36](../standing-rules.md#sr36)), the
  staged diff that `step-5/staged-diff.sh` prints hashing to the pinned patch's SHA-256.
- **No code.** Comments and JSDoc only: `EvalContext`'s `lookups` states the limit for a lookup, and
  `getThis` for the getter it reads, both in the published `.d.ts`; `resolveMemberTarget`'s JSDoc points A49 at `docs/backlog-retired.md` and says an
  `EvalScope` is refused, by `safeSetProperty` (A51), where it said "written as an object" (step 4's
  review, Important).
- **Measured first** ([SR19](../standing-rules.md#sr19), [SR44](../standing-rules.md#sr44)), on the
  production bundles of 0.15.1 (`B8BAED38…AFDA24E4`) and the step 4 code (`47A03308…0E25C1BA`), the
  same on each (`a49.mjs`, 394 rows, `results/a49-*.txt` in supplement 15): twenty expression forms
  against a getter on the context, a lookup, a getter on a global prior scope's object and one on a
  scope pushed with the mode's options and without any, both modes, each without and with a read hook registered, and JavaScript's counts
  by `with`. The README's "two kinds of read remain beyond JavaScript's" was false twice over:
  without a hook, a getter on a global prior scope's object is called twice by `this.g`
  case-sensitively and three times under `caseInsensitive`, and a getter through `this` twice by
  `this.g`, `this.g++`, `this["g"]`, `this.g()` and the logical forms; with a read hook, every
  identifier read resolves its key again, so `x += 1` under `caseInsensitive` calls a lookup three
  times, not the README's two, and case-sensitively a plain `g` calls a getter on the context twice. A read through `this` is the same
  with a hook.
- **The wording** (D5, [SR44](../standing-rules.md#sr44)), in the README's `AssignmentExpression`
  entry: "How many times an expression calls a getter on the context or on a scope's object, or a
  lookup, is not part of the contract: one can run where JavaScript reads nothing, or more than once
  for one read, and a registered read hook can add a call. Case-sensitively, with a getter `g` on the
  context, `this.g = 1` calls it once, where JavaScript calls none." No count is promised beyond that
  one example, which is the same with a hook; the lookup counts are dropped, and the `lookups` JSDoc
  states the limit without them.
- **The maintainer's decision** (2026-11-06): step 4's review's third finding, the natives that write
  an `EvalScope` past A51's refusal, opened as [A61](../backlog.md#a61), Open, not scheduled.
  Measured on 0.15.1 and the step 4 code, the same on each, both modes (`assign.mjs`,
  `results/assign-*.txt`): `Object.assign`, an alias of it, `Reflect.set` and `Object.defineProperty`
  write the scope's fields when the host places them in the context; a host's own function does too,
  which no check reaches.
- **Step 4's carry-overs** ([SR4](../standing-rules.md#sr4)): the `resolveMemberTarget` JSDoc, above;
  the register's Work in flight named Revision 3, now Revision 5; A51's retired entry is corrected:
  "reaches its fields" is closed for a member write only, the rest A61. Step 4's kill-list searched
  for the link to A51 and missed an unlinked "(A51)"; this step's searches for the ID in words as well.
- **The records.** A49 retired, *decided: a documented limit*: its index row re-pointed, its entry
  moved to `docs/backlog-retired.md` with a *Decided* paragraph. A61 opened. The *Unreleased* history
  row, 16 live before, 7 opened, 5 closed, 18 after, and the totals row 42, 80, 104, 18. Every link to
  A49 re-pointed: the three `CHANGELOG.md` files (released sections; the A45 plan's step 7 re-pointed
  one the same way), `docs/README.md`'s row, `docs/a45/plan.md`'s seven, this document's one, and the
  register's own six, in Work in flight, the release table's three rows, A49's index row and A57.
  `CLAUDE.md`'s "A49 is open" corrected. D5's pointer to the README passage corrected. The skill's
  count.
- **The file list** (§ 4's table, corrected in this step, [SR3](../standing-rules.md#sr3)): beyond
  what Revision 4's row named, `member-expression.ts`' JSDoc, `docs/backlog-retired.md`,
  `docs/README.md`, `docs/a45/plan.md`, `CLAUDE.md`, and the `eval-signals` and `eval-forms`
  CHANGELOGs, for their links. The "witness spec" is `assignment-target.spec.ts`' `Q` group.
- **The CHANGELOG**: `### Changed`, the README's limit, documentation only.
- **Rows** ([SR27](../standing-rules.md#sr27)), **+8**, `eval-core` 3519 → 3527:
  `assignment-target.spec.ts`' group `Q`, a getter on a global prior scope's object, two rows in both
  modes: `this.g`, called twice case-sensitively and three times under `caseInsensitive`; `g += 1`,
  once and twice, the write not reaching the scope. A prior scope is the evaluator's, so `js` is
  `none`. Two rows with a read hook registered, by a new `withReadHook` wrapper, each labelled
  `a read hook`: `L`'s `x += 1`, a lookup called twice case-sensitively and three times under
  `caseInsensitive`, JavaScript once; `C`'s `g`, a getter called twice case-sensitively, JavaScript
  once, and under `caseInsensitive` read only when the context is copied. The rows held under A49,
  `C`'s `this.g = 1` and `this.g += 1` case-sensitively and `L`'s three under `caseInsensitive`, are
  re-marked `design: A49, a documented limit…`; `Hold.under` is `'A56'` alone. Every existing
  outcome is as at 1112ea2; only the marks move.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)):

  | Claim (README, CHANGELOG) | Rows | Probes |
  | :--- | :--- | :--- |
  | a getter or lookup can run where JavaScript reads nothing: case-sensitively `this.g = 1` calls `g` once | `C`'s `this.g = 1`, case-sensitive; `L`'s `x = 1` and `X = 1` under `caseInsensitive` | P5-1; P5-3 |
  | or more than once for one read | `C`'s `this.g += 1`; `L`'s `x += 1` under `caseInsensitive`; `Q`'s two | P5-1; P5-3; P5-2, P5-4, P5-5 |
  | a registered read hook can add a call | `L`'s and `C`'s `a read hook` rows | P5-6 |
  | (CHANGELOG) of the README's old counts only `x += 1` moves with a hook, to three; case-sensitively a plain `g` calls a getter on the context twice | the same | P5-6; P5-3; P5-4 |
  | (A49's entry) under `caseInsensitive` a getter on the context is read when the context is copied | `C`'s three under `caseInsensitive` | P5-7 |
  | (CHANGELOG) a getter on a global prior scope's object, `this.g` three times under `caseInsensitive` | `Q`'s `this.g` | P5-2; P5-5 |

- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)), each a pinned patch
  against the step's tree in supplement 15, applied alone, every `eval-core` case read, reverted, and the
  tree checked clean ([SR32](../standing-rules.md#sr32)):

  | Probe | The wrong implementation | Red, of 3527 | Step 5's rows | Existing rows |
  | :--- | :--- | ---: | :--- | :--- |
  | P5-1 | `getThis` tests the original by presence, not by its value (D5's rejected fix) | 23 | `C`'s `this.g = 1` and `this.g += 1`, both modes | 19: `H`'s eleven, `S`' four under `caseInsensitive`, `R`'s `this.x = 1` under `caseInsensitive`, W4 and W9, and Q8 |
  | P5-2 | `getThis` tests a prior scope by presence | 6 | `Q`'s `this.g`, both modes | 4: W8 and W9, both modes |
  | P5-3 | `resolve` calls each lookup twice | 6 | `L`'s three under `caseInsensitive`, and its `x += 1 (a read hook)`, both modes | 1: `L`'s `x += 1`, case-sensitive |
  | P5-4 | `getKey` answers a global prior scope's key by presence, without reading it | 3 | `Q`'s two under `caseInsensitive`; `C`'s `g (a read hook)`, case-sensitive | none |
  | P5-5 | `resolve` reads each prior scope twice | 4 | `Q`'s two, both modes | none |
  | P5-6 | a read hook's event keeps the name as spelled, not resolving its key again | 14 | `L`'s `x += 1 (a read hook)`, both modes; `C`'s `g (a read hook)`, case-sensitive | 11: `read-hooks.spec.ts`' eight under `caseInsensitive`, the dependency tracker's, `performance.spec.ts`' read-emission guard, and the colon-joined names' hook criterion |
  | P5-7 | under `caseInsensitive` a context holding an accessor is not copied | 9 | `C`'s `g (a read hook)`, `this.g = 1` and `this.g += 1` under `caseInsensitive` | 6: `C`'s `g = 1` and `G`'s four under `caseInsensitive`, and Q8 |

  Every new or re-marked case is red under at least one probe, checked case by case; each red set's
  names are as many as Jest's failed cases. P5-5 was added when `Q`'s `g += 1`, case-sensitive, was
  red under no other, P5-6 for the rows with a read hook, and P5-7 when `C`'s `g (a read hook)` under
  `caseInsensitive` was red under none of P5-1 to P5-6.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `git grep -n "backlog.md#a49\|(#a49)\|Two kinds of read\|written as an object (A51)\|at Revision 3, steps\|A49 is open\|reaches its fields\|calls it once and\|x += 1\` twice"`
  at 1112ea2. Rewritten: every A49 link, the README's passage, the JSDoc's sentence, Work in flight,
  `CLAUDE.md`'s sentence, D5's pointer, and the lookup counts in the README and the `lookups` JSDoc.
  Kept: the `getThis` JSDoc's `this.g = 1` once and `this.g += 1` twice, the same with a hook; the
  CHANGELOG's quotation of the old counts; A51's title, "reaches its fields", history, which its
  *Corrected* paragraph now scopes; D5's quotation of the passage it replaced.
- **Criterion**: the staged diff's hash; the gate green, `eval-core` 3527 (3519 + 8), `eval-signals`
  450, `eval-forms` 386; doc-links 0 dangling; every probe's red set as the table gives it;
  `sha256sum -c` on supplement 15's `SHA256SUMS.txt`; the register's live rows 18.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`.
- **Outcome**: supplement 13's placement matched its hash, its tree, its gate (3523 / 450 / 386) and
  its five red sets, and its code review stopped the commit on an Important finding the stop rule
  names: the README's "`x += 1` twice", a shipped sentence false with a read hook, measured on the
  bundle; with three more places of the same error, the `lookups` JSDoc, the CHANGELOG's "examples
  stand" and A49's entry, and four Minors: a pushed scope's getter, unnamed (now "a scope's object");
  "beyond JavaScript's" for a prior scope, which JavaScript has not (now "more than once for one
  read"); `Q`'s docblock, true under `caseInsensitive` only (rewritten); and the JSDoc's reach to the
  `.d.ts`, unstated (stated). Decided (b): no count promised, the hook stated, rows added for it.
  Supplement 14 pinned the step again; its placement matched its hash, tree, gate (3527) and seven red
  sets, and its code review stopped the commit on one Important the stop rule names: the CHANGELOG's
  "Those counts hold without a read hook only", false for three of the four counts it quoted, only
  the lookup's `x += 1` moving with a hook. Its Minors: "a plain `g`" without a mode or holder
  (now case-sensitive, on the context); A49's entry's "a scope the host pushes", copied only when
  pushed with `caseInsensitive` (corrected); `withReadHook`'s block placed between
  `contextAccessor`'s docblock and its declaration (moved); and 14 stale `docs/backlog.md` A44 and A45
  pointers in nine `eval-core` files, older than this step, carried to step 6 ([SR3](../standing-rules.md#sr3)).
  Supplement 15 pins the step again. Measured in the sandbox on the final tree: the gate `eval-core`
  3527, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; the probes' red sets as the table
  gives them. The commit's body records the run on the maintainer's checkout and the code review.

### Step 6 — the downstream rows and F29

- **Place, don't draft.** The step's whole change is pinned as `step-6/step-6.patch` in supplement 16,
  placed as step 5's was ([SR36](../standing-rules.md#sr36)), the staged diff that
  `step-6/staged-diff.sh` prints hashing to the pinned patch's SHA-256.
- **No code.** Specs, comments and records only. No package moves for this step, and no CHANGELOG:
  the downstream packages' entries for 0.9.0 are the release step's. (`getThis`' reflowed JSDoc
  reaches `eval-core` 0.16.0's `.d.ts`, which the A49 bullet covers; corrected in step 7.)
- **The downstream rows** ([SR24](../standing-rules.md#sr24), § 3.6), from the prototype's
  `downstream.txt`, each first run on this tree and then on 0.15.1's `eval-core` code
  (`code-at-9e88d18.patch`, the published 0.15.1's non-spec `eval-core` sources over this tree):
  - `eval-signals`, `eval-signal.spec.ts`' new block "eval-core 0.16.0 through a signal", six cases in
    both modes, **+12**: an inherited getter that throws, `x.t`, under the default policy, which
    throws `boom`, under `'undefined'`, which reads `undefined`, and under a function policy, which
    sees the error; a prototype accessor read by `c.g + 1`, called once; `this.k = 5` and a write
    to an `EvalScope` held as a value, `ns.k = 5`, each refused as the signal context's own
    `SignalContextWriteError`, kind `member`, key `k`, before `eval-core`'s refusal, with
    `onError: 'undefined'` set, the scope's context unwritten.
  - `eval-forms` `/reactive`, `field-schema.spec.ts`' new block "a getter that throws, under each
    policy", three cases, **+3**: over a control holding an inherited getter that throws, `text:
    'user.t'` renders `''` under the default policy, throws `boom` under `'throw'`, and gives
    `handled:boom` to a function policy.

  On 0.15.1's code **7 of the 15 are red**: the getter's throw and the function policy in both modes,
  the accessor's single call under `caseInsensitive`, and `/reactive`'s `'throw'` and function policy.
  The rest pin what 0.16.0 leaves: `'undefined'`, a single call case-sensitively, the two refusals, and
  `/reactive`'s default. The fixture is an **inherited** getter: measured on the 0.15.1 and step 4
  bundles (`ci55.mjs`, `results/ci55-*.txt`), under `caseInsensitive` an own getter's throw already
  reached the caller on 0.15.1, through the case-variant search, and an inherited one's did not when
  read as spelled, `x.t`, though it did by a case variant, `x.T` (corrected in step 8); with
  an own getter the `caseInsensitive` rows were green on 0.15.1, pinning nothing that changed. The
  CHANGELOG's A55 bullet already says so.
- **F29** ([its entry](../backlog-retired.md#f29)): two cases, one per adapter, a rule that does not
  parse registered under a function policy, asserting the parse error's message
  ([SR18](../standing-rules.md#sr18)), **+2**: `/reactive`'s `readme-examples.spec.ts`,
  `'country ==='`, `Unexpected token (1:11)`; `/signals`' `rules.spec.ts`, `'city ==='` through
  `evalText`, `Unexpected token (1:8)`, from `form()`. Green on 0.15.1's code as well: the parse ran
  outside the policy then too.
- **Step 5's carry-overs** ([SR4](../standing-rules.md#sr4)):
  1. **The review's Important**, the read-hook leg of the README's one example and of the CHANGELOG's
     unchanged counts, pinned: `assignment-target.spec.ts`' `C` gains `this.g = 1 (a read hook)` and
     `this.g += 1 (a read hook)`, and `L` gains `x = 1 (a read hook)`, both modes, **+6**,
     `eval-core` 3527 → 3533; each with a probe that adds a call only when a read hook is set, P6-3
     on the `=` context branch, P6-5 on the read path, P6-4 on an identifier write's key.
  2. **Minor 1**: `C`'s `g (a read hook)` under `caseInsensitive` was marked `copied`, a write's mark;
     a read's, `copiedRead`, is added.
  3. **Minor 2**: `docs/README.md`'s A48 row, its "and its step 4 …, and its step 5" chain.
  4. **Minor 3**: `getThis`' JSDoc, a short line left by step 5's edit, reflowed; and it states that
     its example is the same with or without a read hook, which the new rows pin.
  5. **Supplement 14's review, Minor 4**, 14 `docs/backlog.md` A44 and A45 pointers in nine
     `eval-core` files: not changed. The [A45 plan](../a45/plan.md) (its reading 6) left source
     comments citing `docs/backlog.md` A44, A45 and A52 by ID on purpose, "which the index still
     resolves": each ID's index row links to its retired entry. The step first re-pointed them, and
     reverted that when its kill-list found the decision.
- **The records.** F29 retired, tests only: its index row re-pointed, its entry moved to
  `docs/backlog-retired.md` with a *Fixed* paragraph. The *Unreleased* history row, 16 live before, 7
  opened, 6 closed, 17 after, and the totals row 42, 80, 105, 17; the register's live rows **17**.
  Every link to F29 re-pointed: the register's three, `docs/README.md`'s, this document's,
  `docs/documentation/phase-11-plan.md`'s two, and `docs/backlog-retired.md`'s one, in F28's entry.
  `CLAUDE.md`'s "A48, A50, A51 and A55 fixed" gains F29. Work in flight; the skill's counts.
- **The file list** (§ 4's table, corrected in this step, [SR3](../standing-rules.md#sr3)): beyond the
  downstream specs, the register, the skill and this document, `assignment-target.spec.ts` and
  `eval-context.ts`' JSDoc (step 5's carry-overs),
  `docs/backlog-retired.md`, `docs/README.md`, `docs/documentation/phase-11-plan.md` and `CLAUDE.md`.
- **Rows** ([SR27](../standing-rules.md#sr27)): `eval-core` **+6**, 3527 → 3533; `eval-signals`
  **+12**, 450 → 462; `eval-forms` **+5**, 386 → 391.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)):

  | Claim | Rows | Probes |
  | :--- | :--- | :--- |
  | (eval-core CHANGELOG, A55) a getter's throw reaches the caller, in both modes; through `eval-signals`, under its default `'throw'` and a function policy | `eval-signals`' A55 rows | code-at-9e88d18 |
  | (the same) through `/reactive`'s `'throw'` and function policy; its default still renders `''` | `/reactive`'s three | code-at-9e88d18; P6-9 |
  | (the same) `'undefined'` still reads `undefined` | `eval-signals`' `'undefined'` rows | P6-6 |
  | (eval-core CHANGELOG, A48) one call to a prototype accessor for one read under `caseInsensitive`; case-sensitively as before | `eval-signals`' A48 rows | code-at-9e88d18; P6-8 |
  | (P-1) the signal context's write policy is asked before `eval-core` refuses a write to the context or to an `EvalScope` | `eval-signals`' two refusal rows | P6-7 |
  | (eval-forms README) a rule that does not parse throws at registration, whatever the policy | the two F29 cases | P6-1; P6-2 |
  | (eval-core README, CHANGELOG, `getThis` JSDoc) case-sensitively `this.g = 1` calls `g` once, and `this.g += 1` twice, with or without a read hook; under `caseInsensitive` `x = 1` calls a lookup once | `C`'s and `L`'s new `a read hook` rows | P6-3; P6-5; P6-4; P5-7 |

- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)), each a pinned patch
  against the step's tree in supplement 16, applied alone, **all three packages' cases read**, reverted,
  and the tree checked clean ([SR32](../standing-rules.md#sr32)); a new runner, `runprobes6.sh`,
  reads each package in turn and prefixes each red name with its package:

  | Probe | The wrong implementation | Red: core / signals / forms | Step 6's rows | Existing rows |
  | :--- | :--- | ---: | :--- | :--- |
  | code-at-9e88d18 | the published 0.15.1's `eval-core` code: no A55, A48, A50 or A51 fix | 96 / 5 / 2 | `eval-signals`' A55 default and function rows, both modes, and A48 under `caseInsensitive`; `/reactive`'s `'throw'` and function policy | 96, steps 1 to 4's in `eval-core`: `assignment-target.spec.ts`' 57, `member-read.spec.ts`' 36, the guard spec's three |
  | P6-1 | `/signals` parses, guards and compiles inside the closure its policy wraps (F29's M4 probe) | 0 / 0 / 44 | `/signals`' F29 case | 43: the guard's, the compile-once counts', the colon-joined names' |
  | P6-2 | `/reactive` hands a compile error to a function policy and binds its result | 0 / 0 / 1 | `/reactive`'s F29 case | none |
  | P6-3 | the `=` context branch reads the getter once more when a read hook is set | 1 / 0 / 0 | `C`'s `this.g = 1 (a read hook)`, case-sensitive | none |
  | P6-4 | an identifier write resolves its key once more when a read hook is set | 4 / 0 / 0 | `L`'s `x = 1 (a read hook)`, both modes | 2: `L`'s `x += 1 (a read hook)`, both modes |
  | P6-5 | the read path's context branch reads the getter once more when a read hook is set | 1 / 0 / 0 | `C`'s `this.g += 1 (a read hook)`, case-sensitive | none |
  | P6-6 | `eval-signals`' `'undefined'` policy lets an `Error` through | 0 / 3 / 4 | `eval-signals`' `'undefined'` rows, both modes; `/reactive`'s default | 4: `eval-signals`' "should yield undefined in undefined mode", `/reactive`'s "should not inherit eval-signals default of throw", "should resolve a throwing expression to the property default", and the worked example |
  | P6-7 | the signal context's member-write policy refuses no member write, a method only | 0 / 16 / 2 | `eval-signals`' two refusal rows, both modes | 14: the read-only write policy's member writes, in `eval-signal.spec.ts` and `signal-context.spec.ts`, and `eval-forms`' two |
  | P6-8 | a member read reads its property twice | 33 / 1 / 0 | `eval-signals`' A48 row, case-sensitive | 33 in `eval-core` |
  | P6-9 | `/reactive`'s default policy is `eval-signals`' `'throw'` | 0 / 0 / 4 | `/reactive`'s default | 3: as P6-6's `/reactive` three |
  | P5-7 | step 5's, byte-identical: under `caseInsensitive` a context holding an accessor is not copied | 11 / 0 / 0 | `C`'s `this.g = 1 (a read hook)` and `this.g += 1 (a read hook)` under `caseInsensitive`; `g (a read hook)`'s new mark | 8: step 5's |

  Every new case is red under at least one probe, checked case by case; each red set's names are as
  many as Jest's failed cases, per package.
- **Kill-list** ([SR25](../standing-rules.md#sr25)): `git grep -n "backlog.md#f29\|(#f29)\|A51 and A55 fixed$"`
  at 930df59. Rewritten: every F29 link and `CLAUDE.md`'s sentence. Kept: F29's own text, history,
  under its *Fixed* paragraph; the retired file's own `(#f29)`, in F28's entry. A first pattern for
  the `docs/backlog.md` A44 and A45 pointers found the A45 plan's decision to leave them, above.
- **Criterion**: the staged diff's hash; the gate green, `eval-core` 3533 (3527 + 6), `eval-signals`
  462 (450 + 12), `eval-forms` 391 (386 + 5); doc-links 0 dangling; every probe's red set as the
  table gives it; `sha256sum -c` on supplement 16's `SHA256SUMS.txt`; the register's live rows 17.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`.
- **Outcome**: measured first in the sandbox: the gate `eval-core` 3533, `eval-signals` 462,
  `eval-forms` 391; doc-links 0 dangling; the probes' red sets as the table gives them. The commit's
  body records the run on the maintainer's checkout and the code review.

### Step 7 — the timing record

- **Run Claude-side** ([SR28](../standing-rules.md#sr28)), under § 3.7's rule, its file written and
  hashed before the first run (`rules.md`, `ACA3FAA9…E1CDD0`) and pinned with the run in supplement
  17, beside the harness: the prototype's `bench.mjs`, byte-identical (`C1B966FF…`), `run.sh`
  (24 rotations, path-major) and `analyse.py` (the prototype's, its thresholds 18 of 24, and a line
  for § 3.7's +5% test). The sandbox, Linux, no performance cores, Node 26.4.0, one process at a time,
  nothing else running.
- **The bundles**: A, the published 0.15.1 (`B8BAED38…AFDA24E4`); A′ its byte copy; B the production
  bundle of 32dabcd, the tree after step 6 (`71936AEB…7F051264`). N per path is the prototype's
  calibration of A, fixed in the rules file: this sandbox ran about twice as fast as the prototype's
  (A's `read` 457 ns against 998), so a round lasted about 0.1 s, not 0.2 s. The rule was not changed.
- **Run 1**, 2026-11-08 00:10 to 00:25 UTC, 504 processes:

  ```text
  path           A ns |  A/A med   pos |    B med   pos | verdict
  read          456.6 |   -0.64% 11/24 |   -0.67% 10/24 | ok (decides)
  write         512.3 |   -0.33% 11/24 |   -0.19% 11/24 | ok (decides)
  ci-inh       3063.1 |   +1.34% 15/24 |   +1.04% 14/24 | ok (decides)
  ci-proto     3369.8 |   -0.39% 10/24 |   -0.26% 11/24 | ok (decides)
  compound      521.3 |   -0.53%  8/24 |   +0.95% 15/24 | ok (reported)
  cs-inh        458.1 |   -1.44%  9/24 |   -0.60% 10/24 | ok (reported)
  ci-miss     34451.2 |   -0.86% 10/24 |   -1.04% 10/24 | ok (reported)
  run valid | deciding regressions: none
  deciding paths with B median above +5%: none
  ```

  **Valid**: the A/A control's medians lie within ±1.44%, none above the regression test (at most 15
  of 24 positive). **No regression**: B's medians lie between −0.67% and +1.04% on the deciding paths
  and between −1.04% and +0.95% on the reported ones, at most 15 of 24 positive where 18 are needed. A
  valid run decides, so no second run; the release goes ahead on the timing. The prototype's two runs
  were void at a noise floor of about ±4% (finding 11); this run's control stayed within ±1.44%.
- **Memory arm**: none, as § 3.7 states, from the patches.
- **Step 6's review** ([SR4](../standing-rules.md#sr4)), its four Minors: § 4's row and the skill said
  step 6 shipped in no package, but `getThis`' JSDoc reaches `eval-core` 0.16.0's `.d.ts`, which the
  A49 bullet already covers, and the skill said step 6 was `eval-signals` and `eval-forms` only
  (both corrected); F29's retired heading lacked the "— **Retired, fixed**" its neighbours carry
  (added); F29's *Fixed* paragraph named two of the three groups P6-1 turns red, leaving out the
  colon-joined names' (added); and no blank line before `### Step 6` (added).
- **Rows**: none, 3533 / 462 / 391. **Probes**: none; a timing has no red set. **Review**: the
  `code-reviewer` on the records, which this plan asks for here ([SR33](../standing-rules.md#sr33)): no
  file under `modules/` or `tools/` changes, but the section states figures, each checked against
  supplement 17's `t7/run1/`.
- **Criterion**: the staged diff's hash; the gate green at 3533 / 462 / 391; doc-links 0 dangling;
  `sha256sum -c` on supplement 17's `SHA256SUMS.txt`, the rules file's hash among them.
- **The file list** (§ 4's table, corrected in this step, [SR3](../standing-rules.md#sr3)): beyond this
  document and the skill, the register for Work in flight, `docs/backlog-retired.md` for step 6's
  Minors 2 and 3, and `docs/README.md`'s A48 row, which names each step. (Recorded in step 8, from
  step 7's review, M-1.)
- **Outcome**: run 1 valid, no regression, measured in the sandbox, and the gate 3533 / 462 / 391,
  doc-links 0 dangling. Committed as da73cbd; its body records the placement on the maintainer's
  checkout and the review, whose Important, this bullet, was added in step 8.

### Step 8 — the release commit

- **Place, don't draft.** The step's whole change is pinned as `step-8/step-8.patch` in supplement 22,
  placed as step 7's was ([SR36](../standing-rules.md#sr36)).
- **The versions** (§ 2, D7), in one commit ([SR42](../standing-rules.md#sr42)): `eval-core` 0.15.1 →
  **0.16.0**; `eval-signals` 0.8.0 → **0.9.0**, its peer range on `eval-core` `>=0.15.0 <0.16.0` →
  `>=0.16.0 <0.17.0`; `eval-forms` 0.8.0 → **0.9.0**, the same on `eval-core` and `>=0.8.0 <0.9.0` →
  `>=0.9.0 <0.10.0` on `eval-signals`. Each a minor by behaviour, the floors raised rather than only
  the ceilings, since the forwarded behaviour exists only in 0.16.0 and every earlier `eval-signals`
  requires an earlier `eval-core`.
- **The CHANGELOGs.** `eval-core`'s `[Unreleased]` moves under `[0.16.0] - 2026-11-08`, with a
  summary; `eval-signals` and `eval-forms` gain `[0.9.0] - 2026-11-08`, each stating what reaches it,
  as step 6's rows witness: through a signal a getter's throw, in both modes, and one call to an
  inherited getter under `caseInsensitive`, case-sensitively unchanged; no change to a member write
  seen through a rule, or a signal over a record or a context `createSignalContext` built, whose write
  guard refuses first, A50's `this.k = 5` and A51's `ns.k = 5` among them, while over a caller's
  `EvalContext` both reach a signal; at `/reactive` the getter's throw under `'throw'` and a function
  policy, the default unchanged. 2026-11-08 is npm's expected UTC date; step 9 corrects a heading that
  differs.
- **The `.d.ts` files** (§ 5), the gate's build against the published tarballs (`npm pack`), in
  supplement 22's `results/`: `eval-core`'s differs from 0.15.1's in two JSDoc blocks, `lookups`' and
  `getThis`', 21 lines, and in no declaration; `eval-signals`' one and `eval-forms`' three are
  byte-identical to 0.8.0's. No shipped code of either downstream package changes since 67486ab: its
  diff there is specs and two CHANGELOG links.
- **The READMEs.** `eval-signals`' Install and `eval-forms`' Install and Versions quote the new ranges
  and give the reason for each floor, keeping the earlier ones as history. No link is added, so
  `tools/published-links.txt` does not change.
- **The records.** The six entries' status, in the index and in `docs/backlog-retired.md`: "released in
  `eval-core` 0.16.0, pending publish" for A55, A48, A50, A51 and A49; F29 is unchanged, tests only. The
  *Unreleased* history row names the release; its counts do not move, 17 live. Work in flight gains the
  release paragraph. `CLAUDE.md`'s plan sentence: released, pending publish. The skill's step 8 line.
- **Step 7's review** ([SR4](../standing-rules.md#sr4)): its Important, step 7's missing **Outcome**,
  added, so the skill's step state reads step 7 done; its Minors: § 4's row 7 says "the register"
  where it said `docs/backlog.md`, and step 7's section records why its list grew; the two unwrapped
  lines reflowed, F29's *Fixed* paragraph and step 7's No-regression bullet; the tree hash, confirmed
  on the checkout, needs nothing.
- **The file list** (§ 4's table, corrected in this step, [SR3](../standing-rules.md#sr3)): beyond the
  manifests, the CHANGELOGs, the register, `CLAUDE.md`, the skill and this document, the `eval-signals`
  and `eval-forms` READMEs, which quote the ranges, `docs/backlog-retired.md`, which holds the five
  entries' status and step 7's Minor, and `docs/README.md`'s A48 row, which names each step.
- **Supplement 18's review, a stop** (the stop rule, [SR4](../standing-rules.md#sr4)): its Critical,
  C1, `eval-core`'s A55 bullet, written in step 2 and shipped by this step's dated heading, said that
  under `caseInsensitive` "an own getter already threw, and an inherited one was swallowed". On 0.15.1
  an own getter's `let {t} = x` was swallowed under `caseInsensitive` too (`member-read.spec.ts`' row
  `let {t} = x; 1 · own`, red on `code-at-9e88d18`; cited in supplement 19 as
  `assignment-target.spec.ts`', corrected in supplement 20), and, its I1, an inherited getter read by
  a case variant, `x.T`, already threw (`ci55-v0151.txt`). Supplement 19's bullet named each: a member
  read of an own getter, and of an inherited one by a case variant, threw; an inherited one read as
  spelled, and a destructuring read in both modes, was swallowed (superseded below, in supplement 20).
  Its I2, `eval-signals`' README, made the same claim unscoped: it now names the fixture its rows run,
  `x.t` over an inherited getter and `c.g + 1`, and points to `eval-core`'s CHANGELOG for the other
  paths; that package's CHANGELOG says "a member read of an own getter". Its Minors: `eval-forms`'
  headline says `/reactive`, where its rows run; the register's release paragraph names
  `eval-signals`' Install alone, which has no Versions; `eval-forms`' "0.16.0 keeps" sentence moved
  after the history it refers to; step 7's No-regression bullet reflowed; `docs/README.md`'s A48 row
  gains step 8, and the file list it. Pinned again as supplement 19. My check of step 2's text was
  against its own words, not the red set; the red set had the destructuring row.
- **Supplement 19's review, a second stop**: four shipped sentences false on a path they name, each
  measured on the published 0.15.1 bundle and the 0.16.0 build (supplement 20's `a55paths.mjs`,
  `results/a55paths-*.txt`). C-A: the summary's "a write through `this` to a `Registry` reaches its
  map", false for a prior scope's `thisArg` that is another `Registry` (group `Y`, held under A56) and
  for a key the original does not hold. C-B: "`x.t += 1` or `x.t++` failed later, at the write", true
  only where `t` has no setter; with one, 0.15.1 wrote `NaN` through it. C-C: "a member read already
  threw for an own getter", false for an index, `x[0]`, where `x["0"]` threw; and "an inherited one
  read by a case variant", false for a getter two prototypes up. C-D: `eval-forms`' README's `''`,
  which only a `text` rule renders. I-1: the summary stated a call count. So supplement 20's summary
  stopped restating the bullets, naming what changes and leaving each path to its bullet, and its A55
  bullet said, by its fixture and its mode, what 0.15.1 did, claiming under `caseInsensitive` only the
  reads measured; `eval-signals`' headings named `c.g` and a getter's throw (both scoped again below).
  Its Minors: this section's row citation, the reflow, and the README's "keep" sentence naming both
  packages. Pinned again as supplement 20. The rule I took from it: a sentence stating what a release
  did before is checked against every shape the measurement varies, setter, index and prototype depth
  among them, not against the rows' fixture alone.
- **Supplement 20's review, a third stop**: its Critical, the downstream CHANGELOGs' "its other
  changes reach an expression too" and "reach a rule too", false for `eval-core`'s two member write
  changes: as that review read it, a signal context's write guard refuses a member write to an object
  the evaluation did not create first, so neither A50's `this.k = 5` nor A51's `ns.k = 5` reaches a
  rule, or a signal over a record (over a caller's `EvalContext` both do: the fourth stop, below)
  (`eval-signal.spec.ts`' two refusal rows; both forms adapters build their context with
  `createSignalContext`). Supplement 21's two sentences said that release's member read changes reach
  a read, `eval-forms`' adding the `caseInsensitive` ones at `/signals` only, and its member write
  changes do not (`eval-signals`' superseded below, in supplement 22). Its Important, `eval-core`'s
  A48 *Fixed* heading, stated a call count for every member read; under `caseInsensitive` `this.g`
  through a global prior scope's object still calls its getter three times. Supplement 21's heading
  named `c.g`, and its body said each form it lists calls the getter once, measured at one and two
  prototypes up and for a proxy's `get` trap (supplement 21's `a48count.mjs`,
  `results/a48count-*.txt`: 2 calls to 1 under `caseInsensitive`, 1 to 1 case-sensitively). Its
  Minors: A50's heading says "for a key it holds", and the stop above is in the past tense. The same
  pass scoped A51's heading to "is refused", since a blocked key or a write policy refuses with its
  own error, and A55's headings, both summaries and both READMEs' floor sentences to a member read,
  the path the rows measure. Pinned again as supplement 21. The rule from this one: a sentence that
  says what reaches a package names the paths that do not.
- **Supplement 21's review, a fourth stop**: its Critical, `eval-signals`' sentence that its member
  write changes do not reach a signal, false over an `EvalContext` the caller built, which
  `createEvalSignal` hands to the walk unchanged, without `createSignalContext`'s guard. Measured
  through `createEvalSignal` itself ([SR40](../standing-rules.md#sr40)), on 0.8.0's published bundle
  over 0.15.1's and on this tree's two (supplement 22's `callerctx.mjs`, `results/callerctx-*.txt`),
  in what it reported as both modes, though it passed the mode as `EvalSignalOptions`, which
  `createEvalSignal` does not read, so both runs were case-sensitive (corrected in step 9: rerun with
  `{ eval }` and a mode check, both modes give the same results, supplement 23's
  `results/callerctx-*.txt`): over a caller's context `this.k = 5; k` over a host's `Registry` holding
  `k` read 1 and set an own `k` on 0.15.1, and reads 5 from the map on 0.16.0; `ns.k = 5` over an
  `EvalScope` set an own `k` and now throws `Write to an evaluation scope is blocked`, which the
  signal's `onError` handles (`onerror.mjs`); over a record both throw `SignalContextWriteError`, as
  before. The sentence now names both contexts. Its I2, "before `eval-core` sees it", wrong as a
  mechanism, since `eval-core`'s visitors ask the guard: "first". Its I1, the register's release
  paragraph and this section's CHANGELOGs bullet, scoped the same way; its Minor, the third stop's
  "Both sentences", corrected. `eval-forms`' sentence is unchanged: both adapters build their context
  with `createFieldContext`, which calls `createSignalContext`, and neither takes a caller's. Pinned
  again as supplement 22.
- **Rows**: none, 3533 / 462 / 391. **Probes**: none; the step changes no behaviour, and step 6's rows
  are the downstream witnesses ([SR24](../standing-rules.md#sr24)).
- **Criterion**: the staged diff's hash; the gate green at 3533 / 462 / 391, its lint reading each peer
  range against the workspace version; doc-links 0 dangling; release-tags 0 failing; `sha256sum -c` on
  supplement 22's `SHA256SUMS.txt`.
- **Review**: the `code-reviewer` ([SR33](../standing-rules.md#sr33)): the step changes files under
  `modules/`.
- **Outcome**: measured first in the sandbox: the gate 3533 / 462 / 391, doc-links 0 dangling,
  release-tags 0 failing; the `.d.ts` diffs as above. The commit's body records the run on the
  maintainer's checkout and the code review. Publishing and tagging are the maintainer's; step 9 is
  the post-publish record.

### Step 9 — the post-publish record

- **Place, don't draft.** The step's whole change is pinned as `step-9/step-9.patch` in supplement 23,
  placed as step 8's was ([SR36](../standing-rules.md#sr36)).
- **The publish.** All three on npm, by the maintainer (time, UTC): `eval-core` 0.16.0 at
  2026-11-08T15:49:16.309Z, `eval-signals` 0.9.0 at 16:00:25.804Z and `eval-forms` 0.9.0 at
  16:05:57.385Z, so every CHANGELOG heading's 2026-11-08 stands and nothing under `modules/` changes.
  An `npm publish` of `eval-core` reported `E409`, "Cannot publish over previously staged version", 32
  seconds before the registry's time for 0.16.0; `npm stage list` then showed nothing staged, and the
  registry lists 0.16.0 published by the maintainer's account. Each published tarball was compared
  with this sandbox's build of 7d9d488's tree: every `.mjs` and `.d.ts`, and each `package.json`,
  byte-identical; README, CHANGELOG and LICENSE differing only by CRLF; each of the five source maps
  only by CRLF in its embedded sources (supplement 23's `results/published-vs-build.txt`);
  `eval-forms`' build holding three files npm leaves out, as since 0.6.0. `eval-core`'s bundle is the
  one step 7 timed, `71936AEB…`.
- **The tags**, written and pushed by the maintainer, annotated, each peeling to 7d9d488, in the
  previous releases' message form: `eval-core@0.16.0` (tag object 0e4ae0d), `eval-signals@0.9.0`
  (e23c123), `eval-forms@0.9.0` (c0d1c32).
- **The register.** Publication status gains the three rows, first; its tag paragraph reads fifty-five
  and sixty-five. The release's history row has its tag commit and date; a new *Unreleased* row opens
  F31, 17 → 18. A55, A48, A50, A51 and A49 say released 2026-11-08, tagged 7d9d488, in the index and
  in `docs/backlog-retired.md`. Work in flight: the pending-publish paragraph goes, and the plan's says
  step 10 is next. `CLAUDE.md`'s "Published at" moves to 0.16.0, 0.9.0 and 0.9.0. `docs/README.md`'s
  A48 row gains step 9. The skill's step 9 line names the tags.
- **Step 8's last review** ([SR4](../standing-rules.md#sr4)), carried: its I1 and I2, `callerctx.mjs`
  run case-sensitively twice, rerun with `{ eval }` and a mode check (`K` over `{ k: 7 }` reads `7`
  under `caseInsensitive` and `undefined` case-sensitively), both modes giving the earlier results on
  0.8.0 over 0.15.1 and on 0.16.0, so the shipped sentences stand; the fourth stop's bullet corrected.
  Its M3: [F31](../backlog.md#f31) opened, A55 at `eval-forms`' `/signals` witnessed by no row. Its M4:
  the second and third stops' bullets in the past tense. Its M1, "first" read with "create" in both
  downstream CHANGELOGs, and M2, `eval-signals`' README floor sentence naming no entry point: wording in
  published text, not false on a path it names; left for each package's next release. The pinned
  message's "typo" was the prompt's: the patch hash ends `…3a4bca81`, as the commit says.
- **Rows**: none, 3533 / 462 / 391. **Probes**: none. **Review**: none of
  [SR33](../standing-rules.md#sr33)'s, since no file under `modules/` or `tools/` changes.
- **Criterion**: the staged diff's hash; the gate green at 3533 / 462 / 391; doc-links 0 dangling;
  release-tags 55 rows, 65 tags, all annotated, 0 failing; `sha256sum -c` on supplement 23's
  `SHA256SUMS.txt`.
- **Outcome**: measured first in the sandbox, after fetching the tags: the gate 3533 / 462 / 391,
  doc-links 0 dangling, release-tags 55 rows, 65 tags. The commit's body records the run on the
  maintainer's checkout.

### Step 10 — the retrospect

- **Place, don't draft.** The step's whole change is pinned as `step-10/step-10.patch` in supplement
  24, placed as step 9's was ([SR36](../standing-rules.md#sr36)).
- **This document's § 9 and § 10.** § 9 maps each published entry to its witnesses and restates
  none; § 10 records what shipped, the corrections, the probe misses, the twelve review stops and
  their one cause, the process traps, and the rules weighed.
- **The rules** (§ 10.6): [SR45](../standing-rules.md#sr45) new, and § 0's three promoted as
  [SR46](../standing-rules.md#sr46) and [SR47](../standing-rules.md#sr47);
  [SR19](../standing-rules.md#sr19) and [SR40](../standing-rules.md#sr40) amended, each with its
  *Origin* in this document.
- **The records.** No plan is active: `CLAUDE.md`'s two plan sentences, `docs/README.md`'s Active
  plan, which now says none, and the step skill, which names none and stops at its § 1, keeping its
  state rule's note on the Outcome bullet. The plan joins `docs/README.md`'s Completed tracks and
  `CLAUDE.md`'s design records. The register's Work in flight records the plan complete.
  `CLAUDE.md`'s test paragraph names SR45.
- **Rows**: none, 3533 / 462 / 391. **Probes**: none. **Review**: none of
  [SR33](../standing-rules.md#sr33)'s, since no file under `modules/` or `tools/` changes.
- **Criterion**: the staged diff's hash; the gate green at 3533 / 462 / 391; doc-links 0 dangling;
  release-tags 55 rows, 65 tags, all annotated, 0 failing; `sha256sum -c` on supplement 24's
  `SHA256SUMS.txt`.
- **Outcome**: measured first in the sandbox: the gate 3533 / 462 / 391, doc-links 0 dangling,
  release-tags 55 rows, 65 tags. The commit's body records the run on the maintainer's checkout. The
  plan is complete.

## 5. Public API surface

No export changes shape ([SR12](../standing-rules.md#sr12)); behaviour changes as § 2 says, so the
release is a minor. Step 8 diffs each `.d.ts` against the published 0.15.1, 0.8.0 and 0.8.0 tarballs.

## 6. Verification gates

[SR8](../standing-rules.md#sr8) after every step, on the committed tree. Counts move by step 1's 30
`eval-core` cases, step 2's 86, step 3's 48, step 4's 52, step 5's 8, step 6's 6, `eval-signals` by step 6's 12 and `eval-forms` by its 5, and by what each later step's prompt fixes before its gate.

## 7. Risks

- **A getter that throws by design.** A host whose getters throw, read in an expression with a fallback
  such as `x.t || 1`, gets the throw from 0.16.0. Named in the CHANGELOG as a breaking change; the
  witness is step 2's characterisation, red on the swallow.
- **A proxy as a member target under `caseInsensitive`.** A key a proxy with no `has` trap answers,
  but its target does not hold, is searched for a case variant on the target's prototype from 0.16.0:
  read under the variant's name, or refused when it is a blocked name. Named in the CHANGELOG as a
  breaking change and recorded as [A59](../backlog.md#a59); the witnesses are step 3's five
  `member-read.spec.ts` rows, red under P3-8.
- **A write to an `EvalScope` by design.** A host that places an `EvalScope` in the context as a
  value and writes to it in an expression gets a throw from 0.16.0, where the write landed on the
  instance and was never read back. Named in the CHANGELOG as a breaking change; the witnesses are
  step 4's `J` rows, red on 6086872's code.
- **Timing on one machine.** The noise floor in the sandbox is about ±4% (finding 11), above the void
  bound; § 3.7's +5% clause decides two void runs. Step 7's one run was valid, its control within
  ±1.44%.

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

Written by step 10, from the code at 7d9d488 and the measurements pinned in supplements 16 to 23.
**The contract is the three published entries, not this section**: `eval-core`'s `[0.16.0]`,
`eval-signals`' `[0.9.0]` and `eval-forms`' `[0.9.0]`, each checked by five reviews against its
paths, and the README passages they name. Restating them here would lose their scope
([SR45](../standing-rules.md#sr45)), so this section maps each to its witnesses and says what it
leaves open.

| Entry | Its witnesses | Its probes |
| :--- | :--- | :--- |
| `eval-core`, A55: a member read lets a getter's or a proxy `get` trap's throw reach the caller | `member-read.spec.ts`' A55 rows, every form, own and inherited, both modes, and the non-`Error` row; `a55paths-*.txt` for the setter, index and depth shapes | Step 2's P2 probes; code-at-9e88d18 |
| `eval-core`, A48: under `caseInsensitive` `c.g` calls an inherited getter once; a proxy's `has` trap; a get-only proxy's case variant | `member-read.spec.ts`' A48 rows; `a48count-*.txt`, depths one and two and a proxy's `get` trap | Step 2's and step 3's; P6-8 |
| `eval-core`, A50: a write through `this` to a `Registry` that is the context's original reaches its map, for a key it holds | `assignment-target.spec.ts`' `H`, `S` and `Y` rows, the original and the copy | Step 3's P3 probes; P4-6 |
| `eval-core`, A51: a member write to an `EvalScope` is refused | `assignment-target.spec.ts`' `J` and `S` rows; the guard spec's four | Step 4's P4 probes |
| `eval-core`, A49: a call count is not the contract | `assignment-target.spec.ts`' `C`, `L` and `Q` rows, with and without a read hook, marked `design` | Step 5's P5 probes; P6-3 to P6-5 |
| `eval-signals`: a getter's throw through a signal; one call under `caseInsensitive`; the write guard first over a record | `eval-signal.spec.ts`' step 6 block, both modes | code-at-9e88d18; P6-6 to P6-8 |
| `eval-signals`: over a caller's `EvalContext` A50 and A51 reach the signal | measured through `createEvalSignal` (`callerctx-*.txt`, supplement 23, both modes with a mode check); no row | none |
| `eval-forms`: at `/reactive` a `text` rule over a getter that throws, under each policy | `field-schema.spec.ts`' three rows | code-at-9e88d18; P6-9 |

**Left open by this contract**: [A54](../backlog.md#a54), [A56](../backlog.md#a56) to
[A61](../backlog.md#a61), unscheduled, and [F31](../backlog.md#f31), A55 at `eval-forms`'
`/signals`, which no row runs. The caller's-context path of `eval-signals` is measured, not pinned
by a row.

## 10. Retrospect

Written in step 10, 2026-11-08 ([SR7](../standing-rules.md#sr7)). Like the A33 plan's, it keeps what
a later plan can reuse. Each step's outcome in § 4 says what that step did.

### 10.1 What shipped

`eval-core` 0.16.0, `eval-signals` 0.9.0 and `eval-forms` 0.9.0, released together at 7d9d488
([SR42](../standing-rules.md#sr42)) and published 2026-11-08: A55, A48, A50 and A51 fixed, A49
decided a documented limit, F29's two cases in no package. Tagged annotated: `eval-core@0.16.0`
(object 0e4ae0d), `eval-signals@0.9.0` (e23c123), `eval-forms@0.9.0` (c0d1c32). Each published
tarball's code, `.d.ts` and manifest are byte-identical to the build of 7d9d488's tree.

- **Closed**: A55, A48, A50, A51, A49 and F29. **Opened**: A55 to A61 by steps 1 to 5, A55 closed
  again in step 2, and [F31](../backlog.md#f31) by step 9. The register's history row reads 16 live
  before, 7 opened, 6 closed, 17 at 7d9d488; the *Unreleased* row after it, 17 → 18.
- **The rows**: 3303 / 450 / 386 to 3533 / 462 / 391. `eval-core` gained 30 in step 1, 86 in step 2,
  48 in step 3, 52 in step 4, 8 in step 5 and 6 in step 6; `eval-signals` 12 and `eval-forms` 5 in
  step 6.
- **The `.d.ts`**: `eval-core`'s differs from 0.15.1's in two JSDoc blocks, `lookups` and `getThis`,
  and in no declaration; the four downstream files are byte-identical to 0.8.0's.
- **The timing**: one valid run, no regression on any of seven paths (step 7).
- **Release tags**: 55 rows and 65 tags at the gate, all annotated.

### 10.2 Plan corrections, by step and revision

The revision is the step's number. The revision lines at the top of this document give each in full;
the pattern across them is the one § 10.4 records.

- **Revision 1, step 1.** Five reviews each stopped the commit on a README sentence about the
  `caseInsensitive` copy or a write through `this`; § 4.1 records each. The passages were cut back
  to the correction [SR31](../standing-rules.md#sr31) needs, and A56, A57 and A58 record the paths.
- **Revision 2, step 2.** § 3.1's CHANGELOG heading corrected to `### Breaking`; step 1's count to
  30.
- **Revision 3, step 3.** The write's test moved from identity to the receiver's origin after
  supplement 10's Critical; step 2's get-only proxy change, measured wider than recorded, stated;
  A59 opened.
- **Revision 4, step 4.** Step 3's two Important points stated and pinned; A60 opened; step 3's
  section corrected.
- **Revision 5, step 5.** Two stops, on the README's counts and then the CHANGELOG's; the passage
  rewritten to promise no count; A61 opened.
- **Revision 6, step 6.** The downstream rows use an inherited getter, since an own one's throw
  already reached the caller under `caseInsensitive`; eight cases red under no probe at first, P6-5
  to P6-9 added.
- **Revision 7, step 7.** The timing record; its Outcome bullet left out, added in step 8.
- **Revision 8, step 8.** Four stops before the fifth placement landed (§ 10.4). § 4's row 8 widened
  to the two downstream READMEs, `docs/backlog-retired.md` and `docs/README.md`
  ([SR3](../standing-rules.md#sr3)).
- **Revision 9, step 9.** The post-publish record; F31 opened; the fourth stop's measurement
  corrected.
- **Revision 10, step 10.** This revision. § 4's row 10 stands as written: a rule stands, so
  `docs/standing-rules.md` changes.

### 10.3 Each probe prediction that missed, and why

Every red set was measured in the sandbox before a supplement was pinned, so no prediction reached
the maintainer's checkout wrong, and every placement's probes matched their pinned sets by name. The
misses were caught there:

| Step | What missed | Why |
| :--- | :--- | :--- |
| 3 | A duplicate test title, `this.k = 5` twice in `H`, hid two red cases from a name comparison | A name comparison counts names, not cases; the runner now checks unique names against Jest's failed count |
| 4 | `J` and `Y` rows sharing a source gave 33 names for 35 failed | Two rows with one source in one group make one case name; rows gained an optional `label` |
| 4 | P4-6 did not compile, and 152 suites failed to run | A probe's suite must compile; the runner checks "Test suite failed to run" |
| 5 | `Q`'s `g += 1` case-sensitively, then `C`'s `g (a read hook)` under `caseInsensitive`, red under no probe | The probes were written from the mechanism, not checked case by case against the new rows; P5-5 and P5-7 added |
| 6 | The A55 rows over an own getter were green on 0.15.1's code under `caseInsensitive` | An own getter's throw already reached the caller there; the fixture became an inherited getter |
| 6 | Eight new cases red under no probe | As step 5's; P6-5 to P6-9 added |

The rules they share stand already: [SR15](../standing-rules.md#sr15), every new check gets a probe
it is seen to fail under, and [SR16](../standing-rules.md#sr16), each probe read case by case. Each
miss was one of them skipped, and caught before pinning.

### 10.4 Reviewer findings that changed dictated text

Twelve placements were stopped by the code review, each on a sentence that ships, or a plan claim,
true of its rows' fixture and false on a path its words reached. Each was measured on a production
bundle before it was rewritten.

| Step | Supplement | The sentence | The path that broke it |
| :--- | :--- | :--- | :--- |
| 1 | 2 to 6 | The README's passages on the `caseInsensitive` copy and a write through `this` | A binding of the same name; a pushed scope; a null-prototype or other-realm object; a `thisArg` the reads also reach; the caller's object reached a second way (§ 4.1) |
| 3 | 10 | The CHANGELOG's "a `Registry` held as a value is written as before" | The original reached as a value, `self.q = 7; self.q` |
| 5 | 13 | The README's call counts | A read hook, which resolves a key again |
| 5 | 14 | The CHANGELOG's "those counts hold without a read hook only" | True of `x += 1` alone |
| 8 | 18 | A55's "an own getter already threw, an inherited one was swallowed", written in step 2 | `let {t} = x` over an own getter; `x.T` over an inherited one |
| 8 | 19 | The summary's `Registry` write; A55's "failed at the write"; "already threw for an own getter"; the forms README's `''` | Another `Registry` as a prior scope's `thisArg`; a setter; an index key; a getter two prototypes up; a `visible` rule |
| 8 | 20 | The downstream "its other changes reach an expression / a rule too"; the A48 heading's count | A member write, refused by the write guard first; `this.g` through a prior scope's object |
| 8 | 21 | `eval-signals`' "its member write changes do not reach a signal" | An `EvalContext` the caller built, passed to the walk without the guard |

The cause is the same each time. The sentence was written from the rows, which run one fixture, and
stated as a rule over every path its words named. The rules standing at the start each cover a part:
[SR44](../standing-rules.md#sr44) a documented limit, [SR19](../standing-rules.md#sr19) an option's
leg, [SR40](../standing-rules.md#sr40) the entry point, [SR21](../standing-rules.md#sr21) a witness
per claim. None says to list the paths a sentence's words reach before it ships, or that a dated
heading ships lines written steps earlier. The fifth placement of step 8 landed when every heading
and summary was scoped to its body's fixture and every reach sentence named the paths that do not
reach. [SR45](../standing-rules.md#sr45) is that practice.

The other findings that changed text: step 3's two Important points, a prior scope's `thisArg`
written through the original's map and a `Registry` `thisArg` that is not the original, stated in
step 4; step 4's Important, `resolveMemberTarget`'s JSDoc; step 5's Important, no row for the
read-hook leg, pinned in step 6; step 7's Important, its missing Outcome (§ 10.5); and step 8's last
I1 and I2, the measurement's modes (§ 10.5).

### 10.5 Process traps

- **The step skill read step 7 as next after step 7.** Its section had no Outcome bullet, and the
  skill reads state from the last one. Step 8 added it. The skill's note now says each step's
  section ends with its Outcome, written in the step's own patch.
- **A measurement reported two modes and ran one.** `callerctx.mjs` passed `{ caseInsensitive }` as
  `createEvalSignal`'s options, which read evaluation options under `eval`, so both runs were
  case-sensitive. The shipped sentences held when rerun with `{ eval }` and a mode check.
  [SR19](../standing-rules.md#sr19) is amended: a measurement that reports a leg checks that the
  option reached the code path.
- **Hand-copied figures in prompts.** Supplement 17's prompt said 18 checksum lines where there were
  19, and step 8's fifth prompt gave a hash ending `…4a4bca81` where the patch's ends `…3a4bca81`;
  the commit body, written by a script, was right. A figure in a prompt is pasted from the command
  that printed it.
- **A publish reported `E409`, and the version was published.** An `npm publish` of `eval-core`
  reported "Cannot publish over previously staged version" 32 seconds before the registry's time for
  0.16.0, and `npm stage list` showed nothing staged. Before a publish is retried,
  `npm view <package>@<version>` says whether it is already up, and a staged version is checked
  against the build before it is approved.
- **Edits during a gate.** Three times a prose edit was made while the sandbox gate ran, and the
  gate was stopped and run again on the final tree, as [SR8](../standing-rules.md#sr8) requires.

### 10.6 Rules weighed

Each candidate was weighed against the failures in §§ 10.3–10.5, and § 0's three rules against the
steps they governed. The rule texts are in `docs/standing-rules.md`, in the file's form, each with
its *Origin* and *Red*.

| Candidate | Decision | Reason | *Origin* in this plan |
| :--- | :--- | :--- | :--- |
| New SR45: a shipped sentence, heading and summary included, claims no more than its witnesses run; its paths are listed from the code and measured; a dated heading's lines are checked again at the release step | **Promote, SR45** | Twelve stops, one cause, and no standing rule asks for the list of paths before a sentence ships | § 10.4 |
| SR40: measured through every entry path the package's README documents | **Amend SR40** | Step 8's fourth stop was a documented entry path the default path's layer does not cover | § 10.4, step 8, supplement 21 |
| SR19: a measurement that reports a leg checks that the option reached the code path | **Amend SR19** | `callerctx.mjs` reported a leg it did not run | § 10.5 |
| P-1: a new write-path refusal says where it runs, relative to the write policy and the right side, and is measured through `eval-signals` | **Promote, SR46** | It held: step 6's refusal rows pin the order, and step 8's fourth stop is the same order from a caller's own context | § 0; § 1.4, finding 9 |
| P-2 and P-3: a figure is read from a pinned file and names it; "the pinned file wins" governs measured facts only | **Promote, SR47**, the two as one | P-2 is a case of P-3: both say where a figure comes from | § 0; § 1.3 |
| A rule for the Outcome bullet | **Declined**, the skill's note instead | It is the skill's own reading rule; the skill says it | § 10.5 |
| A rule for publish retries | **Declined**, recorded here | Publishing is the maintainer's; this section carries it | § 10.5 |
| A rule for figures pasted into prompts | **Declined**, recorded here | Prompts are not in the repository; the habit is the author's | § 10.5 |

SR46 and SR47 are § 0's P-1 to P-3, which held through the plan. SR45 says what it adds to SR44 and
relies on SR23 for the measurement; SR40's amendment and SR45's "every entry point the package
documents" name one check from two sides, the measurement and the sentence, so the amended SR40
cites the stop and SR45 its listing.
