---
paperclip_version: v2026.722.0
---

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
| `DATABASE_MIGRATION_URL` | falls back to `DATABASE_URL` | Optional PostgreSQL URL used only when running migrations — useful when your runtime user lacks DDL rights and a separate role applies schema changes. |
| `PAPERCLIP_HOME` | `~/.paperclip` | Base directory for all Paperclip data |
| `PAPERCLIP_INSTANCE_ID` | `default` | Instance identifier for multiple local instances |
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |
| `SERVE_UI` | `true` (from `server.serveUi` in `config.json`) | When set, overrides the file-config flag that controls whether the server serves the bundled UI. `SERVE_UI=true` enables it; `SERVE_UI=false` disables it. |
| `PAPERCLIP_BIND` | inferred from `HOST` | Bind mode for the server socket. One of the values in `BIND_MODES` (see `packages/shared`); overrides `server.bind` in `config.json`. |
| `PAPERCLIP_BIND_HOST` | inferred | Custom host when `PAPERCLIP_BIND` is set to a custom mode; overrides `server.customBindHost`. |
| `PAPERCLIP_TAILNET_BIND_HOST` | auto-detected via `tailscale ip -4` | Tailnet IPv4 address the server binds to when bind mode is `tailnet`. Set explicitly to skip the `tailscale` CLI probe. |

> **Note:** `DATABASE_URL` is the main switch between the embedded database and external PostgreSQL.

---

## Deployment And Auth

These variables matter most once you move beyond a default local install.

| Variable | Meaning |
|---|---|
| `PAPERCLIP_PUBLIC_URL` | Canonical public URL for invites, redirects, and auth origin wiring. |
| `PAPERCLIP_AUTH_PUBLIC_BASE_URL` | Explicit auth base URL when you want Better Auth to use a fixed public origin. |
| `BETTER_AUTH_URL` | Alternate Better Auth base URL input. |
| `BETTER_AUTH_SECRET` | Signing secret for Better Auth sessions and tokens. Falls back to `PAPERCLIP_AGENT_JWT_SECRET` when unset; the server refuses to start if neither is configured. For local development the `.env.example` ships `paperclip-dev-secret`. |
| `BETTER_AUTH_BASE_URL` | Alternate Better Auth base URL input used by some deployments. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated allowlist of trusted auth origins. |
| `PAPERCLIP_AGENT_JWT_SECRET` | Secret used to mint agent API JWTs. Required for local adapter auth. |
| `PAPERCLIP_AGENT_JWT_TTL_SECONDS` | Agent JWT lifetime in seconds. |
| `PAPERCLIP_AGENT_JWT_ISSUER` | Agent JWT issuer. |
| `PAPERCLIP_AGENT_JWT_AUDIENCE` | Agent JWT audience. |
| `PAPERCLIP_TOOL_ACTION_SIGNING_SECRET` | Signing secret for tool action approvals. Unlike `BETTER_AUTH_SECRET` it has no fallback — if it is unset, the server cannot issue signed tool action approvals and raises `ToolActionSigningSecretMissingError`. Set it in the instance's own environment; worktrees inherit it from `.paperclip/.env`. For local development the `.env.example` ships `paperclip-dev-tool-action-signing-secret-change-me`. |

Related deployment variables:

| Variable | Meaning |
|---|---|
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | Exposure policy override, typically `private` or `public` in authenticated mode. |
| `PAPERCLIP_AUTH_BASE_URL_MODE` | Base URL handling mode, such as `auto` or `explicit`. |
| `PAPERCLIP_ALLOWED_HOSTNAMES` | Comma-separated allowlist for authenticated/private host validation. |
| `TRUST_PROXY` | How much to trust the `X-Forwarded-For` header when the server sits behind a reverse proxy or load balancer. Defaults to unset (trust nothing). See below. |

> **Tip:** If `paperclipai doctor` is failing on hostnames, redirects, or auth origins, inspect this group first.

### Trusting a reverse proxy (`TRUST_PROXY`)

When you run Paperclip behind a load balancer or reverse proxy (nginx, Caddy, a cloud LB), the real client IP arrives in the `X-Forwarded-For` header rather than on the socket. `TRUST_PROXY` tells the server how far to trust that header so `req.ip` and rate-limiting see the actual client instead of your proxy.

The default is **unset**, which trusts nothing — the safe choice, because an untrusted client can otherwise spoof its address by sending its own `X-Forwarded-For`. Only opt in when there really is a proxy in front of the server.

Accepted values:

| Value | Meaning |
|---|---|
| unset, `""`, `false`, `0` | Trust nothing. The default. |
| `true` | Trust the header unconditionally. **Unsafe** unless the server is unreachable except through your proxy. |
| a positive integer (e.g. `1`) | Trust that many proxy hops. Use `1` for a single LB in front of the server. |
| a comma-separated list | Trust specific sources by named subnet (`loopback`, `linklocal`, `uniquelocal`) or CIDR (e.g. `10.0.0.0/8`, `fd00::/8`). |

A malformed value (a stray sign, leading zeros, or an unrecognised token) makes the server **refuse to start** with an explanatory error, so a typo fails loudly rather than silently disabling proxy trust. After setting it, confirm `req.ip` in the request log matches the real client IP through your proxy.

---

## Cloud-Managed Instances

| Variable | Default | Meaning |
|---|---|---|
| `PAPERCLIP_MANAGED_CONFIG` | unset (self-hosted) | Set only by the Paperclip Cloud harness. Holds one JSON document describing which experimental feature flags the harness manages for this instance, plus the plugin keys it declares for auto-install. **Absent** means self-hosted: no overlay, no behavior change. **Present but blank, or malformed, makes the server refuse to start.** |

You don't set this variable yourself. It exists so that a hosted instance gets its feature configuration from the fleet that runs it rather than from its own database, and it's documented here so you can recognise it in a running container's environment.

The value is a single JSON document:

```json
{
  "v": 1,
  "mode": "cloud",
  "catalogVersion": "2026.720.0",
  "features": { "enableApps": false, "enableCases": true },
  "plugins": { "autoInstall": ["daytona", "kubernetes"] }
}
```

All five keys are required — `v`, `mode`, `catalogVersion`, `features`, and `plugins.autoInstall` — though `features` may be `{}` and `plugins.autoInstall` may be `[]`. `mode` is always `"cloud"`, and `catalogVersion` records the feature-catalog version the document was validated against.

### It fails closed

Only an **absent** variable means self-hosted. Everything else is treated as a harness misconfiguration and stops the server at startup with a precise error, so a truncated or mistyped document can never silently drop a control that was supposed to be in force. The server refuses to start when the variable is:

- set but blank (unset it entirely for self-hosted mode)
- not valid JSON, or not a JSON object
- carrying an unknown top-level key, or a `v` other than `1`, or a `mode` other than `"cloud"`
- missing `features` or `plugins.autoInstall`
- naming a feature key this build doesn't have, or one whose feature-catalog tier isn't `managed`
- giving a non-boolean value for a feature, or a blank/duplicate plugin key

### What it can and can't reach

`features` may only target the boolean feature-flag keys of the instance's experimental settings — the ones on **Settings → Instance settings → Experimental**. Server-managed bookkeeping fields (activation cutoffs, lookback hours) aren't booleans and are excluded by construction, so a managed document can't touch them.

On top of that, each flag carries a tier in the build's feature catalog: `preference` (a tenant's own taste setting the harness leaves alone), `managed` (the harness may set it), or `floor` (pinned in code). Only `managed` keys are accepted. A key whose tier differs in the running build is version skew between the document's `catalogVersion` and the app, and the server refuses to start rather than apply a control with mismatched semantics.

Paperclip publishes that tier map per release as a `feature-catalog.json` artifact — generated by `scripts/generate-feature-catalog.ts --version <catalogVersion>` — which the cloud harness imports and validates its feature writes against.

### Nothing is written to the database

The overlay is never persisted. The values are applied when settings are read, which means they re-assert on every read — a database restore or a hand-edited settings row cannot resurrect a capability the harness disabled.

In the UI, every key the overlay controls renders with a lock badge reading **Managed by Paperclip Cloud** and a disabled toggle. Self-hosted responses carry no managed keys at all, so every toggle stays editable. See [Experimental features](../../experimental/overview.md#if-a-toggle-is-locked) for the user-facing view.

---

## Secrets

| Variable | Meaning |
|---|---|
| `PAPERCLIP_SECRETS_MASTER_KEY` | 32-byte encryption key as base64, hex, or raw |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | Path to the local key file |
| `PAPERCLIP_SECRETS_STRICT_MODE` | Require secret refs for server-side env bindings. Does not apply to `paperclipai configure --section llm` or `config.llm.apiKey`. |

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

## Telemetry & Feedback Export

These variables control where the server forwards operator-submitted feedback (and the deprecated telemetry channel that backs the same export pipeline). They are read by `server/src/config.ts` and are only consulted when you want to ship feedback events off your instance to a separate collector.

| Variable | Default | Meaning |
|---|---|---|
| `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_URL` | unset | URL of the external feedback collector. When set, the server forwards `paperclipai feedback` submissions to this endpoint. |
| `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_TOKEN` | unset | Bearer token used to authenticate the forwarding request. |
| `PAPERCLIP_TELEMETRY_BACKEND_URL` | unset | Legacy alias for `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_URL`. Honoured for backwards compatibility — set the feedback variant in new deployments. |
| `PAPERCLIP_TELEMETRY_BACKEND_TOKEN` | unset | Legacy alias for `PAPERCLIP_FEEDBACK_EXPORT_BACKEND_TOKEN`. |

If neither variable is set, feedback submissions are stored locally and never leave the instance.

### Turning off telemetry

Paperclip ships anonymized usage telemetry (which adapters you run, and similar coarse signals) that helps the project understand how Paperclip is used. It carries no personal data, and you can turn it off completely by setting either of these variables. Both are checked for the exact value `1`, and either one on its own disables telemetry.

| Variable | Meaning |
|---|---|
| `PAPERCLIP_TELEMETRY_DISABLED` | Set to `1` to disable Paperclip's anonymized telemetry. |
| `DO_NOT_TRACK` | The cross-tool [Console Do Not Track](https://consoledonottrack.com/) convention. Set to `1` to disable telemetry. |

---

## Observability (OpenTelemetry)

Paperclip can emit distributed traces over OpenTelemetry (OTLP) so you can watch requests flow through the server in a tracing backend like Jaeger, Tempo, or Honeycomb. It is **opt-in and off by default** — nothing is loaded until you point it at a collector.

To turn it on, set `OTEL_EXPORTER_OTLP_ENDPOINT` and install the OpenTelemetry packages the server needs (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, the exporter for your protocol, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`). If the endpoint is set but the packages are missing, the server logs a one-line hint and keeps running without tracing.

| Variable | Default | Meaning |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | OTLP collector endpoint. Setting it is the master switch that enables tracing. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` | Exporter protocol: `grpc`, `http/protobuf`, or `http/json`. An unknown value logs a warning and falls back to `grpc`. |
| `OTEL_SERVICE_NAME` | `paperclip` | Service name reported on spans. |
| `OTEL_SERVICE_VERSION` | `unknown` | Service version reported on spans. |

A bad endpoint or an unreachable collector never takes the server down — the SDK logs the failure and tracing simply stays off. On shutdown the server flushes buffered spans (with a short timeout) before exiting.

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

### How `PAPERCLIP_*` env bindings reach the run

You can define your own environment variables on an agent, project, routine, or adapter config, and they flow into the run environment — including ones you deliberately name with a `PAPERCLIP_` prefix (for example a secret called `PAPERCLIP_CLOUD_PROD_PROVIDER_RAILWAY_TOKEN`). The server applies one simple policy when it builds each run's environment:

- **`PAPERCLIP_API_KEY` is never accepted** from your agent, project, routine, or adapter config. The harness mints a short-lived run token for every run, and that minted token is the only source of `PAPERCLIP_API_KEY`.
- **Harness-assigned runtime variables always win.** The variables Paperclip sets for the run itself (like `PAPERCLIP_RUN_ID`, `PAPERCLIP_AGENT_ID`, and the wake/workspace variables above) take precedence over any same-named binding you define, so you cannot accidentally shadow them.
- **Every other `PAPERCLIP_*` binding flows through** to the run environment just like a variable with no prefix. Naming a value with the `PAPERCLIP_` prefix no longer causes it to be dropped.

> **Upgrade note (v2026.722.0):** Earlier releases stripped *every* `PAPERCLIP_`-prefixed binding before resolving the run environment, which silently dropped custom secrets you had named with that prefix — those now pass through as expected. In the same change, a static `PAPERCLIP_API_KEY` you set in adapter or config env to override the run token no longer has any effect. If you relied on that override, drop it: the harness-minted run token is now the only source of the run API key.

---

## LLM Provider Keys

| Variable | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for `claude_local` |
| `OPENAI_API_KEY` | OpenAI API key for `codex_local` |
| `GEMINI_API_KEY` | Gemini API key for `gemini_local` |
| `GOOGLE_API_KEY` | Alternate Google API key path for `gemini_local` |

> **Tip:** If an adapter test is failing, start by checking whether the expected provider key is present in the process environment.

---

## Adapter Provider Overrides

The local CLI adapters can be pointed at a custom or remote OpenAI-compatible gateway through these server-read variables. Each takes a JSON value that Paperclip writes into the adapter's own runtime config before a run, so you can route an adapter at your own provider without editing the agent's machine by hand. The full JSON shape and behaviour for each live on the adapter's reference page.

| Variable | Adapter | Meaning |
|---|---|---|
| `PAPERCLIP_CODEX_PROVIDERS` | `codex_local` | JSON of custom providers (and an optional `model_provider`) written into Codex's managed `config.toml`. See [Codex](../adapters/codex.md). |
| `PAPERCLIP_PI_PROVIDERS` | `pi_local` | JSON of custom providers written into Pi's managed `models.json`. See [Pi](../adapters/pi.md). |
| `PAPERCLIP_OPENCODE_PROVIDERS` | `opencode_local` | JSON merged into OpenCode's `provider` config. See [OpenCode](../adapters/opencode.md). |
| `PAPERCLIP_OPENCODE_SMALL_MODEL` | `opencode_local` | Sets OpenCode's `small_model` (the auxiliary/helper model). See [OpenCode](../adapters/opencode.md). |

Values support `{env:VAR}` placeholders, which are expanded server-side so secrets stay out of the stored JSON.
