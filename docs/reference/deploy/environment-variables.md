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
| `PAPERCLIP_AGENT_ID` | Agent ID |
| `PAPERCLIP_COMPANY_ID` | Company ID |
| `PAPERCLIP_API_URL` | Paperclip API base URL |
| `PAPERCLIP_API_KEY` | Short-lived JWT for API auth |
| `PAPERCLIP_RUN_ID` | Current heartbeat run ID |
| `PAPERCLIP_TASK_ID` | Issue that triggered the wake |
| `PAPERCLIP_WAKE_REASON` | Wake trigger reason |
| `PAPERCLIP_WAKE_COMMENT_ID` | Comment that triggered the wake |
| `PAPERCLIP_APPROVAL_ID` | Resolved approval ID |
| `PAPERCLIP_APPROVAL_STATUS` | Approval decision |
| `PAPERCLIP_LINKED_ISSUE_IDS` | Comma-separated linked issue IDs |

Use these values when your agent runtime needs to authenticate back to Paperclip or understand what context triggered the run.

When Paperclip realizes an execution workspace, it can also inject workspace-specific variables such as:

- `PAPERCLIP_WORKSPACE_CWD`
- `PAPERCLIP_WORKSPACE_PATH`
- `PAPERCLIP_WORKSPACE_REPO_ROOT`
- `PAPERCLIP_WORKSPACE_BRANCH`
- `PAPERCLIP_PROJECT_ID`
- `PAPERCLIP_ISSUE_ID`

Those are mainly useful for adapter authors and agent-side tooling that need direct access to the resolved execution workspace.

---

## LLM Provider Keys

| Variable | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for `claude_local` |
| `OPENAI_API_KEY` | OpenAI API key for `codex_local` |
| `GEMINI_API_KEY` | Gemini API key for `gemini_local` |
| `GOOGLE_API_KEY` | Alternate Google API key path for `gemini_local` |

> **Tip:** If an adapter test is failing, start by checking whether the expected provider key is present in the process environment.
