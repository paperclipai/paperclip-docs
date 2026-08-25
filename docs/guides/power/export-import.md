---
paperclip_version: v2026.824.0
seo_title: Export and Import a Company
seo_description: Capture a configured company as a portable package to back up, share, or move between instances. What full fidelity includes, and what a package contains.
---

# Export & Import

Once you've built a company — given it a goal, hired agents, configured their adapters, and set up projects — that configuration has real value. Export and import let you capture that configuration as a portable package you can back up, share with others, move to another Paperclip instance, or reuse as a starting point for a new company.

Exports are human-readable markdown files. Anyone with the package can understand the company's structure without reading a database dump.

> **Moving a company between instances?** This is the way to do it. Export the company on one instance, import the package on the other. Import/export is the full-fidelity replacement for the old host-to-host Cloud Sync, which has been retired — you no longer need to connect two instances to each other to move work between them.

---

## What "full fidelity" means

A package isn't just a sketch of your company. It carries the working state too, so a restore or a migration lands you somewhere you recognize rather than somewhere you have to rebuild.

**What travels with the package:**

- Company name, description, branding, logo, and hiring policy
- Agents — identity, role, title, reporting lines, instructions, adapter and runtime configuration, permissions and permission grants, per-agent budgets
- Projects, their workspaces, and their sidebar order
- Skills, either as upstream references or vendored in full
- Tasks with their comments, status, priority, labels, blocked-by relationships, documents, work products, and monitors
- Routines and their schedule triggers
- Attachments and images, stored as content-addressed files and re-attached on import
- The names of the environment variables each agent needs

**What never travels:** secret values — API keys, tokens, passwords. Machine-specific paths. Internal database IDs. These are environment-specific and wouldn't be valid on another machine anyway. The package declares which env vars an agent expects; you supply the values on the receiving side.

**What is deliberately left behind:** approvals, cost history, and activity log entries. These are records of what happened on the source instance rather than configuration, so they stay there. If your company has any of them, the export page tells you so — and how many — before you download anything.

---

## What a package contains

An exported company package looks like this:

```
my-company/
├── README.md           ← A human-readable summary of the package
├── COMPANY.md          ← Company name, goal, and metadata
├── agents/
│   ├── ceo/AGENTS.md   ← Agent identity, role, and instructions
│   └── cto/AGENTS.md
├── projects/
│   └── main/PROJECT.md
├── skills/
│   └── review/SKILL.md
├── tasks/
│   └── onboarding/
│       ├── TASK.md
│       └── documents/brief.md
├── images/             ← Company logo and inline images
├── blobs/              ← Attachment bytes, named by content hash
└── .paperclip.yaml     ← Adapter types, environment variable declarations, budgets
```

Everything except `blobs/` is text, so a package diffs cleanly in Git and reads fine in any editor.

---

## Exporting a company

You can export and import from the Paperclip UI now. The terminal commands still exist if you prefer them, but they're no longer the only path.

### In the UI

Open **Company Settings** and look for the **Company Packages** section. It has two buttons: **Export** and **Import**.

The export page lets you pick what to include with a small set of toggles — **Agents**, **Projects**, **Skills**, **Routines**, **Tasks**, and **Attachments** — and everything is on by default. Attachments ride along with the tasks and routines that reference them, so the Attachments toggle only applies while Tasks or Routines is still selected.

Paperclip shows you the package contents before you download them, and you can uncheck individual files if you want to trim the bundle further. When you're happy, the export downloads as a single `.zip` named after the package.

On import, Paperclip previews what will be created, renamed, or skipped before anything is applied.

If the company has data the bundle can't carry — approvals, cost events, or activity log entries — the export page shows a **Not included in this export** panel listing exactly how many of each are being left behind. It's not an error; it's there so nothing surprises you six months later when you restore.

### In the terminal

To export your company to a folder:

```sh
paperclipai company export <company-id> --out ./my-export
```

Replace `<company-id>` with your company's ID (visible in the URL when you're viewing the company in Paperclip).

By default, this exports the company metadata and agents. To include more:

```sh
# Export everything: company, agents, projects, skills, and tasks
paperclipai company export <company-id> --out ./full-export \
  --include company,agents,projects,tasks,skills
```

### Export options

| Option | What it does |
|---|---|
| `--out <path>` | Where to save the export (required) |
| `--include <values>` | What to include: `company`, `agents`, `projects`, `issues`, `tasks`, `skills` — comma-separated |
| `--skills <values>` | Export only specific skills by name |
| `--projects <values>` | Export only specific projects |
| `--issues <values>` | Export only specific tasks |
| `--project-issues <values>` | Export every task inside the named projects |
| `--expand-referenced-skills` | Copy skill contents into the package instead of pointing at the upstream source |
| `--force` | Overwrite a folder that already has files in it, without asking |

> **Tip:** Run the export regularly as a backup — especially before making significant changes to your agent configuration or org structure. `--force` is the flag you want for an automated nightly export that keeps writing to the same folder.

---

## Importing a company

An import can come from three kinds of source: a local path, a URL, or GitHub.

```sh
# From a local folder
paperclipai company import ./my-export

# From a local .zip package
paperclipai company import ./my-export.zip

# From a GitHub repository URL
paperclipai company import https://github.com/org/repo

# From a GitHub subfolder, using owner/repo shorthand
paperclipai company import org/repo/companies/acme
```

For GitHub sources you can pin an exact version with `--ref`, which takes a branch, a tag, or a commit:

```sh
paperclipai company import https://github.com/org/repo --ref v1.2.0
```

`--ref` only applies to GitHub sources — pass it with a local path and the command stops and tells you so. URLs must point at GitHub or GitHub Enterprise; a plain HTTP link to some other host is rejected rather than fetched.

> **Note:** When you import a local package from the UI, choose a `.zip` that Paperclip exported. An archive you re-zipped yourself in Finder or Explorer may not import correctly. The CLI is happy with either a `.zip` or an unpacked folder.

### Creating a new company from a package

When you import without specifying an existing company, Paperclip creates a fresh one:

```sh
paperclipai company import ./my-export --target new --new-company-name "My Restored Company"
```

### Merging into an existing company

If you want to add agents or projects from a package into a company you already have running:

```sh
paperclipai company import ./shared-agents \
  --target existing \
  --company-id <your-company-id> \
  --include agents
```

### Preview before applying

If you're using the CLI, always preview an import before applying it, especially when merging into an existing company:

```sh
paperclipai company import ./my-export --target new --dry-run
```

The preview shows you exactly what will be created, renamed, skipped, or replaced — without actually doing anything. Read it carefully before proceeding.

### Handling name conflicts

When importing into an existing company, agent or project names may conflict with existing ones. Paperclip offers three strategies:

| Strategy | What happens |
|---|---|
| `rename` (default) | Appends a suffix to avoid conflicts — e.g. `ceo` becomes `ceo-2` |
| `skip` | Leaves existing entities untouched; skips anything that would conflict |
| `replace` | Overwrites existing entities. Use with care. |

> **Warning:** The `replace` collision strategy overwrites your existing agent configurations. Make sure you have a backup export before using it.

### Importing a large company

A busy company with years of tasks and attachments makes a big package, and Paperclip handles that for you. The UI uploads the package as its compressed `.zip` rather than unpacking it in your browser first, and the server runs the import as a background job while the page watches its progress — so a slow network or a proxy dropping the connection doesn't lose the import.

Two guards protect you along the way. If any part of the upload goes missing in transit, the import refuses to run rather than importing a fragment, and asks you to retry. And every attachment in the package is checked against its content hash before a single record is written, so a corrupted or tampered-with package can't leave you with a half-imported company.

Large packages don't need a single, fragile upload. When an export is big enough, Paperclip slices the `.zip` into parts and uploads them one at a time, showing progress like `Uploading part X of Y — N MB of M MB uploaded.` as it goes. This happens automatically whether you import from the UI or with `paperclipai company import` — there's no flag to set. If the upload is interrupted — a refresh, a dropped connection, a failed part, even a server restart — just retry or refresh the same import. Paperclip picks up the same transfer and re-sends only the parts it's still missing, so you never start over. Once a transfer finishes, that exact package is done: importing it again short-circuits with `This exact package was already imported by a completed transfer. Re-export the package to import it again.` — so if a re-import seems to do nothing, that's why. Re-export the company to import a fresh copy.

By default the server accepts import packages up to **1 GB**. If your export is bigger, an operator can raise the cap by setting the `PAPERCLIP_IMPORT_ZIP_MAX_BYTES` environment variable (in bytes, up to 64 GiB) — see [Environment Variables](../../reference/deploy/environment-variables.md).

---

## Common use cases

**Backing up your company configuration**

Run a full export periodically and store it in a safe place — a cloud drive, a private Git repository. If something goes wrong, you can restore from the package. For the full backup-and-restore recipe, including a scheduled nightly export, see [Back up and restore a company](../../how-to/back-up-and-restore-a-company.md).

**Moving a company to another instance**

Export on the instance you're leaving, then import the package on the instance you're moving to — a laptop to a server, a self-hosted box to Paperclip Cloud, or the other way around. Because the package carries tasks, routines, and attachments as well as configuration, the company picks up roughly where it left off. This is the supported path now that host-to-host Cloud Sync has been retired.

**Starting a new company from a template**

Export a well-configured company as a template, then import it with a new name whenever you want to start a similar company. Your agent configurations, skills, and project structure carry over.

**Sharing an agent team**

If you've built a well-configured team of agents (say, a standard engineering team with CEO, CTO, and engineers), export just the agents and share the package. Others can import it into their own company.

```sh
# Share: export agents only
paperclipai company export <company-id> --out ./engineering-team --include agents

# Receive: import into a new company
paperclipai company import org/shared-templates/engineering-team \
  --target new \
  --new-company-name "My Engineering Team"
```

**Importing from GitHub**

Community-published company templates live in public GitHub repositories. Import directly:

```sh
paperclipai company import org/company-templates/research-team \
  --target new \
  --dry-run
```

Review the dry-run output, then run without `--dry-run` to apply.

---

## After importing

Imported agents always start with scheduled heartbeats disabled. This is intentional — it gives you a chance to review the imported configuration and set your own budget and heartbeat settings before any agents start spending.

The UI goes one step further. **Start imported agents and routines paused** is ticked by default on the import screen, and when the import finishes you get an **Activate imported agents and routines** list. Tick the ones you're ready to wake and activate them from there — nothing runs until you say so.

After an import:
1. Open each imported agent and verify the adapter configuration looks right
2. Set per-agent budgets appropriate for your usage
3. Add any API keys or environment variables that the package declared but didn't include values for
4. Enable heartbeats, and activate the agents and routines you paused, when you're ready for work to start

---

## You're set

Export and import give you durable, shareable backups of everything you've built. The final guide covers terminal setup — for developers who want deeper control over how Paperclip runs.

[Terminal Setup →](./terminal-setup.md)
