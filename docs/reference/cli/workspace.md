---
paperclip_version: v2026.609.0
---

# Workspace, Org & Environment Commands

Use these commands when you need to inspect the *structure* and *execution surface* of a company from the terminal: the org chart, the agent configurations behind each role, the execution workspaces where runs actually do their work, the environments and leases that back them, and the per-project workspaces. These are the lower-level inspection and control commands you reach for when you are debugging a run, wiring up an environment, or confirming what infrastructure a company is sitting on — not the day-to-day task flow.

All of these commands are read-and-control wrappers over the Paperclip API. They TRIGGER and OBSERVE server-side state; the actual execution (runtime services, runtime commands, environment probes) runs on the Paperclip runtime, not in the CLI.

> **Note:** Every command here accepts the common client flags — `--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, and `--json`. See [Common Options](./common-options.md). Company-scoped subcommands also accept `-C, --company-id <id>`; ID- and project-scoped subcommands take the id as a positional argument instead.

---

## Org Chart (`org`)

Use `org` to pull the company's org chart — either as structured data or as a rendered diagram you can drop into a doc or a status update.

```sh
paperclipai org get --company-id <company-id>
paperclipai org svg --company-id <company-id> --out org.svg
paperclipai org png --company-id <company-id> --out org.png
```

| Command | What it returns |
|---|---|
| `org get` | The org chart as structured JSON data. |
| `org svg` | The org chart rendered as an SVG image. |
| `org png` | The org chart rendered as a PNG image. |

`get` is company-scoped and respects `--json` like every other read command. `svg` and `png` fetch binary image data:

- With `--out <path>`, the bytes are written to that file and the command prints a small `{ out, bytes }` summary.
- Without `--out`, the raw image bytes stream to stdout — pipe them to a file yourself (`paperclipai org png -C <company-id> > org.png`) or into another tool.

> **Tip:** Reach for `org svg`/`org png` when you want a shareable snapshot of the reporting structure. Use `org get` when you are scripting and need the underlying data.

---

## Agent Configurations (`agent-config`)

`agent-config list` returns the agent configuration summaries for a company — the resolved adapter/model setup behind each agent, in one place. Use it to audit which configurations are in play before you change an environment or hire.

```sh
paperclipai agent-config list --company-id <company-id>
```

It is company-scoped and read-only. Pair it with `--json` when you want to diff configurations across companies or feed them into another tool.

---

## Execution Workspaces (`workspace`)

Execution workspaces are the server-side sandboxes where heartbeat runs do their work. Use the `workspace` commands to list them, inspect a single one, check whether it is safe to close, review its operation history, update its settings, or drive its runtime.

```sh
paperclipai workspace list --company-id <company-id>
paperclipai workspace get <execution-workspace-id>
paperclipai workspace close-readiness <execution-workspace-id>
paperclipai workspace operations <execution-workspace-id>
paperclipai workspace update <execution-workspace-id> --payload-json '{...}'
paperclipai workspace runtime-service <execution-workspace-id> start --payload-json '{...}'
paperclipai workspace runtime-command <execution-workspace-id> run --payload-json '{...}'
```

| Command | Arguments | Use |
|---|---|---|
| `list` | `--company-id <id>` | List all execution workspaces in a company. |
| `get` | `<id>` | Fetch a single execution workspace. |
| `close-readiness` | `<id>` | Check whether the workspace is safe to close (no in-flight work that would be lost). |
| `operations` | `<id>` | List the workspace's operation history. |
| `update` | `<id> --payload-json <json>` | Patch the workspace with a JSON body. |
| `runtime-service` | `<id> <action> [--payload-json <json>]` | Control a runtime service in the workspace. |
| `runtime-command` | `<id> <action> [--payload-json <json>]` | Run a runtime command in the workspace. |

For both `runtime-service` and `runtime-command`, the `<action>` positional is one of `start`, `stop`, `restart`, or `run`. The `--payload-json` flag carries the runtime target as a JSON body and defaults to `{}` when omitted.

```sh
paperclipai workspace runtime-service <execution-workspace-id> restart --payload-json '{"service":"dev-server"}'
paperclipai workspace runtime-command <execution-workspace-id> run --payload-json '{"command":"npm test"}'
```

> **Tip:** Run `workspace close-readiness <id>` before you tear down or close a workspace. It tells you whether closing it now would interrupt active work.

> **Warning:** `runtime-service stop`/`restart` act on live runtime processes a run may be depending on. Confirm with `workspace get` and `workspace operations` that nothing critical is mid-flight first.

---

## Environments (`environment`)

Environments describe *where and how* workspaces run — the backing infrastructure (SSH hosts, containers, capabilities) that runtime services and commands execute against. A lease is a claim on an environment by a workspace. Use these commands to inventory environments, probe their health, create or update them, and inspect the leases against them.

```sh
paperclipai environment list --company-id <company-id>
paperclipai environment capabilities --company-id <company-id>
paperclipai environment create --company-id <company-id> --payload-json '{...}'
paperclipai environment get <environment-id>
paperclipai environment leases <environment-id>
paperclipai environment lease <lease-id>
paperclipai environment update <environment-id> --payload-json '{...}'
paperclipai environment delete <environment-id>
paperclipai environment probe <environment-id>
paperclipai environment probe-config --company-id <company-id> --payload-json '{...}'
```

| Command | Arguments | Use |
|---|---|---|
| `list` | `--company-id <id>` | List a company's environments. |
| `capabilities` | `--company-id <id>` | Report the environment capabilities available to the company. |
| `create` | `--company-id <id> --payload-json <json>` | Create an environment from a JSON body. |
| `get` | `<environment-id>` | Fetch a single environment. |
| `leases` | `<environment-id>` | List the leases held against an environment. |
| `lease` | `<lease-id>` | Fetch a single environment lease by its own id. |
| `update` | `<environment-id> --payload-json <json>` | Patch an environment with a JSON body. |
| `delete` | `<environment-id>` | Delete an environment. |
| `probe` | `<environment-id>` | Probe an existing environment for reachability/health. |
| `probe-config` | `--company-id <id> --payload-json <json>` | Probe a candidate config *before* you create the environment. |

Note the two distinct lease commands: `environment leases <environment-id>` lists every lease *on* one environment, while `environment lease <lease-id>` resolves a *single* lease by its own identifier (it hits `/api/environment-leases/{leaseId}`). Use `leases` when you are looking at an environment and want to know who is using it; use `lease` when you already have a lease id from somewhere else.

```sh
# Validate a config before committing it, then create the environment.
paperclipai environment probe-config --company-id <company-id> --payload-json '{"kind":"ssh","host":"build-01.internal"}'
paperclipai environment create --company-id <company-id> --payload-json '{"name":"build-01","kind":"ssh","host":"build-01.internal"}'
paperclipai environment probe <environment-id>
```

> **Tip:** `probe-config` is the dry-run path — it checks a candidate configuration without persisting anything. `probe` validates an environment that already exists. Probe first, create second.

---

## Project Workspaces (`project-workspace`)

Project workspaces are the workspaces scoped to a single project. They are addressed by a project id (and, for the single-workspace operations, a workspace id) rather than a company id. Use these commands to list, create, update, delete, and drive the workspaces attached to one project.

```sh
paperclipai project-workspace list <project-id>
paperclipai project-workspace create <project-id> --payload-json '{...}'
paperclipai project-workspace update <project-id> <workspace-id> --payload-json '{...}'
paperclipai project-workspace delete <project-id> <workspace-id>
paperclipai project-workspace runtime-service <project-id> <workspace-id> restart --payload-json '{...}'
paperclipai project-workspace runtime-command <project-id> <workspace-id> run --payload-json '{...}'
```

| Command | Arguments | Use |
|---|---|---|
| `list` | `<project-id>` | List the workspaces for a project. |
| `create` | `<project-id> --payload-json <json>` | Create a project workspace. |
| `update` | `<project-id> <workspace-id> --payload-json <json>` | Update a project workspace. The workspace id is required. |
| `delete` | `<project-id> <workspace-id>` | Delete a project workspace. |
| `runtime-service` | `<project-id> <workspace-id> <action> [--payload-json <json>]` | Control a runtime service in a project workspace. |
| `runtime-command` | `<project-id> <workspace-id> <action> [--payload-json <json>]` | Run a runtime command in a project workspace. |

As with execution workspaces, the `<action>` for `runtime-service` and `runtime-command` is one of `start`, `stop`, `restart`, or `run`, and `--payload-json` defaults to `{}`.

```sh
paperclipai project-workspace list <project-id>
paperclipai project-workspace delete <project-id> <workspace-id>
paperclipai project-workspace runtime-command <project-id> <workspace-id> run --payload-json '{"command":"pnpm build"}'
```

> **Note:** `update` requires the workspace id positional — the command rejects the call if you omit it. `create` takes only the project id, since the workspace does not exist yet.

---

## See also

- [Common Options](./common-options.md) — the client flags every command above accepts.
- [Output and Scripting](./output-and-scripting.md) — using `--json` and piping results.
- [Project Commands](./project.md) — managing the projects that own project workspaces.
- [Dev Environments](./dev-environments.md) — the broader environment and SSH-fixture setup story.
- [Run Commands](./run.md) — inspecting the heartbeat runs that execute inside these workspaces.
- [Adapter Commands](./adapter.md) — the adapter/model configuration that `agent-config list` summarizes.
