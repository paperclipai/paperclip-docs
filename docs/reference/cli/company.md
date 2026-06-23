---
paperclip_version: v2026.609.0
---

# Company Commands

Companies are the top-level container in Paperclip: every agent, project, goal, issue, and budget lives inside one. Use `paperclipai company` when you want to inspect companies, edit their settings and branding, move a whole company between instances as a portable package, pull feedback traces, or delete a company when the server policy allows it.

A board operator sees and manages every company on the instance. An agent persona is scoped to exactly one company, so company-scoped reads and the deletion guard rails resolve against that single company unless you pass an explicit ID.

> **Tip:** Add `--json` to any command when you are scripting. The human-readable output is summarized; the JSON output is the full server record.

---

## Common Options

Every command on this page accepts the standard client options: `--data-dir <path>`, `--api-base <url>`, `--api-key <token>`, `--context <path>`, `--profile <name>`, and `--json`. See [Common Options](./common-options.md) for how the API base and credentials are resolved.

Two commands — `feedback:list` and `feedback:export` — take the company as a required `-C, --company-id <id>` flag rather than a positional argument. The `import` command also accepts `-C, --company-id <id>` to name an existing target company. Everywhere else the company ID is a positional `<companyId>` argument.

---

## Read Commands

These are read-only and safe to run anywhere.

```sh
paperclipai company list
paperclipai company get <company-id>
paperclipai company current
paperclipai company stats
```

| Command | What it returns |
|---|---|
| `company list` | Every company you can see. Human output shows `id`, `name`, `status`, monthly budget and spend (in cents), and whether new agents require board approval. |
| `company get <companyId>` | The full record for one company. |
| `company current` | The full record for the company in scope, resolved from `-C, --company-id`, the context file, `PAPERCLIP_COMPANY_ID`, or the agent credential — no positional ID needed. |
| `company stats` | Instance-level company statistics from `/api/companies/stats`. |

`company list` with an agent credential returns only your scoped company; with a board credential it returns every company on the instance.

`company current` is the convenient way to read the company you are already scoped to: it resolves the current company ID the same way every other command does and returns the same full record as `company get <companyId>`. With an agent credential — which is bound to exactly one company — it always returns that company.

---

## Create and Update

`create`, `update`, and `branding:update` send raw JSON payloads through to the API. The CLI does not validate the shape — it forwards your `--payload-json` to the server, which applies the matching schema (`CreateCompany`, `UpdateCompany`, `UpdateCompanyBranding`). Build the object the API expects and pass it as a single JSON string.

```sh
paperclipai company create \
  --payload-json '{"name":"Acme","issuePrefix":"ACME"}'

paperclipai company update <company-id> \
  --payload-json '{"budgetMonthlyCents":500000}'

paperclipai company branding:update <company-id> \
  --payload-json '{"primaryColor":"#1f6feb","logoUrl":"https://cdn.example.com/acme.png"}'
```

| Command | Method / route | Notes |
|---|---|---|
| `company create` | `POST /api/companies` | `--payload-json` is required. |
| `company update <companyId>` | `PATCH /api/companies/{id}` | `--payload-json` is required; send only the fields you want to change. |
| `company branding:update <companyId>` | `PATCH /api/companies/{id}/branding` | `--payload-json` is required; carries branding fields only. |

> **Note:** Because the payload is forwarded verbatim, a malformed or unknown field surfaces as a server-side validation error, not a CLI error. Use `--json` and read the response when a write is rejected.

---

## Archive

```sh
paperclipai company archive <company-id>
```

`company archive` posts to `/api/companies/{id}/archive` and takes no payload. Archiving is the reversible way to take a company out of active rotation. Reach for [`company delete`](#delete-a-company) only when you genuinely need the records gone and the server is configured to permit it.

---

## Export and Import

Paperclip companies are portable. `company export` writes a company to a folder of markdown-backed files (plus a `.paperclip.yaml` manifest and any binary assets), and `company import` reads that package back — from a local path, a `.zip`, or a GitHub repository — into a new or existing company.

### Export a portable package

```sh
paperclipai company export <company-id> \
  --out ./exports/acme \
  --include company,agents,projects,issues,skills
```

| Flag | Use |
|---|---|
| `--out <path>` | Required. Output directory the package is written to. |
| `--include <values>` | Comma-separated set of `company`, `agents`, `projects`, `issues` (alias `tasks`), `skills`. Defaults to `company,agents`. |
| `--skills <values>` | Comma-separated skill slugs/keys to include. |
| `--projects <values>` | Comma-separated project shortnames/IDs to include. |
| `--issues <values>` | Comma-separated issue identifiers/IDs to include. |
| `--project-issues <values>` | Comma-separated project shortnames/IDs whose issues should be exported. |
| `--expand-referenced-skills` | Vendor skill contents into the package instead of exporting upstream references. Defaults to off. |

The default `--include` is deliberately small (`company,agents`) so a quick export does not drag along every task. Widen it explicitly when you want a full clone. If the output directory already contains files, the command asks you to confirm an overwrite in an interactive terminal, and refuses outright in a non-interactive one — choose an empty directory for headless runs.

On success the command prints the resolved output path, the package root, the number of files written, the `.paperclip.yaml` extension path, and a warning count.

### Import a package

```sh
paperclipai company import ./exports/acme \
  --target new \
  --new-company-name "Acme (imported)"

paperclipai company import https://github.com/acme/company-pack \
  --target existing --company-id <company-id> \
  --collision replace --yes
```

The source argument is a local directory, a local `.zip` file, a GitHub URL, or `owner/repo[/path]` shorthand. Generic HTTP URLs are rejected — only GitHub / GitHub Enterprise URLs and local paths are supported.

| Flag | Use |
|---|---|
| `--include <values>` | Comma-separated include set (`company,agents,projects,issues,tasks,skills`). When omitted, the default import set is all five groups. |
| `--target <mode>` | `new` to create a company, `existing` to import into one you already have. Inferred from `--company-id`/context when omitted. |
| `-C, --company-id <id>` | The existing target company. Required when `--target existing`. |
| `--new-company-name <name>` | Name override when `--target new`. |
| `--agents <list>` | Comma-separated agent slugs to import, or `all`. Defaults to `all`. |
| `--collision <mode>` | How to handle existing matches: `rename` (default), `skip`, or `replace`. |
| `--ref <value>` | Git ref (branch, tag, or commit) for GitHub sources. Only valid for GitHub imports. |
| `--paperclip-url <url>` | Alias for `--api-base` on this command. |
| `--yes` | Accept the default selection and skip the pre-import confirmation prompt. |
| `--dry-run` | Run the preview only; apply nothing. |

The import always runs a server-side preview first and shows you the plan — package contents, per-group create/update/skip counts, sample entities, and any warnings or errors — before anything is written. In an interactive terminal without `--include` or `--yes`, you also get a selection menu to pick exactly which projects, tasks, agents, and skills to bring in. With `--dry-run` the command stops after the preview.

> **Warning:** Applying an import is gated. With `--json` you must pass `--yes` (run `--dry-run` first to inspect the preview as JSON). From a non-interactive terminal you must also pass `--yes`. Without `--yes` in an interactive terminal, the CLI prompts for explicit confirmation before applying.

When an imported agent has a `process` adapter with no explicit adapter, the CLI currently falls back to the `claude-local` adapter and tells you so in the preview/result info block.

### Raw API passthrough variants

If you would rather drive the server's portability routes directly with a hand-built payload, four passthrough commands post your `--payload-json` to the raw routes. These do not read or write local files — they are the API endpoints behind `export`/`import` exposed for scripting.

```sh
paperclipai company export:preview <company-id> --payload-json '{...}'
paperclipai company export:api <company-id> --payload-json '{...}'
paperclipai company import:preview <company-id> --payload-json '{...}'
paperclipai company import:apply <company-id> --payload-json '{...}'
```

| Command | Route |
|---|---|
| `company export:preview <companyId>` | `POST /api/companies/{id}/exports/preview` |
| `company export:api <companyId>` | `POST /api/companies/{id}/exports` |
| `company import:preview <companyId>` | `POST /api/companies/{id}/imports/preview` |
| `company import:apply <companyId>` | `POST /api/companies/{id}/imports/apply` |

Prefer the high-level `export`/`import` commands for day-to-day work; they handle file I/O, source resolution, previews, and confirmation for you. Use the passthrough variants only when you need precise control over the request body.

---

## Feedback Traces

Feedback traces capture votes and reviews recorded against agent work. Use these two commands to read them or pull them out for analysis. Both require `-C, --company-id <id>`.

```sh
paperclipai company feedback:list --company-id <company-id> --status open --vote down
paperclipai company feedback:export --company-id <company-id> --from 2026-01-01 --format ndjson --out ./feedback.ndjson
```

| Flag | Use |
|---|---|
| `--target-type <type>` | Filter by target type. |
| `--vote <vote>` | Filter by vote value. |
| `--status <status>` | Filter by trace status. |
| `--project-id <id>` | Filter by project. |
| `--issue-id <id>` | Filter by issue. |
| `--from <iso8601>` | Only traces created at or after this timestamp. |
| `--to <iso8601>` | Only traces created at or before this timestamp. |
| `--shared-only` | Only traces eligible for sharing/export. |
| `--include-payload` | Include stored payload snapshots in the response. |

`feedback:list` prints a compact row per trace (`id`, issue, vote, status, target type, target label) or the full records with `--json`. `feedback:export` adds two flags:

| Flag | Use |
|---|---|
| `--out <path>` | Write the export to a file instead of stdout. |
| `--format <format>` | `json` or `ndjson`. Defaults to `ndjson`. |

`feedback:export` includes payload snapshots by default (unlike `feedback:list`, where you opt in with `--include-payload`). When you pass `--out`, the command writes the file and reports the count; otherwise it streams the serialized traces to stdout, which makes it easy to pipe into another tool.

---

## Delete a Company

`company delete` is destructive and intentionally hard to trigger by accident. It removes a company and its records permanently.

```sh
paperclipai company delete PAP --yes --confirm PAP
paperclipai company delete 5cbe79ee-acb3-4597-896e-7662742593cd \
  --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

The selector argument is either a company ID (UUID) or an issue prefix/shortname (for example `PAP`).

| Flag | Use |
|---|---|
| `--by <mode>` | How to interpret the selector: `auto` (default), `id`, or `prefix`. |
| `--yes` | Required safety flag. Deletion fails without it. |
| `--confirm <value>` | Required. Must equal the target company's ID or its issue prefix. |

### Guard rails

Deletion has to clear four separate checks, by design:

1. **Server policy.** The instance must have `PAPERCLIP_ENABLE_COMPANY_DELETION` enabled. If it is off, the API rejects the delete regardless of your flags.
2. **`--yes`.** Without it the command errors immediately — no API call is made.
3. **`--confirm <value>`.** The value must match the resolved company's ID or its issue prefix (prefix match is case-insensitive). A mismatch errors with the expected ID and prefix so you can correct it.
4. **Unambiguous resolution.** In `auto` mode, a selector that matches both a different company's ID and another's prefix is rejected as ambiguous — re-run with `--by id` or `--by prefix`.

Resolution order: the CLI tries an ID lookup when the selector looks like a UUID (or `--by id`), then your scoped company from context, then a board-wide company list. With an agent credential, the board-wide lookup is unavailable — deletion is company-scoped, so use the current company's ID or prefix (via `--company-id` or `PAPERCLIP_COMPANY_ID`), not another company's.

> **Warning:** There is no undo. If you only need to take a company out of rotation, use [`company archive`](#archive) instead.

On success the command prints `ok: true` with the deleted company's ID, name, and prefix.

---

## See also

- [Common Options](./common-options.md) — API base resolution, credentials, and the flags every command shares
- [Output and Scripting](./output-and-scripting.md) — using `--json` and piping CLI output
- [Project Commands](./project.md) — manage the projects inside a company
- [Agent Commands](./agent.md) — inspect agents and set up a local agent CLI session
- [Feedback Commands](./feedback.md) — work with feedback traces beyond the company-scoped views
- [Your First Company via CLI](../../guides/getting-started/your-first-company.md) — end-to-end walkthrough
