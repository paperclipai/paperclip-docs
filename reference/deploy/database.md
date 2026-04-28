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

If you use the pooled connection, disable prepared statements in `packages/db/src/client.ts`:

```ts
export function createDb(url: string) {
  const sql = postgres(url, { prepare: false });
  return drizzlePg(sql, { schema });
}
```

> **Warning:** Use the direct connection for schema changes. Pointing migrations at the pooled endpoint is a common way to get avoidable connection errors.

---

## Switching Modes

| `DATABASE_URL` | Result |
|---|---|
| Not set | Embedded PostgreSQL |
| `postgres://...localhost...` | Local Docker PostgreSQL |
| `postgres://...supabase.com...` | Hosted PostgreSQL |

The Drizzle schema under `packages/db/src/schema/` stays the same in every case.

> **Tip:** If your deployment feels healthy but the data keeps disappearing, check whether you are still on embedded PostgreSQL. That mode is intentionally local and persistent only inside the instance directory.
