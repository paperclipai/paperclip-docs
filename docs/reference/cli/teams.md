---
paperclip_version: v2026.609.0
---

# Teams Commands

A *team* in the catalog is a ready-made starter group — a small set of agents, projects, tasks, and the skills they need — that Paperclip ships with the app. Use `paperclipai teams` when you want to browse those team templates, inspect what one would create, preview the import against a real company, and then install it. Think of it as the team-shaped equivalent of the skills catalog: instead of one reusable procedure, you get a whole working unit you can drop into a company in one step.

There are two kinds of catalog teams. **Bundled** teams ship inside the app and are the everyday starting points (a core executive team, a product-engineering pod, a product-design team). **Optional** teams are extras you reach for when you need them, and some of them pull in skills from external sources. The `--kind` filter on the browsing commands switches between the two.

> **Tip:** Add `--json` to any command to print the raw API result for scripting. Browsing commands need no company context, but `list`, `preview`, and `install` operate against a company and accept `--company-id <id>` (and respect your selected profile). See [common options](./common-options.md).

---

## Browse before you install

The browsing commands read the catalog without writing anything to a company. There is no company context required to browse, search, or inspect.

```sh
paperclipai teams browse --kind bundled --category company-defaults
paperclipai teams search "engineering" --kind bundled
paperclipai teams inspect core-exec-team
```

| Command | Use |
| --- | --- |
| `browse` | List catalog teams, optionally filtered by `--kind`, `--category`, or `--query`. |
| `search <query>` | Same as `browse` but takes the search text as a positional argument. |
| `inspect <catalogRef>` | Show one catalog team in full — its agents, projects, tasks, required skills, and file manifest. |

Browse and search filters:

| Flag | Use |
| --- | --- |
| `--kind <kind>` | Filter by catalog kind: `bundled` or `optional`. |
| `--category <slug>` | Filter by catalog category slug. |
| `--query <text>` | Free-text search (`browse` only; `search` uses its positional argument). |

A `<catalogRef>` is a catalog team ID, key, or a unique slug. Inspecting a team before you install it is the best way to see exactly which agents and projects will land in the company.

`inspect` can also print a single file out of the team package instead of the manifest detail:

| Flag | Use |
| --- | --- |
| `--file <path>` | Print a specific catalog team file (for example `TEAM.md`) instead of the manifest detail. In human mode the raw content is written to stdout so you can pipe it. |

---

## List with installed status

`teams list` is `browse` with a company lens: it shows each catalog team alongside whether it is already installed in a given company, and whether the installed copy has drifted out of date from the current catalog version. It requires a company context.

```sh
paperclipai teams list --company-id <company-id>
paperclipai teams list --kind optional --company-id <company-id>
```

| Flag | Use |
| --- | --- |
| `--kind <kind>` | Filter by catalog kind: `bundled` or `optional`. |
| `--category <slug>` | Filter by catalog category slug. |
| `--query <text>` | Free-text search. |

Each row reports the team's installed status — not installed, installed, out of date, or installed-but-missing — together with how many agents and projects it carries. A team is flagged out of date when an installed agent's recorded origin differs from the catalog team's current content, which is your cue to reinstall the newer version.

---

## Preview an install

Before you commit, `teams preview` runs the import on the server and shows you the plan without writing anything. It reports what would be created, which skills the team needs and how they would be prepared, and any warnings or errors. It requires a company context.

```sh
paperclipai teams preview core-exec-team --company-id <company-id>
paperclipai teams preview product-engineering \
  --target-manager-slug cto \
  --collision-strategy rename \
  --company-id <company-id>
```

| Flag | Use |
| --- | --- |
| `--target-manager-agent-id <id>` | Existing agent ID that the catalog's root agents should report to. |
| `--target-manager-slug <slug>` | Portable manager slug that the catalog's root agents should report to. |
| `--agent <slug>` | Only preview the selected agent slug. Repeat for several. |
| `--collision-strategy <strategy>` | How to handle existing matches: `rename`, `skip`, or `replace`. |
| `--name-override <slug=name>` | Override an imported entity's name. Repeat for several. |
| `--selected-file <path>` | Restrict the preview to a selected portable file. Repeat for several. |
| `--allow-external-sources` | Allow GitHub, URL, or skills.sh skill sources declared by the catalog team. |
| `--allow-unpinned-optional-sources` | Allow optional-team external skill sources that are not pinned to a commit. |
| `--allow-local-path-sources` | Development only: allow local-path skill sources declared by the catalog team. |

The two manager options let you slot a team in under your existing org chart: instead of the team's root agents standing alone, they report to an agent you already have. Use `--target-manager-agent-id` when you know the exact agent ID, or `--target-manager-slug` for a portable slug.

---

## Install a team

`teams install` does what `preview` shows: it imports the team into the company, creating its agents, projects, tasks, and preparing its required skills. It requires a company context and accepts everything `preview` does, plus a few install-only flags.

```sh
paperclipai teams install core-exec-team --company-id <company-id>

paperclipai teams install product-engineering \
  --target-manager-slug cto \
  --adapter-override senior-coder=claude_local \
  --company-id <company-id>
```

`install` shares all of `preview`'s flags (`--target-manager-agent-id`, `--target-manager-slug`, `--agent`, `--collision-strategy`, `--name-override`, `--selected-file`, and the three `--allow-*` source flags) and adds:

| Flag | Use |
| --- | --- |
| `--secret-value <key=value>` | Provide a value for a secret env input the team declares. Repeat for several. |
| `--adapter-override <slug=type>` | Adapter type override for an imported agent slug — for example `senior-coder=claude_local`. Repeat for several. |
| `--request-approval-on-forbidden` | When the install is denied because you lack `agents:create` permission, create a board approval request instead of exiting with the raw 403. |
| `--approval-issue-id <id>` | Issue ID to link to the fallback approval request. Defaults to `PAPERCLIP_TASK_ID` when that is set. |

Catalog teams ship without a fixed adapter per agent on purpose, so the install lets you choose the runtime. Use `--adapter-override <slug=type>` to pin a specific agent to an adapter such as `claude_local` or `codex_local`; agents you do not override are resolved at import time.

### When you do not have permission to create agents

Installing a team creates agents, which requires the `agents:create` permission. If the server denies the install for that reason, you would normally see a `403`. Pass `--request-approval-on-forbidden` (or run inside a Paperclip task, where `PAPERCLIP_TASK_ID` is set) and the CLI instead files a board approval request describing the install you attempted, so a board operator can approve it. Any secret values you passed are stripped from the stored request and redacted in the returned result.

---

## See also

- [Team Catalog guide](../../guides/org/team-catalog.md) — what catalog teams are and how to use them from the app.
- [Skills commands](skills.md) — the skills catalog, the closest single-capability analogue.
- [Company commands](company.md) — company context, export, and import (catalog installs ride on the same portability engine).
- [Agent commands](agent.md) — inspect the agents an install creates.
- [Approval commands](approval.md) — work with the board approval the forbidden-install fallback raises.
- [Common options](./common-options.md) and [output and scripting](./output-and-scripting.md) — shared flags and `--json` handling.
