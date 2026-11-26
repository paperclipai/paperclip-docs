---
paperclip_version: v2026.1023.0
seo_title: Deploy Paperclip to Railway
seo_description: Move a running Paperclip company from a laptop to Railway with a community template, a Postgres service and one volume, plus the pitfalls we hit on the way.
---

# Deploy Paperclip to Railway

A field report turned into a recipe: one company with six agents, moved from a Windows laptop to Railway in about three and a half hours. Railway runs the same container shape as the [VPS and Fly.io recipe](./deploy-to-vps-or-fly.md), with less to configure by hand.

> **Note:** This page was written from a single migration on Paperclip `v2026.1023.0` (26 October 2026) and has been running in production since. It uses a community-maintained Railway template, not an official one. Check each step against your own instance.

---

## Architecture

```txt
        ┌─────────────────────────────┐
        │  Railway service: paperclip │
        │  ─ web app + API            │
        │  ─ agent runners (adapters) │
        └──────┬───────────────┬──────┘
               │               │
        DATABASE_URL     volume at /paperclip
               │               │
        ┌──────▼─────┐   ┌─────▼──────┐
        │ Railway    │   │ Railway    │
        │ Postgres   │   │ volume     │
        └────────────┘   └────────────┘
```

Two services and one volume. The Paperclip service holds the API, the UI, and every local adapter process (`claude_local`, `codex_local`). Postgres is its own service. Instance config, uploads, agent workspaces, and the secrets master key live on the volume.

---

## Prerequisites

- A Railway account. Keep app sleeping switched off for the Paperclip service: a sleeping service means sleeping heartbeats.
- Provider keys for the adapters you run (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
- For a migration: the source instance still running, and a recent CLI on your machine (`npx paperclipai@latest`).

---

## Deploy from a template

1. In Railway, choose **New Project → Deploy a template** and search for a Paperclip template. We used the community template built from `Lukem121/paperclip-railway-template`, which provisions the Paperclip service, a Postgres service, and a volume mounted at `/paperclip`.
2. Add your provider keys as service variables before the first deploy.
3. Wait for the Postgres service to report online, then open the generated `*.up.railway.app` domain.
4. Create the first instance admin. The template we used exposes a `/setup` page with **Generate admin invite URL**; open that URL and register.
5. Confirm the instance answers: `curl https://<your-domain>/api/health` → `{"status":"ok"}`.

> **Warning:** Never delete the `/paperclip` volume. It holds the secrets master key. Without it, every stored secret is unreadable even if the database is intact. See [Secrets](../reference/deploy/secrets.md).

If you are starting fresh, you are done: create a company and hire agents. The rest of this page is for moving an existing company.

---

## Move an existing company

Export on the source machine, import against the Railway instance. See [Export & Import](../guides/power/export-import.md) for the package format.

```sh
# On the source machine: full export, not the small default
paperclipai company export <company-id> \
  --out ./exports/acme \
  --include company,agents,projects,issues,skills
```

Check the output before you go on. The command prints the number of files written. A package with a manifest and almost no files is not a backup.

```sh
# Log in to the Railway instance with an isolated data dir
npx paperclipai@latest auth login \
  --api-base https://<your-domain> \
  --data-dir ./paperclip-railway-cli

# Import as a new company
npx paperclipai@latest company import ./exports/acme \
  --target new \
  --new-company-name "Acme" \
  --api-base https://<your-domain> \
  --data-dir ./paperclip-railway-cli
```

Then, in this order:

1. Stop the source instance. Imported assignments can wake agents on the new instance, and you do not want two instances working the same tickets.
2. Re-enter secrets on the new instance (see below). In our migration the agents' credential variables had to be set again by hand.
3. Review each agent's instructions for paths and tools that only existed on the old host (`C:\Users\...`, `curl.exe`, PowerShell).
4. Set budgets and heartbeat intervals again and confirm them in the UI.
5. Run one small, read-only task per agent before you trust the schedule.

---

## Pitfalls we hit

| Symptom | Cause | What to do |
|---|---|---|
| Export finishes without an error but the folder is nearly empty | Default `--include` is `company,agents` only | Pass the full `--include` list and read the file count the command prints. |
| `company import` returns `500` with a foreign-key error on CLI auth | The CLI reused local state from the old instance and sent the old company ID | Give the Railway instance its own `--data-dir` on every command. |
| An old globally installed CLI fails against the new server | Version gap between CLI and server | Use `npx paperclipai@latest` for everything that talks to Railway. |
| Copying the instance folder on Windows fails halfway | Paths longer than 260 characters in session files | Use `robocopy` instead of `Copy-Item` for the raw backup copy. |
| Saving a password as a plain env value fails without a clear message | Strict secret mode rejects inline values for sensitive keys | Store it as a secret and bind the env key to the secret reference. |
| After **Store as secret**, the agent no longer finds its variable | The env key was renamed to the secret's name | Open the agent's env bindings and set the key back to the name the agent expects. |
| Dollar amounts vanish from agent comments (`$50/month` becomes `/month`) | Agents pass text through a shell, which expands `$5` as a variable | Tell agents to write such text to a file and send the file, never inline in a command. |
| Built-in agents and their routines are missing after import | Built-ins are not part of the package | Approve the built-in hires on the new instance and recreate their routines. |

---

## Agent isolation on one service

All local adapters run as child processes of one container, under one Unix user. A variable bound to a single agent is scoped by Paperclip, but it is not a wall between processes: while that agent runs, another agent with shell access can read its environment through `/proc`. We confirmed this with a dummy value. If one agent holds a credential the others must not reach, put that agent in its own service or keep the credential behind a proxy. See *Agent runner placement* in the [VPS and Fly.io recipe](./deploy-to-vps-or-fly.md).

---

## Observability

- **Logs.** Railway's service log view, or `railway logs` from the CLI.
- **Health.** `GET /api/health` (checks the database) and `GET /api/liveness` (process only).
- **Costs and runs.** Per-agent run history and budgets in the dashboard, same as any other deployment.

---

## Backups

Turn on backups for the Postgres service and keep a volume backup. For portable company data, schedule the export routine from [Back Up and Restore a Company](./back-up-and-restore-a-company.md).

---

## Cost (November 2026)

For one company with six mostly event-driven agents, the Railway bill has been about €5 a month for both services and the volume. Model spend is separate and much larger. Verify current rates against Railway's pricing; this is one data point, not a commitment.

---

## See also

- [Deploy to a VPS or Fly.io](./deploy-to-vps-or-fly.md) — the same container on other hosts.
- [Back Up and Restore a Company](./back-up-and-restore-a-company.md) — export routine and disaster recovery.
- [Update Paperclip to the Latest Version](./update-paperclip.md) — plan the first update before you need it.
- [Secrets](../reference/deploy/secrets.md) — master key, strict mode, and secret references.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first place to look when agents misbehave.
