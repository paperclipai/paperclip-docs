# Nightly mode

Documents what changed on parent `master` between the last run's pin and today's, and lands it on `nightly`. Runs unattended: no step here asks a human anything.

You have already run `npm run --silent sync:prepare` and it said `ready`, `mode: nightly`. Keep `prepare.json` open; the steps below name its fields.

## 1. Get onto `nightly`

Skip this whole step with `--rehearse`.

```sh
git checkout nightly
git merge --ff-only origin/nightly
```

If local `nightly` has commits `origin/nightly` lacks (`docs.local_nightly_vs_origin.ahead > 0`), look at them. A leftover merge of `main` or a sync commit from an interrupted run: push it. Anything else: `SYNC FAILED`.

**Merge `main` when `docs.main_ahead_of_head > 0`.** Hot-fixes land on `main`; `nightly` must carry them.

```sh
git merge origin/main
```

- Clean merge: continue.
- Conflicts: resolve them, do not abort. For **each conflicting hunk**, read both sides and check them against the parent code at the pin (`parent.parent_src`). Keep what is true there. Often that is a blend: the hot-fix's correction inside nightly's newer paragraph. Never resolve a whole file, let alone the whole merge, with "nightly wins" or "main wins"; a blanket "nightly wins" has discarded verified fixes before.
- Then run `npm run --silent sync:lint-duplicates`. A merge can leave the same block twice with no conflict.
- Commit the merge, and **push it to `origin/nightly` as a merge commit now**, before branching: `git push origin nightly`. If it only travels inside the draft PR, the squash-merge erases it and the same conflicts come back tomorrow.
- List every hunk you resolved, and which side won and why, for the PR body.

If the merge fails with add/add conflicts on dozens of pages, the post-release realign was skipped. Stop: `troubleshooting.md` → "Release was squashed and nightly was not realigned".

## 2. Triage the window

The window is `increment.range`: only the commits since the last run. Earlier windows are already on `nightly`.

Read, in this order:

1. `increment.commits_file` — every first-parent commit with its PR number and subject.
2. `increment.watchers` — changed files bucketed by surface, with the docs each surface feeds. `unmatched_non_test` are changed files no watcher covers; skim their top directories for a surface the map misses.
3. The code itself, for anything user-visible: `git -C <parent_git> show --format=%s <sha> -- <path>` and the files under `parent.parent_src`. Keep `--format=%s`: parent PR descriptions run past a hundred lines and are not evidence.

Sort every commit into one of:

- **Document** — it changes something a reader can see, call, configure or be surprised by. Group these into surfaces (one feature may span five commits), and name the pages each surface touches. A watcher's `docs_paths` say where to start looking, not which pages. Find them three ways, because the strings a change adds are not on any page yet:
  - search `docs/` for the identifiers and labels in the diff (`grep -rln -- '<string>' docs`);
  - for a screen, search for labels that were on it **before** the change (unchanged strings in the same component), and for the screenshots of it: every name in `screenshots.new_this_window` is a screenshot whose screen changed in this window, and the pages that embed it (`grep -rln -- '<name>' docs`) describe that screen;
  - search for the feature's own noun as the docs use it ("harness", "adapter picker").

  Authors report pages you missed (`other_pages`), and step 3 has one pass for those.
- **Not documented** — internals, tests, refactors, telemetry, or a level of detail no page carries. Write one line each for `PENDING.md`.
- **Deferred** — see `post_pin` below.

Rules for triage:

- Do not drop a commit because of its message. Subjects lie in both directions: decide from the diff.
- A removal is a change. If the window deletes a route, flag, button or page of UI, find every page that mentions it (`grep -rn` under `docs/`), not just the page the watcher names.
- **`post_pin`** lists what landed after the pin and is still in quarantine. Do not document any of it. Use it for one decision only: if a surface in this window is reverted there (`post_pin.reverts`), or the files that are specific to it are being reworked again (`post_pin.overlap_top`, read together with the commit subjects in `post_pin`), defer that surface to the next run and say so. Judge from file names and subjects only; the code after the pin is not to be read. Files that change in nearly every window (`openapi.ts`, shared types, lockfiles) say nothing. Twice a feature was documented and then removed upstream within two days.
- **What the reader sees is decided by the screen, not the server.** A new error message or status in server code is only worth documenting as something the user reads if the UI renders it. Trace it to the component: transient failures (`429`, `503`) and many API errors are replaced by generic copy on the way. A message only API callers see belongs in the API reference, or nowhere.
- **Open questions from the last run.** `PENDING.md` → "Open questions" and "Follow-ups" hold things earlier runs could not settle. Treat the two lists as one pool and take up to five, oldest first (same date: in file order), skipping entries already marked `needs decision:`. An entry that already says it waits on a person is marked `needs decision:` without spending a slot. An entry about a script or checker getting something wrong is not a question about the docs: move it to "Tooling" (step 5) without spending a slot on it. Try to answer each of the five from the code at the pin:
  - Answerable, and a page is wrong: it becomes a surface in this run, so the fix is written here and goes through review with everything else. Fix the statements the question is about. If the page turns out to be stale throughout (a how-to whose labels and steps have all moved), that is a rewrite: give it its own author, and take at most **one** such page per run. A second one is logged under "Follow-ups" as `rewrite: <page>` with today's date and waits its turn.
  - Answerable, and the pages are right: record the answer under "Answered this run" and drop the question.
  - Not answerable from code (where a page should live, what to call something): mark it `needs decision:` and say which decision. It stops taking a slot.
  - An entry with no date is from before this format; date it from `git log -S'<its first eight or so words>' --format=%as -- PENDING.md | tail -1`. Date every undated entry once and write the dates into the file in step 5, so no later run has to. Use the entry's own opening words, not a file name or identifier in it: those also match older entries about the same file.
  - A `PENDING.md` written before this format names the two lists "Open questions from this run" and "Follow-ups (pre-existing, not from this window)". They are the same lists. Its other sections that the template in step 5 does not have ("Reconcile", notes on master-only content) are not carried over.

  Leave the rest for later runs; do not spend the run on them.
- **`drift`** lists things the docs mention that the parent no longer has. For each record, check the parent at the pin: if the surface was removed or renamed in this window, fix the page as part of this run. If it was already gone before this window, fix it too when the fix is plain from the code; otherwise log it under "Open questions". A record that is a checker mistake goes in the summary as a checker bug.

## 3. Write

```sh
git checkout -b nightly-draft/<short-pin>-<two-or-three-word-slug>
```

- Small windows (a handful of pages): write the edits yourself.
- Larger windows: one author agent per cluster of related surfaces, in parallel, each with the brief in `review.md` → "Author brief". Give every author the pin, both parent paths, its surfaces with the commit SHAs, and the pages it owns. No two authors own the same page.
- Mechanical additions (a new row in `environment-variables.md`, a name in an enumerated list): make them yourself, copying identifiers verbatim from the code.
- Authors and reviewers are general-purpose agents started with your agent tool in the foreground, all of a step's agents in one message so they run side by side. Three or four authors is the usual ceiling; each one costs about as much as writing the whole window yourself, so group surfaces rather than giving every surface its own.
- After authors return: handle their replies as `review.md` → "What you do with the replies" says (one edit to `site/content.json` for every `nav_addition`; one more author pass for `other_pages`; `untraced` and `also_fixed` have a destination each); check each new page has hand-written `seo_title` and `seo_description` (`review.md` → "SEO metadata").

Do not add `paperclip_version` to pages in nightly mode.

## 4. Review

Run the loop in `review.md` → "Review loop" to its stop rule, then its closing check. This is not optional and not shortened for small diffs: on a one-page change the loop is one reviewer and takes minutes.

## 5. Bookkeeping

**`SCREENSHOTS_PENDING.md`** — copy `screenshots.generated_pending` over it. The generated file already carries the `## Visibly changed` section over from the current one. That section is the one part written by hand: add one bullet there for this window if authors or reviewers saw UI changes a screenshot would show, in the form the bullets already there use (range first, then what changed and which screenshots).

**`.sync-state.json`** — write `next_state` from `prepare.json` exactly.

**`PENDING.md`** — rewrite it with these sections, in this order, leaving out a section that has nothing in it:

```markdown
# Pending — nightly sync

- **Window:** `<increment.range>`, N commits, pinned at `<pin_short>` (<pin_date>), <quarantine_hours>h quarantine (or "pin set with `--pin`"). Base release `<tag>`.
- **Merge of `main`:** nothing to merge | merged, N hunks resolved (see PR) | skipped (rehearsal).
- **Review:** rounds and defects fixed per round; closing check result; N claims cut.
- **Drift:** count from `prepare.json`, and what was done about each record.

## Applied this run (`<range>`)
- **<Surface>** (#PR, #PR): what the docs now say, and on which pages. A commit with no PR number is cited by its short SHA.
- **Corrections outside the window:** <page, what was wrong: authors' `also_fixed` entries, fixes from carried questions, reviewer fixes to older text>.

## Applied in earlier runs (unreleased)
<last run's "Applied this run" moves here, on top, as one line: `<range>` (#PR): surfaces. The PR number is `docs.last_sync.pr` in `prepare.json`>

## Cut in review
- `<page>`: "<the sentence>" — traced to `<parent file>`, could not prove <what>.

## Deferred
- <surface>: why (reverted after the pin, reworked after the pin), and what to check next run.

## Not documented this run
- <one line per skipped commit or group, with the reason>

## Answered this run
- <carried question>: <the answer, and the parent file and line that settles it>. No page change.

## Open questions
- <question>, with the parent file and line that raised it, and the date it was first logged.
- needs decision: <question>, and the decision that would close it.

## Follow-ups
- <a known gap on an existing page that no window has covered>, with the date it was first logged.
- rewrite: <a page that is stale throughout and waits for its own author>, with the date.

## Tooling
- <a checker or script that got something wrong this run>, with the command and what it reported.
- gap: <something a checker does not look at>.
```

- **"Applied in earlier runs"** lists unreleased work only. Drop every entry whose range is in `cumulative.pending_ranges_shipped`: those windows are inside the base release and have shipped.
- **"Answered this run"** is not carried forward; it shows this run's answers once.
- **Open questions and follow-ups** are carried forward as they are, minus the ones triage settled this run (step 2). Do not fix a page at this point: the review loop is over, and prose written now would ship unreviewed.
- **"Tooling"** is for script and checker problems, which are not open questions about the docs. It is a list of bugs to fix in `scripts/sync/`, not a list of findings to ignore. Two kinds of entry:
  - *Wrong output* (a check reported something false): carry it forward only while this run's own output still shows it. Entries about `sync:prepare` are judged now; entries about a gate are judged after step 6, and if the gates add or settle one, update this section and commit again. Drop an entry about a command no step here runs (`sync:check`, `check-tag-accuracy`).
  - *Gap* (`gap:` — something a checker does not look at): no output can show it, so it stays until `scripts/sync/` changes. An older entry that describes a gap gets the `gap:` prefix.

  Name what you dropped in the summary.
- The file is committed before the gates run, so the gate results go in the PR body and the summary, not here.

## 6. Commit and run the gates

```sh
git add <each changed path, by name>
git commit -m "Nightly docs: <surfaces> (paperclip <short-pin>)"
npm run --silent sync:gates -- --against <pin>      # with --rehearse add: --base <the branch you started on>
```

Commit before the gates: the sitemap test builds from a clone and cannot see uncommitted pages. Fix what fails, commit again (the PR is squashed, so extra commits cost nothing), re-run until it exits 0. If fixing a gate failure changed prose, that prose goes through the closing check in `review.md` before the push. (Review fixes were already covered there.)

With `--rehearse`, stop here: report the branch, the commits, and what step 7 would have pushed.

## 7. Land it

```sh
git push -u origin nightly-draft/<...>
gh pr create --base nightly --title "Nightly docs: <surfaces> (paperclip <short-pin>)" --body-file <run_dir>/pr-body.md
```

The title must end with `(paperclip <short-pin>)`: the release run reads the pin from it to find the cut point.

PR body, omitting empty sections:

- **Window** — range, commit count, pin and its date.
- **What changed** — one bullet per surface.
- **Review** — rounds, defects fixed per round, claims cut (list them).
- **Merge of `main`** — every conflict hunk and how it was resolved.
- **Drift** — records acted on, records left as open questions.
- **Carried questions answered** — the answer and the code that settles it.
- **Checker findings waived** — each with the evidence (see `troubleshooting.md`).
- **Not documented / deferred** — one line each.

Then wait for **every** check to finish (`docs-test` and the Cloudflare Pages preview). Use the harness's PR watch if it has one; otherwise `gh pr checks <n> --watch`. Never merge while a check is pending: "no checks reported yet" is pending, not green.

- All green: `gh pr merge <n> --squash`, then delete the branch on the remote (`git push origin --delete <branch>`), `git checkout nightly && git merge --ff-only origin/nightly`, delete the local branch (`git branch -D <branch>`; `-d` refuses because a squash leaves it unmerged), and confirm `git status` is clean.
- A check fails: read the log, fix, push, wait again. If it is not a docs problem (the Pages app is down, GitHub is failing), or you cannot fix it in three attempts, leave the PR open and report `SYNC FAILED`.

## 8. Report

The summary described in `SKILL.md` → "The last message". For a nightly run it ends with the PR link and the squash commit on `nightly`.
