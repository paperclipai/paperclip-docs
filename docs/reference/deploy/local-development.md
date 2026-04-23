# Local Development

This is the fastest way to run Paperclip locally. The default path uses embedded PostgreSQL, local disk storage, and the local trusted deployment mode.

Use this page if you want to get the app running quickly, reset a local install, or start a private-network dev instance.

---

## Prerequisites

- Node.js 20+
- pnpm 9+

> **Note:** You do not need a separate PostgreSQL install for the normal local workflow.

---

## Start The Server

```sh
pnpm install
pnpm dev
```

This starts:

- the API server at `http://localhost:3100`
- the UI from the API server in dev middleware mode

The first start automatically uses embedded PostgreSQL if `DATABASE_URL` is unset. See [Database](./database.md) for the storage modes behind that behavior.

---

## One-Command Bootstrap

If you want setup and startup in one step, use:

```sh
pnpm paperclipai run
```

This is the best command for a first-time install because it:

1. auto-onboards if no config exists
2. runs `paperclipai doctor` with repair enabled
3. starts the server once checks pass

Use this when you want Paperclip to behave like an app, not a manually assembled stack.

---

## Managed Dev Runner

The dev runner is idempotent for the current repo and instance. If the matching Paperclip dev runner is already alive, Paperclip reports the existing process instead of starting a duplicate.

Inspect or stop it with:

```sh
pnpm dev:list
pnpm dev:stop
```

---

## Private Network Dev

If you want to access a local instance over Tailscale or another private network, run the authenticated private dev mode:

```sh
pnpm dev --tailscale-auth
```

Alias:

```sh
pnpm dev --authenticated-private
```

This configures the instance for authenticated private exposure and binds the server to `0.0.0.0`.

If you need to allow additional private hostnames:

```sh
pnpm paperclipai allowed-hostname dotta-macbook-pro
```

See [Tailscale Private Access](./tailscale-private-access.md) for the full workflow.

---

## Health Checks

After startup, verify the instance is alive:

```sh
curl http://localhost:3100/api/health
```

Expected response:

```json
{"status":"ok"}
```

You can also confirm the API is serving company data:

```sh
curl http://localhost:3100/api/companies
```

---

## Reset Local Data

To wipe the embedded database and start over:

```sh
rm -rf ~/.paperclip/instances/default/db
pnpm dev
```

This removes the local database only. It does not change your repo checkout or any other workspace data.

---

## Worktrees And Isolated Instances

If you work from multiple git worktrees, do not point two Paperclip servers at the same embedded PostgreSQL data directory.

Create a repo-local isolated instance instead:

```sh
pnpm paperclipai worktree init
```

That command creates a repo-local `.paperclip` config and an isolated instance under `~/.paperclip-worktrees` so the new worktree does not share the default embedded database.

> **Tip:** This is the safest way to test docs or feature work in parallel across multiple branches.

---

## Default Data Paths

| Data | Path |
|---|---|
| Config | `~/.paperclip/instances/default/config.json` |
| Database | `~/.paperclip/instances/default/db` |
| Storage | `~/.paperclip/instances/default/data/storage` |
| Secrets key | `~/.paperclip/instances/default/secrets/master.key` |
| Logs | `~/.paperclip/instances/default/logs` |

These paths are under `PAPERCLIP_HOME` and `PAPERCLIP_INSTANCE_ID`. Override them when you want an isolated local instance:

```sh
PAPERCLIP_HOME=/custom/path PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```

> **Tip:** If you are working in a second checkout or worktree, give it its own instance ID so you do not share the same embedded database by accident.
