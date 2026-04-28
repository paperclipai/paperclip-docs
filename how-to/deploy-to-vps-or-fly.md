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
- Provider keys for whichever LLM adapters you plan to run (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).

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
