# scripts/sync — Doc-sync engine config

Configuration and state for the **`/sync-docs`** skill (see `.claude/skills/sync-docs/SKILL.md`).

This directory holds data, not code. The skill itself is the orchestrator; it reads these files to decide what to watch, where to route changes, and where it last left off.

## Files

| File | Purpose | Committed? |
|---|---|---|
| `anchor-map.json` | Maps parent-repo paths → docs-repo paths, with detection rules and tier (auto-merge vs PR) | Yes |
| `state.example.json` | Template for `.sync-state.json` | Yes |
| `../../.sync-state.json` | Current sync state for the branch (last synced parent ref) | Yes, per-branch |
| `lib/parent-source.mjs` | Shared parent-code access for `check-drift.mjs` and `verify-edit.mjs`: pinned snapshot download, file walk, env-source selection, REST route matching | Yes |

## Parent source for the checkers

`check-drift.mjs` and `verify-edit.mjs` read parent code from a full snapshot of the resolved commit, not file by file through the GitHub API.

| Setting | Effect |
|---|---|
| *(default)* | Download `repos/<parent>/tarball/<sha>` once into `/tmp/paperclip-sync/src-<sha>/` and reuse it. The four newest snapshots are kept. |
| `PAPERCLIP_SYNC_LOCAL_SRC=<dir>` | Use an existing checkout or `git archive` extract at the right commit. |
| `PAPERCLIP_SYNC_NO_SNAPSHOT=1` | Use the GitHub contents API. The env-var scan is capped at 700 files in this mode, and the output says so in `warnings`. |
| `PAPERCLIP_SYNC_FIXTURE_DIR=<dir>` | Tests only: read JSON fixtures. Snapshot mode is off. |

Both scripts add `source` (`snapshot` / `github-api`) and `warnings` to their JSON output. Before November 2026 the API path silently capped the env scan at 700 files while parent `server/src` alone had ~1,665, which produced the same ~40 false drift items every run.

## Branch model

- **`main` (docs)** tracks the latest **released** paperclip tag (e.g. `v2026.512.0`). Deploys to docs.paperclip.ing.
- **`nightly` (docs)** tracks parent's `main` HEAD. Deploys to the Cloudflare Pages branch preview.

`.sync-state.json` therefore has a different value on each branch:

```jsonc
// on main
{ "mode": "release", "synced_to": "v2026.512.0", "synced_sha": "abc123…" }

// on nightly
{ "mode": "nightly",  "synced_to": "main",      "synced_sha": "def456…" }
```

## Anchor map

Each watcher entry declares:

- `parent_paths` — globs in github.com/paperclipai/paperclip to watch.
- `docs_paths` — globs in this repo where corresponding doc edits live.
- `tier` — `auto-merge` (mechanical, schema-bound), `pr` (judgment calls), or `context-only` (informs other watchers but never produces edits directly).
- `detect` — short prose telling the skill *how* to recognise a doc-relevant change in those files (e.g. "new `program.command()` calls", "new top-level dir").

The skill reads this file at the start of every run. Edit it when you add new doc sections or new product surfaces.

## Skip patterns

`skip_patterns` are regexes matched against parent commit messages. Anything matching is ignored entirely — this is the first line of defence against revert/wip/codex churn.

## Quarantine

`quarantine_hours` (default 24) tells nightly mode to ignore commits younger than N hours. Reverts and fix-ups tend to land in this window and cancel out before we draft anything.
