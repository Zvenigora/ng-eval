# Register history

How the count of live entries in [the register](backlog.md) has moved from one release to the next.
The index its rows count is that file's.

This was the "Register history" section of `backlog.md` until 2026-11-15. It moved here as written,
so that the register's preamble and its entries are read without it. Only its reference to the
Status vocabulary changed, from "the vocabulary above" to a link.

The register opened on 2026-09-07 (`ef5ac2b`) with 46 entries, 42 of them live; R1–R4 were recorded
already retired.

| Release | Tag commit | Published | Live before | Opened | Closed | Live after |
| ------- | ---------- | --------- | ----------: | ------ | ------ | ---------: |
| `eval-core` 0.4.0, `eval-signals` 0.1.1, `eval-forms` 0.2.1 | `7935a78` | 2026-09-16 | 42 | 9: A10, A11, A12, F9–F14 | 9: A9, B2, D10, E6, F1, F3, F4, F12, F14 | 42 |
| `eval-core` 0.5.0, `eval-signals` 0.1.2, `eval-forms` 0.2.2 | `016a313` | 2026-09-17 | 42 | 2: A13, A14 | 3: A11, A13, A14 | 41 |
| `eval-core` 0.6.0, `eval-signals` 0.1.3, `eval-forms` 0.2.3 | `f26f987` | 2026-09-26 | 41 | 8: A15–A17, A19–A22, F15 | 8: A8, A12, A16, A17, A20–A22, F15 | 41 |
| `eval-core` 0.6.1, `eval-forms` 0.2.4 | `587ebf1` | 2026-09-30 | 41 | 1: F16 | 12: A3, B3, B4, D4, D6, D9, D12, F2, F5, F6, F9, F13 | 30 |
| `eval-core` 0.7.0, `eval-signals` 0.1.4, `eval-forms` 0.2.5 | `724d831` | 2026-10-01 | 30 | 0 | 6: A1, A2, A5, A6, A7, E5 | 24 |
| `eval-core` 0.8.0, `eval-signals` 0.2.0, `eval-forms` 0.2.6 | `c56f987` | 2026-10-02 | 24 | 0 | 3: A4, A10, C3 | 21 |
| `eval-core` 0.9.0, `eval-signals` 0.2.1, `eval-forms` 0.2.7 | `eb403c0` | 2026-10-03 | 21 | 0 | 1: B1 | 20 |
| `eval-core` 0.10.0, `eval-signals` 0.3.0, `eval-forms` 0.3.0 | `0c3299e` | 2026-10-04 | 20 | 2: A23, C4 | 6: A23, C1, C2, D1, D2, F11 | 16 |
| `eval-forms` 0.3.1 | `3d56994` | 2026-10-04 | 16 | 1: B5 | 5: D3, D5, D11, F8, F10 | 12 |
| `eval-core` 0.10.1 and 0.11.0, `eval-signals` 0.4.0, `eval-forms` 0.4.0 | `776885a` | 2026-10-07 | 12 | 2: B6, C5 | 5: F7, B5, C4, B6, C5 | 9 |
| `eval-signals` 0.5.0, `eval-forms` 0.4.1 | `577c4f0` | 2026-10-10 | 9 | 9: A24–A28, C6, C7, F17, F18 | 1: C6 | 17 |
| `eval-core` 0.11.1 | `7ee65fc` | 2026-10-10 | 17 | 6: A29–A32, D13, F19 | 5: A28, C7, F18, A29, A31 | 18 |
| `eval-core` 0.12.0, `eval-signals` 0.5.1, `eval-forms` 0.5.0 | `3466c80` | 2026-10-14 | 18 | 2: A33, A34 | 1: A26 | 19 |
| `eval-core` 0.12.1 | `7cc8d30` | 2026-10-17 | 19 | 8: A35–A41, F20 | 2: A36, A37 | 25 |
| `eval-core` 0.13.0, `eval-signals` 0.6.0, `eval-forms` 0.6.0 | `f7f27f7` | 2026-10-20 | 25 | 1: A42 | 3: A35, A39, A42 | 23 |
| `eval-core` 0.13.1, `eval-signals` 0.6.1, `eval-forms` 0.6.1 | `5b9c859` | 2026-10-22 | 23 | 5: F21–F25 | 3: F19, F22, F23 | 25 |
| `eval-core` 0.13.2 | `dc4302d` | 2026-10-22 | 25 | 5: A43–A47 | 4: A40, A41, A43, A46 | 26 |
| `eval-core` 0.13.3. A45 part 1 closed with it, a part, so A45 stays live; F20 and F24 ship in no package | `021d5e4` | 2026-10-23 | 26 | 0 | 2: F20, F24 | 24 |
| `eval-core` 0.14.0, `eval-signals` 0.7.0, `eval-forms` 0.7.0. F21 and F25 ship in no package | `0d305a3` | 2026-10-26 | 24 | 6: A48–A53 | 5: F21, F25, A44, A45, A52 | 25 |
| `eval-forms` 0.7.1. F26, opened by 0.14.0's post-publish commit and fixed after it, ships in no package; F27 ships in no package but for one `eval-core` docblock | `69c3e0e` | 2026-10-29 | 25 | 4: F26–F29 | 2: F26, F27 | 27 |
| `eval-core` 0.14.1. F28, decided by Phase 11 and shipped in `eval-forms` 0.7.1, was retired by 0.7.1's post-publish commit, after its tag; A47 is fixed, and A32 and A30 are decided, documentation only | `95932e6` | 2026-10-30 | 27 | 0 | 4: F28, A47, A32, A30 | 23 |
| `eval-core` 0.15.0, `eval-signals` 0.8.0, `eval-forms` 0.8.0. A27 and A38 are fixed, and A25, A24 and D13 by the A24 plan, all released in them; F30 opened by the release commit's code review | `67486ab` | 2026-10-31 | 23 | 1: F30 | 5: A27, A38, A25, A24, D13 | 19 |
| `eval-core` 0.15.1. A33 is fixed and A34 decided, documented, both released in it; F30 and A53 closed in no package; A54 opened by step 2's review | `9e88d18` | 2026-11-02 | 19 | 1: A54 | 4: F30, A53, A33, A34 | 16 |
| `eval-core` 0.16.0, `eval-signals` 0.9.0, `eval-forms` 0.9.0. A55 to A58 opened by the A48 plan's step 1; A55 and A48 fixed by its step 2, A50 by its step 3 and A51 by its step 4, and A49 decided a documented limit by its step 5, for `eval-core` 0.16.0, and F29 fixed by its step 6, tests only, in no package; A59 opened by its step 3, A60 by its step 4 and A61 by its step 5 | `7d9d488` | 2026-11-08 | 16 | 7: A55, A56, A57, A58, A59, A60, A61 | 6: A55, A48, A50, A51, A49, F29 | 17 |
| `eval-core` 0.16.1. F31 opened by the A48 plan's step 9, from step 8's code review; F32 opened by the Phase 19 plan's step 1, from its M2, and marked not scheduled; F33 and F34 opened by the Phase 19 plan's step 8, both marked not scheduled; A62, A63, E7 and E8 opened by the Phase 12 plan's step 1, all four marked not scheduled; E9 opened by its step 3 third follow-up, from 6997575's code review, and marked not scheduled. A65, fixed and released in 0.16.1, is recorded after its tag | `188c0d9` | 2026-11-22 | 17 | 9: F31, F32, F33, F34, A62, A63, E7, E8, E9 | 0 | 26 |
| `eval-core` 0.16.2. A65 opened and retired by 0.16.1's post-publish commit, after its tag: fixed and released in 0.16.1, and recorded once the release was public; A66 opened by the same commit, from 188c0d9's code review, for `eval-core`'s next release; F36 opened by it, from two step 4 reports, and marked not scheduled; A64, E10 and F35 opened by the Phase 12 plan's step 4, A64 at the fix bar and scheduled, E10 and F35 marked not scheduled; A67 opened by A64's first commit, from its sweep, and marked not scheduled | `52fced7` | 2026-11-26 | 26 | 7: A65, A66, F36, A64, E10, F35, A67 | 1: A65 | 32 |
| *Unreleased*. A68 opened by the Phase 12 plan's step 5, from its second commit's review (M-2), and A69 by its step 6, from 12.6b's review (I-2), both marked not scheduled | | | 32 | 2: A68, A69 | 0 | 34 |
| **Since the register opened** | | | **42** | **98** | **106** | **34** |

**How a row is counted.** Each row compares the index at the previous row's commit (the first, at
`ef5ac2b`) with the index at that release's tag commit. *Live* is a Status that starts with Open,
Contained, Covered or Premise retired, as in the register's
[Status vocabulary](backlog.md#status-vocabulary). *Opened* is every ID new to the index.
*Closed* is every ID that was live, or newly opened, and is not live at the tag, so an entry
opened and closed between two releases counts in both columns, and *before + opened − closed =
after* holds on every row. A closure counts in the interval it was recorded in, which is not
always the release that shipped it: a test-only or documentation closure ships in no package, and
0.6.1's twelve include several of those.

**Adding a row.** Each release's post-publish commit adds its row, counted the same way
([`CONTRIBUTING.md`](../CONTRIBUTING.md), Releasing). The last row's *Live after* should equal the
count of live rows in the index at that commit; if it does not, the row is wrong. An *Unreleased*
row counts what has moved since the last release's tag; the next release's post-publish commit
makes it that release's row, with its tag commit and date.
