---
paperclip_version: v2026.1012.0
seo_title: Neon Connector
seo_description: Let agents manage Neon Postgres projects, branches, and SQL. Sign in or use an API key, pin one project, turn on read-only mode, and test safely.
---

# Neon

Agents can work with your Neon serverless Postgres — managing projects and branches, running SQL, and inspecting schemas.

> **Warning:** Use a development project. Neon's hosted server grants broad project and database management, and Neon itself recommends it for development and testing. Review write and destructive actions before you connect anything holding production data.

Write tools start enabled on this connector. They are governed by Paperclip's action settings, but the default is not read-only — you have to choose that.

## Before you connect

- A Neon account with access to the project you want agents to use.
- For the key method: a **Neon API key**, created in the Neon Console under [Settings → API keys](https://console.neon.tech/app/settings/api-keys). See below for which kind to pick.
- Optionally, the **project ID** of the one project you want this connection limited to. You'll find it in the Neon Console under **Project settings → General**.
- A decision about read-only mode, made before you connect rather than after.

There are two ways to connect:

| Method | What you need | When to use it |
| --- | --- | --- |
| **Sign in with Neon** | Nothing to create. You approve access in the browser | The recommended route for most people |
| **Use an API key** | A Neon API key you create yourself | When browser sign-in isn't suitable |

Paperclip never falls back from one method to the other on its own. The method you pick is saved on the connection and reused whenever you reconnect.

### Which key the API-key method wants

The **Neon API key** field accepts keys starting `napi_...` or `neon_project_key_...`. Neon offers a few kinds, and their reach differs:

| Kind | What it reaches |
| --- | --- |
| **Project-scoped key** | One project, with Editor rights |
| **Personal or organization key** | Every project that account or organization can access |

Prefer a project-scoped key for one development project. Paperclip can't increase what an existing key is allowed to do — it only ever narrows.

## Connect Neon

1. Open **Connectors** and select **Neon**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity, narrow the agents, or use another sign-in method, select **Change**.
3. Check how you'll authenticate. Setup starts on **Sign in with Neon**. To paste an API key instead, select **Change** and choose **Use an API key**.
4. Optionally select **Change** to reveal **Pin to project ID** and **Read-only mode**, then fill in either one. Neither is required — you can continue straight away with Neon's defaults.
5. Finish setup. For browser sign-in, approve access in Neon; for the key method, paste the key and continue.

Paperclip needs a public HTTPS origin, or a loopback HTTP origin such as `http://localhost:3100`, to complete browser sign-in. A plain HTTP tailnet hostname doesn't count as loopback — switch to HTTPS before you connect.

## Scope the connection

| Control | Recommendation |
| --- | --- |
| **Pin to project ID** | Pin the connection to one development project. Lowercase letters, numbers, and hyphens, up to 64 characters |
| **Read-only mode** | Turn it on unless an agent genuinely needs to change something. It limits SQL to `SELECT` queries and schema inspection |

An invalid project ID is rejected before Paperclip ever contacts Neon, so a typo shows up right away.

> **Note:** The project pin and read-only mode are passed to Neon's MCP server as request parameters — Neon enforces them, not Paperclip. The practical effect you'll see is a narrower set of projects or tools, but the enforcement boundary is the provider's. Paperclip's own control over what runs is the action settings.

## Choose access

Project reach is whatever the Neon sign-in or key carries, narrowed by the project pin if you set one. Account, organization, and project permissions are Neon's, not Paperclip's.

Write access here covers a lot of ground: creating and deleting projects and branches, managing roles, databases and computes, restoring snapshots, applying schema changes, and running SQL. Those changes aren't reversible from Paperclip.

Every discovered action starts **Allowed**, including writes and destructive ones. After connecting, open the connection's **Permissions** screen and set deletion, branch reset, and compute changes to **Ask first** at minimum. See [Set action permissions](action-permissions.md).

## Try it

Use a metadata read, not a query against real data:

```txt
List the Neon projects this connection can reach and the branches in each. Do not run any SQL or change anything.
```

Expect a project and branch list matching your Neon Console. That confirms the credential and the project scope without touching row data.

Don't verify with a migration, a branch reset, or a write query.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Setup rejects the project ID | It contains characters other than lowercase letters, numbers, and hyphens, or is longer than 64 characters | Copy the project ID from **Project settings → General** in the Neon Console |
| Browser sign-in won't complete | Paperclip is served over plain HTTP on a non-loopback hostname | Use HTTPS, or a loopback origin such as `http://localhost:3100` |
| The key works but a project isn't reachable | A project-scoped key covers a different project, or the account has no access | Use a key for the right project, or grant access in Neon |
| Write tools are missing or SQL writes fail | **Read-only mode** is on, and Neon is honouring it | That's the recommended posture; turn it off only deliberately |
| A change succeeded that you didn't expect | Write tools start enabled and the action was allowed | Turn on read-only mode, or set those actions to **Ask first** or **Off** |
| **Needs attention** | The key was revoked or the sign-in expired | Select **Reconnect** |

Limitations: the project pin and read-only mode are requests Neon honours, not Paperclip guarantees, and neither replaces using a development project. Paperclip can't roll back a database change — recovery is Neon's branches and snapshots.

## Related guides

- [Supabase](supabase.md) — another hosted Postgres connector.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Neon MCP server documentation](https://neon.com/docs/ai/neon-mcp-server)
