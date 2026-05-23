# Environment Variables & Config

This is the canonical reference for every `PAPERCLIP_*` environment variable Paperclip reads or injects, every related env var (provider keys, auth, database), and every field of the `config.json` file.

Use it when you are wiring a deployment, debugging a startup issue, writing an adapter, or trying to understand what an agent process can see in its environment.

> **Secret values are flagged with a `Secret` column.** Treat anything marked `yes` as sensitive — never commit it to git, never log it, and prefer the secrets store ([Secrets](./secrets.md)) over flat env vars in production.

---

## 1. Where settings come from

Paperclip resolves configuration in this precedence order, highest first:

1. **Process environment** — env vars set in the shell or process manager.
2. **`.paperclip/.env`** — a dotenv file next to the active `config.json`. Loaded before the server reads its own config.
3. **`config.json`** — the structured JSON config file (see [§5](#5-config-file-paperclipinstancesidconfigjson)).
4. **Built-in defaults** — the Zod schema in `packages/shared/src/config-schema.ts`.

Locations:

- `PAPERCLIP_HOME` (default `~/.paperclip`) is the root of all Paperclip data.
- `PAPERCLIP_INSTANCE_ID` (default `default`) selects an instance under that root.
- `PAPERCLIP_CONFIG` overrides the config path explicitly. Otherwise the resolved path is `$PAPERCLIP_HOME/instances/$PAPERCLIP_INSTANCE_ID/config.json`.
- The `paperclipai doctor` and `paperclipai onboard` commands write to that same file.

> **Note:** There is no `paperclip.config.ts`. The config file is always JSON, validated by the Zod schema. CLI commands edit it; you can hand-edit it as long as it stays valid.

---

## 2. Heartbeat-injected env vars

These variables are injected by the Paperclip server when it launches an agent run. They are visible inside any spawned adapter process — Claude Code, Codex CLI, Gemini, OpenClaw, custom HTTP webhooks, anything wired through the [Process](../adapters/process.md) or [HTTP](../adapters/http.md) adapter.

If you are writing an agent runtime or skill, read these to understand the context the run is about.

### Always set

| Variable | Meaning |
|---|---|
| `PAPERCLIP_AGENT_ID` | UUID of the agent this run is for. |
| `PAPERCLIP_AGENT_NAME` | Human-readable agent name (e.g. `cto`). |
| `PAPERCLIP_COMPANY_ID` | Company UUID the agent belongs to. |
| `PAPERCLIP_API_URL` | Base URL of the Paperclip control plane. Built from `PAPERCLIP_LISTEN_HOST`/`PAPERCLIP_LISTEN_PORT` (default `http://127.0.0.1:3100`). |
| `PAPERCLIP_RUN_ID` | UUID of the current heartbeat run. **Pass back as `X-Paperclip-Run-Id` on every mutating API request** so audit log entries link to this run. |

### Authentication

| Variable | Always set? | Secret | Meaning |
|---|---|---|---|
| `PAPERCLIP_API_KEY` | local adapters | yes | Short-lived JWT minted from `PAPERCLIP_AGENT_JWT_SECRET` (default TTL 48 h). Use as `Authorization: Bearer $PAPERCLIP_API_KEY`. For non-local adapters (HTTP, OpenClaw), the operator sets a long-lived key in adapter config. |

### Wake context (set when the wake reason fits)

| Variable | When set | Meaning |
|---|---|---|
| `PAPERCLIP_TASK_ID` | issue-driven wakes | Issue UUID that triggered this run. Empty for purely scheduled wakes. |
| `PAPERCLIP_WAKE_REASON` | always (when known) | One of the reasons enumerated in [§2.1](#21-paperclip_wake_reason-values). |
| `PAPERCLIP_WAKE_COMMENT_ID` | comment wakes | UUID of the comment that triggered the wake (`issue_commented`, `issue_comment_mentioned`). |
| `PAPERCLIP_WAKE_PAYLOAD_JSON` | some adapters | Inline JSON payload: compact issue summary plus the ordered batch of new comment payloads. Lets the agent skip the initial `GET /api/issues/:id` round-trip. |
| `PAPERCLIP_APPROVAL_ID` | approval wakes | UUID of the approval that resolved. |
| `PAPERCLIP_APPROVAL_STATUS` | approval wakes | Approval decision (`approved`, `rejected`). |
| `PAPERCLIP_LINKED_ISSUE_IDS` | optional | Comma-separated list of issue IDs related to this wake. |

### 2.1 `PAPERCLIP_WAKE_REASON` values

| Value | When it fires |
|---|---|
| `issue_assigned` | A task was newly assigned to this agent. |
| `issue_commented` | A new comment was posted on an issue this agent owns. |
| `issue_comment_mentioned` | The agent was @-mentioned in a comment on an issue it does not own. |
| `issue_blockers_resolved` | All issues listed in this issue's `blockedBy` reached `done`. |
| `issue_children_completed` | All direct children of this issue reached a terminal state. |
| `approval_resolved` | An approval the agent requested was approved or rejected. |
| `scheduled` | A scheduled run from the heartbeat scheduler or a routine cron. |
| `assignment` | Generic assignment-triggered run with no more specific reason. |

---

## 3. Workspace-injected env vars

Set by the server when an [execution workspace](../../guides/projects-workflow/workspaces.md) is realized for the run. Useful when the adapter needs to operate on the resolved repo or worktree.

| Variable | Meaning |
|---|---|
| `PAPERCLIP_WORKSPACE_CWD` | Working directory the runtime should `cd` into. |
| `PAPERCLIP_WORKSPACE_PATH` | Alias of `PAPERCLIP_WORKSPACE_CWD`. |
| `PAPERCLIP_WORKSPACE_WORKTREE_PATH` | Full path to the git worktree for this run, when worktrees are in use. |
| `PAPERCLIP_WORKSPACE_BASE_CWD` | Base project workspace root (set when the worktree differs from the project default). |
| `PAPERCLIP_WORKSPACE_REPO_ROOT` | Git repository root inside the workspace. |
| `PAPERCLIP_WORKSPACE_BRANCH` | Git branch the worktree is on. |
| `PAPERCLIP_WORKSPACE_REPO_URL` | Clone URL of the repository (may be empty for local-only workspaces). |
| `PAPERCLIP_WORKSPACE_REPO_REF` | Git ref the workspace was checked out from. |
| `PAPERCLIP_WORKSPACE_SOURCE` | Workspace strategy (`project_primary`, `dedicated_worktree`, etc.). |
| `PAPERCLIP_WORKSPACE_CREATED` | `"true"` if the workspace was newly created by this run, `"false"` otherwise. |
| `PAPERCLIP_PROJECT_ID` | Project UUID the workspace is bound to. |
| `PAPERCLIP_PROJECT_WORKSPACE_ID` | Project-workspace binding UUID. |
| `PAPERCLIP_ISSUE_ID` | Issue UUID the workspace is currently realized for. |
| `PAPERCLIP_ISSUE_IDENTIFIER` | Human-readable issue id (e.g. `PAP-1820`). |
| `PAPERCLIP_ISSUE_TITLE` | Issue title. |

---

## 4. Server config env vars

Read by the Paperclip server (and the CLI when running `onboard`/`doctor`/`configure`). Most map directly to fields in the [config file](#5-config-file-paperclipinstancesidconfigjson) — env vars override file values when both are set.

### 4.1 Instance & paths

| Variable | Default | Secret | Meaning |
|---|---|---|---|
| `PAPERCLIP_HOME` | `~/.paperclip` | no | Root data directory for all instances. |
| `PAPERCLIP_INSTANCE_ID` | `default` | no | Instance identifier. Lets you run multiple isolated Paperclip instances on one host. |
| `PAPERCLIP_INSTANCE_ROOT` | `$PAPERCLIP_HOME/instances/$PAPERCLIP_INSTANCE_ID` | no | Resolved per-instance root. |
| `PAPERCLIP_CONFIG` | `$PAPERCLIP_INSTANCE_ROOT/config.json` | no | Override path to `config.json`. |
| `PAPERCLIP_CONTEXT` | `~/.paperclip/context.json` | no | CLI context file (last-used company, board session). |
| `PAPERCLIP_LOG_DIR` | `$PAPERCLIP_INSTANCE_ROOT/logs` | no | Server log directory. |
| `PAPERCLIP_OPEN_ON_LISTEN` | unset | no | When set, the CLI opens the dashboard in a browser once the server is up. |

### 4.2 Server binding & exposure

These pair with `server.*` in `config.json`. See [Deployment Modes](./deployment-modes.md) for what each mode means in practice.

| Variable | Default | Meaning |
|---|---|---|
| `HOST` | `127.0.0.1` | Bind address. |
| `PORT` | `3100` | Bind port. |
| `PAPERCLIP_LISTEN_HOST` | falls back to `HOST` | Host used when minting `PAPERCLIP_API_URL` for agents. |
| `PAPERCLIP_LISTEN_PORT` | falls back to `PORT` | Port used when minting `PAPERCLIP_API_URL` for agents. |
| `PAPERCLIP_BIND` | inferred from `HOST` | Bind mode: `localhost`, `tailscale`, `lan`, or `explicit`. |
| `PAPERCLIP_BIND_HOST` | unset | Custom bind hostname when `PAPERCLIP_BIND=explicit`. |
| `PAPERCLIP_TAILNET_BIND_HOST` | auto-detected via `tailscale ip` | Explicit Tailscale IP to bind to. |
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | One of `local_trusted`, `authenticated`. |
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `private` | One of `private`, `public`. Validated against `PAPERCLIP_DEPLOYMENT_MODE`. |
| `PAPERCLIP_ALLOWED_HOSTNAMES` | unset | Comma-separated allowlist of hostnames the server will accept. |
| `PAPERCLIP_ENABLE_COMPANY_DELETION` | `true` in `local_trusted`, else `false` | Whether the dashboard exposes company deletion. |
| `SERVE_UI` | `true` | Serve the bundled web UI from the API server. |
| `PAPERCLIP_UI_DEV_MIDDLEWARE` | `false` | Enable the Vite dev middleware for in-place UI development. |

### 4.3 Authentication

| Variable | Default | Secret | Meaning |
|---|---|---|---|
| `PAPERCLIP_PUBLIC_URL` | unset | no | Public URL used in invites, redirects, and as a fallback Better Auth origin. |
| `PAPERCLIP_AUTH_PUBLIC_BASE_URL` | unset | no | Explicit public base URL for the auth service. Required when `PAPERCLIP_AUTH_BASE_URL_MODE=explicit`. |
| `PAPERCLIP_AUTH_BASE_URL_MODE` | `auto` | no | One of `auto` or `explicit`. |
| `PAPERCLIP_AUTH_DISABLE_SIGN_UP` | `false` | no | When `true`, the server rejects new account sign-ups. |
| `BETTER_AUTH_URL` | unset | no | Alternate Better Auth base URL input. |
| `BETTER_AUTH_BASE_URL` | unset | no | Alternate Better Auth base URL input used by some deployments. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | derived from config | no | Comma-separated allowlist of trusted auth origins. |
| `BETTER_AUTH_SECRET` | falls back to `PAPERCLIP_AGENT_JWT_SECRET` | yes | Session-signing secret for Better Auth. |
| `PAPERCLIP_AGENT_JWT_SECRET` | unset (required for authenticated mode) | yes | HS256 signing secret used to mint local-agent JWTs. |
| `PAPERCLIP_AGENT_JWT_TTL_SECONDS` | `172800` (48 h) | no | Lifetime of a minted agent JWT. |
| `PAPERCLIP_AGENT_JWT_ISSUER` | `paperclip` | no | `iss` claim on minted JWTs. |
| `PAPERCLIP_AGENT_JWT_AUDIENCE` | `paperclip-api` | no | `aud` claim on minted JWTs. |

> **Tip:** When `paperclipai doctor` flags hostnames, redirects, or auth origins, inspect this group first.

### 4.4 Database

| Variable | Default | Secret | Meaning |
|---|---|---|---|
| `DATABASE_URL` | embedded PostgreSQL | yes | External Postgres connection string. Setting it switches off the embedded database. |
| `DATABASE_MIGRATION_URL` | falls back to `DATABASE_URL` | yes | Separate connection string used for running migrations (useful for managed services with a privileged migration role). |
| `PAPERCLIP_DB_BACKUP_ENABLED` | `true` | no | Toggle automatic database backups. |
| `PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES` | `60` | no | Interval between snapshots. |
| `PAPERCLIP_DB_BACKUP_RETENTION_DAYS` | `7` | no | How long to keep snapshots. |
| `PAPERCLIP_DB_BACKUP_DIR` | `$PAPERCLIP_INSTANCE_ROOT/data/backups` | no | Backup destination. |

### 4.5 Storage

| Variable | Default | Meaning |
|---|---|---|
| `PAPERCLIP_STORAGE_PROVIDER` | `local_disk` | Storage backend, `local_disk` or `s3`. |
| `PAPERCLIP_STORAGE_LOCAL_DIR` | `$PAPERCLIP_INSTANCE_ROOT/data/storage` | Base directory for local-disk storage. |
| `PAPERCLIP_STORAGE_S3_BUCKET` | `paperclip` | S3 bucket name. |
| `PAPERCLIP_STORAGE_S3_REGION` | `us-east-1` | S3 region. |
| `PAPERCLIP_STORAGE_S3_ENDPOINT` | unset | Custom S3-compatible endpoint (MinIO, R2, etc.). |
| `PAPERCLIP_STORAGE_S3_PREFIX` | `""` | Optional object key prefix. |
| `PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE` | `false` | Use path-style requests for providers that need them. |

### 4.6 Secrets

| Variable | Default | Secret | Meaning |
|---|---|---|---|
| `PAPERCLIP_SECRETS_PROVIDER` | `local_encrypted` | no | Backend used by the secret store. |
| `PAPERCLIP_SECRETS_MASTER_KEY` | unset | yes | 32-byte master key as base64, hex, or raw. Wins over the key file when both are set. |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | `$PAPERCLIP_INSTANCE_ROOT/secrets/master.key` | yes | Path to the master key file. |
| `PAPERCLIP_SECRETS_STRICT_MODE` | `false` | no | When `true`, sensitive env vars must be referenced through the secret store. |

See [Secrets](./secrets.md) for the full lifecycle.

### 4.7 Scheduler

| Variable | Default | Meaning |
|---|---|---|
| `HEARTBEAT_SCHEDULER_ENABLED` | `true` | Enable the timer that fires scheduled wakes and routines. |
| `HEARTBEAT_SCHEDULER_INTERVAL_MS` | `30000` | Poll interval. Minimum is enforced server-side. |

### 4.8 Telemetry & feedback export

| Variable | Default | Secret | Meaning |
|---|---|---|---|
| `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_URL` | unset | no | URL the server exports anonymized feedback events to. |
| `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_TOKEN` | unset | yes | Auth token for the export backend. |
| `PAPERCLIP_TELEMETRY_BACKEND_URL` | unset | no | Legacy alias for the export URL. |
| `PAPERCLIP_TELEMETRY_BACKEND_TOKEN` | unset | yes | Legacy alias for the export token. |

### 4.9 Worktrees & runtime

| Variable | Default | Meaning |
|---|---|---|
| `PAPERCLIP_WORKTREES_DIR` | `~/.paperclip-worktrees` | Base directory where Paperclip creates per-issue git worktrees. |
| `PAPERCLIP_WORKTREE_NAME` | unset | Name of the active worktree (set automatically inside a worktree shell). |
| `PAPERCLIP_IN_WORKTREE` | `false` | Set to `true` inside a launched worktree shell. |
| `PAPERCLIP_RUNTIME_API_URL` | derived | Explicit runtime API URL the server gives agents. |
| `PAPERCLIP_RUNTIME_API_CANDIDATES_JSON` | `[$PAPERCLIP_RUNTIME_API_URL]` | JSON array of candidate URLs the agent may use to reach the API. |
| `RUN_LOG_BASE_PATH` | unset | Override the base path for run logs. |
| `WORKSPACE_OPERATION_LOG_BASE_PATH` | unset | Override the base path for workspace operation logs. |

### 4.10 Live SSH environment (advanced)

Used by the `live_ssh` execution environment to provision and run agents inside a remote SSH host. Skip this section unless you are deliberately using remote execution.

| Variable | Secret | Meaning |
|---|---|---|
| `PAPERCLIP_ENV_LIVE_SSH_HOST` | no | SSH hostname. |
| `PAPERCLIP_ENV_LIVE_SSH_PORT` | no | SSH port (`22` if unset). |
| `PAPERCLIP_ENV_LIVE_SSH_USERNAME` | no | SSH username. |
| `PAPERCLIP_ENV_LIVE_SSH_PRIVATE_KEY` | yes | Private key value (inline). |
| `PAPERCLIP_ENV_LIVE_SSH_PRIVATE_KEY_PATH` | yes | Path to a private key file. |
| `PAPERCLIP_ENV_LIVE_SSH_KNOWN_HOSTS` | no | Inline `known_hosts` entries. |
| `PAPERCLIP_ENV_LIVE_SSH_KNOWN_HOSTS_PATH` | no | Path to a `known_hosts` file. |
| `PAPERCLIP_ENV_LIVE_SSH_REMOTE_WORKSPACE_PATH` | no | Workspace path on the remote host. |
| `PAPERCLIP_ENV_LIVE_SSH_STRICT_HOST_KEY_CHECKING` | no | Defaults to strict checking; set to `false` to disable. |
| `PAPERCLIP_ENV_LIVE_SSH_NO_AUTO_FIXTURE` | no | Disable the auto-provisioned test fixture. |

---

## 5. Config file: `$PAPERCLIP_INSTANCE_ROOT/config.json`

Validated by the Zod schema in `packages/shared/src/config-schema.ts`. Every field has a default; you only need to write fields you want to override. The file also tracks `$meta` so the CLI can detect what wrote it last.

A reasonable `config.json` for an authenticated, public deployment looks like this:

```json
{
  "$meta": { "version": 1, "updatedAt": "2026-04-27T00:00:00Z", "source": "configure" },
  "llm": { "provider": "claude" },
  "database": {
    "mode": "postgres",
    "connectionString": "postgres://paperclip:secret@db:5432/paperclip"
  },
  "logging": { "mode": "file" },
  "server": {
    "deploymentMode": "authenticated",
    "exposure": "public",
    "bind": "explicit",
    "host": "0.0.0.0",
    "port": 3100,
    "allowedHostnames": ["paperclip.example.com"]
  },
  "auth": {
    "baseUrlMode": "explicit",
    "publicBaseUrl": "https://paperclip.example.com"
  },
  "storage": {
    "provider": "s3",
    "s3": { "bucket": "my-paperclip-bucket", "region": "us-west-2" }
  },
  "secrets": { "provider": "local_encrypted", "strictMode": true }
}
```

### 5.1 Top-level fields

| Path | Type | Default | Notes |
|---|---|---|---|
| `$meta.version` | literal `1` | required | Schema version. |
| `$meta.updatedAt` | ISO-8601 string | required | Set by the writer. |
| `$meta.source` | `onboard` \| `configure` \| `doctor` | required | Which CLI command last wrote the file. |
| `llm.provider` | `claude` \| `openai` | none | Default LLM provider for company hires. Optional. |
| `llm.apiKey` | string | none | Optional API key persisted in config (prefer secret store). |

### 5.2 `database`

| Path | Type | Default | Notes |
|---|---|---|---|
| `database.mode` | `embedded-postgres` \| `postgres` | `embedded-postgres` | Switches between bundled and external Postgres. |
| `database.connectionString` | string | none | Required when `mode=postgres`. |
| `database.embeddedPostgresDataDir` | path | `~/.paperclip/instances/default/db` | Data dir for the embedded server. |
| `database.embeddedPostgresPort` | int 1–65535 | `54329` | Embedded Postgres port. |
| `database.backup.enabled` | bool | `true` | Enable automatic backups. |
| `database.backup.intervalMinutes` | int 1–10080 | `60` | Snapshot interval. |
| `database.backup.retentionDays` | int 1–3650 | `7` | Retention window. |
| `database.backup.dir` | path | `~/.paperclip/instances/default/data/backups` | Backup destination. |

### 5.3 `server`

| Path | Type | Default | Notes |
|---|---|---|---|
| `server.deploymentMode` | `local_trusted` \| `authenticated` | `local_trusted` | High-level mode. |
| `server.exposure` | `private` \| `public` | `private` | Must be `private` when `deploymentMode=local_trusted`. |
| `server.bind` | `localhost` \| `tailscale` \| `lan` \| `explicit` | inferred | Bind strategy; validated against `host` and `customBindHost`. |
| `server.customBindHost` | string | none | Required when `bind=explicit`. |
| `server.host` | string | `127.0.0.1` | Network bind address. |
| `server.port` | int 1–65535 | `3100` | API server port. |
| `server.allowedHostnames` | string[] | `[]` | Hostnames the server will accept. |
| `server.serveUi` | bool | `true` | Serve the dashboard from the API server. |

### 5.4 `auth`

| Path | Type | Default | Notes |
|---|---|---|---|
| `auth.baseUrlMode` | `auto` \| `explicit` | `auto` | When `explicit`, `publicBaseUrl` is required. |
| `auth.publicBaseUrl` | URL | none | Required when running with `exposure=public`. |
| `auth.disableSignUp` | bool | `false` | Block new account creation. |

### 5.5 `storage`

| Path | Type | Default | Notes |
|---|---|---|---|
| `storage.provider` | `local_disk` \| `s3` | `local_disk` | Storage backend. |
| `storage.localDisk.baseDir` | path | `~/.paperclip/instances/default/data/storage` | Used when provider is `local_disk`. |
| `storage.s3.bucket` | string | `paperclip` | S3 bucket. |
| `storage.s3.region` | string | `us-east-1` | S3 region. |
| `storage.s3.endpoint` | URL | none | Custom S3-compatible endpoint. |
| `storage.s3.prefix` | string | `""` | Object key prefix. |
| `storage.s3.forcePathStyle` | bool | `false` | Use path-style addressing. |

### 5.6 `secrets`

| Path | Type | Default | Notes |
|---|---|---|---|
| `secrets.provider` | `local_encrypted` \| `external_stub` | `local_encrypted` | Secret store backend. |
| `secrets.strictMode` | bool | `false` | Require secret refs for sensitive env vars. |
| `secrets.localEncrypted.keyFilePath` | path | `~/.paperclip/instances/default/secrets/master.key` | Master key file path. |

### 5.7 `logging` & `telemetry`

| Path | Type | Default | Notes |
|---|---|---|---|
| `logging.mode` | `file` \| `cloud` | `file` | Where structured logs go. |
| `logging.logDir` | path | `~/.paperclip/instances/default/logs` | Log directory when `mode=file`. |
| `telemetry.enabled` | bool | `true` | Toggle anonymized usage telemetry. |

### 5.8 Cross-field validation

The schema rejects combinations that don't make sense:

- `server.exposure` must be `private` when `server.deploymentMode=local_trusted`.
- `auth.baseUrlMode` must be `explicit` when `server.exposure=public`.
- `auth.publicBaseUrl` is required when `auth.baseUrlMode=explicit`.
- `bind=explicit` requires `customBindHost`.
- `bind=tailscale` requires the host to be a Tailscale IP (auto-detected unless `PAPERCLIP_TAILNET_BIND_HOST` is set).

If any rule fails, `paperclipai doctor` and the server boot will report the specific path that's invalid.

---

## 6. CLI env vars

The `paperclipai` binary reads almost the same set as the server, plus a couple of CLI-only paths:

| Variable | Default | Secret | Meaning |
|---|---|---|---|
| `PAPERCLIP_AUTH_STORE` | `~/.paperclip/auth.json` | yes | Path to the local auth store (board sessions, JWTs). |
| `PAPERCLIP_API_URL` | `http://127.0.0.1:3100` | no | API endpoint the CLI talks to. |
| `PAPERCLIP_API_KEY` | from auth store | yes | API token used by the CLI. |
| `PAPERCLIP_COMPANY_ID` | from CLI context | no | Default company for non-`--company-id` commands. |

All of `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID`, `PAPERCLIP_CONFIG`, `PAPERCLIP_CONTEXT`, the deployment/binding/storage/secrets/database vars, and the `BETTER_AUTH_*` and `PAPERCLIP_AGENT_JWT_*` group are read by the CLI at the same precedence as the server, mainly during `paperclipai onboard`, `paperclipai configure`, and `paperclipai doctor`.

---

## 7. Adapter env vars

Each adapter receives the [heartbeat-injected vars](#2-heartbeat-injected-env-vars) plus anything declared on the agent itself (`adapter_config.env`). On top of that, individual adapters read provider keys.

### 7.1 Provider keys

| Variable | Adapter(s) | Secret | Meaning |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `claude_local`, `hermes_local` (Claude mode) | yes | Anthropic API key. |
| `OPENAI_API_KEY` | `codex_local`, `hermes_local` (OpenAI mode) | yes | OpenAI API key. |
| `GEMINI_API_KEY` | `gemini_local` | yes | Google Gemini API key. |
| `GOOGLE_API_KEY` | `gemini_local` | yes | Alternate Google API key path. |
| `CLAUDE_CODE_USE_BEDROCK` | `claude_local` | no | Set to `true` to route Claude requests through AWS Bedrock. |
| `ANTHROPIC_BEDROCK_BASE_URL` | `claude_local` | no | Bedrock endpoint URL (used when Bedrock mode is on). |
| `CODEX_HOME` | `codex_local` | no | Override the Codex CLI home directory. |
| `PAPERCLIP_OPENCODE_COMMAND` | `opencode_local` | no | Override the path to the OpenCode binary. |
| `PAPERCLIP_OPENCODE_STORAGE_DIR` | `opencode_local` | no | Override OpenCode's storage directory. |

> **Tip:** If an adapter test fails, start by checking whether the expected provider key is present in the process environment.

### 7.2 Per-agent `adapter_config.env`

The `process` and `http` adapters expose an `env` field (`adapterConfig.env`) on the agent record. Anything you set there is merged into the agent's process environment alongside the `PAPERCLIP_*` injections.

```jsonc
{
  "adapter": "process",
  "adapterConfig": {
    "command": "/usr/local/bin/my-agent",
    "env": {
      "MY_AGENT_LOG_LEVEL": "debug",
      "OPENAI_API_KEY": "${secret:openai-key}"   // secret-store reference
    }
  }
}
```

Values starting with `${secret:...}` are resolved through the secret store ([Secrets](./secrets.md)) at run time.

### 7.3 Hermes auth-token injection

When `hermes_local` is configured with an `authToken`, the server also injects:

| Variable | Meaning |
|---|---|
| `PAPERCLIP_API_KEY` | The supplied auth token (when not already set in `adapterConfig.env`). |
| `PAPERCLIP_RUN_ID` | The current run ID (mirrored into `adapterConfig.env`). |

This is what lets a Hermes runtime call back into the Paperclip API without an explicit operator-supplied API key in the agent config.

---

## 8. Quick reference: secret variables

Every variable below contains material that should never be committed or logged. Prefer the [secret store](./secrets.md) for production deployments.

- `DATABASE_URL`, `DATABASE_MIGRATION_URL`
- `PAPERCLIP_AGENT_JWT_SECRET`
- `BETTER_AUTH_SECRET`
- `PAPERCLIP_SECRETS_MASTER_KEY`, `PAPERCLIP_SECRETS_MASTER_KEY_FILE`
- `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_TOKEN`, `PAPERCLIP_TELEMETRY_BACKEND_TOKEN`
- `PAPERCLIP_API_KEY` (heartbeat-injected JWT or operator-supplied long-lived key)
- `PAPERCLIP_AUTH_STORE` (path to a file that contains tokens)
- `PAPERCLIP_ENV_LIVE_SSH_PRIVATE_KEY`, `PAPERCLIP_ENV_LIVE_SSH_PRIVATE_KEY_PATH`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`

---

## 9. Common pitfalls

- **`PAPERCLIP_API_URL` differs in agent processes.** The server may bind to `0.0.0.0` but advertises `PAPERCLIP_LISTEN_HOST` (or `HOST`) to agents. If your agent process can't reach the API, check what the server resolved that to at boot.
- **Missing `X-Paperclip-Run-Id` header.** Mutating API requests without this header are still accepted but won't link to the run in the audit log. Always include it from heartbeat-driven processes.
- **`PAPERCLIP_AGENT_JWT_SECRET` not set in authenticated mode.** The server falls back to `BETTER_AUTH_SECRET`; if neither is set, agent auth fails closed and you get `401`s on every adapter call.
- **Worktree env vars only set in worktrees.** `PAPERCLIP_WORKSPACE_*` is empty for runs that don't realize a workspace (e.g. pure scheduler wakes on a no-repo agent).
- **`config.json` validation errors block startup.** `paperclipai doctor` prints the offending path; fix the field rather than deleting the file.

For the human-readable explanation of each setting, see the related guides:

- [Deployment Modes](./deployment-modes.md)
- [Database](./database.md)
- [Storage](./storage.md)
- [Secrets](./secrets.md)
- [Tailscale Private Access](./tailscale-private-access.md)
- [Adapters Overview](../adapters/overview.md)
