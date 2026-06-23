---
paperclip_version: v2026.609.0
---

# Activity Commands

The activity log is the company's audit trail: a chronological record of who did what to which entity. Reach for these commands when you are monitoring a running company, reconstructing what an agent did, or wiring an external system into the same record the Paperclip UI shows. It is exactly the trail you see in the UI's activity feed, available from the terminal for scripting, export, or headless monitoring.

`activity list` and `activity issue` are read-only. `activity create` is the one mutating command here, and you will rarely need it — the server already writes activity entries automatically as a side effect of normal work (issue updates, document locks, recovery resolutions). Use `activity create` only when you have an external event that genuinely belongs in the company's trail.

All three subcommands accept the [common client options](./common-options.md) (`--api-base`, `--api-key`, `--context`, `--profile`, `--data-dir`, `--json`). `activity list` and `activity create` are company-scoped and require `--company-id`; `activity issue` resolves the company from the issue itself.

> **Tip:** Add `--json` whenever you are scripting against these commands or piping the output into another tool. Without it, `list` prints one compact inline record per line for fast human scanning.

---

## activity list

List the activity log entries for a company.

```sh
paperclipai activity list --company-id <company-id>
paperclipai activity list --company-id <company-id> --agent-id <agent-id>
paperclipai activity list --company-id <company-id> --entity-type issue --entity-id <issue-id>
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | **Required.** The company whose activity log you want. |
| `--agent-id <id>` | Filter to entries attributed to a single agent. |
| `--entity-type <type>` | Filter to one entity type, such as `issue`. |
| `--entity-id <id>` | Filter to one specific entity by id. |

The filters combine: pass `--entity-type issue --entity-id <issue-id>` to scope the log to a single issue, or add `--agent-id` on top to see only what one agent did to it.

Each entry in the default (non-JSON) output is a single inline record exposing the fields you most often pivot on:

| Field | Meaning |
|---|---|
| `id` | The activity entry's own id. |
| `action` | What happened, such as `issue.updated` or `issue.document_locked`. |
| `actorType` | Who acted — for example an agent, a user, or the system. |
| `actorId` | The id of the actor. |
| `entityType` | The kind of object the action touched. |
| `entityId` | The id of the object the action touched. |
| `createdAt` | When the entry was recorded. |

When there are no matching entries, the command prints an empty result rather than failing. Use `--json` to get the full entry objects, including any payload the server stored.

---

## activity create

Create an activity log entry on a company. The body is supplied as a raw JSON string that the server validates as a `CreateActivity` payload.

```sh
paperclipai activity create --company-id <company-id> \
  --payload-json '{"action":"deploy.completed","entityType":"project","entityId":"<project-id>"}'
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | **Required.** The company to record the entry against. |
| `--payload-json <json>` | **Required.** A JSON string describing the activity entry. |

The CLI parses `--payload-json` with `JSON.parse` before sending it, so it must be syntactically valid JSON — wrap it in single quotes in your shell so inner double quotes survive. The server is the authority on which fields a `CreateActivity` payload accepts; an invalid shape comes back as a request error, which the CLI surfaces directly.

> **Note:** You almost never need this command for normal operations. Paperclip writes activity entries on its own whenever issues, documents, and recovery actions change. Reserve `activity create` for stitching an external event — a deploy, an incident, a manual milestone — into the same audit trail.

---

## activity issue

List the activity for a single issue, identified by its id or human identifier (such as `PAP-39`).

```sh
paperclipai activity issue <issue-id>
paperclipai activity issue PAP-39 --json
```

This command takes the issue as a positional argument and resolves the rest of its context (including the company) from your selected profile and the issue itself, so it does **not** require `--company-id`. It is the fastest way to answer "what has happened to this one task?" without filtering the whole company log.

`activity issue <id>` and `activity list --company-id <id> --entity-type issue --entity-id <id>` overlap, but reach for `activity issue` when you already have an issue identifier in hand — it is shorter and it accepts the human `PAP-39` form directly.

---

## See also

- [Issue Commands](issue.md) — create, update, comment on, and check out the tasks whose history shows up here.
- [Dashboard Commands](dashboard.md) — the same top-level company state the UI surfaces, alongside the activity feed.
- [Common Options](./common-options.md) — the shared flags every client command accepts.
- [Output and Scripting](./output-and-scripting.md) — how `--json` output is shaped for piping into other tools.
