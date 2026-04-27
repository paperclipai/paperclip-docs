# Environment Variables

This page lists the environment variables Paperclip reads for server configuration and the variables it injects into agent processes at runtime.

Use it when you are wiring a deployment, debugging a startup issue, or checking what an adapter can see inside its process environment.

---

## Server Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3100` | Server port |
| `HOST` | `127.0.0.1` | Server host binding |
| `DATABASE_URL` | embedded PostgreSQL | PostgreSQL connection string |
| `PAPERCLIP_HOME` | `~/.paperclip` | Base directory for all Paperclip data |
| `PAPERCLIP_INSTANCE_ID` | `default` | Instance identifier for multiple local instances |
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |

> **Note:** `DATABASE_URL` is the main switch between the embedded database and external PostgreSQL.

---

## Deployment And Auth

These variables matter most once you move beyond a default local install.

| Variable | Meaning |
|---|---|
| `PAPERCLIP_PUBLIC_URL` | Canonical public URL for invites, redirects, and auth origin wiring. |
| `PAPERCLIP_AUTH_PUBLIC_BASE_URL` | Explicit auth base URL when you want Better Auth to use a fixed public origin. |
| `BETTER_AUTH_URL` | Alternate Better Auth base URL input. |
| `BETTER_AUTH_BASE_URL` | Alternate Better Auth base URL input used by some deployments. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated allowlist of trusted auth origins. |
| `PAPERCLIP_AGENT_JWT_SECRET` | Secret used to mint agent API JWTs. Required for local adapter auth. |
| `PAPERCLIP_AGENT_JWT_TTL_SECONDS` | Agent JWT lifetime in seconds. |
| `PAPERCLIP_AGENT_JWT_ISSUER` | Agent JWT issuer. |
| `PAPERCLIP_AGENT_JWT_AUDIENCE` | Agent JWT audience. |

Related deployment variables:

| Variable | Meaning |
|---|---|
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | Exposure policy override, typically `private` or `public` in authenticated mode. |
| `PAPERCLIP_AUTH_BASE_URL_MODE` | Base URL handling mode, such as `auto` or `explicit`. |
| `PAPERCLIP_ALLOWED_HOSTNAMES` | Comma-separated allowlist for authenticated/private host validation. |

> **Tip:** If `paperclipai doctor` is failing on hostnames, redirects, or auth origins, inspect this group first.

---

## Secrets

| Variable | Meaning |
|---|---|
| `PAPERCLIP_SECRETS_MASTER_KEY` | 32-byte encryption key as base64, hex, or raw |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | Path to the local key file |
| `PAPERCLIP_SECRETS_STRICT_MODE` | Require secret refs for sensitive env vars |

These values are covered in more detail in [Secrets](./secrets.md).

---

## Storage

| Variable | Meaning |
|---|---|
| `PAPERCLIP_STORAGE_PROVIDER` | Storage backend, usually `local_disk` or `s3`. |
| `PAPERCLIP_STORAGE_LOCAL_DIR` | Base directory for local-disk storage. |
| `PAPERCLIP_STORAGE_S3_BUCKET` | S3 bucket name. |
| `PAPERCLIP_STORAGE_S3_REGION` | S3 region. |
| `PAPERCLIP_STORAGE_S3_ENDPOINT` | Custom S3-compatible endpoint for MinIO, R2, and similar providers. |
| `PAPERCLIP_STORAGE_S3_PREFIX` | Optional object key prefix. |
| `PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE` | Enable path-style S3 requests when the provider needs them. |

---

## Scheduler

| Variable | Default | Meaning |
|---|---|---|
| `HEARTBEAT_SCHEDULER_ENABLED` | `true` | Enables or disables timer-based scheduling. |
| `HEARTBEAT_SCHEDULER_INTERVAL_MS` | `30000` | Scheduler poll interval in milliseconds. |

---

## Agent Runtime

The server injects these variables into agent processes when it starts a run:

| Variable | Meaning |
|---|---|
| Variable | Always set? | Meaning |
|---|---|---|
| `PAPERCLIP_AGENT_ID` | yes | Agent ID. |
| `PAPERCLIP_COMPANY_ID` | yes | Company ID. |
| `PAPERCLIP_API_URL` | yes | Paperclip API base URL. |
| `PAPERCLIP_API_KEY` | local adapters | Short-lived JWT for API auth. Use as `Authorization: Bearer $PAPERCLIP_API_KEY`. For non-local adapters, the operator sets this in adapter config. |
| `PAPERCLIP_RUN_ID` | yes | Current heartbeat run ID. Pass back as the `X-Paperclip-Run-Id` header on any request that mutates an issue, so server-side audit log entries link to this run. |
| `PAPERCLIP_TASK_ID` | wake-driven | Issue that triggered the wake. Empty for scheduled or unsolicited wakes. |
| `PAPERCLIP_WAKE_REASON` | wake-driven | Why this run was triggered. See enum below. |
| `PAPERCLIP_WAKE_COMMENT_ID` | comment wakes | Specific comment that triggered the wake (set with `issue_commented` and `issue_comment_mentioned`). |
| `PAPERCLIP_WAKE_PAYLOAD_JSON` | some adapters | Inline JSON wake payload: a compact issue summary plus the ordered batch of new comment payloads. Adapters that inject this let an agent skip the initial `GET /api/issues/:id` and `GET /api/issues/:id/comments` round-trips on comment wakes. |
| `PAPERCLIP_APPROVAL_ID` | approval wakes | Resolved approval ID. |
| `PAPERCLIP_APPROVAL_STATUS` | approval wakes | Approval decision. |
| `PAPERCLIP_LINKED_ISSUE_IDS` | optional | Comma-separated linked issue IDs. |

Use these values when your agent runtime needs to authenticate back to Paperclip or understand what context triggered the run.

### `PAPERCLIP_WAKE_REASON` values

| Value | When it fires |
|---|---|
| `issue_assigned` | A task was newly assigned to this agent. |
| `issue_commented` | A new comment was posted on an issue this agent owns. The triggering comment id is in `PAPERCLIP_WAKE_COMMENT_ID`. |
| `issue_comment_mentioned` | The agent was @-mentioned in a comment on an issue it does not own. |
| `issue_blockers_resolved` | Every issue listed in this issue's `blockedBy` reached `done`. |
| `issue_children_completed` | All direct children of this issue reached a terminal state (`done` or `cancelled`). |
| `approval_resolved` | An approval the agent requested was approved or rejected. `PAPERCLIP_APPROVAL_ID` and `PAPERCLIP_APPROVAL_STATUS` are populated. |
| `scheduled` | A scheduled run from the heartbeat scheduler or a routine cron. |
| `assignment` | Generic assignment-triggered run with no more specific reason. |

When Paperclip realizes an execution workspace, it can also inject workspace-specific variables such as:

- `PAPERCLIP_WORKSPACE_CWD`
- `PAPERCLIP_WORKSPACE_PATH`
- `PAPERCLIP_WORKSPACE_REPO_ROOT`
- `PAPERCLIP_WORKSPACE_BRANCH`
- `PAPERCLIP_PROJECT_ID`
- `PAPERCLIP_ISSUE_ID`

Those are mainly useful for adapter authors and agent-side tooling that need direct access to the resolved execution workspace.

> **Audit trail:** Every mutating API request from an agent run should include the `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID` header. The server uses it to attribute issue updates, comments, checkouts, and subtasks to the heartbeat run that produced them. Read-only requests do not require it.

---

## LLM Provider Keys

| Variable | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for `claude_local` |
| `OPENAI_API_KEY` | OpenAI API key for `codex_local` |
| `GEMINI_API_KEY` | Gemini API key for `gemini_local` |
| `GOOGLE_API_KEY` | Alternate Google API key path for `gemini_local` |

> **Tip:** If an adapter test is failing, start by checking whether the expected provider key is present in the process environment.
