---
name: sync-docs
description: Keep paperclip-docs in lockstep with the parent paperclipai/paperclip codebase. Finds what changed in the parent code, writes friendly-tutorial-voice doc updates, verifies every added line against the code, and lands them. Two modes — `nightly` (tracks parent's default branch behind a 48-hour quarantine, lands on the `nightly` preview branch without asking) and `release` (on a new stable parent tag: builds a reviewed PR against `main`, waits for one approval, then tags, realigns and verifies the live site). Trigger phrases: "sync docs", "update docs from paperclip", "/sync-docs", "check for paperclip changes", "is docs current".
---

# /sync-docs — Paperclip docs sync

This skill keeps **paperclip-docs** in step with the parent code repo **paperclipai/paperclip**, written in our friendly-tutorial voice for end users, operators and developers.

> The **parent's code** is the source of truth. Its release notes and its own docs are hints about intent, never a source for a claim, and never copied.

A run is expected to finish with nobody watching. Read this file, then the one for your mode:

| File | Read it when |
|---|---|
| [`nightly.md`](nightly.md) | `sync:prepare` says `mode: nightly` |
| [`release.md`](release.md) | `sync:prepare` says `mode: release` |
| [`review.md`](review.md) | Before authoring or reviewing anything, in either mode |
| [`troubleshooting.md`](troubleshooting.md) | Something failed, or a check disagrees with you |
| [`audit.md`](audit.md) | You were asked for the next-day audit (`--audit`). It replaces everything below from "Every run starts the same way" on |

## The two modes

| | `nightly` | `release` |
|---|---|---|
| Tracks | parent default branch (`master`), 48 hours behind | the parent's latest **stable** tag (clean CalVer `vYYYY.MDD.P`) |
| Lands on | `nightly` branch, Cloudflare Pages preview | `main` branch, docs.paperclip.ing |
| Readers | early adopters, contributors | everyone |
| Who merges | the run, when CI is green | the maintainer approves the merge; the run does everything before and after |

The branch model is non-negotiable: readers on the latest *released* Paperclip must never see docs for features that are not out yet. Our `nightly` branch tracks parent `master`, which runs weeks ahead of the stable tag, so a release is never "merge nightly into main" — see `release.md`.

## What the run may do without asking

The maintainer granted this on 2026-11-21. It is the whole of the standing permission; anything outside it needs an explicit ask.

| Action | Nightly | Release |
|---|---|---|
| Commit on a `nightly-draft/*` or `release/*` branch | yes | yes |
| Push that branch, open the PR | yes | yes |
| Push `nightly` itself (a merge of `main`, or the post-release realign) | yes | yes |
| Squash-merge the PR once every check is green | **yes** | **no — stop and wait for approval** |
| Push to or merge into `main` any other way | never | never |
| `git rm` doc pages | never | yes, on `release/*`, in the exact form in `release.md` |
| Edit `scripts/sync/**`, this skill, or any hook during a run | never | never |

A nightly run must not end its turn on a question. When it cannot finish, it says so (see "The last message").

The next-day audit (`audit.md`) has one permission of its own: it posts, or replaces, its one comment on the pull request it audited. It never commits, pushes or edits a page.

## Invocation

```
/sync-docs                 # auto: release if a new stable tag exists, otherwise nightly
/sync-docs --nightly       # force nightly mode
/sync-docs --release       # force release mode
/sync-docs --dry-run       # prepare and triage only: no edits, no commits
/sync-docs --ask           # do the work, commit locally, then ask before pushing
/sync-docs --rehearse      # full run on the current branch, committed locally, nothing pushed
/sync-docs --pin <sha>     # nightly: use this parent commit instead of the quarantine pin
/sync-docs --audit         # the next-day audit of the last sync commit: read-only, see audit.md
/sync-docs --audit-file <f>  # nightly rehearsal: take audit findings from this file, not from the PR
```

`--pin` and `--audit-file` are passed on to `sync:prepare` as they are.

`--rehearse` is for testing the skill itself: stay on whatever branch is checked out, skip the `main` merge, do every other step including review, gates and the commits, and stop before the first push. Pass `--base <the branch you started on>` to `sync:gates`, since the change is measured against that branch, not `origin/nightly`. Say in the summary what would have been pushed.

## Every run starts the same way

```sh
npm run --silent sync:prepare            # add: -- --pin <sha>, or -- --mode release
```

It fetches, picks the mode, finds the pin (or the tag), extracts the parent code at exactly that commit, diffs the window, runs the drift check and lists stale screenshots. Read the summary, then the JSON it names (`/tmp/paperclip-sync/run-<short>/prepare.json`) for detail. Exit code 2 means blocked.

| `prepare` says | Do |
|---|---|
| `BLOCKED` | Do not work around it. Report `SYNC FAILED:` with the blocking line. |
| `nothing to do` | Change nothing. Report that in one line and stop. |
| `ready`, `mode: nightly` | Follow `nightly.md`. |
| `ready (audit corrections only)` | Follow `nightly.md`. No parent commits are new, but the audit left findings to correct; each step says what such a run skips. |
| `ready`, `mode: release` | Follow `release.md`. |

Two paths from `prepare.json` are used for every read of parent code for the rest of the run:

- `parent.parent_src` — the parent tree at the pin or tag, as plain files. Read and grep here.
- `parent.parent_git` — a bare clone. Use `git -C <parent_git> show|log|blame` for history, always naming the pinned SHA.

**Never read parent code from anywhere else**: not `master`, not the GitHub API without `?ref=<sha>`, not a web page. A subagent that reads `master` HEAD silently defeats the quarantine, and no checker can tell.

## Rules that hold in both modes

1. **The pin is the truth.** Every claim on an added line must hold in the parent code at the pin (nightly) or the tag (release). True on `master` today is not enough.
2. **Review is part of the run**, not something a human asks for afterwards. Follow the loop in `review.md` before every push, however small the diff.
3. **What cannot be proven gets cut**, not softened and not held. Remove the sentence, log it in `PENDING.md` under "Cut in review" with the file you traced it to.
4. **One branch, one PR per run.** Mechanical edits and judgment edits travel together.
5. **Subagents never write `site/content.json`.** Authors return a `nav_addition`; the orchestrator merges them in one edit. Two parallel authors once clobbered each other's nav entries.
6. **Stage explicit paths.** Never `git add -A` or `git add .`. Untracked files you did not create are not yours: leave them, list them in the summary.
7. **Wait for what you start.** Do not end a turn while a subagent or CI is still running unless the harness will wake you when it finishes. If an agent has not reported after 20 minutes, check on it.
8. **Shell hygiene.** The shell is zsh on macOS:
   - There is no `timeout` command. A check wrapped in it did not run.
   - Read exit codes directly. `cmd | tail` reports `tail`'s status.
   - `for x in $VAR` does not word-split; use `while IFS= read -r x`.
   - Quote every redirect target and every glob argument (`grep --include='*.ts'`): an unquoted glob that matches nothing is an error in zsh. Scratch files go in the run directory, never the repo.
9. **Use the scripts.** `sync:prepare`, `sync:gates` and `sync:realign` exist because doing these steps by hand went wrong. If one of them is wrong, report it; do not patch it mid-run and do not substitute a hand-rolled check. They need the network (`git fetch`, `gh`): if the harness sandboxes shell commands, run them with the sandbox off.

## Files a run reads and writes

- `.sync-state.json` — written from `next_state` in `prepare.json`, once, in the commit that carries the docs. A run that changes nothing, or fails before that commit, leaves it alone. Its `audits_applied` list is how a run knows which audits an earlier run has already handled.
- `PENDING.md` (nightly) — what this window applied, what it skipped, what was cut, open questions. Format in `nightly.md`.
- `SCREENSHOTS_PENDING.md` (nightly) — copied from the generated file in the run directory.
- `docs/reference/changelog.md` (release only) — one entry per release.
- `scripts/sync/anchor-map.json` — read-only: which parent paths map to which docs, and `quarantine_hours`.
- `docs/user-guides/screenshots/registry.json` — read by `prepare`; written only by the screenshot pipeline.

## Before anything is pushed

Commit first, then:

```sh
npm run --silent sync:gates -- --against <pin-or-tag>            # nightly
npm run --silent sync:gates -- --against <tag> --base origin/main   # release
```

One command runs the build, every `docs:test:*` gate, links, nav, screenshots, duplicated blocks, the identifier check on added lines, and drift, and exits non-zero if a blocking gate failed. Fix the page, never the check. See `troubleshooting.md` for the one sanctioned way to waive a proven checker false positive.

## The last message

End every run with a short summary: mode, pin or tag, pages changed, defects fixed per review round, claims cut, gates, open questions, the PR link and (nightly) the merge commit. If the harness has a notification tool, send a one-line digest as well (under 200 characters: `Docs sync: <mode> <short-pin>, N pages, PR #n merged`, or the `SYNC FAILED:` line); the summary itself stays in the thread. No tool, or a notification that could not be delivered, is not a failure: say so in one line of the summary.

`<short-pin>` in branch names and titles is always the first **8** characters of the pin (`window.pin_short`).

If the run did not finish — blocked, a gate you could not get green, CI red, a harness failure — the first line of both the summary and the notification is:

```
SYNC FAILED: <one-line reason>
```

then what state things were left in (branch, local commits, open PR) and the one thing a human has to do. "Merged" is the only success state for a nightly run; "PR open, waiting for approval" is the only one for a release run before the maintainer's approval.

## Maintaining this skill

- Parent restructured (`cli/src/commands` moved, a new surface with no watcher): fix `scripts/sync/anchor-map.json`. `prepare` prints how many changed files matched no watcher; a number that keeps growing is the signal.
- A checker reports the same false positive run after run: that is a bug in `scripts/sync/`, to be fixed with a regression test in `scripts/sync/test.mjs`, in its own PR. Never keep a standing "known false positives" list.
- `npm run sync:test` runs the hermetic tests for every helper.
- Installed for Claude Code through the symlink `.claude/skills/sync-docs -> ../../skills/sync-docs`.
- The background and diagrams are in `maintenance/maintenance.md`; that file explains, this one instructs.
