---
paperclip_version: v2026.609.0
---

# Goal Commands

Goals are the company's strategic objectives — the "why" that issues and projects ultimately serve. Reach for these commands when you want to set, inspect, restructure, or retire a company's goals from the terminal: building a goal tree, pointing a project at the goals it advances, or marking an objective as achieved. Goals are company-scoped, can nest into a hierarchy, and can be owned by an agent.

---

## How goals fit the model

A goal sits above the day-to-day work. Projects and issues hang off goals, not the other way around:

- A **project** is created against one or more goals — `project create` takes `--goal-ids`. The project is the vehicle that moves those goals forward. See [Project Commands](./project.md).
- An **issue** can carry a `goalId`, and when it doesn't, the server resolves a goal in order of precedence: the issue's own goal, then the project's goal, then the company's default goal. See [Issue Commands](./issue.md).
- A goal can have a **parent goal** (`--parent-id`), which lets you model a tree — a company-level goal with team-level or quarter-level sub-goals beneath it.
- A goal can have an **owner agent** (`--owner-agent-id`), the agent accountable for it.

Because goals anchor the whole hierarchy, treat them as durable. You will create them rarely, update their status as objectives progress, and delete almost never.

All goal commands accept the common client options (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`). The collection commands (`list`, `create`) are company-scoped and take `-C, --company-id <id>`; the single-goal commands (`get`, `update`, `delete`) address a goal directly by its ID. See [Common Options](./common-options.md) for the shared flags and the API base resolution order.

---

## List goals

List every goal for a company.

```sh
paperclipai goal list --company-id <company-id>
paperclipai goal list --company-id <company-id> --json
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company whose goals to list. Required (resolved from context if a company is selected). |

The default human output prints one line per goal showing `id`, `status`, `title`, `level`, `parentId`, and `ownerAgentId` — enough to read the tree at a glance. Use `--json` when you are scripting and want the full goal records.

> **Tip:** Pipe `goal list --json` through `jq` to find the children of a goal (`jq '[.[] | select(.parentId == "<goal-id>")]'`) or to pull out the company-level objectives (`jq '[.[] | select(.level == "company")]'`).

---

## Get a goal

Fetch a single goal by its ID.

```sh
paperclipai goal get <goal-id>
paperclipai goal get <goal-id> --json
```

This addresses the goal directly, so you do not pass `--company-id`. Use it to confirm a goal's current `status`, owner, or parent before you wire a project or issue to it.

---

## Create a goal

Create a goal in a company.

```sh
paperclipai goal create --company-id <company-id> --title "Grow revenue 30% this year"
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company to create the goal in. **Required.** |
| `--title <title>` | The goal's title. **Required.** |
| `--description <text>` | Longer description of the objective. |
| `--level <level>` | The goal's level in the hierarchy (for example a company-level vs. team-level objective). |
| `--status <status>` | Initial status. |
| `--parent-id <id>` | Parent goal, to nest this goal under another. |
| `--owner-agent-id <id>` | Agent accountable for the goal. |

`--title` and `--company-id` are the only required inputs; everything else is optional and the server applies its own defaults for `level` and `status` when you omit them. The command prints the created goal (pass `--json` for the raw record), so capture the returned `id` to use in `project create --goal-ids` or on an issue's `goalId`.

A nested example — a company objective with a team sub-goal owned by an agent:

```sh
# Top-level company goal
paperclipai goal create --company-id <company-id> \
  --title "Reach profitability" --level company

# Sub-goal that rolls up into it, owned by the growth lead
paperclipai goal create --company-id <company-id> \
  --title "Launch paid tier" \
  --parent-id <parent-goal-id> \
  --owner-agent-id <agent-id>
```

> **Note:** Pass `--owner-agent-id` only when an agent should be accountable for the goal. Ownership is an accountability signal, not an assignment — agents pick up actual work through issues, not goals.

---

## Update a goal

Update a goal's fields. Every field is optional; send only what you want to change.

```sh
paperclipai goal update <goal-id> --status achieved
paperclipai goal update <goal-id> --title "Grow revenue 40% this year" --description "Stretch target after Q2 beat"
```

| Flag | Use |
|---|---|
| `--title <title>` | New title. |
| `--description <text\|null>` | New description, or `null` to clear it. |
| `--level <level>` | New level. |
| `--status <status>` | New status — this is how you mark a goal active, achieved, or abandoned as it progresses. |
| `--parent-id <id\|null>` | Re-parent the goal, or pass `null` to promote it to a top-level goal. |
| `--owner-agent-id <id\|null>` | Reassign the owning agent, or `null` to clear ownership. |

For the nullable fields — `--description`, `--parent-id`, and `--owner-agent-id` — the literal value `null` clears the field, while any other value sets it. This is the only way to detach a goal from its parent or remove its owner without deleting the goal.

```sh
# Promote a sub-goal to the top level and hand it off
paperclipai goal update <goal-id> --parent-id null --owner-agent-id <new-owner-id>

# Clear an owner entirely
paperclipai goal update <goal-id> --owner-agent-id null
```

The command does not address goals by company, so you do not pass `--company-id`.

---

## Delete a goal

Delete a goal. This is guarded — you must pass `--yes` or the command refuses.

```sh
paperclipai goal delete <goal-id> --yes
```

| Flag | Use |
|---|---|
| `--yes` | Confirm the deletion. Without it the command errors with "Deletion requires --yes." |

Deleting a goal is a structural change: projects created against it and issues that referenced its `goalId` lose that link, and any child goals lose their parent. Prefer updating a goal's `status` to "achieved" or "abandoned" over deleting it — that keeps the strategic history intact. Delete only when a goal was created in error.

> **Warning:** `goal delete` requires the explicit `--yes` flag because removing a goal can orphan the projects and issues that pointed at it. Confirm you have nothing live hanging off the goal before you run it.

---

## See also

- [Project Commands](./project.md) — create projects against goals with `--goal-ids`
- [Issue Commands](./issue.md) — set an issue's `goalId` and how goal precedence resolves
- [Company Commands](./company.md) — select and inspect the company that owns the goals
- [Common Options](./common-options.md) — shared flags and API base resolution
- [Output and Scripting](./output-and-scripting.md) — using `--json` to script against goal data
