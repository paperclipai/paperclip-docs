# Deploy Paperclip to a VPS or Fly.io

A pragmatic recipe to get a working URL with persistent data. Fly.io is the fast path; a single VPS is the boring backup. Both use the same Docker image.

---

## Architecture

```txt
        ┌─────────────────────────────┐
        │  paperclip container        │
        │  ─ web app (port 3100)      │
        │  ─ agent runners (adapters) │
        └──────┬───────────────┬──────┘
               │               │
        DATABASE_URL    PAPERCLIP_HOME volume
               │               │
        ┌──────▼─────┐   ┌─────▼─────┐
        │ Postgres   │   │ Persistent │
        │ (hosted)   │   │ disk       │
        └────────────┘   └────────────┘
```

The container holds the API, the UI, and any adapter processes the runtime spawns (`claude`, `codex`). Postgres lives outside the container. Uploads, secrets, and instance config live on the mounted volume at `PAPERCLIP_HOME`.

---

## Prerequisites

- A domain you control (`paperclip.example.com`).
- Provider credentials: Fly.io account + `flyctl`, **or** a small Linux VPS with Docker.
- A hosted Postgres (Supabase, Neon, Fly Postgres). Embedded Postgres is for local only — see [Database](../reference/deploy/database.md).
- Credentials for whichever LLM adapters you plan to run — an API key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), a subscription token, or Bedrock access. For Claude Code the choice matters on a server; see [Headless auth for Claude Code](#headless-auth-for-claude-code) below.

---

## Fly.io (primary path)

```sh
flyctl launch --image paperclip-local --no-deploy
flyctl volumes create paperclip_data --size 5
```

Edit `fly.toml` so the volume mounts at `/paperclip` and the internal port is `3100`. Set the runtime config:

```sh
flyctl secrets set \
  HOST=0.0.0.0 \
  PAPERCLIP_HOME=/paperclip \
  PAPERCLIP_DEPLOYMENT_MODE=authenticated \
  PAPERCLIP_DEPLOYMENT_EXPOSURE=public \
  PAPERCLIP_PUBLIC_URL=https://paperclip.example.com \
  DATABASE_URL=postgres://...:5432/paperclip \
  PAPERCLIP_AGENT_JWT_SECRET=$(openssl rand -hex 32) \
  ANTHROPIC_API_KEY=sk-...
flyctl deploy
flyctl certs add paperclip.example.com
```

The first request triggers schema migration against the empty database. Confirm with `curl https://paperclip.example.com/api/health` → `{"status":"ok"}`.

---

## VPS (secondary path)

On a $5–10/mo VPS with Docker installed:

```sh
docker run -d --name paperclip --restart=always \
  -p 80:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e PAPERCLIP_DEPLOYMENT_MODE=authenticated \
  -e PAPERCLIP_DEPLOYMENT_EXPOSURE=public \
  -e PAPERCLIP_PUBLIC_URL=https://paperclip.example.com \
  -e DATABASE_URL=postgres://... \
  -e PAPERCLIP_AGENT_JWT_SECRET=... \
  -v /opt/paperclip:/paperclip \
  paperclip-local
```

Front it with Caddy or Nginx for TLS. See the [Docker reference](../reference/deploy/docker.md) for the full env-var surface.

---

## DB migrations

Migrations run automatically on container start against `DATABASE_URL`. If your provider gives both a direct (`:5432`) and pooled (`:6543`) connection (Supabase), point the app at the pooled URL and disable prepared statements; run one-off migrations against the direct URL. Details: [Database](../reference/deploy/database.md).

---

## Agent runner placement

Default: **co-located** in the same container. Local adapters (`claude_local`, `codex_local`) run as child processes when a heartbeat fires. This is fine until you outgrow the container's CPU/memory.

Move runners to **separate** machines once heartbeats start contending with the API: configure adapters to point at a remote runner pool, or run a second container with the same `DATABASE_URL` and `PAPERCLIP_API_URL` and accept only agent traffic. Worth it past a handful of busy agents.

---

## Headless auth for Claude Code

A container has no browser and no OS keychain, so the `claude` login flow you use on a laptop doesn't apply here. Running `claude` and logging in inside the container *appears* to work, but the credentials land in the container user's `~/.claude` — not on the `PAPERCLIP_HOME` volume — so they vanish on the next deploy, and the login expires after a while regardless. The symptom is confusing: `claude -p "hello"` works when you SSH in and test by hand, then the adapter gets empty output or auth failures on the next heartbeat.

Pick one of the three unattended modes and set it explicitly ([full details on the adapter page](../reference/adapters/claude-code.md#authentication)):

**API key** — the setup shown in the recipes above. `flyctl secrets set ANTHROPIC_API_KEY=sk-...` (or `-e` on Docker) works, but binding the key per-agent as a secret reference in the adapter's `env` field is better: it survives redeploys and upgrades, and rotates in one place. Bills per token to your Claude Console account.

**Subscription token** — if you want usage billed to a Claude Pro/Max/Team/Enterprise plan instead of an API key. Mint a long-lived token on your local machine (the browser step happens there, not on the server):

```sh
claude setup-token   # approve in browser, copy the printed token
```

Then store it as a Paperclip secret and bind it in the Claude Code adapter's `env` as `CLAUDE_CODE_OAUTH_TOKEN`. The token is valid for about a year — put a reminder in your calendar, because expiry looks like a sudden auth failure.

**AWS Bedrock** — routes inference and billing through AWS; no Anthropic key needed. Set in the adapter's `env`:

```json
"env": {
  "CLAUDE_CODE_USE_BEDROCK": "1",
  "AWS_REGION": "us-east-1"
}
```

plus AWS credentials (static keys as secret refs, `AWS_BEARER_TOKEN_BEDROCK`, or an instance role if the VPS is an EC2 host), and a region-qualified model id (`us.anthropic.…`) in the adapter's model field.

> **Warning:** Don't mix modes. If an `ANTHROPIC_API_KEY` is visible anywhere — a Fly secret, a Docker `-e` flag, the adapter env — Claude Code uses it in headless mode without asking, even when you meant to run on a subscription token. One credential per deployment; run the adapter's **Test Environment** after deploying and check which auth mode it reports.

---

## Observability

- **Logs.** Fly: `flyctl logs`. VPS: `docker logs -f paperclip`. Health: `GET /api/health`.
- **Metrics.** The dashboard exposes per-agent run history, costs, and budget at `/<prefix>/agents/<key>/runs`.
- **Alerts.** Hook on a non-200 from `/api/health` for liveness, and on `paperclipai doctor` exit code (run it from a Fly machine SSH or a cron) for config drift.

---

## Backups

Postgres backups are your provider's responsibility — turn them on. For company data and uploads, schedule a recurring CEO-safe export — see [Back Up and Restore a Company](./back-up-and-restore-a-company.md) for the full recipe.

---

## Cost (April 2026)

Small-scale, low-traffic deployment, monthly:

| Component | Fly.io | VPS |
|---|---|---|
| Compute | $5–10 (shared-cpu-1x, 1GB) | $5–10 (Hetzner CX22, DO basic) |
| Postgres | $0 (Neon/Supabase free tier) – $25 (Fly Postgres dev) | same |
| Volume / disk | ~$1 (5GB) | included |
| Bandwidth | low usage typically free | included |
| **Total** | **~$5–35/mo** | **~$5–35/mo** |

Verify current rates against your provider — these are list prices as of 2026-04-27, not commitments.

---

## See also

- [Back Up and Restore a Company](./back-up-and-restore-a-company.md) — nightly export routine and disaster-recovery flow.
- [Export & Import](../guides/power/export-import.md) — package format and CLI shortcuts.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first place to look when agents misbehave.
- [Deployment overview](../reference/deploy/overview.md) — full reference for modes, storage, and secrets.
