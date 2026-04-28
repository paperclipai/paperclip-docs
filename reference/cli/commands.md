# Command Reference

Every `paperclipai` subcommand, every flag, every environment variable the CLI reads. This page is for lookup, not learning — if you want a guided tour, start with [Setup Commands](./setup-commands.md) or [Control-Plane Commands](./control-plane-commands.md).

> **Last verified:** 2026-04-27 against `paperclipai` **2026.325.0**. Run `paperclipai --version` to check the version on your machine. Output produced from the source `--help` text in a clean install.

---

## Synopsis

```
paperclipai <command> [subcommand] [options]
```

The binary is published as the npm package [`paperclipai`](https://www.npmjs.com/package/paperclipai). It can be invoked as:

- `paperclipai …` after a global install (`npm i -g paperclipai`)
- `npx paperclipai …` for a one-off run
- `pnpm paperclipai …` from inside the Paperclip monorepo

All three forms are equivalent. Examples on this page use the bare `paperclipai` form.

---

## Common Options

The CLI splits commands into two layers, and the option set depends on the layer.

**Local-only commands** (`onboard`, `doctor`, `env`, `configure`, `db:backup`, `allowed-hostname`, `run`, `worktree …`, `auth bootstrap-ceo`) accept only the local instance flags:

| Flag | Type | Default | Description |
|---|---|---|---|
| `-c, --config <path>` | string | resolved from `PAPERCLIP_HOME`/`PAPERCLIP_INSTANCE_ID` | Path to the instance config file. |
| `-d, --data-dir <path>` | string | `$PAPERCLIP_HOME` or `~/.paperclip` | Paperclip data directory root. Isolates state from the default install. |
| `-h, --help` | flag | — | Print help for the current command and exit. |

**Client commands** (everything that talks to the control plane: `heartbeat run`, `context …`, `company …`, `issue …`, `agent …`, `approval …`, `activity …`, `dashboard …`, `plugin …`, `auth login`/`logout`/`whoami`) accept the local flags above plus:

| Flag | Type | Default | Description |
|---|---|---|---|
| `--context <path>` | string | `$PAPERCLIP_CONTEXT` or `~/.paperclip/context.json` | Path to the CLI context file. |
| `--profile <name>` | string | active profile in the context file | Named context profile to use for this call. |
| `--api-base <url>` | string | profile / inferred from local config / `$PAPERCLIP_API_URL` | Base URL of the Paperclip server. |
| `--api-key <token>` | string | profile env var / `$PAPERCLIP_API_KEY` | Bearer token for API requests. |
| `-C, --company-id <id>` | string | profile / `$PAPERCLIP_COMPANY_ID` | Company scope (required by company-scoped commands). |
| `--json` | flag | off | Emit machine-readable JSON instead of the formatted output. |

The top-level `paperclipai --version` and `paperclipai -V` flags print the package version and exit.

---

## Setup commands

These commands shape the local install. They read and write `~/.paperclip` (or the directory chosen with `-d/--data-dir`) and do not require the server to be running.

### `paperclipai onboard`

Interactive first-run setup wizard. Writes `config.json` for the local instance and optionally starts the server.

```
paperclipai onboard [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--yes` | `-y` | flag | `false` | Accept defaults (quickstart + start immediately). |
| `--run` | — | flag | `false` | Start Paperclip immediately after saving config. |
| `--help` | `-h` | flag | — | Print help and exit. |

```sh
paperclipai onboard
paperclipai onboard --yes
paperclipai onboard --run --data-dir ./tmp/paperclip-dev
```

### `paperclipai doctor`

Run diagnostic checks on the local install. Aliased as `paperclipai --fix`.

```
paperclipai doctor [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--repair` | — | flag | `false` | Attempt to repair issues automatically. |
| `--yes` | `-y` | flag | `false` | Skip repair confirmation prompts. |

```sh
paperclipai doctor
paperclipai doctor --repair --yes
```

### `paperclipai env`

Print the resolved environment configuration for the current instance — useful for inspecting what the server actually sees after config + defaults + env overrides are merged.

```
paperclipai env [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai env
```

### `paperclipai configure`

Update one configuration section in place. Each `--section` value enters an interactive editor for that part of `config.json`.

```
paperclipai configure --section <section> [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--section <section>` | `-s` | enum | — | One of `llm`, `database`, `logging`, `server`, `storage`, `secrets`. |
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai configure --section storage
paperclipai configure --section secrets
```

### `paperclipai db:backup`

Create a one-off database backup using current config.

```
paperclipai db:backup [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--dir <path>` | — | string | from config / `$PAPERCLIP_DB_BACKUP_DIR` | Backup output directory (overrides config). |
| `--retention-days <days>` | — | number | from config | Retention window used for pruning. |
| `--filename-prefix <prefix>` | — | string | `paperclip` | Backup filename prefix. |
| `--json` | — | flag | off | Print backup metadata as JSON. |
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai db:backup --dir ./backups --retention-days 7
paperclipai db:backup --json
```

### `paperclipai allowed-hostname <host>`

Allow a hostname for authenticated/private mode access. Updates the local config; the new hostname takes effect after a server restart.

```
paperclipai allowed-hostname [options] <host>
```

| Argument | Description |
|---|---|
| `host` | Hostname to allow (for example `dotta-macbook-pro`). |

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai allowed-hostname my-tailscale-host
```

### `paperclipai run`

Bootstrap local setup (onboard if missing, doctor with optional repair) and start the server.

```
paperclipai run [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--instance <id>` | `-i` | string | `default` | Local instance id. |
| `--repair` | — | flag | `true` | Attempt automatic repairs during doctor. |
| `--no-repair` | — | flag | — | Disable automatic repairs during doctor. |

```sh
paperclipai run
paperclipai run --instance dev --no-repair
```

---

## `heartbeat`

Manually invoke an agent.

### `paperclipai heartbeat run`

Run one agent heartbeat and stream live logs. Useful for debugging adapter issues or for forcing an agent to wake up on demand.

```
paperclipai heartbeat run [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--agent-id <agentId>` | `-a` | string | — | Agent ID to invoke. |
| `--source <source>` | — | enum | `on_demand` | Invocation source: `timer`, `assignment`, `on_demand`, `automation`. |
| `--trigger <trigger>` | — | enum | `manual` | Trigger detail: `manual`, `ping`, `callback`, `system`. |
| `--timeout-ms <ms>` | — | number | `0` (no timeout) | Max time to wait before giving up. |
| `--debug` | — | flag | off | Show raw adapter stdout/stderr JSON chunks. |
| Common client flags | — | — | — | `-c`, `-d`, `--context`, `--profile`, `--api-base`, `--api-key`, `--json`. |

```sh
paperclipai heartbeat run --agent-id <agent-id>
paperclipai heartbeat run --agent-id <agent-id> --debug --timeout-ms 60000
```

---

## `context`

Manage CLI client context profiles. Profiles persist API base URL, company ID, and the name of the env var that holds the API key.

### `paperclipai context show`

Show current context and the active profile.

```
paperclipai context show [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--context <path>` | — | string | — | Path to CLI context file. |
| `--profile <name>` | — | string | active profile | Profile to inspect. |
| `--json` | — | flag | off | Output raw JSON. |

### `paperclipai context list`

List available context profiles.

```
paperclipai context list [options]
```

Same flag set as `context show` (without `--profile`).

### `paperclipai context use <profile>`

Set the active context profile.

```
paperclipai context use [options] <profile>
```

| Argument | Description |
|---|---|
| `profile` | Profile name. |

### `paperclipai context set`

Set values on a profile. Use `--use` to also activate it.

```
paperclipai context set [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--profile <name>` | string | active profile | Profile name. |
| `--api-base <url>` | string | — | Default API base URL. |
| `--company-id <id>` | string | — | Default company ID. |
| `--api-key-env-var-name <name>` | string | — | Env var that contains the API key (recommended over inline keys). |
| `--use` | flag | off | Set this profile as active. |
| `--json` | flag | off | Output raw JSON. |
| `--data-dir <path>` | string | — | Paperclip data directory root. |
| `--context <path>` | string | — | Path to CLI context file. |

```sh
paperclipai context set --api-base http://localhost:3100 --company-id <company-id> --use
paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
```

---

## `company`

### `paperclipai company list`

List companies the caller can access.

```
paperclipai company list [options]
```

Common client flags only. Add `--json` to script against the result.

### `paperclipai company get <companyId>`

Get one company by ID.

```
paperclipai company get [options] <companyId>
```

| Argument | Description |
|---|---|
| `companyId` | Company ID. |

### `paperclipai company export <companyId>`

Export a company into a portable markdown package.

```
paperclipai company export [options] <companyId>
```

| Argument | Description |
|---|---|
| `companyId` | Company ID. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--out <path>` | string | — | Output directory. |
| `--include <values>` | csv | `company,agents` | Subset to include: any of `company`, `agents`, `projects`, `issues`, `tasks`, `skills`. |
| `--skills <values>` | csv | — | Skill slugs/keys to export. |
| `--projects <values>` | csv | — | Project shortnames/ids to export. |
| `--issues <values>` | csv | — | Issue identifiers/ids to export. |
| `--project-issues <values>` | csv | — | Project shortnames/ids whose issues should be exported. |
| `--expand-referenced-skills` | flag | `false` | Vendor skill contents instead of exporting upstream references. |

```sh
paperclipai company export <company-id> --out ./exports/acme --include company,agents,issues
```

### `paperclipai company import <fromPathOrUrl>`

Import a portable markdown company package from a local path, URL, or GitHub repo.

```
paperclipai company import [options] <fromPathOrUrl>
```

| Argument | Description |
|---|---|
| `fromPathOrUrl` | Source path or URL. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--include <values>` | csv | — | Subset to include (same enum as `export`). |
| `--target <mode>` | enum | — | `new` or `existing`. |
| `-C, --company-id <id>` | string | — | Existing target company ID (for `--target existing`). |
| `--new-company-name <name>` | string | — | Name override for `--target new`. |
| `--agents <list>` | csv | `all` | Agent slugs to import, or `all`. |
| `--collision <mode>` | enum | `rename` | Collision strategy: `rename`, `skip`, `replace`. |
| `--ref <value>` | string | — | Git ref for GitHub imports (branch, tag, or commit). |
| `--paperclip-url <url>` | string | — | Alias for `--api-base` on this command. |
| `--yes` | flag | `false` | Accept default selection and skip the pre-import confirmation prompt. |
| `--dry-run` | flag | `false` | Preview only; do not apply. |

```sh
paperclipai company import ./exports/acme --target new --new-company-name "Acme Imported"
paperclipai company import https://github.com/paperclipai/example-company --ref main --dry-run
```

### `paperclipai company delete <selector>`

Delete a company by ID or shortname/prefix. Destructive; guarded by required confirmation.

```
paperclipai company delete [options] <selector>
```

| Argument | Description |
|---|---|
| `selector` | Company ID or issue prefix (for example `PAP`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--by <mode>` | enum | `auto` | Selector mode: `auto`, `id`, or `prefix`. |
| `--yes` | flag | `false` | **Required** safety flag. |
| `--confirm <value>` | string | — | **Required** safety value: target company ID or shortname/prefix. |

```sh
paperclipai company delete PAP --by prefix --yes --confirm PAP
```

---

## `issue`

### `paperclipai issue list`

List issues for a company.

```
paperclipai issue list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--status <csv>` | csv | — | Comma-separated statuses (`backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`). |
| `--assignee-agent-id <id>` | string | — | Filter by assignee agent ID. |
| `--project-id <id>` | string | — | Filter by project ID. |
| `--match <text>` | string | — | Local text match on identifier/title/description. |

### `paperclipai issue get <idOrIdentifier>`

Get an issue by UUID or identifier (e.g. `PAP-12`).

```
paperclipai issue get [options] <idOrIdentifier>
```

### `paperclipai issue create`

Create an issue.

```
paperclipai issue create [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--title <title>` | string | — | Issue title. |
| `--description <text>` | string | — | Issue description. |
| `--status <status>` | enum | — | Initial status. |
| `--priority <priority>` | enum | — | `critical`, `high`, `medium`, `low`. |
| `--assignee-agent-id <id>` | string | — | Assignee agent ID. |
| `--project-id <id>` | string | — | Project ID. |
| `--goal-id <id>` | string | — | Goal ID. |
| `--parent-id <id>` | string | — | Parent issue ID. |
| `--request-depth <n>` | number | — | Request depth integer. |
| `--billing-code <code>` | string | — | Billing code. |

```sh
paperclipai issue create -C <company-id> --title "Fix dashboard latency" --priority high --assignee-agent-id <agent-id>
```

### `paperclipai issue update <issueId>`

Update an issue and optionally add a comment in the same call.

```
paperclipai issue update [options] <issueId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--title <title>` | string | — | Issue title. |
| `--description <text>` | string | — | Issue description. |
| `--status <status>` | enum | — | New status. |
| `--priority <priority>` | enum | — | New priority. |
| `--assignee-agent-id <id>` | string | — | Reassign agent. |
| `--project-id <id>` | string | — | Move to project. |
| `--goal-id <id>` | string | — | Move to goal. |
| `--parent-id <id>` | string | — | Re-parent. |
| `--request-depth <n>` | number | — | Request depth integer. |
| `--billing-code <code>` | string | — | Billing code. |
| `--comment <text>` | string | — | Optional comment to add with update. |
| `--hidden-at <iso8601\|null>` | string | — | Set `hiddenAt` timestamp or literal `null`. |

```sh
paperclipai issue update <issue-id> --status in_progress --comment "Started triage"
paperclipai issue update <issue-id> --status blocked --comment "Waiting on infra access"
```

### `paperclipai issue comment <issueId>`

Add a comment to an issue. Use `--reopen` to revive a closed issue with the same call.

```
paperclipai issue comment [options] <issueId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--body <text>` | string | — | Comment body. |
| `--reopen` | flag | off | Reopen if issue is `done`/`cancelled`. |

### `paperclipai issue checkout <issueId>`

Take ownership of an issue for an agent.

```
paperclipai issue checkout [options] <issueId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--agent-id <id>` | string | — | Agent ID claiming the issue. |
| `--expected-statuses <csv>` | csv | `todo,backlog,blocked` | Statuses the issue is allowed to be in. |

### `paperclipai issue release <issueId>`

Release the issue back to `todo` and clear the assignee.

```
paperclipai issue release [options] <issueId>
```

---

## `agent`

### `paperclipai agent list`

List agents for a company.

```
paperclipai agent list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |

### `paperclipai agent get <agentId>`

Get one agent by ID.

```
paperclipai agent get [options] <agentId>
```

### `paperclipai agent local-cli <agentRef>`

Create an agent API key, install local Paperclip skills for Codex/Claude, and print the shell exports needed to run the local CLI as that agent.

```
paperclipai agent local-cli [options] <agentRef>
```

| Argument | Description |
|---|---|
| `agentRef` | Agent ID or shortname/url-key. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--key-name <name>` | string | `local-cli` | API key label. |
| `--no-install-skills` | flag | off | Skip installing skills into `~/.codex/skills` and `~/.claude/skills`. |

The command prints a block of `export PAPERCLIP_API_URL=… PAPERCLIP_COMPANY_ID=… PAPERCLIP_AGENT_ID=… PAPERCLIP_API_KEY=…` lines. Pipe to `eval` or copy into your shell.

```sh
paperclipai agent local-cli claudecoder -C <company-id>
eval "$(paperclipai agent local-cli claudecoder -C <company-id>)"
```

---

## `approval`

### `paperclipai approval list`

```
paperclipai approval list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--status <status>` | enum | — | Status filter (e.g. `pending`, `approved`, `rejected`, `revision_requested`). |

### `paperclipai approval get <approvalId>`

```
paperclipai approval get [options] <approvalId>
```

### `paperclipai approval create`

```
paperclipai approval create [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--type <type>` | enum | — | Approval type, e.g. `hire_agent`, `approve_ceo_strategy`. |
| `--payload <json>` | json string | — | Approval payload as a JSON object. |
| `--requested-by-agent-id <id>` | string | — | Requesting agent ID. |
| `--issue-ids <csv>` | csv | — | Linked issue IDs. |

### `paperclipai approval approve <approvalId>`

```
paperclipai approval approve [options] <approvalId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--decision-note <text>` | string | — | Decision note. |
| `--decided-by-user-id <id>` | string | — | Decision actor user ID. |

### `paperclipai approval reject <approvalId>`

```
paperclipai approval reject [options] <approvalId>
```

Same flags as `approve`.

### `paperclipai approval request-revision <approvalId>`

```
paperclipai approval request-revision [options] <approvalId>
```

Same flags as `approve`.

### `paperclipai approval resubmit <approvalId>`

```
paperclipai approval resubmit [options] <approvalId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--payload <json>` | json string | — | Replacement payload. |

### `paperclipai approval comment <approvalId>`

```
paperclipai approval comment [options] <approvalId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--body <text>` | string | — | Comment body. |

---

## `activity`

### `paperclipai activity list`

List company activity log entries.

```
paperclipai activity list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--agent-id <id>` | string | — | Filter by agent ID. |
| `--entity-type <type>` | string | — | Filter by entity type (e.g. `issue`, `approval`). |
| `--entity-id <id>` | string | — | Filter by entity ID. |

---

## `dashboard`

### `paperclipai dashboard get`

Get the dashboard summary for a company.

```
paperclipai dashboard get [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |

---

## `worktree`

These commands provision and inspect repo-local Paperclip instances bound to a git worktree. Useful for running multiple isolated companies side by side without colliding on `~/.paperclip`.

### `paperclipai worktree init`

Create repo-local config/env and an isolated instance for the current worktree.

```
paperclipai worktree init [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--name <name>` | string | — | Display name used to derive the instance id. |
| `--instance <id>` | string | — | Explicit isolated instance id. |
| `--home <path>` | string | `$PAPERCLIP_WORKTREES_DIR` or `~/.paperclip-worktrees` | Home root for worktree instances. |
| `--from-config <path>` | string | — | Source `config.json` to seed from. |
| `--from-data-dir <path>` | string | — | Source `PAPERCLIP_HOME` for deriving the source config. |
| `--from-instance <id>` | string | `default` | Source instance id. |
| `--server-port <port>` | number | — | Preferred server port. |
| `--db-port <port>` | number | — | Preferred embedded Postgres port. |
| `--seed-mode <mode>` | enum | `minimal` | Seed profile: `minimal` or `full`. |
| `--no-seed` | flag | off | Skip database seeding from the source instance. |
| `--force` | flag | `false` | Replace existing repo-local config and isolated instance data. |

### `paperclipai worktree env`

Print shell exports for the current worktree-local instance.

```
paperclipai worktree env [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--json` | — | flag | off | Print JSON instead of shell exports. |

### `paperclipai worktree:make <name>`

Create `~/NAME` as a git worktree, then initialize an isolated Paperclip instance inside it.

```
paperclipai worktree:make [options] <name>
```

| Argument | Description |
|---|---|
| `name` | Worktree name — auto-prefixed with `paperclip-` if needed (created at `~/paperclip-NAME`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--start-point <ref>` | string | `$PAPERCLIP_WORKTREE_START_POINT` | Remote ref to base the new branch on. |
| `--instance <id>` | string | — | Explicit isolated instance id. |
| `--home <path>` | string | `$PAPERCLIP_WORKTREES_DIR` or `~/.paperclip-worktrees` | Home root for worktree instances. |
| `--from-config <path>` | string | — | Source `config.json` to seed from. |
| `--from-data-dir <path>` | string | — | Source `PAPERCLIP_HOME` for deriving the source config. |
| `--from-instance <id>` | string | `default` | Source instance id. |
| `--server-port <port>` | number | — | Preferred server port. |
| `--db-port <port>` | number | — | Preferred embedded Postgres port. |
| `--seed-mode <mode>` | enum | `minimal` | `minimal` or `full`. |
| `--no-seed` | flag | off | Skip database seeding. |
| `--force` | flag | `false` | Replace existing repo-local config and isolated instance data. |

### `paperclipai worktree:list`

List git worktrees visible from the current repo and whether they look like Paperclip worktrees.

```
paperclipai worktree:list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--json` | flag | off | Print JSON. |

### `paperclipai worktree:merge-history [source]`

Preview or import issue/comment history from another worktree into the current instance.

```
paperclipai worktree:merge-history [options] [source]
```

| Argument | Description |
|---|---|
| `source` | Optional source worktree path, directory name, or branch name (back-compat alias for `--from`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--from <worktree>` | string | — | Source worktree path, directory name, branch name, or `current`. |
| `--to <worktree>` | string | current | Target worktree path, directory name, branch name, or `current`. |
| `--company <id-or-prefix>` | string | — | Shared company id or issue prefix inside the chosen instances. |
| `--scope <items>` | csv | `issues,comments` | Scopes to import. |
| `--apply` | flag | `false` | Apply the import after previewing. |
| `--dry` | flag | `false` | Preview only. |
| `--yes` | flag | `false` | Skip the interactive confirmation prompt when applying. |

### `paperclipai worktree:cleanup <name>`

Safely remove a worktree, its branch, and its isolated instance data.

```
paperclipai worktree:cleanup [options] <name>
```

| Argument | Description |
|---|---|
| `name` | Worktree name — auto-prefixed with `paperclip-` if needed. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--instance <id>` | string | derived from name | Explicit instance id. |
| `--home <path>` | string | `$PAPERCLIP_WORKTREES_DIR` or `~/.paperclip-worktrees` | Home root for worktree instances. |
| `--force` | flag | `false` | Bypass safety checks (uncommitted changes, unique commits). |

---

## `plugin`

Lifecycle management for instance plugins.

### `paperclipai plugin list`

```
paperclipai plugin list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--status <status>` | enum | — | Filter by status: `ready`, `error`, `disabled`, `installed`, `upgrade_pending`. |

### `paperclipai plugin install <package>`

Install a plugin from a local path or npm package.

```
paperclipai plugin install [options] <package>
```

| Argument | Description |
|---|---|
| `package` | Local filesystem path or npm package spec. |

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--local` | `-l` | flag | `false` | Treat `<package>` as a local filesystem path. |
| `--version <version>` | — | string | latest | Specific npm version (npm packages only). |

```sh
paperclipai plugin install ./my-plugin --local
paperclipai plugin install @acme/plugin-linear
paperclipai plugin install @acme/plugin-linear --version 1.2.3
```

### `paperclipai plugin uninstall <pluginKey>`

```
paperclipai plugin uninstall [options] <pluginKey>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--force` | flag | `false` | Purge all plugin state and config (hard delete). |

### `paperclipai plugin enable <pluginKey>`

Enable a disabled or errored plugin.

```
paperclipai plugin enable [options] <pluginKey>
```

### `paperclipai plugin disable <pluginKey>`

Disable a running plugin without uninstalling it.

```
paperclipai plugin disable [options] <pluginKey>
```

### `paperclipai plugin inspect <pluginKey>`

Show full details for an installed plugin.

```
paperclipai plugin inspect [options] <pluginKey>
```

### `paperclipai plugin examples`

List bundled example plugins available for local install.

```
paperclipai plugin examples [options]
```

---

## `auth`

Authentication and bootstrap utilities for board-user access.

### `paperclipai auth bootstrap-ceo`

Create a one-time bootstrap invite URL for the first instance admin. Local-only; does not call the API.

```
paperclipai auth bootstrap-ceo [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--force` | — | flag | `false` | Create new invite even if admin already exists. |
| `--expires-hours <hours>` | — | number | server default | Invite expiration window. |
| `--base-url <url>` | — | string | from config | Public base URL used to print the invite link. |

### `paperclipai auth login`

Authenticate the CLI for board-user access. Stores credentials per API base.

```
paperclipai auth login [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--instance-admin` | flag | `false` | Request instance-admin approval instead of plain board access. |
| `-C, --company-id <id>` | string | profile / env | Company ID (overrides context default). |

### `paperclipai auth logout`

Remove the stored board-user credential for the current API base.

```
paperclipai auth logout [options]
```

### `paperclipai auth whoami`

Show the current board-user identity for the current API base.

```
paperclipai auth whoami [options]
```

---

## Environment Variables

The CLI reads these environment variables. Where both an env var and a flag exist, the flag wins.

### Local instance and config

| Variable | Read by | Meaning |
|---|---|---|
| `PAPERCLIP_HOME` | all local commands | Base directory for Paperclip data. Default `~/.paperclip`. |
| `PAPERCLIP_INSTANCE_ID` | all local commands | Instance id under `PAPERCLIP_HOME/instances/`. Default `default`. |
| `PAPERCLIP_CONFIG` | all local commands | Absolute path to a specific `config.json`. Overrides instance lookup. |
| `PAPERCLIP_CONTEXT` | client commands | Path to the CLI context file. Default `~/.paperclip/context.json`. |
| `PAPERCLIP_AUTH_STORE` | `auth` commands | Override for the local board-user credential store. |

### Client (server connection)

| Variable | Meaning |
|---|---|
| `PAPERCLIP_API_URL` | Default API base URL when neither `--api-base` nor a profile provides one. |
| `PAPERCLIP_API_KEY` | Bearer token used to authenticate API calls. |
| `PAPERCLIP_COMPANY_ID` | Default company id used when `--company-id` and the active profile are unset. |
| `PAPERCLIP_AGENT_ID` | Identity assumed by the local CLI when running as an agent (set by `agent local-cli`). |

### Worktree commands

| Variable | Meaning |
|---|---|
| `PAPERCLIP_WORKTREES_DIR` | Home root for worktree-local instances. Default `~/.paperclip-worktrees`. |
| `PAPERCLIP_WORKTREE_START_POINT` | Default `--start-point` for `worktree:make`. |
| `PAPERCLIP_WORKTREE_NAME` | Branding name written into the worktree env. |
| `PAPERCLIP_WORKTREE_COLOR` | Branding color written into the worktree env. |
| `PAPERCLIP_IN_WORKTREE` | Set automatically inside worktree-launched processes. |

### Server-side (consumed when the CLI starts the server)

These are mostly relevant to `paperclipai run` and `paperclipai env`. Full reference: [Environment Variables](../deploy/environment-variables.md).

| Variable | Meaning |
|---|---|
| `PAPERCLIP_PUBLIC_URL`, `PAPERCLIP_AUTH_PUBLIC_BASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_BASE_URL` | Public base URL for invites and auth. |
| `PAPERCLIP_AGENT_JWT_SECRET`, `PAPERCLIP_AGENT_JWT_TTL_SECONDS`, `PAPERCLIP_AGENT_JWT_ISSUER`, `PAPERCLIP_AGENT_JWT_AUDIENCE` | Agent JWT minting. |
| `PAPERCLIP_DEPLOYMENT_MODE`, `PAPERCLIP_DEPLOYMENT_EXPOSURE`, `PAPERCLIP_AUTH_BASE_URL_MODE`, `PAPERCLIP_ALLOWED_HOSTNAMES` | Deployment and auth mode. |
| `PAPERCLIP_STORAGE_PROVIDER`, `PAPERCLIP_STORAGE_LOCAL_DIR`, `PAPERCLIP_STORAGE_S3_BUCKET`, `PAPERCLIP_STORAGE_S3_REGION`, `PAPERCLIP_STORAGE_S3_ENDPOINT`, `PAPERCLIP_STORAGE_S3_PREFIX`, `PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE` | Storage backend. |
| `PAPERCLIP_SECRETS_PROVIDER`, `PAPERCLIP_SECRETS_STRICT_MODE`, `PAPERCLIP_SECRETS_MASTER_KEY`, `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | Secrets backend. |
| `PAPERCLIP_DB_BACKUP_ENABLED`, `PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES`, `PAPERCLIP_DB_BACKUP_RETENTION_DAYS`, `PAPERCLIP_DB_BACKUP_DIR` | Database backup. |
| `PAPERCLIP_SERVER_HOST`, `PAPERCLIP_SERVER_PORT` | Server bind. |

---

## Exit Codes

The CLI uses a binary success/failure model. Read `stderr` (or `--json` output) for the actual cause.

| Code | Meaning |
|---|---|
| `0` | Success, or the user cancelled an interactive prompt. |
| `1` | Any non-zero failure: validation error, API error (4xx/5xx), auth error, missing config, doctor blocking issue, etc. |

Pre-flight checks log structured doctor results before exiting `1`, and API errors print as `API error <status>: <message>` on `stderr` before exiting `1`.

---

## Examples

Five common flows, end-to-end. Each block is a complete sequence you can paste into a fresh shell after replacing the placeholder values.

### Bootstrap a local install

```sh
paperclipai onboard --yes
paperclipai run
```

### Set up a CLI context profile

```sh
paperclipai context set \
  --api-base http://localhost:3100 \
  --company-id <company-id> \
  --api-key-env-var-name PAPERCLIP_API_KEY \
  --use
export PAPERCLIP_API_KEY=<bearer-token>
paperclipai context show
```

### Run as a local agent (Claude or Codex)

```sh
eval "$(paperclipai agent local-cli claudecoder -C <company-id>)"
paperclipai issue list --status todo,in_progress
paperclipai heartbeat run --agent-id "$PAPERCLIP_AGENT_ID"
```

### Triage and update an issue

```sh
paperclipai issue list -C <company-id> --status todo --match dashboard
paperclipai issue get PAP-42
paperclipai issue update <issue-id> --status in_progress --comment "Started triage"
```

### Export and re-import a company

```sh
paperclipai company export <company-id> --out ./exports/acme --include company,agents,projects,issues
paperclipai company import ./exports/acme --target new --new-company-name "Acme Staging" --yes
```

---

## Related

- [CLI Overview](./overview.md) — orientation and common options.
- [Setup Commands](./setup-commands.md) — narrative walk-through of the install/repair flow.
- [Control-Plane Commands](./control-plane-commands.md) — narrative walk-through of company operations.
- [Environment Variables](../deploy/environment-variables.md) — full server-side env reference.
- [API Overview](../api/overview.md) — the HTTP surface most CLI commands wrap.
