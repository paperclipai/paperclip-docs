# scripts/sync — Doc-sync engine config

Configuration and state for the **`/sync-docs`** skill (see `.claude/skills/sync-docs/SKILL.md`).

This directory holds data, not code. The skill itself is the orchestrator; it reads these files to decide what to watch, where to route changes, and where it last left off.

## Files

| File | Purpose | Committed? |
|---|---|---|
| `anchor-map.json` | Maps parent-repo paths → docs-repo paths, with detection rules and tier (auto-merge vs PR) | Yes |
| `state.example.json` | Template for `.sync-state.json` | Yes |
| `../../.sync-state.json` | Current sync state for the branch (last synced parent ref) | Yes, per-branch |

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
