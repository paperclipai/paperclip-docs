---
seo_title: Asana Connector
seo_description: Let agents read and update Asana tasks. Registering the required OAuth app, workspace and project reach, a read test, and troubleshooting.
---

# Asana

Agents can work with Asana tasks — finding them, reading details, and updating or creating them.

## Before you connect

- An Asana account with access to the workspace and projects you want agents to use.
- You must register your own Asana OAuth app. Asana does not support automatic client registration for this server, so there is no path that skips the developer console. Add Paperclip's callback URI to the app; Paperclip shows the exact URI during setup.
- Some Asana organizations restrict who may create or authorize apps. If you are not an administrator, check before you start rather than after.

## Connect Asana

The callback URI comes from Paperclip and the client credentials come from Asana, so the two consoles interleave. Open Paperclip's setup first to read the URI, then register the app, then come back.

### 1. Read Paperclip's callback URI

1. Open **Connectors** and select **Asana**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Use your own OAuth app**. Paperclip displays the exact callback URI — copy it. It is the `/api/tools/oauth/callback` route on your instance's origin. Leave this screen open.

### 2. Create the Asana MCP app

In Asana's developer console at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps):

1. Select **Create new app** and enter a name.
2. **Set the app type to "MCP app".** This is the step that catches people out — a standard API app will not work here, because Asana keeps MCP tokens separate.
3. Select **Create app**.
4. In the **OAuth** section of the sidebar, add the callback URI from step 1 as the **Redirect URL**.
5. Under **Manage distribution**, choose the specific workspaces the app may be used in, or allow any workspace.
6. Copy the **client ID** and **client secret**.

> **Note:** Asana MCP apps have no scopes to choose. Asana's guidance is to use `default` or omit the parameter entirely — so if you are looking for a permissions checklist here, there is not one. Reach comes from the authorizing account instead.

### 3. Finish in Paperclip

Return to the setup screen, supply the client ID and secret, then authorize in Asana as the account whose access you want the connection to have.

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
| Setup asks for a client ID and secret | Expected — Asana requires your own OAuth app | Register one in Asana's developer console |
| Authorization fails with a redirect or URI error | The callback URI on the Asana app does not match the one Paperclip shows | Copy the URI exactly and retry |
| You cannot create the app | The Asana organization restricts app creation | Ask an Asana administrator |
| A project's tasks are invisible | The authorizing account is not a member of that project | Add it to the project in Asana; no reconnect needed |
| An update is rejected | Asana's own field rules or permissions on that project | Check the task and project settings in Asana |
| **Needs attention** | The grant was revoked in Asana | Select **Reconnect** |

Limitations: one Asana account per connection. No workspace or project restriction inside Paperclip. Asana's rate limits apply.

## Related guides

- [Jira](jira.md), [Linear](linear.md), [Todoist](todoist.md) — other work tracking connectors.
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
- [Asana MCP server documentation](https://developers.asana.com/docs/integrating-with-asanas-mcp-server)
