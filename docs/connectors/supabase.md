---
seo_title: Supabase Connector
seo_description: Let agents work with a Supabase project. Scope it to a development project, use read-only mode, and understand the production risk before connecting.
---

# Supabase

Agents can inspect and work with a Supabase project — its database, schema, and project configuration.

> **Warning:** Use a development project. Supabase connections can reach real data and, without read-only mode, change schema and database contents. Do not connect a production project unless you have read Supabase's own MCP security guidance and accepted the risk deliberately.

Write tools start enabled on this connector. They are governed by Paperclip's action settings, but the default is not read-only — you have to choose that.

## Before you connect

- A Supabase account with access to the project you want agents to use.
- The **project reference** of that project, from its Supabase settings. Paperclip requires it on both authentication methods — there is no unscoped setup here.
- For the key method: a **Supabase personal access token**. See below, because the wrong kind of credential is the easiest mistake to make on this connector.
- A decision about read-only mode, made before you connect rather than after.

### Which credential the key method wants

The **Supabase API key** field takes a **personal access token**, the credential Supabase describes as authenticating "the Management API and the tools built on it, like the Supabase CLI and the MCP server." The placeholder is `sbp_...`.

A project's **anon** key and **service-role** key are *not* interchangeable with it. Those authenticate against project data; a personal access token authenticates management operations. Pasting a service-role key here will not work, and it is a far more dangerous credential to have copied around.

Create one under [account access tokens](https://supabase.com/dashboard/account/tokens). Supabase offers two kinds, and the difference matters:

| Kind | What it carries |
| --- | --- |
| **Classic** | Your account's full access — "every permission, on every organization and every project you belong to today, and on every one you create or join in the future" |
| **Scoped** (prefix `sbp_fc`) | Only the organizations, projects and permissions you choose |

Prefer a scoped token limited to the one development project. Note that scoping only ever narrows what your own account can do; it never grants more. See Supabase's [personal access tokens documentation](https://supabase.com/docs/guides/platform/personal-access-tokens).

## Connect Supabase

1. Open **Connectors** and select **Supabase**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose how to authenticate:
   - **Sign in with Supabase** — browser sign-in.
   - **Use an API key** — paste the personal access token described above.
4. Set the scoping controls below.
5. Finish setup.

## Scope the connection

| Control | Recommendation |
| --- | --- |
| **Project reference** | Required. Scope the connection to one development project |
| **Read-only mode** | Turn it on unless an agent genuinely needs to change the database |
| **Feature groups** | Optionally narrow which groups of tools are exposed |

**Project reference is a required field on both methods.** Supabase's own MCP endpoint may accept requests without a project, but Paperclip will not let you finish setup without one — so the "this connection reaches one project" posture is the only one available here. That is deliberate.

Read-only mode is the other decision worth making up front. Turning it on after an agent has already had write tools does not undo anything it did.

> **Note:** Read-only mode and feature groups are passed to Supabase's MCP server as request parameters — Supabase enforces them, not Paperclip. The practical effect you will see is a narrower tool list, but the enforcement boundary is the provider's. Paperclip's own control over what runs is the action settings.

## Choose access

Project reach is the Supabase account's, narrowed by the project reference you set. Organization and project permissions are Supabase's, not Paperclip's — an account with owner rights on an organization brings those rights to the connection.

Be clear about the range of what write access means here. It is not only inserting rows: depending on the tools exposed, it can include schema changes and project configuration. Those are not reversible from Paperclip.

Leave writes on **Ask first** at minimum, and prefer **Off** for anything touching schema. See [Set action permissions](action-permissions.md).

## Try it

Use a metadata read, not a query against real data:

```txt
List the tables in the Supabase project and tell me how many there are. Do not query any row data or change anything.
```

Expect a table list matching the project. A metadata read confirms the credential and the project scope without requesting row contents. Schema and table names may still be sensitive, and metadata requests still use provider resources.

Do not verify with a migration, a schema change, or a privileged SQL statement.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Setup will not finish | **Project reference** is empty; it is required | Copy the project reference from the project's Supabase settings |
| The key is rejected | A project anon or service-role key was pasted instead of a personal access token | Create a personal access token under account access tokens and use that |
| The token works but a project is not reachable | A scoped token does not include that project, or your account has no access to it | Widen the token's scope, or grant the account access in Supabase |
| Write tools are missing | **Read-only mode** is on, and Supabase is honouring it | That is the recommended posture; turn it off only deliberately |
| A schema change succeeded that you did not expect | Write tools start enabled and the action was allowed | Turn on read-only mode, or set schema tools to **Off**; recover using Supabase's own backups |
| Authentication succeeds but the project is not visible | The account lacks access to that project | Grant access in Supabase |
| Queries fail or time out | Supabase project limits, not Paperclip | Check the project's plan and resource limits |
| **Needs attention** | The key was revoked or the sign-in expired | Select **Reconnect** |

Limitations: one project per connection, always. Paperclip cannot roll back a database change — recovery is Supabase's backups. Read-only mode is a request Supabase honours, not a Paperclip guarantee, and it is not a substitute for using a development project.

## Related guides

- [ClickHouse](clickhouse.md) — another database connector.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Supabase MCP documentation](https://supabase.com/docs/guides/ai-tools/mcp)
