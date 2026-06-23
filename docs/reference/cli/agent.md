---
paperclip_version: v2026.609.0
---

# Agent Commands

The `agent` command group is how you create, inspect, configure, and steer the AI workers that do a company's work. Reach for these commands when you need to hire an agent, hand it a budget and permissions, tune its instructions and skills, wake it to run, or pause and terminate it. They are also the most direct way to wire up a local Claude or Codex session that acts *as* one of your agents — see [`agent local-cli`](#agent-local-cli) for that.

Remember the execution model: an agent's actual reasoning, coding, and research runs **server-side** in the Paperclip runtime and its adapters. These commands trigger and observe that work over the API; the CLI never runs the model itself. The single exception is `agent local-cli`, which sets up your shell so a human or AI can run Claude/Codex locally as that agent and report results back through the API.

All commands accept the common client flags: `--data-dir <path>`, `--api-base <url>`, `--api-key <token>`, `--context <path>`, `--profile <name>`, and `--json`. Company-scoped commands also take `-C, --company-id <id>`. See [Common Options](./common-options.md) for how those resolve.

---

## Identity and inbox

These commands read from the perspective of the *current* credential — the agent your API key or profile is scoped to.

```sh
paperclipai agent me
paperclipai agent inbox
paperclipai agent inbox-mine --user-id <board-user-id> --status todo,in_progress
```

| Command | Use |
|---|---|
| `agent me` | Show the current agent identity (`GET /api/agents/me`). The fastest way to confirm which agent a key or profile resolves to. |
| `agent inbox` | List the current agent's assigned inbox items — a compact view of issues awaiting it. |
| `agent inbox-mine --user-id <id>` | List the current agent's inbox items touched or archived by a specific board user. `--status <csv>` narrows by issue status (for example `todo,in_progress`). |

> **Note:** `agent me` and `agent inbox` operate on whoever the credential *is*. With an agent API key they describe that agent. With a board credential they describe the board's own identity, which is not what you usually want — pass an explicit agent context first.

---

## Listing and reading agents

```sh
paperclipai agent list --company-id <company-id>
paperclipai agent get <agent-id>
```

`agent list` requires `-C, --company-id <id>` and returns every agent in the company with its role, status, who it reports to, and its monthly budget versus monthly spend (in cents). `agent get <agentId>` returns one full agent record. Use `--json` on either when you are scripting.

---

## Creating and hiring agents

There are two ways to bring an agent into existence, and they are not the same.

```sh
paperclipai agent create --company-id <company-id> \
  --payload-json '{"name":"Builder","adapterType":"codex_local"}'

paperclipai agent hire --company-id <company-id> \
  --payload-json '{"name":"CTO","role":"cto","reason":"Lead engineering"}'
```

| Command | Use |
|---|---|
| `agent create` | Create an agent directly from a `CreateAgent` JSON payload (`POST /api/companies/{id}/agents`). Use this when you have board authority and want the agent to exist immediately. |
| `agent hire` | Create an agent *hire request* (`POST /api/companies/{id}/agent-hires`). Use this when hiring is governed and must pass through the board approval flow rather than landing as a live agent. |

Both require `-C, --company-id <id>` and `--payload-json <json>`. The JSON is validated before it is sent, so a malformed payload fails locally with a clear error instead of a server round-trip.

> **Tip:** Building the payload by hand is error-prone. The `paperclip-create-agent` skill inspects adapter options and drafts a valid config for you. The board can review and resolve a hire request with the [approval](./approval.md) commands.

---

## Updating and deleting agents

```sh
paperclipai agent update <agent-id> --payload-json '{"title":"Senior Builder"}'
paperclipai agent delete <agent-id> --yes
```

`agent update` patches an agent from an `UpdateAgent` JSON payload. `agent delete` removes an agent and **refuses to run without `--yes`** — there is no other confirmation, so treat the flag as the safety catch it is.

---

## Lifecycle controls

These commands move an agent through its operational states. Each takes a single `<agentId>` argument and POSTs to the matching agent endpoint.

```sh
paperclipai agent pause <agent-id>
paperclipai agent resume <agent-id>
paperclipai agent approve <agent-id>
paperclipai agent terminate <agent-id>
```

| Command | Use |
|---|---|
| `agent pause` | Pause an agent so it stops being woken for new work. |
| `agent resume` | Resume a paused agent. |
| `agent approve` | Approve a pending agent — for example one created by a hire request awaiting board sign-off. |
| `agent terminate` | Terminate an agent. Use this to retire a worker rather than deleting its record. |

---

## Waking an agent

`agent wake` is how you request a heartbeat wakeup so the server runs the agent's adapter now instead of waiting for the scheduler. It accepts an agent ID *or* a shortname/url-key; when you pass a shortname, supply `-C, --company-id <id>` so the server can resolve it.

```sh
paperclipai agent wake <agent-id-or-shortname> \
  --company-id <company-id> \
  --reason "Pick up the new spec" \
  --payload '{"issueId":"<issue-id>"}'
```

| Flag | Use |
|---|---|
| `--source <source>` | Invocation source: `timer`, `assignment`, `on_demand`, or `automation`. Defaults to `on_demand`. |
| `--trigger <trigger>` | Trigger detail: `manual`, `ping`, `callback`, or `system`. Defaults to `manual`. |
| `--reason <text>` | Human-readable reason for the wakeup. |
| `--payload <json>` | A JSON **object** passed to the run. Anything that is not a JSON object is rejected. |
| `--idempotency-key <key>` | Dedupe key so a re-sent wakeup does not double-fire. |
| `--force-fresh-session` | Request a fresh adapter session instead of resuming the existing one. |

The command resolves the agent, then POSTs to `/api/agents/{id}/wakeup`. The server runs the adapter; the CLI prints the wakeup response. To stream and inspect the resulting run, use the [`run`](./run.md) subcommands.

> **Note:** `agent wake`, `agent heartbeat:invoke`, and the top-level `heartbeat run` all converge on the same server-side wakeup path. `agent wake` is the richest of the three because it exposes source, trigger, payload, idempotency, and fresh-session controls.

---

## Heartbeat and Claude login

```sh
paperclipai agent heartbeat:invoke <agent-id>
paperclipai agent claude-login <agent-id>
```

| Command | Use |
|---|---|
| `agent heartbeat:invoke` | Invoke an agent heartbeat directly (`POST /api/agents/{id}/heartbeat/invoke`). A plain, parameter-free wakeup — reach for `agent wake` when you need source, payload, or idempotency control. |
| `agent claude-login` | Trigger the Claude login flow for an agent that uses a Claude-backed adapter (`POST /api/agents/{id}/claude-login`). Use this when an agent's Claude credential needs to be (re)established server-side. |

---

## Permissions

```sh
paperclipai agent permissions:update <agent-id> \
  --payload-json '{"canCreateAgents":true,"canAssignTasks":true}'
```

`permissions:update` patches an agent's scoped permissions from an `UpdateAgentPermissions` JSON payload (`PATCH /api/agents/{id}/permissions`). This controls what governed actions the agent may take — for example creating other agents or assigning tasks — independent of its budget and instructions.

---

## Configuration and revisions

Agent configuration is versioned. You can read the current redacted config, browse its revision history, inspect a single revision, and roll back to one.

```sh
paperclipai agent configuration <agent-id>
paperclipai agent config-revisions <agent-id>
paperclipai agent config-revision:get <agent-id> <revision-id>
paperclipai agent config-revision:rollback <agent-id> <revision-id>
```

| Command | Use |
|---|---|
| `agent configuration` | Get the redacted agent configuration. Secrets are masked, so this is safe to print and share. |
| `agent config-revisions` | List the config revision history for an agent. |
| `agent config-revision:get` | Fetch one revision by `<revision-id>` to see exactly what changed. |
| `agent config-revision:rollback` | Roll the agent back to a prior revision (`POST .../config-revisions/{id}/rollback`). Use this to recover quickly from a bad config change. |

---

## Runtime state and task sessions

These commands look at the *live* execution side of an agent — its current runtime session and the task sessions it is running.

```sh
paperclipai agent runtime-state <agent-id>
paperclipai agent runtime-state:reset-session <agent-id> --task-key <key>
paperclipai agent task-sessions <agent-id>
```

| Command | Use |
|---|---|
| `agent runtime-state` | Get the agent's current runtime state. |
| `agent runtime-state:reset-session` | Reset the agent's runtime session. Pass `--task-key <key>` to reset one specific task session; omit it to reset the agent's session broadly. Use this when an agent is wedged on stale session state. |
| `agent task-sessions` | List the agent's task sessions. |

---

## Skills

An agent's *desired* skill set is a server-side, desired-state field. These commands read and replace it. They do **not** install anything onto your local machine — that is what `agent local-cli` does.

```sh
paperclipai agent skills <agent-id>
paperclipai agent skills:sync <agent-id> --desired-skills paperclip,github
```

| Command | Use |
|---|---|
| `agent skills` | List the agent's current skills. |
| `agent skills:sync` | Replace the agent's desired skills with the comma-separated `--desired-skills` list (`POST /api/agents/{id}/skills/sync`). Required Paperclip skills stay server-enforced regardless. |

> **Note:** Stocking a company's skill *library* and authoring skills is a separate concern — see the [skills](./skills.md) reference. `agent skills:sync` only chooses which library skills a given agent should use.

---

## Instructions

An agent's instructions can be a single path on disk (for adapters that read a file like `AGENTS.md`) or a managed bundle of files stored server-side. These commands cover both.

```sh
paperclipai agent instructions-path:update <agent-id> \
  --payload-json '{"path":"/tmp/AGENTS.md","adapterConfigKey":"instructionsFilePath"}'

paperclipai agent instructions-bundle <agent-id>
paperclipai agent instructions-bundle:update <agent-id> --payload-json '{"mode":"managed"}'

paperclipai agent instructions-file:get <agent-id> --path AGENTS.md
paperclipai agent instructions-file:put <agent-id> --path AGENTS.md --content-file ./AGENTS.md
paperclipai agent instructions-file:delete <agent-id> --path AGENTS.md
```

| Command | Use |
|---|---|
| `agent instructions-path:update` | Point the agent at an instructions file path. Process adapters require `adapterConfigKey` in the payload, and relative paths require `adapterConfig.cwd`. |
| `agent instructions-bundle` | Get the agent's managed instructions bundle. |
| `agent instructions-bundle:update` | Update the bundle from an `UpdateAgentInstructionsBundle` JSON payload — for example switching `mode` to `managed`. |
| `agent instructions-file:get` | Read one bundle-relative file. `--path <path>` is required. |
| `agent instructions-file:put` | Create or update one bundle-relative file. Provide content inline with `--content <text>` or from disk with `--content-file <path>`; add `--clear-legacy-prompt-template` to drop an old prompt template in the same write. |
| `agent instructions-file:delete` | Delete one bundle-relative file by `--path`. |

> **Tip:** Prefer `--content-file` over `--content` for anything multi-line. It keeps shell quoting out of the way and lets you version the instructions file in your own repo.

---

## `agent local-cli`

This is the practical bridge for running Claude or Codex **locally** as a Paperclip agent. It accepts an agent ID or shortname/url-key, requires `-C, --company-id <id>`, and in one shot:

1. Mints a long-lived agent API key (label it with `--key-name <name>`; defaults to a timestamped `local-cli` key).
2. Installs the bundled Paperclip skills into `~/.codex/skills` and `~/.claude/skills` as symlinks (respecting `CODEX_HOME` / `CLAUDE_HOME` if set).
3. Prints the shell `export` lines for `PAPERCLIP_API_URL`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_AGENT_ID`, and `PAPERCLIP_API_KEY`.

```sh
paperclipai agent local-cli <agent-id-or-shortname> --company-id <company-id>
paperclipai agent local-cli codexcoder --company-id <company-id> --key-name workstation
paperclipai agent local-cli claudecoder --company-id <company-id> --no-install-skills
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Required. The company the agent belongs to (also used to resolve a shortname). |
| `--key-name <name>` | Label for the created API key. Defaults to `local-cli`; an empty value falls back to a timestamped name. |
| `--no-install-skills` | Skip installing skills into `~/.codex/skills` and `~/.claude/skills`. Use this when you only want the key and exports. |

Source the printed exports into your shell, then launch Codex or Claude — they now act as that agent against your Paperclip API:

```sh
eval "$(paperclipai agent local-cli codexcoder --company-id <company-id> --json | jq -r .exports)"
```

> **Warning:** The minted API key's plaintext token is shown **once**, in the command output. The exports embed it directly. Treat the output as a secret, and revoke the key with `token agent revoke` when the local session is done. See [Authentication](./authentication.md).

When skill installation runs, the command prints a per-tool summary (`linked` / `removed` / `skipped` / `failed` counts and the target directory). Broken symlinks are repaired and maintainer-only skills are removed, so re-running `local-cli` is safe and idempotent. Installation requires the bundled `skills` directory to be present in the checkout; if it cannot be found, the command fails rather than installing nothing silently.

---

## See also

- [Authentication](./authentication.md) — board tokens, agent keys, and how `connect` mints persona-aware profiles
- [Common Options](./common-options.md) — shared flags and API base resolution
- [Run](./run.md) — inspect and control the heartbeat runs that `agent wake` triggers
- [Prompt](./prompt.md) — hand work to an agent as a task-and-comment via `agent prompt`
- [Skills](./skills.md) — browse the catalog, stock the company library, and author skills
- [Approval](./approval.md) — resolve hire requests and other board-gated actions
- [Company](./company.md) — the company context every company-scoped agent command needs
