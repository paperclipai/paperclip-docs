---
seo_title: Vercel Connector
seo_description: Let agents deploy websites and manage Vercel projects, environment variables, and domains in one team, with preview deploys by default and approvals.
---

# Vercel

Agents can deploy websites to Vercel and configure the projects behind them — build settings, environment variables, and domains — inside the one Vercel team you connect.

> **Warning:** Deployments and configuration changes affect real projects, and deployment and resource usage may incur Vercel charges. A production deployment puts code in front of real visitors. Keep deploy, configuration, and delete actions on **Ask first** or **Off** until you trust the workflow.

## Before you connect

- A Vercel account that belongs to the team you want agents to work in, with a role that allows the work: reading projects, creating deployments, updating project settings, managing environment variables, and attaching domains.
- A **Vercel access token**, created under [Account Settings → Tokens](https://vercel.com/account/tokens). Scope it to the intended team and pick a short expiration.
- The **team ID** of that team. Copy it from **Team Settings → General** in Vercel. It starts with `team_`.

The token's permissions come from your Vercel role. Paperclip cannot increase what an existing token is allowed to do — it only ever narrows. If a token cannot do something, create one from an account with the right role and reconnect.

## Connect Vercel

1. Open **Connectors** and select **Vercel**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity or narrow the agents, select **Change**.
3. Fill in **Vercel team ID**.
4. Paste the access token into the **Your Vercel key** field and continue.

Access token is the only method. Paperclip checks that the token identifies the team you entered before it saves the connection, then keeps the token in its secret vault. Agents call Vercel through Paperclip and never receive the token itself.

## What agents can do

Every action is pinned to the connected team — agents cannot point it at another one — and each has a risk level:

| Area | Actions | Risk |
| --- | --- | --- |
| Projects | List projects, Get project | Read |
| | Create project, Update project settings | Write |
| | Delete project | Destructive |
| Deployments | List deployments, Get deployment | Read |
| | Deploy project | Write |
| | Cancel deployment, Delete deployment | Destructive |
| Environment variables | List environment variable names | Read |
| | Set environment variable | Write |
| | Delete environment variable | Destructive |
| Domains | List project domains | Read |
| | Add project domain, Verify project domain | Write |
| | Remove project domain | Destructive |

A few boundaries are built in:

- **Environment variable values never come back.** Listing shows names, targets, and types only. A value an agent sets is redacted in the audit trail and applies to new deployments.
- **Domains must already be yours.** Adding a domain attaches one you already own and returns the DNS records to configure. It does not buy a domain or change DNS for you.
- **Deploys have three possible sources.** An agent deploys inline files (up to 4 MiB in total), a GitHub repository Vercel can access, or an existing deployment — exactly one per deploy. For anything larger than 4 MiB, deploy from Git.

## Preview versus production

Deployments are previews unless the agent explicitly asks for production. That default only holds if Vercel honours it, and there is one case where it would not: Vercel makes the first deployment of an empty project a production deployment, using production environment variables and domains.

So Paperclip refuses a preview deploy to a project that has no deployments yet, and tells the agent why. Any earlier deployment counts — even a failed or canceled one — but a deleted one does not. To deploy to a brand-new project, the agent has to request production explicitly, which is the moment a person should be approving.

If Vercel still creates a deployment without confirming it as a preview, the agent gets a result that says so and that the deployment needs checking. Inspect that deployment in Vercel before allowing a retry.

## Choose access

Reach is the token's: the connected team, within what your Vercel role allows.

Recommended settings:

| What an agent does | Suggested setting |
| --- | --- |
| Reads projects, deployments, environment variable names, and domains | **Allowed** |
| Deploys a project | **Ask first** |
| Creates or updates a project, sets an environment variable, or adds or verifies a domain | **Ask first** |
| Deletes a project, deployment, or environment variable, cancels a deployment, or removes a domain | **Off**, or **Ask first** if you review each one |

When an action is on **Ask first**, the agent's call becomes a review request and nothing reaches Vercel until a person approves it. If the call sets an environment variable, the value is stored encrypted while it waits, kept out of the request you review and the audit trail, and sent to Vercel only after approval. Every call is recorded against the agent, run, and task that made it.

Removing a domain can interrupt traffic to it, and deleting a project removes its deployments and configuration permanently. See [Set action permissions](action-permissions.md).

If Paperclip later changes the definition of one of these actions, the changed action is held back for review after you select **Refresh actions** rather than becoming available on its own.

## Try it

```txt
List the Vercel projects in this team, and tell me the state and URL of the most recent deployment for one of them. Do not deploy or change anything.
```

Compare against the Vercel dashboard. A project and deployment read confirms the token, the team ID, and the connection without touching anything.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Setup will not finish | The team ID is malformed, or the token does not identify that team | Copy the team ID from **Team Settings → General**, and create the token for that team |
| Vercel denies access | The token expired, is scoped to another team, or your role does not allow the action | Create a new token with the right team and role, then select **Reconnect** |
| A preview deploy is refused | The project has no deployments yet, so Vercel would make it production | Deploy to a project that already has a deployment, or request production deliberately |
| A deploy is too large | Inline files exceed 4 MiB | Deploy from a GitHub repository instead |
| A deploy or write reports an uncertain result | Vercel did not confirm the outcome, so it may have completed | Check the deployment or setting in Vercel before letting the agent retry |
| An action needs a plan change | Vercel requires a plan or billing change for it | Change the plan in Vercel, or leave the action off |
| Vercel rate limits a request | Too many calls in a short time | Wait before retrying |
| **Needs attention** | The token was revoked or expired | Select **Reconnect** with a new token |

Limitations: one Vercel team per connection, and access token is the only method. A queued deployment is not yet a successful one — check its state. Paperclip cannot roll back a deployment or a configuration change; do that in Vercel.

## Related guides

- [Netlify](netlify.md) — another hosting and deploy connector.
- [Supabase](supabase.md) — the backend side of many Vercel apps.
- [GitHub](github.md) — the repository side of a Git-based deploy.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Vercel REST API documentation](https://vercel.com/docs/rest-api)
