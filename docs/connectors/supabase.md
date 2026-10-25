---
paperclip_version: v2026.1023.0
seo_title: Supabase Connector
seo_description: Let agents create Supabase projects, deploy Edge Functions, and configure Auth and the Data API. Pick a method, scope it, and gate risky actions.
---

# Supabase

Agents can build on Supabase for you — creating projects, running database work, deploying Edge Functions, and configuring Auth and the Data API for an app.

> **Warning:** Use a development project. Supabase connections can reach real data and, without read-only mode, change schema, database contents, deployed functions, and how users sign in to your app. Do not connect a production project unless you have read Supabase's own MCP security guidance and accepted the risk deliberately.

Actions start enabled on this connector. They are governed by Paperclip's action settings, but the default is not read-only — you have to choose that.

## Choose a method

Supabase has three ways to connect, and they do different jobs:

| Method | What it does | What you need |
| --- | --- | --- |
| **Sign in with Supabase** | Supabase's hosted server: database work and migrations, Edge Function deployment, and — when you don't pin a project — creating and managing projects in your organization | Nothing to create. You approve access in the browser |
| **Use a personal access token** | The same hosted server, authenticated with a token instead of browser sign-in | A Supabase personal access token |
| **Deploy and configure with an access token** | A fixed set of reviewed actions for one existing project: deploy and remove Edge Functions, set their secrets, and configure Auth and the Data API | A scoped personal access token and the project reference |

Use one of the first two for project creation, SQL migrations, and storage. Use the third for Auth redirect URLs, signup settings, Data API schemas, and Edge Function secrets. If you need both, connect Supabase twice — once per method.

## Before you connect

- A Supabase account with access to the organization or project you want agents to use.
- For either token method: a **Supabase personal access token**. See below, because the wrong kind of credential is the easiest mistake to make on this connector.
- For **Deploy and configure with an access token**: the **project reference** of that project, from **Project Settings** in the Supabase Dashboard. It is 20 lowercase letters.
- For the hosted-server methods: a decision about whether to pin one project and turn on read-only mode, made before you connect rather than after.

### Which credential the token methods want

The **Your Supabase key** field takes a **personal access token**, the credential Supabase describes as authenticating "the Management API and the tools built on it, like the Supabase CLI and the MCP server." The placeholder is `sbp_...`.

A project's publishable, **anon**, **service_role**, and secret API keys are *not* interchangeable with it. Those authenticate against project data; a personal access token authenticates management operations. Pasting a project API key here will not work, and a service-role key is a far more dangerous credential to have copied around.

Create one under [account access tokens](https://supabase.com/dashboard/account/tokens). Supabase offers two kinds, and the difference matters:

| Kind | What it carries |
| --- | --- |
| **Classic** | Your account's full access — "every permission, on every organization and every project you belong to today, and on every one you create or join in the future" |
| **Scoped** (prefix `sbp_fc`) | Only the organizations, projects and permissions you choose |

Prefer a scoped token with a short expiration. For **Deploy and configure with an access token**, scope it to the one project and set **Project Settings**, **Auth Config**, **Data API Config**, **Edge Functions**, and **Edge Function Secrets** to **Read-write**. Leave **API Key Secrets**, **Auth Signing Keys**, and **Data API JWT Secret** at **None** — none of the actions need them.

Scoping only ever narrows what your own account can do; it never grants more, and Paperclip cannot increase an issued token's permissions. Project creation needs account-level access. See Supabase's [personal access tokens documentation](https://supabase.com/docs/guides/platform/personal-access-tokens).

## Connect Supabase

1. Open **Connectors** and select **Supabase**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity, narrow the agents, or use another sign-in method, select **Change**.
3. Check how you will authenticate. Setup starts on **Sign in with Supabase** (browser sign-in). To use a token instead, select **Change** and choose **Use a personal access token** or **Deploy and configure with an access token**.
4. For the hosted-server methods, optionally select **Change** to reveal **Pin to project reference**, **Read-only mode**, and **Feature groups**. For **Deploy and configure with an access token**, fill in **Project reference** — it is required there.
5. Finish setup. For browser sign-in, approve access in Supabase; for a token method, paste the token and continue.

Paperclip keeps the token in its secret vault. Agents call Supabase through Paperclip and never receive the token itself.

## Scope the connection

On the two hosted-server methods:

| Control | Recommendation |
| --- | --- |
| **Pin to project reference** | Optional. Pin one existing development project to restrict access to it. Leave it empty only when agents need to create projects |
| **Read-only mode** | Turn it on unless an agent genuinely needs to change the database |
| **Feature groups** | Optionally narrow which groups of tools are exposed: `docs`, `account`, `database`, `debugging`, `development`, `functions`, `branching`, `storage` |

**Pinning is now a choice, not a requirement.** Leaving the project empty connects the whole organization: agents can create projects and use account tools. Pinning a project restricts access to it and switches account tools off. If you don't need project creation, pin.

Feature groups have a few rules worth knowing. Include `account` if agents should create projects, and `functions` if they should deploy Edge Functions. Storage tools stay off unless you list `storage`. A list with an unknown group name is rejected before Paperclip contacts Supabase.

Read-only mode is the other decision worth making up front. Turning it on after an agent has already had write tools does not undo anything it did.

> **Note:** Pinning, read-only mode, and feature groups are passed to Supabase's hosted server as request parameters — Supabase enforces them, not Paperclip. The practical effect you will see is a narrower tool list, but the enforcement boundary is the provider's. Paperclip's own control over what runs is the action settings.

On **Deploy and configure with an access token**, the project reference is the boundary. Every action runs against that one project, and agents cannot point it anywhere else.

## What the deploy-and-configure method can do

This method has a fixed list of actions that Paperclip reviewed, each with a risk level:

| Action | Risk |
| --- | --- |
| Get project, Get Auth configuration, Get Data API configuration | Read |
| List Edge Functions, Get Edge Function, List Edge Function secret names | Read |
| Update Auth configuration — site URL, redirect allow list, signup and password settings | Write |
| Update Data API configuration — exposed schemas, search path, row and connection limits | Write |
| Deploy Edge Function — create or replace a function from source files you supply | Write |
| Set Edge Function secret | Write |
| Delete Edge Function | Destructive |

A few things are deliberately out of reach. Auth reads leave provider secrets out, Data API reads leave signing secrets out, and secret listings return names and update times only, never values. SMTP and OAuth provider secrets are not configurable here — set those in the Supabase Dashboard. When a person needs to enter a credential privately, the Dashboard is also the right place.

Deploying a function replaces any existing function with the same name, and JWT verification is on unless the agent turns it off. Setting a secret takes effect for functions that are already running.

## Choose access

On the hosted-server methods, reach is the Supabase account's, narrowed by any project you pin. Organization and project permissions are Supabase's, not Paperclip's — an account with owner rights on an organization brings those rights to the connection.

Be clear about the range of what write access means here. It is not only inserting rows: depending on the method and tools exposed, it can include creating projects, schema changes, deploying functions, and changing who can sign up to your app. Disabling email confirmation or signup changes how real users get in. None of this is reversible from Paperclip.

Recommended settings:

| What an agent does | Suggested setting |
| --- | --- |
| Reads project, configuration, function, and secret-name metadata | **Allowed** |
| Deploys an Edge Function | **Ask first** |
| Changes Auth or Data API configuration, or sets a secret | **Ask first** |
| Changes schema, or deletes a function | **Off**, or **Ask first** if you review each one |

When an action is on **Ask first**, the agent's call becomes a review request and nothing reaches Supabase until a person approves it. If the call sets a secret, the value is stored encrypted while it waits, kept out of the request you review and the audit trail, and sent to Supabase only after approval. Every call is recorded against the agent, run, and task that made it. See [Set action permissions](action-permissions.md).

If Paperclip later changes the definition of one of these actions, the changed action is held back for review after you select **Refresh actions** rather than becoming available on its own.

## Try it

Use a metadata read, not a query against real data:

```txt
List the tables in the Supabase project and tell me how many there are. Do not query any row data or change anything.
```

On **Deploy and configure with an access token**, use a project or function read instead:

```txt
Get the Supabase project details and list its Edge Functions. Do not deploy, delete, or change any configuration.
```

Expect results matching the project in the Supabase Dashboard. A metadata read confirms the credential and the project scope without requesting row contents. Schema, table, and function names may still be sensitive, and metadata requests still use provider resources.

Do not verify with a migration, a deployment, a configuration change, or a privileged SQL statement.

> **Note:** Illustrative tasks, not recorded test results.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Setup will not finish on **Deploy and configure with an access token** | **Project reference** is empty or malformed; it is required and is 20 lowercase letters | Copy the project reference from **Project Settings** in the Supabase Dashboard |
| The key is rejected | A project API key (anon, service_role, publishable, or secret) was pasted instead of a personal access token | Create a personal access token under account access tokens and use that |
| Supabase denies an action | The scoped token lacks the permission for it, or does not include the project | Create a new token with the permissions above and reconnect |
| Agents cannot create projects | A project is pinned, or `account` is missing from **Feature groups** | Leave **Pin to project reference** empty and include `account`, or use the Supabase Dashboard |
| Storage tools are missing | `storage` is not in **Feature groups** | Add `storage` if agents genuinely need it |
| Write tools are missing | **Read-only mode** is on, and Supabase is honouring it | That is the recommended posture; turn it off only deliberately |
| Auth or Data API actions are missing | You connected a hosted-server method | Connect again with **Deploy and configure with an access token** |
| A deploy or write reports an uncertain result | Supabase did not confirm the outcome, so it may have completed | Check the function or setting in Supabase before letting the agent retry |
| A schema change succeeded that you did not expect | Actions start enabled and the action was allowed | Turn on read-only mode, or set schema tools to **Off**; recover using Supabase's own backups |
| Queries fail or time out | Supabase project limits, not Paperclip | Check the project's plan and resource limits |
| **Needs attention** | The token was revoked or expired, or the sign-in expired | Select **Reconnect** |

Limitations: **Deploy and configure with an access token** always covers exactly one project, and Edge Function source uploads are capped at 2 MiB. Paperclip cannot roll back a database change, a deployment, or a configuration change — recovery is in Supabase. Read-only mode is a request Supabase honours, not a Paperclip guarantee, and it is not a substitute for using a development project.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/supabase/)

- [Vercel](vercel.md) — deploy the front end that talks to your Supabase project.
- [ClickHouse](clickhouse.md) — another database connector.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Supabase MCP documentation](https://supabase.com/docs/guides/ai-tools/mcp)
- [Supabase Management API reference](https://supabase.com/docs/reference/api/introduction)
