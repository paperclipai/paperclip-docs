---
paperclip_version: v2026.1023.0
seo_title: Database Configuration
seo_description: Paperclip runs PostgreSQL through Drizzle ORM. One schema across every supported mode — what differs is where Postgres runs and how it is reached.
---

# Database

Paperclip uses PostgreSQL through Drizzle ORM. The same schema works across the supported database modes; the difference is where PostgreSQL is running and how Paperclip connects to it.

Use this page when you are choosing between embedded, local Docker, or hosted PostgreSQL.

---

## Database Modes

| Mode | Best for | Setup cost |
|---|---|---|
| Embedded PostgreSQL | Local development, one-command installs | Zero config |
| Local PostgreSQL in Docker | A local prod-like database | Low |
| Hosted PostgreSQL | Production and shared deployments | Higher |

> **Note:** The app logic does not change across modes. Only `DATABASE_URL` and the storage location change.

---

## Embedded PostgreSQL

This is the default mode when `DATABASE_URL` is not set.

```sh
pnpm dev
```

On first start, Paperclip:

1. creates `~/.paperclip/instances/default/db/`
2. ensures the `paperclip` database exists
3. runs migrations for an empty database
4. starts serving requests

Data persists across restarts in that directory.

Use this mode when you want the simplest possible local setup.

Reset the local database by deleting the data directory:

```sh
rm -rf ~/.paperclip/instances/default/db
```

The Docker quickstart uses embedded PostgreSQL by default too. See [Docker](./docker.md) for the container setup.

---

## Local PostgreSQL In Docker

Use this if you want a standard PostgreSQL server locally instead of the embedded runtime.

Start the database:

```sh
docker compose up -d
```

This starts PostgreSQL 17 on `localhost:5432`.

Set the connection string in your environment:

```sh
cp .env.example .env
# DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
```

Then push the schema:

```sh
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip \
  npx drizzle-kit push
```

Use this mode when you want to mirror a normal PostgreSQL deployment more closely while still staying local.

---

## Hosted PostgreSQL

For production, use a hosted PostgreSQL provider such as [Supabase](https://supabase.com/).

Typical setup:

1. create a project at [database.new](https://database.new)
2. copy the connection string from the database settings
3. set `DATABASE_URL` in your deployment environment

Supabase exposes two useful connection styles:

- direct connection on port `5432` for migrations and one-off scripts
- pooled connection on port `6543` for the running application

If you use the pooled connection in transaction mode and your pooler doesn't support named prepared statements, switch them off with an environment variable. You don't need to edit any code:

```sh
DATABASE_PREPARED_STATEMENTS=false
```

The variable has three settings:

| Value | What happens |
|---|---|
| Unset | Paperclip keeps its normal behavior. Leave it unset unless you have a reason to change it. |
| `false` | Paperclip never prepares statements. Use this behind a pooler that doesn't support them. |
| `true` | Paperclip also prepares its ordinary queries, including the ones inside transactions. Only use this on a direct connection or a pooler that supports named prepared statements, so check your provider's settings first. Preparing caches statement metadata on the connection, never query results. |

> **Warning:** Use the direct connection for schema changes. Pointing migrations at the pooled endpoint is a common way to get avoidable connection errors.

---

## Connection Pool Settings

Paperclip keeps a pool of open connections to PostgreSQL and reuses them across requests. The defaults suit most installs, so you only need these settings when you're sharing a database with other apps, running several server processes, or chasing connection limits on a hosted plan. Each one is an optional environment variable, and they apply in every database mode.

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_POOL_MAX` | `10` | The most connections the pool opens at once. |
| `DATABASE_IDLE_TIMEOUT_SECONDS` | `60` | Closes a connection after it has sat idle this long, so a quiet server gives its connections back. `0` keeps idle connections open indefinitely. |
| `DATABASE_CONNECT_TIMEOUT_SECONDS` | `30` | How long to wait for a new connection before giving up. |
| `DATABASE_MAX_LIFETIME_SECONDS` | a random 30–60 minutes | Replaces a pooled connection with a fresh one once it's this old. |
| `DATABASE_APPLICATION_NAME` | `paperclip` | The name Paperclip's connections show in PostgreSQL's `pg_stat_activity` view, so you can tell them apart from other clients. |
| `DATABASE_PREPARED_STATEMENTS` | unset | Prepared statements. See [Hosted PostgreSQL](#hosted-postgresql). |

Values are checked when the server starts, and a bad one stops startup with an error that names the variable instead of being quietly ignored. The number settings take whole numbers of `1` or more, except `DATABASE_IDLE_TIMEOUT_SECONDS`, which also accepts `0`. `DATABASE_PREPARED_STATEMENTS` takes `true` or `false` (`1` and `0` work too).

To see Paperclip's connections, run this against your database:

```sql
SELECT * FROM pg_stat_activity WHERE application_name LIKE 'paperclip%';
```

If you've set `DATABASE_APPLICATION_NAME`, the main pool uses your name instead, so search for that too. The two helper connections below keep their own names.

**Sizing `max_connections`.** Each server process can use more than `DATABASE_POOL_MAX` connections. When you set PostgreSQL's `max_connections`, budget for these per server process, plus your other clients:

- the main pool, up to `DATABASE_POOL_MAX`
- a second pool of the same size when `DATABASE_MIGRATION_URL` is set
- up to 2 connections named `paperclip-controller-lease`, which keep agent runs alive so they never wait behind slow queries
- a short-lived single connection named `paperclip-workspace-finalization-lock` while a workspace is being finalized

Paperclip closes its pools when the server shuts down, and when startup fails after a pool has opened, so restarts don't leave idle connections behind.

---

## Switching Modes

| `DATABASE_URL` | Result |
|---|---|
| Not set | Embedded PostgreSQL |
| `postgres://...localhost...` | Local Docker PostgreSQL |
| `postgres://...supabase.com...` | Hosted PostgreSQL |

The Drizzle schema under `packages/db/src/schema/` stays the same in every case.

## What a database backup preserves

A normal instance database backup includes encrypted [agent identities](../../guides/org/agent-identity.md) and locally stored [agent complaints and suggestions](../../administration/agent-commentary.md). Restoring identities also requires the matching secrets encryption key: preserve `PAPERCLIP_SECRETS_MASTER_KEY` or the instance's configured master-key file separately.

The database does not contain the bytes of persistent agent files or locally stored uploads. Back up those filesystem directories or your configured asset storage as well; see [Storage](storage.md#persistent-agent-files).

A portable company export creates new identities when imported. A database restore preserves the identities of the original instance, so reserve disaster-recovery backups for recovering that instance rather than making independent agent copies.

> **Tip:** If your deployment feels healthy but the data keeps disappearing, check whether you are still on embedded PostgreSQL. That mode is intentionally local and persistent only inside the instance directory.
