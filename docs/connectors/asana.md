---
paperclip_version: v2026.1005.0
seo_title: Asana Connector
seo_description: Let agents read and update Asana tasks. Sign in with Paperclip's Asana app or your own, workspace and project reach, a read test, and fixes.
---

# Asana

Agents can work with Asana tasks — finding them, reading details, and updating or creating them.

## Before you connect

- An Asana account with access to the workspace and projects you want agents to use.
- Some Asana organizations restrict who may authorize or create apps. If you are not an administrator, check before you start rather than after.

There are two ways to connect:

| Method | What you need | When it is offered |
| --- | --- | --- |
| **Sign in with Asana** | Nothing to register. You sign in through Paperclip's own Asana app | When your instance is enrolled with Paperclip Cloud and Cloud offers the Asana profile |
| **Use your own Asana OAuth app** | An Asana MCP app you register yourself | Always, including on instances that are not enrolled |

## Connect with Paperclip's Asana app

1. Open **Connectors** and select **Asana**.
2. Read the access line above the main button. This method connects as you or as a dedicated agent account, never as a shared organization identity. To change that or narrow the agents, select **Change**.
3. Select **Continue to sign in**. Paperclip shows *"Sign in with Asana to choose your workspace and connect it to Paperclip."*
4. In Asana, choose the workspace and approve access. Paperclip keeps the connection signed in from then on.

## Connect with your own Asana OAuth app

The callback URI comes from Paperclip and the client credentials come from Asana, so the two consoles interleave. Open Paperclip's setup first to read the URI, then register the app, then come back.

### 1. Read Paperclip's callback URI

1. Open **Connectors** and select **Asana**.
2. Read the access line above the main button, and select **Change** if you want a different identity or fewer agents.
3. Select **Use your own Asana OAuth app**. On an instance without Paperclip Cloud this is the only method, and the screen opens on **Asana needs its own OAuth app**. Paperclip displays the exact callback URI — copy it. It is the `/api/tools/oauth/callback` route on your instance's origin. Leave this screen open.

> **Note:** For local development Paperclip uses `localhost` in the callback, even if you opened Paperclip at `127.0.0.1`. Public deployments should use their canonical HTTPS address.

### 2. Create the Asana MCP app

In Asana's developer console at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps):

1. Select **Create new app** and enter a name.
2. **Set the app type to "MCP app".** This is the step that catches people out — a standard API app or a personal access token will not work here, because Asana keeps MCP tokens separate.
3. Select **Create app**.
4. In the **OAuth** section of the sidebar, add the callback URI from step 1 as the **Redirect URL**.
5. Under **Manage distribution**, choose the specific workspaces the app may be used in, or allow any workspace, and save.
6. Copy the **client ID** and **client secret**.

> **Note:** Asana MCP apps have no scopes to choose. Asana grants one fixed `default` scope — so if you are looking for a permissions checklist here, there is not one. Reach comes from the authorizing account instead, and Paperclip's action permissions decide which tools an agent may use.

### 3. Finish in Paperclip

Return to the setup screen, supply the client ID and secret, then authorize in Asana as the account whose access you want the connection to have. Paperclip stores the secret encrypted. If you come back to an unfinished setup with the same client ID, you do not need to paste the secret again; changing the client ID needs its matching secret.

Asana's own reference is [Integrating with Asana's MCP server](https://developers.asana.com/docs/integrating-with-asanas-mcp-server).

## Choose access

Reach is the authorizing Asana account's: the workspaces it belongs to and the projects it can open. Private projects the account is not a member of stay invisible, which is often the simplest way to keep something out of reach.

There is no workspace or project picker in Paperclip. To narrow access, authorize with an account that is a member of fewer projects.

Task creation, updates, and comments are writes that your team will see. Leave them on **Ask first** until the workflow is proven. Reads can stay **Allowed**. See [Set action permissions](action-permissions.md).

Attribution follows the authorizing account, so a dedicated account makes agent activity distinguishable. See [Use separate accounts for people and agents](separate-accounts.md).

## Try it

```txt
Find the Asana task called "Update onboarding checklist" and tell me its assignee, due date, and current status. Do not change it.
```

Compare against the task in Asana. A lookup of a task you can already see confirms the credential and the agent's permission without touching your team's board.

> **Note:** Illustrative task, not a recorded test result. Substitute a task name from your own workspace.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Setup asks for a client ID and secret | The instance is not enrolled with Paperclip Cloud, or you chose your own app | Register an Asana MCP app, or enroll the instance to use **Sign in with Asana** |
| Authorization fails with an API app | The Asana app is not an MCP app | Create a new app with the type set to MCP app |
| Authorization fails with a redirect or URI error | The callback URI on the Asana app does not match the one Paperclip shows | Copy the URI exactly and retry |
| You cannot create the app | The Asana organization restricts app creation | Ask an Asana administrator |
| A project's tasks are invisible | The authorizing account is not a member of that project | Add it to the project in Asana; no reconnect needed |
| An update is rejected | Asana's own field rules or permissions on that project | Check the task and project settings in Asana |
| **Needs attention** | The grant was revoked in Asana | Select **Reconnect** |

Limitations: one Asana account per connection. No workspace or project restriction inside Paperclip. Asana's rate limits apply.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/asana/)

- [Jira](jira.md), [Linear](linear.md), [Todoist](todoist.md) — other work tracking connectors.
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
- [Asana MCP server documentation](https://developers.asana.com/docs/integrating-with-asanas-mcp-server)
