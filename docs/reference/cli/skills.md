---
paperclip_version: v2026.609.0
---

# Skills Commands

Use these commands to put capabilities in front of your agents: browse the app-shipped catalog, install skills into a company's library, attach the ones an agent should actually use, and keep installed skills in sync with their pinned origins. Skills are how you teach an agent a repeatable procedure (open a pull request, run a browser, follow a review checklist) without rewriting its prompt every time.

There are two command groups. The plural `paperclipai skills` group is the one you reach for in practice — it understands catalog references, resolves skills by `id`/`key`/`slug`, and prints readable tables. The singular `paperclipai skill` group is a thin, payload-driven wrapper over the same company-skill API endpoints; use it only when you need raw control over the request body in a script.

---

## The three operations

`paperclipai skills` spans three distinct things. Keeping them straight is the whole mental model:

| Operation | Commands | What it changes |
| --- | --- | --- |
| **Company install** | `skills install`, `import`, `create`, `scan-projects` | Adds or updates a skill in the company's library. Available to the whole company; does **not** attach it to any agent. |
| **Agent attach** | `skills agent sync`, `skills agent clear` | Replaces an agent's *desired* (non-required) company-skill set. A desired-state operation — it is not additive. |
| **Adapter runtime sync** | reported by `skills agent list`; triggered by `sync`/`clear` | The server-side adapter reconciles the desired set with files on disk and returns an `AgentSkillSnapshot`. |

> **Note:** Required Paperclip runtime skills (heartbeat and friends) are enforced by the server. They always remain on an agent — `skills agent clear` only removes the *non-required* desired skills you added.

> **Tip:** Add `--json` to any command to print the raw API result for scripting. Every company-scoped command takes `--company-id <company-id>` (and respects your selected profile/context). See [common options](./common-options.md).

---

## Catalog: browse before you install

The Paperclip app ships a curated catalog of skills. Catalog commands let you read it without writing anything to a company — there is no company context required to browse, search, or inspect.

```sh
paperclipai skills browse --kind bundled --category github
paperclipai skills search "pull request" --kind bundled
paperclipai skills inspect github-pr-workflow
```

| Command | Use |
| --- | --- |
| `browse` | List catalog skills, optionally filtered by `--kind`, `--category`, or `--query`. |
| `search <query>` | Same as `browse` but takes the search text as a positional argument. |
| `inspect <catalogRef>` | Show one catalog skill in full, including its file manifest (path, kind, size, sha256). |

Browse/search filters:

| Flag | Use |
| --- | --- |
| `--kind <kind>` | Filter by catalog kind: `bundled` or `optional`. |
| `--category <slug>` | Filter by catalog category slug. |
| `--query <text>` | Free-text search (`browse` only; `search` uses its positional argument). |

A `<catalogRef>` is a catalog skill `id`, `key`, or a unique `slug`. Inspect a skill before installing it so you know exactly which files will land in the company library.

---

## Catalog install into the company library

`skills install` materializes a catalog skill into a company-managed skill. This is a **company install** — it does not attach the skill to any agent.

```sh
paperclipai skills install github-pr-workflow --company-id <company-id>
paperclipai skills install github-pr-workflow --as review-prs --company-id <company-id>
```

| Flag | Use |
| --- | --- |
| `--as <slug>` | Override the company skill slug. |
| `--force` | Replace a same-key catalog-managed skill when the server allows it. Never bypasses hard validation or hard-stop audit findings. |

After install the command reminds you that nothing is attached yet. To make an agent use it, run an [agent attach](#agent-attach-desired-skills) afterward.

> **Note:** Catalog commands are for the app-shipped catalog only. GitHub, skills.sh, local-path, and plain-URL sources go through `skills import` instead.

---

## Company library

These commands manage the skills that exist in a company, regardless of where they came from. All require a company context.

```sh
paperclipai skills list --company-id <company-id>
paperclipai skills show <skill-ref> --company-id <company-id>
paperclipai skills file <skill-ref> --path SKILL.md --company-id <company-id>
paperclipai skills import <source> --company-id <company-id>
paperclipai skills create --name "Review PRs" --slug review-prs --body-file SKILL.md --company-id <company-id>
paperclipai skills scan-projects --project-id <project-id> --company-id <company-id>
```

| Command | Use |
| --- | --- |
| `list` | List every skill in the company library. |
| `show <skillRef>` | Show full detail for one company skill. |
| `file <skillRef>` | Print one skill file. Defaults to `SKILL.md`; pass `--path <path>` for another file. In human mode the raw content is written to stdout so you can pipe it. |
| `import <source>` | Import skills from a local path, GitHub, skills.sh, or a URL source. Prints the imported skills plus any warnings. |
| `create` | Create a managed local skill from flags and an optional markdown body. |
| `scan-projects` | Scan project workspaces for skills and import or update what it finds. |

A `<skillRef>` resolves against the company library by `id`, canonical `key`, or unique `slug`. An ambiguous slug is rejected — use an `id` or `key` instead.

`skills create` options:

| Flag | Use |
| --- | --- |
| `--name <name>` | Required. Skill name. |
| `--slug <slug>` | Optional explicit slug. |
| `--description <text>` | Optional description. |
| `--body-file <path>` | Markdown body file. Use `-` to read the body from stdin. |

`skills scan-projects` options (each may be repeated):

| Flag | Use |
| --- | --- |
| `--project-id <id>` | Project ID to scan; repeat for several. |
| `--workspace-id <id>` | Workspace ID to scan; repeat for several. |

With no `--project-id`/`--workspace-id` the scan covers the company's projects and workspaces. The summary line reports projects/workspaces scanned plus discovered, imported, updated, skipped, conflicts, and warnings counts.

---

## Maintenance loop: check, update, audit, reset

Catalog-installed skills are pinned to an origin. Over time the catalog moves on, or someone edits the installed bytes locally. These four commands are the maintenance loop. The skill reference is optional on `check`, `update`, and `audit`; omit it to operate over the whole library.

```sh
paperclipai skills check --company-id <company-id>
paperclipai skills update <skill-ref> --company-id <company-id>
paperclipai skills update --all --company-id <company-id>
paperclipai skills audit <skill-ref> --company-id <company-id>
paperclipai skills reset <skill-ref> --yes --company-id <company-id>
```

| Command | Use |
| --- | --- |
| `check [skillRef]` | Report update status: `supported`, `hasUpdate`, `currentRef`/`latestRef`, `installedHash`/`originHash`, any `updateHoldReason`, and the `auditVerdict`. |
| `update [skillRef]` | Install the pinned update for one skill. |
| `update --all` | Check every skill and update only those with `hasUpdate=true`; supported-but-current and unsupported skills are skipped with a reason. |
| `audit [skillRef]` | Re-scan installed bytes and report findings (severity, code, path, message) without executing anything. |
| `reset <skillRef>` | Reinstall a catalog-managed skill from its pinned origin, discarding local edits. |

`update` and `reset` accept `--force`:

| Flag | Use |
| --- | --- |
| `--all` | (`update` only) Update every skill that has an available update. |
| `--force` | Discard local-modification and soft-audit holds. Hard-stop audit findings still block the operation. |
| `--yes` | (`reset` only) Confirm without the interactive prompt. Required when not in a TTY. |

> **Warning:** Pass either a skill reference or `--all` to `update`, never both — the command rejects that combination.

---

## Remove a skill

```sh
paperclipai skills remove <skill-ref> --yes --company-id <company-id>
```

`skills remove` deletes a skill from the company library. It prompts for confirmation in an interactive terminal and requires `--yes` when run non-interactively.

---

## Agent attach: desired skills

Once a skill is in the library, attaching it to an agent is a desired-state replacement, not an addition. `skills agent sync` sets the agent's full non-required desired set; anything you omit is dropped. The adapter then reconciles and the command returns an `AgentSkillSnapshot`.

```sh
paperclipai skills agent list <agent-ref> --company-id <company-id>
paperclipai skills agent sync <agent-ref> --skill review-prs --skill agent-browser --company-id <company-id>
paperclipai skills agent clear <agent-ref> --yes --company-id <company-id>
```

| Command | Use |
| --- | --- |
| `agent list <agentRef>` | Show the agent's runtime skill snapshot: adapter type, whether sync is `supported`, the `mode`, the desired count, and per-skill runtime entries (state, origin, managed/required flags). |
| `agent sync <agentRef>` | Replace the agent's non-required desired company skills and sync runtime state. Requires at least one `--skill`. |
| `agent clear <agentRef>` | Clear the non-required desired set (sends an empty list). Prompts in a TTY; requires `--yes` otherwise. |

| Flag | Use |
| --- | --- |
| `--skill <skillRef>` | (`sync`) A desired company skill `id`, `key`, or `slug`. Repeat for several. At least one is required. |
| `--yes` | (`clear`) Confirm without the interactive prompt. |

An `<agentRef>` is an agent `id` or shortname/url-key. Because `sync` is a full replacement, list the complete desired set every time. Required Paperclip skills survive both `sync` and `clear` — the server keeps enforcing them.

---

## The singular `skill` group

`paperclipai skill` is a lower-level wrapper over the same company-skill API. It does not resolve `key`/`slug` references — every subcommand takes a literal `<skillId>` — and the create/import/scan/file-update operations are driven by a raw JSON payload. Reach for it only when you are scripting against a known skill ID and want direct control of the request body.

```sh
paperclipai skill list -C <company-id>
paperclipai skill get <skill-id> -C <company-id>
paperclipai skill file <skill-id> --path SKILL.md -C <company-id>
paperclipai skill file:update <skill-id> --payload-json '{"path":"SKILL.md","content":"..."}' -C <company-id>
paperclipai skill update-status <skill-id> -C <company-id>
paperclipai skill install-update <skill-id> -C <company-id>
paperclipai skill delete <skill-id> -C <company-id>
```

| Command | Use |
| --- | --- |
| `list` | List company skills (raw API output). |
| `get <skillId>` | Get one skill's detail by ID. |
| `file <skillId>` | Read a skill file; `--path` defaults to `SKILL.md`. |
| `file:update <skillId>` | Update a skill file. Requires `--payload-json` (a `CompanySkillFileUpdate` body). |
| `create` | Create a local skill. Requires `--payload-json`. |
| `import` | Import skills from a source. Requires `--payload-json`. |
| `scan-projects` | Scan project workspaces for skills. Requires `--payload-json`. |
| `update-status <skillId>` | Read the update status for one skill. |
| `install-update <skillId>` | Install the available update for one skill. |
| `delete <skillId>` | Delete a skill by ID. |

Every `skill` subcommand takes `-C, --company-id <id>`. Prefer the plural `skills` group for everyday work — it gives you reference resolution, confirmation prompts, and readable output that the singular group does not.

---

## See also

- [Agent commands](agent.md) — inspect agents and set up a local agent CLI session.
- [Adapter commands](adapter.md) — the runtimes that reconcile desired skills into files on disk.
- [Company commands](company.md) — company context, export, and import (skills travel in company packages).
- [Project commands](project.md) — the projects and workspaces `scan-projects` reads from.
- [Common options](./common-options.md) and [output and scripting](./output-and-scripting.md) — shared flags and `--json` handling.
