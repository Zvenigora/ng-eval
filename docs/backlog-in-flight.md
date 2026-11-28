# Work in flight

Which plans have run against [the register](backlog.md), and what each fixed, opened, decided and
released.

This was the "Work in flight" section of `backlog.md` until 2026-11-15. It moved here as written, so
that the register's preamble and its entries are read without it. Only its links to the live
entries changed, from `#a56` to `backlog.md#a56`.

**The [Phase 12 plan](eval-rules/plan.md) is active**, at Revision 7: `@zvenigora/ng-eval-rules`
0.1.0, a new package. Steps 1 to 6 are done, A64's track is done, and `eval-core` 0.16.2 is
published 2026-11-26, then
step 7; steps 2 and 3 fixed no entry, and step 3's third follow-up opened [E9](backlog.md#e9),
`compileRule` superlinear in long names, not scheduled. Step 4 fixed no entry and opened three:
[A64](backlog.md#a64), a write policy asked only at an expression's own writes and its own calls of
the table's built-ins, so other routes write what it was given, at the fix bar and scheduled before
step 5, on its own track, its first commit correcting the published packages' sentences false now;
[E10](backlog.md#e10), a field's function running after the run against the facts; and
[F35](backlog.md#f35), two `test-setup.ts` files that do not type-check; the last two not
scheduled. A64's first commit, 2026-11-25, corrected the published packages' sentences false on
`eval-core` 0.16.1 about where a write policy is asked and which error a refused write throws,
fixed no entry, and opened one: [A67](backlog.md#a67), a write of a name on `eval-core`'s blocklist
routed through `onError` like a runtime failure, so `'undefined'` renders a blank, not scheduled.
Step 5's third commit opened [A68](backlog.md#a68), from its second commit's review: a
fact's getter read by bare name runs twice under a read hook, not scheduled.
Step 6's second commit, 12.6b, opened [A69](backlog-retired.md#a69), from its review:
`runRuleTest`'s comparison recursed once per level of nesting, so a deep or cyclic pair threw a
`RangeError`. 12.6e, its own commit after step 6, fixed it for `eval-rules` 0.1.0: the comparison
reads to a depth of 100, and throws its own `RangeError` where it reaches a value both sides hold
deeper.
Step 1 fixed no entry and opened four,
each not scheduled ([SR48](standing-rules.md#sr48)): [A62](backlog.md#a62), evaluation time and
memory not bounded; [A63](backlog.md#a63), no package loading in plain Node as installed;
[E7](backlog.md#e7), the parts of the rule design that no phase has; and [E8](backlog.md#e8), what
0.1.0 refuses and a later minor can admit. At the phase boundary before it, no backlog batch was
chosen.

**The [Phase 19 plan](demo/plan.md) is complete**, at Revision 2, steps 1 to 8: the demo
application at `apps/demo`, which ships in no package, and its site at
`https://zvenigora.github.io/ng-eval/`, first deployed 2026-11-18. It fixed no entry. Step 1 opened
[F32](backlog.md#f32), `eval-core`'s barrels under `isolatedModules`, and step 8 opened
[F33](backlog.md#f33), two collector cases that each failed once, and [F34](backlog.md#f34),
doc-links' `ENOENT` on an unstaged deletion; all three are not scheduled
([SR48](standing-rules.md#sr48)). Its retrospect, § 10, promotes § 0's D-1 and D-2 as
[SR49](standing-rules.md#sr49) and [SR50](standing-rules.md#sr50), and amends
[SR47](standing-rules.md#sr47).

**The [A48 plan](a48/plan.md) is complete**, at Revision 10, steps 1 to 10:
[A55](backlog-retired.md#a55), [A48](backlog-retired.md#a48), [A50](backlog-retired.md#a50) and
[A51](backlog-retired.md#a51) fixed in its steps 2 to 4, [A49](backlog-retired.md#a49) decided a
documented limit in step 5, the downstream rows and [F29](backlog-retired.md#f29) in step 6, the
timing in step 7, and the release in step 8: `eval-core` 0.16.0, a minor by behaviour, with
`eval-signals` 0.9.0 and `eval-forms` 0.9.0, released together, tagged annotated at 7d9d488 and
published 2026-11-08. Step 1 opened A55, [A56](backlog.md#a56), [A57](backlog.md#a57) and [A58](backlog.md#a58); step 3 opened
[A59](backlog.md#a59), step 4 [A60](backlog.md#a60) and step 5 [A61](backlog.md#a61). Step 8's review stopped its commit four
times, each on a shipped sentence false on a path it names, and the fifth placement landed. Step 9
recorded the publish and opened [F31](backlog.md#f31), from step 8's last review: no row witnesses A55 at
`eval-forms`' `/signals`. Its retrospect, § 10, finds one cause behind the twelve stops, a shipped
sentence stated more widely than its witnesses run: SR45 is new, § 0's three rules are SR46 and
SR47, and SR19 and SR40 are amended.

**The [A33 plan](a33/plan.md) is complete**, at Revision 6, steps 1 to 6: [A33](backlog-retired.md#a33),
the case-insensitive lookup cache's miss re-validated by name, fixed, and [A34](backlog-retired.md#a34),
the options a parse remembers by identity, decided a documented limit, released as `eval-core` 0.15.1,
a patch, tagged annotated at 9e88d18 and published 2026-11-02. `eval-signals` and `eval-forms` do not
release: their peer range, `>=0.15.0 <0.16.0`, takes it. Its `.d.ts` differs from 0.15.0's only in
JSDoc. The plan's § 8 q1 is decided by one `eval-signals` row, a `createEvalSignal` over a plain object
in its source under `caseInsensitive`, which A33's fix turns from `undefined` to the added property; it
ships in no package. Its retrospect, § 10, weighs the rules it earned: SR43 and SR44 are new, and SR15,
SR16, SR19, SR28 and SR32 are amended.

**The A35 plan is complete**: [`docs/a35/plan.md`](a35/plan.md), at Revision 16, steps 1 to 11 and
U3. `eval-core` 0.12.1 and 0.13.0 are published, with `eval-signals` 0.6.0 and `eval-forms` 0.6.0;
[A35](backlog-retired.md#a35), [A39](backlog-retired.md#a39) and [A42](backlog-retired.md#a42) are
fixed, retired and released. U3, the one advisory, is published as
[GHSA-qrqj-3445-3rjx](https://github.com/Zvenigora/ng-eval/security/advisories/GHSA-qrqj-3445-3rjx),
a repository advisory, and listed in `SECURITY.md`. It is not yet in GitHub's global Advisory
Database, pending GitHub's review, so no Dependabot alert fires from it yet; a CVE is requested, and
its ID lands in `SECURITY.md`'s CVE column when assigned.
- Step 1 fixed [A36](backlog-retired.md#a36), released in 0.12.1, and its review opened [A38](backlog-retired.md#a38).
- Step 2 refuses a dangerous function by its value at the call, `new` and tag sites, released in
  0.12.1. That is [A35](backlog-retired.md#a35) at the callee.
- Step 3 fixed [A37](backlog-retired.md#a37), released in 0.12.1: a sequence leaves one value on the
  stack.
- Step 4, the funnel, refuses a dangerous function at every read the walk makes, released in 0.12.1.
  Its review found a route the funnel cannot see, through `this`, opened as
  [A39](backlog-retired.md#a39). It also opened [A40](backlog-retired.md#a40).
- Step 5 rewrote `SECURITY.md` for 0.12.1. It leads with the mitigations, Node's flag among them as
  measured. The refusals are protections, stated as defense in depth, and the route through `this`
  and a host container are limits beside them. A35 stays open. The step opened
  [A41](backlog-retired.md#a41).
- Step 6 released `eval-core` 0.12.1, tagged at 7cc8d30 and published 2026-10-17. No advisory is
  published for it.
- **Shape (i) is chosen.** 0.12.1 shipped steps 1–4 as partial hardening, with A39 as a stated limit
  (steps 5 and 6). One advisory follows 0.13.0.
- Step 7 closed the value route: `this` only as the object of a member access.
- Step 8 closed the receiver: every receiver the evaluator resolves from the context is a guarded
  view, never the context. Its first run stopped at R4, a receiver the design could not see
  (Revision 13), and it completed under the plan's § 8 q7 option (a).
- Step 9 made both routes protections in `SECURITY.md` and retired A35 and A39. A host container
  stays a limit. Its timing gate found the cached view regressed bare calls ~45% on a fresh context,
  and the view is now built per call and retained by nothing. Its code review found that the view
  took its two methods off the context instance, where an expression can shadow them — and then
  that the view was never the only caller: the evaluator invoked a plant itself, which reversed a
  closure claim already given. Under the plan's Revision 16 the step grew a third fix, the root
  cause: a write whose target is an `EvalContext` is refused by class
  ([A42](backlog-retired.md#a42)), the methods the evaluator calls are taken from the class, and a
  context reached as data is refused.
- Step 10 released `eval-core` 0.13.0, `eval-signals` 0.6.0 and `eval-forms` 0.6.0 in one commit,
  every downstream floor raised to the 0.13 line. Tagged at f7f27f7 and published 2026-10-20.
- Step 11 recorded the release. The three tags were first pushed lightweight and were recreated
  annotated at the same commit, as CONTRIBUTING's step 5 has them.
- U3 published the advisory, 2026-10-21 (UTC), covering `eval-core` `<= 0.12.1` and both downstream
  packages `< 0.6.0`. Its follow-up commit recorded it here, on the retired entries and in
  `SECURITY.md`, and opened [F21](backlog-retired.md#f21).

**Phase 10, the documentation restructure, is complete**: its [plan](documentation/phase-10-plan.md),
at Revision 8, and its retrospect,
[`documentation/phase-10-summary.md`](documentation/phase-10-summary.md), are design records, and it
shipped as `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms` 0.6.1, docs-only patches tagged
at 5b9c859 and published 2026-10-22. It was paused after its step 2 while the A35 plan ran to its
end, so that 0.13.0, which closes the route through `this`, shipped first.
- Step 1 is done: the ten stale documents are deleted, and the `qs` override's reason is in F16.
- Step 2 is done: `SECURITY.md` is rewritten to what the code does, and a case in `eval-core`'s
  `public-api.spec.ts` resolves every identifier it names. That step opened A35, from its review,
  and F20.
- Step 3 is done: `eval-core`'s README is the package's whole documentation, with the root
  README's API sections moved into it and every `javascript` block executed. The root README keeps
  its copy until step 5. It shipped in `eval-core` 0.13.1. Its review opened
  [F22](backlog-retired.md#f22), scheduled into step 5.
- Step 4 is done: the `eval-signals` and `eval-forms` READMEs open as `eval-core`'s does, with
  Install, Sibling packages and Security, and a case in each project's `public-api.spec.ts` checks
  every peer range its README quotes against its manifest. It shipped in `eval-signals` 0.6.1 and
  `eval-forms` 0.6.1. Its sweeps for language that claims a guarantee opened
  [F23](backlog-retired.md#f23): the root README's lines were scheduled into step 5, and one line
  of `eval-core`'s README was not scheduled.
- Step 5 is done: the root README is a landing page, with no code and no quoted peer range, and a
  case in `eval-core`'s `public-api.spec.ts` keeps it that way. The root-README cases that a README
  with no code makes vacuous or red are removed. It retired F22 and F23, and opened [F24](backlog-retired.md#f24),
  queued after the phase. F23's `eval-core` README line was
  added to the step at its gate, so the step shipped that one correction in `eval-core` 0.13.1, and
  nothing else.
- Step 6 is done: [`docs/README.md`](README.md) is the maintainers' index, reached from
  `CONTRIBUTING.md`, and `ROADMAP.md` is condensed to one table of the phases. It retired
  [F19](backlog-retired.md#f19), and opened [F25](backlog-retired.md#f25) from the plan's § 8 q4, queued after the
  phase with F21 and F24.
- Step 7 is done: the release commit for `eval-core` 0.13.1, `eval-signals` 0.6.1 and `eval-forms`
  0.6.1, docs-only patches with no peer range moved. Every built `.d.ts` is byte-identical to the
  published 0.13.0 / 0.6.0 / 0.6.0 tarball's, and every built README is the repository's.
- Step 8 is done: the three are published, in the order `eval-core` → `eval-signals` → `eval-forms`,
  and tagged annotated at 5b9c859. Each published README is the repository's, and none sends its
  reader to the repository README. The step recorded the release, wrote the retrospect, and widened
  [F25](backlog-retired.md#f25) with the plan's § 8 q3, which the phase left undecided.

**The [A45 plan](a45/plan.md) is complete**: [A45](backlog-retired.md#a45) part 2 and
[A44](backlog-retired.md#a44), assignment targets as JavaScript evaluates them, at Revision 5, steps
1 to 7. It shipped as `eval-core` 0.14.0, `eval-signals` 0.7.0 and `eval-forms` 0.7.0, tagged
annotated at 0d305a3 and published 2026-10-26, every `@zvenigora` floor raised. A44, A45 and
[A52](backlog-retired.md#a52) are fixed, retired and released. Its retrospect is the plan's § 10.
- Step 1 wrote the characterisation spec, its marks measured against the pinned prototype.
- Steps 2 and 3 read compound and logical targets once, and gave `=` its own resolver, with A44 in
  both visitors.
- Step 4 timed the result: no regression on any path.
- Step 5 wrote `SECURITY.md`, the README and the CHANGELOG, retired A44, A45 and A52, and opened
  [A53](backlog-retired.md#a53), step 4's unexplained `caseInsensitive` slowdown.
- Step 6 decided § 8 q7, the downstream versions, by measurement, and wrote the release commit.
- Step 7 recorded the release and opened [F26](backlog-retired.md#f26): `tools/release-tags.mjs` did
  not check that a tag is annotated. F26 is fixed since, in no package.

Revision 2 decided three of its open questions as D7–D9 and opened [A48](backlog-retired.md#a48)–A52 for the defects
it found. Revision 3 brought A52 into the plan's step 2 (D10), and Revision 4 kept the `this`
refusal on every identifier target (D11). A48–A51 are not scheduled; [A53](backlog-retired.md#a53) is decided.
[F20](backlog-retired.md#f20), [F21](backlog-retired.md#f21),
[F24](backlog-retired.md#f24), [F25](backlog-retired.md#f25) and F26 are fixed, and ship in no package; F21's toolchain bump left one
`overrides.nx` entry, `undici`, which [F16](backlog.md#f16) part 2 holds.

[F27](backlog-retired.md#f27) is fixed: the process and verification rules are in
[`standing-rules.md`](standing-rules.md), imported by `CLAUDE.md`, and the copies cite it. It ships
in no package but for one corrected `eval-core` docblock, released 2026-10-30 in `eval-core` 0.14.1,
tagged 95932e6, documentation only. It opened
[F28](backlog-retired.md#f28), the consumer documents.

**Phase 11 is complete**: its [plan](documentation/phase-11-plan.md), at Revision 1, steps 1 to 4,
F28's answer. `eval-forms`' README is ordered by entry point, with a contents list, and no README
splits. It shipped as `eval-forms` 0.7.1, a docs-only patch tagged annotated at 69c3e0e and published
2026-10-29, its three `.d.ts` byte-identical to 0.7.0's and no peer range moved. F28 is decided and
retired. Its retrospect is the plan's § 10, which added [SR39](standing-rules.md#sr39) and corrected
[SR3](standing-rules.md#sr3)'s check. [F29](backlog-retired.md#f29), opened by step 2's code review,
was fixed by the [A48 plan](a48/plan.md)'s step 6, the next plan to move `eval-forms`' rows.

**The [A24 plan](a24/plan.md) is complete**: the await track, [A25](backlog-retired.md#a25),
[A24](backlog-retired.md#a24) and [D13](backlog-retired.md#d13), shipped as `eval-core` 0.15.0,
`eval-signals` 0.8.0 and `eval-forms` 0.8.0, each a minor breaking by behaviour, tagged annotated at
67486ab and published 2026-10-31, every `@zvenigora` floor raised. With them shipped
[A27](backlog-retired.md#a27) and [A38](backlog-retired.md#a38), fixed before the plan. It is at
Revision 10. Steps 1 to 7b and 10 are done: the plan and its records, the characterisation spec, A25, A24,
D13 in `eval-core` and then in `eval-forms`, all three retired as fixed, the release commit of all
three packages, its post-publish record, and the retrospect. Step 7a merged the plan's three release steps into one, since the
workspace lint reads each downstream peer range against the workspace `eval-core`, so a split
release would leave `master` red between them. Its code review opened
[F30](backlog-retired.md#f30), which a commit of its own after the release commit fixed, in no
package: five `eval-signals` rows witnessing 0.8.0's `await` claims, 444 → 449. The Register
history counts the release at 67486ab, where F30 was open, and F30's closure in the *Unreleased* row
after it. Step 1 corrected A25's decided text: only an `Error`
rejection reaches an `evalAsync` caller by identity. Its retrospect is the plan's § 10, which
promoted § 0's two rules as [SR40](standing-rules.md#sr40) and [SR41](standing-rules.md#sr41), added
[SR42](standing-rules.md#sr42), a downstream release in the `eval-core` release's commit, and amended
[SR8](standing-rules.md#sr8): the gate covers the committed tree.

`eval-core` 0.13.3 is released alone, a patch, tagged at 021d5e4 and published 2026-10-23. It
carries A45 part 1 only. Its `.d.ts` is SHA-256-identical to 0.13.2's, and it is inside
`eval-signals`' and `eval-forms`' `>=0.13.0 <0.14.0`, so neither downstream package released.

The A40/A41 batch is released as `eval-core` 0.13.2, alone, a patch, tagged at dc4302d and
published 2026-10-22. It carries [A40](backlog-retired.md#a40), [A41](backlog-retired.md#a41),
[A43](backlog-retired.md#a43) and [A46](backlog-retired.md#a46), and opened [A44](backlog-retired.md#a44), A45 and
[A47](backlog-retired.md#a47). Its `.d.ts` is byte-identical to 0.13.1's, and no peer range moved, so neither
downstream package released.

Phase 9, colon-joined identifiers, is complete: its
[plan](colon-identifiers/phase-9-plan.md), at Revision 9, and its retrospect,
[`colon-identifiers/phase-9-summary.md`](colon-identifiers/phase-9-summary.md), are design records,
and it shipped as `eval-core` 0.12.0, `eval-signals` 0.5.1 and `eval-forms` 0.5.0, tagged at
3466c80. It fixed [A26](backlog-retired.md#a26), opened [A34](backlog-retired.md#a34) and narrowed [D13](backlog-retired.md#d13). The
corpus stays synthetic until real expressions arrive as data; the plan's § 8 q1, q2 and q4 wait on
them. `eval-core` 0.11.1, with the [A29](backlog-retired.md#a29) and
[A31](backlog-retired.md#a31) fixes, is published and tagged at 7ee65fc. Phase 5 is complete: its
[plan](signals/phase-5-plan.md), at Revision 5, and its retrospect,
[`signals/phase-5-summary.md`](signals/phase-5-summary.md), are design records, and it shipped as
`eval-signals` 0.5.0 and `eval-forms` 0.4.1, tagged at 577c4f0. The track before it,
"Track 3" ([`docs/gates/plan.md`](gates/plan.md)), is closed; its retrospect is
[`docs/gates/summary.md`](gates/summary.md).
