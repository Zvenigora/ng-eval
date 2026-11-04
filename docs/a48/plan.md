# A48–A51, A55 and F29 — member reads and writes that miss the data, and a getter's throw (`@zvenigora/ng-eval-core` 0.16.0)

**Date**: November 3, 2026
**Revision**: 1 — step 1, the plan and its records. The plan is not complete.

Five `eval-core` defects and one `eval-forms` test gap, measured on `9bf1bc8` in a prototype before any code changes:
[A55](../backlog.md#a55), a member read that swallows a throwing getter; [A48](../backlog.md#a48), a member read and a write that disagree on the key under `caseInsensitive`; [A50](../backlog.md#a50), a member write through a `Registry` that lands on the instance; [A51](../backlog.md#a51), a write to an `EvalScope` held as a value that lands on the instance; and [A49](../backlog.md#a49), the context's getter calls, which this plan documents as a limit and does not fix. Two defects found while measuring are registered, not scheduled: [A56](../backlog.md#a56) and [A57](../backlog.md#a57); step 1 corrects the two README sentences they make false. [F29](../backlog.md#f29) rides along as two test cases.

The release is `eval-core` 0.16.0, with `eval-signals` 0.9.0 and `eval-forms` 0.9.0 in the same commit ([SR42](../standing-rules.md#sr42)). The two downstream releases are breaking minors by behaviour: A55 changes what their consumers receive from a throwing getter.

## 0. Rules the plan adds

- **P-1. A new refusal on the write path states where it runs relative to `EvalContext.checkMemberWrite` and to the right side, and is measured through `@zvenigora/ng-eval-signals`,** whose `SignalContextWriteError` bypasses `onError`.
  *Origin*: P51-early (`superseded/P51-early.patch`, SHA-256 `25866fa8faf65500a0056f203619e7ecf4e4597e4b2d55b9335ae946980b8854`). It refused in the assignment visitor before the right side, which ran ahead of the write policy: the signal context's policy error became a plain `Error` that `onError` handled (`results/downstream.txt`). D4 is the refusal that replaced it.
  *Red*: the eval-signals row for D-A51 turns from `SignalContextWriteError` to a plain `Error`. Step 7 writes that row.

P-1 is promoted by step 10 if it stands, as the [standing rules](../standing-rules.md) header says.

## 1. Current state

### 1.1 What exists today

- **Member reads.** `safeGetProperty`, in `modules/eval-core/src/lib/internal/visitors/prototype-pollution-guard.ts`, performs the member reads. Its `catch` returns `undefined` for any throw (A55). The `caseInsensitive` branch of `member-expression.ts` matches a key by reading it, `obj[key]`, when no own property matches (A48).
- **Member targets.** `resolveMemberTarget`, in `member-expression.ts`, gives `assignment-expression.ts` and `update-expression.ts` their object, key and current value. On the context branch it calls `EvalContext.getThis` and `getKey` (A49). Under `caseInsensitive`, `getThis` answers the `Registry` copy (A50).
- **Member writes.** `safeSetProperty`, in `prototype-pollution-guard.ts`, performs the member writes. It sets an own property on whatever object it is given, an `EvalScope` included (A51). The write policy, `EvalContext.checkMemberWrite`, is asked before a member write (`rows-base.txt`, `A50 cs policy this.k = 5`, which records the target and key it was asked).
- **Context copies.** `EvalContext.fromContext`, in `eval-context.ts`, copies a plain context into a case-insensitive `Registry` with `Object.entries` (A57).
- **Downstream.** `@zvenigora/ng-eval-signals`' `SignalContextWriteError` is raised by the signal context's write policy, and `onError` does not see it.

### 1.2 Findings

Each finding names its rows in the pinned folder (§ 1.3). Rows are named as `rows.mjs` labels them.

1. **A55 — a throwing getter reads `undefined`.** `safeGetProperty` catches any throw of the read and returns `undefined`. Case-sensitive, an own or an inherited accessor that throws reads `undefined` (`A55 cs own x.t`, `A55 cs inh x.t`). A compound or update target over it then fails at the write, `Failed to set property "t"`, because the accessor has no setter (`A55 cs own x.t += 1`), and `x.t || 1` is `1`. Destructuring's source read, `let {t} = x`, swallows the same throw (`A55 cs destructure let {t} = x; 1`), and so does a thrown non-`Error` (`A55 cs non-Error throw x.t`). Under `caseInsensitive`, an own accessor throws (`A55 ci own x.t`, threw `boom`), because it is read directly after the cache match. An inherited one is read twice and swallowed (`A55 ci inh x.t`, log `get, get`). A null-ish target (`u.t`, `n.t`, `u?.t`) reads `undefined` by the early return, which stays. P55 alone turns no `eval-core` suite case red (`suite-P55-eval-core.log`, 3303 of 3303), and the pinned downstream suites are for PALL-4 only, so P55 alone is not measured downstream. So [SR27](../standing-rules.md#sr27) applies: characterisation comes first, in step 2.

2. **A48 — under `caseInsensitive`, a read and a write disagree on the key.** A prototype accessor is read twice, once more than JavaScript reads it, by `c.g`, `c.g++`, `c.g += 1`, `c.g ||= 5` and `` `${c.g}` `` (`A48 ci proto-accessor`, log `get, get`). The case variant `c.G` reads once (`A48 ci proto-accessor c.G`, log `get`). The read and `=` disagree on the key: over a prototype `{ foo: undefined }` with an accessor `Foo`, `p.foo` reads `Foo`, `p.foo += 1` writes `Foo`, and `p.foo = 1` creates an own `foo` (`A48 ci undefined-inherited`). A proxy with a `get` trap sees `get` twice for a missing key, and a proxy with only a `get` trap sees `get` twice for `px.q` (`A48 ci proxy px.zz`, `A48 ci get-only proxy px.q`). Case-sensitive, these are read once and the key agrees. P48 alone also turns A55's inherited `caseInsensitive` rows from swallowed to thrown, through its direct read (`rows-P48.txt`), so A55 and A48 land in one step.

3. **A50 — a host `Registry` passed as the context shows the same shape case-sensitively.** *Corrected in this plan* ([SR4](../standing-rules.md#sr4)): the register entry recorded the shape under `caseInsensitive` only. Case-sensitively, with a `Registry` passed as the context, `this.k = 5` sets an own `k` on the instance, `k` reads `1`, and the map keeps `1` (`A50 cs hostRegistry this.k = 5`). `this.k += 5` and `this.k++` do the same (`A50 cs hostRegistry this.k += 5`, `this.k++`). The same host `Registry` under `caseInsensitive` does the same (`A50 ci hostRegistry this.k = 5`, `stray` `true`), and the `caseInsensitive` copy is one case of the defect. A `Registry` held as a value is not part of this defect; it is measured only as a write (`A50 cs registry-as-value r.k = 5`). The identifier write `k = 5` over the same host `Registry` is not among the pinned rows; step 2 measures it.

4. **A51 — a write to an `EvalScope` held as a value lands on the instance.** The reads measured are `ns.k`, which reads `undefined` for a namespaced scope (`A51 cs ns ns.k`). The writes are the leak: `ns.k = 5` sets an own `k` and leaves the context as it was, `ns.k += 5` and `ns.k++` compute `NaN` for a namespaced scope, and `ns._context = 9` makes a later `ns.k` read `undefined` (`A51 cs global ns._context = 9`, `later` `∅`, where every other global row reads `1`). `ns.k = f()` calls `f` and then writes (`A51 cs global ns.k = f()`, value `3`, log `f`). The reads `ns.set("k", 3)`, a method call, and `ns.context`, a property, are not in the pinned rows; step 2 measures them.

5. **A49's rows today** (group A49). Case-sensitive, a getter on the context is called twice by `this.g`, once by `this.g = 5`, and twice by `this.g += 1` and `this.g++` (`A49 cs ctx-accessor`). Under `caseInsensitive`, a lookup is called twice for `this.x` and for `x += 1`, and once for `x = 1` (`A49 ci lookup`). Under `caseInsensitive`, a plain context's enumerable getter is called once, when the context is copied, and never during the walk (`a56-base.txt`, `copy ci enumerable getter`).

6. **A56 — the context branch writes to `getThis`'s answer, which is not the binding the read resolved.** *New* (`a56-base.txt`). With a global prior scope holding `k` and a `thisArg`, `this.k = 2` writes into `thisArg` while `k` still reads `10` (`A56 cs prior global thisArg this.k = 2`). Without a `thisArg`, the same write is refused as a write to the evaluation context (`A56 cs prior global no thisArg this.k = 2`). Case-sensitive, in `(k => (this.k = 5, k))(1)` the read sees the parameter (value 1) while the write goes to the original's `k` (store and caller `k` 5); under `caseInsensitive` neither the store nor the caller changes (`k` 0) (`A56 cs pushed scope (k => (this.k = 5, k))(1)`, `A56 ci pushed scope (k => (this.k = 5, k))(1)`). On `{ k: undefined }`, `this.k = 1` is refused while `k = 1` writes (`A56 cs bound-undefined`). The README's `### Scopes` section says "Only the call's receiver changes", which is false for a write through `this`: the write lands on the receiver while a read of the same name resolves elsewhere. That makes the sentence false now ([SR31](../standing-rules.md#sr31)), and step 1 corrects it (§ 3.4).

7. **A57 — a `caseInsensitive` copy keeps only own enumerable string keys.** *New* (`a56-base.txt`, the A57 rows). `fromContext` copies with `Object.entries` under `caseInsensitive`. A class instance's getter `g` reads `undefined` (`A57 ci class-instance context this.g`), its method `m` is not callable (`A57 ci class-instance context this.m()`, `Cannot call undefined or null function`), a non-enumerable getter is dropped (`copy ci non-enumerable getter`), and a symbol key is not in the store (`A57 ci symbol key kept in store`, `symbols` `0`). Case-sensitive, the same context keeps them all (`A57 cs class-instance context this.g`, `7`; `A57 cs symbol key kept in store`, `symbols` `1`). The README's "copies the object into a case-insensitive store" understates this, so it is false now ([SR31](../standing-rules.md#sr31)), and step 1 adds a sentence on what the copy keeps (§ 3.4).

8. **Downstream** ([SR24](../standing-rules.md#sr24); `results/downstream.txt`, PALL-4 against base). In `@zvenigora/ng-eval-signals`, under the default `onError: 'throw'`, `x.t` over a throwing getter throws `boom` where it read `undefined`. The `caseInsensitive` call count for `c.g + 1` drops from 2 to 1. D-A50 and D-A51 are unchanged, because the signal context's write policy refuses first with `SignalContextWriteError`. In `@zvenigora/ng-eval-forms` `/reactive`, the default policy is unchanged (`""`); `'throw'` now sees the error, and a function policy receives it (`handled:boom`). P51-early is the reason for P-1.

9. **Kill-list candidates** ([SR25](../standing-rules.md#sr25)). Each is swept in the step named.
   - `modules/eval-core/README.md`, the `AssignmentExpression` passage: "Three kinds of read remain beyond JavaScript's", and the sentence "under `caseInsensitive`, a getter an instance inherits: `c.g += 1` calls it twice, as `c.g` does". That sentence dies with A48, at step 3, which makes the passage's count "two" (SR31).
   - `modules/eval-core/README.md`, `### Scopes`: "Only the call's receiver changes" (finding 6). The copy sentence, "copies the object into a case-insensitive store" (finding 7). Both done in step 1: the first is replaced, and the second stays, with a sentence after it on what the copy keeps.
   - `modules/eval-forms/reactive/src/lib/field-schema.spec.ts`, the error-policy comment, which reads "no member access in this / evaluator throws at all" across two lines. It is already false: a refusal throws, and an own getter under `caseInsensitive` throws. It dies with A55, at step 6.
   - `resolveMemberTarget`'s JSDoc, in `member-expression.ts`, which names A50 ("the `Registry` copy (A50)") and A51 ("An `EvalScope` is written as an object (A51)"). It is rewritten in step 4, with the fix.

### 1.3 Measurements run for this plan

- **The prototype.** `a48-prototype.zip`, pinned by Claude in the sandbox on 2026-11-02, unzipped to `D:\repo.2026\ng-eval-base\a48-prototype\` outside the repository, where the files sit in the zip's own folder, `a48-prototype\a48-prototype\`. Its `README.txt` lists the contents. The 45 files each match `SHA256SUMS.txt`, checked on 2026-11-03 with `sha256sum -c SHA256SUMS.txt` run in the folder that holds that file.
- **Against `9bf1bc8`.** Rows and suites ran on Linux under Node 22; timings under Node 26.4.0. The patches are P55 (`safeGetProperty`'s catch removed, A55), P48 (the `caseInsensitive` read tests with `in`, A48), P50 (`writeMemberTarget`: the context's `Registry` original written through its map, A50) and P51 (`safeSetProperty` refuses an `EvalScope` target, A51). PALL-4 stacks all four, in that order. `superseded/` holds P51-early and PALL-4-early, which are not used.
- **Scripts.** `scripts/rows.mjs` (224 rows per bundle) and `scripts/a56.mjs` (42 rows), run as `BUNDLE=<eval-core fesm2022 bundle> node <script>`. Two throwaway downstream specs ran in `eval-signals` and `eval-forms` and were deleted; the prototype pins them as `scripts/zz-a48-downstream.*.spec.ts`.
- **Pinned files cited here**, with their SHA-256 from `SHA256SUMS.txt`:

| File | SHA-256 |
| :--- | :--- |
| `patches/P55.patch` | `d40d6411534dff890078eae00c1635f1bb78d17114a9310ae6ba07d135d17d59` |
| `patches/P48.patch` | `531422277670ebf2dedf9efa0bd6c36787e77b83eefb405ffec5aa60d4f9a5ed` |
| `patches/P50.patch` | `7ceef596a003167d140dc99ec8812c5d1ca49968d1705ae32317e530cb7eb76b` |
| `patches/P51.patch` | `4eccf8d7fc26abed7a19b66e87ba1dc3b0fa00b7ad0bc17550ba62b39daa75bd` |
| `patches/PALL-4.patch` | `29b9367d6aad88723a22f34b041b9f59a21237e51aeb26c33b664fcbb6981591` |
| `results/rows-base.txt` | `61f20f6d03623c76d6ef6fa25a65aeb30b7d1d904a3477392de31c5ac260d143` |
| `results/rows-PALL4.txt` | `86fdc508db115018944f772f9c251db1860c685c3aeeacf4a6c67039596d2a7a` |
| `results/suite-PALL4-red.txt` | `c12a2c2e37fcef197c1eacf908aed20ee502b07ac68ab438492673e218d99e45` |
| `results/downstream.txt` | `2b3341c9471778722916620fdd7e516003150305aac413ce18c3b18d990ea054` |
| `timing/rules.md` | `0ab4a77505debbeccf919ad9a01e8f063848e41fe0b50b50892ce182664087f0` |
| `timing/outcome.md` | `d260aa1025c9606aad75fdd543b74b0a89adb745f208f0fa8af795e6db6d1e49` |

  Every hash this plan cites is checked by `grep -o '[0-9a-f]\{64\}' docs/a48/plan.md | sort -u`, each of which must appear in `SHA256SUMS.txt`. Step 1's criteria run it.

### 1.4 The results

- **Suites** (`eval-core`, 3303 cases; `suite-*.log`). P55 is 3303 of 3303. P48 has 3 red, P50 has 4, P51 has 4. PALL-4 has 11 red and 3292 green (`suite-PALL4-red.txt`). On PALL-4, `eval-signals` is 450 of 450 and `eval-forms` is 386 of 386.
- **The red sets**, by patch alone. P48: the three `caseInsensitive` rows `c.g`, `c.g++` and `c.g += 1` of the prototype accessor, held under A48. P50: the four `caseInsensitive` rows `this.K = 5`, `this.k = 5`, `this.k += 5` and `this.k++` of group S, held under A50. P51: four rows `ns.k = 5` and `ns.k += 5`, case-sensitive and `caseInsensitive`, held under A51. Each patch turns exactly its own rows red.
- **Row changes** (`rows.mjs`, 224 rows, against `rows-base.txt`). P55 changes 19, P48 15, P50 12 and P51 38: 84 changes. Six of them, A55's inherited `caseInsensitive` rows, are moved by both P55 and P48. PALL-4 changes 78 (84 − 6).
- **Group C** (`this.g = 1` and `this.g += 1`, held under A50 in `caseInsensitive`). Under P50 they keep their outcome, since the write goes into the copy. They are not in the P50 red set and not among its 12 row changes. Their mark changes to `design` (copied), with no red, in step 4.
- **A56 under P50** (`a56-P50.txt`, not named in the findings above). Two rows change: `A56 ci pushed scope (k => this.k = 5)(1)` and `A56 ci pushed scope (k => (this.k = 5, k))(1)`. Their stored `k` goes from `0` to `5`, so the write lands in the copy's map, and the read still resolves the parameter. A56 stays open. Step 4 re-marks its two held rows to the new outcome.
- **Downstream** (`results/downstream.txt`). As in finding 8.
- **Timing** (`timing/outcome.md`, under `timing/rules.md`). Both runs are **void** by the rule: the A/A control's median paired delta exceeded ±3% on a reported path (run 1, `cs-inh`, −3.11%; run 2, `compound`, −4.08%). No path met the regression test in either run; B's positives are at most 8 of 12.

| Path | Run 1, B median, positives | Run 2, B median, positives | Role |
| :--- | :--- | :--- | :--- |
| read | +4.30%, 8/12 | −0.40%, 5/12 | decides |
| write | −0.99%, 5/12 | −0.38%, 5/12 | decides |
| ci-inh | +2.82%, 7/12 | +4.00%, 7/12 | decides |
| ci-proto | +1.11%, 8/12 | −1.32%, 5/12 | decides |
| compound | −4.93%, 5/12 | +1.76%, 6/12 | reported |
| cs-inh | +0.66%, 7/12 | +4.21%, 8/12 | reported |
| ci-miss | −3.84%, 4/12 | −0.88%, 3/12 | reported |

  The timing does not decide the patches. The A/A deltas reached −4.08%, so the harness's noise floor in this sandbox is about ±4%, above the rule's ±3% void bound. The thresholds were not moved after the fact. The plan times its final code in step 5, under the rule in § 3.8.

## 2. Decisions

- **D1, A55.** `safeGetProperty`'s catch is removed (P55). A getter's throw propagates unchanged, by identity, a non-`Error` included. A revoked proxy already throws its own error, and is unchanged. This holds on the member read in both modes, and on destructuring's source read. A null-ish target still reads `undefined`. *Rejected*: swallowing on the `caseInsensitive` own path too. That would be consistent, but it hides the host's error, and it is not JavaScript.
- **D2, A48.** The `caseInsensitive` read tests the key as spelled, with `in`, as `resolveMemberTarget` does (P48). So the read, a compound target and `=` match the same key.
- **D3, A50.** A member write whose target is the context's original, when that original is a `Registry`, goes through the map, as `k = v` writes it (P50, `writeMemberTarget`). This holds in both modes. A plain caller object under `caseInsensitive` stays unchanged, as identifier writes leave it (the rows marked `design`, copied). `checkMemberWrite` is asked as before, with the same target and key (the rows `A50 … policy`).
- **D4, A51.** `safeSetProperty` refuses an `EvalScope` target with `Write to an evaluation scope is blocked`, after the policy and after the right side. That is JavaScript's order for a write the object refuses: `ns.k = f()` calls `f`, then refuses. `ns.n.k = 7` still writes, because a namespaced scope's context object is an ordinary object. *Rejected*: (a) also refusing before the right side (P51-early), which ran ahead of the policy (P-1); (b) routing a global scope's writes to `EvalScope.set`, which invents write rules, and a namespaced scope's `get` answers only its namespace.
- **D5, A49: a documented limit, no code.** Not prototyped. One resolution on the read path could lower the count, but only for case-sensitive `this.g`, `this.g += 1` and `this.g++`. It is not taken:
  - `=` keeps its read, because a holder without a read needs a presence test that disagrees with `get`'s value-based order when the original binds the key to `undefined` and a prior scope holds it;
  - the `caseInsensitive` lookup calls go through `getKey`, which `eval-signals` overrides;
  - the contract the docs can state is the same with or without that change ([SR44](../standing-rules.md#sr44)), and the change would add a class-override guard to the branch the A35 layers sit on.

  The contract, written in step 6: how many times a getter on the context, or a lookup, is called for a name an expression uses is not part of the contract. It can be more than once, and it can be once where JavaScript reads nothing. Keep both free of side effects. The contrast rows ([SR44](../standing-rules.md#sr44)): case-sensitive `this.g`, 2 calls; `this.g = 5`, 1 call; `x = 1` with a `caseInsensitive` lookup, 1 call.
- **D6, A56 and A57.** A56 and A57 are registered, not scheduled; the two README sentences are corrected in step 1 ([SR31](../standing-rules.md#sr31)); step 6's claim → witness table lists them, with the rows step 2 writes as their witnesses.
- **D7, versions.** `eval-core` 0.16.0, with `eval-signals` 0.9.0 and `eval-forms` 0.9.0 in the same release commit ([SR42](../standing-rules.md#sr42)). The two downstream releases are breaking minors, on the 0.6.0 and 0.7.0 precedent, since D-A55 changes what their consumers receive.
- **D8, F29.** Its two cases ride in step 7, since `eval-forms` releases anyway.

## 3. Design

### 3.1 A55 and A48 (step 3)

`safeGetProperty` loses its `catch`. The `caseInsensitive` branch of the member read tests the key as spelled with `in`, before it reads, so the read, the compound target and `=` all resolve the same key. The README sentence that P48 makes false, "`c.g += 1` calls it twice", and the count "Three kinds of read" beside it, are corrected in the same commit ([SR31](../standing-rules.md#sr31)).

### 3.2 A50 and A51 (step 4)

A new `writeMemberTarget` in `member-expression.ts`'s write path sends a member write whose target is a `Registry` original through the map: `set` on the key the map matches, as `k = v` does. `safeSetProperty` refuses an `EvalScope` target with `Write to an evaluation scope is blocked`, after `checkMemberWrite` and after the right side. The refusal names its layer, so SR18 holds. `resolveMemberTarget`'s JSDoc is rewritten to describe the path as it now is.

### 3.3 A49: the documented contract (step 6)

The contract of § 2, D5, goes into the `EvalContext` JSDoc on `getThis` and `getKey` (`eval-context.ts`), and into the `AssignmentExpression` passage of `modules/eval-core/README.md`, which then reads "Two kinds of read remain" and states the contract. The A49 rows in the characterisation spec move to `design`, so they assert the documented limit, not a defect.

### 3.4 A56 and A57: the README corrected (step 1)

Two README sentences are corrected to what holds now ([SR31](../standing-rules.md#sr31)); neither fix is scheduled.

- In `### Scopes`, "Only the call's receiver changes: `cat` still evaluates to the scope's object, so `cat.num` reads it and `cat.x = 1` writes to it." is replaced by: "A read is unchanged: `cat` still evaluates to the scope's object, so `cat.num` reads it and `cat.x = 1` writes to it. A member write through `this` is not: when `k` resolves to a global scope that supplies `thisArg`, `this.k = 2` writes to `thisArg`, while `k` and `this.k` go on reading the scope's `k`; when that scope supplies no `thisArg`, the same write is refused as a write to the evaluation context." The condition is stated because `getThis` asks the caller's object before the prior scopes: if the caller's object also holds `k`, the write lands there (*from the second review*, [SR44](../standing-rules.md#sr44)). Its rows, all with an empty caller's object and the scope holding `k`: `A56 cs prior global thisArg this.k = 2` and its `ci` twin (value 2, then 10, `thisArg` `k` 2), `… thisArg this.k` (10), and `… no thisArg this.k = 2` (refused).
- After the copy sentence, "…which copies the object into a case-insensitive store.", which stays, one sentence is added: "The copy takes the object's own enumerable string keys, as `Object.entries` lists them, and reads an accessor once, when the copy is made; what the object inherits, such as a class's accessors and methods, and its non-enumerable and symbol keys are not copied." Its rows: `copy ci enumerable getter` (`atBuild` 1, `after` 1), `copy ci non-enumerable getter`, `A57 ci class-instance context this.g` and `… this.m()`, and `A57 ci symbol key kept in store` (`symbols` 0).

These rows are unchanged under PALL-4 (`a56-PALL4.txt`), so both sentences stay true through step 8. The README carries no register links, since it is the package's whole documentation on npm, and both edits are prose only, so the `readme-examples.spec.ts` case counts do not move. `modules/eval-core/CHANGELOG.md`'s `[Unreleased]` records them. Step 6's claim → witness table lists both, with step 2's rows as their witnesses ([SR21](../standing-rules.md#sr21)).

### 3.5 Downstream and F29 (step 7)

Each adapter's existing specs get a row for D-A55: `onError: 'throw'` sees the getter's own error, asserted by identity ([SR41](../standing-rules.md#sr41)). D-A50 and D-A51 get a row each that asserts the signal context's policy error, so P-1's ordering is witnessed. F29's two cases, in the form its entry's Fix describes: one per adapter, each registering a rule that does not parse under a function policy and asserting the parse error's message ([SR18](../standing-rules.md#sr18)), each probed by moving that adapter's parse inside its policy.

### 3.6 Versions and the release (step 8)

`eval-core` 0.16.0 breaks by behaviour, so the release is a minor, as the 0.6.0 and 0.7.0 precedent is. `eval-signals` 0.9.0 and `eval-forms` 0.9.0 raise their peer range on `eval-core` in the same commit, and `eval-forms` raises its `eval-signals` peer as well, since the workspace's `eval-core` leaves `>=0.15.0 <0.16.0` ([SR42](../standing-rules.md#sr42)). No export is added, removed or reshaped (§ 5).

### 3.7 Probes

Each probe is one pinned patch, applied alone and reverted. Its predicted red set is the rows its `rows-<P>.txt` and `a56-<P>.txt` change against `-base` that the characterisation spec holds, read case by case, not from the rows of a step ([SR16](../standing-rules.md#sr16)). The patches are SHA-256 checked before each apply ([SR32](../standing-rules.md#sr32)).

### 3.8 Timing, the rule stated for step 5

Stated in this commit, before any timed run ([SR28](../standing-rules.md#sr28)). `timing/rules.md` governed the prototype's runs only; this rule governs step 5's.

- **Bundles.** A = `9bf1bc8`, the production `fesm2022` build. A′ = a byte copy of A, the A/A control. B = the build of step 4's commit. B is not byte-identical to the prototype's `pall4.mjs`, which is 9bf1bc8 with `PALL-4.patch` applied, so its hash will differ. Before step 5 runs, Claude checks that step 4's code equals `PALL-4.patch` apart from comments.
- **Paths, loop, warm-up, rounds and N.** As `timing/rules.md` has them (SHA-256 `0ab4a77505debbeccf919ad9a01e8f063848e41fe0b50b50892ce182664087f0`). The seven paths: read, write, ci-inh and ci-proto decide; compound, cs-inh and ci-miss are reported. The loop is `bench.mjs`'s: a cached AST, a prebuilt `EvalContext` and a fresh `EvalState` per evaluation. Warm-up 20,000; 15 rounds of N, with N fixed per path from one calibration run of A so that a round is about 0.2 s; a process's figure is its median round.
- **Machine.** As `timing/rules.md`'s: the Linux sandbox, with no performance and efficiency cores, so no pinning; Node 26.4.0; one process at a time, nothing else running.
- **Rotations.** 24, path-major. Within a rotation, for each path in the order of `timing/rules.md`'s table, A, A′ and B run back to back, one process each; even rotations use the order B, A′, A. The paired delta is (X − A) / A, per rotation and path.
- **Regression on a path.** B's median paired delta is above +3% with at least 18 of 24 rotations positive.
- **Void.** A′ meets the regression test on any path, or A′'s median paired delta exceeds ±3% on any path. A void run is repeated once, and both runs are reported.
- **A regression on a deciding path in a valid run.** The plan stops at that patch, and § 2 either re-designs it or accepts its cost with the figure. A reported path is stated with its figure and decides nothing.
- **Both runs void.** Step 5 records the medians. The release goes ahead only if no deciding path's B median exceeds +5% in either run. Otherwise the plan stops at step 5, and § 2 either accepts the cost with the figure or re-designs.
- **Memory arm.** 0 bytes retained, by reading the patches: none of them adds or changes a cache or retains anything per object or per evaluation. Stated, not measured.
- **Who runs it.** Claude writes the path-major run script and hashes it before the run, and runs it in the sandbox. Step 5's agent records the result.

## 4. Work breakdown

One step per session. Gate counts at the plan commit: `eval-core` 3303, `eval-signals` 450, `eval-forms` 386.

| Step | Subject | Files | Rows: `eval-core` / `eval-signals` / `eval-forms` | Ships in |
| :--- | :--- | :--- | :--- | :--- |
| 1 | This plan and its records | `docs/a48/plan.md` (new), `docs/backlog.md`, `.claude/skills/step/SKILL.md`; `docs/README.md`, `CLAUDE.md`, `modules/eval-core/README.md` and `modules/eval-core/CHANGELOG.md` (*widened at step 1's gate*) | 0 / 0 / 0 | `eval-core` 0.16.0 (docs) |
| 2 | Characterisation ([SR27](../standing-rules.md#sr27)) | `assignment-target.spec.ts` (edit), `member-read.spec.ts` (new), `docs/backlog.md`, this document, the skill | +N / 0 / 0 (N counted in step 2's Outcome) | no package |
| 3 | A55 and A48: P55, P48 | `prototype-pollution-guard.ts`, `member-expression.ts`, `member-read.spec.ts`, `assignment-target.spec.ts`, `modules/eval-core/README.md` (the A48 sentence and its count, [SR31](../standing-rules.md#sr31)), `modules/eval-core/CHANGELOG.md`, `docs/backlog.md`, this document, the skill | 0 / 0 / 0; the step 2 rows flip | `eval-core` 0.16.0 |
| 4 | A50 and A51: P50, P51 | `member-expression.ts`, `assignment-expression.ts`, `update-expression.ts`, `prototype-pollution-guard.ts`, `assignment-target.spec.ts`, `member-read.spec.ts`, `modules/eval-core/CHANGELOG.md`, `docs/backlog.md`, this document, the skill | 0 / 0 / 0; the held marks move | `eval-core` 0.16.0 |
| 5 | The timing record (§ 3.8) | this document, the step's Outcome | 0 / 0 / 0 | no package |
| 6 | A49 documented; the README and kill-list | `modules/eval-core/README.md`, `eval-context.ts` (JSDoc), `assignment-target.spec.ts` (A49 marks to `design`), `modules/eval-core/CHANGELOG.md`, `modules/eval-forms/reactive/src/lib/field-schema.spec.ts` (comment only), `docs/backlog.md`, this document, the skill | 0 / 0 / 0 | `eval-core` 0.16.0 (docs) |
| 7 | Downstream rows and F29 | the existing specs of `eval-signals` and of `eval-forms`' two entry points, `readme-examples.spec.ts` and `rules.spec.ts` (F29), the two `CHANGELOG.md`s, `docs/backlog.md`, this document, the skill | 0 / +N / +N (F29's two cases in `eval-forms`) | `eval-signals` and `eval-forms` next releases |
| 8 | The release commit | the three `package.json`s and `CHANGELOG.md`s, the root `CHANGELOG.md` if [CONTRIBUTING](../../CONTRIBUTING.md)'s Releasing says so, `docs/backlog.md`, this document, the skill | 0 / 0 / 0 | the release |
| 9 | The post-publish record | `docs/backlog.md`, the skill, this document, `CLAUDE.md`'s plan list | 0 / 0 / 0 | no package |
| 10 | Retrospect | this document's § 9 and § 10, `docs/standing-rules.md` for any rule that stands, `CLAUDE.md`, `docs/README.md`, `docs/backlog.md`, the skill | 0 / 0 / 0 | no package |

### Step 1 — This plan and its records

- **Edit**: this document, new; `docs/backlog.md`: the index rows and entries of A48, A49, A50, A51, F29, the new A55, A56 and A57, the register history and the "Work in flight" paragraph; `.claude/skills/step/SKILL.md`, retargeted to this plan; `docs/README.md`, the Active plan row for `a48/`; `CLAUDE.md`, its two "No plan is active" sentences; `modules/eval-core/README.md`, the `### Scopes` sentence and a sentence after the copy sentence (§ 3.4); `modules/eval-core/CHANGELOG.md`, an `[Unreleased]` entry for both.
- **Widened at the confirmation gate** ([SR3](../standing-rules.md#sr3)): `docs/README.md`, since doc-links fails on a file under `docs/` it does not link, and `CLAUDE.md`, whose "No plan is active" is false once this plan is active, as A33's step 1 edited both; `modules/eval-core/README.md` and its CHANGELOG, since a claim false now is fixed in the open commit ([SR31](../standing-rules.md#sr31)).
- **Criteria**: the gate green, `eval-core` 3303, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; release-tags 52 rows and 62 tags; every hash this plan cites appears in `SHA256SUMS.txt`, checked by `grep -o '[0-9a-f]\{64\}' docs/a48/plan.md | sort -u` against that file; `git status --porcelain` lists exactly the seven files above. The `code-reviewer` reads this document, the register edits, the two README sentences and the CHANGELOG entry against the pinned rows.
- **Ships**: `eval-core` 0.16.0 (docs), for the README and CHANGELOG; the rest in no package.
- **Outcome**: 2026-11-03. The first gate, before the widening, was green for `eval-core` 3303, `eval-signals` 450 and `eval-forms` 386 and for lint and build, and red on one doc-links line: this plan was not linked from `docs/README.md`. The first `code-reviewer` run found one Critical, the A55–A57 entries filed under section D before `#d7`, and Important findings, all fixed in this step. Four items held at the confirmation gate were decided there: `docs/README.md` and `CLAUDE.md` widened ([SR3](../standing-rules.md#sr3)); `modules/eval-core/README.md` and its CHANGELOG widened, since D6 had put the A56 and A57 sentences off to step 6, against [SR31](../standing-rules.md#sr31); and § 8 q1 decided as § 3.8's rule for step 5. The same gate corrected § 1.2 findings 2 and 6, § 7's third risk and § 9's write order. The second review found no Critical. Its two Important findings, the condition the `this.k` sentence depends on and this Outcome, are folded in, and step 2's rows widen to witness that sentence. The final gate, run alone on this tree: `eval-core` 3303, `eval-signals` 450, `eval-forms` 386; doc-links 0 dangling; release-tags 52 rows and 62 tags.

### Step 2 — Characterisation ([SR27](../standing-rules.md#sr27))

- **Edit**: `modules/eval-core/src/lib/internal/visitors/assignment-target.spec.ts`, and `member-read.spec.ts` (new), both in the existing today / js / held / design pattern, with `Hold.under` widened to `A55`, `A56` and `A57`.
- **Rows**: A55 (member read, compound, update, `||`, destructuring; own and inherited; both modes; a non-`Error`; null-ish targets); A48 (the key-agreement rows; the proxy traps); A50 (a host `Registry` in both modes, the identifier write over one, and the policy row); A51 (field writes, the right-side row, `ns.n.k = 7`, short-circuits, and the reads `ns.set` and `ns.context` named in § 1.2 finding 4); A56 and A57, with three rows the README sentences of § 3.4 need: `this.k` read after the write, the contrast row in which the caller's object also holds `k` and the write lands there, and the `copy` rows, `copy ci enumerable getter` among them.
- **Probes** ([SR15](../standing-rules.md#sr15), [SR16](../standing-rules.md#sr16)): each of P55, P48, P50 and P51, alone, SHA-256 checked, read case by case. The predicted red set of each is the rows its `rows-<P>.txt` and `a56-<P>.txt` move against `-base` that the step's spec holds under that patch's ID, and the outcome of the probe is written beside each prediction, as a corrected prediction if it misses.
- **Criterion**: each of the four probes turns its own rows red and no others, read by case. A row that would pass without its patch is a defect of the spec ([SR17](../standing-rules.md#sr17)).
- **Ships**: no package.

### Step 3 — A55 and A48 (P55, P48)

- **Edit**: `prototype-pollution-guard.ts` (the catch removed); `member-expression.ts` (the `in` test on the `caseInsensitive` branch); the two specs; `modules/eval-core/README.md`, the A48 sentence and the count "Three kinds of read" becoming "Two", which P48 makes false ([SR31](../standing-rules.md#sr31)); `modules/eval-core/CHANGELOG.md`, an `[Unreleased]` entry; `docs/backlog.md`, A55 and A48 retired and moved to `backlog-retired.md`, with their index rows; this document; the skill.
- **Criterion**: every step 2 row for A55 and A48 is green, and its outcome is PALL-4's outcome for that row (`rows-PALL4.txt`). The eval-core suite is 3303 of 3303 and no case is red. The README's sentence is gone, and no other sentence the fix falsifies is left.
- **Ships**: `eval-core` 0.16.0.

### Step 4 — A50 and A51 (P50, P51)

- **Edit**: `member-expression.ts` (`writeMemberTarget`; `resolveMemberTarget`'s JSDoc, rewritten); `assignment-expression.ts` and `update-expression.ts` (the target's write); `prototype-pollution-guard.ts` (`safeSetProperty`'s refusal of an `EvalScope` target); the two specs, whose A50 and A51 held rows move to the fixed outcome, and whose group C `this.g` rows move to `design` (copied); the two A56 rows P50 moves are re-marked to their new outcome, still held under A56; `modules/eval-core/CHANGELOG.md`; `docs/backlog.md`, A50 and A51 retired, A50 corrected per [SR4](../standing-rules.md#sr4); this document; the skill.
- **Criterion**: the step 2 rows for A50 and A51 are green at PALL-4's outcomes; group C's two `caseInsensitive` rows keep their outcome, with no red; the eval-core suite is 3303 of 3303, no case red.
- **Ships**: `eval-core` 0.16.0.

### Step 5 — The timing record (§ 3.8)

- **Edit**: this document, § 1.4's timing record and the step's Outcome. Bundles built and hashed as `timing/bundles.sha256` does, outside the repository.
- **Criterion**: the run follows § 3.8, with the A/A control reported first. Void, the run is repeated once. The step records the medians and the decision § 3.8 gives, its clause for two void runs included, and no decision the rule does not give ([SR28](../standing-rules.md#sr28)).
- **Ships**: no package.

### Step 6 — A49 documented; the README and the kill-list

- **Edit**: `modules/eval-core/README.md`: the `AssignmentExpression` passage (A49's contract, § 3.3); `eval-context.ts`, the JSDoc on `getThis` and `getKey`; `assignment-target.spec.ts`, the A49 marks to `design`; `modules/eval-core/CHANGELOG.md`; `modules/eval-forms/reactive/src/lib/field-schema.spec.ts`, its comment only; `docs/backlog.md`: A49 decided; this document; the skill.
- **Claim → witness** ([SR21](../standing-rules.md#sr21)): the README's new count of read kinds, its contract on the context's calls, and the two sentences step 1 wrote, on a write through `this` and on a copy's keys, each with its row in `assignment-target.spec.ts` or `member-read.spec.ts`, probed by breaking the claim. The `readme-examples.spec.ts` counts and `public-api.spec.ts`' document cases are the gate's witnesses for the document ([SR30](../standing-rules.md#sr30)).
- **Criterion**: doc-links 0 dangling. `public-api.spec.ts` and the `readme-examples.spec.ts` counts unchanged. The `.d.ts` changes by JSDoc only, from `eval-context.ts`.
- **Ships**: `eval-core` 0.16.0 (docs and JSDoc).

### Step 7 — Downstream rows and F29

- **Edit**: the existing specs of `eval-signals` (`eval-signal.spec.ts`, and the spec of the adapter that shows `onError`) for D-A55, D-A50 and D-A51 (P-1's ordering); `eval-forms`' `reactive/src/lib/readme-examples.spec.ts` and `signals/src/lib/rules.spec.ts` for F29's two cases; the two `modules/*/CHANGELOG.md`, an `[Unreleased]` entry each; `docs/backlog.md`, F29 retired; this document; the skill.
- **Criterion**: each new row asserts identity, the error's own object, and the refusal's message ([SR41](../standing-rules.md#sr41), [SR18](../standing-rules.md#sr18)). Each F29 case is probed by moving that adapter's parse inside its policy, and goes red there. The D-A51 row goes red under P-1's early refusal, and the signal context's `SignalContextWriteError` is the error it expects.
- **Ships**: `eval-signals` and `eval-forms` next releases.

### Step 8 — The release commit

- **Edit**: `modules/eval-core/package.json` (0.16.0); `modules/eval-signals/package.json` (0.9.0, the `eval-core` peer range raised); `modules/eval-forms/package.json` (0.9.0, likewise, and its `eval-signals` peer, `>=0.8.0 <0.9.0`, raised to `>=0.9.0 <0.10.0`); the three CHANGELOGs, headed `## [<version>] - <date>` with npm's publish date in UTC ([CONTRIBUTING](../../CONTRIBUTING.md), Releasing); `docs/backlog.md`; this document; the skill.
- **Criterion**: each `.d.ts` is diffed against the previous tarball. The expected change is JSDoc only, from step 6. SR24 rows: the code equals PALL-4 apart from comments. The peer ranges are raised in the same commit ([SR42](../standing-rules.md#sr42)), and the lint's `@nx/dependency-checks` passes.
- **Ships**: the release.

### Step 9 — The post-publish record

- **Edit**: `docs/backlog.md`, the register history row for `eval-core` 0.16.0 with its tag commit and date; the live count; `CLAUDE.md`'s plan list; the skill; this document.
- **Criterion**: the release row's *Live after* equals the count of live rows in the index at that commit.
- **Ships**: no package.

### Step 10 — Retrospect

- **Edit**: this document's § 9 (the contract after step 8, path by path) and § 10; `docs/standing-rules.md`, P-1 promoted if it stands; `CLAUDE.md`; `docs/README.md`; `docs/backlog.md`; the skill.
- **Ships**: no package.

## 5. Public API surface

No export is added, removed or reshaped. The `.d.ts` files change only by JSDoc. Step 8 diffs each one against the previous tarball ([SR12](../standing-rules.md#sr12)).

## 6. Verification gates

- Starting counts, at `9bf1bc8`: `eval-core` 3303, `eval-signals` 450, `eval-forms` 386.
- The gate is `npx nx run-many -t lint test build --skip-nx-cache --output-style=static` ([SR8](../standing-rules.md#sr8)), run alone, after every step and before every commit.
- Each step's rows move as its table says ([SR10](../standing-rules.md#sr10)). A pre-existing spec that goes red is a regression, not a stale test.
- doc-links: 0 dangling. release-tags: 52 rows, 62 tags.

## 7. Risks

- **A throw that a caller relied on to be swallowed.** D1 changes what an existing consumer receives from a throwing getter. The eval-signals and eval-forms releases are minors for that reason, and D-A55 is the row that shows it.
- **The `in` test and a key that exists as `undefined`.** D2 matches a key the object holds as `undefined`, where the read used to find a prototype accessor. The step 2 rows over `{ foo: undefined }` pin it.
- **A write to a scope held as a value now throws.** A host whose expressions write to a scope held as a value now gets an error. Today the write lands on the instance and is never read back (A51), so no read result changes; the error is the change.
- **Timing.** The sandbox's noise floor is about ±4%, above the rule's ±3% void bound. Two void runs are the expected result, not a finding.

## 8. Open questions

No open questions.

## 9. Contract after step 8

Path by path, once the release is out. Each claim is witnessed by the step named.

- **Member read, case-sensitive.** An own or inherited getter that throws propagates the throw unchanged, by identity, a non-`Error` included (step 3). A null-ish target reads `undefined`, as before.
- **Member read, `caseInsensitive`.** The key is matched as spelled, with `in`, and the read, a compound target and `=` match the same key (step 3). A prototype accessor is read once for the key it matches. A throw propagates as it does case-sensitively.
- **Compound and update targets.** The object and key are evaluated once, and the write sets the same key the read matched (steps 3 and 4). A target other than the context is read once. The context branch is the exception, A49's documented limit: `this.g += 1` calls a getter on the context twice (`A49 cs ctx-accessor`).
- **Destructuring's source read.** A throw propagates, as a member read's does (step 3).
- **A member write through `this`, or a host `Registry` as the context.** A write to a key the `Registry` holds goes through its map, in both modes. A plain caller object under `caseInsensitive` is still copied, as identifier writes are (step 4).
- **A member write to an `EvalScope` held as a value.** The target is resolved, the right side is evaluated, `checkMemberWrite` is asked if the context implements one, then `safeSetProperty` refuses with `Write to an evaluation scope is blocked`. A logical assignment that short-circuits returns before the right side and writes nothing, so it is not refused. A namespaced scope's context object is an ordinary object, so `ns.n.k = 7` writes (step 4).
- **Context calls (A49).** How many times a getter on the context, or a lookup, is called for a name an expression uses is not part of the contract. It can be more than once, and it can be once where JavaScript reads nothing. Both are free of side effects (step 6).
- **Writes through `this` (A56).** A write through `this` lands on the context's receiver, and a read of the same name can resolve elsewhere (the README, step 1). Open, registered.
- **Copies under `caseInsensitive` (A57).** The copy keeps own enumerable string keys. Accessors, methods, non-enumerable keys and symbol keys are not kept (the README, step 1). Open, registered.
- **Downstream.** `eval-signals`: under `onError: 'throw'`, a getter's throw reaches the caller, and the `caseInsensitive` count for `c.g + 1` is 1. The signal context's policy still refuses an `EvalScope` write before `safeSetProperty` (step 7). `eval-forms` `/reactive`: under `'throw'`, the error reaches the policy; the default policy is unchanged (step 7).

## 10. Retrospect

Written in step 10.
