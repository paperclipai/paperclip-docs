# scripts/sync — the doc-sync engine

Scripts, config and state for the **`/sync-docs`** skill (`skills/sync-docs/SKILL.md`). The skill is the playbook; these do the parts that must come out the same way every run.

## What a run calls

| Command | Script | What it does |
|---|---|---|
| `npm run sync:prepare` | `prepare.mjs` | Start of every run. Fetches, picks the mode, finds the quarantine pin (or the release tag and cut point), extracts the parent code at that commit, diffs the window, buckets changed files by watcher, runs drift, lists stale screenshots. Writes `/tmp/paperclip-sync/run-<short>/prepare.json`. Read-only for this repo. Exit 2 when blocked. |
| `npm run sync:gates -- --against <sha>` | `gates.mjs` | Every pre-merge check in one call with one exit code: build, each `docs:test:*`, links, nav, screenshots, duplicated blocks, identifiers on added lines, drift. Logs in the run directory. |
| `npm run sync:realign -- release/<tag>` | `realign-nightly.mjs` | After a release PR is squash-merged: ports the release's corrections to `nightly` by cherry-pick, records `main` as merged, resets nightly's state. Lists conflicts and unported commits. |

## Checkers the gates run (usable on their own)

| Script | Checks |
|---|---|
| `check-drift.mjs` | Things the docs mention that the parent no longer has: paths, CLI commands, env vars, REST routes, permission keys. |
| `verify-edit.mjs` | Every identifier one page claims, against parent code. `gates.mjs` filters its findings to added lines. |
| `lint-duplicates.mjs` | A heading or block that appears twice in one page and did not before. |
| `lint-links.mjs`, `verify-nav.mjs`, `verify-screenshots.mjs` | Broken links, dangling nav entries, untracked screenshots. |
| `check-tag-accuracy.mjs` | Advisory second opinion in release mode. |
| `compare-window.mjs`, `detect-renames.mjs` | GitHub-API diff helpers from before the local parent clone; kept for ad-hoc use. |

`npm run sync:test` runs the hermetic tests for all of them.

## Where parent code comes from

Everything reads the parent at one pinned commit, from disk:

| Path | What | Made by |
|---|---|---|
| `~/.cache/paperclip-sync/paperclip.git` | Persistent bare clone (branches plus stable `v*` tags). Override with `PAPERCLIP_SYNC_PARENT_GIT`. | `prepare.mjs` |
| `/tmp/paperclip-sync/src-<sha>/` | Plain extract of one commit. The four newest are kept. | `prepare.mjs` (from the clone) or the checkers (tarball download) |
| `/tmp/paperclip-sync/run-<short>/` | One run's files: `prepare.json`, increment lists, generated `SCREENSHOTS_PENDING.md`, gate logs. | `prepare.mjs`, `gates.mjs` |

Checker environment switches:

| Setting | Effect |
|---|---|
| `PAPERCLIP_SYNC_LOCAL_SRC=<dir>` | Use this extract. `gates.mjs` sets it when the snapshot for `--against` exists. |
| `PAPERCLIP_SYNC_NO_SNAPSHOT=1` | Fall back to the GitHub contents API. The env-var scan is capped at 700 files and says so in `warnings`; `gates.mjs` treats that as a failure. |
| `PAPERCLIP_SYNC_FIXTURE_DIR=<dir>` | Tests only. |
| `PAPERCLIP_SYNC_CACHE_DIR=<dir>` | Move `/tmp/paperclip-sync`. |

Both checkers report `source` (`snapshot` or `github-api`) and `warnings` in their JSON.

## Config and state

| File | Purpose |
|---|---|
| `anchor-map.json` | Which parent paths feed which docs (`watchers`), and `quarantine_hours` (48). There are no commit-message skip patterns, on purpose: see `$notes` in the file. |
| `../../.sync-state.json` | Per-branch state. `prepare.mjs` computes the next value (`next_state`); the run writes it once at the end. Template: `state.example.json`. |
| `lib/parent-source.mjs` | Snapshot download, file walk, env-source selection, route matching for the checkers. |
| `lib/sync-util.mjs` | Pure helpers: globs, watcher matching, CalVer, commit-subject parsing, diff line numbers, duplicate detection. |

`.sync-state.json` fields:

```jsonc
{
  "branch_mode": "nightly",                 // "release" on main, "nightly" on nightly
  "base_release_tag": "v2026.1117.0",       // the release both branches build on
  "base_release_sha": "c0f13289…",          // parent commit at that tag
  "last_seen_parent_sha": "fe0c4aa9…",      // the pin the last nightly run documented; the next window starts here
  "last_applied_manifest_hash": "…",        // fingerprint of the last window's commit list
  "last_run_at": "2026-11-21T11:00:20.000Z",
  "last_run_outcome": "applied"
}
```

## Branch model

- **`main`** documents the latest **stable** Paperclip tag and deploys to docs.paperclip.ing.
- **`nightly`** documents parent `master`, 48 hours behind, and deploys to the Cloudflare Pages preview.
- Release PRs are squash-merged, which cuts the history between the two branches every release. `sync:realign` repairs that; nightly sync commits end in `(paperclip <sha>)` so the next release can find its cut point.
