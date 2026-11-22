# When something goes wrong

A run has nobody to ask. For each failure below there is one thing to do. When none fits, stop cleanly and report `SYNC FAILED:` with what you found; a clear failure is worth more than a workaround.

## Failures

| What happened | Do |
|---|---|
| `sync:prepare` says tracked files are modified or staged | Do not stash, reset or clean. `SYNC FAILED`, naming the files. Untracked files never block a run. |
| `gh` is not authenticated | `SYNC FAILED`. The maintainer runs `gh auth login`. |
| The agent's own login expired ("this login reached its time limit") | Nothing a run can do; it dies at start. Scheduled runs need a long-lived token: `claude setup-token`, then `CLAUDE_CODE_OAUTH_TOKEN` in the scheduler's environment. |
| `prepare` cannot fetch the parent | It falls back to the clone as it was and warns. If the pin it needs is not in the clone, `SYNC FAILED`. |
| `last_seen_parent_sha` is not an ancestor of the pin | Parent history was rewritten, or the state file is wrong. `SYNC FAILED`; do not guess a base. |
| `main` → `nightly` merge conflicts on a few pages | Resolve per hunk against the pin (`nightly.md` step 1). |
| `main` → `nightly` merge has add/add conflicts on dozens of pages | See "Release was squashed and nightly was not realigned". |
| The build or a `docs:test` gate fails | Fix the page. Never weaken or skip the gate. |
| `verify-edit` blocks on an added line | The identifier is not in the parent at the pin. Usually the page is wrong: fix it. If you have opened the code and the identifier is really there, see "Checker findings" below. |
| A reviewer did not report, or checked fewer lines than given | Send the unchecked pages to another reviewer. Do not count them as reviewed. |
| A subagent has been silent for 20 minutes | Check on it. If it is dead, redo its work; a run once sat 80 minutes on a dead agent. |
| CI is red on the PR | Read the failing job, fix, push, wait again. Three attempts, then leave the PR open and `SYNC FAILED`. |
| CI shows no checks at all | That is not green. Wait; if nothing reports after 10 minutes, `SYNC FAILED` (the Pages app or Actions is down). |
| The deletion hook blocks a command | It is a deliberate guard. Do not route around it with another tool. In a release, use the exact `git rm` form in `release.md`; anywhere else, report the command for the maintainer to run. |
| A release was merged but the site still shows the previous one | `release.md` step 8.5. |
| You hit a usage or session limit mid-run | The harness resumes you. On resume, re-read `prepare.json` and `git status` before continuing; do not redo finished steps. |

## Checker findings you believe are wrong

`verify-edit` and the drift check only match identifiers, and they have gaps (placeholder names in examples, config blocks for adapters whose package directory they cannot find, vars injected at runtime).

- A finding on an **untouched** line never blocks; `sync:gates` only counts it.
- A finding on an **added** line blocks until you either fix the page or prove the checker wrong. To prove it: open the parent code at the pin, find the identifier, and write a waiver:

  ```json
  [{ "doc": "docs/reference/adapters/x.md", "kind": "env-var", "value": "X_API_KEY",
     "reason": "example placeholder in a fenced config block, not a Paperclip variable",
     "evidence": "packages/adapters/x/src/index.ts:42" }]
  ```

  Save it as `<run_dir>/waivers.json` and re-run `npm run --silent sync:gates -- --against <pin> --waivers <run_dir>/waivers.json`. Every waiver is listed in the PR body and the summary, with the checker gap named, so it can be fixed in `scripts/sync/` with a regression test.
- Never write a standing list of "known false positives" into `PENDING.md`. One such list hid five retired env vars for three weeks: they were real.
- Drift is reported, not blocking. Each record still gets looked at (`nightly.md` step 2).

## Special cases

### Release was squashed and nightly was not realigned

Symptom: `git merge origin/main` on `nightly` produces add/add conflicts on every page both branches carry. Cause: the release PR was squash-merged and `sync:realign` never ran, so `main` and `nightly` share no history for that cycle.

`git merge --abort`, then `npm run --silent sync:realign -- release/<tag>`. If the local release branch is gone, recreate it from the merged PR's head SHA (`gh pr view <n> --json headRefOid`, then `git branch release/<tag> <sha>`). Then follow `release.md` step 8.3. Never reset `nightly` onto `main`: that destroys the drafts for everything after the tag.

### A teammate's hot-fix on `main` documents something unreleased

It will conflict with nightly, or worse, merge cleanly. On nightly, treat it like any other content: check it against the pin, keep what is true. In the summary, say that `main` is serving a claim about an unreleased feature and name the page; correcting `main` is a hot-fix PR for a human to approve.

### A feature was documented and then removed upstream

The next run's window contains the removal. Triage finds it as a removed surface: take the feature out of every page that mentions it, and say so under "Applied this run". The 48-hour quarantine and the `post_pin` check make this rare, not impossible.

### The parent restructured and watchers match nothing

`prepare` shows most changed files under "no watcher". Triage from the code anyway (the watchers are a map, not a filter), and report that `scripts/sync/anchor-map.json` needs new paths.

### The tag is older than anything in the clone, or tags were deleted upstream

`SYNC FAILED` with the tag name. `.sync-state.json` needs a human decision about the base.

### Open `nightly-draft/*` PRs when a release starts

List them in the release PR body. They are not part of the release unless they were merged into `nightly` before the cut point.

### Orphan pages

`verify-nav` reports markdown files that are not in `site/content.json` as warnings. `docs/reference/cli/commands.md` and `control-plane-commands.md` are deliberate redirect anchors; leave them.
