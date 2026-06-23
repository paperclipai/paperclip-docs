---
paperclip_version: v2026.609.0
---

# Project Commands

Projects group related work inside a company: they carry a status, an optional lead agent, links to one or more goals, and the execution defaults that issues inherit. Use these commands when you want to read or shape a company's projects from the terminal instead of the UI — including the JSON-valued `env` bindings and the execution-workspace policy that decide how an agent's work runs server-side.

All `project` subcommands accept the common client flags (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`). Company scope is provided per command with `-C, --company-id <id>` rather than inherited globally, so you pass it explicitly where it is needed.

---

## At A Glance

```sh
paperclipai project list --company-id <company-id>
paperclipai project get <project-id-or-shortname> [--company-id <company-id>]
paperclipai project create --company-id <company-id> --name "Launch Site" [--goal-ids <id1,id2>] [--lead-agent-id <agent-id>]
paperclipai project update <project-id-or-shortname> --status in_progress [--company-id <company-id>]
paperclipai project delete <project-id-or-shortname> --yes [--company-id <company-id>]
```

`get`, `update`, and `delete` take a project reference that can be either the project UUID or its shortname. When you pass a shortname, supply `--company-id` so the server can resolve it within the right company.

> **Tip:** Add `--json` to any subcommand when you are scripting. The human-readable output of `list` is a compact one-line-per-project summary; the JSON output is the full project record.

---

## List Projects

```sh
paperclipai project list --company-id <company-id>
paperclipai project list --company-id <company-id> --json
```

`list` is company-scoped and requires `--company-id`. The default output prints one line per project with the fields most useful for triage:

| Field | Meaning |
|---|---|
| `id` | The project UUID. |
| `name` | The project's display name. |
| `status` | The project's current status. |
| `urlKey` | The project's stable shortname/URL key. |
| `goalIds` | Comma-separated goal IDs the project is linked to. |
| `leadAgentId` | The agent leading the project, if set. |

When there are no projects, `list` prints an empty result. Use `--json` to get the complete records for scripting.

---

## Get A Project

```sh
paperclipai project get <project-id-or-shortname>
paperclipai project get launch-site --company-id <company-id>
paperclipai project get <project-id> --json
```

`get` returns one project by ID or shortname. The reference argument is required. Passing `--company-id` adds a `companyId` query parameter, which the server needs to resolve a shortname unambiguously — always include it when you pass a shortname rather than a UUID.

---

## Create A Project

```sh
paperclipai project create --company-id <company-id> --name "Launch Site"
```

`create` is company-scoped: both `--company-id` and `--name` are required. The remaining options are optional and map directly onto the project record.

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company to create the project in. Required. |
| `--name <name>` | Project name. Required. |
| `--description <text>` | Free-text description. |
| `--status <status>` | Initial project status. |
| `--goal-ids <csv>` | Comma-separated list of goal IDs to link. |
| `--goal-id <id>` | Deprecated single goal ID. Prefer `--goal-ids`. |
| `--lead-agent-id <id>` | Agent that leads the project. |
| `--target-date <date>` | Target/target-completion date. |
| `--color <value>` | Project color. |
| `--env-json <json>` | Project `env` binding as a JSON object. See [JSON fields](#json-fields-env-and-execution-workspace-policy). |
| `--execution-workspace-policy-json <json>` | Execution workspace policy as a JSON object. |

`--goal-ids` is the supported way to attach goals; `--goal-id` exists only for backward compatibility with the old single-goal model. The submitted payload is validated against the server's create-project schema before the request is sent, so an out-of-range value fails locally with a clear error rather than a server round-trip.

```sh
paperclipai project create \
  --company-id <company-id> \
  --name "Launch Site" \
  --description "Public marketing launch" \
  --status planned \
  --goal-ids <goal-id-1>,<goal-id-2> \
  --lead-agent-id <agent-id> \
  --color "#3b82f6"
```

---

## Update A Project

```sh
paperclipai project update <project-id-or-shortname> --status in_progress
paperclipai project update launch-site --company-id <company-id> --name "Launch v2"
```

`update` takes a project reference (UUID or shortname) and patches only the fields you pass — anything you omit is left untouched. As with `get`, include `--company-id` when you reference a project by shortname so it resolves to the right company.

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company ID for shortname lookup. |
| `--name <name>` | New project name. |
| `--description <text\|null>` | New description, or `null` to clear it. |
| `--status <status>` | New project status. |
| `--goal-ids <csv>` | Replace the linked goal IDs with this comma-separated list. |
| `--goal-id <id\|null>` | Deprecated single goal ID, or `null` to clear. |
| `--lead-agent-id <id\|null>` | New lead agent, or `null` to clear. |
| `--target-date <date\|null>` | New target date, or `null` to clear. |
| `--color <value\|null>` | New color, or `null` to clear. |
| `--env-json <json\|null>` | Replace the `env` binding, or `null` to clear it. |
| `--execution-workspace-policy-json <json\|null>` | Replace the execution workspace policy, or `null` to clear it. |
| `--archived-at <iso8601\|null>` | Archive timestamp, or `null` to unarchive. |

### Clearing vs. omitting a field

Nullable fields follow one rule: pass the literal string `null` to clear the value, omit the flag to leave it unchanged. This applies to `--description`, `--goal-id`, `--lead-agent-id`, `--target-date`, `--color`, `--env-json`, `--execution-workspace-policy-json`, and `--archived-at`.

```sh
# Clear the lead agent and unarchive in one call
paperclipai project update <project-id> --lead-agent-id null --archived-at null

# Archive a project
paperclipai project update <project-id> --archived-at 2026-06-01T00:00:00Z
```

> **Note:** `--goal-ids` replaces the entire set of linked goals on the project. Pass the full list you want, not a delta.

---

## Delete A Project

```sh
paperclipai project delete <project-id-or-shortname> --yes
paperclipai project delete launch-site --company-id <company-id> --yes
```

`delete` removes a project. It refuses to run without `--yes` — the command fails fast with "Deletion requires --yes." if the flag is missing. Pass `--company-id` when you reference the project by shortname.

> **Warning:** Deleting a project is immediate once `--yes` is supplied. Confirm the reference resolves to the right project with `project get` before you delete it, especially when using a shortname.

---

## JSON Fields: `env` And Execution Workspace Policy

Two project fields carry structured configuration that the CLI accepts as raw JSON: the `env` binding (`--env-json`) and the execution workspace policy (`--execution-workspace-policy-json`). On both `create` and `update`, the CLI parses the string you pass with `JSON.parse` and forwards the result to the API. Invalid JSON fails locally with `Invalid JSON: ...` before any request is made, and the literal string `null` clears the field on `update`.

These fields shape how an agent's work actually runs. Remember that the agent's real execution happens server-side in the Paperclip runtime and adapters — the CLI sets these defaults; the server enforces them.

### `--env-json`

The `env` binding declares environment values that issues in the project inherit at execution time. Secret-backed entries reference a named secret rather than embedding the value, which keeps plaintext out of the project record:

```sh
paperclipai project create \
  --company-id <company-id> \
  --name "Ops" \
  --env-json '{"OPENAI_API_KEY":{"kind":"secret","secretName":"openai-api-key"}}'
```

### `--execution-workspace-policy-json`

The execution workspace policy controls how execution workspaces are provisioned for the project's issues — for example whether the policy is enabled and which default mode new work uses:

```sh
paperclipai project update <project-id> \
  --execution-workspace-policy-json '{"enabled":true,"defaultMode":"shared_workspace"}'
```

To remove a policy you previously set, pass `null`:

```sh
paperclipai project update <project-id> --execution-workspace-policy-json null
```

> **Tip:** Build these JSON values in a file and pass them inline, or generate them with a tool that guarantees valid JSON. Because the CLI parses the string before sending it, a malformed object is rejected immediately rather than producing a confusing server error.

---

## See also

- [Goal Commands](./goal.md) — manage the goals that projects link to with `--goal-ids`.
- [Issue Commands](./issue.md) — the work objects that live inside projects and inherit their execution defaults.
- [Agent Commands](./agent.md) — the agents you assign as a project's lead.
- [Workspace Commands](./workspace.md) — inspect and operate the execution workspaces shaped by the execution workspace policy.
- [Common Options](./common-options.md) — the shared client flags every command accepts.
- [Output And Scripting](./output-and-scripting.md) — how `--json` output behaves and how to consume it.
