# skills/

Claude Code skills that ship with this repo. These are committed alongside the docs so the sync workflow stays reproducible across machines and contributors.

## Available skills

| Skill | What it does | Invoke |
|---|---|---|
| [`sync-docs`](sync-docs/SKILL.md) | Keeps these docs in lockstep with the parent `paperclipai/paperclip` codebase. Two modes: nightly (tracks parent `main`, preview deploy) and release (on parent tag, merges to `main`, ships live). | `/sync-docs` |

## Using a skill from this repo

Skills here are plain Markdown files with frontmatter. Claude Code discovers them by directory.

### Option A — symlink into your user-level skills dir

```sh
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/sync-docs" ~/.claude/skills/sync-docs
```

The `/sync-docs` slash command becomes available in any session.

### Option B — project-level skills dir

If your Claude Code setup supports per-project skills (`.claude/skills/`), link from there:

```sh
mkdir -p .claude/skills
ln -s "../../skills/sync-docs" .claude/skills/sync-docs
```

Either way, the skill files themselves stay versioned in `skills/`, so updates flow with normal git operations.

## Why skills live in the repo

The doc-sync workflow is repo-specific (it knows about *our* `anchor-map.json`, *our* branch model, *our* voice rules). Shipping it inside the repo means:

- Anyone cloning the repo gets the workflow.
- Changes to the workflow review like any other PR.
- The skill's prompts evolve alongside the docs they produce.
