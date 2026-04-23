# Export & Import

Once you've built a company — given it a goal, hired agents, configured their adapters, and set up projects — that configuration has real value. Export and import let you capture that configuration as a portable package you can back up, share with others, or reuse as a starting point for a new company.

Exports are human-readable markdown files. Anyone with the package can understand the company's structure without reading a database dump.

---

## What a package contains

An exported company package looks like this:

```
my-company/
├── COMPANY.md          ← Company name, goal, and metadata
├── agents/
│   ├── ceo/AGENT.md    ← Agent identity, role, and instructions
│   └── cto/AGENT.md
├── projects/
│   └── main/PROJECT.md
├── skills/
│   └── review/SKILL.md
└── .paperclip.yaml     ← Adapter types, environment variable declarations, budgets
```

**What's included:** Company name, description, and goal. Agent names, roles, reporting structure, and instructions. Project definitions. Skills. Adapter type declarations and the names of environment variables that need values.

**What's never included:** Secret values — API keys, tokens, passwords. Machine-specific paths. Internal database IDs. These things are environment-specific and wouldn't be valid on another machine anyway.

---

## Exporting a company

You can export and import from the Paperclip UI now. The terminal commands still exist if you prefer them, but they're no longer the only path.

### In the UI

Open **Org** and use the **Export company** or **Import company** buttons in the header. You can also reach the same pages from **Company Settings**.

On export, Paperclip shows you the package contents before you download them. On import, it previews what will be created, renamed, or skipped before anything is applied.

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
| `--skills <slugs>` | Export only specific skills by name |
| `--projects <names>` | Export only specific projects |

> **Tip:** Run the export regularly as a backup — especially before making significant changes to your agent configuration or org structure.

---

## Importing a company

You can import from a local folder, a GitHub repository, or a shorthand GitHub reference.

```sh
# From a local folder
paperclipai company import ./my-export

# From a GitHub repository
paperclipai company import https://github.com/org/repo

# From a GitHub subfolder
paperclipai company import org/repo/companies/acme
```

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

---

## Common use cases

**Backing up your company configuration**

Run a full export periodically and store it in a safe place — a cloud drive, a private Git repository. If something goes wrong, you can restore from the package.

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

After an import:
1. Open each imported agent and verify the adapter configuration looks right
2. Set per-agent budgets appropriate for your usage
3. Add any API keys or environment variables that the package declared but didn't include values for
4. Enable heartbeats when you're ready for agents to start working

---

## You're set

Export and import give you durable, shareable backups of everything you've built. The final guide covers terminal setup — for developers who want to run Paperclip outside the Desktop App.

[Terminal Setup →](./terminal-setup.md)
