# Phase 10 — retrospect

Eight steps, 2026-10-14 to 2026-10-21, the release published 2026-10-22 (UTC), against [`phase-10-plan.md`](phase-10-plan.md), with a pause
after step 2 while the [A35 plan](../a35/plan.md) ran to its end. This is the phase's one
retrospect, and also step 8's record (§ 5). The plan holds each step's outcome in its § 4.

## 1. What shipped

| Step | Commit | What |
| ---- | ------ | ---- |
| — | `4d56de2` | the plan: decisions D1–D7, and the order § 4 adjusts from the one first proposed |
| 1 | `3f00e3c` | ten stale documents deleted after a per-file audit that kept two facts; the `qs` override's reason, corrected, in [F16](../backlog.md#f16) |
| 2 | `efe2803` | `SECURITY.md` rewritten to what the code does, with three cases in `eval-core`'s `public-api.spec.ts` that resolve every identifier it names; [F20](../backlog.md#f20) and [A35](../backlog-retired.md#a35) opened |
| — | — | paused for twenty commits: the A35 plan shipped `eval-core` 0.12.1 and 0.13.0, `eval-signals` 0.6.0 and `eval-forms` 0.6.0, and its advisory; resumed at `4f99112` |
| 3 | `938111c` | `eval-core`'s README is the package's whole documentation: the root README's API sections moved into it, and every `javascript` block executed; [F22](../backlog-retired.md#f22) opened |
| 4 | `059bcd0` | the three package READMEs open with Install, Sibling packages and Security, and a case per project checks every quoted peer range against the manifest; [F23](../backlog-retired.md#f23) opened |
| 5 | `b1a9863` | the root README is a landing page with no code and no quoted range, which a case enforces (D5); F22 and F23 retired, [F24](../backlog.md#f24) opened |
| 6 | `4b788fd` | [`docs/README.md`](../README.md), the maintainers' index; `ROADMAP.md` condensed to one table of the phases; [F19](../backlog-retired.md#f19) retired, [F25](../backlog.md#f25) opened |
| 7 | `5b9c859` | the release commit: `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1 |
| 8 | this commit | the post-publish record, this retrospect, and the phase closed |

**The three releases are docs-only patches.** Every built `.d.ts` is byte-identical to the published
version before it, by SHA-256, and each manifest differs from the one before in `version` only. No
peer range moved. What they change is each package's npm page. 0.13.0, 0.6.0 and 0.6.0 sent their
reader to the repository README, which has documented no API since step 5: 2, 1 and 1 lines say
"repository README", measured in the tarballs (the plan's M9). The new versions have none.

**The phase's own cases**: `eval-core` +8 (+3, +7, +1, then −3), and `eval-signals` and `eval-forms`
+1 each. The A35 plan's cases came between steps 2 and 3, so the gate went from 2448 / 438 / 375 at
the plan's commit to 2601 / 439 / 376 at its close. The only cases removed were step 5's, which
lost their subject with the root README's code; the plan's step 5 lists each, with its reason and
its count.

## 2. What the plan got wrong, and what caught it

Each revision landed in the commit of the step that found it. None changed a decision. Most made a
check stricter, or moved a figure the pause had made stale.

| Revision | Found by | What was wrong |
| -------- | -------- | -------------- |
| 2 | step 1 | the reason `repository-audit.md` gave for the `qs` override, prototype pollution, was wrong: it was added for GHSA-6rw7-vpxm-498p, a denial of service |
| 3 | step 2's identifier case, and its review | § 3.10's resolution rule could not resolve what `SECURITY.md`'s own advisory sections name, and was corrected in four places. The review's widening of one documented limit opened A35, which paused the phase |
| 4 | step 3, the first after the pause | the totals predated the A35 plan, so 2448 became 2596; the release candidates moved to 0.13.1 / 0.6.1 / 0.6.1. Three root README blocks could not fail their probes as printed, so their examples were strengthened (W2, W4, W5) |
| 5 | step 4's gate and sweeps | "names every key" by substring was satisfied by `acorn-walk` for `acorn`; the case read the `acorn-walk` range `eval-forms`' README quotes, which is `eval-core`'s, as `eval-forms`' own. The sweep for language that claims a guarantee opened F23 |
| 6 | step 5's gate | F23's `eval-core` README line was added to the step, so F23 retired whole rather than narrowing. F22's count lost its figure and gained a reverse case, so the step's delta was −3, not −5 |
| 7 | step 6's gate | `docs/` held 49 tracked files, not 48, since the A35 plan's arrived during the pause; five live mentions of `ROADMAP.md` were false before the condensing, which widened the step into two `eval-forms` spec comment files. § 8 q1 was answered, and steps 7 and 8 written |
| 8 | step 7's gate | the CHANGELOG headings took 2026-10-22, npm's UTC date; F23's bullet was reworded, since no published `eval-core` README had carried the overclaim |

Step 8 found no correction the plan needed. The figure it fixed, the register's tag sentence, was
already flagged by step 6's review (§ 5).

**Every new check was probed, and the probes found more than the reading did.** `SECURITY.md`'s
identifiers, the peer ranges, the root README's D5 and the F10 reverse case are each a case that a
broken document fails, and § 6.1 requires that probe. Three examples that survived theirs were
strengthened, not excused (Revision 4). The peer-range case's first version stayed green on a span
with no range (Revision 5), and its reader hid every span after a stray backtick, which the review's
probe found. And step 6's doc-links file count did not move on a new document, which is how
[F25](../backlog.md#f25)'s Part 3 was found.

**The pause cost a re-measurement.** Step 2's review found A35, a route past the call sandbox,
while `SECURITY.md` was being written. Its fix shipped first, so the phase documented 0.13.0's
protections and not 0.12.0's. The cost was Revision 4: every count, citation and release candidate
the plan had measured before the pause was measured again at step 3.

## 3. What the phase deliberately did not do

- **Move anything under `docs/`** (D2). Published READMEs and design records name these paths, and
  most of those mentions are plain text no check can follow (the plan's § 3.2).
- **Edit a design record's text.** The one link that had to change became a permalink.
- **Write guide files** (D6), or restructure `eval-forms`' README (§ 8 q2).
- **Gate the index's completeness.** Step 6 and this step checked it once each; the gate is F25
  Part 1.
- **Change library code.** No exported symbol, `.d.ts` or peer range moved in any step.
- **Choose `CODE_OF_CONDUCT.md`'s contact** ([F20](../backlog.md#f20)). It is the maintainer's to
  choose.

## 4. What is left after this commit

- **The plan's § 8 q3 is undecided**: whether a published README's absolute link binds its target
  path and anchor for good. The latest three READMEs print 26 links into this repository's files,
  all at `master`. The case that forces the question is `eval-signals`' link to
  `docs/backlog.md#a24`, which retiring A24 would break while 0.5.0 to 0.6.1 still print it. It is
  [F25](../backlog.md#f25) Part 4.
- **Queued after the phase**: [F21](../backlog.md#f21), the build-tooling advisories;
  [F24](../backlog.md#f24), the downstream F10 copies' missing reverse case; and F25's four parts.
- **F20**, above.
- The register holds 25 live entries at this commit.

## 5. Step 8's record

- **The publish, checked rather than assumed.** `npm view` lists `eval-core` 0.13.1 (2026-10-22,
  00:36 UTC), `eval-signals` 0.6.1 (00:40) and `eval-forms` 0.6.1 (00:42), in the order step 7
  requires. `eval-core@0.13.1`, `eval-signals@0.6.1` and `eval-forms@0.6.1` are on the remote at
  5b9c859.
- **The tags are annotated**: `git cat-file -t` gives `tag` for each, as CONTRIBUTING's step 5
  writes them. The A35 plan's release tags were first pushed lightweight.
- **The npm pages are fixed.** Each tarball, extracted, has a README identical to the repository's,
  with 0 lines saying "repository README", where 0.13.0, 0.6.0 and 0.6.0 have 2, 1 and 1.
- **The CHANGELOG headings stand**: each reads 2026-10-22, npm's UTC publish date for all three.
- **The tag sentence is recounted from `git tag -l`.**
  - It listed 54 tags, and 51 of them are package tags, which is the figure release-tags
    reports.
  - The 51 are the 41 Publication status rows and seven tags written retroactively on 2026-09-16,
    plus the three written at their own release on 2026-08-22, which the old sentence missed.
  - The other three are lightweight `v*` tags, from before the `<project>@<version>` names.
- **The Register history row** compares the index at f7f27f7 with the index at 5b9c859. It was
  counted by a script, which reproduces the 0.13.0 row exactly:
  - 23 live before;
  - opened 5 (F21–F25), closed 3 (F19, F22, F23);
  - 25 after, which is the number of live rows in the index at this commit.
- **F25 gains Part 4**, the plan's § 8 q3, at this step's gate. Recording it as a new entry would
  have left the row's 25 one short of the index at this commit.
