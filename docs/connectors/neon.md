---
seo_title: Neon Connector
seo_description: Connect Neon by browser sign-in or API key for development databases. Set project scope, read-only mode, and permissions; protect returned credentials.
---

# Neon

> **Not in a stable release yet:** This guide describes the next-release connector. It is absent from the pinned stable release, `v2026.1001.0`.

Neon connects agents to its hosted MCP server for Postgres project and branch management, SQL, schema inspection, and related development tools. Paperclip offers **Sign in with Neon** and **Use an API key**.

> **Development and testing only:** Neon advises never connecting MCP agents to production databases. Use anonymized development or test data, and avoid production or personally identifiable information. **Ask first** does not make production database access appropriate.

## Before you connect

- A Neon account with access to a development or testing project.
- For the key method, a customer-created Neon API key. Prefer a project-scoped key for one development project; creating it requires an organization Admin.
- A public HTTPS Paperclip origin or a loopback HTTP origin. A plain HTTP tailnet hostname is not loopback.

Both methods use `https://mcp.neon.tech/mcp` with Streamable HTTP. Browser sign-in uses dynamic client registration and PKCE, so you do not register your own OAuth app. The API-key method sends the key in an `Authorization: Bearer` header. The deprecated SSE endpoint is not offered.

## Connect Neon

> **Unverified setup:** These steps follow pinned product source and Neon's documentation. No Neon account connection, authenticated tool discovery, or live lifecycle test was performed for this guide. Each step below is unverified.

1. **Unverified:** Open **Connectors**, browse the catalog, and select **Neon**.
2. **Unverified:** Choose **Sign in with Neon** or **Use an API key**. On **Access**, choose the identity and the agents that may use it.
3. **Unverified:** Open **Advanced** to set **Pin to project ID** and enable **Read-only mode**. Neither is required by the default path; read-only mode is off by default. Copy a development project's ID from Neon Console → **Project settings → General**.
4. **Unverified:** For browser sign-in, complete Neon's consent flow. Paperclip requests `read` and `write` scopes; the read-only switch restricts the server rather than narrowing that token.
5. **Unverified:** For the key method, create a key in Neon Console and enter it in **Neon API key**. To create a project-scoped key, switch to your organization, open **Settings → API keys**, and select **Project-scoped** (organization Admins only). Personal keys are under the profile menu → **Settings → API keys**.
6. **Unverified:** Finish discovery, inspect **Permissions**, and set writes, destructive actions, and credential-returning tools to **Ask first** or **Off** before agents run work. Discovered actions start **Allowed**, including writes and destructive actions.

Do not put keys or returned database credentials in a URL, comment, log, or connection configuration field intended for non-secret values.

## Choose access and project scope

The credential's Neon permissions determine provider reach. A project-scoped key has Editor rights on one project. Personal keys follow the user's access; organization keys have admin-level access to organization resources. Paperclip cannot widen an existing key's permissions.

**Pin to project ID** optionally narrows the server to one project. Paperclip sends `projectId=<id>` on the same server URL for discovery and execution; callers cannot override it. Neon enforces this restriction. A pinned connection hides project-management tools such as `list_projects` and `create_project`. An OAuth project scope may require logout and reauthorization to change or remove.

The product definition's `requiredResourceFilters: ["project"]` is policy metadata, not a required local allowlist. A default connection has no required project filter. Set the pin deliberately instead of assuming it is already bounded.

**Read-only mode** sends `readonly=true` and restricts the server to read operations such as SELECT queries and schema inspection. It disables writes including branch creation, migrations, and auth changes. It does not merely limit SQL. It also does not relabel Paperclip's SQL tools as Read or guarantee that returned data is non-sensitive.

## Review action permissions

Paperclip discovers the tool catalog from Neon. Review your connected account's action list; a public preview does not prove its effective access. Both methods use the same endpoint, but tool availability follows the credential and server filters.

| Tool group | What to review |
| --- | --- |
| Documentation, schema, and observability | Reads can expose application data, query text, or logs. Use suitable test data. |
| Projects, branches, computes, snapshots, roles, and databases | Creation, reset, deletion, and restoration can change or remove data. |
| SQL and transactions | `run_sql`, `run_sql_transaction`, and `explain_sql_statement` retain conservative Write/destructive classification, even when available with server-enforced read-only restrictions. |
| Neon Auth, Data API, functions, and storage | Configuration, deployment, and object changes need explicit review. |
| `get_connection_string` | Returns a connection string containing a privileged role password; treat it as sensitive even if the UI labels it Read. |

`get_connection_string` returns a password for a role with `neon_superuser` membership and `CREATEROLE`. Anyone holding it can change data directly, outside Paperclip's action permissions and gateway audit. Neon excludes it from read-only mode. Set it to **Ask first** or **Off** unless agents need direct database credentials, and avoid retaining the result in shared artifacts. Its presentation class remains under review; a Read label is not evidence that credential disclosure is safe.

**Allowed** runs without approval, **Ask first** requires approval per call, and **Off** denies calls. These settings govern Paperclip connector calls. They cannot contain a credential already disclosed to an agent. New or changed tools follow the connection's catalog review settings; do not assume a refresh places every new action in quarantine. Inspect the effective list and permissions after a refresh.

## Try it

With a development project pinned and read-only mode enabled, ask an authorized agent:

```txt
Describe the tables in the connected development database. Do not return row data, connection strings, passwords, or other credentials. Do not run migrations or change anything.
```

Compare the schema with Neon Console and inspect the connector call. Confirm the project pin, read-only flag, and effective action permissions before broader work.

> **Unverified check:** Illustrative task, not a recorded live test. A successful schema read does not prove that other actions are denied.

## Revoke or disconnect

Remove the identity or connection in Paperclip to revoke its grant and delete stored secrets. Also revoke the provider authorization or delete the API key in Neon if it should no longer work outside Paperclip. Neon publishes an OAuth revocation endpoint; this guide does not claim that Paperclip removal successfully exercised it.

If `get_connection_string` disclosed a database role password, removing the MCP connection does not prove that password is invalid. Rotate or revoke the exposed database credential in Neon and check denied access separately.

> **Unverified revocation:** OAuth revocation, API-key deletion, database-credential rotation, and denied access were not live-tested for this guide. Follow Neon's current console controls and verify the result.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Project-scoped key creation is unavailable | Switch to the organization and confirm organization Admin rights. |
| Project ID is rejected | Copy the project ID, not its display name; the field accepts lowercase letters, digits, and hyphens, up to 64 characters. |
| Authorization fails on a plain HTTP hostname | Use HTTPS or a loopback HTTP canonical origin. |
| Write actions disappear | Check **Read-only mode** and the credential's provider permissions. |
| Project-management tools disappear | Check the project pin; Neon restricts the tool catalog for pinned connections. |
| A project scope cannot be changed | Check the OAuth authorization's project scope; logout and reauthorization may be required. |
| An action appears after refresh | Review its effective permission before agent work; newly discovered actions can become active. |

Paperclip does not offer Neon's repeatable category filter through this connector. Use project pinning, read-only mode, and per-action permissions. Provider rate limits apply. Live authorization, governed writes, denial, revocation, and audit behavior still need qualification with a development project.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/neon/) (upcoming website route; preview-only until publication).
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Reauthorize or disconnect](reauthorize-and-disconnect.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [Supabase](supabase.md), [ClickHouse](clickhouse.md), and [Airtable](airtable.md)

## Sources

- [Pinned Paperclip definition](https://github.com/paperclipai/paperclip/blob/22cea6b2e6aeb54b484ef095eab1378ecd0b4d79/packages/shared/src/app-definitions/neon.json) and [connection notes](https://github.com/paperclipai/paperclip/blob/22cea6b2e6aeb54b484ef095eab1378ecd0b4d79/doc/connections/NEON.md): method labels, optional filters, scopes, and defaults. The provider guidance below takes precedence over weaker production-safety wording in those sources.
- [Neon MCP server](https://neon.com/docs/ai/neon-mcp-server) and [API keys](https://neon.com/docs/manage/api-keys): development-only security guidance, server filters, key scope, and setup.
- [Pinned Neon tool definitions](https://github.com/neondatabase/mcp-server-neon/blob/00d82d4e5c925380fc077fe1932780035f564d8b/mcp/tools/definitions.ts): privileged connection-string credentials and their exclusion from read-only mode. This provider source pin is not proof of a particular hosted deployment.
